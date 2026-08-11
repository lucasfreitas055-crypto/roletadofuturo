/**
 * Ranking Ao Vivo — camada de leitura (SERVIDOR APENAS).
 *
 * Somente leitura: nenhuma função deste arquivo altera pontuação,
 * posições ou participantes. Todo o agregado é calculado aqui para que
 * o painel de TV faça uma única requisição por ciclo.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { garantirEventoAtivoId } from "@/database/evento-atual.server";

export interface LinhaEquipeAoVivo {
  equipe: string;
  nome: string;
  corHex: string;
  participantes: number;
  indicacoes: number;
  pontosQuest: number;
  pontuacao: number;
  posicao: number;
}

export interface LinhaIndividualAoVivo {
  id: string;
  nome: string;
  equipe: string;
  pontuacao: number;
  indicacoes: number;
  questScore: number;
  posicao: number;
}

export interface RecordesAoVivo {
  melhorPontuacao: { nome: string; equipe: string; valor: number } | null;
  maisIndicacoes: { nome: string; equipe: string; valor: number } | null;
  melhorTempoLatas: { nome: string; equipe: string; segundos: number } | null;
}

export interface EstatisticasAoVivo {
  participantes: number;
  equipes: number;
  mediaPontuacao: number;
  mediaIndicacoes: number;
  maiorPontuacao: number;
  melhorTempoSegundos: number | null;
}

export interface RankingAoVivoPayload {
  atualizadoEm: string;
  equipes: LinhaEquipeAoVivo[];
  individual: LinhaIndividualAoVivo[];
  ultimos: LinhaIndividualAoVivo[];
  recordes: RecordesAoVivo;
  estatisticas: EstatisticasAoVivo;
}

/** Limite de leitura — protege o painel mesmo com milhares de participantes. */
const LIMITE_LEITURA = 5000;
/** Quantidade exibida no ranking individual da TV. */
const TOP_INDIVIDUAL = 20;

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Um único round-trip com todos os dados do painel.
 * Ordenação individual com desempate: pontuação → indicações válidas →
 * pontuação da habilidade → quem concluiu primeiro.
 */
export async function obterRankingAoVivo(): Promise<RankingAoVivoPayload> {
  const eventoId = await garantirEventoAtivoId();
  const [placar, pessoas] = await Promise.all([
    supabaseAdmin.from("vw_ranking_pontuacao").select("*"),
    supabaseAdmin
      .from("participantes")
      .select(
        "id, nome, equipe, total_score, quest_score, quantidade_indicacoes, tempo_missao_segundos, habilidade_sorteada, updated_at, created_at",
      )
      .eq("evento_id", eventoId)
      .order("total_score", { ascending: false })
      .limit(LIMITE_LEITURA),
  ]);

  if (placar.error) throw new Error(placar.error.message);
  if (pessoas.error) throw new Error(pessoas.error.message);

  const equipes: LinhaEquipeAoVivo[] = (placar.data ?? [])
    .map((linha) => ({
      equipe: String(linha.equipe ?? ""),
      nome: linha.nome ?? "",
      corHex: linha.cor_hex ?? "#888888",
      participantes: Number(linha.participantes ?? 0),
      indicacoes: Number(linha.indicacoes_validas ?? 0),
      pontosQuest: arredondar(Number(linha.pontos_quest ?? 0)),
      pontuacao: arredondar(Number(linha.pontuacao ?? 0)),
      posicao: 0,
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao || b.participantes - a.participantes)
    .map((linha, indice) => ({ ...linha, posicao: indice + 1 }));

  const brutos = (pessoas.data ?? []).map((p) => ({
    id: String(p.id),
    nome: p.nome ?? "",
    equipe: String(p.equipe ?? ""),
    pontuacao: arredondar(Number(p.total_score ?? 0)),
    indicacoes: Number(p.quantidade_indicacoes ?? 0),
    questScore: arredondar(Number(p.quest_score ?? 0)),
    tempoLatas:
      p.habilidade_sorteada === "INTELIGENCIA_EMOCIONAL" && Number(p.tempo_missao_segundos ?? 0) > 0
        ? Number(p.tempo_missao_segundos)
        : null,
    concluidoEm: String(p.updated_at ?? p.created_at ?? ""),
  }));

  const ordenados = [...brutos].sort(
    (a, b) =>
      b.pontuacao - a.pontuacao ||
      b.indicacoes - a.indicacoes ||
      b.questScore - a.questScore ||
      a.concluidoEm.localeCompare(b.concluidoEm),
  );

  const individual: LinhaIndividualAoVivo[] = ordenados
    .slice(0, TOP_INDIVIDUAL)
    .map((p, indice) => ({
      id: p.id,
      nome: p.nome,
      equipe: p.equipe,
      pontuacao: p.pontuacao,
      indicacoes: p.indicacoes,
      questScore: p.questScore,
      posicao: indice + 1,
    }));

  const ultimos: LinhaIndividualAoVivo[] = [...brutos]
    .sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm))
    .slice(0, 5)
    .map((p, indice) => ({
      id: p.id,
      nome: p.nome,
      equipe: p.equipe,
      pontuacao: p.pontuacao,
      indicacoes: p.indicacoes,
      questScore: p.questScore,
      posicao: indice + 1,
    }));

  const total = brutos.length;
  const somaPontos = brutos.reduce((s, p) => s + p.pontuacao, 0);
  const somaIndicacoes = brutos.reduce((s, p) => s + p.indicacoes, 0);

  const topPontos = ordenados[0] ?? null;
  const topIndicacoes = [...brutos].sort((a, b) => b.indicacoes - a.indicacoes)[0] ?? null;
  const melhorLatas =
    brutos
      .filter((p) => p.tempoLatas !== null)
      .sort((a, b) => (a.tempoLatas ?? 0) - (b.tempoLatas ?? 0))[0] ?? null;

  return {
    atualizadoEm: new Date().toISOString(),
    equipes,
    individual,
    ultimos,
    recordes: {
      melhorPontuacao:
        topPontos && topPontos.pontuacao > 0
          ? { nome: topPontos.nome, equipe: topPontos.equipe, valor: topPontos.pontuacao }
          : null,
      maisIndicacoes:
        topIndicacoes && topIndicacoes.indicacoes > 0
          ? {
              nome: topIndicacoes.nome,
              equipe: topIndicacoes.equipe,
              valor: topIndicacoes.indicacoes,
            }
          : null,
      melhorTempoLatas: melhorLatas
        ? {
            nome: melhorLatas.nome,
            equipe: melhorLatas.equipe,
            segundos: melhorLatas.tempoLatas ?? 0,
          }
        : null,
    },
    estatisticas: {
      participantes: total,
      equipes: equipes.length,
      mediaPontuacao: total ? arredondar(somaPontos / total) : 0,
      mediaIndicacoes: total ? arredondar(somaIndicacoes / total) : 0,
      maiorPontuacao: topPontos?.pontuacao ?? 0,
      melhorTempoSegundos: melhorLatas?.tempoLatas ?? null,
    },
  };
}
