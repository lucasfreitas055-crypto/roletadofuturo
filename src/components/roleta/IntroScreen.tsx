import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/roleta/BrandLogo";

interface IntroScreenProps {
  onFinish: () => void;
  /** Duração da abertura (ms). */
  duracaoMs?: number | undefined;
}

/** Abertura de ~1,8s com a logo pulsando. Toque/clique/tecla avança. */
export function IntroScreen({ onFinish, duracaoMs = 1800 }: IntroScreenProps) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), duracaoMs);
    return () => clearTimeout(t);
  }, [duracaoMs]);

  useEffect(() => {
    if (!saindo) return;
    const t = setTimeout(onFinish, 280);
    return () => clearTimeout(t);
  }, [saindo, onFinish]);

  useEffect(() => {
    const avancar = () => setSaindo(true);
    window.addEventListener("keydown", avancar);
    return () => window.removeEventListener("keydown", avancar);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setSaindo(true)}
      aria-label="Iniciar experiência"
      className={`flex min-h-[100dvh] w-full flex-col items-center justify-center gap-8 px-6 transition-opacity duration-300 ${
        saindo ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-logo-in w-full max-w-md">
        <BrandLogo pulsando className="w-full" />
      </div>
      <p className="animate-rise text-center text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-xl">
        Prepare-se para o desafio...
      </p>
    </button>
  );
}
