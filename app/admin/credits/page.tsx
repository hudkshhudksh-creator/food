import { CreditsManager } from "@/components/credits/credits-manager";
import { PageHeader } from "@/components/shared/page-header";
import { getBranches, listCredits } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const [credits, branches] = await Promise.all([listCredits(), getBranches(true)]);
  return (
    <div>
      <PageHeader title="Зээл" description="Зээл авсан хүний овог, нэр, салбар, огноо, дүнг бүртгэнэ." />
      <CreditsManager credits={credits} branches={branches.filter((branch) => branch.isActive)} />
    </div>
  );
}
