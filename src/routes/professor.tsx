import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Topic = { id: string; name: string; discipline_id: string; discipline_name: string };
type ClassRow = { id: string; name: string; join_code: string };

export const Route = createFileRoute("/professor")({ ssr: false, component: ProfessorDashboard });

function ProfessorDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { await navigate({ to: "/login", replace: true }); return; }
      const { data: role } = await supabase.rpc("has_role", { required_role: "professor" });
      const { data: teacherRole } = await supabase.rpc("has_role", { required_role: "teacher" });
      const ok = role === true || teacherRole === true;
      setAllowed(ok);
      setChecking(false);
      if (!ok) return;
      const { data: topicRows } = await supabase.from("topics").select("id,name,discipline_id,disciplines!inner(name)").order("name");
      if (topicRows) {
        setTopics(topicRows.map((row: any) => ({ id: row.id, name: row.name, discipline_id: row.discipline_id, discipline_name: row.disciplines?.name ?? "" })));
      }
    })();
  }, [navigate]);

  async function createClass() {
    if (!className.trim() || !joinCode.trim()) return;
    setBusy(true); setFeedback("");
    const { data, error } = await supabase.rpc("create_teacher_class", { p_name: className.trim(), p_join_code: joinCode.trim() });
    if (error) setFeedback(error.message); else {
      setClasses((items) => [...items, { id: data, name: className.trim(), join_code: joinCode.trim().toUpperCase() }]);
      setClassId(data); setClassName(""); setJoinCode(""); setFeedback("Turma criada. Compartilhe o código com os alunos.");
    }
    setBusy(false);
  }

  async function createAssignment() {
    if (!classId || !topicId || !title.trim()) return;
    setBusy(true); setFeedback("");
    const { error } = await supabase.rpc("create_teacher_assignment", { p_class_id: classId, p_topic_id: topicId, p_title: title.trim(), p_message: message.trim() || null });
    setFeedback(error ? error.message : "Indicação publicada para os alunos da turma.");
    if (!error) { setTitle(""); setMessage(""); }
    setBusy(false);
  }

  if (checking) return <main className="min-h-screen grid place-items-center"><p>Verificando acesso...</p></main>;
  if (!allowed) return <main className="min-h-screen grid place-items-center px-6"><section className="max-w-md text-center"><h1 className="text-2xl font-black">Área do professor</h1><p className="mt-2 text-sm text-slate-500">Esta área é exclusiva para professores.</p><Link to="/app/dashboard" className="mt-6 inline-flex rounded-xl bg-[#0242D7] px-4 py-3 text-sm font-black text-white">Voltar ao aluno</Link></section></main>;

  return <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#172334] dark:bg-[#0B1220] dark:text-[#E7EDF5]">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6"><p className="text-xs font-black uppercase tracking-[.16em] text-[#0242D7]">Ensina-me</p><h1 className="mt-1 text-3xl font-black">Área do professor</h1><p className="mt-2 text-sm text-slate-500">Crie uma turma, compartilhe o código e indique o que seus alunos devem estudar.</p></header>
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-[#263A55] dark:bg-[#142238]">
        <h2 className="font-black">1. Criar turma</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={className} onChange={e=>setClassName(e.target.value)} placeholder="Nome da turma" className="rounded-xl border px-3 py-3 text-sm dark:bg-[#0F1B2D]" />
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Código (ex.: ALF1A)" className="rounded-xl border px-3 py-3 text-sm font-black uppercase dark:bg-[#0F1B2D]" />
        </div>
        <button disabled={busy || !className.trim() || !joinCode.trim()} onClick={createClass} className="mt-3 rounded-xl bg-[#0242D7] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Criar turma</button>
      </section>
      {classes.length > 0 && <p className="mt-3 rounded-xl bg-[#EEF4FF] p-3 text-sm font-bold text-[#0242D7]">Código da turma: {classes[classes.length-1].join_code}</p>}
      <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-[#263A55] dark:bg-[#142238]">
        <h2 className="font-black">2. Indicar estudo</h2>
        <select value={classId} onChange={e=>setClassId(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-3 text-sm dark:bg-[#0F1B2D]"><option value="">Selecione a turma</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={topicId} onChange={e=>setTopicId(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-3 text-sm dark:bg-[#0F1B2D]"><option value="">Selecione o conteúdo</option>{topics.map(t=><option key={t.id} value={t.id}>{t.discipline_name} · {t.name}</option>)}</select>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da indicação" className="mt-2 w-full rounded-xl border px-3 py-3 text-sm dark:bg-[#0F1B2D]" />
        <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Mensagem para os alunos (opcional)" className="mt-2 min-h-24 w-full rounded-xl border px-3 py-3 text-sm dark:bg-[#0F1B2D]" />
        <button disabled={busy || !classId || !topicId || !title.trim()} onClick={createAssignment} className="mt-3 rounded-xl bg-[#0242D7] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Publicar indicação</button>
      </section>
      {feedback && <p className="mt-4 rounded-xl border bg-white p-3 text-sm font-semibold dark:border-[#263A55] dark:bg-[#142238]">{feedback}</p>}
      <Link to="/app/dashboard" className="mt-6 inline-flex text-sm font-bold text-[#0242D7]">Voltar à área do aluno</Link>
    </div>
  </main>;
}
