import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/dashboard"
              className="text-xl font-bold tracking-[-0.03em] text-[#0242D7] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-4"
              aria-label="Ensina-me, área administrativa"
            >
              Ensina-me
            </Link>
            <span className="hidden h-5 w-px bg-[#E2E8F0] sm:block" aria-hidden="true" />
            <span className="text-sm font-medium text-[#64748B]">
              Administração
            </span>
          </div>

          <nav aria-label="Navegação administrativa" className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Dashboard
            </Link>
            <Link
              to="/app/dashboard"
              className="rounded-md px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-white focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Voltar à área do aluno
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <Outlet />
      </main>
    </div>
  );
}
