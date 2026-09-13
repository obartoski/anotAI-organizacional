-- =============================================================================
-- anotAI — Central de Notificações
-- Sistema + mensagens internas
-- =============================================================================

-- Estrutura adicional
alter table public.notifications
add column if not exists source text not null default 'system'
check (source in ('system', 'internal'));

alter table public.notifications
add column if not exists title text;

alter table public.notifications
add column if not exists message text;

alter table public.notifications
add column if not exists sender_user_id uuid
references auth.users(id)
on delete set null;

alter table public.notifications
add column if not exists recipient_user_id uuid
references auth.users(id)
on delete cascade;

alter table public.notifications
add column if not exists due_at timestamptz;

alter table public.notifications
add column if not exists resolved_at timestamptz;

alter table public.notifications
add column if not exists dismissed_at timestamptz;

alter table public.notifications
alter column entity_id drop not null;

alter table public.notifications
alter column type drop not null;


-- Validação
alter table public.notifications
drop constraint if exists notifications_source_sender_check;

alter table public.notifications
add constraint notifications_source_sender_check
check (
  source = 'system'
  or (
    source = 'internal'
    and sender_user_id is not null
  )
);


-- Índices
create index if not exists notifications_recipient_idx
on public.notifications(recipient_user_id);

create index if not exists notifications_sender_idx
on public.notifications(sender_user_id);

create index if not exists notifications_source_idx
on public.notifications(source);

create index if not exists notifications_created_at_idx
on public.notifications(created_at desc);


-- =============================================================================
-- RLS
-- =============================================================================

alter table public.notifications enable row level security;

drop policy if exists "authenticated_full_access"
on public.notifications;


-- Leitura
drop policy if exists "notifications_select"
on public.notifications;

create policy "notifications_select"
on public.notifications
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or sender_user_id = auth.uid()
  or public.is_admin()
);


-- Criação de mensagens internas
drop policy if exists "notifications_insert_internal"
on public.notifications;

create policy "notifications_insert_internal"
on public.notifications
for insert
to authenticated
with check (
  source = 'internal'
  and sender_user_id = auth.uid()
  and recipient_user_id is not null
);


-- Atualização
drop policy if exists "notifications_update"
on public.notifications;

create policy "notifications_update"
on public.notifications
for update
to authenticated
using (
  recipient_user_id = auth.uid()
  or public.is_admin()
)
with check (
  recipient_user_id = auth.uid()
  or public.is_admin()
);


-- Exclusão definitiva
drop policy if exists "notifications_delete"
on public.notifications;

create policy "notifications_delete"
on public.notifications
for delete
to authenticated
using (
  public.is_admin()
);


-- =============================================================================
-- Proteção dos dados principais
-- =============================================================================

create or replace function public.protect_notification_core_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if public.is_admin() then
    return new;
  end if;

  if
    new.id is distinct from old.id
    or new.source is distinct from old.source
    or new.type is distinct from old.type
    or new.entity_id is distinct from old.entity_id
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.sender_user_id is distinct from old.sender_user_id
    or new.recipient_user_id is distinct from old.recipient_user_id
    or new.due_at is distinct from old.due_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Os dados principais da notificação não podem ser alterados.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_notification_core_fields_trigger
on public.notifications;

create trigger protect_notification_core_fields_trigger
before update on public.notifications
for each row
execute function public.protect_notification_core_fields();
