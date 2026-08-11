/**
 * Desafio das Latas — habilidade Inteligência Emocional.
 *
 * Não há quiz: o desafio é físico. O sistema apenas controla o tempo
 * e calcula a pontuação oficial (máximo de 1,0 ponto).
 */

export const DESAFIO_MAX_SEGUNDOS = 300; // 05:00

/** Tabela oficial: quanto menor o tempo, maior a pontuação. */
export function pontuacaoDesafioLatas(segundos: number): number {
  const t = Math.max(0, Math.floor(segundos));
  if (t >= DESAFIO_MAX_SEGUNDOS) return 0;
  if (t <= 30) return 1;
  if (t <= 60) return 0.9;
  if (t <= 90) return 0.8;
  if (t <= 120) return 0.7;
  if (t <= 150) return 0.6;
  if (t <= 180) return 0.5;
  if (t <= 210) return 0.4;
  if (t <= 240) return 0.3;
  if (t <= 270) return 0.2;
  return 0.1; // 04:31 até 04:59
}

/** 125 → "02:05" */
export function formatarCronometro(segundos: number): string {
  const s = Math.min(Math.max(0, Math.floor(segundos)), DESAFIO_MAX_SEGUNDOS);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
