/**
 * Exportação de dados (CSV / Excel-compatível).
 * Não depende de bibliotecas externas e funciona apenas no navegador.
 */

export interface ColunaExportacao<T> {
  chave: keyof T & string;
  titulo: string;
  formatar?: (linha: T) => string;
}

function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarCsv<T extends object>(
  linhas: readonly T[],
  colunas: readonly ColunaExportacao<T>[],
  separador = ";",
): string {
  const cabecalho = colunas.map((c) => escaparCsv(c.titulo)).join(separador);
  const corpo = linhas.map((linha) =>
    colunas.map((c) => escaparCsv(c.formatar ? c.formatar(linha) : linha[c.chave])).join(separador),
  );
  // BOM garante acentuação correta ao abrir no Excel.
  return `\uFEFF${[cabecalho, ...corpo].join("\r\n")}`;
}

export function baixarArquivo(conteudo: string, nomeArquivo: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarCsv<T extends object>(
  linhas: readonly T[],
  colunas: readonly ColunaExportacao<T>[],
  nomeArquivo: string,
): void {
  baixarArquivo(gerarCsv(linhas, colunas), `${nomeArquivo}.csv`, "text/csv;charset=utf-8;");
}

/** Excel abre nativamente uma tabela HTML com extensão.xls. */
export function exportarExcel<T extends object>(
  linhas: readonly T[],
  colunas: readonly ColunaExportacao<T>[],
  nomeArquivo: string,
): void {
  const escapar = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const thead = `<tr>${colunas.map((c) => `<th>${escapar(c.titulo)}</th>`).join("")}</tr>`;
  const tbody = linhas
    .map(
      (linha) =>
        `<tr>${colunas
          .map((c) => `<td>${escapar(c.formatar ? c.formatar(linha) : linha[c.chave])}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<html><head><meta charset="utf-8" /></head><body><table border="1">${thead}${tbody}</table></body></html>`;
  baixarArquivo(html, `${nomeArquivo}.xls`, "application/vnd.ms-excel;charset=utf-8;");
}
