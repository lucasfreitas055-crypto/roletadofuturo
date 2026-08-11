import { useEffect, useRef, useState } from "react";

import { tocarRanking } from "@/lib/skill-audio";
import { cn } from "@/lib/utils";
import { formatarPontos } from "@/config/scoring.config";
import type { LinhaPlacar } from "@/hooks/usePlacarAoVivo";

const MEDALHAS = ["", "", ""] as const;

interface LiveScoreboardProps {
  linhas: readonly LinhaPlacar[];
  ganhos: Record<string, number>;
  carregando: boolean;
  /** Título exibido acima do pódio. Default: "Gincana Santa Luzia". */
  titulo?: string;
}

/** Placar ao vivo da gincana — pódio grande + métricas de apoio. */
export function LiveScoreboard({
  linhas,
  ganhos,
  carregando,
  titulo = "Gincana Santa Luzia",
}: LiveScoreboardProps) {
  const posicoesAnteriores = useRef<Record<string, number>>({});
  const [subiram, setSubiram] = useState<Record<string, boolean>>({});

  /* Detecta ultrapassagem para animar e avisar discretamente. */
  useEffect(() => {
    const novas: Record<string, boolean> = {};
    for (const linha of linhas) {
      const antes = posicoesAnteriores.current[linha.equipe];
      if (antes !== undefined && linha.posicao < antes) novas[linha.equipe] = true;
      posicoesAnteriores.current[linha.equipe] = linha.posicao;
    }
    if (Object.keys(novas).length === 0) return undefined;
    setSubiram(novas);
    tocarRanking();
    const t = window.setTimeout(() => setSubiram({}), 1600);
    return () => window.clearTimeout(t);
  }, [linhas]);

  return (
    <section className="w-full" aria-label="Placar ao vivo da gincana">
      <h2 className="mb-3 text-center text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
        {titulo}
      </h2>

      {carregando ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="surface-card h-32 animate-pulse rounded-2xl border border-border"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {linhas.slice(0, 3).map((linha, indice) => {
            const ganho = ganhos[linha.equipe];
            const subiu = subiram[linha.equipe];
            return (
              <article
                key={linha.equipe}
                className={cn(
                  "surface-card relative overflow-hidden rounded-2xl border-2 px-3 py-3 text-center transition-transform sm:px-4 sm:py-4",
                  ganho ? "animate-pop scale-[1.03]" : "",
                  subiu ? "animate-rank-up" : "",
                  indice === 0 ? "sm:scale-[1.03]" : "",
                )}
                style={{
                  borderColor: `color-mix(in oklab, ${linha.corHex} 70%, transparent)`,
                  boxShadow: ganho
                    ? `0 0 40px -12px ${linha.corHex}`
                    : `0 0 26px -18px ${linha.corHex}`,
                }}
              >
                {ganho ? (
                  <span className="animate-rise absolute right-2 top-2 rounded-full bg-success px-2 py-0.5 text-[0.65rem] font-black text-success-foreground">
                    +{formatarPontos(ganho)}
                  </span>
                ) : null}

                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {linha.posicao}º lugar
                </p>
                <p
                  className="mt-0.5 text-base font-black uppercase leading-tight sm:text-lg"
                  style={{ color: linha.corHex }}
                >
                  {linha.nome}
                </p>

                <p
                  className={cn(
                    "mt-1 text-3xl font-black tabular-nums sm:text-4xl",
                    ganho ? "animate-score-flash" : "",
                  )}
                >
                  {formatarPontos(linha.pontuacao)}
                </p>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                  pontos
                </p>

                <p className="mt-2 border-t border-border/50 pt-2 text-xs font-semibold tabular-nums text-muted-foreground">
                  <span className="font-black text-foreground">{linha.participantes}</span>{" "}
                  participante{linha.participantes === 1 ? "" : "s"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
