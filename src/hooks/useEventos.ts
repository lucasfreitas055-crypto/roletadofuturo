import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EventoResumido, LogEvento, ResetResumido } from "@/database/eventos.server";
import {
  criarNovoEventoPublico,
  duplicarEventoPublico,
  encerrarEventoPublico,
  limparDadosEventoPublico,
  listarResetsPublico,
  moverEventoParaLixeiraPublico,
  obterArquivoEventoPublico,
  obterPainelEventos,
  renomearEventoPublico,
  restaurarEventoPublico,
  restaurarResetPublico,
} from "@/lib/eventos.functions";
import { alternarModoTestePublico } from "@/lib/modo-teste.functions";
import { PainelService } from "@/services/painel.service";

const VAZIO: { ativo: EventoResumido | null; eventos: EventoResumido[]; logs: LogEvento[] } = {
  ativo: null,
  eventos: [],
  logs: [],
};

export function usePainelEventos() {
  const consulta = useQuery({
    queryKey: ["eventos", "painel"],
    queryFn: () => obterPainelEventos(),
    refetchInterval: 15000,
    placeholderData: (anterior) => anterior,
  });
  return { ...consulta, dados: consulta.data ?? VAZIO };
}

export function useArquivoEvento(eventoId: string | null) {
  return useQuery({
    queryKey: ["eventos", "arquivo", eventoId],
    queryFn: () => obterArquivoEventoPublico({ data: { eventoId: eventoId as string } }),
    enabled: Boolean(eventoId),
    staleTime: 30000,
  });
}

export function useAcoesEventos(usuario = "operador") {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["eventos"] });

  const encerrar = useMutation({
    mutationFn: (entrada?: { nomeNovoEvento?: string | null }) =>
      encerrarEventoPublico({ data: { usuario, nomeNovoEvento: entrada?.nomeNovoEvento ?? null } }),
    onSuccess: invalidar,
  });

  const duplicar = useMutation({
    mutationFn: () => duplicarEventoPublico({ data: { usuario } }),
    onSuccess: invalidar,
  });

  const renomear = useMutation({
    mutationFn: (entrada: { eventoId: string; nome: string }) =>
      renomearEventoPublico({ data: entrada }),
    onSuccess: invalidar,
  });

  const lixeira = useMutation({
    mutationFn: (eventoId: string) =>
      moverEventoParaLixeiraPublico({ data: { eventoId, usuario } }),
    onSuccess: invalidar,
  });

  const restaurar = useMutation({
    mutationFn: (eventoId: string) => restaurarEventoPublico({ data: { eventoId, usuario } }),
    onSuccess: invalidar,
  });

  const novoEvento = useMutation({
    mutationFn: (nome: string) => criarNovoEventoPublico({ data: { nome, usuario } }),
    onSuccess: invalidar,
  });

  const limparDados = useMutation({
    mutationFn: (eventoId: string) => limparDadosEventoPublico({ data: { eventoId, usuario } }),
    onSuccess: () => {
      invalidar();
      void queryClient.invalidateQueries({ queryKey: ["comercial"] });
      void queryClient.invalidateQueries({ queryKey: ["eventos", "resets"] });
    },
  });

  const restaurarReset = useMutation({
    mutationFn: (resetId: string) => restaurarResetPublico({ data: { resetId, usuario } }),
    onSuccess: () => {
      invalidar();
      void queryClient.invalidateQueries({ queryKey: ["comercial"] });
      void queryClient.invalidateQueries({ queryKey: ["eventos", "resets"] });
    },
  });

  return {
    encerrar,
    duplicar,
    renomear,
    lixeira,
    restaurar,
    novoEvento,
    limparDados,
    restaurarReset,
  };
}

/** Modo Teste — leitura pública + atalho de alternância, sem exigir login
 * (mesmo padrão de acesso do resto do Dashboard Comercial). */
export function useModoTeste() {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["config", "publica"],
    queryFn: () => PainelService.configPublica(),
    staleTime: 10000,
    refetchInterval: 10000,
  });

  const alternar = useMutation({
    mutationFn: (ligar: boolean) => alternarModoTestePublico({ data: { ligar } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["config", "publica"] });
      void queryClient.invalidateQueries({ queryKey: ["painel", "config"] });
    },
  });

  return { modoTeste: consulta.data?.modo === "TESTE", consulta, alternar };
}

/** Histórico de resets — cada limpeza pode ser restaurada. */
export function useResets() {
  const consulta = useQuery({
    queryKey: ["eventos", "resets"],
    queryFn: () => listarResetsPublico(),
    refetchInterval: 20000,
    placeholderData: (anterior) => anterior,
  });
  return { ...consulta, resets: consulta.data ?? ([] as ResetResumido[]) };
}
