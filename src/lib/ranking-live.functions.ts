import { createServerFn } from "@tanstack/react-start";

import type { RankingAoVivoPayload } from "@/database/ranking-live.server";

/** Painel de TV — leitura pública e somente leitura do ranking ao vivo. */
export const obterRankingAoVivoPublico = createServerFn({ method: "GET" }).handler(
  async (): Promise<RankingAoVivoPayload> => {
    const { obterRankingAoVivo } = await import("@/database/ranking-live.server");
    return obterRankingAoVivo();
  },
);
