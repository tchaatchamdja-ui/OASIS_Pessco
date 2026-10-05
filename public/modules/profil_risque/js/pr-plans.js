/* Module « Profils de Risques » — plans
   Plans de surveillance issus des profils.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/app/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PLANS DE SURVEILLANCE (Change 9: filters + export PDF)
// ══════════════════════════════════════
window._planFilters = { domaine: '', secteur: '', prestataire: '', search: '' };

function renderPlans() {
    const D = APP_STATE.data;
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');
    const f = window._planFilters;

    // Get only latest eval per prestataire
    const latestMap = {};
    allValids.forEach(ev => {
        const k = ev.prestataire_id;
        if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
    });
    let filtered = Object.values(latestMap);

    // Apply filters
    filtered = filtered.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.prestataire && prest?.id !== f.prestataire) return false;
        if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    });

    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group"><label>${t('domain')}</label>
                <select onchange="window._planFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${escapeHtml(`${d.code} - ${d.nom}`)}</option>`).join('')}
                </select></div>
            <div class="filter-group"><label>${t('sector')}</label>
                <select onchange="window._planFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}
                </select></div>
            <div class="filter-group"><label>${t('provider')}</label>
                <select onchange="window._planFilters.prestataire=this.value;renderPage();">
                    <option value="">${t('all_providers')}</option>
                    ${(D.prestataires||[]).filter(p=>p.actif!==false&&p.actif!==0).map(p => `<option value="${p.id}" ${f.prestataire===p.id?'selected':''}>${escapeHtml(p.nom)}</option>`).join('')}
                </select></div>
            <div class="filter-group filter-search"><label>${t('search')}</label>
                <input type="text" id="pr-plan-search" placeholder="${t('search')}" value="${oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._planFilters.search=document.getElementById('pr-plan-search').value; renderPage(); })"></div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._planFilters={domaine:'',secteur:'',prestataire:'',search:''};renderPage();">${ICONS.refresh}</button>
            </div>
        </div>
    </div>`;

    const pageTitle = t('surveillance_freq');

    if (!filtered.length) {
        return `<div class="page-header" id="printStart_plans"><h2>${pageTitle}</h2>
            <div class="flex gap-1">
                <button class="btn btn-primary btn-sm" onclick="expandCollapseAll('plansContainer',true)">${t('expand_all')}</button>
                <button class="btn btn-primary btn-sm" onclick="expandCollapseAll('plansContainer',false)">${t('collapse_all')}</button>
                <button class="btn btn-primary btn-sm" onclick="printPage('printStart_plans')">${ICONS.print} ${t('print')}</button>
            </div>
        </div>${filtersHtml}
        <div class="card" style="padding:2rem;"><div class="text-center">${t('no_data')}</div></div>`;
    }

    const rows = filtered.map((ev, idx) => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const g = ev.resultats?.global || {};
        const risk = g.globalRisk || {};
        const csrbo = g.csrbo || Math.round((parseInt(sect?.csn || 24)) * (risk.csnMod || 1));
        const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
        const accId = `plan_${idx}`;

        let saPlans = sas.map(sa => {
            const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
            // New format: risk is e.g. "2b", freq is number
            const saRiskLabel = saRes.risk || saRes.globalRisk?.label || '-';
            const saRiskDesc = saRes.risk_desc || saRes.globalRisk?.risk || '-';
            const freq = saRes.freq || saRes.globalRisk?.freq || '-';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.5rem;border-bottom:1px solid var(--border);font-size:0.82rem;">
                <span style="flex:1;font-weight:500;">${escapeHtml(`${sa.code} - ${sa.nom}`)}</span>
                <span class="badge ${getRiskBadgeClass(saRiskDesc)}" style="margin:0 0.5rem;">${saRiskLabel}</span>
                <span style="font-weight:700;min-width:80px;text-align:right;">${freq !== '-' ? freq + 'x / cycle' : '-'}</span>
            </div>`;
        }).join('');

        return `<div class="card" style="margin-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <strong>${prest?.nom || '-'}</strong>
                <span class="text-muted">- ${sect?.nom || '-'}</span>
                <span class="badge ${getRiskBadgeClass(risk.risk)}" style="margin-left:auto;">${risk.label || '-'}</span>
                <span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span>
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" aria-label="${t("deplier_replier")}" title="${t("deplier_replier")}">${ICONS.chevron}</button>
            </div>
            <div class="accordion-body" id="acc-body-${accId}">${saPlans}</div>
        </div>`;
    }).join('');

    return `<div class="page-header" id="printStart_plans"><h2>${pageTitle}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="expandCollapseAll('plansContainer',true)">${t('expand_all')}</button>
            <button class="btn btn-primary btn-sm" onclick="expandCollapseAll('plansContainer',false)">${t('collapse_all')}</button>
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_plans')">${ICONS.print} ${t('print')}</button>
        </div>
    </div>${filtersHtml}
    <div class="results-info">${t('results_count', filtered.length)}</div>
    <div id="plansContainer">${rows}</div>`;
}

