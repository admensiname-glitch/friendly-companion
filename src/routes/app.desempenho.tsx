import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Summary {
  topics_completed:number; average_score:number|null; best_score:number|null; pending_review:number;
  today_minutes:number; seven_day_minutes:number; micro_questions_attempted:number; micro_questions_correct:number; micro_accuracy:number|null;
}
interface Evaluation { attempt_id:string; topic_id:string; topic_name:string; discipline_name:string; score:number; correct_answers:number; total_questions:number; completed_at:string; }

export const Route=createFileRoute("/app/desempenho")({component:PerformancePage});

function Icon({name,className=""}:{name:"chart"|"target"|"clock";className?:string}){
  const paths={
    chart:<><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/></>,
    target:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
    clock:<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function Metric({label,value,icon}:{label:string;value:string|number;icon:"chart"|"target"|"clock"}){
  return <div className="surface-card rounded-2xl p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#0242D7]"><Icon name={icon} className="h-[18px] w-[18px]"/></span><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8B96A5]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#172334]">{value}</p></div>;
}

function PerformancePage(){
  const [summary,setSummary]=useState<Summary|null>(null);
  const [evaluations,setEvaluations]=useState<Evaluation[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{void (async()=>{
    const [s,e]=await Promise.all([supabase.rpc("get_student_performance_summary"),supabase.rpc("get_student_recent_evaluations",{_limit:10})]);
    if(!s.error&&s.data)setSummary(s.data as Summary);
    if(!e.error)setEvaluations((e.data??[]) as Evaluation[]);
    setLoading(false);
  })()},[]);

  return <section aria-labelledby="performance-title">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Acompanhar</p>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 id="performance-title" className="text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">Meu desempenho</h1><p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#687688]">Entenda seu progresso e veja onde vale concentrar o próximo estudo.</p></div>
    </div>

    {loading?<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4,5,6,7,8].map(i=><div key={i} className="h-[125px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white"/>)}</div>:<>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon="chart" label="Tópicos concluídos" value={summary?.topics_completed??0}/>
        <Metric icon="target" label="Média das avaliações" value={summary?.average_score==null?"—":summary.average_score+"%"}/>
        <Metric icon="chart" label="Melhor avaliação" value={summary?.best_score==null?"—":summary.best_score+"%"}/>
        <Metric icon="target" label="Revisões pendentes" value={summary?.pending_review??0}/>
        <Metric icon="clock" label="Estudo hoje" value={(summary?.today_minutes??0)+" min"}/>
        <Metric icon="clock" label="Últimos 7 dias" value={(summary?.seven_day_minutes??0)+" min"}/>
        <Metric icon="target" label="Microavaliações" value={summary?.micro_questions_attempted??0}/>
        <Metric icon="chart" label="Aproveitamento no Tutor" value={summary?.micro_accuracy==null?"—":summary.micro_accuracy+"%"}/>
      </div>

      <div className="mt-9 rounded-[22px] bg-[#F0F5FF] p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0242D7]">Aprendizagem adaptativa</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">O Tutor também acompanha você</h2>
            <p className="mt-2 text-sm leading-6 text-[#637084]">As microavaliações ajudam o Ensina-me a identificar conceitos frágeis, ajustar a dificuldade e programar novas revisões.</p>
          </div>
          <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#172334]">{summary?.micro_questions_correct??0}/{summary?.micro_questions_attempted??0}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8B96A5]">acertos</p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Histórico</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Avaliações recentes</h2></div></div>
        {evaluations.length===0?<div className="muted-panel mt-4 rounded-2xl p-8 text-center"><p className="text-sm font-semibold text-[#344154]">Nenhuma avaliação formal concluída ainda.</p><p className="mt-1 text-sm text-[#7A8796]">Quando você concluir uma avaliação, seu resultado aparecerá aqui.</p></div>:<div className="mt-4 overflow-hidden rounded-2xl border border-[#E7ECF3] bg-white">
          {evaluations.map((evaluation,index)=><div key={evaluation.attempt_id} className={index>0?"border-t border-[#EDF1F5] p-5":"p-5"}>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-sm font-bold text-[#0242D7]">{Math.round(evaluation.score)}%</div>
              <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#96A0AD]">{evaluation.discipline_name}</p><p className="mt-1 truncate text-sm font-bold text-[#263547]">{evaluation.topic_name}</p><p className="mt-1 text-xs text-[#7A8796]">{evaluation.correct_answers} de {evaluation.total_questions} corretas · {new Date(evaluation.completed_at).toLocaleDateString("pt-BR")}</p></div>
            </div>
          </div>)}
        </div>}
      </div>
    </>}
  </section>;
}
