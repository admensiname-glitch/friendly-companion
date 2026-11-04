/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json", "Cache-Control":"no-store" };
const reply=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:cors});
const norm=(v:string)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const compact=(v:string)=>norm(v).replace(/\s+/g,"");
function titleSimilarity(a:string,b:string){
 const aa=new Set(norm(a).split(" ").filter(x=>x.length>2)), bb=new Set(norm(b).split(" ").filter(x=>x.length>2));
 if(!aa.size||!bb.size)return 0;
 let n=0; for(const x of aa)if(bb.has(x))n++;
 return n/Math.max(aa.size,bb.size);
}
function surname(v:any){const s=typeof v==="string"?v:typeof v?.name==="string"?v.name:"";const parts=norm(s).split(" ").filter(Boolean);return parts.at(-1)??"";}
async function verifyDoi(source:any){
 if(!source.doi)return {status:"not_checked",reason:"Fonte sem DOI; requer validação específica da URL institucional."};
 try{
  const response=await fetch("https://api.crossref.org/works/"+encodeURIComponent(source.doi),{headers:{Accept:"application/json","User-Agent":"Ensina-me/1.0 (academic evidence verification)"},signal:AbortSignal.timeout(12000)});
  if(!response.ok)return {status:"failed",reason:"Crossref HTTP "+response.status};
  const payload=await response.json(); const item=payload?.message;
  if(!item || norm(item.DOI)!==norm(source.doi))return {status:"failed",reason:"DOI não corresponde ao registro Crossref."};
  const crossTitle=Array.isArray(item.title)?String(item.title[0]??""):"";
  const similarity=titleSimilarity(source.title,crossTitle);
  const expected=(Array.isArray(source.authors)?source.authors:[]).map(surname).filter(Boolean);
  const found=(Array.isArray(item.author)?item.author:[]).map((a:any)=>surname({name:[a.given,a.family].filter(Boolean).join(" ")})).filter(Boolean);
  const authorMatches=expected.filter((x:string)=>found.includes(x)).length;
  const authorRatio=expected.length?authorMatches/expected.length:0;
  const crossrefPublishers=[item.publisher,...(Array.isArray(item["container-title"])?item["container-title"]:[])].filter((x:any)=>typeof x==="string");
  const publisherSimilarity=source.publisher?Math.max(0,...crossrefPublishers.map((x:string)=>titleSimilarity(source.publisher,x))):0;
  const publisherOk=!source.publisher || publisherSimilarity>=0.5;
  const ok=similarity>=0.9 && expected.length>0 && authorRatio>=0.5 && publisherOk;
  return {status:ok?"verified":"failed",reason:ok?"DOI, título, autoria e editora/periódico compatíveis com Crossref.":"Metadados Crossref divergentes.",doi:String(item.DOI),crossref_title:crossTitle,title_similarity:Number(similarity.toFixed(3)),author_matches:authorMatches,author_total:expected.length,author_ratio:Number(authorRatio.toFixed(3)),publisher_similarity:Number(publisherSimilarity.toFixed(3)),publisher_match:publisherOk,publisher:item.publisher??null,container_title:item["container-title"]??null};
 }catch(e){return {status:"failed",reason:e instanceof Error?e.message:"Falha ao consultar Crossref."};}
}
async function runLimited<T,R>(items:T[],limit:number,fn:(item:T)=>Promise<R>):Promise<R[]>{
 const out:R[]=[];let i=0;
 const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const index=i++;out[index]=await fn(items[index]);}});
 await Promise.all(workers);return out;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply(405,{error:"Método não permitido."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"").trim();
 if(!url||!service||!anon||!token)return reply(401,{error:"Sessão autenticada obrigatória."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const userDb=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:userError}=await admin.auth.getUser(token);const user=userData?.user;
 if(userError||!user)return reply(401,{error:"Sessão inválida."});
 const {data:role,error:roleError}=await admin.from("user_roles").select("id").eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(roleError||!role)return reply(403,{error:"Acesso administrativo negado."});
 let body:any;try{body=await req.json();}catch{return reply(400,{error:"JSON inválido."});}
 const limit=Math.max(1,Math.min(Number(body.limit)||3,5));
 const materialIds=Array.isArray(body.material_ids)?body.material_ids.filter((x:any)=>typeof x==="string").slice(0,limit):[];
 const {data:allDrafts,error:materialsError}=await admin.from("materials").select("id,title,introduction,status,topic_id,updated_at").eq("status","draft").order("updated_at",{ascending:true}).limit(1000);
 if(materialsError)return reply(500,{error:"Falha ao carregar materiais.",detail:materialsError.message});
 const {data:doneRuns,error:runReadError}=await admin.from("academic_evidence_material_runs").select("material_id,material_updated_at").limit(5000);
 if(runReadError)return reply(500,{error:"Falha ao consultar lotes já auditados.",detail:runReadError.message});
 const doneSet=new Set((doneRuns??[]).map((x:any)=>x.material_id+":"+new Date(x.material_updated_at).getTime()));
 const candidates=(allDrafts??[]).filter((m:any)=>materialIds.length?materialIds.includes(m.id):!doneSet.has(m.id+":"+new Date(m.updated_at).getTime()));
 const materials=candidates.slice(0,limit);
 const hasMore=candidates.length>materials.length;
 if(!materials.length)return reply(200,{run_id:crypto.randomUUID(),processed:[],has_more:false,message:"Todos os materiais em rascunho já receberam uma auditoria para a versão atual."});
 const runId=crypto.randomUUID();const summaries:any[]=[];
 for(const material of materials){
  const {data:citations,error:ce}=await admin.from("material_citations").select("id,source_id,section_id,locator,supported_claim,evidence_excerpt,relevance_note,verification_status").eq("material_id",material.id);
  if(ce){
   const runInsert=await admin.from("academic_evidence_material_runs").insert({run_id:runId,material_id:material.id,material_updated_at:material.updated_at,actor_id:user.id,status:"error",citation_count:0,eligible_count:0,blocked_count:0,published:false,details:{reason:"Falha ao ler citações.",error:ce.message}});
   if(runInsert.error)return reply(500,{error:"Falha ao registrar erro do material.",detail:runInsert.error.message});
   summaries.push({material_id:material.id,status:"error",reason:"Falha ao ler citações."});continue;
  }
  if(!citations?.length){
   const runInsert=await admin.from("academic_evidence_material_runs").insert({run_id:runId,material_id:material.id,material_updated_at:material.updated_at,actor_id:user.id,status:"blocked",citation_count:0,eligible_count:0,blocked_count:1,published:false,details:{reason:"Material sem citações."}});
   if(runInsert.error)return reply(500,{error:"Falha ao registrar material sem citações.",detail:runInsert.error.message});
   summaries.push({material_id:material.id,status:"blocked",reason:"Material sem citações."});continue;
  }
  const sourceIds=[...new Set(citations.map((c:any)=>c.source_id))];
  const [{data:sources},{data:docs},{data:rights}]=await Promise.all([
   admin.from("sources").select("id,title,authors,publisher,publication_date,doi,canonical_url,verification_method,verification_evidence,verification_status").in("id",sourceIds),
   admin.from("source_documents").select("id,source_id,retrieval_status,content_sha256,retrieved_at,rights_snapshot").in("source_id",sourceIds),
   admin.from("source_rights").select("source_id,rights_class,access_model,evidence_url,evidence_note,verified_at").in("source_id",sourceIds).is("superseded_at",null)
  ]);
  const docIds=(docs??[]).map((d:any)=>d.id);
  const {data:chunks}=docIds.length?await admin.from("source_chunks").select("source_document_id,content,locator").in("source_document_id",docIds):{data:[]};
  const sourceChecks=await runLimited((sources??[]),4,async(s:any)=>{
   const doi=await verifyDoi(s);
   const sourceDocs=(docs??[]).filter((d:any)=>d.source_id===s.id&&d.retrieval_status==="retrieved"&&d.content_sha256&&d.retrieved_at);
   const right=(rights??[]).find((r:any)=>r.source_id===s.id);
   const rightsOk=right && ["OPEN","USER_AUTHORIZED"].includes(right.rights_class);
   const eligible=doi.status==="verified"&&sourceDocs.length>0&&!!rightsOk;
   if(eligible && s.verification_status!=="verified"){
    const evidence=JSON.stringify({method:"Crossref DOI metadata comparison + retrieved source document + rights registry",run_id:runId,checked_at:new Date().toISOString(),crossref:doi,document_ids:sourceDocs.map((d:any)=>d.id),rights_class:right.rights_class});
    const {error}=await userDb.from("sources").update({verification_status:"verified",verification_method:"Crossref DOI + documento recuperado + direitos registrados",verification_evidence:evidence}).eq("id",s.id);
    if(error)return {source_id:s.id,status:"failed",reason:"Banco recusou verificação: "+error.message,doi,documents:sourceDocs.length,rights:right?.rights_class??"missing"};
   }
   return {source_id:s.id,status:eligible?"verified":doi.status,reason:eligible?"Identidade e proveniência verificadas.":doi.reason,doi,documents:sourceDocs.length,rights:right?.rights_class??"missing"};
  });
  const sourceMap=new Map(sourceChecks.map((x:any)=>[x.source_id,x]));
  let approved=0,blocked=0;
  const approvedSectionIds=new Set<string>();
  for(const citation of citations){
   const sourceCheck:any=sourceMap.get(citation.source_id);
   const sourceDocs=(docs??[]).filter((d:any)=>d.source_id===citation.source_id&&d.retrieval_status==="retrieved"&&d.content_sha256);
   const sourceChunkRows=(chunks??[]).filter((ch:any)=>sourceDocs.some((d:any)=>d.id===ch.source_document_id));
   const excerpt=compact(citation.evidence_excerpt??"");
   const excerptMatch=excerpt.length>=30&&sourceChunkRows.some((ch:any)=>compact(ch.content??"").includes(excerpt));
   const locator=compact(citation.locator??"");
   const locatorMatch=locator.length>=2&&sourceChunkRows.some((ch:any)=>{const l=compact(ch.locator??"");return l.length>0&&(l.includes(locator)||locator.includes(l));});
   const right=(rights??[]).find((r:any)=>r.source_id===citation.source_id);
   const rightsStatus=!right?"missing":right.rights_class==="OPEN"?"open":right.rights_class==="USER_AUTHORIZED"?"authorized":["RESTRICTED","METADATA_ONLY"].includes(right.rights_class)?"restricted":"unknown";
   const sourceOk=sourceCheck?.status==="verified";
   const eligible=sourceOk&&excerptMatch&&locatorMatch&&["open","authorized"].includes(rightsStatus)&&!!citation.supported_claim?.trim()&&!!citation.relevance_note?.trim();
   let updateError:any=null;
   if(eligible&&citation.verification_status!=="approved"){
    const u=await userDb.from("material_citations").update({verification_status:"approved"}).eq("id",citation.id);
    updateError=u.error;
   }
   const finalEligible=eligible&&!updateError;
   if(finalEligible){approved++;if(citation.section_id)approvedSectionIds.add(citation.section_id);}else blocked++;
   const auditInsert=await admin.from("academic_evidence_audits").insert({
    run_id:runId,material_id:material.id,citation_id:citation.id,source_id:citation.source_id,actor_id:user.id,
    source_identity_status:sourceCheck?.status==="verified"?"verified":sourceCheck?.status==="failed"?"failed":"not_checked",
    excerpt_status:!citation.evidence_excerpt?"missing":excerptMatch?"matched":"not_matched",
    locator_status:!citation.locator?"missing":locatorMatch?"matched":"not_matched",
    rights_status:rightsStatus,overall_status:finalEligible?"eligible":"blocked",
    evidence:{source_check:sourceCheck??null,document_count:sourceDocs.length,chunk_count:sourceChunkRows.length,excerpt_length:excerpt.length,locator: citation.locator,update_error:updateError?.message??null}
   });
   if(auditInsert.error)return reply(500,{error:"Falha ao registrar trilha de auditoria.",detail:auditInsert.error.message,run_id:runId});
  }
  const {data:sections}=await admin.from("material_sections").select("id,title,content,position").eq("material_id",material.id).order("position");
  const {data:topic}=await admin.from("topics").select("id,published,discipline_id").eq("id",material.topic_id).maybeSingle();
  const {data:discipline}=topic?.discipline_id?await admin.from("disciplines").select("id,published,course_id").eq("id",topic.discipline_id).maybeSingle():{data:null};
  const {data:course}=discipline?.course_id?await admin.from("courses").select("id,published").eq("id",discipline.course_id).maybeSingle():{data:null};
  const sectionQuality=(sections?.length===10)&&(sections??[]).every((s:any)=>String(s.content??"").trim().length>=180&&!/\{\{TOPICO\}\}|prática em preparação|avaliação formal em preparação|as questões serão revisadas/i.test(s.content));
  const allApproved=approved===citations.length && blocked===0;
  const hierarchy=!!topic?.published&&!!discipline?.published&&!!course?.published;
  let published=false,publishError=null;
  if(allApproved&&sectionQuality&&sectionCoverage&&hierarchy){
   const {error}=await userDb.from("materials").update({status:"published",updated_at:new Date().toISOString()}).eq("id",material.id);
   publishError=error?.message??null;published=!error;
  }
  const finalStatus=published?"published":blocked>0?"blocked":"validated_not_published";
  const runInsert=await admin.from("academic_evidence_material_runs").insert({run_id:runId,material_id:material.id,material_updated_at:material.updated_at,actor_id:user.id,status:finalStatus,citation_count:citations.length,eligible_count:approved,blocked_count:blocked,published,details:{section_count:sections?.length??0,section_quality:sectionQuality,section_coverage:sectionCoverage,hierarchy_published:hierarchy,publication_error:publishError}});
  if(runInsert.error)return reply(500,{error:"Falha ao registrar resultado do material.",detail:runInsert.error.message,material_id:material.id});
  summaries.push({material_id:material.id,title:material.title,citations:citations.length,eligible:approved,blocked,sections:sections?.length??0,section_quality:sectionQuality,section_coverage:sectionCoverage,hierarchy_published:hierarchy,published,publication_error:publishError,status:finalStatus});
 }
 const {count:remaining}=await admin.from("materials").select("id",{count:"exact",head:true}).eq("status","draft");
 return reply(200,{run_id:runId,actor_id:user.id,processed:summaries,remaining_draft_materials:remaining??null,has_more:hasMore,policy:"Only DOI/title/author cross-check + retrieved document + recorded usage rights + exact excerpt + matching locator can pass. No AI-only approvals."});
});