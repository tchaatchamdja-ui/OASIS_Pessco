#!/usr/bin/env node
/**
 * OASIS — Le téléphone et les quatre aides, avant et après la conversion.
 *
 * ADR-003, 5.e.4. **Dernière pièce d'`app.js`**, et avec elle `public/js/`
 * disparaît : le portail est entièrement en TypeScript.
 *
 * ── Ce qui se compare ──
 *
 *   · `splitPhone` sur les **vingt-cinq indicatifs** du catalogue, plus les cas
 *     que les vraies saisies portent : un numéro sans indicatif, un numéro avec
 *     un `+` inconnu, un vide, des espaces, et les **préfixes qui se contiennent**
 *     — et une garde dit **pourquoi le tri ne s'éprouve pas** : aucun des
 *     vingt-cinq indicatifs n'est préfixe d'un autre, donc « le plus long
 *     d'abord » ne décide de rien. Elle refusera le jour où cela changera ;
 *   · `phoneFieldHtml` : le sélecteur de vingt-cinq options, celle qui porte
 *     `selected`, et l'intitulé ;
 *   · `phoneFieldValue` : la recomposition, et les trois cas où elle rend vide ;
 *   · `escArg`, `fmtDate` et `reglesMotDePasse` sur ce que les vraies données
 *     portent et sur ce qu'elles ne portent pas ;
 *   · `loadRefs` : la route lue, et `REFS` **posé sur `window`**.
 *
 * ── Trois noms qui ne se comparent pas, parce qu'ils disparaissent ──
 *
 * `api`, `esc` et `showToast` d'`app.js` étaient des **doublons** de ceux du
 * socle : `window.api` et `window.showToast` portaient deux fonctions, et le
 * garde-fou « aucune page ne charge deux définitions du même nom global » les
 * nommait depuis le 8 octobre. Ils ne sont pas convertis, ils sont **retirés** —
 * et ce qui restait de différent entre eux est dit dans l'en-tête de `outils.ts`.
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
 * 432 comparaisons, aucune différence**, avec les onze autres (5169 au total).
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
 *     git worktree add /tmp/oasis-outils 8b2452e
 *     cd /tmp/oasis-outils && ln -s <dépôt>/node_modules . && cp -R <dépôt>/data .
 *     npm run build && node scripts/comparer-outils.js
 */
if (require.main === module) {
  console.error('pièce d’archive : ce comparateur ne tourne plus (ADR-003, 5.e.5).');
  console.error('Dernier passage vert : 8b2452e, le 13 octobre 2026 — 432 comparaisons, aucune différence.');
  console.error('Pour le rejouer, se placer sur ce commit : voir l’en-tête du fichier.');
  process.exit(2);
}
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_OUTILS_ORIGINE || '453ccbf';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app.js`;

function sourceOrigine() {
  // Un seul paquet : le sas de cette pièce publie les deux modules — le
  // téléphone n'a pas de sas à lui, personne ne le chargeant seul.
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'outils.js'))) {
    console.error('refus : public/app/outils.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  let texte;
  try {
    texte = execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  `public/js/app.js` a disparu du dépôt en 5.e.4 : donner le dernier');
    console.error('  commit qui le porte par OASIS_OUTILS_ORIGINE=<sha>.');
    process.exit(2);
  }
  if (!texte.includes('function splitPhone(value)') || !texte.includes('function fmtDate(iso)')) {
    console.error(`refus : ${SOURCE_ORIGINE} ne porte plus \`splitPhone\` ni \`fmtDate\`.`);
    process.exit(2);
  }
  return texte;
}

const FONCTIONS = [
  'splitPhone', 'phoneFieldHtml', 'phoneFieldValue', 'escArg', 'fmtDate',
  'reglesMotDePasse', 'loadRefs',
];
const CONSTANTES = ['PHONE_CODES', 'DEFAULT_PHONE_CODE'];

function declaration(lignes, nom) {
  const debut = lignes.findIndex((l) => l.startsWith(`const ${nom} =`));
  if (debut < 0) throw new Error(`refus : \`const ${nom}\` est introuvable dans la version d’origine`);
  if (lignes[debut].trimEnd().endsWith(';')) return lignes[debut];
  const fin = lignes.findIndex((l, i) => i > debut && l === '];');
  if (fin < 0) throw new Error(`refus : la fin de \`${nom}\` est introuvable`);
  return lignes.slice(debut, fin + 1).join('\n');
}

function morceauxOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = CONSTANTES.map((n) => declaration(lignes, n));
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
      || l.startsWith(`async function ${nom}(`));
    if (debut < 0) throw new Error(`refus : « ${nom} » est introuvable dans la version d’origine`);
    if (lignes[debut].trimEnd().endsWith('}')) { morceaux.push(lignes[debut]); continue; }
    let fin = -1;
    for (let i = debut + 1; i < lignes.length; i += 1) {
      if (lignes[i] === '}') { fin = i; break; }
    }
    if (fin < 0) throw new Error(`refus : la fin de « ${nom} » est introuvable`);
    morceaux.push(lignes.slice(debut, fin + 1).join('\n'));
  }
  return `${morceaux.join('\n\n')}\n;Object.assign(window, { ${CONSTANTES.join(', ')}, ${FONCTIONS.join(', ')} });`;
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

function faireDom(capture, champs) {
  return {
    getElementById: (id) => (Object.prototype.hasOwnProperty.call(champs, id)
      ? { id, value: champs[id] } : null),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function bacCommun(capture, champs, lang, tab) {
  const bac = {
    console, oasisEsc, esc: oasisEsc, CURRENT_LANG: lang, REFS: {},
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
    oasisToast: () => {},
    showToast: () => {},
    oasisSessionPerdue: () => { capture.sessions += 1; },
    document: faireDom(capture, champs),
  };
  bac.window = bac;
  const transport = async (chemin, options) => {
    capture.appels.push({ chemin, methode: (options || {}).method || 'GET' });
    return { ok: true, status: 200, json: async () => capture.refs };
  };
  bac.api = transport;
  bac.fetch = transport;
  return bac;
}

const neuf = () => ({ appels: [], sessions: 0, refs: { domaines: [{ id: 'd1' }] } });

function charger(cote, champs, lang, tab) {
  const capture = neuf();
  const bac = bacCommun(capture, champs, lang, tab);
  vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'icons.js'), 'utf8'), bac, { filename: 'icons.js' });
  if (cote === 'origine') {
    vm.runInContext(morceauxOrigine(sourceOrigine()), bac, { filename: 'app.js (origine)' });
  } else {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'outils.js'), 'utf8'), bac, { filename: 'outils.js' });
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

async function principal() {
  const tab = libelles();
  const texte = sourceOrigine();
  // Les indicatifs sont **relevés dans l'original** : la comparaison est
  // exhaustive par construction, et un indicatif retiré de la table serait un
  // refus, non une comparaison en moins.
  const bacCodes = {};
  vm.createContext(bacCodes);
  vm.runInContext(`${declaration(texte.split('\n'), 'PHONE_CODES')}\nresultat = PHONE_CODES;`, bacCodes);
  const codes = bacCodes.resultat;
  if (codes.length < 20) throw new Error(`refus : ${codes.length} indicatifs relevés — la table a changé de forme`);

  console.log('\n═══ Le téléphone et les quatre aides, avant et après ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/outils.js (téléphone et aides réunis)');
  console.log(`  ${codes.length} indicatifs relevés dans la table d’origine\n`);

  const hostile = '<b>"L\'étau" & co</b>';

  for (const lang of ['fr', 'en', 'pt']) {
    const o = charger('origine', {}, lang, tab);
    const n = charger('nouvelle', {}, lang, tab);

    // ── `splitPhone` sur chaque indicatif, et sur ce qui n'en est pas ──
    const saisies = [];
    for (const p of codes) {
      saisies.push(`${p.c} 97 00 00 00`, `${p.c}97000000`, p.c, `  ${p.c}  97 00  `);
    }
    saisies.push('', '   ', '97000000', '+99 123', '+', 'abc', null, undefined, 0, '+2291', '229 97');
    for (const v of saisies) {
      pareil(`${lang} · splitPhone(${JSON.stringify(v)})`,
        JSON.stringify(o.w.splitPhone(v)), JSON.stringify(n.w.splitPhone(v)));
    }

    // ── `phoneFieldHtml` : le sélecteur, l'option marquée, l'intitulé ──
    for (const [v, l] of [['+229 97 00 00 00', undefined], ['+33 1 23', 'Portable'],
      ['', hostile], ['97000000', 'Fixe'], ['+99 1', 'Inconnu']]) {
      pareil(`${lang} · phoneFieldHtml(${JSON.stringify(v)}, ${JSON.stringify(l)})`,
        o.w.phoneFieldHtml('tel', v, l), n.w.phoneFieldHtml('tel', v, l));
    }

    // ── `escArg` et `reglesMotDePasse` ──
    for (const v of [hostile, '', null, undefined, 0, 12, 'déjà "cité"', "l'apostrophe"]) {
      pareil(`${lang} · escArg(${JSON.stringify(v)})`, o.w.escArg(v), n.w.escArg(v));
    }
    for (const d of [undefined, null, [], ['texte brut'], [{ regle: 'longueur', n: 12 }],
      [{ regle: 'majuscule' }, { regle: 'chiffre' }], [{ regle: 'inconnue', n: 3 }],
      ['mélange', { regle: 'longueur', n: 8 }]]) {
      pareil(`${lang} · reglesMotDePasse(${JSON.stringify(d)})`,
        o.w.reglesMotDePasse(d), n.w.reglesMotDePasse(d));
    }

    // ── `fmtDate` ──
    for (const v of ['2026-10-13T08:30:00Z', '2026-01-02T23:59:59Z', '', null, undefined, 0,
      'pas une date', '2026-13-45T99:99:99Z']) {
      pareil(`${lang} · fmtDate(${JSON.stringify(v)})`, o.w.fmtDate(v), n.w.fmtDate(v));
    }
  }

  // ── `phoneFieldValue` : la recomposition, et les trois vides ──
  {
    const JEUX = [
      ['indicatif et numéro', { tel: ' 97 00 00 00 ', telCode: '+229' }],
      ['numéro sans indicatif', { tel: '97000000', telCode: '' }],
      ['numéro vide', { tel: '   ', telCode: '+229' }],
      ['sélecteur absent', { tel: '97000000' }],
      ['numéro hostile', { tel: hostile, telCode: '+33' }],
    ];
    for (const [nom, champs] of JEUX) {
      const o = charger('origine', champs, 'fr', tab);
      const n = charger('nouvelle', champs, 'fr', tab);
      pareil(`phoneFieldValue · ${nom}`, o.w.phoneFieldValue('tel'), n.w.phoneFieldValue('tel'));
    }
    // Et le champ **absent** : l'original lève, le module lève aussi.
    const o = charger('origine', {}, 'fr', tab);
    const n = charger('nouvelle', {}, 'fr', tab);
    const leve = (cote) => { try { cote.w.phoneFieldValue('tel'); return null; } catch (e) { return e; } };
    comparaisons += 2;
    if (!leve(o)) ecarts.push('divergence assumée : l’origine ne lève plus sur un champ de téléphone absent');
    if (!leve(n)) ecarts.push('divergence assumée : la conversion ne lève plus sur un champ de téléphone absent');
  }

  // ── `loadRefs` : la route, et `REFS` posé ──
  {
    const o = charger('origine', {}, 'fr', tab);
    const n = charger('nouvelle', {}, 'fr', tab);
    await o.w.loadRefs(); await n.w.loadRefs();
    pareil('loadRefs · la route lue', JSON.stringify(o.capture.appels), JSON.stringify(n.capture.appels));
    pareil('loadRefs · REFS posé', JSON.stringify(o.bac.window.REFS), JSON.stringify(n.bac.window.REFS));
    comparaisons += 1;
    if (!o.bac.window.REFS.domaines) {
      ecarts.push('garde : `REFS` n’est plus posé par `loadRefs` dans l’origine — le régime ne prouve rien');
    }
  }

  // ── La garde qui dit quand le tri des indicatifs deviendra prouvable ──
  //
  // `splitPhone` trie les correspondances par longueur décroissante, pour prendre
  // le plus précis. Sur cette table le tri est **inatteignable** : aucun des
  // vingt-cinq indicatifs n'est préfixe d'un autre, donc `filter` n'en rend jamais
  // deux. Deux contre-essais — tri inversé, tri retiré — sont restés verts, et
  // c'est ainsi qu'on l'a su.
  //
  // Cette garde refuse le jour où un indicatif court paraîtra (`+1` et `+123`,
  // par exemple) : le tri deviendra alors le code qui décide, et il faudra
  // **écrire le régime** plutôt que croire qu'il existe.
  //
  // Elle lit la table **vivante**, et non celle d'origine : le premier jet lisait
  // l'original figé dans `git`, qui ne changera jamais — une garde qui surveille
  // un fichier immuable ne garde rien. Contre-essayée en ajoutant `+2` à
  // `telephone.ts` : elle est restée muette, et c'est ainsi qu'on l'a su.
  comparaisons += 1;
  const vivante = fs.readFileSync(path.join(RACINE, 'frontend', 'portail', 'telephone.ts'), 'utf8');
  const codesVivants = [...vivante.matchAll(/\{ c: '(\+[0-9]+)'/g)].map((m) => m[1]);
  if (codesVivants.length !== codes.length) {
    ecarts.push(`garde : ${codesVivants.length} indicatifs dans \`telephone.ts\` contre `
      + `${codes.length} dans l’original — la table a changé, ce qui est une décision, non une conversion.`);
  }
  const prefixes = [];
  for (const a of codesVivants) {
    for (const b of codesVivants) {
      if (a !== b && b.startsWith(a)) prefixes.push(`${a} ⊂ ${b}`);
    }
  }
  if (prefixes.length) {
    ecarts.push(`garde : ${prefixes.join(', ')} — un indicatif est désormais préfixe d’un autre, `
      + 'donc le tri de `splitPhone` décide quelque chose. Écrire le régime qui l’éprouve.');
  }

  // ── La garde : autant d'indicatifs qu'en porte la table ──
  comparaisons += 1;
  const posee = charger('nouvelle', {}, 'fr', tab).w.phoneFieldHtml('tel', '', undefined);
  const options = (posee.match(/<option /g) || []).length;
  if (options !== codes.length) {
    ecarts.push(`garde : le sélecteur rend ${options} options pour ${codes.length} indicatifs relevés`);
  }

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log(`  dont les ${codes.length} indicatifs × quatre formes de saisie × trois langues,`);
  console.log('  et la levée sur un champ de téléphone absent, assertée des deux côtés.');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
