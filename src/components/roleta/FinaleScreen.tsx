import { useEffect, useMemo, useState } from "react";

import { Confetti } from "@/components/roleta/Confetti";
import { formatarPontos, formatarTempo, type ResumoPontuacao } from "@/config/scoring.config";
import { tocarFinal, tocarPontos, tocarVitoria } from "@/lib/skill-audio";
import { primeiroNome, teamUi } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

/** Resposta definitiva do participante sobre as 5 aulas experimentais. */
export type RespostaAulas = "SIM" | "NAO";

const MENSAGENS: readonly string[] = [
  "Excelente desempenho! Você mostrou rapidez, estratégia e trabalho em equipe.",
  "Que missão incrível! Você usou raciocínio, foco e espírito de equipe.",
  "Muito bem! Sua dedicação fez a diferença para a sua equipe hoje.",
  "Impressionante! Você encarou o desafio com coragem e inteligência.",
  "Sensacional! Você mostrou concentração, agilidade e atitude de líder.",
];

const COMPLEMENTO = "Continue desenvolvendo habilidades que farão diferença no seu futuro.";

interface FinaleScreenProps {
  nome: string;
  equipe: EquipeCodigo;
  resumo: ResumoPontuacao;
  indicacoes: number;
  tempoSegundos: number | null;
  posicao: number | null;
  /** Pontuação total acumulada pela equipe no placar ao vivo. */
  totalEquipe: number | null;
  salvando: boolean;
  /** Registra a resposta (uma única vez) e devolve o controle ao fluxo. */
  onSelect: (valor: RespostaAulas) => void;
  onFinish: () => void;
}

/**
 * Encerramento premium — parabéns, resultado, contribuição, mensagem
 * e a oferta das 5 aulas experimentais. Aproximadamente 15 segundos.
 */
export function FinaleScreen({
  nome,
  equipe,
  resumo,
  indicacoes,
  tempoSegundos,
  posicao,
  totalEquipe,
  salvando,
  onSelect,
  onFinish,
}: FinaleScreenProps) {
  const ui = teamUi(equipe);
  const [mostrarCta, setMostrarCta] = useState(false);
  const [resposta, setResposta] = useState<RespostaAulas | null>(null);

  const mensagem = useMemo(() => MENSAGENS[Math.floor(Math.random() * MENSAGENS.length)]!, []);

  useEffect(() => {
    tocarVitoria();
    const t = window.setTimeout(() => {
      setMostrarCta(true);
      tocarPontos();
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!resposta) return;
    tocarFinal();
    const t = window.setTimeout(onFinish, 2000);
    return () => window.clearTimeout(t);
  }, [resposta, onFinish]);

  function responder(valor: RespostaAulas) {
    if (resposta || salvando) return;
    setResposta(valor);
    onSelect(valor);
  }

  const totalTime = totalEquipe && totalEquipe > 0 ? totalEquipe : resumo.total;
  const percentual =
    totalTime > 0 ? Math.min(100, Math.round((resumo.total / totalTime) * 1000) / 10) : 0;

  const cartoes = [
    { icone: "", rotulo: "Sua pontuação", valor: `${formatarPontos(resumo.total)} pts` },
    { icone: ui.emoji, rotulo: "Sua equipe", valor: `Equipe ${ui.label}` },
    {
      icone: posicao === 1 ? "" : posicao === 2 ? "" : posicao === 3 ? "" : "",
      rotulo: "Posição da equipe",
      valor: posicao ? `${posicao}º lugar` : "Em apuração",
    },
    { icone: "", rotulo: "Amigos indicados", valor: String(indicacoes) },
    {
      icone: "",
      rotulo: "Tempo do desafio",
      valor: tempoSegundos && tempoSegundos > 0 ? formatarTempo(tempoSegundos) : "—",
    },
  ];

  if (resposta) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <Confetti quantidade={20} />
        <div className="surface-card animate-pop w-full rounded-3xl border-2 border-success/60 px-6 py-10">
          <p className="text-[clamp(3rem,10vw,5rem)] leading-none">
            {resposta === "SIM" ? "" : ""}
          </p>
          <h2 className="mt-3 text-[clamp(1.5rem,4.5vw,2.5rem)] font-black uppercase tracking-tight">
            {resposta === "SIM" ? "Excelente escolha!" : "Obrigado por participar!"}
          </h2>
          <p className="mt-3 text-[clamp(1rem,2.4vw,1.375rem)] font-semibold text-muted-foreground">
            {resposta === "SIM"
              ? "Nossa equipe entrará em contato em breve para agendar suas aulas."
              : "Esperamos vê-lo novamente em breve!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-6 text-center">
      <Confetti />

      <header className="animate-pop">
        <p className="text-[clamp(2.5rem,9vw,4.5rem)] leading-none"></p>
        <h2 className="mt-1 text-[clamp(1.75rem,5.5vw,3rem)] font-black uppercase tracking-tight text-white">
          Parabéns!
        </h2>
        <p className="mt-1 text-[clamp(1rem,2.6vw,1.5rem)] font-bold">
          {primeiroNome(nome)}, você concluiu a missão com sucesso!
        </p>
      </header>

      <section className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {cartoes.map((cartao) => (
          <div
            key={cartao.rotulo}
            className="surface-card animate-rise flex flex-col items-center justify-center gap-1 rounded-2xl border border-primary/30 px-3 py-4"
          >
            <span aria-hidden="true" className="text-2xl">
              {cartao.icone}
            </span>
            <span className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground">
              {cartao.rotulo}
            </span>
            <span className="text-[clamp(1rem,2.2vw,1.5rem)] font-black leading-tight">
              {cartao.valor}
            </span>
          </div>
        ))}
      </section>

      <section className="surface-card w-full rounded-2xl border border-border px-5 py-4 text-left">
        <p className="text-center text-base font-black uppercase tracking-wide">
          Você contribuiu com{" "}
          <span
            className="drop-shadow-[0_0_10px_rgba(200,162,255,0.35)]"
            style={{ color: "#c8a2ff" }}
          >
            {formatarPontos(resumo.total)} pontos
          </span>{" "}
          para sua equipe
        </p>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700", ui.solid)}
            style={{ width: `${Math.max(3, percentual)}%` }}
            role="progressbar"
            aria-valuenow={percentual}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Sua contribuição para a equipe"
          />
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-muted-foreground">
          Você ajudou sua equipe com {formatarPontos(resumo.total)} pontos de um total de{" "}
          {formatarPontos(totalTime)}.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div className="rounded-xl bg-background/40 px-2 py-2 text-center">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground">
              Participação
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: "#c8a2ff" }}
            >
              +{formatarPontos(resumo.participacao)}
            </p>
          </div>
          <div className="rounded-xl bg-background/40 px-2 py-2 text-center">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground">
              Tempo / Quest
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: "#c8a2ff" }}
            >
              +{formatarPontos(resumo.quest)}
            </p>
          </div>
          <div className="rounded-xl bg-background/40 px-2 py-2 text-center">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground">
              Indicações ({indicacoes})
            </p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: "#c8a2ff" }}
            >
              +{formatarPontos(resumo.indicacoes)}
            </p>
          </div>
        </div>
      </section>

      <p className="text-[clamp(0.95rem,2.2vw,1.25rem)] font-bold text-white">
        {mensagem} {COMPLEMENTO}
      </p>

      {mostrarCta ? (
        <section className="animate-pop w-full rounded-3xl border-2 border-primary/60 bg-card/70 px-5 py-6">
          <h3 className="text-[clamp(1.25rem,3.6vw,2rem)] font-black uppercase tracking-tight">
            Presente especial
          </h3>
          <p className="mt-2 text-[clamp(1rem,2.4vw,1.35rem)] font-bold">
            Você gostaria de participar de
          </p>
          <p
            className="text-[clamp(1.25rem,4vw,2.25rem)] font-black uppercase"
            style={{ color: "#fb8608" }}
          >
            5 aulas experimentais gratuitas
          </p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground sm:text-base">
            Conheça na prática como desenvolvemos inglês, liderança, empreendedorismo, inteligência
            emocional e educação financeira.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={salvando}
              onClick={() => responder("SIM")}
              className="tap-card glow-primary flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-[clamp(1rem,2.4vw,1.35rem)] font-black uppercase tracking-wide text-primary-foreground disabled:opacity-60"
            >
              <span aria-hidden="true"></span> Sim, quero participar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => responder("NAO")}
              className="tap-card flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card/60 px-5 text-[clamp(1rem,2.4vw,1.35rem)] font-black uppercase tracking-wide text-muted-foreground hover:bg-muted disabled:opacity-60"
            >
              <span aria-hidden="true"></span> Não, obrigado
            </button>
          </div>
        </section>
      ) : (
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Preparando seu presente especial...
        </p>
      )}
    </div>
  );
}
