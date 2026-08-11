import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ComercialDrawer } from "@/components/comercial/ComercialDrawer";
import { ComercialFiltros } from "@/components/comercial/ComercialFiltros";
import {
  GraficoAulas,
  GraficoHabilidades,
  TabelaEquipes,
} from "@/components/comercial/ComercialGraficos";
import {
  PainelAlertas,
  PainelInsights,
  PainelPipeline,
  PainelProximasAcoes,
} from "@/components/comercial/ComercialPaineis";
import { ComercialTabela } from "@/components/comercial/ComercialTabela";
import {
  CardMetrica,
  Secao,
  destaqueParticipante,
  destaqueTempo,
} from "@/components/comercial/ComercialUi";
import { useAcoesComercial, useDashboardComercial } from "@/hooks/useComercial";
import { usePainelEventos } from "@/hooks/useEventos";
import type { StatusComercial } from "@/database/comercial.server";
import {
  FILTROS_INICIAIS,
  STATUS_COMERCIAL,
  aplicarFiltros,
  calcularEquipes,
  calcularHabilidades,
  calcularMetricas,
  formatarTempo,
  gerarInsights,
  gerarProximasAcoes,
  type FiltrosComercial,
} from "@/lib/comercial-metrics";
import { COLUNAS_COMERCIAL } from "@/lib/comercial-columns";
import { gerarPdfComercial } from "@/lib/comercial-pdf";
import { exportarCsv, exportarExcel } from "@/utils/export";
import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/dashboard-comercial")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial | Roleta do Futuro" },
      {
        name: "description",
        content:
          "Acompanhe participantes, leads, indicações, conversões e desempenho das equipes da Gincana Santa Luzia em tempo real.",
      },
      { property: "og:title", content: "Dashboard Comercial | Roleta do Futuro" },
      {
        property: "og:description",
        content: "Painel comercial em tempo real do evento Roleta do Futuro – Mister Wiz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => (
    <AdminGate>
      <DashboardComercial />
    </AdminGate>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 font-semibold">
      Não foi possível carregar o dashboard: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 font-semibold">Dashboard não encontrado.</div>,
});

const COLUNAS = COLUNAS_COMERCIAL;

function useTemaEscuro() {
  const [escuro, setEscuro] = useState(true);
  useEffect(() => {
    const salvo = window.localStorage.getItem("wiz-tema");
    if (salvo) setEscuro(salvo === "dark");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    window.localStorage.setItem("wiz-tema", escuro ? "dark" : "light");
  }, [escuro]);
  return { escuro, alternar: () => setEscuro((v) => !v) };
}

function DashboardComercial() {
  const { dados: painelEventos } = usePainelEventos();
  const [eventoVisualizadoId, setEventoVisualizadoId] = useState<string>("");
  const { dados, isLoading, error } = useDashboardComercial(eventoVisualizadoId || null);
  const acoes = useAcoesComercial();
  const { escuro, alternar } = useTemaEscuro();
  const [filtros, setFiltros] = useState<FiltrosComercial>(FILTROS_INICIAIS);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const eventoVisualizado = painelEventos.eventos.find((e) => e.id === eventoVisualizadoId) ?? null;
  const eventosNaoAtivos = painelEventos.eventos.filter((e) => e.id !== painelEventos.ativo?.id);

  const filtradas = useMemo(
    () => aplicarFiltros(dados.participantes, filtros),
    [dados.participantes, filtros],
  );
  const metricas = useMemo(() => calcularMetricas(filtradas), [filtradas]);
  const equipes = useMemo(
    () => calcularEquipes(filtradas, dados.equipes),
    [filtradas, dados.equipes],
  );
  const habilidades = useMemo(() => calcularHabilidades(filtradas), [filtradas]);
  const insights = useMemo(() => gerarInsights(filtradas, equipes), [filtradas, equipes]);
  const proximas = useMemo(() => gerarProximasAcoes(filtradas), [filtradas]);
  const pipeline = useMemo(
    () =>
      STATUS_COMERCIAL.map((status) => ({
        ...status,
        total: filtradas.filter((l) => l.status === status.codigo).length,
      })),
    [filtradas],
  );

  const selecionado = filtradas.find((l) => l.id === selecionadoId) ?? null;
  const equipeLider = equipes[0]
    ? `${equipes[0].nome} (${equipes[0].pontuacao.toFixed(2)} pts)`
    : "—";
  const subtitulo = `${filtradas.length} de ${dados.participantes.length} participante(s) — filtros aplicados`;

  const mudarStatus = (participanteId: string, status: StatusComercial) =>
    acoes.status.mutate({ participanteId, status });
  const salvarObservacao = (participanteId: string, observacoes: string) =>
    acoes.observacao.mutate({ participanteId, observacoes });

  return (
    <div className="min-h-screen bg-background px-4 py-5 text-foreground">
      <header className="mx-auto grid max-w-[110rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Dashboard Comercial
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Atualização automática a cada 5 segundos · {dados.participantes.length} participante(s)
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <select
            value={eventoVisualizadoId}
            onChange={(e) => setEventoVisualizadoId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-black uppercase text-foreground hover:bg-muted"
            title="Escolha qual evento visualizar neste dashboard"
          >
            <option value="">
              Evento Atual{painelEventos.ativo ? ` — ${painelEventos.ativo.nome}` : ""}
            </option>
            {eventosNaoAtivos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.status === "TESTE" ? "" : e.status === "LIXEIRA" ? "" : ""} {e.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={alternar}
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            {escuro ? " Claro" : " Escuro"}
          </button>
          <Link
            to="/dashboard-executivo"
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            Executivo
          </Link>
          <Link
            to="/historico"
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            Histórico de Eventos
          </Link>
          <Link
            to="/configuracoes"
            className="rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-xs font-black uppercase text-primary hover:bg-primary/20"
            title="Gerenciar eventos e ajustes do sistema"
          >
            Configurações
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="mx-auto max-w-[110rem] rounded-xl border border-destructive p-4 font-semibold"
        >
          Erro ao carregar os dados: {error.message}
        </p>
      ) : null}

      {eventoVisualizado ? (
        <p
          className={`mx-auto mb-4 max-w-[110rem] rounded-xl border px-4 py-3 text-sm font-black uppercase ${
            eventoVisualizado.status === "TESTE"
              ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {eventoVisualizado.status === "TESTE" ? " Área de Testes" : " Evento arquivado"} —
          visualizando {eventoVisualizado.nome}. Estes dados não contam para o evento oficial.
        </p>
      ) : null}

      <main className="mx-auto max-w-[110rem] space-y-5">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <CardMetrica
            icone=""
            rotulo="Participantes cadastrados"
            valor={String(metricas.participantes)}
          />
          <CardMetrica
            icone=""
            rotulo="Participantes ativos"
            valor={String(metricas.ativos)}
            detalhe="Fluxo completo"
          />
          <CardMetrica
            icone=""
            rotulo="Tempo médio do desafio"
            valor={formatarTempo(metricas.tempoMedio)}
          />
          <CardMetrica
            icone=""
            rotulo="Pontuação média geral"
            valor={metricas.pontuacaoMedia.toFixed(2)}
          />
          <CardMetrica
            icone=""
            rotulo="Média por equipe"
            valor={
              equipes.length
                ? (equipes.reduce((a, e) => a + e.media, 0) / equipes.length).toFixed(2)
                : "0.00"
            }
          />
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CardMetrica icone="" rotulo="Famílias participantes" valor={String(metricas.familias)} />
          <CardMetrica
            icone=""
            rotulo="Telefones válidos"
            valor={String(metricas.telefonesValidos)}
          />
          <CardMetrica
            icone=""
            rotulo="Indicações válidas"
            valor={String(metricas.indicacoesValidas)}
            detalhe="6 a 18 anos"
          />
          <CardMetrica
            icone=""
            rotulo="Fora do perfil"
            valor={String(metricas.indicacoesForaPerfil)}
          />
          <CardMetrica
            icone=""
            rotulo="Média de indicações"
            valor={metricas.mediaIndicacoes.toFixed(2)}
          />
          <CardMetrica
            icone=""
            rotulo="Quem mais indicou"
            valor={metricas.topIndicador ? String(metricas.topIndicador.indicacoesValidas) : "—"}
            detalhe={metricas.topIndicador?.nome ?? "Sem indicações"}
          />
        </section>

        <ComercialFiltros
          filtros={filtros}
          equipes={dados.equipes}
          onChange={setFiltros}
          onLimpar={() => setFiltros(FILTROS_INICIAIS)}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PainelProximasAcoes acoes={proximas} onAbrir={setSelecionadoId} />
          <PainelInsights insights={insights} />
        </div>

        <PainelPipeline linhas={filtradas} contagem={pipeline} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <GraficoAulas metricas={metricas} />
          <GraficoHabilidades habilidades={habilidades} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TabelaEquipes equipes={equipes} />
          <Secao titulo="Estatísticas do evento">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <p className="text-sm font-semibold">
                {" "}
                Maior pontuação: {destaqueParticipante(metricas.maiorPontuacao)}
              </p>
              <p className="text-sm font-semibold">
                {" "}
                Melhor tempo: {destaqueTempo(metricas.melhorTempo)}
              </p>
              <p className="text-sm font-semibold">
                {" "}
                Maior tempo: {destaqueTempo(metricas.maiorTempo)}
              </p>
              <p className="text-sm font-semibold">
                Maior número de indicações:{" "}
                {metricas.maisIndicacoes
                  ? `${metricas.maisIndicacoes.nome} (${metricas.maisIndicacoes.indicacoesValidas})`
                  : "—"}
              </p>
              <p className="text-sm font-semibold"> Equipe líder: {equipeLider}</p>
              <p className="text-sm font-semibold">
                Participante líder: {destaqueParticipante(metricas.maiorPontuacao)}
              </p>
              <p className="text-sm font-semibold">
                {" "}
                Total de participantes: {metricas.participantes}
              </p>
            </div>
          </Secao>
        </div>

        <PainelAlertas metricas={metricas} equipeLider={equipeLider} />

        <Secao
          titulo="Leads e pipeline"
          acao={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => gerarPdfComercial(filtradas, subtitulo)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-black uppercase hover:bg-muted"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => exportarExcel(filtradas, COLUNAS, "dashboard-comercial")}
                className="rounded-lg border border-border px-3 py-1 text-xs font-black uppercase hover:bg-muted"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => exportarCsv(filtradas, COLUNAS, "dashboard-comercial")}
                className="rounded-lg border border-border px-3 py-1 text-xs font-black uppercase hover:bg-muted"
              >
                CSV
              </button>
            </div>
          }
          className="p-0"
        >
          <ComercialTabela
            linhas={filtradas}
            onSelecionar={(l) => setSelecionadoId(l.id)}
            onStatus={mudarStatus}
          />
        </Secao>

        {isLoading && dados.participantes.length === 0 ? (
          <p className="py-10 text-center font-black uppercase tracking-widest text-muted-foreground">
            Carregando dados do evento…
          </p>
        ) : null}
      </main>

      <ComercialDrawer
        linha={selecionado}
        salvando={acoes.status.isPending}
        onFechar={() => setSelecionadoId(null)}
        onStatus={mudarStatus}
        onObservacao={salvarObservacao}
      />
    </div>
  );
}
