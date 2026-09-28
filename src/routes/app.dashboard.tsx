import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/dashboard")({
  component: AppDashboard,
});

const futureSections = [
  ["O que estudar hoje", "Organização deStudy"],
  ["Progresso", "Evolução da aprendizagem"],
  ["Disciplinas", "Percurso do curso de Pedagogia"],
  ["Revisão", "Retomada de conteúdos relevantes"],
] as const;

function AppDashboard() {
  return (
    <section aria-labelledby="app-dashboard-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Área do aluno
      </p>
      <h1 id="app-dashboard-title" className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
        Sua aprendizagem
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Esta área será preparada para organizar seu estudo no curso de Pedagogia. Os conteúdos e os resultados serão apresentados aqui conforme forem implementados.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {futureSections.map(([title, description]) => (
          <section
            key={title}
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
            aria-label={title}
          >
            <h2 className="font-semibold text-[#0F172A]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
            <p className="mt-6 text-sm font-medium text-[#0242D7]">Em breve</p>
          </section>
        ))}
      </div>
    </section>
  );
}
