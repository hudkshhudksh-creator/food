import { formatDateTime, formatPhone } from "@/lib/format";
import { statusMeta } from "@/lib/constants";
import type { OrderView } from "@/types";

function cell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function ordersToCsv(orders: OrderView[]) {
  const header = [
    "Захиалгын №",
    "Овог",
    "Нэр",
    "Утас",
    "Салбар",
    "Хоол",
    "Тоо",
    "Нийт үнэ",
    "Захиалсан цаг",
    "Статус",
    "Тэмдэглэл",
  ];
  const rows = orders.map((order) => {
    const item = order.items[0];
    return [
      order.orderNumber,
      order.customerLastName,
      order.customerFirstName,
      formatPhone(order.customerPhone),
      order.branchName,
      item?.mealName ?? "",
      item?.quantity ?? 0,
      order.totalAmount,
      formatDateTime(order.createdAt),
      statusMeta(order.status).label,
      order.note,
    ];
  });
  const body = [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  return `\uFEFF${body}`;
}
