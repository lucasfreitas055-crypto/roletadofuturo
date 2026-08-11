import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Gate simples de autenticação por e-mail/senha fixos (definidos em .env
 * como VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD). Sem cadastro, sem servidor
 * de auth: quando o operador acerta a senha, o flag fica salvo em
 * localStorage e as rotas administrativas abrem automaticamente nas
 * próximas visitas.
 */

const CHAVE = "mw:admin-auth-v1";

const ADMIN_EMAIL = (import.meta.env["VITE_ADMIN_EMAIL"] as string | undefined) ?? "";
const ADMIN_SENHA = (import.meta.env["VITE_ADMIN_PASSWORD"] as string | undefined) ?? "";

function normalizarEmail(v: string): string {
  return v.trim().toLowerCase();
}

export function estaAutenticado(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

export function sair(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setAutenticado(estaAutenticado());
    setPronto(true);
  }, []);

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!ADMIN_EMAIL || !ADMIN_SENHA) {
      setErro(
        "Credenciais administrativas não configuradas. Defina VITE_ADMIN_EMAIL e VITE_ADMIN_PASSWORD.",
      );
      return;
    }

    const emailOk = normalizarEmail(email) === normalizarEmail(ADMIN_EMAIL);
    const senhaOk = senha === ADMIN_SENHA;

    if (emailOk && senhaOk) {
      try {
        window.localStorage.setItem(CHAVE, "1");
      } catch {
        /* ignora */
      }
      setAutenticado(true);
    } else {
      setErro("E-mail ou senha incorretos.");
    }
  }

  if (!pronto) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Verificando acesso...</p>
      </main>
    );
  }

  if (autenticado) return <>{children}</>;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4 text-foreground">
      <form
        onSubmit={entrar}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg"
      >
        <h1
          className="mb-1 text-center text-2xl font-black uppercase tracking-tight"
          style={{ color: "#c8a2ff" }}
        >
          Acesso restrito
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Entre com o e-mail e senha da operação Mister Wiz.
        </p>

        <label className="mb-3 grid gap-1 text-sm font-semibold">
          E-mail
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="mb-4 grid gap-1 text-sm font-semibold">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {erro ? (
          <p className="mb-3 rounded-xl bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground"
        >
          Entrar
        </button>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao Game
          </Link>
        </div>
      </form>
    </main>
  );
}
