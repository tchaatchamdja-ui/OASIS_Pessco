// OASIS — L'état partagé du portail (ADR-003, 5.c).
//
// ── Pourquoi ce fichier existe, et ce qu'il débloque ──
//
// Les cinq fichiers du portail « partagent la même portée » — leur propre
// en-tête le dit. Mesuré le 7 octobre 2026 : **treize noms** déclarés au premier
// niveau d'un fichier sont lus par un autre, et parmi eux **sept** sont des
// globales *lexicales* mutables.
//
// Une globale lexicale (`let X` au premier niveau d'un script classique) est
// **invisible à un module** : elle n'est posée nulle part sur `window`, et un
// module ne peut ni la lire ni l'écrire. Tant qu'elle existe, **aucun** des
// fichiers du portail ne peut être converti seul :
//
//   | Fichier | Ce qui le bloquait |
//   |---|---|
//   | `modules-host.js` | lit `VIEWS` |
//   | `portail-instances.js` | lit `ME`, `CFG_SUB` |
//   | `app-demarrage.js` | **écrit** `VIEWS`, `CURRENT_VIEW`, `ME`, `NOTIF_LAST_SEEN` |
//
// C'est le couplage, et non l'interface, qui bloquait la migration. On le
// convertit donc en premier — la même leçon que le socle, qui est passé avant
// les écrans parce que les neuf écrans en dépendaient.
//
// ── La source de vérité reste `window`, et c'est délibéré ──
//
// Ces accesseurs **ne gardent pas de copie**. Pendant la cohabitation, trois
// fichiers en JavaScript écrivent ces noms par affectation nue — qui atteint la
// propriété de `window` —, et un module qui tiendrait son propre exemplaire
// divergerait au premier de ces écrits, en silence.
//
// Le jour où le dernier fichier en JavaScript s'en va, l'état devient un état de
// React et ce fichier disparaît. D'ici là, `window` est le seul endroit que les
// deux régimes partagent.

/** Le compte connecté et son contexte, tels que `/api/me` les rend. */
export interface Moi {
  /**
   * Le compte connecté, tel que `/api/me` le rend.
   *
   * ── Huit champs ajoutés le 13 octobre 2026 (5.e.2) ──
   *
   * L'écran du profil les lit tous : l'identifiant de courriel, le nom et le
   * prénom séparés, le téléphone, la fonction, l'état d'activité, les deux dates,
   * le rattachement à un prestataire, et le bloc `extra` des sections
   * facultatives. Ils étaient là depuis toujours — la route les rend — mais ce
   * type ne les disait pas, parce qu'aucun module converti ne les avait encore lus.
   *
   * Les déclarer ici plutôt qu'au point d'usage est la règle du fichier : un champ
   * que l'application lit est un champ qui a un type, et une forme déclarée deux
   * fois est une forme qui finit par diverger.
   */
  user: {
    username: string;
    fullName?: string;
    role: string;
    photo?: string;
    mustChange?: boolean;
    portee?: string;
    instance?: string;
    email?: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    fonction?: string;
    active?: boolean;
    createdAt?: string;
    passwordChangedAt?: string;
    prestataire_id?: string;
    /** Les champs des deux sections facultatives du profil. */
    extra?: Record<string, string | undefined>;
    /**
     * Les modules ouverts au compte, tels que « Accès aux modules » les déclare.
     *
     * **Absent** ouvre tout : c'était l'état de l'application avant que ce champ
     * n'existe, et l'accueil le traite ainsi (5.e.3). Un tableau **vide** ferme
     * tout — la différence compte, et c'est pourquoi le type dit `string[]` et
     * non `string[] | undefined` dans un sens seulement.
     */
    modules?: string[];
  };
  aac?: { logo?: string; nom?: string; sigle?: string; bigramme?: string };
  /**
   * L'instance **installée ici** : l'État sur lequel le déploiement est posé, et
   * son bigramme.
   */
  instance?: { etat?: string; codeEtat?: string };
  /**
   * L'instance **regardée**, et la liste de celles qu'on peut prendre. Absente
   * pour un compte qui n'en change pas.
   *
   * ── Déclarée ici plutôt qu'affirmée au point d'usage ──
   *
   * `instances.ts` lisait ces deux champs par `as unknown as { … }` : quatre
   * affirmations, que le garde-fou « le typage du frontend n'est défait nulle
   * part » a refusées. Il avait raison, et pour la deuxième fois en deux jours —
   * la première était l'appel d'API de l'hôte des modules.
   *
   * Un champ que l'application lit est un champ qui a un type. Le signature
   * d'index ci-dessous les laissait passer en `unknown`, ce qui est exact et
   * inutilisable ; les nommer coûte six lignes et supprime les quatre
   * affirmations.
   */
  instance_vue?: { disponible?: boolean; courante?: string; instances?: string[] };
  instances?: unknown[];
  [autre: string]: unknown;
}

/** Une vue du portail : une fonction de rendu, appelée sans argument. */
export type Vue = () => Promise<void>;

declare global {
  interface Window {
    /**
     * Le compte connecté. `null` avant `loadMe()`.
     *
     * **Était `let ME = null` dans `app.js`.** Quatre fichiers le lisent, et
     * `app-demarrage` l'écrit : c'est le nom le plus partagé du portail.
     */
    ME: Moi | null;
    /** La vue affichée. Était `let CURRENT_VIEW = 'home'`. */
    CURRENT_VIEW: string;
    /** La sous-vue de configuration. Était `let CFG_SUB = 'organisation'`. */
    CFG_SUB: string;
    /** Les référentiels chargés, par collection. Était `let REFS = {}`. */
    REFS: Record<string, unknown[]>;
    /**
     * La configuration de l'instance, telle que le dernier rendu de l'écran de
     * configuration l'a lue. `null` avant ce rendu.
     *
     * **Était `let CURRENT_CFG = null` dans `app-config.js`** — donc une globale
     * lexicale, invisible à un module. Elle est montée ici le 12 octobre 2026
     * parce que `openRefModal`, converti en 5.d.1, en a besoin : il y prend le
     * sigle et le nom de l'Administration pour les reprendre d'office sur
     * l'entité de niveau 1 de l'organigramme.
     *
     * C'est le même mouvement qu'en 5.b, et pour la même raison : **la
     * dépendance, non l'interface, bloque la conversion**. `renderConfig`
     * continue de l'écrire par une affectation nue.
     */
    CURRENT_CFG: { aac?: { sigle?: string; nom?: string }; [autre: string]: unknown } | null;
    /** La barre de configuration est-elle repliée ? Était `let CFG_COLLAPSED`. */
    CFG_COLLAPSED: boolean;
    /** Le dernier identifiant de notification vu. Était `let NOTIF_LAST_SEEN`. */
    NOTIF_LAST_SEEN: number;
    /**
     * La marque, en HTML. Était `const OASIS_LOGO_IMG` dans `app.js` — une
     * globale **lexicale**, et le dernier nom qui empêchait `app-demarrage.js`
     * d'être converti : il la lit pour poser la marque dans la barre.
     *
     * Ce n'est pas de l'état mutable, et elle n'avait donc pas sa place ici au
     * premier tri. Elle y est parce que le tri n'était pas le bon critère : ce
     * qui compte est **ce qu'un fichier converti doit atteindre**, mutable ou
     * non.
     */
    OASIS_LOGO_IMG: string;
    /**
     * Les vues du portail, par nom. Les vues `mod_<CODE>` y sont ajoutées par
     * `modules-host.js` depuis les manifestes des modules installés.
     *
     * Était `const VIEWS = {…}` dans `app-demarrage.js`, bâti à partir des
     * fonctions de rendu d'`app.js` — il reste donc assigné là, où elles
     * existent, et seulement **initialisé** ici.
     */
    VIEWS: Record<string, Vue>;
  }
}

const CLE_NOTIF = 'oasis_notif_seen';

// La marque du portail. Reprise mot pour mot d'`app.js` : c'est une chaîne de
// balisage, et la retaper serait la changer.
const MARQUE_HTML = '<span class="oasis-logo-img" role="img" aria-label="OASIS"></span>';

/**
 * Pose l'état partagé sur `window`, avec les valeurs qu'`app.js` lui donnait.
 *
 * Appelée par le sas, **avant** le chargement d'`app.js` : les trois fichiers en
 * JavaScript trouvent alors les noms déjà posés, et leurs affectations nues les
 * mettent à jour sans rien déclarer.
 *
 * ── La seule différence de comportement, et elle est dite ──
 *
 * `let X` au premier niveau est dans sa « zone morte » avant sa ligne : un accès
 * **lève** `ReferenceError`. Une propriété de `window` posée ici rend la valeur
 * initiale. Aucun chemin du portail ne lit ces noms avant leur déclaration — et
 * s'il en apparaissait un, il rendrait désormais `null` au lieu de lever.
 *
 * C'est un affaiblissement, et il est assumé : la contrepartie est qu'un module
 * peut lire et écrire cet état, ce qu'aucune zone morte ne permet.
 */
export function initialiser(): void {
  window.ME = null;
  window.CURRENT_VIEW = 'home';
  window.CFG_SUB = 'organisation';
  window.REFS = {};
  window.CURRENT_CFG = null;
  window.CFG_COLLAPSED = false;
  let vu = 0;
  try { vu = parseInt(localStorage.getItem(CLE_NOTIF) ?? '0', 10) || 0; } catch { vu = 0; }
  window.NOTIF_LAST_SEEN = vu;
  window.VIEWS = {};
  window.OASIS_LOGO_IMG = MARQUE_HTML;
}

// ── Les accesseurs typés, pour les modules à venir ──
//
// Un module n'écrit pas `window.ME` directement : il passe par ces fonctions, qui
// disent le type **et** l'intention. `moi()` rend `null` tant que la session
// n'est pas chargée, et c'est au lecteur de le traiter — masquer ce `null`
// derrière un objet vide ferait afficher un écran vide pour un écran non chargé.
export const moi = (): Moi | null => window.ME;
export const poserMoi = (m: Moi | null): void => { window.ME = m; };

export const vueCourante = (): string => window.CURRENT_VIEW;
export const poserVue = (v: string): void => { window.CURRENT_VIEW = v; };

export const sousVue = (): string => window.CFG_SUB;
export const poserSousVue = (s: string): void => { window.CFG_SUB = s; };

export const referentiels = (): Record<string, unknown[]> => window.REFS;

export const vues = (): Record<string, Vue> => window.VIEWS;

export const dernierVu = (): number => window.NOTIF_LAST_SEEN;
export const poserDernierVu = (n: number): void => {
  window.NOTIF_LAST_SEEN = n;
  try { localStorage.setItem(CLE_NOTIF, String(n)); } catch { /* stockage fermé */ }
};

/** La marque du portail, en HTML. */
export const marque = (): string => window.OASIS_LOGO_IMG;

/** Le rôle du compte connecté, ou la chaîne vide s'il n'est pas chargé. */
export const role = (): string => window.ME?.user.role ?? '';
