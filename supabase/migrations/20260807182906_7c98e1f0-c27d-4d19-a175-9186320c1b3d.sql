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