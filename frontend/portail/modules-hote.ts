// OASIS — L'hôte des modules dans le portail, en TypeScript (ADR-003, 5.c).
//
// Le portail ne connaît aucun module en particulier : il interroge
// `/api/modules/super-menus` — alimenté par les manifestes de `src/modules/` —
// et enregistre une vue `mod_<CODE>` par module installé. Chaque module est
// chargé en cadre : isolation des globales, de la charte et des formulaires. La
// barre supérieure du module est injectée côté module par le socle.
//
// ── Pourquoi celui-ci passe en premier des quatre fichiers d'interface ──
//
// Il ne lisait qu'**un** nom bloquant : `VIEWS`, globale lexicale d'alors. La
// suite n° 5.c.3 l'a posé sur `window`, et ce fichier est devenu convertible
// seul. C'était le but de cette suite, et c'est sa première preuve.
import { sessionPerdue } from '../socle/requete';
import { escapeHtml } from '../socle/utils';
import { vues, type Vue } from './etat';
import { naviguer } from './demarrage';

/** Un module installé, tel que `/api/modules/super-menus` le rend. */
interface ModuleInstalle {
  key: string;
  code: string;
  label: string;
  src: string;
  roles?: string[];
}

// Ce fichier ne déclare plus rien sur `window` : `navigate`, qu'il lisait, et
// `moduleHostRegisterViews`, que son sas posait, sont **importés** depuis le
// 14 octobre 2026 (5.e.9). Les cinq autres noms avaient été déposés en 5.e.5.

// ── `window.api` porte DEUX fonctions différentes, et le typage l'a dit ──
//
// `frontend/socle/globales/oasis-utils.ts` publie un `window.api`, et `app.js`
// définit un `function api` — qui s'y pose aussi. Déclarer celui du portail a
// fait lever le compilateur, et c'est ainsi qu'on l'a appris : aucun contrôle ne
// l'avait vu, aucune relecture non plus.
//
// Mesuré : ils diffèrent sur trois points.
//
// | | portail (`app.js`) | socle (`utils.ts`) |
// |---|---|---|
// | Rend | la **réponse brute** | le JSON déjà lu |
// | En-têtes | `X-OASIS-Request` seul | plus `Content-Type` et un jeton |
// | Sur un refus | rend la réponse | **lève** avec un message traduit |
//
// La collision est **latente** : `oasis-utils` est chargé par trois écrans de
// module, `app.js` par l'accueil seul. Aucune page ne charge les deux, et un
// garde-fou de forme l'interdit désormais.
//
// ── Et ce fichier n'appelle plus ni l'un ni l'autre ──
//
// Première écriture : il lisait celui du portail à travers une affirmation de
// type, « confinée et commentée ». Un garde-fou existant l'a refusée — *le
// typage du frontend n'est défait nulle part* —, et il a eu raison : une
// affirmation justifiée reste une affirmation, et c'est ainsi que
// `window.dtPriv` avait menti.
//
// La bonne réponse n'était pas de contourner mais de **supprimer la
// dépendance**. Les deux choses que faisait l'appel du portail sont déjà là :
//
//   · `X-OASIS-Request` est posé sur **tout** appel vers l'application par
//     l'enveloppe du socle (`oasis-requete`), chargée avant ce fichier ;
//   · le retour à la connexion sur 401 est `sessionPerdue`, que le socle
//     **exporte** — on importe la source au lieu de lire la globale.
//
// Un `fetch` nu suffit donc, et ce fichier ne dépend plus d'`app.js` du tout.
// C'est une dépendance de moins avant sa réécriture, non une de plus.
async function appel(chemin: string): Promise<Response> {
  const res = await fetch(chemin);
  if (res.status === 401) {
    sessionPerdue();
    // Le message est celui de l'origine : `chargerRegistre` l'attrape et rend un
    // registre vide, et le départ vers la connexion est déjà lancé.
    throw new Error('unauthenticated');
  }
  return res;
}

const MODULE_HOST: {
  registre: ModuleInstalle[];
  cartes: Record<string, string>;
  courant: string | null;
} = {
  registre: [],
  cartes: {},
  courant: null,
};

/** Chargement, une fois, du registre des modules installés. */
export async function chargerRegistre(): Promise<ModuleInstalle[]> {
  if (MODULE_HOST.registre.length) return MODULE_HOST.registre;
  try {
    // `api()` du portail rend la réponse brute : on lit le JSON ici.
    const [rSupers, rCartes] = await Promise.all([
      appel('/api/modules/super-menus'),
      appel('/api/modules/cartes'),
    ]);
    MODULE_HOST.registre = ((await rSupers.json()) as ModuleInstalle[] | null) ?? [];
    MODULE_HOST.cartes = ((await rCartes.json()) as Record<string, string> | null) ?? {};
  } catch {
    MODULE_HOST.registre = [];
    MODULE_HOST.cartes = {};
  }
  return MODULE_HOST.registre;
}

/**
 * Le portail masque son propre entête pendant l'affichage d'un module : le
 * module occupe l'écran entier et porte son titre lui-même.
 *
 * Cette fonction réécrivait aussi l'étiquette de la marque avec le nom du
 * module. Elle écrivait dans le vide — `module-fullscreen` masque la barre tout
 * entière, et personne ne voyait jamais ce titre. L'étiquette a disparu de la
 * barre ; le geste est parti avec elle. Les modules envoient encore le second
 * paramètre par `postMessage`, et il est donc reçu et ignoré.
 */
export function basculerPleinEcran(actif: boolean): void {
  document.body.classList.toggle('module-fullscreen', !!actif);
}

/** Affiche le module dans la surface principale. */
export async function afficherModule(cle: string): Promise<void> {
  const mv = document.getElementById('mainView');
  if (!mv) return;
  const registre = await chargerRegistre();
  const m = registre.find((x) => x.key === cle || x.code === cle);
  if (!m) {
    mv.innerHTML = '<div class="shell-card">Module indisponible.</div>';
    return;
  }
  MODULE_HOST.courant = m.key;
  basculerPleinEcran(true);
  mv.innerHTML = `<iframe id="prFrame" class="pr-frame pr-frame-full" src="${m.src}" title="${escapeHtml(m.label)}"></iframe>`;
}

/** Le retour au portail, depuis la barre du module ou son message. */
export function retourAuPortail(): void {
  basculerPleinEcran(false);
  MODULE_HOST.courant = null;
  // Barre latérale étendue au retour.
  document.body.classList.remove('app-sidebar-collapsed');
  naviguer('home');
}

/**
 * Enregistrement des vues : une par module installé, plus une par carte du
 * portail, qui ouvre le premier module de la carte.
 *
 * **Rejouable** : le registre n'est lisible qu'une fois la session ouverte, donc
 * le portail le redemande après connexion et, au besoin, au clic sur une carte.
 *
 * Les vues sont posées dans l'état partagé (`etat.ts`), que les fichiers restés
 * en JavaScript lisent par `VIEWS` — c'est tout l'objet de la suite n° 5.c.3.
 */
export async function enregistrerVues(force?: boolean): Promise<ModuleInstalle[]> {
  if (force) MODULE_HOST.registre = [];
  const registre = await chargerRegistre();
  const table = vues();
  registre.forEach((m) => {
    table[`mod_${m.code}`] = (): Promise<void> => afficherModule(m.key);
  });
  Object.entries(MODULE_HOST.cartes).forEach(([carte, cle]) => {
    table[`mod_${carte}`] = (): Promise<void> => afficherModule(cle);
  });
  return registre;
}

/** Les messages remontés par le cadre du module. */
export function brancherMessages(): void {
  window.addEventListener('message', (ev: MessageEvent) => {
    const data = ev.data as { type?: unknown; page?: unknown } | null;
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'oasis:back-portal') { retourAuPortail(); return; }
    // `<prefixe>:page` — le sous-titre de la barre, qui n'est plus affiché.
    if (data.type.endsWith(':page')) basculerPleinEcran(true);
  });
}

export type { ModuleInstalle, Vue };
