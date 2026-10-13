#!/usr/bin/env node
/**
 * OASIS — L'accueil et le journal d'audit, avant et après la conversion.
 *
 * ADR-003, 5.e.3. Quatrième pièce d'`app.js`. L'accueil est **l'écran que tout
 * le monde voit**, et le seul dont le balisage dépend des modules ouverts au
 * compte.
 *
 * ── Ce que cette preuve doit porter en premier ──
 *
 * La **carte éteinte**. Un module fermé au compte s'affiche en gris, porte un
 * `aria-disabled`, et son clic dit pourquoi au lieu de mener nulle part. Trois
 * états la commandent : `ME.user.role === 'SUPERADMIN'` (tout ouvert), une liste
 * `modules` absente (tout ouvert, c'était l'état d'avant ce champ), et une liste
 * renseignée. Le jeu d'essai du navigateur n'ouvre qu'un compte de
 * super-administrateur : **la branche éteinte n'était éprouvée nulle part**, et
 * elle est fabriquée ici — liste partielle, liste vide, liste absente.
 *
 * ── Et une requête pour rien, qui est fixée plutôt que corrigée ──
 *
 * `renderHome` demande `/api/stats`, en lit la réponse, et **ne s'en sert pas** :
 * la route parcourt tous les comptes du serveur à chaque ouverture du portail,
 * pour rien. La conversion ne la retire pas — ce serait changer ce que la page
 * fait —, et la comparaison des **routes lues dans l'ordre** la fixe : sa
 * disparition serait désormais un écart, donc une décision.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_ACCUEIL_ORIGINE || 'b42a953';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app.js`;

function sourceOrigine() {
  for (const f of ['accueil.js', 'audit.js']) {
    if (!fs.existsSync(path.join(RACINE, 'public', 'app', f))) {
      console.error(`refus : public/app/${f} est absent — lancer \`node frontend/construire.mjs\`.`);
      process.exit(2);
    }
  }
  let texte;
  try {
    texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Donner le bon commit par OASIS_ACCUEIL_ORIGINE=<sha>.');
    process.exit(2);
  }
  if (!texte.includes('async function renderHome()') || !texte.includes('async function renderAudit()')) {
    console.error(`refus : ${SOURCE_ORIGINE} ne porte plus \`renderHome\` ou \`renderAudit\`.`);
    process.exit(2);
  }
  return texte;
}

const FONCTIONS = ['setModulesView', 'renderHome', 'renderAudit'];
const CONSTANTES = ['OASIS_FULLNAME_HTML', 'COULEURS_MODULE', 'THEMES_ORDER'];

function declaration(lignes, mot, nom) {
  const debut = lignes.findIndex((l) => l.startsWith(`${mot} ${nom} =`));
  if (debut < 0) throw new Error(`refus : \`${mot} ${nom}\` est introuvable dans la version d’origine`);
  if (lignes[debut].trimEnd().endsWith(';')) return lignes[debut];
  const fin = lignes.findIndex((l, i) => i > debut && (l === '];' || l === '};' || l.endsWith("';")));
  if (fin < 0) throw new Error(`refus : la fin de \`${nom}\` est introuvable`);
  return lignes.slice(debut, fin + 1).join('\n');
}

function morceauxOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = CONSTANTES.map((n) => declaration(lignes, 'const', n));
  morceaux.push(declaration(lignes, 'let', 'MODULES_VIEW'));
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
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { ${CONSTANTES.join(', ')}, ${FONCTIONS.join(', ')} });`
    + '\nwindow.__vue = () => MODULES_VIEW;';
}

function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
 * Un faux document qui relit le balisage rendu.
 *
 * `renderHome` écrit la vue **puis** branche un écouteur par carte, en lisant
 * `data-module` et `data-enabled` du balisage qu'il vient de poser. Les cartes
 * sont donc tirées de ce balisage, non inventées.
 */
function faireDom(capture) {
  const classes = (nom) => ({
    nom,
    classList: {
      toggle: (c, v) => capture.classes.push(`${nom}:${c}=${v}`),
      add: (c) => capture.classes.push(`${nom}:+${c}`),
      remove: (c) => capture.classes.push(`${nom}:-${c}`),
      contains: () => false,
    },
    addEventListener: (evt, f) => capture.ecouteurs.push({ cible: nom, evt, f }),
    style: {},
  });
  const vue = {
    set innerHTML(v) { capture.vue = v; },
    get innerHTML() { return capture.vue; },
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  return {
    getElementById: (id) => {
      if (id === 'mainView') return vue;
      if (id === 'portalModules') return capture.boiteModules ? classes('portalModules') : null;
      if (String(capture.vue).includes(`id="${id}"`)) return classes(id);
      return null;
    },
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.portal-viewmode-btn') {
        const n = (String(capture.vue).match(/portal-viewmode-btn/g) || []).length;
        return Array.from({ length: n }, (_, i) => classes(`viewmode[${i}]`));
      }
      if (sel === '.portal-card[data-module]') {
        const cartes = [...String(capture.vue).matchAll(/<div class="portal-card[^"]*"[^>]*data-module="([^"]*)" data-enabled="([^"]*)"/g)];
        return cartes.map(([, code, enabled]) => {
          const el = classes(`carte:${code}`);
          el.dataset = { module: code, enabled };
          return el;
        });
      }
      return [];
    },
  };
}

function bacCommun(capture, me, lang, tab) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, CURRENT_LANG: lang, ME: me,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    fmtDate: (iso) => (iso ? `«${String(iso)}»` : '—'),
    oasisToast: (m, g, d) => capture.bandeaux.push(`${g}:${m}:${d}`),
    showToast: (m, g = 'success', d = 4000) => bac.window.oasisToast(m, g, d),
    oasisMessageErreur: () => 'erreur',
    VIEWS: capture.vues,
    navigate: (v) => capture.navigations.push(v),
    moduleHostRegisterViews: capture.hote
      ? async () => { capture.registres += 1; }
      : undefined,
    localStorage: {
      getItem: () => capture.vueRetenue,
      setItem: (c, v) => capture.ecritures.push(`${c}=${v}`),
    },
    document: faireDom(capture),
  };
  bac.window = bac;
  const transport = async (chemin, options) => {
    capture.appels.push({ chemin, methode: (options || {}).method || 'GET' });
    if (chemin === '/api/stats') return { ok: true, status: 200, json: async () => capture.stats };
    if (chemin === '/api/modules') return { ok: true, status: 200, json: async () => capture.modules };
    if (chemin === '/api/audit') return { ok: true, status: 200, json: async () => capture.entrees };
    if (chemin === '/api/audit/verify') return { ok: true, status: 200, json: async () => capture.verif };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = () => ({
  vue: '', appels: [], bandeaux: [], classes: [], ecouteurs: [], ecritures: [],
  navigations: [], registres: 0, vues: {}, hote: true, boiteModules: true,
  vueRetenue: null, stats: { users: 3 }, modules: [], entrees: [], verif: { valid: true, total: 0 },
});

const SAS = ['icons.js', 'schemas.js', 'barre.js'];

function charger(cote, me, lang, tab, regler) {
  const capture = neuf();
  if (regler) regler(capture);
  const bac = bacCommun(capture, me, lang, tab);
  vm.createContext(bac);
  for (const f of SAS) {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', f), 'utf8'), bac, { filename: f });
  }
  bac.window.ME = me;
  bac.window.CURRENT_LANG = lang;
  bac.window.VIEWS = capture.vues;
  if (cote === 'origine') {
    vm.runInContext(morceauxOrigine(sourceOrigine()), bac, { filename: 'app.js (origine)' });
  } else {
    for (const f of ['accueil.js', 'audit.js']) {
      vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', f), 'utf8'), bac, { filename: f });
    }
  }
  return { bac, capture, w: bac.window };
}

let comparaisons = 0;
const ecarts = [];
function pareil(quoi, a, b) {
  comparaisons += 1;
  if (a === b) return;
  const i = [...String(a)].findIndex((c, k) => c !== String(b)[k]);
  ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine  : …${String(a).slice(Math.max(0, i - 40), i + 60)}…\n      nouvelle : …${String(b).slice(Math.max(0, i - 40), i + 60)}…`);
}
const copie = (o) => JSON.parse(JSON.stringify(o));
const releve = (c) => JSON.stringify({
  classes: c.classes, ecritures: c.ecritures, navigations: c.navigations,
  bandeaux: c.bandeaux, registres: c.registres,
  ecouteurs: c.ecouteurs.map((e) => [e.cible, e.evt]),
});

async function principal() {
  const roadmap = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'modules.json'), 'utf8'));
  const tab = libelles();
  const catalogue = roadmap.map((m) => ({ ...m, installed: true, enabled: true }));

  console.log('\n═══ L’accueil et le journal d’audit, avant et après ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/accueil.js + public/app/audit.js');
  console.log(`  ${catalogue.length} modules au catalogue, ${new Set(catalogue.map((m) => m.theme)).size} thèmes\n`);

  const session = (u) => ({ user: { username: 'moi@a.bj', role: 'AAC', ...u }, instance: { etat: 'Bénin' } });

  // ── La carte éteinte, que le jeu d'essai du navigateur n'ouvre jamais ──
  const COMPTES = [
    ['super-administrateur', session({ role: 'SUPERADMIN' })],
    ['super-administrateur à liste vide', session({ role: 'SUPERADMIN', modules: [] })],
    ['liste absente (tout ouvert)', session({ role: 'AAC' })],
    ['liste vide (tout fermé)', session({ role: 'AAC', modules: [] })],
    ['liste partielle', session({ role: 'AAC', modules: ['PLAN', 'RAMP'] })],
    ['liste d’un code inconnu', session({ role: 'AAC', modules: ['ZZZ'] })],
    ['liste non tableau', session({ role: 'AAC', modules: 'PLAN' })],
  ];
  for (const [nom, me] of COMPTES) {
    for (const vue of ['grid', 'list']) {
      const regler = (c) => { c.modules = copie(catalogue); c.vueRetenue = vue; };
      const o = charger('origine', copie(me), 'fr', tab, regler);
      const n = charger('nouvelle', copie(me), 'fr', tab, regler);
      /* eslint-disable no-await-in-loop */
      await o.w.renderHome(); await n.w.renderHome();
      /* eslint-enable no-await-in-loop */
      pareil(`${nom} · ${vue} · #mainView`, o.capture.vue, n.capture.vue);
      pareil(`${nom} · ${vue} · routes lues`, JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
      pareil(`${nom} · ${vue} · écouteurs et effets`, releve(o.capture), releve(n.capture));
    }
  }

  // ── Les trois langues, et une quatrième absente du catalogue ──
  for (const lang of ['en', 'pt', 'de']) {
    const regler = (c) => { c.modules = copie(catalogue); };
    const o = charger('origine', session({ role: 'SUPERADMIN' }), lang, tab, regler);
    const n = charger('nouvelle', session({ role: 'SUPERADMIN' }), lang, tab, regler);
    /* eslint-disable no-await-in-loop */
    await o.w.renderHome(); await n.w.renderHome();
    /* eslint-enable no-await-in-loop */
    pareil(`langue ${lang} · #mainView`, o.capture.vue, n.capture.vue);
  }

  // ── Les régimes du catalogue ──
  const hostile = '<b>"L\'étau" & co</b>';
  const CATALOGUES = [
    ['aucun module', []],
    ['tous désactivés', catalogue.map((m) => ({ ...m, enabled: false }))],
    ['un seul thème', catalogue.filter((m) => m.theme === 'surveillance')],
    ['sans le thème surveillance', catalogue.filter((m) => m.theme !== 'surveillance')],
    ['un thème inconnu', catalogue.map((m) => ({ ...m, theme: 'theme_fantome' }))],
    ['renversé (l’ordre vient du catalogue)', catalogue.slice().reverse()],
    ['un module hostile et sans teinte', [{
      code: 'ZZZ', theme: 'services', enabled: true, installed: true, priority: 9,
      tdr: 'Z.9', icon: '🙂', name: { fr: hostile }, desc: { fr: hostile },
    }]],
    ['un module sans nom dans la langue', [{
      code: 'PLAN', theme: 'surveillance', enabled: true, installed: true, priority: 1,
      tdr: 'D.6', icon: '🗓️', name: { fr: 'Planification' }, desc: { fr: 'Description' },
    }]],
  ];
  for (const [nom, mods] of CATALOGUES) {
    const regler = (c) => { c.modules = copie(mods); };
    const o = charger('origine', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    const n = charger('nouvelle', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    /* eslint-disable no-await-in-loop */
    await o.w.renderHome(); await n.w.renderHome();
    /* eslint-enable no-await-in-loop */
    pareil(`catalogue « ${nom} » · #mainView`, o.capture.vue, n.capture.vue);
  }

  // ── La bascule de présentation : deux fois, l'aller et le retour ──
  {
    const regler = (c) => { c.modules = copie(catalogue); };
    const o = charger('origine', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    const n = charger('nouvelle', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    await o.w.renderHome(); await n.w.renderHome();
    for (const mode of ['list', 'grid', 'list', 'inconnu']) {
      for (const cote of [o, n]) { cote.capture.classes.length = 0; cote.capture.ecritures.length = 0; }
      o.w.setModulesView(mode); n.w.setModulesView(mode);
      pareil(`setModulesView(${mode}) · classes et stockage`, releve(o.capture), releve(n.capture));
      /* eslint-disable no-await-in-loop */
      await o.w.renderHome(); await n.w.renderHome();
      /* eslint-enable no-await-in-loop */
      pareil(`setModulesView(${mode}) · le rendu suivant`, o.capture.vue, n.capture.vue);
    }
    // Et sans la boîte des modules dans le document : la bascule ne doit pas lever.
    const sans = (c) => { c.modules = copie(catalogue); c.boiteModules = false; };
    const o2 = charger('origine', session({ role: 'SUPERADMIN' }), 'fr', tab, sans);
    const n2 = charger('nouvelle', session({ role: 'SUPERADMIN' }), 'fr', tab, sans);
    o2.w.setModulesView('list'); n2.w.setModulesView('list');
    pareil('setModulesView sans la boîte · effets', releve(o2.capture), releve(n2.capture));
  }

  // ── Le clic d'une carte : les cinq issues ──
  const CLICS = [
    ['carte ouverte, vue connue', { role: 'SUPERADMIN' }, { mod_PLAN: () => {} }, true],
    ['carte ouverte, vue absente, hôte présent', { role: 'SUPERADMIN' }, {}, true],
    ['carte ouverte, vue absente, hôte absent', { role: 'SUPERADMIN' }, {}, false],
    ['carte éteinte', { role: 'AAC', modules: [] }, { mod_PLAN: () => {} }, true],
  ];
  for (const [nom, u, vues, hote] of CLICS) {
    const regler = (c) => { c.modules = copie(catalogue); c.vues = vues; c.hote = hote; };
    const o = charger('origine', session(u), 'fr', tab, regler);
    const n = charger('nouvelle', session(u), 'fr', tab, regler);
    /* eslint-disable no-await-in-loop */
    await o.w.renderHome(); await n.w.renderHome();
    const clic = async (cote) => {
      cote.capture.bandeaux.length = 0;
      cote.capture.navigations.length = 0;
      const carte = cote.capture.ecouteurs.find((e) => e.cible === 'carte:PLAN');
      if (!carte) return '(aucune carte PLAN)';
      await carte.f();
      return JSON.stringify({ bandeaux: cote.capture.bandeaux, navigations: cote.capture.navigations, registres: cote.capture.registres });
    };
    pareil(`clic « ${nom} »`, await clic(o), await clic(n));
    /* eslint-enable no-await-in-loop */
  }

  // ── Le journal d'audit ──
  const entree = (i, extra) => ({
    id: i, ts: `2026-10-0${i}T10:00:00Z`, user: 'moi@a.bj', action: 'CONNEXION',
    details: { quoi: 'rien' }, hash: `${'a'.repeat(60)}${i}`, ...extra,
  });
  const JOURNAUX = [
    ['journal vide, chaîne valide', [], { valid: true, total: 0 }],
    ['trois entrées, chaîne valide', [entree(1), entree(2), entree(3)], { valid: true, total: 3 }],
    ['chaîne rompue', [entree(1), entree(2)], { valid: false, brokenAt: 2, total: 2 }],
    ['détails hostiles', [entree(1, { user: hostile, action: hostile, details: { x: hostile } })], { valid: true, total: 1 }],
    ['détails nuls', [entree(1, { details: null })], { valid: true, total: 1 }],
    ['empreinte courte', [entree(1, { hash: 'abc' })], { valid: true, total: 1 }],
  ];
  for (const [nom, entrees, verif] of JOURNAUX) {
    const regler = (c) => { c.entrees = copie(entrees); c.verif = copie(verif); };
    const o = charger('origine', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    const n = charger('nouvelle', session({ role: 'SUPERADMIN' }), 'fr', tab, regler);
    /* eslint-disable no-await-in-loop */
    await o.w.renderAudit(); await n.w.renderAudit();
    pareil(`audit « ${nom} » · #mainView`, o.capture.vue, n.capture.vue);
    pareil(`audit « ${nom} » · routes lues`, JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
    // Le bouton de vérification : il relit la chaîne et le dit dans un bandeau.
    const presser = async (cote) => {
      cote.capture.bandeaux.length = 0;
      const b = cote.capture.ecouteurs.find((e) => e.cible === 'verifyBtn');
      if (!b) return '(aucun bouton)';
      await b.f();
      return JSON.stringify({ bandeaux: cote.capture.bandeaux, appels: cote.capture.appels.length });
    };
    pareil(`audit « ${nom} » · le bouton de vérification`, await presser(o), await presser(n));
    /* eslint-enable no-await-in-loop */
  }

  // ── Les gardes ──
  //
  // Le balisage comparé doit porter **une carte éteinte et une carte ouverte** :
  // sans les deux, la moitié de `card` ne serait éprouvée nulle part — et c'est
  // précisément la moitié que le jeu d'essai du navigateur n'atteint pas.
  {
    const regler = (c) => { c.modules = copie(catalogue); };
    const partiel = charger('nouvelle', session({ role: 'AAC', modules: ['PLAN'] }), 'fr', tab, regler);
    await partiel.w.renderHome();
    comparaisons += 3;
    if (!/portal-card-ferme/.test(partiel.capture.vue)) {
      ecarts.push('garde : aucune carte éteinte dans le balisage comparé — la moitié de `card` n’est plus éprouvée');
    }
    if (!/data-enabled="true"/.test(partiel.capture.vue)) {
      ecarts.push('garde : aucune carte ouverte dans le balisage comparé');
    }
    // Et la requête pour rien, fixée : sa disparition serait un écart.
    if (!partiel.capture.appels.some((a) => a.chemin === '/api/stats')) {
      ecarts.push('garde : `/api/stats` n’est plus demandé — c’est une requête pour rien, mais la retirer est une décision, pas un effet de bord');
    }
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  dont la **carte éteinte** — que le jeu d’essai du navigateur n’atteint pas —,');
  console.log('  les cinq issues du clic d’une carte, et les deux états de la chaîne d’audit.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
