/* ======================= MARCA / SAUDAÇÃO ======================= */

function getGreeting(){
  const h = new Date().getHours();
  if(h >= 5 && h < 12) return 'Bom dia';
  if(h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite'; // 18:00–23:59 e 00:00–04:59
}

/* Tenta carregar assets/logo.png; se não existir, cai no texto "anotAI". */
function brandLogoHtml(imgClass, fallbackClass){
  return `<img src="assets/anotai.logo.png" alt="anotAI" class="${imgClass}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block';" />
    <span class="${fallbackClass}" style="display:none">anotAI</span>`;
}

/* ======================= EVENT CARD (Home / Agenda) ======================= */
function eventCardHtml(lesson, contract){
  const color = clientColor(contract.display_number);
  const time = (lesson.actual_start_time || lesson.base_time || '').slice(0,5);
  return `
  <div class="card event-card" data-action="open-contract" data-id="${contract.id}">
    <span class="stripe" style="background:${color}"></span>
    <div class="main">
      <div><span class="ec-number">${fmtContractNumber(contract.display_number)}</span><span class="ec-name">${escapeHtml(contract.client_name)}</span></div>
      ${lesson.date ? `<div class="ec-datetime">${fmtDateShort(lesson.date)} · ${time}</div>` : ''}
      <div class="ec-meta-row">
        ${statusBadge(lesson.status)}
        <span class="ec-secondary">${lesson.teacher_id ? teacherName(lesson.teacher_id) + ' · ' : ''}Pagamento ${PAYMENT_LABEL[lesson.payment.status].toLowerCase()}</span>
      </div>
    </div>
    <span class="go">Abrir →</span>
  </div>`;
}
function teacherName(id){
  if(!id) return '—';
  const t = TEACHERS.find(x => x.id === id) || ALL_TEACHERS.find(x => x.id === id);
  return t ? t.name : 'Professor removido';
}

/* ======================= HOME ======================= */
function renderHome(){
  const withDate = allLessonsFlat()
    .filter(x => x.lesson.date && ACTIVE_STATUSES.includes(x.lesson.status))
    .sort((a,b) => (a.lesson.date + (a.lesson.actual_start_time||'')).localeCompare(b.lesson.date + (b.lesson.actual_start_time||'')));
  const withoutDate = allLessonsFlat()
    .filter(x => !x.lesson.date && ACTIVE_STATUSES.includes(x.lesson.status));

  return `
  <div class="hero">
    <div class="hero-mark">${brandLogoHtml('hero-logo-img','hero-logo-fallback')}</div>
    <h1 class="greeting">${getGreeting()}, ${escapeHtml(currentUserDisplayName || 'Você')}.</h1>
    <p class="greeting-sub">Como está a sua organização hoje?</p>
  </div>

  <div class="home-wrap">
    <h2 class="section-title" style="font-size:20px">Próximos eventos</h2>
    <p class="section-sub">Ordenados pela data mais próxima.</p>
    <div class="home-list">
      ${withDate.length ? withDate.map(x => eventCardHtml(x.lesson, x.contract)).join('') : `<div class="empty-state">Nenhum evento com data agendada no momento.</div>`}
    </div>

    <div class="home-section-label">Sem data definida</div>
    <div class="home-list sem-data">
      ${withoutDate.length ? withoutDate.map(x => eventCardHtml(x.lesson, x.contract)).join('') : `<div class="empty-state">Nenhuma contratação sem data no momento.</div>`}
    </div>
  </div>`;
}
