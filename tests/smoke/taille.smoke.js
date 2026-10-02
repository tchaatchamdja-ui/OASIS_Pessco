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
// `server.js` est à la racine : les garde-fous ne le voyaient pas. Il porte
// 1 200 lignes, la moitié des inscriptions au journal d'audit et la lecture du
// plafond d'écritures — c'est-à-dire précisément ce que ces contrôles gardent.
// L'angle mort s'est vu à la première contre-épreuve qui ne mordait pas.
const FICHIERS_RACINE = ['server.js'];

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
  FICHIERS_RACINE.forEach((f) => liste.push(path.join(RACINE, f)));
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

  // ── La file du mode dégradé n'admet que de la saisie ──
  //
  // Différer une saisie de terrain est le but du mode dégradé. Différer une
  // validation, une transmission à l'exploitant ou une clôture serait autre
  // chose : ce sont des actes pris par quelqu'un qui décide, à un moment qui
  // compte. Les rejouer trois heures plus tard sur un dossier qui a bougé,
  // c'est signer à l'aveugle.
  //
  // Le jour où quelqu'un ajoutera `/valider` à la liste pour « que ça marche
  // aussi hors ligne », ce contrôle l'arrêtera. C'est le seul endroit du code
  // où une erreur de ce genre ne se verrait pas à l'exécution : elle ne se
  // manifesterait qu'au rejeu, sur une instance réelle, trop tard.
  const TRANSITIONS = /(valider|validate|soumettre|submit|transmettre|cloturer|close|renvoyer|reject|approuver|archiver|signer|decision|effacer|delete)/i;
  const fichierHL = path.join(RACINE, 'public', 'shared', 'js', 'oasis-hors-ligne.js');
  const sourceHL = fs.existsSync(fichierHL) ? fs.readFileSync(fichierHL, 'utf8') : '';
  // On lit les lignes, non les littéraux : analyser une expression régulière
  // écrite à la main revient à en écrire une pour les lire toutes, et la
  // première tentative s'arrêtait au premier « \/ » — elle ne voyait donc que
  // « /^\/api » de chaque motif, et ne pouvait rien attraper. La ligne entière
  // porte le motif et son libellé ; c'est tout ce qu'il faut.
  const bloc = sourceHL.match(/const DIFFERABLES = \[([\s\S]*?)\n {2}\];/);
  const motifs = bloc
    ? bloc[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{') && l.includes('motif:'))
    : [];
  verifier('la liste des écritures différables est lisible',
    motifs.length >= 3, `${motifs.length} entrée(s)`);
  const actes = motifs.filter((m) => TRANSITIONS.test(m));
  verifier('aucun acte d’autorité n’est différable hors ligne',
    actes.length === 0, actes.join(' · '));

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

  // ── Une collection passée en base ne se lit plus par `store` ──
  //
  // La bascule se fait collection par collection (ADR-002, jalon n° 9). Une
  // seule qui vive en base laisse derrière elle un fichier `data/<nom>.json`
  // figé au dernier jour des fichiers. Un appel synchrone oublié le lirait
  // **sans erreur** : l'écran montrerait une liste plausible mais périmée, et
  // toute écriture qui passerait par là serait perdue au prochain démarrage.
  //
  // Rien dans le langage n'empêche cet oubli — `store.load` existe toujours, et
  // rend un tableau. Ce contrôle s'en charge : les noms de `magasin.MIGREES`
  // n'apparaissent plus dans un appel à `store`, hors de la façade elle-même et
  // du script de reprise, qui doit lire les deux.
  //
  // La liste se lit **dans la source**, et non par `require` : charger
  // `src/magasin.js` chargerait `src/store.js`, qui fige son répertoire de
  // données à l'import. Cette suite tourne avant « unitaires », qui en désigne
  // un autre — le sien serait ignoré, et les écritures d'essai partiraient dans
  // le vrai `data/`.
  const sourceMagasin = fs.readFileSync(path.join(RACINE, 'src', 'magasin.js'), 'utf8');
  const blocMigrees = sourceMagasin.match(/const MIGREES = new Set\(\[([\s\S]*?)\n\]\);/);
  verifier('la liste des collections migrées se lit dans src/magasin.js', !!blocMigrees);
  const MIGREES = (blocMigrees ? blocMigrees[1].match(/'([^']+)'/g) || [] : [])
    .map((s) => s.slice(1, -1));
  const EXEMPTS = ['src/magasin.js', 'src/store.js', 'scripts/migrer-pg.js'];
  const enDouble = [];
  sources()
    .filter((f) => f.endsWith('.js') && !relatif(f).startsWith('public/'))
    .filter((f) => !EXEMPTS.includes(relatif(f)))
    .forEach((f) => {
      const src = fs.readFileSync(f, 'utf8');
      MIGREES.forEach((nom) => {
        if (new RegExp(`store\\.(load|save)\\(\\s*['"]${nom}['"]`).test(src)) {
          enDouble.push(`${relatif(f)} → ${nom}`);
        }
      });
    });
  verifier('aucune collection passée en base n’est encore lue par « store »',
    enDouble.length === 0, enDouble.join(' · '));

  // ── Le magasin d'un module en base ne se lit pas sans l'attendre ──
  //
  // Le jalon n° 13 fait passer les magasins de module en base : `db.list`,
  // `db.get`, `db.getColl` rendent désormais une promesse. C'est **le défaut le
  // plus discret de toute la bascule**, parce que ces appels ne sont pas des
  // prédicats qu'on reconnaît : ils sont le corps même des gestionnaires.
  //
  // Un `await` oublié ne lève pas. `res.json(promesse)` sérialise `{}` : un
  // écran de notations vide, qu'aucune erreur n'accompagne et que personne ne
  // distingue d'une AAC qui n'a rien saisi. Pire sur un `.find(...)` — la
  // promesse n'a pas de `.find`, donc une 500 sans rapport apparent avec un
  // `await`.
  //
  // **Le critère est que `list` soit asynchrone**, et non que le magasin
  // requière la façade : celui de RAMP la requiert depuis le jalon n° 9 pour la
  // seule nomenclature des aéronefs, tandis que ses autres collections restent
  // sur fichiers et se lisent encore de façon synchrone. Clore sur le `require`
  // désignait donc 150 lignes parfaitement correctes.
  //
  // Ce critère-ci n'est pas une déclaration qu'on peut oublier de poser : c'est
  // la propriété même dont le contrôle dépend. Un magasin converti est reconnu
  // du seul fait de sa conversion. La source se lit, et non le `require` — pour
  // la même raison que plus haut.
  const ASYNCHRONES = ['load', 'save', 'transformer', 'list', 'get', 'getColl',
    'seed', 'insert', 'update', 'remove', 'removeWhere'];
  const magasinsDeModule = fs.readdirSync(path.join(RACINE, 'src', 'modules'))
    .map((m) => ({ module: m, chemin: path.join(RACINE, 'src', 'modules', m, 'store.js') }))
    .filter(({ chemin }) => fs.existsSync(chemin))
    .filter(({ chemin }) => /\bconst list = async\b/.test(fs.readFileSync(chemin, 'utf8')));
  verifier('au moins un magasin de module est reconnu converti',
    magasinsDeModule.length > 0, magasinsDeModule.map((m) => m.module).join(' · '));

  const MAGASIN_NU = [];
  magasinsDeModule.forEach(({ module }) => {
    sources()
      .filter((f) => relatif(f).startsWith(`src/modules/${module}/`) && f.endsWith('.js'))
      .filter((f) => !relatif(f).endsWith('/store.js'))
      .forEach((f) => {
        fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
          const m = new RegExp(`(.{0,8})\\bdb\\.(${ASYNCHRONES.join('|')})\\(`).exec(ligne);
          if (!m) return;
          // Attendu sur place, ou transmis à un appelant qui l'attendra.
          if (/await\s*$/.test(m[1]) || /(return|=>)\s*$/.test(m[1])) return;
          MAGASIN_NU.push(`${relatif(f)}:${n + 1}`);
        });
      });
  });
  verifier('aucun magasin de module en base n’est lu sans « await »',
    MAGASIN_NU.length === 0, MAGASIN_NU.join(' · '));

  // ── Une garde « lire, vérifier, écrire » se tient dans la transformation ──
  //
  // Trois gestes du module « Profils de Risque » vérifient un état avant
  // d'écrire : la réévaluation n'est pas déjà lancée, l'évaluation n'est pas
  // verrouillée. Vérifiée **avant** la transformation, la garde ne garde rien —
  // deux demandes simultanées la passent toutes deux. C'est le défaut mesuré au
  // jalon n° 13, et la suite « unitaires » en tient la preuve avec sa
  // contre-épreuve.
  //
  // Ici c'est la forme : le drapeau est relu à l'intérieur du `db.transformer`.
  // Une rafale HTTP ne saurait pas le dire — dix requêtes contre un gestionnaire
  // rapide se sérialisent, et la contre-épreuve passait. Ce contrôle-ci, lui,
  // tombe dès que la relecture sort de la transformation.
  const dansLaTransformation = (fichier, garde) => {
    const src = fs.readFileSync(path.join(RACINE, 'src', 'modules', 'profil_risque', fichier), 'utf8');
    const i = src.indexOf('db.transformer(');
    const j = i < 0 ? -1 : src.indexOf(garde, i);
    return i >= 0 && j > i;
  };
  // Le marqueur est **le refus lui-même**, et non le nom du champ : `reevalue_le`
  // apparaît aussi dans la mise à jour du parent, à l'intérieur de la même
  // transformation, et la contre-épreuve passait sur cette occurrence-là.
  verifier('PR : la réévaluation refuse depuis la transformation',
    dansLaTransformation('routes-workflow.js', "refus = 'reevaluation_deja_lancee'"));
  verifier('PR : l’import de notes refuse depuis la transformation',
    dansLaTransformation('routes-excel.js', "refus = 'evaluation_verrouillee'"));

  // ── Un gestionnaire asynchrone est enveloppé, ou la requête reste ouverte ──
  //
  // Express 4 ne regarde pas la promesse que rend un gestionnaire `async`. Si
  // elle est rejetée, **rien ne se passe** : pas d'erreur 500, pas de trace, et
  // la requête reste ouverte jusqu'à expiration. Côté écran, une roue qui tourne
  // sans fin ; côté serveur, rien à lire.
  //
  // Le langage ne le signale pas — `async (req, res) => …` est parfaitement
  // valide sans enveloppe, et le jour où il échoue est le seul où cela se voit.
  // Ce contrôle est donc la seule chose qui tienne la règle, et il compte
  // d'autant plus que la bascule du magasin rend ces gestionnaires nombreux.
  // Ce qui distingue un gestionnaire d'une aide : le gestionnaire est **passé
  // en argument** — `app.post(chemin, requireAuth, async (req, res) => …` —,
  // l'aide est **affectée** — `const carenceEnSuivi = async (req, res) => …`.
  // Seul le premier est appelé par Express, donc seul le premier a besoin de
  // l'enveloppe ; une aide est attendue par son appelant, qui est lui-même
  // dans un gestionnaire enveloppé.
  const NUS = [];
  sources()
    .filter((f) => f.endsWith('.js') && !relatif(f).startsWith('public/') && !relatif(f).startsWith('tests/'))
    .forEach((f) => {
      const src = fs.readFileSync(f, 'utf8');
      let i = src.indexOf('async (req, res');
      while (i >= 0) {
        const avant = src.slice(Math.max(0, i - 11), i);
        const passeEnArgument = /,\s*$/.test(avant);
        if (passeEnArgument && !avant.endsWith('asynchrone(')) {
          NUS.push(`${relatif(f)}:${src.slice(0, i).split('\n').length}`);
        }
        i = src.indexOf('async (req, res', i + 1);
      }
    });
  verifier('tout gestionnaire de route asynchrone passe par « asynchrone »',
    NUS.length === 0, NUS.join(' · '));

  // ── Le bus ne se consomme pas sans l'attendre ──
  //
  // `services.call` et `callOr` rendent une promesse par contrat (étape A
  // d'ADR-002). Une consommation qui ne l'attend pas reçoit l'objet promesse :
  // `.filter` lève, mais `res.json` sérialise `{}` — une liste vide, sans
  // erreur, que l'écran croit. C'est le défaut que cette étape existe pour
  // rendre impossible, et rien dans le langage ne l'empêche.
  const BUS = [];
  sources()
    .filter((f) => f.endsWith('.js') && !relatif(f).startsWith('public/') && !relatif(f).startsWith('tests/'))
    .filter((f) => relatif(f) !== 'src/services.js')
    .forEach((f) => {
      fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
        if (!/services\.(call|callOr)\(/.test(ligne)) return;
        // Attendue sur place : le cas ordinaire.
        if (/\bawait\b/.test(ligne)) return;
        // Ou **transmise** sans être consommée — `return` d'une fonction
        // asynchrone, corps d'une flèche : la promesse remonte à l'appelant,
        // qui l'attendra. L'attendre ici ne changerait rien.
        if (/(return|=>)\s+[\w.]*services\.(call|callOr)\(/.test(ligne)) return;
        BUS.push(`${relatif(f)}:${n + 1}`);
      });
    });
  verifier('aucun appel au bus de services n’est consommé sans « await »',
    BUS.length === 0, BUS.join(' · '));

  // ── Ce qui inscrit au journal doit être attendu ──
  //
  // `audit.log` et `moduleAudit.log` sont asynchrones depuis que les journaux
  // vivent en base (ADR-002, étape B). Appelés sans `await`, ils **écrivent
  // quand même** — mais après que la réponse est partie, et un échec d'écriture
  // ne mène nulle part. Sur un acte d'autorité, répondre « enregistré » avant
  // que le journal le dise n'est pas défendable.
  //
  // Deux endroits s'en dispensent, et le déclarent : les deux crochets
  // `res.on('finish')`, appelés après la réponse par construction. Ils prennent
  // le rejet en charge et l'inscrivent aux traces.
  const APRES_REPONSE = ['src/module_audit.js', 'src/consultations.js'];
  const JOURNAL_NU = [];
  sources()
    .filter((f) => f.endsWith('.js') && !relatif(f).startsWith('public/') && !relatif(f).startsWith('tests/'))
    .filter((f) => !APRES_REPONSE.includes(relatif(f)))
    .forEach((f) => {
      fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
        const m = /(.{0,8})\b(audit|moduleAudit)\.log\(/.exec(ligne);
        if (m && !/await\s*$/.test(m[1]) && !/(return|=>)\s*$/.test(m[1])) {
          JOURNAL_NU.push(`${relatif(f)}:${n + 1}`);
        }
      });
    });
  verifier('toute inscription au journal d’audit est attendue',
    JOURNAL_NU.length === 0, JOURNAL_NU.join(' · '));

  // ── Le plafond d'écritures ne se lit pas sans l'attendre ──
  //
  // `limiterEcritures` rend un booléen — « l'écriture est-elle permise ? ». Elle
  // est asynchrone depuis qu'un refus s'inscrit au journal. Appelée sans
  // `await`, elle rend une promesse, **toujours vraie** : le plafond ne se
  // déclencherait plus jamais, sans erreur ni trace. Le garde-fou serait
  // simplement parti, et rien ne l'aurait dit.
  const PLAFOND = [];
  sources()
    .filter((f) => f.endsWith('.js') && !relatif(f).startsWith('public/') && !relatif(f).startsWith('tests/'))
    .filter((f) => relatif(f) !== 'src/protections.js')
    .forEach((f) => {
      fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
        if (/\blimiterEcritures\(/.test(ligne) && !/\bawait\b/.test(ligne)) {
          PLAFOND.push(`${relatif(f)}:${n + 1}`);
        }
      });
    });
  verifier('le plafond d’écritures est lu avec « await »',
    PLAFOND.length === 0, PLAFOND.join(' · '));

  // ── L'annuaire est relu à chaque requête, ou il ne vaut rien ──
  //
  // `getUsers()` et `findUser()` sont restés synchrones : ils lisent l'instantané
  // que `src/annuaire.js` tient en mémoire. Tout tient donc à un seul geste —
  // `rafraichirAnnuaire()` dans `requireAuth`, et dans la connexion qui ne passe
  // pas par lui.
  //
  // Retiré, rien ne tombe : l'application servirait l'annuaire du dernier
  // démarrage. Un compte créé ne pourrait pas se connecter, un compte désactivé
  // le resterait pour tout le monde sauf lui, et un droit retiré continuerait
  // d'ouvrir. Aucune erreur, aucune trace.
  const serveur = fs.readFileSync(path.join(RACINE, 'server.js'), 'utf8');
  const extrait = (motif) => {
    const i = serveur.search(motif);
    return i < 0 ? '' : serveur.slice(i, i + 2600);
  };
  verifier('l’annuaire est relu dans requireAuth',
    /await auth\.rafraichirAnnuaire\(\)/.test(extrait(/function requireAuth\b/)));
  verifier('l’annuaire est relu à la connexion, qui ne passe pas par requireAuth',
    /await auth\.rafraichirAnnuaire\(\)/.test(extrait(/app\.post\('\/api\/login'/)));

  // ── Les deux socles doivent nommer les mêmes collections migrées ──
  //
  // La bascule se fait collection par collection, et pendant ce temps une partie
  // des données vit en base et le reste dans des fichiers. **Les deux socles
  // doivent être d'accord sur laquelle est laquelle.** Si la liste de Java
  // oublie une collection que Node a basculée, Java lit un fichier que personne
  // n'écrit plus : il rend une donnée périmée, ou vide, **sans aucune erreur**.
  //
  // Ce n'est pas une crainte abstraite. Les journaux d'audit sont passés en base
  // le 29 septembre 2026 et `Magasin.java` ne le savait pas : le fichier
  // `module_audit.jsonl` n'existe même plus en régime base, et la vérification
  // de chaîne rendait « valide, zéro entrée » — un satisfecit sur un journal
  // vide, le pire mode de défaillance pour un outil d'autorité. Rien ne l'a dit ;
  // il a fallu aller le chercher.
  const javaMagasin = path.join(RACINE, 'backend-java', 'src', 'main', 'java',
    'int_', 'uemoa', 'ursac', 'oasis', 'magasin', 'Magasin.java');
  if (!fs.existsSync(javaMagasin)) {
    horsPortee('les deux socles nomment les mêmes collections migrées',
      'backend-java absent de ce dépôt');
  } else {
    const java = fs.readFileSync(javaMagasin, 'utf8');
    const listeJava = (nom) => {
      const bloc = java.match(new RegExp(`Set<String> ${nom} = Set\\.of\\(([\\s\\S]*?)\\);`));
      return bloc ? (bloc[1].match(/"([^"]+)"/g) || []).map((x) => x.slice(1, -1)).sort() : null;
    };
    const listeNode = (nom) => {
      const bloc = sourceMagasin.match(new RegExp(`const ${nom} = new Set\\(\\[([\\s\\S]*?)\\n\\]\\);`));
      return bloc ? (bloc[1].match(/'([^']+)'/g) || []).map((x) => x.slice(1, -1)).sort() : null;
    };
    [['MIGREES', 'collections'], ['JOURNAUX_MIGRES', 'journaux']].forEach(([nom, quoi]) => {
      const n = listeNode(nom);
      const j = listeJava(nom);
      verifier(`les deux socles nomment les mêmes ${quoi} migré(e)s`,
        !!n && !!j && JSON.stringify(n) === JSON.stringify(j),
        `Node ${JSON.stringify(n)} · Java ${JSON.stringify(j)}`);
    });
  }

  return bilan('taille');
};
