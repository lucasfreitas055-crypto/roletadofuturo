import { createFileRoute } from "@tanstack/react-router";

import { EstadoConsulta, PageTitle } from "@/components/admin/AdminShell";
import { usePainelRanking } from "@/hooks/usePainel";
import { cn } from "@/lib/utils";
import { exportarExcel } from "@/utils/export";

export const Route = createFileRoute("/_authenticated/admin/ranking")({
  component: RankingAdmin,
});

function formatarDia(data: string): string {
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}`;
}

function RankingAdmin() {
  const { data, isLoading, error } = usePainelRanking();
  const ranking = data?.ranking ?? [];
  const resumo = data?.resumo;

  return (
    <>
      <PageTitle
        titulo="Ranking"
        descricao="1 ponto por participante válido + 0,1 ponto por indicação válida."
      />

      <a
        href="/ranking-ao-vivo"
        target="_blank"
        rel="noreferrer"
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors hover:bg-primary/20"
      >
        Abrir Ranking Ao Vivo (modo TV)
      </a>

      <EstadoConsulta
        carregando={isLoading}
        erro={error}
        vazio={!isLoading && !error && ranking.length === 0}
        mensagemVazio="Ainda não há pontuação registrada."
      />

      {ranking.length > 0 ? (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportarExcel(
                  ranking,
                  [
                    { chave: "posicao", titulo: "Posição" },
                    { chave: "nome", titulo: "Equipe" },
                    { chave: "participantes", titulo: "Participantes" },
                    { chave: "indicacoes", titulo: "Indicações" },
                    { chave: "pontuacao", titulo: "Pontuação" },
                  ],
                  "ranking-roleta-do-futuro",
                )
              }
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold"
            >
              Exportar ranking (Excel)
            </button>
          </div>
          {resumo?.empate ? (
            <p className="mb-4 rounded-xl bg-warning/15 px-4 py-3 text-sm font-bold">
              EMPATE na liderança da gincana.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Equipe</th>
                  <th className="px-4 py-2">Participantes</th>
                  <th className="px-4 py-2">Indicações</th>
                  <th className="px-4 py-2">Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((linha) => (
                  <tr
                    key={linha.equipe}
                    className={cn(
                      "border-t border-border",
                      linha.lider && "bg-primary/10 font-bold",
                    )}
                  >
                    <td className="px-4 py-3">{linha.posicao}</td>
                    <td className="px-4 py-3">
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ backgroundColor: linha.corHex }}
                        aria-hidden
                      />
                      {linha.nome}
                      {linha.lider ? (
                        <span className="ml-2 text-xs uppercase">
                          {linha.empate ? " Empate" : " Líder"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{linha.participantes}</td>
                    <td className="px-4 py-3 tabular-nums">{linha.indicacoes}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {linha.pontuacao.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Histórico diário</h2>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Participantes</th>
                    <th className="px-4 py-2">Indicações</th>
                    <th className="px-4 py-2">Pontuação</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.diarias ?? []).map((linha) => (
                    <tr key={linha.data} className="border-t border-border">
                      <td className="px-4 py-2 font-semibold">{formatarDia(linha.data)}</td>
                      <td className="px-4 py-2 tabular-nums">{linha.participantes}</td>
                      <td className="px-4 py-2 tabular-nums">{linha.indicacoes}</td>
                      <td className="px-4 py-2 tabular-nums">
                        {linha.pontuacao.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
