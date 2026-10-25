import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export function MealImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-blue-50 text-blue-500", className)}>
        <UtensilsCrossed className="size-10" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
}
