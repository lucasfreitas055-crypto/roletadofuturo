/**
 * Camada de banco de dados — SERVIDOR APENAS.
 * Nunca é enviada ao navegador (sufixo.server.ts).
 *
 * Toda a validação crítica (duplicidade, sorteio, contagem) acontece aqui.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolverEventoIdParaGravacao } from "@/database/modo-teste.server";
import { normalizarNome, normalizarTelefone } from "@/utils/normalize";
import type {
  NovaIndicacaoInput,
  NovoParticipanteInput,
  Premio,
  ResultadoParticipacao,
  StatusPremio,
  TipoAuditoria,
} from "@/types/database.types";

/* -------------------------------- Auditoria ------------------------------- */

export async function registrarAuditoria(params: {
  tipo: TipoAuditoria;
  descricao: string;
  participanteId?: string | null;
  usuario?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("auditoria").insert({
    tipo: params.tipo,
    descricao: params.descricao,
    participante_id: params.participanteId ?? null,
    usuario: params.usuario ?? null,
    metadata: (params.metadata ?? {}) as never,
  });
  if (error) console.error("[auditoria] falha ao registrar log:", error.message);
}

/* ---------------------------------- Prêmios -------------------------------- */

export async function listarPremiosAtivos(): Promise<Premio[]> {
  const { data, error } = await supabaseAdmin
    .from("premios")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Sorteio ponderado respeitando estoque e probabilidade. */
export function sortearPremio(premios: readonly Premio[]): Premio | null {
  const elegiveis = premios.filter(
    (p) =>
      p.ativo &&
      Number(p.probabilidade) > 0 &&
      (p.quantidade_disponivel === null || p.quantidade_utilizada < p.quantidade_disponivel),
  );
  if (elegiveis.length === 0) return null;

  const total = elegiveis.reduce((soma, p) => soma + Number(p.probabilidade), 0);
  if (total <= 0) return null;

  let sorteio = Math.random() * total;
  for (const premio of elegiveis) {
    sorteio -= Number(premio.probabilidade);
    if (sorteio <= 0) return premio;
  }
  return elegiveis[elegiveis.length - 1] ?? null;
}

/* ------------------------------ Participação ------------------------------- */

export async function registrarParticipacao(
  input: NovoParticipanteInput,
  contexto: { ip: string | null; userAgent: string | null },
): Promise<ResultadoParticipacao> {
  const whatsappNormalizado = normalizarTelefone(input.responsavelWhatsapp);
  const nomeNormalizado = normalizarNome(input.nome);

  // Descobrir em qual evento estamos gravando (modo teste isola em outro evento).
  const eventoIdTeste = await resolverEventoIdParaGravacao();
  const { garantirEventoAtivoId } = await import("@/database/evento-atual.server");
  const eventoIdAtual = eventoIdTeste ?? (await garantirEventoAtivoId());

  // Regra de duplicidade: mesmo NOME do aluno dentro do MESMO evento é bloqueio.
  // WhatsApp e responsável podem repetir (irmãos compartilham responsável).
  const { data: mesmoNome, error: erroBusca } = await supabaseAdmin
    .from("participantes")
    .select("id, nome")
    .eq("nome_normalizado", nomeNormalizado)
    .eq("evento_id", eventoIdAtual)
    .maybeSingle();
  if (erroBusca) return { status: "ERRO", mensagem: erroBusca.message };

  if (mesmoNome) {
    await registrarAuditoria({
      tipo: "TENTATIVA_DUPLICADA",
      descricao: `Tentativa de participação com nome já cadastrado neste evento: ${input.nome}.`,
      participanteId: mesmoNome.id,
      metadata: { nome: input.nome, ip: contexto.ip },
    });
    return {
      status: "BLOQUEADO_DUPLICIDADE",
      mensagem: "Este aluno já participou da Roleta do Futuro neste evento.",
    };
  }

  const possivelDuplicidade = false;

  // 3. Sorteio do prêmio.
  const premios = await listarPremiosAtivos();
  const premio = sortearPremio(premios);
  const exigidas = premio?.quantidade_indicacoes_exigidas ?? 0;
  const statusPremio: StatusPremio = exigidas > 0 ? "PENDENTE" : "DESBLOQUEADO";

  // 4. Gravação. participacao_valida só é TRUE sem duplicidade e com sucesso.
  // (eventoIdTeste foi resolvido acima, antes do bloqueio por nome.)
  const { data: criado, error: erroInsert } = await supabaseAdmin
    .from("participantes")
    .insert({
      nome: input.nome.trim(),
      nome_normalizado: nomeNormalizado,
      idade_aluno: input.idadeAluno,
      responsavel_nome: input.responsavelNome.trim(),
      responsavel_whatsapp: input.responsavelWhatsapp.trim(),
      responsavel_whatsapp_normalizado: whatsappNormalizado,
      equipe: input.equipe,
      premio_id: premio?.id ?? null,
      premio_nome: premio?.nome ?? null,
      status_premio: statusPremio,
      status_lead: "NOVO",
      participacao_valida: !possivelDuplicidade,
      possivel_duplicidade: possivelDuplicidade,
      ip: contexto.ip,
      user_agent: contexto.userAgent,
      ...(eventoIdTeste ? { evento_id: eventoIdTeste } : {}),
    })
    .select("id")
    .single();

  if (erroInsert || !criado) {
    // Corrida entre dois terminais gravando o mesmo aluno no mesmo evento.
    if (erroInsert?.code === "23505") {
      await registrarAuditoria({
        tipo: "TENTATIVA_DUPLICADA",
        descricao: `Gravação bloqueada por índice único (nome já cadastrado neste evento: ${input.nome}).`,
        metadata: { nome: input.nome },
      });
      return {
        status: "BLOQUEADO_DUPLICIDADE",
        mensagem: "Este aluno já participou da Roleta do Futuro neste evento.",
      };
    }
    await registrarAuditoria({
      tipo: "PARTICIPACAO_BLOQUEADA",
      descricao: `Falha ao gravar participação: ${erroInsert?.message ?? "desconhecida"}`,
      metadata: { nome: input.nome },
    });
    return { status: "ERRO", mensagem: "Não foi possível registrar a participação." };
  }

  if (premio) {
    await supabaseAdmin
      .from("premios")
      .update({ quantidade_utilizada: premio.quantidade_utilizada + 1 })
      .eq("id", premio.id);
  }

  if (possivelDuplicidade) {
    await registrarAuditoria({
      tipo: "POSSIVEL_DUPLICIDADE",
      descricao: `Cadastro com nome já existente aguardando liberação: ${input.nome}.`,
      participanteId: criado.id,
      metadata: { whatsapp: whatsappNormalizado },
    });
    return {
      status: "POSSIVEL_DUPLICIDADE",
      participanteId: criado.id,
      mensagem:
        "Encontramos um cadastro parecido. Um responsável da Mister Wiz precisa liberar sua participação.",
    };
  }

  await registrarAuditoria({
    tipo: "PARTICIPACAO_CRIADA",
    descricao: `Participação válida criada para ${input.nome} (${input.equipe}).`,
    participanteId: criado.id,
    metadata: { premio: premio?.nome ?? null, equipe: input.equipe },
  });

  return {
    status: "SUCESSO",
    participanteId: criado.id,
    statusPremio,
    premio: premio
      ? {
          id: premio.id,
          nome: premio.nome,
          tipo: premio.tipo,
          indicacoesExigidas: premio.quantidade_indicacoes_exigidas,
        }
      : null,
  };
}

/* --------------------------- Roleta das Habilidades ------------------------- */

const HABILIDADES_VALIDAS = [
  "INGLES",
  "LIDERANCA",
  "EMPREENDEDORISMO",
  "EDUCACAO_FINANCEIRA",
  "INTELIGENCIA_EMOCIONAL",
] as const;

export type HabilidadeDb = (typeof HABILIDADES_VALIDAS)[number];

/** Grava a habilidade sorteada e o horário de início da missão. */
export async function salvarHabilidadeSorteada(input: {
  participanteId: string;
  habilidade: string;
}): Promise<{ ok: boolean; mensagem: string }> {
  const habilidade = HABILIDADES_VALIDAS.find((h) => h === input.habilidade);
  if (!habilidade) return { ok: false, mensagem: "Habilidade inválida." };

  const { error } = await supabaseAdmin
    .from("participantes")
    .update({
      habilidade_sorteada: habilidade,
      horario_inicio_missao: new Date().toISOString(),
      missao_concluida: false,
    })
    .eq("id", input.participanteId);

  if (error) return { ok: false, mensagem: "Não foi possível registrar a habilidade." };

  await registrarAuditoria({
    tipo: "ALTERACAO_MANUAL",
    descricao: `Habilidade sorteada: ${habilidade}.`,
    participanteId: input.participanteId,
    metadata: { habilidade },
  });

  return { ok: true, mensagem: "Habilidade registrada." };
}

/** Interesse nas 5 aulas experimentais gratuitas. */
export async function salvarInteresse(input: {
  participanteId: string;
  interesse: "SIM" | "NAO" | "QUERO_SABER_MAIS" | "TALVEZ_DEPOIS";
}): Promise<{ ok: boolean; jaRespondido?: boolean }> {
  // Resposta única e definitiva: só grava quando ainda não existe registro.
  const { data, error } = await supabaseAdmin
    .from("participantes")
    .update({ interesse_matricula: input.interesse })
    .eq("id", input.participanteId)
    .is("interesse_matricula", null)
    .select("id");

  if (!error && (data?.length ?? 0) === 0) {
    return { ok: true, jaRespondido: true };
  }

  if (!error) {
    await registrarAuditoria({
      tipo: "ALTERACAO_MANUAL",
      descricao: `Interesse nas aulas experimentais: ${input.interesse}.`,
      participanteId: input.participanteId,
      metadata: { interesse: input.interesse },
    });
  }
  return { ok: !error };
}

/* ------------------------------ Placar ao vivo ----------------------------- */

export interface LinhaPlacar {
  equipe: string;
  nome: string;
  corHex: string;
  participantes: number;
  indicacoes: number;
  pontosQuest: number;
  pontuacao: number;
  posicao: number;
}

/** Placar público do totem — pontuação oficial (máx. 3 pontos por participante). */
export async function obterPlacarAoVivo(): Promise<LinhaPlacar[]> {
  const { data, error } = await supabaseAdmin.from("vw_ranking_pontuacao").select("*");
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((linha) => ({
      equipe: String(linha.equipe ?? ""),
      nome: linha.nome ?? "",
      corHex: linha.cor_hex ?? "#888888",
      participantes: Number(linha.participantes ?? 0),
      indicacoes: Number(linha.indicacoes_validas ?? 0),
      pontosQuest: Math.round(Number(linha.pontos_quest ?? 0) * 100) / 100,
      pontuacao: Math.round(Number(linha.pontuacao ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao || b.participantes - a.participantes)
    .map((linha, indice) => ({ ...linha, posicao: indice + 1 }));
}

/** Distribuição das habilidades sorteadas — usada pelo sorteio equilibrado. */
export async function obterDistribuicaoHabilidades(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin.from("vw_distribuicao_habilidades").select("*");
  if (error) return {};
  const mapa: Record<string, number> = {};
  for (const linha of data ?? []) mapa[String(linha.habilidade)] = Number(linha.total ?? 0);
  return mapa;
}

/* -------------------------------- Indicações ------------------------------- */

export async function registrarIndicacao(
  input: NovaIndicacaoInput,
): Promise<{ ok: boolean; mensagem: string; totalIndicacoes: number }> {
  const whatsappNormalizado = normalizarTelefone(input.whatsapp);

  const { data: participante } = await supabaseAdmin
    .from("participantes")
    .select("id, responsavel_whatsapp_normalizado")
    .eq("id", input.participanteId)
    .maybeSingle();

  if (!participante) {
    return { ok: false, mensagem: "Participante não encontrado.", totalIndicacoes: 0 };
  }
  if (participante.responsavel_whatsapp_normalizado === whatsappNormalizado) {
    return {
      ok: false,
      mensagem: "Não é possível indicar o próprio WhatsApp.",
      totalIndicacoes: 0,
    };
  }

  const { error } = await supabaseAdmin.from("indicacoes").insert({
    participante_id: input.participanteId,
    nome: input.nome.trim(),
    nome_normalizado: normalizarNome(input.nome),
    idade: input.idade ?? null,
    responsavel_nome: input.responsavelNome?.trim() || null,
    whatsapp: input.whatsapp.trim(),
    whatsapp_normalizado: whatsappNormalizado,
  });

  const { data: atualizado } = await supabaseAdmin
    .from("participantes")
    .select("quantidade_indicacoes")
    .eq("id", input.participanteId)
    .maybeSingle();
  const total = atualizado?.quantidade_indicacoes ?? 0;

  if (error) {
    if (error.code === "23505") {
      return { ok: false, mensagem: "Este amigo já foi indicado.", totalIndicacoes: total };
    }
    return {
      ok: false,
      mensagem: "Não foi possível registrar a indicação.",
      totalIndicacoes: total,
    };
  }

  await registrarAuditoria({
    tipo: "INDICACAO_CRIADA",
    descricao: `Indicação registrada para o participante ${input.participanteId}.`,
    participanteId: input.participanteId,
  });

  return { ok: true, mensagem: "Indicação registrada!", totalIndicacoes: total };
}
