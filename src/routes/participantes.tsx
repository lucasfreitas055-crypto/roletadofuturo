import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";

import { EVENT_CONFIG, getEquipeConfig } from "@/config/event.config";
import { formatarPontos } from "@/config/scoring.config";
import { useConfiguracaoPublica } from "@/hooks/usePainel";
import {
  atualizarContatoParticipantePublico,
  atualizarParticipantePublico,
  excluirParticipantePublico,
  listarIndicadosDoParticipantePublico,
  listarParticipantesPublico,
} from "@/lib/extrato.functions";
import { cn } from "@/lib/utils";
import type { EquipeCodigo, Participante } from "@/types/database.types";
import { exportarExcel } from "@/utils/export";

import { AdminGate } from "@/components/admin/AdminGate";

export const Route = createFileRoute("/participantes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Participantes do Evento | Roleta do Futuro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <ParticipantesPage />
    </AdminGate>
  ),
});

const EQUIPES: readonly EquipeCodigo[] = ["AZUL", "VERDE", "AMARELA"] as const;

const MSG_AGENDAR_FALLBACK =
  "Olá {NOME}! Aqui é da Mister Wiz — vimos que {ALUNO} demonstrou interesse em conhecer as nossas 5 aulas experimentais gratuitas. Podemos agendar a primeira aula?";

const MSG_APRESENTACAO_FALLBACK =
  "Olá {NOME}! Aqui é da Mister Wiz — foi um prazer receber {ALUNO} na Roleta do Futuro. Se tiver interesse em conhecer melhor a metodologia, estou à disposição!";

function abrirWhatsApp(
  participante: Participante,
  msgAgendar: string | null | undefined,
  msgApresentar: string | null | undefined,
) {
  const rawTelefone = (participante.responsavel_whatsapp ?? "").replace(/\D/g, "");
  if (!rawTelefone) return;
  const telefone = rawTelefone.length <= 11 ? `55${rawTelefone}` : rawTelefone;
  const respNome = participante.responsavel_nome?.split(" ")[0] ?? "";
  const alunoNome = participante.nome?.split(" ")[0] ?? "seu filho(a)";
  const template =
    participante.interesse_matricula === "SIM"
      ? (msgAgendar?.trim() || MSG_AGENDAR_FALLBACK)
      : (msgApresentar?.trim() || MSG_APRESENTACAO_FALLBACK);
  const texto = template.replaceAll("{NOME}", respNome).replaceAll("{ALUNO}", alunoNome);
  const url = `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function ParticipantesPage() {
  const queryClient = useQueryClient();
  const { data: config } = useConfiguracaoPublica();
  const msgAgendar = (config as { msg_agendar?: string | null } | undefined)?.msg_agendar;
  const msgApresentar = (config as { msg_apresentar?: string | null } | undefined)?.msg_apresentar;
  const [filtroEquipe, setFiltroEquipe] = useState<EquipeCodigo | "TODAS">("TODAS");
  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["extrato", "participantes", filtroEquipe, busca],
    queryFn: () =>
      listarParticipantesPublico({
        data: {
          equipe: filtroEquipe === "TODAS" ? null : filtroEquipe,
          busca: busca.trim() ? busca.trim() : null,
        },
      }),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    placeholderData: (anterior) => anterior,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["extrato"] });

  const excluir = useMutation({
    mutationFn: (id: string) =>
      excluirParticipantePublico({ data: { id, motivo: "Excluído via Extrato" } }),
    onSuccess: (res) => {
      setAviso(res.ok ? "Participante excluído." : res.mensagem);
      invalidar();
    },
    onError: () => setAviso("Não foi possível excluir agora."),
  });

  const trocarEquipe = useMutation({
    mutationFn: (params: { id: string; equipe: EquipeCodigo }) =>
      atualizarParticipantePublico({ data: params }),
    onSuccess: (res) => {
      setAviso(res.ok ? "Equipe atualizada." : res.mensagem);
      setEditandoId(null);
      invalidar();
    },
  });

  const alternarValidade = useMutation({
    mutationFn: (params: { id: string; participacaoValida: boolean }) =>
      atualizarParticipantePublico({ data: params }),
    onSuccess: (res) => {
      setAviso(res.ok ? "Validade atualizada." : res.mensagem);
      invalidar();
    },
  });

  const indicadosDoAtual = useQuery({
    queryKey: ["participantes", "indicados", expandidoId],
    queryFn: () =>
      listarIndicadosDoParticipantePublico({ data: { participanteId: expandidoId as string } }),
    enabled: Boolean(expandidoId),
    staleTime: 5000,
  });

  const salvarContato = useMutation({
    mutationFn: (params: {
      id: string;
      nome: string;
      responsavelNome: string;
      responsavelWhatsapp: string;
      idadeAluno: number | null;
    }) => atualizarContatoParticipantePublico({ data: params }),
    onSuccess: (res) => {
      setAviso(res.ok ? res.mensagem : res.mensagem);
      if (res.ok) invalidar();
    },
  });

  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;

  const contagemPorEquipe = useMemo(() => {
    const contador: Record<EquipeCodigo, number> = { AZUL: 0, VERDE: 0, AMARELA: 0 };
    for (const p of linhas) contador[p.equipe as EquipeCodigo] += 1;
    return contador;
  }, [linhas]);

  /** Detecta nomes de aluno E responsáveis que aparecem em mais de uma linha. */
  const duplicados = useMemo(() => {
    const norm = (s: string | null | undefined) =>
      (s ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    const alunos = new Map<string, number>();
    const resp = new Map<string, number>();
    for (const p of linhas) {
      const a = norm(p.nome);
      const r = norm(p.responsavel_nome);
      if (a) alunos.set(a, (alunos.get(a) ?? 0) + 1);
      if (r) resp.set(r, (resp.get(r) ?? 0) + 1);
    }
    return {
      isAlunoRepetido: (nome: string | null) => (alunos.get(norm(nome)) ?? 0) > 1,
      isResponsavelRepetido: (nome: string | null) => (resp.get(norm(nome)) ?? 0) > 1,
    };
  }, [linhas]);

  const totalRepetidos = useMemo(
    () =>
      linhas.filter(
        (p: Participante) =>
          duplicados.isAlunoRepetido(p.nome) || duplicados.isResponsavelRepetido(p.responsavel_nome),
      ).length,
    [linhas, duplicados],
  );

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
      <header className="border-b border-border bg-card/60 px-4 py-4 sm:px-8 print:border-b-2 print:border-black">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Participantes do Evento</h1>
            <p className="text-sm text-muted-foreground print:text-xs">
              Todos os participantes registrados no evento atual. Clique no nome para ver os
              indicados de cada um.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const dados = linhas.map((p) => ({
                  nome: p.nome,
                  idade: p.idade_aluno ?? "",
                  equipe: getEquipeConfig(p.equipe as EquipeCodigo).nome,
                  responsavel: p.responsavel_nome ?? "",
                  whatsapp: p.responsavel_whatsapp ?? "",
                  interesse_aula:
                    p.interesse_matricula === "SIM"
                      ? "Sim"
                      : p.interesse_matricula === "QUERO_SABER_MAIS"
                        ? "Quer saber mais"
                        : p.interesse_matricula === "TALVEZ_DEPOIS"
                          ? "Talvez depois"
                          : p.interesse_matricula === "NAO"
                            ? "Não"
                            : "",
                  valido: p.participacao_valida ? "Sim" : "Não",
                  pontos: formatarPontos(
                    Number(
                      (p as Participante & { total_score?: number }).total_score ?? 0,
                    ),
                  ),
                  cadastrado_em: new Date(p.created_at).toLocaleString("pt-BR"),
                }));
                exportarExcel(
                  dados,
                  [
                    { chave: "nome", titulo: "Nome do aluno" },
                    { chave: "idade", titulo: "Idade" },
                    { chave: "equipe", titulo: "Equipe" },
                    { chave: "responsavel", titulo: "Responsável" },
                    { chave: "whatsapp", titulo: "WhatsApp" },
                    { chave: "interesse_aula", titulo: "Interesse aula" },
                    { chave: "valido", titulo: "Válido" },
                    { chave: "pontos", titulo: "Pontos" },
                    { chave: "cadastrado_em", titulo: "Cadastrado em" },
                  ],
                  `participantes-${new Date().toISOString().slice(0, 10)}`,
                );
              }}
              disabled={linhas.length === 0}
              className="rounded-xl bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-colors hover:opacity-90 disabled:opacity-40"
            >
              📊 Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md transition-colors hover:opacity-90"
            >
              🖨 Imprimir lista
            </button>
            <Link
              to="/dashboard-comercial"
              className="rounded-xl border border-primary/60 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
            >
              Editar Parâmetros Comerciais →
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ← Voltar ao Game
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-8 print:px-0 print:py-2">
        <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => setFiltroEquipe("TODAS")}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors",
              filtroEquipe === "TODAS"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            Todas ({linhas.length})
          </button>
          {EQUIPES.map((codigo) => {
            const cfg = getEquipeConfig(codigo);
            const ativo = filtroEquipe === codigo;
            return (
              <button
                key={codigo}
                type="button"
                onClick={() => setFiltroEquipe(codigo)}
                className={cn(
                  "rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors",
                  ativo ? "text-white" : "hover:bg-muted",
                )}
                style={{
                  borderColor: cfg.corHex,
                  backgroundColor: ativo ? cfg.corHex : "transparent",
                  color: ativo ? "#ffffff" : cfg.corHex,
                }}
              >
                {cfg.nome} ({contagemPorEquipe[codigo]})
              </button>
            );
          })}
          <input
            type="search"
            placeholder="Buscar por nome ou responsável..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ml-auto min-w-[16rem] rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {aviso ? (
          <p className="mb-3 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
            {aviso}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {consulta.isLoading ? "Carregando..." : `${total} participantes no evento`}
            {consulta.isFetching && !consulta.isLoading ? " (atualizando...)" : ""}
          </p>
          {totalRepetidos > 0 ? (
            <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-amber-600">
              ⚠ {totalRepetidos} com nome repetido
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void consulta.refetch()}
            className="rounded-lg border border-border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest hover:bg-muted print:hidden"
          >
            Atualizar
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Equipe</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3 no-print">Válido</th>
                <th className="px-4 py-3 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && !consulta.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum participante encontrado com estes filtros.
                  </td>
                </tr>
              ) : null}
              {linhas.map((p: Participante) => {
                const cfg = getEquipeConfig(p.equipe as EquipeCodigo);
                const emEdicao = editandoId === p.id;
                const expandido = expandidoId === p.id;
                const alunoRepetido = duplicados.isAlunoRepetido(p.nome);
                const respRepetido = duplicados.isResponsavelRepetido(p.responsavel_nome);
                const temRepeticao = alunoRepetido || respRepetido;
                return (
                  <Fragment key={p.id}>
                  <tr
                    className={cn(
                      "border-t border-border align-middle",
                      temRepeticao && "bg-amber-500/5",
                      expandido && "bg-primary/5",
                    )}
                  >
                    <td className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => setExpandidoId(expandido ? null : p.id)}
                        className="group flex items-center gap-1 text-left hover:text-primary"
                        title="Clique para ver os indicados"
                      >
                        <span className="text-xs text-muted-foreground group-hover:text-primary">
                          {expandido ? "▾" : "▸"}
                        </span>
                        {alunoRepetido ? (
                          <span
                            className="rounded bg-amber-500/25 px-1.5 py-0.5"
                            title="Nome de aluno repetido no evento"
                          >
                            ⚠ {p.nome}
                          </span>
                        ) : (
                          <span className="underline decoration-dotted underline-offset-4">
                            {p.nome}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {emEdicao ? (
                        <select
                          defaultValue={p.equipe}
                          onChange={(e) =>
                            trocarEquipe.mutate({
                              id: p.id,
                              equipe: e.target.value as EquipeCodigo,
                            })
                          }
                          className="rounded-lg border border-input bg-card px-2 py-1 text-xs"
                        >
                          {EQUIPES.map((codigo) => (
                            <option key={codigo} value={codigo}>
                              {getEquipeConfig(codigo).nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="rounded-full px-3 py-1 text-xs font-black uppercase"
                          style={{ backgroundColor: `${cfg.corHex}22`, color: cfg.corHex }}
                        >
                          {cfg.nome.replace("Equipe ", "")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.idade_aluno ?? "—"}</td>
                    <td className="px-4 py-3">
                      {respRepetido ? (
                        <span
                          className="rounded bg-amber-500/25 px-1.5 py-0.5"
                          title="Responsável já cadastrado em outra participação"
                        >
                          ⚠ {p.responsavel_nome}
                        </span>
                      ) : (
                        p.responsavel_nome
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.responsavel_whatsapp}</td>
                    <td className="px-4 py-3 no-print">
                      <label className="inline-flex cursor-pointer items-center gap-1">
                        <input
                          type="checkbox"
                          checked={p.participacao_valida}
                          onChange={(e) =>
                            alternarValidade.mutate({
                              id: p.id,
                              participacaoValida: e.target.checked,
                            })
                          }
                        />
                        <span className="text-xs font-bold text-muted-foreground">
                          {p.participacao_valida ? "Sim" : "Não"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirWhatsApp(p, msgAgendar, msgApresentar)}
                          disabled={!p.responsavel_whatsapp}
                          title={
                            p.interesse_matricula === "SIM"
                              ? "Enviar mensagem de agendamento (aluno aceitou a aula experimental)"
                              : "Enviar mensagem de apresentação da escola"
                          }
                          className={cn(
                            "flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-40",
                            p.interesse_matricula === "SIM"
                              ? "border-green-600/60 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "border-emerald-600/40 text-emerald-600 hover:bg-emerald-500/10",
                          )}
                        >
                          {p.interesse_matricula === "SIM" ? "💬 Agendar" : "💬 Apresentar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoId(emEdicao ? null : p.id)}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-bold hover:bg-muted"
                        >
                          {emEdicao ? "Fechar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={excluir.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Excluir "${p.nome}" da ${cfg.nome}? Esta ação não pode ser desfeita.`,
                              )
                            ) {
                              excluir.mutate(p.id);
                            }
                          }}
                          className="rounded-lg border border-destructive/60 px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandido ? (
                    <tr className="border-t border-border bg-primary/5">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid gap-4 rounded-xl border border-primary/30 bg-background/60 p-4 lg:grid-cols-2">
                          {/* Breakdown de pontos */}
                          <div>
                            <p
                              className="mb-2 text-xs font-black uppercase tracking-widest"
                              style={{ color: "#c8a2ff" }}
                            >
                              Extrato de pontos
                            </p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <BadgePonto
                                rotulo="Participação"
                                valor={Number(
                                  (p as Participante & { participation_score?: number })
                                    .participation_score ?? 0,
                                )}
                              />
                              <BadgePonto
                                rotulo="Quest/Tempo"
                                valor={Number(
                                  (p as Participante & { quest_score?: number }).quest_score ?? 0,
                                )}
                              />
                              <BadgePonto
                                rotulo="Indicações"
                                valor={Number(
                                  (p as Participante & { referral_score?: number })
                                    .referral_score ?? 0,
                                )}
                              />
                              <BadgePonto
                                rotulo="Total"
                                valor={Number(
                                  (p as Participante & { total_score?: number }).total_score ?? 0,
                                )}
                                destaque
                              />
                            </div>
                          </div>

                          {/* Indicados feitos */}
                          <div>
                            <p
                              className="mb-2 text-xs font-black uppercase tracking-widest"
                              style={{ color: "#c8a2ff" }}
                            >
                              Indicados de {p.nome}
                            </p>
                            {indicadosDoAtual.isLoading ? (
                              <p className="text-xs text-muted-foreground">
                                Carregando indicados...
                              </p>
                            ) : (indicadosDoAtual.data?.linhas ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Este participante ainda não indicou ninguém.
                              </p>
                            ) : (
                              <ul className="divide-y divide-border text-sm">
                                {indicadosDoAtual.data?.linhas.map((ind) => (
                                  <li
                                    key={ind.id}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-2 sm:grid-cols-[1fr_auto_auto_auto]"
                                  >
                                    <span className="font-semibold">{ind.nome}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {ind.idade ?? "—"} anos
                                    </span>
                                    <span className="hidden text-xs text-muted-foreground sm:inline">
                                      {ind.responsavel_nome ?? "—"}
                                    </span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                      {ind.whatsapp}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Editar dados de contato */}
                          <div className="lg:col-span-2">
                            <p
                              className="mb-2 text-xs font-black uppercase tracking-widest"
                              style={{ color: "#c8a2ff" }}
                            >
                              Editar dados de contato
                            </p>
                            <EditorContato participante={p} onSalvar={salvarContato.mutate} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Equipes disponíveis: {EVENT_CONFIG.equipes.map((e) => e.nome).join(", ")}.
        </p>
      </section>
    </main>
  );
}

function BadgePonto({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-2",
        destaque
          ? "border-primary/60 bg-primary/15"
          : "border-border bg-background/60",
      )}
    >
      <p className="text-[0.55rem] font-black uppercase tracking-widest text-muted-foreground">
        {rotulo}
      </p>
      <p
        className="mt-0.5 text-lg font-black tabular-nums"
        style={{ color: destaque ? "#e9d5ff" : "#c8a2ff" }}
      >
        {destaque ? "" : "+"}
        {formatarPontos(valor)}
      </p>
    </div>
  );
}

function EditorContato({
  participante,
  onSalvar,
}: {
  participante: Participante;
  onSalvar: (params: {
    id: string;
    nome: string;
    responsavelNome: string;
    responsavelWhatsapp: string;
    idadeAluno: number | null;
  }) => void;
}) {
  const [nome, setNome] = useState(participante.nome ?? "");
  const [responsavel, setResponsavel] = useState(participante.responsavel_nome ?? "");
  const [whatsapp, setWhatsapp] = useState(participante.responsavel_whatsapp ?? "");
  const [idade, setIdade] = useState(String(participante.idade_aluno ?? ""));

  const alterado =
    nome !== (participante.nome ?? "") ||
    responsavel !== (participante.responsavel_nome ?? "") ||
    whatsapp !== (participante.responsavel_whatsapp ?? "") ||
    idade !== String(participante.idade_aluno ?? "");

  return (
    <div className="grid gap-2 sm:grid-cols-[2fr_2fr_2fr_1fr_auto]">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do aluno"
        className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
      />
      <input
        value={responsavel}
        onChange={(e) => setResponsavel(e.target.value)}
        placeholder="Nome do responsável"
        className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
      />
      <input
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="WhatsApp do responsável"
        className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm tabular-nums"
      />
      <input
        value={idade}
        onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
        placeholder="Idade"
        className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm tabular-nums"
      />
      <button
        type="button"
        disabled={!alterado || nome.trim().length < 2}
        onClick={() =>
          onSalvar({
            id: participante.id,
            nome,
            responsavelNome: responsavel,
            responsavelWhatsapp: whatsapp,
            idadeAluno: idade ? Number(idade) : null,
          })
        }
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black uppercase text-primary-foreground disabled:opacity-40"
      >
        Salvar
      </button>
    </div>
  );
}
