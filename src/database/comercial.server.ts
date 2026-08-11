/**
 * Dashboard Comercial — camada de dados (SERVIDOR APENAS).
 *
 * Leitura: agregada em um único round-trip, paginada para suportar
 * milhares de participantes e dezenas de milhares de indicações.
 *
 * Escrita: EXCLUSIVAMENTE status comercial e observações (tabelas crm_*).
 * Nenhuma função deste arquivo altera pontuação, ranking, perguntas,
 * respostas, cronômetros ou indicações.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { garantirEventoAtivoId } from "@/database/evento-atual.server";

export type StatusComercial =
  | "NOVO"
  | "PRIMEIRO_CONTATO"
  | "AULA_AGENDADA"
  | "COMPARECEU"
  | "MATRICULADO"
  | "RETORNAR"
  | "SEM_INTERESSE";

export type ClassificacaoLead = "MUITO_QUENTE" | "QUENTE" | "MORNO" | "BAIXO";

export type TipoLead = "PARTICIPANTE" | "INDICACAO";

export interface LinhaComercial {
  id: string;
  tipo: TipoLead;
  /** Para indicações: nome do participante que indicou. Vazio em participantes. */
  indicadoPor: string | null;
  nome: string;
  idade: number | null;
  equipe: string;
  responsavelNome: string;
  telefone: string;
  telefoneValido: boolean;
  pontuacao: number;
  questScore: number;
  tempoSegundos: number | null;
  habilidade: string | null;
  indicacoesValidas: number;
  indicacoesForaPerfil: number;
  indicacoesTotais: number;
  interesse: string | null;
  aceitouAula: boolean;
  fluxoCompleto: boolean;
  criadoEm: string;
  status: StatusComercial;
  observacoes: string;
  atualizadoEm: string | null;
  scoreComercial: number;
  classificacao: ClassificacaoLead;
}

export interface EquipeComercial {
  codigo: string;
  nome: string;
  corHex: string;
}

export interface ComercialPayload {
  atualizadoEm: string;
  participantes: LinhaComercial[];
  equipes: EquipeComercial[];
}

export interface EventoHistorico {
  id: string;
  statusAnterior: StatusComercial | null;
  statusNovo: StatusComercial;
  observacao: string | null;
  criadoEm: string;
}

const PAGINA = 1000;
const LIMITE_PARTICIPANTES = 20_000;
const LIMITE_INDICACOES = 100_000;

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

/** Busca paginada — o PostgREST limita o número de linhas por requisição. */
async function paginar<T>(
  consulta: (
    de: number,
    ate: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  limite: number,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; de < limite; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return linhas;
}

/** Score Comercial (0–100) — heurística determinística e somente leitura. */
export function calcularScoreComercial(entrada: {
  interesse: string | null;
  indicacoesValidas: number;
  pontuacao: number;
  tempoSegundos: number | null;
  fluxoCompleto: boolean;
}): number {
  let score = 0;
  if (entrada.interesse === "SIM") score += 40;
  else if (entrada.interesse === "QUERO_SABER_MAIS") score += 22;
  else if (entrada.interesse === "TALVEZ_DEPOIS") score += 8;
  // "NAO" é recusa explícita: não soma pontos comerciais.

  score += Math.min(30, entrada.indicacoesValidas * 3);

  if (entrada.pontuacao >= 2.7) score += 15;
  else if (entrada.pontuacao >= 2) score += 8;

  if (entrada.tempoSegundos !== null && entrada.tempoSegundos > 0 && entrada.tempoSegundos <= 180) {
    score += 10;
  } else if (entrada.tempoSegundos !== null && entrada.tempoSegundos > 0) {
    score += 4;
  }

  if (entrada.fluxoCompleto) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function classificarLead(score: number): ClassificacaoLead {
  if (score >= 75) return "MUITO_QUENTE";
  if (score >= 55) return "QUENTE";
  if (score >= 30) return "MORNO";
  return "BAIXO";
}

export async function obterDashboardComercial(eventoIdParam?: string): Promise<ComercialPayload> {
  const eventoId = eventoIdParam ?? (await garantirEventoAtivoId());
  const [pessoas, indicacoes, crm, equipes] = await Promise.all([
    paginar(
      (de, ate) =>
        supabaseAdmin
          .from("participantes")
          .select(
            "id, nome, idade_aluno, equipe, responsavel_nome, responsavel_whatsapp, responsavel_whatsapp_normalizado, total_score, quest_score, quest_tempo_segundos, tempo_missao_segundos, habilidade_sorteada, interesse_matricula, missao_concluida, quest_fim, created_at",
          )
          .eq("evento_id", eventoId)
          .order("created_at", { ascending: false })
          .range(de, ate),
      LIMITE_PARTICIPANTES,
    ),
    paginar(
      (de, ate) =>
        supabaseAdmin
          .from("indicacoes")
          .select(
            "id, participante_id, status, motivo_invalidacao, nome, idade, responsavel_nome, whatsapp, whatsapp_normalizado, created_at",
          )
          .eq("evento_id", eventoId)
          .range(de, ate),
      LIMITE_INDICACOES,
    ),
    paginar(
      (de, ate) =>
        supabaseAdmin
          .from("crm_leads")
          .select("participante_id, status, observacoes, updated_at")
          .range(de, ate),
      LIMITE_PARTICIPANTES,
    ),
    supabaseAdmin.from("equipes").select("codigo, nome, cor_hex").order("ordem"),
  ]);

  if (equipes.error) throw new Error(equipes.error.message);

  const validas = new Map<string, number>();
  const foraPerfil = new Map<string, number>();
  const totais = new Map<string, number>();
  for (const ind of indicacoes) {
    const chave = String(ind.participante_id);
    totais.set(chave, (totais.get(chave) ?? 0) + 1);
    if (ind.status === "VALIDADA") validas.set(chave, (validas.get(chave) ?? 0) + 1);
    else if ((ind.motivo_invalidacao ?? "").toLowerCase().includes("fora do perfil")) {
      foraPerfil.set(chave, (foraPerfil.get(chave) ?? 0) + 1);
    }
  }

  const crmPorId = new Map(crm.map((linha) => [String(linha.participante_id), linha]));

  const participantes: LinhaComercial[] = pessoas.map((p) => {
    const id = String(p.id);
    const telefoneNormalizado = String(p.responsavel_whatsapp_normalizado ?? "");
    const tempo =
      p.quest_tempo_segundos !== null && p.quest_tempo_segundos !== undefined
        ? Number(p.quest_tempo_segundos)
        : p.tempo_missao_segundos !== null && p.tempo_missao_segundos !== undefined
          ? Number(p.tempo_missao_segundos)
          : null;
    const indicacoesValidas = validas.get(id) ?? 0;
    const pontuacao = arredondar(Number(p.total_score ?? 0));
    const interesse = (p.interesse_matricula as string | null) ?? null;
    const fluxoCompleto = Boolean(p.quest_fim ?? p.missao_concluida) && interesse !== null;
    const score = calcularScoreComercial({
      interesse,
      indicacoesValidas,
      pontuacao,
      tempoSegundos: tempo,
      fluxoCompleto,
    });
    const registro = crmPorId.get(id);

    return {
      id,
      tipo: "PARTICIPANTE" as const,
      indicadoPor: null,
      nome: String(p.nome ?? ""),
      idade: p.idade_aluno === null || p.idade_aluno === undefined ? null : Number(p.idade_aluno),
      equipe: String(p.equipe ?? ""),
      responsavelNome: String(p.responsavel_nome ?? ""),
      telefone: String(p.responsavel_whatsapp ?? ""),
      telefoneValido: telefoneNormalizado.length >= 10 && telefoneNormalizado.length <= 13,
      pontuacao,
      questScore: arredondar(Number(p.quest_score ?? 0)),
      tempoSegundos: tempo,
      habilidade: (p.habilidade_sorteada as string | null) ?? null,
      indicacoesValidas,
      indicacoesForaPerfil: foraPerfil.get(id) ?? 0,
      indicacoesTotais: totais.get(id) ?? 0,
      interesse,
      aceitouAula: interesse === "SIM",
      fluxoCompleto,
      criadoEm: String(p.created_at ?? ""),
      status: (registro?.status as StatusComercial | undefined) ?? "NOVO",
      observacoes: registro?.observacoes ?? "",
      atualizadoEm: registro?.updated_at ? String(registro.updated_at) : null,
      scoreComercial: score,
      classificacao: classificarLead(score),
    };
  });

  // Mapa auxiliar para descobrir quem indicou (nome do participante)
  const nomePorParticipanteId = new Map(pessoas.map((p) => [String(p.id), String(p.nome ?? "")]));

  // Cada indicação vira também um lead comercial (sem pontuação/quest).
  const indicados: LinhaComercial[] = (indicacoes as Record<string, unknown>[]).map((ind) => {
    const whatsapp = String(ind["whatsapp"] ?? "");
    const whatsappNormalizado = String(ind["whatsapp_normalizado"] ?? "");
    const nomeIndicador = nomePorParticipanteId.get(String(ind["participante_id"])) ?? "";
    return {
      id: `ind:${String(ind["id"])}`,
      tipo: "INDICACAO" as const,
      indicadoPor: nomeIndicador,
      nome: String(ind["nome"] ?? ""),
      idade: ind["idade"] === null || ind["idade"] === undefined ? null : Number(ind["idade"]),
      equipe: "",
      responsavelNome: String(ind["responsavel_nome"] ?? ""),
      telefone: whatsapp,
      telefoneValido: whatsappNormalizado.length >= 10 && whatsappNormalizado.length <= 13,
      pontuacao: 0,
      questScore: 0,
      tempoSegundos: null,
      habilidade: null,
      indicacoesValidas: 0,
      indicacoesForaPerfil: 0,
      indicacoesTotais: 0,
      interesse: null,
      aceitouAula: false,
      fluxoCompleto: false,
      criadoEm: String(ind["created_at"] ?? ""),
      status: "NOVO",
      observacoes: "",
      atualizadoEm: null,
      scoreComercial: 10,
      classificacao: "BAIXO",
    };
  });

  const todos = [...participantes, ...indicados];
  todos.sort((a, b) => b.scoreComercial - a.scoreComercial || b.pontuacao - a.pontuacao);

  return {
    atualizadoEm: new Date().toISOString(),
    participantes: todos,
    equipes: (equipes.data ?? []).map((e) => ({
      codigo: String(e.codigo),
      nome: String(e.nome ?? ""),
      corHex: String(e.cor_hex ?? "#888888"),
    })),
  };
}

/** Única escrita permitida além das observações. Registra histórico imutável. */
export async function alterarStatusComercial(
  participanteId: string,
  novoStatus: StatusComercial,
): Promise<{ ok: true }> {
  const atual = await supabaseAdmin
    .from("crm_leads")
    .select("status")
    .eq("participante_id", participanteId)
    .maybeSingle();
  if (atual.error) throw new Error(atual.error.message);

  const anterior = (atual.data?.status as StatusComercial | undefined) ?? null;
  if (anterior === novoStatus) return { ok: true };

  const upsert = await supabaseAdmin
    .from("crm_leads")
    .upsert(
      { participante_id: participanteId, status: novoStatus, updated_at: new Date().toISOString() },
      { onConflict: "participante_id" },
    );
  if (upsert.error) throw new Error(upsert.error.message);

  const historico = await supabaseAdmin.from("crm_historico").insert({
    participante_id: participanteId,
    status_anterior: anterior,
    status_novo: novoStatus,
  });
  if (historico.error) throw new Error(historico.error.message);

  return { ok: true };
}

export async function salvarObservacaoComercial(
  participanteId: string,
  observacoes: string,
): Promise<{ ok: true }> {
  const { error } = await supabaseAdmin.from("crm_leads").upsert(
    {
      participante_id: participanteId,
      observacoes: observacoes.slice(0, 2000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participante_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function obterHistoricoComercial(participanteId: string): Promise<EventoHistorico[]> {
  const { data, error } = await supabaseAdmin
    .from("crm_historico")
    .select("id, status_anterior, status_novo, observacao, created_at")
    .eq("participante_id", participanteId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((linha) => ({
    id: String(linha.id),
    statusAnterior: (linha.status_anterior as StatusComercial | null) ?? null,
    statusNovo: linha.status_novo as StatusComercial,
    observacao: linha.observacao ?? null,
    criadoEm: String(linha.created_at ?? ""),
  }));
}
