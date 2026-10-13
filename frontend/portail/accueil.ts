// OASIS — L'accueil du portail (ADR-003, 5.e.3).
//
// Quatrième pièce d'`app.js`, et **l'écran que tout le monde voit** : les cartes
// des modules, groupées par thème, dans l'ordre de la feuille de route.
//
// ── La carte éteinte, que la suite du navigateur n'atteint pas ──
//
// Un module fermé au compte s'affiche en gris, porte un `aria-disabled`, et son
// clic dit pourquoi au lieu de mener nulle part. Trois états le commandent : le
// rôle de super-administrateur ouvre tout, une liste `modules` **absente** ouvre
// tout aussi — c'était l'état de l'application avant que ce champ n'existe — et
// une liste renseignée filtre.
//
// Le jeu d'essai de la suite « parcours » n'ouvre qu'un compte de
// super-administrateur : **cette moitié de `card` n'était éprouvée nulle part**.
// `scripts/comparer-accueil.js` la fabrique — liste partielle, liste vide, liste
// absente, code inconnu, valeur qui n'est pas un tableau — et une garde exige que
// le balisage comparé porte les deux sortes de cartes.
//
// ── `MODULES_VIEW` : un état retenu dans le stockage, et privé ──
//
// La présentation en grille ou en liste survit au rechargement. C'était un `let`
// du premier niveau, donc une globale lexicale, et personne d'autre ne la lisait :
// elle devient privée. Quatrième fois après `AAC_CFG` (5.d.5),
// `PORTAIL_RECHERCHE` (5.e.0) et les trois de l'écran des comptes (5.e.1).
//
// ── Une requête pour rien, fixée plutôt que corrigée ──
//
// `renderHome` demande `/api/stats`, en lit la réponse, et **ne s'en sert pas** :
// la route parcourt tous les comptes du serveur à chaque ouverture du portail,
// pour rien. La conversion ne la retire pas — ce serait changer ce que la page
// fait — et la comparaison des routes lues dans l'ordre la **fixe** : sa
// disparition serait un écart, donc une décision. C'est la même méthode que pour
// l'adresse centrale vidée (5.c.13) et la longueur de mot de passe à zéro (5.d.5).
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { PRIO_COLORS, icon, moduleIcon } from './icones';
import { t, tSouple } from './traductions';
import type { Moi } from './etat';

/** Un thème de la page d'accueil. L'icône est facultative — voir plus bas. */
export interface Theme {
  code: string;
  icon?: string;
}

/** Une carte du catalogue, telle que l'accueil la lit. */
export interface ModuleAccueil {
  code: string;
  theme: string;
  enabled: boolean;
  priority: number;
  name: Record<string, string> & { fr: string };
  desc: Record<string, string> & { fr: string };
}

declare global {
  interface Window {
    /** Bascule la présentation des modules : grille ou liste, et la retient. */
    setModulesView: (mode: string) => void;
  }
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

/**
 * La présentation retenue.
 *
 * Le `try` n'est pas décoratif : en navigation privée, l'accès au stockage lève,
 * et un module qui lève au chargement laisse la page à sa source. L'original ne
 * s'en protégeait pas — il était dans un script classique, où la levée arrêtait
 * le fichier au même endroit. Ici elle arrêterait **tout le paquet du portail**.
 */
function lireVueRetenue(): 'grid' | 'list' {
  try {
    return localStorage.getItem('oasis_modules_view') === 'list' ? 'list' : 'grid';
  } catch { return 'grid'; }
}

/** La session, exigée. L'original écrit `ME.user.role` sans précaution. */
function compte(): Moi {
  const m = window.ME;
  if (!m) throw new Error("l'accueil a été rendu sans session : `ME` est vide");
  return m;
}

/**
 * Le développé du sigle, en balisage.
 *
 * Non publié sur `window` : c'était un `const` du premier niveau, donc une
 * globale **lexicale**, et seul cet écran le lit. À ne pas confondre avec
 * `OASIS_LOGO_IMG`, qui a dû monter sur `window` en 5.c parce
 * qu'`app-demarrage` le lit — deux noms voisins, deux situations contraires.
 */
const OASIS_FULLNAME_HTML =
  '<span class="sigle-cap">O</span>utils d\'<span class="sigle-cap">A</span>dministration' +
  ' et de <span class="sigle-cap">S</span>upervision' +
  ' <span class="sigle-cap">I</span>ntégrée de la <span class="sigle-cap">S</span>écurité';

let MODULES_VIEW: 'grid' | 'list' = lireVueRetenue();

export function setModulesView(mode: string): void {
  MODULES_VIEW = mode === 'list' ? 'list' : 'grid';
  localStorage.setItem('oasis_modules_view', MODULES_VIEW);
  const box = document.getElementById('portalModules');
  if (box) box.classList.toggle('list-view', MODULES_VIEW === 'list');
  document.querySelectorAll('.portal-viewmode-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0) === (MODULES_VIEW === 'grid'));
  });
}

export const COULEURS_MODULE: Readonly<Record<string, string>> = {
  PLAN: '#0059ff',
  SURV: '#ed580e',
  RAMP: '#ff9500',
  CARE: '#ff0000',
}

export const THEMES_ORDER: readonly Theme[] = [
  { code: 'surveillance' },
  { code: 'reglementation', icon: 'fileText' },
  { code: 'cert_risques', icon: 'award' },
  { code: 'personnel_coop', icon: 'users' },
  { code: 'services', icon: 'creditCard' },
];

export async function renderHome(): Promise<void> {
  const [statsRes, modulesRes] = await Promise.all([appel('/api/stats'), appel('/api/modules')]);
  // ── La réponse de `/api/stats` est lue et **jetée**, comme dans l'original ──
  //
  // Voir l'en-tête : la requête ne sert à rien, et la retirer serait changer ce
  // que la page fait. Elle est lue pour que la chaîne de promesses reste la même.
  await statsRes.json();
  const modules = await modulesRes.json() as ModuleAccueil[];

  // Chaque module d'un même thème porte sa propre teinte : les quatre cartes
  // de « Surveillance et inspections » se distinguent au premier regard.
  // Modules ouverts au compte, tels que « Accès aux modules » les déclare. Une
  // liste jamais renseignée les ouvre tous : c'était l'état de l'application
  // avant que ce champ n'existe, et le super-administrateur y a toujours accès
  // — c'est lui qui coche les cases.
  const mesModules = Array.isArray(compte().user.modules) ? compte().user.modules ?? null : null;
  const ouvert = (code: string) => compte().user.role === 'SUPERADMIN' || !mesModules
    || mesModules.includes(code);

  const card = (m: ModuleAccueil) => {
    // ── Une dette qui n'en était pas une (5.e.5) ──
    //
    // Cette ligne lisait `window.PRIO_COLORS`, tandis que le fichier **importait
    // déjà** `PRIO_COLORS` d'`./icones` sans s'en servir. Le relevé de surface
    // comptait donc une dette réelle — retirer la publication aurait cassé cette
    // ligne — là où il n'y avait qu'un import oublié. Les deux désignent le même
    // objet : un seul paquet, un seul module, une seule table.
    //
    // Le prêt que 5.d.5 avait installé pour qu'`app.js` lise cette palette est
    // donc rendu, et `globales/icons.ts` n'a plus rien à publier : il est
    // supprimé.
    const color = COULEURS_MODULE[m.code] || PRIO_COLORS[m.priority] || '#64748b';
    const name = m.name[window.CURRENT_LANG ?? ''] || m.name.fr;
    const desc = m.desc[window.CURRENT_LANG ?? ''] || m.desc.fr;
    // Un module fermé au compte se voit, éteint : il dit ce que l'application
    // fait, sans laisser croire qu'un clic l'ouvrira.
    const accessible = ouvert(m.code);
    // La carte ne porte ni priorité, ni état d'activation, ni point du TdR :
    // ce sont des informations de feuille de route, pas d'usage.
    return `
    <div class="portal-card${accessible ? '' : ' portal-card-ferme'}" style="--module-color:${color};"
         data-module="${escapeHtml(m.code)}" data-enabled="${accessible ? 'true' : 'false'}"
         ${accessible ? '' : 'title="' + t('module_non_ouvert') + '" aria-disabled="true"'}>
      <div class="portal-card-icon-wrap">${moduleIcon(m.code, 26)}</div>
      <div class="portal-card-title">${escapeHtml(name)}</div>
      <div class="portal-card-desc">${escapeHtml(desc)}</div>
    </div>`;
  };

  // L'ordre des cartes est celui de config/modules.json : la feuille de route
  // range les modules dans l'ordre où ils s'enchaînent métier. Trier sur le
  // numéro de TdR le défaisait — D.8 y passait après D.7.2.
  const rang = new Map(modules.map((m: ModuleAccueil, i: number) => [m.code, i]));
  const groups = THEMES_ORDER.map((th) => {
    const mods = modules
      // Un module non activé n'a rien à montrer : sa carte ne s'affiche pas.
      .filter((m: ModuleAccueil) => m.theme === th.code && m.enabled)
      // ── Le tri peut rendre `NaN`, et l'original le faisait déjà ──
      //
      // `rang.get(code)` est `undefined` pour un module hors du catalogue lu
      // juste avant — impossible ici, les deux listes étant la même —, et
      // `undefined - undefined` donne `NaN`, que `sort` traite comme zéro. On
      // garde la soustraction : écrire un repli changerait l'ordre dans un cas
      // que l'original ne distingue pas.
      .sort((a: ModuleAccueil, b: ModuleAccueil) => (rang.get(a.code) ?? NaN) - (rang.get(b.code) ?? NaN));
    if (!mods.length) return '';
    // Le groupe « surveillance » n'a plus d'en-tête : le bloc PESSCO qui ferme
    // la page dit déjà son nom, en grand. Les autres gardent le leur — rien ne
    // les nomme ailleurs.
    const entete = th.code === 'surveillance' ? '' : `
      <div class="portal-group-header">
        ${th.icon ? `<span class="group-icon">${icon(th.icon, 18)}</span>` : ''}
        ${escapeHtml(tSouple('theme_' + th.code))}
        <span class="group-count">${mods.length}</span>
      </div>`;
    return `
    <div class="portal-group">${entete}
      <div class="portal-grid">${mods.map(card).join('')}</div>
    </div>`;
  }).join('');

  const vue = document.getElementById('mainView');
  if (!vue) throw new Error("la vue principale est absente : « mainView » n'est pas dans le document");
  vue.innerHTML = `
    <div class="portal-titleblock">
      <div class="portal-titleblock-sigle">
        <span class="tb-word"><span class="tb-o">O</span>ASIS<span class="oasis-pessco">pessco</span>
        </span>
        <span class="tb-flight" aria-hidden="true">
          <span class="tb-trail"></span>
          <span class="tb-plane">
            <svg viewBox="-32 -32 64 64" fill="currentColor"><g transform="rotate(90)"><path d="M0 -28 C4.5 -28 7 -19 7 -10 L28 4 V11 L7 2 V15 L13 21 V26 L0 21 L-13 26 V21 L-7 15 V2 L-28 11 V4 L-7 -10 C-7 -19 -4.5 -28 0 -28 Z"/></g></svg>
          </span>
        </span>
      </div>
      <div class="portal-titleblock-sub">
        <span class="tb-tower" aria-hidden="true">
          <svg viewBox="0 0 40 133" fill="currentColor">
            <path d="M13 133 L27 133 L24.5 62 L15.5 62 Z"/>
            <rect x="10.5" y="55.5" width="19" height="6.5" rx="2"/>
            <path d="M5 55.5 L35 55.5 L30.5 34 L9.5 34 Z"/>
            <path d="M11.5 51 L28.5 51 L26.3 38.5 L13.7 38.5 Z" fill="var(--bg)"/>
            <rect x="19.4" y="38.5" width="1.2" height="12.5"/>
            <rect x="1.5" y="26" width="37" height="8" rx="2"/>
            <rect x="19" y="8" width="2" height="18"/>
            <circle class="tb-tower-beacon" cx="20" cy="5.5" r="3.2"/>
          </svg>
        </span>
        <span class="tb-fullname">${OASIS_FULLNAME_HTML}</span>
      </div>
    </div>
    <div class="portal-page-header">
      <div class="portal-viewmode">
        <button class="portal-viewmode-btn ${MODULES_VIEW === 'grid' ? 'active' : ''}"
                onclick="setModulesView('grid')" title="${escapeHtml(t('view_grid'))}">${icon('grid', 16)}</button>
        <button class="portal-viewmode-btn ${MODULES_VIEW === 'list' ? 'active' : ''}"
                onclick="setModulesView('list')" title="${escapeHtml(t('view_list'))}">${icon('list', 16)}</button>
      </div>
    </div>
    <div class="portal-modules ${MODULES_VIEW === 'list' ? 'list-view' : ''}" id="portalModules">${groups}</div>
    <!-- Le nom du dispositif ferme la page, au même corps que le bloc titre qui
         l'ouvre. Le développé n'est pas traduit : c'est celui qui forme le
         sigle — P·E·S·S·CO — et il ne le formerait plus dans une autre langue. -->
    <div class="portal-brandmark">
      <div class="portal-brandmark-sigle">PESSCO</div>
      <div class="portal-brandmark-sub">Planification, Exécution et Suivi de la Surveillance Continue</div>
    </div>`;


  document.querySelectorAll<HTMLElement>('.portal-card[data-module]').forEach((cardEl) => {
      cardEl.addEventListener('click', async () => {
      const enabled = cardEl.dataset.enabled === 'true';
      const code = cardEl.dataset.module;
      // Carte éteinte : le clic ne mène nulle part, il dit pourquoi.
      if (!enabled) {
        showToast(t('module_non_ouvert'), 'error');
        return;
      }
      // Le registre des modules peut ne pas avoir encore été chargé (session
      // ouverte après le script) : on le redemande avant de renoncer.
      if (enabled && !window.VIEWS[`mod_${code}`] && typeof window.moduleHostRegisterViews === 'function') {
        await window.moduleHostRegisterViews(true);
      }
      if (enabled && window.VIEWS[`mod_${code}`]) { window.navigate(`mod_${code}`); return; }
      showToast(enabled ? t('mod_toast_enabled') : t('mod_toast_disabled'), enabled ? 'success' : 'warning');
    });
  });
}
