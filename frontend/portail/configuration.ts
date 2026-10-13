// OASIS — Le cycle de rendu de l'écran de configuration (ADR-003, 5.d.6).
//
// **La dernière pièce.** Avec elle, `public/js/app-config.js` disparaît : 1 443
// lignes de JavaScript réparties en six modules typés, chacun avec sa preuve
// mécanique.
//
// ── La décision que 5.d laissait ouverte : non, pas React ──
//
// L'ADR annonçait que cette étape trancherait si l'écran devient un composant
// React. Il ne le devient pas, et la raison n'est pas le coût mais la **perte de
// preuve** :
//
// Les onze sous-vues rendent des **chaînes de balisage**, et leurs gestes sont
// des attributs `onclick` qui appellent des globales. Un composant React les
// poserait dans un `dangerouslySetInnerHTML` — ce qui n'est pas du React, c'est
// du balisage dans un emballage —, ou bien il faudrait réécrire les onze en JSX
// d'un seul coup. Or c'est précisément ce que six étapes se sont interdit :
// convertir sans changer, en comparant caractère pour caractère.
//
// Cet écran reste donc un **assembleur de chaînes typé**, et son passage à React
// devient un chantier à part, qui commencera par les gestes et non par le rendu.
// Le dire ici évite qu'on le croie fait.
//
// ── Ce que ce module importe, et ce que les sas continuent de publier ──
//
// Les onze sous-vues sont **importées de leur source**, non lues sur `window` :
// c'est la dernière chose que la conversion rapporte. Les sas continuent pourtant
// de les publier, et ce n'est plus pour `app-config.js` — il n'existe plus. C'est
// pour les six comparateurs, qui font tourner les **versions d'origine** : celles-ci
// cherchent `cfgSectionAAC` et ses neuf voisines dans la portée globale, et sans le
// sas elles ne les y trouveraient pas.
//
// La conséquence est à nommer plutôt qu'à masquer : la couche des sas n'est plus
// seulement le pont de la cohabitation, elle est aussi le **banc des preuves**. Le
// jour où `app.js` partira, le pont n'aura plus d'usage et il faudra choisir — ou
// les comparateurs deviennent des pièces d'archive, ou on leur construit un paquet
// à eux. La décision n'est pas de cette étape ; sa date, si.
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t, tSouple } from './traductions';
import { refTable } from './referentiels';
import { cfgSectionExigences } from './exigences';
import { cfgSectionOrganigramme, normalizeOrgTopLevel } from './organigramme';
import { cfgSectionDomaines, cfgSectionPersonnel } from './taxinomie';
import { cfgChargerInstances, cfgSectionInstances, jeSuisRegional } from './instances';
import {
  cfgSectionAAC, cfgSectionModules, cfgSectionSecurite, cfgSectionSysteme,
  type ConfigAac, type ConfigSecurite, type ConfigSysteme, type ModuleCatalogue,
} from './parametres';
import { loadRefs } from './outils';

/**
 * La configuration de l'instance, telle que les trois écrans la lisent.
 *
 * L'intersection dit la vérité : `renderConfig` lit **une** réponse et la passe à
 * trois fonctions qui en veulent chacune une part. Un type par part, et leur
 * somme ici — plutôt qu'un type unique qui aurait mélangé les trois.
 */
export interface ConfigEcran extends ConfigAac, ConfigSecurite, ConfigSysteme {
  /**
   * Le reste de la configuration : la plate-forme, le temps, la rétention, le
   * courrier, l'interopérabilité. Cet écran ne les lit pas, mais `CURRENT_CFG`
   * les porte — et c'est le même objet.
   */
  [autre: string]: unknown;
}

/**
 * Une entrée de la barre latérale : un **titre de section**, ou un bouton.
 *
 * L'union est ce que l'original écrivait sans le dire : `{ section }` d'un côté,
 * `{ id, labelKey, icon }` de l'autre, et un `if (tab.section)` pour les séparer.
 * Un seul type à champs optionnels aurait laissé écrire `tab.id` sur un titre.
 */
export type Onglet =
  | { section: string }
  | { id: string; labelKey: string; icon: string; regionalOnly?: boolean };

declare global {
  interface Window {
    /** Les treize entrées de la barre latérale de la configuration. */
    CFG_TABS: Onglet[];
    /** Change de sous-vue, vide la recherche, redessine. */
    cfgNavigate: (sous: string) => void;
    /** Replie ou déplie la barre latérale, et redessine. */
    toggleCfgSidebar: () => void;
  }
}

// ── Les treize entrées, reprises telles quelles ──
//
// L'ordre est celui de l'écran, et les deux titres de section le coupent en deux.
// `Instances` n'est pas une clé de libellé mais un mot : `tSouple` retombe sur la
// clé elle-même, et c'est ce que faisait déjà le `t` tolérant du portail.
export const CFG_TABS: Onglet[] = [
  { section: 'cfg_sec_referentiels' },
  { id: 'organisation', labelKey: 'cfg_organisation', icon: 'users' },
  { id: 'organigramme', labelKey: 'cfg_organigramme', icon: 'sitemap' },
  { id: 'domaines', labelKey: 'cfg_domaines', icon: 'globe' },
  { id: 'exigences', labelKey: 'cfg_exigences', icon: 'fileText' },
  { id: 'prestataires', labelKey: 'cfg_prestataires', icon: 'briefcase' },
  { id: 'inspecteurs', labelKey: 'cfg_inspecteurs', icon: 'userCheck' },
  { id: 'autres', labelKey: 'cfg_autres', icon: 'sliders' },
  { section: 'cfg_sec_plateforme' },
  { id: 'instances', labelKey: 'Instances', icon: 'globe', regionalOnly: true },
  { id: 'securite', labelKey: 'cfg_security', icon: 'shield' },
  { id: 'modules', labelKey: 'cfg_modules', icon: 'grid' },
  { id: 'systeme', labelKey: 'cfg_systeme', icon: 'database' },
];

// L'appel d'API : un `fetch` nu, comme dans les six modules précédents.
async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

export function cfgNavigate(sous: string): void {
  window.CFG_SUB = sous;
  window.portailReinitialiserRecherche();
  void renderConfig();
}

export function toggleCfgSidebar(): void {
  window.CFG_COLLAPSED = !window.CFG_COLLAPSED;
  void renderConfig();
}

/**
 * L'aiguillage vers l'une des onze sous-vues.
 *
 * Isolé de `renderConfig` pour qu'il se compare seul : c'est **la place** de
 * chaque écran qui se prouve ici, non son balisage — celui-là l'est déjà, une
 * sous-vue à la fois, par les six comparateurs de 5.d.0 à 5.d.5. Une permutation
 * de deux `case` rendrait deux écrans parfaitement corrects au mauvais endroit.
 *
 * `case 'themes'` **réécrit la sous-vue** au passage, et c'est un effet de bord que
 * l'original avait : un ancien lien y menait, et il remet l'écran sur son nom
 * actuel. Conservé, et asserté.
 *
 * Le `default` n'est pas un renvoi vers `'organisation'` mais la **répétition** de
 * son balisage. La différence se voit : la sous-vue inconnue reste dans `CFG_SUB`,
 * donc aucune entrée de la barre n'est marquée active.
 */
function contenu(cfg: ConfigEcran, modules: ModuleCatalogue[]): string {
  switch (window.CFG_SUB) {
    case 'organisation': return cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation');
    case 'organigramme': return cfgSectionOrganigramme();
    case 'domaines': return cfgSectionDomaines();
    case 'themes': window.CFG_SUB = 'domaines'; return cfgSectionDomaines();
    case 'exigences': return cfgSectionExigences();
    case 'prestataires': return refTable('prestataires', true);
    case 'inspecteurs': return cfgSectionPersonnel();
    case 'autres': return refTable('types_supervision', true) + refTable('modes_supervision') + refTable('niveaux_qualifications') + refTable('specialites_inspecteur');
    case 'securite': return cfgSectionSecurite(cfg);
    case 'modules': return cfgSectionModules(modules);
    case 'systeme': return cfgSectionSysteme(cfg);
    case 'instances': return cfgSectionInstances();
    default: return cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation');
  }
}

/** La barre latérale : treize entrées, dont une réservée au poste régional. */
function barreLaterale(): string {
  return CFG_TABS
    .filter((tab) => !('regionalOnly' in tab && tab.regionalOnly) || jeSuisRegional())
    .map((tab) => {
      if ('section' in tab) return `<div class="cfg-sidebar-section">${escapeHtml(tSouple(tab.section))}</div>`;
      return `
    <button class="cfg-sidebar-item ${window.CFG_SUB === tab.id ? 'active' : ''}" onclick="cfgNavigate('${tab.id}')" title="${escapeHtml(tSouple(tab.labelKey))}">
      <span class="cfg-sidebar-icon">${icon(tab.icon, 17)}</span>
      <span class="cfg-sidebar-label">${escapeHtml(tSouple(tab.labelKey))}</span>
    </button>`;
    })
    .join('');
}

/**
 * Branche un écouteur par interrupteur de module, après le rendu.
 *
 * C'est le **seul geste de cet écran qui écrive au serveur**, et le seul qui ne
 * passe pas par un attribut `onclick` : les interrupteurs sont retrouvés par
 * `[data-module-toggle]` dans le balisage qui vient d'être posé.
 *
 * Le refus remet la case dans son état d'avant. Sans cela, l'écran montrerait un
 * module activé que le serveur a refusé d'activer.
 */
function brancherInterrupteurs(): void {
  document.querySelectorAll<HTMLInputElement>('[data-module-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const code = toggle.dataset.moduleToggle;
      const res = await appel(`/api/modules/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: toggle.checked }),
      });
      if (res.ok) showToast(toggle.checked ? t('module_active', code) : t('module_desactive', code), 'success');
      else {
        toggle.checked = !toggle.checked;
        showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
      }
    });
  });
}

/**
 * Le cycle complet : lire, normaliser, aiguiller, rendre, brancher.
 *
 * ── `#mainView` absent : on lève, comme l'original ──
 *
 * L'original écrit `document.getElementById('mainView').innerHTML = …` et lève une
 * `TypeError` si la vue manque. On lève aussi, en nommant la cause : la leçon de
 * 5.d.5, où un repli silencieux faisait partir une requête avec un champ vidé.
 * Ici rien ne partirait, mais un écran qui ne se rend pas **sans rien dire** est le
 * mode de défaillance que tout ce jalon cherche à éviter.
 */
export async function renderConfig(): Promise<void> {
  const [cfgRes, modulesRes] = await Promise.all([appel('/api/config'), appel('/api/modules')]);
  const cfg = await cfgRes.json() as ConfigEcran;
  window.CURRENT_CFG = cfg;
  const modules = await modulesRes.json() as ModuleCatalogue[];
  if (!Object.keys(window.REFS).length) await loadRefs();
  if (window.CFG_SUB === 'instances' && jeSuisRegional()) await cfgChargerInstances();
  normalizeOrgTopLevel(cfg);

  const corps = contenu(cfg, modules);
  const items = barreLaterale();

  const vue = document.getElementById('mainView');
  if (!vue) throw new Error("la vue principale est absente : « mainView » n'est pas dans le document");
  vue.innerHTML = `
    <div class="portal-page-header"><h2>${escapeHtml(t('config_title'))}</h2></div>
    <div class="cfg-layout">
      <div class="cfg-sidebar ${window.CFG_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleCfgSidebar()" aria-label="${escapeHtml(t('sous_menu_basculer'))}" title="${escapeHtml(t('sous_menu_basculer'))}">${window.CFG_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${items}
      </div>
      <div class="cfg-content">${corps}</div>
    </div>
    <div id="cfgModalRoot"></div>`;

  brancherInterrupteurs();
}
