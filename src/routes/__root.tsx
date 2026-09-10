import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getSessaoAtual } from "../lib/auth.functions";
import { AuthGate } from "../components/AuthGate";

type Sessao = Awaited<ReturnType<typeof getSessaoAtual>>;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-block text-primary underline">
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Uma única checagem de sessão por navegação (roda no SSR e no client).
  // A rota pedida não é redirecionada — se não houver sessão, o RootComponent
  // renderiza o AuthGate no lugar do <Outlet/> e a URL é preservada.
  beforeLoad: async (): Promise<{ sessao: Sessao }> => {
    try {
      const sessao = await getSessaoAtual();
      return { sessao };
    } catch (error) {
      // SESSION_SECRET ausente/errado, Supabase fora do ar, etc. — falha
      // FECHADA: mostra a tela de login em vez de derrubar o app inteiro
      // com um 500 (que esconderia até o próprio login).
      console.error("getSessaoAtual falhou no beforeLoad do root:", error);
      return { sessao: { autenticado: false, usuario: null, precisaBootstrap: false } };
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wiz Timetable" },
      { name: "description", content: "Wizard Brusque Horário Semanal" },
      { property: "og:title", content: "Wiz Timetable" },
      { property: "og:description", content: "Wizard Brusque Horário Semanal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Wiz Timetable" },
      { name: "twitter:description", content: "Wizard Brusque Horário Semanal" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b35fa7f8-9dcb-42e1-9d63-1ffec2df7772/id-preview-69a37519--116da152-aa4c-4702-94d9-5a447a3a7350.lovable.app-1783726909169.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b35fa7f8-9dcb-42e1-9d63-1ffec2df7772/id-preview-69a37519--116da152-aa4c-4702-94d9-5a447a3a7350.lovable.app-1783726909169.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, sessao } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {sessao.autenticado ? <Outlet /> : <AuthGate precisaBootstrap={sessao.precisaBootstrap} />}
    </QueryClientProvider>
  );
}
