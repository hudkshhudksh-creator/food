"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, HandPlatter, Utensils, Wallet } from "lucide-react";
import { clearDailyAdjustmentAction, saveDailyAdjustmentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";

const controlClass = "h-11 rounded-xl";

export function DailyStatsEditor({
  date,
  canEdit,
  stats,
}: {
  date: string;
  canEdit: boolean;
  stats: {
    totalOrders: number;
    totalPortions: number;
    givenPortions: number;
    totalRevenue: number;
    activeMeals: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const cards = [
    { key: "totalOrders", label: "Нийт захиалга", value: String(stats.totalOrders), icon: ClipboardList },
    { key: "totalPortions", label: "Захиалсан порц", value: String(stats.totalPortions), icon: HandPlatter },
    { key: "givenPortions", label: "Өгсөн порц", value: String(stats.givenPortions), icon: HandPlatter },
    { key: "totalRevenue", label: "Орлого", value: formatMoney(stats.totalRevenue), icon: Wallet },
    { key: "activeMeals", label: "Идэвхтэй хоол", value: String(stats.activeMeals), icon: Utensils },
  ] as const;

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await saveDailyAdjustmentAction({
        date,
        totalOrders: Number(formData.get("totalOrders")),
        totalPortions: Number(formData.get("totalPortions")),
        givenPortions: Number(formData.get("givenPortions")),
        totalRevenue: Number(formData.get("totalRevenue")),
        activeMeals: Number(formData.get("activeMeals")),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Өдрийн тоо хадгалагдлаа.");
      setEditing(false);
      router.refresh();
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await clearDailyAdjustmentAction(date);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Автомат тоо руу буцаалаа.");
      setEditing(false);
      router.refresh();
    });
  }

  if (!canEdit || !editing) {
    return (
      <section className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        </div>
        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setEditing(true)}>
              Өдрийн тоог засах
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <form action={save} className="surface space-y-4 rounded-2xl p-5">
      <div>
        <h2 className="text-base font-semibold">Өдрийн тоо засах</h2>
        <p className="mt-1 text-sm text-slate-500">Орлого, порц, захиалгын тоог админ энд засаж болно.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Нийт захиалга" name="totalOrders" defaultValue={stats.totalOrders} />
        <Field label="Захиалсан порц" name="totalPortions" defaultValue={stats.totalPortions} />
        <Field label="Өгсөн порц" name="givenPortions" defaultValue={stats.givenPortions} />
        <Field label="Орлого (₮)" name="totalRevenue" defaultValue={stats.totalRevenue} />
        <Field label="Идэвхтэй хоол" name="activeMeals" defaultValue={stats.activeMeals} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="h-11 rounded-xl">
          Хадгалах
        </Button>
        <Button type="button" variant="outline" disabled={pending} className="h-11 rounded-xl" onClick={reset}>
          Автомат тоо
        </Button>
        <Button type="button" variant="ghost" disabled={pending} className="h-11 rounded-xl" onClick={() => setEditing(false)}>
          Болих
        </Button>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" min={0} step={1} defaultValue={defaultValue} className={controlClass} />
    </label>
  );
}
