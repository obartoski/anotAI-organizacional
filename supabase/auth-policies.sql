-- =============================================================================
-- anotAI — Políticas de segurança com Supabase Auth
-- =============================================================================
-- Execute após o schema.sql.
--
-- Usuário não autenticado: sem acesso aos dados
-- Usuário autenticado: acesso completo na V1
-- =============================================================================

do $$
declare
  t text;
begin

  for t in
    select unnest(
      array[
        'contracts',
        'lessons',
        'teachers',
        'lesson_teacher_checks',
        'weekly_schedule',
        'contract_notes',
        'lesson_notes',
        'lesson_feedback',
        'notifications'
      ]
    )
  loop

    execute format(
      'alter table public.%I enable row level security;',
      t
    );

    execute format(
      'drop policy if exists "allow_all_v1" on public.%I;',
      t
    );

    execute format(
      'drop policy if exists "authenticated_full_access" on public.%I;',
      t
    );

    execute format(
      'create policy "authenticated_full_access"
       on public.%I
       for all
       to authenticated
       using (auth.uid() is not null)
       with check (auth.uid() is not null);',
      t
    );

  end loop;

end $$;


-- =============================================================================
-- STORAGE — imagens de feedback
-- =============================================================================

drop policy if exists "feedback_images_read"
on storage.objects;

drop policy if exists "feedback_images_write"
on storage.objects;

drop policy if exists "feedback_images_update"
on storage.objects;

drop policy if exists "feedback_images_delete"
on storage.objects;

drop policy if exists "feedback_images_authenticated_read"
on storage.objects;

drop policy if exists "feedback_images_authenticated_insert"
on storage.objects;

drop policy if exists "feedback_images_authenticated_update"
on storage.objects;

drop policy if exists "feedback_images_authenticated_delete"
on storage.objects;


-- Leitura

create policy "feedback_images_authenticated_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'feedback-images'
  and auth.uid() is not null
);


-- Upload

create policy "feedback_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'feedback-images'
  and auth.uid() is not null
);


-- Atualização

create policy "feedback_images_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'feedback-images'
  and auth.uid() is not null
)
with check (
  bucket_id = 'feedback-images'
  and auth.uid() is not null
);


-- Exclusão

create policy "feedback_images_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'feedback-images'
  and auth.uid() is not null
);


-- =============================================================================
-- BUCKET PRIVADO
-- =============================================================================

update storage.buckets
set public = false
where id = 'feedback-images';


-- =============================================================================
-- FIM
-- =============================================================================
