import { useCallback, useEffect, useState } from "react";

import { SyncService } from "@/services/sync.service";

/**
 * Estado da conexão + sincronização automática da fila offline.
 * A operação nunca é interrompida: o indicador é apenas informativo.
 */
export function useConexao() {
  const [online, setOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const atualizarPendentes = useCallback(() => setPendentes(SyncService.pendentes()), []);

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine || SyncService.pendentes() === 0) return;
    setSincronizando(true);
    try {
      await SyncService.sincronizar();
    } finally {
      setSincronizando(false);
      setPendentes(SyncService.pendentes());
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    atualizarPendentes();

    const aoConectar = () => {
      setOnline(true);
      void sincronizar();
    };
    const aoDesconectar = () => setOnline(false);

    window.addEventListener("online", aoConectar);
    window.addEventListener("offline", aoDesconectar);
    const intervalo = window.setInterval(() => {
      setOnline(navigator.onLine);
      atualizarPendentes();
      void sincronizar();
    }, 15_000);

    void sincronizar();

    return () => {
      window.removeEventListener("online", aoConectar);
      window.removeEventListener("offline", aoDesconectar);
      window.clearInterval(intervalo);
    };
  }, [atualizarPendentes, sincronizar]);

  return { online, pendentes, sincronizando, sincronizar, atualizarPendentes };
}
