/**
 * Camada OFFLINE FIRST do terminal do evento.
 *
 * Toda gravação do participante passa por aqui: se houver internet, envia na hora;
 * se não houver (ou se falhar), guarda em localStorage e sincroniza sozinho depois.
 * Nunca perde participantes, indicações, pontuação do Quest ou leads.
 */

export type OperacaoTipo =
  "PARTICIPACAO" | "HABILIDADE" | "QUEST" | "DESAFIO" | "INDICACAO" | "INTERESSE";

export interface OperacaoPendente {
  readonly id: string;
  readonly tipo: OperacaoTipo;
  /** Referência local do participante (`local:<uuid>`). */
  readonly refLocal: string;
  readonly payload: Record<string, unknown>;
  readonly criadoEm: string;
  readonly tentativas: number;
}

const CHAVE_FILA = "mw:fila-offline:v1";
const CHAVE_MAPA = "mw:mapa-ids:v1";
const CHAVE_PLACAR = "mw:placar-cache:v1";

const disponivel = () => typeof window !== "undefined" && Boolean(window.localStorage);

function ler<T>(chave: string, padrao: T): T {
  if (!disponivel()) return padrao;
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown): void {
  if (!disponivel()) return;
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento cheio — a operação em memória continua */
  }
}

export function novaRefLocal(): string {
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `local:${aleatorio}`;
}

export function ehRefLocal(valor: string | null | undefined): boolean {
  return Boolean(valor?.startsWith("local:"));
}

/* ---------------------------------- Fila ---------------------------------- */

export function listarPendentes(): OperacaoPendente[] {
  return ler<OperacaoPendente[]>(CHAVE_FILA, []);
}

export function enfileirar(
  tipo: OperacaoTipo,
  refLocal: string,
  payload: Record<string, unknown>,
): OperacaoPendente {
  const operacao: OperacaoPendente = {
    id: novaRefLocal(),
    tipo,
    refLocal,
    payload,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  };
  gravar(CHAVE_FILA, [...listarPendentes(), operacao]);
  return operacao;
}

function removerDaFila(id: string): void {
  gravar(
    CHAVE_FILA,
    listarPendentes().filter((o) => o.id !== id),
  );
}

function registrarTentativa(id: string): void {
  gravar(
    CHAVE_FILA,
    listarPendentes().map((o) => (o.id === id ? { ...o, tentativas: (o.tentativas ?? 0) + 1 } : o)),
  );
}

/* ------------------------------ Mapa de IDs -------------------------------- */

function mapaIds(): Record<string, string> {
  return ler<Record<string, string>>(CHAVE_MAPA, {});
}

export function registrarId(refLocal: string, idServidor: string): void {
  gravar(CHAVE_MAPA, { ...mapaIds(), [refLocal]: idServidor });
}

/** Converte a referência local no id real do banco, quando já sincronizado. */
export function resolverId(ref: string): string | null {
  if (!ehRefLocal(ref)) return ref;
  return mapaIds()[ref] ?? null;
}

/* ------------------------------ Placar offline ----------------------------- */

export function salvarPlacarCache(dados: unknown): void {
  gravar(CHAVE_PLACAR, dados);
}

export function lerPlacarCache<T>(): T | null {
  return ler<T | null>(CHAVE_PLACAR, null);
}

/* ------------------------------ Sincronização ------------------------------ */

export interface Executores {
  PARTICIPACAO: (payload: Record<string, unknown>) => Promise<{ participanteId?: string | null }>;
  HABILIDADE: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  QUEST: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  DESAFIO: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  INDICACAO: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  INTERESSE: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
}

let sincronizando = false;

/**
 * Envia a fila em ordem. A participação é sempre a primeira operação de cada
 * referência local — as demais só rodam depois que o id real existe.
 * Duplicidade detectada pelo servidor não apaga nada: a operação sai da fila
 * apenas quando o servidor confirma, e o mapa de ids impede envio em dobro.
 */
export async function sincronizar(executores: Executores): Promise<number> {
  if (sincronizando || typeof navigator === "undefined" || !navigator.onLine) return 0;
  sincronizando = true;
  let enviadas = 0;

  try {
    for (const operacao of listarPendentes()) {
      try {
        if (operacao.tipo === "PARTICIPACAO") {
          const resultado = await executores.PARTICIPACAO(operacao.payload);
          if (resultado?.participanteId) registrarId(operacao.refLocal, resultado.participanteId);
          removerDaFila(operacao.id);
          enviadas += 1;
          continue;
        }

        const id = resolverId(operacao.refLocal);
        if (!id) {
          registrarTentativa(operacao.id);
          continue; // participação ainda não sincronizada — tenta no próximo ciclo
        }
        await executores[operacao.tipo](id, operacao.payload);
        removerDaFila(operacao.id);
        enviadas += 1;
      } catch {
        // Falha de rede: mantém na fila e interrompe o ciclo atual.
        registrarTentativa(operacao.id);
        break;
      }
    }
  } finally {
    sincronizando = false;
  }

  return enviadas;
}
