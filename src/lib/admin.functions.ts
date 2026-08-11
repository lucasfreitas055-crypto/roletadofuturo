/**
 * Server functions administrativas — exigem autenticação e papel de admin.
 * Arquivo fino: apenas declarações de server functions.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroParticipantesSchema } from "@/utils/validation";
import type {
  EquipeCodigo,
  FiltroParticipantes,
  StatusLead,
  StatusPremio,
} from "@/types/database.types";

async function exigirAdmin(context: {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => PromiseLike<{ data: unknown }>;
  };
  userId: string;
}): Promise<void> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

export const verificarSouAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: data === true, userId: context.userId };
  });

export const obterDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const c = await import("@/database/consultas.server");
    const [resumo, ranking, porDia, porPremio, porStatus] = await Promise.all([
      c.obterResumoDashboard(),
      c.obterParticipantesPorEquipe(),
      c.obterParticipantesPorDia(),
      c.obterParticipantesPorPremio(),
      c.obterParticipantesPorStatus(),
    ]);
    return { resumo, ranking, porDia, porPremio, porStatus };
  });

export const obterRankingAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { obterRanking } = await import("@/database/consultas.server");
    return obterRanking();
  });

export const buscarParticipantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): FiltroParticipantes => {
    const parsed = filtroParticipantesSchema.parse(input ?? {});
    return parsed as FiltroParticipantes;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { listarParticipantes } = await import("@/database/consultas.server");
    return listarParticipantes(data);
  });

export const buscarIndicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { participanteId: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { listarIndicacoes } = await import("@/database/consultas.server");
    return listarIndicacoes(data.participanteId);
  });

export const buscarAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limite?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { listarAuditoria } = await import("@/database/consultas.server");
    return listarAuditoria(data.limite ?? 200);
  });

export const atualizarParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      equipe?: EquipeCodigo;
      statusLead?: StatusLead;
      statusPremio?: StatusPremio;
      premioId?: string | null;
      participacaoValida?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { aplicarAtualizacaoParticipante } = await import("@/database/admin.server");
    return aplicarAtualizacaoParticipante(data, context.userId);
  });

export const liberarPossivelDuplicidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; aprovar: boolean }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { liberarParticipante } = await import("@/database/admin.server");
    return liberarParticipante(data.id, data.aprovar, context.userId);
  });

export const excluirParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo?: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { removerParticipante } = await import("@/database/admin.server");
    return removerParticipante(data.id, data.motivo ?? "", context.userId);
  });

export const exportarParticipantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): FiltroParticipantes => {
    const parsed = filtroParticipantesSchema.parse(input ?? {});
    return parsed as FiltroParticipantes;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { listarParticipantes } = await import("@/database/consultas.server");
    const { linhas } = await listarParticipantes({ ...data, limite: 1000, offset: 0 });
    return linhas;
  });
