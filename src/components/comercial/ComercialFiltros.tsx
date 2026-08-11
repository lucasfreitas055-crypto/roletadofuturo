import type { EquipeComercial } from "@/database/comercial.server";
import { CLASSIFICACAO, STATUS_COMERCIAL, type FiltrosComercial } from "@/lib/comercial-metrics";

interface Props {
  filtros: FiltrosComercial;
  equipes: readonly EquipeComercial[];
  onChange: (filtros: FiltrosComercial) => void;
  onLimpar: () => void;
}

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary";

export function ComercialFiltros({ filtros, equipes, onChange, onLimpar }: Props) {
  const set = <K extends keyof FiltrosComercial>(chave: K, valor: FiltrosComercial[K]) =>
    onChange({ ...filtros, [chave]: valor });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <input
          value={filtros.busca}
          onChange={(e) => set("busca", e.target.value)}
          placeholder=" Pesquisar por nome, responsável, telefone ou equipe"
          className={campo}
          aria-label="Pesquisa inteligente"
        />
        <button
          type="button"
          onClick={onLimpar}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-muted"
        >
          Limpar
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <select
          className={campo}
          value={filtros.equipe}
          onChange={(e) => set("equipe", e.target.value)}
          aria-label="Equipe"
        >
          <option value="">Todas as equipes</option>
          {equipes.map((equipe) => (
            <option key={equipe.codigo} value={equipe.codigo}>
              {equipe.nome}
            </option>
          ))}
        </select>

        <select
          className={campo}
          value={filtros.status}
          onChange={(e) => set("status", e.target.value)}
          aria-label="Status comercial"
        >
          <option value="">Todos os status</option>
          {STATUS_COMERCIAL.map((status) => (
            <option key={status.codigo} value={status.codigo}>
              {status.icone} {status.rotulo}
            </option>
          ))}
        </select>

        <select
          className={campo}
          value={filtros.classificacao}
          onChange={(e) => set("classificacao", e.target.value)}
          aria-label="Classificação do lead"
        >
          <option value="">Todas as classificações</option>
          {Object.entries(CLASSIFICACAO).map(([codigo, item]) => (
            <option key={codigo} value={codigo}>
              {item.icone} {item.rotulo}
            </option>
          ))}
        </select>

        <select
          className={campo}
          value={filtros.aula}
          onChange={(e) => set("aula", e.target.value)}
          aria-label="Aula experimental"
        >
          <option value="">Aula experimental</option>
          <option value="SIM"> Aceitou</option>
          <option value="NAO"> Não aceitou</option>
        </select>

        <input
          className={campo}
          type="number"
          min={1}
          max={99}
          value={filtros.idadeMin}
          onChange={(e) => set("idadeMin", e.target.value)}
          placeholder="Idade mín."
          aria-label="Idade mínima"
        />
        <input
          className={campo}
          type="number"
          min={1}
          max={99}
          value={filtros.idadeMax}
          onChange={(e) => set("idadeMax", e.target.value)}
          placeholder="Idade máx."
          aria-label="Idade máxima"
        />
        <input
          className={campo}
          type="number"
          step="0.1"
          min={0}
          max={3}
          value={filtros.pontuacaoMin}
          onChange={(e) => set("pontuacaoMin", e.target.value)}
          placeholder="Pontuação mín."
          aria-label="Pontuação mínima"
        />
        <input
          className={campo}
          type="number"
          min={0}
          max={10}
          value={filtros.indicacoesMin}
          onChange={(e) => set("indicacoesMin", e.target.value)}
          placeholder="Indicações mín."
          aria-label="Indicações mínimas"
        />
        <input
          className={campo}
          type="date"
          value={filtros.data}
          onChange={(e) => set("data", e.target.value)}
          aria-label="Data"
        />
        <input
          className={campo}
          type="number"
          min={0}
          max={23}
          value={filtros.horaMin}
          onChange={(e) => set("horaMin", e.target.value)}
          placeholder="Hora inicial"
          aria-label="Hora inicial"
        />
        <input
          className={campo}
          type="number"
          min={0}
          max={23}
          value={filtros.horaMax}
          onChange={(e) => set("horaMax", e.target.value)}
          placeholder="Hora final"
          aria-label="Hora final"
        />
      </div>
    </section>
  );
}
