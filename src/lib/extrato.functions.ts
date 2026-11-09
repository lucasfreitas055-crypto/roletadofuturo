/**
 * Funções públicas de operação do evento — usadas pela página /extrato.
 *
 * Não exigem autenticação (o sistema opera em modo terminal). Toda ação
 * registra auditoria com usuário "operador" para manter rastreabilidade.
 */

import { createServerFn } from "@tanstack/react-start";

import { configuracoesSchema } from "@/utils/validation";
import type { ConfiguracoesPainel } from "@/database/painel.server";
import type { EquipeCodigo, StatusLead } from "@/types/database.types";

export const listarParticipantesPublico = createServerFn({ method: "POST" })
  .inputValidator((input: { equipe?: EquipeCodigo | null; busca?: string | null } | undefined) => {
    const dados = input ?? {};
    return {
      equipe: dados.equipe ?? null,
      busca: dados.busca ?? null,
    };
  })
  .handler(async ({ data }) => {
    // Sempre lê do evento oficial ATIVO — igual ao LiveScoreboard da HomeScreen.
    // (O modo de teste foi removido da UI; a defesa antiga causava divergência.)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");

    const eventoId = await garantirEventoAtivoId();

    let query = supabaseAdmin
      .from("participantes")
      .select("*", { count: "exact" })
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: false });

    if (data.equipe) query = query.eq("equipe", data.equipe);
    if (data.busca) {
      const termo = `%${data.busca}%`;
      query = query.or(`nome.ilike.${termo},responsavel_nome.ilike.${termo}`);
    }

    const { data: linhas, error, count } = await query.range(0, 499);
    if (error) throw new Error(error.message);
    return { linhas: linhas ?? [], total: count ?? 0, eventoId };
  });

export const excluirParticipantePublico = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; motivo?: string }) => input)
  .handler(async ({ data }) => {
    const { removerParticipante } = await import("@/database/admin.server");
    return removerParticipante(data.id, data.motivo ?? "Excluído via Extrato", "operador");
  });

export const atualizarParticipantePublico = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      equipe?: EquipeCodigo;
      statusLead?: StatusLead;
      participacaoValida?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { aplicarAtualizacaoParticipante } = await import("@/database/admin.server");
    return aplicarAtualizacaoParticipante(data, "operador");
  });

/** Atualiza campos texto de contato do participante (nome, responsável, WhatsApp). */
export const atualizarContatoParticipantePublico = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      nome?: string;
      responsavelNome?: string;
      responsavelWhatsapp?: string;
      idadeAluno?: number | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.nome !== undefined && data.nome.trim().length >= 2) patch["nome"] = data.nome.trim();
    if (data.responsavelNome !== undefined) patch["responsavel_nome"] = data.responsavelNome.trim();
    if (data.responsavelWhatsapp !== undefined)
      patch["responsavel_whatsapp"] = data.responsavelWhatsapp.trim();
    if (data.idadeAluno !== undefined) patch["idade_aluno"] = data.idadeAluno;
    if (Object.keys(patch).length === 0) return { ok: true, mensagem: "Nada a alterar." };

    const { error } = await supabaseAdmin
      .from("participantes")
      .update(patch as never)
      .eq("id", data.id);
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: "Contato atualizado." };
  });

/** Atualiza campos de contato de uma indicação. */
export const atualizarIndicadoPublico = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      nome?: string;
      responsavelNome?: string;
      whatsapp?: string;
      idade?: number | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.nome !== undefined && data.nome.trim().length >= 2) patch["nome"] = data.nome.trim();
    if (data.responsavelNome !== undefined)
      patch["responsavel_nome"] = data.responsavelNome.trim() || null;
    if (data.whatsapp !== undefined) patch["whatsapp"] = data.whatsapp.trim();
    if (data.idade !== undefined) patch["idade"] = data.idade;
    if (Object.keys(patch).length === 0) return { ok: true, mensagem: "Nada a alterar." };

    const { error } = await supabaseAdmin
      .from("indicacoes")
      .update(patch as never)
      .eq("id", data.id);
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: "Indicado atualizado." };
  });

export const listarIndicadosPublico = createServerFn({ method: "POST" })
  .inputValidator((input: { busca?: string | null } | undefined) => ({
    busca: input?.busca ?? null,
  }))
  .handler(async ({ data }) => {
    // Sempre lê do evento oficial ATIVO (mesma fonte do LiveScoreboard).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");

    const eventoId = await garantirEventoAtivoId();

    let query = supabaseAdmin
      .from("indicacoes")
      .select(
        "id, nome, whatsapp, idade, responsavel_nome, participante_id, status, invalidada_manualmente, created_at, participantes:participante_id(nome, equipe)",
        { count: "exact" },
      )
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: false });

    if (data.busca) {
      const termo = `%${data.busca}%`;
      query = query.or(`nome.ilike.${termo},responsavel_nome.ilike.${termo}`);
    }

    const { data: linhas, error, count } = await query.range(0, 999);
    if (error) throw new Error(error.message);
    return { linhas: linhas ?? [], total: count ?? 0 };
  });

export const listarIndicadosDoParticipantePublico = createServerFn({ method: "POST" })
  .inputValidator((input: { participanteId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linhas, error } = await supabaseAdmin
      .from("indicacoes")
      .select("id, nome, whatsapp, idade, responsavel_nome, status, invalidada_manualmente, created_at")
      .eq("participante_id", data.participanteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { linhas: linhas ?? [] };
  });

export const excluirIndicadoPublico = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("indicacoes").delete().eq("id", data.id);
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: "Indicado excluído." };
  });

export const obterConfiguracoesPublico = createServerFn({ method: "GET" }).handler(async () => {
  const { obterConfiguracoes } = await import("@/database/painel.server");
  return obterConfiguracoes();
});

/** Lista participantes do evento agrupados por equipe (dropdown do Game Extra). */
export const listarParticipantesPorEquipePublico = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");

    const eventoId = await garantirEventoAtivoId();

    const { data, error } = await supabaseAdmin
      .from("participantes")
      .select("id, nome, equipe")
      .eq("evento_id", eventoId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return { linhas: data ?? [], eventoId };
  },
);

export const lancarPontosExtrasPublico = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      atividade: string;
      autor: string;
      observacao?: string;
      lancamentos: {
        participanteId?: string | null;
        equipe: EquipeCodigo;
        pontos: number;
      }[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");

    const atividade = data.atividade.trim();
    const autor = data.autor.trim() || "operador";
    if (atividade.length < 2) return { ok: false, mensagem: "Nome da atividade é obrigatório." };
    if (data.lancamentos.length === 0) return { ok: false, mensagem: "Nada a lançar." };

    const eventoId = await garantirEventoAtivoId();

    const linhas = data.lancamentos
      .filter((l) => l.pontos > 0)
      .map((l) => ({
        evento_id: eventoId,
        atividade,
        participante_id: l.participanteId ?? null,
        equipe: l.equipe,
        pontos: Number(l.pontos),
        autor,
        observacao: data.observacao?.trim() || null,
      }));

    if (linhas.length === 0)
      return { ok: false, mensagem: "Nenhum lançamento com pontuação > 0." };

    const { error } = await supabaseAdmin.from("pontos_extras" as never).insert(linhas as never);
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: `${linhas.length} lançamento(s) gravado(s).` };
  });

export const listarPontosExtrasPublico = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");

  const eventoId = await garantirEventoAtivoId();

  const { data, error } = await supabaseAdmin
    .from("pontos_extras" as never)
    .select("id, atividade, participante_id, equipe, pontos, autor, observacao, created_at, participantes:participante_id(nome)")
    .eq("evento_id", eventoId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { linhas: (data ?? []) as unknown as Array<{
    id: string;
    atividade: string;
    participante_id: string;
    equipe: string;
    pontos: number;
    autor: string;
    observacao: string | null;
    created_at: string;
    participantes: { nome: string } | { nome: string }[] | null;
  }> };
});

export const excluirPontosExtrasPublico = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pontos_extras" as never).delete().eq("id", data.id);
    if (error) return { ok: false, mensagem: error.message };
    return { ok: true, mensagem: "Lançamento removido." };
  });

export const salvarConfiguracoesPublico = createServerFn({ method: "POST" })
  .inputValidator(
    (input: unknown): Partial<ConfiguracoesPainel> =>
      configuracoesSchema.parse(input ?? {}) as Partial<ConfiguracoesPainel>,
  )
  .handler(async ({ data }) => {
    const { salvarConfiguracoes } = await import("@/database/painel.server");
    return salvarConfiguracoes(data, "operador");
  });
