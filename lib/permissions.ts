import type { Permission } from "@/types";

const COOK = [
  { key: "dashboard", label: "Хянах самбар" },
  { key: "meals", label: "Хоол нэмэх, засах" },
  { key: "orders", label: "Захиалга харах, батлах" },
  { key: "branches", label: "Салбар удирдах" },
  { key: "reports", label: "Тайлан харах" },
  { key: "settings", label: "Тохиргоо" },
  { key: "rights", label: "Эрх тохируулах" },
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

export function permissionForAdminPath(pathname: string) {
  if (pathname === "/admin") return "dashboard";
  if (pathname.startsWith("/admin/meals")) return "meals";
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/branches")) return "branches";
  if (pathname.startsWith("/admin/reports")) return "reports";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/rights")) return null;
  return "dashboard";
}

const COOK_PAGES = [
  ["dashboard", "/admin"],
  ["meals", "/admin/meals"],
  ["orders", "/admin/orders"],
  ["branches", "/admin/branches"],
  ["reports", "/admin/reports"],
  ["settings", "/admin/settings"],
  ["rights", "/admin/rights"],
] as const;

export function firstCookPath(enabled: Set<string>) {
  return COOK_PAGES.find((item) => enabled.has(item[0]))?.[1] ?? "/admin/rights";
}

export function isCookPanelPath(pathname: string) {
  return (
    pathname.startsWith("/admin/meals") ||
    pathname.startsWith("/admin/orders") ||
    pathname.startsWith("/admin/settings")
  );
}
