create schema if not exists private;

alter table public.material_sections add column if not exists section_type text not null default 'explanation';

do $$
begin
 if not exists(select 1 from pg_constraint where conname='material_sections_section_type_check') then
  alter table public.material_sections add constraint material_sections_section_type_check
  check(section_type in ('concept','explanation','deepening','examples','common_mistakes','review'));
 end if;
end $$;

create table if not exists public.evaluation_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 topic_id uuid not null references public.topics(id) on delete cascade,
 exercise_id uuid not null references public.exercises(id) on delete cascade,
 status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
 total_questions integer not null default 0 check(total_questions>=0),
 answered_questions integer not null default 0 check(answered_questions>=0),
 correct_answers integer not null default 0 check(correct_answers>=0),
 score numeric(5,2) null check(score is null or(score>=0 and score<=100)),
 started_at timestamptz not null default now(),
 completed_at timestamptz null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.evaluation_attempts enable row level security;
drop policy if exists "Students select own evaluation attempts" on public.evaluation_attempts;
create policy "Students select own evaluation attempts" on public.evaluation_attempts for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Admins select all evaluation attempts" on public.evaluation_attempts;
create policy "Admins select all evaluation attempts" on public.evaluation_attempts for select to authenticated using((select public.has_role('admin')));
create index if not exists idx_evaluation_attempts_user_topic on public.evaluation_attempts(user_id,topic_id,created_at desc);
create index if not exists idx_evaluation_attempts_user_status on public.evaluation_attempts(user_id,status);

create or replace function public.evaluation_attempts_updated_at()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trigger_evaluation_attempts_updated_at on public.evaluation_attempts;
create trigger trigger_evaluation_attempts_updated_at before update on public.evaluation_attempts for each row execute function public.evaluation_attempts_updated_at();

alter table public.exercise_answers drop constraint if exists exercise_answers_evaluation_attempt_id_fkey;
alter table public.exercise_answers add constraint exercise_answers_evaluation_attempt_id_fkey foreign key(evaluation_attempt_id) references public.evaluation_attempts(id) on delete cascade;
create index if not exists idx_exercise_answers_evaluation_attempt on public.exercise_answers(evaluation_attempt_id,question_id);

revoke all on function public.submit_application_answer(uuid,uuid,text) from anon,public;
grant execute on function public.submit_application_answer(uuid,uuid,text) to authenticated;

create or replace function public.start_topic_evaluation(_topic_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_exercise_id uuid; v_attempt_id uuid; v_total integer:=0; v_status text;
begin
 if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
 if not(select public.has_role('student')) then raise exception 'Somente alunos podem iniciar avaliações'; end if;
 select e.id into v_exercise_id from public.exercises e join public.topics t on t.id=e.topic_id where e.topic_id=_topic_id and e.exercise_type='evaluation' and e.published and t.published order by e.position limit 1;
 if v_exercise_id is null then raise exception 'Avaliação publicada não encontrada para este tópico'; end if;
 select count(*)::integer into v_total from public.exercise_questions where exercise_id=v_exercise_id;
 if v_total=0 then raise exception 'A avaliação ainda não possui questões'; end if;
 select id,status into v_attempt_id,v_status from public.evaluation_attempts where user_id=v_user_id and topic_id=_topic_id and exercise_id=v_exercise_id and status='in_progress' order by created_at desc limit 1;
 if v_attempt_id is null then
  insert into public.evaluation_attempts(user_id,topic_id,exercise_id,total_questions) values(v_user_id,_topic_id,v_exercise_id,v_total) returning id into v_attempt_id;
 end if;
 return jsonb_build_object('attempt_id',v_attempt_id,'exercise_id',v_exercise_id,'total_questions',v_total,'status',coalesce(v_status,'in_progress'));
end; $$;

create or replace function public.finalize_topic_evaluation(_attempt_id uuid,_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_user_id uuid:=auth.uid(); v_topic_id uuid; v_exercise_id uuid; v_status text; v_total integer; v_answered integer:=0; v_correct integer:=0; v_score numeric(5,2); v_item jsonb; v_qid uuid; v_oid uuid; v_qtype text; v_ok boolean; v_band text;
begin
 if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
 if not(select public.has_role('student')) then raise exception 'Somente alunos podem finalizar avaliações'; end if;
 if jsonb_typeof(_answers)<>'array' then raise exception 'Respostas da avaliação inválidas'; end if;
 select topic_id,exercise_id,status,total_questions into v_topic_id,v_exercise_id,v_status,v_total from public.evaluation_attempts where id=_attempt_id and user_id=v_user_id for update;
 if v_topic_id is null then raise exception 'Tentativa de avaliação não encontrada'; end if;
 if v_status<>'in_progress' then raise exception 'Esta tentativa já foi finalizada'; end if;
 if jsonb_array_length(_answers)<>v_total then raise exception 'A avaliação precisa ter uma resposta para cada questão'; end if;
 for v_item in select value from jsonb_array_elements(_answers) loop
  begin v_qid:=(v_item->>'question_id')::uuid; v_oid:=(v_item->>'selected_option_id')::uuid; exception when invalid_text_representation then raise exception 'Identificador de questão ou alternativa inválido'; end;
  if v_qid is null or v_oid is null then raise exception 'Cada questão precisa de uma alternativa'; end if;
  select question_type into v_qtype from public.exercise_questions where id=v_qid and exercise_id=v_exercise_id;
  if v_qtype is null or v_qtype<>'multiple_choice' then raise exception 'Questão inválida para esta avaliação'; end if;
  if exists(select 1 from public.exercise_answers where evaluation_attempt_id=_attempt_id and question_id=v_qid) then raise exception 'A mesma questão não pode ser respondida duas vezes'; end if;
  select is_correct into v_ok from public.exercise_options where id=v_oid and question_id=v_qid;
  if not found then raise exception 'Alternativa inválida para a questão'; end if;
  insert into public.exercise_answers(user_id,question_id,evaluation_attempt_id,selected_option_id,is_correct,answered_at)
  values(v_user_id,v_qid,_attempt_id,v_oid,v_ok,now());
  v_answered:=v_answered+1; if v_ok then v_correct:=v_correct+1; end if;
 end loop;
 v_score:=round((v_correct::numeric/v_total::numeric)*100,2);
 v_band:=case when v_score<40 then 'novice' when v_score<65 then 'developing' when v_score<85 then 'proficient' else 'mastered' end;
 update public.evaluation_attempts set status='completed',answered_questions=v_answered,correct_answers=v_correct,score=v_score,completed_at=now(),updated_at=now() where id=_attempt_id;
 insert into public.student_topic_progress(user_id,topic_id,status,exercises_completed,attempts_count,best_score,started_at,completed_at,updated_at)
 values(v_user_id,v_topic_id,'completed',coalesce((select exercises_completed from public.student_topic_progress where user_id=v_user_id and topic_id=v_topic_id),0),1,v_score,now(),now(),now())
 on conflict(user_id,topic_id) do update set status='completed',attempts_count=public.student_topic_progress.attempts_count+1,best_score=greatest(coalesce(public.student_topic_progress.best_score,0),excluded.best_score),completed_at=excluded.completed_at,updated_at=now();
 return jsonb_build_object('attempt_id',_attempt_id,'score',v_score,'correct_answers',v_correct,'total_questions',v_total,'band',v_band);
end; $$;
revoke all on function public.start_topic_evaluation(uuid) from public,anon;
grant execute on function public.start_topic_evaluation(uuid) to authenticated;
revoke all on function public.finalize_topic_evaluation(uuid,jsonb) from public,anon;
grant execute on function public.finalize_topic_evaluation(uuid,jsonb) to authenticated;

do $$
declare v_source_id uuid; v_topic_id uuid:='d88141bb-0724-4f63-b9d5-466c34dde2cf'; v_evaluation_id uuid; v_qid uuid; v_qi int:=0; v_oi int; q jsonb; o jsonb;
questions jsonb:='[
{"question":"Um planejamento define como objetivo que os estudantes sejam capazes de aplicar um conceito de Didática a uma situação nova. Qual procedimento avaliativo produz evidência mais diretamente coerente com esse objetivo?","tag":["coerencia_objetivos_avaliacao"],"options":[{"content":"Analisar uma situação nova e justificar a aplicação do conceito.","correct":true},{"content":"Repetir de memória a definição do conceito.","correct":false},{"content":"Listar todos os termos do capítulo estudado.","correct":false},{"content":"Copiar a definição para o caderno.","correct":false}]},
{"question":"Uma turma apresenta conhecimentos prévios muito diferentes sobre o tema planejado. Qual decisão pedagógica melhor preserva a intencionalidade do ensino?","tag":["planejamento_contextualizado"],"options":[{"content":"Considerar os conhecimentos prévios e ajustar estratégias e apoios sem abandonar os objetivos.","correct":true},{"content":"Abandonar os objetivos para evitar diferenças entre estudantes.","correct":false},{"content":"Usar exatamente a mesma atividade e o mesmo tempo para todos.","correct":false},{"content":"Aumentar o volume de conteúdo para compensar as diferenças.","correct":false}]},
{"question":"Durante a aula, as evidências mostram que a turma não domina um conhecimento necessário para avançar. O que caracteriza um replanejamento pedagógico?","tag":["replanejamento","flexibilidade"],"options":[{"content":"Reorganizar o percurso a partir das evidências observadas, mantendo a finalidade de aprendizagem.","correct":true},{"content":"Ignorar as evidências para cumprir o plano original a qualquer custo.","correct":false},{"content":"Eliminar a avaliação porque ela revelou uma dificuldade.","correct":false},{"content":"Substituir os objetivos por atividades aleatórias.","correct":false}]},
{"question":"Qual relação entre objetivos, conteúdos e métodos caracteriza maior coerência didática?","tag":["coerencia_objetivos_metodos_avaliacao"],"options":[{"content":"Os conteúdos e métodos são selecionados e organizados em função das aprendizagens esperadas.","correct":true},{"content":"Os métodos são escolhidos apenas pelo recurso tecnológico disponível.","correct":false},{"content":"Os conteúdos são definidos sem considerar os objetivos.","correct":false},{"content":"Qualquer método é adequado desde que o professor explique bastante.","correct":false}]},
{"question":"Qual afirmação descreve melhor o papel da avaliação em uma perspectiva formativa?","tag":["avaliacao_formativa"],"options":[{"content":"Produzir informações que ajudem a compreender a aprendizagem e orientar decisões pedagógicas.","correct":true},{"content":"Servir exclusivamente para atribuir uma nota ao final do período.","correct":false},{"content":"Classificar estudantes sem relação com o processo de ensino.","correct":false},{"content":"Substituir o planejamento porque a prova já mostra tudo o que importa.","correct":false}]},
{"question":"Um professor aplica uma prova extensa sobre conteúdos que quase não foram trabalhados nas aulas. Qual problema didático aparece com maior clareza?","tag":["coerencia_objetivos_avaliacao"],"options":[{"content":"Há provável falta de alinhamento entre o que foi ensinado, o que se esperava aprender e o que foi avaliado.","correct":true},{"content":"Toda prova extensa é pedagogicamente inadequada.","correct":false},{"content":"A avaliação deve sempre ter poucas questões.","correct":false},{"content":"O problema é usar questões escritas em vez de atividades orais.","correct":false}]},
{"question":"Ao planejar duas horas para um conteúdo amplo, a professora precisa priorizar alguns aspectos. Qual critério é mais consistente com uma prática intencional?","tag":["objetivos_de_aprendizagem"],"options":[{"content":"Definir prioridades a partir dos objetivos e das aprendizagens consideradas essenciais.","correct":true},{"content":"Escolher os tópicos mais fáceis para preencher o tempo.","correct":false},{"content":"Manter todos os conteúdos mesmo que não haja tempo para trabalhá-los adequadamente.","correct":false},{"content":"Escolher somente o que cabe em slides prontos.","correct":false}]},
{"question":"Qual situação representa melhor a integração entre planejamento e avaliação?","tag":["coerencia_objetivos_avaliacao","replanejamento"],"options":[{"content":"O professor analisa as evidências de aprendizagem e usa os resultados para decidir os próximos passos do ensino.","correct":true},{"content":"O professor corrige a prova e arquiva os resultados sem utilizá-los.","correct":false},{"content":"A avaliação acontece apenas por exigência administrativa.","correct":false},{"content":"O planejamento termina antes que qualquer evidência de aprendizagem seja coletada.","correct":false}]}
]'::jsonb;
begin
 select id into v_source_id from public.sources where doi='10.1590/S1678-4634202147241339';
 if v_source_id is null then
  insert into public.sources(title,authors,publication_date,doi,canonical_url,source_type,language,publisher,status)
  values('Avaliação da aprendizagem na educação: desafios e possibilidades','[]'::jsonb,'2021-01-01','10.1590/S1678-4634202147241339','https://www.scielo.br/j/ep/','article','pt-BR','Educação e Pesquisa','active') returning id into v_source_id;
 end if;
 if not exists(select 1 from public.source_rights where source_id=v_source_id) then
  insert into public.source_rights(source_id,rights_class,access_model,evidence_note,evidence_url,verified_at)
  values(v_source_id,'METADATA_ONLY','OPEN','Referência bibliográfica; o Ensina-me não armazena texto integral desta fonte.','https://www.scielo.br/j/ep/',now());
 end if;
 if not exists(select 1 from public.topic_sources where topic_id=v_topic_id and source_id=v_source_id) then
  insert into public.topic_sources(topic_id,source_id,role,status) values(v_topic_id,v_source_id,'COMPLEMENTAR','APPROVED');
 end if;
 select e.id into v_evaluation_id from public.exercises e where e.topic_id=v_topic_id and e.exercise_type='evaluation' and e.published=true order by e.position limit 1;
 if v_evaluation_id is null then
  insert into public.exercises(topic_id,title,exercise_type,content,difficulty,source_id,position,published)
  values(v_topic_id,'Avaliação do tópico — Planejamento do ensino','evaluation','Avaliação formal do tópico. Ao finalizar, o Ensina-me calcula o domínio a partir das respostas desta tentativa.','medium',v_source_id,1,true) returning id into v_evaluation_id;
  for q in select value from jsonb_array_elements(questions) loop
   v_qi:=v_qi+1;
   insert into public.exercise_questions(exercise_id,question_text,question_type,position,feedback_hint,difficulty_tag)
   values(v_evaluation_id,q->>'question','multiple_choice',v_qi,'Analise a relação entre objetivos, contexto, métodos e evidências de aprendizagem.',array(select jsonb_array_elements_text(q->'tag'))) returning id into v_qid;
   v_oi:=0;
   for o in select value from jsonb_array_elements(q->'options') loop
    v_oi:=v_oi+1;
    insert into public.exercise_options(question_id,content,is_correct,feedback_correct,feedback_incorrect,position)
    values(v_qid,o->>'content',(o->>'correct')::boolean,case when (o->>'correct')::boolean then 'Essa alternativa é coerente com os princípios trabalhados no tópico.' else null end,case when not (o->>'correct')::boolean then 'Revise a articulação entre intenção pedagógica, contexto e evidências de aprendizagem.' else null end,v_oi);
   end loop;
  end loop;
 end if;
end $$;
