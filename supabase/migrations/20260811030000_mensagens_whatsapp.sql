-- Textos de mensagens WhatsApp editáveis via Configurações.
-- Usam placeholders {NOME}, {ALUNO}, {INDICADOR} que são substituídos no clique.
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS msg_agendar text,
  ADD COLUMN IF NOT EXISTS msg_apresentar text,
  ADD COLUMN IF NOT EXISTS msg_indicado text;
