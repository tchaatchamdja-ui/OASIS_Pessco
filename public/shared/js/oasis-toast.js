/* OASIS — Retour d'action : un seul panneau pour toute l'application.
 *
 * `oasisToast(message, type)` pose au centre de l'écran le panneau du module
 * « RAMP Inspections » : icône, titre de l'issue, message. Les fonctions
 * propres à chaque module (showToast, _execToast, mesToast…) s'y branchent, si
 * bien qu'un retour se présente partout de la même façon.
 *
 * Types acceptés : success/succes, error, warning/warn, info. Tout autre nom
 * est traité comme une réussite — un module qui invente un type n'échoue pas,
 * il retombe sur le cas le plus courant.
 */
(function () {
  const ICONES = {
    succes: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
    warning: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></svg>',
  };

  const TITRES = {
    fr: { succes: 'Opération réussie', error: 'Échec de l’opération', warning: 'À noter', info: 'Information' },
    en: { succes: 'Done', error: 'Action failed', warning: 'Please note', info: 'Information' },
    pt: { succes: 'Operação concluída', error: 'Falha na operação', warning: 'A observar', info: 'Informação' },
  };

  // Les types portés par les modules ne se recouvrent pas tous : on les ramène
  // aux quatre issues que le panneau sait dire.
  const GENRES = {
    success: 'succes', succes: 'succes', ok: 'succes',
    error: 'error', danger: 'error', erreur: 'error',
    warning: 'warning', warn: 'warning', alerte: 'warning',
    info: 'info',
  };

  const langue = () => {
    const l = (window.CURRENT_LANG || localStorage.getItem('pr_lang') || 'fr').slice(0, 2);
    return TITRES[l] ? l : 'fr';
  };

  function oasisToast(message, type, duree) {
    const genre = GENRES[String(type || '').toLowerCase()] || 'succes';
    // Un seul retour à l'écran : le dernier remplace le précédent.
    document.querySelectorAll('.oasis-toast-fond').forEach((v) => v.remove());
    const fond = document.createElement('div');
    fond.className = `oasis-toast-fond ${genre}`;
    fond.innerHTML = `
      <div class="oasis-toast" role="status" aria-live="polite">
        <span class="oasis-toast-icone">${ICONES[genre]}</span>
        <div class="oasis-toast-texte">
          <strong class="oasis-toast-titre"></strong>
          <span class="oasis-toast-message"></span>
        </div>
      </div>`;
    fond.querySelector('.oasis-toast-titre').textContent = TITRES[langue()][genre];
    fond.querySelector('.oasis-toast-message').textContent = message;
    // Un clic n'importe où referme : le retour n'a pas à retenir l'écran.
    fond.addEventListener('click', () => fond.remove());
    document.body.appendChild(fond);
    setTimeout(() => fond.remove(), Math.max(1500, Number(duree) || 4000));
    return fond;
  }

  window.oasisToast = oasisToast;
}());
