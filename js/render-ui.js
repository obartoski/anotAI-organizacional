/* ======================= BADGE DE STATUS ======================= */
function statusBadge(status){
  return `<span class="badge ${status}"><span class="dot"></span>${STATUS_LABEL[status]}</span>`;
}

/* ======================= ROTEADOR DE PÁGINAS ======================= */
function renderPage(){
  switch(state.page){
    case 'home': return renderHome();
    case 'agenda': return renderAgenda();
    case 'clientes': return renderClientes();
    case 'contract': return renderContract();
    case 'lesson': return renderLesson();
    case 'grade': return renderGrade();
    case 'settings': return renderSettings();
    default: return renderHome();
  }
}
const PAGE_TITLES = {
  home: ['Início','Sua fila de trabalho'],
  agenda: ['Agenda','Calendário e ocupação da sala'],
  clientes: ['Clientes','Contratações cadastradas'],
  contract: ['Contratação',''],
  lesson: ['Aula',''],
  grade: ['Grade da Bike','Aulas fixas recorrentes'],
  settings: ['Perfil','Sua conta no anotAI'],
};

/* ======================= NOTIFICAÇÕES (drawer) ======================= */
function renderNotifDrawerBody(){
  const notifs = buildNotifications();
  if(!notifs.length) return `<p class="text2" style="font-size:14.5px">Nenhuma pendência no momento.</p>`;
  return notifs.map(n => `
    <div class="notif-item">
      <div class="notif-kind">${n.type === 'payment_deadline' ? 'PAGAMENTO' : 'EVENTO'}</div>
      <div class="notif-msg">${escapeHtml(n.message)}</div>
      <button class="notif-link" data-action="open-contract-from-notif" data-id="${n.contractId}">Ver detalhes</button>
    </div>`).join('');
}
function bellBadgeCount(){ return buildNotifications().length; }

/* ======================= PAINEL RÁPIDO (evento no calendário) ======================= */
var quickPanelTarget = null;
function renderQuickPanel(){
  if(!quickPanelTarget) return '';
  const ref = getLessonRef(quickPanelTarget.contractId, quickPanelTarget.lessonId);
  if(!ref) return '';
  const { contract:c, lesson:l } = ref;
  const time = (l.actual_start_time || l.base_time || '').slice(0,5);
  return `
    <div class="qp-number">${fmtContractNumber(c.display_number)} — ${escapeHtml(c.client_name)}</div>
    <div class="qp-datetime">${fmtDateBR(l.date)} · ${time}</div>
    <div class="qp-badge">${statusBadge(l.status)}</div>
    <div class="qp-row"><span class="k">Professor</span><span class="v">${l.teacher_id ? escapeHtml(teacherName(l.teacher_id)) : '—'}</span></div>
    <div class="qp-row"><span class="k">Pagamento</span><span class="v">${PAYMENT_LABEL[l.payment.status]}</span></div>
    <button class="btn-primary qp-open" data-action="open-lesson-from-quickpanel" data-contract="${c.id}" data-lesson="${l.id}">Abrir contratação completa</button>
  `;
}

/* ======================= DISPONIBILIDADE (usado em Nova contratação e Adicionar aula) ======================= */
function availabilityPreviewHtml(date, time, excludeLessonId){
  if(!date || !time) return '';
  const result = calcAvailability(date, time, excludeLessonId);
  let cls = 'avail-ok', msg = 'Horário disponível.';
  if(result.hardConflicts.length){
    cls = 'avail-hard'; msg = result.hardConflicts.map(c => escapeHtml(c.message)).join('<br>');
  } else if(result.softWarnings.length){
    cls = 'avail-warn'; msg = result.softWarnings.map(c => escapeHtml(c.message)).join('<br>');
  }
  const adjustedNote = result.wasAdjusted
    ? `<div class="text2" style="margin-top:6px">Horário ajustado automaticamente: ${result.requestedBaseTime} → <strong style="color:var(--text)">${result.adjustedStartTime}</strong></div>`
    : '';
  return `<div class="avail-box"><span class="${cls}">${msg}</span>${adjustedNote}</div>`;
}

/* ======================= MODAL: ADICIONAR AULA ======================= */
function addLessonModalBody(){
  return `
    <div class="form-row2">
      <label class="field">Data<input class="input" type="date" id="alf-date"></label>
      <label class="field">Horário-base<input class="input" type="time" id="alf-time"></label>
    </div>
    <label class="field">Status
      <select class="input" id="alf-status">
        ${STATUS_ORDER.filter(s => s !== 'completed' && s !== 'cancelled').map(s => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join('')}
      </select>
    </label>
    <label class="field">Professor (opcional)
      <select class="input" id="alf-teacher">
        <option value="">—</option>
        ${TEACHERS.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
      </select>
    </label>
    <div id="alf-avail"></div>
  `;
}
