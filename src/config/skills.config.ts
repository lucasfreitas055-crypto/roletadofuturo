/**
 * Roleta das Habilidades — os cinco pilares da metodologia Mister Wiz.
 *
 * Alterar apenas este arquivo para trocar habilidades, cores, ícones,
 * descrições ou missões em campanhas futuras.
 */

export type HabilidadeCodigo =
  "INGLES" | "LIDERANCA" | "EMPREENDEDORISMO" | "EDUCACAO_FINANCEIRA" | "INTELIGENCIA_EMOCIONAL";

export interface SkillConfig {
  readonly codigo: HabilidadeCodigo;
  readonly nome: string;
  readonly icone: string;
  /** Token de cor do design system (nunca hex solto em componentes). */
  readonly corVar: string;
  readonly descricao: string;
  readonly missao: string;
  readonly exemplos: readonly string[];
  readonly tempo: string;
}

export const SKILLS: readonly SkillConfig[] = [
  {
    codigo: "INGLES",
    nome: "Inglês",
    icone: "🇺🇸",
    corVar: "var(--skill-ingles)",
    descricao: "Comunicação em inglês na prática, sem medo de errar.",
    missao: "Encontre os objetos corretos utilizando comandos em inglês.",
    exemplos: ["Find the book.", "Touch the apple.", "Point to the dog."],
    tempo: "30 segundos",
  },
  {
    codigo: "LIDERANCA",
    nome: "Liderança",
    icone: "👑",
    corVar: "var(--skill-lideranca)",
    descricao: "Guiar pessoas com clareza, escuta e confiança.",
    missao:
      "Conduza uma pessoa para completar um desafio utilizando apenas sua comunicação e liderança.",
    exemplos: ["Orientar outra pessoa a montar uma torre ou percorrer um pequeno percurso."],
    tempo: "30 a 60 segundos",
  },
  {
    codigo: "EMPREENDEDORISMO",
    nome: "Empreendedorismo",
    icone: "💡",
    corVar: "var(--skill-empreendedorismo)",
    descricao: "Criar, apresentar e defender boas ideias.",
    missao: "Apresente uma ideia criativa ou venda um objeto utilizando sua criatividade.",
    exemplos: [
      "Vender simbolicamente um clipe, criar um nome para uma empresa ou convencer o monitor sobre sua ideia.",
    ],
    tempo: "30 a 60 segundos",
  },
  {
    codigo: "EDUCACAO_FINANCEIRA",
    nome: "Educação Financeira",
    icone: "💰",
    corVar: "var(--skill-financeira)",
    descricao: "Decidir com consciência usando o dinheiro disponível.",
    missao: "Faça escolhas inteligentes utilizando um orçamento fictício.",
    exemplos: ["Comprar produtos sem ultrapassar um valor disponível."],
    tempo: "30 a 60 segundos",
  },
  {
    codigo: "INTELIGENCIA_EMOCIONAL",
    nome: "Inteligência Emocional",
    icone: "❤️",
    corVar: "var(--skill-emocional)",
    descricao: "Atenção, calma e concentração sob pressão.",
    missao:
      "Reproduza corretamente a sequência dos copos coloridos mantendo atenção, calma e concentração.",
    exemplos: [
      "Na parte superior haverá cinco copos coloridos. Na parte inferior, os mesmos cinco copos estarão em outra ordem.",
      "Reorganize os copos superiores para que fiquem exatamente iguais aos inferiores.",
    ],
    tempo: "30 a 60 segundos",
  },
] as const;

export function getSkill(codigo: HabilidadeCodigo): SkillConfig {
  const skill = SKILLS.find((s) => s.codigo === codigo);
  if (!skill) throw new Error(`Habilidade desconhecida: ${codigo}`);
  return skill;
}

/** Sorteio uniforme entre as cinco habilidades — decidido antes da animação. */
export function sortearHabilidade(): SkillConfig {
  const indice = Math.floor(Math.random() * SKILLS.length);
  return SKILLS[indice] ?? SKILLS[0]!;
}
