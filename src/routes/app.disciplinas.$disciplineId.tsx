import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StudentDiscipline { id:string; discipline_name:string; course:string; }
interface OfficialDiscipline { id:string; name:string; }
interface Topic { id:string; name:string; description:string|null; position:number; }
interface TopicLearningState { topic_id:string; progress:number; best_score:number|null; status:string; review_count:number; }

function normalize(str:string){return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}

export const Route=createFileRoute("/app/disciplinas/$disciplineId")({component:DisciplineDetailPage});

function Icon({name,className=""}:{name:"book"|"back"|"arrow";className?:string}){
  const paths={
    book:<><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17"/><path d="M9 6h7"/></>,
    back:<><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></>,
    arrow:<><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function TopicsList({topics,officialDisciplineId,learningState}:{topics:Topic[];officialDisciplineId:string;learningState:Record<string,TopicLearningState>}){
  if(topics.length===0)return <div className="muted-panel mt-6 rounded-2xl p-7 text-center"><p className="text-sm font-semibold text-[#344154]">Nenhum tópico publicado nesta disciplina.</p></div>;
  return <div className="mt-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Conteúdo da disciplina</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Tópicos de aprendizagem</h2></div><span className="rounded-full bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#657385]">{topics.length} tópicos</span></div>
    <p className="mt-2 text-sm text-[#718093]">Avance pelo percurso e volte aos tópicos sempre que precisar.</p>
    <div className="mt-4 space-y-3">
      {topics.map((topic,index)=>{
        const state=learningState[topic.id];
        const progress=state?.progress??0;
        const statusLabel=state?.review_count&&state.review_count>0?"Revisar":state?.best_score!==null&&state?.best_score!==undefined?"Avaliado":state?.status==="in_progress"?"Em andamento":progress>=100?"Concluído":"Não iniciado";
        const statusClass=state?.review_count&&state.review_count>0?"bg-[#FFF7E8] text-[#A15D0B]":progress>=100?"bg-[#ECFDF3] text-[#187A59]":"bg-[#F3F5F8] text-[#657385]";
        return <Link key={topic.id} to="/app/disciplinas/$disciplineId/$topicId" params={{disciplineId:officialDisciplineId,topicId:topic.id}} className="surface-card surface-card-hover group block rounded-2xl p-4 focus-visible:outline-none sm:p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F7FA] text-xs font-bold text-[#8793A0]">{String(index+1).padStart(2,"0")}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#253447] sm:text-[15px]">{topic.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span></div>
              {topic.description&&<p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#7A8796]">{topic.description}</p>}
            </div>
            <Icon name="arrow" className="mt-1 h-4 w-4 shrink-0 text-[#A0AAB7] transition-colors group-hover:text-[#0242D7]"/>
          </div>
          <div className="mt-4 flex items-center gap-3 pl-[52px]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E9EEF5]"><div className="h-full rounded-full bg-[#0242D7]" style={{width:progress+"%"}}/></div>
            <span className="text-[11px] font-bold text-[#0242D7]">{progress}%</span>
          </div>
          {(state?.best_score!==null&&state?.best_score!==undefined)||state?.review_count? <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pl-[52px] text-[11px] text-[#8490A0]">
            {state?.best_score!==null&&state?.best_score!==undefined&&<span>Melhor avaliação: <strong className="text-[#516074]">{state.best_score}%</strong></span>}
            {state?.review_count?<span className="font-semibold text-[#A15D0B]">{state.review_count} ponto{state.review_count===1?"":"s"} para revisar</span>:null}
          </div>:null}
        </Link>;
      })}
    </div>
  </div>;
}

function DisciplineDetailPage(){
  const matchRoute = useMatchRoute();
  const hasTopicChild = Boolean(matchRoute({ to: "/app/disciplinas/$disciplineId/$topicId" }));
  const {disciplineId}=Route.useParams();
  const [studentDisc,setStudentDisc]=useState<StudentDiscipline|null>(null);
  const [officialDiscName,setOfficialDiscName]=useState<string|null>(null);
  const [officialDiscId,setOfficialDiscId]=useState<string|null>(null);
  const [topics,setTopics]=useState<Topic[]>([]);
  const [learningState,setLearningState]=useState<Record<string,TopicLearningState>>({});
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const [error,setError]=useState(false);

  useEffect(()=>{
    void (async()=>{
      setLoading(true);setNotFound(false);setError(false);
      const {data:sessionData}=await supabase.auth.getSession();
      if(!sessionData.session){setLoading(false);return;}
      const userId=sessionData.session.user.id;
      const {data:studentDiscData,error:studentDiscError}=await supabase.from("student_disciplines").select("id,discipline_name,course").eq("id",disciplineId).eq("user_id",userId).maybeSingle();
      if(studentDiscError){setError(true);setLoading(false);return;}

      let official:OfficialDiscipline;
      if(studentDiscData){
        const student=studentDiscData as StudentDiscipline;
        setStudentDisc(student);

        const {data:profileData,error:profileError}=await supabase
          .from("student_profiles")
          .select("course_id")
          .eq("user_id",userId)
          .maybeSingle();

        if(profileError){
          setError(true);
          setLoading(false);
          return;
        }

        let officialData:null|{id:string;name:string}=null;

        if(profileData?.course_id){
          const {data:directData,error:directError}=await supabase
            .from("disciplines")
            .select("id,name")
            .eq("course_id",profileData.course_id)
            .eq("name",student.discipline_name)
            .eq("published",true)
            .maybeSingle();

          if(directError){
            setError(true);
            setLoading(false);
            return;
          }
          officialData=directData;
        }

        if(!officialData){
          const {data:aliasData,error:aliasError}=await supabase
            .from("discipline_aliases")
            .select("discipline_id")
            .eq("normalized_alias",normalize(student.discipline_name));

          if(aliasError){
            setError(true);
            setLoading(false);
            return;
          }

          if(!aliasData || aliasData.length!==1){
            setNotFound(true);
            setLoading(false);
            return;
          }

          const {data:resolvedData,error:resolvedError}=await supabase
            .from("disciplines")
            .select("id,name")
            .eq("id",aliasData[0].discipline_id)
            .eq("published",true)
            .maybeSingle();

          if(resolvedError){
            setError(true);
            setLoading(false);
            return;
          }

          officialData=resolvedData;
        }

        if(!officialData){
          setNotFound(true);
          setLoading(false);
          return;
        }

        official=officialData as OfficialDiscipline;
      }else{
        const {data:officialData}=await supabase.from("disciplines").select("id,name").eq("id",disciplineId).eq("published",true).maybeSingle();
        if(!officialData){setNotFound(true);setLoading(false);return;}
        official=officialData as OfficialDiscipline;
        setStudentDisc({id:official.id,discipline_name:official.name,course:"Pedagogia"});
      }
      setOfficialDiscName(official.name);setOfficialDiscId(official.id);

      const {data:topicsData,error:topicsError}=await supabase.from("topics").select("id,name,description,position").eq("discipline_id",official.id).eq("published",true).order("position",{ascending:true});
      if(topicsError){setError(true);setLoading(false);return;}
      const loaded=(topicsData as Topic[])??[];setTopics(loaded);
      const {data:dashboardTopics}=await supabase.rpc("get_student_dashboard_topics");
      const map:Record<string,TopicLearningState>={};
      for(const row of (dashboardTopics??[]) as TopicLearningState[]) if(loaded.some(t=>t.id===row.topic_id)) map[row.topic_id]=row;
      setLearningState(map);setLoading(false);
    })();
  },[disciplineId]);

  if (hasTopicChild) {
    return <Outlet />;
  }

  return <section className="app-native-screen" aria-labelledby="discipline-title">
    <div className="flex items-center gap-2 text-xs text-[#8A95A3]">
      <Link to="/app/disciplinas" className="inline-flex items-center gap-1.5 font-semibold hover:text-[#0242D7]"><Icon name="back" className="h-3.5 w-3.5"/> Disciplinas</Link>
      <span>/</span><span className="truncate text-[#596778]">{loading?"Carregando":officialDiscName??"Disciplina"}</span>
    </div>

    {loading?<div className="mt-7 space-y-3"><div className="h-8 w-40 animate-pulse rounded-lg bg-[#E6EBF2]"/><div className="h-5 w-72 animate-pulse rounded-lg bg-[#E6EBF2]"/><div className="h-4 w-32 animate-pulse rounded-lg bg-[#E6EBF2]"/></div>:
     error?<div className="mt-7 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]" role="alert">Não foi possível carregar a disciplina. Tente novamente.</div>:
     notFound?<div className="muted-panel mt-7 rounded-2xl p-8 text-center"><p className="font-semibold text-[#243245]">Disciplina não encontrada</p><Link to="/app/disciplinas" className="mt-4 inline-flex text-sm font-bold text-[#0242D7]">Voltar para disciplinas</Link></div>:
     studentDisc?<><div className="mt-7 rounded-[22px] bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-7">
       <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
         <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0242D7]">Disciplina</p><h1 id="discipline-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[34px]">{officialDiscName??studentDisc.discipline_name}</h1><p className="mt-2 text-sm text-[#718093]">{studentDisc.course}</p></div>
         <Link to="/app/catalogo" className="w-fit text-sm font-semibold text-[#0242D7] hover:underline">Ver catálogo →</Link>
       </div>
     </div>
     <TopicsList topics={topics} officialDisciplineId={officialDiscId??disciplineId} learningState={learningState}/>
     <div className="mt-9 flex flex-wrap gap-3"><Link to="/app/disciplinas" className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#556273] hover:border-[#C8D7EB] hover:text-[#0242D7]"><Icon name="back" className="h-4 w-4"/> Voltar</Link></div>
     </>:null}
  </section>;
}
