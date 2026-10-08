import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 const auth=req.headers.get("Authorization");
 if(!auth?.startsWith("Bearer "))return json({error:"Autenticação necessária."},401);
 try{
  const url=Deno.env.get("SUPABASE_URL")??"",anon=Deno.env.get("SUPABASE_ANON_KEY")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",key=Deno.env.get("GROQ_API_KEY")?.trim();
  const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const token=auth.replace("Bearer ","").trim();
  const {data:u,error:ue}=await sb.auth.getUser(token);
  if(ue||!u.user)return json({error:"Sessão inválida."},401);
  const {data:role}=await sb.rpc("has_role",{required_role:"student"});
  if(!role)return json({error:"Somente alunos podem usar o Modo Prova."},403);
  const body=await req.json();
  const attemptId=String(body.attempt_id??"");
  if(!attemptId)return json({error:"Prova não informada."},400);

  const admin=createClient(url,service);
  const {data:attempt}=await admin.from("exam_attempts").select("id,user_id,status").eq("id",attemptId).eq("user_id",u.user.id).maybeSingle();
  if(!attempt)return json({error:"Prova não encontrada."},404);

  const {data:rows}=await admin.from("exam_attempt_answers").select("id,attempt_question_id,response_text").eq("attempt_id",attemptId).not("response_text","is",null);
  const answerRows=rows??[];
  if(!answerRows.length)return json({graded:0});

  const qids=answerRows.map((a:any)=>a.attempt_question_id);
  const {data:aq}=await admin.from("exam_attempt_questions").select("id,question_id,position").in("id",qids).order("position");
  const questionIds=(aq??[]).map((x:any)=>x.question_id);
  const {data:questions}=await admin.from("exercise_questions").select("id,question_text,feedback_hint,difficulty_tag,exercise_id,exercises!inner(topic_id)").in("id",questionIds);
  const topicIds=[...new Set((questions??[]).map((q:any)=>q.exercises?.topic_id).filter(Boolean))];
  const {data:topics}=topicIds.length?await admin.from("topics").select("id,name,description").in("id",topicIds):{data:[]};
  const topicMap=new Map((topics??[]).map((t:any)=>[t.id,t]));

  const contextParts:string[]=[];
  for(const tid of topicIds){
   const {data:m}=await admin.from("materials").select("title,introduction").eq("topic_id",tid).eq("status","published").maybeSingle();
   if(m)contextParts.push("TÓPICO: "+topicMap.get(tid)?.name+"\n"+(topicMap.get(tid)?.description??"")+"\n"+m.title+"\n"+(m.introduction??""));
  }

  const items=answerRows.map((a:any)=>{
   const aqRow=(aq??[]).find((x:any)=>x.id===a.attempt_question_id);
   const q=(questions??[]).find((x:any)=>x.id===aqRow?.question_id);
   const tid=q?.exercises?.topic_id;
   return {id:a.id,question_id:q?.id,question:q?.question_text,response:a.response_text,rubric:q?.feedback_hint??"",topic:topicMap.get(tid)?.name??""};
  }).filter((x:any)=>x.question&&x.response);

  if(!key)return json({error:"A correção discursiva ainda não está configurada."},503);

  const prompt=`Você é o CORRETOR UNIVERSITÁRIO RIGOROSO do Modo Prova do Ensina-me. Sua função é verificar se o aluno demonstrou compreensão real do que a questão cobra. Não premie esforço, extensão, fluência ou linguagem acadêmica quando o conteúdo estiver incompleto ou conceitualmente errado.

REGRA CENTRAL DE PONTUAÇÃO:
- 10/10 = PONTO TOTAL e somente pode ser atribuído quando a resposta demonstra domínio completo: responde exatamente ao comando, contém todos os elementos centrais/essenciais da rubrica, está conceitualmente correta e, quando solicitado, faz a comparação, aplicação, justificativa ou exemplo adequado.
- 9/10 = muito próxima do domínio, mas ainda existe pelo menos uma lacuna ou imprecisão relevante. É PARCIAL, não é ponto total.
- 7–8/10 = compreensão boa, porém incompleta. É PARCIAL, não é domínio.
- 5–6/10 = compreensão parcial evidente, com elementos corretos e lacunas/erros importantes.
- 1–4/10 = compreensão insuficiente, com poucos elementos corretos, erro conceitual importante ou resposta muito incompleta.
- 0/10 = não demonstrou compreensão, fugiu da questão, contradisse o conceito central ou não respondeu.
Não invente mérito que não esteja escrito. Não presuma a intenção do aluno. Se a questão pedir comparação, aplicação, justificativa ou exemplo e isso não estiver presente, a resposta não pode receber 10/10.
Uma resposta longa ou bem escrita NÃO compensa erro conceitual.
Uma resposta curta pode receber 10/10 se contiver todos os elementos essenciais.
Se houver dúvida entre duas notas, escolha a menor quando a evidência de domínio completo não estiver presente.
Apenas 10/10 é considerada resposta plenamente correta. Qualquer nota de 1 a 9 é resposta parcialmente correta e deve explicar claramente o que faltou ou precisa ser corrigido.

FEEDBACK OBRIGATÓRIO:
Diga objetivamente o que foi demonstrado corretamente, o que está errado ou ausente e o que o aluno precisa compreender para chegar ao domínio. Não use elogios genéricos como substituto de diagnóstico.

Responda SOMENTE JSON válido com a chave "grades", contendo para cada resposta: id, score (inteiro de 0 a 10) e feedback.

MATERIAL:
${contextParts.join("\n\n").slice(0,12000)}

RESPOSTAS:
${items.map((x:any)=>"ID="+x.id+"\nTÓPICO="+x.topic+"\nQUESTÃO="+x.question+"\nRUBRICA="+x.rubric+"\nRESPOSTA="+x.response).join("\n\n").slice(0,14000)}`;

  const resp=await fetch("https://api.groq.com/openai/v1/chat/completions",{
   method:"POST",
   headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},
   body:JSON.stringify({
    model:"openai/gpt-oss-20b",
    messages:[{role:"system",content:prompt},{role:"user",content:"Corrija agora todas as respostas discursivas com o critério rigoroso acima."}],
    temperature:.1,
    reasoning_effort:"low",
    max_completion_tokens:3000,
    response_format:{type:"json_object"}
   })
  });

  if(resp.status===429)return json({error:"A IA está temporariamente no limite para corrigir as discursivas.",retryable:true},429);
  if(!resp.ok)return json({error:"Não foi possível corrigir as respostas discursivas agora.",retryable:true},503);

  const p=await resp.json();
  let parsed:any;
  try{parsed=JSON.parse(p?.choices?.[0]?.message?.content??"{}");}
  catch{return json({error:"A correção retornou um formato inválido."},503);}

  const grades=Array.isArray(parsed.grades)?parsed.grades:[];
  if(grades.length<items.length)return json({error:"A IA não devolveu a correção de todas as respostas."},503);

  for(const g of grades){
   const id=String(g.id??"");
   const score=Math.max(0,Math.min(10,Math.round(Number(g.score))));
   const feedback=typeof g.feedback==="string"?g.feedback.trim():"";
   const answer=items.find((x:any)=>x.id===id);
   if(!answer||!Number.isFinite(score)||!feedback)continue;
   await admin.from("exam_attempt_answers")
    .update({rubric_score:score,is_correct:score===10,ai_feedback:feedback})
    .eq("id",id).eq("attempt_id",attemptId);
  }

  return json({graded:items.length,full_credit_threshold:10,partial_credit_range:[1,9]});
 }catch(e){
  console.error("[grade-exam]",e);
  return json({error:"Não foi possível corrigir as discursivas agora.",retryable:true},500);
 }
});