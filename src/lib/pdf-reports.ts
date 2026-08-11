/**
 * Geração de PDFs do painel (extrato da gincana e exportação de leads).
 * Sempre com fallback: se a logo não carregar, o documento é gerado mesmo assim.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { EVENT_CONFIG } from "@/config/event.config";
import { SKILLS } from "@/config/skills.config";
import type { LeadRow, LinhaExtrato, LinhaRanking, ResumoPainel } from "@/database/painel.server";

const ROXO: [number, number, number] = [88, 28, 135];

function nomeEquipe(codigo: string): string {
  return EVENT_CONFIG.equipes.find((e) => e.codigo === codigo)?.nome ?? codigo;
}

export function rotuloHabilidade(codigo: string | null): string {
  if (!codigo) return "—";
  return SKILLS.find((s) => s.codigo === codigo)?.nome ?? codigo;
}

export function formatarData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function carregarLogo(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise<string | null>((resolve) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(typeof leitor.result === "string" ? leitor.result : null);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function cabecalho(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  logoUrl: string | null,
): Promise<number> {
  let y = 14;
  const logo = logoUrl ? await carregarLogo(logoUrl) : null;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, y, 42, 14);
    } catch {
      /* fallback silencioso */
    }
  }
  doc.setTextColor(...ROXO);
  doc.setFontSize(16);
  doc.text(titulo, 14, y + 26);
  doc.setTextColor(90);
  doc.setFontSize(10);
  doc.text(subtitulo, 14, y + 33);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    14,
    y + 39,
  );
  y += 45;
  doc.setDrawColor(...ROXO);
  doc.line(14, y, 196, y);
  return y + 6;
}

export async function gerarExtratoGincana(dados: {
  resumo: ResumoPainel;
  ranking: LinhaRanking[];
  participantes: LinhaExtrato[];
  campanha: string;
  escola: string;
  logoUrl: string | null;
}): Promise<void> {
  const doc = new jsPDF();
  let y = await cabecalho(
    doc,
    `Extrato da Gincana — ${dados.campanha}`,
    dados.escola,
    dados.logoUrl,
  );

  doc.setTextColor(30);
  doc.setFontSize(12);
  doc.text("Resumo geral", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Participantes totais", "Indicações totais", "Pontuação geral", "Equipe campeã"]],
    body: [
      [
        String(dados.resumo.participantesTotais),
        String(dados.resumo.indicacoesTotais),
        dados.resumo.pontuacaoGeral.toLocaleString("pt-BR"),
        dados.resumo.empate ? "EMPATE" : (dados.resumo.equipeLider?.nome ?? "—"),
      ],
    ],
    headStyles: { fillColor: ROXO },
    styles: { fontSize: 10 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.text("Ranking das equipes", 14, y);

  autoTable(doc, {
    startY: y + 4,
    head: [["Posição", "Equipe", "Participantes", "Indicações", "Pontuação"]],
    body: dados.ranking.map((linha) => [
      String(linha.posicao),
      linha.nome,
      String(linha.participantes),
      String(linha.indicacoes),
      linha.pontuacao.toLocaleString("pt-BR"),
    ]),
    headStyles: { fillColor: ROXO },
    styles: { fontSize: 10 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.text("Participantes", 14, y);

  autoTable(doc, {
    startY: y + 4,
    head: [["Nome completo", "Equipe", "Indicações", "Pontuação"]],
    body: dados.participantes.map((linha) => [
      linha.nome,
      nomeEquipe(linha.equipe),
      String(linha.indicacoes),
      linha.pontuacao.toLocaleString("pt-BR"),
    ]),
    headStyles: { fillColor: ROXO },
    styles: { fontSize: 9 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.text("Pontuação total por equipe", 14, y);

  autoTable(doc, {
    startY: y + 4,
    head: [["Equipe", "Pontuação total"]],
    body: dados.ranking.map((linha) => [linha.nome, linha.pontuacao.toLocaleString("pt-BR")]),
    headStyles: { fillColor: ROXO },
    styles: { fontSize: 10 },
  });

  doc.save(`extrato-gincana-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function gerarPdfLeads(dados: {
  leads: LeadRow[];
  campanha: string;
  escola: string;
  logoUrl: string | null;
}): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape" });
  const y = await cabecalho(doc, `Leads — ${dados.campanha}`, dados.escola, dados.logoUrl);

  autoTable(doc, {
    startY: y,
    head: [["Aluno", "Idade", "Responsável", "WhatsApp", "Equipe", "Habilidade", "Data"]],
    body: dados.leads.map((lead) => [
      lead.nome,
      lead.idade_aluno === null ? "—" : String(lead.idade_aluno),
      lead.responsavel_nome,
      lead.responsavel_whatsapp,
      nomeEquipe(lead.equipe),
      rotuloHabilidade(lead.habilidade_sorteada),
      formatarData(lead.created_at),
    ]),
    headStyles: { fillColor: ROXO },
    styles: { fontSize: 9 },
  });

  doc.save(`leads-mister-wiz-${new Date().toISOString().slice(0, 10)}.pdf`);
}
