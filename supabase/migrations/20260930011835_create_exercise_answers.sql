-- ============================================================
-- Tabela: exercise_answers
-- Fase 2A: persistência de respostas de exercícios de aplicação
-- ============================================================

CREATE TABLE IF NOT EXISTS exercise_answers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   uuid        NOT NULL REFERENCES exercise_questions(id) ON DELETE CASCADE,
  evaluation_attempt_id uuid NULL, -- future FK, tabela ainda não existe
  selected_option_id uuid   NULL, -- future FK para exercise_options
  open_text     text        NULL,
  is_correct    boolean     NULL,
  feedback      text        NULL,
  answered_at   timestamptz NOT NULL DEFAULT now(),

  -- Garante que pelo menos uma resposta foi enviada
  CONSTRAINT exercise_answers_has_response
    CHECK (
      (selected_option_id IS NOT NULL AND open_text IS NULL) OR
      (selected_option_id IS NULL AND open_text IS NOT NULL)
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS exercise_answers_user_question_idx
  ON exercise_answers (user_id, question_id);

CREATE INDEX IF NOT EXISTS exercise_answers_user_time_idx
  ON exercise_answers (user_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS exercise_answers_attempt_idx
  ON exercise_answers (evaluation_attempt_id)
  WHERE evaluation_attempt_id IS NOT NULL;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;

-- Students: INSERT e SELECT apenas próprias respostas
CREATE POLICY "students_insert_own_answers"
  ON exercise_answers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_role('student')
  );

CREATE POLICY "students_select_own_answers"
  ON exercise_answers FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Admins: SELECT em todas as respostas
CREATE POLICY "admins_select_all_answers"
  ON exercise_answers FOR SELECT
  USING (
    public.has_role('admin')
  );

COMMENT ON TABLE exercise_answers IS
  'Respostas dos alunos aos exercícios de aplicação. Cada clique em Ver resposta gera um novo registro, preservando histórico de tentativas.';
COMMENT ON COLUMN exercise_answers.evaluation_attempt_id IS
  'Futura referência a evaluation_attempts. FK será criada quando a tabela existir.';
COMMENT ON COLUMN exercise_answers.selected_option_id IS
  'Futura referência a exercise_options. FK será criada quando exercise_options estiver com RLS configurada.';
