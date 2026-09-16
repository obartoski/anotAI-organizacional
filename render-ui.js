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
    case 'profile': return renderProfile();
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
  profile: ['Perfil','Sua conta no anotAI'],
  settings: ['Configurações',''],
};

/* ======================= NOTIFICAÇÕES (drawer) ======================= */
/* A partir desta rodada, o drawer virou uma Central de Notificações: combina
   os avisos automáticos de sempre (buildNotifications(), em helpers.js —
   inalterado) com mensagens internas persistidas em `notifications`
   (source='internal'). As duas origens convivem, mas nunca se confundem. */

function resolveUserName(userId){
  if(!userId) return 'Usuário';
  const p = USER_PROFILES.find(x => x.id === userId);
  return (p && p.display_name) || 'Usuário';
}

/* Mensagens internas visíveis na lista principal:
   - recebidas: só enquanto ativas (não resolvidas/dispensadas);
   - enviadas (e o usuário não é o destinatário): sempre visíveis, marcadas "Enviada".
   Evita duplicar quando o usuário é remetente E destinatário da mesma mensagem. */
function getVisibleInternalNotifications(){
  return INTERNAL_NOTIFICATIONS.filter(n => {
    const isReceived = n.recipient_user_id === currentUserId;
    const isSent = n.sender_user_id === currentUserId;
    if(!isReceived && !isSent) return false;
    if(isReceived) return !n.resolved_at && !n.dismissed_at;
    return true;
  });
}

function internalNotificationHtml(n){
  const isReceived = n.recipient_user_id === currentUserId;
  const senderName = resolveUserName(n.sender_user_id);
  const recipientName = resolveUserName(n.recipient_user_id);
  return `
    <div class="notif-item notif-internal">
      <div class="notif-kind">MENSAGEM${!isReceived ? ' · ENVIADA' : ''}</div>
      <div class="notif-internal-parties">${escapeHtml(senderName.toUpperCase())} → ${escapeHtml(recipientName.toUpperCase())}</div>
      <div class="notif-internal-title">${escapeHtml(n.title || '')}</div>
      <div class="notif-msg">${escapeHtml(n.message || '')}</div>
      ${n.due_at ? `<div class="notif-internal-due">Prazo: ${fmtDueAt(n.due_at)}</div>` : ''}
      <div class="notif-internal-sent-at">Enviada ${fmtNoteTimestamp(n.created_at)}</div>
      ${isReceived ? `
        <div class="notif-internal-actions">
          <button class="btn-link" data-action="resolve-notification" data-id="${n.id}">Resolver</button>
          <button class="btn-link" data-action="dismiss-notification" data-id="${n.id}">Dispensar</button>
        </div>` : ''}
    </div>`;
}

function renderNotifDrawerBody(){
  const systemNotifs = buildNotifications();
  const internal = getVisibleInternalNotifications();
  const nothing = !systemNotifs.length && !internal.length;

  return `
    <button class="btn-primary" data-action="open-new-message-modal" style="width:100%;min-height:auto;padding:12px;margin-bottom:18px">${ICON.plus}Nova mensagem</button>
    ${nothing ? `<p class="text2" style="font-size:14.5px">Nenhuma pendência no momento.</p>` : ''}
    ${internal.map(internalNotificationHtml).join('')}
    ${systemNotifs.map(n => `
      <div class="notif-item">
        <div class="notif-kind">${n.type === 'payment_deadline' ? 'PAGAMENTO' : 'EVENTO'}</div>
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <button class="notif-link" data-action="open-contract-from-notif" data-id="${n.contractId}">Ver detalhes</button>
      </div>`).join('')}
  `;
}

function bellBadgeCount(){
  const systemCount = buildNotifications().length;
  const internalCount = INTERNAL_NOTIFICATIONS.filter(n =>
    n.recipient_user_id === currentUserId && !n.resolved_at && !n.dismissed_at
  ).length;
  return systemCount + internalCount;
}

/* Marca como "vistas" (seen) as mensagens recebidas e ativas que acabaram de
   aparecer na Central — item opcional da rodada. Não bloqueia a interface:
   dispara em segundo plano e atualiza o estado local para não repetir a
   chamada a cada abertura do drawer antes do próximo reloadAll(). */
function markVisibleInternalNotificationsSeen(){
  INTERNAL_NOTIFICATIONS
    .filter(n => n.recipient_user_id === currentUserId && !n.seen && !n.resolved_at && !n.dismissed_at)
    .forEach(n => {
      n.seen = true;
      dbMarkNotificationSeen(n.id).catch(err => console.error(err));
    });
}

/* ---------- select "Para" do modal Nova mensagem ---------- */
function recipientSelectHtml(id){
  const options = USER_PROFILES
    .filter(p => p.id !== currentUserId) // preferencialmente não mostrar o próprio usuário
    .map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`)
    .join('');
  return `<select class="input" id="${id}">
    <option value="" selected>Selecione um destinatário</option>
    ${options}
  </select>`;
}

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
/* ---------- select "Preferência de professor" (reutilizado no modal e na edição) ---------- */
function teacherPreferenceSelectHtml(id, selectedId){
  // Garante que, se a contratação já tinha preferência por um professor que
  // foi desativado depois, a opção continua aparecendo (não quebra a tela) —
  // só não aparece para NOVAS escolhas.
  const extra = (selectedId && !TEACHERS.some(t => t.id === selectedId))
    ? ALL_TEACHERS.find(t => t.id === selectedId)
    : null;
  return `<select class="input" id="${id}">
    <option value="" ${!selectedId ? 'selected' : ''}>Sem preferência</option>
    ${TEACHERS.map(t => `<option value="${t.id}" ${t.id===selectedId?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}
    ${extra ? `<option value="${extra.id}" selected>${escapeHtml(extra.name)} (inativo)</option>` : ''}
  </select>`;
}

function addLessonModalBody(){
  return `
    <div class="form-row2">
      <label class="field">Data${dateFieldHtml('alf-date', '')}</label>
      <label class="field">Horário-base${timeFieldHtml('alf-time', '')}</label>
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
