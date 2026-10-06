// OASIS — Ce qu'**aucun module ne définit**.
//
// ADR-003, suite 5.b. Le socle passe en TypeScript un fichier à la fois, et la
// règle est qu'un module **déclare ce qu'il définit** : `toast.ts` déclare
// `window.oasisToast`, `messages-serveur.ts` ses six tables. Une seule
// déclaration par nom, portée par celui qui l'implémente.
//
// Deux sortes de noms échappent à cette règle, et ils vivent ici — **ici
// seulement**, et non éparpillés dans les modules qui les lisent, où ils
// divergeaient. C'est ainsi que `window.oasisToast` s'était retrouvé déclaré
// deux fois avec deux signatures différentes, et `window.APP_STATE` avec une
// forme incomplète : `{ lang }` chez l'un, alors que l'autre y écrit
// `sidebarCollapsed`.
//
//   · ce que publie un fichier du socle **encore en JavaScript**. Cette part
//     rétrécit à chaque conversion et disparaîtra avec la dernière ;
//   · ce que pose une **page**, dans un script en ligne, et que **plusieurs**
//     modules lisent. Celle-là restera : aucun module ne la définit.
//
// Un nom que pose une page et qu'un **seul** module lit se déclare chez ce
// lecteur — c'est le cas des `OASIS_MODULE_*` dans `chrome.ts`. Ici, on ne met
// que ce qui est partagé, pour que la forme ne puisse pas diverger.
//
// Ce qu'il déclare est vérifié : la suite `frontend` ouvre chaque page qui charge
// un sas et contrôle que ce que son graphe lit du monde y existe vraiment.

declare global {
  interface Window {
    /**
     * `oasis-requete.js` : la session a expiré — ramène à la connexion.
     *
     * Les neuf pages le chargent, y compris `login.html` et `cookies.html` qui
     * ne prennent rien d'autre du socle. Non optionnel, donc, et mesuré tel.
     */
    oasisSessionPerdue: () => void;

    // ── Posés par une page, lus par plusieurs modules ──

    /**
     * L'état du shell d'un module : la langue retenue et son volet latéral.
     *
     * `socle/utils.ts` en lit la langue pour le format des dates, `socle/chrome.ts`
     * y écrit `sidebarCollapsed`. Le premier le déclarait `{ lang?: string }` —
     * incomplet, et le second ne compilait donc pas.
     */
    APP_STATE?: { lang?: string; sidebarCollapsed?: boolean };

    /** L'état partagé posé par le portail, dont la langue retenue. */
    PESSCO?: { lang?: string };
  }
}

export {};
