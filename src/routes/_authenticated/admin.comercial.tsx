import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EstadoConsulta, PageTitle, StatCard } from "@/components/admin/AdminShell";
import { getSkill, type HabilidadeCodigo } from "@/config/skills.config";
import { usePainelComercial } from "@/hooks/usePainel";

export const Route = createFileRoute("/_authenticated/admin/comercial")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial | Roleta do Futuro" },
      {
        name: "description",
        content:
          "Perfil dos leads captados na Gincana Santa Luzia: idade, equipe, habilidade e interesse nas aulas experimentais.",
      },
      { property: "og:title", content: "Dashboard Comercial | Roleta do Futuro" },
      {
        property: "og:description",
        content: "Análise comercial dos leads captados durante a gincana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComercialPage,
});

const CORES_INTERESSE: Record<string, string> = {
  SIM: "var(--success)",
  QUERO_SABER_MAIS: "var(--warning)",
  TALVEZ_DEPOIS: "var(--muted-foreground)",
  SEM_RESPOSTA: "var(--border)",
};

const ROTULO_INTERESSE: Record<string, string> = {
  SIM: "Sim, quero participar",
  QUERO_SABER_MAIS: "Quero saber mais",
  TALVEZ_DEPOIS: "Talvez depois",
  SEM_RESPOSTA: "Sem resposta",
};

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
        {titulo}
      </h2>
      <div className="h-64 w-full">{children}</div>
    </section>
  );
}

function ComercialPage() {
  const { data, isLoading, error } = usePainelComercial();

  const quentes = data?.porInteresse.find((i) => i.interesse === "SIM")?.total ?? 0;
  const mornos = data?.porInteresse.find((i) => i.interesse === "QUERO_SABER_MAIS")?.total ?? 0;

  const habilidades = (data?.porHabilidade ?? []).map((h) => {
    let nome = h.habilidade;
    try {
      nome = getSkill(h.habilidade as HabilidadeCodigo).nome;
    } catch {
      /* habilidade fora do catálogo atual */
    }
    return { nome, total: h.total };
  });

  const interesses = (data?.porInteresse ?? []).map((i) => ({
    nome: ROTULO_INTERESSE[i.interesse] ?? i.interesse,
    total: i.total,
    cor: CORES_INTERESSE[i.interesse] ?? "var(--primary)",
  }));

  return (
    <>
      <PageTitle
        titulo="Dashboard Comercial"
        descricao="Perfil dos leads captados e interesse nas aulas experimentais."
      />

      <EstadoConsulta
        carregando={isLoading}
        erro={error}
        vazio={!isLoading && !error && (data?.totalLeads ?? 0) === 0}
        mensagemVazio="Nenhum lead captado até o momento."
      />

      {data && data.totalLeads > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icone="" rotulo="Leads" valor={String(data.totalLeads)} />
            <StatCard
              icone=""
              rotulo="Leads quentes"
              valor={String(quentes)}
              detalhe="Querem participar das aulas"
            />
            <StatCard
              icone=""
              rotulo="Leads mornos"
              valor={String(mornos)}
              detalhe="Querem saber mais"
            />
            <StatCard
              icone=""
              rotulo="Indicações válidas"
              valor={String(data.indicacoesValidas)}
              detalhe={`${data.indicacoesInvalidas} invalidadas`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Bloco titulo="Leads por faixa etária">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.porIdade}>
                  <XAxis dataKey="faixa" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Bloco>

            <Bloco titulo="Leads por equipe">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.porEquipe}>
                  <XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {data.porEquipe.map((e) => (
                      <Cell key={e.equipe} fill={e.corHex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Bloco>

            <Bloco titulo="Habilidades sorteadas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habilidades} layout="vertical">
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={140}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="var(--primary-glow)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Bloco>

            <Bloco titulo="Interesse nas aulas experimentais">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={interesses}
                    dataKey="total"
                    nameKey="nome"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    label={(entry: { nome?: string; total?: number }) =>
                      `${entry.nome ?? ""}: ${entry.total ?? 0}`
                    }
                  >
                    {interesses.map((i) => (
                      <Cell key={i.nome} fill={i.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Bloco>
          </div>
        </div>
      ) : null}
    </>
  );
}
