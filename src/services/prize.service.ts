import { obterPremiosAtivos } from "@/lib/participacao.functions";

export interface PremioPublico {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "BRINDE" | "DESCONTO";
  ordem: number;
  quantidade_indicacoes_exigidas: number;
}

/** Serviço de prêmios. Probabilidades e estoque ficam no banco (nunca no cliente). */
export const PrizeService = {
  async listarAtivos(): Promise<PremioPublico[]> {
    const premios = await obterPremiosAtivos();
    return premios as PremioPublico[];
  },

  /** Regra de negócio das indicações exigidas por desconto. */
  indicacoesExigidas(nomePremio: string): number {
    if (nomePremio.includes("20")) return 3;
    if (nomePremio.includes("35")) return 5;
    if (nomePremio.includes("45")) return 10;
    return 0;
  },
} as const;
