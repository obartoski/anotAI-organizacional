/* =======================================================================
   COMPONENTES DE FORMULÁRIO REUTILIZÁVEIS (anotAI)
   -----------------------------------------------------------------------
   Um único lugar para gerar/controlar: campo de senha com "olho", select
   customizado, switch, date picker e time picker. Usado tanto por
   login.html quanto por index.html — nenhuma tela reimplementa a própria
   versão desses componentes (Parte da rodada de correções, item 27).

   Depende apenas de ICON (js/icons.js). As funções de data/hora abaixo
   também usam pad2/fmtDateBR/weekdayFromDate quando disponíveis (helpers.js
   — carregado só no index.html; login.html não usa campos de data/hora,
   então essas funções nunca chegam a ser chamadas lá).
   ======================================================================= */

/* ---------- campo de senha com "olho" ---------- */
function passwordFieldHtml(id, extraAttrs){
  return `<div class="pw-field">
    <input class="input" type="password" id="${id}" ${extraAttrs || ''}>
    <button type="button" class="pw-toggle" data-action="toggle-password" data-target="${id}" aria-label="Mostrar senha">
      <span class="pw-icon-show">${ICON.eye}</span>
      <span class="pw-icon-hide">${ICON.eyeOff}</span>
    </button>
  </div>`;
}
function togglePasswordField(button){
  const input = document.getElementById(button.dataset.target);
  if(!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  button.classList.toggle('is-visible', !showing);
}

/* ---------- switch (booleano) ---------- */
function switchFieldHtml(id, checked, label){
  return `<label class="switch-row" for="${id}">
    <span class="switch-row-label">${label}</span>
    <span class="switch">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <span class="switch-track"><span class="switch-thumb"></span></span>
    </span>
  </label>`;
}

/* ---------- select customizado (mantém um <select> real por baixo) ---------- */
/* Basta usar <select class="input"> normalmente nos templates — depois do
   render, chame enhanceSelects(container) e todo select.input vira um
   dropdown com a cara do anotAI, sem mudar nada de como o valor é lido. */
function enhanceSelects(root){
  root.querySelectorAll('select.input').forEach(sel => {
    if(sel.closest('.csel')) return; // já dentro de um wrapper (segurança extra)
    const wrap = document.createElement('div');
    wrap.className = 'csel';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('csel-native');
    sel.tabIndex = -1;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'csel-trigger input';
    trigger.innerHTML = `<span class="csel-label"></span><span class="csel-arrow">${ICON.chevDown}</span>`;
    wrap.appendChild(trigger);

    const list = document.createElement('div');
    list.className = 'csel-list';
    wrap.appendChild(list);

    function buildList(){
      list.innerHTML = '';
      Array.from(sel.options).forEach(opt => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'csel-opt' + (opt.value === sel.value ? ' selected' : '');
        item.textContent = opt.textContent;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          syncLabel();
          wrap.classList.remove('open');
        });
        list.appendChild(item);
      });
    }
    function syncLabel(){
      const opt = sel.options[sel.selectedIndex];
      trigger.querySelector('.csel-label').textContent = opt ? opt.textContent : '';
    }
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !wrap.classList.contains('open');
      closeAllCustomSelects();
      if(willOpen){ buildList(); wrap.classList.add('open'); }
    });

    syncLabel();
  });
}
function closeAllCustomSelects(){
  document.querySelectorAll('.csel.open').forEach(w => w.classList.remove('open'));
}
document.addEventListener('click', (e) => {
  if(!e.target.closest('.csel')) closeAllCustomSelects();
});

/* =======================================================================
   DATE PICKER / TIME PICKER
   -----------------------------------------------------------------------
   O campo visível é um botão; o valor real fica num <input type="hidden">
   com o MESMO id que o campo teria antes (ex.: "lf-date", "ncf-time") — ou
   seja, todo o resto do app continua lendo document.getElementById(id).value
   exatamente como antes. Um único popup compartilhado (#picker-popup) é
   reaproveitado para todos os campos.
   ======================================================================= */

function dateFieldHtml(id, isoValue){
  const display = isoValue ? fmtDateBR(isoValue) : 'Selecionar data';
  return `<div class="dp-field">
    <button type="button" class="dp-trigger input" data-action="dp-toggle" data-target="${id}">
      <span class="dp-display">${display}</span>${ICON.calendar}
    </button>
    <input type="hidden" id="${id}" value="${isoValue || ''}">
  </div>`;
}
function timeFieldHtml(id, hhmm){
  const display = hhmm ? hhmm.slice(0,5) : 'Selecionar horário';
  return `<div class="tp-field">
    <button type="button" class="tp-trigger input" data-action="tp-toggle" data-target="${id}">
      <span class="tp-display">${display}</span>${ICON.chevDown}
    </button>
    <input type="hidden" id="${id}" value="${hhmm ? hhmm.slice(0,5) : ''}">
  </div>`;
}

const pickerState = { target: null, kind: null, viewYear: null, viewMonth: null, hour: null, minute: null };

function openDatePicker(targetId){
  const input = document.getElementById(targetId);
  const current = input && input.value ? input.value : todayISO();
  const d = new Date(current + 'T00:00:00');
  pickerState.target = targetId;
  pickerState.kind = 'date';
  pickerState.viewYear = d.getFullYear();
  pickerState.viewMonth = d.getMonth();
  renderPickerPopup();
  showOverlay();
  document.getElementById('picker-popup').classList.add('show');
}
function openTimePicker(targetId){
  const input = document.getElementById(targetId);
  const [h, m] = (input && input.value) ? input.value.split(':') : [null, null];
  pickerState.target = targetId;
  pickerState.kind = 'time';
  pickerState.hour = h || null;
  pickerState.minute = m || null;
  renderPickerPopup();
  showOverlay();
  document.getElementById('picker-popup').classList.add('show');
}
function closePicker(){
  document.getElementById('picker-popup').classList.remove('show');
  hideOverlay();
  pickerState.target = null;
  pickerState.kind = null;
}

function renderPickerPopup(){
  const el = document.getElementById('picker-popup');
  el.innerHTML = pickerState.kind === 'date' ? datePickerHtml() : timePickerHtml();
}

function datePickerHtml(){
  const year = pickerState.viewYear, month = pickerState.viewMonth;
  const input = document.getElementById(pickerState.target);
  const selectedISO = input ? input.value : '';
  const today = todayISO();

  const first = new Date(Date.UTC(year, month, 1, 12));
  const startDow = first.getUTCDay();
  const offset = startDow === 0 ? 6 : startDow - 1;
  const start = new Date(Date.UTC(year, month, 1 - offset, 12));

  let cells = '';
  for(let i = 0; i < 42; i++){
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
    const outside = d.getUTCMonth() !== month;
    const isToday = iso === today;
    const isSelected = iso === selectedISO;
    cells += `<button type="button" class="dp-day ${outside?'outside':''} ${isToday?'today':''} ${isSelected?'selected':''}" data-action="dp-pick-day" data-date="${iso}">${d.getUTCDate()}</button>`;
  }

  return `
  <div class="picker-head">
    <button type="button" class="picker-nav" data-action="dp-prev-month">${ICON.chevLeft}</button>
    <span class="picker-title">${MONTH_NAMES[month]} ${year}</span>
    <button type="button" class="picker-nav" data-action="dp-next-month">${ICON.chevRight}</button>
  </div>
  <div class="dp-dow-row">${WEEKDAY_ORDER.map(w => `<span>${WEEKDAY_SHORT[w]}</span>`).join('')}</div>
  <div class="dp-grid">${cells}</div>
  <button type="button" class="btn-secondary" data-action="close-picker" style="width:100%;margin-top:12px">Fechar</button>`;
}

const TIME_MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];
function timePickerHtml(){
  const hours = Array.from({ length: 24 }, (_, i) => pad2(i));
  return `
  <div class="picker-head"><span class="picker-title">Selecionar horário</span></div>
  <div class="tp-columns">
    <div class="tp-col">${hours.map(h => `<button type="button" class="tp-opt ${pickerState.hour===h?'selected':''}" data-action="tp-pick-hour" data-val="${h}">${h}</button>`).join('')}</div>
    <div class="tp-col">${TIME_MINUTES.map(m => `<button type="button" class="tp-opt ${pickerState.minute===m?'selected':''}" data-action="tp-pick-min" data-val="${m}">${m}</button>`).join('')}</div>
  </div>
  <button type="button" class="btn-primary" data-action="tp-confirm" style="width:100%;margin-top:14px">Confirmar</button>`;
}

function setFieldValue(id, value){
  const input = document.getElementById(id);
  if(!input) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  const trigger = document.querySelector(`[data-target="${id}"]`);
  if(trigger){
    const displayEl = trigger.querySelector('.dp-display, .tp-display');
    if(displayEl) displayEl.textContent = value.includes('-') ? fmtDateBR(value) : value;
  }
}

/* Delegação de eventos dos pickers — chamada a partir do handleAction geral do app. */
function handlePickerAction(action, el){
  switch(action){
    case 'dp-toggle': openDatePicker(el.dataset.target); return true;
    case 'tp-toggle': openTimePicker(el.dataset.target); return true;
    case 'close-picker': closePicker(); return true;
    case 'dp-prev-month':
      pickerState.viewMonth--; if(pickerState.viewMonth < 0){ pickerState.viewMonth = 11; pickerState.viewYear--; }
      renderPickerPopup(); return true;
    case 'dp-next-month':
      pickerState.viewMonth++; if(pickerState.viewMonth > 11){ pickerState.viewMonth = 0; pickerState.viewYear++; }
      renderPickerPopup(); return true;
    case 'dp-pick-day':
      setFieldValue(pickerState.target, el.dataset.date);
      closePicker(); return true;
    case 'tp-pick-hour': pickerState.hour = el.dataset.val; renderPickerPopup(); return true;
    case 'tp-pick-min': pickerState.minute = el.dataset.val; renderPickerPopup(); return true;
    case 'tp-confirm': {
      const h = pickerState.hour || '00', m = pickerState.minute || '00';
      setFieldValue(pickerState.target, `${h}:${m}`);
      closePicker(); return true;
    }
    default: return false;
  }
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="toggle-password"]');
  if(el) togglePasswordField(el);
});

/* ---------- máscara de telefone brasileiro ---------- */
function maskPhoneValue(raw){
  const d = (raw || '').replace(/\D/g, '').slice(0, 11);
  if(!d) return '';
  if(d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if(d.length <= 10){
    if(rest.length <= 4) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0,4)}-${rest.slice(4,8)}`;
  }
  return `(${ddd}) ${rest.slice(0,1)} ${rest.slice(1,5)}-${rest.slice(5,9)}`;
}
document.addEventListener('input', (e) => {
  if(e.target.matches && e.target.matches('.phone-mask')){
    const pos = e.target.value.length;
    e.target.value = maskPhoneValue(e.target.value);
    // mantém o cursor no fim — mais que suficiente para digitação normal de telefone
    e.target.setSelectionRange(e.target.value.length, e.target.value.length);
  }
});
