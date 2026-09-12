-- =============================================================================
-- anotAI — Políticas de acesso (RLS) e autenticação (Supabase)
-- =============================================================================
-- Este arquivo documenta as políticas de Row Level Security (RLS) que
-- protegem os dados do anotAI, exigindo um usuário autenticado (Supabase
-- Auth) para qualquer leitura ou escrita.
--
-- Você já configurou isso manualmente no seu projeto Supabase — este arquivo
-- existe apenas como REFERÊNCIA e VERSIONAMENTO, para o caso de precisar
-- reconfigurar um projeto do zero no futuro. O site NÃO executa este SQL
-- automaticamente; ele só reflete o comportamento que o banco já tem.
--
-- Como aplicar (se precisar, do zero):
--   1. Rode primeiro supabase/schema.sql (cria as tabelas).
--   2. Abra o SQL Editor do Supabase, cole o conteúdo deste arquivo e rode.
--
-- Todos os usuários autenticados têm, por enquanto, o mesmo nível de acesso
-- (não há papéis/permissões diferenciadas nesta V1).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- A partir da integração com Supabase Auth (login.html), o acesso passou a
-- exigir um usuário autenticado. As políticas abaixo liberam leitura/escrita
-- apenas para o role `authenticated` — qualquer requisição sem uma sessão
-- válida (token de login) é recusada pelo banco, independentemente do que o
-- front-end tente fazer.
--
-- Nesta V1 todos os usuários autenticados têm o mesmo nível de acesso (não
-- há papéis/permissões diferenciadas ainda — ver README para o plano futuro).
-- Se você já rodou este schema antes (versão anterior, sem login), execute
-- este bloco novamente: ele substitui as políticas antigas pelas novas.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'contracts', 'lessons', 'teachers', 'lesson_teacher_checks',
      'weekly_schedule', 'contract_notes', 'lesson_notes',
      'lesson_feedback', 'notifications'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow_all_v1" on %I;', t);
    execute format('drop policy if exists "allow_authenticated" on %I;', t);
    execute format(
      'create policy "allow_authenticated" on %I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- Storage: leitura pública das imagens de feedback (para exibir via URL pública)
-- + escrita restrita a usuários autenticados.
drop policy if exists "feedback_images_read" on storage.objects;
create policy "feedback_images_read" on storage.objects
  for select using (bucket_id = 'feedback-images');

drop policy if exists "feedback_images_write" on storage.objects;
drop policy if exists "feedback_images_write_auth" on storage.objects;
create policy "feedback_images_write_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'feedback-images');

drop policy if exists "feedback_images_delete" on storage.objects;
create policy "feedback_images_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'feedback-images');
