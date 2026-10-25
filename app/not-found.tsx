import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Хуудас олдсонгүй</h1>
      <p className="mt-2 text-sm text-slate-500">Таны хайсан хуудас байхгүй байна.</p>
      <Button className="mt-5 h-11 rounded-xl" asChild>
        <Link href="/">Нүүр хуудас</Link>
      </Button>
    </div>
  );
}
