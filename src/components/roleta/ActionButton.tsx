import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variante = "primary" | "ghost" | "team" | "success";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: "md" | "lg" | "xl";
}

/** Botão grande de totem — alvo de toque generoso e feedback visual imediato. */
export function ActionButton({
  className,
  variante = "primary",
  tamanho = "lg",
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "inline-flex select-none items-center justify-center gap-3 rounded-2xl font-extrabold uppercase tracking-wide",
        "font-display transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100",
        tamanho === "xl" && "min-h-16 px-10 text-xl sm:min-h-20 sm:text-2xl",
        tamanho === "lg" && "min-h-14 px-8 text-lg",
        tamanho === "md" && "min-h-12 px-6 text-base",
        variante === "primary" &&
          "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground glow-primary hover:brightness-110",
        variante === "success" && "bg-success text-background hover:brightness-110",
        variante === "ghost" && "border border-border bg-card/60 text-foreground hover:bg-card",
        className,
      )}
    />
  );
}
