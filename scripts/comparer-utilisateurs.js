#!/usr/bin/env node
/**
 * OASIS — L'écran des comptes, avant et après la conversion.
 *
 * ADR-003, 5.e.1. Deuxième pièce d'`app.js`, et la plus lourde : six onglets,
 * cinq fenêtres, et **quatre gestes qui écrivent** — dont l'effacement d'un
 * compte, qui est irréversible.
 *
 * ── Ce qui se compare ──
 *
 *   · `renderUsers()` : le balisage de `#mainView`, pour chacun des six onglets,
 *     aux deux privilèges (super-administrateur ou non) — le privilège commande
 *     cinq boutons et une colonne.
 *   · **Les écouteurs posés après le rendu.** C'est le cœur de cet écran : six
 *     familles d'écouteurs (`[data-action]`, `[data-presta]`,
 *     `[data-topersonnel]`, `[data-modules]`, `[data-edit]`, `[data-effacer]`).
 *     Un écouteur manquant laisse un bouton muet, et aucun balisage ne le dirait.
 *   · Les quatre fenêtres : accès aux modules, effacement, édition, création.
 *   · Les quatre corps de requête : `set-modules`, `edit`, l'effacement avec son
 *     mot de passe, et la création.
 *   · `userRole` et `splitName`, sur des comptes bricolés — un nom en un seul
 *     mot, un nom en quatre, un compte sans nom du tout.
 *
 * ── Le faux document, et pourquoi il relit le balisage rendu ──
 *
 * `renderUsers` écrit `#mainView` **puis** parcourt le document pour brancher
 * ses écouteurs. Un faux document qui rendrait une liste inventée mesurerait
 * mon montage : celui-ci **relit le balisage qui vient d'être écrit**, et en
 * tire les éléments. Un rendu qui n'en produirait aucun donnerait zéro écouteur
 * des deux côtés, et le garde du bas refuse ce vide.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_USERS_ORIGINE || 'c363af0';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'utilisateurs.js'))) {
    console.error('refus : public/app/utilisateurs.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  let texte;
  try {
    texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Donner le bon commit par OASIS_USERS_ORIGINE=<sha>.');
    process.exit(2);
  }
  if (!texte.includes('async function renderUsers()')) {
    console.error(`refus : ${SOURCE_ORIGINE} ne porte plus \`renderUsers\`.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    process.exit(2);
  }
  return texte;
}

const FONCTIONS = [
  'setUserTab', 'toggleUserSidebar', 'userRole', 'splitName', 'renderUsers',
  'showModulesModal', 'saveUserModules', 'showEffacerUserModal',
  'effacerUtilisateur', 'showEditUserModal', 'submitEditUser',
  'closeUserModal', 'showNewUserModal',
];
const CONSTANTES = ['USER_TABS', 'PRESTA_TABS', 'ROLE_LABELS'];
const ETATS = ['USER_TAB', 'USER_COLLAPSED', 'ALL_MODULES'];

function declaration(lignes, mot, nom) {
  const debut = lignes.findIndex((l) => l.startsWith(`${mot} ${nom} = `));
  if (debut < 0) throw new Error(`refus : \`${mot} ${nom}\` est introuvable dans la version d’origine`);
  if (lignes[debut].trimEnd().endsWith(';')) return lignes[debut];
  const fin = lignes.findIndex((l, i) => i > debut && (l === '];' || l === '};'));
  if (fin < 0) throw new Error(`refus : la fin de \`${nom}\` est introuvable`);
  return lignes.slice(debut, fin + 1).join('\n');
}

function morceauxOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = CONSTANTES.map((n) => declaration(lignes, 'const', n))
    .concat(ETATS.map((n) => declaration(lignes, 'let', n)));
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
  // Les états sont atteints par les gestes de part et d'autre ; ces deux lectures
  // ne servent qu'au relevé, et non à les poser.
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { ${CONSTANTES.join(', ')}, ${FONCTIONS.join(', ')} });`
    + `\nwindow.__lireEtat = () => ({ USER_TAB, USER_COLLAPSED, modules: ALL_MODULES.length });`;
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
 * Un faux document qui **relit le balisage rendu**.
 *
 * Les éléments ne sont pas inventés : ils sont tirés du dernier `innerHTML`
 * écrit. Un `id` connu rend un champ dont la valeur vient de `champs` ; un
 * sélecteur d'attribut rend un élément par occurrence trouvée, dans l'ordre du
 * balisage.
 */
function faireDom(capture, champs) {
  const faire = (id, extra) => ({
    id,
    value: Object.prototype.hasOwnProperty.call(champs, id) ? champs[id] : '',
    checked: champs[id] === true,
    style: {},
    textContent: '',
    dataset: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    addEventListener: (evt, f) => capture.ecouteurs.push({ cible: id, evt, f }),
    focus: () => capture.focus.push(id),
    remove: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    ...extra,
  });
  const vue = {
    set innerHTML(v) { capture.vue = v; },
    get innerHTML() { return capture.vue; },
    // `filterScope` prend cette vue pour portée quand le champ n'a pas de
    // `closest` : elle doit savoir répondre, et rendre vide.
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  const modal = {
    set innerHTML(v) { capture.modal = v; },
    get innerHTML() { return capture.modal; },
  };
  const balisage = () => `${capture.vue}\n${capture.modal}`;
  // Les ids que le balisage porte **vraiment** : un `getElementById` d'un id
  // absent doit rendre `null`, parce que c'est ce que fait le document — et deux
  // fonctions de ce bloc en dépendent (`euPortee`, `euAdminPwd`).
  const idsRendus = () => new Set([...balisage().matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  return {
    getElementById: (id) => {
      if (id === 'mainView') return vue;
      if (id === 'userModalRoot') return modal;
      if (!idsRendus().has(id)) return null;
      if (!capture.elements.has(id)) capture.elements.set(id, faire(id));
      return capture.elements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: (sel) => {
      const m = /\[data-([a-z]+)\]/.exec(sel);
      if (!m) return [];
      const attr = `data-${m[1]}`;
      const cle = m[1] === 'mod' || m[1] === 'newmod' ? m[1] : m[1];
      const hors = sel.includes(':not([disabled])');
      const coches = sel.includes(':checked');
      const trouves = [];
      const motif = new RegExp(`<[^>]*${attr}="([^"]*)"[^>]*>`, 'g');
      for (const occ of balisage().matchAll(motif)) {
        if (hors && /\bdisabled\b/.test(occ[0])) continue;
        if (coches && !/\bchecked\b/.test(occ[0])) continue;
        const el = faire(`${attr}:${occ[1]}`);
        el.dataset = { [cle]: occ[1], user: /data-user="([^"]*)"/.exec(occ[0])?.[1] };
        if (m[1] === 'action') el.dataset.action = occ[1];
        trouves.push(el);
      }
      return trouves;
    },
    createElement: () => faire('créé'),
  };
}

function bacCommun(capture, refs, me, champs, tab) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, CURRENT_LANG: 'fr',
    REFS: refs, ME: me,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    // Les dates du jeu d'essai : un format fixe, pour que la comparaison ne
    // dépende pas du fuseau de la machine qui la lance.
    oasisToast: (m, g, d) => capture.bandeaux.push(`${g}:${m}:${d}`),
    showToast: (m, g = 'success', d = 4000) => bac.window.oasisToast(m, g, d),
    oasisMessageErreur: () => 'erreur',
    oasisConfirmer: async () => capture.confirme,
    renderConfig: async () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    encodeURIComponent,
    document: faireDom(capture, champs),
  };
  bac.window = bac;
  const transport = async (chemin, options) => {
    capture.appels.push({
      chemin,
      methode: (options || {}).method || 'GET',
      corps: (options || {}).body === undefined ? null : String((options || {}).body),
    });
    if (chemin === '/api/users') return { ok: true, status: 200, json: async () => capture.comptes };
    if (chemin === '/api/modules') return { ok: true, status: 200, json: async () => capture.modules };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = (comptes, modules) => ({
  vue: '', modal: '', ecouteurs: [], appels: [], bandeaux: [], focus: [],
  loadRefs: 0, confirme: true, elements: new Map(), comptes, modules,
});

/** Les sas dont ce bloc a besoin : les icônes, les schémas, la barre, les instances. */
const SAS = ['icons.js', 'schemas.js', 'barre.js', 'portail-instances.js'];

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

function charger(cote, refs, me, champs, tab, comptes, modules) {
  const capture = neuf(comptes, modules);
  const bac = bacCommun(capture, refs, me, champs, tab);
  vm.createContext(bac);
  poserOutils(bac);
  for (const f of SAS) {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', f), 'utf8'), bac, { filename: f });
  }
  bac.window.REFS = refs;
  bac.window.ME = me;
  if (cote === 'origine') {
    vm.runInContext(morceauxOrigine(sourceOrigine()), bac, { filename: 'app.js (origine)' });
  } else {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'utilisateurs.js'), 'utf8'),
      bac, { filename: 'utilisateurs.js' });
  }
  return { bac, capture, w: bac.window };
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
const releve = (capture) => JSON.stringify(capture.ecouteurs.map((e) => [e.cible, e.evt]));

/** Les comptes du jeu d'essai : fabriqués, et c'est nécessaire. */
function comptesDEssai() {
  return [
    { username: 'sa@a.bj', email: 'sa@a.bj', role: 'SUPERADMIN', nom: 'DIALLO', prenom: 'Awa', active: true, createdAt: '2026-01-02T10:00:00Z', modules: ['PLAN', 'SURV'], portee: 'regionale' },
    { username: 'sa2@a.bj', email: 'sa2@a.bj', role: 'SUPERADMIN', fullName: 'KONE Ibrahim Sekou', active: false, createdAt: '2026-02-02T10:00:00Z', portee: 'nationale', instance: 'TG' },
    { username: 'adm@a.bj', email: 'adm@a.bj', role: 'ADMIN', nom: 'TRAORE', prenom: 'Fatou', active: true, locked: true, createdAt: '2026-03-02T10:00:00Z', modules: [] },
    { username: 'admp@a.bj', email: 'admp@a.bj', role: 'ADMIN_PRESTATAIRE', fullName: 'SOW', active: true, mustChange: true, createdAt: null, prestataire_id: null },
    { username: 'aac@a.bj', email: 'aac@a.bj', role: 'AAC', nom: 'OUEDRAOGO', prenom: 'Zoé & <b>Marie</b>', active: true, createdAt: '2026-05-02T10:00:00Z' },
    { username: 'insp@a.bj', email: 'insp@a.bj', role: 'INSPECTEUR', fullName: '', active: true, createdAt: '2026-06-02T10:00:00Z' },
    { username: 'pr@a.bj', email: 'pr@a.bj', role: 'PRESTATAIRE', nom: 'BA', prenom: '', active: true, createdAt: '2026-07-02T10:00:00Z' },
    { username: 'ind@a.bj', email: 'ind@a.bj', role: 'INDEPENDANT', fullName: 'DIOP Marie-Claire "MC"', active: true, createdAt: '2026-08-02T10:00:00Z', modules: ['RAMP'] },
  ];
}

async function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const roadmap = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'modules.json'), 'utf8'));
  const modules = roadmap.map((m) => ({ ...m, installed: true, enabled: true }));
  const tab = libelles();
  const comptes = comptesDEssai();

  console.log('\n═══ L’écran des comptes, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/utilisateurs.js');
  console.log(`  ${comptes.length} comptes d’essai, ${modules.length} modules au catalogue\n`);

  // ── Les deux privilèges, et ils commandent cinq boutons et une colonne ──
  const moi = (role, extra) => ({
    user: { username: 'sa@a.bj', role, ...extra },
    instance: { etat: 'Bénin', codeEtat: 'BJ' },
    instance_vue: { disponible: true, instances: ['BJ', 'TG'] },
  });
  const POSTES = [['super-administrateur', moi('SUPERADMIN')], ['administrateur AAC', moi('ADMIN')]];
  const ONGLETS = ['SUPERADMIN', 'ADMIN', 'ADMIN_PRESTATAIRE', 'AAC', 'PRESTATAIRE', 'INDEPENDANT'];

  const monter = (cote, me, champs = {}) => charger(cote, copie(refs), copie(me), champs, tab, copie(comptes), copie(modules));

  for (const [nomPoste, me] of POSTES) {
    for (const onglet of ONGLETS) {
      const o = monter('origine', me);
      const n = monter('nouvelle', me);
      /* eslint-disable no-await-in-loop */
      // La bascule d'onglet passe par le geste : seule porte d'entrée du module.
      o.w.setUserTab(onglet); n.w.setUserTab(onglet);
      await new Promise((r) => setTimeout(r, 0));
      await o.w.renderUsers(); await n.w.renderUsers();
      /* eslint-enable no-await-in-loop */
      pareil(`${nomPoste} · ${onglet} · #mainView`, o.capture.vue, n.capture.vue);
      pareil(`${nomPoste} · ${onglet} · les écouteurs posés`, releve(o.capture), releve(n.capture));
      pareil(`${nomPoste} · ${onglet} · les routes lues`,
        JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
    }
  }

  // ── Le repli de la barre, deux fois : l'aller et le retour ──
  {
    const o = monter('origine', moi('SUPERADMIN'));
    const n = monter('nouvelle', moi('SUPERADMIN'));
    await o.w.renderUsers(); await n.w.renderUsers();
    for (const coup of [1, 2]) {
      o.w.toggleUserSidebar(); n.w.toggleUserSidebar();
      /* eslint-disable no-await-in-loop */
      await new Promise((r) => setTimeout(r, 0));
      await o.w.renderUsers(); await n.w.renderUsers();
      /* eslint-enable no-await-in-loop */
      pareil(`repli (coup ${coup}) · #mainView`, o.capture.vue, n.capture.vue);
    }
  }

  // ── Ce que ce montage ne peut pas comparer, et pourquoi ──
  //
  // `setUserTab` appelle `portailReinitialiserRecherche` : changer d'onglet remet
  // la recherche au repos. Un contre-essai a montré que retirer cet appel reste
  // **vert** ici, et j'ai d'abord cru qu'il manquait un régime. Il manque autre
  // chose, et c'est la leçon de 5.d.7 revenue dans mon propre montage :
  //
  // le côté « origine » lit `searchInputHtml` sur `window`, posé par le paquet
  // `barre.js` ; le côté « nouvelle » l'**importe**, et `utilisateurs.js` en porte
  // donc sa propre copie. Poser une valeur par `window.portailChercher` touche la
  // copie du sas — celle que l'origine rend, et pas celle du module. Les deux
  // côtés rendraient alors deux états différents, et la comparaison mesurerait mon
  // empaquetage, non le code.
  //
  // Sur la page il n'y a **qu'une** copie (un seul paquet depuis 5.d.7), donc le
  // défaut est de la mesure et non du produit. La preuve va là où il n'y a qu'une
  // copie : la suite « parcours » a reçu le contrôle « changer d'onglet des comptes
  // remet la recherche au repos ».

  // ── `userRole` et `splitName`, sur ce que les vraies données ne portent pas ──
  {
    const o = monter('origine', moi('SUPERADMIN'));
    const n = monter('nouvelle', moi('SUPERADMIN'));
    const cas = [
      { role: 'INSPECTEUR' }, { role: 'AAC' }, { role: 'SUPERADMIN' }, { role: '' }, {},
      { nom: 'DIALLO', prenom: 'Awa' }, { nom: 'DIALLO' }, { prenom: 'Awa' },
      { fullName: 'KONE Ibrahim Sekou Amadou' }, { fullName: 'SOW' }, { fullName: '   ' },
      { fullName: '' }, { nom: '', prenom: '', fullName: 'DIOP Marie' },
    ];
    for (const u of cas) {
      pareil(`userRole(${JSON.stringify(u)})`, o.w.userRole(u), n.w.userRole(u));
      pareil(`splitName(${JSON.stringify(u)})`,
        JSON.stringify(o.w.splitName(u)), JSON.stringify(n.w.splitName(u)));
    }
  }

  // ── Les quatre fenêtres ──
  const AVEC_MODS = comptes[0];
  const SANS_NOM = comptes[5];
  for (const [nomPoste, me] of POSTES) {
    const o = monter('origine', me);
    const n = monter('nouvelle', me);
    /* eslint-disable no-await-in-loop */
    await o.w.renderUsers(); await n.w.renderUsers();
    /* eslint-enable no-await-in-loop */
    for (const [quoi, geste, arg] of [
      ['accès aux modules', 'showModulesModal', AVEC_MODS],
      ['accès aux modules (aucun)', 'showModulesModal', SANS_NOM],
      ['effacement', 'showEffacerUserModal', AVEC_MODS],
      ['édition', 'showEditUserModal', AVEC_MODS],
      ['édition (sans nom)', 'showEditUserModal', SANS_NOM],
      ['création', 'showNewUserModal', undefined],
    ]) {
      o.capture.modal = ''; n.capture.modal = '';
      o.capture.focus.length = 0; n.capture.focus.length = 0;
      o.capture.elements.clear(); n.capture.elements.clear();
      o.w[geste](arg); n.w[geste](arg);
      pareil(`${nomPoste} · fenêtre « ${quoi} » · balisage`, o.capture.modal, n.capture.modal);
      pareil(`${nomPoste} · fenêtre « ${quoi} » · le focus posé`,
        JSON.stringify(o.capture.focus), JSON.stringify(n.capture.focus));
    }
    // Et la fermeture, qui vide la racine.
    o.w.closeUserModal(); n.w.closeUserModal();
    pareil(`${nomPoste} · fermeture de la fenêtre`, o.capture.modal, n.capture.modal);
  }

  // ── Les quatre corps de requête ──
  //
  // Les champs sont **distincts** : une permutation de deux `getElementById` se
  // lit dans le corps envoyé.
  const champs = {
    euNom: '  DIALLO & <b>Cie</b>  ', euPrenom: '  Awa  ', euTel: '', euRole: 'ADMIN',
    euEmail: '  NOUVEAU@a.bj  ', euAdminPwd: 'mdp-operateur',
    euPortee: 'nationale', euInstance: 'TG',
    nuNom: ' KONE ', nuPrenom: ' Ibrahim ', nuEmail: ' k@a.bj ', nuRole: 'PRESTATAIRE',
    nuPortee: 'regionale', nuInstance: '', nuPresta: 'p1',
    efAdminPwd: 'mdp-effacement',
  };
  for (const [nomPoste, me] of POSTES) {
    const o = monter('origine', me, champs);
    const n = monter('nouvelle', me, champs);
    /* eslint-disable no-await-in-loop */
    await o.w.renderUsers(); await n.w.renderUsers();

    // `set-modules` : la fenêtre doit être ouverte pour que les cases existent.
    for (const cote of [o, n]) { cote.capture.appels.length = 0; cote.w.showModulesModal(AVEC_MODS); }
    await o.w.saveUserModules('sa@a.bj'); await n.w.saveUserModules('sa@a.bj');
    pareil(`${nomPoste} · saveUserModules — ce qui partirait`,
      JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));

    // `edit`
    for (const cote of [o, n]) { cote.capture.appels.length = 0; cote.w.showEditUserModal(AVEC_MODS); }
    await o.w.submitEditUser('sa@a.bj'); await n.w.submitEditUser('sa@a.bj');
    pareil(`${nomPoste} · submitEditUser — ce qui partirait`,
      JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));

    // L'effacement, avec son mot de passe.
    for (const cote of [o, n]) { cote.capture.appels.length = 0; cote.w.showEffacerUserModal(AVEC_MODS); }
    await o.w.effacerUtilisateur('sa@a.bj'); await n.w.effacerUtilisateur('sa@a.bj');
    pareil(`${nomPoste} · effacerUtilisateur — ce qui partirait`,
      JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));

    // La création : le geste est un écouteur du bouton, non une fonction nommée.
    for (const cote of [o, n]) {
      cote.capture.appels.length = 0;
      cote.capture.ecouteurs.length = 0;
      cote.w.showNewUserModal();
    }
    const creer = (cote) => cote.capture.ecouteurs.find((e) => e.cible === 'createUser');
    if (!creer(o) || !creer(n)) {
      ecarts.push(`garde : le bouton de création n’a pas d’écouteur (${nomPoste}) — le geste qui crée un compte n’est éprouvé nulle part`);
      comparaisons += 1;
    } else {
      await creer(o).f(); await creer(n).f();
      pareil(`${nomPoste} · création — ce qui partirait`,
        JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
    }
    /* eslint-enable no-await-in-loop */
  }

  // ── Les gardes ──
  //
  // Six familles d'écouteurs, et le balisage comparé doit les porter toutes :
  // un bouton muet ne se voit dans aucun balisage. L'onglet « AAC » les a toutes
  // au privilège le plus haut — c'est le seul qui porte `[data-topersonnel]`.
  {
    const g = monter('nouvelle', moi('SUPERADMIN'));
    g.w.setUserTab('AAC');
    await new Promise((r) => setTimeout(r, 0));
    await g.w.renderUsers();
    const familles = ['data-action', 'data-modules', 'data-edit', 'data-effacer', 'data-topersonnel'];
    const manquantes = familles.filter((f) => !g.capture.vue.includes(f));
    comparaisons += 2;
    if (manquantes.length) {
      ecarts.push(`garde : l’onglet « AAC » ne porte plus ${manquantes.join(', ')} — autant de boutons dont l’écouteur n’est plus éprouvé`);
    }
    const p = monter('nouvelle', moi('SUPERADMIN'));
    p.w.setUserTab('PRESTATAIRE');
    await new Promise((r) => setTimeout(r, 0));
    await p.w.renderUsers();
    if (!p.capture.vue.includes('data-presta')) {
      ecarts.push('garde : l’onglet « Prestataires » ne porte plus `data-presta` — le sélecteur de rattachement n’est plus éprouvé');
    }
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  dont **les écouteurs posés après le rendu** — six familles, et un bouton');
  console.log('  muet ne se voit dans aucun balisage — et les quatre corps de requête.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
