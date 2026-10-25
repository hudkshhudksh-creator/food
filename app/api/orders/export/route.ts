import { cookAllowed } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ordersToCsv } from "@/lib/csv";
import { getOrders } from "@/lib/data";
import { rangeFor, todayInUlaanbaatar } from "@/lib/format";
import type { OrderStatus } from "@/types";

export const runtime = "nodejs";

const STATUSES = new Set(["new", "confirmed", "preparing", "ready", "received", "cancelled"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !(await cookAllowed("reports"))) {
    return new Response("Эрх хүрэлцэхгүй.", { status: 401 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range");
  const status = url.searchParams.get("status") ?? "";
  const bounds = range === "day" || range === "week" || range === "month" ? rangeFor(range) : null;

  const dateParam = url.searchParams.get("date");
  const orders = await getOrders({
    date: bounds || dateParam === "all" ? undefined : dateParam || todayInUlaanbaatar(),
    from: bounds?.from,
    to: bounds?.to,
    branchId: url.searchParams.get("branchId") || undefined,
    status: STATUSES.has(status) ? (status as OrderStatus) : "",
    query: url.searchParams.get("q") || undefined,
  });

  const filename = `zahialga-${bounds?.from ?? url.searchParams.get("date") ?? todayInUlaanbaatar()}.csv`;
  return new Response(ordersToCsv(orders), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
