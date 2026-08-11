import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TvIndividualRanking } from "@/components/ranking/TvIndividualRanking";
import { TvTeamRanking } from "@/components/ranking/TvTeamRanking";
import { EVENT_CONFIG } from "@/config/event.config";
import { useRankingAoVivo } from "@/hooks/useRankingAoVivo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking-ao-vivo")({
  ssr: false,
  component: RankingAoVivoPage,
  head: () => ({
    meta: [
      { title: "Ranking Ao Vivo | Roleta do Futuro – Mister Wiz" },
      {
        name: "description",
        content:
          "Painel de competição em tempo real da Roleta do Futuro Mister Wiz: ranking das equipes, ranking individual, recordes e estatísticas do evento.",
      },
      { property: "og:title", content: "Ranking Ao Vivo | Roleta do Futuro – Mister Wiz" },
      {
        property: "og:description",
        content: "Acompanhe em tempo real a disputa entre as equipes da gincana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MENSAGENS = [
  "A próxima equipe pode assumir a liderança!",
  "Cada indicação vale pontos!",
  "Quanto mais rápido responder, maior sua pontuação!",
  "Convide seus amigos para participar!",
  "Competição saudável: torça pela sua equipe!",
];

const formatarTempo = (segundos: number) =>
  `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(Math.floor(segundos % 60)).padStart(2, "0")}`;

const formatarNumero = (valor: number, casas = 1) => valor.toFixed(casas).replace(".", ",");

function RankingAoVivoPage() {
  const {
    equipes,
    individual,
    ultimos,
    recordes,
    estatisticas,
    ganhos,
    subiram,
    destaque,
    contribuicao,
    carregando,
    offline,
  } = useRankingAoVivo(1000);

  const [aba, setAba] = useState<"EQUIPES" | "INDIVIDUAL">("EQUIPES");
  const [mensagem, setMensagem] = useState(0);
  const [agora, setAgora] = useState(() => new Date());
  const [modoTv, setModoTv] = useState(false);

  /* Alterna as abas a cada 20 segundos, sozinho. */
  useEffect(() => {
    const t = window.setInterval(
      () => setAba((atual) => (atual === "EQUIPES" ? "INDIVIDUAL" : "EQUIPES")),
      20_000,
    );
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setMensagem((i) => (i + 1) % MENSAGENS.length), 8000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const encerramento = EVENT_CONFIG.encerramentoEvento;
  const restanteMs = encerramento ? new Date(encerramento).getTime() - agora.getTime() : null;

  const alternarTv = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setModoTv(true);
      } else {
        await document.exitFullscreen();
        setModoTv(false);
      }
    } catch {
      setModoTv((v) => !v);
    }
  };

  return (
    <main
      onDoubleClick={alternarTv}
      className={cn(
        "relative flex h-dvh w-full select-none flex-col overflow-hidden bg-background px-[2vw] py-[2vh] text-foreground",
        modoTv ? "cursor-none" : "",
      )}
    >
      {/* Brilho de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)",
        }}
      />

      {/* ---------------- Cabeçalho ---------------- */}
      <header className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[2vw]">
        <div className="min-w-0">
          <h1 className="text-[3.2vw] font-black uppercase leading-none tracking-tight">
            <span className="text-gradient-brand">Ranking Ao Vivo</span>
          </h1>
          <p className="mt-[0.6vh] text-[1.1vw] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}{" "}
            · {estatisticas.participantes} participantes · {estatisticas.equipes} equipes
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-[1vw]">
          {restanteMs !== null ? (
            <div className="surface-card rounded-[1vw] border border-border px-[1.2vw] py-[0.8vh] text-center">
              <p className="text-[1.8vw] font-black tabular-nums leading-none">
                {restanteMs > 0 ? formatarTempo(restanteMs / 1000) : "00:00"}
              </p>
              <p className="text-[0.75vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
                restante
              </p>
            </div>
          ) : null}
          <div className="surface-card rounded-[1vw] border border-primary/50 px-[1.2vw] py-[0.8vh] text-center">
            <p className="text-[1.8vw] font-black tabular-nums leading-none">
              {estatisticas.participantes}
            </p>
            <p className="text-[0.75vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
              participantes
            </p>
          </div>
          <img
            src={EVENT_CONFIG.logoUrl}
            alt="Mister Wiz"
            className="h-[5vh] w-auto object-contain"
          />
        </div>
      </header>

      {/* ---------------- Momento Destaque ---------------- */}
      <div className="relative z-20 h-[7vh]">
        {destaque ? (
          <div
            role="status"
            className="animate-rise mx-auto mt-[1vh] w-fit rounded-full border border-primary/60 bg-primary/15 px-[2vw] py-[1vh] text-[1.5vw] font-black uppercase tracking-wide glow-primary"
          >
            {destaque.texto}
          </div>
        ) : null}
      </div>

      {/* ---------------- Conteúdo ---------------- */}
      <section className="relative z-10 flex min-h-0 flex-1 gap-[2vw]">
        <div key={aba} className="animate-rise flex min-w-0 flex-1 flex-col">
          <h2 className="mb-[1vh] text-[1.2vw] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {aba === "EQUIPES" ? "Ranking das equipes" : "Ranking individual"}
          </h2>
          {carregando ? (
            <div className="flex flex-1 flex-col gap-[1.2vh]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="surface-card h-[12vh] animate-pulse rounded-[1.4vw]" />
              ))}
            </div>
          ) : aba === "EQUIPES" ? (
            <TvTeamRanking equipes={equipes} ganhos={ganhos} subiram={subiram} />
          ) : (
            <TvIndividualRanking linhas={individual} />
          )}
        </div>

        {/* Coluna lateral: recordes, estatísticas e últimos participantes */}
        <aside className="hidden w-[26vw] shrink-0 flex-col gap-[1.2vh] lg:flex">
          <div className="surface-card rounded-[1vw] border border-border px-[1.2vw] py-[1.2vh]">
            <p className="text-[0.9vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
              Recordes
            </p>
            <ul className="mt-[0.8vh] space-y-[0.6vh] text-[1.05vw] font-bold">
              <li>
                Melhor pontuação:{" "}
                {recordes.melhorPontuacao
                  ? `${recordes.melhorPontuacao.nome} — ${formatarNumero(recordes.melhorPontuacao.valor)}`
                  : "—"}
              </li>
              <li>
                Mais indicações:{" "}
                {recordes.maisIndicacoes
                  ? `${recordes.maisIndicacoes.nome} — ${recordes.maisIndicacoes.valor}`
                  : "—"}
              </li>
              <li>
                Melhor tempo (Latas):{" "}
                {recordes.melhorTempoLatas
                  ? `${recordes.melhorTempoLatas.nome} — ${formatarTempo(recordes.melhorTempoLatas.segundos)}`
                  : "—"}
              </li>
            </ul>
          </div>

          <div className="surface-card rounded-[1vw] border border-border px-[1.2vw] py-[1.2vh]">
            <p className="text-[0.9vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
              Estatísticas
            </p>
            <dl className="mt-[0.8vh] grid grid-cols-2 gap-[0.6vh] text-[1.05vw] font-bold">
              <div>
                <dt className="text-muted-foreground">Média pontos</dt>
                <dd className="tabular-nums">{formatarNumero(estatisticas.mediaPontuacao, 2)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Média indic.</dt>
                <dd className="tabular-nums">{formatarNumero(estatisticas.mediaIndicacoes, 2)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Maior pontuação</dt>
                <dd className="tabular-nums">{formatarNumero(estatisticas.maiorPontuacao, 2)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Melhor tempo</dt>
                <dd className="tabular-nums">
                  {estatisticas.melhorTempoSegundos !== null
                    ? formatarTempo(estatisticas.melhorTempoSegundos)
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="surface-card min-h-0 flex-1 rounded-[1vw] border border-border px-[1.2vw] py-[1.2vh]">
            <p className="text-[0.9vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
              Últimos participantes
            </p>
            <ul className="mt-[0.8vh] space-y-[0.5vh] text-[1.05vw] font-bold">
              {ultimos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-[0.8vw]">
                  <span className="truncate">{p.nome}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatarNumero(p.pontuacao)}
                  </span>
                </li>
              ))}
              {ultimos.length === 0 ? <li className="text-muted-foreground">—</li> : null}
            </ul>
          </div>
        </aside>
      </section>

      {/* ---------------- Rodapé ---------------- */}
      <footer className="relative z-10 mt-[1vh] flex h-[6vh] items-center justify-between gap-[2vw] border-t border-border pt-[1vh]">
        <p
          key={mensagem}
          className="animate-rise text-[1.2vw] font-black uppercase tracking-[0.15em] text-muted-foreground"
        >
          {MENSAGENS[mensagem]}
        </p>
        <div className="flex items-center gap-[1vw]">
          {contribuicao ? (
            <p className="animate-rise rounded-full border border-success/50 bg-success/10 px-[1.4vw] py-[0.6vh] text-[1.1vw] font-black">
              {contribuicao.nome} contribuiu com +{formatarNumero(contribuicao.pontos)} pontos
            </p>
          ) : null}
          <span
            className={cn(
              "text-[0.9vw] font-black uppercase tracking-[0.25em]",
              offline ? "text-warning" : "text-success",
            )}
          >
            {offline ? " Reconectando" : "● Ao vivo"}
          </span>
        </div>
      </footer>
    </main>
  );
}
