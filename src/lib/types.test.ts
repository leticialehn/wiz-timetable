import { describe, expect, it } from "vitest";
import { corTextoLegivel, grupoDoNivel, idiomaDoNivel, slotsFixosPorPeriodo } from "./types";

describe("corTextoLegivel", () => {
  it("picks black text on a white background", () => {
    expect(corTextoLegivel("#ffffff")).toBe("#000000");
  });

  it("picks white text on a black background", () => {
    expect(corTextoLegivel("#000000")).toBe("#ffffff");
  });

  it("picks white text on a mid-gray background (below the luminance threshold)", () => {
    expect(corTextoLegivel("#808080")).toBe("#ffffff");
  });
});

describe("idiomaDoNivel", () => {
  it("returns the language for a letter-prefixed nível", () => {
    expect(idiomaDoNivel("E2")).toBe("Espanhol");
    expect(idiomaDoNivel("C2")).toBe("Chinês");
  });

  it("returns null for CONV even though it starts with C (it's not the Chinese track)", () => {
    expect(idiomaDoNivel("CONV")).toBeNull();
  });

  it("returns null for the English track (T/W/K/NG/PreT) — no language prefix", () => {
    expect(idiomaDoNivel("T2")).toBeNull();
    expect(idiomaDoNivel("K2")).toBeNull();
  });
});

describe("grupoDoNivel", () => {
  it("groups K-levels as kids", () => {
    expect(grupoDoNivel("K2")).toBe("kids");
  });

  it("groups T-levels as teens", () => {
    expect(grupoDoNivel("T4")).toBe("teens");
  });

  it("groups W-levels and CONV as adultos", () => {
    expect(grupoDoNivel("W2")).toBe("adultos");
    expect(grupoDoNivel("CONV")).toBe("adultos");
  });

  it("defaults unrecognized níveis to adultos", () => {
    expect(grupoDoNivel("XYZ")).toBe("adultos");
  });
});

describe("slotsFixosPorPeriodo", () => {
  it("splits an 'online' period into 3x 20-minute slots (Story 6.1 regression: unchanged output)", () => {
    expect(slotsFixosPorPeriodo("online", 1)).toEqual(["8:00", "8:20", "8:40"]);
  });

  it("splits a 'comercial' period into 4x 15-minute slots", () => {
    expect(slotsFixosPorPeriodo("comercial", 1)).toEqual(["8:00", "8:15", "8:30", "8:45"]);
  });

  it("returns an empty list for a tipo with no fixed sub-slots", () => {
    expect(slotsFixosPorPeriodo("regular", 1)).toEqual([]);
  });
});
