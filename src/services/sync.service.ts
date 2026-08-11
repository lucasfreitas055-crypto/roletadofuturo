/**
 * Serviço de sincronização OFFLINE FIRST do terminal.
 *
 * Todas as gravações do fluxo do participante passam por `enviar()`:
 * tenta o servidor imediatamente e, em qualquer falha (ou sem internet),
 * guarda a operação na fila local para envio automático depois.
 */

import {
  criarIndicacao,
  criarParticipacao,
  registrarHabilidade,
  registrarInteresse,
} from "@/lib/participacao.functions";
import { registrarQuest } from "@/lib/quest.functions";
import { registrarDesafio } from "@/lib/desafio.functions";
import {
  ehRefLocal,
  enfileirar,
  listarPendentes,
  novaRefLocal,
  registrarId,
  resolverId,
  sincronizar,
  type OperacaoTipo,
} from "@/lib/offline-queue";
import type { NovoParticipanteInput, ResultadoParticipacao } from "@/types/database.types";

const online = () => typeof navigator === "undefined" || navigator.onLine;

interface RespostaQuestPayload {
  questaoId: string;
  ordem: number;
  selecionada: "A" | "B" | "C" | "D" | "E" | null;
  correta: "A" | "B" | "C" | "D" | "E";
  acertou: boolean;
  tempoSegundos: number;
}

const EXECUTORES = {
  PARTICIPACAO: async (payload: Record<string, unknown>) => {
    const resultado = (await criarParticipacao({
      data: payload as unknown as NovoParticipanteInput,
    })) as ResultadoParticipacao;
    return {
      participanteId: "participanteId" in resultado ? (resultado.participanteId ?? null) : null,
    };
  },
  HABILIDADE: (id: string, p: Record<string, unknown>) =>
    registrarHabilidade({ data: { participanteId: id, habilidade: p["habilidade"] as "INGLES" } }),
  QUEST: (id: string, p: Record<string, unknown>) =>
    registrarQuest({
      data: {
        participanteId: id,
        tempoSegundos: Number(p["tempoSegundos"] ?? 0),
        acertos: Number(p["acertos"] ?? 0),
        erros: Number(p["erros"] ?? 0),
        naoRespondidas: Number(p["naoRespondidas"] ?? 0),
        speedFactor: Number(p["speedFactor"] ?? 0),
        accuracyFactor: Number(p["accuracyFactor"] ?? 0),
        score: Number(p["score"] ?? 0),
        respostas: (p["respostas"] as RespostaQuestPayload[] | undefined) ?? [],
      },
    }),
  DESAFIO: (id: string, p: Record<string, unknown>) =>
    registrarDesafio({
      data: { participanteId: id, tempoSegundos: Number(p["tempoSegundos"] ?? 0) },
    }),
  INDICACAO: (id: string, p: Record<string, unknown>) =>
    criarIndicacao({
      data: {
        participanteId: id,
        nome: String(p["nome"]),
        idade: (p["idade"] as number | null) ?? null,
        responsavelNome: (p["responsavelNome"] as string | undefined) ?? undefined,
        whatsapp: String(p["whatsapp"]),
      },
    }),
  INTERESSE: (id: string, p: Record<string, unknown>) =>
    registrarInteresse({
      data: { participanteId: id, interesse: p["interesse"] as "SIM" },
    }),
} as const;

export interface ResultadoOffline {
  readonly ref: string;
  readonly resultado: ResultadoParticipacao | null;
  readonly offline: boolean;
}

export const SyncService = {
  /** Cria a participação — online grava direto, offline entra na fila. */
  async registrarParticipacao(input: NovoParticipanteInput): Promise<ResultadoOffline> {
    const ref = novaRefLocal();
    const payload = input as unknown as Record<string, unknown>;

    if (online()) {
      try {
        const resultado = (await criarParticipacao({ data: input })) as ResultadoParticipacao;
        const id = "participanteId" in resultado ? resultado.participanteId : null;
        if (id) registrarId(ref, id);
        return { ref: id ?? ref, resultado, offline: false };
      } catch {
        /* cai para a fila local */
      }
    }

    enfileirar("PARTICIPACAO", ref, payload);
    return { ref, resultado: null, offline: true };
  },

  /** Envia uma operação do participante ou guarda na fila. */
  async enviar(
    tipo: Exclude<OperacaoTipo, "PARTICIPACAO">,
    ref: string,
    payload: Record<string, unknown>,
  ): Promise<{ offline: boolean }> {
    const id = ehRefLocal(ref) ? resolverId(ref) : ref;

    if (id && online()) {
      try {
        await EXECUTORES[tipo](id, payload);
        return { offline: false };
      } catch {
        /* cai para a fila local */
      }
    }

    enfileirar(tipo, ref, payload);
    return { offline: true };
  },

  sincronizar: () => sincronizar(EXECUTORES),
  pendentes: () => listarPendentes().length,
} as const;
