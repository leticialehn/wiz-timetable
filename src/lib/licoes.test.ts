import { describe, expect, it } from "vitest";
import {
  avisoLicao,
  dataInicioInferida,
  licaoSugerida,
  maiorPosicaoAtingida,
  mesesDeAtraso,
  normalizarLicao,
  posicaoDaRevisao,
  posicoesAlemDaR8,
  temTrackingDeLicao,
} from "./licoes";

describe("posicaoDaRevisao", () => {
  it("computes position as revision number times 7 (6 lessons + the revision itself)", () => {
    expect(posicaoDaRevisao(1)).toBe(7);
    expect(posicaoDaRevisao(8)).toBe(56); // R8 — the rematrícula threshold
    expect(posicaoDaRevisao(10)).toBe(70); // last revision, end of block
  });
});

describe("temTrackingDeLicao", () => {
  it("is true for a nível that has lição tracking (in BLOCO_INICIO)", () => {
    expect(temTrackingDeLicao("T2")).toBe(true);
  });

  it("is false for CONV — conversação has no lição tracking", () => {
    expect(temTrackingDeLicao("CONV")).toBe(false);
  });

  it("is false for an unrecognized nível", () => {
    expect(temTrackingDeLicao("XYZ")).toBe(false);
  });
});

describe("normalizarLicao", () => {
  it("uppercases and strips spaces from a letter+number entry", () => {
    expect(normalizarLicao("l23")).toBe("L23");
    expect(normalizarLicao("R 4")).toBe("R4");
    expect(normalizarLicao(" l 5 ")).toBe("L5");
    expect(normalizarLicao("r10")).toBe("R10");
  });

  it("treats a bare number as a lição (L-prefixed)", () => {
    expect(normalizarLicao("23")).toBe("L23");
  });

  it("passes through anything that isn't a lição/revisão pattern unchanged", () => {
    expect(normalizarLicao("HW")).toBe("HW");
    expect(normalizarLicao("Extra")).toBe("Extra");
  });
});

describe("maiorPosicaoAtingida", () => {
  it("returns null for an unrecognized nível", () => {
    expect(
      maiorPosicaoAtingida("XYZ", [{ licao: "L1", nivel_no_momento: "XYZ", praticado: true }]),
    ).toBeNull();
  });

  it("returns null for empty histórico", () => {
    expect(maiorPosicaoAtingida("T2", [])).toBeNull();
  });

  it("returns null when the most recent entry is from a different nível (nível just changed)", () => {
    expect(
      maiorPosicaoAtingida("T2", [{ licao: "L1", nivel_no_momento: "T4", praticado: true }]),
    ).toBeNull();
  });

  it("finds the highest position among praticado entries for the current nível", () => {
    // most-recent-first, per the function's own contract
    const historico = [
      { licao: "L3", nivel_no_momento: "T2", praticado: true },
      { licao: "L7", nivel_no_momento: "T2", praticado: true },
    ];
    expect(maiorPosicaoAtingida("T2", historico)).toBe(8); // L7 -> position 8
  });

  it("skips entries marked praticado=false", () => {
    const historico = [
      { licao: "R1", nivel_no_momento: "T2", praticado: false }, // would be pos 7, but skipped
      { licao: "L3", nivel_no_momento: "T2", praticado: true },
    ];
    expect(maiorPosicaoAtingida("T2", historico)).toBe(3);
  });

  it("stops at the boundary where the nível changes further back in histórico", () => {
    const historico = [
      { licao: "L1", nivel_no_momento: "T2", praticado: true },
      { licao: "R10", nivel_no_momento: "T4", praticado: true }, // older nível — must not count
    ];
    expect(maiorPosicaoAtingida("T2", historico)).toBe(1);
  });

  it("returns null when nothing recognized/practiced exists for this nível", () => {
    const historico = [{ licao: "HW", nivel_no_momento: "T2", praticado: true }];
    expect(maiorPosicaoAtingida("T2", historico)).toBeNull();
  });
});

describe("licaoSugerida", () => {
  it("returns empty string for an unrecognized nível", () => {
    expect(licaoSugerida("XYZ", [{ licao: "L1", nivel_no_momento: "XYZ", praticado: true }])).toBe(
      "",
    );
  });

  it("returns empty string for empty histórico", () => {
    expect(licaoSugerida("T2", [])).toBe("");
  });

  it("starts at L1 when the nível just changed", () => {
    expect(licaoSugerida("T2", [{ licao: "L1", nivel_no_momento: "T4", praticado: true }])).toBe(
      "L1",
    );
  });

  it("suggests the next position after the highest one atingida", () => {
    const historico = [{ licao: "L3", nivel_no_momento: "T2", praticado: true }];
    expect(licaoSugerida("T2", historico)).toBe("L4");
  });

  it("falls back to the raw most recent entry when nothing recognized/practiced exists", () => {
    const historico = [{ licao: "HW", nivel_no_momento: "T2", praticado: true }];
    expect(licaoSugerida("T2", historico)).toBe("HW");
  });
});

describe("posicoesAlemDaR8", () => {
  it("returns null when the aluno hasn't reached R8 yet", () => {
    const historico = [{ licao: "L1", nivel_no_momento: "T2", praticado: true }];
    expect(posicoesAlemDaR8("T2", historico)).toBeNull();
  });

  it("returns 0 exactly at R8", () => {
    const historico = [{ licao: "R8", nivel_no_momento: "T2", praticado: true }];
    expect(posicoesAlemDaR8("T2", historico)).toBe(0);
  });

  it("returns the positions past R8 when further along", () => {
    const historico = [{ licao: "R9", nivel_no_momento: "T2", praticado: true }];
    expect(posicoesAlemDaR8("T2", historico)).toBe(7); // R9 = pos 63, 63 - 56 = 7
  });
});

describe("avisoLicao", () => {
  it("returns null for an empty value", () => {
    expect(avisoLicao("T2", "  ", [])).toBeNull();
  });

  it("returns null for an unrecognized nível", () => {
    expect(avisoLicao("XYZ", "L5", [])).toBeNull();
  });

  it("returns null for values that aren't lição/revisão attempts (HW, Extra…)", () => {
    expect(
      avisoLicao("T2", "HW", [{ licao: "L1", nivel_no_momento: "T2", praticado: true }]),
    ).toBeNull();
  });

  it("warns with the revision-specific message when a revisão number doesn't exist in this nível", () => {
    // revisão only goes up to R10
    expect(
      avisoLicao("T2", "R44", [{ licao: "L1", nivel_no_momento: "T2", praticado: true }]),
    ).toMatch(/R44 não existe nesse nível \(revisão só vai até R10\)/);
  });

  it("warns with the generic message when a lição number doesn't exist in this nível", () => {
    // T2's block only has 60 lessons
    expect(
      avisoLicao("T2", "L200", [{ licao: "L1", nivel_no_momento: "T2", praticado: true }]),
    ).toMatch(/L200 não existe nesse nível\./);
  });

  it("returns null when there's no known progress to compare against yet", () => {
    const historico = [{ licao: "HW", nivel_no_momento: "T2", praticado: true }];
    expect(avisoLicao("T2", "L5", historico)).toBeNull();
  });

  it("returns null for a jump within the suspicious-jump threshold (exactly at the boundary)", () => {
    const historico = [{ licao: "L1", nivel_no_momento: "T2", praticado: true }];
    // L8 is position 9 (1 -> 9 is a jump of 8, the threshold — not suspicious yet)
    expect(avisoLicao("T2", "L8", historico)).toBeNull();
  });

  it("warns on a jump larger than the suspicious-jump threshold", () => {
    const historico = [{ licao: "L1", nivel_no_momento: "T2", praticado: true }];
    // L9 is position 10 (1 -> 10 is a jump of 9, past the threshold of 8)
    expect(avisoLicao("T2", "L9", historico)).toMatch(/Salto grande em relação ao progresso atual/);
  });
});

describe("dataInicioInferida", () => {
  it("returns null for empty histórico", () => {
    expect(dataInicioInferida("T2", [])).toBeNull();
  });

  it("returns null when no entry matches the current nível", () => {
    const historico = [{ data: "2026-01-01", licao: "L1", nivel_no_momento: "T4" }];
    expect(dataInicioInferida("T2", historico)).toBeNull();
  });

  it("returns the date of the first (ascending-order) entry for the current nível", () => {
    const historico = [
      { data: "2026-01-01", licao: "L1", nivel_no_momento: "T4" },
      { data: "2026-02-01", licao: "L1", nivel_no_momento: "T2" },
      { data: "2026-03-01", licao: "L5", nivel_no_momento: "T2" },
    ];
    expect(dataInicioInferida("T2", historico)).toBe("2026-02-01");
  });
});

describe("mesesDeAtraso", () => {
  it("returns null when there's no known data_inicio_nivel", () => {
    expect(mesesDeAtraso("T2", null, "2026-01-01", [])).toBeNull();
  });

  it("returns null when exactly on pace (zero elapsed time, zero progress)", () => {
    expect(mesesDeAtraso("T2", "2026-01-01", "2026-01-01", [])).toBeNull();
  });

  it("returns the months behind when no progress has been made after some elapsed time", () => {
    // 30 days elapsed (1 "mês"), zero progress -> exactly 1 month behind
    expect(mesesDeAtraso("T2", "2026-01-01", "2026-01-31", [])).toBeCloseTo(1, 6);
  });

  it("returns null when progress is ahead of or on pace with elapsed time", () => {
    // 0 days elapsed but some progress already logged -> can't be behind
    const historico = [{ licao: "L1", nivel_no_momento: "T2", praticado: true }];
    expect(mesesDeAtraso("T2", "2026-01-01", "2026-01-01", historico)).toBeNull();
  });
});
