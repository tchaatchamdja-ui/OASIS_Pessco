// OASIS — « Profils de Risque » (PR) — les Paramètres : la page, sa bande
// latérale, la capacité des inspecteurs, les archives, et le barème des
// indicateurs (ADR-003, 5.c — n° 5.f.132).
//
// La première partie de `pr-parametres.js`, convertie à la lettre : le
// balisage est rendu caractère pour caractère. Les noms de la coquille et de
// `pr-evaluations.js` — encore en JavaScript — se lisent sur la page au moment
// de l'appel ; ceux du socle, sur `window`, où il les pose.
//
// Quatre `as string` accompagnent un `includes` sur un identifiant facultatif :
// un identifiant absent n'est dans aucune liste, et `includes(undefined)` rend
// faux comme avant. La comparaison des dates des archives passe par `getTime`.
import type {
  DomainePr, IndicateurPr, PrestatairePr, SecteurPr, SousActivitePr,
} from './formes';
import { renderParamIndices } from './parametres-saisie';
import { requis, t } from './partage';

/** Les filtres du barème des indicateurs, que ses gestes en ligne écrivent. */
export interface FiltresIndicateurs { type: string; domaine: string; secteur: string; sa: string; search: string }

declare global {
  interface Window {
    /** Les filtres des domaines — posés, et lus par personne. */
    _domFilters?: { domaine: string; secteur: string; sa: string; search: string };
    /** Les filtres du barème des indicateurs. */
    _indFilters?: FiltresIndicateurs;
    /** Les filtres des organismes — posés, et lus par personne : la vue est au portail. */
    _prestFilters?: { domaine: string; secteur: string; search: string };
  }
}

// ══════════════════════════════════════
//  PARAMETRES
// ══════════════════════════════════════
// Les sous-menus des Paramètres reprennent la bande latérale du portail : une
// colonne d'entrées à icône, qui se replie sur ses seules icônes. Les autres
// pages du module gardent leur barre horizontale (`.sub-nav`).
export function renderParametres(): string {
    const E = requis('APP_STATE');
    const sub = E.currentSub;
    const corps = sub === 'indices' ? renderParamIndices()
        : sub === 'capacite' ? renderParamCapacite()
        : sub === 'archives' ? renderParamArchives()
        : renderParamIndicateurs();

    const repliee = !!E.paramBarreRepliee;
    const bascule = t(repliee ? 'sous_menu_deplier' : 'sous_menu_replier');
    const entrees = ((NAV_CONFIG['parametres'] as { subs?: { id: string; labelKey: string; icon?: string }[] }).subs || []).map((o) => `
        <button class="cfg-sidebar-item ${sub === o.id ? 'active' : ''}"
                onclick="APP_STATE.currentSub='${o.id}';renderPage();"
                title="${window.oasisEsc(t(o.labelKey))}">
            <span class="cfg-sidebar-icon">${window.ICONS[o.icon as string]}</span>
            <span class="cfg-sidebar-label">${window.oasisEsc(t(o.labelKey))}</span>
        </button>`).join('');

    return `<div class="cfg-layout">
        <div class="cfg-sidebar ${repliee ? 'collapsed' : ''}">
            <button class="cfg-sidebar-toggle" onclick="basculerBarreParam()"
                    title="${window.oasisEsc(bascule)}" aria-label="${window.oasisEsc(bascule)}"
                    aria-expanded="${!repliee}">
                <span style="display:flex;${repliee ? '' : 'transform:rotate(180deg);'}">${window.ICONS['chevron']}</span>
            </button>
            ${entrees}
        </div>
        <div class="cfg-content">${corps}</div>
    </div>`;
}

// La bande se replie sur ses icônes : les écrans de paramétrage tiennent des
// tables larges, et la place se prend là.
export function basculerBarreParam(): void {
    const E = requis('APP_STATE');
    E.paramBarreRepliee = !E.paramBarreRepliee;
    requis('renderPage')();
}

// Phase 9 — Capacité inspecteurs (Chap. 4 §4.4)
export function renderParamCapacite(): string {
    const D = requis('APP_STATE').data!;
    const inspecteurs = (D.users || []).filter(u => (u.role_m1 === 'M1_Contributeur' || u.role_m1 === 'M1_Validateur'));
    const evals = (D.evaluations || []).filter(e => e.statut !== 'archive');
    // Count per-inspector workload (designated as evaluator across active evals)
    const charge: Record<string, number> = {};
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
export function renderParamArchives(): string {
    const D = requis('APP_STATE').data!;
    const evals = (D.evaluations || []).filter(e => e.statut === 'valide');
    // Compute date_fin_retention = date_validation + 5 years
    const rows = evals.map(ev => {
        const prest: Partial<PrestatairePr> = (D.prestataires || []).find(p => p.id === ev.prestataire_id) || {};
        const sect: Partial<SecteurPr> = (D.secteurs || []).find(s => s.id === ev.secteur_id) || {};
        const dval = ev.date_validation || ev.date || '';
        let dret = '';
        try {
            const d = new Date(dval); d.setFullYear(d.getFullYear() + 5);
            dret = d.toISOString().slice(0, 10);
        } catch (e) {}
        // Les dates se comparent par leur valeur numérique, que `getTime` rend.
        const expired = dret && new Date(dret).getTime() < new Date().getTime();
        return `<tr><td>${prest.nom || '-'}</td><td>${sect.code || '-'}</td><td>${window.formatDate(dval)}</td><td>${dret}</td><td>${expired ? '<span style="color:#dc2626;font-weight:700;">' + t('expired') + '</span>' : '<span style="color:#059669;">' + t('retained') + '</span>'}</td></tr>`;
    }).join('');
    return `<div class="page-header"><h2>${t('archives_retention')}</h2></div>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Les rapports d'évaluation, les plans et les comptes-rendus sont conservés au moins 5 ans après la fin du cycle de surveillance.</p>
    <table class="data-table"><thead><tr><th>${t('provider')}</th><th>${t('sector')}</th><th>${t('validation_date')}</th><th>${t('retained_until')}</th><th>${t('status')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="text-center">${t('no_validated_eval')}</td></tr>`}</tbody></table>`;
}

// ── Indices & Seuils : une paire ombrée, retirée ──
//
// Ce fichier portait **deux** `renderParamIndices` et **deux** fonctions
// d'enregistrement des indices. En script classique, la seconde déclaration
// d'un nom écrase la première : la version vivante était celle du bas, et celle
// d'ici — avec le `saveModuleIndices` qu'elle seule appelait — était
// **inatteignable**. Qui l'aurait modifiée n'aurait rien vu changer.
//
// Les deux n'écrivaient d'ailleurs pas au même endroit : la morte rangeait le
// résultat dans `window.PESSCO.sharedData.indices`, **écrit une fois et lu
// nulle part** ; la vivante le range dans `APP_STATE.data.indices`, que trois
// endroits relisent. Le retrait n'a donc aucune conséquence, et c'est la mesure
// qui le dit, non l'intuition.
//
// Un garde-fou de forme refuse désormais qu'une fonction soit déclarée deux fois
// dans un même fichier (`tests/smoke/taille.smoke.js`) : c'était le seul cas du
// dépôt, et *une déclaration qui en ombre une autre est toujours un défaut,
// jamais un choix.*

// ── Domaines (Change 3: accordion + filters) ──
window._domFilters = { domaine: '', secteur: '', sa: '', search: '' };


// ── Indicateurs (Change 2: accordion + filters + import/export) ──
window._indFilters = { type: '', domaine: '', secteur: '', sa: '', search: '' };

export function renderParamIndicateurs(): string {
    const E = requis('APP_STATE');
    const D = E.data!;
    const isAdmin = E.user?.role === 'Administrateur';
    const f = window._indFilters as FiltresIndicateurs;
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
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_indicateurs')">${window.ICONS['print']} ${t('print')}</button>
            <button class="btn btn-primary btn-sm" onclick="exportIndicateursExcel()" title="Exporter Excel">${window.ICONS['file_excel']} Exporter Excel</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('indImportFile').click();" title="Importer">${window.ICONS['upload']} Importer</button>
            <input type="file" id="indImportFile" accept=".xlsx,.xls" style="display:none" onchange="importIndicateursExcel(event)">
            ${isAdmin ? `
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_conf')">${window.ICONS['plus']} ${t('conformity')}</button>
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_perf')">${window.ICONS['plus']} ${t('performance')}</button>
                <button class="btn btn-primary btn-sm" onclick="openEntityModal('indicateurs_complex')">${window.ICONS['plus']} ${t('complexity')}</button>
            ` : ''}
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('indAccordion',true)" title="${t('expand_all')}" aria-label="${t('expand_all')}">${requis('ICON_EXPAND')}</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="expandCollapseAll('indAccordion',false)" title="${t('collapse_all')}" aria-label="${t('collapse_all')}">${requis('ICON_COLLAPSE')}</button>
        </div>
    </div>
    ${filtersHtml}
    <div class="accordion-container" id="indAccordion">
        ${accordionHtml || `<div class="text-center">${t('no_data')}</div>`}
    </div>`;
}

// Barre de filtres des indicateurs.
export function _prIndFiltresHtml(f: FiltresIndicateurs, domaines: DomainePr[], secteurs: SecteurPr[], sousActivites: SousActivitePr[]): string {
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
                <input type="text" id="pr-ind-search" placeholder="${t('search')}" value="${window.oasisEsc(f.search)}" oninput="_pesSearchInput(this, () => { window._indFilters.search=document.getElementById('pr-ind-search').value; renderPage(); })">
            </div>
            <div class="filter-actions">
                <button class="btn btn-outline btn-sm" title="${t('reset_filters')}" onclick="window._indFilters={type:'',domaine:'',secteur:'',sa:'',search:''};renderPage();">${window.ICONS['refresh']}</button>
            </div>
        </div>
    </div>`;
}

// Conformité : secteur → indicateurs (deux niveaux).
export function _prIndConformiteHtml(D: DonneesPr, f: FiltresIndicateurs, secteurs: SecteurPr[], searchLower: string, isAdmin: boolean): string {
    if (f.type && f.type !== 'conf') return '';
    let confInds = D.indConf || [];
    if (f.secteur) confInds = confInds.filter(i => i.secteur_id === f.secteur);
    if (f.domaine) {
        const domSectIds = secteurs.filter(s => s.domaine_id === f.domaine).map(s => s.id);
        confInds = confInds.filter(i => domSectIds.includes(i.secteur_id as string));
    }
    if (searchLower) confInds = confInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (confInds.length || (!f.type && !searchLower)) {
        // Group by sector
        const bySector: Record<string, IndicateurPr[]> = {};
        confInds.forEach(i => {
            const s = i.secteur_id || 'none';
            if (!bySector[s]) bySector[s] = [];
            (bySector[s] as IndicateurPr[]).push(i);
        });

        let confBody = '';
        Object.entries(bySector).forEach(([secId, inds]) => {
            const sec = secteurs.find(s => s.id === secId);
            const secAccId = `ind_conf_sec_${secId}`;
            confBody += `
            <div class="accordion-item acc-level-2">
                <div class="accordion-header" data-acc-id="${secAccId}" onclick="toggleAccordion('${secAccId}')">
                    <span class="chevron">${window.ICONS['chevron']}</span>
                    <span class="acc-title">${sec?.code || '-'} - ${sec?.nom || '-'}</span>
                    <span class="acc-count">${inds.length} ${t('indicator')}(s)</span>
                </div>
                <div class="accordion-body" id="acc-body-${secAccId}">
                    ${inds.map(i => `
                    <div class="indicator-item">
                        <div class="indicator-header">
                            <span class="acc-code">${i.code}</span>
                            <span class="acc-label">${i.label}</span>
                            ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_conf','${i.id}')" aria-label="${t("edit")}" title="${t("edit")}">${window.ICONS['edit']}</button>` : ''}
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
                <span class="chevron">${window.ICONS['chevron']}</span>
                <span class="acc-title">${t('conformity')}</span>
                <span class="acc-count">${confInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${confId}">${confBody}</div>
        </div>`;
    }
    return '';
}

// Performance : une seule liste.
export function _prIndPerformanceHtml(D: DonneesPr, f: FiltresIndicateurs, searchLower: string, isAdmin: boolean): string {
    if (f.type && f.type !== 'perf') return '';
    let perfInds = D.indPerf || [];
    if (searchLower) perfInds = perfInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (perfInds.length || (!f.type && !searchLower)) {
        const perfId = 'ind_type_perf';
        return `
        <div class="accordion-item acc-level-1">
            <div class="accordion-header" data-acc-id="${perfId}" onclick="toggleAccordion('${perfId}')">
                <span class="chevron">${window.ICONS['chevron']}</span>
                <span class="acc-title">${t('performance')}</span>
                <span class="acc-count">${perfInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${perfId}">
                ${perfInds.map(i => `
                <div class="indicator-item">
                    <div class="indicator-header">
                        <span class="acc-code">${i.code}</span>
                        <span class="acc-label">${i.label}</span>
                        ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_perf','${i.id}')" aria-label="${t("edit")}" title="${t("edit")}">${window.ICONS['edit']}</button>` : ''}
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
export function _prIndComplexiteHtml(D: DonneesPr, f: FiltresIndicateurs, secteurs: SecteurPr[], sousActivites: SousActivitePr[], searchLower: string, isAdmin: boolean): string {
    if (f.type && f.type !== 'complex') return '';
    let compInds = D.indComplex || [];
    if (f.sa) compInds = compInds.filter(i => i.sous_activite_id === f.sa);
    if (f.secteur) {
        const secSAs = sousActivites.filter(sa => sa.secteur_id === f.secteur).map(sa => sa.id);
        compInds = compInds.filter(i => secSAs.includes(i.sous_activite_id as string));
    }
    if (f.domaine) {
        const domSects = secteurs.filter(s => s.domaine_id === f.domaine).map(s => s.id);
        const domSAs = sousActivites.filter(sa => domSects.includes(sa.secteur_id as string)).map(sa => sa.id);
        compInds = compInds.filter(i => domSAs.includes(i.sous_activite_id as string));
    }
    if (searchLower) compInds = compInds.filter(i => (i.code + ' ' + i.label).toLowerCase().includes(searchLower));

    if (compInds.length || (!f.type && !searchLower)) {
        // Group by SA first, then group SAs by sector
        const bySA: Record<string, IndicateurPr[]> = {};
        compInds.forEach(i => {
            const s = i.sous_activite_id || 'none';
            if (!bySA[s]) bySA[s] = [];
            (bySA[s] as IndicateurPr[]).push(i);
        });

        // Group SAs by their parent sector
        const bySector: Record<string, Record<string, IndicateurPr[]>> = {};
        Object.entries(bySA).forEach(([saId, inds]) => {
            const sa = sousActivites.find(s => s.id === saId);
            const secId = sa?.secteur_id || 'none';
            if (!bySector[secId]) bySector[secId] = {};
            (bySector[secId] as Record<string, IndicateurPr[]>)[saId] = inds;
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
                        <span class="chevron">${window.ICONS['chevron']}</span>
                        <span class="acc-title">${sa?.code || '-'} - ${sa?.nom || '-'}</span>
                        <span class="acc-count">${inds.length} ${t('indicator')}(s)</span>
                    </div>
                    <div class="accordion-body" id="acc-body-${saAccId}">
                        ${inds.map(i => `
                        <div class="indicator-item">
                            <div class="indicator-header">
                                <span class="acc-code">${i.code}</span>
                                <span class="acc-label">${i.label}</span>
                                ${isAdmin ? `<button class="btn-icon" onclick="openEntityModal('indicateurs_complex','${i.id}')" aria-label="${t("edit")}" title="${t("edit")}">${window.ICONS['edit']}</button>` : ''}
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
                    <span class="chevron">${window.ICONS['chevron']}</span>
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
                <span class="chevron">${window.ICONS['chevron']}</span>
                <span class="acc-title">${t('complexity')}</span>
                <span class="acc-count">${compInds.length} ${t('indicator')}(s)</span>
            </div>
            <div class="accordion-body" id="acc-body-${compId}">${compBody}</div>
        </div>`;
    }
    return '';
}

// ── Prestataires (Change 4: filters) ──
window._prestFilters = { domaine: '', secteur: '', search: '' };

// La vue Prestataires est désormais centralisée dans le portail (Configuration › Prestataires).
// L'implémentation locale précédente a été retirée pour éviter d'avoir deux pages distinctes.
// Pour ouvrir un prestataire, utilisez Configuration > Prestataires depuis le portail.
