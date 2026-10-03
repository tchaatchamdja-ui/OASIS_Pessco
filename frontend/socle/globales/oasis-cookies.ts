// OASIS — Le bandeau des témoins, publié en globales (ADR-003, 5.b).
//
// Sas de cohabitation. Il publie la seule globale que ce fichier posait, et
// branche le bandeau au chargement de la page — ce qui est un geste de
// publication, non de calcul : un écran en React qui importerait `cookies.ts`
// n'en voudrait pas, il appellerait `demarrer()` quand il l'entend.
import { demarrer, effacerPreferences } from '../cookies';

declare global {
  interface Window {
    oasisEffacerPreferences: () => number;
  }
}

window.oasisEffacerPreferences = effacerPreferences;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', demarrer);
} else {
  demarrer();
}
