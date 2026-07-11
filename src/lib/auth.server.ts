// Server-only session e utilitários de autenticação. Nunca importado direto por código de cliente.
import { useSession } from "@tanstack/react-start/server";
import type { Papel, UsuarioAutenticado } from "./types";

type AuthSession = { usuarioId?: string };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET não configurado");
  return {
    password,
    name: "escola-auth",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export async function getAuthSession() {
  return useSession<AuthSession>(sessionConfig());
}

// Cloudflare Workers (runtime de produção) recusa PBKDF2 acima de 100.000 iterações.
const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, "base64");
  const out = new Uint8Array(buf.length);
  out.set(buf);
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Hash de senha via Web Crypto (PBKDF2-SHA256) — API nativa tanto em Node quanto no
// runtime do Cloudflare Workers usado em produção (nodeCompat não é necessário aqui).
export async function hashPassword(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(senha: string, armazenada: string): Promise<boolean> {
  const [iteracoesStr, saltB64, hashB64] = armazenada.split(":");
  const iterations = Number(iteracoesStr);
  if (!iterations || !saltB64 || !hashB64) return false;
  const salt = fromBase64(saltB64);
  const esperado = fromBase64(hashB64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return timingSafeEqualBytes(new Uint8Array(bits), esperado);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function carregarUsuarioAutenticado(usuarioId: string): Promise<UsuarioAutenticado | null> {
  const sb = await admin();
  const [usuarioRes, papeisRes] = await Promise.all([
    sb.from("usuarios").select("*").eq("id", usuarioId).maybeSingle(),
    sb.from("usuario_papeis").select("papel").eq("usuario_id", usuarioId),
  ]);
  const usuario = usuarioRes.data as {
    id: string;
    nome: string;
    username: string;
    ativo: boolean;
    professora_id: string | null;
  } | null;
  if (!usuario || !usuario.ativo) return null;
  const papeis = ((papeisRes.data ?? []) as { papel: Papel }[]).map((p) => p.papel);
  return {
    id: usuario.id,
    nome: usuario.nome,
    username: usuario.username,
    papeis,
    professora_id: usuario.professora_id,
    ativo: usuario.ativo,
  };
}

export async function usuarioDaSessao(): Promise<UsuarioAutenticado | null> {
  const session = await getAuthSession();
  const usuarioId = session.data.usuarioId;
  if (!usuarioId) return null;
  return carregarUsuarioAutenticado(usuarioId);
}

export async function requireAuthenticated(): Promise<UsuarioAutenticado> {
  const usuario = await usuarioDaSessao();
  if (!usuario) throw new Error("Não autorizado. Faça login.");
  return usuario;
}

export async function requireRole(papeis: Papel[]): Promise<UsuarioAutenticado> {
  const usuario = await requireAuthenticated();
  if (!usuario.papeis.some((p) => papeis.includes(p))) {
    throw new Error("Não autorizado. Você não tem permissão para esta ação.");
  }
  return usuario;
}
