import { obterRankingPublico } from "@/lib/participacao.functions";
import { obterRankingAdmin } from "@/lib/admin.functions";
import type { ParticipantesPorEquipe } from "@/types/database.types";

export const RankingService = {
  /** Ranking exibido no terminal do evento (público, sem dados pessoais). */
  publico(): Promise<ParticipantesPorEquipe[]> {
    return obterRankingPublico();
  },

  /** Ranking completo para o painel administrativo. */
  admin() {
    return obterRankingAdmin();
  },

  lider(equipes: readonly ParticipantesPorEquipe[]): ParticipantesPorEquipe | null {
    return [...equipes].sort((a, b) => b.total - a.total)[0] ?? null;
  },
} as const;
