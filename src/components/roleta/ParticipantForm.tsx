import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

import { ActionButton } from "@/components/roleta/ActionButton";
import { ParticipantBadge } from "@/components/roleta/ParticipantBadge";
import { getEquipeConfig } from "@/config/event.config";
import { formatarTelefone, normalizarTelefone } from "@/utils/normalize";
import { cn } from "@/lib/utils";
import type { EquipeCodigo } from "@/types/database.types";

export interface DadosCadastro {
  nome: string;
  idade: number;
  responsavelNome: string;
  responsavelWhatsapp: string;
}

interface ParticipantFormProps {
  equipe: EquipeCodigo;
  enviando: boolean;
  /** Mensagem de conexão instável (nunca limpa os campos). */
  avisoConexao?: string | null | undefined;
  erroServidor?: string | null | undefined;
  onSubmit: (dados: DadosCadastro) => void;
}

type Campo = "nome" | "idade" | "responsavelNome" | "responsavelWhatsapp";
type Erros = Partial<Record<Campo, string>>;

function mascaraWhatsapp(valor: string): string {
  const d = normalizarTelefone(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function ParticipantForm({
  equipe,
  enviando,
  avisoConexao,
  erroServidor,
  onSubmit,
}: ParticipantFormProps) {
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const refs = useRef<Record<Campo, HTMLInputElement | null>>({
    nome: null,
    idade: null,
    responsavelNome: null,
    responsavelWhatsapp: null,
  });

  useEffect(() => {
    refs.current.nome?.focus();
  }, []);

  const idadeNum = Number.parseInt(idade, 10);
  const digitos = normalizarTelefone(whatsapp);
  const valido =
    nome.trim().length >= 3 &&
    Number.isFinite(idadeNum) &&
    idadeNum >= 1 &&
    idadeNum <= 25 &&
    responsavelNome.trim().length >= 3 &&
    digitos.length >= 10 &&
    digitos.length <= 13;

  function validar(): boolean {
    const novos: Erros = {};
    if (nome.trim().length < 3) novos.nome = "Informe o nome do aluno.";
    if (!Number.isFinite(idadeNum) || idadeNum < 1 || idadeNum > 25)
      novos.idade = "Informe a idade.";
    if (responsavelNome.trim().length < 3) novos.responsavelNome = "Informe o nome do responsável.";
    if (digitos.length < 10 || digitos.length > 13)
      novos.responsavelWhatsapp = "WhatsApp inválido.";
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  function enviar() {
    if (enviando || !validar()) return;
    onSubmit({
      nome: nome.trim(),
      idade: idadeNum,
      responsavelNome: responsavelNome.trim(),
      responsavelWhatsapp: formatarTelefone(whatsapp),
    });
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>, proximo: Campo | null) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (proximo) refs.current[proximo]?.focus();
    else enviar();
  }

  const corEquipe = getEquipeConfig(equipe).corHex;

  const inputClass =
    "w-full rounded-2xl border-2 bg-card/70 px-4 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-4";

  const inputStyle: React.CSSProperties = {
    borderColor: `color-mix(in oklab, ${corEquipe} 55%, transparent)`,
    // O ring do :focus-visible usa a mesma cor da equipe.
    ["--tw-ring-color" as string]: corEquipe,
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <ParticipantBadge equipe={equipe} />
        <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Registre sua participação
        </h2>
      </div>

      <Campo
        id="nome"
        rotulo="Nome do aluno"
        erro={erros.nome}
        input={
          <input
            id="nome"
            ref={(el) => {
              refs.current.nome = el;
            }}
            className={inputClass}
            style={inputStyle}
            value={nome}
            autoComplete="off"
            placeholder="Digite o nome completo"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
            onKeyDown={(e) => aoTeclar(e, "idade")}
            aria-invalid={Boolean(erros.nome)}
          />
        }
      />

      <Campo
        id="idade"
        rotulo="Idade do aluno do Colégio Santa Luzia"
        erro={erros.idade}
        input={
          <input
            id="idade"
            ref={(el) => {
              refs.current.idade = el;
            }}
            className={inputClass}
            style={inputStyle}
            value={idade}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="Ex.: 12"
            onChange={(e) => setIdade(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onKeyDown={(e) => aoTeclar(e, "responsavelNome")}
            aria-invalid={Boolean(erros.idade)}
          />
        }
      />

      <Campo
        id="responsavel"
        rotulo="Nome do responsável"
        erro={erros.responsavelNome}
        input={
          <input
            id="responsavel"
            ref={(el) => {
              refs.current.responsavelNome = el;
            }}
            className={inputClass}
            style={inputStyle}
            value={responsavelNome}
            autoComplete="off"
            placeholder="Nome do pai, mãe ou responsável"
            onChange={(e) => setResponsavelNome(e.target.value)}
            onKeyDown={(e) => aoTeclar(e, "responsavelWhatsapp")}
            aria-invalid={Boolean(erros.responsavelNome)}
          />
        }
      />

      <Campo
        id="whatsapp"
        rotulo="WhatsApp do responsável"
        erro={erros.responsavelWhatsapp}
        input={
          <input
            id="whatsapp"
            ref={(el) => {
              refs.current.responsavelWhatsapp = el;
            }}
            className={inputClass}
            style={inputStyle}
            value={whatsapp}
            inputMode="tel"
            placeholder="(61) 99999-9999"
            onChange={(e) => setWhatsapp(mascaraWhatsapp(e.target.value))}
            onKeyDown={(e) => aoTeclar(e, null)}
            aria-invalid={Boolean(erros.responsavelWhatsapp)}
          />
        }
      />

      {erroServidor ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive-foreground"
        >
          {erroServidor}
        </p>
      ) : null}

      {avisoConexao ? (
        <p
          role="status"
          className="rounded-xl bg-warning/15 px-4 py-3 text-sm font-semibold text-foreground"
        >
          {avisoConexao}
        </p>
      ) : null}

      <ActionButton
        type="submit"
        tamanho="xl"
        disabled={!valido || enviando}
        className="mt-2 w-full"
      >
        {enviando ? "Verificando participação..." : "Continuar para a roleta "}
      </ActionButton>
    </form>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  input,
}: {
  id: string;
  rotulo: string;
  erro?: string | undefined;
  input: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
      >
        {rotulo}
      </label>
      {input}
      <p
        className={cn(
          "min-h-5 text-sm font-semibold text-destructive transition-opacity",
          erro ? "opacity-100" : "opacity-0",
        )}
        role={erro ? "alert" : undefined}
      >
        {erro ?? ""}
      </p>
    </div>
  );
}
