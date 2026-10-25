"use client";

import { createContext, useContext } from "react";
import { panelHref } from "@/lib/panel-path";

const AdminPathContext = createContext("");

export function AdminPathProvider({ secret, children }: { secret: string; children: React.ReactNode }) {
  return <AdminPathContext.Provider value={secret}>{children}</AdminPathContext.Provider>;
}

export function usePanelHref() {
  const secret = useContext(AdminPathContext);
  return (internalPath: string) => (secret ? panelHref(secret, internalPath) : internalPath);
}
