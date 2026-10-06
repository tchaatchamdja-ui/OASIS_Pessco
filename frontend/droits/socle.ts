// La frontière avec le socle commun — et ce qui en reste.
//
// Ce fichier disait, à sa naissance : « tout ce que l'écran emprunte au socle est
// déclaré ici ». Il le disait parce que le socle commun était 2 250 lignes de
// JavaScript sans types, et qu'une déclaration écrite à la main était le seul
// moyen de les atteindre sous `strict`.
//
// **Il n'y a plus rien à déclarer.** Le socle est en TypeScript (ADR-003, 5.b) :
// l'échappement, les palettes, la langue, les dates viennent de leur source, et
// c'est elle qui les type. Le répertoire de traduction de l'écran, dernier
// fichier en JavaScript du module, est passé dans `./i18n.ts` le 6 octobre 2026.
//
// Ce qui subsiste de ce fichier n'est donc plus une frontière mais un **point de
// rassemblement** : ce que l'écran emprunte, réuni sous un nom, plus les deux
// choses qui lui sont propres — l'espace réglé par la page et le format
// d'horodatage de son journal.
//
// Il ne reste d'affirmation ici que `ICONS`, et elle partira avec le dernier
// `const` publié par un sas. Les quatre autres — `DR`, `dt`, et les globales
// lexicales `dtPriv` / `dtPrivDesc` — s'en sont allées avec la conversion du
// répertoire. C'est là que vivait `dtPriv`, le premier des deux mensonges
// déclaratifs qui ont motivé la suite `frontend`.
//
// Les deux noms que la page pose pour elle-même sont déclarés chez leur lecteur
// et chez leur auteur, selon la règle de 5.b : `DR_MODULE` dans `i18n.ts`, qui
// le lit, et `drBoot` dans `main.tsx`, qui le pose.

import { poser } from './i18n';

declare global {
  /**
   * Les icônes en SVG, fournies par `oasis-utils.js` — **et déclarées hors de
   * `Window`, ce qui n'est pas un détail de style.** `oasis-utils` les définit
   * en `const`, qui ne pose rien sur `window` : seuls `function` et `var` le
   * font. `Coquille.tsx` lisait `(window.ICONS || {}).shield`, qui rend
   * `undefined`, et le `|| ''` rendait le défaut muet — le bouclier de l'en-tête
   * manquait depuis la réécriture, sans que rien ne le dise.
   *
   * Un `const` au premier niveau d'un script crée une liaison du périmètre
   * lexical global : on l'atteint par son nom, et c'est ce que cette
   * déclaration dit au compilateur.
   *
   * **C'est la dernière de ce fichier**, et elle partira avec la conversion du
   * socle restant — `utils.ts` est déjà en TypeScript, mais `ICONS` y est encore
   * publié en `const` par le sas plutôt qu'exporté.
   */
  const ICONS: Record<string, string | undefined>;
}

/**
 * Une icône du socle, ou la chaîne vide. Le `?? ''` reste — une icône absente
 * ne doit pas arrêter un écran — mais il est **ici**, à un seul endroit, et non
 * répété sur chaque lecture où il camoufle une erreur de nom.
 */
export const icone = (nom: string): string => ICONS[nom] ?? '';

// ── Le répertoire de traduction vient de la source (ADR-003, 5.c) ──
//
// Il était chargé en `<script>` classique et lu par quatre déclarations écrites
// ici à la main. Trois de ces quatre étaient **justes par accident** : `dt` est
// une `function`, donc bien sur `window` ; `dtPriv` et `dtPrivDesc` sont des
// `const`, donc nulle part sur `window` — et il a fallu que l'écran s'arrête sur
// « window.dtPriv is not a function » pour l'apprendre.
//
// Il n'y a plus rien à déclarer : `./i18n.ts` est du TypeScript, et les clés
// elles-mêmes sont typées. `dt('cle_inexistante')` ne compile plus.
export { dt, MODULE, type Cle } from './i18n';
export { dtPriv as libellePrivilege, dtPrivDesc as descriptionPrivilege } from './i18n';
export { dtModule as libelleModule } from './i18n';

/**
 * Règle la langue du répertoire, **avant le premier rendu** et à chaque
 * changement de langue.
 *
 * Elle posait `window.DR = { lang, module }` ; ce global n'existait que parce
 * que le répertoire était un script séparé, et il s'en va avec lui. Le nom
 * reste — l'écran l'appelle à deux endroits — mais il ne « partage » plus rien :
 * il change la langue d'un module qui lit la sienne tout seul au chargement.
 */
export const poserEtatPartage = (lang: string): void => { poser(lang); };

// ── L'échappement vient de la source (ADR-003, 5.b) ──
//
// Une affirmation de moins sur `window`. `frontend/socle/utils.ts` est du
// TypeScript, et il porte lui-même les déclarations dont il a besoin : c'est
// **lui** qui dit d'où vient `oasisEsc`, et la suite `frontend` vérifie que les
// trois pages chargeant son sas le portent vraiment.
export { escapeHtml as esc } from '../socle/utils';

// ── Les palettes viennent de la source, non de `window` (ADR-003, 5.b) ──
//
// Ces trois noms étaient déclarés puis relus sur `window` : trois affirmations
// de plus que personne ne vérifiait. `frontend/socle/theme.ts` est désormais du
// TypeScript, et il n'y a plus rien à affirmer — **le type est la source**.
//
// Le sas `socle/globales/oasis-theme.ts` continue de poser les mêmes globales,
// pour les sept écrans restés en JavaScript. Le jour où il n'y en a plus, il
// disparaît et ces imports ne changent pas.
export { THEMES, nomTheme, themeEnregistre } from '../socle/theme';

// La palette et l'attribut `lang` viennent eux aussi de la source (ADR-003, 5.b).
// Deux déclarations de moins, et deux qui étaient **fausses** : `oasisPoserLangue`
// y était annoncé comme ne rendant rien, alors qu'il rend la langue retenue.
export { appliquerTheme, poserLangue } from '../socle/commun';

/**
 * L'horodatage d'une entrée de journal, dans la langue retenue.
 *
 * Même format qu'avant le portage : la date courte et l'heure à la seconde. Une
 * entrée d'audit se cite, et deux entrées de la même minute doivent se
 * distinguer.
 */
export const horodatage = (ts: string | number, langue: string): string => {
  const d = new Date(ts);
  const loc = ({ fr: 'fr-FR', en: 'en-GB', pt: 'pt-PT' } as Record<string, string>)[langue] || 'fr-FR';
  return `${d.toLocaleDateString(loc)} ${d.toLocaleTimeString(loc, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })}`;
};
