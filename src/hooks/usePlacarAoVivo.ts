import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { lerPlacarCache, salvarPlacarCache } from "@/lib/offline-queue";
import { obterPlacarPublico } from "@/lib/participacao.functions";

export interface LinhaPlacar {
  equipe: string;
  nome: string;
  corHex: string;
  participantes: number;
  indicacoes: number;
  pontosQuest: number;
  pontuacao: number;
  posicao: number;
}

/**
 * Placar ao vivo do totem. Mantém o último placar em cache local para
 * continuar exibindo mesmo sem internet, e detecta ganhos de pontuação
 * para animar os cards.
 */
export function usePlacarAoVivo(ativo = true) {
  const consulta = useQuery({
    queryKey: ["placar", "aovivo"],
    queryFn: () => obterPlacarPublico(),
    refetchInterval: ativo ? 12_000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: ativo,
  });

  const [linhas, setLinhas] = useState<LinhaPlacar[]>(() => lerPlacarCache<LinhaPlacar[]>() ?? []);
  const [ganhos, setGanhos] = useState<Record<string, number>>({});
  const anterior = useRef<Record<string, number>>({});

  useEffect(() => {
    const dados = consulta.data as LinhaPlacar[] | undefined;
    if (!dados) return;

    const novosGanhos: Record<string, number> = {};
    for (const linha of dados) {
      const antes = anterior.current[linha.equipe];
      if (antes !== undefined && linha.pontuacao > antes) {
        novosGanhos[linha.equipe] = Math.round((linha.pontuacao - antes) * 100) / 100;
      }
      anterior.current[linha.equipe] = linha.pontuacao;
    }

    setLinhas(dados);
    salvarPlacarCache(dados);

    if (Object.keys(novosGanhos).length > 0) {
      setGanhos(novosGanhos);
      const t = window.setTimeout(() => setGanhos({}), 2600);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [consulta.data]);

  return {
    linhas,
    ganhos,
    carregando: consulta.isLoading && linhas.length === 0,
    offline: consulta.isError,
  };
}
