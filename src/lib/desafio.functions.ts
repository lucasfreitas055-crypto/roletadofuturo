/**
 * Server function pública do Desafio das Latas (Inteligência Emocional).
 * Arquivo fino: apenas declarações de server functions.
 */

import { createServerFn } from "@tanstack/react-start";

import { desafioSchema } from "@/utils/validation";

export const registrarDesafio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => desafioSchema.parse(input))
  .handler(async ({ data }) => {
    const { salvarDesafioLatas } = await import("@/database/desafio.server");
    return salvarDesafioLatas(data);
  });
