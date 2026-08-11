import { cn } from "@/lib/utils";
import type { LinhaEquipeAoVivo } from "@/database/ranking-live.server";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const CORES_POSICAO = [
  "border-[#D4AF37]/70 shadow-[0_0_70px_-24px_#D4AF37]",
  "border-[#C0C0C0]/60 shadow-[0_0_70px_-26px_#C0C0C0]",
  "border-[#CD7F32]/60 shadow-[0_0_70px_-26px_#CD7F32]",
];

interface Props {
  equipes: LinhaEquipeAoVivo[];
  ganhos: Record<string, number>;
  subiram: Record<string, boolean>;
}

/** Ranking das equipes — somente leitura, animações discretas. */
export function TvTeamRanking({ equipes, ganhos, subiram }: Props) {
  return (
    <ol className="flex w-full flex-col gap-[1.2vh]">
      {equipes.map((equipe, indice) => {
        const ganho = ganhos[equipe.equipe];
        const subiu = subiram[equipe.equipe];
        return (
          <li
            key={equipe.equipe}
            className={cn(
              "surface-card relative flex items-center gap-[2vw] overflow-hidden rounded-[1.4vw] border-2 px-[2vw] py-[1.6vh]",
              "transition-all duration-700 ease-out",
              CORES_POSICAO[indice] ?? "border-primary/40",
              subiu ? "animate-rank-up" : "",
              ganho ? "scale-[1.015]" : "",
            )}
            style={{
              boxShadow: ganho ? `0 0 90px -20px ${equipe.corHex}` : undefined,
            }}
          >
            <span className="w-[6vw] shrink-0 text-center text-[4vw] leading-none sm:text-[3.4vw]">
              {MEDALHAS[indice] ?? `${equipe.posicao}º`}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[2.6vw] font-black uppercase leading-tight tracking-tight"
                style={{ color: equipe.corHex }}
              >
                {equipe.nome}
              </p>
              <p className="text-[1.1vw] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {equipe.participantes} participantes · {equipe.indicacoes} indicações
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "text-[3.2vw] font-black tabular-nums leading-none transition-colors",
                  ganho ? "animate-score-flash text-gradient-brand" : "",
                )}
              >
                {equipe.pontuacao.toFixed(1).replace(".", ",")}
              </p>
              <p className="text-[1vw] font-black uppercase tracking-[0.25em] text-muted-foreground">
                pontos
              </p>
            </div>

            {ganho ? (
              <span className="animate-rise absolute right-[1.2vw] top-[1vh] rounded-full bg-success px-[1vw] py-[0.4vh] text-[1.1vw] font-black text-success-foreground shadow-lg">
                +{ganho.toFixed(1).replace(".", ",")}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
