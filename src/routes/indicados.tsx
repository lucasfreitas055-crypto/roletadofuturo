import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getEquipeConfig } from "@/config/event.config";
import { useConfiguracaoPublica } from "@/hooks/usePainel";
import { excluirIndicadoPublico, listarIndicadosPublico } from "@/lib/extrato.functions";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/indicados")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Indicados do Evento | Roleta do Futuro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <IndicadosPage />
    </AdminGate>
  ),
});

/**
 * Linha crua do supabase quando fazemos join `participantes:participante_id`.
 * O join pode voltar como objeto ou array (dependendo da versão do PostgREST).
 */
interface IndicadoBruto {
  id: string;
  nome: string;
  whatsapp: string;
  idade: number | null;
  responsavel_nome: string | null;
  participante_id: string;
  status: string;
  invalidada_manualmente: boolean;
  created_at: string;
  participantes: { nome: string; equipe: EquipeCodigo } | { nome: string; equipe: EquipeCodigo }[] | null;
}

function extrairPart(p: IndicadoBruto["participantes"]): { nome: string; equipe: EquipeCodigo } | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

const MSG_INDICADO_FALLBACK =
  "Olá {NOME}! Aqui é da Mister Wiz. Seu amigo {INDICADOR} indicou o seu contato para conhecer melhor a nossa escola. Podemos conversar sobre uma aula experimental gratuita?";

function abrirWhatsAppIndicado(indicado: IndicadoBruto, msgIndicado: string | null | undefined) {
  const raw = (indicado.whatsapp ?? "").replace(/\D/g, "");
  if (!raw) return;
  const telefone = raw.length <= 11 ? `55${raw}` : raw;
  const part = extrairPart(indicado.participantes);
  const nomeIndicador = part?.nome?.split(" ")[0] ?? "um amigo";
  const nomeAlvo = indicado.responsavel_nome?.split(" ")[0] ?? indicado.nome.split(" ")[0] ?? "";
  const template = msgIndicado?.trim() || MSG_INDICADO_FALLBACK;
  const texto = template
    .replaceAll("{NOME}", nomeAlvo)
    .replaceAll("{INDICADOR}", nomeIndicador);
  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
}

function IndicadosPage() {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracaoPublica();
  const msgIndicado = (config as { msg_indicado?: string | null } | undefined)?.msg_indicado;
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["indicados", busca],
    queryFn: () =>
      listarIndicadosPublico({ data: { busca: busca.trim() ? busca.trim() : null } }),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (anterior) => anterior,
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirIndicadoPublico({ data: { id } }),
    onSuccess: (res) => {
      setAviso(res.ok ? "Indicado excluído." : res.mensagem);
      void queryClient.invalidateQueries({ queryKey: ["indicados"] });
    },
    onError: () => setAviso("Não foi possível excluir agora."),
  });

  const linhas = (consulta.data?.linhas ?? []) as IndicadoBruto[];
  const total = consulta.data?.total ?? 0;

  const validos = useMemo(() => linhas.filter((l) => !l.invalidada_manualmente).length, [linhas]);

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground print:bg-white print:text-black">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          table { font-size: 10px; page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
      <header className="border-b border-border bg-card/60 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Indicados do Evento</h1>
            <p className="text-sm text-muted-foreground print:text-xs">
              Contatos dos indicados registrados no evento atual — {validos} válidos de {total}.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md hover:opacity-90"
            >
              🖨 Imprimir lista
            </button>
            <Link
              to="/participantes"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Ver Participantes →
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ← Voltar ao Game
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-8 print:px-0 print:py-2">
        <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
          <input
            type="search"
            placeholder="Buscar por nome ou responsável..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="min-w-[16rem] rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
          >
            Atualizar
          </button>
        </div>

        {aviso ? (
          <p className="mb-3 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
            {aviso}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Indicado</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Indicado por</th>
                <th className="px-4 py-3">Equipe</th>
                <th className="px-4 py-3 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && !consulta.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum indicado encontrado.
                  </td>
                </tr>
              ) : null}
              {linhas.map((ind) => {
                const part = extrairPart(ind.participantes);
                const cfg = part?.equipe ? getEquipeConfig(part.equipe) : null;
                return (
                  <tr
                    key={ind.id}
                    className={cn(
                      "border-t border-border align-middle",
                      ind.invalidada_manualmente && "opacity-50",
                    )}
                  >
                    <td className="px-4 py-3 font-semibold">{ind.nome}</td>
                    <td className="px-4 py-3 tabular-nums">{ind.idade ?? "—"}</td>
                    <td className="px-4 py-3">{ind.responsavel_nome ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{ind.whatsapp}</td>
                    <td className="px-4 py-3">{part?.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      {cfg ? (
                        <span
                          className="rounded-full px-3 py-1 text-xs font-black uppercase"
                          style={{ backgroundColor: `${cfg.corHex}22`, color: cfg.corHex }}
                        >
                          {cfg.nome.replace("Equipe ", "")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppIndicado(ind, msgIndicado)}
                          disabled={!ind.whatsapp}
                          className="flex items-center gap-1 rounded-lg border border-emerald-600/60 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                          💬 Contatar
                        </button>
                        <button
                          type="button"
                          disabled={excluir.isPending}
                          onClick={() => {
                            if (window.confirm(`Excluir indicado "${ind.nome}"?`)) {
                              excluir.mutate(ind.id);
                            }
                          }}
                          className="rounded-lg border border-destructive/60 px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
