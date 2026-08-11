import { EVENT_CONFIG } from "@/config/event.config";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string | undefined;
  pulsando?: boolean;
}

/** Logo oficial da Mister Wiz — nunca recriada nem deformada. */
export function BrandLogo({ className, pulsando = false }: BrandLogoProps) {
  return (
    <img
      src={EVENT_CONFIG.logoUrl}
      alt={`${EVENT_CONFIG.marca} — ${EVENT_CONFIG.campanha}`}
      draggable={false}
      className={cn(
        "h-auto w-full max-w-full object-contain select-none",
        pulsando && "animate-logo-pulse",
        className,
      )}
      style={{
        filter: "drop-shadow(0 0 28px color-mix(in oklab, var(--primary) 55%, transparent))",
      }}
    />
  );
}
