import { CONCEITOS, type ConceitoNota } from "@/lib/types";

export function NotaEditavel({
  valor,
  disabled,
  onSelecionar,
}: {
  valor: ConceitoNota | null;
  disabled: boolean;
  onSelecionar: (v: ConceitoNota | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {CONCEITOS.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onSelecionar(valor === c ? null : c)}
          className={`w-6 h-6 rounded text-[10px] font-bold border disabled:opacity-50 ${
            valor === c
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
