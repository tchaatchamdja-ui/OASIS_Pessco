// OASIS — « Profils de Risque » (PR) : la table des libellés, et sa lecture.
//
// `t` est celle de `pr-utils.js`, à la lettre — la conversion ne corrige rien,
// elle rend vérifiable (ADR-003, n° 5.f.128) :
//
//   · la langue est celle de l'état de l'écran, puis celle retenue dans le
//     navigateur (`pr_lang`), le français à défaut ;
//   · une traduction **vide** compte pour absente : `||` et non `??`. Une clé
//     absente retombe sur le français, puis sur elle-même ;
//   · `{0}`, `{1}`… ne sont remplacés qu'à leur **première** occurrence, par
//     `String.prototype.replace` : `$&` ou `$1` dans un argument y gardent le
//     sens que `replace` leur donne. C'est la règle de `tp` de PLAN, l'inverse
//     de `mt` de CARE — trois écrans, et chacun garde la sienne.
import { FR, type Cle } from './traductions.fr';
import { EN } from './traductions.en';
import { PT } from './traductions.pt';

export type { Cle };

/** Les trois volets, sous le nom et la forme que la page connaissait. */
export const TRANSLATIONS: Record<'fr' | 'en' | 'pt', Record<Cle, string>> = { fr: FR, en: EN, pt: PT };

type Volet = Record<string, string | undefined>;

// La table, vue comme on la lisait : indexée par une langue et une clé
// quelconques. C'est le même objet, prototype compris — une clé comme
// `constructor` y lit ce qu'elle y lisait.
const VOLETS: Record<string, Volet | undefined> = TRANSLATIONS;
const FRANCAIS: Volet = TRANSLATIONS.fr;

/**
 * Un libellé de PR, avec textes à trou : `t('submit_missing_scores', 2, 3)`. La
 * clé est une chaîne et non un `Cle` : les fichiers restés en JavaScript en
 * composent, et le typage des appels viendra avec leur conversion.
 */
export function t(key: string, ...args: unknown[]): string {
  const lang = window.APP_STATE?.lang || localStorage.getItem('pr_lang') || 'fr';
  let str = VOLETS[lang]?.[key] || FRANCAIS[key] || key;
  // `replace` reçoit l'argument tel quel, comme l'ancien : une fonction y
  // serait appelée, un nombre converti. Le type le dit sans rien changer.
  args.forEach((arg, i) => { str = str.replace(`{${i}}`, arg as string); });
  return str;
}
