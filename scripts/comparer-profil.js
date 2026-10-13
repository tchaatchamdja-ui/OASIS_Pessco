#!/usr/bin/env node
/**
 * OASIS — L'écran du profil, avant et après la conversion.
 *
 * ADR-003, 5.e.2. Troisième pièce d'`app.js`. C'est le seul écran où un agent
 * change **ses propres** identifiants : sa photo, son nom, et son mot de passe.
 *
 * ── Ce qui se compare ──
 *
 *   · `renderProfile()` pour **chaque rôle** — le rôle commande les deux sections
 *     facultatives, et chacune a une branche active et une branche grisée ;
 *   · avec et sans photo : le cadre porte alors les initiales, et le bouton de
 *     retrait disparaît ;
 *   · `pfExtraSection` appelée directement, sur un champ en lecture seule et sur
 *     un champ hostile aux cinq caractères d'échappement ;
 *   · les **quatre corps de requête** : les informations, les deux jeux d'extras,
 *     et le dépôt de photo. Le **retrait** ne l'est pas : il passe par la
 *     confirmation du socle, qui bâtit un dialogue dans le document et attend un
 *     clic — la suite « parcours » le couvre (5.c.14) ;
 *   · les **trois refus** du changement de mot de passe — ancien vide, confirmation
 *     discordante, et la politique refusée par le serveur —, puis le succès, qui
 *     doit **vider les trois champs**.
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
 * 60 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-profil 8b2452e
 *     cd /tmp/oasis-profil && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-profil.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 60 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_PROFIL_ORIGINE || '7fbdf3b';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'profil.js'))) {
    console.error('refus : public/app/profil.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  let texte;
  try {
    texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Donner le bon commit par OASIS_PROFIL_ORIGINE=<sha>.');
    process.exit(2);
  }
  if (!texte.includes('async function renderProfile()')) {
    console.error(`refus : ${SOURCE_ORIGINE} ne porte plus \`renderProfile\`.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    process.exit(2);
  }
  return texte;
}

const FONCTIONS = [
  'uploadProfilePhoto', 'removeProfilePhoto', 'saveProfile', 'saveProfileInfos',
  'submitProfilePassword', 'renderProfile', 'pfExtraSection', 'saveProfileExtra',
];

function declaration(lignes, nom) {
  const debut = lignes.findIndex((l) => l.startsWith(`const ${nom} = `));
  if (debut < 0) throw new Error(`refus : \`const ${nom}\` est introuvable dans la version d’origine`);
  if (lignes[debut].trimEnd().endsWith(';')) return lignes[debut];
  const fin = lignes.findIndex((l, i) => i > debut && l === '};');
  if (fin < 0) throw new Error(`refus : la fin de \`${nom}\` est introuvable`);
  return lignes.slice(debut, fin + 1).join('\n');
}

function morceauxOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [declaration(lignes, 'ROLE_LABELS')];
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
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { ROLE_LABELS, ${FONCTIONS.join(', ')} });`;
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

/** Un faux document : la vue, et les champs que le balisage rendu porte. */
function faireDom(capture, champs) {
  const faire = (id) => ({
    id,
    value: Object.prototype.hasOwnProperty.call(champs, id) ? champs[id] : '',
    style: {},
    addEventListener: () => {},
    focus: () => {},
  });
  const vue = {
    set innerHTML(v) { capture.vue = v; },
    get innerHTML() { return capture.vue; },
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  const ids = () => new Set([...String(capture.vue).matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  return {
    getElementById: (id) => {
      if (id === 'mainView') return vue;
      if (!ids().has(id)) return null;
      if (!capture.elements.has(id)) capture.elements.set(id, faire(id));
      return capture.elements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function bacCommun(capture, refs, me, champs, tab) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, CURRENT_LANG: 'fr', REFS: refs, ME: me,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    oasisToast: (m, g, d) => capture.bandeaux.push(`${g}:${m}:${d}`),
    showToast: (m, g = 'success', d = 4000) => bac.window.oasisToast(m, g, d),
    oasisMessageErreur: () => 'erreur',
    oasisConfirmer: async () => capture.confirme,
    loadMe: async () => { capture.loadMe += 1; },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: faireDom(capture, champs),
    FileReader: class {
      constructor() { this.result = 'data:image/png;base64,QUJD'; this.onload = null; }
      readAsDataURL() {
        if (!this.onload) return undefined;
        const p = this.onload();
        capture.lectures.push(Promise.resolve(p));
        return p;
      }
    },
  };
  bac.window = bac;
  const transport = async (chemin, options) => {
    capture.appels.push({
      chemin,
      methode: (options || {}).method || 'GET',
      corps: (options || {}).body === undefined ? null : String((options || {}).body),
    });
    if (capture.refus) {
      return { ok: false, status: 400, json: async () => ({ error: 'policy', details: { minLength: 12 } }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = () => ({
  vue: '', appels: [], bandeaux: [], loadMe: 0, loadRefs: 0, confirme: true,
  refus: false, elements: new Map(), lectures: [],
});

/** Les sas dont ce bloc a besoin : icônes, schémas, barre, libellés, comptes, paramètres. */
const SAS = ['icons.js', 'schemas.js', 'barre.js', 'utilisateurs.js', 'parametres.js'];

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

function charger(cote, refs, me, champs, tab) {
  const capture = neuf();
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
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'profil.js'), 'utf8'),
      bac, { filename: 'profil.js' });
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

async function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const tab = libelles();
  const presta = (refs.prestataires || [])[0] || { id: 'p0', nom: 'Prestataire d’essai' };

  console.log('\n═══ L’écran du profil, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/profil.js\n');

  const hostile = '<b>"L\'étau" & co</b>';
  const base = {
    username: 'moi@a.bj', email: 'moi@a.bj', nom: 'DIALLO', prenom: 'Awa',
    telephone: '+22997000000', fonction: 'Inspectrice', active: true,
    createdAt: '2026-01-02T10:00:00Z', passwordChangedAt: '2026-03-04T08:00:00Z',
  };
  const session = (u) => ({
    user: { ...base, ...u },
    instance: { etat: 'Bénin', codeEtat: 'BJ' },
    instance_vue: {},
  });

  // ── Chaque rôle, et il commande les deux sections facultatives ──
  const ROLES = ['SUPERADMIN', 'ADMIN', 'ADMIN_PRESTATAIRE', 'PRESTATAIRE', 'INDEPENDANT',
    'AAC', 'INSPECTEUR', 'ROLE_INCONNU'];
  const REGIMES = [];
  for (const role of ROLES) {
    REGIMES.push([`rôle ${role}`, session({ role, prestataire_id: presta.id })]);
  }
  // Sans photo, avec photo, un nom hostile, un compte inactif, et le vide.
  REGIMES.push(['avec photo', session({ role: 'ADMIN', photo: 'data:image/png;base64,QUJD' })]);
  REGIMES.push(['nom hostile', session({ role: 'ADMIN', nom: hostile, prenom: hostile, fonction: hostile })]);
  REGIMES.push(['compte inactif', session({ role: 'ADMIN', active: false })]);
  REGIMES.push(['sans nom ni prénom', session({ role: 'AAC', nom: '', prenom: '', fullName: '' })]);
  REGIMES.push(['nom composé seul', session({ role: 'AAC', nom: undefined, prenom: undefined, fullName: 'KONE Ibrahim Sekou' })]);
  REGIMES.push(['sans date de mot de passe', session({ role: 'ADMIN', passwordChangedAt: undefined, createdAt: undefined })]);
  // Les extras renseignés : la branche active des deux sections.
  const extras = { poste: 'Chef', service: 'Qualité', adressePro: hostile, profession: 'Expert', organisation: 'Cabinet', agrement: 'A-12', adresse: 'BP 1' };
  REGIMES.push(['prestataire avec extras', session({ role: 'PRESTATAIRE', prestataire_id: presta.id, extra: extras })]);
  REGIMES.push(['indépendant avec extras', session({ role: 'INDEPENDANT', extra: extras })]);
  REGIMES.push(['prestataire sans rattachement', session({ role: 'ADMIN_PRESTATAIRE', prestataire_id: 'néant' })]);

  for (const [nom, me] of REGIMES) {
    const o = charger('origine', copie(refs), copie(me), {}, tab);
    const n = charger('nouvelle', copie(refs), copie(me), {}, tab);
    /* eslint-disable no-await-in-loop */
    await o.w.renderProfile(); await n.w.renderProfile();
    /* eslint-enable no-await-in-loop */
    pareil(`${nom} · #mainView`, o.capture.vue, n.capture.vue);
    pareil(`${nom} · /api/referentiels demandé`,
      o.capture.appels.filter((a) => a.chemin === '/api/referentiels').length,
      n.capture.appels.filter((a) => a.chemin === '/api/referentiels').length);
  }

  // ── Les référentiels absents : le rendu doit les charger ──
  {
    const me = session({ role: 'PRESTATAIRE' });
    const o = charger('origine', {}, copie(me), {}, tab);
    const n = charger('nouvelle', {}, copie(me), {}, tab);
    await o.w.renderProfile(); await n.w.renderProfile();
    // ── Le compteur a cédé la place à la route (5.e.4) ──
    //
    // `loadRefs` était un faux dans le bac et comptait ses appels. Il vient
    // maintenant du module construit, des deux côtés : ce qui se compare est donc
    // la **route lue**, que le transport relève déjà. C'est plus proche de ce que
    // la page fait, et cela ne dépend plus d'un compteur à moi.
    const demandeRefs = (c) => c.appels.filter((a) => a.chemin === '/api/referentiels').length;
    pareil('référentiels absents · /api/referentiels demandé', demandeRefs(o.capture), demandeRefs(n.capture));
    pareil('référentiels absents · #mainView', o.capture.vue, n.capture.vue);
    comparaisons += 1;
    if (demandeRefs(o.capture) !== 1) {
      ecarts.push('garde : l’origine ne demande plus `/api/referentiels` quand ils manquent');
    }
  }

  // ── `pfExtraSection` appelée directement ──
  {
    const o = charger('origine', copie(refs), session({ role: 'ADMIN' }), {}, tab);
    const n = charger('nouvelle', copie(refs), session({ role: 'ADMIN' }), {}, tab);
    const jeux = [
      ['section active', 'presta', 'Titre & <b>x</b>', '(indication)', true,
        [['aId', 'Libellé & "x"', 'valeur <b>', true], ['bId', 'Vide', '', false], ['cId', 'Nul', null, false]]],
      ['section grisée', 'indep', hostile, hostile, false,
        [['dId', hostile, hostile, false], ['eId', 'Lecture seule', 'auto', true]]],
      ['section sans champ', 'presta', 'Rien', '', true, []],
    ];
    for (const [quoi, cle, titre, hint, actif, champs] of jeux) {
      pareil(`pfExtraSection · ${quoi}`,
        o.w.pfExtraSection(cle, titre, hint, actif, copie(champs)),
        n.w.pfExtraSection(cle, titre, hint, actif, copie(champs)));
    }
  }

  // ── Les cinq corps de requête ──
  const champs = {
    pfNom: '  DIALLO & <b>Cie</b>  ', pfPrenom: '  Awa  ', pfTel: '', pfFonction: '  Inspectrice  ',
    pfOld: 'ancien-mdp', pfNew: 'nouveau-mdp', pfConfirm: 'nouveau-mdp',
    pxPoste: ' Chef ', pxService: ' Qualité ', pxAdresse: ' BP 1 ',
    ixProfession: ' Expert ', ixOrganisation: ' Cabinet ', ixAgrement: ' A-12 ', ixAdresse: ' BP 2 ',
  };
  for (const [nomRole, role] of [['prestataire', 'PRESTATAIRE'], ['indépendant', 'INDEPENDANT']]) {
    const me = session({ role, prestataire_id: presta.id, extra: extras });
    const o = charger('origine', copie(refs), copie(me), champs, tab);
    const n = charger('nouvelle', copie(refs), copie(me), champs, tab);
    /* eslint-disable no-await-in-loop */
    await o.w.renderProfile(); await n.w.renderProfile();

    const envoi = async (cote, geste, arg) => {
      cote.capture.appels.length = 0;
      cote.capture.bandeaux.length = 0;
      await cote.w[geste](arg);
      // ── On vide la file des micro-tâches, et non une promesse retenue ──
      //
      // `uploadProfilePhoto` pose un `onload` que personne n'attend. L'original le
      // laissait **rendre** la promesse de l'enregistrement, et la retenir
      // suffisait ; le module ne peut pas la rendre — le type de `onload` ne le
      // permet pas — et la lecture arrivait alors avant la requête.
      //
      // Deux tours de boucle d'événements, des deux côtés : la mesure ne dépend
      // plus de la longueur d'une chaîne de promesses. *Une comparaison qui
      // dépend de l'ordre des micro-tâches n'est pas une comparaison* (5.e.0).
      await Promise.all(cote.capture.lectures);
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      return JSON.stringify({ appels: cote.capture.appels, bandeaux: cote.capture.bandeaux, loadMe: cote.capture.loadMe });
    };
    pareil(`${nomRole} · saveProfileInfos — ce qui partirait`, await envoi(o, 'saveProfileInfos'), await envoi(n, 'saveProfileInfos'));
    pareil(`${nomRole} · saveProfileExtra(presta)`, await envoi(o, 'saveProfileExtra', 'presta'), await envoi(n, 'saveProfileExtra', 'presta'));
    pareil(`${nomRole} · saveProfileExtra(indep)`, await envoi(o, 'saveProfileExtra', 'indep'), await envoi(n, 'saveProfileExtra', 'indep'));
    // `removeProfilePhoto` n'est **pas** comparé, et c'est dit : il passe par la
    // confirmation du socle, qui bâtit un dialogue dans le document et attend un
    // clic. Un faux document ne le résoudrait pas, et le remplacer par un stub
    // d'un seul côté mesurerait mon montage. La suite « parcours » le couvre
    // (5.c.14), et le corps qu'il envoie est celui de `saveProfile({ photo: '' })`
    // — la même fonction que les six autres gestes comparés ici.
    // Le dépôt d'une photo : un fichier léger, puis un trop lourd.
    const fichier = (taille) => ({ files: [{ size: taille, name: 'p.png' }] });
    pareil(`${nomRole} · uploadProfilePhoto (1 Mo)`, await envoi(o, 'uploadProfilePhoto', fichier(1024 * 1024)), await envoi(n, 'uploadProfilePhoto', fichier(1024 * 1024)));
    pareil(`${nomRole} · uploadProfilePhoto (3 Mo, refusé)`, await envoi(o, 'uploadProfilePhoto', fichier(3 * 1024 * 1024)), await envoi(n, 'uploadProfilePhoto', fichier(3 * 1024 * 1024)));
    pareil(`${nomRole} · uploadProfilePhoto (aucun fichier)`, await envoi(o, 'uploadProfilePhoto', { files: [] }), await envoi(n, 'uploadProfilePhoto', { files: [] }));
    /* eslint-enable no-await-in-loop */
  }

  // ── Le mot de passe : trois refus, puis le succès qui vide les champs ──
  const CAS = [
    ['ancien vide', { pfOld: '', pfNew: 'a', pfConfirm: 'a' }, false],
    ['confirmation discordante', { pfOld: 'x', pfNew: 'a', pfConfirm: 'b' }, false],
    ['politique refusée', { pfOld: 'x', pfNew: 'a', pfConfirm: 'a' }, true],
    ['succès', { pfOld: 'x', pfNew: 'a', pfConfirm: 'a' }, false],
  ];
  for (const [quoi, jeu, refus] of CAS) {
    const me = session({ role: 'ADMIN' });
    const o = charger('origine', copie(refs), copie(me), { ...champs, ...jeu }, tab);
    const n = charger('nouvelle', copie(refs), copie(me), { ...champs, ...jeu }, tab);
    /* eslint-disable no-await-in-loop */
    await o.w.renderProfile(); await n.w.renderProfile();
    o.capture.refus = refus; n.capture.refus = refus;
    for (const cote of [o, n]) { cote.capture.appels.length = 0; cote.capture.bandeaux.length = 0; }
    await o.w.submitProfilePassword(); await n.w.submitProfilePassword();
    /* eslint-enable no-await-in-loop */
    const etat = (cote) => JSON.stringify({
      appels: cote.capture.appels,
      bandeaux: cote.capture.bandeaux,
      loadMe: cote.capture.loadMe,
      champs: ['pfOld', 'pfNew', 'pfConfirm'].map((id) => (cote.capture.elements.get(id) || {}).value),
    });
    pareil(`mot de passe · ${quoi}`, etat(o), etat(n));
  }

  // ── Les gardes ──
  //
  // Le balisage comparé doit porter les **deux** branches du cadre de photo et
  // les **deux** branches d'une section facultative. Sans quoi la moitié de
  // chacune ne serait plus éprouvée nulle part — ce qui est arrivé à
  // `circuitHtml` en 5.d.3.
  {
    const avec = charger('nouvelle', copie(refs), session({ role: 'ADMIN', photo: 'data:image/png;base64,QUJD' }), {}, tab);
    const sans = charger('nouvelle', copie(refs), session({ role: 'ADMIN' }), {}, tab);
    const act = charger('nouvelle', copie(refs), session({ role: 'PRESTATAIRE', extra: extras }), {}, tab);
    await avec.w.renderProfile(); await sans.w.renderProfile(); await act.w.renderProfile();
    comparaisons += 4;
    if (!/pf-photo-img/.test(avec.capture.vue) || !/shell-btn-danger/.test(avec.capture.vue)) {
      ecarts.push('garde : le régime « avec photo » ne porte plus l’image ou son bouton de retrait');
    }
    if (!/pf-photo-initials/.test(sans.capture.vue) || /shell-btn-danger/.test(sans.capture.vue)) {
      ecarts.push('garde : le régime « sans photo » ne porte plus les initiales, ou porte encore le bouton de retrait');
    }
    if (!/pf-section-disabled/.test(sans.capture.vue)) {
      ecarts.push('garde : aucune section grisée dans le balisage comparé — la moitié de `pfExtraSection` n’est plus éprouvée');
    }
    if (!/saveProfileExtra\('presta'\)/.test(act.capture.vue)) {
      ecarts.push('garde : aucune section active dans le balisage comparé — l’autre moitié de `pfExtraSection` n’est plus éprouvée');
    }
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  dont les quatre corps de requête et les quatre issues du changement de');
  console.log('  mot de passe — y compris les trois champs que le succès doit vider.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
