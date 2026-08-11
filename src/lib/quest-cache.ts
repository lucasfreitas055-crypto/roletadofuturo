/**
 * Cache local das questões do Quest (offline first).
 * Assim que um banco é baixado, ele fica disponível mesmo sem internet.
 */

import type { FaixaEtaria, Questao } from "@/config/quest.config";
import type { HabilidadeCodigo } from "@/config/skills.config";

const PREFIXO = "mw:questoes:v1:";

const disponivel = () => typeof window !== "undefined" && Boolean(window.localStorage);

function chave(habilidade: HabilidadeCodigo, faixa: FaixaEtaria): string {
  return `${PREFIXO}${habilidade}:${faixa}`;
}

export function salvarQuestoesCache(
  habilidade: HabilidadeCodigo,
  faixa: FaixaEtaria,
  questoes: readonly Questao[],
): void {
  if (!disponivel() || questoes.length === 0) return;
  try {
    window.localStorage.setItem(chave(habilidade, faixa), JSON.stringify(questoes));
  } catch {
    /* armazenamento cheio — segue com as questões em memória */
  }
}

export function lerQuestoesCache(habilidade: HabilidadeCodigo, faixa: FaixaEtaria): Questao[] {
  if (!disponivel()) return [];
  try {
    const bruto = window.localStorage.getItem(chave(habilidade, faixa));
    return bruto ? (JSON.parse(bruto) as Questao[]) : [];
  } catch {
    return [];
  }
}
