import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Padroniza nomes de aluno: primeira letra de cada palavra maiúscula, resto minúsculo.
export function capitalizarNome(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(" ");
}

// Chave pra comparar nomes digitados de formas diferentes como a mesma pessoa
// (acento, maiúsculas/minúsculas, espaços a mais) — ex.: "Joao" e "João" ou
// "Leticia" e "Letícia" caem na mesma chave. Não usar pra exibir, só pra agrupar.
export function normalizarNomeParaComparacao(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
