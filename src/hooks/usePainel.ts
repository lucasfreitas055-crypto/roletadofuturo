import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PainelService } from "@/services/painel.service";
import type { ConfiguracoesPainel, FiltroLeads } from "@/database/painel.server";

const OPCOES = { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } as const;

export function usePainelResumo() {
  return useQuery({
    queryKey: ["painel", "resumo"],
    queryFn: () => PainelService.resumo(),
    ...OPCOES,
  });
}

export function usePainelRanking() {
  return useQuery({
    queryKey: ["painel", "ranking"],
    queryFn: () => PainelService.ranking(),
    ...OPCOES,
  });
}

export function usePainelLeads(filtro: FiltroLeads) {
  const chave = useMemo(() => JSON.stringify(filtro), [filtro]);
  return useQuery({
    queryKey: ["painel", "leads", chave],
    queryFn: () => PainelService.leads(filtro),
    placeholderData: (anterior) => anterior,
    ...OPCOES,
  });
}

export function usePainelIndicacoes() {
  const queryClient = useQueryClient();
  const [participanteId, setParticipanteId] = useState<string | null>(null);

  const resumo = useQuery({
    queryKey: ["painel", "indicacoes"],
    queryFn: () => PainelService.indicacoes(),
    ...OPCOES,
  });

  const detalhe = useQuery({
    queryKey: ["painel", "indicacoes", participanteId],
    queryFn: async () => {
      const { IndicationService } = await import("@/services/indication.service");
      return IndicationService.listarPorParticipante(participanteId as string);
    },
    enabled: Boolean(participanteId),
    ...OPCOES,
  });

  const invalidar = useMutation({
    mutationFn: (input: { id: string; invalidar: boolean; motivo?: string }) =>
      PainelService.invalidarIndicacao(input.id, input.invalidar, input.motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["painel"] });
    },
  });

  return { resumo, detalhe, participanteId, setParticipanteId, invalidar };
}

export function usePainelConfig() {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["painel", "config"],
    queryFn: () => PainelService.config(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const salvar = useMutation({
    mutationFn: (entrada: Partial<ConfiguracoesPainel>) => PainelService.salvarConfig(entrada),
    onSuccess: (dados) => {
      queryClient.setQueryData(["painel", "config"], dados);
      void queryClient.invalidateQueries({ queryKey: ["config", "publica"] });
    },
  });

  return { consulta, salvar };
}

export function usePainelComercial() {
  return useQuery({
    queryKey: ["painel", "comercial"],
    queryFn: () => PainelService.comercial(),
    ...OPCOES,
  });
}

/** Configuração pública usada pelo terminal (inclui Modo Demonstração). */
export function useConfiguracaoPublica() {
  return useQuery({
    queryKey: ["config", "publica"],
    queryFn: () => PainelService.configPublica(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
