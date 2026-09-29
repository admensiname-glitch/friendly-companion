-- ============================================================
-- Migration: 20260929224301_fix_materials_text.sql
-- Corrige textos do material "Planejamento do ensino":
-- 1. Substitui palavras em inglês por português brasileiro
-- 2. Normaliza quebras de linha literais (\n) para newlines reais
-- ============================================================

DO $$
DECLARE
  mat_rec record;
BEGIN
  -- Atualiza a introduction do material
  UPDATE materials
  SET
    introduction = REPLACE(introduction, '\n', E'\n'),
    updated_at = now()
  WHERE title = 'Planejamento do ensino: fundamentos e elementos';

  -- Corrige a introduction do material (palavras em inglês → português)
  UPDATE materials
  SET
    introduction = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            introduction,
            'conscious about the educational process',
            'o processo educativo'
          ),
          'willingness to reflect on practice',
          'disposição para refletir sobre a prática'
        ),
        'compreender',
        'compreender'
      ),
      'compreender',
      'compreender'
    ),
    updated_at = now()
  WHERE title = 'Planejamento do ensino: fundamentos e elementos';

  -- Corrige sections: palavras em inglês e normaliza \n → newline real
  FOR mat_rec IN
    SELECT ms.id, ms.content
    FROM material_sections ms
    JOIN materials m ON m.id = ms.material_id
    WHERE m.title = 'Planejamento do ensino: fundamentos e elementos'
  LOOP
    UPDATE material_sections
    SET
      content = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(
                        REPLACE(
                          REPLACE(
                            REPLACE(
                              REPLACE(mat_rec.content,
                                'conscious about the educational process',
                                'o processo educativo'
                              ),
                              'willingness to reflect on practice',
                              'disposição para refletir sobre a prática'
                            ),
                            'worthwhile',
                            'significativo'
                          ),
                          'diagnostic',
                          'diagnosticar'
                        ),
                        'conception',
                        'concepção'
                      ),
                      'meaningful',
                      'significativa'
                    ),
                    E'\\n\\n',
                    E'\n\n'
                  ),
                  E'\\n',
                  E'\n'
                ),
                'compreender',
                'compreender'
              ),
              'compreender',
              'compreender'
            ),
            'compreender',
            'compreender'
          ),
          -- Normaliza quebra literal de parágrafo para newline real
          E'\\n\\n',
          E'\n\n'
        ),
        -- Normaliza quebra literal de linha para newline real
        E'\\n',
        E'\n'
      ),
      updated_at = now()
    WHERE id = mat_rec.id;
  END LOOP;

END $$;
