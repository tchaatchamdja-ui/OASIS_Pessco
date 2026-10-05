// OASIS — Les deux règles communes aux dates des formulaires. Le socle, en
// TypeScript (ADR-003, 5.b).
//
//   1. une date de début tombe dans l'année déclarée par le formulaire ;
//   2. une date de fin ne précède jamais la date de début.
//
// Chaque module posait ses propres contrôles, ou n'en posait aucun : un même
// couple de dates s'y saisissait à l'envers sans que rien ne le dise. Les deux
// règles se tiennent ici, et chaque formulaire les branche de la même façon :
//
//   oasisDatesLier({ annee: 'planAnnee', debut: 'actDebut', fin: 'actFin' });
//
// `annee` est facultatif ; il accepte l'identifiant d'un champ ou l'année
// elle-même — l'activité d'un plan tient l'année de son plan, non d'un champ.
// Sans année, seule la seconde règle s'applique. `debut` l'est aussi : un
// formulaire qui n'a qu'une échéance rattachée à une année garde la première.
// Chaque clé accepte également un élément, pour les champs sans identifiant.
//
// `lier` pose les bornes des champs — le calendrier n'ouvre alors que sur ce
// qui est acceptable — et les tient à jour. La saisie au clavier passant outre,
// l'enregistrement appelle `valider`, qui rend `false` après avoir dit la règle
// par le panneau flottant et mis en rouge les champs qu'elle concerne. La marque
// tient jusqu'à correction.
//
// Ce fichier ne touche pas à `window` pour publier : voir `globales/oasis-dates.ts`.

const CLASSE = 'oasis-champ-invalide';

type Langue = 'fr' | 'en' | 'pt';

const MESSAGES: Readonly<Record<Langue, { annee: (a: string) => string; ordre: string }>> = {
  fr: {
    annee: (a) => `La date de début doit être dans l’année ${a}.`,
    ordre: 'La date de fin doit être postérieure ou égale à la date de début.',
  },
  en: {
    annee: (a) => `The start date must fall within ${a}.`,
    ordre: 'The end date must be on or after the start date.',
  },
  pt: {
    annee: (a) => `A data de início deve estar no ano ${a}.`,
    ordre: 'A data de fim deve ser igual ou posterior à data de início.',
  },
};

declare global {
  interface Window {
    /** Posé par certains écrans ; la préférence du navigateur sinon. */
    CURRENT_LANG?: string;
  }
}

const langue = (): Langue => {
  let brut = '';
  try { brut = window.CURRENT_LANG || localStorage.getItem('pr_lang') || 'fr'; } catch { brut = 'fr'; }
  const l = brut.slice(0, 2);
  return (l === 'fr' || l === 'en' || l === 'pt') ? l : 'fr';
};

/**
 * Une cible désigne un champ : par son identifiant, ou directement.
 * `annee` accepte en plus l'année elle-même — l'activité d'un plan tient
 * l'année de son plan, non d'un champ.
 */
export type Cible = string | HTMLElement | null | undefined;

export interface ConfigDates {
  annee?: Cible | number;
  debut?: Cible;
  fin?: Cible;
  /** Rattache une échéance seule à l'année déclarée, sans date de début. */
  finDansAnnee?: boolean;
}

// Le retour est typé `HTMLInputElement`, et c'est une affirmation assumée : le
// contrat de ces fonctions est « un champ de saisie de date ». Vérifier par
// `instanceof` serait **plus strict que l'ancien code**, qui acceptait n'importe
// quel élément et lisait son `value` — durcir en passant n'est pas convertir.
const elem = (x: Cible | number): HTMLInputElement | null => {
  if (!x) return null;
  if (typeof x === 'string') return document.getElementById(x) as HTMLInputElement | null;
  if (typeof x === 'number') return null;
  return x.nodeType === 1 ? (x as HTMLInputElement) : null;
};

const valeur = (x: Cible): string => {
  const e = elem(x);
  return e ? String(e.value || '').trim() : '';
};

// L'année vient d'un champ, ou du formulaire lui-même quand elle n'y est pas
// saisie — l'activité d'un plan, la constatation d'une inspection.
const annee = (a: Cible | number): string => {
  if (a === undefined || a === null || a === '') return '';
  const e = elem(a);
  if (e) return String(e.value || '').trim();
  return /^\d{4}$/.test(String(a).trim()) ? String(a).trim() : '';
};

export interface Controle { message: string; champs: (HTMLInputElement | null)[] }

/**
 * Rend le message à dire et les champs qu'il désigne, ou un message vide si les
 * dates se tiennent.
 */
export function controler(config?: ConfigDates): Controle {
  const c = config || {};
  const m = MESSAGES[langue()];
  const an = annee(c.annee);
  const debut = valeur(c.debut);
  const fin = valeur(c.fin);
  if (debut && an && debut.slice(0, 4) !== an) {
    return { message: m.annee(an), champs: [elem(c.annee), elem(c.debut)] };
  }
  if (debut && fin && fin < debut) {
    return { message: m.ordre, champs: [elem(c.debut), elem(c.fin)] };
  }
  // Sans date de début, une échéance seule se rattache tout de même à l'année
  // déclarée : c'est la première règle, sur l'autre bout du couple.
  if (!debut && fin && an && fin.slice(0, 4) !== an && c.finDansAnnee) {
    return { message: m.annee(an), champs: [elem(c.annee), elem(c.fin)] };
  }
  return { message: '', champs: [] };
}

function marquer(config: ConfigDates, champs: (HTMLInputElement | null)[]): void {
  const c = config || {};
  [elem(c.annee), elem(c.debut), elem(c.fin)].forEach((e) => {
    if (e && e.classList) e.classList.toggle(CLASSE, champs.indexOf(e) !== -1);
  });
}

/**
 * Bornes portées par les champs eux-mêmes : le calendrier du début n'ouvre que
 * sur l'année déclarée, celui de la fin ne remonte pas avant le début.
 */
export function borner(config?: ConfigDates): void {
  const c = config || {};
  const an = annee(c.annee);
  const debut = elem(c.debut);
  const fin = elem(c.fin);
  const bornee = /^\d{4}$/.test(an);
  if (debut) {
    debut.min = bornee ? `${an}-01-01` : '';
    debut.max = bornee ? `${an}-12-31` : '';
  }
  if (fin) fin.min = (debut && debut.value) || '';
  // La marque suit la correction : elle s'efface dès que les règles sont tenues,
  // et ne s'allume pas d'elle-même en cours de saisie — on ne signale pas une
  // faute à qui est encore en train d'écrire.
  const marque = [elem(c.annee), elem(c.debut), elem(c.fin)]
    .some((e) => !!e && !!e.classList && e.classList.contains(CLASSE));
  if (!marque) return;
  marquer(c, controler(c).champs);
}

/**
 * Branchement d'un formulaire : les bornes se posent tout de suite, puis à
 * chaque changement de l'année ou du début.
 */
export function lier(config?: ConfigDates): void {
  const c = config || {};
  const suivre = (x: Cible | number, evenement: string): void => {
    const e = elem(x);
    if (!e || e.dataset.oasisDates === evenement) return;
    e.dataset.oasisDates = evenement;
    e.addEventListener(evenement, () => borner(c));
  };
  suivre(c.annee, 'input');
  suivre(c.debut, 'change');
  suivre(c.fin, 'change');
  borner(c);
}

/**
 * Contrôle à l'enregistrement. Rend `true` si les dates se tiennent ; sinon dit
 * la règle, marque les champs, y pose le curseur et rend `false`.
 */
export function valider(config?: ConfigDates): boolean {
  const c = config || {};
  const ctrl = controler(c);
  marquer(c, ctrl.champs);
  if (!ctrl.message) return true;
  if (typeof window.oasisToast === 'function') window.oasisToast(ctrl.message, 'warning');
  const dernier = ctrl.champs[ctrl.champs.length - 1];
  if (dernier && dernier.focus) dernier.focus();
  return false;
}

// ── Date du calendrier local ──
//
// `toISOString` rend la date en temps universel. À UTC+1 — Bénin, Niger —
// minuit local tombe la veille à 23 h UTC : une date construite en heure locale
// sortait décalée d'un jour, et la date du jour retardait d'un jour chaque nuit
// entre minuit et une heure. Ces deux fonctions lisent la date et l'heure telles
// que l'agent les voit.
const deux = (n: number): string => String(n).padStart(2, '0');

export function jour(d?: Date): string {
  const x = d instanceof Date ? d : new Date();
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${deux(x.getMonth() + 1)}-${deux(x.getDate())}`;
}

export function horodatage(d?: Date): string {
  const x = d instanceof Date ? d : new Date();
  if (Number.isNaN(x.getTime())) return '';
  return `${jour(x)} ${deux(x.getHours())}:${deux(x.getMinutes())}:${deux(x.getSeconds())}`;
}
