import { AppError } from "@/lib/errors";
import { requireAdmin, requireStaff, requireUser } from "@/lib/auth/current-user";
import { getPermissions } from "@/lib/data";

const COOK_KEYS = new Set(["meals", "orders"]);

export async function cookAllowed(permission: string) {
  const permissions = await getPermissions();
  const item = permissions.find((permissionItem) => permissionItem.group === "cook" && permissionItem.key === permission);
  return item ? item.enabled : false;
}

export async function employeeAllowed(permission: string) {
  const permissions = await getPermissions();
  const item = permissions.find(
    (permissionItem) => permissionItem.group === "employee" && permissionItem.key === permission,
  );
  return item ? item.enabled : true;
}

export async function requireCook(permission: string) {
  if (!COOK_KEYS.has(permission)) {
    return requireAdmin();
  }
  const user = await requireStaff();
  if (user.role === "admin") return user;
  if (!(await cookAllowed(permission))) throw new AppError("FORBIDDEN");
  return user;
}

export async function requireEmployeePermission(permission: string) {
  const user = await requireUser();
  if (!(await employeeAllowed(permission))) throw new AppError("FORBIDDEN");
  return user;
}
