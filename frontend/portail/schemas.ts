// OASIS — Les schémas des référentiels du portail (ADR-003, 5.d).
//
// Première pièce de la réécriture d'`app-config.js`, et choisie pour une raison
// mesurée : c'est la **couche que toutes les autres lisent**. `refTable`,
// `openRefModal`, `fieldValue` et les onze sous-vues de configuration en
// dépendent ; aucune ne peut être réécrite avant elle.
//
// Elle est aussi la seule qui soit **pure** — ni DOM, ni appel d'API, ni état
// propre. Elle lit `window.REFS` et `window.ME`, que 5.b a posés sur `window`,
// et rend des options, des libellés et du balisage. C'est donc la pièce qu'on
// peut extraire sans rien déplacer d'autre.
//
// ── Ce que le typage a trouvé, et qui ne se voyait pas ──
//
// Les champs des onze schémas n'avaient aucune forme déclarée : `{ k, l }` ici,
// `{ k, l, type, options, resolve }` là, `inspectorOnly` sur trois, `only` sur
// un seul. Le compilateur impose désormais **une** forme, et les écarts
// deviennent des erreurs plutôt que des `undefined` silencieux.
//
// Les valeurs, en revanche, sont reprises **mot pour mot** : un libellé retapé
// est un libellé changé. La preuve en est faite par comparaison mécanique —
// voir `scripts/comparer-schemas.js`, qui rejoue les deux versions côte à côte
// sur les données réelles.
import { escapeHtml } from '../socle/utils';

/** Une option d'un champ `select` ou `multiselect` : valeur et libellé. */
export interface Option { v: string; t: string }

/** Un enregistrement de référentiel, tel que l'API le rend. */
export type Enregistrement = Record<string, unknown>;

/**
 * Un champ d'un schéma de référentiel.
 *
 * `k` est la clé dans l'enregistrement, `l` le libellé affiché. Tout le reste
 * est facultatif, et chaque option facultative a un rôle distinct :
 *
 * · `type` — comment le champ se saisit. Absent vaut « texte ».
 * · `allowEmpty` — un `select` qui accepte « aucun ».
 * · `options` — appelée **à chaque rendu**, car elle lit `REFS` : une liste
 *   figée à la définition serait vide au chargement de la page.
 * · `resolve` — comment la valeur s'affiche en table (un identifiant devient
 *   un code).
 * · `itemLabel` — idem, pour chaque élément d'un `multiselect`.
 * · `inspectorOnly` — le champ n'a de sens que pour un inspecteur.
 * · `only` — le champ n'a de sens que pour certains comptes.
 */
export interface Champ {
  k: string;
  l: string;
  type?: 'number' | 'select' | 'date' | 'multiselect';
  allowEmpty?: boolean;
  inspectorOnly?: boolean;
  options?: () => Option[];
  resolve?: (v: unknown) => string;
  itemLabel?: (v: unknown) => string;
  only?: () => boolean;
}

/** Un schéma de référentiel : son titre, et ses champs dans l'ordre. */
export interface Schema { title: string; fields: Champ[] }

// ── Lecture des référentiels ──
//
// `window.REFS` est typé `Record<string, unknown[]>` : on le resserre ici, une
// seule fois, plutôt que d'affirmer un type à chaque usage. Le garde-fou « le
// typage du frontend n'est défait nulle part » a déjà refusé deux contournements
// de ce genre, et il avait raison les deux fois.
const liste = (coll: string): Enregistrement[] =>
  (window.REFS[coll] ?? []) as Enregistrement[];

const texte = (v: unknown): string => (v == null ? '' : String(v));
const nombre = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Options des domaines : « CODE — Nom ». */
export function domaineOptions(): Option[] {
  return liste('domaines').map((d) => ({ v: texte(d.id), t: `${texte(d.code)} — ${texte(d.nom)}` }));
}

/** Options des secteurs : « CODE — Nom ». */
export function secteurOptions(): Option[] {
  return liste('secteurs').map((s) => ({ v: texte(s.id), t: `${texte(s.code)} — ${texte(s.nom)}` }));
}

/**
 * Le libellé d'un enregistrement désigné par son identifiant.
 *
 * Rend l'identifiant lui-même si l'enregistrement est introuvable, et un tiret
 * s'il n'y a pas d'identifiant : une table qui affiche un identifiant technique
 * dit à l'agent qu'une donnée manque, là où une case vide ne dit rien.
 */
export function refLabel(coll: string, id: unknown, field: string): string {
  const rec = liste(coll).find((r) => r.id === id);
  return rec ? texte(rec[field]) : (texte(id) || '—');
}

/** Options du personnel : « Nom Prénom », à défaut le numéro, à défaut l'identifiant. */
export function personnelOptions(): Option[] {
  return liste('inspecteurs').map((p) => ({
    v: texte(p.id),
    t: `${texte(p.nom)} ${texte(p.prenom)}`.trim() || texte(p.numero_inspecteur) || texte(p.id),
  }));
}

/** Le nom d'une personne du répertoire ; l'identifiant si elle est introuvable. */
export function personnelName(id: unknown): string {
  const p = liste('inspecteurs').find((x) => x.id === id);
  return p ? `${texte(p.nom)} ${texte(p.prenom)}`.trim() : texte(id);
}

/** Le champ « Statut », partagé par neuf schémas. */
export const STATUT_FIELD: Champ = {
  k: 'statut',
  l: 'Statut',
  type: 'select',
  options: () => [{ v: 'actif', t: 'Actif' }, { v: 'inactif', t: 'Inactif' }],
};

// ── Visibilité par instance ──
// La taxinomie de la surveillance est commune à l'Union, mais tout n'est pas
// offert partout : un domaine, un secteur, une sous-activité ou un thème peut
// n'être proposé qu'à certains États. Rien de coché vaut « toutes les
// instances » — c'est le cas par défaut, et le plus fréquent.
//
// Le champ n'a de sens que pour qui dispose de la liste des instances, c'est-
// à-dire le super-administrateur de l'Union : ailleurs, il ne s'affiche pas.
export const instanceOptions = (): Option[] =>
  (window.ME?.instance_vue?.instances ?? []).map((e) => ({ v: e, t: e }));

/** Le champ « Visible par les instances », porté par les quatre niveaux de la taxinomie. */
export const VISIBILITE_FIELD: Champ = {
  k: 'visibilite',
  l: 'Visible par les instances',
  type: 'multiselect',
  options: instanceOptions,
  only: () => instanceOptions().length > 0,
  resolve: (v) => (Array.isArray(v) && v.length ? v.join(', ') : 'Toutes'),
};

/** Champs d'un schéma que le compte courant doit voir. */
export const champsVisibles = (schema: Schema): Champ[] =>
  (schema.fields ?? []).filter((f) => !f.only || f.only());

/**
 * Les onze référentiels du portail, et leurs champs.
 *
 * Les libellés et les clés sont repris **mot pour mot** d'`app-config.js` :
 * c'est de la donnée, non du code, et la retaper serait la changer.
 */
export const REF_SCHEMAS: Record<string, Schema> = {
  organisation_levels: {
    title: 'Niveaux hiérarchiques',
    fields: [
      { k: 'type', l: 'Type de niveau' },
      { k: 'ordre', l: 'Ordre', type: 'number' },
    ],
  },
  organisation: {
    title: 'Entités organisationnelles',
    fields: [
      { k: 'type', l: 'Niveau', type: 'select', options: () => liste('organisation_levels').slice().sort((a, b) => nombre(a.ordre) - nombre(b.ordre)).map((lv) => ({ v: texte(lv.type), t: texte(lv.type) })) },
      { k: 'sigle', l: 'Sigle' },
      { k: 'libelle', l: 'Libellé' },
      { k: 'poste', l: 'Poste' },
      { k: 'titulaire_id', l: 'Titulaire', type: 'select', allowEmpty: true, options: personnelOptions, resolve: (v) => (v ? personnelName(v) : '—') },
      { k: 'interim_id', l: 'Intérimaire', type: 'select', allowEmpty: true, options: personnelOptions, resolve: (v) => (v ? personnelName(v) : '—') },
      { k: 'parent_id', l: 'Rattachement', type: 'select', allowEmpty: true, options: () => liste('organisation').map((o) => ({ v: texte(o.id), t: `${texte(o.sigle)} — ${texte(o.libelle)}` })), resolve: (v) => (v ? refLabel('organisation', v, 'sigle') : '—') },
      { k: 'ordre', l: 'Ordre', type: 'number' },
    ],
  },
  domaines: {
    title: 'Domaines',
    fields: [{ k: 'code', l: 'Code' }, { k: 'nom', l: 'Nom' }, { k: 'description', l: 'Description' }, STATUT_FIELD, VISIBILITE_FIELD],
  },
  secteurs: {
    title: 'Secteurs',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'nom', l: 'Nom' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'csn', l: 'Cycle (mois)', type: 'number' },
      STATUT_FIELD,
      VISIBILITE_FIELD,
    ],
  },
  sous_activites: {
    title: 'Sous-activités',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'nom', l: 'Nom' },
      { k: 'secteur_id', l: 'Secteur', type: 'select', options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      VISIBILITE_FIELD,
    ],
  },
  themes_supervision: {
    title: 'Thèmes de supervision',
    fields: [
      { k: 'code', l: 'Code' },
      { k: 'libelle', l: 'Libellé' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', allowEmpty: true, options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'secteur_id', l: 'Secteur', type: 'select', allowEmpty: true, options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      { k: 'sous_activite_id', l: 'Sous-activité', type: 'select', allowEmpty: true, options: () => liste('sous_activites').map((x) => ({ v: texte(x.id), t: `${texte(x.code)} — ${texte(x.nom)}` })), resolve: (v) => (v ? refLabel('sous_activites', v, 'code') : '—') },
      { k: 'description', l: 'Description' },
      STATUT_FIELD,
      VISIBILITE_FIELD,
    ],
  },
  exigences: {
    title: 'Liste des exigences',
    fields: [
      { k: 'reglement', l: 'Règlement' },
      { k: 'date_adoption', l: "Date d'adoption", type: 'date' },
      { k: 'reference', l: 'Référence' },
      { k: 'libelle', l: 'Libellé' },
      STATUT_FIELD,
    ],
  },
  prestataires: {
    title: 'Prestataires de services',
    fields: [
      { k: 'nom', l: 'Nom' },
      { k: 'trigramme', l: 'Trigramme' },
      { k: 'domaine_id', l: 'Domaine', type: 'select', allowEmpty: true, options: domaineOptions, resolve: (v) => refLabel('domaines', v, 'code') },
      { k: 'secteur_id', l: 'Secteur', type: 'select', allowEmpty: true, options: secteurOptions, resolve: (v) => refLabel('secteurs', v, 'code') },
      { k: 'dirigeant', l: 'Dirigeant' },
      { k: 'point_focal', l: 'Point focal' },
      { k: 'email_prestataire', l: 'Email' },
      { k: 'ref_agrement', l: 'Réf. agrément' },
      STATUT_FIELD,
    ],
  },
  inspecteurs: {
    title: "Liste du personnel de l'Administration",
    fields: [
      { k: 'ref_personnel', l: 'Réf Personnel' },
      { k: 'nom', l: 'Nom' },
      { k: 'prenom', l: 'Prénom' },
      { k: 'email', l: 'Email' },
      { k: 'est_inspecteur', l: 'Inspecteur ?', type: 'select', options: () => [{ v: 'non', t: 'Non' }, { v: 'oui', t: 'Oui' }] },
      { k: 'numero_inspecteur', l: 'N° inspecteur', inspectorOnly: true },
      { k: 'domaines', l: 'Domaines', type: 'multiselect', inspectorOnly: true, options: domaineOptions, itemLabel: (v) => refLabel('domaines', v, 'code') },
      { k: 'specialites', l: 'Spécialités', type: 'multiselect', inspectorOnly: true, options: () => liste('specialites_inspecteur').filter((s) => s.statut !== 'inactif').map((s) => ({ v: texte(s.id), t: texte(s.libelle) })), itemLabel: (v) => refLabel('specialites_inspecteur', v, 'libelle') },
      { k: 'niveau_qualification', l: 'Niveau de qualification', inspectorOnly: true, type: 'select', allowEmpty: true, options: () => liste('niveaux_qualifications').slice().sort((a, b) => nombre(a.ordre) - nombre(b.ordre)).map((n) => ({ v: texte(n.libelle), t: texte(n.libelle) })) },
      STATUT_FIELD,
    ],
  },
  specialites_inspecteur: {
    title: "Spécialités d'inspecteur",
    fields: [
      { k: 'libelle', l: 'Spécialité' },
      { k: 'domaines', l: 'Domaines', type: 'multiselect', options: domaineOptions, itemLabel: (v) => refLabel('domaines', v, 'code') },
      STATUT_FIELD,
    ],
  },
  types_supervision: {
    title: 'Types de supervision',
    fields: [
      { k: 'type_supervision', l: 'Type' },
      { k: 'description', l: 'Description' },
      STATUT_FIELD,
    ],
  },
  modes_supervision: {
    title: 'Modes de supervision',
    fields: [{ k: 'mode', l: 'Mode' }, { k: 'description', l: 'Description' }, STATUT_FIELD],
  },
  niveaux_qualifications: {
    title: 'Niveaux de qualification',
    fields: [{ k: 'libelle', l: 'Libellé' }, { k: 'ordre', l: 'Ordre', type: 'number' }, STATUT_FIELD],
  },
};

const VIDE = '<span style="color:var(--text-muted);">—</span>';

/**
 * La valeur d'un champ, telle qu'une table l'affiche — en balisage.
 *
 * L'ordre des cas n'est pas indifférent, et c'est celui d'`app-config.js` :
 * `inspectorOnly` passe **avant** tout le reste, si bien qu'un numéro
 * d'inspecteur sur une fiche non-inspecteur rend un tiret même s'il porte une
 * valeur. Intervertir deux de ces cas changerait ce que l'agent lit.
 */
export function fieldValue(field: Champ, record: Enregistrement): string {
  const raw = record[field.k];
  if (field.inspectorOnly && record.est_inspecteur !== 'oui') return VIDE;
  if (field.type === 'multiselect') {
    const arr = Array.isArray(raw) ? (raw as unknown[]) : [];
    if (!arr.length) return VIDE;
    return arr
      .map((v) => `<span class="shell-badge badge-neutral">${escapeHtml(field.itemLabel ? field.itemLabel(v) : v)}</span>`)
      .join(' ');
  }
  if (field.resolve) return field.resolve(raw);
  if (field.k === 'est_inspecteur') {
    return raw === 'oui'
      ? '<span class="shell-badge badge-active">Inspecteur</span>'
      : '<span class="shell-badge badge-neutral">Non</span>';
  }
  if (field.k === 'statut') {
    return raw === 'inactif'
      ? '<span class="shell-badge badge-inactive">Inactif</span>'
      : '<span class="shell-badge badge-active">Actif</span>';
  }
  return escapeHtml(raw ?? '—');
}
