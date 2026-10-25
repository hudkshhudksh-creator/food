import { notFound } from "next/navigation";
import { MealForm } from "@/components/meals/meal-form";
import { getMeal } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meal = await getMeal(id);
  if (!meal) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Хоол засах</h1>
        <p className="mt-1 text-sm text-slate-500">{meal.name}</p>
      </div>
      <MealForm meal={meal} />
    </div>
  );
}
