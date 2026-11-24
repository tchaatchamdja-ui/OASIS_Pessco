// OASIS — « Profils de Risque » (PR) — les évaluations : ce que leurs pages,
// leur rapport et leur fiche partagent — la dernière évaluation par organisme,
// la synthèse, le fil d'avancement du circuit, les icônes, les notes à
// montrer, et les droits du module (ADR-003, 5.c — n° 5.f.133).
//
// La première partie de `pr-evaluations.js`, convertie à la lettre.
import type { AccesPr, EvaluationPr } from './formes';
import { requis, t } from './partage';

/** Les filtres des listes d'évaluations, que leurs gestes en ligne écrivent. */
export interface FiltresEvaluations { domaine: string; secteur: string; statut: string; search: string }

/** Une étape du fil d'avancement. */
export interface EtapeEval { key: string; label: string }

declare global {
  interface Window {
    /** Les filtres des listes d'évaluations. */
    _evalFilters?: FiltresEvaluations;
  }
}

// ══════════════════════════════════════
//  EVALUATIONS (with filters, accordion details, latest+drafts only)
// ══════════════════════════════════════
window._evalFilters = { domaine: '', secteur: '', statut: '', search: '' };

// Helper: get only latest validated + all drafts per prestataire
export function getLatestEvals(evals: EvaluationPr[]): EvaluationPr[] {
    const latestValidated: Record<string, EvaluationPr> = {};
    const drafts: EvaluationPr[] = [];
    // In-progress statuses (workflow Phase 4 — Chap. 4 §4.2.2.f) treated like drafts.
    const IN_PROGRESS = new Set(['brouillon', 'soumis_directeur', 'renvoyee', 'acceptee', 'cloturee', 'rejetee']);
    evals.forEach(ev => {
        if (IN_PROGRESS.has(ev.statut as string)) { drafts.push(ev); return; }
        if (ev.statut === 'valide') {
            const key = ev.prestataire_id as string;
            // `new Date(undefined)` est invalide, comme avant ; `getTime` rend la valeur que `>` comparait.
            const actuel = latestValidated[key];
            if (!actuel || new Date((ev.date_validation || ev.date) as string).getTime() > new Date((actuel.date_validation || actuel.date) as string).getTime()) {
                latestValidated[key] = ev;
            }
        }
    });
    return [...Object.values(latestValidated), ...drafts];
}

// Helper: build synthesis accordion HTML for an evaluation
export function buildSynthesisAccordion(ev: EvaluationPr, accPrefix: string): string {
    const D = requis('APP_STATE').data!;
    const sect = (D.secteurs || []).find(s => s.id === ev.secteur_id);
    const sas = (D.sousActivites || []).filter(sa => sa.secteur_id === ev.secteur_id);
    const g = ev.resultats?.global || {};
    // Cycle CSRBO = CSn * csnMod (from global risk)
    // `parseInt` lit la chaîne d'un nombre comme celle d'un texte : `String` le dit.
    const csn = parseInt(String(sect?.csn || 24));
    const csnMod = g.globalRisk?.csnMod || 1;
    const csrbo = g.csrbo || Math.round(csn * csnMod);

    // Global IDS (uppercase)
    const idsG = g.ids_g || g.safetyIndex?.val || '-';
    const riskLabel = g.globalRisk?.label || '-';
    const riskDesc = g.globalRisk?.risk || '-';
    const intensity = g.globalRisk?.intensity || requis('getIntensityLabel')(csnMod);

    let globalHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.5rem;padding:0.5rem 0;">
        <div class="detail-item"><label>IDC</label><span class="badge">${g.idc_g || '-'}</span></div>
        <div class="detail-item"><label>IDP</label><span class="badge">${g.idp_g || '-'}</span></div>
        <div class="detail-item"><label>IDS</label><span class="badge">${idsG}</span></div>
        <div class="detail-item"><label>IDE</label><span class="badge">${g.ide_g || '-'}</span></div>
        <div class="detail-item"><label>Index Risque</label><span class="badge ${requis('getRiskBadgeClass')(riskDesc)}">${riskLabel}</span></div>
        <div class="detail-item"><label>${t('intensity')}</label><span>${intensity}</span></div>
        <div class="detail-item"><label>Cycle (CSRBO)</label><span style="font-weight:700;color:var(--primary);">${csrbo} ${t('months')}</span></div>
    </div>`;
    if (idsG === 'Incohérant') {
        globalHtml += `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:0.5rem;margin-top:0.3rem;font-size:0.82rem;color:#856404;">⚠ ${t('incoherent_msg')}</div>`;
    }

    let saHtml = '';
    sas.forEach(sa => {
        const saRes = ev.resultats?.sousActivites?.[sa.id] || {};
        // New format: ids_s (lowercase), risk (e.g. "2b"), freq
        const idsS = saRes.ids_s || saRes.safetyIndex?.val || '-';
        const saRiskLabel = saRes.risk || saRes.globalRisk?.label || '-';
        const saRiskDesc = saRes.risk_desc || saRes.globalRisk?.risk || '-';
        const saFreq = saRes.freq || saRes.globalRisk?.freq || '-';

        saHtml += `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
            <span style="min-width:200px;font-weight:600;">${window.escapeHtml(`${sa.code} - ${sa.nom}`)}</span>
            <span>idc: ${saRes.idc_s || '-'}</span>
            <span>idp: ${saRes.idp_s || '-'}</span>
            <span>ids: ${idsS}</span>
            <span>ide: ${saRes.ide_s || '-'}</span>
            <span class="badge ${requis('getRiskBadgeClass')(saRiskDesc)}" style="font-size:0.75rem;">${saRiskLabel}</span>
            <span style="margin-left:auto;font-weight:600;">${saFreq !== '-' ? saFreq + 'x / cycle' : '-'}</span>
        </div>`;
        if (idsS === 'Incohérant') {
            saHtml += `<div style="background:#fff3cd;border-radius:4px;padding:0.25rem 0.5rem;font-size:0.75rem;color:#856404;">⚠ ${t('incoherent_msg')}</div>`;
        }
    });

    const gId = `${accPrefix}_global`;
    const sId = `${accPrefix}_sa`;
    return `<div class="accordion-container" style="margin-top:0.5rem;">
        <div class="accordion-item acc-level-2">
            <div class="accordion-header" data-acc-id="${gId}" onclick="toggleAccordion('${gId}')">
                <span class="chevron">${window.ICONS['chevron']}</span>
                <span class="acc-title">${t('global_synthesis')}</span>
            </div>
            <div class="accordion-body" id="acc-body-${gId}">${globalHtml}</div>
        </div>
        <div class="accordion-item acc-level-2">
            <div class="accordion-header" data-acc-id="${sId}" onclick="toggleAccordion('${sId}')">
                <span class="chevron">${window.ICONS['chevron']}</span>
                <span class="acc-title">${t('synthesis_by_sa')}</span>
                <span class="acc-count">${sas.length}</span>
            </div>
            <div class="accordion-body" id="acc-body-${sId}">${saHtml || t('no_data')}</div>
        </div>
    </div>`;
}

// ── Fil d'avancement du circuit d'évaluation (chevrons) ──
// De la notation par les évaluateurs jusqu'à la validation finale.
export const EVAL_STEPS: EtapeEval[] = [
    { key: 'notation',  label: 'Notation' },
    { key: 'soumission', label: 'Soumission' },
    { key: 'acceptation', label: 'Acceptation' },
    { key: 'reunion',   label: 'Réunion prestataire' },
    { key: 'validation', label: 'Validation' },
];

// Tous les évaluateurs désignés ont-ils soumis leurs notes (Performance + Complexité) ?
export function evalAllNotesSubmitted(ev: EvaluationPr): boolean {
    const designes = ev.evaluateurs_designes || [];
    if (!designes.length) return false;
    const pub = ev.notes_per_evaluator || {};
    return designes.every((uid) =>
        Object.keys(pub.perf?.[uid] || {}).length > 0 &&
        Object.keys(pub.comp?.[uid] || {}).length > 0
    );
}

// Index de l'étape en cours. -1 : aucune étape entamée (pas d'évaluateur désigné)
// ou circuit interrompu. 5 : toutes les étapes franchies.
//   0 Notation            désignation des évaluateurs → toutes les notes soumises
//   1 Soumission          notes complètes → soumission au directeur
//   2 Acceptation         soumission → acceptation
//   3 Réunion prestataire acceptation → clôture de la réunion
//   4 Validation          clôture → validation de l'évaluation
export function evalCurrentStep(ev: EvaluationPr): number {
    if (ev.statut === 'rejetee') return -1;
    if (ev.statut === 'valide') return 5;
    if (ev.statut === 'cloturee') return 4;
    if (ev.statut === 'acceptee') return 3;
    if (ev.statut === 'soumis_directeur') return 2;
    // brouillon / renvoyée : la notation court tant que les notes ne sont pas
    // toutes soumises ; ensuite c'est au validateur de soumettre.
    if (!(ev.evaluateurs_designes || []).length) return -1;
    return evalAllNotesSubmitted(ev) ? 1 : 0;
}

export const EVAL_STEP_HINT: Record<string, string | undefined> = {
    notation: "Depuis la désignation des évaluateurs jusqu'à la soumission de toutes leurs notes",
    soumission: "Notes complètes — en attente de la soumission au directeur par le validateur",
    acceptation: "Soumise au directeur — en attente de son acceptation",
    reunion: "Acceptée — en attente de la clôture de la réunion prestataire",
    validation: "Réunion clôturée — en attente de la validation de l'évaluation",
};

// Clés d'horodatage (server: ev.etapes) dans l'ordre de EVAL_STEPS.
export const EVAL_ETAPE_KEYS = ['notation', 'soumission', 'acceptation', 'reunion', 'validation'];

// Libellé du statut = nom de l'étape en cours du fil d'avancement.
export function evalStatutLabel(ev: EvaluationPr): string {
    if (ev.statut === 'valide') return 'Validée';
    if (ev.statut === 'rejetee') return 'Rejetée';
    const i = evalCurrentStep(ev);
    if (i < 0 || i >= EVAL_STEPS.length) return 'En préparation';
    return (EVAL_STEPS[i] as EtapeEval).label + (ev.statut === 'renvoyee' ? ' (renvoyée)' : '');
}

// Date de lancement de l'étape en cours. `ev.etapes` est horodaté par le
// serveur à chaque transition ; repli sur les anciens champs pour les
// évaluations créées avant cet horodatage.
export function evalStepDate(ev: EvaluationPr): string | undefined {
    const e: Record<string, string | undefined> = ev.etapes || {};
    if (ev.statut === 'valide') return e.validee || ev.date_validation || ev.decide_le || ev.date;
    if (ev.statut === 'rejetee') return e.rejetee || ev.decide_le || ev.date_revue_directeur || ev.date;
    const i = evalCurrentStep(ev);
    if (i < 0) return ev.createdAt || ev.date;
    const legacy = [ev.createdAt, ev.createdAt, ev.soumis_le, ev.decide_le, ev.decide_le];
    return e[EVAL_ETAPE_KEYS[i] as string] || legacy[i] || ev.date;
}

export function renderEvalProcessSteps(ev: EvaluationPr): string {
    const cur = evalCurrentStep(ev);
    const rejected = ev.statut === 'rejetee';
    const items = EVAL_STEPS.map((s, i) => {
        let state = 'todo';
        if (rejected) state = 'todo';
        else if (i < cur) state = 'done';
        else if (i === cur) state = 'current';
        const tip = state === 'current' ? `${s.label} — en cours. ${EVAL_STEP_HINT[s.key] || ''}`
            : state === 'done' ? `${s.label} — terminée`
            : `${s.label} — à venir`;
        return `<span class="eval-step ${state}" title="${tip}">${s.label}</span>`;
    }).join('');
    const flag = rejected
        ? '<span class="eval-step rejected" title="' + t('eval_rejected_stopped') + '">' + t('rejected_f') + '</span>'
        : (cur === -1 ? '<span class="eval-step todo" title="' + t('no_assessor_yet') + '">' + t('in_preparation') + '</span>' : '');
    return `<div class="eval-steps" role="img" aria-label="${t('eval_progress')}">${items}${flag}</div>`;
}

// Tout déplier / tout replier (doubles chevrons)
export const ICON_EXPAND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/><polyline points="6 4 12 10 18 4"/></svg>';
export const ICON_COLLAPSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/><polyline points="6 20 12 14 18 20"/></svg>';

// Icône d'envoi (avion en papier) alignée sur le jeu d'icônes du module
export const ICON_SEND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;"><path d="M21.5 2.5 11 13"/><path d="M21.5 2.5 15 21.5l-4-8.5-8.5-4z"/></svg>';
// Soumission au validateur : document avec flèche montante
export const ICON_SUBMIT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><polyline points="9.5 14.5 12 12 14.5 14.5"/></svg>';

// Notes servant aux bandeaux et compteurs, selon qui regarde :
// – validateur / administrateur : les notes consolidées de l'évaluation ;
// – évaluateur désigné : ses notes publiées si elles existent, sinon son brouillon.
// Sans ce repli sur les notes publiées, les bandeaux repassaient à zéro juste
// après « Soumettre mes notes » (le brouillon venait d'être vidé).
export function evalNotesSource(ev: EvaluationPr, slot: 'perf' | 'comp'): Record<string, number> {
    const key = slot === 'perf' ? 'notes_perf' : 'notes_comp';
    const uid = requis('APP_STATE').user?.id || '';
    // Vue validateur : privilège Validateur ou Gestionnaire sur le secteur
    const isValidator = requis('prCanValidate')(ev.secteur_id);
    if (isValidator || !(ev.evaluateurs_designes || []).includes(uid)) return ev[key] || {};
    const published = ev.notes_per_evaluator?.[slot]?.[uid] || {};
    if (Object.keys(published).length) return published;
    const draft = ev.notes_per_evaluator_draft?.[slot]?.[uid] || {};
    if (Object.keys(draft).length) return draft;
    return ev[key] || {};
}

// ── Droits d'accès aux évaluations (Gestion des Droits du module) ──
export const PR_MANAGE = ['GESTIONNAIRE', 'VALIDATEUR'];   // voient tout leur périmètre et créent
export const PR_CONTRIB = 'CONTRIBUTEUR';                  // uniquement les évaluations désignées

export function prAccess(): AccesPr {
    return requis('APP_STATE').access || { hasAccess: false, privilege: '', secteurs: {} };
}
// Privilège effectif sur un secteur donné
export function prPrivOn(secteurId: string | undefined): string {
    const a = prAccess();
    if (!a.hasAccess) return '';
    return a.secteurs[secteurId as string] || a.privilege || '';
}
// Secteurs sur lesquels l'utilisateur peut créer une évaluation
export function prManagedSecteurs(): string[] {
    const a = prAccess();
    return Object.keys(a.secteurs || {}).filter((id) => PR_MANAGE.includes(a.secteurs[id] as string));
}
export function prCanCreateEval(): boolean {
    return prManagedSecteurs().length > 0;
}
export function prCanSeeEval(ev: EvaluationPr): boolean {
    const priv = prPrivOn(ev.secteur_id);
    if (PR_MANAGE.includes(priv)) return true;
    if (priv === PR_CONTRIB) {
        const uid = requis('APP_STATE').user?.id;
        return (ev.evaluateurs_designes || []).includes(uid as string);
    }
    return false;
}
// Une réévaluation n'est « en cours » que si le cycle suivant existe encore et
// n'est pas clos : un enfant supprimé ou terminé ne doit pas bloquer l'origine.
export function prReevaluationEnCours(ev: EvaluationPr | null | undefined): EvaluationPr | null {
    if (!ev) return null;
    const enfant = (requis('APP_STATE').data!.evaluations || []).find(
        (e) => e.parent_id === ev.id && !['valide', 'rejetee'].includes(e.statut as string)
    );
    return enfant || null;
}

// Secteur du prestataire évalué (le secteur porté par l'évaluation fait foi)
export function prSecteurOf(ev: EvaluationPr | null | undefined): string {
    if (!ev) return '';
    if (ev.secteur_id) return ev.secteur_id;
    const p = (requis('APP_STATE').data!.prestataires || []).find(x => x.id === ev.prestataire_id);
    return p ? p.secteur_id || '' : '';
}

// Réévaluation : Gestionnaire ou Validateur couvrant le domaine/secteur du
// prestataire, et pas de cycle suivant déjà ouvert.
export function prCanReevaluer(ev: EvaluationPr | null | undefined): boolean {
    if (!ev || prReevaluationEnCours(ev)) return false;
    return PR_MANAGE.includes(prPrivOn(prSecteurOf(ev)));
}

// Suppression d'une évaluation : Gestionnaire du domaine/secteur uniquement
// Une évaluation dont la réévaluation existe ne se supprime pas : le serveur
// le refuse, la réévaluation perdrait son origine. On supprime d'abord celle-ci.
export function prCanSupprimerEval(ev: EvaluationPr | null | undefined): boolean {
    if (!ev || prPrivOn(prSecteurOf(ev)) !== 'GESTIONNAIRE') return false;
    const evals = (requis('APP_STATE').data! || {}).evaluations || [];
    return !(ev.enfant_id && evals.some((e) => e.id === ev.enfant_id));
}
// Le sous-menu reste accessible aux contributeurs (pour leurs désignations)
export function prCanSeeEvalsEnCours(): boolean {
    const a = prAccess();
    if (!a.hasAccess) return false;
    const privs = [a.privilege, ...Object.values(a.secteurs || {})];
    return privs.some((p) => PR_MANAGE.includes(p as string) || p === PR_CONTRIB);
}
