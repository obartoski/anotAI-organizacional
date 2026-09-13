/* ======================= AULA (detalhe individual) ======================= */
function renderLesson(){
  const ref = getLessonRef(state.contractId, state.lessonId);
  if(!ref) return `<div class="empty-state">Aula não encontrada.</div>`;
  const { contract:c, lesson:l } = ref;

  const canCancel = l.status !== 'cancelled' && l.status !== 'completed';

  return `
  <button class="btn-back" data-action="open-contract" data-id="${c.id}">${ICON.chevLeft}<span>${fmtContractNumber(c.display_number)} — ${escapeHtml(c.client_name)}</span></button>
  <div class="page-header">
    <h1 class="section-title" style="font-size:22px">Aula ${pad2(l.number)}</h1>
    ${canCancel ? `<button class="btn-secondary btn-danger" data-action="cancel-lesson" data-lesson="${l.id}">Cancelar aula</button>` : ''}
  </div>

  <div class="blocks">
    ${detalhesBlockHtml(c, l)}
    ${professorBlockHtml(c, l)}
    ${orcamentoBlockHtml(c, l)}
    ${financeiroBlockHtml(c, l)}
    ${complementosBlockHtml(c, l)}

    <div class="block">
      <div class="block-head"><span class="block-title">Histórico da aula</span></div>
      ${renderTimeline(l.notes, 'lesson')}
      ${addNoteForm('lesson', l.id)}
    </div>

    ${feedbackBlockHtml(c, l)}
  </div>`;
}

/* ---------- Detalhes (data / horário-base / status) ---------- */
function detalhesBlockHtml(c, l){
  if(state.editing === 'detalhes'){
    return `<div class="block">
      <div class="block-head"><span class="block-title">Detalhes</span></div>
      <form data-action="save-detalhes" data-contract="${c.id}" data-lesson="${l.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        <div class="form-row2">
          <label class="field">Data${dateFieldHtml('lf-date', l.date || '')}</label>
          <label class="field">Horário-base${timeFieldHtml('lf-time', (l.base_time||'').slice(0,5))}</label>
        </div>
        <label class="field">Status
          <select class="input" id="lf-status">
            ${STATUS_ORDER.map(s => `<option value="${s}" ${l.status===s?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}
          </select>
        </label>
        <div id="lf-avail"></div>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    </div>`;
  }
  return `<div class="block">
    <div class="block-head">
      <span class="block-title">Detalhes</span>
      <button class="block-edit" data-action="edit-block" data-block="detalhes">${ICON.pencil}Editar</button>
    </div>
    <dl class="dl-grid">
      <div><dt>Data</dt><dd>${l.date ? fmtDateBR(l.date) : 'Sem data definida'}</dd></div>
      <div><dt>Horário</dt><dd>${l.date ? (l.actual_start_time||l.base_time||'—').slice(0,5) + (l.base_time && l.actual_start_time && l.base_time!==l.actual_start_time ? ` (base ${l.base_time.slice(0,5)}, ajustado)` : '') : '—'}</dd></div>
      <div><dt>Status</dt><dd>${statusBadge(l.status)}</dd></div>
    </dl>
  </div>`;
}

/* ---------- Professor ---------- */
function professorBlockHtml(c, l){
  if(!TEACHERS.length){
    return `<div class="block"><div class="block-head"><span class="block-title">Professor</span></div><div class="empty-state" style="margin-top:14px">Nenhum professor cadastrado no banco ainda.</div></div>`;
  }
  return `<div class="block">
    <div class="block-head"><span class="block-title">Professor</span></div>
    <div style="margin-top:6px">
      ${TEACHERS.map(t => {
        const status = l.teacher_checks[t.id] || 'not_contacted';
        const selected = l.teacher_id === t.id;
        return `<div class="teacher-row">
          <span class="teacher-name">${escapeHtml(t.name)}${selected ? ' <span class="teacher-selected-tag">confirmado</span>' : ''}</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end">
            <select class="input teacher-select" data-action="change-teacher-check" data-lesson="${l.id}" data-teacher="${t.id}">
              ${Object.entries(TEACHER_CHECK_LABEL).map(([k,v]) => `<option value="${k}" ${status===k?'selected':''}>${v}</option>`).join('')}
            </select>
            ${status === 'available' && !selected ? `<button class="btn-link" data-action="set-selected-teacher" data-lesson="${l.id}" data-teacher="${t.id}">Definir</button>` : ''}
            ${selected ? `<button class="btn-link" data-action="set-selected-teacher" data-lesson="${l.id}" data-teacher="">Remover</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------- Orçamento ---------- */
function orcamentoBlockHtml(c, l){
  const q = l.quote || { amount: null, sent_at: null, status: 'not_sent' };
  if(state.editing === 'orcamento'){
    return `<div class="block">
      <div class="block-head"><span class="block-title">Orçamento</span></div>
      <form data-action="save-orcamento" data-lesson="${l.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        <div class="form-row2">
          <label class="field">Valor (R$)<input class="input" type="number" step="0.01" min="0" id="qf-amount" value="${q.amount ?? ''}"></label>
          <label class="field">Data de envio${dateFieldHtml('qf-sent', q.sent_at || '')}</label>
        </div>
        <label class="field">Status
          <select class="input" id="qf-status">
            ${Object.entries(QUOTE_LABEL).map(([k,v]) => `<option value="${k}" ${q.status===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    </div>`;
  }
  return `<div class="block">
    <div class="block-head"><span class="block-title">Orçamento</span><button class="block-edit" data-action="edit-block" data-block="orcamento">${ICON.pencil}Editar</button></div>
    <dl class="dl-grid">
      <div><dt>Valor</dt><dd>${fmtCurrency(q.amount)}</dd></div>
      <div><dt>Status</dt><dd>${QUOTE_LABEL[q.status]}</dd></div>
    </dl>
  </div>`;
}

/* ---------- Financeiro ---------- */
function financeiroBlockHtml(c, l){
  const p = l.payment;
  if(state.editing === 'financeiro'){
    return `<div class="block">
      <div class="block-head"><span class="block-title">Financeiro</span></div>
      <form data-action="save-financeiro" data-lesson="${l.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        <div class="form-row2">
          <label class="field">Valor pago (R$)<input class="input" type="number" step="0.01" min="0" id="ff-amount" value="${p.amount ?? ''}"></label>
          <label class="field">Forma de pagamento
            <select class="input" id="ff-method">
              <option value="">—</option>
              ${Object.entries(PAYMENT_METHOD_LABEL).map(([k,v]) => `<option value="${k}" ${p.method===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="form-row2">
          <label class="field">Data prevista${dateFieldHtml('ff-expected', p.expected || '')}</label>
          <label class="field">Data real${dateFieldHtml('ff-actual', p.actual || '')}</label>
        </div>
        <label class="field">Status
          <select class="input" id="ff-status">
            <option value="pending" ${p.status==='pending'?'selected':''}>Pendente</option>
            <option value="paid" ${p.status==='paid'?'selected':''}>Pago</option>
          </select>
        </label>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    </div>`;
  }
  return `<div class="block">
    <div class="block-head"><span class="block-title">Financeiro</span><button class="block-edit" data-action="edit-block" data-block="financeiro">${ICON.pencil}Editar</button></div>
    <dl class="dl-grid">
      <div><dt>Valor</dt><dd>${fmtCurrency(p.amount)}</dd></div>
      <div><dt>Forma</dt><dd>${p.method ? PAYMENT_METHOD_LABEL[p.method] : '—'}</dd></div>
      <div><dt>Previsto</dt><dd>${fmtDateBR(p.expected)}</dd></div>
      <div><dt>Pagamento</dt><dd>${PAYMENT_LABEL[p.status]}</dd></div>
    </dl>
  </div>`;
}

/* ---------- Evento e complementos ---------- */
function complementosBlockHtml(c, l){
  if(state.editing === 'complementos'){
    return `<div class="block">
      <div class="block-head"><span class="block-title">Evento e complementos</span></div>
      <form data-action="save-complementos" data-lesson="${l.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        ${switchFieldHtml('cxf-rooftop', l.rooftop, 'Rooftop')}
        ${switchFieldHtml('cxf-frans', l.frans_cafe, "Fran's Café")}
        <label class="field">Observação sobre complementos<textarea class="input" id="cxf-notes" rows="2">${escapeHtml(l.complement_notes)}</textarea></label>
        <label class="field">Necessidades especiais / estrutura<textarea class="input" id="cxf-special" rows="2">${escapeHtml(l.special_requirements)}</textarea></label>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    </div>`;
  }
  return `<div class="block">
    <div class="block-head"><span class="block-title">Evento e complementos</span><button class="block-edit" data-action="edit-block" data-block="complementos">${ICON.pencil}Editar</button></div>
    <div class="complement-row"><span>Rooftop</span><span>${l.rooftop ? 'Sim' : 'Não'}</span></div>
    <div class="complement-row"><span>Fran's Café</span><span>${l.frans_cafe ? 'Sim' : 'Não'}</span></div>
    ${l.complement_notes ? `<p class="text2" style="margin-top:10px;font-size:13.5px">${escapeHtml(l.complement_notes)}</p>` : ''}
    ${l.special_requirements ? `<p class="text2" style="margin-top:6px;font-size:13.5px">Estrutura: ${escapeHtml(l.special_requirements)}</p>` : ''}
  </div>`;
}

/* ---------- Feedback (só quando Realizada) ---------- */
function feedbackBlockHtml(c, l){
  if(l.status !== 'completed') return '';
  if(state.editing === 'feedback'){
    return `<div class="block">
      <div class="block-head"><span class="block-title">Feedback</span></div>
      <form data-action="save-feedback" data-lesson="${l.id}" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
        <label class="field">Imagem (print do WhatsApp/TalkMi)<input class="input" type="file" id="fb-file" accept="image/*"></label>
        ${l.feedback && l.feedback.image ? `
          <div class="feedback-img" style="background-image:url('${l.feedback.image}');background-size:cover;background-position:center;color:transparent">imagem atual</div>
          <button type="button" class="btn-link" data-action="remove-feedback-image" data-lesson="${l.id}">Remover imagem atual</button>
        ` : ''}
        <label class="field">Descrição (opcional)<textarea class="input" id="fb-description" rows="3">${escapeHtml(l.feedback ? (l.feedback.description || '') : '')}</textarea></label>
        <div style="display:flex;gap:10px">
          <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Salvar</button>
          <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </form>
    </div>`;
  }
  return `<div class="block">
    <div class="block-head"><span class="block-title">Feedback</span><button class="block-edit" data-action="edit-block" data-block="feedback">${ICON.pencil}${l.feedback ? 'Editar' : 'Adicionar'}</button></div>
    ${l.feedback ? `
      ${l.feedback.image ? `<div class="feedback-img" style="background-image:url('${l.feedback.image}');background-size:cover;background-position:center;color:transparent">imagem</div>` : ''}
      ${l.feedback.description ? `<p class="text2" style="margin-top:12px;font-size:13.5px">${escapeHtml(l.feedback.description)}</p>` : ''}
      ${!l.feedback.image && !l.feedback.description ? `<div class="empty-state" style="margin-top:14px">Nenhum conteúdo de feedback ainda.</div>` : ''}
    ` : `<div class="empty-state" style="margin-top:14px">Nenhum feedback registrado ainda.</div>`}
  </div>`;
}
