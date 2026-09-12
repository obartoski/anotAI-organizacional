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
    sb.from('teachers').select('*').eq('active', true).order('priority_order', { ascending: true }),
    sb.from('weekly_schedule').select('*').order('weekday').order('start_time'),
  ]);

  if(contractsRes.error) throw contractsRes.error;
  if(teachersRes.error) throw teachersRes.error;
  if(scheduleRes.error) throw scheduleRes.error;

  CONTRACTS = contractsRes.data.map(mapContractRow);
  TEACHERS = teachersRes.data.map(t => ({ id: t.id, name: t.name }));

  SCHEDULE_ROWS = scheduleRes.data;
  const grouped = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  for(const row of SCHEDULE_ROWS){
    if(row.active) grouped[row.weekday].push(row.start_time.slice(0,5));
  }
  FIXED_SCHEDULE = grouped;

  APP_BOOTED = true;
  APP_LOAD_ERROR = null;
}

/* ---------- contratos ---------- */
async function dbCreateContract({ client_name, phone }){
  const { data, error } = await sb.from('contracts').insert({ client_name, phone }).select('*').single();
  if(error) throw error;
  return data;
}
async function dbUpdateContract(id, patch){
  const { error } = await sb.from('contracts').update(patch).eq('id', id);
  if(error) throw error;
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
