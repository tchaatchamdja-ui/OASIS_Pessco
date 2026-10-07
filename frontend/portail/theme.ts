// OASIS — La palette, du point de vue du portail (ADR-003, 5.c).
//
// Trois lignes, et elles méritent leur fichier : le sas les publie sous le nom
// `applyTheme` pour les fichiers restés en JavaScript, et la page de connexion
// les **importe**. Laissées dans le sas, la page aurait dû lire la globale que
// le sas lui pose — un détour par `window` entre deux fichiers typés.
//
// ── Pourquoi ce n'est pas `appliquerTheme` du socle ──
//
// `frontend/socle/commun.ts` en porte un, qui fait les mêmes trois gestes. Il
// **ne normalise pas** la clé : un thème retiré, ou enregistré sous un nom qui a
// changé, y passerait tel quel et l'attribut du document porterait une palette
// qui n'existe plus. Celui-ci le ramène à une palette servie, comme le faisait
// `i18n.js`. Les deux ne sont donc pas interchangeables, et c'est écrit ici pour
// qu'on ne les confonde pas en voulant « dédoublonner ».
import { themeNormalise } from '../socle/theme';

const CLE = 'pr_theme';

/** Applique une palette, marque sa pastille, et la retient. */
export function appliquerPalette(demande: string | null): string {
  const theme = themeNormalise(demande);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll<HTMLElement>('.theme-dot')
    .forEach((d) => d.classList.toggle('active', d.dataset.theme === theme));
  try { localStorage.setItem(CLE, theme); } catch { /* stockage fermé */ }
  return theme;
}
