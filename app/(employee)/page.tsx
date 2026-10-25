import { MealCard } from "@/components/meals/meal-card";
import { EmptyState } from "@/components/shared/empty-state";
import { employeeAllowed } from "@/lib/auth/access";
import { getTodayMeals } from "@/lib/data";
import { formatMongolianDate, todayInUlaanbaatar } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [meals, canView, canOrder] = await Promise.all([
    getTodayMeals(),
    employeeAllowed("view_menu"),
    employeeAllowed("place_order"),
  ]);
  const today = todayInUlaanbaatar();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-600">
          ӨНӨӨДРИЙН ЦЭС
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Өнөөдрийн хоол</h1>
        <p className="mt-2 text-sm text-slate-500">{formatMongolianDate(today)}</p>
      </div>
      {!canView ? (
        <EmptyState title="Өнөөдрийн хоол харах эрх хаалттай байна." />
      ) : meals.length === 0 ? (
        <EmptyState
          title="Өнөөдрийн хоол одоогоор нэмэгдээгүй байна."
          description="Тогооч өнөөдрийн цэсийг нийтэлсний дараа энд харагдана."
        />
      ) : (
        <div className="grid gap-6">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} canOrder={canOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
