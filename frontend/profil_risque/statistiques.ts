// OASIS — « Profils de Risque » (PR) — l'écran des statistiques : la portée, les tendances, les risques, les sous-activités (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import type { EvaluationPr, SousActivitePr } from './formes';
import { prMakeGauge, type SeuilsPr } from './profils-jauges';

/** La répartition des risques. */
export interface RepartitionRisques { very_high: number; high: number; moderate: number; low: number; very_low: number }
/** Les seuils des trois axes. */
export interface SeuilsAxes { conf: SeuilsPr; perf: SeuilsPr; comp: SeuilsPr }
/** Les filtres du tableau de bord, que les statistiques reprennent. */
type FiltresTableau = Partial<{ domaine: string; secteur: string; prestataire: string }>;
/** Ce que la portée des statistiques rend à ceux qui l'assemblent. */
export interface PorteeStats {
  D: DonneesPr; f: FiltresTableau; allValids: EvaluationPr[]; latestEvals: EvaluationPr[]; riskCounts: RepartitionRisques;
  thresholds: SeuilsAxes; avgConf: number; avgPerf: number; avgComp: number;
  makeGauge: (label: string, pct: number, id: string, type: string) => string;
}
/** Les valeurs d'une sous-activité, pour ses graphes. */
interface ValeursSa { id: string; code: string | undefined; vals: number[] }
import { requis, t } from './partage';

// ── Écran « Statistiques » ──
// Un même jeu d'évaluations, regardé sous cinq angles : moyennes, tendances,
// répartition des risques, taux par secteur ou prestataire, et analyse par
// indicateur. Chaque angle a sa fabrique ; `renderStatistiques` les assemble.

// Dernière évaluation validée par prestataire, filtrée comme le tableau de bord.
export function _prStatsPortee(): PorteeStats {
    const D = requis('APP_STATE').data!;
    // Utilise les mêmes filtres que le tableau de bord
    const f: FiltresTableau = window._dashFilters || {};
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');

    // Get latest validated per prestataire
    const latestMap: Record<string, EvaluationPr> = {};
    allValids.forEach(ev => {
        const k = ev.prestataire_id as string;
        if (!latestMap[k] || new Date((ev.date_validation || ev.date) as string).getTime() > new Date(((latestMap[k] as EvaluationPr).date_validation || (latestMap[k] as EvaluationPr).date) as string).getTime()) latestMap[k] = ev;
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
    let riskCounts: RepartitionRisques = { very_high: 0, high: 0, moderate: 0, low: 0, very_low: 0 };
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
    const idxCfg = requis('APP_STATE').data!.indices || {};
    const thresholds: SeuilsAxes = {
        conf: { high: (idxCfg.conf1 ?? 0.80) * 100, low: (idxCfg.conf2 ?? 0.50) * 100 },
        perf: { high: (idxCfg.perf1 ?? 0.80) * 100, low: (idxCfg.perf2 ?? 0.50) * 100 },
        comp: { high: (idxCfg.expo1 ?? 0.80) * 100, low: (idxCfg.expo2 ?? 0.50) * 100 }
    };

    const makeGauge = (label: string, pct: number, id: string, type: string): string => prMakeGauge(label, pct, type);
    return { D, f, allValids, latestEvals, riskCounts, thresholds, avgConf, avgPerf, avgComp, makeGauge };
}

// Tendances : écart entre deux évaluations successives, par secteur ou prestataire.
export function _prStatsTendancesHtml(D: DonneesPr, allValids: EvaluationPr[]): string {
    // ── Tendances — variation entre évaluations successives ──
    // Default: delta entre les 2 dernières évaluations validées d'un même prestataire.
    // Period: si l'utilisateur fournit une période, delta = dernière - première dans la plage.
    if (!window._dashTrend) window._dashTrend = { mode: 'prestataire', metric: 'conf', start: '', end: '' };
    const dt = window._dashTrend;
    const trendMetricMap: Record<string, { key: 'tauxConf' | 'tauxPerf' | 'tauxComp'; label: string } | undefined> & { conf: { key: 'tauxConf'; label: string } } = {
        conf: { key: 'tauxConf', label: 'Conformité' },
        perf: { key: 'tauxPerf', label: 'Performance' },
        comp: { key: 'tauxComp', label: 'Complexité' }
    };
    const tmInfo = trendMetricMap[dt.metric] || trendMetricMap.conf;

    const byPrestAllValid: Record<string, EvaluationPr[]> = {};
    allValids.forEach(ev => {
        const pid = ev.prestataire_id; if (!pid) return;
        if (!byPrestAllValid[pid]) byPrestAllValid[pid] = [];
        (byPrestAllValid[pid] as EvaluationPr[]).push(ev);
    });
    Object.values(byPrestAllValid).forEach(list => list.sort(
        (a, b) => new Date((a.date_validation || a.date) as string).getTime() - new Date((b.date_validation || b.date) as string).getTime()));

    const usePeriod = !!(dt.start || dt.end);
    const _startD = dt.start ? new Date(dt.start + 'T00:00:00') : null;
    const _endD   = dt.end   ? new Date(dt.end   + 'T23:59:59') : null;

    const deltas: { pid: string; secteur_id: string | undefined; val: number }[] = [];
    Object.entries(byPrestAllValid).forEach(([pid, list]) => {
        let pair: (EvaluationPr | undefined)[];
        if (usePeriod) {
            const inRange = list.filter(ev => {
                const d = new Date((ev.date_validation || ev.date) as string);
                // Les dates se comparent par leur valeur numérique, que `getTime` rend.
                if (_startD && d.getTime() < _startD.getTime()) return false;
                if (_endD   && d.getTime() > _endD.getTime())   return false;
                return true;
            });
            if (inRange.length < 2) return;
            pair = [inRange[0], inRange[inRange.length - 1]];
        } else {
            if (list.length < 2) return;
            pair = [list[list.length - 2], list[list.length - 1]];
        }
        // La paire a deux éléments : les deux `as` le disent.
        const [premier, dernier] = pair as [EvaluationPr, EvaluationPr];
        const v1 = (premier.resultats?.global?.[tmInfo.key] || 0) * 100;
        const v2 = (dernier.resultats?.global?.[tmInfo.key] || 0) * 100;
        deltas.push({ pid, secteur_id: dernier.secteur_id, val: v2 - v1 });
    });

    // Apply dashboard filters
    const _dashF: FiltresTableau = window._dashFilters || {};
    const deltasFiltered = deltas.filter(d => {
        const se = (D.secteurs || []).find(s => s.id === d.secteur_id);
        if (_dashF.prestataire && d.pid !== _dashF.prestataire) return false;
        if (_dashF.secteur && d.secteur_id !== _dashF.secteur) return false;
        if (_dashF.domaine && se?.domaine_id !== _dashF.domaine) return false;
        return true;
    });

    // Aggregate by mode
    const trendGroups: Record<string, { label: string; sum: number; n: number }> = {};
    deltasFiltered.forEach(d => {
        let gid: string, glbl: string;
        if (dt.mode === 'secteur') {
            const se = (D.secteurs || []).find(s => s.id === d.secteur_id);
            gid = d.secteur_id || '_'; glbl = se?.code || '?';
        } else {
            const pr = (D.prestataires || []).find(p => p.id === d.pid);
            gid = d.pid; glbl = pr?.trigramme || (pr?.nom ? pr.nom.slice(0, 3).toUpperCase() : '?');
        }
        if (!trendGroups[gid]) trendGroups[gid] = { label: glbl, sum: 0, n: 0 };
        const groupe = trendGroups[gid] as { label: string; sum: number; n: number };
        groupe.sum += d.val; groupe.n += 1;
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
        const yFor = (v: number): number => zeroY - (v / maxAbs) * (innerH / 2);
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
            <button class="btn btn-outline btn-sm" style="margin-left:auto;font-size:0.72rem;padding:0.2rem 0.4rem;" onclick="window._dashTrend={mode:'prestataire',metric:'conf',start:'',end:''};renderPage();" title="${t('reset_filters')}">${window.ICONS['refresh']}</button>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:280px;">${trendSvg}</div>
            <div style="width:200px;display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;background:#f1f5f9;border:1px solid var(--border);border-radius:8px;padding:0.6rem;">
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Regroupement
                    <select onchange="window._dashTrend.mode=this.value;renderPage();" style="${_trSel}">
                        <option value="secteur" ${dt.mode==='secteur'?'selected':''}>${t('sector')}</option>
                        <option value="prestataire" ${dt.mode==='prestataire'?'selected':''}>${t('provider')}</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">Indicateur
                    <select onchange="window._dashTrend.metric=this.value;renderPage();" style="${_trSel}">
                        <option value="conf" ${dt.metric==='conf'?'selected':''}>${t('conformity')}</option>
                        <option value="perf" ${dt.metric==='perf'?'selected':''}>Performance</option>
                        <option value="comp" ${dt.metric==='comp'?'selected':''}>${t('complexity')}</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">${t('period_start')}
                    <input type="date" value="${dt.start || ''}" onchange="window._dashTrend.start=this.value;renderPage();" style="${_trSel}">
                </label>
                <label style="display:flex;flex-direction:column;gap:0.1rem;">${t('period_end')}
                    <input type="date" value="${dt.end || ''}" onchange="window._dashTrend.end=this.value;renderPage();" style="${_trSel}">
                </label>
            </div>
        </div>
    </div>`;
    return trendChartHtml;
}

// Répartition des niveaux de risque, en barres horizontales.
export function _prStatsRisquesHtml(riskCounts: RepartitionRisques): string {
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
export function _prStatsSousActivites(D: DonneesPr, latestEvals: EvaluationPr[], thresholds: SeuilsAxes): string {
    // Tendances par Sous-activité — filtré par la sélection de barre du graphique « Taux »
    // dbc.mode = 'secteur' → filtre par ev.secteur_id ; 'prestataire' → filtre par ev.prestataire_id
    // Aucune sélection => aucun graphique de sous-activité affiché.
    let saEvalsScope: EvaluationPr[] = [];
    if (window._dashBarChart && window._dashBarChart.selected) {
        const _sel = window._dashBarChart.selected;
        if (window._dashBarChart.mode === 'prestataire') {
            saEvalsScope = latestEvals.filter(e => e.prestataire_id === _sel);
        } else {
            saEvalsScope = latestEvals.filter(e => e.secteur_id === _sel);
        }
    }
    const saMap: Record<string, { sa: SousActivitePr; confVals: number[]; compVals: number[] }> = {};
    saEvalsScope.forEach(ev => {
        const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
        sas.forEach(sa => {
            if (!saMap[sa.id]) saMap[sa.id] = { sa, confVals: [], compVals: [] };
            const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
            const entree = saMap[sa.id] as { sa: SousActivitePr; confVals: number[]; compVals: number[] };
            if (saRes.tauxConf !== undefined) entree.confVals.push(saRes.tauxConf * 100);
            if (saRes.tauxComp !== undefined) entree.compVals.push(saRes.tauxComp * 100);
        });
    });

    const confHigh = thresholds.conf.high;
    const confLow = thresholds.conf.low;
    // Reset SA bar charts each render so a previous selection's chart doesn't persist
    window._saBarChartsHtml = '';
    const saEntries = Object.values(saMap);
    if (saEntries.length) {

        // Bar charts per SA
        function makeSABarChart(title: string, dataMap: Record<string, ValeursSa>, highThreshold: number, lowThreshold: number, colorMode: string): string {
            // colorMode: 'conf' → rouge<low, orange entre, vert>high
            //            'comp' → vert<low, orange entre, rouge>high
            const entries = Object.values(dataMap).filter(e => e.vals.length > 0);
            if (!entries.length) return '';
            const maxVal = 100;
            const chartW = 500, chartH = 200, padL = 40, padR = 10, padT = 15, padB = 40;
            const w = chartW - padL - padR, h = chartH - padT - padB;
            const barW = Math.min(50, w / (entries.length * 1.5));
            function yPos(v: number): number { return padT + h - (v / maxVal) * h; }
            const selSA = window._dashBarChart?.selectedSA || '';
            let bars = '', labels = '';
            entries.forEach((e, i) => {
                const x = padL + (i + 0.5) * (w / entries.length);
                const avg = e.vals.reduce((a, b) => a + b, 0) / e.vals.length;
                let bColor: string;
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

        const confSAData: Record<string, ValeursSa> = {};
        const compSAData: Record<string, ValeursSa> = {};
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
