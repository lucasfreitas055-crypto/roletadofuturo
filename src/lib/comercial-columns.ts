/**
 * Colunas de exportação compartilhadas (Dashboard Comercial e Histórico).
 * Mantém CSV, Excel e PDF com os mesmos campos e formatação.
 */

import type { LinhaComercial } from "@/database/comercial.server";
import { formatarTempo, rotuloStatus } from "@/lib/comercial-metrics";
import type { ColunaExportacao } from "@/utils/export";

export const COLUNAS_COMERCIAL: ColunaExportacao<LinhaComercial>[] = [
  {
    chave: "tipo",
    titulo: "Tipo",
    formatar: (l) => (l.tipo === "INDICACAO" ? "Indicação" : "Participante"),
  },
  { chave: "nome", titulo: "Nome" },
  { chave: "idade", titulo: "Idade", formatar: (l) => (l.idade === null ? "" : String(l.idade)) },
  { chave: "equipe", titulo: "Equipe" },
  { chave: "responsavelNome", titulo: "Responsável" },
  {
    chave: "indicadoPor",
    titulo: "Indicado por",
    formatar: (l) => l.indicadoPor ?? "",
  },
  { chave: "telefone", titulo: "Telefone" },
  { chave: "pontuacao", titulo: "Pontuação", formatar: (l) => l.pontuacao.toFixed(2) },
  {
    chave: "tempoSegundos",
    titulo: "Tempo do desafio",
    formatar: (l) => formatarTempo(l.tempoSegundos),
  },
  { chave: "indicacoesValidas", titulo: "Indicações válidas" },
  { chave: "indicacoesForaPerfil", titulo: "Indicações fora do perfil" },
  {
    chave: "aceitouAula",
    titulo: "Aceitou aula",
    formatar: (l) => (l.aceitouAula ? "Sim" : "Não"),
  },
  { chave: "scoreComercial", titulo: "Score comercial" },
  { chave: "status", titulo: "Status comercial", formatar: (l) => rotuloStatus(l.status) },
  { chave: "observacoes", titulo: "Observações" },
  { chave: "criadoEm", titulo: "Data e hora" },
];
