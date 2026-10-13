#!/usr/bin/env node
/**
 * OASIS — Le CRUD générique des référentiels, avant et après la conversion.
 *
 * ADR-003, 5.d.1. Suite de `comparer-schemas.js`, et même discipline : la
 * version d'origine est lue **dans `git`**, non sur le disque, pour que la
 * preuve reste rejouable après l'édition.
 *
 * ── Ce qui est comparé ici, et ce qui l'est ailleurs ──
 *
 * Deux des sept gestes convertis sont **purs** — ils rendent une chaîne de
 * balisage et ne touchent à rien : `refTable` et le corps de la fenêtre. Ce sont
 * aussi les plus volumineux, et ceux où une espace de différence se verrait à
 * l'écran. Ils se comparent donc **caractère pour caractère**, ici, sans
 * navigateur.
 *
 * Les cinq autres agissent sur le document ou sur l'API : `openRefModal`,
 * `saveRef`, `deleteRef`, `orgTypeChanged`, `toggleInspectorFields`. Ceux-là
 * sont couverts par la suite « parcours » — la ronde complète d'un référentiel
 * (créer, modifier, supprimer, confirmation pressée) existe depuis 5.c.7, et le
 * contrôle « une fenêtre d'édition porte la valeur enregistrée » est celui qui
 * attrape une fenêtre qui s'ouvrirait vide.
 *
 * Dire cette répartition importe : une preuve qui laisserait croire qu'elle
 * couvre les sept serait pire qu'aucune preuve.
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
 * 640 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-referentiels 8b2452e
 *     cd /tmp/oasis-referentiels && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-referentiels.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 640 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_REF_ORIGINE || 'f55e9e5';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  const bati = fs.existsSync(path.join(RACINE, 'public', 'app', 'referentiels.js'));
  if (!bati) {
    console.error('refus : public/app/referentiels.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  La version d’origine est le terme de comparaison : sans elle, ce script');
    console.error('  ne mesurerait rien et rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_REF_ORIGINE=<sha>.');
    process.exit(2);
  }
}

// ── Les dépendances que les deux versions partagent ──
//
// Reprises **une seule fois**, et données aux deux : ce sont `app.js` et
// `i18n.js` qui les posent dans la page, et les deux versions les lisent de la
// même façon. Les imiter séparément pour chaque côté risquerait de comparer deux
// imitations plutôt que deux implémentations.
function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// ── Les icônes : les **vraies**, et des deux côtés ──
//
// Ma première écriture donnait une icône factice à l'ancien côté et laissait le
// nouveau prendre celle du module construit. 629 écarts, tous sur la balise
// `<svg>` — c'est-à-dire **la mesure de mon montage**, non du code.
//
// `public/app/icons.js` est le sas qui pose `window.icon` depuis
// `frontend/portail/icones.ts` : c'est la même source que celle qu'embarque le
// module converti. Les deux côtés la chargent donc, et comparent à armes égales.
function iconeReelle() {
  const bac = { console };
  bac.window = bac;
  vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'icons.js'), 'utf8'),
    bac, { filename: 'icons.js' });
  if (typeof bac.window.icon !== 'function') {
    console.error('refus : public/app/icons.js ne pose pas `icon` — lancer `node frontend/construire.mjs`.');
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

/** Les libellés du portail, pris dans la table réelle : `t()` doit rendre la même chose. */
function tablesI18n() {
  const src = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'traductions.fr.ts'), 'utf8');
  const table = {};
  for (const m of src.matchAll(/^ {4}([a-z0-9_]+): (['"`])((?:\\.|(?!\2).)*)\2,?$/gm)) {
    table[m[1]] = m[3].replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');
  }
  if (Object.keys(table).length < 200) throw new Error('table de libellés trop courte — le motif a cessé de mordre');
  return table;
}

// ── Extraire huit fonctions d'un fichier de 1 272 lignes ──
//
// Par leur **nom**, et non par deux bornes de texte : elles n'étaient pas
// contiguës dans l'original, les exigences et l'organigramme s'intercalant entre
// elles. La première écriture de ce script a découpé de `refTable` au bandeau
// des exigences, n'a donc pris qu'une fonction sur huit — et le script est tombé
// sur « o.orgTopLevelType is not a function ». Il valait mieux qu'il tombe là
// qu'il ne compare une fonction en croyant en comparer huit.
//
// La fin d'une fonction est le premier `}` ou `};` **en colonne zéro** : c'est la
// convention de tout ce dépôt, et l'extraction refuse si elle ne la trouve pas.
const FONCTIONS = [
  'refTable', 'openRefModal', 'closeRefModal', 'saveRef', 'deleteRef',
  'orgTypeChanged', 'toggleInspectorFields', 'orgTopLevelType',
];

function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
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
  // Les `window.x = function` posent sur le bac, les `function x` aussi : le bac
  // **est** son propre `window`.
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { ${FONCTIONS.join(', ')} });`;
}

/** Un document minimal : `openRefModal` n'y écrit qu'un `innerHTML`. */
function documentMinimal(capture) {
  const racine = { set innerHTML(v) { capture.html = v; }, get innerHTML() { return capture.html; } };
  return {
    getElementById: (id) => (id === 'cfgModalRoot' ? racine : null),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function chargerOrigine(refs, cfg, me, libelles) {
  const capture = { html: '' };
  const bac = {
    REFS: refs, ME: me, CURRENT_CFG: cfg, console,
    esc: oasisEsc, oasisEsc, icon,
    t: (cle, ...v) => {
      const s = libelles[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    document: documentMinimal(capture),
  };
  bac.window = bac;
  vm.createContext(bac);
  poserBarre(bac);

  // Les schémas viennent du module construit : c'est la version que la page
  // servait au commit d'origine, et 5.d.0 l'a déjà éprouvée ligne à ligne.
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'schemas.js'), 'utf8'),
    bac, { filename: 'schemas.js' });
  // Les huit fonctions converties, extraites **par leur nom** de la version
  // d'origine. Elles n'étaient pas contiguës — les exigences et l'organigramme
  // s'intercalaient —, et découper par deux bornes de texte n'en prenait qu'une.
  vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  return {
    refTable: bac.window.refTable,
    modalHtml: (coll, id, defaults) => {
      capture.html = '';
      bac.window.openRefModal(coll, id, defaults);
      return capture.html;
    },
    orgTopLevelType: bac.window.orgTopLevelType,
  };
}

function chargerNouvelle(refs, cfg, me) {
  const capture = { html: '' };
  const bac = { console };
  bac.window = bac;
  Object.assign(bac, {
    REFS: refs, ME: me, CURRENT_CFG: cfg,
    oasisEsc,
    document: documentMinimal(capture),
    localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'),
    bac, { filename: 'public/app/referentiels.js' });
  return {
    refTable: bac.window.refTable,
    modalHtml: (coll, id, defaults) => {
      capture.html = '';
      bac.window.openRefModal(coll, id, defaults);
      return capture.html;
    },
    orgTopLevelType: bac.window.orgTopLevelType,
  };
}

let comparaisons = 0;
const ecarts = [];
function pareil(quoi, a, b) {
  comparaisons += 1;
  if (a !== b) {
    const i = [...String(a)].findIndex((c, k) => c !== String(b)[k]);
    ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine : …${String(a).slice(Math.max(0, i - 40), i + 60)}…\n      nouvelle : …${String(b).slice(Math.max(0, i - 40), i + 60)}…`);
  }
}

const copie = (o) => JSON.parse(JSON.stringify(o));

function comparerRegime(nom, donnees, cfg, me, libelles) {
  const o = chargerOrigine(copie(donnees), cfg, me, libelles);
  const n = chargerNouvelle(copie(donnees), cfg, me);
  const p = (s) => `${nom} · ${s}`;

  pareil(p('orgTopLevelType()'), o.orgTopLevelType(), n.orgTopLevelType());

  for (const coll of Object.keys(JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8')))) {
    if (!/^(organisation_levels|organisation|domaines|secteurs|sous_activites|themes_supervision|exigences|prestataires|inspecteurs|specialites_inspecteur|types_supervision|modes_supervision|niveaux_qualifications)$/.test(coll)) continue;
    // La table, en premier et en suivant : les deux classes d'en-tête.
    pareil(p(`refTable(${coll}, premier)`), o.refTable(coll, true), n.refTable(coll, true));
    pareil(p(`refTable(${coll}, suivant)`), o.refTable(coll, false), n.refTable(coll, false));
    // La fenêtre de création.
    pareil(p(`openRefModal(${coll})`), o.modalHtml(coll), n.modalHtml(coll));
    // La fenêtre d'édition, sur **chaque** enregistrement réel.
    for (const rec of donnees[coll] || []) {
      pareil(p(`openRefModal(${coll},${rec.id})`), o.modalHtml(coll, rec.id), n.modalHtml(coll, rec.id));
    }
    // Et la fenêtre préréglée, le chemin du « + » d'un accordéon.
    pareil(p(`openRefModal(${coll}, préréglée)`),
      o.modalHtml(coll, '', JSON.stringify({ statut: 'actif' })),
      n.modalHtml(coll, '', JSON.stringify({ statut: 'actif' })));
    // Un préréglage illisible : les deux doivent retomber sur un enregistrement vide.
    pareil(p(`openRefModal(${coll}, préréglage illisible)`),
      o.modalHtml(coll, '', '{pas du json'), n.modalHtml(coll, '', '{pas du json'));
  }
}

function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const libelles = tablesI18n();
  console.log('\n═══ Le CRUD générique des référentiels, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/referentiels.js\n');

  const aac = { aac: { sigle: 'ANAC', nom: "Agence Nationale de l'Aviation Civile" } };
  comparerRegime('régional, AAC renseignée', refs, aac,
    { instance_vue: { instances: ['BJ', 'TG'] } }, libelles);
  comparerRegime('national, AAC renseignée', refs, aac, { instance_vue: {} }, libelles);
  // Sans configuration lue : `CURRENT_CFG` est nul avant le premier rendu, et
  // l'entité de niveau 1 n'a alors rien à reprendre. Le cas se produit si l'on
  // ouvre une fenêtre avant que la configuration soit chargée.
  comparerRegime('configuration non lue', refs, null, { instance_vue: {} }, libelles);
  // Et les collections renversées, pour la même raison qu'en 5.d.0 : un tri que
  // les données satisfont par hasard ne serait pas éprouvé.
  const renverse = {};
  for (const [c, l] of Object.entries(refs)) renverse[c] = Array.isArray(l) ? l.slice().reverse() : l;
  comparerRegime('collections renversées', renverse, aac,
    { instance_vue: { instances: ['BJ', 'TG'] } }, libelles);

  console.log(`  ${comparaisons} comparaisons de balisage, caractère pour caractère`);
  console.log('  Les cinq gestes qui touchent au document ou à l’API sont couverts par');
  console.log('  la suite « parcours » (ronde complète d’un référentiel, 5.c.7).');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 8).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 8) console.log(`    … et ${ecarts.length - 8} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal();
