-- Pontuação de "Game Extra" (tabela pontos_extras) agora entra no ranking das equipes.
-- Só afeta o total por EQUIPE; individual continua vindo de participantes.total_score.

CREATE OR REPLACE VIEW public.vw_ranking_pontuacao AS
SELECT e.codigo AS equipe,
       e.nome,
       e.cor_hex,
       COALESCE(agg.participantes, 0::bigint) AS participantes,
       COALESCE(agg.indicacoes_validas, 0::numeric)::bigint AS indicacoes_validas,
       round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_quest,
       round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_missao,
       round(
         COALESCE(agg.pontuacao, 0::numeric)
         + COALESCE(extras.pontos_extras, 0::numeric),
       2) AS pontuacao,
       round(COALESCE(extras.pontos_extras, 0::numeric), 2) AS pontos_extras
  FROM public.equipes e
  LEFT JOIN (
        SELECT vp.equipe,
               count(*) FILTER (WHERE vp.pontos_participacao > 0::numeric) AS participantes,
               sum(vp.indicacoes_validas) AS indicacoes_validas,
               sum(vp.pontos_quest) AS pontos_quest,
               sum(vp.pontos_total) AS pontuacao
          FROM public.vw_pontuacao_participante vp
         WHERE vp.evento_id IS NOT DISTINCT FROM (
                 SELECT ev.id FROM public.eventos ev
                  WHERE ev.status = 'ATIVO'
                  ORDER BY ev.numero DESC
                  LIMIT 1
               )
         GROUP BY vp.equipe
       ) agg ON agg.equipe = e.codigo
  LEFT JOIN (
        SELECT pe.equipe, sum(pe.pontos) AS pontos_extras
          FROM public.pontos_extras pe
         WHERE pe.evento_id IS NOT DISTINCT FROM (
                 SELECT ev.id FROM public.eventos ev
                  WHERE ev.status = 'ATIVO'
                  ORDER BY ev.numero DESC
                  LIMIT 1
               )
         GROUP BY pe.equipe
       ) extras ON extras.equipe = e.codigo;

GRANT SELECT ON public.vw_ranking_pontuacao TO anon, authenticated, service_role;
