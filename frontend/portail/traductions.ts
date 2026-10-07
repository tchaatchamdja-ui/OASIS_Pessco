// OASIS — Les libellés du portail. Le portail, en TypeScript (ADR-003, 5.c).
//
// Trois langues sur toute la surface : français, anglais, portugais. **268 clés
// par volet**, chargées par les trois pages du portail — l'accueil, la connexion
// et la page des témoins.
//
// ── Ce que le typage ajoute, et qui n'est pas une précaution de style ──
//
// Le volet français **définit** les clés ; les deux autres doivent porter
// exactement les mêmes. Une traduction oubliée devient une **erreur de
// construction**, non un libellé français au milieu d'un écran portugais.
//
// La même conversion sur le répertoire de DROITS a trouvé `dt('chargement')` —
// une clé appelée et absente de la table, qui faisait annoncer « chargement »
// dans les trois langues depuis trois semaines. Aucun contrôle de forme ne
// pouvait la voir.
//
// ── Ce fichier ne touche pas à `window` ──
//
// C'est `globales/i18n.ts` qui publie, et lui seul. Six noms sont en jeu, et la
// mesure dit lesquels : voir le sas, qui porte le relevé.
//
// Les trois volets vivent dans `traductions.{fr,en,pt}.ts` — un fichier par
// langue, 268 clés chacun. Ils y sont repris verbatim de l'original.

export type Langue = 'fr' | 'en' | 'pt';

import { FR } from './traductions.fr';

/** Une clé de libellé. Déduite du volet français : il n'y a rien à tenir à jour. */
export type Cle = keyof typeof FR;

// Les deux autres volets sont importés **après** la déclaration de `Cle`, qu'ils
// importent en retour. Le cycle est entre un type et une valeur : TypeScript le
// résout, et esbuild n'émet rien pour un import de type.
import { EN } from './traductions.en';
import { PT } from './traductions.pt';

const VOLETS: Readonly<Record<Langue, Readonly<Record<Cle, string>>>> = { fr: FR, en: EN, pt: PT };

const CLE_LANGUE = 'pr_lang';
const CONNUES: readonly Langue[] = ['fr', 'en', 'pt'];

const normaliser = (lg: string | null): Langue =>
  CONNUES.find((l) => l === String(lg ?? '').slice(0, 2)) ?? 'fr';

// La langue se lit du stockage **au chargement**, comme le faisait `let
// CURRENT_LANG = localStorage.getItem(LANG_KEY) || 'fr'`. Le `try` n'est pas
// décoratif : en navigation privée, l'accès lève, et un fichier de libellés qui
// lève au chargement laisse les trois pages à leur source.
let langue: Langue = (() => {
  try { return normaliser(localStorage.getItem(CLE_LANGUE)); } catch { return 'fr'; }
})();

export const langueRetenue = (): Langue => langue;

const trous = (texte: string, valeurs: readonly unknown[]): string =>
  valeurs.reduce<string>((s, v, i) => s.replace(`{${i}}`, String(v)), texte);

/**
 * Le libellé d'une clé **connue**. Les arguments comblent `{0}`, `{1}`… — même
 * convention que les dictionnaires des modules, pour que la place du nom dans la
 * phrase suive la langue.
 *
 * Le repli sur le français a disparu : `Record<Cle, string>` interdit qu'un
 * volet soit incomplet, et garder un repli inatteignable laisserait croire qu'il
 * protège de quelque chose.
 */
export function t(cle: Cle, ...valeurs: unknown[]): string {
  return trous(VOLETS[langue][cle], valeurs);
}

/**
 * Le libellé d'une clé **lue à l'exécution** — un attribut `data-i18n` du
 * balisage, une clé construite par concaténation. Celles-là peuvent manquer, et
 * le repli complet est gardé ici : volet, puis français, puis la clé elle-même.
 *
 * Nommée à part plutôt que confondue avec `t` : la tolérance est le propre de
 * ces appels, non une facilité offerte aux autres, qui doivent se tromper à la
 * construction.
 */
export function tSouple(cle: string, ...valeurs: unknown[]): string {
  const volet: Readonly<Record<string, string | undefined>> = VOLETS[langue];
  const secours: Readonly<Record<string, string | undefined>> = FR;
  return trous(volet[cle] ?? secours[cle] ?? cle, valeurs);
}

/**
 * Change la langue : la retient, pose l'attribut du document, retraduit le
 * balisage marqué, et marque le bouton actif.
 *
 * Rend la langue réellement retenue — une langue inconnue retombe sur le
 * français, et l'appelant doit pouvoir le savoir.
 */
export function poserLangue(demandee: string): Langue {
  langue = normaliser(demandee);
  try { localStorage.setItem(CLE_LANGUE, langue); } catch { /* stockage fermé */ }
  document.documentElement.lang = langue;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = tSouple(el.dataset.i18n ?? '');
  });
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = tSouple(el.dataset.i18nPlaceholder ?? '');
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = tSouple(el.dataset.i18nTitle ?? '');
  });
  document.querySelectorAll<HTMLElement>('.lang-btn').forEach((b) => {
    b.classList.toggle('active', (b.textContent ?? '').trim().toLowerCase() === langue);
  });
  return langue;
}
