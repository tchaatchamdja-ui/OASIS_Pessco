/* OASIS — Exécution de la Surveillance
 * Suite de exec-activites.js : les checklists du dossier : choix, saisie, export et import.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ── Checklists attachées au dossier (étape Réalisation) ──

// Persiste la liste des checklists du dossier puis re-rend l'étape.
async function _execSetDossierChecklists(dossierId, ids, returnTab) {
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ realisation_checklists: JSON.stringify(ids) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.realisation_checklists = JSON.stringify(ids);
        }
        await execRefreshDynamic();
        execOpenDossierSlider(dossierId, returnTab || 'realisation');
    } catch (e) { _execToast(te('err_selection'), 'error'); }
}

// Ouvre une modale listant les checklists applicables au secteur de l'activité.
function execOpenChecklistsPicker(dossierId, returnTab) {
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    // Déduit le secteur de l'activité via le prestataire (fallback : tous)
    const prest = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id);
    const secteurId = prest?.secteur_id || dossier.secteur_id || '';
    const allChecklists = EXEC_STATE.data.checklists || [];
    const filtered = secteurId
        ? allChecklists.filter(c => {
            const secs = _parse(c.secteurs_ids);
            // Inclut si la checklist cible explicitement ce secteur, ou si elle n'a aucune restriction de secteur
            return secs.length === 0 || secs.includes(secteurId);
        })
        : allChecklists;
    const current = new Set(_parse(dossier.realisation_checklists));
    const _esc2 = oasisEsc;

    const list = filtered.length
        ? filtered.map(c => `<label class="exec-chk-pick-row">
            <input type="checkbox" class="picker-chk-cb" value="${c.id}" ${current.has(c.id)?'checked':''}>
            <span class="pick-row-text">
                <strong>${c.reference ? _esc2(c.reference) + ' — ' : ''}${_esc2(c.nom)}</strong>
                ${c.description ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.1rem;">${_esc2(c.description.slice(0, 120))}${c.description.length>120?'…':''}</div>` : ''}
            </span>
        </label>`).join('')
        : `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-style:italic;">${te(secteurId ? 'aucune_checklist_secteur' : 'aucune_checklist_applicable')}</div>`;

    const hint = secteurId
        ? `Checklists filtrées par le secteur de l'activité (${filtered.length} disponible${filtered.length>1?'s':''}).`
        : te('aucun_secteur_identifie');

    shellShowModal('Sélectionner les checklists à utiliser', `
        <style>
            #execChkPickerList { text-align:left !important; display:block !important; }
            #execChkPickerList label.exec-chk-pick-row {
                display:block !important;
                padding:0.5rem 0.7rem !important;
                border-bottom:1px solid var(--border) !important;
                font-size:0.83rem !important;
                cursor:pointer !important;
                width:auto !important;
                margin:0 !important;
                text-align:left !important;
                box-sizing:border-box !important;
                white-space:normal !important;
            }
            #execChkPickerList label.exec-chk-pick-row:hover { background:rgba(59,130,246,0.04); }
            #execChkPickerList label.exec-chk-pick-row input[type="checkbox"] {
                margin:0 0.55rem 0 0 !important;
                vertical-align:top !important;
                width:auto !important;
                display:inline-block !important;
            }
            #execChkPickerList label.exec-chk-pick-row .pick-row-text {
                display:inline-block !important;
                vertical-align:top !important;
                width:calc(100% - 28px) !important;
                text-align:left !important;
            }
            #execChkPickerList label.exec-chk-pick-row strong { display:block !important; text-align:left !important; }
            #execChkPickerList label.exec-chk-pick-row .pick-row-text > div { text-align:left !important; }
        </style>
        <div style="text-align:left;">
            <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.5rem;text-align:left;">${hint}</p>
            <div id="execChkPickerList" style="max-height:50vh;overflow:auto;border:1px solid var(--border);border-radius:6px;">${list}</div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveChecklistsPicker('${dossierId}','${returnTab || ''}')">${te('valider_selection')}</button>
    `);
}

async function execSaveChecklistsPicker(dossierId, returnTab) {
    const ids = Array.from(document.querySelectorAll('.picker-chk-cb'))
        .filter(c => c.checked).map(c => c.value);
    shellCloseModal();
    await _execSetDossierChecklists(dossierId, ids, returnTab || undefined);
}

// Retire une checklist de la sélection du dossier (depuis la section déployée).
async function execRemoveDossierChecklist(dossierId, checklistId) {
    if (!await oasisConfirmer(te('confirmer_retirer_checklist'))) return;
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const ids = _parse(dossier.realisation_checklists).filter(id => id !== checklistId);
    await _execSetDossierChecklists(dossierId, ids);
}

// Ouvre un slicer plein écran pour renseigner les items d'une checklist du dossier.
async function execOpenChecklistFiller(dossierId, checklistId) {
    // Recharge si nécessaire (le cache peut être vide juste après création)
    if (!(EXEC_STATE.data.checklists || []).length) {
        // L'échec se dit plus bas : sans la checklist, la ligne suivante ne la
        // trouve pas et l'écran l'annonce. Rien à ajouter ici.
        try { await execRefreshChecklists(); } catch (e) { /* rattrapé ci-dessous */ }
    }
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) {
        _execToast(te('checklist_introuvable_id', checklistId), 'error');
        console.error('Checklist not found', checklistId, EXEC_STATE.data.checklists);
        return;
    }
    // Auto-rétracte la barre de menu du portail (mémorise l'état pour le restaurer à la fermeture)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const wasCollapsed = wrapper ? wrapper.classList.contains('sidebar-collapsed') : false;
        window._execChkFillerPrevCollapsed = wasCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = true;
        if (wrapper) wrapper.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('collapsed');
    } catch (e) {}
    const items = (EXEC_STATE.data.checklistItems || [])
        .filter(i => i.checklist_id === checklistId)
        .slice()
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = (EXEC_STATE.data.checklistStatuts || []).slice()
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    // Charge les réponses déjà saisies pour ce couple (dossier, checklist)
    let responses = [];
    try {
        const all = await api('/api/exec-checklist-responses');
        responses = (all || []).filter(r => r.dossier_id === dossierId && r.checklist_id === checklistId);
    } catch (e) { responses = []; }
    const respByItem = {};
    responses.forEach(r => { respByItem[r.item_id] = r; });
    // Sous-thèmes pour libellés
    const sousThemes = (EXEC_STATE.data.checklistSousThemes || []).filter(s => s.checklist_id === checklistId);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themeLbl = id => allThemes.find(t => t.id === id)?.libelle || '-';
    const sousThLbl = id => sousThemes.find(s => s.id === id)?.libelle || '-';
    const _esc2 = oasisEsc;

    document.getElementById('execChkFillerWrap')?.remove();

    // Couleur associée à un statut (vide => non évalué => gris clair)
    const statutColor = id => {
        const s = statuts.find(x => x.id === id);
        return s && s.couleur ? s.couleur : '';
    };
    // Statut par défaut = celui dont le libellé est « Non Évalué » (depuis la liste configurée)
    const _normL = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const defaultStatut = statuts.find(s => _normL(s.libelle) === 'non evalue'
        || _normL(s.libelle) === 'non evaluee');
    const defaultStatutId = defaultStatut ? defaultStatut.id : '';

    // Statuts « non satisfaisant » → déclenchent la possibilité de générer une constatation
    const nonSatIds = new Set(statuts
        .filter(s => _normL(s.libelle).includes('non satisfaisant') || _normL(s.libelle).includes('non-satisfaisant'))
        .map(s => s.id));

    const tree = _execChkArbre(items, allThemes, themeLbl, sousThLbl);
    const ligne = { respByItem, defaultStatutId, statutColor, statuts, nonSatIds, dossierId };
    const groupsHtml = _execChkGroupesHtml(items, tree, (it) => _execChkLigneHtml(it, ligne));

    // Contexte conservé pour les recalculs de synthèse / couleurs après chaque changement
    window._execChkFillerCtx = {
        dossierId, checklistId,
        totalItems: items.length,
        statuts: statuts.map(s => ({ id: s.id, libelle: s.libelle, couleur: s.couleur || '' })),
        nonSatIds: Array.from(nonSatIds)
    };

    // ── Section rétractable « Activité » : renseignements du dossier courant ──
    // Priorité au dossier détaillé (selectedDossier) : il contient les champs joints
    // de la Notification (notif_nature, notif_lieu, notif_perimetre…) absents de la liste.
    let dossier = (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId)
        ? EXEC_STATE.selectedDossier
        : (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId) || {};
    // Si le dossier courant n'a pas les champs joints de notification, on le re-fetch unitairement.
    if (dossier && dossier.id && dossier.notif_nature === undefined && dossier.notif_lieu === undefined) {
        try {
            const full = await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`);
            if (full && full.id) dossier = full;
        } catch (e) { /* repli silencieux */ }
    }
    const activiteHtml = _execChkActiviteHtml(dossier);
    const html = _execChkFillerHtml(cl, dossierId, checklistId, statuts, activiteHtml, groupsHtml);
    document.body.insertAdjacentHTML('beforeend', html);

    // Câblage des autosaves (event delegation sur le conteneur des groupes)
    const groupsEl = document.getElementById('execChkFillerGroups');
    groupsEl?.addEventListener('change', ev => {
        const t = ev.target;
        if (!t.dataset.item) return;
        const itemId = t.dataset.item;
        const isStatut = t.classList.contains('exec-chk-fill-statut');
        const isObs = t.classList.contains('exec-chk-fill-obs');
        if (!isStatut && !isObs) return;
        _execChkFillAutosave(dossierId, checklistId, itemId, isStatut ? 'statut_id' : 'observations', t.value);
        if (isStatut) {
            _execChkFillerApplyRowColor(itemId, t.value);
            _execChkFillerUpdateSummary();
            execChkFillApplyFilter();
            // Affiche/masque le bouton « Générer une constatation » selon le statut
            const ctx = window._execChkFillerCtx;
            const isNonSat = ctx && (ctx.nonSatIds || []).includes(t.value);
            const btn = document.querySelector(`#execChkFillerGroups .exec-chk-gen-btn[data-item="${itemId}"]`);
            if (btn) btn.style.display = isNonSat ? '' : 'none';
        }
    });
    // Restaure l'état désactivé persistant des regroupements
    _execChkApplyDisabledState(respByItem);
    // Synthèse initiale + état des boutons « Générer une constatation »
    _execChkFillerUpdateSummary();
    _execChkFillSyncGenButtons(dossierId);
}

// ── Regroupement Sous-Domaine (sous-activité) › Thème › Sous-thème ──
function _execChkArbre(items, allThemes, themeLbl, sousThLbl) {
    const sousActs = (window.PESSCO?.sharedData?.sousActivites) || [];
    const saLbl = id => { const s = sousActs.find(x => x.id === id); return s ? (s.code || s.nom || '—') : ''; };
    const themeSaId = themeId => allThemes.find(t => t.id === themeId)?.sous_activite_id || '';

    // Construit l'arbre : { saKey: { label, themes: { thKey: { label, sousThemes: { stKey: { label, items[] } } } } } }
    const tree = {};
    items.forEach(it => {
        const saId = themeSaId(it.theme_id) || '_';
        const thId = it.theme_id || '_';
        const stId = it.sous_theme_id || '_';
        if (!tree[saId]) tree[saId] = { label: saId === '_' ? '(Sans sous-domaine)' : (saLbl(saId) || '(Sous-domaine)'), themes: {} };
        const tn = tree[saId].themes;
        if (!tn[thId]) tn[thId] = { label: thId === '_' ? '(Sans thème)' : themeLbl(thId), sousThemes: {} };
        const sn = tn[thId].sousThemes;
        if (!sn[stId]) sn[stId] = { label: stId === '_' ? '(Sans sous-thème)' : sousThLbl(stId), items: [] };
        sn[stId].items.push(it);
    });
    return tree;
}

// Une ligne d'item : référence, règlement, description, directives, statut,
// observations, et le bouton qui génère une constatation.
function _execChkLigneHtml(it, ligne) {
    const { respByItem, defaultStatutId, statutColor, statuts, nonSatIds, dossierId } = ligne;
    const _esc2 = oasisEsc;
    const r = respByItem[it.id] || {};
    const effStatut = r.statut_id || defaultStatutId;
    const col = statutColor(effStatut);
    const rowBg = col ? `background:${col}22;` : '';
    const _esc3 = s => _esc2(s);
    // Réf. Règlement : peut être un tableau JSON d'ids d'exigences ou du texte libre
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    let regDisplay = '';
    const rawReg = String(it.ref_reglement || '').trim();
    if (rawReg.startsWith('[')) {
        try {
            const arr = JSON.parse(rawReg);
            if (Array.isArray(arr)) {
                regDisplay = arr.map(id => {
                    const e = exigencesAll.find(x => x.id === id);
                    return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
                }).filter(Boolean).join('\n');
            }
        } catch (e) { regDisplay = rawReg; }
    } else {
        regDisplay = rawReg;
    }
    return `<tr data-item-id="${it.id}" data-ref="${_esc3((it.ref_item||'')+' '+(it.description||''))}" style="${rowBg}">
        <td><strong>${_esc3(it.ref_item || '-')}</strong></td>
        <td style="white-space:pre-wrap;font-size:0.72rem;color:#555;">${_esc3(regDisplay)}</td>
        <td style="white-space:pre-wrap;">${_esc3(it.description || '')}</td>
        <td style="white-space:pre-wrap;font-size:0.72rem;color:#555;">${_esc3(it.directives || '')}</td>
        <td><select class="exec-chk-fill-statut" data-item="${it.id}">
            ${statuts.map(s => `<option value="${s.id}" ${effStatut===s.id?'selected':''}>${_esc3(s.alias || s.libelle)}</option>`).join('')}
        </select></td>
        <td><textarea class="exec-chk-fill-obs" data-item="${it.id}" rows="2" placeholder="Observations terrain…">${_esc3(r.observations || '')}</textarea></td>
        <td style="text-align:center;">
            <div class="exec-chk-row-state" data-item="${it.id}" style="font-size:0.7rem;color:var(--text-muted);"></div>
            <button class="btn btn-sm btn-danger exec-chk-gen-btn" data-item="${it.id}"
                title="${te('generer_constatation')}"
                style="${nonSatIds.has(effStatut) ? '' : 'display:none;'}margin-top:0.2rem;padding:0.2rem 0.4rem;font-size:0.8rem;line-height:1;"
                onclick="execChkFillGenConstatation('${dossierId}','${it.id}')">⚠</button>
        </td>
    </tr>`;
}

// Les regroupements repliables et, au bout de chacun, la table de ses items.
function _execChkGroupesHtml(items, tree, _itemRow) {
    const _esc2 = oasisEsc;
    const _leafTable = grpItems => `<table class="exec-cli-inline-table" style="margin-top:0.3rem;">
        <thead><tr>
            <th style="width:90px;">${te('ref_item_col')}</th>
            <th style="min-width:170px;">${te('ref_reglement_col')}</th>
            <th style="min-width:280px;">Description</th>
            <th style="min-width:200px;">Directives</th>
            <th style="width:170px;">${te('status')}</th>
            <th style="min-width:220px;">Observations</th>
            <th style="width:60px;"></th>
        </tr></thead>
        <tbody>${grpItems.map(_itemRow).join('')}</tbody>
    </table>`;

    let groupsHtml = '';
    if (!items.length) {
        groupsHtml = `<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-style:italic;">${te('checklist_sans_item')}</div>`;
    } else {
        // Bouton d'activation/désactivation d'un regroupement
        const _grpToggleBtn = `<button type="button" class="exec-chk-grp-toggle" title="${te('basculer_regroupement')}"
            onclick="event.preventDefault();event.stopPropagation();execChkToggleGroup(this);">◉</button>`;
        groupsHtml = Object.keys(tree).map(saId => {
            const sa = tree[saId];
            const themesHtml = Object.keys(sa.themes).map(thId => {
                const th = sa.themes[thId];
                const stsHtml = Object.keys(th.sousThemes).map(stId => {
                    const st = th.sousThemes[stId];
                    // Masquer le bandeau « (Sans sous-thème) » : items affichés directement
                    if (stId === '_') {
                        return `<div class="exec-chk-grp-body" style="padding:0.3rem;">${_leafTable(st.items)}</div>`;
                    }
                    return `<details class="exec-chk-grp exec-chk-grp-st" open>
                        <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(st.label)}</span> <span class="exec-chk-grp-count">${st.items.length}</span></summary>
                        <div class="exec-chk-grp-body">${_leafTable(st.items)}</div>
                    </details>`;
                }).join('');
                const thCount = Object.values(th.sousThemes).reduce((n, s) => n + s.items.length, 0);
                return `<details class="exec-chk-grp exec-chk-grp-th" open>
                    <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(th.label)}</span> <span class="exec-chk-grp-count">${thCount}</span></summary>
                    <div class="exec-chk-grp-body">${stsHtml}</div>
                </details>`;
            }).join('');
            const saCount = Object.values(sa.themes).reduce((n, t) =>
                n + Object.values(t.sousThemes).reduce((m, s) => m + s.items.length, 0), 0);
            return `<details class="exec-chk-grp exec-chk-grp-sd" open>
                <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(sa.label)}</span> <span class="exec-chk-grp-count">${saCount}</span></summary>
                <div class="exec-chk-grp-body">${themesHtml}</div>
            </details>`;
        }).join('');
    }
    return groupsHtml;
}

// ── Section rétractable « Activité » : renseignements du dossier courant ──
function _execChkActiviteHtml(dossier) {
    const _esc2 = oasisEsc;
    const _dval = v => (v === null || v === undefined || v === '') ? '—' : String(v);
    const refDossier = dossier.final_reference || dossier.base_reference || dossier.reference || dossier.id || '';
    const _prestObj = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id) || {};
    const prestNom = dossier.prestataire_nom || _prestObj.nom || '';
    const refAgrement = _prestObj.ref_agrement || '';
    let equipeStr = '';
    try {
        let eq = dossier.realisation_equipe;
        eq = typeof eq === 'string' ? JSON.parse(eq || '[]') : (eq || []);
        if (!Array.isArray(eq) || !eq.length) {
            let ne = dossier.notif_equipe;
            ne = typeof ne === 'string' ? JSON.parse(ne || '[]') : (ne || []);
            eq = Array.isArray(ne) ? ne : [];
        }
        equipeStr = eq.map(m => {
            const nom = typeof m === 'string' ? m : (m.nom || '');
            const role = typeof m === 'object' ? (m.role || '') : '';
            return nom ? (' - ' + nom + (role ? ` (${role})` : '')) : '';
        }).filter(Boolean).join('\n');
    } catch (e) {}
    // Domaine = domaine de rattachement du secteur ; Secteur = secteur de rattachement du prestataire
    const _domSec = _execResolveDossierDomSec(dossier);
    // Priorité aux données saisies à l'étape Réalisation, repli sur la Notification
    const dateDebut = dossier.realisation_date_debut || dossier.notif_date_debut || dossier.date_debut_execution || '';
    const dateFin = dossier.realisation_date_fin || dossier.notif_date_fin || dossier.date_fin_execution || '';
    const lieu = dossier.realisation_lieu || dossier.notif_lieu || dossier.notif_fait_a || '';
    let nature = dossier.realisation_nature || dossier.notif_nature || '';
    if (nature) nature = nature.charAt(0).toUpperCase() + nature.slice(1);
    const objet = dossier.realisation_activite || dossier.objet_activite || dossier.notification_objet || '';
    const perimetre = dossier.realisation_perimetre || dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const _fld = (lbl, val, flex) => `<div style="flex:${flex || '1 1 140px'};min-width:0;">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.03em;">${lbl}</div>
        <div style="font-size:0.8rem;font-weight:600;color:#1f2937;white-space:pre-wrap;word-break:break-word;">${_esc2(_dval(val))}</div>
    </div>`;
    const activiteHtml = `<details class="exec-chk-activite" open style="border:1px solid var(--border);border-radius:6px;margin-bottom:0.6rem;background:#fff;">
        <summary style="cursor:pointer;padding:0.4rem 0.7rem;font-weight:700;font-size:0.82rem;background:var(--primary, #1a365d);color:#fff;border-radius:6px 6px 0 0;list-style:none;">▸ Activité${_domSec.domaineNom ? ' - ' + _esc2(_domSec.domaineNom) : ''}</summary>
        <div style="padding:0.5rem 0.7rem;display:flex;flex-direction:column;gap:0.45rem;">
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld('Référence du dossier', refDossier)}
                ${_fld('Prestataire', prestNom)}
                ${_fld('Réf Agrément', refAgrement)}
                ${_fld('Secteur', _domSec.secteurNom)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld("Nature de l'activité", nature)}
                ${_fld('Date Début', dateDebut ? _formatDate(dateDebut) : '')}
                ${_fld('Date Fin', dateFin ? _formatDate(dateFin) : '')}
                ${_fld('Lieu', lieu)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld('Objet', objet, '1 1 0')}
                ${_fld('Périmètre', perimetre, '3 1 0')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld("Équipe d'audit / inspection", equipeStr, '1 1 100%')}
            </div>
        </div>
    </details>`;
    return activiteHtml;
}

// Le volet plein écran de saisie : ses styles, son entête, ses filtres et les regroupements.
function _execChkFillerHtml(cl, dossierId, checklistId, statuts, activiteHtml, groupsHtml) {
    const _esc2 = oasisEsc;
    return `
    <div id="execChkFillerWrap" class="exec-cli-slicer-wrap">
        <style>
            #execChkFillerWrap { position:fixed; top:var(--topbar-height, 56px); left:var(--sidebar-width, 240px); right:0; bottom:0; z-index:1100; transition:left 0.3s ease; }
            body.app-sidebar-collapsed #execChkFillerWrap { left:var(--sidebar-collapsed, 60px); }
            #execChkFillerWrap .exec-cli-slicer-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.35); }
            #execChkFillerWrap .exec-cli-slicer { position:absolute; top:0; right:0; bottom:0; left:0; width:auto; max-width:100%;
                background:var(--bg, #fff); box-shadow:-8px 0 30px rgba(0,0,0,0.18);
                display:flex; flex-direction:column; animation:execCliSlideIn 0.25s ease; }
            @media (max-width: 640px) {
                #execChkFillerWrap { left:0; }
            }
            @keyframes execCliSlideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
            #execChkFillerWrap .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); gap:0.5rem; flex-wrap:wrap; }
            #execChkFillerWrap .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
            #execChkFillerWrap .exec-cli-inline-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
            #execChkFillerWrap .exec-cli-inline-table thead th { background:var(--primary, #1a365d); color:#fff; text-align:left; padding:0.45rem 0.55rem; font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; position:sticky; top:0; z-index:1; }
            #execChkFillerWrap .exec-cli-inline-table tbody td { border-bottom:1px solid var(--border); padding:0.35rem 0.45rem; vertical-align:top; }
            #execChkFillerWrap .exec-cli-inline-table tbody tr:hover { background:rgba(59,130,246,0.04); }
            #execChkFillerWrap .exec-cli-inline-table select, #execChkFillerWrap .exec-cli-inline-table textarea {
                width:100%; border:1px solid var(--border); border-radius:4px; padding:0.3rem 0.4rem; font-size:0.78rem;
                background:#fff; font-family:inherit; resize:vertical;
            }
            #execChkFillerWrap .exec-cli-inline-table select:focus, #execChkFillerWrap .exec-cli-inline-table textarea:focus {
                outline:none; border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.15);
            }
            #execChkFillerWrap .exec-cli-inline-table textarea { min-height:36px; max-height:160px; line-height:1.3; }
            #execChkFillerWrap .exec-chk-grp { border:1px solid var(--border); border-radius:6px; margin-bottom:0.4rem; background:#fff; }
            #execChkFillerWrap .exec-chk-grp > summary { cursor:pointer; padding:0.4rem 0.7rem; font-weight:700; font-size:0.82rem; list-style:none; user-select:none; display:flex; align-items:center; gap:0.4rem; }
            #execChkFillerWrap .exec-chk-grp > summary::-webkit-details-marker { display:none; }
            #execChkFillerWrap .exec-chk-grp > summary::before { content:'▸'; font-size:0.7rem; transition:transform 0.15s; }
            #execChkFillerWrap .exec-chk-grp[open] > summary::before { transform:rotate(90deg); }
            #execChkFillerWrap .exec-chk-grp-sd > summary { background:var(--primary, #1a365d); color:#fff; border-radius:6px 6px 0 0; }
            #execChkFillerWrap .exec-chk-grp-th > summary { background:#e2e8f0; color:#1a365d; }
            #execChkFillerWrap .exec-chk-grp-st > summary { background:#f1f5f9; color:#334155; font-weight:600; }
            #execChkFillerWrap .exec-chk-grp-count { background:rgba(0,0,0,0.12); color:inherit; border-radius:10px; padding:0 0.45rem; font-size:0.7rem; font-weight:600; }
            #execChkFillerWrap .exec-chk-grp-sd > .exec-chk-grp-body { padding:0.4rem 0.4rem 0.4rem 0.8rem; }
            #execChkFillerWrap .exec-chk-grp-th > .exec-chk-grp-body { padding:0.35rem 0.35rem 0.35rem 0.7rem; }
            #execChkFillerWrap .exec-chk-grp-st > .exec-chk-grp-body { padding:0.3rem; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-hidden { display:none; }
            #execChkFillerWrap .exec-chk-activite > summary::-webkit-details-marker { display:none; }
            #execChkFillerWrap .exec-chk-activite > summary { display:flex; align-items:center; gap:0.35rem; }
            #execChkFillerWrap .exec-chk-grp-toggle { background:none; border:none; cursor:pointer; font-size:0.9rem; color:inherit; padding:0 0.2rem; line-height:1; opacity:0.85; }
            #execChkFillerWrap .exec-chk-grp-toggle:hover { opacity:1; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-grp-off > summary { opacity:0.5; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-grp-off > summary .exec-chk-grp-label { text-decoration:line-through; }
            #execChkFillerWrap tr.exec-chk-row-off { opacity:0.4; }
            #execChkFillerWrap tr.exec-chk-row-off select, #execChkFillerWrap tr.exec-chk-row-off textarea,
            #execChkFillerWrap tr.exec-chk-row-off .exec-chk-gen-btn { pointer-events:none; }
        </style>
        <div class="exec-cli-slicer-overlay" onclick="execCloseChecklistFiller('${dossierId}')"></div>
        <aside class="exec-cli-slicer" role="dialog" aria-modal="true">
            <header class="exec-cli-slicer-header">
                <div>
                    <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">${te('renseigner_checklist_titre')}</div>
                    <div style="font-weight:700;font-size:1rem;">${cl.reference ? _esc2(cl.reference) + ' — ' : ''}${_esc2(cl.nom)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                    <span id="execChkFillerSaveState" style="font-size:0.75rem;color:var(--text-muted);"></span>
                    <button class="btn btn-sm btn-primary" onclick="execChkFillExportPdf('${dossierId}','${checklistId}')" title="Exporter PDF">${EXEC_ICONS.pdf || ''} Exporter PDF</button>
                    <button class="btn btn-sm btn-primary" onclick="execChkFillExportXlsx('${dossierId}','${checklistId}')" title="Exporter Excel">${EXEC_ICONS.download || ''} Exporter Excel</button>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('execChkFillImportFile').click()" title="Importer">${EXEC_ICONS.upload || ''} Importer</button>
                    <input type="file" id="execChkFillImportFile" accept=".xlsx" style="display:none" onchange="execChkFillImportXlsx('${dossierId}','${checklistId}',event)">
                    <button class="btn btn-sm btn-ghost" onclick="execCloseChecklistFiller('${dossierId}')" title="${te('close')}">✕</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body">
                ${activiteHtml}
                <div style="display:flex;align-items:flex-end;gap:0.7rem;margin-bottom:0.6rem;flex-wrap:wrap;">
                    <div id="execChkFillerSummary" style="display:flex;flex-wrap:wrap;gap:0.6rem;"></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1 1 340px;min-width:240px;">
                        <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                            <button class="btn btn-sm btn-primary" onclick="execChkFillExpandAll(true)">${te('tout_deplier_btn')}</button>
                            <button class="btn btn-sm btn-primary" onclick="execChkFillExpandAll(false)">▲ Tout plier</button>
                        </div>
                        <div style="display:flex;gap:0.4rem;align-items:center;">
                            <input type="text" id="execChkFillSearch" placeholder="🔎 Rechercher…" oninput="execChkFillApplyFilter()"
                                style="padding:0.32rem 0.5rem;border:1px solid var(--border);border-radius:5px;font-size:0.78rem;flex:2 1 140px;min-width:110px;">
                            <select id="execChkFillStatutFilter" onchange="execChkFillApplyFilter()"
                                style="padding:0.32rem 0.5rem;border:1px solid var(--border);border-radius:5px;font-size:0.78rem;flex:1 1 110px;min-width:90px;">
                                <option value="">Tous statuts</option>
                                ${statuts.map(s => `<option value="${s.id}">${_esc2(s.alias || s.libelle)}</option>`).join('')}
                            </select>
                            <button class="btn btn-sm btn-ghost" title="${te('reinitialiser_filtres')}" style="flex:0 0 auto;"
                                onclick="document.getElementById('execChkFillSearch').value='';document.getElementById('execChkFillStatutFilter').value='';execChkFillApplyFilter();">↺</button>
                        </div>
                    </div>
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.5rem;">${te('reponses_enregistrees_1')} <strong>brouillon</strong> ${te('reponses_enregistrees_2')}</p>
                <div id="execChkFillerGroups" style="overflow:auto;">${groupsHtml}</div>
            </div>
        </aside>
    </div>`;
}

// Restaure, à l'ouverture, l'état désactivé des items / regroupements à partir des réponses.
function _execChkApplyDisabledState(respByItem) {
    if (!respByItem) return;
    // 1) Marque les lignes d'items dont la réponse porte disabled=1
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        const r = respByItem[tr.getAttribute('data-item-id')];
        if (r && (r.disabled === 1 || r.disabled === '1' || r.disabled === true)) {
            tr.classList.add('exec-chk-row-off');
        }
    });
    // 2) Un regroupement dont TOUTES les lignes sont désactivées est marqué « off » et replié
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(grp => {
        const rows = grp.querySelectorAll('tr[data-item-id]');
        if (!rows.length) return;
        const allOff = Array.from(rows).every(tr => tr.classList.contains('exec-chk-row-off'));
        if (allOff) {
            grp.classList.add('exec-chk-grp-off');
            grp.open = false;
            const btn = grp.querySelector(':scope > summary .exec-chk-grp-toggle');
            if (btn) { btn.textContent = '◯'; btn.title = 'Réactiver ce regroupement'; }
        }
    });
}

// Marque (ou annule) une checklist comme « Validée » au niveau du dossier.
async function execSetDossierChecklistValidee(dossierId, checklistId, validee) {
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    let ids = _parse(dossier.checklists_validees);
    if (validee) { if (!ids.includes(checklistId)) ids.push(checklistId); }
    else { ids = ids.filter(id => id !== checklistId); }
    if (validee && !await oasisConfirmer(te('confirmer_checklist_validee'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ checklists_validees: JSON.stringify(ids) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.checklists_validees = JSON.stringify(ids);
        }
        await execRefreshDynamic();
        // Re-rend l'onglet « Checklist et autres doc. » du dossier
        if (typeof execSwitchRedactionSubtab === 'function') {
            execSwitchRedactionSubtab(dossierId, 'checklists');
        } else {
            execOpenDossierSlider(dossierId);
        }
        _execToast(validee ? te('checklist_validee_ok') : te('validation_annulee'), 'success');
    } catch (e) {
        _execToast(te('erreur_x', e.message || e), 'error');
    }
}

// Résout le domaine et le secteur de rattachement d'un dossier.
// Secteur = secteur de rattachement du prestataire ; Domaine = domaine de rattachement du secteur.
function _execResolveDossierDomSec(dossier) {
    const prest = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === (dossier || {}).prestataire_id) || {};
    const secId = prest.secteur_id || (dossier || {}).secteur_id || '';
    const secObj = (EXEC_STATE.data.secteurs || []).find(s => s.id === secId) || {};
    const domObj = (EXEC_STATE.data.domaines || []).find(d => d.id === secObj.domaine_id) || {};
    return {
        secteurId: secId,
        secteurNom: secObj.nom || secObj.code || '',
        domaineId: secObj.domaine_id || '',
        domaineNom: domObj.nom || domObj.code || '',
        domaineCode: domObj.code || ''
    };
}

// Génère une constatation brouillon à partir d'un item « non satisfaisant » de la checklist.
async function execChkFillGenConstatation(dossierId, itemId) {
    const item = (EXEC_STATE.data.checklistItems || []).find(i => i.id === itemId);
    if (!item) { _execToast(te('item_introuvable'), 'error'); return; }
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    // Réf. réglementaires : résout les ids d'exigences en texte lisible
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    let refReg = String(item.ref_reglement || '').trim();
    if (refReg.startsWith('[')) {
        try {
            const arr = JSON.parse(refReg);
            if (Array.isArray(arr)) refReg = arr.map(id => {
                const e = exigencesAll.find(x => x.id === id);
                return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
            }).filter(Boolean).join('\n');
        } catch (e) {}
    }
    // Observation terrain saisie pour cet item (état courant du DOM)
    const obsEl = document.querySelector(`#execChkFillerGroups .exec-chk-fill-obs[data-item="${itemId}"]`);
    const observation = obsEl ? obsEl.value : '';
    if (!await oasisConfirmer(te('confirmer_generer_constat'))) return;
    try {
        const _ds = _execResolveDossierDomSec(dossier);
        const payload = {
            dossier_id: dossierId,
            domaine_id: _ds.domaineCode || dossier.domaine_id || dossier.domaine || 'GEN',
            prestataire_id: dossier.prestataire_id || '',
            source: 'audit',
            criticite: '',  // laissé vide — à renseigner manuellement dans la FNC
            cas_type: `Checklist — ${item.ref_item || 'item'}`,
            description: (item.description || '') + (observation ? '\n\nObservation terrain : ' + observation : ''),
            ref_reglementaires: refReg,
            recommandation: item.directives || ''
        };
        const res = await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(payload) });
        // Lie la constatation à l'item de checklist (permet de désactiver le bouton)
        if (res.id) {
            try {
                await api(`${EXEC_MODULE_API}/constatations/${res.id}`, {
                    method: 'PUT', body: JSON.stringify({ checklist_item_id: itemId, checklist_id: item.checklist_id })
                });
            } catch (e) { /* non bloquant */ }
        }
        await execRefreshDynamic();
        // Désactive le bouton de génération pour cet item
        _execChkFillSyncGenButtons(dossierId);
        // Marque qu'une constatation a été générée → le dossier sera rafraîchi à la fermeture du filler
        window._execChkFillerConstatGenerated = true;
        _execToast(te('constat_brouillon_cree', res.reference || ''), 'success');
    } catch (e) {
        _execToast(te('constat_creation_echouee', e.message || e), 'error');
    }
}

// Synchronise l'état des boutons « Générer une constatation » : désactivés pour les
// items ayant déjà une constatation liée, réactivés sinon (constatation supprimée).
function _execChkFillSyncGenButtons(dossierId) {
    const constats = (EXEC_STATE.data.constatations || [])
        .filter(c => c.dossier_id === dossierId && c.checklist_item_id);
    const linkedItems = new Set(constats.map(c => c.checklist_item_id));
    document.querySelectorAll('#execChkFillerGroups .exec-chk-gen-btn').forEach(btn => {
        const itemId = btn.getAttribute('data-item');
        if (linkedItems.has(itemId)) {
            btn.disabled = true;
            btn.title = 'Constatation déjà générée pour cet item';
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.disabled = false;
            btn.title = 'Générer une constatation';
            btn.style.opacity = '';
            btn.style.cursor = '';
        }
    });
}

// Active / désactive un regroupement (sous-domaine, thème ou sous-thème).
// Les items d'un regroupement désactivé sont exclus des décomptes et du taux.
function execChkToggleGroup(btn) {
    const grp = btn.closest('details.exec-chk-grp');
    if (!grp) return;
    const off = grp.classList.toggle('exec-chk-grp-off');
    btn.textContent = off ? '◯' : '◉';
    btn.title = off ? 'Réactiver ce regroupement' : 'Désactiver ce regroupement';
    // Applique l'état désactivé à toutes les lignes d'items du regroupement
    const itemIds = [];
    grp.querySelectorAll('tr[data-item-id]').forEach(tr => {
        tr.classList.toggle('exec-chk-row-off', off);
        itemIds.push(tr.getAttribute('data-item-id'));
    });
    // Repli automatique d'un regroupement désactivé
    if (off) grp.open = false;
    _execChkFillerUpdateSummary();
    execChkFillApplyFilter();
    // Persiste l'état (disabled) de chaque item du regroupement
    _execChkPersistGroupDisabled(itemIds, off);
}

// Persiste le drapeau « disabled » des réponses pour une liste d'items.
async function _execChkPersistGroupDisabled(itemIds, disabled) {
    const ctx = window._execChkFillerCtx;
    if (!ctx || !itemIds || !itemIds.length) return;
    const stateEl = document.getElementById('execChkFillerSaveState');
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    try {
        const all = await api('/api/exec-checklist-responses');
        const byItem = {};
        (all || []).filter(r => r.dossier_id === ctx.dossierId && r.checklist_id === ctx.checklistId)
            .forEach(r => { byItem[r.item_id] = r; });
        const now = oasisHorodatage();
        for (const itemId of itemIds) {
            const ex = byItem[itemId];
            if (ex) {
                await api('/api/exec-checklist-responses/' + ex.id, {
                    method: 'PUT', body: JSON.stringify({ disabled: disabled ? 1 : 0, date_maj: now })
                });
            } else {
                await api('/api/exec-checklist-responses', {
                    method: 'POST', body: JSON.stringify({
                        dossier_id: ctx.dossierId, checklist_id: ctx.checklistId, item_id: itemId,
                        statut_resp: 'brouillon', disabled: disabled ? 1 : 0, date_maj: now
                    })
                });
            }
        }
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
    }
}

// Plie / déplie tous les accordéons (Sous-domaine / Thème / Sous-thème).
function execChkFillExpandAll(open) {
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(d => { d.open = !!open; });
}

// Filtre les items par recherche texte + statut, puis masque les groupes vides.
function execChkFillApplyFilter() {
    const term = (document.getElementById('execChkFillSearch')?.value || '').toLowerCase().trim();
    const statutF = document.getElementById('execChkFillStatutFilter')?.value || '';
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        let show = true;
        if (term) {
            const ref = (tr.getAttribute('data-ref') || '').toLowerCase();
            if (!ref.includes(term)) show = false;
        }
        if (show && statutF) {
            const sel = tr.querySelector('.exec-chk-fill-statut');
            if (!sel || sel.value !== statutF) show = false;
        }
        tr.style.display = show ? '' : 'none';
    });
    // Masque les groupes (details) qui n'ont plus aucune ligne visible
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(d => {
        const visibleRows = d.querySelectorAll('tr[data-item-id]:not([style*="display: none"])');
        d.classList.toggle('exec-chk-hidden', visibleRows.length === 0);
    });
}

// Applique la couleur de fond d'une ligne selon le statut sélectionné.
function _execChkFillerApplyRowColor(itemId, statutId) {
    const ctx = window._execChkFillerCtx; if (!ctx) return;
    const row = document.querySelector(`#execChkFillerGroups tr[data-item-id="${itemId}"]`);
    if (!row) return;
    const st = ctx.statuts.find(s => s.id === statutId);
    row.style.background = (st && st.couleur) ? (st.couleur + '22') : '';
}

// Recalcule la synthèse : une carte par statut + une carte « Non Évalué » + taux de conformité.
function _execChkFillerUpdateSummary() {
    const ctx = window._execChkFillerCtx; if (!ctx) return;
    const box = document.getElementById('execChkFillerSummary'); if (!box) return;
    // Exclut les lignes appartenant à un regroupement désactivé (exec-chk-row-off)
    const selects = Array.from(document.querySelectorAll('#execChkFillerGroups .exec-chk-fill-statut'))
        .filter(sel => !sel.closest('tr.exec-chk-row-off'));
    const total = selects.length;
    const _norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Décompte par statut
    const countByStatut = {};
    ctx.statuts.forEach(s => { countByStatut[s.id] = 0; });
    let nonEvalue = 0;
    selects.forEach(sel => {
        const id = sel.value;
        if (!id) { nonEvalue++; return; }
        if (countByStatut[id] === undefined) countByStatut[id] = 0;
        countByStatut[id]++;
    });

    // Identifie les statuts par libellé : Satisfaisant, Non Évalué, Non Applicable
    let nbSatisfaisant = 0, nbNonEvalue = 0, nbNonApplicable = 0;
    ctx.statuts.forEach(s => {
        const lbl = _norm(s.libelle);
        const n = countByStatut[s.id] || 0;
        if (lbl.includes('non satisfaisant') || lbl.includes('non-satisfaisant')) {
            // non satisfaisant — ne compte ni au numérateur ni en exclusion
        } else if (lbl.includes('satisfaisant')) {
            nbSatisfaisant += n;
        }
        if (lbl.includes('non evalue') || lbl.includes('non evaluee')) nbNonEvalue += n;
        if (lbl.includes('non applicable') || lbl.includes('non-applicable')) nbNonApplicable += n;
    });

    // Taux de conformité = nbr Satisfaisant / (nbr items activés - Non Évalué - Non Applicable)
    const denom = total - nbNonEvalue - nbNonApplicable;
    const taux = denom > 0 ? (nbSatisfaisant / denom) * 100 : 0;
    const tauxStr = taux.toFixed(2);
    const tauxColor = taux >= 80 ? '#059669' : (taux >= 50 ? '#d97706' : '#ef4444');

    const card = (label, value, color, accent) => `<div style="background:var(--bg-card);border:1px solid var(--border);border-left:4px solid ${accent || color};border-radius:8px;padding:0.4rem 0.7rem;min-width:120px;">
        <div style="font-size:0.66rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.03em;">${label}</div>
        <div style="font-size:1.1rem;font-weight:800;color:${color};">${value}</div>
    </div>`;

    // Une carte par statut configuré + carte « Non Évalué » + carte Taux
    let html = '';
    ctx.statuts.forEach(s => {
        const c = s.couleur || '#475569';
        html += card(s.libelle, `${countByStatut[s.id] || 0} <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted);">/ ${total}</span>`, c, c);
    });
    html += card('Taux de conformité', tauxStr + ' %', tauxColor, tauxColor);
    box.innerHTML = html;
}

// ── Export / Import de la checklist renseignée ──
async function execChkFillExportXlsx(dossierId, checklistId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`/api/m/execution/checklist-fill/${dossierId}/${checklistId}/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(oasisMessageErreur(j, res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
        a.href = url;
        a.download = `checklist_renseignee_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 60)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { _execToast(te('export_excel_echoue', e.message || e), 'error'); }
}

async function execChkFillImportXlsx(dossierId, checklistId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    try {
        const res = await fetch(`/api/m/execution/checklist-fill/${dossierId}/${checklistId}/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(oasisMessageErreur(j, res.status));
        _execToast(te('import_ok_reponses', j.imported), 'success');
        // Recharge le filler pour refléter les réponses importées
        execOpenChecklistFiller(dossierId, checklistId);
    } catch (e) {
        _execToast(te('import_echoue', e.message || e), 'error');
    } finally {
        if (ev?.target) ev.target.value = '';
    }
}

// Export PDF : fenêtre d'impression dédiée (l'utilisateur choisit « Enregistrer en PDF »).
function execChkFillExportPdf(dossierId, checklistId) {
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) { _execToast(te('checklist_introuvable'), 'error'); return; }
    const items = (EXEC_STATE.data.checklistItems || [])
        .filter(i => i.checklist_id === checklistId)
        .slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = (EXEC_STATE.data.checklistStatuts || []);
    const sousThemes = (EXEC_STATE.data.checklistSousThemes || []).filter(s => s.checklist_id === checklistId);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themeLbl = id => allThemes.find(t => t.id === id)?.libelle || '-';
    const sousThLbl = id => sousThemes.find(s => s.id === id)?.libelle || '-';
    const stLbl = id => statuts.find(s => s.id === id)?.libelle || 'Non Évalué';
    const stCol = id => statuts.find(s => s.id === id)?.couleur || '#9ca3af';
    const _e = oasisEsc;
    // Lit les statuts/observations directement depuis le DOM du filler (état courant)
    const respByItem = {};
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        const id = tr.getAttribute('data-item-id');
        respByItem[id] = {
            statut_id: tr.querySelector('.exec-chk-fill-statut')?.value || '',
            observations: tr.querySelector('.exec-chk-fill-obs')?.value || ''
        };
    });
    const today = oasisJour();
    const w = window.open('', '_blank');
    if (!w) { _execToast(te('autoriser_popups'), 'error'); return; }
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    const _regDisplay = raw => {
        const s = String(raw || '').trim();
        if (s.startsWith('[')) {
            try {
                const arr = JSON.parse(s);
                if (Array.isArray(arr)) return arr.map(id => {
                    const e = exigencesAll.find(x => x.id === id);
                    return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
                }).filter(Boolean).join('\n');
            } catch (e) {}
        }
        return s;
    };
    const rows = items.map(it => {
        const r = respByItem[it.id] || {};
        const c = stCol(r.statut_id);
        return `<tr>
            <td>${_e(it.ref_item || '-')}</td>
            <td style="font-size:7.5pt;">${_e(_regDisplay(it.ref_reglement))}</td>
            <td>${_e(themeLbl(it.theme_id))}${it.sous_theme_id ? ' › ' + _e(sousThLbl(it.sous_theme_id)) : ''}</td>
            <td>${_e(it.description || '')}</td>
            <td>${_e(it.directives || '')}</td>
            <td style="background:${c}22;font-weight:600;">${_e(stLbl(r.statut_id))}</td>
            <td>${_e(r.observations || '')}</td>
        </tr>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Checklist — ${_e(cl.nom)}</title>
        <style>
            body { font-family:Arial,sans-serif; margin:1cm; color:#1f2937; }
            h1 { font-size:14pt; color:#1a365d; margin:0 0 0.2cm; }
            .meta { font-size:9pt; color:#6b7280; margin-bottom:0.4cm; }
            table { width:100%; border-collapse:collapse; font-size:8.5pt; }
            th { background:#1a365d; color:#fff; padding:5px 6px; text-align:left; border:1px solid #999; }
            td { padding:4px 6px; border:1px solid #ccc; vertical-align:top; white-space:pre-wrap; }
            @page { size:A4 landscape; margin:1cm; }
        </style></head><body>
        <h1>${cl.reference ? _e(cl.reference) + ' — ' : ''}${_e(cl.nom)}</h1>
        <div class="meta">Checklist renseignée (brouillon) — ${items.length} item(s) — Édité le ${today}</div>
        <table>
            <thead><tr><th>${te('ref_item_col')}</th><th>${te('ref_reglement_col')}</th><th>${te('theme_sous_theme')}</th><th>Description</th><th>Directives</th><th>${te('status')}</th><th>Observations</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="7">${te('aucun_item')}</td></tr>`}</tbody>
        </table>
        <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
    </body></html>`);
    w.document.close();
}

function execCloseChecklistFiller(dossierId) {
    document.getElementById('execChkFillerWrap')?.remove();
    // Restaure l'état antérieur de la barre de menu (déployé / replié)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const prev = !!window._execChkFillerPrevCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = prev;
        if (wrapper) wrapper.classList.toggle('sidebar-collapsed', prev);
        if (sidebar) sidebar.classList.toggle('collapsed', prev);
    } catch (e) {}
    // Si des constatations ont été générées depuis le filler, ré-affiche le dossier
    // pour que la section Constatations soit immédiatement à jour.
    if (dossierId && window._execChkFillerConstatGenerated) {
        window._execChkFillerConstatGenerated = false;
        execRefreshDynamic().then(() => execOpenDossierSlider(dossierId));
    }
}

// Autosave d'une réponse (création upsert) — toujours en brouillon à ce stade.
async function _execChkFillAutosave(dossierId, checklistId, itemId, field, value) {
    const stateEl = document.getElementById('execChkFillerSaveState');
    const rowEl = document.querySelector(`.exec-chk-row-state[data-item="${itemId}"]`);
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    if (rowEl) { rowEl.textContent = '…'; rowEl.style.color = '#d97706'; }
    try {
        // Cherche une réponse existante pour ce (dossier, checklist, item)
        const all = await api('/api/exec-checklist-responses');
        const existing = (all || []).find(r => r.dossier_id === dossierId && r.checklist_id === checklistId && r.item_id === itemId);
        const payload = {
            dossier_id: dossierId,
            checklist_id: checklistId,
            item_id: itemId,
            statut_resp: 'brouillon',
            date_maj: oasisHorodatage(),
            [field]: value
        };
        if (existing) {
            await api('/api/exec-checklist-responses/' + existing.id, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await api('/api/exec-checklist-responses', { method: 'POST', body: JSON.stringify(payload) });
        }
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
        if (rowEl) { rowEl.textContent = '✓'; rowEl.style.color = '#059669'; }
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
        if (rowEl) { rowEl.textContent = '⚠'; rowEl.style.color = '#ef4444'; }
    }
}
