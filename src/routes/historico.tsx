import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Secao } from "@/components/comercial/ComercialUi";
import { useAcoesEventos, useArquivoEvento, usePainelEventos, useResets } from "@/hooks/useEventos";
import type { EventoResumido } from "@/database/eventos.server";
import { COLUNAS_COMERCIAL } from "@/lib/comercial-columns";
import { gerarPdfComercial } from "@/lib/comercial-pdf";
import { formatarTempo } from "@/lib/comercial-metrics";
import { exportarCsv, exportarExcel } from "@/utils/export";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Eventos | Roleta do Futuro" },
      {
        name: "description",
        content:
          "Consulte, compare, restaure e exporte todos os eventos já realizados da Roleta do Futuro – Mister Wiz.",
      },
      { property: "og:title", content: "Histórico de Eventos | Roleta do Futuro" },
      {
        property: "og:description",
        content: "Arquivo completo de cada evento: ranking, participantes, indicações e insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoricoEventos,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 font-semibold">
      Não foi possível carregar o histórico: {error.message}
    </div>
  ),
});

const dataHora = (valor: string | null) =>
  valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const botao =
  "rounded-lg border border-border px-3 py-2 text-xs font-black uppercase transition hover:bg-muted disabled:opacity-50";

function HistoricoEventos() {
  const { dados, isLoading } = usePainelEventos();
  const { resets } = useResets();
  const acoes = useAcoesEventos();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"TODOS" | "ATIVO" | "TESTE" | "ENCERRADO" | "LIXEIRA">(
    "TODOS",
  );
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [comparaA, setComparaA] = useState("");
  const [comparaB, setComparaB] = useState("");

  const eventos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dados.eventos.filter((e) => {
      if (situacao !== "TODOS" && e.status !== situacao) return false;
      if (!termo) return true;
      return (
        e.nome.toLowerCase().includes(termo) ||
        String(e.participantes).includes(termo) ||
        (e.resumo?.equipeVencedora ?? "").toLowerCase().includes(termo) ||
        dataHora(e.iniciadoEm).toLowerCase().includes(termo)
      );
    });
  }, [dados.eventos, busca, situacao]);

  const eventoA = dados.eventos.find((e) => e.id === comparaA) ?? null;
  const eventoB = dados.eventos.find((e) => e.id === comparaB) ?? null;

  return (
    <div className="min-h-screen bg-background px-4 py-5 text-foreground">
      <header className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3 pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Histórico de Eventos
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {dados.eventos.length} evento(s) registrados · nenhum dado é apagado
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard-comercial" className={botao}>
            ← Dashboard
          </Link>
          <Link to="/" className={botao}>
            Início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[100rem] space-y-5">
        <Secao titulo="Filtros">
          <div className="flex flex-wrap gap-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, data, participantes ou equipe vencedora"
              className="min-w-[16rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
            />
            <select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value as typeof situacao)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
            >
              <option value="TODOS">Todas as situações</option>
              <option value="ATIVO">Em andamento</option>
              <option value="TESTE"> Teste</option>
              <option value="ENCERRADO">Encerrados</option>
              <option value="LIXEIRA">Lixeira (30 dias)</option>
            </select>
          </div>
        </Secao>

        <Secao titulo=" Comparar eventos">
          <div className="flex flex-wrap gap-3">
            <SeletorEvento
              valor={comparaA}
              onChange={setComparaA}
              eventos={dados.eventos}
              rotulo="Evento A"
            />
            <SeletorEvento
              valor={comparaB}
              onChange={setComparaB}
              eventos={dados.eventos}
              rotulo="Evento B"
            />
          </div>
          {eventoA && eventoB ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm font-semibold">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Indicador</th>
                    <th className="py-2">{eventoA.nome}</th>
                    <th className="py-2">{eventoB.nome}</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasComparacao(eventoA, eventoB).map((linha) => (
                    <tr key={linha.rotulo} className="border-t border-border">
                      <td className="py-2">{linha.rotulo}</td>
                      <td className="py-2">{linha.a}</td>
                      <td className="py-2">{linha.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Selecione dois eventos para comparar.
            </p>
          )}
        </Secao>

        <Secao titulo="Eventos" className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm font-semibold">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Evento</th>
                  <th className="p-3">Início</th>
                  <th className="p-3">Encerramento</th>
                  <th className="p-3">Participantes</th>
                  <th className="p-3">Equipe vencedora</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.id} className="border-t border-border">
                    <td className="p-3">
                      #{String(evento.numero).padStart(2, "0")} · {evento.nome}
                    </td>
                    <td className="p-3">{dataHora(evento.iniciadoEm)}</td>
                    <td className="p-3">{dataHora(evento.encerradoEm)}</td>
                    <td className="p-3">{evento.participantes}</td>
                    <td className="p-3">{evento.resumo?.equipeVencedora ?? "—"}</td>
                    <td className="p-3">{rotuloSituacao(evento.status)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className={botao}
                          onClick={() => setDetalheId(evento.id)}
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          className={botao}
                          onClick={() => {
                            const nome = window.prompt("Novo nome do evento:", evento.nome);
                            if (nome && nome.trim().length >= 2)
                              acoes.renomear.mutate({ eventoId: evento.id, nome: nome.trim() });
                          }}
                        >
                          Renomear
                        </button>
                        {evento.status === "LIXEIRA" ? (
                          <button
                            type="button"
                            className={botao}
                            onClick={() => acoes.restaurar.mutate(evento.id)}
                          >
                            Restaurar
                          </button>
                        ) : evento.status === "ENCERRADO" ? (
                          <button
                            type="button"
                            className={botao}
                            onClick={() => acoes.lixeira.mutate(evento.id)}
                          >
                            Lixeira
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {eventos.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhum evento encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao titulo=" Histórico de Resets" className="p-0">
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[52rem] text-sm font-semibold">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Data</th>
                  <th className="p-3">Evento</th>
                  <th className="p-3">Participantes antes</th>
                  <th className="p-3">Pontuação antes</th>
                  <th className="p-3">Indicações antes</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {resets.map((reset) => (
                  <tr key={reset.id} className="border-t border-border">
                    <td className="p-3">{dataHora(reset.criadoEm)}</td>
                    <td className="p-3">{reset.eventoNome}</td>
                    <td className="p-3">{reset.participantesAntes}</td>
                    <td className="p-3">{reset.pontosAntes.toFixed(2)} pts</td>
                    <td className="p-3">{reset.indicacoesAntes}</td>
                    <td className="p-3">
                      {reset.restauradoEm
                        ? ` Restaurado em ${dataHora(reset.restauradoEm)}`
                        : "— não restaurado"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className={botao}
                        disabled={acoes.restaurarReset.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Restaurar ${reset.participantesAntes} participante(s) de "${reset.eventoNome}" (backup de ${dataHora(reset.criadoEm)})?`,
                            )
                          ) {
                            acoes.restaurarReset.mutate(reset.id);
                          }
                        }}
                      >
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
                {resets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhuma limpeza de dados registrada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao titulo="Logs de encerramento" className="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="w-full min-w-[40rem] text-sm font-semibold">
              <tbody>
                {dados.logs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="p-3">{dataHora(log.criadoEm)}</td>
                    <td className="p-3">{log.acao}</td>
                    <td className="p-3">{log.usuario}</td>
                    <td className="p-3">{log.participantes} participante(s)</td>
                    <td className="p-3">{log.pontos.toFixed(2)} pts</td>
                  </tr>
                ))}
                {dados.logs.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground">
                      Nenhum registro ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Secao>
      </main>

      {detalheId ? (
        <DetalheEvento eventoId={detalheId} onFechar={() => setDetalheId(null)} />
      ) : null}
    </div>
  );
}

function SeletorEvento({
  valor,
  onChange,
  eventos,
  rotulo,
}: {
  valor: string;
  onChange: (v: string) => void;
  eventos: EventoResumido[];
  rotulo: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-black uppercase text-muted-foreground">
      {rotulo}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[14rem] rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
      >
        <option value="">Selecionar…</option>
        {eventos.map((e) => (
          <option key={e.id} value={e.id}>
            #{String(e.numero).padStart(2, "0")} · {e.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

function linhasComparacao(a: EventoResumido, b: EventoResumido) {
  const v = (e: EventoResumido) => e.resumo;
  return [
    { rotulo: "Participantes", a: String(a.participantes), b: String(b.participantes) },
    {
      rotulo: "Pontuação média",
      a: (v(a)?.pontuacaoMedia ?? 0).toFixed(2),
      b: (v(b)?.pontuacaoMedia ?? 0).toFixed(2),
    },
    {
      rotulo: "Taxa de conversão",
      a: `${(v(a)?.taxaConversao ?? 0).toFixed(1)}%`,
      b: `${(v(b)?.taxaConversao ?? 0).toFixed(1)}%`,
    },
    {
      rotulo: "Indicações válidas",
      a: String(v(a)?.indicacoesValidas ?? 0),
      b: String(v(b)?.indicacoesValidas ?? 0),
    },
    {
      rotulo: "Equipe vencedora",
      a: v(a)?.equipeVencedora ?? "—",
      b: v(b)?.equipeVencedora ?? "—",
    },
    {
      rotulo: "Tempo médio",
      a: formatarTempo(v(a)?.tempoMedio ?? null),
      b: formatarTempo(v(b)?.tempoMedio ?? null),
    },
    { rotulo: "Matrículas", a: String(v(a)?.matriculas ?? 0), b: String(v(b)?.matriculas ?? 0) },
  ];
}

function rotuloSituacao(status: EventoResumido["status"]) {
  if (status === "ATIVO") return " Em andamento";
  if (status === "TESTE") return " Teste";
  if (status === "ENCERRADO") return " Encerrado";
  return " Lixeira";
}

function DetalheEvento({ eventoId, onFechar }: { eventoId: string; onFechar: () => void }) {
  const { data, isLoading } = useArquivoEvento(eventoId);
  const evento = data?.evento ?? null;
  const arquivo = data?.arquivo ?? null;
  const resumo = evento?.resumo ?? null;
  const nomeArquivo = `evento-${String(evento?.numero ?? 0).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-background p-5">
        <div className="flex items-start justify-between gap-3 pb-4">
          <h2 className="text-xl font-black uppercase">{evento ? evento.nome : "Carregando…"}</h2>
          <button type="button" className={botao} onClick={onFechar}>
            Fechar
          </button>
        </div>

        {isLoading ? (
          <p className="font-semibold text-muted-foreground">Carregando arquivo do evento…</p>
        ) : null}

        {evento ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info rotulo="Início" valor={dataHora(evento.iniciadoEm)} />
              <Info rotulo="Encerramento" valor={dataHora(evento.encerradoEm)} />
              <Info rotulo="Participantes" valor={String(evento.participantes)} />
              <Info rotulo="Pontuação média" valor={(resumo?.pontuacaoMedia ?? 0).toFixed(2)} />
              <Info rotulo="Equipe vencedora" valor={resumo?.equipeVencedora ?? "—"} />
              <Info rotulo="Participante campeão" valor={resumo?.campeao ?? "—"} />
              <Info
                rotulo="Melhor tempo"
                valor={formatarTempo(resumo?.melhorTempoSegundos ?? null)}
              />
              <Info rotulo="Maior nº de indicações" valor={String(resumo?.maiorIndicacoes ?? 0)} />
              <Info
                rotulo="Taxa de conversão"
                valor={`${(resumo?.taxaConversao ?? 0).toFixed(1)}%`}
              />
              <Info rotulo="Matrículas" valor={String(resumo?.matriculas ?? 0)} />
            </div>

            {resumo?.insights?.length ? (
              <Secao titulo="Insights">
                <ul className="list-disc space-y-1 pl-5 text-sm font-semibold">
                  {resumo.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Secao>
            ) : null}

            {arquivo ? (
              <>
                <Secao
                  titulo="Exportações do arquivo"
                  acao={
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={botao}
                        onClick={() =>
                          gerarPdfComercial(
                            arquivo.participantes,
                            `${evento.nome} — arquivo histórico`,
                          )
                        }
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        className={botao}
                        onClick={() =>
                          exportarExcel(arquivo.participantes, COLUNAS_COMERCIAL, nomeArquivo)
                        }
                      >
                        Excel
                      </button>
                      <button
                        type="button"
                        className={botao}
                        onClick={() =>
                          exportarCsv(arquivo.participantes, COLUNAS_COMERCIAL, nomeArquivo)
                        }
                      >
                        CSV
                      </button>
                    </div>
                  }
                >
                  <p className="text-sm font-semibold text-muted-foreground">
                    {arquivo.participantes.length} participante(s) arquivados · gerado em{" "}
                    {dataHora(arquivo.geradoEm)}
                  </p>
                </Secao>

                <Secao titulo="Ranking de equipes" className="p-0">
                  <table className="w-full text-sm font-semibold">
                    <tbody>
                      {arquivo.rankingEquipes.map((e, i) => (
                        <tr key={e.codigo} className="border-t border-border">
                          <td className="p-3">{i + 1}º</td>
                          <td className="p-3">{e.nome}</td>
                          <td className="p-3">{e.participantes} part.</td>
                          <td className="p-3 text-right">{e.pontuacao.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Secao>

                <Secao titulo="Ranking individual (top 20)" className="p-0">
                  <table className="w-full text-sm font-semibold">
                    <tbody>
                      {arquivo.rankingIndividual.slice(0, 20).map((p, i) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="p-3">{i + 1}º</td>
                          <td className="p-3">{p.nome}</td>
                          <td className="p-3">{p.equipe}</td>
                          <td className="p-3">{p.indicacoes} ind.</td>
                          <td className="p-3 text-right">{p.pontuacao.toFixed(2)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Secao>
              </>
            ) : (
              <p className="font-semibold text-muted-foreground">
                Este evento não possui arquivo detalhado disponível.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[0.65rem] font-black uppercase text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-black">{valor}</p>
    </div>
  );
}
