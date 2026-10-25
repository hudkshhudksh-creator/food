import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta(status);
  return (
    <Badge variant="outline" className={cn("h-6 rounded-full px-2.5 font-medium ring-1", meta.className)}>
      {meta.label}
    </Badge>
  );
}
