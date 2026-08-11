import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ScreenTransitionProps {
  /** Muda a cada tela — dispara a transição de entrada. */
  chave: string;
  children: ReactNode;
  className?: string;
}

/**
 * Transição padrão entre telas: fade + leve subida, sempre abaixo de 400 ms.
 * O conteúdo é montado imediatamente (nunca há tela branca) e apenas a
 * opacidade/transform são animadas, o que roda na GPU e não trava o totem.
 */
export function ScreenTransition({ chave, children, className }: ScreenTransitionProps) {
  const [entrou, setEntrou] = useState(false);

  useEffect(() => {
    setEntrou(false);
    const id = requestAnimationFrame(() => setEntrou(true));
    return () => cancelAnimationFrame(id);
  }, [chave]);

  return (
    <div
      className={cn(
        "w-full transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]",
        entrou ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
