import { criarParticipacao } from "@/lib/participacao.functions";
import {
  atualizarParticipante,
  buscarParticipantes,
  excluirParticipante,
  exportarParticipantes,
  liberarPossivelDuplicidade,
} from "@/lib/admin.functions";
import type {
  EquipeCodigo,
  FiltroParticipantes,
  NovoParticipanteInput,
  Participante,
  ResultadoParticipacao,
  StatusLead,
  StatusPremio,
} from "@/types/database.types";

/** Serviço desacoplado de participantes. Toda validação real ocorre no servidor. */
export const ParticipantService = {
  registrar(input: NovoParticipanteInput): Promise<ResultadoParticipacao> {
    return criarParticipacao({ data: input });
  },

  listar(filtro: FiltroParticipantes = {}): Promise<{ linhas: Participante[]; total: number }> {
    return buscarParticipantes({ data: filtro });
  },

  atualizar(input: {
    id: string;
    equipe?: EquipeCodigo;
    statusLead?: StatusLead;
    statusPremio?: StatusPremio;
    premioId?: string | null;
    participacaoValida?: boolean;
  }) {
    return atualizarParticipante({ data: input });
  },

  liberarDuplicidade(id: string, aprovar: boolean) {
    return liberarPossivelDuplicidade({ data: { id, aprovar } });
  },

  excluir(id: string, motivo?: string) {
    return excluirParticipante({ data: { id, motivo: motivo ?? "" } });
  },

  exportar(filtro: FiltroParticipantes = {}): Promise<Participante[]> {
    return exportarParticipantes({ data: filtro });
  },
} as const;
