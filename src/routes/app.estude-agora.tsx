import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Recommendation {
  topic_id: string | null;
  discipline_id?: string | null;
}

export const Route = createFileRoute("/app/estude-agora")({ component: StudyNowPage });

function StudyNowPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Encontrando o próximo passo para você…");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/login" });
        return;
      }

      const { data, error } = await supabase.rpc("get_student_study_recommendation");
      if (cancelled) return;

      const recommendation = data as Recommendation | null;
      if (!error && recommendation?.topic_id && recommendation?.discipline_id) {
        await navigate({
          to: "/app/disciplinas/$disciplineId/$topicId",
          params: { disciplineId: recommendation.discipline_id, topicId: recommendation.topic_id },
        });
        return;
      }

      setMessage("Ainda não encontramos um próximo tópico. Escolha uma disciplina para começar seu percurso.");
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center">
      <div className="surface-card w-full rounded-2xl p-7 text-center sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#0242D7]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
            <path d="m19 4 .7 2 2 .7-.2.7-2-.7-2 .7z" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-[-0.03em] text-[#172334]">Estudar agora</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687688]">{message}</p>
        <Link to="/app/disciplinas" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#0242D7] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038B8]">
          Ver disciplinas
        </Link>
      </div>
    </section>
  );
}