
update public.source_documents set retrieval_status='retrieved',retrieved_at=now(),updated_at=now()
where id='b2bca6ce-189b-4f00-bc87-a42966e0bc2e';

insert into public.source_chunks (source_document_id,chunk_index,content,locator,token_count)
select 'b2bca6ce-189b-4f00-bc87-a42966e0bc2e',v.idx,v.content,v.locator,v.tokens
from (values
(0,'A BNCC apresenta uma base para toda a Educação Básica brasileira e organiza sua proposta em torno da aprendizagem de qualidade. O documento inclui apresentação, introdução, competências gerais, fundamentos pedagógicos, estrutura da BNCC e etapas da Educação Básica.','Sumário e Apresentação, p. 5-15',120),
(1,'Na Educação Infantil, a BNCC organiza direitos de aprendizagem e desenvolvimento e campos de experiências, além de objetivos de aprendizagem e desenvolvimento. O documento também trata da transição da Educação Infantil para o Ensino Fundamental.','Sumário, seção 3, p. 35-53',125),
(2,'No Ensino Fundamental, a BNCC estrutura áreas de conhecimento e componentes curriculares, incluindo Linguagens, Língua Portuguesa, Arte, Educação Física, Língua Inglesa e Matemática, com competências, objetos de conhecimento e habilidades.','Sumário, seção 4, p. 57-298',130),
(3,'A BNCC explicita fundamentos pedagógicos e competências gerais como parte da organização da Educação Básica, servindo como referência normativa para a construção e implementação dos currículos e das propostas pedagógicas.','Introdução e fundamentos pedagógicos, p. 7-23',115)
) v(idx,content,locator,tokens);

insert into public.material_chunk_citations(material_id,section_id,source_chunk_id)
select mc.material_id,mc.section_id,sc.id
from public.material_citations mc
join public.source_chunks sc on sc.source_document_id='b2bca6ce-189b-4f00-bc87-a42966e0bc2e'
where mc.source_id='81597dfe-6898-4086-bdcd-067dba318cb9'
and mc.id in ('e68d7c88-a6a9-4ea6-9fa2-c8ec17538346','df130ead-fd82-47cd-8e6b-c3391b1f8958','2d08bdc4-a8da-4ac5-b900-2e4f18e2ec01','a1aff26a-8cb0-4edd-911b-627a7ac32524')
order by sc.chunk_index
limit 4;
