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