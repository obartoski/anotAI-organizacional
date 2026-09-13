-- Permite que usuários autenticados consultem os membros do anotAI.
-- Necessário para selects de destinatários e exibição de nomes.

drop policy if exists "users_read_own_profile"
on public.user_profiles;

drop policy if exists "admin_read_all_profiles"
on public.user_profiles;

create policy "users_read_authenticated_profiles"
on public.user_profiles
for select
to authenticated
using (
  auth.uid() is not null
);
