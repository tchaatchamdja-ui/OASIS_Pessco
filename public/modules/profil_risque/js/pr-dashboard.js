/* Module « Profils de Risques » — dashboard
   Tableau de bord et statistiques.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════

// ── Niveau de risque d'un profil ─────────────────────────────────
// Il se lit sur la case de la matrice (« 3C »), non sur le libellé : celui-ci
// est enregistré dans la langue du moment, et le test portait sur « Très
// élevé » quand le libellé écrit est « Très Élevé » — tout profil du niveau le
// plus haut était donc compté parmi les « élevés ». Le libellé ne sert plus
// que de recours pour les enregistrements sans case.
const PR_NIVEAU_DE_CASE = {
    '1A': 'very_low',
    '2A': 'low', '1B': 'low',
    '3A': 'moderate', '2B': 'moderate', '1C': 'moderate',
    '3B': 'high', '2C': 'high', '1D': 'high',
    '3C': 'very_high', '2D': 'very_high', '3D': 'very_high',
};

function prNiveauRisque(ev) {
    const g = ((ev || {}).resultats || {}).global || {};
    const parCase = PR_NIVEAU_DE_CASE[String((g.globalRisk || {}).label || '').toUpperCase()];
    if (parCase) return parCase;
    const r = String((g.globalRisk || {}).risk || '');
    if (/tr[eè]s\s*[ée]lev|very\s*high|muito\s*elevad/i.test(r)) return 'very_high';
    if (/[ée]lev|high|elevad/i.test(r)) return 'high';
    if (/mod[ée]r|moderate|moderad/i.test(r)) return 'moderate';
    if (/tr[eè]s\s*faible|very\s*low|muito\s*baix/i.test(r)) return 'very_low';
    if (/faible|low|baix/i.test(r)) return 'low';
    return '';
}

function prCompterRisques(evals) {
    const c = { very_high: 0, high: 0, moderate: 0, low: 0, very_low: 0 };
    (evals || []).forEach((ev) => { const n = prNiveauRisque(ev); if (n) c[n] += 1; });
    return c;
}

// ── Fin du cycle de surveillance d'un profil ─────────────────────
// La date portée par l'évaluation, à défaut le début du cycle — ou la
// validation — augmenté du CSRBO. Le tableau de bord lisait jusqu'ici une
// `date_butoir` du prestataire que rien n'écrit : la carte « Échéances
// Proches » et le bandeau qui la double restaient à zéro quoi qu'il arrive.
function prFinDeCycle(ev) {
    const e = ev || {};
    if (e.date_fin_cycle) {
        const f = new Date(e.date_fin_cycle);
        if (!isNaN(f)) return f;
    }
    const depart = e.date_debut_cycle || e.date_validation;
    const csrbo = Number(((e.resultats || {}).global || {}).csrbo || 0);
    if (!depart || !csrbo) return null;
    const d = new Date(depart);
    if (isNaN(d)) return null;
    d.setMonth(d.getMonth() + csrbo);
    return d;
}

// Profils en vigueur dont le cycle s'achève dans les `mois` à venir.
function prEcheancesProches(evals, mois) {
    const aujourdhui = new Date();
    const limite = new Date();
    limite.setMonth(limite.getMonth() + (mois || 3));
    return (evals || []).filter((ev) => {
        const f = prFinDeCycle(ev);
        return f && f >= aujourdhui && f <= limite;
    });
}

// ── Indicateurs du tableau de bord ───────────────────────────────
// Deux groupes : ce que le parc représente, et ce que les évaluations en
// disent. Les figures viennent du socle (/shared/js/oasis-kpi.js).
function _prCartesIndicateurs(ctx) {
    const c = ctx || {};
    const evals = c.filteredEvals || [];
    const risques = c.riskCounts || {};
    const totalPrest = Number(c.totalPrest || 0);
    const brouillons = Number(c.brouillons || 0);
    const couverture = totalPrest ? Math.round((evals.length / totalPrest) * 100) : 0;
    const eleves = Number(risques.high || 0);
    const tresEleves = Number(risques.very_high || 0);
    const echeances = prEcheancesProches(evals, 3).length;

    // Répartition des niveaux, du plus faible au plus élevé.
    const repartition = [risques.very_low, risques.low, risques.moderate,
        risques.high, risques.very_high].map((v) => Number(v || 0));
    // Position du curseur sur l'échelle : part des profils du niveau montré.
    const part = (n) => (evals.length ? Math.round((n / evals.length) * 100) : 0);

    return `
    <div class="oasis-kpi-groupes pr-kpi-ligne">
        ${oasisKpiGroupe(t('providers'), [
            oasisKpiCarte({
                titre: t('coverage_rate'), couleur: '#2563eb',
                valeur: totalPrest ? `${couverture}%` : '-',
                precision: `${evals.length} ${t('of_short')} ${totalPrest} ${t('evaluated_short')}`,
                figure: { type: 'jauge', pct: couverture },
            }),
            oasisKpiCarte({
                titre: t('due_soon'), couleur: '#dc2626', alerte: !!echeances,
                valeur: echeances, precision: t('due_soon_hint'),
                figure: { type: 'retard', pastille: t('deadline_short'), legende: t('due_date_short') },
            }),
        ])}
        ${oasisKpiGroupe(t('active_profiles'), [
            oasisKpiCarte({
                titre: t('validated'), couleur: '#10b981',
                valeur: evals.length, precision: t('validated_hint'),
                figure: { type: 'cloture', pct: couverture },
            }),
            oasisKpiCarte({
                titre: t('high_risk'), couleur: '#f97316', alerte: !!eleves,
                valeur: eleves, precision: t('high_risk_hint'),
                figure: { type: 'echelle', position: Math.max(10, part(eleves)),
                    min: t('risk_low'), max: t('risk_high') },
            }),
            oasisKpiCarte({
                titre: t('very_high_risk'), couleur: '#dc2626', alerte: !!tresEleves,
                valeur: tresEleves, precision: t('very_high_risk_hint'),
                figure: { type: 'echelle', position: Math.max(10, part(tresEleves)),
                    min: t('risk_low'), max: t('risk_high') },
            }),
            oasisKpiCarte({
                titre: t('draft'), couleur: '#8b5cf6',
                valeur: brouillons, precision: t('draft_hint'),
                figure: { type: 'barres', valeurs: repartition },
            }),
        ])}
    </div>`;
}


function renderDashboard() {
    const D = APP_STATE.data;
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');
    // Get latest per prestataire
    const latestMap = {};
    allValids.forEach(ev => {
        const k = ev.prestataire_id;
        if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
    });
    const validEvals = Object.values(latestMap);

    // Performance Sécurité : A=Élevée, B=Moyen, C=Faible, D=Très Faible, et
    // place de chaque profil dans la matrice complexité (1-3) × sécurité (A-D).
    // Le même décompte servait deux fois, écrit deux fois : filtres posés ou
    // non, c'est désormais le même passage.
    const _agreger = (liste) => {
        const perf = { A: 0, B: 0, C: 0, D: 0 };
        const positions = {};
        (liste || []).forEach(ev => {
            const safety = String(ev.resultats?.global?.ids_g || ev.resultats?.global?.safetyIndex?.val || '').toUpperCase();
            if (perf[safety] !== undefined) perf[safety]++;
            const ide = ev.resultats?.global?.ide_g || 1;
            const compLevel = ide >= 3 ? 3 : ide >= 2 ? 2 : 1;
            const key = `${compLevel}${safety || 'D'}`;
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            if (!positions[key]) positions[key] = [];
            positions[key].push(prest?.trigramme || prest?.nom?.substring(0, 3) || '?');
        });
        return { riskCounts: prCompterRisques(liste), perfSecCounts: perf, matrixPositions: positions };
    };

    let { riskCounts, perfSecCounts, matrixPositions } = _agreger(validEvals);

    // Matrix cell colors (risk gradient)
    const mColors = {
        '1A':'#2A852C',
        '2A':'#B9E884', '1B':'#B9E884',
        '3A':'#F1F50A', '2B':'#F1F50A', '1C':'#F1F50A',
        '3B':'#F5CE0A', '2C':'#F5CE0A', '1D':'#F5CE0A',
        '3C':'#F07562', '3D':'#F07562', '2D':'#F07562'
    };

    let matrixHtml = `<div style="display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,50px);gap:2px;font-size:0.75rem;">
        ${[3,2,1].map(comp => `
            ${['A','B','C','D'].map(sec => {
                const key = `${comp}${sec}`;
                const items = matrixPositions[key] || [];
                return `<div style="background:${mColors[key]};border-radius:6px;display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap;padding:4px;position:relative;">
                    <span style="position:absolute;top:2px;right:4px;font-size:0.6rem;color:#888;">${key}</span>
                    ${items.map(i => `<span style="background:#fff;border-radius:4px;padding:1px 4px;font-size:0.65rem;font-weight:600;">${i}</span>`).join('')}
                </div>`;
            }).join('')}
        `).join('')}
    </div>`;

    // Dashboard filters
    if (!window._dashFilters) window._dashFilters = { domaine: '', secteur: '', prestataire: '' };
    const df = window._dashFilters;

    // Filter dropdown : only show prestataires that have at least one validated evaluation
    const evaluatedPrestIds = new Set(allValids.map(e => e.prestataire_id));
    const dashPrestList = (D.prestataires || []).filter(p => p.actif !== false && p.actif !== 0 && evaluatedPrestIds.has(p.id));

    // Un prestataire relève d'un domaine et d'un secteur : les filtres du
    // tableau de bord le retiennent ou l'écartent, lui comme ses profils.
    const _prestPasse = (p) => {
        const sect = (D.secteurs || []).find(s => s.id === p.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (df.domaine && (dom?.id || p.domaine_id) !== df.domaine) return false;
        if (df.secteur && p.secteur_id !== df.secteur) return false;
        if (df.prestataire && p.id !== df.prestataire) return false;
        return true;
    };
    // Parc de référence du taux de couverture : les prestataires actifs que les
    // filtres retiennent. Le dénominateur restait celui du parc entier, si bien
    // qu'un filtre sur un seul organisme évalué affichait « 1 sur 4 — 25 % ».
    const totalPrest = (D.prestataires || [])
        .filter(p => p.actif !== false && p.actif !== 0 && _prestPasse(p)).length;

    // Filter validEvals by dashboard filters
    let filteredEvals = validEvals;
    let brouillons = (D.evaluations || []).filter(e => e.statut === 'brouillon');
    if (df.domaine || df.secteur || df.prestataire) {
        const _passes = (ev) => {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
            const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
            if (df.domaine && dom?.id !== df.domaine) return false;
            if (df.secteur && sect?.id !== df.secteur) return false;
            if (df.prestataire && prest?.id !== df.prestataire) return false;
            return true;
        };
        filteredEvals = validEvals.filter(_passes);
        // La carte « Brouillon » comptait les évaluations en préparation de
        // tout le parc, filtres posés ou non : elle seule ne les suivait pas.
        brouillons = brouillons.filter(_passes);
        ({ riskCounts, perfSecCounts, matrixPositions } = _agreger(filteredEvals));
        // Rebuild matrix
        matrixHtml = `<div style="display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,50px);gap:2px;font-size:0.75rem;">
            ${[3,2,1].map(comp => `
                ${['A','B','C','D'].map(sec => {
                    const key = `${comp}${sec}`;
                    const items = matrixPositions[key] || [];
                    return `<div style="background:${mColors[key]};border-radius:6px;display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap;padding:4px;position:relative;">
                        <span style="position:absolute;top:2px;right:4px;font-size:0.6rem;color:#888;">${key}</span>
                        ${items.map(i => `<span style="background:#fff;border-radius:4px;padding:1px 4px;font-size:0.65rem;font-weight:600;">${i}</span>`).join('')}
                    </div>`;
                }).join('')}
            `).join('')}
        </div>`;
    }

    const dashFiltersHtml = `<div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group"><label>${t('domain')}</label>
                <select onchange="window._dashFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${df.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select></div>
            <div class="filter-group"><label>${t('sector')}</label>
                <select onchange="window._dashFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${df.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select></div>
            <div class="filter-group"><label>${t('provider')}</label>
                <select onchange="window._dashFilters.prestataire=this.value;renderPage();">
                    <option value="">${t('all_providers')}</option>
                    ${dashPrestList.map(p => `<option value="${p.id}" ${df.prestataire===p.id?'selected':''}>${escapeHtml(p.nom)}</option>`).join('')}
                </select></div>
            <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._dashFilters={domaine:'',secteur:'',prestataire:''};renderPage();">${ICONS.refresh}</button>
        </div>
    </div>`;

    return `
    <div class="page-header" id="dashPrintStart" style="margin-bottom:1rem;">
        <div><h2 style="margin:0;">${t('dashboard')}</h2></div>
        <button class="btn btn-primary btn-sm" onclick="printPage('dashPrintStart')" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Exporter PDF
        </button>
    </div>
    ${_prCartesIndicateurs({ totalPrest, filteredEvals, riskCounts, brouillons: brouillons.length, D })}
    ${(() => {
        // Prestataires dont le cycle de surveillance s'achève dans les trois
        // mois — la même règle que la carte « Échéances Proches », qu'il double.
        const upcoming = prEcheancesProches(filteredEvals, 3);
        if (!upcoming.length) return '';
        const _esc = oasisEsc;
        const nom = (ev) => _esc((D.prestataires || []).find(p => p.id === ev.prestataire_id)?.nom || '?');
        const fin = (ev) => prFinDeCycle(ev).toISOString().slice(0, 10);
        return `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:0.6rem 0.85rem;margin-bottom:0.75rem;">
            <div style="font-weight:700;color:#92400e;font-size:0.88rem;margin-bottom:0.3rem;">⚠ ${upcoming.length} prestataire(s) à évaluer dans les 3 mois (Chap. 4 §4.2.2.b)</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;font-size:0.8rem;">
                ${upcoming.map(ev => `<span style="background:#fff;border:1px solid #fde68a;border-radius:4px;padding:0.15rem 0.5rem;">${nom(ev)} <span style="color:#92400e;">— ${fin(ev)}</span></span>`).join('')}
            </div>
        </div>`;
    })()}
    ${dashFiltersHtml}
    <div class="charts-grid">
        <div class="chart-card" style="width:100%;max-width:100%;">
            <div class="chart-title">${t('risk_matrix_title')}</div>
            <div style="padding:0.75rem;">${matrixHtml}</div>
        </div>
    </div>
    ${renderStatistiques()}`;
}
