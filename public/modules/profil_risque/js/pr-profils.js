/* Module « Profils de Risques » — profils
   Profils & cycles : synthèses, profils détaillés, archives.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  PROFILS DE RISQUE (Change 8: filters + export)
// ══════════════════════════════════════
window._profilFilters = { domaine: '', secteur: '', prestataire: '', search: '' };

function renderProfils() {
    const D = APP_STATE.data;
    const sub = APP_STATE.currentSub;
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');
    const f = window._profilFilters;

    // Filtres neutralisés selon la vue de « Profils détaillés » :
    // par domaine → secteur et prestataire ; par secteur → prestataire.
    const _vue = (sub === 'individuel') ? prVueApercu() : '';
    const secOff = (_vue === 'domaine');
    const prestOff = (_vue === 'domaine' || _vue === 'secteur');
    if (secOff && f.secteur) f.secteur = '';
    if (prestOff && f.prestataire) f.prestataire = '';

    // Shared filter bar
    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group"><label>${t('domain')}</label>
                <select onchange="window._profilFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code} - ${d.nom}</option>`).join('')}
                </select></div>
            <div class="filter-group ${secOff ? 'filter-disabled' : ''}"><label>${t('sector')}</label>
                <select ${secOff ? 'disabled' : ''} onchange="window._profilFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code} - ${s.nom}</option>`).join('')}
                </select></div>
            <div class="filter-group ${prestOff ? 'filter-disabled' : ''}"><label>${t('provider')}</label>
                <select ${prestOff ? 'disabled' : ''} onchange="window._profilFilters.prestataire=this.value;renderPage();">
                    <option value="">${t('all_providers')}</option>
                    ${(D.prestataires||[]).filter(p=>p.actif!==false&&p.actif!==0).map(p => `<option value="${p.id}" ${f.prestataire===p.id?'selected':''}>${p.nom}</option>`).join('')}
                </select></div>
            <div class="filter-group filter-search"><label>${t('search')}</label>
                <input type="text" id="pr-profil-search" placeholder="${t('search')}" value="${f.search}" oninput="_pesSearchInput(this, () => { window._profilFilters.search=document.getElementById('pr-profil-search').value; renderPage(); })"></div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._profilFilters={domaine:'',secteur:'',prestataire:'',search:''};renderPage();">${ICONS.refresh}</button>
            </div>
        </div>
    </div>`;

    function applyFilters(evals) {
        return evals.filter(ev => {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
            const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
            if (f.domaine && dom?.id !== f.domaine) return false;
            if (f.secteur && sect?.id !== f.secteur) return false;
            if (f.prestataire && prest?.id !== f.prestataire) return false;
            if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
            return true;
        });
    }

    if (sub === 'actifs' || !sub) {
        // Only latest validated per prestataire
        const latestMap = {};
        allValids.forEach(ev => {
            const k = ev.prestataire_id;
            if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
        });
        const filtered = applyFilters(Object.values(latestMap));

        const rows = filtered.map((ev, idx) => {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
            const g = ev.resultats?.global || {};
            const risk = g.globalRisk || {};
            const csrbo = g.csrbo || Math.round((parseInt(sect?.csn || 24)) * (risk.csnMod || 1));

            return `<div class="card" style="margin-bottom:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <strong>${prest?.nom || '-'}</strong>
                    <span class="text-muted">- ${sect?.nom || '-'}</span>
                    <span class="badge ${getRiskBadgeClass(risk.risk)}" style="margin-left:auto;">${risk.label || '-'} (${risk.risk || '-'})</span>
                    <span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span>
                    <span class="date-cell">${formatDate(ev.date_validation || ev.date)}</span>
                    <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','word')" title="Exporter Word">${ICONS.word} Exporter Word</button>
                    <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF">${ICONS.download} Exporter PDF</button>
                    ${prCanSupprimerEval(ev) ? `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}">${ICONS.trash}</button>` : ''}
                </div>
                ${buildSynthesisAccordion(ev, 'profil_' + idx)}
            </div>`;
        }).join('');

        return `<div class="page-header" id="printStart_profils"><h2>${t('current_profiles')}</h2>
            <div class="flex gap-1">
                <button class="btn btn-primary btn-sm" onclick="printPage('printStart_profils')">${ICONS.print} ${t('print')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('profilsContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('profilsContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
            </div>
        </div>
        ${filtersHtml}
        <div class="results-info">${t('results_count', filtered.length)}</div>
        <div id="profilsContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
    }

    if (sub === 'archives') {
        // All old validated evals (not the latest per prestataire)
        const latestMap = {};
        allValids.forEach(ev => {
            const k = ev.prestataire_id;
            if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
        });
        const latestIds = new Set(Object.values(latestMap).map(e => e.id));
        const archives = allValids.filter(e => !latestIds.has(e.id));
        const filtered = applyFilters(archives);

        // Group archived evals by prestataire
        const grouped = {};
        filtered.forEach(ev => {
            const pid = ev.prestataire_id || '_';
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(ev);
        });
        // Sort each group by date_validation desc
        Object.values(grouped).forEach(list => list.sort((a, b) =>
            new Date(b.date_validation || b.date) - new Date(a.date_validation || a.date)));
        // Sort groups by prestataire name
        const groupKeys = Object.keys(grouped).sort((a, b) => {
            const na = (D.prestataires || []).find(p => p.id === a)?.nom || '';
            const nb = (D.prestataires || []).find(p => p.id === b)?.nom || '';
            return na.localeCompare(nb);
        });

        const rows = groupKeys.map((pid, gIdx) => {
            const prest = (D.prestataires || []).find(p => p.id === pid);
            const list = grouped[pid];
            const grpAccId = `arch_grp_${gIdx}`;
            const cards = list.map((ev, idx) => {
                const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
                const risk = ev.resultats?.global?.globalRisk || {};
                return `<div class="card" style="margin:0.5rem 0 0.5rem 1rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                        <span class="text-muted">${sect?.nom || '-'}</span>
                        <span class="badge ${getRiskBadgeClass(risk.risk)}" style="margin-left:auto;">${risk.label || '-'}</span>
                        <span class="date-cell">${formatDate(ev.date_validation || ev.date)}</span>
                        <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF">${ICONS.download} Exporter PDF</button>
                    </div>
                    ${buildSynthesisAccordion(ev, 'arch_' + gIdx + '_' + idx)}
                </div>`;
            }).join('');
            return `<div class="accordion-item" style="margin-bottom:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);">
                <div class="accordion-header" data-acc-id="${grpAccId}" onclick="toggleAccordion('${grpAccId}')" style="padding:0.6rem 0.85rem;">
                    <span class="chevron">${ICONS.chevron}</span>
                    <strong style="font-size:0.95rem;">${prest?.nom || '-'}</strong>
                    <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">${list.length} évaluation${list.length > 1 ? 's' : ''} archivée${list.length > 1 ? 's' : ''}</span>
                </div>
                <div class="accordion-body" id="acc-body-${grpAccId}" style="padding:0.25rem 0.5rem 0.5rem;">
                    ${cards}
                </div>
            </div>`;
        }).join('');

        return `<div class="page-header" id="printStart_archives"><h2>${t('eval_archives')}</h2>
            <div class="flex gap-1">
                <button class="btn btn-primary btn-sm" onclick="printPage('printStart_archives')">${ICONS.print} ${t('print')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('archivesContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('archivesContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
            </div>
        </div>
        ${filtersHtml}
        <div class="results-info">${t('results_count', filtered.length)}</div>
        <div id="archivesContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
    }

    if (sub === 'individuel') {
        return renderProfilIndividuel(D, allValids, applyFilters, filtersHtml);
    }

    if (sub === 'statistiques') {
        return renderStatistiques();
    }
    return '';
}

// ── Statistiques (Analyses & Tendances) ──
// Toggle the currently selected bar in the Taux chart. Used by SVG <rect> / <text>
// onclick handlers. Clicking the same bar again clears the selection.
function setTauxBarSelection(gid) {
    if (!window._dashBarChart) {
        window._dashBarChart = { mode:'secteur', metric:'conf', secteur:'', prestataire:'', selected:'', selectedSA:'' };
    }
    window._dashBarChart.selected = (window._dashBarChart.selected === gid) ? '' : gid;
    // Clear any sub-activity selection since the SA pool may change
    window._dashBarChart.selectedSA = '';
    renderPage();
}

// Toggle the currently selected bar in the per-sub-activity charts. Drives the
// dynamic filtering of the "Indicateurs - Analyses" section.
function setSABarSelection(saId) {
    if (!window._dashBarChart) {
        window._dashBarChart = { mode:'secteur', metric:'conf', secteur:'', prestataire:'', selected:'', selectedSA:'' };
    }
    window._dashBarChart.selectedSA = (window._dashBarChart.selectedSA === saId) ? '' : saId;
    renderPage();
}

// Open right-side slicer (1/4 viewport) with indicator details + peer benchmark
// for the "Profil individuel" view. Compares the prestataire to other prestataires
// of the same secteur (latest validated eval per peer).
function openIndividualIndicator(evalId, type, indId, saId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    let ind, scoreKey, noteField, color;
    if (type === 'conf') {
        ind = (D.indConf || []).find(i => i.id === indId);
        scoreKey = `${saId}_${indId}`;
        noteField = 'notes_conf'; color = '#1a365d';
    } else if (type === 'perf') {
        ind = (D.indPerf || []).find(i => i.id === indId);
        scoreKey = indId;
        noteField = 'notes_perf'; color = '#059669';
    } else {
        ind = (D.indComplex || []).find(i => i.id === indId);
        scoreKey = indId;
        noteField = 'notes_comp'; color = '#d97706';
    }
    if (!ind) return;

    const currentScore = ev[noteField]?.[scoreKey] || 0;
    // Previous eval of same prestataire
    const myPrev = (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.prestataire_id === ev.prestataire_id && e.id !== ev.id)
        .sort((a, b) => new Date(b.date_validation || b.date) - new Date(a.date_validation || a.date))[0];
    const prevScore = myPrev?.[noteField]?.[scoreKey] || 0;

    // Peers (same secteur, latest valid per prestataire, excluding self)
    const peersMap = {};
    (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.secteur_id === ev.secteur_id && e.prestataire_id !== ev.prestataire_id)
        .forEach(e => {
            const k = e.prestataire_id;
            if (!peersMap[k] || new Date(e.date_validation || e.date) > new Date(peersMap[k].date_validation || peersMap[k].date)) peersMap[k] = e;
        });
    const peers = Object.values(peersMap)
        .map(p => ({
            prest: (D.prestataires || []).find(x => x.id === p.prestataire_id),
            score: p[noteField]?.[scoreKey] || 0,
            date: p.date_validation || p.date
        }))
        .filter(x => x.score > 0)
        .sort((a, b) => a.score - b.score || (a.prest?.nom || '').localeCompare(b.prest?.nom || ''));

    // Distribution
    const dist = { 1: 0, 2: 0, 3: 0 };
    peers.forEach(p => { if (dist[p.score] !== undefined) dist[p.score]++; });
    const totalPeers = peers.length;
    const isComp = (type === 'comp');
    const segColors = isComp ? { 1:'#22c55e', 2:'#f59e0b', 3:'#ef4444' } : { 1:'#ef4444', 2:'#f59e0b', 3:'#22c55e' };

    // Average peer score
    const peerAvg = totalPeers ? (peers.reduce((s, p) => s + p.score, 0) / totalPeers) : 0;

    // Rank of current prestataire vs peers (1 = meilleur)
    // For conf/perf: higher = better. For comp: lower = better.
    let rank = null;
    if (currentScore && totalPeers) {
        const allScores = peers.map(p => p.score).concat([currentScore]).sort((a, b) => isComp ? (a - b) : (b - a));
        rank = allScores.indexOf(currentScore) + 1;
    }

    // Pill (same logic as the card pill)
    function _pill(score) {
        const cols = isComp ? ['#22c55e','#f59e0b','#ef4444'] : ['#ef4444','#f59e0b','#22c55e'];
        const fill = (score >= 1 && score <= 3) ? cols[score - 1] : '#e5e7eb';
        return `<div style="display:flex;width:100%;border:1px solid #d1d5db;border-radius:11px;overflow:hidden;background:#f9fafb;">
            ${[1,2,3].map(n => `<div style="flex:1;height:16px;background:${(score>=n&&score>=1)?fill:'#e5e7eb'};border-radius:${n===1?'10px 0 0 10px':(n===3?'0 10px 10px 0':'0')};"></div>`).join('')}
        </div>`;
    }

    // Trend arrow text
    let trendLine = '<div style="color:var(--text-muted);font-style:italic;font-size:0.78rem;">Pas d\'évaluation antérieure</div>';
    if (currentScore && prevScore) {
        const diff = currentScore - prevScore;
        let icon, col, lbl;
        if (diff === 0) { icon='→'; col='#6b7280'; lbl='Stable'; }
        else if (diff > 0) { icon='↑'; col = isComp ? '#ef4444':'#22c55e'; lbl = isComp ? 'Hausse (défavorable)' : 'Hausse (favorable)'; }
        else { icon='↓'; col = isComp ? '#22c55e':'#ef4444'; lbl = isComp ? 'Baisse (favorable)' : 'Baisse (défavorable)'; }
        trendLine = `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:${col};font-weight:700;">
            <span style="font-size:1.2rem;">${icon}</span>
            <span>${prevScore} → ${currentScore} ${diff !== 0 ? `(${diff>0?'+':''}${diff})` : ''}</span>
            <span style="font-weight:500;color:var(--text-muted);font-size:0.75rem;">— ${lbl}</span>
        </div>`;
    }

    // Criteria block
    const critRows = [];
    if (ind.c1) critRows.push(`<div style="padding:0.3rem 0.5rem;border-left:3px solid ${isComp ? '#22c55e':'#ef4444'};background:var(--bg);margin:0.2rem 0;font-size:0.78rem;"><strong>1 :</strong> ${ind.c1}</div>`);
    if (ind.c2) critRows.push(`<div style="padding:0.3rem 0.5rem;border-left:3px solid #f59e0b;background:var(--bg);margin:0.2rem 0;font-size:0.78rem;"><strong>2 :</strong> ${ind.c2}</div>`);
    if (ind.c3) critRows.push(`<div style="padding:0.3rem 0.5rem;border-left:3px solid ${isComp ? '#ef4444':'#22c55e'};background:var(--bg);margin:0.2rem 0;font-size:0.78rem;"><strong>3 :</strong> ${ind.c3}</div>`);
    const criteriaHtml = critRows.length ? `<div style="margin-top:0.5rem;">${critRows.join('')}</div>` : '';

    // Distribution bar
    const _esc = oasisEsc;
    const distHtml = totalPeers ? `<div style="margin-top:0.3rem;">
        ${[1,2,3].map(n => {
            const pct = totalPeers ? (dist[n]/totalPeers*100) : 0;
            return `<div style="display:flex;align-items:center;gap:0.5rem;margin:0.18rem 0;font-size:0.78rem;">
                <span style="width:18px;text-align:center;font-weight:700;color:${segColors[n]};">${n}</span>
                <div style="flex:1;background:#f3f4f6;border-radius:6px;height:14px;overflow:hidden;">
                    <div style="width:${pct}%;background:${segColors[n]};height:100%;"></div>
                </div>
                <span style="min-width:65px;text-align:right;font-size:0.72rem;color:#555;">${dist[n]} (${pct.toFixed(0)}%)</span>
            </div>`;
        }).join('')}
    </div>` : `<div class="text-center" style="padding:0.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">${t('no_peer_indicator')}</div>`;

    // Peer list (sorted by score)
    const myPrest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const peerListHtml = totalPeers ? `<div style="margin-top:0.4rem;display:flex;flex-direction:column;gap:0.18rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0.4rem;background:#dbeafe;border-radius:4px;font-size:0.78rem;font-weight:700;">
            <span style="width:24px;text-align:center;color:#1d4ed8;">●</span>
            <span style="flex:1;">${_esc(myPrest?.nom || '')}${myPrest?.trigramme?` (${_esc(myPrest.trigramme)})`:''}</span>
            <span style="font-weight:800;color:${segColors[currentScore] || '#6b7280'};">${currentScore || '-'}</span>
        </div>
        ${peers.map(p => `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0.4rem;border-bottom:1px solid var(--border);font-size:0.78rem;">
            <span style="width:24px;text-align:center;color:#9ca3af;">·</span>
            <span style="flex:1;">${_esc(p.prest?.nom || '')}${p.prest?.trigramme?` (${_esc(p.prest.trigramme)})`:''}</span>
            <span style="font-weight:700;color:${segColors[p.score] || '#6b7280'};">${p.score}</span>
        </div>`).join('')}
    </div>` : '';

    const bodyHtml = `<div style="display:flex;flex-direction:column;gap:0.6rem;">
        <div style="border-left:4px solid ${color};padding:0.35rem 0.6rem;background:var(--bg);border-radius:4px;">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">${type === 'conf' ? 'Conformité' : (type === 'perf' ? 'Performance' : 'Complexité')}</div>
            <div style="font-weight:800;font-size:0.95rem;color:${color};">${ind.code}</div>
            <div style="font-size:0.82rem;color:#374151;margin-top:0.15rem;">${_esc(ind.label || '')}</div>
        </div>

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Note actuelle</div>
            ${_pill(currentScore)}
            <div style="text-align:center;font-size:0.85rem;margin-top:0.25rem;"><strong>${currentScore || '-'}</strong>/3</div>
        </div>

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Tendance vs évaluation précédente</div>
            ${trendLine}
        </div>

        ${criteriaHtml ? `<div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Critères d'évaluation</div>
            ${criteriaHtml}
        </div>` : ''}

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Situation par rapport aux autres prestataires du secteur</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;font-size:0.78rem;margin-bottom:0.3rem;">
                <div style="flex:1;background:var(--bg);padding:0.3rem 0.5rem;border-radius:4px;border:1px solid var(--border);">
                    <div style="color:var(--text-muted);font-size:0.7rem;">Moyenne pairs</div>
                    <strong style="font-size:0.9rem;">${peerAvg ? peerAvg.toFixed(2) : '-'}</strong>
                </div>
                <div style="flex:1;background:var(--bg);padding:0.3rem 0.5rem;border-radius:4px;border:1px solid var(--border);">
                    <div style="color:var(--text-muted);font-size:0.7rem;">Rang</div>
                    <strong style="font-size:0.9rem;">${rank ? `${rank}/${totalPeers + 1}` : '-'}</strong>
                </div>
                <div style="flex:1;background:var(--bg);padding:0.3rem 0.5rem;border-radius:4px;border:1px solid var(--border);">
                    <div style="color:var(--text-muted);font-size:0.7rem;">Pairs évalués</div>
                    <strong style="font-size:0.9rem;">${totalPeers}</strong>
                </div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.4rem;">Distribution des notes (pairs)</div>
            ${distHtml}
            ${peerListHtml ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">Détail par prestataire</div>${peerListHtml}` : ''}
        </div>
    </div>`;

    openSlicer(`${ind.code}`, bodyHtml, '', { drawer: true });
    // Resize slicer to ~2/5 of viewport for the indicator details panel
    const slicer = document.getElementById('prSlicer');
    if (slicer) {
        slicer.style.width = '40vw';
        slicer.style.minWidth = '420px';
    }
}

// Open right-side slicer (2/5 viewport) with the synthesis of a group of indicators
// (a sub-activity for conf/comp, or the entire Performance set) and the prestataire's
// situation vs other prestataires of the same secteur.
function openIndividualGroup(evalId, type, saId) {
    const ev = APP_STATE.data.evaluations.find(e => e.id === evalId);
    if (!ev) return;
    const D = APP_STATE.data;
    const isComp = (type === 'comp');
    const noteField = type === 'conf' ? 'notes_conf' : (type === 'perf' ? 'notes_perf' : 'notes_comp');
    const color = type === 'conf' ? '#1a365d' : (type === 'perf' ? '#059669' : '#d97706');
    const typeLabel = type === 'conf' ? 'Conformité' : (type === 'perf' ? 'Performance' : 'Complexité');

    // Select indicators in this group
    let inds = [];
    let groupTitle = '';
    if (type === 'conf') {
        const sa = (D.sousActivites || D._rawSousActivites || []).find(x => x.id === saId);
        inds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
        groupTitle = `${typeLabel} — ${sa?.code || ''} ${sa?.nom || ''}`;
    } else if (type === 'perf') {
        inds = (D.indPerf || []).filter(i => i.actif !== false);
        groupTitle = `${typeLabel}`;
    } else {
        const sa = (D.sousActivites || D._rawSousActivites || []).find(x => x.id === saId);
        inds = (D.indComplex || []).filter(i => i.actif !== false && i.sous_activite_id === saId);
        groupTitle = `${typeLabel} — ${sa?.code || ''} ${sa?.nom || ''}`;
    }

    // Compute taux for one evaluation on this group
    function _grpTaux(e) {
        if (!inds.length) return null;
        let sum = 0, cnt = 0;
        inds.forEach(ind => {
            const key = (type === 'conf') ? `${saId}_${ind.id}` : ind.id;
            const n = e[noteField]?.[key] || 0;
            if (n > 0) { sum += n; cnt += 1; }
        });
        const max = inds.length * 3;
        return { sum, max, cnt, total: inds.length, taux: max ? (sum / max) * 100 : 0 };
    }

    const my = _grpTaux(ev);

    // Peers (same secteur, latest valid per prestataire, excluding self)
    const peersMap = {};
    (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.secteur_id === ev.secteur_id && e.prestataire_id !== ev.prestataire_id)
        .forEach(e => {
            const k = e.prestataire_id;
            if (!peersMap[k] || new Date(e.date_validation || e.date) > new Date(peersMap[k].date_validation || peersMap[k].date)) peersMap[k] = e;
        });
    const peerRows = Object.values(peersMap)
        .map(p => ({ prest: (D.prestataires || []).find(x => x.id === p.prestataire_id), s: _grpTaux(p) }))
        .filter(x => x.s && x.s.cnt > 0)
        .sort((a, b) => isComp ? a.s.taux - b.s.taux : b.s.taux - a.s.taux);
    const totalPeers = peerRows.length;
    const peerAvg = totalPeers ? peerRows.reduce((acc, x) => acc + x.s.taux, 0) / totalPeers : 0;

    // Rank of current prestataire among (self + peers) on taux
    let rank = null;
    if (my && totalPeers) {
        const all = peerRows.map(p => p.s.taux).concat([my.taux]).sort((a, b) => isComp ? a - b : b - a);
        // first index where the value equals my.taux
        rank = all.indexOf(my.taux) + 1;
    }

    // Previous group taux for trend
    const myPrev = (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.prestataire_id === ev.prestataire_id && e.id !== ev.id)
        .sort((a, b) => new Date(b.date_validation || b.date) - new Date(a.date_validation || a.date))[0];
    const prev = myPrev ? _grpTaux(myPrev) : null;
    let trendHtml = '<div style="color:var(--text-muted);font-style:italic;font-size:0.78rem;">Pas d\'évaluation antérieure</div>';
    if (my && prev && prev.cnt > 0 && my.cnt > 0) {
        const diff = my.taux - prev.taux;
        let icon, col, lbl;
        if (Math.abs(diff) < 0.05) { icon='→'; col='#6b7280'; lbl='Stable'; }
        else if (diff > 0) { icon='↑'; col = isComp ? '#ef4444' : '#22c55e'; lbl = isComp ? 'Hausse (défavorable)' : 'Hausse (favorable)'; }
        else { icon='↓'; col = isComp ? '#22c55e' : '#ef4444'; lbl = isComp ? 'Baisse (favorable)' : 'Baisse (défavorable)'; }
        trendHtml = `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:${col};font-weight:700;">
            <span style="font-size:1.2rem;">${icon}</span>
            <span>${prev.taux.toFixed(1)}% → ${my.taux.toFixed(1)}% ${Math.abs(diff)>=0.05?`(${diff>0?'+':''}${diff.toFixed(1)} pts)`:''}</span>
            <span style="font-weight:500;color:var(--text-muted);font-size:0.75rem;">— ${lbl}</span>
        </div>`;
    }

    const _esc = oasisEsc;

    // List of indicators with their note (compact)
    function _pillCompact(score) {
        const cols = isComp ? ['#22c55e','#f59e0b','#ef4444'] : ['#ef4444','#f59e0b','#22c55e'];
        const fill = (score >= 1 && score <= 3) ? cols[score - 1] : '#e5e7eb';
        return `<div style="display:flex;width:60px;border:1px solid #d1d5db;border-radius:7px;overflow:hidden;background:#f9fafb;">
            ${[1,2,3].map(n => `<div style="flex:1;height:10px;background:${(score>=n&&score>=1)?fill:'#e5e7eb'};"></div>`).join('')}
        </div>`;
    }
    const indListHtml = inds.length ? inds.map(ind => {
        const key = (type === 'conf') ? `${saId}_${ind.id}` : ind.id;
        const sc = ev[noteField]?.[key] || 0;
        return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0.4rem;border-bottom:1px solid var(--border);font-size:0.78rem;">
            <span style="font-weight:700;color:${color};min-width:40px;">${ind.code}</span>
            <span style="flex:1;color:#374151;">${_esc((ind.label || '').slice(0, 70))}${(ind.label || '').length > 70 ? '…' : ''}</span>
            ${_pillCompact(sc)}
            <span style="font-weight:700;min-width:18px;text-align:right;">${sc || '-'}</span>
        </div>`;
    }).join('') : '';

    // Distribution histogram of peers' taux
    let distHtml = '';
    if (totalPeers) {
        const buckets = [0,0,0,0,0]; // 0-20, 20-40, 40-60, 60-80, 80-100
        peerRows.forEach(p => {
            const t = p.s.taux;
            const idx = Math.min(4, Math.floor(t / 20));
            buckets[idx]++;
        });
        const maxB = Math.max(...buckets, 1);
        const labels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
        distHtml = `<div style="display:flex;gap:0.25rem;align-items:flex-end;height:60px;margin-top:0.25rem;">
            ${buckets.map((b, i) => {
                const h = (b / maxB) * 50;
                const myBucketIdx = my ? Math.min(4, Math.floor(my.taux / 20)) : -1;
                const bColor = (i === myBucketIdx) ? '#1d4ed8' : '#9ca3af';
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                    <div style="font-size:0.65rem;font-weight:700;color:#444;">${b}</div>
                    <div style="width:100%;height:${h}px;background:${bColor};border-radius:2px 2px 0 0;margin-top:0.1rem;"></div>
                    <div style="font-size:0.6rem;color:#666;margin-top:0.1rem;">${labels[i]}</div>
                </div>`;
            }).join('')}
        </div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem;">La barre <span style="color:#1d4ed8;font-weight:700;">bleue</span> représente la tranche du prestataire courant.</div>`;
    } else {
        distHtml = `<div class="text-center" style="padding:0.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">${t('no_peer_group')}</div>`;
    }

    // Peer list
    const myPrest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const tauxColor = my ? (isComp
        ? (my.taux <= 50 ? '#22c55e' : my.taux <= 80 ? '#f59e0b' : '#ef4444')
        : (my.taux >= 80 ? '#22c55e' : my.taux >= 50 ? '#f59e0b' : '#ef4444')) : '#6b7280';
    function _pTauxCol(t) { return isComp
        ? (t <= 50 ? '#22c55e' : t <= 80 ? '#f59e0b' : '#ef4444')
        : (t >= 80 ? '#22c55e' : t >= 50 ? '#f59e0b' : '#ef4444'); }
    const peerListHtml = totalPeers ? `<div style="margin-top:0.4rem;display:flex;flex-direction:column;gap:0.18rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0.4rem;background:#dbeafe;border-radius:4px;font-size:0.78rem;font-weight:700;">
            <span style="width:24px;text-align:center;color:#1d4ed8;">●</span>
            <span style="flex:1;">${_esc(myPrest?.nom || '')}${myPrest?.trigramme?` (${_esc(myPrest.trigramme)})`:''}</span>
            <span style="font-weight:800;color:${tauxColor};">${my ? my.taux.toFixed(1) + '%' : '-'}</span>
        </div>
        ${peerRows.map(p => `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0.4rem;border-bottom:1px solid var(--border);font-size:0.78rem;">
            <span style="width:24px;text-align:center;color:#9ca3af;">·</span>
            <span style="flex:1;">${_esc(p.prest?.nom || '')}${p.prest?.trigramme?` (${_esc(p.prest.trigramme)})`:''}</span>
            <span style="font-weight:700;color:${_pTauxCol(p.s.taux)};">${p.s.taux.toFixed(1)}%</span>
        </div>`).join('')}
    </div>` : '';

    const bodyHtml = `<div style="display:flex;flex-direction:column;gap:0.6rem;">
        <div style="border-left:4px solid ${color};padding:0.35rem 0.6rem;background:var(--bg);border-radius:4px;">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Synthèse de groupe</div>
            <div style="font-weight:800;font-size:0.95rem;color:${color};">${_esc(groupTitle)}</div>
            <div style="font-size:0.78rem;color:#374151;margin-top:0.15rem;">${inds.length} indicateur${inds.length>1?'s':''}</div>
        </div>

        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <div style="flex:1;min-width:120px;background:var(--bg);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--border);">
                <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;">Taux courant</div>
                <strong style="font-size:1.1rem;color:${tauxColor};">${my ? my.taux.toFixed(1) + '%' : '-'}</strong>
            </div>
            <div style="flex:1;min-width:120px;background:var(--bg);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--border);">
                <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;">Notes</div>
                <strong style="font-size:0.95rem;">${my ? `${my.sum}/${my.max}` : '-'}</strong>
                <span style="font-size:0.7rem;color:var(--text-muted);">(${my ? my.cnt : 0}/${inds.length})</span>
            </div>
            <div style="flex:1;min-width:120px;background:var(--bg);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--border);">
                <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;">Moyenne pairs</div>
                <strong style="font-size:0.95rem;color:${totalPeers ? _pTauxCol(peerAvg) : '#9ca3af'};">${totalPeers ? peerAvg.toFixed(1) + '%' : '-'}</strong>
            </div>
            <div style="flex:1;min-width:120px;background:var(--bg);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--border);">
                <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;">Rang</div>
                <strong style="font-size:0.95rem;">${rank ? `${rank}/${totalPeers + 1}` : '-'}</strong>
            </div>
        </div>

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Tendance vs évaluation précédente</div>
            ${trendHtml}
        </div>

        ${indListHtml ? `<div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Indicateurs du groupe</div>
            <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;">${indListHtml}</div>
        </div>` : ''}

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">Situation par rapport aux autres prestataires du secteur</div>
            ${distHtml}
            ${peerListHtml ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">Détail par prestataire</div>${peerListHtml}` : ''}
        </div>
    </div>`;

    openSlicer(`Synthèse — ${_esc(groupTitle)}`, bodyHtml, '', { drawer: true });
    const slicer = document.getElementById('prSlicer');
    if (slicer) {
        slicer.style.width = '40vw';
        slicer.style.minWidth = '420px';
    }
}

// ══════════════════════════════════════
//  Profils détaillés — aperçu par domaine / secteur / prestataire
//  Colonne gauche : jauges (type tableau de bord) de chaque entité.
//  Colonne droite  : un graphique par indicateur, taux de chaque entité.
// ══════════════════════════════════════
const APERCU_VUES = [
    { id: 'domaine', label: 'Profil par domaine' },
    { id: 'secteur', label: 'Profil par secteur' },
    { id: 'prestataire', label: 'Profil par prestataire' },
];

const APERCU_AXES = [
    { key: 'tauxConf', type: 'conf', label: 'Conformité' },
    { key: 'tauxPerf', type: 'perf', label: 'Performance' },
    { key: 'tauxComp', type: 'comp', label: 'Complexité' },
];

function prVueApercu() {
    const v = window._profilVue;
    return APERCU_VUES.some(x => x.id === v) ? v : 'domaine';
}

// Changer de vue remet à zéro les filtres que la vue désactive.
function setVueApercu(vue) {
    window._profilVue = vue;
    const f = window._profilFilters || (window._profilFilters = { domaine: '', secteur: '', prestataire: '', search: '' });
    if (vue === 'domaine') { f.secteur = ''; f.prestataire = ''; }
    if (vue === 'secteur') { f.prestataire = ''; }
    renderPage();
}

function ouvrirProfilPrestataire(id) {
    (window._profilFilters || {}).prestataire = id;
    renderPage();
}

// Quitter le profil détaillé et revenir à la vue « Profil par prestataire »
function retourVuePrestataires() {
    (window._profilFilters || {}).prestataire = '';
    window._profilVue = 'prestataire';
    renderPage();
}

function renderApercuProfils(D, allValids, mode) {
    const f = window._profilFilters || {};
    // Dernière évaluation validée par prestataire
    const latest = {};
    (allValids || []).forEach(ev => {
        const k = ev.prestataire_id;
        if (!latest[k] || new Date(ev.date_validation || ev.date) > new Date(latest[k].date_validation || latest[k].date)) latest[k] = ev;
    });
    const evals = Object.values(latest);
    const secteurs = (D._rawSecteurs || D.secteurs) || [];
    const secteurById = (id) => secteurs.find(s => s.id === id);

    // Moyennes des taux (en %) sur un lot d'évaluations
    const moyennes = (list) => {
        const out = { n: list.length };
        APERCU_AXES.forEach(a => {
            const vals = list.map(e => e.resultats?.global?.[a.key]).filter(v => typeof v === 'number');
            out[a.type] = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) * 100 : null;
        });
        return out;
    };

    // ── Entités de la vue courante, filtrées par la barre de filtres ──
    const rech = String(f.search || '').trim().toLowerCase();
    const matchRech = (...champs) => !rech || champs.some(c => String(c || '').toLowerCase().includes(rech));

    // Prestataires rattachés (actifs) par secteur
    const prestActifs = (D.prestataires || []).filter(p => p.actif !== false && p.actif !== 0);
    const nbPrestSecteurs = (ids) => prestActifs.filter(p => ids.has(p.secteur_id)).length;
    const libPrest = (n) => `${n} prestataire${n > 1 ? 's' : ''}`;

    let entites = [];
    if (mode === 'secteur') {
        entites = secteurs
            .filter(s => (!f.domaine || s.domaine_id === f.domaine) && (!f.secteur || s.id === f.secteur)
                && matchRech(s.code, s.nom))
            .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
            .map(s => {
                const taux = moyennes(evals.filter(e => e.secteur_id === s.id));
                return {
                    id: s.id, titre: `${s.code || ''} — ${s.nom || ''}`, court: s.code || s.nom || '(?)', taux,
                    meta: `${libPrest(nbPrestSecteurs(new Set([s.id])))} · ${taux.n} évalué${taux.n > 1 ? 's' : ''}`,
                };
            });
    } else if (mode === 'prestataire') {
        entites = (D.prestataires || [])
            .filter(p => p.actif !== false && p.actif !== 0)
            .filter(p => {
                const sec = secteurById(p.secteur_id);
                if (f.domaine && sec?.domaine_id !== f.domaine) return false;
                if (f.secteur && p.secteur_id !== f.secteur) return false;
                if (!matchRech(p.nom, p.trigramme)) return false;
                return true;
            })
            .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || '')))
            .map(p => {
                const sec = secteurById(p.secteur_id);
                const taux = moyennes(evals.filter(e => e.prestataire_id === p.id));
                return {
                    id: p.id, titre: p.nom || '(?)', court: p.trigramme || p.nom || '(?)', taux,
                    meta: `${sec ? `${sec.code || sec.nom || ''} · ` : ''}${taux.n} évaluation${taux.n > 1 ? 's' : ''}`,
                    cliquable: true,
                };
            });
    } else {
        entites = (D.domaines || [])
            .filter(d => d.actif !== false && d.actif !== 0)
            .filter(d => (!f.domaine || d.id === f.domaine) && matchRech(d.code, d.nom))
            .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
            .map(d => {
                const secIds = new Set(secteurs.filter(s => s.domaine_id === d.id).map(s => s.id));
                const taux = moyennes(evals.filter(e => secIds.has(e.secteur_id)));
                return {
                    id: d.id, titre: `${d.code || ''} — ${d.nom || ''}`, court: d.code || d.nom || '(?)', taux,
                    meta: `${secIds.size} secteur${secIds.size > 1 ? 's' : ''} · ${libPrest(nbPrestSecteurs(secIds))} · ${taux.n} évalué${taux.n > 1 ? 's' : ''}`,
                };
            });
    }

    // ── Second groupe : jauges par entité (3 colonnes) ──
    const gaugesHtml = entites.map(en => {
        const clic = en.cliquable
            ? ` onclick="ouvrirProfilPrestataire('${en.id}')" style="cursor:pointer;" title="Afficher le profil détaillé de ${escapeHtml(en.titre)}"`
            : '';
        return `<div class="apercu-entite"${clic}>
            <div class="apercu-title">${escapeHtml(en.titre)}</div>
            <div class="apercu-meta">${escapeHtml(en.meta || '')}</div>
            <div class="apercu-gauges">
                ${APERCU_AXES.map(a => prMakeGauge(a.label, en.taux[a.type] || 0, a.type,
                    { compact: true, width: 118, height: 64, minWidth: '110px', noData: en.taux[a.type] == null })).join('')}
            </div>
        </div>`;
    }).join('');

    // ── Premier groupe : un graphique par indicateur (3 colonnes, en haut) ──
    const ticks = [25, 50, 75];
    const indicChart = (axe) => {
        const lignes = entites.map(en => {
            const v = en.taux[axe.type];
            const col = v == null ? '#e5e7eb' : prTauxColor(v, axe.type);
            const clic = en.cliquable ? ` onclick="ouvrirProfilPrestataire('${en.id}')" style="cursor:pointer;"` : '';
            return `<div class="sec-bar-row"${clic} title="${escapeHtml(en.titre)} — ${axe.label} : ${v == null ? 'non évalué' : v.toFixed(1) + '%'}">
                <span class="sec-axis" title="${escapeHtml(en.titre)}">${escapeHtml(en.court)}</span>
                <span class="sec-track">
                    ${ticks.map(t2 => `<i class="sec-grid" style="left:${t2}%;"></i>`).join('')}
                    <i class="sec-fill" style="width:${v == null ? 0 : Math.max(0, Math.min(100, v))}%;background:${col};"></i>
                </span>
                <span class="sec-val" style="color:${v == null ? 'var(--text-muted)' : col};">${v == null ? '—' : v.toFixed(1) + '%'}</span>
            </div>`;
        }).join('');
        return `<div class="chart-card ind-chart">
            <div class="apercu-title">${axe.label}</div>
            ${lignes || `<div class="text-center" style="padding:1rem;color:var(--text-muted);font-style:italic;font-size:0.8rem;">${t('no_data')}</div>`}
        </div>`;
    };

    const vide = `<div class="text-center" style="padding:2rem;color:var(--text-muted);">${t('no_data')}</div>`;
    if (!entites.length) return vide;
    return `<div class="apercu-grid3 apercu-grid3-ind">${APERCU_AXES.map(indicChart).join('')}</div>
        <div class="apercu-grid3">${gaugesHtml}</div>`;
}

// ══════════════════════════════════════
//  Profil individuel — détail des indicateurs d'un prestataire
// ══════════════════════════════════════
function renderProfilIndividuel(D, allValids, applyFilters, filtersHtml) {
    const f = window._profilFilters;
    // Required selection: prestataire (and implicitly its secteur)
    const filteredEvals = applyFilters(allValids);

    // Latest per prestataire from the filtered set
    const latestMap = {};
    filteredEvals.forEach(ev => {
        const k = ev.prestataire_id;
        if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
    });

    const vue = prVueApercu();
    const vueTabs = `<div class="apercu-tabs">
        ${APERCU_VUES.map(v => `<button class="apercu-tab ${vue === v.id ? 'active' : ''}" onclick="setVueApercu('${v.id}')">${v.label}</button>`).join('')}
    </div>`;

    // Profil détaillé ouvert : bouton de retour vers la liste des prestataires
    const detail = (vue === 'prestataire' && f.prestataire);
    const retourBtn = detail
        ? `<button class="btn btn-outline btn-sm" onclick="retourVuePrestataires()">${ICONS.chevron ? `<span style="display:inline-block;transform:rotate(180deg);">${ICONS.chevron}</span>` : ''} Retour aux prestataires</button>`
        : '';

    let header = `<div class="page-header" id="printStart_indiv"><h2>${t('individual_profile')}</h2>
        <div class="flex gap-1">
            ${retourBtn}
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_indiv')">${ICONS.print} ${t('print')}</button>
        </div>
    </div>${vueTabs}${filtersHtml}`;

    // Le profil détaillé n'existe que dans la vue « par prestataire ».
    if (!detail) {
        return `${header}${renderApercuProfils(D, allValids, vue)}`;
    }
    const ev = latestMap[f.prestataire];
    if (!ev) {
        return `${header}
        <div class="text-center" style="padding:2rem;color:var(--text-muted);">
            Aucune évaluation validée pour le prestataire sélectionné.
        </div>`;
    }

    const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const sect  = ((D._rawSecteurs || D.secteurs) || []).find(s => s.id === ev.secteur_id);
    const sas   = ((D._rawSousActivites || D.sousActivites) || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const g     = ev.resultats?.global || {};
    const risk  = g.globalRisk || {};
    const indices = D.indices || {};

    // Pill widget: 3-segment indicator showing the score (1..3) with type-aware coloring.
    // type 'conf'/'perf' : 3 = bon (vert), 1 = mauvais (rouge). type 'comp' : inverse.
    function pill(score, type) {
        score = parseInt(score || 0);
        const isComp = (type === 'comp');
        const colors = isComp
            ? ['#22c55e', '#f59e0b', '#ef4444']   // 1=vert, 2=orange, 3=rouge
            : ['#ef4444', '#f59e0b', '#22c55e'];  // 1=rouge, 2=orange, 3=vert
        // Tous les segments ≤ score reçoivent la couleur du score effectif
        const fillColor = (score >= 1 && score <= 3) ? colors[score - 1] : '#e5e7eb';
        const segs = [1, 2, 3].map(n => {
            const bg = (score >= n && score >= 1) ? fillColor : '#e5e7eb';
            return `<div style="flex:1;height:14px;background:${bg};border-radius:${n===1?'10px 0 0 10px':(n===3?'0 10px 10px 0':'0')};"></div>`;
        }).join('');
        const lbl = score >= 1 && score <= 3 ? `<div style="font-size:0.68rem;color:#555;text-align:center;margin-top:0.15rem;">Score : <strong>${score}</strong>/3</div>` : `<div style="font-size:0.68rem;color:var(--text-muted);text-align:center;margin-top:0.15rem;font-style:italic;">non noté</div>`;
        return `<div style="display:flex;flex-direction:column;width:100%;">
            <div style="display:flex;width:100%;border:1px solid #d1d5db;border-radius:11px;overflow:hidden;background:#f9fafb;">${segs}</div>
            ${lbl}
        </div>`;
    }


    // Previous validated evaluation of the SAME prestataire, used for trend arrows
    const myEvalsSorted = allValids
        .filter(e => e.prestataire_id === ev.prestataire_id)
        .sort((a, b) => new Date(b.date_validation || b.date) - new Date(a.date_validation || a.date));
    const prevEv = myEvalsSorted.length >= 2 ? myEvalsSorted[1] : null;

    // Indicator trend arrow: compares current note with the prestataire's previous evaluation note.
    // type: 'conf' / 'perf' / 'comp'. For 'comp' an increase is unfavourable (red), a decrease is favourable (green).
    function trendArrow(currentScore, prevScore, type) {
        const c = parseInt(currentScore || 0);
        const p = parseInt(prevScore || 0);
        if (!c || !p) {
            return `<div style="font-size:0.65rem;color:var(--text-muted);text-align:center;margin-top:0.25rem;font-style:italic;">Pas d'évaluation antérieure</div>`;
        }
        const diff = c - p;
        const isComp = (type === 'comp');
        let icon, color, label;
        if (diff === 0) {
            icon = '→'; color = '#6b7280'; label = 'Stable';
        } else if (diff > 0) {
            // hausse : conf/perf = favorable (vert), comp = défavorable (rouge)
            icon = '↑'; color = isComp ? '#ef4444' : '#22c55e'; label = isComp ? 'Hausse (défavorable)' : 'Hausse (favorable)';
        } else {
            icon = '↓'; color = isComp ? '#22c55e' : '#ef4444'; label = isComp ? 'Baisse (favorable)' : 'Baisse (défavorable)';
        }
        return `<div style="display:flex;align-items:center;justify-content:center;gap:0.3rem;margin-top:0.3rem;font-size:0.72rem;color:${color};font-weight:700;" title="${label}">
            <span style="font-size:1rem;line-height:1;">${icon}</span>
            <span>${p} → ${c}</span>
            ${diff !== 0 ? `<span style="font-weight:600;">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}
        </div>`;
    }

    // ── Header card with global gauges ──
    function makeMiniGauge(label, pct, type) {
        const isReverse = (type === 'comp');
        const valColor = isReverse
            ? (pct <= 50 ? '#22c55e' : pct <= 80 ? '#f59e0b' : '#ef4444')
            : (pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444');
        // Demi-anneau (arc) bien centré : viewBox 200×120 pour laisser de la place sous l'arc
        const ang = Math.max(0, Math.min(100, pct)) / 100 * 180;
        const rad = (-180 + ang) * Math.PI / 180;
        const ex = 100 + 70 * Math.cos(rad), ey = 100 + 70 * Math.sin(rad);
        return `<div style="flex:1 1 0;min-width:140px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.5rem 0.6rem;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="font-weight:700;font-size:0.78rem;margin-bottom:0.1rem;color:#374151;">${label}</div>
            <svg viewBox="0 0 200 120" width="100%" style="max-width:160px;display:block;">
                <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round"/>
                <path d="M 30 100 A 70 70 0 0 1 ${ex} ${ey}" fill="none" stroke="${valColor}" stroke-width="14" stroke-linecap="round"/>
                <circle cx="100" cy="100" r="4" fill="#1a365d"/>
                <text x="100" y="92" text-anchor="middle" font-size="22" font-weight="800" fill="${valColor}">${(pct || 0).toFixed(1)}%</text>
            </svg>
        </div>`;
    }

    const headerCard = `<div class="card" style="margin-bottom:0.75rem;padding:0.75rem 1rem;">
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">
            <div style="display:flex;flex-direction:column;gap:0.15rem;">
                <div style="font-weight:800;font-size:1.05rem;line-height:1.15;">${prest?.nom || '-'} ${prest?.trigramme ? `<span style="color:var(--text-muted);font-size:0.8rem;">(${prest.trigramme})</span>` : ''}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">${sect?.code || ''} — ${sect?.nom || ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-left:auto;flex-wrap:wrap;">
                <span class="badge ${getRiskBadgeClass(risk.risk)}">${risk.label || '-'}</span>
                ${g.csrbo ? `<span style="font-weight:700;color:var(--primary);font-size:0.85rem;">${g.csrbo} ${t('months')}</span>` : ''}
                <span class="date-cell">${formatDate(ev.date_validation || ev.date)}</span>
            </div>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.6rem;align-items:stretch;">
            ${makeMiniGauge('Conformité',  (g.tauxConf || 0) * 100, 'conf')}
            ${makeMiniGauge('Performance', (g.tauxPerf || 0) * 100, 'perf')}
            ${makeMiniGauge('Complexité',  (g.tauxComp || 0) * 100, 'comp')}
        </div>
    </div>`;

    // Label clamp 2 lignes max via CSS line-clamp
    const _lblStyle = 'font-size:0.7rem;color:var(--text-muted);line-height:1.2;min-height:1.7em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;';
    const _gridStyle = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(max(160px, calc(20% - 0.4rem)), 1fr));gap:0.5rem;';
    function _escAttr(s) { return oasisEsc(s); }
    function makeIndCard(ind, score, prevScore, type, color, saId) {
        const _saAttr = saId ? `,'${saId}'` : ",''";
        return `<div class="card" style="padding:0.55rem 0.7rem;display:flex;flex-direction:column;height:100%;cursor:pointer;" onclick="openIndividualIndicator('${ev.id}','${type}','${ind.id}'${_saAttr})" title="Cliquer pour afficher les détails et la situation par rapport aux autres prestataires du secteur">
            <div style="font-weight:700;font-size:0.78rem;color:${color};">${ind.code}</div>
            <div style="${_lblStyle}" title="${_escAttr(ind.label || '')}">${ind.label || ''}</div>
            <div style="margin-top:0.35rem;">${pill(score, type)}</div>
            ${trendArrow(score, prevScore, type)}
        </div>`;
    }

    // Helpers d'accordéons : niveau secteur (extérieur) + niveau sous-activité (intérieur)
    function _saAcc(idPrefix, sa, cardsHtml, color, count, type) {
        if (!cardsHtml) return '';
        const aId = `${idPrefix}_${sa.id}`;
        return `<div class="accordion-item" style="margin:0.35rem 0 0.35rem 0.75rem;border-left:3px solid ${color};">
            <div class="accordion-header expanded" data-acc-id="${aId}" onclick="toggleAccordion('${aId}')" style="padding:0.4rem 0.6rem;">
                <span class="chevron expanded">${ICONS.chevron}</span>
                <span class="acc-title" style="font-weight:700;font-size:0.78rem;color:${color};">${sa.code} — ${sa.nom}</span>
                <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted);">${count} indicateur${count>1?'s':''}</span>
                <button class="btn btn-outline btn-sm" style="padding:0.15rem 0.45rem;font-size:0.7rem;margin-left:0.4rem;" onclick="event.stopPropagation();openIndividualGroup('${ev.id}','${type}','${sa.id}')" title="Synthèse du groupe et comparaison aux pairs">📊 Synthèse</button>
            </div>
            <div class="accordion-body expanded" id="acc-body-${aId}" style="padding:0.4rem;">
                <div style="${_gridStyle}">${cardsHtml}</div>
            </div>
        </div>`;
    }
    function _sectorAcc(idPrefix, sectorTitle, color, bodyHtml, totalCount) {
        const aId = `${idPrefix}_sect`;
        const inner = bodyHtml || `<div class="text-center" style="padding:0.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">${t('no_indicator')}</div>`;
        return `<div class="accordion-item" style="margin-bottom:0.5rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);">
            <div class="accordion-header expanded" data-acc-id="${aId}" onclick="toggleAccordion('${aId}')" style="padding:0.55rem 0.85rem;border-left:4px solid ${color};">
                <span class="chevron expanded">${ICONS.chevron}</span>
                <span class="acc-title" style="font-weight:700;font-size:0.85rem;color:${color};">${sectorTitle}</span>
                <span style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">${totalCount} indicateur${totalCount>1?'s':''}</span>
            </div>
            <div class="accordion-body expanded" id="acc-body-${aId}" style="padding:0.35rem 0.5rem 0.5rem;">${inner}</div>
        </div>`;
    }

    // Conformité — par SA
    const confInds   = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
    const perfInds   = (D.indPerf || []).filter(i => i.actif !== false);
    const compIndsAll= (D.indComplex || []).filter(i => i.actif !== false);

    let confBody = '', confCount = 0;
    sas.forEach(sa => {
        if (!confInds.length) return;
        const cards = confInds.map(ind => {
            const key = `${sa.id}_${ind.id}`;
            return makeIndCard(ind, ev.notes_conf?.[key] || 0, prevEv?.notes_conf?.[key] || 0, 'conf', '#1a365d', sa.id);
        }).join('');
        confCount += confInds.length;
        confBody  += _saAcc('indiv_conf', sa, cards, '#1a365d', confInds.length, 'conf');
    });

    // Performance — pas de SA : grille unique avec un bouton « Synthèse » dédié
    let perfBody = '';
    if (perfInds.length) {
        const cards = perfInds.map(ind => makeIndCard(ind, ev.notes_perf?.[ind.id] || 0, prevEv?.notes_perf?.[ind.id] || 0, 'perf', '#059669')).join('');
        perfBody = `<div style="display:flex;justify-content:flex-end;padding:0.2rem 0.5rem 0;">
            <button class="btn btn-outline btn-sm" style="padding:0.15rem 0.45rem;font-size:0.7rem;" onclick="openIndividualGroup('${ev.id}','perf','')" title="Synthèse Performance et comparaison aux pairs">📊 Synthèse</button>
        </div>
        <div style="${_gridStyle};padding:0.35rem 0.5rem;">${cards}</div>`;
    }

    // Complexité — par SA
    let compBody = '', compCount = 0;
    sas.forEach(sa => {
        const compInds = compIndsAll.filter(i => i.sous_activite_id === sa.id);
        if (!compInds.length) return;
        const cards = compInds.map(ind => makeIndCard(ind, ev.notes_comp?.[ind.id] || 0, prevEv?.notes_comp?.[ind.id] || 0, 'comp', '#d97706', sa.id)).join('');
        compCount += compInds.length;
        compBody  += _saAcc('indiv_comp', sa, cards, '#d97706', compInds.length, 'comp');
    });

    const sectorTitle = `${sect?.code || ''} — ${sect?.nom || ''}`;
    const confSection = _sectorAcc('indiv_conf', sectorTitle, '#1a365d', confBody, confCount);
    const perfSection = _sectorAcc('indiv_perf', sectorTitle, '#059669', perfBody, perfInds.length);
    const compSection = _sectorAcc('indiv_comp', sectorTitle, '#d97706', compBody, compCount);

    return `${header}
        ${headerCard}
        <div style="display:flex;gap:0.4rem;margin:0.5rem 0;">
            <button class="btn btn-outline btn-sm" onclick="expandCollapseAll('indivContainer',true)">${t('expand_all')}</button>
            <button class="btn btn-outline btn-sm" onclick="expandCollapseAll('indivContainer',false)">${t('collapse_all')}</button>
        </div>
        <div id="indivContainer">
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#1a365d;">Conformité — Détail des indicateurs</h3>
            ${confSection}
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#059669;">Performance — Détail des indicateurs</h3>
            ${perfSection}
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#d97706;">Complexité — Détail des indicateurs</h3>
            ${compSection}
        </div>`;
}

// Jauge demi-cercle du tableau de bord (aiguille + 3 zones de seuils).
// type 'conf'|'perf' : rouge→jaune→vert ; 'comp' : vert→jaune→rouge.
// Seuils (%) issus de la configuration des indices, par axe.
function prSeuils(type) {
    const c = APP_STATE.data.indices || {};
    const TH = {
        conf: { high: (c.conf1 ?? 0.80) * 100, low: (c.conf2 ?? 0.50) * 100 },
        perf: { high: (c.perf1 ?? 0.80) * 100, low: (c.perf2 ?? 0.50) * 100 },
        comp: { high: (c.expo1 ?? 0.80) * 100, low: (c.expo2 ?? 0.50) * 100 },
    };
    return TH[type] || TH.conf;
}

// Couleur d'un taux selon les seuils : conf/perf rouge→jaune→vert,
// complexité inversée (un taux élevé est défavorable).
function prTauxColor(pct, type) {
    const th = prSeuils(type);
    return (type === 'comp')
        ? (pct <= th.low ? '#22c55e' : pct <= th.high ? '#f59e0b' : '#ef4444')
        : (pct >= th.high ? '#22c55e' : pct >= th.low ? '#f59e0b' : '#ef4444');
}

function prMakeGauge(label, pct, type, opts) {
    const o = opts || {};
    const th = prSeuils(type);
    const isReverse = (type === 'comp');
    const valColor = prTauxColor(pct, type);
    const lowAngle = (th.low / 100) * 180;
    const highAngle = (th.high / 100) * 180;
    const needleDeg = (pct / 100) * 180;
    const pointAt = (deg, r) => {
        const rad = (-180 + deg) * Math.PI / 180;
        return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) };
    };
    const arcPath = (startDeg, endDeg) => {
        const s = pointAt(startDeg, 80), e = pointAt(endDeg, 80);
        return `M ${s.x} ${s.y} A 80 80 0 ${(endDeg - startDeg) > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
    };
    const c1 = isReverse ? '#22c55e' : '#ef4444';
    const c3 = isReverse ? '#ef4444' : '#22c55e';
    const np = pointAt(needleDeg, 60);
    const w = o.width || 150, h = o.height || 80;
    const noData = o.noData;
    // Taille de police du taux alignée sur celle du libellé de l'indicateur
    const fs = o.compact ? '0.72rem' : '0.8rem';

    return `<div class="chart-card" style="padding:${o.compact ? '0.35rem 0.4rem' : '0.5rem 0.75rem'};text-align:center;min-width:${o.minWidth || '150px'};flex:1;">
        <div style="font-weight:700;font-size:${fs};margin-bottom:0.2rem;">${label}</div>
        <svg viewBox="0 0 200 105" width="${w}" height="${h}" style="max-width:100%;">
            <path d="${arcPath(0, lowAngle)}" fill="none" stroke="${c1}" stroke-width="14" stroke-linecap="butt"/>
            <path d="${arcPath(lowAngle, highAngle)}" fill="none" stroke="#f59e0b" stroke-width="14" stroke-linecap="butt"/>
            <path d="${arcPath(highAngle, 180)}" fill="none" stroke="${c3}" stroke-width="14" stroke-linecap="butt"/>
            ${noData ? '' : `<line x1="100" y1="100" x2="${np.x}" y2="${np.y}" stroke="#1a365d" stroke-width="3" stroke-linecap="round"/>`}
            <circle cx="100" cy="100" r="5" fill="#1a365d"/>
            <text x="20" y="102" font-size="9" fill="#888">0%</text>
            <text x="168" y="102" font-size="9" fill="#888">100%</text>
        </svg>
        <div style="font-size:${fs};font-weight:800;color:${noData ? 'var(--text-muted)' : valColor};margin-top:0;">${noData ? '—' : pct.toFixed(1) + '%'}</div>
    </div>`;
}

// ── Écran « Statistiques » ──
// Un même jeu d'évaluations, regardé sous cinq angles : moyennes, tendances,
// répartition des risques, taux par secteur ou prestataire, et analyse par
// indicateur. Chaque angle a sa fabrique ; `renderStatistiques` les assemble.

// Dernière évaluation validée par prestataire, filtrée comme le tableau de bord.
function _prStatsPortee() {
    const D = APP_STATE.data;
    // Utilise les mêmes filtres que le tableau de bord
    const f = window._dashFilters || {};
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');

    // Get latest validated per prestataire
    const latestMap = {};
    allValids.forEach(ev => {
        const k = ev.prestataire_id;
        if (!latestMap[k] || new Date(ev.date_validation || ev.date) > new Date(latestMap[k].date_validation || latestMap[k].date)) latestMap[k] = ev;
    });
    let latestEvals = Object.values(latestMap);

    // Apply same dashboard filters
    latestEvals = latestEvals.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.prestataire && prest?.id !== f.prestataire) return false;
        return true;
    });

    // Risk distribution
    let riskCounts = { very_high: 0, high: 0, moderate: 0, low: 0, very_low: 0 };
    latestEvals.forEach(ev => {
        const r = ev.resultats?.global?.globalRisk?.risk || '';
        if (r.includes('Très élevé') || r.includes('Very High')) riskCounts.very_high++;
        else if (r.includes('Élevé') || r.includes('High')) riskCounts.high++;
        else if (r.includes('Modéré') || r.includes('Moderate')) riskCounts.moderate++;
        else if (r.includes('Très Faible') || r.includes('Very Low')) riskCounts.very_low++;
        else if (r.includes('Faible') || r.includes('Low')) riskCounts.low++;
    });
    // Compute global averages for gauges
    const avgConf = latestEvals.length ? latestEvals.reduce((s, e) => s + ((e.resultats?.global?.tauxConf || 0) * 100), 0) / latestEvals.length : 0;
    const avgPerf = latestEvals.length ? latestEvals.reduce((s, e) => s + ((e.resultats?.global?.tauxPerf || 0) * 100), 0) / latestEvals.length : 0;
    const avgComp = latestEvals.length ? latestEvals.reduce((s, e) => s + ((e.resultats?.global?.tauxComp || 0) * 100), 0) / latestEvals.length : 0;

    // Thresholds per indicator type
    const idxCfg = APP_STATE.data.indices || {};
    const thresholds = {
        conf: { high: (idxCfg.conf1 ?? 0.80) * 100, low: (idxCfg.conf2 ?? 0.50) * 100 },
        perf: { high: (idxCfg.perf1 ?? 0.80) * 100, low: (idxCfg.perf2 ?? 0.50) * 100 },
        comp: { high: (idxCfg.expo1 ?? 0.80) * 100, low: (idxCfg.expo2 ?? 0.50) * 100 }
    };

    const makeGauge = (label, pct, id, type) => prMakeGauge(label, pct, type);
    return { D, f, allValids, latestEvals, riskCounts, thresholds, avgConf, avgPerf, avgComp, makeGauge };
}

// Tendances : écart entre deux évaluations successives, par secteur ou prestataire.
function _prStatsTendancesHtml(D, allValids) {
    // ── Tendances — variation entre évaluations successives ──
    // Default: delta entre les 2 dernières évaluations validées d'un même prestataire.
    // Period: si l'utilisateur fournit une période, delta = dernière - première dans la plage.
    if (!window._dashTrend) window._dashTrend = { mode: 'prestataire', metric: 'conf', start: '', end: '' };
    const dt = window._dashTrend;
    const trendMetricMap = {
        conf: { key: 'tauxConf', label: 'Conformité' },
        perf: { key: 'tauxPerf', label: 'Performance' },
        comp: { key: 'tauxComp', label: 'Complexité' }
    };
    const tmInfo = trendMetricMap[dt.metric] || trendMetricMap.conf;

    const byPrestAllValid = {};
    allValids.forEach(ev => {
        const pid = ev.prestataire_id; if (!pid) return;
        if (!byPrestAllValid[pid]) byPrestAllValid[pid] = [];
        byPrestAllValid[pid].push(ev);
    });
    Object.values(byPrestAllValid).forEach(list => list.sort(
        (a, b) => new Date(a.date_validation || a.date) - new Date(b.date_validation || b.date)));

    const usePeriod = !!(dt.start || dt.end);
    const _startD = dt.start ? new Date(dt.start + 'T00:00:00') : null;
    const _endD   = dt.end   ? new Date(dt.end   + 'T23:59:59') : null;

    const deltas = [];
    Object.entries(byPrestAllValid).forEach(([pid, list]) => {
        let pair;
        if (usePeriod) {
            const inRange = list.filter(ev => {
                const d = new Date(ev.date_validation || ev.date);
                if (_startD && d < _startD) return false;
                if (_endD   && d > _endD)   return false;
                return true;
            });
            if (inRange.length < 2) return;
            pair = [inRange[0], inRange[inRange.length - 1]];
        } else {
            if (list.length < 2) return;
            pair = [list[list.length - 2], list[list.length - 1]];
        }
        const v1 = (pair[0].resultats?.global?.[tmInfo.key] || 0) * 100;
        const v2 = (pair[1].resultats?.global?.[tmInfo.key] || 0) * 100;
        deltas.push({ pid, secteur_id: pair[1].secteur_id, val: v2 - v1 });
    });

    // Apply dashboard filters
    const _dashF = window._dashFilters || {};
    const deltasFiltered = deltas.filter(d => {
        const se = (D.secteurs || []).find(s => s.id === d.secteur_id);
        if (_dashF.prestataire && d.pid !== _dashF.prestataire) return false;
        if (_dashF.secteur && d.secteur_id !== _dashF.secteur) return false;
        if (_dashF.domaine && se?.domaine_id !== _dashF.domaine) return false;
        return true;
    });

    // Aggregate by mode
    const trendGroups = {};
    deltasFiltered.forEach(d => {
        let gid, glbl;
        if (dt.mode === 'secteur') {
            const se = (D.secteurs || []).find(s => s.id === d.secteur_id);
            gid = d.secteur_id || '_'; glbl = se?.code || '?';
        } else {
            const pr = (D.prestataires || []).find(p => p.id === d.pid);
            gid = d.pid; glbl = pr?.trigramme || (pr?.nom ? pr.nom.slice(0, 3).toUpperCase() : '?');
        }
        if (!trendGroups[gid]) trendGroups[gid] = { label: glbl, sum: 0, n: 0 };
        trendGroups[gid].sum += d.val; trendGroups[gid].n += 1;
    });
    const trendItems = Object.values(trendGroups)
        .map(g => ({ label: g.label, val: g.n ? g.sum / g.n : 0 }))
        .sort((a, b) => b.val - a.val);

    // Waterfall-style vertical bar chart around a zero baseline
    let trendSvg = '';
    if (trendItems.length) {
        const W = 720, H = 175, padL = 30, padR = 10, padT = 14, padB = 40;
        const innerW = W - padL - padR, innerH = H - padT - padB;
        const maxAbs = Math.max(5, ...trendItems.map(t => Math.abs(t.val)));
        const zeroY = padT + innerH / 2;
        const yFor = v => zeroY - (v / maxAbs) * (innerH / 2);
        const slot = innerW / trendItems.length;
        const bw = Math.min(45, slot * 0.65);
        let grid = `<line x1="${padL}" y1="${zeroY}" x2="${padL+innerW}" y2="${zeroY}" stroke="#9ca3af" stroke-width="1"/>`;
        grid += `<text x="${padL-3}" y="${zeroY+2.5}" text-anchor="end" font-size="7" fill="#888">0</text>`;
        grid += `<text x="${padL-3}" y="${padT+4}" text-anchor="end" font-size="7" fill="#22c55e">+${maxAbs.toFixed(0)}</text>`;
        grid += `<text x="${padL-3}" y="${padT+innerH-1}" text-anchor="end" font-size="7" fill="#ef4444">-${maxAbs.toFixed(0)}</text>`;
        let bars = '', labels = '';
        trendItems.forEach((it, i) => {
            const cx = padL + slot * i + slot / 2;
            const bx = cx - bw / 2;
            const yT = Math.min(zeroY, yFor(it.val));
            const bh = Math.abs(yFor(it.val) - zeroY);
            const color = it.val >= 0 ? '#22c55e' : '#ef4444';
            bars += `<rect x="${bx}" y="${yT}" width="${bw}" height="${bh}" fill="${color}" rx="1.5"><title>${it.label} : ${it.val>=0?'+':''}${it.val.toFixed(1)} pts</title></rect>`;
            const valY = it.val >= 0 ? (yT - 3) : (yT + bh + 8);
            bars += `<text x="${cx}" y="${valY}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#333">${it.val>=0?'+':''}${it.val.toFixed(1)}</text>`;
            labels += `<text x="${cx}" y="${padT+innerH+12}" text-anchor="end" font-size="7.5" fill="#444" transform="rotate(-35 ${cx} ${padT+innerH+12})">${it.label}</text>`;
        });
        trendSvg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">${grid}${bars}${labels}</svg>`;
    } else {
        trendSvg = `<div class="text-center" style="padding:1.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">Pas de données suffisantes pour calculer les tendances ${usePeriod ? 'sur la période sélectionnée' : '(≥ 2 évaluations validées par prestataire requises)'}.</div>`;
    }

    const _trSel = 'padding:0.14rem 0.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.72rem;width:100%;';
    const trendChartHtml = `<div class="chart-card" style="padding:0.6rem 0.75rem;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
            <div style="font-weight:700;font-size:0.82rem;">Tendances — ${tmInfo.label} <span style="color:var(--text-muted);font-weight:400;font-size:0.72rem;">(Δ ${usePeriod ? 'sur période sélectionnée' : 'entre les 2 dernières évaluations'})</span></div>
            <button class="btn btn-outline btn-sm" style="margin-left:auto;font-size:0.72rem;padding:0.2rem 0.4rem;" onclick="window._dashTrend={mode:'prestataire',metric:'conf',start:'',end:''};renderPage();" title="Réinitialiser">${ICONS.refresh}</button>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:280px;">${trendSvg}</div>
            <div style="width:200px;display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;background:#f1f5f9;border:1px solid var(--border);border-radius:8px;padding:0.6rem;">
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Regroupement
                    <select onchange="window._dashTrend.mode=this.value;renderPage();" style="${_trSel}">
                        <option value="secteur" ${dt.mode==='secteur'?'selected':''}>Secteur</option>
                        <option value="prestataire" ${dt.mode==='prestataire'?'selected':''}>Prestataire</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Indicateur
                    <select onchange="window._dashTrend.metric=this.value;renderPage();" style="${_trSel}">
                        <option value="conf" ${dt.metric==='conf'?'selected':''}>Conformité</option>
                        <option value="perf" ${dt.metric==='perf'?'selected':''}>Performance</option>
                        <option value="comp" ${dt.metric==='comp'?'selected':''}>Complexité</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Période — Début
                    <input type="date" value="${dt.start || ''}" onchange="window._dashTrend.start=this.value;renderPage();" style="${_trSel}">
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Période — Fin
                    <input type="date" value="${dt.end || ''}" onchange="window._dashTrend.end=this.value;renderPage();" style="${_trSel}">
                </label>
            </div>
        </div>
    </div>`;
    return trendChartHtml;
}

// Répartition des niveaux de risque, en barres horizontales.
function _prStatsRisquesHtml(riskCounts) {
    // Répartition des risques - horizontal bar chart with color coding
    const riskBars = [
        { label: t('very_low'), value: riskCounts.very_low, color: '#22c55e' },
        { label: t('low'), value: riskCounts.low, color: '#84cc16' },
        { label: t('moderate'), value: riskCounts.moderate, color: '#f59e0b' },
        { label: t('high'), value: riskCounts.high, color: '#f97316' },
        { label: t('very_high'), value: riskCounts.very_high, color: '#ef4444' }
    ];
    const maxRisk = Math.max(1, ...riskBars.map(b => b.value));
    let riskBarChart = `<div class="chart-card" style="padding:0.75rem;flex:1;min-width:260px;display:flex;flex-direction:column;">
        <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.5rem;">${t('risk_distribution')}</div>
        <div style="display:flex;flex-direction:column;gap:0.3rem;">
            ${riskBars.map(b => {
                const wPct = Math.max(2, (b.value / maxRisk) * 100);
                return `<div style="display:flex;align-items:center;gap:0.5rem;">
                    <span style="min-width:75px;font-size:0.75rem;text-align:right;color:#555;font-weight:600;">${b.label}</span>
                    <div style="flex:1;background:#f3f4f6;border-radius:4px;height:22px;overflow:hidden;">
                        <div style="width:${wPct}%;background:${b.color};height:100%;border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;">
                            <span style="font-size:0.75rem;color:#fff;font-weight:700;">${b.value}</span>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
    return riskBarChart;
}

// Graphiques par sous-activité : ils suivent la barre sélectionnée dans « Taux ».
function _prStatsSousActivites(D, latestEvals, thresholds) {
    // Tendances par Sous-activité — filtré par la sélection de barre du graphique « Taux »
    // dbc.mode = 'secteur' → filtre par ev.secteur_id ; 'prestataire' → filtre par ev.prestataire_id
    // Aucune sélection => aucun graphique de sous-activité affiché.
    let saEvalsScope = [];
    if (window._dashBarChart && window._dashBarChart.selected) {
        const _sel = window._dashBarChart.selected;
        if (window._dashBarChart.mode === 'prestataire') {
            saEvalsScope = latestEvals.filter(e => e.prestataire_id === _sel);
        } else {
            saEvalsScope = latestEvals.filter(e => e.secteur_id === _sel);
        }
    }
    const saMap = {};
    saEvalsScope.forEach(ev => {
        const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
        sas.forEach(sa => {
            if (!saMap[sa.id]) saMap[sa.id] = { sa, confVals: [], compVals: [] };
            const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
            if (saRes.tauxConf !== undefined) saMap[sa.id].confVals.push(saRes.tauxConf * 100);
            if (saRes.tauxComp !== undefined) saMap[sa.id].compVals.push(saRes.tauxComp * 100);
        });
    });

    const confHigh = thresholds.conf.high;
    const confLow = thresholds.conf.low;
    // Reset SA bar charts each render so a previous selection's chart doesn't persist
    window._saBarChartsHtml = '';
    const saEntries = Object.values(saMap);
    if (saEntries.length) {

        // Bar charts per SA
        function makeSABarChart(title, dataMap, highThreshold, lowThreshold, colorMode) {
            // colorMode: 'conf' → rouge<low, orange entre, vert>high
            //            'comp' → vert<low, orange entre, rouge>high
            const entries = Object.values(dataMap).filter(e => e.vals.length > 0);
            if (!entries.length) return '';
            const maxVal = 100;
            const chartW = 500, chartH = 200, padL = 40, padR = 10, padT = 15, padB = 40;
            const w = chartW - padL - padR, h = chartH - padT - padB;
            const barW = Math.min(50, w / (entries.length * 1.5));
            function yPos(v) { return padT + h - (v / maxVal) * h; }
            const selSA = window._dashBarChart?.selectedSA || '';
            let bars = '', labels = '';
            entries.forEach((e, i) => {
                const x = padL + (i + 0.5) * (w / entries.length);
                const avg = e.vals.reduce((a, b) => a + b, 0) / e.vals.length;
                let bColor;
                if (colorMode === 'conf') {
                    bColor = avg >= highThreshold ? '#22c55e' : avg >= lowThreshold ? '#f59e0b' : '#ef4444';
                } else {
                    bColor = avg <= lowThreshold ? '#22c55e' : avg <= highThreshold ? '#f59e0b' : '#ef4444';
                }
                const bh = (avg / maxVal) * h;
                const isSel = selSA === e.id;
                const strokeAttr = isSel ? `stroke="#1f2937" stroke-width="2"` : '';
                const safeSaId = String(e.id || '').replace(/'/g, "\\'");
                bars += `<rect x="${x - barW / 2}" y="${yPos(avg)}" width="${barW}" height="${bh}" fill="${bColor}" rx="3" ${strokeAttr} style="cursor:pointer;" onclick="setSABarSelection('${safeSaId}')"><title>${e.code} : ${avg.toFixed(1)}%</title></rect>`;
                labels += `<text x="${x}" y="${chartH - 5}" text-anchor="middle" font-size="9" fill="${isSel ? '#1d4ed8' : '#666'}" font-weight="${isSel ? '700' : '400'}" style="cursor:pointer;" onclick="setSABarSelection('${safeSaId}')">${e.code}</text>`;
            });
            let yLabels = '';
            for (let v = 0; v <= 100; v += 25) {
                yLabels += `<text x="${padL - 5}" y="${yPos(v) + 3}" text-anchor="end" font-size="8" fill="#888">${v}%</text>`;
                yLabels += `<line x1="${padL}" y1="${yPos(v)}" x2="${padL + w}" y2="${yPos(v)}" stroke="#e5e7eb" stroke-width="0.5"/>`;
            }
            // Threshold lines
            const thLines = `
                <line x1="${padL}" y1="${yPos(highThreshold)}" x2="${padL + w}" y2="${yPos(highThreshold)}" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6 3"/>
                <text x="${padL + w + 2}" y="${yPos(highThreshold) + 3}" font-size="8" fill="#22c55e">${highThreshold}%</text>
                <line x1="${padL}" y1="${yPos(lowThreshold)}" x2="${padL + w}" y2="${yPos(lowThreshold)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 3"/>
                <text x="${padL + w + 2}" y="${yPos(lowThreshold) + 3}" font-size="8" fill="#ef4444">${lowThreshold}%</text>`;
            return `<div class="chart-card" style="padding:1rem;flex:1;min-width:300px;">
                <div style="font-weight:700;font-size:0.85rem;text-align:center;margin-bottom:0.5rem;">${title}</div>
                <svg viewBox="0 0 ${chartW + 30} ${chartH}" width="100%" preserveAspectRatio="xMidYMid meet">
                    ${yLabels}${bars}${labels}${thLines}
                </svg>
            </div>`;
        }

        const confSAData = {};
        const compSAData = {};
        saEntries.forEach(({ sa, confVals, compVals }) => {
            confSAData[sa.id] = { id: sa.id, code: sa.code, vals: confVals };
            compSAData[sa.id] = { id: sa.id, code: sa.code, vals: compVals };
        });

        // Bar charts stored separately for "Graphiques par Sous-activité" section
        window._saBarChartsHtml = `<div style="display:flex;gap:1rem;flex-wrap:wrap;">
            ${makeSABarChart('CONFORMITÉ', confSAData, thresholds.conf.high, thresholds.conf.low, 'conf')}
            ${makeSABarChart('COMPLEXITÉ', compSAData, thresholds.comp.high, thresholds.comp.low, 'comp')}
        </div>`;
    }
    return window._saBarChartsHtml || '';
}

// Analyses par indicateur : points à améliorer et points forts.
function _prStatsIndicateursHtml(D, latestEvals) {
    let indAnalysis = '';
    // Dynamique : par défaut tous les `latestEvals` ; sinon réduit à la sélection
    // de barre du graphique « Taux » (secteur ou prestataire), puis encore réduit
    // à la sélection d'une sous-activité dans « Graphiques par Sous-activité ».
    const _dbcEarly = window._dashBarChart || {};
    let indEvalsScope = latestEvals.slice();
    if (_dbcEarly.selected) {
        if (_dbcEarly.mode === 'prestataire') indEvalsScope = indEvalsScope.filter(e => e.prestataire_id === _dbcEarly.selected);
        else indEvalsScope = indEvalsScope.filter(e => e.secteur_id === _dbcEarly.selected);
    }
    const selSAId = _dbcEarly.selectedSA || '';
    let indScopeLabel = '';
    if (_dbcEarly.selected) {
        let _selLbl = '—';
        if (_dbcEarly.mode === 'prestataire') {
            const _pr = (D.prestataires || []).find(p => p.id === _dbcEarly.selected);
            _selLbl = _pr?.trigramme || _pr?.nom || '—';
        } else {
            const _se = (D.secteurs || []).find(s => s.id === _dbcEarly.selected);
            _selLbl = _se?.code || _se?.nom || '—';
        }
        indScopeLabel = ` — ${_dbcEarly.mode === 'prestataire' ? 'Prestataire' : 'Secteur'} : ${_selLbl}`;
    }
    if (selSAId) {
        const _sa = (D.sousActivites || []).find(x => x.id === selSAId);
        if (_sa) indScopeLabel += ` — SA : ${_sa.code}`;
    }

    if (indEvalsScope.length) {
        const confScores = {};
        const perfScores = {};
        const compScores = {};
        indEvalsScope.forEach(ev => {
            const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id
                && (!selSAId || sa.id === selSAId));
            const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id);
            sas.forEach(sa => confInds.forEach(ind => {
                const key = `${sa.id}_${ind.id}`;
                const n = ev.notes_conf?.[key];
                if (n) { if (!confScores[ind.id]) confScores[ind.id] = { ind, scores: [] }; confScores[ind.id].scores.push(n); }
            }));
            // Performance : pas de notion de sous-activité — n'inclure que si aucune SA sélectionnée
            if (!selSAId) {
                (D.indPerf || []).forEach(ind => {
                    const n = ev.notes_perf?.[ind.id];
                    if (n) { if (!perfScores[ind.id]) perfScores[ind.id] = { ind, scores: [] }; perfScores[ind.id].scores.push(n); }
                });
            }
            (D.indComplex || []).forEach(ind => {
                if (selSAId && ind.sous_activite_id !== selSAId) return;
                const n = ev.notes_comp?.[ind.id];
                if (n) { if (!compScores[ind.id]) compScores[ind.id] = { ind, scores: [] }; compScores[ind.id].scores.push(n); }
            });
        });

        function buildIndCards(scores, title, color) {
            const items = Object.values(scores).map(s => ({ code: s.ind.code, label: s.ind.label, avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length }));
            items.sort((a, b) => a.avg - b.avg);
            const weak = items.slice(0, 3);
            const strong = items.slice(-3).reverse();
            return `<div class="card" style="padding:1rem;border-top:3px solid ${color};">
                <h4 style="color:${color};">${title}</h4>
                <div style="margin-top:0.5rem;">
                    <div style="font-size:0.75rem;font-weight:700;color:#ef4444;margin-bottom:0.3rem;">POINTS À AMÉLIORER</div>
                    ${weak.map(i => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0.5rem;border-bottom:1px solid var(--border);font-size:0.82rem;">
                        <span>${i.code} - ${(i.label || '').substring(0, 40)}${(i.label || '').length > 40 ? '...' : ''}</span>
                        <strong>${i.avg.toFixed(2)}</strong>
                    </div>`).join('')}
                    <div style="font-size:0.75rem;font-weight:700;color:#22c55e;margin:0.5rem 0 0.3rem;">POINTS FORTS</div>
                    ${strong.map(i => `<div style="display:flex;justify-content:space-between;padding:0.3rem 0.5rem;border-bottom:1px solid var(--border);font-size:0.82rem;">
                        <span>${i.code} - ${(i.label || '').substring(0, 40)}${(i.label || '').length > 40 ? '...' : ''}</span>
                        <strong>${i.avg.toFixed(2)}</strong>
                    </div>`).join('')}
                </div>
            </div>`;
        }

        indAnalysis = `<h3 style="margin:1.5rem 0 0.5rem;font-size:0.82rem;font-weight:700;">Indicateurs - Analyses${indScopeLabel ? `<span style="font-size:0.72rem;font-weight:400;color:var(--text-muted);">${indScopeLabel}</span>` : ''}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;">
            ${buildIndCards(confScores, 'Conformité', '#1a365d')}
            ${selSAId ? '' : buildIndCards(perfScores, 'Performance', '#22c55e')}
            ${buildIndCards(compScores, 'Complexité', '#ef4444')}
        </div>`;
    }
    return indAnalysis;
}

// Taux par secteur ou par prestataire : le graphique et ses filtres. La barre
// choisie commande les graphiques par sous-activité et les analyses.
function _prStatsTauxHtml(D, latestEvals, allValids) {
    // ── Bar chart: Taux par Secteur / Prestataire (filtrable) ──
    if (!window._dashBarChart) {
        window._dashBarChart = { mode: 'secteur', metric: 'conf', secteur: '', prestataire: '', selected: '' };
    }
    const dbc = window._dashBarChart;
    if (typeof dbc.selected === 'undefined') dbc.selected = '';
    const metricMap = {
        conf: { key: 'tauxConf', label: 'Conformité',  color: '#3b82f6' },
        perf: { key: 'tauxPerf', label: 'Performance', color: '#22c55e' },
        comp: { key: 'tauxComp', label: 'Complexité',  color: '#ef4444' }
    };
    const mInfo = metricMap[dbc.metric] || metricMap.conf;
    // Apply chart-local filters on top of dashboard filters
    let barEvals = latestEvals.slice();
    if (dbc.secteur) barEvals = barEvals.filter(e => e.secteur_id === dbc.secteur);
    if (dbc.prestataire) barEvals = barEvals.filter(e => e.prestataire_id === dbc.prestataire);
    // Group by mode
    const grpAgg = {};
    barEvals.forEach(ev => {
        let gid, glbl;
        if (dbc.mode === 'prestataire') {
            const pr = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            gid = ev.prestataire_id || '_';
            // Identifier par sigle (trigramme) plutôt que par nom complet
            glbl = pr?.trigramme || (pr?.nom ? pr.nom.substring(0, 3).toUpperCase() : '(?)');
        } else {
            const se = (D.secteurs || []).find(s => s.id === ev.secteur_id);
            gid = ev.secteur_id || '_';
            glbl = se?.code || se?.nom || '(?)';
        }
        const val = (ev.resultats?.global?.[mInfo.key] || 0) * 100;
        if (!grpAgg[gid]) grpAgg[gid] = { gid, label: glbl, sum: 0, n: 0 };
        grpAgg[gid].sum += val; grpAgg[gid].n += 1;
    });
    const barItems = Object.values(grpAgg)
        .map(g => ({ gid: g.gid, label: g.label, val: g.n ? g.sum / g.n : 0 }))
        .sort((a, b) => b.val - a.val);
    // Build SVG vertical bar chart
    let tauxBarSvg = '';
    if (barItems.length) {
        // Hauteur réduite d'environ 1/3 (260 → 175) et polices plus petites
        const W = 720, H = 175, padL = 30, padR = 10, padT = 14, padB = 38;
        const innerW = W - padL - padR, innerH = H - padT - padB;
        const n = barItems.length;
        const slot = innerW / n;
        const bw = Math.min(50, slot * 0.65);
        const yPos = v => padT + innerH - (v / 100) * innerH;
        let grid = '';
        for (let v = 0; v <= 100; v += 25) {
            grid += `<line x1="${padL}" y1="${yPos(v)}" x2="${padL+innerW}" y2="${yPos(v)}" stroke="#e5e7eb" stroke-width="0.5"/>`;
            grid += `<text x="${padL-3}" y="${yPos(v)+2.5}" text-anchor="end" font-size="7" fill="#888">${v}%</text>`;
        }
        let bars = '', labels = '';
        barItems.forEach((it, i) => {
            const cx = padL + slot * i + slot / 2;
            const bx = cx - bw / 2;
            const by = yPos(it.val);
            const bh = (padT + innerH) - by;
            const isSel = dbc.selected === it.gid;
            const strokeAttr = isSel ? `stroke="#1f2937" stroke-width="2"` : '';
            const fillAttr = isSel ? '#1d4ed8' : mInfo.color;
            const safeGid = String(it.gid).replace(/'/g, "\\'");
            bars += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="${fillAttr}" ${strokeAttr} style="cursor:pointer;" onclick="setTauxBarSelection('${safeGid}')"><title>${it.label} : ${it.val.toFixed(1)}%</title></rect>`;
            bars += `<text x="${cx}" y="${by - 3}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#333" style="pointer-events:none;">${it.val.toFixed(1)}%</text>`;
            const lbl = (it.label || '').length > 14 ? it.label.slice(0, 13) + '…' : it.label;
            labels += `<text x="${cx}" y="${padT + innerH + 10}" text-anchor="end" font-size="7.5" fill="${isSel ? '#1d4ed8' : '#444'}" font-weight="${isSel ? '700' : '400'}" transform="rotate(-35 ${cx} ${padT + innerH + 10})" style="cursor:pointer;" onclick="setTauxBarSelection('${safeGid}')">${lbl}</text>`;
        });
        tauxBarSvg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
            ${grid}${bars}${labels}
        </svg>`;
    } else {
        tauxBarSvg = `<div class="text-center" style="padding:1.5rem;color:var(--text-muted);">${t('no_data')}</div>`;
    }

    const tauxBarSecteurOptions = (D.secteurs || []).map(s => `<option value="${s.id}" ${dbc.secteur===s.id?'selected':''}>${s.code || s.nom}</option>`).join('');
    const _evaluatedPrestIds = new Set(allValids.map(e => e.prestataire_id));
    const _dashPrestList = (D.prestataires || []).filter(p => p.actif !== false && p.actif !== 0 && _evaluatedPrestIds.has(p.id));
    const tauxBarPrestOptions = _dashPrestList.map(p => `<option value="${p.id}" ${dbc.prestataire===p.id?'selected':''}>${p.nom}</option>`).join('');
    const _selStyle = 'padding:0.14rem 0.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.72rem;width:100%;';
    const tauxBarChart = `<div class="chart-card" style="padding:0.6rem 0.75rem;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
            <div style="font-weight:700;font-size:0.82rem;">Taux par ${dbc.mode === 'prestataire' ? 'prestataire' : 'secteur'} — ${mInfo.label}</div>
            <button class="btn btn-outline btn-sm" style="margin-left:auto;font-size:0.72rem;padding:0.2rem 0.4rem;" onclick="window._dashBarChart={mode:'secteur',metric:'conf',secteur:'',prestataire:'',selected:''};renderPage();" title="Réinitialiser">${ICONS.refresh}</button>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:280px;">${tauxBarSvg}</div>
            <div style="width:200px;display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;background:#f1f5f9;border:1px solid var(--border);border-radius:8px;padding:0.6rem;">
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Regroupement
                    <select onchange="window._dashBarChart.mode=this.value;window._dashBarChart.selected='';renderPage();" style="${_selStyle}">
                        <option value="secteur" ${dbc.mode==='secteur'?'selected':''}>Secteur</option>
                        <option value="prestataire" ${dbc.mode==='prestataire'?'selected':''}>Prestataire</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Indicateur
                    <select onchange="window._dashBarChart.metric=this.value;renderPage();" style="${_selStyle}">
                        <option value="conf" ${dbc.metric==='conf'?'selected':''}>Conformité</option>
                        <option value="perf" ${dbc.metric==='perf'?'selected':''}>Performance</option>
                        <option value="comp" ${dbc.metric==='comp'?'selected':''}>Complexité</option>
                    </select>
                </label>
                ${dbc.selected ? `<div style="font-size:0.7rem;color:var(--text-muted);">Sélection : <strong style="color:#1d4ed8;">${(grpAgg[dbc.selected]?.label || '—')}</strong></div>` : `<div style="font-size:0.7rem;color:var(--text-muted);font-style:italic;">Cliquez une barre pour filtrer les graphiques par sous-activité</div>`}
            </div>
        </div>
    </div>`;
    return { html: tauxBarChart, dbc, grpAgg };
}

function renderStatistiques() {
    const { D, allValids, latestEvals, riskCounts, thresholds, avgConf, avgPerf, avgComp, makeGauge } = _prStatsPortee();
    const trendChartHtml = _prStatsTendancesHtml(D, allValids);
    const riskBarChart = _prStatsRisquesHtml(riskCounts);
    const { html: tauxBarChart, dbc, grpAgg } = _prStatsTauxHtml(D, latestEvals, allValids);
    // L'ordre compte : les graphiques par sous-activité lisent la sélection
    // posée par le graphique « Taux ».
    const saBarChartsSection = _prStatsSousActivites(D, latestEvals, thresholds);
    const indAnalysis = _prStatsIndicateursHtml(D, latestEvals);

    return `<div id="statsPrintStart"></div>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;align-items:stretch;">
        <div style="flex:1 1 calc(20% - 0.75rem);min-width:140px;display:flex;">${makeGauge('Conformité', avgConf, 'conf', 'conf')}</div>
        <div style="flex:1 1 calc(20% - 0.75rem);min-width:140px;display:flex;">${makeGauge('Performance', avgPerf, 'perf', 'perf')}</div>
        <div style="flex:1 1 calc(20% - 0.75rem);min-width:140px;display:flex;">${makeGauge('Complexité', avgComp, 'comp', 'comp')}</div>
        <div style="flex:2 1 calc(40% - 0.75rem);min-width:280px;display:flex;">${riskBarChart}</div>
    </div>
    ${trendChartHtml}
    ${tauxBarChart}
    <h3 style="margin-bottom:0.5rem;font-size:0.82rem;font-weight:700;">Graphiques par Sous-activité ${dbc.selected ? `<span style="font-size:0.72rem;font-weight:400;color:var(--text-muted);">— ${(dbc.mode === 'prestataire' ? 'Prestataire' : 'Secteur')} : <strong style="color:#1d4ed8;">${grpAgg[dbc.selected]?.label || '—'}</strong></span>` : ''}</h3>
    ${saBarChartsSection || `<div class="text-center" style="padding:1rem;color:var(--text-muted);font-style:italic;font-size:0.85rem;">Sélectionnez une barre dans le graphique « Taux » ci-dessus pour afficher les graphiques par sous-activité.</div>`}
    ${indAnalysis}`;
}

function printPage(startId) {
    const aac = APP_STATE.data.aac || {};
    const headerHtml = `<div class="print-header" style="display:flex;align-items:center;gap:1rem;border-bottom:2px solid #1a365d;padding-bottom:0.5rem;margin-bottom:1rem;">
        ${aac.logo_data ? `<img src="${aac.logo_data}" style="height:50px;">` : ''}
        <div style="flex:1;">
            <div style="font-weight:700;font-size:1rem;color:#1a365d;">${aac.nom || "Autorité de l'Aviation Civile"}</div>
            <div style="font-size:0.8rem;color:#555;">${aac.ville || ''} ${aac.etat || ''}</div>
        </div>
        <div style="text-align:right;font-size:0.75rem;color:#888;">
            <div>${new Date().toLocaleDateString()}</div>
            <div>${aac.sigle || 'AAC'} - Profil de Risque</div>
        </div>
    </div>`;
    const startEl = document.getElementById(startId);
    if (!startEl) return;
    // Expand all accordions before printing
    const container = startEl.parentElement;
    container.querySelectorAll('.accordion-header').forEach(h => h.classList.add('expanded'));
    container.querySelectorAll('.accordion-body').forEach(b => b.classList.add('expanded'));
    container.querySelectorAll('[onclick*="toggleAccordion"]').forEach(btn => btn.classList.add('expanded'));
    // Collect all content from startEl onwards (skip sub-nav)
    let printContent = '';
    let el = startEl;
    while (el) { printContent += el.outerHTML; el = el.nextElementSibling; }
    const printWin = window.open('', '_blank');
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('');
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('print')}</title>${styles}
        <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            @media print { @page { margin: 15mm; } }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 1rem; margin: 0; color: #1e293b; }
            .print-header { page-break-after: avoid; }
            .filters-bar, .page-header button, .filter-actions { display:none !important; }
            .stat-card, .chart-card, .card { break-inside: avoid; }
            .accordion-body { display:block !important; max-height:none !important; overflow:visible !important; }
            table { width:100% !important; }
        </style>
    </head><body>${headerHtml}${printContent}</body></html>`);
    printWin.document.close();
    printWin.onload = () => { printWin.print(); };
}


