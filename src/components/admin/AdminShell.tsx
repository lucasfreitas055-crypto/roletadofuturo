import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EVENT_CONFIG } from "@/config/event.config";
import { AuthService } from "@/services/auth.service";
import { usePainelConfig } from "@/hooks/usePainel";
import { cn } from "@/lib/utils";

const MENU = [
  { to: "/admin", rotulo: "Dashboard", icone: "", exato: true },
  { to: "/admin/leads", rotulo: "Leads", icone: "", exato: false },
  { to: "/admin/ranking", rotulo: "Ranking", icone: "", exato: false },
  { to: "/admin/indicacoes", rotulo: "Indicações", icone: "", exato: false },
  { to: "/admin/comercial", rotulo: "Comercial", icone: "", exato: false },
  { to: "/admin/configuracoes", rotulo: "Configurações", icone: "", exato: false },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { consulta } = usePainelConfig();
  const modoTeste = consulta.data?.modo === "TESTE";

  const sair = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await AuthService.sair();
    await navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/50 p-4 md:flex">
        <img
          src={EVENT_CONFIG.logoUrl}
          alt="Mister Wiz"
          className="mb-6 h-8 w-auto self-start object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <nav className="flex flex-col gap-1">
          {MENU.map((item) => {
            const ativo = item.exato ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span aria-hidden>{item.icone}</span>
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => void sair()}
          className="mt-auto rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
          {MENU.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              {item.icone} {item.rotulo}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void sair()}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"
          >
            Sair
          </button>
        </header>
        {modoTeste ? (
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-amber-950">
            Modo Teste Ativo — nada aqui conta para o evento oficial
          </div>
        ) : null}
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  icone,
  rotulo,
  valor,
  detalhe,
}: {
  icone: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-muted-foreground">
        <span aria-hidden>{icone}</span> {rotulo}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

export function PageTitle({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black uppercase tracking-tight">{titulo}</h1>
      <p className="text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}

export function EstadoConsulta({
  carregando,
  erro,
  vazio,
  mensagemVazio,
}: {
  carregando: boolean;
  erro: unknown;
  vazio: boolean;
  mensagemVazio: string;
}) {
  if (carregando) return <p className="py-6 text-sm text-muted-foreground">Carregando...</p>;
  if (erro)
    return (
      <p className="py-6 text-sm font-semibold text-destructive">
        Não foi possível carregar os dados agora. Tente novamente em instantes.
      </p>
    );
  if (vazio) return <p className="py-6 text-sm text-muted-foreground">{mensagemVazio}</p>;
  return null;
}
