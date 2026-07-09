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

export type TipoAula = "regular" | "vip" | "online";
export type TipoBloco = "break" | "preparacao_homework" | "vip";

export type GradeBaseRow = {
  id: string;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  aluno_id: string | null;
  tipo: TipoAula;
  horario_especifico: string | null;
  observacao: string | null;
};

export type BlocoEspecial = {
  id: string;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  tipo: TipoBloco;
  titulo: string;
  aluno_nome_destaque: string | null;
};

export type ExcecaoSemana = {
  id: string;
  data: string;
  tipo_excecao: "adicionar" | "remover" | "mover";
  grade_base_id: string | null;
  professora_id: string | null;
  aluno_id: string | null;
  dia_semana: number | null;
  periodo: number | null;
  tipo: TipoAula | null;
  horario_especifico: string | null;
  observacao: string | null;
};

// Célula computada (aluno ocupando um período)
export type CelulaAula = {
  id: string;                 // id efetivo (grade_base_id ou excecao id)
  origem: "base" | "excecao";
  grade_base_id: string | null;
  excecao_id: string | null;
  dia_semana: number;
  periodo: number;
  professora_id: string;
  aluno_id: string | null;
  aluno_nome: string;
  aluno_nivel: string;
  tipo: TipoAula;
  horario_especifico: string | null;
  observacao: string | null;
};

export type GradeSemana = {
  professoras: Professora[];
  alunos: Aluno[];
  celulas: CelulaAula[];         // todas as aulas efetivas para a semana (por data ISO)
  celulasPorData: Record<string, CelulaAula[]>;
  blocos: BlocoEspecial[];
  datasSemana: string[];         // 6 datas (seg..sáb) ISO yyyy-mm-dd
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

export const MAX_ALUNOS_POR_CELULA = 7;
