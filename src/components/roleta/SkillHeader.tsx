import { cn } from "@/lib/utils";

interface SkillHeaderProps {
  className?: string | undefined;
}

/** Cabeçalho da etapa: apresenta os cinco pilares da metodologia. */
export function SkillHeader({ className }: SkillHeaderProps) {
  return (
    <div className={cn("text-center", className)}>
      <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
        <span className="text-gradient-brand">Roleta das Habilidades</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gire e descubra qual pilar Mister Wiz você vai viver na prática.
      </p>
    </div>
  );
}
