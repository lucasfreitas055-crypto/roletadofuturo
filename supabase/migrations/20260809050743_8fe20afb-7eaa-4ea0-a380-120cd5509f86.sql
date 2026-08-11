CREATE OR REPLACE FUNCTION public.indicacoes_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _motivo text := NULL;
BEGIN
  NEW.nome_normalizado := public.normalizar_nome(NEW.nome);
  NEW.whatsapp_normalizado := public.normalizar_telefone(NEW.whatsapp);

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
  ) THEN
    _motivo := 'WhatsApp já indicado';
  ELSIF EXISTS (
    SELECT 1 FROM public.participantes p
     WHERE p.responsavel_whatsapp_normalizado = NEW.whatsapp_normalizado
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

UPDATE public.indicacoes
   SET motivo_invalidacao = 'Indicação fora do perfil'
 WHERE status = 'INVALIDA'
   AND motivo_invalidacao = 'Idade fora da faixa de 6 a 18 anos';