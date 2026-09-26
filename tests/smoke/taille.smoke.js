// Fumée — garde-fou de taille du code.
//
// Un fichier de dix-sept mille lignes ne s'écrit pas d'un coup : il grossit de
// cent lignes à la fois, sans que rien ne le signale. Cette suite mesure et
// refuse la croissance : au-delà des seuils, un fichier ou une fonction doit
// figurer dans la liste des exceptions ci-dessous, avec sa taille constatée.
// Dépasser cette taille fait échouer la suite ; il faut alors découper, ou
// justifier en relevant la borne.
//
// Elle ne démarre pas de serveur : elle lit les sources.
const fs = require('fs');
const path = require('path');
const { verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const DOSSIERS = ['public', 'src'];

// Au-delà de ces seuils, l'exception doit être déclarée.
const SEUIL_FICHIER = 2000;
const SEUIL_FONCTION = 250;
// Marge tolérée sur une exception avant l'échec : un fichier peut respirer,
// pas doubler.
const MARGE = 1.05;
// Redéfinitions de sélecteurs CSS constatées à la mise en place du garde-fou.
// Une règle écrite deux fois dans la même feuille en annule silencieusement une
// autre : la suite refuse qu'il s'en ajoute, sans exiger de résoudre d'un coup
// les vingt-cinq héritées (portail, exécution, planification, profils, RAMP).
const DOUBLONS_CSS_TOLERES = 13;

// Aucun fichier ne franchit plus le seuil : les six qui le dépassaient ont été
// découpés en morceaux consécutifs, chargés dans le même ordre. Une exception
// se déclarerait ici, avec la taille constatée à ne pas dépasser.
const FICHIERS_TOLERES = {};

// Aucune fonction ne franchit plus le seuil : les dix qui le dépassaient ont
// été décomposées. Une exception se déclarerait ici, avec sa longueur.
const FONCTIONS_TOLEREES = {};

function sources() {
  const liste = [];
  const parcourir = (dossier) => {
    fs.readdirSync(dossier, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) { if (!/node_modules|\.git/.test(p)) parcourir(p); return; }
      if (/\.(js|css)$/.test(e.name)) liste.push(p);
    });
  };
  DOSSIERS.forEach((d) => parcourir(path.join(RACINE, d)));
  return liste;
}

const relatif = (f) => path.relative(RACINE, f).split(path.sep).join('/');

// Les pages de l'application. `sources()` ne retient que .js et .css ; deux
// gardes portent sur le balisage, et lisent donc cette liste-ci.
function pagesHtml() {
  const liste = [];
  const parcourir = (dossier) => {
    fs.readdirSync(dossier, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) { if (!/node_modules|\.git/.test(p)) parcourir(p); return; }
      if (e.name.endsWith('.html')) liste.push(p);
    });
  };
  parcourir(path.join(RACINE, 'public'));
  return liste;
}

// Longueur d'une fonction déclarée en colonne 0 : de sa signature à l'accolade
// qui la referme. Les fabriques imbriquées comptent avec elle — c'est bien la
// taille du bloc que l'on veut mesurer.
function fonctionsDe(fichier) {
  const l = fs.readFileSync(fichier, 'utf8').split('\n');
  const res = [];
  for (let i = 0; i < l.length; i += 1) {
    const m = l[i].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
    if (!m) continue;
    let solde = 0;
    let ouverte = false;
    let j = i;
    for (; j < l.length; j += 1) {
      for (const c of l[j]) {
        if (c === '{') { solde += 1; ouverte = true; } else if (c === '}') solde -= 1;
      }
      if (ouverte && solde <= 0) break;
    }
    res.push({ nom: m[1], lignes: j - i + 1 });
    i = j;
  }
  return res;
}

module.exports = async function tailleSmoke() {
  console.log('\n── Garde-fou : taille des fichiers et des fonctions ──');

  const fichiers = sources();
  const trop = [];
  fichiers.forEach((f) => {
    const n = fs.readFileSync(f, 'utf8').split('\n').length;
    if (n <= SEUIL_FICHIER) return;
    const budget = FICHIERS_TOLERES[relatif(f)];
    if (budget === undefined) trop.push(`${relatif(f)} : ${n} lignes (non déclaré)`);
    else if (n > Math.round(budget * MARGE)) trop.push(`${relatif(f)} : ${n} lignes (toléré ${budget})`);
  });
  verifier(`aucun fichier au-delà de ${SEUIL_FICHIER} lignes hors exceptions déclarées`,
    trop.length === 0, trop.join(' · '));

  const longues = [];
  fichiers.filter((f) => f.endsWith('.js')).forEach((f) => {
    fonctionsDe(f).forEach(({ nom, lignes }) => {
      if (lignes <= SEUIL_FONCTION) return;
      const budget = FONCTIONS_TOLEREES[nom];
      if (budget === undefined) longues.push(`${nom} : ${lignes} lignes — ${relatif(f)}`);
      else if (lignes > Math.round(budget * MARGE)) longues.push(`${nom} : ${lignes} lignes (toléré ${budget})`);
    });
  });
  verifier(`aucune fonction au-delà de ${SEUIL_FONCTION} lignes hors exceptions déclarées`,
    longues.length === 0, longues.join(' · '));

  // Un sélecteur défini deux fois dans la même feuille, c'est une règle qui en
  // annule une autre — la source de plusieurs corrections déjà passées ici.
  const doublons = [];
  fichiers.filter((f) => f.endsWith('.css')).forEach((f) => {
    const texte = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const vus = new Map();
    // Sélecteurs de premier niveau seulement : ceux d'une media query
    // redéfinissent volontairement les mêmes règles.
    let profondeur = 0;
    let debut = 0;
    for (let i = 0; i < texte.length; i += 1) {
      const c = texte[i];
      if (c === '{') {
        if (profondeur === 0) {
          const sel = texte.slice(debut, i).trim().replace(/\s+/g, ' ');
          if (sel && !sel.startsWith('@')) vus.set(sel, (vus.get(sel) || 0) + 1);
        }
        profondeur += 1;
      } else if (c === '}') {
        profondeur -= 1;
        if (profondeur === 0) debut = i + 1;
      }
    }
    [...vus.entries()].filter(([, n]) => n > 1)
      .forEach(([sel, n]) => doublons.push(`${relatif(f)} : « ${sel} » ×${n}`));
  });
  // Les redéfinitions existantes sont recensées : la suite refuse qu'il s'en
  // ajoute, sans exiger de toutes les résoudre d'un coup.
  verifier('pas de nouvelle redéfinition de sélecteur CSS',
    doublons.length <= DOUBLONS_CSS_TOLERES, `${doublons.length} redéfinition(s) — ${doublons.slice(0, 6).join(' · ')}`);

  // ── Cellules d'actions : elles restent des cellules ──
  // Passer un « td » en flex ou en grid le sort du modèle tabulaire : sa
  // hauteur ne suit plus celle de la ligne, et les traits de séparation ne
  // s'alignent plus sur les colonnes voisines. Le défaut s'est présenté trois
  // fois ; la suite le refuse désormais d'emblée. La disposition des boutons se
  // fait dans un élément intérieur, jamais sur la cellule.
  // Classes qui habillent une cellule de tableau sans le dire dans leur nom.
  // Chaque entrée est un « td » : la règle vaut donc pour elle aussi.
  const CLASSES_CELLULES = new Set(['.mes-actions', '.ramp-cell-actions', '.exec-actions-cell']);

  const cellulesEnFlex = [];
  fichiers.filter((f) => f.endsWith('.css')).forEach((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regles = texte.match(/[^{}]+\{[^{}]*\}/g) || [];
    regles.forEach((regle) => {
      const [selBrut, corps] = regle.split('{');
      const sel = selBrut.trim().replace(/\s+/g, ' ');
      if (sel.startsWith('@') || !sel) return;
      // C'est le dernier maillon du sélecteur qui dit ce que la règle habille :
      // « .actions-cell .btn » vise le bouton, « .actions-cell » la cellule.
      const cible = (bout) => bout.split(/[\s>+~]+/).filter(Boolean).pop() || '';
      const estCellule = sel.split(',').some((bout) => {
        const dernier = cible(bout.trim()).replace(/[:[].*$/, '');
        // « td », et toute classe qui nomme une cellule d'actions — quel que
        // soit l'ordre des mots : actions-cell, cell-actions, td-actions, ou
        // simplement « …-actions » comme .mes-actions, qui porte une cellule.
        return /^td([.#]|$)/.test(dernier)
          || /(^|-)(cell-actions|actions-cell|td-actions)$/.test(dernier)
          || CLASSES_CELLULES.has(dernier);
      });
      if (!estCellule) return;
      if (/display:\s*(flex|inline-flex|grid|inline-grid)/.test(corps)) {
        cellulesEnFlex.push(`${relatif(fichier)} : « ${sel} »`);
      }
    });
  });
  // Le même défaut s'écrit aussi dans les gabarits, en style en ligne :
  // « <td style="display:flex;…"> ». La lecture des seules feuilles l'avait
  // laissé passer neuf fois.
  fichiers.filter((f) => f.endsWith('.js')).forEach((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8');
    for (const m of texte.matchAll(/<t[dh]\b[^>]*\bstyle="[^"]*display:\s*(?:flex|inline-flex|grid|inline-grid)/g)) {
      cellulesEnFlex.push(`${relatif(fichier)}:${texte.slice(0, m.index).split('\n').length} (style en ligne)`);
    }
  });
  verifier('aucune cellule de tableau mise en flex ou en grille',
    cellulesEnFlex.length === 0, cellulesEnFlex.join(' · '));

  // ── Une frappe d'agent ne s'écrit jamais crue dans un attribut ──
  // Le terme de recherche est réinjecté dans « value » à chaque rendu. Sans
  // échappement, une valeur qui porte un guillemet referme l'attribut et ce
  // qui suit devient du balisage : cinq champs du Profil de Risque en sont
  // sortis ainsi. La règle vaut pour toute valeur de filtre — ce sont les
  // seules que l'utilisateur compose lui-même.
  const crues = [];
  const VALEUR_CRUE = /\bvalue="\$\{\s*(?!(?:[\w$.]*(?:[Ee]sc|Attr)\s*\())[\w$.]*\b(?:search|recherche|filtre|query)\b[\w$.]*\s*(?:\|\|[^}]*)?\}"/g;
  fichiers.filter((f) => f.endsWith('.js')).forEach((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8');
    for (const m of texte.matchAll(VALEUR_CRUE)) {
      crues.push(`${relatif(fichier)}:${texte.slice(0, m.index).split('\n').length}`);
    }
  });
  verifier("aucun terme de recherche rendu dans un attribut sans échappement",
    crues.length === 0, crues.join(' · '));

  // ── i18n.js ne se charge pas seul ──
  // Il pose le thème enregistré dès sa dernière ligne, en appelant
  // `oasisThemeEnregistre`. Une page qui l'oublie s'arrête là, sur une
  // référence absente, et les lignes suivantes ne s'exécutent jamais — c'est
  // arrivé à la page des témoins de connexion, sans que rien ne le dise.
  const orphelines = [];
  pagesHtml().forEach((fichier) => {
    const html = fs.readFileSync(fichier, 'utf8');
    const balises = html.match(/<script\s+src="[^"]+"/g) || [];
    const rang = (src) => balises.findIndex((b) => b.includes(src));
    const i18n = rang('/js/i18n.js');
    if (i18n < 0) return;
    const theme = rang('/shared/js/oasis-theme.js');
    if (theme < 0 || theme > i18n) orphelines.push(relatif(fichier));
  });
  verifier('toute page qui charge i18n.js charge d’abord oasis-theme.js',
    orphelines.length === 0, orphelines.join(' · '));

  // ── Un bouton à icône porte son nom ──
  // Il n'a pas de texte : sans `aria-label`, un lecteur d'écran annonce
  // « bouton », et rien d'autre. `title` ne suffit pas — tous ne le lisent
  // pas. Cent cinq boutons étaient dans ce cas.
  const CLASSES_ICONE = /(btn-icone|btn-icon|shell-btn-icon|ramp-extension|cfg-sidebar-toggle)/;
  const muets = [];
  [...fichiers.filter((f) => f.endsWith('.js')), ...pagesHtml()].forEach((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8');
    for (const m of texte.matchAll(/<button\b[^>]*>/g)) {
      if (!CLASSES_ICONE.test(m[0]) || /aria-label=/.test(m[0])) continue;
      muets.push(`${relatif(fichier)}:${texte.slice(0, m.index).split('\n').length}`);
    }
  });
  verifier('chaque bouton à icône porte un nom accessible',
    muets.length === 0, `${muets.length} — ${muets.slice(0, 6).join(' · ')}`);

  // ── Feuilles partagées : chaque écran les charge ──
  // Filtres, retour d'action et attente sont réglés une fois pour toute
  // l'application. Une page qui les oublie repart avec ses propres couleurs.
  const PAGES = ['public/index.html', 'public/modules/ramp/index.html',
    'public/modules/execution/index.html', 'public/modules/planification/index.html',
    'public/modules/profil_risque/index.html', 'public/modules/mesures/index.html',
    'public/modules/droits/index.html'];
  const sansFiltres = PAGES.filter((rel) => {
    const chemin = path.join(RACINE, rel);
    if (!fs.existsSync(chemin)) return false;
    return !fs.readFileSync(chemin, 'utf8').includes('oasis-filtres.css');
  });
  verifier('chaque écran charge la feuille commune des filtres',
    sansFiltres.length === 0, sansFiltres.join(' · '));

  // ── Le registre des traitements suit les modules ──
  // Un registre est un document du responsable de traitement, et un document
  // prend du retard en silence. Celui-ci ne le peut pas : un module monté qui
  // n'y figure pas fait échouer la suite. C'est la seule façon qu'un registre
  // reste vrai — l'y obliger, plutôt que l'espérer.
  const REGISTRE = path.join(RACINE, 'docs', 'REGISTRE-DES-TRAITEMENTS.md');
  const dossierModules = path.join(RACINE, 'src', 'modules');
  const codesModules = fs.existsSync(dossierModules)
    ? fs.readdirSync(dossierModules)
      .filter((d) => fs.existsSync(path.join(dossierModules, d, 'module.json')))
      .map((d) => JSON.parse(fs.readFileSync(path.join(dossierModules, d, 'module.json'), 'utf8')).code)
      .filter(Boolean)
    : [];
  const registre = fs.existsSync(REGISTRE) ? fs.readFileSync(REGISTRE, 'utf8') : '';
  const absentsDuRegistre = codesModules.filter((c) => !new RegExp(`\\b${c}\\b`).test(registre));
  verifier('chaque module monté figure au registre des traitements',
    !!registre && absentsDuRegistre.length === 0,
    registre ? absentsDuRegistre.join(' · ') : 'registre introuvable');

  // Les collections qui portent des personnes doivent être déclarées à
  // l'intercepteur de consultations : une lecture non tracée ne laisse rien,
  // et l'oubli ne se voit donc jamais de lui-même.
  const consultations = require('../../src/consultations');
  const NATURES_ATTENDUES = ['identite', 'personnel', 'contact'];
  verifier('l’intercepteur de consultations couvre les trois natures de données personnelles',
    NATURES_ATTENDUES.every((n) => consultations.NATURES.includes(n)),
    consultations.NATURES.join(', '));

  // ── Un nom global, une définition ──
  // Les scripts d'un écran partagent une seule portée : deux fichiers qui
  // déclarent la même fonction ne se contredisent pas, le dernier chargé
  // efface l'autre — sans erreur, sans trace. Une version périmée peut ainsi
  // survivre des mois et revenir au premier changement d'ordre des balises.
  const DECLARATION = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
  const collisions = [];
  PAGES.forEach((rel) => {
    const page = path.join(RACINE, rel);
    if (!fs.existsSync(page)) return;
    const html = fs.readFileSync(page, 'utf8');
    const ou = new Map();
    (html.match(/<script\s+src="[^"]+"/g) || []).forEach((balise) => {
      const src = balise.match(/src="([^"]+)"/)[1];
      if (!src.startsWith('/')) return;
      const f = path.join(RACINE, 'public', src);
      if (!fs.existsSync(f)) return;
      const code = fs.readFileSync(f, 'utf8');
      let m;
      DECLARATION.lastIndex = 0;
      while ((m = DECLARATION.exec(code)) !== null) {
        const nom = m[1] || m[2];
        if (!ou.has(nom)) ou.set(nom, new Set());
        ou.get(nom).add(path.basename(f));
      }
    });
    ou.forEach((fichiers, nom) => {
      if (fichiers.size > 1) collisions.push(`${path.basename(path.dirname(rel))}/${nom} : ${[...fichiers].join(', ')}`);
    });
  });
  verifier('aucun nom global déclaré dans deux fichiers du même écran',
    collisions.length === 0, collisions.join(' · '));

  // ── Pas de caractère de contrôle dans les sources ──
  // Un caractère nul posé en clair dans un fichier — comme séparateur, ou dans
  // une classe d'expression régulière — fonctionne, mais le fait passer pour un
  // binaire : les outils de recherche cessent d'en montrer la moindre ligne, et
  // le fichier devient invisible aux relectures. La valeur s'écrit échappée.
  const CONTROLE = /[\x00-\x08\x0e-\x1f\x7f]/;
  const salis = sources()
    .filter((f) => /\.(js|json|css|html|md)$/.test(f))
    .filter((f) => CONTROLE.test(fs.readFileSync(f, 'utf8')))
    .map(relatif);
  verifier('aucun caractère de contrôle dans les sources',
    salis.length === 0, salis.join(' · '));

  // ── Dates des écrans : le calendrier de l'agent, pas celui de Greenwich ──
  // `toISOString` rend la date en temps universel. À UTC+1 — Bénin, Niger —
  // la date du jour ainsi lue retardait d'un jour entre minuit et une heure,
  // et une date construite à minuit local sortait la veille, toujours. Les
  // écrans passent par `oasisJour` / `oasisHorodatage` (oasis-dates.js).
  const JOUR_UTC = /new Date\(\)\.toISOString\(\)\.(slice|substring)\(/;
  const MINUIT_LOCAL = /T00:00:00[`'"]\)[\s\S]{0,160}?\.toISOString\(\)\.(slice|substring)\(0, ?10\)/;
  const ecrans = sources().filter((f) => relatif(f).startsWith('public/modules/') && f.endsWith('.js'));
  const jourUtc = ecrans.filter((f) => JOUR_UTC.test(fs.readFileSync(f, 'utf8'))).map(relatif);
  verifier('date du jour des écrans lue dans le calendrier local',
    jourUtc.length === 0, jourUtc.join(' · '));
  const minuitLocal = ecrans.filter((f) => MINUIT_LOCAL.test(fs.readFileSync(f, 'utf8'))).map(relatif);
  verifier('aucune date construite à minuit local relue en temps universel',
    minuitLocal.length === 0, minuitLocal.join(' · '));

  return bilan('taille');
};
