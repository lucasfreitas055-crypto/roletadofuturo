import { useEffect, useState } from "react";

import type { LinhaComercial, StatusComercial } from "@/database/comercial.server";
import { LinhaResumo, SeloClassificacao, SeletorStatus } from "@/components/comercial/ComercialUi";
import { useHistoricoComercial } from "@/hooks/useComercial";
import {
  ROTULO_HABILIDADE,
  formatarDataHora,
  formatarTempo,
  rotuloStatus,
} from "@/lib/comercial-metrics";

interface Props {
  linha: LinhaComercial | null;
  salvando: boolean;
  onFechar: () => void;
  onStatus: (participanteId: string, status: StatusComercial) => void;
  onObservacao: (participanteId: string, observacoes: string) => void;
}

export function ComercialDrawer({ linha, salvando, onFechar, onStatus, onObservacao }: Props) {
  const [texto, setTexto] = useState("");
  const historico = useHistoricoComercial(linha?.id ?? null);

  useEffect(() => {
    setTexto(linha?.observacoes ?? "");
  }, [linha?.id, linha?.observacoes]);

  // Salvamento automático das observações (debounce de 800ms).
  useEffect(() => {
    if (!linha) return;
    if (texto === linha.observacoes) return;
    const id = window.setTimeout(() => onObservacao(linha.id, texto), 800);
    return () => window.clearTimeout(id);
  }, [texto, linha, onObservacao]);

  if (!linha) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onFechar}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <aside className="animate-slide-in-right relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-5 shadow-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black">{linha.nome}</h2>
            <p className="text-sm font-semibold text-muted-foreground">
              Equipe {linha.equipe} · Score {linha.scoreComercial}
            </p>
            <div className="mt-2">
              <SeloClassificacao valor={linha.classificacao} />
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg border border-border px-3 py-1 text-sm font-black hover:bg-muted"
          ></button>
        </header>

        <div className="mt-4">
          <LinhaResumo rotulo="Idade" valor={linha.idade === null ? "—" : `${linha.idade} anos`} />
          <LinhaResumo rotulo="Responsável" valor={linha.responsavelNome} />
          <LinhaResumo
            rotulo="Telefone"
            valor={`${linha.telefone}${linha.telefoneValido ? "" : " "}`}
          />
          <LinhaResumo rotulo="Pontuação" valor={linha.pontuacao.toFixed(2)} />
          <LinhaResumo rotulo="Tempo do desafio" valor={formatarTempo(linha.tempoSegundos)} />
          <LinhaResumo
            rotulo="Habilidade sorteada"
            valor={
              linha.habilidade ? (ROTULO_HABILIDADE[linha.habilidade] ?? linha.habilidade) : "—"
            }
          />
          <LinhaResumo
            rotulo="Indicações"
            valor={`${linha.indicacoesValidas} válidas · ${linha.indicacoesForaPerfil} fora do perfil`}
          />
          <LinhaResumo rotulo="Aceitou aula" valor={linha.aceitouAula ? " Sim" : " Não"} />
          <LinhaResumo rotulo="Data e hora" valor={formatarDataHora(linha.criadoEm)} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Status comercial
          </p>
          <SeletorStatus
            valor={linha.status}
            disabled={salvando}
            className="w-full px-3 py-2 text-sm"
            onChange={(status) => onStatus(linha.id, status)}
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Observações (salvas automaticamente)
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Ex.: mãe pediu retorno na próxima semana."
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Histórico de status
          </p>
          {historico.data && historico.data.length > 0 ? (
            <ol className="space-y-2">
              {historico.data.map((evento) => (
                <li key={evento.id} className="rounded-lg border border-border/70 p-2 text-xs">
                  <p className="font-bold">
                    {evento.statusAnterior ? `${rotuloStatus(evento.statusAnterior)} → ` : ""}
                    {rotuloStatus(evento.statusNovo)}
                  </p>
                  <p className="text-muted-foreground">{formatarDataHora(evento.criadoEm)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs font-semibold text-muted-foreground">
              Nenhuma alteração registrada ainda.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
