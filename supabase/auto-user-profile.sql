-- =============================================================================
-- anotAI — Criação automática de user_profiles
-- =============================================================================

-- Função executada sempre que um novo usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    display_name,
    role
  )
  values (
    new.id,
    case
      when new.email = 'padrao@anotai.com' then 'Anoter'
      when new.email is not null then initcap(split_part(new.email, '@', 1))
      else 'Usuário'
    end,
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


-- Remove trigger anterior, caso exista
drop trigger if exists on_auth_user_created
on auth.users;


-- Cria trigger automático
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
