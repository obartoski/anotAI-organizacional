/* =======================================================================
   ESTADO DA UI + NAVEGAÇÃO
   ======================================================================= */
var state = {
  page: 'home',
  contractId: null,
  lessonId: null,
  agendaTab: 'todos',
  agendaView: 'month',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  detailDate: null,
  availWeekStart: mondayOf(todayISO()),
  editing: null,          // bloco em edição: client|detalhes|orcamento|financeiro|complementos|feedback
  editingNoteId: null,    // id da observação em edição (contrato ou aula)
  addingScheduleSlot: false,
};
var addLessonContractId = null;

function go(page){
  state.page = page;
  state.editing = null;
  state.editingNoteId = null;
  state.addingScheduleSlot = false;
  closeAllDrawers();
  render();
  window.scrollTo({ top: 0 });
}
function openContract(id){ state.contractId = id; state.lessonId = null; go('contract'); }
function openLesson(contractId, lessonId){ state.contractId = contractId; state.lessonId = lessonId; go('lesson'); }

/* =======================================================================
   RENDER PRINCIPAL / SHELL
   ======================================================================= */
function render(){
  const content = document.getElementById('content');
  content.innerHTML = renderPage();
  enhanceSelects(content);
  updateNavActiveStates();
  updatePageHeader();
  updateBellCount();
}
function activePageGroup(){
  if(state.page === 'contract' || state.page === 'lesson') return 'clientes';
  return state.page;
}
function updateNavActiveStates(){
  const group = activePageGroup();
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === group));
}
function updatePageHeader(){
  const [title, sub] = PAGE_TITLES[state.page] || ['',''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-sub').textContent = sub;
}
function updateBellCount(){
  const n = bellBadgeCount();
  const el = document.getElementById('bell-count');
  if(n > 0){ el.style.display = 'flex'; el.textContent = n > 9 ? '9+' : String(n); }
  else { el.style.display = 'none'; }
}

/* =======================================================================
   OVERLAY / DRAWERS / MODAIS / CONFIRMAÇÃO / TOAST
   ======================================================================= */
function showOverlay(){ document.getElementById('overlay').classList.add('show'); }
function hideOverlay(){ document.getElementById('overlay').classList.remove('show'); }
function openDrawer(id){ showOverlay(); document.getElementById(id).classList.add('show'); }
function closeAllDrawers(){
  hideOverlay();
  document.querySelectorAll('.drawer.show').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.modal-wrap.show').forEach(m => m.classList.remove('show'));
}
function openNotifDrawer(){
  document.getElementById('notif-drawer-body').innerHTML = renderNotifDrawerBody();
  openDrawer('notif-drawer');
  markVisibleInternalNotificationsSeen();
}
function openNewMessageModal(){
  document.getElementById('nmf-recipient-field').innerHTML = recipientSelectHtml('nmf-recipient');
  document.getElementById('nmf-title').value = '';
  document.getElementById('nmf-message').value = '';
  document.getElementById('nmf-due-date-field').innerHTML = dateFieldHtml('nmf-due-date', '');
  document.getElementById('nmf-due-time-field').innerHTML = timeFieldHtml('nmf-due-time', '');
  enhanceSelects(document.getElementById('modal-new-message'));
  showOverlay();
  document.getElementById('modal-new-message').classList.add('show');
}
function openQuickPanel(contractId, lessonId){
  quickPanelTarget = { contractId, lessonId };
  document.getElementById('quick-drawer-body').innerHTML = renderQuickPanel();
  openDrawer('quick-drawer');
}
/* Só o switch (ícone/título/subtítulo do "É aluno?" agora são markup estático
   no index.html — item 5 do refinamento visual do modal Nova contratação).
   Mesma estrutura .switch/.switch-track/.switch-thumb de switchFieldHtml(),
   sem alterar essa função (ainda usada, sem ícone, em outras telas). */
function memberSwitchOnlyHtml(checked){
  return `<span class="switch">
    <input type="checkbox" id="ncf-member" ${checked ? 'checked' : ''}>
    <span class="switch-track"><span class="switch-thumb"></span></span>
  </span>`;
}

function openNewContractModal(){
  document.getElementById('ncf-name').value = '';
  document.getElementById('ncf-phone').value = '';
  document.getElementById('ncf-member-field').innerHTML = memberSwitchOnlyHtml(false);
  document.getElementById('ncf-teacher-field').innerHTML = teacherPreferenceSelectHtml('ncf-teacher', null);
  document.getElementById('ncf-date-field').innerHTML = dateFieldHtml('ncf-date', '');
  document.getElementById('ncf-time-field').innerHTML = timeFieldHtml('ncf-time', '', ICON.clock);
  document.getElementById('ncf-avail').innerHTML = '';
  enhanceSelects(document.getElementById('modal-new-contract'));
  showOverlay();
  document.getElementById('modal-new-contract').classList.add('show');
}
function openAddLessonModal(contractId){
  addLessonContractId = contractId;
  document.getElementById('modal-add-lesson-body').innerHTML = addLessonModalBody();
  enhanceSelects(document.getElementById('modal-add-lesson-body'));
  showOverlay();
  document.getElementById('modal-add-lesson').classList.add('show');
}
function showToast(msg, action){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  const text = document.createElement('span');
  text.textContent = msg;
  el.appendChild(text);
  if(action){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      clearTimeout(timer);
      el.remove();
      action.onClick();
    });
    el.appendChild(btn);
  }
  wrap.appendChild(el);
  const timer = setTimeout(() => el.remove(), action ? 6000 : 3600);
}

var _confirmResolve = null;
function confirmDialog(message, okLabel, title){
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title || 'Confirmar ação';
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-ok-btn').textContent = okLabel || 'Confirmar';
    _confirmResolve = resolve;
    showOverlay();
    document.getElementById('modal-confirm').classList.add('show');
  });
}
function resolveConfirm(result){
  document.getElementById('modal-confirm').classList.remove('show');
  hideOverlay();
  if(_confirmResolve){ _confirmResolve(result); _confirmResolve = null; }
}

/* =======================================================================
   SALVAR (padrão: executa ação -> recarrega tudo do banco -> re-renderiza)
   ======================================================================= */
async function performSave(action, successMsg){
  try{
    await action();
    await reloadAll();
    state.editing = null;
    state.editingNoteId = null;
    state.addingScheduleSlot = false;
    render();
    showToast(successMsg);
  }catch(err){
    console.error(err);
    showToast('Não foi possível salvar as alterações. Tente novamente.');
  }
}

/* =======================================================================
   ÍCONES (injeção nos placeholders estáticos do shell)
   ======================================================================= */
function initIcons(){
  const map = {
    'bell-icon': ICON.bell,
    'mnav-home': ICON.home, 'mnav-agenda': ICON.calendar, 'mnav-plus': ICON.plus,
    'mnav-grade': ICON.grid, 'mnav-more': ICON.moreDots,
    'nav-icon-home': ICON.home, 'nav-icon-agenda': ICON.calendar,
    'nav-icon-clientes': ICON.users, 'nav-icon-grade': ICON.grid,
    'nav-icon-profile': ICON.user, 'nav-icon-settings': ICON.settings, 'nav-icon-signout': ICON.logout,
    'more-icon-clientes': ICON.users, 'more-icon-profile': ICON.user,
    'more-icon-settings': ICON.settings, 'more-icon-signout': ICON.logout,
    'sidebar-plus-icon': ICON.plus,
  };
  Object.entries(map).forEach(([id, svg]) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = svg;
  });
}

/* =======================================================================
   DELEGAÇÃO DE EVENTOS — CLIQUES
   ======================================================================= */
document.addEventListener('click', (e) => {
  if(e.target.id === 'overlay'){
    if(document.getElementById('modal-confirm').classList.contains('show')){ resolveConfirm(false); return; }
    closeAllDrawers();
    return;
  }
  const el = e.target.closest('[data-action]');
  if(el) handleAction(el.dataset.action, el);
});

async function handleAction(action, el){
  if(handlePickerAction(action, el)) return;
  switch(action){
    case 'nav-home': go('home'); break;
    case 'nav-agenda': go('agenda'); break;
    case 'nav-clientes': go('clientes'); break;
    case 'nav-grade': go('grade'); break;
    case 'nav-profile': go('profile'); break;
    case 'nav-settings': go('settings'); break;
    case 'nav-new-contract': openNewContractModal(); break;
    case 'open-new-contract': openNewContractModal(); break;
    case 'close-modal': closeAllDrawers(); break;
    case 'close-drawer': closeAllDrawers(); break;
    case 'open-more-menu': openDrawer('more-drawer'); break;

    case 'open-contract': openContract(el.dataset.id); break;
    case 'open-lesson': openLesson(el.dataset.contract, el.dataset.lesson); break;

    case 'agenda-tab':
      state.agendaTab = el.dataset.tab; state.agendaView = 'month'; render(); break;
    case 'cal-prev':
      state.calMonth--; if(state.calMonth < 0){ state.calMonth = 11; state.calYear--; } render(); break;
    case 'cal-next':
      state.calMonth++; if(state.calMonth > 11){ state.calMonth = 0; state.calYear++; } render(); break;
    case 'open-day':
      state.detailDate = el.dataset.date; state.agendaView = 'detail'; render(); break;
    case 'cal-back':
      state.agendaView = 'month'; render(); break;
    case 'shift-anchor': {
      const days = Number(el.dataset.days);
      if(state.agendaTab === 'disponiveis') state.availWeekStart = isoAddDays(state.availWeekStart, days);
      else state.detailDate = isoAddDays(state.detailDate || todayISO(), days);
      render(); break;
    }

    case 'open-quick-panel': openQuickPanel(el.dataset.contract, el.dataset.lesson); break;
    case 'open-lesson-from-quickpanel':
      closeAllDrawers(); openLesson(el.dataset.contract, el.dataset.lesson); break;

    case 'open-notifications': openNotifDrawer(); break;
    case 'open-contract-from-notif': closeAllDrawers(); openContract(el.dataset.id); break;
    case 'open-new-message-modal': openNewMessageModal(); break;

    case 'resolve-notification': {
      try{
        await dbResolveNotification(el.dataset.id);
        await reloadAll();
        document.getElementById('notif-drawer-body').innerHTML = renderNotifDrawerBody();
        updateBellCount();
        showToast('Marcada como resolvida.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível atualizar. Tente novamente.');
      }
      break;
    }
    case 'dismiss-notification': {
      try{
        await dbDismissNotification(el.dataset.id);
        await reloadAll();
        document.getElementById('notif-drawer-body').innerHTML = renderNotifDrawerBody();
        updateBellCount();
        showToast('Mensagem dispensada.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível atualizar. Tente novamente.');
      }
      break;
    }

    case 'edit-block': state.editing = el.dataset.block; render(); break;
    case 'cancel-edit': state.editing = null; render(); break;
    case 'edit-note': state.editingNoteId = el.dataset.id; render(); break;
    case 'cancel-note-edit': state.editingNoteId = null; render(); break;

    case 'delete-note': {
      const ok = await confirmDialog('Excluir esta observação? Essa ação não pode ser desfeita.', 'Excluir');
      if(!ok) break;
      const fn = el.dataset.kind === 'contract' ? () => dbDeleteContractNote(el.dataset.id) : () => dbDeleteLessonNote(el.dataset.id);
      await performSave(fn, 'Observação excluída.');
      break;
    }

    case 'change-teacher-check': break; // tratado no listener de "change" (select)
    case 'set-selected-teacher': {
      const teacherId = el.dataset.teacher || null;
      await performSave(() => dbSetSelectedTeacher(el.dataset.lesson, teacherId), teacherId ? 'Professor definido para a aula.' : 'Professor removido da aula.');
      break;
    }

    case 'cancel-lesson': {
      const ok = await confirmDialog('Tem certeza que deseja cancelar esta aula?', 'Cancelar aula');
      if(!ok) break;
      await performSave(() => dbUpdateLesson(el.dataset.lesson, { status: 'cancelled' }), 'Aula cancelada.');
      break;
    }

    case 'open-add-lesson-modal': openAddLessonModal(el.dataset.contract); break;

    case 'open-add-schedule': state.addingScheduleSlot = true; render(); break;
    case 'cancel-add-schedule': state.addingScheduleSlot = false; render(); break;
    case 'remove-schedule-slot': {
      const ok = await confirmDialog('Remover este horário fixo da grade?', 'Remover');
      if(!ok) break;
      await performSave(() => dbRemoveScheduleSlot(el.dataset.id), 'Horário removido da grade.');
      break;
    }

    case 'remove-feedback-image': {
      const ok = await confirmDialog('Remover a imagem atual do feedback?', 'Remover');
      if(!ok) break;
      await performSave(() => dbRemoveFeedbackImage(el.dataset.lesson), 'Imagem removida.');
      break;
    }

    case 'confirm-ok': resolveConfirm(true); break;
    case 'confirm-cancel': resolveConfirm(false); break;

    case 'sign-out': {
      try{ await sb.auth.signOut(); }catch(err){ console.error(err); }
      window.location.href = 'login.html';
      break;
    }

    case 'delete-contract': {
      const ok = await confirmDialog(
        'Esta contratação será movida para a lixeira. Você poderá desfazer isso logo em seguida.',
        'Mover para a lixeira'
      );
      if(!ok) break;
      const contractId = el.dataset.id;
      try{
        await dbSoftDeleteContract(contractId, currentUserId);
        await reloadAll();
        closeAllDrawers();
        go('clientes');
        showToast('Contratação movida para a lixeira.', {
          label: 'Desfazer',
          onClick: async () => {
            try{
              await dbRestoreContract(contractId);
              await reloadAll();
              render();
              showToast('Contratação restaurada.');
            }catch(err){
              console.error(err);
              showToast('Não foi possível restaurar. Tente novamente.');
            }
          },
        });
      }catch(err){
        console.error(err);
        showToast('Não foi possível excluir. Tente novamente.');
      }
      break;
    }

    case 'restore-contract': {
      try{
        await dbRestoreContract(el.dataset.id);
        await reloadAll();
        render();
        showToast('Contratação restaurada.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível restaurar. Tente novamente.');
      }
      break;
    }

    case 'confirm-permanent-delete': {
      const ok = await confirmDialog(
        'Esta ação apagará permanentemente a contratação e todas as informações associadas. Não será possível desfazer.',
        'Excluir definitivamente',
        'Excluir definitivamente?'
      );
      if(!ok) break;
      try{
        await dbDeleteContract(el.dataset.id);
        await reloadAll();
        render();
        showToast('Contratação excluída definitivamente.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível excluir. Tente novamente.');
      }
      break;
    }

    case 'retry-boot': boot(); break;

    default: break;
  }
}

/* Mudança de status de consulta de professor (select) salva imediatamente. */
document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-action="change-teacher-check"]');
  if(!el) return;
  await performSave(() => dbSetTeacherCheck(el.dataset.lesson, el.dataset.teacher, el.value), 'Situação do professor atualizada.');
});

/* Data selecionada na aba "Horários disponíveis" (campo com nosso date picker). */
document.addEventListener('change', (e) => {
  if(e.target.id === 'avail-date'){
    state.availWeekStart = e.target.value;
    render();
  }
});

/* Preview de disponibilidade ao digitar data/horário em formulários. */
const AVAIL_FIELD_SETS = [
  { dateId: 'ncf-date', timeId: 'ncf-time', boxId: 'ncf-avail', exclude: () => null },
  { dateId: 'alf-date', timeId: 'alf-time', boxId: 'alf-avail', exclude: () => null },
  { dateId: 'lf-date',  timeId: 'lf-time',  boxId: 'lf-avail',  exclude: () => state.lessonId },
];
document.addEventListener('input', (e) => {
  for(const set of AVAIL_FIELD_SETS){
    if(e.target.id === set.dateId || e.target.id === set.timeId){
      const dateEl = document.getElementById(set.dateId);
      const timeEl = document.getElementById(set.timeId);
      const boxEl = document.getElementById(set.boxId);
      if(dateEl && timeEl && boxEl){
        boxEl.innerHTML = availabilityPreviewHtml(dateEl.value, timeEl.value, set.exclude());
      }
    }
  }
});

/* =======================================================================
   FORMULÁRIOS (submit)
   ======================================================================= */
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-action]');
  if(!form) return;
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  if(submitBtn) submitBtn.disabled = true;
  try{
    await handleFormSubmit(form.dataset.action, form);
  } finally {
    if(submitBtn) submitBtn.disabled = false;
  }
});

async function handleFormSubmit(action, form){
  switch(action){
    case 'create-contract': {
      const name = document.getElementById('ncf-name').value.trim();
      const phone = document.getElementById('ncf-phone').value.replace(/\D/g, '');
      const isMember = document.getElementById('ncf-member').checked;
      const preferredTeacherId = document.getElementById('ncf-teacher').value || null;
      const date = document.getElementById('ncf-date').value;
      const time = document.getElementById('ncf-time').value;
      if(!name || !phone){ showToast('Nome e telefone são obrigatórios.'); return; }
      try{
        const contract = await dbCreateContract({
          client_name: name, phone, is_member: isMember, preferred_teacher_id: preferredTeacherId,
        });
        if(date && time){
          const avail = calcAvailability(date, time);
          await dbCreateLesson({ contract_id: contract.id, date, base_time: time, actual_start_time: avail.adjustedStartTime, status: 'interest' });
        }
        await reloadAll();
        closeAllDrawers();
        showToast(`Contratação ${fmtContractNumber(contract.display_number)} criada.`);
        openContract(contract.id);
      }catch(err){
        console.error(err);
        showToast('Não foi possível salvar. Tente novamente.');
      }
      break;
    }

    case 'create-lesson': {
      const date = document.getElementById('alf-date').value || null;
      const time = document.getElementById('alf-time').value || null;
      const status = document.getElementById('alf-status').value;
      const teacherId = document.getElementById('alf-teacher').value || null;
      const actualStart = (date && time) ? calcAvailability(date, time).adjustedStartTime : time;
      try{
        await dbCreateLesson({ contract_id: addLessonContractId, date, base_time: time, actual_start_time: actualStart, status, selected_teacher_id: teacherId });
        const contractId = addLessonContractId;
        await reloadAll();
        closeAllDrawers();
        showToast('Aula adicionada.');
        const c = getContractById(contractId);
        const newest = c.lessons[c.lessons.length - 1];
        openLesson(contractId, newest.id);
      }catch(err){
        console.error(err);
        showToast('Não foi possível salvar. Tente novamente.');
      }
      break;
    }

    case 'add-note': {
      const input = form.querySelector('input[name="text"]');
      const text = input.value.trim();
      if(!text) return;
      const kind = form.dataset.kind, id = form.dataset.id;
      const fn = kind === 'contract' ? () => dbAddContractNote(id, text) : () => dbAddLessonNote(id, text);
      await performSave(fn, 'Observação adicionada.');
      break;
    }
    case 'save-note-edit': {
      const input = document.getElementById('note-edit-input');
      const text = input.value.trim();
      if(!text) return;
      const kind = form.dataset.kind, id = form.dataset.id;
      const fn = kind === 'contract' ? () => dbUpdateContractNote(id, text) : () => dbUpdateLessonNote(id, text);
      await performSave(fn, 'Observação atualizada.');
      break;
    }

    case 'save-client': {
      const patch = {
        client_name: document.getElementById('cf-name').value.trim(),
        phone: document.getElementById('cf-phone').value.replace(/\D/g, ''),
        email: document.getElementById('cf-email').value.trim() || null,
        contact_channel: document.getElementById('cf-channel').value || null,
        is_member: document.getElementById('cf-member').checked,
        preferred_teacher_id: document.getElementById('cf-teacher').value || null,
      };
      if(!patch.client_name || !patch.phone){ showToast('Nome e telefone são obrigatórios.'); return; }
      await performSave(() => dbUpdateContract(form.dataset.contract, patch), 'Alterações salvas.');
      break;
    }

    case 'save-detalhes': {
      const date = document.getElementById('lf-date').value || null;
      const baseTime = document.getElementById('lf-time').value || null;
      const status = document.getElementById('lf-status').value;
      let actual_start_time = baseTime;
      if(date && baseTime) actual_start_time = calcAvailability(date, baseTime, form.dataset.lesson).adjustedStartTime;
      await performSave(() => dbUpdateLesson(form.dataset.lesson, { date, base_time: baseTime, actual_start_time, status }), 'Alterações salvas.');
      break;
    }

    case 'save-orcamento': {
      const amountRaw = document.getElementById('qf-amount').value;
      const patch = {
        quote_amount: amountRaw === '' ? null : Number(amountRaw),
        quote_sent_at: document.getElementById('qf-sent').value || null,
        quote_status: document.getElementById('qf-status').value,
      };
      await performSave(() => dbUpdateLesson(form.dataset.lesson, patch), 'Orçamento atualizado.');
      break;
    }

    case 'save-financeiro': {
      const amountRaw = document.getElementById('ff-amount').value;
      const patch = {
        amount_paid: amountRaw === '' ? null : Number(amountRaw),
        payment_method: document.getElementById('ff-method').value || null,
        expected_payment_date: document.getElementById('ff-expected').value || null,
        actual_payment_date: document.getElementById('ff-actual').value || null,
        payment_status: document.getElementById('ff-status').value,
      };
      await performSave(() => dbUpdateLesson(form.dataset.lesson, patch), 'Pagamento atualizado.');
      break;
    }

    case 'save-complementos': {
      const patch = {
        rooftop: document.getElementById('cxf-rooftop').checked,
        frans_cafe: document.getElementById('cxf-frans').checked,
        complement_notes: document.getElementById('cxf-notes').value.trim() || null,
        special_requirements: document.getElementById('cxf-special').value.trim() || null,
      };
      await performSave(() => dbUpdateLesson(form.dataset.lesson, patch), 'Alterações salvas.');
      break;
    }

    case 'save-feedback': {
      const file = document.getElementById('fb-file').files[0] || null;
      const description = document.getElementById('fb-description').value.trim();
      await performSave(() => dbSaveFeedback(form.dataset.lesson, file, description), 'Feedback salvo.');
      break;
    }

    case 'save-schedule-slot': {
      const weekday = document.getElementById('sf-weekday').value;
      const time = document.getElementById('sf-time').value;
      if(!time){ showToast('Informe um horário.'); return; }
      const conflicts = checkFixedSlotConflicts(weekday, time);
      if(conflicts.length){
        const ok = await confirmDialog(
          `${conflicts.length} conflito(s) com reserva(s) confirmada(s):\n${conflicts.map(c => c.message).join('\n')}\n\nAdicionar este horário fixo mesmo assim?`,
          'Adicionar mesmo assim'
        );
        if(!ok) return;
      }
      await performSave(() => dbAddScheduleSlot(weekday, time), 'Horário adicionado à grade.');
      break;
    }

    case 'create-internal-notification': {
      const recipientId = document.getElementById('nmf-recipient').value;
      const title = document.getElementById('nmf-title').value.trim();
      const message = document.getElementById('nmf-message').value.trim();
      const dueDate = document.getElementById('nmf-due-date').value;
      const dueTime = document.getElementById('nmf-due-time').value;
      if(!recipientId){ showToast('Selecione um destinatário.'); return; }
      if(!title){ showToast('Informe um título.'); return; }
      if(!message){ showToast('Escreva a mensagem.'); return; }
      const dueAt = (dueDate && dueTime) ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null;
      try{
        await dbCreateInternalNotification({ title, message, recipient_user_id: recipientId, due_at: dueAt });
        await reloadAll();
        closeAllDrawers();
        showToast('Mensagem enviada.');
        openNotifDrawer();
      }catch(err){
        console.error(err);
        showToast('Não foi possível enviar. Tente novamente.');
      }
      break;
    }

    case 'change-password': {
      const p1 = document.getElementById('pw-new').value;
      const p2 = document.getElementById('pw-confirm').value;
      if(p1.length < 8){ showToast('A senha precisa ter pelo menos 8 caracteres.'); return; }
      if(p1 !== p2){ showToast('As senhas não coincidem.'); return; }
      try{
        const { error } = await sb.auth.updateUser({ password: p1 });
        if(error) throw error;
        form.reset();
        showToast('Senha alterada com sucesso.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível alterar a senha. Tente novamente.');
      }
      break;
    }

    case 'save-display-name': {
      const name = document.getElementById('pf-display-name').value.trim();
      if(!name){ showToast('Informe um nome de exibição.'); return; }
      try{
        await dbUpsertUserProfile(currentUserId, name);
        currentUserDisplayName = name;
        render(); // atualiza a Hero imediatamente, sem recarregar a página
        showToast('Nome atualizado com sucesso.');
      }catch(err){
        console.error(err);
        showToast('Não foi possível atualizar o nome. Tente novamente.');
      }
      break;
    }

    default: break;
  }
}

/* =======================================================================
   BOOT
   ======================================================================= */
function bootLoadingHtml(){
  return `<div style="max-width:640px;display:flex;flex-direction:column;gap:10px">
    <div style="height:90px;border-radius:16px;background:var(--surface)" class="boot-skel"></div>
    <div style="height:64px;border-radius:12px;background:var(--surface)" class="boot-skel"></div>
    <div style="height:64px;border-radius:12px;background:var(--surface)" class="boot-skel"></div>
  </div>`;
}
function bootErrorHtml(message){
  return `<div class="empty-state" style="max-width:520px;text-align:left">
    <strong style="color:var(--text);display:block;margin-bottom:8px;font-size:15px">Não foi possível carregar o anotAI</strong>
    ${escapeHtml(message)}
    <div style="margin-top:16px"><button class="btn-secondary" data-action="retry-boot">Tentar novamente</button></div>
  </div>`;
}

/* Revela a interface (some com a boot-gate). Só é chamada depois que a
   sessão foi confirmada (ou quando há um erro que precisa ser mostrado) —
   nunca antes, para não piscar o app para quem não está autenticado. */
function revealApp(){
  document.body.classList.remove('booting');
  document.getElementById('boot-gate').classList.add('hidden');
}

async function boot(){
  document.getElementById('content').innerHTML = bootLoadingHtml();

  const ok = initSupabase();
  if(!ok){
    revealApp();
    document.getElementById('content').innerHTML = bootErrorHtml(APP_LOAD_ERROR);
    return;
  }

  // Proteção de acesso (Parte da autenticação): sem sessão válida, ninguém
  // vê o conteúdo do app — redireciona antes mesmo de revelar a interface.
  let session;
  try{
    const { data, error } = await sb.auth.getSession();
    if(error) throw error;
    session = data.session;
  }catch(err){
    console.error(err);
    revealApp();
    document.getElementById('content').innerHTML = bootErrorHtml('Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.');
    return;
  }

  if(!session){
    window.location.replace('login.html');
    return; // a boot-gate continua cobrindo a tela durante o redirecionamento
  }
  currentUserEmail = (session.user && session.user.email) || null;
  currentUserId = (session.user && session.user.id) || null;

  try{
    await loadUserDisplayName();
    await reloadAll();
    initIcons();
    render();
    revealApp();
  }catch(err){
    console.error(err);
    revealApp();
    document.getElementById('content').innerHTML = bootErrorHtml(
      'Não foi possível carregar os dados do Supabase. Verifique sua conexão e a configuração em js/config.js, depois tente novamente.'
    );
  }
}

/* Carrega o nome de exibição de user_profiles; se não existir linha ou o
   nome estiver vazio, usa o fallback pelo e-mail (Parte da rodada de
   correções, item 5). Nunca guarda o nome só em memória/localStorage —
   o Supabase é sempre a fonte de verdade (item 29); isto aqui é só cache
   de leitura para a Home não esperar uma segunda consulta.*/
async function loadUserDisplayName(){
  try{
    const profile = await dbGetUserProfile(currentUserId);
    currentUserDisplayName = (profile && profile.display_name) || fallbackDisplayNameFromEmail(currentUserEmail);
    currentUserRole = (profile && profile.role) || 'member';
  }catch(err){
    console.error(err);
    currentUserDisplayName = fallbackDisplayNameFromEmail(currentUserEmail);
    currentUserRole = 'member';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  boot();
});
