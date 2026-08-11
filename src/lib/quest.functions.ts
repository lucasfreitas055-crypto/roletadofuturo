/**
 * Server functions públicas do Quest Mister Wiz.
 * Arquivo fino: apenas declarações de server functions.
 */

import { createServerFn } from "@tanstack/react-start";

import { questRespostasSchema, questoesSchema } from "@/utils/validation";
import type { Questao } from "@/config/quest.config";

/** Banco de questões da habilidade sorteada + faixa etária (público). */
export const obterQuestoes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => questoesSchema.parse(input))
  .handler(async ({ data }): Promise<Questao[]> => {
    const { listarQuestoes } = await import("@/database/quest.server");
    return listarQuestoes(data);
  });

/** Resultado do Quest — a pontuação final é recalculada no servidor. */
export const registrarQuest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => questRespostasSchema.parse(input))
  .handler(async ({ data }) => {
    const { salvarQuest } = await import("@/database/quest.server");
    return salvarQuest(data);
  });
