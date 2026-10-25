import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/types";

export const SESSION_COOKIE = "food_session";

export type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  return new TextEncoder().encode("dev-only-session-secret-change-me-32bytes");
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || (payload.role !== "admin" && payload.role !== "cook" && payload.role !== "employee")) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role,
    };
  } catch {
    return null;
  }
}
