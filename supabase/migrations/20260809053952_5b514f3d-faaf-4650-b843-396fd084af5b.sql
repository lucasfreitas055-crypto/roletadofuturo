CREATE OR REPLACE VIEW public.vw_pontuacao_participante AS
 SELECT p.id,
    p.equipe,
    p.nome,
    p.idade_aluno,
    p.faixa_etaria,
    p.habilidade_sorteada,
    p.interesse_matricula,
    p.created_at,
    CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END AS pontos_participacao,
    LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric) AS pontos_quest,
    LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric) AS pontos_missao,
    LEAST(COALESCE(v.validas, 0::bigint)::numeric * 0.1, 1::numeric) AS pontos_indicacoes,
    COALESCE(v.validas, 0::bigint) AS indicacoes_validas,
    LEAST(
      CASE WHEN p.participacao_valida THEN 1::numeric ELSE 0::numeric END
      + LEAST(COALESCE(p.quest_score, 0::numeric), 1::numeric)
      + LEAST(COALESCE(v.validas, 0::bigint)::numeric * 0.1, 1::numeric), 3::numeric) AS pontos_total,
    p.evento_id
   FROM participantes p
     LEFT JOIN ( SELECT i.participante_id, count(*) AS validas
           FROM indicacoes i
          WHERE i.status = 'VALIDADA'::status_indicacao
          GROUP BY i.participante_id) v ON v.participante_id = p.id;

CREATE OR REPLACE VIEW public.vw_ranking_pontuacao AS
 SELECT e.codigo AS equipe,
    e.nome,
    e.cor_hex,
    COALESCE(agg.participantes, 0::bigint) AS participantes,
    COALESCE(agg.indicacoes_validas, 0::numeric)::bigint AS indicacoes_validas,
    round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_quest,
    round(COALESCE(agg.pontos_quest, 0::numeric), 2) AS pontos_missao,
    round(COALESCE(agg.pontuacao, 0::numeric), 2) AS pontuacao
   FROM equipes e
     LEFT JOIN ( SELECT vp.equipe,
            count(*) FILTER (WHERE vp.pontos_participacao > 0::numeric) AS participantes,
            sum(vp.indicacoes_validas) AS indicacoes_validas,
            sum(vp.pontos_quest) AS pontos_quest,
            sum(vp.pontos_total) AS pontuacao
           FROM vw_pontuacao_participante vp
          WHERE vp.evento_id IS NOT DISTINCT FROM (SELECT ev.id FROM eventos ev WHERE ev.status = 'ATIVO' ORDER BY ev.numero DESC LIMIT 1)
          GROUP BY vp.equipe) agg ON agg.equipe = e.codigo;

CREATE OR REPLACE FUNCTION public.indicacoes_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _motivo text := NULL;
  _evento uuid;
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.whatsapp_normalizado := public.normalizar_telefone(NEW.whatsapp);

  SELECT p.evento_id INTO _evento FROM public.participantes p WHERE p.id = NEW.participante_id;

  IF NEW.invalidada_manualmente THEN
    _motivo := COALESCE(NEW.motivo_invalidacao, 'Invalidada pelo administrador');
  ELSIF NEW.idade IS NULL OR NEW.idade < 6 OR NEW.idade > 18 THEN
    _motivo := 'Indicação fora do perfil';
  ELSIF length(NEW.whatsapp_normalizado) < 10 OR length(NEW.whatsapp_normalizado) > 13 THEN
    _motivo := 'WhatsApp inválido';
  ELSIF EXISTS (
    SELECT 1 FROM public.indicacoes i
     WHERE i.whatsapp_normalizado = NEW.whatsapp_normalizado
       AND i.id <> NEW.id
       AND i.status <> 'INVALIDA'
       AND i.evento_id IS NOT DISTINCT FROM _evento
  ) THEN
    _motivo := 'WhatsApp já indicado';
  ELSIF EXISTS (
    SELECT 1 FROM public.participantes p
     WHERE p.responsavel_whatsapp_normalizado = NEW.whatsapp_normalizado
       AND p.evento_id IS NOT DISTINCT FROM _evento
  ) THEN
    _motivo := 'Já cadastrado como participante';
  END IF;

  IF _motivo IS NULL THEN
    NEW.status := 'VALIDADA';
    NEW.motivo_invalidacao := NULL;
  ELSE
    NEW.status := 'INVALIDA';
    NEW.motivo_invalidacao := _motivo;
  END IF;

  RETURN NEW;
END;
$function$;