import { notFound } from "next/navigation";
import { CreditPersonDetail } from "@/components/credits/credit-person-detail";
import { PageHeader } from "@/components/shared/page-header";
import { creditPersonKey, groupCredits } from "@/lib/credits";
import { listCredits } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CreditPersonPage({ params }: { params: Promise<{ person: string }> }) {
  const { person } = await params;
  const key = decodeURIComponent(person);
  const people = groupCredits(await listCredits());
  const match = people.find(
    (item) => creditPersonKey(item.lastName, item.firstName, item.branchId) === key,
  );
  if (!match) notFound();

  return (
    <div>
      <PageHeader title="Төлбөрийн задаргаа" description={`${match.lastName} ${match.firstName} · ${match.branchName}`} />
      <CreditPersonDetail
        lastName={match.lastName}
        firstName={match.firstName}
        branchName={match.branchName}
        credits={match.items}
      />
    </div>
  );
}
