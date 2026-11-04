/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function out(status:number, body:Record<string,unknown>) {
  return new Response(JSON.stringify(body), {status, headers});
}
Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers});
  if (req.method !== "POST") return out(405,{error:"Método não permitido."});
  const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY");
  const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if (!url || !anon || !token) return out(401,{error:"Sessão autenticada obrigatória."});
  const db=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await db.auth.getUser(token);
  if(userError || !userData.user) return out(401,{error:"Sessão inválida."});
  const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",userData.user.id).eq("role","admin").maybeSingle();
  if(roleError || !role) return out(403,{error:"Acesso restrito a administrador."});
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return out(400,{error:"JSON inválido."});}
  const id=typeof body.material_id==="string"?body.material_id:"";
  if(!id) return out(400,{error:"material_id obrigatório."});
  const {data:material,error:me}=await db.from("materials").select("id,title,status,topic_id").eq("id",id).maybeSingle();
  if(me || !material) return out(404,{error:"Material não encontrado."});
  const {data:citations,error:ce}=await db.from("material_citations").select("id,source_id,section_id,citation_label,locator,supported_claim,evidence_excerpt,relevance_note,verification_status").eq("material_id",id);
  if(ce) return out(500,{error:"Falha ao consultar citações."});
  const sourceIds=[...new Set((citations??[]).map((c:any)=>c.source_id))];
  const {data:sources,error:se}=sourceIds.length?await db.from("sources").select("id,title,authors,publisher,publication_date,doi,canonical_url,verification_method,verification_evidence,verification_status").in("id",sourceIds):{data:[],error:null};
  if(se) return out(500,{error:"Falha ao consultar fontes."});
  const badSources=(sources??[]).filter((s:any)=>!s.title||!Array.isArray(s.authors)||!s.authors.length||!s.publisher||(!s.doi&&!s.canonical_url)||!s.verification_method||!s.verification_evidence||s.verification_status!=="verified");
  const badCitations=(citations??[]).filter((c:any)=>!c.locator||!c.supported_claim||!c.evidence_excerpt||!c.relevance_note||c.verification_status!=="approved");
  const {data:topic}=await db.from("topics").select("id,published,discipline_id").eq("id",material.topic_id).maybeSingle();
  const {data:discipline}=topic?.discipline_id?await db.from("disciplines").select("id,published,course_id").eq("id",topic.discipline_id).maybeSingle():{data:null};
  const {data:course}=discipline?.course_id?await db.from("courses").select("id,published").eq("id",discipline.course_id).maybeSingle():{data:null};
  const hierarchy={topic_published:!!topic?.published,discipline_published:!!discipline?.published,course_published:!!course?.published};
  const {data:sections}=await db.from("material_sections").select("id,title,content").eq("material_id",id);
  const verifiedSourceIds=new Set((sources??[]).filter((s:any)=>s.verification_status==="verified").map((s:any)=>s.id));
  const approvedSectionIds=new Set((citations??[]).filter((c:any)=>c.verification_status==="approved"&&verifiedSourceIds.has(c.source_id)&&c.section_id).map((c:any)=>c.section_id));
  const sectionQuality=sections?.length===10&&(sections??[]).every((s:any)=>!!s.title&&String(s.content??"").trim().length>=180&&!String(s.content??"").includes("{{TOPICO}}")&&!/prática em preparação|avaliação formal em preparação|as questões serão revisadas/i.test(String(s.content??"")));
  const sectionCoverage=sections?.length===10&&(sections??[]).every((s:any)=>approvedSectionIds.has(s.id));
  const eligible=(citations?.length??0)>0&&badSources.length===0&&badCitations.length===0&&sectionQuality&&sectionCoverage&&!!topic?.published&&!!discipline?.published&&!!course?.published;
  if(body.action==="audit_material") return out(200,{material,citation_count:citations?.length??0,source_count:sources?.length??0,invalid_source_count:badSources.length,invalid_citation_count:badCitations.length,section_count:sections?.length??0,section_quality:!!sectionQuality,section_coverage:!!sectionCoverage,hierarchy,eligible_for_publication:eligible,sources,citations,sections});
  if(body.action==="approve_material") return out(410,{error:"Aprovação automática por preenchimento de campos foi desativada. A fonte e a citação precisam ser verificadas documentalmente antes de receber status aprovado."});
  if(body.action!=="publish_material") return out(400,{error:"Ação inválida. Use audit_material ou publish_material."});
  if(material.status==="published") return out(409,{error:"Material já publicado."});
  if(!eligible) return out(422,{error:"Publicação bloqueada: existem fontes/citações pendentes ou hierarquia curricular não publicada.",invalid_source_count:badSources.length,invalid_citation_count:badCitations.length,hierarchy});
  const {error:pe}=await db.from("materials").update({status:"published",updated_at:new Date().toISOString()}).eq("id",id);
  if(pe) return out(422,{error:"O banco bloqueou a publicação.",detail:pe.message});
  return out(200,{success:true,material_id:id,status:"published",source_count:sources?.length??0,citation_count:citations?.length??0});
});