// OASIS — « Profils de Risque » (PR) — les statistiques par indicateur et par taux, l'assemblage de l'écran, et l'impression (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import { requis, t } from './partage';
import type { EvaluationPr, IndicateurPr } from './formes';
import { _prStatsPortee, _prStatsRisquesHtml, _prStatsSousActivites, _prStatsTendancesHtml } from './statistiques';

/** Les notes relevées pour un indicateur. */
interface NotesIndicateur { ind: IndicateurPr; scores: number[] }
/** Une barre du graphe des taux. */
interface GroupeTaux { gid: string; label: string; sum: number; n: number }
/** L'état du graphe des taux. */
type EtatGraphe = NonNullable<Window['_dashBarChart']>;


// Analyses par indicateur : points à améliorer et points forts.
export function _prStatsIndicateursHtml(D: DonneesPr, latestEvals: EvaluationPr[]): string {
    let indAnalysis = '';
    // Dynamique : par défaut tous les `latestEvals` ; sinon réduit à la sélection
    // de barre du graphique « Taux » (secteur ou prestataire), puis encore réduit
    // à la sélection d'une sous-activité dans « Graphiques par Sous-activité ».
    const _dbcEarly: Partial<EtatGraphe> = window._dashBarChart || {};
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
        const confScores: Record<string, NotesIndicateur> = {};
        const perfScores: Record<string, NotesIndicateur> = {};
        const compScores: Record<string, NotesIndicateur> = {};
        indEvalsScope.forEach(ev => {
            const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id
                && (!selSAId || sa.id === selSAId));
            const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id);
            sas.forEach(sa => confInds.forEach(ind => {
                const key = `${sa.id}_${ind.id}`;
                const n = ev.notes_conf?.[key];
                if (n) { if (!confScores[ind.id]) confScores[ind.id] = { ind, scores: [] }; (confScores[ind.id] as NotesIndicateur).scores.push(n); }
            }));
            // Performance : pas de notion de sous-activité — n'inclure que si aucune SA sélectionnée
            if (!selSAId) {
                (D.indPerf || []).forEach(ind => {
                    const n = ev.notes_perf?.[ind.id];
                    if (n) { if (!perfScores[ind.id]) perfScores[ind.id] = { ind, scores: [] }; (perfScores[ind.id] as NotesIndicateur).scores.push(n); }
                });
            }
            (D.indComplex || []).forEach(ind => {
                if (selSAId && ind.sous_activite_id !== selSAId) return;
                const n = ev.notes_comp?.[ind.id];
                if (n) { if (!compScores[ind.id]) compScores[ind.id] = { ind, scores: [] }; (compScores[ind.id] as NotesIndicateur).scores.push(n); }
            });
        });

        function buildIndCards(scores: Record<string, NotesIndicateur>, title: string, color: string): string {
            const items = Object.values(scores).map(s => ({ code: s.ind.code, label: s.ind.label, avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length }));
            items.sort((a, b) => a.avg - b.avg);
            const weak = items.slice(0, 3);
            const strong = items.slice(-3).reverse();
            return `<div class="card" style="padding:1rem;border-top:3px solid ${color};">
                <h4 style="color:${color};">${title}</h4>
                <div style="margin-top:0.5rem;">
                    <div style="font-size:0.75rem;font-weight:700;color:#ef4444;margin-bottom:0.3rem;">${t('improvement_points')}</div>
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
export function _prStatsTauxHtml(D: DonneesPr, latestEvals: EvaluationPr[], allValids: EvaluationPr[]): { html: string; dbc: EtatGraphe; grpAgg: Record<string, GroupeTaux> } {
    // ── Bar chart: Taux par Secteur / Prestataire (filtrable) ──
    if (!window._dashBarChart) {
        window._dashBarChart = { mode: 'secteur', metric: 'conf', secteur: '', prestataire: '', selected: '' };
    }
    const dbc = window._dashBarChart as EtatGraphe;
    if (typeof dbc.selected === 'undefined') dbc.selected = '';
    const metricMap: Record<string, { key: 'tauxConf' | 'tauxPerf' | 'tauxComp'; label: string; color: string } | undefined> & { conf: { key: 'tauxConf'; label: string; color: string } } = {
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
    const grpAgg: Record<string, GroupeTaux> = {};
    barEvals.forEach(ev => {
        let gid: string, glbl: string;
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
        const groupe = grpAgg[gid] as GroupeTaux;
        groupe.sum += val; groupe.n += 1;
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
        const yPos = (v: number): number => padT + innerH - (v / 100) * innerH;
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
    const tauxBarPrestOptions = _dashPrestList.map(p => `<option value="${p.id}" ${dbc.prestataire===p.id?'selected':''}>${window.escapeHtml(p.nom)}</option>`).join('');
    const _selStyle = 'padding:0.14rem 0.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);font-size:0.72rem;width:100%;';
    const tauxBarChart = `<div class="chart-card" style="padding:0.6rem 0.75rem;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
            <div style="font-weight:700;font-size:0.82rem;">Taux par ${dbc.mode === 'prestataire' ? 'prestataire' : 'secteur'} — ${mInfo.label}</div>
            <button class="btn btn-outline btn-sm" style="margin-left:auto;font-size:0.72rem;padding:0.2rem 0.4rem;" onclick="window._dashBarChart={mode:'secteur',metric:'conf',secteur:'',prestataire:'',selected:''};renderPage();" title="${t('reset_filters')}">${window.ICONS['refresh']}</button>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:280px;">${tauxBarSvg}</div>
            <div style="width:200px;display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;background:#f1f5f9;border:1px solid var(--border);border-radius:8px;padding:0.6rem;">
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Regroupement
                    <select onchange="window._dashBarChart.mode=this.value;window._dashBarChart.selected='';renderPage();" style="${_selStyle}">
                        <option value="secteur" ${dbc.mode==='secteur'?'selected':''}>${t('sector')}</option>
                        <option value="prestataire" ${dbc.mode==='prestataire'?'selected':''}>${t('provider')}</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Indicateur
                    <select onchange="window._dashBarChart.metric=this.value;renderPage();" style="${_selStyle}">
                        <option value="conf" ${dbc.metric==='conf'?'selected':''}>${t('conformity')}</option>
                        <option value="perf" ${dbc.metric==='perf'?'selected':''}>Performance</option>
                        <option value="comp" ${dbc.metric==='comp'?'selected':''}>${t('complexity')}</option>
                    </select>
                </label>
                ${dbc.selected ? `<div style="font-size:0.7rem;color:var(--text-muted);">${t('selection_label')} <strong style="color:#1d4ed8;">${(grpAgg[dbc.selected]?.label || '—')}</strong></div>` : `<div style="font-size:0.7rem;color:var(--text-muted);font-style:italic;">${t('click_bar_filter')}</div>`}
            </div>
        </div>
    </div>`;
    return { html: tauxBarChart, dbc, grpAgg };
}

export function renderStatistiques(): string {
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

export function printPage(startId: string): void {
    const aac = requis('APP_STATE').data!.aac || {};
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
    // L'ancien lisait le parent sans vérifier : `!` le dit, et la lecture lève de même.
    const container = startEl.parentElement!;
    container.querySelectorAll('.accordion-header').forEach(h => h.classList.add('expanded'));
    container.querySelectorAll('.accordion-body').forEach(b => b.classList.add('expanded'));
    container.querySelectorAll('[onclick*="toggleAccordion"]').forEach(btn => btn.classList.add('expanded'));
    // Collect all content from startEl onwards (skip sub-nav)
    let printContent = '';
    let el: Element | null = startEl;
    while (el) { printContent += el.outerHTML; el = el.nextElementSibling; }
    // Une fenêtre refusée lève à la ligne suivante, comme avant : `!` le dit.
    const printWin = window.open('', '_blank')!;
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
