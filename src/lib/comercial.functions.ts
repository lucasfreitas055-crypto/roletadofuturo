import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ComercialPayload, EventoHistorico } from "@/database/comercial.server";

const STATUS = [
  "NOVO",
  "PRIMEIRO_CONTATO",
  "AULA_AGENDADA",
  "COMPARECEU",
  "MATRICULADO",
  "RETORNAR",
  "SEM_INTERESSE",
] as const;

const esquemaStatus = z.object({
  participanteId: z.string().uuid(),
  status: z.enum(STATUS),
});

const esquemaObservacao = z.object({
  participanteId: z.string().uuid(),
  observacoes: z.string().max(2000),
});

const esquemaHistorico = z.object({ participanteId: z.string().uuid() });
const esquemaEventoOpcional = z.object({ eventoId: z.string().uuid().nullish() });

/** Leitura do Dashboard Comercial (somente leitura). Aceita um evento
 * específico (evento de teste, evento anterior) — padrão: evento ativo. */
export const obterDashboardComercialPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaEventoOpcional.parse(entrada ?? {}))
  .handler(async ({ data }): Promise<ComercialPayload> => {
    const { obterDashboardComercial } = await import("@/database/comercial.server");
    return obterDashboardComercial(data.eventoId ?? undefined);
  });

/** Única escrita permitida: status comercial. */
export const alterarStatusComercialPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaStatus.parse(entrada))
  .handler(async ({ data }) => {
    const { alterarStatusComercial } = await import("@/database/comercial.server");
    return alterarStatusComercial(data.participanteId, data.status);
  });

/** Única escrita permitida: observações comerciais. */
export const salvarObservacaoComercialPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaObservacao.parse(entrada))
  .handler(async ({ data }) => {
    const { salvarObservacaoComercial } = await import("@/database/comercial.server");
    return salvarObservacaoComercial(data.participanteId, data.observacoes);
  });

export const obterHistoricoComercialPublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaHistorico.parse(entrada))
  .handler(async ({ data }): Promise<EventoHistorico[]> => {
    const { obterHistoricoComercial } = await import("@/database/comercial.server");
    return obterHistoricoComercial(data.participanteId);
  });
