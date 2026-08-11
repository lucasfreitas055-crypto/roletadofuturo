import { useCallback, useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import {
  DESAFIO_MAX_SEGUNDOS,
  formatarCronometro,
  pontuacaoDesafioLatas,
} from "@/config/challenge.config";
import { formatarPontos } from "@/config/scoring.config";
import { tocarFinal } from "@/lib/skill-audio";
import { cn } from "@/lib/utils";

const CHAVE = "mw:desafio-latas:v1";

type Fase = "INTRO" | "CONTAGEM" | "CRONOMETRO" | "RESULTADO";

interface Persistido {
  ref: string;
  inicioEm: number;
  finalizado: boolean;
  tempo: number;
}

function ler(ref: string): Persistido | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as Persistido;
    return dado.ref === ref ? dado : null;
  } catch {
    return null;
  }
}

function gravar(dado: Persistido) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(dado));
  } catch {
    /* ignora */
  }
}

function limpar() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}

interface ChallengeLatasProps {
  /** Referência do participante — garante um único desafio por participante. */
  referencia: string;
  onFinish: (dados: { segundos: number; pontos: number }) => void;
}

/**
 * DESAFIO DAS LATAS — Inteligência Emocional.
 * O desafio é físico; o sistema controla tempo, pontuação e registro.
 */
export function ChallengeLatas({ referencia, onFinish }: ChallengeLatasProps) {
  const [fase, setFase] = useState<Fase>("INTRO");
  const [contagem, setContagem] = useState(3);
  const [segundos, setSegundos] = useState(0);
  const [resultado, setResultado] = useState<{
    tempo: number;
    pontos: number;
    esgotado: boolean;
  } | null>(null);
  const inicioRef = useRef<number | null>(null);
  const finalizadoRef = useRef(false);

  /* -------- Retomada exata após recarregar, perder conexão ou fechar a aba ------- */
  useEffect(() => {
    const salvo = ler(referencia);
    if (!salvo || salvo.finalizado) return;
    inicioRef.current = salvo.inicioEm;
    const decorrido = Math.floor((Date.now() - salvo.inicioEm) / 1000);
    setSegundos(Math.min(decorrido, DESAFIO_MAX_SEGUNDOS));
    setFase("CRONOMETRO");
  }, [referencia]);

  const concluir = useCallback(
    (tempo: number, esgotado: boolean) => {
      if (finalizadoRef.current) return;
      finalizadoRef.current = true;
      const seguro = Math.min(Math.max(tempo, 0), DESAFIO_MAX_SEGUNDOS);
      const pontos = pontuacaoDesafioLatas(seguro);
      gravar({
        ref: referencia,
        inicioEm: inicioRef.current ?? Date.now(),
        finalizado: true,
        tempo: seguro,
      });
      setResultado({ tempo: seguro, pontos, esgotado });
      tocarFinal();
      setFase("RESULTADO");
      if (typeof document !== "undefined" && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
      window.setTimeout(() => {
        limpar();
        onFinish({ segundos: seguro, pontos });
      }, 2000);
    },
    [onFinish, referencia],
  );

  /* --------------------------------- Cronômetro -------------------------------- */
  useEffect(() => {
    if (fase !== "CRONOMETRO") return;
    const id = window.setInterval(() => {
      const base = inicioRef.current ?? Date.now();
      const decorrido = Math.floor((Date.now() - base) / 1000);
      setSegundos(Math.min(decorrido, DESAFIO_MAX_SEGUNDOS));
      if (decorrido >= DESAFIO_MAX_SEGUNDOS) {
        window.clearInterval(id);
        concluir(DESAFIO_MAX_SEGUNDOS, true);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [fase, concluir]);

  /* --------------------------------- Contagem ---------------------------------- */
  useEffect(() => {
    if (fase !== "CONTAGEM") return;
    if (contagem > 0) {
      const id = window.setTimeout(() => setContagem((n) => n - 1), 1000);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      const agora = Date.now();
      inicioRef.current = agora;
      gravar({ ref: referencia, inicioEm: agora, finalizado: false, tempo: 0 });
      setSegundos(0);
      setFase("CRONOMETRO");
    }, 1000);
    return () => window.clearTimeout(id);
  }, [fase, contagem, referencia]);

  function iniciar() {
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    setContagem(3);
    setFase("CONTAGEM");
  }

  /* ----------------------------------- Telas ----------------------------------- */

  if (fase === "INTRO") {
    return (
      <section className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-8 bg-background px-6 text-center">
        <p className="text-7xl" aria-hidden="true"></p>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary sm:text-5xl">
            Inteligência Emocional
          </h1>
          <p className="mt-3 text-2xl font-black uppercase tracking-[0.2em] sm:text-4xl">
            Desafio das Latas
          </p>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          Controle emocional também é manter a calma sob pressão. Concentre-se e faça o seu melhor!
        </p>
        <ActionButton tamanho="xl" className="w-full max-w-md" onClick={iniciar}>
          Iniciar Desafio
        </ActionButton>
      </section>
    );
  }

  if (fase === "CONTAGEM") {
    return (
      <section className="fixed inset-0 z-50 grid place-items-center bg-background">
        <span
          key={contagem}
          className="animate-pop text-[36vw] font-black leading-none text-primary sm:text-[28vw]"
        >
          {contagem > 0 ? contagem : "GO!"}
        </span>
      </section>
    );
  }

  if (fase === "RESULTADO" && resultado) {
    return (
      <section className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <p className="animate-pop text-3xl font-black uppercase tracking-wide sm:text-5xl">
          {resultado.esgotado ? " Tempo esgotado!" : " Desafio concluído!"}
        </p>
        <div className="animate-fade-in">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">
            {resultado.esgotado ? "Tempo" : "Tempo obtido"}
          </p>
          <p className="text-[18vw] font-black leading-none tabular-nums sm:text-[12vw]">
            {formatarCronometro(resultado.tempo)}
          </p>
          <p className="mt-4 text-2xl font-black uppercase text-primary sm:text-4xl">
            {resultado.esgotado ? "Pontuação" : "Pontuação conquistada"}:{" "}
            {formatarPontos(resultado.pontos)} ponto
          </p>
        </div>
      </section>
    );
  }

  const esgotado = segundos >= DESAFIO_MAX_SEGUNDOS;
  const restante = Math.max(DESAFIO_MAX_SEGUNDOS - segundos, 0);
  const atencao = restante <= 60 && restante > 30;
  const critico = restante <= 30 && !esgotado;

  return (
    <section className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full flex-col items-center justify-center gap-4 overflow-hidden bg-background px-4 py-6">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
        Tempo restante
      </p>
      <p
        className={cn(
          "select-none text-center font-display font-black leading-none tabular-nums transition-colors duration-500",
          "text-[clamp(6rem,28vw,22rem)]",
          critico && "animate-timer-urgent text-destructive",
          atencao && "text-warning",
          esgotado ? "text-destructive" : !atencao && !critico ? "text-foreground" : "",
        )}
        aria-live="off"
      >
        {formatarCronometro(restante)}
      </p>
      <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">
        {critico ? "Reta final" : atencao ? "Último minuto" : "Desafio das Latas"}
      </p>
      <ActionButton
        tamanho="xl"
        variante="success"
        className="w-full max-w-lg"
        disabled={esgotado}
        onClick={() => concluir(segundos, false)}
      >
        Finalizar Desafio
      </ActionButton>
    </section>
  );
}
