/**
 * Áudio da Roleta das Habilidades — Web Audio API.
 *
 * Um único AudioContext para toda a sessão do evento: nenhum elemento <audio>
 * é criado por giro, evitando vazamento de memória em centenas de participações.
 */

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
let loopOsc: OscillatorNode | null = null;
let loopGain: GainNode | null = null;
let mudo = false;
const CHAVE_MUDO = "mw:som-mudo:v1";
const ouvintes = new Set<(valor: boolean) => void>();

if (typeof window !== "undefined") {
  try {
    mudo = window.localStorage.getItem(CHAVE_MUDO) === "1";
  } catch {
    /* ignora */
  }
}

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    mestre = ctx.createGain();
    mestre.gain.value = mudo ? 0 : 0.5;
    mestre.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function definirMudo(valor: boolean): void {
  mudo = valor;
  if (mestre && ctx) mestre.gain.setTargetAtTime(valor ? 0 : 0.5, ctx.currentTime, 0.05);
  try {
    window.localStorage.setItem(CHAVE_MUDO, valor ? "1" : "0");
  } catch {
    /* ignora */
  }
  ouvintes.forEach((fn) => fn(valor));
}

/** Assina mudanças da preferência de som. Devolve a função de cancelamento. */
export function inscreverMudo(fn: (valor: boolean) => void): () => void {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

export function estaMudo(): boolean {
  return mudo;
}

function bip(
  frequencia: number,
  duracao: number,
  volume: number,
  tipo: OscillatorType = "square",
): void {
  const c = contexto();
  if (!c || !mestre) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.value = frequencia;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(volume, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duracao);
  osc.connect(g);
  g.connect(mestre);
  osc.start();
  osc.stop(c.currentTime + duracao + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

/** Estalo curto de cada segmento passando pelo ponteiro. */
export function tocarTic(): void {
  bip(1200, 0.045, 0.25, "square");
}

/** Zumbido contínuo enquanto a roleta gira. */
export function iniciarLoopGiro(): void {
  const c = contexto();
  if (!c || !mestre || loopOsc) return;
  loopOsc = c.createOscillator();
  loopGain = c.createGain();
  loopOsc.type = "sawtooth";
  loopOsc.frequency.value = 90;
  loopGain.gain.setValueAtTime(0, c.currentTime);
  loopGain.gain.linearRampToValueAtTime(0.07, c.currentTime + 0.3);
  loopOsc.connect(loopGain);
  loopGain.connect(mestre);
  loopOsc.start();
}

export function pararLoopGiro(): void {
  if (!ctx || !loopOsc || !loopGain) return;
  const fim = ctx.currentTime + 0.25;
  loopGain.gain.exponentialRampToValueAtTime(0.0001, fim);
  const osc = loopOsc;
  const g = loopGain;
  osc.stop(fim + 0.05);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
  loopOsc = null;
  loopGain = null;
}

/** Arpejo de vitória ao parar na habilidade sorteada. */
export function tocarVitoria(): void {
  const notas = [523.25, 659.25, 783.99, 1046.5];
  notas.forEach((nota, i) => {
    window.setTimeout(() => bip(nota, 0.32, 0.28, "triangle"), i * 110);
  });
}

/** Silencia tudo — usado no reset entre participantes. */
export function resetarAudio(): void {
  pararLoopGiro();
}

/* ------------------------- Sons discretos de feedback ------------------------ */

/** Resposta correta — arpejo curto e suave. */
export function tocarAcerto(): void {
  bip(784, 0.12, 0.16, "triangle");
  window.setTimeout(() => bip(1046.5, 0.16, 0.14, "triangle"), 90);
}

/** Resposta incorreta — nota grave discreta, nunca punitiva. */
export function tocarErro(): void {
  bip(220, 0.18, 0.12, "sine");
}

/** Pontuação conquistada. */
export function tocarPontos(): void {
  [659.25, 880].forEach((nota, i) =>
    window.setTimeout(() => bip(nota, 0.14, 0.13, "triangle"), i * 90),
  );
}

/** Ranking atualizado / ultrapassagem de equipe. */
export function tocarRanking(): void {
  [523.25, 659.25, 880].forEach((nota, i) =>
    window.setTimeout(() => bip(nota, 0.12, 0.1, "sine"), i * 70),
  );
}

/** Finalização do desafio. */
export function tocarFinal(): void {
  [523.25, 698.46, 880, 1174.66].forEach((nota, i) =>
    window.setTimeout(() => bip(nota, 0.24, 0.14, "triangle"), i * 130),
  );
}
