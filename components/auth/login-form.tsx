"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChefHat, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { loginAction, loginBranchAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({
  next,
  showDemo,
  audience = "employee",
  branches = [],
}: {
  next?: string;
  showDemo: boolean;
  audience?: "cook" | "employee";
  branches?: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"email" | "branch">("email");
  const [branchId, setBranchId] = useState("");
  const [branchPassword, setBranchPassword] = useState("");
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const Icon = audience === "cook" ? ChefHat : UtensilsCrossed;
  const showBranchLogin = audience === "employee";

  function submit(values: LoginInput) {
    setError("");
    startTransition(async () => {
      const result = await loginAction({ ...values, next, audience });
      if (result?.ok === false) {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  function submitBranch(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await loginBranchAction({ branchId, password: branchPassword, next });
      if (result?.ok === false) {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="surface mx-auto w-full max-w-md rounded-[28px] p-6 sm:p-8">
      <div className="mb-7">
        <span
          suppressHydrationWarning
          className="flex size-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.28)]"
        >
          <Icon className="size-5" />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-slate-400">ӨДРИЙН ХООЛ</p>
        <h1 className="mt-1.5 text-[1.7rem] font-semibold tracking-tight text-slate-900">
          {audience === "cook" ? "Админ / тогоочийн нэвтрэлт" : "Нэвтрэх"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {audience === "cook"
            ? "Админ бүгдийг хянана. Тогооч хоол, захиалгатай ажиллана."
            : "Бүртгэлтэй имэйл, нууц үгээр нэвтэрнэ. Тогооч, админ ч эндээс орж болно."}
        </p>
      </div>
      {showBranchLogin ? (
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            className={`h-9 rounded-lg text-sm font-medium ${mode === "email" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            onClick={() => {
              setMode("email");
              setError("");
            }}
          >
            Имэйл
          </button>
          <button
            type="button"
            className={`h-9 rounded-lg text-sm font-medium ${mode === "branch" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            onClick={() => {
              setMode("branch");
              setError("");
            }}
          >
            Салбар
          </button>
        </div>
      ) : null}
      {mode === "branch" && showBranchLogin ? (
        <form onSubmit={submitBranch} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="branch">Салбар</Label>
            {branches.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Тогооч салбарын нууц үг тохируулаагүй байна.
              </p>
            ) : (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branch" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Салбар сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch-password">Нууц үг</Label>
            <Input
              id="branch-password"
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-xl"
              value={branchPassword}
              onChange={(event) => setBranchPassword(event.target.value)}
            />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" disabled={pending || branches.length === 0} className="mt-1 h-12 rounded-xl text-base">
            {pending ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </Button>
        </form>
      ) : (
        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Имэйл</Label>
            <Input id="email" type="email" autoComplete="email" className="h-11 rounded-xl" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-xs text-red-600">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Нууц үг</Label>
            <Input id="password" type="password" autoComplete="current-password" className="h-11 rounded-xl" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" disabled={pending} className="mt-1 h-12 rounded-xl text-base">
            {pending ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </Button>
        </form>
      )}
      {showDemo && mode === "email" ? (
        <div className="mt-7 space-y-2 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Туршилтын бүртгэл</p>
          {DEMO_ACCOUNTS.filter((account) =>
            audience === "cook" ? account.role === "admin" : account.role === "employee",
          ).map(
            (account) => (
              <button
                key={account.email}
                type="button"
                disabled={pending}
                onClick={() => {
                  form.setValue("email", account.email);
                  form.setValue("password", account.password);
                  submit({ email: account.email, password: account.password });
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 text-left text-sm transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <span>
                  <span className="block font-medium text-slate-800">{account.label}</span>
                  <span className="text-slate-500">{account.email}</span>
                </span>
                <span className="text-sm font-medium text-blue-600">Нэвтрэх</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
