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
  const {data:attempt,error:attemptError}=await admin.from("exam_attempts").select("id,user_id,status").eq("id",attemptId).eq("user_id",u.user.id).maybeSingle();
  if(attemptError)return json({error:"Não foi possível validar a prova."},500);
  if(!attempt)return json({error:"Prova não encontrada."},404);
  if(attempt.status!=="in_progress")return json({error:"Esta prova não está mais aberta para correção."},409);

  // Regrade only answers that have not already been graded. Editing an answer
  // resets rubric_score, so legitimate retries remain possible after a change.
  const {data:rows,error:rowsError}=await admin.from("exam_attempt_answers")
   .select("id,attempt_question_id,response_text")
   .eq("attempt_id",attemptId)
   .not("response_text","is",null)
   .is("rubric_score",null);
  if(rowsError)return json({error:"Não foi possível carregar as respostas discursivas."},500);
  const answerRows=rows??[];
  if(!answerRows.length)return json({graded:0});

  const qids=answerRows.map((a)=>a.attempt_question_id);
  const {data:aq}=await admin.from("exam_attempt_questions").select("id,question_id,position").in("id",qids).order("position");
  const questionIds=(aq??[]).map((x)=>x.question_id);
  const {data:questions}=await admin.from("exercise_questions").select("id,question_text,feedback_hint,difficulty_tag,exercise_id,exercises!inner(topic_id)").in("id",questionIds);
  const topicIds=[...new Set((questions??[]).map((q)=>q.exercises?.topic_id).filter(Boolean))];
  const {data:topics}=topicIds.length?await admin.from("topics").select("id,name,description").in("id",topicIds):{data:[]};
  const topicMap=new Map((topics??[]).map((t)=>[t.id,t]));

  const contextParts:string[]=[];
  for(const tid of topicIds){
   const {data:m}=await admin.from("materials").select("title,introduction").eq("topic_id",tid).eq("status","published").maybeSingle();
   if(m)contextParts.push("TÓPICO: "+topicMap.get(tid)?.name+"\n"+(topicMap.get(tid)?.description??"")+"\n"+m.title+"\n"+(m.introduction??""));
  }

  const expectedLines=(question:string)=>{const q=question.toLowerCase();if(/\b(compare|diferenc|relacione|distinga|contraste)\b/.test(q))return 4;if(/\b(analise|analisar|avalie|discuta|justifique|aplique|proponha|exemplifique)\b/.test(q))return 5;if(/\b(explique|descreva|como funciona|por que|por quê)\b/.test(q))return 3;return 2;};
  const items=answerRows.map((a)=>{
   const aqRow=(aq??[]).find((x)=>x.id===a.attempt_question_id);
   const q=(questions??[]).find((x)=>x.id===aqRow?.question_id);
   const tid=q?.exercises?.topic_id;
   return {id:a.id,question_id:q?.id,question:q?.question_text,response:a.response_text,rubric:q?.feedback_hint??"",topic:topicMap.get(tid)?.name??"",minimum_lines:expectedLines(q?.question_text??"")};
  }).filter((x)=>x.question&&x.response);

  if(!items.length)return json({graded:0});
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
Uma resposta curta pode receber 10/10 se contiver todos os elementos essenciais. Porém, quando a questão exigir explicação, comparação, análise, aplicação ou justificativa, a resposta também precisa ter desenvolvimento suficiente para demonstrar essa competência. Quantidade de linhas nunca substitui conteúdo.
Se houver dúvida entre duas notas, escolha a menor quando a evidência de domínio completo não estiver presente. Para definição simples, uma resposta curta pode ser suficiente. Para explicação, comparação, análise, aplicação ou justificativa, uma resposta excessivamente curta que não desenvolva o que foi solicitado não pode receber 10/10.
Apenas 10/10 é considerada resposta plenamente correta. Qualquer nota de 1 a 9 é resposta parcialmente correta e deve explicar claramente o que faltou ou precisa ser corrigido.

FEEDBACK OBRIGATÓRIO:
Diga objetivamente o que foi demonstrado corretamente, o que está errado ou ausente e o que o aluno precisa compreender para chegar ao domínio. Não use elogios genéricos como substituto de diagnóstico.

Responda SOMENTE JSON válido com a chave "grades", contendo para cada resposta: id, score (inteiro de 0 a 10) e feedback.

MATERIAL:
${contextParts.join("\n\n").slice(0,12000)}

RESPOSTAS:
${items.map((x)=>"ID="+x.id+"\nTÓPICO="+x.topic+"\nQUESTÃO="+x.question+"\nRUBRICA="+x.rubric+"\nRESPOSTA="+x.response).join("\n\n").slice(0,14000)}`;

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
  let parsed: Record<string, unknown>;
  try{parsed=JSON.parse(p?.choices?.[0]?.message?.content??"{}");}
  catch{return json({error:"A correção retornou um formato inválido."},503);}

  const grades=Array.isArray(parsed.grades)?parsed.grades:[];
  if(grades.length!==items.length)return json({error:"A IA não devolveu exatamente a correção de todas as respostas."},503);

  // Validate the entire model response before writing any scores.
  const expectedIds=new Set(items.map((item)=>item.id));
  const validatedGrades=new Map<string,{score:number;feedback:string}>();
  for(const value of grades){
   if(!value||typeof value!=="object"||Array.isArray(value))return json({error:"A correção retornou um formato inválido."},503);
   const g=value as Record<string,unknown>;
   const id=typeof g.id==="string"?g.id:"";
   const score=g.score;
   const feedback=typeof g.feedback==="string"?g.feedback.trim():"";
   if(!expectedIds.has(id)||validatedGrades.has(id)||typeof score!=="number"||!Number.isInteger(score)||score<0||score>10||!feedback){
    return json({error:"A correção retornou notas ou feedbacks inválidos."},503);
   }
   validatedGrades.set(id,{score,feedback});
  }
  if(validatedGrades.size!==items.length)return json({error:"A correção não corresponde a todas as respostas."},503);

  let graded=0;
  for(const item of items){
   const grade=validatedGrades.get(item.id);
   if(!grade)return json({error:"Faltou a correção de uma resposta."},503);
   const {data:updated,error:updateError}=await admin.from("exam_attempt_answers")
    .update({rubric_score:grade.score,is_correct:grade.score===10,ai_feedback:grade.feedback})
    .eq("id",item.id)
    .eq("attempt_id",attemptId)
    .is("rubric_score",null)
    .select("id")
    .maybeSingle();
   if(updateError){
    console.error("[grade-exam] Falha ao salvar correção:",updateError.code,updateError.message);
    return json({error:"Não foi possível salvar a correção das respostas."},500);
   }
   if(updated)graded++;
  }

  return json({graded,requested:items.length,full_credit_threshold:10,partial_credit_range:[1,9]});
 }catch(e){
  console.error("[grade-exam]",e);
  return json({error:"Não foi possível corrigir as discursivas agora.",retryable:true},500);
 }
});