import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
type Item={type:"multiple_choice"|"open_text";topic_id:string;question_text:string;options:string[];correct_option_index:number|null;explanation:string;difficulty:"introductory"|"intermediate"|"advanced";concept_tags:string[];rubric:string[];minimum_lines?:number};
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
  const essayCount=({5:1,10:2,15:3,20:3} as Record<number,number>)[count]??0; const objectiveCount=count-essayCount;
  if(![5,10,15,20].includes(count))return json({error:"A prova deve ter 5, 10, 15 ou 20 questões."},400);
  if(duration<0||duration>7200)return json({error:"Tempo inválido."},400);
  let query=sb.from("topics").select("id,name,description,discipline_id").eq("published",true);
  if(disciplineId)query=query.eq("discipline_id",disciplineId);
  if(topicIds.length)query=query.in("id",topicIds);
  const {data:topics,error:te}=await query; if(te||!topics?.length)return json({error:"Selecione ao menos um tópico válido."},400);
  const allowed=new Set(topics.map(t=>t.id));
  const {data:recent}=await sb.from("exam_attempt_questions").select("question_id,exam_attempts!inner(user_id)").eq("exam_attempts.user_id",u.user.id).order("created_at",{ascending:false}).limit(120);
  const recentIds=new Set((recent??[]).map((x)=>x.question_id));
  const {data:existing}=await sb.from("exercise_questions").select("id,question_text,question_type,difficulty_tag,exercises!inner(topic_id,exercise_type,published)").in("exercises.topic_id",[...allowed]).in("question_type",["multiple_choice","open_text"]);
  const pool=(existing??[]).filter((q)=>q.exercises?.published===true&&!recentIds.has(q.id));
  const obj=pool.filter((q)=>q.question_type==="multiple_choice").sort(()=>Math.random()-.5).slice(0,objectiveCount);
  const essay=pool.filter((q)=>q.question_type==="open_text").sort(()=>Math.random()-.5).slice(0,essayCount);
  const needObj=objectiveCount-obj.length,needEssay=essayCount-essay.length;
  let generated:Item[]=[];
  if(needObj+needEssay){
   if(!key)return json({error:"A geração complementar ainda não está configurada."},503);
   const contexts:string[]=[];
   // Carrega materiais e seções em lote: evita 2–3 round-trips sequenciais por tópico.
   const contextTopics=topics.slice(0,20);
   const contextTopicIds=contextTopics.map((topic)=>topic.id);
   const {data:materials}=await sb.from("materials").select("id,topic_id,title,introduction").in("topic_id",contextTopicIds).eq("status","published");
   const materialRows=materials??[];
   const materialIds=materialRows.map((material)=>material.id);
   const {data:sections}=materialIds.length
    ? await sb.from("material_sections").select("material_id,title,content,position").in("material_id",materialIds).order("position").limit(240)
    : {data:[]};
   const sectionsByMaterial=new Map<string,Array<{title:string;content:string;position:number}>>();
   for(const section of sections??[]){
    const group=sectionsByMaterial.get(section.material_id)??[];
    if(group.length<12)group.push(section);
    sectionsByMaterial.set(section.material_id,group);
   }
   const materialByTopic=new Map(materialRows.map((material)=>[material.topic_id,material]));
   for(const topic of contextTopics){
    const material=materialByTopic.get(topic.id);
    const topicSections=material?sectionsByMaterial.get(material.id)??[]:[];
    contexts.push("TOPIC_ID="+topic.id+"\nTÓPICO="+topic.name+"\n"+(topic.description??"")+"\n"+(material?.title??"")+"\n"+(material?.introduction??"")+"\n"+topicSections.map((section)=>section.title+"\n"+section.content).join("\n"));
   }
   const prompt=`Você é avaliador universitário do Ensina-me. Gere EXATAMENTE ${needObj} questões objetivas e EXATAMENTE ${needEssay} questões discursivas, nem mais nem menos. Use somente o material acadêmico fornecido; não invente fatos. Cada questão deve usar um topic_id que corresponda exatamente a um TOPIC_ID fornecido.\n\nFORMATO OBRIGATÓRIO: responda somente JSON válido neste formato: {"questions":[{"type":"multiple_choice","topic_id":"ID_REAL_DO_TÓPICO","question_text":"enunciado","options":["A","B","C","D"],"correct_option_index":0,"explanation":"justificativa acadêmica","difficulty":"intermediate","concept_tags":["conceito"],"rubric":[]},{"type":"open_text","topic_id":"ID_REAL_DO_TÓPICO","question_text":"enunciado discursivo","options":[],"correct_option_index":null,"explanation":"resposta esperada","difficulty":"intermediate","concept_tags":["conceito"],"rubric":["critério 1","critério 2","critério 3","critério 4","critério 5"],"minimum_lines":3}]}. Use type exatamente como escrito: "multiple_choice" ou "open_text", nunca "discursive", "essay" ou "question_type".\n\nCada objetiva deve ter exatamente 4 alternativas e uma única correta. Cada discursiva deve exigir construção autoral, incluir pelo menos 5 critérios de rubrica e minimum_lines: 2 para definição, 3 para explicação, 4 para comparação, 5 para análise/aplicação/justificativa. Varie compreensão, aplicação e análise. Não repita questões existentes. Confira a quantidade e o tipo de todas as questões antes de responder.\n\nMATERIAL:\n${contexts.join("\n\n").slice(0,14000)}\n\nQUESTÕES EXISTENTES A EVITAR:\n${pool.slice(0,100).map((q)=>q.question_text).join("\n").slice(0,7000)}`;
   const resp=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"system",content:prompt},{role:"user",content:"Gere somente JSON válido."}],temperature:.25,reasoning_effort:"low",max_completion_tokens:5000,response_format:{type:"json_object"}})});
   if(resp.status===429)return json({error:"A IA está temporariamente no limite. Tente novamente em alguns instantes.",retryable:true},429);
   if(!resp.ok)return json({error:"Não foi possível preparar as questões complementares agora.",retryable:true},503);
   const p=await resp.json(); let parsed; try{parsed=JSON.parse(p?.choices?.[0]?.message?.content??"{}");}catch{return json({error:"A geração retornou um formato inválido. Tente novamente."},503);}
   generated=(Array.isArray(parsed.questions)?parsed.questions:[]).filter((q)=>allowed.has(q.topic_id)&&typeof q.question_text==="string"&&q.question_text.trim()&&((q.type==="multiple_choice"&&Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.correct_option_index)&&q.correct_option_index>=0&&q.correct_option_index<4)||(q.type==="open_text"&&(!q.options||q.options.length===0)&&Array.isArray(q.rubric)&&q.rubric.length>=3)));
   const uniq=new Set<string>(); generated=generated.filter(q=>{const n=norm(q.question_text);if(uniq.has(n))return false;uniq.add(n);return true;});
   const generatedObj=generated.filter(q=>q.type==="multiple_choice");
   const generatedEssay=generated.filter(q=>q.type==="open_text");
   // A composição híbrida é obrigatória. Se a primeira geração devolver objetivas demais,
   // fazemos uma chamada dedicada para discursivas em vez de iniciar uma prova sem elas.
   if(generatedEssay.length<needEssay){
    const essayPrompt=`Você é avaliador universitário do Ensina-me. Gere EXATAMENTE ${needEssay-generatedEssay.length} questões DISCURSIVAS adicionais. Não gere nenhuma objetiva. Use somente o material acadêmico fornecido e não invente fatos. Cada questão deve exigir construção de resposta e avaliar explicação, comparação, análise, aplicação ou justificativa. Cada questão deve conter uma rubrica com pelo menos 3 critérios e minimum_lines: 2 para definição, 3 para explicação, 4 para comparação e 5 para análise/aplicação/justificativa. Cada questão deve usar um TOPIC_ID fornecido. Responda JSON válido com a chave questions e type=open_text em todas as questões.

MATERIAL:
${contexts.join("\n\n").slice(0,14000)}`;
    const essayResp=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"system",content:essayPrompt},{role:"user",content:"Gere somente JSON válido, contendo exclusivamente questões discursivas."}],temperature:.2,reasoning_effort:"low",max_completion_tokens:3500,response_format:{type:"json_object"}})});
    if(essayResp.status===429)return json({error:"A IA está temporariamente no limite. Tente novamente em alguns instantes.",retryable:true},429);
    if(!essayResp.ok)return json({error:"Não foi possível gerar as questões discursivas da prova agora.",retryable:true},503);
    const ep=await essayResp.json(); let parsedEssay; try{parsedEssay=JSON.parse(ep?.choices?.[0]?.message?.content??"{}");}catch{return json({error:"A geração das questões discursivas retornou um formato inválido. Tente novamente."},503);}
    const extraEssay=(Array.isArray(parsedEssay.questions)?parsedEssay.questions:[]).filter((q)=>allowed.has(q.topic_id)&&q.type==="open_text"&&typeof q.question_text==="string"&&q.question_text.trim()&&Array.isArray(q.rubric)&&q.rubric.length>=3);
    const existingTexts=new Set(generated.map(q=>norm(q.question_text)));
    for(const q of extraEssay){if(generatedEssay.length>=needEssay)break;const n=norm(q.question_text);if(existingTexts.has(n))continue;existingTexts.add(n);generatedEssay.push(q);}
    generated=[...generatedObj,...generatedEssay];
   }
   if(generatedObj.length<needObj||generatedEssay.length<needEssay)return json({error:"Não foi possível completar a composição híbrida da prova. As questões discursivas são obrigatórias para esta quantidade.",retryable:true},503);
  }
  const admin=createClient(url,service);
  const {data:attempt,error:ae}=await admin.from("exam_attempts").insert({user_id:u.user.id,discipline_id:disciplineId,total_questions:count,duration_seconds:duration||null}).select("id").single();
  if(ae||!attempt)return json({error:"Não foi possível iniciar a prova."},500);
  const all =[...obj,...essay];
  const generatedExercises=new Map<string,string>();
  for(const g of generated){
   let exId=generatedExercises.get(g.topic_id);
   if(!exId){
    const t=topics.find(x=>x.id===g.topic_id);
    const exerciseDifficulty = g.difficulty === "introductory" ? "easy" : g.difficulty === "advanced" ? "hard" : "medium";
    const {data:ex,error:ee}=await admin.from("exercises").insert({topic_id:g.topic_id,title:"Questões complementares — Modo Prova",exercise_type:"evaluation",content:"Questões geradas a partir do material acadêmico publicado do tópico.",difficulty:exerciseDifficulty,position:999,published:false}).select("id").single();
    if(ee||!ex){console.error("[prepare-exam] Falha ao criar exercício complementar:",ee?.code,ee?.message,ee?.details);await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível salvar o exercício complementar. Tente novamente."},500);}
    exId=ex.id;generatedExercises.set(g.topic_id,exId);
   }
   const {data:q,error:qe}=await admin.from("exercise_questions").insert({exercise_id:exId,question_text:g.question_text,question_type:g.type,position:Math.floor(Math.random()*100000),feedback_hint:g.type==="open_text"?g.rubric.join(" | "):g.explanation,difficulty_tag:g.concept_tags}).select("id").single();
   if(qe||!q){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível salvar uma questão complementar."},500);}
   all.push({...g,id:q.id});
   if(g.type==="multiple_choice"){
    const {error:oe}=await admin.from("exercise_options").insert(g.options.map((content,i)=>({question_id:q.id,content,is_correct:i===g.correct_option_index,feedback_correct:i===g.correct_option_index?g.explanation:null,position:i})));
    if(oe){console.error("[prepare-exam] Falha ao salvar alternativas:",oe.code,oe.message,oe.details);await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível salvar as alternativas de uma questão."},500);}
   }
  }
  const chosen=all.sort(()=>Math.random()-.5).slice(0,count);
  if(chosen.filter((q)=>q.question_type==="multiple_choice"||q.type==="multiple_choice").length!==objectiveCount||chosen.filter((q)=>q.question_type==="open_text"||q.type==="open_text").length!==essayCount){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível montar a composição híbrida da prova."},503);}
  const {data:inserted,error:ie}=await admin.from("exam_attempt_questions").insert(chosen.map((q,i)=>({attempt_id:attempt.id,question_id:q.id,position:i+1}))).select("id,question_id,position");
  if(ie||!inserted){await admin.from("exam_attempts").delete().eq("id",attempt.id);return json({error:"Não foi possível montar a prova."},500);}
  const ids=chosen.map((q)=>q.id); const {data:opts}=await admin.from("exercise_options").select("id,question_id,content").in("question_id",ids).order("position");
  const questions=chosen.map((q)=>{const row=inserted.find((x)=>x.question_id===q.id);const text=String(q.question_text??"");const minimum_lines=Number.isInteger(q.minimum_lines)&&q.minimum_lines>=1&&q.minimum_lines<=8?q.minimum_lines:/\\b(compare|diferenc|relacione|distinga|contraste)\\b/i.test(text)?4:/\\b(analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique)\\b/i.test(text)?5:/\\b(explique|descreva|como funciona|por que|por quê)\\b/i.test(text)?3:2;return{id:q.id,attempt_question_id:row.id,position:row.position,question_text:text,question_type:q.question_type??q.type,minimum_lines:q.question_type==="open_text"||q.type==="open_text"?minimum_lines:undefined,options:(opts??[]).filter((o)=>o.question_id===q.id)};});
  return json({attempt_id:attempt.id,total_questions:count,objective_questions:objectiveCount,discursive_questions:essayCount,questions});
 }catch(e){console.error("[prepare-exam]",e);return json({error:"Não foi possível preparar a prova agora.",retryable:true},500);}
});