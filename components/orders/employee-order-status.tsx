import { employeeStatusMessage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export function EmployeeOrderStatus({ status }: { status: OrderStatus }) {
  const message = employeeStatusMessage(status);
  return (
    <p
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        status === "new" && "bg-amber-50 text-amber-800",
        status === "received" && "bg-emerald-50 text-emerald-800",
        status === "cancelled" && "bg-red-50 text-red-700",
        status !== "new" && status !== "received" && status !== "cancelled" && "bg-blue-50 text-blue-800",
      )}
    >
      {message}
    </p>
  );
}
