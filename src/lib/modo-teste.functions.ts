import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const esquemaLigar = z.object({ ligar: z.boolean() });

/** Atalho público " Modo Teste" do Dashboard Comercial. Mesmo padrão de
 * acesso das demais ações de evento nesta tela (sem exigir login). */
export const alternarModoTestePublico = createServerFn({ method: "POST" })
  .inputValidator((entrada: unknown) => esquemaLigar.parse(entrada))
  .handler(async ({ data }) => {
    const { definirModoTeste } = await import("@/database/modo-teste.server");
    return definirModoTeste(data.ligar);
  });
