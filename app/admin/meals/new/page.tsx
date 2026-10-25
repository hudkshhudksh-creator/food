import { MealForm } from "@/components/meals/meal-form";

export const dynamic = "force-dynamic";

export default function NewMealPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Захиалгын систем</h1>
        <p className="mt-1 text-sm text-slate-500">Өнөөдрийн хоолны зураг, нэр, үнэ болон порцыг оруулна.</p>
      </div>
      <MealForm />
    </div>
  );
}
