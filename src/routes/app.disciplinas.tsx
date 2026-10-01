import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface StudentDiscipline {
  id: string;
  discipline_name: string;
  course: string;
  created_at: string;
}

export const Route = createFileRoute("/app/disciplinas")({
  component: DisciplinesPage,
});

function Icon({ name, className = "" }: { name: "book" | "arrow"; className?: string }) {
  const paths = {
    book: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17" />
        <path d="M9 6h7" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

function DisciplineRow({
  discipline,
  index,
}: {
  discipline: StudentDiscipline;
  index: number;
}) {
  return (
    <Link
      to="/app/disciplinas/$disciplineId"
      params={{ disciplineId: discipline.id }}
      className="group grid gap-3 border-b border-[#E4EAF1] py-5 last:border-b-0 dark:border-[#2B3A4F] sm:grid-cols-[46px_minmax(0,1fr)_auto] sm:items-center"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
        <Icon name="book" className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-[16px] font-bold text-[#273547] dark:text-[#E0E8F1]">
            {discipline.discipline_name}
          </h2>
          <span className="text-xs text-[#8A96A5] dark:text-[#8293A6]">
            {discipline.course || "Curso"}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#718093] dark:text-[#95A6B8]">
          Continue seu percurso de aprendizagem.
        </p>
      </div>

      <span className="inline-flex items-center gap-2 text-sm font-bold text-[#0242D7] transition-transform group-hover:translate-x-0.5 dark:text-[#7DB0FF]">
        Entrar
        <Icon name="arrow" className="h-4 w-4" />
      </span>
    </Link>
  );
}

function DisciplinesPage() {
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setError("Sessão não encontrada.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("student_disciplines")
        .select("id, discipline_name, course, created_at")
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar suas disciplinas.");
      } else {
        setDisciplines((data as StudentDiscipline[]) ?? []);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="disciplines-title" className="max-w-4xl">
      <header className="border-b border-[#DCE5F0] pb-7 dark:border-[#2B3A4F]">
        <p className="text-sm font-semibold text-[#0242D7] dark:text-[#7DB0FF]">
          Seu percurso
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              id="disciplines-title"
              className="text-[30px] font-bold tracking-[-0.045em] text-[#172334] dark:text-[#E7EDF5] sm:text-[40px]"
            >
              Minhas disciplinas
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#687688] dark:text-[#AAB7C7]">
              Cada disciplina é um caminho. Entre, avance pelos tópicos e volte quando precisar.
            </p>
          </div>
          <Link
            to="/app/catalogo"
            className="text-sm font-bold text-[#0242D7] hover:underline dark:text-[#7DB0FF]"
          >
            Explorar catálogo
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="mt-5 divide-y divide-[#E4EAF1] border-y border-[#E4EAF1] dark:divide-[#2B3A4F] dark:border-[#2B3A4F]">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div
          className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B] dark:border-[#71333A] dark:bg-[#321A1F] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      ) : disciplines.length === 0 ? (
        <div className="mt-8 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0242D7] dark:bg-[#1B2638] dark:text-[#7DB0FF]">
            <Icon name="book" className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#253447] dark:text-[#E0E8F1]">
            Nenhuma disciplina encontrada
          </h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#7A8796] dark:text-[#96A6B8]">
            Adicione suas disciplinas na configuração inicial para começar seu percurso.
          </p>
        </div>
      ) : (
        <div className="mt-5 border-y border-[#E4EAF1] dark:border-[#2B3A4F]">
          {disciplines.map((discipline, index) => (
            <DisciplineRow key={discipline.id} discipline={discipline} index={index} />
          ))}
        </div>
      )}

      <Outlet />
    </section>
  );
}
