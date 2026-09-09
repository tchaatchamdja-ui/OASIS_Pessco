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
                        <th>Réf. Activité</th>
                        <th>${te('provider')}</th>
                        <th>Dom. &amp; Sec.</th>
                        <th style="min-width:230px;">${te('objet')}</th>
                        <th>Date Activité</th>
                        <th>Dernière Maj</th>
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
                        <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                            <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${d.notification_id}')" title="${te('gerer_echange')}">
                                ${EXEC_ICONS.chat}
                            </button>
                            <button class="btn btn-sm btn-accent" onclick="execOpenDossierSlider('${d.id}')" title="Ouvrir le dossier">
                                ${EXEC_ICONS.openFolder}
                            </button>
                            ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteDossier('${d.id}')" title="${te('delete')}">
                                ${EXEC_ICONS.x}
                            </button>` : ''}
                        </td>
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
        <span><strong>Ref :</strong> ${_esc(dossier.reference || dossierId)}</span>
        <span><strong>Prestataire :</strong> ${_esc(dossier.prestataire_nom || '')}</span>
        <span>${_execStatusBadge(dossier.statut)}</span>
        <span style="color:var(--text-muted);font-style:italic;">${_esc(notifObjet)}</span>
        <button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="execCloseSlider()" title="Retour à la liste d'activités">
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
                <thead><tr><th>Nom</th><th>Rôle</th></tr></thead>
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
        <label style="font-weight:600;">Fiche de notification</label>
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
            <thead><tr><th>Nom</th><th>Rôle</th></tr></thead>
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
        ? `<p style="color:var(--text-muted);font-size:0.83rem;margin:0;">Aucune checklist sélectionnée — utilisez le bouton ci-dessous pour en ajouter.</p>`
        : selectedChIds.map(id => {
            const c = allChecklists.find(x => x.id === id);
            if (!c) return '';
            return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;border:1px solid var(--border);border-radius:6px;background:#fff;">
                <strong style="font-size:0.83rem;flex:1;">${c.reference ? _esc(c.reference) + ' — ' : ''}${_esc(c.nom)}</strong>
                <button type="button" class="btn btn-sm btn-primary" onclick="execOpenChecklistFiller('${dossierId}','${c.id}')">📝 Renseigner la Checklist</button>
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
            ${canEdit ? '' : `<span class="exec-real-lecture">${te('lecture_seule') || 'lecture seule'}</span>`}
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
            <input type="text" class="form-input pj-nom" value="${_escAttr(filename)}" placeholder="Nom du fichier"${dis}>
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
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
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
        _execToast('Pièces jointes enregistrées', 'success');
    } catch (e) {
        console.error('Save redaction PJ error:', e);
        _execToast('Erreur lors de l\'enregistrement', 'error');
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
            <label>Intitulé du rapport</label>
            <input type="text" class="form-input" id="dossier_type_rapport_autre" value="${_escAttr(libre)}"
                   placeholder="Ex. : RAPPORT DE CONTRÔLE"${ro} style="${roBg}">
        </div>
        <div class="form-group">
            <label>Type de Rapport</label>
            <select class="form-input" id="dossier_type_rapport" onchange="execTypeRapportChange()"${dis} style="${roBg}">
                <option value="">-- Sélectionner --</option>
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
    ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${surTransmission ? 'Aucun rapport validé pour le moment.' : 'Aucun rapport soumis pour le moment.'}</p>` : `
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
                <td style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                        ${EXEC_ICONS.eye} ${te('apercu')}
                    </button>
                    ${isLast && r.statut === 'soumis' && _execCanValidate() ? `
                    <button class="btn btn-sm btn-outline" style="color:#d97706;border-color:#d97706;" onclick="execReturnDossier('${dossierId}')">
                        ${EXEC_ICONS.back} Renvoyer
                    </button>` : ''}
                </td>
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
            <h4>Transmission du rapport au prestataire</h4>
            ${dejaTransmis ? `<span class="exec-courriel-etat">Transmis le ${_formatDate(rapport.date_transmission)}${
                rapport.transmis_a ? ` à ${_esc(rapport.transmis_a)}` : ''}</span>` : ''}
        </div>
        <div class="form-group">
            <label>Destinataire</label>
            <input type="text" class="form-input" id="courriel_destinataire"
                   value="${_escAttr(dejaTransmis ? (rapport.transmis_a || '') : _execAdressePrestataire(dossier))}"
                   placeholder="adresse@prestataire.bj"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
            <div class="form-group">
                <label>Copie cachée (Cci)</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>Objet</label>
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
                    <span class="exec-piece-mention">Rapport validé — joint d'office</span>
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
                   title="Aperçu du rapport">${nom}</a>`;
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
                headers: { Authorization: `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(data.error || 'Téléversement refusé');
            const ligne = document.createElement('div');
            ligne.className = 'exec-piece';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `
                <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                <input type="text" class="form-input exec-piece-intitule" value="${_escAttr(data.filename)}"
                       placeholder="Intitulé du document">
                <a class="exec-piece-ouvrir" href="${_escAttr(data.path)}" target="_blank" rel="noopener"
                   title="Ouvrir le document">${EXEC_ICONS.eye || 'Ouvrir'}</a>
                <span class="exec-piece-mention">${_esc(_execTaille(data.size))}</span>
                <button class="btn btn-sm btn-ghost exec-piece-retirer" title="Retirer"
                        onclick="this.closest('.exec-piece').remove()">${EXEC_ICONS.x}</button>`;
            conteneur.appendChild(ligne);
        } catch (e) {
            console.error('Téléversement :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || 'téléversement impossible'}`, 'error');
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
    if (!destinataire) { _execToast('Indiquez au moins un destinataire', 'error'); return; }
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
        _execToast((e && e.message) || 'Erreur lors de la transmission', 'error');
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
    const { notifObjet, notifDates, notifEquipe, notifPerimetre, notifRefs, notifProgramme } = defaults || {};
    const constatations = dossier.constatations || [];
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const roBg = canEdit ? '' : 'background:var(--bg);';

    if (tab === 'introduction') {
        return `
        <div style="display:grid;grid-template-columns:1fr 3fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Date d'exécution</label>
                <input type="text" class="form-input" id="dossier_dates_activite" value="${_escAttr(dossier.dates_activite || notifDates || '')}"${ro} style="${roBg}">
            </div>
            <div class="form-group">
                <label>Objet de l'activité</label>
                <textarea class="form-input" id="dossier_objet_activite" rows="1" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.objet_activite || notifObjet || '')}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Description générale de l'activité</label>
                <textarea class="form-input" id="dossier_description_activite" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.description_activite || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Équipe d'inspection</label>
                <textarea class="form-input" id="dossier_equipe_inspection" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.equipe_inspection || notifEquipe || '')}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Aspects couverts par l'inspection</label>
                <textarea class="form-input" id="dossier_aspects_couverts" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.aspects_couverts || notifPerimetre || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Référentiel</label>
                <textarea class="form-input" id="dossier_referentiel" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.referentiel || notifRefs || '')}</textarea>
            </div>
        </div>`;
    } else if (tab === 'checklists') {
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
                        ? `<span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.74rem;font-weight:700;">✓ Validée</span>`
                        : ''}
                    <button class="btn btn-sm btn-outline" onclick="execOpenChecklistFiller('${dossierId}','${cid}')">${isVal ? '👁 Consulter' : '📝 Renseigner'}</button>
                    ${canEdit ? (isVal
                        ? `<button class="btn btn-sm btn-ghost" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',false)" title="Annuler la validation">↩</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',true)">✓ Checklist Validée</button>`) : ''}
                </div>`;
            }).filter(Boolean).join('')
            : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">Aucune checklist sélectionnée à l'étape Réalisation.</p>`;

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
            : (realPjs.length ? '' : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">Aucune pièce jointe ajoutée à l'étape Réalisation.</p>`)}`;

        return `
        <div style="margin-bottom:1.25rem;">
            <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Checklists renseignées</h4>
            ${chkSectionHtml}
            ${canEdit ? `<button class="btn btn-sm btn-outline" style="margin-top:0.5rem;" onclick="execOpenChecklistsPicker('${dossierId}','checklists')">${EXEC_ICONS.add} Ajouter des checklists</button>` : ''}
        </div>
        <div style="margin-bottom:1.25rem;">
            <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Pièces jointes de l'activité</h4>
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
    } else if (tab === 'synthese') {
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
    } else if (tab === 'constatations') {
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
                <th>Date Ouv.</th>
                <th>Delai</th>
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
                        modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execViewFNC('${dossierId}','${c.id}')" title="${te('consulter')||'Consulter'}">${EXEC_ICONS.eye||'👁'}</button>`;
                    } else {
                        modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execEditFNC('${dossierId}','${c.id}')" title="${te('modifier_fnc')||'Modifier'}">${EXEC_ICONS.edit}</button>`;
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
                    <td style="display:flex;gap:0.25rem;justify-content:center;align-items:center;white-space:nowrap;">
                        ${modifierBtn}
                        <button class="btn btn-sm btn-outline" id="fiches_btn_${c.id}" style="padding:0.2rem 0.4rem;" onclick="_execToggleFiches('${c.id}')" title="Fiches">
                            ${EXEC_ICONS.file}<span class="caret" style="display:inline-block;transition:transform 0.15s;">▸</span>
                        </button>
                        ${(!isConstReadOnly || isAdmin) ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.2rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete') || 'Supprimer'}">${EXEC_ICONS.x || '✕'}</button>` : ''}
                    </td>
                </tr>
                <tr id="fiches_row_${c.id}" style="display:none;">
                    <td colspan="9" style="background:var(--bg);padding:0.6rem 0.8rem;border-top:none;">
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                            <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;margin-right:0.4rem;">Fiches :</span>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','pdf')">
                                ${EXEC_ICONS.pdf||EXEC_ICONS.file} ${te('fiche_constat')||'Fiche Constat'} (PDF)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','word')">
                                ${EXEC_ICONS.file} ${te('fiche_constat')||'Fiche Constat'} (Word)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','pdf')">
                                ${EXEC_ICONS.pdf||EXEC_ICONS.clipboard} ${te('fiche_suivi')||'Fiche Suivi'} (PDF)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','word')">
                                ${EXEC_ICONS.clipboard} ${te('fiche_suivi')||'Fiche Suivi'} (Word)
                            </button>
                        </div>
                    </td>
                </tr>`}).join('')}
            </tbody>
        </table>
        </div>`}`;
    } else if (tab === 'conclusion') {
        return `
        <div class="form-group">
            <textarea class="form-input" id="dossier_conclusion" rows="5" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.conclusion || '')}</textarea>
        </div>`;
    } else if (tab === 'annexes') {
        return `
        <div id="dossier_annexes_list">
            ${(dossier.annexes || []).map((a, i) => {
                const obj = typeof a === 'object' ? a : { intitule: '', contenu: '', filename: a };
                return `
                <div class="dossier-annexe-item" style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
                    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
                        <input type="text" class="form-input annexe-intitule" value="${_escAttr(obj.intitule || obj.filename || '')}" placeholder="Intitulé de l'annexe" style="flex:1;">
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
    } else if (tab === 'rapports') {
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
                    <td style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                            ${EXEC_ICONS.eye} ${te('apercu')}
                        </button>
                        ${_execCanContribute() && r.statut !== 'transmis' ? `
                        <button class="btn btn-sm btn-accent" onclick="execSendRapport('${r.id}')">
                            ${EXEC_ICONS.send} ${te('envoyer_prestataire')}
                        </button>` : ''}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`}`;
    }
    return '';
}

async function execUploadDossierFile(files, type) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
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
            <input type="text" class="form-input annexe-intitule" value="" placeholder="Intitulé de l'annexe" style="flex:1;">
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
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
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
    if (!confirm('Soumettre ce rapport pour validation ?')) return;
    // Save first, also clear observations
    await execSaveDossier(dossierId, true);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ observations_retour: '' })
        });
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/submit`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport soumis avec succès', 'success');
        // Reload dossier and navigate to validation step
        EXEC_STATE.dossierStep = 'validation';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Submit dossier error:', e);
        _execToast('Erreur lors de la soumission', 'error');
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
        _execToast('Informations enregistrées', 'success');
    } catch (e) {
        console.error('Save realisation error:', e);
        _execToast('Erreur lors de l\'enregistrement', 'error');
    }
}

async function execCloseRealisation(dossierId) {
    if (!confirm('Clôturer l\'exécution sur le terrain ? La rédaction du rapport sera activée.')) return;
    await execSaveRealisation(dossierId);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close-realisation`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Exécution sur le terrain clôturée', 'success');
        EXEC_STATE.dossierStep = 'redaction';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Close realisation error:', e);
        _execToast('Erreur lors de la clôture', 'error');
    }
}

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
    } catch (e) { _execToast('Erreur enregistrement sélection', 'error'); }
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
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const list = filtered.length
        ? filtered.map(c => `<label class="exec-chk-pick-row">
            <input type="checkbox" class="picker-chk-cb" value="${c.id}" ${current.has(c.id)?'checked':''}>
            <span class="pick-row-text">
                <strong>${c.reference ? _esc2(c.reference) + ' — ' : ''}${_esc2(c.nom)}</strong>
                ${c.description ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.1rem;">${_esc2(c.description.slice(0, 120))}${c.description.length>120?'…':''}</div>` : ''}
            </span>
        </label>`).join('')
        : `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-style:italic;">Aucune checklist applicable${secteurId ? ' au secteur de cette activité' : ''}.</div>`;

    const hint = secteurId
        ? `Checklists filtrées par le secteur de l'activité (${filtered.length} disponible${filtered.length>1?'s':''}).`
        : `Aucun secteur identifié — toutes les checklists sont listées.`;

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
        <button class="shell-btn shell-btn-primary" onclick="execSaveChecklistsPicker('${dossierId}','${returnTab || ''}')">Valider la sélection</button>
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
    if (!confirm('Retirer cette checklist de la sélection ?')) return;
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
        try { await execRefreshChecklists(); } catch (e) {}
    }
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) {
        _execToast('Checklist introuvable (id : ' + checklistId + ')', 'error');
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
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

    // ── Regroupement Sous-Domaine (sous-activité) › Thème › Sous-thème ──
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

    // Statuts « non satisfaisant » → déclenchent la possibilité de générer une constatation
    const nonSatIds = new Set(statuts
        .filter(s => _normL(s.libelle).includes('non satisfaisant') || _normL(s.libelle).includes('non-satisfaisant'))
        .map(s => s.id));

    const _itemRow = it => {
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
                    title="Générer une constatation"
                    style="${nonSatIds.has(effStatut) ? '' : 'display:none;'}margin-top:0.2rem;padding:0.2rem 0.4rem;font-size:0.8rem;line-height:1;"
                    onclick="execChkFillGenConstatation('${dossierId}','${it.id}')">⚠</button>
            </td>
        </tr>`;
    };
    const _leafTable = grpItems => `<table class="exec-cli-inline-table" style="margin-top:0.3rem;">
        <thead><tr>
            <th style="width:90px;">Réf. Item</th>
            <th style="min-width:170px;">Réf. Règlement</th>
            <th style="min-width:280px;">Description</th>
            <th style="min-width:200px;">Directives</th>
            <th style="width:170px;">Statut</th>
            <th style="min-width:220px;">Observations</th>
            <th style="width:60px;"></th>
        </tr></thead>
        <tbody>${grpItems.map(_itemRow).join('')}</tbody>
    </table>`;

    let groupsHtml = '';
    if (!items.length) {
        groupsHtml = `<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-style:italic;">Cette checklist ne contient aucun item.</div>`;
    } else {
        // Bouton d'activation/désactivation d'un regroupement
        const _grpToggleBtn = `<button type="button" class="exec-chk-grp-toggle" title="Activer / désactiver ce regroupement"
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

    const html = `
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
                    <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Renseigner la checklist (brouillon)</div>
                    <div style="font-weight:700;font-size:1rem;">${cl.reference ? _esc2(cl.reference) + ' — ' : ''}${_esc2(cl.nom)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                    <span id="execChkFillerSaveState" style="font-size:0.75rem;color:var(--text-muted);"></span>
                    <button class="btn btn-sm btn-primary" onclick="execChkFillExportPdf('${dossierId}','${checklistId}')" title="Exporter PDF">${EXEC_ICONS.pdf || ''} Exporter PDF</button>
                    <button class="btn btn-sm btn-primary" onclick="execChkFillExportXlsx('${dossierId}','${checklistId}')" title="Exporter Excel">${EXEC_ICONS.download || ''} Exporter Excel</button>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('execChkFillImportFile').click()" title="Importer">${EXEC_ICONS.upload || ''} Importer</button>
                    <input type="file" id="execChkFillImportFile" accept=".xlsx" style="display:none" onchange="execChkFillImportXlsx('${dossierId}','${checklistId}',event)">
                    <button class="btn btn-sm btn-ghost" onclick="execCloseChecklistFiller('${dossierId}')" title="Fermer">✕</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body">
                ${activiteHtml}
                <div style="display:flex;align-items:flex-end;gap:0.7rem;margin-bottom:0.6rem;flex-wrap:wrap;">
                    <div id="execChkFillerSummary" style="display:flex;flex-wrap:wrap;gap:0.6rem;"></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1 1 340px;min-width:240px;">
                        <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                            <button class="btn btn-sm btn-primary" onclick="execChkFillExpandAll(true)">▼ Tout déplier</button>
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
                            <button class="btn btn-sm btn-ghost" title="Réinitialiser les filtres" style="flex:0 0 auto;"
                                onclick="document.getElementById('execChkFillSearch').value='';document.getElementById('execChkFillStatutFilter').value='';execChkFillApplyFilter();">↺</button>
                        </div>
                    </div>
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.5rem;">Les réponses sont enregistrées en <strong>brouillon</strong> à mesure de la saisie et restent attachées au dossier.</p>
                <div id="execChkFillerGroups" style="overflow:auto;">${groupsHtml}</div>
            </div>
        </aside>
    </div>`;
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
    if (validee && !confirm('Confirmer que cette checklist a été vérifiée et validée ?')) return;
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
        _execToast(validee ? 'Checklist marquée comme validée.' : 'Validation annulée.', 'success');
    } catch (e) {
        _execToast('Erreur : ' + (e.message || e), 'error');
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
    if (!item) { _execToast('Item introuvable', 'error'); return; }
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
    if (!confirm('Générer une constatation (brouillon) pour cet item non satisfaisant ?')) return;
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
        _execToast(`Constatation brouillon créée (${res.reference || ''}). Visible dans l'onglet Constatations du dossier.`, 'success');
    } catch (e) {
        _execToast('Création de la constatation échouée : ' + (e.message || e), 'error');
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
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
        a.href = url;
        a.download = `checklist_renseignee_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 60)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { _execToast('Export Excel échoué : ' + (e.message || e), 'error'); }
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
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        _execToast(`Import OK : ${j.imported} réponse(s) mise(s) à jour.`, 'success');
        // Recharge le filler pour refléter les réponses importées
        execOpenChecklistFiller(dossierId, checklistId);
    } catch (e) {
        _execToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        if (ev?.target) ev.target.value = '';
    }
}

// Export PDF : fenêtre d'impression dédiée (l'utilisateur choisit « Enregistrer en PDF »).
function execChkFillExportPdf(dossierId, checklistId) {
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) { _execToast('Checklist introuvable', 'error'); return; }
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
    const _e = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Lit les statuts/observations directement depuis le DOM du filler (état courant)
    const respByItem = {};
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        const id = tr.getAttribute('data-item-id');
        respByItem[id] = {
            statut_id: tr.querySelector('.exec-chk-fill-statut')?.value || '',
            observations: tr.querySelector('.exec-chk-fill-obs')?.value || ''
        };
    });
    const today = new Date().toISOString().slice(0, 10);
    const w = window.open('', '_blank');
    if (!w) { _execToast('Veuillez autoriser les pop-ups pour l\'export PDF.', 'error'); return; }
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
            <thead><tr><th>Réf. Item</th><th>Réf. Règlement</th><th>Thème / Sous-thème</th><th>Description</th><th>Directives</th><th>Statut</th><th>Observations</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7">Aucun item.</td></tr>'}</tbody>
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
            date_maj: new Date().toISOString().slice(0, 19).replace('T', ' '),
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

async function execValidateRapport(rapportId) {
    if (!confirm('Valider ce rapport ? Un numéro de rapport final sera généré.')) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/validate`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport validé', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Validate rapport error:', e);
        _execToast('Erreur lors de la validation', 'error');
    }
}

async function execAmendRapport(rapportId) {
    const observations = prompt('Observations pour l\'amendement (points à corriger) :');
    if (observations === null) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/amend`, {
            method: 'PUT', body: JSON.stringify({ observations })
        });
        await execRefreshDynamic();
        _execToast('Rapport renvoyé en brouillon pour amendement', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) { EXEC_STATE.dossierStep = 'redaction'; execOpenDossierSlider(d.id); }
    } catch (e) {
        console.error('Amend rapport error:', e);
        _execToast('Erreur lors de l\'amendement', 'error');
    }
}

async function execSendRapportValidated(rapportId) {
    if (!confirm('Envoyer ce rapport à l\'organisme ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport envoyé', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Send rapport error:', e);
        _execToast('Erreur lors de l\'envoi', 'error');
    }
}

async function execGenerateNotificationPdf(dossierId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier || !dossier.notification_id) {
        _execToast('Aucune notification liée à ce dossier', 'error');
        return;
    }
    try {
        const res = await api(`${EXEC_MODULE_API}/notifications/${dossier.notification_id}/pdf`);
        if (res && res.path) {
            const a = document.createElement('a');
            a.href = res.path;
            a.download = `notification_${dossier.notification_ref || dossier.notification_id}.pdf`;
            a.click();
        } else {
            _execToast('PDF non disponible', 'info');
        }
    } catch (e) {
        // Fallback: open the notification preview for printing
        _execToast('Utilisez Ctrl+P pour imprimer depuis l\'aperçu', 'info');
        if (dossier.notification_id) {
            execPreviewNotification(dossier.notification_id);
        }
    }
}

async function execReturnDossier(dossierId) {
    if (!confirm('Confirmer le renvoi du dossier pour correction ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/return`, {
            method: 'PUT',
            body: JSON.stringify({ observations: '' })
        });
        await execRefreshDynamic();
        _execToast('Dossier renvoyé pour correction', 'success');
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Return dossier error:', e);
        _execToast('Erreur lors du renvoi', 'error');
    }
}

function _collectDossierAnnexes() {
    const annexes = [];
    document.querySelectorAll('#dossier_annexes_list > .dossier-annexe-item').forEach(item => {
        const intitule = item.querySelector('.annexe-intitule')?.value || '';
        const contenu = item.querySelector('.annexe-contenu')?.value || '';
        const files = [];
        item.querySelectorAll('.annexe-files span[data-path]').forEach(sp => {
            files.push({ filename: sp.dataset.filename || '', path: sp.dataset.path || '' });
        });
        annexes.push({ intitule, contenu, files });
    });
    return annexes;
}

async function execSaveDossier(dossierId, silent) {
    const data = {};

    // Introduction tab fields (IDs match the form)
    // Type de rapport (au-dessus des sections)
    const typeEl = document.getElementById('dossier_type_rapport');
    const typeLibreEl = document.getElementById('dossier_type_rapport_autre');
    if (typeEl) data.type_rapport = typeEl.value;
    if (typeLibreEl) data.type_rapport_autre = typeLibreEl.value;

    const descEl = document.getElementById('dossier_description_activite');
    const objEl = document.getElementById('dossier_objet_activite');
    const datesEl = document.getElementById('dossier_dates_activite');
    const equipeEl = document.getElementById('dossier_equipe_inspection');
    const aspectsEl = document.getElementById('dossier_aspects_couverts');
    const refEl = document.getElementById('dossier_referentiel');
    if (descEl) data.description_activite = descEl.value;
    if (objEl) data.objet_activite = objEl.value;
    if (datesEl) data.dates_activite = datesEl.value;
    if (equipeEl) data.equipe_inspection = equipeEl.value;
    if (aspectsEl) data.aspects_couverts = aspectsEl.value;
    if (refEl) data.referentiel = refEl.value;

    // Synthese tab fields
    const pfEl = document.getElementById('dossier_points_forts');
    const pfaEl = document.getElementById('dossier_points_faibles');
    const oppEl = document.getElementById('dossier_opportunites');
    const rgEl = document.getElementById('dossier_resume_global');
    if (pfEl) data.synthese_points_forts = pfEl.value;
    if (pfaEl) data.synthese_points_faibles = pfaEl.value;
    if (oppEl) data.opportunites_amelioration = oppEl.value;
    if (rgEl) data.resume_global_constatations = rgEl.value;

    // Conclusion
    const concEl = document.getElementById('dossier_conclusion');
    if (concEl) data.conclusion = concEl.value;

    // Checklists
    const checklistsEl = document.getElementById('dossier_checklists_list');
    if (checklistsEl) {
        const checklists = [];
        checklistsEl.querySelectorAll('div[data-path]').forEach(div => {
            checklists.push({ filename: div.querySelector('span')?.textContent || '', path: div.dataset.path });
        });
        data.checklists = checklists;
    }

    // Annexes (structured)
    const annexesEl = document.getElementById('dossier_annexes_list');
    if (annexesEl) {
        data.annexes = _collectDossierAnnexes();
    }

    // Skip if no data to save
    if (Object.keys(data).length === 0) {
        if (!silent) _execToast('Aucun champ à enregistrer', 'info');
        return;
    }

    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify(data) });
        // Update local state
        if (EXEC_STATE.selectedDossier) {
            Object.assign(EXEC_STATE.selectedDossier, data);
        }
        await execRefreshDynamic();
        if (!silent) {
            _execToast('Brouillon enregistré avec succès', 'success');
        }
    } catch (e) {
        console.error('Save dossier error:', e);
        if (!silent) _execToast('Erreur lors de la sauvegarde', 'error');
    }
}

async function execCloseDossier(dossierId) {
    if (!confirm('Cloturer ce dossier ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Dossier clôturé avec succès', 'success');
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Close dossier error:', e);
        _execToast('Erreur lors de la clôture', 'error');
    }
}


// ══════════════════════════════════════
//  FNC CREATION FORM SLIDER
// ══════════════════════════════════════

// ── Helpers FNC form: secteur/exigences ─────────────────────────────────────
function execFncOnSecteurChange() {
    const secteurId = document.getElementById('fnc_secteur')?.value || '';
    execFncUpdateExigences(secteurId);
}

function execFncUpdateExigences(secteurId) {
    const all = EXEC_STATE.data.exigences || [];
    const filtered = secteurId
        ? all.filter(e => e.secteur_id === secteurId && (e.statut || 'actif') !== 'inactif')
        : all.filter(e => (e.statut || 'actif') !== 'inactif');
    const list = document.getElementById('fnc_exig_list');
    if (!list) return;
    list.innerHTML = filtered.map(e =>
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');
}

function execFncAddRef(raw) {
    const ref = (raw || '').split(' — ')[0].trim();
    if (!ref) return;
    const container = document.getElementById('fnc_ref_tags');
    const input = document.getElementById('fnc_ref_input');
    if (!container || !input) return;
    const existing = Array.from(container.querySelectorAll('.fnc-ref-tag')).map(t => t.dataset.ref);
    if (existing.includes(ref)) return;
    const exig = (EXEC_STATE.data.exigences || []).find(e => e.reference === ref);
    const tag = document.createElement('span');
    tag.className = 'fnc-ref-tag';
    tag.dataset.ref = ref;
    if (exig?.libelle) tag.title = exig.libelle;
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;';
    tag.innerHTML = `${_esc(ref)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button>`;
    container.insertBefore(tag, input);
}

// ══════════════════════════════════════
//  Tiroir du formulaire de constatation
// ══════════════════════════════════════
// Volet à part, superposé au rapport : l'écran d'où l'on vient reste affiché
// derrière, à gauche. Bandeau propre, liseré rouge, pied dédié.
function _execFncTiroirAfficher(dossierId, bodyHtml, footerHtml, reference) {
    document.getElementById('execFncTiroir')?.remove();
    const tiroir = document.createElement('div');
    tiroir.id = 'execFncTiroir';
    tiroir.className = 'exec-fnc-tiroir';
    tiroir.innerHTML = `
        <div class="exec-fnc-tiroir-tete">
            <button class="btn btn-outline btn-sm exec-proc-retour" onclick="execFermerFncTiroir()">
                ${EXEC_ICONS.back || ''} ${te('retour_rapport')}
            </button>
            <span class="exec-fnc-tiroir-titre">${EXEC_ICONS.constatations} ${te('constatation')}</span>
            ${reference ? `<span class="exec-form-titre-ref">${_esc(reference)}</span>` : ''}
        </div>
        <div class="exec-fnc-tiroir-corps">${bodyHtml}</div>
        ${footerHtml ? `<div class="exec-slider-footer exec-fnc-tiroir-pied">${footerHtml}</div>` : ''}`;
    document.body.appendChild(tiroir);
    // Le tiroir commence sous la ligne de séparation du fil d'avancement.
    // Ce fil défile avec le corps du volet : s'il est remonté hors de vue, on
    // se rabat sur le bandeau, qui ne bouge pas. Sans ce garde-fou, le tiroir
    // démarrait au-dessus de l'écran et sa fin restait inaccessible.
    const hote = document.getElementById('execSlider');
    const bandeau = hote && hote.querySelector('.exec-slider-header');
    const fil = hote && hote.querySelector('.exec-proc-barre');
    const plancher = bandeau ? Math.round(bandeau.getBoundingClientRect().bottom)
        : (hote ? Math.round(hote.getBoundingClientRect().top) : 0);
    let haut = plancher;
    if (fil) {
        const basFil = Math.round(fil.getBoundingClientRect().bottom);
        // Entre le bandeau et le tiers haut de l'écran : au-delà, le fil a
        // défilé et ne sert plus de repère.
        if (basFil > plancher && basFil < window.innerHeight / 3) haut = basFil;
    }
    tiroir.style.top = `${haut}px`;
    requestAnimationFrame(() => tiroir.classList.add('ouvert'));
}

window.execFermerFncTiroir = function () {
    const tiroir = document.getElementById('execFncTiroir');
    if (!tiroir) return;
    tiroir.classList.remove('ouvert');
    setTimeout(() => tiroir.remove(), 250);
};

function execOpenFNCForm(dossierId, existingFnc) {
    const fnc = existingFnc || {};
    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const allExig = EXEC_STATE.data.exigences || [];

    // Get dossier context for pre-filling
    const dossier = EXEC_STATE.selectedDossier || {};
    const relNotif = (EXEC_STATE.data.notifications || []).find(n => n.id === dossier.notification_id) || {};
    let actDateFin = '', actDateDebut = relNotif.date_debut_effective || '';
    if (dossier.activite_id || relNotif.activite_id) {
        const aId = dossier.activite_id || relNotif.activite_id;
        for (const p of (EXEC_STATE.data.plansValides || [])) {
            const act = (p.activites || []).find(a => a.id === aId);
            if (act) { actDateFin = act.date_fin || ''; actDateDebut = actDateDebut || act.date_debut || ''; break; }
        }
    }

    // Resolve prestataire → secteur → domaine
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestId = dossier.prestataire_id || relNotif.prestataire_id || '';
    const prest = prestataires.find(p => p.id === prestId);
    const defaultSecteurId = fnc.secteur_id || prest?.secteur_id || '';
    const defSecteur = secteurs.find(s => s.id === defaultSecteurId);
    const defaultDomaineId = fnc.domaine_id || fnc.domaine || defSecteur?.domaine_id || '';

    // Initial exigences
    const initExig = defaultSecteurId
        ? allExig.filter(e => e.secteur_id === defaultSecteurId && (e.statut || 'actif') !== 'inactif')
        : allExig.filter(e => (e.statut || 'actif') !== 'inactif');
    const exigOptions = initExig.map(e =>
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const defaultEmisPar = fnc.emis_par || relNotif.equipe_chef || EXEC_STATE.user?.nom || '';
    const defaultAdresseA = fnc.adresse_a || relNotif.prestataire_interlocuteur || '';
    const defaultDateOuverture = fnc.date_ouverture || actDateFin || new Date().toISOString().slice(0, 10);
    const minDate = actDateDebut || '';
    const G = 'gap:0.6rem;', MB = 'margin-bottom:0.5rem;';

    const bodyHtml = `
    <div class="exec-real">
        <input type="hidden" id="fnc_min_date" value="${minDate}">

        ${_execFormSection('A', 'fnc_section_identification', `
        <!-- Row 1: Emis Par ; Adressé a ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('emis_par')}</label>
                <input type="text" class="form-input" id="fnc_emis_par" value="${_escAttr(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a')}</label>
                <input type="text" class="form-input" id="fnc_adresse_a" value="${_escAttr(defaultAdresseA)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_ouverture')}</label>
                <input type="date" class="form-input" id="fnc_date_ouverture" value="${defaultDateOuverture}"${minDate ? ` min="${minDate}"` : ''} onchange="execValidateDateOuverture()">
            </div>
        </div>

        <!-- Row 2: Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('source')}</label>
                <select class="form-select" id="fnc_source">
                    <option value="audit" ${(fnc.source||'audit')==='audit'?'selected':''}>${te('source_audit')}</option>
                    <option value="inspection" ${fnc.source==='inspection'?'selected':''}>${te('source_inspection')}</option>
                    <option value="autre" ${fnc.source==='autre'?'selected':''}>${te('source_autre')}</option>
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('domaine')}</label>
                <select class="form-select" id="fnc_domaine">
                    <option value="">${te('select_option')}</option>
                    ${domaines.map(d => `<option value="${d.code || d.id}" ${(defaultDomaineId===d.id||defaultDomaineId===d.code)?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Secteur</label>
                <select class="form-select" id="fnc_secteur" onchange="execFncOnSecteurChange()">
                    <option value="">${te('select_option')}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${defaultSecteurId===s.id?'selected':''}>${_esc(s.code || s.nom)}</option>`).join('')}
                </select>
            </div>
        </div>
        `, true, '', te('fnc_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
        <!-- Row 3: Réf. Réglementaires (tag-input) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires')}</label>
            <div id="fnc_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('fnc_ref_input').focus()">
                ${(fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="fnc-ref-tag" data-ref="${_escAttr(r)}" title="${_escAttr(exig?.libelle||'')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
                }).join('')}
                <input type="text" id="fnc_ref_input" list="fnc_exig_list" autocomplete="off"
                    placeholder="${(fnc.ref_reglementaires||'')?'':'Ajouter une référence…'}"
                    style="border:none;outline:none;background:transparent;flex:1;min-width:10rem;font-size:0.85rem;padding:0.1rem 0;"
                    onchange="execFncAddRef(this.value);this.value='';"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();execFncAddRef(this.value);this.value='';}">
            </div>
            <datalist id="fnc_exig_list">${exigOptions}</datalist>
        </div>

        <!-- Row 4: Description -->
        <div class="form-group" style="${MB}">
            <label>${te('description_constatation')}</label>
            <textarea class="form-input" id="fnc_description" rows="3">${_esc(fnc.description || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
        <!-- Row 5: Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('criticite')}</label>
                <select class="form-select" id="fnc_gravite" onchange="execApplyCriticiteDelai('fnc_gravite','fnc_delai','execCalcDateDue')">
                    ${_execCriticiteOptions(fnc.criticite || fnc.gravite)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('cas')}</label>
                <select class="form-select" id="fnc_cas">
                    ${_execTypeCasOptions(fnc.cas_type || fnc.cas, true)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('delai_solde')}</label>
                <input type="number" class="form-input" id="fnc_delai" min="1" value="${_escAttr(fnc.delai_solde || fnc.delai_correction || _execCriticiteDelai(fnc.criticite || fnc.gravite) || '30')}" onchange="execCalcDateDue()" oninput="execCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due')}</label>
                <input type="date" class="form-input" id="fnc_date_due" value="${fnc.date_due_cloture || fnc.date_due || ''}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation')}</label>
            <textarea class="form-input" id="fnc_recommandation" rows="2">${_esc(fnc.recommandation || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
        <!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves')}</label>
            <div id="fnc_preuves_list">
                ${(fnc.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.4rem;padding:1rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('fnc_proof_input').click()">
                ${EXEC_ICONS.upload} ${te('upload_zone')}
                <input type="file" id="fnc_proof_input" style="display:none;" multiple onchange="execUploadFNCProof(this.files)">
            </div>
        </div>
        `, true, '', te('fnc_aide_preuves'))}
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execFermerFncTiroir()">${te('cancel')}</button>
        <button class="btn btn-primary" onclick="execSaveFNC('${dossierId}', '${fnc.id || ''}')">
            ${EXEC_ICONS.check} ${te('save')}
        </button>
    `;

    // Le formulaire s'ouvre dans son propre tiroir, par-dessus l'écran du
    // rapport : celui-ci reste visible et lisible à gauche.
    _execFncTiroirAfficher(dossierId, bodyHtml, footerHtml, fnc.reference || '');

    // Calculate initial date due
    setTimeout(() => execCalcDateDue(), 100);
}

async function execEditFNC(dossierId, fncId) {
    try {
        const fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
        if (fnc) execOpenFNCForm(dossierId, fnc);
    } catch (e) {
        console.error('Load FNC for edit error:', e);
    }
}

async function execViewFNC(dossierId, fncId) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); _execToast('Erreur chargement', 'error'); return; }
    if (!fnc) return;

    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const allExig = EXEC_STATE.data.exigences || [];
    const dom = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const secteur = secteurs.find(s => s.id === fnc.secteur_id);
    const refList = (fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean);
    const sourceLabels = { audit: 'Audit', inspection: 'Inspection', autre: 'Autre' };
    const G = 'gap:0.6rem;', MB = 'margin-bottom:0.75rem;';

    const roField = (label, val) => `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${label}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2rem;">${val || '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>`;

    const body = `
    <div style="padding:0.5rem 0.25rem;">
        <div style="${MB}">${_execStatusBadge(fnc.statut)}</div>
        <!-- Row 1 : Émis par ; Adressé à ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            ${roField(te('emis_par') || 'Émis par', fnc.emis_par)}
            ${roField(te('adresse_a') || 'Adressé à', fnc.adresse_a)}
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
        </div>
        <!-- Row 2 : Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            ${roField(te('source') || 'Source', sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine') || 'Domaine', dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        <!-- Réf. Réglementaires -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_escAttr(exig?.libelle||'')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('description_constatation') || 'Description'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Row 3 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite') || 'Criticité', fnc.criticite || fnc.gravite)}
            ${roField(te('cas') || 'Cas', fnc.cas_type || fnc.cas)}
            ${roField(te('delai_solde') || 'Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due') || 'Date Due', fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : (fnc.date_due ? fnc.date_due.slice(0,10) : ''))}
        </div>
        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation') || 'Recommandation'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Preuves -->
        ${(fnc.preuves_constatation && fnc.preuves_constatation.length) ? `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('preuves') || 'Preuves'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;">
                ${fnc.preuves_constatation.map(p => {
                    const fname = typeof p === 'object' ? (p.filename || p.name || '') : p;
                    const fpath = typeof p === 'object' ? (p.path || '') : '';
                    return fpath
                        ? `<div style="padding:0.2rem 0;">${EXEC_ICONS.file||'📎'} <a href="${_escAttr(_execDl(fpath))}" download="${_escAttr(fname)}" style="font-size:0.85rem;color:var(--primary);">${_esc(fname)}</a></div>`
                        : `<div style="padding:0.2rem 0;">${EXEC_ICONS.file||'📎'} <span style="font-size:0.85rem;">${_esc(fname)}</span></div>`;
                }).join('')}
            </div>
        </div>` : ''}
    </div>`;

    const footer = `<button class="btn btn-outline" onclick="execOpenDossierSlider('${dossierId}','constatations')">${EXEC_ICONS.back||''} ${te('back')||'Retour'}</button>`;
    _execFadeSliderContent(`${EXEC_ICONS.constatations||''} ${te('constatation')||'Constatation'} — ${_esc(fnc.reference||'')}`, body, footer, 'max');
}

function execCalcDateDue() {
    const delai = parseInt(document.getElementById('fnc_delai')?.value || '30');
    const dateOuv = document.getElementById('fnc_date_ouverture')?.value;
    const dueDateEl = document.getElementById('fnc_date_due');
    if (dateOuv && dueDateEl) {
        const d = new Date(dateOuv);
        d.setDate(d.getDate() + delai);
        dueDateEl.value = d.toISOString().slice(0, 10);
    }
}

function execValidateDateOuverture() {
    const dateInput = document.getElementById('fnc_date_ouverture');
    const minDateInput = document.getElementById('fnc_min_date');
    if (!dateInput || !minDateInput) return;
    const minDate = minDateInput.value;
    if (minDate && dateInput.value && dateInput.value < minDate) {
        alert(`La date d'ouverture ne peut pas être antérieure au début de l'activité (${minDate}).`);
        dateInput.value = minDate;
    }
    execCalcDateDue();
}

let _fncProofPendingName = '';


async function execUploadFNCProof(files) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const container = document.getElementById('fnc_preuves_list');
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
            console.error('Upload proof error:', e);
        }
    }
}

async function execSaveFNC(dossierId, fncId) {
    const preuves = [];
    document.querySelectorAll('#fnc_preuves_list > div').forEach(div => {
        const path = div.dataset?.path;
        const name = div.querySelector('span')?.textContent || '';
        preuves.push(path ? { filename: name, path } : name);
    });

    const data = {
        dossier_id: dossierId,
        domaine_id: document.getElementById('fnc_domaine')?.value || '',
        emis_par: document.getElementById('fnc_emis_par')?.value || '',
        adresse_a: document.getElementById('fnc_adresse_a')?.value || '',
        date_ouverture: document.getElementById('fnc_date_ouverture')?.value || '',
        source: document.getElementById('fnc_source')?.value || 'audit',
        cas_type: document.getElementById('fnc_cas')?.value || '',
        description: document.getElementById('fnc_description')?.value || '',
        criticite: document.getElementById('fnc_gravite')?.value || 'mineure',
        ref_reglementaires: (() => {
            const tags = Array.from(document.querySelectorAll('#fnc_ref_tags .fnc-ref-tag')).map(t => t.dataset.ref);
            const inp = (document.getElementById('fnc_ref_input')?.value || '').split(' — ')[0].trim();
            if (inp && !tags.includes(inp)) tags.push(inp);
            return tags.join(', ');
        })(),
        delai_solde: document.getElementById('fnc_delai')?.value || '30',
        date_due_cloture: document.getElementById('fnc_date_due')?.value || '',
        recommandation: document.getElementById('fnc_recommandation')?.value || '',
        preuves_constatation: preuves
    };

    try {
        if (fncId) {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'PUT', body: JSON.stringify(data) });
            _execToast('Constatation modifiée avec succès', 'success');
        } else {
            await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(data) });
            _execToast('Constatation créée avec succès', 'success');
        }
        await execRefreshDynamic();
        EXEC_STATE.dossierTab = 'constatations';
        execFermerFncTiroir();
        execOpenDossierSlider(dossierId, 'constatations');
    } catch (e) {
        console.error('Save FNC error:', e);
        _execToast('Erreur lors de la sauvegarde de la constatation', 'error');
    }
}

// ══════════════════════════════════════
//  DELETE FUNCTIONS (Admin only)
// ══════════════════════════════════════

async function execDeleteConstatation(fncId) {
    if (!confirm(te('confirm_delete_constatation'))) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        // Si un dossier est ouvert, ré-affiche son slider (onglet Constatations) ; sinon page courante.
        const openDossier = document.getElementById('execDossierSlider') || document.querySelector('.exec-dossier-slider');
        const dId = EXEC_STATE.selectedDossier?.id;
        if (openDossier && dId && typeof execSwitchRedactionSubtab === 'function') {
            execSwitchRedactionSubtab(dId, 'constatations');
        } else {
            execRenderPage();
        }
    } catch (e) {
        console.error('Delete constatation error:', e);
        alert('Erreur lors de la suppression.');
    }
}


async function execDeleteDossier(dossierId) {
    if (!confirm(te('confirm_delete_activite'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Delete dossier error:', e);
        alert('Erreur lors de la suppression.');
    }
}

async function execSendRapport(rapportId) {
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Send rapport error:', e);
        alert('Erreur lors de l\'envoi.');
    }
}

