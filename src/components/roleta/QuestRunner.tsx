import { QuestScreen } from "@/components/roleta/QuestScreen";
import { useQuest } from "@/hooks/useQuest";
import type { Questao, RespostaQuest, ResultadoQuest } from "@/config/quest.config";
import type { SkillConfig } from "@/config/skills.config";

interface QuestRunnerProps {
  skill: SkillConfig;
  questoes: readonly Questao[];
  onFinish: (resultado: ResultadoQuest, respostas: RespostaQuest[]) => void;
}

/**
 * Isola o motor do Quest: o cronômetro só existe enquanto esta tela está
 * montada, garantindo reset total entre participantes.
 */
export function QuestRunner({ skill, questoes, onFinish }: QuestRunnerProps) {
  const quest = useQuest(questoes, onFinish);

  if (!quest.questaoAtual) return null;

  return (
    <QuestScreen
      skill={skill}
      questao={quest.questaoAtual}
      indice={quest.indice}
      total={quest.total}
      restante={quest.restante}
      feedback={quest.feedback}
      onResponder={quest.responder}
    />
  );
}
