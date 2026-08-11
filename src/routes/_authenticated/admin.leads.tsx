import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EstadoConsulta, PageTitle } from "@/components/admin/AdminShell";
import { EVENT_CONFIG } from "@/config/event.config";
import { SKILLS } from "@/config/skills.config";
import { usePainelConfig, usePainelLeads } from "@/hooks/usePainel";
import { PainelService } from "@/services/painel.service";
import { exportarExcel } from "@/utils/export";
import type { EquipeCodigo } from "@/types/database.types";
import type { FiltroLeads } from "@/database/painel.server";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: LeadsAdmin,
});

function LeadsAdmin() {
  const [busca, setBusca] = useState("");
  const [equipe, setEquipe] = useState<string>("");
  const [habilidade, setHabilidade] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const filtro = useMemo<FiltroLeads>(() => {
    const f: FiltroLeads = { limite: 300 };
    if (busca.trim()) f.busca = busca.trim();
    if (equipe) f.equipe = equipe as EquipeCodigo;
    if (habilidade) f.habilidade = habilidade;
    if (dataInicio) f.dataInicio = `${dataInicio}T00:00:00`;
    if (dataFim) f.dataFim = `${dataFim}T23:59:59`;
    return f;
  }, [busca, equipe, habilidade, dataInicio, dataFim]);

  const { data, isLoading, error } = usePainelLeads(filtro);
  const { consulta: config } = usePainelConfig();
  const linhas = data?.linhas ?? [];

  async function exportar() {
    setExportando(true);
    setAviso(null);
    try {
      const { gerarPdfLeads } = await import("@/lib/pdf-reports");
      await gerarPdfLeads({
        leads: linhas,
        campanha: config.data?.campanha ?? EVENT_CONFIG.campanha,
        escola: config.data?.escola ?? EVENT_CONFIG.local,
        logoUrl: config.data?.logo_url ?? EVENT_CONFIG.logoUrl,
      });
    } catch {
      setAviso("Não foi possível exportar agora. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }

  function exportarPlanilha() {
    exportarExcel(
      linhas,
      [
        { chave: "nome", titulo: "Aluno" },
        { chave: "idade_aluno", titulo: "Idade" },
        { chave: "responsavel_nome", titulo: "Responsável" },
        { chave: "responsavel_whatsapp", titulo: "WhatsApp" },
        {
          chave: "equipe",
          titulo: "Equipe",
          formatar: (l) =>
            EVENT_CONFIG.equipes.find((e) => e.codigo === l.equipe)?.nome ?? String(l.equipe),
        },
        {
          chave: "habilidade_sorteada",
          titulo: "Habilidade",
          formatar: (l) => SKILLS.find((s) => s.codigo === l.habilidade_sorteada)?.nome ?? "—",
        },
        { chave: "quantidade_indicacoes", titulo: "Indicações" },
        {
          chave: "created_at",
          titulo: "Cadastro",
          formatar: (l) =>
            new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        },
      ],
      "leads-roleta-do-futuro",
    );
  }

  const campo =
    "rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <PageTitle titulo="Leads" descricao="Base comercial gerada pela gincana." />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          className={`${campo} min-w-56 flex-1`}
          placeholder="Pesquisar por nome, responsável ou WhatsApp"
          aria-label="Pesquisar leads"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className={campo}
          aria-label="Equipe"
          value={equipe}
          onChange={(e) => setEquipe(e.target.value)}
        >
          <option value="">Todas as equipes</option>
          {EVENT_CONFIG.equipes.map((e) => (
            <option key={e.codigo} value={e.codigo}>
              {e.nome}
            </option>
          ))}
        </select>
        <select
          className={campo}
          aria-label="Habilidade"
          value={habilidade}
          onChange={(e) => setHabilidade(e.target.value)}
        >
          <option value="">Todas as habilidades</option>
          {SKILLS.map((s) => (
            <option key={s.codigo} value={s.codigo}>
              {s.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={campo}
          aria-label="Data inicial"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />
        <input
          type="date"
          className={campo}
          aria-label="Data final"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void exportar()}
          disabled={exportando || linhas.length === 0}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {exportando ? "Gerando..." : " Exportar leads (PDF)"}
        </button>
        <button
          type="button"
          onClick={exportarPlanilha}
          disabled={linhas.length === 0}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          Exportar leads (Excel)
        </button>
      </div>

      {aviso ? <p className="mb-3 text-sm font-semibold text-destructive">{aviso}</p> : null}

      <p className="mb-2 text-sm text-muted-foreground">
        {data ? `${linhas.length} de ${data.total} leads` : ""}
      </p>

      <EstadoConsulta
        carregando={isLoading}
        erro={error}
        vazio={!isLoading && !error && linhas.length === 0}
        mensagemVazio="Nenhum lead encontrado com esses filtros."
      />

      {linhas.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Aluno</th>
                <th className="px-3 py-2">Idade</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">WhatsApp</th>
                <th className="px-3 py-2">Equipe</th>
                <th className="px-3 py-2">Habilidade</th>
                <th className="px-3 py-2">Indicações</th>
                <th className="px-3 py-2">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{lead.nome}</td>
                  <td className="px-3 py-2 tabular-nums">{lead.idade_aluno ?? "—"}</td>
                  <td className="px-3 py-2">{lead.responsavel_nome}</td>
                  <td className="px-3 py-2 tabular-nums">{lead.responsavel_whatsapp}</td>
                  <td className="px-3 py-2">
                    {EVENT_CONFIG.equipes.find((e) => e.codigo === lead.equipe)?.nome ??
                      lead.equipe}
                  </td>
                  <td className="px-3 py-2">
                    {SKILLS.find((s) => s.codigo === lead.habilidade_sorteada)?.nome ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{lead.quantidade_indicacoes}</td>
                  <td className="px-3 py-2">
                    {new Date(lead.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
