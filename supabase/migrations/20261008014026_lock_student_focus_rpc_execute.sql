revoke execute on function public.get_student_focus_discipline() from public;
revoke execute on function public.set_student_focus_discipline(uuid) from public;
grant execute on function public.get_student_focus_discipline() to authenticated;
grant execute on function public.set_student_focus_discipline(uuid) to authenticated;
