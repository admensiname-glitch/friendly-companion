-- Ensina-me: additional Pedagogia video curation
-- Idempotent: all inserts are guarded by canonical_url / topic_id + video_url.
-- Rights policy: public availability is not treated as a reuse license.
-- One source (Nilma Lino Gomes / Instituto Unibanco CEDOC) has verified CC-BY evidence.

insert into public.sources(title, source_type, publisher, canonical_url, language, status)
select x.title, 'VIDEO', x.publisher, x.canonical_url, 'pt', 'active'
from (values
  ('O que é Geografia?','Gustavo GEO','https://www.youtube.com/watch?v=wKx8GVWqFi8'),
  ('Abertura D22 - Conteúdos e Didática de Geografia','IEP3 Unesp','https://www.youtube.com/watch?v=84gZ0-eBtWM'),
  ('Povos indígenas e práticas de ensino no Brasil','UNIVESP','https://www.youtube.com/watch?v=VNanwYCDEsY'),
  ('Música na educação infantil - a expressão musical e a criança de 0 a 5 anos','UNIVESP','https://www.youtube.com/watch?v=hhPMUg58Abc'),
  ('História da Educação no Brasil: o ruralismo: as escolas do campo','UNIVESP','https://www.youtube.com/watch?v=U2aJb4e3EAc'),
  ('Educação Escolar Quilombola. Palestra profa Nilma (parte 1)','Multicultura','https://www.youtube.com/watch?v=MDhbq-NMpAI')
) x(title,publisher,canonical_url)
where not exists (
  select 1 from public.sources s where s.canonical_url=x.canonical_url
);

insert into public.source_rights(
  source_id, license_id, rights_class, access_model, evidence_url, evidence_note, verified_at
)
select s.id, x.license_id, x.rights_class, 'OPEN', x.evidence_url, x.evidence_note, now()
from public.sources s
join (values
  ('https://www.youtube.com/watch?v=wKx8GVWqFi8','UNKNOWN'::text,null::uuid,'https://acervodigital.unesp.br/handle/unesp/47195','Acervo Digital Unesp registra o material como vídeo didático de graduação em Pedagogia; a publicação pública no YouTube não foi tratada como licença de reutilização. O Ensina-me usa somente incorporação e link para a fonte original.'),
  ('https://www.youtube.com/watch?v=84gZ0-eBtWM','UNKNOWN'::text,null::uuid,'https://acervodigital.unesp.br/handle/unesp/47318','Acervo Digital Unesp identifica o item como vídeo didático de graduação em Pedagogia; a publicação pública no YouTube não foi tratada como licença de reutilização. O Ensina-me usa somente incorporação e link para a fonte original.'),
  ('https://www.youtube.com/watch?v=VNanwYCDEsY','UNKNOWN'::text,null::uuid,'https://acervodigital.unesp.br/handle/123456789/46396','Acervo Digital Unesp registra o vídeo como material didático da graduação em Pedagogia; a publicação pública no YouTube não foi tratada como licença de reutilização.'),
  ('https://www.youtube.com/watch?v=hhPMUg58Abc','UNKNOWN'::text,null::uuid,'https://www.youtube.com/watch?v=hhPMUg58Abc','Vídeo publicado no canal oficial da UNIVESP e referenciado em materiais acadêmicos; a disponibilidade pública não foi tratada como licença de reutilização.'),
  ('https://www.youtube.com/watch?v=U2aJb4e3EAc','UNKNOWN'::text,null::uuid,'https://educapes.capes.gov.br/bitstream/capes/573603/2/O%20Direito%20do%20Campo%20%28produto%20educacional%20ProfEPT%20-%20livro%20digital%20-%20Marcos%20Spiess%29.pdf','Referenciado em publicação acadêmica/educacional como vídeo da UNIVESP. A publicação pública no YouTube não foi tratada como licença de reutilização.'),
  ('https://www.youtube.com/watch?v=MDhbq-NMpAI','OPEN'::text,'00000000-0000-0000-0000-000000000001'::uuid,'https://observatoriodeeducacao.institutounibanco.org.br/cedoc/detalhe/ta-educacao-escolar-quilombola-palestra-profa-nilma-parte-1%2C7c2029e4-fdaf-4d02-aa08-9e229d55f6cb','O Observatório de Educação do Instituto Unibanco identifica o vídeo como CCBY - Atribuição. O Ensina-me incorpora o player e preserva a atribuição/fonte original.')
) x(canonical_url,rights_class,license_id,evidence_url,evidence_note)
  on x.canonical_url=s.canonical_url
where not exists (
  select 1 from public.source_rights sr where sr.source_id=s.id and sr.superseded_at is null
);

insert into public.topic_videos(
  topic_id, source_id, title, description, video_url, embed_url, platform,
  channel_name, duration_label, position, published
)
select t.id, s.id, x.title, x.description, x.video_url, x.embed_url, 'youtube',
       x.channel_name, x.duration_label,
       coalesce((select max(tv.position)+1 from public.topic_videos tv where tv.topic_id=t.id),1),
       true
from (values
  ('O que é Geografia?','Versão editada de programa da disciplina D-22 Conteúdos e Didática de Geografia, do curso de Pedagogia Unesp/Univesp.','https://www.youtube.com/watch?v=wKx8GVWqFi8','https://www.youtube-nocookie.com/embed/wKx8GVWqFi8','Gustavo GEO','15 min','Espaço geográfico e lugar'),
  ('Abertura D22 - Conteúdos e Didática de Geografia','Abertura da disciplina Conteúdos e Didática de Geografia do curso de Pedagogia Unesp/Univesp.','https://www.youtube.com/watch?v=84gZ0-eBtWM','https://www.youtube-nocookie.com/embed/84gZ0-eBtWM','IEP3 Unesp','31 min','Ensino de Geografia e leitura do mundo'),
  ('Povos indígenas e práticas de ensino no Brasil','Programa D-21 sobre povos indígenas e práticas de ensino no Brasil.','https://www.youtube.com/watch?v=VNanwYCDEsY','https://www.youtube-nocookie.com/embed/VNanwYCDEsY','UNIVESP','15:21','Educação escolar indígena'),
  ('Música na educação infantil - a expressão musical e a criança de 0 a 5 anos','Programa D-14 do curso de Pedagogia Unesp/Univesp sobre expressão musical e a criança de 0 a 5 anos.','https://www.youtube.com/watch?v=hhPMUg58Abc','https://www.youtube-nocookie.com/embed/hhPMUg58Abc','UNIVESP','17:04','Música e educação'),
  ('História da Educação no Brasil: o ruralismo: as escolas do campo','Vídeo da UNIVESP sobre ruralismo pedagógico e escolas do campo no contexto da História da Educação brasileira.','https://www.youtube.com/watch?v=U2aJb4e3EAc','https://www.youtube-nocookie.com/embed/U2aJb4e3EAc','UNIVESP',null,'História e políticas da Educação do Campo'),
  ('Educação Escolar Quilombola. Palestra profa Nilma (parte 1)','Palestra de Nilma Lino Gomes sobre diretrizes curriculares nacionais para a educação escolar quilombola.','https://www.youtube.com/watch?v=MDhbq-NMpAI','https://www.youtube-nocookie.com/embed/MDhbq-NMpAI','Multicultura','14:41','Educação quilombola e identidade')
) x(title,description,video_url,embed_url,channel_name,duration_label,topic_name)
join public.sources s on s.canonical_url=x.video_url
join public.topics t on t.name=x.topic_name
where not exists (
  select 1 from public.topic_videos tv
  where tv.topic_id=t.id and tv.video_url=x.video_url
);
