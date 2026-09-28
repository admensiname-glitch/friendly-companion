import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <section aria-labelledby="admin-dashboard-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
        Área administrativa
      </p>
      <h1
        id="admin-dashboard-title"
        className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0F172A] sm:text-4xl"
      >
        Dashboard administrativo
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748B]">
        Área destinada às futuras ferramentas de gestão do Ensina-me. Os
        módulos administrativos serão organizados aqui conforme forem
        implementados.
      </p>

      <div
        className="mt-10 rounded-xl border border-[#E2E8F0] bg-white p-6"
        aria-label="Estado atual da área administrativa"
      >
        <h2 className="font-semibold text-[#0F172A]">
          Estrutura inicial preparada
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
          Nenhuma métrica, informação administrativa ou dado operacional foi
          criado nesta etapa.
        </p>
      </div>
    </section>
  );
}
