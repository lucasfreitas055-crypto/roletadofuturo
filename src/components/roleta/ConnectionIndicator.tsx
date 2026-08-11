import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  online: boolean;
  pendentes: number;
  sincronizando: boolean;
  className?: string;
}

/** Indicador discreto de conexão — a operação nunca é interrompida. */
export function ConnectionIndicator({
  online,
  pendentes,
  sincronizando,
  className,
}: ConnectionIndicatorProps) {
  return (
    <div className={cn("pointer-events-none select-none text-right", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-widest",
          online
            ? "border-success/40 bg-success/10 text-success"
            : "border-destructive/40 bg-destructive/10 text-destructive",
        )}
      >
        <span aria-hidden="true">{online ? "" : ""}</span>
        {online ? "Online" : "Offline"}
        {pendentes > 0 ? <span className="tabular-nums">· {pendentes}</span> : null}
      </span>

      {!online ? (
        <p className="mt-1 max-w-[16rem] text-[0.7rem] leading-snug text-muted-foreground">
          Os dados serão sincronizados automaticamente quando a conexão retornar.
        </p>
      ) : null}

      {online && sincronizando ? (
        <p className="mt-1 text-[0.7rem] text-muted-foreground">Sincronizando…</p>
      ) : null}
    </div>
  );
}
