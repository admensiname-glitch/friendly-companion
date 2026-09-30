-- ============================================================
-- FASE 1: Estrutura de exercícios
-- exercises → exercise_questions → exercise_options
-- ============================================================

-- ── exercises ────────────────────────────────────────────────

CREATE TABLE exercises (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  topic_id      uuid        NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  exercise_type text        NOT NULL,
  content       text        NOT NULL,
  difficulty    text        NOT NULL,
  source_id     uuid        NULL    REFERENCES sources(id) ON DELETE SET NULL,
  position      integer     NOT NULL,
  published     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exercises_pkey            PRIMARY KEY (id),
  CONSTRAINT exercises_type_check      CHECK (exercise_type IN ('application', 'evaluation')),
  CONSTRAINT exercises_difficulty_check CHECK (difficulty    IN ('easy', 'medium', 'hard'))
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION exercises_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION exercises_updated_at();

CREATE INDEX idx_exercises_topic_position    ON exercises(topic_id, position);
CREATE INDEX idx_exercises_topic_type_pub    ON exercises(topic_id, exercise_type, published);

-- ── exercise_questions ─────────────────────────────────────────

CREATE TABLE exercise_questions (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  exercise_id    uuid        NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  question_text  text        NOT NULL,
  question_type   text        NOT NULL,
  position       integer     NOT NULL,
  feedback_hint  text        NULL,
  difficulty_tag text[]      NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exercise_questions_pkey           PRIMARY KEY (id),
  CONSTRAINT exercise_questions_type_check    CHECK (question_type IN ('multiple_choice', 'open_text'))
);

CREATE OR REPLACE FUNCTION exercise_questions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER exercise_questions_updated_at
  BEFORE UPDATE ON exercise_questions
  FOR EACH ROW EXECUTE FUNCTION exercise_questions_updated_at();

CREATE INDEX idx_exercise_questions_exercise_position
  ON exercise_questions(exercise_id, position);

-- ── exercise_options ────────────────────────────────────────────

CREATE TABLE exercise_options (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  question_id      uuid        NOT NULL REFERENCES exercise_questions(id) ON DELETE CASCADE,
  content          text        NOT NULL,
  is_correct       boolean     NOT NULL DEFAULT false,
  feedback_correct text        NULL,
  feedback_incorrect text      NULL,
  position         integer     NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exercise_options_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_exercise_options_question_position
  ON exercise_options(question_id, position);

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE exercises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_options  ENABLE ROW LEVEL SECURITY;

-- exercises
CREATE POLICY exercises_select_student ON exercises
  FOR SELECT USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = topic_id
        AND t.published = true
        AND EXISTS (
          SELECT 1 FROM disciplines d
          WHERE d.id = t.discipline_id
            AND d.published = true
        )
    )
    AND public.has_role('student')
  );

CREATE POLICY exercises_select_admin ON exercises
  FOR SELECT USING (public.has_role('admin'));

CREATE POLICY exercises_insert_admin ON exercises
  FOR INSERT WITH CHECK (public.has_role('admin'));

CREATE POLICY exercises_update_admin ON exercises
  FOR UPDATE USING (public.has_role('admin'));

CREATE POLICY exercises_delete_admin ON exercises
  FOR DELETE USING (public.has_role('admin'));

-- exercise_questions
CREATE POLICY exercise_questions_select_student ON exercise_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = exercise_id
        AND e.published = true
        AND EXISTS (
          SELECT 1 FROM topics t
          WHERE t.id = e.topic_id
            AND t.published = true
            AND EXISTS (
              SELECT 1 FROM disciplines d
              WHERE d.id = t.discipline_id
                AND d.published = true
            )
        )
    )
    AND public.has_role('student')
  );

CREATE POLICY exercise_questions_select_admin ON exercise_questions
  FOR SELECT USING (public.has_role('admin'));

CREATE POLICY exercise_questions_insert_admin ON exercise_questions
  FOR INSERT WITH CHECK (public.has_role('admin'));

CREATE POLICY exercise_questions_update_admin ON exercise_questions
  FOR UPDATE USING (public.has_role('admin'));

CREATE POLICY exercise_questions_delete_admin ON exercise_questions
  FOR DELETE USING (public.has_role('admin'));

-- exercise_options
CREATE POLICY exercise_options_select_student ON exercise_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercise_questions eq
      JOIN exercises e ON e.id = eq.exercise_id
      WHERE eq.id = question_id
        AND e.published = true
        AND EXISTS (
          SELECT 1 FROM topics t
          WHERE t.id = e.topic_id
            AND t.published = true
            AND EXISTS (
              SELECT 1 FROM disciplines d
              WHERE d.id = t.discipline_id
                AND d.published = true
            )
        )
    )
    AND public.has_role('student')
  );

CREATE POLICY exercise_options_select_admin ON exercise_options
  FOR SELECT USING (public.has_role('admin'));

CREATE POLICY exercise_options_insert_admin ON exercise_options
  FOR INSERT WITH CHECK (public.has_role('admin'));

CREATE POLICY exercise_options_update_admin ON exercise_options
  FOR UPDATE USING (public.has_role('admin'));

CREATE POLICY exercise_options_delete_admin ON exercise_options
  FOR DELETE USING (public.has_role('admin'));
