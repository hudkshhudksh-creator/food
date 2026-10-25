import { BranchManager } from "@/components/branches/branch-manager";
import { PageHeader } from "@/components/shared/page-header";
import { getBranches } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const branches = await getBranches(true);
  return (
    <div>
      <PageHeader
        title="Салбарууд"
        description="Салбар нэмэх, хасах, салбар бүрт нууц үг тохируулах."
      />
      <BranchManager branches={branches} />
    </div>
  );
}
