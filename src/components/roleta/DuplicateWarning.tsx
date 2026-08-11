import { ActionButton } from "@/components/roleta/ActionButton";
import { teamUi } from "@/lib/team-ui";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

interface DuplicateWarningProps {
  variante: "WHATSAPP" | "NOME";
  mensagem?: string | null | undefined;
  aluno?: string | null | undefined;
  equipe?: EquipeCodigo | null | undefined;
  onProximo: () => void;
  onSolicitarLiberacao?: (() => void) | undefined;
  solicitando?: boolean | undefined;
  solicitado?: boolean | undefined;
}

/** Bloqueio de participação duplicada (WhatsApp) ou alerta de nome repetido. */
export function DuplicateWarning({
  variante,
  mensagem,
  aluno,
  equipe,
  onProximo,
  onSolicitarLiberacao,
  solicitando = false,
  solicitado = false,
}: DuplicateWarningProps) {
  const ui = equipe ? teamUi(equipe) : null;
  const whatsapp = variante === "WHATSAPP";

  return (
    <div className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-5 px-4 py-8 text-center">
      <div className="surface-card w-full rounded-3xl border-warning/50 px-6 py-8">
        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
          {whatsapp ? " Participação já registrada" : " Nome já encontrado"}
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          {mensagem ??
            (whatsapp
              ? "Este responsável já possui uma participação registrada nesta ação."
              : "Encontramos outro participante com este mesmo nome.")}
        </p>

        {aluno || ui ? (
          <div className="mt-5 flex flex-col items-center gap-1 text-sm font-semibold">
            {aluno ? <span className="text-foreground">Aluno: {aluno}</span> : null}
            {ui ? <span className={cn(ui.text)}>Equipe: {ui.label}</span> : null}
          </div>
        ) : null}

        {!whatsapp ? (
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Um administrador da Mister Wiz precisa autorizar esta participação.
            </p>
            {onSolicitarLiberacao ? (
              <ActionButton
                variante="ghost"
                tamanho="md"
                onClick={onSolicitarLiberacao}
                disabled={solicitando || solicitado}
              >
                {solicitado
                  ? "Liberação solicitada "
                  : solicitando
                    ? "Enviando solicitação..."
                    : "Solicitar liberação"}
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>

      <ActionButton tamanho="xl" className="w-full" onClick={onProximo}>
        Próximo participante
      </ActionButton>
    </div>
  );
}
