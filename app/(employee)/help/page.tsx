import { getSettings } from "@/lib/data";
import { formatPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const settings = await getSettings();
  const items = [
    {
      title: "Хэрхэн захиалах вэ?",
      body: "Өнөөдрийн хоолноос тоо ширхэгээ сонгоод «Захиалах» товчийг дарна. Овог, нэр, салбар, утас оруулаад захиалгаа баталгаажуулна.",
    },
    {
      title: "Порц хүрэлцэхгүй бол яах вэ?",
      body: "Үлдсэн порцоос олон захиалах боломжгүй. Тоо ширхэгээ багасгаад дахин оролдоно уу.",
    },
    {
      title: "Захиалгаа хаана харах вэ?",
      body: "«Миний захиалга» хуудаснаас өөрийн захиалгын дугаар, төлөв, үнийг харна.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Тусламж</h1>
      <p className="mt-2 text-sm text-slate-500">
        Асуух зүйл гарвал {settings.supportPhone ? formatPhone(settings.supportPhone) : "тогоочид"} хандана уу.
      </p>
      <div className="mt-7 grid gap-3">
        {items.map((item) => (
          <article key={item.title} className="surface rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
