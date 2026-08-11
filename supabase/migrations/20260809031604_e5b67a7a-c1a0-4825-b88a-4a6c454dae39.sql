
CREATE TABLE IF NOT EXISTS public.questoes (
  id text PRIMARY KEY,
  habilidade public.habilidade_tipo NOT NULL,
  faixa_etaria smallint NOT NULL CHECK (faixa_etaria BETWEEN 1 AND 4),
  dificuldade smallint NOT NULL DEFAULT 1 CHECK (dificuldade BETWEEN 1 AND 5),
  enunciado text NOT NULL,
  imagem text,
  alternativa_a text NOT NULL,
  alternativa_b text NOT NULL,
  alternativa_c text NOT NULL,
  alternativa_d text NOT NULL,
  alternativa_e text NOT NULL,
  resposta_correta char(1) NOT NULL CHECK (resposta_correta IN ('A','B','C','D','E')),
  explicacao_curta text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.questoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questoes TO authenticated;
GRANT ALL ON public.questoes TO service_role;
ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questoes_public_read ON public.questoes;
CREATE POLICY questoes_public_read ON public.questoes
  FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS questoes_admin_all ON public.questoes;
CREATE POLICY questoes_admin_all ON public.questoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS questoes_busca_idx
  ON public.questoes (habilidade, faixa_etaria) WHERE ativo;

CREATE TABLE IF NOT EXISTS public.quest_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  questao_id text NOT NULL,
  ordem smallint NOT NULL,
  alternativa_selecionada char(1),
  resposta_correta char(1) NOT NULL,
  correta boolean NOT NULL DEFAULT false,
  tempo_segundos numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quest_respostas TO authenticated;
GRANT ALL ON public.quest_respostas TO service_role;
ALTER TABLE public.quest_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quest_respostas_admin_read ON public.quest_respostas;
CREATE POLICY quest_respostas_admin_read ON public.quest_respostas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS quest_respostas_participante_idx
  ON public.quest_respostas (participante_id);

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS faixa_etaria smallint,
  ADD COLUMN IF NOT EXISTS quest_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS quest_fim timestamptz,
  ADD COLUMN IF NOT EXISTS quest_tempo_segundos integer,
  ADD COLUMN IF NOT EXISTS quest_acertos smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_erros smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_nao_respondidas smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_speed_factor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_accuracy_factor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quest_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS participation_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_score numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.participantes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _validas int;
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.responsavel_whatsapp_normalizado := public.normalizar_telefone(NEW.responsavel_whatsapp);
  NEW.updated_at := now();
  IF length(NEW.responsavel_whatsapp_normalizado) < 10 THEN
    RAISE EXCEPTION 'WHATSAPP_INVALIDO';
  END IF;

  NEW.faixa_etaria := CASE
    WHEN NEW.idade_aluno IS NULL THEN NULL
    WHEN NEW.idade_aluno <= 8 THEN 1
    WHEN NEW.idade_aluno <= 11 THEN 2
    WHEN NEW.idade_aluno <= 14 THEN 3
    ELSE 4
  END;

  SELECT count(*) INTO _validas
    FROM public.indicacoes i
   WHERE i.participante_id = NEW.id AND i.status = 'VALIDADA';

  NEW.quest_score := LEAST(GREATEST(COALESCE(NEW.quest_score, 0), 0), 1);
  NEW.participation_score := CASE WHEN NEW.participacao_valida THEN 1 ELSE 0 END;
  NEW.referral_score := LEAST(COALESCE(_validas, 0) * 0.1, 1);
  NEW.total_score := LEAST(NEW.participation_score + NEW.quest_score + NEW.referral_score, 3);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalcular_status_premio(_participante_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total int;
BEGIN
  SELECT count(*) INTO _total FROM public.indicacoes
   WHERE participante_id = _participante_id AND status <> 'INVALIDA';

  UPDATE public.participantes
     SET quantidade_indicacoes = _total
   WHERE id = _participante_id;
END;
$function$;

DROP VIEW IF EXISTS public.vw_pontuacao_participante CASCADE;

CREATE VIEW public.vw_pontuacao_participante AS
SELECT p.id,
       p.equipe,
       p.nome,
       p.idade_aluno,
       p.faixa_etaria,
       p.habilidade_sorteada,
       p.interesse_matricula,
       p.created_at,
       CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END AS pontos_participacao,
       LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric) AS pontos_quest,
       LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric) AS pontos_missao,
       LEAST(COALESCE(v.validas, 0::bigint)::numeric * 0.1, 1::numeric) AS pontos_indicacoes,
       COALESCE(v.validas, 0::bigint) AS indicacoes_validas,
       LEAST(
         CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END
         + LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric)
         + LEAST(COALESCE(v.validas, 0::bigint)::numeric * 0.1, 1::numeric), 3::numeric) AS pontos_total
  FROM public.participantes p
  LEFT JOIN (
        SELECT i.participante_id, count(*) AS validas
          FROM public.indicacoes i
         WHERE i.status = 'VALIDADA'
         GROUP BY i.participante_id) v ON v.participante_id = p.id;

CREATE VIEW public.vw_ranking_pontuacao AS
SELECT e.codigo AS equipe,
       e.nome,
       e.cor_hex,
       COALESCE(agg.participantes, 0::bigint) AS participantes,
       COALESCE(agg.indicacoes_validas, 0::numeric)::bigint AS indicacoes_validas,
       round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_quest,
       round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_missao,
       round(COALESCE(agg.pontuacao, 0::numeric), 2) AS pontuacao
  FROM public.equipes e
  LEFT JOIN (
        SELECT vp.equipe,
               count(*) FILTER (WHERE vp.pontos_participacao > 0::numeric) AS participantes,
               sum(vp.indicacoes_validas) AS indicacoes_validas,
               sum(vp.pontos_quest) AS pontos_quest,
               sum(vp.pontos_total) AS pontuacao
          FROM public.vw_pontuacao_participante vp
         GROUP BY vp.equipe) agg ON agg.equipe = e.codigo;

CREATE VIEW public.vw_estatisticas_diarias AS
WITH base AS (
  SELECT (vp.created_at AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data,
         vp.pontos_total,
         vp.indicacoes_validas,
         vp.pontos_participacao
    FROM public.vw_pontuacao_participante vp
)
SELECT data,
       count(*) FILTER (WHERE pontos_participacao > 0::numeric) AS participantes,
       COALESCE(sum(indicacoes_validas), 0::numeric)::bigint AS indicacoes,
       round(COALESCE(sum(pontos_total), 0::numeric), 2) AS pontuacao
  FROM base
 GROUP BY data;

UPDATE public.participantes SET updated_at = now();
