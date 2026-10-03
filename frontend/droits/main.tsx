// Le montage de l'écran.
//
// `index.html` appelle `drBoot()` au chargement : on garde ce point d'entrée
// plutôt que de monter à l'import. La page fait autre chose entre-temps — elle
// pose le module depuis l'URL, la clé de coquille, les actions de la barre
// supérieure — et monter trop tôt lirait un `window.DR_MODULE` pas encore écrit.
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { poserEtatPartage } from './socle';

window.drBoot = () => {
  const racine = document.getElementById('app');
  if (!racine) return;
  // Avant le premier rendu : le répertoire de traduction lit `window.DR`, et le
  // moindre `dt()` le ferait lever sans cela.
  poserEtatPartage(localStorage.getItem('pr_lang') || 'fr');
  createRoot(racine).render(<App />);
};
