// OASIS — « Profils de Risque » (PR) — la page des profils de risque, ses filtres et ses barres sélectionnables (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import { prVueApercu, renderProfilIndividuel } from './profils-apercu';
import { requis, t } from './partage';
import { renderStatistiques } from './statistiques-indicateurs';
import type { EvaluationPr } from './formes';

/** Les filtres des profils, que leurs gestes en ligne écrivent. */
export interface FiltresProfils { domaine: string; secteur: string; prestataire: string; search: string }

declare global {
  interface Window {
    /** Les filtres des profils. */
    _profilFilters?: FiltresProfils;
    /** Le graphe des taux du tableau de bord et des statistiques : sa vue, son axe, sa barre retenue. */
    _dashBarChart?: { mode: string; metric: string; secteur: string; prestataire: string; selected: string; selectedSA?: string };
    /** Le graphe des tendances : sa vue, son axe, sa période. */
    _dashTrend?: { mode: string; metric: string; start: string; end: string };
    /** La vue de l'aperçu des profils : domaine, secteur ou organisme. */
    _profilVue?: string;
    /** Les graphes des sous-activités, composés une fois et relus au même rendu. */
    _saBarChartsHtml?: string;
  }
}

// ══════════════════════════════════════
//  PROFILS DE RISQUE (Change 8: filters + export)
// ══════════════════════════════════════
window._profilFilters = { domaine: '', secteur: '', prestataire: '', search: '' };

export function renderProfils(): string {
    const D = requis('APP_STATE').data!;
    const sub = requis('APP_STATE').currentSub;
    const allValids = (D.evaluations || []).filter(e => e.statut === 'valide');
    const f = window._profilFilters as FiltresProfils;

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
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${window.escapeHtml(`${d.code} - ${d.nom}`)}</option>`).join('')}
                </select></div>
            <div class="filter-group ${secOff ? 'filter-disabled' : ''}"><label>${t('sector')}</label>
                <select ${secOff ? 'disabled' : ''} onchange="window._profilFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${window.escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}
                </select></div>
            <div class="filter-group ${prestOff ? 'filter-disabled' : ''}"><label>${t('provider')}</label>
                <select ${prestOff ? 'disabled' : ''} onchange="window._profilFilters.prestataire=this.value;renderPage();">
                    <option value="">${t('all_providers')}</option>
                    ${(D.prestataires||[]).filter(p=>p.actif!==false&&p.actif!==0).map(p => `<option value="${p.id}" ${f.prestataire===p.id?'selected':''}>${window.escapeHtml(p.nom)}</option>`).join('')}
                </select></div>
            <div class="filter-group filter-search"><label>${t('search')}</label>
                <input type="text" id="pr-profil-search" placeholder="${t('search')}" value="${window.oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._profilFilters.search=document.getElementById('pr-profil-search').value; renderPage(); })"></div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._profilFilters={domaine:'',secteur:'',prestataire:'',search:''};renderPage();">${window.ICONS['refresh']}</button>
            </div>
        </div>
    </div>`;

    function applyFilters(evals: EvaluationPr[]): EvaluationPr[] {
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
        const latestMap: Record<string, EvaluationPr> = {};
        allValids.forEach(ev => {
            const k = ev.prestataire_id as string;
            // `getTime` rend la valeur que `>` comparait ; une date absente est invalide, comme avant.
            const actuel = latestMap[k];
            if (!actuel || new Date((ev.date_validation || ev.date) as string).getTime() > new Date((actuel.date_validation || actuel.date) as string).getTime()) latestMap[k] = ev;
        });
        const filtered = applyFilters(Object.values(latestMap));

        const rows = filtered.map((ev, idx) => {
            const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
            const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
            const g = ev.resultats?.global || {};
            const risk = g.globalRisk || {};
            const csrbo = g.csrbo || Math.round((parseInt(String(sect?.csn || 24))) * (risk.csnMod || 1));

            return `<div class="card" style="margin-bottom:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                    <strong>${prest?.nom || '-'}</strong>
                    <span class="text-muted">- ${sect?.nom || '-'}</span>
                    <span class="badge ${requis('getRiskBadgeClass')(risk.risk)}" style="margin-left:auto;">${risk.label || '-'} (${risk.risk || '-'})</span>
                    <span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span>
                    <span class="date-cell">${window.formatDate(ev.date_validation || ev.date)}</span>
                    <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','word')" title="Exporter Word">${window.ICONS['word']} Exporter Word</button>
                    <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF">${window.ICONS['download']} Exporter PDF</button>
                    ${requis('prCanSupprimerEval')(ev) ? `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}" aria-label="${t('delete')}">${window.ICONS['trash']}</button>` : ''}
                </div>
                ${requis('buildSynthesisAccordion')(ev, 'profil_' + idx)}
            </div>`;
        }).join('');

        return `<div class="page-header" id="printStart_profils"><h2>${t('current_profiles')}</h2>
            <div class="flex gap-1">
                <button class="btn btn-primary btn-sm" onclick="printPage('printStart_profils')">${window.ICONS['print']} ${t('print')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('profilsContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${requis('ICON_EXPAND')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('profilsContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${requis('ICON_COLLAPSE')}</button>
            </div>
        </div>
        ${filtersHtml}
        <div class="results-info">${t('results_count', filtered.length)}</div>
        <div id="profilsContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
    }

    if (sub === 'archives') {
        // All old validated evals (not the latest per prestataire)
        const latestMap: Record<string, EvaluationPr> = {};
        allValids.forEach(ev => {
            const k = ev.prestataire_id as string;
            // `getTime` rend la valeur que `>` comparait ; une date absente est invalide, comme avant.
            const actuel = latestMap[k];
            if (!actuel || new Date((ev.date_validation || ev.date) as string).getTime() > new Date((actuel.date_validation || actuel.date) as string).getTime()) latestMap[k] = ev;
        });
        const latestIds = new Set(Object.values(latestMap).map(e => e.id));
        const archives = allValids.filter(e => !latestIds.has(e.id));
        const filtered = applyFilters(archives);

        // Group archived evals by prestataire
        const grouped: Record<string, EvaluationPr[]> = {};
        filtered.forEach(ev => {
            const pid = ev.prestataire_id || '_';
            if (!grouped[pid]) grouped[pid] = [];
            (grouped[pid] as EvaluationPr[]).push(ev);
        });
        // Sort each group by date_validation desc
        Object.values(grouped).forEach(list => list.sort((a, b) =>
            new Date((b.date_validation || b.date) as string).getTime() - new Date((a.date_validation || a.date) as string).getTime()));
        // Sort groups by prestataire name
        const groupKeys = Object.keys(grouped).sort((a, b) => {
            const na = (D.prestataires || []).find(p => p.id === a)?.nom || '';
            const nb = (D.prestataires || []).find(p => p.id === b)?.nom || '';
            return na.localeCompare(nb);
        });

        const rows = groupKeys.map((pid, gIdx) => {
            const prest = (D.prestataires || []).find(p => p.id === pid);
            const list = grouped[pid] as EvaluationPr[];
            const grpAccId = `arch_grp_${gIdx}`;
            const cards = list.map((ev, idx) => {
                const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
                const risk = ev.resultats?.global?.globalRisk || {};
                return `<div class="card" style="margin:0.5rem 0 0.5rem 1rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                        <span class="text-muted">${sect?.nom || '-'}</span>
                        <span class="badge ${requis('getRiskBadgeClass')(risk.risk)}" style="margin-left:auto;">${risk.label || '-'}</span>
                        <span class="date-cell">${window.formatDate(ev.date_validation || ev.date)}</span>
                        <button class="btn btn-primary btn-sm" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF">${window.ICONS['download']} Exporter PDF</button>
                    </div>
                    ${requis('buildSynthesisAccordion')(ev, 'arch_' + gIdx + '_' + idx)}
                </div>`;
            }).join('');
            return `<div class="accordion-item" style="margin-bottom:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);">
                <div class="accordion-header" data-acc-id="${grpAccId}" onclick="toggleAccordion('${grpAccId}')" style="padding:0.6rem 0.85rem;">
                    <span class="chevron">${window.ICONS['chevron']}</span>
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
                <button class="btn btn-primary btn-sm" onclick="printPage('printStart_archives')">${window.ICONS['print']} ${t('print')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('archivesContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${requis('ICON_EXPAND')}</button>
                <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('archivesContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${requis('ICON_COLLAPSE')}</button>
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
export function setTauxBarSelection(gid: string): void {
    if (!window._dashBarChart) {
        window._dashBarChart = { mode:'secteur', metric:'conf', secteur:'', prestataire:'', selected:'', selectedSA:'' };
    }
    window._dashBarChart.selected = (window._dashBarChart.selected === gid) ? '' : gid;
    // Clear any sub-activity selection since the SA pool may change
    window._dashBarChart.selectedSA = '';
    requis('renderPage')();
}

// Toggle the currently selected bar in the per-sub-activity charts. Drives the
// dynamic filtering of the "Indicateurs - Analyses" section.
export function setSABarSelection(saId: string): void {
    if (!window._dashBarChart) {
        window._dashBarChart = { mode:'secteur', metric:'conf', secteur:'', prestataire:'', selected:'', selectedSA:'' };
    }
    window._dashBarChart.selectedSA = (window._dashBarChart.selectedSA === saId) ? '' : saId;
    requis('renderPage')();
}
