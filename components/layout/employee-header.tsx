"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ClipboardList, LogOut, UtensilsCrossed } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EMPLOYEE_NAV } from "@/lib/constants";
import { fullName, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const icons = {
  meal: UtensilsCrossed,
  orders: ClipboardList,
  help: CircleHelp,
};

type NavItem = (typeof EMPLOYEE_NAV)[number];

export function EmployeeHeader({
  user,
  companyName,
  items,
}: {
  user: SessionUser;
  companyName: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-[0_6px_16px_rgba(59,130,246,0.28)]">
            <UtensilsCrossed className="size-4" />
          </span>
          <span className="text-[13px] font-semibold tracking-[0.08em] text-slate-900">{companyName}</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 rounded-full bg-slate-100/80 p-1 md:flex">
          {items.map((item) => {
            const Icon = icons[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-slate-500 transition",
                  active ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-800",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 hover:bg-slate-50">
              <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                {fullName(user.lastName, user.firstName)}
              </span>
              <Avatar>
                <AvatarFallback className="bg-blue-500 text-xs text-white">
                  {initials(user.lastName, user.firstName)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {items.some((item) => item.href === "/my-orders") ? (
                <DropdownMenuItem asChild>
                  <Link href="/my-orders">Миний захиалга</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link href="/help">Тусламж</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={logoutAction} className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2">
                    <LogOut className="size-4" />
                    Гарах
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function EmployeeBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur md:hidden">
      <div className="flex px-2">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium text-slate-400",
                active && "text-blue-600",
              )}
            >
              <span className={cn("rounded-xl p-1.5", active && "bg-blue-50")}>
                <Icon className="size-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
