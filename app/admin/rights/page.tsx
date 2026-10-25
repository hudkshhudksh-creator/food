import { RightsManager } from "@/components/settings/rights-manager";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminSecret, getBranches, getPermissions, listAccounts } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  const [secret, permissions, accounts, branches] = await Promise.all([
    getAdminSecret(),
    getPermissions(),
    listAccounts(),
    getBranches(true),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Эрх"
        description="Зөвхөн админ тогооч, хэрэглэгчийн эрхийг нэмж хасна."
      />
      <RightsManager
        secret={secret}
        permissions={permissions}
        accounts={accounts}
        branches={branches}
        currentUserId={user.id}
      />
    </div>
  );
}
