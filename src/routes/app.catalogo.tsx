import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Discipline {
  id: string;
  name: string;
  description: string | null;
  course_id: string;
  course_name?: string;
}
interface Topic { id: string; name: string; description: string | null; position: number; }

export const Route = createFileRoute("/app/catalogo")({
  component: CatalogPage,
});

function Icon({ name, className="" }: { name:"search"|"book"|"arrow"|"back"; className?:string }) {
  const paths = {
    search:<><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    book:<><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17"/><path d="M9 6h7"/></>,
    arrow:<><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></>,
    back:<><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function CatalogPage() {
  const [disciplines,setDisciplines]=useState<Discipline[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [selectedDiscipline,setSelectedDiscipline]=useState<Discipline|null>(null);
  const [topics,setTopics]=useState<Topic[]>([]);
  const [topicsLoading,setTopicsLoading]=useState(false);
  const [topicsError,setTopicsError]=useState<string|null>(null);

  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      try{
        const {data,error}=await supabase.from("disciplines").select("id,name,description,course_id,courses(name)").eq("published",true).order("name",{ascending:true});
        if(error) throw error;
        if(cancelled) return;
        const rows=(data??[]) as Array<Discipline & {courses?:{name:string}|null}>;
        setDisciplines(rows.map(row=>({...row,course_name:row.courses?.name??"Curso"})));
      }catch(error){console.error("Falha ao carregar catálogo",error);}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!selectedDiscipline){setTopics([]);setTopicsError(null);return;}
    let cancelled=false;
    void (async()=>{
      setTopicsLoading(true);setTopicsError(null);
      try{
        const {data,error}=await supabase.from("topics").select("id,name,description,position").eq("discipline_id",selectedDiscipline.id).eq("published",true).order("position",{ascending:true});
        if(error) throw error;
        if(!cancelled)setTopics((data??[]) as Topic[]);
      }catch(error){
        console.error("Falha ao carregar tópicos do catálogo",error);
        if(!cancelled)setTopicsError("Não foi possível carregar os tópicos desta disciplina.");
      }finally{if(!cancelled)setTopicsLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[selectedDiscipline]);

  const filteredDisciplines=useMemo(()=>{
    const normalized=query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    if(!normalized)return disciplines;
    return disciplines.filter(d=>(d.name+" "+(d.course_name??"")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(normalized));
  },[disciplines,query]);

  if(selectedDiscipline){
    return(
      <section aria-labelledby="catalog-discipline-title">
        <button type="button" onClick={()=>setSelectedDiscipline(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#667487] hover:text-[#0242D7]">
          <Icon name="back" className="h-4 w-4"/> Catálogo
        </button>
        <div className="mt-6 rounded-[22px] bg-[#F0F5FF] p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0242D7]">{selectedDiscipline.course_name}</p>
          <h1 id="catalog-discipline-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[34px]">{selectedDiscipline.name}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#617083]">{selectedDiscipline.description ?? "Explore os tópicos publicados desta disciplina."}</p>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B96A5]">Conteúdo</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#172334]">Tópicos para estudar</h2>
          </div>
          <span className="rounded-full bg-[#F3F5F8] px-3 py-1.5 text-xs font-bold text-[#657385]">{topics.length} tópicos</span>
        </div>

        {topicsLoading?(
          <div className="mt-4 space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-[92px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white"/>)}</div>
        ):topicsError?(
          <div className="muted-panel mt-4 rounded-2xl p-6"><p className="text-sm font-semibold text-[#334155]">{topicsError}</p><button type="button" onClick={()=>setSelectedDiscipline({...selectedDiscipline})} className="mt-3 text-sm font-bold text-[#0242D7] hover:underline">Tentar novamente</button></div>
        ):topics.length===0?(
          <div className="muted-panel mt-4 rounded-2xl p-7"><p className="text-sm font-semibold text-[#334155]">Esta disciplina ainda não possui tópicos publicados.</p></div>
        ):(
          <div className="mt-4 space-y-3">
            {topics.map((topic,index)=>(
              <Link key={topic.id} to="/app/disciplinas/$disciplineId/$topicId" params={{disciplineId:selectedDiscipline.id,topicId:topic.id}} className="surface-card surface-card-hover group flex items-center gap-4 rounded-2xl p-4 sm:p-5 focus-visible:outline-none">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F7FA] text-xs font-bold text-[#7C8998]">{String(index+1).padStart(2,"0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#243245] sm:text-[15px]">{topic.name}</p>
                  {topic.description&&<p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7A8796]">{topic.description}</p>}
                </div>
                <span className="shrink-0 text-[#9AA5B2] transition-colors group-hover:text-[#0242D7]"><Icon name="arrow" className="h-4 w-4"/></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  return(
    <section aria-labelledby="catalog-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0242D7]">Conhecimento global</p>
          <h1 id="catalog-title" className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#172334] sm:text-[36px]">Catálogo</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#687688]">Explore conteúdos publicados pelo Ensina-me, mesmo fora das suas disciplinas atuais.</p>
        </div>
        <span className="text-sm font-semibold text-[#7B8795]">{disciplines.length} disciplinas disponíveis</span>
      </div>

      <label htmlFor="catalog-search" className="surface-card mt-7 flex max-w-2xl items-center gap-3 rounded-2xl px-4 py-3.5">
        <Icon name="search" className="h-5 w-5 shrink-0 text-[#95A0AE]"/>
        <input id="catalog-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por disciplina ou curso..." className="min-w-0 flex-1 bg-transparent text-sm text-[#243245] outline-none placeholder:text-[#9AA5B2]"/>
      </label>

      {loading?(
        <div className="mt-6 grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-[156px] animate-pulse rounded-2xl border border-[#E7ECF3] bg-white"/>)}</div>
      ):filteredDisciplines.length===0?(
        <div className="muted-panel mt-6 rounded-2xl p-9 text-center"><p className="text-sm font-semibold text-[#334155]">{disciplines.length===0?"Nenhuma disciplina publicada ainda.":"Nenhuma disciplina encontrada."}</p><p className="mt-1 text-sm text-[#7A8796]">{disciplines.length>0?"Tente outro termo de busca.":""}</p></div>
      ):(
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredDisciplines.map((discipline,index)=>(
            <button key={discipline.id} type="button" onClick={()=>setSelectedDiscipline(discipline)} className="surface-card surface-card-hover group w-full rounded-2xl p-5 text-left focus-visible:outline-none sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#0242D7]"><Icon name="book" className="h-[18px] w-[18px]"/></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9AA5B2]">{discipline.course_name}</p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#243245]">{discipline.name}</h2>
                </div>
                <span className="text-[#A0AAB7] transition-colors group-hover:text-[#0242D7]"><Icon name="arrow" className="h-4 w-4"/></span>
              </div>
              <p className="mt-5 line-clamp-2 text-sm leading-6 text-[#718093]">{discipline.description ?? "Conteúdos organizados por tópicos para você estudar com clareza."}</p>
              <p className="mt-4 text-xs font-bold text-[#0242D7]">Explorar disciplina</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
