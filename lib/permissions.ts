import { ADMIN_NAV } from "@/lib/constants";
import type { Permission, PermissionGroup } from "@/types";

const COOK = [
  { key: "dashboard", label: "Хянах самбар" },
  { key: "meals", label: "Өнөөдрийн хоол, хоол нэмэх" },
  { key: "orders", label: "Захиалгууд" },
  { key: "branches", label: "Салбарууд" },
  { key: "reports", label: "Тайлан" },
  { key: "settings", label: "Тохиргоо" },
] as const;

const EMPLOYEE = [
  { key: "view_menu", label: "Өнөөдрийн хоол харах" },
  { key: "place_order", label: "Хоол захиалах" },
  { key: "view_orders", label: "Өөрийн захиалга харах" },
] as const;

export function defaultPermissions(): Permission[] {
  return [
    ...COOK.map((item) => ({
      id: `cook-${item.key}`,
      key: item.key,
      label: item.label,
      group: "cook" as const,
      enabled: true,
      builtin: true,
    })),
    ...EMPLOYEE.map((item) => ({
      id: `employee-${item.key}`,
      key: item.key,
      label: item.label,
      group: "employee" as const,
      enabled: true,
      builtin: true,
    })),
  ];
}

export function enabledKeys(permissions: Permission[], group: PermissionGroup) {
  return new Set(
    permissions
      .filter((item) => item.group === group && item.enabled && item.key !== "rights")
      .map((item) => item.key),
  );
}

export function permissionForAdminPath(pathname: string) {
  if (pathname === "/admin") return "dashboard";
  if (pathname.startsWith("/admin/meals")) return "meals";
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/branches")) return "branches";
  if (pathname.startsWith("/admin/reports")) return "reports";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/rights")) return "rights";
  return "dashboard";
}

export function firstCookPath(enabled: Set<string>) {
  return ADMIN_NAV.find((item) => item.permission !== "rights" && enabled.has(item.permission))?.href ?? "/admin/meals";
}

export function isCookPanelPath(pathname: string, enabled: Set<string>) {
  const needed = permissionForAdminPath(pathname);
  if (!needed || needed === "rights") return false;
  return enabled.has(needed);
}
