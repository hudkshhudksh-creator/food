import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, rangeFor, todayInUlaanbaatar } from "@/lib/format";
import { branchStats, dailySeries, monthlySeries, summarize, topMeals } from "@/lib/data/present";
import type {
  AccountView,
  AppSettings,
  Branch,
  BranchInput,
  DashboardStats,
  Meal,
  MealInput,
  MealView,
  OrderQuery,
  OrderStatus,
  OrderView,
  PlaceOrderInput,
  ReportData,
  Role,
  SessionUser,
} from "@/types";

type MealRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  available_quantity: number;
  order_deadline: string;
  meal_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ordered_quantity?: number;
};

type OrderItemRow = {
  id: string;
  meal_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  meals: { name: string } | { name: string }[] | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  branch_id: string;
  total_amount: number;
  status: OrderStatus;
  note: string | null;
  customer_last_name: string;
  customer_first_name: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  branches: { name: string } | { name: string }[] | null;
  order_items: OrderItemRow[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapMeal(row: MealRow, orderedQuantity = 0): MealView {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.image_url,
    price: row.price,
    availableQuantity: row.available_quantity,
    orderDeadline: row.order_deadline.slice(0, 5),
    mealDate: row.meal_date,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    orderedQuantity,
  };
}

function mapOrder(row: OrderRow): OrderView {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    branchId: row.branch_id,
    branchName: one(row.branches)?.name ?? "Салбар",
    totalAmount: row.total_amount,
    status: row.status,
    note: row.note ?? "",
    customerLastName: row.customer_last_name,
    customerFirstName: row.customer_first_name,
    customerPhone: row.customer_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      mealId: item.meal_id,
      mealName: one(item.meals)?.name ?? "Хоол",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
    })),
  };
}

function mapBranch(row: {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}): Branch {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    isActive: row.is_active,
    createdAt: row.created_at,
    loginEmail: "",
    hasPassword: false,
  };
}

const ORDER_SELECT = `
  id, order_number, user_id, branch_id, total_amount, status, note,
  customer_last_name, customer_first_name, customer_phone, created_at, updated_at,
  branches(name),
  order_items(id, meal_id, quantity, unit_price, total_price, meals(name))
`;

async function orderedCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("meal_id, quantity, orders!inner(status)");
  if (error) throw new AppError("ORDER_NOT_FOUND", error.message);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const status = one(row.orders as { status: string } | { status: string }[])?.status;
    if (status === "cancelled") continue;
    counts.set(row.meal_id, (counts.get(row.meal_id) ?? 0) + row.quantity);
  }
  return counts;
}

export async function getSupabaseUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  const rawRole = profile?.role || meta.role;
  return {
    id: user.id,
    email: user.email ?? "",
    role: rawRole === "admin" ? "admin" : rawRole === "cook" ? "cook" : "employee",
    firstName: profile?.first_name || meta.first_name || "",
    lastName: profile?.last_name || meta.last_name || "",
    phone: profile?.phone || meta.phone || "",
    branchId: profile?.branch_id || meta.branch_id || null,
  };
}

export async function updateProfile(userId: string, input: { firstName: string; lastName: string; phone: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: normalizePhone(input.phone),
    })
    .eq("user_id", userId);
  if (error) throw new AppError("UNAUTHORIZED", error.message);
  const user = await getSupabaseUser();
  if (!user) throw new AppError("UNAUTHORIZED");
  return user;
}

export async function getSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("company_name, support_phone").eq("id", 1).maybeSingle();
  return {
    companyName: data?.company_name || "ӨДРИЙН ХООЛ",
    supportPhone: data?.support_phone || "",
  };
}

export async function updateSettings(input: AppSettings) {
  const supabase = await createClient();
  const settings = {
    id: 1,
    company_name: input.companyName.trim(),
    support_phone: input.supportPhone ? normalizePhone(input.supportPhone) : "",
  };
  const { error } = await supabase.from("app_settings").upsert(settings);
  if (error) throw new AppError("FORBIDDEN", error.message);
  return { companyName: settings.company_name, supportPhone: settings.support_phone };
}

export async function getBranches(includeInactive = false) {
  const supabase = await createClient();
  let query = supabase.from("branches").select("id, name, address, is_active, created_at").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(mapBranch);
}

export async function saveBranch(input: BranchInput, id?: string) {
  const supabase = await createClient();
  const payload = {
    name: input.name.trim(),
    address: input.address.trim(),
    is_active: input.isActive ?? true,
  };
  const query = id
    ? supabase.from("branches").update(payload).eq("id", id).select("id, name, address, is_active, created_at").single()
    : supabase.from("branches").insert(payload).select("id, name, address, is_active, created_at").single();
  const { data, error } = await query;
  if (error || !data) throw new AppError("BRANCH_INACTIVE", error?.message);
  return mapBranch(data);
}

export async function setBranchActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, name, address, is_active, created_at")
    .single();
  if (error || !data) throw new AppError("BRANCH_INACTIVE", error?.message);
  return mapBranch(data);
}

export async function deleteBranch(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw new AppError("BRANCH_INACTIVE", error.message);
}

export async function getMeals() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meals").select("*").order("meal_date", { ascending: false });
  if (error) throw new AppError("MEAL_NOT_FOUND", error.message);
  const counts = await orderedCounts();
  return (data as MealRow[]).map((row) => mapMeal(row, counts.get(row.id) ?? 0));
}

export async function getTodayMeals() {
  const meals = await getMeals();
  const today = todayInUlaanbaatar();
  return meals.filter((meal) => meal.mealDate === today && meal.isActive);
}

export async function getMeal(id: string) {
  const meals = await getMeals();
  return meals.find((meal) => meal.id === id) ?? null;
}

export async function saveMeal(input: MealInput, userId: string, id?: string): Promise<Meal> {
  const supabase = await createClient();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    image_url: input.imageUrl,
    price: input.price,
    available_quantity: input.availableQuantity,
    order_deadline: input.orderDeadline,
    meal_date: input.mealDate,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("meals").update(payload).eq("id", id).select("*").single()
    : supabase.from("meals").insert({ ...payload, created_by: userId }).select("*").single();
  const { data, error } = await query;
  if (error || !data) throw new AppError("MEAL_NOT_FOUND", error?.message);
  return mapMeal(data as MealRow);
}

export async function setMealActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new AppError("MEAL_NOT_FOUND", error?.message);
  return mapMeal(data as MealRow);
}

export async function deleteMeal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw new AppError("MEAL_NOT_FOUND", error.message);
}

export async function getOrders(query: OrderQuery = {}): Promise<OrderView[]> {
  const supabase = await createClient();
  let request = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (query.userId) request = request.eq("user_id", query.userId);
  if (query.branchId) request = request.eq("branch_id", query.branchId);
  if (query.status) request = request.eq("status", query.status);
  if (query.date) {
    request = request
      .gte("created_at", new Date(`${query.date}T00:00:00+08:00`).toISOString())
      .lte("created_at", new Date(`${query.date}T23:59:59.999+08:00`).toISOString());
  } else {
    if (query.from) request = request.gte("created_at", new Date(`${query.from}T00:00:00+08:00`).toISOString());
    if (query.to) request = request.lte("created_at", new Date(`${query.to}T23:59:59.999+08:00`).toISOString());
  }
  const { data, error } = await request;
  if (error) throw new AppError("ORDER_NOT_FOUND", error.message);
  let orders = ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
  if (query.query) {
    const needle = query.query.trim().toLowerCase();
    orders = orders.filter((order) =>
      [order.orderNumber, order.customerLastName, order.customerFirstName, order.customerPhone, normalizePhone(order.customerPhone)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  return orders;
}

export async function getOrderByNumber(orderNumber: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("order_number", orderNumber).maybeSingle();
  if (error) throw new AppError("ORDER_NOT_FOUND", error.message);
  return data ? mapOrder(data as unknown as OrderRow) : null;
}

export async function placeOrder(input: PlaceOrderInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_meal_id: input.mealId,
    p_branch_id: input.branchId,
    p_quantity: input.quantity,
    p_last_name: input.lastName,
    p_first_name: input.firstName,
    p_phone: normalizePhone(input.phone),
    p_note: input.note ?? "",
  });
  if (error) throw new Error(error.message);
  const orderNumber = (data as { order_number?: string } | null)?.order_number;
  if (!orderNumber) throw new AppError("ORDER_NOT_FOUND");
  const order = await getOrderByNumber(orderNumber);
  if (!order) throw new AppError("ORDER_NOT_FOUND");
  return order;
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", { p_order_id: orderId, p_status: status });
  if (error) throw new Error(error.message);
  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).single();
  return mapOrder(data as unknown as OrderRow);
}

export async function getDashboard(date = todayInUlaanbaatar()): Promise<DashboardStats> {
  const [orders, meals] = await Promise.all([getOrders({ date }), getMeals()]);
  const branches = await getBranches(true);
  const totals = summarize(orders);
  return {
    date,
    ...totals,
    activeMeals: meals.filter((meal) => meal.mealDate === date && meal.isActive).length,
    branchSummary: branchStats(orders, branches),
    recentOrders: orders.slice(0, 6),
    monthly: monthlySeries(orders),
  };
}

export async function listAccounts(): Promise<AccountView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, phone, role, branch_id, branches(name)")
    .order("last_name");
  if (error || !data) return [];

  const admin = createAdminClient();
  const emails = new Map<string, string>();
  if (admin) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const user of users?.users ?? []) {
      if (user.email) emails.set(user.id, user.email);
    }
  }

  return data
    .map((row) => {
      const email = emails.get(row.user_id) ?? "";
      const branch = one(row.branches as { name: string } | { name: string }[] | null);
      const role: Role = row.role === "admin" ? "admin" : row.role === "cook" ? "cook" : "employee";
      return {
        id: row.user_id as string,
        email,
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        phone: row.phone ?? "",
        role,
        branchId: row.branch_id ?? null,
        branchName: branch?.name ?? "",
      };
    })
    .filter((account) => account.id);
}

export async function setAccountPassword(userId: string, password: string) {
  const admin = createAdminClient();
  if (!admin) throw new AppError("FORBIDDEN", "Нууц үг солих серверийн тохиргоо дутуу байна.");
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new AppError("FORBIDDEN", error.message);
}

export async function getReport(range: "day" | "week" | "month"): Promise<ReportData> {
  const { from, to } = rangeFor(range);
  const [orders, branches] = await Promise.all([getOrders({ from, to }), getBranches(true)]);
  const totals = summarize(orders);
  return {
    range,
    from,
    to,
    ...totals,
    daily: dailySeries(orders, from, to),
    byBranch: branchStats(orders, branches),
    topMeals: topMeals(orders),
  };
}
