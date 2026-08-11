import { useEffect } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { teamUi, primeiroNome } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface CompletionScreenProps {
  nome: string;
  equipe: EquipeCodigo;
  indicacoes: number;
  /** Retorna sozinho à tela inicial, pronto para o próximo participante. */
  retornoAutomaticoMs?: number;
  onNext: () => void;
}

export function CompletionScreen({
  nome,
  equipe,
  indicacoes,
  retornoAutomaticoMs = 5000,
  onNext,
}: CompletionScreenProps) {
  const ui = teamUi(equipe);

  // Atalho de operação: tecla N avança para o próximo participante.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.tagName === "INPUT" || alvo?.tagName === "TEXTAREA") return;
      if (e.key.toLowerCase() === "n") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext]);

  useEffect(() => {
    const t = window.setTimeout(onNext, retornoAutomaticoMs);
    return () => window.clearTimeout(t);
  }, [retornoAutomaticoMs, onNext]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <div className="surface-card animate-pop w-full rounded-3xl border-2 border-success/50 px-6 py-10">
        <h2 className="text-[clamp(1.5rem,4.5vw,2.5rem)] font-black uppercase tracking-tight">
          Obrigado por participar da
        </h2>
        <p className="mt-1 text-[clamp(1.75rem,5.5vw,3rem)] font-black uppercase text-gradient-brand">
          Roleta do Futuro
        </p>
        <p className="mt-4 text-[clamp(1rem,2.6vw,1.5rem)] font-bold">
          Confira agora o Ranking Ao Vivo!
        </p>
        <p className={cn("mt-3 text-base font-black uppercase", ui.text)}>
          {ui.emoji} {primeiroNome(nome)} • Equipe {ui.label}
        </p>

        {indicacoes > 0 ? (
          <p className="mt-3 text-sm font-semibold text-success">
            Suas indicações foram registradas! ({indicacoes})
          </p>
        ) : null}
      </div>

      <ActionButton tamanho="xl" className="animate-glow-pulse w-full" onClick={onNext}>
        Próximo participante
      </ActionButton>
      <p className="text-xs text-muted-foreground">Atalho do operador: tecla N</p>
    </div>
  );
}
