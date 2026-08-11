import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageTitle } from "@/components/admin/AdminShell";
import { usePainelConfig } from "@/hooks/usePainel";
import type { ConfiguracoesPainel } from "@/database/painel.server";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfiguracoesAdmin,
});

const campo =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ConfiguracoesAdmin() {
  const { consulta, salvar } = usePainelConfig();
  const [form, setForm] = useState<ConfiguracoesPainel | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);

  useEffect(() => {
    if (consulta.data && !form) setForm(consulta.data);
  }, [consulta.data, form]);

  if (consulta.isLoading || !form) {
    return (
      <>
        <PageTitle titulo="Configurações" descricao="Personalize a campanha sem alterar código." />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </>
    );
  }

  function atualizar<K extends keyof ConfiguracoesPainel>(chave: K, valor: ConfiguracoesPainel[K]) {
    setForm((atual) => (atual ? { ...atual, [chave]: valor } : atual));
  }

  function reiniciarEvento() {
    // Reinício operacional: apenas estados temporários do terminal, nunca os leads.
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
      window.localStorage.removeItem("wiz-terminal-state");
    }
    setConfirmarReset(false);
  }

  return (
    <>
      <PageTitle titulo="Configurações" descricao="Personalize a campanha sem alterar código." />

      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form as ConfiguracoesPainel);
        }}
      >
        <label className="grid gap-1 text-sm font-semibold">
          URL do logo
          <input
            className={campo}
            value={form.logo_url ?? ""}
            onChange={(e) => atualizar("logo_url", e.target.value || null)}
            placeholder="https://..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Nome da campanha
            <input
              className={campo}
              value={form.campanha}
              onChange={(e) => atualizar("campanha", e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Escola / local
            <input
              className={campo}
              value={form.escola}
              onChange={(e) => atualizar("escola", e.target.value)}
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          Texto de abertura
          <textarea
            className={campo}
            rows={2}
            value={form.texto_abertura}
            onChange={(e) => atualizar("texto_abertura", e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          Texto de finalização
          <textarea
            className={campo}
            rows={2}
            value={form.texto_finalizacao}
            onChange={(e) => atualizar("texto_finalizacao", e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4"
            checked={form.mostrar_ranking}
            onChange={(e) => atualizar("mostrar_ranking", e.target.checked)}
          />
          Mostrar ranking na tela inicial do terminal
        </label>

        <fieldset className="grid gap-2 text-sm font-semibold">
          <legend>Modo de operação</legend>
          {(["EVENTO", "TESTE", "DEMONSTRACAO"] as const).map((modo) => (
            <label key={modo} className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="modo"
                className="size-4"
                checked={form.modo === modo}
                onChange={() => atualizar("modo", modo)}
              />
              {modo === "EVENTO"
                ? "Modo Evento — os dados são salvos no evento oficial"
                : modo === "TESTE"
                  ? " Modo Teste — os dados são salvos separados, fora do ranking e do dashboard oficial"
                  : "Modo Demonstração — nada é gravado no banco"}
            </label>
          ))}
        </fieldset>

        {form.modo === "TESTE" ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-400">
            MODO TESTE ATIVO — participações cadastradas agora não entram no ranking, indicações ou
            dashboard oficiais. Veja os dados de teste no seletor de evento do Dashboard Comercial.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={salvar.isPending}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {salvar.isPending ? "Salvando..." : "Salvar configurações"}
          </button>
          {salvar.isSuccess ? (
            <span className="text-sm font-semibold text-success">Configurações salvas.</span>
          ) : null}
          {salvar.isError ? (
            <span className="text-sm font-semibold text-destructive">
              Não foi possível salvar. Tente novamente.
            </span>
          ) : null}
        </div>
      </form>

      <section className="mt-10 max-w-3xl rounded-2xl border border-destructive/40 p-4">
        <h2 className="text-lg font-bold">Reiniciar evento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Limpa apenas os estados temporários do terminal (fluxo em andamento). Nenhum lead,
          indicação ou pontuação é apagado.
        </p>
        {confirmarReset ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={reiniciarEvento}
              className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground"
            >
              Confirmar reinício
            </button>
            <button
              type="button"
              onClick={() => setConfirmarReset(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarReset(true)}
            className="mt-3 rounded-xl border border-destructive px-4 py-2 text-sm font-bold text-destructive"
          >
            Reiniciar evento
          </button>
        )}
      </section>
    </>
  );
}
