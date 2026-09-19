/* OASIS — Module « Exécution de la Surveillance »
 * Écran 2 — Plans de surveillance reçus de la Planification.
 *
 * Accordéon des plans et de leurs activités, et son export PDF.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  2. PLANS DE SURVEILLANCE (from M2)
// ══════════════════════════════════════

function execRenderPlans() {
    // Source of truth for validated plans + their activities is the
    // Planification module (Module 2). We fetched it in execLoadData via
    // /api/planification/plans and /api/planification/all-activites, then
    // stored the merged structure under plansValidesPlanif.
    const plans = EXEC_STATE.data.plansValidesPlanif || [];
    const F = EXEC_STATE.filters;

    return `
    <div class="page-content">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h2>${te('plan_surveillance')}</h2>
            <div style="display:flex;gap:0.5rem;">
                ${_execCanContribute() ? `<button class="btn btn-accent btn-sm" onclick="execProcNouvelleActivite()" title="${te('declencher_hors_plan')}">
                    ${EXEC_ICONS.plus || EXEC_ICONS.send || ''} Nouvelles Activités
                </button>` : ''}
                <button class="btn btn-primary btn-sm" onclick="execExportPlansPdf()" title="Exporter PDF">
                    ${EXEC_ICONS.pdf || EXEC_ICONS.download || EXEC_ICONS.folder} Exporter PDF
                </button>
            </div>
        </div>

        ${_execRenderFilterBar('execRenderPage()', {
            showDomaine: true, showSecteur: false, showPrestataire: true, showAnnee: false,
            showTypeSupervision: true, showModeSupervision: true,
            showAvancement: true
        })}

        <div id="execPlansExportRoot">
            ${_renderPlansWithActivitesAccordion(plans, F)}
            ${typeof execProcGroupeHorsPlan === 'function' ? execProcGroupeHorsPlan(F) : ''}
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  PDF EXPORT — "Activités de Supervision"
// ══════════════════════════════════════
// Export the currently-rendered plans/activities accordion as a PDF using
// the browser's print-to-PDF facility. Opens a temporary popup window with
// a print-friendly layout and triggers print(); the user chooses "Save as
// PDF" in the native dialog. No external library required.
function execExportPlansPdf() {
    try {
        const root = document.getElementById('execPlansExportRoot');
        if (!root) { _execToast(te('rien_a_exporter'), 'warning'); return; }

        // Build a standalone HTML document containing a print-friendly copy.
        // We expand all accordions and hide action buttons.
        const clone = root.cloneNode(true);
        // Force every card to expanded so content prints
        clone.querySelectorAll('.card').forEach(c => c.classList.add('expanded'));
        // Remove action buttons column contents (last td of each row) + Actions header
        clone.querySelectorAll('table.exec-data-table').forEach(tbl => {
            const thead = tbl.querySelector('thead tr');
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 0) ths[ths.length - 1].remove();
            }
            tbl.querySelectorAll('tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length > 0) tds[tds.length - 1].remove();
            });
        });

        const now = new Date();
        const ts = now.toLocaleString('fr-FR');
        const title = (te('plan_surveillance')) + ' — ' + ts;

        const style = `
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color:#0f172a; font-size:11px; margin:0; padding:0; }
            h1 { font-size: 14px; margin: 0 0 8px 0; }
            .meta { font-size: 10px; color:#475569; margin-bottom: 10px; }
            .card { border:1px solid #cbd5e1; border-radius:6px; margin-bottom:10px; padding:0; page-break-inside:avoid; }
            .exec-accordion-header { background:#e0f2fe !important; padding:5px 8px; font-weight:600; border-radius:5px 5px 0 0; font-size:11px; }
            .exec-accordion-header span { font-size:10px; }
            .exec-accordion-body { padding:6px 8px 8px 8px; }
            table { width:100%; border-collapse:collapse; font-size:10px; }
            th, td { border:1px solid #cbd5e1; padding:3px 5px; text-align:left; vertical-align:top; }
            th { background:#f1f5f9; }
            .exec-form-section-chevron, .btn-icon, button { display:none !important; }
            svg { display:none !important; }
        `;

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${_esc(title)}</title><style>${style}</style></head>
        <body>
            <h1>${_esc(title)}</h1>
            <div class="meta">${_esc(te('generated_on'))} ${_esc(ts)}</div>
            ${clone.innerHTML}
        </body></html>`;

        const w = window.open('', '_blank', 'width=1100,height=800');
        if (!w) { _execToast(te('popup_bloque'), 'error'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
        // Wait for DOM to settle, then trigger print
        w.onload = () => {
            setTimeout(() => { try { w.focus(); w.print(); } catch (e) { console.error(e); } }, 200);
        };
        // Fallback if onload already fired
        setTimeout(() => {
            try { if (w.document.readyState === 'complete') { w.focus(); w.print(); } } catch (e) { /* noop */ }
        }, 600);
    } catch (e) {
        console.error('execExportPlansPdf error:', e);
        _execToast(te('err_export_pdf'), 'error');
    }
}

// Single unified view: one accordion per validated plan; body shows its
// ── Années couvertes par les plans ──
// Le choix de l'année tient dans une rangée de boutons posée devant les plans,
// plutôt que dans la barre de filtres : elle ne propose que les années qu'un
// plan couvre effectivement, et se lit d'un coup d'œil.
function _execBoutonsAnnees(plans, F) {
    // Les années couvertes, plans et hors plan confondus : une activité hors
    // plan porte elle-même son année, et sans elle son bouton manquait — la
    // section restait inaccessible dès que son année n'était celle d'aucun plan.
    const horsPlan = (EXEC_STATE.data.notifications || [])
        .filter(n => n.hors_plan && Number(n.archive) !== 1).map(n => n.annee);
    const annees = [...new Set([...(plans || []).map(p => p.annee), ...horsPlan]
        .filter(Boolean).map(String))]
        .sort((a, b) => Number(b) - Number(a));
    if (!annees.length) return '';
    const retenue = String((F && F.annee) || '');
    return `
    <div class="oasis-annees">
        <button type="button" class="oasis-annee${retenue ? '' : ' actif'}"
                onclick="EXEC_STATE.filters.annee='';execRenderPage();">${te('all_years')}</button>
        ${annees.map(a => `<button type="button" class="oasis-annee${retenue === a ? ' actif' : ''}"
                onclick="EXEC_STATE.filters.annee='${a}';execRenderPage();">${a}</button>`).join('')}
    </div>`;
}

// Activités d'un plan que les filtres retiennent. La recherche porte sur les
// activités autant que sur les plans : un plan dont le titre répond garde
// toutes ses lignes, sinon seules celles qui répondent restent — elle ne
// retenait jusqu'ici que le plan, et l'écran montrait toutes ses activités
// quel que soit le mot saisi.
function _execActivitesRetenues(plan, F, notifDe, secteurToDomaine) {
    let acts = (plan.activites || []).map(a => ({
        ...a,
        _domaine_id: a.domaine_id || secteurToDomaine[a.secteur_id] || '',
    }));
    if (!F) return acts;
    if (F.domaine) acts = acts.filter(a => a._domaine_id === F.domaine);
    if (F.prestataire) acts = acts.filter(a => a.prestataire_id === F.prestataire);
    if (F.type_supervision) acts = acts.filter(a => a.type_supervision_id === F.type_supervision);
    if (F.mode_supervision) acts = acts.filter(a => a.mode_supervision_id === F.mode_supervision);
    if (F.search) {
        const s = F.search.toLowerCase();
        const planRepond = (plan.titre || '').toLowerCase().includes(s)
            || String(plan.annee || '').includes(s);
        if (!planRepond) {
            acts = acts.filter(a => `${a.objet || ''} ${a.description || ''} ${a.prestataire_nom || ''}`
                .toLowerCase().includes(s));
        }
    }
    if (F.avancement) {
        acts = acts.filter(a => {
            const n = notifDe(a);
            const dos = n ? (EXEC_STATE.data.dossiers || []).find(d => d.notification_id === n.id) : null;
            return execAvancement(n, dos) === F.avancement;
        });
    }
    return acts;
}

// activities with realization status + Processus/Historique icon actions.
function _renderPlansWithActivitesAccordion(plans, F) {
    const notifs = EXEC_STATE.data.notifications || [];
    // Index par lignée : une activité déclenchée sous une version précédente du
    // plan garde son processus dans la version qui la reprend.
    const notifByActId = {};
    notifs.forEach(n => {
        if (!n.activite_id) return;
        notifByActId[n.activite_id] = n;
        const racine = execRacineActivite(n.activite_id);
        if (racine && !notifByActId[racine]) notifByActId[racine] = n;
    });
    const notifDe = (a) => notifByActId[a.id] || notifByActId[execRacineActivite(a)] || null;

    const boutonsAnnees = _execBoutonsAnnees(plans, F);

    // Apply top-level filters on plans (year + title search)
    let filteredPlans = plans;
    if (F && F.annee) filteredPlans = filteredPlans.filter(p => String(p.annee) === String(F.annee));
    if (F && F.search) {
        const s = F.search.toLowerCase();
        filteredPlans = filteredPlans.filter(p =>
            (p.titre || '').toLowerCase().includes(s) ||
            String(p.annee || '').includes(s) ||
            (p.activites || []).some(a =>
                (a.objet || a.description || '').toLowerCase().includes(s) ||
                (a.prestataire_nom || '').toLowerCase().includes(s)));
    }
    // Apply activity-level filters (domaine / prestataire) by keeping only
    // activities that match, and then plans with at least one matching activity.
    const secteurs = EXEC_STATE.data.secteurs || [];
    const secteurToDomaine = {};
    secteurs.forEach(s => { secteurToDomaine[s.id] = s.domaine_id; });

    const planActsFiltered = filteredPlans.map(p => ({
        plan: p,
        acts: _execActivitesRetenues(p, F, notifDe, secteurToDomaine),
    }));
    // Keep all validated plans — if activity-level filters are set we still
    // show the plan accordion with zero activities so the user can see that
    // no activities match. Only hide plans when no activity-level filter is
    // set AND the plan genuinely has zero activities (edge case).
    const hasActFilter = !!(F && (F.domaine || F.prestataire || F.type_supervision || F.mode_supervision || F.avancement));
    const visiblePlans = hasActFilter
        ? planActsFiltered
        : planActsFiltered.filter(x => x.acts.length > 0 || true);

    if (visiblePlans.length === 0) {
        return `${boutonsAnnees}<div class="card"><p style="color:var(--text-muted);text-align:center;padding:2rem;">${te('no_data')}</p></div>`;
    }

    // Build a map responsable_id -> "Prenom Nom" from the loaded inspecteurs.
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    const respMap = {};
    inspecteurs.forEach(i => {
        const full = ((i.prenom || '') + ' ' + (i.nom || '')).trim();
        respMap[i.id] = full || i.nom || i.id;
    });
    // Fallback for legacy entries where responsable might be a user id
    const users = EXEC_STATE.data.users || [];
    users.forEach(u => {
        if (!respMap[u.id]) {
            const full = ((u.prenom || '') + ' ' + (u.nom || '')).trim();
            respMap[u.id] = full || u.nom || u.id;
        }
    });

    const canContribute = (typeof _execCanContribute === 'function') ? _execCanContribute() : true;

    // Lookups for Domaine / Secteur display in the plan header bar
    const allDomaines = EXEC_STATE.data.domaines || [];
    const allSecteurs = EXEC_STATE.data.secteurs || [];
    const domMap = {}; allDomaines.forEach(d => { domMap[d.id] = d; });
    const secMap = {}; allSecteurs.forEach(s => { secMap[s.id] = s; });

    // Dossiers indexed by notification_id for closure-rate computation
    const dossiers = EXEC_STATE.data.dossiers || [];
    const dossierByNotif = {};
    dossiers.forEach(d => { if (d.notification_id) dossierByNotif[d.notification_id] = d; });

    let html = boutonsAnnees;
    visiblePlans.forEach(({ plan, acts }) => {
        const nbPrest = [...new Set(acts.map(a => a.prestataire_id))].length;
        // Taux de réalisation : part des activités dont le rapport a été
        // transmis — le dernier des quatre niveaux d'avancement. La notification
        // actée y comptait jusqu'ici : c'est pourtant la confirmation des dates,
        // au début de la réalisation, non sa fin.
        const closedCount = acts.reduce((n, a) => {
            const notif = notifDe(a);
            const dos = notif ? dossierByNotif[notif.id] : null;
            return execAvancement(notif, dos) === 'realisee' ? n + 1 : n;
        }, 0);
        const tauxCloture = acts.length > 0 ? Math.round((closedCount / acts.length) * 100) : 0;
        const domNom = plan.domaine_id && domMap[plan.domaine_id] ? (domMap[plan.domaine_id].code || domMap[plan.domaine_id].sigle || domMap[plan.domaine_id].nom) : '-';
        const secNom = plan.secteur_id && secMap[plan.secteur_id] ? (secMap[plan.secteur_id].code || secMap[plan.secteur_id].sigle || secMap[plan.secteur_id].nom) : '-';
        // Plans étendus par défaut.
        const expanded = ' expanded';
        // Largeurs de la table tenues pour qu'elle loge sans défilement, barre
        // latérale dépliée, dès 1280 px d'écran : l'Objet prend ce qui reste et
        // passe à la ligne ; les dates (87 px, en-tête 95 px) restent sur une ligne.
        html += `
        <div class="card${expanded}" style="margin-bottom:0.75rem;">
            <div class="exec-accordion-header exec-plan-entete" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="exec-plan-entete-titre">
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                    ${EXEC_ICONS.plans} <span>${_esc(plan.titre || plan.reference || plan.id)}</span>
                    <span class="exec-plan-entete-actions" onclick="event.stopPropagation();">
                        ${_execCanValidate() ? `<button class="btn btn-sm btn-outline"
                            onclick="execArchiverPlan('${plan.id}')"
                            title="${_escAttr(te('archiver_plan'))}">${EXEC_ICONS.folder || ''} ${te('archiver')}</button>` : ''}
                    </span>
                </div>
                <div class="exec-plan-entete-infos">
                    <span>${te('version')}: <strong>${_esc(_execVersionPlan(plan))}</strong></span>
                    <span>${te('annee')}: <strong>${plan.annee || '-'}</strong></span>
                    <span>${te('domaine')}: <strong>${_esc(domNom)}</strong></span>
                    <span>${te('secteur')}: <strong>${_esc(secNom)}</strong></span>
                    <span>${te('nb_prestataires')}: <strong>${nbPrest}</strong></span>
                    <span>${te('nb_activites') || te('activites')}: <strong>${acts.length}</strong></span>
                    <span>${te('taux_realisation')}: <strong class="exec-plan-taux">${tauxCloture}%</strong></span>
                </div>
            </div>
            <div class="exec-accordion-body" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
                <table class="exec-data-table exec-compact-table" style="font-size:0.8rem;table-layout:fixed;min-width:920px;">
                    <thead><tr>
                        <th style="width:140px;">${te('provider')}</th>
                        <th>${te('objet')}</th>
                        <th style="width:100px;">${te('date_debut')}</th>
                        <th style="width:100px;">${te('date_fin')}</th>
                        <th style="width:130px;">${te('responsable')}</th>
                        <th style="width:110px;">${te('avancement')}</th>
                        <th style="width:115px;">${te('etape')}</th>
                        <th style="width:80px;text-align:center;">${te('actions')}</th>
                    </tr></thead>
                    <tbody>
                    ${acts.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data')}</td></tr>` :
                    acts.map(a => {
                        const notif = notifDe(a);
                        const statut = notif ? notif.statut : 'planifie';
                        const dos = notif ? dossierByNotif[notif.id] : null;
                        const isCloture = (dos && dos.statut === 'cloture') || statut === 'acte';
                        // Days until date_debut (negative = already past)
                        let daysUntil = null;
                        if (a.date_debut) {
                            const d = new Date(String(a.date_debut).substring(0, 10));
                            if (!isNaN(d.getTime())) {
                                const t0 = new Date(); t0.setHours(0,0,0,0);
                                daysUntil = Math.ceil((d - t0) / (24*60*60*1000));
                            }
                        }
                        // Row color rules (priorité descendante)
                        //  1. Clôturée (dossier cloture OU notif acte) → vert
                        //  2. Déclenchée (notif existe) mais pas clôturée → bleu
                        //  3. Non déclenchée + date_debut passée → rouge gras
                        //  4. Non déclenchée + <=15 jours → rouge
                        //  5. Non déclenchée + <=30 jours → orange
                        // NB: !important requis car .exec-data-table td { color: var(--text); }
                        // a une spécificité supérieure à `color` hérité depuis <tr>.
                        let rowColor = '', rowWeight = '';
                        if (isCloture) {
                            rowColor = '#166534';                                   // vert foncé
                        } else if (notif) {
                            rowColor = '#1d4ed8';                                   // bleu
                        } else if (daysUntil !== null && daysUntil < 0) {
                            rowColor = '#b91c1c'; rowWeight = '700';                // rouge gras
                        } else if (daysUntil !== null && daysUntil <= 15) {
                            rowColor = '#dc2626';                                   // rouge
                        } else if (daysUntil !== null && daysUntil <= 30) {
                            rowColor = '#ea580c';                                   // orange
                        }
                        const tdColorStyle = rowColor ? `color:${rowColor} !important;${rowWeight ? `font-weight:${rowWeight} !important;` : ''}` : '';
                        // Responsable: prefer responsable_id (FK to inspecteurs/users),
                        // fallback to first entry of legacy inspecteurs array.
                        let resp = '-';
                        if (a.responsable_id && respMap[a.responsable_id]) {
                            resp = _esc(respMap[a.responsable_id]);
                        } else {
                            let rawInsp = a.inspecteurs || [];
                            if (typeof rawInsp === 'string') { try { rawInsp = JSON.parse(rawInsp); } catch(e) { rawInsp = []; } }
                            if (Array.isArray(rawInsp) && rawInsp.length > 0) {
                                const first = rawInsp[0];
                                if (typeof first === 'string') {
                                    resp = _esc(respMap[first] || first);
                                } else if (first && typeof first === 'object') {
                                    resp = _esc(first.nom || respMap[first.id] || '-');
                                }
                            }
                        }
                        // Le déclenchement se fait depuis le processus de
                        // l'activité, ouvert au clic sur la ligne : la colonne
                        // Actions ne le double plus.
                        return `<tr class="exec-act-row" style="cursor:pointer;" onclick="if(!event.target.closest('button'))execOpenActiviteProcessus('${plan.id}','${a.id}')" title="${te('ouvrir_processus')}">
                            <td style="${tdColorStyle}">${_esc(a.prestataire_nom || '-')}</td>
                            <td style="${tdColorStyle}">${_esc(a.objet || a.description || '-')}</td>
                            <td style="${tdColorStyle}white-space:nowrap;">${_formatDate(a.date_debut)}</td>
                            <td style="${tdColorStyle}white-space:nowrap;">${_formatDate(a.date_fin)}</td>
                            <td style="${tdColorStyle}">${resp}</td>
                            <td>${typeof execAvancementBadge === 'function'
                                // Niveau d'avancement global : non initiée, initiée,
                                // en réalisation, réalisée.
                                ? execAvancementBadge(notif, dos) : ''}</td>
                            <td>${typeof execProcStatutBadge === 'function'
                                // Statut exprimé dans les termes du fil d'avancement du processus.
                                ? execProcStatutBadge(notif, dos)
                                : (dos
                                    ? `<span class="status-badge" style="background:#3b82f615;color:#1d4ed8;border:1px solid #3b82f640;">${_esc(_dossierStepLabel(dos))}</span>`
                                    : _execStatusBadge(statut))}</td>
                            <td style="white-space:nowrap;text-align:center;">
                                ${(notif && _execAdministreParc()) ? `<button class="btn-icon exec-act-reinit"
                                    onclick="execReinitialiserActivite('${a.id}')"
                                    title="${_escAttr(te('reinitialiser_activite'))}"
                                    aria-label="${_escAttr(te('reinitialiser_activite'))}">${EXEC_ICONS.reset || EXEC_ICONS.back || '↺'}</button>` : ''}
                                <button class="btn-icon" onclick="execShowActiviteHistorique('${a.id}','${plan.id}')" title="${te('historique')}">${EXEC_ICONS.clock}</button>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });
    return html;
}




// Version du plan, telle que la Planification l'a numérotée à la validation.
function _execVersionPlan(plan) {
    const v = plan && (plan.version !== undefined && plan.version !== null && plan.version !== ''
        ? plan.version : plan.version_plan);
    return (v === undefined || v === null || v === '') ? '—' : `V${v}`;
}

// Réinitialisation d'une activité déclenchée : elle redevient déclenchable.
// Réservé au gestionnaire du module ; le serveur refuse si des constatations
// ou un rapport en dépendent.
window.execReinitialiserActivite = async function (activiteId) {
    const ok = await execProcConfirmer({
        titre: te('reinitialiser_activite'),
        message: te('reinitialiser_activite_message'),
        libelle: te('reinitialiser'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/activites-en-cours/${activiteId}/reinitialiser`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('reinitialiser_ok'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

async function execStartNotification(planId, activiteId) {
    const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const plan = plans.find(p => p.id === planId);
    const act = plan ? (plan.activites || []).find(a => a.id === activiteId) : null;
    if (!act) return;

    // Build perimetre from sous-activités + thèmes couverts
    const sousActs = EXEC_STATE.data.sousActivites || [];
    const allThemes = EXEC_STATE.data.themesSupervision || [];
    let sousActIds = [];
    try { sousActIds = JSON.parse(act.sous_activite_ids || '[]'); } catch(e) {}
    if (!sousActIds.length && act.sous_activite_id) sousActIds = [act.sous_activite_id];
    let selectedThemeIds = [];
    try { selectedThemeIds = JSON.parse(act.themes_couverts || '[]'); } catch(e) {}

    // Format: each sous-activité on its own line, with associated themes in parentheses
    const perimetreLines = sousActIds.map(saId => {
        const sa = sousActs.find(x => x.id === saId);
        const saName = sa ? sa.nom : saId;
        // Find themes linked to this sous-activité AND selected in the activity
        const saThemes = allThemes.filter(t => t.sous_activite_id === saId && (selectedThemeIds.length === 0 || selectedThemeIds.includes(t.id)));
        const themeLabels = saThemes.map(t => t.libelle || t.nom || t.id);
        return themeLabels.length > 0 ? `- ${saName} (${themeLabels.join(' ; ')})` : `- ${saName}`;
    });
    const perimetreVal = act.perimetre || perimetreLines.join('\n') || '';

    // ─── Inopiné : bypass notification workflow ───────────────────────────
    // Pour une activité de type « Inopiné », il n'y a pas de notification au
    // postulant. Le clic sur « Déclencher » saute les étapes du menu
    // Déclenchement et crée directement un dossier dans le menu Exécution.
    const typesSup = EXEC_STATE.data.typesSupervision || [];
    const tsEntry = typesSup.find(t => t.id === act.type_supervision_id);
    const tsLabel = (act.type_supervision || (tsEntry && tsEntry.type_supervision) || '').toString().toLowerCase();
    const isInopine = tsLabel.indexOf('inopin') !== -1 || act.type_supervision_id === 'TCAT_INO';
    if (isInopine) {
        try {
            // 1. Crée la notification (le backend force statut='brouillon' à la création).
            const notifPayload = {
                activite_id: activiteId,
                plan_id: planId,
                prestataire_id: act.prestataire_id || '',
                secteur_id: act.secteur_id || '',
                objet: act.objet || act.description || '',
                objet_activite: act.objet || act.description || '',
                perimetre: perimetreVal,
                type_supervision: act.type_supervision || (tsEntry && tsEntry.type_supervision) || 'Inopiné',
                date_debut_prevue: act.date_debut || '',
                date_fin_prevue: act.date_fin || '',
                lieu: act.lieu_activite || '',
                programme: [],
                equipe: [],
                pieces_jointes: []
            };
            const notif = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(notifPayload) });
            if (!notif || !notif.id) throw new Error('Notification id manquant');
            // 2. Force la notification au statut 'acte' (pré-requis pour créer
            //    un dossier). Pour une activité inopinée on saute les étapes
            //    soumission/validation/envoi qui n'ont pas lieu d'être.
            const nowIso = new Date().toISOString();
            // On renseigne aussi date_debut_effective / date_fin_effective : le
            // backend create_dossier lit ces champs en priorité pour remplir la
            // date de début d'exécution du dossier. Sans ça, le dossier se
            // crée avec une date_debut vide même si l'activité en a une.
            await api(`${EXEC_MODULE_API}/notifications/${notif.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    statut: 'acte',
                    date_envoi: nowIso,
                    date_validation: nowIso,
                    date_accord: nowIso,
                    date_debut_effective: act.date_debut || '',
                    date_fin_effective: act.date_fin || ''
                })
            });
            // 3. Crée immédiatement le dossier d'exécution lié.
            const dossier = await api(`${EXEC_MODULE_API}/dossiers`, {
                method: 'POST',
                body: JSON.stringify({ notification_id: notif.id })
            });
            await execRefreshDynamic();
            _execToast(te('dossier_inopine_cree'), 'success');
            execRenderPage();
            if (dossier && dossier.id) execOpenDossierSlider(dossier.id, 'realisation');
        } catch (e) {
            console.error('execStartNotification inopine error:', e);
            _execToast(te('err_declenchement_inopine', (e && e.message) || ''), 'error');
        }
        return;
    }

    execCloseSlider();
    execOpenNotificationForm({
        activite_id: activiteId,
        plan_id: planId,
        prestataire_id: act.prestataire_id || '',
        prestataire_nom: act.prestataire_nom || '',
        secteur_id: act.secteur_id || '',
        objet: act.objet || act.description || '',
        perimetre: perimetreVal,
        type_supervision: act.type_supervision || '',
        date_debut_prevue: act.date_debut || '',
        date_fin_prevue: act.date_fin || '',
        lieu: act.lieu_activite || '',
        programme: [],
        equipe: [],
        pieces_jointes: []
    });
}

// Historique : chronological list of every action on the activity, from
// triggering to closure. Built from the data already present in EXEC_STATE
// (plan validation, notification lifecycle, dossier lifecycle, rapports, etc.).
function execShowActiviteHistorique(activiteId, planId) {
    const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const plan = plans.find(p => p.id === planId);
    const act = plan ? (plan.activites || []).find(a => a.id === activiteId) : null;
    if (!act) return;

    const notifs = EXEC_STATE.data.notifications || [];
    const notif = notifs.find(n => n.activite_id === activiteId) || null;
    const dossiers = EXEC_STATE.data.dossiers || [];
    const dossier = notif ? dossiers.find(d => d.notification_id === notif.id) : null;
    const rapports = EXEC_STATE.data.rapports || [];
    const actRapports = rapports.filter(r =>
        (r.dossier_id && dossier && r.dossier_id === dossier.id) ||
        (r.activite_id && r.activite_id === activiteId));

    // Résolution acteur : id utilisateur -> "Prénom Nom"
    const _userMap = {};
    (EXEC_STATE.data.inspecteurs || []).forEach(u => {
        _userMap[u.id] = `${u.prenom || ''} ${u.nom || ''}`.trim();
    });
    (EXEC_STATE.data.users || []).forEach(u => {
        _userMap[u.id] = `${u.prenom || ''} ${u.nom || ''}`.trim();
    });
    const _cu = EXEC_STATE.user || {};
    if (_cu.id) _userMap[_cu.id] = `${_cu.prenom || ''} ${_cu.nom || ''}`.trim() || _cu.nom || _cu.id;
    const _actor = a => a ? (_userMap[a] || a) : '';

    // Each event: { date, label, actor }
    const events = [];
    const pushEvt = (date, label, actor) => { if (label) events.push({ date: date || '', label, actor: _actor(actor) }); };

    // Planification → validated plan
    pushEvt(plan?.date_validation || plan?.date_mise_a_jour, `${te('plan')} validé : ${_esc(plan?.titre || '')}`, plan?.valide_par || '');

    if (notif) {
        pushEvt(notif.date_creation || notif.created_at, 'Notification créée', notif.created_by || notif.auteur_nom);
        if (notif.date_soumission) pushEvt(notif.date_soumission, 'Notification soumise', notif.soumis_par || '');
        if (notif.date_validation) pushEvt(notif.date_validation, 'Notification validée', notif.valideur_id || notif.valide_par || '');
        if (notif.date_rejet) pushEvt(notif.date_rejet, 'Notification rejetée', notif.rejete_par || '');
        if (notif.date_envoi) pushEvt(notif.date_envoi, 'Notification envoyée', notif.envoye_par || '');
        if (notif.date_acte) pushEvt(notif.date_acte, 'Notification actée (accusé de réception)', notif.acte_par || '');
    }

    if (dossier) {
        pushEvt(dossier.date_ouverture || dossier.date_creation, 'Dossier ouvert', dossier.created_by || '');
        if (dossier.realisation_date_debut || dossier.date_debut_execution)
            pushEvt(dossier.realisation_date_debut || dossier.date_debut_execution, 'Réalisation — début terrain', dossier.created_by || '');
        if (dossier.date_fin_execution)
            pushEvt(dossier.date_fin_execution, 'Réalisation — clôture terrain', dossier.created_by || '');
        if (dossier.date_soumission)
            pushEvt(dossier.date_soumission, 'Rapport soumis pour validation', dossier.created_by || '');
        if (dossier.statut === 'cloture') {
            pushEvt(dossier.date_maj, 'Dossier clôturé', dossier.created_by || '');
        } else {
            const _sl = DOSSIER_WORKFLOW_STEPS.find(x => x.id === (dossier.current_step || ''));
            if (_sl) pushEvt(dossier.date_maj, `Étape en cours : ${_sl.label}`, dossier.created_by || '');
        }
    }

    (actRapports || []).forEach(r => {
        if (r.date_creation) pushEvt(r.date_creation, `Rapport ${_esc(r.reference || r.titre || '')} créé`, r.auteur_nom || r.created_by || '');
        if (r.date_validation) pushEvt(r.date_validation, `Rapport ${_esc(r.reference || '')} validé`, r.valide_par || '');
    });

    // Sort chronologically (empty dates sink to the top as 'planned')
    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Couleur dégradée vert → bleu selon la position de l'étape.
    const _histColor = (i, n) => {
        const g = [34, 197, 94], b = [37, 99, 235];
        const t = n <= 1 ? 0 : i / (n - 1);
        const c = g.map((v, k) => Math.round(v + (b[k] - v) * t));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    };
    const _n = events.length;
    const bodyHtml = `
    <div style="padding:1.5rem 1.25rem;background:#f4f5f7;min-height:100%;">
        <div style="text-align:center;margin-bottom:1.75rem;">
            <div style="font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;color:#94a3b8;">${_esc(act.objet || act.description || '')}</div>
            <div style="font-size:0.74rem;color:#94a3b8;margin-top:0.35rem;">${_esc(act.prestataire_nom || '')} · ${_formatDate(act.date_debut)} – ${_formatDate(act.date_fin)}</div>
        </div>
        ${_n === 0 ? `<p style="color:#94a3b8;text-align:center;padding:1.5rem 0;">${te('no_data')}</p>` : `
        <div style="display:flex;flex-direction:column;">
            ${events.map((e, i) => {
                const col = _histColor(i, _n);
                const last = i === _n - 1;
                return `<div style="display:flex;gap:0.9rem;align-items:stretch;">
                <div style="position:relative;width:48px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;">
                    ${!last ? `<div style="position:absolute;top:23px;bottom:-6px;width:7px;background:${col};border-radius:4px;"></div>` : ''}
                    <div style="position:relative;width:46px;height:46px;border-radius:50%;background:#fff;border:3px solid ${col};display:flex;align-items:center;justify-content:center;font-weight:800;color:${col};font-size:0.92rem;box-shadow:0 2px 7px rgba(0,0,0,0.13);">${String(i + 1).padStart(2, '0')}</div>
                </div>
                <div style="flex:1;min-width:0;padding-top:0.35rem;padding-bottom:${last ? '0' : '1.5rem'};">
                    <div style="font-size:0.92rem;font-weight:700;color:${col};">${e.label}</div>
                    <div style="font-size:0.78rem;color:#94a3b8;margin-top:0.15rem;">${_formatDatetime ? _formatDatetime(e.date) : _formatDate(e.date)}${e.actor ? ' · ' + _esc(e.actor) : ''}</div>
                </div>
            </div>`;
            }).join('')}
        </div>`}
    </div>`;

    execShowSlider(`${EXEC_ICONS.clock} ${te('historique')}`, bodyHtml, '', 'third');
}

