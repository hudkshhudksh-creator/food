import { BranchSummary } from "@/components/orders/branch-summary";
import { OrderFilters, OrdersTable } from "@/components/orders/orders-manager";
import { PageHeader } from "@/components/shared/page-header";
import { getBranches, getDashboard, getOrders } from "@/lib/data";
import { todayInUlaanbaatar } from "@/lib/format";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "confirmed", "preparing", "ready", "received", "cancelled"]);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const date = params.date === undefined ? todayInUlaanbaatar() : params.date;
  const status = STATUSES.has(params.status ?? "") ? (params.status as OrderStatus) : "";
  const [orders, branches, summary] = await Promise.all([
    getOrders({
      date: date || undefined,
      branchId: params.branchId,
      status,
      query: params.q,
    }),
    getBranches(true),
    getDashboard(date || todayInUlaanbaatar()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Захиалгууд" description="Салбар, огноо, статусаар шүүж, CSV татна." />
      <OrderFilters
        date={date}
        branchId={params.branchId ?? ""}
        status={status}
        query={params.q ?? ""}
        branches={branches}
      />
      <BranchSummary rows={summary.branchSummary} />
      <OrdersTable orders={orders} />
    </div>
  );
}
