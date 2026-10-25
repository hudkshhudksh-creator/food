"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Алдаа гарлаа</h1>
      <p className="mt-2 text-sm text-slate-500">Дахин оролдоно уу.</p>
      <Button className="mt-5 h-11 rounded-xl" onClick={reset}>
        Дахин ачаалах
      </Button>
    </div>
  );
}
