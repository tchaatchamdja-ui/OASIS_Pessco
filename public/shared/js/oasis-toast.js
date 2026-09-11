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

  // ── Confirmation ──
  // La boîte du navigateur (`confirm`) figeait la page entière, ne suivait ni
  // la charte ni la langue retenue, et disait « OK » à une suppression
  // définitive. Celle-ci en tient la place : même question, deux boutons
  // nommés, le geste destructeur en rouge. Échap ou un clic à côté répondent
  // non ; Entrée répond oui.
  //
  //   if (!await oasisConfirmer('Supprimer cette carence ?')) return;
  //   oasisConfirmer(message, { titre, libelle, libelleAnnuler, danger })
  //
  // `danger` se déduit du message quand il n'est pas donné : supprimer,
  // retirer, annuler, réinitialiser disent un geste qu'on ne rattrape pas.
  const BOUTONS = {
    fr: { oui: 'Confirmer', non: 'Annuler', titre: 'Confirmation' },
    en: { oui: 'Confirm', non: 'Cancel', titre: 'Confirmation' },
    pt: { oui: 'Confirmar', non: 'Cancelar', titre: 'Confirmacao' },
  };
  const DESTRUCTEUR = /supprim|effac|retir|annul|réinitialis|reinitialis|définitiv|delete|remove|eliminar/i;

  function oasisConfirmer(message, options) {
    const o = options || {};
    const l = BOUTONS[langue()] || BOUTONS.fr;
    const danger = o.danger === undefined ? DESTRUCTEUR.test(String(message)) : !!o.danger;
    // Une seule question à la fois : une nouvelle remplace la précédente, qui
    // se résout alors par la négative.
    document.querySelectorAll('.oasis-confirm-fond').forEach((v) => v._repondre && v._repondre(false));
    return new Promise((resolve) => {
      const fond = document.createElement('div');
      fond.className = `oasis-confirm-fond${danger ? ' danger' : ''}`;
      fond.innerHTML = `
        <div class="oasis-confirm" role="alertdialog" aria-modal="true">
          <strong class="oasis-confirm-titre"></strong>
          <p class="oasis-confirm-message"></p>
          <div class="oasis-confirm-actions">
            <button type="button" class="oasis-confirm-non"></button>
            <button type="button" class="oasis-confirm-oui"></button>
          </div>
        </div>`;
      fond.querySelector('.oasis-confirm-titre').textContent = o.titre || l.titre;
      fond.querySelector('.oasis-confirm-message').textContent = String(message == null ? '' : message);
      fond.querySelector('.oasis-confirm-non').textContent = o.libelleAnnuler || l.non;
      fond.querySelector('.oasis-confirm-oui').textContent = o.libelle || l.oui;

      const avant = document.activeElement;
      const clavier = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); repondre(false); }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); repondre(true); }
      };
      function repondre(oui) {
        document.removeEventListener('keydown', clavier, true);
        fond.remove();
        if (avant && avant.focus) { try { avant.focus(); } catch (e) { /* élément disparu */ } }
        resolve(!!oui);
      }
      fond._repondre = repondre;
      fond.addEventListener('click', (e) => { if (e.target === fond) repondre(false); });
      fond.querySelector('.oasis-confirm-non').addEventListener('click', () => repondre(false));
      fond.querySelector('.oasis-confirm-oui').addEventListener('click', () => repondre(true));
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(fond);
      fond.querySelector('.oasis-confirm-oui').focus();
    });
  }

  window.oasisConfirmer = oasisConfirmer;

  // ── Saisie ──
  // Le pendant de `prompt()` : un motif, une observation, un commentaire. La
  // boîte du navigateur n'offrait qu'une ligne pour un texte qui en demande
  // souvent plusieurs. Rend le texte saisi, ou `null` si l'on renonce.
  //
  //   const motif = await oasisSaisir('Motif du rejet', { requis: true });
  //   oasisSaisir(message, { titre, valeur, libelle, libelleAnnuler, requis })
  //
  // `requis` tient le bouton fermé tant que le champ est vide : un motif
  // obligatoire ne part plus en blanc pour être refusé ensuite.
  const SAISIE = {
    fr: { oui: 'Valider', non: 'Annuler', titre: 'Saisie' },
    en: { oui: 'Submit', non: 'Cancel', titre: 'Input' },
    pt: { oui: 'Validar', non: 'Cancelar', titre: 'Introducao' },
  };

  function oasisSaisir(message, options) {
    const o = options || {};
    const l = SAISIE[langue()] || SAISIE.fr;
    document.querySelectorAll('.oasis-confirm-fond').forEach((v) => v._repondre && v._repondre(null));
    return new Promise((resolve) => {
      const fond = document.createElement('div');
      fond.className = 'oasis-confirm-fond';
      fond.innerHTML = `
        <div class="oasis-confirm oasis-saisie" role="dialog" aria-modal="true">
          <strong class="oasis-confirm-titre"></strong>
          <label class="oasis-confirm-message"></label>
          <textarea class="oasis-saisie-champ" rows="4"></textarea>
          <div class="oasis-confirm-actions">
            <button type="button" class="oasis-confirm-non"></button>
            <button type="button" class="oasis-confirm-oui"></button>
          </div>
        </div>`;
      const champ = fond.querySelector('.oasis-saisie-champ');
      const oui = fond.querySelector('.oasis-confirm-oui');
      fond.querySelector('.oasis-confirm-titre').textContent = o.titre || l.titre;
      fond.querySelector('.oasis-confirm-message').textContent = String(message == null ? '' : message);
      fond.querySelector('.oasis-confirm-non').textContent = o.libelleAnnuler || l.non;
      oui.textContent = o.libelle || l.oui;
      champ.value = o.valeur == null ? '' : String(o.valeur);
      const ajuster = () => { oui.disabled = !!o.requis && !champ.value.trim(); };
      champ.addEventListener('input', ajuster);
      ajuster();

      const avant = document.activeElement;
      // Entrée seule passe à la ligne dans un texte ; Ctrl/⌘ + Entrée valide.
      const clavier = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); repondre(null); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !oui.disabled) { e.preventDefault(); repondre(champ.value); }
      };
      function repondre(valeur) {
        document.removeEventListener('keydown', clavier, true);
        fond.remove();
        if (avant && avant.focus) { try { avant.focus(); } catch (e) { /* élément disparu */ } }
        resolve(valeur);
      }
      fond._repondre = repondre;
      fond.addEventListener('click', (e) => { if (e.target === fond) repondre(null); });
      fond.querySelector('.oasis-confirm-non').addEventListener('click', () => repondre(null));
      oui.addEventListener('click', () => { if (!oui.disabled) repondre(champ.value); });
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(fond);
      champ.focus();
      champ.setSelectionRange(champ.value.length, champ.value.length);
    });
  }

  window.oasisSaisir = oasisSaisir;
}());
