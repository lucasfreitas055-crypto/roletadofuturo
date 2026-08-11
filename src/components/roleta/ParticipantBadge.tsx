import { teamUi, primeiroNome } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface ParticipantBadgeProps {
  equipe: EquipeCodigo;
  nome?: string | undefined;
  /** Mostra "Jogando agora: João" de forma discreta. */
  discreto?: boolean;
  className?: string | undefined;
}

export function ParticipantBadge({
  equipe,
  nome,
  discreto = false,
  className,
}: ParticipantBadgeProps) {
  const ui = teamUi(equipe);
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2",
        ui.border,
        ui.soft,
        discreto ? "text-xs sm:text-sm" : "text-sm sm:text-base",
        className,
      )}
    >
      <span aria-hidden="true" className="shrink-0">
        {ui.emoji}
      </span>
      {nome ? (
        <span className="min-w-0 truncate font-semibold text-foreground">
          {discreto ? "Jogando agora: " : ""}
          {primeiroNome(nome)}
        </span>
      ) : null}
      <span className={cn("shrink-0 font-bold uppercase tracking-wide", ui.text)}>
        Equipe {ui.label}
      </span>
    </div>
  );
}
