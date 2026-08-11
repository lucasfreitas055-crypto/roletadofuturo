import { useCallback, useEffect, useRef, useState } from "react";

import { SKILLS, sortearHabilidade, type SkillConfig } from "@/config/skills.config";
import {
  definirMudo,
  iniciarLoopGiro,
  pararLoopGiro,
  resetarAudio,
  tocarTic,
  tocarVitoria,
} from "@/lib/skill-audio";

const DURACAO_MS = 5600;
const VOLTAS = 6;
const SETOR = 360 / SKILLS.length;

/** Aceleração curta seguida de desaceleração longa. */
function easing(p: number): number {
  if (p < 0.15) return 0.04 * Math.pow(p / 0.15, 2);
  const q = (p - 0.15) / 0.85;
  return 0.04 + 0.96 * (1 - Math.pow(1 - q, 4));
}

export interface UseSkillWheel {
  readonly girando: boolean;
  readonly rotacao: number;
  readonly resultado: SkillConfig | null;
  readonly mudo: boolean;
  readonly girar: () => void;
  readonly alternarMudo: () => void;
  readonly resetar: () => void;
}

/**
 * Sorteio → ângulo → animação. O resultado é decidido antes do giro,
 * garantindo que a habilidade mostrada seja exatamente a habilidade salva.
 * Um único requestAnimationFrame por giro, sem listeners duplicados.
 */
export function useSkillWheel(
  onFinish: (skill: SkillConfig) => void,
  /** Sorteio customizado (ex.: distribuição equilibrada). */
  sorteador?: () => SkillConfig,
): UseSkillWheel {
  const [girando, setGirando] = useState(false);
  const [rotacao, setRotacao] = useState(0);
  const [resultado, setResultado] = useState<SkillConfig | null>(null);
  const [mudo, setMudo] = useState(false);

  const rafRef = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const sorteioRef = useRef<(() => SkillConfig) | undefined>(sorteador);
  sorteioRef.current = sorteador;

  const pararRaf = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(
    () => () => {
      pararRaf();
      resetarAudio();
    },
    [pararRaf],
  );

  const girar = useCallback(() => {
    if (rafRef.current !== null) return;
    const escolhida = (sorteioRef.current ?? sortearHabilidade)();
    const indice = SKILLS.findIndex((s) => s.codigo === escolhida.codigo);

    setGirando(true);
    setResultado(null);
    iniciarLoopGiro();

    const inicioRotacao = rotacao % 360;
    const alvo = 360 * VOLTAS - (indice * SETOR + SETOR / 2);
    const delta = alvo - inicioRotacao;
    const inicio = performance.now();
    let ultimoSetor = -1;

    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / DURACAO_MS);
      const atual = inicioRotacao + delta * easing(p);
      setRotacao(atual);

      const setorAtual = Math.floor(atual / SETOR);
      if (setorAtual !== ultimoSetor) {
        ultimoSetor = setorAtual;
        if (p > 0.05) tocarTic();
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(passo);
        return;
      }
      rafRef.current = null;
      pararLoopGiro();
      tocarVitoria();
      setGirando(false);
      setResultado(escolhida);
      finishRef.current(escolhida);
    };

    rafRef.current = requestAnimationFrame(passo);
  }, [rotacao]);

  const alternarMudo = useCallback(() => {
    setMudo((m) => {
      definirMudo(!m);
      return !m;
    });
  }, []);

  const resetar = useCallback(() => {
    pararRaf();
    resetarAudio();
    setGirando(false);
    setResultado(null);
    setRotacao(0);
  }, [pararRaf]);

  return { girando, rotacao, resultado, mudo, girar, alternarMudo, resetar };
}
