import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CompletionScreen } from "@/components/roleta/CompletionScreen";
import { ScreenTransition } from "@/components/roleta/ScreenTransition";
import { SoundToggle } from "@/components/roleta/SoundToggle";
import { MenuBar } from "@/components/roleta/MenuBar";
import { LiveScoreboard } from "@/components/roleta/LiveScoreboard";
import { QuestIntro } from "@/components/roleta/QuestIntro";
import { QuestResult } from "@/components/roleta/QuestResult";
import { QuestScreen } from "@/components/roleta/QuestScreen";
import { ReferralSheet, type IndicacaoDados } from "@/components/roleta/ReferralSheet";
import { SkillWheelScreen } from "@/components/roleta/SkillWheelScreen";
import { FinaleScreen, type RespostaAulas } from "@/components/roleta/FinaleScreen";
import { SkillProfile } from "@/components/roleta/SkillProfile";
import { DuplicateWarning } from "@/components/roleta/DuplicateWarning";
import { EventHeader } from "@/components/roleta/EventHeader";
import { HomeScreen } from "@/components/roleta/HomeScreen";
import { IntroScreen } from "@/components/roleta/IntroScreen";
import { ParticipantConfirmation } from "@/components/roleta/ParticipantConfirmation";
import { ParticipantForm, type DadosCadastro } from "@/components/roleta/ParticipantForm";
import { TeamSelector } from "@/components/roleta/TeamSelector";
import { calcularPontuacao } from "@/config/scoring.config";
import {
  QUEST_TOTAL_QUESTOES,
  questoesPorParticipacao,
  faixaEtariaPorIdade,
  sortearQuestoes,
  type Questao,
  type RespostaQuest,
  type ResultadoQuest,
} from "@/config/quest.config";
import { filtrarBancoLocal } from "@/data/question-bank";
import { lerQuestoesCache, salvarQuestoesCache } from "@/lib/quest-cache";
import {
  combinarDistribuicao,
  registrarSorteioLocal,
  sortearEquilibrado,
} from "@/lib/skill-balance";
import { obterDistribuicaoPublica } from "@/lib/participacao.functions";
import { useConexao } from "@/hooks/useConexao";
import { useEventMode } from "@/hooks/useEventMode";
import { usePainelEventos } from "@/hooks/useEventos";
import { useConfiguracaoPublica } from "@/hooks/usePainel";
import { usePlacarAoVivo } from "@/hooks/usePlacarAoVivo";
import { useParticipantFlow } from "@/hooks/useParticipantFlow";
import { useRanking } from "@/hooks/useRanking";
import { useSkillWheel } from "@/hooks/useSkillWheel";
import { SkillService } from "@/services/skill.service";
import { SyncService } from "@/services/sync.service";
import type { SkillConfig } from "@/config/skills.config";
import type { ResultadoParticipacao } from "@/types/database.types";
import { QuestRunner } from "@/components/roleta/QuestRunner";
import { ChallengeLatas } from "@/components/roleta/ChallengeLatas";
import bgRoxo from "@/assets/bg-roxo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roleta do Futuro | Mister Wiz" },
      {
        name: "description",
        content:
          "Roleta do Futuro da Mister Wiz na Gincana do Colégio Santa Luzia: escolha sua equipe, gire a roleta das habilidades e vença o Quest Mister Wiz.",
      },
      { property: "og:title", content: "Roleta do Futuro | Mister Wiz" },
      {
        property: "og:description",
        content:
          "Gire. Jogue. Pontue. A experiência gamificada da Mister Wiz na Gincana do Colégio Santa Luzia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoletaDoFuturo,
});

const AVISO_CONEXAO = "Conexão instável. Tentando novamente...";

function RoletaDoFuturo() {
  const flow = useParticipantFlow();
  const queryClient = useQueryClient();
  const { equipes, isLoading } = useRanking();
  const { registrarParticipacao } = useEventMode();
  const { data: configuracao } = useConfiguracaoPublica();
  const { dados: painelEventos } = usePainelEventos();
  useConexao(); // efeitos de sincronização offline permanecem ativos em background
  const modoDemonstracao = configuracao?.modo === "DEMONSTRACAO";
  const modoTeste = configuracao?.modo === "TESTE";
  const mostrarRanking = configuracao?.mostrar_ranking ?? true;

  const placar = usePlacarAoVivo(
    (flow.currentStep === "HOME" || flow.currentStep === "FINALE") && mostrarRanking,
  );

  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [avisoConexao, setAvisoConexao] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [indicando, setIndicando] = useState(false);
  const [solicitado, setSolicitado] = useState(false);
  const [modalHabilidade, setModalHabilidade] = useState<SkillConfig | null>(null);
  const [carregandoQuest, setCarregandoQuest] = useState(false);
  const [avisoQuest, setAvisoQuest] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [resultadoQuest, setResultadoQuest] = useState<ResultadoQuest | null>(null);
  const [salvandoQuest, setSalvandoQuest] = useState(false);
  const [salvandoInteresse, setSalvandoInteresse] = useState(false);
  const lentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iniciarAvisoLento = useCallback(() => {
    lentoRef.current = setTimeout(() => setAvisoConexao(AVISO_CONEXAO), 4000);
  }, []);
  const pararAvisoLento = useCallback(() => {
    if (lentoRef.current) clearTimeout(lentoRef.current);
    lentoRef.current = null;
    setAvisoConexao(null);
  }, []);

  useEffect(() => () => pararAvisoLento(), [pararAvisoLento]);

  /* ----------------------- Sorteio inteligente das habilidades ---------------------- */

  const distribuicao = useQuery({
    queryKey: ["habilidades", "distribuicao"],
    queryFn: () => obterDistribuicaoPublica(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const sortear = useCallback(
    () =>
      sortearEquilibrado(combinarDistribuicao(distribuicao.data as Record<string, number> | null)),
    [distribuicao.data],
  );

  const aoSortearHabilidade = useCallback(
    (skill: SkillConfig) => {
      flow.definirHabilidade(skill);
      registrarSorteioLocal(skill.codigo);
      // Inteligência Emocional não tem quiz: abre direto o Desafio das Latas.
      if (skill.codigo === "INTELIGENCIA_EMOCIONAL") {
        setModalHabilidade(null);
        flow.ir("DESAFIO");
      } else {
        setModalHabilidade(skill);
      }
      const ref = flow.participantRef;
      if (ref && !modoDemonstracao) {
        void SyncService.enviar("HABILIDADE", ref, { habilidade: skill.codigo });
      }
    },
    [flow, modoDemonstracao],
  );

  const roleta = useSkillWheel(aoSortearHabilidade, sortear);

  /* ---------------------------------- Reset ---------------------------------- */

  const proximoParticipante = useCallback(() => {
    pararAvisoLento();
    setErroServidor(null);
    setSolicitado(false);
    setModalHabilidade(null);
    setCarregandoQuest(false);
    setAvisoQuest(null);
    setQuestoes([]);
    setResultadoQuest(null);
    setSalvandoQuest(false);
    setSalvandoInteresse(false);
    setRegistrando(false);
    setIndicando(false);
    roleta.resetar();
    flow.resetar();
  }, [flow, pararAvisoLento, roleta]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (flow.currentStep === "INTRO" || flow.currentStep === "HOME") return;
      if (window.confirm("Cancelar a participação atual e chamar o próximo participante?")) {
        proximoParticipante();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flow.currentStep, proximoParticipante]);

  /* --------------------------------- Cadastro -------------------------------- */

  async function enviarCadastro(dados: DadosCadastro) {
    if (!flow.currentTeam) return;
    setErroServidor(null);
    iniciarAvisoLento();
    setRegistrando(true);
    flow.definirParticipante({
      id: null,
      nome: dados.nome,
      idade: dados.idade,
      responsavelNome: dados.responsavelNome,
      responsavelWhatsapp: dados.responsavelWhatsapp,
    });

    // Modo Demonstração: o fluxo roda inteiro, mas nada é gravado no banco.
    if (modoDemonstracao) {
      pararAvisoLento();
      setRegistrando(false);
      flow.ir("CONFIRMACAO");
      return;
    }

    try {
      const { ref, resultado, offline } = await SyncService.registrarParticipacao({
        nome: dados.nome,
        idadeAluno: dados.idade,
        responsavelNome: dados.responsavelNome,
        responsavelWhatsapp: dados.responsavelWhatsapp,
        equipe: flow.currentTeam,
      });

      // Offline: o participante segue o fluxo normalmente; a fila sincroniza depois.
      if (offline || !resultado) {
        flow.definirRef(ref);
        flow.ir("CONFIRMACAO");
        return;
      }

      const res = resultado as ResultadoParticipacao;
      if (res.status === "SUCESSO") {
        flow.definirParticipante({
          id: res.participanteId,
          nome: dados.nome,
          idade: dados.idade,
          responsavelNome: dados.responsavelNome,
          responsavelWhatsapp: dados.responsavelWhatsapp,
        });
        flow.definirRef(res.participanteId);
        registrarParticipacao();
        flow.ir("CONFIRMACAO");
      } else if (res.status === "BLOQUEADO_DUPLICIDADE") {
        flow.definirMensagem(res.mensagem);
        flow.ir("DUPLICADO");
      } else if (res.status === "POSSIVEL_DUPLICIDADE") {
        flow.definirMensagem(res.mensagem);
        flow.ir("NOME_DUPLICADO");
      } else {
        setErroServidor(res.mensagem);
      }
    } catch {
      setErroServidor("Não conseguimos salvar agora. Seus dados foram mantidos — tente novamente.");
    } finally {
      setRegistrando(false);
      pararAvisoLento();
    }
  }

  /* ---------------------------- Quest Mister Wiz ----------------------------- */

  /** Busca as 10 questões: servidor → cache local → banco offline embutido. */
  async function iniciarQuest(skill: SkillConfig) {
    const faixa = faixaEtariaPorIdade(flow.currentParticipant?.idade ?? null);
    setCarregandoQuest(true);
    setAvisoQuest(null);

    let banco: Questao[] = [];
    try {
      banco = (await SkillService.questoes(skill.codigo, faixa)) as Questao[];
      if (banco.length > 0) salvarQuestoesCache(skill.codigo, faixa, banco);
    } catch {
      banco = [];
    }
    if (banco.length === 0) banco = lerQuestoesCache(skill.codigo, faixa) ?? [];
    if (banco.length === 0) banco = filtrarBancoLocal(skill.codigo, faixa);

    const quantidade = questoesPorParticipacao(skill.codigo, faixa);
    const selecionadas = sortearQuestoes(banco, quantidade);
    setCarregandoQuest(false);

    if (selecionadas.length === 0) {
      setAvisoQuest("Não há perguntas disponíveis agora. Chame o monitor.");
      return;
    }
    if (selecionadas.length < quantidade) {
      setAvisoQuest(`Rodada com ${selecionadas.length} perguntas.`);
    }

    setQuestoes(selecionadas);
    setModalHabilidade(null);
    flow.ir("QUEST");
  }

  async function finalizarQuest(resultado: ResultadoQuest, respostas: RespostaQuest[]) {
    setResultadoQuest(resultado);
    flow.definirQuest({
      segundos: resultado.tempoSegundos,
      pontos: resultado.score,
      acertos: resultado.acertos,
    });
    flow.ir("QUEST_RESULTADO");

    const ref = flow.participantRef;
    if (!ref || modoDemonstracao) return;
    setSalvandoQuest(true);
    await SyncService.enviar("QUEST", ref, {
      tempoSegundos: resultado.tempoSegundos,
      acertos: resultado.acertos,
      erros: resultado.erros,
      naoRespondidas: resultado.naoRespondidas,
      speedFactor: resultado.speedFactor,
      accuracyFactor: resultado.accuracyFactor,
      score: resultado.score,
      respostas,
    });
    setSalvandoQuest(false);
  }

  /* -------------------------- Desafio das Latas (IE) ------------------------- */

  async function finalizarDesafio(dados: { segundos: number; pontos: number }) {
    flow.definirQuest({ segundos: dados.segundos, pontos: dados.pontos, acertos: 0 });
    flow.ir("INDICACOES");

    const ref = flow.participantRef;
    if (!ref || modoDemonstracao) return;
    await SyncService.enviar("DESAFIO", ref, { tempoSegundos: dados.segundos });
    void queryClient.invalidateQueries({ queryKey: ["placar"] });
    void queryClient.invalidateQueries({ queryKey: ["ranking"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  /* -------------------------------- Indicações ------------------------------- */

  async function enviarIndicacoes(lista: IndicacaoDados[]) {
    const ref = flow.participantRef;
    setIndicando(true);
    iniciarAvisoLento();
    try {
      if (ref && !modoDemonstracao) {
        for (const indicacao of lista) {
          await SyncService.enviar("INDICACAO", ref, {
            nome: indicacao.nome,
            idade: indicacao.idade,
            responsavelNome: indicacao.responsavelNome,
            whatsapp: indicacao.whatsapp,
          });
        }
      }
      flow.definirIndicacoes(lista.length);
      flow.ir("FINALE");
    } finally {
      setIndicando(false);
      pararAvisoLento();
    }
  }

  /* --------------------------------- Interesse -------------------------------- */

  async function registrarInteresseAula(valor: RespostaAulas) {
    setSalvandoInteresse(true);
    const ref = flow.participantRef;
    if (ref && !modoDemonstracao) {
      await SyncService.enviar("INTERESSE", ref, { interesse: valor });
      void queryClient.invalidateQueries({ queryKey: ["comercial"] });
    }
    setSalvandoInteresse(false);
  }

  const participante = flow.currentParticipant;
  const equipe = flow.currentTeam;

  const resumoPontos = useMemo(
    () =>
      calcularPontuacao({
        participacaoValida: true,
        pontosQuest: flow.questPoints,
        indicacoesValidas: flow.referrals,
      }),
    [flow.questPoints, flow.referrals],
  );

  return (
    <main
      className="relative flex min-h-[100dvh] w-full flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgRoxo})` }}
    >
      {flow.currentStep === "INTRO" ? (
        <IntroScreen onFinish={() => flow.ir("HOME")} />
      ) : (
        <div className="flex w-full flex-1 flex-col">
          {modoTeste ? (
            <div className="fixed left-1/2 top-2 z-40 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-950 shadow-lg">
              Modo Teste Ativo
            </div>
          ) : null}
          <div className="fixed right-3 top-3 z-40 flex items-center gap-2">
            <SoundToggle />
            <MenuBar />
          </div>

          {flow.currentStep === "EQUIPE" ||
          flow.currentStep === "DUPLICADO" ||
          flow.currentStep === "NOME_DUPLICADO" ||
          flow.currentStep === "FINAL" ? (
            <div className="mx-auto w-full max-w-5xl px-4 pt-4">
              <EventHeader equipe={equipe} nome={participante?.nome ?? null} />
            </div>
          ) : null}

          <ScreenTransition chave={flow.currentStep}>
            {flow.currentStep === "HOME" ? (
              <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden">
                {mostrarRanking ? (
                  <div className="mx-auto w-full max-w-5xl shrink-0 px-4 pt-2">
                    <LiveScoreboard
                      linhas={placar.linhas}
                      ganhos={placar.ganhos}
                      carregando={placar.carregando}
                      {...(painelEventos.ativo?.nome
                        ? { titulo: painelEventos.ativo.nome }
                        : {})}
                    />
                  </div>
                ) : null}
                <HomeScreen
                  equipes={equipes}
                  carregando={isLoading}
                  mostrarRanking={mostrarRanking}
                  onStart={() => flow.ir("EQUIPE")}
                />
              </div>
            ) : null}

            {flow.currentStep === "EQUIPE" ? <TeamSelector onSelect={flow.escolherEquipe} /> : null}

            {flow.currentStep === "CADASTRO" && equipe ? (
              <ParticipantForm
                equipe={equipe}
                enviando={registrando}
                avisoConexao={avisoConexao}
                erroServidor={erroServidor}
                onSubmit={(dados) => void enviarCadastro(dados)}
              />
            ) : null}

            {flow.currentStep === "DUPLICADO" ? (
              <DuplicateWarning
                variante="WHATSAPP"
                mensagem={flow.mensagem}
                aluno={participante?.nome ?? null}
                equipe={equipe}
                onProximo={proximoParticipante}
              />
            ) : null}

            {flow.currentStep === "NOME_DUPLICADO" ? (
              <DuplicateWarning
                variante="NOME"
                mensagem={flow.mensagem}
                aluno={participante?.nome ?? null}
                equipe={equipe}
                solicitado={solicitado}
                onSolicitarLiberacao={() => setSolicitado(true)}
                onProximo={proximoParticipante}
              />
            ) : null}

            {flow.currentStep === "CONFIRMACAO" && participante && equipe ? (
              <ParticipantConfirmation
                nome={participante.nome}
                equipe={equipe}
                onContinue={() => flow.ir("HABILIDADE")}
              />
            ) : null}

            {flow.currentStep === "HABILIDADE" && participante && equipe ? (
              <>
                <SkillWheelScreen
                  nome={participante.nome}
                  equipe={equipe}
                  girando={roleta.girando}
                  rotacao={roleta.rotacao}
                  onSpin={roleta.girar}
                />
                {modalHabilidade ? (
                  <QuestIntro
                    skill={modalHabilidade}
                    carregando={carregandoQuest}
                    totalQuestoes={questoesPorParticipacao(
                      modalHabilidade.codigo,
                      faixaEtariaPorIdade(flow.currentParticipant?.idade ?? null),
                    )}
                    aviso={avisoQuest}
                    onStart={() => void iniciarQuest(modalHabilidade)}
                  />
                ) : null}
              </>
            ) : null}

            {flow.currentStep === "DESAFIO" && participante ? (
              <ChallengeLatas
                referencia={flow.participantRef ?? participante.nome}
                onFinish={(dados) => void finalizarDesafio(dados)}
              />
            ) : null}

            {flow.currentStep === "QUEST" && flow.currentSkill && questoes.length > 0 ? (
              <QuestRunner
                skill={flow.currentSkill}
                questoes={questoes}
                onFinish={(resultado, respostas) => void finalizarQuest(resultado, respostas)}
              />
            ) : null}

            {flow.currentStep === "QUEST_RESULTADO" && flow.currentSkill && resultadoQuest ? (
              <QuestResult
                skill={flow.currentSkill}
                resultado={resultadoQuest}
                total={questoes.length || QUEST_TOTAL_QUESTOES}
                salvando={salvandoQuest}
                onContinue={() => flow.ir("INDICACOES")}
              />
            ) : null}

            {flow.currentStep === "INDICACOES" && participante && equipe ? (
              <ReferralSheet
                equipe={equipe}
                nomeAluno={participante.nome}
                whatsappParticipante={participante.responsavelWhatsapp}
                salvando={indicando}
                avisoConexao={avisoConexao}
                onFinish={enviarIndicacoes}
              />
            ) : null}

            {flow.currentStep === "FINALE" && participante && equipe ? (
              <FinaleScreen
                nome={participante.nome}
                equipe={equipe}
                resumo={resumoPontos}
                indicacoes={flow.referrals}
                tempoSegundos={flow.questSeconds}
                posicao={placar.linhas.find((l) => l.equipe === equipe)?.posicao ?? null}
                totalEquipe={placar.linhas.find((l) => l.equipe === equipe)?.pontuacao ?? null}
                salvando={salvandoInteresse}
                onSelect={(valor) => void registrarInteresseAula(valor)}
                onFinish={() => flow.ir("PERFIL")}
              />
            ) : null}

            {flow.currentStep === "PERFIL" && participante ? (
              <SkillProfile
                nome={participante.nome}
                habilidade={flow.currentSkill?.codigo ?? null}
                desempenho={flow.questPoints}
                onContinue={() => flow.ir("FINAL")}
              />
            ) : null}

            {flow.currentStep === "FINAL" && participante && equipe ? (
              <CompletionScreen
                nome={participante.nome}
                equipe={equipe}
                indicacoes={flow.referrals}
                onNext={proximoParticipante}
              />
            ) : null}
          </ScreenTransition>
        </div>
      )}
    </main>
  );
}
