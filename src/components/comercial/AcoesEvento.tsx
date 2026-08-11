import { useState } from "react";

import { useAcoesEventos, usePainelEventos } from "@/hooks/useEventos";

const botao =
  "rounded-lg border border-border px-3 py-2 text-xs font-black uppercase transition hover:bg-muted disabled:opacity-50";

/** Ações de evento do Dashboard Comercial: modo teste, novo evento, limpar
 * dados, encerrar e duplicar. */
export function AcoesEvento() {
  const { dados } = usePainelEventos();
  const acoes = useAcoesEventos();
  const [aberto, setAberto] = useState<"ENCERRAR" | "DUPLICAR" | "NOVO" | "LIMPAR" | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  const ocupado =
    acoes.encerrar.isPending ||
    acoes.duplicar.isPending ||
    acoes.novoEvento.isPending ||
    acoes.limparDados.isPending;
  const duplicar = aberto === "DUPLICAR";

  const confirmar = async () => {
    if (aberto === "NOVO") {
      if (nomeNovo.trim().length < 2) return;
      const resultado = await acoes.novoEvento.mutateAsync(nomeNovo.trim());
      setMensagem(resultado.mensagem);
      setNomeNovo("");
      setAberto(null);
      return;
    }
    if (aberto === "LIMPAR") {
      if (!dados.ativo) return;
      const resultado = await acoes.limparDados.mutateAsync(dados.ativo.id);
      setMensagem(resultado.mensagem);
      setAberto(null);
      return;
    }
    const resultado = duplicar
      ? await acoes.duplicar.mutateAsync()
      : await acoes.encerrar.mutateAsync({});
    setMensagem(resultado.mensagem);
    setAberto(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto("NOVO")}
        className={botao}
        title="Cria um evento novo, zerado"
      >
        Novo Evento
      </button>

      <button
        type="button"
        onClick={() => setAberto("LIMPAR")}
        className={botao}
        title="Zera participantes, ranking e indicações do evento atual (com backup automático)"
      >
        Limpar Dados
      </button>

      <button
        type="button"
        onClick={() => setAberto("DUPLICAR")}
        className={botao}
        title="Arquiva o evento atual e inicia outro com a mesma configuração"
      >
        Duplicar Evento
      </button>
      <button
        type="button"
        onClick={() => setAberto("ENCERRAR")}
        className="rounded-lg border border-destructive/70 px-3 py-2 text-xs font-black uppercase text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
      >
        Encerrar Evento
      </button>

      {aberto === "NOVO" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 text-left">
            <h2 className="text-lg font-black uppercase"> Novo evento</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              O evento atual será arquivado automaticamente (com backup) e um novo evento, zerado,
              será iniciado.
            </p>
            <label className="mt-4 grid gap-1 text-xs font-black uppercase text-muted-foreground">
              Nome do evento
              <input
                autoFocus
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Ex.: Gincana Colégio Santa Luzia – Agosto 2026"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={botao}
                onClick={() => setAberto(null)}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={ocupado || nomeNovo.trim().length < 2}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {ocupado ? "Criando…" : " Criar Evento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aberto === "LIMPAR" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-destructive/60 bg-background p-6 text-left">
            <h2 className="text-lg font-black uppercase text-destructive">
              Tem certeza que deseja zerar todas as contagens deste evento?
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Evento: {dados.ativo ? dados.ativo.nome : "—"}
            </p>
            <p className="mt-3 text-sm font-semibold">Serão zerados:</p>
            <ul className="mt-1 space-y-1 text-sm font-semibold text-muted-foreground">
              <li>• Participantes</li>
              <li>• Ranking e pontuação</li>
              <li>• Indicações e leads</li>
              <li>• Resultados e estatísticas</li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-success">
              Um backup completo é criado automaticamente antes da limpeza e pode ser restaurado a
              qualquer momento em "Histórico de Resets".
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={botao}
                onClick={() => setAberto(null)}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={ocupado}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-black uppercase text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {ocupado ? "Limpando…" : " Confirmar limpeza"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aberto === "ENCERRAR" || aberto === "DUPLICAR" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 text-left">
            <h2 className="text-lg font-black uppercase">
              {duplicar ? "Duplicar evento?" : "Deseja realmente encerrar este evento?"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Evento em andamento: {dados.ativo ? dados.ativo.nome : "—"}
            </p>
            <ul className="mt-4 space-y-1 text-sm font-semibold">
              <li>• Todo o histórico será salvo automaticamente.</li>
              <li>• O ranking será arquivado.</li>
              <li>• Os participantes permanecerão no histórico.</li>
              <li>
                •{" "}
                {duplicar
                  ? "Um novo evento será criado com a mesma configuração e dados zerados."
                  : "Um novo evento será iniciado com pontuação zerada."}
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={botao}
                onClick={() => setAberto(null)}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={ocupado}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-black uppercase text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {ocupado ? "Processando…" : duplicar ? " Duplicar" : " Encerrar Evento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mensagem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6">
            <p className="text-sm font-black">{mensagem}</p>
            <div className="mt-5 flex justify-end">
              <button type="button" className={botao} onClick={() => setMensagem(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
