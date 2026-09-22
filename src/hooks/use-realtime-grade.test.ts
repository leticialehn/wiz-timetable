import { describe, expect, it } from "vitest";
import { QUERY_KEYS_POR_TABELA } from "./use-realtime-grade";

// Story 4.1: locks in the table -> query-key mapping this session derived by
// reading every useRealtimeGrade() call site's server function and the
// Supabase tables it actually queries. This is a regression guard, not a
// re-derivation — if a future story adds a new grade-dependent screen, this
// test will start failing to catch the drift, same spirit as the story's own
// warning that the call-site count keeps changing.

describe("QUERY_KEYS_POR_TABELA", () => {
  it("covers all 5 subscribed tables with at least one query key each", () => {
    const tabelas = Object.keys(QUERY_KEYS_POR_TABELA);
    expect(tabelas.sort()).toEqual(
      ["aulas_licoes", "excecoes_semana", "grade_base", "horarios_config", "professoras"].sort(),
    );
    for (const prefixes of Object.values(QUERY_KEYS_POR_TABELA)) {
      expect(prefixes.length).toBeGreaterThan(0);
    }
  });

  it("maps grade_base changes to every screen that reads grade_base (via getGradeSemana, getLeads/getProspectosComerciais, getCargaProfessoras, getAlertasAtivos)", () => {
    expect(QUERY_KEYS_POR_TABELA.grade_base).toEqual(
      expect.arrayContaining([
        "grade-semana",
        "grade-semana-prof",
        "prospectos-comerciais",
        "leads",
        "carga-professoras",
        "alertas-ativos",
      ]),
    );
  });

  it("does not map horarios_config to screens that don't read it (e.g. leads/alertas)", () => {
    expect(QUERY_KEYS_POR_TABELA.horarios_config).not.toContain("leads");
    expect(QUERY_KEYS_POR_TABELA.horarios_config).not.toContain("alertas-ativos");
  });

  it("maps professoras changes to leads/prospectos-comerciais too (buscarAvulsosPorTipo queries the professoras table for professora_nome — found during QA re-verification)", () => {
    expect(QUERY_KEYS_POR_TABELA.professoras).toEqual(
      expect.arrayContaining(["leads", "prospectos-comerciais"]),
    );
  });

  it("maps aulas_licoes to the lição-dependent screens", () => {
    expect(QUERY_KEYS_POR_TABELA.aulas_licoes).toEqual(
      expect.arrayContaining([
        "ultimas-licoes-por-aluno",
        "alertas-ativos",
        "lancamentos-semana",
        "historico-licoes",
        "licoes-pendentes",
      ]),
    );
  });
});
