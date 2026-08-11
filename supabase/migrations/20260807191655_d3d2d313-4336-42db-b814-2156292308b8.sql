ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS idade integer,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS motivo_invalidacao text,
  ADD COLUMN IF NOT EXISTS invalidada_manualmente boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.indicacoes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _motivo text := NULL;
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.whatsapp_normalizado := public.normalizar_telefone(NEW.whatsapp);

  IF NEW.invalidada_manualmente THEN
    _motivo := COALESCE(NEW.motivo_invalidacao, 'Invalidada pelo administrador');
  ELSIF NEW.idade IS NULL OR NEW.idade < 6 OR NEW.idade > 18 THEN
    _motivo := 'Idade fora da faixa de 6 a 18 anos';
  ELSIF length(NEW.whatsapp_normalizado) < 10 OR length(NEW.whatsapp_normalizado) > 13 THEN
    _motivo := 'WhatsApp inválido';
  ELSIF EXISTS (
    SELECT 1 FROM public.indicacoes i
     WHERE i.whatsapp_normalizado = NEW.whatsapp_normalizado
       AND i.id <> NEW.id
       AND i.status <> 'INVALIDA'
  ) THEN
    _motivo := 'WhatsApp já indicado';
  ELSIF EXISTS (
    SELECT 1 FROM public.participantes p
     WHERE p.responsavel_whatsapp_normalizado = NEW.whatsapp_normalizado
  ) THEN
    _motivo := 'Já cadastrado como participante';
  END IF;

  IF _motivo IS NULL THEN
    NEW.status := 'VALIDADA';
    NEW.motivo_invalidacao := NULL;
  ELSE
    NEW.status := 'INVALIDA';
    NEW.motivo_invalidacao := _motivo;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.configuracoes (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  logo_url text,
  campanha text NOT NULL DEFAULT 'Roleta do Futuro',
  escola text NOT NULL DEFAULT 'Colégio Santa Luzia',
  texto_abertura text NOT NULL DEFAULT 'Gire a roleta, descubra sua habilidade e pontue para a sua equipe.',
  texto_finalizacao text NOT NULL DEFAULT 'Obrigado por participar! Boa sorte na gincana.',
  mostrar_ranking boolean NOT NULL DEFAULT true,
  modo text NOT NULL DEFAULT 'EVENTO' CHECK (modo IN ('EVENTO','DEMONSTRACAO')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes TO anon;
GRANT SELECT ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracoes_public_read ON public.configuracoes;
CREATE POLICY configuracoes_public_read ON public.configuracoes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS configuracoes_admin_write ON public.configuracoes;
CREATE POLICY configuracoes_admin_write ON public.configuracoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.configuracoes (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW public.vw_ranking_pontuacao WITH (security_invoker=true) AS
SELECT e.codigo AS equipe,
       e.nome,
       e.cor_hex,
       COALESCE(pa.participantes, 0) AS participantes,
       COALESCE(ind.indicacoes_validas, 0) AS indicacoes_validas,
       ROUND(COALESCE(pa.participantes, 0) + (COALESCE(ind.indicacoes_validas, 0) * 0.1), 1) AS pontuacao
  FROM public.equipes e
  LEFT JOIN (
    SELECT p.equipe, count(*) AS participantes
      FROM public.participantes p
     WHERE p.participacao_valida
     GROUP BY p.equipe
  ) pa ON pa.equipe = e.codigo
  LEFT JOIN (
    SELECT p.equipe, count(i.id) AS indicacoes_validas
      FROM public.indicacoes i
      JOIN public.participantes p ON p.id = i.participante_id
     WHERE i.status = 'VALIDADA'
     GROUP BY p.equipe
  ) ind ON ind.equipe = e.codigo;

CREATE OR REPLACE VIEW public.vw_estatisticas_diarias WITH (security_invoker=true) AS
WITH dias AS (
  SELECT (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS data
    FROM public.participantes p WHERE p.participacao_valida
  UNION
  SELECT (i.created_at AT TIME ZONE 'America/Sao_Paulo')::date
    FROM public.indicacoes i WHERE i.status = 'VALIDADA'
)
SELECT d.data,
       (SELECT count(*) FROM public.participantes p
         WHERE p.participacao_valida
           AND (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date = d.data) AS participantes,
       (SELECT count(*) FROM public.indicacoes i
         WHERE i.status = 'VALIDADA'
           AND (i.created_at AT TIME ZONE 'America/Sao_Paulo')::date = d.data) AS indicacoes,
       ROUND(
         (SELECT count(*) FROM public.participantes p
           WHERE p.participacao_valida
             AND (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date = d.data)
         + (SELECT count(*) FROM public.indicacoes i
             WHERE i.status = 'VALIDADA'
               AND (i.created_at AT TIME ZONE 'America/Sao_Paulo')::date = d.data) * 0.1
       , 1) AS pontuacao
  FROM dias d;

GRANT SELECT ON public.vw_ranking_pontuacao TO authenticated, service_role;
GRANT SELECT ON public.vw_estatisticas_diarias TO authenticated, service_role;