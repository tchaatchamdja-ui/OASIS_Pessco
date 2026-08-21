/* Module « Profils de Risques » — dashboard
   Tableau de bord et statistiques.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
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
    const totalPrest = (D.prestataires || []).filter(p => p.actif !== false && p.actif !== 0).length;
    const totalDom = (D.domaines || []).filter(d => d.actif !== false && d.actif !== 0).length;

    let riskCounts = { very_high: 0, high: 0, moderate: 0, low: 0, very_low: 0 };
    // Performance Sécurité counts: A=Élevée, B=Moyen, C=Faible, D=Très Faible
    let perfSecCounts = { A: 0, B: 0, C: 0, D: 0 };
    // Matrix: complexité (1-3) vs sécurité (A-D) positions for each eval
    let matrixPositions = {};
    validEvals.forEach(ev => {
        const r = ev.resultats?.global?.globalRisk?.risk || '';
        if (r.includes('Très élevé') || r.includes('Very High')) riskCounts.very_high++;
        else if (r.includes('Élevé') || r.includes('High')) riskCounts.high++;
        else if (r.includes('Modéré') || r.includes('Moderate')) riskCounts.moderate++;
        else if (r.includes('Très Faible') || r.includes('Very Low')) riskCounts.very_low++;
        else if (r.includes('Faible') || r.includes('Low')) riskCounts.low++;

        const safety = String(ev.resultats?.global?.ids_g || ev.resultats?.global?.safetyIndex?.val || '').toUpperCase();
        if (safety === 'A') perfSecCounts.A++;
        else if (safety === 'B') perfSecCounts.B++;
        else if (safety === 'C') perfSecCounts.C++;
        else if (safety === 'D') perfSecCounts.D++;

        const ide = ev.resultats?.global?.ide_g || 1;
        const compLevel = ide >= 3 ? 3 : ide >= 2 ? 2 : 1;
        const safetyLetter = safety || 'D';
        const key = `${compLevel}${safetyLetter}`;
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        if (!matrixPositions[key]) matrixPositions[key] = [];
        matrixPositions[key].push(prest?.trigramme || prest?.nom?.substring(0, 3) || '?');
    });

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

    // Set of validated evaluations that have been REPLACED by a later re-evaluation
    // (i.e. their id appears as parent_eval_id of any other evaluation, validated or not).
    const replacedIds = new Set(
        (D.evaluations || [])
            .map(e => e.parent_eval_id)
            .filter(pid => pid)
    );

    // Filter validEvals by dashboard filters
    let filteredEvals = validEvals;
    // Total validated evaluations EXCLUDING those that have been replaced — used for the "Validé" card
    let filteredValidAll = allValids.filter(e => !replacedIds.has(e.id));
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
        filteredValidAll = allValids.filter(e => !replacedIds.has(e.id) && _passes(e));
        // Recount risk and perf with filtered evals
        riskCounts = { very_high: 0, high: 0, moderate: 0, low: 0, very_low: 0 };
        perfSecCounts = { A: 0, B: 0, C: 0, D: 0 };
        matrixPositions = {};
        filteredEvals.forEach(ev => {
            const r = ev.resultats?.global?.globalRisk?.risk || '';
            if (r.includes('Très élevé') || r.includes('Very High')) riskCounts.very_high++;
            else if (r.includes('Élevé') || r.includes('High')) riskCounts.high++;
            else if (r.includes('Modéré') || r.includes('Moderate')) riskCounts.moderate++;
            else if (r.includes('Très Faible') || r.includes('Very Low')) riskCounts.very_low++;
            else if (r.includes('Faible') || r.includes('Low')) riskCounts.low++;
            const safety = String(ev.resultats?.global?.ids_g || ev.resultats?.global?.safetyIndex?.val || '').toUpperCase();
            if (safety === 'A') perfSecCounts.A++;
            else if (safety === 'B') perfSecCounts.B++;
            else if (safety === 'C') perfSecCounts.C++;
            else if (safety === 'D') perfSecCounts.D++;
            const ide = ev.resultats?.global?.ide_g || 1;
            const compLevel = ide >= 3 ? 3 : ide >= 2 ? 2 : 1;
            const safetyLetter = safety || 'D';
            const key = `${compLevel}${safetyLetter}`;
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            if (!matrixPositions[key]) matrixPositions[key] = [];
            matrixPositions[key].push(prest?.trigramme || prest?.nom?.substring(0, 3) || '?');
        });
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
                    ${dashPrestList.map(p => `<option value="${p.id}" ${df.prestataire===p.id?'selected':''}>${p.nom}</option>`).join('')}
                </select></div>
            <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._dashFilters={domaine:'',secteur:'',prestataire:''};renderPage();">${ICONS.refresh}</button>
        </div>
    </div>`;

    return `
    <div class="page-header" id="dashPrintStart" style="margin-bottom:1rem;">
        <div><h2 style="margin:0;">${t('dashboard')}</h2><p style="margin:0.2rem 0 0;color:var(--text-muted);font-size:0.88rem;">${t('dashboard_subtitle')}</p></div>
        <button class="btn btn-primary btn-sm" onclick="printPage('dashPrintStart')" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Exporter PDF
        </button>
    </div>
    <div class="stats-grid" style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:0.75rem;">
        <div class="stat-card" style="flex:1;min-width:110px;border-left-color:#f59e0b;"><div class="stat-number" style="color:#f59e0b;">${totalDom}</div><div class="stat-label">${t('domains_sectors')}</div></div>
        <div class="stat-card" style="flex:1;min-width:110px;border-left-color:#3b82f6;"><div class="stat-number" style="color:#3b82f6;">${totalPrest}</div><div class="stat-label">${t('providers')}</div></div>
        <div class="stat-card" style="flex:1;min-width:110px;border-left-color:#8b5cf6;"><div class="stat-number" style="color:#8b5cf6;">${filteredEvals.length}</div><div class="stat-label">${t('active_profiles')}</div></div>
        <div class="stat-card" style="flex:1;min-width:110px;border-left-color:#22c55e;"><div class="stat-number" style="color:#22c55e;">${filteredEvals.length}</div><div class="stat-label">${t('validated')}</div></div>
        <div class="stat-card" style="flex:1;min-width:110px;border-left-color:#ef4444;"><div class="stat-number" style="color:#ef4444;">${(D.evaluations || []).filter(e => e.statut === 'brouillon').length}</div><div class="stat-label">${t('draft')}</div></div>
    </div>
    ${(() => {
        // Phase 1 widget — prestataires arrivant à la date butoir (3 mois)
        const today = new Date(); const limit = new Date(); limit.setMonth(limit.getMonth() + 3);
        const upcoming = (D.prestataires || []).filter(p => {
            if (!p.date_butoir) return false;
            const d = new Date(p.date_butoir);
            return !isNaN(d) && d >= today && d <= limit;
        });
        if (!upcoming.length) return '';
        return `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:0.6rem 0.85rem;margin-bottom:0.75rem;">
            <div style="font-weight:700;color:#92400e;font-size:0.88rem;margin-bottom:0.3rem;">⚠ ${upcoming.length} prestataire(s) à évaluer dans les 3 mois (Chap. 4 §4.2.2.b)</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;font-size:0.8rem;">
                ${upcoming.map(p => `<span style="background:#fff;border:1px solid #fde68a;border-radius:4px;padding:0.15rem 0.5rem;">${p.nom} <span style="color:#92400e;">— ${p.date_butoir}</span></span>`).join('')}
            </div>
        </div>`;
    })()}
    ${dashFiltersHtml}
    <div class="charts-grid">
        <div class="chart-card" style="width:100%;max-width:100%;">
            <div class="chart-title">Matrice des profils de risque</div>
            <div style="padding:0.75rem;">${matrixHtml}</div>
        </div>
    </div>
    ${renderStatistiques()}`;
}
