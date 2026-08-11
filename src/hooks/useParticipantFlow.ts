import { useCallback, useMemo, useState } from "react";

import type { SkillConfig } from "@/config/skills.config";
import type { EquipeCodigo, PremioTipo } from "@/types/database.types";

export type FlowStep =
  | "INTRO"
  | "HOME"
  | "EQUIPE"
  | "CADASTRO"
  | "DUPLICADO"
  | "NOME_DUPLICADO"
  | "CONFIRMACAO"
  | "HABILIDADE"
  | "QUEST"
  | "DESAFIO"
  | "QUEST_RESULTADO"
  | "INDICACOES"
  | "FINALE"
  | "PERFIL"
  | "FINAL";

export interface CurrentParticipant {
  readonly id: string | null;
  readonly nome: string;
  readonly idade: number | null;
  readonly responsavelNome: string;
  readonly responsavelWhatsapp: string;
}

export interface CurrentPrize {
  readonly id: string;
  readonly nome: string;
  readonly tipo: PremioTipo;
  readonly indicacoesExigidas: number;
  readonly descricao?: string | null;
}

export interface FlowState {
  readonly currentStep: FlowStep;
  readonly currentTeam: EquipeCodigo | null;
  readonly currentParticipant: CurrentParticipant | null;
  readonly currentPrize: CurrentPrize | null;
  readonly currentSkill: SkillConfig | null;
  readonly referrals: number;
  readonly mensagem: string | null;
  /** Referência do participante (id real ou ref local offline). */
  readonly participantRef: string | null;
  readonly questSeconds: number | null;
  readonly questPoints: number;
  readonly questHits: number | null;
}

const ESTADO_INICIAL: FlowState = {
  currentStep: "INTRO",
  currentTeam: null,
  currentParticipant: null,
  currentPrize: null,
  currentSkill: null,
  referrals: 0,
  mensagem: null,
  participantRef: null,
  questSeconds: null,
  questPoints: 0,
  questHits: null,
};

/**
 * Estado temporário do participante atual (single-flow application).
 * Nunca é misturado com os dados persistentes do dashboard.
 */
export function useParticipantFlow() {
  const [state, setState] = useState<FlowState>(ESTADO_INICIAL);

  const ir = useCallback((currentStep: FlowStep) => {
    setState((s) => ({ ...s, currentStep }));
  }, []);

  const escolherEquipe = useCallback((currentTeam: EquipeCodigo) => {
    setState((s) => ({ ...s, currentTeam, currentStep: "CADASTRO" }));
  }, []);

  const definirParticipante = useCallback((currentParticipant: CurrentParticipant) => {
    setState((s) => ({ ...s, currentParticipant }));
  }, []);

  const definirPremio = useCallback((currentPrize: CurrentPrize | null) => {
    setState((s) => ({ ...s, currentPrize }));
  }, []);

  const definirMensagem = useCallback((mensagem: string | null) => {
    setState((s) => ({ ...s, mensagem }));
  }, []);

  const definirHabilidade = useCallback((currentSkill: SkillConfig | null) => {
    setState((s) => ({ ...s, currentSkill }));
  }, []);

  const definirRef = useCallback((participantRef: string | null) => {
    setState((s) => ({ ...s, participantRef }));
  }, []);

  const definirQuest = useCallback(
    (dados: { segundos: number; pontos: number; acertos: number }) => {
      setState((s) => ({
        ...s,
        questSeconds: dados.segundos,
        questPoints: dados.pontos,
        questHits: dados.acertos,
      }));
    },
    [],
  );

  const definirIndicacoes = useCallback((referrals: number) => {
    setState((s) => ({ ...s, referrals }));
  }, []);

  /** Reset total — a próxima tela precisa parecer uma nova sessão. */
  const resetar = useCallback(() => {
    setState({ ...ESTADO_INICIAL });
  }, []);

  return useMemo(
    () => ({
      ...state,
      ir,
      escolherEquipe,
      definirParticipante,
      definirPremio,
      definirMensagem,
      definirHabilidade,
      definirRef,
      definirQuest,
      definirIndicacoes,
      resetar,
    }),
    [
      state,
      ir,
      escolherEquipe,
      definirParticipante,
      definirPremio,
      definirMensagem,
      definirHabilidade,
      definirRef,
      definirQuest,
      definirIndicacoes,
      resetar,
    ],
  );
}
