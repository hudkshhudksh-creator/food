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
    listAccounts().catch(() => []),
    getBranches(true).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Хэрэглэгч, эрх"
        description="Тогооч, хэрэглэгч нэмэх. Зөвхөн үндсэн админ бусад админ эрх нэмж, хасна."
      />
      <RightsManager
        secret={secret}
        permissions={permissions}
        accounts={accounts}
        branches={branches}
        currentUserId={user.id}
        currentUserEmail={user.email}
      />
    </div>
  );
}
