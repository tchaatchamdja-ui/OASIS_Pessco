#!/usr/bin/env node
/**
 * OASIS — L'organigramme, avant et après la conversion.
 *
 * ADR-003, 5.d.3. Même discipline que ses trois aînés : la version d'origine est
 * lue **dans `git`**, et la preuve reste rejouable après l'édition.
 *
 * ── Cinq fonctions pures sur quinze ──
 *
 * `cfgSectionOrganigramme` (les deux présentations), `circuitHtml`, le registre
 * d'un poste et la fenêtre d'intérim rendent des chaînes. `orgChainFor` rend une
 * structure. Ce sont les plus volumineuses, et celles où une espace se verrait.
 *
 * Les dix autres agissent sur le document ou sur l'API — les quatre gestes du
 * glisser-déposer, les trois écritures de l'intérim, le retrait d'un
 * rattachement, la bascule des présentations. Elles sont couvertes par la suite
 * « parcours » depuis 5.c.11 : la ronde du rattachement, celle de l'intérim avec
 * son registre, et les deux présentations.
 *
 * ── Le cas que les vraies données ne produisent pas ──
 *
 * `normalizeOrgTopLevel` recopie le sigle et le nom de l'AAC sur l'entité de
 * niveau 1, **en modifiant `REFS`**. Sur le jeu de travail, l'entité est déjà
 * conforme : la fonction ne change rien, et son retrait passerait inaperçu.
 *
 * Un régime **bricolé** lui donne donc un écart à combler. C'est la troisième
 * fois dans 5.d qu'une assertion satisfaite par hasard oblige à fabriquer la
 * donnée qui l'éprouve.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const COMMIT_ORIGINE = process.env.OASIS_ORG_ORIGINE || '9afe42b';
const SOURCE_ORIGINE = `${COMMIT_ORIGINE}:public/js/app-config.js`;

function sourceOrigine() {
  if (!fs.existsSync(path.join(RACINE, 'public', 'app', 'organigramme.js'))) {
    console.error('refus : public/app/organigramme.js est absent — lancer `node frontend/construire.mjs`.');
    process.exit(2);
  }
  try {
    return execFileSync('git', ['show', SOURCE_ORIGINE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    console.error(`refus : ${SOURCE_ORIGINE} est introuvable dans ce dépôt.`);
    console.error('  Sans le terme de comparaison, ce script rendrait un écart sur chaque ligne.');
    console.error('  Donner le bon commit par OASIS_ORG_ORIGINE=<sha>.');
    process.exit(2);
  }
}

const FONCTIONS = [
  'orgChainFor', 'circuitHtml', 'setOrgView', 'openPosteRegistre', 'orgStartInterim',
  'orgPersonName', 'orgAssignedChips', 'cfgSectionOrganigramme', 'normalizeOrgTopLevel',
];

function fonctionsOrigine(texte) {
  const lignes = texte.split('\n');
  const morceaux = [];
  for (const nom of FONCTIONS) {
    const debut = lignes.findIndex((l) => l.startsWith(`function ${nom}(`)
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
  // `ORG_VIEW` et `LEVEL_COLORS` sont fournis par le bac : le premier parce que
  // la bascule doit pouvoir le changer, le second parce qu'il vivait dans
  // `app.js` et que les deux côtés doivent lire les mêmes couleurs.
  return `let ORG_VIEW = window.__ORG_VIEW;\n${morceaux.join('\n\n')}\n;Object.assign(window, { ${FONCTIONS.join(', ')} });\nwindow.__lireVue = () => ORG_VIEW;`;
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
const LEVEL_COLORS = ['#2563eb', '#0891b2', '#f59e0b', '#10b981', '#8b5cf6'];

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
    getElementById: (id) => (id === 'cfgModalRoot' ? racine : null),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function bacCommun(refs, lang, vue, capture) {
  return {
    REFS: refs, CURRENT_LANG: lang, console, oasisEsc, LEVEL_COLORS,
    document: documentMinimal(capture),
    renderConfig: () => {},
    fmtDate: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return `${d.toLocaleDateString(lang)} ${d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}`;
    },
    __ORG_VIEW: vue,
  };
}

function chargerOrigine(refs, lang, vue, tab) {
  const capture = { html: '' };
  const bac = Object.assign(bacCommun(refs, lang, vue, capture), {
    esc: oasisEsc, icon,
    t: (cle, ...v) => {
      const s = tab[cle];
      if (s === undefined) return cle;
      return v.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[i] ?? '')) : s;
    },
  });
  bac.window = bac;
  vm.createContext(bac);
  // Les schémas construits, pour `personnelName` et `personnelOptions`.
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'schemas.js'), 'utf8'), bac, { filename: 'schemas.js' });
  // `orgTopLevelType`, parti en 5.d.1 et déjà éprouvé là.
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'), bac, { filename: 'referentiels.js' });
  vm.runInContext(fonctionsOrigine(sourceOrigine()), bac, { filename: 'app-config.js (origine)' });
  return {
    section: () => bac.window.cfgSectionOrganigramme(),
    chaine: (p) => bac.window.orgChainFor(p),
    circuit: (c) => bac.window.circuitHtml(c),
    registre: (id) => { capture.html = ''; bac.window.openPosteRegistre(id); return capture.html; },
    interim: (id) => { capture.html = ''; bac.window.orgStartInterim(id); return capture.html; },
    normaliser: (cfg) => bac.window.normalizeOrgTopLevel(cfg),
    refs: () => bac.REFS,
  };
}

function chargerNouvelle(refs, lang, vue) {
  const capture = { html: '' };
  const bac = bacCommun(refs, lang, vue, capture);
  bac.window = bac;
  bac.localStorage = { getItem: () => null, setItem: () => {} };
  vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'referentiels.js'), 'utf8'), bac, { filename: 'referentiels.js' });
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public', 'app', 'organigramme.js'), 'utf8'), bac, { filename: 'organigramme.js' });
  // La présentation est privée au module : on l'atteint par son geste, seule
  // porte d'entrée — comme pour les bandeaux des exigences (5.d.2).
  if (vue !== 'list') bac.window.setOrgView(vue);
  return {
    section: () => bac.window.cfgSectionOrganigramme(),
    chaine: (p) => bac.window.orgChainFor(p),
    circuit: (c) => bac.window.circuitHtml(c),
    registre: (id) => { capture.html = ''; bac.window.openPosteRegistre(id); return capture.html; },
    interim: (id) => { capture.html = ''; bac.window.orgStartInterim(id); return capture.html; },
    normaliser: (cfg) => bac.window.normalizeOrgTopLevel(cfg),
    refs: () => bac.REFS,
  };
}

let comparaisons = 0;
const ecarts = [];
function pareil(quoi, a, b) {
  comparaisons += 1;
  const x = typeof a === 'string' ? a : JSON.stringify(a);
  const y = typeof b === 'string' ? b : JSON.stringify(b);
  if (x !== y) {
    const i = [...String(x)].findIndex((c, k) => c !== String(y)[k]);
    ecarts.push(`${quoi} : diverge au caractère ${i}\n      origine  : …${String(x).slice(Math.max(0, i - 40), i + 60)}…\n      nouvelle : …${String(y).slice(Math.max(0, i - 40), i + 60)}…`);
  }
}

const copie = (o) => JSON.parse(JSON.stringify(o));

function comparerRegime(nom, donnees, lang, vue, tab) {
  const o = chargerOrigine(copie(donnees), lang, vue, tab);
  const n = chargerNouvelle(copie(donnees), lang, vue);
  const p = (s) => `${nom} · ${s}`;

  pareil(p('cfgSectionOrganigramme()'), o.section(), n.section());
  for (const pers of donnees.inspecteurs || []) {
    pareil(p(`orgChainFor(${pers.id})`),
      (o.chaine(pers.id) || []).map((x) => x.id), (n.chaine(pers.id) || []).map((x) => x.id));
    pareil(p(`circuitHtml(${pers.id})`), o.circuit(o.chaine(pers.id)), n.circuit(n.chaine(pers.id)));
  }
  pareil(p('circuitHtml(null)'), o.circuit(null), n.circuit(null));
  for (const e of donnees.organisation || []) {
    pareil(p(`openPosteRegistre(${e.id})`), o.registre(e.id), n.registre(e.id));
    pareil(p(`orgStartInterim(${e.id})`), o.interim(e.id), n.interim(e.id));
  }
  pareil(p('openPosteRegistre(inconnu)'), o.registre('néant'), n.registre('néant'));
  pareil(p('orgStartInterim(inconnu)'), o.interim('néant'), n.interim('néant'));
}

/**
 * `normalizeOrgTopLevel` : comparée sur son **effet**, puisqu'elle ne rend rien.
 *
 * Et sur une donnée qui lui donne quelque chose à faire : sur le jeu de travail
 * l'entité de niveau 1 est déjà conforme, et la fonction est un non-événement.
 */
function comparerNormalisation(donnees, cfg, tab) {
  const o = chargerOrigine(copie(donnees), 'fr', 'list', tab);
  const n = chargerNouvelle(copie(donnees), 'fr', 'list');
  o.normaliser(cfg);
  n.normaliser(cfg);
  pareil(`normalizeOrgTopLevel(${JSON.stringify((cfg || {}).aac || null)}) → REFS.organisation`,
    o.refs().organisation, n.refs().organisation);
}

function principal() {
  const refs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'referentiels.json'), 'utf8'));
  const tab = libelles();
  console.log('\n═══ L’organigramme, avant et après la conversion ═══\n');
  console.log(`  origine  : git ${SOURCE_ORIGINE}`);
  console.log('  nouvelle : public/app/organigramme.js\n');

  comparerRegime('fr, liste', refs, 'fr', 'list', tab);
  comparerRegime('fr, hiérarchie', refs, 'fr', 'tree', tab);
  comparerRegime('en, hiérarchie', refs, 'en', 'tree', tab);

  // Les collections renversées : les tris par `ordre` et l'ordre des enfants.
  const renverse = {};
  for (const [c, l] of Object.entries(refs)) renverse[c] = Array.isArray(l) ? l.slice().reverse() : l;
  comparerRegime('fr, collections renversées, liste', renverse, 'fr', 'list', tab);
  comparerRegime('fr, collections renversées, hiérarchie', renverse, 'fr', 'tree', tab);

  // ── Un jeu bricolé : les replis que les vraies données ne portent pas ──
  const bricole = copie(refs);
  const org = bricole.organisation;
  // Un intérim **actif**, pour la ligne de poste barrée et le bouton de retour.
  org[1] = { ...org[1], interim_id: (bricole.inspecteurs[0] || {}).id, interim_actif: true,
    registre: [{ role: 'interim', person_id: (bricole.inspecteurs[0] || {}).id, start: '2026-01-02T08:00:00Z', end: null },
      { role: 'titulaire', person_id: (bricole.inspecteurs[1] || {}).id, start: '2025-01-02T08:00:00Z', end: '2026-01-01T08:00:00Z' }] };
  // Un poste vacant, et une entité sans poste du tout.
  org[2] = { ...org[2], titulaire_id: '', poste: 'Poste sans titulaire' };
  org[3] = { ...org[3], poste: '', titulaire_id: '', interim_id: '' };
  // Une entité d'un type inconnu des niveaux : la couleur de repli.
  org[4] = { ...org[4], type: 'Type inconnu <b>&' };
  // Un rattachement vers une personne absente du répertoire : la pastille muette.
  //
  // Et un rattachement vers une personne qui **existe**, sans quoi les pastilles
  // ne paraîtraient jamais : les deux rattachements du jeu de travail désignent
  // des `person_id` **absents** du répertoire du personnel, et
  // `orgAssignedChips` rend donc la chaîne vide sur les vraies données. De même,
  // `circuitHtml` ne prenait que sa branche `null` — les cinq comparaisons de la
  // chaîne de validation portaient toutes sur le même cas.
  //
  // Trouvé le 12 octobre par une garde de `comparer-taxinomie.js`, qui cherchait
  // autre chose. Les pastilles et la chaîne sont par ailleurs couvertes par la
  // ronde du glisser-déposer de la suite « parcours » (5.c.11), qui crée un vrai
  // rattachement — mais une preuve de balisage qui ne rend jamais la pastille ne
  // prouve rien d'elle.
  const quelquun = (refs.inspecteurs || [])[0];
  const autre = (refs.inspecteurs || [])[1];
  if (!quelquun) throw new Error('refus : pas de personnel — le régime ne prouverait rien');
  const feuille = (refs.organisation || []).find((o) => o.parent_id);
  bricole.organisation_assignments = [...bricole.organisation_assignments,
    { id: 'za', org_id: org[0].id, person_id: 'personne-absente', person_type: 'inspecteur' },
    { id: 'zb', org_id: org[0].id, person_id: quelquun.id, person_type: 'inspecteur' },
    ...(feuille && autre
      ? [{ id: 'zc', org_id: feuille.id, person_id: autre.id, person_type: 'inspecteur' }]
      : [])];
  comparerRegime('bricolé, liste', bricole, 'fr', 'list', tab);
  comparerRegime('bricolé, hiérarchie', bricole, 'fr', 'tree', tab);

  // Et une organisation vide : les deux replis « aucune entité » / « aucun personnel ».
  comparerRegime('vide', { ...refs, organisation: [], inspecteurs: [], organisation_assignments: [] }, 'fr', 'list', tab);

  // ── Deux régimes posés après des contre-essais qui n'ont pas mordu ──
  //
  // Ôter le garde-fou du cycle de `orgChainFor`, et changer la couleur de repli
  // d'un niveau inconnu : **aucun des deux ne faisait d'écart**. La raison était
  // la même dans les deux cas — les données ne produisent pas la situation.
  //
  //   · aucun `parent_id` ne boucle, et la boucle `while` s'arrête d'elle-même ;
  //   · aucune hiérarchie ne descend au-delà du cinquième niveau, et
  //     `levelIndex[type] ?? depth` rend donc toujours un indice valide.
  //
  // *Un contre-essai qui ne mord pas ne dit pas que le code est bon : il dit que
  // la donnée ne l'éprouve pas.* Les deux situations sont donc fabriquées.

  // Un cycle : deux entités se désignant l'une l'autre, et une personne
  // rattachée à l'une d'elles. Sans le garde-fou, `orgChainFor` tournerait sans
  // fin et figerait l'écran — ce qu'une donnée venue d'un import peut produire,
  // puisqu'elle ne passe pas par le formulaire qui l'interdit.
  const cyclique = copie(refs);
  cyclique.organisation = [
    ...refs.organisation,
    { id: 'cyc-a', type: 'Direction', sigle: 'CYC-A', libelle: 'Boucle A', parent_id: 'cyc-b', ordre: 90 },
    { id: 'cyc-b', type: 'Direction', sigle: 'CYC-B', libelle: 'Boucle B', parent_id: 'cyc-a', ordre: 91 },
  ];
  cyclique.inspecteurs = [...refs.inspecteurs, { id: 'cyc-p', nom: 'BOUCLE', prenom: 'Test', est_inspecteur: 'non' }];
  cyclique.organisation_assignments = [...refs.organisation_assignments,
    { id: 'cyc-r', org_id: 'cyc-a', person_id: 'cyc-p', person_type: 'inspecteur' }];
  comparerRegime('cycle de rattachement', cyclique, 'fr', 'list', tab);

  // Une hiérarchie de sept niveaux, aux types inconnus des niveaux déclarés :
  // au-delà du cinquième, `LEVEL_COLORS` n'a plus de couleur et le repli
  // `#64748b` s'applique.
  const profonde = copie(refs);
  const chaine = [];
  for (let i = 0; i < 7; i += 1) {
    chaine.push({
      id: `prof-${i}`, type: `Niveau inconnu ${i}`, sigle: `P${i}`, libelle: `Profondeur ${i}`,
      parent_id: i === 0 ? '' : `prof-${i - 1}`, ordre: i,
    });
  }
  profonde.organisation = chaine;
  comparerRegime('hiérarchie de sept niveaux, liste', profonde, 'fr', 'list', tab);
  comparerRegime('hiérarchie de sept niveaux, arbre', profonde, 'fr', 'tree', tab);

  // ── La normalisation, sur une donnée qui lui donne du travail ──
  const conforme = { aac: { sigle: 'ANAC', nom: "Agence Nationale de l'Aviation Civile" } };
  comparerNormalisation(refs, conforme, tab);
  // Un écart fabriqué : l'entité de niveau 1 porte un autre nom que l'AAC.
  const decale = copie(refs);
  const lv = decale.organisation_levels.slice().sort((a, b) => a.ordre - b.ordre);
  const top = lv.length ? lv[0].type : null;
  let touchees = 0;
  decale.organisation = decale.organisation.map((o) => {
    if (o.type !== top) return o;
    touchees += 1;
    return { ...o, sigle: 'AUTRE', libelle: 'Un autre nom' };
  });
  if (!touchees) throw new Error('refus : aucune entité de niveau 1 — le régime bricolé ne prouverait rien');
  comparerNormalisation(decale, conforme, tab);
  comparerNormalisation(decale, { aac: { sigle: 'XX' } }, tab);  // nom absent : seul le sigle suit
  comparerNormalisation(decale, { aac: {} }, tab);               // rien à reprendre
  comparerNormalisation(decale, null, tab);                      // configuration non lue

  console.log(`  ${comparaisons} comparaisons, caractère pour caractère`);
  console.log(`  dont la normalisation de l’entité de niveau 1, éprouvée sur un écart fabriqué`);
  console.log(`  (${touchees} entité(s) de niveau « ${top} ») — sur le jeu de travail elle ne change rien.`);
  console.log('  Les dix gestes qui touchent au document ou à l’API sont couverts par');
  console.log('  la suite « parcours » (rattachement, intérim, registre, présentations — 5.c.11).');
  if (ecarts.length) {
    console.log(`\n  ✗ ${ecarts.length} écart(s) :\n`);
    ecarts.slice(0, 6).forEach((e) => console.log(`    · ${e}`));
    if (ecarts.length > 6) console.log(`    … et ${ecarts.length - 6} autre(s)`);
    process.exit(1);
  }
  console.log('\n  ✓ aucune différence\n');
}

if (require.main === module) principal();
