import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ComercialPayload,
  EventoHistorico,
  StatusComercial,
} from "@/database/comercial.server";
import {
  alterarStatusComercialPublico,
  obterDashboardComercialPublico,
  obterHistoricoComercialPublico,
  salvarObservacaoComercialPublico,
} from "@/lib/comercial.functions";

const VAZIO: ComercialPayload = { atualizadoEm: "", participantes: [], equipes: [] };

/** Leitura em tempo real do Dashboard Comercial (atualiza sozinho).
 * `eventoId` opcional permite visualizar outro evento (ex.: Área de Testes)
 * em vez do evento oficial ativo. */
export function useDashboardComercial(eventoId?: string | null) {
  const consulta = useQuery({
    queryKey: ["comercial", "dashboard", eventoId ?? "ativo"],
    queryFn: () => obterDashboardComercialPublico({ data: { eventoId: eventoId ?? null } }),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    placeholderData: (anterior) => anterior,
    staleTime: 2000,
  });

  return { ...consulta, dados: consulta.data ?? VAZIO };
}

export function useAcoesComercial() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["comercial", "dashboard"] });

  const status = useMutation({
    mutationFn: (entrada: { participanteId: string; status: StatusComercial }) =>
      alterarStatusComercialPublico({ data: entrada }),
    onSuccess: invalidar,
  });

  const observacao = useMutation({
    mutationFn: (entrada: { participanteId: string; observacoes: string }) =>
      salvarObservacaoComercialPublico({ data: entrada }),
    onSuccess: invalidar,
  });

  return { status, observacao };
}

export function useHistoricoComercial(participanteId: string | null) {
  return useQuery<EventoHistorico[]>({
    queryKey: ["comercial", "historico", participanteId],
    queryFn: () =>
      obterHistoricoComercialPublico({ data: { participanteId: participanteId as string } }),
    enabled: Boolean(participanteId),
    staleTime: 5000,
  });
}
