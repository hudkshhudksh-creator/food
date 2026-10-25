"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { placeOrderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MealImage } from "@/components/shared/meal-image";
import { QuantityStepper } from "@/components/meals/quantity-stepper";
import { formatMoney, mealOrderBlockReason } from "@/lib/format";
import { orderSchema, type OrderFormInput } from "@/lib/validations";
import type { Branch, MealView, SessionUser } from "@/types";

const controlClass = "h-11 w-full rounded-xl px-3";

export function OrderForm({
  meal,
  branches,
  user,
  initialQuantity,
}: {
  meal: MealView;
  branches: Branch[];
  user: SessionUser;
  initialQuantity: number;
}) {
  const router = useRouter();
  const blocked = mealOrderBlockReason(meal);
  const max = Math.max(1, meal.availableQuantity);
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(Math.min(Math.max(initialQuantity, 1), max));

  const form = useForm<OrderFormInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      mealId: meal.id,
      lastName: user.lastName,
      firstName: user.firstName,
      branchId: user.branchId ?? "",
      phone: user.phone,
      quantity,
      note: "",
    },
  });

  const branchId = useWatch({ control: form.control, name: "branchId" });

  function onSubmit(values: OrderFormInput) {
    if (blocked) {
      toast.error(blocked);
      return;
    }
    startTransition(async () => {
      const result = await placeOrderAction({ ...values, quantity });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.push(`/orders/${result.orderNumber}?success=1`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="surface overflow-hidden rounded-[28px]">
        <MealImage src={meal.imageUrl} alt={meal.name} className="aspect-[16/10]" />
        <div className="space-y-2 p-5">
          <h2 className="text-xl font-semibold">{meal.name}</h2>
          {meal.description ? <p className="text-sm leading-6 text-slate-500">{meal.description}</p> : null}
          <p className="text-lg font-semibold text-blue-600">{formatMoney(meal.price)}</p>
          <p className="text-sm text-slate-500">Үлдсэн: {meal.availableQuantity} порц</p>
        </div>
      </section>

      <section className="surface rounded-[28px] p-5 sm:p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Хоол захиалах</h1>
        <div className="mt-5 grid gap-4">
          <FormField label="Овог" required error={form.formState.errors.lastName?.message}>
            <Input className={controlClass} {...form.register("lastName")} />
          </FormField>
          <FormField label="Нэр" required error={form.formState.errors.firstName?.message}>
            <Input className={controlClass} {...form.register("firstName")} />
          </FormField>
          <FormField label="Салбар" required error={form.formState.errors.branchId?.message}>
            <Select
              value={branchId || undefined}
              onValueChange={(value) => form.setValue("branchId", value, { shouldValidate: true })}
            >
              <SelectTrigger className={controlClass}>
                <SelectValue placeholder="Салбар сонгох" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Утасны дугаар" required error={form.formState.errors.phone?.message}>
            <Input className={controlClass} inputMode="tel" placeholder="99112233" {...form.register("phone")} />
          </FormField>
          <FormField label="Тоо ширхэг" required>
            <QuantityStepper value={quantity} max={max} onChange={setQuantity} />
          </FormField>
          <FormField label="Нэмэлт тайлбар" error={form.formState.errors.note?.message}>
            <Textarea className="min-h-24 rounded-xl" placeholder="Жишээ: халуун байлгана уу" {...form.register("note")} />
          </FormField>
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Нэгж үнэ</span>
            <span>{formatMoney(meal.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Тоо</span>
            <span>{quantity}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Нийт</span>
            <span>{formatMoney(meal.price * quantity)}</span>
          </div>
        </div>

        {blocked ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{blocked}</p> : null}
        <Button type="submit" disabled={pending || Boolean(blocked)} className="mt-5 h-12 w-full rounded-xl text-base">
          {pending ? "Илгээж байна..." : "Захиалга баталгаажуулах"}
        </Button>
      </section>
    </form>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
