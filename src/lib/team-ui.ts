import type { EquipeCodigo } from "@/types/database.types";

export interface TeamUi {
  readonly codigo: EquipeCodigo;
  readonly label: string;
  readonly emoji: string;
  /** Texto na cor da equipe */
  readonly text: string;
  /** Fundo sólido */
  readonly solid: string;
  /** Fundo suave */
  readonly soft: string;
  readonly border: string;
  readonly ring: string;
  readonly glow: string;
  readonly onSolid: string;
}

const MAP: Readonly<Record<EquipeCodigo, TeamUi>> = {
  AZUL: {
    codigo: "AZUL",
    label: "Azul",
    emoji: "",
    text: "text-team-azul",
    solid: "bg-team-azul",
    soft: "bg-team-azul/15",
    border: "border-team-azul/60",
    ring: "ring-team-azul",
    glow: "shadow-[0_0_50px_-10px_var(--team-azul)]",
    onSolid: "text-background",
  },
  VERDE: {
    codigo: "VERDE",
    label: "Verde",
    emoji: "",
    text: "text-team-verde",
    solid: "bg-team-verde",
    soft: "bg-team-verde/15",
    border: "border-team-verde/60",
    ring: "ring-team-verde",
    glow: "shadow-[0_0_50px_-10px_var(--team-verde)]",
    onSolid: "text-background",
  },
  AMARELA: {
    codigo: "AMARELA",
    label: "Amarela",
    emoji: "",
    text: "text-team-amarela",
    solid: "bg-team-amarela",
    soft: "bg-team-amarela/15",
    border: "border-team-amarela/60",
    ring: "ring-team-amarela",
    glow: "shadow-[0_0_50px_-10px_var(--team-amarela)]",
    onSolid: "text-background",
  },
};

export function teamUi(codigo: EquipeCodigo): TeamUi {
  return MAP[codigo];
}

export const TEAMS_UI: readonly TeamUi[] = [MAP.AZUL, MAP.VERDE, MAP.AMARELA];

/** Primeiro nome, para mensagens ("Boa sorte, João!"). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
