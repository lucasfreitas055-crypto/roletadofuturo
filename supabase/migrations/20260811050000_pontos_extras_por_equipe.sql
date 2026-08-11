-- Game Extra simplificado: pontos vão direto pra EQUIPE (aluno é opcional).
ALTER TABLE public.pontos_extras
  ALTER COLUMN participante_id DROP NOT NULL;
