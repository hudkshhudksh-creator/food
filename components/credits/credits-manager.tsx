"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addCreditAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePanelHref } from "@/components/layout/admin-path";
import { creditPersonKey, groupCredits } from "@/lib/credits";
import { formatMoney, todayInUlaanbaatar } from "@/lib/format";
import type { Branch, Credit } from "@/types";

const controlClass = "h-11 rounded-xl px-3";

export function CreditsManager({ credits, branches }: { credits: Credit[]; branches: Branch[] }) {
  const router = useRouter();
  const href = usePanelHref();
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

  const people = useMemo(() => groupCredits(rows), [rows]);
  const total = people.reduce((sum, person) => sum + person.total, 0);

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
            <p className="mt-1 text-sm text-slate-500">Хүн дээр дараад төлбөрийн задаргааг харна.</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">Нийт: {formatMoney(total)}</p>
        </div>
        {people.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">Одоогоор зээл бүртгэгдээгүй байна.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Овог</th>
                  <th className="px-5 py-3 font-medium">Нэр</th>
                  <th className="px-5 py-3 font-medium">Салбар</th>
                  <th className="px-5 py-3 font-medium">Нийт дүн</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => {
                  const personHref = href(
                    `/admin/credits/${encodeURIComponent(creditPersonKey(person.lastName, person.firstName, person.branchId))}`,
                  );
                  return (
                    <tr
                      key={person.key}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                      onClick={() => router.push(personHref)}
                    >
                      <td className="px-5 py-3 font-medium text-slate-900">{person.lastName}</td>
                      <td className="px-5 py-3">{person.firstName}</td>
                      <td className="px-5 py-3">{person.branchName}</td>
                      <td className="px-5 py-3 font-semibold">{formatMoney(person.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
