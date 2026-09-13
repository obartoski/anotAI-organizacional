/* ======================= CLIENTES (lista) ======================= */
function renderClientes(){
  const sorted = [...CONTRACTS].sort((a,b) => b.display_number - a.display_number);
  return `
  <div style="max-width:660px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <h1 class="section-title">Clientes</h1>
      <button class="btn-primary" data-action="open-new-contract" style="min-height:auto;padding:11px 18px">${ICON.plus}Nova contratação</button>
    </div>
    <div class="home-list" style="margin-top:20px">
      ${sorted.length ? sorted.map(c => {
        const color = clientColor(c.display_number);
        return `<div class="card event-card" data-action="open-contract" data-id="${c.id}">
          <span class="stripe" style="background:${color}"></span>
          <div class="main">
            <div><span class="ec-number">${fmtContractNumber(c.display_number)}</span><span class="ec-name">${escapeHtml(c.client_name)}</span></div>
            <div class="ec-meta-row"><span class="ec-secondary">${fmtPhone(c.phone)} · ${c.lessons.length} aula${c.lessons.length===1?'':'s'}</span></div>
          </div>
          <span class="go">Abrir →</span>
        </div>`;
      }).join('') : `<div class="empty-state">Nenhuma contratação cadastrada ainda. Use "Nova contratação" para começar.</div>`}
    </div>
  </div>`;
}

/* ======================= CONTRATAÇÃO (detalhe) ======================= */
function renderContract(){
  const c = getContractById(state.contractId);
  if(!c) return `<div class="empty-state">Contratação não encontrada.</div>`;

  const canDelete = c.lessons.every(l => l.status === 'cancelled' || l.status === 'completed');

  return `
  <button class="btn-back" data-action="nav-clientes">${ICON.chevLeft}<span>Clientes</span></button>
  <div class="page-header">
    <h1 class="section-title">${fmtContractNumber(c.display_number)} — ${escapeHtml(c.client_name)}</h1>
  </div>

  <div class="blocks">
    <div class="block">
      <div class="block-head">
        <span class="block-title">Cliente</span>
        ${state.editing === 'client' ? '' : `<button class="block-edit" data-action="edit-block" data-block="client">${ICON.pencil}Editar</button>`}
      </div>
      ${state.editing === 'client' ? clientEditFormHtml(c) : `
      <dl class="dl-grid">
        <div><dt>Nome</dt><dd>${escapeHtml(c.client_name)}</dd></div>
        <div><dt>Telefone</dt><dd>${fmtPhone(c.phone)}</dd></div>
        <div><dt>E-mail</dt><dd>${c.email ? escapeHtml(c.email) : '—'}</dd></div>
        <div><dt>Canal de contato</dt><dd>${c.channel ? CHANNEL_LABEL[c.channel] : '—'}</dd></div>
        <div><dt>É aluno da academia?</dt><dd>${c.is_member ? 'Sim' : 'Não'}</dd></div>
      </dl>`}
    </div>

    <div class="block">
      <div class="block-head"><span class="block-title">Aulas</span></div>
      ${c.lessons.length ? c.lessons.map(l => `
        <div class="lesson-card" data-action="open-lesson" data-contract="${c.id}" data-lesson="${l.id}">
          <div>
            <span class="lname">Aula ${pad2(l.number)}</span>
            <span class="ldate">${l.date ? `${fmtDateBR(l.date)} · ${(l.actual_start_time||l.base_time||'').slice(0,5)}` : 'Sem data definida'}</span>
          </div>
          <div class="lright">
            <span class="ec-secondary">${PAYMENT_LABEL[l.payment.status]}</span>
            ${statusBadge(l.status)}
          </div>
        </div>`).join('') : `<div class="empty-state" style="margin-top:14px">Nenhuma aula cadastrada ainda.</div>`}
      <button class="add-lesson" data-action="open-add-lesson-modal" data-contract="${c.id}">+ Adicionar aula</button>
    </div>

    <div class="block">
      <div class="block-head"><span class="block-title">Histórico da contratação</span></div>
      ${renderTimeline(c.notes, 'contract')}
      ${addNoteForm('contract', c.id)}
    </div>

    ${canDelete ? `
    <button class="btn-secondary btn-danger" data-action="delete-contract" data-id="${c.id}" style="width:100%;justify-content:center">
      ${ICON.trash}Excluir contratação
    </button>` : ''}
  </div>`;
}

function clientEditFormHtml(c){
  return `<form data-action="save-client" data-contract="${c.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
    <label class="field">Nome<input class="input" id="cf-name" value="${escapeHtml(c.client_name)}" required></label>
    <label class="field">Telefone<input class="input phone-mask" id="cf-phone" value="${escapeHtml(fmtPhone(c.phone) === '—' ? '' : fmtPhone(c.phone))}" required></label>
    <label class="field">E-mail<input class="input" id="cf-email" type="email" value="${escapeHtml(c.email||'')}"></label>
    <label class="field">Canal de contato
      <select class="input" id="cf-channel">
        <option value="" ${!c.channel?'selected':''}>—</option>
        <option value="whatsapp" ${c.channel==='whatsapp'?'selected':''}>WhatsApp</option>
        <option value="talkmi" ${c.channel==='talkmi'?'selected':''}>TalkMi</option>
        <option value="email" ${c.channel==='email'?'selected':''}>E-mail</option>
      </select>
    </label>
    ${switchFieldHtml('cf-member', c.is_member, 'É aluno da academia?')}
    <div style="display:flex;gap:10px;margin-top:2px">
      <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
      <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
    </div>
  </form>`;
}

/* ======================= HISTÓRICO (compartilhado entre Contratação e Aula) ======================= */
function renderTimeline(notes, kind){
  if(!notes.length) return `<div class="empty-state" style="margin-top:14px">Nenhuma observação registrada ainda.</div>`;
  const sorted = [...notes].sort((a,b) => b.created_at.localeCompare(a.created_at));
  return `<div class="timeline">
    ${sorted.map(n => {
      if(state.editingNoteId === n.id){
        return `<div class="tl-item">
          <div class="tl-time">${fmtNoteTimestamp(n.created_at)}</div>
          <form data-action="save-note-edit" data-kind="${kind}" data-id="${n.id}" style="display:flex;gap:8px;margin-top:6px">
            <input class="input" id="note-edit-input" value="${escapeHtml(n.text)}" required style="flex:1">
            <button type="submit" class="btn-secondary" style="min-height:auto;padding:10px 14px">Salvar</button>
            <button type="button" class="btn-link" data-action="cancel-note-edit">Cancelar</button>
          </form>
        </div>`;
      }
      return `<div class="tl-item">
        <div class="tl-time">${fmtNoteTimestamp(n.created_at)}</div>
        <div class="tl-text">
          <span>${escapeHtml(n.text)}</span>
          <span class="tl-actions">
            <button class="tl-icon-btn" data-action="edit-note" data-kind="${kind}" data-id="${n.id}" title="Editar">${ICON.pencil}</button>
            <button class="tl-icon-btn" data-action="delete-note" data-kind="${kind}" data-id="${n.id}" title="Excluir">${ICON.trash}</button>
          </span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
function addNoteForm(kind, id){
  return `<form class="add-note" data-action="add-note" data-kind="${kind}" data-id="${id}">
    <input class="input" name="text" placeholder="Adicionar observação..." required />
    <button type="submit" class="btn-secondary">Adicionar</button>
  </form>`;
}
