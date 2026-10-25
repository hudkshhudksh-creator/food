"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMealAction, setMealActiveAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePanelHref } from "@/components/layout/admin-path";
import type { MealView } from "@/types";

export function MealActions({ meal }: { meal: MealView }) {
  const router = useRouter();
  const href = usePanelHref();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setMealActiveAction(meal.id, !meal.isActive);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(meal.isActive ? "Хоол идэвхгүй боллоо." : "Хоол идэвхжлээ.");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMealAction(meal.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Хоол устгагдлаа.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-10 rounded-xl" asChild>
        <Link href={href(`/admin/meals/${meal.id}/edit`)}>Засах</Link>
      </Button>
      <Button variant="outline" className="h-10 rounded-xl" disabled={pending} onClick={toggle}>
        {meal.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
      </Button>
      <Button variant="destructive" className="h-10 rounded-xl" onClick={() => setOpen(true)}>
        Устгах
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Хоол устгах уу?</DialogTitle>
            <DialogDescription>Энэ хоолыг устгана. Захиалгатай байсан ч устгана.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              Устгах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
