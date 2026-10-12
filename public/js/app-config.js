/* OASIS — Portail : ce qu'il reste de l'écran de configuration.
 *
 * Le fichier faisait 1 443 lignes et portait les onze sous-vues. Six étapes
 * d'ADR-003 suite 5.d les ont converties en modules typés, chacune avec sa
 * preuve mécanique (`scripts/comparer-*.js`) : il n'en reste que le **cycle de
 * rendu** — la barre latérale, la navigation entre sous-vues, et l'aiguillage
 * qui appelle les modules.
 *
 * C'est la dernière pièce, et elle décide de la forme de la suite : l'écran
 * devient un composant React, ou reste un assembleur de chaînes. Le jour où
 * elle part, ce fichier disparaît et la page cesse de charger onze paquets.
 *
 * Il ne porte **plus aucun état** : `AAC_CFG`, `CFG_OPEN`, `EXIG_OPEN` et
 * `ORG_VIEW` sont partis avec leurs écrans. `CFG_SUB`, `CFG_COLLAPSED`, `REFS`
 * et `CURRENT_CFG` sont sur `window` (`frontend/portail/etat.ts`), et les
 * affectations nues ci-dessous les atteignent.
 */

// ══════════ Configuration (layout PESSCO) ══════════

const CFG_TABS = [
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


// ── Schémas des référentiels : partis dans un module typé (ADR-003, 5.d) ──
//
// Les onze schémas, les six fournisseurs d'options et `fieldValue` vivent
// désormais dans `frontend/portail/schemas.ts`, et un sas les pose sur `window`
// avant le chargement de ce fichier (`public/app/schemas.js`, voir index.html).
//
// Ce fichier les appelle toujours en identifiants nus — `REF_SCHEMAS`,
// `champsVisibles`, `fieldValue`, `refLabel`, `personnelName`… — qui atteignent
// maintenant les propriétés de `window`. **Il ne doit pas les redéclarer** : un
// `const REF_SCHEMAS` ici serait une globale lexicale qui masquerait la
// propriété pour tout ce fichier, et deux versions des schémas coexisteraient
// sans une erreur.
//
// L'extraction est éprouvée par `scripts/comparer-schemas.js` : 2 820
// comparaisons sur les données réelles, et trois divergences assumées —
// dont la correction d'un tri qui modifiait `REFS` sur place.
//
// Ce chiffre a été faux de 5.d.0 à 5.d.5 : le comparateur **relève** dans le code
// les couples que `refLabel` reçoit, et les cinq appels étaient dans le bloc
// extrait — trois sont partis avec lui dans `schemas.ts`. Mesuré avant le
// retrait, invalidé par le retrait, dans le même commit. Le relevé lit désormais
// aussi les modules typés, et les cinq couples y sont gelés : qu'un seul cesse
// d'être relevé est un refus.

// ── Le CRUD générique des référentiels : parti dans un module typé (5.d.1) ──
//
// `refTable`, `openRefModal`, `closeRefModal`, `saveRef`, `deleteRef`,
// `orgTypeChanged`, `toggleInspectorFields` et `orgTopLevelType` vivent
// désormais dans `frontend/portail/referentiels.ts` ; un sas les pose sur
// `window` avant le chargement de ce fichier (`public/app/referentiels.js`).
//
// `CURRENT_CFG` est monté sur `window` avec eux (voir `frontend/portail/etat.ts`) :
// c'était un `let` du premier niveau, donc une globale lexicale qu'aucun module ne
// peut atteindre, et `openRefModal` y lit le sigle et le nom de l'Administration.
// Ce fichier continue de l'écrire par une affectation nue, et **ne doit pas le
// redéclarer**.
//
// Trois dépendances restent dans l'autre sens : le module lit `tr`,
// `searchInputHtml` et `exportBar` sur `window`, parce que leurs tables et leur
// état vivent encore dans `app.js`.
//
// L'extraction est éprouvée par `scripts/comparer-referentiels.js` : 640
// comparaisons de balisage, caractère pour caractère, sur les données réelles et
// en quatre régimes. Les cinq gestes qui touchent au document ou à l'API sont
// couverts par la ronde complète de la suite « parcours » (5.c.7).


// Exigences groupées par règlement (bandeaux rétractables ; date d'adoption à droite)
// ── Les exigences réglementaires : parties dans un module typé (5.d.2) ──
//
// `toggleExigGroup`, `cfgSectionExigences`, `openExigDrawer`, `closeExigDrawer`,
// `saveExigDrawer`, `openReglementForm` et `saveReglement` vivent désormais dans
// `frontend/portail/exigences.ts` ; un sas les pose sur `window` avant le
// chargement de ce fichier (`public/app/exigences.js`).
//
// `EXIG_OPEN` — l'ensemble des bandeaux dépliés — et `fmtDay` sont partis avec
// eux : ce bloc en était le seul lecteur. **Ne pas les redéclarer ici** : un
// `const EXIG_OPEN` serait une globale lexicale, et l'écran lirait un état que
// la bascule ne touche plus.
//
// L'extraction est éprouvée par `scripts/comparer-exigences.js` : 84
// comparaisons de balisage, caractère pour caractère, en sept régimes — bandeaux
// fermés, dépliés, un seul déplié, les trois langues, et un jeu bricolé qui porte
// une exigence orpheline et un règlement sans date. Les quatre gestes qui
// touchent au document ou à l'API sont couverts par la suite « parcours » (5.c.12).


// ── L'organigramme : parti dans un module typé (5.d.3) ──
//
// Les douze gestes, les deux présentations, le registre d'un poste et la chaîne
// de validation vivent désormais dans `frontend/portail/organigramme.ts` ; un sas
// les pose sur `window` avant le chargement de ce fichier.
//
// `LEVEL_COLORS`, `orgChainFor` et `circuitHtml` sont **prêtés** par ce sas. Plus
// aucun code de ce fichier ne les lit depuis 5.d.4 — mais les comparateurs de
// 5.d.3 et 5.d.4 en ont besoin pour faire tourner les versions d'origine, qui les
// lisaient dans la portée globale. Le prêt se rendra avec ce fichier (5.d.6).
//
// **Ne pas redéclarer `ORG_VIEW`**, désormais privée au module : une copie
// lexicale ferait que la bascule des présentations n'agirait plus sur ce que
// l'écran rend.
//
// `normalizeOrgTopLevel` part avec eux, et son effet de bord est nommé là-bas :
// elle **écrit dans `REFS`** à chaque rendu, pour aligner l'entité de niveau 1 sur
// l'identité de l'Administration. La conversion ne corrige pas, elle rend visible.
//
// Éprouvé par `scripts/comparer-organigramme.js` : 243 comparaisons, caractère
// pour caractère, en onze régimes — dont un cycle de rattachement et une
// hiérarchie de sept niveaux, tous deux fabriqués après des contre-essais qui ne
// mordaient pas. Les dix gestes qui touchent au document ou à l'API sont couverts
// par la suite « parcours » (5.c.11).


// ── Le personnel et la taxinomie : partis dans un module typé (5.d.4) ──
//
// `cfgSectionPersonnel`, `cfgSectionDomaines`, `togglePers`, `toggleAcc` et les
// quatre fabriques d'accordéon vivent désormais dans
// `frontend/portail/taxinomie.ts` ; un sas pose les quatre premiers sur `window`.
//
// `CFG_OPEN` part avec eux, et c'est **lui** qui imposait de convertir les deux
// écrans d'un seul coup : l'ensemble des éléments dépliés sert aux fiches du
// personnel comme aux accordéons de la taxinomie. **Ne pas le redéclarer ici** —
// une copie lexicale ferait que déplier une fiche n'agirait plus sur ce que
// l'écran rend.
//
// Éprouvé par `scripts/comparer-taxinomie.js` : 20 comparaisons de balisage en
// dix régimes — tout replié, tout déplié, les deux mélanges, les deux régimes
// d'instance, les collections renversées, un jeu bricolé (domaine sans secteur,
// thème orphelin, fiche non-inspecteur) et le vide.


// ── Les paramètres de l'instance : partis dans un module typé (5.d.5) ──
//
// `cfgSectionAAC`, `openAacEdit`, les deux gestes du logo, `saveAAC`,
// `cfgSectionSecurite`, `saveSecurite`, `cfgSectionModules`, `cfgSectionSysteme`
// et `saveSysteme` vivent désormais dans `frontend/portail/parametres.ts` ; un
// sas les pose sur `window` avant le chargement de ce fichier
// (`public/app/parametres.js`, voir index.html).
//
// `AAC_CFG` part avec eux, et **ne doit pas être redéclaré ici** : la fenêtre
// d'édition lit ce que le rendu de l'écran y a posé, et une copie lexicale la
// ferait ouvrir vide. C'était le dernier état de ce fichier — il ne lui en reste
// aucun.
//
// `PRIO_COLORS` a dû quitter `app.js` pour `frontend/portail/icones.ts` : c'était
// un `const` du premier niveau, donc une globale lexicale, et l'écran « Modules »
// la lit. C'est la cinquième fois que cet obstacle décide d'un déplacement — la
// dépendance, non l'interface, bloque la conversion.
//
// `saveAacLogo` est devenue **privée** : c'est le seul nom que ce bloc retire de
// la surface, ses deux appelants étant partis avec elle. `cameraIcon` reste
// publié, bien que personne ne le lise hors du module : une `function` du
// premier niveau était sur `window`, et une conversion n'est pas le moment de
// décider d'en retirer un nom.
//
// Éprouvé par `scripts/comparer-parametres.js` : 142 comparaisons en vingt-trois
// régimes — les trois langues et une quatrième absente du catalogue, une
// Administration vide puis hostile aux cinq caractères, les quatre combinaisons
// d'interrupteurs, les modules renversés, une priorité hors de la palette, et le
// **corps des trois enregistrements** tel qu'il partirait au serveur. Dont deux
// gardes que le balisage seul ne pouvait pas porter : la liste des modules rendue
// après l'appel — sans elle, retirer le `.slice()` du tri serait resté vert — et
// les cinq teintes de la palette, confrontées à l'`app.js` d'origine.
//
// Les deux gestes du logo et la confirmation de son retrait restent couverts par
// la suite « parcours » (5.c.10), les sept réglages de sécurité et les six
// interrupteurs par 5.c.13.

window.cfgNavigate = function (sub) {
  CFG_SUB = sub;
  portailReinitialiserRecherche();
  renderConfig();
};

window.toggleCfgSidebar = function () {
  CFG_COLLAPSED = !CFG_COLLAPSED;
  renderConfig();
};


async function renderConfig() {
  const [cfgRes, modulesRes] = await Promise.all([api('/api/config'), api('/api/modules')]);
  const cfg = await cfgRes.json();
  CURRENT_CFG = cfg;
  const modules = await modulesRes.json();
  if (!Object.keys(REFS).length) await loadRefs();
  if (CFG_SUB === 'instances' && jeSuisRegional()) await cfgChargerInstances();
  normalizeOrgTopLevel(cfg);

  let content = '';
  switch (CFG_SUB) {
    case 'organisation': content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation'); break;
    case 'organigramme': content = cfgSectionOrganigramme(); break;
    case 'domaines': content = cfgSectionDomaines(); break;
    case 'themes': CFG_SUB = 'domaines'; content = cfgSectionDomaines(); break;
    case 'exigences': content = cfgSectionExigences(); break;
    case 'prestataires': content = refTable('prestataires', true); break;
    case 'inspecteurs': content = cfgSectionPersonnel(); break;
    case 'autres': content = refTable('types_supervision', true) + refTable('modes_supervision') + refTable('niveaux_qualifications') + refTable('specialites_inspecteur'); break;
    case 'securite': content = cfgSectionSecurite(cfg); break;
    case 'modules': content = cfgSectionModules(modules); break;
    case 'systeme': content = cfgSectionSysteme(cfg); break;
    case 'instances': content = cfgSectionInstances(); break;
    default: content = cfgSectionAAC(cfg) + refTable('organisation_levels') + refTable('organisation');
  }

  const sidebarItems = CFG_TABS.filter((tab) => !tab.regionalOnly || jeSuisRegional()).map((tab) => {
    if (tab.section) return `<div class="cfg-sidebar-section">${esc(t(tab.section))}</div>`;
    return `
    <button class="cfg-sidebar-item ${CFG_SUB === tab.id ? 'active' : ''}" onclick="cfgNavigate('${tab.id}')" title="${esc(t(tab.labelKey))}">
      <span class="cfg-sidebar-icon">${icon(tab.icon, 17)}</span>
      <span class="cfg-sidebar-label">${esc(t(tab.labelKey))}</span>
    </button>`;
  }).join('');

  document.getElementById('mainView').innerHTML = `
    <div class="portal-page-header"><h2>${esc(t('config_title'))}</h2></div>
    <div class="cfg-layout">
      <div class="cfg-sidebar ${CFG_COLLAPSED ? 'collapsed' : ''}">
        <button class="cfg-sidebar-toggle" onclick="toggleCfgSidebar()" aria-label="${esc(t("sous_menu_basculer"))}" title="${esc(t("sous_menu_basculer"))}">${CFG_COLLAPSED ? icon('chevronRight', 14) : icon('chevronLeft', 14)}</button>
        ${sidebarItems}
      </div>
      <div class="cfg-content">${content}</div>
    </div>
    <div id="cfgModalRoot"></div>`;

  document.querySelectorAll('[data-module-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const code = toggle.dataset.moduleToggle;
      const res = await api(`/api/modules/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: toggle.checked }),
      });
      if (res.ok) showToast(toggle.checked ? t('module_active', code) : t('module_desactive', code), 'success');
      else {
        toggle.checked = !toggle.checked;
        showToast(oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
      }
    });
  });
}
