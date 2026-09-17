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

  controlerPhrasesServeur();
  controlerAccentsPortugais();

  return bilan('traductions');
};

// ── Accents du portugais ──
// Des formes sans accent déjà corrigées une fois — « constituida »,
// « decisoria », « Avancar » — ne doivent pas revenir. Aucune n'existe en
// français ni en anglais : on les cherche dans les chaînes des volets
// portugais, du marqueur `pt` à la fin de chaque table.
const SANS_ACCENT_PT = ['constituida', 'constituidas', 'constituido', 'constituidos', 'decisoria', 'decisorio',
  'incluida', 'incluidas', 'incluido', 'incluidos', 'excluida', 'excluidas', 'excluido', 'excluidos',
  'substituida', 'substituido', 'especifico', 'especifica', 'avancar', 'tambem', 'ultimo', 'ultima',
  'codigo', 'periodo', 'analise', 'pagina', 'inicio', 'obrigatorio', 'obrigatoria', 'relatorio', 'nao'];

function controlerAccentsPortugais() {
  const tables = [
    ...TABLES.map((t) => t.dossier), 'public/shared/js',
  ].flatMap((d) => scripts(d)).filter((f) => /i18n|pr-utils|oasis-messages-serveur|oasis-dates|oasis-commun/.test(f));
  const fautes = [];
  const motif = new RegExp(`\\b(${SANS_ACCENT_PT.join('|')})\\b`, 'i');
  tables.forEach((f) => {
    const texte = fs.readFileSync(f, 'utf8');
    const i = texte.search(/\bpt\s*[:=]\s*\{|EXEC_TR\.pt\b/);
    // Tables à un seul volet par ligne (messages, dates, erreurs) : on lit le
    // troisième élément de chaque triplet, qui est le portugais.
    const portugais = i >= 0 ? texte.slice(i)
      : [...texte.matchAll(/\[\s*(['"`])(?:\\.|(?!\1).)*\1\s*,\s*(['"`])(?:\\.|(?!\2).)*\2\s*(?:,\s*(['"`])((?:\\.|(?!\3).)*)\3)?/g)]
        .map((m) => m[4] || '').join('\n')
        + [...texte.matchAll(/\bpt\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).join('\n');
    for (const s of portugais.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)) {
      const m = motif.exec(s[2]);
      if (m) fautes.push(`${path.relative(RACINE, f)} : « ${m[1]} »`);
    }
    if (i < 0) {
      const m = motif.exec(portugais);
      if (m) fautes.push(`${path.relative(RACINE, f)} : « ${m[1]} »`);
    }
  });
  const uniques = [...new Set(fautes)];
  verifier('volets portugais : aucune forme privée de son accent', uniques.length === 0, uniques.slice(0, 6).join(' · '));
}

// ── Phrases d'erreur du serveur ──
// Le serveur répond souvent par une phrase française ; l'écran la traduit par
// la table oasis-messages-serveur.js. Chaque phrase émise doit y figurer, avec
// ses deux traductions et les mêmes trous.
function sourcesServeur() {
  const liste = [path.join(RACINE, 'server.js')];
  const parcourir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { parcourir(p); return; }
    if (e.name.endsWith('.js')) liste.push(p);
  });
  parcourir(path.join(RACINE, 'src'));
  return liste;
}

// La phrase qui suit `error:` ou `refuser(res,` : une ou plusieurs chaînes
// jointes par « + ». Les interpolations deviennent des trous {0}, {1}…
function phrasesServeur() {
  const phrases = new Map();
  const LITTERAL = /^\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/;
  sourcesServeur().forEach((f) => {
    const texte = fs.readFileSync(f, 'utf8');
    for (const m of texte.matchAll(/(?:\berror\s*:|\brefuser\(\s*res\s*,)/g)) {
      let reste = texte.slice(m.index + m[0].length);
      let phrase = '';
      let lu = LITTERAL.exec(reste);
      if (!lu) continue;
      while (lu) {
        phrase += lu[2];
        reste = reste.slice(lu[0].length);
        const suite = /^\s*\+/.exec(reste);
        if (!suite) break;
        reste = reste.slice(suite[0].length);
        lu = LITTERAL.exec(reste);
      }
      if (/^[a-z0-9_]*$/.test(phrase)) continue; // un code, non une phrase
      let n = 0;
      const gabarit = phrase.replace(/\$\{[^}]*\}/g, () => `{${n++}}`).replace(/\\(['"`])/g, '$1');
      const ou = `${path.relative(RACINE, f)}:${texte.slice(0, m.index).split('\n').length}`;
      if (!phrases.has(gabarit)) phrases.set(gabarit, ou);
    }
  });
  return phrases;
}

function controlerPhrasesServeur() {
  const fenetre = {};
  const vm = require('vm');
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public/shared/js/oasis-messages-serveur.js'), 'utf8'),
    vm.createContext({ window: fenetre }));
  const table = fenetre.OASIS_MESSAGES_SERVEUR || {};
  const trous = (s) => (String(s).match(/\{\d\}/g) || []).sort().join('');

  const phrases = phrasesServeur();
  const absentes = [...phrases].filter(([p]) => !table[p]);
  verifier(`chaque phrase d'erreur du serveur est traduite (${phrases.size})`,
    absentes.length === 0, absentes.slice(0, 5).map(([p, ou]) => `« ${p} » (${ou})`).join(' · '));

  const bancales = Object.entries(table).filter(([fr, t]) => !Array.isArray(t) || t.length !== 2
    || t.some((x) => !x || trous(x) !== trous(fr)));
  verifier('chaque entrée a ses deux traductions, avec les mêmes trous',
    bancales.length === 0, bancales.slice(0, 5).map(([fr]) => fr).join(' · '));

  // Toute page qui traduit les erreurs doit charger la table.
  const pages = ['public/index.html', ...fs.readdirSync(path.join(RACINE, 'public/modules'))
    .map((m) => `public/modules/${m}/index.html`)]
    .filter((p) => fs.existsSync(path.join(RACINE, p)));
  const sansTable = pages.filter((p) => {
    const h = fs.readFileSync(path.join(RACINE, p), 'utf8');
    return h.includes('oasis-commun.js') && !h.includes('oasis-messages-serveur.js');
  });
  verifier('chaque écran qui traduit les erreurs charge la table des phrases',
    sansTable.length === 0, sansTable.join(' · '));

  const mortes = Object.keys(table).filter((fr) => !phrases.has(fr));
  verifier('aucune traduction pour une phrase que le serveur n’émet plus',
    mortes.length === 0, mortes.slice(0, 5).join(' · '));

  // La traduction elle-même, telle que l'écran l'applique.
  const bac = { window: fenetre, localStorage: { getItem: () => 'fr' } };
  bac.window.PESSCO = { lang: 'fr' };
  const ctx = vm.createContext(bac);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'public/shared/js/oasis-commun.js'), 'utf8'), ctx);
  const dire = (langue, corps) => { fenetre.PESSCO.lang = langue; return fenetre.oasisMessageErreur(corps, 400); };
  const r = {
    fr: dire('fr', { error: 'Classeur illisible' }),
    en: dire('en', { error: 'Classeur illisible' }),
    pt: dire('pt', { error: 'Classeur illisible' }),
    normFr: dire('fr', { error: 'introuvable', objet: 'carence' }),
    normEn: dire('en', { error: 'introuvable', objet: 'carence' }),
    normPt: dire('pt', { error: 'introuvable', objet: 'carence' }),
    normPtM: dire('pt', { error: 'introuvable', objet: 'rapport' }),
    normInconnu: dire('en', { error: 'introuvable', objet: 'objet_que_la_table_ignore' }),
    requisFrF: dire('fr', { error: 'requis', objet: 'designation' }),
    requisFrM: dire('fr', { error: 'requis', objet: 'motif' }),
    requisEn: dire('en', { error: 'requis', objet: 'mot_de_passe' }),
    requisPt: dire('pt', { error: 'requis', objet: 'mot_de_passe' }),
    inconnuFr: dire('fr', { error: 'inconnu', objet: 'vue', attendu: ['a'] }),
    inconnuEn: dire('en', { error: 'inconnu', objet: 'type_processus' }),
    inconnuPt: dire('pt', { error: 'inconnu', objet: 'portee' }),
    existantFr: dire('fr', { error: 'existant', objet: 'categorie' }),
    existantEn: dire('en', { error: 'existant', objet: 'utilisateur' }),
    lourdFr: dire('fr', { error: 'fichier_trop_volumineux', maxMo: 3.5 }),
    lourdEn: dire('en', { error: 'fichier_trop_volumineux', maxMo: 25 }),
    lourdSansMax: dire('pt', { error: 'fichier_trop_volumineux' }),
    ecran: (() => { fenetre.PESSCO.lang = 'pt'; return fenetre.oasisChampRequis('intitule'); })(),
    gabarit: dire('pt', { error: 'Import refusé pour : Togo, Mali — hors de votre périmètre' }),
    horsPt: dire('pt', { error: 'hors_perimetre', objet: 'ecart', precision: 'Togo' }),
    horsEn: dire('en', { error: 'hors_perimetre', objet: 'contact' }),
    deuxTrous: dire('en', { error: 'Activité non réinitialisable : 2 constatation(s) et 1 rapport(s) en dépendent' }),
    message: dire('en', { message: 'Aucune donnée à exporter' }),
    inconnue: dire('en', { error: 'Une phrase que la table ignore' }),
    code: dire('pt', { error: 'plan_amende' }),
  };
  verifier('phrase du serveur rendue dans la langue de l’agent',
    r.fr === 'Classeur illisible' && r.en === 'Unreadable workbook' && r.pt === 'Livro de cálculo ilegível',
    JSON.stringify([r.fr, r.en, r.pt]));
  verifier('phrase à trous : la valeur passe dans la traduction',
    r.gabarit === 'Importação recusada para: Togo, Mali — fora do seu âmbito'
    && r.deuxTrous === 'Activity cannot be reset: 2 finding(s) and 1 report(s) depend on it',
    JSON.stringify([r.gabarit, r.deuxTrous]));
  verifier('phrase inconnue rendue telle quelle, code toujours traduit',
    r.message === 'No data to export' && r.inconnue === 'Une phrase que la table ignore'
    && /^Este plano foi emendado/.test(r.code), JSON.stringify([r.message, r.inconnue, r.code]));
  verifier('erreur normalisée composée dans la langue de l’agent, accordée',
    r.normFr === 'Carence introuvable' && r.normEn === 'Deficiency not found'
    && r.normPt === 'Deficiência não encontrada' && r.normPtM === 'Relatório não encontrado'
    && r.normInconnu === 'Item not found',
    JSON.stringify([r.normFr, r.normEn, r.normPt, r.normPtM, r.normInconnu]));

  verifier('champ requis accordé, au serveur comme à l’écran',
    r.requisFrF === 'Désignation requise' && r.requisFrM === 'Motif requis'
    && r.requisEn === 'Password required' && r.requisPt === 'Palavra-passe obrigatória'
    && r.ecran === 'Título obrigatório',
    JSON.stringify([r.requisFrF, r.requisFrM, r.requisEn, r.requisPt, r.ecran]));

  verifier('valeur inconnue et doublon composés, le nom à sa place',
    r.inconnuFr === 'Vue inconnue' && r.inconnuEn === 'Unknown process type'
    && r.inconnuPt === 'Âmbito desconhecido' && r.existantFr === 'Catégorie déjà existante'
    && r.existantEn === 'User already exists',
    JSON.stringify([r.inconnuFr, r.inconnuEn, r.inconnuPt, r.existantFr, r.existantEn]));

  verifier('hors périmètre composé, la précision entre parenthèses',
    r.horsPt === 'Constatação fora do seu âmbito (Togo)' && r.horsEn === 'Contact outside your scope',
    JSON.stringify([r.horsPt, r.horsEn]));

  verifier('fichier trop volumineux : la limite dite dans la langue de l’agent',
    r.lourdFr === 'Fichier trop volumineux (3,5 Mo maximum)' && r.lourdEn === 'File too large (25 MB maximum)'
    && r.lourdSansMax === 'Ficheiro demasiado grande.',
    JSON.stringify([r.lourdFr, r.lourdEn, r.lourdSansMax]));

  // Chaque objet cité par une erreur normalisée a son nom dans les trois
  // langues, et son genre là où la phrase s'accorde.
  const objets = fenetre.OASIS_OBJETS_SERVEUR || {};
  const cites = new Map();
  // Côté serveur, la réponse ; côté écran, le même message constaté avant l’envoi.
  const ecrans = [];
  const parcourirEcrans = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) parcourirEcrans(p);
    else if (e.name.endsWith('.js')) ecrans.push(p);
  });
  parcourirEcrans(path.join(RACINE, 'public'));
  [...sourcesServeur(), ...ecrans].forEach((f) => {
    const texte = fs.readFileSync(f, 'utf8');
    for (const m of texte.matchAll(/\b(?:(?:introuvable|requis|inconnu|existant|horsPerimetre)\(\s*res\s*,|oasisChampRequis\()\s*'([a-z_]+)'\s*[,)]/g)) {
      if (!cites.has(m[1])) cites.set(m[1], `${path.relative(RACINE, f)}:${texte.slice(0, m.index).split('\n').length}`);
    }
  });
  const sansNom = [...cites].filter(([k]) => {
    const o = objets[k];
    return !o || o.length !== 3 || !o[0][0] || !o[1][0] || !o[2][0] || !['m', 'f'].includes(o[0][1]) || !['m', 'f'].includes(o[2][1]);
  });
  verifier(`chaque objet des erreurs normalisées est nommé (${cites.size})`,
    sansNom.length === 0, sansNom.map(([k, ou]) => `« ${k} » (${ou})`).join(' · '));
  const orphelins = Object.keys(objets).filter((k) => k !== 'element' && !cites.has(k));
  verifier('aucun nom d’objet que le serveur ne cite plus', orphelins.length === 0, orphelins.join(' · '));
}
