"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeOwnPasswordAction, updateProfileAction, updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppSettings, SessionUser } from "@/types";

const controlClass = "h-11 rounded-xl";

export function SettingsForms({
  user,
  settings,
}: {
  user: SessionUser;
  settings: AppSettings;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function saveProfile(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (password || confirm) {
      if (password.length < 6) {
        toast.error("Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
        return;
      }
      if (password !== confirm) {
        toast.error("Нууц үг таарахгүй байна.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateProfileAction({
        lastName: String(formData.get("lastName") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (password) {
        const passResult = await changeOwnPasswordAction(password);
        if (!passResult.ok) {
          toast.error(passResult.message);
          return;
        }
      }
      toast.success(password ? "Профайл болон нууц үг хадгалагдлаа." : "Профайл хадгалагдлаа.");
      router.refresh();
    });
  }

  function saveSettings(formData: FormData) {
    startTransition(async () => {
      const result = await updateSettingsAction({
        companyName: String(formData.get("companyName") ?? ""),
        supportPhone: String(formData.get("supportPhone") ?? ""),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Тохиргоо хадгалагдлаа.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={saveProfile} className="surface space-y-4 rounded-2xl p-5">
        <h2 className="text-base font-semibold">Профайл</h2>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Овог</Label>
          <Input id="lastName" name="lastName" defaultValue={user.lastName} className={controlClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="firstName">Нэр</Label>
          <Input id="firstName" name="firstName" defaultValue={user.firstName} className={controlClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Утас</Label>
          <Input id="phone" name="phone" defaultValue={user.phone} className={controlClass} />
        </div>
        <p className="text-sm text-slate-500">{user.email}</p>
        <div className="grid gap-2">
          <Label htmlFor="password">Шинэ нууц үг</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" className={controlClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Нууц үг дахин</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className={controlClass} />
        </div>
        <p className="text-xs text-slate-400">Нууц үг солихгүй бол хоосон үлдээнэ.</p>
        <Button type="submit" disabled={pending} className="h-11 rounded-xl">
          Хадгалах
        </Button>
      </form>
      <form action={saveSettings} className="surface space-y-4 rounded-2xl p-5">
        <h2 className="text-base font-semibold">Систем</h2>
        <div className="grid gap-2">
          <Label htmlFor="companyName">Байгууллагын нэр</Label>
          <Input id="companyName" name="companyName" defaultValue={settings.companyName} className={controlClass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supportPhone">Тусламжийн утас</Label>
          <Input id="supportPhone" name="supportPhone" defaultValue={settings.supportPhone} className={controlClass} />
        </div>
        <Button type="submit" disabled={pending} className="h-11 rounded-xl">
          Хадгалах
        </Button>
      </form>
    </div>
  );
}
