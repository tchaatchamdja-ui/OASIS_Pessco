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
// ── Carte cliquée : la liste qu'elle commande ──
// Chaque carte annonce un décompte ; le clic en montre le détail sous les
// filtres, et un second clic le referme. Le tableau de bord n'affichait
// jusqu'ici qu'une liste figée de « plans récents », sans rapport avec la
// carte que l'on venait de lire.
window.planChoisirCarte = function (cle) {
    PLAN_STATE.carteChoisie = (PLAN_STATE.carteChoisie === cle) ? '' : cle;
    planRenderPage();
};

function _planCartesIndicateurs(stats) {
    const s = stats || {};
    const choisie = PLAN_STATE.carteChoisie || '';
    const clic = (cle) => ({ onClick: `planChoisirCarte('${cle}')`, actif: choisie === cle });
    const n = (v) => Number(v || 0);
    const valides = n(s.plans_valides);
    const soumis = n(s.plans_soumis);
    const brouillons = n(s.plans_brouillon);
    const rejetes = n(s.plans_rejetes);
    const amendes = n(s.plans_en_amendement);
    // Ni les plans rangés à leur terme, ni les versions retirées par une
    // version suivante : les compter au dénominateur faisait baisser le taux à
    // chaque amendement validé — cinq versions d'un même plan, dont quatre
    // retirées, donnaient « 20 % ». Le taux ne regarde que les plans en lice.
    const total = Math.max(0, n(s.total_plans) - n(s.plans_archives) - n(s.plans_remplaces));
    const tauxValidation = total ? Math.round((valides / total) * 100) : 0;

    const planifiees = n(s.activites_planifiees);

    return `
    <div class="oasis-kpi-groupes pl-kpi-ligne">
        ${oasisKpiGroupe(tp('groupe_plans'), [
            oasisKpiCarte({
                titre: tp('taux_validation'), couleur: '#10b981', ...clic('valides'),
                valeur: total ? `${tauxValidation}%` : '-',
                precision: `${valides} ${tp('sur_court')} ${total} ${tp('plans_non_archives')}`,
                figure: { type: 'jauge', pct: tauxValidation },
            }),
            oasisKpiCarte({
                titre: tp('a_valider'), couleur: '#3b82f6', alerte: !!soumis, ...clic('soumis'),
                valeur: soumis, precision: tp('soumis_a_validation'),
                figure: { type: 'etapes',
                    liste: [tp('plans_brouillon'), tp('plans_soumis'), tp('plans_valides')], actif: 1 },
            }),
            oasisKpiCarte({
                titre: tp('carte_amendement'), couleur: '#0891b2', alerte: !!amendes, ...clic('amendement'),
                valeur: amendes, precision: tp('versions_en_circuit'),
                figure: { type: 'barres', valeurs: [valides, amendes] },
            }),
            oasisKpiCarte({
                titre: tp('plans_brouillon'), couleur: '#f59e0b', ...clic('brouillons'),
                valeur: brouillons, precision: tp('en_preparation'),
                figure: { type: 'barres', valeurs: [brouillons, soumis, valides, rejetes] },
            }),
        ])}
        ${oasisKpiGroupe(tp('activites_titre'), [
            oasisKpiCarte({
                titre: tp('a_realiser'), couleur: '#f97316', ...clic('activites'),
                valeur: planifiees, precision: tp('inscrites_aux_plans'),
                figure: { type: 'calendrier', mois: 4 },
            }),
            oasisKpiCarte({
                titre: tp('prestataires'), couleur: '#8b5cf6', ...clic('prestataires'),
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
        // L'écran ne s'ouvre pas sur des cartes seules : les organismes
        // couverts par un plan en vigueur sont montrés d'emblée. Un clic sur
        // une autre carte prend la place, un clic sur celle-ci la referme.
        PLAN_STATE.carteChoisie = 'prestataires';
        PLAN_STATE._dashboardInitialized = true;
    }

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('dashboard')}</h2>
        </div>

        ${_planCartesIndicateurs(stats)}

        <div style="margin-top:1rem;">
            ${_renderFilterBar('planRenderPage()', { showYear: true, showPrestataire: true, showSousActivite: true, showTheme: true, showStatut: true, deuxLignes: true })}
        </div>

        ${_planListeDeLaCarte(plans)}

        ${_planCalendrierHtml(_planActivitesDuBord(), { voirDetail: true, compact: true })}
    </div>`;
}

// Activités que le tableau de bord regarde : celles qui restent à réaliser
// dans les plans en vigueur, filtres de la barre appliqués. Les cartes, la
// liste et le calendrier partagent ce périmètre.
function _planActivitesDuBord() {
    const plans = PLAN_STATE.data.plans || [];
    // La recherche est laissée au niveau de l'activité, où elle porte sur
    // l'objet — voir `_applyPlanFilters`.
    const enVigueur = _applyRoleFilter(_applyPlanFilters(plans, { sansRecherche: true }))
        .filter(p => PL_STATUTS_EN_VIGUEUR.includes(p.statut));
    return _planActivitesARealiser(enVigueur);
}

// ── Détail de la carte choisie ──
// Les mêmes règles que les compteurs : plans en vigueur, soumis, en cours
// d'amendement ou en préparation ; activités restant à réaliser dans les plans
// en vigueur, et les organismes qu'elles désignent. Les filtres de la barre
// s'y appliquent, comme sur les autres écrans.
function _planListeDeLaCarte(plans) {
    const cle = PLAN_STATE.carteChoisie || '';
    if (!cle) return '';

    const visibles = _applyRoleFilter(_applyPlanFilters(plans));
    const enVigueur = visibles.filter(p => PL_STATUTS_EN_VIGUEUR.includes(p.statut));
    const parents = new Set((plans || [])
        .filter(p => p.parent_plan_id && PL_STATUTS_AMENDEMENT.includes(p.statut))
        .map(p => p.parent_plan_id));

    const titres = {
        valides: tp('plans_valides'), soumis: tp('a_valider'),
        amendement: tp('carte_amendement'), brouillons: tp('plans_brouillon'),
        activites: tp('a_realiser'), prestataires: tp('prestataires'),
    };

    let corps = '';
    if (cle === 'activites') corps = _planTableActivites(_planActivitesDuBord());
    else if (cle === 'prestataires') corps = _planTablePrestataires(_planActivitesDuBord());
    else {
        const listes = {
            valides: enVigueur,
            soumis: visibles.filter(p => p.statut === 'soumis'),
            amendement: enVigueur.filter(p => parents.has(p.id)),
            brouillons: visibles.filter(p => !p.statut || p.statut === 'brouillon'),
        };
        corps = _planTablePlans(listes[cle] || []);
    }

    return `<div class="card" style="margin-top:1rem;">
        <div class="card-header"><h3>${titres[cle] || ''}</h3></div>
        <div class="card-body">${corps}</div>
    </div>`;
}

// Activités restant à réaliser dans les plans retenus, filtres appliqués.
function _planActivitesARealiser(plansRetenus) {
    const F = PLAN_STATE.filters;
    const ids = new Set(plansRetenus.map(p => p.id));
    return (PLAN_STATE.data.allActivites || [])
        .filter(a => ids.has(a.plan_id) && a.statut !== 'realisee')
        .filter(a => (!F.prestataire || a.prestataire_id === F.prestataire)
            && (!F.secteur || a.secteur_id === F.secteur)
            && (!F.sousActivite || a.sous_activite_id === F.sousActivite
                || (a.sous_activite_ids || []).includes(F.sousActivite))
            && (!F.theme || (a.themes_couverts || []).includes(F.theme))
            && (!F.search || (a.objet || a.titre || '').toLowerCase().includes(F.search.toLowerCase())));
}

const _planVide = () => `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`;

function _planTablePlans(liste) {
    if (!liste.length) return _planVide();
    return `<table class="data-table">
        <thead><tr>
            <th>${tp('plan_title')}</th><th>${tp('year')}</th><th>${tp('plan_type')}</th>
            <th>${tp('status')}</th><th>${tp('activities')}</th><th>${tp('actions')}</th>
        </tr></thead>
        <tbody>${liste.map(p => `<tr>
            <td><a href="#" onclick="planOpenDetail('${p.id}');return false;">${_esc(p.titre)}</a></td>
            <td>${p.annee || ''}</td>
            <td>${_planTypeBadge(p.type)}</td>
            <td>${_statusBadge(p.statut)}</td>
            <td>${p.nb_activites || 0}</td>
            <td><button class="btn-icon" onclick="planOpenDetail('${p.id}')" title="${tp('details')}" aria-label="${tp('details')}">${PLAN_ICONS.eye}</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function _planTableActivites(liste) {
    if (!liste.length) return _planVide();
    const nom = (coll, id) => (PLAN_STATE.data[coll] || []).find(x => x.id === id) || {};
    return `<table class="data-table">
        <thead><tr>
            <th>${tp('objet')}</th><th>${tp('provider')}</th><th>${tp('sector')}</th>
            <th>${tp('period_start')}</th><th>${tp('period_end')}</th><th>${tp('plan_title')}</th>
        </tr></thead>
        <tbody>${liste.map(a => `<tr>
            <td>${_esc(a.objet || a.titre || '')}</td>
            <td>${_esc(nom('prestataires', a.prestataire_id).nom || '')}</td>
            <td>${_esc(nom('secteurs', a.secteur_id).code || '')}</td>
            <td>${a.date_debut || ''}</td>
            <td>${a.date_fin || ''}</td>
            <td><a href="#" onclick="planOpenDetail('${a.plan_id}');return false;">${_esc(nom('plans', a.plan_id).titre || '')}</a></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function _planTablePrestataires(activites) {
    const parPrestataire = new Map();
    activites.forEach(a => {
        if (!a.prestataire_id) return;
        const e = parPrestataire.get(a.prestataire_id) || { nb: 0, plans: new Set() };
        e.nb += 1;
        e.plans.add(a.plan_id);
        parPrestataire.set(a.prestataire_id, e);
    });
    if (!parPrestataire.size) return _planVide();
    const prestataires = PLAN_STATE.data.prestataires || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    return `<table class="data-table">
        <thead><tr>
            <th>${tp('provider')}</th><th>${tp('sector')}</th>
            <th>${tp('activities')}</th><th>${tp('plans_minuscule')}</th>
        </tr></thead>
        <tbody>${[...parPrestataire.entries()].map(([id, e]) => {
            const p = prestataires.find(x => x.id === id) || {};
            const s = secteurs.find(x => x.id === p.secteur_id) || {};
            return `<tr>
                <td>${_esc(p.nom || '')}</td>
                <td>${_esc(s.code || '')}</td>
                <td>${e.nb}</td>
                <td>${e.plans.size}</td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;
}



// Filtres de la barre appliqués aux plans.
//
// La recherche vise ce que l'écran liste : le titre d'un plan quand on liste
// des plans, l'objet d'une activité quand on liste des activités. L'appliquer
// aux deux reviendrait à exiger que le mot figure aux deux endroits — et à ne
// rien rendre. Les écrans qui partent des plans pour atteindre leurs activités
// la laissent donc de côté ici, et la posent sur l'activité.
function _applyPlanFilters(plans, options) {
    const F = PLAN_STATE.filters;
    let filtered = [...plans];
    if (F.domaine) filtered = filtered.filter(p => p.domaine_id === F.domaine);
    if (F.secteur) filtered = filtered.filter(p => p.secteur_id === F.secteur);
    if (F.statut) filtered = filtered.filter(p => p.statut === F.statut);
    if (F.annee) filtered = filtered.filter(p => String(p.annee) === String(F.annee));
    if (F.search && !(options || {}).sansRecherche) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(p => (p.titre || '').toLowerCase().includes(s));
    }
    return filtered;
}
