#!/usr/bin/env node
/**
 * OASIS — Les exigences réglementaires, avant et après la conversion.
 *
 * ADR-003, 5.d.2. Même discipline que `comparer-schemas.js` et
 * `comparer-referentiels.js` : la version d'origine est lue **dans `git`**, et
 * la preuve reste rejouable après l'édition.
 *
 * ── Trois fonctions pures sur sept ──
 *
 * `cfgSectionExigences`, le panneau et le formulaire du règlement rendent des
 * chaînes de balisage. Ce sont les trois gros morceaux, et ceux où une espace de
 * différence se verrait. Ils se comparent ici, caractère pour caractère.
 *
 * Les quatre autres — `toggleExigGroup`, `saveExigDrawer`, `saveReglement`,
 * `closeExigDrawer` — agissent sur le document ou sur l'API, et sont couverts
 * par la suite « parcours » depuis 5.c.12 : la ronde complète d'une exigence, le
 * renommage d'un règlement sur **deux** exigences, et l'annulation qui n'écrit
 * rien.
 *
 * ── Les bandeaux dépliés, et pourquoi ils sont joués dans les deux états ──
 *
 * `cfgSectionExigences` rend une classe `collapsed` selon un ensemble que
 * `toggleExigGroup` tient. Comparer l'état fermé seul laisserait la moitié du
 * balisage non vérifiée — c'est la leçon des bascules (5.c.15) : un état mesuré
 * d'un seul côté n'est pas mesuré.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_EXIG_ORIGINE || 'bbed24a';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'exigences.js'))) {
    console.error('refus : public/app/exigences.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_EXIG_ORIGINE=<sha>.');
    process.exit(2);
  }
}

const FONCTIONS = [
  'cfgSectionExigences', 'openExigDrawer', 'closeExigDrawer', 'openReglementForm',
  'toggleExigGroup', 'fmtDay',
];

/** Extraction par nom, et refus si un nom manque. Voir 5.d.1 pour la raison. */
function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
      || l.startsWith(`window.${nom} = function`)
      || l.startsWith(`window.${nom} = async function`));
    if (debut < 0) throw new Error(`refus : « ${nom} » est introuvable dans la version d’origine`);
    // `closeExigDrawer` tient sur une seule ligne dans l'original.
    if (lignes[debut].trimEnd().endsWith('};')) { morceaux.push(lignes[debut]); continue; }
    let fin = -1;
    for (let i = debut + 1; i < lignes.length; i += 1) {
      if (lignes[i] === '}' || lignes[i] === '};') { fin = i; break; }
    }
    if (fin < 0) throw new Error(`refus : la fin de « ${nom} » est introuvable`);
    morceaux.push(lignes.slice(debut, fin + 1).join('\n'));
  }
  return `const EXIG_OPEN = window.__EXIG_OPEN;\n${morceaux.join('\n\n')}\n;Object.assign(window, { ${FONCTIONS.join(', ')} });`;
}

function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Les **vraies** icônes, des deux côtés : la leçon de 5.d.1, où une icône
// factice d'un seul côté avait rendu 629 écarts — c'est-à-dire la mesure du
// montage, non du code.
function iconeReelle() {
  const bac = { console };
  bac.window = bac;
  vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'icons.js'), 'utf8'), bac, { filename: 'icons.js' });
  if (typeof bac.window.icon !== 'function') {
    console.error('refus : public/app/icons.js ne pose pas `icon`.');
    process.exit(2);
  }
  return bac.window.icon;
}
const icon = iconeReelle();
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
const escArg = (v) => oasisEsc(JSON.stringify(String(v ?? '')));


function libelles() {
  const src = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'traductions.fr.ts'), 'utf8');
  const table = {};
  for (const m of src.matchAll(/^ {4}([a-z0-9_]+): (['"`])((?:\\.|(?!\2).)*)\2,?$/gm)) {
    table[m[1]] = m[3].replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');
  }
  if (Object.keys(table).length < 200) throw new Error('table de libellés trop courte');
  return table;
}

function documentMinimal(capture) {
  const racine = { set innerHTML(v) { capture.html = v; }, get innerHTML() { return capture.html; } };
  return {
    getElementById: (id) => (id === 'exigDrawerRoot' ? racine : null),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function chargerOrigine(refs, lang, ouverts, tab) {
  const capture = { html: '' };
  const bac = {
    REFS: refs, CURRENT_LANG: lang, console,
    esc: oasisEsc, oasisEsc, icon, escArg,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    document: documentMinimal(capture),
    renderConfig: () => {},
  };
  bac.window = bac;
  bac.__EXIG_OPEN = new Set(ouverts);
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  return {
    section: () => bac.window.cfgSectionExigences(),
    drawer: (...a) => { capture.html = ''; bac.window.openExigDrawer(...a); return capture.html; },
    reglement: (r) => { capture.html = ''; bac.window.openReglementForm(r); return capture.html; },
    fmtDay: bac.window.fmtDay,
  };
}

function chargerNouvelle(refs, lang, ouverts) {
  const capture = { html: '' };
  const bac = { console };
  bac.window = bac;
  Object.assign(bac, {
    REFS: refs, CURRENT_LANG: lang, oasisEsc,
    document: documentMinimal(capture),
    localStorage: { getItem: () => null, setItem: () => {} },
    renderConfig: () => {},
  });
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'exigences.js'), 'utf8'),
    bac, { filename: 'public/app/exigences.js' });
  // L'ensemble des bandeaux dépliés est privé au module : on l'amène au même
  // état par le geste lui-même, qui est la seule porte d'entrée.
  ouverts.forEach((k) => bac.window.toggleExigGroup(k === '__none__' ? '' : k));
  return {
    section: () => bac.window.cfgSectionExigences(),
    drawer: (...a) => { capture.html = ''; bac.window.openExigDrawer(...a); return capture.html; },
    reglement: (r) => { capture.html = ''; bac.window.openReglementForm(r); return capture.html; },
    fmtDay: null,
  };
}

let comparaisons = 0;
const ecarts = [];
function pareil(quoi, a, b) {
  comparaisons += 1;
  if (a !== b) {
    const i = [...String(a)].findIndex((c, k) => c !== String(b)[k]);
    ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine  : …${String(a).slice(Math.max(0, i - 40), i + 60)}…\n      nouvelle : …${String(b).slice(Math.max(0, i - 40), i + 60)}…`);
  }
}

const copie = (o) => JSON.parse(JSON.stringify(o));

function comparerRegime(nom, donnees, lang, ouverts, tab) {
  const o = chargerOrigine(copie(donnees), lang, ouverts, tab);
  const n = chargerNouvelle(copie(donnees), lang, ouverts);
  const p = (s) => `${nom} · ${s}`;

  pareil(p('cfgSectionExigences()'), o.section(), n.section());
  pareil(p('openExigDrawer(nouveau règlement)'), o.drawer(null, null, null, true), n.drawer(null, null, null, true));
  pareil(p('openExigDrawer(ajout au groupe)'),
    o.drawer(null, 'RAB-OPS (Exploitation)', '2023-06-15'),
    n.drawer(null, 'RAB-OPS (Exploitation)', '2023-06-15'));
  pareil(p('openExigDrawer(groupe sans date)'), o.drawer(null, 'Sans date', ''), n.drawer(null, 'Sans date', ''));
  for (const e of donnees.exigences || []) {
    pareil(p(`openExigDrawer(${e.id})`), o.drawer(e.id), n.drawer(e.id));
    pareil(p(`openReglementForm(${e.reglement})`), o.reglement(e.reglement), n.reglement(e.reglement));
  }
  pareil(p('openReglementForm(inconnu)'), o.reglement('néant'), n.reglement('néant'));
  pareil(p('openReglementForm(vide)'), o.reglement(''), n.reglement(''));
}

function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const tab = libelles();
  console.log('\n═══ Les exigences réglementaires, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/exigences.js\n');

  const regles = [...new Set((refs.exigences || []).map((e) => e.reglement || '__none__'))];

  // Tous bandeaux fermés — l'état d'ouverture de l'écran.
  comparerRegime('fr, tous fermés', refs, 'fr', [], tab);
  // Tous dépliés — l'autre moitié du balisage.
  comparerRegime('fr, tous dépliés', refs, 'fr', regles, tab);
  // Un seul déplié : le mélange, où une classe mal posée se verrait.
  comparerRegime('fr, un seul déplié', refs, 'fr', regles.slice(0, 1), tab);
  // Une autre langue : `fmtDay` formate la date selon `CURRENT_LANG`.
  comparerRegime('en, tous dépliés', refs, 'en', regles, tab);
  comparerRegime('pt, tous dépliés', refs, 'pt', regles, tab);

  // Un règlement sans date, et une exigence sans règlement : les deux replis du
  // balisage, absents du jeu d'essai.
  const bricole = copie(refs);
  bricole.exigences = [
    ...(refs.exigences || []),
    { id: 'z1', reference: 'SANS-REG', libelle: 'Orpheline', statut: 'actif', reglement: '' },
    { id: 'z2', reference: 'SANS-DATE', libelle: 'Sans date <b>&', statut: 'inactif', reglement: 'ZZ « Guillemets »' },
  ];
  const reglesBricole = [...new Set(bricole.exigences.map((e) => e.reglement || '__none__'))];
  comparerRegime('fr, orpheline et sans date, dépliés', bricole, 'fr', reglesBricole, tab);
  comparerRegime('fr, orpheline et sans date, fermés', bricole, 'fr', [], tab);

  // Et `fmtDay`, isolé : ses trois chemins.
  const o = chargerOrigine(copie(refs), 'fr', [], tab);
  for (const v of ['2023-06-15', '', null, undefined, 'pas une date', '2023-02-30T00:00:00Z']) {
    comparaisons += 1;
    const attendu = o.fmtDay(v);
    // Le module n'expose pas `fmtDay` en globale : on le mesure à travers le
    // balisage, où il est le seul à formater une date.
    const html = chargerNouvelle(copie({ ...refs, exigences: [{ id: 'd', reference: 'R', libelle: 'L', statut: 'actif', reglement: 'G', date_adoption: v }] }), 'fr', ['G']).section();
    const vu = /Date d'adoption : ([^<]*)</.exec(html);
    const rendu = vu ? vu[1] : '(absent)';
    const attenduHtml = v ? attendu : '(absent)';
    if (rendu !== attenduHtml) {
      ecarts.push(`fmtDay(${JSON.stringify(v)}) : origine « ${attenduHtml} » ≠ nouvelle « ${rendu} »`);
    }
  }

  console.log(`  ${comparaisons} comparaisons de balisage, caractère pour caractère`);
  console.log('  Les quatre gestes qui touchent au document ou à l’API sont couverts par');
  console.log('  la suite « parcours » (ronde d’une exigence et renommage, 5.c.12).');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal();
