/* Module « Plans de Surveillance » — dashboard
   Tableau de bord du module.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════

// ── Indicateurs du tableau de bord ───────────────────────────────
// Deux groupes : où en sont les plans, et ce qu'ils programment. Les
// figures viennent du socle (/shared/js/oasis-kpi.js), communes aux modules.
function _planCartesIndicateurs(stats) {
    const s = stats || {};
    const n = (v) => Number(v || 0);
    const total = n(s.total_plans);
    const valides = n(s.plans_valides);
    const soumis = n(s.plans_soumis);
    const brouillons = n(s.plans_brouillon);
    const rejetes = n(s.plans_rejetes);
    const tauxValidation = total ? Math.round((valides / total) * 100) : 0;

    const actTotal = n(s.total_activites);
    const realisees = n(s.activites_realisees);
    const planifiees = n(s.activites_planifiees);
    const tauxRealisation = actTotal ? Math.round((realisees / actTotal) * 100) : 0;

    return `
    <div class="oasis-kpi-groupes">
        ${oasisKpiGroupe(tp('groupe_plans'), [
            oasisKpiCarte({
                titre: tp('taux_validation'), couleur: '#10b981',
                valeur: total ? `${tauxValidation}%` : '-',
                precision: `${valides} ${tp('sur_court')} ${total} ${tp('plans_minuscule')}`,
                figure: { type: 'jauge', pct: tauxValidation },
            }),
            oasisKpiCarte({
                titre: tp('a_valider'), couleur: '#3b82f6', alerte: !!soumis,
                valeur: soumis, precision: tp('soumis_a_validation'),
                figure: { type: 'etapes',
                    liste: [tp('plans_brouillon'), tp('plans_soumis'), tp('plans_valides')], actif: 1 },
            }),
            oasisKpiCarte({
                titre: tp('plans_brouillon'), couleur: '#f59e0b',
                valeur: brouillons, precision: tp('en_preparation'),
                figure: { type: 'barres', valeurs: [brouillons, soumis, valides, rejetes] },
            }),
        ])}
        ${oasisKpiGroupe(tp('activites_titre'), [
            oasisKpiCarte({
                titre: tp('taux_realisation'), couleur: '#2563eb',
                valeur: actTotal ? `${tauxRealisation}%` : '-',
                precision: `${realisees} ${tp('sur_court')} ${actTotal} ${tp('realisees_minuscule')}`,
                figure: { type: 'jauge', pct: tauxRealisation },
            }),
            oasisKpiCarte({
                titre: tp('a_realiser'), couleur: '#f97316',
                valeur: planifiees, precision: tp('inscrites_aux_plans'),
                figure: { type: 'calendrier', mois: 4 },
            }),
            oasisKpiCarte({
                titre: tp('prestataires'), couleur: '#8b5cf6',
                valeur: n(s.prestataires), precision: tp('couverts_par_plan'),
                figure: { type: 'cloture', pct: total ? tauxValidation : 0 },
            }),
        ])}
    </div>`;
}

function planRenderDashboard() {
    const stats = PLAN_STATE.data.stats || {};
    const plans = PLAN_STATE.data.plans || [];

    // Set default year filter to current year on first load
    if (!PLAN_STATE._dashboardInitialized) {
        PLAN_STATE.filters.annee = String(new Date().getFullYear());
        PLAN_STATE._dashboardInitialized = true;
    }

    // Role-based recent plans (excluding archived)
    const recentPlans = _getRecentPlans(plans).filter(p => p.statut !== 'archive');

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('dashboard')}</h2>
            <p style="color:var(--text-muted)">${tp('module_subtitle')}</p>
        </div>

        ${_planCartesIndicateurs(stats)}

        <div style="margin-top:1rem;">
            ${_renderFilterBar('planRenderPage()', { showYear: true, showYearFirst: true, showPrestataire: true, showSousActivite: true, showTheme: true, showStatut: true, newLineBeforeStatut: true })}
        </div>

        <div class="card" style="margin-top:1rem;">
            <div class="card-header">
                <h3>${tp('recent_plans')}</h3>
            </div>
            <div class="card-body">
                ${recentPlans.length ? `
                <table class="data-table">
                    <thead><tr>
                        <th>${tp('plan_title')}</th><th>${tp('year')}</th><th>${tp('plan_type')}</th>
                        <th>${tp('status')}</th><th>${tp('activities')}</th>
                        <th>${tp('actions')}</th>
                    </tr></thead>
                    <tbody>
                        ${recentPlans.map(p => `<tr>
                            <td><a href="#" onclick="planOpenDetail('${p.id}');return false;">${_esc(p.titre)}</a></td>
                            <td>${p.annee}</td>
                            <td>${_planTypeBadge(p.type)}</td>
                            <td>${_statusBadge(p.statut)}</td>
                            <td>${p.nb_activites || 0}</td>
                            <td>
                                <button class="btn-icon" onclick="planOpenDetail('${p.id}')" title="${tp('eye')}">${PLAN_ICONS.eye}</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`}
            </div>
        </div>
    </div>`;
}

function _getRecentPlans(plans) {
    // Même règle de visibilité que la liste des plans, puis les plus récents
    // par statut utile au privilège détenu.
    const visibles = _applyRoleFilter(_applyPlanFilters(plans));
    const recents = (statut, n) => visibles
        .filter((p) => !statut || p.statut === statut)
        .sort((a, b) => (b.date_validation || b.date_creation || b.createdAt || '')
            .localeCompare(a.date_validation || a.date_creation || a.createdAt || ''))
        .slice(0, n);

    const priv = _meilleurPriv();
    if (_isAdmin() || priv === 'GESTIONNAIRE') return recents('', 10);
    if (PL_VALIDE.includes(priv)) return [...recents('soumis', 5), ...recents('valide', 5), ...recents('brouillon', 5)];
    if (priv === 'CONTRIBUTEUR') return [...recents('valide', 5), ...recents('brouillon', 5)];
    return recents('valide', 5);
}

function _getUserDomaines() {
    const raw = PLAN_STATE.user?.domaines || '[]';
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch { return []; }
}

function _planMatchesDomaine(plan, userDomaines) {
    if (!userDomaines.length) return true;
    if (!plan.domaine_id) return true;
    return userDomaines.includes(plan.domaine_id);
}

function _applyPlanFilters(plans) {
    const F = PLAN_STATE.filters;
    let filtered = [...plans];
    if (F.domaine) filtered = filtered.filter(p => p.domaine_id === F.domaine);
    if (F.secteur) filtered = filtered.filter(p => p.secteur_id === F.secteur);
    if (F.statut) filtered = filtered.filter(p => p.statut === F.statut);
    if (F.annee) filtered = filtered.filter(p => String(p.annee) === String(F.annee));
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(p => (p.titre || '').toLowerCase().includes(s));
    }
    return filtered;
}
