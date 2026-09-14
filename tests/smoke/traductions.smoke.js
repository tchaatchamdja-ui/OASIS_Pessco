// Fumée — garde-fou des tables de traduction.
//
// Chaque module range ses libellés dans une table à trois volets — `fr`, `en`,
// `pt` — et sa fonction de traduction retombe sur le français, puis sur la clé
// elle-même. Une clé oubliée dans un volet ne fait donc rien échouer : l'écran
// s'affiche, en français au milieu du portugais. Une clé écrite dans le seul
// volet portugais ne s'affiche jamais, et personne ne le remarque.
//
// Les deux défauts se sont présentés ensemble dans Planification :
// `cal_avancar` n'existait qu'en portugais — le nom de la clé avait été traduit
// avec sa valeur. La suite refuse désormais que les trois volets divergent.
//
// Elle ne démarre pas de serveur : elle lit les sources.
const fs = require('fs');
const path = require('path');
const { verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');

// Un module : le nom de sa table globale, et le dossier de ses scripts.
const TABLES = [
  { nom: 'portail', global: 'I18N', dossier: 'public/js' },
  { nom: 'SURV', global: 'EXEC_TR', dossier: 'public/modules/execution/js' },
  { nom: 'PLAN', global: 'PLAN_TR', dossier: 'public/modules/planification/js' },
  { nom: 'RAMP', global: 'RAMP_TR', dossier: 'public/modules/ramp/js' },
  { nom: 'CARE', global: 'MES_TR', dossier: 'public/modules/mesures/js' },
  { nom: 'PR', global: 'TRANSLATIONS', dossier: 'public/modules/profil_risque/js' },
  { nom: 'DROITS', global: 'DR_TR', dossier: 'public/modules/droits/js' },
];

const LANGUES = ['fr', 'en', 'pt'];

function scripts(dossier) {
  const liste = [];
  const parcourir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { parcourir(p); return; }
    if (e.name.endsWith('.js')) liste.push(p);
  });
  parcourir(path.join(RACINE, dossier));
  return liste.sort();
}

// Clés de premier niveau de l'objet littéral ouvert à `debut` (index de son « { »).
//
// Les tables ne s'exécutent pas hors navigateur : on les lit. Chaînes et
// commentaires sont traversés sans être interprétés — un commentaire français
// porte des apostrophes qui, lues comme du code, ouvriraient une chaîne
// fantôme avalant le reste du bloc.
function clesDuBloc(texte, debut) {
  const cles = [];
  let i = debut + 1;
  let profondeur = 0;
  let chaine = null;
  while (i < texte.length) {
    const c = texte[i];
    if (chaine) {
      if (c === '\\') { i += 2; continue; }
      if (c === chaine) chaine = null;
      i += 1;
      continue;
    }
    if (c === '/' && texte[i + 1] === '/') {
      i = texte.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && texte[i + 1] === '*') {
      i = texte.indexOf('*/', i);
      if (i < 0) break;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { chaine = c; i += 1; continue; }
    if (c === '{' || c === '[' || c === '(') { profondeur += 1; i += 1; continue; }
    if (c === '}' || c === ']' || c === ')') {
      if (c === '}' && profondeur === 0) break;
      profondeur -= 1;
      i += 1;
      continue;
    }
    if (profondeur === 0 && /[\s,{]/.test(texte[i - 1] || '')) {
      const m = /^([A-Za-z_$][A-Za-z0-9_$]*|'[^']+'|"[^"]+")\s*:/.exec(texte.slice(i));
      if (m) {
        cles.push(m[1].replace(/^['"]|['"]$/g, ''));
        i += m[0].length;
        continue;
      }
    }
    i += 1;
  }
  return cles;
}

// Un volet s'ouvre de trois façons : dans la table elle-même (`pt: {`), par
// affectation depuis un fichier chargé ensuite (`EXEC_TR.pt = {`), ou par
// complément (`Object.assign(RAMP_TR.pt, {`).
function clesDeLangue(fichiers, global, langue) {
  const cles = new Set();
  const motifs = [
    new RegExp(`(^|[^A-Za-z0-9_$.])${langue}\\s*:\\s*\\{`, 'g'),
    new RegExp(`${global}\\.${langue}\\s*=\\s*\\{`, 'g'),
    new RegExp(`Object\\.assign\\(\\s*${global}\\.${langue}\\s*,\\s*\\{`, 'g'),
  ];
  fichiers.forEach((f) => {
    const texte = fs.readFileSync(f, 'utf8');
    motifs.forEach((re) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(texte))) {
        const ouverture = texte.indexOf('{', m.index + m[0].length - 1);
        clesDuBloc(texte, ouverture).forEach((k) => cles.add(k));
      }
    });
  });
  return cles;
}

module.exports = async function () {
  console.log('\n── Garde-fou : tables de traduction ──');

  const ecarts = [];
  const vides = [];

  TABLES.forEach((mod) => {
    const fichiers = scripts(mod.dossier);
    const par = {};
    LANGUES.forEach((lg) => { par[lg] = clesDeLangue(fichiers, mod.global, lg); });

    // Une table illisible passerait pour une table sans écart : on le dit.
    if (LANGUES.some((lg) => par[lg].size === 0)) {
      vides.push(`${mod.nom} (${LANGUES.map((lg) => `${lg}:${par[lg].size}`).join(' ')})`);
      return;
    }

    LANGUES.slice(1).forEach((lg) => {
      [...par.fr].filter((k) => !par[lg].has(k))
        .forEach((k) => ecarts.push(`${mod.nom} : « ${k} » sans ${lg}`));
      [...par[lg]].filter((k) => !par.fr.has(k))
        .forEach((k) => ecarts.push(`${mod.nom} : « ${k} » en ${lg} seulement`));
    });
  });

  verifier('chaque table de traduction est lisible',
    vides.length === 0, vides.join(' · '));
  verifier('les trois volets de chaque table portent les mêmes clés',
    ecarts.length === 0, `${ecarts.length} écart(s) — ${ecarts.slice(0, 6).join(' · ')}`);

  return bilan('traductions');
};
