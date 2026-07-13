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
