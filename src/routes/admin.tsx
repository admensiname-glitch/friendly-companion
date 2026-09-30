import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

type SupabaseRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw redirect({ to: "/login" });
    }

    const { data: isAdmin, error: roleError } = await (
      supabase as unknown as SupabaseRpcClient
    ).rpc("has_role", { required_role: "admin" });

    return { isAdmin: !roleError && isAdmin === true };
  },
  component: AdminLayout,
});

function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-12 text-[#0F172A]">
      <section
        className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm"
        aria-labelledby="access-denied-title"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
          Área restrita
        </p>
        <h1
          id="access-denied-title"
          className="mt-3 text-3xl font-bold tracking-[-0.04em]"
        >
          Acesso não autorizado
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#64748B]">
          Você não tem permissão para acessar esta área.
        </p>
        <Link
          to="/app/dashboard"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-[#0242D7] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
        >
          Voltar à área do aluno
        </Link>
      </section>
    </main>
  );
}

function AdminLayout() {
  const { isAdmin } = Route.useRouteContext();

  if (!isAdmin) {
    return <AccessDenied />;
  }

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
            <span
              className="hidden h-5 w-px bg-[#E2E8F0] sm:block"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-[#64748B]">
              Administração
            </span>
          </div>

          <nav
            aria-label="Navegação administrativa"
            className="flex flex-wrap items-center gap-2"
          >
            <Link
              to="/admin/dashboard"
              className="rounded-md bg-[#0242D7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0038B8] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Dashboard
            </Link>
            <Link
              to="/admin/conteudo"
              className="rounded-md px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Conteúdo
            </Link>
            <Link
              to="/admin/fontes"
              className="rounded-md px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0242D7] focus-visible:ring-offset-2"
            >
              Fontes
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
