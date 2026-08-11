/**
 * Configuração central da campanha.
 *
 * Para reutilizar esta aplicação em campanhas futuras da Mister Wiz basta
 * alterar este arquivo (logo, equipes, textos) e os prêmios/probabilidades
 * no banco de dados. Nenhuma regra de negócio precisa ser reescrita.
 */

import logoMisterWizBranca from "@/assets/logobranca.png";
import type { EquipeCodigo } from "@/types/database.types";

export interface EquipeConfig {
  readonly codigo: EquipeCodigo;
  readonly nome: string;
  readonly corHex: string;
  readonly ordem: number;
}

export interface EventConfig {
  /**
   * EVENT_MODE: quando ativo a aplicação é tratada como um terminal de evento
   * aberto por várias horas — sem recarregar páginas, sem perder estado,
   * cache agressivo e limpeza apenas do participante atual.
   */
  readonly EVENT_MODE: boolean;
  readonly marca: string;
  readonly campanha: string;
  readonly local: string;
  readonly logoUrl: string;
  readonly equipes: readonly EquipeConfig[];
  readonly textos: Readonly<Record<string, string>>;
  /** Tempo (ms) até a tela do participante atual ser limpa automaticamente. */
  readonly autoResetMs: number;
  /** Tempo de cache das consultas somente-leitura (ms). */
  readonly cacheStaleMs: number;
  /** Horário de encerramento do evento (ISO) — alimenta o cronômetro da TV. */
  readonly encerramentoEvento: string | null;
}

export const EVENT_CONFIG: EventConfig = {
  EVENT_MODE: true,
  marca: "Mister Wiz",
  campanha: "Roleta do Futuro",
  local: "Gincana do Colégio Santa Luzia",
  logoUrl: logoMisterWizBranca,
  equipes: [
    { codigo: "AZUL", nome: "Equipe Azul", corHex: "#1D4ED8", ordem: 1 },
    { codigo: "VERDE", nome: "Equipe Verde", corHex: "#15803D", ordem: 2 },
    { codigo: "AMARELA", nome: "Equipe Amarela", corHex: "#CA8A04", ordem: 3 },
  ],
  textos: {
    tituloHome: "Roleta do Futuro",
    subtituloHome: "Gire a roleta, garanta seu prêmio e pontue para a sua equipe.",
    botaoParticipar: "Quero participar",
    bloqueioDuplicidade: "Este WhatsApp já participou da Roleta do Futuro.",
    possivelDuplicidade:
      "Encontramos um cadastro parecido. Um responsável da Mister Wiz precisa liberar sua participação.",
    sucesso: "Participação registrada com sucesso!",
  },
  autoResetMs: 45_000,
  cacheStaleMs: 30_000,
  encerramentoEvento: null,
} as const;

export const EQUIPES: readonly EquipeCodigo[] = ["AZUL", "VERDE", "AMARELA"] as const;

export function getEquipeConfig(codigo: EquipeCodigo): EquipeConfig {
  const equipe = EVENT_CONFIG.equipes.find((e) => e.codigo === codigo);
  if (!equipe) throw new Error(`Equipe desconhecida: ${codigo}`);
  return equipe;
}
