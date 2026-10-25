import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-80 w-full rounded-3xl" />
    </div>
  );
}
