import { useEffect } from "react";

import { ParticipantBadge } from "@/components/roleta/ParticipantBadge";
import { primeiroNome } from "@/lib/team-ui";
import type { EquipeCodigo } from "@/types/database.types";

interface ParticipantConfirmationProps {
  nome: string;
  equipe: EquipeCodigo;
  onContinue: () => void;
  duracaoMs?: number | undefined;
}

/** Transição curta entre cadastro confirmado e roleta. */
export function ParticipantConfirmation({
  nome,
  equipe,
  onContinue,
  duracaoMs = 1400,
}: ParticipantConfirmationProps) {
  useEffect(() => {
    const t = setTimeout(onContinue, duracaoMs);
    return () => clearTimeout(t);
  }, [onContinue, duracaoMs]);

  return (
    <div className="flex min-h-[70dvh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="animate-pop text-2xl font-black uppercase tracking-wide text-success">
        Cadastro confirmado!
      </p>
      <p className="animate-rise text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Sua sorte começa agora...
      </p>
      <p className="animate-pop text-4xl font-black tracking-tight text-foreground sm:text-5xl">
        Boa sorte, {primeiroNome(nome)}!
      </p>
      <ParticipantBadge equipe={equipe} className="animate-rise" />
    </div>
  );
}
