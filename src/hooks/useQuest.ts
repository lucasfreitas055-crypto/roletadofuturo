import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  QUEST_SEGUNDOS,
  calcularQuest,
  type Alternativa,
  type Questao,
  type RespostaQuest,
  type ResultadoQuest,
} from "@/config/quest.config";

const FEEDBACK_MS = 650;

export interface UseQuest {
  readonly questaoAtual: Questao | null;
  readonly indice: number;
  readonly total: number;
  readonly restante: number;
  readonly feedback: "CORRETO" | "ERRADO" | null;
  readonly finalizado: boolean;
  readonly responder: (alternativa: Alternativa) => void;
}

/**
 * Motor do Quest: cronômetro regressivo único de 4 minutos, uma pergunta por
 * vez, sem alteração de resposta e encerramento automático em 00:00.
 * Todos os timers são limpos ao desmontar — nada vaza para o próximo participante.
 */
export function useQuest(
  questoes: readonly Questao[],
  onFinish: (resultado: ResultadoQuest, respostas: RespostaQuest[]) => void,
): UseQuest {
  const [indice, setIndice] = useState(0);
  const [restante, setRestante] = useState(QUEST_SEGUNDOS);
  const [feedback, setFeedback] = useState<"CORRETO" | "ERRADO" | null>(null);
  const [finalizado, setFinalizado] = useState(false);

  const respostasRef = useRef<RespostaQuest[]>([]);
  const ultimaMarcaRef = useRef<number>(Date.now());
  const inicioRef = useRef<number>(Date.now());
  const avancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizadoRef = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const total = questoes.length;

  const encerrar = useCallback(() => {
    if (finalizadoRef.current) return;
    finalizadoRef.current = true;
    setFinalizado(true);

    const decorrido = Math.min(Math.round((Date.now() - inicioRef.current) / 1000), QUEST_SEGUNDOS);
    const resultado = calcularQuest({
      respostas: respostasRef.current,
      tempoSegundos: decorrido,
      totalQuestoes: total,
    });
    finishRef.current(resultado, [...respostasRef.current]);
  }, [total]);

  // Cronômetro único.
  useEffect(() => {
    inicioRef.current = Date.now();
    ultimaMarcaRef.current = Date.now();
    const intervalo = window.setInterval(() => {
      const decorrido = Math.round((Date.now() - inicioRef.current) / 1000);
      const falta = Math.max(QUEST_SEGUNDOS - decorrido, 0);
      setRestante(falta);
      if (falta <= 0) {
        window.clearInterval(intervalo);
        encerrar();
      }
    }, 250);

    return () => {
      window.clearInterval(intervalo);
      if (avancoRef.current) clearTimeout(avancoRef.current);
      avancoRef.current = null;
    };
  }, [encerrar]);

  const responder = useCallback(
    (alternativa: Alternativa) => {
      if (finalizadoRef.current || feedback !== null) return;
      const questao = questoes[indice];
      if (!questao) return;

      const agora = Date.now();
      const tempoResposta = Math.max((agora - ultimaMarcaRef.current) / 1000, 0);
      ultimaMarcaRef.current = agora;

      const acertou = alternativa === questao.respostaCorreta;
      respostasRef.current = [
        ...respostasRef.current,
        {
          questaoId: questao.id,
          ordem: indice + 1,
          selecionada: alternativa,
          correta: questao.respostaCorreta,
          acertou,
          tempoSegundos: Math.round(tempoResposta * 100) / 100,
        },
      ];

      setFeedback(acertou ? "CORRETO" : "ERRADO");
      avancoRef.current = setTimeout(() => {
        setFeedback(null);
        if (indice + 1 >= total) {
          encerrar();
          return;
        }
        setIndice((i) => i + 1);
      }, FEEDBACK_MS);
    },
    [encerrar, feedback, indice, questoes, total],
  );

  return useMemo(
    () => ({
      questaoAtual: questoes[indice] ?? null,
      indice,
      total,
      restante,
      feedback,
      finalizado,
      responder,
    }),
    [feedback, finalizado, indice, questoes, responder, restante, total],
  );
}
