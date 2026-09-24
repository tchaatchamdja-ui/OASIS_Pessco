/* Module « Profils de Risques » — parametres
   Paramètres : indicateurs, indices et seuils, notifications.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PARAMETRES
// ══════════════════════════════════════
// Les sous-menus des Paramètres reprennent la bande latérale du portail : une
// colonne d'entrées à icône, qui se replie sur ses seules icônes. Les autres
// pages du module gardent leur barre horizontale (`.sub-nav`).
function renderParametres() {
    const sub = APP_STATE.currentSub;
    const corps = sub === 'indices' ? renderParamIndices()
        : sub === 'capacite' ? renderParamCapacite()
        : sub === 'archives' ? renderParamArchives()
        : renderParamIndicateurs();

    const repliee = !!APP_STATE.paramBarreRepliee;
    const bascule = t(repliee ? 'sous_menu_deplier' : 'sous_menu_replier');
    const entrees = (NAV_CONFIG.parametres.subs || []).map((o) => `
        <button class="cfg-sidebar-item ${sub === o.id ? 'active' : ''}"
                onclick="APP_STATE.currentSub='${o.id}';renderPage();"
                title="${oasisEsc(t(o.labelKey))}">
            <span class="cfg-sidebar-icon">${ICONS[o.icon]}</span>
            <span class="cfg-sidebar-label">${oasisEsc(t(o.labelKey))}</span>
        </button>`).join('');

    return `<div class="cfg-layout">
        <div class="cfg-sidebar ${repliee ? 'collapsed' : ''}">
            <button class="cfg-sidebar-toggle" onclick="basculerBarreParam()"
                    title="${oasisEsc(bascule)}" aria-label="${oasisEsc(bascule)}"
                    aria-expanded="${!repliee}">
                <span style="display:flex;${repliee ? '' : 'transform:rotate(180deg);'}">${ICONS.chevron}</span>
            </button>
            ${entrees}
        </div>
        <div class="cfg-content">${corps}</div>
    </div>`;
}

// La bande se replie sur ses icônes : les écrans de paramétrage tiennent des
// tables larges, et la place se prend là.
function basculerBarreParam() {
    APP_STATE.paramBarreRepliee = !APP_STATE.paramBarreRepliee;
    renderPage();
}

// Phase 9 — Capacité inspecteurs (Chap. 4 §4.4)
function renderParamCapacite() {
    const D = APP_STATE.data;
    const inspecteurs = (D.users || []).filter(u => (u.role_m1 === 'M1_Contributeur' || u.role_m1 === 'M1_Validateur'));
    const evals = (D.evaluations || []).filter(e => e.statut !== 'archive');
    // Count per-inspector workload (designated as evaluator across active evals)
    const charge = {};
    evals.forEach(ev => {
        (ev.evaluateurs_designes || []).forEach(uid => {
            charge[uid] = (charge[uid] || 0) + 1;
        });
    });
    const rows = inspecteurs.map(u => {
        const name = (`${u.prenom || ''} ${u.nom || ''}`.trim()) || u.nom_utilisateur || u.email || u.id;
        const c = charge[u.id] || 0;
        const flag = c >= 5 ? '🔴' : c >= 3 ? '🟡' : '🟢';
        return `<tr><td>${flag}</td><td>${name}</td><td>${u.role_m1?.replace('M1_', '') || '-'}</td><td>${(u.domaines || []).join(', ') || '-'}</td><td style="text-align:right;font-weight:700;">${c}</td></tr>`;
    }).join('');
    return `<div class="page-header"><h2>${t('inspectors_capacity')}</h2></div>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">${t('inspectors_capacity_hint')}</p>
    <table class="data-table"><thead><tr><th></th><th>Inspecteur</th><th>${t('m1_role')}</th><th>Domaines</th><th style="text-align:right;">${t('active_assessments')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="text-center">${t('no_inspector')}</td></tr>`}</tbody></table>`;
}

// Phase 10 — Archives (Chap. 4 §4.5) : conservation 5 ans après fin de cycle
function renderParamArchives() {
    const D = APP_STATE.data;
    const evals = (D.evaluations || []).filter(e => e.statut === 'valide');
    // Compute date_fin_retention = date_validation + 5 years
    const rows = evals.map(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id) || {};
        const dval = ev.date_validation || ev.date || '';
        let dret = '';
        try {
            const d = new Date(dval); d.setFullYear(d.getFullYear() + 5);
            dret = d.toISOString().slice(0, 10);
        } catch (e) {}
        const expired = dret && new Date(dret) < new Date();
        return `<tr><td>${prest.nom || '-'}</td><td>${sect.code || '-'}</td><td>${formatDate(dval)}</td><td>${dret}</td><td>${expired ? '<span style="color:#dc2626;font-weight:700;">' + t('expired') + '</span>' : '<span style="color:#059669;">' + t('retained') + '</span>'}</td></tr>`;
    }).join('');
    return `<div class="page-header"><h2>${t('archives_retention')}</h2></div>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Les rapports d'évaluation, les plans et les comptes-rendus sont conservés au moins 5 ans après la fin du cycle de surveillance.</p>
    <table class="data-table"><thead><tr><th>${t('provider')}</th><th>${t('sector')}</th><th>${t('validation_date')}</th><th>${t('retained_until')}</th><th>${t('status')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="text-center">${t('no_validated_eval')}</td></tr>`}</tbody></table>`;
}

// ── Indices & Seuils ──
function renderParamIndices() {
    const indices = window.PESSCO?.sharedData?.indices || {};
    const isAdmin = isM1Admin();
    return `
    <div class="page-header"><h2>${t('indices_seuils')}</h2></div>
    <div class="card" style="max-width:600px;">
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('conformity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>Seuil Haut</label><input id="idxConf1" class="input" type="number" step="0.01" min="0" max="1" value="${indices.conf1||0.8}" ${!isAdmin?'disabled':''}></div>
            <div class="form-group"><label>Seuil Bas</label><input id="idxConf2" class="input" type="number" step="0.01" min="0" max="1" value="${indices.conf2||0.5}" ${!isAdmin?'disabled':''}></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('performance')}</h4>
        <div class="form-row">
            <div class="form-group"><label>Seuil Haut</label><input id="idxPerf1" class="input" type="number" step="0.01" min="0" max="1" value="${indices.perf1||0.8}" ${!isAdmin?'disabled':''}></div>
            <div class="form-group"><label>Seuil Bas</label><input id="idxPerf2" class="input" type="number" step="0.01" min="0" max="1" value="${indices.perf2||0.5}" ${!isAdmin?'disabled':''}></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('complexity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>Seuil Haut</label><input id="idxExpo1" class="input" type="number" step="0.01" min="0" max="1" value="${indices.expo1||0.8}" ${!isAdmin?'disabled':''}></div>
            <div class="form-group"><label>Seuil Bas</label><input id="idxExpo2" class="input" type="number" step="0.01" min="0" max="1" value="${indices.expo2||0.5}" ${!isAdmin?'disabled':''}></div>
        </div>
        ${isAdmin ? `<button class="btn btn-primary" onclick="saveModuleIndices()">${ICONS.check || '✓'} ${t('save')}</button>` : ''}
    </div>`;
}

async function saveModuleIndices() {
    const data = {
        conf1: parseFloat(document.getElementById('idxConf1').value),
        conf2: parseFloat(document.getElementById('idxConf2').value),
        perf1: parseFloat(document.getElementById('idxPerf1').value),
        perf2: parseFloat(document.getElementById('idxPerf2').value),
        expo1: parseFloat(document.getElementById('idxExpo1').value),
        expo2: parseFloat(document.getElementById('idxExpo2').value)
    };
    try {
        await api('/api/indices', { method: 'PUT', body: JSON.stringify(data) });
        window.PESSCO.sharedData.indices = data;
        showToast(t('save') + ' OK');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Domaines (Change 3: accordion + filters) ──
window._domFilters = { domaine: '', secteur: '', sa: '', search: '' };


// ── Indicateurs (Change 2: accordion + filters + import/export) ──
window._indFilters = { type: '', domaine: '', secteur: '', sa: '', search: '' };

function renderParamIndicateurs() {
    const D = APP_STATE.data;
    const isAdmin = APP_STATE.user?.role === 'Administrateur';
    const f = window._indFilters;
    const secteurs = D.secteurs || [];
    const sousActivites = D.sousActivites || [];
    const domaines = D.domaines || [];
    const searchLower = (f.search || '').toLowerCase();

    const filtersHtml = _prIndFiltresHtml(f, domaines, secteurs, sousActivites);
    const accordionHtml = _prIndConformiteHtml(D, f, secteurs, searchLower, isAdmin)
        + _prIndPerformanceHtml(D, f, searchLower, isAdmin)
        + _prIndComplexiteHtml(D, f, secteurs, sousActivites, searchLower, isAdmin);

    return `
    <div class="page-header" id="printStart_indicateurs">
        <h2>${t('indicators')}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_indicateurs')">${ICONS.print} ${t('print')}</button>
            <button class="btn btn-primary btn-sm" onclick="exportIndicateursExcel()" title="Exporter Excel">${ICONS.file_excel} Exporter Excel</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('indImportFile').click();" title="Importer">${ICONS.upload} Importer</button>
            <input type="file" id="indImportFile" accept=".xlsx,.xls" style="display:none" onchange="importIndicateursExcel(event)">
            ${isAdmin ? `
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_conf')">${ICONS.plus} ${t('conformity')}</button>
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_perf')">${ICONS.plus} ${t('performance')}</button>
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_complex')">${ICONS.plus} ${t('complexity')}</button>
            ` : ''}
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('indAccordion',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('indAccordion',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="accordion-container" id="indAccordion">
        ${accordionHtml || `<div class="text-center">${t('no_data')}</div>`}
    </div>`;
}

// Barre de filtres des indicateurs.
function _prIndFiltresHtml(f, domaines, secteurs, sousActivites) {
    return `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group">
                <label>${t('type')}</label>
                <select onchange="window._indFilters.type=this.value;renderPage();">
                    <option value="">${t('all_types')}</option>
                    <option value="conf" ${f.type==='conf'?'selected':''}>${t('conformity')}</option>
                    <option value="perf" ${f.type==='perf'?'selected':''}>${t('performance')}</option>
                    <option value="complex" ${f.type==='complex'?'selected':''}>${t('complexity')}</option>
                </select>
            </div>
            <div class="filter-group">
                <label>${t('domain')}</label>
                <select onchange="window._indFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${domaines.map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>${t('sector')}</label>
                <select onchange="window._indFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>S.A.</label>
                <select onchange="window._indFilters.sa=this.value;renderPage();">
                    <option value="">${t('all_sub_activities')}</option>
                    ${sousActivites.map(s => `<option value="${s.id}" ${f.sa===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group filter-search">
                <label>${t('search')}</label>
                <input type="text" id="pr-ind-search" placeholder="${t('search')}" value="${f.search}" oninput="_pesSearchInput(this, () => { window._indFilters.search=document.getElementById('pr-ind-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._indFilters={type:'',domaine:'',secteur:'',sa:'',search:''};renderPage();">${ICONS.refresh}</button>
            </div>
        </div>
    </div>`;
}

// Conformité : secteur → indicateurs (deux niveaux).
function _prIndConformiteHtml(D, f, secteurs, searchLower, isAdmin) {
    if (f.type && f.type !== 'conf') return '';
    let confInds = D.indConf || [];
    if (f.secteur) confInds = confInds.filter(i => i.secteur_id === f.secteur);
    if (f.domaine) {
        const domSectIds = secteurs.filter(s => s.domaine_id === f.domaine).map(s => s.id);
        confInds = confInds.filter(i => domSectIds.includes(i.secteur_id));
    }
    if (searchLower) confInds = confInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (confInds.length || (!f.type && !searchLower)) {
        // Group by sector
        const bySector = {};
        confInds.forEach(i => {
            const s = i.secteur_id || 'none';
            if (!bySector[s]) bySector[s] = [];
            bySector[s].push(i);
        });

        let confBody = '';
        Object.entries(bySector).forEach(([secId, inds]) => {
            const sec = secteurs.find(s => s.id === secId);
            const secAccId = `ind_conf_sec_${secId}`;
            confBody += `
            <div class="accordion-item acc-level-2">
                <div class="accordion-header" data-acc-id="${secAccId}" onclick="toggleAccordion('${secAccId}')">
                    <span class="chevron">${ICONS.chevron}</span>
                    <span class="acc-title">${sec?.code || '-'} - ${sec?.nom || '-'}</span>
                    <span class="acc-count">${inds.length} ${t('indicator')}(s)</span>
                </div>
                <div class="accordion-body" id="acc-body-${secAccId}">
                    ${inds.map(i => `
                    <div class="indicator-item">
                        <div class="indicator-header">
                            <span class="acc-code">${i.code}</span>
                            <span class="acc-label">${i.label}</span>
                            ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_conf','${i.id}')">${ICONS.edit}</button>` : ''}
                        </div>
                        <div class="criteria-list">
                            ${i.c1 ? `<div class="criteria-item criteria-score-1-bad"><span class="criteria-label">1</span><span class="criteria-text">${i.c1}</span></div>` : ''}
                            ${i.c2 ? `<div class="criteria-item criteria-score-2-mid"><span class="criteria-label">2</span><span class="criteria-text">${i.c2}</span></div>` : ''}
                            ${i.c3 ? `<div class="criteria-item criteria-score-3-good"><span class="criteria-label">3</span><span class="criteria-text">${i.c3}</span></div>` : ''}
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        });

        const confId = 'ind_type_conf';
        return `
        <div class="accordion-item acc-level-1">
            <div class="accordion-header" data-acc-id="${confId}" onclick="toggleAccordion('${confId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">${t('conformity')}</span>
                <span class="acc-count">${confInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${confId}">${confBody}</div>
        </div>`;
    }
    return '';
}

// Performance : une seule liste.
function _prIndPerformanceHtml(D, f, searchLower, isAdmin) {
    if (f.type && f.type !== 'perf') return '';
    let perfInds = D.indPerf || [];
    if (searchLower) perfInds = perfInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (perfInds.length || (!f.type && !searchLower)) {
        const perfId = 'ind_type_perf';
        return `
        <div class="accordion-item acc-level-1">
            <div class="accordion-header" data-acc-id="${perfId}" onclick="toggleAccordion('${perfId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">${t('performance')}</span>
                <span class="acc-count">${perfInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${perfId}">
                ${perfInds.map(i => `
                <div class="indicator-item">
                    <div class="indicator-header">
                        <span class="acc-code">${i.code}</span>
                        <span class="acc-label">${i.label}</span>
                        ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_perf','${i.id}')">${ICONS.edit}</button>` : ''}
                    </div>
                    <div class="criteria-list">
                        ${i.c1 ? `<div class="criteria-item criteria-score-1-bad"><span class="criteria-label">1</span><span class="criteria-text">${i.c1}</span></div>` : ''}
                        ${i.c2 ? `<div class="criteria-item criteria-score-2-mid"><span class="criteria-label">2</span><span class="criteria-text">${i.c2}</span></div>` : ''}
                        ${i.c3 ? `<div class="criteria-item criteria-score-3-good"><span class="criteria-label">3</span><span class="criteria-text">${i.c3}</span></div>` : ''}
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }
    return '';
}

// Complexité : secteur → sous-activité → indicateurs (trois niveaux).
function _prIndComplexiteHtml(D, f, secteurs, sousActivites, searchLower, isAdmin) {
    if (f.type && f.type !== 'complex') return '';
    let compInds = D.indComplex || [];
    if (f.sa) compInds = compInds.filter(i => i.sous_activite_id === f.sa);
    if (f.secteur) {
        const secSAs = sousActivites.filter(sa => sa.secteur_id === f.secteur).map(sa => sa.id);
        compInds = compInds.filter(i => secSAs.includes(i.sous_activite_id));
    }
    if (f.domaine) {
        const domSects = secteurs.filter(s => s.domaine_id === f.domaine).map(s => s.id);
        const domSAs = sousActivites.filter(sa => domSects.includes(sa.secteur_id)).map(sa => sa.id);
        compInds = compInds.filter(i => domSAs.includes(i.sous_activite_id));
    }
    if (searchLower) compInds = compInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (compInds.length || (!f.type && !searchLower)) {
        // Group by SA first, then group SAs by sector
        const bySA = {};
        compInds.forEach(i => {
            const s = i.sous_activite_id || 'none';
            if (!bySA[s]) bySA[s] = [];
            bySA[s].push(i);
        });

        // Group SAs by their parent sector
        const bySector = {};
        Object.entries(bySA).forEach(([saId, inds]) => {
            const sa = sousActivites.find(s => s.id === saId);
            const secId = sa?.secteur_id || 'none';
            if (!bySector[secId]) bySector[secId] = {};
            bySector[secId][saId] = inds;
        });

        let compBody = '';
        Object.entries(bySector).forEach(([secId, saMap]) => {
            const sec = secteurs.find(s => s.id === secId);
            const secAccId = `ind_comp_sec_${secId}`;
            const totalInds = Object.values(saMap).reduce((sum, arr) => sum + arr.length, 0);
            const saCount = Object.keys(saMap).length;

            let saBody = '';
            Object.entries(saMap).forEach(([saId, inds]) => {
                const sa = sousActivites.find(s => s.id === saId);
                const saAccId = `ind_comp_sa_${saId}`;
                saBody += `
                <div class="accordion-item acc-level-3" style="margin-left:0.5rem;">
                    <div class="accordion-header" data-acc-id="${saAccId}" onclick="toggleAccordion('${saAccId}')">
                        <span class="chevron">${ICONS.chevron}</span>
                        <span class="acc-title">${sa?.code || '-'} - ${sa?.nom || '-'}</span>
                        <span class="acc-count">${inds.length} ${t('indicator')}(s)</span>
                    </div>
                    <div class="accordion-body" id="acc-body-${saAccId}">
                        ${inds.map(i => `
                        <div class="indicator-item">
                            <div class="indicator-header">
                                <span class="acc-code">${i.code}</span>
                                <span class="acc-label">${i.label}</span>
                                ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_complex','${i.id}')">${ICONS.edit}</button>` : ''}
                            </div>
                            <div class="criteria-list">
                                ${i.c1 ? `<div class="criteria-item criteria-score-1-good"><span class="criteria-label">1</span><span class="criteria-text">${i.c1}</span></div>` : ''}
                                ${i.c2 ? `<div class="criteria-item criteria-score-2-mid"><span class="criteria-label">2</span><span class="criteria-text">${i.c2}</span></div>` : ''}
                                ${i.c3 ? `<div class="criteria-item criteria-score-3-bad"><span class="criteria-label">3</span><span class="criteria-text">${i.c3}</span></div>` : ''}
                            </div>
                        </div>`).join('')}
                    </div>
                </div>`;
            });

            compBody += `
            <div class="accordion-item acc-level-2">
                <div class="accordion-header" data-acc-id="${secAccId}" onclick="toggleAccordion('${secAccId}')">
                    <span class="chevron">${ICONS.chevron}</span>
                    <span class="acc-title">${sec?.code || '-'} - ${sec?.nom || '-'}</span>
                    <span class="acc-count">${saCount} S.A. | ${totalInds} ${t('indicator')}(s)</span>
                </div>
                <div class="accordion-body" id="acc-body-${secAccId}">${saBody}</div>
            </div>`;
        });

        const compId = 'ind_type_complex';
        return `
        <div class="accordion-item acc-level-1">
            <div class="accordion-header" data-acc-id="${compId}" onclick="toggleAccordion('${compId}')">
                <span class="chevron">${ICONS.chevron}</span>
                <span class="acc-title">${t('complexity')}</span>
                <span class="acc-count">${compInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${compId}">${compBody}</div>
        </div>`;
    }
    return '';
}

async function exportIndicateursExcel() {
    try {
        const token = localStorage.getItem('pr_token');
        const res = await fetch(`${MODULE_API}/indicateurs/export`, { credentials: 'same-origin', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'indicateurs.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) { showToast(e.message, 'error'); }
}

// Lecture d'un fichier en base64 (le serveur reçoit du JSON : pas de multipart).
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',').pop());
        r.onerror = () => reject(new Error('Lecture du fichier impossible'));
        r.readAsDataURL(file);
    });
}

async function importIndicateursExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const fileB64 = await fileToBase64(file);
        const token = localStorage.getItem('pr_token');
        const res = await fetch(`${MODULE_API}/indicateurs/import`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ fileB64 })
        });
        if (!res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const d = await res.json();
                throw new Error(oasisMessageErreur(d, res.status, t('import_refuse')));
            } else {
                throw new Error(t('import_format_excel', res.status));
            }
        }
        const data = await res.json().catch(() => ({}));
        event.target.value = '';
        await loadAllData();
        renderPage();
        showImportBanner(data);
    } catch (e) {
        event.target.value = '';
        showImportBanner({ failed: true, message: e.message });
    }
}

// Bandeau temporaire : icône de résultat + aperçu des changements
function showImportBanner(r) {
    document.querySelectorAll('.pr-import-banner').forEach((b) => b.remove());

    const errors = r.errors || [];
    const state = r.failed ? 'error' : (errors.length ? 'warning' : 'success');
    const ICON = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12.5 11 15.5 16.5 9"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    };

    let title;
    let body = '';
    if (r.failed) {
        title = 'Importation échouée';
        body = `<div class="pr-import-line">${r.message || 'Erreur inconnue'}</div>`;
    } else {
        const total = (r.added || 0) + (r.updated || 0);
        title = total ? `Importation réussie — ${total} enregistrement(s) modifié(s)` : 'Importation réussie — aucun changement';
        const chips = [
            r.added ? `<span class="pr-chip added">${r.added} ajouté(s)</span>` : '',
            r.updated ? `<span class="pr-chip updated">${r.updated} mis à jour</span>` : '',
            r.unchanged ? `<span class="pr-chip same">${r.unchanged} inchangé(s) — ignoré(s)</span>` : '',
            r.ignored ? `<span class="pr-chip skipped">${r.ignored} rejeté(s)</span>` : '',
        ].join('');
        const perSheet = (r.detail || [])
            .map((d) => `${d.sheet} : +${d.added} / ~${d.updated} / =${d.unchanged}`)
            .join(' · ');
        body = `<div class="pr-import-chips">${chips}</div>`
            + (perSheet ? `<div class="pr-import-line">${perSheet}</div>` : '')
            + (errors.length ? `<div class="pr-import-line pr-import-errors">${errors.slice(0, 4).map(escapeHtml).join('<br>')}`
                + (errors.length > 4 ? `<br>… ${errors.length - 4} autre(s)` : '') + '</div>' : '');
    }

    const el = document.createElement('div');
    el.className = `pr-import-banner ${state}`;
    el.innerHTML = `<span class="pr-import-icon">${ICON[state]}</span>
        <div class="pr-import-body"><strong>${title}</strong>${body}</div>
        <button class="pr-import-close" onclick="this.parentNode.remove()">✕</button>`;
    document.body.appendChild(el);

    const delay = state === 'success' ? 6000 : 12000;
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, delay);
}


// ── Prestataires (Change 4: filters) ──
window._prestFilters = { domaine: '', secteur: '', search: '' };

// La vue Prestataires est désormais centralisée dans le portail (Configuration › Prestataires).
// L'implémentation locale précédente a été retirée pour éviter d'avoir deux pages distinctes.
// Pour ouvrir un prestataire, utilisez Configuration > Prestataires depuis le portail.

// ── Entity Modal (shared) ──
async function openEntityModal(collection, itemId) {
    const D = APP_STATE.data;
    let item = null;
    if (itemId) {
        const items = D[collection] || D[collection.replace('_','')] || [];
        item = items.find(i => i.id === itemId);
        if (!item) {
            const apiMap = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
                indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`, indicateurs_complex:`${MODULE_API}/indicateurs-complex`,
                prestataires:'/api/prestataires' };
            try { item = await api(`${apiMap[collection]}/${itemId}`); }
            catch (e) {
                // Le formulaire s'ouvrait vide sur un élément qu'on n'avait pas
                // su lire : l'enregistrer l'aurait remplacé par des champs blancs.
                showToast(t('chargement_impossible', e.message), 'error');
                return;
            }
        }
    }

    let fields = '';
    if (collection === 'domaines') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div></div>`;
    } else if (collection === 'secteurs') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('domain')}</label><select id="eDomaine">${(D.domaines||[]).map(d=>`<option value="${d.id}" ${item?.domaine_id===d.id?'selected':''}>${escapeHtml(`${d.code} - ${d.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>
        <div class="form-group"><label>CSN (${t('months')})</label><input id="eCsn" type="number" value="${item?.csn||24}"></div></div>`;
    } else if (collection === 'sous_activites') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>`;
    } else if (collection === 'indicateurs_conf') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${s.code}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')} (${t('level1')})</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')} (${t('level2')})</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')} (${t('level3')})</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'indicateurs_perf') {
        fields = `
        <div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')}</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')}</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')}</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'indicateurs_complex') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>S.A.</label><select id="eSA">${(D.sousActivites||[]).map(s=>`<option value="${s.id}" ${item?.sous_activite_id===s.id?'selected':''}>${escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')}</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')}</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')}</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'prestataires') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>
        <div class="form-group"><label>${t('trigramme')}</label><input id="eTri" value="${item?.trigramme||''}" maxlength="3"></div></div>
        <div class="form-row"><div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div>
        <div class="form-group"><label>${t('domain')}</label><select id="eDomaine">${(D.domaines||[]).map(d=>`<option value="${d.id}" ${item?.domaine_id===d.id?'selected':''}>${d.code}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>${t('contact')}</label><input id="eContact" value="${item?.contact_nom||''}"></div>
        <div class="form-group"><label>${t('telephone')}</label><input id="eTel" value="${item?.contact_tel||''}"></div></div>
        <div class="form-group"><label>${t('email_label')}</label><input id="eEmail" value="${item?.contact_email||''}"></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:0.5rem 0;">
        <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.4rem;">${t('rbs_title')}</div>
        <div class="form-row">
            <div class="form-group"><label>${t('certification_date')}</label>
                <input id="eDateCert" type="date" value="${item?.date_certification||''}"></div>
            <div class="form-group"><label style="display:flex;align-items:center;gap:0.4rem;font-weight:500;">
                <input id="eIsNouveau" type="checkbox" ${item?.is_nouveau?'checked':''} style="margin:0;">
                ${t('new_provider_rbs')}</label></div>
        </div>
        <div class="form-group"><label>${t('rbs_deadline')}</label>
            <input id="eDateButoir" type="date" value="${item?.date_butoir||''}"></div>`;
    }

    showModal(itemId ? t('edit') : t('add'), fields,
        `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
         ${itemId ? `<button class="btn btn-danger btn-sm" onclick="deleteEntity('${collection}','${itemId}')">${t('delete')}</button>` : ''}
         <button class="btn btn-primary" onclick="saveEntity('${collection}','${itemId||''}')">${t('save')}</button>`, 'modal-lg');
}

async function saveEntity(collection, itemId) {
    const apiMap = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
        indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`,
        indicateurs_complex:`${MODULE_API}/indicateurs-complex`, prestataires:'/api/prestataires' };
    const endpoint = apiMap[collection];

    let data = {};
    if (collection === 'domaines') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, nom: document.getElementById('eNom').value };
    } else if (collection === 'secteurs') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, nom: document.getElementById('eNom').value,
                 domaine_id: document.getElementById('eDomaine').value, csn: parseInt(document.getElementById('eCsn').value) || 24 };
    } else if (collection === 'sous_activites') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, nom: document.getElementById('eNom').value,
                 secteur_id: document.getElementById('eSecteur').value };
    } else if (collection === 'indicateurs_conf') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, label: document.getElementById('eLabel').value,
                 c1: document.getElementById('eC1').value, c2: document.getElementById('eC2').value,
                 c3: document.getElementById('eC3').value, secteur_id: document.getElementById('eSecteur').value };
    } else if (collection === 'indicateurs_perf') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, label: document.getElementById('eLabel').value,
                 c1: document.getElementById('eC1').value, c2: document.getElementById('eC2').value, c3: document.getElementById('eC3').value };
    } else if (collection === 'indicateurs_complex') {
        const code = document.getElementById('eCode').value;
        data = { id: itemId || code, code, label: document.getElementById('eLabel').value,
                 c1: document.getElementById('eC1').value, c2: document.getElementById('eC2').value,
                 c3: document.getElementById('eC3').value, sous_activite_id: document.getElementById('eSA').value };
    } else if (collection === 'prestataires') {
        const dateCert = document.getElementById('eDateCert')?.value || '';
        const isNouv = document.getElementById('eIsNouveau')?.checked ? 1 : 0;
        let dateBut = document.getElementById('eDateButoir')?.value || '';
        if (!dateBut && dateCert) {
            try {
                const base = new Date(dateCert);
                const years = isNouv ? 2 : 1;
                base.setFullYear(base.getFullYear() + years);
                dateBut = base.toISOString().slice(0, 10);
            } catch (e) {}
        }
        data = { nom: document.getElementById('eNom').value, trigramme: document.getElementById('eTri').value,
                 date_certification: dateCert, is_nouveau: isNouv, date_butoir: dateBut,
                 secteur_id: document.getElementById('eSecteur').value, domaine_id: document.getElementById('eDomaine').value,
                 contact_nom: document.getElementById('eContact').value, contact_tel: document.getElementById('eTel').value,
                 contact_email: document.getElementById('eEmail').value };
    }

    try {
        if (itemId) await api(`${endpoint}/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });
        else await api(endpoint, { method: 'POST', body: JSON.stringify(data) });
        closeModal(); await loadAllData(); renderPage(); showToast('OK');
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteEntity(collection, itemId) {
    if (!await oasisConfirmer(t('confirm_delete'))) return;
    const apiMap = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
        indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`,
        indicateurs_complex:`${MODULE_API}/indicateurs-complex`, prestataires:'/api/prestataires' };
    try {
        await api(`${apiMap[collection]}/${itemId}`, { method: 'DELETE' });
        closeModal(); await loadAllData(); renderPage(); showToast('OK');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Indices & Seuils ──
function renderParamIndices() {
    const indices = APP_STATE.data.indices || {};
    return `
    <div class="page-header"><h2>${t('indices_cycles')}</h2></div>
    <div class="card" style="max-width:600px;">
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('conformity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxConf1" type="number" step="0.01" min="0" max="1" value="${indices.conf1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxConf2" type="number" step="0.01" min="0" max="1" value="${indices.conf2||0.5}"></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('performance')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxPerf1" type="number" step="0.01" min="0" max="1" value="${indices.perf1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxPerf2" type="number" step="0.01" min="0" max="1" value="${indices.perf2||0.5}"></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('complexity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxExpo1" type="number" step="0.01" min="0" max="1" value="${indices.expo1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxExpo2" type="number" step="0.01" min="0" max="1" value="${indices.expo2||0.5}"></div>
        </div>
        <button class="btn btn-primary" onclick="saveIndices()">${ICONS.check} ${t('save')}</button>
    </div>`;
}

async function saveIndices() {
    const data = {
        conf1: parseFloat(document.getElementById('idxConf1').value),
        conf2: parseFloat(document.getElementById('idxConf2').value),
        perf1: parseFloat(document.getElementById('idxPerf1').value),
        perf2: parseFloat(document.getElementById('idxPerf2').value),
        expo1: parseFloat(document.getElementById('idxExpo1').value),
        expo2: parseFloat(document.getElementById('idxExpo2').value)
    };
    try {
        await api('/api/indices', { method: 'PUT', body: JSON.stringify(data) });
        APP_STATE.data.indices = data;
        showToast('OK');
    } catch (e) { showToast(e.message, 'error'); }
}



// ══════════════════════════════════════
//  NOTIFICATIONS (bell)
// ══════════════════════════════════════

function _getPRNotifAlerts() {
    const D = APP_STATE.data;
    const alerts = [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Draft evaluations pending validation
    const drafts = (D.evaluations || []).filter(e => e.statut === 'brouillon');
    drafts.forEach(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        alerts.push({ type: 'info', icon: ICONS.evaluations, label: `${t('draft')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
    });

    // 2. Evaluations with high/very high risk
    const validEvals = (D.evaluations || []).filter(e => e.statut === 'valide');
    validEvals.forEach(ev => {
        const risk = ev.resultats?.global?.globalRisk?.risk || '';
        if (risk.includes('Très élevé') || risk.includes('Very High') || risk.includes('Muito Elevado')) {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            alerts.push({ type: 'overdue', icon: ICONS.shield, label: `${t('very_high')} ${t('risk')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
        } else if (risk.includes('Élevé') || risk.includes('High') || risk.includes('Elevado')) {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            alerts.push({ type: 'deadline', icon: ICONS.shield, label: `${t('high')} ${t('risk')}: ${prest?.nom || '?'}`, date: ev.date_validation || ev.date });
        }
    });

    // 3. Plans with approaching deadlines
    const plans = D.plans || [];
    plans.forEach(p => {
        if (p.statut === 'termine') return;
        const dDate = p.date_prochaine ? new Date(p.date_prochaine) : null;
        if (dDate && dDate >= now && dDate <= in30) {
            const days = Math.ceil((dDate - now) / (24 * 60 * 60 * 1000));
            const prest = (D.prestataires || []).find(pr => pr.id === p.prestataire_id);
            alerts.push({ type: 'deadline', icon: ICONS.clock, label: `${t('surveillance_freq')}: ${prest?.nom || '?'} (J-${days})`, date: p.date_prochaine, days });
        }
        // Overdue
        if (dDate && dDate < now) {
            const daysLate = Math.ceil((now - dDate) / (24 * 60 * 60 * 1000));
            const prest = (D.prestataires || []).find(pr => pr.id === p.prestataire_id);
            alerts.push({ type: 'overdue', icon: ICONS.clock, label: `${t('surveillance_freq')}: ${prest?.nom || '?'} (${daysLate}j)`, date: p.date_prochaine, days: -daysLate });
        }
    });

    alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
    return alerts;
}

function prUpdateNotifBadge() {
    const alerts = _getPRNotifAlerts();
    const badge = document.getElementById('prNotifBadge');
    if (badge) {
        if (alerts.length > 0) {
            badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function prToggleNotifPanel() {
    const existing = document.getElementById('prNotifPanel');
    if (existing) { existing.remove(); return; }

    const alerts = _getPRNotifAlerts();
    const panel = document.createElement('div');
    panel.id = 'prNotifPanel';
    panel.className = 'pr-notif-panel';
    panel.innerHTML = `
        <div class="pr-notif-panel-header">
            <strong>${ICONS.bell} Notifications (${alerts.length})</strong>
            <button style="border:none;background:none;cursor:pointer;" onclick="document.getElementById('prNotifPanel')?.remove()">${ICONS.close}</button>
        </div>
        <div class="pr-notif-panel-body">
            ${alerts.length === 0 ? `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">${t('no_data')}</div>` :
            alerts.map(a => `
                <div class="pr-notif-item ${a.type}">
                    <div style="flex-shrink:0;">${a.icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.84rem;font-weight:500;">${a.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">
                            ${a.days !== undefined ? (a.days < 0 ? `<span style="color:#ef4444;font-weight:600;">${Math.abs(a.days)}j en retard</span>` : `<span>J-${a.days}</span>`) : ''}
                            ${a.date ? `<span>${formatDate(a.date)}</span>` : ''}
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;

    const bell = document.querySelector('.pr-notif-bell');
    if (bell) {
        const rect = bell.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
    }
    document.body.appendChild(panel);

    setTimeout(() => {
        const handler = (e) => {
            if (!panel.contains(e.target) && !e.target.closest('.pr-notif-bell')) {
                panel.remove();
                document.removeEventListener('click', handler);
            }
        };
        document.addEventListener('click', handler);
    }, 100);
}
