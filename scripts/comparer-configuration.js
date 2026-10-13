#!/usr/bin/env node
/**
 * OASIS — Le cycle de rendu de l'écran de configuration, avant et après.
 *
 * ADR-003, 5.d.6. **La dernière pièce** : `renderConfig`, `cfgNavigate`,
 * `toggleCfgSidebar` et `CFG_TABS`. Après elle, `public/js/app-config.js` n'existe
 * plus.
 *
 * ── Ce que cette comparaison doit prouver, et qu'aucune autre ne couvre ──
 *
 * `renderConfig` n'est pas une fonction de balisage : c'est un **aiguillage**.
 * Il lit deux routes, pose `CURRENT_CFG`, charge les référentiels s'ils manquent,
 * normalise l'entité de niveau 1, choisit **l'une des onze sous-vues**, bâtit la
 * barre latérale, écrit `#mainView`, puis **branche un écouteur par interrupteur
 * de module**.
 *
 * Les onze sous-vues sont déjà éprouvées une à une par les cinq comparateurs de
 * 5.d.0 à 5.d.5. Ce qui ne l'est nulle part, c'est **l'aiguillage lui-même** :
 *
 *   · le `case` qui mène à la bonne sous-vue — une permutation de deux `case`
 *     rendrait deux écrans parfaitement corrects à la mauvaise place ;
 *   · le `case 'themes'` qui **réécrit `CFG_SUB`** en `'domaines'` au passage ;
 *   · le `default`, qui n'est pas `'organisation'` mais son balisage répété ;
 *   · la barre latérale : treize entrées dont deux titres de section et une
 *     réservée au poste régional ;
 *   · le repli, qui change une classe **et** le chevron ;
 *   · les écouteurs des interrupteurs de modules, posés après le rendu — et ce
 *     sont les seuls gestes de cet écran qui écrivent au serveur.
 *
 * ── Les régimes ne peuvent pas être moins que onze ──
 *
 * Une sous-vue non comparée est une sous-vue dont la place n'est pas prouvée.
 * Le compte est donc gardé : il doit y avoir autant de régimes que de `case`
 * dans l'original, et le garde les relève **dans le texte d'origine** plutôt que
 * de les croire.
 *
 * ── Ce que cette comparaison mesure, et ce qu'elle ne mesure pas ──
 *
 * Le côté « nouvelle » charge `public/app/configuration.js`, le paquet du seul
 * module. La page, depuis 5.d.7, en sert un autre : `public/app/portail.js`, qui
 * les réunit tous. Les deux viennent de la même source — mais ce qui les
 * distingue est justement ce que 5.d.7 corrige : dans `portail.js` il n'y a
 * **qu'une** copie de chaque module, donc un seul `CFG_OPEN`, une seule langue.
 *
 * Charger `portail.js` ici n'est pas possible : il appelle `demarrer()`, qui
 * ouvre la session et navigue. Cette comparaison mesure donc le **module**, et le
 * partage d'état entre modules est éprouvé par la suite « parcours » — c'est elle
 * qui a trouvé le défaut, par son contrôle de la bascule de langue.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_CFG_ORIGINE || '7413d76';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'configuration.js'))) {
    console.error('refus : public/app/configuration.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    const texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (!texte.includes('async function renderConfig(')) {
      console.error(`refus : ${SOURCE_ORIGINE} ne contient pas \`renderConfig\`.`);
      console.error('  Le fichier a disparu du dépôt : donner le dernier commit qui le porte');
      console.error('  par OASIS_CFG_ORIGINE=<sha>. Sans lui, ce script ne comparerait rien.');
      process.exit(2);
    }
    return texte;
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Donner le bon commit par OASIS_CFG_ORIGINE=<sha>.');
    process.exit(2);
  }
}

const FONCTIONS = ['cfgNavigate', 'toggleCfgSidebar', 'renderConfig'];

/** `CFG_TABS` est un `const` du premier niveau : on reprend sa déclaration entière. */
function tableOrigine(texte) {
  const lignes = texte.split('\n');
  const debut = lignes.findIndex((l) => l.startsWith('const CFG_TABS = ['));
  if (debut < 0) throw new Error('refus : `const CFG_TABS` est introuvable dans la version d’origine');
  const fin = lignes.findIndex((l, i) => i > debut && l === '];');
  if (fin < 0) throw new Error('refus : la fin de `CFG_TABS` est introuvable');
  return lignes.slice(debut, fin + 1).join('\n');
}

function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [tableOrigine(texte)];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
      || l.startsWith(`async function ${nom}(`)
      || l.startsWith(`window.${nom} = function`)
      || l.startsWith(`window.${nom} = async function`));
    if (debut < 0) throw new Error(`refus : « ${nom} » est introuvable dans la version d’origine`);
    if (lignes[debut].trimEnd().endsWith('};')) { morceaux.push(lignes[debut]); continue; }
    let fin = -1;
    for (let i = debut + 1; i < lignes.length; i += 1) {
      if (lignes[i] === '}' || lignes[i] === '};') { fin = i; break; }
    }
    if (fin < 0) throw new Error(`refus : la fin de « ${nom} » est introuvable`);
    morceaux.push(lignes.slice(debut, fin + 1).join('\n'));
  }
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { CFG_TABS, ${FONCTIONS.join(', ')} });`;
}

/** Les sous-vues que l'aiguillage d'origine connaît, relevées et non crues. */
function sousVuesOrigine(texte) {
  const bloc = texte.slice(texte.indexOf('switch (CFG_SUB)'));
  const vues = [...bloc.slice(0, bloc.indexOf('\n  }')).matchAll(/case '([a-z]+)':/g)].map((m) => m[1]);
  if (vues.length < 10) throw new Error(`refus : ${vues.length} sous-vues relevées — l’aiguillage a changé de forme`);
  return vues;
}

function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function duSas(noms) {
  const bac = { console };
  bac.window = bac;
  vm.createContext(bac);
  poserOutils(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'icons.js'), 'utf8'), bac, { filename: 'icons.js' });
  const sortie = {};
  for (const nom of noms) {
    if (bac.window[nom] === undefined) {
      console.error(`refus : public/app/icons.js ne pose pas \`${nom}\`.`);
      process.exit(2);
    }
    sortie[nom] = bac.window[nom];
  }
  return sortie;
}
const { icon, moduleIcon, PRIO_COLORS } = duSas(['icon', 'moduleIcon', 'PRIO_COLORS']);
const tr = (fr) => fr;
const searchInputHtml = (ph) => `<!--recherche:${oasisEsc(ph)}-->`;
const exportBar = (coll, titre, pdf) => `<!--export:${coll}:${oasisEsc(titre)}:${pdf || ''}-->`;

function libelles() {
  const src = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'traductions.fr.ts'), 'utf8');
  const table = {};
  for (const m of src.matchAll(/^ {4}([a-z0-9_]+): (['"`])((?:\\.|(?!\2).)*)\2,?$/gm)) {
    table[m[1]] = m[3].replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');
  }
  if (Object.keys(table).length < 200) throw new Error('table de libellés trop courte');
  return table;
}

/**
 * Un document minimal, et un relevé des écouteurs.
 *
 * `renderConfig` écrit `#mainView` puis parcourt `[data-module-toggle]`. Le
 * second geste n'a de sens que si le balisage vient d'être rendu : le faux
 * document relit donc **le balisage écrit** pour en tirer les interrupteurs, au
 * lieu d'une liste inventée. Un rendu qui n'en produirait aucun donnerait zéro
 * écouteur des deux côtés, et le garde du bas refuse ce vide.
 */
function documentMinimal(capture, sansVue) {
  const vue = { set innerHTML(v) { capture.html = v; }, get innerHTML() { return capture.html; } };
  const modal = { set innerHTML(v) { capture.modal = v; }, get innerHTML() { return capture.modal; } };
  return {
    getElementById: (id) => {
      if (id === 'mainView') return sansVue ? null : vue;
      if (id === 'cfgModalRoot') return modal;
      return null;
    },
    documentElement: { setAttribute: () => {}, getAttribute: () => null },
    body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel !== '[data-module-toggle]') return [];
      const codes = [...String(capture.html).matchAll(/data-module-toggle="([^"]*)"/g)].map((m) => m[1]);
      return codes.map((code, i) => ({
        dataset: { moduleToggle: code },
        checked: /checked/.test(String(capture.html).split(`data-module-toggle="${code}"`)[1] || ''),
        addEventListener: (evt, f) => capture.ecouteurs.push({ rang: i, code, evt, f }),
      }));
    },
  };
}

function bacCommun(capture, refs, me, cfg, modules, tab, sansVue) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, icon, moduleIcon, PRIO_COLORS, tr,
    searchInputHtml, exportBar, CURRENT_LANG: 'fr',
    REFS: refs, ME: me, CURRENT_CFG: null, CFG_SUB: 'organisation', CFG_COLLAPSED: false,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    // ── Les deux chemins du bandeau mènent au même endroit, et c'est mesuré là ──
    //
    // L'original appelle `showToast` d'`app.js` ; le module importe celui du socle.
    // **Les deux sont le même code** — `if (typeof window.oasisToast !== 'function')`
    // puis la délégation —, et c'est donc `oasisToast` qu'il faut capter : capter
    // `showToast` seul mesurait le chemin et non le message, et rendait deux écarts
    // qui ne disaient rien du code.
    oasisToast: (m, g, d) => capture.bandeaux.push(`${g}:${m}:${d}`),
    showToast: (m, g = 'success', d = 4000) => {
      if (typeof bac.window.oasisToast !== 'function') return null;
      return bac.window.oasisToast(m, g, d);
    },
    oasisMessageErreur: () => 'erreur',
    oasisConfirmer: async () => true,
    localStorage: { getItem: () => null, setItem: () => {} },
    portailReinitialiserRecherche: () => { capture.recherches += 1; },
    document: documentMinimal(capture, sansVue),
  };
  bac.window = bac;
  // Les deux routes que `renderConfig` lit, et rien d'autre. Un appel inattendu
  // est relevé : c'est ce qui dirait qu'un des deux côtés parle au serveur quand
  // l'autre se taît.
  const transport = async (chemin, options) => {
    capture.appels.push({ chemin, methode: (options || {}).method || 'GET', corps: (options || {}).body ?? null });
    if (chemin === '/api/config') return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(cfg)) };
    if (chemin === '/api/modules') return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(modules)) };
    // La sous-vue « Instances » charge la liste des instances avant de rendre :
    // sans une vraie liste, elle lèverait des deux côtés et la comparaison
    // n'aurait mesuré qu'une levée.
    if (chemin === '/api/instances') {
      return {
        ok: true,
        status: 200,
        json: async () => [
          { code: 'BJ', etat: 'Bénin', aac: 'ANAC', portee: 'nationale', sommeil: false },
          { code: 'TG', etat: 'Togo', aac: '', portee: 'nationale', sommeil: true },
        ],
      };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = () => ({ html: '', modal: '', ecouteurs: [], appels: [], bandeaux: [], recherches: 0, loadRefs: 0 });

/** Les sas des six blocs convertis : les onze sous-vues viennent de là, des deux côtés. */
// `i18n.js` n'y est pas : à son chargement il applique une palette au document,
// ce qu'un faux document ne porte pas — et il n'apporte rien ici. Les libellés
// viennent du bac pour l'original, de `traductions.ts` pour le module : la même
// table, lue de deux côtés.
const SAS = ['icons.js', 'etat.js', 'schemas.js', 'referentiels.js', 'exigences.js',
  'organigramme.js', 'taxinomie.js', 'parametres.js', 'portail-instances.js'];

// ── Les aides du portail viennent du module construit (5.e.4) ──
//
// `fmtDate`, `reglesMotDePasse`, `escArg`, `loadRefs` et les deux fonctions du
// téléphone étaient **fabriqués ici**. C'était juste tant qu'ils vivaient dans
// `app.js` et que les deux côtés les lisaient sur `window`.
//
// Depuis 5.e.4 ils vivent dans `outils.ts` et `telephone.ts`, et les modules
// convertis les **importent**. Les fabriquer ici opposerait le vrai calcul d'un
// côté à un faux de l'autre — la mesure de mon montage, pour la cinquième fois
// (5.d.3, 5.d.4, 5.d.6, 5.e.0, ici). Les deux bacs chargent le même
// `public/app/outils.js`.
function poserOutils(bac) {
  const chemin = path.join(RACINE, 'public', 'app', 'outils.js');
  if (!fs.existsSync(chemin)) {
    console.error('refus : public/app/outils.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  vm.runInContext(fs.readFileSync(chemin, 'utf8'), bac, { filename: 'outils.js' });
}

function charger(cote, refs, me, cfg, modules, tab, sousVue, replie, sansVue) {
  const capture = neuf();
  const bac = bacCommun(capture, refs, me, cfg, modules, tab, sansVue);
  vm.createContext(bac);
  poserOutils(bac);
  for (const f of SAS) {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', f), 'utf8'), bac, { filename: f });
  }
  // `etat.js` repose l'état : on le refixe **après** les sas, comme le fait la
  // page — `app.js` s'exécute après eux et `CFG_SUB` vient de la navigation.
  bac.window.CFG_SUB = sousVue;
  bac.window.CFG_COLLAPSED = replie;
  bac.window.REFS = refs;
  bac.window.ME = me;
  if (cote === 'origine') {
    vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  } else {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'configuration.js'), 'utf8'),
      bac, { filename: 'configuration.js' });
  }
  return { bac, capture };
}

let comparaisons = 0;
const ecarts = [];
const lisible = (s) => String(s).replace(/[A-Za-z0-9+/=]{200,}/g, (m) => `[image de ${m.length} caractères]`);

function pareil(quoi, a, b) {
  comparaisons += 1;
  if (a === b) return;
  const i = [...String(a)].findIndex((c, k) => c !== String(b)[k]);
  ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine  : …${lisible(String(a).slice(Math.max(0, i - 40), i + 60))}…\n      nouvelle : …${lisible(String(b).slice(Math.max(0, i - 40), i + 60))}…`);
}

const copie = (o) => JSON.parse(JSON.stringify(o));

/**
 * Rend, et **capte la levée** au lieu de l'laisser interrompre la mesure.
 *
 * Deux chemins lèvent de part et d'autre — la sous-vue « Instances » au poste
 * national, qui n'en charge pas la liste, et une vue principale absente. Les
 * laisser remonter aurait arrêté la comparaison à la première ; les comparer dit
 * que les deux versions échouent **de la même façon**, ce qui est le propre de
 * cette conversion.
 */
async function rendre(cote, donnees, sousVue, replie, sansVue) {
  const { bac, capture } = charger(cote, copie(donnees.refs), copie(donnees.me),
    donnees.cfg, donnees.modules, donnees.tab, sousVue, replie, sansVue);
  let erreur = null;
  try { await bac.window.renderConfig(); } catch (e) { erreur = e; }
  return { bac, capture, erreur };
}

async function comparerSousVue(nom, donnees, sousVue, replie) {
  const o = await rendre('origine', donnees, sousVue, replie);
  const n = await rendre('nouvelle', donnees, sousVue, replie);
  // Lever ou ne pas lever est la première chose à comparer : si l'un des deux
  // seulement échoue, tout le reste n'aurait comparé que du vide.
  pareil(`${nom} · ${sousVue} · une levée ?`, !!o.erreur, !!n.erreur);
  pareil(`${nom} · ${sousVue}${replie ? ' (replié)' : ''} · #mainView`, o.capture.html, n.capture.html);
  // L'aiguillage peut réécrire `CFG_SUB` — `case 'themes'` le fait.
  pareil(`${nom} · ${sousVue} · CFG_SUB après le rendu`, o.bac.window.CFG_SUB, n.bac.window.CFG_SUB);
  // `CURRENT_CFG` est posé par le rendu, et `openRefModal` y lit le sigle.
  pareil(`${nom} · ${sousVue} · CURRENT_CFG posé`,
    JSON.stringify(o.bac.window.CURRENT_CFG) === JSON.stringify(donnees.cfg),
    JSON.stringify(n.bac.window.CURRENT_CFG) === JSON.stringify(donnees.cfg));
  // Les deux routes lues, dans l'ordre.
  pareil(`${nom} · ${sousVue} · routes lues`,
    JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
  // Et les écouteurs branchés après le rendu.
  pareil(`${nom} · ${sousVue} · interrupteurs branchés`,
    JSON.stringify(o.capture.ecouteurs.map((e) => [e.rang, e.code, e.evt])),
    JSON.stringify(n.capture.ecouteurs.map((e) => [e.rang, e.code, e.evt])));
  return { o, n };
}

async function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'oasis.config.json'), 'utf8'));
  const roadmap = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'modules.json'), 'utf8'));
  const modules = roadmap.map((m) => ({ ...m, installed: true, enabled: !!(cfg.modules || {})[m.code] }));
  const tab = libelles();
  const texteOrigine = sourceOrigine();
  const sousVues = sousVuesOrigine(texteOrigine);

  console.log('\n═══ Le cycle de rendu de la configuration, avant et après ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/configuration.js');
  console.log(`  ${sousVues.length} sous-vues relevées dans l’aiguillage d’origine : ${sousVues.join(', ')}\n`);

  const regional = { user: { role: 'SUPERADMIN', username: 'a' }, instance_vue: { disponible: true, instances: ['BJ', 'TG'] } };
  const national = { user: { role: 'ADMIN', username: 'b' }, instance_vue: {} };

  // ── Chaque sous-vue de l'aiguillage, au poste régional et au poste national ──
  //
  // Le compte est gardé plus bas : autant de régimes que de `case`, plus le
  // `default` et une sous-vue inconnue.
  const vues = [...sousVues, 'default-inconnue'];
  for (const v of vues) {
    const sousVue = v === 'default-inconnue' ? 'vue-qui-nexiste-pas' : v;
    /* eslint-disable no-await-in-loop */
    await comparerSousVue('régional', { refs, me: regional, cfg, modules, tab }, sousVue, false);
    await comparerSousVue('national', { refs, me: national, cfg, modules, tab }, sousVue, false);
    /* eslint-enable no-await-in-loop */
  }

  // ── Le repli de la barre : une classe et un chevron ──
  await comparerSousVue('régional, replié', { refs, me: regional, cfg, modules, tab }, 'securite', true);
  await comparerSousVue('national, replié', { refs, me: national, cfg, modules, tab }, 'modules', true);

  // ── Les référentiels absents : le rendu doit les charger ──
  //
  // `if (!Object.keys(REFS).length) await loadRefs()`. Le relevé des appels à
  // `loadRefs` est ce qui le dit ; sans lui, un rendu qui ne chargerait rien
  // donnerait un écran vide que personne ne verrait ici.
  {
    const o = await rendre('origine', { refs: {}, me: regional, cfg, modules, tab }, 'organisation', false);
    const n = await rendre('nouvelle', { refs: {}, me: regional, cfg, modules, tab }, 'organisation', false);
    // ── Le compteur a cédé la place à la route (5.e.4) ──
    //
    // `loadRefs` était un faux dans le bac et comptait ses appels. Il vient
    // maintenant du module construit, des deux côtés : ce qui se compare est donc
    // la **route lue**, que le transport relève déjà. C'est plus proche de ce que
    // la page fait, et cela ne dépend plus d'un compteur à moi.
    const demandeRefs = (c) => c.appels.filter((a) => a.chemin === '/api/referentiels').length;
    pareil('référentiels absents · /api/referentiels demandé', demandeRefs(o.capture), demandeRefs(n.capture));
    pareil('référentiels absents · #mainView', o.capture.html, n.capture.html);
    if (demandeRefs(o.capture) !== 1) {
      ecarts.push('garde : l’origine ne demande plus `/api/referentiels` quand ils manquent — le régime ne prouve plus rien');
    }
    comparaisons += 1;
  }

  // ── Les deux gestes de navigation ──
  {
    const o = await rendre('origine', { refs, me: regional, cfg, modules, tab }, 'securite', false);
    const n = await rendre('nouvelle', { refs, me: regional, cfg, modules, tab }, 'securite', false);
    for (const cote of [o, n]) {
      cote.capture.html = '';
      // eslint-disable-next-line no-await-in-loop
      cote.bac.window.cfgNavigate('modules');
    }
    // Le rendu que `cfgNavigate` déclenche est asynchrone : on attend les deux.
    await new Promise((r) => setTimeout(r, 0));
    pareil('cfgNavigate(modules) · CFG_SUB', o.bac.window.CFG_SUB, n.bac.window.CFG_SUB);
    pareil('cfgNavigate(modules) · recherche réinitialisée', o.capture.recherches, n.capture.recherches);
    pareil('cfgNavigate(modules) · #mainView', o.capture.html, n.capture.html);
    // ── Deux fois, et c'est un contre-essai qui me l'a dit ──
    //
    // Une seule bascule partant de « déplié » ne distingue pas `!CFG_COLLAPSED`
    // d'un `= true` : les deux rendent `true`. Le contre-essai était vert, et ce
    // vert disait que le régime manquait, non que le code était bon. On bascule
    // donc deux fois, en comparant à chaque coup — l'aller **et** le retour.
    for (const coup of [1, 2]) {
      for (const cote of [o, n]) {
        cote.capture.html = '';
        cote.bac.window.toggleCfgSidebar();
      }
      /* eslint-disable no-await-in-loop */
      await new Promise((r) => setTimeout(r, 0));
      /* eslint-enable no-await-in-loop */
      pareil(`toggleCfgSidebar (coup ${coup}) · état du repli`, o.bac.window.CFG_COLLAPSED, n.bac.window.CFG_COLLAPSED);
      pareil(`toggleCfgSidebar (coup ${coup}) · #mainView`, o.capture.html, n.capture.html);
    }
  }

  // ── L'interrupteur d'un module : le seul geste de cet écran qui écrit ──
  {
    const o = await rendre('origine', { refs, me: regional, cfg, modules, tab }, 'modules', false);
    const n = await rendre('nouvelle', { refs, me: regional, cfg, modules, tab }, 'modules', false);
    if (!o.capture.ecouteurs.length) {
      ecarts.push('garde : aucun interrupteur de module dans le rendu d’origine — le geste qui écrit n’est éprouvé nulle part');
    }
    comparaisons += 1;
    for (const rang of [0, o.capture.ecouteurs.length - 1]) {
      const bascule = async (cote) => {
        cote.capture.appels.length = 0;
        cote.capture.bandeaux.length = 0;
        const e = cote.capture.ecouteurs[rang];
        if (!e) return '(aucun)';
        await e.f();
        return JSON.stringify({ appels: cote.capture.appels, bandeaux: cote.capture.bandeaux });
      };
      /* eslint-disable no-await-in-loop */
      pareil(`interrupteur n° ${rang} · ce qui partirait`, await bascule(o), await bascule(n));
      /* eslint-enable no-await-in-loop */
    }
  }

  // ── La vue principale absente : les deux doivent lever ──
  //
  // L'original écrit `document.getElementById('mainView').innerHTML = …` sans
  // précaution. Le module lève avec un message qui nomme la cause — même choix
  // qu'en 5.d.1 et 5.d.5. Ce qui est asserté, c'est que **les deux** lèvent : un
  // repli silencieux laisserait l'écran vide sans rien dire, et c'est le mode de
  // défaillance que tout ce jalon cherche à éviter.
  {
    const o = await rendre('origine', { refs, me: regional, cfg, modules, tab }, 'securite', false, true);
    const n = await rendre('nouvelle', { refs, me: regional, cfg, modules, tab }, 'securite', false, true);
    pareil('vue principale absente · une levée des deux côtés', !!o.erreur, !!n.erreur);
    comparaisons += 1;
    if (!o.erreur) {
      ecarts.push('garde : l’origine ne lève plus quand « mainView » manque — le terme de comparaison a changé');
    }
  }

  // ── Le garde : autant de régimes que de sous-vues ──
  //
  // Une sous-vue retirée des régimes serait une sous-vue dont la **place** n'est
  // plus prouvée : son balisage resterait juste, et l'aiguillage pourrait l'avoir
  // mise ailleurs. Le compte est donc relevé dans l'original, non décidé ici.
  comparaisons += 1;
  if (vues.length !== sousVues.length + 1) {
    ecarts.push(`garde : ${vues.length - 1} régimes pour ${sousVues.length} sous-vues de l’aiguillage`);
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  l’aiguillage, la barre latérale, le repli, les deux gestes de navigation,');
  console.log('  et l’interrupteur d’un module — le seul geste de cet écran qui écrive.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
