import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EVENT_CONFIG } from "@/config/event.config";
import { AuthService } from "@/services/auth.service";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso administrativo | Mister Wiz" },
      {
        name: "description",
        content:
          "Área restrita da equipe Mister Wiz para gestão da Roleta do Futuro, leads e ranking da gincana.",
      },
      { property: "og:title", content: "Acesso administrativo | Mister Wiz" },
      {
        property: "og:description",
        content: "Login do painel administrativo da Roleta do Futuro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaginaLogin,
});

function PaginaLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void AuthService.sessaoAtual().then((sessao) => {
      if (ativo && sessao) void navigate({ to: "/admin", replace: true });
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const { error } = await AuthService.entrarComEmail(email.trim(), senha);
      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }
      await navigate({ to: "/admin", replace: true });
    } catch {
      setErro("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-4 focus-visible:ring-ring";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 shadow-xl"
      >
        <img
          src={EVENT_CONFIG.logoUrl}
          alt="Mister Wiz"
          className="mx-auto mb-6 h-10 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <h1 className="mb-1 text-center text-xl font-black uppercase tracking-tight">
          Painel administrativo
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Acesso restrito à equipe Mister Wiz.
        </p>

        <label className="mb-1 block text-sm font-semibold" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mb-1 mt-4 block text-sm font-semibold" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={carregando}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
