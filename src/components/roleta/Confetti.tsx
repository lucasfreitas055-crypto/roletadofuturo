import { useEffect, useMemo } from "react";

interface ConfettiProps {
  /** Quantidade de partículas — mantido baixo para não pesar em tablets. */
  quantidade?: number;
  /** Duração total da chuva, em ms. */
  duracaoMs?: number;
}

const CORES = ["var(--primary)", "var(--success)", "var(--warning)", "var(--accent)"] as const;

/**
 * Confete leve e discreto — apenas CSS, sem canvas nem dependências.
 * Respeita `prefers-reduced-motion` (o CSS global já neutraliza animações).
 */
export function Confetti({ quantidade = 28, duracaoMs = 3200 }: ConfettiProps) {
  const pecas = useMemo(
    () =>
      Array.from({ length: quantidade }, (_, i) => ({
        id: i,
        esquerda: Math.round(((i + 0.5) / quantidade) * 100 + (i % 3) - 1),
        atraso: (i % 7) * 120,
        duracao: 2200 + (i % 5) * 260,
        cor: CORES[i % CORES.length]!,
        largura: 6 + (i % 3) * 3,
        altura: 10 + (i % 4) * 3,
      })),
    [quantidade],
  );

  useEffect(() => {
    const t = window.setTimeout(() => undefined, duracaoMs);
    return () => window.clearTimeout(t);
  }, [duracaoMs]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pecas.map((peca) => (
        <span
          key={peca.id}
          className="animate-confetti absolute top-[-8vh] block rounded-[2px] opacity-90"
          style={{
            left: `${peca.esquerda}%`,
            width: `${peca.largura}px`,
            height: `${peca.altura}px`,
            background: peca.cor,
            animationDelay: `${peca.atraso}ms`,
            animationDuration: `${peca.duracao}ms`,
          }}
        />
      ))}
    </div>
  );
}
