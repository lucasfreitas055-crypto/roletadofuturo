import type { ReactNode } from "react";

import type {
  ClassificacaoLead,
  LinhaComercial,
  StatusComercial,
} from "@/database/comercial.server";
import { CLASSIFICACAO, STATUS_COMERCIAL, formatarTempo } from "@/lib/comercial-metrics";
import { cn } from "@/lib/utils";

export function CardMetrica({
  icone,
  rotulo,
  valor,
  detalhe,
  grande = false,
}: {
  icone: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
  grande?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        <span aria-hidden="true">{icone}</span>
        <span className="min-w-0 truncate">{rotulo}</span>
      </p>
      <p
        className={cn(
          "mt-2 font-black tabular-nums",
          grande ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
        )}
      >
        {valor}
      </p>
      {detalhe ? (
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{detalhe}</p>
      ) : null}
    </div>
  );
}

export function Secao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="min-w-0 truncate text-sm font-black uppercase tracking-widest text-muted-foreground">
          {titulo}
        </h2>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function SeloClassificacao({ valor }: { valor: ClassificacaoLead }) {
  const item = CLASSIFICACAO[valor];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-bold"
      style={{ color: item.cor }}
    >
      <span aria-hidden="true">{item.icone}</span>
      {item.rotulo}
    </span>
  );
}

export function SeletorStatus({
  valor,
  onChange,
  disabled,
  className,
}: {
  valor: StatusComercial;
  onChange: (valor: StatusComercial) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={valor}
      disabled={disabled}
      aria-label="Status comercial"
      onChange={(evento) => onChange(evento.target.value as StatusComercial)}
      className={cn(
        "rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold disabled:opacity-50",
        className,
      )}
    >
      {STATUS_COMERCIAL.map((status) => (
        <option key={status.codigo} value={status.codigo}>
          {status.icone} {status.rotulo}
        </option>
      ))}
    </select>
  );
}

export function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="min-w-0 truncate font-semibold text-muted-foreground">{rotulo}</span>
      <span className="font-black">{valor}</span>
    </div>
  );
}

export function destaqueParticipante(linha: LinhaComercial | null): string {
  if (!linha) return "—";
  return `${linha.nome} (${linha.pontuacao.toFixed(2)} pts)`;
}

export function destaqueTempo(linha: LinhaComercial | null): string {
  if (!linha) return "—";
  return `${formatarTempo(linha.tempoSegundos)} — ${linha.nome}`;
}
