/* =======================================================================
   CONFIGURAÇÃO DO SUPABASE
   -----------------------------------------------------------------------
   Preencha as duas linhas abaixo com os dados do SEU projeto Supabase
   (painel do Supabase -> Project Settings -> API).

   SOBRE A CHAVE:
   - Painéis mais recentes do Supabase chamam essa chave de "Publishable
     key" (começa com "sb_publishable_..."), em vez do antigo nome
     "anon public" (que geralmente começava com "eyJ..."). São a mesma
     coisa para este projeto — a chave pública, segura para uso no
     navegador. Cole o valor que o SEU painel mostrar em
     SUPABASE_ANON_KEY abaixo; o nome da constante ficou como
     SUPABASE_ANON_KEY porque é assim que o restante do código já
     referencia essa chave, mas o valor pode ser tanto uma "anon key"
     quanto uma "publishable key" — ambas funcionam.
   - NUNCA use a chave "service_role" (nem qualquer chave "secret") aqui.
     Essas nunca podem existir no navegador.

   SOBRE SEGURANÇA:
   - Como este é um site estático (GitHub Pages), não existe um jeito de
     esconder essas credenciais do público: qualquer pessoa que veja o
     código-fonte da página consegue ler essa URL e essa chave. Isso é
     esperado — quem protege os dados de verdade são as políticas de Row
     Level Security (RLS) do banco (ver supabase/auth-policies.sql), que
     exigem uma sessão autenticada (login) para qualquer leitura ou
     escrita. Sem estar logado, essa chave sozinha não acessa nada.
   ======================================================================= */

const SUPABASE_URL = 'https://wxnhhjmnkbocfydimfuv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T2hpEXLwdgQtGQJbJcsXvQ_Ss8d00pH';
