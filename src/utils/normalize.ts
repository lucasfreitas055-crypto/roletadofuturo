/**
 * Normalizadores — devem ser idênticos aos do banco de dados
 * (public.normalizar_nome / public.normalizar_telefone).
 */

const ACENTOS_DE = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
const ACENTOS_PARA = "aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN";

/** Remove acentos, espaços duplicados e transforma em maiúsculo. */
export function normalizarNome(valor: string | null | undefined): string {
  const base = (valor ?? "")
    .split("")
    .map((char) => {
      const idx = ACENTOS_DE.indexOf(char);
      return idx >= 0 ? ACENTOS_PARA[idx] : char;
    })
    .join("");
  return base.replace(/\s+/g, " ").trim().toUpperCase();
}

/** Remove parênteses, espaços, hífens e qualquer símbolo — mantém só dígitos. */
export function normalizarTelefone(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Par original + normalizado, sempre salvo em conjunto. */
export interface ValorNormalizado {
  valor_original: string;
  valor_normalizado: string;
}

export function normalizarValorNome(valor: string): ValorNormalizado {
  return { valor_original: valor.trim(), valor_normalizado: normalizarNome(valor) };
}

export function normalizarValorTelefone(valor: string): ValorNormalizado {
  return { valor_original: valor.trim(), valor_normalizado: normalizarTelefone(valor) };
}

export function telefoneValido(valor: string): boolean {
  const digitos = normalizarTelefone(valor);
  return digitos.length >= 10 && digitos.length <= 13;
}

/** Formata para exibição: (11) 91234-5678 */
export function formatarTelefone(valor: string): string {
  const d = normalizarTelefone(valor).slice(-11);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}
