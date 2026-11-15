// OASIS — Planification : la liste des plans — ses accordions par domaine et
// secteur, son tri, la visibilité selon le privilège (ADR-003, 5.c — n° 5.f.106).
//
// Converti à la lettre depuis `pl-plans.js`, avec `detail-plan.ts` : le fichier
// d'origine passait les 600 lignes que le dépôt accorde à un fichier de
// frontend, et il portait déjà sa frontière — « PLANS LIST », « PLAN DETAIL ».
// Les deux modules vont dans le même paquet, qui n'en évalue qu'une copie. La
// photographie — la liste sous chaque tri et chaque filtre, l'accordéon à la
// souris et au clavier, le détail d'un plan dans chacun de ses statuts et sa
// lignée — n'a pas d'écart.
//
// L'état du tri vit sur `window._planTableSort`, comme avant : il y était posé
// à la main, et il est relu à chaque usage. Le sas l'initialise.
import { donnees, etat, requis, tp } from './partage';

export type Rec = Record<string, unknown>;
export interface Plan {
  id: string; titre?: string; annee?: number; type?: string; statut?: string; version?: number;
  domaine_id?: string; secteur_id?: string; parent_plan_id?: string; nb_activites?: number;
  createur_id?: string; created_by?: string; motif_amendement?: string; activites?: Activite[];
  createdAt?: string; updatedAt?: string; date_soumission?: string; date_validation?: string;
  soumettre_le?: string; valider_le?: string; approuver_dg_le?: string; transmettre_le?: string;
  rejeter_le?: string; archiver_le?: string;
  [champ: string]: unknown;
}
export type Activite = Rec & {
  id: string; plan_id?: string; objet?: string; titre?: string; prestataire_id?: string;
  secteur_id?: string; mode_supervision_id?: string; type_supervision_id?: string; responsable_id?: string;
  date_debut?: string; date_fin?: string; lieu_activite?: string; description_activite?: string;
  nombre_inspecteurs?: number; commentaire_validation?: string; verrouillee?: number | string;
  sous_activite_ids?: unknown; sous_activite_id?: string; themes_couverts?: unknown;
};
export interface Ref { id: string; code?: string; nom?: string; prenom?: string; libelle?: string; mode?: string; type_supervision?: string; sous_activite_id?: string; debut_cycle?: string; fin_cycle?: string }
interface Tri { col: string; dir: string }
export interface EtatPlans {
  _keepPrefill?: boolean; prefillPrestataire?: string; selectedPlan?: Plan | null;
  selectedPlanActivityRejet?: Set<string>; user?: { id?: string; username?: string } | null;
}

export const esc = (v: unknown): string => requis('_esc')(v);
const escAttr = (v: unknown): string => requis('_escAttr')(v);
export const E = (): EtatPlans => etat() as EtatPlans;
const tri = (): Tri => window._planTableSort as Tri;

// ══════════════════════════════════════
//  PLANS LIST (3 sub-menus)
// ══════════════════════════════════════

export function planRenderPlans(): string {
  // All plans regardless of status, except archived plans which are hidden from this page.
  // Les versions retirées par une version suivante ne figurent pas davantage
  // ici que les plans rangés à leur terme : la lignée les montre.
  let plans = donnees<Plan>('plans').filter((p) => !['archive', 'remplace'].includes(p.statut || ''));
  plans = requis('_applyPlanFilters')(plans);
  plans = _applyRoleFilter(plans);

  return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('nav_plans')}</h2>
            <div class="page-actions">
                ${requis('_canContribute')() ? `<button class="btn btn-primary btn-sm" onclick="planShowCreateModal('planifiees')">
                    ${PLAN_ICONS.add} ${tp('new_plan')}
                </button>` : ''}
            </div>
        </div>

        ${requis('_renderFilterBar')('planRenderPage()', { showPrestataire: true, showSousActivite: false, showTheme: false, showStatut: true, showYear: true })}

        <div class="card">
            <div class="card-body" id="plansTableContainer">
                ${_renderPlansByDomaineTypeAccordion(plans)}
            </div>
        </div>
    </div>`;
}

// Sort state for plans table — sur `window`, posé par le sas.
export function _planSortBy(col: string): void {
  const s = tri();
  s.dir = (s.col === col && s.dir === 'asc') ? 'desc' : 'asc';
  s.col = col;
  requis('planRenderPage')();
}

// En-tête d'un accordéon : le chevron, l'intitulé, le compteur. C'est un
// bouton pour le clavier comme pour la souris — Entrée ou Espace l'ouvrent —
// et il dit son état aux lecteurs d'écran. `titre` est du HTML déjà échappé.
export function _planAccEntete(titre: string, compte: string, ouvert: boolean): string {
  return `<div class="act-acc-header" role="button" tabindex="0" aria-expanded="${ouvert ? 'true' : 'false'}"
                 onclick="planAccBasculer(this)" onkeydown="planAccClavier(event, this)">
                <span class="act-acc-chevron" aria-hidden="true">${PLAN_ICONS.chevron}</span>
                <span class="act-acc-titre">${titre}</span>
                <span class="act-acc-count">${esc(compte)}</span>
            </div>`;
}

export function planAccBasculer(entete: HTMLElement): void {
  const item = entete.parentElement;
  if (!item) return;
  const ouvert = item.classList.toggle('expanded');
  entete.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
}

export function planAccClavier(e: { key: string; target: EventTarget | null; preventDefault(): void }, entete: HTMLElement): void {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  // Un lien ou un bouton posé dans l'en-tête garde sa touche : Entrée sur
  // « ouvrir le plan » ouvre le plan, elle ne replie pas l'accordéon.
  if (e.target !== entete) return;
  e.preventDefault();
  requis('planAccBasculer')(entete);
}

// Group plans by Domaine / Secteur into 2-level accordions.
function _renderPlansByDomaineTypeAccordion(plans: Plan[]): string {
  if (!plans.length) return `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`;

  const domaines = donnees<Ref>('domaines');
  const secteurs = donnees<Ref>('secteurs');
  const domById = new Map(domaines.map((d) => [d.id, d]));
  const secById = new Map(secteurs.map((s) => [s.id, s]));

  // Build 2-level map: domId → secId → plans[]
  const domMap = new Map<string, Map<string, Plan[]>>();
  plans.forEach((p) => {
    const domId = p.domaine_id || '';
    const secId = p.secteur_id || '';
    if (!domMap.has(domId)) domMap.set(domId, new Map());
    const secMap = domMap.get(domId) as Map<string, Plan[]>;
    if (!secMap.has(secId)) secMap.set(secId, []);
    secMap.get(secId)?.push(p);
  });

  // Sort domains by code
  const sortedDoms = Array.from(domMap.entries()).sort(([a], [b]) =>
    (domById.get(a)?.code || 'ZZZ').localeCompare(domById.get(b)?.code || 'ZZZ'));

  let html = '<div class="plan-activities-accordion">';
  sortedDoms.forEach(([domId, secMap], domIdx) => {
    const dom = domById.get(domId);
    const domLabel = dom ? `${dom.code} - ${esc(dom.nom)}` : `<span style="color:var(--text-muted);">-</span>`;
    const domTotal = Array.from(secMap.values()).reduce((s, ps) => s + ps.length, 0);

    // Sort sectors by code
    const sortedSecs = Array.from(secMap.entries()).sort(([a], [b]) =>
      (secById.get(a)?.code || 'ZZZ').localeCompare(secById.get(b)?.code || 'ZZZ'));

    let secHtml = '';
    sortedSecs.forEach(([secId, secPlans], secIdx) => {
      const sec = secById.get(secId);
      const secLabel = sec ? `${sec.code} - ${esc(sec.nom)}` : '-';
      const ouvert = secIdx === 0;
      secHtml += `
            <div class="act-acc-item act-acc-niveau-2${ouvert ? ' expanded' : ''}">
                ${_planAccEntete(secLabel, tp('acc_nb_plans', secPlans.length), ouvert)}
                <div class="act-acc-body">${_renderPlansTable(secPlans)}</div>
            </div>`;
    });

    const ouvert = domIdx === 0;
    html += `
        <div class="act-acc-item act-acc-niveau-1${ouvert ? ' expanded' : ''}">
            ${_planAccEntete(domLabel, tp('acc_nb_plans', domTotal), ouvert)}
            <div class="act-acc-body act-acc-groupes">${secHtml}</div>
        </div>`;
  });
  html += '</div>';
  return html;
}

// Visibilité des plans selon le privilège détenu sur leur secteur :
//   Gestionnaire  tous les plans
//   Validateur    tout son périmètre
//   Contributeur  les plans validés de son périmètre et ceux qu'il a créés
//   Lecteur       les plans validés de son périmètre
export function _applyRoleFilter<T extends { secteur_id?: string; statut?: string; createur_id?: string; created_by?: string }>(plans: T[]): T[] {
  if (requis('_isAdmin')() || requis('_meilleurPriv')() === 'GESTIONNAIRE') return plans;
  const moi = E().user?.id || E().user?.username || '';
  const privOn = requis('_privOn');
  return plans.filter((p) => {
    const priv = privOn(p.secteur_id);
    if (!priv || priv === 'AUCUN') return false;
    if (PL_VALIDE.includes(priv)) return true;
    if (priv === 'CONTRIBUTEUR') {
      return p.statut === 'valide' || p.createur_id === moi || p.created_by === moi;
    }
    return p.statut === 'valide';
  });
}

// Un plan amendé ne se supprime pas : le serveur le refuse, sa lignée se
// couperait. Le bouton reste visible — l'administrateur sait qu'il existe —
// mais inactif, et dit pourquoi.
function _planBoutonSupprimer(p: Plan): string {
  const amende = donnees<Plan>('plans').some((x) => x.parent_plan_id === p.id);
  if (amende) {
    return `<button class="btn-icon" disabled aria-disabled="true" style="opacity:.35;cursor:not-allowed;" title="${escAttr(tp('suppression_plan_amende'))}" aria-label="${escAttr(tp('suppression_plan_amende'))}">${PLAN_ICONS.delete}</button>`;
  }
  return `<button class="btn-icon text-danger" onclick="planDeletePlan('${p.id}')" title="${tp('delete')}" aria-label="${tp('delete')}">${PLAN_ICONS.delete}</button>`;
}

function _renderPlansTable(plans: Plan[]): string {
  if (!plans.length) return `<p class="text-center" style="padding:2rem;color:var(--text-muted);">${tp('no_data')}</p>`;
  const s = tri();
  const sortedPlans = [...plans].sort((a, b) => {
    let va: string | number; let vb: string | number;
    if (s.col === 'titre') { va = a.titre || ''; vb = b.titre || ''; }
    else if (s.col === 'annee') { va = a.annee || ''; vb = b.annee || ''; }
    else if (s.col === 'type') { va = a.type || ''; vb = b.type || ''; }
    else if (s.col === 'statut') { va = a.statut || ''; vb = b.statut || ''; }
    else if (s.col === 'version') { va = a.version || 0; vb = b.version || 0; }
    else if (s.col === 'nb_activites') { va = a.nb_activites || 0; vb = b.nb_activites || 0; }
    else { va = ''; vb = ''; }
    const cmp = typeof va === 'number' ? va - Number(vb) : String(va).localeCompare(String(vb));
    return s.dir === 'asc' ? cmp : -cmp;
  });
  const _th = (col: string, label: string): string => {
    const active = s.col === col;
    const arrow = active ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" onclick="_planSortBy('${col}')">${label}${arrow}</th>`;
  };
  const panneauDe = requis('planPrestThemesPanel');
  const contribue = requis('_canContribute');
  const valide = requis('_canValidate');
  const admin = requis('_isAdmin');
  const typeBadge = requis('_planTypeBadge');
  const statutBadge = requis('_statusBadge');
  // La table défile d'elle-même : l'accordéon qui la porte masque ce qui
  // dépasse, et les colonnes de droite — actions comprises — disparaissaient
  // sans barre pour les atteindre.
  return `
    <div class="plan-table-defile">
    <table class="data-table">
        <thead><tr>
            ${_th('titre', tp('plan_title'))}
            ${_th('annee', tp('year'))}
            ${_th('type', tp('plan_type'))}
            ${_th('statut', tp('status'))}
            ${_th('version', tp('version'))}
            ${_th('nb_activites', tp('activities'))}
            <th>${tp('actions')}</th>
        </tr></thead>
        <tbody>
            ${sortedPlans.map((p) => {
                // Plans périodiques : volet des prestataires du secteur et des
                // fréquences de surveillance par thème, sous l'enregistrement.
                const panneau = panneauDe(p);
                return `<tr>
                <td><div class="plan-titre-cellule">${panneau ? `<button class="plan-prest-toggle" onclick="planTogglePrestRow('${p.id}',this)" title="${tp('providers_of_sector')}" aria-label="${tp('providers_of_sector')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></button>` : '<span class="plan-prest-toggle-spacer"></span>'}<a href="#" onclick="planOpenDetail('${p.id}');return false;">${esc(p.titre)}</a></div></td>
                <td>${p.annee}</td>
                <td>${typeBadge(p.type)}</td>
                <td>${statutBadge(p.statut)}</td>
                <td>v${p.version || 1}</td>
                <td>${p.nb_activites || 0}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="planOpenDetail('${p.id}')" title="${tp('details')}" aria-label="${tp('details')}">${PLAN_ICONS.eye}</button>
                    ${contribue(p.secteur_id) ? `<button class="btn-icon" onclick="planShowEditModal('${p.id}')" title="${tp('edit')}" aria-label="${tp('edit')}">${PLAN_ICONS.edit}</button>` : ''}
                    ${valide(p.secteur_id) ? `<button class="btn-icon" onclick="planArchivePlan('${p.id}')" title="${tp('archive_plan')}" aria-label="${tp('archive_plan')}" style="color:var(--text-muted);">${PLAN_ICONS.archive || '🗄'}</button>` : ''}
                    ${admin() ? _planBoutonSupprimer(p) : ''}
                </td>
            </tr>${panneau ? `<tr class="plan-prest-row" id="prestRow_${p.id}" hidden><td colspan="7" style="padding:0;">${panneau}</td></tr>` : ''}`;
            }).join('')}
        </tbody>
    </table>
    </div>`;
}
