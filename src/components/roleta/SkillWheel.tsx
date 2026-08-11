import { BrandLogo } from "@/components/roleta/BrandLogo";
import { SKILLS } from "@/config/skills.config";
import { cn } from "@/lib/utils";

const SETOR = 360 / SKILLS.length;

/** SVG da bandeira dos EUA — garante renderização consistente (o emoji nem sempre carrega). */
function UsFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 7410 3900"
      className={className}
      role="img"
      aria-label="Bandeira dos Estados Unidos"
    >
      <rect width="7410" height="3900" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map((n) => (
        <rect key={n} y={n * 300} width="7410" height="300" fill="#FFFFFF" />
      ))}
      <rect width="2964" height="2100" fill="#3C3B6E" />
    </svg>
  );
}

const GRADIENTE = `conic-gradient(${SKILLS.map(
  (s, i) => `${s.corVar} ${i * SETOR}deg ${(i + 1) * SETOR}deg`,
).join(", ")})`;

interface SkillWheelProps {
  rotacao: number;
  girando: boolean;
  className?: string | undefined;
}

/** Roleta circular com 5 segmentos, ponteiro fixo no topo e logo ao centro. */
export function SkillWheel({ rotacao, girando, className }: SkillWheelProps) {
  return (
    <div
      className={cn("relative aspect-square w-full max-w-[min(74vw,30rem)] select-none", className)}
      style={{ perspective: "1200px" }}
    >
      {/* Ponteiro fixo */}
      <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-1">
        <div
          className="h-0 w-0 border-x-[14px] border-t-[26px] border-x-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
          style={{ borderTopColor: "var(--primary-glow)" }}
          aria-hidden="true"
        />
      </div>

      {/* Halo / brilho */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-2xl transition-opacity duration-500",
          girando ? "opacity-70" : "opacity-40",
        )}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Disco */}
      <div
        className="absolute inset-0 rounded-full border-4 border-border shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        style={{
          transform: `rotate(${rotacao}deg) rotateX(8deg)`,
          background: GRADIENTE,
          willChange: "transform",
        }}
      >
        {/* Nome + ícone de cada fatia — texto acompanha a inclinação, ícone centralizado */}
        {SKILLS.map((skill, i) => {
          const centro = i * SETOR + SETOR / 2;
          return (
            <div
              key={skill.codigo}
              className="pointer-events-none absolute inset-0"
              style={{ transform: `rotate(${centro}deg)` }}
            >
              {/* Nome perto da borda externa, seguindo a inclinação da fatia */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: "10%" }}
              >
                <span className="block max-w-[7rem] whitespace-pre-line text-center text-[0.6rem] font-black uppercase leading-tight tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] sm:max-w-[9rem] sm:text-[0.8rem]">
                  {skill.nome.replace(" ", "\n")}
                </span>
              </div>

              {/* Ícone grande centrado no meio radial da fatia (entre nome e hub central) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: "26%" }}
              >
                {skill.codigo === "INGLES" ? (
                  <UsFlag className="h-9 w-14 rounded-sm shadow-lg sm:h-11 sm:w-16" />
                ) : (
                  <span
                    className="block text-4xl leading-none drop-shadow-lg sm:text-5xl"
                    aria-hidden="true"
                  >
                    {skill.icone}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Vinheta interna para profundidade */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle, transparent 55%, rgba(0,0,0,0.45))",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Centro com a logo */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-20 grid h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-background p-3",
          girando && "animate-glow-pulse",
        )}
        style={{
          boxShadow: "0 0 45px -6px color-mix(in oklab, var(--primary) 70%, transparent)",
        }}
      >
        <BrandLogo />
      </div>
    </div>
  );
}
