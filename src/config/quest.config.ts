/**
 * Quest Mister Wiz — motor de regras do jogo de 10 perguntas.
 *
 * Este arquivo concentra: faixas etárias, formato das questões,
 * seleção sem repetição e o cálculo de pontuação (velocidade × precisão).
 * Os bancos de perguntas ficam FORA daqui (tabela `questoes` no banco
 * e `src/data/question-bank.ts` como reserva offline).
 */

import type { HabilidadeCodigo } from "@/config/skills.config";

export const QUEST_TOTAL_QUESTOES = 10;
export const QUEST_SEGUNDOS = 240;
export const MAX_PONTOS_QUEST = 1;
export const QUEST_QUESTOES_RODADA_CURTA = 4;

/* ------------------------------ Faixas etárias ----------------------------- */

export type FaixaEtaria = 1 | 2 | 3 | 4;

export interface FaixaEtariaConfig {
  readonly nivel: FaixaEtaria;
  readonly idadeMin: number;
  readonly idadeMax: number;
  readonly rotulo: string;
}

export const FAIXAS_ETARIAS: readonly FaixaEtariaConfig[] = [
  { nivel: 1, idadeMin: 3, idadeMax: 8, rotulo: "3 a 8 anos" },
  { nivel: 2, idadeMin: 9, idadeMax: 11, rotulo: "9 a 11 anos" },
  { nivel: 3, idadeMin: 12, idadeMax: 14, rotulo: "12 a 14 anos" },
  { nivel: 4, idadeMin: 15, idadeMax: 18, rotulo: "15 a 18 anos" },
] as const;

/**
 * Quantas perguntas cada participação sorteia, por habilidade e faixa.
 * Inglês 3–8 / 9–11 e Liderança 3–8 usam 4 perguntas (bancos de 30,
 * rodada curta e divertida).
 */
export function questoesPorParticipacao(habilidade: HabilidadeCodigo, faixa: FaixaEtaria): number {
  void faixa;
  const COM_RODADA_CURTA: readonly HabilidadeCodigo[] = [
    "INGLES",
    "LIDERANCA",
    "EMPREENDEDORISMO",
    "EDUCACAO_FINANCEIRA",
  ];
  return COM_RODADA_CURTA.includes(habilidade) ? QUEST_QUESTOES_RODADA_CURTA : QUEST_TOTAL_QUESTOES;
}

/** O participante nunca escolhe o nível: ele vem da idade cadastrada. */
export function faixaEtariaPorIdade(idade: number | null | undefined): FaixaEtaria {
  if (idade === null || idade === undefined || Number.isNaN(idade)) return 2;
  if (idade <= 8) return 1;
  if (idade <= 11) return 2;
  if (idade <= 14) return 3;
  return 4;
}

export function rotuloFaixa(nivel: FaixaEtaria): string {
  return FAIXAS_ETARIAS.find((f) => f.nivel === nivel)?.rotulo ?? "";
}

/* --------------------------------- Questões -------------------------------- */

export type Alternativa = "A" | "B" | "C" | "D" | "E";

export const ALTERNATIVAS: readonly Alternativa[] = ["A", "B", "C", "D", "E"] as const;

/** Categoria temática usada para equilibrar o sorteio dentro de um banco. */
export type CategoriaQuestao = "SITUACAO" | "CONCEITO" | "GRANDES_LIDERES" | "GERAL";

export interface Questao {
  readonly id: string;
  readonly categoria?: CategoriaQuestao;
  readonly habilidade: HabilidadeCodigo;
  readonly faixaEtaria: FaixaEtaria;
  readonly dificuldade: number;
  readonly enunciado: string;
  readonly imagem?: string | null;
  readonly alternativas: Readonly<Record<Alternativa, string>>;
  readonly respostaCorreta: Alternativa;
  readonly explicacaoCurta?: string | null;
}

/**
 * Categoria da questão. Quando o banco não traz o campo (ex.: linhas antigas
 * do banco de dados), ela é deduzida do id — `lid-1-sit-01`, `-con-`, `-gra-`.
 */
export function categoriaQuestao(q: Questao): CategoriaQuestao {
  if (q.categoria) return q.categoria;
  if (q.id.includes("-sit-")) return "SITUACAO";
  if (q.id.includes("-con-")) return "CONCEITO";
  if (q.id.includes("-gra-")) return "GRANDES_LIDERES";
  return "GERAL";
}

/** Uma questão só entra no jogo com cinco alternativas e um gabarito válido. */
export function questaoValida(q: Questao): boolean {
  const textos = ALTERNATIVAS.map((letra) => q.alternativas[letra]);
  return (
    textos.every((t) => typeof t === "string" && t.trim().length > 0) &&
    ALTERNATIVAS.includes(q.respostaCorreta)
  );
}

function embaralhar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copia[i]!;
    copia[i] = copia[j]!;
    copia[j] = a;
  }
  return copia;
}

/** Embaralha as cinco alternativas mantendo o gabarito vinculado ao texto certo. */
export function embaralharAlternativas(q: Questao): Questao {
  const textoCorreto = q.alternativas[q.respostaCorreta];
  const textos = embaralhar(ALTERNATIVAS.map((letra) => q.alternativas[letra]));
  const alternativas = {} as Record<Alternativa, string>;
  let respostaCorreta: Alternativa = q.respostaCorreta;
  ALTERNATIVAS.forEach((letra, i) => {
    const texto = textos[i]!;
    alternativas[letra] = texto;
    if (texto === textoCorreto) respostaCorreta = letra;
  });
  return { ...q, alternativas, respostaCorreta };
}

/**
 * Embaralha e devolve até `quantidade` questões únicas (sem repetição).
 * Quando o banco tem mais de uma categoria (ex.: Liderança 3–8 anos, com
 * situações práticas, conceitos e grandes líderes), o sorteio alterna entre
 * elas para que o participante não receba tudo do mesmo tipo.
 */
export function sortearQuestoes(
  banco: readonly Questao[],
  quantidade = QUEST_TOTAL_QUESTOES,
): Questao[] {
  const validas = banco.filter(questaoValida);

  const grupos = new Map<CategoriaQuestao, Questao[]>();
  validas.forEach((q) => {
    const cat = categoriaQuestao(q);
    const atual = grupos.get(cat);
    if (atual) atual.push(q);
    else grupos.set(cat, [q]);
  });

  if (grupos.size <= 1) {
    return embaralhar(validas).slice(0, quantidade).map(embaralharAlternativas);
  }

  const filas = embaralhar([...grupos.values()]).map((lista) => embaralhar(lista));
  const escolhidas: Questao[] = [];
  let restam = true;
  while (escolhidas.length < quantidade && restam) {
    restam = false;
    for (const fila of filas) {
      if (escolhidas.length >= quantidade) break;
      const proxima = fila.pop();
      if (proxima) {
        escolhidas.push(proxima);
        restam = true;
      }
    }
  }

  return embaralhar(escolhidas).map(embaralharAlternativas);
}

/* -------------------------------- Respostas -------------------------------- */

export interface RespostaQuest {
  readonly questaoId: string;
  readonly ordem: number;
  readonly selecionada: Alternativa | null;
  readonly correta: Alternativa;
  readonly acertou: boolean;
  readonly tempoSegundos: number;
}

export interface ResultadoQuest {
  readonly acertos: number;
  readonly erros: number;
  readonly naoRespondidas: number;
  readonly tempoSegundos: number;
  readonly tempoRestante: number;
  readonly speedFactor: number;
  readonly accuracyFactor: number;
  readonly score: number;
}

function duasCasas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Pontuação do Quest = velocidade × precisão, limitada a 1 ponto.
 * Responder rápido sem acertar não pontua: a precisão derruba o total.
 */
export function calcularQuest(input: {
  respostas: readonly RespostaQuest[];
  tempoSegundos: number;
  totalQuestoes?: number;
}): ResultadoQuest {
  const total = input.totalQuestoes ?? QUEST_TOTAL_QUESTOES;
  const tempo = Math.min(Math.max(Math.round(input.tempoSegundos), 0), QUEST_SEGUNDOS);
  const restante = Math.max(QUEST_SEGUNDOS - tempo, 0);

  const acertos = input.respostas.filter((r) => r.acertou).length;
  const respondidas = input.respostas.filter((r) => r.selecionada !== null).length;
  const erros = respondidas - acertos;
  const naoRespondidas = Math.max(total - respondidas, 0);

  const speedFactor = duasCasas(restante / QUEST_SEGUNDOS);
  const accuracyFactor = duasCasas(acertos / total);
  const score = Math.min(Math.max(duasCasas(speedFactor * accuracyFactor), 0), MAX_PONTOS_QUEST);

  return {
    acertos,
    erros,
    naoRespondidas,
    tempoSegundos: tempo,
    tempoRestante: restante,
    speedFactor,
    accuracyFactor,
    score,
  };
}
