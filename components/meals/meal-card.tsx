"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MealImage } from "@/components/shared/meal-image";
import { QuantityStepper } from "@/components/meals/quantity-stepper";
import { formatMoney, mealOrderBlockReason } from "@/lib/format";
import type { MealView } from "@/types";

export function MealCard({ meal, canOrder = true }: { meal: MealView; canOrder?: boolean }) {
  const router = useRouter();
  const blocked = mealOrderBlockReason(meal);
  const max = Math.max(meal.availableQuantity, 0);
  const [quantity, setQuantity] = useState(1);

  return (
    <article className="surface overflow-hidden rounded-[28px]">
      <div className="grid grid-cols-[108px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative min-h-[168px] overflow-hidden sm:min-h-[220px] md:min-h-64">
          <MealImage src={meal.imageUrl} alt={meal.name} className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-6">
          <div>
            <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">{meal.name}</h2>
            {meal.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{meal.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Нэг порц</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-600">{formatMoney(meal.price)}</p>
            </div>
            <span
              className={
                meal.availableQuantity <= 0
                  ? "rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600"
                  : meal.availableQuantity <= 10
                    ? "rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700"
                    : "rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
              }
            >
              Үлдсэн: {meal.availableQuantity} порц
            </span>
          </div>
          {blocked ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{blocked}</p> : null}
          {canOrder ? (
            <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <QuantityStepper value={quantity} max={Math.max(max, 1)} onChange={setQuantity} />
              <Button
                className="h-12 flex-1 rounded-xl text-base"
                disabled={Boolean(blocked)}
                onClick={() => router.push(`/order/${meal.id}?qty=${quantity}`)}
              >
                Захиалах
              </Button>
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Хоол захиалах эрх хаалттай байна.</p>
          )}
        </div>
      </div>
    </article>
  );
}
