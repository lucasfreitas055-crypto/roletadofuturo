export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      auditoria: {
        Row: {
          created_at: string;
          descricao: string;
          id: string;
          metadata: Json;
          participante_id: string | null;
          tipo: Database["public"]["Enums"]["tipo_auditoria"];
          usuario: string | null;
        };
        Insert: {
          created_at?: string;
          descricao: string;
          id?: string;
          metadata?: Json;
          participante_id?: string | null;
          tipo: Database["public"]["Enums"]["tipo_auditoria"];
          usuario?: string | null;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          id?: string;
          metadata?: Json;
          participante_id?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_auditoria"];
          usuario?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "auditoria_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "participantes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auditoria_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "vw_pontuacao_participante";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracoes: {
        Row: {
          campanha: string;
          escola: string;
          evento_teste_id: string | null;
          id: boolean;
          logo_url: string | null;
          modo: string;
          mostrar_ranking: boolean;
          texto_abertura: string;
          texto_finalizacao: string;
          updated_at: string;
        };
        Insert: {
          campanha?: string;
          escola?: string;
          evento_teste_id?: string | null;
          id?: boolean;
          logo_url?: string | null;
          modo?: string;
          mostrar_ranking?: boolean;
          texto_abertura?: string;
          texto_finalizacao?: string;
          updated_at?: string;
        };
        Update: {
          campanha?: string;
          escola?: string;
          evento_teste_id?: string | null;
          id?: boolean;
          logo_url?: string | null;
          modo?: string;
          mostrar_ranking?: boolean;
          texto_abertura?: string;
          texto_finalizacao?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "configuracoes_evento_teste_id_fkey";
            columns: ["evento_teste_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_historico: {
        Row: {
          created_at: string;
          id: string;
          observacao: string | null;
          participante_id: string;
          status_anterior: Database["public"]["Enums"]["status_comercial"] | null;
          status_novo: Database["public"]["Enums"]["status_comercial"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          observacao?: string | null;
          participante_id: string;
          status_anterior?: Database["public"]["Enums"]["status_comercial"] | null;
          status_novo: Database["public"]["Enums"]["status_comercial"];
        };
        Update: {
          created_at?: string;
          id?: string;
          observacao?: string | null;
          participante_id?: string;
          status_anterior?: Database["public"]["Enums"]["status_comercial"] | null;
          status_novo?: Database["public"]["Enums"]["status_comercial"];
        };
        Relationships: [
          {
            foreignKeyName: "crm_historico_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "participantes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_historico_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "vw_pontuacao_participante";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_leads: {
        Row: {
          created_at: string;
          observacoes: string;
          participante_id: string;
          status: Database["public"]["Enums"]["status_comercial"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          observacoes?: string;
          participante_id: string;
          status?: Database["public"]["Enums"]["status_comercial"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          observacoes?: string;
          participante_id?: string;
          status?: Database["public"]["Enums"]["status_comercial"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_leads_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: true;
            referencedRelation: "participantes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_leads_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: true;
            referencedRelation: "vw_pontuacao_participante";
            referencedColumns: ["id"];
          },
        ];
      };
      equipes: {
        Row: {
          codigo: Database["public"]["Enums"]["equipe_tipo"];
          cor_hex: string;
          nome: string;
          ordem: number;
        };
        Insert: {
          codigo: Database["public"]["Enums"]["equipe_tipo"];
          cor_hex: string;
          nome: string;
          ordem?: number;
        };
        Update: {
          codigo?: Database["public"]["Enums"]["equipe_tipo"];
          cor_hex?: string;
          nome?: string;
          ordem?: number;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          arquivo: Json;
          created_at: string;
          encerrado_em: string | null;
          expurgo_em: string | null;
          id: string;
          iniciado_em: string;
          lixeira_em: string | null;
          nome: string;
          numero: number;
          participantes_total: number;
          pontos_total: number;
          resumo: Json;
          status: string;
          updated_at: string;
        };
        Insert: {
          arquivo?: Json;
          created_at?: string;
          encerrado_em?: string | null;
          expurgo_em?: string | null;
          id?: string;
          iniciado_em?: string;
          lixeira_em?: string | null;
          nome: string;
          numero: number;
          participantes_total?: number;
          pontos_total?: number;
          resumo?: Json;
          status?: string;
          updated_at?: string;
        };
        Update: {
          arquivo?: Json;
          created_at?: string;
          encerrado_em?: string | null;
          expurgo_em?: string | null;
          id?: string;
          iniciado_em?: string;
          lixeira_em?: string | null;
          nome?: string;
          numero?: number;
          participantes_total?: number;
          pontos_total?: number;
          resumo?: Json;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      eventos_logs: {
        Row: {
          acao: string;
          created_at: string;
          detalhes: Json;
          evento_id: string | null;
          id: string;
          participantes: number;
          pontos: number;
          usuario: string;
        };
        Insert: {
          acao: string;
          created_at?: string;
          detalhes?: Json;
          evento_id?: string | null;
          id?: string;
          participantes?: number;
          pontos?: number;
          usuario?: string;
        };
        Update: {
          acao?: string;
          created_at?: string;
          detalhes?: Json;
          evento_id?: string | null;
          id?: string;
          participantes?: number;
          pontos?: number;
          usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_logs_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_resets: {
        Row: {
          created_at: string;
          dump: Json;
          evento_id: string;
          id: string;
          indicacoes_antes: number;
          participantes_antes: number;
          pontos_antes: number;
          restaurado_em: string | null;
          usuario: string;
        };
        Insert: {
          created_at?: string;
          dump?: Json;
          evento_id: string;
          id?: string;
          indicacoes_antes?: number;
          participantes_antes?: number;
          pontos_antes?: number;
          restaurado_em?: string | null;
          usuario?: string;
        };
        Update: {
          created_at?: string;
          dump?: Json;
          evento_id?: string;
          id?: string;
          indicacoes_antes?: number;
          participantes_antes?: number;
          pontos_antes?: number;
          restaurado_em?: string | null;
          usuario?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_resets_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      indicacoes: {
        Row: {
          created_at: string;
          evento_id: string | null;
          id: string;
          idade: number | null;
          invalidada_manualmente: boolean;
          motivo_invalidacao: string | null;
          nome: string;
          nome_normalizado: string;
          participante_id: string;
          responsavel_nome: string | null;
          status: Database["public"]["Enums"]["status_indicacao"];
          whatsapp: string;
          whatsapp_normalizado: string;
        };
        Insert: {
          created_at?: string;
          evento_id?: string | null;
          id?: string;
          idade?: number | null;
          invalidada_manualmente?: boolean;
          motivo_invalidacao?: string | null;
          nome: string;
          nome_normalizado: string;
          participante_id: string;
          responsavel_nome?: string | null;
          status?: Database["public"]["Enums"]["status_indicacao"];
          whatsapp: string;
          whatsapp_normalizado: string;
        };
        Update: {
          created_at?: string;
          evento_id?: string | null;
          id?: string;
          idade?: number | null;
          invalidada_manualmente?: boolean;
          motivo_invalidacao?: string | null;
          nome?: string;
          nome_normalizado?: string;
          participante_id?: string;
          responsavel_nome?: string | null;
          status?: Database["public"]["Enums"]["status_indicacao"];
          whatsapp?: string;
          whatsapp_normalizado?: string;
        };
        Relationships: [
          {
            foreignKeyName: "indicacoes_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "indicacoes_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "participantes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "indicacoes_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "vw_pontuacao_participante";
            referencedColumns: ["id"];
          },
        ];
      };
      participantes: {
        Row: {
          created_at: string;
          equipe: Database["public"]["Enums"]["equipe_tipo"];
          evento_id: string | null;
          faixa_etaria: number | null;
          habilidade_sorteada: Database["public"]["Enums"]["habilidade_tipo"] | null;
          horario_fim_missao: string | null;
          horario_inicio_missao: string | null;
          id: string;
          idade_aluno: number | null;
          interesse_matricula: Database["public"]["Enums"]["interesse_matricula_tipo"] | null;
          ip: string | null;
          liberado_por: string | null;
          mini_desafio_acertou: boolean | null;
          mini_desafio_id: string | null;
          missao_concluida: boolean;
          nome: string;
          nome_normalizado: string;
          participacao_valida: boolean;
          participation_score: number;
          pontos_missao: number;
          possivel_duplicidade: boolean;
          premio_id: string | null;
          premio_nome: string | null;
          quantidade_indicacoes: number;
          quest_accuracy_factor: number;
          quest_acertos: number;
          quest_erros: number;
          quest_fim: string | null;
          quest_inicio: string | null;
          quest_nao_respondidas: number;
          quest_score: number;
          quest_speed_factor: number;
          quest_tempo_segundos: number | null;
          referral_score: number;
          responsavel_nome: string;
          responsavel_whatsapp: string;
          responsavel_whatsapp_normalizado: string;
          status_lead: Database["public"]["Enums"]["status_lead"];
          status_premio: Database["public"]["Enums"]["status_premio"];
          tempo_missao_segundos: number | null;
          total_score: number;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          equipe: Database["public"]["Enums"]["equipe_tipo"];
          evento_id?: string | null;
          faixa_etaria?: number | null;
          habilidade_sorteada?: Database["public"]["Enums"]["habilidade_tipo"] | null;
          horario_fim_missao?: string | null;
          horario_inicio_missao?: string | null;
          id?: string;
          idade_aluno?: number | null;
          interesse_matricula?: Database["public"]["Enums"]["interesse_matricula_tipo"] | null;
          ip?: string | null;
          liberado_por?: string | null;
          mini_desafio_acertou?: boolean | null;
          mini_desafio_id?: string | null;
          missao_concluida?: boolean;
          nome: string;
          nome_normalizado: string;
          participacao_valida?: boolean;
          participation_score?: number;
          pontos_missao?: number;
          possivel_duplicidade?: boolean;
          premio_id?: string | null;
          premio_nome?: string | null;
          quantidade_indicacoes?: number;
          quest_accuracy_factor?: number;
          quest_acertos?: number;
          quest_erros?: number;
          quest_fim?: string | null;
          quest_inicio?: string | null;
          quest_nao_respondidas?: number;
          quest_score?: number;
          quest_speed_factor?: number;
          quest_tempo_segundos?: number | null;
          referral_score?: number;
          responsavel_nome: string;
          responsavel_whatsapp: string;
          responsavel_whatsapp_normalizado: string;
          status_lead?: Database["public"]["Enums"]["status_lead"];
          status_premio?: Database["public"]["Enums"]["status_premio"];
          tempo_missao_segundos?: number | null;
          total_score?: number;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          equipe?: Database["public"]["Enums"]["equipe_tipo"];
          evento_id?: string | null;
          faixa_etaria?: number | null;
          habilidade_sorteada?: Database["public"]["Enums"]["habilidade_tipo"] | null;
          horario_fim_missao?: string | null;
          horario_inicio_missao?: string | null;
          id?: string;
          idade_aluno?: number | null;
          interesse_matricula?: Database["public"]["Enums"]["interesse_matricula_tipo"] | null;
          ip?: string | null;
          liberado_por?: string | null;
          mini_desafio_acertou?: boolean | null;
          mini_desafio_id?: string | null;
          missao_concluida?: boolean;
          nome?: string;
          nome_normalizado?: string;
          participacao_valida?: boolean;
          participation_score?: number;
          pontos_missao?: number;
          possivel_duplicidade?: boolean;
          premio_id?: string | null;
          premio_nome?: string | null;
          quantidade_indicacoes?: number;
          quest_accuracy_factor?: number;
          quest_acertos?: number;
          quest_erros?: number;
          quest_fim?: string | null;
          quest_inicio?: string | null;
          quest_nao_respondidas?: number;
          quest_score?: number;
          quest_speed_factor?: number;
          quest_tempo_segundos?: number | null;
          referral_score?: number;
          responsavel_nome?: string;
          responsavel_whatsapp?: string;
          responsavel_whatsapp_normalizado?: string;
          status_lead?: Database["public"]["Enums"]["status_lead"];
          status_premio?: Database["public"]["Enums"]["status_premio"];
          tempo_missao_segundos?: number | null;
          total_score?: number;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["codigo"];
          },
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "vw_ranking_equipes";
            referencedColumns: ["equipe"];
          },
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "vw_ranking_pontuacao";
            referencedColumns: ["equipe"];
          },
          {
            foreignKeyName: "participantes_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participantes_premio_id_fkey";
            columns: ["premio_id"];
            isOneToOne: false;
            referencedRelation: "premios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "participantes_premio_id_fkey";
            columns: ["premio_id"];
            isOneToOne: false;
            referencedRelation: "vw_participantes_por_premio";
            referencedColumns: ["premio_id"];
          },
        ];
      };
      premios: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          nome: string;
          ordem: number;
          probabilidade: number;
          quantidade_disponivel: number | null;
          quantidade_indicacoes_exigidas: number;
          quantidade_utilizada: number;
          tipo: Database["public"]["Enums"]["premio_tipo"];
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome: string;
          ordem?: number;
          probabilidade?: number;
          quantidade_disponivel?: number | null;
          quantidade_indicacoes_exigidas?: number;
          quantidade_utilizada?: number;
          tipo?: Database["public"]["Enums"]["premio_tipo"];
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome?: string;
          ordem?: number;
          probabilidade?: number;
          quantidade_disponivel?: number | null;
          quantidade_indicacoes_exigidas?: number;
          quantidade_utilizada?: number;
          tipo?: Database["public"]["Enums"]["premio_tipo"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          nome: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          nome?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          nome?: string | null;
        };
        Relationships: [];
      };
      quest_respostas: {
        Row: {
          alternativa_selecionada: string | null;
          correta: boolean;
          created_at: string;
          id: string;
          ordem: number;
          participante_id: string;
          questao_id: string;
          resposta_correta: string;
          tempo_segundos: number;
        };
        Insert: {
          alternativa_selecionada?: string | null;
          correta?: boolean;
          created_at?: string;
          id?: string;
          ordem: number;
          participante_id: string;
          questao_id: string;
          resposta_correta: string;
          tempo_segundos?: number;
        };
        Update: {
          alternativa_selecionada?: string | null;
          correta?: boolean;
          created_at?: string;
          id?: string;
          ordem?: number;
          participante_id?: string;
          questao_id?: string;
          resposta_correta?: string;
          tempo_segundos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quest_respostas_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "participantes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quest_respostas_participante_id_fkey";
            columns: ["participante_id"];
            isOneToOne: false;
            referencedRelation: "vw_pontuacao_participante";
            referencedColumns: ["id"];
          },
        ];
      };
      questoes: {
        Row: {
          alternativa_a: string;
          alternativa_b: string;
          alternativa_c: string;
          alternativa_d: string;
          alternativa_e: string;
          ativo: boolean;
          created_at: string;
          dificuldade: number;
          enunciado: string;
          explicacao_curta: string | null;
          faixa_etaria: number;
          habilidade: Database["public"]["Enums"]["habilidade_tipo"];
          id: string;
          imagem: string | null;
          resposta_correta: string;
        };
        Insert: {
          alternativa_a: string;
          alternativa_b: string;
          alternativa_c: string;
          alternativa_d: string;
          alternativa_e: string;
          ativo?: boolean;
          created_at?: string;
          dificuldade?: number;
          enunciado: string;
          explicacao_curta?: string | null;
          faixa_etaria: number;
          habilidade: Database["public"]["Enums"]["habilidade_tipo"];
          id: string;
          imagem?: string | null;
          resposta_correta: string;
        };
        Update: {
          alternativa_a?: string;
          alternativa_b?: string;
          alternativa_c?: string;
          alternativa_d?: string;
          alternativa_e?: string;
          ativo?: boolean;
          created_at?: string;
          dificuldade?: number;
          enunciado?: string;
          explicacao_curta?: string | null;
          faixa_etaria?: number;
          habilidade?: Database["public"]["Enums"]["habilidade_tipo"];
          id?: string;
          imagem?: string | null;
          resposta_correta?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      vw_distribuicao_habilidades: {
        Row: {
          habilidade: Database["public"]["Enums"]["habilidade_tipo"] | null;
          total: number | null;
        };
        Relationships: [];
      };
      vw_estatisticas_diarias: {
        Row: {
          data: string | null;
          indicacoes: number | null;
          participantes: number | null;
          pontuacao: number | null;
        };
        Relationships: [];
      };
      vw_participantes_por_dia: {
        Row: {
          dia: string | null;
          total_registros: number | null;
          total_validos: number | null;
        };
        Relationships: [];
      };
      vw_participantes_por_premio: {
        Row: {
          premio_id: string | null;
          premio_nome: string | null;
          tipo: Database["public"]["Enums"]["premio_tipo"] | null;
          total: number | null;
        };
        Relationships: [];
      };
      vw_participantes_por_status: {
        Row: {
          status_lead: Database["public"]["Enums"]["status_lead"] | null;
          status_premio: Database["public"]["Enums"]["status_premio"] | null;
          total: number | null;
        };
        Relationships: [];
      };
      vw_pontuacao_participante: {
        Row: {
          created_at: string | null;
          equipe: Database["public"]["Enums"]["equipe_tipo"] | null;
          evento_id: string | null;
          faixa_etaria: number | null;
          habilidade_sorteada: Database["public"]["Enums"]["habilidade_tipo"] | null;
          id: string | null;
          idade_aluno: number | null;
          indicacoes_validas: number | null;
          interesse_matricula: Database["public"]["Enums"]["interesse_matricula_tipo"] | null;
          nome: string | null;
          pontos_indicacoes: number | null;
          pontos_missao: number | null;
          pontos_participacao: number | null;
          pontos_quest: number | null;
          pontos_total: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "equipes";
            referencedColumns: ["codigo"];
          },
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "vw_ranking_equipes";
            referencedColumns: ["equipe"];
          },
          {
            foreignKeyName: "participantes_equipe_fkey";
            columns: ["equipe"];
            isOneToOne: false;
            referencedRelation: "vw_ranking_pontuacao";
            referencedColumns: ["equipe"];
          },
          {
            foreignKeyName: "participantes_evento_id_fkey";
            columns: ["evento_id"];
            isOneToOne: false;
            referencedRelation: "eventos";
            referencedColumns: ["id"];
          },
        ];
      };
      vw_ranking_equipes: {
        Row: {
          cor_hex: string | null;
          equipe: Database["public"]["Enums"]["equipe_tipo"] | null;
          nome: string | null;
          posicao: number | null;
          total_participantes: number | null;
        };
        Relationships: [];
      };
      vw_ranking_pontuacao: {
        Row: {
          cor_hex: string | null;
          equipe: Database["public"]["Enums"]["equipe_tipo"] | null;
          indicacoes_validas: number | null;
          nome: string | null;
          participantes: number | null;
          pontos_missao: number | null;
          pontos_quest: number | null;
          pontuacao: number | null;
        };
        Relationships: [];
      };
      vw_resumo_dashboard: {
        Row: {
          equipe_lider: Database["public"]["Enums"]["equipe_tipo"] | null;
          total_brindes: number | null;
          total_descontos: number | null;
          total_indicacoes: number | null;
          total_participantes: number | null;
          total_possiveis_duplicidades: number | null;
          total_registros: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      evento_ativo_id: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      normalizar_nome: { Args: { _valor: string }; Returns: string };
      normalizar_telefone: { Args: { _valor: string }; Returns: string };
      recalcular_status_premio: {
        Args: { _participante_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      equipe_tipo: "AZUL" | "VERDE" | "AMARELA";
      habilidade_tipo:
        | "INGLES"
        | "LIDERANCA"
        | "EMPREENDEDORISMO"
        | "EDUCACAO_FINANCEIRA"
        | "INTELIGENCIA_EMOCIONAL";
      interesse_matricula_tipo: "SIM" | "QUERO_SABER_MAIS" | "TALVEZ_DEPOIS" | "NAO";
      premio_tipo: "BRINDE" | "DESCONTO";
      status_comercial:
        | "NOVO"
        | "PRIMEIRO_CONTATO"
        | "AULA_AGENDADA"
        | "COMPARECEU"
        | "MATRICULADO"
        | "RETORNAR"
        | "SEM_INTERESSE";
      status_indicacao: "PENDENTE" | "VALIDADA" | "INVALIDA";
      status_lead: "NOVO" | "CONTATADO" | "AGENDADO" | "MATRICULADO" | "NAO_CONVERTEU";
      status_premio: "PENDENTE" | "DESBLOQUEADO" | "RESGATADO";
      tipo_auditoria:
        | "PARTICIPACAO_CRIADA"
        | "PARTICIPACAO_BLOQUEADA"
        | "TENTATIVA_DUPLICADA"
        | "TENTATIVA_FRAUDE"
        | "POSSIVEL_DUPLICIDADE"
        | "ALTERACAO_MANUAL"
        | "CORRECAO_EQUIPE"
        | "PREMIO_ALTERADO"
        | "EXCLUSAO"
        | "AUTORIZACAO_ADMIN"
        | "INDICACAO_CRIADA"
        | "LOGIN_ADMIN";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      equipe_tipo: ["AZUL", "VERDE", "AMARELA"],
      habilidade_tipo: [
        "INGLES",
        "LIDERANCA",
        "EMPREENDEDORISMO",
        "EDUCACAO_FINANCEIRA",
        "INTELIGENCIA_EMOCIONAL",
      ],
      interesse_matricula_tipo: ["SIM", "QUERO_SABER_MAIS", "TALVEZ_DEPOIS", "NAO"],
      premio_tipo: ["BRINDE", "DESCONTO"],
      status_comercial: [
        "NOVO",
        "PRIMEIRO_CONTATO",
        "AULA_AGENDADA",
        "COMPARECEU",
        "MATRICULADO",
        "RETORNAR",
        "SEM_INTERESSE",
      ],
      status_indicacao: ["PENDENTE", "VALIDADA", "INVALIDA"],
      status_lead: ["NOVO", "CONTATADO", "AGENDADO", "MATRICULADO", "NAO_CONVERTEU"],
      status_premio: ["PENDENTE", "DESBLOQUEADO", "RESGATADO"],
      tipo_auditoria: [
        "PARTICIPACAO_CRIADA",
        "PARTICIPACAO_BLOQUEADA",
        "TENTATIVA_DUPLICADA",
        "TENTATIVA_FRAUDE",
        "POSSIVEL_DUPLICIDADE",
        "ALTERACAO_MANUAL",
        "CORRECAO_EQUIPE",
        "PREMIO_ALTERADO",
        "EXCLUSAO",
        "AUTORIZACAO_ADMIN",
        "INDICACAO_CRIADA",
        "LOGIN_ADMIN",
      ],
    },
  },
} as const;
