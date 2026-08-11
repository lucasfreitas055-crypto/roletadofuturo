/**
 * Gerenciamento de eventos — camada de dados (SERVIDOR APENAS).
 *
 * REGRA OBRIGATÓRIA: nenhum dado de evento é apagado. O encerramento cria
 * um arquivo completo (backup) dentro da própria linha do evento, valida a
 * integridade desse arquivo e só então inicia o próximo evento.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { garantirEventoAtivoId } from "./evento-atual.server";
import {
  calcularEquipes,
  calcularHabilidades,
  calcularMetricas,
  gerarInsights,
} from "@/lib/comercial-metrics";

import {
  obterDashboardComercial,
  type ComercialPayload,
  type LinhaComercial,
} from "./comercial.server";

export type SituacaoEvento = "ATIVO" | "TESTE" | "ENCERRADO" | "LIXEIRA";

export interface ResumoEvento {
  participantes: number;
  pontuacaoMedia: number;
  pontosTotais: number;
  equipeVencedora: string | null;
  pontosEquipeVencedora: number;
  campeao: string | null;
  pontosCampeao: number;
  melhorTempoNome: string | null;
  melhorTempoSegundos: number | null;
  maiorIndicacoesNome: string | null;
  maiorIndicacoes: number;
  indicacoesValidas: number;
  taxaConversao: number;
  matriculas: number;
  aceitaramAula: number;
  tempoMedio: number | null;
  insights: string[];
}

export interface ArquivoEvento {
  versao: number;
  geradoEm: string;
  participantes: LinhaComercial[];
  equipes: ComercialPayload["equipes"];
  rankingEquipes: { nome: string; codigo: string; pontuacao: number; participantes: number }[];
  rankingIndividual: {
    id: string;
    nome: string;
    equipe: string;
    pontuacao: number;
    indicacoes: number;
  }[];
  habilidades: { codigo: string; nome: string; total: number; mediaPontuacao: number }[];
  insights: string[];
}

export interface EventoResumido {
  id: string;
  numero: number;
  nome: string;
  status: SituacaoEvento;
  iniciadoEm: string;
  encerradoEm: string | null;
  participantes: number;
  pontos: number;
  resumo: ResumoEvento | null;
  lixeiraEm: string | null;
  expurgoEm: string | null;
}

export interface LogEvento {
  id: string;
  eventoId: string | null;
  acao: string;
  usuario: string;
  participantes: number;
  pontos: number;
  criadoEm: string;
}

const DIAS_LIXEIRA = 30;
const arredondar = (v: number) => Math.round(v * 100) / 100;

/* ------------------------------- Leitura --------------------------------- */

interface LinhaEventoBanco {
  id: string;
  numero: number;
  nome: string;
  status: string;
  iniciado_em: string;
  encerrado_em: string | null;
  participantes_total: number;
  pontos_total: number;
  resumo: unknown;
  lixeira_em: string | null;
  expurgo_em: string | null;
}

function mapear(linha: LinhaEventoBanco): EventoResumido {
  return {
    id: String(linha.id),
    numero: Number(linha.numero),
    nome: String(linha.nome),
    status: linha.status as SituacaoEvento,
    iniciadoEm: String(linha.iniciado_em),
    encerradoEm: linha.encerrado_em ? String(linha.encerrado_em) : null,
    participantes: Number(linha.participantes_total ?? 0),
    pontos: arredondar(Number(linha.pontos_total ?? 0)),
    resumo:
      linha.resumo && Object.keys(linha.resumo).length > 0 ? (linha.resumo as ResumoEvento) : null,
    lixeiraEm: linha.lixeira_em ? String(linha.lixeira_em) : null,
    expurgoEm: linha.expurgo_em ? String(linha.expurgo_em) : null,
  };
}

const CAMPOS =
  "id, numero, nome, status, iniciado_em, encerrado_em, participantes_total, pontos_total, resumo, lixeira_em, expurgo_em";

/** Evento em andamento. Cria automaticamente caso nenhum exista. */
export async function obterEventoAtivo(): Promise<EventoResumido> {
  const { data, error } = await supabaseAdmin
    .from("eventos")
    .select(CAMPOS)
    .eq("status", "ATIVO")
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const atual = data?.[0];
  if (atual) return mapear(atual as LinhaEventoBanco);

  const id = await garantirEventoAtivoId();
  const { data: novo, error: erroNovo } = await supabaseAdmin
    .from("eventos")
    .select(CAMPOS)
    .eq("id", id)
    .single();
  if (erroNovo) throw new Error(erroNovo.message);
  return mapear(novo as LinhaEventoBanco);
}

/** Cria o próximo evento sequencial (participantes zerados). */
async function criarEvento(prefixo: string): Promise<EventoResumido> {
  const { data: ultimo, error: erroUltimo } = await supabaseAdmin
    .from("eventos")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1);
  if (erroUltimo) throw new Error(erroUltimo.message);

  const numero = Number(ultimo?.[0]?.numero ?? 0) + 1;
  const nome = `${prefixo} ${String(numero).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("eventos")
    .insert({ numero, nome, status: "ATIVO" })
    .select(CAMPOS)
    .single();
  if (error) throw new Error(error.message);
  return mapear(data as LinhaEventoBanco);
}

export async function listarEventos(): Promise<EventoResumido[]> {
  await expurgarVencidos();
  const { data, error } = await supabaseAdmin
    .from("eventos")
    .select(CAMPOS)
    .order("numero", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => mapear(l as LinhaEventoBanco));
}

export async function listarLogs(): Promise<LogEvento[]> {
  const { data, error } = await supabaseAdmin
    .from("eventos_logs")
    .select("id, evento_id, acao, usuario, participantes, pontos, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: String(l.id),
    eventoId: l.evento_id ? String(l.evento_id) : null,
    acao: String(l.acao),
    usuario: String(l.usuario ?? "operador"),
    participantes: Number(l.participantes ?? 0),
    pontos: arredondar(Number(l.pontos ?? 0)),
    criadoEm: String(l.created_at ?? ""),
  }));
}

/** Arquivo completo de um evento — consulta e exportação, mesmo anos depois. */
export async function obterArquivoEvento(
  eventoId: string,
): Promise<{ evento: EventoResumido; arquivo: ArquivoEvento | null }> {
  const { data, error } = await supabaseAdmin
    .from("eventos")
    .select(`${CAMPOS}, arquivo`)
    .eq("id", eventoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Evento não encontrado.");

  const arquivoBruto = (data as { arquivo?: unknown }).arquivo;
  const arquivo =
    arquivoBruto && typeof arquivoBruto === "object" && "participantes" in (arquivoBruto as object)
      ? (arquivoBruto as ArquivoEvento)
      : null;

  // Evento em andamento ainda não tem arquivo: monta o retrato atual.
  if (!arquivo && (data as LinhaEventoBanco).status === "ATIVO") {
    return { evento: mapear(data as LinhaEventoBanco), arquivo: await montarArquivo() };
  }
  return { evento: mapear(data as LinhaEventoBanco), arquivo };
}

/* ------------------------------- Backup ---------------------------------- */

/** Retrato completo do evento em andamento. */
export async function montarArquivo(): Promise<ArquivoEvento> {
  const payload = await obterDashboardComercial();
  const equipes = calcularEquipes(payload.participantes, payload.equipes);
  const habilidades = calcularHabilidades(payload.participantes);

  return {
    versao: 1,
    geradoEm: new Date().toISOString(),
    participantes: payload.participantes,
    equipes: payload.equipes,
    rankingEquipes: equipes.map((e) => ({
      nome: e.nome,
      codigo: e.codigo,
      pontuacao: e.pontuacao,
      participantes: e.participantes,
    })),
    rankingIndividual: [...payload.participantes]
      .sort((a, b) => b.pontuacao - a.pontuacao || b.indicacoesValidas - a.indicacoesValidas)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        equipe: p.equipe,
        pontuacao: p.pontuacao,
        indicacoes: p.indicacoesValidas,
      })),
    habilidades: habilidades.map((h) => ({
      codigo: h.codigo,
      nome: h.nome,
      total: h.total,
      mediaPontuacao: h.mediaPontuacao,
    })),
    insights: gerarInsights(payload.participantes, equipes),
  };
}

export function resumirArquivo(arquivo: ArquivoEvento): ResumoEvento {
  const linhas = arquivo.participantes;
  const equipes = calcularEquipes(linhas, arquivo.equipes);
  const metricas = calcularMetricas(linhas);
  const campeao = arquivo.rankingIndividual[0] ?? null;
  const vencedora = equipes[0] ?? null;

  return {
    participantes: linhas.length,
    pontuacaoMedia: metricas.pontuacaoMedia,
    pontosTotais: arredondar(linhas.reduce((a, l) => a + l.pontuacao, 0)),
    equipeVencedora: vencedora?.nome ?? null,
    pontosEquipeVencedora: vencedora?.pontuacao ?? 0,
    campeao: campeao?.nome ?? null,
    pontosCampeao: campeao?.pontuacao ?? 0,
    melhorTempoNome: metricas.melhorTempo?.nome ?? null,
    melhorTempoSegundos: metricas.melhorTempo?.tempoSegundos ?? null,
    maiorIndicacoesNome: metricas.maisIndicacoes?.nome ?? null,
    maiorIndicacoes: metricas.maisIndicacoes?.indicacoesValidas ?? 0,
    indicacoesValidas: metricas.indicacoesValidas,
    taxaConversao: metricas.taxaConversao,
    matriculas: metricas.matriculados,
    aceitaramAula: metricas.aceitouAula,
    tempoMedio: metricas.tempoMedio,
    insights: arquivo.insights,
  };
}

/** Integridade do backup: sem isso o encerramento é cancelado. */
export async function validarArquivo(
  arquivo: ArquivoEvento,
): Promise<{ ok: boolean; motivo?: string }> {
  const { count, error } = await supabaseAdmin
    .from("participantes")
    .select("id", { count: "exact", head: true })
    .not("evento_id", "is", null)
    .eq("evento_id", (await obterEventoAtivo()).id);
  if (error) return { ok: false, motivo: `Falha ao conferir participantes: ${error.message}` };

  const esperado = count ?? 0;
  if (arquivo.participantes.length !== esperado) {
    return {
      ok: false,
      motivo: `O backup tem ${arquivo.participantes.length} participante(s) e o banco tem ${esperado}.`,
    };
  }
  if (arquivo.participantes.some((p) => !p.id || !p.nome)) {
    return { ok: false, motivo: "Há participantes sem identificação no backup." };
  }
  try {
    const bytes = JSON.stringify(arquivo).length;
    if (bytes < 20) return { ok: false, motivo: "Backup vazio." };
  } catch {
    return { ok: false, motivo: "O backup não pôde ser serializado." };
  }
  return { ok: true };
}

/* ------------------------------ Encerramento ------------------------------ */

export interface ResultadoEncerramento {
  ok: boolean;
  mensagem: string;
  eventoArquivado?: EventoResumido;
  novoEvento?: EventoResumido;
}

export async function encerrarEvento(entrada: {
  usuario: string;
  nomeNovoEvento?: string | null;
}): Promise<ResultadoEncerramento> {
  const atual = await obterEventoAtivo();

  let arquivo: ArquivoEvento;
  try {
    arquivo = await montarArquivo();
  } catch (erro) {
    return {
      ok: false,
      mensagem: `Encerramento cancelado: falha ao gerar o backup (${(erro as Error).message}).`,
    };
  }

  const validacao = await validarArquivo(arquivo);
  if (!validacao.ok) {
    return { ok: false, mensagem: `Encerramento cancelado: ${validacao.motivo}` };
  }

  const resumo = resumirArquivo(arquivo);
  const encerradoEm = new Date().toISOString();

  const { error: erroUpdate } = await supabaseAdmin
    .from("eventos")
    .update({
      status: "ENCERRADO",
      encerrado_em: encerradoEm,
      participantes_total: resumo.participantes,
      pontos_total: resumo.pontosTotais,
      resumo: JSON.parse(JSON.stringify(resumo)) as never,
      arquivo: JSON.parse(JSON.stringify(arquivo)) as never,
      updated_at: encerradoEm,
    })
    .eq("id", atual.id);
  if (erroUpdate) {
    return {
      ok: false,
      mensagem: `Encerramento cancelado: o backup não pôde ser salvo (${erroUpdate.message}).`,
    };
  }

  // Releitura obrigatória: só criamos o novo evento se o backup estiver gravado.
  const conferencia = await obterArquivoEvento(atual.id);
  if (!conferencia.arquivo || conferencia.arquivo.participantes.length !== resumo.participantes) {
    await supabaseAdmin
      .from("eventos")
      .update({ status: "ATIVO", encerrado_em: null })
      .eq("id", atual.id);
    return {
      ok: false,
      mensagem:
        "Encerramento cancelado: o backup salvo não passou na conferência. Nada foi alterado.",
    };
  }

  const novo = await criarEvento("Evento");
  if (entrada.nomeNovoEvento?.trim()) {
    await renomearEvento(novo.id, entrada.nomeNovoEvento.trim());
  }

  await registrarLog({
    eventoId: atual.id,
    acao: "ENCERRAMENTO",
    usuario: entrada.usuario,
    participantes: resumo.participantes,
    pontos: resumo.pontosTotais,
    detalhes: { novoEventoId: novo.id, novoEventoNumero: novo.numero },
  });

  return {
    ok: true,
    mensagem: `${atual.nome} arquivado com sucesso. ${novo.nome} iniciado com pontuação zerada.`,
    eventoArquivado: { ...conferencia.evento, resumo },
    novoEvento: entrada.nomeNovoEvento?.trim()
      ? { ...novo, nome: entrada.nomeNovoEvento.trim() }
      : novo,
  };
}

/** Duplicar: arquiva o atual e inicia outro com a mesma configuração e nome base. */
export async function duplicarEvento(entrada: { usuario: string }): Promise<ResultadoEncerramento> {
  const atual = await obterEventoAtivo();
  const base = atual.nome.replace(/\s*\(cópia \d+\)$/i, "");
  const resultado = await encerrarEvento({ usuario: entrada.usuario, nomeNovoEvento: null });
  if (!resultado.ok || !resultado.novoEvento) return resultado;

  const nome = `${base} (cópia ${resultado.novoEvento.numero})`;
  await renomearEvento(resultado.novoEvento.id, nome);
  await registrarLog({
    eventoId: resultado.novoEvento.id,
    acao: "DUPLICACAO",
    usuario: entrada.usuario,
    participantes: 0,
    pontos: 0,
    detalhes: { origem: atual.id },
  });

  return {
    ...resultado,
    mensagem: `${atual.nome} arquivado. ${nome} iniciado com a mesma configuração e dados zerados.`,
    novoEvento: { ...resultado.novoEvento, nome },
  };
}

/* -------------------------- Nome, lixeira e restauro ---------------------- */

export async function renomearEvento(
  eventoId: string,
  nome: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const limpo = nome.trim().slice(0, 120);
  if (limpo.length < 2)
    return { ok: false, mensagem: "Informe um nome com pelo menos 2 caracteres." };
  const { error } = await supabaseAdmin
    .from("eventos")
    .update({ nome: limpo, updated_at: new Date().toISOString() })
    .eq("id", eventoId);
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, mensagem: "Nome atualizado." };
}

/** Exclusão nunca é definitiva: vai para a lixeira com 30 dias de recuperação. */
export async function moverParaLixeira(
  eventoId: string,
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { data, error } = await supabaseAdmin
    .from("eventos")
    .select(CAMPOS)
    .eq("id", eventoId)
    .maybeSingle();
  if (error) return { ok: false, mensagem: error.message };
  if (!data) return { ok: false, mensagem: "Evento não encontrado." };

  const evento = mapear(data as LinhaEventoBanco);
  if (evento.status === "ATIVO") {
    return {
      ok: false,
      mensagem: "O evento em andamento não pode ser excluído. Encerre-o primeiro.",
    };
  }

  const agora = new Date();
  const expurgo = new Date(agora.getTime() + DIAS_LIXEIRA * 24 * 60 * 60 * 1000);
  const { error: erroUpdate } = await supabaseAdmin
    .from("eventos")
    .update({
      status: "LIXEIRA",
      lixeira_em: agora.toISOString(),
      expurgo_em: expurgo.toISOString(),
    })
    .eq("id", eventoId);
  if (erroUpdate) return { ok: false, mensagem: erroUpdate.message };

  await registrarLog({
    eventoId,
    acao: "LIXEIRA",
    usuario,
    participantes: evento.participantes,
    pontos: evento.pontos,
    detalhes: { expurgoEm: expurgo.toISOString() },
  });
  return {
    ok: true,
    mensagem: `Evento movido para a lixeira. Pode ser restaurado em até ${DIAS_LIXEIRA} dias.`,
  };
}

export async function restaurarEvento(
  eventoId: string,
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { error } = await supabaseAdmin
    .from("eventos")
    .update({ status: "ENCERRADO", lixeira_em: null, expurgo_em: null })
    .eq("id", eventoId)
    .eq("status", "LIXEIRA");
  if (error) return { ok: false, mensagem: error.message };
  await registrarLog({
    eventoId,
    acao: "RESTAURACAO",
    usuario,
    participantes: 0,
    pontos: 0,
    detalhes: {},
  });
  return { ok: true, mensagem: "Evento restaurado com sucesso." };
}

/** Expurgo automático somente após o prazo de 30 dias. */
async function expurgarVencidos(): Promise<void> {
  await supabaseAdmin
    .from("eventos")
    .delete()
    .eq("status", "LIXEIRA")
    .lt("expurgo_em", new Date().toISOString());
}

/* --------------------------- Novo evento (simples) ------------------------- */

/** Botão " Novo Evento": só pede um nome. Reaproveita o encerramento seguro
 * (backup + validação) do evento atual antes de iniciar o novo, zerado. */
export async function criarNovoEvento(entrada: {
  nome: string;
  usuario: string;
}): Promise<ResultadoEncerramento> {
  const nome = entrada.nome.trim();
  if (nome.length < 2)
    return { ok: false, mensagem: "Informe um nome com pelo menos 2 caracteres." };

  const resultado = await encerrarEvento({ usuario: entrada.usuario, nomeNovoEvento: nome });
  if (!resultado.ok || !resultado.novoEvento) return resultado;

  await registrarLog({
    eventoId: resultado.novoEvento.id,
    acao: "NOVO_EVENTO",
    usuario: entrada.usuario,
    participantes: 0,
    pontos: 0,
    detalhes: { origem: resultado.eventoArquivado?.id ?? null },
  });

  return {
    ...resultado,
    mensagem: `${resultado.novoEvento.nome} criado com sucesso. Pontuação zerada.`,
  };
}

/* ------------------- Limpar dados do evento (reset in-place) ---------------- */

interface DumpEvento {
  versao: number;
  participantes: Record<string, unknown>[];
  indicacoes: Record<string, unknown>[];
  questRespostas: Record<string, unknown>[];
  crmLeads: Record<string, unknown>[];
  crmHistorico: Record<string, unknown>[];
}

export interface ResetResumido {
  id: string;
  eventoId: string;
  eventoNome: string;
  usuario: string;
  participantesAntes: number;
  pontosAntes: number;
  indicacoesAntes: number;
  restauradoEm: string | null;
  criadoEm: string;
}

/** " Limpar Dados do Evento": sempre cria um backup completo antes de zerar.
 * O evento em si (id, nome, numero) é preservado — só os dados são zerados. */
export async function limparDadosEvento(entrada: {
  eventoId: string;
  usuario: string;
}): Promise<{ ok: boolean; mensagem: string; resetId?: string }> {
  const { eventoId, usuario } = entrada;

  const [participantesRes, indicacoesRes] = await Promise.all([
    supabaseAdmin.from("participantes").select("*").eq("evento_id", eventoId),
    supabaseAdmin.from("indicacoes").select("*").eq("evento_id", eventoId),
  ]);
  if (participantesRes.error) return { ok: false, mensagem: participantesRes.error.message };
  if (indicacoesRes.error) return { ok: false, mensagem: indicacoesRes.error.message };

  const participantes = participantesRes.data ?? [];
  const indicacoes = indicacoesRes.data ?? [];
  const participanteIds = participantes.map((p) => String((p as { id: string }).id));

  const [questRes, crmLeadsRes, crmHistoricoRes] = await Promise.all([
    participanteIds.length
      ? supabaseAdmin.from("quest_respostas").select("*").in("participante_id", participanteIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    participanteIds.length
      ? supabaseAdmin.from("crm_leads").select("*").in("participante_id", participanteIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    participanteIds.length
      ? supabaseAdmin.from("crm_historico").select("*").in("participante_id", participanteIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  const pontosAntes = arredondar(
    participantes.reduce(
      (soma, p) => soma + Number((p as { total_score?: number }).total_score ?? 0),
      0,
    ),
  );

  const dump: DumpEvento = {
    versao: 1,
    participantes: participantes as Record<string, unknown>[],
    indicacoes: indicacoes as Record<string, unknown>[],
    questRespostas: (questRes.data ?? []) as Record<string, unknown>[],
    crmLeads: (crmLeadsRes.data ?? []) as Record<string, unknown>[],
    crmHistorico: (crmHistoricoRes.data ?? []) as Record<string, unknown>[],
  };

  // 1. Backup ANTES de qualquer exclusão — sem isso a limpeza é cancelada.
  const { data: reset, error: erroReset } = await supabaseAdmin
    .from("eventos_resets")
    .insert({
      evento_id: eventoId,
      usuario: usuario.slice(0, 120) || "operador",
      participantes_antes: participantes.length,
      pontos_antes: pontosAntes,
      indicacoes_antes: indicacoes.length,
      dump: JSON.parse(JSON.stringify(dump)) as never,
    })
    .select("id")
    .single();
  if (erroReset || !reset) {
    return {
      ok: false,
      mensagem: `Limpeza cancelada: não foi possível criar o backup (${erroReset?.message ?? "erro desconhecido"}).`,
    };
  }

  // 2. Exclusão respeitando a ordem das chaves estrangeiras.
  if (participanteIds.length) {
    await supabaseAdmin.from("crm_historico").delete().in("participante_id", participanteIds);
    await supabaseAdmin.from("crm_leads").delete().in("participante_id", participanteIds);
    await supabaseAdmin.from("quest_respostas").delete().in("participante_id", participanteIds);
  }
  await supabaseAdmin.from("indicacoes").delete().eq("evento_id", eventoId);
  await supabaseAdmin.from("participantes").delete().eq("evento_id", eventoId);

  // 3. Zera os contadores do próprio evento (mesmo id, mesmo nome).
  await supabaseAdmin
    .from("eventos")
    .update({
      participantes_total: 0,
      pontos_total: 0,
      resumo: {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventoId);

  await registrarLog({
    eventoId,
    acao: "LIMPEZA",
    usuario,
    participantes: participantes.length,
    pontos: pontosAntes,
    detalhes: { resetId: reset.id },
  });

  return {
    ok: true,
    resetId: String(reset.id),
    mensagem: `Dados zerados. ${participantes.length} participante(s) e ${indicacoes.length} indicação(ões) foram salvos no backup e podem ser restaurados a qualquer momento.`,
  };
}

/** " Histórico de Resets" — nunca apagado, cada linha pode ser restaurada. */
export async function listarResets(): Promise<ResetResumido[]> {
  const { data, error } = await supabaseAdmin
    .from("eventos_resets")
    .select(
      "id, evento_id, usuario, participantes_antes, pontos_antes, indicacoes_antes, restaurado_em, created_at, eventos(nome)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  return (data ?? []).map((linha) => {
    const evento = linha.eventos as unknown as { nome?: string } | { nome?: string }[] | null;
    const nomeEvento = Array.isArray(evento) ? (evento[0]?.nome ?? "—") : (evento?.nome ?? "—");
    return {
      id: String(linha.id),
      eventoId: String(linha.evento_id),
      eventoNome: nomeEvento,
      usuario: String(linha.usuario),
      participantesAntes: Number(linha.participantes_antes ?? 0),
      pontosAntes: arredondar(Number(linha.pontos_antes ?? 0)),
      indicacoesAntes: Number(linha.indicacoes_antes ?? 0),
      restauradoEm: linha.restaurado_em ? String(linha.restaurado_em) : null,
      criadoEm: String(linha.created_at ?? ""),
    };
  });
}

/** "Restaurar": devolve exatamente os dados como estavam antes da limpeza. */
export async function restaurarReset(
  resetId: string,
  usuario: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { data, error } = await supabaseAdmin
    .from("eventos_resets")
    .select("*")
    .eq("id", resetId)
    .maybeSingle();
  if (error) return { ok: false, mensagem: error.message };
  if (!data) return { ok: false, mensagem: "Backup não encontrado." };

  const dump = data.dump as unknown as DumpEvento;

  if (Array.isArray(dump?.participantes) && dump.participantes.length) {
    const { error: e1 } = await supabaseAdmin
      .from("participantes")
      .insert(dump.participantes as never);
    if (e1) return { ok: false, mensagem: `Falha ao restaurar participantes: ${e1.message}` };
  }
  if (Array.isArray(dump?.indicacoes) && dump.indicacoes.length) {
    const { error: e2 } = await supabaseAdmin.from("indicacoes").insert(dump.indicacoes as never);
    if (e2) return { ok: false, mensagem: `Falha ao restaurar indicações: ${e2.message}` };
  }
  if (Array.isArray(dump?.questRespostas) && dump.questRespostas.length) {
    await supabaseAdmin.from("quest_respostas").insert(dump.questRespostas as never);
  }
  if (Array.isArray(dump?.crmLeads) && dump.crmLeads.length) {
    await supabaseAdmin.from("crm_leads").insert(dump.crmLeads as never);
  }
  if (Array.isArray(dump?.crmHistorico) && dump.crmHistorico.length) {
    await supabaseAdmin.from("crm_historico").insert(dump.crmHistorico as never);
  }

  await supabaseAdmin
    .from("eventos")
    .update({
      participantes_total: data.participantes_antes,
      pontos_total: data.pontos_antes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.evento_id);

  await supabaseAdmin
    .from("eventos_resets")
    .update({ restaurado_em: new Date().toISOString() })
    .eq("id", resetId);

  await registrarLog({
    eventoId: String(data.evento_id),
    acao: "RESTAURACAO_DADOS",
    usuario,
    participantes: Number(data.participantes_antes ?? 0),
    pontos: Number(data.pontos_antes ?? 0),
    detalhes: { resetId },
  });

  return {
    ok: true,
    mensagem: `${data.participantes_antes} participante(s) restaurado(s) com sucesso.`,
  };
}

async function registrarLog(entrada: {
  eventoId: string | null;
  acao: string;
  usuario: string;
  participantes: number;
  pontos: number;
  detalhes: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("eventos_logs").insert({
    evento_id: entrada.eventoId,
    acao: entrada.acao,
    usuario: entrada.usuario.slice(0, 120) || "operador",
    participantes: entrada.participantes,
    pontos: entrada.pontos,
    detalhes: entrada.detalhes as never,
  });
}
