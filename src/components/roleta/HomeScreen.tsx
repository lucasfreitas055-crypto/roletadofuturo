import { useState } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { BrandLogo } from "@/components/roleta/BrandLogo";
import { useConfiguracaoPublica } from "@/hooks/usePainel";
import type { ParticipantesPorEquipe } from "@/types/database.types";

interface HomeScreenProps {
  equipes?: readonly ParticipantesPorEquipe[];
  carregando?: boolean;
  mostrarRanking?: boolean;
  onStart: () => void;
}

export function HomeScreen({ onStart }: HomeScreenProps) {
  const [iniciando, setIniciando] = useState(false);
  const { data: config } = useConfiguracaoPublica();
  const parceiroNome = (config as { parceiro_nome?: string | null } | undefined)?.parceiro_nome;
  const parceiroLogo = (config as { parceiro_logo_url?: string | null } | undefined)
    ?.parceiro_logo_url;

  const começar = () => {
    if (iniciando) return;
    setIniciando(true);
    onStart();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center overflow-hidden px-4 py-6">
      {/* Logo dominante, centralizada no topo */}
      <div className="flex flex-1 items-center justify-center">
        <BrandLogo className="animate-rise mx-auto w-full max-w-[46rem]" />
      </div>

      {/* Título + slogan + botão agrupados no rodapé */}
      <div className="flex w-full flex-col items-center gap-2">
        <div className="animate-rise text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
            <span className="text-gradient-brand">Roleta do Futuro</span>
          </h1>
          <p
            className="mt-1 text-base font-bold uppercase tracking-[0.25em] sm:text-lg"
            style={{ color: "#fb8608" }}
          >
            Gire. Ganhe. Conquiste.
          </p>
        </div>

        <ActionButton
          tamanho="xl"
          onClick={começar}
          disabled={iniciando}
          className="animate-glow-pulse w-full max-w-md"
        >
          Começar
        </ActionButton>
      </div>

      {parceiroLogo || parceiroNome ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-30 flex flex-col items-center gap-1">
          <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-white/90">
            Parceria
          </span>
          <div className="rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-sm">
            {parceiroLogo ? (
              <img
                src={parceiroLogo}
                alt={parceiroNome ?? "Parceiro"}
                className="h-16 w-auto max-w-[14rem] object-contain sm:h-20 sm:max-w-[18rem]"
              />
            ) : (
              <span className="text-lg font-black uppercase text-white">{parceiroNome}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
