"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/80">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-xl"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Хасах"
      >
        <Minus className="size-4" />
      </Button>
      <span className="w-10 text-center text-base font-semibold">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-xl"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Нэмэх"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
