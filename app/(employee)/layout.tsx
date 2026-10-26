import { redirect } from "next/navigation";
import { EmployeeBottomNav, EmployeeHeader } from "@/components/layout/employee-header";
import { cookEnabledSet, employeeAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { EMPLOYEE_NAV } from "@/lib/constants";
import { getAdminSecret, getSettings } from "@/lib/data";
import { firstCookPath } from "@/lib/permissions";
import { panelHref } from "@/lib/panel-path";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin" || user.role === "cook") {
    const [secret, cookKeys] = await Promise.all([getAdminSecret(), cookEnabledSet()]);
    redirect(panelHref(secret, user.role === "admin" ? "/admin" : firstCookPath(cookKeys)));
  }
  const [settings, canViewMenu, canViewOrders] = await Promise.all([
    getSettings(),
    employeeAllowed("view_menu"),
    employeeAllowed("view_orders"),
  ]);
  const items = EMPLOYEE_NAV.filter((item) => {
    if (item.permission === "view_menu") return canViewMenu;
    if (item.permission === "view_orders") return canViewOrders;
    return true;
  });

  return (
    <div className="min-h-screen">
      <EmployeeHeader user={user} companyName={settings.companyName} items={items} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 md:py-10">{children}</main>
      <EmployeeBottomNav items={items} />
    </div>
  );
}
