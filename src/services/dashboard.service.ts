import { obterDashboard } from "@/lib/admin.functions";

export const DashboardService = {
  /** Consolidado: totais, ranking, por dia, por prêmio e por status. */
  carregar() {
    return obterDashboard();
  },
} as const;
