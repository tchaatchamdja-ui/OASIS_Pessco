#!/usr/bin/env node
/**
 * OASIS — Les onze schémas de référentiel, avant et après le typage.
 *
 * ADR-003, 5.d. L'extraction de la couche des schémas d'`app-config.js` vers
 * `frontend/portail/schemas.ts` est une **opération mécanique** : des libellés,
 * des clés, des listes d'options. C'est exactement le genre d'opération dont on
 * croit n'avoir pas besoin de preuve — et deux fois déjà, dans ce dépôt, ce
 * genre-là a coûté une correction (les 84 traductions portugaises non
 * vérifiées, puis l'extraction du thème faite après la suppression du fichier
 * d'origine, donc sans recours).
 *
 * Cette fois la preuve est écrite **avant** l'édition, et elle reste rejouable
 * pour toujours : la version d'origine est lue dans `git`, non sur le disque.
 *
 * Ce qui est comparé, et sur les données réelles de `data/referentiels.json` :
 *
 *   · les onze titres ;
 *   · pour chaque champ : sa clé, son libellé, son type, ses quatre drapeaux ;
 *   · la liste des champs **visibles**, dans l'ordre ;
 *   · chaque liste d'options, valeur et libellé ;
 *   · `fieldValue` sur **chaque champ de chaque enregistrement**, c'est-à-dire
 *     le balisage que l'agent lit ;
 *   · `refLabel` et `personnelName` sur chaque identifiant présent.
 *
 * Deux régimes de `ME` sont joués : avec la liste des instances (le
 * super-administrateur de l'Union) et sans. Le champ « Visible par les
 * instances » n'existe que dans le premier, et une comparaison faite dans un
 * seul régime laisserait la moitié du `only()` non éprouvée.
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
 * 2820 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-schemas 8b2452e
 *     cd /tmp/oasis-schemas && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-schemas.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 2820 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');

// ── La version d'origine, prise dans git ──
//
// `HEAD` tant que l'édition n'est pas commise, puis le commit nommé ci-dessous.
// On ne lit pas le disque : le fichier va changer, et une preuve qui se lit
// elle-même ne prouve rien.
const COMMIT_ORIGINE = process.env.OASIS_SCHEMAS_ORIGINE || '54d5094';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

// ── Le refus, et pourquoi il porte le même code de sortie que ses aînés ──
//
// Un comparateur qui ne trouve plus son terme de comparaison doit **refuser**,
// non mesurer une page vide : il rendrait un diff où tout diffère, c'est-à-dire
// un rouge spectaculaire qui ne dit rien. C'est arrivé une fois en 5.b.
//
// Le garde-fou de la suite « taille » n'accorde son exemption qu'à un
// comparateur qui porte ce refus — un test d'existence et `exit(2)`. Celui-ci
// lit son terme dans `git` plutôt que sur le disque ; le test d'existence est
// donc le succès de `git show`, et le code de sortie est le même.
function sourceOrigine() {
  const bati = fs.existsSync(path.join(RACINE, 'public', 'app', 'schemas.js'));
  if (!bati) {
    console.error('refus : public/app/schemas.js est absent — lancer `node frontend/construire.mjs` d’abord.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  La version d’origine est le terme de comparaison : sans elle, ce script');
    console.error('  ne mesurerait rien et rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_SCHEMAS_ORIGINE=<sha>.');
    process.exit(2);
  }
}

// Les bornes du bloc extrait : de « Schémas des référentiels » à la fin de
// `fieldValue`. Trouvées par leurs textes, non par leurs numéros de ligne : un
// numéro de ligne se décale, un en-tête de section non.
function blocOrigine(texte) {
  const debut = texte.indexOf('// ── Schémas des référentiels (CRUD générique) ──');
  const fin = texte.indexOf('function refTable(');
  if (debut < 0 || fin < 0 || fin < debut) {
    throw new Error('bornes du bloc introuvables dans la version d’origine');
  }
  return texte.slice(debut, fin);
}

/**
 * Les couples (collection, champ) que `refLabel` reçoit réellement, relevés
 * **dans tout le portail** — le JavaScript qui reste, et les modules typés.
 *
 * Mesuré plutôt que décidé : si un sixième couple paraît un jour, il entre ici
 * de lui-même, et le relevé suit le code au lieu de vieillir avec lui.
 *
 * ── Deux erreurs corrigées le 13 octobre 2026, et la seconde était la mienne ──
 *
 * Ce commentaire annonçait « cinq couples ». Il y en avait **deux** : le motif
 * n'a jamais relevé que `domaines.code` et `secteurs.code`, à ce commit comme à
 * tous ceux d'après — vérifié sur les cinq. Le chiffre était faux le jour où je
 * l'ai écrit.
 *
 * Et le relevé ne lisait que les deux fichiers restés en JavaScript. À mesure que
 * 5.d les vide, les appels de `refLabel` **partent dans les modules typés** : trois
 * y sont déjà (`organisation.sigle`, `sous_activites.code`,
 * `specialites_inspecteur.libelle`). Le garde-fou ci-dessous ne mordait pas pour
 * autant — il ne refuse que si le relevé est **vide** —, et la portée de cette
 * preuve se serait donc rétrécie à chaque étape sans qu'une ligne le dise. Le jour
 * où `app.js` partira, elle serait tombée à zéro d'un coup, et le refus aurait
 * nommé un motif qui n'a rien cessé de faire.
 */
function pairesDemandees() {
  const motif = /refLabel\('([a-z_]+)', *[^,]+, *'([a-z_]+)'\)/g;
  const vues = new Set();
  const fichiers = [
    path.join(RACINE, 'public', 'js', 'app.js'),
    path.join(RACINE, 'public', 'js', 'app-config.js'),
    ...fs.readdirSync(path.join(RACINE, 'frontend', 'portail'))
      .filter((n) => n.endsWith('.ts'))
      .map((n) => path.join(RACINE, 'frontend', 'portail', n)),
  ].filter((f) => fs.existsSync(f));
  for (const f of fichiers) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(motif)) vues.add(`${m[1]}.${m[2]}`);
  }
  if (!vues.size) throw new Error('aucun appel de refLabel relevé — le motif a cessé de mordre');
  // ── Le plancher, écrit pour que la portée ne puisse plus rétrécir en silence ──
  //
  // Un relevé vide se refuse déjà ; un relevé **amputé** passait. C'est ce qui est
  // arrivé : cinq couples au moment de la mesure, deux au commit suivant, et le
  // chiffre de 2 820 est resté dans deux documents pendant six étapes.
  //
  // Les cinq sont donc gelés ici. Un couple qui disparaît du code sans que cette
  // liste change est un refus — et s'il disparaît pour de bon, c'est cette ligne
  // qu'il faut modifier, ce qui se lit dans un diff.
  const PLANCHER = ['domaines.code', 'secteurs.code', 'organisation.sigle',
    'sous_activites.code', 'specialites_inspecteur.libelle'];
  const manquants = PLANCHER.filter((c) => !vues.has(c));
  if (manquants.length) {
    throw new Error(`refus : ${manquants.length} couple(s) de refLabel ne sont plus relevés — ${manquants.join(', ')}.`
      + ' La portée de cette preuve rétrécirait sans qu’un écart le dise.');
  }
  return [...vues].map((s) => s.split('.'));
}

const NOMS = [
  'REF_SCHEMAS', 'STATUT_FIELD', 'VISIBILITE_FIELD', 'champsVisibles', 'fieldValue',
  'refLabel', 'domaineOptions', 'secteurOptions', 'personnelOptions', 'instanceOptions',
  'personnelName',
];

/** L'échappement du socle, repris tel quel : les deux versions l'appellent. */
function oasisEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** La couche d'origine, évaluée dans un bac avec `REFS` et `ME` à portée. */
function chargerOrigine(refs, me) {
  const bac = { REFS: refs, ME: me, esc: oasisEsc, console };
  bac.window = bac;
  vm.createContext(bac);
  const code = `${blocOrigine(sourceOrigine())}\n;({ ${NOMS.join(', ')} })`;
  return vm.runInContext(code, bac, { filename: 'app-config.js (origine)' });
}

/** La couche nouvelle : le sas construit, qui pose les onze noms sur `window`. */
function chargerNouvelle(refs, me) {
  const bac = { console };
  bac.window = bac;
  bac.REFS = refs;
  bac.ME = me;
  vm.createContext(bac);
  bac.window.oasisEsc = oasisEsc;
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'schemas.js'), 'utf8'),
    bac, { filename: 'public/app/schemas.js' });
  const sortie = {};
  for (const n of NOMS) sortie[n] = bac.window[n];
  return sortie;
}

// ── La comparaison ──
let comparaisons = 0;
const ecarts = [];
function pareil(quoi, a, b) {
  comparaisons += 1;
  const x = JSON.stringify(a);
  const y = JSON.stringify(b);
  if (x !== y) ecarts.push(`${quoi} : origine ${x} ≠ nouvelle ${y}`);
}

// ── Chaque côté reçoit sa **propre copie** des données ──
//
// Non par précaution de style : l'origine **trie `REFS` sur place**. Deux de ses
// fournisseurs d'options écrivent `(REFS.organisation_levels || []).sort(…)` et
// `(REFS.niveaux_qualifications || []).sort(…)` — sans `slice()`. Ouvrir une
// liste déroulante **réordonne donc le référentiel**, et la table qui le parcourt
// ensuite l'affiche dans le nouvel ordre.
//
// Partager un seul objet entre les deux versions aurait rendu la preuve
// **inutilisable** : l'origine aurait modifié les données que la nouvelle lit
// ensuite, et les écarts auraient été ceux de ma mesure, non ceux du code.
const copie = (o) => JSON.parse(JSON.stringify(o));

function comparerRegime(nomRegime, donnees, me) {
  const refs = copie(donnees);
  const o = chargerOrigine(refs, me);
  const n = chargerNouvelle(copie(donnees), me);
  const prefixe = (s) => `${nomRegime} · ${s}`;

  pareil(prefixe('collections'), Object.keys(o.REF_SCHEMAS), Object.keys(n.REF_SCHEMAS));

  for (const [coll, schemaO] of Object.entries(o.REF_SCHEMAS)) {
    const schemaN = n.REF_SCHEMAS[coll];
    if (!schemaN) { ecarts.push(prefixe(`${coll} : absente de la nouvelle`)); continue; }
    pareil(prefixe(`${coll}.title`), schemaO.title, schemaN.title);

    const visO = o.champsVisibles(schemaO);
    const visN = n.champsVisibles(schemaN);
    pareil(prefixe(`${coll} champs visibles`), visO.map((f) => f.k), visN.map((f) => f.k));

    // Tous les champs, visibles ou non : un champ caché aujourd'hui peut
    // reparaître demain, et sa forme doit déjà être juste.
    schemaO.fields.forEach((fO, i) => {
      const fN = schemaN.fields[i];
      if (!fN) { ecarts.push(prefixe(`${coll}.fields[${i}] absent`)); return; }
      pareil(prefixe(`${coll}.${fO.k} forme`),
        { k: fO.k, l: fO.l, type: fO.type, allowEmpty: fO.allowEmpty,
          inspectorOnly: fO.inspectorOnly, aOptions: !!fO.options,
          aResolve: !!fO.resolve, aItemLabel: !!fO.itemLabel, aOnly: !!fO.only },
        { k: fN.k, l: fN.l, type: fN.type, allowEmpty: fN.allowEmpty,
          inspectorOnly: fN.inspectorOnly, aOptions: !!fN.options,
          aResolve: !!fN.resolve, aItemLabel: !!fN.itemLabel, aOnly: !!fN.only });

      if (fO.options) pareil(prefixe(`${coll}.${fO.k} options`), fO.options(), fN.options());
      if (fO.only) pareil(prefixe(`${coll}.${fO.k} only()`), fO.only(), fN.only());

      // `fieldValue` sur chaque enregistrement réel — c'est ce que l'agent lit.
      for (const rec of refs[coll] || []) {
        pareil(prefixe(`${coll}.${fO.k} fieldValue(${rec.id || '?'})`),
          o.fieldValue(fO, rec), n.fieldValue(fN, rec));
      }
      // Et le `resolve` isolé, qui n'est pas toujours atteint par `fieldValue`
      // (un `inspectorOnly` sur une fiche non-inspecteur sort avant lui).
      if (fO.resolve) {
        for (const rec of refs[coll] || []) {
          pareil(prefixe(`${coll}.${fO.k} resolve(${rec.id || '?'})`),
            fO.resolve(rec[fO.k]), fN.resolve(rec[fO.k]));
        }
        pareil(prefixe(`${coll}.${fO.k} resolve(vide)`), fO.resolve(''), fN.resolve(''));
      }
    });
  }

  // Les quatre fournisseurs d'options, et les deux fonctions de libellé.
  for (const f of ['domaineOptions', 'secteurOptions', 'personnelOptions', 'instanceOptions']) {
    pareil(prefixe(`${f}()`), o[f](), n[f]());
  }
  // ── Les paires que l'application demande, relevées dans la source ──
  //
  // Et non toutes les combinaisons imaginables : la première écriture de ce
  // script croisait les onze collections avec quatre noms de champ, et a rendu
  // 486 écarts — tous sur des couples que **personne ne demande**
  // (`refLabel('organisation_levels', …, 'code')`, par exemple, sur une
  // collection qui n'a pas de code).
  //
  // Ces 486 écarts disaient néanmoins quelque chose de vrai, et c'est nommé
  // plus bas. Mais une comparaison doit porter sur ce que le code fait : les
  // paires sont donc **relevées** dans `app.js` et `app-config.js`, non
  // choisies par moi. Si une sixième paraît un jour, elle entre ici d'elle-même.
  for (const [coll, champ] of pairesDemandees()) {
    for (const rec of refs[coll] || []) {
      pareil(prefixe(`refLabel(${coll},${rec.id},${champ})`),
        o.refLabel(coll, rec.id, champ), n.refLabel(coll, rec.id, champ));
    }
  }
  // Introuvable, et identifiant vide : les deux chemins de repli de `refLabel`.
  pareil(prefixe('refLabel(introuvable)'), o.refLabel('domaines', 'néant', 'code'), n.refLabel('domaines', 'néant', 'code'));
  pareil(prefixe('refLabel(vide)'), o.refLabel('domaines', '', 'code'), n.refLabel('domaines', '', 'code'));
  for (const p of refs.inspecteurs || []) {
    pareil(prefixe(`personnelName(${p.id})`), o.personnelName(p.id), n.personnelName(p.id));
  }
  pareil(prefixe('personnelName(introuvable)'), o.personnelName('néant'), n.personnelName('néant'));
}

function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  console.log('\n═══ Les onze schémas de référentiel, avant et après le typage ═══\n');
  console.log(`  origine : git ${SOURCE_ORIGINE}`);
  console.log(`  nouvelle : public/app/schemas.js (construit depuis frontend/portail/schemas.ts)\n`);

  comparerRegime('régional (liste d’instances)',
    refs, { instance_vue: { instances: ['BJ', 'TG', 'CI', 'SN'] } });
  comparerRegime('national (sans liste)', refs, { instance_vue: {} });

  // ── Et un régime aux collections **renversées** ──
  //
  // Posé après un contre-essai qui n'a pas mordu : ôter le tri par `ordre` des
  // niveaux hiérarchiques ne changeait **rien**, le jeu d'essai étant déjà dans
  // le bon ordre. Une assertion que les données satisfont par hasard ne vérifie
  // pas le code.
  //
  // Les onze collections sont donc rejouées à l'envers. Un tri manquant s'y voit,
  // et c'est éprouvé : avec ce régime, le contre-essai mord.
  const renverse = {};
  for (const [c, l] of Object.entries(refs)) renverse[c] = Array.isArray(l) ? l.slice().reverse() : l;
  comparerRegime('régional, collections renversées',
    renverse, { instance_vue: { instances: ['BJ', 'TG', 'CI', 'SN'] } });
  // Et `ME` absent : `app-config.js` lisait `ME.instance_vue` sans garde, le
  // module lit `window.ME?.…`. Le régime est donc **différent** par construction
  // — l'origine lèverait. On ne le compare pas : on le dit, et le module rend
  // une liste vide là où l'origine aurait rompu la page.
  // ── Les deux divergences assumées, et éprouvées comme telles ──
  //
  // Une extraction qui change un comportement doit le dire. Ces deux-là sont
  // **voulues**, et elles sont vérifiées ici — non pas tolérées en silence : le
  // jour où l'une cesse d'être vraie, ce script tombe.
  const o = chargerOrigine(refs, { instance_vue: { instances: ['BJ'] } });
  const n = chargerNouvelle(refs, { instance_vue: { instances: ['BJ'] } });
  const divergences = [];

  // 1. Un champ **absent** d'un enregistrement trouvé.
  //
  //    L'origine rend `undefined`, que l'interpolation d'un gabarit écrit
  //    « undefined » dans la page. Le module rend une chaîne vide. Inatteignable
  //    aujourd'hui — les cinq couples relevés portent tous leur champ —, mais
  //    c'est la correction d'un défaut latent, non un hasard.
  if (o.refLabel('organisation_levels', (refs.organisation_levels || [])[0].id, 'code') !== undefined) {
    divergences.push('l’origine ne rend plus `undefined` sur un champ absent : la divergence n’existe plus, ôter ce contrôle');
  }
  if (n.refLabel('organisation_levels', (refs.organisation_levels || [])[0].id, 'code') !== '') {
    divergences.push('le module ne rend plus la chaîne vide sur un champ absent');
  }

  // 2. `ME` absent.
  //
  //    L'origine lit `ME.instance_vue` sans garde et **lève**, ce qui
  //    interromprait le rendu de la page. Le module lit `window.ME?.…` et rend
  //    une liste vide, donc un champ « Visible par les instances » masqué.
  let aLeve = false;
  try { chargerOrigine(refs, undefined).instanceOptions(); } catch { aLeve = true; }
  if (!aLeve) divergences.push('l’origine ne lève plus sans `ME` : la divergence n’existe plus');
  if (chargerNouvelle(refs, undefined).instanceOptions().length !== 0) {
    divergences.push('le module ne rend plus une liste vide sans `ME`');
  }

  // 3. L'origine **trie `REFS` sur place** ; le module trie une copie.
  //
  //    C'est la correction d'un défaut, et il n'est pas théorique : ouvrir la
  //    liste déroulante « Niveau » réordonnait le référentiel des niveaux
  //    hiérarchiques, et la table qui le parcourt ensuite changeait d'ordre sans
  //    qu'aucune écriture n'ait eu lieu.
  //    La vérification se fait sur les collections **renversées** : sur des
  //    données déjà triées, un tri sur place ne change rien, et le contrôle
  //    aurait annoncé « la divergence n'existe plus » sur un code qui mute
  //    toujours. Trouvé en l'écrivant, et c'est la même leçon que le régime
  //    renversé plus haut.
  const avantO = copie(renverse);
  const bacO = chargerOrigine(avantO, { instance_vue: {} });
  bacO.REF_SCHEMAS.organisation.fields.find((f) => f.k === 'type').options();
  bacO.REF_SCHEMAS.inspecteurs.fields.find((f) => f.k === 'niveau_qualification').options();
  const mute = JSON.stringify(avantO) !== JSON.stringify(renverse);

  const avantN = copie(renverse);
  const bacN = chargerNouvelle(avantN, { instance_vue: {} });
  bacN.REF_SCHEMAS.organisation.fields.find((f) => f.k === 'type').options();
  bacN.REF_SCHEMAS.inspecteurs.fields.find((f) => f.k === 'niveau_qualification').options();
  const intact = JSON.stringify(avantN) === JSON.stringify(renverse);

  if (!mute) {
    divergences.push('l’origine ne mute plus REFS en ouvrant une liste : la divergence n’existe plus, ôter ce contrôle');
  }
  if (!intact) divergences.push('le module mute REFS en ouvrant une liste — ce qu’il ne doit pas faire');

  console.log(`  ${comparaisons} comparaisons`);
  console.log('  3 divergences assumées, et vérifiées :');
  console.log('    · `undefined` → chaîne vide sur un champ absent d’un enregistrement trouvé');
  console.log('    · une levée → une liste vide quand `ME` est absent');
  console.log('    · un tri **sur place** de REFS → un tri sur copie');
  if (divergences.length) {
    console.log(`\n  ✗ une divergence assumée a changé :\n`);
    divergences.forEach((d) => console.log(`    · ${d}`));
    process.exit(1);
  }
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 30).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 30) console.log(`    … et ${ecarts.length - 30} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal();
module.exports = { comparerRegime };
