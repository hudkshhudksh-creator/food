import { SettingsForms } from "@/components/settings/settings-forms";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "cook") redirect("/");
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="Тохиргоо" description="Профайл, нууц үг болон системийн үндсэн мэдээлэл" />
      <SettingsForms user={user} settings={settings} />
    </div>
  );
}
