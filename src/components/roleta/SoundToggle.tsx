import { useSom } from "@/hooks/useSom";
import { cn } from "@/lib/utils";

/** Liga/desliga todos os sons do totem. Preferência salva no aparelho. */
export function SoundToggle({ className }: { className?: string }) {
  const { mudo, alternar } = useSom();

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={mudo}
      aria-label={mudo ? "Ativar sons" : "Desativar sons"}
      title={mudo ? "Ativar sons" : "Desativar sons"}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card/60 text-xl",
        "transition-all duration-200 hover:bg-card active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden="true">{mudo ? "" : ""}</span>
    </button>
  );
}
