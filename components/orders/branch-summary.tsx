import { formatMoney } from "@/lib/format";
import type { BranchStat } from "@/types";

export function BranchSummary({ rows }: { rows: BranchStat[] }) {
  const totals = rows.reduce(
    (sum, row) => ({
      orders: sum.orders + row.orders,
      portions: sum.portions + row.portions,
      revenue: sum.revenue + row.revenue,
    }),
    { orders: 0, portions: 0, revenue: 0 },
  );

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Салбарын тойм</h2>
        <p className="mt-1 text-sm text-slate-500">Салбар бүрээр бэлтгэх порцын тоо</p>
      </div>
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Салбар</th>
              <th className="px-5 py-3 font-medium">Захиалга</th>
              <th className="px-5 py-3 font-medium">Порц</th>
              <th className="px-5 py-3 font-medium">Нийт дүн</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branchId} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-800">{row.branchName}</td>
                <td className="px-5 py-3">{row.orders}</td>
                <td className="px-5 py-3">{row.portions}</td>
                <td className="px-5 py-3">{formatMoney(row.revenue)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <td className="px-5 py-3">Нийт</td>
              <td className="px-5 py-3">{totals.orders}</td>
              <td className="px-5 py-3">{totals.portions}</td>
              <td className="px-5 py-3">{formatMoney(totals.revenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((row) => (
          <div key={row.branchId} className="rounded-xl border border-slate-100 p-4">
            <p className="font-medium text-slate-900">{row.branchName}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Захиалга</p>
                <p className="font-semibold">{row.orders}</p>
              </div>
              <div>
                <p className="text-slate-500">Порц</p>
                <p className="font-semibold">{row.portions}</p>
              </div>
              <div>
                <p className="text-slate-500">Дүн</p>
                <p className="font-semibold">{formatMoney(row.revenue)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
