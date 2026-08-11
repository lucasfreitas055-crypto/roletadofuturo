/**
 * Consultas e operações do Painel Administrativo — SERVIDOR APENAS.
 *
 * Pontuação oficial: 1 ponto por participante válido + 0,1 por indicação válida.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { garantirEventoAtivoId } from "@/database/evento-atual.server";
import { registrarAuditoria } from "@/database/participacao.server";
import type { EquipeCodigo } from "@/types/database.types";

export const PONTOS_PARTICIPANTE = 1;
export const PONTOS_INDICACAO = 0.1;

export interface LinhaRanking {
  equipe: EquipeCodigo;
  nome: string;
  corHex: string;
  participantes: number;
  indicacoes: number;
  pontosMissao: number;
  pontuacao: number;
  posicao: number;
  lider: boolean;
  empate: boolean;
}

export interface LinhaDiaria {
  data: string;
  participantes: number;
  indicacoes: number;
  pontuacao: number;
}

export interface ResumoPainel {
  participantesTotais: number;
  participantesHoje: number;
  indicacoesTotais: number;
  indicacoesHoje: number;
  pontuacaoGeral: number;
  pontuacaoHoje: number;
  equipeLider: { nome: string; corHex: string; pontuacao: number } | null;
  empate: boolean;
}

export interface LeadRow {
  id: string;
  nome: string;
  idade_aluno: number | null;
  responsavel_nome: string;
  responsavel_whatsapp: string;
  equipe: EquipeCodigo;
  habilidade_sorteada: string | null;
  quantidade_indicacoes: number;
  created_at: string;
}

export interface FiltroLeads {
  busca?: string;
  equipe?: EquipeCodigo;
  habilidade?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
  offset?: number;
}

function hojeSaoPaulo(): string {
  const agora = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return fmt.format(agora);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/* --------------------------------- Ranking -------------------------------- */

export async function obterRankingPontuacao(): Promise<LinhaRanking[]> {
  const { data, error } = await supabaseAdmin.from("vw_ranking_pontuacao").select("*");
  if (error) throw new Error(error.message);

  const linhas = (data ?? []).map((linha) => ({
    equipe: (linha.equipe ?? "AZUL") as EquipeCodigo,
    nome: linha.nome ?? "",
    corHex: linha.cor_hex ?? "#888888",
    participantes: Number(linha.participantes ?? 0),
    indicacoes: Number(linha.indicacoes_validas ?? 0),
    pontosMissao: arredondar(Number(linha.pontos_missao ?? 0)),
    pontuacao: arredondar(Number(linha.pontuacao ?? 0)),
  }));

  linhas.sort((a, b) => b.pontuacao - a.pontuacao || b.participantes - a.participantes);
  const topo = linhas[0]?.pontuacao ?? 0;
  const lideres = linhas.filter((l) => l.pontuacao === topo && topo > 0).length;

  return linhas.map((linha, indice) => ({
    ...linha,
    posicao: indice + 1,
    lider: topo > 0 && linha.pontuacao === topo,
    empate: lideres > 1 && linha.pontuacao === topo,
  }));
}

export async function obterEstatisticasDiarias(): Promise<LinhaDiaria[]> {
  const { data, error } = await supabaseAdmin
    .from("vw_estatisticas_diarias")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((linha) => ({
    data: String(linha.data ?? ""),
    participantes: Number(linha.participantes ?? 0),
    indicacoes: Number(linha.indicacoes ?? 0),
    pontuacao: arredondar(Number(linha.pontuacao ?? 0)),
  }));
}

export async function obterResumoPainel(): Promise<ResumoPainel> {
  const [ranking, diarias] = await Promise.all([
    obterRankingPontuacao(),
    obterEstatisticasDiarias(),
  ]);

  const hoje = hojeSaoPaulo();
  const linhaHoje = diarias.find((d) => d.data === hoje);
  const participantesTotais = ranking.reduce((s, r) => s + r.participantes, 0);
  const indicacoesTotais = ranking.reduce((s, r) => s + r.indicacoes, 0);
  const lider = ranking.find((r) => r.lider) ?? null;

  return {
    participantesTotais,
    participantesHoje: linhaHoje?.participantes ?? 0,
    indicacoesTotais,
    indicacoesHoje: linhaHoje?.indicacoes ?? 0,
    pontuacaoGeral: arredondar(ranking.reduce((s, r) => s + r.pontuacao, 0)),
    pontuacaoHoje: linhaHoje?.pontuacao ?? 0,
    equipeLider: lider
      ? { nome: lider.nome, corHex: lider.corHex, pontuacao: lider.pontuacao }
      : null,
    empate: Boolean(lider?.empate),
  };
}

/* ---------------------------------- Leads --------------------------------- */

export async function listarLeads(
  filtro: FiltroLeads,
): Promise<{ linhas: LeadRow[]; total: number }> {
  const colunas =
    "id, nome, idade_aluno, responsavel_nome, responsavel_whatsapp, equipe, habilidade_sorteada, quantidade_indicacoes, created_at";
  let query = supabaseAdmin
    .from("participantes")
    .select(colunas, { count: "exact" })
    .eq("evento_id", await garantirEventoAtivoId())
    .order("created_at", { ascending: false });

  if (filtro.equipe) query = query.eq("equipe", filtro.equipe);
  if (filtro.habilidade) query = query.eq("habilidade_sorteada", filtro.habilidade as "INGLES");
  if (filtro.dataInicio) query = query.gte("created_at", filtro.dataInicio);
  if (filtro.dataFim) query = query.lte("created_at", filtro.dataFim);
  if (filtro.busca) {
    const termo = `%${filtro.busca.trim()}%`;
    const digitos = filtro.busca.replace(/\D/g, "");
    const partes = [`nome.ilike.${termo}`, `responsavel_nome.ilike.${termo}`];
    if (digitos.length >= 3) partes.push(`responsavel_whatsapp_normalizado.ilike.%${digitos}%`);
    query = query.or(partes.join(","));
  }

  const limite = Math.min(filtro.limite ?? 100, 1000);
  const offset = filtro.offset ?? 0;
  const { data, error, count } = await query.range(offset, offset + limite - 1);
  if (error) throw new Error(error.message);
  return { linhas: (data ?? []) as unknown as LeadRow[], total: count ?? 0 };
}

/* ------------------------------- Indicações -------------------------------- */

export interface ResumoIndicacoesParticipante {
  participanteId: string;
  nome: string;
  equipe: EquipeCodigo;
  validas: number;
  invalidas: number;
  pontuacao: number;
}

export async function obterResumoIndicacoes(): Promise<ResumoIndicacoesParticipante[]> {
  const { data, error } = await supabaseAdmin
    .from("indicacoes")
    .select("id, status, participante_id, participantes!inner(nome, equipe)")
    .eq("evento_id", await garantirEventoAtivoId())
    .limit(5000);
  if (error) throw new Error(error.message);

  const mapa = new Map<string, ResumoIndicacoesParticipante>();
  for (const linha of data ?? []) {
    const relacionado = linha.participantes as unknown as { nome: string; equipe: EquipeCodigo };
    const atual = mapa.get(linha.participante_id) ?? {
      participanteId: linha.participante_id,
      nome: relacionado?.nome ?? "—",
      equipe: (relacionado?.equipe ?? "AZUL") as EquipeCodigo,
      validas: 0,
      invalidas: 0,
      pontuacao: 0,
    };
    if (linha.status === "INVALIDA") atual.invalidas += 1;
    else atual.validas += 1;
    atual.pontuacao = arredondar(atual.validas * PONTOS_INDICACAO);
    mapa.set(linha.participante_id, atual);
  }

  return [...mapa.values()].sort((a, b) => b.validas - a.validas);
}

export async function invalidarIndicacao(
  id: string,
  invalidar: boolean,
  usuario: string,
  motivo: string,
): Promise<{ ok: boolean }> {
  const { data, error } = await supabaseAdmin
    .from("indicacoes")
    .update({
      invalidada_manualmente: invalidar,
      motivo_invalidacao: invalidar ? motivo || "Invalidada pelo administrador" : null,
    })
    .eq("id", id)
    .select("participante_id")
    .maybeSingle();
  if (error) throw new Error(error.message);

  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: invalidar
      ? `Indicação invalidada pelo administrador. ${motivo}`.trim()
      : "Indicação revalidada pelo administrador.",
    participanteId: data?.participante_id ?? null,
    usuario,
    metadata: { indicacaoId: id },
  });

  return { ok: true };
}

/* ------------------------------ Configurações ------------------------------ */

export interface ConfiguracoesPainel {
  logo_url: string | null;
  campanha: string;
  escola: string;
  texto_abertura: string;
  texto_finalizacao: string;
  mostrar_ranking: boolean;
  modo: "EVENTO" | "TESTE" | "DEMONSTRACAO";
  parceiro_nome: string | null;
  parceiro_logo_url: string | null;
  msg_agendar: string | null;
  msg_apresentar: string | null;
  msg_indicado: string | null;
}

const MSG_AGENDAR_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz — vimos que {ALUNO} demonstrou interesse em conhecer as nossas 5 aulas experimentais gratuitas na Gincana Santa Luzia. Podemos agendar a primeira aula? Temos horários disponíveis nesta e na próxima semana. Fico no aguardo!";

const MSG_APRESENTAR_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz — foi um prazer receber {ALUNO} na Roleta do Futuro durante a Gincana Santa Luzia. A Mister Wiz é uma escola que desenvolve habilidades para o futuro: inglês, liderança, empreendedorismo, educação financeira e inteligência emocional. Se tiver interesse em conhecer melhor a metodologia, estou à disposição!";

const MSG_INDICADO_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz. Seu amigo {INDICADOR} indicou o seu contato para conhecer melhor a nossa escola. Trabalhamos com o desenvolvimento de habilidades para o futuro — inglês, liderança, empreendedorismo, educação financeira e inteligência emocional — e adoraríamos te apresentar uma aula experimental gratuita. Podemos conversar?";

const CONFIG_PADRAO: ConfiguracoesPainel = {
  logo_url: null,
  campanha: "Roleta do Futuro",
  escola: "Colégio Santa Luzia",
  texto_abertura: "Gire a roleta, descubra sua habilidade e pontue para a sua equipe.",
  texto_finalizacao: "Obrigado por participar! Boa sorte na gincana.",
  mostrar_ranking: true,
  modo: "EVENTO",
  parceiro_nome: null,
  parceiro_logo_url: null,
  msg_agendar: MSG_AGENDAR_PADRAO,
  msg_apresentar: MSG_APRESENTAR_PADRAO,
  msg_indicado: MSG_INDICADO_PADRAO,
};

export async function obterConfiguracoes(): Promise<ConfiguracoesPainel> {
  // Cast necessário: colunas parceiro_* foram adicionadas via migração e os
  // types autogerados do Supabase podem estar defasados até a próxima geração.
  const { data, error } = (await supabaseAdmin
    .from("configuracoes")
    .select(
      "logo_url, campanha, escola, texto_abertura, texto_finalizacao, mostrar_ranking, modo, parceiro_nome, parceiro_logo_url, msg_agendar, msg_apresentar, msg_indicado",
    )
    .eq("id", true)
    .maybeSingle()) as { data: Record<string, unknown> | null; error: unknown };
  if (error || !data) return CONFIG_PADRAO;
  const modoRaw = data["modo"];
  const modo: ConfiguracoesPainel["modo"] =
    modoRaw === "DEMONSTRACAO" ? "DEMONSTRACAO" : modoRaw === "TESTE" ? "TESTE" : "EVENTO";
  return { ...CONFIG_PADRAO, ...(data as Partial<ConfiguracoesPainel>), modo };
}

export async function salvarConfiguracoes(
  entrada: Partial<ConfiguracoesPainel>,
  usuario: string,
): Promise<ConfiguracoesPainel> {
  const payload = { ...entrada, updated_at: new Date().toISOString() } as Record<string, unknown>;
  const { error } = await supabaseAdmin
    .from("configuracoes")
    .update(payload as never)
    .eq("id", true);
  if (error) throw new Error(error.message);

  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: "Configurações da campanha alteradas.",
    usuario,
    metadata: entrada as Record<string, unknown>,
  });

  return obterConfiguracoes();
}

/* -------------------------------- Extrato ---------------------------------- */

export interface LinhaExtrato {
  nome: string;
  equipe: EquipeCodigo;
  indicacoes: number;
  pontuacao: number;
}

export async function obterExtratoGincana(): Promise<{
  resumo: ResumoPainel;
  ranking: LinhaRanking[];
  participantes: LinhaExtrato[];
}> {
  const eventoIdExtrato = await garantirEventoAtivoId();
  const [resumo, ranking, participantes] = await Promise.all([
    obterResumoPainel(),
    obterRankingPontuacao(),
    supabaseAdmin
      .from("participantes")
      .select("nome, equipe, id")
      .eq("evento_id", eventoIdExtrato)
      .eq("participacao_valida", true)
      .order("nome", { ascending: true })
      .limit(2000),
  ]);
  if (participantes.error) throw new Error(participantes.error.message);

  const { data: validas, error: erroInd } = await supabaseAdmin
    .from("indicacoes")
    .select("participante_id")
    .eq("evento_id", eventoIdExtrato)
    .eq("status", "VALIDADA")
    .limit(20000);
  if (erroInd) throw new Error(erroInd.message);

  const contagem = new Map<string, number>();
  for (const linha of validas ?? []) {
    contagem.set(linha.participante_id, (contagem.get(linha.participante_id) ?? 0) + 1);
  }

  const linhas: LinhaExtrato[] = (participantes.data ?? []).map((p) => {
    const indicacoes = contagem.get(p.id) ?? 0;
    return {
      nome: p.nome,
      equipe: p.equipe as EquipeCodigo,
      indicacoes,
      pontuacao: arredondar(PONTOS_PARTICIPANTE + indicacoes * PONTOS_INDICACAO),
    };
  });

  return { resumo, ranking, participantes: linhas };
}

/* --------------------------- Dashboard Comercial --------------------------- */

export interface DashboardComercial {
  porIdade: { faixa: string; total: number }[];
  porEquipe: { equipe: string; nome: string; corHex: string; total: number }[];
  porHabilidade: { habilidade: string; total: number }[];
  porInteresse: { interesse: string; total: number }[];
  indicacoesValidas: number;
  indicacoesInvalidas: number;
  totalLeads: number;
}

function faixaDaIdade(idade: number | null): string {
  if (idade === null) return "Não informado";
  if (idade <= 8) return "6-8";
  if (idade <= 11) return "9-11";
  if (idade <= 14) return "12-14";
  if (idade <= 18) return "15-18";
  return "19+";
}

const FAIXAS = ["6-8", "9-11", "12-14", "15-18", "19+", "Não informado"] as const;
const INTERESSES = ["SIM", "QUERO_SABER_MAIS", "TALVEZ_DEPOIS", "SEM_RESPOSTA"] as const;

export async function obterDashboardComercial(): Promise<DashboardComercial> {
  const eventoIdDash = await garantirEventoAtivoId();
  const [
    { data: participantes, error },
    { data: distribuicao },
    { data: indicacoes },
    { data: equipes },
  ] = await Promise.all([
    supabaseAdmin
      .from("participantes")
      .select("idade_aluno, equipe, habilidade_sorteada, interesse_matricula")
      .eq("evento_id", eventoIdDash)
      .limit(10000),
    supabaseAdmin.from("vw_distribuicao_habilidades").select("*"),
    supabaseAdmin.from("indicacoes").select("status").eq("evento_id", eventoIdDash).limit(10000),
    supabaseAdmin.from("equipes").select("codigo, nome, cor_hex, ordem").order("ordem"),
  ]);
  if (error) throw new Error(error.message);

  const linhas = participantes ?? [];

  const porIdade = FAIXAS.map((faixa) => ({
    faixa,
    total: linhas.filter((l) => faixaDaIdade(l.idade_aluno) === faixa).length,
  })).filter((f) => f.total > 0 || f.faixa !== "Não informado");

  const porEquipe = (equipes ?? []).map((e) => ({
    equipe: String(e.codigo),
    nome: e.nome,
    corHex: e.cor_hex,
    total: linhas.filter((l) => l.equipe === e.codigo).length,
  }));

  const porHabilidade = (distribuicao ?? []).map((d) => ({
    habilidade: String(d.habilidade),
    total: Number(d.total ?? 0),
  }));

  const porInteresse = INTERESSES.map((interesse) => ({
    interesse,
    total: linhas.filter((l) =>
      interesse === "SEM_RESPOSTA" ? !l.interesse_matricula : l.interesse_matricula === interesse,
    ).length,
  }));

  return {
    porIdade,
    porEquipe,
    porHabilidade,
    porInteresse,
    indicacoesValidas: (indicacoes ?? []).filter((i) => i.status === "VALIDADA").length,
    indicacoesInvalidas: (indicacoes ?? []).filter((i) => i.status === "INVALIDA").length,
    totalLeads: linhas.length,
  };
}
