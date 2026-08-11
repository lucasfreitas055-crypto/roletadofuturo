/**
 * Server functions públicas do terminal do evento.
 * Arquivo fino: apenas declarações de server functions.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import {
  habilidadeSchema,
  interesseSchema,
  novaIndicacaoSchema,
  novoParticipanteSchema,
} from "@/utils/validation";
import type {
  EquipeCodigo,
  NovaIndicacaoInput,
  NovoParticipanteInput,
  ResultadoParticipacao,
} from "@/types/database.types";

export const criarParticipacao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): NovoParticipanteInput => {
    const parsed = novoParticipanteSchema.parse(input);
    return { ...parsed, equipe: parsed.equipe as EquipeCodigo };
  })
  .handler(async ({ data }): Promise<ResultadoParticipacao> => {
    const { registrarParticipacao } = await import("@/database/participacao.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const userAgent = getRequestHeader("user-agent") ?? null;
    return registrarParticipacao(data, { ip, userAgent });
  });

export const criarIndicacao = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): NovaIndicacaoInput => novaIndicacaoSchema.parse(input))
  .handler(async ({ data }) => {
    const { registrarIndicacao } = await import("@/database/participacao.server");
    return registrarIndicacao(data);
  });

export const registrarHabilidade = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => habilidadeSchema.parse(input))
  .handler(async ({ data }) => {
    const { salvarHabilidadeSorteada } = await import("@/database/participacao.server");
    return salvarHabilidadeSorteada(data);
  });

export const obterPremiosAtivos = createServerFn({ method: "GET" }).handler(async () => {
  const { listarPremiosAtivos } = await import("@/database/participacao.server");
  const premios = await listarPremiosAtivos();
  return premios.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    tipo: p.tipo,
    ordem: p.ordem,
    quantidade_indicacoes_exigidas: p.quantidade_indicacoes_exigidas,
  }));
});

export const obterRankingPublico = createServerFn({ method: "GET" }).handler(async () => {
  const { obterParticipantesPorEquipe } = await import("@/database/consultas.server");
  return obterParticipantesPorEquipe();
});

export const registrarInteresse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => interesseSchema.parse(input))
  .handler(async ({ data }) => {
    const { salvarInteresse } = await import("@/database/participacao.server");
    return salvarInteresse(data);
  });

/** Placar ao vivo do totem (público). */
export const obterPlacarPublico = createServerFn({ method: "GET" }).handler(async () => {
  const { obterPlacarAoVivo } = await import("@/database/participacao.server");
  return obterPlacarAoVivo();
});

/** Distribuição das habilidades — alimenta o sorteio equilibrado. */
export const obterDistribuicaoPublica = createServerFn({ method: "GET" }).handler(async () => {
  const { obterDistribuicaoHabilidades } = await import("@/database/participacao.server");
  return obterDistribuicaoHabilidades();
});
