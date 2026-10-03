// La frontière avec le socle commun — et c'est ici que TypeScript gagne sa place.
//
// L'écran vit dans `#app`, au milieu de 2 250 lignes de JavaScript partagé que la
// page charge avant lui : barre supérieure, thème, langue, requêtes, messages du
// serveur, échappement, dates. Ces lignes ne sont pas portées (ADR-003 :
// cohabitation, module par module), et elles n'ont pas de types.
//
// **Tout ce que l'écran leur emprunte est déclaré ici, une fois.** C'est le seul
// endroit où l'on dit « je fais confiance », et on le dit explicitement : ailleurs
// dans l'écran, une faute de nom ou d'arité ne compile pas. Sans ce fichier, le
// `strict` du reste ne vaudrait rien — on aurait écrit `(window as any)` partout,
// c'est-à-dire du JavaScript avec une extension en `.ts`.
//
// Le jour où le socle commun sera porté, c'est ce fichier qui disparaîtra, et les
// erreurs de compilation diront exactement où.

/** Le répertoire de traduction (`dr-i18n.js`), chargé en global par la page. */
type Traduire = (cle: string, ...args: unknown[]) => string;

/**
 * Ce que `dr-i18n.js` lit du global `DR` : la langue retenue et le module réglé.
 *
 * Le répertoire de traduction n'est pas porté — 390 lignes de tables, que rien ne
 * gagnerait à passer en TypeScript et qu'un portage exposerait à la faute de
 * frappe. Il reste donc en global, et il attend ces deux champs : l'objet `DR` de
 * l'écran d'avant les portait, parmi vingt autres.
 *
 * On ne garde que ces deux-là, et React les tient à jour. C'est la seule chose
 * que le portage doit au fichier qu'il ne remplace pas.
 */
export interface EtatPartage { lang: string; module: string }

declare global {
  interface Window {
    /** Lu par `dr-i18n.js` seulement. Voir `EtatPartage`. */
    DR: EtatPartage;
    /** Module dont la page règle les droits, posé par `index.html` (`?module=`). */
    DR_MODULE?: string;
    /** `oasis-requete.js` : un appel d'API qui lève une erreur parlante. */
    api: (chemin: string, options?: RequestInit) => Promise<unknown>;
    /** `oasis-commun.js` : l'échappement de l'application. */
    oasisEsc: (v: unknown) => string;
    /** `dr-i18n.js` : les libellés de l'écran. Déclaré en `function`, donc sur `window`. */
    dt: Traduire;
    /** `oasis-theme.js` : les palettes, leur nom, et celle qui est retenue. */
    OASIS_THEMES: readonly string[];
    oasisNomTheme: (t: string) => string;
    oasisAppliquerTheme: (t: string) => void;
    oasisThemeEnregistre: () => string;
    /** `oasis-commun.js` : pose l'attribut `lang` de la page. */
    oasisPoserLangue: (l: string) => void;
    /** Jeu d'icônes du socle ; l'écran n'en emploie qu'une. */
    ICONS?: Record<string, string>;
    /** Point d'entrée que `index.html` appelle au chargement. */
    drBoot?: () => void;
  }

  /**
   * Le libellé d'un privilège, et sa description.
   *
   * **Déclarés hors de `Window`, et ce n'est pas un détail de style** :
   * `dr-i18n.js` les définit en `const`, qui ne pose rien sur `window` — seuls
   * `function` et `var` le font. Les lire par `window.dtPriv` rendait
   * `undefined`, et l'écran s'arrêtait sur « window.dtPriv is not a function ».
   *
   * Un `const` au premier niveau d'un script crée une liaison du périmètre
   * lexical global : on l'atteint par son nom, et c'est ce que ces déclarations
   * disent au compilateur.
   */
  const dtPriv: (p: string) => string;
  const dtPrivDesc: (p: string) => string;

  /**
   * Les icônes en SVG, fournies par `oasis-utils.js` — **et pour la même raison
   * déclarées ici, non sur `Window`.** Je ne l'avais pas vu : `Coquille.tsx`
   * lisait `(window.ICONS || {}).shield`, qui rend `undefined`, et le `|| ''`
   * rendait le défaut muet. Le bouclier de l'en-tête manquait depuis la
   * réécriture — l'ancien `dr-app.js` lisait `ICONS` nu, lui.
   *
   * Deux fois la même cause, deux fois en silence. C'est ce qui a motivé le
   * contrôle qui compare les lectures `window.*` du frontend à la surface
   * réellement posée par le socle, mesurée dans un navigateur.
   */
  const ICONS: Record<string, string | undefined>;
}

/**
 * Une icône du socle, ou la chaîne vide. Le `?? ''` reste — une icône absente
 * ne doit pas arrêter un écran — mais il est **ici**, à un seul endroit, et non
 * répété sur chaque lecture où il camoufle une erreur de nom.
 */
export const icone = (nom: string): string => ICONS[nom] ?? '';

export const MODULE: string = (window.DR_MODULE || 'PLAN').toUpperCase();

/**
 * Posé **avant tout appel à `dt`**, et tenu à jour quand la langue change. Sans
 * lui, le répertoire de traduction lève « DR is not defined » — ce qu'il a fait,
 * et ce que l'écran a montré sous la forme d'une page restée à son source.
 */
export const poserEtatPartage = (lang: string): void => {
  window.DR = { lang, module: MODULE };
};

export const esc = (v: unknown): string => window.oasisEsc(v);
export const dt: Traduire = (cle, ...args) => window.dt(cle, ...args);
// Les exports portent un autre nom que les globales qu'ils appellent. Reprendre
// le même aurait masqué la globale et produit une récursion — silencieuse jusqu'au
// débordement de pile. Un alias déclaré aurait menti : il n'existe pas à
// l'exécution, et le compilateur l'aurait laissé passer.
export const libellePrivilege = (p: string): string => dtPriv(p);
export const descriptionPrivilege = (p: string): string => dtPrivDesc(p);

export const THEMES: readonly string[] = window.OASIS_THEMES;
export const nomTheme = (t: string): string => window.oasisNomTheme(t);
export const appliquerTheme = (t: string): void => window.oasisAppliquerTheme(t);
export const themeEnregistre = (): string => window.oasisThemeEnregistre();
export const poserLangue = (l: string): void => window.oasisPoserLangue(l);

/** Libellé de l'espace dont la page règle les droits. À défaut, son code. */
export const libelleModule = (): string => {
  const nom = dt(`mod_${MODULE}`);
  return nom === `mod_${MODULE}` ? MODULE : nom;
};

/**
 * L'horodatage d'une entrée de journal, dans la langue retenue.
 *
 * Même format qu'avant le portage : la date courte et l'heure à la seconde. Une
 * entrée d'audit se cite, et deux entrées de la même minute doivent se
 * distinguer.
 */
export const horodatage = (ts: string | number, langue: string): string => {
  const d = new Date(ts);
  const loc = ({ fr: 'fr-FR', en: 'en-GB', pt: 'pt-PT' } as Record<string, string>)[langue] || 'fr-FR';
  return `${d.toLocaleDateString(loc)} ${d.toLocaleTimeString(loc, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })}`;
};
