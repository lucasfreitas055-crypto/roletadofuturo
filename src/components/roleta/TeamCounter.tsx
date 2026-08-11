import { teamUi } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface TeamCounterProps {
  equipe: EquipeCodigo;
  total: number;
  lider?: boolean | undefined;
  carregando?: boolean | undefined;
}

/** Card grande com o total de participantes de uma equipe. */
export function TeamCounter({
  equipe,
  total,
  lider = false,
  carregando = false,
}: TeamCounterProps) {
  const ui = teamUi(equipe);
  return (
    <div
      className={cn(
        "surface-card animate-pop relative flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-4 text-center transition-transform duration-200 sm:py-6",
        ui.border,
        lider && cn(ui.glow, "scale-[1.02]"),
      )}
    >
      {lider ? (
        <span
          className={cn(
            "absolute -top-3 rounded-full px-3 py-1 text-xs font-black uppercase",
            ui.solid,
            ui.onSolid,
          )}
        >
          Líder
        </span>
      ) : null}
      <span className={cn("text-sm font-black uppercase tracking-widest sm:text-base", ui.text)}>
        Equipe {ui.label}
      </span>
      <span className="text-4xl font-black leading-none tabular-nums text-foreground sm:text-5xl">
        {carregando ? "—" : total}
      </span>
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        participantes
      </span>
    </div>
  );
}
