/**
 * Sorteio inteligente da Roleta das Habilidades.
 *
 * Mantém a distribuição equilibrada entre os cinco pilares: habilidades que
 * apareceram menos ganham peso maior. O participante nunca percebe o ajuste —
 * a animação continua idêntica.
 */

import { SKILLS, type HabilidadeCodigo, type SkillConfig } from "@/config/skills.config";

const CHAVE = "mw:distribuicao-habilidades:v1";

export type Distribuicao = Record<string, number>;

const disponivel = () => typeof window !== "undefined" && Boolean(window.localStorage);

export function lerDistribuicaoLocal(): Distribuicao {
  if (!disponivel()) return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Distribuicao) : {};
  } catch {
    return {};
  }
}

export function registrarSorteioLocal(codigo: HabilidadeCodigo): void {
  if (!disponivel()) return;
  const atual = lerDistribuicaoLocal();
  try {
    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({ ...atual, [codigo]: (atual[codigo] ?? 0) + 1 }),
    );
  } catch {
    /* ignora */
  }
}

/** Une a contagem do servidor com a contagem local (inclui giros offline). */
export function combinarDistribuicao(remota: Distribuicao | null | undefined): Distribuicao {
  const local = lerDistribuicaoLocal();
  const total: Distribuicao = {};
  for (const skill of SKILLS) {
    total[skill.codigo] = (remota?.[skill.codigo] ?? 0) + (local[skill.codigo] ?? 0);
  }
  return total;
}

/**
 * Sorteio ponderado: peso = (maior contagem + 1) − contagem da habilidade.
 * Quem está atrás aparece mais, sem nunca zerar a chance de ninguém.
 */
export function sortearEquilibrado(distribuicao: Distribuicao): SkillConfig {
  const contagens = SKILLS.map((s) => distribuicao[s.codigo] ?? 0);
  const maior = Math.max(...contagens, 0);
  const pesos = contagens.map((c) => Math.max(0.25, maior + 1 - c));
  const soma = pesos.reduce((a, b) => a + b, 0);

  let sorteio = Math.random() * soma;
  for (let i = 0; i < SKILLS.length; i += 1) {
    sorteio -= pesos[i] ?? 0;
    if (sorteio <= 0) return SKILLS[i]!;
  }
  return SKILLS[SKILLS.length - 1]!;
}
