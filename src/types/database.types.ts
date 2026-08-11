/**
 * Tipagem forte de todo o domínio da aplicação.
 * Derivada dos tipos gerados do banco — nenhum `any`.
 */

import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];
type Enums = Database["public"]["Enums"];

/* ---------------------------------- Enums --------------------------------- */

export type AppRole = Enums["app_role"];
export type EquipeCodigo = Enums["equipe_tipo"];
export type PremioTipo = Enums["premio_tipo"];
export type StatusPremio = Enums["status_premio"];
export type StatusLead = Enums["status_lead"];
export type StatusIndicacao = Enums["status_indicacao"];
export type TipoAuditoria = Enums["tipo_auditoria"];

export const STATUS_LEAD_VALUES: readonly StatusLead[] = [
  "NOVO",
  "CONTATADO",
  "AGENDADO",
  "MATRICULADO",
  "NAO_CONVERTEU",
] as const;

export const STATUS_PREMIO_VALUES: readonly StatusPremio[] = [
  "PENDENTE",
  "DESBLOQUEADO",
  "RESGATADO",
] as const;

export const STATUS_LEAD_LABEL: Readonly<Record<StatusLead, string>> = {
  NOVO: "Novo",
  CONTATADO: "Contatado",
  AGENDADO: "Agendado",
  MATRICULADO: "Matriculado",
  NAO_CONVERTEU: "Não converteu",
};

export const STATUS_PREMIO_LABEL: Readonly<Record<StatusPremio, string>> = {
  PENDENTE: "Pendente",
  DESBLOQUEADO: "Desbloqueado",
  RESGATADO: "Resgatado",
};

/* --------------------------------- Tabelas -------------------------------- */

export type Equipe = Tables["equipes"]["Row"];
export type Premio = Tables["premios"]["Row"];
export type PremioInsert = Tables["premios"]["Insert"];
export type PremioUpdate = Tables["premios"]["Update"];

export type Participante = Tables["participantes"]["Row"];
export type ParticipanteInsert = Tables["participantes"]["Insert"];
export type ParticipanteUpdate = Tables["participantes"]["Update"];

export type Indicacao = Tables["indicacoes"]["Row"];
export type IndicacaoInsert = Tables["indicacoes"]["Insert"];

export type Auditoria = Tables["auditoria"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type UserRole = Tables["user_roles"]["Row"];

/* --------------------------------- Views ---------------------------------- */

export type RankingEquipe = Views["vw_ranking_equipes"]["Row"];
export type ParticipantesPorDia = Views["vw_participantes_por_dia"]["Row"];
export type ParticipantesPorPremio = Views["vw_participantes_por_premio"]["Row"];
export type ParticipantesPorStatus = Views["vw_participantes_por_status"]["Row"];
export type ResumoDashboard = Views["vw_resumo_dashboard"]["Row"];

/* --------------------------- Contratos de serviço -------------------------- */

export interface NovoParticipanteInput {
  nome: string;
  idadeAluno: number | null;
  responsavelNome: string;
  responsavelWhatsapp: string;
  equipe: EquipeCodigo;
}

export type ResultadoParticipacao =
  | {
      status: "SUCESSO";
      participanteId: string;
      premio: { id: string; nome: string; tipo: PremioTipo; indicacoesExigidas: number } | null;
      statusPremio: StatusPremio;
    }
  | { status: "BLOQUEADO_DUPLICIDADE"; mensagem: string }
  | { status: "POSSIVEL_DUPLICIDADE"; participanteId: string; mensagem: string }
  | { status: "ERRO"; mensagem: string };

export interface NovaIndicacaoInput {
  participanteId: string;
  nome: string;
  whatsapp: string;
  idade?: number | null | undefined;
  responsavelNome?: string | undefined;
}

export interface FiltroParticipantes {
  equipe?: EquipeCodigo;
  premioId?: string;
  statusLead?: StatusLead;
  statusPremio?: StatusPremio;
  dataInicio?: string;
  dataFim?: string;
  somenteValidos?: boolean;
  busca?: string;
  limite?: number;
  offset?: number;
}

export interface ParticipantesPorEquipe {
  equipe: EquipeCodigo;
  nome: string;
  corHex: string;
  total: number;
}
