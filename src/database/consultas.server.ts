/**
 * Consultas administrativas — SERVIDOR APENAS.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { garantirEventoAtivoId } from "@/database/evento-atual.server";
import { EVENT_CONFIG } from "@/config/event.config";
import type {
  Auditoria,
  FiltroParticipantes,
  Indicacao,
  Participante,
  ParticipantesPorEquipe,
  ParticipantesPorDia,
  ParticipantesPorPremio,
  ParticipantesPorStatus,
  RankingEquipe,
  ResumoDashboard,
} from "@/types/database.types";

export async function obterResumoDashboard(): Promise<ResumoDashboard | null> {
  const { data, error } = await supabaseAdmin.from("vw_resumo_dashboard").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function obterRanking(): Promise<RankingEquipe[]> {
  const { data, error } = await supabaseAdmin
    .from("vw_ranking_equipes")
    .select("*")
    .order("total_participantes", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obterParticipantesPorEquipe(): Promise<ParticipantesPorEquipe[]> {
  const ranking = await obterRanking();
  return EVENT_CONFIG.equipes.map((equipe) => {
    const linha = ranking.find((r) => r.equipe === equipe.codigo);
    return {
      equipe: equipe.codigo,
      nome: equipe.nome,
      corHex: equipe.corHex,
      total: Number(linha?.total_participantes ?? 0),
    };
  });
}

export async function obterEquipeLider(): Promise<ParticipantesPorEquipe | null> {
  const equipes = await obterParticipantesPorEquipe();
  const ordenado = [...equipes].sort((a, b) => b.total - a.total);
  return ordenado[0] ?? null;
}

export async function obterParticipantesPorDia(): Promise<ParticipantesPorDia[]> {
  const { data, error } = await supabaseAdmin.from("vw_participantes_por_dia").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obterParticipantesPorPremio(): Promise<ParticipantesPorPremio[]> {
  const { data, error } = await supabaseAdmin.from("vw_participantes_por_premio").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obterParticipantesPorStatus(): Promise<ParticipantesPorStatus[]> {
  const { data, error } = await supabaseAdmin.from("vw_participantes_por_status").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarParticipantes(
  filtro: FiltroParticipantes,
): Promise<{ linhas: Participante[]; total: number }> {
  let query = supabaseAdmin
    .from("participantes")
    .select("*", { count: "exact" })
    .eq("evento_id", await garantirEventoAtivoId())
    .order("created_at", { ascending: false });

  if (filtro.equipe) query = query.eq("equipe", filtro.equipe);
  if (filtro.premioId) query = query.eq("premio_id", filtro.premioId);
  if (filtro.statusLead) query = query.eq("status_lead", filtro.statusLead);
  if (filtro.statusPremio) query = query.eq("status_premio", filtro.statusPremio);
  if (filtro.somenteValidos) query = query.eq("participacao_valida", true);
  if (filtro.dataInicio) query = query.gte("created_at", filtro.dataInicio);
  if (filtro.dataFim) query = query.lte("created_at", filtro.dataFim);
  if (filtro.busca) {
    const termo = `%${filtro.busca}%`;
    query = query.or(`nome.ilike.${termo},responsavel_nome.ilike.${termo}`);
  }

  const limite = filtro.limite ?? 100;
  const offset = filtro.offset ?? 0;
  const { data, error, count } = await query.range(offset, offset + limite - 1);
  if (error) throw new Error(error.message);
  return { linhas: data ?? [], total: count ?? 0 };
}

export async function listarIndicacoes(participanteId: string): Promise<Indicacao[]> {
  const { data, error } = await supabaseAdmin
    .from("indicacoes")
    .select("*")
    .eq("participante_id", participanteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarAuditoria(limite = 200): Promise<Auditoria[]> {
  const { data, error } = await supabaseAdmin
    .from("auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data ?? [];
}
