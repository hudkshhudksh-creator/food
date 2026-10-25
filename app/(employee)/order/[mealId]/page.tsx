import { notFound } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { EmptyState } from "@/components/shared/empty-state";
import { employeeAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBranches, getMeal } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ mealId: string }>;
  searchParams: Promise<{ qty?: string }>;
}) {
  const [{ mealId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) notFound();
  if (!(await employeeAllowed("place_order"))) {
    return <EmptyState title="Хоол захиалах эрх хаалттай байна." />;
  }
  const [meal, branches] = await Promise.all([getMeal(mealId), getBranches()]);
  if (!meal) notFound();
  const quantity = Number(query.qty);
  return (
    <OrderForm
      meal={meal}
      branches={branches}
      user={user}
      initialQuantity={Number.isFinite(quantity) ? quantity : 1}
    />
  );
}
