import { useCallback, useEffect, useState } from "react";

import { definirMudo, estaMudo, inscreverMudo } from "@/lib/skill-audio";

/** Preferência global de som do totem — persistida entre participantes. */
export function useSom(): { mudo: boolean; alternar: () => void } {
  const [mudo, setMudo] = useState(false);

  useEffect(() => {
    setMudo(estaMudo());
    return inscreverMudo(setMudo);
  }, []);

  const alternar = useCallback(() => {
    definirMudo(!estaMudo());
  }, []);

  return { mudo, alternar };
}
