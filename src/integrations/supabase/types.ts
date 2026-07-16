export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alertas_status: {
        Row: {
          aluno_id: string;
          contactado_em: string | null;
          contactado_por: string | null;
          contagem: number;
          created_at: string;
          id: string;
          nivel: string | null;
          resolvido_em: string | null;
          resolvido_por: string | null;
          status: string;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          aluno_id: string;
          contactado_em?: string | null;
          contactado_por?: string | null;
          contagem: number;
          created_at?: string;
          id?: string;
          nivel?: string | null;
          resolvido_em?: string | null;
          resolvido_por?: string | null;
          status?: string;
          tipo: string;
          updated_at?: string;
        };
        Update: {
          aluno_id?: string;
          contactado_em?: string | null;
          contactado_por?: string | null;
          contagem?: number;
          created_at?: string;
          id?: string;
          nivel?: string | null;
          resolvido_em?: string | null;
          resolvido_por?: string | null;
          status?: string;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alertas_status_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
        ];
      };
      alunos: {
        Row: {
          ativo: boolean;
          created_at: string;
          data_inicio_nivel: string | null;
          id: string;
          nivel: string;
          nome: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          data_inicio_nivel?: string | null;
          id?: string;
          nivel?: string;
          nome: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          data_inicio_nivel?: string | null;
          id?: string;
          nivel?: string;
          nome?: string;
        };
        Relationships: [];
      };
      aulas_notas: {
        Row: {
          aluno_id: string;
          audicao: string | null;
          created_at: string;
          data: string;
          escrita: string | null;
          fala: string | null;
          id: string;
          leitura: string | null;
          parte: number;
          periodo: number;
          professora_id: string;
          updated_at: string;
        };
        Insert: {
          aluno_id: string;
          audicao?: string | null;
          created_at?: string;
          data: string;
          escrita?: string | null;
          fala?: string | null;
          id?: string;
          leitura?: string | null;
          parte?: number;
          periodo: number;
          professora_id: string;
          updated_at?: string;
        };
        Update: {
          aluno_id?: string;
          audicao?: string | null;
          created_at?: string;
          data?: string;
          escrita?: string | null;
          fala?: string | null;
          id?: string;
          leitura?: string | null;
          parte?: number;
          periodo?: number;
          professora_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aulas_notas_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aulas_notas_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      aulas_presenca: {
        Row: {
          aluno_id: string;
          created_at: string;
          data: string;
          dia_semana: number;
          id: string;
          observacao: string | null;
          parte: number;
          periodo: number;
          professora_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          aluno_id: string;
          created_at?: string;
          data: string;
          dia_semana: number;
          id?: string;
          observacao?: string | null;
          parte?: number;
          periodo: number;
          professora_id: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          aluno_id?: string;
          created_at?: string;
          data?: string;
          dia_semana?: number;
          id?: string;
          observacao?: string | null;
          parte?: number;
          periodo?: number;
          professora_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aulas_presenca_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aulas_presenca_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      aulas_licoes: {
        Row: {
          aluno_id: string;
          created_at: string;
          data: string;
          id: string;
          licao: string;
          nivel_no_momento: string;
          parte: number;
          periodo: number;
          praticado: boolean;
          professora_id: string;
          updated_at: string;
        };
        Insert: {
          aluno_id: string;
          created_at?: string;
          data: string;
          id?: string;
          licao: string;
          nivel_no_momento: string;
          parte?: number;
          periodo: number;
          praticado?: boolean;
          professora_id: string;
          updated_at?: string;
        };
        Update: {
          aluno_id?: string;
          created_at?: string;
          data?: string;
          id?: string;
          licao?: string;
          nivel_no_momento?: string;
          parte?: number;
          periodo?: number;
          praticado?: boolean;
          professora_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aulas_licoes_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aulas_licoes_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      excecoes_semana: {
        Row: {
          aluno_id: string | null;
          aluno_nome_avulso: string | null;
          created_at: string;
          data: string;
          dia_semana: number | null;
          grade_base_id: string | null;
          horario_especifico: string | null;
          id: string;
          observacao: string | null;
          periodo: number | null;
          professora_id: string | null;
          tipo: string | null;
          tipo_excecao: string;
        };
        Insert: {
          aluno_id?: string | null;
          aluno_nome_avulso?: string | null;
          created_at?: string;
          data: string;
          dia_semana?: number | null;
          grade_base_id?: string | null;
          horario_especifico?: string | null;
          id?: string;
          observacao?: string | null;
          periodo?: number | null;
          professora_id?: string | null;
          tipo?: string | null;
          tipo_excecao: string;
        };
        Update: {
          aluno_id?: string | null;
          aluno_nome_avulso?: string | null;
          created_at?: string;
          data?: string;
          dia_semana?: number | null;
          grade_base_id?: string | null;
          horario_especifico?: string | null;
          id?: string;
          observacao?: string | null;
          periodo?: number | null;
          professora_id?: string | null;
          tipo?: string | null;
          tipo_excecao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "excecoes_semana_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "excecoes_semana_grade_base_id_fkey";
            columns: ["grade_base_id"];
            isOneToOne: false;
            referencedRelation: "grade_base";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "excecoes_semana_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      grade_base: {
        Row: {
          aluno_id: string | null;
          aluno_nome_avulso: string | null;
          created_at: string;
          dia_semana: number;
          horario_especifico: string | null;
          id: string;
          observacao: string | null;
          periodo: number;
          professora_id: string;
          tipo: string;
        };
        Insert: {
          aluno_id?: string | null;
          aluno_nome_avulso?: string | null;
          created_at?: string;
          dia_semana: number;
          horario_especifico?: string | null;
          id?: string;
          observacao?: string | null;
          periodo: number;
          professora_id: string;
          tipo?: string;
        };
        Update: {
          aluno_id?: string | null;
          aluno_nome_avulso?: string | null;
          created_at?: string;
          dia_semana?: number;
          horario_especifico?: string | null;
          id?: string;
          observacao?: string | null;
          periodo?: number;
          professora_id?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grade_base_aluno_id_fkey";
            columns: ["aluno_id"];
            isOneToOne: false;
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grade_base_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      horarios_config: {
        Row: {
          created_at: string;
          dia_semana: number;
          id: string;
          periodo: number;
          professora_id: string;
          tema: string | null;
          tipo: string;
          vagas_fechadas: number;
        };
        Insert: {
          created_at?: string;
          dia_semana: number;
          id?: string;
          periodo: number;
          professora_id: string;
          tema?: string | null;
          tipo?: string;
          vagas_fechadas?: number;
        };
        Update: {
          created_at?: string;
          dia_semana?: number;
          id?: string;
          periodo?: number;
          professora_id?: string;
          tema?: string | null;
          tipo?: string;
          vagas_fechadas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "horarios_config_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: false;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          nome: string;
          professora_id: string | null;
          senha_hash: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome: string;
          professora_id?: string | null;
          senha_hash: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome?: string;
          professora_id?: string | null;
          senha_hash?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usuarios_professora_id_fkey";
            columns: ["professora_id"];
            isOneToOne: true;
            referencedRelation: "professoras";
            referencedColumns: ["id"];
          },
        ];
      };
      usuario_papeis: {
        Row: {
          id: string;
          papel: string;
          usuario_id: string;
        };
        Insert: {
          id?: string;
          papel: string;
          usuario_id: string;
        };
        Update: {
          id?: string;
          papel?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usuario_papeis_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      professoras: {
        Row: {
          ativa: boolean;
          coordenadora: boolean;
          cor: string;
          created_at: string;
          id: string;
          nome: string;
          ordem: number;
        };
        Insert: {
          ativa?: boolean;
          coordenadora?: boolean;
          cor?: string;
          created_at?: string;
          id?: string;
          nome: string;
          ordem?: number;
        };
        Update: {
          ativa?: boolean;
          coordenadora?: boolean;
          cor?: string;
          created_at?: string;
          id?: string;
          nome?: string;
          ordem?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
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
    Enums: {},
  },
} as const;
