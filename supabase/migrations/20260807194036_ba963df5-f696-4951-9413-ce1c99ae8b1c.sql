
DO $$ BEGIN
  CREATE TYPE public.interesse_matricula_tipo AS ENUM ('SIM','QUERO_SABER_MAIS','TALVEZ_DEPOIS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS tempo_missao_segundos integer,
  ADD COLUMN IF NOT EXISTS pontos_missao numeric(4,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mini_desafio_id text,
  ADD COLUMN IF NOT EXISTS mini_desafio_acertou boolean,
  ADD COLUMN IF NOT EXISTS interesse_matricula public.interesse_matricula_tipo;

DROP VIEW IF EXISTS public.vw_ranking_pontuacao;
DROP VIEW IF EXISTS public.vw_estatisticas_diarias;
DROP VIEW IF EXISTS public.vw_pontuacao_participante;

CREATE VIEW public.vw_pontuacao_participante AS
SELECT p.id,
       p.equipe,
       p.nome,
       p.idade_aluno,
       p.habilidade_sorteada,
       p.interesse_matricula,
       p.created_at,
       CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END AS pontos_participacao,
       LEAST(COALESCE(p.pontos_missao,0)::numeric, 1) AS pontos_missao,
       LEAST(COALESCE(v.validas,0)::numeric * 0.1, 1) AS pontos_indicacoes,
       COALESCE(v.validas,0) AS indicacoes_validas,
       LEAST(
         (CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END)
         + LEAST(COALESCE(p.pontos_missao,0)::numeric, 1)
         + LEAST(COALESCE(v.validas,0)::numeric * 0.1, 1)
       , 3) AS pontos_total
FROM public.participantes p
LEFT JOIN (
  SELECT i.participante_id, count(*) AS validas
  FROM public.indicacoes i
  WHERE i.status = 'VALIDADA'::public.status_indicacao
  GROUP BY i.participante_id
) v ON v.participante_id = p.id;

CREATE VIEW public.vw_ranking_pontuacao AS
SELECT e.codigo AS equipe,
       e.nome,
       e.cor_hex,
       COALESCE(agg.participantes, 0)::bigint AS participantes,
       COALESCE(agg.indicacoes_validas, 0)::bigint AS indicacoes_validas,
       round(COALESCE(agg.pontos_missao, 0), 2) AS pontos_missao,
       round(COALESCE(agg.pontuacao, 0), 2) AS pontuacao
FROM public.equipes e
LEFT JOIN (
  SELECT vp.equipe,
         count(*) FILTER (WHERE vp.pontos_participacao > 0) AS participantes,
         sum(vp.indicacoes_validas) AS indicacoes_validas,
         sum(vp.pontos_missao) AS pontos_missao,
         sum(vp.pontos_total) AS pontuacao
  FROM public.vw_pontuacao_participante vp
  GROUP BY vp.equipe
) agg ON agg.equipe = e.codigo;

CREATE VIEW public.vw_estatisticas_diarias AS
WITH base AS (
  SELECT ((vp.created_at AT TIME ZONE 'America/Sao_Paulo'))::date AS data,
         vp.pontos_total,
         vp.indicacoes_validas,
         vp.pontos_participacao
  FROM public.vw_pontuacao_participante vp
)
SELECT data,
       count(*) FILTER (WHERE pontos_participacao > 0)::bigint AS participantes,
       COALESCE(sum(indicacoes_validas),0)::bigint AS indicacoes,
       round(COALESCE(sum(pontos_total),0), 2) AS pontuacao
FROM base
GROUP BY data;

CREATE OR REPLACE VIEW public.vw_distribuicao_habilidades AS
SELECT h.codigo AS habilidade,
       COALESCE(c.total, 0)::bigint AS total
FROM (SELECT unnest(enum_range(NULL::public.habilidade_tipo)) AS codigo) h
LEFT JOIN (
  SELECT habilidade_sorteada AS codigo, count(*) AS total
  FROM public.participantes
  WHERE habilidade_sorteada IS NOT NULL
  GROUP BY habilidade_sorteada
) c ON c.codigo = h.codigo;

GRANT SELECT ON public.vw_pontuacao_participante TO service_role;
GRANT SELECT ON public.vw_ranking_pontuacao TO service_role, anon, authenticated;
GRANT SELECT ON public.vw_estatisticas_diarias TO service_role;
GRANT SELECT ON public.vw_distribuicao_habilidades TO service_role, anon, authenticated;
