import { LoginForm } from "@/components/auth/login-form";
import { isDemoLoginVisible } from "@/lib/config";
import { getAdminSecret, getBranches } from "@/lib/data";
import { isPanelPath } from "@/lib/panel-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const secret = await getAdminSecret();
  const audience = params.next && isPanelPath(params.next, secret) ? "cook" : "employee";
  const branches =
    audience === "employee"
      ? (await getBranches()).filter((branch) => branch.hasPassword).map((branch) => ({ id: branch.id, name: branch.name }))
      : [];
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16),transparent_52%),linear-gradient(180deg,#eef3f9_0%,#f5f7fb_46%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden px-4 lg:block">
            <p className="text-sm font-semibold tracking-[0.18em] text-blue-600">ӨДРИЙН ХООЛ</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-tight text-slate-900">
              Байгууллагын хоол захиалгыг цэвэр, нэг дор
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
              Өнөөдрийн цэс, захиалга, салбарын тоймыг нэг системээр. Ажилтан захиална, тогооч батална.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-slate-600">
              <li className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Өнөөдрийн хоолыг шууд захиалах
              </li>
              <li className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Захиалгын төлөв бодит цагт шинэчлэгдэнэ
              </li>
              <li className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Салбар бүрийн порцыг нэг дор харна
              </li>
            </ul>
          </div>
          <LoginForm next={params.next} showDemo={isDemoLoginVisible()} audience={audience} branches={branches} />
        </div>
      </div>
    </main>
  );
}
