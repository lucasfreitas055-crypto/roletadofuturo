import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/roleta/BrandLogo";
import { getEquipeConfig } from "@/config/event.config";
import {
  excluirPontosExtrasPublico,
  lancarPontosExtrasPublico,
  listarPontosExtrasPublico,
} from "@/lib/extrato.functions";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/game-extra")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Game Extra | Roleta do Futuro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <GameExtraPage />
    </AdminGate>
  ),
});

const EQUIPES: readonly EquipeCodigo[] = ["AZUL", "VERDE", "AMARELA"] as const;

type Fase = "SETUP" | "RODANDO" | "ESCOLHER_VENCEDOR";

function formatarSegundos(s: number): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function GameExtraPage() {
  const queryClient = useQueryClient();
  const [atividade, setAtividade] = useState("");
  const [autor, setAutor] = useState("");
  const [tempoMin, setTempoMin] = useState("1");
  const [pontos, setPontos] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [fase, setFase] = useState<Fase>("SETUP");
  const [restante, setRestante] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const intervaloRef = useRef<number | null>(null);

  const historico = useQuery({
    queryKey: ["game-extra", "historico"],
    queryFn: () => listarPontosExtrasPublico(),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const lancar = useMutation({
    mutationFn: (equipe: EquipeCodigo) =>
      lancarPontosExtrasPublico({
        data: {
          atividade,
          autor,
          observacao,
          lancamentos: [{ equipe, pontos: Number(pontos) }],
        },
      }),
    onSuccess: (res, equipe) => {
      const cfg = getEquipeConfig(equipe);
      setAviso(
        res.ok
          ? `${pontos} ponto(s) creditado(s) para ${cfg.nome} em "${atividade}".`
          : res.mensagem,
      );
      if (res.ok) {
        setAtividade("");
        setObservacao("");
        setFase("SETUP");
        void queryClient.invalidateQueries({ queryKey: ["game-extra"] });
      }
      window.setTimeout(() => setAviso(null), 5000);
    },
    onError: () => setAviso("Erro ao lançar pontos."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirPontosExtrasPublico({ data: { id } }),
    onSuccess: () => {
      setAviso("Lançamento removido.");
      void queryClient.invalidateQueries({ queryKey: ["game-extra"] });
      window.setTimeout(() => setAviso(null), 3000);
    },
  });

  const iniciarJogo = () => {
    const segundos = Math.max(1, Math.floor(Number(tempoMin || "0") * 60));
    setRestante(segundos);
    setFase("RODANDO");
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  };

  const finalizarAgora = () => {
    if (intervaloRef.current) window.clearInterval(intervaloRef.current);
    intervaloRef.current = null;
    setFase("ESCOLHER_VENCEDOR");
  };

  const cancelarJogo = () => {
    if (intervaloRef.current) window.clearInterval(intervaloRef.current);
    intervaloRef.current = null;
    setFase("SETUP");
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  useEffect(() => {
    if (fase !== "RODANDO") return;
    intervaloRef.current = window.setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          if (intervaloRef.current) window.clearInterval(intervaloRef.current);
          intervaloRef.current = null;
          setFase("ESCOLHER_VENCEDOR");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervaloRef.current) window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    };
  }, [fase]);

  const podeIniciar = atividade.trim().length >= 2 && autor.trim().length >= 2 && Number(pontos) > 0;

  /* ------------------------------- TELA CHEIA -------------------------------- */
  if (fase === "RODANDO" || fase === "ESCOLHER_VENCEDOR") {
    return (
      <section className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col items-center justify-center gap-8 bg-background px-6 text-center">
        <p
          className="text-xl font-black uppercase tracking-[0.4em] sm:text-2xl"
          style={{ color: "#c8a2ff" }}
        >
          Game Extra
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          {atividade}
        </h1>

        {fase === "RODANDO" ? (
          <>
            <p
              className="select-none text-[28vw] font-black tabular-nums leading-none sm:text-[22vw]"
              style={{ color: "#c8a2ff" }}
            >
              {formatarSegundos(restante)}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={finalizarAgora}
                className="rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-md"
              >
                Finalizar agora
              </button>
              <button
                type="button"
                onClick={cancelarJogo}
                className="rounded-2xl border-2 border-border px-6 py-3 text-sm font-black uppercase tracking-widest text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-black uppercase tracking-widest text-white sm:text-xl">
              Quem venceu?
            </p>
            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              {EQUIPES.map((codigo) => {
                const cfg = getEquipeConfig(codigo);
                return (
                  <button
                    key={codigo}
                    type="button"
                    disabled={lancar.isPending}
                    onClick={() => lancar.mutate(codigo)}
                    className="flex flex-col items-center gap-2 rounded-3xl border-4 bg-card px-5 py-8 transition-transform hover:scale-105 disabled:opacity-50"
                    style={{ borderColor: cfg.corHex, color: cfg.corHex }}
                  >
                    <span className="text-2xl font-black uppercase tracking-widest sm:text-3xl">
                      {cfg.nome}
                    </span>
                    <span
                      className="text-lg font-black uppercase text-white"
                      style={{ color: "#c8a2ff" }}
                    >
                      +{pontos} pt{Number(pontos) > 1 ? "s" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={cancelarJogo}
              className="rounded-lg border border-border px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted"
            >
              Cancelar sem creditar
            </button>
          </>
        )}

        <BrandLogo className="mt-6 w-40 opacity-80 sm:w-56" />
      </section>
    );
  }

  /* --------------------------------- SETUP ----------------------------------- */
  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground">
      <header className="border-b border-border bg-card/60 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Game Extra</h1>
            <p className="text-sm text-muted-foreground">
              Configure o jogo, inicie o cronômetro em tela cheia e credite os pontos para a equipe
              vencedora.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ← Voltar ao Game
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {aviso ? (
          <p
            className="mb-4 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "rgba(200,162,255,0.15)", color: "#c8a2ff" }}
          >
            {aviso}
          </p>
        ) : null}

        <div className="grid gap-4 rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="text-lg font-black uppercase tracking-tight">Novo jogo</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Nome do game
              <input
                required
                value={atividade}
                onChange={(e) => setAtividade(e.target.value)}
                placeholder="Ex.: Cabo de guerra, Corrida de saco..."
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Quem está lançando (seu nome)
              <input
                required
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex.: Daniela"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Tempo (minutos)
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={tempoMin}
                onChange={(e) => setTempoMin(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm tabular-nums"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Pontos que o vencedor recebe
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={pontos}
                onChange={(e) => setPontos(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm tabular-nums"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            Observação (opcional)
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes do resultado..."
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!podeIniciar}
              onClick={iniciarJogo}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-md disabled:opacity-50"
            >
              ▶ Iniciar Jogo
            </button>
          </div>
        </div>

        <h2 className="mt-8 mb-3 text-lg font-black uppercase tracking-tight">
          Extrato de pontos extras
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3">Equipe</th>
                <th className="px-4 py-3">Pontos</th>
                <th className="px-4 py-3">Lançado por</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(historico.data?.linhas ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento ainda.
                  </td>
                </tr>
              ) : null}
              {(historico.data?.linhas ?? []).map((h) => {
                const cfg = getEquipeConfig(h.equipe as EquipeCodigo);
                return (
                  <tr key={h.id} className="border-t border-border align-middle">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-semibold">{h.atividade}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-black uppercase"
                        style={{ backgroundColor: `${cfg.corHex}22`, color: cfg.corHex }}
                      >
                        {cfg.nome.replace("Equipe ", "")}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-lg font-black tabular-nums"
                      style={{ color: "#c8a2ff" }}
                    >
                      +{Number(h.pontos).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs">{h.autor}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remover lançamento "${h.atividade}"?`)) {
                            excluir.mutate(h.id);
                          }
                        }}
                        disabled={excluir.isPending}
                        className={cn(
                          "rounded-lg border border-destructive/60 px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50",
                        )}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
