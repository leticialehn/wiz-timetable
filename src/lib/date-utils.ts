// Utilidades de data (semana começa na segunda-feira, ISO yyyy-mm-dd)

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Retorna a segunda-feira da semana da data dada
export function segundaDaSemana(base: Date | string = new Date()): Date {
  const d = typeof base === "string" ? parseISODate(base) : new Date(base);
  const dow = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Datas de segunda a sábado (6 dias)
export function datasDaSemana(segunda: Date): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });
}

export function diaSemanaISO(iso: string): number {
  // 1..6 (seg..sáb), 0 se domingo
  const d = parseISODate(iso).getDay();
  return d === 0 ? 0 : d;
}

export function formatarDataBR(iso: string): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function somarSemanas(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n * 7);
  return toISODate(d);
}
