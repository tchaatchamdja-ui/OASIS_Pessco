// OASIS — « Planification de la Surveillance » : la table des libellés, et ses
// deux lectures.
//
// `tp` lit la table du module, `pt` celle du portail. Leur comportement est
// celui de `pl-i18n.js`, à la lettre — la conversion ne corrige rien, elle
// rend vérifiable (ADR-003, n° 5.f.101) :
//
//   · `tp` retombe sur le français, puis sur la clé elle-même, et remplace
//     `{0}`, `{1}`… par ses arguments — **la première occurrence seulement**,
//     comme `String.prototype.replace` avec un motif textuel ;
//   · `pt` cherche dans `PORTAL_TRANSLATIONS`. Ce nom n'est défini **nulle
//     part** dans le dépôt — mesuré le 14 novembre 2026 —, et `pt` rend donc
//     toujours la clé. Il est lu sur `window`, là où un script le poserait ;
//     un `const` d'un autre script n'y serait pas, mais il n'en existe aucun.
import { PLAN_STATE } from './etat';
import { FR, type Cle } from './traductions.fr';
import { EN } from './traductions.en';
import { PT } from './traductions.pt';

export type { Cle };

/** Les trois volets, sous la forme que la page connaissait. */
export const PLAN_TR: Record<'fr' | 'en' | 'pt', Record<Cle, string>> = { fr: FR, en: EN, pt: PT };

type Volet = Record<string, string | undefined>;

// La table, vue comme on la lisait : indexée par une langue quelconque. Le type
// exact s'y affecte sans transtypage — c'est le même objet, et la lecture garde
// la sémantique de l'ancien, prototype compris.
const VOLETS: Record<string, Volet | undefined> = PLAN_TR;
const FRANCAIS: Volet = PLAN_TR.fr;

/**
 * Un libellé de PLAN. La clé est une chaîne et non un `Cle` : les fichiers
 * restés en JavaScript en composent (`tp('statut_' + s)`), et le typage des
 * appels viendra avec leur conversion.
 */
export function tp(key: string, ...args: unknown[]): string {
  let str = (VOLETS[PLAN_STATE.lang] || FRANCAIS)[key] || FRANCAIS[key] || key;
  // `String.prototype.replace` convertit lui-même son remplaçant : l'ancien lui
  // passait les arguments tels quels, et celui-ci aussi.
  args.forEach((a, i) => { str = str.replace(`{${i}}`, String(a)); });
  return str;
}

/** Un libellé du portail — voir l'en-tête : rend la clé, faute de table. */
export function pt(key: string): string {
  const lang = PLAN_STATE.lang || window.PESSCO?.lang || 'fr';
  const tables = window.PORTAL_TRANSLATIONS;
  const shared: Volet = tables ? (tables[lang] || tables.fr || {}) : {};
  return shared[key] || key;
}
