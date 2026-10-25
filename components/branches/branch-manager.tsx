"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  clearBranchPasswordAction,
  deleteBranchAction,
  saveBranchAction,
  setBranchActiveAction,
  setBranchPasswordAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Branch } from "@/types";

const controlClass = "h-11 rounded-xl px-3";

export function BranchManager({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<Branch | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function resetForm() {
    setEditing(null);
    setName("");
    setAddress("");
    setLoginEmail("");
    setPassword("");
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBranchAction(
        { name, address, loginEmail, isActive: editing?.isActive ?? true, password: editing ? "" : password },
        editing?.id,
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editing ? "Салбар шинэчлэгдлээ." : "Салбар нэмэгдлээ.");
      resetForm();
      router.refresh();
    });
  }

  function toggle(branch: Branch) {
    startTransition(async () => {
      const result = await setBranchActiveAction(branch.id, !branch.isActive);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  function remove(branch: Branch) {
    startTransition(async () => {
      const result = await deleteBranchAction(branch.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Салбар устгагдлаа.");
      router.refresh();
    });
  }

  function savePassword(branch: Branch) {
    const nextPassword = drafts[branch.id]?.trim() ?? "";
    startTransition(async () => {
      const result = await setBranchPasswordAction({ branchId: branch.id, password: nextPassword });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(branch.hasPassword ? "Нууц үг солигдлоо." : "Нууц үг нэмэгдлээ.");
      setDrafts((current) => ({ ...current, [branch.id]: "" }));
      router.refresh();
    });
  }

  function clearPassword(branch: Branch) {
    startTransition(async () => {
      const result = await clearBranchPasswordAction(branch.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Нууц үг хасагдлаа.");
      setDrafts((current) => ({ ...current, [branch.id]: "" }));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={save} className="surface h-fit space-y-4 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Plus className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">{editing ? "Салбар засах" : "Салбар нэмэх"}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Салбар нэмж, хасаж, нэвтрэх имэйл болон нууц үг тохируулна.
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="branch-name">Нэр</Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={controlClass}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="branch-address">Хаяг</Label>
          <Input
            id="branch-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={controlClass}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="branch-login-email">Нэвтрэх имэйл</Label>
          <Input
            id="branch-login-email"
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            className={controlClass}
            placeholder="salbar@company.mn"
          />
        </div>
        {editing ? null : (
          <div className="grid gap-2">
            <Label htmlFor="branch-password">Нууц үг (сонголттой)</Label>
            <Input
              id="branch-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={controlClass}
              placeholder="Хамгийн багадаа 6 тэмдэгт"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="h-11 flex-1 rounded-xl">
            {editing ? "Хадгалах" : "Нэмэх"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={resetForm}>
              Болих
            </Button>
          ) : null}
        </div>
      </form>

      <div className="grid gap-3">
        {branches.length === 0 ? (
          <div className="surface rounded-2xl p-8 text-center text-sm text-slate-500">
            Одоогоор салбар алга. Зүүн талаас нэмнэ үү.
          </div>
        ) : null}
        {branches.map((branch) => (
          <article key={branch.id} className="surface rounded-2xl p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{branch.name}</p>
                    <span className={branch.isActive ? "text-xs font-medium text-emerald-600" : "text-xs text-slate-400"}>
                      {branch.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                    </span>
                    <span
                      className={
                        branch.hasPassword
                          ? "rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {branch.hasPassword ? "Нууц үгтэй" : "Нууц үггүй"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{branch.address || "Хаяг оруулаагүй"}</p>
                  {branch.loginEmail ? (
                    <p className="mt-0.5 text-sm text-slate-600">Нэвтрэх: {branch.loginEmail}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-amber-700">Нэвтрэх имэйл тохируулаагүй</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg"
                    onClick={() => {
                      setEditing(branch);
                      setName(branch.name);
                      setAddress(branch.address);
                      setLoginEmail(branch.loginEmail ?? "");
                      setPassword("");
                    }}
                  >
                    Засах
                  </Button>
                  <Button type="button" variant="outline" className="h-9 rounded-lg" disabled={pending} onClick={() => toggle(branch)}>
                    {branch.isActive ? "Идэвхгүй" : "Идэвхжүүлэх"}
                  </Button>
                  <Button type="button" variant="destructive" className="h-9 rounded-lg" disabled={pending} onClick={() => remove(branch)}>
                    Устгах
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50/80 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <KeyRound className="size-4 text-slate-400" />
                  {branch.hasPassword ? "Нууц үг солих / хасах" : "Нууц үг нэмэх"}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    value={drafts[branch.id] ?? ""}
                    onChange={(event) => setDrafts((current) => ({ ...current, [branch.id]: event.target.value }))}
                    className={controlClass}
                    placeholder={branch.hasPassword ? "Шинэ нууц үг" : "Нууц үг оруулах"}
                  />
                  <Button
                    type="button"
                    className="h-11 rounded-xl"
                    disabled={pending}
                    onClick={() => savePassword(branch)}
                  >
                    {branch.hasPassword ? "Солих" : "Нэмэх"}
                  </Button>
                  {branch.hasPassword ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl"
                      disabled={pending}
                      onClick={() => clearPassword(branch)}
                    >
                      Хасах
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
