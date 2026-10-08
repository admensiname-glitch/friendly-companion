-- Regra pedagógica: um conceito com erro na tentativa não pode aparecer como domínio.
-- A função atual é reaplicada e recebe uma filtragem final no bloco de strengths.
do $$
declare
  v_def text;
  v_marker text := ' return jsonb_build_object(';
  v_inject text := ' -- Conceito com qualquer erro nesta tentativa não é domínio.' || E'\n' ||
    ' v_right := coalesce((' || E'\n' ||
    '   select jsonb_agg(x order by x->>''concept'')' || E'\n' ||
    '   from jsonb_array_elements(v_right) x' || E'\n' ||
    '   where not exists (' || E'\n' ||
    '     select 1 from jsonb_array_elements(v_wrong) w' || E'\n' ||
    '     where w->>''concept'' = x->>''concept''' || E'\n' ||
    '   )' || E'\n' ||
    ' ), ''[]''::jsonb);' || E'\n' || E'\n';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='finalize_formal_evaluation'
  limit 1;

  if v_def is null then raise exception 'Função finalize_formal_evaluation não encontrada'; end if;
  if position(v_marker in v_def)=0 then raise exception 'Ponto de inserção não encontrado'; end if;

  v_def := replace(v_def,v_marker,v_inject||v_marker);
  execute v_def;
end $$;

revoke execute on function public.finalize_formal_evaluation(uuid,jsonb) from public;
grant execute on function public.finalize_formal_evaluation(uuid,jsonb) to authenticated;
