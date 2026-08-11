/**
 * Métricas, insights e recomendações do Dashboard Comercial.
 * Funções puras — calculadas no cliente sobre as linhas já filtradas,
 * o que mantém o painel instantâneo mesmo com milhares de participantes.
 */

import type {
  ClassificacaoLead,
  LinhaComercial,
  StatusComercial,
} from "@/database/comercial.server";

export const STATUS_COMERCIAL: { codigo: StatusComercial; rotulo: string; icone: string }[] = [
  { codigo: "NOVO", rotulo: "Novo Lead", icone: "" },
  { codigo: "PRIMEIRO_CONTATO", rotulo: "Primeiro Contato", icone: "" },
  { codigo: "AULA_AGENDADA", rotulo: "Aula Agendada", icone: "" },
  { codigo: "COMPARECEU", rotulo: "Compareceu", icone: "" },
  { codigo: "MATRICULADO", rotulo: "Matriculado", icone: "" },
  { codigo: "RETORNAR", rotulo: "Retornar depois", icone: "" },
  { codigo: "SEM_INTERESSE", rotulo: "Sem interesse", icone: "" },
];

export const CLASSIFICACAO: Record<
  ClassificacaoLead,
  { rotulo: string; icone: string; cor: string }
> = {
  MUITO_QUENTE: { rotulo: "Muito quente", icone: "", cor: "var(--destructive)" },
  QUENTE: { rotulo: "Quente", icone: "", cor: "var(--warning)" },
  MORNO: { rotulo: "Morno", icone: "", cor: "var(--primary)" },
  BAIXO: { rotulo: "Baixo interesse", icone: "", cor: "var(--muted-foreground)" },
};

export const ROTULO_HABILIDADE: Record<string, string> = {
  INGLES: "Inglês",
  LIDERANCA: "Liderança",
  EMPREENDEDORISMO: "Empreendedorismo",
  EDUCACAO_FINANCEIRA: "Educação Financeira",
  INTELIGENCIA_EMOCIONAL: "Inteligência Emocional",
};

export function rotuloStatus(status: StatusComercial): string {
  const item = STATUS_COMERCIAL.find((s) => s.codigo === status);
  return item ? `${item.icone} ${item.rotulo}` : status;
}

export function formatarTempo(segundos: number | null): string {
  if (segundos === null || segundos <= 0) return "—";
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const media = (valores: number[]) =>
  valores.length === 0
    ? 0
    : Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100;

/* --------------------------------- Filtros -------------------------------- */

export interface FiltrosComercial {
  busca: string;
  equipe: string;
  status: string;
  classificacao: string;
  aula: string;
  idadeMin: string;
  idadeMax: string;
  pontuacaoMin: string;
  indicacoesMin: string;
  data: string;
  horaMin: string;
  horaMax: string;
}

export const FILTROS_INICIAIS: FiltrosComercial = {
  busca: "",
  equipe: "",
  status: "",
  classificacao: "",
  aula: "",
  idadeMin: "",
  idadeMax: "",
  pontuacaoMin: "",
  indicacoesMin: "",
  data: "",
  horaMin: "",
  horaMax: "",
};

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Instanciado uma única vez: criar Intl.DateTimeFormat por linha custa caro. */
const FORMATADOR_LOCAL = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

const cacheLocal = new Map<string, { dia: string; hora: number }>();

function partesLocais(iso: string): { dia: string; hora: number } {
  const emCache = cacheLocal.get(iso);
  if (emCache) return emCache;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return { dia: "", hora: -1 };
  const fmt = FORMATADOR_LOCAL;
  const partes = Object.fromEntries(fmt.formatToParts(data).map((p) => [p.type, p.value]));
  const resultado = {
    dia: `${partes["year"]}-${partes["month"]}-${partes["day"]}`,
    hora: Number(partes["hour"] ?? -1),
  };
  if (cacheLocal.size < 50_000) cacheLocal.set(iso, resultado);
  return resultado;
}

export function aplicarFiltros(
  linhas: readonly LinhaComercial[],
  filtros: FiltrosComercial,
): LinhaComercial[] {
  const busca = semAcento(filtros.busca.trim());
  const digitos = filtros.busca.replace(/\D/g, "");

  return linhas.filter((linha) => {
    if (busca) {
      const alvo = semAcento(
        `${linha.nome} ${linha.responsavelNome} ${linha.equipe} ${linha.telefone}`,
      );
      const casaTexto = alvo.includes(busca);
      const casaTelefone =
        digitos.length >= 3 && linha.telefone.replace(/\D/g, "").includes(digitos);
      if (!casaTexto && !casaTelefone) return false;
    }
    if (filtros.equipe && linha.equipe !== filtros.equipe) return false;
    if (filtros.status && linha.status !== filtros.status) return false;
    if (filtros.classificacao && linha.classificacao !== filtros.classificacao) return false;
    if (filtros.aula === "SIM" && !linha.aceitouAula) return false;
    if (filtros.aula === "NAO" && linha.aceitouAula) return false;
    if (filtros.idadeMin && (linha.idade ?? -1) < Number(filtros.idadeMin)) return false;
    if (filtros.idadeMax && (linha.idade ?? 999) > Number(filtros.idadeMax)) return false;
    if (filtros.pontuacaoMin && linha.pontuacao < Number(filtros.pontuacaoMin)) return false;
    if (filtros.indicacoesMin && linha.indicacoesValidas < Number(filtros.indicacoesMin))
      return false;

    if (filtros.data || filtros.horaMin || filtros.horaMax) {
      const { dia, hora } = partesLocais(linha.criadoEm);
      if (filtros.data && dia !== filtros.data) return false;
      if (filtros.horaMin && hora < Number(filtros.horaMin)) return false;
      if (filtros.horaMax && hora > Number(filtros.horaMax)) return false;
    }
    return true;
  });
}

/* -------------------------------- Métricas -------------------------------- */

export interface MetricasComercial {
  participantes: number;
  ativos: number;
  tempoMedio: number | null;
  pontuacaoMedia: number;
  familias: number;
  telefonesValidos: number;
  indicacoesValidas: number;
  indicacoesForaPerfil: number;
  mediaIndicacoes: number;
  topIndicador: LinhaComercial | null;
  aceitouAula: number;
  querSaberMais: number;
  naoAceitou: number;
  semResposta: number;
  taxaConversao: number;
  maiorPontuacao: LinhaComercial | null;
  melhorTempo: LinhaComercial | null;
  maiorTempo: LinhaComercial | null;
  maisIndicacoes: LinhaComercial | null;
  equipeLider: LinhaEquipeComercial | null;
  matriculados: number;
  aulasAgendadas: number;
  semContato: number;
  leadsQuentes: number;
}

export interface LinhaEquipeComercial {
  codigo: string;
  nome: string;
  corHex: string;
  participantes: number;
  pontuacao: number;
  media: number;
  indicacoes: number;
  aceitacao: number;
  posicao: number;
}

export function calcularMetricas(linhas: readonly LinhaComercial[]): MetricasComercial {
  const tempos = linhas.map((l) => l.tempoSegundos).filter((t): t is number => t !== null && t > 0);
  const maiorPontuacao = [...linhas].sort((a, b) => b.pontuacao - a.pontuacao)[0] ?? null;
  const comTempo = linhas.filter((l) => l.tempoSegundos !== null && l.tempoSegundos > 0);
  const melhorTempo =
    [...comTempo].sort((a, b) => (a.tempoSegundos ?? 0) - (b.tempoSegundos ?? 0))[0] ?? null;
  const maiorTempo =
    [...comTempo].sort((a, b) => (b.tempoSegundos ?? 0) - (a.tempoSegundos ?? 0))[0] ?? null;
  const maisIndicacoes =
    [...linhas].sort((a, b) => b.indicacoesValidas - a.indicacoesValidas)[0] ?? null;

  const aceitou = linhas.filter((l) => l.interesse === "SIM").length;
  const querMais = linhas.filter((l) => l.interesse === "QUERO_SABER_MAIS").length;
  const talvez = linhas.filter((l) => l.interesse === "TALVEZ_DEPOIS").length;
  const semResposta = linhas.filter((l) => l.interesse === null).length;

  return {
    participantes: linhas.length,
    ativos: linhas.filter((l) => l.fluxoCompleto).length,
    tempoMedio: tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : null,
    pontuacaoMedia: media(linhas.map((l) => l.pontuacao)),
    familias: new Set(linhas.map((l) => l.telefone.replace(/\D/g, ""))).size,
    telefonesValidos: linhas.filter((l) => l.telefoneValido).length,
    indicacoesValidas: linhas.reduce((a, l) => a + l.indicacoesValidas, 0),
    indicacoesForaPerfil: linhas.reduce((a, l) => a + l.indicacoesForaPerfil, 0),
    mediaIndicacoes: media(linhas.map((l) => l.indicacoesValidas)),
    topIndicador: maisIndicacoes && maisIndicacoes.indicacoesValidas > 0 ? maisIndicacoes : null,
    aceitouAula: aceitou,
    querSaberMais: querMais,
    naoAceitou: talvez,
    semResposta,
    taxaConversao: linhas.length ? Math.round((aceitou / linhas.length) * 1000) / 10 : 0,
    maiorPontuacao,
    melhorTempo,
    maiorTempo,
    maisIndicacoes,
    equipeLider: null,
    matriculados: linhas.filter((l) => l.status === "MATRICULADO").length,
    aulasAgendadas: linhas.filter((l) => l.status === "AULA_AGENDADA").length,
    semContato: linhas.filter((l) => l.status === "NOVO").length,
    leadsQuentes: linhas.filter(
      (l) => l.classificacao === "MUITO_QUENTE" || l.classificacao === "QUENTE",
    ).length,
  };
}

export function calcularEquipes(
  linhas: readonly LinhaComercial[],
  equipes: readonly { codigo: string; nome: string; corHex: string }[],
): LinhaEquipeComercial[] {
  return equipes
    .map((equipe) => {
      const doTime = linhas.filter((l) => l.equipe === equipe.codigo);
      const pontuacao = Math.round(doTime.reduce((a, l) => a + l.pontuacao, 0) * 100) / 100;
      const aceitou = doTime.filter((l) => l.aceitouAula).length;
      return {
        codigo: equipe.codigo,
        nome: equipe.nome,
        corHex: equipe.corHex,
        participantes: doTime.length,
        pontuacao,
        media: media(doTime.map((l) => l.pontuacao)),
        indicacoes: doTime.reduce((a, l) => a + l.indicacoesValidas, 0),
        aceitacao: doTime.length ? Math.round((aceitou / doTime.length) * 1000) / 10 : 0,
        posicao: 0,
      };
    })
    .sort((a, b) => b.pontuacao - a.pontuacao || b.participantes - a.participantes)
    .map((linha, indice) => ({ ...linha, posicao: indice + 1 }));
}

export interface LinhaHabilidade {
  codigo: string;
  nome: string;
  total: number;
  mediaPontuacao: number;
}

export function calcularHabilidades(linhas: readonly LinhaComercial[]): LinhaHabilidade[] {
  return Object.keys(ROTULO_HABILIDADE)
    .map((codigo) => {
      const doGrupo = linhas.filter((l) => l.habilidade === codigo);
      return {
        codigo,
        nome: ROTULO_HABILIDADE[codigo] ?? codigo,
        total: doGrupo.length,
        mediaPontuacao: media(doGrupo.map((l) => l.pontuacao)),
      };
    })
    .sort((a, b) => b.total - a.total);
}

/* ---------------------------- Insights e ações ---------------------------- */

export function gerarInsights(
  linhas: readonly LinhaComercial[],
  equipes: readonly LinhaEquipeComercial[],
): string[] {
  if (linhas.length === 0) return [];
  const insights: string[] = [];

  const melhorAceitacao = [...equipes]
    .filter((e) => e.participantes > 0)
    .sort((a, b) => b.aceitacao - a.aceitacao)[0];
  if (melhorAceitacao) {
    insights.push(
      `${melhorAceitacao.nome} possui a maior taxa de aceitação das aulas: ${melhorAceitacao.aceitacao}%.`,
    );
  }

  const faixas = [
    { rotulo: "6–8 anos", teste: (i: number) => i >= 6 && i <= 8 },
    { rotulo: "9–11 anos", teste: (i: number) => i >= 9 && i <= 11 },
    { rotulo: "12–14 anos", teste: (i: number) => i >= 12 && i <= 14 },
    { rotulo: "15–18 anos", teste: (i: number) => i >= 15 && i <= 18 },
  ];
  const porFaixa = faixas
    .map((faixa) => {
      const grupo = linhas.filter((l) => l.idade !== null && faixa.teste(l.idade));
      return {
        rotulo: faixa.rotulo,
        total: grupo.length,
        media: media(grupo.map((l) => l.indicacoesValidas)),
      };
    })
    .filter((f) => f.total > 0)
    .sort((a, b) => b.media - a.media)[0];
  if (porFaixa && porFaixa.media > 0) {
    insights.push(
      `A faixa de ${porFaixa.rotulo} possui a maior média de indicações (${porFaixa.media}).`,
    );
  }

  const altos = linhas.filter((l) => l.pontuacao >= 2.8);
  if (altos.length >= 3) {
    const conv = Math.round((altos.filter((l) => l.aceitouAula).length / altos.length) * 1000) / 10;
    const geral =
      Math.round((linhas.filter((l) => l.aceitouAula).length / linhas.length) * 1000) / 10;
    if (conv > geral) {
      insights.push(
        `Participantes acima de 2,8 pontos convertem mais: ${conv}% aceitam a aula contra ${geral}% da média geral.`,
      );
    }
  }

  const porHora = new Map<number, number>();
  for (const linha of linhas) {
    const { hora } = partesLocais(linha.criadoEm);
    if (hora >= 0) porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
  }
  const pico = [...porHora.entries()].sort((a, b) => b[1] - a[1])[0];
  if (pico) {
    insights.push(
      `O período entre ${pico[0]}h e ${pico[0] + 1}h teve o maior fluxo: ${pico[1]} participantes.`,
    );
  }

  const habilidades = calcularHabilidades(linhas).filter((h) => h.total > 0);
  const melhorHabilidade = [...habilidades].sort((a, b) => b.mediaPontuacao - a.mediaPontuacao)[0];
  if (melhorHabilidade) {
    insights.push(
      `${melhorHabilidade.nome} foi a habilidade com maior pontuação média (${melhorHabilidade.mediaPontuacao}).`,
    );
  }

  const semTelefone = linhas.filter((l) => !l.telefoneValido).length;
  if (semTelefone > 0) {
    insights.push(
      `${semTelefone} cadastro(s) com telefone fora do padrão — revisar antes das ligações.`,
    );
  }

  const foraPerfil = linhas.reduce((a, l) => a + l.indicacoesForaPerfil, 0);
  if (foraPerfil > 0) {
    insights.push(
      `${foraPerfil} indicação(ões) fora da faixa de 6 a 18 anos foram registradas para uso comercial, sem pontuar.`,
    );
  }

  const responderam = linhas.filter((l) => l.interesse !== null);
  if (responderam.length > 0) {
    const aceitaram = responderam.filter((l) => l.aceitouAula).length;
    const taxa = Math.round((aceitaram / responderam.length) * 1000) / 10;
    insights.push(
      `${aceitaram} de ${responderam.length} participantes aceitaram as 5 aulas experimentais (${taxa}% de conversão).`,
    );
  }

  return insights;
}

export interface ProximaAcao {
  id: string;
  icone: string;
  texto: string;
  prioridade: number;
}

export function gerarProximasAcoes(linhas: readonly LinhaComercial[]): ProximaAcao[] {
  const acoes: ProximaAcao[] = [];

  for (const linha of linhas) {
    if (linha.status === "MATRICULADO" || linha.status === "SEM_INTERESSE") continue;

    if (linha.status === "NOVO" && linha.scoreComercial >= 75) {
      acoes.push({
        id: `hoje-${linha.id}`,
        icone: "",
        texto: `Entrar em contato hoje: ${linha.nome} — Score ${linha.scoreComercial}.`,
        prioridade: 100 + linha.scoreComercial,
      });
      continue;
    }
    if (linha.status === "AULA_AGENDADA") {
      acoes.push({
        id: `agenda-${linha.id}`,
        icone: "",
        texto: `Confirmar a aula experimental de ${linha.nome} com ${linha.responsavelNome}.`,
        prioridade: 90,
      });
      continue;
    }
    if (linha.aceitouAula && linha.status === "NOVO") {
      acoes.push({
        id: `aceitou-${linha.id}`,
        icone: "",
        texto: `${linha.nome} aceitou a aula experimental, mas ainda não foi contatado.`,
        prioridade: 80 + linha.scoreComercial / 10,
      });
      continue;
    }
    if (linha.indicacoesValidas >= 8) {
      acoes.push({
        id: `indica-${linha.id}`,
        icone: "",
        texto: `Família de ${linha.nome} com ${linha.indicacoesValidas} indicações e alto potencial de matrícula.`,
        prioridade: 70 + linha.indicacoesValidas,
      });
      continue;
    }
    if (linha.status === "RETORNAR") {
      acoes.push({
        id: `retorno-${linha.id}`,
        icone: "",
        texto: `Retornar contato com ${linha.responsavelNome} (${linha.nome}).`,
        prioridade: 60,
      });
      continue;
    }
    if (linha.status === "COMPARECEU") {
      acoes.push({
        id: `fechar-${linha.id}`,
        icone: "",
        texto: `${linha.nome} compareceu à aula — apresentar proposta de matrícula.`,
        prioridade: 95,
      });
    }
  }

  return acoes.sort((a, b) => b.prioridade - a.prioridade).slice(0, 12);
}
