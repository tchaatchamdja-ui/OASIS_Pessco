// OASIS — « Mesures d'Application » (CARE) : la table des libellés, et sa lecture.
//
// `mt` est celle de `mes-i18n.js`, à la lettre — la conversion ne corrige rien,
// elle rend vérifiable (ADR-003, n° 5.f.116) :
//
//   · la langue est celle de l'état de l'écran, le français à défaut ;
//   · une langue inconnue lit le français ; une clé absente retombe sur le
//     français, puis sur elle-même — une traduction manquante n'efface jamais
//     le texte ;
//   · `{0}`, `{1}`… sont remplacés par leurs arguments **à chaque occurrence**,
//     par `split`/`join` : `$&` n'y a pas de sens particulier. C'est l'inverse
//     de `tp` de PLAN, qui ne remplace que la première — deux écrans, deux
//     règles, chacune gardée telle qu'elle était.
//
// ── D'où vient la langue ──
//
// L'ancien lisait `MES_STATE`, une globale **lexicale** de `mes-app.js`, encore en
// JavaScript : un module ne la voit pas. Il la lit sur `window`, où `mes-app.js`
// la pose lui-même (son `Object.assign(window, { MES_STATE, … })`) — c'est le
// même objet, mesuré dans la page le 17 novembre 2026.
//
// Une seule fenêtre où les deux lectures diffèrent : pendant le premier niveau
// de `mes-app.js`, entre sa déclaration et sa pose. L'ancien y lisait l'état, le
// nouveau n'y trouve rien et prend le français — et l'état y vaut `lang: 'fr'`,
// la langue n'étant retenue qu'au démarrage. Le résultat est le même.
import { FR, type Cle } from './traductions.fr';
import { EN } from './traductions.en';
import { PT } from './traductions.pt';

export type { Cle };

/** Les trois volets, sous la forme que la page connaissait. */
export const MES_TR: Record<'fr' | 'en' | 'pt', Record<Cle, string>> = { fr: FR, en: EN, pt: PT };

type Volet = Record<string, string | undefined>;

// La table, vue comme on la lisait : indexée par une langue quelconque. Le type
// exact s'y affecte sans transtypage — c'est le même objet, prototype compris.
const VOLETS: Record<string, Volet | undefined> = MES_TR;
const FRANCAIS: Volet = MES_TR.fr;

/**
 * Un libellé de CARE, avec textes à trou : `mt('kpi_visees', 3)`. La clé est une
 * chaîne et non un `Cle` : les fichiers restés en JavaScript en composent
 * (`mt('origine_' + o)`), et le typage des appels viendra avec leur conversion.
 */
export function mt(cle: string, ...valeurs: unknown[]): string {
  const langue = window.MES_STATE?.lang || 'fr';
  const table = VOLETS[langue] || FRANCAIS;
  const ici = table[cle];
  const repli = FRANCAIS[cle];
  const texte = ici !== undefined ? ici : (repli !== undefined ? repli : cle);
  return valeurs.reduce<string>((t, v, i) => t.split(`{${i}}`).join(String(v)), texte);
}
