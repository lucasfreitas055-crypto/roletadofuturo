import { queryOptions, useQuery } from "@tanstack/react-query";

import { EVENT_CONFIG } from "@/config/event.config";
import { RankingService } from "@/services/ranking.service";

export const rankingQueryOptions = queryOptions({
  queryKey: ["ranking", "publico"],
  queryFn: () => RankingService.publico(),
  staleTime: EVENT_CONFIG.cacheStaleMs,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});

/** Ranking das equipes com cache — evita requisições repetidas no evento. */
export function useRanking() {
  const query = useQuery(rankingQueryOptions);
  const equipes = query.data ?? [];
  return {
    ...query,
    equipes,
    lider: RankingService.lider(equipes),
    total: equipes.reduce((soma, e) => soma + e.total, 0),
  };
}
