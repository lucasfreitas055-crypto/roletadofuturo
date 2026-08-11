/**
 * Ações administrativas com auditoria — SERVIDOR APENAS.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { registrarAuditoria } from "@/database/participacao.server";
import type { EquipeCodigo, StatusLead, StatusPremio } from "@/types/database.types";

export async function aplicarAtualizacaoParticipante(
  input: {
    id: string;
    equipe?: EquipeCodigo;
    statusLead?: StatusLead;
    statusPremio?: StatusPremio;
    premioId?: string | null;
    participacaoValida?: boolean;
  },
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { data: atual } = await supabaseAdmin
    .from("participantes")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (!atual) return { ok: false, mensagem: "Participante não encontrado." };

  const patch: Record<string, unknown> = {};
  if (input.equipe && input.equipe !== atual.equipe) patch["equipe"] = input.equipe;
  if (input.statusLead) patch["status_lead"] = input.statusLead;
  if (input.statusPremio) patch["status_premio"] = input.statusPremio;
  if (input.participacaoValida !== undefined)
    patch["participacao_valida"] = input.participacaoValida;

  if (input.premioId !== undefined) {
    patch["premio_id"] = input.premioId;
    if (input.premioId) {
      const { data: premio } = await supabaseAdmin
        .from("premios")
        .select("nome")
        .eq("id", input.premioId)
        .maybeSingle();
      patch["premio_nome"] = premio?.nome ?? null;
    } else {
      patch["premio_nome"] = null;
    }
  }

  if (Object.keys(patch).length === 0) return { ok: true, mensagem: "Nada a alterar." };

  const { error } = await supabaseAdmin
    .from("participantes")
    .update(patch as never)
    .eq("id", input.id);
  if (error) return { ok: false, mensagem: error.message };

  if (patch["equipe"]) {
    await registrarAuditoria({
      tipo: "CORRECAO_EQUIPE",
      descricao: `Equipe alterada de ${atual.equipe} para ${String(patch["equipe"])}.`,
      participanteId: input.id,
      usuario,
    });
  }
  if (patch["premio_id"] !== undefined) {
    await registrarAuditoria({
      tipo: "PREMIO_ALTERADO",
      descricao: `Prêmio alterado manualmente para ${String(patch["premio_nome"] ?? "nenhum")}.`,
      participanteId: input.id,
      usuario,
    });
  }
  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: `Registro alterado manualmente: ${Object.keys(patch).join(", ")}.`,
    participanteId: input.id,
    usuario,
    metadata: patch,
  });

  return { ok: true, mensagem: "Registro atualizado." };
}

export async function liberarParticipante(
  id: string,
  aprovar: boolean,
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { error } = await supabaseAdmin
    .from("participantes")
    .update({
      participacao_valida: aprovar,
      possivel_duplicidade: false,
      liberado_por: usuario,
    })
    .eq("id", id);
  if (error) return { ok: false, mensagem: error.message };

  await registrarAuditoria({
    tipo: "AUTORIZACAO_ADMIN",
    descricao: aprovar
      ? "Possível duplicidade liberada — participação contabilizada."
      : "Possível duplicidade recusada — participação não contabilizada.",
    participanteId: id,
    usuario,
  });
  return { ok: true, mensagem: aprovar ? "Participação liberada." : "Participação recusada." };
}

export async function removerParticipante(
  id: string,
  motivo: string,
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { data: atual } = await supabaseAdmin
    .from("participantes")
    .select("nome, equipe, responsavel_whatsapp_normalizado")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("participantes").delete().eq("id", id);
  if (error) return { ok: false, mensagem: error.message };

  await registrarAuditoria({
    tipo: "EXCLUSAO",
    descricao: `Participante excluído${motivo ? `: ${motivo}` : "."}`,
    usuario,
    metadata: { registro: atual ?? {} },
  });
  return { ok: true, mensagem: "Participante excluído." };
}
