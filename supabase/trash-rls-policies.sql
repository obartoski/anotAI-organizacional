-- =============================================================================
-- anotAI — RLS da Lixeira
-- Protege contratos excluídos e seus dados relacionados.
-- =============================================================================


-- =============================================================================
-- FUNÇÃO AUXILIAR — ADMIN
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


-- =============================================================================
-- CONTRACTS
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.contracts;

drop policy if exists "contracts_select" on public.contracts;
drop policy if exists "contracts_insert" on public.contracts;
drop policy if exists "contracts_update" on public.contracts;
drop policy if exists "contracts_delete" on public.contracts;


-- Leitura:
-- members veem apenas contratos ativos;
-- admins também veem a lixeira.

create policy "contracts_select"
on public.contracts
for select
to authenticated
using (
  deleted_at is null
  or public.is_admin()
);


-- Criação:
-- novos contratos sempre entram ativos.

create policy "contracts_insert"
on public.contracts
for insert
to authenticated
with check (
  deleted_at is null
  and deleted_by is null
);


-- Atualização:
-- members podem editar contratos ativos e movê-los para a lixeira;
-- admins também podem trabalhar com contratos já excluídos.

create policy "contracts_update"
on public.contracts
for update
to authenticated
using (
  deleted_at is null
  or public.is_admin()
)
with check (
  public.is_admin()
  or (
    deleted_at is null
    and deleted_by is null
  )
  or (
    deleted_at is not null
    and deleted_by = auth.uid()
  )
);


-- Exclusão definitiva:
-- somente admin.

create policy "contracts_delete"
on public.contracts
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- LESSONS
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.lessons;

drop policy if exists "lessons_select" on public.lessons;
drop policy if exists "lessons_insert" on public.lessons;
drop policy if exists "lessons_update" on public.lessons;
drop policy if exists "lessons_delete" on public.lessons;


create policy "lessons_select"
on public.lessons
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = lessons.contract_id
      and c.deleted_at is null
  )
);


create policy "lessons_insert"
on public.lessons
for insert
to authenticated
with check (
  exists (
    select 1
    from public.contracts c
    where c.id = lessons.contract_id
      and c.deleted_at is null
  )
);


create policy "lessons_update"
on public.lessons
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = lessons.contract_id
      and c.deleted_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = lessons.contract_id
      and c.deleted_at is null
  )
);


create policy "lessons_delete"
on public.lessons
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- CONTRACT NOTES
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.contract_notes;

drop policy if exists "contract_notes_select" on public.contract_notes;
drop policy if exists "contract_notes_insert" on public.contract_notes;
drop policy if exists "contract_notes_update" on public.contract_notes;
drop policy if exists "contract_notes_delete" on public.contract_notes;


create policy "contract_notes_select"
on public.contract_notes
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = contract_notes.contract_id
      and c.deleted_at is null
  )
);


create policy "contract_notes_insert"
on public.contract_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.contracts c
    where c.id = contract_notes.contract_id
      and c.deleted_at is null
  )
);


create policy "contract_notes_update"
on public.contract_notes
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = contract_notes.contract_id
      and c.deleted_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.contracts c
    where c.id = contract_notes.contract_id
      and c.deleted_at is null
  )
);


create policy "contract_notes_delete"
on public.contract_notes
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- LESSON NOTES
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.lesson_notes;

drop policy if exists "lesson_notes_select" on public.lesson_notes;
drop policy if exists "lesson_notes_insert" on public.lesson_notes;
drop policy if exists "lesson_notes_update" on public.lesson_notes;
drop policy if exists "lesson_notes_delete" on public.lesson_notes;


create policy "lesson_notes_select"
on public.lesson_notes
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_notes.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_notes_insert"
on public.lesson_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_notes.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_notes_update"
on public.lesson_notes
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_notes.lesson_id
      and c.deleted_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_notes.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_notes_delete"
on public.lesson_notes
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- LESSON FEEDBACK
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.lesson_feedback;

drop policy if exists "lesson_feedback_select" on public.lesson_feedback;
drop policy if exists "lesson_feedback_insert" on public.lesson_feedback;
drop policy if exists "lesson_feedback_update" on public.lesson_feedback;
drop policy if exists "lesson_feedback_delete" on public.lesson_feedback;


create policy "lesson_feedback_select"
on public.lesson_feedback
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_feedback.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_feedback_insert"
on public.lesson_feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_feedback.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_feedback_update"
on public.lesson_feedback
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_feedback.lesson_id
      and c.deleted_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_feedback.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_feedback_delete"
on public.lesson_feedback
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- LESSON TEACHER CHECKS
-- =============================================================================

drop policy if exists "authenticated_full_access"
on public.lesson_teacher_checks;

drop policy if exists "lesson_teacher_checks_select"
on public.lesson_teacher_checks;

drop policy if exists "lesson_teacher_checks_insert"
on public.lesson_teacher_checks;

drop policy if exists "lesson_teacher_checks_update"
on public.lesson_teacher_checks;

drop policy if exists "lesson_teacher_checks_delete"
on public.lesson_teacher_checks;


create policy "lesson_teacher_checks_select"
on public.lesson_teacher_checks
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_teacher_checks.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_teacher_checks_insert"
on public.lesson_teacher_checks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_teacher_checks.lesson_id
      and c.deleted_at is null
  )
);


create policy "lesson_teacher_checks_update"
on public.lesson_teacher_checks
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
    where l.id = lesson_teacher_checks.lesson_id
      and c.deleted_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.lessons l
    join public.contracts c on c.id = l.contract_id
      and c.deleted_at is null
  )
);


create policy "lesson_teacher_checks_delete"
on public.lesson_teacher_checks
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- FIM
-- =============================================================================
