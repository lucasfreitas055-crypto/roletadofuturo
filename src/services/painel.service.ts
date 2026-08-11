import {
  alternarIndicacao,
  obterConfigAdmin,
  obterConfigPublica,
  obterComercial,
  obterExtrato,
  obterIndicacoesResumo,
  obterLeads,
  obterPainelRanking,
  obterPainelResumo,
  salvarConfigAdmin,
} from "@/lib/painel.functions";
import type { ConfiguracoesPainel, FiltroLeads } from "@/database/painel.server";

/** Camada de serviço do painel administrativo. */
export const PainelService = {
  resumo: () => obterPainelResumo(),
  ranking: () => obterPainelRanking(),
  leads: (filtro: FiltroLeads = {}) => obterLeads({ data: filtro }),
  indicacoes: () => obterIndicacoesResumo(),
  invalidarIndicacao: (id: string, invalidar: boolean, motivo?: string) =>
    alternarIndicacao({ data: { id, invalidar, motivo: motivo ?? "" } }),
  config: () => obterConfigAdmin(),
  salvarConfig: (entrada: Partial<ConfiguracoesPainel>) => salvarConfigAdmin({ data: entrada }),
  extrato: () => obterExtrato(),
  comercial: () => obterComercial(),
  configPublica: () => obterConfigPublica(),
} as const;
