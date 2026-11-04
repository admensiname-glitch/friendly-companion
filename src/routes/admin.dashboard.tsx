import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  courses_published: number;
  disciplines_published: number;
  topics_published: number;
  materials_published: number;
  application_exercises: number;
  evaluations: number;
  answers: number;
  evaluation_attempts: number;
  pending_difficulties: number;
}

const metrics: Array<{ key: keyof AdminStats; label: string }> = [
  { key: "courses_published", label: "Cursos publicados" },
  { key: "disciplines_published", label: "Disciplinas publicadas" },
  { key: "topics_published", label: "Tópicos publicados" },
  { key: "materials_published", label: "Materiais publicados" },
  { key: "application_exercises", label: "Exercícios de aplicação" },
  { key: "evaluations", label: "Avaliações formais" },
  { key: "answers", label: "Respostas registradas" },
  { key: "evaluation_attempts", label: "Tentativas de avaliação" },
  { key: "pending_difficulties", label: "Pontos aguardando revisão" },
];

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditResult, setAuditResult] = useState<Record<string, unknown> | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [academicBusy, setAcademicBusy] = useState(false);
  const [academicProgress, setAcademicProgress] = useState({ batches: 0, processed: 0, published: 0, blocked: 0 });
  const [academicResult, setAcademicResult] = useState<Record<string, unknown> | null>(null);
  const [academicError, setAcademicError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_admin_dashboard_stats");
      if (rpcError || !data) {
        setError(true);
        return;
      }
      setStats(data as unknown as AdminStats);
    })();
  }, []);

  async function runProfessorAudit(kind: "question" | "topic", limit: number) {
    if (auditBusy) return;
    setAuditBusy(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("professor-readonly-audit", {
        body: { kind, limit },
      });
      if (invokeError) {
        const detail = typeof data?.error === "string" ? data.error : invokeError.message;
        throw new Error(detail || "A auditoria não pôde ser iniciada.");
      }
      if (!data || typeof data !== "object") throw new Error("O auditor retornou uma resposta inválida.");
      setAuditResult(data as Record<string, unknown>);
      if (data.error) setAuditError(String(data.error));
    } catch (caught) {
      setAuditError(caught instanceof Error ? caught.message : "Falha inesperada ao executar auditoria.");
    } finally {
      setAuditBusy(false);
    }
  }

  async function runAcademicValidation() {
    if (academicBusy) return;
    setAcademicBusy(true);
    setAcademicError(null);
    setAcademicResult(null);
    let processed = 0, published = 0, blocked = 0, batches = 0, remaining: number | null = null;
    let finished = false;
    try {
      for (; batches < 100; batches += 1) {
        const { data, error: invokeError } = await supabase.functions.invoke("academic-evidence-audit", { body: { limit: 5 } });
        if (invokeError) throw new Error(typeof data?.error === "string" ? data.error : invokeError.message);
        if (!data || typeof data !== "object") throw new Error("Resposta inválida do verificador.");
        const items = Array.isArray(data.processed)
          ? (data.processed as Array<Record<string, unknown>>)
          : [];
        processed += items.length;
        published += items.filter((item) => item.published === true).length;
        blocked += items.filter((item) => Number(item.blocked ?? 0) > 0 || item.status === "blocked").length;
        remaining = Number.isFinite(Number(data.remaining_draft_materials)) ? Number(data.remaining_draft_materials) : remaining;
        setAcademicProgress({ batches: batches + 1, processed, published, blocked });
        if (data.error) throw new Error(String(data.error));
        if (data.has_more !== true) { batches += 1; finished = true; break; }
      }
      if (!finished) throw new Error("Limite de 100 lotes atingido; execute novamente para continuar.");
      setAcademicResult({ batches, processed, published, blocked, remaining });
      const { data: refreshed } = await supabase.rpc("get_admin_dashboard_stats");
      if (refreshed) setStats(refreshed as unknown as AdminStats);
    } catch (error) {
      setAcademicError(error instanceof Error ? error.message : "Falha na validação acadêmica.");
    } finally { setAcademicBusy(false); }
  }

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
        Visão operacional do catálogo, dos materiais, das atividades e dos sinais de aprendizagem.
      </p>

      {error && (
        <div
          className="mt-6 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
          role="alert"
        >
          Não foi possível carregar as métricas administrativas.
        </div>
      )}

      {!error && !stats && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.slice(0, 8).map((metric) => (
            <div
              key={metric.key}
              className="h-28 animate-pulse rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {stats && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-xl border border-[#E2E8F0] bg-white p-5"
            >
              <p className="text-sm text-[#64748B]">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                {stats[metric.key]}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-[#DCE5F0] bg-white p-5 sm:p-7" aria-labelledby="academic-evidence-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Validação documental</p>
        <h2 id="academic-evidence-title" className="mt-2 text-2xl font-bold text-[#0F172A]">Fontes, citações e publicação</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">Analisa os materiais em rascunho em lotes. Confere DOI, título, autoria e editora no Crossref; exige documento recuperado, direitos registrados, trecho literal localizado e localizador compatível. Só publica quando todas as citações e a estrutura passam. O que não tiver prova suficiente permanece bloqueado.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" disabled={academicBusy} onClick={() => void runAcademicValidation()} className="min-h-11 rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{academicBusy ? "Validando materiais..." : "Executar validação completa"}</button>
          {academicBusy && <span className="text-sm text-[#64748B]" role="status">Lote {academicProgress.batches} · {academicProgress.processed} materiais · {academicProgress.published} publicados · {academicProgress.blocked} bloqueados</span>}
        </div>
        {academicError && <div role="alert" className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">{academicError}</div>}
        {academicResult && <p className="mt-4 text-sm leading-6 text-[#475569]">Concluído: {String(academicResult.processed)} materiais em {String(academicResult.batches)} lotes; {String(academicResult.published)} publicados; {String(Number(academicResult.processed) - Number(academicResult.published))} não publicados, dos quais {String(academicResult.blocked)} têm evidência insuficiente. Rascunhos restantes: {String(academicResult.remaining)}. Nenhum conteúdo didático foi gerado por esta rotina.</p>}
      </section>

      <section className="mt-10 rounded-2xl border border-[#DCE5F0] bg-white p-5 sm:p-7" aria-labelledby="professor-audit-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Auditoria acadêmica</p>
        <h2 id="professor-audit-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#0F172A]">Professor · revisão assistida por IA</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">Executa auditoria de questões ou tópicos usando a sessão autenticada do administrador. Esta ferramenta registra achados de auditoria, mas não altera questões publicadas nem corrige conteúdo automaticamente.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={auditBusy} onClick={() => void runProfessorAudit("question", 1)} className="min-h-11 rounded-xl bg-[#0242D7] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{auditBusy ? "Executando..." : "Auditar 1 questão (teste)"}</button>
          <button type="button" disabled={auditBusy} onClick={() => void runProfessorAudit("question", 5)} className="min-h-11 rounded-xl border border-[#CBD5E1] px-5 py-3 text-sm font-bold text-[#334155] disabled:opacity-50">Auditar lote de 5 questões</button>
          <button type="button" disabled={auditBusy} onClick={() => void runProfessorAudit("topic", 1)} className="min-h-11 rounded-xl border border-[#CBD5E1] px-5 py-3 text-sm font-bold text-[#334155] disabled:opacity-50">Auditar 1 tópico</button>
        </div>
        {auditError && <div role="alert" className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm leading-6 text-[#991B1B]">{auditError}</div>}
        {auditResult && <div className="mt-5 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] p-4">
          <h3 className="font-bold text-[#172334]">Retorno da auditoria</h3>
          <p className="mt-1 text-xs text-[#64748B]">O retorno abaixo é o resultado real recebido da função; uma auditoria não equivale a correção aprovada.</p>
          <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-5 text-[#334155]">{JSON.stringify(auditResult, null, 2)}</pre>
        </div>}
      </section>

      <div className="mt-10 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0242D7]">
          Próxima camada
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#0F172A]">
          Curadoria e gestão de conteúdo
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569]">
          O painel já separa catálogo, aprendizagem e sinais de revisão. A gestão editorial poderá usar esses dados para revisar fontes, materiais, exercícios e avaliações antes da publicação.
        </p>
      </div>
    </section>
  );
}
