/* OASIS — Portail
 * Suite de app.js : la configuration : référentiels, organisation, personnel, domaines, AAC, organigramme, sécurité, modules, système.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════ Configuration (layout PESSCO) ══════════

const CFG_TABS = [
  { section: 'cfg_sec_referentiels' },
  { id: 'organisation', labelKey: 'cfg_organisation', icon: 'users' },
  { id: 'organigramme', labelKey: 'cfg_organigramme', icon: 'sitemap' },
  { id: 'domaines', labelKey: 'cfg_domaines', icon: 'globe' },
  { id: 'exigences', labelKey: 'cfg_exigences', icon: 'fileText' },
  { id: 'prestataires', labelKey: 'cfg_prestataires', icon: 'briefcase' },
  { id: 'inspecteurs', labelKey: 'cfg_inspecteurs', icon: 'userCheck' },
  { id: 'autres', labelKey: 'cfg_autres', icon: 'sliders' },
  { section: 'cfg_sec_plateforme' },
  { id: 'instances', labelKey: 'Instances', icon: 'globe', regionalOnly: true },
  { id: 'securite', labelKey: 'cfg_security', icon: 'shield' },
  { id: 'modules', labelKey: 'cfg_modules', icon: 'grid' },
  { id: 'systeme', labelKey: 'cfg_systeme', icon: 'database' },
];


// ── Schémas des référentiels : partis dans un module typé (ADR-003, 5.d) ──
//
// Les onze schémas, les six fournisseurs d'options et `fieldValue` vivent
// désormais dans `frontend/portail/schemas.ts`, et un sas les pose sur `window`
// avant le chargement de ce fichier (`public/app/schemas.js`, voir index.html).
//
// Ce fichier les appelle toujours en identifiants nus — `REF_SCHEMAS`,
// `champsVisibles`, `fieldValue`, `refLabel`, `personnelName`… — qui atteignent
// maintenant les propriétés de `window`. **Il ne doit pas les redéclarer** : un
// `const REF_SCHEMAS` ici serait une globale lexicale qui masquerait la
// propriété pour tout ce fichier, et deux versions des schémas coexisteraient
// sans une erreur.
//
// L'extraction est éprouvée par `scripts/comparer-schemas.js` : 2 820
// comparaisons sur les données réelles, et trois divergences assumées —
// dont la correction d'un tri qui modifiait `REFS` sur place.

function refTable(coll, premier) {
  const schema = REF_SCHEMAS[coll];
  const rows = (REFS[coll] || [])
    .map(
      (r) => `
    <tr>
      ${champsVisibles(schema).map((f) => `<td>${fieldValue(f, r)}</td>`).join('')}
      <td class="actions-cell">
        <button class="shell-btn-icon" onclick="openRefModal('${coll}','${r.id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
        <button class="shell-btn-icon" onclick="deleteRef('${coll}','${r.id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
      </td>
    </tr>`
    )
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile ${premier ? 'cfg-entete-premier' : 'cfg-entete-suivant'}">
    <h3>${esc(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${coll === 'prestataires' ? searchInputHtml('Rechercher un prestataire...') + exportBar('prestataires', tr('Prestataires de services')) : ''}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr>${champsVisibles(schema).map((f) => `<th>${esc(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${champsVisibles(schema).length + 1}" style="color:var(--text-muted);">${t('aucun_element')}</td></tr>`}</tbody>
    </table>
  </div>`;
}

// Exigences groupées par règlement (bandeaux rétractables ; date d'adoption à droite)
const EXIG_OPEN = new Set(); // vide = tous les bandeaux fermés par défaut
window.toggleExigGroup = function (key) {
  const k = key || '__none__';
  if (EXIG_OPEN.has(k)) EXIG_OPEN.delete(k);
  else EXIG_OPEN.add(k);
  renderConfig();
};

function cfgSectionExigences() {
  const list = REFS.exigences || [];
  const groups = {};
  list.forEach((e) => {
    const key = e.reglement || '';
    (groups[key] = groups[key] || []).push(e);
  });
  const keys = Object.keys(groups).sort((a, b) => (a || 'zzz').localeCompare(b || 'zzz'));
  const blocks = keys
    .map((key) => {
      const items = groups[key];
      const collapsed = !EXIG_OPEN.has(key || '__none__');
      const dateAdoption = (items.find((x) => x.date_adoption) || {}).date_adoption || '';
          const rows = items
        .map(
          (e) => `
        <tr>
          <td><strong>${esc(e.reference || '')}</strong></td>
          <td style="white-space:normal;">${esc(e.libelle || '')}</td>
          <td>${e.statut === 'inactif' ? '<span class="shell-badge badge-inactive">Inactif</span>' : '<span class="shell-badge badge-active">Actif</span>'}</td>
          <td class="actions-cell">
            <button class="shell-btn-icon" onclick="openExigDrawer('${e.id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" onclick="deleteRef('exigences','${e.id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
          </td>
        </tr>`
        )
        .join('');
      return `
      <div class="exig-group ${collapsed ? 'collapsed' : ''}">
        <div class="exig-banner" onclick="toggleExigGroup(${escArg(key)})">
          <span class="exig-banner-title"><span class="exig-chevron">${icon('chevronRight', 15)}</span>${esc(key || tr('Sans règlement'))} <span class="shell-badge" style="background:rgba(255,255,255,.2);color:#fff;">${items.length}</span></span>
          <span class="exig-banner-right" onclick="event.stopPropagation()">
            <span class="exig-banner-date">${dateAdoption ? `${tr("Date d'adoption")} : ${esc(fmtDay(dateAdoption))}` : ''}</span>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openReglementForm(${escArg(key)})" title="${t('modifier_reglement')}" aria-label="${t('modifier_reglement')}">${icon('edit', 15)}</button>
            <button class="shell-btn-icon" style="color:#fff;" onclick="openExigDrawer(null,${escArg(key)},${escArg(dateAdoption)})" title="${t('ajouter_exigence')}" aria-label="${t('ajouter_exigence')}">${icon('plus', 15)}</button>
          </span>
        </div>
        <div class="exig-body">
          <div class="shell-table-container">
            <table class="shell-table shell-table-compact exig-table">
              <thead><tr><th>${tr('Référence')}</th><th>${tr('Libellé')}</th><th>${tr('Statut')}</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    })
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${esc(tr('Liste des exigences'))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher une exigence / règlement...')}
      ${exportBar('exigences', tr('Liste des exigences'))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openExigDrawer(null,null,null,true)">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  ${blocks || `<p style="color:var(--text-muted);">${t('aucune_exigence')}</p>`}
  <div id="exigDrawerRoot"></div>`;
}

// Drawer (panneau latéral droit, ~1/3 écran) — champs Référence, Libellé, Statut
window.openExigDrawer = function (id, presetReglement, presetDate, newGroup) {
  const e = id ? (REFS.exigences || []).find((x) => x.id === id) : null;
  const reglement = e ? e.reglement : (presetReglement || '');
  const date = e ? e.date_adoption : (presetDate || '');
  const showRegFields = !!newGroup; // création d'un nouveau règlement : champs éditables
  const regBlock = showRegFields
    ? `<div class="shell-form-group"><label>${tr('Règlement')}</label><input class="shell-input" id="exReglement" value=""></div>
       <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="exDate" value=""></div>`
    : `<div class="exig-reg-readonly">${icon('fileText', 14)} <strong>${esc(reglement || tr('Sans règlement'))}</strong>${date ? ` · ${esc(fmtDay(date))}` : ''}</div>`;
  document.getElementById('exigDrawerRoot').innerHTML = `
  <div class="exig-drawer-overlay" onclick="closeExigDrawer()"></div>
  <div class="exig-drawer">
    <div class="exig-drawer-header"><h3>${id ? tr('Liste des exigences') : (newGroup ? 'Nouveau règlement' : 'Nouvelle exigence')}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
    <div class="exig-drawer-body">
      ${regBlock}
      <div class="shell-form-group"><label>${tr('Référence')}</label><input class="shell-input" id="exReference" value="${esc(e ? e.reference : '')}"></div>
      <div class="shell-form-group"><label>${tr('Libellé')}</label><textarea class="shell-input exig-libelle" id="exLibelle" rows="6">${esc(e ? e.libelle : '')}</textarea></div>
      <div class="shell-form-group"><label>${tr('Statut')}</label>
        <select class="shell-input" id="exStatut"><option value="actif" ${!e || e.statut !== 'inactif' ? 'selected' : ''}>Actif</option><option value="inactif" ${e && e.statut === 'inactif' ? 'selected' : ''}>Inactif</option></select>
      </div>
    </div>
    <div class="exig-drawer-footer">
      <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${esc(t('cancel'))}</button>
      <button class="shell-btn shell-btn-primary" onclick="saveExigDrawer(${escArg(id || '')}, ${showRegFields}, ${escArg(reglement || '')}, ${escArg(date || '')})">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
};

window.closeExigDrawer = function () { const r = document.getElementById('exigDrawerRoot'); if (r) r.innerHTML = ''; };

window.saveExigDrawer = async function (id, showRegFields, reglement, date) {
  const body = {
    reference: document.getElementById('exReference').value.trim(),
    libelle: document.getElementById('exLibelle').value.trim(),
    statut: document.getElementById('exStatut').value,
  };
  if (showRegFields) {
    body.reglement = document.getElementById('exReglement').value.trim();
    body.date_adoption = document.getElementById('exDate').value;
  } else if (!id) {
    body.reglement = reglement;
    body.date_adoption = date;
  }
  const res = await api(id ? `/api/referentiels/exigences/${id}` : '/api/referentiels/exigences', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (res.ok) { closeExigDrawer(); await loadRefs(); renderConfig(); showToast('OK', 'success'); }
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

// Formulaire séparé : Règlement + Date d'adoption (s'applique à toutes les exigences du groupe)
window.openReglementForm = function (reglement) {
  const items = (REFS.exigences || []).filter((e) => (e.reglement || '') === reglement);
  const date = (items.find((x) => x.date_adoption) || {}).date_adoption || '';
  document.getElementById('exigDrawerRoot').innerHTML = `
  <div class="shell-modal-overlay" style="left:0;top:0;" onclick="closeExigDrawer()"></div>
  <div class="shell-modal-overlay" style="left:0;top:0;background:none;pointer-events:none;">
    <div class="shell-modal" style="max-width:440px;pointer-events:auto;">
      <div class="shell-modal-header"><h3>${tr('Règlement')} / ${tr("Date d'adoption")}</h3><button class="shell-btn-icon" style="color:#fff;" onclick="closeExigDrawer()" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-group" style="margin-bottom:.75rem;"><label>${tr('Règlement')}</label><input class="shell-input" id="rgNom" value="${esc(reglement)}"></div>
        <div class="shell-form-group"><label>${tr("Date d'adoption")}</label><input class="shell-input" type="date" id="rgDate" value="${esc(date)}"></div>
        <p style="font-size:.72rem;color:var(--text-muted);margin-top:.5rem;">Appliqué à ${items.length} exigence(s) de ce règlement.</p>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeExigDrawer()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveReglement(${escArg(reglement)})">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
};

window.saveReglement = async function (oldReglement) {
  const nom = document.getElementById('rgNom').value.trim();
  const date = document.getElementById('rgDate').value;
  const items = (REFS.exigences || []).filter((e) => (e.reglement || '') === oldReglement);
  for (const e of items) {
    await api(`/api/referentiels/exigences/${e.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, reglement: nom, date_adoption: date }),
    });
  }
  closeExigDrawer(); await loadRefs(); renderConfig(); showToast(t('reglement_maj'), 'success');
};

function fmtDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString(CURRENT_LANG);
}

// Chaîne de validation d'une personne : de son entité de rattachement jusqu'à la racine
function orgChainFor(personId) {
  const assigns = (REFS.organisation_assignments || []).filter((a) => a.person_id === personId);
  if (!assigns.length) return null;
  const byId = Object.fromEntries((REFS.organisation || []).map((o) => [o.id, o]));
  let node = byId[assigns[0].org_id];
  const chain = [];
  const guard = new Set();
  while (node && !guard.has(node.id)) {
    guard.add(node.id);
    chain.push(node);
    node = node.parent_id ? byId[node.parent_id] : null;
  }
  return chain.length ? chain : null;
}

function circuitHtml(chain) {
  if (!chain) return '<span style="color:var(--text-muted);font-size:.8rem;">' + t('non_rattache_organigramme') + '</span>';
  return `<div class="pers-circuit">${chain
    .map((n, i) => {
      const color = LEVEL_COLORS[Math.min(i, LEVEL_COLORS.length - 1)];
      const last = i === chain.length - 1;
      const absent = !!n.interim_actif && !!n.interim_id;
      const validateur = absent ? personnelName(n.interim_id) : n.titulaire_id ? personnelName(n.titulaire_id) : n.poste ? 'Poste vacant' : '';
      const sub = (n.poste || validateur)
        ? `<span class="pers-circuit-sub">${esc([n.poste, validateur].filter(Boolean).join(' · '))}${absent ? ' <span class="pers-circuit-interim">' + t('interim') + '</span>' : ''}</span>`
        : '';
      return `<span class="pers-circuit-step" title="${esc(n.libelle)} (${esc(n.type)})${absent ? ' — intérim : ' + esc(personnelName(n.interim_id)) + ', titulaire notifié' : ''}">
          <span class="pers-circuit-sigle" style="border-bottom:2px solid ${color};color:${color};">${esc(n.sigle)}</span>${sub}
        </span>${last ? '' : '<span class="pers-circuit-arrow">→</span>'}`;
    })
    .join('')}</div>`;
}

window.togglePers = function (id) {
  const k = 'pers-' + id;
  if (CFG_OPEN.has(k)) CFG_OPEN.delete(k);
  else CFG_OPEN.add(k);
  renderConfig();
};

function cfgSectionPersonnel() {
  const coll = 'inspecteurs';
  const schema = REF_SCHEMAS[coll];
  const DETAIL_KEYS = ['numero_inspecteur', 'domaines', 'specialites', 'niveau_qualification'];
  const tableFields = schema.fields.filter((f) => !DETAIL_KEYS.includes(f.k));
  const detailFields = schema.fields.filter((f) => DETAIL_KEYS.includes(f.k));
  const colspan = tableFields.length + 2; // chevron + actions
  const rows = (REFS[coll] || [])
    .map((r) => {
      const open = CFG_OPEN.has('pers-' + r.id);
      const chain = orgChainFor(r.id);
      const cells = tableFields.map((f) => `<td>${fieldValue(f, r)}</td>`).join('');
      const detailInfo = detailFields
        .map((f) => `<div class="pers-info-item"><span class="pers-info-lbl">${esc(tr(f.l))}</span><span class="pers-info-val">${fieldValue(f, r)}</span></div>`)
        .join('');
      return `
      <tr>
        <td><button class="shell-btn-icon pers-toggle" onclick="togglePers('${r.id}')" title="${t('audit_col_details')}" aria-label="${t('audit_col_details')}" style="transform:rotate(${open ? 90 : 0}deg);">${icon('chevronRight', 14)}</button></td>
        ${cells}
        <td class="actions-cell">
          <button class="shell-btn-icon" onclick="openRefModal('${coll}','${r.id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
          <button class="shell-btn-icon" onclick="deleteRef('${coll}','${r.id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}" style="color:#dc2626;">${icon('trash', 15)}</button>
        </td>
      </tr>
      <tr class="pers-detail-row" style="${open ? '' : 'display:none;'}">
        <td colspan="${colspan}" style="background:var(--bg);">
          <div class="pers-info-grid">${detailInfo}</div>
          <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.6rem 0 .4rem;">${t('circuit_validation')}</div>
          ${circuitHtml(chain)}
        </td>
      </tr>`;
    })
    .join('');
  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${esc(tr(schema.title))}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un membre du personnel...')}
      ${exportBar('inspecteurs', tr("Liste du personnel de l'Administration"))}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('${coll}')">${icon('plus', 13)} ${esc(t('add'))}</button>
    </div>
  </div>
  <div class="shell-table-container">
    <table class="shell-table shell-table-compact">
      <thead><tr><th></th>${tableFields.map((f) => `<th>${esc(tr(f.l))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="${colspan}" style="color:var(--text-muted);">${t('aucun_element')}</td></tr>`}</tbody>
    </table>
  </div>`;
}

window.openRefModal = function (coll, id, defaultsJson) {
  const schema = REF_SCHEMAS[coll];
  let record = {};
  if (id) record = (REFS[coll] || []).find((r) => r.id === id) || {};
  else if (defaultsJson) {
    try { record = JSON.parse(defaultsJson); } catch { record = {}; }
  }
  const root = document.getElementById('cfgModalRoot');
  const isOrg = coll === 'organisation';
  const orgTop = isOrg ? orgTopLevelType() : null;
  const aacRef = (CURRENT_CFG && CURRENT_CFG.aac) || {};
  const orgIsTop = isOrg && record.type === orgTop;
  window.__ORG_AUTO = { top: orgTop, sigle: aacRef.sigle || '', nom: aacRef.nom || '' };
  const inputs = champsVisibles(schema)
    .map((f) => {
      const val = record[f.k] ?? '';
      const wrapCls = f.inspectorOnly ? 'shell-form-group insp-only' : 'shell-form-group';
      let onchange = f.k === 'est_inspecteur' ? ' onchange="toggleInspectorFields()"' : '';
      if (isOrg && f.k === 'type') onchange = ' onchange="orgTypeChanged()"';
      if (isOrg && (f.k === 'sigle' || f.k === 'libelle')) {
        const autoVal = f.k === 'sigle' ? (aacRef.sigle || '') : (aacRef.nom || '');
        const useVal = orgIsTop ? autoVal : val;
        return `
        <div class="shell-form-group" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <input class="shell-input org-${f.k}-input" type="text" data-field="${f.k}" value="${esc(useVal)}" ${orgIsTop ? 'disabled' : ''}>
          <span class="org-auto-note" style="font-size:.7rem;color:var(--text-muted);${orgIsTop ? '' : 'display:none;'}">${t('repris_administration')}</span>
        </div>`;
      }
      if (f.type === 'multiselect') {
        const opts = f.options ? f.options() : [];
        const vals = Array.isArray(record[f.k]) ? record[f.k].map(String) : [];
        return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <div class="multi-check">
            ${opts.length
              ? opts.map((o) => `<label class="multi-check-item"><input type="checkbox" data-multi="${f.k}" value="${esc(o.v)}" ${vals.includes(String(o.v)) ? 'checked' : ''}> ${esc(o.t)}</label>`).join('')
              : `<span style="color:var(--text-muted);font-size:.8rem;">${t('aucune_option_config')}</span>`}
          </div>
        </div>`;
      }
      if (f.type === 'select') {
        const opts = (f.options ? f.options() : []).filter((o) => !(coll === 'organisation' && f.k === 'parent_id' && o.v === id));
        return `
        <div class="${wrapCls}" style="margin-bottom:.75rem;">
          <label>${esc(tr(f.l))}</label>
          <select class="shell-input" data-field="${f.k}"${onchange}>
            ${f.allowEmpty ? `<option value="">—</option>` : ''}
            ${opts.map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}
          </select>
        </div>`;
      }
      return `
      <div class="${wrapCls}" style="margin-bottom:.75rem;">
        <label>${esc(tr(f.l))}</label>
        <input class="shell-input" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" data-field="${f.k}" value="${esc(val)}">
      </div>`;
    })
    .join('');

  root.innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:560px;">
      <div class="shell-modal-header"><h3>${esc(tr(schema.title))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">${inputs}</div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveRef('${coll}','${id || ''}')">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
  if (coll === 'inspecteurs') toggleInspectorFields();
};

window.toggleInspectorFields = function () {
  const sel = document.querySelector('#cfgModalRoot [data-field="est_inspecteur"]');
  const show = sel && sel.value === 'oui';
  document.querySelectorAll('#cfgModalRoot .insp-only').forEach((el) => {
    el.style.display = show ? '' : 'none';
  });
};

window.closeRefModal = function () {
  document.getElementById('cfgModalRoot').innerHTML = '';
};

window.orgTypeChanged = function () {
  const auto = window.__ORG_AUTO || {};
  const sel = document.querySelector('#cfgModalRoot [data-field="type"]');
  const sigleIn = document.querySelector('#cfgModalRoot .org-sigle-input');
  const libelleIn = document.querySelector('#cfgModalRoot .org-libelle-input');
  const isTop = sel && sel.value === auto.top;
  [ [sigleIn, auto.sigle], [libelleIn, auto.nom] ].forEach(([inp, v]) => {
    if (!inp) return;
    const note = inp.parentElement.querySelector('.org-auto-note');
    if (isTop) {
      inp.value = v || '';
      inp.disabled = true;
      if (note) note.style.display = '';
    } else {
      inp.disabled = false;
      if (note) note.style.display = 'none';
    }
  });
};

window.saveRef = async function (coll, id) {
  const body = {};
  document.querySelectorAll('#cfgModalRoot [data-field]').forEach((input) => {
    body[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value;
  });
  // Champs multi-valeurs (domaines, spécialités…)
  document.querySelectorAll('#cfgModalRoot [data-multi]').forEach((input) => {
    const k = input.dataset.multi;
    if (!Array.isArray(body[k])) body[k] = [];
    if (input.checked) body[k].push(input.value);
  });
  // Niveau d'ordre 1 : sigle & libellé repris de « Détails sur l'Administration »
  if (coll === 'organisation') {
    const auto = window.__ORG_AUTO || {};
    if (auto.top && body.type === auto.top) {
      if (auto.sigle) body.sigle = auto.sigle;
      if (auto.nom) body.libelle = auto.nom;
    }
  }
  // Registre des titulaires : journalise tout changement de titulaire de poste
  if (coll === 'organisation' && id && body.titulaire_id !== undefined) {
    const old = (REFS.organisation || []).find((o) => o.id === id);
    if (old && body.titulaire_id !== (old.titulaire_id || '')) {
      const registre = Array.isArray(old.registre) ? old.registre.map((e) => ({ ...e })) : [];
      const openTit = [...registre].reverse().find((e) => e.role === 'titulaire' && !e.end);
      if (openTit) openTit.end = new Date().toISOString();
      if (body.titulaire_id) registre.push({ role: 'titulaire', person_id: body.titulaire_id, start: new Date().toISOString(), end: null });
      body.registre = registre;
    }
  }
  const res = await api(id ? `/api/referentiels/${coll}/${id}` : `/api/referentiels/${coll}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    closeRefModal();
    await loadRefs();
    renderConfig();
    showToast('OK', 'success');
  } else {
    const d = await res.json().catch(() => ({}));
    showToast(
      d.error === 'duplicate_code' ? t('code_deja_utilise', body.code || '')
      : oasisMessageErreur(d, res.status),
      'error', 5000
    );
  }
};

window.deleteRef = async function (coll, id) {
  if (!await oasisConfirmer(t('confirm_delete'))) return;
  const res = await api(`/api/referentiels/${coll}/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast('OK', 'success');
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

// ── Accordéons hiérarchiques (Domaines / Secteurs / Sous-activités / Thèmes) ──
const CFG_OPEN = new Set();

window.toggleAcc = function (key) {
  if (CFG_OPEN.has(key)) CFG_OPEN.delete(key);
  else CFG_OPEN.add(key);
  renderConfig();
};

function statutBadge(s) {
  return s === 'inactif'
    ? '<span class="shell-badge badge-inactive">Inactif</span>'
    : '<span class="shell-badge badge-active">Actif</span>';
}

function accActions(coll, id) {
  return `<span style="display:flex;gap:.15rem;" onclick="event.stopPropagation()">
    <button class="shell-btn-icon" onclick="openRefModal('${coll}','${id}')" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">${icon('edit', 15)}</button>
    <button class="shell-btn-icon" style="color:#dc2626;" onclick="deleteRef('${coll}','${id}')" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}">${icon('trash', 15)}</button>
  </span>`;
}

function accAddBtn(coll, defaults, label) {
  const json = JSON.stringify(JSON.stringify(defaults || {}));
  return `<button class="shell-btn shell-btn-outline shell-btn-sm" style="margin-top:.6rem;" onclick='openRefModal("${coll}","",${json})'>${icon('plus', 13)} ${esc(label)}</button>`;
}

function accItem(key, color, headerHtml, actionsHtml, bodyHtml, dense) {
  const open = CFG_OPEN.has(key);
  return `
  <div class="cfg-acc-item ${open ? 'open' : ''}" style="margin-bottom:${dense ? '.1rem' : '.5rem'};">
    <div class="cfg-acc-header" style="border-left:4px solid ${color};" onclick="toggleAcc('${key}')">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">${headerHtml}</div>
      <div style="display:flex;align-items:center;gap:.35rem;">${actionsHtml}<span class="cfg-acc-chevron" style="display:flex;">${icon('chevronRight', 15)}</span></div>
    </div>
    <div class="cfg-acc-body">${bodyHtml}</div>
  </div>`;
}

// Sous-menu « Domaines & Secteurs » : accordéons Domaines → Secteurs → Sous-activités
function cfgSectionDomaines() {
  const domaines = REFS.domaines || [];
  const secteurs = REFS.secteurs || [];
  const sousActivites = REFS.sous_activites || [];
  const themes = REFS.themes_supervision || [];

  const themeRow = (th) => `
    <div class="cfg-module-row" style="border-left:3px solid ${LEVEL_COLORS[3]};padding-left:.75rem;">
      <div>
        <strong>${th.code ? `<span class="shell-badge badge-neutral" style="margin-right:.4rem;">${esc(th.code)}</span>` : ''}${esc(th.libelle)}</strong>
        ${th.description ? `<div style="font-size:.75rem;color:var(--text-muted);">${esc(th.description)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:.35rem;">${statutBadge(th.statut)}${accActions('themes_supervision', th.id)}</div>
    </div>`;

  const items = domaines
    .map((d) => {
      const dSecteurs = secteurs.filter((s) => s.domaine_id === d.id);
      const secteurItems = dSecteurs
        .map((s) => {
          const sSas = sousActivites.filter((x) => x.secteur_id === s.id);
          const saItems = sSas
            .map((x) => {
              const saThemes = themes.filter((th) => th.sous_activite_id === x.id);
              return accItem(
                'sa-' + x.id,
                LEVEL_COLORS[2],
                `<span class="shell-badge badge-neutral">${esc(x.code)}</span> <strong style="margin-left:.35rem;">${esc(x.nom)}</strong>
                 <span class="shell-badge badge-neutral">${saThemes.length} thème(s)</span>`,
                accActions('sous_activites', x.id),
                (saThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme') + '</p>') +
                  accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, sous_activite_id: x.id, statut: 'actif' }, 'Thème'),
                true
              );
            })
            .join('');
          const directThemes = themes.filter((th) => th.secteur_id === s.id && !th.sous_activite_id);
          const directBlock = `
            <div style="margin-top:.4rem;">
              <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin:.35rem 0 .25rem;">${t('themes_du_secteur')}</div>
              ${directThemes.map(themeRow).join('') || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_theme_secteur') + '</p>'}
              ${accAddBtn('themes_supervision', { domaine_id: d.id, secteur_id: s.id, statut: 'actif' }, 'Thème')}
            </div>`;
          const nbThemes = themes.filter((th) => th.secteur_id === s.id || sSas.some((x) => x.id === th.sous_activite_id)).length;
          return accItem(
            'sect-' + s.id,
            LEVEL_COLORS[1],
            `<strong style="color:${LEVEL_COLORS[1]};">${esc(s.code)}</strong> — ${esc(s.nom)}
             <span class="shell-badge badge-neutral">Cycle ${esc(s.csn)} mois</span>
             <span class="shell-badge badge-neutral">${sSas.length} sous-activité(s)</span>
             <span class="shell-badge badge-neutral">${nbThemes} thème(s)</span>
             ${statutBadge(s.statut)}`,
            accActions('secteurs', s.id),
            (saItems || '') +
              accAddBtn('sous_activites', { secteur_id: s.id }, 'Sous-activité') +
              directBlock,
            true
          );
        })
        .join('');
      return accItem(
        'dom-' + d.id,
        LEVEL_COLORS[0],
        `<strong style="color:${LEVEL_COLORS[0]};">${esc(d.code)}</strong> — ${esc(d.nom)}
         <span class="shell-badge badge-neutral">${dSecteurs.length} secteur(s)</span>
         ${statutBadge(d.statut)}`,
        accActions('domaines', d.id),
        (secteurItems || '<p style="color:var(--text-muted);font-size:.8rem;">' + t('aucun_secteur') + '</p>') +
          accAddBtn('secteurs', { domaine_id: d.id }, 'Secteur'),
        true
      );
    })
    .join('');

  const orphans = themes.filter((th) => !th.secteur_id && !th.sous_activite_id);
  const orphanBlock = orphans.length
    ? `<div style="margin-top:1rem;">
        <div class="portal-page-header"><h3>${tr('Thèmes non rattachés')}</h3></div>
        ${orphans.map(themeRow).join('')}
      </div>`
    : '';

  return `
  <div class="portal-page-header cfg-entete-empile cfg-entete-premier">
    <h3>${tr('Domaines | Secteurs | Sous-activités | Thèmes')}</h3>
    <div class="portal-page-actions">
      ${searchInputHtml('Rechercher un domaine / secteur...')}
      ${exportBar('activites', tr('Domaines | Secteurs | Sous-activités | Thèmes'), 'exportPdfActivites()')}
      <button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openRefModal('domaines')">${icon('plus', 13)} Domaine</button>
    </div>
  </div>
  <div class="cfg-accordion cfg-acc-dense">${items || '<p style="color:var(--text-muted);">' + t('aucun_domaine_defini') + '</p>'}</div>
  ${orphanBlock}`;
}


// ── Sections de configuration ──

let AAC_CFG = null;
let CURRENT_CFG = null;
function cfgSectionAAC(cfg) {
  AAC_CFG = cfg;
  const aac = cfg.aac || {};
  const val = (v) => (v ? esc(v) : '<span style="color:var(--text-muted);">—</span>');
  const langLabel = { fr: 'Français', en: 'English', pt: 'Português' }[cfg.instance.defaultLang] || cfg.instance.defaultLang;
  const logoBox = aac.logo
    ? `<img src="${aac.logo}" alt="Logo AAC" class="aac-logo-preview">`
    : `<div class="aac-logo-empty">${icon('landmark', 30)}<span>${t('aucun_logo')}</span></div>`;
  const rows = [
    ['Nom complet', val(aac.nom)],
    ['Sigle', val(aac.sigle)],
    ['Bigramme', val(aac.bigramme)],
    ['État', val(aac.etat)],
    ['Ville', val(aac.ville)],
    ['Adresse 1', val(aac.adresse1)],
    ['Adresse 2', val(aac.adresse2)],
    ['Email administrateur', val(aac.emailAdmin)],
    ['Langue par défaut', esc(langLabel)],
  ]
    .map((r) => `<tr><td class="aac-info-lbl">${tr(r[0])}</td><td class="aac-info-val">${r[1]}</td></tr>`)
    .join('');

  return `
  <div class="portal-page-header"><h3>${tr("Détails sur l'Administration")}</h3>
    <div class="portal-page-actions"><button class="shell-btn shell-btn-primary shell-btn-sm" onclick="openAacEdit()">${icon('edit', 14)} Modifier</button></div>
  </div>
  <div class="aac-presentation aac-presentation-compact">
    <div class="aac-logo-col">
      <div class="aac-logo-frame">${logoBox}</div>
      <div class="aac-logo-btns">
        <label class="shell-btn shell-btn-outline aac-logo-iconbtn" title="${aac.logo ? 'Changer le logo' : 'Charger un logo'}">${cameraIcon()}
          <input type="file" accept="image/*" style="display:none;" onchange="uploadAacLogo(this)">
        </label>
        ${aac.logo ? `<button class="shell-btn shell-btn-danger aac-logo-iconbtn" onclick="removeAacLogo()" title="${t('supprimer_logo')}">${icon('trash', 15)}</button>` : ''}
      </div>
    </div>
    <div class="aac-detail-col">
      <h2 class="aac-title">${aac.nom ? esc(aac.nom) : "Administration de l'Aviation Civile"}</h2>
      <div class="aac-badges">
        ${aac.sigle ? `<span class="shell-badge badge-neutral aac-badge-sigle">${esc(aac.sigle)}</span>` : ''}
        ${aac.bigramme ? `<span class="shell-badge badge-neutral">${esc(aac.bigramme)}</span>` : ''}
      </div>
      <div class="shell-table-container" style="margin-top:1rem;">
        <table class="shell-table aac-info-table"><tbody>${rows}</tbody></table>
      </div>
    </div>
  </div>`;
}

function cameraIcon() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
}

window.openAacEdit = function () {
  const cfg = AAC_CFG || {};
  const aac = (cfg.aac) || {};
  const input = (id, label, value) => `
    <div class="shell-form-group"><label>${label}</label><input class="shell-input" id="${id}" value="${esc(value || '')}"></div>`;
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:600px;">
      <div class="shell-modal-header"><h3>${esc(t('cfg_aac'))}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-form-row">
          ${input('aacNom', "Nom de l'administration", aac.nom)}
          ${input('aacSigle', 'Sigle', aac.sigle)}
        </div>
        <div class="shell-form-row">
          ${input('aacEtat', 'État', aac.etat)}
          ${input('aacBigramme', 'Bigramme', aac.bigramme)}
        </div>
        <div class="shell-form-row">
          ${input('aacVille', 'Ville', aac.ville)}
          ${input('aacAdresse1', 'Adresse 1', aac.adresse1)}
        </div>
        <div class="shell-form-row">
          ${input('aacAdresse2', 'Adresse 2', aac.adresse2)}
          ${input('aacEmail', 'Email administrateur', aac.emailAdmin)}
        </div>
        <div class="shell-form-group"><label>${t('langue_defaut')}</label>
          <select class="shell-input" id="aacLang">
            <option value="fr" ${cfg.instance.defaultLang === 'fr' ? 'selected' : ''}>${t('langue_francais')}</option>
            <option value="en" ${cfg.instance.defaultLang === 'en' ? 'selected' : ''}>English</option>
            <option value="pt" ${cfg.instance.defaultLang === 'pt' ? 'selected' : ''}>${t('langue_portugais')}</option>
          </select>
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="saveAAC()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
      </div>
    </div>
  </div>`;
};

async function saveAacLogo(dataUrl) {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aac: { logo: dataUrl } }),
  });
  if (res.ok) {
    showToast(dataUrl ? t('logo_enregistre') : t('logo_supprime'), 'success');
    await loadMe();
    renderConfig();
  } else showToast(t('erreur_fichier_volumineux'), 'error', 4000);
}

window.uploadAacLogo = function (inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast(t('image_trop_lourde'), 'error');
  const reader = new FileReader();
  reader.onload = () => saveAacLogo(reader.result);
  reader.readAsDataURL(file);
};

window.removeAacLogo = async function () {
  if (!await oasisConfirmer(t('confirmer_suppr_logo'))) return;
  saveAacLogo('');
};

window.saveAAC = async function () {
  const gv = (id) => document.getElementById(id).value.trim();
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aac: {
        nom: gv('aacNom'), sigle: gv('aacSigle'), etat: gv('aacEtat'), bigramme: gv('aacBigramme'),
        ville: gv('aacVille'), adresse1: gv('aacAdresse1'), adresse2: gv('aacAdresse2'),
        emailAdmin: gv('aacEmail'),
      },
      instance: { etat: gv('aacEtat'), codeEtat: gv('aacBigramme'), defaultLang: document.getElementById('aacLang').value },
    }),
  });
  if (res.ok) {
    closeRefModal();
    showToast(t('cfg_saved'), 'success');
    await loadMe();
    renderConfig();
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

let ORG_VIEW = 'list'; // 'list' | 'tree'

window.setOrgView = function (v) {
  ORG_VIEW = v;
  renderConfig();
};

window.orgDragStart = function (ev, personId) {
  ev.dataTransfer.setData('text/plain', personId);
  ev.dataTransfer.effectAllowed = 'move';
};
window.orgAllowDrop = function (ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add('org-drop-hover');
};
window.orgDragLeave = function (ev) {
  ev.currentTarget.classList.remove('org-drop-hover');
};
window.orgDrop = async function (ev, orgId) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('org-drop-hover');
  const personId = ev.dataTransfer.getData('text/plain');
  if (!personId) return;
  const exists = (REFS.organisation_assignments || []).some((a) => a.org_id === orgId && a.person_id === personId);
  if (exists) return showToast(t('deja_rattache'), 'warning');
  const res = await api('/api/referentiels/organisation_assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, person_id: personId, person_type: 'inspecteur' }),
  });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast(t('personnel_rattache'), 'success');
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};
window.openPosteRegistre = function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const reg = (Array.isArray(node.registre) ? node.registre : []).slice().reverse();
  const rows = reg
    .map((e) => {
      const roleBadge =
        e.role === 'interim'
          ? '<span class="shell-badge" style="background:#fef3c7;color:#92400e;">' + t('interimaire') + '</span>'
          : '<span class="shell-badge badge-active">Titulaire</span>';
      const fin = e.end ? fmtDate(e.end) : '<span class="shell-badge badge-active">En cours</span>';
      return `<tr><td>${roleBadge}</td><td>${esc(personnelName(e.person_id))}</td><td>${fmtDate(e.start)}</td><td>${fin}</td></tr>`;
    })
    .join('');
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:640px;">
      <div class="shell-modal-header"><h3>Registre — ${esc(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-table-container">
          <table class="shell-table shell-table-compact">
            <thead><tr><th>${t('users_col_role')}</th><th>Personne</th><th>${t('debut_jour_heure')}</th><th>Fin (jour / heure)</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" style="color:var(--text-muted);">${t('aucun_enregistrement')}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="shell-modal-footer"><button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${t('fermer')}</button></div>
    </div>
  </div>`;
};

window.orgStartInterim = function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  const opts = personnelOptions().filter((o) => o.v !== node.titulaire_id);
  document.getElementById('cfgModalRoot').innerHTML = `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:440px;">
      <div class="shell-modal-header"><h3>Signaler un intérim — ${esc(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${esc(t("fermer"))}" title="${esc(t("fermer"))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">Titulaire : <strong>${esc(titNom || 'Poste vacant')}</strong>${t('selectionner_interimaire')}</p>
        <div class="shell-form-group">
          <label>${t('interimaire')}</label>
          <select class="shell-input" id="interimSelect">
            <option value="">— Choisir —</option>
            ${opts.map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${esc(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="orgConfirmInterim('${nodeId}')">${t('activer_interim')}</button>
      </div>
    </div>
  </div>`;
};

window.orgConfirmInterim = async function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  const interimId = document.getElementById('interimSelect').value;
  if (!interimId) return showToast(t('choisir_interimaire'), 'warning');
  const registre = Array.isArray(node.registre) ? [...node.registre] : [];
  registre.push({ role: 'interim', person_id: interimId, start: new Date().toISOString(), end: null });
  const res = await api(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: interimId, interim_actif: true, registre }),
  });
  if (!res.ok) return showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
  const posteLbl = node.poste || node.sigle;
  const interimNom = personnelName(interimId);
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  await api('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Intérim (${posteLbl}) : les demandes de validation sont redirigées vers ${interimNom}.`, type: 'warning' }),
  });
  if (titNom) {
    await api('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${titNom}, vos validations (${posteLbl}) sont assurées par ${interimNom} pendant votre absence.`, type: 'info' }),
    });
  }
  closeRefModal();
  await loadRefs();
  renderConfig();
  refreshNotifications();
  showToast(t('interim_active', interimNom), 'success', 4000);
};

window.orgEndInterim = async function (nodeId) {
  const node = (REFS.organisation || []).find((o) => o.id === nodeId);
  if (!node) return;
  const registre = Array.isArray(node.registre) ? node.registre.map((e) => ({ ...e })) : [];
  const open = [...registre].reverse().find((e) => e.role === 'interim' && !e.end);
  if (open) open.end = new Date().toISOString();
  const res = await api(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: '', interim_actif: false, registre }),
  });
  if (!res.ok) return showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
  await loadRefs();
  renderConfig();
  showToast(t('interim_retire'), 'success');
};

window.orgUnassign = async function (id) {
  const res = await api(`/api/referentiels/organisation_assignments/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadRefs();
    renderConfig();
    showToast(t('rattachement_retire'), 'success');
  } else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

function orgPersonName(p) {
  return `${esc(p.nom || '')} ${esc(p.prenom || '')}`.trim() || esc(p.numero_inspecteur || p.id);
}

function orgAssignedChips(orgId) {
  const assigns = (REFS.organisation_assignments || []).filter((a) => a.org_id === orgId);
  if (!assigns.length) return '';
  const persons = REFS.inspecteurs || [];
  return `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem;">${assigns
    .map((a) => {
      const p = persons.find((x) => x.id === a.person_id);
      if (!p) return '';
      return `<span class="org-person-chip">${orgPersonName(p)}<span class="org-chip-x" onclick="orgUnassign('${a.id}')" title="Retirer">${icon('x', 12)}</span></span>`;
    })
    .join('')}</div>`;
}

function cfgSectionOrganigramme() {
  const levels = (REFS.organisation_levels || []).slice().sort((a, b) => a.ordre - b.ordre);
  const levelIndex = Object.fromEntries(levels.map((lv, i) => [lv.type, i]));
  const entites = REFS.organisation || [];
  const persons = REFS.inspecteurs || [];
  const children = (pid) => entites.filter((o) => (o.parent_id || '') === pid).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  // Panneau personnel (glisser-déposer) — masque les personnes déjà rattachées
  const assignedIds = new Set((REFS.organisation_assignments || []).map((a) => a.person_id));
  const available = persons.filter((p) => !assignedIds.has(p.id));
  const personnelPanel = `
    <div class="org-personnel">
      <div class="org-personnel-title">${icon('users', 15)} Personnel AAC</div>
      <p style="font-size:.72rem;color:var(--text-muted);margin-bottom:.5rem;">${t('glisser_nom')}</p>
      ${
        available.length
          ? available
              .map(
                (p) => `<div class="org-person-item" draggable="true" ondragstart="orgDragStart(event,'${p.id}')" title="Réf : ${esc(p.ref_personnel || p.numero_inspecteur || '—')}">${icon('userCheck', 14)} <span>${orgPersonName(p)}</span></div>`
              )
              .join('')
          : `<p style="font-size:.8rem;color:var(--text-muted);">${persons.length ? 'Tout le personnel est rattaché.' : 'Aucun personnel — voir sous-menu « Personnel AAC ».'}</p>`
      }
    </div>`;

  const posteLine = (node) => {
    if (!node.poste && !node.titulaire_id && !node.interim_id) return '';
    const tit = node.titulaire_id ? personnelName(node.titulaire_id) : 'Poste vacant';
    const absent = !!node.interim_actif && !!node.interim_id;
    const titClass = absent ? 'org-titulaire org-titulaire-off' : 'org-titulaire';
    let interimHtml = '';
    if (node.interim_id) {
      interimHtml = `<span class="org-interim ${absent ? 'org-interim-on' : ''}">${icon('userCheck', 12)} Intérim : ${esc(personnelName(node.interim_id))}${absent ? ' <span class="shell-badge badge-active">Actif</span>' : ''}</span>`;
    }
    const canInterim = !!node.titulaire_id || !!node.poste;
    const toggle = absent
      ? `<button class="shell-btn shell-btn-danger org-poste-btn" onclick="event.stopPropagation();orgEndInterim('${node.id}')">${t('titulaire_retour')}</button>`
      : canInterim
      ? `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();orgStartInterim('${node.id}')">${t('signaler_interim')}</button>`
      : '';
    const nbReg = Array.isArray(node.registre) ? node.registre.length : 0;
    const registreBtn = `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();openPosteRegistre('${node.id}')">Registre${nbReg ? ` (${nbReg})` : ''}</button>`;
    return `<div class="org-poste">
      ${node.poste ? `<span class="org-poste-nom">${esc(node.poste)}</span>` : ''}
      <span class="${titClass}">${icon('userCheck', 12)} ${esc(tit)}</span>
      ${interimHtml}
      ${toggle}
      ${registreBtn}
    </div>`;
  };
  const editBtn = (node) =>
    `<button class="shell-btn-icon org-edit" onclick="event.stopPropagation();openRefModal('organisation','${node.id}')" title="Poste & titulaire" aria-label="Poste & titulaire">${icon('edit', 14)}</button>`;

  // Vue liste (indentée) — présentation actuelle
  const renderNodeList = (node, depth) => {
    const color = LEVEL_COLORS[levelIndex[node.type] ?? depth] || '#64748b';
    return `
    <div class="org-node" style="margin-left:${depth * 1.5}rem;border-left:3px solid ${color};"
         ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${node.id}')">
      <div style="display:flex;align-items:center;gap:.4rem;">
        <div style="flex:1;"><strong style="color:${color};">${esc(node.sigle)}</strong> — ${esc(node.libelle)}
          <span class="shell-badge badge-neutral" style="margin-left:.4rem;">${esc(node.type)}</span></div>
        ${editBtn(node)}
      </div>
      ${posteLine(node)}
      ${orgAssignedChips(node.id)}
    </div>
    ${children(node.id).map((c) => renderNodeList(c, depth + 1)).join('')}`;
  };

  // Vue hiérarchique verticale (arbre)
  const renderNodeTree = (node, depth) => {
    const color = LEVEL_COLORS[levelIndex[node.type] ?? depth] || '#64748b';
    const kids = children(node.id);
    return `
    <div class="org-tree-node">
      <div class="org-tree-box" style="border-top:3px solid ${color};"
           ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${node.id}')">
        <div style="display:flex;align-items:center;justify-content:center;gap:.3rem;"><strong style="color:${color};">${esc(node.sigle)}</strong>${editBtn(node)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${esc(node.libelle)}</div>
        ${posteLine(node)}
        ${orgAssignedChips(node.id)}
      </div>
      ${kids.length ? `<div class="org-tree-children">${kids.map((c) => renderNodeTree(c, depth + 1)).join('')}</div>` : ''}
    </div>`;
  };

  const roots = children('');
  const body = !roots.length
    ? '<p style="color:var(--text-muted);">' + t('aucune_entite') + '</p>'
    : ORG_VIEW === 'tree'
    ? `<div class="org-tree">${roots.map((r) => renderNodeTree(r, 0)).join('')}</div>`
    : roots.map((r) => renderNodeList(r, 0)).join('');

  return `
  <div class="portal-page-header">
    <h3>${esc(t('cfg_organigramme'))}</h3>
    <div class="portal-page-actions">
      <div class="org-view-toggle">
        <button class="org-view-btn ${ORG_VIEW === 'list' ? 'active' : ''}" onclick="setOrgView('list')">${icon('list', 14)} Liste</button>
        <button class="org-view-btn ${ORG_VIEW === 'tree' ? 'active' : ''}" onclick="setOrgView('tree')">${icon('sitemap', 14)} Hiérarchie</button>
      </div>
    </div>
  </div>
  <div class="org-layout">
    ${personnelPanel}
    <div class="org-canvas shell-card">${body}</div>
  </div>`;
}

function cfgSectionSecurite(cfg) {
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_security'))} <span class="shell-badge badge-neutral">TDR §F.3</span></h3></div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>${t('longueur_min_mdp')}</label><input class="shell-input" type="number" id="secMinLen" value="${cfg.security.passwordMinLength}"></div>
      <div class="shell-form-group"><label>${t('validite_mdp')}</label><input class="shell-input" type="number" id="secMaxAge" value="${cfg.security.passwordMaxAgeDays}"></div>
    </div>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Tentatives avant blocage</label><input class="shell-input" type="number" id="secMaxFail" value="${cfg.security.maxFailedAttempts}"></div>
      <div class="shell-form-group"><label>${t('deconnexion_inactivite')}</label><input class="shell-input" type="number" id="secTimeout" value="${cfg.security.sessionTimeoutMinutes}"></div>
    </div>
    <div class="cfg-module-row">
      <strong>${t('session_unique')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secSingle" ${cfg.security.singleSession ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <strong>${t('mdp_premiere_connexion')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="secForce" ${cfg.security.forceChangeOnFirstLogin ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="cfg-module-row">
      <div>
        <strong>Authentification multifacteur (MFA)</strong>
        <div style="font-size:.72rem;color:var(--text-muted);">
          ${t('code_usage_unique')}
        </div>
      </div>
      <label class="cfg-toggle"><input type="checkbox" id="secMfa" ${cfg.security.mfaEnabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="shell-btn shell-btn-primary" onclick="saveSecurite()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
}

window.saveSecurite = async function () {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      security: {
        passwordMinLength: document.getElementById('secMinLen').value,
        passwordMaxAgeDays: document.getElementById('secMaxAge').value,
        maxFailedAttempts: document.getElementById('secMaxFail').value,
        sessionTimeoutMinutes: document.getElementById('secTimeout').value,
        singleSession: document.getElementById('secSingle').checked,
        forceChangeOnFirstLogin: document.getElementById('secForce').checked,
        mfaEnabled: document.getElementById('secMfa').checked,
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

function cfgSectionModules(modules) {
  const rows = modules
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(
      (m) => `
    <div class="cfg-module-row">
      <div style="display:flex;align-items:center;gap:.6rem;">
        <span style="color:${PRIO_COLORS[m.priority]};display:flex;">${moduleIcon(m.code, 18)}</span>
        <strong>${esc(m.name[CURRENT_LANG] || m.name.fr)}</strong>
        <span class="shell-badge badge-neutral">${esc(m.tdr)} · P${m.priority}</span>
      </div>
      <label class="cfg-toggle">
        <input type="checkbox" data-module-toggle="${esc(m.code)}" ${m.enabled ? 'checked' : ''}>
        <span class="track"></span>
      </label>
    </div>`
    )
    .join('');
  return `
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_modules'))}</h3></div>
    ${rows}
  </div>`;
}

function cfgSectionSysteme(cfg) {
  return `
  <div class="shell-card" style="margin-bottom:1rem;">
    <div class="portal-page-header"><h3>${esc(t('cfg_db'))}</h3></div>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">${esc(cfg.database.note)}</p>
    <div class="shell-form-row">
      <div class="shell-form-group"><label>Pilote actuel</label><input class="shell-input" value="${esc(cfg.database.driver)}" disabled></div>
      <div class="shell-form-group"><label>PostgreSQL cible</label><input class="shell-input" value="${esc(cfg.database.postgres.host)}:${cfg.database.postgres.port}/${esc(cfg.database.postgres.database)}" disabled></div>
    </div>
  </div>
  <div class="shell-card">
    <div class="portal-page-header"><h3>${esc(t('cfg_replication'))}</h3></div>
    <div class="cfg-module-row">
      <strong>${t('replication_activee')}</strong>
      <label class="cfg-toggle"><input type="checkbox" id="repEnabled" ${cfg.replication.enabled ? 'checked' : ''}><span class="track"></span></label>
    </div>
    <div class="shell-form-group" style="margin-top:.75rem;">
      <label>${t('url_serveur_central')}</label>
      <input class="shell-input" id="repUrl" value="${esc(cfg.replication.centralUrl)}">
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="shell-btn shell-btn-primary" onclick="saveSysteme()">${icon('save', 14)} ${esc(t('cfg_save'))}</button>
    </div>
  </div>`;
}

window.saveSysteme = async function () {
  const res = await api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replication: {
        enabled: document.getElementById('repEnabled').checked,
        centralUrl: document.getElementById('repUrl').value.trim(),
      },
    }),
  });
  if (res.ok) showToast(t('cfg_saved'), 'success');
  else showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
};

window.cfgNavigate = function (sub) {
  CFG_SUB = sub;
  portailReinitialiserRecherche();
  renderConfig();
};

window.toggleCfgSidebar = function () {
  CFG_COLLAPSED = !CFG_COLLAPSED;
  renderConfig();
};

function orgTopLevelType() {
  const levels = (REFS.organisation_levels || []).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  return levels.length ? levels[0].type : null;
}

// Le niveau d'ordre 1 (l'Administration) reprend sigle & libellé depuis « Détails sur l'Administration »
function normalizeOrgTopLevel(cfg) {
  const topType = orgTopLevelType();
  const aac = (cfg && cfg.aac) || {};
  if (!topType) return;
  (REFS.organisation || []).forEach((o) => {
    if (o.type === topType) {
      if (aac.sigle) o.sigle = aac.sigle;
      if (aac.nom) o.libelle = aac.nom;
    }
  });
}

async function renderConfig() {
  const [cfgRes, modulesRes] = await Promise.all([api('/api/config'), api('/api/modules')]);
  const cfg = await cfgRes.json();
  CURRENT_CFG = cfg;
  const modules = await modulesRes.json();
  if (!Object.keys(REFS).length) await loadRefs();
  if (CFG_SUB === 'instances' && jeSuisRegional()) await cfgChargerInstances();
  normalizeOrgTopLevel(cfg);

  let content = '';
  switch (CFG_SUB) {
    case 'organisation': content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation'); break;
    case 'organigramme': content = cfgSectionOrganigramme(); break;
    case 'domaines': content = cfgSectionDomaines(); break;
    case 'themes': CFG_SUB = 'domaines'; content = cfgSectionDomaines(); break;
    case 'exigences': content = cfgSectionExigences(); break;
    case 'prestataires': content = refTable('prestataires', true); break;
    case 'inspecteurs': content = cfgSectionPersonnel(); break;
    case 'autres': content = refTable('types_supervision', true) + refTable('modes_supervision') + refTable('niveaux_qualifications') + refTable('specialites_inspecteur'); break;
    case 'securite': content = cfgSectionSecurite(cfg); break;
    case 'modules': content = cfgSectionModules(modules); break;
    case 'systeme': content = cfgSectionSysteme(cfg); break;
    case 'instances': content = cfgSectionInstances(); break;
    default: content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation');
  }

  const sidebarItems = CFG_TABS.filter((tab) => !tab.regionalOnly || jeSuisRegional()).map((tab) => {
    if (tab.section) return `<div class="cfg-sidebar-section">${esc(t(tab.section))}</div>`;
    return `
    <button class="cfg-sidebar-item ${CFG_SUB === tab.id ? 'active' : ''}" onclick="cfgNavigate('${tab.id}')" title="${esc(t(tab.labelKey))}">
      <span class="cfg-sidebar-icon">${icon(tab.icon, 17)}</span>
      <span class="cfg-sidebar-label">${esc(t(tab.labelKey))}</span>
    </button>`;
  }).join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header"><h2>${esc(t('config_title'))}</h2></div>
    <div class="cfg-layout">
      <div class="cfg-sidebar ${CFG_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleCfgSidebar()" aria-label="${esc(t("sous_menu_basculer"))}" title="${esc(t("sous_menu_basculer"))}">${CFG_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${sidebarItems}
      </div>
      <div class="cfg-content">${content}</div>
    </div>
    <div id="cfgModalRoot"></div>`;

  document.querySelectorAll('[data-module-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const code = toggle.dataset.moduleToggle;
      const res = await api(`/api/modules/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: toggle.checked }),
      });
      if (res.ok) showToast(toggle.checked ? t('module_active', code) : t('module_desactive', code), 'success');
      else {
        toggle.checked = !toggle.checked;
        showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
      }
    });
  });
}
