import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { EmployeeOrderStatus } from "@/components/orders/employee-order-status";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrderByNumber } from "@/lib/data";
import { formatDateTime, formatMoney, fullName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const [{ orderNumber }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) notFound();
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  if (!order) notFound();
  if (user.role !== "admin" && user.role !== "cook" && order.userId !== user.id) notFound();
  const success = query.success === "1";
  const item = order.items[0];

  return (
    <div className="mx-auto max-w-xl">
      <LiveRefresh />
      <div className="surface rounded-[28px] p-6 sm:p-8">
        <div className="mb-6">
          <EmployeeOrderStatus status={order.status} />
        </div>
        {success ? (
          <div className="mb-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-3 text-2xl font-semibold">Захиалга амжилттай бүртгэгдлээ.</h1>
          </div>
        ) : (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Захиалгын дэлгэрэнгүй</h1>
          </div>
        )}
        <dl className="space-y-3 text-sm">
          <Row label="Захиалгын дугаар" value={order.orderNumber} />
          <Row label="Хоол" value={item?.mealName ?? "—"} />
          <Row label="Захиалсан тоо" value={String(item?.quantity ?? 0)} />
          {order.status === "received" ? (
            <Row label="Өгсөн тоо" value={String(item?.givenQuantity ?? item?.quantity ?? 0)} />
          ) : null}
          <Row label="Нийт үнэ" value={formatMoney(order.totalAmount)} />
          <Row label="Овог нэр" value={fullName(order.customerLastName, order.customerFirstName)} />
          <Row label="Салбар" value={order.branchName} />
          <Row label="Захиалсан огноо" value={formatDateTime(order.createdAt)} />
          {order.note ? <Row label="Тайлбар" value={order.note} /> : null}
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button className="h-11 rounded-xl" asChild>
            <Link href="/">Нүүр хуудас</Link>
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" asChild>
            <Link href="/my-orders">Миний захиалга</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
