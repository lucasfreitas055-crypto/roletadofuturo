import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  ArquivoEvento,
  EventoResumido,
  LogEvento,
  ResetResumido,
  ResultadoEncerramento,
} from "@/database/eventos.server";

const esquemaUsuario = z.object({
  usuario: z.string().trim().min(1).max(120).default("operador"),
  nomeNovoEvento: z.string().trim().max(120).nullish(),
});
const esquemaId = z.object({ eventoId: z.string().uuid() });
const esquemaRenomear = z.object({
  eventoId: z.string().uuid(),
  nome: z.string().trim().min(2).max(120),
});
const esquemaAcaoId = z.object({
  eventoId: z.string().uuid(),
  usuario: z.string().trim().min(1).max(120).default("operador"),
});
const esquemaNovoEvento = z.object({
  nome: z.string().trim().min(2).max(120),
  usuario: z.string().trim().min(1).max(120).default("operador"),
});
const esquemaResetId = z.object({
  resetId: z.string().uuid(),
  usuario: z.string().trim().min(1).max(120).default("operador"),
});

/** Evento em andamento + lista completa (histórico, lixeira e logs). */
export const obterPainelEventos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ativo: EventoResumido; eventos: EventoResumido[]; logs: LogEvento[] }> => {
    const { obterEventoAtivo, listarEventos, listarLogs } =
      await import("@/database/eventos.server");
    const [ativo, eventos, logs] = await Promise.all([
      obterEventoAtivo(),
      listarEventos(),
      listarLogs(),
    ]);
    return { ativo, eventos, logs };
  },
);

/** Arquivo completo de um evento — consulta e exportação, mesmo anos depois. */
export const obterArquivoEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaId.parse(entrada))
  .handler(async ({ data }): Promise<{ evento: EventoResumido; arquivo: ArquivoEvento | null }> => {
    const { obterArquivoEvento } = await import("@/database/eventos.server");
    return obterArquivoEvento(data.eventoId);
  });

export const encerrarEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaUsuario.parse(entrada))
  .handler(async ({ data }): Promise<ResultadoEncerramento> => {
    const { encerrarEvento } = await import("@/database/eventos.server");
    return encerrarEvento({ usuario: data.usuario, nomeNovoEvento: data.nomeNovoEvento ?? null });
  });

export const duplicarEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaUsuario.parse(entrada))
  .handler(async ({ data }): Promise<ResultadoEncerramento> => {
    const { duplicarEvento } = await import("@/database/eventos.server");
    return duplicarEvento({ usuario: data.usuario });
  });

export const renomearEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaRenomear.parse(entrada))
  .handler(async ({ data }) => {
    const { renomearEvento } = await import("@/database/eventos.server");
    return renomearEvento(data.eventoId, data.nome);
  });

export const moverEventoParaLixeiraPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaAcaoId.parse(entrada))
  .handler(async ({ data }) => {
    const { moverParaLixeira } = await import("@/database/eventos.server");
    return moverParaLixeira(data.eventoId, data.usuario);
  });

export const restaurarEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaAcaoId.parse(entrada))
  .handler(async ({ data }) => {
    const { restaurarEvento } = await import("@/database/eventos.server");
    return restaurarEvento(data.eventoId, data.usuario);
  });

/** Botão " Novo Evento" — só pede um nome. */
export const criarNovoEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaNovoEvento.parse(entrada))
  .handler(async ({ data }): Promise<ResultadoEncerramento> => {
    const { criarNovoEvento } = await import("@/database/eventos.server");
    return criarNovoEvento({ nome: data.nome, usuario: data.usuario });
  });

/** Botão " Limpar Dados do Evento" — backup automático antes de zerar. */
export const limparDadosEventoPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaAcaoId.parse(entrada))
  .handler(async ({ data }) => {
    const { limparDadosEvento } = await import("@/database/eventos.server");
    return limparDadosEvento({ eventoId: data.eventoId, usuario: data.usuario });
  });

/** " Histórico de Resets" — lista de limpezas, cada uma restaurável. */
export const listarResetsPublico = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResetResumido[]> => {
    const { listarResets } = await import("@/database/eventos.server");
    return listarResets();
  },
);

export const restaurarResetPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaResetId.parse(entrada))
  .handler(async ({ data }) => {
    const { restaurarReset } = await import("@/database/eventos.server");
    return restaurarReset(data.resetId, data.usuario);
  });
