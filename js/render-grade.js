/* ======================= GRADE DA BIKE (recorrente) ======================= */
function renderGrade(){
  return `
  <div style="max-width:660px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <h1 class="section-title">Grade da Bike</h1>
        <p class="section-sub">Aulas fixas recorrentes — não precisamos registrar o professor aqui.</p>
      </div>
      <button class="btn-primary" data-action="open-add-schedule" style="min-height:auto;padding:11px 18px">${ICON.plus}Adicionar horário</button>
    </div>

    ${state.addingScheduleSlot ? addScheduleFormHtml() : ''}

    <div class="blocks" style="margin-top:20px">
      ${WEEKDAY_ORDER.map(wd => {
        const rows = SCHEDULE_ROWS.filter(r => r.weekday === wd && r.active)
          .sort((a,b) => a.start_time.localeCompare(b.start_time));
        return `<div class="block">
          <div class="block-head"><span class="block-title">${WEEKDAY_LABEL[wd]}</span></div>
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px">
            ${rows.length ? rows.map(r => `
              <span class="schedule-chip">
                ${r.start_time.slice(0,5)} — Bike
                <button data-action="remove-schedule-slot" data-id="${r.id}" title="Remover">${ICON.close}</button>
              </span>`).join('') : `<span class="muted" style="font-size:13.5px">Nenhuma aula fixa cadastrada.</span>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function addScheduleFormHtml(){
  return `<form data-action="save-schedule-slot" class="block" style="margin-top:18px;display:flex;flex-direction:column;gap:16px">
    <div class="form-row2">
      <label class="field">Dia da semana
        <select class="input" id="sf-weekday">
          ${WEEKDAY_ORDER.map(wd => `<option value="${wd}">${WEEKDAY_LABEL[wd]}</option>`).join('')}
        </select>
      </label>
      <label class="field">Horário${timeFieldHtml('sf-time', '')}</label>
    </div>
    <div style="display:flex;gap:10px">
      <button type="submit" class="btn-primary" style="flex:1;min-height:auto;padding:12px">Adicionar</button>
      <button type="button" class="btn-secondary" data-action="cancel-add-schedule">Cancelar</button>
    </div>
  </form>`;
}

/* ======================= PERFIL (conta) ======================= */
function renderProfile(){
  return `
  <div style="max-width:480px">
    <h1 class="section-title">Perfil</h1>
    <p class="section-sub">Sua conta no anotAI.</p>

    <div class="blocks" style="margin-top:24px">
      <div class="block">
        <div class="block-head"><span class="block-title">Conta</span></div>
        <dl class="dl-grid" style="grid-template-columns:1fr;margin-top:14px">
          <div><dt>E-mail</dt><dd>${escapeHtml(currentUserEmail || '—')}</dd></div>
        </dl>
      </div>

      <div class="block">
        <div class="block-head"><span class="block-title">Nome de exibição</span></div>
        <form data-action="save-display-name" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
          <label class="field">Nome de exibição<input class="input" id="pf-display-name" value="${escapeHtml(currentUserDisplayName || '')}" required></label>
          <button type="submit" class="btn-primary" style="min-height:auto;padding:12px">Salvar alterações</button>
        </form>
      </div>

      <div class="block">
        <div class="block-head"><span class="block-title">Alterar senha</span></div>
        <form data-action="change-password" style="display:flex;flex-direction:column;gap:16px;margin-top:16px">
          <label class="field">Nova senha${passwordFieldHtml('pw-new', 'minlength="8" required')}</label>
          <label class="field">Confirmar nova senha${passwordFieldHtml('pw-confirm', 'minlength="8" required')}</label>
          <button type="submit" class="btn-primary" style="min-height:auto;padding:12px">Alterar senha</button>
        </form>
      </div>
    </div>
  </div>`;
}

/* ======================= CONFIGURAÇÕES (ainda não disponível) ======================= */
function renderSettings(){
  return `
  <div class="settings-empty">
    <span class="settings-empty-emoji">😅</span>
    <p class="settings-empty-text">A equipe anotAI informa que essa área ainda não está disponível para você.</p>
  </div>`;
}
