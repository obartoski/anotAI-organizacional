/* =======================================================================
   CAMADA DE ACESSO AO SUPABASE
   -----------------------------------------------------------------------
   Toda comunicação com o banco fica centralizada aqui. Nenhuma outra
   parte do app deve chamar `sb.from(...)` diretamente — isso mantém a
   URL/chave e o formato das tabelas em um único lugar (Parte 3, item 22).

   Padrão adotado (deliberadamente simples para o tamanho deste app):
   depois de qualquer criação/edição/remoção, chamamos reloadAll(), que
   busca TUDO de novo do banco e re-renderiza a partir dos dados frescos.
   Como o volume de dados de uma agenda pessoal é pequeno, isso é mais
   simples e mais seguro contra inconsistência do que tentar atualizar o
   estado local em memória em cada operação.
   ======================================================================= */

var sb = null; // cliente do supabase-js, criado em initSupabase() — ver js/supabase-client.js

function initSupabase(){
  sb = createSupabaseClient();
  if(!sb){
    if(!window.supabase || typeof window.supabase.createClient !== 'function'){
      APP_LOAD_ERROR = 'A biblioteca do Supabase não carregou. Verifique sua conexão com a internet e recarregue a página.';
    } else {
      APP_LOAD_ERROR = 'O Supabase ainda não foi configurado. Abra js/config.js e preencha SUPABASE_URL e SUPABASE_ANON_KEY — o README explica passo a passo.';
    }
    return false;
  }
  return true;
}

/* ---------- mapeamento: linha do banco -> formato usado pelo render ---------- */
function mapContractRow(row){
  return {
    id: row.id,
    display_number: row.display_number,
    client_name: row.client_name,
    phone: row.phone,
    email: row.email || '',
    channel: row.contact_channel || null,
    is_member: row.is_member,
    preferred_teacher_id: row.preferred_teacher_id || null,
    deleted_at: row.deleted_at || null,
    deleted_by: row.deleted_by || null,
    notes: (row.contract_notes || [])
      .map(n => ({ id: n.id, created_at: n.created_at, text: n.text })),
    lessons: (row.lessons || [])
      .map(mapLessonRow)
      .sort((a,b) => a.number - b.number),
  };
}
function mapLessonRow(l){
  const fb = Array.isArray(l.lesson_feedback) ? l.lesson_feedback[0] : l.lesson_feedback;
  return {
    id: l.id,
    number: l.lesson_number,
    date: l.date,
    base_time: l.base_time ? l.base_time.slice(0,5) : null,
    actual_start_time: l.actual_start_time ? l.actual_start_time.slice(0,5) : null,
    status: l.status,
    teacher_id: l.selected_teacher_id,
    quote: (l.quote_amount != null || l.quote_status !== 'not_sent')
      ? { amount: l.quote_amount, sent_at: l.quote_sent_at, status: l.quote_status }
      : null,
    payment: {
      status: l.payment_status, amount: l.amount_paid, method: l.payment_method,
      expected: l.expected_payment_date, actual: l.actual_payment_date,
    },
    rooftop: !!l.rooftop,
    frans_cafe: !!l.frans_cafe,
    complement_notes: l.complement_notes || '',
    special_requirements: l.special_requirements || '',
    notes: (l.lesson_notes || []).map(n => ({ id: n.id, created_at: n.created_at, text: n.text })),
    teacher_checks: Object.fromEntries((l.lesson_teacher_checks || []).map(c => [c.teacher_id, c.status])),
    feedback: fb ? { id: fb.id, image: fb.image_url, description: fb.description } : null,
  };
}

/* ---------- carga geral ---------- */
async function reloadAll(){
  const [contractsRes, teachersRes, scheduleRes] = await Promise.all([
    sb.from('contracts')
      .select(`*, contract_notes(*), lessons(*, lesson_teacher_checks(*), lesson_notes(*), lesson_feedback(*))`)
      .order('display_number', { ascending: true }),
    sb.from('teachers').select('*').order('priority_order', { ascending: true }),
    sb.from('weekly_schedule').select('*').order('weekday').order('start_time'),
  ]);

  if(contractsRes.error) throw contractsRes.error;
  if(teachersRes.error) throw teachersRes.error;
  if(scheduleRes.error) throw scheduleRes.error;

  const allContracts = contractsRes.data.map(mapContractRow);
  // Ignora contratações excluídas (soft delete) em todas as áreas normais —
  // Home, Agenda, Clientes, disponibilidade etc. leem CONTRACTS e nunca
  // precisam saber da lixeira. Para member, o RLS já nem devolve essas
  // linhas; para admin, o RLS devolve tudo e é aqui que separamos.
  CONTRACTS = allContracts.filter(c => !c.deleted_at);
  TRASHED_CONTRACTS = allContracts.filter(c => !!c.deleted_at);

  // ALL_TEACHERS: todos (ativos ou não) — usado só para resolver NOME em telas
  // de leitura, para não quebrar contratações antigas com preferência por um
  // professor desativado depois. TEACHERS: só ativos — é a lista usada em
  // todo select/formulário de escolha.
  ALL_TEACHERS = teachersRes.data.map(t => ({ id: t.id, name: t.name, active: t.active }));
  TEACHERS = ALL_TEACHERS.filter(t => t.active !== false);

  SCHEDULE_ROWS = scheduleRes.data;
  const grouped = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  for(const row of SCHEDULE_ROWS){
    if(row.active) grouped[row.weekday].push(row.start_time.slice(0,5));
  }
  FIXED_SCHEDULE = grouped;

  // Nome de quem excluiu cada item da lixeira. Melhor esforço: a política de
  // leitura de user_profiles hoje só permite ler o PRÓPRIO perfil
  // (auth.uid() = id) — sem uma exceção para admin, só é possível resolver
  // o nome quando o próprio admin foi quem excluiu. Nos demais casos cai no
  // fallback "Usuário" (nunca mostramos o UUID). Ver aviso na entrega.
  TRASH_DELETER_NAMES = {};
  const deleterIds = [...new Set(TRASHED_CONTRACTS.map(c => c.deleted_by).filter(Boolean))];
  if(deleterIds.length){
    try{
      const profiles = await dbGetUserProfilesByIds(deleterIds);
      profiles.forEach(p => { TRASH_DELETER_NAMES[p.id] = p.display_name; });
    }catch(err){
      console.error(err);
    }
  }

  // Perfis de usuário (para o select "Para" da Central de Notificações e para
  // exibir nomes) e mensagens internas persistidas. Buscados à parte: se por
  // qualquer motivo falharem, o resto do app continua funcionando (item 15
  // da rodada — nunca travar o boot por causa da Central de Notificações).
  try{
    const [profilesRes, notifRes] = await Promise.all([
      sb.from('user_profiles').select('*'),
      sb.from('notifications').select('*').eq('source', 'internal').order('created_at', { ascending: false }),
    ]);
    if(profilesRes.error) throw profilesRes.error;
    if(notifRes.error) throw notifRes.error;
    USER_PROFILES = profilesRes.data || [];
    INTERNAL_NOTIFICATIONS = notifRes.data || [];
  }catch(err){
    console.error(err);
    USER_PROFILES = [];
    INTERNAL_NOTIFICATIONS = [];
  }

  APP_BOOTED = true;
  APP_LOAD_ERROR = null;
}

/* ---------- contratos ---------- */
async function dbCreateContract({ client_name, phone, is_member, preferred_teacher_id }){
  const payload = { client_name, phone };
  if(is_member !== undefined) payload.is_member = is_member;
  if(preferred_teacher_id !== undefined) payload.preferred_teacher_id = preferred_teacher_id;
  const { data, error } = await sb.from('contracts').insert(payload).select('*').single();
  if(error) throw error;
  return data;
}
async function dbUpdateContract(id, patch){
  const { error } = await sb.from('contracts').update(patch).eq('id', id);
  if(error) throw error;
}
async function dbDeleteContract(id){
  // Exclusão DEFINITIVA (usada só a partir da Lixeira, por admin). As tabelas
  // relacionadas (lessons, contract_notes, ...) têm ON DELETE CASCADE no
  // schema — apagar o contrato basta.
  const { error } = await sb.from('contracts').delete().eq('id', id);
  if(error) throw error;
}

/* ---------- lixeira (soft delete) ---------- */
async function dbSoftDeleteContract(id, userId){
  const { error } = await sb.from('contracts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id);
  if(error) throw error;
}
async function dbRestoreContract(id){
  const { error } = await sb.from('contracts')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id);
  if(error) throw error;
}
/* Resolve nomes de quem excluiu, para exibir na Lixeira (nunca UUID cru).
   Melhor esforço: ver nota em reloadAll() sobre a limitação de RLS. */
async function dbGetUserProfilesByIds(ids){
  const uniqueIds = [...new Set(ids)];
  if(!uniqueIds.length) return [];
  const { data, error } = await sb.from('user_profiles').select('*').in('id', uniqueIds);
  if(error) throw error;
  return data || [];
}

/* ---------- aulas ---------- */
async function dbCreateLesson({ contract_id, date, base_time, actual_start_time, status, selected_teacher_id }){
  const { data, error } = await sb.from('lessons').insert({
    contract_id, date: date || null, base_time: base_time || null,
    actual_start_time: actual_start_time || base_time || null,
    status: status || 'interest', selected_teacher_id: selected_teacher_id || null,
  }).select('*').single();
  if(error) throw error;
  return data;
}
async function dbUpdateLesson(id, patch){
  const { error } = await sb.from('lessons').update(patch).eq('id', id);
  if(error) throw error;
}

/* ---------- professores por aula ---------- */
async function dbSetTeacherCheck(lessonId, teacherId, status){
  const { error } = await sb.from('lesson_teacher_checks')
    .upsert({ lesson_id: lessonId, teacher_id: teacherId, status }, { onConflict: 'lesson_id,teacher_id' });
  if(error) throw error;
}
async function dbSetSelectedTeacher(lessonId, teacherId){
  const { error } = await sb.from('lessons').update({ selected_teacher_id: teacherId }).eq('id', lessonId);
  if(error) throw error;
}

/* ---------- histórico (notas) ---------- */
async function dbAddContractNote(contractId, text){
  const { error } = await sb.from('contract_notes').insert({ contract_id: contractId, text });
  if(error) throw error;
}
async function dbUpdateContractNote(id, text){
  const { error } = await sb.from('contract_notes').update({ text }).eq('id', id);
  if(error) throw error;
}
async function dbDeleteContractNote(id){
  const { error } = await sb.from('contract_notes').delete().eq('id', id);
  if(error) throw error;
}
async function dbAddLessonNote(lessonId, text){
  const { error } = await sb.from('lesson_notes').insert({ lesson_id: lessonId, text });
  if(error) throw error;
}
async function dbUpdateLessonNote(id, text){
  const { error } = await sb.from('lesson_notes').update({ text }).eq('id', id);
  if(error) throw error;
}
async function dbDeleteLessonNote(id){
  const { error } = await sb.from('lesson_notes').delete().eq('id', id);
  if(error) throw error;
}

/* ---------- grade fixa ---------- */
async function dbAddScheduleSlot(weekday, startTime){
  const { error } = await sb.from('weekly_schedule').insert({ weekday, start_time: startTime });
  if(error) throw error;
}
async function dbRemoveScheduleSlot(id){
  const { error } = await sb.from('weekly_schedule').delete().eq('id', id);
  if(error) throw error;
}

/* ---------- feedback (com upload de imagem) ---------- */
const FEEDBACK_BUCKET = 'feedback-images';
async function dbSaveFeedback(lessonId, file, description){
  let image_url;
  if(file){
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `lessons/${lessonId}/feedback-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from(FEEDBACK_BUCKET).upload(path, file, { upsert: true });
    if(upErr) throw upErr;
    image_url = sb.storage.from(FEEDBACK_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  const payload = { lesson_id: lessonId, description: description || null };
  if(image_url) payload.image_url = image_url;
  const { error } = await sb.from('lesson_feedback').upsert(payload, { onConflict: 'lesson_id' });
  if(error) throw error;
}
async function dbRemoveFeedbackImage(lessonId){
  const { error } = await sb.from('lesson_feedback').update({ image_url: null }).eq('lesson_id', lessonId);
  if(error) throw error;
}

/* ---------- perfil do usuário (user_profiles) ---------- */
async function dbGetUserProfile(userId){
  const { data, error } = await sb.from('user_profiles').select('*').eq('id', userId).maybeSingle();
  if(error) throw error;
  return data; // pode vir null se ainda não existir linha para este usuário
}
/* Tenta atualizar; se não existir linha ainda (usuário sem perfil), cria uma.
   Precisa da política de INSERT em user_profiles — ver
   supabase/user-profiles-insert-policy.sql (arquivo novo desta rodada). */
async function dbUpsertUserProfile(userId, displayName){
  const { data, error } = await sb
    .from('user_profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
    .select('*')
    .single();
  if(error) throw error;
  return data;
}

/* ---------- central de notificações (mensagens internas) ---------- */
/* Carregamento em si acontece dentro de reloadAll() (para não duplicar
   fetch); estas duas funções ficam disponíveis para quem quiser recarregar
   sob demanda no futuro, mantendo o padrão de acesso centralizado. */
async function dbLoadUserProfiles(){
  const { data, error } = await sb.from('user_profiles').select('*');
  if(error) throw error;
  return data || [];
}
async function dbLoadInternalNotifications(){
  const { data, error } = await sb.from('notifications')
    .select('*')
    .eq('source', 'internal')
    .order('created_at', { ascending: false });
  if(error) throw error;
  return data || [];
}
async function dbCreateInternalNotification({ title, message, recipient_user_id, due_at }){
  const { error } = await sb.from('notifications').insert({
    source: 'internal',
    type: null,
    title,
    message,
    sender_user_id: currentUserId,
    recipient_user_id,
    due_at: due_at || null,
    seen: false,
  });
  if(error) throw error;
}
async function dbMarkNotificationSeen(id){
  const { error } = await sb.from('notifications').update({ seen: true }).eq('id', id);
  if(error) throw error;
}
async function dbResolveNotification(id){
  const { error } = await sb.from('notifications').update({ resolved_at: new Date().toISOString() }).eq('id', id);
  if(error) throw error;
}
async function dbDismissNotification(id){
  const { error } = await sb.from('notifications').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
  if(error) throw error;
}
