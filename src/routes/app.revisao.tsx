import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewItem { topic_id:string; topic_name:string; discipline_id:string; discipline_name:string; difficulty_tag:string; count:number; last_occurrence:string; review_status:string; correct_count:number; }
interface ScheduledMicroReview { topic_id:string; topic_name:string; discipline_id:string; discipline_name:string; next_micro_review_at:string; micro_mastery_level:"emerging"|"consolidating"|"proficient"|"mastered"; micro_current_difficulty:"introductory"|"intermediate"|"advanced"; }

export const Route=createFileRoute("/app/revisao")({component:ReviewPage});
const label=(tag:string)=>tag.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());

function Icon({name,className=""}:{name:"review"|"arrow";className?:string}){
  const paths={review:<><path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h8"/><path d="m17 15 2 2 3-4"/></>,arrow:<><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>} as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function ReviewPage(){
  const [items,setItems]=useState<ReviewItem[]>([]);
  const [microReviews,setMicroReviews]=useState<ScheduledMicroReview[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{void (async()=>{
    const {data:sessionData}=await supabase.auth.getSession();
    if(!sessionData.session){setLoading(false);return;}
    const [{data:reviewData},{data:progressData}]=await Promise.all([
      supabase.rpc("get_student_review_items"),
      supabase.from("student_topic_progress").select("topic_id,next_micro_review_at,micro_mastery_level,micro_current_difficulty").eq("user_id",sessionData.session.user.id).not("next_micro_review_at","is",null).order("next_micro_review_at",{ascending:true}),
    ]);
    setItems((reviewData??[]) as ReviewItem[]);
    const rows=(progressData??[]).filter(row=>typeof row.next_micro_review_at==="string");
    if(rows.length){
      const topicIds=rows.map(row=>row.topic_id);
      const {data:topics}=await supabase.from("topics").select("id,name,discipline_id").in("id",topicIds).eq("published",true);
      const disciplineIds=[...new Set((topics??[]).map(t=>t.discipline_id))];
      const {data:disciplines}=disciplineIds.length?await supabase.from("disciplines").select("id,name").in("id",disciplineIds).eq("published",true):{data:[]};
      const topicMap=new Map((topics??[]).map(t=>[t.id,t])); const disciplineMap=new Map((disciplines??[]).map(d=>[d.id,d]));
      setMicroReviews(rows.map(row=>{
        const topic=topicMap.get(row.topic_id); const discipline=topic?disciplineMap.get(topic.discipline_id):null;
        if(!topic||!discipline)return null;
        return {topic_id:topic.id,topic_name:topic.name,discipline_id:discipline.id,discipline_name:discipline.name,next_micro_review_at:row.next_micro_review_at,micro_mastery_level:row.micro_mastery_level==="mastered"||row.micro_mastery_level==="proficient"||row.micro_mastery_level==="consolidating"?row.micro_mastery_level:"emerging",micro_current_difficulty:row.micro_current_difficulty==="advanced"||row.micro_current_difficulty==="intermediate"?row.micro_current_difficulty:"introductory"} as ScheduledMicroReview;
      }).filter((v):v is ScheduledMicroReview=>v!==null));
    }
    setLoading(false);
  })()},[]);

  const grouped=useMemo(()=>{const map=new Map<string,ReviewItem[]>();for(const item of items){const current=map.get(item.topic_id)??[];current.push(item);map.set(item.topic_id,current);}return Array.from(map.values());},[items]);
  const dueMicro=microReviews.filter(r=>new Date(r.next_micro_review_at).getTime()<=Date.now()).length;

  return <section aria-labelledby="review-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B86B13]">Consolidar</p><h1 id="review-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">Revisão</h1><p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#687688]">Volte aos pontos que ainda não estão firmes. Revisar faz parte do aprendizado.</p></div>
      {microReviews.length>0&&<span className="w-fit rounded-full bg-[#FFF7E8] px-3 py-1.5 text-xs font-bold text-[#9A5C0A]">{dueMicro} disponível{dueMicro===1?"":"is"} agora</span>}
    </div>

    {!loading&&microReviews.length>0&&<section aria-labelledby="micro-review-heading" className="mt-6 rounded-[20px] bg-[#F0F5FF] p-5 sm:mt-7 sm:rounded-[22px] sm:p-7">
      <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0242D7] shadow-sm"><Icon name="review" className="h-5 w-5"/></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0242D7]">Revisão programada pelo Tutor</p><h2 id="micro-review-heading" className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Reforce o que você já estudou</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637084]">O Ensina-me usa seu histórico para agendar novas microquestões e trazer o conteúdo de volta no momento certo.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {microReviews.map(review=>{const date=new Date(review.next_micro_review_at);const due=date.getTime()<=Date.now();const diff=review.micro_current_difficulty==="advanced"?"avançada":review.micro_current_difficulty==="intermediate"?"intermediária":"inicial";return <article key={review.topic_id} className="surface-card rounded-2xl p-3.5 sm:p-4"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#96A0AD]">{review.discipline_name}</p><div className="mt-1 flex items-start justify-between gap-3"><h3 className="text-sm font-bold text-[#273547]">{review.topic_name}</h3><span className={due?"rounded-full bg-[#ECFDF3] px-2 py-1 text-[10px] font-bold text-[#187A59]":"rounded-full bg-[#F3F5F8] px-2 py-1 text-[10px] font-bold text-[#718093]"}>{due?"Agora":date.toLocaleDateString("pt-BR")}</span></div><p className="mt-2 text-xs text-[#7A8796]">Dificuldade {diff}</p><Link to="/app/disciplinas/$disciplineId/$topicId" params={{disciplineId:review.discipline_id,topicId:review.topic_id}} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0242D7] hover:underline">Abrir tópico <Icon name="arrow" className="h-3.5 w-3.5"/></Link></article>})}
      </div>
    </section>}

    {loading?<div className="mt-7 space-y-3">{[1,2,3].map(i=><div key={i} className="h-[130px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white"/>)}</div>:grouped.length===0&&microReviews.length===0?<div className="muted-panel mt-7 rounded-2xl p-9 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0242D7] shadow-sm"><Icon name="review" className="h-5 w-5"/></span><p className="mt-4 text-sm font-semibold text-[#344154]">Nenhuma revisão pendente.</p><p className="mt-1 text-sm text-[#7A8796]">Continue estudando. Quando aparecer um ponto frágil, ele virá para cá.</p></div>:<div className="mt-9">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Pontos identificados</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Onde vale voltar</h2></div>
      <div className="mt-4 space-y-4">{grouped.map(topicItems=>{const first=topicItems[0];return <article key={first.topic_id} className="surface-card rounded-2xl p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#96A0AD]">{first.discipline_name}</p><h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#273547]">{first.topic_name}</h2></div><Link to="/app/disciplinas/$disciplineId/$topicId" params={{disciplineId:first.discipline_id,topicId:first.topic_id}} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0242D7] px-3.5 py-2 text-xs font-bold sm:w-auto" text-white hover:bg-[#0038B8]">Revisar <Icon name="arrow" className="h-3.5 w-3.5"/></Link></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{topicItems.map(item=><div key={item.difficulty_tag} className="rounded-xl border border-[#F1DD9C] bg-[#FFFCF2] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#273547]">{label(item.difficulty_tag)}</p><span className="text-xs font-bold text-[#9A5C0A]">{item.count}x</span></div><p className="mt-2 text-xs leading-5 text-[#7A8796]">{item.review_status==="reviewed"?item.correct_count+" acerto"+(item.correct_count===1?"":"s")+" após a dificuldade · continue praticando.":"Pendência identificada · revise antes de avançar."}</p></div>)}</div></article>})}</div>
    </div>}
  </section>;
}
