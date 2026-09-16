/* ======================= HELPERS ======================= */

function pad2(n){ return String(n).padStart(2,'0'); }

function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmtContractNumber(n){ return '#' + String(n).padStart(3,'0'); }

function fmtDateBR(iso){
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
const SHORT_MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
function fmtDateShort(iso){
  if(!iso) return '—';
  const [,m,d] = iso.split('-').map(Number);
  return `${pad2(d)} ${SHORT_MONTHS[m-1]}`;
}
function fmtCurrency(v){
  if(v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
/* ---------- nome de exibição: fallback a partir do e-mail ---------- */
/* Usado só quando não existe linha em user_profiles (ou display_name vazio)
   para o usuário autenticado — ex.: "gustavo@anotai.com" -> "Gustavo". */
function fallbackDisplayNameFromEmail(email){
  if(!email) return 'Você';
  const local = email.split('@')[0] || '';
  if(!local) return 'Você';
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

function fmtPhone(phone){
  const digits = (phone||'').replace(/\D/g,'');
  if(digits.length===11) return `(${digits.slice(0,2)}) ${digits.slice(2,3)} ${digits.slice(3,7)}-${digits.slice(7)}`;
  if(digits.length===10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return phone || '—';
}
function fmtNoteTimestamp(iso){
  const d = new Date(iso);
  const date = `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `${date} · ${time}`;
}

/* ---------- mensagens internas: prazo (due_at) ---------- */
function fmtDueAt(iso){
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ---------- lixeira: tempo desde a exclusão + janela de recuperação rápida ---------- */
function fmtElapsedSince(iso){
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if(mins < 1) return 'agora mesmo';
  if(mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if(hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? '' : 's'}`;
}
const TRASH_RECOVERY_WINDOW_HOURS = 24;
function trashRecoveryWindow(iso){
  const hoursElapsed = (Date.now() - new Date(iso).getTime()) / 3600000;
  if(hoursElapsed >= TRASH_RECOVERY_WINDOW_HOURS){
    return { withinWindow: false, label: 'Prazo de recuperação rápida encerrado' };
  }
  const remaining = Math.max(1, Math.ceil(TRASH_RECOVERY_WINDOW_HOURS - hoursElapsed));
  return { withinWindow: true, label: `Recuperação rápida disponível · ${remaining}h restantes` };
}

function clientColor(displayNumber){
  return CLIENT_COLORS[(displayNumber - 1) % CLIENT_COLORS.length];
}
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function daysUntil(iso){
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}
function weekdayFromDate(iso){
  const [y,m,d] = iso.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m-1, d, 12)).getUTCDay(); // 0=Sun..6=Sat
  const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return names[jsDay];
}
function isoAddDays(iso, days){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function mondayOf(iso){
  const [y,m,d] = iso.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y,m-1,d,12)).getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  return isoAddDays(iso, diffToMonday);
}

/* ---------- flatten helpers ---------- */
function allLessonsFlat(){
  const out = [];
  for(const c of CONTRACTS){
    for(const l of c.lessons){
      out.push({ lesson: l, contract: c });
    }
  }
  return out;
}
function getContractById(id){ return CONTRACTS.find(c => c.id === id) || null; }
function getLessonRef(contractId, lessonId){
  const c = getContractById(contractId);
  if(!c) return null;
  const l = c.lessons.find(x => x.id === lessonId);
  return l ? { contract:c, lesson:l } : null;
}

/* ---------- scheduling (mesma lógica do app real, em JS puro) ---------- */
const PRIVATE_PREP = 20, PRIVATE_CLASS = 50, PRIVATE_WRAP = 20;
const FIXED_TOTAL = 60;

function timeToMin(hhmm){ const [h,m] = hhmm.split(':').map(Number); return h*60+m; }
function minToTime(total){
  const n = ((total % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(n/60))}:${pad2(n%60)}`;
}
function fixedOcc(start){ const s = timeToMin(start); return { start:s, end:s+FIXED_TOTAL }; }
function privateOcc(actualStart){ const s = timeToMin(actualStart); return { start: s-PRIVATE_PREP, end: s+PRIVATE_CLASS+PRIVATE_WRAP }; }
function overlaps(a,b){ return a.start < b.end && b.start < a.end; }

function calcAvailability(date, baseTime, excludeLessonId){
  const weekday = weekdayFromDate(date);
  const fixedSlots = FIXED_SCHEDULE[weekday] || [];
  const hard = fixedSlots.map(slot => {
    const occ = fixedOcc(slot);
    return { ...occ, type:'fixed_schedule', message: `Conflito com aula fixa de Bike — ${slot} às ${minToTime(occ.end)}.` };
  });
  const soft = [];

  for(const { lesson, contract } of allLessonsFlat()){
    if(lesson.date !== date) continue;
    if(lesson.id === excludeLessonId) continue;
    if(!lesson.actual_start_time) continue;
    if(!['pre_reservation','confirmed'].includes(lesson.status)) continue;
    const occ = privateOcc(lesson.actual_start_time);
    const label = `${fmtContractNumber(contract.display_number)} — ${contract.client_name}`;
    if(lesson.status === 'confirmed'){
      hard.push({ ...occ, type:'confirmed_lesson', message: `Conflito com reserva confirmada ${label}.` });
    } else {
      soft.push({ ...occ, type:'pre_reservation', message: `Existe uma pré-reserva ${label} neste horário. O horário permanece disponível para negociação.` });
    }
  }

  const requested = timeToMin(baseTime);
  const directHit = hard.find(iv => requested >= iv.start && requested < iv.end);
  let adjusted = requested, wasAdjusted = false;

  if(!directHit){
    for(let i=0;i<4;i++){
      const prepStart = adjusted - PRIVATE_PREP;
      const blocking = hard.find(iv => iv.start < adjusted && iv.end > prepStart && iv.end <= adjusted);
      if(!blocking) break;
      adjusted = blocking.end + PRIVATE_PREP;
      wasAdjusted = true;
    }
  }

  const finalOcc = privateOcc(minToTime(adjusted));
  const hardConflicts = hard.filter(iv => overlaps(finalOcc, iv));
  const softWarnings = soft.filter(iv => overlaps(finalOcc, iv));

  return {
    available: hardConflicts.length === 0,
    requestedBaseTime: baseTime,
    adjustedStartTime: minToTime(adjusted),
    wasAdjusted,
    hardConflicts, softWarnings,
  };
}

/* ---------- agrupamento por hora-bucket (grade semanal / diária) ---------- */
/* GRID_HOURS (definido em render-agenda.js) são as linhas visuais da grade,
   ex.: '06:00','07:00',...  Qualquer aula fixa ou evento cujo horário REAL
   comece dentro daquela hora entra no bucket correspondente — sem
   arredondar o horário exibido (Parte da rodada de correções, item 20). */
function getHourBucketItems(iso, hourLabel, excludeLessonId){
  const bucketHour = hourLabel.slice(0, 2);
  const wd = weekdayFromDate(iso);
  const items = [];

  for(const slot of (FIXED_SCHEDULE[wd] || [])){
    if(slot.slice(0, 2) === bucketHour){
      items.push({ kind: 'fixed', time: slot });
    }
  }
  for(const { lesson, contract } of allLessonsFlat()){
    if(lesson.date !== iso) continue;
    if(lesson.id === excludeLessonId) continue;
    if(!['pre_reservation', 'confirmed'].includes(lesson.status)) continue;
    const t = lesson.actual_start_time;
    if(!t || t.slice(0, 2) !== bucketHour) continue;
    items.push({
      kind: lesson.status, time: t, contractId: contract.id, lessonId: lesson.id,
      displayNumber: contract.display_number, clientName: contract.client_name,
    });
  }
  items.sort((a, b) => a.time.localeCompare(b.time));
  return items;
}

/* ---------- aba "Horários disponíveis": lista real de horários ofertáveis ---------- */
/* Não reaproveita a grade de ocupação — calcula, para uma data, quais
   horários-base resultam em disponibilidade real (Parte da rodada de
   correções, itens 22-24). Usa os mesmos horários-base da grade (GRID_HOURS)
   como candidatos e deduplica pelo horário REAL final (já ajustado). */
function computeAvailableSlots(date){
  const results = [];
  const seen = new Set();
  for(const baseTime of GRID_HOURS){
    const avail = calcAvailability(date, baseTime);
    if(!avail.available) continue;
    if(seen.has(avail.adjustedStartTime)) continue;
    seen.add(avail.adjustedStartTime);
    results.push({
      baseTime,
      realTime: avail.adjustedStartTime,
      wasAdjusted: avail.wasAdjusted,
      softWarnings: avail.softWarnings,
    });
  }
  results.sort((a, b) => a.realTime.localeCompare(b.realTime));
  return results;
}


/* Verifica se um horário fixo proposto (weekday+start_time) colide com
   reservas CONFIRMADAS futuras já existentes. Não altera nada — só relata
   (Parte 1, item 13 / Parte 3, item 22). */
function checkFixedSlotConflicts(weekday, startTime){
  const occ = fixedOcc(startTime);
  const conflicts = [];
  const today = todayISO();
  for(const { lesson, contract } of allLessonsFlat()){
    if(lesson.status !== 'confirmed' || !lesson.date || !lesson.actual_start_time) continue;
    if(lesson.date < today) continue; // só futuras
    if(weekdayFromDate(lesson.date) !== weekday) continue;
    const lessonOcc = privateOcc(lesson.actual_start_time);
    if(overlaps(occ, lessonOcc)){
      conflicts.push({
        message: `Conflita com a reserva confirmada ${fmtContractNumber(contract.display_number)} — ${contract.client_name} em ${fmtDateBR(lesson.date)}.`,
        contractId: contract.id, lessonId: lesson.id,
      });
    }
  }
  return conflicts;
}

/* ---------- notificações derivadas ---------- */
function buildNotifications(){
  const out = [];
  for(const { lesson, contract } of allLessonsFlat()){
    if(!lesson.date) continue;
    const remaining = daysUntil(lesson.date);
    const label = `${fmtContractNumber(contract.display_number)} — ${contract.client_name}`;

    if(lesson.payment.status === 'pending' && remaining <= 5 && lesson.status !== 'completed' && lesson.status !== 'cancelled'){
      out.push({
        type:'payment_deadline', contractId: contract.id, lessonId: lesson.id,
        message: `Pagamento da aula de ${label} está próximo do prazo (5 dias antes da realização).`,
      });
    }
    if(lesson.status === 'confirmed' && remaining < 0){
      out.push({
        type:'lesson_date_passed', contractId: contract.id, lessonId: lesson.id,
        message: `A data da aula ${label} já passou. Deseja atualizar o status?`,
      });
    }
  }
  return out;
}
