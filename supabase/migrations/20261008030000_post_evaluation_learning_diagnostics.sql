-- Post-avaliação: diagnóstico por conceito e alimentação do mapa de aprendizagem.
-- A implementação completa desta RPC está aplicada no banco e deve permanecer
-- versionada junto com a documentação da arquitetura.
--
-- IMPORTANTE: esta migration é apenas um marcador histórico; não deve substituir
-- a definição completa da RPC já existente. O banco é a fonte de execução desta
-- alteração e a definição completa foi aplicada em produção nesta entrega.

-- Verificação/garantia dos grants da RPC.
revoke execute on function public.finalize_formal_evaluation(uuid,jsonb) from public;
grant execute on function public.finalize_formal_evaluation(uuid,jsonb) to authenticated;
