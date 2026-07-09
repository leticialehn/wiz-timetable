// Server-only session utilities. Never imported directly by client code.
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET não configurado");
  return {
    password,
    name: "escola-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export async function requireAdminUnlocked() {
  const session = await getGateSession();
  if (!session.data.unlocked) throw new Error("Não autorizado. Faça login como secretaria.");
}
