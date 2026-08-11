/**
 * Evento em andamento — helper compartilhado (SERVIDOR APENAS).
 * Arquivo isolado para evitar dependência circular entre as camadas de dados.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Id do evento em andamento, criando o primeiro evento caso ainda não exista. */
export async function garantirEventoAtivoId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("eventos")
    .select("id")
    .eq("status", "ATIVO")
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const atual = data?.[0]?.id;
  if (atual) return String(atual);

  const { data: ultimo } = await supabaseAdmin
    .from("eventos")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1);
  const numero = Number(ultimo?.[0]?.numero ?? 0) + 1;

  const { data: criado, error: erroInsert } = await supabaseAdmin
    .from("eventos")
    .insert({ numero, nome: `Evento ${String(numero).padStart(2, "0")}`, status: "ATIVO" })
    .select("id")
    .single();
  if (erroInsert) throw new Error(erroInsert.message);
  return String(criado.id);
}
