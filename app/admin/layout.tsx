import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPathProvider } from "@/components/layout/admin-path";
import { AdminMobileBar, AdminSidebar } from "@/components/layout/admin-sidebar";
import { cookEnabledSet } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminSecret, getSettings } from "@/lib/data";
import { panelHref } from "@/lib/panel-path";
import { firstCookPath, isCookPanelPath } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "cook") redirect("/");
  const [settings, secret, headerStore, cookAllowedKeys] = await Promise.all([
    getSettings(),
    getAdminSecret(),
    headers(),
    cookEnabledSet(),
  ]);
  const path = headerStore.get("x-admin-path") ?? "/admin";
  const allowed = [...cookAllowedKeys];
  if (user.role === "cook" && !isCookPanelPath(path, cookAllowedKeys)) {
    const home = firstCookPath(cookAllowedKeys);
    const alreadyHome = path === home || (home !== "/admin" && path.startsWith(`${home}/`));
    if (!alreadyHome || isCookPanelPath(home, cookAllowedKeys)) {
      redirect(panelHref(secret, home));
    }
  }

  return (
    <AdminPathProvider secret={secret}>
      <div className="min-h-screen lg:flex">
        <AdminSidebar user={user} companyName={settings.companyName} secret={secret} allowed={allowed} />
        <div className="min-w-0 flex-1">
          <AdminMobileBar user={user} companyName={settings.companyName} secret={secret} allowed={allowed} />
          <div className="px-4 py-7 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </AdminPathProvider>
  );
}
