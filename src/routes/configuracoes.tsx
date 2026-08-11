import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AcoesEvento } from "@/components/comercial/AcoesEvento";
import { useAcoesEventos, usePainelEventos } from "@/hooks/useEventos";
import type { ConfiguracoesPainel } from "@/database/painel.server";
import {
  obterConfiguracoesPublico,
  salvarConfiguracoesPublico,
} from "@/lib/extrato.functions";
import { cn } from "@/lib/utils";

import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/configuracoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurações | Roleta do Futuro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <ConfiguracoesPublicas />
    </AdminGate>
  ),
});

// Textos padrão que aparecem já preenchidos quando o banco vem vazio.
const MSG_AGENDAR_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz — vimos que {ALUNO} demonstrou interesse em conhecer as nossas 5 aulas experimentais gratuitas na Gincana Santa Luzia. Podemos agendar a primeira aula? Temos horários disponíveis nesta e na próxima semana. Fico no aguardo!";
const MSG_APRESENTAR_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz — foi um prazer receber {ALUNO} na Roleta do Futuro durante a Gincana Santa Luzia. A Mister Wiz é uma escola que desenvolve habilidades para o futuro: inglês, liderança, empreendedorismo, educação financeira e inteligência emocional. Se tiver interesse em conhecer melhor a metodologia, estou à disposição!";
const MSG_INDICADO_PADRAO =
  "Olá {NOME}! Aqui é da Mister Wiz. Seu amigo {INDICADOR} indicou o seu contato para conhecer melhor a nossa escola. Trabalhamos com o desenvolvimento de habilidades para o futuro — inglês, liderança, empreendedorismo, educação financeira e inteligência emocional — e adoraríamos te apresentar uma aula experimental gratuita. Podemos conversar?";

const campo =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ConfiguracoesPublicas() {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["configuracoes", "publico"],
    queryFn: () => obterConfiguracoesPublico(),
  });
  const { dados: painelEventos } = usePainelEventos();
  const acoesEventos = useAcoesEventos();
  const [form, setForm] = useState<ConfiguracoesPainel | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editandoNomeEvento, setEditandoNomeEvento] = useState(false);
  const [nomeEventoRascunho, setNomeEventoRascunho] = useState("");

  useEffect(() => {
    if (consulta.data && !form) {
      // Pré-preenche mensagens WhatsApp com o texto padrão quando o banco vem vazio,
      // pra operadora já ver a sugestão editável em vez de campo em branco.
      const preenchido: ConfiguracoesPainel = {
        ...consulta.data,
        msg_agendar: consulta.data.msg_agendar ?? MSG_AGENDAR_PADRAO,
        msg_apresentar: consulta.data.msg_apresentar ?? MSG_APRESENTAR_PADRAO,
        msg_indicado: consulta.data.msg_indicado ?? MSG_INDICADO_PADRAO,
      };
      setForm(preenchido);
    }
  }, [consulta.data, form]);

  const salvar = useMutation({
    mutationFn: (dados: Partial<ConfiguracoesPainel>) =>
      salvarConfiguracoesPublico({ data: dados }),
    onSuccess: () => {
      setAviso("Alterações salvas.");
      void queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      void queryClient.invalidateQueries({ queryKey: ["config", "publica"] });
      window.setTimeout(() => setAviso(null), 3000);
    },
    onError: () => setAviso("Erro ao salvar. Tente novamente."),
  });

  function atualizar<K extends keyof ConfiguracoesPainel>(chave: K, valor: ConfiguracoesPainel[K]) {
    setForm((atual) => (atual ? { ...atual, [chave]: valor } : atual));
  }

  if (consulta.error) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-2xl border border-destructive bg-card p-6 text-center">
          <h1 className="text-lg font-black uppercase text-destructive">
            Erro ao carregar configurações
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {consulta.error instanceof Error ? consulta.error.message : "Falha desconhecida."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void consulta.refetch()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase text-primary-foreground"
            >
              Tentar de novo
            </button>
            <Link
              to="/"
              className="rounded-xl border border-border px-4 py-2 text-xs font-black uppercase"
            >
              Voltar
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground">Carregando configurações...</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-xl border border-border px-4 py-2 text-xs font-black uppercase text-muted-foreground hover:bg-muted"
          >
            ← Voltar ao Game
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground">
      <header className="border-b border-border bg-card/60 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Ajuste as informações principais do evento em andamento.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ← Voltar ao Game
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        {aviso ? (
          <p className="mb-4 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
            {aviso}
          </p>
        ) : null}

        {/* --------------------------- Gerenciar Evento --------------------------- */}
        <section className="mb-8 rounded-2xl border border-border bg-card/60 p-5">
          <header className="mb-3">
            <h2 className="text-lg font-black uppercase tracking-tight">Gerenciar Evento</h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Criar, encerrar, duplicar ou limpar o evento em andamento. Toda ação é auditada e o
              histórico é preservado automaticamente.
            </p>
          </header>

          <div className="mb-4 rounded-xl bg-background/60 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Evento atual
            </p>
            {editandoNomeEvento && painelEventos.ativo ? (
              <form
                className="mt-2 flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const eventoId = painelEventos.ativo?.id;
                  if (!eventoId) return;
                  const nomeLimpo = nomeEventoRascunho.trim();
                  if (nomeLimpo.length < 2) return;
                  acoesEventos.renomear.mutate(
                    { eventoId, nome: nomeLimpo },
                    {
                      onSuccess: () => {
                        setAviso("Nome do evento atualizado.");
                        setEditandoNomeEvento(false);
                        window.setTimeout(() => setAviso(null), 3000);
                      },
                      onError: () => setAviso("Não foi possível renomear."),
                    },
                  );
                }}
              >
                <input
                  autoFocus
                  value={nomeEventoRascunho}
                  onChange={(e) => setNomeEventoRascunho(e.target.value)}
                  className="min-w-[16rem] flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={acoesEventos.renomear.isPending || nomeEventoRascunho.trim().length < 2}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground disabled:opacity-50"
                >
                  {acoesEventos.renomear.isPending ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoNomeEvento(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-lg font-black uppercase">
                  {painelEventos.ativo?.nome ?? "Nenhum evento ativo"}
                </p>
                {painelEventos.ativo ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNomeEventoRascunho(painelEventos.ativo?.nome ?? "");
                      setEditandoNomeEvento(true);
                    }}
                    className="rounded-lg border border-border px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    ✏ Renomear
                  </button>
                ) : null}
              </div>
            )}
            {painelEventos.ativo ? (
              <p className="text-xs text-muted-foreground">
                {painelEventos.ativo.participantes ?? 0} participantes ·{" "}
                {(painelEventos.ativo.pontos ?? 0).toLocaleString("pt-BR")} pontos
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <AcoesEvento />
          </div>
        </section>

        {/* ---------------------------- Ajustes gerais --------------------------- */}
        <h2 className="mb-3 text-lg font-black uppercase tracking-tight">Ajustes do Sistema</h2>
      </div>

      <form
        className="mx-auto grid max-w-3xl gap-4 px-4 pb-8 sm:px-8"
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form);
        }}
      >
        <label className="grid gap-1 text-sm font-semibold">
          Nome da campanha
          <input
            className={campo}
            value={form.campanha}
            onChange={(e) => atualizar("campanha", e.target.value)}
            placeholder="Roleta do Futuro"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          Escola / local
          <input
            className={campo}
            value={form.escola}
            onChange={(e) => atualizar("escola", e.target.value)}
            placeholder="Colégio Santa Luzia"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          Texto de abertura
          <textarea
            className={cn(campo, "min-h-[4rem] resize-y")}
            value={form.texto_abertura}
            onChange={(e) => atualizar("texto_abertura", e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          Texto de finalização
          <textarea
            className={cn(campo, "min-h-[4rem] resize-y")}
            value={form.texto_finalizacao}
            onChange={(e) => atualizar("texto_finalizacao", e.target.value)}
          />
        </label>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.mostrar_ranking}
            onChange={(e) => atualizar("mostrar_ranking", e.target.checked)}
            className="h-4 w-4"
          />
          Mostrar ranking na tela inicial do participante
        </label>

        <fieldset className="grid gap-3 rounded-2xl border border-border bg-card/40 p-4">
          <legend className="px-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Mensagens WhatsApp (usadas nos botões de contato)
          </legend>
          <p className="text-xs text-muted-foreground">
            Placeholders disponíveis:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{"{NOME}"}</code> (do
            responsável),{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{"{ALUNO}"}</code> e{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{"{INDICADOR}"}</code>{" "}
            (nome do participante que indicou, só na mensagem de indicado).
          </p>
          <label className="grid gap-1 text-sm font-semibold">
            Mensagem — Agendar aula (aluno aceitou as 5 aulas)
            <textarea
              className={cn(campo, "min-h-[6rem] resize-y")}
              value={form.msg_agendar ?? ""}
              onChange={(e) => atualizar("msg_agendar", e.target.value || null)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Mensagem — Apresentação (participante sem interesse declarado)
            <textarea
              className={cn(campo, "min-h-[6rem] resize-y")}
              value={form.msg_apresentar ?? ""}
              onChange={(e) => atualizar("msg_apresentar", e.target.value || null)}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Mensagem — Indicado (enviada aos contatos indicados)
            <textarea
              className={cn(campo, "min-h-[6rem] resize-y")}
              value={form.msg_indicado ?? ""}
              onChange={(e) => atualizar("msg_indicado", e.target.value || null)}
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-border bg-card/40 p-4">
          <legend className="px-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Parceria (aparece na tela inicial)
          </legend>
          <label className="grid gap-1 text-sm font-semibold">
            Nome do parceiro
            <input
              className={campo}
              value={form.parceiro_nome ?? ""}
              onChange={(e) => atualizar("parceiro_nome", e.target.value || null)}
              placeholder="Ex.: Colégio Santa Luzia"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            URL do logo do parceiro
            <input
              className={campo}
              value={form.parceiro_logo_url ?? ""}
              onChange={(e) => atualizar("parceiro_logo_url", e.target.value || null)}
              placeholder="https://..."
            />
            <span className="text-xs font-normal text-muted-foreground">
              Cole um link direto para a imagem (PNG/SVG). Deixe em branco para não mostrar.
            </span>
          </label>
          {form.parceiro_logo_url ? (
            <div className="mt-1 flex items-center gap-3 rounded-xl bg-background/60 p-3">
              <img
                src={form.parceiro_logo_url}
                alt={form.parceiro_nome ?? "Prévia do logo"}
                className="h-12 w-auto max-w-[8rem] object-contain"
              />
              <span className="text-xs text-muted-foreground">Prévia</span>
            </div>
          ) : null}
        </fieldset>

        <label className="grid gap-1 text-sm font-semibold">
          Modo de operação
          <select
            className={campo}
            value={form.modo === "TESTE" ? "EVENTO" : form.modo}
            onChange={(e) => atualizar("modo", e.target.value as ConfiguracoesPainel["modo"])}
          >
            <option value="EVENTO">Evento (grava tudo oficialmente)</option>
            <option value="DEMONSTRACAO">Demonstração (nada é gravado)</option>
          </select>
          <span className="text-xs font-normal text-muted-foreground">
            Use "Demonstração" para testar o fluxo sem registrar nada no banco. Volte para "Evento"
            quando começar oficialmente.
          </span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={salvar.isPending}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
          <Link
            to="/participantes"
            className="rounded-xl border border-border px-4 py-3 text-sm font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Ir para Participantes
          </Link>
        </div>
      </form>
    </main>
  );
}
