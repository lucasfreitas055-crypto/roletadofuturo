import { useEffect } from "react";

import { tocarPontos } from "@/lib/skill-audio";
import { ActionButton } from "@/components/roleta/ActionButton";
import { formatarPontos, formatarTempo } from "@/config/scoring.config";
import type { ResultadoQuest } from "@/config/quest.config";
import type { SkillConfig } from "@/config/skills.config";

interface QuestResultProps {
  skill: SkillConfig;
  resultado: ResultadoQuest;
  total: number;
  salvando: boolean;
  onContinue: () => void;
}

/** QUEST CONCLUÍDO — acertos, tempo e pontos conquistados. */
export function QuestResult({ skill, resultado, total, salvando, onContinue }: QuestResultProps) {
  useEffect(() => {
    tocarPontos();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-4 py-8 text-center">
      <div
        className="surface-card animate-pop w-full rounded-3xl border-2 px-6 py-8"
        style={{ borderColor: `color-mix(in oklab, ${skill.corVar} 65%, transparent)` }}
      >
        <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl"> Muito bem!</h2>
        <p
          className="mt-1 text-lg font-black uppercase tracking-tight"
          style={{ color: "#c8a2ff" }}
        >
          Quest concluído
        </p>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {skill.icone} {skill.nome}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/60 px-4 py-5">
            <p className="text-4xl font-black tabular-nums">
              {resultado.acertos}/{total}
            </p>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Acertos
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 px-4 py-5">
            <p className="text-4xl font-black tabular-nums">
              {formatarTempo(resultado.tempoSegundos)}
            </p>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Tempo
            </p>
          </div>
          <div className="rounded-2xl border-2 border-primary/60 bg-primary/10 px-4 py-5">
            <p
              className="text-4xl font-black tabular-nums drop-shadow-[0_0_12px_rgba(200,162,255,0.4)]"
              style={{ color: "#c8a2ff" }}
            >
              +{formatarPontos(resultado.score)}
            </p>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Pontos conquistados
            </p>
          </div>
        </div>

        {resultado.naoRespondidas > 0 ? (
          <p className="mt-4 text-sm font-semibold text-warning">
            O tempo acabou com {resultado.naoRespondidas} pergunta(s) sem resposta.
          </p>
        ) : null}
      </div>

      <ActionButton
        tamanho="xl"
        className="w-full max-w-md"
        disabled={salvando}
        onClick={onContinue}
      >
        {salvando ? "Calculando pontuação..." : "Continuar "}
      </ActionButton>
    </div>
  );
}
