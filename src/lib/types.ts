// Preto ou branco, o que ficar mais legível sobre a cor de fundo dada (hex #rrggbb).
export function corTextoLegivel(corFundo: string): string {
  const hex = corFundo.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? "#000000" : "#ffffff";
}

export type Professora = {
  id: string;
  nome: string;
  cor: string;
  ativa: boolean;
  ordem: number;
  // Coordenação vê funções extras (hoje: alerta de faltas consecutivas)
  // que as demais professoras não veem.
  coordenadora: boolean;
};

export type Aluno = {
  id: string;
  nome: string;
  nivel: string;
  ativo: boolean;
  // Data em que o aluno começou o nível atual — só precisa ser preenchida à mão
  // quando ele já estava no meio desse livro antes de começarmos a lançar
  // lição no site (senão o sistema infere sozinho pela 1ª lição registrada).
  // Usada pelo alerta de "atrasado no calendário pedagógico".
  data_inicio_nivel: string | null;
  data_nascimento: string | null;
};

// Níveis de aluno pré-cadastrados — não é permitido usar outro valor além destes.
export const NIVEIS = [
  "K2",
  "K4",
  "NG",
  "PreT",
  "T2",
  "T4",
  "T6",
  "T8",
  "W2",
  "W4",
  "W6",
  "W8",
  "W10",
  "W12",
  "E2",
  "E4",
  "E6",
  "A2",
  "A4",
  "A6",
  "I2",
  "I4",
  "I6",
  "F2",
  "F4",
  "F6",
  "J2",
  "J4",
  "J6",
  "C2",
  "C4",
  "C6",
  "CONV",
] as const;
export type Nivel = (typeof NIVEIS)[number];

// Primeira letra do nível indica o idioma (fora da trilha de inglês T/W/K/NG/PreT).
const IDIOMA_POR_LETRA: Record<string, string> = {
  E: "Espanhol",
  A: "Alemão",
  I: "Italiano",
  F: "Francês",
  J: "Japonês",
  C: "Chinês",
};

export function idiomaDoNivel(nivel: string): string | null {
  // "CONV" (conversação) começa com C mas não é Chinês — não é uma trilha de
  // idioma com letra-prefixo, é o tipo de aula em si.
  if (nivel === "CONV") return null;
  return IDIOMA_POR_LETRA[nivel.charAt(0)] ?? null;
}

// ============ Calendário escolar (feriados / recessos / férias) ============

export type TipoCalendarioExcecao = "feriado" | "recesso" | "ferias";
export type GrupoCalendario = "todos" | "kids" | "teens" | "adultos";

export const ROTULO_TIPO_CALENDARIO: Record<TipoCalendarioExcecao, string> = {
  feriado: "Feriado",
  recesso: "Recesso",
  ferias: "Férias",
};

export const ROTULO_GRUPO: Record<GrupoCalendario, string> = {
  todos: "Toda a escola",
  kids: "Kids",
  teens: "Teens",
  adultos: "Adultos",
};

export type CalendarioExcecao = {
  id: string;
  data: string;
  tipo: TipoCalendarioExcecao;
  descricao: string;
  grupo: GrupoCalendario;
};

const GRUPO_POR_NIVEL: Record<string, GrupoCalendario> = {
  K2: "kids",
  K4: "kids",
  NG: "kids",
  PreT: "kids",
  T2: "teens",
  T4: "teens",
  T6: "teens",
  T8: "teens",
  W2: "adultos",
  W4: "adultos",
  W6: "adultos",
  W8: "adultos",
  W10: "adultos",
  W12: "adultos",
  CONV: "adultos",
  E2: "adultos",
  E4: "adultos",
  E6: "adultos",
  A2: "adultos",
  A4: "adultos",
  A6: "adultos",
  I2: "adultos",
  I4: "adultos",
  I6: "adultos",
  F2: "adultos",
  F4: "adultos",
  F6: "adultos",
  J2: "adultos",
  J4: "adultos",
  J6: "adultos",
  C2: "adultos",
  C4: "adultos",
  C6: "adultos",
};

export function grupoDoNivel(nivel: string): GrupoCalendario {
  return GRUPO_POR_NIVEL[nivel] ?? "adultos";
}

// Retorna a exceção de calendário (feriado/recesso/férias) que afeta esse
// aluno nessa data, se houver — considerando tanto exceções de "toda a
// escola" quanto as específicas do grupo dele (Kids/Teens/Adultos).
export function excecaoQueAfeta(
  dataIso: string,
  nivel: string,
  excecoes: CalendarioExcecao[],
): CalendarioExcecao | null {
  const grupo = grupoDoNivel(nivel);
  return (
    excecoes.find((e) => e.data === dataIso && (e.grupo === "todos" || e.grupo === grupo)) ?? null
  );
}

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
  vip: 2,
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
  tipo_excecao: "adicionar" | "remover" | "mover" | "ausente";
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
  aluno_nascimento: string | null;
  aluno_avulso: boolean;
  tipo: TipoAula;
  horario_especifico: string | null;
  observacao: string | null;
  // Aluno fixo avisou que não vem só neste dia — mantém o horário fixo, mas
  // libera a vaga pra outro aluno nesse dia específico.
  avisou_falta: boolean;
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

// Cada horário de 1h "Online" vira 3 vagas de 20min (ex: 8h -> 8:00, 8:20, 8:40).
export function slotsOnlinePorPeriodo(periodo: number): string[] {
  const inicio = HORARIO_INICIO_PERIODO[periodo];
  const hora = parseInt(inicio, 10);
  if (Number.isNaN(hora)) return [];
  return [`${hora}:00`, `${hora}:20`, `${hora}:40`];
}

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
export type StatusPresenca = "presente" | "falta" | "falta_avisada";
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

// Alunos de "Aula online" fazem 2 lições no mesmo horário — parte 1 e parte 2.
// Todo outro tipo usa sempre parte 1.
export type PresencaRow = {
  id: string;
  data: string;
  professora_id: string;
  aluno_id: string;
  periodo: number;
  parte: number;
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
  parte: number;
  fala: ConceitoNota | null;
  audicao: ConceitoNota | null;
  leitura: ConceitoNota | null;
  escrita: ConceitoNota | null;
};

export type LicaoRow = {
  id: string;
  data: string;
  professora_id: string;
  aluno_id: string;
  periodo: number;
  parte: number;
  licao: string;
  nivel_no_momento: string;
  // false = aluno só fez o estudo individual, ainda não praticou com a
  // professora — trava a progressão e avisa qualquer professora que o pegar depois.
  praticado: boolean;
};
