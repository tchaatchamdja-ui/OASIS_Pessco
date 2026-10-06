// OASIS — Ce que les fichiers du socle **non encore convertis** publient.
//
// ADR-003, suite 5.b. Le socle passe en TypeScript un fichier à la fois, et la
// règle est qu'un module **déclare ce qu'il définit** : `toast.ts` déclare
// `window.oasisToast`, `messages-serveur.ts` ses six tables. Une seule
// déclaration par nom, portée par celui qui l'implémente.
//
// Restent les fichiers encore en JavaScript : personne ne peut déclarer pour
// eux. Leurs noms vivent donc ici, et **ici seulement** — pas éparpillés dans
// les modules qui les lisent, où ils divergeaient. C'est ainsi que
// `window.oasisToast` s'était retrouvé déclaré deux fois avec deux signatures
// différentes, sans que rien ne le dise.
//
// Ce fichier **rétrécit à chaque conversion** et disparaît avec la dernière. Son
// contenu est une dette, et sa longueur la mesure.
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
  }
}

export {};
