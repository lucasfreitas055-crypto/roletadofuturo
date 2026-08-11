import { useState } from "react";

import { TEAMS_UI } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface TeamSelectorProps {
  onSelect: (equipe: EquipeCodigo) => void;
}

export function TeamSelector({ onSelect }: TeamSelectorProps) {
  const [escolhida, setEscolhida] = useState<EquipeCodigo | null>(null);

  const escolher = (codigo: EquipeCodigo) => {
    if (escolhida) return;
    setEscolhida(codigo);
    setTimeout(() => onSelect(codigo), 420);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-6">
      <div className="animate-rise text-center">
        <h2 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">
          Qual é a sua equipe?
        </h2>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          Escolha seu time e prepare-se para girar!
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {TEAMS_UI.map((ui) => {
          const selecionada = escolhida === ui.codigo;
          const outra = escolhida !== null && !selecionada;
          return (
            <button
              key={ui.codigo}
              type="button"
              aria-pressed={selecionada}
              onClick={() => escolher(ui.codigo)}
              className={cn(
                "surface-card animate-pop relative flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 p-6",
                "transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
                ui.border,
                selecionada && cn("scale-105", ui.glow, ui.soft),
                outra && "scale-95 opacity-40",
                !escolhida && "hover:scale-[1.03] active:scale-[0.98]",
              )}
            >
              <span aria-hidden="true" className="text-4xl">
                {ui.emoji}
              </span>
              <span className={cn("text-2xl font-black uppercase tracking-wide", ui.text)}>
                {ui.label}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Equipe {ui.label}
              </span>
              {selecionada ? (
                <span
                  className={cn(
                    "absolute right-4 top-4 grid size-9 place-items-center rounded-full text-lg font-black",
                    ui.solid,
                    ui.onSolid,
                  )}
                  aria-hidden="true"
                ></span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
