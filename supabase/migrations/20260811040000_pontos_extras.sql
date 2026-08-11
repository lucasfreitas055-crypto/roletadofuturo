-- Pontuação extra manual (games físicos entre as 3 equipes)
-- Cada linha representa 1 aluno de 1 equipe recebendo pontos de 1 atividade.
CREATE TABLE IF NOT EXISTS public.pontos_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  atividade text NOT NULL,
  participante_id uuid NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  equipe public.equipe_tipo NOT NULL,
  pontos numeric NOT NULL CHECK (pontos >= 0),
  autor text NOT NULL DEFAULT 'operador',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pontos_extras_evento ON public.pontos_extras (evento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pontos_extras_participante ON public.pontos_extras (participante_id);
CREATE INDEX IF NOT EXISTS idx_pontos_extras_equipe ON public.pontos_extras (evento_id, equipe);

GRANT SELECT, INSERT, DELETE ON public.pontos_extras TO anon, authenticated;
GRANT ALL ON public.pontos_extras TO service_role;
ALTER TABLE public.pontos_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pontos_extras_public_all ON public.pontos_extras;
CREATE POLICY pontos_extras_public_all ON public.pontos_extras
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
