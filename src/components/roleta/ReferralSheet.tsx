import { useMemo, useState } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { ParticipantBadge } from "@/components/roleta/ParticipantBadge";
import { MAX_INDICACOES, formatarPontos, pontosPorIndicacoes } from "@/config/scoring.config";
import { normalizarNome, normalizarTelefone } from "@/utils/normalize";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

export interface IndicacaoDados {
  nome: string;
  idade: number | null;
  responsavelNome: string;
  whatsapp: string;
}

interface LinhaIndicacao {
  nome: string;
  idade: string;
  responsavelNome: string;
  whatsapp: string;
}

const LINHA_VAZIA: LinhaIndicacao = { nome: "", idade: "", responsavelNome: "", whatsapp: "" };

function mascara(valor: string): string {
  const d = normalizarTelefone(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Estado = "VAZIA" | "VALIDA" | "FORA_PERFIL" | "INVALIDA";

interface Avaliacao {
  estado: Estado;
  erro: string | null;
}

function avaliar(
  linha: LinhaIndicacao,
  indice: number,
  linhas: readonly LinhaIndicacao[],
  whatsappParticipante: string,
): Avaliacao {
  const preenchida =
    linha.nome.trim() !== "" ||
    linha.idade.trim() !== "" ||
    linha.responsavelNome.trim() !== "" ||
    normalizarTelefone(linha.whatsapp) !== "";
  if (!preenchida) return { estado: "VAZIA", erro: null };

  const idade = Number(linha.idade);
  const digitos = normalizarTelefone(linha.whatsapp);

  if (linha.nome.trim().length < 2) return { estado: "INVALIDA", erro: "Informe o nome." };
  if (!Number.isInteger(idade) || idade < 1 || idade > 99) {
    return { estado: "INVALIDA", erro: "Informe a idade." };
  }
  if (linha.responsavelNome.trim().length < 2) {
    return { estado: "INVALIDA", erro: "Informe o nome do responsável." };
  }
  if (digitos.length < 10 || digitos.length > 13) {
    return { estado: "INVALIDA", erro: "Telefone inválido." };
  }
  if (digitos === whatsappParticipante) {
    return { estado: "INVALIDA", erro: "Não é possível indicar o próprio WhatsApp." };
  }
  const repetida = linhas.some(
    (outra, i) => i < indice && normalizarTelefone(outra.whatsapp) === digitos,
  );
  if (repetida) return { estado: "INVALIDA", erro: "Telefone repetido nesta lista." };

  if (idade < 6 || idade > 18) {
    return {
      estado: "FORA_PERFIL",
      erro: "Indicação fora do perfil (6 a 18 anos): será registrada, mas não pontua.",
    };
  }

  return { estado: "VALIDA", erro: null };
}

interface ReferralSheetProps {
  equipe: EquipeCodigo;
  nomeAluno: string;
  whatsappParticipante: string;
  salvando: boolean;
  avisoConexao?: string | null | undefined;
  onFinish: (indicacoes: IndicacaoDados[]) => void | Promise<void>;
}

/**
 * Todas as 10 indicações em uma única tela, com contador dinâmico
 * de indicações válidas e pontos conquistados (+0,1 cada, máximo 1 ponto).
 */
export function ReferralSheet({
  equipe,
  nomeAluno,
  whatsappParticipante,
  salvando,
  avisoConexao,
  onFinish,
}: ReferralSheetProps) {
  const [linhas, setLinhas] = useState<LinhaIndicacao[]>(() =>
    Array.from({ length: MAX_INDICACOES }, () => ({ ...LINHA_VAZIA })),
  );

  const whatsappDono = normalizarTelefone(whatsappParticipante);

  const avaliacoes = useMemo(
    () => linhas.map((linha, i) => avaliar(linha, i, linhas, whatsappDono)),
    [linhas, whatsappDono],
  );

  const validas = avaliacoes.filter((a) => a.estado === "VALIDA").length;
  const foraPerfil = avaliacoes.filter((a) => a.estado === "FORA_PERFIL").length;
  const pontos = pontosPorIndicacoes(validas);

  function atualizar(indice: number, campo: keyof LinhaIndicacao, valor: string) {
    setLinhas((atual) =>
      atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)),
    );
  }

  function coletar(): IndicacaoDados[] {
    return linhas
      .map((linha, i) => ({ linha, avaliacao: avaliacoes[i] }))
      .filter(
        (item) => item.avaliacao?.estado === "VALIDA" || item.avaliacao?.estado === "FORA_PERFIL",
      )
      .map((item) => ({
        nome: item.linha.nome.trim(),
        idade: Number(item.linha.idade),
        responsavelNome: item.linha.responsavelNome.trim(),
        whatsapp: item.linha.whatsapp,
      }));
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-card/70 px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-4 focus-visible:ring-ring";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <ParticipantBadge equipe={equipe} nome={nomeAluno} discreto />
        <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
          Ajude sua equipe a ganhar mais pontos!
        </h2>
        <p className="text-base text-muted-foreground">
          Indique até {MAX_INDICACOES} amigos ou colegas entre 6 e 18 anos. Cada indicação válida
          vale +0,1 ponto.
        </p>
      </div>

      <div className="surface-card sticky top-2 z-10 flex items-center justify-between rounded-2xl border-2 border-primary/40 px-5 py-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground">
            Indicações válidas
          </p>
          <p className="text-2xl font-black tabular-nums">
            {validas} / {MAX_INDICACOES}
          </p>
          {foraPerfil > 0 ? (
            <p className="text-xs font-semibold text-warning">
              +{foraPerfil} fora do perfil (registradas, sem pontos)
            </p>
          ) : null}
        </div>
        <div key={validas} className="animate-pop text-right">
          <p className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground">
            Pontos conquistados
          </p>
          <p
            className="text-2xl font-black tabular-nums drop-shadow-[0_0_12px_rgba(200,162,255,0.4)]"
            style={{ color: "#c8a2ff" }}
          >
            +{formatarPontos(pontos)}
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {linhas.map((linha, indice) => {
          const avaliacao = avaliacoes[indice];
          return (
            <li
              key={indice}
              className={cn(
                "rounded-2xl border-2 bg-card/40 px-3 py-3 transition-colors",
                avaliacao?.estado === "VALIDA" && "border-success/60",
                avaliacao?.estado === "FORA_PERFIL" && "border-warning/60",
                avaliacao?.estado === "INVALIDA" && "border-destructive/60",
                avaliacao?.estado === "VAZIA" && "border-border",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {indice + 1}. Indicação
                </span>
                {avaliacao?.estado === "VALIDA" ? (
                  <span className="text-xs font-black text-success">+0,1 </span>
                ) : null}
                {avaliacao?.estado === "FORA_PERFIL" ? (
                  <span className="text-xs font-black text-warning">Fora do perfil</span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_5rem_1.4fr_1.2fr]">
                <input
                  className={inputClass}
                  value={linha.nome}
                  placeholder="Nome do amigo"
                  autoComplete="off"
                  aria-label={`Nome da indicação ${indice + 1}`}
                  onChange={(e) => atualizar(indice, "nome", e.target.value)}
                />
                <input
                  className={inputClass}
                  value={linha.idade}
                  inputMode="numeric"
                  placeholder="Idade"
                  aria-label={`Idade da indicação ${indice + 1}`}
                  onChange={(e) =>
                    atualizar(indice, "idade", e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                />
                <input
                  className={inputClass}
                  value={linha.responsavelNome}
                  placeholder="Responsável"
                  autoComplete="off"
                  aria-label={`Responsável da indicação ${indice + 1}`}
                  onChange={(e) => atualizar(indice, "responsavelNome", e.target.value)}
                />
                <input
                  className={inputClass}
                  value={linha.whatsapp}
                  inputMode="tel"
                  placeholder="(61) 99999-9999"
                  aria-label={`Telefone da indicação ${indice + 1}`}
                  onChange={(e) => atualizar(indice, "whatsapp", mascara(e.target.value))}
                />
              </div>
              {avaliacao?.erro ? (
                <p
                  className={cn(
                    "mt-2 text-sm font-semibold",
                    avaliacao.estado === "FORA_PERFIL" ? "text-warning" : "text-destructive",
                  )}
                >
                  {avaliacao.erro}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {avisoConexao ? (
        <p role="status" className="rounded-xl bg-warning/15 px-4 py-3 text-sm font-semibold">
          {avisoConexao}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActionButton tamanho="lg" disabled={salvando} onClick={() => void onFinish(coletar())}>
          {salvando ? "Registrando indicações..." : "Finalizar indicações "}
        </ActionButton>
        <ActionButton
          variante="ghost"
          tamanho="lg"
          disabled={salvando}
          onClick={() => void onFinish([])}
        >
          Não quero indicar
        </ActionButton>
      </div>

      {/* Nomes normalizados evitam duplicidade já na digitação. */}
      <p className="text-center text-xs text-muted-foreground">
        {validas > 0
          ? `${normalizarNome(linhas[0]?.nome ?? "") ? "" : ""}Suas indicações válidas serão registradas ao finalizar.`
          : "As indicações são opcionais."}
      </p>
    </div>
  );
}
