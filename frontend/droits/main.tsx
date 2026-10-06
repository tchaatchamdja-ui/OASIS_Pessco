// Le montage de l'écran.
//
// `index.html` appelle `drBoot()` au chargement : on garde ce point d'entrée
// plutôt que de monter à l'import. La page fait autre chose entre-temps — elle
// pose le module depuis l'URL, la clé de coquille, les actions de la barre
// supérieure — et monter trop tôt lirait un `window.DR_MODULE` pas encore écrit.
import { createRoot } from 'react-dom/client';
import { App } from './App';

declare global {
  interface Window {
    /**
     * Le point d'entrée que la page appelle au chargement.
     *
     * Déclaré ici parce que c'est **ici qu'il est posé** — la règle de 5.b. Il
     * l'était dans `socle.ts`, qui ne le pose ni ne le lit.
     */
    drBoot?: () => void;
  }
}

window.drBoot = () => {
  const racine = document.getElementById('app');
  if (!racine) return;
  // Rien à régler avant le rendu : le répertoire de traduction lit la langue de
  // `localStorage` à son chargement, comme le reste du socle. L'appel qui était
  // ici — `poserEtatPartage(…)` — réglait un état dont le secours était
  // plausible, donc silencieux.
  createRoot(racine).render(<App />);
};
