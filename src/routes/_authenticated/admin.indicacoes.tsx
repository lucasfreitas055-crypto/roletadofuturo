import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EstadoConsulta, PageTitle } from "@/components/admin/AdminShell";
import { EVENT_CONFIG } from "@/config/event.config";
import { usePainelIndicacoes } from "@/hooks/usePainel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/indicacoes")({
  component: IndicacoesAdmin,
});

function IndicacoesAdmin() {
  const { resumo, detalhe, participanteId, setParticipanteId, invalidar } = usePainelIndicacoes();
  const [motivo, setMotivo] = useState("");
  const linhas = resumo.data ?? [];
  const selecionado = linhas.find((l) => l.participanteId === participanteId) ?? null;

  return (
    <>
      <PageTitle
        titulo="Indicações"
        descricao="Somente crianças e adolescentes de 6 a 18 anos geram pontuação (0,1 por indicação válida)."
      />

      <EstadoConsulta
        carregando={resumo.isLoading}
        erro={resumo.error}
        vazio={!resumo.isLoading && !resumo.error && linhas.length === 0}
        mensagemVazio="Nenhuma indicação registrada até o momento."
      />

      {linhas.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Participante</th>
                  <th className="px-3 py-2">Equipe</th>
                  <th className="px-3 py-2">Válidas</th>
                  <th className="px-3 py-2">Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr
                    key={linha.participanteId}
                    onClick={() => setParticipanteId(linha.participanteId)}
                    className={cn(
                      "cursor-pointer border-t border-border hover:bg-muted/40",
                      participanteId === linha.participanteId && "bg-primary/10",
                    )}
                  >
                    <td className="px-3 py-2 font-semibold">{linha.nome}</td>
                    <td className="px-3 py-2">
                      {EVENT_CONFIG.equipes.find((e) => e.codigo === linha.equipe)?.nome ??
                        linha.equipe}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {linha.validas}
                      {linha.invalidas > 0 ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({linha.invalidas} inválidas)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {linha.pontuacao.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-border p-4">
            {!selecionado ? (
              <p className="text-sm text-muted-foreground">
                Clique em um participante para ver as indicações.
              </p>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-bold">Indicações de {selecionado.nome}</h2>
                <input
                  className="mb-3 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  placeholder="Motivo da invalidação (opcional)"
                  aria-label="Motivo da invalidação"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                {detalhe.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(detalhe.data ?? []).map((indicacao) => {
                      const invalida = indicacao.status === "INVALIDA";
                      return (
                        <li
                          key={indicacao.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {indicacao.nome}
                              {indicacao.idade !== null ? ` — ${indicacao.idade} anos` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {indicacao.responsavel_nome ? `${indicacao.responsavel_nome} · ` : ""}
                              {indicacao.whatsapp}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-bold",
                                invalida ? "text-destructive" : "text-success",
                              )}
                            >
                              {invalida
                                ? `INVÁLIDA${indicacao.motivo_invalidacao ? ` — ${indicacao.motivo_invalidacao}` : ""}`
                                : "VÁLIDA (+0,1)"}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={invalidar.isPending}
                            onClick={() =>
                              invalidar.mutate({
                                id: indicacao.id,
                                invalidar: !indicacao.invalidada_manualmente,
                                motivo,
                              })
                            }
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
                          >
                            {indicacao.invalidada_manualmente ? "Revalidar" : "Invalidar"}
                          </button>
                        </li>
                      );
                    })}
                    {(detalhe.data ?? []).length === 0 ? (
                      <li className="text-sm text-muted-foreground">
                        Nenhuma indicação encontrada.
                      </li>
                    ) : null}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
