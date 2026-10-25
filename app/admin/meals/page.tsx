import Link from "next/link";
import { MealActions } from "@/components/meals/meal-actions";
import { MealImage } from "@/components/shared/meal-image";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getAdminSecret, getMeals } from "@/lib/data";
import { panelHref } from "@/lib/panel-path";
import { formatMoney, todayInUlaanbaatar } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const [meals, secret] = await Promise.all([getMeals(), getAdminSecret()]);
  const today = todayInUlaanbaatar();
  const todays = meals.filter((meal) => meal.mealDate === today);
  const others = meals.filter((meal) => meal.mealDate !== today);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Өнөөдрийн хоол"
        description="Идэвхтэй цэс, үлдэгдэл болон захиалсан порц"
        action={
          <Button className="h-11 rounded-xl" asChild>
            <Link href={panelHref(secret, "/admin/meals/new")}>Хоол нэмэх</Link>
          </Button>
        }
      />
      {todays.length === 0 ? (
        <EmptyState
          title="Өнөөдрийн хоол одоогоор нэмэгдээгүй байна."
          action={
            <Button className="h-11 rounded-xl" asChild>
              <Link href={panelHref(secret, "/admin/meals/new")}>Өнөөдрийн хоол нэмэх</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {todays.map((meal) => (
            <MealPanel key={meal.id} meal={meal} />
          ))}
        </div>
      )}
      {others.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Бусад өдрийн хоол</h2>
          <div className="grid gap-3">
            {others.map((meal) => (
              <MealPanel key={meal.id} meal={meal} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MealPanel({ meal }: { meal: Awaited<ReturnType<typeof getMeals>>[number] }) {
  return (
    <article className="surface grid gap-4 rounded-2xl p-4 md:grid-cols-[180px_1fr]">
      <MealImage src={meal.imageUrl} alt={meal.name} className="h-36 rounded-xl md:h-full" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{meal.name}</h3>
            <p className="text-sm text-slate-500">{meal.mealDate}</p>
          </div>
          <span className={meal.isActive ? "text-sm text-emerald-600" : "text-sm text-slate-400"}>
            {meal.isActive ? "Идэвхтэй" : "Идэвхгүй"}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Үнэ" value={formatMoney(meal.price)} />
          <Stat label="Үлдсэн" value={`${meal.availableQuantity}`} />
          <Stat label="Захиалсан" value={`${meal.orderedQuantity}`} />
        </dl>
        <MealActions meal={meal} />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
