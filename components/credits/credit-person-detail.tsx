"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteCreditAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { usePanelHref } from "@/components/layout/admin-path";
import { creditsByMonth } from "@/lib/credits";
import { formatMoney, formatMongolianDate, formatMonthLabel } from "@/lib/format";
import type { Credit } from "@/types";

export function CreditPersonDetail({
  lastName,
  firstName,
  branchName,
  credits,
}: {
  lastName: string;
  firstName: string;
  branchName: string;
  credits: Credit[];
}) {
  const router = useRouter();
  const href = usePanelHref();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(credits);

  useEffect(() => {
    setRows(credits);
  }, [credits]);

  const months = useMemo(() => creditsByMonth(rows), [rows]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCreditAction(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const next = rows.filter((row) => row.id !== id);
      setRows(next);
      toast.success("Зээл хасагдлаа.");
      if (next.length === 0) {
        router.push(href("/admin/credits"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" className="h-10 rounded-xl" asChild>
        <Link href={href("/admin/credits")}>Буцах</Link>
      </Button>
      <section className="surface rounded-2xl p-5">
        <p className="text-sm text-slate-500">{branchName}</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {lastName} {firstName}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-900">Нийт зээл: {formatMoney(total)}</p>
      </section>
      {months.map((group) => (
        <section key={group.month} className="surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">{formatMonthLabel(group.month)}</h3>
            <p className="text-sm font-semibold">{formatMoney(group.total)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Огноо</th>
                <th className="px-5 py-3 font-medium">Дүн</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">{formatMongolianDate(item.takenAt)}</td>
                  <td className="px-5 py-3 font-medium">{formatMoney(item.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button type="button" variant="ghost" className="h-9 rounded-xl text-red-600" disabled={pending} onClick={() => remove(item.id)}>
                      Хасах
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
