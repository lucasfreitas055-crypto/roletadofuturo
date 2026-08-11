/**
 * Sistema de pontuação da Gincana — máximo de 3 pontos por participante.
 *
 * • Participação válida............ +1 ponto
 * • Quest Mister Wiz............... até +1 ponto (velocidade × precisão)
 * • Indicações válidas............. até +1 ponto (10 × 0,1)
 */

export const PONTOS_PARTICIPACAO = 1;
export const PONTOS_POR_INDICACAO = 0.1;
export const MAX_INDICACOES = 10;
export const MAX_PONTOS_INDICACOES = 1;
export const MAX_PONTOS_QUEST = 1;
export const MAX_PONTOS_PARTICIPANTE = 3;

/** Pontos das indicações válidas, limitados a 1 ponto. */
export function pontosPorIndicacoes(validas: number): number {
  return Math.min(arredondar(validas * PONTOS_POR_INDICACAO), MAX_PONTOS_INDICACOES);
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export interface ResumoPontuacao {
  readonly participacao: number;
  readonly quest: number;
  readonly indicacoes: number;
  readonly total: number;
}

export function calcularPontuacao(input: {
  participacaoValida: boolean;
  pontosQuest: number;
  indicacoesValidas: number;
}): ResumoPontuacao {
  const participacao = input.participacaoValida ? PONTOS_PARTICIPACAO : 0;
  const quest = Math.min(Math.max(arredondar(input.pontosQuest), 0), MAX_PONTOS_QUEST);
  const indicacoes = pontosPorIndicacoes(input.indicacoesValidas);
  const total = Math.min(arredondar(participacao + quest + indicacoes), MAX_PONTOS_PARTICIPANTE);
  return { participacao, quest, indicacoes, total };
}

/** 2.15 → "2,15" — sempre com vírgula e sem zeros inúteis. */
export function formatarPontos(valor: number): string {
  return arredondar(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** 125 → "02:05" */
export function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
