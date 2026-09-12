/* =======================================================================
   CLIENTE ÚNICO DO SUPABASE — compartilhado por login.html e index.html.
   -----------------------------------------------------------------------
   URL e chave existem em UM lugar só: js/config.js. Este arquivo só sabe
   criar o cliente a partir delas; cada página trata o caso de erro do
   jeito que faz sentido para ela (login.html mostra uma mensagem simples,
   index.html usa a tela cheia de erro já existente em js/app.js).
   ======================================================================= */

function createSupabaseClient(){
  if(!window.supabase || typeof window.supabase.createClient !== 'function') return null;
  if(!SUPABASE_URL || SUPABASE_URL.includes('COLOQUE_AQUI')) return null;
  if(!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('COLOQUE_AQUI')) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
