
-- Ensina-me: consolidate exposed RLS policies for predictable access semantics
-- and better query planning at scale. Preserve the current student/admin model.

-- SOURCES
DROP POLICY IF EXISTS sources_select_authenticated ON public.sources;
DROP POLICY IF EXISTS sources_select_permitted ON public.sources;
CREATE POLICY sources_select_student_admin
  ON public.sources
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND status = 'active'
    )
  );

-- SOURCE RIGHTS: only open rights are visible to students/admins.
DROP POLICY IF EXISTS source_rights_select_open ON public.source_rights;
CREATE POLICY source_rights_select_student_admin_open
  ON public.source_rights
  FOR SELECT
  TO authenticated
  USING (
    (
      (select public.has_role('student'))
      OR (select public.has_role('admin'))
    )
    AND rights_class = 'OPEN'
  );

-- TOPIC SOURCES: only approved links are visible to students/admins.
DROP POLICY IF EXISTS topic_sources_select_approved ON public.topic_sources;
CREATE POLICY topic_sources_select_student_admin_approved
  ON public.topic_sources
  FOR SELECT
  TO authenticated
  USING (
    (
      (select public.has_role('student'))
      OR (select public.has_role('admin'))
    )
    AND status = 'APPROVED'
  );

-- MATERIALS: admins can inspect all; students only published material
-- attached to a fully published course/disciplines/topic hierarchy.
DROP POLICY IF EXISTS "Admins select all materials" ON public.materials;
DROP POLICY IF EXISTS "Students and admins can read published materials" ON public.materials;
DROP POLICY IF EXISTS materials_select_published ON public.materials;
CREATE POLICY materials_select_student_admin
  ON public.materials
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.topics t
        JOIN public.disciplines d ON d.id = t.discipline_id
        JOIN public.courses c ON c.id = d.course_id
        WHERE t.id = public.materials.topic_id
          AND t.published = true
          AND d.published = true
          AND c.published = true
      )
    )
  );

-- MATERIAL SECTIONS: same visibility model as materials.
DROP POLICY IF EXISTS "Admins select all material sections" ON public.material_sections;
DROP POLICY IF EXISTS "Students and admins can read sections of published materials" ON public.material_sections;
DROP POLICY IF EXISTS material_sections_select ON public.material_sections;
CREATE POLICY material_sections_select_student_admin
  ON public.material_sections
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND EXISTS (
        SELECT 1
        FROM public.materials m
        JOIN public.topics t ON t.id = m.topic_id
        JOIN public.disciplines d ON d.id = t.discipline_id
        JOIN public.courses c ON c.id = d.course_id
        WHERE m.id = public.material_sections.material_id
          AND m.status = 'published'
          AND t.published = true
          AND d.published = true
          AND c.published = true
      )
    )
  );

-- MATERIAL CITATIONS: visible only with published material.
DROP POLICY IF EXISTS "Students and admins can read citations of published materials" ON public.material_citations;
DROP POLICY IF EXISTS material_citations_select ON public.material_citations;
DROP POLICY IF EXISTS material_citations_no_delete ON public.material_citations;
DROP POLICY IF EXISTS material_citations_no_insert ON public.material_citations;
DROP POLICY IF EXISTS material_citations_no_update ON public.material_citations;
DROP POLICY IF EXISTS "No deletes on material_citations" ON public.material_citations;
DROP POLICY IF EXISTS "No inserts on material_citations" ON public.material_citations;
DROP POLICY IF EXISTS "No updates on material_citations" ON public.material_citations;
CREATE POLICY material_citations_select_student_admin
  ON public.material_citations
  FOR SELECT
  TO authenticated
  USING (
    (
      (select public.has_role('student'))
      OR (select public.has_role('admin'))
    )
    AND EXISTS (
      SELECT 1
      FROM public.materials m
      WHERE m.id = public.material_citations.material_id
        AND m.status = 'published'
    )
  );

-- Material publication content remains admin-write only.
DROP POLICY IF EXISTS "Admins update materials" ON public.materials;
CREATE POLICY "Admins update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING ((select public.has_role('admin')))
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS "Admins update material sections" ON public.material_sections;
CREATE POLICY "Admins update material sections"
  ON public.material_sections
  FOR UPDATE
  TO authenticated
  USING ((select public.has_role('admin')))
  WITH CHECK ((select public.has_role('admin')));

-- APPLICATION EXERCISES
DROP POLICY IF EXISTS exercises_select_admin ON public.exercises;
DROP POLICY IF EXISTS exercises_select_student ON public.exercises;
CREATE POLICY exercises_select_student_admin
  ON public.exercises
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND published = true
      AND EXISTS (
        SELECT 1
        FROM public.topics t
        JOIN public.disciplines d ON d.id = t.discipline_id
        JOIN public.courses c ON c.id = d.course_id
        WHERE t.id = public.exercises.topic_id
          AND t.published = true
          AND d.published = true
          AND c.published = true
      )
    )
  );

DROP POLICY IF EXISTS exercises_delete_admin ON public.exercises;
CREATE POLICY exercises_delete_admin
  ON public.exercises
  FOR DELETE
  TO authenticated
  USING ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercises_insert_admin ON public.exercises;
CREATE POLICY exercises_insert_admin
  ON public.exercises
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercises_update_admin ON public.exercises;
CREATE POLICY exercises_update_admin
  ON public.exercises
  FOR UPDATE
  TO authenticated
  USING ((select public.has_role('admin')))
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_questions_select_admin ON public.exercise_questions;
DROP POLICY IF EXISTS exercise_questions_select_student ON public.exercise_questions;
CREATE POLICY exercise_questions_select_student_admin
  ON public.exercise_questions
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND EXISTS (
        SELECT 1
        FROM public.exercises e
        JOIN public.topics t ON t.id = e.topic_id
        JOIN public.disciplines d ON d.id = t.discipline_id
        JOIN public.courses c ON c.id = d.course_id
        WHERE e.id = public.exercise_questions.exercise_id
          AND e.published = true
          AND t.published = true
          AND d.published = true
          AND c.published = true
      )
    )
  );

DROP POLICY IF EXISTS exercise_questions_delete_admin ON public.exercise_questions;
CREATE POLICY exercise_questions_delete_admin
  ON public.exercise_questions
  FOR DELETE
  TO authenticated
  USING ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_questions_insert_admin ON public.exercise_questions;
CREATE POLICY exercise_questions_insert_admin
  ON public.exercise_questions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_questions_update_admin ON public.exercise_questions;
CREATE POLICY exercise_questions_update_admin
  ON public.exercise_questions
  FOR UPDATE
  TO authenticated
  USING ((select public.has_role('admin')))
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_options_select_admin ON public.exercise_options;
DROP POLICY IF EXISTS exercise_options_select_student ON public.exercise_options;
CREATE POLICY exercise_options_select_student_admin
  ON public.exercise_options
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND EXISTS (
        SELECT 1
        FROM public.exercise_questions eq
        JOIN public.exercises e ON e.id = eq.exercise_id
        JOIN public.topics t ON t.id = e.topic_id
        JOIN public.disciplines d ON d.id = t.discipline_id
        JOIN public.courses c ON c.id = d.course_id
        WHERE eq.id = public.exercise_options.question_id
          AND e.published = true
          AND t.published = true
          AND d.published = true
          AND c.published = true
      )
    )
  );

DROP POLICY IF EXISTS exercise_options_delete_admin ON public.exercise_options;
CREATE POLICY exercise_options_delete_admin
  ON public.exercise_options
  FOR DELETE
  TO authenticated
  USING ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_options_insert_admin ON public.exercise_options;
CREATE POLICY exercise_options_insert_admin
  ON public.exercise_options
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.has_role('admin')));

DROP POLICY IF EXISTS exercise_options_update_admin ON public.exercise_options;
CREATE POLICY exercise_options_update_admin
  ON public.exercise_options
  FOR UPDATE
  TO authenticated
  USING ((select public.has_role('admin')))
  WITH CHECK ((select public.has_role('admin')));

-- ANSWERS: one select policy for admin/all or student/own.
DROP POLICY IF EXISTS admins_select_all_answers ON public.exercise_answers;
DROP POLICY IF EXISTS students_select_own_answers ON public.exercise_answers;
CREATE POLICY exercise_answers_select_student_admin
  ON public.exercise_answers
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS students_insert_own_answers ON public.exercise_answers;
CREATE POLICY students_insert_own_answers
  ON public.exercise_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND (select public.has_role('student'))
  );

-- STUDENT PROGRESS: preserve admin visibility and student ownership
-- while reducing duplicate policy evaluation.
DROP POLICY IF EXISTS "Admins select all material section progress" ON public.student_material_section_progress;
DROP POLICY IF EXISTS "Students select own material section progress" ON public.student_material_section_progress;
CREATE POLICY student_material_section_progress_select_student_admin
  ON public.student_material_section_progress
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select all topic difficulties" ON public.student_topic_difficulties;
DROP POLICY IF EXISTS "Students select own topic difficulties" ON public.student_topic_difficulties;
CREATE POLICY student_topic_difficulties_select_student_admin
  ON public.student_topic_difficulties
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select all topic progress" ON public.student_topic_progress;
DROP POLICY IF EXISTS "Students select own topic progress" ON public.student_topic_progress;
CREATE POLICY student_topic_progress_select_student_admin
  ON public.student_topic_progress
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select all study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Students select own study sessions" ON public.study_sessions;
CREATE POLICY study_sessions_select_student_admin
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING (
    (select public.has_role('admin'))
    OR (
      (select public.has_role('student'))
      AND user_id = (select auth.uid())
    )
  );
