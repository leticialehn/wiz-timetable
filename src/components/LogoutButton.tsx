import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { logout } from "@/lib/auth.functions";

// Sai da sessão e invalida o router — o beforeLoad do root roda de novo,
// agora sem sessão, e o AuthGate assume.
export function LogoutButton({ className }: { className?: string }) {
  const logoutFn = useServerFn(logout);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sair() {
    setLoading(true);
    try {
      await logoutFn();
      await router.invalidate();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={loading}
      className={
        className ??
        "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      }
    >
      {loading ? "Saindo…" : "Sair"}
    </button>
  );
}
