// OASIS — Retour d'action : un seul panneau pour toute l'application. Le socle,
// en TypeScript (ADR-003, 5.b).
//
// `toast(message, type)` pose au centre de l'écran le panneau du module « RAMP
// Inspections » : icône, titre de l'issue, message. Les fonctions propres à
// chaque module (showToast, _execToast, mesToast…) s'y branchent, si bien qu'un
// retour se présente partout de la même façon.
//
// Types acceptés : success/succes, error, warning/warn, info. Tout autre nom est
// traité comme une réussite — un module qui invente un type n'échoue pas, il
// retombe sur le cas le plus courant.
//
// Les corps sont repris du fichier d'origine **avec leur indentation** : les
// gabarits sont multilignes, et leur espace de début de ligne fait partie de la
// chaîne produite. C'est la leçon d'`oasis-kpi`, où la désindentation avait fait
// parler 21 sondes sur 28.
//
// Ce fichier ne touche pas à `window` : voir `globales/oasis-toast.ts`.

export type Langue = 'fr' | 'en' | 'pt';
export type Genre = 'succes' | 'error' | 'warning' | 'info';

declare global {
  interface Window {
    /** Posé par certains écrans ; la préférence du navigateur sinon. */
    CURRENT_LANG?: string;

    // ── Les trois globales sont déclarées **ici**, et une seule fois ──
    //
    // Elles l'étaient deux fois, avec deux signatures différentes :
    // `socle/utils.ts` annonçait `oasisToast(message: string, type?: string)`
    // rendant `unknown`, le sas annonçait trois paramètres rendant un
    // `HTMLElement`. Deux parties du code n'avaient donc pas la même idée de la
    // même fonction, et rien ne l'avait jamais dit — TypeScript l'a refusé dès
    // que les deux déclarations ont existé en même temps.
    //
    // La déclaration appartient au module qui porte le comportement. Le sas ne
    // fait plus que publier.
    //
    // Optionnelles, et c'est la vérité mesurée : une page peut charger
    // `oasis-utils` sans `oasis-toast` — `showToast` y retombe sur la console,
    // et c'est le comportement d'origine qu'on ne change pas en passant.
    oasisToast?: (message: unknown, type?: string, duree?: unknown) => HTMLElement;
    oasisConfirmer?: (message: unknown, options?: OptionsConfirmer) => Promise<boolean>;
    oasisSaisir?: (message: unknown, options?: OptionsSaisir) => Promise<string | null>;
  }
}

/** Les options d'une confirmation. `danger` se déduit du message s'il manque. */
export interface OptionsConfirmer {
  titre?: string;
  libelle?: string;
  libelleAnnuler?: string;
  danger?: boolean;
}

/** Les options d'une saisie. `requis` tient le bouton fermé tant que c'est vide. */
export interface OptionsSaisir {
  titre?: string;
  valeur?: unknown;
  libelle?: string;
  libelleAnnuler?: string;
  requis?: boolean;
}

/**
 * Le panneau porte sa propre façon de répondre, pour qu'une nouvelle question
 * puisse clore la précédente. C'est une propriété posée sur l'élément — pas un
 * procédé élégant, mais c'est celui du fichier d'origine, et la **conversion
 * n'est pas le moment de le changer** : une question qui resterait ouverte
 * laisserait une promesse jamais tenue, donc un écran figé.
 */
interface FondRepondant extends HTMLElement { _repondre?: (valeur: unknown) => void }

// Les trois fonctions interrogent le DOM qu'elles viennent de construire : les
// nœuds existent, et l'affirmer ici évite de répéter la même assertion douze
// fois. Un sélecteur fautif resterait visible — `textContent` sur `null` lève.
const txt = (racine: ParentNode, selecteur: string, valeur: unknown): void => {
  (racine.querySelector(selecteur) as HTMLElement).textContent = valeur as string;
};
const bouton = (racine: ParentNode, selecteur: string): HTMLButtonElement =>
  racine.querySelector(selecteur) as HTMLButtonElement;

// Une nouvelle question clôt celles qui restaient : par la négative pour une
// confirmation, par `null` pour une saisie. Les deux partagent la même classe,
// et c'est voulu — on ne veut pas deux panneaux superposés.
const repondrePrecedentes = (valeur: unknown): void => {
  document.querySelectorAll('.oasis-confirm-fond').forEach((v) => {
    const f = v as FondRepondant;
    if (f._repondre) f._repondre(valeur);
  });
};

// Le focus revient là où il était. L'élément peut avoir disparu entre-temps —
// une ligne de tableau redessinée pendant que la question était posée.
const rendreLeFocus = (avant: Element | null): void => {
  const e = avant as HTMLElement | null;
  if (e && e.focus) { try { e.focus(); } catch { /* élément disparu */ } }
};

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
  const GENRES: Readonly<Record<string, Genre>> = {
    success: 'succes', succes: 'succes', ok: 'succes',
    error: 'error', danger: 'error', erreur: 'error',
    warning: 'warning', warn: 'warning', alerte: 'warning',
    info: 'info',
  };

  const langue = (): Langue => {
    let brut = 'fr';
    try { brut = window.CURRENT_LANG || localStorage.getItem('pr_lang') || 'fr'; } catch { brut = 'fr'; }
    const l = brut.slice(0, 2);
    return (l === 'fr' || l === 'en' || l === 'pt') ? l : 'fr';
  };

export function toast(message: unknown, type?: string, duree?: unknown): HTMLElement {
    const genre: Genre = GENRES[String(type || '').toLowerCase()] ?? 'succes';
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
    txt(fond, '.oasis-toast-titre', TITRES[langue()][genre]);
    txt(fond, '.oasis-toast-message', message);
    // Un clic n'importe où referme : le retour n'a pas à retenir l'écran.
    fond.addEventListener('click', () => fond.remove());
    document.body.appendChild(fond);
    setTimeout(() => fond.remove(), Math.max(1500, Number(duree) || 4000));
    return fond;
  }


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

export function confirmer(message: unknown, options?: OptionsConfirmer): Promise<boolean> {
    const o = options || {};
    const l = BOUTONS[langue()] || BOUTONS.fr;
    const danger = o.danger === undefined ? DESTRUCTEUR.test(String(message)) : !!o.danger;
    // Une seule question à la fois : une nouvelle remplace la précédente, qui
    // se résout alors par la négative.
    repondrePrecedentes(false);
    return new Promise<boolean>((resolve) => {
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
      txt(fond, '.oasis-confirm-titre', o.titre || l.titre);
      txt(fond, '.oasis-confirm-message', String(message == null ? '' : message));
      txt(fond, '.oasis-confirm-non', o.libelleAnnuler || l.non);
      txt(fond, '.oasis-confirm-oui', o.libelle || l.oui);

      const avant = document.activeElement;
      const clavier = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); repondre(false); }
        if (e.key === 'Enter' && (e.target as HTMLElement | null)?.tagName !== 'TEXTAREA') { e.preventDefault(); repondre(true); }
      };
      function repondre(oui: boolean) {
        document.removeEventListener('keydown', clavier, true);
        fond.remove();
        rendreLeFocus(avant);
        resolve(!!oui);
      }
      (fond as FondRepondant)._repondre = repondre as (v: unknown) => void;
      fond.addEventListener('click', (e) => { if (e.target === fond) repondre(false); });
      bouton(fond, '.oasis-confirm-non').addEventListener('click', () => repondre(false));
      bouton(fond, '.oasis-confirm-oui').addEventListener('click', () => repondre(true));
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(fond);
      bouton(fond, '.oasis-confirm-oui').focus();
    });
  }


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

export function saisir(message: unknown, options?: OptionsSaisir): Promise<string | null> {
    const o = options || {};
    const l = SAISIE[langue()] || SAISIE.fr;
    repondrePrecedentes(null);
    return new Promise<string | null>((resolve) => {
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
      const champ = fond.querySelector('.oasis-saisie-champ') as HTMLTextAreaElement;
      const oui = bouton(fond, '.oasis-confirm-oui');
      txt(fond, '.oasis-confirm-titre', o.titre || l.titre);
      txt(fond, '.oasis-confirm-message', String(message == null ? '' : message));
      txt(fond, '.oasis-confirm-non', o.libelleAnnuler || l.non);
      oui.textContent = o.libelle || l.oui;
      champ.value = o.valeur == null ? '' : String(o.valeur);
      const ajuster = () => { oui.disabled = !!o.requis && !champ.value.trim(); };
      champ.addEventListener('input', ajuster);
      ajuster();

      const avant = document.activeElement;
      // Entrée seule passe à la ligne dans un texte ; Ctrl/⌘ + Entrée valide.
      const clavier = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); repondre(null); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !oui.disabled) { e.preventDefault(); repondre(champ.value); }
      };
      function repondre(valeur: string | null) {
        document.removeEventListener('keydown', clavier, true);
        fond.remove();
        rendreLeFocus(avant);
        resolve(valeur);
      }
      (fond as FondRepondant)._repondre = repondre as (v: unknown) => void;
      fond.addEventListener('click', (e) => { if (e.target === fond) repondre(null); });
      bouton(fond, '.oasis-confirm-non').addEventListener('click', () => repondre(null));
      oui.addEventListener('click', () => { if (!oui.disabled) repondre(champ.value); });
      document.addEventListener('keydown', clavier, true);
      document.body.appendChild(fond);
      champ.focus();
      champ.setSelectionRange(champ.value.length, champ.value.length);
    });
  }
