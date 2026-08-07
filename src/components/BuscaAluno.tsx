import { useState } from "react";

type AlunoBusca = { id: string; nome: string; nivel: string };

export function BuscaAluno({
  alunos,
  selecionado,
  onSelecionar,
}: {
  alunos: AlunoBusca[];
  selecionado: AlunoBusca | undefined;
  onSelecionar: (id: string | null) => void;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = busca.trim()
    ? alunos
        .filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .slice(0, 8)
    : [];

  return (
    <div className="print:hidden relative mb-8 max-w-md">
      <input
        value={selecionado ? selecionado.nome : busca}
        onChange={(e) => {
          setBusca(e.target.value);
          onSelecionar(null);
        }}
        placeholder="Buscar aluno pelo nome…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {filtrados.length > 0 && !selecionado && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md">
          {filtrados.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => {
                  onSelecionar(a.id);
                  setBusca("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              >
                {a.nome} <span className="text-muted-foreground">— {a.nivel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
