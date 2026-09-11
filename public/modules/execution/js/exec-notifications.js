/* OASIS — Module « Exécution de la Surveillance »
 * Écran 3 — Déclenchement et notifications.
 *
 * Notification d’activité, aperçu papier A4 et échanges de confirmation avec le prestataire.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  3. DECLENCHEMENT & NOTIFICATIONS
// ══════════════════════════════════════


function execRenderDeclenchement() {
    const tab = EXEC_STATE.triggerTab;
    const notifs = EXEC_STATE.data.notifications || [];
    const plansValides = EXEC_STATE.data.plansValides || [];

    // Classify notifications
    const brouillons = notifs.filter(n => n.statut === 'brouillon');
    const soumis = notifs.filter(n => n.statut === 'soumis' || n.statut === 'valide');
    const envoyes = notifs.filter(n => n.statut === 'envoye');

    // All activities from validated plans not yet notified
    const notifiedActIds = new Set(notifs.map(n => n.activite_id));
    let aNotifier = [];
    plansValides.forEach(p => {
        (p.activites || []).forEach(a => {
            if (!notifiedActIds.has(a.id)) {
                const days = _daysUntil(a.date_debut);
                // Onglet "A Notifier" : seulement délai restant <= 31 jours
                if (days !== null && days <= 31) {
                    aNotifier.push({ ...a, plan_id: p.id, plan_titre: p.titre, daysUntil: days });
                }
            }
        });
    });
    aNotifier.sort((a, b) => {
        const da = a.daysUntil ?? 9999;
        const db = b.daysUntil ?? 9999;
        return da - db;
    });

    const counts = {
        a_notifier: aNotifier.length,
        brouillons: brouillons.length,
        soumis: soumis.length,
        envoyes: envoyes.length
    };

    let tabContent = '';
    switch (tab) {
        case 'a_notifier': tabContent = _renderTabANotifier(aNotifier); break;
        case 'brouillons': tabContent = _renderTabBrouillons(brouillons); break;
        case 'soumis': tabContent = _renderTabSoumis(soumis); break;
        case 'envoyes': tabContent = _renderTabEnvoyes(envoyes); break;
    }

    // Map tab to workflow step for visualization
    const tabToStep = { a_notifier: 'a_notifier', brouillons: 'brouillon', soumis: 'soumis', envoyes: 'envoye' };

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('declenchement')}</h2>
        </div>

        <div class="exec-workflow-tabs">
            ${['a_notifier', 'brouillons', 'soumis', 'envoyes'].map(t => {
                const keys = { a_notifier: 'a_notifier', brouillons: 'brouillons', soumis: 'soumis_tab', envoyes: 'envoyes_echanges' };
                return `<button class="exec-tab ${tab === t ? 'active' : ''}" onclick="EXEC_STATE.triggerTab='${t}';execRenderPage();">
                    ${te(keys[t])} <span class="exec-tab-badge">${counts[t]}</span>
                </button>`;
            }).join('')}
        </div>

        ${tabContent}
    </div>`;
}

function _renderTabANotifier(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('date_debut')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('type')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('delai_restant')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(a => `<tr>
                    <td>${_formatDate(a.date_debut)}</td>
                    <td><strong>${_esc(a.prestataire_nom || '')}</strong></td>
                    <td>${_esc(a.type_supervision || '')}</td>
                    <td>${_esc(a.objet || '').substring(0, 50)}</td>
                    <td>${_daysUntilBadge(a.date_debut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execShowContacts('${a.prestataire_id || ''}')" title="${te('contacts')}">${EXEC_ICONS.contact}</button>
                        <button class="btn btn-sm btn-accent" onclick="execStartNotification('${a.plan_id}', '${a.id}')" title="${te('renseigner')}">${EXEC_ICONS.fillForm}</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabBrouillons(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('date')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(n => `<tr>
                    <td>
                        <strong>${_esc(n.reference || '')}</strong>
                        ${n.motif_rejet ? `<div style="margin-top:0.3rem;padding:0.3rem 0.5rem;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;font-size:0.78rem;color:#ef4444;">
                            <strong>Motif de rejet :</strong> ${_esc(n.motif_rejet)}
                        </div>` : ''}
                    </td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_formatDate(n.date_creation)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execEditNotification('${n.id}')" title="${te('continuer_edition')}">
                            ${EXEC_ICONS.edit}
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="execSubmitBrouillon('${n.id}')" title="${te('soumettre_validation')}">
                            ${EXEC_ICONS.send}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="execDeleteBrouillon('${n.id}')" title="${te('delete')}">
                            ${EXEC_ICONS.delete}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabSoumis(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('status')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(n => `<tr>
                    <td><strong>${_esc(n.reference || '')}</strong></td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_execStatusBadge(n.statut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execPreviewNotification('${n.id}')" title="${te('apercu')}">
                            ${EXEC_ICONS.eye}
                        </button>
                        ${_execCanValidate() && n.statut === 'soumis' ? `
                        <button class="btn btn-sm btn-success" onclick="execValidateNotification('${n.id}')" title="${te('valider')}">${EXEC_ICONS.check}</button>
                        <button class="btn btn-sm btn-danger" onclick="execRejectNotification('${n.id}')" title="${te('rejeter')}">${EXEC_ICONS.x}</button>
                        ` : ''}
                        ${n.statut === 'valide' ? `
                        <button class="btn btn-sm btn-accent" onclick="execSendNotification('${n.id}')">
                            ${EXEC_ICONS.send} ${te('envoyer')}
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="execCancelNotification('${n.id}', 'soumis')" title="Annuler et retourner en brouillon">
                            ${EXEC_ICONS.undo}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabEnvoyes(items) {
    // Filter out "acte" status - those move to Execution page
    const envoyeItems = items.filter(n => n.statut !== 'acte');
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('status')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${envoyeItems.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                envoyeItems.map(n => {
                    const isPrest = _execIsPrestataire();
                    const roAttr = 'readonly disabled';
                    const accDebut = n.date_debut_effective || n.date_activite || '';
                    const accFin = n.date_fin_effective || '';
                    const accPerim = _esc(n.perimetre_valide || n.perimetre_activite || '');
                    return `<tr>
                    <td><strong>${_esc(n.reference || '')}</strong></td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_execStatusBadge(n.statut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execToggleEnvoiPanel('${n.id}', this)" title="${te('valider_accord')}">
                            ${EXEC_ICONS.chevronDown}
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${n.id}')" title="${te('gerer_echange')}">
                            ${EXEC_ICONS.chat}
                        </button>
                        ${!isPrest ? `
                        <button class="btn btn-sm btn-accent" onclick="execValidateAccordRow('${n.id}')" title="${te('valider_accord')}">
                            ${EXEC_ICONS.check}
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="execCancelNotification('${n.id}', 'envoyes')" title="Annuler et retourner en brouillon">
                            ${EXEC_ICONS.undo}
                        </button>
                    </td>
                </tr>
                <tr id="exec_envoi_panel_${n.id}" style="display:none;">
                    <td colspan="5" style="background:var(--bg);padding:0.55rem 0.75rem;">
                        <div style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap;">
                            <div style="display:flex;flex-direction:column;gap:0.15rem;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${te('date_debut')}</label>
                                <input type="date" class="form-input" id="exec_row_debut_${n.id}" value="${accDebut}" style="height:30px;padding:0.2rem 0.45rem;font-size:0.8rem;" ${roAttr}>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.15rem;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${te('date_fin')}</label>
                                <input type="date" class="form-input" id="exec_row_fin_${n.id}" value="${accFin}" style="height:30px;padding:0.2rem 0.45rem;font-size:0.8rem;" ${roAttr}>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.15rem;flex:1;min-width:220px;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">Valider ${te('perimetre')}</label>
                                <textarea class="form-input" id="exec_row_perimetre_${n.id}" rows="2" style="resize:vertical;padding:0.25rem 0.45rem;font-size:0.8rem;line-height:1.3;min-height:42px;height:42px;" ${roAttr}>${accPerim}</textarea>
                            </div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// ══════════════════════════════════════
//  NOTIFICATION FORM SLIDER
// ══════════════════════════════════════

function execOpenNotificationForm(data) {
    data = data || {};
    EXEC_STATE.selectedNotification = data;

    const prestataires = EXEC_STATE.data.prestataires || [];
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    const typesSupervision = EXEC_STATE.data.typesSupervision || [];
    const aac = EXEC_STATE.data.aac || {};
    const prest = prestataires.find(p => p.id === data.prestataire_id) || {};

    const programme = data.programme || [];
    const equipe = data.equipe || [];

    // Map DB column names to form-friendly names for loading
    const dateFinVal = data.date_fin_prevue || data.date_fin_effective || '';
    const dateDebutVal = data.date_debut_prevue || data.date_activite || '';
    const natureVal = data.type_supervision || data.nature_activite || '';
    const objetVal = data.objet || data.objet_activite || '';
    const lieuVal = data.lieu || data.lieu_activite || '';
    const perimetreVal = data.perimetre || data.perimetre_activite || '';
    const fonctionRespVal = data.fonction_responsable || data.prestataire_responsable_fonction || '';
    const dirigeantVal = data.dirigeant || data.prestataire_dirigeant_nom || '';
    const interlocuteurVal = data.interlocuteur || prest.fonction_point_focal || data.prestataire_interlocuteur || '';
    const dateSigVal = data.date_signature || data.date_edition || new Date().toISOString().slice(0, 10);

    const bodyHtml = `
    <div class="exec-form-sections">

        ${_execFormSection('A', 'section_a_prestataire', `
            <!-- Row 1: Designation ; Fonction 1er Responsable ; Nom 1er Responsable -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('designation')}</label>
                    <select class="form-select" id="notif_prestataire_id" onchange="execUpdatePrestataireFields()">
                        <option value="">${te('select_option')}</option>
                        ${prestataires.map(p => `<option value="${p.id}" ${data.prestataire_id === p.id ? 'selected' : ''}>${_esc(p.nom)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${te('fonction_responsable')}</label>
                    <input type="text" class="form-input" id="notif_fonction_resp" value="${_escAttr(prest.fonction_responsable || fonctionRespVal)}">
                </div>
                <div class="form-group">
                    <label>${te('nom_responsable')}</label>
                    <input type="text" class="form-input" id="notif_nom_resp" value="${_escAttr(prest.dirigeant || data.nom_responsable || dirigeantVal)}">
                </div>
            </div>
            <!-- Row 2: Interlocuteur (Fonction) ; Interlocuteur (Nom) ; Interlocuteur (Email) -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('interlocuteur')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur" value="${_escAttr(prest.interlocuteur || interlocuteurVal)}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_nom')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur_nom" value="${_escAttr(data.interlocuteur_nom || prest.point_focal || '')}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_email')}</label>
                    <input type="email" class="form-input" id="notif_interlocuteur_email" value="${_escAttr(data.interlocuteur_email || prest.email_point_focal || '')}">
                </div>
            </div>
        `, true)}

        ${_execFormSection('B', 'section_b_equipe_audit', `
            <div id="notif_equipe_container">
                ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
                equipe.map((m, i) => {
                    const nom = typeof m === 'string' ? m : (m.nom || '');
                    const role = typeof m === 'object' ? (m.role || '') : '';
                    const roles = _execRolesEquipe();
                    const inspList = _getFilteredInspecteurs();
                    return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                    <select class="form-select equipe-nom-select" style="flex:1;">
                        <option value="">-- Inspecteur --</option>
                        ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                        ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_escAttr(nom)}" selected>${_esc(nom)}</option>` : ''}
                    </select>
                    <select class="form-select" style="flex:1;">
                        <option value="">${te('select_option')}</option>
                        ${roles.map(r => `<option value="${_escAttr(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`;
                }).join('')}
            </div>
            <button class="btn btn-sm btn-outline" onclick="execAddEquipeMember()" style="margin-top:0.35rem;">
                ${EXEC_ICONS.add} ${te('ajouter_membre')}
            </button>
        `, true)}

        ${_execFormSection('C1', 'section_c1_activite', `
            <!-- Row 1: Nature ; Date Debut ; Date Fin ; Lieu -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('nature_activite')}</label>
                    <select class="form-select" id="notif_type_supervision">
                        <option value="">${te('select_option')}</option>
                        <option value="audit" ${natureVal === 'audit' ? 'selected' : ''}>Audit</option>
                        <option value="inspection" ${natureVal === 'inspection' ? 'selected' : ''}>Inspection</option>
                        <option value="autres" ${natureVal === 'autres' ? 'selected' : ''}>Autres</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${te('date_debut')}</label>
                    <input type="date" class="form-input" id="notif_date_debut" value="${dateDebutVal}">
                </div>
                <div class="form-group">
                    <label>${te('date_fin')}</label>
                    <input type="date" class="form-input" id="notif_date_fin" value="${dateFinVal}">
                </div>
                <div class="form-group">
                    <label>${te('lieu')}</label>
                    <input type="text" class="form-input" id="notif_lieu" value="${_escAttr(lieuVal)}">
                </div>
            </div>
            <!-- Row 2: Objet ; Perimetre -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('objet')}</label>
                    <textarea class="form-input" id="notif_objet" rows="1">${_esc(objetVal)}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('perimetre')}</label>
                    <textarea class="form-input" id="notif_perimetre" rows="4" style="resize:vertical;">${_esc(perimetreVal)}</textarea>
                </div>
            </div>
            <!-- Row 3: Referentiels ; Documents Requis -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('referentiels')}</label>
                    <textarea class="form-input" id="notif_referentiels" rows="1" placeholder="OACI Annexe, RAG, Circulaires...">${_esc(data.referentiels || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('documents_requis')}</label>
                    <textarea class="form-input" id="notif_documents" rows="1" placeholder="Manuel d'exploitation, certificats...">${_esc(data.documents_requis || '')}</textarea>
                </div>
            </div>
        `, true)}

        ${_execFormSection('C2', 'section_c2_programme', `
            <table class="exec-data-table" id="notif_programme_table">
                <thead>
                    <tr>
                        <th>${te('date')}</th>
                        <th>${te('horaire')}</th>
                        <th>${te('actions_prevues')}</th>
                        <th>${te('correspondant')}</th>
                        <th style="width:60px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${programme.length === 0 ? `<tr id="notif_prog_empty"><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    programme.map((p, i) => `<tr data-prog-idx="${i}">
                        <td><input type="date" class="form-input" value="${p.date || ''}" data-field="date"></td>
                        <td><input type="text" class="form-input" value="${_escAttr(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"></td>
                        <td><input type="text" class="form-input" value="${_escAttr(p.actions || '')}" data-field="actions"></td>
                        <td><input type="text" class="form-input" value="${_escAttr(p.correspondant || '')}" data-field="correspondant"></td>
                        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <button class="btn btn-sm btn-outline" onclick="execAddProgrammeLine()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.add} ${te('ajouter_programme')}
            </button>
        `, false)}

        ${_execFormSection('F', 'section_f_signature', `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('fait_a')}</label>
                    <input type="text" class="form-input" id="notif_fait_a" value="${_escAttr(data.fait_a || '')}">
                </div>
                <div class="form-group">
                    <label>${te('date_signature')}</label>
                    <input type="date" class="form-input" id="notif_date_sig" value="${dateSigVal}">
                </div>
                <div class="form-group">
                    <label>${te('signataire')}</label>
                    <input type="text" class="form-input" id="notif_signataire" value="${_escAttr(data.signataire || EXEC_STATE.user?.nom || '')}">
                </div>
            </div>
        `, false)}
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>
        <button class="btn btn-primary" onclick="execSaveNotificationDraft()">
            ${EXEC_ICONS.clipboard} ${te('sauvegarder_brouillon')}
        </button>
        <button class="btn btn-accent" onclick="execPreviewNotificationFromForm()">
            ${EXEC_ICONS.eye} ${te('apercu_fiche')}
        </button>
    `;

    execShowSlider(`${EXEC_ICONS.trigger} Notification`, bodyHtml, footerHtml, 'max');
    // Règles communes des dates : le début dans l'année déclarée quand
    // l'activité en porte une, la fin jamais avant le début.
    oasisDatesLier({ annee: (data && data.annee) || '', debut: 'notif_date_debut', fin: 'notif_date_fin' });
}

function _getFilteredInspecteurs() {
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    // Get domain of the selected prestataire
    const prestId = document.getElementById('notif_prestataire_id')?.value || EXEC_STATE.selectedNotification?.prestataire_id || '';
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestId);
    let domaineId = '';
    if (prest) {
        // Get domaine from prestataire's secteur
        const secteur = (EXEC_STATE.data.secteurs || []).find(s => s.id === prest.secteur_id);
        domaineId = secteur ? secteur.domaine_id : '';
    }
    if (!domaineId) return inspecteurs.filter(i => i.statut !== 'inactif');
    // Filter inspectors whose domaines array includes this domaine
    return inspecteurs.filter(i => {
        if (i.statut === 'inactif') return false;
        let doms = i.domaines;
        if (typeof doms === 'string') { try { doms = JSON.parse(doms); } catch(e) { doms = []; } }
        if (!Array.isArray(doms)) return true; // No domain filter if not set
        return doms.length === 0 || doms.includes(domaineId);
    });
}

function execAddEquipeMember() {
    const container = document.getElementById('notif_equipe_container');
    if (!container) return;
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    const roles = _execRolesEquipe();
    const inspList = _getFilteredInspecteurs();
    div.innerHTML = `
        <select class="form-select equipe-nom-select" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_escAttr(r)}">${_esc(r)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

function execAddProgrammeLine() {
    const tbody = document.querySelector('#notif_programme_table tbody');
    if (!tbody) return;
    const empty = document.getElementById('notif_prog_empty');
    if (empty) empty.remove();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="form-input" data-field="date"></td>
        <td><input type="text" class="form-input" data-field="horaire" placeholder="09:00-12:00"></td>
        <td><input type="text" class="form-input" data-field="actions"></td>
        <td><input type="text" class="form-input" data-field="correspondant"></td>
        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
    `;
    tbody.appendChild(tr);
}

function execUpdatePrestataireFields() {
    const sel = document.getElementById('notif_prestataire_id');
    if (!sel) return;
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === sel.value) || {};
    const fields = {
        notif_fonction_resp: 'fonction_responsable',
        notif_nom_resp: 'dirigeant',
        notif_interlocuteur: 'fonction_point_focal',
        notif_interlocuteur_nom: 'point_focal',
        notif_interlocuteur_email: 'email_point_focal'
    };
    for (const [elId, key] of Object.entries(fields)) {
        const el = document.getElementById(elId);
        if (el) el.value = prest[key] || '';
    }
}

function _collectNotificationForm() {
    const programme = [];
    document.querySelectorAll('#notif_programme_table tbody tr:not(#notif_prog_empty)').forEach(tr => {
        const row = {};
        tr.querySelectorAll('input[data-field]').forEach(inp => { row[inp.dataset.field] = inp.value; });
        if (row.date || row.actions) programme.push(row);
    });

    const equipe = [];
    document.querySelectorAll('#notif_equipe_container > div').forEach(div => {
        const selects = div.querySelectorAll('select');
        const nomSel = selects[0]; // first select = inspector name
        const roleSel = selects[1]; // second select = role
        const nom = nomSel ? nomSel.value.trim() : '';
        if (nom) equipe.push({ nom, role: roleSel ? roleSel.value : '' });
    });

    return {
        prestataire_id: document.getElementById('notif_prestataire_id')?.value || '',
        fonction_responsable: document.getElementById('notif_fonction_resp')?.value || '',
        nom_responsable: document.getElementById('notif_nom_resp')?.value || '',
        interlocuteur: document.getElementById('notif_interlocuteur')?.value || '',
        interlocuteur_nom: document.getElementById('notif_interlocuteur_nom')?.value || '',
        interlocuteur_email: document.getElementById('notif_interlocuteur_email')?.value || '',
        equipe,
        type_supervision: document.getElementById('notif_type_supervision')?.value || '',
        date_debut_prevue: document.getElementById('notif_date_debut')?.value || '',
        date_fin_prevue: document.getElementById('notif_date_fin')?.value || '',
        lieu: document.getElementById('notif_lieu')?.value || '',
        objet: document.getElementById('notif_objet')?.value || '',
        perimetre: document.getElementById('notif_perimetre')?.value || '',
        programme,
        referentiels: document.getElementById('notif_referentiels')?.value || '',
        documents_requis: document.getElementById('notif_documents')?.value || '',
        fait_a: document.getElementById('notif_fait_a')?.value || '',
        date_signature: document.getElementById('notif_date_sig')?.value || '',
        signataire: document.getElementById('notif_signataire')?.value || '',
        activite_id: EXEC_STATE.selectedNotification?.activite_id || '',
        plan_id: EXEC_STATE.selectedNotification?.plan_id || '',
        secteur_id: EXEC_STATE.selectedNotification?.secteur_id || ''
    };
}

async function execSaveNotificationDraft() {
    if (!oasisDatesValider({ annee: (EXEC_STATE.selectedNotification || {}).annee || '',
        debut: 'notif_date_debut', fin: 'notif_date_fin' })) return;
    const data = _collectNotificationForm();
    const existing = EXEC_STATE.selectedNotification;
    try {
        if (existing && existing.id) {
            await api(`${EXEC_MODULE_API}/notifications/${existing.id}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            const res = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(data) });
            if (res && res.id) {
                EXEC_STATE.selectedNotification = { ...data, id: res.id, reference: res.reference };
            }
        }
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Save notification error:', e);
        oasisToast(te('err_sauvegarde'), 'error');
    }
}

async function execEditNotification(notifId) {
    try {
        const notif = await api(`${EXEC_MODULE_API}/notifications/${notifId}`);
        if (notif) {
            EXEC_STATE.selectedNotification = notif;
            execOpenNotificationForm(notif);
        }
    } catch (e) {
        console.error('Load notification error:', e);
    }
}

// ══════════════════════════════════════
//  NOTIFICATION PREVIEW (A4 paper)
// ══════════════════════════════════════

function execPreviewNotificationFromForm() {
    const data = _collectNotificationForm();
    // Preserve existing id/reference so submission works
    const existing = EXEC_STATE.selectedNotification || {};
    data.id = existing.id || data.id;
    data.reference = existing.reference || data.reference;
    data.prestataire_nom = existing.prestataire_nom || data.prestataire_nom;
    EXEC_STATE.selectedNotification = Object.assign({}, existing, data);
    _showNotificationPreview(EXEC_STATE.selectedNotification, true);
}

// Accusé de réception : le prestataire acte la notification. Le message part
// dans le fil d'échange et la fiche porte l'accusé en pied.
window.execAccuserReception = async function (notifId) {
    const n = (EXEC_STATE.data.notifications || []).find(x => x.id === notifId) || {};
    const debut = n.date_debut_effective || n.date_debut_prevue || n.date_activite || '';
    const fin = n.date_fin_effective || n.date_fin_prevue || '';
    const ok = await execProcConfirmer({
        titre: te('accuser_reception'),
        message: te('accuser_reception_message')
            .replace('{debut}', _formatDate(debut) || '—')
            .replace('{fin}', _formatDate(fin) || '—'),
        libelle: te('accuser_reception'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/accuser-reception`, {
            method: 'POST', body: JSON.stringify({}),
        });
        await execRefreshDynamic();
        _execToast(te('accuse_ok'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

async function execPreviewNotification(notifId) {
    try {
        const notif = await api(`${EXEC_MODULE_API}/notifications/${notifId}`);
        if (notif) {
            EXEC_STATE.selectedNotification = notif;
            _showNotificationPreview(notif, false);
        }
    } catch (e) {
        console.error('Preview error:', e);
    }
}

function _showNotificationPreview(data, fromForm) {
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === data.prestataire_id) || {};
    const aac = EXEC_STATE.data.aac || {};
    const programme = data.programme || [];
    const equipe = data.equipe || [];
    const ref = data.reference || EXEC_STATE.selectedNotification?.reference || 'NOTIF-XXXX-XXX';
    // Build sub-activities / périmètre lines
    const perimetreText = data.perimetre || data.perimetre_activite || '';
    const perimetreLines = perimetreText ? perimetreText.split('\n').filter(l => l.trim()) : [];

    const bodyHtml = `
    <div class="official-doc-form">
        <div class="official-doc-page" style="font-family:Calibri,Arial,sans-serif;font-size:0.9rem;color:#111;">
            <!-- ── Titre ── -->
            <div style="background:#DAE9F7;padding:0.6rem 1rem;text-align:center;font-weight:700;font-size:1.15rem;margin-bottom:0.4rem;">
                FICHE DE NOTIFICATION
            </div>
            <div style="text-align:right;font-size:0.85rem;color:#555;margin-bottom:1rem;">
                ${_esc(ref)}
            </div>

            <!-- ── 1. PRESTATAIRE ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                1. PRESTATAIRE
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                <tr style="height:28px;"><td style="width:42%;font-weight:600;padding:0.2rem 0;">Désignation :</td><td>${_esc(prest.nom || data.prestataire_nom || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Nom du 1er Responsable :</td><td>${_esc(data.nom_responsable || data.dirigeant || prest.dirigeant || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Fonction du 1er Responsable :</td><td>${_esc(data.fonction_responsable || prest.fonction_responsable || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Nom) :</td><td>${_esc(data.interlocuteur_nom || prest.point_focal || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Email) :</td><td>${_esc(data.interlocuteur_email || prest.email_point_focal || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Fonction) :</td><td>${_esc(data.interlocuteur || prest.fonction_point_focal || '')}</td></tr>
            </table>

            <!-- ── 2. EQUIPE D'AUDIT/INSPECTION ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                2. EQUIPE D'AUDIT/INSPECTION
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                ${equipe.length > 0 ? equipe.map((m, i) => {
                    const nom = typeof m === 'object' ? (m.nom || '') : m;
                    const role = typeof m === 'object' ? (m.role || m.fonction || '') : '';
                    return `<tr style="height:28px;"><td style="width:42%;padding:0.2rem 0;">${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
                }).join('') : '<tr><td style="color:#999;font-style:italic;">-</td></tr>'}
            </table>

            <!-- ── 3. ACTIVITE ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                3. ACTIVITE
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.35rem;">
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Nature de l'Activité :</td><td>${_esc(data.type_supervision || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Dates :</td><td>${_formatDate(data.date_debut_prevue || data.date_activite)} — ${_formatDate(data.date_fin_prevue || data.date_fin_effective)}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Lieu :</td><td>${_esc(data.lieu || data.lieu_activite || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Objet :</td><td>${_esc(data.objet || data.objet_activite || '')}</td></tr>
                <tr><td style="font-weight:600;padding:0.2rem 0;vertical-align:top;">Périmètre :</td><td></td></tr>
            </table>
            ${perimetreLines.length > 0 ? `<ul style="margin:0 0 0.75rem 1.5rem;font-size:0.85rem;list-style:disc;">
                ${perimetreLines.map(l => `<li style="margin-bottom:0.15rem;">${_esc(l.trim())}</li>`).join('')}
            </ul>` : '<p style="margin:0 0 0.75rem 1rem;color:#999;font-style:italic;">-</p>'}

            <!-- ── 4. PROGRAMME DE TRAVAIL ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                4. PROGRAMME DE TRAVAIL
            </div>
            ${programme.length > 0 ? `
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.75rem;border:1px solid #999;">
                <thead><tr style="background:#f3f4f6;">
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('date')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('horaire')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('actions_prevues')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('correspondant')}</th>
                </tr></thead>
                <tbody>
                    ${programme.map(p => `<tr>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.date || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.horaire || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.actions || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.correspondant || '')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : '<p style="font-style:italic;color:#999;margin-bottom:0.75rem;">-</p>'}

            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                <tr style="height:28px;"><td style="font-weight:600;width:42%;padding:0.2rem 0;">Référentiels :</td><td>${_esc(data.referentiels || '-')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Documents requis :</td><td>${_esc(data.documents_requis || '-')}</td></tr>
            </table>

            <!-- ── SIGNATURE ── -->
            <div style="margin-top:1.5rem;font-size:0.85rem;">
                <div style="margin-bottom:0.25rem;"><strong>Fait à :</strong> ${_esc(data.fait_a || '')}</div>
                <div style="margin-bottom:0.25rem;"><strong>Date :</strong> ${_formatDate(data.date_signature)}</div>
                <div style="margin-top:1.5rem;text-align:right;width:50%;margin-left:auto;">
                    <div style="border-bottom:1px solid #333;padding-bottom:2.5rem;margin-bottom:0.3rem;"></div>
                    <div style="font-size:0.82rem;color:#555;">${_esc(data.signataire || '')}</div>
                </div>
            </div>
        </div>
    </div>`;

    let footerHtml = '';
    if (fromForm) {
        footerHtml = `
            <button class="btn btn-outline" onclick="execOpenNotificationForm(EXEC_STATE.selectedNotification)">
                ${EXEC_ICONS.back} ${te('retour_formulaire')}
            </button>
            <button class="btn btn-primary" onclick="execSubmitNotificationForValidation()">
                ${EXEC_ICONS.send} ${te('soumettre_validation')}
            </button>
        `;
    } else {
        footerHtml = `
            <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
            ${_execCanValidate() && data.statut === 'soumis' ? `
                <button class="btn btn-success" onclick="execValidateNotification('${data.id}')">${te('valider')}</button>
                <button class="btn btn-danger" onclick="execRejectNotification('${data.id}')">${te('rejeter')}</button>
            ` : ''}
        `;
    }

    execSwitchSlider(`${EXEC_ICONS.eye} ${te('apercu_fiche')}`, bodyHtml, footerHtml, 'xl');
}

async function execSubmitNotificationForValidation() {
    // Use stored data from preview (form DOM no longer exists at this point)
    const existing = EXEC_STATE.selectedNotification || {};
    const data = Object.assign({}, existing);
    _showValidatorPicker(async (validateurId) => {
        try {
            let notifId = existing?.id;
            if (!notifId) {
                const res = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(data) });
                notifId = res?.id;
            } else {
                await api(`${EXEC_MODULE_API}/notifications/${notifId}`, { method: 'PUT', body: JSON.stringify(data) });
            }
            if (notifId) {
                await api(`${EXEC_MODULE_API}/notifications/${notifId}/submit`, {
                    method: 'PUT',
                    body: JSON.stringify({ validateur_id: validateurId })
                });
            }
            await execRefreshDynamic();
            execCloseSlider();
            EXEC_STATE.triggerTab = 'soumis';
            execRenderPage();
        } catch (e) {
            console.error('Submit notification error:', e);
            oasisToast(te('err_soumission'), 'error');
        }
    });
}

async function execValidateNotification(notifId) {
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate`, { method: 'PUT' });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Validate notification error:', e);
    }
}

async function execRejectNotification(notifId) {
    const motif = await oasisSaisir('Motif du rejet', { titre: 'Rejeter la notification', libelle: 'Rejeter' });
    if (motif === null) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/reject`, { method: 'PUT', body: JSON.stringify({ motif }) });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Reject notification error:', e);
    }
}

async function execSendNotification(notifId) {
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = 'envoyes';
        execRenderPage();
    } catch (e) {
        console.error('Send notification error:', e);
    }
}

async function execSubmitBrouillon(notifId) {
    // Show validator selection dialog
    _showValidatorPicker(async (validateurId) => {
        try {
            await api(`${EXEC_MODULE_API}/notifications/${notifId}/submit`, {
                method: 'PUT',
                body: JSON.stringify({ validateur_id: validateurId })
            });
            await execRefreshDynamic();
            EXEC_STATE.triggerTab = 'soumis';
            execRenderPage();
            if (typeof showNotification === 'function') showNotification(te('notification_submitted'), 'success');
        } catch (e) {
            console.error('Submit brouillon error:', e);
            oasisToast(e.message || 'Erreur lors de la soumission', 'error');
        }
    });
}

function _showValidatorPicker(onConfirm) {
    // Fetch users to get validators
    api('/api/users').then(users => {
        const validators = (users || []).filter(u =>
            u.role_m3 === 'M3_Validateur' || u.role_m3 === 'M3_Administrateur'
        );
        const overlay = document.createElement('div');
        overlay.id = 'validator-picker-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
        <div style="background:var(--card-bg,#fff);border-radius:12px;padding:1.5rem;width:400px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 1rem;">Soumettre pour validation</h3>
            <div class="form-group">
                <label style="font-weight:600;margin-bottom:0.5rem;display:block;">Validateur</label>
                <select class="form-select" id="validator_picker_select" style="width:100%;">
                    <option value="">-- Sélectionner un validateur --</option>
                    ${validators.map(u => `<option value="${u.id}">${_esc(u.prenom || '')} ${_esc(u.nom || '')} (${_esc(u.role_m3 || '')})</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem;">
                <button class="btn btn-outline" id="validator_picker_cancel">${te('cancel')}</button>
                <button class="btn btn-primary" id="validator_picker_confirm">${EXEC_ICONS.send} ${te('soumettre_validation')}</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('validator_picker_cancel').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.getElementById('validator_picker_confirm').onclick = () => {
            const sel = document.getElementById('validator_picker_select')?.value || '';
            if (!sel) { oasisToast(te('selectionner_validateur'), 'warning'); return; }
            overlay.remove();
            onConfirm(sel);
        };
    }).catch(async () => {
        // Fallback: submit without validator
        if (await oasisConfirmer(te('confirm_submit'))) {
            onConfirm('');
        }
    });
}

async function execDeleteBrouillon(notifId) {
    if (!await oasisConfirmer('Supprimer ce brouillon ? L\'activité sera de nouveau disponible dans "A Notifier".')) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = 'brouillons';
        execRenderPage();
        if (typeof showNotification === 'function') showNotification('Brouillon supprimé', 'success');
    } catch (e) {
        console.error('Delete brouillon error:', e);
        oasisToast(e.message || 'Erreur lors de la suppression', 'error');
    }
}

async function execCancelNotification(notifId, fromTab) {
    const motif = await oasisSaisir('Motif de l’annulation', { titre: 'Annuler la notification', libelle: 'Annuler la notification', libelleAnnuler: 'Revenir' });
    if (motif === null) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ motif: motif || 'Annulation' })
        });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = fromTab || 'brouillons';
        execRenderPage();
        if (typeof showNotification === 'function') showNotification('Notification annulée', 'success');
    } catch (e) {
        console.error('Cancel notification error:', e);
        oasisToast(e.message || 'Erreur lors de l\'annulation', 'error');
    }
}

function execShowContacts(prestataireId) {
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestataireId);
    if (!prest) {
        execShowSlider(`${EXEC_ICONS.prestataires} ${te('contacts')}`, `<p>${te('no_data')}</p>`, '', 'xl');
        return;
    }
    const bodyHtml = `
    <div class="exec-contact-form" style="display:flex;flex-direction:column;gap:1rem;">
        <h4 style="margin-bottom:0;">${_esc(prest.nom || '')} (${_esc(prest.trigramme || '')})</h4>
        <!-- Row 1: Dirigeant ; Fonction du Responsable ; Email Prestataire -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;">
            <div class="form-group"><label>Dirigeant</label><input type="text" class="form-input" id="contact_dirigeant" value="${_escAttr(prest.dirigeant || '')}"></div>
            <div class="form-group"><label>Fonction du Responsable</label><input type="text" class="form-input" id="contact_fonction_resp" value="${_escAttr(prest.fonction_responsable || '')}"></div>
            <div class="form-group"><label>Email Prestataire</label><input type="email" class="form-input" id="contact_email_prest" value="${_escAttr(prest.email_prestataire || '')}"></div>
        </div>
        <!-- Row 2: Nom Point Focal ; Fonction Point Focal ; Email Point Focal ; N° Point Focal -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem;">
            <div class="form-group"><label>Nom Point Focal</label><input type="text" class="form-input" id="contact_point_focal" value="${_escAttr(prest.point_focal || '')}"></div>
            <div class="form-group"><label>Fonction Point Focal</label><input type="text" class="form-input" id="contact_fonction_pf" value="${_escAttr(prest.fonction_point_focal || '')}"></div>
            <div class="form-group"><label>Email Point Focal</label><input type="email" class="form-input" id="contact_email_pf" value="${_escAttr(prest.email_point_focal || '')}"></div>
            <div class="form-group"><label>N° Point Focal</label><input type="text" class="form-input" id="contact_numero_pf" value="${_escAttr(prest.numero_point_focal || '')}"></div>
        </div>
        <hr style="border:0;border-top:1px solid var(--border);margin:0.25rem 0;">
        <!-- Row 3: Contacts additionnels -->
        <h4 style="margin-bottom:0;">${te('contacts_supplementaires')}</h4>
        <div id="contacts_additional_container">
            ${(() => {
                let addContacts = prest.contacts_additionnels || '[]';
                if (typeof addContacts === 'string') { try { addContacts = JSON.parse(addContacts); } catch(e) { addContacts = []; } }
                if (!Array.isArray(addContacts) || addContacts.length === 0) {
                    if (prest.contact_nom) addContacts = [{nom: prest.contact_nom, tel: prest.contact_tel, email: prest.contact_email}];
                }
                return addContacts.map(c => `
                <div class="contact-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                    <input type="text" class="form-input" value="${_escAttr(c.nom || '')}" placeholder="Nom" style="flex:1;">
                    <input type="text" class="form-input" value="${_escAttr(c.tel || '')}" placeholder="Téléphone" style="flex:1;">
                    <input type="email" class="form-input" value="${_escAttr(c.email || '')}" placeholder="Email" style="flex:1;">
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('');
            })()}
        </div>
        <button class="btn btn-sm btn-outline" onclick="execAddContactRow()" style="margin-top:0.25rem;">
            ${EXEC_ICONS.add} Ajouter un contact
        </button>
    </div>`;
    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
        <button class="btn btn-primary" onclick="execSaveContactChanges('${prestataireId}')">
            ${EXEC_ICONS.check} ${te('save')}
        </button>`;
    execShowSlider(`${EXEC_ICONS.prestataires} ${te('contacts')}`, bodyHtml, footerHtml, 'xl');
}

function execAddContactRow() {
    const container = document.getElementById('contacts_additional_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'contact-row';
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    div.innerHTML = `
        <input type="text" class="form-input" value="" placeholder="Nom" style="flex:1;">
        <input type="text" class="form-input" value="" placeholder="Téléphone" style="flex:1;">
        <input type="email" class="form-input" value="" placeholder="Email" style="flex:1;">
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

async function execSaveContactChanges(prestataireId) {
    const data = {
        dirigeant: document.getElementById('contact_dirigeant')?.value || '',
        fonction_responsable: document.getElementById('contact_fonction_resp')?.value || '',
        point_focal: document.getElementById('contact_point_focal')?.value || '',
        fonction_point_focal: document.getElementById('contact_fonction_pf')?.value || '',
        email_prestataire: document.getElementById('contact_email_prest')?.value || '',
        email_point_focal: document.getElementById('contact_email_pf')?.value || '',
        numero_point_focal: document.getElementById('contact_numero_pf')?.value || ''
    };
    // Collect all additional contacts
    const rows = document.querySelectorAll('#contacts_additional_container .contact-row');
    const additionalContacts = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const nom = inputs[0]?.value || '';
        const tel = inputs[1]?.value || '';
        const email = inputs[2]?.value || '';
        if (nom || tel || email) additionalContacts.push({ nom, tel, email });
    });
    // Store first contact in legacy columns + all in JSON
    if (additionalContacts.length > 0) {
        data.contact_nom = additionalContacts[0].nom;
        data.contact_tel = additionalContacts[0].tel;
        data.contact_email = additionalContacts[0].email;
    }
    data.contacts_additionnels = JSON.stringify(additionalContacts);
    try {
        await api(`/api/prestataires/${prestataireId}`, { method: 'PUT', body: JSON.stringify(data) });
        // Refresh shared data
        if (typeof loadSharedData === 'function') await loadSharedData();
        EXEC_STATE.data.prestataires = window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires;
        execCloseSlider();
        if (typeof showNotification === 'function') showNotification('Contacts mis à jour', 'success');
    } catch (e) {
        console.error('Save contacts error:', e);
        oasisToast(e.message || 'Erreur', 'error');
    }
}

// ══════════════════════════════════════
//  EXCHANGE SLIDER
// ══════════════════════════════════════

async function execOpenExchangeSlider(notifId) {
    let notif, echanges;
    try {
        [notif, echanges] = await Promise.all([
            api(`${EXEC_MODULE_API}/notifications/${notifId}`).catch(e => { console.error('Load notif error:', e); return null; }),
            api(`${EXEC_MODULE_API}/notifications/${notifId}/echanges`).catch(e => { console.error('Load echanges error:', e); return []; })
        ]);
    } catch (e) {
        console.error('Load exchange error:', e);
        return;
    }
    if (!notif) { oasisToast(te('notification_introuvable'), 'error'); return; }
    echanges = echanges || [];
    EXEC_STATE.selectedNotification = notif;

    const isPrest = _execIsPrestataire();
    const myId = EXEC_STATE.user?.id || '';
    const accordReadOnly = isPrest ? 'readonly disabled' : '';
    const accordReadOnlyAttr = isPrest ? 'disabled' : '';

    const bodyHtml = `
    <div class="exec-proc-bloc exec-echange-entete">
        ${execProcLigne(te('reference'), _esc(notif.reference || ''))}
        ${execProcLigne(te('provider'), _esc(notif.prestataire_nom || ''))}
        ${execProcLigne(te('objet'), _esc(notif.objet || notif.objet_activite || ''))}
        ${execProcLigne(te('status'), _execStatusBadge(notif.statut))}
    </div>

    <h4 class="exec-proc-col-titre">${te('discussions')}</h4>
    <div class="exchange-chat discussions-chat" id="exec_exchange_timeline">
        ${(!echanges || echanges.length === 0) ? `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.5rem 0;">${te('no_data')}</p>` :
        echanges.map((e, idx) => {
            const isMe = e.auteur_id && myId && e.auteur_id === myId;
            const prev = echanges[idx - 1];
            const next = echanges[idx + 1];
            const sameAsPrev = prev && (prev.auteur_id === e.auteur_id);
            const sameAsNext = next && (next.auteur_id === e.auteur_id);
            const isLastOfGroup = !sameAsNext;
            const initials = ((e.auteur_prenom || 'U')[0] + ((e.auteur_nom || '')[0] || '')).toUpperCase();
            const fullName = `${_esc(e.auteur_prenom || '')} ${_esc(e.auteur_nom || '')}`.trim();
            const avatarHtml = !isMe
                ? (isLastOfGroup ? `<div class="exchange-avatar">${initials}</div>` : `<div class="exchange-avatar" style="visibility:hidden;"></div>`)
                : '';
            return `
        <div class="exchange-bubble-row ${isMe ? 'self' : 'other'}">
            ${avatarHtml}
            <div class="exchange-bubble">
                <div class="exchange-bubble-body">${_esc(
                    String(e.contenu || '')
                        .replace(/<br\s*\/?>/gi, '\n')          // convertit d'éventuels <br> stockés
                        .split(/\r?\n/)
                        .map(l => l.replace(/\s+$/, ''))        // retire les espaces en fin de ligne
                        .filter(l => l.trim() !== '')           // supprime toutes les lignes vides
                        .join('\n')
                )}</div>
                ${(e.pieces_jointes && e.pieces_jointes.length > 0) ? `
                <div class="exchange-bubble-attachments">
                    ${e.pieces_jointes.map(pj => `<span class="exchange-attachment">${EXEC_ICONS.file} ${_esc(pj.filename || pj)}</span>`).join('')}
                </div>` : ''}
            </div>
        </div>
        ${isLastOfGroup ? `<div class="exchange-bubble-time ${isMe ? 'self' : 'other'}">
          <span class="exchange-bubble-auteur">${fullName || '—'}</span>
          <span>${_formatDatetime(e.date_creation)}</span>
        </div>` : ''}`;
        }).join('')}
    </div>

    <div class="exchange-reply">
        <label>${te('repondre')}</label>
        <div class="exchange-reply-row">
            <textarea class="form-input" id="exec_exchange_msg" rows="1" placeholder="Votre message..."
                      style="resize:none;overflow:hidden;min-height:2.2rem;line-height:1.4;"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"></textarea>
            <button class="btn btn-primary" onclick="execSendExchangeMessage('${notifId}')">
                ${EXEC_ICONS.send} Envoyer
            </button>
        </div>
    </div>

    ${notif.statut === 'envoye' ? `
    <h4 class="exec-proc-col-titre">${te('valider_accord')}${isPrest
        ? ` <span class="exec-echange-lecture">(${te('lecture_seule')})</span>` : ''}</h4>
    <div class="exec-proc-bloc">
        <div class="exec-echange-dates">
            <div class="form-group">
                <label class="form-label">${te('date_debut')}</label>
                <input type="date" class="form-control" id="exec_accord_debut" value="${notif.date_debut_prevue || notif.date_activite || ''}" ${accordReadOnly}>
            </div>
            <div class="form-group">
                <label class="form-label">${te('date_fin')}</label>
                <input type="date" class="form-control" id="exec_accord_fin" value="${notif.date_fin_prevue || notif.date_fin_effective || ''}" ${accordReadOnly}>
            </div>
        </div>
        <label class="form-label">${te('perimetre')}</label>
        <textarea class="form-control" id="exec_accord_perimetre" rows="6" ${accordReadOnlyAttr}>${_esc(notif.perimetre || notif.perimetre_activite || '')}</textarea>
    </div>` : ''}`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
    `;

    execShowSlider(`${EXEC_ICONS.chat} ${te('gerer_echange')}`, bodyHtml, footerHtml, 'third');
    // Dates de l'accord : la fin ne précède pas le début.
    oasisDatesLier({ debut: 'exec_accord_debut', fin: 'exec_accord_fin' });
    // Scroll the chat container to the latest message (WhatsApp-like behaviour)
    setTimeout(() => {
        const tl = document.getElementById('exec_exchange_timeline');
        if (tl) tl.scrollTop = tl.scrollHeight;
    }, 50);
}

async function execSendExchangeMessage(notifId) {
    const msg = document.getElementById('exec_exchange_msg')?.value?.trim();
    if (!msg) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/echanges`, {
            method: 'POST',
            body: JSON.stringify({ contenu: msg, type_message: 'message' })
        });
        execOpenExchangeSlider(notifId);
    } catch (e) {
        console.error('Send exchange error:', e);
    }
}

async function execValidateAccord(notifId) {
    if (!oasisDatesValider({ debut: 'exec_accord_debut', fin: 'exec_accord_fin' })) return;
    const dateDebut = document.getElementById('exec_accord_debut')?.value || '';
    const dateFin = document.getElementById('exec_accord_fin')?.value || '';
    const perimetre = document.getElementById('exec_accord_perimetre')?.value || '';
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate-accord`, {
            method: 'PUT',
            body: JSON.stringify({ date_debut_effective: dateDebut, date_fin_effective: dateFin, perimetre_valide: perimetre })
        });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Validate accord error:', e);
    }
}

// Volet rétractable d'une ligne « Notification » (onglet Déclenchement / Envoyés).
function execToggleEnvoiPanel(notifId, btn) {
    const panel = document.getElementById('exec_envoi_panel_' + notifId);
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.classList.toggle('active', open);
    if (open) oasisDatesLier({ debut: 'exec_row_debut_' + notifId, fin: 'exec_row_fin_' + notifId });
}

// Validation de l'accord directement depuis la ligne (mêmes effets que « Valider l'Accord »).
async function execValidateAccordRow(notifId) {
    if (!oasisDatesValider({ debut: 'exec_row_debut_' + notifId, fin: 'exec_row_fin_' + notifId })) return;
    const dateDebut = document.getElementById('exec_row_debut_' + notifId)?.value || '';
    const dateFin = document.getElementById('exec_row_fin_' + notifId)?.value || '';
    const perimetre = document.getElementById('exec_row_perimetre_' + notifId)?.value || '';
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate-accord`, {
            method: 'PUT',
            body: JSON.stringify({ date_debut_effective: dateDebut, date_fin_effective: dateFin, perimetre_valide: perimetre })
        });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Validate accord error:', e);
    }
}

