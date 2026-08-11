import { criarIndicacao } from "@/lib/participacao.functions";
import { buscarIndicacoes } from "@/lib/admin.functions";
import type { Indicacao, NovaIndicacaoInput } from "@/types/database.types";

export const IndicationService = {
  registrar(input: NovaIndicacaoInput) {
    return criarIndicacao({ data: input });
  },

  listarPorParticipante(participanteId: string): Promise<Indicacao[]> {
    return buscarIndicacoes({ data: { participanteId } });
  },
} as const;
