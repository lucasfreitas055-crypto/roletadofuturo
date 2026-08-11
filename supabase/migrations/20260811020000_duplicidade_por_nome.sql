-- Muda a regra de duplicidade de participante:
--   ANTES: bloqueava por WhatsApp do responsável (barrava irmãos).
--   AGORA: bloqueia por nome do aluno DENTRO do evento (irmãos podem
--          compartilhar o mesmo responsável/whatsapp).

-- 1) Remove o índice único antigo do WhatsApp (permite repetição legítima).
DROP INDEX IF EXISTS public.participantes_whatsapp_unico;

-- 2) Índice não-único para busca rápida por WhatsApp (usado no dashboard).
CREATE INDEX IF NOT EXISTS participantes_whatsapp_lookup
  ON public.participantes (responsavel_whatsapp_normalizado);

-- 3) Novo índice único: mesmo nome de aluno NÃO pode se repetir no mesmo evento.
CREATE UNIQUE INDEX IF NOT EXISTS participantes_nome_evento_unico
  ON public.participantes (nome_normalizado, evento_id)
  WHERE nome_normalizado IS NOT NULL AND evento_id IS NOT NULL;
