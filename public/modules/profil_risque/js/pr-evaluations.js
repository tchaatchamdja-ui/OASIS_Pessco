/* Module « Profils de Risques » — evaluations
   Évaluations : notation, consolidation, réunions, validation, rapports.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
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
        <div class="detail-item"><label>Intensité</label><span>${intensity}</span></div>
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
            <span style="min-width:200px;font-weight:600;">${sa.code} - ${sa.nom}</span>
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
                <span class="acc-title">Synthèse Globale</span>
            </div>
            <div class="accordion-body" id="acc-body-${gId}">${globalHtml}</div>
        </div>
        <div class="accordion-item acc-level-2">
            <div class="accordion-header" data-acc-id="${sId}" onclick="toggleAccordion('${sId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">Synthèse par Sous-activité</span>
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
        ? '<span class="eval-step rejected" title="Évaluation rejetée — circuit interrompu">Rejetée</span>'
        : (cur === -1 ? '<span class="eval-step todo" title="Aucun évaluateur désigné : la notation n\'est pas encore ouverte">En préparation</span>' : '');
    return `<div class="eval-steps" role="img" aria-label="Avancement de l'évaluation">${items}${flag}</div>`;
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
function prCanSupprimerEval(ev) {
    return !!ev && prPrivOn(prSecteurOf(ev)) === 'GESTIONNAIRE';
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
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${f.search}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
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
                <div style="font-weight:700;color:#991b1b;font-size:0.82rem;">↩ Renvoyée pour prise en compte des observations</div>
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
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="${t('edit')}">${ICONS.edit}</button>
                ${ev.statut === 'brouillon' && canCreate ?
                    `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}">${ICONS.trash}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="Détails">${ICONS.chevron}</button>
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
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${f.search}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
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
                fin = dt.toISOString().slice(0, 10);
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
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="Consulter les indicateurs et notes">${ICONS.eye}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','word')" title="Exporter Word">${ICONS.word}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF">${ICONS.download}</button>
                ${prCanSupprimerEval(ev) ? `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}">${ICONS.trash}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="${t('synthesis') || 'Synthèse'}">${ICONS.chevron}</button>
            </div>
            ${reminderBanner}
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border);font-size:0.78rem;align-items:center;">
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">Début Cycle :</span>
                    <input type="date" value="${debut}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','debut',this.value,${csrbo || 0})"
                        style="${dInputStyle}">
                </label>
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">Fin Cycle :</span>
                    <input type="date" value="${fin}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','fin',this.value,${csrbo || 0})"
                        style="${dInputStyle}">
                </label>
                ${prCanReevaluer(ev)
                    ? `<button class="${reevalBtnClass}" style="${reevalBtnStyle}margin-left:auto;" onclick="reevaluerEval('${ev.id}')">↻ Réévaluer</button>`
                    : (prReevaluationEnCours(ev)
                        ? `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);">Réévaluation en cours (cycle ${prReevaluationEnCours(ev).cycle || (ev.cycle || 1) + 1})</span>`
                        : `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);" title="Réservé aux privilèges Gestionnaire et Validateur couvrant ce domaine et ce secteur.">Réévaluation non autorisée</span>`)}
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
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
        : `<tr><td colspan="${headers.length}" class="rep-empty">Aucune donnée</td></tr>`}</tbody>
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
  <h1>Rapport d'Evaluation du Profil de Risque</h1>

  <table class="rep-meta">
    <tr><td>Nom du Prestataire :</td><td>${esc(prest.nom || '-')}</td></tr>
    <tr><td>Secteur :</td><td>${esc(sect.code || '')} - ${esc(sect.nom || '')}</td></tr>
    <tr><td>Date d'evaluation :</td><td>${esc(dateStr)}</td></tr>
    <tr><td>Reference :</td><td>${esc(reference)}</td></tr>
    <tr><td>Prepare par :</td><td>${esc(preparePar)}</td></tr>
  </table>

  <h2>Section 1 : Introduction et resume analytique</h2>
  <h3>Introduction</h3>
  <div class="rep-field">${txt(gen.introduction)}</div>
  <h3>Resume analytique</h3>
  <div class="rep-field">${txt(gen.resume)}</div>

  <h2>Section 2 : Liste des evaluateurs et parties prenantes</h2>
  <h3>Liste des evaluateurs</h3>
  <div class="rep-field">${txt(gen.evaluateurs
      || (ev.evaluateurs_designes || []).map(u => ' - ' + evalUserLabel(u)).join('\n'))}</div>
  <h3>Parties prenantes</h3>
  <div class="rep-field">${txt(gen.parties)}</div>

  <h2>Section 3 : Sources de donnees pour les evaluations</h2>
  <div class="rep-field">${txt(gen.sources)}</div>

  <h2>Section 4 : Profil de risque du prestataire de service</h2>
  <h3>4.1 Sous-secteurs d'activites du prestataire</h3>
  <div class="rep-list">${sas.length ? sas.map(sa => `- ${esc(saLabel(sa))}`).join('<br>') : '-'}</div>

  <h3>4.2 Synthese globale du profil de risque</h3>
  ${tbl(['Indice Conformite (IDC)', 'Indice Performance (IDP)', 'Indice Securite (IDS)', 'Indice Complexite (IDE)'],
        [[g.idc_g || '-', g.idp_g || '-', g.ids_g || '-', g.ide_g || '-']])}

  <h3>4.3 Synthese par sous-activite</h3>
  ${sas.length ? synthSa : '<div class="rep-field">-</div>'}

  <h2>Section 5 : Cycle de surveillance actuel et propose</h2>
  ${tbl(['Cycle actuel (CSn)', 'Index Risque Securite', 'Intensite surveillance', 'Cycle propose (CSRBO)'],
        [[g.csn ? `${g.csn} mois` : '-',
          g.globalRisk?.label ? `${g.globalRisk.label}${g.globalRisk.risk ? ' (' + g.globalRisk.risk + ')' : ''}` : '-',
          g.globalRisk?.intensity || '-',
          g.csrbo ? `${g.csrbo} mois` : '-']])}
  <h3>Periodicite par sous-activite :</h3>
  ${tbl(['Sous-activite', 'Index Risque', 'Periodicite', 'Cycle CSRBO (mois)'], periodiciteRows,
        ['42%', '18%', '20%', '20%'])}

  <h2>Section 6 : Actions d'ameliorations proposees suite aux echanges avec les prestataires</h2>
  <div class="rep-field">${txt(gen.actions)}</div>

  <h2>Section 7 : Conclusion</h2>
  <div class="rep-field">${txt(gen.conclusion)}</div>

  <div class="rep-appendix">
    <h2>Appendices : Tableaux d'evaluations</h2>
    <h3>Appendice 1 : Details indicateurs Conformite</h3>
    ${tbl(['S.A.', 'Code', 'Libelle', 'Score', 'Critere'], rowsConf, ['10%', '11%', '30%', '7%', '42%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 2 : Details indicateurs Performance</h3>
    ${tbl(['Code', 'Libelle', 'Score', 'Critere'], rowsPerf, ['12%', '33%', '7%', '48%'])}
  </div>

  <div class="rep-appendix">
    <h3>Appendice 3 : Details indicateurs Complexite</h3>
    ${tbl(['S.A.', 'Code', 'Libelle', 'Score', 'Critere'], rowsComp, ['10%', '11%', '30%', '7%', '42%'])}
  </div>
</body></html>`;
}

function exportEvalReport(evalId, format) {
    const ev = (APP_STATE.data.evaluations || []).find(e => e.id === evalId);
    if (!ev) { showToast('Évaluation introuvable', 'error'); return; }
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
            showToast('Rapport Word téléchargé');
            return;
        }
        const w = window.open('', '_blank');
        if (!w) { showToast('Autorisez les fenêtres surgissantes pour générer le PDF.', 'error'); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 350);
    } catch (e) { showToast(e.message, 'error'); }
}

// Helper to compute global taux
function calculateTauxGlobal(ev, type, inds, sas) {
    if (type === 'conf') {
        let total = 0, count = 0;
        sas.forEach(sa => {
            inds.forEach(ind => {
                const key = `${sa.id}_${ind.id}`;
                if (ev.notes_conf?.[key]) { total += ev.notes_conf[key]; count++; }
            });
        });
        return count > 0 ? (total / (count * 3)) : 0;
    }
    return 0;
}

async function openNewEvalModal() {
    const D = APP_STATE.data;
    if (!prCanCreateEval()) {
        showToast('Création réservée aux privilèges Gestionnaire ou Validateur.', 'error');
        return;
    }
    // Seuls les prestataires des secteurs couverts par le privilège sont proposés
    const allowed = new Set(prManagedSecteurs());
    const prestataires = (D.prestataires || [])
        .filter(p => p.actif !== false && p.actif !== 0)
        .filter(p => allowed.has(p.secteur_id));
    const secteurs = (D.secteurs || []).filter(s => allowed.has(s.id));
    if (!prestataires.length) {
        showToast('Aucun prestataire dans les domaines et secteurs couverts par vos privilèges.', 'warning');
        return;
    }

    showModal(t('new_eval'), `
        <div class="form-group">
            <label>${t('provider')}</label>
            <select id="evalPrestId">
                <option value="">${t('select_option')}</option>
                ${prestataires.map(p => `<option value="${p.id}" data-secteur="${p.secteur_id}">${p.nom} (${p.trigramme || ''})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('sector')}</label>
            <select id="evalSectId">
                <option value="">${t('select_option')}</option>
                ${secteurs.map(s => `<option value="${s.id}">${s.nom} (${s.code})</option>`).join('')}
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
    if (!prestId || !sectId) { showToast('Selectionnez un prestataire et un secteur', 'error'); return; }
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
// L'écran le plus dense du module : on sépare ce qui se calcule (les droits de
// l'utilisateur, les indicateurs, les totaux) de ce qui s'écrit (le corps de la
// fiche, puis sa barre d'actions). Les deux fabriques reçoivent le contexte.

// Contexte de la fiche : évaluation, portée de l'utilisateur, indicateurs et totaux.
// Renvoie `null` quand l'évaluation n'existe pas.
function _prEvalContexte(evalId) {
    const D = APP_STATE.data;
    const ev = (D.evaluations || []).find(e => e.id === evalId);
    if (!ev) return null;
    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id);
    // Use the raw (unfiltered) sub-activity list so designated evaluators outside
    // the eval's domain still see the full structure on Conformité / Complexité tabs.
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const indices = D.indices || {};
    const canEditDomain = APP_STATE.allowedSecteurs === null || (APP_STATE.allowedSecteurs || []).includes(ev.secteur_id);
    // Consolidation override: when active, indicators stay editable even if soumis_directeur
    // After save, a "consolidation_locked" flag forces read-only regardless of statut.
    const _consolKey = 'pr_consol_' + evalId;
    const _consolLockKey = 'pr_consol_locked_' + evalId;
    const _consolActive = !!localStorage.getItem(_consolKey);
    const _consolLocked = !!localStorage.getItem(_consolLockKey);
    const isReadonly = ['valide', 'cloturee', 'rejetee'].includes(ev.statut)
        || (APP_STATE.user?.role === 'Consultation')
        || !canEditDomain
        || (['soumis_directeur', 'acceptee'].includes(ev.statut) && !_consolActive)
        || (_consolLocked && !_consolActive);

    // ── Multi-evaluator: validator vs designated evaluator ──
    const currentUserId = APP_STATE.user?.id || '';
    const isValidator = prCanValidate(ev.secteur_id);
    if (!ev.evaluateurs_designes || !Array.isArray(ev.evaluateurs_designes)) ev.evaluateurs_designes = [];
    if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
    if (!ev.notes_per_evaluator.perf) ev.notes_per_evaluator.perf = {};
    if (!ev.notes_per_evaluator.comp) ev.notes_per_evaluator.comp = {};
    if (!ev.notes_per_evaluator_draft || typeof ev.notes_per_evaluator_draft !== 'object') ev.notes_per_evaluator_draft = {};
    if (!ev.notes_per_evaluator_draft.perf) ev.notes_per_evaluator_draft.perf = {};
    if (!ev.notes_per_evaluator_draft.comp) ev.notes_per_evaluator_draft.comp = {};
    const isDesignated = (ev.evaluateurs_designes || []).includes(currentUserId);
    const isDraftMode = isDesignated && !isValidator; // designated evaluator who is not validator → private brouillon

    // Store active tab for this modal — default to "Généralités"
    if (!window._evalDetailTab) window._evalDetailTab = 'generalites';

    // Helper to render criteria rows with color coding
    function renderEvalCriteria(ind, isComplexity) {
        const rows = [];
        if (ind.c1) {
            const cls = isComplexity ? 'criteria-score-1-good' : 'criteria-score-1-bad';
            rows.push(`<div class="eval-criteria-row ${cls}"><span class="cr-score">1</span><span class="cr-text">${ind.c1}</span></div>`);
        }
        if (ind.c2) {
            rows.push(`<div class="eval-criteria-row criteria-score-2-mid"><span class="cr-score">2</span><span class="cr-text">${ind.c2}</span></div>`);
        }
        if (ind.c3) {
            const cls = isComplexity ? 'criteria-score-3-bad' : 'criteria-score-3-good';
            rows.push(`<div class="eval-criteria-row ${cls}"><span class="cr-score">3</span><span class="cr-text">${ind.c3}</span></div>`);
        }
        return rows.length ? `<div class="eval-criteria-list">${rows.join('')}</div>` : '';
    }

    // Helper to render one indicator card with criteria + score buttons
    // For Perf/Comp the scoring rules differ per role:
    //   - Validator: clicks set the FINAL note (notes_perf/notes_comp) AND sees each evaluator's note
    //   - Designated evaluator (non-validator): clicks set ONLY their own slot in notes_per_evaluator
    //   - Other users: read-only view of the final note
    function renderEvalIndicator(ind, noteField, noteKey, isComplexity) {
        const isPerfOrComp = (noteField === 'notes_perf' || noteField === 'notes_comp');
        const slot = (noteField === 'notes_perf') ? 'perf' : (noteField === 'notes_comp' ? 'comp' : null);
        let note = 0;
        let writeMode = 'final'; // 'final' (notes_perf/notes_comp) | 'evaluator' (notes_per_evaluator)
        let canScore = !isReadonly;

        if (isPerfOrComp && slot) {
            if (isValidator) {
                note = ev[noteField]?.[noteKey] || 0;
                writeMode = 'final';
            } else if (isDesignated) {
                // Private draft: each evaluator sees only their own notes (not visible to validator/admin)
                // If already submitted (published), show the published value and lock editing.
                const publishedNote = ev.notes_per_evaluator[slot]?.[currentUserId]?.[noteKey] || 0;
                const draftNote = ev.notes_per_evaluator_draft[slot]?.[currentUserId]?.[noteKey] || 0;
                if (publishedNote > 0) {
                    note = publishedNote;
                    canScore = false; // already submitted — read-only for this evaluator
                } else {
                    note = draftNote;
                    writeMode = 'evaluator_draft';
                }
            } else {
                // Not validator, not designated → read-only of final note
                note = ev[noteField]?.[noteKey] || 0;
                canScore = false;
            }
        } else {
            // Conformity: only Validateur/Administrateur can score (§4.2.2.c — chef service)
            note = ev[noteField]?.[noteKey] || 0;
            if (!isValidator) canScore = false;
        }

        // For validator on Perf/Comp: status badge + line of evaluators' individual notes
        let evalsLine = '';
        if (isValidator && isPerfOrComp && slot && (ev.evaluateurs_designes || []).length) {
            const compiled = compileIndicatorStatus(slot, noteKey);
            const badgeMap = {
                consensus: { color:'#059669', txt:'Consensus' },
                discuss:   { color:'#d97706', txt:'À discuter (majorité)' },
                reevaluate:{ color:'#dc2626', txt:'À réévaluer' },
                pending:   { color:'#6b7280', txt:'En attente' }
            };
            const b = badgeMap[compiled.status] || badgeMap.pending;
            const badge = `<span style="background:${b.color}20;color:${b.color};border:1px solid ${b.color}55;border-radius:4px;padding:0.05rem 0.4rem;font-size:0.7rem;font-weight:700;margin-right:0.5rem;">${b.txt}</span>`;
            const items = ev.evaluateurs_designes.map(uid => {
                const n = ev.notes_per_evaluator[slot]?.[uid]?.[noteKey];
                return `<span style="margin-right:0.65rem;">${_escapeHtml(evalUserLabel(uid))}: <strong>${n || '-'}</strong></span>`;
            }).join('');
            evalsLine = `<div style="font-size:0.72rem;color:var(--text-muted);padding:0.2rem 0 0 2.4rem;">${badge}${items}</div>`;
        }

        // Inline comment per indicator
        // - Editable when statut === 'soumis_directeur'
        // - Read-only and visible to ALL users from acceptance onwards (acceptee/cloturee/valide/rejetee)
        const cSlot = (noteField === 'notes_conf') ? 'conf' : (noteField === 'notes_perf' ? 'perf' : (noteField === 'notes_comp' ? 'comp' : null));
        if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
        if (cSlot && !ev.commentaires_indicateurs[cSlot]) ev.commentaires_indicateurs[cSlot] = {};
        const commentVal = (cSlot ? (ev.commentaires_indicateurs[cSlot][noteKey] || '') : '');
        const isSoumis = (ev.statut === 'soumis_directeur');
        const commentEditable = isSoumis;
        const commentHasValue = !!commentVal.trim();
        const commentRowId = 'cmt_row_' + (evalId.slice(-6)) + '_' + (cSlot || 'x') + '_' + noteKey.replace(/[^a-zA-Z0-9]/g, '_');
        const taStyle = 'width:100%;padding:0.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.85rem;font-family:inherit;line-height:1.4;min-height:2.8rem;resize:vertical;';
        let commentBlock = '';
        if (cSlot && (commentHasValue || commentEditable)) {
            if (commentHasValue || !commentEditable) {
                commentBlock = `<div id="${commentRowId}" style="margin-top:0.35rem;">
                    <textarea class="eval-indicator-comment" data-slot="${cSlot}" data-key="${noteKey}" rows="2" placeholder="Commentaire..." ${commentEditable ? '' : 'readonly'}
                        style="${taStyle}">${_escapeHtml(commentVal)}</textarea>
                </div>`;
            } else {
                commentBlock = `<div id="${commentRowId}" style="margin-top:0.35rem;">
                    <button class="btn btn-outline" onclick="_inlineCommentReveal('${commentRowId}','${cSlot}','${noteKey}')" style="padding:0.22rem 0.7rem;font-size:0.78rem;">💬 Ajouter un commentaire</button>
                </div>`;
            }
        }

        return `<div class="eval-indicator">
            <div class="eval-indicator-header">
                <span class="ind-code">${ind.code}</span>
                <span class="ind-label">${ind.label}</span>
                <div class="score-selector${isComplexity ? ' inverse' : ''}">
                    ${[1,2,3].map(n => `<button class="score-btn ${note === n ? 'active-'+n : ''}" onclick="setScore('${evalId}','${noteField}','${noteKey}',${n},'${writeMode}')" ${canScore ? '' : 'disabled'}>${n}</button>`).join('')}
                </div>
            </div>
            ${evalsLine}
            ${renderEvalCriteria(ind, isComplexity)}
            ${commentBlock}
        </div>`;
    }
    function _escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    // Phase 2 — Compile per-evaluator scores for an indicator (4.2.2.d)
    function compileIndicatorStatus(slot, indKey) {
        const map = ev.notes_per_evaluator?.[slot] || {};
        const votes = (ev.evaluateurs_designes || [])
            .map(uid => map[uid]?.[indKey])
            .filter(n => n && n > 0);
        if (votes.length === 0) return { status: 'pending', votes: [] };
        const unique = [...new Set(votes)];
        if (unique.length === 1) return { status: 'consensus', votes };
        if (unique.length === 2) {
            const [a, b] = unique.sort((x, y) => x - y);
            // Adjacent (1&2 or 2&3) → majority + discuss
            if (b - a === 1) return { status: 'discuss', votes };
        }
        return { status: 'reevaluate', votes };
    }

    // Compute taux/indices for display (all 3 types)
    const g = ev.resultats?.global || {};

    // Check completeness per type (for Validé button logic)
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const confCount = Object.keys(ev.notes_conf || {}).filter(k => ev.notes_conf[k] > 0).length;
    const _srcPerf = evalNotesSource(ev, 'perf');
    const _srcComp = evalNotesSource(ev, 'comp');
    const perfCount = Object.keys(_srcPerf).filter(k => _srcPerf[k] > 0).length;
    const compCount = Object.keys(_srcComp).filter(k => _srcComp[k] > 0).length;
    const confTotal = confInds.length * sas.length;
    const perfTotal = perfInds.length;
    const compTotal = allCompInds.length;
    const allThreeScored = confCount > 0 && perfCount > 0 && compCount > 0;

    // Sum of scores obtained per type (for the bandeaux)
    const sumConf = sas.reduce((s, sa) => s + confInds.reduce((s2, ind) => s2 + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0), 0);
    const sumPerf = perfInds.reduce((s, ind) => s + (_srcPerf[ind.id] || 0), 0);
    const sumComp = allCompInds.reduce((s, ind) => s + (_srcComp[ind.id] || 0), 0);
    const maxConf = confTotal * 3;
    const maxPerf = perfTotal * 3;
    const maxComp = compTotal * 3;

    // Export/Import toolbar (réunions are now dedicated tabs after Complexité)
    return {
        // Fabriques internes : elles ferment sur l'évaluation et servent au corps.
        renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus,
        evalId, D, ev, prest, sect, sas, indices, canEditDomain,
        _consolKey, _consolLockKey, _consolActive, _consolLocked, isReadonly,
        currentUserId, isValidator, isDesignated, isDraftMode, g,
        confInds, perfInds, allCompInds, confCount, _srcPerf, _srcComp,
        perfCount, compCount, confTotal, perfTotal, compTotal, allThreeScored,
        sumConf, sumPerf, sumComp, maxConf, maxPerf, maxComp,
    };
}

// Corps de la fiche : barre d'outils, rappel d'un renvoi, entête et onglets.
function _prEvalCorpsHtml(c) {
    const { renderEvalCriteria, renderEvalIndicator, _escapeHtml, compileIndicatorStatus } = c;
    const {
        D, ev, prest, sect, sas, indices,
        isReadonly, currentUserId, isValidator, isDraftMode, g, confInds,
        perfInds, confCount, perfCount, compCount, confTotal, perfTotal,
        compTotal, sumConf, sumPerf, sumComp, maxConf, maxPerf,
        maxComp, evalId,
    } = c;

    let toolbarHtml = `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
        ${renderEvalProcessSteps(ev)}
        <span style="margin-left:auto;"></span>
        <button class="btn btn-primary btn-sm" onclick="exportEvalExcel('${evalId}')" title="Exporter Excel">${ICONS.file_excel} Exporter Excel</button>
        <button class="btn btn-primary btn-sm" onclick="exportEvalPDF('${evalId}')" title="Exporter PDF">${ICONS.download} Exporter PDF</button>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('evalImportFile').click();" title="Importer">${ICONS.upload} Importer</button>
        <input type="file" id="evalImportFile" accept=".xlsx,.xls" style="display:none" onchange="importEvalExcel(event,'${evalId}','conformite')">
        <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalModalBody',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
        <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalModalBody',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
    </div>`;

    // Renvoi comment block (Chap. 4 §4.2.2.f) — visible when statut='renvoyee'
    const renvoiHeader = (ev.statut === 'renvoyee' && (ev.commentaire_directeur || '').trim())
        ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;border-radius:6px;padding:0.6rem 0.85rem;margin-bottom:0.6rem;">
            <div style="font-weight:700;color:#991b1b;font-size:0.88rem;">↩ Évaluation renvoyée pour prise en compte des observations</div>
            <div style="font-size:0.78rem;color:#7f1d1d;margin-top:0.15rem;">${ev.date_revue_directeur ? 'Le ' + formatDate(ev.date_revue_directeur) : ''}</div>
            <div style="font-size:0.88rem;margin-top:0.4rem;white-space:pre-wrap;color:#7f1d1d;"><strong>Motif :</strong> ${_escapeHtml(ev.commentaire_directeur)}</div>
          </div>`
        : '';

    // Statut = étape en cours du fil d'avancement ; seule la couleur dépend du
    // statut technique (Chap. 4 §4.2.2.f).
    const statusClsHdr = {
        brouillon: 'badge-draft', soumis_directeur: 'badge-warning', renvoyee: 'badge-danger',
        acceptee: 'badge-info', cloturee: 'badge-info', rejetee: 'badge-danger', valide: 'badge-validated',
    };
    const smHdr = { cls: statusClsHdr[ev.statut] || 'badge-draft', lbl: evalStatutLabel(ev) };
    const stepDate = evalStepDate(ev);

    // Toolbar at top, then compact metadata row, then KPI bandeaux
    let bodyHtml = `${toolbarHtml}
    ${renvoiHeader}
    <div class="eval-meta-row" style="display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;align-items:baseline;font-size:0.82rem;margin-bottom:0.5rem;">
        <div><span style="color:var(--text-muted);">${t('provider')}:</span> <strong>${prest?.nom || '-'}</strong></div>
        <div><span style="color:var(--text-muted);">${t('sector')}:</span> ${sect?.nom || '-'}</div>
        <div><span style="color:var(--text-muted);">${t('status')}:</span> <span class="badge ${smHdr.cls}" style="padding:1px 8px;">${smHdr.lbl}</span></div>
        <div><span style="color:var(--text-muted);">${t('date')}:</span> <span title="Date de lancement de l'étape « ${smHdr.lbl} »">${stepDate ? formatDate(stepDate) : '-'}</span></div>
    </div>
    <div style="display:${isValidator ? 'grid' : 'none'};grid-template-columns:repeat(3,1fr);gap:0.4rem;margin-bottom:0.4rem;">
        <div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #3182ce;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#3182ce;">${t('conformity')}</strong>
            ${isValidator ? `&nbsp;·&nbsp; Taux: <strong id="evalTauxConf">${g.tauxConf !== undefined ? (g.tauxConf*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDC: <span id="evalIdcG">${g.idc_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumConf">${sumConf}</strong>/${maxConf}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntConf">${confCount}</span>/${confTotal})</span>` : ''}
        </div>
        ${isValidator ? `<div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #059669;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#059669;">${t('performance')}</strong>
            &nbsp;·&nbsp; Taux: <strong id="evalTauxPerf">${g.tauxPerf !== undefined ? (g.tauxPerf*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDP: <span id="evalIdpG">${g.idp_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumPerf">${sumPerf}</strong>/${maxPerf}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntPerf">${perfCount}</span>/${perfTotal})</span>
        </div>
        <div style="padding:0.3rem 0.55rem;background:var(--bg);border-radius:6px;border-left:3px solid #d97706;font-size:0.78rem;line-height:1.35;">
            <strong style="color:#d97706;">${t('complexity')}</strong>
            &nbsp;·&nbsp; Taux: <strong id="evalTauxComp">${g.tauxComp !== undefined ? (g.tauxComp*100).toFixed(1)+'%' : '-'}</strong>
            &nbsp;·&nbsp; IDE: <span id="evalIdeG">${g.ide_g || '-'}</span>
            &nbsp;·&nbsp; Notes: <strong id="evalSumComp">${sumComp}</strong>/${maxComp}
            <span style="color:var(--text-muted);margin-left:0.35rem;">(<span id="evalCntComp">${compCount}</span>/${compTotal})</span>
        </div>` : ''}
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:0.25rem 0 0.6rem;">`;

    // Inner tabs: Généralités + 3 indicator types
    const activeTab = window._evalDetailTab || 'generalites';
    bodyHtml += `<div class="eval-inner-tabs" style="display:flex;gap:0;margin-bottom:1rem;border-bottom:2px solid var(--border);">
        <button class="eval-tab-btn ${activeTab === 'generalites' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','generalites')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'generalites' ? '700' : '400'};color:${activeTab === 'generalites' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'generalites' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('tab_generalites')}
        </button>
        <button class="eval-tab-btn ${activeTab === 'conformite' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','conformite')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'conformite' ? '700' : '400'};color:${activeTab === 'conformite' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'conformite' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_conf')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${confCount}/${confTotal})</span>` : ''}
        </button>
        <button class="eval-tab-btn ${activeTab === 'performance' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','performance')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'performance' ? '700' : '400'};color:${activeTab === 'performance' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'performance' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_perf')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${perfCount}/${perfTotal})</span>` : ''}
        </button>
        <button class="eval-tab-btn ${activeTab === 'complexite' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','complexite')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'complexite' ? '700' : '400'};color:${activeTab === 'complexite' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'complexite' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            ${t('eval_tab_comp')} ${isValidator ? `<span style="font-size:0.75rem;opacity:0.7;">(${compCount}/${compTotal})</span>` : ''}
        </button>
        ${isValidator ? `<button class="eval-tab-btn ${activeTab === 'reunion_evaluateurs' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','reunion_evaluateurs')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'reunion_evaluateurs' ? '700' : '400'};color:${activeTab === 'reunion_evaluateurs' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'reunion_evaluateurs' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            Consolidation
        </button>` : ''}
        ${(isValidator && ['acceptee', 'cloturee', 'valide'].includes(ev.statut)) ? `<button class="eval-tab-btn ${activeTab === 'reunion_prestataire' ? 'active' : ''}" onclick="switchEvalTab('${evalId}','reunion_prestataire')" style="padding:0.5rem 1.25rem;border:none;background:none;cursor:pointer;font-weight:${activeTab === 'reunion_prestataire' ? '700' : '400'};color:${activeTab === 'reunion_prestataire' ? 'var(--primary)' : 'var(--text-muted)'};border-bottom:2px solid ${activeTab === 'reunion_prestataire' ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;font-size:0.9rem;">
            Réunion prestataire
        </button>` : ''}
    </div>`;

    bodyHtml += '<div id="evalModalBody">';

    // Render content based on active tab
    if (activeTab === 'generalites') {
        const gen = ev.generalites || {};
        const fld = (id, key, labelKey, defaultValue) =>
            `<div class="form-group" style="margin-bottom:0.85rem;">
                <label style="font-weight:600;display:block;margin-bottom:0.25rem;">${t(labelKey)}</label>
                <textarea id="${id}" class="auto-grow eval-gen-field" rows="4" data-key="${key}" ${isReadonly ? 'readonly' : ''}
                    style="width:100%;resize:vertical;min-height:4.5rem;padding:0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text);font-family:inherit;font-size:0.9rem;line-height:1.45;">${gen[key] || defaultValue || ''}</textarea>
            </div>`;

        // Designated evaluators selector — editable only by Validateur/Administrateur.
        // Eligible roles: M1_Contributeur, M1_Validateur, M1_Administrateur
        // Restricted to the eval's domain (or users with no domain restriction).
        // Source : Gestion des Droits du module. Sont éligibles les utilisateurs
        // ayant le module dans leurs accès et un privilège Contributeur,
        // Validateur ou Administrateur couvrant le domaine ET le secteur du
        // prestataire évalué. Les SUPERADMIN du portail sont exclus (côté serveur).
        const evalDom = ev.domaine_id || '';
        const evalSec = ev.secteur_id || '';
        const eligibleUsers = (evalEligibleEvaluators(evalDom, evalSec) || [])
            .filter(u => u.id !== currentUserId);
        const eligibleLoading = evalEligibleEvaluators(evalDom, evalSec) === null;
        const designated = ev.evaluateurs_designes || [];
        const nbMin = (ev.nb_evaluateurs_min !== undefined && ev.nb_evaluateurs_min !== null) ? Number(ev.nb_evaluateurs_min) : 3;
        // Never expose raw user ids in the UI (§ requirement)
        // « NOM Prénom », jamais l'adresse e-mail
        const userName = u => {
            const full = `${(u.nom || '').trim()} ${(u.prenom || '').trim()}`.trim();
            if (full) return full;
            if (u.fullName) return u.fullName;
            if (u.nom_utilisateur) return u.nom_utilisateur;
            if (u.email) return u.email.split('@')[0];
            return '(sans nom)';
        };
        const nbCount = designated.length;
        const countBadge = (() => {
            if (nbMin <= 0) return '';
            const ok = nbCount >= nbMin;
            const color = ok ? '#059669' : '#d97706';
            const txt = ok ? `${nbCount}/${nbMin} évaluateurs désignés ✓` : `${nbCount}/${nbMin} évaluateurs désignés (minimum non atteint)`;
            return `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}55;border-radius:4px;padding:0.1rem 0.5rem;font-size:0.75rem;font-weight:600;margin-left:0.5rem;">${txt}</span>`;
        })();
        let evalSelector = '';
        if (isValidator && !isReadonly) {
            evalSelector = `<div class="form-group" style="margin-bottom:0.6rem;text-align:left;">
                <label style="font-weight:600;display:block;margin-bottom:0.35rem;text-align:left;">Nombre minimal d'évaluateurs requis</label>
                <input type="number" id="evalNbMin" min="0" max="20" value="${nbMin}" style="width:80px;padding:0.35rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text);font-family:inherit;font-size:0.9rem;">
                <span style="color:var(--text-muted);font-size:0.78rem;margin-left:0.5rem;">(0 = pas de minimum imposé)</span>
            </div>
            <div class="form-group" style="margin-bottom:0.85rem;text-align:left;">
                <label style="font-weight:600;display:block;margin-bottom:0.35rem;text-align:left;">Évaluateurs désignés (Performance &amp; Complexité) ${countBadge}</label>
                <ul id="evalDesignesBox" style="list-style:none;margin:0;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:6px;max-height:260px;overflow-y:auto;background:var(--bg-card);text-align:left;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.3rem 0.75rem;">
                    ${eligibleUsers.length ? eligibleUsers.map(u => `
                        <li style="display:flex;flex-wrap:nowrap;justify-content:flex-start;align-items:center;gap:0.5rem;padding:0.15rem 0;margin:0;text-align:left;min-width:0;">
                            <input type="checkbox" class="eval-designe-cb" id="cb_eval_${u.id}" data-uid="${u.id}" ${designated.includes(u.id) ? 'checked' : ''} style="margin:0;flex-shrink:0;width:auto;">
                            <label for="cb_eval_${u.id}" title="${_escapeHtml(u.privilege || '')}" style="display:inline;margin:0;font-size:0.85rem;font-weight:400;cursor:pointer;flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_escapeHtml(userName(u))}</label>
                        </li>`).join('')
                        : `<li style="color:var(--text-muted);font-size:0.85rem;text-align:left;list-style:none;grid-column:1 / -1;">${eligibleLoading ? 'Chargement des évaluateurs éligibles…' : 'Aucun utilisateur éligible : aucun privilège Contributeur, Validateur ou Administrateur ne couvre ce domaine et ce secteur.'}</li>`}
                </ul>
            </div>`;
        } else if (designated.length) {
            const items = designated.map(uid => {
                const u = evalUserById(uid) || { id: uid };
                return `<span style="display:inline-block;background:var(--bg);border-radius:4px;padding:0.15rem 0.5rem;margin:0.15rem;font-size:0.8rem;">${_escapeHtml(userName(u))}</span>`;
            }).join('');
            evalSelector = `<div class="form-group" style="margin-bottom:0.85rem;">
                <label style="font-weight:600;display:block;margin-bottom:0.25rem;">Évaluateurs désignés ${countBadge}</label>
                <div>${items}</div>
            </div>`;
        }

        // Pre-fill "Liste des évaluateurs" with selected evaluator names (one per line, prefixed "- ")
        const designatedDefaultList = designated.map(uid => {
            const u = evalUserById(uid);
            return u ? ' - ' + userName(u) : '';
        }).filter(Boolean).join('\n');

        bodyHtml += `<div style="padding:0.5rem 0.25rem;">
            ${evalSelector}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                ${fld('genIntroduction', 'introduction', 'gen_introduction')}
                ${fld('genSources', 'sources', 'gen_sources')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                ${fld('genEvaluateurs', 'evaluateurs', 'gen_evaluateurs', designatedDefaultList)}
                ${fld('genParties', 'parties', 'gen_parties')}
            </div>
            ${fld('genResume', 'resume', 'gen_resume')}
            ${fld('genActions', 'actions', 'gen_actions')}
            ${fld('genConclusion', 'conclusion', 'gen_conclusion')}
        </div>`;
    } else if (activeTab === 'conformite') {
        const indicators = confInds;
        if (sas.length && indicators.length) {
            sas.forEach((sa, saIdx) => {
                const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
                const saTaux = saRes.tauxConf !== undefined ? (saRes.tauxConf * 100).toFixed(1) + '%' : '-';
                const saIdc = saRes.idc_s || '-';
                const saAccId = `evalSa_conf_${saIdx}`;
                const saConfSum = indicators.reduce((s, ind) => s + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0);
                const saConfMax = indicators.length * 3;
                // Conformité is scored by the validator only — hide aggregate stats for non-validators
                // so designated evaluators don't see partial validator data.
                const _confStats = isValidator
                    ? `Notes: <strong id="evalSaSum_conf_${sa.id}">${saConfSum}</strong>/${saConfMax} | Taux: <span id="evalSaTaux_conf_${sa.id}">${saTaux}</span> | idc: <span id="evalSaIdc_${sa.id}">${saIdc}</span>`
                    : '';
                bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
                    <div class="accordion-header" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                        <span class="chevron">${ICONS.chevron}</span>
                        <span class="acc-title" style="font-weight:700;">${sa.code} - ${sa.nom}</span>
                        <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">${_confStats}</span>
                    </div>
                    <div class="accordion-body" id="acc-body-${saAccId}">`;
                indicators.forEach(ind => {
                    const noteKey = `${sa.id}_${ind.id}`;
                    bodyHtml += renderEvalIndicator(ind, 'notes_conf', noteKey, false);
                });
                bodyHtml += `</div></div>`;
            });
        } else {
            bodyHtml += `<div class="text-center">${t('no_data')}</div>`;
        }
    } else if (activeTab === 'performance') {
        const indicators = perfInds;
        if (indicators.length && sect) {
            // Performance indicators are scoped at the secteur level (not per sous-activité).
            // Source des notes selon le rôle : brouillon de l'évaluateur ou notes publiées.
            const _src = evalNotesSource(ev, 'perf');
            const saAccId = `evalSa_perf_${sect.id}`;
            const saPerfSum = indicators.reduce((s, ind) => s + (_src[ind.id] || 0), 0);
            const saPerfMax = indicators.length * 3;
            let saTauxPerf, saIdp;
            const _ind = D.indices || {};
            if (isDraftMode) {
                const _t = saPerfMax > 0 ? (saPerfSum / saPerfMax) : 0;
                saTauxPerf = saPerfSum > 0 ? (_t * 100).toFixed(1) + '%' : '-';
                saIdp = (typeof getIndice3Levels === 'function' && saPerfSum > 0)
                    ? getIndice3Levels(_t, _ind.perf1 || 0.8, _ind.perf2 || 0.5) : '-';
            } else {
                const gRes = ev.resultats?.global || {};
                saTauxPerf = gRes.tauxPerf !== undefined ? (gRes.tauxPerf * 100).toFixed(1) + '%' : '-';
                saIdp = gRes.idp_g || '-';
            }
            bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
                <div class="accordion-header expanded" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                    <span class="chevron expanded">${ICONS.chevron}</span>
                    <span class="acc-title" style="font-weight:700;">${sect.code || ''} - ${sect.nom || ''}</span>
                    <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Notes: <strong id="evalSaSum_perf_${sect.id}">${saPerfSum}</strong>/${saPerfMax} | Taux: <span id="evalSaTaux_perf_${sect.id}">${saTauxPerf}</span> | idp: <span id="evalSaIdp_${sect.id}">${saIdp}</span></span>
                </div>
                <div class="accordion-body expanded" id="acc-body-${saAccId}">`;
            indicators.forEach(ind => {
                bodyHtml += renderEvalIndicator(ind, 'notes_perf', ind.id, false);
            });
            bodyHtml += `</div></div>`;
        } else {
            bodyHtml += `<div class="text-center">${t('no_data')}</div>`;
        }
    } else if (activeTab === 'complexite') {
        sas.forEach((sa, saIdx) => {
            const indicators = (D.indComplex || []).filter(i => i.sous_activite_id === sa.id && i.actif !== false);
            if (!indicators.length) return;
            const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
            // In draft mode (designated non-validator), the bandeau reflects the current
            // evaluator's own draft notes, not the published final notes.
            const _src = evalNotesSource(ev, 'comp');
            const saAccId = `evalSa_comp_${saIdx}`;
            const saCompSum = indicators.reduce((s, ind) => s + (_src[ind.id] || 0), 0);
            const saCompMax = indicators.length * 3;
            let saTaux, saIde;
            if (isDraftMode) {
                const _t = saCompMax > 0 ? (saCompSum / saCompMax) : 0;
                saTaux = saCompSum > 0 ? (_t * 100).toFixed(1) + '%' : '-';
                const _ind = D.indices || {};
                saIde = (typeof getIndice3Levels === 'function' && saCompSum > 0)
                    ? getIndice3Levels(_t, _ind.expo1 || 0.8, _ind.expo2 || 0.5) : '-';
            } else {
                saTaux = saRes.tauxComp !== undefined ? (saRes.tauxComp * 100).toFixed(1) + '%' : '-';
                saIde = saRes.ide_s || '-';
            }
            bodyHtml += `<div class="accordion-item" style="margin-bottom:0.5rem;">
                <div class="accordion-header" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')" style="padding:0.5rem 0.75rem;">
                    <span class="chevron">${ICONS.chevron}</span>
                    <span class="acc-title" style="font-weight:700;">${sa.code} - ${sa.nom}</span>
                    <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Notes: <strong id="evalSaSum_comp_${sa.id}">${saCompSum}</strong>/${saCompMax} | Taux: <span id="evalSaTaux_comp_${sa.id}">${saTaux}</span> | ide: <span id="evalSaIde_${sa.id}">${saIde}</span></span>
                </div>
                <div class="accordion-body" id="acc-body-${saAccId}">`;
            indicators.forEach(ind => {
                bodyHtml += renderEvalIndicator(ind, 'notes_comp', ind.id, true);
            });
            bodyHtml += `</div></div>`;
        });
    } else if (activeTab === 'reunion_evaluateurs') {
        // Phase 3 — §4.2.2.e : placeholder, loader called after slicer rendered
        bodyHtml += `<div id="reunionEvalContent" style="padding:0.5rem 0.25rem;">
            <div style="color:var(--text-muted);font-size:0.85rem;">Chargement des réunions...</div>
        </div>`;
        window._evalPendingLoader = { kind: 'reunion_evaluateurs', evalId };
    } else if (activeTab === 'reunion_prestataire') {
        // Phase 5 — §4.2.2.g : placeholder, loader called after slicer rendered
        bodyHtml += `<div id="reunionPrestContent" style="padding:0.5rem 0.25rem;">
            <div style="color:var(--text-muted);font-size:0.85rem;">Chargement...</div>
        </div>`;
        window._evalPendingLoader = { kind: 'reunion_prestataire', evalId, prestataireId: ev.prestataire_id };
    } else {
        window._evalPendingLoader = null;
    }

    bodyHtml += '</div>';
    return bodyHtml;
}

// Barre d'actions : enregistrement, soumission et décisions du circuit.
function _prEvalPiedHtml(c) {
    const { _escapeHtml } = c;
    const {
        ev, prest, isReadonly, currentUserId, isValidator, isDraftMode,
        allThreeScored, evalId,
    } = c;

    // Smaller buttons in the footer (reduced ~1/4)
    const _bs = 'style="padding:0.28rem 0.85rem;font-size:0.82rem;"';
    let footerHtml = `<button class="btn btn-outline" ${_bs} onclick="closeSlicer()">${t('cancel')}</button>`;
    const canValidate = allThreeScored;
    // Acteur du circuit : privilège Validateur ou Gestionnaire sur le secteur
    const isWorkflowActor = isValidator;
    // Save button — when indicators are editable OR comments are editable (soumis_directeur)
    if (!isReadonly || ev.statut === 'soumis_directeur') {
        const _saveLabel = isDraftMode ? 'Brouillon' : t('save');
        footerHtml += `<button class="btn btn-primary" ${_bs} onclick="saveEvalScores('${evalId}')" title="${isDraftMode ? 'Enregistrer mes notes en brouillon (privées)' : ''}">${ICONS.check} ${_saveLabel}</button>`;
        // Designated non-validator: also offer "Soumettre mes notes" → promotes private draft to published (visible to validator)
        if (isDraftMode && !['valide','cloturee','rejetee','soumis_directeur','acceptee'].includes(ev.statut)) {
            const _myPerfPub = ev.notes_per_evaluator?.perf?.[currentUserId] || {};
            const _myCompPub = ev.notes_per_evaluator?.comp?.[currentUserId] || {};
            const _alreadySubmitted = Object.keys(_myPerfPub).length > 0 || Object.keys(_myCompPub).length > 0;
            if (!_alreadySubmitted) {
                footerHtml += `<button class="btn btn-success" ${_bs} onclick="soumettreMesNotes('${evalId}')" title="Soumettre mes notes au validateur (elles deviendront visibles)">${ICON_SEND} Soumettre mes notes</button>`;
            } else {
                footerHtml += `<span ${_bs} style="padding:0.28rem 0.6rem;color:var(--text-muted);font-size:0.78rem;">✓ Notes déjà soumises</span>`;
            }
        }
    }
    // Workflow buttons (Phase 4 — Chap. 4 §4.2.2.f) — multi-step validation
    if (isWorkflowActor) {
        if (ev.statut === 'brouillon' || ev.statut === 'renvoyee') {
            footerHtml += `<button class="btn btn-primary" ${_bs} onclick="soumettreDirecteur('${evalId}')" ${!canValidate ? 'disabled' : ''}>${ICON_SUBMIT} Soumettre à la Validation</button>`;
        } else if (ev.statut === 'soumis_directeur') {
            footerHtml += `<button class="btn btn-success" ${_bs} onclick="decisionDirecteur('${evalId}','accepter')">${ICONS.check} Accepter</button>`;
            footerHtml += `<button class="btn btn-outline" ${_bs} onclick="decisionDirecteur('${evalId}','renvoyer')">↩ Renvoyer</button>`;
            footerHtml += `<button class="btn btn-danger" ${_bs} onclick="decisionDirecteur('${evalId}','rejeter')">✕ Rejeter</button>`;
        } else if (ev.statut === 'cloturee') {
            footerHtml += `<button class="btn btn-success" ${_bs} onclick="decisionDirecteur('${evalId}','valider')">${ICONS.check} Valider</button>`;
        } else if (ev.statut === 'valide' && prCanReevaluer(ev)) {
            footerHtml += `<button class="btn btn-outline" ${_bs} onclick="reevaluerEval('${evalId}')">↻ Réévaluer</button>`;
        }
    }

    return footerHtml;
}

function openEvalDetail(evalId) {
    const c = _prEvalContexte(evalId);
    if (!c) return;
    APP_STATE.currentEvalId = evalId;
    const bodyHtml = _prEvalCorpsHtml(c);
    const footerHtml = _prEvalPiedHtml(c);
    openSlicer(`${t('eval_indicators')} - ${c.prest?.nom || ''}`, bodyHtml, footerHtml);

    // Une fois le volet rendu, on lance le chargement d'onglet en attente.
    const pending = window._evalPendingLoader;
    if (pending) {
        setTimeout(() => {
            if (pending.kind === 'reunion_evaluateurs') _loadReunionEvalTab(pending.evalId);
            else if (pending.kind === 'reunion_prestataire') _loadReunionPrestTab(pending.evalId, pending.prestataireId);
            window._evalPendingLoader = null;
        }, 0);
    }
}

async function _loadReunionEvalTab(evalId) {
    const target = document.getElementById('reunionEvalContent');
    if (!target) return;
    // Cancellation token: only the LATEST loader writes to the DOM
    const myGen = (window._reunionEvalGen = (window._reunionEvalGen || 0) + 1);
    try {
        const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
        // When eval is locked (cloturee / rejetee / valide), all editing is disabled in this tab
        const isLocked = !!ev && ['valide', 'cloturee', 'rejetee'].includes(ev.statut);
        const rows = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
        const allMeetings = rows || [];
        const today = new Date().toISOString().slice(0, 10);
        const escVal = s => String(s || '').replace(/"/g, '&quot;');
        const escTxt = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        // 1 consolidation per meeting record (no cross-meeting aggregation)
        // Used by the consolidation section header to know if at least 1 meeting exists (for re-submit button)
        const cur = { id: allMeetings.length ? '_multi_' : '', __anyMeeting: allMeetings.length > 0 };

        // ── Active consolidation snapshot (in localStorage) ──
        const snapKey = 'pr_consol_' + evalId;
        let snap = null;
        try { snap = JSON.parse(localStorage.getItem(snapKey) || 'null'); } catch (e) {}
        const currentChanges = snap ? _computeConsolidationChanges(ev, snap) : [];

        // ── Section "Consolidation des évaluations" — round actif uniquement (attaché au prochain compte-rendu) ──
        const consolHtml = `<details open style="border:1px solid var(--border);border-radius:6px;margin-bottom:1rem;background:var(--bg-card);">
            <summary style="cursor:pointer;padding:0.6rem 0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;list-style:none;">
                <strong style="font-size:0.95rem;">Consolidation des évaluations${isLocked ? ' — lecture seule' : ''}</strong>
                ${isLocked
                    ? ''
                    : (snap
                        ? `<span class="badge badge-warning" style="padding:2px 10px;">⚙ Consolidation active — sera attachée au prochain compte-rendu enregistré</span>`
                        : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();startConsolidation('${evalId}')">⚙ Actualiser Évaluation — Consolidation</button>`)}
            </summary>
            <div style="padding:0 0.75rem 0.75rem;">
                ${snap
                    ? (currentChanges.length
                        ? _renderConsolidationTable([], currentChanges, 0)
                        : '<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic;">Aucun changement depuis le démarrage. Allez sur Conformité / Performance / Complexité pour modifier les notes.</div>')
                    : '<div style="color:var(--text-muted);font-size:0.8rem;">Cliquez pour permettre la modification des notes. Une consolidation indépendante est rattachée à chaque compte-rendu de réunion enregistré.</div>'}
            </div>
        </details>`;

        // ── Section "Comptes-rendus de la consolidation" — chaque carte = 1 réunion + sa consolidation + export PDF ──
        const meetingsListHtml = allMeetings.length ? allMeetings.map(m => {
            const nb = Array.isArray(m.participants) ? m.participants.length : 0;
            const mChanges = (m.consolidation_data && Array.isArray(m.consolidation_data.cumulative_changes))
                ? m.consolidation_data.cumulative_changes : [];
            // Bandeau compact : date + compteurs ; le détail (compte-rendu,
            // ordre du jour, consolidation) est replié par défaut.
            return `<details class="cr-item">
                <summary class="cr-summary">
                    <span class="cr-chevron">${ICONS.chevron}</span>
                    <span class="cr-date">${escTxt(m.date || '(sans date)')}</span>
                    <span class="cr-tags">
                        <span class="cr-tag">${nb} participant${nb > 1 ? 's' : ''}</span>
                        ${mChanges.length ? `<span class="cr-tag cr-tag-accent">${mChanges.length} changement${mChanges.length > 1 ? 's' : ''}</span>` : ''}
                    </span>
                    <span class="cr-actions">
                        ${isLocked ? '' : `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();event.preventDefault();reunionEvalEditInline('${evalId}','${m.id}')">Modifier</button>`}
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();exportReunionPdf('${m.id}','${evalId}')">${ICONS.download} Exporter PDF</button>
                    </span>
                </summary>
                <div class="cr-body">
                    ${m.ordre_du_jour ? `<div class="cr-block"><span class="cr-label">Ordre du jour</span><div class="cr-text">${escTxt(m.ordre_du_jour)}</div></div>` : ''}
                    ${Array.isArray(m.participants) && m.participants.length ? `<div class="cr-block"><span class="cr-label">Participants</span><div class="cr-text">${escTxt(m.participants.join(', '))}</div></div>` : ''}
                    <div class="cr-block"><span class="cr-label">Compte rendu</span><div class="cr-text">${m.compte_rendu ? escTxt(m.compte_rendu) : '<em style="color:var(--text-muted);">Aucun compte rendu saisi</em>'}</div></div>
                    ${mChanges.length ? `<div class="cr-block"><span class="cr-label">Consolidation associée</span>${_renderConsolidationTable(mChanges, [], 0)}</div>` : ''}
                </div>
            </details>`;
        }).join('') : '<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">Aucune réunion enregistrée</div>';

        const showResubmit = (cur.__anyMeeting && ev && ev.statut !== 'valide' && ev.statut !== 'rejetee' && !isLocked);
        const formHtml = `<details open style="border:1px solid var(--border);border-radius:6px;margin-bottom:0.75rem;background:var(--bg-card);">
            <summary style="cursor:pointer;padding:0.6rem 0.75rem;font-weight:700;font-size:0.95rem;list-style:none;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <span>Comptes-rendus de la consolidation${allMeetings.length ? ' (' + allMeetings.length + ')' : ''}${isLocked ? ' — lecture seule' : ''}</span>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                    ${isLocked ? '' : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();reunionEvalEditInline('${evalId}','')">+ Nouvelle réunion</button>`}
                    ${showResubmit ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();event.preventDefault();soumettreDirecteur('${evalId}')">${ICON_SUBMIT} Soumettre à la Validation</button>` : ''}
                </div>
            </summary>
            <div id="reunionEvalListInner" style="padding:0 1rem 0.75rem;">
                ${meetingsListHtml}
            </div>
        </details>`;

        // Stale loader guard: only the latest call writes
        if (myGen !== window._reunionEvalGen) return;
        const liveTarget = document.getElementById('reunionEvalContent');
        if (!liveTarget) return;
        // Order requested: Compte-rendu first, then Consolidation des évaluations
        liveTarget.innerHTML = formHtml + consolHtml;
    } catch (e) {
        if (myGen !== window._reunionEvalGen) return;
        const liveTarget = document.getElementById('reunionEvalContent');
        if (liveTarget) liveTarget.innerHTML = `<div style="color:#dc2626;">Erreur : ${e.message}</div>`;
    }
}

// Compute changes between snapshot and current notes (Phase 5 consolidation, §4.2.2.e)
function _computeConsolidationChanges(ev, snap) {
    const D = APP_STATE.data;
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const changes = [];
    sas.forEach(sa => {
        confInds.forEach(ind => {
            const key = `${sa.id}_${ind.id}`;
            const oldN = snap.notes_conf?.[key] || 0;
            const newN = ev.notes_conf?.[key] || 0;
            if (oldN !== newN) changes.push({ sa_code: sa.code, sa_nom: sa.nom, type: 'Conformité', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
        });
    });
    perfInds.forEach(ind => {
        const oldN = snap.notes_perf?.[ind.id] || 0;
        const newN = ev.notes_perf?.[ind.id] || 0;
        if (oldN !== newN) changes.push({ sa_code: '—', sa_nom: '(global)', type: 'Performance', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
    });
    sas.forEach(sa => {
        const compInds = allCompInds.filter(i => i.sous_activite_id === sa.id);
        compInds.forEach(ind => {
            const oldN = snap.notes_comp?.[ind.id] || 0;
            const newN = ev.notes_comp?.[ind.id] || 0;
            if (oldN !== newN) changes.push({ sa_code: sa.code, sa_nom: sa.nom, type: 'Complexité', ind_code: ind.code, ind_label: ind.label, old: oldN, new: newN });
        });
    });
    return changes;
}

function _renderConsolidationTable(cumulative, currentChanges, roundsCount) {
    cumulative = Array.isArray(cumulative) ? cumulative : [];
    currentChanges = Array.isArray(currentChanges) ? currentChanges : [];
    if (!cumulative.length && !currentChanges.length) {
        return '<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic;">Aucun changement de note enregistré. Cliquez sur le bouton pour démarrer une consolidation.</div>';
    }
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Tag the current (in-progress) changes with the next round index
    const nextRound = (roundsCount || 0) + 1;
    const inProgress = currentChanges.map(c => ({ ...c, round: nextRound, in_progress: true }));
    const all = [...cumulative, ...inProgress];
    // Group by SA + type
    const groups = {};
    all.forEach(c => {
        const k = (c.sa_code || '—') + ' :: ' + c.type;
        if (!groups[k]) groups[k] = { sa_code: c.sa_code, sa_nom: c.sa_nom, type: c.type, items: [] };
        groups[k].items.push(c);
    });
    const rowsHtml = Object.values(groups).map(g => {
        const head = `<tr style="background:var(--bg);"><td colspan="5" style="font-weight:700;padding:4px 8px;font-size:0.82rem;">${esc(g.sa_code)} — ${esc(g.sa_nom)} · ${esc(g.type)}</td></tr>`;
        const rows = g.items.map(c => {
            const roundBadge = c.in_progress
                ? `<span style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 5px;font-size:0.7rem;">R${c.round || '?'} en cours</span>`
                : `<span style="background:var(--bg);color:var(--text-muted);border-radius:3px;padding:0 5px;font-size:0.7rem;">R${c.round || '?'}</span>`;
            return `<tr><td style="padding:4px 8px;">${roundBadge}</td>
                 <td style="padding:4px 8px;font-family:monospace;font-size:0.78rem;">${esc(c.ind_code)}</td>
                 <td style="padding:4px 8px;font-size:0.82rem;">${esc(c.ind_label)}</td>
                 <td style="padding:4px 8px;text-align:center;color:var(--text-muted);">${c.old || '-'}</td>
                 <td style="padding:4px 8px;text-align:center;font-weight:700;color:#059669;">${c.new || '-'}</td></tr>`;
        }).join('');
        return head + rows;
    }).join('');
    return `<div style="margin-top:0.5rem;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;border:1px solid var(--border);">
            <thead><tr style="background:var(--bg);">
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">Round</th>
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">Réf.</th>
                <th style="padding:5px 8px;text-align:left;font-size:0.78rem;">Libellé</th>
                <th style="padding:5px 8px;text-align:center;font-size:0.78rem;">Ancienne</th>
                <th style="padding:5px 8px;text-align:center;font-size:0.78rem;">Nouvelle</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <div style="margin-top:0.4rem;font-size:0.75rem;color:var(--text-muted);">
            Total : ${cumulative.length} changement(s) consolidé(s)${inProgress.length ? ` + ${inProgress.length} en cours (round ${nextRound})` : ''}.
            Les changements précédents sont conservés à chaque round.
        </div>
    </div>`;
}

function startConsolidation(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    if (!confirm("Démarrer la consolidation ?\nLes notes des indicateurs (Conformité, Performance, Complexité) deviendront éditables pour permettre les modifications. Le suivi s'arrête à l'enregistrement de la réunion.")) return;
    const snap = {
        notes_conf: { ...(ev.notes_conf || {}) },
        notes_perf: { ...(ev.notes_perf || {}) },
        notes_comp: { ...(ev.notes_comp || {}) },
        started_at: new Date().toISOString()
    };
    try {
        localStorage.setItem('pr_consol_' + evalId, JSON.stringify(snap));
        // Release any previous post-save lock so indicators can be edited during this round
        localStorage.removeItem('pr_consol_locked_' + evalId);
    } catch (e) {}
    // Re-render the slicer so isReadonly is recomputed (indicators become editable)
    openEvalDetail(evalId);
    showToast('Consolidation activée — vous pouvez modifier les notes');
}

// Phase 5 — réunion prestataire : single record, form intégré directement (§4.2.2.g)
async function _loadReunionPrestTab(evalId, prestId) {
    const target = document.getElementById('reunionPrestContent');
    if (!target) return;
    // Cancellation token: only the LATEST loader writes to the DOM
    const myGen = (window._reunionPrestGen = (window._reunionPrestGen || 0) + 1);
    try {
        const rows = await api(`${MODULE_API}/eval-reunions-prest?eval_id=${evalId}`);
        if (myGen !== window._reunionPrestGen) return;
        const cur = (rows && rows[0]) || { eval_id: evalId, prestataire_id: prestId };
        const today = new Date().toISOString().slice(0, 10);
        const escVal = s => String(s || '').replace(/"/g, '&quot;');
        const escTxt = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const evNow = APP_STATE.data.evaluations.find(e => e.id === evalId);
        // Lock all form fields and hide write buttons when eval reached a terminal/locked state
        const isLocked = !!evNow && ['valide', 'cloturee', 'rejetee'].includes(evNow.statut);
        const ro = isLocked ? 'readonly' : '';
        const dis = isLocked ? 'disabled' : '';
        const liveTarget = document.getElementById('reunionPrestContent');
        if (!liveTarget) return;
        liveTarget.innerHTML = `
            <div style="border:1px solid var(--border);border-radius:6px;padding:0.6rem 1rem 0.75rem;background:var(--bg-card);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
                    <span style="font-weight:700;font-size:0.95rem;">Compte-rendu de la réunion prestataire${cur.id ? ' (existant)' : ' (nouveau)'}${isLocked ? ' — lecture seule' : ''}</span>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                        ${isLocked ? '' : `<button class="btn btn-primary" onclick="reunionPrestSaveFromTab('${evalId}','${prestId}')" style="padding:0.28rem 0.85rem;font-size:0.82rem;">${ICONS.check} ${cur.id ? 'Mettre à jour' : 'Enregistrer'}</button>`}
                        ${cur.id ? `<button class="btn btn-outline btn-sm" onclick="exportReunionPrestPdf('${cur.id}','${evalId}')">${ICONS.download} Exporter PDF</button>` : ''}
                        ${(evNow?.statut === 'acceptee') ? `<button class="btn btn-success" onclick="decisionDirecteur('${evalId}','cloturer')" style="padding:0.28rem 0.85rem;font-size:0.82rem;">🔒 Clôturer</button>` : ''}
                    </div>
                </div>
                <input type="hidden" id="rpId" value="${escVal(cur.id || '')}">
                <!-- Row 1: Date 1/5 width -->
                <div class="form-group" style="max-width:20%;min-width:160px;"><label>Date de réunion</label>
                    <input type="date" id="rpDate" value="${escVal(cur.date || today)}" style="width:100%;" ${ro}></div>
                <!-- Row 2: Participants AAC + Participants prestataire (2 columns) -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    <div class="form-group"><label>Participants AAC (un par ligne)</label>
                        <textarea id="rpAac" rows="3" style="width:100%;" ${ro}>${escTxt((cur.participants_aac || []).join('\n'))}</textarea></div>
                    <div class="form-group"><label>Participants prestataire (un par ligne)</label>
                        <textarea id="rpPrest" rows="3" style="width:100%;" ${ro}>${escTxt((cur.participants_prestataire || []).join('\n'))}</textarea></div>
                </div>
                <!-- Row 3: Résumé des échanges (full width) -->
                <div class="form-group"><label>Résumé des échanges</label>
                    <textarea id="rpResume" rows="4" style="width:100%;" ${ro}>${escTxt(cur.resume_echanges || '')}</textarea></div>
                <!-- Row 4: Recommandations (full width) -->
                <div class="form-group"><label>Recommandations</label>
                    <textarea id="rpReco" rows="3" style="width:100%;" ${ro}>${escTxt(cur.recommandations || '')}</textarea></div>
                <!-- Row 5: Signature prestataire + Signature AAC -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    <div class="form-group"><label>Signature prestataire (nom du représentant)</label>
                        <input id="rpSigPrest" value="${escVal(cur.signature_prestataire || '')}" ${ro}></div>
                    <div class="form-group"><label>Signature AAC (nom du représentant)</label>
                        <input id="rpSigAac" value="${escVal(cur.signature_aac || '')}" ${ro}></div>
                </div>
            </div>`;
    } catch (e) {
        if (myGen !== window._reunionPrestGen) return;
        const liveTarget = document.getElementById('reunionPrestContent');
        if (liveTarget) liveTarget.innerHTML = `<div style="color:#dc2626;">Erreur : ${e.message}</div>`;
    }
}

// Switch between inner tabs in eval detail slicer
function switchEvalTab(evalId, tab) {
    // Preserve any unsaved Généralités field values + designated evaluators into local state before re-render
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (ev) {
        if (!ev.generalites || typeof ev.generalites !== 'object') ev.generalites = {};
        document.querySelectorAll('textarea.eval-gen-field').forEach(ta => {
            const key = ta.dataset.key;
            if (key) ev.generalites[key] = ta.value;
        });
        const cbs = document.querySelectorAll('input.eval-designe-cb');
        if (cbs.length) {
            ev.evaluateurs_designes = Array.from(cbs).filter(c => c.checked).map(c => c.dataset.uid);
        }
        const nbMinInput = document.getElementById('evalNbMin');
        if (nbMinInput) {
            const v = parseInt(nbMinInput.value, 10);
            ev.nb_evaluateurs_min = Number.isFinite(v) && v >= 0 ? v : 0;
        }
    }
    window._evalDetailTab = tab;
    openEvalDetail(evalId);
}

// Reveal an inline comment textarea below an indicator (replaces the "Ajouter un commentaire" button)
function _inlineCommentReveal(rowId, slot, key) {
    const el = document.getElementById(rowId);
    if (!el) return;
    el.innerHTML = `<textarea class="eval-indicator-comment" data-slot="${slot}" data-key="${key}" rows="2" placeholder="Commentaire..."
        style="width:100%;padding:0.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.85rem;font-family:inherit;line-height:1.4;min-height:2.8rem;resize:vertical;"></textarea>`;
    const ta = el.querySelector('textarea');
    if (ta) ta.focus();
}

function setScore(evalId, field, key, value, writeMode) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const userId = APP_STATE.user?.id || '';
    let target;
    if (writeMode === 'evaluator_draft') {
        // Per-evaluator PRIVATE draft (Brouillon) — not visible to validator/admin
        if (!ev.notes_per_evaluator_draft || typeof ev.notes_per_evaluator_draft !== 'object') ev.notes_per_evaluator_draft = {};
        const slot = (field === 'notes_perf') ? 'perf' : (field === 'notes_comp' ? 'comp' : null);
        if (!slot) return;
        if (!ev.notes_per_evaluator_draft[slot]) ev.notes_per_evaluator_draft[slot] = {};
        if (!ev.notes_per_evaluator_draft[slot][userId]) ev.notes_per_evaluator_draft[slot][userId] = {};
        target = ev.notes_per_evaluator_draft[slot][userId];
    } else if (writeMode === 'evaluator') {
        // Per-evaluator published slot (Perf/Comp non-validator) — visible to validator
        if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
        const slot = (field === 'notes_perf') ? 'perf' : (field === 'notes_comp' ? 'comp' : null);
        if (!slot) return;
        if (!ev.notes_per_evaluator[slot]) ev.notes_per_evaluator[slot] = {};
        if (!ev.notes_per_evaluator[slot][userId]) ev.notes_per_evaluator[slot][userId] = {};
        target = ev.notes_per_evaluator[slot][userId];
    } else {
        // Final notes (validator picks, or Conformity single-track)
        if (!ev[field]) ev[field] = {};
        target = ev[field];
    }
    const current = target[key] || 0;
    const newValue = (current === value) ? 0 : value;
    if (newValue === 0) delete target[key]; else target[key] = newValue;
    // Update the score buttons visually
    const btnGroup = event.target.parentElement;
    btnGroup.querySelectorAll('.score-btn').forEach(b => { b.className = 'score-btn'; });
    if (newValue !== 0) event.target.className = `score-btn active-${newValue}`;
    // Live update of totals + taux + indices (only meaningful when final notes change)
    refreshEvalTotals(evalId);
}

function refreshEvalTotals(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const indices = D.indices || {};

    // ── Sums ──
    const _srcPerf = evalNotesSource(ev, 'perf');
    const _srcComp = evalNotesSource(ev, 'comp');
    const sumConf = sas.reduce((s, sa) => s + confInds.reduce((s2, ind) => s2 + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0), 0);
    const sumPerf = perfInds.reduce((s, ind) => s + (_srcPerf[ind.id] || 0), 0);
    const sumComp = allCompInds.reduce((s, ind) => s + (_srcComp[ind.id] || 0), 0);
    const confCount = Object.keys(ev.notes_conf || {}).filter(k => ev.notes_conf[k] > 0).length;
    const perfCount = Object.keys(_srcPerf).filter(k => _srcPerf[k] > 0).length;
    const compCount = Object.keys(_srcComp).filter(k => _srcComp[k] > 0).length;

    // ── Taux & indices (live) ──
    const tauxConf = (typeof calculateTauxConfGlobal === 'function')
        ? calculateTauxConfGlobal(ev.notes_conf || {}, confInds, sas)
        : (sumConf / Math.max(1, confInds.length * sas.length * 3));
    const tauxPerf = (typeof calculateTaux === 'function')
        ? calculateTaux(ev.notes_perf || {}, perfInds)
        : (sumPerf / Math.max(1, perfInds.length * 3));
    const tauxComp = (typeof calculateTauxCompGlobal === 'function')
        ? calculateTauxCompGlobal(ev.notes_comp || {}, allCompInds)
        : (sumComp / Math.max(1, allCompInds.length * 3));
    const idcG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5) : '-';
    const idpG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5) : '-';
    const ideG = (typeof getIndice3Levels === 'function') ? getIndice3Levels(tauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5) : '-';
    const fmtPct = v => (v ? (v * 100).toFixed(1) + '%' : '-');

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    // Global bandeaux
    set('evalSumConf', sumConf); set('evalSumPerf', sumPerf); set('evalSumComp', sumComp);
    set('evalCntConf', confCount); set('evalCntPerf', perfCount); set('evalCntComp', compCount);
    set('evalTauxConf', fmtPct(tauxConf)); set('evalTauxPerf', fmtPct(tauxPerf)); set('evalTauxComp', fmtPct(tauxComp));
    set('evalIdcG', idcG || '-'); set('evalIdpG', idpG || '-'); set('evalIdeG', ideG || '-');

    // Per-secteur Performance bandeau (single accordion per eval)
    {
        const _perfSrc = evalNotesSource(ev, 'perf');
        const saPerfSum = perfInds.reduce((s, ind) => s + (_perfSrc[ind.id] || 0), 0);
        const saTauxPerf = (typeof calculateTaux === 'function') ? calculateTaux(_perfSrc, perfInds) : (saPerfSum / Math.max(1, perfInds.length * 3));
        const saIdp = (typeof getIndice3Levels === 'function' && saPerfSum > 0) ? getIndice3Levels(saTauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5) : '-';
        const sectId = ev.secteur_id;
        set(`evalSaSum_perf_${sectId}`, saPerfSum);
        set(`evalSaTaux_perf_${sectId}`, fmtPct(saTauxPerf));
        set(`evalSaIdp_${sectId}`, saIdp || '-');
    }
    // Per-SA bandeaux
    sas.forEach(sa => {
        // Conformity
        const saConfSum = confInds.reduce((s, ind) => s + (ev.notes_conf?.[`${sa.id}_${ind.id}`] || 0), 0);
        const saTauxConf = (typeof calculateTaux === 'function') ? calculateTaux(ev.notes_conf || {}, confInds, sa.id) : (saConfSum / Math.max(1, confInds.length * 3));
        const saIdc = (typeof getIndice3Levels === 'function') ? getIndice3Levels(saTauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5) : '-';
        set(`evalSaSum_conf_${sa.id}`, saConfSum);
        set(`evalSaTaux_conf_${sa.id}`, fmtPct(saTauxConf));
        set(`evalSaIdc_${sa.id}`, saIdc || '-');
        // Complexity — in draft mode, use the current evaluator's draft notes
        const saCompInds = allCompInds.filter(i => i.sous_activite_id === sa.id);
        const _compSrc = evalNotesSource(ev, 'comp');
        const saCompSum = saCompInds.reduce((s, ind) => s + (_compSrc[ind.id] || 0), 0);
        const saTauxComp = (typeof calculateTaux === 'function') ? calculateTaux(_compSrc, saCompInds) : (saCompSum / Math.max(1, saCompInds.length * 3));
        const saIde = (typeof getIndice3Levels === 'function' && saCompSum > 0) ? getIndice3Levels(saTauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5) : '-';
        set(`evalSaSum_comp_${sa.id}`, saCompSum);
        set(`evalSaTaux_comp_${sa.id}`, fmtPct(saTauxComp));
        set(`evalSaIde_${sa.id}`, saIde || '-');
    });
}

async function saveEvalScores(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id);
    const sas = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const indices = D.indices || {};
    const csn = parseInt(sect?.csn || 24);

    const resultats = { global: {}, sousActivites: {} };
    const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);

    // §4.2.2.d — for non-validator designated evaluators, all Perf+Comp indicators must be scored before save.
    // Skip this check during soumis_directeur (form is in comments-only mode at that stage).
    const _isVal = prCanValidate(ev.secteur_id);
    // Brouillon mode: designated non-validator saves their private draft — no completeness requirement.
    // (Validator/Administrateur still goes through its own publication flow elsewhere.)

    // ── Per Sub-Activity calculations ──
    // Performance taux is global (same for all SA)
    const tauxPerf = calculateTaux(ev.notes_perf || {}, perfInds);
    const idp_g_temp = getIndice3Levels(tauxPerf, indices.perf1 || 0.8, indices.perf2 || 0.5);

    let hasIncoherent = false;

    sas.forEach(sa => {
        // 1. IDC_s: conformity index per SA
        const tauxConf = calculateTaux(ev.notes_conf || {}, confInds, sa.id);
        const idc_s = getIndice3Levels(tauxConf, indices.conf1 || 0.8, indices.conf2 || 0.5);

        // Note: IDP is global only, but we use it at SA level for security index
        const idp_s = idp_g_temp;

        // 4. IDE_s: complexity index per SA
        const compInds = (D.indComplex || []).filter(i => i.sous_activite_id === sa.id && i.actif !== false);
        const tauxComp = calculateTaux(ev.notes_comp || {}, compInds);
        const ide_s = getIndice3Levels(tauxComp, indices.expo1 || 0.8, indices.expo2 || 0.5);

        // 6a. IDS_s: security index per SA (lowercase a,b,c,d)
        const ids_s = getSecurityIndex(idc_s, idp_s, false);
        if (ids_s.isIncoherent) hasIncoherent = true;

        // 7a. SA risk index (lowercase): ide_s + ids_s → e.g. "2b"
        const saRisk = getRiskIndex(ide_s, ids_s.val, false);

        // 9. Frequency: based on SA risk index
        const freq = saRisk.freq || 1;

        resultats.sousActivites[sa.id] = {
            idc_s, idp_s: idp_s, ide_s,
            ids_s: ids_s.val,  // lowercase: a,b,c,d or Incohérant
            ids_desc: ids_s.desc,
            risk: saRisk.label,   // e.g. "2b"
            risk_desc: saRisk.risk,
            freq,
            tauxConf, tauxPerf, tauxComp
        };
    });

    // ── Global calculations ──

    // 2. IDC_g: global conformity = sum ALL conf notes / (nb_conf_inds * nb_SA * 3)
    const globalConfTaux = calculateTauxConfGlobal(ev.notes_conf || {}, confInds, sas);
    const idc_g = getIndice3Levels(globalConfTaux, indices.conf1 || 0.8, indices.conf2 || 0.5);

    // 3. IDP_g: global performance
    const idp_g = idp_g_temp;

    // 5. IDE_g: global complexity = sum ALL comp notes / (nb_total_comp_inds * 3)
    const allCompInds = (D.indComplex || []).filter(i => i.actif !== false &&
        sas.some(sa => sa.id === i.sous_activite_id));
    const globalCompTaux = calculateTauxCompGlobal(ev.notes_comp || {}, allCompInds);
    const ide_g = getIndice3Levels(globalCompTaux, indices.expo1 || 0.8, indices.expo2 || 0.5);

    // 6b. IDS_g: global security index (uppercase A,B,C,D)
    const ids_g = getSecurityIndex(idc_g, idp_g, true);
    if (ids_g.isIncoherent) hasIncoherent = true;

    // 7b. Global risk index (uppercase): ide_g + ids_g → e.g. "2B"
    const globalRisk = getRiskIndex(ide_g, ids_g.val, true);

    // 8. Surveillance cycle CSRBO = CSn * csnMod
    const csrbo = Math.round(csn * (globalRisk.csnMod || 1));

    resultats.global = {
        idc_g, idp_g, ide_g,
        ids_g: ids_g.val,     // uppercase: A,B,C,D or Incohérant
        ids_desc: ids_g.desc,
        tauxConf: globalConfTaux,
        tauxPerf,
        tauxComp: globalCompTaux,
        globalRisk: {
            risk: globalRisk.risk,
            label: globalRisk.label,    // e.g. "2B"
            csnMod: globalRisk.csnMod,
            freq: globalRisk.freq,
            intensity: globalRisk.intensity
        },
        csrbo,  // Cycle de surveillance en mois
        csn
    };

    // Capture Généralités fields if the tab is currently rendered
    const generalites = ev.generalites && typeof ev.generalites === 'object' ? { ...ev.generalites } : {};
    document.querySelectorAll('textarea.eval-gen-field').forEach(ta => {
        const key = ta.dataset.key;
        if (key) generalites[key] = ta.value;
    });
    ev.generalites = generalites;

    // Capture designated-evaluators selection if the validator UI is rendered
    const cbs = document.querySelectorAll('input.eval-designe-cb');
    if (cbs.length) {
        ev.evaluateurs_designes = Array.from(cbs).filter(c => c.checked).map(c => c.dataset.uid);
    }
    // Capture minimum-evaluators-required field if the validator UI is rendered
    const nbMinInput = document.getElementById('evalNbMin');
    if (nbMinInput) {
        const v = parseInt(nbMinInput.value, 10);
        ev.nb_evaluateurs_min = Number.isFinite(v) && v >= 0 ? v : 0;
    }

    // Capture per-indicator comments from any open Conformité/Performance/Complexité tab
    if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
    document.querySelectorAll('textarea.eval-indicator-comment').forEach(ta => {
        const slot = ta.dataset.slot;
        const key = ta.dataset.key;
        const val = (ta.value || '').trim();
        if (!ev.commentaires_indicateurs[slot]) ev.commentaires_indicateurs[slot] = {};
        if (val) ev.commentaires_indicateurs[slot][key] = val;
        else delete ev.commentaires_indicateurs[slot][key];
    });

    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT',
            body: JSON.stringify({
                notes_conf: ev.notes_conf, notes_perf: ev.notes_perf,
                notes_comp: ev.notes_comp, resultats, generalites,
                evaluateurs_designes: ev.evaluateurs_designes || [],
                notes_per_evaluator: ev.notes_per_evaluator || {},
                notes_per_evaluator_draft: ev.notes_per_evaluator_draft || {},
                nb_evaluateurs_min: ev.nb_evaluateurs_min !== undefined ? ev.nb_evaluateurs_min : 3,
                commentaires_indicateurs: ev.commentaires_indicateurs || {}
            })
        });
        // Reload data in the background but keep the slicer open. Preserve the
        // current scroll inside the slicer body across the re-render.
        const slicerBody = document.querySelector('.pr-slicer-body');
        const savedScroll = slicerBody ? slicerBody.scrollTop : 0;
        await loadAllData();
        renderPage();
        // Re-open the eval detail (refreshes synthesis/indices) without closing.
        openEvalDetail(evalId);
        const newSlicerBody = document.querySelector('.pr-slicer-body');
        if (newSlicerBody) newSlicerBody.scrollTop = savedScroll;
        showToast(t('draft_saved'));
        if (hasIncoherent) {
            showToast(t('incoherent_msg'), 'error');
        }
    } catch (e) { showToast(e.message, 'error'); }
}

async function validateEval(evalId) {
    if (!confirm(t('confirm_action'))) return;
    await saveEvalScores(evalId);
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut: 'valide', validateur_id: APP_STATE.user.id, date_validation: new Date().toISOString() })
        });
        closeSlicer();
        await loadAllData();
        renderPage();
        showToast(t('validated') + ' !', 'success');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Phase 5 — Réunion avec le prestataire (Chap. 4 §4.2.2.g) ──
async function openReunionPrestForm(evalId, prestId) {
    const D = APP_STATE.data;
    const prest = (D.prestataires || []).find(p => p.id === prestId) || {};
    let existing = [];
    try { existing = await api(`${MODULE_API}/eval-reunions-prest?eval_id=${evalId}`); } catch (e) {}
    const cur = existing[0] || { eval_id: evalId, prestataire_id: prestId };
    const today = new Date().toISOString().slice(0, 10);
    const body = `
        <div class="form-group"><label>Date de réunion</label>
            <input type="date" id="rpDate" value="${cur.date || today}"></div>
        <div class="form-group"><label>Participants AAC (un par ligne)</label>
            <textarea id="rpAac" rows="2" style="width:100%;">${(cur.participants_aac || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Participants prestataire (un par ligne)</label>
            <textarea id="rpPrest" rows="2" style="width:100%;">${(cur.participants_prestataire || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Résumé des échanges</label>
            <textarea id="rpResume" rows="4" style="width:100%;">${cur.resume_echanges || ''}</textarea></div>
        <div class="form-group"><label>Recommandations</label>
            <textarea id="rpReco" rows="3" style="width:100%;">${cur.recommandations || ''}</textarea></div>
        <div class="form-group"><label>Signature AAC (nom du représentant)</label>
            <input id="rpSigAac" value="${cur.signature_aac || ''}"></div>
        <div class="form-group"><label>Signature prestataire (nom du représentant)</label>
            <input id="rpSigPrest" value="${cur.signature_prestataire || ''}"></div>`;
    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="saveReunionPrest('${evalId}','${prestId}','${cur.id || ''}')">${ICONS.check} Enregistrer</button>`;
    showModal(`Réunion avec ${prest.nom || 'prestataire'} (§4.2.2.g)`, body, footer, 'modal-lg');
}

async function saveReunionPrest(evalId, prestId, rid) {
    const data = {
        eval_id: evalId, prestataire_id: prestId,
        date: document.getElementById('rpDate').value,
        participants_aac: document.getElementById('rpAac').value.split('\n').map(s => s.trim()).filter(Boolean),
        participants_prestataire: document.getElementById('rpPrest').value.split('\n').map(s => s.trim()).filter(Boolean),
        resume_echanges: document.getElementById('rpResume').value,
        recommandations: document.getElementById('rpReco').value,
        signature_aac: document.getElementById('rpSigAac').value,
        signature_prestataire: document.getElementById('rpSigPrest').value,
        statut: 'finalise'
    };
    try {
        if (rid) await api(`${MODULE_API}/eval-reunions-prest/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions-prest`, { method: 'POST', body: JSON.stringify(data) });
        closeModal();
        showToast('Réunion prestataire enregistrée');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Phase 3 — Réunions des évaluateurs (Chap. 4 §4.2.2.e) ──
async function openReunionEvaluateursList(evalId) {
    let rows = [];
    try { rows = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`); } catch (e) {}
    const list = rows.length ? rows.map(r => `
        <div style="border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.4rem;">
            <div style="display:flex;justify-content:space-between;font-weight:600;font-size:0.88rem;">
                <span>📅 ${r.date || '(sans date)'}</span>
                <button class="btn btn-outline btn-sm" onclick="openReunionEvaluateursForm('${evalId}','${r.id}')">Modifier</button>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">Participants : ${(r.participants || []).length}</div>
            ${r.compte_rendu ? `<div style="font-size:0.82rem;margin-top:0.3rem;white-space:pre-wrap;">${_genEsc(r.compte_rendu)}</div>` : ''}
        </div>`).join('') : '<div class="text-muted" style="padding:1rem;text-align:center;">Aucune réunion enregistrée</div>';
    const body = `${list}
        <hr style="margin:1rem 0;">
        <button class="btn btn-primary" onclick="openReunionEvaluateursForm('${evalId}','')">+ Nouvelle réunion</button>`;
    const footer = `<button class="btn btn-outline" onclick="closeModal()">Fermer</button>`;
    showModal(`Réunions des évaluateurs (§4.2.2.e)`, body, footer, 'modal-lg');
}

async function openReunionEvaluateursForm(evalId, rid) {
    let cur = { eval_id: evalId };
    if (rid) {
        try {
            const all = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
            cur = all.find(r => r.id === rid) || cur;
        } catch (e) {}
    }
    const today = new Date().toISOString().slice(0, 10);
    const body = `
        <div class="form-group"><label>Date</label><input type="date" id="reDate" value="${cur.date || today}"></div>
        <div class="form-group"><label>Participants (un par ligne)</label>
            <textarea id="reParts" rows="3" style="width:100%;">${(cur.participants || []).join('\n')}</textarea></div>
        <div class="form-group"><label>Ordre du jour</label>
            <textarea id="reOdj" rows="2" style="width:100%;">${cur.ordre_du_jour || ''}</textarea></div>
        <div class="form-group"><label>Compte rendu</label>
            <textarea id="reCr" rows="5" style="width:100%;">${cur.compte_rendu || ''}</textarea></div>`;
    const footer = `
        <button class="btn btn-outline" onclick="openReunionEvaluateursList('${evalId}')">← Retour</button>
        <button class="btn btn-primary" onclick="saveReunionEval('${evalId}','${rid || ''}')">${ICONS.check} Enregistrer</button>`;
    showModal(`Réunion évaluateurs`, body, footer, 'modal-lg');
}

async function saveReunionEval(evalId, rid) {
    const data = {
        eval_id: evalId,
        date: document.getElementById('reDate').value,
        participants: document.getElementById('reParts').value.split('\n').map(s => s.trim()).filter(Boolean),
        ordre_du_jour: document.getElementById('reOdj').value,
        compte_rendu: document.getElementById('reCr').value
    };
    try {
        if (rid) await api(`${MODULE_API}/eval-reunions/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions`, { method: 'POST', body: JSON.stringify(data) });
        closeModal();
        showToast('Réunion enregistrée');
    } catch (e) { showToast(e.message, 'error'); }
}

// In-tab editing for réunion évaluateurs (renders form INLINE in the tab, not in a modal)
async function reunionEvalEditInTab(evalId, rid) {
    const target = document.getElementById('reunionEvalContent');
    if (!target) return;
    let cur = { eval_id: evalId };
    if (rid) {
        try {
            const all = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
            cur = (all || []).find(r => r.id === rid) || cur;
        } catch (e) {}
    }
    const today = new Date().toISOString().slice(0, 10);
    const escVal = s => String(s || '').replace(/"/g, '&quot;');
    const escTxt = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    target.innerHTML = `
        <div style="border:1px solid var(--border);border-radius:6px;padding:0.75rem 1rem;background:var(--bg-card);">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.6rem;">${rid ? 'Modifier la réunion' : 'Nouvelle réunion évaluateurs'}</div>
            <div class="form-group"><label>Date</label><input type="date" id="reDate" value="${escVal(cur.date || today)}"></div>
            <div class="form-group"><label>Participants (un par ligne)</label>
                <textarea id="reParts" rows="3" style="width:100%;">${escTxt((cur.participants || []).join('\n'))}</textarea></div>
            <div class="form-group"><label>Ordre du jour</label>
                <textarea id="reOdj" rows="2" style="width:100%;">${escTxt(cur.ordre_du_jour || '')}</textarea></div>
            <div class="form-group"><label>Compte rendu</label>
                <textarea id="reCr" rows="5" style="width:100%;">${escTxt(cur.compte_rendu || '')}</textarea></div>
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
                <button class="btn btn-outline" onclick="_loadReunionEvalTab('${evalId}')">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="reunionEvalSaveFromTab('${evalId}','${rid || ''}')">${ICONS.check} Enregistrer</button>
            </div>
        </div>`;
}

// Compte-rendu de réunion en PDF. Aucun endpoint serveur ne génère de PDF :
// le document est composé ici puis remis à la fenêtre d'impression du
// navigateur (« Enregistrer au format PDF »), comme le rapport d'évaluation.
async function exportReunionPdf(rid, evalId) {
    try {
        const m = await api(`${MODULE_API}/eval-reunions/${rid}`);
        _printCompteRendu(m, evalId || m.eval_id, 'Compte-rendu de réunion de consolidation');
    } catch (e) { showToast('Export impossible : ' + e.message, 'error'); }
}

async function exportReunionPrestPdf(rid, evalId) {
    try {
        const m = await api(`${MODULE_API}/eval-reunions-prest/${rid}`);
        _printCompteRendu(m, evalId || m.eval_id, 'Compte-rendu de réunion prestataire');
    } catch (e) { showToast('Export impossible : ' + e.message, 'error'); }
}

function _printCompteRendu(m, evalId, titre) {
    if (!m || !m.id) { showToast('Compte-rendu introuvable', 'error'); return; }
    const D = APP_STATE.data;
    const ev = (D.evaluations || []).find(e => e.id === evalId) || {};
    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
    const sect = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id) || {};
    const aac = D.aac || {};
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const txt = s => (String(s == null ? '' : s).trim() ? esc(s).replace(/\n/g, '<br>') : '-');

    const parts = Array.isArray(m.participants) ? m.participants : [];
    const changes = (m.consolidation_data && Array.isArray(m.consolidation_data.cumulative_changes))
        ? m.consolidation_data.cumulative_changes : [];
    const changesHtml = changes.length ? `
      <table class="rep-tbl">
        <thead><tr><th style="width:12%">S.A.</th><th style="width:12%">Réf.</th><th style="width:34%">Libellé</th>
          <th style="width:14%">Axe</th><th style="width:14%">Ancienne</th><th style="width:14%">Nouvelle</th></tr></thead>
        <tbody>${changes.map(c => `<tr>
          <td>${esc(c.sa_code || '-')}</td><td>${esc(c.ind_code || '-')}</td><td>${esc(c.ind_label || '-')}</td>
          <td>${esc(c.type || '-')}</td><td>${esc(c.old || '-')}</td><td>${esc(c.new || '-')}</td></tr>`).join('')}
        </tbody>
      </table>` : '<div class="rep-field">Aucun changement de note rattaché à cette réunion.</div>';

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(titre)} — ${esc(prest.nom || '')}</title>
<style>
  @page { size: A4; margin: 18mm 14mm 16mm; }
  body { font-family: Calibri, Arial, sans-serif; color: #111; font-size: 10.5pt; margin: 0; }
  .rep-runhead { text-align: center; font-size: 10pt; color: #222; padding-bottom: 6px; margin-bottom: 14px; }
  h1 { text-align: center; font-size: 16pt; font-weight: 400; color: #2f5496; margin: 6px 0 22px; }
  h2 { font-size: 12pt; font-weight: 400; color: #2f5496; margin: 18px 0 8px; }
  .rep-meta td { padding: 3px 0; vertical-align: top; font-size: 10.5pt; }
  .rep-meta td:first-child { width: 190px; }
  .rep-field { margin: 2px 0 12px; }
  .rep-list { margin: 4px 0 12px 26px; }
  .rep-tbl { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  .rep-tbl th { border: 1px solid #8ea9db; background: #d9e2f3; text-align: left;
                padding: 4px 7px; font-size: 8.5pt; font-weight: 400; }
  .rep-tbl td { border: 1px solid #8ea9db; padding: 4px 7px; font-size: 8.5pt; vertical-align: top; }
</style></head>
<body>
  <div class="rep-runhead">${esc(aac.nom || "Autorité de l'Aviation Civile")}</div>
  <h1>${esc(titre)}</h1>
  <table class="rep-meta">
    <tr><td>Nom du Prestataire :</td><td>${esc(prest.nom || '-')}</td></tr>
    <tr><td>Secteur :</td><td>${esc(sect.code || '')} ${sect.nom ? '- ' + esc(sect.nom) : ''}</td></tr>
    <tr><td>Date de la réunion :</td><td>${esc(m.date || '-')}</td></tr>
    <tr><td>Référence évaluation :</td><td>eval_${esc(String(ev.id || '').slice(-4))}</td></tr>
  </table>
  <h2>Participants</h2>
  <div class="rep-list">${parts.length ? parts.map(p => '- ' + esc(p)).join('<br>') : '-'}</div>
  <h2>Ordre du jour</h2>
  <div class="rep-field">${txt(m.ordre_du_jour)}</div>
  <h2>Compte rendu</h2>
  <div class="rep-field">${txt(m.compte_rendu)}</div>
  <h2>Consolidation associée</h2>
  ${changesHtml}
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) { showToast('Autorisez les fenêtres surgissantes pour générer le PDF.', 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
}

// Edit a meeting INLINE inside the Consolidation tab (replaces the list area)
async function reunionEvalEditInline(evalId, rid) {
    const inner = document.getElementById('reunionEvalListInner');
    if (!inner) return;
    let cur = { eval_id: evalId };
    if (rid) {
        try {
            const all = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
            cur = (all || []).find(r => r.id === rid) || cur;
        } catch (e) {}
    }
    const today = new Date().toISOString().slice(0, 10);
    const escVal = s => String(s || '').replace(/"/g, '&quot;');
    const escTxt = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    inner.innerHTML = `
        <div style="border:1px solid var(--border);border-radius:6px;padding:0.6rem 0.85rem;background:var(--bg-card);">
            <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.4rem;">${rid ? 'Modifier la réunion' : 'Nouvelle réunion'}</div>
            <input type="hidden" id="reId" value="${escVal(cur.id || '')}">
            <div class="form-group"><label>Date</label>
                <input type="date" id="reDate" value="${escVal(cur.date || today)}"></div>
            <div style="display:grid;grid-template-columns:1fr 4fr;gap:0.75rem;">
                <div class="form-group"><label>Participants (un par ligne)</label>
                    <textarea id="reParts" rows="5" style="width:100%;">${escTxt((cur.participants || []).join('\n'))}</textarea></div>
                <div class="form-group"><label>Compte rendu</label>
                    <textarea id="reCr" rows="5" style="width:100%;">${escTxt(cur.compte_rendu || '')}</textarea></div>
            </div>
            <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                <button class="btn btn-outline" onclick="_loadReunionEvalTab('${evalId}')" style="padding:0.22rem 0.7rem;font-size:0.8rem;">${t('cancel')}</button>
                <button class="btn btn-primary" onclick="reunionEvalSaveFromTab('${evalId}')" style="padding:0.22rem 0.7rem;font-size:0.8rem;">${ICONS.check} Enregistrer</button>
            </div>
        </div>`;
}

async function reunionEvalSaveFromTab(evalId) {
    const rid = document.getElementById('reId')?.value || '';
    const data = {
        eval_id: evalId,
        date: document.getElementById('reDate').value,
        participants: document.getElementById('reParts').value.split('\n').map(s => s.trim()).filter(Boolean),
        compte_rendu: document.getElementById('reCr').value
    };

    // Cumulative consolidation: append in-progress round to existing rounds (no overwrite)
    let existingCumulative = [];
    let roundsCount = 0;
    try {
        const existing = await api(`${MODULE_API}/eval-reunions?eval_id=${evalId}`);
        const cur = (existing && existing[0]) || {};
        if (cur.consolidation_data) {
            existingCumulative = Array.isArray(cur.consolidation_data.cumulative_changes)
                ? cur.consolidation_data.cumulative_changes : [];
            roundsCount = cur.consolidation_data.rounds_count || 0;
        }
    } catch (e) {}

    const snapKey = 'pr_consol_' + evalId;
    const rawSnap = localStorage.getItem(snapKey);
    if (rawSnap) {
        try {
            const snap = JSON.parse(rawSnap);
            const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
            const newChanges = _computeConsolidationChanges(ev, snap);
            const finishedAt = new Date().toISOString();
            const newRound = roundsCount + 1;
            const enriched = newChanges.map(c => ({ ...c, round: newRound, finished_at: finishedAt }));
            data.consolidation_data = {
                cumulative_changes: [...existingCumulative, ...enriched],
                rounds_count: newRound,
                last_finished_at: finishedAt
            };
        } catch (e) { console.error(e); }
    } else if (existingCumulative.length || roundsCount) {
        // No active round but previous data exists → preserve as-is (don't overwrite)
        data.consolidation_data = {
            cumulative_changes: existingCumulative,
            rounds_count: roundsCount
        };
    }

    try {
        if (rid) await api(`${MODULE_API}/eval-reunions/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions`, { method: 'POST', body: JSON.stringify(data) });
        // End consolidation round: notes go back to read-only (any statut)
        localStorage.removeItem(snapKey);
        try { localStorage.setItem('pr_consol_locked_' + evalId, '1'); } catch (e) {}
        // Refresh APP_STATE then re-render the tab inline (no slicer rebuild → no "Chargement..." flash)
        await loadAllData();
        await _loadReunionEvalTab(evalId);
        showToast(rawSnap ? 'Réunion enregistrée — indicateurs verrouillés en lecture seule' : 'Réunion enregistrée');
    } catch (e) { showToast(e.message, 'error'); }
}

async function reunionPrestSaveFromTab(evalId, prestId) {
    const rid = document.getElementById('rpId')?.value || '';
    const data = {
        eval_id: evalId, prestataire_id: prestId,
        date: document.getElementById('rpDate').value,
        participants_aac: document.getElementById('rpAac').value.split('\n').map(s => s.trim()).filter(Boolean),
        participants_prestataire: document.getElementById('rpPrest').value.split('\n').map(s => s.trim()).filter(Boolean),
        resume_echanges: document.getElementById('rpResume').value,
        recommandations: document.getElementById('rpReco').value,
        signature_aac: document.getElementById('rpSigAac').value,
        signature_prestataire: document.getElementById('rpSigPrest').value,
        statut: 'finalise'
    };
    try {
        if (rid) await api(`${MODULE_API}/eval-reunions-prest/${rid}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(`${MODULE_API}/eval-reunions-prest`, { method: 'POST', body: JSON.stringify(data) });
        // Reload the list inline (no slicer re-render, no "Chargement..." stuck)
        await _loadReunionPrestTab(evalId, prestId);
        showToast('Réunion prestataire enregistrée');
    } catch (e) { showToast(e.message, 'error'); }
}

// Cross-module navigation: switch to Module Planification (M2) for a given prestataire
function navigateToPlanFromEval(prestId) {
    if (window.PESSCO && typeof window.PESSCO.openModule === 'function') {
        try { localStorage.setItem('pr_plan_target_prestataire', prestId); } catch(e){}
        window.PESSCO.openModule('planification');
    } else {
        showToast('Module Planification non disponible depuis cet écran. Allez à l\'accueil → Module Planification.', 'info');
    }
}

function _genEsc(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Helper — capture any pending indicator comments from the DOM and persist them BEFORE a workflow
// transition (Soumettre / Accepter / Renvoyer / Rejeter / Cloturer / Valider). This prevents loss
// of comments typed by the user who clicks a workflow button without saving first.
async function _persistPendingComments(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const tas = document.querySelectorAll('textarea.eval-indicator-comment');
    if (!tas.length) return;
    if (!ev.commentaires_indicateurs || typeof ev.commentaires_indicateurs !== 'object') ev.commentaires_indicateurs = {};
    let dirty = false;
    tas.forEach(ta => {
        const slot = ta.dataset.slot;
        const key = ta.dataset.key;
        const val = (ta.value || '').trim();
        if (!ev.commentaires_indicateurs[slot]) ev.commentaires_indicateurs[slot] = {};
        const prev = ev.commentaires_indicateurs[slot][key] || '';
        if (val !== prev) {
            dirty = true;
            if (val) ev.commentaires_indicateurs[slot][key] = val;
            else delete ev.commentaires_indicateurs[slot][key];
        }
    });
    if (!dirty) return;
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT', body: JSON.stringify({ commentaires_indicateurs: ev.commentaires_indicateurs })
        });
    } catch (e) { console.warn('Pending comments save failed:', e); }
}

// Designated non-validator submits their private draft → promote to published
// notes_per_evaluator so the validator/administrator can see and continue the workflow.
async function soumettreMesNotes(evalId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const uid = APP_STATE.user?.id;
    if (!uid) return;
    if (!(ev.evaluateurs_designes || []).includes(uid)) {
        showToast('Vous n\'êtes pas évaluateur désigné pour cette évaluation.', 'error');
        return;
    }
    // Verify completeness on the draft (Perf + Comp for this user)
    const D = APP_STATE.data;
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
    const compInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
    const draftPerf = ev.notes_per_evaluator_draft?.perf?.[uid] || {};
    const draftComp = ev.notes_per_evaluator_draft?.comp?.[uid] || {};
    const perfMissing = perfInds.filter(ind => !(draftPerf[ind.id] > 0));
    const compMissing = compInds.filter(ind => !(draftComp[ind.id] > 0));
    if (perfMissing.length || compMissing.length) {
        showToast(`Impossible de soumettre : ${perfMissing.length} indicateur(s) Performance et ${compMissing.length} indicateur(s) Complexité non notés.`, 'error');
        return;
    }
    if (!confirm('Soumettre vos notes au validateur ? Elles deviendront visibles et ne pourront plus être modifiées.')) return;

    // Promote draft → published for this user, then clear the draft slot
    if (!ev.notes_per_evaluator || typeof ev.notes_per_evaluator !== 'object') ev.notes_per_evaluator = {};
    if (!ev.notes_per_evaluator.perf) ev.notes_per_evaluator.perf = {};
    if (!ev.notes_per_evaluator.comp) ev.notes_per_evaluator.comp = {};
    ev.notes_per_evaluator.perf[uid] = { ...draftPerf };
    ev.notes_per_evaluator.comp[uid] = { ...draftComp };
    if (ev.notes_per_evaluator_draft?.perf) delete ev.notes_per_evaluator_draft.perf[uid];
    if (ev.notes_per_evaluator_draft?.comp) delete ev.notes_per_evaluator_draft.comp[uid];

    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT',
            body: JSON.stringify({
                notes_per_evaluator: ev.notes_per_evaluator || {},
                notes_per_evaluator_draft: ev.notes_per_evaluator_draft || {}
            })
        });
        showToast('Vos notes ont été soumises au validateur.', 'success');
        await loadAllData();
        renderPage();
        openEvalDetail(evalId);
    } catch (e) {
        showToast('Erreur lors de la soumission : ' + (e.message || e), 'error');
    }
}

// ── Phase 4 — Workflow validation directeur (4.2.2.f) ──
async function soumettreDirecteur(evalId) {
    if (!confirm('Soumettre cette évaluation à la validation ?')) return;
    try {
        await _persistPendingComments(evalId);
        await saveEvalScores(evalId);
        await api(`${MODULE_API}/evaluations/${evalId}/soumettre-directeur`, { method: 'POST' });
        await loadAllData(); renderPage();
        showToast('Soumis à la validation');
    } catch (e) { showToast(e.message, 'error'); }
}

async function decisionDirecteur(evalId, decision) {
    // Always capture any pending comments before transitioning workflow
    await _persistPendingComments(evalId);
    const promptByDecision = {
        valider:  'Commentaire de validation (facultatif) :',
        accepter: 'Commentaire d\'acceptation (facultatif) :',
        renvoyer: 'Motif du renvoi (obligatoire) :',
        rejeter:  'Motif du rejet (obligatoire) :',
        cloturer: 'Commentaire de clôture (facultatif) :'
    };
    const successMsg = {
        valider: 'Évaluation validée',
        accepter: 'Évaluation acceptée — onglet Réunion prestataire disponible',
        renvoyer: 'Évaluation renvoyée',
        rejeter: 'Évaluation rejetée',
        cloturer: 'Réunion prestataire clôturée — vous pouvez valider'
    };
    const requiresMotif = (decision === 'renvoyer' || decision === 'rejeter');
    if (requiresMotif && decision === 'rejeter' && !confirm('Rejeter cette évaluation arrête le processus. Confirmer ?')) return;
    if (requiresMotif && decision === 'renvoyer' && !confirm('Renvoyer pour prise en compte des observations ?')) return;
    if (decision === 'cloturer' && !confirm('Clôturer la réunion prestataire ? Cela verrouille tous les onglets en lecture seule jusqu\'à la validation finale.')) return;
    const commentaire = (requiresMotif || decision !== 'accepter') ? (prompt(promptByDecision[decision]) || '') : '';
    if (requiresMotif && !commentaire.trim()) {
        showToast('Motif requis pour ' + decision, 'error'); return;
    }
    try {
        await api(`${MODULE_API}/evaluations/${evalId}/decision-directeur`, {
            method: 'POST', body: JSON.stringify({ decision, commentaire })
        });
        // Keep the slicer open for intermediate states; close on terminal states
        const terminal = (decision === 'valider' || decision === 'rejeter');
        if (terminal) closeSlicer();
        await loadAllData();
        renderPage();
        if (!terminal) openEvalDetail(evalId);
        showToast(successMsg[decision] || 'OK');
    } catch (e) { showToast(e.message, 'error'); }
}

// Update Début/Fin Cycle on a validated evaluation. When Début changes, Fin is
// auto-recalculated as Début + csrbo months (admin/validateur may override Fin manually).
async function updateCycleDate(evalId, kind, value, csrbo) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    if (!prCanValidate(ev.secteur_id)) {
        showToast('Seuls les privilèges Validateur ou Gestionnaire peuvent modifier les dates de cycle.', 'error');
        renderPage();
        return;
    }
    const payload = {};
    if (kind === 'debut') {
        payload.date_debut_cycle = value || null;
        // Auto-recompute Fin = Début + csrbo months
        if (value && csrbo) {
            const dt = new Date(value + 'T00:00:00');
            if (!isNaN(dt.getTime())) {
                dt.setMonth(dt.getMonth() + parseInt(csrbo));
                payload.date_fin_cycle = dt.toISOString().slice(0, 10);
            }
        } else if (!value) {
            payload.date_fin_cycle = null;
        }
    } else if (kind === 'fin') {
        payload.date_fin_cycle = value || null;
    }
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, {
            method: 'PUT', body: JSON.stringify(payload)
        });
        // Reflect locally without full reload to avoid losing scroll
        Object.assign(ev, payload);
        renderPage();
    } catch (e) {
        showToast('Erreur lors de l\'enregistrement des dates : ' + (e.message || e), 'error');
    }
}

// ── Phase 8 — Réévaluation (4.3) ──
async function reevaluerEval(evalId) {
    const motif = prompt('Motif de la réévaluation :', 'Fin de cycle');
    if (!motif) return;
    try {
        const res = await api(`${MODULE_API}/evaluations/${evalId}/reevaluer`, {
            method: 'POST', body: JSON.stringify({ motif })
        });
        closeSlicer(); await loadAllData();
        APP_STATE.currentPage = 'evaluations';
        APP_STATE.currentSub = 'eval_indicateurs';
        renderPage();
        showToast('Nouvelle révision créée en brouillon — l\'évaluation validée reste disponible');
    } catch (e) {
        showToast(e.message === 'privilege_insuffisant'
            ? 'Réévaluation réservée aux privilèges Gestionnaire et Validateur couvrant ce domaine et ce secteur.'
            : (e.message === 'reevaluation_deja_lancee' ? 'Une réévaluation est déjà en cours pour ce prestataire.' : e.message), 'error');
    }
}

async function deleteEval(evalId) {
    const _ev = (APP_STATE.data.evaluations || []).find(e => e.id === evalId);
    if (_ev && !prCanSupprimerEval(_ev)) {
        showToast('Suppression réservée au privilège Gestionnaire couvrant ce domaine et ce secteur.', 'error');
        return;
    }
    if (!confirm(t('confirm_delete'))) return;
    try {
        await api(`${MODULE_API}/evaluations/${evalId}`, { method: 'DELETE' });
        await loadAllData();
        renderPage();
        showToast('OK');
    } catch (e) { showToast(e.message, 'error'); }
}

async function duplicateEval(evalId) {
    const src = (APP_STATE.data.evaluations || []).find(e => e.id === evalId);
    if (!src) { showToast('Évaluation introuvable', 'error'); return; }
    if (!confirm('Dupliquer cette évaluation comme brouillon ?')) return;
    try {
        // Build a new draft from the source — keep notes & generalites, clear validation/results
        const payload = {
            prestataire_id: src.prestataire_id,
            secteur_id: src.secteur_id,
            domaine_id: src.domaine_id || '',
            statut: 'brouillon',
            notes_conf: src.notes_conf || {},
            notes_perf: src.notes_perf || {},
            notes_comp: src.notes_comp || {},
            generalites: src.generalites || {},
            resultats: {},
            validateur_id: '',
            date_validation: ''
        };
        await api(`${MODULE_API}/evaluations`, { method: 'POST', body: JSON.stringify(payload) });
        await loadAllData();
        // Switch the user to "Évaluations en cours" so they see the new draft right away
        APP_STATE.currentPage = 'evaluations';
        APP_STATE.currentSub = 'eval_indicateurs';
        renderPage();
        showToast('Évaluation dupliquée en brouillon');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Evaluation Export/Import ──
async function exportEvalExcel(evalId) {
    try {
        const token = localStorage.getItem('pr_token');
        const res = await fetch(`${MODULE_API}/evaluations/${evalId}/export-excel`, { credentials: 'same-origin', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `evaluation_${evalId}.xlsx`; a.click();
    } catch (e) { showToast(e.message, 'error'); }
}

// Même rapport que « Exporter PDF » de la liste : fenêtre d'impression
function exportEvalPDF(evalId) {
    exportEvalReport(evalId, 'pdf');
}

async function importEvalExcel(event, evalId, type) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const fileB64 = await fileToBase64(file);
        const token = localStorage.getItem('pr_token');
        const res = await fetch(`${MODULE_API}/evaluations/${evalId}/import-excel`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ fileB64, type })
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error === 'evaluation_verrouillee'
                ? "Évaluation verrouillée : import impossible après soumission ou validation."
                : (d.error || 'Import failed'));
        }
        const d = await res.json().catch(() => ({}));
        event.target.value = '';
        closeModal();
        await loadAllData();
        renderPage();
        showToast(`Import : ${d.updated || 0} note(s) reprise(s)`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
}
