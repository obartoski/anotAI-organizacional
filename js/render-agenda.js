/* ======================= AGENDA ======================= */
const AGENDA_TABS = [
  { key:'todos', label:'Todos' },
  { key:'disponiveis', label:'Horários disponíveis' },
  { key:'interesses', label:'Interesses' },
  { key:'pendentes', label:'Pagamentos pendentes' },
  { key:'confirmados', label:'Confirmados' },
  { key:'finalizados', label:'Finalizados' },
];

function renderAgenda(){
  return `
  <div class="agenda-head">
    <div>
      <h1 class="section-title">Agenda</h1>
      <p class="section-sub">Consulte a ocupação da sala e acompanhe cada fase da negociação.</p>
    </div>
  </div>

  <div class="tabs">
    ${AGENDA_TABS.map(t => `<button class="tab-btn ${state.agendaTab===t.key?'active':''}" data-action="agenda-tab" data-tab="${t.key}">${t.label}</button>`).join('')}
  </div>

  <div class="agenda-body" id="agenda-body">
    ${renderAgendaBody()}
  </div>`;
}

function renderAgendaBody(){
  if(state.agendaTab === 'todos'){
    if(state.agendaView === 'detail'){
      return `<button class="btn-back" data-action="cal-back">${ICON.chevLeft}<span>Voltar ao calendário</span></button>${renderWeekOrDay(state.detailDate)}`;
    }
    return renderCalendarView();
  }
  if(state.agendaTab === 'disponiveis') return renderAvailabilityView();
  if(state.agendaTab === 'interesses') return renderListView(x => x.lesson.date && INTEREST_STAGE.includes(x.lesson.status), 'Nenhum interesse com data definida no momento.');
  if(state.agendaTab === 'pendentes') return renderListView(x => x.lesson.status === 'pre_reservation' && x.lesson.payment.status === 'pending', 'Nenhum pagamento pendente no momento.');
  if(state.agendaTab === 'confirmados') return renderListView(x => x.lesson.status === 'confirmed' && x.lesson.payment.status === 'paid', 'Nenhuma aula confirmada no momento.');
  if(state.agendaTab === 'finalizados') return renderFinalizadosView();
  return '';
}

function renderListView(filterFn, emptyMsg){
  const items = allLessonsFlat().filter(filterFn)
    .sort((a,b) => (a.lesson.date||'').localeCompare(b.lesson.date||''));
  return `<div class="list-view">
    ${items.length ? items.map(x => eventCardHtml(x.lesson, x.contract)).join('') : `<div class="empty-state">${emptyMsg}</div>`}
  </div>`;
}

function renderFinalizadosView(){
  const items = allLessonsFlat().filter(x => ['completed','cancelled'].includes(x.lesson.status))
    .sort((a,b) => (b.lesson.date||'').localeCompare(a.lesson.date||''));
  return `<div class="list-view">
    ${items.length ? items.map(x => eventCardHtml(x.lesson, x.contract)).join('') : `<div class="empty-state">Nenhum evento finalizado ainda.</div>`}
  </div>`;
}

/* ---------- calendário mensal ---------- */
function renderCalendarView(){
  const year = state.calYear, month = state.calMonth;
  const firstOfMonth = new Date(Date.UTC(year, month, 1, 12));
  const jsStartDow = firstOfMonth.getUTCDay(); // 0=Dom
  const gridStartOffset = jsStartDow === 0 ? 6 : jsStartDow - 1; // quantos dias antes (semana começa segunda)
  const startDate = new Date(Date.UTC(year, month, 1 - gridStartOffset, 12));

  const lessonsByDate = {};
  for(const { lesson, contract } of allLessonsFlat()){
    if(!lesson.date || !ACTIVE_STATUSES.includes(lesson.status)) continue;
    (lessonsByDate[lesson.date] = lessonsByDate[lesson.date] || []).push({ lesson, contract });
  }

  let cells = '';
  for(let i=0;i<42;i++){
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
    const outside = d.getUTCMonth() !== month;
    const isToday = iso === todayISO();
    const dayEvents = lessonsByDate[iso] || [];
    const visible = dayEvents.slice(0,3);
    const extra = dayEvents.length - visible.length;

    cells += `<div class="cal-cell ${outside?'outside':''} ${isToday?'today':''}" ${outside?'':`data-action="open-day" data-date="${iso}"`}>
      <div class="cal-daynum">${d.getUTCDate()}</div>
      ${visible.map(x => `<div class="cal-chip" style="border-color:${clientColor(x.contract.display_number)}">${fmtContractNumber(x.contract.display_number)} ${escapeHtml(x.contract.client_name.split(' ')[0])}</div>`).join('')}
      ${extra > 0 ? `<div class="cal-more">+${extra}</div>` : ''}
    </div>`;
  }

  return `
  <div class="cal-wrap">
    <div class="month-nav">
      <button data-action="cal-prev">${ICON.chevLeft}</button>
      <span class="month-label">${MONTH_NAMES[month]} ${year}</span>
      <button data-action="cal-next">${ICON.chevRight}</button>
    </div>
    <div class="cal-grid">
      ${WEEKDAY_ORDER.map(w => `<div class="cal-dow">${WEEKDAY_SHORT[w]}</div>`).join('')}
      ${cells}
    </div>
  </div>`;
}

/* ---------- "Horários disponíveis": seletor de data + grid semanal ---------- */
function renderAvailabilityView(){
  return `
  <div>
    <label class="field" style="max-width:220px">
      Selecione uma data
      <input type="date" class="input" value="${state.availWeekStart}" data-action="avail-date-change" />
    </label>
    ${renderWeekOrDay(state.availWeekStart)}
  </div>`;
}

/* ---------- decide grid semanal (desktop) ou lista diária (mobile) ---------- */
function isMobile(){ return window.matchMedia('(max-width:860px)').matches; }

function renderWeekOrDay(anchorDate){
  if(isMobile()) return renderDayList(anchorDate);
  return renderWeekGrid(mondayOf(anchorDate));
}

const GRID_HOURS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function renderWeekGrid(monday){
  const days = Array.from({length:7}, (_,i) => isoAddDays(monday, i));

  let rows = `<div class="week-row head" style="--cols:7">
    <div class="week-cell"></div>
    ${days.map(iso => {
      const wd = weekdayFromDate(iso);
      const d = new Date(iso+'T00:00:00');
      return `<div class="week-cell week-head-cell">${WEEKDAY_SHORT[wd]}<span class="num">${d.getDate()}</span></div>`;
    }).join('')}
  </div>`;

  for(const hour of GRID_HOURS){
    rows += `<div class="week-row" style="--cols:7"><div class="week-cell week-hour">${hour}</div>`;
    for(const iso of days){
      rows += `<div class="week-cell">${slotForHour(iso, hour)}</div>`;
    }
    rows += `</div>`;
  }

  return `
  <div class="week-toolbar">
    <div class="section-sub">Semana de ${fmtDateBR(monday)} a ${fmtDateBR(isoAddDays(monday,6))}</div>
    <div class="month-nav">
      <button data-action="shift-anchor" data-days="-7">${ICON.chevLeft}</button>
      <button data-action="shift-anchor" data-days="7">${ICON.chevRight}</button>
    </div>
  </div>
  <div class="week-grid scroll-thin">${rows}</div>`;
}

function renderDayList(iso){
  const wd = weekdayFromDate(iso);
  let rows = '';
  for(const hour of GRID_HOURS){
    const info = slotInfoForHour(iso, hour);
    if(info.kind === 'free'){
      rows += `<div class="day-row"><span class="hour">${hour}</span><span class="muted">Livre</span></div>`;
    } else if(info.kind === 'fixed'){
      rows += `<div class="day-row fixed"><span class="hour">${hour}</span><span>Bike (aula fixa)</span></div>`;
    } else {
      rows += `<div class="day-row ${info.status}" style="--client:${info.color}" data-action="open-quick-panel" data-contract="${info.contractId}" data-lesson="${info.lessonId}">
        <span class="hour">${info.displayTime}</span>
        <span>${fmtContractNumber(info.displayNumber)} ${escapeHtml(info.clientName)} — ${info.status==='confirmed'?'Confirmado':'Pré-reserva'}</span>
      </div>`;
    }
  }
  return `
  <div class="week-toolbar">
    <div class="section-sub">${WEEKDAY_LABEL[wd]}, ${fmtDateBR(iso)}</div>
    <div class="month-nav">
      <button data-action="shift-anchor" data-days="-1">${ICON.chevLeft}</button>
      <button data-action="shift-anchor" data-days="1">${ICON.chevRight}</button>
    </div>
  </div>
  <div class="day-list">${rows}</div>`;
}

function slotInfoForHour(iso, hour){
  const wd = weekdayFromDate(iso);
  const isFixed = (FIXED_SCHEDULE[wd]||[]).includes(hour);
  const evt = allLessonsFlat().find(x => x.lesson.date === iso && (x.lesson.base_time||'').slice(0,5) === hour && ['pre_reservation','confirmed'].includes(x.lesson.status));
  if(evt){
    return {
      kind:'event', status: evt.lesson.status, color: clientColor(evt.contract.display_number),
      contractId: evt.contract.id, lessonId: evt.lesson.id, displayNumber: evt.contract.display_number,
      clientName: evt.contract.client_name, displayTime: (evt.lesson.actual_start_time||hour).slice(0,5),
    };
  }
  if(isFixed) return { kind:'fixed' };
  return { kind:'free' };
}
function slotForHour(iso, hour){
  const info = slotInfoForHour(iso, hour);
  if(info.kind === 'free') return `<div class="slot free">Livre</div>`;
  if(info.kind === 'fixed') return `<div class="slot fixed">Bike</div>`;
  const cls = info.status === 'confirmed' ? 'confirmed' : 'pre';
  return `<div class="slot ${cls}" style="--client:${info.color}" data-action="open-quick-panel" data-contract="${info.contractId}" data-lesson="${info.lessonId}">
    ${info.displayTime} — ${fmtContractNumber(info.displayNumber)} ${escapeHtml(info.clientName.split(' ')[0])}<br>${info.status==='confirmed'?'Confirmado':'Pré-reserva'}
  </div>`;
}
