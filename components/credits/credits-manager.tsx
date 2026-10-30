"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addCreditAction, deleteCreditAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatMongolianDate, todayInUlaanbaatar } from "@/lib/format";
import type { Branch, Credit } from "@/types";

const controlClass = "h-11 rounded-xl px-3";

export function CreditsManager({ credits, branches }: { credits: Credit[]; branches: Branch[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(credits);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [takenAt, setTakenAt] = useState(todayInUlaanbaatar());
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setRows(credits);
  }, [credits]);

  function resetForm() {
    setLastName("");
    setFirstName("");
    setBranchId(branches[0]?.id ?? "");
    setTakenAt(todayInUlaanbaatar());
    setAmount("");
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addCreditAction({
        lastName,
        firstName,
        branchId,
        takenAt,
        amount: Number(amount),
      });
      if (!result.ok || !("credit" in result) || !result.credit) {
        toast.error(result.message ?? "Зээл нэмэхэд алдаа гарлаа.");
        return;
      }
      setRows((current) => [result.credit, ...current.filter((row) => row.id !== result.credit.id)]);
      toast.success("Зээл нэмэгдлээ.");
      resetForm();
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCreditAction(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
      toast.success("Зээл хасагдлаа.");
      router.refresh();
    });
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="surface grid gap-3 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="sm:col-span-2 lg:col-span-5 text-base font-semibold">Зээл нэмэх</h2>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <Label htmlFor="credit-last-name">Овог</Label>
          <Input id="credit-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={controlClass} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <Label htmlFor="credit-first-name">Нэр</Label>
          <Input id="credit-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={controlClass} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <Label htmlFor="credit-branch">Салбар</Label>
          <select
            id="credit-branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Салбар сонгох</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <Label htmlFor="credit-date">Зээл авсан огноо</Label>
          <Input id="credit-date" type="date" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} className={controlClass} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          <Label htmlFor="credit-amount">Зээлийн хэмжээ (₮)</Label>
          <Input
            id="credit-amount"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={controlClass}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-5">
          <Button type="submit" disabled={pending} className="h-11 rounded-xl">
            {pending ? "Нэмэж байна..." : "Зээл нэмэх"}
          </Button>
        </div>
      </form>

      <section className="surface overflow-hidden rounded-2xl">
        <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Зээл авсан хүмүүс</h2>
            <p className="mt-1 text-sm text-slate-500">Нэмсэн зээл шууд энэ хүснэгтэд харагдана.</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">Нийт: {formatMoney(total)}</p>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">Одоогоор зээл бүртгэгдээгүй байна.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Овог</th>
                  <th className="px-5 py-3 font-medium">Нэр</th>
                  <th className="px-5 py-3 font-medium">Салбар</th>
                  <th className="px-5 py-3 font-medium">Зээл авсан огноо</th>
                  <th className="px-5 py-3 font-medium">Зээлийн хэмжээ</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-900">{row.lastName}</td>
                    <td className="px-5 py-3">{row.firstName}</td>
                    <td className="px-5 py-3">{row.branchName}</td>
                    <td className="px-5 py-3">{formatMongolianDate(row.takenAt)}</td>
                    <td className="px-5 py-3 font-medium">{formatMoney(row.amount)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button type="button" variant="ghost" className="h-9 rounded-xl text-red-600" disabled={pending} onClick={() => remove(row.id)}>
                        Хасах
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
