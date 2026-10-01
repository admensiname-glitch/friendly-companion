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

function Icon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 4.5v17" />
      <path d="M9 6h7" />
    </svg>
  );
}

function DisciplineCard({ discipline, index }: { discipline: StudentDiscipline; index: number }) {
  const accents = [
    "bg-[#EEF4FF] text-[#0242D7]",
    "bg-[#F1F7F5] text-[#187A59]",
    "bg-[#F7F2FF] text-[#7C4DCE]",
    "bg-[#FFF6EA] text-[#B86B13]",
  ];
  return (
    <Link
      to="/app/disciplinas/$disciplineId"
      params={{ disciplineId: discipline.id }}
      className="surface-card surface-card-hover group rounded-2xl p-5 focus-visible:outline-none sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accents[index % accents.length]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-[-0.02em] text-[#1D2A3B]">{discipline.discipline_name}</p>
          <p className="mt-1 text-sm text-[#7A8796]">{discipline.course || "Pedagogia"}</p>
        </div>
        <span className="mt-1 text-[#A0AAB7] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0242D7]">→</span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#EDF1F5] pt-4">
        <span className="text-xs font-semibold text-[#8792A0]">Conteúdo disponível</span>
        <span className="text-xs font-bold text-[#0242D7]">Entrar</span>
      </div>
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

      if (fetchError) setError("Não foi possível carregar suas disciplinas.");
      else setDisciplines((data as StudentDiscipline[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <section aria-labelledby="disciplines-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Estudo</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="disciplines-title" className="text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">Minhas disciplinas</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#687688]">Tudo o que você está estudando fica organizado aqui.</p>
          </div>
          <Link to="/app/catalogo" className="w-fit text-sm font-semibold text-[#0242D7] hover:underline">Explorar catálogo →</Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map((item)=><div key={item} className="h-[152px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white" />)}
        </div>
      ) : error ? (
        <div className="mt-7 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]" role="alert">{error}</div>
      ) : disciplines.length === 0 ? (
        <div className="muted-panel mt-7 rounded-2xl p-9 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0242D7] shadow-sm"><Icon className="h-5 w-5" /></span>
          <h2 className="mt-4 text-base font-semibold text-[#172334]">Nenhuma disciplina encontrada</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6F7C8C]">Adicione suas disciplinas na configuração inicial para começar seu percurso.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {disciplines.map((disc,index)=><DisciplineCard key={disc.id} discipline={disc} index={index}/>)}
        </div>
      )}
      <Outlet />
    </section>
  );
}
