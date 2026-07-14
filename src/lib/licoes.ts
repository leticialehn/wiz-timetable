import type { Nivel } from "./types";

// Em que lição global (contando desde o início da trilha) cada nível começa.
// Independentes (K2, K4, NG, PreT) sempre começam do zero.
// Trilhas contínuas (T, W, E, A, I) somam 60 lições a cada nível seguinte.
export const BLOCO_INICIO: Partial<Record<Nivel, number>> = {
  K2: 1,
  K4: 1,
  NG: 1,
  PreT: 1,
  T2: 1,
  T4: 61,
  T6: 121,
  T8: 181,
  W2: 1,
  W4: 61,
  W6: 121,
  W8: 181,
  W10: 241,
  W12: 301,
  E2: 1,
  E4: 61,
  E6: 121,
  A2: 1,
  A4: 61,
  A6: 121,
  I2: 1,
  I4: 61,
  I6: 121,
  // CONV ausente: conversação não tem lição.
};

// Cada bloco de 60 lições tem 10 revisões (uma a cada 6 lições), sempre
// numeradas R1..R10 dentro do próprio bloco (não continuam entre níveis).
const LICOES_POR_CICLO = 6;
const CICLOS_POR_BLOCO = 10;
const POSICOES_POR_BLOCO = CICLOS_POR_BLOCO * (LICOES_POR_CICLO + 1); // 70

export function temTrackingDeLicao(nivel: string): boolean {
  return BLOCO_INICIO[nivel as Nivel] !== undefined;
}

// posNoBloco: posição de 1 a 70 dentro do bloco de 60 lições do nível.
function labelDaPosicao(posNoBloco: number, blockStart: number): string {
  const cicloIndex = Math.floor((posNoBloco - 1) / (LICOES_POR_CICLO + 1));
  const offset = (posNoBloco - 1) % (LICOES_POR_CICLO + 1);
  if (offset < LICOES_POR_CICLO) {
    const licaoNoBloco = cicloIndex * LICOES_POR_CICLO + offset + 1;
    return `L${blockStart + licaoNoBloco - 1}`;
  }
  return `R${cicloIndex + 1}`;
}

function posicaoDoLabel(label: string, blockStart: number): number | null {
  const mL = /^L(\d+)$/.exec(label);
  if (mL) {
    const licaoGlobal = parseInt(mL[1], 10);
    const licaoNoBloco = licaoGlobal - blockStart + 1;
    if (licaoNoBloco < 1 || licaoNoBloco > 60) return null;
    const cicloIndex = Math.floor((licaoNoBloco - 1) / LICOES_POR_CICLO);
    const offset = (licaoNoBloco - 1) % LICOES_POR_CICLO;
    return cicloIndex * (LICOES_POR_CICLO + 1) + offset + 1;
  }
  const mR = /^R(\d+)$/.exec(label);
  if (mR) {
    const revisao = parseInt(mR[1], 10);
    if (revisao < 1 || revisao > CICLOS_POR_BLOCO) return null;
    return revisao * (LICOES_POR_CICLO + 1);
  }
  return null;
}

// Calcula a lição sugerida para hoje, a partir do nível atual do aluno e do
// último registro de lição dele (de qualquer data anterior).
export function licaoSugerida(
  nivelAtual: string,
  ultimo: { licao: string; nivel_no_momento: string } | null,
): string {
  const blockStart = BLOCO_INICIO[nivelAtual as Nivel];
  if (blockStart === undefined) return "";
  if (!ultimo) return "";
  if (ultimo.nivel_no_momento !== nivelAtual) {
    // Mudou de nível: começa do zero na trilha nova, sem precisar de lançamento manual.
    return labelDaPosicao(1, blockStart);
  }
  const posAnterior = posicaoDoLabel(ultimo.licao, blockStart);
  if (posAnterior === null) {
    // Valor anterior não era L/R reconhecido (HW, Extra, repetição) — repete.
    return ultimo.licao;
  }
  if (posAnterior >= POSICOES_POR_BLOCO) return ultimo.licao;
  return labelDaPosicao(posAnterior + 1, blockStart);
}
