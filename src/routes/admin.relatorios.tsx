import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/relatorios")({ component: RelatoriosPage });

function RelatorioCard({
  to,
  titulo,
  descricao,
}: {
  to: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-border p-4 hover:bg-accent hover:border-primary/40"
    >
      <div className="font-semibold mb-1">{titulo}</div>
      <div className="text-sm text-muted-foreground">{descricao}</div>
    </Link>
  );
}

function RelatoriosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Relatórios</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <RelatorioCard
          to="/admin/relatorios/aluno"
          titulo="Boletim e histórico do aluno"
          descricao="Notas das revisões pra imprimir/mandar pros pais, e o histórico completo de aulas com notas editáveis."
        />
        <RelatorioCard
          to="/admin/relatorios/carga-professoras"
          titulo="Carga de professoras"
          descricao="Quantas aulas cada professora dá por semana ou mês, por tipo de aula, com exportação em CSV."
        />
        <RelatorioCard
          to="/admin/relatorios/aniversariantes"
          titulo="Aniversariantes"
          descricao="Lista de aniversariantes por mês ou o ano inteiro, sempre em ordem de data."
        />
        <RelatorioCard
          to="/admin/relatorios/faltas"
          titulo="Faltas por aluno"
          descricao="Quem mais faltou (sem avisar) numa semana ou mês, pra decisões de retenção."
        />
        <RelatorioCard
          to="/admin/relatorios/declaracao"
          titulo="Declaração de matrícula e frequência"
          descricao="Documento pra imprimir, com a logo da escola, que os pais podem pedir pra outros fins."
        />
        <RelatorioCard
          to="/admin/relatorios/niveis"
          titulo="Alunos por nível"
          descricao="Quantos alunos ativos em cada nível e em Kids/Teens/Adultos, pra planejar turmas."
        />
      </div>
    </main>
  );
}
