import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Mensagem principal, ex.: "Preparando seu desafio...". */
  mensagem?: string;
  /** Texto de apoio opcional. */
  detalhe?: string | null;
  /** Progresso conhecido (0–100). Sem valor, mostra barra indeterminada. */
  progresso?: number | null;
  className?: string;
}

/**
 * Estado de carregamento padrão do sistema: spinner elegante + barra de
 * progresso + mensagem contextual. Nunca exibir apenas "Carregando...".
 */
export function LoadingState({
  mensagem = "Preparando seu desafio...",
  detalhe = null,
  progresso = null,
  className,
}: LoadingStateProps) {
  const indeterminado = progresso === null || Number.isNaN(progresso);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex w-full flex-col items-center gap-4 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="size-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary"
      />
      <p className="text-base font-black uppercase tracking-wide text-foreground sm:text-lg">
        {mensagem}
      </p>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary to-primary-glow",
            indeterminado ? "animate-progress-indeterminate w-2/5" : "transition-all duration-300",
          )}
          style={indeterminado ? undefined : { width: `${Math.min(Math.max(progresso, 0), 100)}%` }}
        />
      </div>
      {detalhe ? <p className="text-sm text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}
