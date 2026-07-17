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

export function inicioDoMes(base: Date | string = new Date()): Date {
  const d = typeof base === "string" ? parseISODate(base) : new Date(base);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function fimDoMes(base: Date | string = new Date()): Date {
  const d = typeof base === "string" ? parseISODate(base) : new Date(base);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function somarMeses(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + n);
  return toISODate(d);
}

// Data de nascimento (ISO) formatada como DD/MM/AA (ano com 2 dígitos, como
// pedido pra caber compacto na lista de alunos).
export function formatarDataNascimentoBR(iso: string): string {
  const d = parseISODate(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
}

// Converte a data ISO de nascimento de volta pros 6 dígitos (ddmmaa), pra
// inicializar o campo de edição com o valor já salvo.
export function dataNascimentoParaDigitos(iso: string): string {
  const d = parseISODate(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(-2);
  return `${dia}${mes}${ano}`;
}

// Converte 6 dígitos (ddmmaa) digitados em data ISO (yyyy-mm-dd), ou null se
// incompleto/inválido. Ano de 2 dígitos assume o século mais próximo do ano
// atual (ex.: em 2026, "12" vira 2012; "87" vira 1987).
export function dataNascimentoDeDigitos(digitos: string): string | null {
  const d = digitos.replace(/\D/g, "");
  if (d.length !== 6) return null;
  const dia = parseInt(d.slice(0, 2), 10);
  const mes = parseInt(d.slice(2, 4), 10);
  const aa = parseInt(d.slice(4, 6), 10);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  const anoAtual2Digitos = new Date().getFullYear() % 100;
  const ano = aa <= anoAtual2Digitos ? 2000 + aa : 1900 + aa;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Aplica a máscara dd/mm/aa enquanto a pessoa digita só números, sem exigir
// os 6 dígitos completos ainda.
export function mascaraDataDigitando(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function somarDiasISO(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function nomeMesCapitalizado(d: Date): string {
  const s = d.toLocaleDateString("pt-BR", { month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Formata um período (ex.: pro "Próximas datas" do calendário escolar), num
// dia só ou como intervalo — só inclui o ano se início e fim caírem em anos
// diferentes, já que na prática isso quase nunca acontece.
export function formatarIntervaloBR(inicioIso: string, fimIso: string): string {
  const inicio = parseISODate(inicioIso);
  const fim = parseISODate(fimIso);
  if (inicioIso === fimIso) {
    return `${inicio.getDate()} de ${nomeMesCapitalizado(inicio)}`;
  }
  if (inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear()) {
    return `${inicio.getDate()} a ${fim.getDate()} de ${nomeMesCapitalizado(inicio)}`;
  }
  const comAno = inicio.getFullYear() !== fim.getFullYear();
  const anoInicio = comAno ? ` de ${inicio.getFullYear()}` : "";
  const anoFim = comAno ? ` de ${fim.getFullYear()}` : "";
  return `${inicio.getDate()} de ${nomeMesCapitalizado(inicio)}${anoInicio} a ${fim.getDate()} de ${nomeMesCapitalizado(fim)}${anoFim}`;
}

// Domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher) — usado só pra
// calcular os feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi).
function dataDaPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Feriados nacionais do Brasil (referência de planejamento — não considera
// feriados municipais/estaduais da cidade dela). Inclui os móveis calculados
// a partir da Páscoa; Carnaval e Corpus Christi são ponto facultativo na
// maioria dos lugares, mas entram porque toda escola encerra nesses dias.
export function feriadosNacionais(ano: number): { data: string; nome: string }[] {
  const pascoa = dataDaPascoa(ano);
  const lista = [
    { data: new Date(ano, 0, 1), nome: "Confraternização Universal" },
    { data: somarDias(pascoa, -48), nome: "Carnaval (segunda)" },
    { data: somarDias(pascoa, -47), nome: "Carnaval (terça)" },
    { data: somarDias(pascoa, -2), nome: "Sexta-feira Santa" },
    { data: new Date(ano, 3, 21), nome: "Tiradentes" },
    { data: new Date(ano, 4, 1), nome: "Dia do Trabalho" },
    { data: somarDias(pascoa, 60), nome: "Corpus Christi" },
    { data: new Date(ano, 8, 7), nome: "Independência do Brasil" },
    { data: new Date(ano, 9, 12), nome: "Nossa Senhora Aparecida" },
    { data: new Date(ano, 10, 2), nome: "Finados" },
    { data: new Date(ano, 10, 15), nome: "Proclamação da República" },
    { data: new Date(ano, 10, 20), nome: "Consciência Negra" },
    { data: new Date(ano, 11, 25), nome: "Natal" },
  ];
  return lista
    .map(({ data, nome }) => ({ data: toISODate(data), nome }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// O aniversário (dia/mês, independente do ano) cai na semana atual (segunda a
// sábado, igual ao resto da grade)? Testa ano anterior/atual/seguinte pra
// cobrir corretamente a virada de ano.
export function estaNaSemanaDoAniversario(dataNascimento: string | null, hojeIso: string): boolean {
  if (!dataNascimento) return false;
  const hoje = parseISODate(hojeIso);
  const semana = datasDaSemana(segundaDaSemana(hoje));
  const nascimento = parseISODate(dataNascimento);
  const mes = nascimento.getMonth();
  const dia = nascimento.getDate();
  for (const ano of [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]) {
    if (semana.includes(toISODate(new Date(ano, mes, dia)))) return true;
  }
  return false;
}
