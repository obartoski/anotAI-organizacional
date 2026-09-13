-- =============================================================================
-- anotAI — Política adicional para user_profiles (INSERT)
-- =============================================================================
-- A tabela `user_profiles` já existe e já tem RLS para SELECT/UPDATE do
-- próprio perfil (auth.uid() = id). Esta rodada adicionou a tela de
-- "Editar nome de exibição" no Perfil, que usa upsert (atualiza se já
-- existir, cria se não existir). Para o "criar se não existir" funcionar
-- para QUALQUER usuário futuro que ainda não tenha uma linha em
-- user_profiles (os 3 e-mails atuais já têm, então isso não afeta o uso
-- de hoje), falta uma política de INSERT.
--
-- Só é preciso rodar isto UMA VEZ no SQL Editor do Supabase. Não recria
-- nem altera a tabela — só adiciona a política que faltava.
-- =============================================================================

drop policy if exists "users_insert_own_profile" on user_profiles;

create policy "users_insert_own_profile"
on user_profiles
for insert
to authenticated
with check (
  auth.uid() = id
);
