
-- ============================================================
-- 20260807182906_7c98e1f0-c27d-4d19-a175-9186320c1b3d.sql
-- ============================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.equipe_tipo AS ENUM ('AZUL', 'VERDE', 'AMARELA');
CREATE TYPE public.premio_tipo AS ENUM ('BRINDE', 'DESCONTO');
CREATE TYPE public.status_premio AS ENUM ('PENDENTE', 'DESBLOQUEADO', 'RESGATADO');
CREATE TYPE public.status_lead AS ENUM ('NOVO', 'CONTATADO', 'AGENDADO', 'MATRICULADO', 'NAO_CONVERTEU');
CREATE TYPE public.status_indicacao AS ENUM ('PENDENTE', 'VALIDADA', 'INVALIDA');
CREATE TYPE public.tipo_auditoria AS ENUM (
  'PARTICIPACAO_CRIADA','PARTICIPACAO_BLOQUEADA','TENTATIVA_DUPLICADA','TENTATIVA_FRAUDE',
  'POSSIVEL_DUPLICIDADE','ALTERACAO_MANUAL','CORRECAO_EQUIPE','PREMIO_ALTERADO',
  'EXCLUSAO','AUTORIZACAO_ADMIN','INDICACAO_CRIADA','LOGIN_ADMIN'
);

-- ============ NORMALIZADORES ============
CREATE OR REPLACE FUNCTION public.normalizar_nome(_valor text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT upper(
    btrim(
      regexp_replace(
        translate(
          coalesce(_valor, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        ),
        '\s+', ' ', 'g'
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.normalizar_telefone(_valor text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(coalesce(_valor, ''), '[^0-9]', '', 'g')
$$;

-- ============ PAPEIS ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PERFIS ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ EQUIPES (lista fixa) ============
CREATE TABLE public.equipes (
  codigo public.equipe_tipo PRIMARY KEY,
  nome text NOT NULL,
  cor_hex text NOT NULL,
  ordem int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.equipes TO anon, authenticated;
GRANT ALL ON public.equipes TO service_role;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipes_public_read" ON public.equipes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "equipes_admin_write" ON public.equipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.equipes (codigo, nome, cor_hex, ordem) VALUES
  ('AZUL', 'Equipe Azul', '#1D4ED8', 1),
  ('VERDE', 'Equipe Verde', '#15803D', 2),
  ('AMARELA', 'Equipe Amarela', '#CA8A04', 3);

-- ============ PREMIOS ============
CREATE TABLE public.premios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  descricao text,
  tipo public.premio_tipo NOT NULL DEFAULT 'BRINDE',
  probabilidade numeric(6,3) NOT NULL DEFAULT 0 CHECK (probabilidade >= 0),
  ativo boolean NOT NULL DEFAULT true,
  quantidade_disponivel integer,
  quantidade_utilizada integer NOT NULL DEFAULT 0,
  quantidade_indicacoes_exigidas integer NOT NULL DEFAULT 0 CHECK (quantidade_indicacoes_exigidas >= 0),
  ordem integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.premios TO anon, authenticated;
GRANT ALL ON public.premios TO service_role;
ALTER TABLE public.premios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "premios_public_read" ON public.premios FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "premios_admin_all" ON public.premios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.premios (nome, descricao, tipo, probabilidade, quantidade_indicacoes_exigidas, ordem) VALUES
  ('Desconto de 20%', 'Desconto de 20% na matrícula. Indique 3 amigos para desbloquear.', 'DESCONTO', 25, 3, 1),
  ('Desconto de 35%', 'Desconto de 35% na matrícula. Indique 5 amigos para desbloquear.', 'DESCONTO', 12, 5, 2),
  ('Desconto de 45%', 'Desconto de 45% na matrícula. Indique 10 amigos para desbloquear.', 'DESCONTO', 3, 10, 3),
  ('Caneta Mister Wiz', 'Brinde exclusivo Mister Wiz.', 'BRINDE', 25, 0, 4),
  ('Chaveiro Mister Wiz', 'Brinde exclusivo Mister Wiz.', 'BRINDE', 20, 0, 5),
  ('Squeeze Mister Wiz', 'Brinde exclusivo Mister Wiz.', 'BRINDE', 15, 0, 6);

-- ============ PARTICIPANTES ============
CREATE TABLE public.participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  nome_normalizado text NOT NULL,
  idade_aluno integer CHECK (idade_aluno IS NULL OR (idade_aluno BETWEEN 1 AND 120)),
  responsavel_nome text NOT NULL,
  responsavel_whatsapp text NOT NULL,
  responsavel_whatsapp_normalizado text NOT NULL,
  equipe public.equipe_tipo NOT NULL REFERENCES public.equipes(codigo),
  premio_id uuid REFERENCES public.premios(id),
  premio_nome text,
  status_premio public.status_premio NOT NULL DEFAULT 'PENDENTE',
  status_lead public.status_lead NOT NULL DEFAULT 'NOVO',
  quantidade_indicacoes integer NOT NULL DEFAULT 0,
  participacao_valida boolean NOT NULL DEFAULT false,
  possivel_duplicidade boolean NOT NULL DEFAULT false,
  liberado_por uuid,
  ip text,
  user_agent text
);
CREATE UNIQUE INDEX participantes_whatsapp_unico ON public.participantes (responsavel_whatsapp_normalizado);
CREATE INDEX participantes_nome_norm_idx ON public.participantes (nome_normalizado);
CREATE INDEX participantes_equipe_idx ON public.participantes (equipe) WHERE participacao_valida;
CREATE INDEX participantes_created_at_idx ON public.participantes (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participantes TO authenticated;
GRANT ALL ON public.participantes TO service_role;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participantes_admin_all" ON public.participantes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ INDICACOES ============
CREATE TABLE public.indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nome_normalizado text NOT NULL,
  whatsapp text NOT NULL,
  whatsapp_normalizado text NOT NULL,
  status public.status_indicacao NOT NULL DEFAULT 'PENDENTE'
);
CREATE UNIQUE INDEX indicacoes_unica_por_participante ON public.indicacoes (participante_id, whatsapp_normalizado);
CREATE INDEX indicacoes_participante_idx ON public.indicacoes (participante_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicacoes TO authenticated;
GRANT ALL ON public.indicacoes TO service_role;
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "indicacoes_admin_all" ON public.indicacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo public.tipo_auditoria NOT NULL,
  descricao text NOT NULL,
  participante_id uuid REFERENCES public.participantes(id) ON DELETE SET NULL,
  usuario text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX auditoria_created_at_idx ON public.auditoria (created_at DESC);
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_admin_read" ON public.auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS DE NORMALIZACAO / CONTAGEM ============
CREATE OR REPLACE FUNCTION public.participantes_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.responsavel_whatsapp_normalizado := public.normalizar_telefone(NEW.responsavel_whatsapp);
  NEW.updated_at := now();
  IF length(NEW.responsavel_whatsapp_normalizado) < 10 THEN
    RAISE EXCEPTION 'WHATSAPP_INVALIDO';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER participantes_normaliza
BEFORE INSERT OR UPDATE ON public.participantes
FOR EACH ROW EXECUTE FUNCTION public.participantes_before_write();

CREATE OR REPLACE FUNCTION public.indicacoes_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.whatsapp_normalizado := public.normalizar_telefone(NEW.whatsapp);
  RETURN NEW;
END;
$$;
CREATE TRIGGER indicacoes_normaliza
BEFORE INSERT OR UPDATE ON public.indicacoes
FOR EACH ROW EXECUTE FUNCTION public.indicacoes_before_write();

-- Recalcula quantidade de indicacoes e status do premio
CREATE OR REPLACE FUNCTION public.recalcular_status_premio(_participante_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _total int;
  _exigidas int;
  _status public.status_premio;
BEGIN
  SELECT count(*) INTO _total FROM public.indicacoes
   WHERE participante_id = _participante_id AND status <> 'INVALIDA';

  SELECT COALESCE(pr.quantidade_indicacoes_exigidas, 0), p.status_premio
    INTO _exigidas, _status
    FROM public.participantes p
    LEFT JOIN public.premios pr ON pr.id = p.premio_id
   WHERE p.id = _participante_id;

  IF _status = 'RESGATADO' THEN
    UPDATE public.participantes SET quantidade_indicacoes = _total WHERE id = _participante_id;
    RETURN;
  END IF;

  UPDATE public.participantes
     SET quantidade_indicacoes = _total,
         status_premio = CASE WHEN _total >= COALESCE(_exigidas, 0) THEN 'DESBLOQUEADO'::public.status_premio
                              ELSE 'PENDENTE'::public.status_premio END
   WHERE id = _participante_id;
END;
$$;
REVOKE ALL ON FUNCTION public.recalcular_status_premio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_status_premio(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.indicacoes_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalcular_status_premio(COALESCE(NEW.participante_id, OLD.participante_id));
  RETURN NULL;
END;
$$;
CREATE TRIGGER indicacoes_recalcula
AFTER INSERT OR UPDATE OR DELETE ON public.indicacoes
FOR EACH ROW EXECUTE FUNCTION public.indicacoes_after_write();

-- ============ CONSULTAS PRONTAS ============
CREATE OR REPLACE VIEW public.vw_ranking_equipes
WITH (security_invoker = true) AS
  SELECT e.codigo AS equipe,
         e.nome,
         e.cor_hex,
         COUNT(p.id) FILTER (WHERE p.participacao_valida) AS total_participantes,
         RANK() OVER (ORDER BY COUNT(p.id) FILTER (WHERE p.participacao_valida) DESC) AS posicao
    FROM public.equipes e
    LEFT JOIN public.participantes p ON p.equipe = e.codigo
   GROUP BY e.codigo, e.nome, e.cor_hex;
GRANT SELECT ON public.vw_ranking_equipes TO authenticated, service_role;

CREATE OR REPLACE VIEW public.vw_participantes_por_dia
WITH (security_invoker = true) AS
  SELECT date_trunc('day', created_at)::date AS dia,
         COUNT(*) FILTER (WHERE participacao_valida) AS total_validos,
         COUNT(*) AS total_registros
    FROM public.participantes
   GROUP BY 1 ORDER BY 1 DESC;
GRANT SELECT ON public.vw_participantes_por_dia TO authenticated, service_role;

CREATE OR REPLACE VIEW public.vw_participantes_por_premio
WITH (security_invoker = true) AS
  SELECT pr.id AS premio_id, pr.nome AS premio_nome, pr.tipo,
         COUNT(p.id) FILTER (WHERE p.participacao_valida) AS total
    FROM public.premios pr
    LEFT JOIN public.participantes p ON p.premio_id = pr.id
   GROUP BY pr.id, pr.nome, pr.tipo;
GRANT SELECT ON public.vw_participantes_por_premio TO authenticated, service_role;

CREATE OR REPLACE VIEW public.vw_resumo_dashboard
WITH (security_invoker = true) AS
  SELECT
    (SELECT COUNT(*) FROM public.participantes WHERE participacao_valida) AS total_participantes,
    (SELECT COUNT(*) FROM public.participantes) AS total_registros,
    (SELECT COUNT(*) FROM public.participantes WHERE possivel_duplicidade) AS total_possiveis_duplicidades,
    (SELECT COUNT(*) FROM public.indicacoes) AS total_indicacoes,
    (SELECT COUNT(*) FROM public.participantes p JOIN public.premios pr ON pr.id = p.premio_id
      WHERE pr.tipo = 'DESCONTO' AND p.participacao_valida) AS total_descontos,
    (SELECT COUNT(*) FROM public.participantes p JOIN public.premios pr ON pr.id = p.premio_id
      WHERE pr.tipo = 'BRINDE' AND p.participacao_valida) AS total_brindes,
    (SELECT e.codigo FROM public.equipes e
       LEFT JOIN public.participantes p ON p.equipe = e.codigo AND p.participacao_valida
      GROUP BY e.codigo ORDER BY COUNT(p.id) DESC LIMIT 1) AS equipe_lider;
GRANT SELECT ON public.vw_resumo_dashboard TO authenticated, service_role;

CREATE OR REPLACE VIEW public.vw_participantes_por_status
WITH (security_invoker = true) AS
  SELECT status_lead, status_premio, COUNT(*) AS total
    FROM public.participantes WHERE participacao_valida
   GROUP BY status_lead, status_premio;
GRANT SELECT ON public.vw_participantes_por_status TO authenticated, service_role;
-- ============================================================
-- 20260807182926_b51267eb-eea1-4784-8d13-669c07935e2c.sql
-- ============================================================

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.participantes_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicacoes_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicacoes_after_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalcular_status_premio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_status_premio(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.normalizar_nome(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.normalizar_telefone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalizar_nome(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalizar_telefone(text) TO authenticated, service_role;
-- ============================================================
-- 20260807190442_ae13ee6b-cab5-4ac2-975a-3ce5a02bc8dc.sql
-- ============================================================

CREATE TYPE public.habilidade_tipo AS ENUM ('INGLES','LIDERANCA','EMPREENDEDORISMO','EDUCACAO_FINANCEIRA','INTELIGENCIA_EMOCIONAL');

ALTER TABLE public.participantes
  ADD COLUMN habilidade_sorteada public.habilidade_tipo,
  ADD COLUMN missao_concluida boolean NOT NULL DEFAULT false,
  ADD COLUMN horario_inicio_missao timestamptz,
  ADD COLUMN horario_fim_missao timestamptz;
-- ============================================================
-- 20260807191655_d3d2d313-4336-42db-b814-2156292308b8.sql
-- ============================================================

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
-- ============================================================
-- 20260807194036_ba963df5-f696-4951-9413-ce1c99ae8b1c.sql
-- ============================================================


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

-- ============================================================
-- 20260807194056_443bc9c8-0328-459d-be07-dac6e4da4abe.sql
-- ============================================================


ALTER VIEW public.vw_pontuacao_participante SET (security_invoker = on);
ALTER VIEW public.vw_ranking_pontuacao SET (security_invoker = on);
ALTER VIEW public.vw_estatisticas_diarias SET (security_invoker = on);
ALTER VIEW public.vw_distribuicao_habilidades SET (security_invoker = on);
REVOKE SELECT ON public.vw_ranking_pontuacao FROM anon, authenticated;
REVOKE SELECT ON public.vw_distribuicao_habilidades FROM anon, authenticated;

-- ============================================================
-- 20260809031604_e5b67a7a-c1a0-4825-b88a-4a6c454dae39.sql
-- ============================================================


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

-- ============================================================
-- 20260809031622_71e4b6e8-770c-4a4b-80c9-b7381d8a577d.sql
-- ============================================================


ALTER VIEW public.vw_pontuacao_participante SET (security_invoker = on);
ALTER VIEW public.vw_ranking_pontuacao SET (security_invoker = on);
ALTER VIEW public.vw_estatisticas_diarias SET (security_invoker = on);

-- ============================================================
-- 20260809031635_42d7eebd-c2c5-43ef-8d76-5e12944d2013.sql
-- ============================================================


REVOKE EXECUTE ON FUNCTION public.recalcular_status_premio(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 20260809050743_8fe20afb-7eaa-4ea0-a380-120cd5509f86.sql
-- ============================================================

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
    _motivo := 'Indicação fora do perfil';
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

UPDATE public.indicacoes
   SET motivo_invalidacao = 'Indicação fora do perfil'
 WHERE status = 'INVALIDA'
   AND motivo_invalidacao = 'Idade fora da faixa de 6 a 18 anos';
-- ============================================================
-- 20260809052248_3c1a9fb1-da13-4e22-bc0e-29f473997f39.sql
-- ============================================================

CREATE TYPE public.status_comercial AS ENUM ('NOVO','PRIMEIRO_CONTATO','AULA_AGENDADA','COMPARECEU','MATRICULADO','RETORNAR','SEM_INTERESSE');

CREATE TABLE public.crm_leads (
  participante_id uuid PRIMARY KEY REFERENCES public.participantes(id) ON DELETE CASCADE,
  status status_comercial NOT NULL DEFAULT 'NOVO',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_leads_admin_all ON public.crm_leads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.crm_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  status_anterior status_comercial,
  status_novo status_comercial NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_historico_participante_idx ON public.crm_historico (participante_id, created_at DESC);

GRANT ALL ON public.crm_historico TO service_role;
ALTER TABLE public.crm_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_historico_admin_read ON public.crm_historico FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- ============================================================
-- 20260809053345_458afdf6-69c8-4245-910c-2596c7ad7418.sql
-- ============================================================

ALTER TYPE public.interesse_matricula_tipo ADD VALUE IF NOT EXISTS 'NAO';
-- ============================================================
-- 20260809053825_6c30984e-f787-4ec5-a8ba-132e29bafa4f.sql
-- ============================================================

CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'ATIVO',
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  participantes_total integer NOT NULL DEFAULT 0,
  pontos_total numeric NOT NULL DEFAULT 0,
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  arquivo jsonb NOT NULL DEFAULT '{}'::jsonb,
  lixeira_em timestamptz,
  expurgo_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_numero_unico UNIQUE (numero),
  CONSTRAINT eventos_status_valido CHECK (status IN ('ATIVO','ENCERRADO','LIXEIRA'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY eventos_admin_all ON public.eventos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.eventos_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid REFERENCES public.eventos(id) ON DELETE SET NULL,
  acao text NOT NULL,
  usuario text NOT NULL DEFAULT 'operador',
  participantes integer NOT NULL DEFAULT 0,
  pontos numeric NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.eventos_logs TO authenticated;
GRANT ALL ON public.eventos_logs TO service_role;
ALTER TABLE public.eventos_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY eventos_logs_admin_read ON public.eventos_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.participantes ADD COLUMN evento_id uuid REFERENCES public.eventos(id);
ALTER TABLE public.indicacoes ADD COLUMN evento_id uuid REFERENCES public.eventos(id);

INSERT INTO public.eventos (numero, nome, status, iniciado_em)
VALUES (1, 'Evento 01', 'ATIVO', COALESCE((SELECT min(created_at) FROM public.participantes), now()));

UPDATE public.participantes SET evento_id = (SELECT id FROM public.eventos WHERE numero = 1);
UPDATE public.indicacoes SET evento_id = (SELECT id FROM public.eventos WHERE numero = 1);

CREATE INDEX idx_participantes_evento ON public.participantes(evento_id);
CREATE INDEX idx_indicacoes_evento ON public.indicacoes(evento_id);
CREATE INDEX idx_eventos_status ON public.eventos(status, numero DESC);

CREATE OR REPLACE FUNCTION public.evento_ativo_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.eventos WHERE status = 'ATIVO' ORDER BY numero DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.definir_evento_participante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.evento_id IS NULL THEN
    NEW.evento_id := public.evento_ativo_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_evento_indicacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.evento_id IS NULL THEN
    SELECT p.evento_id INTO NEW.evento_id FROM public.participantes p WHERE p.id = NEW.participante_id;
    IF NEW.evento_id IS NULL THEN
      NEW.evento_id := public.evento_ativo_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER participantes_evento BEFORE INSERT ON public.participantes
  FOR EACH ROW EXECUTE FUNCTION public.definir_evento_participante();

CREATE TRIGGER indicacoes_evento BEFORE INSERT ON public.indicacoes
  FOR EACH ROW EXECUTE FUNCTION public.definir_evento_indicacao();
-- ============================================================
-- 20260809053845_f4e7b916-b7ba-4074-ab7a-c47c3d73e755.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.evento_ativo_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.definir_evento_participante() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.definir_evento_indicacao() FROM anon, authenticated, public;
-- ============================================================
-- 20260809053952_5b514f3d-faaf-4650-b843-396fd084af5b.sql
-- ============================================================

CREATE OR REPLACE VIEW public.vw_pontuacao_participante AS
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
      + LEAST(COALESCE(v.validas, 0::bigint)::numeric * 0.1, 1::numeric), 3::numeric) AS pontos_total,
    p.evento_id
   FROM participantes p
     LEFT JOIN ( SELECT i.participante_id, count(*) AS validas
           FROM indicacoes i
          WHERE i.status = 'VALIDADA'::status_indicacao
          GROUP BY i.participante_id) v ON v.participante_id = p.id;

CREATE OR REPLACE VIEW public.vw_ranking_pontuacao AS
 SELECT e.codigo AS equipe,
    e.nome,
    e.cor_hex,
    COALESCE(agg.participantes, 0::bigint) AS participantes,
    COALESCE(agg.indicacoes_validas, 0::numeric)::bigint AS indicacoes_validas,
    round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_quest,
    round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_missao,
    round(COALESCE(agg.pontuacao, 0::numeric), 2) AS pontuacao
   FROM equipes e
     LEFT JOIN ( SELECT vp.equipe,
            count(*) FILTER (WHERE vp.pontos_participacao > 0::numeric) AS participantes,
            sum(vp.indicacoes_validas) AS indicacoes_validas,
            sum(vp.pontos_quest) AS pontos_quest,
            sum(vp.pontos_total) AS pontuacao
           FROM vw_pontuacao_participante vp
          WHERE vp.evento_id IS NOT DISTINCT FROM (SELECT ev.id FROM eventos ev WHERE ev.status = 'ATIVO' ORDER BY ev.numero DESC LIMIT 1)
          GROUP BY vp.equipe) agg ON agg.equipe = e.codigo;

CREATE OR REPLACE FUNCTION public.indicacoes_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _motivo text := NULL;
  _evento uuid;
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.whatsapp_normalizado := public.normalizar_telefone(NEW.whatsapp);

  SELECT p.evento_id INTO _evento FROM public.participantes p WHERE p.id = NEW.participante_id;

  IF NEW.invalidada_manualmente THEN
    _motivo := COALESCE(NEW.motivo_invalidacao, 'Invalidada pelo administrador');
  ELSIF NEW.idade IS NULL OR NEW.idade < 6 OR NEW.idade > 18 THEN
    _motivo := 'Indicação fora do perfil';
  ELSIF length(NEW.whatsapp_normalizado) < 10 OR length(NEW.whatsapp_normalizado) > 13 THEN
    _motivo := 'WhatsApp inválido';
  ELSIF EXISTS (
    SELECT 1 FROM public.indicacoes i
     WHERE i.whatsapp_normalizado = NEW.whatsapp_normalizado
       AND i.id <> NEW.id
       AND i.status <> 'INVALIDA'
       AND i.evento_id IS NOT DISTINCT FROM _evento
  ) THEN
    _motivo := 'WhatsApp já indicado';
  ELSIF EXISTS (
    SELECT 1 FROM public.participantes p
     WHERE p.responsavel_whatsapp_normalizado = NEW.whatsapp_normalizado
       AND p.evento_id IS NOT DISTINCT FROM _evento
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
-- ============================================================
-- 20260809054004_d9c2d76c-8b92-4ff2-9706-055187955440.sql
-- ============================================================

ALTER VIEW public.vw_pontuacao_participante SET (security_invoker = on);
ALTER VIEW public.vw_ranking_pontuacao SET (security_invoker = on);
-- ============================================================
-- 20260810130410_4ab8ca7e-2ba1-43b4-9d1a-142fa890d636.sql
-- ============================================================

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
-- ============================================================
-- 20260810140000_modo_teste_e_resets.sql
-- ============================================================

-- Modo Teste: participações de teste vivem em um evento próprio (status TESTE),
-- que nunca entra em evento_ativo_id() e portanto nunca aparece nas views oficiais.
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_status_valido;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_status_valido CHECK (status IN ('ATIVO','TESTE','ENCERRADO','LIXEIRA'));

-- Configuração global passa a suportar um terceiro modo de operação: TESTE.
-- EVENTO = grava no evento oficial ativo.
-- TESTE = grava normalmente, porém isolado no evento de teste (não conta no oficial).
-- DEMONSTRACAO = nada é gravado (inalterado).
ALTER TABLE public.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_modo_check;
ALTER TABLE public.configuracoes
  ADD CONSTRAINT configuracoes_modo_check CHECK (modo IN ('EVENTO','TESTE','DEMONSTRACAO'));
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS evento_teste_id uuid REFERENCES public.eventos(id);

-- Histórico de "Limpar Dados do Evento": snapshot completo antes de cada limpeza,
-- restaurável a qualquer momento. Nunca é apagado.
CREATE TABLE IF NOT EXISTS public.eventos_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  usuario text NOT NULL DEFAULT 'operador',
  participantes_antes integer NOT NULL DEFAULT 0,
  pontos_antes numeric NOT NULL DEFAULT 0,
  indicacoes_antes integer NOT NULL DEFAULT 0,
  dump jsonb NOT NULL DEFAULT '{}'::jsonb,
  restaurado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.eventos_resets TO authenticated;
GRANT ALL ON public.eventos_resets TO service_role;
ALTER TABLE public.eventos_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY eventos_resets_admin_all ON public.eventos_resets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_eventos_resets_evento ON public.eventos_resets(evento_id, created_at DESC);
