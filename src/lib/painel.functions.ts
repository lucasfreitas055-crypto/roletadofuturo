/**
 * Server functions do Painel Administrativo.
 * Arquivo fino: apenas declarações de server functions.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroLeadsSchema, configuracoesSchema } from "@/utils/validation";
import type { FiltroLeads, ConfiguracoesPainel } from "@/database/painel.server";

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

export const obterPainelResumo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const p = await import("@/database/painel.server");
    const [resumo, ranking, diarias] = await Promise.all([
      p.obterResumoPainel(),
      p.obterRankingPontuacao(),
      p.obterEstatisticasDiarias(),
    ]);
    return { resumo, ranking, diarias };
  });

export const obterPainelRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const p = await import("@/database/painel.server");
    const [ranking, diarias, resumo] = await Promise.all([
      p.obterRankingPontuacao(),
      p.obterEstatisticasDiarias(),
      p.obterResumoPainel(),
    ]);
    return { ranking, diarias, resumo };
  });

export const obterLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown): FiltroLeads => filtroLeadsSchema.parse(input ?? {}) as FiltroLeads,
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { listarLeads } = await import("@/database/painel.server");
    return listarLeads(data);
  });

export const obterIndicacoesResumo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { obterResumoIndicacoes } = await import("@/database/painel.server");
    return obterResumoIndicacoes();
  });

export const alternarIndicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; invalidar: boolean; motivo?: string }) => input)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { invalidarIndicacao } = await import("@/database/painel.server");
    return invalidarIndicacao(data.id, data.invalidar, context.userId, data.motivo ?? "");
  });

export const obterConfigAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { obterConfiguracoes } = await import("@/database/painel.server");
    return obterConfiguracoes();
  });

export const salvarConfigAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown): Partial<ConfiguracoesPainel> =>
      configuracoesSchema.parse(input ?? {}) as Partial<ConfiguracoesPainel>,
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { salvarConfiguracoes } = await import("@/database/painel.server");
    return salvarConfiguracoes(data, context.userId);
  });

export const obterExtrato = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { obterExtratoGincana } = await import("@/database/painel.server");
    return obterExtratoGincana();
  });

/** Configuração pública (sem autenticação) usada pelo terminal do evento. */
export const obterConfigPublica = createServerFn({ method: "GET" }).handler(async () => {
  const { obterConfiguracoes } = await import("@/database/painel.server");
  return obterConfiguracoes();
});

export const obterComercial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { obterDashboardComercial } = await import("@/database/painel.server");
    return obterDashboardComercial();
  });
