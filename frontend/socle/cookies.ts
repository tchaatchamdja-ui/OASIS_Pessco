// OASIS — Bandeau des témoins de connexion. Le socle, en TypeScript (ADR-003, 5.b).
//
// Ce qu'OASIS dépose tient en deux choses : un témoin de session, strictement
// nécessaire, et des préférences d'affichage rangées dans le navigateur. Rien
// qui trace, rien qui sorte du dispositif. Le bandeau l'annonce à la première
// visite ; il informe, il ne quémande pas un consentement — un témoin nécessaire
// ne se refuse pas, il se documente.
//
// Le fait de l'avoir lu se range là où vont les préférences : dans le navigateur,
// sur cet appareil. Effacer les données du navigateur le fait donc réapparaître,
// ce qui est la bonne conduite.
//
// Ce fichier ne touche pas à `window` : c'est `globales/oasis-cookies.ts` qui
// publie, et lui seul. Voir `theme.ts` pour la raison.

const CLE = 'oasis_cookies_vu';
const PAGE = '/cookies.html';

declare global {
  interface Window {
    /**
     * La traduction du portail (`public/js/i18n.js`, `function t(key, …)` —
     * déclarée en `function`, donc bien sur `window`).
     *
     * Optionnelle, et ce n'est pas une précaution de style : le bandeau peut
     * s'afficher avant que la table soit chargée, et les trois pages qui le
     * portent la chargent toutes — mais le secours en français existe pour
     * qu'un bandeau muet ne s'affiche jamais.
     */
    t?: (cle: string, ...args: unknown[]) => string;
  }
}

// Le bandeau ne s'affiche pas sur la page qui l'explique : elle dit déjà tout ce
// qu'il annonce.
const surLaPage = (): boolean => window.location.pathname === PAGE;

const lu = (): boolean => {
  // Le secours est `true` — stockage fermé, on n'affiche pas plutôt que
  // d'afficher à chaque page un bandeau qu'on ne pourra jamais faire taire.
  try { return localStorage.getItem(CLE) === '1'; } catch { return true; }
};

const marquerLu = (): void => {
  try { localStorage.setItem(CLE, '1'); } catch { /* navigation privée */ }
};

// Les libellés viennent de la table du portail quand elle est chargée ; à
// défaut, le français, pour qu'un bandeau muet ne s'affiche jamais.
const dire = (cle: string, secours: string): string =>
  (typeof window.t === 'function' ? window.t(cle) : secours) || secours;

export function afficher(): void {
  if (document.getElementById('oasisCookies')) return;
  const boite = document.createElement('div');
  boite.className = 'oasis-cookies';
  boite.id = 'oasisCookies';
  boite.setAttribute('role', 'note');
  boite.innerHTML = `
            <div class="oasis-cookies-texte">
                <span data-i18n="cookies_bandeau">${dire('cookies_bandeau', '')}</span>
                <a href="${PAGE}" data-i18n="cookies_en_savoir">${dire('cookies_en_savoir', 'En savoir plus')}</a>
            </div>
            <div class="oasis-cookies-actions">
                <button type="button" id="oasisCookiesOk"
                        data-i18n="cookies_compris">${dire('cookies_compris', 'J’ai compris')}</button>
            </div>`;
  document.body.appendChild(boite);
  document.getElementById('oasisCookiesOk')?.addEventListener('click', () => {
    marquerLu();
    boite.remove();
  });
}

export function demarrer(): void {
  if (surLaPage() || lu()) return;
  afficher();
}

/**
 * Effacement des préférences, appelé par la page des témoins : tout ce que
 * l'application a rangé dans ce navigateur part, y compris la marque de lecture
 * du bandeau. Rend le nombre de clés effacées.
 */
export function effacerPreferences(): number {
  const partent: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const cle = localStorage.key(i);
      if (cle !== null && /^(pr_|ramp_|exec_|oasis_)/.test(cle)) partent.push(cle);
    }
    partent.forEach((cle) => localStorage.removeItem(cle));
  } catch { /* stockage indisponible : rien à effacer */ }
  return partent.length;
}
