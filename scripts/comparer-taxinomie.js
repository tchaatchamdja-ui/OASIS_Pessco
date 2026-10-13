#!/usr/bin/env node
/**
 * OASIS — Le personnel et la taxinomie, avant et après la conversion.
 *
 * ADR-003, 5.d.4. Les deux écrans partagent `CFG_OPEN`, et c'est ce que cette
 * comparaison doit éprouver en premier : l'original le tient dans une globale
 * lexicale que le bac remplit, le module dans un ensemble privé que l'on atteint
 * **par ses gestes** — `togglePers` et `toggleAcc`, seules portes d'entrée.
 *
 * Deux chemins différents vers le même état, volontairement : une erreur dans
 * l'une des deux bascules se voit alors dans le balisage.
 *
 * ── Les deux fonctions comparées sont pures ──
 *
 * `cfgSectionPersonnel` et `cfgSectionDomaines` rendent des chaînes. Les deux
 * bascules agissent sur l'état et redessinent : elles sont couvertes par la
 * suite « parcours » depuis 5.c.15, et leur effet se lit ici dans le balisage.
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
 * 22 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-taxinomie 8b2452e
 *     cd /tmp/oasis-taxinomie && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-taxinomie.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 22 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_TAX_ORIGINE || '58750b0';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'taxinomie.js'))) {
    console.error('refus : public/app/taxinomie.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_TAX_ORIGINE=<sha>.');
    process.exit(2);
  }
}

const FONCTIONS = [
  'togglePers', 'cfgSectionPersonnel', 'toggleAcc', 'statutBadge', 'accActions',
  'accAddBtn', 'accItem', 'cfgSectionDomaines',
];

function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
      || l.startsWith(`window.${nom} = function`));
    if (debut < 0) throw new Error(`refus : « ${nom} » est introuvable dans la version d’origine`);
    if (lignes[debut].trimEnd().endsWith('};')) { morceaux.push(lignes[debut]); continue; }
    let fin = -1;
    for (let i = debut + 1; i < lignes.length; i += 1) {
      if (lignes[i] === '}' || lignes[i] === '};') { fin = i; break; }
    }
    if (fin < 0) throw new Error(`refus : la fin de « ${nom} » est introuvable`);
    morceaux.push(lignes.slice(debut, fin + 1).join('\n'));
  }
  return `const CFG_OPEN = window.__CFG_OPEN;\n${morceaux.join('\n\n')}\n;Object.assign(window, { ${FONCTIONS.join(', ')} });`;
}

function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
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

function libelles() {
  const src = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'traductions.fr.ts'), 'utf8');
  const table = {};
  for (const m of src.matchAll(/^ {4}([a-z0-9_]+): (['"`])((?:\\.|(?!\2).)*)\2,?$/gm)) {
    table[m[1]] = m[3].replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\\\\/g, '\\');
  }
  if (Object.keys(table).length < 200) throw new Error('table de libellés trop courte');
  return table;
}

function chargerOrigine(refs, me, ouverts, tab) {
  const bac = {
    REFS: refs, ME: me, CURRENT_LANG: 'fr', console, oasisEsc,
    esc: oasisEsc, icon,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    renderConfig: () => {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  };
  bac.window = bac;
  bac.__CFG_OPEN = new Set(ouverts);
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'schemas.js'), 'utf8'), bac, { filename: 'schemas.js' });
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'), bac, { filename: 'referentiels.js' });
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'organigramme.js'), 'utf8'), bac, { filename: 'organigramme.js' });
  vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  return {
    personnel: () => bac.window.cfgSectionPersonnel(),
    domaines: () => bac.window.cfgSectionDomaines(),
  };
}

function chargerNouvelle(refs, me, ouverts) {
  const bac = {
    REFS: refs, ME: me, CURRENT_LANG: 'fr', console, oasisEsc,
    renderConfig: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  };
  bac.window = bac;
  vm.createContext(bac);
  poserBarre(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'), bac, { filename: 'referentiels.js' });
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'taxinomie.js'), 'utf8'), bac, { filename: 'taxinomie.js' });
  // L'état est privé : on l'atteint par les gestes, seule porte d'entrée. Une
  // clé `pers-<id>` passe par `togglePers`, les autres par `toggleAcc`.
  ouverts.forEach((k) => {
    if (k.startsWith('pers-')) bac.window.togglePers(k.slice(5));
    else bac.window.toggleAcc(k);
  });
  return {
    personnel: () => bac.window.cfgSectionPersonnel(),
    domaines: () => bac.window.cfgSectionDomaines(),
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

function comparerRegime(nom, donnees, me, ouverts, tab) {
  const o = chargerOrigine(copie(donnees), me, ouverts, tab);
  const n = chargerNouvelle(copie(donnees), me, ouverts);
  pareil(`${nom} · cfgSectionPersonnel()`, o.personnel(), n.personnel());
  pareil(`${nom} · cfgSectionDomaines()`, o.domaines(), n.domaines());
}

function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const tab = libelles();
  console.log('\n═══ Le personnel et la taxinomie, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/taxinomie.js\n');

  const regional = { instance_vue: { instances: ['BJ', 'TG'] } };
  const national = { instance_vue: {} };

  const clesPers = (refs.inspecteurs || []).map((p) => `pers-${p.id}`);
  const clesAcc = [
    ...(refs.domaines || []).map((d) => `dom-${d.id}`),
    ...(refs.secteurs || []).map((s) => `sect-${s.id}`),
    ...(refs.sous_activites || []).map((x) => `sa-${x.id}`),
  ];

  // Tout replié, tout déplié, et des mélanges : la classe `open` et le
  // `display:none` des lignes de détail sont ce que les bascules commandent.
  comparerRegime('régional, tout replié', refs, regional, [], tab);
  comparerRegime('régional, tout déplié', refs, regional, [...clesPers, ...clesAcc], tab);
  comparerRegime('régional, fiches seules dépliées', refs, regional, clesPers, tab);
  comparerRegime('régional, accordéons seuls dépliés', refs, regional, clesAcc, tab);
  comparerRegime('régional, un de chaque', refs, regional, [clesPers[0], clesAcc[0]].filter(Boolean), tab);
  // Le régime national : le champ « Visible par les instances » disparaît, donc
  // une colonne de moins à la table du personnel… et un `colspan` qui change.
  comparerRegime('national, tout déplié', refs, national, [...clesPers, ...clesAcc], tab);

  // Les collections renversées : l'ordre des accordéons et des lignes.
  const renverse = {};
  for (const [c, l] of Object.entries(refs)) renverse[c] = Array.isArray(l) ? l.slice().reverse() : l;
  comparerRegime('renversé, tout déplié', renverse, regional, [...clesPers, ...clesAcc], tab);

  // ── Les replis que les vraies données ne portent pas ──
  const bricole = copie(refs);
  // Un domaine sans secteur, un secteur sans sous-activité, une sous-activité
  // sans thème : les trois phrases « aucun… » du balisage.
  bricole.domaines = [...refs.domaines, { id: 'zd', code: 'ZD', nom: 'Domaine vide', statut: 'actif' }];
  // Un thème orphelin — ni secteur ni sous-activité : le bloc « non rattachés »,
  // qui n'existe pas autrement.
  bricole.themes_supervision = [...refs.themes_supervision,
    { id: 'zt', code: 'ZT', libelle: 'Thème orphelin <b>&', description: 'Sans rattachement', statut: 'inactif' }];
  // Un inspecteur **non** inspecteur : les quatre champs du détail rendent un
  // tiret, et c'est l'ordre des cas de `fieldValue` qui le décide.
  bricole.inspecteurs = [...refs.inspecteurs,
    { id: 'zi', ref_personnel: 'ZI', nom: 'PAS', prenom: 'Inspecteur', email: 'z@z.z', est_inspecteur: 'non', statut: 'actif' }];
  // ── Un rattachement vers une personne qui **existe** ──
  //
  // Trouvé par la garde posée plus bas, et c'est le meilleur de cette séance :
  // les deux rattachements du jeu d'essai désignent des `person_id` **absents**
  // du répertoire du personnel. Aucune personne n'a donc de chaîne de validation,
  // et la branche « chaîne renseignée » de `circuitHtml` — le balisage qui dit
  // **qui valide les actes d'un agent** — n'était éprouvée nulle part. La preuve
  // de 5.d.3 la comparait six fois, toujours sur `null`.
  //
  // Une personne est donc rattachée à l'entité la plus profonde, avec un intérim
  // actif au-dessus d'elle : la chaîne, les flèches, le poste vacant et la
  // mention d'intérim passent alors tous par la comparaison.
  const feuille = (refs.organisation || []).find((o) => o.parent_id) || (refs.organisation || [])[0];
  const quelquun = (refs.inspecteurs || [])[0];
  if (!feuille || !quelquun) throw new Error('refus : pas d’entité ou pas de personnel — le régime ne prouverait rien');
  bricole.organisation_assignments = [...refs.organisation_assignments,
    { id: 'zr', org_id: feuille.id, person_id: quelquun.id, person_type: 'inspecteur' }];
  bricole.organisation = (refs.organisation || []).map((o) => (o.id === feuille.parent_id
    ? { ...o, interim_id: (refs.inspecteurs[1] || {}).id, interim_actif: true, titulaire_id: '' }
    : o));
  const clesBricole = [
    ...bricole.inspecteurs.map((p) => `pers-${p.id}`),
    ...bricole.domaines.map((d) => `dom-${d.id}`),
    ...bricole.secteurs.map((s) => `sect-${s.id}`),
    ...bricole.sous_activites.map((x) => `sa-${x.id}`),
  ];
  comparerRegime('bricolé, tout déplié', bricole, regional, clesBricole, tab);
  comparerRegime('bricolé, tout replié', bricole, regional, [], tab);

  // Et le vide : aucun domaine, aucun personnel.
  comparerRegime('vide', { ...refs, domaines: [], secteurs: [], sous_activites: [], themes_supervision: [], inspecteurs: [] }, regional, [], tab);

  // ── La chaîne de validation, dont la preuve est passée ici ──
  //
  // `circuitHtml` et `orgChainFor` étaient comparés directement par
  // `comparer-organigramme.js`, tant que le sas les publiait pour ce fichier.
  // Ils ne sont plus publiés (5.d.4) : leur preuve est désormais **contenue**
  // dans `cfgSectionPersonnel`, qui les appelle pour chaque personne.
  //
  // Cette garde l'empêche de disparaître en silence : le balisage comparé doit
  // porter **au moins une** chaîne de validation renseignée **et au moins une**
  // mention « non rattaché ». Sans les deux, la moitié de `circuitHtml` ne serait
  // plus éprouvée nulle part, et rien ne le dirait.
  const htmlBricole = chargerNouvelle(copie(bricole), regional, clesBricole).personnel();
  const aUneChaine = /pers-circuit-step/.test(htmlBricole);
  const aUnNonRattache = htmlBricole.includes(tab.non_rattache_organigramme);
  comparaisons += 2;
  if (!aUneChaine) {
    ecarts.push('garde : aucun circuit de validation dans le balisage comparé — '
      + '`circuitHtml` n’est plus éprouvé, voir comparer-organigramme.js');
  }
  if (!aUnNonRattache) {
    ecarts.push('garde : aucune mention « non rattaché » dans le balisage comparé — '
      + 'le repli de `circuitHtml` n’est plus éprouvé');
  }

  console.log(`  ${comparaisons} comparaisons de balisage, caractère pour caractère`);
  console.log('  dont la garde qui tient la preuve de `circuitHtml`, passée ici en 5.d.4.');
  console.log('  Les deux bascules sont couvertes par la suite « parcours » (5.c.15), et');
  console.log('  leur effet se lit ici : les deux côtés atteignent l’état par des chemins');
  console.log('  différents — un ensemble rempli d’un côté, les gestes de l’autre.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal();
