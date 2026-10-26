"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addPermissionAction,
  createAccountAction,
  deleteAccountAction,
  removePermissionAction,
  setAccountPasswordAction,
  setAccountRoleAction,
  setPermissionEnabledAction,
  updateAdminSecretAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { AccountView, Branch, Permission, PermissionGroup, Role } from "@/types";

const controlClass = "h-11 rounded-xl px-3";

export function RightsManager({
  secret,
  permissions,
  accounts,
  branches,
  currentUserId,
}: {
  secret: string;
  permissions: Permission[];
  accounts: AccountView[];
  branches: Branch[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftSecret, setDraftSecret] = useState(secret);
  const [filter, setFilter] = useState<"all" | Role>("all");
  const demoEmails = new Set(DEMO_ACCOUNTS.map((item) => item.email));
  const visible = accounts.filter((account) => filter === "all" || account.role === filter);
  const counts = {
    all: accounts.length,
    admin: accounts.filter((item) => item.role === "admin").length,
    cook: accounts.filter((item) => item.role === "cook").length,
    employee: accounts.filter((item) => item.role === "employee").length,
  };

  function run(task: () => Promise<{ ok: boolean; message?: string; secret?: string }>, success: string) {
    startTransition(async () => {
      try {
        const result = await task();
        if (!result.ok) {
          toast.error(result.message ?? "Алдаа гарлаа.");
          return;
        }
        toast.success(success);
        if (result.secret && result.secret !== secret) {
          window.location.assign(`/${result.secret}/rights`);
          return;
        }
        router.refresh();
      } catch {
        toast.error("Алдаа гарлаа. Дахин оролдоно уу.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Хэрэглэгчид</h2>
            <p className="mt-1 text-sm text-slate-500">
              Энд нэмсэн тогооч, хэрэглэгч харагдана. Эрх өгөх, нууц үг солих, хасах.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `Бүгд (${counts.all})`],
                ["admin", `Админ (${counts.admin})`],
                ["cook", `Тогооч (${counts.cook})`],
                ["employee", `Хэрэглэгч (${counts.employee})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={
                  filter === key
                    ? "rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {visible.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Энэ жагсаалтад хэрэглэгч алга. Доороос нэмнэ үү.
            </p>
          ) : null}
          {visible.map((account) => (
            <article key={account.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {fullName(account.lastName, account.firstName)}
                  {demoEmails.has(account.email) ? (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Туршилт
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-slate-500">
                  {account.email}
                  {account.branchName ? ` · ${account.branchName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={
                    account.role === "admin"
                      ? "rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-700"
                      : account.role === "cook"
                        ? "rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                  }
                >
                  {account.role === "admin" ? "Админ" : account.role === "cook" ? "Тогооч" : "Хэрэглэгч"}
                </span>
                {account.role === "employee" ? (
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={pending}
                    onClick={() => run(() => setAccountRoleAction(account.id, "cook"), "Тогоочийн эрх өглөө.")}
                  >
                    Тогоочийн эрх өгөх
                  </Button>
                ) : null}
                {account.role === "cook" ? (
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={pending}
                    onClick={() => run(() => setAccountRoleAction(account.id, "employee"), "Хэрэглэгчийн эрх болголоо.")}
                  >
                    Хэрэглэгчийн эрх болгох
                  </Button>
                ) : null}
                <AccountPasswordButton
                  account={account}
                  pending={pending}
                  onSave={(password) => run(() => setAccountPasswordAction({ userId: account.id, password }), "Нууц үг солигдлоо.")}
                />
                <Button
                  variant="destructive"
                  className="h-10 rounded-xl"
                  disabled={pending || account.id === currentUserId || account.role === "admin"}
                  onClick={() => run(() => deleteAccountAction(account.id), "Бүртгэл хасагдлаа.")}
                >
                  Хасах
                </Button>
              </div>
            </article>
          ))}
        </div>
        <AccountForm branches={branches} pending={pending} onCreate={(input) => run(() => createAccountAction(input), "Бүртгэл нэмэгдлээ.")} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PermissionColumn
          title="Тогоочийн эрх"
          group="cook"
          permissions={permissions.filter((item) => item.group === "cook")}
          pending={pending}
          onToggle={(id, enabled) => run(() => setPermissionEnabledAction(id, enabled), "Эрх шинэчлэгдлээ.")}
          onRemove={(id) => run(() => removePermissionAction(id), "Эрх хасагдлаа.")}
          onAdd={(label) => run(() => addPermissionAction({ label, group: "cook" }), "Эрх нэмэгдлээ.")}
        />
        <PermissionColumn
          title="Хэрэглэгчийн эрх"
          group="employee"
          permissions={permissions.filter((item) => item.group === "employee")}
          pending={pending}
          onToggle={(id, enabled) => run(() => setPermissionEnabledAction(id, enabled), "Эрх шинэчлэгдлээ.")}
          onRemove={(id) => run(() => removePermissionAction(id), "Эрх хасагдлаа.")}
          onAdd={(label) => run(() => addPermissionAction({ label, group: "employee" }), "Эрх нэмэгдлээ.")}
        />
      </div>

      <section className="surface rounded-2xl p-5">
        <h2 className="text-base font-semibold">Нууц самбарын хаяг</h2>
        <p className="mt-1 text-sm text-slate-500">
          Админ болон тогоочийн самбар зөвхөн энэ хаягаар нээгдэнэ. /admin хаяг хаалттай.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800">Одоогийн хаяг: /{secret}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={draftSecret}
            onChange={(event) => setDraftSecret(event.target.value.toLowerCase())}
            className={controlClass}
            aria-label="Нууц хаяг"
          />
          <Button
            className="h-11 rounded-xl"
            disabled={pending}
            onClick={() => run(() => updateAdminSecretAction(draftSecret), "Нууц хаяг солигдлоо.")}
          >
            Хаяг солих
          </Button>
        </div>
      </section>
    </div>
  );
}

function PermissionColumn({
  title,
  group,
  permissions,
  pending,
  onToggle,
  onRemove,
  onAdd,
}: {
  title: string;
  group: PermissionGroup;
  permissions: Permission[];
  pending: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
  onAdd: (label: string) => void;
}) {
  const [label, setLabel] = useState("");
  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-4 grid gap-2">
        {permissions.map((permission) => {
          const locked = group === "cook" && permission.key === "rights";
          return (
            <li key={permission.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">{permission.label}</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || locked}
                  aria-pressed={permission.enabled || locked}
                  onClick={() => onToggle(permission.id, !permission.enabled)}
                  className={
                    permission.enabled || locked
                      ? "rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white"
                      : "rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
                  }
                >
                  {permission.enabled || locked ? "Асаалттай" : "Унтраалттай"}
                </button>
                {permission.builtin ? null : (
                  <button type="button" disabled={pending} onClick={() => onRemove(permission.id)} className="text-xs text-red-600">
                    Хасах
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = label.trim();
          if (!next) return;
          onAdd(next);
          setLabel("");
        }}
      >
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Шинэ эрх" className={controlClass} />
        <Button type="submit" variant="outline" className="h-11 rounded-xl" disabled={pending}>
          Нэмэх
        </Button>
      </form>
    </section>
  );
}

function AccountPasswordButton({
  account,
  pending,
  onSave,
}: {
  account: AccountView;
  pending: boolean;
  onSave: (password: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function submit() {
    const next = password.trim();
    if (next.length < 6) {
      toast.error("Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
      return;
    }
    if (next !== confirm) {
      toast.error("Нууц үг таарахгүй байна.");
      return;
    }
    onSave(next);
    setPassword("");
    setConfirm("");
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" className="h-10 rounded-xl" disabled={pending} onClick={() => setOpen(true)}>
        Нууц үг солих
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPassword("");
            setConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нууц үг солих</DialogTitle>
            <DialogDescription>
              {fullName(account.lastName, account.firstName)} · {account.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <Label htmlFor={`password-${account.id}`}>Шинэ нууц үг</Label>
              <Input
                id={`password-${account.id}`}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={controlClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <Label htmlFor={`confirm-${account.id}`}>Нууц үг дахин</Label>
              <Input
                id={`confirm-${account.id}`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={controlClass}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setOpen(false)}>
              Болих
            </Button>
            <Button type="button" className="h-10 rounded-xl" disabled={pending} onClick={submit}>
              Солих
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountForm({
  branches,
  pending,
  onCreate,
}: {
  branches: Branch[];
  pending: boolean;
  onCreate: (input: {
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    password: string;
    role: "cook" | "employee";
    branchId: string;
  }) => void;
}) {
  const [role, setRole] = useState<"cook" | "employee">("employee");
  return (
    <form
      className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onCreate({
          lastName: String(form.get("lastName") ?? ""),
          firstName: String(form.get("firstName") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          password: String(form.get("password") ?? ""),
          role,
          branchId: String(form.get("branchId") ?? ""),
        });
        event.currentTarget.reset();
        setRole("employee");
      }}
    >
      <h3 className="sm:col-span-2 text-sm font-semibold">Шинэ бүртгэл</h3>
      <Field label="Овог">
        <Input name="lastName" className={controlClass} />
      </Field>
      <Field label="Нэр">
        <Input name="firstName" className={controlClass} />
      </Field>
      <Field label="Имэйл">
        <Input name="email" type="email" className={controlClass} />
      </Field>
      <Field label="Утас">
        <Input name="phone" className={controlClass} />
      </Field>
      <Field label="Нууц үг">
        <Input name="password" type="password" className={controlClass} />
      </Field>
      <Field label="Эрх">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as "cook" | "employee")}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="employee">Хэрэглэгч</option>
          <option value="cook">Тогооч</option>
        </select>
      </Field>
      <Field label="Салбар">
        <select name="branchId" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" defaultValue="">
          <option value="">Салбаргүй</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
          Бүртгэл нэмэх
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
