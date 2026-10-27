import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportCharts } from "@/components/dashboard/report-charts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminSecret, getReport } from "@/lib/data";
import { panelHref } from "@/lib/panel-path";
import { formatMoney, formatMongolianDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGES = [
  { value: "day", label: "Өнөөдөр" },
  { value: "week", label: "7 хоног" },
  { value: "month", label: "Сар" },
] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  const params = await searchParams;
  const range = params.range === "week" || params.range === "month" ? params.range : "day";
  const [report, secret] = await Promise.all([getReport(range), getAdminSecret()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тайлан"
        description={`${formatMongolianDate(report.from)} – ${formatMongolianDate(report.to)}`}
        action={
          <Button className="h-11 rounded-xl" asChild>
            <a href={`/api/orders/export?range=${range}`}>CSV татах</a>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <Link
            key={item.value}
            href={`${panelHref(secret, "/admin/reports")}?range=${item.value}`}
            className={cn(
              "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600",
              range === item.value && "border-blue-200 bg-blue-50 text-blue-600",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <Summary label="Захиалга" value={String(report.totalOrders)} />
        <Summary label="Өгсөн порц" value={String(report.givenPortions)} />
        <Summary label="Орлого" value={formatMoney(report.totalRevenue)} />
      </section>
      <ReportCharts report={report} />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
