// OASIS — « Profils de Risque » (PR) — les deux pages des évaluations : celles
// en cours, et celles validées avec leur cycle (ADR-003, 5.c — n° 5.f.133).
//
// La deuxième partie de `pr-evaluations.js`, convertie à la lettre : le
// balisage est rendu caractère pour caractère.
import {
  type FiltresEvaluations, ICON_COLLAPSE, ICON_EXPAND, buildSynthesisAccordion, getLatestEvals, prCanCreateEval, prCanReevaluer, prCanSeeEval,
  prCanSeeEvalsEnCours, prCanSupprimerEval, prReevaluationEnCours,
} from './evaluations-commun';
import type { EvaluationPr } from './formes';
import { requis, t } from './partage';

export function renderEvaluations(): string {
    const D = requis('APP_STATE').data!;
    const sub = requis('APP_STATE').currentSub;

    if (sub === 'evaluations_validees' || sub === 'resultats') return renderEvalResults();

    // Droits du module : Gestionnaire/Validateur voient et créent sur leurs
    // domaines-secteurs ; Contributeur ne voit que ses désignations ;
    // Lecteur n'a pas accès au sous-menu.
    const canCreate = prCanCreateEval();
    if (!prCanSeeEvalsEnCours()) {
        return `
        <div class="card" style="padding:2rem;text-align:center;color:var(--text-muted);">
            Accès réservé aux privilèges Gestionnaire et Validateur, ainsi qu'aux contributeurs désignés sur une évaluation.
        </div>`;
    }
    const f = window._evalFilters as FiltresEvaluations;

    // Show all non-validated evaluations: drafts, submitted to director, returned
    const IN_PROGRESS_STATUTS = ['brouillon', 'soumis_directeur', 'renvoyee', 'acceptee', 'cloturee', 'rejetee'];
    let evals = getLatestEvals((D.evaluations || []).filter(e => IN_PROGRESS_STATUTS.includes(e.statut as string)))
        .filter(prCanSeeEval);

    // Apply filters
    evals = evals.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    });

    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group">
                <label>${t('domain')}</label>
                <select onchange="window._evalFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>${t('sector')}</label>
                <select onchange="window._evalFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group filter-search">
                <label>${t('search')}</label>
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${window.oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._evalFilters={domaine:'',secteur:'',statut:'',search:''};renderPage();">${window.ICONS['refresh']}</button>
            </div>
        </div>
    </div>`;

    const rows = evals.map((ev, idx) => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
        const statusMap: Record<string, { cls: string; lbl: string; color: string } | undefined> = {
            brouillon:        { cls: 'badge-draft',     lbl: t('draft'),                 color: '#6b7280' },
            soumis_directeur: { cls: 'badge-warning',   lbl: 'Soumis à la Validation',   color: '#d97706' },
            renvoyee:         { cls: 'badge-danger',    lbl: 'Renvoyée',                 color: '#dc2626' },
            acceptee:         { cls: 'badge-info',      lbl: 'Acceptée',                 color: '#0ea5e9' },
            cloturee:         { cls: 'badge-info',      lbl: 'Clôturée',                 color: '#2563eb' },
            rejetee:          { cls: 'badge-danger',    lbl: 'Rejetée',                  color: '#b91c1c' }
        };
        const sm = (statusMap[ev.statut as string] || statusMap['brouillon']) as { cls: string; lbl: string; color: string };
        const statusClass = sm.cls;
        const statusLabel = sm.lbl;
        const statusColor = sm.color;
        const g = ev.resultats?.global || {};

        // Completeness indicators for each type
        const confInds = (D.indConf || []).filter(i => i.secteur_id === ev.secteur_id && i.actif !== false);
        const perfInds = (D.indPerf || []).filter(i => i.actif !== false);
        const compInds = (D.indComplex || []).filter(i => i.actif !== false && sas.some(sa => sa.id === i.sous_activite_id));
        // Une clé n'est tirée que d'un relevé présent : les `as` le disent.
        const confCount = Object.keys(ev.notes_conf || {}).filter(k => ((ev.notes_conf as Record<string, number>)[k] as number) > 0).length;
        const perfCount = Object.keys(ev.notes_perf || {}).filter(k => ((ev.notes_perf as Record<string, number>)[k] as number) > 0).length;
        const compCount = Object.keys(ev.notes_comp || {}).filter(k => ((ev.notes_comp as Record<string, number>)[k] as number) > 0).length;
        const confTotal = confInds.length * sas.length;
        const perfTotal = perfInds.length;
        const compTotal = compInds.length;

        // Summary row with 3 indicator badges
        const confPct = confTotal > 0 ? Math.round(confCount / confTotal * 100) : 0;
        const perfPct = perfTotal > 0 ? Math.round(perfCount / perfTotal * 100) : 0;
        const compPct = compTotal > 0 ? Math.round(compCount / compTotal * 100) : 0;

        const renvoiBlock = (ev.statut === 'renvoyee' && (ev.commentaire_directeur || '').trim())
            ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.75rem;">
                <div style="font-weight:700;color:#991b1b;font-size:0.82rem;">${t('returned_for_observations')}</div>
                <div style="font-size:0.78rem;color:#7f1d1d;margin-top:0.15rem;">${ev.date_revue_directeur ? 'Le ' + window.formatDate(ev.date_revue_directeur) : ''}</div>
                <div style="font-size:0.85rem;margin-top:0.4rem;white-space:pre-wrap;color:#7f1d1d;">${requis('_genEsc')(ev.commentaire_directeur)}</div>
            </div>` : '';
        const detailHtml = `<div style="padding:0.75rem;font-size:0.85rem;">
            ${renvoiBlock}
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:0.75rem;">
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #3182ce;">
                    <div style="font-weight:600;color:#3182ce;margin-bottom:0.25rem;">${t('conformity')}</div>
                    <div>Taux: ${g.tauxConf !== undefined ? (g.tauxConf*100).toFixed(1)+'%' : '-'} | IDC: ${g.idc_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${confCount}/${confTotal} (${confPct}%)</div>
                </div>
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #059669;">
                    <div style="font-weight:600;color:#059669;margin-bottom:0.25rem;">${t('performance')}</div>
                    <div>Taux: ${g.tauxPerf !== undefined ? (g.tauxPerf*100).toFixed(1)+'%' : '-'} | IDP: ${g.idp_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${perfCount}/${perfTotal} (${perfPct}%)</div>
                </div>
                <div class="eval-summary-box" style="padding:0.5rem;background:var(--bg);border-radius:6px;border-left:3px solid #d97706;">
                    <div style="font-weight:600;color:#d97706;margin-bottom:0.25rem;">${t('complexity')}</div>
                    <div>Taux: ${g.tauxComp !== undefined ? (g.tauxComp*100).toFixed(1)+'%' : '-'} | IDE: ${g.ide_g || '-'}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${compCount}/${compTotal} (${compPct}%)</div>
                </div>
            </div>
        </div>`;

        const accId = `eval_all_${idx}`;
        return `<div class="card" style="margin-bottom:0.5rem;padding:0.5rem 1rem;border-left:4px solid ${statusColor};background:linear-gradient(90deg, ${statusColor}14 0%, var(--bg-card) 35%);">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <strong>${prest?.nom || '-'}</strong>
                <span class="text-muted">- ${sect?.nom || '-'}</span>
                <span class="badge ${statusClass}" style="margin-left:auto;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">${statusLabel}</span>
                <span class="date-cell">${window.formatDate(ev.date_validation || ev.date)}</span>
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="${t('edit')}" aria-label="${t('edit')}">${window.ICONS['edit']}</button>
                ${ev.statut === 'brouillon' && canCreate ?
                    `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}" aria-label="${t('delete')}">${window.ICONS['trash']}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="${t('details')}" aria-label="${t('details')}">${window.ICONS['chevron']}</button>
            </div>
            <div class="accordion-body" id="acc-body-${accId}">${detailHtml}</div>
        </div>`;
    }).join('');

    return `
    <div class="page-header" id="printStart_eval">
        <h2>${t('evaluations_en_cours')}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_eval')">${window.ICONS['print']} ${t('print')}</button>
            ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="openNewEvalModal()">${window.ICONS['plus']} ${t('new_eval')}</button>` : ''}
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('evalContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="results-info">${t('results_count', evals.length)}</div>
    <div id="evalContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
}

export function renderEvalResults(): string {
    const D = requis('APP_STATE').data!;
    const f = window._evalFilters as FiltresEvaluations;
    let validEvals = getLatestEvals((D.evaluations || []).filter(e => e.statut === 'valide'));

    // Apply filters
    validEvals = validEvals.filter(ev => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const dom = sect ? (D.domaines || []).find(d => d.id === sect.domaine_id) : null;
        if (f.domaine && dom?.id !== f.domaine) return false;
        if (f.secteur && sect?.id !== f.secteur) return false;
        if (f.search && !(prest?.nom || '').toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
    });

    const filtersHtml = `
    <div class="filters-bar">
        <div class="filters-row">
            <div class="filter-group">
                <label>${t('domain')}</label>
                <select onchange="window._evalFilters.domaine=this.value;renderPage();">
                    <option value="">${t('all_domains')}</option>
                    ${(D.domaines||[]).map(d => `<option value="${d.id}" ${f.domaine===d.id?'selected':''}>${d.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>${t('sector')}</label>
                <select onchange="window._evalFilters.secteur=this.value;renderPage();">
                    <option value="">${t('all_sectors')}</option>
                    ${(D.secteurs||[]).map(s => `<option value="${s.id}" ${f.secteur===s.id?'selected':''}>${s.code}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group filter-search">
                <label>${t('search')}</label>
                <input type="text" id="pr-eval-search" placeholder="${t('search')}" value="${window.oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._evalFilters.search=document.getElementById('pr-eval-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._evalFilters={domaine:'',secteur:'',statut:'',search:''};renderPage();">${window.ICONS['refresh']}</button>
            </div>
        </div>
    </div>`;

    const rows = validEvals.map((ev, idx) => {
        const prest = (D.prestataires || []).find(p => p.id === ev.prestataire_id);
        const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
        const g = ev.resultats?.global || {};
        const risk = g.globalRisk || {};
        const csrbo = g.csrbo || Math.round((parseInt(String(sect?.csn || 24))) * (risk.csnMod || 1));
        const accId = 'res_' + idx;

        // ── Cycle dates (Début / Fin) ──
        const _canEditCycle = requis('prCanValidate')(ev.secteur_id);
        const debut = (ev.date_debut_cycle || '').slice(0, 10);
        let fin = (ev.date_fin_cycle || '').slice(0, 10);
        // Auto-derive Fin = Début + csrbo months when not yet set
        if (debut && !fin && csrbo) {
            const dt = new Date(debut + 'T00:00:00');
            if (!isNaN(dt.getTime())) {
                dt.setMonth(dt.getMonth() + parseInt(String(csrbo || 0)));
                fin = window.oasisJour(dt);
            }
        }
        // Reminder level: red if fin < +1 month, orange if fin < +2 months
        let reminderLevel: 'red' | 'orange' | null = null;
        if (fin) {
            const today = new Date(); today.setHours(0,0,0,0);
            const dFin = new Date(fin + 'T00:00:00');
            const m1 = new Date(today); m1.setMonth(m1.getMonth() + 1);
            const m2 = new Date(today); m2.setMonth(m2.getMonth() + 2);
            // Les dates se comparent par leur valeur numérique, que `getTime` rend.
            if (dFin.getTime() <= m1.getTime()) reminderLevel = 'red';
            else if (dFin.getTime() <= m2.getTime()) reminderLevel = 'orange';
        }
        const reminderColor = reminderLevel === 'red' ? '#dc2626' : (reminderLevel === 'orange' ? '#d97706' : null);
        const reminderText = reminderLevel === 'red'
            ? '⚠ Réévaluation requise (moins d\'un mois avant fin de cycle)'
            : (reminderLevel === 'orange' ? '⏰ Réévaluation à prévoir (moins de 2 mois avant fin de cycle)' : '');
        const reminderBanner = reminderColor
            ? `<div style="background:${reminderColor}14;border-left:4px solid ${reminderColor};border-radius:6px;padding:0.4rem 0.7rem;margin:0.4rem 0;color:${reminderColor};font-size:0.82rem;font-weight:600;">${reminderText}</div>`
            : '';
        const reevalBtnStyle = reminderColor
            ? `background:${reminderColor};border-color:${reminderColor};color:#fff;`
            : '';
        const reevalBtnClass = reminderColor ? 'btn btn-sm' : 'btn btn-outline btn-sm';
        const dInputStyle = 'padding:0.18rem 0.4rem;font-size:0.78rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);';
        const dInputAttrs = _canEditCycle ? '' : 'readonly';

        return `<div class="card" style="margin-bottom:0.5rem;padding:0.5rem 1rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <strong>${prest?.nom || '-'}</strong>
                <span class="text-muted">- ${sect?.nom || '-'}</span>
                <span class="badge ${requis('getRiskBadgeClass')(risk.risk)}" style="margin-left:auto;">${risk.label || '-'}</span>
                <span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span>
                <span class="date-cell">${window.formatDate(ev.date_validation || ev.date)}</span>
                <button class="btn-icon" onclick="openEvalDetail('${ev.id}')" title="${t('view_indicators_scores')}" aria-label="${t('view_indicators_scores')}">${window.ICONS['eye']}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','word')" title="Exporter Word" aria-label="Exporter Word">${window.ICONS['word']}</button>
                <button class="btn-icon" onclick="exportEvalReport('${ev.id}','pdf')" title="Exporter PDF" aria-label="Exporter PDF">${window.ICONS['download']}</button>
                ${prCanSupprimerEval(ev) ? `<button class="btn-icon danger" onclick="deleteEval('${ev.id}')" title="${t('delete')}" aria-label="${t('delete')}">${window.ICONS['trash']}</button>` : ''}
                <button class="btn-icon" onclick="toggleAccordion('${accId}')" title="${t('synthesis')}" aria-label="${t('synthesis')}">${window.ICONS['chevron']}</button>
            </div>
            ${reminderBanner}
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed var(--border);font-size:0.78rem;align-items:center;">
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">${t('cycle_start_label')}</span>
                    <input type="date" value="${debut}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','debut',this.value,${csrbo || 0},this)"
                        style="${dInputStyle}">
                </label>
                <label style="display:flex;align-items:center;gap:0.3rem;color:var(--text-muted);white-space:nowrap;">
                    <span style="white-space:nowrap;">Fin Cycle :</span>
                    <input type="date" value="${fin}" ${dInputAttrs}
                        onchange="updateCycleDate('${ev.id}','fin',this.value,${csrbo || 0},this)"
                        style="${dInputStyle}">
                </label>
                ${prCanReevaluer(ev)
                    ? `<button class="${reevalBtnClass}" style="${reevalBtnStyle}margin-left:auto;" onclick="reevaluerEval('${ev.id}')">${t('reevaluer_btn')}</button>`
                    : (prReevaluationEnCours(ev)
                        ? `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);">Réévaluation en cours (cycle ${(prReevaluationEnCours(ev) as EvaluationPr).cycle || (ev.cycle || 1) + 1})</span>`
                        : `<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);" title="${t('reserved_manager_validator')}">${t('reassess_not_allowed')}</span>`)}
            </div>
            <div class="accordion-body" id="acc-body-${accId}">${buildSynthesisAccordion(ev, accId)}</div>
        </div>`;
    }).join('');

    return `
    <div class="page-header" id="printStart_results"><h2>${t('evaluations_validees')}</h2>
        <div class="flex gap-1">
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_results')">${window.ICONS['print']} ${t('print')}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('resultsContainer',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${ICON_EXPAND}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('resultsContainer',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${ICON_COLLAPSE}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="results-info">${t('results_count', validEvals.length)}</div>
    <div id="resultsContainer">${rows || `<div class="text-center" style="padding:2rem;">${t('no_data')}</div>`}</div>`;
}
