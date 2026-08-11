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
