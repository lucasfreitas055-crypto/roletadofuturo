import { teamUi } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { ParticipantesPorEquipe } from "@/types/database.types";

interface TeamLeaderProps {
  equipes: readonly ParticipantesPorEquipe[];
}

/** Destaque da equipe líder — com tratamento explícito de empate. */
export function TeamLeader({ equipes }: TeamLeaderProps) {
  const maior = equipes.reduce((max, e) => Math.max(max, e.total), 0);
  const lideres = equipes.filter((e) => e.total === maior && maior > 0);

  if (lideres.length === 0) {
    return (
      <div className="surface-card rounded-2xl px-5 py-3 text-center text-sm font-semibold text-muted-foreground">
        Equipe líder — a disputa ainda vai começar!
      </div>
    );
  }

  if (lideres.length > 1) {
    return (
      <div className="surface-card animate-pop rounded-2xl px-5 py-3 text-center">
        <p className="text-base font-black uppercase tracking-wide text-foreground"> Empate!</p>
        <p className="text-sm text-muted-foreground">A disputa está acirrada!</p>
      </div>
    );
  }

  const lider = lideres[0]!;
  const ui = teamUi(lider.equipe);
  return (
    <div
      className={cn("surface-card animate-pop rounded-2xl border px-5 py-3 text-center", ui.border)}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Equipe líder
      </p>
      <p className={cn("text-lg font-black uppercase tracking-wide", ui.text)}>
        {ui.emoji} {ui.label} — {lider.total} participantes
      </p>
    </div>
  );
}
