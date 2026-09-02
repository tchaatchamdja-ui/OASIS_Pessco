/* OASIS — Attente : l'aéronef en orbite, posé partout où l'on patiente.
 *
 * Un seul dessin, servi par `oasisLoaderHtml()`. Les écrans existants n'ont
 * rien à changer : tout `.loading-spinner` vide et tout bloc marqué
 * `data-oasis-loader` reçoit le globe, y compris ceux qu'un module crée en
 * cours de route.
 */
(function () {
  const SVG = `
    <svg class="oasis-loader" viewBox="0 0 120 120" role="img" aria-label="Chargement">
      <ellipse class="oasis-loader-orbite" cx="60" cy="60" rx="48" ry="30"></ellipse>
      <circle class="oasis-loader-sphere" cx="60" cy="60" r="20"></circle>
      <g class="oasis-loader-grille">
        <ellipse cx="60" cy="60" rx="20" ry="7.5"></ellipse>
        <path d="M41.5 52.5h37M41.5 67.5h37"></path>
        <ellipse class="oasis-loader-meridien" cx="60" cy="60" rx="8" ry="20"></ellipse>
        <ellipse class="oasis-loader-meridien oasis-loader-meridien-2" cx="60" cy="60" rx="14" ry="20"></ellipse>
        <ellipse class="oasis-loader-meridien oasis-loader-meridien-3" cx="60" cy="60" rx="18.5" ry="20"></ellipse>
      </g>
      <!-- L'appareil, nez en avant : la trajectoire l'oriente d'elle-même. -->
      <path class="oasis-loader-avion"
            d="M15 0 L11 1.8 1 2.2 -5 9 -8.5 9 -5.8 2.2 -11 2.2 -13.5 5.2 -16 5.2
               -14.6 0 -16 -5.2 -13.5 -5.2 -11 -2.2 -5.8 -2.2 -8.5 -9 -5 -9 1 -2.2 11 -1.8 Z"></path>
    </svg>`;

  function oasisLoaderHtml(legende) {
    return `<div class="oasis-loader-bloc">${SVG}${legende
      ? `<span>${String(legende).replace(/[&<>]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>` : ''}</div>`;
  }

  // Un conteneur déjà servi ne se redessine pas : l'animation repartirait de
  // zéro à chaque passage de l'observateur.
  function poser(el) {
    if (!el || el.querySelector('.oasis-loader')) return;
    const legende = el.hasAttribute('data-oasis-loader') ? el.textContent.trim() : '';
    el.innerHTML = oasisLoaderHtml(legende);
    if (legende) el.removeAttribute('data-oasis-loader');
  }

  function balayer(racine) {
    (racine || document).querySelectorAll('.loading-spinner, [data-oasis-loader]')
      .forEach(poser);
  }

  window.oasisLoaderHtml = oasisLoaderHtml;
  window.oasisLoaderPoser = balayer;

  document.addEventListener('DOMContentLoaded', () => {
    balayer();
    // Les écrans se redessinent : un disque d'attente peut apparaître bien
    // après le chargement de la page. On n'examine que les nœuds ajoutés, et
    // une seule fois par trame — un module qui redessine sa page à chaque
    // frappe produit des dizaines de mutations pour un seul rendu.
    let prevu = false;
    const observateur = new MutationObserver((mutations) => {
      if (prevu) return;
      const ajouts = mutations.some((m) => m.addedNodes.length);
      if (!ajouts) return;
      prevu = true;
      requestAnimationFrame(() => { prevu = false; balayer(); });
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}());
