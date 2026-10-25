"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveMealAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MealImage } from "@/components/shared/meal-image";
import { usePanelHref } from "@/components/layout/admin-path";
import { todayInUlaanbaatar } from "@/lib/format";
import { mealSchema, type MealFormInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types";

const controlClass = "h-11 rounded-xl px-3";

export function MealForm({ meal }: { meal?: Meal }) {
  const router = useRouter();
  const href = usePanelHref();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl ?? "");
  const [linkDraft, setLinkDraft] = useState(meal?.imageUrl?.startsWith("http") ? meal.imageUrl : "");

  const form = useForm<MealFormInput>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      name: meal?.name ?? "",
      description: meal?.description ?? "",
      imageUrl: meal?.imageUrl ?? "",
      price: meal?.price ?? 15000,
      availableQuantity: meal?.availableQuantity ?? 100,
      mealDate: meal?.mealDate ?? todayInUlaanbaatar(),
      isActive: meal?.isActive ?? true,
    },
  });

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !data.url) {
        toast.error(data.message ?? "Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу.");
        return;
      }
      setImageUrl(data.url);
      form.setValue("imageUrl", data.url);
      toast.success("Зураг байршлаа.");
    } catch {
      toast.error("Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: MealFormInput) {
    startTransition(async () => {
      const result = await saveMealAction({ ...values, imageUrl }, meal?.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(meal ? "Хоол шинэчлэгдлээ." : "Хоол нийтлэгдлээ.");
      router.push(href("/admin/meals"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="surface rounded-[28px] p-5 sm:p-8">
        <Tabs defaultValue="upload">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 sm:w-auto">
            <TabsTrigger value="upload" className="h-9 rounded-lg px-3 text-xs sm:text-sm">
              Цэсний зургийг байршуулах
            </TabsTrigger>
            <TabsTrigger value="link" className="h-9 rounded-lg px-3 text-xs sm:text-sm">
              Одоо байгаа холбоосоос
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void upload(file);
              }}
              className={cn(
                "flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition",
                dragOver && "border-blue-500 bg-blue-50",
              )}
            >
              {imageUrl ? (
                <MealImage src={imageUrl} alt="Хоолны зураг" className="mb-4 h-40 w-full max-w-sm rounded-xl" />
              ) : (
                <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm">
                  {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
                </span>
              )}
              <span className="text-base font-medium text-slate-800">Цэсний зургийг байршуулах</span>
              <span className="mt-1 text-sm text-slate-500">Чирээд тавь эсвэл байршуулахын тулд товшино уу</span>
              <span className="mt-3 text-xs text-slate-400">JPG, JPEG, PNG, WEBP · 5MB хүртэл</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </TabsContent>
          <TabsContent value="link" className="mt-5 space-y-3">
            <Label htmlFor="image-link">Зургийн холбоос</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="image-link"
                value={linkDraft}
                onChange={(event) => setLinkDraft(event.target.value)}
                placeholder="https://"
                className={controlClass}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setImageUrl(linkDraft.trim());
                  form.setValue("imageUrl", linkDraft.trim());
                }}
              >
                Холбох
              </Button>
            </div>
            {imageUrl ? <MealImage src={imageUrl} alt="Холбоос зураг" className="h-48 w-full rounded-xl" /> : null}
          </TabsContent>
        </Tabs>
      </div>

      <div className="surface grid gap-4 rounded-[28px] p-5 sm:p-8">
        <Field label="Хоолны нэр" required error={form.formState.errors.name?.message}>
          <Input className={controlClass} placeholder="Бууз + салат" {...form.register("name")} />
        </Field>
        <Field label="Хоолны тайлбар" error={form.formState.errors.description?.message}>
          <Textarea
            className="min-h-24 rounded-xl px-3"
            placeholder="10 ширхэг гар хийцийн бууз, шинэ ногооны салат"
            {...form.register("description")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Үнэ" required error={form.formState.errors.price?.message}>
            <Input type="number" min={1} className={controlClass} {...form.register("price")} />
          </Field>
          <Field label="Боломжит порц" required error={form.formState.errors.availableQuantity?.message}>
            <Input type="number" min={0} className={controlClass} {...form.register("availableQuantity")} />
          </Field>
          <Field label="Огноо" required error={form.formState.errors.mealDate?.message}>
            <Input type="date" className={controlClass} {...form.register("mealDate")} />
          </Field>
        </div>
        <Button type="submit" disabled={pending || uploading} className="h-11 rounded-xl text-base sm:w-fit sm:px-8">
          {pending ? "Хадгалж байна..." : meal ? "Хадгалах" : "Хоол нийтлэх"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}
