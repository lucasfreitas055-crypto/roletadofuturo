import { cn } from "@/lib/utils";
import { EVENT_CONFIG } from "@/config/event.config";
import type { LinhaIndividualAoVivo } from "@/database/ranking-live.server";

const MEDALHAS = ["🥇", "🥈", "🥉"];

const corEquipe = (codigo: string) =>
  EVENT_CONFIG.equipes.find((e) => e.codigo === codigo)?.corHex ?? "#1D4ED8";
const nomeEquipe = (codigo: string) =>
  EVENT_CONFIG.equipes.find((e) => e.codigo === codigo)?.nome ?? codigo;

interface Props {
  linhas: LinhaIndividualAoVivo[];
}

/** Ranking individual — desempate já resolvido no servidor. */
export function TvIndividualRanking({ linhas }: Props) {
  if (linhas.length === 0) {
    return (
      <p className="mt-[6vh] text-center text-[1.6vw] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Aguardando os primeiros participantes...
      </p>
    );
  }

  return (
    <ol className="grid w-full grid-cols-1 gap-[0.9vh] lg:grid-cols-2 lg:gap-x-[2vw]">
      {linhas.map((pessoa, indice) => (
        <li
          key={pessoa.id}
          className={cn(
            "surface-card flex items-center gap-[1.4vw] rounded-[1vw] border px-[1.4vw] py-[1vh] transition-all duration-700",
            indice < 3 ? "border-primary/50" : "border-border",
          )}
        >
          <span className="w-[3.4vw] shrink-0 text-center text-[2vw] font-black leading-none">
            {MEDALHAS[indice] ?? `${pessoa.posicao}º`}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.6vw] font-black leading-tight">{pessoa.nome}</p>
            <p
              className="text-[1vw] font-bold uppercase tracking-[0.2em]"
              style={{ color: corEquipe(pessoa.equipe) }}
            >
              {nomeEquipe(pessoa.equipe)}
            </p>
          </div>
          <p className="shrink-0 text-[1.9vw] font-black tabular-nums">
            {pessoa.pontuacao.toFixed(1).replace(".", ",")}
          </p>
        </li>
      ))}
    </ol>
  );
}
