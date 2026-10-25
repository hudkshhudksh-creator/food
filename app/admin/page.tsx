import { ClipboardList, HandPlatter, Utensils, Wallet } from "lucide-react";
import { BranchSummary } from "@/components/orders/branch-summary";
import { OrderActions } from "@/components/orders/order-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAdminSecret, getDashboard } from "@/lib/data";
import { portionLabel } from "@/lib/data/present";
import { panelHref } from "@/lib/panel-path";
import { formatDateTime, formatMoney, formatMongolianDate, formatPhone, fullName, todayInUlaanbaatar } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayInUlaanbaatar();
  const [stats, secret] = await Promise.all([getDashboard(date), getAdminSecret()]);
  const cards = [
    { label: "Нийт захиалга", value: String(stats.totalOrders), icon: ClipboardList },
    { label: "Захиалсан порц", value: String(stats.totalPortions), icon: HandPlatter },
    { label: "Өгсөн порц", value: String(stats.givenPortions), icon: HandPlatter },
    { label: "Орлого", value: formatMoney(stats.totalRevenue), icon: Wallet },
    { label: "Идэвхтэй хоол", value: String(stats.activeMeals), icon: Utensils },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Өдрийн захиалгын тойм"
        description={formatMongolianDate(date)}
        action={
          <form className="flex gap-2" action={panelHref(secret, "/admin")}>
            <Input type="date" name="date" defaultValue={date} aria-label="Огноо" className="h-11 w-44 rounded-xl bg-white" />
            <Button type="submit" className="h-11 rounded-xl">
              Харах
            </Button>
          </form>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article key={card.label} className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <card.icon className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-[1.75rem] font-semibold tracking-tight text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>
      <section className="surface overflow-hidden rounded-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Сарын тойм</h2>
          <p className="mt-1 text-sm text-slate-500">Сар бүрт ирсэн захиалга, өгсөн порц, орсон төгрөг.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Сар</th>
                <th className="px-5 py-3 font-medium">Захиалга</th>
                <th className="px-5 py-3 font-medium">Өгсөн порц</th>
                <th className="px-5 py-3 font-medium">Орлого</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthly.map((row) => (
                <tr key={row.month} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-5 py-3">{row.orders}</td>
                  <td className="px-5 py-3">{row.givenPortions}</td>
                  <td className="px-5 py-3 font-medium">{formatMoney(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <BranchSummary rows={stats.branchSummary} />
      <section className="surface rounded-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Сүүлийн захиалга</h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">Одоогоор захиалга бүртгэгдээгүй байна.</p>
        ) : (
          <ul>
            {stats.recentOrders.map((order) => {
              return (
                <li key={order.id} className="border-t border-slate-100 px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{fullName(order.customerLastName, order.customerFirstName)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-base font-semibold text-slate-900">
                        {order.items
                          .map((item) =>
                            order.status === "received"
                              ? `${item.mealName} · ${item.givenQuantity ?? item.quantity} өгсөн`
                              : `${item.mealName} · ${item.quantity} порц`,
                          )
                          .join(", ")}
                      </p>
                      <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">Салбар</dt>
                          <dd>{order.branchName}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Утас</dt>
                          <dd>{formatPhone(order.customerPhone)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Захиалсан</dt>
                          <dd>{formatDateTime(order.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Нийт</dt>
                          <dd className="font-medium text-slate-900">
                            {formatMoney(order.totalAmount)} · {portionLabel(order)}
                          </dd>
                        </div>
                      </dl>
                      {order.note ? <p className="text-sm text-slate-500">Тайлбар: {order.note}</p> : null}
                    </div>
                    <OrderActions orderId={order.id} status={order.status} items={order.items} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
