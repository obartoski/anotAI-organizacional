# anotAI — Gestão de aulas particulares

Sistema interno para organizar a negociação, agenda, professores, pagamentos,
histórico e alertas das aulas particulares de Bike. Este documento assume que
você não é um desenvolvedor experiente — siga os passos na ordem.

---

## O que você vai precisar

- Uma conta gratuita no [Supabase](https://supabase.com)
- Uma conta no [GitHub](https://github.com) (para publicar com GitHub Pages)
- Um navegador. Não precisa instalar Node.js, nem usar terminal, para USAR o site depois de configurado.

---

## PASSO 1 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e entre (ou crie uma conta gratuita).
2. Clique em **"New project"**.
3. Escolha um nome (ex.: `anotai`), defina uma senha de banco (guarde-a em um lugar seguro) e escolha a região mais próxima (ex.: South America).
4. Clique em **"Create new project"** e aguarde alguns minutos até ele ficar pronto.

## PASSO 2 — Abrir o SQL Editor

1. No menu lateral do seu projeto, clique em **"SQL Editor"**.
2. Clique em **"New query"**.

## PASSO 3 — Executar o schema e as políticas de acesso

1. Abra o arquivo `supabase/schema.sql` (está junto com este README).
2. Copie **todo** o conteúdo do arquivo.
3. Cole no SQL Editor do Supabase.
4. Clique em **"Run"** (ou Ctrl+Enter).
5. Deve aparecer "Success. No rows returned". Isso confirma que todas as tabelas, os 5 professores iniciais e o espaço de armazenamento das imagens de feedback foram criados.
6. Repita o processo (New query → colar → Run) com o arquivo `supabase/auth-policies.sql` — ele cria as políticas de segurança (RLS) que exigem login para acessar os dados.

## PASSO 4 — Onde encontrar a URL do projeto

1. No menu lateral, clique no ícone de engrenagem: **"Project Settings"**.
2. Clique em **"API"**.
3. Copie o valor de **"Project URL"** (algo como `https://xxxxxxxxxxxx.supabase.co`).

## PASSO 5 — Onde encontrar a chave pública (anon / publishable)

1. Na mesma tela ("Project Settings" → "API"), procure a seção **"Project API keys"**.
2. Copie a chave pública — em painéis mais novos do Supabase ela aparece como **"Publishable key"** (começa com `sb_publishable_...`); em painéis mais antigos, como **"anon" / "public"** (começa com `eyJ...`). Qualquer uma das duas serve.
3. **Nunca copie uma chave "service_role" ou "secret"** — essas nunca devem ser usadas neste projeto.

## PASSO 6 — Onde inserir no projeto

1. Abra o arquivo `js/config.js` em qualquer editor de texto (o Bloco de Notas do Windows já serve).
2. Substitua as duas linhas:
   ```js
   const SUPABASE_URL = 'COLOQUE_AQUI_SUA_URL_DO_SUPABASE';
   const SUPABASE_ANON_KEY = 'COLOQUE_AQUI_SUA_PUBLISHABLE_KEY';
   ```
   pelos valores copiados nos passos 4 e 5, mantendo as aspas. Exemplo (com Publishable key, formato mais novo):
   ```js
   const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx';
   ```
3. Salve o arquivo.

## PASSO 7 — Criar os usuários que vão logar

O anotAI exige login (Supabase Auth). Os usuários são criados direto no
painel do Supabase — não existe tela de cadastro no site:

1. No painel do Supabase, vá em **"Authentication"** → **"Users"**.
2. Clique em **"Add user"** → **"Create new user"**.
3. Preencha e-mail e senha (ex.: `gustavo@anotai.com`) e marque a opção para
   confirmar o e-mail automaticamente (já que não há fluxo de confirmação
   por e-mail configurado nesta V1).
4. Repita para cada conta que for usar (ex.: `duda@anotai.com`,
   `padrao@anotai.com`).
5. Qualquer uma dessas contas consegue logar em `login.html` e terá acesso
   completo ao sistema — nesta V1 não existem níveis de permissão diferentes
   entre usuários.

## PASSO 8 — Testar localmente

Você não precisa de servidor nem de instalação para testar:

1. Dê duplo clique no arquivo `login.html`. Ele abre no seu navegador.
2. Entre com um dos e-mails/senhas que você criou no Passo 7.
3. Se tudo estiver certo, você será levado ao `index.html` com a saudação e "Nenhum evento com data agendada no momento."
4. Clique em **"Nova contratação"**, preencha nome e telefone, e confirme que aparece na lista de Clientes.
5. Recarregue a página (F5). O cliente que você criou deve continuar lá — isso confirma que os dados estão realmente salvos no Supabase, e não apenas na memória do navegador.

> Observação técnica: alguns navegadores restringem certas funções quando um
> arquivo HTML é aberto diretamente via `file://`. Se algo não funcionar
> localmente dessa forma, pule direto para o Passo 9/10 — publicado via GitHub
> Pages (servido por `https://`), tudo funciona normalmente.

## PASSO 9 — Subir no GitHub

1. Crie um repositório novo no GitHub (pode ser público ou privado — veja a nota de segurança abaixo).
2. Envie todos os arquivos deste projeto para esse repositório: `index.html`, `login.html`, `styles.css`, a pasta `js/`, a pasta `assets/`, e a pasta `supabase/` (os arquivos `.sql` ficam só de referência/versionamento — não são executados pelo site, mas não tem problema se estiverem no repositório).
   - Se você não usa Git pelo terminal, o próprio site do GitHub permite arrastar e soltar os arquivos na página do repositório ("Add file" → "Upload files").

## PASSO 10 — Abrir o GitHub Pages

1. No repositório, vá em **"Settings"** → **"Pages"**.
2. Em **"Source"**, selecione a branch `main` (ou `master`) e a pasta `/root`.
3. Clique em **"Save"**.
4. Aguarde 1–2 minutos. O GitHub vai mostrar o link público, algo como `https://seu-usuario.github.io/nome-do-repositorio/`.
5. Abra `.../login.html` — essa é a porta de entrada do anotAI.

---

## ⚠️ Sobre segurança

O anotAI agora **exige login** para acessar ou alterar qualquer dado — as
políticas de acesso (RLS) do banco só liberam leitura/escrita para quem tem
uma sessão válida do Supabase Auth. Isso é uma melhoria real em relação à
versão anterior (sem login), mas duas coisas continuam valendo:

- A URL e a chave pública do Supabase continuam visíveis no código-fonte da
  página — isso é inerente a qualquer site estático e não é, por si só, um
  problema: sem uma sessão autenticada, essa chave não consegue ler nem
  escrever nada nas tabelas protegidas.
- Nunca cole a chave `service_role` em nenhum arquivo deste projeto — ela
  nunca deve existir no navegador. A autenticação e a autorização continuam
  sendo feitas inteiramente pelo Supabase Auth + RLS.
- Todos os usuários autenticados têm, por enquanto, o mesmo nível de acesso
  (não há papéis ou permissões diferenciadas ainda).

---



## Estrutura dos arquivos

```
index.html              shell da aplicação (sidebar, header, modais, drawers) — protegido por login
login.html               tela de login (porta de entrada do anotAI)
styles.css              todo o CSS (identidade visual, responsividade, login, componentes)
js/
  config.js             ← única coisa que você precisa editar: URL + chave do Supabase
  supabase-client.js      cria o cliente do Supabase (usado por login.html E index.html)
  ui-components.js         componentes reutilizáveis: senha c/ olho, select, switch, date/time picker, máscara de telefone
  login.js                 lógica da tela de login (sessão, signInWithPassword, redirecionamento)
  data.js                estado dos dados em memória (populado a partir do banco) + labels/constantes
  icons.js                ícones SVG inline
  helpers.js             formatação, regras de horário/conflito, notificações derivadas, disponibilidade
  db.js                   TODA a comunicação com o Supabase fica centralizada aqui
  render-home.js          Home (hero + fila de trabalho)
  render-agenda.js        Agenda (abas, calendário mensal, grade semanal/diária, horários disponíveis)
  render-clients.js       Lista de clientes + página da contratação
  render-lesson.js        Página da aula (todos os blocos editáveis)
  render-grade.js         Grade da Bike + páginas de Perfil e Configurações
  render-ui.js             roteador de páginas, notificações, painel rápido, disponibilidade
  app.js                   estado da interface, eventos, formulários, checagem de sessão, inicialização
supabase/
  schema.sql                    tabelas, enums, sequences, dados iniciais — cole no SQL Editor do Supabase
  auth-policies.sql             políticas de acesso (RLS) — exige login para ler/escrever dados
  user-profiles-insert-policy.sql  política adicional p/ user_profiles (ver nota abaixo)
assets/
  (coloque aqui o seu anotai.logo.png quando tiver um)
```

> **SQL pendente desta rodada:** `supabase/user-profiles-insert-policy.sql` ainda
> precisa ser executado uma vez no SQL Editor do Supabase. A tabela
> `user_profiles` já existe e já tinha políticas de leitura/atualização do
> próprio perfil — faltava só a de criação, usada quando o Perfil salva um
> nome de exibição pela primeira vez.

## Sobre login e sessão

`login.html` e `index.html` sempre verificam a sessão do Supabase Auth antes
de mostrar qualquer coisa na tela (existe uma tela de carregamento breve
— a "boot-gate" — exatamente para evitar que o conteúdo pisque antes do
redirecionamento). Se você já estiver logado, abrir `login.html` te manda
direto para `index.html`; se não estiver, `index.html` te manda direto para
`login.html`. Isso é verificado no navegador a cada carregamento — não existe
"lembrar de mim" além da própria sessão do Supabase, que dura até você clicar
em **Sair** (no Perfil) ou ela expirar.

## Sobre a logo

O projeto está preparado para usar `assets/anotai.logo.png`. Basta colocar o arquivo
PNG nessa pasta com esse nome exato. Enquanto o arquivo não existir, a
interface usa automaticamente o texto "anotAI" estilizado no lugar — nada
quebra. A mesma imagem é reaproveitada na tela de login, na sidebar e na Home.

## O que a V1 não faz (por decisão de escopo)

Múltiplos níveis de permissão entre usuários (por enquanto todo usuário
autenticado tem acesso completo), histórico de quem fez cada alteração,
geração automática de orçamento em PDF,
processamento de pagamentos dentro da plataforma, lista de convidados, busca
global, envio automático de mensagens (WhatsApp/TalkMi/e-mail), regras
automáticas de desconto/parcelamento, e confirmação automática de status. O
sistema sempre organiza, calcula e alerta — quem decide é você.

## Problemas comuns

**"Não foi possível carregar o anotAI" ao abrir o site**
→ Verifique se `js/config.js` foi preenchido corretamente (Passo 6) e se você
copiou a chave pública correta (Publishable key ou anon — não a "service_role"). Confira também sua conexão com
a internet.

**Criei algo e ele sumiu ao recarregar**
→ Isso indicaria que o Supabase não está configurado corretamente, ou que o
schema não foi executado (Passo 3). Volte e confira os passos 3, 4, 5 e 6.

**Quero saber se meus dados estão realmente no banco**
→ No painel do Supabase, vá em **"Table Editor"** e abra a tabela
`contracts` — você deve ver ali as contratações que criou pelo site.
