"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_NAV } from "@/lib/constants";
import { initials } from "@/lib/format";
import { firstCookPath } from "@/lib/permissions";
import { panelHref } from "@/lib/panel-path";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const icons = {
  dashboard: LayoutDashboard,
  meal: Utensils,
  plus: PlusCircle,
  orders: ClipboardList,
  branches: Building2,
  reports: ChartColumn,
  rights: Shield,
  settings: Settings,
};

function isActive(href: string, pathname: string, secret: string) {
  const current = panelHref(secret, href);
  if (href === "/admin") return pathname === current;
  if (href === "/admin/meals") return pathname === current;
  return pathname === current || pathname.startsWith(`${current}/`);
}

function navItems(role: SessionUser["role"], allowed: string[]) {
  return ADMIN_NAV.filter((item) => {
    if (role === "admin") return true;
    if (item.permission === "rights") return false;
    return allowed.includes(item.permission);
  });
}

function NavLinks({
  secret,
  role,
  allowed,
  onNavigate,
}: {
  secret: string;
  role: SessionUser["role"];
  allowed: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItems(role, allowed);
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(item.href, pathname, secret);
        return (
          <Link
            key={item.href}
            href={panelHref(secret, item.href)}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition",
              active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function roleLabel(role: SessionUser["role"]) {
  if (role === "admin") return "Админ";
  if (role === "cook") return "Тогооч";
  return "Хэрэглэгч";
}

export function AdminSidebar({
  user,
  companyName,
  secret,
  allowed,
}: {
  user: SessionUser;
  companyName: string;
  secret: string;
  allowed: string[];
}) {
  const home = user.role === "admin" ? "/admin" : firstCookPath(new Set(allowed));
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white px-4 py-6 lg:flex">
      <Link href={panelHref(secret, home)} className="mb-8 flex items-center gap-3 px-2">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-[0_6px_16px_rgba(59,130,246,0.25)]">
          <UtensilsCrossed className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-wide text-slate-900">{companyName}</span>
          <span className="text-xs text-slate-400">{user.role === "admin" ? "Админ самбар" : "Тогоочийн самбар"}</span>
        </span>
      </Link>
      <NavLinks secret={secret} role={user.role} allowed={allowed} />
      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
        <div className="flex items-center gap-3 px-1">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
            {initials(user.lastName, user.firstName)}
          </span>
          <span>
            <p className="text-sm font-medium text-slate-800">
              {user.lastName} {user.firstName}
            </p>
            <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
          </span>
        </div>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-800"
          >
            <LogOut className="size-4" />
            Гарах
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AdminMobileBar({
  user,
  companyName,
  secret,
  allowed,
}: {
  user: SessionUser;
  companyName: string;
  secret: string;
  allowed: string[];
}) {
  const home = user.role === "admin" ? "/admin" : firstCookPath(new Set(allowed));
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:hidden">
      <Link href={panelHref(secret, home)} className="text-sm font-semibold">
        {companyName}
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="size-10" aria-label="Цэс">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>{companyName}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <NavLinks secret={secret} role={user.role} allowed={allowed} />
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="size-4" />
                Гарах
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
