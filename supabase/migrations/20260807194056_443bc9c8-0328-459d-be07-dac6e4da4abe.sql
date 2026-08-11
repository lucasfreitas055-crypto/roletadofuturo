
ALTER VIEW public.vw_pontuacao_participante SET (security_invoker = on);
ALTER VIEW public.vw_ranking_pontuacao SET (security_invoker = on);
ALTER VIEW public.vw_estatisticas_diarias SET (security_invoker = on);
ALTER VIEW public.vw_distribuicao_habilidades SET (security_invoker = on);
REVOKE SELECT ON public.vw_ranking_pontuacao FROM anon, authenticated;
REVOKE SELECT ON public.vw_distribuicao_habilidades FROM anon, authenticated;
