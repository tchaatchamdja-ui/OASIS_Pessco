// OASIS — Planification : la barre de filtres que partagent les pages, et la
// rangée des années (ADR-003, 5.c — n° 5.f.109).
//
// Convertie à la lettre depuis `pl-shell.js` : les gabarits sont ceux
// d'origine, caractère pour caractère, et leurs gestes s'évaluent toujours dans
// la portée de la page — `PLAN_STATE`, `planResetFilters`, `_pesSearchInput`.
import { PLAN_ICONS } from './icones';
import { donnees, etat, requis, tp } from './partage';

/** Ce que la barre peut montrer ; tout ce qui n'est pas dit vaut sa valeur d'origine. */
export interface OptionsFiltres {
  showDomaine?: boolean;
  showSecteur?: boolean;
  showPrestataire?: boolean;
  showSousActivite?: boolean;
  showTheme?: boolean;
  showStatut?: boolean;
  showSearch?: boolean;
  showYear?: boolean;
  deuxLignes?: boolean;
}

/** Une entrée d'un référentiel, telle que la barre la lit. */
interface Ref {
  id: string;
  code?: string;
  nom?: string;
  libelle?: string;
  domaine_id?: string;
  secteur_id?: string;
  sous_activite_id?: string;
}

const esc = (v: unknown): string => requis('_esc')(v);

// ══════════════════════════════════════
//  FILTER BAR (reusable)
// ══════════════════════════════════════

export function _renderFilterBar(onchangeFunc: string, opts: OptionsFiltres = {}): string {
  const F = etat().filters;
  const domaines = donnees<Ref>('domaines');
  const secteurs = donnees<Ref>('secteurs');
  const prestataires = donnees<Ref>('prestataires');
  const sousActivites = donnees<Ref>('sousActivites');
  const themes = donnees<Ref>('themesSupervision');
  const plans = donnees<{ annee: number }>('plans');
  const years = [...new Set(plans.map((p) => p.annee))].sort((a, b) => b - a);

  // ── Filtres en cascade ──
  // Chaque liste ne propose que ce qui relève des choix déjà faits : les
  // secteurs d'un domaine, les organismes et les sous-activités d'un secteur,
  // les thèmes d'une sous-activité. À défaut de choix plus fin, on remonte
  // d'un cran — un domaine sans secteur retenu offre tout ce qu'il contient.
  const secteursDuDomaine = new Set(secteurs.filter((s) => s.domaine_id === F.domaine).map((s) => s.id));
  const dansLePerimetre = (secteurId?: string, domaineId?: string): boolean => {
    if (F.secteur) return secteurId === F.secteur;
    if (F.domaine) return secteursDuDomaine.has(secteurId || '') || domaineId === F.domaine;
    return true;
  };

  const filteredSecteurs = F.domaine ? secteurs.filter((s) => s.domaine_id === F.domaine) : secteurs;
  const filteredSA = sousActivites.filter((sa) => dansLePerimetre(sa.secteur_id, sa.domaine_id));
  const filteredPrestataires = prestataires.filter((p) => dansLePerimetre(p.secteur_id, p.domaine_id));
  const filteredThemes = themes.filter((th) => (F.sousActivite
    ? th.sous_activite_id === F.sousActivite
    : dansLePerimetre(th.secteur_id, th.domaine_id)));

  // Collect filter HTML first so we can count filters and decide whether the
  // reset button would end up alone on a new row in a 5-per-row grid.
  const filters: string[] = [];

  if (opts.showDomaine !== false) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.domaine=this.value;PLAN_STATE.filters.secteur='';PLAN_STATE.filters.sousActivite='';${onchangeFunc}">
        <option value="">${tp('all_domains')}</option>${domaines.map((d) => `<option value="${d.id}" ${F.domaine === d.id ? 'selected' : ''}>${d.code} - ${esc(d.nom)}</option>`).join('')}</select>`);

  if (opts.showSecteur !== false) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.secteur=this.value;PLAN_STATE.filters.sousActivite='';${onchangeFunc}">
        <option value="">${tp('all_sectors')}</option>${filteredSecteurs.map((s) => `<option value="${s.id}" ${F.secteur === s.id ? 'selected' : ''}>${s.code} - ${esc(s.nom)}</option>`).join('')}</select>`);

  // Sur le tableau de bord, l'organisme rejoint la seconde ligne, devant le
  // statut ; ailleurs il suit le secteur.
  const selectPrestataire = (): string => `<select class="form-select" onchange="PLAN_STATE.filters.prestataire=this.value;${onchangeFunc}">
        <option value="">${tp('all_providers')}</option>${filteredPrestataires.map((p) => `<option value="${p.id}" ${F.prestataire === p.id ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}</select>`;

  if (opts.showPrestataire && !opts.deuxLignes) filters.push(selectPrestataire());

  if (opts.showSousActivite) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.sousActivite=this.value;PLAN_STATE.filters.theme='';${onchangeFunc}">
        <option value="">${tp('all_sub_activities')}</option>${filteredSA.map((sa) => `<option value="${sa.id}" ${F.sousActivite === sa.id ? 'selected' : ''}>${sa.code} - ${esc(sa.nom)}</option>`).join('')}</select>`);

  if (opts.showTheme) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.theme=this.value;${onchangeFunc}">
        <option value="">${tp('all_themes')}</option>${filteredThemes.map((t) => `<option value="${t.id}" ${F.theme === t.id ? 'selected' : ''}>${esc(t.libelle)}</option>`).join('')}</select>`);

  if (opts.showStatut) {
    // Seconde ligne : l'organisme, puis le statut.
    if (opts.deuxLignes && opts.showPrestataire) filters.push(selectPrestataire());
    filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.statut=this.value;${onchangeFunc}">
        <option value="">${tp('all_statuses')}</option>
        <option value="brouillon" ${F.statut === 'brouillon' ? 'selected' : ''}>${tp('brouillon')}</option>
        <option value="soumis" ${F.statut === 'soumis' ? 'selected' : ''}>${tp('soumis')}</option>
        <option value="valide" ${F.statut === 'valide' ? 'selected' : ''}>${tp('valide')}</option>
        <option value="rejete" ${F.statut === 'rejete' ? 'selected' : ''}>${tp('rejete')}</option>
        <option value="en_cours_amendement" ${F.statut === 'en_cours_amendement' ? 'selected' : ''}>${tp('en_cours_amendement')}</option>
        </select>`);
  }

  const recherche = opts.showSearch === false ? ''
    : `<input type="text" class="form-input" id="plan-filter-search" placeholder="${tp('search')}" value="${esc(F.search)}" oninput="_pesSearchInput(this, () => { PLAN_STATE.filters.search=document.getElementById('plan-filter-search').value; ${onchangeFunc} })">`;
  const reinitialiser = `<button class="btn-icon-reset" onclick="planResetFilters()" title="${tp('reset_filters')}" aria-label="${tp('reset_filters')}">${PLAN_ICONS.reset}</button>`;

  // L'année ne se choisit plus dans la barre : une rangée de boutons la
  // précède, comme dans « Exécution de la Surveillance ».
  const boutonsAnnees = opts.showYear
    ? _planBoutonsAnnees(years, F.annee, (a) => `PLAN_STATE.filters.annee='${a}';${onchangeFunc}`)
    : '';

  // Deux lignes : quatre champs de même largeur en haut, l'organisme et le
  // statut à la même largeur en bas, la recherche et le bouton de remise à
  // zéro occupant le reste de la ligne.
  if (opts.deuxLignes) {
    return `${boutonsAnnees}<div class="plan-filter-bar plan-filter-grille">${filters.join('')}
            <div class="plan-filter-fin">${recherche}${reinitialiser}</div>
        </div>`;
  }

  return `${boutonsAnnees}<div class="plan-filter-bar">${filters.join('')}${recherche}${reinitialiser}</div>`;
}

// ── Années des plans ──
// Une rangée de boutons devant la barre de filtres : seules y figurent les
// années qu'un plan couvre — et celle retenue, même sans plan, pour que le
// choix en cours se voie toujours. `geste(a)` rend le code du clic.
export function _planBoutonsAnnees(
  annees: readonly unknown[] | null | undefined, retenue: unknown, geste: (a: string) => string,
): string {
  const r = String(retenue || '');
  const liste = [...new Set([...(annees || []), r].filter(Boolean).map(String))]
    .sort((a, b) => Number(b) - Number(a));
  if (!liste.length) return '';
  return `<div class="oasis-annees">
        <button type="button" class="oasis-annee${r ? '' : ' actif'}" onclick="${geste('')}">${tp('all_years')}</button>
        ${liste.map((a) => `<button type="button" class="oasis-annee${r === a ? ' actif' : ''}" onclick="${geste(a)}">${a}</button>`).join('')}
    </div>`;
}
