// O Supabase (via PostgREST) limita qualquer resposta a no máximo 1000 linhas
// por padrão, silenciosamente — mesmo pedindo tudo, sem aviso ou erro. Pra
// tabelas que só crescem (presença, notas, lições), isso quebra assim que a
// tabela passar de 1000 linhas. Essa função busca todas as páginas até não
// vir mais nada, então nunca depende desse limite.
export async function buscarTodasAsLinhas<T>(
  pagina: (
    inicio: number,
    fim: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const TAMANHO_PAGINA = 1000;
  const resultado: T[] = [];
  let inicio = 0;
  for (;;) {
    const { data, error } = await pagina(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    const linhas = data ?? [];
    resultado.push(...linhas);
    if (linhas.length < TAMANHO_PAGINA) break;
    inicio += TAMANHO_PAGINA;
  }
  return resultado;
}
