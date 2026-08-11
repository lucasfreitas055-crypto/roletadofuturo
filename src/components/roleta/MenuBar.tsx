import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useConexao } from "@/hooks/useConexao";
import { cn } from "@/lib/utils";

/**
 * Menu discreto (⋯) no canto superior direito com indicador de conexão.
 * Bolinha VERDE = online, VERMELHA = offline. O sistema segue operando
 * offline: registros são enfileirados e sincronizam quando volta a rede.
 */
export function MenuBar() {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { online, pendentes, sincronizando } = useConexao();

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("mousedown", clique);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("mousedown", clique);
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const statusTexto = online
    ? sincronizando
      ? "Sincronizando..."
      : pendentes > 0
        ? `${pendentes} envio(s) pendente(s)`
        : "Online"
    : "Offline — dados serão enviados quando voltar a rede";

  return (
    <div className="flex items-center gap-2">
      {/* Indicador de conexão */}
      <div
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2 py-1 backdrop-blur"
        title={statusTexto}
        aria-label={statusTexto}
      >
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            online ? "bg-green-500" : "bg-red-500",
            online && !sincronizando && pendentes === 0 ? "animate-pulse" : "",
          )}
          style={{
            boxShadow: online
              ? "0 0 8px rgba(34,197,94,0.6)"
              : "0 0 8px rgba(239,68,68,0.7)",
          }}
        />
        {pendentes > 0 ? (
          <span className="text-[0.6rem] font-black tabular-nums text-muted-foreground">
            {pendentes}
          </span>
        ) : null}
      </div>

      {/* Menu ⋯ */}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label="Menu de opções"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-lg font-black text-foreground/80 backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
        >
          <span aria-hidden="true">⋯</span>
        </button>

        {aberto ? (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 min-w-[13rem] rounded-2xl border border-border bg-card/95 p-1 text-sm shadow-2xl backdrop-blur"
          >
            <Link
              to="/dashboard-comercial"
              onClick={() => setAberto(false)}
              role="menuitem"
              className="flex flex-col rounded-xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="font-black uppercase tracking-wide">Dashboard</span>
              <span className="text-xs text-muted-foreground">Visão geral do evento atual</span>
            </Link>
            <Link
              to="/participantes"
              onClick={() => setAberto(false)}
              role="menuitem"
              className="flex flex-col rounded-xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="font-black uppercase tracking-wide">Participantes</span>
              <span className="text-xs text-muted-foreground">
                Lista completa do evento — clique para ver indicados
              </span>
            </Link>
            <Link
              to="/indicados"
              onClick={() => setAberto(false)}
              role="menuitem"
              className="flex flex-col rounded-xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="font-black uppercase tracking-wide">Indicados</span>
              <span className="text-xs text-muted-foreground">Contatos dos amigos indicados</span>
            </Link>
            <Link
              to="/game-extra"
              onClick={() => setAberto(false)}
              role="menuitem"
              className="flex flex-col rounded-xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="font-black uppercase tracking-wide">Game Extra</span>
              <span className="text-xs text-muted-foreground">
                Lançar pontos de atividades físicas
              </span>
            </Link>
            <Link
              to="/configuracoes"
              onClick={() => setAberto(false)}
              role="menuitem"
              className="flex flex-col rounded-xl px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="font-black uppercase tracking-wide">Configurações</span>
              <span className="text-xs text-muted-foreground">
                Criar eventos e ajustar o sistema
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
