// OASIS — « Profils de Risque » (PR) — le volet d'un indicateur et celui d'un groupe, comparés aux pairs (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import type { EvaluationPr, IndicateurPr, PrestatairePr } from './formes';

/** Le champ des notes d'un axe. */
type CleNotes = 'notes_conf' | 'notes_perf' | 'notes_comp';
/** Le taux d'un groupe d'indicateurs pour une évaluation. */
interface TauxGroupe { sum: number; max: number; cnt: number; total: number; taux: number }
import { requis, t } from './partage';

// Open right-side slicer (1/4 viewport) with indicator details + peer benchmark
// for the "Profil individuel" view. Compares the prestataire to other prestataires
// of the same secteur (latest validated eval per peer).
export function openIndividualIndicator(evalId: string, type: string, indId: string, saId?: string): void {
    // L'ancien lisait la liste sans vérifier : `!` le dit, et la lecture lève de même.
    const ev = requis('APP_STATE').data!.evaluations!.find(e => e.id === evalId);
    if (!ev) return;
    const D = requis('APP_STATE').data!;
    let ind: IndicateurPr | undefined, scoreKey: string, noteField: CleNotes, color: string;
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
        .sort((a, b) => new Date((b.date_validation || b.date) as string).getTime() - new Date((a.date_validation || a.date) as string).getTime())[0];
    const prevScore = myPrev?.[noteField]?.[scoreKey] || 0;

    // Peers (same secteur, latest valid per prestataire, excluding self)
    const peersMap: Record<string, EvaluationPr> = {};
    (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.secteur_id === ev.secteur_id && e.prestataire_id !== ev.prestataire_id)
        .forEach(e => {
            const k = e.prestataire_id as string;
            if (!peersMap[k] || new Date((e.date_validation || e.date) as string).getTime() > new Date(((peersMap[k] as EvaluationPr).date_validation || (peersMap[k] as EvaluationPr).date) as string).getTime()) peersMap[k] = e;
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
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    peers.forEach(p => { if (dist[p.score] !== undefined) dist[p.score] = (dist[p.score] as number) + 1; });
    const totalPeers = peers.length;
    const isComp = (type === 'comp');
    const segColors: Record<number, string> = isComp ? { 1:'#22c55e', 2:'#f59e0b', 3:'#ef4444' } : { 1:'#ef4444', 2:'#f59e0b', 3:'#22c55e' };

    // Average peer score
    const peerAvg = totalPeers ? (peers.reduce((s, p) => s + p.score, 0) / totalPeers) : 0;

    // Rank of current prestataire vs peers (1 = meilleur)
    // For conf/perf: higher = better. For comp: lower = better.
    let rank: number | null = null;
    if (currentScore && totalPeers) {
        const allScores = peers.map(p => p.score).concat([currentScore]).sort((a, b) => isComp ? (a - b) : (b - a));
        rank = allScores.indexOf(currentScore) + 1;
    }

    // Pill (same logic as the card pill)
    function _pill(score: number): string {
        const cols = isComp ? ['#22c55e','#f59e0b','#ef4444'] : ['#ef4444','#f59e0b','#22c55e'];
        const fill = (score >= 1 && score <= 3) ? cols[score - 1] : '#e5e7eb';
        return `<div style="display:flex;width:100%;border:1px solid #d1d5db;border-radius:11px;overflow:hidden;background:#f9fafb;">
            ${[1,2,3].map(n => `<div style="flex:1;height:16px;background:${(score>=n&&score>=1)?fill:'#e5e7eb'};border-radius:${n===1?'10px 0 0 10px':(n===3?'0 10px 10px 0':'0')};"></div>`).join('')}
        </div>`;
    }

    // Trend arrow text
    let trendLine = '<div style="color:var(--text-muted);font-style:italic;font-size:0.78rem;">' + t('no_previous_eval') + '</div>';
    if (currentScore && prevScore) {
        const diff = currentScore - prevScore;
        let icon: string, col: string, lbl: string;
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
    const _esc = window.oasisEsc;
    const distHtml = totalPeers ? `<div style="margin-top:0.3rem;">
        ${[1,2,3].map(n => {
            // `n` parcourt 1, 2 et 3, les trois clés de la répartition.
            const pct = totalPeers ? ((dist[n] as number)/totalPeers*100) : 0;
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
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${t('trend_vs_previous')}</div>
            ${trendLine}
        </div>

        ${criteriaHtml ? `<div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">${t('assessment_criteria')}</div>
            ${criteriaHtml}
        </div>` : ''}

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${t('position_vs_peers')}</div>
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
                    <div style="color:var(--text-muted);font-size:0.7rem;">${t('peers_assessed')}</div>
                    <strong style="font-size:0.9rem;">${totalPeers}</strong>
                </div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.4rem;">${t('scores_distribution')}</div>
            ${distHtml}
            ${peerListHtml ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">${t('detail_by_provider')}</div>${peerListHtml}` : ''}
        </div>
    </div>`;

    requis('openSlicer')(`${ind.code}`, bodyHtml, '', { drawer: true });
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
export function openIndividualGroup(evalId: string, type: string, saId?: string): void {
    const ev = requis('APP_STATE').data!.evaluations!.find(e => e.id === evalId);
    if (!ev) return;
    const D = requis('APP_STATE').data!;
    const isComp = (type === 'comp');
    const noteField = type === 'conf' ? 'notes_conf' : (type === 'perf' ? 'notes_perf' : 'notes_comp');
    const color = type === 'conf' ? '#1a365d' : (type === 'perf' ? '#059669' : '#d97706');
    const typeLabel = type === 'conf' ? 'Conformité' : (type === 'perf' ? 'Performance' : 'Complexité');

    // Select indicators in this group
    let inds: IndicateurPr[] = [];
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
    function _grpTaux(e: EvaluationPr): TauxGroupe | null {
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
    const peersMap: Record<string, EvaluationPr> = {};
    (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.secteur_id === ev.secteur_id && e.prestataire_id !== ev.prestataire_id)
        .forEach(e => {
            const k = e.prestataire_id as string;
            if (!peersMap[k] || new Date((e.date_validation || e.date) as string).getTime() > new Date(((peersMap[k] as EvaluationPr).date_validation || (peersMap[k] as EvaluationPr).date) as string).getTime()) peersMap[k] = e;
        });
    const peerRows = Object.values(peersMap)
        .map(p => ({ prest: (D.prestataires || []).find(x => x.id === p.prestataire_id), s: _grpTaux(p) }))
        // Le garde de type dit ce que le filtre établit, avec la même vérité.
        .filter((x): x is { prest: PrestatairePr | undefined; s: TauxGroupe } => !!x.s && x.s.cnt > 0)
        .sort((a, b) => isComp ? a.s.taux - b.s.taux : b.s.taux - a.s.taux);
    const totalPeers = peerRows.length;
    const peerAvg = totalPeers ? peerRows.reduce((acc, x) => acc + x.s.taux, 0) / totalPeers : 0;

    // Rank of current prestataire among (self + peers) on taux
    let rank: number | null = null;
    if (my && totalPeers) {
        const all = peerRows.map(p => p.s.taux).concat([my.taux]).sort((a, b) => isComp ? a - b : b - a);
        // first index where the value equals my.taux
        rank = all.indexOf(my.taux) + 1;
    }

    // Previous group taux for trend
    const myPrev = (D.evaluations || [])
        .filter(e => e.statut === 'valide' && e.prestataire_id === ev.prestataire_id && e.id !== ev.id)
        .sort((a, b) => new Date((b.date_validation || b.date) as string).getTime() - new Date((a.date_validation || a.date) as string).getTime())[0];
    const prev = myPrev ? _grpTaux(myPrev) : null;
    let trendHtml = '<div style="color:var(--text-muted);font-style:italic;font-size:0.78rem;">' + t('no_previous_eval') + '</div>';
    if (my && prev && prev.cnt > 0 && my.cnt > 0) {
        const diff = my.taux - prev.taux;
        let icon: string, col: string, lbl: string;
        if (Math.abs(diff) < 0.05) { icon='→'; col='#6b7280'; lbl='Stable'; }
        else if (diff > 0) { icon='↑'; col = isComp ? '#ef4444' : '#22c55e'; lbl = isComp ? 'Hausse (défavorable)' : 'Hausse (favorable)'; }
        else { icon='↓'; col = isComp ? '#22c55e' : '#ef4444'; lbl = isComp ? 'Baisse (favorable)' : 'Baisse (défavorable)'; }
        trendHtml = `<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:${col};font-weight:700;">
            <span style="font-size:1.2rem;">${icon}</span>
            <span>${prev.taux.toFixed(1)}% → ${my.taux.toFixed(1)}% ${Math.abs(diff)>=0.05?`(${diff>0?'+':''}${diff.toFixed(1)} pts)`:''}</span>
            <span style="font-weight:500;color:var(--text-muted);font-size:0.75rem;">— ${lbl}</span>
        </div>`;
    }

    const _esc = window.oasisEsc;

    // List of indicators with their note (compact)
    function _pillCompact(score: number): string {
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
            buckets[idx] = (buckets[idx] as number) + 1;
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
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem;">${t('the_bar')} <span style="color:#1d4ed8;font-weight:700;">bleue</span> ${t('represents_current_band')}</div>`;
    } else {
        distHtml = `<div class="text-center" style="padding:0.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">${t('no_peer_group')}</div>`;
    }

    // Peer list
    const myPrest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
    const tauxColor = my ? (isComp
        ? (my.taux <= 50 ? '#22c55e' : my.taux <= 80 ? '#f59e0b' : '#ef4444')
        : (my.taux >= 80 ? '#22c55e' : my.taux >= 50 ? '#f59e0b' : '#ef4444')) : '#6b7280';
    function _pTauxCol(t: number): string { return isComp
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
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">${t('group_summary')}</div>
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
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${t('trend_vs_previous')}</div>
            ${trendHtml}
        </div>

        ${indListHtml ? `<div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${t('group_indicators')}</div>
            <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;">${indListHtml}</div>
        </div>` : ''}

        <div>
            <div style="font-size:0.72rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${t('position_vs_peers')}</div>
            ${distHtml}
            ${peerListHtml ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;">${t('detail_by_provider')}</div>${peerListHtml}` : ''}
        </div>
    </div>`;

    requis('openSlicer')(`Synthèse — ${_esc(groupTitle)}`, bodyHtml, '', { drawer: true });
    const slicer = document.getElementById('prSlicer');
    if (slicer) {
        slicer.style.width = '40vw';
        slicer.style.minWidth = '420px';
    }
}
