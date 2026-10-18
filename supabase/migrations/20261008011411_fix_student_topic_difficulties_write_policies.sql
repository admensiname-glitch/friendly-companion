create policy "student_topic_difficulties_insert_own"
on public.student_topic_difficulties
for insert
to authenticated
with check (user_id = auth.uid());

create policy "student_topic_difficulties_update_own"
on public.student_topic_difficulties
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());