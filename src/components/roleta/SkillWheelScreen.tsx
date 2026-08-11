import { useEffect } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { EventHeader } from "@/components/roleta/EventHeader";
import { SkillHeader } from "@/components/roleta/SkillHeader";
import { SkillWheel } from "@/components/roleta/SkillWheel";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface SkillWheelScreenProps {
  nome: string;
  equipe: EquipeCodigo;
  girando: boolean;
  rotacao: number;
  onSpin: () => void;
}

/** Tela completa da Roleta das Habilidades. */
export function SkillWheelScreen({
  nome,
  equipe,
  girando,
  rotacao,
  onSpin,
}: SkillWheelScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo?.tagName === "INPUT" || alvo?.tagName === "TEXTAREA";
      if (e.code === "Space" && !digitando && !girando) {
        e.preventDefault();
        onSpin();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSpin, girando]);

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col items-center justify-between gap-2 overflow-hidden px-4 py-3">
      <div className="flex w-full items-start justify-between gap-3">
        <EventHeader equipe={equipe} nome={nome} />
      </div>

      <SkillHeader />

      <SkillWheel rotacao={rotacao} girando={girando} />

      <div className="flex w-full flex-col items-center gap-1">
        <ActionButton
          tamanho="xl"
          className={cn("w-full max-w-md", !girando && "animate-glow-pulse")}
          disabled={girando}
          onClick={onSpin}
        >
          {girando ? "Girando..." : "Girar a roleta"}
        </ActionButton>
        <p className="text-[0.65rem] text-muted-foreground">
          Dica do operador: pressione ESPAÇO para girar.
        </p>
      </div>
    </div>
  );
}
