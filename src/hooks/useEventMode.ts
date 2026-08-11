import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EVENT_CONFIG } from "@/config/event.config";

/**
 * EVENT_MODE — a aplicação fica aberta durante horas no mesmo terminal.
 *
 * Este hook garante:
 * - nenhum recarregamento de página;
 * - estado global do evento preservado;
 * - limpeza apenas dos dados do participante atual;
 * - um único timer por sessão (sem timers/listeners duplicados).
 */
export interface EstadoEvento {
  readonly ativo: boolean;
  readonly participacoesNestaSessao: number;
  readonly iniciadoEm: number;
}

export function useEventMode(aoLimpar?: () => void) {
  const ativo = EVENT_CONFIG.EVENT_MODE;
  const iniciadoEm = useRef<number>(Date.now());
  const [participacoesNestaSessao, setParticipacoes] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aoLimparRef = useRef(aoLimpar);

  useEffect(() => {
    aoLimparRef.current = aoLimpar;
  }, [aoLimpar]);

  const cancelarTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Limpa somente o participante atual — nunca o estado do evento. */
  const limparParticipanteAtual = useCallback(() => {
    cancelarTimer();
    aoLimparRef.current?.();
  }, [cancelarTimer]);

  /** Agenda a limpeza automática do terminal após o tempo configurado. */
  const agendarLimpeza = useCallback(
    (ms: number = EVENT_CONFIG.autoResetMs) => {
      cancelarTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        aoLimparRef.current?.();
      }, ms);
    },
    [cancelarTimer],
  );

  const registrarParticipacao = useCallback(() => {
    setParticipacoes((n) => n + 1);
  }, []);

  // Evita fechar/recarregar a aba acidentalmente durante o evento.
  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [ativo]);

  useEffect(() => cancelarTimer, [cancelarTimer]);

  const estado: EstadoEvento = useMemo(
    () => ({ ativo, participacoesNestaSessao, iniciadoEm: iniciadoEm.current }),
    [ativo, participacoesNestaSessao],
  );

  return {
    estado,
    config: EVENT_CONFIG,
    limparParticipanteAtual,
    agendarLimpeza,
    cancelarLimpeza: cancelarTimer,
    registrarParticipacao,
  };
}
