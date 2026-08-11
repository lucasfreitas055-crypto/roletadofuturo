import { registrarHabilidade } from "@/lib/participacao.functions";
import { obterQuestoes, registrarQuest } from "@/lib/quest.functions";
import type { FaixaEtaria } from "@/config/quest.config";
import type { HabilidadeCodigo } from "@/config/skills.config";

/** Serviço da Roleta das Habilidades e do Quest Mister Wiz. */
export const SkillService = {
  registrarHabilidade(participanteId: string, habilidade: HabilidadeCodigo) {
    return registrarHabilidade({ data: { participanteId, habilidade } });
  },

  questoes(habilidade: HabilidadeCodigo, faixaEtaria: FaixaEtaria) {
    return obterQuestoes({ data: { habilidade, faixaEtaria } });
  },

  registrarQuest: registrarQuest,
} as const;
