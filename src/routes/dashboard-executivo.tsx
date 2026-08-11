import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  CardMetrica,
  destaqueParticipante,
  destaqueTempo,
} from "@/components/comercial/ComercialUi";
import { useDashboardComercial } from "@/hooks/useComercial";
import { calcularEquipes, calcularMetricas, formatarTempo } from "@/lib/comercial-metrics";

export const Route = createFileRoute("/dashboard-executivo")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo | Roleta do Futuro" },
      {
        name: "description",
        content:
          "Visão executiva do evento Roleta do Futuro: participantes, leads, conversão de aulas experimentais e desempenho das equipes.",
      },
      { property: "og:title", content: "Dashboard Executivo | Roleta do Futuro" },
      {
        property: "og:description",
        content: "Grandes indicadores do evento para apresentação em reuniões.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardExecutivo,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 font-semibold">
      Não foi possível carregar o painel: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 font-semibold">Painel não encontrado.</div>,
});

function DashboardExecutivo() {
  const { dados } = useDashboardComercial();
  const metricas = useMemo(() => calcularMetricas(dados.participantes), [dados.participantes]);
  const equipes = useMemo(() => calcularEquipes(dados.participantes, dados.equipes), [dados]);

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <header className="mx-auto grid max-w-[100rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 pb-5">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Dashboard Executivo
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Atualização automática em tempo real
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/dashboard-comercial"
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            Comercial
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase hover:bg-muted"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-[100rem] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CardMetrica
          grande
          icone=""
          rotulo="Participantes"
          valor={String(metricas.participantes)}
        />
        <CardMetrica grande icone="" rotulo="Leads (famílias)" valor={String(metricas.familias)} />
        <CardMetrica
          grande
          icone=""
          rotulo="Conversão de aulas"
          valor={`${metricas.taxaConversao}%`}
          detalhe={`${metricas.aceitouAula} aceitaram`}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Pontuação média"
          valor={metricas.pontuacaoMedia.toFixed(2)}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Equipe líder"
          valor={equipes[0]?.nome ?? "—"}
          detalhe={equipes[0] ? `${equipes[0].pontuacao.toFixed(2)} pontos` : "Sem pontuação"}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Aceitação das aulas"
          valor={`${metricas.aceitouAula}`}
          detalhe={`${metricas.querSaberMais} querem saber mais`}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Melhor tempo"
          valor={formatarTempo(metricas.melhorTempo?.tempoSegundos ?? null)}
          detalhe={destaqueTempo(metricas.melhorTempo)}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Maior tempo"
          valor={formatarTempo(metricas.maiorTempo?.tempoSegundos ?? null)}
          detalhe={destaqueTempo(metricas.maiorTempo)}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Maior nº de indicações"
          valor={String(metricas.maisIndicacoes?.indicacoesValidas ?? 0)}
          detalhe={metricas.maisIndicacoes?.nome ?? "—"}
        />
        <CardMetrica
          grande
          icone=""
          rotulo="Participante líder"
          valor={destaqueParticipante(metricas.maiorPontuacao)}
        />
        <CardMetrica grande icone="" rotulo="Leads quentes" valor={String(metricas.leadsQuentes)} />
        <CardMetrica grande icone="" rotulo="Matrículas" valor={String(metricas.matriculados)} />
      </main>

      <section className="mx-auto mt-5 max-w-[100rem] rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
          Equipes
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {equipes.map((equipe) => (
            <div
              key={equipe.codigo}
              className="rounded-xl border border-border p-4"
              style={{ borderColor: equipe.corHex }}
            >
              <p className="text-lg font-black">
                {equipe.posicao}º {equipe.nome}
              </p>
              <p className="text-3xl font-black tabular-nums">{equipe.pontuacao.toFixed(2)}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {equipe.participantes} participantes · média {equipe.media.toFixed(2)} ·{" "}
                {equipe.aceitacao}% aceitação
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
