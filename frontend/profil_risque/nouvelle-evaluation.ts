// OASIS — « Profils de Risque » (PR) — la fenêtre d'une nouvelle évaluation,
// et les évaluateurs éligibles d'un domaine et d'un secteur (ADR-003, 5.c —
// n° 5.f.133).
//
// La quatrième partie de `pr-evaluations.js`, convertie à la lettre.
import { prCanCreateEval, prManagedSecteurs } from './evaluations-commun';
import type { UtilisateurPr } from './formes';
import { requis, t } from './partage';

/** Un évaluateur éligible, tel que la gestion des droits le rend. */
export interface EvaluateurPr { id?: string; username?: string; email?: string; nom?: string; prenom?: string; fullName?: string; nom_utilisateur?: string }

declare global {
  interface Window {
    /** Les évaluateurs éligibles, par couple « domaine|secteur » ; `null` tant que la liste charge. */
    _evalEligibleCache?: Record<string, EvaluateurPr[] | null | undefined>;
  }
}

// Un champ de la fenêtre, lu comme l'ancien le lisait : il lève s'il manque.
const champ = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;

export async function openNewEvalModal(): Promise<void> {
    const D = requis('APP_STATE').data!;
    if (!prCanCreateEval()) {
        window.showToast(t('create_reserved'), 'error');
        return;
    }
    // Seuls les prestataires des secteurs couverts par le privilège sont proposés
    const allowed = new Set(prManagedSecteurs());
    const prestataires = (D.prestataires || [])
        .filter(p => p.actif !== false && p.actif !== 0)
        .filter(p => allowed.has(p.secteur_id as string));
    const secteurs = (D.secteurs || []).filter(s => allowed.has(s.id));
    if (!prestataires.length) {
        window.showToast(t('no_provider_in_scope'), 'warning');
        return;
    }

    requis('showModal')(t('new_eval'), `
        <div class="form-group">
            <label>${t('provider')}</label>
            <select id="evalPrestId">
                <option value="">${t('select_option')}</option>
                ${prestataires.map(p => `<option value="${p.id}" data-secteur="${p.secteur_id}">${window.escapeHtml(p.nom)} (${p.trigramme || ''})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${t('sector')}</label>
            <select id="evalSectId">
                <option value="">${t('select_option')}</option>
                ${secteurs.map(s => `<option value="${s.id}">${window.escapeHtml(s.nom)} (${window.escapeHtml(s.code)})</option>`).join('')}
            </select>
        </div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="createEval()">${t('add')}</button>`);

    // Le relevé des gestes rattache cet écouteur à son élément par la `const` qui le pose.
    const champPrest = document.getElementById('evalPrestId') as HTMLSelectElement;
    champPrest.addEventListener('change', function (this: HTMLSelectElement) {
        const opt = this.selectedOptions[0];
        const sectId = opt?.dataset?.['secteur'];
        if (sectId) champ('evalSectId').value = sectId;
    });
}

export async function createEval(): Promise<void> {
    const prestId = champ('evalPrestId').value;
    const sectId = champ('evalSectId').value;
    if (!prestId || !sectId) { window.showToast(t('select_provider_sector'), 'error'); return; }
    // L'ancien lisait la liste sans vérifier : `!` le dit, et la lecture lève de même.
    const prest = requis('APP_STATE').data!.prestataires!.find(p => p.id === prestId);
    try {
        await window.api(`${MODULE_API}/evaluations`, {
            method: 'POST',
            body: JSON.stringify({
                prestataire_id: prestId, secteur_id: sectId,
                domaine_id: prest?.domaine_id || '', statut: 'brouillon',
                notes_conf: {}, notes_perf: {}, notes_comp: {}, resultats: {}
            })
        });
        requis('closeModal')();
        await requis('loadAllData')();
        requis('renderPage')();
        window.showToast(t('draft_saved'));
    } catch (e) { window.showToast((e as Error).message, 'error'); }
}

// ── Évaluateurs éligibles (Gestion des Droits du module) ──
// Cache par couple domaine|secteur. Renvoie null tant que la liste charge ;
// le formulaire est re-rendu dès la réponse.
window._evalEligibleCache = window._evalEligibleCache || {};
export function evalEligibleEvaluators(domaineId: string | undefined, secteurId: string | undefined): EvaluateurPr[] | null | undefined {
    const key = `${domaineId || ''}|${secteurId || ''}`;
    const cache = window._evalEligibleCache as Record<string, EvaluateurPr[] | null | undefined>;
    if (cache[key] !== undefined) return cache[key];
    cache[key] = null; // en cours de chargement
    const qs = new URLSearchParams();
    if (domaineId) qs.set('domaine_id', domaineId);
    if (secteurId) qs.set('secteur_id', secteurId);
    window.api(`/api/m/droits/PLAN/evaluateurs?${qs.toString()}`)
        .then((list) => {
            cache[key] = Array.isArray(list) ? list as EvaluateurPr[] : [];
            if (requis('APP_STATE').currentEvalId) requis('openEvalDetail')(requis('APP_STATE').currentEvalId as string);
        })
        .catch(() => { cache[key] = []; });
    return null;
}

// Résout un identifiant d'évaluateur dans les listes chargées.
// L'identifiant est le nom d'utilisateur (= e-mail) : la liste du portail
// n'expose pas de champ `id`, d'où la comparaison sur username / email.
export function evalUserById(uid: string | undefined): EvaluateurPr | UtilisateurPr | null {
    if (!uid) return null;
    for (const list of Object.values(window._evalEligibleCache || {})) {
        if (!Array.isArray(list)) continue;
        const hit = list.find((x) => x.id === uid || x.username === uid || x.email === uid);
        if (hit) return hit;
    }
    return (requis('APP_STATE').data!.users || []).find(
        (x) => x.id === uid || x.username === uid || x.email === uid
    ) || null;
}

// Libellé d'un évaluateur : « NOM Prénom », jamais l'adresse e-mail
export function evalUserLabel(uid: string | undefined): string | undefined {
    const u = evalUserById(uid);
    if (!u) return uid;
    const full = `${(u.nom || '').trim()} ${(u.prenom || '').trim()}`.trim();
    return full || u.fullName || u.nom_utilisateur || u.email || uid;
}

// ── Fiche d'une évaluation ──
