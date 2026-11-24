// OASIS — « Profils de Risque » (PR) — l'aperçu des profils par domaine, secteur ou organisme, et le profil individuel (ADR-003, 5.c — n° 5.f.134).
//
// Une partie de `pr-profils.js`, convertie à la lettre : le balisage est rendu
// caractère pour caractère.
import type { EvaluationPr, IndicateurPr, SousActivitePr } from './formes';
import type { FiltresProfils } from './profils';

/** Un axe de l'aperçu : la clé de son taux, son type de jauge, son libellé. */
interface AxeApercu { key: 'tauxConf' | 'tauxPerf' | 'tauxComp'; type: string; label: string }
/** Les moyennes d'un lot d'évaluations, en pour cent par type d'axe, et leur nombre. */
type Moyennes = Record<string, number | null> & { n: number };
/** Une entité de l'aperçu : un domaine, un secteur ou un organisme. */
interface EntiteApercu { id: string; titre: string; court: string; taux: Moyennes; meta: string; cliquable?: boolean }
import { requis, t } from './partage';
import { prMakeGauge, prTauxColor } from './profils-jauges';

// ══════════════════════════════════════
//  Profils détaillés — aperçu par domaine / secteur / prestataire
//  Colonne gauche : jauges (type tableau de bord) de chaque entité.
//  Colonne droite  : un graphique par indicateur, taux de chaque entité.
// ══════════════════════════════════════
export const APERCU_VUES = [
    { id: 'domaine', label: 'Profil par domaine' },
    { id: 'secteur', label: 'Profil par secteur' },
    { id: 'prestataire', label: 'Profil par prestataire' },
];

export const APERCU_AXES: AxeApercu[] = [
    { key: 'tauxConf', type: 'conf', label: 'Conformité' },
    { key: 'tauxPerf', type: 'perf', label: 'Performance' },
    { key: 'tauxComp', type: 'comp', label: 'Complexité' },
];

export function prVueApercu(): string {
    const v = window._profilVue;
    return APERCU_VUES.some(x => x.id === v) ? v as string : 'domaine';
}

// Changer de vue remet à zéro les filtres que la vue désactive.
export function setVueApercu(vue: string): void {
    window._profilVue = vue;
    const f = window._profilFilters || (window._profilFilters = { domaine: '', secteur: '', prestataire: '', search: '' });
    if (vue === 'domaine') { f.secteur = ''; f.prestataire = ''; }
    if (vue === 'secteur') { f.prestataire = ''; }
    requis('renderPage')();
}

export function ouvrirProfilPrestataire(id: string): void {
    // Sans filtres posés, l'ancien écrivait dans un objet jeté : le même ici.
    (window._profilFilters || ({} as Partial<FiltresProfils>)).prestataire = id;
    requis('renderPage')();
}

// Quitter le profil détaillé et revenir à la vue « Profil par prestataire »
export function retourVuePrestataires(): void {
    (window._profilFilters || ({} as Partial<FiltresProfils>)).prestataire = '';
    window._profilVue = 'prestataire';
    requis('renderPage')();
}

export function renderApercuProfils(D: DonneesPr, allValids: EvaluationPr[], mode: string): string {
    const f: Partial<FiltresProfils> = window._profilFilters || {};
    // Dernière évaluation validée par prestataire
    const latest: Record<string, EvaluationPr> = {};
    (allValids || []).forEach(ev => {
        const k = ev.prestataire_id as string;
        if (!latest[k] || new Date((ev.date_validation || ev.date) as string).getTime() > new Date(((latest[k] as EvaluationPr).date_validation || (latest[k] as EvaluationPr).date) as string).getTime()) latest[k] = ev;
    });
    const evals = Object.values(latest);
    const secteurs = (D._rawSecteurs || D.secteurs) || [];
    const secteurById = (id: string | undefined) => secteurs.find(s => s.id === id);

    // Moyennes des taux (en %) sur un lot d'évaluations
    const moyennes = (list: EvaluationPr[]): Moyennes => {
        const out: Moyennes = { n: list.length } as Moyennes;
        APERCU_AXES.forEach(a => {
            const vals = list.map(e => e.resultats?.global?.[a.key]).filter((v): v is number => typeof v === 'number');
            out[a.type] = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) * 100 : null;
        });
        return out;
    };

    // ── Entités de la vue courante, filtrées par la barre de filtres ──
    const rech = String(f.search || '').trim().toLowerCase();
    const matchRech = (...champs: unknown[]): boolean => !rech || champs.some(c => String(c || '').toLowerCase().includes(rech));

    // Prestataires rattachés (actifs) par secteur
    const prestActifs = (D.prestataires || []).filter(p => p.actif !== false && p.actif !== 0);
    const nbPrestSecteurs = (ids: Set<string>): number => prestActifs.filter(p => ids.has(p.secteur_id as string)).length;
    const libPrest = (n: number): string => `${n} prestataire${n > 1 ? 's' : ''}`;

    let entites: EntiteApercu[] = [];
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
                const taux = moyennes(evals.filter(e => secIds.has(e.secteur_id as string)));
                return {
                    id: d.id, titre: `${d.code || ''} — ${d.nom || ''}`, court: d.code || d.nom || '(?)', taux,
                    meta: `${secIds.size} secteur${secIds.size > 1 ? 's' : ''} · ${libPrest(nbPrestSecteurs(secIds))} · ${taux.n} évalué${taux.n > 1 ? 's' : ''}`,
                };
            });
    }

    // ── Second groupe : jauges par entité (3 colonnes) ──
    const gaugesHtml = entites.map(en => {
        const clic = en.cliquable
            ? ` onclick="ouvrirProfilPrestataire('${en.id}')" style="cursor:pointer;" title="Afficher le profil détaillé de ${window.escapeHtml(en.titre)}"`
            : '';
        return `<div class="apercu-entite"${clic}>
            <div class="apercu-title">${window.escapeHtml(en.titre)}</div>
            <div class="apercu-meta">${window.escapeHtml(en.meta || '')}</div>
            <div class="apercu-gauges">
                ${APERCU_AXES.map(a => prMakeGauge(a.label, en.taux[a.type] || 0, a.type,
                    { compact: true, width: 118, height: 64, minWidth: '110px', noData: en.taux[a.type] == null })).join('')}
            </div>
        </div>`;
    }).join('');

    // ── Premier groupe : un graphique par indicateur (3 colonnes, en haut) ──
    const ticks = [25, 50, 75];
    const indicChart = (axe: AxeApercu): string => {
        const lignes = entites.map(en => {
            const v = en.taux[axe.type];
            const col = v == null ? '#e5e7eb' : prTauxColor(v, axe.type);
            const clic = en.cliquable ? ` onclick="ouvrirProfilPrestataire('${en.id}')" style="cursor:pointer;"` : '';
            return `<div class="sec-bar-row"${clic} title="${window.escapeHtml(en.titre)} — ${axe.label} : ${v == null ? 'non évalué' : v.toFixed(1) + '%'}">
                <span class="sec-axis" title="${window.escapeHtml(en.titre)}">${window.escapeHtml(en.court)}</span>
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
export function renderProfilIndividuel(D: DonneesPr, allValids: EvaluationPr[], applyFilters: (evals: EvaluationPr[]) => EvaluationPr[], filtersHtml: string): string {
    const f = window._profilFilters as FiltresProfils;
    // Required selection: prestataire (and implicitly its secteur)
    const filteredEvals = applyFilters(allValids);

    // Latest per prestataire from the filtered set
    const latestMap: Record<string, EvaluationPr> = {};
    filteredEvals.forEach(ev => {
        const k = ev.prestataire_id as string;
        if (!latestMap[k] || new Date((ev.date_validation || ev.date) as string).getTime() > new Date(((latestMap[k] as EvaluationPr).date_validation || (latestMap[k] as EvaluationPr).date) as string).getTime()) latestMap[k] = ev;
    });

    const vue = prVueApercu();
    const vueTabs = `<div class="apercu-tabs">
        ${APERCU_VUES.map(v => `<button class="apercu-tab ${vue === v.id ? 'active' : ''}" onclick="setVueApercu('${v.id}')">${v.label}</button>`).join('')}
    </div>`;

    // Profil détaillé ouvert : bouton de retour vers la liste des prestataires
    const detail = (vue === 'prestataire' && f.prestataire);
    const retourBtn = detail
        ? `<button class="btn btn-outline btn-sm" onclick="retourVuePrestataires()">${(window.ICONS['chevron'] as string) ? `<span style="display:inline-block;transform:rotate(180deg);">${window.ICONS['chevron']}</span>` : ''} Retour aux prestataires</button>`
        : '';

    let header = `<div class="page-header" id="printStart_indiv"><h2>${t('individual_profile')}</h2>
        <div class="flex gap-1">
            ${retourBtn}
            <button class="btn btn-primary btn-sm" onclick="printPage('printStart_indiv')">${window.ICONS['print']} ${t('print')}</button>
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
            ${t('no_validated_eval_provider')}
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
    function pill(score: number, type: string): string {
        // `parseInt` lit la chaîne d'un nombre : `String` le dit, sans rien changer.
        score = parseInt(String(score || 0));
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
        const lbl = score >= 1 && score <= 3 ? `<div style="font-size:0.68rem;color:#555;text-align:center;margin-top:0.15rem;">Score : <strong>${score}</strong>/3</div>` : `<div style="font-size:0.68rem;color:var(--text-muted);text-align:center;margin-top:0.15rem;font-style:italic;">${t('not_scored')}</div>`;
        return `<div style="display:flex;flex-direction:column;width:100%;">
            <div style="display:flex;width:100%;border:1px solid #d1d5db;border-radius:11px;overflow:hidden;background:#f9fafb;">${segs}</div>
            ${lbl}
        </div>`;
    }


    // Previous validated evaluation of the SAME prestataire, used for trend arrows
    const myEvalsSorted = allValids
        .filter(e => e.prestataire_id === ev.prestataire_id)
        .sort((a, b) => new Date((b.date_validation || b.date) as string).getTime() - new Date((a.date_validation || a.date) as string).getTime());
    const prevEv = myEvalsSorted.length >= 2 ? myEvalsSorted[1] : null;

    // Indicator trend arrow: compares current note with the prestataire's previous evaluation note.
    // type: 'conf' / 'perf' / 'comp'. For 'comp' an increase is unfavourable (red), a decrease is favourable (green).
    function trendArrow(currentScore: number, prevScore: number, type: string): string {
        const c = parseInt(String(currentScore || 0));
        const p = parseInt(String(prevScore || 0));
        if (!c || !p) {
            return `<div style="font-size:0.65rem;color:var(--text-muted);text-align:center;margin-top:0.25rem;font-style:italic;">${t('no_previous_eval')}</div>`;
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
    function makeMiniGauge(label: string, pct: number, type: string): string {
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
                <span class="badge ${requis('getRiskBadgeClass')(risk.risk)}">${risk.label || '-'}</span>
                ${g.csrbo ? `<span style="font-weight:700;color:var(--primary);font-size:0.85rem;">${g.csrbo} ${t('months')}</span>` : ''}
                <span class="date-cell">${window.formatDate(ev.date_validation || ev.date)}</span>
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
    function _escAttr(s: unknown): string { return window.oasisEsc(s); }
    // Une fonction déclarée ne voit pas que `ev` a été vérifié plus haut : les deux `as` le disent.
    function makeIndCard(ind: IndicateurPr, score: number, prevScore: number, type: string, color: string, saId?: string): string {
        const _saAttr = saId ? `,'${saId}'` : ",''";
        return `<div class="card" style="padding:0.55rem 0.7rem;display:flex;flex-direction:column;height:100%;cursor:pointer;" onclick="openIndividualIndicator('${(ev as EvaluationPr).id}','${type}','${ind.id}'${_saAttr})" title="Cliquer pour afficher les détails et la situation par rapport aux autres prestataires du secteur">
            <div style="font-weight:700;font-size:0.78rem;color:${color};">${ind.code}</div>
            <div style="${_lblStyle}" title="${_escAttr(ind.label || '')}">${ind.label || ''}</div>
            <div style="margin-top:0.35rem;">${pill(score, type)}</div>
            ${trendArrow(score, prevScore, type)}
        </div>`;
    }

    // Helpers d'accordéons : niveau secteur (extérieur) + niveau sous-activité (intérieur)
    function _saAcc(idPrefix: string, sa: SousActivitePr, cardsHtml: string, color: string, count: number, type: string): string {
        if (!cardsHtml) return '';
        const aId = `${idPrefix}_${sa.id}`;
        return `<div class="accordion-item" style="margin:0.35rem 0 0.35rem 0.75rem;border-left:3px solid ${color};">
            <div class="accordion-header expanded" data-acc-id="${aId}" onclick="toggleAccordion('${aId}')" style="padding:0.4rem 0.6rem;">
                <span class="chevron expanded">${window.ICONS['chevron']}</span>
                <span class="acc-title" style="font-weight:700;font-size:0.78rem;color:${color};">${window.escapeHtml(`${sa.code} — ${sa.nom}`)}</span>
                <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted);">${count} indicateur${count>1?'s':''}</span>
                <button class="btn btn-outline btn-sm" style="padding:0.15rem 0.45rem;font-size:0.7rem;margin-left:0.4rem;" onclick="event.stopPropagation();openIndividualGroup('${(ev as EvaluationPr).id}','${type}','${sa.id}')" title="${t('group_summary_peers')}">${t('summary_tab')}</button>
            </div>
            <div class="accordion-body expanded" id="acc-body-${aId}" style="padding:0.4rem;">
                <div style="${_gridStyle}">${cardsHtml}</div>
            </div>
        </div>`;
    }
    function _sectorAcc(idPrefix: string, sectorTitle: string, color: string, bodyHtml: string, totalCount: number): string {
        const aId = `${idPrefix}_sect`;
        const inner = bodyHtml || `<div class="text-center" style="padding:0.5rem;color:var(--text-muted);font-style:italic;font-size:0.78rem;">${t('no_indicator')}</div>`;
        return `<div class="accordion-item" style="margin-bottom:0.5rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);">
            <div class="accordion-header expanded" data-acc-id="${aId}" onclick="toggleAccordion('${aId}')" style="padding:0.55rem 0.85rem;border-left:4px solid ${color};">
                <span class="chevron expanded">${window.ICONS['chevron']}</span>
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
            <button class="btn btn-outline btn-sm" style="padding:0.15rem 0.45rem;font-size:0.7rem;" onclick="openIndividualGroup('${ev.id}','perf','')" title="${t('perf_summary_peers')}">${t('summary_tab')}</button>
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
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#1a365d;">${t('conformity_indicators_detail')}</h3>
            ${confSection}
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#059669;">${t('performance_indicators_detail')}</h3>
            ${perfSection}
            <h3 style="margin:0.75rem 0 0.3rem;font-size:0.82rem;font-weight:700;color:#d97706;">${t('complexity_indicators_detail')}</h3>
            ${compSection}
        </div>`;
}
