import { eachDate, formatMonthLabel, formatShortDate, todayInUlaanbaatar, toUlaanbaatarDate } from "@/lib/format";
import type {
  Branch,
  BranchStat,
  DailyAdjustment,
  DailyPoint,
  Meal,
  MealStat,
  MealView,
  MonthlyPoint,
  Order,
  OrderItem,
  OrderStatus,
  OrderView,
} from "@/types";

const OPEN_STATUSES = new Set(["new", "confirmed", "preparing", "ready", "received"]);

export function isCounted(order: { status: OrderStatus }) {
  return OPEN_STATUSES.has(order.status);
}

export function itemGivenQuantity(
  item: { quantity: number; givenQuantity?: number | null },
  status: OrderStatus,
) {
  if (item.givenQuantity != null) return item.givenQuantity;
  return status === "received" ? item.quantity : 0;
}

export function orderOrderedPortions(order: OrderView) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function orderGivenPortions(order: OrderView) {
  return order.items.reduce((sum, item) => sum + itemGivenQuantity(item, order.status), 0);
}

export function portionLabel(order: OrderView) {
  const ordered = orderOrderedPortions(order);
  const given = orderGivenPortions(order);
  if (order.status === "received") {
    return given === ordered ? `${given} өгсөн` : `${given}/${ordered} өгсөн`;
  }
  return `${ordered} порц`;
}

export function orderRevenue(order: OrderView) {
  if (order.status !== "received") return 0;
  return order.items.reduce((sum, item) => sum + itemGivenQuantity(item, order.status) * item.unitPrice, 0);
}

export function toOrderViews(
  orders: Order[],
  items: OrderItem[],
  meals: Meal[],
  branches: Branch[],
): OrderView[] {
  const mealName = new Map(meals.map((meal) => [meal.id, meal.name]));
  const branchName = new Map(branches.map((branch) => [branch.id, branch.name]));
  return orders
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      branchId: order.branchId,
      branchName: branchName.get(order.branchId) ?? order.branchName ?? "Салбар",
      totalAmount: order.totalAmount,
      status: order.status,
      note: order.note,
      customerLastName: order.customerLastName,
      customerFirstName: order.customerFirstName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: items
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          id: item.id,
          mealId: item.mealId,
          mealName: mealName.get(item.mealId) ?? item.mealName ?? "Хоол",
          quantity: item.quantity,
          givenQuantity: item.givenQuantity ?? null,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function withOrderedQuantity(meals: Meal[], items: OrderItem[], orders: Order[]): MealView[] {
  const countedOrders = new Set(orders.filter(isCounted).map((order) => order.id));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  return meals.map((meal) => ({
    ...meal,
    orderedQuantity: items
      .filter((item) => item.mealId === meal.id && countedOrders.has(item.orderId))
      .reduce((sum, item) => {
        const order = orderById.get(item.orderId);
        if (!order) return sum;
        const qty = order.status === "received" ? itemGivenQuantity(item, order.status) : item.quantity;
        return sum + qty;
      }, 0),
  }));
}

export function branchStats(views: OrderView[], branches: Branch[]): BranchStat[] {
  const active = views.filter((order) => isCounted(order));
  return branches
    .filter((branch) => branch.isActive)
    .map((branch) => {
      const rows = active.filter((order) => order.branchId === branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        orders: rows.length,
        portions: rows.reduce((sum, order) => {
          const given = orderGivenPortions(order);
          return sum + (given > 0 ? given : orderOrderedPortions(order));
        }, 0),
        revenue: rows.reduce((sum, order) => sum + orderRevenue(order), 0),
      };
    })
    .sort((a, b) => b.portions - a.portions);
}

export function summarize(views: OrderView[]) {
  const active = views.filter((order) => order.status !== "cancelled");
  return {
    totalOrders: active.length,
    totalPortions: active.reduce((sum, order) => sum + orderOrderedPortions(order), 0),
    givenPortions: active.reduce((sum, order) => sum + orderGivenPortions(order), 0),
    totalRevenue: active.reduce((sum, order) => sum + orderRevenue(order), 0),
  };
}

export function applyDailyAdjustment<
  T extends { totalOrders: number; totalPortions: number; givenPortions: number; totalRevenue: number },
>(base: T, adjustment?: DailyAdjustment | null): T {
  if (!adjustment) return base;
  return {
    ...base,
    totalOrders: adjustment.totalOrders ?? base.totalOrders,
    totalPortions: adjustment.totalPortions ?? base.totalPortions,
    givenPortions: adjustment.givenPortions ?? base.givenPortions,
    totalRevenue: adjustment.totalRevenue ?? base.totalRevenue,
  };
}

export function overlayMonthly(points: MonthlyPoint[], views: OrderView[], adjustments: DailyAdjustment[]) {
  for (const adjustment of adjustments) {
    const key = adjustment.date.slice(0, 7);
    const point = points.find((item) => item.month === key);
    if (!point) continue;
    const raw = summarize(views.filter((order) => toUlaanbaatarDate(order.createdAt) === adjustment.date));
    const next = applyDailyAdjustment(raw, adjustment);
    point.orders += next.totalOrders - raw.totalOrders;
    point.givenPortions += next.givenPortions - raw.givenPortions;
    point.revenue += next.totalRevenue - raw.totalRevenue;
  }
  return points;
}

export function overlayDaily(points: DailyPoint[], adjustments: DailyAdjustment[]) {
  return points.map((point) => {
    const adjustment = adjustments.find((item) => item.date === point.date);
    if (!adjustment) return point;
    return {
      ...point,
      orders: adjustment.totalOrders ?? point.orders,
      portions: adjustment.givenPortions ?? point.portions,
      revenue: adjustment.totalRevenue ?? point.revenue,
    };
  });
}

export function dailySeries(views: OrderView[], from: string, to: string): DailyPoint[] {
  return eachDate(from, to).map((date) => {
    const rows = views.filter((order) => order.status !== "cancelled" && toUlaanbaatarDate(order.createdAt) === date);
    return {
      date,
      label: formatShortDate(date),
      orders: rows.length,
      portions: rows.reduce((sum, order) => sum + orderGivenPortions(order), 0),
      revenue: rows.reduce((sum, order) => sum + orderRevenue(order), 0),
    };
  });
}

export function monthlySeries(views: OrderView[], months = 12, today = todayInUlaanbaatar()): MonthlyPoint[] {
  const end = today.slice(0, 7);
  let [year, month] = end.split("-").map(Number);
  const points: MonthlyPoint[] = [];
  for (let index = 0; index < months; index += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const rows = views.filter(
      (order) => order.status !== "cancelled" && toUlaanbaatarDate(order.createdAt).startsWith(key),
    );
    points.push({
      month: key,
      label: formatMonthLabel(key),
      orders: rows.length,
      givenPortions: rows.reduce((sum, order) => sum + orderGivenPortions(order), 0),
      revenue: rows.reduce((sum, order) => sum + orderRevenue(order), 0),
    });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return points;
}

export function topMeals(views: OrderView[]): MealStat[] {
  const map = new Map<string, MealStat>();
  for (const order of views.filter((item) => item.status === "received")) {
    for (const item of order.items) {
      const qty = itemGivenQuantity(item, order.status);
      const current = map.get(item.mealName) ?? { name: item.mealName, quantity: 0, revenue: 0 };
      current.quantity += qty;
      current.revenue += qty * item.unitPrice;
      map.set(item.mealName, current);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
}
