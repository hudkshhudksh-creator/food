export const DEFAULT_ADMIN_SECRET = "gal-togoo-7k";

const RESERVED = new Set([
  "admin",
  "login",
  "api",
  "help",
  "my-orders",
  "order",
  "orders",
  "uploads",
  "meals",
  "favicon.ico",
]);

export function isValidAdminSecret(value: string) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length >= 8 &&
    value.length <= 40 &&
    !RESERVED.has(value)
  );
}

export function panelHref(secret: string, internalPath: string) {
  const base = `/${secret}`;
  if (internalPath === "/admin") return base;
  if (internalPath.startsWith("/admin/")) return `${base}${internalPath.slice("/admin".length)}`;
  return internalPath;
}

export function isPanelPath(pathname: string, secret: string) {
  const base = `/${secret}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function toAdminPath(pathname: string, secret: string) {
  const base = `/${secret}`;
  if (pathname === base) return "/admin";
  return `/admin${pathname.slice(base.length)}`;
}
