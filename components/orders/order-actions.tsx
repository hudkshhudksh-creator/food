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

  const draft = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, given[item.id] ?? item.quantity]),
      ) as Record<string, number>,
    [given, items],
  );

  const money = items.reduce((sum, item) => sum + (draft[item.id] ?? item.quantity) * item.unitPrice, 0);

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
        items: items.map((item) => ({ itemId: item.id, quantity: draft[item.id] ?? item.quantity })),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Хэрэглэгчид өгсөн. Орлого бүртгэгдлээ.");
      setOpen(false);
      router.refresh();
    });
  }

  if (status === "cancelled") return null;

  if (status === "received") {
    const givenText = items
      .map((item) => {
        const qty = item.givenQuantity ?? item.quantity;
        return `${item.mealName} ${qty} ширхэг`;
      })
      .join(", ");
    return (
      <p className="text-sm font-medium text-emerald-700">
        {employeeStatusMessage(status)}
        {givenText ? <span className="mt-1 block text-xs font-normal text-emerald-800/80">{givenText}</span> : null}
      </p>
    );
  }

  if (status === "new") {
    return (
      <Button
        className="h-11 rounded-xl"
        disabled={pending}
        onClick={() => update("confirmed", "Захиалгыг баталлаа.")}
      >
        {pending ? "Баталж байна..." : "Хэрэглэгчийн захиалгыг батлах"}
      </Button>
    );
  }

  return (
    <>
      <Button className="h-11 rounded-xl" disabled={pending} onClick={() => setOpen(true)}>
        Хэрэглэгчид өгсөн
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogTitle>Хэдэн ширхэг өгсөн бэ?</DialogTitle>
          <DialogDescription>
            Өгсөн тоогоор орлого орно. Захиалснаас цөөн өгвөл үлдсэн порц буцаана.
          </DialogDescription>
          <div className="grid gap-4 py-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.mealName}</p>
                    <p className="text-sm text-slate-500">Захиалсан: {item.quantity} ширхэг</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatMoney((draft[item.id] ?? item.quantity) * item.unitPrice)}
                  </p>
                </div>
                <div className="mt-3">
                  <QuantityStepper
                    min={0}
                    max={item.quantity}
                    value={draft[item.id] ?? item.quantity}
                    onChange={(value) => setGiven((current) => ({ ...current, [item.id]: value }))}
                  />
                </div>
              </div>
            ))}
            <p className="text-sm font-semibold text-slate-900">Орох дүн: {formatMoney(money)}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button type="button" className="h-11 rounded-xl" disabled={pending} onClick={fulfill}>
              {pending ? "Хадгалж байна..." : "Өгсөн гэж тэмдэглэх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
