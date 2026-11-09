import { z } from "zod";

import { EQUIPES } from "@/config/event.config";
import { normalizarTelefone } from "@/utils/normalize";

const nomeSchema = z
  .string()
  .trim()
  .min(3, { message: "Informe o nome completo" })
  .max(120, { message: "Nome muito longo" });

const whatsappSchema = z
  .string()
  .trim()
  .min(10, { message: "Informe o WhatsApp com DDD" })
  .max(25, { message: "WhatsApp inválido" })
  .refine(
    (v) => {
      const d = normalizarTelefone(v);
      return d.length >= 10 && d.length <= 13;
    },
    { message: "WhatsApp inválido" },
  );

export const novoParticipanteSchema = z.object({
  nome: nomeSchema,
  idadeAluno: z.number({ invalid_type_error: "Informe a idade" }).int().min(1).max(120).nullable(),
  responsavelNome: nomeSchema,
  responsavelWhatsapp: whatsappSchema,
  equipe: z.enum(EQUIPES as unknown as [string, ...string[]]),
});

export const novaIndicacaoSchema = z.object({
  participanteId: z.string().uuid(),
  nome: nomeSchema,
  idade: z
    .number({ invalid_type_error: "Informe a idade" })
    .int()
    .min(1)
    .max(99)
    .nullable()
    .optional(),
  responsavelNome: z.string().trim().max(120).optional(),
  whatsapp: whatsappSchema,
});

export const habilidadeSchema = z.object({
  participanteId: z.string().uuid(),
  habilidade: z.enum([
    "INGLES",
    "LIDERANCA",
    "EMPREENDEDORISMO",
    "EDUCACAO_FINANCEIRA",
    "INTELIGENCIA_EMOCIONAL",
  ]),
});

const habilidadeEnum = z.enum([
  "INGLES",
  "LIDERANCA",
  "EMPREENDEDORISMO",
  "EDUCACAO_FINANCEIRA",
  "INTELIGENCIA_EMOCIONAL",
]);

const alternativaEnum = z.enum(["A", "B", "C", "D", "E"]);

/** Busca do banco de questões do Quest. */
export const questoesSchema = z.object({
  habilidade: habilidadeEnum,
  faixaEtaria: z.number().int().min(1).max(4),
});

/** Resultado completo do Quest, com as respostas para auditoria. */
export const questRespostasSchema = z.object({
  participanteId: z.string().uuid(),
  tempoSegundos: z.number().int().min(0).max(600),
  acertos: z.number().int().min(0).max(10),
  erros: z.number().int().min(0).max(10),
  naoRespondidas: z.number().int().min(0).max(10),
  speedFactor: z.number().min(0).max(1),
  accuracyFactor: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
  totalQuestoes: z.number().int().min(1).max(20).optional(),
  respostas: z
    .array(
      z.object({
        questaoId: z.string().trim().min(1).max(80),
        ordem: z.number().int().min(1).max(10),
        selecionada: alternativaEnum.nullable(),
        correta: alternativaEnum,
        acertou: z.boolean(),
        tempoSegundos: z.number().min(0).max(600),
      }),
    )
    .max(10),
});

/** Desafio das Latas — apenas o tempo; a pontuação é calculada no servidor. */
export const desafioSchema = z.object({
  participanteId: z.string().uuid(),
  tempoSegundos: z.number().int().min(0).max(300),
});

export const interesseSchema = z.object({
  participanteId: z.string().uuid(),
  interesse: z.enum(["SIM", "NAO", "QUERO_SABER_MAIS", "TALVEZ_DEPOIS"]),
});

export const filtroParticipantesSchema = z.object({
  equipe: z.enum(EQUIPES as unknown as [string, ...string[]]).optional(),
  premioId: z.string().uuid().optional(),
  statusLead: z.enum(["NOVO", "CONTATADO", "AGENDADO", "MATRICULADO", "NAO_CONVERTEU"]).optional(),
  statusPremio: z.enum(["PENDENTE", "DESBLOQUEADO", "RESGATADO"]).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  somenteValidos: z.boolean().optional(),
  busca: z.string().trim().max(120).optional(),
  limite: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export type NovoParticipanteSchema = z.infer<typeof novoParticipanteSchema>;
export type NovaIndicacaoSchema = z.infer<typeof novaIndicacaoSchema>;
export type FiltroParticipantesSchema = z.infer<typeof filtroParticipantesSchema>;

/* ------------------------------ Painel admin ------------------------------- */

export const filtroLeadsSchema = z.object({
  busca: z.string().trim().max(120).optional(),
  equipe: z.enum(EQUIPES as unknown as [string, ...string[]]).optional(),
  habilidade: z
    .enum([
      "INGLES",
      "LIDERANCA",
      "EMPREENDEDORISMO",
      "EDUCACAO_FINANCEIRA",
      "INTELIGENCIA_EMOCIONAL",
    ])
    .optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  limite: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export const configuracoesSchema = z.object({
  logo_url: z.string().trim().max(500).nullable().optional(),
  campanha: z.string().trim().min(2).max(120).optional(),
  escola: z.string().trim().min(2).max(160).optional(),
  texto_abertura: z.string().trim().max(400).optional(),
  texto_finalizacao: z.string().trim().max(400).optional(),
  mostrar_ranking: z.boolean().optional(),
  modo: z.enum(["EVENTO", "TESTE", "DEMONSTRACAO"]).optional(),
  parceiro_nome: z.string().trim().max(120).nullable().optional(),
  parceiro_logo_url: z.string().trim().max(500).nullable().optional(),
  msg_agendar: z.string().trim().max(1000).nullable().optional(),
  msg_apresentar: z.string().trim().max(1000).nullable().optional(),
  msg_indicado: z.string().trim().max(1000).nullable().optional(),
});
