// OASIS — Les palettes de l'application. Le socle, en TypeScript (ADR-003, 5.b).
//
// Un seul endroit sait quelles palettes existent, comment elles s'appellent, et
// ce qu'il advient d'une clé qui a changé de nom. Le portail, la page de
// connexion et les six modules s'y réfèrent plutôt que de tenir chacun sa
// liste — trois d'entre elles s'étaient déjà désaccordées.
//
// ── Ce fichier ne touche pas à `window`, et c'est le point ──
//
// Le socle était consommé d'une seule façon : des globales posées par un script
// classique. Il l'est maintenant de deux, le temps de la cohabitation :
//
//   · les écrans restés en JavaScript les lisent toujours comme des globales.
//     C'est `globales/oasis-theme.ts` qui les pose, et lui seul ;
//   · les écrans en React les importent, **typés par cette source** et non par
//     une déclaration écrite à la main.
//
// La seconde consommation est la raison de la conversion. Une déclaration
// ambiante est une affirmation sur le monde que personne ne vérifie : deux fois
// elle a menti — `window.dtPriv`, puis `window.ICONS`, muet celui-là. Ici, il
// n'y a plus rien à affirmer : le type **est** la source.
//
// Le jour où le dernier écran en JavaScript s'en va, on supprime le fichier de
// `globales/` et il ne reste que ceci.

const CLE = 'pr_theme';

// La palette servie à défaut. Nommée, et non lue par `THEMES[0]` : avec
// `noUncheckedIndexedAccess`, cet index rend `string | undefined`, et il aurait
// fallu l'affirmer non nul — affirmer ce qu'on peut simplement dire.
const DEFAUT = 'blue-dark';

export const THEMES: readonly string[] = [DEFAUT, 'corporate', 'retro-avionics'];

// Un nom propre ne se traduit pas : ces libellés sont les mêmes dans les trois
// langues. Le portail tient les siens dans sa table de traduction, pour
// l'infobulle des pastilles ; ceux-ci servent aux six modules.
const NOMS: Readonly<Record<string, string>> = {
  'blue-dark': 'Bleu',
  corporate: 'Corporate',
  'retro-avionics': 'Retro-Avionics Jet',
};

// La palette « Retro-Avionics Jet » s'est appelée « grey » tant qu'elle était
// grise. Les navigateurs des agents portent encore l'ancienne clé : elle se
// convertit à la lecture, et la préférence est réécrite sous son nouveau nom —
// une fois, sans que personne ait à y penser.
const ANCIENS: Readonly<Record<string, string>> = { grey: 'retro-avionics' };

const lire = (): string | null => {
  try { return localStorage.getItem(CLE); } catch { return null; }
};

const ecrire = (v: string): void => {
  try { localStorage.setItem(CLE, v); } catch { /* stockage fermé */ }
};

/**
 * Ramène une clé à une palette servie : l'ancienne à sa remplaçante, une clé
 * inconnue — palette retirée, stockage abîmé — au thème par défaut.
 */
export function themeNormalise(cle: string | null): string {
  const converti = (cle !== null ? ANCIENS[cle] : undefined) ?? cle ?? DEFAUT;
  return THEMES.includes(converti) ? converti : DEFAUT;
}

/**
 * La préférence enregistrée, convertie si besoin — et réécrite dans la foulée,
 * pour que la conversion ne se refasse pas à chaque page.
 */
export function themeEnregistre(): string {
  const brut = lire();
  const theme = themeNormalise(brut);
  if (brut !== theme) ecrire(theme);
  return theme;
}

export const nomTheme = (cle: string): string => NOMS[cle] ?? cle;
