/**
 * Quest Mister Wiz — camada de banco de dados (SERVIDOR APENAS).
 *
 * Busca o banco de questões e grava o resultado auditável de cada participação:
 * fatores de velocidade e precisão, pontuação do Quest e todas as respostas.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { registrarAuditoria } from "@/database/participacao.server";
import {
  ALTERNATIVAS,
  MAX_PONTOS_QUEST,
  QUEST_SEGUNDOS,
  type Alternativa,
  type FaixaEtaria,
  type Questao,
} from "@/config/quest.config";
import type { HabilidadeCodigo } from "@/config/skills.config";

interface LinhaQuestao {
  id: string;
  habilidade: string;
  faixa_etaria: number;
  dificuldade: number;
  enunciado: string;
  imagem: string | null;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string;
  resposta_correta: string;
  explicacao_curta: string | null;
}

function paraQuestao(linha: LinhaQuestao): Questao {
  return {
    id: linha.id,
    habilidade: linha.habilidade as HabilidadeCodigo,
    faixaEtaria: linha.faixa_etaria as FaixaEtaria,
    dificuldade: linha.dificuldade,
    enunciado: linha.enunciado,
    imagem: linha.imagem,
    alternativas: {
      A: linha.alternativa_a,
      B: linha.alternativa_b,
      C: linha.alternativa_c,
      D: linha.alternativa_d,
      E: linha.alternativa_e,
    },
    respostaCorreta: (ALTERNATIVAS.find((a) => a === linha.resposta_correta) ?? "A") as Alternativa,
    explicacaoCurta: linha.explicacao_curta,
  };
}

/** Banco de questões da habilidade sorteada + faixa etária do participante. */
export async function listarQuestoes(input: {
  habilidade: string;
  faixaEtaria: number;
}): Promise<Questao[]> {
  const { data, error } = await supabaseAdmin
    .from("questoes")
    .select(
      "id, habilidade, faixa_etaria, dificuldade, enunciado, imagem, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, resposta_correta, explicacao_curta",
    )
    .eq("ativo", true)
    .eq("habilidade", input.habilidade as never)
    .eq("faixa_etaria", input.faixaEtaria)
    .limit(200);

  if (error) return [];
  return (data ?? []).map((linha) => paraQuestao(linha as unknown as LinhaQuestao));
}

export interface RespostaQuestInput {
  questaoId: string;
  ordem: number;
  selecionada: string | null;
  correta: string;
  acertou: boolean;
  tempoSegundos: number;
}

export interface QuestInput {
  participanteId: string;
  tempoSegundos: number;
  acertos: number;
  erros: number;
  naoRespondidas: number;
  speedFactor: number;
  accuracyFactor: number;
  score: number;
  respostas: RespostaQuestInput[];
}

/**
 * Grava o resultado do Quest. A pontuação é sempre recalculada no servidor:
 * o cliente nunca decide sozinho quantos pontos vale a participação.
 */
export async function salvarQuest(
  input: QuestInput,
): Promise<{ ok: boolean; score: number; mensagem: string }> {
  const tempo = Math.min(Math.max(Math.round(input.tempoSegundos), 0), QUEST_SEGUNDOS);
  const acertos = Math.min(Math.max(Math.round(input.acertos), 0), 10);
  const speedFactor = Math.round(((QUEST_SEGUNDOS - tempo) / QUEST_SEGUNDOS) * 100) / 100;
  const accuracyFactor = Math.round((acertos / 10) * 100) / 100;
  const score = Math.min(
    Math.max(Math.round(speedFactor * accuracyFactor * 100) / 100, 0),
    MAX_PONTOS_QUEST,
  );

  const fim = new Date();
  const inicio = new Date(fim.getTime() - tempo * 1000);

  const { error } = await supabaseAdmin
    .from("participantes")
    .update({
      quest_inicio: inicio.toISOString(),
      quest_fim: fim.toISOString(),
      quest_tempo_segundos: tempo,
      quest_acertos: acertos,
      quest_erros: Math.max(Math.round(input.erros), 0),
      quest_nao_respondidas: Math.max(Math.round(input.naoRespondidas), 0),
      quest_speed_factor: speedFactor,
      quest_accuracy_factor: accuracyFactor,
      quest_score: score,
      // Compatibilidade com relatórios anteriores da missão.
      missao_concluida: true,
      tempo_missao_segundos: tempo,
      pontos_missao: score,
    })
    .eq("id", input.participanteId);

  if (error) return { ok: false, score: 0, mensagem: "Não foi possível salvar o Quest." };

  if (input.respostas.length > 0) {
    await supabaseAdmin
      .from("quest_respostas")
      .delete()
      .eq("participante_id", input.participanteId);
    await supabaseAdmin.from("quest_respostas").insert(
      input.respostas.slice(0, 10).map((r) => ({
        participante_id: input.participanteId,
        questao_id: r.questaoId,
        ordem: r.ordem,
        alternativa_selecionada: r.selecionada,
        resposta_correta: r.correta,
        correta: r.acertou,
        tempo_segundos: Math.max(r.tempoSegundos, 0),
      })),
    );
  }

  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: `Quest concluído: ${acertos}/10 em ${tempo}s (+${score} ponto).`,
    participanteId: input.participanteId,
    metadata: { acertos, tempo, speedFactor, accuracyFactor, score },
  });

  return { ok: true, score, mensagem: "Quest registrado." };
}
