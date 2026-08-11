import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Secao } from "@/components/comercial/ComercialUi";
import type {
  LinhaEquipeComercial,
  LinhaHabilidade,
  MetricasComercial,
} from "@/lib/comercial-metrics";

export function GraficoAulas({ metricas }: { metricas: MetricasComercial }) {
  const dados = [
    { nome: "Aceitou", valor: metricas.aceitouAula, cor: "var(--success, #16a34a)" },
    { nome: "Quer saber mais", valor: metricas.querSaberMais, cor: "var(--warning, #f59e0b)" },
    { nome: "Talvez depois", valor: metricas.naoAceitou, cor: "var(--muted-foreground)" },
    { nome: "Sem resposta", valor: metricas.semResposta, cor: "var(--border)" },
  ].filter((d) => d.valor > 0);

  return (
    <Secao titulo="Aulas experimentais">
      <div className="h-64 w-full">
        {dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="45%" outerRadius="75%">
                {dados.map((item) => (
                  <Cell key={item.nome} fill={item.cor} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm font-semibold text-muted-foreground">
            Sem dados ainda.
          </p>
        )}
      </div>
      <p className="text-center text-sm font-black">Taxa de conversão: {metricas.taxaConversao}%</p>
    </Secao>
  );
}

export function GraficoHabilidades({ habilidades }: { habilidades: readonly LinhaHabilidade[] }) {
  return (
    <Secao titulo="Habilidades sorteadas e pontuação média">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...habilidades]} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="nome"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="total"
              name="Vezes sorteada"
              fill="var(--primary)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="mediaPontuacao"
              name="Pontuação média"
              fill="var(--accent, #1D4ED8)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Secao>
  );
}

export function TabelaEquipes({ equipes }: { equipes: readonly LinhaEquipeComercial[] }) {
  return (
    <Secao titulo="Ranking das equipes (tempo real)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            <th className="py-2">#</th>
            <th className="py-2">Equipe</th>
            <th className="py-2">Pontuação</th>
            <th className="py-2">Participantes</th>
            <th className="py-2">Média</th>
            <th className="py-2">Aceitação</th>
          </tr>
        </thead>
        <tbody>
          {equipes.map((equipe) => (
            <tr key={equipe.codigo} className="border-t border-border/60">
              <td className="py-2 font-black">{equipe.posicao}º</td>
              <td className="py-2 font-bold">
                <span
                  className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                  style={{ backgroundColor: equipe.corHex }}
                />
                {equipe.nome}
              </td>
              <td className="py-2 font-black tabular-nums">{equipe.pontuacao.toFixed(2)}</td>
              <td className="py-2 tabular-nums">{equipe.participantes}</td>
              <td className="py-2 tabular-nums">{equipe.media.toFixed(2)}</td>
              <td className="py-2 tabular-nums">{equipe.aceitacao}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Secao>
  );
}
