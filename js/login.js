/* =======================================================================
   LÓGICA DA PÁGINA DE LOGIN (login.html)
   ======================================================================= */

function revealLogin(){
  document.body.classList.remove('booting');
  document.getElementById('boot-gate').classList.add('hidden');
}

function showLoginError(message){
  const el = document.getElementById('login-error');
  el.textContent = message;
  el.classList.add('show');
}
function hideLoginError(){
  const el = document.getElementById('login-error');
  el.classList.remove('show');
  el.textContent = '';
}

async function initLoginPage(){
  const sb = createSupabaseClient();

  if(!sb){
    revealLogin();
    showLoginError('O Supabase ainda não foi configurado (js/config.js). Preencha SUPABASE_URL e SUPABASE_ANON_KEY.');
    document.getElementById('login-submit').disabled = true;
    return;
  }

  // Já existe sessão válida? Não mostra a tela de login — vai direto para o app.
  try{
    const { data, error } = await sb.auth.getSession();
    if(error) throw error;
    if(data.session){
      window.location.replace('index.html');
      return; // mantém a boot-gate cobrindo a tela durante o redirecionamento
    }
  }catch(err){
    console.error(err);
    // Se não deu para verificar a sessão, seguimos para a tela de login normalmente.
  }

  revealLogin();

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try{
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){
        showLoginError('Parece que não vai anotAI 😂');
        return;
      }
      window.location.href = 'index.html';
    }catch(err){
      console.error(err);
      showLoginError('Parece que não vai anotAI 😂');
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });
}

document.addEventListener('DOMContentLoaded', initLoginPage);
