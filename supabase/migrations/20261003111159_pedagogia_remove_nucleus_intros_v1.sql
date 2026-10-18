UPDATE public.materials m
SET introduction = left(regexp_replace(
  coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=1 LIMIT 1),'') || ' ' ||
  coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=3 LIMIT 1),''),
  '\\s+',' ','g'),900)
WHERE m.status='published'
AND (m.introduction ILIKE 'O núcleo de %' OR m.introduction ILIKE '%material reconstruído a partir da literatura%')
AND length(trim(coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=1 LIMIT 1),'') || coalesce((SELECT content FROM public.material_sections WHERE material_id=m.id AND position=3 LIMIT 1),''))) > 250;