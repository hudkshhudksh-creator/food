"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fulfillOrderAction, updateOrderStatusAction } from "@/app/actions";
import { QuantityStepper } from "@/components/meals/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { employeeStatusMessage } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { OrderItemView, OrderStatus } from "@/types";

export function OrderActions({
  orderId,
  status,
  items = [],
}: {
  orderId: string;
  status: OrderStatus;
  items?: OrderItemView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [given, setGiven] = useState<Record<string, number>>({});

  function initialGiven(item: OrderItemView) {
    return item.givenQuantity ?? item.quantity;
  }

  const draft = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, given[item.id] ?? initialGiven(item)])) as Record<string, number>,
    [given, items],
  );

  const money = items.reduce((sum, item) => sum + (draft[item.id] ?? initialGiven(item)) * item.unitPrice, 0);

  function setGivenQty(item: OrderItemView, value: number) {
    const next = Math.min(item.quantity, Math.max(0, value));
    setGiven((current) => ({ ...current, [item.id]: next }));
  }

  function update(next: OrderStatus, success: string) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function fulfill() {
    startTransition(async () => {
      const result = await fulfillOrderAction({
        orderId,
        items: items.map((item) => ({ itemId: item.id, quantity: draft[item.id] ?? initialGiven(item) })),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Өгсөн, өгөөгүй тоо хадгалагдлаа.");
      setOpen(false);
      router.refresh();
    });
  }

  if (status === "cancelled") return null;

  if (status === "new") {
    return (
      <Button className="h-11 rounded-xl" disabled={pending} onClick={() => update("confirmed", "Захиалгыг баталлаа.")}>
        {pending ? "Баталж байна..." : "Хэрэглэгчийн захиалгыг батлах"}
      </Button>
    );
  }

  const givenSummary = items
    .map((item) => {
      const qty = item.givenQuantity ?? item.quantity;
      const skipped = item.quantity - qty;
      return `${item.mealName}: ${qty} өгсөн, ${skipped} өгөөгүй`;
    })
    .join(" · ");

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        {status === "received" ? (
          <p className="text-sm font-medium text-emerald-700">
            {employeeStatusMessage(status)}
            {givenSummary ? <span className="mt-1 block text-xs font-normal text-emerald-800/80">{givenSummary}</span> : null}
          </p>
        ) : null}
        <Button className="h-11 rounded-xl" disabled={pending} onClick={() => setOpen(true)}>
          {status === "received" ? "Өгсөн тоог засах" : "Хэрэглэгчид өгсөн"}
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setGiven({});
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogTitle>Өгсөн, өгөөгүй тоо</DialogTitle>
          <DialogDescription>
            Тогооч, админ хоёр өгсөн болон өгөөгүй ширхэгийг энд тохируулна. Өгсөн тоогоор орлого орно.
          </DialogDescription>
          <div className="grid gap-4 py-2">
            {items.map((item) => {
              const givenQty = draft[item.id] ?? initialGiven(item);
              const skipped = item.quantity - givenQty;
              return (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.mealName}</p>
                      <p className="text-sm text-slate-500">Захиалсан: {item.quantity} ширхэг</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{formatMoney(givenQty * item.unitPrice)}</p>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">Өгсөн</p>
                      <QuantityStepper min={0} max={item.quantity} value={givenQty} onChange={(value) => setGivenQty(item, value)} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">Өгөөгүй</p>
                      <QuantityStepper
                        min={0}
                        max={item.quantity}
                        value={skipped}
                        onChange={(value) => setGivenQty(item, item.quantity - value)}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {givenQty} өгсөн · {skipped} өгөөгүй
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="text-sm font-semibold text-slate-900">Орох дүн: {formatMoney(money)}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button type="button" className="h-11 rounded-xl" disabled={pending} onClick={fulfill}>
              {pending ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
