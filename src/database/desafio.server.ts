/**
 * Desafio das Latas — camada de banco de dados (SERVIDOR APENAS).
 *
 * A pontuação é SEMPRE recalculada aqui a partir do tempo:
 * o cliente nunca decide quantos pontos vale o desafio.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { registrarAuditoria } from "@/database/participacao.server";
import { DESAFIO_MAX_SEGUNDOS, pontuacaoDesafioLatas } from "@/config/challenge.config";

export interface DesafioInput {
  participanteId: string;
  tempoSegundos: number;
}

export async function salvarDesafioLatas(
  input: DesafioInput,
): Promise<{ ok: boolean; score: number; tempo: number; mensagem: string }> {
  const tempo = Math.min(Math.max(Math.round(input.tempoSegundos), 0), DESAFIO_MAX_SEGUNDOS);
  const score = pontuacaoDesafioLatas(tempo);

  // Registro único: se já houver resultado gravado, mantém o primeiro.
  const { data: atual } = await supabaseAdmin
    .from("participantes")
    .select("id, missao_concluida, quest_tempo_segundos, quest_score")
    .eq("id", input.participanteId)
    .maybeSingle();

  if (!atual) return { ok: false, score: 0, tempo, mensagem: "Participante não encontrado." };
  if (atual.missao_concluida) {
    return {
      ok: true,
      score: Number(atual.quest_score ?? 0),
      tempo: Number(atual.quest_tempo_segundos ?? tempo),
      mensagem: "Desafio já registrado.",
    };
  }

  const fim = new Date();
  const inicio = new Date(fim.getTime() - tempo * 1000);

  const { error } = await supabaseAdmin
    .from("participantes")
    .update({
      habilidade_sorteada: "INTELIGENCIA_EMOCIONAL",
      quest_inicio: inicio.toISOString(),
      quest_fim: fim.toISOString(),
      quest_tempo_segundos: tempo,
      quest_acertos: 0,
      quest_erros: 0,
      quest_nao_respondidas: 0,
      quest_speed_factor: score,
      quest_accuracy_factor: score,
      quest_score: score,
      missao_concluida: true,
      horario_inicio_missao: inicio.toISOString(),
      horario_fim_missao: fim.toISOString(),
      tempo_missao_segundos: tempo,
      pontos_missao: score,
    })
    .eq("id", input.participanteId);

  if (error) return { ok: false, score: 0, tempo, mensagem: "Não foi possível salvar o desafio." };

  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: `Desafio das Latas concluído em ${tempo}s (+${score} ponto).`,
    participanteId: input.participanteId,
    metadata: { tempo, score, desafio: "LATAS" },
  });

  return { ok: true, score, tempo, mensagem: "Desafio registrado." };
}
