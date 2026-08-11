import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  LinhaEquipeAoVivo,
  LinhaIndividualAoVivo,
  RankingAoVivoPayload,
} from "@/database/ranking-live.server";
import { obterRankingAoVivoPublico } from "@/lib/ranking-live.functions";

export interface Destaque {
  id: string;
  texto: string;
}

export interface Contribuicao {
  id: string;
  nome: string;
  equipe: string;
  pontos: number;
}

const VAZIO: RankingAoVivoPayload = {
  atualizadoEm: "",
  equipes: [],
  individual: [],
  ultimos: [],
  recordes: { melhorPontuacao: null, maisIndicacoes: null, melhorTempoLatas: null },
  estatisticas: {
    participantes: 0,
    equipes: 0,
    mediaPontuacao: 0,
    mediaIndicacoes: 0,
    maiorPontuacao: 0,
    melhorTempoSegundos: null,
  },
};

const formatarTempoCurto = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Painel de TV: atualiza a cada 1s sem recarregar a página e sem piscar
 * (mantém os dados anteriores enquanto a próxima resposta chega).
 * Detecta ganhos, ultrapassagens, recordes e contribuições individuais.
 */
export function useRankingAoVivo(intervaloMs = 1000) {
  const consulta = useQuery({
    queryKey: ["ranking", "aovivo", "tv"],
    queryFn: () => obterRankingAoVivoPublico(),
    refetchInterval: intervaloMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: (anterior) => anterior,
    retry: 1,
  });

  const dados = consulta.data ?? VAZIO;

  const [ganhos, setGanhos] = useState<Record<string, number>>({});
  const [subiram, setSubiram] = useState<Record<string, boolean>>({});
  const [destaque, setDestaque] = useState<Destaque | null>(null);
  const [contribuicao, setContribuicao] = useState<Contribuicao | null>(null);

  const pontosAnteriores = useRef<Record<string, number>>({});
  const posicoesAnteriores = useRef<Record<string, number>>({});
  const pontosPessoa = useRef<Record<string, number>>({});
  const topIndividualAnterior = useRef<string[]>([]);
  const recordeLatas = useRef<number | null>(null);
  const marcosEquipe = useRef<Record<string, number>>({});
  const marcosIndicacoes = useRef<Record<string, number>>({});
  const inicializado = useRef(false);
  const filaDestaques = useRef<Destaque[]>([]);
  const filaContribuicoes = useRef<Contribuicao[]>([]);

  /* ---------------- Detecção de eventos relevantes ---------------- */
  useEffect(() => {
    if (!dados.atualizadoEm) return;
    const primeiraCarga = !inicializado.current;
    const novosGanhos: Record<string, number> = {};
    const novasSubidas: Record<string, boolean> = {};

    for (const equipe of dados.equipes) {
      const antesPontos = pontosAnteriores.current[equipe.equipe];
      const antesPos = posicoesAnteriores.current[equipe.equipe];

      if (!primeiraCarga && antesPontos !== undefined && equipe.pontuacao > antesPontos) {
        novosGanhos[equipe.equipe] = Math.round((equipe.pontuacao - antesPontos) * 100) / 100;
      }
      if (!primeiraCarga && antesPos !== undefined && equipe.posicao < antesPos) {
        novasSubidas[equipe.equipe] = true;
        if (equipe.posicao === 1) {
          filaDestaques.current.push({
            id: `lider-${equipe.equipe}-${equipe.pontuacao}`,
            texto: ` ${equipe.nome} assumiu a liderança!`,
          });
        }
      }
      const marco = Math.floor(equipe.pontuacao / 100) * 100;
      const marcoAntes = marcosEquipe.current[equipe.equipe];
      if (!primeiraCarga && marco >= 100 && marcoAntes !== undefined && marco > marcoAntes) {
        filaDestaques.current.push({
          id: `marco-${equipe.equipe}-${marco}`,
          texto: ` ${equipe.nome} ultrapassou a marca de ${marco} pontos!`,
        });
      }
      marcosEquipe.current[equipe.equipe] = marco;
      pontosAnteriores.current[equipe.equipe] = equipe.pontuacao;
      posicoesAnteriores.current[equipe.equipe] = equipe.posicao;
    }

    /* Contribuições individuais + entrada no Top 3 */
    for (const pessoa of dados.ultimos) {
      const antes = pontosPessoa.current[pessoa.id];
      if (
        !primeiraCarga &&
        (antes === undefined || pessoa.pontuacao > antes) &&
        pessoa.pontuacao > 0
      ) {
        filaContribuicoes.current.push({
          id: `${pessoa.id}-${pessoa.pontuacao}`,
          nome: pessoa.nome,
          equipe: pessoa.equipe,
          pontos: pessoa.pontuacao,
        });
      }
      pontosPessoa.current[pessoa.id] = pessoa.pontuacao;
    }

    const top3 = dados.individual.slice(0, 3).map((p) => p.id);
    if (!primeiraCarga) {
      for (const pessoa of dados.individual.slice(0, 3)) {
        if (!topIndividualAnterior.current.includes(pessoa.id)) {
          filaDestaques.current.push({
            id: `top3-${pessoa.id}`,
            texto: ` ${pessoa.nome} entrou no Top 3 individual!`,
          });
        }
      }
      for (const pessoa of dados.individual) {
        const marcoAntes = marcosIndicacoes.current[pessoa.id];
        if (marcoAntes !== undefined && pessoa.indicacoes >= 10 && marcoAntes < 10) {
          filaDestaques.current.push({
            id: `ind10-${pessoa.id}`,
            texto: ` ${pessoa.nome} atingiu 10 indicações válidas!`,
          });
        }
      }
    }
    for (const pessoa of dados.individual) marcosIndicacoes.current[pessoa.id] = pessoa.indicacoes;
    topIndividualAnterior.current = top3;

    const tempo = dados.recordes.melhorTempoLatas?.segundos ?? null;
    if (
      !primeiraCarga &&
      tempo !== null &&
      (recordeLatas.current === null || tempo < recordeLatas.current)
    ) {
      filaDestaques.current.push({
        id: `latas-${tempo}`,
        texto: ` Novo recorde no Desafio das Latas: ${formatarTempoCurto(tempo)}!`,
      });
    }
    if (tempo !== null) recordeLatas.current = tempo;

    inicializado.current = true;

    if (Object.keys(novosGanhos).length > 0) setGanhos(novosGanhos);
    if (Object.keys(novasSubidas).length > 0) setSubiram(novasSubidas);
  }, [dados]);

  /* Ganhos brilham ~2s */
  useEffect(() => {
    if (Object.keys(ganhos).length === 0) return undefined;
    const t = window.setTimeout(() => setGanhos({}), 2000);
    return () => window.clearTimeout(t);
  }, [ganhos]);

  useEffect(() => {
    if (Object.keys(subiram).length === 0) return undefined;
    const t = window.setTimeout(() => setSubiram({}), 1800);
    return () => window.clearTimeout(t);
  }, [subiram]);

  /* Momento Destaque — 3s cada, um por vez */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setDestaque((atual) => {
        if (atual) return atual;
        return filaDestaques.current.shift() ?? null;
      });
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!destaque) return undefined;
    const t = window.setTimeout(() => setDestaque(null), 3000);
    return () => window.clearTimeout(t);
  }, [destaque]);

  /* Contribuição do rodapé — 4s cada, uma por vez */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setContribuicao((atual) => {
        if (atual) return atual;
        return filaContribuicoes.current.shift() ?? null;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!contribuicao) return undefined;
    const t = window.setTimeout(() => setContribuicao(null), 4000);
    return () => window.clearTimeout(t);
  }, [contribuicao]);

  const equipes: LinhaEquipeAoVivo[] = useMemo(() => dados.equipes, [dados.equipes]);
  const individual: LinhaIndividualAoVivo[] = useMemo(() => dados.individual, [dados.individual]);

  return {
    equipes,
    individual,
    ultimos: dados.ultimos,
    recordes: dados.recordes,
    estatisticas: dados.estatisticas,
    ganhos,
    subiram,
    destaque,
    contribuicao,
    carregando: consulta.isLoading && !consulta.data,
    offline: consulta.isError,
  };
}
