CREATE OR REPLACE VIEW public.vw_resumo_dashboard WITH (security_invoker = on) AS
SELECT ( SELECT count(*) FROM participantes WHERE participacao_valida AND evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_participantes,
  ( SELECT count(*) FROM participantes WHERE evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_registros,
  ( SELECT count(*) FROM participantes WHERE possivel_duplicidade AND evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_possiveis_duplicidades,
  ( SELECT count(*) FROM indicacoes WHERE evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_indicacoes,
  ( SELECT count(*) FROM participantes p JOIN premios pr ON pr.id = p.premio_id WHERE pr.tipo = 'DESCONTO'::premio_tipo AND p.participacao_valida AND p.evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_descontos,
  ( SELECT count(*) FROM participantes p JOIN premios pr ON pr.id = p.premio_id WHERE pr.tipo = 'BRINDE'::premio_tipo AND p.participacao_valida AND p.evento_id IS NOT DISTINCT FROM public.evento_ativo_id()) AS total_brindes,
  ( SELECT e.codigo FROM equipes e LEFT JOIN participantes p ON p.equipe = e.codigo AND p.participacao_valida AND p.evento_id IS NOT DISTINCT FROM public.evento_ativo_id() GROUP BY e.codigo ORDER BY count(p.id) DESC LIMIT 1) AS equipe_lider;

CREATE OR REPLACE VIEW public.vw_participantes_por_premio WITH (security_invoker = on) AS
SELECT pr.id AS premio_id, pr.nome AS premio_nome, pr.tipo,
  count(p.id) FILTER (WHERE p.participacao_valida) AS total
FROM premios pr
LEFT JOIN participantes p ON p.premio_id = pr.id AND p.evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
GROUP BY pr.id, pr.nome, pr.tipo;

CREATE OR REPLACE VIEW public.vw_participantes_por_dia WITH (security_invoker = on) AS
SELECT date_trunc('day', created_at)::date AS dia,
  count(*) FILTER (WHERE participacao_valida) AS total_validos,
  count(*) AS total_registros
FROM participantes
WHERE evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.vw_participantes_por_status WITH (security_invoker = on) AS
SELECT status_lead, status_premio, count(*) AS total
FROM participantes
WHERE participacao_valida AND evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
GROUP BY status_lead, status_premio;

CREATE OR REPLACE VIEW public.vw_ranking_equipes WITH (security_invoker = on) AS
SELECT e.codigo AS equipe, e.nome, e.cor_hex,
  count(p.id) FILTER (WHERE p.participacao_valida) AS total_participantes,
  rank() OVER (ORDER BY count(p.id) FILTER (WHERE p.participacao_valida) DESC) AS posicao
FROM equipes e
LEFT JOIN participantes p ON p.equipe = e.codigo AND p.evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
GROUP BY e.codigo, e.nome, e.cor_hex;

CREATE OR REPLACE VIEW public.vw_estatisticas_diarias WITH (security_invoker = on) AS
WITH base AS (
  SELECT (vp.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS data,
         vp.pontos_total, vp.indicacoes_validas, vp.pontos_participacao
  FROM vw_pontuacao_participante vp
  WHERE vp.evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
)
SELECT data,
  count(*) FILTER (WHERE pontos_participacao > 0) AS participantes,
  COALESCE(sum(indicacoes_validas), 0)::bigint AS indicacoes,
  round(COALESCE(sum(pontos_total), 0), 2) AS pontuacao
FROM base GROUP BY data;

CREATE OR REPLACE VIEW public.vw_distribuicao_habilidades WITH (security_invoker = on) AS
SELECT h.codigo AS habilidade, COALESCE(c.total, 0::bigint) AS total
FROM ( SELECT unnest(enum_range(NULL::habilidade_tipo)) AS codigo) h
LEFT JOIN ( SELECT habilidade_sorteada AS codigo, count(*) AS total
            FROM participantes
            WHERE habilidade_sorteada IS NOT NULL
              AND evento_id IS NOT DISTINCT FROM public.evento_ativo_id()
            GROUP BY habilidade_sorteada) c ON c.codigo = h.codigo;