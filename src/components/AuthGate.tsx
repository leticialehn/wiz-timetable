import { useRouter } from "@tanstack/react-router";
import { LoginForm } from "./LoginForm";
import { BootstrapForm } from "./BootstrapForm";

// Renderizado pelo __root no lugar do <Outlet/> quando não há sessão.
// Ao entrar, invalida o router: o beforeLoad do root roda de novo, agora
// autenticado, e a rota originalmente pedida (a URL nunca mudou) renderiza.
export function AuthGate({ precisaBootstrap }: { precisaBootstrap: boolean }) {
  const router = useRouter();
  const aoEntrar = () => {
    void router.invalidate();
  };

  if (precisaBootstrap) {
    return <BootstrapForm onSuccess={aoEntrar} />;
  }
  return <LoginForm title="Wiz Timetable" subtitle="Entre para continuar" onSuccess={aoEntrar} />;
}
