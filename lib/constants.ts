import type { OrderStatus } from "@/types";

export const DEMO_ACCOUNTS = [
  {
    role: "admin" as const,
    label: "Админ",
    email: "admin@company.mn",
    password: "Admin123!",
  },
  {
    role: "employee" as const,
    label: "Ажилтан",
    email: "employee@company.mn",
    password: "Employee123!",
  },
];

export const ORDER_STATUS_META: {
  value: OrderStatus;
  label: string;
  className: string;
}[] = [
  { value: "new", label: "Шинэ", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  {
    value: "confirmed",
    label: "Баталгаажсан",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  {
    value: "preparing",
    label: "Бэлтгэж байна",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  { value: "ready", label: "Бэлэн", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  {
    value: "received",
    label: "Хүлээн авсан",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  {
    value: "cancelled",
    label: "Цуцлагдсан",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
];

export function statusMeta(status: OrderStatus) {
  return ORDER_STATUS_META.find((item) => item.value === status) ?? ORDER_STATUS_META[0];
}

export function employeeStatusMessage(status: OrderStatus) {
  if (status === "new") return "Хүлээгдлээ";
  if (status === "received") return "Тогооч хэрэглэгчид өгсөн";
  if (status === "cancelled") return "Захиалга цуцлагдсан";
  return "Захиалга баталсан";
}

export const ADMIN_NAV = [
  { href: "/admin", label: "Хянах самбар", icon: "dashboard", permission: "dashboard" },
  { href: "/admin/meals", label: "Өнөөдрийн хоол", icon: "meal", permission: "meals" },
  { href: "/admin/meals/new", label: "Хоол нэмэх", icon: "plus", permission: "meals" },
  { href: "/admin/orders", label: "Захиалгууд", icon: "orders", permission: "orders" },
  { href: "/admin/branches", label: "Салбарууд", icon: "branches", permission: "branches" },
  { href: "/admin/reports", label: "Тайлан", icon: "reports", permission: "reports" },
  { href: "/admin/rights", label: "Эрх", icon: "rights", permission: "rights" },
  { href: "/admin/settings", label: "Тохиргоо", icon: "settings", permission: "settings" },
] as const;

export const COOK_NAV = [
  { href: "/admin/meals", label: "Өнөөдрийн хоол", icon: "meal", permission: "meals" },
  { href: "/admin/meals/new", label: "Хоол нэмэх", icon: "plus", permission: "meals" },
  { href: "/admin/orders", label: "Захиалгууд", icon: "orders", permission: "orders" },
  { href: "/admin/settings", label: "Тохиргоо", icon: "settings", permission: "settings" },
] as const;

export const EMPLOYEE_NAV = [
  { href: "/", label: "Өнөөдрийн хоол", icon: "meal", permission: "view_menu" },
  { href: "/my-orders", label: "Миний захиалга", icon: "orders", permission: "view_orders" },
  { href: "/help", label: "Тусламж", icon: "help", permission: "" },
] as const;
