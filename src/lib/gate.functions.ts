import { createServerFn } from "@tanstack/react-start";

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const { getGateSession, passwordMatches } = await import("./gate.server");
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false as const, erro: "ADMIN_PASSWORD não configurado" };
    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const, erro: "Senha incorreta" };
    }
    const session = await getGateSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const isAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  return { unlocked: Boolean(session.data.unlocked) };
});
