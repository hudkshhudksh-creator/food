"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { employeeAllowed, requireCook } from "@/lib/auth/access";
import { requireAdmin, requireStaff, requireUser } from "@/lib/auth/current-user";
import { clearSession, createSession } from "@/lib/auth/session";
import { authenticate, authenticateBranch } from "@/lib/data/local";
import {
  addPermission,
  clearBranchPassword,
  createAccount,
  deleteAccount,
  deleteBranch,
  deleteMeal,
  fulfillOrder,
  getAdminSecret,
  placeOrder,
  removePermission,
  saveBranch,
  saveMeal,
  setAccountPassword,
  setAccountRole,
  setBranchActive,
  setBranchPassword,
  setMealActive,
  setOrderStatus,
  setPermissionEnabled,
  updateAdminSecret,
  updateProfile,
  updateSettings,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AppError, errorMessage } from "@/lib/errors";
import { isPanelPath } from "@/lib/panel-path";
import {
  accountPasswordSchema,
  accountSchema,
  branchLoginSchema,
  branchPasswordSchema,
  branchSchema,
  fulfillOrderSchema,
  loginSchema,
  mealSchema,
  normalizedOrder,
  orderSchema,
  permissionLabelSchema,
  profileSchema,
  settingsSchema,
} from "@/lib/validations";
import type { OrderStatus, Role } from "@/types";

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/my-orders");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/meals");
  revalidatePath("/admin/branches");
}

async function safeNext(next: string | undefined, role: Role) {
  const secret = await getAdminSecret();
  const panel = `/${secret}`;
  const fallback = role === "employee" ? "/" : panel;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login") || next.startsWith("/admin")) {
    return fallback;
  }
  if (role === "admin" || role === "cook") return isPanelPath(next, secret) ? next : panel;
  if (isPanelPath(next, secret)) return "/";
  return next;
}

export async function loginAction(input: { email: string; password: string; next?: string; audience?: "cook" | "employee" }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata ?? {};
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      const rawRole = profile?.role || meta.role;
      const role: Role = rawRole === "admin" ? "admin" : rawRole === "cook" ? "cook" : "employee";
      if (input.audience === "cook" && role === "employee") {
        await supabase.auth.signOut();
        return { ok: false as const, message: "Энэ хаяг ажилтны бүртгэл. Нүүр хуудсаар нэвтэрнэ үү." };
      }
      redirect(await safeNext(input.next, role));
    }
  }
  if (!user) return { ok: false as const, message: "Имэйл эсвэл нууц үг буруу байна." };
  if (input.audience === "cook" && user.role === "employee") {
    return { ok: false as const, message: "Энэ хаяг ажилтны бүртгэл. Нүүр хуудсаар нэвтэрнэ үү." };
  }
  await createSession(user);
  redirect(await safeNext(input.next, user.role));
}

export async function loginBranchAction(input: { branchId: string; password: string; next?: string }) {
  const parsed = branchLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
  }
  let user;
  try {
    user = await authenticateBranch(parsed.data.branchId, parsed.data.password);
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Салбар эсвэл нууц үг буруу байна.") };
  }
  if (!user) return { ok: false as const, message: "Салбар эсвэл нууц үг буруу байна." };
  await createSession(user);
  redirect(await safeNext(input.next, user.role));
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } else {
    await clearSession();
  }
  redirect("/login");
}

export async function placeOrderAction(input: unknown) {
  try {
    const user = await requireUser();
    if (!(await employeeAllowed("place_order"))) throw new AppError("FORBIDDEN");
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    const data = normalizedOrder(parsed.data);
    const order = await placeOrder({ ...data, userId: user.id });
    revalidateAll();
    return { ok: true as const, orderNumber: order.orderNumber };
  } catch (error) {
    return {
      ok: false as const,
      message: errorMessage(error, "Захиалга илгээхэд алдаа гарлаа. Дахин оролдоно уу."),
    };
  }
}

export async function saveMealAction(input: unknown, id?: string) {
  try {
    const user = await requireCook("meals");
    const parsed = mealSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    const meal = await saveMeal(
      {
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        imageUrl: parsed.data.imageUrl ? parsed.data.imageUrl : null,
        price: parsed.data.price,
        availableQuantity: parsed.data.availableQuantity,
        orderDeadline: "23:59",
        mealDate: parsed.data.mealDate,
        isActive: parsed.data.isActive ?? true,
      },
      user.id,
      id,
    );
    revalidateAll();
    return { ok: true as const, id: meal.id };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Хоол хадгалахад алдаа гарлаа.") };
  }
}

export async function setMealActiveAction(id: string, isActive: boolean) {
  try {
    await requireCook("meals");
    await setMealActive(id, isActive);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function deleteMealAction(id: string) {
  try {
    await requireCook("meals");
    await deleteMeal(id);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

const STATUSES: OrderStatus[] = ["new", "confirmed", "preparing", "ready", "received", "cancelled"];

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  try {
    await requireCook("orders");
    if (!STATUSES.includes(status)) throw new AppError("INVALID_STATUS");
    await setOrderStatus(orderId, status);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Статус шинэчлэхэд алдаа гарлаа.") };
  }
}

export async function fulfillOrderAction(input: unknown) {
  try {
    await requireCook("orders");
    const parsed = fulfillOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await fulfillOrder(parsed.data.orderId, parsed.data.items);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Өгсөн тоо хадгалахад алдаа гарлаа.") };
  }
}

export async function saveBranchAction(input: unknown, id?: string) {
  try {
    await requireCook("branches");
    const parsed = branchSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    const saved = await saveBranch(
      {
        name: parsed.data.name,
        address: parsed.data.address ?? "",
        loginEmail: parsed.data.loginEmail ?? "",
        isActive: parsed.data.isActive ?? true,
      },
      id,
    );
    if (!id && parsed.data.password) {
      await setBranchPassword(saved.id, parsed.data.password);
    }
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Салбар хадгалахад алдаа гарлаа.") };
  }
}

export async function setBranchActiveAction(id: string, isActive: boolean) {
  try {
    await requireCook("branches");
    await setBranchActive(id, isActive);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function deleteBranchAction(id: string) {
  try {
    await requireCook("branches");
    await deleteBranch(id);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function setBranchPasswordAction(input: unknown) {
  try {
    await requireCook("branches");
    const parsed = branchPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await setBranchPassword(parsed.data.branchId, parsed.data.password);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Нууц үг хадгалахад алдаа гарлаа.") };
  }
}

export async function clearBranchPasswordAction(id: string) {
  try {
    await requireCook("branches");
    await clearBranchPassword(id);
    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Нууц үг хасахад алдаа гарлаа.") };
  }
}

export async function updateProfileAction(input: unknown) {
  try {
    const user = await requireUser();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await updateProfile(user.id, parsed.data);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Профайл хадгалахад алдаа гарлаа.") };
  }
}

export async function updateSettingsAction(input: unknown) {
  try {
    await requireCook("settings");
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await updateSettings(parsed.data);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Тохиргоо хадгалахад алдаа гарлаа.") };
  }
}

export async function updateAdminSecretAction(secret: string) {
  try {
    await requireAdmin();
    const next = await updateAdminSecret(secret.trim().toLowerCase());
    revalidatePath("/", "layout");
    return { ok: true as const, secret: next };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Нууц хаяг хадгалахад алдаа гарлаа.") };
  }
}

export async function setPermissionEnabledAction(id: string, enabled: boolean) {
  try {
    await requireAdmin();
    await setPermissionEnabled(id, enabled);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function addPermissionAction(input: unknown) {
  try {
    await requireAdmin();
    const parsed = permissionLabelSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await addPermission(parsed.data.label, parsed.data.group);
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function removePermissionAction(id: string) {
  try {
    await requireAdmin();
    await removePermission(id);
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Энэ эрхийг устгах боломжгүй.") };
  }
}

export async function createAccountAction(input: unknown) {
  try {
    const actor = await requireAdmin();
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await createAccount({
      ...parsed.data,
      phone: parsed.data.phone,
      branchId: parsed.data.branchId || undefined,
    });
    revalidatePath("/admin", "layout");
    return { ok: true as const, actorId: actor.id };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Бүртгэл үүсгэхэд алдаа гарлаа.") };
  }
}

export async function setAccountRoleAction(userId: string, role: Role) {
  try {
    const actor = await requireAdmin();
    await setAccountRole(actor.id, userId, role);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function deleteAccountAction(userId: string) {
  try {
    const actor = await requireAdmin();
    await deleteAccount(actor.id, userId);
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error) };
  }
}

export async function setAccountPasswordAction(input: unknown) {
  try {
    await requireAdmin();
    const parsed = accountPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await setAccountPassword(parsed.data.userId, parsed.data.password);
    try {
      revalidatePath("/admin", "layout");
    } catch {
      // Password is already saved; a refresh error must not blank the page.
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Нууц үг солиход алдаа гарлаа.") };
  }
}

export async function changeOwnPasswordAction(password: string) {
  try {
    const user = await requireStaff();
    const parsed = accountPasswordSchema.pick({ password: true }).safeParse({ password });
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Мэдээллээ шалгана уу." };
    }
    await setAccountPassword(user.id, parsed.data.password);
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: errorMessage(error, "Нууц үг солиход алдаа гарлаа.") };
  }
}
