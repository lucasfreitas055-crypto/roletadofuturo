import { useEffect } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { LoadingState } from "@/components/roleta/LoadingState";
import { QUEST_TOTAL_QUESTOES } from "@/config/quest.config";
import type { SkillConfig } from "@/config/skills.config";

interface QuestIntroProps {
  skill: SkillConfig;
  carregando: boolean;
  totalQuestoes?: number;
  aviso?: string | null;
  onStart: () => void;
}

/**
 * " SUA HABILIDADE É..." — modal que abre quando a roleta para.
 * O cronômetro só começa quando o participante clica em INICIAR QUEST.
 */
export function QuestIntro({
  skill,
  carregando,
  aviso,
  onStart,
  totalQuestoes = QUEST_TOTAL_QUESTOES,
}: QuestIntroProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !carregando) onStart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [carregando, onStart]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Habilidade sorteada"
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="animate-confetti absolute top-[-10%] h-2 w-2 rounded-sm"
            style={{
              left: `${(i * 7 + 5) % 100}%`,
              background: skill.corVar,
              animationDelay: `${(i % 7) * 0.18}s`,
            }}
          />
        ))}
      </div>

      <div
        className="surface-card animate-pop relative w-full max-w-lg rounded-3xl border-2 px-6 py-8 text-center"
        style={{
          borderColor: `color-mix(in oklab, ${skill.corVar} 70%, transparent)`,
          boxShadow: `0 0 70px -18px color-mix(in oklab, ${skill.corVar} 95%, transparent)`,
        }}
      >
        <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">
          Sua habilidade é...
        </p>
        <p className="mt-4 text-7xl" aria-hidden="true">
          {skill.icone}
        </p>
        <h3
          className="mt-3 text-3xl font-black uppercase tracking-tight"
          style={{ color: skill.corVar }}
        >
          {skill.nome}
        </h3>
        <p className="mt-2 text-base text-muted-foreground">Prepare-se para o Quest Mister Wiz!</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-black uppercase tracking-wide">
          <span className="rounded-2xl border border-border bg-card/60 px-3 py-3">
            {totalQuestoes} perguntas
          </span>
          <span className="rounded-2xl border border-border bg-card/60 px-3 py-3">
            Até 4 minutos
          </span>
        </div>

        {aviso ? (
          <p
            role="status"
            className="mt-4 rounded-xl bg-warning/15 px-4 py-3 text-sm font-semibold"
          >
            {aviso}
          </p>
        ) : null}

        {carregando ? (
          <LoadingState
            className="mt-7"
            mensagem="Preparando seu desafio..."
            detalhe="Selecionando as perguntas da sua faixa etária."
          />
        ) : (
          <ActionButton tamanho="xl" className="mt-7 w-full" onClick={onStart}>
            Iniciar Quest
          </ActionButton>
        )}
      </div>
    </div>
  );
}
