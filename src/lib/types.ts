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
  | "conversacao";

// Tipos que aceitam alunos matriculados na célula
export type TipoAula = Exclude<TipoHorario, "break" | "preparacao_homework">;

export const CAPACIDADE: Record<TipoHorario, number> = {
  regular: 7,
  online: 3,
  vip: 1,
  reforco: 4,
  conversacao: 6,
  break: 0,
  preparacao_homework: 0,
};

export const ROTULO_TIPO: Record<TipoHorario, string> = {
  regular: "Aula regular",
  online: "Aula online",
  break: "Break",
  preparacao_homework: "Preparação & Homework",
  reforco: "Reforço",
  vip: "VIP",
  conversacao: "Conversação",
};

export const TIPO_MOSTRA_LIVRO: Record<TipoHorario, boolean> = {
  regular: true,
  online: true,
  vip: true,
  reforco: true,
  conversacao: false,
  break: false,
  preparacao_homework: false,
};

export const TIPO_FECHADO: Record<TipoHorario, boolean> = {
  regular: false,
  online: false,
  vip: false,
  reforco: false,
  conversacao: false,
  break: true,
  preparacao_homework: true,
};

// Configuração de uma célula (uma "vaga" por dia+período+professora)
export type HorarioConfig = {
  id: string;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  tipo: TipoHorario;
  tema: string | null;
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
  tipo_excecao: "adicionar" | "remover" | "mover";
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
};

export const DIAS_SEMANA = [
  { n: 1, nome: "Segunda", curto: "Seg" },
  { n: 2, nome: "Terça", curto: "Ter" },
  { n: 3, nome: "Quarta", curto: "Qua" },
  { n: 4, nome: "Quinta", curto: "Qui" },
  { n: 5, nome: "Sexta", curto: "Sex" },
  { n: 6, nome: "Sábado", curto: "Sáb" },
] as const;

export const PERIODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function tipoHorarioDe(
  configs: HorarioConfig[],
  dia_semana: number,
  periodo: number,
  professora_id: string,
): TipoHorario {
  return (
    configs.find(
      (c) => c.dia_semana === dia_semana && c.periodo === periodo && c.professora_id === professora_id,
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
      (c) => c.dia_semana === dia_semana && c.periodo === periodo && c.professora_id === professora_id,
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

