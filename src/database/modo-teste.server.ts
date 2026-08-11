/**
 * Modo Teste — camada de dados (SERVIDOR APENAS).
 *
 * Quando a configuração global `modo = 'TESTE'`, toda nova participação e
 * indicação é gravada em um evento próprio (status TESTE) que nunca é
 * contabilizado pelas views/rankings oficiais — essas sempre consultam apenas
 * o evento com status ATIVO. Isso evita qualquer risco de contaminar o evento
 * real durante treinamentos, sem exigir encerrar/duplicar eventos.
 *
 * Arquivo isolado (sem importar participacao.server.ts nem painel.server.ts)
 * para evitar dependência circular.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ModoOperacao = "EVENTO" | "TESTE" | "DEMONSTRACAO";

/** Lê o modo de operação atual direto da tabela de configurações. */
export async function obterModoAtual(): Promise<{
  modo: ModoOperacao;
  eventoTesteId: string | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("configuracoes")
    .select("modo, evento_teste_id")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return { modo: "EVENTO", eventoTesteId: null };
  const modo: ModoOperacao =
    data.modo === "TESTE" ? "TESTE" : data.modo === "DEMONSTRACAO" ? "DEMONSTRACAO" : "EVENTO";
  return { modo, eventoTesteId: data.evento_teste_id ? String(data.evento_teste_id) : null };
}

/** Evento de teste persistente — reaproveitado sempre que o modo teste é ligado. */
export async function obterOuCriarEventoTeste(eventoTesteIdAtual: string | null): Promise<string> {
  if (eventoTesteIdAtual) {
    const { data } = await supabaseAdmin
      .from("eventos")
      .select("id, status")
      .eq("id", eventoTesteIdAtual)
      .maybeSingle();
    if (data && data.status === "TESTE") return String(data.id);
  }

  const { data: ultimo } = await supabaseAdmin
    .from("eventos")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1);
  const numero = Number(ultimo?.[0]?.numero ?? 0) + 1;

  const { data: criado, error } = await supabaseAdmin
    .from("eventos")
    .insert({ numero, nome: "Evento de Teste", status: "TESTE" })
    .select("id")
    .single();
  if (error || !criado)
    throw new Error(error?.message ?? "Não foi possível criar o evento de teste.");

  await supabaseAdmin.from("configuracoes").update({ evento_teste_id: criado.id }).eq("id", true);
  return String(criado.id);
}

/**
 * Resolve o evento_id a gravar em uma nova participação/indicação.
 * Retorna `undefined` quando deve usar o evento oficial ativo (o gatilho do
 * banco cuida disso automaticamente); retorna o id do evento de teste quando
 * o modo teste está ligado.
 */
export async function resolverEventoIdParaGravacao(): Promise<string | undefined> {
  const { modo, eventoTesteId } = await obterModoAtual();
  if (modo !== "TESTE") return undefined;
  return obterOuCriarEventoTeste(eventoTesteId);
}

/** Liga/desliga o Modo Teste (atalho usado no Dashboard Comercial). Nunca
 * mexe no Modo Demonstração, que só é alterado pela tela de Configurações. */
export async function definirModoTeste(
  ligar: boolean,
): Promise<{ ok: boolean; modo: ModoOperacao }> {
  const { modo: atual } = await obterModoAtual();
  const proximo: ModoOperacao = ligar ? "TESTE" : atual === "TESTE" ? "EVENTO" : atual;
  const { error } = await supabaseAdmin
    .from("configuracoes")
    .update({ modo: proximo, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, modo: atual };
  return { ok: true, modo: proximo };
}
