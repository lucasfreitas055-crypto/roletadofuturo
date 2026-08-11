import { useMemo, useState } from "react";

import type { LinhaComercial, StatusComercial } from "@/database/comercial.server";
import { SeloClassificacao, SeletorStatus } from "@/components/comercial/ComercialUi";
import { formatarDataHora, formatarTempo } from "@/lib/comercial-metrics";

interface Props {
  linhas: readonly LinhaComercial[];
  onSelecionar: (linha: LinhaComercial) => void;
  onStatus: (participanteId: string, status: StatusComercial) => void;
}

const PAGINA = 50;

export function ComercialTabela({ linhas, onSelecionar, onStatus }: Props) {
  const [visiveis, setVisiveis] = useState(PAGINA);
  const lista = useMemo(() => linhas.slice(0, visiveis), [linhas, visiveis]);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[62rem] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-xs font-black uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">Equipe</th>
              <th className="px-3 py-3">Idade</th>
              <th className="px-3 py-3">Pontuação</th>
              <th className="px-3 py-3">Tempo</th>
              <th className="px-3 py-3">Indic.</th>
              <th className="px-3 py-3">Aula</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Status comercial</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((linha) => {
              const isIndicacao = linha.tipo === "INDICACAO";
              return (
              <tr
                key={linha.id}
                className="border-b border-border/50 last:border-0 hover:bg-muted/50"
              >
                <td className="px-3 py-2">
                  <span
                    className={
                      isIndicacao
                        ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
                        : "rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-primary"
                    }
                  >
                    {isIndicacao ? "Indicação" : "Participante"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onSelecionar(linha)}
                    className="text-left font-black underline-offset-4 hover:underline"
                  >
                    {linha.nome}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {linha.responsavelNome ? `${linha.responsavelNome} · ` : ""}
                    {linha.telefone}
                    {isIndicacao && linha.indicadoPor ? ` · por ${linha.indicadoPor}` : ""}
                  </p>
                </td>
                <td className="px-3 py-2 font-bold">{linha.equipe || "—"}</td>
                <td className="px-3 py-2 tabular-nums">{linha.idade ?? "—"}</td>
                <td className="px-3 py-2 font-black tabular-nums">
                  {isIndicacao ? "—" : linha.pontuacao.toFixed(2)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {isIndicacao ? "—" : formatarTempo(linha.tempoSegundos)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {isIndicacao ? (
                    "—"
                  ) : (
                    <>
                      {linha.indicacoesValidas}
                      {linha.indicacoesForaPerfil > 0 ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (+{linha.indicacoesForaPerfil} fora)
                        </span>
                      ) : null}
                    </>
                  )}
                </td>
                <td className="px-3 py-2">{linha.aceitouAula ? "" : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-black tabular-nums">{linha.scoreComercial}</span>
                    <SeloClassificacao valor={linha.classificacao} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  {isIndicacao ? (
                    <span className="text-xs italic text-muted-foreground">
                      Edite pela página Indicados
                    </span>
                  ) : (
                    <SeletorStatus
                      valor={linha.status}
                      onChange={(status) => onStatus(linha.id, status)}
                    />
                  )}
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    {formatarDataHora(linha.criadoEm)}
                  </p>
                </td>
              </tr>
              );
            })}
            {lista.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center font-semibold text-muted-foreground"
                >
                  Nenhum participante encontrado com os filtros atuais.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {visiveis < linhas.length ? (
        <div className="border-t border-border p-3 text-center">
          <button
            type="button"
            onClick={() => setVisiveis((v) => v + PAGINA)}
            className="rounded-lg border border-border px-4 py-2 text-xs font-black uppercase tracking-wide hover:bg-muted"
          >
            Mostrar mais ({linhas.length - visiveis} restantes)
          </button>
        </div>
      ) : null}
    </div>
  );
}
