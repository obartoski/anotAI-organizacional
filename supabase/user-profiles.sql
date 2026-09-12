-- =============================================================================
-- anotAI — Perfis de usuário
-- =============================================================================

create table if not exists user_profiles (

  id uuid primary key references auth.users(id) on delete cascade,

  display_name text not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);


-- Atualiza updated_at automaticamente

create or replace function set_user_profiles_updated_at()
returns trigger
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


drop trigger if exists trg_user_profiles_updated_at
on user_profiles;


create trigger trg_user_profiles_updated_at
before update on user_profiles
for each row
execute function set_user_profiles_updated_at();


-- =============================================================================
-- RLS
-- =============================================================================

alter table user_profiles enable row level security;


drop policy if exists "users_read_own_profile"
on user_profiles;


create policy "users_read_own_profile"
on user_profiles
for select
to authenticated
using (
  auth.uid() = id
);


drop policy if exists "users_update_own_profile"
on user_profiles;


create policy "users_update_own_profile"
on user_profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


-- =============================================================================
-- PERFIS INICIAIS
-- =============================================================================

insert into user_profiles (
  id,
  display_name
)

select
  id,
  case email

    when 'gustavo@anotai.com' then 'Gustavo'

    when 'duda@anotai.com' then 'Duda'

    when 'padrao@anotai.com' then 'Anoter'

    else split_part(email, '@', 1)

  end

from auth.users

on conflict (id) do nothing;


-- =============================================================================
-- FIM
-- =============================================================================
