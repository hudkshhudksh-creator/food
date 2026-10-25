import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPathProvider } from "@/components/layout/admin-path";
import { AdminMobileBar, AdminSidebar } from "@/components/layout/admin-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminSecret, getSettings } from "@/lib/data";
import { panelHref } from "@/lib/panel-path";
import { isCookPanelPath } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "cook") redirect("/");
  const [settings, secret, headerStore] = await Promise.all([getSettings(), getAdminSecret(), headers()]);
  const path = headerStore.get("x-admin-path") ?? "/admin";
  if (user.role === "cook" && !isCookPanelPath(path)) {
    redirect(panelHref(secret, "/admin/meals"));
  }

  return (
    <AdminPathProvider secret={secret}>
      <div className="min-h-screen lg:flex">
        <AdminSidebar user={user} companyName={settings.companyName} secret={secret} />
        <div className="min-w-0 flex-1">
          <AdminMobileBar user={user} companyName={settings.companyName} secret={secret} />
          <div className="px-4 py-7 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </AdminPathProvider>
  );
}
