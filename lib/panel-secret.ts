import { readFileSync } from "fs";
import path from "path";
import { DEFAULT_ADMIN_SECRET, isValidAdminSecret } from "@/lib/panel-path";

export function readAdminSecret() {
  try {
    const raw = readFileSync(path.join(process.cwd(), "data", "store.json"), "utf8");
    const secret = JSON.parse(raw)?.settings?.adminSecret;
    if (typeof secret === "string" && isValidAdminSecret(secret)) return secret;
  } catch {
    return DEFAULT_ADMIN_SECRET;
  }
  return DEFAULT_ADMIN_SECRET;
}
