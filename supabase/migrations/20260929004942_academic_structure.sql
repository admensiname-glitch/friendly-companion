-- ============================================================
-- Estrutura acadêmica: cursos, disciplinas e tópicos
-- ============================================================

-- ── Courses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  published  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published courses"
  ON courses FOR SELECT
  USING (published = true);

-- ── Disciplines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disciplines (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  course_id    uuid        NOT NULL,
  name         text        NOT NULL,
  code         text,
  description  text,
  published    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published disciplines"
  ON disciplines FOR SELECT
  USING (published = true);

CREATE INDEX IF NOT EXISTS disciplines_course_id_idx ON disciplines(course_id);

-- trigger updated_at
CREATE OR REPLACE FUNCTION disciplines_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS disciplines_updated_at ON disciplines;
CREATE TRIGGER disciplines_updated_at
  BEFORE UPDATE ON disciplines
  FOR EACH ROW EXECUTE FUNCTION disciplines_updated_at();

-- ── Topics ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  discipline_id uuid        NOT NULL,
  name          text        NOT NULL,
  description   text,
  position      integer     NOT NULL DEFAULT 0,
  published     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published topics"
  ON topics FOR SELECT
  USING (published = true);

CREATE INDEX IF NOT EXISTS topics_discipline_id_idx ON topics(discipline_id);
CREATE INDEX IF NOT EXISTS topics_position_idx ON topics(position);

-- trigger updated_at
CREATE OR REPLACE FUNCTION topics_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topics_updated_at ON topics;
CREATE TRIGGER topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION topics_updated_at();

-- ── Seed: Pedagogia (não-publicada por padrão) ──────────────
INSERT INTO courses (name, slug, published)
VALUES ('Pedagogia', 'pedagogia', false)
ON CONFLICT (slug) DO NOTHING;
