#!/usr/bin/env node
/**
 * OASIS — Les paramètres de l'instance, avant et après la conversion.
 *
 * ADR-003, 5.d.5. Sixième et dernière pièce avant `renderConfig` : l'identité de
 * l'Administration, les règles de sécurité, l'activation des modules et le bloc
 * système.
 *
 * ── Ce qui se compare, et ce qui ne se compare pas ──
 *
 * Cinq fonctions rendent des chaînes : `cfgSectionAAC`, `cameraIcon`,
 * `cfgSectionSecurite`, `cfgSectionModules`, `cfgSectionSysteme`. Elles se
 * comparent caractère pour caractère.
 *
 * `openAacEdit` écrit un `innerHTML` : un document minimal le capture, et la
 * comparaison porte sur le balisage de la fenêtre. C'est **la** comparaison qui
 * importe ici, parce qu'elle est la seule à éprouver `AAC_CFG` — l'unique état
 * partagé du bloc, posé par `cfgSectionAAC` et relu par `openAacEdit`. L'original
 * le tient dans une globale lexicale, le module dans une variable privée : deux
 * chemins, le même balisage, ou l'écart se voit.
 *
 * `saveAAC`, `saveSecurite` et `saveSysteme` écrivent dans la configuration de
 * l'instance — ce sont les actes de ce bloc. Un faux document leur rend des
 * champs, un faux transport capte l'appel, et la comparaison porte sur **le
 * corps envoyé** : méthode, chemin, et le JSON caractère pour caractère.
 *
 * Deux différences connues, et non comparées : l'original appelle `api()`
 * d'`app.js`, le module un `fetch` nu — l'en-tête anti-CSRF est posé par
 * l'enveloppe du socle sur tout appel, et le retour à la connexion sur 401 est
 * `sessionPerdue` (décision de 5.d.1). On compare donc méthode, chemin et corps,
 * non les en-têtes.
 *
 * `uploadAacLogo` (un `FileReader`) et `removeAacLogo` (une confirmation) restent
 * couverts par la suite « parcours » — 5.c.10 pose un logo, le retire, et refuse
 * un fichier trop lourd.
 */

/* ── Pièce d'archive (ADR-003, 5.e.5) ─────────────────────────────────────────
 *
 * **Ce comparateur ne tourne plus.** Il opposait la version d'origine, lue dans
 * `git`, au module converti — et la version d'origine cherche ses dépendances
 * dans la **portée globale**. Le 13 octobre 2026, la maîtrise d'ouvrage a fait
 * des douze comparateurs des pièces d'archive ; les sas du portail ont cessé de
 * publier les soixante-trois noms que plus rien d'autre ne lisait, et le banc
 * sur lequel l'original tournait n'existe plus.
 *
 * **Dernier passage vert : commit `8b2452e`, le 13 octobre 2026 —
 * 142 comparaisons, aucune différence**, avec les onze autres (5169 au total).
 *
 * Il reste au dépôt parce que *la trace d'une conversion se lit* : l'en-tête qui
 * suit nomme chaque régime comparé, chaque contre-essai et chaque divergence
 * assumée. C'est ce que remplacer un contrôle par un récit coûte, et il faut que
 * le récit soit là.
 *
 * Ce qui prend le relais : la suite « parcours » pour le balisage exercé dans un
 * navigateur, et les deux contrôles de surface de `tests/smoke/frontend.smoke.js`
 * — le relevé figé (`surface-portail.json`) et le refus d'un nom publié sans
 * lecteur.
 *
 * Pour le rejouer, se placer sur le commit où il était vert :
 *
 *     git worktree add /tmp/oasis-parametres 8b2452e
 *     cd /tmp/oasis-parametres && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-parametres.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 142 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_PARAM_ORIGINE || '0429d39';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'parametres.js'))) {
    console.error('refus : public/app/parametres.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_PARAM_ORIGINE=<sha>.');
    process.exit(2);
  }
}

// Extraites **par leur nom** : les douze fonctions du bloc ne sont pas
// contiguës dans l'original, et découper entre deux bornes de texte en prendrait
// une partie en croyant toutes les prendre (la leçon de 5.d.1).
const FONCTIONS = [
  'cfgSectionAAC', 'cameraIcon', 'openAacEdit', 'saveAAC',
  'cfgSectionSecurite', 'saveSecurite', 'cfgSectionModules',
  'cfgSectionSysteme', 'saveSysteme',
];

function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
      || l.startsWith(`async function ${nom}(`)
      || l.startsWith(`window.${nom} = function`)
      || l.startsWith(`window.${nom} = async function`));
    if (debut < 0) throw new Error(`refus : « ${nom} » est introuvable dans la version d’origine`);
    let fin = -1;
    for (let i = debut + 1; i < lignes.length; i += 1) {
      if (lignes[i] === '}' || lignes[i] === '};') { fin = i; break; }
    }
    if (fin < 0) throw new Error(`refus : la fin de « ${nom} » est introuvable`);
    morceaux.push(lignes.slice(debut, fin + 1).join('\n'));
  }
  // `let AAC_CFG = null` est repris tel quel : c'est une globale **lexicale** de
  // l'original, et les fonctions extraites la partagent par leur portée. Sans
  // cette ligne, `AAC_CFG = cfg` créerait une propriété du bac et `openAacEdit`
  // appelé en premier lèverait une `ReferenceError` au lieu de la `TypeError`
  // que l'original lève — on comparerait deux défaillances différentes.
  return `let AAC_CFG = null;\n${morceaux.join('\n\n')}\n;Object.assign(window, { ${FONCTIONS.join(', ')} });`;
}

function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Les vraies icônes, des deux côtés ──
//
// La leçon de 5.d.3 : une fausse icône d'un seul côté a rendu 629 écarts, qui
// mesuraient le montage et non le code. Les deux bacs chargent donc le même
// `public/app/icons.js`, et `moduleIcon` en vient aussi — `cfgSectionModules`
// l'appelle pour chacune des onze cartes.
// `PRIO_COLORS` vient du même endroit, et pour la même raison : la palette était
// un `const` lexical d'`app.js`, elle est montée dans `icones.ts` en 5.d.5, et
// l'original la lit en identifiant nu. Si le bac la fabriquait, la comparaison
// mesurerait la copie — cinq teintes recopiées à la main sont cinq occasions de
// mesurer son propre montage.
function duSas(noms) {
  const bac = { console };
  bac.window = bac;
  vm.createContext(bac);
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
// ── `tr`, `searchInputHtml` et `exportBar` viennent du module construit (5.e.0) ──
//
// Ils étaient **fabriqués ici** : `tr` en identité, les deux autres en marqueurs
// de commentaire. C'était juste tant qu'ils vivaient dans `app.js` et que les
// deux côtés les lisaient sur `window`.
//
// Depuis 5.e.0 ils vivent dans `libelles.ts` et `barre.ts`, et le module converti
// les **importe**. Les fabriquer ici ferait donc comparer le vrai balisage d'un
// côté à un marqueur de l'autre — la mesure de mon montage, non du code (la
// leçon des 629 écarts de 5.d.3). Les deux bacs chargent le même
// `public/app/barre.js`.
function poserBarre(bac) {
  const chemin = path.join(RACINE, 'public', 'app', 'barre.js');
  if (!fs.existsSync(chemin)) {
    console.error('refus : public/app/barre.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  vm.runInContext(fs.readFileSync(chemin, 'utf8'), bac, { filename: 'barre.js' });
}

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
 * Un document minimal : les six fonctions n'en veulent que deux choses — écrire
 * un `innerHTML` dans `cfgModalRoot`, et relire la valeur d'un champ par son id.
 */
function documentMinimal(capture, champs) {
  const racine = { set innerHTML(v) { capture.html = v; }, get innerHTML() { return capture.html; } };
  return {
    getElementById: (id) => {
      if (id === 'cfgModalRoot') return racine;
      if (Object.prototype.hasOwnProperty.call(champs, id)) {
        const v = champs[id];
        return typeof v === 'boolean' ? { checked: v } : { value: v };
      }
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

/** Le bac commun aux deux côtés : même document, même capture, mêmes libellés. */
function bacCommun(capture, champs, tab, lang) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, icon, moduleIcon, PRIO_COLORS,
    CURRENT_LANG: lang,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    showToast: () => {},
    loadMe: async () => {},
    renderConfig: async () => {},
    closeRefModal: () => {},
    oasisConfirmer: async () => true,
    oasisMessageErreur: () => 'erreur',
    localStorage: { getItem: () => null, setItem: () => {} },
    document: documentMinimal(capture, champs),
  };
  bac.window = bac;
  return bac;
}

/** Le transport capté : l'appel part, rien ne sort du processus. */
function transport(capture) {
  return async (chemin, options) => {
    capture.appels.push({
      chemin,
      methode: (options || {}).method || 'GET',
      corps: (options || {}).body === undefined ? null : String((options || {}).body),
    });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
}

function chargerOrigine(champs, tab, lang) {
  const capture = { html: '', appels: [] };
  const bac = bacCommun(capture, champs, tab, lang);
  // L'original appelle `api()` d'`app.js` ; le module un `fetch` nu. Le même
  // transport est donné aux deux, sous le nom que chacun emploie.
  bac.api = transport(capture);
  bac.fetch = transport(capture);
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  return facade(bac, capture);
}

function chargerNouvelle(champs, tab, lang) {
  const capture = { html: '', appels: [] };
  const bac = bacCommun(capture, champs, tab, lang);
  bac.api = transport(capture);
  bac.fetch = transport(capture);
  vm.createContext(bac);
  poserBarre(bac);
  // Le module des référentiels d'abord : `closeRefModal` lui appartient, et
  // c'est lui que la fenêtre de l'Administration referme.
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'), bac, { filename: 'referentiels.js' });
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'parametres.js'), 'utf8'), bac, { filename: 'parametres.js' });
  return facade(bac, capture);
}

function facade(bac, capture) {
  const w = bac.window;
  return {
    aac: (cfg) => w.cfgSectionAAC(cfg),
    camera: () => w.cameraIcon(),
    securite: (cfg) => w.cfgSectionSecurite(cfg),
    modules: (liste) => w.cfgSectionModules(liste),
    // Le tri porte sur une **copie** dans l'original, et le balisage ne peut pas
    // le dire : chaque côté reçoit déjà sa propre copie, et trier la sienne en
    // place rend le même balisage. On rend donc la liste **après** l'appel, et
    // c'est elle qui porte la preuve. Sans cela, retirer `.slice()` serait un
    // contre-essai vert — la forme de vide que 5.d.3 a payée trois fois.
    modulesApres: (liste) => { w.cfgSectionModules(liste); return JSON.stringify(liste.map((m) => m.code)); },
    systeme: (cfg) => w.cfgSectionSysteme(cfg),
    fenetre: (cfg) => {
      capture.html = '';
      // L'écran d'abord : c'est lui qui pose `AAC_CFG`. L'ordre est le seul
      // chemin par lequel la fenêtre apprend ce qu'elle doit montrer.
      if (cfg) w.cfgSectionAAC(cfg);
      w.openAacEdit();
      return capture.html;
    },
    envoi: async (geste) => {
      capture.appels.length = 0;
      await w[geste]();
      return JSON.stringify(capture.appels, null, 1);
    },
  };
}

let comparaisons = 0;
const ecarts = [];

// Le logo de l'Administration est une image en base64 de 374 498 caractères : un
// diagnostic qui la recopie est illisible, et c'est arrivé. On la remplace par sa
// mesure dans l'extrait, sans rien changer à la comparaison elle-même.
const lisible = (s) => String(s).replace(/[A-Za-z0-9+/=]{200,}/g, (m) => `[image de ${m.length} caractères]`);

function pareil(quoi, a, b) {
  comparaisons += 1;
  if (a === b) return;
  const i = [...String(a)].findIndex((c, k) => c !== String(b)[k]);
  ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine  : …${lisible(String(a).slice(Math.max(0, i - 40), i + 60))}…\n      nouvelle : …${lisible(String(b).slice(Math.max(0, i - 40), i + 60))}…`);
}

/** Rend l'erreur levée, ou `null` si l'appel a abouti. */
function echoue(f) {
  try { f(); return null; } catch (e) { return e; }
}

const copie = (o) => JSON.parse(JSON.stringify(o));

function comparerRegime(nom, { cfg, modules, lang = 'fr', champs = {} }, tab) {
  const o = chargerOrigine(champs, tab, lang);
  const n = chargerNouvelle(champs, tab, lang);
  if (cfg) {
    pareil(`${nom} · cfgSectionAAC()`, o.aac(copie(cfg)), n.aac(copie(cfg)));
    pareil(`${nom} · cfgSectionSecurite()`, o.securite(copie(cfg)), n.securite(copie(cfg)));
    pareil(`${nom} · cfgSectionSysteme()`, o.systeme(copie(cfg)), n.systeme(copie(cfg)));
    pareil(`${nom} · openAacEdit()`, o.fenetre(copie(cfg)), n.fenetre(copie(cfg)));
  }
  if (modules) {
    pareil(`${nom} · cfgSectionModules()`, o.modules(copie(modules)), n.modules(copie(modules)));
    pareil(`${nom} · la liste reçue, après l’appel`, o.modulesApres(copie(modules)), n.modulesApres(copie(modules)));
  }
  pareil(`${nom} · cameraIcon()`, o.camera(), n.camera());
}

async function comparerEnvois(nom, champs, tab) {
  const o = chargerOrigine(champs, tab, 'fr');
  const n = chargerNouvelle(champs, tab, 'fr');
  for (const geste of ['saveAAC', 'saveSecurite', 'saveSysteme']) {
    // eslint-disable-next-line no-await-in-loop
    pareil(`${nom} · ${geste}() — ce qui partirait`, await o.envoi(geste), await n.envoi(geste));
  }
}

async function principal() {
  const cfgReel = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'oasis.config.json'), 'utf8'));
  const roadmap = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'modules.json'), 'utf8'));
  const tab = libelles();
  // Le catalogue tel que `/api/modules` le rend : la feuille de route enrichie
  // de l'état d'activation (`src/module_loader.js`, `catalogue`).
  const catalogue = roadmap.map((m) => ({ ...m, installed: true, enabled: !!(cfgReel.modules || {})[m.code] }));

  console.log('\n═══ Les paramètres de l’instance, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/parametres.js\n');

  comparerRegime('réel', { cfg: cfgReel, modules: catalogue }, tab);

  // ── Les trois langues ──
  //
  // `cfgSectionModules` lit `m.name[CURRENT_LANG]`, et la fenêtre de
  // l'Administration marque l'option de la langue par défaut.
  comparerRegime('en', { cfg: cfgReel, modules: catalogue, lang: 'en' }, tab);
  comparerRegime('pt', { cfg: cfgReel, modules: catalogue, lang: 'pt' }, tab);
  // Une langue que le catalogue ne porte pas : `m.name['de']` est absent, et le
  // repli sur le français est ce qui doit se lire.
  comparerRegime('de (langue absente du catalogue)', { cfg: cfgReel, modules: catalogue, lang: 'de' }, tab);

  // ── La langue par défaut de l'instance ──
  for (const l of ['en', 'pt']) {
    comparerRegime(`defaultLang=${l}`,
      { cfg: { ...cfgReel, instance: { ...cfgReel.instance, defaultLang: l } }, modules: catalogue }, tab);
  }
  // Une langue par défaut hors des trois : `langLabel` retombe sur le code brut,
  // et aucune option n'est marquée dans la fenêtre.
  comparerRegime('defaultLang=de',
    { cfg: { ...cfgReel, instance: { ...cfgReel.instance, defaultLang: 'de' } }, modules: catalogue }, tab);

  // ── L'Administration vide, et l'Administration hostile ──
  //
  // Vide : les neuf tirets, le cadre « aucun logo », le titre de repli, et les
  // deux pastilles absentes. C'est l'état d'une instance qu'on vient d'installer.
  comparerRegime('aac vide', { cfg: { ...cfgReel, aac: {} } }, tab);
  comparerRegime('aac absente', { cfg: { ...cfgReel, aac: undefined } }, tab);
  // Hostile : les cinq caractères que l'échappement doit prendre, dans chaque
  // champ. Un `esc` oublié se lit ici, et nulle part ailleurs.
  const hostile = '<b>"L\'étau" & co</b>';
  comparerRegime('aac hostile', {
    cfg: {
      ...cfgReel,
      aac: {
        nom: hostile, sigle: hostile, bigramme: hostile, etat: hostile, ville: hostile,
        adresse1: hostile, adresse2: hostile, emailAdmin: hostile, logo: `javascript:${hostile}`,
      },
    },
  }, tab);
  // Sans logo : le cadre vide et **l'absence du bouton de retrait**.
  comparerRegime('sans logo', { cfg: { ...cfgReel, aac: { ...cfgReel.aac, logo: '' } } }, tab);

  // ── Les sept réglages de sécurité ──
  //
  // Les trois interrupteurs d'abord, dans les quatre combinaisons qui comptent :
  // tout à vrai, tout à faux, et les deux mélanges — faute de quoi échanger
  // `singleSession` et `forceChangeOnFirstLogin` ne se verrait pas.
  const secu = (p) => ({ cfg: { ...cfgReel, security: { ...cfgReel.security, ...p } } });
  comparerRegime('sécurité, tout actif', secu({ singleSession: true, forceChangeOnFirstLogin: true, mfaEnabled: true }), tab);
  comparerRegime('sécurité, tout inactif', secu({ singleSession: false, forceChangeOnFirstLogin: false, mfaEnabled: false }), tab);
  comparerRegime('sécurité, session unique seule', secu({ singleSession: true, forceChangeOnFirstLogin: false, mfaEnabled: false }), tab);
  comparerRegime('sécurité, MFA seul', secu({ singleSession: false, forceChangeOnFirstLogin: false, mfaEnabled: true }), tab);
  // Et les quatre nombres, échangés deux à deux : les `value` des quatre champs
  // sont dans le même ordre dans le balisage, et une permutation s'y lit.
  comparerRegime('sécurité, quatre nombres distincts', secu({
    passwordMinLength: 14, passwordMaxAgeDays: 90, maxFailedAttempts: 3, sessionTimeoutMinutes: 45,
  }), tab);

  // ── Les modules ──
  //
  // Renversés : `cfgSectionModules` trie sur une **copie** (`.slice().sort()`),
  // et sans un jeu désordonné le tri ne prouve rien — la leçon de 5.d.0.
  comparerRegime('modules renversés', { modules: catalogue.slice().reverse() }, tab);
  comparerRegime('modules tous actifs', { modules: catalogue.map((m) => ({ ...m, enabled: true })) }, tab);
  comparerRegime('modules tous inactifs', { modules: catalogue.map((m) => ({ ...m, enabled: false })) }, tab);
  comparerRegime('aucun module', { modules: [] }, tab);
  // Une priorité hors de la palette : `PRIO_COLORS[9]` est absent, et l'original
  // écrit `color:undefined` dans l'attribut de style. La conversion le reprend.
  comparerRegime('module de priorité 9', {
    modules: [{ ...catalogue[0], priority: 9, code: 'ZZZ', tdr: '<b>Z.9</b>', name: { fr: 'Module & <i>fabriqué</i>' } }],
  }, tab);

  // ── Le bloc système ──
  const hostileUrl = 'https://central/"><b>&';
  comparerRegime('système, réplication active', {
    cfg: { ...cfgReel, replication: { ...cfgReel.replication, enabled: true, centralUrl: hostileUrl } },
  }, tab);
  comparerRegime('système, note et pilote hostiles', {
    cfg: {
      ...cfgReel,
      database: {
        ...cfgReel.database, note: hostile, driver: hostile,
        postgres: { ...cfgReel.database.postgres, host: hostile, database: hostile, port: 65535 },
      },
    },
  }, tab);

  // ── Ce qui partirait au serveur ──
  //
  // Les trois gestes d'enregistrement, avec des champs qui ne se ressemblent pas :
  // une permutation de deux `getElementById` se lit dans le corps envoyé.
  await comparerEnvois('envoi, champs distincts', {
    aacNom: '  Agence & <b>Nationale</b>  ', aacSigle: ' ANAC ', aacEtat: 'Bénin', aacBigramme: 'BJ',
    aacVille: 'Cotonou', aacAdresse1: 'Route de l\'aéroport', aacAdresse2: 'BP 305',
    aacEmail: ' info@anac.bj ', aacLang: 'pt',
    secMinLen: '14', secMaxAge: '90', secMaxFail: '3', secTimeout: '45',
    secSingle: true, secForce: false, secMfa: true,
    repEnabled: true, repUrl: '  https://central.ursac.uemoa.int/api/replication  ',
  }, tab);
  await comparerEnvois('envoi, interrupteurs inversés', {
    aacNom: '', aacSigle: '', aacEtat: '', aacBigramme: '', aacVille: '', aacAdresse1: '',
    aacAdresse2: '', aacEmail: '', aacLang: 'fr',
    secMinLen: '0', secMaxAge: '', secMaxFail: 'abc', secTimeout: '-1',
    secSingle: false, secForce: true, secMfa: false,
    repEnabled: false, repUrl: '',
  }, tab);

  // ── La divergence assumée : la fenêtre ouverte sans son écran ──
  //
  // `openAacEdit` lit `AAC_CFG`, que seul `cfgSectionAAC` pose. Appelée la
  // première, l'original lève `TypeError: Cannot read properties of undefined
  // (reading 'defaultLang')` — il écrit `cfg.instance.defaultLang` sur `{}`.
  //
  // Le chemin est inatteignable : le bouton « Modifier » n'existe que dans le
  // balisage que `cfgSectionAAC` vient de rendre. Mais il fallait le traiter, et
  // le compilateur ne laisse pas écrire `{}` là où un `instance` est attendu. Le
  // module **lève aussi**, avec un message qui nomme la cause. La divergence est
  // donc le message, et elle est assertée ici : si l'un des deux cessait de
  // lever, ce contrôle le dirait.
  const oNu = chargerOrigine({}, tab, 'fr');
  const nNu = chargerNouvelle({}, tab, 'fr');
  const eO = echoue(() => oNu.fenetre(null));
  const eN = echoue(() => nNu.fenetre(null));
  comparaisons += 3;
  if (!eO) ecarts.push('divergence assumée : l’origine ne lève plus sur `openAacEdit` sans écran — le terme de comparaison a changé');
  if (!eN) ecarts.push('divergence assumée : la conversion ne lève plus sur `openAacEdit` sans écran');
  if (eO && eN && !/defaultLang/.test(String(eO.message))) {
    ecarts.push(`divergence assumée : l’origine ne lève plus sur \`defaultLang\` mais sur « ${eO.message} »`);
  }

  // ── La palette des priorités, confrontée à l'original ──
  //
  // Les deux côtés la lisent dans le **même** fichier construit : la comparaison
  // du balisage ne peut donc rien dire de ses cinq teintes, et changer l'une
  // d'elles passerait sans un écart. C'est la forme la plus coûteuse de vert
  // vide — celle qu'on ne voit pas, parce que la mesure est juste.
  //
  // Elle est donc confrontée à la source d'où elle vient : la ligne
  // `const PRIO_COLORS = {…}` d'`app.js`, au commit d'origine.
  const paletteOrigine = (() => {
    let src;
    try {
      src = execFileSync('git', ['show', `${COMMIT_ORIGINE}:public/js/app.js`], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
    } catch {
      console.error(`refus : ${COMMIT_ORIGINE}:public/js/app.js est introuvable.`);
      process.exit(2);
    }
    const ligne = src.split('\n').find((l) => l.startsWith('const PRIO_COLORS = '));
    if (!ligne) {
      console.error('refus : `const PRIO_COLORS` est introuvable dans l’`app.js` d’origine.');
      console.error('  Sans elle, la palette de `icones.ts` ne serait confrontée à rien.');
      process.exit(2);
    }
    const bac = {};
    vm.createContext(bac);
    vm.runInContext(`${ligne}\nresultat = PRIO_COLORS;`, bac);
    return bac.resultat;
  })();
  for (const [niveau, teinte] of Object.entries(paletteOrigine)) {
    pareil(`palette · priorité ${niveau}`, teinte, PRIO_COLORS[niveau]);
  }
  pareil('palette · nombre de teintes',
    Object.keys(paletteOrigine).length, Object.keys(PRIO_COLORS).length);

  // ── Un champ absent de la fenêtre : les trois gestes doivent lever ──
  //
  // L'original écrit `document.getElementById(id).value` : un champ absent y lève
  // une `TypeError`, et **rien ne part**. Le premier jet du module rendait `''`,
  // donc la requête partait avec le champ **vidé** — et le serveur l'écrivait.
  // Trouvé par un contre-essai monté pour autre chose, et corrigé : le module lève
  // aussi, avec un message qui nomme le champ.
  //
  // Les deux lèvent, et c'est ce qui est asserté ici, geste par geste.
  const sansUnChamp = {
    aacNom: 'X', aacSigle: 'X', aacEtat: 'X', aacBigramme: 'X', aacVille: 'X',
    aacAdresse1: 'X', aacAdresse2: 'X', aacEmail: 'X', aacLang: 'fr',
    secMinLen: '1', secMaxAge: '1', secMaxFail: '1', secTimeout: '1',
    secSingle: true, secForce: true, secMfa: true,
    repEnabled: true, repUrl: 'https://x',
  };
  for (const [geste, absent] of [['saveAAC', 'aacSigle'], ['saveSecurite', 'secTimeout'], ['saveSysteme', 'repUrl']]) {
    const champs = { ...sansUnChamp };
    delete champs[absent];
    const oG = chargerOrigine(champs, tab, 'fr');
    const nG = chargerNouvelle(champs, tab, 'fr');
    /* eslint-disable no-await-in-loop */
    const leveO = await oG.envoi(geste).then(() => null, (e) => e);
    const leveN = await nG.envoi(geste).then(() => null, (e) => e);
    /* eslint-enable no-await-in-loop */
    comparaisons += 2;
    if (!leveO) ecarts.push(`divergence assumée : l’origine ne lève plus sur \`${geste}\` sans le champ « ${absent} » — le terme de comparaison a changé`);
    if (!leveN) ecarts.push(`divergence assumée : la conversion ne lève plus sur \`${geste}\` sans le champ « ${absent} » — une requête partirait avec le champ vidé`);
  }

  // ── La garde : le balisage comparé doit porter le logo ET son absence ──
  //
  // Le cadre du logo a deux branches, et la seconde porte le bouton de retrait.
  // Sans cette garde, un régime retiré en silence laisserait la moitié du cadre
  // sans preuve — c'est ce qui est arrivé à `circuitHtml` en 5.d.3.
  const avecLogo = chargerNouvelle({}, tab, 'fr').aac(copie(cfgReel));
  const sansLogo = chargerNouvelle({}, tab, 'fr').aac(copie({ ...cfgReel, aac: {} }));
  comparaisons += 2;
  if (!/aac-logo-preview/.test(avecLogo) || !/aac-logo-iconbtn/.test(avecLogo)) {
    ecarts.push('garde : le régime réel ne porte plus de logo — la branche « image » et le bouton de retrait ne sont plus éprouvés');
  }
  if (!/aac-logo-empty/.test(sansLogo) || /shell-btn-danger/.test(sansLogo)) {
    ecarts.push('garde : le régime sans logo ne porte plus le cadre vide, ou porte encore le bouton de retrait');
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  dont le balisage de la fenêtre de l’Administration — seule preuve d’`AAC_CFG`,');
  console.log('  l’unique état partagé du bloc, et le corps des trois enregistrements.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
