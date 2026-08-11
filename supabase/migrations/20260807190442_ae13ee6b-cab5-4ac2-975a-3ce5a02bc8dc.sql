CREATE TYPE public.habilidade_tipo AS ENUM ('INGLES','LIDERANCA','EMPREENDEDORISMO','EDUCACAO_FINANCEIRA','INTELIGENCIA_EMOCIONAL');

ALTER TABLE public.participantes
  ADD COLUMN habilidade_sorteada public.habilidade_tipo,
  ADD COLUMN missao_concluida boolean NOT NULL DEFAULT false,
  ADD COLUMN horario_inicio_missao timestamptz,
  ADD COLUMN horario_fim_missao timestamptz;