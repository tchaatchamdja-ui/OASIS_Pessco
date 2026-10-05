/* Module « Profils de Risques » — evaluations
   Évaluations : notation, consolidation, réunions, validation, rapports.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/app/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  EVALUATIONS (with filters, accordion details, latest+drafts only)
// ══════════════════════════════════════
window._evalFilters = { domaine: '', secteur: '', statut: '', search: '' };

// Helper: get only latest validated + all drafts per prestataire
function getLatestEvals(evals) {
    const latestValidated = {};
    const drafts = [];
    // In-progress statuses (workflow Phase 4 — Chap. 4 §4.2.2.f) treated like drafts.
    const IN_PROGRESS = new Set(['brouillon', 'soumis_directeur', 'renvoyee', 'acceptee', 'cloturee', 'rejetee']);
    evals.forEach(ev => {
        if (IN_PROGRESS.has(ev.statut)) { drafts.push(ev); return; }
        if (ev.statut === 'valide') {
            const key = ev.prestataire_id;
            if (!latestValidated[key] || new Date(ev.date_validation || ev.date) > new Date(latestValidated[key].date_validation || latestValidated[key].date)) {
                latestValidated[key] = ev;
            }
        }
    });
    return [...Object.values(latestValidated), ...drafts];
}

// Helper: build synthesis accordion HTML for an evaluation
function buildSynthesisAccordion(ev, accPrefix) {
    const D = APP_STATE.data;
    const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const g = ev.resultats?.global || {};
    // Cycle CSRBO = CSn * csnMod (from global risk)
    const csn = parseInt(sect?.csn || 24);
    const csnMod = g.globalRisk?.csnMod || 1;
    const csrbo = g.csrbo || Math.round(csn * csnMod);

    // Global IDS (uppercase)
    const idsG = g.ids_g || g.safetyIndex?.val || '-';
    const riskLabel = g.globalRisk?.label || '-';
    const riskDesc = g.globalRisk?.risk || '-';
    const intensity = g.globalRisk?.intensity || getIntensityLabel(csnMod);

    let globalHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.5rem;padding:0.5rem 0;">
        <div class="detail-item"><label>IDC</label><span class="badge">${g.idc_g || '-'}</span></div>
        <div class="detail-item"><label>IDP</label><span class="badge">${g.idp_g || '-'}</span></div>
        <div class="detail-item"><label>IDS</label><span class="badge">${idsG}</span></div>
        <div class="detail-item"><label>IDE</label><span class="badge">${g.ide_g || '-'}</span></div>
        <div class="detail-item"><label>Index Risque</label><span class="badge ${getRiskBadgeClass(riskDesc)}">${riskLabel}</span></div>
        <div class="detail-item"><label>${t('intensity')}</label><span>${intensity}</span></div>
        <div class="detail-item"><label>Cycle (CSRBO)</label><span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span></div>
    </div>`;
    if (idsG === 'Incohérant') {
        globalHtml += `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:0.5rem;margin-top:0.3rem;font-size:0.82rem;color:#856404;">⚠ ${t('incoherent_msg')}</div>`;
    }

    let saHtml = '';
    sas.forEach(sa => {
        const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
        // New format: ids_s (lowercase), risk (e.g. "2b"), freq
        const idsS = saRes.ids_s || saRes.safetyIndex?.val || '-';
        const saRiskLabel = saRes.risk || saRes.globalRisk?.label || '-';
        const saRiskDesc = saRes.risk_desc || saRes.globalRisk?.risk || '-';
        const saFreq = saRes.freq || saRes.globalRisk?.freq || '-';

        saHtml += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
            <span style="min-width:200px;font-weight:600;">${escapeHtml(`${sa.code} - ${sa.nom}`)}</span>
            <span>idc: ${saRes.idc_s || '-'}</span>
            <span>idp: ${saRes.idp_s || '-'}</span>
            <span>ids: ${idsS}</span>
            <span>ide: ${saRes.ide_s || '-'}</span>
            <span class="badge ${getRiskBadgeClass(saRiskDesc)}" style="font-size:0.75rem;">${saRiskLabel}</span>
            <span style="margin-left:auto;font-weight:600;">${saFreq !== '-' ? saFreq + 'x / cycle' : '-'}</span>
        </div>`;
        if (idsS === 'Incohérant') {
            saHtml += `<div style="background:#fff3cd;border-radius:4px;padding:0.25rem 0.5rem;font-size:0.75rem;color:#856404;">⚠ ${t('incoherent_msg')}</div>`;
        }
    });

    const gId = `${accPrefix}_global`;
    const sId = `${accPrefix}_sa`;
    return `<div class="accordion-container" style="margin-top:0.5rem;">
        <div class="accordion-item acc-level-2">
            <div class="accordion-header" data-acc-id="${gId}" onclick="toggleAccordion('${gId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">${t('global_synthesis')}</span>
            </div>
            <div class="accordion-body" id="acc-body-${gId}">${globalHtml}</div>
        </div>
        <div class="accordion-item acc-level-2">
            <div class="accordion-header" data-acc-id="${sId}" onclick="toggleAccordion('${sId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">${t('synthesis_by_sa')}</span>
                <span class="acc-count">${sas.length}</span>
            </div>
            <div class="accordion-body" id="acc-body-${sId}">${saHtml || t('no_data')}</div>
        </div>
    </div>`;
}

// ── Fil d'avancement du circuit d'évaluation (chevrons) ──
// De la notation par les évaluateurs jusqu'à la validation finale.
const EVAL_STEPS = [
    { key: 'notation',  label: 'Notation' },
    { key: 'soumission', label: 'Soumission' },
    { key: 'acceptation', label: 'Acceptation' },
    { key: 'reunion',   label: 'Réunion prestataire' },
    { key: 'validation', label: 'Validation' },
];

// Tous les évaluateurs désignés ont-ils soumis leurs notes (Performance + Complexité) ?
function evalAllNotesSubmitted(ev) {
    const designes = ev.evaluateurs_designes || [];
    if (!designes.length) return false;
    const pub = ev.notes_per_evaluator || {};
    return designes.every((uid) =>
        Object.keys(pub.perf?.[uid] || {}).length > 0 &&
        Object.keys(pub.comp?.[uid] || {}).length > 0
    );
}

// Index de l'étape en cours. -1 : aucune étape entamée (pas d'évaluateur désigné)
// ou circuit interrompu. 5 : toutes les étapes franchies.
//   0 Notation            désignation des évaluateurs → toutes les notes soumises
//   1 Soumission          notes complètes → soumission au directeur
//   2 Acceptation         soumission → acceptation
//   3 Réunion prestataire acceptation → clôture de la réunion
//   4 Validation          clôture → validation de l'évaluation
function evalCurrentStep(ev) {
    if (ev.statut === 'rejetee') return -1;
    if (ev.statut === 'valide') return 5;
    if (ev.statut === 'cloturee') return 4;
    if (ev.statut === 'acceptee') return 3;
    if (ev.statut === 'soumis_directeur') return 2;
    // brouillon / renvoyée : la notation court tant que les notes ne sont pas
    // toutes soumises ; ensuite c'est au validateur de soumettre.
    if (!(ev.evaluateurs_designes || []).length) return -1;
    return evalAllNotesSubmitted(ev) ? 1 : 0;
}

const EVAL_STEP_HINT = {
    notation: "Depuis la désignation des évaluateurs jusqu'à la soumission de toutes leurs notes",
    soumission: "Notes complètes — en attente de la soumission au directeur par le validateur",
    acceptation: "Soumise au directeur — en attente de son acceptation",
    reunion: "Acceptée — en attente de la clôture de la réunion prestataire",
    validation: "Réunion clôturée — en attente de la validation de l'évaluation",
};

// Clés d'horodatage (server: ev.etapes) dans l'ordre de EVAL_STEPS.
const EVAL_ETAPE_KEYS = ['notation', 'soumission', 'acceptation', 'reunion', 'validation'];

// Libellé du statut = nom de l'étape en cours du fil d'avancement.
function evalStatutLabel(ev) {
    if (ev.statut === 'valide') return 'Validée';
    if (ev.statut === 'rejetee') return 'Rejetée';
    const i = evalCurrentStep(ev);
    if (i < 0 || i >= EVAL_STEPS.length) return 'En préparation';
    return EVAL_STEPS[i].label + (ev.statut === 'renvoyee' ? ' (renvoyée)' : '');
}

// Date de lancement de l'étape en cours. `ev.etapes` est horodaté par le
// serveur à chaque transition ; repli sur les anciens champs pour les
// évaluations créées avant cet horodatage.
function evalStepDate(ev) {
    const e = ev.etapes || {};
    if (ev.statut === 'valide') return e.validee || ev.date_validation || ev.decide_le || ev.date;
    if (ev.statut === 'rejetee') return e.rejetee || ev.decide_le || ev.date_revue_directeur || ev.date;
    const i = evalCurrentStep(ev);
    if (i < 0) return ev.createdAt || ev.date;
    const legacy = [ev.createdAt, ev.createdAt, ev.soumis_le, ev.decide_le, ev.decide_le];
    return e[EVAL_ETAPE_KEYS[i]] || legacy[i] || ev.date;
}

function renderEvalProcessSteps(ev) {
    const cur = evalCurrentStep(ev);
    const rejected = ev.statut === 'rejetee';
    const items = EVAL_STEPS.map((s, i) => {
        let state = 'todo';
        if (rejected) state = 'todo';
        else if (i < cur) state = 'done';
        else if (i === cur) state = 'current';
        const tip = state === 'current' ? `${s.label} — en cours. ${EVAL_STEP_HINT[s.key] || ''}`
            : state === 'done' ? `${s.label} — terminée`
            : `${s.label} — à venir`;
        return `<span class="eval-step ${state}" title="${tip}">${s.label}</span>`;
    }).join('');
    const flag = rejected
        ? '<span class="eval-step rejected" title="' + t('eval_rejected_stopped') + '">' + t('rejected_f') + '</span>'
        : (cur === -1 ? '<span class="eval-step todo" title="' + t('no_assessor_yet') + '">' + t('in_preparation') + '</span>' : '');
    return `<div class="eval-steps" role="img" aria-label="${t('eval_progress')}">${items}${flag}</div>`;
}

// Tout déplier / tout replier (doubles chevrons)
const ICON_EXPAND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/><polyline points="6 4 12 10 18 4"/></svg>';
const ICON_COLLAPSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/><polyline points="6 20 12 14 18 20"/></svg>';

// Icône d'envoi (avion en papier) alignée sur le jeu d'icônes du module
const ICON_SEND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;"><path d="M21.5 2.5 11 13"/><path d="M21.5 2.5 15 21.5l-4-8.5-8.5-4z"/></svg>';
// Soumission au validateur : document avec flèche montante
const ICON_SUBMIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><polyline points="9.5 14.5 12 12 14.5 14.5"/></svg>';

// Notes servant aux bandeaux et compteurs, selon qui regarde :
// – validateur / administrateur : les notes consolidées de l'évaluation ;
// – évaluateur désigné : ses notes publiées si elles existent, sinon son brouillon.
// Sans ce repli sur les notes publiées, les bandeaux repassaient à zéro juste
// après « Soumettre mes notes » (le brouillon venait d'être vidé).
function evalNotesSource(ev, slot) {
    const key = slot === 'perf' ? 'notes_perf' : 'notes_comp';
    const uid = APP_STATE.user?.id || '';
    // Vue validateur : privilège Validateur ou Gestionnaire sur le secteur
    const isValidator = prCanValidate(ev.secteur_id);
    if (isValidator || !(ev.evaluateurs_designes || []).includes(uid)) return ev[key] || {};
    const published = ev.notes_per_evaluator?.[slot]?.[uid] || {};
    if (Object.keys(published).length) return published;
    const draft = ev.notes_per_evaluator_draft?.[slot]?.[uid] || {};
    if (Object.keys(draft).length) return draft;
    return ev[key] || {};
}

// ── Droits d'accès aux évaluations (Gestion des Droits du module) ──
const PR_MANAGE = ['GESTIONNAIRE', 'VALIDATEUR'];   // voient tout leur périmètre et créent
const PR_CONTRIB = 'CONTRIBUTEUR';                  // uniquement les évaluations désignées

function prAccess() {
    return APP_STATE.access || { hasAccess: false, privilege: '', secteurs: {} };
}
// Privilège effectif sur un secteur donné
function prPrivOn(secteurId) {
    const a = prAccess();
    if (!a.hasAccess) return '';
    return a.secteurs[secteurId] || a.privilege || '';
}
// Secteurs sur lesquels l'utilisateur peut créer une évaluation
function prManagedSecteurs() {
    const a = prAccess();
    return Object.keys(a.secteurs || {}).filter((id) => PR_MANAGE.includes(a.secteurs[id]));
}
function prCanCreateEval() {
    return prManagedSecteurs().length > 0;
}
function prCanSeeEval(ev) {
    const priv = prPrivOn(ev.secteur_id);
    if (PR_MANAGE.includes(priv)) return true;
    if (priv === PR_CONTRIB) {
        const uid = APP_STATE.user?.id;
        return (ev.evaluateurs_designes || []).includes(uid);
    }
    return false;
}
// Une réévaluation n'est « en cours » que si le cycle suivant existe encore et
// n'est pas clos : un enfant supprimé ou terminé ne doit pas bloquer l'origine.
function prReevaluationEnCours(ev) {
    if (!ev) return null;
    const enfant = (APP_STATE.data.evaluations || []).find(
        (e) => e.parent_id === ev.id && !['valide', 'rejetee'].includes(e.statut)
    );
    return enfant || null;
}

// Secteur du prestataire évalué (le secteur porté par l'évaluation fait foi)
function prSecteurOf(ev) {
    if (!ev) return '';
    if (ev.secteur_id) return ev.secteur_id;
    const p = (APP_STATE.data.prestataires || []).find(x => x.id === ev.prestataire_id);
    return p ? p.secteur_id || '' : '';
}

// Réévaluation : Gestionnaire ou Validateur couvrant le domaine/secteur du
// prestataire, et pas de cycle suivant déjà ouvert.
function prCanReevaluer(ev) {
    if (!ev || prReevaluationEnCours(ev)) return false;
    return PR_MANAGE.includes(prPrivOn(prSecteurOf(ev)));
}

// Suppression d'une évaluation : Gestionnaire du domaine/secteur uniquement
// Une évaluation dont la réévaluation existe ne se supprime pas : le serveur
// le refuse, la réévaluation perdrait son origine. On supprime d'abord celle-ci.
function prCanSupprimerEval(ev) {
    if (!ev || prPrivOn(prSecteurOf(ev)) !== 'GESTIONNAIRE') return false;
    const evals = (APP_STATE.data || {}).evaluations || [];
    return !(ev.enfant_id && evals.some((e) => e.id === ev.enfant_id));
}
// Le sous-menu reste accessible aux contributeurs (pour leurs désignations)
function prCanSeeEvalsEnCours() {
    const a = prAccess();
    if (!a.hasAccess) return false;
    const privs = [a.privilege, ...Object.values(a.secteurs || {})];
    return privs.some((p) => PR_MANAGE.includes(p) || p === PR_CONTRIB);
}

function renderEvaluations() {
    const D = APP_STATE.data;
    const sub = APP_STATE.currentSub;

    if (sub === 'evaluations_validees' || sub === 'resultats') return renderEvalResults();

    // Droits du module : Gestionnaire/Validateur voient et créent sur leurs
    // domaines-secteurs ; Contributeur ne voit que ses désignations ;
    // Lecteur n'a pas accès au sous-menu.
    const canCreate = prCanCreateEval();
    if (!prCanSeeEvalsEnCours()) {
        return `
        <div class="card" style="padding:2rem;text-align:center;color:var(--text-muted);">
            Accès réservé aux privilèges Gestionnaire et Validateur, ainsi qu'aux contributeurs désignés sur une évaluation.
        </div>`;
    }
    const f = window._evalFilters;

    // Show all non-validated evaluations: drafts, submitted to director, returned
    const IN_PROGRESS_STATUTS = ['brouillon', 'soumis_directeur', 'renvoyee', 'acceptee', 'cloturee', 'rejetee'];
    let evals = getLatestEvals((D.evaluations || []).filter(e => IN_PROGRESS_STATUTS.includes(e.statut)))
        .filter(prCanSeeEval);

    // Apply filters
    evals = evals.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    });

    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group">
                <label>${t('domain')}</label>
                <select onchange="window._evalFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>${t('sector')}</label>
                <select onchange="window._evalFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group filter-search">
                <label>${t('search')}</label>
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._evalFilters={domaine:'',secteur:'',statut:'',search:''};renderPage();">${ICONS.refresh}</button>
            </div>
        </div>
    </div>`;

    const rows = evals.map((ev, idx) => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
        const statusMap = {
            brouillon:        { cls: 'badge-draft',     lbl: t('draft'),                 color: '#6b7280' },
            soumis_directeur: { cls: 'badge-warning',   lbl: 'Soumis à la Validation',   color: '#d97706' },
            renvoyee:         { cls: 'badge-danger',    lbl: 'Renvoyée',                 color: '#dc2626' },
            acceptee:         { cls: 'badge-info',      lbl: 'Acceptée',                 color: '#0ea5e9' },
            cloturee:         { cls: 'badge-info',      lbl: 'Clôturée',                 color: '#2563eb' },
            rejetee:          { cls: 'badge-danger',    lbl: 'Rejetée',                  color: '#b91c1c' }
        };
        const sm = statusMap[ev.statut] || statusMap.brouillon;
        const statusClass = sm.cls;
        const statusLabel = sm.lbl;
        const statusColor = sm.color;
        const g = ev.resultats?.global || {};

        // Completeness indicators for each type
        const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
        const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
        const compInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
        const confCount = Object.keys(ev.notes_conf || {}).filter(k => ev.notes_conf[k] > 0).length;
        const perfCount = Object.keys(ev.notes_perf || {}).filter(k => ev.notes_perf[k] > 0).length;
        const compCount = Object.keys(ev.notes_comp || {}).filter(k => ev.notes_comp[k] > 0).length;
        const confTotal = confInds.length * sas.length;
        const perfTotal = perfInds.length;
        const compTotal = compInds.length;

        // Summary row with 3 indicator badges
        const confPct = confTotal > 0 ? Math.round(confCount / confTotal * 100) : 0;
        const perfPct = perfTotal > 0 ? Math.round(perfCount / perfTotal * 100) : 0;
        const compPct = compTotal > 0 ? Math.round(compCount / compTotal * 100) : 0;

        const renvoiBlock = (ev.statut === 'renvoyee' && (ev.commentaire_directeur || '').trim())
            ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.75rem;">
                <div style="font-weight:700;color:#991b1b;font-size:0.82rem;">${t('returned_for_observations')}</div>
                <div style="font-size:0.78rem;color:#7f1d1d;margin-top:0.15rem;">${ev.date_revue_directeur ? 'Le ' + formatDate(ev.date_revue_directeur) : ''}</div>
                <div style="font-size:0.85rem;margin-top:0.4rem;white-space:pre-wrap;color:#7f1d1d;">${_genEsc(ev.commentaire_directeur)}</div>
            </div>` : '';
        const detailHtml = `<div style="padding:0.75rem;font-size:0.85rem;">
            ${renvoiBlock}
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:0.75rem;">
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #3182ce;">
                    <div style="font-weight:600;color:#3182ce;margin-bottom:0.25rem;">${t('conformity')}</div>
                    <div>Taux: ${g.tauxConf !== undefined ? (g.tauxConf*100).toFixed(1)+'%' : '-'} | IDC: ${g.idc_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${confCount}/${confTotal} (${confPct}%)</div>
                </div>
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #059669;">
                    <div style="font-weight:600;color:#059669;margin-bottom:0.25rem;">${t('performance')}</div>
                    <div>Taux: ${g.tauxPerf !== undefined ? (g.tauxPerf*100).toFixed(1)+'%' : '-'} | IDP: ${g.idp_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${perfCount}/${perfTotal} (${perfPct}%)</div>
                </div>
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #d97706;">
                    <div style="font-weight:600;color:#d97706;margin-bottom:0.25rem;">${t('complexity')}</div>
                    <div>Taux: ${g.tauxComp !== undefined ? (g.tauxComp*100).toFixed(1)+'%' : '-'} | IDE: ${g.ide_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${compCount}/${compTotal} (${compPct}%)</div>
                </div>
            </div>
        </div>`;

        const accId = `eval_all_${idx}`;
        return `<div class="card" style="margin-bottom:0.5rem;padding:0.5rem 1rem;border-left:4px solid ${statusColor};background:linear-gradient(90deg, ${statusColor}14 0%, var(--bg-card) 35%);">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <strong>${prest?.nom || '-'}</strong>
                <span class="text-muted">- ${sect?.nom || '-'}</span>
                <span class="badge ${statusClass}" style="margin-left:auto;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">${statusLabel}</span>
                <span class="date-cell">${formatDate(ev.date_validation || ev.date)}</span>
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="${t('edit')}" aria-label="${t('edit')}">${ICONS.edit}</button>
                ${ev.statut === 'brouillon' && canCreate ?
                    `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}" aria-label="${t('delete')}">${ICONS.trash}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="${t('details')}" aria-label="${t('details')}">${ICONS.chevron}</button>
            </div>
            <div class="accordion-body" id="acc-body-${accId}">${detailHtml}</div>
        </div>`;
    }).join('');

    return `
    <div class="page-header" id="printStart_eval">
        <h2>${t('evaluations_en_cours')}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_eval')">${ICONS.print} ${t('print')}</button>
            ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewEvalModal()">${ICONS.plus} ${t('new_eval')}</button>` : ''}
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="results-info">${t('results_count', evals.length)}</div>
    <div id="evalContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
}

function renderEvalResults() {
    const D = APP_STATE.data;
    const f = window._evalFilters;
    let validEvals = getLatestEvals((D.evaluations || []).filter(e => e.statut === 'valide'));

    // Apply filters
    validEvals = validEvals.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    });

    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group">
                <label>${t('domain')}</label>
                <select onchange="window._evalFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>${t('sector')}</label>
                <select onchange="window._evalFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group filter-search">
                <label>${t('search')}</label>
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._evalFilters={domaine:'',secteur:'',statut:'',search:''};renderPage();">${ICONS.refresh}</button>
            </div>
        </div>
    </div>`;

    const rows = validEvals.map((ev, idx) => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const g = ev.resultats?.global || {};
        const risk = g.globalRisk || {};
        const csrbo = g.csrbo || Math.round((parseInt(sect?.csn || 24)) * (risk.csnMod || 1));
        const accId = 'res_' + idx;

        // ── Cycle dates (Début / Fin) ──
        const _canEditCycle = prCanValidate(ev.secteur_id);
        const debut = (ev.date_debut_cycle || '').slice(0, 10);
        let fin = (ev.date_fin_cycle || '').slice(0, 10);
        // Auto-derive Fin = Début + csrbo months when not yet set
        if (debut && !fin && csrbo) {
            const dt = new Date(debut + 'T00:00:00');
            if (!isNaN(dt.getTime())) {
                dt.setMonth(dt.getMonth() + parseInt(csrbo || 0));
                fin = oasisJour(dt);
            }
        }
        // Reminder level: red if fin < +1 month, orange if fin < +2 months
        let reminderLevel = null;
        if (fin) {
            const today = new Date(); today.setHours(0,0,0,0);
            const dFin = new Date(fin + 'T00:00:00');
            const m1 = new Date(today); m1.setMonth(m1.getMonth() + 1);
            const m2 = new Date(today); m2.setMonth(m2.getMonth() + 2);
            if (dFin <= m1) reminderLevel = 'red';
            else if (dFin <= m2) reminderLevel = 'orange';
        }
        const reminderColor = reminderLevel === 'red' ? '#dc2626' : (reminderLevel === 'orange' ? '#d97706' : null);
        const reminderText = reminderLevel === 'red'
            ? '⚠ Réévaluation requise (moins d\'un mois avant fin de cycle)'
            : (reminderLevel === 'orange' ? '⏰ Réévaluation à prévoir (moins de 2 mois avant fin de cycle)' : '');
        const reminderBanner = reminderColor
            ? `<div style="background:${reminderColor}14;border-left:4px solid ${reminderColor};border-radius:6px;padding:0.4rem 0.7rem;margin:0.4rem 0;color:${reminderColor};font-size:0.82rem;font-weight:600;">${reminderText}</div>`
            : '';
        const reevalBtnStyle = reminderColor
            ? `background:${reminderColor};border-color:${reminderColor};color:#fff;`
            : '';
        const reevalBtnClass = reminderColor ? 'btn btn-sm' : 'btn btn-outline btn-sm';
        const dInputStyle = 'padding:0.18rem 0.4rem;font-size:0.78rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);';
        const dInputAttrs = _canEditCycle ? '' : 'readonly';

        return `<div class="card" style="margin-bottom:0.5rem;padding:0.5rem 1rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <strong>${prest?.nom || '-'}</strong>
                <span class="text-muted">- ${sect?.nom || '-'}</span>
                <span class="badge ${getRiskBadgeClass(risk.risk)}" style="margin-left:auto;">${risk.label || '-'}</span>
                <span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span>
                <span class="date-cell">${formatDate(ev.date_validation || ev.date)}</span>
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="${t('view_indicators_scores')}" aria-label="${t('view_indicators_scores')}">${ICONS.eye}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','word')" title="Exporter Word" aria-label="Exporter Word">${ICONS.word}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF" aria-label="Exporter PDF">${ICONS.download}</button>
                ${prCanSupprimerEval(ev) ? `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}" aria-label="${t('delete')}">${ICONS.trash}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="${t('synthesis')}" aria-label="${t('synthesis')}">${ICONS.chevron}</button>
            </div>
            ${reminderBanner}
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border);font-size:0.78rem;align-items:center;">
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">${t('cycle_start_label')}</span>
                    <input type="date" value="${debut}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','debut',this.value,${csrbo || 0},this)"
                        style="${dInputStyle}">
                </label>
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">Fin Cycle :</span>
                    <input type="date" value="${fin}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','fin',this.value,${csrbo || 0},this)"
                        style="${dInputStyle}">
                </label>
                ${prCanReevaluer(ev)
                    ? `<button class="${reevalBtnClass}" style="${reevalBtnStyle}margin-left:auto;" onclick="reevaluerEval('${ev.id}')">${t('reevaluer_btn')}</button>`
                    : (prReevaluationEnCours(ev)
                        ? `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);">Réévaluation en cours (cycle ${prReevaluationEnCours(ev).cycle || (ev.cycle || 1) + 1})</span>`
                        : `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);" title="${t('reserved_manager_validator')}">${t('reassess_not_allowed')}</span>`)}
            </div>
            <div class="accordion-body" id="acc-body-${accId}">${buildSynthesisAccordion(ev, accId)}</div>
        </div>`;
    }).join('');

    return `
    <div class="page-header" id="printStart_results"><h2>${t('evaluations_validees')}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_results')">${ICONS.print} ${t('print')}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('resultsContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('resultsContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="results-info">${t('results_count', validEvals.length)}</div>
    <div id="resultsContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
}

// Export evaluation report (Word/PDF following Modèle de Rapport)
// Rapport d'évaluation du profil de risque — modèle AAC (7 sections + 3 appendices).
// Word : document HTML téléchargé (.doc, ouvert nativement par Word).
// PDF  : fenêtre d'impression (« Enregistrer au format PDF »).
function buildEvalReportHtml(ev) {
    const D = APP_STATE.data;
    const aac = D.aac || {};
    const esc = oasisEsc;
    // Texte libre : conserve les retours à la ligne, « - » si vide
    const txt = s => (String(s == null ? '' : s).trim() ? esc(s).replace(/\n/g, '<br>') : '-');

    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id) || {};
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const gen = ev.generalites || {};
    const res = ev.resultats || {};
    const g = res.global || {};
    const parSa = res.sousActivites || {};

    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);

    const dateEval = ev.date_validation || ev.decide_le || ev.updatedAt || ev.createdAt;
    const dateStr = dateEval ? new Date(dateEval).toLocaleString('fr-FR').replace(',', '') : '-';
    const reference = 'eval_' + String(ev.id || '').slice(-4);
    const preparePar = evalUserLabel(ev.decide_par || ev.created_by || (APP_STATE.user || {}).id) || '-';
    const saLabel = sa => `${sa.code || ''} - ${sa.nom || ''}`;
    const critereOf = (ind, note) => (note === 1 ? ind.c1 : note === 2 ? ind.c2 : note === 3 ? ind.c3 : '') || '';

    // ── Appendices : lignes détaillées par axe ──
    const rowsConf = [];
    sas.forEach(sa => confInds.forEach(ind => {
        const n = ev.notes_conf?.[`${sa.id}_${ind.id}`] || '';
        rowsConf.push([sa.code || '', ind.code || '', ind.label || '', n || '-', critereOf(ind, n)]);
    }));
    const rowsPerf = perfInds.map(ind => {
        const n = ev.notes_perf?.[ind.id] || '';
        return [ind.code || '', ind.label || '', n || '-', critereOf(ind, n)];
    });
    const rowsComp = [];
    sas.forEach(sa => (D.indComplex || [])
        .filter(i => i.sous_activite_id === sa.id && i.actif !== false)
        .forEach(ind => {
            const n = ev.notes_comp?.[ind.id] || '';
            rowsComp.push([sa.code || '', ind.code || '', ind.label || '', n || '-', critereOf(ind, n)]);
        }));

    const tbl = (headers, rows, widths) => `
    <table class="rep-tbl">
      <thead><tr>${headers.map((h, i) => `<th${widths && widths[i] ? ` style="width:${widths[i]}"` : ''}>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.length
        ? rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="rep-empty">${t('no_data')}</td></tr>`}</tbody>
    </table>`;

    // 4.3 / 5 — synthèse et périodicité par sous-activité
    const synthSa = sas.map(sa => {
        const r = parSa[sa.id] || {};
        return `<div class="rep-sa">${esc(saLabel(sa))}</div>` + tbl(
            ['idc', 'idp', 'ids', 'ide', 'Index Risque', 'Periodicite'],
            [[r.idc_s || '-', r.idp_s || '-', r.ids_s || '-', r.ide_s || '-', r.risk || '-', r.freq ? `${r.freq}x / cycle` : '-']]
        );
    }).join('');

    const periodiciteRows = sas.map(sa => {
        const r = parSa[sa.id] || {};
        return [saLabel(sa), r.risk || '-', r.freq ? `${r.freq}x / cycle` : '-', g.csrbo || '-'];
    });

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'évaluation — ${esc(prest.nom || '')}</title>
<style>
  @page { size: A4; margin: 18mm 14mm 16mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 10.5pt; margin: 0; }
  .rep-runhead { text-align: center; font-size: 10pt; color: #222; padding-bottom: 6px; margin-bottom: 14px; }
  h1 { text-align: center; font-size: 18pt; font-weight: 400; color: #2f5496; margin: 6px 0 22px; }
  h2 { font-size: 13pt; font-weight: 400; color: #2f5496; margin: 20px 0 8px; }
  h3 { font-size: 11pt; font-weight: 400; color: #222; margin: 14px 0 6px; }
  .rep-meta td { padding: 3px 0; vertical-align: top; font-size: 10.5pt; }
  .rep-meta td:first-child { width: 190px; }
  .rep-field { margin: 2px 0 12px; }
  .rep-list { margin: 4px 0 12px 26px; }
  .rep-sa { font-size: 10.5pt; margin: 12px 0 4px; }
  .rep-tbl { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  .rep-tbl th { border: 1px solid #8ea9db; background: #d9e2f3; text-align: left;
                padding: 4px 7px; font-size: 8.5pt; font-weight: 400; }
  .rep-tbl td { border: 1px solid #8ea9db; padding: 4px 7px; font-size: 8.5pt; vertical-align: top; }
  .rep-empty { text-align: center; color: #777; }
  .rep-appendix { page-break-before: always; }
  @media print { .rep-appendix { page-break-before: always; } }
</style></head>
<body>
  <div class="rep-runhead">${esc(aac.nom || "Autorité de l'Aviation Civile")}</div>
  <h1>Rapport d'Évaluation du Profil de Risque</h1>

  <table class="rep-meta">
    <tr><td>Nom du Prestataire :</td><td>${esc(prest.nom || '-')}</td></tr>
    <tr><td>Secteur :</td><td>${esc(sect.code || '')} - ${esc(sect.nom || '')}</td></tr>
    <tr><td>Date d'évaluation :</td><td>${esc(dateStr)}</td></tr>
    <tr><td>Référence :</td><td>${esc(reference)}</td></tr>
    <tr><td>Préparé par :</td><td>${esc(preparePar)}</td></tr>
  </table>

  <h2>Section 1 : Introduction et résumé analytique</h2>
  <h3>Introduction</h3>
  <div class="rep-field">${txt(gen.introduction)}</div>
  <h3>Résumé analytique</h3>
  <div class="rep-field">${txt(gen.resume)}</div>

  <h2>Section 2 : Liste des évaluateurs et parties prenantes</h2>
  <h3>Liste des évaluateurs</h3>
  <div class="rep-field">${txt(gen.evaluateurs
      || (ev.evaluateurs_designes || []).map(u => ' - ' + evalUserLabel(u)).join('\n'))}</div>
  <h3>Parties prenantes</h3>
  <div class="rep-field">${txt(gen.parties)}</div>

  <h2>Section 3 : Sources de données pour les évaluations</h2>
  <div class="rep-field">${txt(gen.sources)}</div>

  <h2>Section 4 : Profil de risque du prestataire de service</h2>
  <h3>4.1 Sous-secteurs d'activités du prestataire</h3>
  <div class="rep-list">${sas.length ? sas.map(sa => `- ${esc(saLabel(sa))}`).join('<br>') : '-'}</div>

  <h3>4.2 Synthèse globale du profil de risque</h3>
  ${tbl(['Indice Conformité (IDC)', 'Indice Performance (IDP)', 'Indice Sécurité (IDS)', 'Indice Complexité (IDE)'],
        [[g.idc_g || '-', g.idp_g || '-', g.ids_g || '-', g.ide_g || '-']])}

  <h3>4.3 Synthèse par sous-activité</h3>
  ${sas.length ? synthSa : '<div class="rep-field">-</div>'}

  <h2>Section 5 : Cycle de surveillance actuel et proposé</h2>
  ${tbl(['Cycle actuel (CSn)', 'Index Risque Sécurité', 'Intensité surveillance', 'Cycle proposé (CSRBO)'],
        [[g.csn ? `${g.csn} mois` : '-',
          g.globalRisk?.label ? `${g.globalRisk.label}${g.globalRisk.risk ? ' (' + g.globalRisk.risk + ')' : ''}` : '-',
          g.globalRisk?.intensity || '-',
          g.csrbo ? `${g.csrbo} mois` : '-']])}
  <h3>Périodicité par sous-activité :</h3>
  ${tbl(['Sous-activité', 'Index Risque', 'Périodicité', 'Cycle CSRBO (mois)'], periodiciteRows,
        ['42%', '18%', '20%', '20%'])}

  <h2>Section 6 : Actions d'améliorations proposées suite aux échanges avec les prestataires</h2>
  <div class="rep-field">${txt(gen.actions)}</div>

  <h2>Section 7 : Conclusion</h2>
  <div class="rep-field">${txt(gen.conclusion)}</div>

  <div class="rep-appendix">
    <h2>Appendices : Tableaux d'évaluations</h2>
    <h3>Appendice 1 : Détails indicateurs Conformité</h3>
    ${tbl(['S.A.', 'Code', 'Libellé', 'Score', 'Critère'], rowsConf, ['10%', '11%', '30%', '7%', '42%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 2 : Détails indicateurs Performance</h3>
    ${tbl(['Code', 'Libellé', 'Score', 'Critère'], rowsPerf, ['12%', '33%', '7%', '48%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 3 : Détails indicateurs Complexité</h3>
    ${tbl(['S.A.', 'Code', 'Libellé', 'Score', 'Critère'], rowsComp, ['10%', '11%', '30%', '7%', '42%'])}
  </div>
</body></html>`;
}

function exportEvalReport(evalId, format) {
    const ev = (APP_STATE.data.evaluations || []).find(e => e.id === evalId);
    if (!ev) { showToast(t('eval_not_found'), 'error'); return; }
    const prest = (APP_STATE.data.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const base = `rapport_evaluation_${(prest.trigramme || prest.nom || 'prestataire').replace(/[^\w-]+/g, '_')}`;
    const html = buildEvalReportHtml(ev);
    try {
        if (format === 'word') {
            const blob = new Blob(['﻿' + html], { type: 'application/msword' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${base}.doc`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            showToast(t('word_downloaded'));
            return;
        }
        const w = window.open('', '_blank');
        if (!w) { showToast(t('allow_popups_pdf'), 'error'); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 350);
    } catch (e) { showToast(e.message, 'error'); }
}


async function openNewEvalModal() {
    const D = APP_STATE.data;
    if (!prCanCreateEval()) {
        showToast(t('create_reserved'), 'error');
        return;
    }
    // Seuls les prestataires des secteurs couverts par le privilège sont proposés
    const allowed = new Set(prManagedSecteurs());
    const prestataires = (D.prestataires || [])
        .filter(p => p.actif !== false && p.actif !== 0)
        .filter(p => allowed.has(p.secteur_id));
    const secteurs = (D.secteurs || []).filter(s => allowed.has(s.id));
    if (!prestataires.length) {
        showToast(t('no_provider_in_scope'), 'warning');
        return;
    }

    showModal(t('new_eval'), `
        <div class="form-group">
            <label>${t('provider')}</label>
            <select id="evalPrestId">
                <option value="">${t('select_option')}</option>
                ${prestataires.map(p => `<option value="${p.id}" data-secteur="${p.secteur_id}">${escapeHtml(p.nom)} (${p.trigramme || ''})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('sector')}</label>
            <select id="evalSectId">
                <option value="">${t('select_option')}</option>
                ${secteurs.map(s => `<option value="${s.id}">${escapeHtml(s.nom)} (${escapeHtml(s.code)})</option>`).join('')}
            </select>
        </div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="createEval()">${t('add')}</button>`);

    document.getElementById('evalPrestId').addEventListener('change', function() {
        const opt = this.selectedOptions[0];
        const sectId = opt?.dataset?.secteur;
        if (sectId) document.getElementById('evalSectId').value = sectId;
    });
}

async function createEval() {
    const prestId = document.getElementById('evalPrestId').value;
    const sectId = document.getElementById('evalSectId').value;
    if (!prestId || !sectId) { showToast(t('select_provider_sector'), 'error'); return; }
    const prest = APP_STATE.data.prestataires.find(p => p.id === prestId);
    try {
        await api(`${MODULE_API}/evaluations`, {
            method: 'POST',
            body: JSON.stringify({
                prestataire_id: prestId, secteur_id: sectId,
                domaine_id: prest?.domaine_id || '', statut: 'brouillon',
                notes_conf: {}, notes_perf: {}, notes_comp: {}, resultats: {}
            })
        });
        closeModal();
        await loadAllData();
        renderPage();
        showToast(t('draft_saved'));
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Évaluateurs éligibles (Gestion des Droits du module) ──
// Cache par couple domaine|secteur. Renvoie null tant que la liste charge ;
// le formulaire est re-rendu dès la réponse.
window._evalEligibleCache = window._evalEligibleCache || {};
function evalEligibleEvaluators(domaineId, secteurId) {
    const key = `${domaineId || ''}|${secteurId || ''}`;
    const cache = window._evalEligibleCache;
    if (cache[key] !== undefined) return cache[key];
    cache[key] = null; // en cours de chargement
    const qs = new URLSearchParams();
    if (domaineId) qs.set('domaine_id', domaineId);
    if (secteurId) qs.set('secteur_id', secteurId);
    api(`/api/m/droits/PLAN/evaluateurs?${qs.toString()}`)
        .then((list) => {
            cache[key] = Array.isArray(list) ? list : [];
            if (APP_STATE.currentEvalId) openEvalDetail(APP_STATE.currentEvalId);
        })
        .catch(() => { cache[key] = []; });
    return null;
}

// Résout un identifiant d'évaluateur dans les listes chargées.
// L'identifiant est le nom d'utilisateur (= e-mail) : la liste du portail
// n'expose pas de champ `id`, d'où la comparaison sur username / email.
function evalUserById(uid) {
    if (!uid) return null;
    for (const list of Object.values(window._evalEligibleCache || {})) {
        if (!Array.isArray(list)) continue;
        const hit = list.find((x) => x.id === uid || x.username === uid || x.email === uid);
        if (hit) return hit;
    }
    return (APP_STATE.data.users || []).find(
        (x) => x.id === uid || x.username === uid || x.email === uid
    ) || null;
}

// Libellé d'un évaluateur : « NOM Prénom », jamais l'adresse e-mail
function evalUserLabel(uid) {
    const u = evalUserById(uid);
    if (!u) return uid;
    const full = `${(u.nom || '').trim()} ${(u.prenom || '').trim()}`.trim();
    return full || u.fullName || u.nom_utilisateur || u.email || uid;
}

// ── Fiche d'une évaluation ──
