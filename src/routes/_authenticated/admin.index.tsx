import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EstadoConsulta, PageTitle, StatCard } from "@/components/admin/AdminShell";
import { usePainelResumo, usePainelConfig } from "@/hooks/usePainel";
import { PainelService } from "@/services/painel.service";
import { EVENT_CONFIG } from "@/config/event.config";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardAdmin,
});

function formatarDia(data: string): string {
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}`;
}

function DashboardAdmin() {
  const { data, isLoading, error } = usePainelResumo();
  const { consulta: config } = usePainelConfig();
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function gerarExtrato() {
    setGerando(true);
    setAviso(null);
    try {
      const extrato = await PainelService.extrato();
      const { gerarExtratoGincana } = await import("@/lib/pdf-reports");
      await gerarExtratoGincana({
        ...extrato,
        campanha: config.data?.campanha ?? EVENT_CONFIG.campanha,
        escola: config.data?.escola ?? EVENT_CONFIG.local,
        logoUrl: config.data?.logo_url ?? EVENT_CONFIG.logoUrl,
      });
    } catch {
      setAviso("Não foi possível gerar o extrato agora. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  const resumo = data?.resumo;

  return (
    <>
      <PageTitle
        titulo="Dashboard"
        descricao="Desempenho da gincana em tempo real: participação, indicações e pontuação."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void gerarExtrato()}
          disabled={gerando}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {gerando ? "Gerando..." : " Gerar Extrato da Gincana"}
        </button>
        {aviso ? <span className="text-sm font-semibold text-destructive">{aviso}</span> : null}
      </div>

      <EstadoConsulta carregando={isLoading} erro={error} vazio={false} mensagemVazio="" />

      {resumo ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icone=""
              rotulo="Participantes totais"
              valor={String(resumo.participantesTotais)}
            />
            <StatCard
              icone=""
              rotulo="Participantes hoje"
              valor={String(resumo.participantesHoje)}
            />
            <StatCard icone="" rotulo="Indicações totais" valor={String(resumo.indicacoesTotais)} />
            <StatCard icone="" rotulo="Indicações hoje" valor={String(resumo.indicacoesHoje)} />
            <StatCard
              icone=""
              rotulo="Pontuação geral"
              valor={resumo.pontuacaoGeral.toLocaleString("pt-BR")}
              detalhe={`Hoje: ${resumo.pontuacaoHoje.toLocaleString("pt-BR")} pontos`}
            />
            <StatCard
              icone=""
              rotulo="Equipe líder"
              valor={resumo.empate ? " EMPATE" : (resumo.equipeLider?.nome ?? "—")}
              detalhe={
                resumo.equipeLider
                  ? `${resumo.equipeLider.pontuacao.toLocaleString("pt-BR")} pontos`
                  : "Aguardando participações"
              }
            />
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Estatísticas diárias</h2>
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
                  {(data?.diarias ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-muted-foreground" colSpan={4}>
                        Ainda não há registros.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
