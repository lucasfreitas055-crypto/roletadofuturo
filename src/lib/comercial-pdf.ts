import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { LinhaComercial } from "@/database/comercial.server";
import { formatarDataHora, rotuloStatus } from "@/lib/comercial-metrics";

const ROXO: [number, number, number] = [88, 28, 135];

/** PDF comercial — sempre respeita os filtros aplicados na tela. */
export function gerarPdfComercial(linhas: readonly LinhaComercial[], subtitulo: string): void {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setTextColor(...ROXO);
  doc.setFontSize(16);
  doc.text("Dashboard Comercial — Roleta do Futuro", 14, 18);
  doc.setTextColor(90);
  doc.setFontSize(10);
  doc.text(subtitulo, 14, 25);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${linhas.length} registro(s)`,
    14,
    31,
  );

  autoTable(doc, {
    startY: 36,
    head: [
      [
        "Tipo",
        "Nome",
        "Telefone",
        "Equipe",
        "Indicado por",
        "Pontuação",
        "Indicações",
        "Aceitou aula",
        "Status comercial",
        "Observações",
      ],
    ],
    body: linhas.map((linha) => {
      const isIndicacao = linha.tipo === "INDICACAO";
      return [
        isIndicacao ? "Indicação" : "Participante",
        linha.nome,
        linha.telefone,
        linha.equipe || "—",
        linha.indicadoPor ?? "—",
        isIndicacao ? "—" : linha.pontuacao.toFixed(2),
        isIndicacao ? "—" : String(linha.indicacoesValidas),
        linha.aceitouAula ? "Sim" : "Não",
        isIndicacao ? "—" : rotuloStatus(linha.status).replace(/^[^\s]+\s/, ""),
        linha.observacoes,
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: ROXO, textColor: 255 },
    columnStyles: { 0: { cellWidth: 18 }, 9: { cellWidth: 45 } },
  });

  doc.save(
    `dashboard-comercial-${formatarDataHora(new Date().toISOString()).replace(/[/:\s,]/g, "-")}.pdf`,
  );
}
