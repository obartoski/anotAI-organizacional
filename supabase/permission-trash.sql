-- =============================================================================
-- anotAI — Permissões + Lixeira
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. NÍVEL DE ACESSO DOS USUÁRIOS
-- -----------------------------------------------------------------------------

alter table user_profiles
add column if not exists role text not null default 'member';

alter table user_profiles
drop constraint if exists user_profiles_role_check;

alter table user_profiles
add constraint user_profiles_role_check
check (role in ('admin', 'member'));


-- Gustavo = administrador

update user_profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'gustavo@anotai.com'
  limit 1
);


-- Duda e demais usuários permanecem member

update user_profiles
set role = 'member'
where id in (
  select id
  from auth.users
  where email in (
    'duda@anotai.com',
    'padrao@anotai.com'
  )
);


-- -----------------------------------------------------------------------------
-- 2. SOFT DELETE / LIXEIRA DAS CONTRATAÇÕES
-- -----------------------------------------------------------------------------

alter table contracts
add column if not exists deleted_at timestamptz;

alter table contracts
add column if not exists deleted_by uuid
references auth.users(id)
on delete set null;


-- Índice útil para encontrar rapidamente itens ativos/excluídos

create index if not exists idx_contracts_deleted_at
on contracts (deleted_at);


-- =============================================================================
-- FIM
-- =============================================================================
