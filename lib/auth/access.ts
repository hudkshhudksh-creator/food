import { AppError } from "@/lib/errors";
import { requireAdmin, requireStaff, requireUser } from "@/lib/auth/current-user";
import { getPermissions } from "@/lib/data";
import { enabledKeys } from "@/lib/permissions";

const ADMIN_ONLY = new Set(["rights", "reports"]);

export async function cookEnabledSet() {
  return enabledKeys(await getPermissions(), "cook");
}

export async function cookAllowed(permission: string) {
  if (ADMIN_ONLY.has(permission)) return false;
  const enabled = await cookEnabledSet();
  return enabled.has(permission);
}

export async function employeeAllowed(permission: string) {
  const permissions = await getPermissions();
  const item = permissions.find(
    (permissionItem) => permissionItem.group === "employee" && permissionItem.key === permission,
  );
  return item ? item.enabled : true;
}

export async function requireCook(permission: string) {
  if (ADMIN_ONLY.has(permission)) {
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
