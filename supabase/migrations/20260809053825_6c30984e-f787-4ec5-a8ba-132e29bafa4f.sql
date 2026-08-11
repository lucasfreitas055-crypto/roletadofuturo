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