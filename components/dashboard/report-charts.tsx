"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";
import type { ReportData } from "@/types";

const COLORS = ["#3b82f6", "#60a5fa", "#2563eb", "#93c5fd", "#1d4ed8"];

export function ReportCharts({ report }: { report: ReportData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Захиалгын тоо">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={report.daily}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [value ?? 0, "Захиалга"]} />
            <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Орлого">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={report.daily}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [formatMoney(Number(value ?? 0)), "Орлого"]} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Салбараар">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={report.byBranch} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="branchName" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [value ?? 0, "Захиалга"]} />
            <Bar dataKey="orders" radius={[0, 8, 8, 0]}>
              {report.byBranch.map((entry, index) => (
                <Cell key={entry.branchId} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold">Хамгийн их захиалсан хоол</h3>
        {report.topMeals.length === 0 ? (
          <p className="text-sm text-slate-500">Одоогоор захиалга бүртгэгдээгүй байна.</p>
        ) : (
          <ul className="space-y-3">
            {report.topMeals.map((meal, index) => (
              <li key={meal.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                    {index + 1}
                  </span>
                  {meal.name}
                </span>
                <span className="text-slate-500">
                  {meal.quantity} порц · {formatMoney(meal.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}
