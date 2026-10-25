"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePanelHref } from "@/components/layout/admin-path";
import { OrderActions } from "@/components/orders/order-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ORDER_STATUS_META } from "@/lib/constants";
import { portionLabel } from "@/lib/data/present";
import { formatDateTime, formatMoney, formatPhone, fullName } from "@/lib/format";
import type { Branch, OrderView } from "@/types";

export function OrderFilters({
  date,
  branchId,
  status,
  query,
  branches,
}: {
  date: string;
  branchId: string;
  status: string;
  query: string;
  branches: Branch[];
}) {
  const router = useRouter();
  const href = usePanelHref();
  const [dateValue, setDateValue] = useState(date);
  const [branchValue, setBranchValue] = useState(branchId || "all");
  const [statusValue, setStatusValue] = useState(status || "all");
  const [queryValue, setQueryValue] = useState(query);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (dateValue) params.set("date", dateValue);
    if (branchValue !== "all") params.set("branchId", branchValue);
    if (statusValue !== "all") params.set("status", statusValue);
    if (queryValue.trim()) params.set("q", queryValue.trim());
    router.push(`${href("/admin/orders")}?${params.toString()}`);
  }

  const exportParams = new URLSearchParams();
  exportParams.set("date", date || "all");
  if (branchId) exportParams.set("branchId", branchId);
  if (status) exportParams.set("status", status);
  if (query) exportParams.set("q", query);

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
      <Input
        type="date"
        value={dateValue}
        onChange={(event) => setDateValue(event.target.value)}
        aria-label="Огноо"
        className="h-11 rounded-xl"
      />
      <Select value={branchValue} onValueChange={setBranchValue}>
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue placeholder="Салбар" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Бүх салбар</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusValue} onValueChange={setStatusValue}>
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Бүх статус</SelectItem>
          {ORDER_STATUS_META.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={queryValue}
        onChange={(event) => setQueryValue(event.target.value)}
        placeholder="Хайх"
        aria-label="Хайх"
        className="h-11 rounded-xl"
      />
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1 rounded-xl">
          Хайх
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" asChild>
          <a href={`/api/orders/export?${exportParams.toString()}`}>CSV</a>
        </Button>
      </div>
    </form>
  );
}

export function OrdersTable({ orders }: { orders: OrderView[] }) {
  if (orders.length === 0) {
    return <EmptyState title="Одоогоор захиалга бүртгэгдээгүй байна." />;
  }

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Захиалгын №", "Овог нэр", "Салбар", "Хоол", "Тоо", "Нийт үнэ", "Захиалсан цаг", "Статус", "Үйлдэл"].map(
                (head) => (
                  <th key={head} className="px-4 py-3 font-medium whitespace-nowrap">
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <p>{fullName(order.customerLastName, order.customerFirstName)}</p>
                  <p className="text-xs text-slate-500">{formatPhone(order.customerPhone)}</p>
                </td>
                <td className="px-4 py-3">{order.branchName}</td>
                <td className="px-4 py-3">{order.items.map((item) => item.mealName).join(", ")}</td>
                <td className="px-4 py-3">{portionLabel(order)}</td>
                <td className="px-4 py-3">{formatMoney(order.totalAmount)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <OrderActions orderId={order.id} status={order.status} items={order.items} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-slate-600">{fullName(order.customerLastName, order.customerFirstName)}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Салбар</dt>
                <dd>{order.branchName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Хоол</dt>
                <dd>{order.items.map((item) => item.mealName).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Тоо</dt>
                <dd>{portionLabel(order)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Нийт үнэ</dt>
                <dd>{formatMoney(order.totalAmount)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
            <div className="mt-3">
              <OrderActions orderId={order.id} status={order.status} items={order.items} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
