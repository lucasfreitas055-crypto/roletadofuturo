import { useEffect } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { SKILLS, type HabilidadeCodigo } from "@/config/skills.config";
import { primeiroNome } from "@/lib/team-ui";
import { cn } from "@/lib/utils";

type Nivel = "DESENVOLVIMENTO" | "BOM" | "EXCELENTE";

const NIVEL: Record<Nivel, { rotulo: string; icone: string; classe: string }> = {
  DESENVOLVIMENTO: {
    rotulo: "Em desenvolvimento",
    icone: "",
    classe: "border-border text-muted-foreground",
  },
  BOM: { rotulo: "Bom desempenho", icone: "", classe: "border-warning/60 text-warning" },
  EXCELENTE: { rotulo: "Excelente destaque", icone: "", classe: "border-success/60 text-success" },
};

/** Converte o desempenho do jogo (0 a 1) na classificação positiva da habilidade. */
export function nivelPorDesempenho(score: number): Nivel {
  if (score >= 0.7) return "EXCELENTE";
  if (score >= 0.4) return "BOM";
  return "DESENVOLVIMENTO";
}

interface SkillProfileProps {
  nome: string;
  /** Habilidade sorteada e efetivamente jogada pelo participante. */
  habilidade: HabilidadeCodigo | null;
  /** Desempenho de 0 a 1 na habilidade jogada (quest ou desafio das latas). */
  desempenho: number;
  avancoAutomaticoMs?: number;
  onContinue: () => void;
}

/** Seu Perfil de Competências — fechamento pedagógico do evento. */
export function SkillProfile({
  nome,
  habilidade,
  desempenho,
  avancoAutomaticoMs = 8000,
  onContinue,
}: SkillProfileProps) {
  useEffect(() => {
    const t = window.setTimeout(onContinue, avancoAutomaticoMs);
    return () => window.clearTimeout(t);
  }, [avancoAutomaticoMs, onContinue]);

  const jogada = SKILLS.find((s) => s.codigo === habilidade) ?? null;
  const nivelJogada = nivelPorDesempenho(desempenho);

  const destaque = jogada
    ? `Você demonstrou grande potencial em ${jogada.nome}.`
    : "Você demonstrou grande potencial nos desafios de hoje.";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-6 text-center">
      <header>
        <h2 className="text-[clamp(1.5rem,4.5vw,2.5rem)] font-black uppercase tracking-tight">
          Seu perfil de competências
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground sm:text-base">
          {primeiroNome(nome)}, veja como você se saiu nas habilidades do futuro.
        </p>
      </header>

      <section className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SKILLS.map((skill) => {
          const foiJogada = skill.codigo === habilidade;
          const nivel = foiJogada ? NIVEL[nivelJogada] : NIVEL.DESENVOLVIMENTO;
          return (
            <article
              key={skill.codigo}
              className={cn(
                "surface-card animate-rise flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-5",
                nivel.classe,
                foiJogada && "ring-2 ring-primary/60",
              )}
            >
              <span aria-hidden="true" className="text-3xl">
                {skill.icone}
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
                {skill.nome}
              </h3>
              <p className="text-xs font-black uppercase tracking-widest">
                {nivel.icone} {nivel.rotulo}
              </p>
              {foiJogada ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-primary">
                  Habilidade de hoje
                </span>
              ) : null}
            </article>
          );
        })}
      </section>

      <p className="max-w-3xl text-[clamp(0.95rem,2.2vw,1.2rem)] font-bold">
        {destaque} Nas aulas da Mister Wiz, você continuará desenvolvendo essa habilidade enquanto
        fortalece as demais para se preparar para os desafios do futuro.
      </p>

      <ActionButton tamanho="xl" className="w-full max-w-md" onClick={onContinue}>
        Continuar
      </ActionButton>
    </div>
  );
}
