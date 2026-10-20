/* OASIS — Module « Exécution de la Surveillance »
 * Écran 4 — Exécution des activités.
 *
 * Dossiers d’activité, étapes de réalisation, checklists, constatations relevées sur place.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  4. EXECUTION DES ACTIVITES
// ══════════════════════════════════════

function execRenderExecution() {
    const dossiers = EXEC_STATE.data.dossiers || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const plansValides = EXEC_STATE.data.plansValides || [];
    const F = EXEC_STATE.filters;

    // Hide closed dossiers by default (unless explicitly filtering for 'cloture')
    let filtered = F.statut === 'cloture' ? dossiers : dossiers.filter(d => d.statut !== 'cloture');
    if (F.prestataire) filtered = filtered.filter(d => d.prestataire_id === F.prestataire);
    if (F.statut) filtered = filtered.filter(d => d.statut === F.statut);
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(d =>
            (d.notification_objet || '').toLowerCase().includes(s) ||
            (d.prestataire_nom || '').toLowerCase().includes(s) ||
            (d.notification_ref || '').toLowerCase().includes(s)
        );
    }

    const notifs = EXEC_STATE.data.notifications || [];

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('execution')}</h2>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showPrestataire: true, showStatut: true, statutOptions: ['ouvert', 'soumis', 'cloture'] })}

        <div class="card" style="overflow-x:auto;">
            <table class="exec-data-table">
                <thead>
                    <tr>
                        <th>${te('ref_activite_col')}</th>
                        <th>${te('provider')}</th>
                        <th>Dom. &amp; Sec.</th>
                        <th style="min-width:230px;">${te('objet')}</th>
                        <th>${te('date_activite_col')}</th>
                        <th>${te('derniere_maj')}</th>
                        <th>${te('status')}</th>
                        <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    filtered.map(d => {
                        const relNotif = notifs.find(n => n.id === d.notification_id) || {};
                        const dSecteurId = d.secteur_id || relNotif.secteur_id || '';
                        const secObj = secteurs.find(s => s.id === dSecteurId) || {};
                        const dDomaineId = secObj.domaine_id || '';
                        const domObj = (EXEC_STATE.data.domaines || []).find(x => x.id === dDomaineId) || {};
                        const dDomaine = domObj.code || domObj.nom || dDomaineId || '';
                        const dSecteur = secObj.code || secObj.nom || dSecteurId || '';
                        // Dates de l'étape Réalisation (priorité) sinon dates notifiées
                        const actDebut = (d.realisation_date_debut || relNotif.date_debut_effective || relNotif.date_activite || d.date_debut_execution || d.date_debut || '').slice(0, 10);
                        const actFin = (d.realisation_date_fin || relNotif.date_fin_effective || d.date_fin_execution || '').slice(0, 10);
                        return `<tr>
                        <td><strong style="color:var(--exec-accent);">${_esc(d.reference || relNotif.reference_activite || '')}</strong></td>
                        <td>${_esc(d.prestataire_nom || '')}</td>
                        <td style="white-space:nowrap;">
                            <div>${_esc(dDomaine || '-')}</div>
                            <div style="color:var(--text-muted);font-size:0.78rem;">${_esc(dSecteur || '-')}</div>
                        </td>
                        <td style="white-space:normal;word-break:break-word;">${_esc(d.notification_objet || '')}</td>
                        <td style="white-space:nowrap;">
                            ${actDebut ? `<div>${_formatDate(actDebut)}</div>` : ''}
                            ${(actFin && actFin !== actDebut) ? `<div>${_formatDate(actFin)}</div>` : ''}
                        </td>
                        <td>${_formatDate(d.date_maj || d.date_creation || '')}</td>
                        <td style="white-space:nowrap;">
                            <div>${_execStatusBadge(d.statut)}</div>
                            <div style="color:var(--text-muted);font-size:0.78rem;margin-top:0.15rem;">${_esc(_dossierStepLabel(d))}</div>
                        </td>
                        <td style="text-align:center;white-space:nowrap;"><div class="exec-cellule-boutons">
                            <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${d.notification_id}')" title="${te('gerer_echange')}">
                                ${EXEC_ICONS.chat}
                            </button>
                            <button class="btn btn-sm btn-accent" onclick="execOpenDossierSlider('${d.id}')" title="${te('ouvrir_dossier_btn')}">
                                ${EXEC_ICONS.openFolder}
                            </button>
                            ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteDossier('${d.id}')" title="${te('delete')}">
                                ${EXEC_ICONS.x}
                            </button>` : ''}
                        </div></td>
                    </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}


// Workflow step definitions for the dossier form
const DOSSIER_WORKFLOW_STEPS = [
    { id: 'notification', label: 'Notification' },
    { id: 'realisation', label: 'Réalisation' },
    { id: 'redaction', label: 'Rédaction du rapport' },
    { id: 'validation', label: 'Validation et Transmission' }
];
const REDACTION_SUBTABS = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'synthese', label: 'Synthèses et Recommandations' },
    { id: 'checklists', label: 'Checklist et autres doc.' },
    { id: 'constatations', label: 'Constatations' },
    { id: 'conclusion', label: 'Conclusions' },
    { id: 'annexes', label: 'Annexes' },
];

function _dossierStepLabel(dossier) {
    if (dossier.statut === 'cloture') return 'Clôturé';
    const cs = dossier.current_step || 'realisation';
    const s = DOSSIER_WORKFLOW_STEPS.find(x => x.id === cs);
    return s ? s.label : cs;
}

function _dossierStepOrder(stepId) {
    const idx = DOSSIER_WORKFLOW_STEPS.findIndex(s => s.id === stepId);
    return idx < 0 ? 99 : idx;
}

function _dossierStepState(dossier, stepId) {
    // Returns { unlocked, closed, editable }
    const isCloture = dossier.statut === 'cloture';
    const hasTransmitted = (dossier.rapports || []).some(r => r.statut === 'transmis');
    const current = dossier.current_step || 'realisation';
    const currentIdx = _dossierStepOrder(current);
    const thisIdx = _dossierStepOrder(stepId);
    let closed = false;
    let unlocked = false;
    if (stepId === 'notification') {
        unlocked = true; closed = true; // always closed & read-only
    } else if (stepId === 'realisation') {
        unlocked = true;
        closed = !!(dossier.realisation_closed) || currentIdx > thisIdx;
    } else if (stepId === 'redaction') {
        unlocked = !!(dossier.realisation_closed) || currentIdx >= thisIdx;
        closed = !!(dossier.redaction_closed) && dossier.statut !== 'brouillon';
    } else if (stepId === 'validation') {
        unlocked = !!(dossier.redaction_closed) || currentIdx >= thisIdx || (dossier.rapports || []).length > 0;
        closed = isCloture;
    }
    const canContribute = _execCanContribute();
    let editable = false;
    if (!isCloture && !hasTransmitted && canContribute) {
        if (stepId === 'realisation' && !closed) editable = true;
        if (stepId === 'redaction' && !closed && unlocked && ['ouvert','brouillon'].includes(dossier.statut)) editable = true;
    }
    return { unlocked, closed, editable };
}

async function execOpenDossierSlider(dossierId, activeTab) {
    // Le formulaire de constatation, s'il était ouvert, se referme avec lui.
    document.getElementById('execFncTiroir')?.remove();
    // Guard against stale responses when clicking rapidly between dossiers
    const requestId = ++EXEC_STATE._dossierRequestId;
    let dossier;
    try {
        dossier = await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`);
    } catch (e) {
        console.error('Load dossier error:', e);
        return;
    }
    // Discard stale response if another dossier was requested in the meantime
    if (requestId !== EXEC_STATE._dossierRequestId) return;
    if (!dossier) return;
    EXEC_STATE.selectedDossier = dossier;

    // Map legacy activeTab (sub-tab of redaction) to a step + sub-tab
    let step, redactionSubtab;
    if (activeTab && REDACTION_SUBTABS.some(s => s.id === activeTab)) {
        step = 'redaction';
        redactionSubtab = activeTab;
    } else if (activeTab === 'rapports') {
        step = 'validation';
    } else if (activeTab && DOSSIER_WORKFLOW_STEPS.some(s => s.id === activeTab)) {
        step = activeTab;
    } else {
        step = dossier.current_step || EXEC_STATE.dossierStep || 'realisation';
    }
    // Ensure step is unlocked; fall back to current_step
    if (!_dossierStepState(dossier, step).unlocked) {
        step = dossier.current_step || 'realisation';
    }
    EXEC_STATE.dossierStep = step;
    EXEC_STATE.dossierRedactionSubtab = redactionSubtab || EXEC_STATE.dossierRedactionSubtab || 'introduction';

    execShowSlider(`${EXEC_ICONS.folder} ${te('dossier')}`, '', '', 'max');
    const slider = document.getElementById('execSlider');
    if (slider) slider.setAttribute('data-hide-close', '1');
    _renderDossierSliderContent(dossierId);
}

function _renderDossierSliderContent(dossierId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier) return;
    const step = EXEC_STATE.dossierStep || 'realisation';
    const subtab = EXEC_STATE.dossierRedactionSubtab || 'introduction';

    const notifObjet = dossier.notification_objet || dossier.objet_activite || '';
    const obsRetour = dossier.observations_retour || '';

    // Build compact slider title combining meta info (moved from body header)
    const titleHtml = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;flex:1;font-size:0.85rem;font-weight:400;">
        <span style="font-weight:600;font-size:0.95rem;">${EXEC_ICONS.folder} ${te('dossier')}</span>
        <span><strong>${te('ref_deux_points')}</strong> ${_esc(dossier.reference || dossierId)}</span>
        <span><strong>${te('prestataire_label')}</strong> ${_esc(dossier.prestataire_nom || '')}</span>
        <span>${_execStatusBadge(dossier.statut)}</span>
        <span style="color:var(--text-muted);font-style:italic;">${_esc(notifObjet)}</span>
        <button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="execCloseSlider()" title="${te('retour_liste_activites')}">
            ${EXEC_ICONS.back} Retour à la liste d'activités
        </button>
    </div>`;
    const headerHtml = `
    ${obsRetour && dossier.statut === 'brouillon' && step === 'redaction' ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
        <div style="font-weight:600;color:#92400e;margin-bottom:0.25rem;">${EXEC_ICONS.alarm} Observations du validateur :</div>
        <div style="color:#78350f;white-space:pre-wrap;">${_esc(obsRetour)}</div>
    </div>` : ''}`;

    // Workflow stepper (numbered circles with connectors)
    const stepperHtml = `<div class="exec-wf-stepper" id="dossier_step_bar">
        ${DOSSIER_WORKFLOW_STEPS.map((s, i) => {
            const st = _dossierStepState(dossier, s.id);
            const isActive = step === s.id;
            const cls = isActive ? 'active' : (st.closed ? 'completed' : (st.unlocked ? '' : 'locked'));
            const inner = st.closed && !isActive ? '✓' : (i + 1);
            return `<button class="exec-wf-step ${cls}" ${st.unlocked ? `onclick="execSwitchDossierStep('${dossierId}','${s.id}')"` : 'disabled'}>
                <div class="wf-circle">${inner}</div>
                <div class="wf-label">${_esc(s.label)}</div>
            </button>`;
        }).join('')}
    </div>`;

    const bodyInner = _buildDossierStepContent(step, dossier, dossierId, subtab);
    const bodyHtml = `${headerHtml}${stepperHtml}<div id="dossier_step_content">${bodyInner}</div>`;

    const footerHtml = _buildDossierFooter(step, dossier, dossierId);

    _execFadeSliderContent(titleHtml, bodyHtml, footerHtml, 'max');
    const slider = document.getElementById('execSlider');
    if (slider) slider.setAttribute('data-hide-close', '1');
    // Ensure footer exists even if empty when first rendered
    if (slider && !slider.querySelector('.exec-slider-footer') && footerHtml) {
        const footerDiv = document.createElement('div');
        footerDiv.className = 'exec-slider-footer';
        footerDiv.innerHTML = footerHtml;
        slider.appendChild(footerDiv);
    }
}

function _buildDossierStepContent(step, dossier, dossierId, subtab) {
    if (step === 'notification') return _buildStepNotification(dossier, dossierId);
    if (step === 'realisation') return _buildStepRealisation(dossier, dossierId);
    if (step === 'redaction') return _buildStepRedaction(dossier, dossierId, subtab);
    if (step === 'validation') return _buildStepValidation(dossier, dossierId);
    return '';
}

function _buildStepNotification(dossier, dossierId) {
    // Read-only view of all notification data (mirrors the notification form)
    const bg = 'background:var(--bg);';
    const notifObjet = dossier.notification_objet || dossier.objet_activite || '';
    const notifDateDebut = dossier.notif_date_debut || dossier.date_debut_execution || '';
    const notifDateFin = dossier.notif_date_fin || dossier.date_fin_execution || '';
    const notifPerimetre = dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const notifRefs = dossier.notif_referentiels || '';
    const notifDocs = dossier.notif_documents_requis || '';

    // Parse equipe
    let equipeHtml = '<span style="color:var(--text-muted);">-</span>';
    try {
        const eq = typeof dossier.notif_equipe === 'string' ? JSON.parse(dossier.notif_equipe || '[]') : (dossier.notif_equipe || []);
        if (eq.length > 0) {
            equipeHtml = `<table class="exec-data-table" style="font-size:0.83rem;">
                <thead><tr><th>${te('col_nom')}</th><th>${te('col_role')}</th></tr></thead>
                <tbody>${eq.map(m => {
                    const nom = typeof m === 'string' ? m : (m.nom || '');
                    const role = typeof m === 'object' ? (m.role || '') : '';
                    return `<tr><td>${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
                }).join('')}</tbody>
            </table>`;
        }
    } catch(e) {}

    // Parse programme
    let programmeHtml = '<span style="color:var(--text-muted);">-</span>';
    try {
        const prog = typeof dossier.notif_programme === 'string' ? JSON.parse(dossier.notif_programme || '[]') : (dossier.notif_programme || []);
        if (Array.isArray(prog) && prog.length > 0) {
            programmeHtml = `<table class="exec-data-table" style="font-size:0.83rem;">
                <thead><tr><th>${te('date')}</th><th>${te('horaire')}</th><th>${te('actions_prevues')}</th><th>${te('correspondant')}</th></tr></thead>
                <tbody>${prog.map(p => `<tr>
                    <td>${_formatDate(p.date || '')}</td>
                    <td>${_esc(p.horaire || '')}</td>
                    <td>${_esc(p.actions || '')}</td>
                    <td>${_esc(p.correspondant || '')}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        }
    } catch(e) {}

    const pdfPath = dossier.notification_pdf_path || '';

    return `
    ${_execFormSection('A', 'section_a_prestataire', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('provider')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.prestataire_nom || dossier.notif_prestataire_designation || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('fonction_responsable')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_fonction_responsable || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('nom_responsable')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_nom_responsable || '')}" readonly style="${bg}">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('interlocuteur')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_nom')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur_nom || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_email')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur_email || '')}" readonly style="${bg}">
            </div>
        </div>
    `, true)}

    ${_execFormSection('B', 'section_b_equipe_audit', `
        ${equipeHtml}
    `, true)}

    ${_execFormSection('C1', 'section_c1_activite', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('nature_activite')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_nature || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_debut')}</label>
                <input type="text" class="form-input" value="${_formatDate(notifDateDebut)}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_fin')}</label>
                <input type="text" class="form-input" value="${_formatDate(notifDateFin)}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('lieu')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_lieu || '')}" readonly style="${bg}">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('objet')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifObjet)}</textarea>
            </div>
            <div class="form-group">
                <label>${te('perimetre')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifPerimetre)}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('referentiels')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifRefs)}</textarea>
            </div>
            <div class="form-group">
                <label>${te('documents_requis')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifDocs)}</textarea>
            </div>
        </div>
    `, true)}

    ${_execFormSection('C2', 'section_c2_programme', `
        ${programmeHtml}
    `, false)}

    ${_execFormSection('F', 'section_f_signature', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('fait_a')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_fait_a || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_signature')}</label>
                <input type="text" class="form-input" value="${_formatDate(dossier.notif_date_edition || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('signataire')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_signataire || '')}" readonly style="${bg}">
            </div>
        </div>
    `, false)}

    <div style="margin-top:1rem;">
        <label style="font-weight:600;">${te('fiche_notification')}</label>
        <div style="margin-top:0.35rem;">
            ${pdfPath ? `<a href="${_escAttr(_execDl(pdfPath))}" download class="btn btn-primary btn-sm" style="text-decoration:none;">${EXEC_ICONS.pdf} Exporter PDF</a>` :
            `<button class="btn btn-primary btn-sm" onclick="execGenerateNotificationPdf('${dossierId}')">${EXEC_ICONS.pdf} Exporter PDF</button>`}
        </div>
    </div>`;
}

function _buildStepRealisation(dossier, dossierId) {
    const st = _dossierStepState(dossier, 'realisation');
    const canEdit = st.editable;
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const bg = canEdit ? '' : 'background:var(--bg);';

    // Parse equipe (JSON array or fallback to string)
    let equipe = [];
    try {
        equipe = typeof dossier.realisation_equipe === 'string'
            ? JSON.parse(dossier.realisation_equipe || '[]')
            : (dossier.realisation_equipe || []);
    } catch(e) {
        // Legacy: plain text - convert to single entry
        if (dossier.realisation_equipe) equipe = [{ nom: dossier.realisation_equipe, role: '' }];
    }
    if (!Array.isArray(equipe)) equipe = [];

    // Parse programme (JSON array or fallback to string)
    let programme = [];
    try {
        programme = typeof dossier.realisation_programme === 'string'
            ? JSON.parse(dossier.realisation_programme || '[]')
            : (dossier.realisation_programme || []);
    } catch(e) {
        programme = [];
    }
    if (!Array.isArray(programme)) programme = [];

    const inspList = typeof _getFilteredInspecteurs === 'function' ? _getFilteredInspecteurs() : [];
    const roles = _execRolesEquipe();

    const equipeHtml = canEdit ? `
        <div id="realisation_equipe_container">
            ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
            equipe.map(m => {
                const nom = typeof m === 'string' ? m : (m.nom || '');
                const role = typeof m === 'object' ? (m.role || '') : '';
                return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                <select class="form-select real-equipe-nom" style="flex:1;">
                    <option value="">-- Inspecteur --</option>
                    ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                    ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_escAttr(nom)}" selected>${_esc(nom)}</option>` : ''}
                </select>
                <select class="form-select real-equipe-role" style="flex:1;">
                    <option value="">${te('select_option')}</option>
                    ${roles.map(r => `<option value="${_escAttr(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
            </div>`;
            }).join('')}
        </div>
        <button class="btn btn-sm btn-outline" onclick="execAddRealisationEquipeMember()" style="margin-top:0.35rem;">
            ${EXEC_ICONS.add} ${te('ajouter_membre')}
        </button>` : `
        <table class="exec-data-table" style="font-size:0.83rem;">
            <thead><tr><th>${te('col_nom')}</th><th>${te('col_role')}</th></tr></thead>
            <tbody>${equipe.length === 0 ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">-</td></tr>` :
            equipe.map(m => {
                const nom = typeof m === 'string' ? m : (m.nom || '');
                const role = typeof m === 'object' ? (m.role || '') : '';
                return `<tr><td>${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
            }).join('')}</tbody>
        </table>`;

    const programmeHtml = `
        <table class="exec-data-table exec-prog-table" id="realisation_programme_table" style="width:100%;">
            <thead><tr>
                <th style="width:130px;">${te('date')}</th>
                <th style="width:90px;">${te('horaire')}</th>
                <th>${te('actions_prevues')}</th>
                <th style="width:170px;">${te('correspondant')}</th>
                ${canEdit ? '<th style="width:44px;"></th>' : ''}
            </tr></thead>
            <tbody>
                ${programme.length === 0 ? `<tr id="real_prog_empty"><td colspan="${canEdit ? 5 : 4}" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                programme.map((p, i) => `<tr data-prog-idx="${i}">
                    <td><input type="date" class="form-input" value="${p.date || ''}" data-field="date"${ro}></td>
                    <td><input type="text" class="form-input" value="${_escAttr(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"${ro}></td>
                    <td><textarea class="form-input" rows="2" data-field="actions" style="resize:vertical;"${ro}>${_esc(p.actions || '')}</textarea></td>
                    <td><input type="text" class="form-input" value="${_escAttr(p.correspondant || '')}" data-field="correspondant"${ro}></td>
                    ${canEdit ? `<td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>` : ''}
                </tr>`).join('')}
            </tbody>
        </table>
        ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="execAddRealisationProgrammeLine()" style="margin-top:0.4rem;">
            ${EXEC_ICONS.add} ${te('ajouter_programme')}
        </button>` : ''}
        <style>
            .exec-prog-table th, .exec-prog-table td { padding:0.2rem 0.35rem; }
            .exec-prog-table .form-input { padding:0.25rem 0.35rem; font-size:0.8rem; }
            .exec-prog-table textarea.form-input { min-height:34px; line-height:1.25; }
        </style>`;

    // ── Section Checklists — sélection via modal + boutons « Renseigner » ──
    const allChecklists = EXEC_STATE.data.checklists || [];
    let selectedChIds = [];
    try {
        selectedChIds = typeof dossier.realisation_checklists === 'string'
            ? JSON.parse(dossier.realisation_checklists || '[]')
            : (Array.isArray(dossier.realisation_checklists) ? dossier.realisation_checklists : []);
    } catch (e) { selectedChIds = []; }
    if (!Array.isArray(selectedChIds)) selectedChIds = [];

    const selectedHtml = selectedChIds.length === 0
        ? `<p style="color:var(--text-muted);font-size:0.83rem;margin:0;">${te('aucune_checklist_selectionnee')}</p>`
        : selectedChIds.map(id => {
            const c = allChecklists.find(x => x.id === id);
            if (!c) return '';
            return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;border:1px solid var(--border);border-radius:6px;background:#fff;">
                <strong style="font-size:0.83rem;flex:1;">${c.reference ? _esc(c.reference) + ' — ' : ''}${_esc(c.nom)}</strong>
                <button type="button" class="btn btn-sm btn-primary" onclick="execOpenChecklistFiller('${dossierId}','${c.id}')">${te('renseigner_checklist_btn')}</button>
                ${canEdit ? `<button type="button" class="btn btn-sm btn-ghost" onclick="execRemoveDossierChecklist('${dossierId}','${c.id}')" title="Retirer" style="color:#ef4444;">✕</button>` : ''}
            </div>`;
        }).filter(Boolean).join('');
    const checklistsHtml = `<div style="display:flex;flex-direction:column;gap:0.4rem;">
        ${selectedHtml}
        ${canEdit ? `<div style="margin-top:0.4rem;">
            <button type="button" class="btn btn-sm btn-outline" onclick="execOpenChecklistsPicker('${dossierId}')">
                ${EXEC_ICONS.add} Sélectionner des checklists
            </button>
        </div>` : ''}
    </div>`;

    // Valeurs pré-remplies depuis la Notification (réutilisées si la réalisation n'a pas encore été modifiée)
    const vNature = dossier.realisation_nature || dossier.notif_nature || '';
    const vDateDebut = (dossier.realisation_date_debut || dossier.notif_date_debut || '').slice(0, 10);
    const vDateFin = (dossier.realisation_date_fin || dossier.notif_date_fin || '').slice(0, 10);
    const vLieu = dossier.realisation_lieu || dossier.notif_lieu || dossier.notif_fait_a || '';
    const vPerimetre = dossier.realisation_perimetre || dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const vObjet = dossier.realisation_activite || dossier.notification_objet || dossier.objet_activite || '';

    // Pièces jointes de l'activité
    let pjs = [];
    try {
        pjs = typeof dossier.realisation_pieces_jointes === 'string'
            ? JSON.parse(dossier.realisation_pieces_jointes || '[]')
            : (dossier.realisation_pieces_jointes || []);
    } catch (e) { pjs = []; }
    if (!Array.isArray(pjs)) pjs = [];
    const pjHtml = `<div id="realisation_pj_list">${pjs.map((pj) => _execRealisationPjRow(pj, canEdit)).join('')}</div>
        ${canEdit ? `<div style="margin-top:0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="document.getElementById('realisation_pj_input').click()">
                ${EXEC_ICONS.upload} ${te('televerser_pj')}
            </button>
            <input type="file" id="realisation_pj_input" style="display:none;" multiple onchange="execUploadRealisationPj(this.files)">
        </div>` : (pjs.length ? '' : `<p class="exec-real-vide">${te('aucune_piece_jointe')}</p>`)}`;

    const compteur = (n) => `<span class="exec-real-compteur">${n}</span>`;

    // Cinq sections, chacune avec sa lettre, son intitulé et son compteur :
    // le cadre de l'activité, l'équipe, le programme, les checklists et les
    // pièces jointes.
    return `
    <div class="exec-real">
        <div class="exec-real-bandeau">
            <span>${EXEC_ICONS.info || EXEC_ICONS.alarm || ''}</span>
            <p>${te('realisation_intro')}</p>
            ${canEdit ? '' : `<span class="exec-real-lecture">${te('lecture_seule')}</span>`}
        </div>

        ${_execFormSection('A', 'real_section_cadre', `
            <div class="exec-real-grille-4">
                <div class="form-group">
                    <label>${te('real_nature')}</label>
                    <input type="text" class="form-input" id="realisation_nature" value="${_escAttr(vNature)}" style="${bg}"${ro}>
                </div>
                <div class="form-group">
                    <label>${te('date_debut')}</label>
                    <input type="date" class="form-input" id="realisation_date_debut" value="${_escAttr(vDateDebut)}" style="${bg}"${ro}
                           onchange="oasisDatesBorner({ debut: 'realisation_date_debut', fin: 'realisation_date_fin' })">
                </div>
                <div class="form-group">
                    <label>${te('date_fin')}</label>
                    <input type="date" class="form-input" id="realisation_date_fin" value="${_escAttr(vDateFin)}" style="${bg}"${ro}
                           onchange="oasisDatesBorner({ debut: 'realisation_date_debut', fin: 'realisation_date_fin' })">
                </div>
                <div class="form-group">
                    <label>${te('lieu')}</label>
                    <input type="text" class="form-input" id="realisation_lieu" value="${_escAttr(vLieu)}" style="${bg}"${ro}>
                </div>
            </div>
            <div class="exec-real-grille-2">
                <div class="form-group">
                    <label>${te('objet')}</label>
                    <textarea class="form-input" id="realisation_activite" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vObjet)}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('perimetre')}</label>
                    <textarea class="form-input" id="realisation_perimetre" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vPerimetre)}</textarea>
                </div>
            </div>
        `, true)}

        ${_execFormSection('B', 'real_section_equipe', equipeHtml, true, compteur(equipe.length), te('real_aide_equipe'))}

        ${_execFormSection('C', 'real_section_programme', programmeHtml, true, compteur(programme.length), te('real_aide_programme'))}

        ${_execFormSection('D', 'real_section_checklists', checklistsHtml, true, compteur(selectedChIds.length), te('real_aide_checklists'))}

        ${_execFormSection('E', 'real_section_pj', pjHtml, true, compteur(pjs.length), te('real_aide_pj'))}
    </div>`;
}

// Rendu d'une ligne de pièce jointe (nom éditable + description + lien fichier)
function _execRealisationPjRow(pj, canEdit) {
    const filename = (pj && (pj.filename || pj.name)) || '';
    const description = (pj && pj.description) || '';
    const path = (pj && pj.path) || '';
    const origName = (pj && pj.orig_name) || filename;
    const dis = canEdit ? '' : ' readonly';
    return `<div class="realisation-pj-item" data-path="${_escAttr(path)}" data-orig="${_escAttr(origName)}"
        style="border:1px solid var(--border);border-radius:8px;padding:0.6rem;margin-bottom:0.5rem;">
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;">
            ${EXEC_ICONS.file}
            ${path ? `<a href="${_escAttr(_execDl(path))}" download="${_escAttr(origName)}" style="font-size:0.78rem;color:var(--primary);">${_esc(origName)}</a>` : `<span style="font-size:0.78rem;color:var(--text-muted);">${_esc(origName)}</span>`}
            ${canEdit ? `<button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="this.closest('.realisation-pj-item').remove()">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:0.5rem;">
            <input type="text" class="form-input pj-nom" value="${_escAttr(filename)}" placeholder="${te('nom_fichier')}"${dis}>
            <input type="text" class="form-input pj-desc" value="${_escAttr(description)}" placeholder="Description (optionnel)"${dis}>
        </div>
    </div>`;
}

// Téléverse une ou plusieurs pièces jointes et les ajoute à la liste de la Réalisation.
async function execUploadRealisationPj(files) {
    if (!files || !files.length) return;
    const container = document.getElementById('realisation_pj_list');
    if (!container) return;
    for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                body: fd
            });
            const data = await res.json();
            if (data.status === 'ok') {
                container.insertAdjacentHTML('beforeend', _execRealisationPjRow({
                    filename: data.filename || file.name,
                    orig_name: data.filename || file.name,
                    description: '',
                    path: data.path || ''
                }, true));
            }
        } catch (e) { console.error('Upload PJ error:', e); }
    }
}

// Collecte les pièces jointes saisies dans le DOM
function _collectRealisationPj() {
    return Array.from(document.querySelectorAll('#realisation_pj_list .realisation-pj-item')).map(el => ({
        filename: (el.querySelector('.pj-nom')?.value || '').trim(),
        description: (el.querySelector('.pj-desc')?.value || '').trim(),
        path: el.dataset.path || '',
        orig_name: el.dataset.orig || ''
    }));
}

// Enregistre les pièces jointes de l'activité depuis l'étape Rédaction du rapport.
async function execSaveRedactionPj(dossierId) {
    const pjs = _collectRealisationPj();
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ realisation_pieces_jointes: JSON.stringify(pjs) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.realisation_pieces_jointes = JSON.stringify(pjs);
        }
        await execRefreshDynamic();
        _execToast(te('pj_enregistrees'), 'success');
    } catch (e) {
        console.error('Save redaction PJ error:', e);
        _execToast(te('err_enregistrement'), 'error');
    }
}

function _buildStepRedaction(dossier, dossierId, subtab) {
    const st = _dossierStepState(dossier, 'redaction');
    const canEdit = st.editable;
    const constatations = dossier.constatations || [];

    // Show collapsible comments panel if rapport was returned with comments
    let commentsPanel = '';
    const rapports = (dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0));
    const lastRap = rapports[0];
    if (lastRap && lastRap.commentaires_apercu && lastRap.commentaires_apercu.trim() && dossier.statut === 'brouillon') {
        commentsPanel = `
        <details open style="margin-bottom:1rem;border:1px solid #f59e0b;border-radius:8px;background:#fef3c7;">
            <summary style="cursor:pointer;padding:0.75rem;font-weight:600;color:#92400e;font-size:0.85rem;">
                ${EXEC_ICONS.alarm} Commentaires du validateur sur le rapport (v${lastRap.version || 1})
            </summary>
            <div style="padding:0 0.75rem 0.75rem;white-space:pre-wrap;font-size:0.83rem;color:#78350f;">${_esc(lastRap.commentaires_apercu)}</div>
        </details>`;
    }

    // Les anciennes sous-étapes deviennent des sections : le rapport se lit et
    // se saisit d'une traite, et un enregistrement les couvre toutes — l'onglet
    // actif ne masque plus le reste.
    const sections = REDACTION_SUBTABS.map((sub, i) => {
        const lettre = EXEC_REDACTION_LETTRES[sub.id] || String.fromCharCode(65 + i);
        const corps = _buildRedactionSubtabContent(sub.id, dossier, dossierId, canEdit);
        const badge = sub.id === 'constatations' ? String(constatations.length) : '';
        return _execFormSection(lettre, `redac_section_${sub.id}`, corps, true, badge,
            te(`redac_aide_${sub.id}`));
    }).join('');
    return `${commentsPanel}<div class="exec-real" id="dossier_redaction_sections">`
        + `${_execTypeRapportChamp(dossier, canEdit)}${sections}</div>`;
}

// ── Type de rapport ──────────────────────────────────────────────
// L'intitulé que portera le document produit. Il précède les sections :
// c'est la première chose à arrêter, puisqu'elle nomme tout le rapport.
const EXEC_TYPES_RAPPORT = [
    "RAPPORT D'AUDIT", "RAPPORT D'INSPECTION", 'RAPPORT DE SUIVI',
    "RAPPORT D'ENQUÊTE", 'AUTRE',
];

function _execTypeRapportChamp(dossier, canEdit) {
    const choisi = dossier.type_rapport || '';
    const libre = dossier.type_rapport_autre || '';
    const estAutre = choisi === 'AUTRE';
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const roBg = canEdit ? '' : 'background:var(--bg);';
    return `
    <div class="exec-type-rapport">
        <div class="form-group" id="dossier_type_rapport_autre_group" style="${estAutre ? '' : 'display:none;'}">
            <label>${te('intitule_rapport')}</label>
            <input type="text" class="form-input" id="dossier_type_rapport_autre" value="${_escAttr(libre)}"
                   placeholder="${te('ex_intitule_rapport')}"${ro} style="${roBg}">
        </div>
        <div class="form-group">
            <label>${te('type_rapport')}</label>
            <select class="form-input" id="dossier_type_rapport" onchange="execTypeRapportChange()"${dis} style="${roBg}">
                <option value="">${te('selectionner_vide')}</option>
                ${EXEC_TYPES_RAPPORT.map((t) => `<option value="${_escAttr(t)}"${t === choisi ? ' selected' : ''}>${_esc(t)}</option>`).join('')}
            </select>
        </div>
    </div>`;
}

function execTypeRapportChange() {
    const select = document.getElementById('dossier_type_rapport');
    const groupe = document.getElementById('dossier_type_rapport_autre_group');
    if (!select || !groupe) return;
    const estAutre = select.value === 'AUTRE';
    groupe.style.display = estAutre ? '' : 'none';
    if (estAutre) document.getElementById('dossier_type_rapport_autre')?.focus();
}

// Intitulé porté par le document produit : le choix fait ici prime ; à défaut,
// la nature de l'activité notifiée continue de nommer le rapport.
function _execIntituleRapport(dossier, defaut) {
    const choisi = String((dossier || {}).type_rapport || '').trim();
    if (choisi === 'AUTRE') {
        const libre = String(dossier.type_rapport_autre || '').trim();
        if (libre) return libre.toUpperCase();
    } else if (choisi) {
        return choisi;
    }
    return defaut;
}

// Correspondance sous-étape → lettre de section, pour l'ancrage.
const EXEC_REDACTION_LETTRES = {
    introduction: 'A', synthese: 'B', checklists: 'C', constatations: 'D',
    conclusion: 'E', annexes: 'F',
};

function _buildRedactionSubtabContent(tab, dossier, dossierId, canEdit) {
    return _buildDossierTabContent(tab, dossier, dossierId, canEdit, _dossierDefaults(dossier));
}

function _dossierDefaults(dossier) {
    // Prefer realisation data (most up-to-date) over notification data
    const notifObjet = dossier.realisation_activite || dossier.notification_objet || dossier.objet_activite || '';
    const notifDateDebut = dossier.notif_date_debut || dossier.date_debut_execution || '';
    const notifDateFin = dossier.notif_date_fin || dossier.date_fin_execution || '';
    const notifDates = notifDateDebut ? `${_formatDate(notifDateDebut)} - ${_formatDate(notifDateFin)}` : '';

    // Equipe: prefer realisation equipe over notification equipe
    let notifEquipe = '';
    try {
        let eq = [];
        const realEq = dossier.realisation_equipe;
        if (realEq) {
            eq = typeof realEq === 'string' ? JSON.parse(realEq || '[]') : (realEq || []);
        }
        if (!Array.isArray(eq) || eq.length === 0) {
            eq = typeof dossier.notif_equipe === 'string' ? JSON.parse(dossier.notif_equipe || '[]') : (dossier.notif_equipe || []);
        }
        notifEquipe = (eq || []).map(m => {
            const nom = typeof m === 'string' ? m : (m.nom || '');
            const role = typeof m === 'object' ? (m.role || '') : '';
            return nom ? `- ${nom}${role ? ', ' + role : ''}` : '';
        }).filter(Boolean).join('\n');
    } catch(e) {}

    const notifPerimetre = dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const notifRefs = [dossier.notif_referentiels || '', dossier.notif_documents_requis || ''].filter(Boolean).join('\n');

    // Programme: prefer realisation programme
    let notifProgramme = [];
    try {
        const realProg = dossier.realisation_programme;
        if (realProg) {
            notifProgramme = typeof realProg === 'string' ? JSON.parse(realProg || '[]') : (realProg || []);
        }
        if (!Array.isArray(notifProgramme) || notifProgramme.length === 0) {
            const np = dossier.notif_programme;
            notifProgramme = typeof np === 'string' ? JSON.parse(np || '[]') : (np || []);
        }
    } catch(e) {}
    if (!Array.isArray(notifProgramme)) notifProgramme = [];

    return { notifObjet, notifDates, notifEquipe, notifPerimetre, notifRefs, notifProgramme };
}

function _buildStepValidation(dossier, dossierId) {
    const toutes = (dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0));
    // À la Transmission, l'historique des versions n'a plus cours : seule la
    // version validée est en jeu, c'est elle qui part au prestataire.
    const surTransmission = _execSurTransmission();
    const rapports = surTransmission
        ? toutes.filter(r => ['valide', 'transmis'].includes(r.statut))
        : toutes;
    const lastRap = rapports[0];
    const courriel = surTransmission && lastRap ? _execCourrielTransmission(dossier, lastRap) : '';
    return `
    ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${te(surTransmission ? 'aucun_rapport_valide' : 'aucun_rapport_soumis')}</p>` : `
    <div style="overflow-x:auto;">
    <table class="exec-data-table">
        <thead><tr>
            <th>${te('ref_rapport')}</th>
            <th>Version</th>
            <th>${te('titre_rapport')}</th>
            <th>${te('date_emission')}</th>
            <th>${te('statut_validation')}</th>
            <th>${te('actions')}</th>
        </tr></thead>
        <tbody>
            ${rapports.map(r => {
                const isLast = lastRap && r.id === lastRap.id;
                const hasComments = r.commentaires_apercu && r.commentaires_apercu.trim();
                return `<tr>
                <td><strong>${_esc(r.reference || '')}</strong></td>
                <td>v${r.version || 1}</td>
                <td>${_esc(r.titre || '')}</td>
                <td>${_formatDate(r.date_creation)}</td>
                <td>${_execStatusBadge(r.statut)}</td>
                <td><div class="exec-cellule-boutons serre plie">
                    <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                        ${EXEC_ICONS.eye} ${te('apercu')}
                    </button>
                    ${isLast && r.statut === 'soumis' && _execCanValidate() ? `
                    <button class="btn btn-sm btn-outline" style="color:#d97706;border-color:#d97706;" onclick="execReturnDossier('${dossierId}')">
                        ${EXEC_ICONS.back} Renvoyer
                    </button>` : ''}
                </div></td>
            </tr>
            ${hasComments ? `<tr>
                <td colspan="6" style="padding:0;">
                    <details style="padding:0.5rem 1rem;background:var(--bg);border-radius:4px;margin:0.25rem 0;">
                        <summary style="cursor:pointer;font-size:0.83rem;font-weight:600;color:var(--text-muted);">
                            ${EXEC_ICONS.clipboard} Commentaires sur le rapport (v${r.version || 1})
                        </summary>
                        <div style="white-space:pre-wrap;font-size:0.83rem;margin-top:0.5rem;padding:0.5rem;background:var(--surface);border-radius:4px;border:1px solid var(--border);">${_esc(r.commentaires_apercu)}</div>
                    </details>
                </td>
            </tr>` : ''}`;}).join('')}
        </tbody>
    </table>
    </div>`}
    ${courriel}`;
}

// ── Transmission par courriel ────────────────────────────────────
// Consulte-t-on l'étape Transmission ? Le formulaire Dossier ne connaît que
// « Validation » : c'est le fil du processus qui distingue les deux.
function _execSurTransmission() {
    return typeof EXEC_PROC !== 'undefined' && !!EXEC_PROC && !!EXEC_PROC.actif
        && EXEC_PROC.etape === 'transmission';
}

// Adresse du destinataire : celle retenue à la notification, sinon celle du
// point focal du prestataire.
function _execAdressePrestataire(dossier) {
    const prest = (EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id) || {};
    return dossier.notif_interlocuteur_email || dossier.interlocuteur_email
        || prest.email_point_focal || prest.email_prestataire || '';
}

function _execCourrielTransmission(dossier, rapport) {
    const dejaTransmis = rapport.statut === 'transmis';
    const intitule = _execIntituleRapport(dossier, 'RAPPORT DE SURVEILLANCE');
    const objet = `${intitule} ${rapport.reference || ''} — ${dossier.prestataire_nom || ''}`.trim();
    const message = [
        `${dossier.notif_interlocuteur_nom ? `${dossier.notif_interlocuteur_nom},` : 'Madame, Monsieur,'}`,
        '',
        `Le rapport ${rapport.reference || ''} relatif à l'activité de surveillance `
            + `« ${dossier.objet_activite || dossier.notification_objet || ''} » est mis à votre `
            + 'disposition dans OASIS. Les liens de téléchargement figurent au bas de ce message.',
        '',
        'Les constatations qu\'il porte appellent, le cas échéant, un plan d\'actions correctives '
            + 'à soumettre dans les délais indiqués.',
        '',
        'Nous vous prions d\'agréer nos salutations distinguées.',
    ].join('\n');
    const ro = dejaTransmis ? ' readonly' : '';

    return `
    <div class="exec-courriel" id="exec_courriel_transmission">
        <div class="exec-courriel-entete">
            <span>${EXEC_ICONS.send}</span>
            <h4>${te('transmission_rapport')}</h4>
            ${dejaTransmis ? `<span class="exec-courriel-etat">Transmis le ${_formatDate(rapport.date_transmission)}${
                rapport.transmis_a ? ` à ${_esc(rapport.transmis_a)}` : ''}</span>` : ''}
        </div>
        <div class="form-group">
            <label>Destinataire</label>
            <input type="text" class="form-input" id="courriel_destinataire"
                   value="${_escAttr(dejaTransmis ? (rapport.transmis_a || '') : _execAdressePrestataire(dossier))}"
                   placeholder="${te('ex_adresse_prestataire')}"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="${te('adresses_virgules')}"${ro}>
            </div>
            <div class="form-group">
                <label>${te('copie_cachee')}</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="${te('adresses_virgules')}"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>${te('objet')}</label>
            <input type="text" class="form-input" id="courriel_objet" value="${_escAttr(objet)}"${ro}>
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea class="form-input" id="courriel_message" rows="8" style="resize:vertical;"${ro}>${_esc(message)}</textarea>
        </div>
        <div class="form-group">
            <label>Documents transmis</label>
            <p class="exec-courriel-note">Le message ne porte aucune pièce jointe : il annonce des liens
               de téléchargement, que le prestataire suit depuis son compte OASIS.</p>
            <div id="courriel_pieces">
                <div class="exec-piece exec-piece-rapport">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien((rapport.document || {}).path, `${rapport.reference || 'rapport'}.pdf`,
                        `execDownloadRapport('${rapport.id}', false)`)}
                    <span class="exec-piece-mention">${te('rapport_joint_office')}</span>
                </div>
                ${(dejaTransmis ? (rapport.pieces_transmises || []) : []).map(f => `
                <div class="exec-piece">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien(f.path, f.intitule || f.filename || '')}
                    <span class="exec-piece-mention">${_esc(f.filename || '')}</span>
                </div>`).join('')}
            </div>
            ${dejaTransmis ? '' : `
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.upload} Ajouter un fichier
            </button>
            <input type="file" style="display:none;" multiple onchange="execCourrielAjouterFichiers(this)">`}
        </div>
        <div class="exec-courriel-pied">
            ${dejaTransmis ? '' : `
            <button class="btn btn-primary btn-sm" id="courriel_envoyer"
                    onclick="execTransmettreRapport('${rapport.id}')">
                ${EXEC_ICONS.send} Envoyer
            </button>`}
        </div>
    </div>`;
}

// Chaque document listé s'ouvre d'un clic, sous son intitulé. Tant que le
// rapport n'est pas parti, son document n'existe pas encore sur le serveur :
// c'est l'aperçu qui en tient lieu.
function _execPieceLien(chemin, intitule, repli) {
    const nom = _esc(intitule || '');
    if (chemin) {
        // La session suffit à autoriser la lecture : rien à porter dans l'URL.
        const url = `${chemin}${chemin.includes('?') ? '&' : '?'}nom=${encodeURIComponent(intitule || '')}`;
        return `<a class="exec-piece-nom" href="${_escAttr(url)}" target="_blank" rel="noopener"
                   title="Ouvrir ${nom}">${nom}</a>`;
    }
    if (repli) {
        return `<a class="exec-piece-nom" href="#" onclick="event.preventDefault();${_escAttr(repli)}"
                   title="${te('apercu_rapport')}">${nom}</a>`;
    }
    return `<span class="exec-piece-nom">${nom}</span>`;
}

// Pièces complémentaires à transmettre : le fichier est déposé dès sa
// sélection ; l'intitulé, modifiable, est ce que le prestataire lira.
async function execCourrielAjouterFichiers(input) {
    const conteneur = document.getElementById('courriel_pieces');
    if (!conteneur || !input.files || !input.files.length) return;
    for (const fichier of [...input.files]) {
        const formData = new FormData();
        formData.append('file', fichier);
        formData.append('nom', fichier.name);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(oasisMessageErreur(data, res.status, te('televersement_refuse')));
            const ligne = document.createElement('div');
            ligne.className = 'exec-piece';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `
                <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                <input type="text" class="form-input exec-piece-intitule" value="${_escAttr(data.filename)}"
                       placeholder="${te('intitule_document')}">
                <a class="exec-piece-ouvrir" href="${_escAttr(data.path)}" target="_blank" rel="noopener"
                   title="${te('ouvrir_document')}">${EXEC_ICONS.eye || 'Ouvrir'}</a>
                <span class="exec-piece-mention">${_esc(_execTaille(data.size))}</span>
                <button class="btn btn-sm btn-ghost exec-piece-retirer" title="Retirer"
                        onclick="this.closest('.exec-piece').remove()">${EXEC_ICONS.x}</button>`;
            conteneur.appendChild(ligne);
        } catch (e) {
            console.error('Téléversement :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || te('televersement_impossible')}`, 'error');
        }
    }
    input.value = '';
}

function _execTaille(octets) {
    const n = Number(octets) || 0;
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function _execCourrielFichiers() {
    return [...document.querySelectorAll('#courriel_pieces .exec-piece[data-path]')].map(l => ({
        path: l.dataset.path,
        filename: l.dataset.filename || '',
        intitule: (l.querySelector('.exec-piece-intitule') || {}).value || l.dataset.filename || '',
    }));
}

async function execTransmettreRapport(rapportId) {
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const destinataire = val('courriel_destinataire').trim();
    if (!destinataire) { _execToast(te('indiquez_destinataire'), 'error'); return; }
    const bouton = document.getElementById('courriel_envoyer');
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }
    try {
        // Le document déposé est celui que l'aperçu produit : une seule source.
        const html = await execDownloadRapport(rapportId, false, true);
        if (!html) throw new Error('Rapport indisponible');
        const rapport = ((EXEC_STATE.selectedDossier || {}).rapports || [])
            .find(r => r.id === rapportId) || {};
        const remise = await api(`${EXEC_MODULE_API}/rapports/${rapportId}/transmettre`, {
            method: 'POST',
            body: JSON.stringify({
                destinataire,
                copie: val('courriel_copie'),
                copie_cachee: val('courriel_copie_cachee'),
                objet: val('courriel_objet'),
                message: val('courriel_message'),
                // Le serveur rend cette mise en page en PDF : il lui faut le
                // document tel quel, non enveloppé pour Word.
                piece: { nom: `${rapport.reference || 'rapport'}.pdf`, contenu: html },
                fichiers: _execCourrielFichiers(),
            }),
        });
        // Sans serveur de messagerie configuré, la remise est acquise mais
        // aucun message n'est parti : il faut le dire.
        _execToast(remise && remise.envoye === false
            ? te('transmis_sans_courriel')
            : 'Rapport transmis au prestataire', remise && remise.envoye === false ? 'warning' : 'success');
        // Le fil d'avancement lit son propre exemplaire du dossier : sans
        // rechargement, l'étape resterait « à traiter » après l'envoi.
        if (_execSurTransmission() && typeof execProcRecharger === 'function') {
            await execProcRecharger('transmission');
            return;
        }
        await execRefreshDynamic();
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Transmission rapport :', e);
        _execToast((e && e.message) || te('err_transmission'), 'error');
        if (bouton) { bouton.disabled = false; bouton.innerHTML = `${EXEC_ICONS.send} Envoyer`; }
    }
}

function _buildDossierFooter(step, dossier, dossierId) {
    const isCloture = dossier.statut === 'cloture';
    const hasTransmitted = (dossier.rapports || []).some(r => r.statut === 'transmis');
    const realSt = _dossierStepState(dossier, 'realisation');
    const redSt = _dossierStepState(dossier, 'redaction');
    const lastRap = ((dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0)))[0];
    const hasValidated = (dossier.rapports || []).some(r => ['valide','transmis'].includes(r.statut));

    let buttons = '';
    if (step === 'realisation' && realSt.editable) {
        buttons += `
        <button class="btn btn-primary" onclick="execSaveRealisation('${dossierId}')">${EXEC_ICONS.clipboard} Enregistrer</button>
        <button class="btn btn-accent" onclick="execCloseRealisation('${dossierId}')">${EXEC_ICONS.check} Clôturer Exécution sur le Terrain</button>`;
    }
    if (step === 'redaction' && redSt.editable) {
        buttons += `
        <button class="btn btn-primary" onclick="execSaveDossier('${dossierId}')">${EXEC_ICONS.clipboard} Brouillon</button>
        <button class="btn btn-accent" onclick="execSubmitDossier('${dossierId}')">${EXEC_ICONS.send} Soumettre</button>`;
    }
    if (step === 'validation' && _execCanValidate() && !isCloture) {
        if (lastRap && lastRap.statut === 'soumis') {
            buttons += `<button class="btn btn-success" onclick="execValidateRapport('${lastRap.id}')">${EXEC_ICONS.check} Valider</button>`;
        }
        if (hasValidated && lastRap) {
            // Une fois le rapport parti chez le prestataire, il n'est plus
            // amendable : la version transmise fait foi.
            if (!hasTransmitted) {
                buttons += `<button class="btn btn-outline" onclick="execAmendRapport('${lastRap.id}')">${EXEC_ICONS.edit} Amender</button>`;
            }
            // À la Transmission, l'envoi se fait depuis le formulaire de
            // courriel : un second bouton transmettrait sans destinataire.
            if (!hasTransmitted && !_execSurTransmission()) {
                buttons += `<button class="btn btn-accent" onclick="execSendRapportValidated('${lastRap.id}')">${EXEC_ICONS.send} Envoyer</button>`;
            }
            // La clôture n'est offerte qu'une fois le rapport transmis.
            if (hasTransmitted) {
                buttons += `<button class="btn btn-success" onclick="execCloseDossier('${dossierId}')">${EXEC_ICONS.check} ${te('cloture')}</button>`;
            }
        }
    }
    return buttons;
}

function execSwitchDossierStep(dossierId, stepId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier) return;
    const st = _dossierStepState(dossier, stepId);
    if (!st.unlocked) return;
    EXEC_STATE.dossierStep = stepId;
    // Full re-render to refresh stepper visual state + phase title + footer
    _renderDossierSliderContent(dossierId);
}

// Les sous-étapes sont devenues des sections : « aller à » revient à ouvrir la
// section visée et à l'amener sous les yeux.
function execSwitchRedactionSubtab(dossierId, subtabId) {
    EXEC_STATE.dossierRedactionSubtab = subtabId;
    const lettre = EXEC_REDACTION_LETTRES[subtabId];
    const section = lettre && document.getElementById(`exec-section-${lettre}`);
    if (!section) return;
    section.classList.add('expanded');
    section.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function _buildDossierTabContent(tab, dossier, dossierId, canEdit, defaults) {
    const ro = canEdit ? '' : ' readonly';
    const roBg = canEdit ? '' : 'background:var(--bg);';

    if (tab === 'introduction') return _dossierOngletIntroduction(dossier, ro, roBg, defaults);
    if (tab === 'checklists') return _dossierOngletChecklists(dossier, dossierId, canEdit);
    if (tab === 'synthese') return _dossierOngletSynthese(dossier, ro, roBg);
    if (tab === 'constatations') return _dossierOngletConstatations(dossier, dossierId, canEdit);
    if (tab === 'conclusion') {
        return `
        <div class="form-group">
            <textarea class="form-input" id="dossier_conclusion" rows="5" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.conclusion || '')}</textarea>
        </div>`;
    }
    if (tab === 'annexes') return _dossierOngletAnnexes(dossier, canEdit);
    if (tab === 'rapports') return _dossierOngletRapports(dossier);
    return '';
}

// Onglet « Introduction » : dates, objet, description, équipe, périmètre, référentiel.
function _dossierOngletIntroduction(dossier, ro, roBg, defaults) {
    const { notifObjet, notifDates, notifEquipe, notifPerimetre, notifRefs } = defaults || {};
    return `
    <div style="display:grid;grid-template-columns:1fr 3fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>${te('date_execution')}</label>
            <input type="text" class="form-input" id="dossier_dates_activite" value="${_escAttr(dossier.dates_activite || notifDates || '')}"${ro} style="${roBg}">
        </div>
        <div class="form-group">
            <label>${te('objet_activite_label')}</label>
            <textarea class="form-input" id="dossier_objet_activite" rows="1" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.objet_activite || notifObjet || '')}</textarea>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>${te('description_activite_label')}</label>
            <textarea class="form-input" id="dossier_description_activite" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.description_activite || '')}</textarea>
        </div>
        <div class="form-group">
            <label>${te('equipe_inspection_label')}</label>
            <textarea class="form-input" id="dossier_equipe_inspection" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.equipe_inspection || notifEquipe || '')}</textarea>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>${te('aspects_couverts_label')}</label>
            <textarea class="form-input" id="dossier_aspects_couverts" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.aspects_couverts || notifPerimetre || '')}</textarea>
        </div>
        <div class="form-group">
            <label>${te('referentiel_label')}</label>
            <textarea class="form-input" id="dossier_referentiel" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.referentiel || notifRefs || '')}</textarea>
        </div>
    </div>`;
}

// Onglet « Checklists » : checklists et pièces jointes issues de l'étape Réalisation,
// puis les autres documents.
function _dossierOngletChecklists(dossier, dossierId, canEdit) {
    // ── Section Checklists renseignées (issues de l'étape Réalisation) ──
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const realChkIds = _parse(dossier.realisation_checklists);
    const validees = _parse(dossier.checklists_validees);
    const allChecklists = EXEC_STATE.data.checklists || [];
    const allItems = EXEC_STATE.data.checklistItems || [];
    const chkSectionHtml = realChkIds.length
        ? realChkIds.map(cid => {
            const c = allChecklists.find(x => x.id === cid);
            if (!c) return '';
            const nbItems = allItems.filter(i => i.checklist_id === cid).length;
            const isVal = validees.includes(cid);
            return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.7rem;border:1px solid var(--border);border-radius:6px;margin-bottom:0.4rem;background:#fff;">
                <span style="font-weight:600;font-size:0.85rem;flex:1;">${c.reference ? _esc(c.reference) + ' — ' : ''}${_esc(c.nom)}
                    <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem;">(${nbItems} item${nbItems>1?'s':''})</span>
                </span>
                ${isVal
                    ? `<span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.74rem;font-weight:700;">${te('validee_badge')}</span>`
                    : ''}
                <button class="btn btn-sm btn-outline" onclick="execOpenChecklistFiller('${dossierId}','${cid}')">${isVal ? '👁 Consulter' : '📝 Renseigner'}</button>
                ${canEdit ? (isVal
                    ? `<button class="btn btn-sm btn-ghost" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',false)" title="${te('annuler_validation')}">↩</button>`
                    : `<button class="btn btn-sm btn-primary" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',true)">${te('checklist_validee_btn')}</button>`) : ''}
            </div>`;
        }).filter(Boolean).join('')
        : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">${te('aucune_checklist_realisation')}</p>`;

    // ── Section Pièces jointes de l'activité (issues de l'étape Réalisation) ──
    let realPjs = [];
    try {
        realPjs = typeof dossier.realisation_pieces_jointes === 'string'
            ? JSON.parse(dossier.realisation_pieces_jointes || '[]')
            : (dossier.realisation_pieces_jointes || []);
    } catch (e) { realPjs = []; }
    if (!Array.isArray(realPjs)) realPjs = [];
    const pjRowsHtml = realPjs.map(pj => _execRealisationPjRow(pj, canEdit)).join('');
    const pjSectionHtml = `<div id="realisation_pj_list">${pjRowsHtml}</div>
        ${canEdit ? `
        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="document.getElementById('realisation_pj_input').click()">${EXEC_ICONS.upload} Ajouter / remplacer</button>
            <button class="btn btn-sm btn-primary" onclick="execSaveRedactionPj('${dossierId}')">${EXEC_ICONS.check} Enregistrer</button>
            <input type="file" id="realisation_pj_input" style="display:none;" multiple onchange="execUploadRealisationPj(this.files)">
        </div>`
        : (realPjs.length ? '' : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">${te('aucune_pj_realisation')}</p>`)}`;

    return `
    <div style="margin-bottom:1.25rem;">
        <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">${te('checklists_renseignees')}</h4>
        ${chkSectionHtml}
        ${canEdit ? `<button class="btn btn-sm btn-outline" style="margin-top:0.5rem;" onclick="execOpenChecklistsPicker('${dossierId}','checklists')">${EXEC_ICONS.add} Ajouter des checklists</button>` : ''}
    </div>
    <div style="margin-bottom:1.25rem;">
        <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">${te('real_section_pj')}</h4>
        ${pjSectionHtml}
    </div>
    <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Autres documents</h4>
    <div id="dossier_checklists_list">
        ${(dossier.checklists || []).map(cl => `
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(cl.path || '')}">
            ${EXEC_ICONS.file} <span style="flex:1;">${_esc(cl.filename || cl)}</span>
            ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>` : ''}
        </div>`).join('')}
    </div>
    ${canEdit ? `
    <div class="exec-upload-zone" style="margin-top:0.75rem;padding:1.5rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('dossier_checklist_input').click()">
        ${EXEC_ICONS.upload} ${te('upload_zone')}
        <input type="file" id="dossier_checklist_input" style="display:none;" multiple onchange="execUploadDossierFile(this.files, 'checklist')">
    </div>` : ''}`;
}

// Onglet « Synthèse » : points forts et faibles, opportunités, résumé global.
function _dossierOngletSynthese(dossier, ro, roBg) {
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>${te('points_forts')}</label>
            <textarea class="form-input" id="dossier_points_forts" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.synthese_points_forts || '')}</textarea>
        </div>
        <div class="form-group">
            <label>${te('points_faibles')}</label>
            <textarea class="form-input" id="dossier_points_faibles" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.synthese_points_faibles || '')}</textarea>
        </div>
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
        <label>${te('opportunites_amelioration')}</label>
        <textarea class="form-input" id="dossier_opportunites" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.opportunites_amelioration || '')}</textarea>
    </div>
    <div class="form-group">
        <label>${te('resume_global')}</label>
        <textarea class="form-input" id="dossier_resume_global" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.resume_global_constatations || '')}</textarea>
    </div>`;
}

// Onglet « Constatations » : la table du dossier et les fiches de chaque constatation.
function _dossierOngletConstatations(dossier, dossierId, canEdit) {
    const constatations = dossier.constatations || [];
    // Determine rapport validation status for the Modifier button
    const rapports = dossier.rapports || [];
    const hasRapportValide = rapports.some(r => r.statut === 'valide');
    const hasRapportTransmis = rapports.some(r => r.statut === 'transmis');
    const isAdmin = _execIsAdmin();
    return `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
        ${canEdit ? `
        <button class="btn btn-sm btn-danger" onclick="execOpenFNCForm('${dossierId}')">
            ${EXEC_ICONS.add} ${te('ajouter_constatation')}
        </button>` : ''}
        ${constatations.length > 0 ? `
        <button class="btn btn-primary btn-sm" onclick="execExportConstatations('${dossierId}','xlsx')" title="Exporter Excel">
            ${EXEC_ICONS.download || EXEC_ICONS.file} Exporter Excel
        </button>
        <button class="btn btn-primary btn-sm" onclick="execFichesConstatDossier('${dossierId}')" title="Exporter PDF">
            ${EXEC_ICONS.pdf || EXEC_ICONS.download || EXEC_ICONS.file} Exporter PDF
        </button>` : ''}
    </div>
    ${constatations.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${te('no_data')}</p>` : `
    <div style="overflow-x:auto;">
    <table class="exec-data-table" id="exec_constatations_table">
        <thead><tr>
            <th>${te('reference')}</th>
            <th>${te('criticite')}</th>
            <th style="min-width:180px;">${te('description_constatation')}</th>
            <th>${te('date_ouv_col')}</th>
            <th>${te('delai_col_court')}</th>
            <th>${te('date_due')}</th>
            <th>${te('preuves')}</th>
            <th>${te('status')}</th>
            <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
        </tr></thead>
        <tbody>
            ${constatations.map(c => {
                const preuves = c.preuves_constatation || [];
                const preuvesHtml = preuves.length > 0 ? preuves.map(p => {
                    const fname = typeof p === 'object' ? (p.filename || p.name || '') : p;
                    const fpath = typeof p === 'object' ? (p.path || '') : '';
                    return fpath ? `<a href="${_escAttr(_execDl(fpath))}" download="${_escAttr(fname)}" style="display:inline-flex;align-items:center;gap:0.2rem;font-size:0.8rem;color:var(--primary);">${EXEC_ICONS.file} ${_esc(fname)}</a>` : `<span style="font-size:0.8rem;">${_esc(fname)}</span>`;
                }).join('<br>') : '-';
                // Read-only when rapport validé/transmis or dossier clôturé (admin bypass)
                const isConstReadOnly = (hasRapportValide || hasRapportTransmis || dossier.statut === 'cloture') && !isAdmin;
                let modifierBtn = '';
                if (isConstReadOnly) {
                    modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execViewFNC('${dossierId}','${c.id}')" title="${te('consulter')}">${EXEC_ICONS.eye||'👁'}</button>`;
                } else {
                    modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execEditFNC('${dossierId}','${c.id}')" title="${te('modifier_fnc')}">${EXEC_ICONS.edit}</button>`;
                }
                const autoGenFlag = c.checklist_item_id
                    ? ` <span title="Cette constatation a été générée automatiquement à partir d'une checklist. Une revue de la constatation est nécessaire ainsi que sa validation." style="cursor:help;color:#f59e0b;font-size:0.95rem;">&#9888;</span>`
                    : '';
                return `<tr>
                <td><strong>${_esc(c.reference || '')}</strong>${autoGenFlag}</td>
                <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
                <td style="white-space:normal;word-break:break-word;">${_esc(c.description || c.titre || '')}</td>
                <td>${_formatDate(c.date_ouverture || '')}</td>
                <td>${_esc(c.delai_solde || c.delai_correction || '-')}</td>
                <td>${_formatDate(c.date_due_cloture || c.date_due || '')}</td>
                <td>${preuvesHtml}</td>
                <td>${_execStatusBadge(c.statut)}</td>
                <td style="text-align:center;white-space:nowrap;"><div class="exec-cellule-boutons serre">
                    ${modifierBtn}
                    <button class="btn btn-sm btn-outline" id="fiches_btn_${c.id}" style="padding:0.2rem 0.4rem;" onclick="_execToggleFiches('${c.id}')" title="Fiches">
                        ${EXEC_ICONS.file}<span class="caret" style="display:inline-block;transition:transform 0.15s;">▸</span>
                    </button>
                    ${(!isConstReadOnly || isAdmin) ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.2rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete')}">${EXEC_ICONS.x || '✕'}</button>` : ''}
                </div></td>
            </tr>
            <tr id="fiches_row_${c.id}" style="display:none;">
                <td colspan="9" style="background:var(--bg);padding:0.6rem 0.8rem;border-top:none;">
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                        <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;margin-right:0.4rem;">Fiches :</span>
                        <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','pdf')">
                            ${EXEC_ICONS.pdf||EXEC_ICONS.file} ${te('fiche_constat')} (PDF)
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','word')">
                            ${EXEC_ICONS.file} ${te('fiche_constat')} (Word)
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','pdf')">
                            ${EXEC_ICONS.pdf||EXEC_ICONS.clipboard} ${te('fiche_suivi')} (PDF)
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','word')">
                            ${EXEC_ICONS.clipboard} ${te('fiche_suivi')} (Word)
                        </button>
                    </div>
                </td>
            </tr>`}).join('')}
        </tbody>
    </table>
    </div>`}`;
}

// Onglet « Annexes » : intitulé, contenu et pièces de chaque annexe.
function _dossierOngletAnnexes(dossier, canEdit) {
    return `
    <div id="dossier_annexes_list">
        ${(dossier.annexes || []).map((a, i) => {
            const obj = typeof a === 'object' ? a : { intitule: '', contenu: '', filename: a };
            return `
            <div class="dossier-annexe-item" style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
                <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
                    <input type="text" class="form-input annexe-intitule" value="${_escAttr(obj.intitule || obj.filename || '')}" placeholder="${te('intitule_annexe')}" style="flex:1;">
                    ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="this.closest('.dossier-annexe-item').remove()">${EXEC_ICONS.x}</button>` : ''}
                </div>
                <textarea class="form-input annexe-contenu" rows="3" style="resize:vertical;margin-bottom:0.5rem;" placeholder="Contenu...">${_esc(obj.contenu || '')}</textarea>
                <div class="annexe-files" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                    ${(obj.files || []).map(f => `<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.5rem;background:var(--bg);border-radius:4px;font-size:0.8rem;" data-path="${_escAttr(f.path || '')}" data-filename="${_escAttr(f.filename || f)}">${EXEC_ICONS.file} ${_esc(f.filename || f)} <button class="btn btn-sm" style="padding:0;color:#ef4444;" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button></span>`).join('')}
                </div>
                <div style="margin-top:0.5rem;">
                    <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click();">${EXEC_ICONS.upload} Pièces jointes</button>
                    <input type="file" style="display:none;" multiple onchange="execUploadAnnexeFile(this)">
                </div>
            </div>`;
        }).join('')}
    </div>
    ${canEdit ? `
    <button class="btn btn-sm btn-outline" onclick="execAddAnnexeBlock()" style="margin-top:0.5rem;">
        ${EXEC_ICONS.add} Ajouter une annexe
    </button>` : ''}`;
}

// Onglet « Rapports » : les rapports du dossier et leurs gestes.
function _dossierOngletRapports(dossier) {
    const rapports = dossier.rapports || [];
    return `
    ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${te('no_data')}</p>` : `
    <table class="exec-data-table">
        <thead><tr>
            <th>${te('ref_rapport')}</th>
            <th>${te('titre_rapport')}</th>
            <th>${te('date_emission')}</th>
            <th>${te('statut_validation')}</th>
            <th>${te('actions')}</th>
        </tr></thead>
        <tbody>
            ${rapports.map(r => `<tr>
                <td><strong>${_esc(r.reference || '')}</strong></td>
                <td>${_esc(r.titre || '')}</td>
                <td>${_formatDate(r.date_creation)}</td>
                <td>${_execStatusBadge(r.statut)}</td>
                <td><div class="exec-cellule-boutons serre plie">
                    <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                        ${EXEC_ICONS.eye} ${te('apercu')}
                    </button>
                    ${_execCanContribute() && r.statut !== 'transmis' ? `
                    <button class="btn btn-sm btn-accent" onclick="execSendRapport('${r.id}')">
                        ${EXEC_ICONS.send} ${te('envoyer_prestataire')}
                    </button>` : ''}
                </div></td>
            </tr>`).join('')}
        </tbody>
    </table>`}`;
}

async function execUploadDossierFile(files, type) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const listId = type === 'checklist' ? 'dossier_checklists_list' : 'dossier_annexes_list';
                const container = document.getElementById(listId);
                if (container) {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
                    div.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(data.filename)}</span>
                        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                    div.dataset.path = data.path;
                    container.appendChild(div);
                }
            }
        } catch (e) {
            console.error('Upload error:', e);
        }
    }
}

function execAddAnnexeBlock() {
    const container = document.getElementById('dossier_annexes_list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'dossier-annexe-item';
    div.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;';
    div.innerHTML = `
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
            <input type="text" class="form-input annexe-intitule" value="" placeholder="${te('intitule_annexe')}" style="flex:1;">
            <button class="btn btn-sm btn-danger" onclick="this.closest('.dossier-annexe-item').remove()">${EXEC_ICONS.x}</button>
        </div>
        <textarea class="form-input annexe-contenu" rows="3" style="resize:vertical;margin-bottom:0.5rem;" placeholder="Contenu..."></textarea>
        <div class="annexe-files" style="display:flex;gap:0.5rem;flex-wrap:wrap;"></div>
        <div style="margin-top:0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click();">${EXEC_ICONS.upload} Pièces jointes</button>
            <input type="file" style="display:none;" multiple onchange="execUploadAnnexeFile(this)">
        </div>`;
    container.appendChild(div);
}

async function execUploadAnnexeFile(input) {
    if (!input.files || input.files.length === 0) return;
    const annexeItem = input.closest('.dossier-annexe-item');
    const filesContainer = annexeItem?.querySelector('.annexe-files');
    if (!filesContainer) return;
    for (const file of input.files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const span = document.createElement('span');
                span.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.5rem;background:var(--bg);border-radius:4px;font-size:0.8rem;';
                span.dataset.path = data.path;
                span.dataset.filename = data.filename;
                span.innerHTML = `${EXEC_ICONS.file} ${_esc(data.filename)} <button class="btn btn-sm" style="padding:0;color:#ef4444;" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                filesContainer.appendChild(span);
            }
        } catch (e) {
            console.error('Annexe upload error:', e);
        }
    }
    input.value = '';
}

async function execSubmitDossier(dossierId) {
    if (!await oasisConfirmer(te('confirmer_soumettre_rapport'))) return;
    // Save first, also clear observations
    await execSaveDossier(dossierId, true);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ observations_retour: '' })
        });
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/submit`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('rapport_soumis_ok'), 'success');
        // Reload dossier and navigate to validation step
        EXEC_STATE.dossierStep = 'validation';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Submit dossier error:', e);
        _execToast(te('err_soumission'), 'error');
    }
}

function _collectRealisationEquipe() {
    const equipe = [];
    const container = document.getElementById('realisation_equipe_container');
    if (container) {
        container.querySelectorAll('div[style]').forEach(div => {
            const selects = div.querySelectorAll('select');
            const nom = selects[0] ? selects[0].value.trim() : '';
            const role = selects[1] ? selects[1].value : '';
            if (nom) equipe.push({ nom, role });
        });
    }
    return equipe;
}

function _collectRealisationProgramme() {
    const programme = [];
    document.querySelectorAll('#realisation_programme_table tbody tr:not(#real_prog_empty)').forEach(tr => {
        const row = {};
        // Inclut input ET textarea (la colonne « Actions prévues » est multiligne)
        tr.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => { row[inp.dataset.field] = inp.value; });
        if (row.date || row.actions) programme.push(row);
    });
    return programme;
}

function execAddRealisationEquipeMember() {
    const container = document.getElementById('realisation_equipe_container');
    if (!container) return;
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    const roles = _execRolesEquipe();
    const inspList = typeof _getFilteredInspecteurs === 'function' ? _getFilteredInspecteurs() : [];
    div.innerHTML = `
        <select class="form-select real-equipe-nom" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select real-equipe-role" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_escAttr(r)}">${_esc(r)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

function execAddRealisationProgrammeLine() {
    const tbody = document.querySelector('#realisation_programme_table tbody');
    if (!tbody) return;
    const empty = document.getElementById('real_prog_empty');
    if (empty) empty.remove();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="form-input" data-field="date"></td>
        <td><input type="text" class="form-input" data-field="horaire" placeholder="09:00-12:00"></td>
        <td><textarea class="form-input" rows="2" data-field="actions" style="resize:vertical;"></textarea></td>
        <td><input type="text" class="form-input" data-field="correspondant"></td>
        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
    `;
    tbody.appendChild(tr);
}

async function execSaveRealisation(dossierId) {
    // Règle commune : l'exécution ne se termine pas avant d'avoir commencé.
    if (!oasisDatesValider({ debut: 'realisation_date_debut', fin: 'realisation_date_fin' })) return;
    const act = document.getElementById('realisation_activite');
    const payload = {};
    // Collect structured equipe
    const equipe = _collectRealisationEquipe();
    payload.realisation_equipe = JSON.stringify(equipe);
    if (act) payload.realisation_activite = act.value;
    // Nouveaux champs (repris de la Notification, éditables)
    const _v = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
    ['realisation_nature', 'realisation_date_debut', 'realisation_date_fin',
     'realisation_lieu', 'realisation_perimetre'].forEach(f => {
        const val = _v(f);
        if (val !== undefined) payload[f] = val;
    });
    // Pièces jointes de l'activité
    if (document.getElementById('realisation_pj_list')) {
        payload.realisation_pieces_jointes = JSON.stringify(_collectRealisationPj());
    }
    // Collect structured programme
    const programme = _collectRealisationProgramme();
    payload.realisation_programme = JSON.stringify(programme);
    // Selected checklists : la sélection est persistée via le picker modal (execOpenChecklistsPicker)
    // — pas besoin de la recalculer ici. Conserve la valeur actuelle.
    if (!Object.keys(payload).length) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Object.assign(EXEC_STATE.selectedDossier || {}, payload);
        await execRefreshDynamic();
        _execToast(te('infos_enregistrees'), 'success');
    } catch (e) {
        console.error('Save realisation error:', e);
        _execToast(te('err_enregistrement'), 'error');
    }
}

async function execCloseRealisation(dossierId) {
    if (!await oasisConfirmer(te('confirmer_cloture_terrain'))) return;
    await execSaveRealisation(dossierId);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close-realisation`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('terrain_cloture'), 'success');
        EXEC_STATE.dossierStep = 'redaction';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Close realisation error:', e);
        _execToast(te('err_cloture'), 'error');
    }
}
