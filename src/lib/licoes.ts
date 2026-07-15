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

// Aceita variações de digitação (l23, R 4, l 5) e converte pro formato
// padrão (L23, R4). O que não parece lição/revisão (HW, Extra…) passa direto.
export function normalizarLicao(valor: string): string {
  const m = /^\s*([lr])\s*(\d+)\s*$/i.exec(valor);
  if (!m) return valor;
  return `${m[1].toUpperCase()}${m[2]}`;
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

function posicaoDoLabel(labelBruto: string, blockStart: number): number | null {
  const label = normalizarLicao(labelBruto);
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
// histórico de lições dele, do mais recente pro mais antigo (de qualquer data
// anterior). A sugestão sempre continua a partir da MAIOR lição já atingida
// neste nível — se o aluno refizer uma lição anterior, isso não "volta" a
// sugestão; ela continua de onde ele já tinha chegado.
export function licaoSugerida(
  nivelAtual: string,
  historico: { licao: string; nivel_no_momento: string }[],
): string {
  const blockStart = BLOCO_INICIO[nivelAtual as Nivel];
  if (blockStart === undefined) return "";
  if (historico.length === 0) return "";

  const maisRecente = historico[0];
  if (maisRecente.nivel_no_momento !== nivelAtual) {
    // Mudou de nível: começa do zero na trilha nova, sem precisar de lançamento manual.
    return labelDaPosicao(1, blockStart);
  }

  // Maior posição já atingida entre os lançamentos deste nível, andando do mais
  // recente pro mais antigo até achar uma entrada de um nível diferente (troca).
  let maiorPos: number | null = null;
  for (const h of historico) {
    if (h.nivel_no_momento !== nivelAtual) break;
    const pos = posicaoDoLabel(h.licao, blockStart);
    if (pos !== null && (maiorPos === null || pos > maiorPos)) maiorPos = pos;
  }

  if (maiorPos === null) {
    // Nenhum lançamento reconhecido (HW, Extra…) neste nível — repete o mais recente.
    return maisRecente.licao;
  }
  if (maiorPos >= POSICOES_POR_BLOCO) return maisRecente.licao;
  return labelDaPosicao(maiorPos + 1, blockStart);
}
