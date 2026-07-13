export type Professora = {
  id: string;
  nome: string;
  cor: string;
  ativa: boolean;
  ordem: number;
};

export type Aluno = {
  id: string;
  nome: string;
  nivel: string;
  ativo: boolean;
};

// Tipos de horário (configuração da célula: dia × período × professora)
export type TipoHorario =
  | "regular"
  | "online"
  | "break"
  | "preparacao_homework"
  | "reforco"
  | "vip"
  | "conversacao"
  | "sem_aula";

// Tipos que aceitam alunos matriculados na célula
export type TipoAula = Exclude<TipoHorario, "break" | "preparacao_homework" | "sem_aula">;

export const CAPACIDADE: Record<TipoHorario, number> = {
  regular: 7,
  online: 3,
  vip: 1,
  reforco: 4,
  conversacao: 6,
  break: 0,
  preparacao_homework: 0,
  sem_aula: 0,
};

export const ROTULO_TIPO: Record<TipoHorario, string> = {
  regular: "Aula regular",
  online: "Aula online",
  break: "Break",
  preparacao_homework: "Preparação & Homework",
  reforco: "Reforço",
  vip: "VIP",
  conversacao: "Conversação",
  sem_aula: "Sem aula",
};

export const TIPO_MOSTRA_LIVRO: Record<TipoHorario, boolean> = {
  regular: true,
  online: true,
  vip: true,
  reforco: true,
  conversacao: false,
  break: false,
  preparacao_homework: false,
  sem_aula: false,
};

export const TIPO_FECHADO: Record<TipoHorario, boolean> = {
  regular: false,
  online: false,
  vip: false,
  reforco: false,
  conversacao: false,
  break: true,
  preparacao_homework: true,
  sem_aula: true,
};

// Configuração de uma célula (uma "vaga" por dia+período+professora)
export type HorarioConfig = {
  id: string;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  tipo: TipoHorario;
  tema: string | null;
  vagas_fechadas: number;
};

export type GradeBaseRow = {
  id: string;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  aluno_id: string | null;
  aluno_nome_avulso: string | null;
  tipo: TipoAula;
  horario_especifico: string | null;
  observacao: string | null;
};

export type ExcecaoSemana = {
  id: string;
  data: string;
  tipo_excecao: "adicionar" | "remover" | "mover" | "fechar_vaga";
  grade_base_id: string | null;
  professora_id: string | null;
  aluno_id: string | null;
  aluno_nome_avulso: string | null;
  dia_semana: number | null;
  periodo: number | null;
  tipo: TipoAula | null;
  horario_especifico: string | null;
  observacao: string | null;
};

// Célula computada (aluno ocupando um período)
export type CelulaAula = {
  id: string;
  origem: "base" | "excecao";
  grade_base_id: string | null;
  excecao_id: string | null;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  aluno_id: string | null;
  aluno_nome: string;
  aluno_nivel: string;
  aluno_avulso: boolean;
  tipo: TipoAula;
  horario_especifico: string | null;
  observacao: string | null;
};

export type GradeSemana = {
  professoras: Professora[];
  alunos: Aluno[];
  celulas: CelulaAula[];
  celulasPorData: Record<string, CelulaAula[]>;
  horariosConfig: HorarioConfig[];
  datasSemana: string[];
  // Vagas fechadas só para a semana atual (chave: `${data}-${periodo}-${professora_id}`).
  vagasFechadasSemana: Record<string, number>;
};

export function chaveVagaSemana(data: string, periodo: number, professora_id: string): string {
  return `${data}-${periodo}-${professora_id}`;
}

export const DIAS_SEMANA = [
  { n: 1, nome: "Segunda", curto: "Seg" },
  { n: 2, nome: "Terça", curto: "Ter" },
  { n: 3, nome: "Quarta", curto: "Qua" },
  { n: 4, nome: "Quinta", curto: "Qui" },
  { n: 5, nome: "Sexta", curto: "Sex" },
  { n: 6, nome: "Sábado", curto: "Sáb" },
] as const;

// 8h-12h (períodos 1-4) e 13h-21h (períodos 5-12), de segunda a sexta.
export const PERIODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
// Sábado só funciona de manhã (8h-12h).
export const PERIODOS_SABADO = [1, 2, 3, 4] as const;

export const HORARIO_INICIO_PERIODO: Record<number, string> = {
  1: "8h",
  2: "9h",
  3: "10h",
  4: "11h",
  5: "13h",
  6: "14h",
  7: "15h",
  8: "16h",
  9: "17h",
  10: "18h",
  11: "19h",
  12: "20h",
};

export function periodosDoDia(dia_semana: number): readonly number[] {
  return dia_semana === 6 ? PERIODOS_SABADO : PERIODOS;
}

export function tipoHorarioDe(
  configs: HorarioConfig[],
  dia_semana: number,
  periodo: number,
  professora_id: string,
): TipoHorario {
  return (
    configs.find(
      (c) =>
        c.dia_semana === dia_semana && c.periodo === periodo && c.professora_id === professora_id,
    )?.tipo ?? "regular"
  );
}

export function configDe(
  configs: HorarioConfig[],
  dia_semana: number,
  periodo: number,
  professora_id: string,
): HorarioConfig | null {
  return (
    configs.find(
      (c) =>
        c.dia_semana === dia_semana && c.periodo === periodo && c.professora_id === professora_id,
    ) ?? null
  );
}

// ============ Presença e notas ============
export type StatusPresenca = "presente" | "falta";
export type ConceitoNota = "O" | "MB" | "B" | "R";
export type CampoNota = "fala" | "audicao" | "leitura" | "escrita";

export const CONCEITOS: ConceitoNota[] = ["O", "MB", "B", "R"];
export const CAMPOS_NOTA: { key: CampoNota; label: string }[] = [
  { key: "fala", label: "Fala" },
  { key: "audicao", label: "Audição" },
  { key: "leitura", label: "Leitura" },
  { key: "escrita", label: "Escrita" },
];

// ============ Usuários e papéis ============
export type Papel = "secretaria" | "professor" | "coordenador";

export const PAPEIS: { key: Papel; label: string }[] = [
  { key: "secretaria", label: "Secretaria" },
  { key: "professor", label: "Professor" },
  { key: "coordenador", label: "Coordenador" },
];

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  username: string;
  papeis: Papel[];
  professora_id: string | null;
  ativo: boolean;
};

export type PresencaRow = {
  id: string;
  data: string;
  professora_id: string;
  aluno_id: string;
  periodo: number;
  dia_semana: number;
  status: StatusPresenca;
  observacao: string | null;
};

export type NotaRow = {
  id: string;
  data: string;
  professora_id: string;
  aluno_id: string;
  periodo: number;
  fala: ConceitoNota | null;
  audicao: ConceitoNota | null;
  leitura: ConceitoNota | null;
  escrita: ConceitoNota | null;
};
