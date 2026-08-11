-- Campos de parceria da campanha (exibidos discretamente na tela inicial do participante).
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS parceiro_nome text,
  ADD COLUMN IF NOT EXISTS parceiro_logo_url text;
