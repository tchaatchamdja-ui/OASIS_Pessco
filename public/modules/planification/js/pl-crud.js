/* Module « Plans de Surveillance » — crud
   Formulaires : plans, activités, import et synchronisation des risques.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PARAMETRES (placeholder)
// ══════════════════════════════════════


// ══════════════════════════════════════
//  CRUD OPERATIONS
// ══════════════════════════════════════

function planShowCreateModal(subMenu = 'planifiees') {
    const domaines = PLAN_STATE.data.domaines || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    const currentYear = new Date().getFullYear();

    // Default type based on sub-menu
    let defaultType = 'periodique';
    if (subMenu === 'inopinees') defaultType = 'inopine';
    else if (subMenu === 'speciale') defaultType = 'ponctuel_special';

    const body = `
    <div class="form-grid">
        <div class="form-group full-width">
            <label>${tp('plan_title')}</label>
            <input type="text" class="form-input" id="planTitre" value="Plan de Surveillance ${currentYear}">
        </div>
        <div class="form-group">
            <label>${tp('year')}</label>
            <input type="number" class="form-input" id="planAnnee" value="${currentYear}">
        </div>
        <div class="form-group">
            <label>${tp('plan_type')}</label>
            <select class="form-select" id="planType">
                <option value="periodique" ${defaultType==='periodique'?'selected':''}>${tp('periodic')}</option>
                <option value="inopine" ${defaultType==='inopine'?'selected':''}>${tp('inopine')}</option>
                <option value="ponctuel_special" ${defaultType==='ponctuel_special'?'selected':''}>${tp('ponctuel_special')}</option>
            </select>
        </div>
        <div class="form-group">
            <label>${tp('domain')}</label>
            <select class="form-select" id="planDomaine">
                <option value="">${tp('all_domains')}</option>
                ${domaines.map(d => `<option value="${d.id}">${d.code} - ${_esc(d.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')}</label>
            <select class="form-select" id="planSecteur">
                <option value="">${tp('all_sectors')}</option>
                ${secteurs.map(s => `<option value="${s.id}">${s.code} - ${_esc(s.nom)}</option>`).join('')}
            </select>
        </div>
    </div>`;

    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planCreatePlan()">${tp('save')}</button>`;

    planShowModal(tp('new_plan'), body, footer);
}

// Volet des prestataires actifs du secteur, déplié par le chevron placé
// devant le titre du plan. Pour chaque prestataire : les thèmes de
// supervision du secteur, leur fréquence (issue du profil de risque,
// nombre de surveillances par cycle de la sous-activité) et le nombre de
// fois où le thème est déjà planifié dans ce plan.
// Réservé aux plans périodiques : les plans inopinés et ponctuels ne
// découlent pas des fréquences du cycle de surveillance.
function planPrestThemesPanel(plan) {
    if (!plan || plan.type !== 'periodique' || !plan.secteur_id) return '';
    const secteurId = plan.secteur_id;
    const D = PLAN_STATE.data;
    const actif = (o) => (o.statut ? o.statut === 'actif' : (o.actif !== false && o.actif !== 0));
    const prestataires = (D.prestataires || []).filter(p => p.secteur_id === secteurId && actif(p));
    const themes = (D.themesSupervision || []).filter(th => th.secteur_id === secteurId && actif(th));
    const sousActivites = D.sousActivites || [];
    const risques = D.prestataireRisques || [];

    if (!prestataires.length) {
        return `<div class="plan-prest-empty">${tp('no_active_provider_sector')}</div>`;
    }

    // Activités déjà planifiées dans ce plan
    const activites = (D.allActivites || []).filter(a => a.plan_id === plan.id);
    const themesDe = (a) => {
        const raw = a.themes_couverts;
        if (!raw) return [];
        try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
    };
    const planValide = ['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'].includes(plan.statut);
    const couleurPlanifie = planValide ? '#15803d' : '#ea580c';

    const cartes = prestataires.map(p => {
        const rq = risques.find(r => r.id === p.id) || {};
        const saRes = (rq.resultats && (rq.resultats.sousActivites || rq.resultats.sous_activites)) || {};
        const actsPrest = activites.filter(a => a.prestataire_id === p.id);
        const lignes = themes.map(th => {
            const sa = sousActivites.find(x => x.id === th.sous_activite_id);
            const freq = saRes[th.sous_activite_id]?.freq;
            const nbPlan = actsPrest.filter(a => themesDe(a).includes(th.id)).length;
            const saLbl = sa ? `${sa.code || ''} - ${sa.nom || ''}` : '';
            return `<tr>
                <td data-sort="${_esc(th.code || '')}"><strong>${_esc(th.code || '')}</strong></td>
                <td data-sort="${_esc(th.libelle || th.nom || '')}">${_esc(th.libelle || th.nom || '')}</td>
                <td data-sort="${_esc(saLbl)}">${saLbl ? _esc(saLbl) : '-'}</td>
                <td data-sort="${freq || 0}" style="text-align:center;white-space:nowrap;">${freq
                    ? `<strong>${freq}</strong>x / ${tp('cycle_unit')}`
                    : `<span class="text-muted">-</span>`}</td>
                <td data-sort="${nbPlan}" style="text-align:center;">
                    <strong style="color:${couleurPlanifie};">${nbPlan}</strong></td>
            </tr>`;
        }).join('');

        const th = (label, col, align) =>
            `<th style="cursor:pointer;user-select:none;white-space:nowrap;${align ? `text-align:${align};` : ''}"
                 onclick="planSortThemeTable(this,${col})" title="${tp('sort')}">${label}<span class="sort-ind"></span></th>`;

        return `<details class="plan-prest-item">
            <summary class="plan-prest-summary">
                <strong>${_esc(p.nom || '')}</strong>
                ${p.trigramme ? `<span class="text-muted">(${_esc(p.trigramme)})</span>` : ''}
                <span style="margin-left:auto;display:inline-flex;align-items:center;gap:0.4rem;">
                    ${rq.risk_label ? _riskBadge(rq.risk_label) : `<span class="text-muted" style="font-size:0.75rem;">${tp('no_risk_profile_data')}</span>`}
                    ${rq.csrbo ? `<span class="text-muted" style="font-size:0.75rem;">CSRBO ${rq.csrbo} ${tp('months_unit')}</span>` : ''}
                    <span class="text-muted" style="font-size:0.75rem;">${themes.length} ${tp('themes_count')}</span>
                    ${_canContribute() ? `<button class="btn btn-primary btn-sm"
                        onclick="event.stopPropagation();event.preventDefault();planOpenDetailForPrestataire('${plan.id}','${p.id}')"
                        title="${tp('plan_activity_for_provider')}">${PLAN_ICONS.add} ${tp('plan_activity')}</button>` : ''}
                </span>
            </summary>
            ${themes.length ? `<table class="data-table plan-theme-table" style="margin:0;width:100%;background:var(--bg);">
                <thead><tr>
                    ${th(tp('code_label'), 0)}
                    ${th(tp('theme_label'), 1)}
                    ${th(tp('sub_activity'), 2)}
                    ${th(tp('frequency'), 3, 'center')}
                    ${th(tp('planned'), 4, 'center')}
                </tr></thead>
                <tbody>${lignes}</tbody>
            </table>` : `<p class="text-muted" style="padding:0.5rem 0.75rem;font-size:0.82rem;font-style:italic;">${tp('no_theme_sector')}</p>`}
        </details>`;
    }).join('');

    return `<div class="plan-prest-body">${cartes}</div>`;
}

// Tri d'une table de thèmes, sur place : le volet reste ouvert.
function planSortThemeTable(thEl, col) {
    const table = thEl.closest('table');
    const tbody = table && table.tBodies[0];
    if (!tbody) return;
    const dir = thEl.dataset.dir === 'asc' ? 'desc' : 'asc';
    table.querySelectorAll('th').forEach(h => {
        h.dataset.dir = '';
        const ind = h.querySelector('.sort-ind');
        if (ind) ind.textContent = '';
    });
    thEl.dataset.dir = dir;
    const ind = thEl.querySelector('.sort-ind');
    if (ind) ind.textContent = dir === 'asc' ? ' ▲' : ' ▼';

    const val = (tr) => {
        const c = tr.cells[col];
        return c ? (c.dataset.sort !== undefined ? c.dataset.sort : c.textContent.trim()) : '';
    };
    const rows = [...tbody.rows].sort((a, b) => {
        const va = val(a), vb = val(b);
        const na = parseFloat(va), nb = parseFloat(vb);
        const cmp = (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '')
            ? na - nb : String(va).localeCompare(String(vb));
        return dir === 'asc' ? cmp : -cmp;
    });
    rows.forEach(r => tbody.appendChild(r));
}

// Déplie / replie le volet d'un plan depuis le chevron du titre.
function planTogglePrestRow(planId, btn) {
    const row = document.getElementById(`prestRow_${planId}`);
    if (!row) return;
    const ouvert = row.hasAttribute('hidden');
    if (ouvert) row.removeAttribute('hidden'); else row.setAttribute('hidden', '');
    if (btn) btn.classList.toggle('expanded', ouvert);
}

// Ouvre le plan avec le prestataire mémorisé : ses données pré-renseignent
// le formulaire de création d'activité.
function planOpenDetailForPrestataire(planId, prestId) {
    PLAN_STATE.prefillPrestataire = prestId;
    PLAN_STATE._keepPrefill = true;
    planOpenDetail(planId);
}

async function planCreatePlan() {
    const data = {
        titre: document.getElementById('planTitre')?.value || '',
        annee: parseInt(document.getElementById('planAnnee')?.value) || new Date().getFullYear(),
        type: document.getElementById('planType')?.value || 'periodique',
        domaine_id: document.getElementById('planDomaine')?.value || '',
        secteur_id: document.getElementById('planSecteur')?.value || ''
    };
    try {
        await api(`${PLAN_MODULE_API}/plans`, { method: 'POST', body: JSON.stringify(data) });
        planCloseModal();
        await planLoadData();
        planNavigateTo('plans');
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

function planShowEditModal(planId) {
    const plan = (PLAN_STATE.data.plans || []).find(p => p.id === planId);
    if (!plan) return;
    const domaines = PLAN_STATE.data.domaines || [];
    const secteurs = PLAN_STATE.data.secteurs || [];

    const body = `
    <div class="form-grid">
        <div class="form-group full-width">
            <label>${tp('plan_title')}</label>
            <input type="text" class="form-input" id="editPlanTitre" value="${_esc(plan.titre)}">
        </div>
        <div class="form-group">
            <label>${tp('year')}</label>
            <input type="number" class="form-input" id="editPlanAnnee" value="${plan.annee}">
        </div>
        <div class="form-group">
            <label>${tp('plan_type')}</label>
            <select class="form-select" id="editPlanType">
                <option value="periodique" ${plan.type === 'periodique' || plan.type === 'annuel' ? 'selected' : ''}>${tp('periodic')}</option>
                <option value="inopine" ${plan.type === 'inopine' ? 'selected' : ''}>${tp('inopine')}</option>
                <option value="ponctuel_special" ${plan.type === 'ponctuel_special' ? 'selected' : ''}>${tp('ponctuel_special')}</option>
            </select>
        </div>
        <div class="form-group">
            <label>${tp('domain')}</label>
            <select class="form-select" id="editPlanDomaine">
                <option value="">${tp('all_domains')}</option>
                ${domaines.map(d => `<option value="${d.id}" ${plan.domaine_id === d.id ? 'selected' : ''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('sector')}</label>
            <select class="form-select" id="editPlanSecteur">
                <option value="">${tp('all_sectors')}</option>
                ${secteurs.map(s => `<option value="${s.id}" ${plan.secteur_id === s.id ? 'selected' : ''}>${s.code} - ${_esc(s.nom)}</option>`).join('')}
            </select>
        </div>
    </div>`;

    const footer = `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="planUpdatePlan('${planId}')">${tp('save')}</button>`;

    planShowModal(tp('edit') + ' - ' + _esc(plan.titre), body, footer);
}

async function planUpdatePlan(planId) {
    const data = {
        titre: document.getElementById('editPlanTitre')?.value || '',
        annee: parseInt(document.getElementById('editPlanAnnee')?.value) || new Date().getFullYear(),
        type: document.getElementById('editPlanType')?.value || 'periodique',
        domaine_id: document.getElementById('editPlanDomaine')?.value || '',
        secteur_id: document.getElementById('editPlanSecteur')?.value || ''
    };
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}`, { method: 'PUT', body: JSON.stringify(data) });
        planCloseModal();
        await planLoadData();
        if (PLAN_STATE.selectedPlan?.id === planId) {
            await planOpenDetail(planId);
        } else {
            planRenderPage();
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planDeletePlan(planId) {
    if (!await oasisConfirmer(tp('confirm_delete'))) return;
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}`, { method: 'DELETE' });
        await planLoadData();
        planNavigateTo('plans');
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planArchivePlan(planId) {
    if (!await oasisConfirmer(tp('confirm_archive'))) return;
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/archiver`, { method: 'POST' });
        await planLoadData();
        planRenderPage();
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// ── Activities CRUD ──

// Durée d'une activité, en jours pleins, bornes comprises : du 9 au 13 mars,
// cinq jours. Une seule date, ou des dates qui se croisent, ne donnent rien.
function _planDureeEntre(debut, fin) {
    const d = String(debut || '').substring(0, 10);
    const f = String(fin || '').substring(0, 10);
    if (!d || !f) return '';
    const t1 = new Date(`${d}T00:00:00`).getTime();
    const t2 = new Date(`${f}T00:00:00`).getTime();
    if (Number.isNaN(t1) || Number.isNaN(t2) || t2 < t1) return '';
    return Math.round((t2 - t1) / 86400000) + 1;
}

// Date de fin déduite d'une durée : le premier jour compte, la fin tombe donc
// à début + (durée − 1).
function _planFinDepuisDuree(debut, jours) {
    const d = String(debut || '').substring(0, 10);
    const n = Number(jours);
    if (!d || !Number.isFinite(n) || n < 1) return '';
    const t = new Date(`${d}T00:00:00`);
    if (Number.isNaN(t.getTime())) return '';
    t.setDate(t.getDate() + Math.round(n) - 1);
    return oasisJour(t);
}

// Dates et durée disent la même chose de deux façons : renseigner l'une
// remplit l'autre. La dernière saisie commande — on ne réécrit jamais le champ
// que l'agent est en train de remplir.
function _planLierDatesDuree() {
    const debut = document.getElementById('actDebut');
    const fin = document.getElementById('actFin');
    const duree = document.getElementById('actDuree');
    if (!debut || !fin || !duree) return;
    const depuisDates = () => { duree.value = _planDureeEntre(debut.value, fin.value); };
    debut.addEventListener('change', () => {
        // Début posé alors qu'une durée est déjà saisie : c'est la fin qui suit.
        if (duree.value && !fin.value) fin.value = _planFinDepuisDuree(debut.value, duree.value);
        else depuisDates();
    });
    fin.addEventListener('change', depuisDates);
    duree.addEventListener('input', () => {
        const f = _planFinDepuisDuree(debut.value, duree.value);
        if (f) fin.value = f;
    });
}

// `options.lecture` ouvre la même fiche, mais fermée à la saisie : c'est le
// formulaire qui fait foi, on ne le redessine pas ailleurs pour le lire.
function planShowActivityModal(planId, actId = '', options = {}) {
    const lecture = !!options.lecture;
    const prestataires = PLAN_STATE.data.prestataires || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    const sousActivites = PLAN_STATE.data.sousActivites || [];
    const typesSupervision = PLAN_STATE.data.typesSupervision || [];
    const modesSupervision = PLAN_STATE.data.modesSupervision || [];
    const inspecteurs = PLAN_STATE.data.inspecteurs || [];
    const themes = PLAN_STATE.data.themesSupervision || [];

    let act = null;
    if (actId && PLAN_STATE.selectedPlan?.activites) {
        act = PLAN_STATE.selectedPlan.activites.find(a => a.id === actId);
    }
    // Ouverte depuis « Mes activités », la fiche n'a pas de plan sélectionné :
    // l'activité se retrouve dans la liste complète.
    if (actId && !act) {
        act = (PLAN_STATE.data.allActivites || []).find(a => a.id === actId) || null;
    }

    // Plan ouvert depuis le bandeau d'un prestataire : ses données
    // pré-renseignent la nouvelle activité (prestataire + secteur).
    const prefill = (!act && PLAN_STATE.prefillPrestataire)
        ? prestataires.find(p => p.id === PLAN_STATE.prefillPrestataire) : null;
    const prestSel = act?.prestataire_id || prefill?.id || '';
    const secteurSel = act?.secteur_id || prefill?.secteur_id
        || (!act ? (PLAN_STATE.selectedPlan?.secteur_id || '') : '');

    // Parse themes_couverts
    let selectedThemes = [];
    if (act?.themes_couverts) {
        try {
            selectedThemes = typeof act.themes_couverts === 'string' ? JSON.parse(act.themes_couverts) : act.themes_couverts;
        } catch { selectedThemes = []; }
    }

    // Parse sous_activites (multi-select)
    let selectedSA = [];
    if (act?.sous_activite_ids) {
        try {
            selectedSA = typeof act.sous_activite_ids === 'string' ? JSON.parse(act.sous_activite_ids) : act.sous_activite_ids;
        } catch { selectedSA = []; }
    } else if (act?.sous_activite_id) {
        selectedSA = [act.sous_activite_id];
    }

    // Read-only for Priorité/Risque/Fréquence/Intensité/Cycle unless Validateur or Admin

    const body = `
    <div class="form-grid plan-act-form">
        <div class="plan-form-section">${tp('sect_activite')}</div>
        <div class="form-group full-width">
            <label>${tp('objet')}</label>
            <input type="text" class="form-input" id="actObjet" value="${act ? _esc(act.objet || '') : ''}">
        </div>
        <div class="form-group full-width">
            <label>${tp('description_activite')}</label>
            <textarea class="form-input" id="actDescription" rows="2">${act ? _esc(act.description_activite || '') : ''}</textarea>
        </div>

        <div class="plan-form-section">${tp('sect_perimetre')}</div>
        <div class="form-group span-3">
            <label>${tp('provider')}</label>
            <select class="form-select" id="actPrestataire">
                <option value="">${tp('select_option')}</option>
                ${prestataires.map(p => `<option value="${p.id}" ${prestSel === p.id ? 'selected' : ''}>${_esc(p.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group span-3">
            <label>${tp('sector')}</label>
            <select class="form-select" id="actSecteur">
                <option value="">${tp('select_option')}</option>
                ${secteurs.map(s => `<option value="${s.id}" ${secteurSel === s.id ? 'selected' : ''}>${s.code} - ${_esc(s.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group full-width">
            <label>${tp('sub_activity')} / ${tp('themes_couverts')}</label>
            <div id="actSAThemesTableWrap" class="act-sa-wrap"></div>
            <small class="form-hint" id="actSAHint">${tp('select_sector_first')}</small>
            <div id="actSousActiviteGroup" style="display:none;"></div>
            <div id="actThemesGroup" style="display:none;"></div>
            <small class="form-hint" id="actThemeHint" style="display:none;"></small>
        </div>

        <div class="plan-form-section">${tp('sect_conduite')}</div>
        <div class="plan-row-conduite">
        <div class="form-group">
            <label>${tp('mode_supervision')}</label>
            <select class="form-select" id="actModeSupervision">
                <option value="">${tp('select_option')}</option>
                ${modesSupervision.map(m => `<option value="${m.id}" ${act?.mode_supervision_id === m.id ? 'selected' : ''}>${_esc(m.mode || m.libelle || m.nom || m.code || '')}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('type_supervision')}</label>
            <select class="form-select" id="actTypeSupervision">
                <option value="">${tp('select_option')}</option>
                ${typesSupervision.map(t => `<option value="${t.id}" ${act?.type_supervision_id === t.id ? 'selected' : ''}>${_esc(t.type_supervision || t.libelle || t.nom || t.code || '')}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('lieu_activite')}</label>
            <input type="text" class="form-input" id="actLieu" value="${act ? _esc(act.lieu_activite || '') : ''}">
        </div>
        <div class="form-group span-3">
            <label>${tp('responsable_activite')}</label>
            <select class="form-select" id="actResponsable">
                <option value="">${tp('select_option')}</option>
                ${inspecteurs.map(i => { const label = ((i.nom || '') + ' ' + (i.prenom || '')).trim() || i.nom_complet || i.email || ''; return `<option value="${i.id}" ${act?.responsable_id === i.id ? 'selected' : ''}>${_esc(label)}</option>`; }).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('nombre_inspecteurs')}</label>
            <input type="number" class="form-input" id="actNbInspecteurs" value="${act?.nombre_inspecteurs || 1}" min="1">
        </div>
        </div>

        <div class="plan-form-section">${tp('sect_calendrier')}</div>
        <div class="form-group">
            <label>${tp('start_date')}</label>
            <input type="date" class="form-input" id="actDebut" value="${act?.date_debut?.substring(0, 10) || ''}">
        </div>
        <div class="form-group">
            <label>${tp('end_date')}</label>
            <input type="date" class="form-input" id="actFin" value="${act?.date_fin?.substring(0, 10) || ''}">
        </div>
        <div class="form-group">
            <label>${tp('duree_jours')}</label>
            <input type="number" class="form-input" id="actDuree" min="1" value="${_planDureeEntre(act?.date_debut, act?.date_fin)}">
        </div>
    </div>`;

    const footer = lecture
        ? `<button class="btn btn-ghost" onclick="planCloseModal()">${tp('close')}</button>`
        : `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="${actId ? `planUpdateActivity('${actId}')` : `planCreateActivity('${planId}')`}">${tp('save')}</button>`;

    const titre = lecture ? tp('activity_detail') : (actId ? tp('edit') : tp('new_activity'));
    planShowModal(titre, body, footer, 'modal-drawer modal-drawer-3-4');

    // Règles communes des dates : une activité commence dans l'année de son
    // plan — elle n'a pas de champ Année, c'est le plan qui la déclare — et
    // ne se termine pas avant d'avoir commencé.
    oasisDatesLier(_planDatesActivite());
    _planLierDatesDuree();

    // ── Dynamic: SA/Themes table (columns = sous-activités) ──
    const secteurSelect = document.getElementById('actSecteur');
    const _renderSAThemesTable = () => {
        const selSecteur = secteurSelect?.value || '';
        const wrap = document.getElementById('actSAThemesTableWrap');
        const hint = document.getElementById('actSAHint');
        if (!wrap) return;
        const filteredSA = selSecteur ? sousActivites.filter(sa => sa.secteur_id === selSecteur) : [];
        if (!selSecteur) {
            wrap.innerHTML = '';
            wrap.style.display = 'none';
            if (hint) hint.style.display = '';
            return;
        }
        if (hint) hint.style.display = 'none';
        wrap.style.display = '';
        if (!filteredSA.length) {
            wrap.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);">${tp('no_data')}</div>`;
            return;
        }
        // Une ligne par sous-activité ; ses thèmes sont dans un volet
        // dépliable. Ouvrir le volet coche la sous-activité et ses thèmes.
        wrap.innerHTML = filteredSA.map(sa => {
            const saThemes = themes.filter(t => {
                if (t.sous_activite_id === sa.id) return true;
                if (!t.sous_activite_id && t.secteur_id && t.secteur_id === selSecteur) return true;
                if (!t.sous_activite_id && !t.secteur_id) return true;
                return false;
            });
            const saChecked = selectedSA.includes(sa.id);
            const nbCoches = saThemes.filter(t => selectedThemes.includes(t.id)).length;
            return `<details class="sa-item" data-sa-id="${sa.id}" ${saChecked ? 'open' : ''}>
                <summary class="sa-summary">
                    <span class="sa-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></span>
                    <label class="checkbox-item" onclick="event.stopPropagation();">
                        <input type="checkbox" class="actSACheck" data-sa-id="${sa.id}" value="${sa.id}" ${saChecked ? 'checked' : ''}>
                        <span><strong>${sa.code}</strong> - ${_esc(sa.nom)}</span>
                    </label>
                    <span class="sa-count text-muted">${nbCoches}/${saThemes.length} ${tp('themes_count')}</span>
                </summary>
                <div class="sa-themes" data-sa-col="${sa.id}">
                    ${saThemes.length ? saThemes.map(t => `<label class="checkbox-item sa-theme">
                        <input type="checkbox" class="actThemeCheck" data-sa-id="${sa.id}" value="${t.id}" ${selectedThemes.includes(t.id) ? 'checked' : ''}>
                        <span>${_esc(t.libelle || t.nom || '')}</span>
                    </label>`).join('') : `<span class="text-muted" style="font-size:0.82rem;">${tp('no_theme_sector')}</span>`}
                </div>
            </details>`;
        }).join('');

        const majCompteur = (saId) => {
            const det = wrap.querySelector(`details[data-sa-id="${saId}"]`);
            if (!det) return;
            const boxes = [...det.querySelectorAll('.actThemeCheck')];
            const c = det.querySelector('.sa-count');
            if (c) c.textContent = `${boxes.filter(b => b.checked).length}/${boxes.length} ${tp('themes_count')}`;
        };

        // Ouvrir un volet coche la sous-activité et tous ses thèmes ;
        // le refermer les décoche.
        wrap.querySelectorAll('details.sa-item').forEach(det => {
            const saId = det.getAttribute('data-sa-id');
            const saBox = det.querySelector('.actSACheck');
            det.addEventListener('toggle', () => {
                if (saBox) saBox.checked = det.open;
                det.querySelectorAll('.actThemeCheck').forEach(tc => { tc.checked = det.open; });
                majCompteur(saId);
            });
            if (saBox) {
                saBox.addEventListener('change', () => {
                    det.open = saBox.checked;
                    det.querySelectorAll('.actThemeCheck').forEach(tc => { tc.checked = saBox.checked; });
                    majCompteur(saId);
                });
            }
            det.querySelectorAll('.actThemeCheck').forEach(tc => {
                tc.addEventListener('change', () => {
                    const boxes = [...det.querySelectorAll('.actThemeCheck')];
                    if (saBox) saBox.checked = boxes.some(b => b.checked);
                    majCompteur(saId);
                });
            });
        });
    };

    // Attach secteur change handler
    if (secteurSelect) {
        secteurSelect.addEventListener('change', _renderSAThemesTable);
    }

    // Initial population (if editing or secteur pre-selected)
    _renderSAThemesTable();

    // Lecture seule : la fiche est dessinée entière, puis fermée à la saisie.
    // Fermer après le dessin de la table des sous-activités, sinon ses cases
    // renaîtraient actives.
    if (lecture) {
        const volet = document.getElementById('planModal');
        if (volet) {
            volet.querySelectorAll('input, select, textarea').forEach((el) => { el.disabled = true; });
            volet.querySelectorAll('.sa-item, .sa-theme-list').forEach((el) => { el.style.pointerEvents = 'none'; });
        }
    }
}

async function planCreateActivity(planId) {
    if (!oasisDatesValider(_planDatesActivite())) return;
    const data = _collectActivityForm();
    try {
        await api(`${PLAN_MODULE_API}/plans/${planId}/activites`, { method: 'POST', body: JSON.stringify(data) });
        planCloseModal();
        // Rafraîchit le cache global (compteurs « Planifiée » du volet)
        PLAN_STATE.data.allActivites = await api(`${PLAN_MODULE_API}/all-activites`).catch(() => PLAN_STATE.data.allActivites);
        PLAN_STATE._keepPrefill = true;
        await planOpenDetail(planId);
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planUpdateActivity(actId) {
    if (!oasisDatesValider(_planDatesActivite())) return;
    const data = _collectActivityForm();
    try {
        await api(`${PLAN_MODULE_API}/activites/${actId}`, { method: 'PUT', body: JSON.stringify(data) });
        planCloseModal();
        if (PLAN_STATE.selectedPlan) {
            await planOpenDetail(PLAN_STATE.selectedPlan.id);
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planDeleteActivity(actId) {
    if (!await oasisConfirmer(tp('confirm_delete'))) return;
    try {
        await api(`${PLAN_MODULE_API}/activites/${actId}`, { method: 'DELETE' });
        if (PLAN_STATE.selectedPlan) {
            await planOpenDetail(PLAN_STATE.selectedPlan.id);
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

// L'année déclarée d'une activité est celle de son plan.
function _planDatesActivite() {
    return {
        annee: (PLAN_STATE.selectedPlan || {}).annee || '',
        debut: 'actDebut', fin: 'actFin',
    };
}

function _collectActivityForm() {
    // Collect checkbox themes
    const themes = [...document.querySelectorAll('.actThemeCheck:checked')].map(c => c.value);

    // Collect checkbox sous-activités
    const sousActiviteIds = [...document.querySelectorAll('.actSACheck:checked')].map(c => c.value);

    const data = {
        objet: document.getElementById('actObjet')?.value || '',
        description_activite: document.getElementById('actDescription')?.value || '',
        titre: document.getElementById('actObjet')?.value || '',
        prestataire_id: document.getElementById('actPrestataire')?.value || '',
        secteur_id: document.getElementById('actSecteur')?.value || '',
        sous_activite_id: sousActiviteIds[0] || '',
        sous_activite_ids: sousActiviteIds,
        type_supervision_id: document.getElementById('actTypeSupervision')?.value || '',
        mode_supervision_id: document.getElementById('actModeSupervision')?.value || '',
        lieu_activite: document.getElementById('actLieu')?.value || '',
        date_debut: document.getElementById('actDebut')?.value || '',
        date_fin: document.getElementById('actFin')?.value || '',
        responsable_id: document.getElementById('actResponsable')?.value || '',
        nombre_inspecteurs: parseInt(document.getElementById('actNbInspecteurs')?.value) || 1,
        themes_couverts: themes
    };

    return data;
}

// ══════════════════════════════════════
//  IMPORT / SYNC RISK PROFILES
// ══════════════════════════════════════


// Ephemeral toast for planification module (5-second default)
function planShowEphemeralToast(message, type = 'info', duration = 5000) {
    if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
    return window.oasisToast(message, type, duration);
}


async function planSyncRisksSelective(planId) {
    try {
        const result = await api(`${PLAN_MODULE_API}/plans/${planId}/sync-risques`);
        if (!result.has_changes) {
            planShowEphemeralToast(tp('sync_no_changes'), 'info', 4000);
            return;
        }

        const changes = result.changes || [];
        const prestataires = PLAN_STATE.data.prestataires || [];
        const prestMap = {};
        prestataires.forEach(p => prestMap[p.id] = p.nom);

        // Check which prestataires already have activities in this plan
        const plan = PLAN_STATE.selectedPlan;
        const existingPrestIds = new Set((plan?.activites || []).map(a => a.prestataire_id));

        const rows = changes.map((c, idx) => {
            const prestNom = _esc(prestMap[c.prestataire_id] || c.prestataire_id);
            const isNew = c.type === 'nouveau';
            const alreadyImported = existingPrestIds.has(c.prestataire_id);

            let changeDetail = '';
            if (isNew) {
                changeDetail = `<span class="status-badge" style="background:#10b98120;color:#10b981;border:1px solid #10b98140;">${tp('sync_type_nouveau')}</span>`;
                if (c.current) changeDetail += ` <small>${tp('sync_risk_change')}: ${_esc(c.current.risk_label || '-')}, ${tp('sync_cycle_change')}: ${c.current.csrbo || '-'}</small>`;
            } else {
                changeDetail = `<span class="status-badge" style="background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b40;">${tp('sync_type_modifie')}</span>`;
                if (c.avant && c.apres) {
                    const parts = [];
                    if (c.avant.risk_label !== c.apres.risk_label) parts.push(`${tp('sync_risk_change')}: ${_esc(c.avant.risk_label)} → ${_esc(c.apres.risk_label)}`);
                    if (c.avant.csrbo !== c.apres.csrbo) parts.push(`${tp('sync_cycle_change')}: ${c.avant.csrbo} → ${c.apres.csrbo}`);
                    changeDetail += ` <small>${parts.join(', ')}</small>`;
                }
            }

            const disabledAttr = (alreadyImported && isNew) ? 'disabled' : '';
            const checkedAttr = (alreadyImported && isNew) ? '' : 'checked';
            const rowOpacity = (alreadyImported && isNew) ? 'opacity:0.5;' : '';

            return `<tr style="${rowOpacity}">
                <td><input type="checkbox" class="sync-check" data-pid="${c.prestataire_id}" ${checkedAttr} ${disabledAttr}></td>
                <td><strong>${prestNom}</strong></td>
                <td>${changeDetail}</td>
                <td>${(alreadyImported && isNew) ? `<span style="color:var(--text-muted);font-size:0.75rem;">${tp('sync_already_imported')}</span>` : ''}</td>
            </tr>`;
        }).join('');

        const isValidated = plan?.statut === 'valide';
        const amendWarning = isValidated ? `
            <div style="background:#f59e0b15;border:1px solid #f59e0b40;border-radius:8px;padding:0.6rem 0.8rem;margin-bottom:0.75rem;font-size:0.82rem;color:#92400e;">
                <strong>⚠ ${tp('amendment_in_progress')}</strong> — Ce plan est validé. L'application des changements créera automatiquement une version brouillon (amendement) du plan.
            </div>` : '';

        const body = `
            ${amendWarning}
            <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem;">
                <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;cursor:pointer;">
                    <input type="checkbox" id="syncSelectAll" checked onchange="document.querySelectorAll('.sync-check:not([disabled])').forEach(cb=>cb.checked=this.checked);">
                    ${tp('sync_select_all')}
                </label>
                <span style="color:var(--text-muted);font-size:0.8rem;">${tp('sync_changes', changes.length)}</span>
            </div>
            <div style="max-height:400px;overflow-y:auto;">
                <table class="data-table" style="font-size:0.82rem;">
                    <thead><tr><th style="width:30px;"></th><th>${tp('provider')}</th><th>${tp('status')}</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

        const footer = `
            <button class="btn btn-primary" onclick="planApplySyncSelection('${planId}')">${tp('sync_apply_selected')}</button>
            <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>`;

        planShowModal(tp('sync_select_changes'), body, footer, 'modal-lg');

    } catch (e) {
        oasisToast(e.message, 'error');
    }
}

async function planApplySyncSelection(planId) {
    const checks = document.querySelectorAll('.sync-check:checked:not([disabled])');
    const pids = [...checks].map(cb => cb.dataset.pid);
    if (!pids.length) {
        planShowEphemeralToast(tp('select_at_least_one'), 'warning', 3000);
        return;
    }
    try {
        const result = await api(`${PLAN_MODULE_API}/plans/${planId}/apply-sync`, {
            method: 'POST',
            body: JSON.stringify({ prestataire_ids: pids })
        });
        planCloseModal();
        await planLoadData();

        if (result.amended && result.target_plan_id) {
            // Plan was auto-amended — navigate to the new brouillon amendment
            const newPlan = (PLAN_STATE.data.plans || []).find(p => p.id === result.target_plan_id);
            const version = newPlan ? newPlan.version : '?';
            planShowEphemeralToast(tp('sync_auto_amended', version), 'success', 7000);
            await planOpenDetail(result.target_plan_id);
        } else {
            planShowEphemeralToast(tp('sync_applied', result.activities_created, result.skipped), 'success', 5000);
            await planOpenDetail(planId);
        }
    } catch (e) {
        oasisToast(e.message, 'error');
    }
}
