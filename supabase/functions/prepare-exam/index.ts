import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
type Item={type:"multiple_choice"|"open_text";topic_id:string;question_text:string;options:string[];correct_option_index:number|null;explanation:string;difficulty:"introductory"|"intermediate"|"advanced";concept_tags:string[];rubric:string[]};
const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 const auth=req.headers.get("Authorization"); if(!auth?.startsWith("Bearer "))return json({error:"Autenticação necessária."},401);
 try{
  const url=Deno.env.get("SUPABASE_URL")??"", anon=Deno.env.get("SUPABASE_ANON_KEY")??"", service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"", key=Deno.env.get("GROQ_API_KEY")?.trim();
  const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:u,error:ue}=await sb.auth.getUser(auth.replace("Bearer ","").trim()); if(ue||!u.user)return json({error:"Sessão inválida."},401);
  const {data:role}=await sb.rpc("has_role",{required_role:"student"}); if(!role)return json({error:"Somente alunos podem usar o Modo Prova."},403);
  const body=await req.json(); const disciplineId=body.discipline_id??null; const topicIds=Array.isArray(body.topic_ids)?body.topic_ids.filter((x:unknown)=>typeof x==="string") as string[]:[]; const count=Number(body.question_count); const duration=Number(body.duration_seconds??0);
  const essayCount=({5:1,10:3,15:4,20:6} as Record<number,number>)[count]??0; const objectiveCount=count-essayCount;
  if(![5,10,15,20].includes(count))return json({error:"A prova deve ter 5, 10, 15 ou 20 questões."},400);
  if(duration<0||duration>7200)return json({error:"Tempo inválido."},400);
  let query=sb.from("topics").select("id,name,description,discipline_id").eq("published",true);
  if(disciplineId)query=query.eq("discipline_id",disciplineId);
  if(topicIds.length)query=query.in("id",topicIds);
  const {data:topics,error:te}=await query; if(te||!topics?.length)return json({error:"Selecione ao menos um tópico válido."},400);
  const allowed=new Set(topics.map(t=>t.id));
  const {data:recent}=await sb.from("exam_attempt_questions").select("question_id,exam_attempts!inner(user_id)").eq("exam_attempts.user_id",u.user.id).order("created_at",{ascending:false}).limit(120);
  const recentIds=new Set((recent??[]).map((x:any)=>x.question_id));
  const {data:existing}=await sb.from("exercise_questions").select("id,question_text,question_type,difficulty_tag,exercises!inner(topic_id,exercise_type,published)").in("exercises.topic_id",[...allowed]).in("question_type",["multiple_choice","open_text"]);
  const pool=(existing??[]).filter((q:any)=>((q.exercises?.published===true)||(q.exercises?.exercise_type==="exam_generated"))&&!recentIds.has(q.id));
  let obj=pool.filter((q:any)=>q.question_type==="multiple_choice").sort(()=>Math.random()-.5).slice(0,objectiveCount);
  let essay=pool.filter((q:any)=>q.question_type==="open_text").sort(()=>Math.random()-.5).slice(0,essayCount);
  const needObj=objectiveCount-obj.length,needEssay=essayCount-essay.length;
  let generated:Item[]=[];
  if(needObj+needEssay){
   if(!key)return json({error:"A geração complementar ainda não está configurada."},503);
   const contexts:string[]=[];
   for(const t of topics.slice(0,20)){
    const {data:m}=await sb.from("materials").select("title,introduction").eq("topic_id",t.id).eq("status","published").maybeSingle();
    const {data:s}=m?await sb.from("material_sections").select("title,content,position").eq("material_id", (await sb.from("materials").select("id").eq("topic_id",t.id).eq("status","published").maybeSingle()).data?.id).order("position").limit(12):{data:[]};
    contexts.push("TOPIC_ID="+t.id+"\nTÓPICO="+t.name+"\n"+(t.description??"")+"\n"+(m?.title??"")+"\n"+(m?.introduction??"")+"\n"+(s??[]).map((x:any)=>x.title+"\n"+x.content).join("\n"));
   }
   const prompt=`Você é avaliador universitário do Ensina-me. Gere exatamente ${needObj} questões objetivas e ${needEssay} discursivas para completar uma prova de ${count} questões. Use somente o material acadêmico fornecido. Não invente fatos. Cada questão deve usar um TOPIC_ID fornecido. Objetivas: exatamente 4 alternativas e uma correta. Discursivas: peça explicação, comparação, aplicação ou análise e inclua 5 critérios de rubrica. Varie compreensão, aplicação e análise. Não repita questões existentes. Responda JSON com chave questions.\n\nMATERIAL:\n${contexts.join("\n\n").slice(0,14000)}\n\nQUESTÕES EXISTENTES A EVITAR:\n${pool.slice(0,100).map((q:any)=>q.question_text).join("\n").slice(0,7000)}`;
   const resp=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"system",content:prompt},{role:"user",content:"Gere somente JSON válido."}],temperature:.25,reasoning_effort:"low",max_completion_tokens:5000,response_format:{type:"json_object"}})});
   if(resp.status===429)return json({error:"A IA está temporariamente no limite. Tente novamente em alguns instantes.",retryable:true},429);
   if(!resp.ok)return json({error:"Não foi possível preparar as questões complementares agora.",retryable:true},503);
   const p=await resp.json(); let parsed:any; try{parsed=JSON.parse(p?.choices?.[0]?.message?.content??"{}");}catch{return json({error:"A geração retornou um formato inválido. Tente novamente."},503);}
   generated=(Array.isArray(parsed.questions)?parsed.questions:[]).filter((q:any)=>allowed.has(q.topic_id)&&typeof q.question_text==="string"&&q.question_text.trim()&&((q.type==="multiple_choice"&&Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.correct_option_index)&&q.correct_option_index>=0&&q.correct_option_index<4)||(q.type==="open_text"&&(!q.options||q.options.length===0)&&Array.isArray(q.rubric)&&q.rubric.length>=3)));
   const uniq=new Set<string>(); generated=generated.filter(q=>{const n=norm(q.question_text);if(uniq.has(n))return false;uniq.add(n);return true;});
   if(generated.filter(q=>q.type==="multiple_choice").length<needObj||generated.filter(q=>q.type==="open_text").length<needEssay)return json({error:"A IA não conseguiu completar a prova com questões válidas. Tente novamente."},503);
  }
  const admin=createClient(url,service);
  const {data:attempt,error:ae}=await admin.from("exam_attempts").insert({user_id:u.user.id,discipline_id:disciplineId,total_questions:count,duration_seconds:duration||null}).select("id").single();
  if(ae||!attempt)return json({error:"Não foi possível iniciar a prova."},500);
  const all:any[]=[...obj,...essay];
  const generatedExercises=new Map<string,string>();
  for(const g of generated){
   let exId=generatedExercises.get(g.topic_id);
   if(!exId){
    const t=topics.find(x=>x.id===g.topic_id);
    const {data:ex,error:ee}=await admin.from("exercises").insert({topic_id:g.topic_id,title:"Questões complementares — Modo Prova",exercise_type:"exam_generated",content:"Questões geradas a partir do material acadêmico publicado do tópico.",difficulty:g.difficulty,position:999,published:false}).select("id").single();
    if(ee||!ex){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível preparar as questões complementares."},500);}
    exId=ex.id;generatedExercises.set(g.topic_id,exId);
   }
   const {data:q,error:qe}=await admin.from("exercise_questions").insert({exercise_id:exId,question_text:g.question_text,question_type:g.type,position:Math.floor(Math.random()*100000),feedback_hint:g.type==="open_text"?g.rubric.join(" | "):g.explanation,difficulty_tag:g.concept_tags}).select("id").single();
   if(qe||!q){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível salvar uma questão complementar."},500);}
   all.push({...g,id:q.id});
   if(g.type==="multiple_choice")await admin.from("exercise_options").insert(g.options.map((content,i)=>({question_id:q.id,content,is_correct:i===g.correct_option_index,feedback_correct:i===g.correct_option_index?g.explanation:null,position:i})));
  }
  const chosen=all.sort(()=>Math.random()-.5).slice(0,count);
  if(chosen.filter((q:any)=>q.question_type==="multiple_choice"||q.type==="multiple_choice").length!==objectiveCount||chosen.filter((q:any)=>q.question_type==="open_text"||q.type==="open_text").length!==essayCount){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível montar a composição híbrida da prova."},503);}
  const {data:inserted,error:ie}=await admin.from("exam_attempt_questions").insert(chosen.map((q:any,i)=>({attempt_id:attempt.id,question_id:q.id,position:i+1}))).select("id,question_id,position");
  if(ie||!inserted){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível montar a prova."},500);}
  const ids=chosen.map((q:any)=>q.id); const {data:opts}=await admin.from("exercise_options").select("id,question_id,content").in("question_id",ids).order("position");
  const questions=chosen.map((q:any)=>{const row=inserted.find((x:any)=>x.question_id===q.id);return{id:q.id,attempt_question_id:row.id,position:row.position,question_text:q.question_text,question_type:q.question_type??q.type,options:(opts??[]).filter((o:any)=>o.question_id===q.id)};});
  return json({attempt_id:attempt.id,total_questions:count,objective_questions:objectiveCount,discursive_questions:essayCount,questions});
 }catch(e){console.error("[prepare-exam]",e);return json({error:"Não foi possível preparar a prova agora.",retryable:true},500);}
});