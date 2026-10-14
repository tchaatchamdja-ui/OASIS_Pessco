// OASIS — Les racines de fenêtre du portail (ADR-003, 5.e.10).
//
// Le portail n'ouvre pas ses fenêtres modales dans un conteneur par écran : il
// en a **deux**, et deux seulement. `cfgModalRoot` est rendue par l'écran de
// configuration, `userModalRoot` par celui des comptes, et chacune reçoit le
// balisage que quatre ou cinq fichiers y écrivent à tour de rôle.
//
// ── Pourquoi ce fichier existe, et ce qu'il dénoue ──
//
// `cfgModalRoot` était la **dernière dette structurelle du portail**. Quatre
// fichiers y écrivaient — les référentiels, l'organigramme, les paramètres, la
// barre d'écran —, et tous devaient pouvoir la refermer. La fermeture vivait
// dans `referentiels.ts` ; `barre.ts` et `organigramme.ts` la lisaient donc sur
// `window`, parce que l'importer aurait fait un cycle : `referentiels.ts`
// importe déjà `searchInputHtml` et `exportBar` de `barre.ts`.
//
// La décision prise en 5.e.0 était de laisser le prêt dans ce sens-là **et
// d'écrire la vraie cause** : *la fenêtre d'import et celles des référentiels
// partagent une racine que personne ne possède.* Elle est écrite depuis cinq
// jours, et la voici possédée.
//
// Le cycle ne disparaît pas par ruse : il disparaît parce que la racine n'a
// jamais appartenu au CRUD des référentiels. Elle appartient à l'écran, et les
// cinq fichiers en sont des usagers.
//
// ── Deux conduites devant une racine absente, et elles restent deux ──
//
// | Geste | Racine absente | Pourquoi |
// |---|---|---|
// | **ouvrir** une fenêtre de configuration | on renonce en silence | la décision de 5.d.1 |
// | **ouvrir** une fenêtre de comptes | on **lève**, en nommant la cause | la décision de 5.e.1 |
// | **refermer** l'une ou l'autre | on renonce en silence | *refermer une fenêtre qui n'est pas là n'est pas une erreur* |
//
// La divergence entre les deux ouvertures n'est pas une négligence : elle
// reproduit ce que faisaient les deux originaux, et l'unifier serait un
// changement de comportement — qui se décide, et pas au passage d'un
// déplacement de code.
//
// ── Les lectures dans la fenêtre ──
//
// Sept requêtes de `referentiels.ts` et trois d'`utilisateurs.ts` s'écrivaient
// `document.querySelector('#cfgModalRoot …')`, l'identifiant répété dans dix
// chaînes. Une faute de frappe y rendait `null` sans un mot. Elles passent par
// `dans` et `tousDans`, où l'identifiant vient du **type** : une racine qui
// n'existe pas ne compile plus.

/**
 * Les deux racines, et il n'y en a pas d'autre. Le type est la garde : une
 * chaîne quelconque n'y entre pas, et un identifiant qu'on renommerait dans le
 * balisage sans le renommer ici ne compilerait pas.
 */
export type Racine = 'cfgModalRoot' | 'userModalRoot';

/** La racine, ou `null` si l'écran ne l'a pas (encore) rendue. */
export const racine = (id: Racine): HTMLElement | null => document.getElementById(id);

/**
 * La racine, **exigée**. Lève en nommant la cause.
 *
 * C'est la conduite de l'écran des comptes (5.e.1) : ouvrir une fenêtre dans le
 * vide est une erreur, et l'original levait aussi — `getElementById(…).innerHTML`
 * sur `null`.
 */
export function racineExigee(id: Racine): HTMLElement {
  const r = racine(id);
  if (!r) throw new Error(`la racine des fenêtres est absente : « ${id} » n'est pas dans le document`);
  return r;
}

/** Ouvre une fenêtre dans la racine. Racine absente : on renonce, en silence. */
export function ouvrir(id: Racine, html: string): void {
  const r = racine(id);
  if (r) r.innerHTML = html;
}

/** Referme la fenêtre de la racine. Permissif des deux côtés, à dessein. */
export function fermer(id: Racine): void {
  const r = racine(id);
  if (r) r.innerHTML = '';
}

/**
 * La fermeture de la racine de configuration, sous le nom que le balisage
 * appelle depuis l'origine.
 *
 * Quatre `onclick` le nomment — dans les référentiels, l'import de classeur,
 * l'organigramme et les paramètres —, et c'est **le** nom publié de ce fichier.
 * Il vit ici et non dans `referentiels.ts` parce que la racine n'est pas à eux ;
 * c'est tout l'objet de 5.e.10.
 */
export const closeRefModal = (): void => fermer('cfgModalRoot');

/** Un élément de la fenêtre ouverte, ou `null`. */
export const dans = <T extends Element>(id: Racine, selecteur: string): T | null =>
  document.querySelector<T>(`#${id} ${selecteur}`);

/** Tous les éléments de la fenêtre ouverte qui répondent au sélecteur. */
export const tousDans = <T extends Element>(id: Racine, selecteur: string): T[] =>
  [...document.querySelectorAll<T>(`#${id} ${selecteur}`)];

declare global {
  interface Window {
    /** Referme la fenêtre de l'écran de configuration. Quatre `onclick` la nomment. */
    closeRefModal: () => void;
  }
}
