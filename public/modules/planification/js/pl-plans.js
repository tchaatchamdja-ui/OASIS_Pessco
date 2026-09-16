/* Module « Plans de Surveillance » — plans
   Liste des plans, détail, activités, discussions et historique.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PLANS LIST (3 sub-menus)
// ══════════════════════════════════════

function planRenderPlans() {
    // All plans regardless of status, except archived plans which are hidden from this page.
    // Les versions retirées par une version suivante ne figurent pas davantage
    // ici que les plans rangés à leur terme : la lignée les montre.
    let plans = (PLAN_STATE.data.plans || []).filter(p => !['archive', 'remplace'].includes(p.statut));
    plans = _applyPlanFilters(plans);
    plans = _applyRoleFilter(plans);

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('nav_plans')}</h2>
            <div class="page-actions">
                ${_canContribute() ? `<button class="btn btn-primary btn-sm" onclick="planShowCreateModal('planifiees')">
                    ${PLAN_ICONS.add} ${tp('new_plan')}
                </button>` : ''}
            </div>
        </div>

        ${_renderFilterBar('planRenderPage()', { showPrestataire: true, showSousActivite: false, showTheme: false, showStatut: true, showYear: true })}

        <div class="card">
            <div class="card-body" id="plansTableContainer">
                ${_renderPlansByDomaineTypeAccordion(plans)}
            </div>
        </div>
    </div>`;
}

// Sort state for plans table
window._planTableSort = { col: 'annee', dir: 'desc' };
window._planSortBy = function(col) {
    const s = window._planTableSort;
    s.dir = (s.col === col && s.dir === 'asc') ? 'desc' : 'asc';
    s.col = col;
    planRenderPage();
};

// En-tête d'un accordéon : le chevron, l'intitulé, le compteur. C'est un
// bouton pour le clavier comme pour la souris — Entrée ou Espace l'ouvrent —
// et il dit son état aux lecteurs d'écran. `titre` est du HTML déjà échappé.
function _planAccEntete(titre, compte, ouvert) {
    return `<div class="act-acc-header" role="button" tabindex="0" aria-expanded="${ouvert ? 'true' : 'false'}"
                 onclick="planAccBasculer(this)" onkeydown="planAccClavier(event, this)">
                <span class="act-acc-chevron" aria-hidden="true">${PLAN_ICONS.chevron}</span>
                <span class="act-acc-titre">${titre}</span>
                <span class="act-acc-count">${_esc(compte)}</span>
            </div>`;
}

window.planAccBasculer = function (entete) {
    const item = entete.parentElement;
    const ouvert = item.classList.toggle('expanded');
    entete.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
};

window.planAccClavier = function (e, entete) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // Un lien ou un bouton posé dans l'en-tête garde sa touche : Entrée sur
    // « ouvrir le plan » ouvre le plan, elle ne replie pas l'accordéon.
    if (e.target !== entete) return;
    e.preventDefault();
    planAccBasculer(entete);
};

// Group plans by Domaine / Secteur into 2-level accordions.
function _renderPlansByDomaineTypeAccordion(plans) {
    if (!plans.length) return `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`;

    const domaines = PLAN_STATE.data.domaines || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    const domById = new Map(domaines.map(d => [d.id, d]));
    const secById = new Map(secteurs.map(s => [s.id, s]));

    // Build 2-level map: domId → secId → plans[]
    const domMap = new Map();
    plans.forEach(p => {
        const domId = p.domaine_id || '';
        const secId = p.secteur_id || '';
        if (!domMap.has(domId)) domMap.set(domId, new Map());
        const secMap = domMap.get(domId);
        if (!secMap.has(secId)) secMap.set(secId, []);
        secMap.get(secId).push(p);
    });

    // Sort domains by code
    const sortedDoms = Array.from(domMap.entries()).sort(([a], [b]) =>
        (domById.get(a)?.code || 'ZZZ').localeCompare(domById.get(b)?.code || 'ZZZ')
    );

    let html = '<div class="plan-activities-accordion">';
    sortedDoms.forEach(([domId, secMap], domIdx) => {
        const dom = domById.get(domId);
        const domLabel = dom ? `${dom.code} - ${_esc(dom.nom)}` : `<span style="color:var(--text-muted);">-</span>`;
        const domTotal = Array.from(secMap.values()).reduce((s, ps) => s + ps.length, 0);

        // Sort sectors by code
        const sortedSecs = Array.from(secMap.entries()).sort(([a], [b]) =>
            (secById.get(a)?.code || 'ZZZ').localeCompare(secById.get(b)?.code || 'ZZZ')
        );

        let secHtml = '';
        sortedSecs.forEach(([secId, secPlans], secIdx) => {
            const sec = secById.get(secId);
            const secLabel = sec ? `${sec.code} - ${_esc(sec.nom)}` : '-';
            const ouvert = secIdx === 0;
            secHtml += `
            <div class="act-acc-item act-acc-niveau-2${ouvert ? ' expanded' : ''}">
                ${_planAccEntete(secLabel, tp('acc_nb_plans', secPlans.length), ouvert)}
                <div class="act-acc-body">${_renderPlansTable(secPlans)}</div>
            </div>`;
        });

        const ouvert = domIdx === 0;
        html += `
        <div class="act-acc-item act-acc-niveau-1${ouvert ? ' expanded' : ''}">
            ${_planAccEntete(domLabel, tp('acc_nb_plans', domTotal), ouvert)}
            <div class="act-acc-body act-acc-groupes">${secHtml}</div>
        </div>`;
    });
    html += '</div>';
    return html;
}

// Visibilité des plans selon le privilège détenu sur leur secteur :
//   Gestionnaire  tous les plans
//   Validateur    tout son périmètre
//   Contributeur  les plans validés de son périmètre et ceux qu'il a créés
//   Lecteur       les plans validés de son périmètre
function _applyRoleFilter(plans) {
    if (_isAdmin() || _meilleurPriv() === 'GESTIONNAIRE') return plans;
    const moi = PLAN_STATE.user?.id || PLAN_STATE.user?.username || '';
    return plans.filter((p) => {
        const priv = _privOn(p.secteur_id);
        if (!priv || priv === 'AUCUN') return false;
        if (PL_VALIDE.includes(priv)) return true;
        if (priv === 'CONTRIBUTEUR') {
            return p.statut === 'valide' || p.createur_id === moi || p.created_by === moi;
        }
        return p.statut === 'valide';
    });
}

function _renderPlansTable(plans) {
    if (!plans.length) return `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`;
    const s = window._planTableSort;
    const sortedPlans = [...plans].sort((a, b) => {
        let va, vb;
        if (s.col === 'titre') { va = a.titre || ''; vb = b.titre || ''; }
        else if (s.col === 'annee') { va = a.annee || ''; vb = b.annee || ''; }
        else if (s.col === 'type') { va = a.type || ''; vb = b.type || ''; }
        else if (s.col === 'statut') { va = a.statut || ''; vb = b.statut || ''; }
        else if (s.col === 'version') { va = a.version || 0; vb = b.version || 0; }
        else if (s.col === 'nb_activites') { va = a.nb_activites || 0; vb = b.nb_activites || 0; }
        else { va = ''; vb = ''; }
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return s.dir === 'asc' ? cmp : -cmp;
    });
    const _th = (col, label) => {
        const active = s.col === col;
        const arrow = active ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '';
        return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" onclick="_planSortBy('${col}')">${label}${arrow}</th>`;
    };
    // La table défile d'elle-même : l'accordéon qui la porte masque ce qui
    // dépasse, et les colonnes de droite — actions comprises — disparaissaient
    // sans barre pour les atteindre.
    return `
    <div class="plan-table-defile">
    <table class="data-table">
        <thead><tr>
            ${_th('titre', tp('plan_title'))}
            ${_th('annee', tp('year'))}
            ${_th('type', tp('plan_type'))}
            ${_th('statut', tp('status'))}
            ${_th('version', tp('version'))}
            ${_th('nb_activites', tp('activities'))}
            <th>${tp('actions')}</th>
        </tr></thead>
        <tbody>
            ${sortedPlans.map(p => {
                // Plans périodiques : volet des prestataires du secteur et des
                // fréquences de surveillance par thème, sous l'enregistrement.
                const panneau = planPrestThemesPanel(p);
                return `<tr>
                <td><div class="plan-titre-cellule">${panneau ? `<button class="plan-prest-toggle" onclick="planTogglePrestRow('${p.id}',this)" title="${tp('providers_of_sector')}" aria-label="${tp('providers_of_sector')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button>` : '<span class="plan-prest-toggle-spacer"></span>'}<a href="#" onclick="planOpenDetail('${p.id}');return false;">${_esc(p.titre)}</a></div></td>
                <td>${p.annee}</td>
                <td>${_planTypeBadge(p.type)}</td>
                <td>${_statusBadge(p.statut)}</td>
                <td>v${p.version || 1}</td>
                <td>${p.nb_activites || 0}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="planOpenDetail('${p.id}')" title="${tp('details')}">${PLAN_ICONS.eye}</button>
                    ${_canContribute(p.secteur_id) ? `<button class="btn-icon" onclick="planShowEditModal('${p.id}')" title="${tp('edit')}">${PLAN_ICONS.edit}</button>` : ''}
                    ${_canValidate(p.secteur_id) ? `<button class="btn-icon" onclick="planArchivePlan('${p.id}')" title="${tp('archive_plan')}" style="color:var(--text-muted);">${PLAN_ICONS.archive || '🗄'}</button>` : ''}
                    ${_isAdmin() ? `<button class="btn-icon text-danger" onclick="planDeletePlan('${p.id}')" title="${tp('delete')}">${PLAN_ICONS.delete}</button>` : ''}
                </td>
            </tr>${panneau ? `<tr class="plan-prest-row" id="prestRow_${p.id}" hidden><td colspan="7" style="padding:0;">${panneau}</td></tr>` : ''}`;
            }).join('')}
        </tbody>
    </table>
    </div>`;
}

// ══════════════════════════════════════
//  PLAN DETAIL
// ══════════════════════════════════════

async function planOpenDetail(planId) {
    // Le pré-remplissage ne survit qu'à l'ouverture demandée depuis le
    // bandeau d'un prestataire.
    if (PLAN_STATE._keepPrefill) PLAN_STATE._keepPrefill = false;
    else PLAN_STATE.prefillPrestataire = '';
    try {
        const plan = await api(`${PLAN_MODULE_API}/plans/${planId}`);
        PLAN_STATE.selectedPlan = plan;
        PLAN_STATE.currentPage = 'plan-detail';
        // Load workflow to map rejet/validation comments per activity (for red-icon coloring)
        PLAN_STATE.selectedPlanActivityRejet = new Set();
        try {
            const wfs = await api(`${PLAN_MODULE_API}/plans/${planId}/workflow`);
            (wfs || []).forEach(w => {
                if ((w.action === 'rejet' || w.action === 'rejeter') && w.commentaire) {
                    const parsed = _parseActivityCommentsFromText(w.commentaire);
                    parsed.perActivity.forEach(pa => {
                        if (pa.objet) PLAN_STATE.selectedPlanActivityRejet.add(pa.objet.trim());
                    });
                }
            });
        } catch { /* non-fatal */ }
        planUpdateNavUI();
        planRenderPage();
    } catch (e) {
        console.error('Error loading plan:', e);
    }
}

// Fil d'avancement du plan (chevrons) : élaboration → soumission → validation.
const PLAN_STEPS = [
    { key: 'soumission', labelKey: 'step_soumission' },
    { key: 'validation', labelKey: 'step_validation' },
];

// Index de l'étape en cours. 2 : toutes les étapes franchies.
function _planCurrentStep(plan) {
    const st = plan.statut || 'brouillon';
    if (['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'].includes(st)) return 2;
    if (['soumis', 'en_revue'].includes(st)) return 1;
    return 0;
}

function _renderPlanProcessSteps(plan) {
    const cur = _planCurrentStep(plan);
    const rejete = ['rejete', 'rejete_clos'].includes(plan.statut);
    const items = PLAN_STEPS.map((s, i) => {
        let state = 'todo';
        if (!rejete) {
            if (i < cur) state = 'done';
            else if (i === cur) state = 'current';
        }
        const label = tp(s.labelKey);
        const tip = state === 'done' ? `${label} — ${tp('step_done')}`
            : state === 'current' ? `${label} — ${tp('step_current')}`
            : `${label} — ${tp('step_todo')}`;
        return `<span class="eval-step ${state}" title="${label} : ${tip}">${label}</span>`;
    }).join('');
    const flag = rejete
        ? `<span class="eval-step rejected" title="${tp('step_rejected')}">${tp('rejected')}</span>` : '';
    return `<div class="eval-steps plan-steps" role="img" aria-label="${tp('plan_progress')}">${items}${flag}</div>`;
}

// Statut courant du plan et date de passage à ce statut, affichés à gauche
// de son titre. « En Amendement » : plan en vigueur dont une nouvelle version
// est en préparation.
function _planStatutInline(plan, amendementEnCours) {
    const st = plan.statut || 'brouillon';
    const dates = {
        brouillon: plan.createdAt,
        soumis: plan.soumettre_le || plan.date_soumission,
        en_revue: plan.soumettre_le || plan.date_soumission,
        valide: plan.valider_le || plan.date_validation,
        approuve_dg: plan.approuver_dg_le,
        transmis: plan.transmettre_le,
        rejete: plan.rejeter_le,
        archive: plan.archiver_le,
    };
    let label = tp(st) || st;
    let color = _statusColor(st);
    let date = dates[st] || plan.updatedAt || plan.createdAt;
    if (amendementEnCours) {
        const child = (PLAN_STATE.data.plans || []).find(p => p.parent_plan_id === plan.id
            && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut));
        label = tp('status_en_amendement');
        color = _statusColor('amendement');
        date = child?.createdAt || date;
    }
    const jour = date ? String(date).substring(0, 10) : '';
    return `<span class="plan-statut-inline">
        <span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>
        ${jour ? `<span class="plan-statut-date">${jour}</span>` : ''}
    </span>`;
}

function planRenderPlanDetail() {
    const plan = PLAN_STATE.selectedPlan;
    if (!plan) return `<p>${tp('no_data')}</p>`;

    const activites = plan.activites || [];
    const dom = (PLAN_STATE.data.domaines || []).find(d => d.id === plan.domaine_id);
    // Droits appréciés sur le secteur du plan (portées de Gestion des Droits)
    const secteurPlan = plan.secteur_id || '';
    const canEdit = (plan.statut === 'brouillon' || plan.statut === 'rejete') && _canContribute(secteurPlan);
    const canSubmit = canEdit && activites.length > 0;
    // Plans inopinés / ponctuels : Import et Sync disponibles quelque soit le statut
    const isAdHocType = plan.type === 'inopine' || plan.type === 'ponctuel_special';
    const isPonctuelSpecial = plan.type === 'ponctuel_special';
    const canImport = _canContribute(secteurPlan) && (canEdit || isAdHocType) && plan.statut !== 'archive';
    // Sync disabled for "Ponctuel/Spécial" type
    const canSync   = _canContribute(secteurPlan) && plan.statut !== 'archive' && !isPonctuelSpecial;
    const canValidateBtn = plan.statut === 'soumis' && _canValidate(secteurPlan);
    // Un amendement chemine-t-il déjà ? Mêmes statuts que le serveur — dont
    // « rejete », qui reste un amendement ouvert tant qu'il n'est ni repris ni
    // annulé. L'écran manquait celui-là.
    const hasChildAmendment = (PLAN_STATE.data.plans || []).some(p =>
        p.parent_plan_id === plan.id && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut));
    // Amender n'est proposé que s'il n'y a pas déjà une version suivante en
    // chemin : le serveur refuse le second amendement, le bouton ne l'offre pas.
    const canAmendBtn = plan.statut === 'valide' && _canContribute(secteurPlan) && !hasChildAmendment;
    const isAmendmentInProgress = plan.statut === 'valide' && hasChildAmendment;
    // Distinct flag: this plan itself is an amendment child (used for cancel button logic)
    const isAmendmentChild = !!(plan.parent_plan_id);
    const canCancelAmend = isAmendmentChild && (plan.statut === 'brouillon' || plan.statut === 'rejete') && _canContribute(secteurPlan);

    return `
    <div class="page-content">
        <div class="page-header plan-detail-header">
            <div class="plan-header-top">
                <button class="btn btn-primary btn-sm" onclick="planNavigateTo('plans')">${PLAN_ICONS.back} ${tp('back')}</button>
                <div class="plan-title-line">
                    <h2>${_esc(plan.titre)}</h2>
                    <span class="plan-title-sep">|</span><span>${plan.annee}</span>
                    ${dom ? `<span class="plan-title-sep">|</span><span>${dom.code} - ${_esc(dom.nom)}</span>` : ''}
                    <span class="plan-title-sep">|</span><span>v${plan.version || 1}</span>
                    <span class="plan-title-sep">|</span>${_planTypeBadge(plan.type)}
                </div>
                ${_planStatutInline(plan, isAmendmentInProgress)}
            </div>
            <div class="plan-header-bottom">
                ${_renderPlanProcessSteps(plan)}
                <div class="plan-header-actions">
                    <button class="btn btn-outline btn-sm"
                            onclick="${canSync ? `planSyncRisksSelective('${plan.id}')` : 'void(0)'}"
                            ${canSync ? '' : 'disabled title="' + (tp('sync_disabled_for_ponctuel')) + '"'}>
                        ${PLAN_ICONS.sync} ${tp('sync_risks')}
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="planExportPDF('${plan.id}')" title="Exporter PDF">${PLAN_ICONS.pdf} Exporter PDF</button>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:1rem;">
            <div class="card-header card-header-flex">
                <h3>${tp('activities')} (${activites.length})</h3>
                <div class="card-header-actions">
                    ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="planShowActivityModal('${plan.id}')">
                        ${PLAN_ICONS.add} ${tp('new_activity')}
                    </button>` : ''}
                    ${canSubmit ? `<button class="btn btn-primary btn-sm" onclick="planSubmit('${plan.id}')">${PLAN_ICONS.send} ${tp('submit_plan')}</button>` : ''}
                    ${canAmendBtn ? `<button class="btn btn-warning btn-sm" onclick="planAmend('${plan.id}')">${PLAN_ICONS.edit} ${tp('amend_plan')}</button>` : ''}
                    ${canCancelAmend ? `<button class="btn btn-danger btn-sm" onclick="planCancelAmendment('${plan.id}')">${PLAN_ICONS.x} ${tp('cancel_amendment')}</button>` : ''}
                </div>
            </div>
            <div class="card-body">
                ${activites.length ? _renderActivitiesTable(activites, canEdit, plan) : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}<br><small>${tp('import_desc')}</small></p>`}
            </div>
        </div>

        <div class="plan-bottom-split">
            <div class="card">
                <div class="card-header card-header-flex">
                    <h3>${tp('comments_only')}</h3>
                    <button class="btn-icon disc-add" onclick="planShowCommentModal('${plan.id}')" title="${tp('new_comment')}" aria-label="${tp('new_comment')}">${PLAN_ICONS.comment}</button>
                </div>
                <div class="card-body" id="planCommentsContainer">
                    <p class="text-center" style="color:var(--text-muted);padding:1rem;">${tp('loading')}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-header card-header-flex"><h3>${tp('history')}</h3></div>
                <div class="card-body">${_renderPlanHistorique(plan)}</div>
            </div>
        </div>
    </div>`;
}

// Résumé succinct des changements majeurs entre les versions validées du
// plan (chaîne des amendements : chaque version pointe vers la précédente).
function _renderPlanHistorique(plan) {
    const tous = PLAN_STATE.data.plans || [];
    const parId = {};
    tous.forEach(p => { parId[p.id] = p; });

    // Lignée du plan : ascendants, lui-même, puis descendants retenus
    const vus = new Set([plan.id]);
    const ascendants = [];
    let a = plan.parent_plan_id ? parId[plan.parent_plan_id] : null;
    while (a && !vus.has(a.id) && ascendants.length < 50) {
        vus.add(a.id);
        ascendants.unshift(a);
        a = a.parent_plan_id ? parId[a.parent_plan_id] : null;
    }
    const descendants = [];
    let noeud = plan;
    while (descendants.length < 50) {
        const enfants = tous.filter(p => p.parent_plan_id === noeud.id && !vus.has(p.id));
        if (!enfants.length) break;
        const suite = enfants.find(p => ['valide', 'approuve_dg', 'transmis', 'remplace', 'archive'].includes(p.statut)) || enfants[0];
        vus.add(suite.id);
        descendants.push(suite);
        noeud = suite;
    }
    const famille = [...ascendants, plan, ...descendants];

    const VALIDES = ['valide', 'approuve_dg', 'transmis', 'archive', 'remplace'];
    const acts = PLAN_STATE.data.allActivites || [];
    const nbActs = (id) => acts.filter(a => a.plan_id === id).length;
    const versions = famille.filter(p => VALIDES.includes(p.statut))
        .sort((a, b) => (a.version || 1) - (b.version || 1));

    if (!versions.length) {
        return `<p class="text-center" style="padding:1rem;color:var(--text-muted);font-style:italic;">${tp('history_none')}</p>`;
    }

    return `<div class="plan-history">${versions.map((v, i) => {
        const prec = i > 0 ? versions[i - 1] : null;
        const n = nbActs(v.id);
        const date = (v.valider_le || v.date_validation || v.createdAt || '').substring(0, 10);
        const chgs = prec ? _planDiffResume(prec, v) : [];
        if (v.motif_amendement) chgs.unshift(_esc(v.motif_amendement));
        return `<div class="plan-history-item">
            <div class="plan-history-head">
                <span class="plan-history-version">v${v.version || 1}</span>
                <span class="plan-history-date">${date}</span>
                <span class="text-muted plan-history-count">${n} ${tp('activities').toLowerCase()}</span>
                ${v.id === plan.id ? `<span class="plan-history-current">${tp('history_current')}</span>` : ''}
                ${['archive', 'remplace'].includes(v.statut)
                    ? `<span class="plan-history-archived">${tp(v.statut)}</span>` : ''}
            </div>
            <div class="plan-history-body">${chgs.length
                ? `<ul class="plan-history-changes">${chgs.map(c => `<li>${c}</li>`).join('')}</ul>`
                : (i === 0 ? tp('history_initial') : tp('history_no_major'))}</div>
        </div>`;
    }).join('')}</div>`;
}

// Principaux champs modifiés entre deux versions validées : entête du plan
// puis activités ajoutées, retirées ou modifiées (champs cités).
function _planDiffResume(avant, apres) {
    const chgs = [];
    const libelle = {
        titre: tp('plan_title'), annee: tp('year'), type: tp('plan_type'),
        domaine_id: tp('domain'), secteur_id: tp('sector'),
    };
    const nomRef = (champ, val) => {
        if (champ === 'domaine_id') {
            const d = (PLAN_STATE.data.domaines || []).find(x => x.id === val);
            return d ? d.code : (val || '-');
        }
        if (champ === 'secteur_id') {
            const sec = (PLAN_STATE.data.secteurs || []).find(x => x.id === val);
            return sec ? sec.code : (val || '-');
        }
        return val || '-';
    };
    Object.keys(libelle).forEach(champ => {
        if ((avant[champ] || '') !== (apres[champ] || '')) {
            chgs.push(`${libelle[champ]} : ${_esc(nomRef(champ, avant[champ]))} → ${_esc(nomRef(champ, apres[champ]))}`);
        }
    });

    const acts = PLAN_STATE.data.allActivites || [];
    const cle = (a) => (a.objet || a.titre || a.id || '').trim();
    const actsAvant = acts.filter(a => a.plan_id === avant.id);
    const actsApres = acts.filter(a => a.plan_id === apres.id);
    const parCle = (arr) => { const m = {}; arr.forEach(a => { m[cle(a)] = a; }); return m; };
    const mAvant = parCle(actsAvant), mApres = parCle(actsApres);

    const ajoutees = Object.keys(mApres).filter(k => !mAvant[k]);
    const retirees = Object.keys(mAvant).filter(k => !mApres[k]);
    if (ajoutees.length) chgs.push(`${tp('history_added')} : ${ajoutees.map(_esc).join(', ')}`);
    if (retirees.length) chgs.push(`${tp('history_removed')} : ${retirees.map(_esc).join(', ')}`);

    // Champs suivis sur les activités communes
    const champsAct = {
        date_debut: tp('start_date'), date_fin: tp('end_date'),
        responsable_id: tp('responsable_activite'), lieu_activite: tp('lieu_activite'),
        type_supervision_id: tp('type_supervision'), mode_supervision_id: tp('mode_supervision'),
        nombre_inspecteurs: tp('nombre_inspecteurs'), themes_couverts: tp('themes_couverts'),
        sous_activite_ids: tp('sub_activity'), priorite: tp('priority'),
    };
    const norm = (v) => (Array.isArray(v) ? JSON.stringify(v) : String(v == null ? '' : v));
    Object.keys(mApres).filter(k => mAvant[k]).forEach(k => {
        const modifs = Object.keys(champsAct)
            .filter(c => norm(mAvant[k][c]) !== norm(mApres[k][c]))
            .map(c => champsAct[c]);
        if (modifs.length) chgs.push(`${_esc(k)} — ${tp('history_modified')} : ${modifs.join(', ')}`);
    });
    return chgs;
}

function _renderActivitiesTable(activites, canEdit, plan) {
    // Group activities by prestataire
    const grouped = {};
    for (const a of activites) {
        const prest = (PLAN_STATE.data.prestataires || []).find(p => p.id === a.prestataire_id);
        const key = prest ? prest.id : '_none';
        const label = prest ? prest.nom : '-';
        if (!grouped[key]) grouped[key] = { label, acts: [] };
        grouped[key].acts.push(a);
    }

    let html = '<div class="plan-activities-accordion">';
    for (const [key, group] of Object.entries(grouped)) {
        html += `
        <div class="act-acc-item act-acc-niveau-1 expanded">
            ${_planAccEntete(_esc(group.label), tp('acc_nb_activites', group.acts.length), true)}
            <div class="act-acc-body">
                <div style="overflow-x:auto;">
                <table class="data-table plan-act-table">
                    <colgroup>
                        <col style="width:3.5%"><col style="width:16%"><col style="width:12%">
                        <col style="width:10.5%"><col style="width:12%"><col style="width:14%">
                        <col style="width:10.5%"><col style="width:10.5%"><col style="width:11%">
                    </colgroup>
                    <thead><tr>
                        <th>#</th><th>${tp('objet')}</th><th>${tp('sector')}</th>
                        <th>${tp('col_mode_type')}</th>
                        <th>${tp('col_lieu')}</th>
                        <th>${tp('col_responsable')}</th>
                        <th>${tp('start_date')}</th><th>${tp('end_date')}</th>
                        <th>${tp('actions')}</th>
                    </tr></thead>
                    <tbody>
                        ${group.acts.map((a, idx) => {
                            const sect = (PLAN_STATE.data.secteurs || []).find(s => s.id === a.secteur_id);
                            // All sous-activités with their associated themes
                            let saIds = [];
                            try {
                                if (a.sous_activite_ids) {
                                    saIds = typeof a.sous_activite_ids === 'string' ? JSON.parse(a.sous_activite_ids) : a.sous_activite_ids;
                                }
                                if (!saIds.length && a.sous_activite_id) saIds = [a.sous_activite_id];
                            } catch { saIds = []; }
                            const saObjects = saIds.map(sid => (PLAN_STATE.data.sousActivites || []).find(x => x.id === sid)).filter(Boolean);

                            // All themes
                            let themeObjects = [];
                            if (a.themes_couverts) {
                                try {
                                    const tids = typeof a.themes_couverts === 'string' ? JSON.parse(a.themes_couverts) : a.themes_couverts;
                                    themeObjects = tids.map(tid => (PLAN_STATE.data.themesSupervision || []).find(t => t.id === tid)).filter(Boolean);
                                } catch { themeObjects = []; }
                            }
                            const themesStr = themeObjects.map(t => t.libelle).join(', ') || '-';

                            // Build SA/themes table: one column per sous-activité, with its themes listed below
                            // Une seule colonne : chaque sous-activité suivie de ses thèmes
                            let saCell = '-';
                            if (saObjects.length > 0) {
                                saCell = `<div class="act-sa-list act-sa-cols">${saObjects.map(sa => {
                                    const saThemes = themeObjects.filter(t => t.sous_activite_id === sa.id);
                                    return `<div class="act-sa-block">
                                        <div class="act-sa-name">${_esc(sa.code + ' - ' + sa.nom)}</div>
                                        ${saThemes.length
                                            ? `<ul class="sa-theme-list">${saThemes.map(t => `<li>${_esc(t.libelle)}</li>`).join('')}</ul>`
                                            : `<span class="text-muted" style="font-size:0.82rem;">-</span>`}
                                    </div>`;
                                }).join('')}</div>`;
                            }

                            const mode = (PLAN_STATE.data.modesSupervision || []).find(m => m.id === a.mode_supervision_id);
                            const prestRisk = (PLAN_STATE.data.prestataireRisques || []).find(pr => pr.id === a.prestataire_id);
                            let cycleWarn = '';
                            if (prestRisk && prestRisk.debut_cycle && a.date_debut) {
                                if (a.date_debut < prestRisk.debut_cycle || (prestRisk.fin_cycle && a.date_debut > prestRisk.fin_cycle)) {
                                    cycleWarn = ' ⚠️';
                                }
                            }
                            // Detail row data
                            const typeS = (PLAN_STATE.data.typesSupervision || []).find(t => t.id === a.type_supervision_id);
                            const resp = (PLAN_STATE.data.inspecteurs || []).find(i => i.id === a.responsable_id);
                            const modeTypeStr = `${mode ? _esc(mode.mode) : '-'} / ${typeS ? _esc(typeS.type_supervision) : '-'}`;
                            const respStr = resp ? _esc((resp.nom || '') + ' ' + (resp.prenom || '')).trim() : '-';
                            const _actKey = (a.objet || a.titre || '').trim();
                            const hasRejet = !!(PLAN_STATE.selectedPlanActivityRejet && PLAN_STATE.selectedPlanActivityRejet.has(_actKey));
                            return `<tr>
                                <td>${idx + 1}</td>
                                <td>${_esc(a.objet || a.titre)}</td>
                                <td>${sect ? sect.code + ' - ' + _esc(sect.nom) : '-'}</td>
                                <td>${modeTypeStr}</td>
                                <td>${_esc(a.lieu_activite || '-')}</td>
                                <td>${respStr}</td>
                                <td><span class="plan-act-date">${planDateFr(a.date_debut)}</span>${cycleWarn}</td>
                                <td><span class="plan-act-date">${planDateFr(a.date_fin)}</span></td>
                                <td class="actions-cell">
                                    <button class="btn-icon" onclick="this.closest('tr').nextElementSibling.classList.toggle('hidden')" title="${tp('details')}">${PLAN_ICONS.eye}</button>
                                    ${(() => {
                                        // Rouge dès qu'un commentaire de validation existe ;
                                        // le clic ouvre le volet de lecture.
                                        const cv = (a.commentaire_validation || '').trim();
                                        const rouge = !!cv || hasRejet;
                                        return `<button class="btn-icon act-comment-flag${rouge ? ' has-comment' : ''}" onclick="planShowValidationComment('${a.id}')" title="${tp('validation_comment')}">${PLAN_ICONS.comment}</button>`;
                                    })()}
                                    ${(canEdit && Number(a.verrouillee) === 1)
                                        ? `<span class="plan-act-verrou" title="${_esc(tp('activite_verrouillee'))}">${PLAN_ICONS.lock || '🔒'}</span>`
                                        : `${canEdit ? `<button class="btn-icon" onclick="planShowActivityModal('${a.plan_id}','${a.id}')" title="${tp('edit')}">${PLAN_ICONS.edit}</button>` : ''}
                                    ${canEdit ? `<button class="btn-icon text-danger" onclick="planDeleteActivity('${a.id}')" title="${tp('delete')}">${PLAN_ICONS.delete}</button>` : ''}`}
                                </td>
                            </tr>
                            <tr class="hidden activity-detail-row">
                                <td colspan="9" style="max-width:0;">
                                    <div class="activity-detail-grid">
                                        <div class="detail-item"><label>${tp('description_activite')}</label><span>${_esc(a.description_activite || '-')}</span></div>
                                        <div class="detail-item"><label>${tp('nombre_inspecteurs')}</label><span>${a.nombre_inspecteurs || 1}</span></div>
                                        <div class="detail-item full-width"><label>${tp('sub_activity')} / ${tp('themes_couverts')}</label><span>${saCell}</span></div>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        </div>`;
    }
    html += '</div>';
    return html;
}
