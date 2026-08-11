import { useEffect } from "react";

import { tocarAcerto, tocarErro } from "@/lib/skill-audio";
import {
  ALTERNATIVAS,
  QUEST_TOTAL_QUESTOES,
  type Alternativa,
  type Questao,
} from "@/config/quest.config";
import { formatarTempo } from "@/config/scoring.config";
import { cn } from "@/lib/utils";
import type { SkillConfig } from "@/config/skills.config";

interface QuestScreenProps {
  skill: SkillConfig;
  questao: Questao;
  indice: number;
  total: number;
  restante: number;
  feedback: "CORRETO" | "ERRADO" | null;
  onResponder: (alternativa: Alternativa) => void;
}

/** Uma pergunta por vez, cronômetro sempre visível e feedback relâmpago. */
export function QuestScreen({
  skill,
  questao,
  indice,
  total,
  restante,
  feedback,
  onResponder,
}: QuestScreenProps) {
  useEffect(() => {
    if (feedback === "CORRETO") tocarAcerto();
    if (feedback === "ERRADO") tocarErro();
  }, [feedback]);

  const numero = indice + 1;
  const progresso = (numero / (total || QUEST_TOTAL_QUESTOES)) * 100;
  const urgente = restante <= 30;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between gap-4">
        <span
          className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest"
          style={{ borderColor: skill.corVar, color: skill.corVar }}
        >
          {skill.icone} {skill.nome}
        </span>
        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          {numero}/{total}
        </span>
        <span
          className={cn(
            "rounded-xl px-3 py-1 text-xl font-black tabular-nums",
            urgente
              ? "animate-timer-urgent bg-destructive/20 text-destructive"
              : restante <= 60
                ? "bg-warning/20 text-warning"
                : "bg-card text-foreground",
          )}
          aria-label="Tempo restante"
        >
          {formatarTempo(restante)}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="surface-card animate-rise rounded-3xl border-2 border-border px-5 py-6">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Questão {numero} de {total}
        </p>
        {questao.imagem ? (
          <p className="mt-2 text-5xl" aria-hidden="true">
            {questao.imagem}
          </p>
        ) : null}
        <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{questao.enunciado}</h2>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ALTERNATIVAS.map((letra) => (
            <button
              key={letra}
              type="button"
              disabled={feedback !== null}
              onClick={() => onResponder(letra)}
              className={cn(
                "tap-card flex min-h-[4.5rem] items-center gap-3 rounded-2xl border-2 border-border bg-card/60 px-4 py-4 text-left text-base font-bold",
                "hover:border-primary disabled:opacity-60",
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/20 text-sm font-black text-primary">
                {letra}
              </span>
              <span>{questao.alternativas[letra]}</span>
            </button>
          ))}
        </div>
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn(
            "animate-pop text-center text-2xl font-black uppercase",
            feedback === "CORRETO" ? "text-success" : "text-warning",
          )}
        >
          {feedback === "CORRETO" ? " Correto!" : " Quase!"}
        </p>
      ) : (
        <p className="min-h-8" aria-hidden="true" />
      )}
    </div>
  );
}
