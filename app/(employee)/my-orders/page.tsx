import Link from "next/link";
import { redirect } from "next/navigation";
import { EmployeeOrderStatus } from "@/components/orders/employee-order-status";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { employeeAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrders } from "@/lib/data";
import { formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await employeeAllowed("view_orders"))) {
    return (
      <div>
        <h1 className="mb-7 text-[1.65rem] font-semibold tracking-tight text-slate-900">Миний захиалга</h1>
        <EmptyState title="Өөрийн захиалга харах эрх хаалттай байна." />
      </div>
    );
  }
  const orders = await getOrders({ userId: user.id });

  return (
    <div>
      <LiveRefresh />
      <h1 className="mb-7 text-[1.65rem] font-semibold tracking-tight text-slate-900">Миний захиалга</h1>
      {orders.length === 0 ? (
        <EmptyState title="Одоогоор захиалга бүртгэгдээгүй байна." />
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.orderNumber}`}
              className="surface rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-blue-200"
            >
              <div>
                <p className="font-semibold">{order.items.map((item) => item.mealName).join(", ")}</p>
                <p className="mt-1 text-sm text-slate-500">{order.orderNumber}</p>
              </div>
              <div className="mt-3">
                <EmployeeOrderStatus status={order.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>{order.branchName}</span>
                <span>
                  {order.status === "received"
                    ? `${order.items.reduce((sum, item) => sum + (item.givenQuantity ?? item.quantity), 0)} өгсөн, ${order.items.reduce((sum, item) => sum + (item.quantity - (item.givenQuantity ?? item.quantity)), 0)} өгөөгүй`
                    : `${order.items.reduce((sum, item) => sum + item.quantity, 0)} порц`}
                </span>
                <span className="font-medium text-slate-900">{formatMoney(order.totalAmount)}</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
