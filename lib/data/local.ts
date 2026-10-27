import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import { DEFAULT_ADMIN_SECRET, envAdminSecret, isValidAdminSecret } from "@/lib/panel-path";
import { defaultPermissions } from "@/lib/permissions";
import {
  isMealDatePassed,
  nextOrderNumber,
  normalizePhone,
  rangeFor,
  todayInUlaanbaatar,
  toUlaanbaatarDate,
} from "@/lib/format";
import { buildSeed } from "@/lib/data/seed";
import {
  branchStats,
  dailySeries,
  monthlySeries,
  applyDailyAdjustment,
  overlayDaily,
  overlayMonthly,
  summarize,
  toOrderViews,
  topMeals,
  withOrderedQuantity,
} from "@/lib/data/present";
import type {
  AppSettings,
  Branch,
  BranchInput,
  DailyAdjustment,
  DashboardStats,
  Meal,
  MealInput,
  OrderQuery,
  OrderStatus,
  OrderView,
  PlaceOrderInput,
  AccountInput,
  AccountView,
  Permission,
  PermissionGroup,
  ProfileRecord,
  ReportData,
  Role,
  SessionUser,
  StoreData,
  UserRecord,
} from "@/types";

const FILE = path.join(process.cwd(), "data", "store.json");
const TMP_FILE = path.join("/tmp", "food-store.json");

let memory: StoreData | null = null;
let chain: Promise<unknown> = Promise.resolve();

function storePaths() {
  return process.env.VERCEL ? [TMP_FILE, FILE] : [FILE, TMP_FILE];
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function persist(store: StoreData, options?: { requireCloud?: boolean }) {
  memory = store;
  for (const target of storePaths()) {
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, JSON.stringify(store, null, 2), "utf8");
      break;
    } catch {
      // Vercel and other read-only hosts keep the in-memory copy.
    }
  }
  try {
    const { saveCloudStore } = await import("@/lib/data/cloud-store");
    const saved = await saveCloudStore(store);
    if (options?.requireCloud && process.env.VERCEL && !saved) throw new AppError("STORE_UNAVAILABLE");
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (options?.requireCloud && process.env.VERCEL) throw new AppError("STORE_UNAVAILABLE");
  }
}

async function readFromFiles(): Promise<StoreData | null> {
  for (const file of storePaths()) {
    try {
      const raw = await readFile(file, "utf8");
      return JSON.parse(raw) as StoreData;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && code !== "ENOENT") continue;
    }
  }
  return null;
}

function normalize(store: StoreData) {
  let changed = false;
  if (!store.settings) {
    store.settings = {
      companyName: "ӨДРИЙН ХООЛ",
      supportPhone: "",
      adminSecret: DEFAULT_ADMIN_SECRET,
    };
    changed = true;
  }
  if (!isValidAdminSecret(store.settings.adminSecret ?? "")) {
    store.settings.adminSecret = DEFAULT_ADMIN_SECRET;
    changed = true;
  }
  if (!Array.isArray(store.adjustments)) {
    store.adjustments = [];
    changed = true;
  }
  if (!Array.isArray(store.permissions)) {
    store.permissions = defaultPermissions();
    changed = true;
  } else {
    for (const item of defaultPermissions()) {
      const existing = store.permissions.find(
        (permission) => permission.group === item.group && permission.key === item.key,
      );
      if (!existing) {
        store.permissions.push(item);
        changed = true;
      } else if (existing.label !== item.label) {
        existing.label = item.label;
        existing.builtin = true;
        changed = true;
      }
    }
  }
  return changed;
}

function take(store: StoreData) {
  normalize(store);
  memory = store;
  return store;
}

async function read(): Promise<StoreData> {
  if (process.env.VERCEL) {
    try {
      const { loadCloudStore } = await import("@/lib/data/cloud-store");
      const cloud = await loadCloudStore();
      if (cloud?.users?.length) return take(cloud);
    } catch {
      // Keep this instance's copy if the database is briefly unreachable.
    }
    if (memory) return take(memory);
  } else if (memory) {
    if (normalize(memory)) await persist(memory);
    return memory;
  } else {
    const localFile = await readFromFiles();
    if (localFile) return take(localFile);
  }

  const fromFile = await readFromFiles();
  if (fromFile) return take(fromFile);
  const seeded = buildSeed();
  const fromEnv = envAdminSecret();
  if (fromEnv) seeded.settings.adminSecret = fromEnv;
  return take(seeded);
}

function sessionFrom(user: UserRecord, profile: ProfileRecord): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    branchId: profile.branchId,
  };
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function resolvedLoginEmail(branch: Branch) {
  if (branch.loginEmail && isEmailLike(branch.loginEmail)) return branch.loginEmail.trim().toLowerCase();
  if (isEmailLike(branch.address)) return branch.address.trim().toLowerCase();
  return "";
}

function publicBranch(branch: Branch): Branch {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    isActive: branch.isActive,
    createdAt: branch.createdAt,
    loginEmail: resolvedLoginEmail(branch),
    hasPassword: Boolean(branch.passwordHash),
  };
}

function branchAccountEmail(branchId: string) {
  return `branch.${branchId}@local.mn`;
}

function findBranchAccount(store: StoreData, branchId: string) {
  const generated = branchAccountEmail(branchId);
  const byEmail = store.users.find((item) => item.email.toLowerCase() === generated);
  if (byEmail) return byEmail;
  const profile = store.profiles.find((item) => item.branchId === branchId && item.lastName === "Салбар");
  if (!profile) return undefined;
  return store.users.find((item) => item.id === profile.userId);
}

function viewsOf(store: StoreData, orders = store.orders) {
  return toOrderViews(orders, store.orderItems, store.meals, store.branches);
}

function filterOrders(store: StoreData, query: OrderQuery = {}) {
  const views = viewsOf(store);
  return views.filter((order) => {
    const orderDate = toUlaanbaatarDate(order.createdAt);
    if (query.date && orderDate !== query.date) return false;
    if (query.from && orderDate < query.from) return false;
    if (query.to && orderDate > query.to) return false;
    if (query.branchId && order.branchId !== query.branchId) return false;
    if (query.status && order.status !== query.status) return false;
    if (query.userId && order.userId !== query.userId) return false;
    if (query.query) {
      const haystack = [
        order.orderNumber,
        order.customerLastName,
        order.customerFirstName,
        order.customerPhone,
        normalizePhone(order.customerPhone),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query.query.trim().toLowerCase())) return false;
    }
    return true;
  });
}

export async function authenticate(email: string, password: string) {
  return locked(async () => {
    const store = await read();
    const normalized = email.trim().toLowerCase();
    const user = store.users.find((item) => item.email.toLowerCase() === normalized);
    if (user && verifyPassword(password, user.passwordHash)) {
      const profile = store.profiles.find((item) => item.userId === user.id);
      if (profile) return sessionFrom(user, profile);
    }
    const branch = store.branches.find(
      (item) => item.isActive && Boolean(item.passwordHash) && resolvedLoginEmail(item) === normalized,
    );
    if (!branch?.passwordHash || !verifyPassword(password, branch.passwordHash)) return null;
    const branchUser = findBranchAccount(store, branch.id);
    const profile = branchUser ? store.profiles.find((item) => item.userId === branchUser.id) : null;
    if (!branchUser || !profile) return null;
    return sessionFrom(branchUser, profile);
  });
}

export async function getUserById(id: string) {
  return locked(async () => {
    const store = await read();
    const user = store.users.find((item) => item.id === id);
    const profile = store.profiles.find((item) => item.userId === id);
    if (!user || !profile) return null;
    return sessionFrom(user, profile);
  });
}

export async function updateProfile(userId: string, input: { firstName: string; lastName: string; phone: string }) {
  return locked(async () => {
    const store = await read();
    const profile = store.profiles.find((item) => item.userId === userId);
    if (!profile) throw new AppError("UNAUTHORIZED");
    profile.firstName = input.firstName;
    profile.lastName = input.lastName;
    profile.phone = normalizePhone(input.phone);
    await persist(store);
    const user = store.users.find((item) => item.id === userId);
    if (!user) throw new AppError("UNAUTHORIZED");
    return sessionFrom(user, profile);
  });
}

export async function getSettings(): Promise<AppSettings> {
  return locked(async () => {
    const settings = (await read()).settings;
    return { companyName: settings.companyName, supportPhone: settings.supportPhone };
  });
}

export async function getAdminSecret() {
  const fromEnv = envAdminSecret();
  if (fromEnv) return fromEnv;
  return locked(async () => (await read()).settings.adminSecret);
}

export async function updateAdminSecret(secret: string) {
  return locked(async () => {
    if (!isValidAdminSecret(secret)) throw new AppError("INVALID_SECRET");
    const store = await read();
    store.settings.adminSecret = secret;
    await persist(store);
    return secret;
  });
}

export async function updateSettings(input: AppSettings) {
  return locked(async () => {
    const store = await read();
    store.settings.companyName = input.companyName.trim();
    store.settings.supportPhone = input.supportPhone ? normalizePhone(input.supportPhone) : "";
    await persist(store);
    return { companyName: store.settings.companyName, supportPhone: store.settings.supportPhone };
  });
}

function toAccount(store: StoreData, profile: ProfileRecord): AccountView | null {
  const user = store.users.find((item) => item.id === profile.userId);
  if (!user) return null;
  const branch = store.branches.find((item) => item.id === profile.branchId);
  return {
    id: user.id,
    email: user.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    role: profile.role,
    branchId: profile.branchId,
    branchName: branch?.name ?? "",
  };
}

export async function listAccounts(): Promise<AccountView[]> {
  return locked(async () => {
    const store = await read();
    return store.profiles
      .map((profile) => toAccount(store, profile))
      .filter((account): account is AccountView => {
        if (!account?.email) return false;
        return !account.email.endsWith("@local.mn");
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "mn"));
  });
}

export async function createAccount(input: AccountInput) {
  return locked(async () => {
    const store = await read();
    if (input.role === "admin") throw new AppError("FORBIDDEN");
    const email = input.email.trim().toLowerCase();
    if (store.users.some((user) => user.email.toLowerCase() === email)) throw new AppError("EMAIL_TAKEN");
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    store.users.push({
      id: userId,
      email,
      passwordHash: hashPassword(input.password),
      createdAt: now,
    });
    store.profiles.push({
      id: crypto.randomUUID(),
      userId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone ? normalizePhone(input.phone) : "",
      role: input.role,
      branchId: input.branchId || null,
      createdAt: now,
    });
    await persist(store, { requireCloud: true });
    try {
      const { provisionAuthUser } = await import("@/lib/data/cloud-store");
      await provisionAuthUser({
        email,
        password: input.password,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone,
        role: input.role,
        branchId: input.branchId,
      });
    } catch {
      // Local account still works if Auth provisioning is unavailable.
    }
    return userId;
  });
}

export async function setAccountRole(_actorId: string, userId: string, role: Role) {
  return locked(async () => {
    const store = await read();
    const profile = store.profiles.find((item) => item.userId === userId);
    if (!profile) throw new AppError("ACCOUNT_NOT_FOUND");
    if (role === "admin") throw new AppError("FORBIDDEN");
    if (profile.role === "admin") throw new AppError("LAST_ADMIN");
    profile.role = role;
    await persist(store, { requireCloud: true });
  });
}

export async function setAccountPassword(userId: string, password: string) {
  return locked(async () => {
    const store = await read();
    const user = store.users.find((item) => item.id === userId);
    if (!user) throw new AppError("ACCOUNT_NOT_FOUND");
    user.passwordHash = hashPassword(password);
    await persist(store, { requireCloud: true });
  });
}

export async function deleteAccount(actorId: string, userId: string) {
  return locked(async () => {
    const store = await read();
    if (actorId === userId) throw new AppError("FORBIDDEN");
    const profile = store.profiles.find((item) => item.userId === userId);
    const user = store.users.find((item) => item.id === userId);
    if (!profile && !user) return;
    if (profile?.role === "admin" && store.profiles.filter((item) => item.role === "admin").length <= 1) {
      throw new AppError("LAST_ADMIN");
    }
    const email = user?.email;
    store.users = store.users.filter((item) => item.id !== userId);
    store.profiles = store.profiles.filter((item) => item.userId !== userId);
    await persist(store, { requireCloud: true });
    if (email) {
      try {
        const { removeAuthUser } = await import("@/lib/data/cloud-store");
        await removeAuthUser(email);
      } catch {
        // Local delete still stands if Auth cleanup is unavailable.
      }
    }
  });
}

export async function getPermissions() {
  return locked(async () => (await read()).permissions);
}

export async function setPermissionEnabled(id: string, enabled: boolean) {
  return locked(async () => {
    const store = await read();
    const permission = store.permissions.find((item) => item.id === id);
    if (!permission) throw new AppError("FORBIDDEN");
    permission.enabled = enabled;
    await persist(store);
    return permission;
  });
}

export async function addPermission(label: string, group: PermissionGroup) {
  return locked(async () => {
    const store = await read();
    const permission: Permission = {
      id: crypto.randomUUID(),
      key: `custom-${crypto.randomUUID().slice(0, 8)}`,
      label: label.trim(),
      group,
      enabled: true,
      builtin: false,
    };
    store.permissions.push(permission);
    await persist(store);
    return permission;
  });
}

export async function removePermission(id: string) {
  return locked(async () => {
    const store = await read();
    const permission = store.permissions.find((item) => item.id === id);
    if (!permission) throw new AppError("FORBIDDEN");
    if (permission.builtin) throw new AppError("FORBIDDEN");
    store.permissions = store.permissions.filter((item) => item.id !== id);
    await persist(store);
  });
}

function upsertBranchAccount(store: StoreData, branch: Branch, passwordHash: string) {
  const email = branchAccountEmail(branch.id);
  const now = new Date().toISOString();
  const existing = findBranchAccount(store, branch.id);
  if (!existing) {
    const userId = crypto.randomUUID();
    store.users.push({ id: userId, email, passwordHash, createdAt: now });
    store.profiles.push({
      id: crypto.randomUUID(),
      userId,
      firstName: branch.name,
      lastName: "Салбар",
      phone: "",
      role: "employee",
      branchId: branch.id,
      createdAt: now,
    });
    return;
  }
  existing.passwordHash = passwordHash;
  const profile = store.profiles.find((item) => item.userId === existing.id);
  if (profile) {
    profile.firstName = branch.name;
    profile.branchId = branch.id;
    profile.role = "employee";
  }
}

function removeBranchAccount(store: StoreData, branchId: string) {
  const user = findBranchAccount(store, branchId);
  if (!user) return;
  store.users = store.users.filter((item) => item.id !== user.id);
  store.profiles = store.profiles.filter((item) => item.userId !== user.id);
}

function syncBranchAccountName(store: StoreData, branch: Branch) {
  const user = findBranchAccount(store, branch.id);
  if (!user) return;
  const profile = store.profiles.find((item) => item.userId === user.id);
  if (profile) profile.firstName = branch.name;
}

export async function getBranches(includeInactive = false): Promise<Branch[]> {
  return locked(async () => {
    const store = await read();
    return store.branches
      .filter((branch) => includeInactive || branch.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, "mn"))
      .map(publicBranch);
  });
}

export async function saveBranch(input: BranchInput, id?: string) {
  return locked(async () => {
    const store = await read();
    if (id) {
      const branch = store.branches.find((item) => item.id === id);
      if (!branch) throw new AppError("BRANCH_INACTIVE", "Салбар олдсонгүй.");
      branch.name = input.name.trim();
      branch.address = input.address.trim();
      branch.loginEmail = input.loginEmail?.trim().toLowerCase() || resolvedLoginEmail({ ...branch, loginEmail: input.loginEmail ?? "" });
      if (typeof input.isActive === "boolean") branch.isActive = input.isActive;
      syncBranchAccountName(store, branch);
      await persist(store);
      return publicBranch(branch);
    }
    const branch: Branch = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      address: input.address.trim(),
      loginEmail: input.loginEmail?.trim().toLowerCase() || (isEmailLike(input.address) ? input.address.trim().toLowerCase() : ""),
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    store.branches.push(branch);
    await persist(store);
    return publicBranch(branch);
  });
}

export async function setBranchActive(id: string, isActive: boolean) {
  return locked(async () => {
    const store = await read();
    const branch = store.branches.find((item) => item.id === id);
    if (!branch) throw new AppError("BRANCH_INACTIVE", "Салбар олдсонгүй.");
    branch.isActive = isActive;
    await persist(store);
    return publicBranch(branch);
  });
}

export async function deleteBranch(id: string) {
  return locked(async () => {
    const store = await read();
    const branch = store.branches.find((item) => item.id === id);
    if (branch) {
      for (const order of store.orders) {
        if (order.branchId === id) order.branchName = order.branchName || branch.name;
      }
    }
    removeBranchAccount(store, id);
    store.branches = store.branches.filter((item) => item.id !== id);
    await persist(store);
  });
}

export async function setBranchPassword(id: string, password: string) {
  return locked(async () => {
    const store = await read();
    const branch = store.branches.find((item) => item.id === id);
    if (!branch) throw new AppError("BRANCH_INACTIVE", "Салбар олдсонгүй.");
    const passwordHash = hashPassword(password);
    branch.passwordHash = passwordHash;
    upsertBranchAccount(store, branch, passwordHash);
    await persist(store);
    return publicBranch(branch);
  });
}

export async function clearBranchPassword(id: string) {
  return locked(async () => {
    const store = await read();
    const branch = store.branches.find((item) => item.id === id);
    if (!branch) throw new AppError("BRANCH_INACTIVE", "Салбар олдсонгүй.");
    branch.passwordHash = null;
    const user = findBranchAccount(store, id);
    if (user) user.passwordHash = hashPassword(crypto.randomUUID());
    await persist(store);
    return publicBranch(branch);
  });
}

export async function authenticateBranch(branchId: string, password: string) {
  return locked(async () => {
    const store = await read();
    const branch = store.branches.find((item) => item.id === branchId);
    if (!branch) return null;
    if (!branch.isActive) throw new AppError("BRANCH_INACTIVE");
    if (!branch.passwordHash) throw new AppError("BRANCH_NO_PASSWORD");
    if (!verifyPassword(password, branch.passwordHash)) return null;
    const user = findBranchAccount(store, branch.id);
    const profile = user ? store.profiles.find((item) => item.userId === user.id) : null;
    if (!user || !profile) return null;
    return sessionFrom(user, profile);
  });
}

export async function getMeals() {
  return locked(async () => {
    const store = await read();
    return withOrderedQuantity(store.meals, store.orderItems, store.orders).sort((a, b) =>
      a.mealDate < b.mealDate ? 1 : -1,
    );
  });
}

export async function getTodayMeals() {
  const today = todayInUlaanbaatar();
  const meals = await getMeals();
  return meals.filter((meal) => meal.mealDate === today && meal.isActive);
}

export async function getMeal(id: string) {
  const meals = await getMeals();
  return meals.find((meal) => meal.id === id) ?? null;
}

export async function saveMeal(input: MealInput, userId: string, id?: string) {
  return locked(async () => {
    const store = await read();
    const now = new Date().toISOString();
    if (id) {
      const meal = store.meals.find((item) => item.id === id);
      if (!meal) throw new AppError("MEAL_NOT_FOUND");
      meal.name = input.name.trim();
      meal.description = input.description.trim();
      meal.imageUrl = input.imageUrl;
      meal.price = input.price;
      meal.availableQuantity = input.availableQuantity;
      meal.orderDeadline = input.orderDeadline;
      meal.mealDate = input.mealDate;
      if (typeof input.isActive === "boolean") meal.isActive = input.isActive;
      meal.updatedAt = now;
      await persist(store);
      return meal;
    }
    const meal: Meal = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      imageUrl: input.imageUrl,
      price: input.price,
      availableQuantity: input.availableQuantity,
      orderDeadline: input.orderDeadline,
      mealDate: input.mealDate,
      isActive: input.isActive ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    store.meals.push(meal);
    await persist(store);
    return meal;
  });
}

export async function setMealActive(id: string, isActive: boolean) {
  return locked(async () => {
    const store = await read();
    const meal = store.meals.find((item) => item.id === id);
    if (!meal) throw new AppError("MEAL_NOT_FOUND");
    meal.isActive = isActive;
    meal.updatedAt = new Date().toISOString();
    await persist(store);
    return meal;
  });
}

export async function deleteMeal(id: string) {
  return locked(async () => {
    const store = await read();
    const meal = store.meals.find((item) => item.id === id);
    if (!meal) throw new AppError("MEAL_NOT_FOUND");
    for (const item of store.orderItems) {
      if (item.mealId === id) item.mealName = item.mealName || meal.name;
    }
    store.meals = store.meals.filter((item) => item.id !== id);
    await persist(store);
  });
}

export async function getOrders(query: OrderQuery = {}): Promise<OrderView[]> {
  return locked(async () => filterOrders(await read(), query));
}

export async function getOrderByNumber(orderNumber: string) {
  const orders = await getOrders();
  return orders.find((order) => order.orderNumber === orderNumber) ?? null;
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderView> {
  return locked(async () => {
    const store = await read();
    const meal = store.meals.find((item) => item.id === input.mealId);
    if (!meal) throw new AppError("MEAL_NOT_FOUND");
    if (!meal.isActive) throw new AppError("MEAL_INACTIVE");
    if (isMealDatePassed(meal.mealDate)) throw new AppError("DEADLINE_PASSED");
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new AppError("INSUFFICIENT_QUANTITY");
    if (meal.availableQuantity < input.quantity) throw new AppError("INSUFFICIENT_QUANTITY");
    const branch = store.branches.find((item) => item.id === input.branchId && item.isActive);
    if (!branch) throw new AppError("BRANCH_INACTIVE");

    const now = new Date().toISOString();
    const today = todayInUlaanbaatar();
    const orderId = crypto.randomUUID();
    const total = meal.price * input.quantity;
    const orderNumber = nextOrderNumber(
      store.orders.map((order) => order.orderNumber),
      today,
    );
    meal.availableQuantity -= input.quantity;
    meal.updatedAt = now;
    store.orders.push({
      id: orderId,
      orderNumber,
      userId: input.userId,
      branchId: branch.id,
      branchName: branch.name,
      totalAmount: total,
      status: "new",
      note: input.note?.trim() ?? "",
      customerLastName: input.lastName.trim(),
      customerFirstName: input.firstName.trim(),
      customerPhone: normalizePhone(input.phone),
      createdAt: now,
      updatedAt: now,
    });
    store.orderItems.push({
      id: crypto.randomUUID(),
      orderId,
      mealId: meal.id,
      mealName: meal.name,
      quantity: input.quantity,
      unitPrice: meal.price,
      totalPrice: total,
    });
    await persist(store);
    const view = viewsOf(store).find((order) => order.id === orderId);
    if (!view) throw new AppError("ORDER_NOT_FOUND");
    return view;
  });
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  return locked(async () => {
    const store = await read();
    const order = store.orders.find((item) => item.id === orderId);
    if (!order) throw new AppError("ORDER_NOT_FOUND");
    if (order.status === status) return viewsOf(store).find((item) => item.id === orderId)!;
    const items = store.orderItems.filter((item) => item.orderId === order.id);
    if (order.status !== "cancelled" && status === "cancelled") {
      for (const item of items) {
        const meal = store.meals.find((mealItem) => mealItem.id === item.mealId);
        const restore = order.status === "received" ? (item.givenQuantity ?? item.quantity) : item.quantity;
        if (meal) {
          meal.availableQuantity += restore;
          meal.updatedAt = new Date().toISOString();
        }
      }
    } else if (order.status === "cancelled" && status !== "cancelled") {
      for (const item of items) {
        const meal = store.meals.find((mealItem) => mealItem.id === item.mealId);
        if (!meal || meal.availableQuantity < item.quantity) throw new AppError("INSUFFICIENT_QUANTITY");
        meal.availableQuantity -= item.quantity;
        meal.updatedAt = new Date().toISOString();
      }
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    await persist(store);
    return viewsOf(store).find((item) => item.id === orderId)!;
  });
}

export async function fulfillOrder(orderId: string, given: { itemId: string; quantity: number }[]) {
  return locked(async () => {
    const store = await read();
    const order = store.orders.find((item) => item.id === orderId);
    if (!order) throw new AppError("ORDER_NOT_FOUND");
    if (order.status === "cancelled") throw new AppError("INVALID_STATUS");
    const alreadyGiven = order.status === "received";
    const items = store.orderItems.filter((item) => item.orderId === order.id);
    let total = 0;
    for (const item of items) {
      const next = given.find((row) => row.itemId === item.id);
      const quantity = next?.quantity ?? item.quantity;
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > item.quantity) {
        throw new AppError("INVALID_GIVEN_QTY");
      }
      const previousGiven = alreadyGiven ? (item.givenQuantity ?? item.quantity) : item.quantity;
      const stockDelta = previousGiven - quantity;
      if (stockDelta !== 0) {
        const meal = store.meals.find((mealItem) => mealItem.id === item.mealId);
        if (meal) {
          meal.availableQuantity += stockDelta;
          meal.updatedAt = new Date().toISOString();
        }
      }
      item.givenQuantity = quantity;
      item.totalPrice = quantity * item.unitPrice;
      total += item.totalPrice;
    }
    order.totalAmount = total;
    order.status = "received";
    order.updatedAt = new Date().toISOString();
    await persist(store);
    return viewsOf(store).find((item) => item.id === orderId)!;
  });
}

export async function getDashboard(date = todayInUlaanbaatar()): Promise<DashboardStats> {
  return locked(async () => {
    const store = await read();
    const dayOrders = filterOrders(store, { date });
    const adjustment = (store.adjustments ?? []).find((item) => item.date === date);
    const totals = applyDailyAdjustment(summarize(dayOrders), adjustment);
    const allViews = viewsOf(store);
    return {
      date,
      ...totals,
      activeMeals: adjustment?.activeMeals ?? store.meals.filter((meal) => meal.mealDate === date && meal.isActive).length,
      branchSummary: branchStats(dayOrders, store.branches),
      recentOrders: dayOrders.slice(0, 6),
      monthly: overlayMonthly(monthlySeries(allViews), allViews, store.adjustments ?? []),
    };
  });
}

export async function saveDailyAdjustment(input: DailyAdjustment) {
  return locked(async () => {
    const store = await read();
    store.adjustments = store.adjustments ?? [];
    const next: DailyAdjustment = {
      date: input.date,
      totalOrders: input.totalOrders,
      totalPortions: input.totalPortions,
      givenPortions: input.givenPortions,
      totalRevenue: input.totalRevenue,
      activeMeals: input.activeMeals,
    };
    const index = store.adjustments.findIndex((item) => item.date === input.date);
    if (index >= 0) store.adjustments[index] = next;
    else store.adjustments.push(next);
    await persist(store, { requireCloud: true });
    return next;
  });
}

export async function clearDailyAdjustment(date: string) {
  return locked(async () => {
    const store = await read();
    store.adjustments = (store.adjustments ?? []).filter((item) => item.date !== date);
    await persist(store, { requireCloud: true });
  });
}

export async function getReport(range: "day" | "week" | "month"): Promise<ReportData> {
  return locked(async () => {
    const store = await read();
    const { from, to } = rangeFor(range);
    const orders = filterOrders(store, { from, to });
    const adjustments = (store.adjustments ?? []).filter((item) => item.date >= from && item.date <= to);
    const daily = overlayDaily(dailySeries(orders, from, to), adjustments);
    const totals = daily.reduce(
      (sum, point) => {
        const dayOrders = orders.filter((order) => toUlaanbaatarDate(order.createdAt) === point.date);
        const next = applyDailyAdjustment(summarize(dayOrders), adjustments.find((item) => item.date === point.date));
        sum.totalOrders += next.totalOrders;
        sum.totalPortions += next.totalPortions;
        sum.givenPortions += next.givenPortions;
        sum.totalRevenue += next.totalRevenue;
        return sum;
      },
      { totalOrders: 0, totalPortions: 0, givenPortions: 0, totalRevenue: 0 },
    );
    return {
      range,
      from,
      to,
      ...totals,
      daily,
      byBranch: branchStats(orders, store.branches),
      topMeals: topMeals(orders),
    };
  });
}
