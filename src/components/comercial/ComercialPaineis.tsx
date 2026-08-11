import { Secao } from "@/components/comercial/ComercialUi";
import type { LinhaComercial } from "@/database/comercial.server";
import type { MetricasComercial, ProximaAcao } from "@/lib/comercial-metrics";

export function PainelProximasAcoes({
  acoes,
  onAbrir,
}: {
  acoes: readonly ProximaAcao[];
  onAbrir?: (id: string) => void;
}) {
  return (
    <Secao titulo=" Próximas ações">
      {acoes.length === 0 ? (
        <p className="text-sm font-semibold text-muted-foreground">
          Nenhuma ação pendente — todos os leads prioritários já foram tratados.
        </p>
      ) : (
        <ol className="space-y-2">
          {acoes.map((acao) => (
            <li key={acao.id}>
              <button
                type="button"
                onClick={() => onAbrir?.(acao.id.split("-").slice(1).join("-"))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted"
              >
                <span aria-hidden="true" className="mr-2">
                  {acao.icone}
                </span>
                {acao.texto}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Secao>
  );
}

export function PainelInsights({ insights }: { insights: readonly string[] }) {
  return (
    <Secao titulo=" Insights do evento">
      {insights.length === 0 ? (
        <p className="text-sm font-semibold text-muted-foreground">
          Os insights aparecem assim que houver participantes registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight) => (
            <li
              key={insight}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
            >
              {insight}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

export function PainelAlertas({
  metricas,
  equipeLider,
}: {
  metricas: MetricasComercial;
  equipeLider: string;
}) {
  const alertas = [
    { icone: "", texto: `${metricas.semContato} participante(s) ainda sem contato comercial.` },
    { icone: "", texto: `${metricas.aulasAgendadas} aula(s) experimental(is) agendada(s).` },
    { icone: "", texto: `${metricas.leadsQuentes} lead(s) quente(s) para priorizar.` },
    { icone: "", texto: `Maior equipe: ${equipeLider}.` },
    { icone: "", texto: `Maior conversão de aulas: ${metricas.taxaConversao}%.` },
    { icone: "", texto: `${metricas.matriculados} matrícula(s) registrada(s).` },
  ];

  return (
    <Secao titulo=" Alertas">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {alertas.map((alerta) => (
          <li
            key={alerta.texto}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
          >
            <span aria-hidden="true" className="mr-2">
              {alerta.icone}
            </span>
            {alerta.texto}
          </li>
        ))}
      </ul>
    </Secao>
  );
}

export function PainelPipeline({
  linhas,
  contagem,
}: {
  linhas: readonly LinhaComercial[];
  contagem: { codigo: string; rotulo: string; icone: string; total: number }[];
}) {
  const total = linhas.length || 1;
  return (
    <Secao titulo="Pipeline comercial">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {contagem.map((item) => (
          <div key={item.codigo} className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-bold text-muted-foreground">
              <span aria-hidden="true">{item.icone}</span> {item.rotulo}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums">{item.total}</p>
            <p className="text-[0.65rem] font-semibold text-muted-foreground">
              {Math.round((item.total / total) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </Secao>
  );
}
