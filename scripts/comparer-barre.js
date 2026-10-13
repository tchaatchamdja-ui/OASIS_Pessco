#!/usr/bin/env node
/**
 * OASIS — Les libellés littéraux et la barre d'écran, avant et après.
 *
 * ADR-003, 5.e.0 — **première pièce d'`app.js`**, le dernier JavaScript du
 * portail.
 *
 * ── Pourquoi ce bloc en premier ──
 *
 * Ce ne sont pas les plus grosses fonctions, ce sont **les plus empruntées** :
 * `tr`, `searchInputHtml` et `exportBar` sont les trois noms que les cinq
 * modules convertis en 5.d lisent encore sur `window`, faute de pouvoir les
 * atteindre autrement. Les convertir rend les trois prêts **à la source** :
 * `referentiels.ts` et ses voisins les importeront au lieu de les lire.
 *
 * ── Ce qui se compare, et comment ──
 *
 *   · `tr` sur **chaque clé** de sa table, dans les trois langues, plus les
 *     clés absentes. C'est exhaustif par construction : les clés sont relevées
 *     dans la table d'origine, non choisies.
 *   · `searchInputHtml` dans les quatre états de `PORTAIL_RECHERCHE` — au repos,
 *     ouverte, avec une valeur, ouverte et vide —, atteints **par les gestes**
 *     d'un côté et par l'état de l'autre : deux chemins vers le même balisage.
 *   · `exportBar`, avec et sans fonction PDF, sur un intitulé hostile.
 *   · `openImportModal` : le balisage capté d'un `innerHTML`.
 *   · `exportPdf` et `exportPdfActivites` : le **document PDF entier**, capté en
 *     remplaçant `window.open`. Le second bâtit quatre tables depuis les vrais
 *     référentiels — c'est la plus longue chaîne de ce bloc.
 *   · `doImport` : le corps de la requête, capté comme en 5.d.5.
 *
 * `filterScope` et les quatre gestes de la recherche agissent sur le document en
 * place — ils sont couverts par la suite « parcours » (« la recherche du portail
 * s'ouvre, filtre et se vide », 5.c). Leur **effet sur l'état** se lit ici, dans
 * le balisage que `searchInputHtml` rend après eux.
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
 * 355 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-barre 8b2452e
 *     cd /tmp/oasis-barre && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-barre.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 355 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_BARRE_ORIGINE || 'b2e581b';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'portail.js'))) {
    console.error('refus : public/app/portail.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  let texte;
  try {
    texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Donner le bon commit par OASIS_BARRE_ORIGINE=<sha>.');
    process.exit(2);
  }
  if (!texte.includes('function tr(fr)') || !texte.includes('const CFG_I18N = {')) {
    console.error(`refus : ${SOURCE_ORIGINE} ne porte plus \`tr\` ni sa table.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    process.exit(2);
  }
  return texte;
}

const FONCTIONS = [
  'tr', 'searchInputHtml', 'portailOuvrirRecherche', 'portailChercher',
  'portailViderRecherche', 'portailFermerRechercheSiVide',
  'portailReinitialiserRecherche', 'exportBar', 'pdfWindow', 'exportPdf',
  'exportPdfActivites', 'openImportModal', 'doImport', 'filterScope',
];

/** Un `const` du premier niveau : on reprend sa déclaration entière. */
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
  const morceaux = [declaration(lignes, 'CFG_I18N'), declaration(lignes, 'PORTAIL_RECHERCHE')];
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
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { CFG_I18N, PORTAIL_RECHERCHE, ${FONCTIONS.join(', ')} });`;
}

/** Les clés de la table d'origine, **relevées** : la comparaison est exhaustive. */
function clesOrigine(texte) {
  const bloc = declaration(texte.split('\n'), 'CFG_I18N');
  const bac = { resultat: null };
  vm.createContext(bac);
  vm.runInContext(`${bloc}\nresultat = CFG_I18N;`, bac);
  const cles = Object.keys(bac.resultat);
  if (cles.length < 50) throw new Error(`refus : ${cles.length} clés relevées — la table a changé de forme`);
  return cles;
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
const { icon } = duSas(['icon']);

function libelles() {
  const src = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'traductions.fr.ts'), 'utf8');
  const table = {};
  for (const m of src.matchAll(/^ {4}([a-z0-9_]+): (['"`])((?:\\.|(?!\2).)*)\2,?$/gm)) {
    table[m[1]] = m[3].replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');
  }
  if (Object.keys(table).length < 200) throw new Error('table de libellés trop courte');
  return table;
}

/** Le document minimal, et la fenêtre PDF captée. */
function documentMinimal(capture) {
  const racine = { set innerHTML(v) { capture.modal = v; }, get innerHTML() { return capture.modal; } };
  const champ = { files: [{ name: 'c.xlsx' }] };
  return {
    getElementById: (id) => {
      if (id === 'cfgModalRoot') return racine;
      if (id === 'importFile') return champ;
      if (id === 'mainView') return capture.portee;
      return null;
    },
    querySelector: (sel) => (sel === '.cfg-content' ? capture.portee : null),
    querySelectorAll: () => [],
    createElement: () => ({ classList: { add: () => {} }, appendChild: () => {}, style: {} }),
  };
}

/** Une portée de rendu : deux tables, pour qu'`exportPdf` ait quelque chose à prendre. */
function portee() {
  const tables = [
    { outerHTML: '<div class="shell-table-container"><table><tr><td>un &amp; deux</td></tr></table></div>' },
    { outerHTML: '<div class="shell-table-container"><table><tr><td>trois</td></tr></table></div>' },
  ];
  return { querySelectorAll: (sel) => (sel === '.shell-table-container' ? tables : []) };
}

function bacCommun(capture, refs, lang, tab) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, icon, CURRENT_LANG: lang, REFS: refs,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    oasisToast: (m, g, d) => capture.bandeaux.push(`${g}:${m}:${d}`),
    showToast: (m, g = 'success', d = 4000) => bac.window.oasisToast(m, g, d),
    oasisMessageErreur: () => 'erreur',
    closeRefModal: () => { capture.fermetures += 1; },
    renderConfig: async () => { capture.rendus += 1; },
    setTimeout: (f) => { capture.differes += 1; return f && 0; },
    document: documentMinimal(capture),
    // La fenêtre d'impression : on garde ce qui s'y écrit, et les deux gestes.
    open: () => ({
      document: {
        write: (html) => { capture.pdf += html; },
        close: () => { capture.pdf += '\n[close]'; },
      },
      focus: () => { capture.pdf += '\n[focus]'; },
      print: () => { capture.pdf += '\n[print]'; },
    }),
    // ── Le lecteur de fichier, et une comparaison qui tenait à la chance ──
    //
    // `doImport` pose un `onload` **et ne l'attend pas** : des deux côtés, la
    // requête part dans une chaîne de promesses que personne ne tient. La
    // première version de ce comparateur lisait le compte rendu juste après
    // l'appel, et passait — parce que les deux chaînes avaient par hasard le même
    // nombre de micro-tâches. Le régime « avec des lignes ignorées » l'a cassé :
    // l'enveloppe du module ajoute une attente, et son compte rendu arrivait
    // après ma lecture.
    //
    // *Une comparaison qui dépend de l'ordre des micro-tâches n'est pas une
    // comparaison.* La promesse de chaque lecture est donc retenue ici, et
    // attendue avant de comparer.
    FileReader: class {
      constructor() { this.result = 'data:application/vnd.ms-excel;base64,QUJD'; this.onload = null; }
      readAsDataURL() {
        if (!this.onload) return undefined;
        const p = this.onload();
        capture.lectures.push(Promise.resolve(p));
        return p;
      }
    },
  };
  bac.window = bac;
  bac.capture = capture;
  capture.portee = portee();
  const transport = async (chemin, options) => {
    capture.appels.push({
      chemin,
      methode: (options || {}).method || 'GET',
      corps: (options || {}).body === undefined ? null : String((options || {}).body),
    });
    return {
      ok: true,
      status: 200,
      // Les lignes ignorées sont **demandées** par le régime : sans elles, le
      // compte rendu n'a qu'une branche, et retirer l'autre reste vert. C'est un
      // contre-essai qui me l'a dit.
      json: async () => ({ added: 2, updated: 1, errors: capture.erreursImport || [] }),
    };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = () => ({
  modal: '', pdf: '', appels: [], bandeaux: [], fermetures: 0, loadRefs: 0,
  rendus: 0, differes: 0, portee: null, erreursImport: [], lectures: [],
});

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

function charger(cote, refs, lang, tab) {
  const capture = neuf();
  const bac = bacCommun(capture, refs, lang, tab);
  vm.createContext(bac);
  poserOutils(bac);
  // Les schémas des deux côtés : `exportPdfActivites` appelle `refLabel`.
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'schemas.js'), 'utf8'), bac, { filename: 'schemas.js' });
  if (cote === 'origine') {
    vm.runInContext(morceauxOrigine(sourceOrigine()), bac, { filename: 'app.js (origine)' });
  } else {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'barre.js'), 'utf8'), bac, { filename: 'barre.js' });
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
  const cles = clesOrigine(sourceOrigine());

  console.log('\n═══ Les libellés littéraux et la barre d’écran, avant et après ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/barre.js');
  console.log(`  ${cles.length} libellés relevés dans la table d’origine\n`);

  for (const lang of ['fr', 'en', 'pt', 'de']) {
    const o = charger('origine', copie(refs), lang, tab);
    const n = charger('nouvelle', copie(refs), lang, tab);

    // ── `tr` sur chaque clé, et sur ce qui n'en est pas une ──
    for (const cle of cles) pareil(`${lang} · tr(${cle})`, o.w.tr(cle), n.w.tr(cle));
    for (const absente of ['', 'Clé absente', 'tr', '__proto__', 'constructor']) {
      pareil(`${lang} · tr(absente:${absente || '(vide)'})`, o.w.tr(absente), n.w.tr(absente));
    }

    // ── La barre d'export, et l'intitulé hostile ──
    const hostile = '<b>"L\'étau" & co</b>';
    pareil(`${lang} · exportBar(domaines)`, o.w.exportBar('domaines', 'Domaines'), n.w.exportBar('domaines', 'Domaines'));
    pareil(`${lang} · exportBar(hostile)`, o.w.exportBar('x/y', hostile), n.w.exportBar('x/y', hostile));
    pareil(`${lang} · exportBar(pdf propre)`, o.w.exportBar('themes_supervision', hostile, 'exportPdfActivites()'),
      n.w.exportBar('themes_supervision', hostile, 'exportPdfActivites()'));

    // ── Le champ de recherche, dans ses quatre états ──
    //
    // L'état est atteint **par les gestes** des deux côtés : c'est la seule porte
    // d'entrée du module, et faire autrement comparerait deux montages.
    pareil(`${lang} · recherche au repos`, o.w.searchInputHtml(), n.w.searchInputHtml());
    pareil(`${lang} · recherche au repos (intitulé)`, o.w.searchInputHtml(hostile), n.w.searchInputHtml(hostile));
    for (const cote of [o, n]) cote.w.portailOuvrirRecherche();
    pareil(`${lang} · recherche ouverte, vide`, o.w.searchInputHtml(), n.w.searchInputHtml());
    for (const cote of [o, n]) cote.w.portailChercher({ value: hostile, closest: () => null });
    pareil(`${lang} · recherche avec une valeur`, o.w.searchInputHtml(), n.w.searchInputHtml());
    for (const cote of [o, n]) cote.w.portailFermerRechercheSiVide();
    pareil(`${lang} · fermeture refusée (valeur présente)`, o.w.searchInputHtml(), n.w.searchInputHtml());
    for (const cote of [o, n]) cote.w.portailReinitialiserRecherche();
    pareil(`${lang} · recherche réinitialisée`, o.w.searchInputHtml(), n.w.searchInputHtml());
    // Et le vidage, qui passe par le document : il ne doit pas lever quand la
    // boîte n'existe pas — c'est le cas d'un écran déjà redessiné.
    for (const cote of [o, n]) cote.w.portailViderRecherche();
    pareil(`${lang} · après vidage sans boîte`, o.w.searchInputHtml(), n.w.searchInputHtml());

    // ── Une valeur sans ouverture, et c'est le régime qui manquait ──
    //
    // `searchInputHtml` calcule `ouverte = PORTAIL_RECHERCHE.ouverte || !!valeur`.
    // Tant que toute valeur arrivait **après** une ouverture, retirer la seconde
    // moitié du `||` restait vert. `portailChercher` ne pose que la valeur : c'est
    // le cas d'un champ rempli dont l'écran a été redessiné entre-temps.
    for (const cote of [o, n]) cote.w.portailChercher({ value: 'abc', closest: () => null });
    pareil(`${lang} · valeur sans ouverture`, o.w.searchInputHtml(), n.w.searchInputHtml());
    for (const cote of [o, n]) cote.w.portailReinitialiserRecherche();

    // ── La fenêtre d'import ──
    o.capture.modal = ''; n.capture.modal = '';
    o.w.openImportModal('domaines', hostile);
    n.w.openImportModal('domaines', hostile);
    pareil(`${lang} · openImportModal()`, o.capture.modal, n.capture.modal);

    // ── Les deux documents PDF ──
    o.capture.pdf = ''; n.capture.pdf = '';
    o.w.exportPdf(hostile); n.w.exportPdf(hostile);
    pareil(`${lang} · exportPdf — le document`, o.capture.pdf, n.capture.pdf);
    o.capture.pdf = ''; n.capture.pdf = '';
    o.w.exportPdfActivites(); n.w.exportPdfActivites();
    pareil(`${lang} · exportPdfActivites — le document`, o.capture.pdf, n.capture.pdf);
    pareil(`${lang} · exportPdfActivites — les différés`, o.capture.differes, n.capture.differes);

    // ── Ce que l'import envoie ──
    o.capture.appels.length = 0; n.capture.appels.length = 0;
    /* eslint-disable no-await-in-loop */
    await o.w.doImport('domaines'); await n.w.doImport('domaines');
    await Promise.all([...o.capture.lectures, ...n.capture.lectures]);
    /* eslint-enable no-await-in-loop */
    pareil(`${lang} · doImport — ce qui partirait`,
      JSON.stringify({ appels: o.capture.appels, bandeaux: o.capture.bandeaux, fermetures: o.capture.fermetures, loadRefs: o.capture.loadRefs, rendus: o.capture.rendus }),
      JSON.stringify({ appels: n.capture.appels, bandeaux: n.capture.bandeaux, fermetures: n.capture.fermetures, loadRefs: n.capture.loadRefs, rendus: n.capture.rendus }));

    // ── Et le même import avec des lignes ignorées ──
    //
    // L'autre branche du compte rendu : « N ligne(s) ignorée(s) », un bandeau
    // d'avertissement, et huit secondes au lieu de quatre. Sans ce régime, la
    // retirer restait vert — et c'est le défaut nommé en 5.c.9 qui vit là.
    for (const cote of [o, n]) {
      cote.capture.appels.length = 0;
      cote.capture.bandeaux.length = 0;
      cote.capture.erreursImport = ['ligne 3 : code manquant', 'ligne 7 : doublon'];
    }
    /* eslint-disable no-await-in-loop */
    await o.w.doImport('domaines'); await n.w.doImport('domaines');
    await Promise.all([...o.capture.lectures, ...n.capture.lectures]);
    /* eslint-enable no-await-in-loop */
    pareil(`${lang} · doImport — avec deux lignes ignorées`,
      JSON.stringify({ appels: o.capture.appels, bandeaux: o.capture.bandeaux }),
      JSON.stringify({ appels: n.capture.appels, bandeaux: n.capture.bandeaux }));
  }

  // ── La divergence assumée : la fenêtre d'impression bloquée ──
  //
  // `window.open` rend `null` quand le navigateur bloque les fenêtres, et
  // l'original écrivait `w.document.write` dessus : `TypeError`, console, et rien
  // à l'écran. Le module **lève**, en nommant la cause — même choix qu'en 5.d.1,
  // 5.d.5 et 5.d.6. Ce qui est asserté, c'est que **les deux** lèvent, sur les
  // deux exports.
  for (const geste of ['exportPdf', 'exportPdfActivites']) {
    const o = charger('origine', copie(refs), 'fr', tab);
    const n = charger('nouvelle', copie(refs), 'fr', tab);
    o.bac.open = () => null;
    n.bac.open = () => null;
    const leve = (cote) => {
      try { cote.w[geste]('x'); return null; } catch (e) { return e; }
    };
    const eO = leve(o);
    const eN = leve(n);
    comparaisons += 2;
    if (!eO) ecarts.push(`divergence assumée : l’origine ne lève plus sur \`${geste}\` quand la fenêtre est bloquée — le terme de comparaison a changé`);
    if (!eN) ecarts.push(`divergence assumée : la conversion ne lève plus sur \`${geste}\` quand la fenêtre est bloquée`);
  }

  // ── Les gardes ──
  //
  // Le balisage comparé doit porter les deux états du champ — sans quoi la moitié
  // de `searchInputHtml` ne serait plus éprouvée. Et le document d'activités doit
  // porter ses quatre tables : un référentiel vide rendrait un document juste et
  // vide, que rien ne distinguerait d'un rendu cassé.
  const g = charger('nouvelle', copie(refs), 'fr', tab);
  const repos = g.w.searchInputHtml();
  g.w.portailOuvrirRecherche();
  const ouverte = g.w.searchInputHtml();
  comparaisons += 3;
  if (/ ouverte/.test(repos) || /cfg-search-reset/.test(repos)) {
    ecarts.push('garde : le champ au repos porte la classe « ouverte » ou le bouton de vidage');
  }
  if (!/ ouverte/.test(ouverte) || !/cfg-search-reset/.test(ouverte)) {
    ecarts.push('garde : le champ ouvert ne porte plus la classe ni le bouton de vidage — la moitié de `searchInputHtml` n’est plus éprouvée');
  }
  g.capture.pdf = '';
  g.w.exportPdfActivites();
  const tables = (g.capture.pdf.match(/<table>/g) || []).length;
  if (tables !== 4) {
    ecarts.push(`garde : le document d’activités porte ${tables} table(s) au lieu de 4 — le jeu d’essai ne l’éprouve plus`);
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log('  dont les deux documents PDF entiers et le corps de l’import.');
  console.log('  Les quatre gestes de la recherche et `filterScope` agissent sur le document ;');
  console.log('  leur effet sur l’état se lit ici, et la suite « parcours » couvre le reste.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
