import { BrandLogo } from "@/components/roleta/BrandLogo";
import { ParticipantBadge } from "@/components/roleta/ParticipantBadge";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface EventHeaderProps {
  equipe?: EquipeCodigo | null;
  nome?: string | null;
  className?: string;
}

/** Cabeçalho discreto com a marca e o participante atual. */
export function EventHeader({ equipe, nome, className }: EventHeaderProps) {
  return (
    <header
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <BrandLogo className="max-w-[9rem] sm:max-w-[11rem]" />
      </div>
      {equipe ? (
        <ParticipantBadge equipe={equipe} nome={nome ?? undefined} discreto className="shrink-0" />
      ) : null}
    </header>
  );
}
