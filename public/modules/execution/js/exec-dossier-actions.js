/* OASIS — Exécution de la Surveillance
 * Suite de exec-checklists-saisie.js : les gestes sur le dossier — validation et envoi du rapport, renvoi, clôture — et le formulaire de constatation.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

async function execValidateRapport(rapportId) {
    if (!await oasisConfirmer(te('confirmer_valider_rapport'))) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/validate`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('rapport_valide_ok'), 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Validate rapport error:', e);
        _execToast(te('err_validation'), 'error');
    }
}

async function execAmendRapport(rapportId) {
    const observations = await oasisSaisir(te('observations_amendement'),
        { titre: te('amender_rapport_titre'), libelle: te('renvoyer_redaction') });
    if (observations === null) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/amend`, {
            method: 'PUT', body: JSON.stringify({ observations })
        });
        await execRefreshDynamic();
        _execToast(te('rapport_renvoye_amendement'), 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) { EXEC_STATE.dossierStep = 'redaction'; execOpenDossierSlider(d.id); }
    } catch (e) {
        console.error('Amend rapport error:', e);
        _execToast(te('err_amendement'), 'error');
    }
}

async function execSendRapportValidated(rapportId) {
    if (!await oasisConfirmer(te('confirmer_envoyer_organisme'))) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('rapport_envoye'), 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Send rapport error:', e);
        _execToast(te('err_envoi'), 'error');
    }
}

async function execGenerateNotificationPdf(dossierId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier || !dossier.notification_id) {
        _execToast(te('aucune_notification_dossier'), 'error');
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
            _execToast(te('pdf_indisponible'), 'info');
        }
    } catch (e) {
        // Fallback: open the notification preview for printing
        _execToast(te('imprimer_ctrl_p'), 'info');
        if (dossier.notification_id) {
            execPreviewNotification(dossier.notification_id);
        }
    }
}

async function execReturnDossier(dossierId) {
    if (!await oasisConfirmer(te('confirmer_renvoi_dossier'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/return`, {
            method: 'PUT',
            body: JSON.stringify({ observations: '' })
        });
        await execRefreshDynamic();
        _execToast(te('dossier_renvoye'), 'success');
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Return dossier error:', e);
        _execToast(te('err_renvoi'), 'error');
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
        if (!silent) _execToast(te('aucun_champ_a_enregistrer'), 'info');
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
            _execToast(te('brouillon_enregistre_ok'), 'success');
        }
    } catch (e) {
        console.error('Save dossier error:', e);
        if (!silent) _execToast(te('err_sauvegarde'), 'error');
    }
}

async function execCloseDossier(dossierId) {
    if (!await oasisConfirmer(te('confirmer_cloture_dossier'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('dossier_cloture_ok'), 'success');
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Close dossier error:', e);
        _execToast(te('err_cloture'), 'error');
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
    const defaultDateOuverture = fnc.date_ouverture || actDateFin || oasisJour();
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
                <label>${te('secteur')}</label>
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
    catch (e) { console.error(e); _execToast(te('err_chargement'), 'error'); return; }
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
            ${roField(te('emis_par'), fnc.emis_par)}
            ${roField(te('adresse_a'), fnc.adresse_a)}
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
        </div>
        <!-- Row 2 : Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            ${roField(te('source'), sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine'), dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        <!-- Réf. Réglementaires -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires')}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_escAttr(exig?.libelle||'')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('description_constatation')}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Row 3 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite'), fnc.criticite || fnc.gravite)}
            ${roField(te('cas'), fnc.cas_type || fnc.cas)}
            ${roField(te('delai_solde'), fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due'), fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : (fnc.date_due ? fnc.date_due.slice(0,10) : ''))}
        </div>
        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation')}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Preuves -->
        ${(fnc.preuves_constatation && fnc.preuves_constatation.length) ? `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('preuves')}</label>
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

    const footer = `<button class="btn btn-outline" onclick="execOpenDossierSlider('${dossierId}','constatations')">${EXEC_ICONS.back||''} ${te('back')}</button>`;
    _execFadeSliderContent(`${EXEC_ICONS.constatations||''} ${te('constatation')} — ${_esc(fnc.reference||'')}`, body, footer, 'max');
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
        oasisToast(te('date_ouverture_anterieure', minDate), 'warning');
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
            _execToast(te('constat_modifie_ok'), 'success');
        } else {
            await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(data) });
            _execToast(te('constat_cree_ok'), 'success');
        }
        await execRefreshDynamic();
        EXEC_STATE.dossierTab = 'constatations';
        execFermerFncTiroir();
        execOpenDossierSlider(dossierId, 'constatations');
    } catch (e) {
        console.error('Save FNC error:', e);
        _execToast(te('err_sauvegarde_constat'), 'error');
    }
}

// ══════════════════════════════════════
//  DELETE FUNCTIONS (Admin only)
// ══════════════════════════════════════

async function execDeleteConstatation(fncId) {
    if (!await oasisConfirmer(te('confirm_delete_constatation'))) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        // Si la rédaction d'un dossier est ouverte, on y reste et on ramène la
        // section « Constatations » sous les yeux ; sinon on redessine la page.
        // Le marqueur est le conteneur des sections de rédaction : ni
        // « execDossierSlider » ni « .exec-dossier-slider », cherchés ici
        // auparavant, n'existent nulle part — la branche ne se prenait jamais et
        // la suppression renvoyait toujours à la page entière.
        const openDossier = document.getElementById('dossier_redaction_sections');
        const dId = EXEC_STATE.selectedDossier?.id;
        if (openDossier && dId && typeof execSwitchRedactionSubtab === 'function') {
            execSwitchRedactionSubtab(dId, 'constatations');
        } else {
            execRenderPage();
        }
    } catch (e) {
        console.error('Delete constatation error:', e);
        oasisToast(te('err_suppression'), 'error');
    }
}


async function execDeleteDossier(dossierId) {
    if (!await oasisConfirmer(te('confirm_delete_activite'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Delete dossier error:', e);
        oasisToast(te('err_suppression'), 'error');
    }
}

async function execSendRapport(rapportId) {
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Send rapport error:', e);
        oasisToast(te('err_envoi'), 'error');
    }
}
