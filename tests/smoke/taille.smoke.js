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
const { execSync } = require('child_process');
// `horsPortee` n'était **pas importé**, et cette suite l'appelle six fois.
// Chacun de ces six appels levait un `ReferenceError` — c'est-à-dire que la
// suite tombait en exception pile au moment où elle devait dire « hors de
// portée ». Aucune des six conditions n'étant jamais remplie ici, personne ne
// l'avait vu ; trouvé le 6 octobre 2026 en contre-essayant un septième appel,
// en ôtant le `main.tsx` dont il se déduit.
const { verifier, bilan, sourceSocle, horsPortee } = require('./harness');

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

// ── Ce qui est écrit, et ce qui est construit ──
//
// Depuis ADR-003, `public/modules/<module>/app/` porte le paquet d'un écran en
// React + TypeScript : un fichier de vingt-cinq mille lignes que personne n'écrit
// ni ne lit. Tous les gardes de ce fichier portent sur la **source** — longueur
// lisible, noms globaux, dates, appels au magasin —, et aucun n'a de sens sur un
// paquet. La source, elle, vit dans `frontend/`, et c'est TypeScript qui la tient.
//
// Exclu par le chemin, et non par la taille : un paquet de deux cents lignes
// resterait un paquet, et un fichier écrit de vingt-cinq mille lignes resterait un
// défaut.
const CONSTRUIT = /\/public\/modules\/[^/]+\/app\//;

function sources() {
  const liste = [];
  const parcourir = (dossier) => {
    fs.readdirSync(dossier, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) { if (!/node_modules|\.git/.test(p)) parcourir(p); return; }
      if (/\.(js|css)$/.test(e.name) && !CONSTRUIT.test(p.split(path.sep).join('/'))) liste.push(p);
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
    // Le répertoire n'est pas fixé : le socle passe en TypeScript fichier par
    // fichier (ADR-003, 5.b), et le même fichier est servi depuis `shared/js/`
    // avant conversion, `shared/app/` après. Nommer un seul des deux ferait
    // **cesser ce garde-fou de couvrir la page le jour de la conversion**, sans
    // rien dire — c'est exactement ce qui est arrivé au garde-fou des magasins
    // de module quand la fabrique a pris des options.
    const theme = balises.findIndex((b) => /\/shared\/(js|app)\/oasis-theme\.js/.test(b));
    if (theme < 0 || theme > i18n) orphelines.push(relatif(fichier));
  });
  verifier('toute page qui charge i18n.js charge d’abord oasis-theme.js',
    orphelines.length === 0, orphelines.join(' · '));

  // ── Aucune page ne charge un fichier du socle depuis son ancien chemin ──
  //
  // Le socle passe en TypeScript fichier par fichier. Chaque conversion déplace
  // le fichier servi de `shared/js/` vers `shared/app/`, et il faut basculer la
  // balise des neuf pages. Une page oubliée demanderait un fichier qui n'existe
  // plus : le navigateur rend 404, la page continue de se charger, et les
  // globales manquent — un écran qui s'arrête sur `oasisNomTheme is not a
  // function`, ou pire, qui ne s'arrête pas.
  //
  // Les fichiers suivis par git, lus par les deux garde-fous d'anciens chemins
  // qui suivent — celui du socle et celui des répertoires de module. Calculés
  // une fois : deux appels à `git ls-files` auraient divergé le jour où l'un des
  // deux filtres change.
  const fichiersSuivis = execSync('git ls-files -z', { cwd: RACINE, maxBuffer: 32 * 1024 * 1024 })
    .toString().split('\0').filter(Boolean)
    .filter((f) => /\.(js|mjs|ts|tsx|html|json|md|yml|sh)$/.test(f))
    // Ce fichier nomme les chemins pour les détecter : il ne se dénonce pas.
    .filter((f) => f !== 'tests/smoke/taille.smoke.js')
    // ── `docs/` tient le récit, non les gestes — et c'est un choix, pas un accident ──
    //
    // Un ADR doit pouvoir écrire le chemin qu'il raconte avoir supprimé. ADR-003
    // en nomme trois, et le garde-fou du socle **ne les voit pas** : non parce
    // qu'on l'a décidé, mais parce que l'indentation du Markdown place plus de
    // douze caractères entre `'js',` et le nom de fichier à la ligne suivante,
    // et que sa fenêtre s'arrête à douze. Il y échappe par chance.
    //
    // Le second garde-fou, écrit le 6 octobre, les a vus — et a dénoncé le texte
    // même qui l'annonçait. La règle est donc posée explicitement plutôt que
    // laissée à la largeur d'un retrait :
    //
    //   · `docs/` — les ADR, les plans, les comptes rendus : **hors de portée**.
    //     Ce qui s'y écrit est de l'histoire, et l'histoire a le droit de nommer
    //     ce qui n'existe plus ;
    //   · tout le reste — y compris `README.md` et `DEPLOYMENT.md` à la racine,
    //     qui donnent des **gestes** qu'on recopie : **en portée**. Un chemin
    //     mort dans une instruction est un chemin qu'un exploitant va taper.
    .filter((f) => !f.startsWith('docs/'));

  // Le détecteur ne tient pas de liste : il lit `frontend/socle/globales/`. Un
  // fichier converti y est, donc son ancien chemin ne doit plus être demandé.
  const sas = path.join(RACINE, 'frontend', 'socle', 'globales');
  if (!fs.existsSync(sas)) {
    horsPortee('aucune page ne charge un fichier du socle converti depuis son ancien chemin',
      'aucun fichier du socle converti');
  } else {
    const convertis = fs.readdirSync(sas).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, ''));
    const fautives = [];
    // ── Tout fichier suivi, et non les seules pages ──
    //
    // Première écriture : les pages HTML seulement. Insuffisant, et la
    // conversion d'`oasis-dates` l'a dit — une épreuve de la suite « socle »
    // chargeait le fichier par son ancien chemin dans une machine virtuelle, et
    // la campagne entière est tombée sur un `ENOENT`. La suite « traductions »
    // en nommait deux autres, qui auraient cédé aux conversions suivantes.
    //
    // Le chemin d'un fichier du socle se déduit désormais du sas
    // (`harness.cheminSocle`), et ce garde-fou vérifie que **plus personne** ne
    // l'écrit en dur : ni une page, ni une suite, ni un script.
    //
    // ── Et le détecteur voit les deux formes, parce que la première écriture
    // n'en voyait qu'une ──
    //
    // Il cherchait la chaîne littérale `shared/js/<nom>.js`. Or la ligne qui est
    // réellement tombée l'assemblait **par segments** :
    //
    //     path.join(__dirname, '..', '..', 'public', 'shared', 'js', 'oasis-dates.js')
    //
    // La chaîne littérale n'y figure nulle part. **Le garde-fou n'aurait pas
    // attrapé le défaut pour lequel il était écrit** — mesuré en le
    // réintroduisant. On cherche donc les trois morceaux dans l'ordre et à
    // courte distance, ce qui couvre le chemin écrit d'un trait comme le chemin
    // assemblé.
    const nommeEnDur = (texte, nom) => new RegExp(
      `shared['"\\s,/\\\\)(.]{0,12}js['"\\s,/\\\\)(.]{0,12}${nom.replace(/-/g, '\\-')}\\.js`,
    ).test(texte);
    fichiersSuivis.forEach((rel) => {
      const chemin = path.join(RACINE, rel);
      if (!fs.existsSync(chemin)) return;
      const texte = fs.readFileSync(chemin, 'utf8');
      convertis.forEach((nom) => {
        if (nommeEnDur(texte, nom)) fautives.push(`${rel} → ${nom}`);
      });
    });
    verifier('aucun fichier ne nomme un fichier du socle converti par son ancien chemin',
      fautives.length === 0,
      fautives.length ? fautives.join(' · ')
        : `${convertis.length} converti(s), ${fichiersSuivis.length} fichiers suivis lus`);
  }

  // ── Le même garde-fou, pour les répertoires de module (ADR-003, 5.c) ──
  //
  // Un module converti en React perd son `public/modules/<nom>/js/` : son code
  // est construit vers `public/modules/<nom>/app/`. DROITS a été le premier à le
  // perdre entièrement, le 6 octobre 2026.
  //
  // Le garde-fou du socle ne couvre que `shared/js` : il ne dirait rien d'une
  // page qui charge encore `/modules/droits/js/dr-i18n.js` — c'est-à-dire d'un
  // **404 sur un écran entier**. Celui-ci le dit, et il se déduit du même
  // signe : un module est converti quand il porte un `frontend/<nom>/main.tsx`,
  // non quand une liste le déclare.
  //
  // Les cinq modules qui suivront le perdront à leur tour ; ce garde-fou est
  // écrit maintenant pour qu'aucun n'ait à s'en souvenir.
  const convertisModules = fs.readdirSync(path.join(RACINE, 'frontend'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'socle'
      && fs.existsSync(path.join(RACINE, 'frontend', e.name, 'main.tsx')))
    .map((e) => e.name)
    // Un module dont le `js/` existe encore n'est pas converti : la cohabitation
    // est permise le temps d'une conversion, et l'interdire casserait l'étape
    // intermédiaire.
    .filter((nom) => !fs.existsSync(path.join(RACINE, 'public', 'modules', nom, 'js')));
  if (!convertisModules.length) {
    horsPortee('aucun fichier ne nomme le « js » d’un module converti',
      'aucun module n’a perdu son répertoire « js »');
  } else {
    // Mêmes séparateurs tolérés que pour le socle, et pour la même raison : le
    // chemin assemblé par `path.join` ne porte pas la chaîne littérale.
    const moduleEnDur = (texte, nom) => new RegExp(
      `modules['"\\s,/\\\\)(.]{0,12}${nom}['"\\s,/\\\\)(.]{0,12}js['"\\s,/\\\\)(.]{0,4}`,
    ).test(texte);
    const coupables = [];
    fichiersSuivis.filter((f) => f !== 'tests/smoke/traductions.smoke.js').forEach((rel) => {
      const chemin = path.join(RACINE, rel);
      if (!fs.existsSync(chemin)) return;
      const texte = fs.readFileSync(chemin, 'utf8');
      convertisModules.forEach((nom) => {
        if (moduleEnDur(texte, nom)) coupables.push(`${rel} → ${nom}`);
      });
    });
    verifier('aucun fichier ne nomme le « js » d’un module converti',
      coupables.length === 0,
      coupables.length ? coupables.join(' · ')
        : `${convertisModules.length} converti(s) : ${convertisModules.join(', ')}`);
  }

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
  // La **source**, non le paquet servi : celui-ci est minifié en production, et
  // un détecteur sur du code minifié ne vaut rien. `sourceSocle` la trouve des
  // deux côtés de la conversion (ADR-003, 5.b) en la déduisant du sas.
  const fichierHL = sourceSocle('oasis-hors-ligne');
  const sourceHL = fs.existsSync(fichierHL) ? fs.readFileSync(fichierHL, 'utf8') : '';
  // On lit les lignes, non les littéraux : analyser une expression régulière
  // écrite à la main revient à en écrire une pour les lire toutes, et la
  // première tentative s'arrêtait au premier « \/ » — elle ne voyait donc que
  // « /^\/api » de chaque motif, et ne pouvait rien attraper. La ligne entière
  // porte le motif et son libellé ; c'est tout ce qu'il faut.
  // Le détecteur ne nomme pas la forme de la déclaration : `const DIFFERABLES =`
  // en JavaScript, `export const DIFFERABLES: readonly Differable[] =` en
  // TypeScript, et au premier niveau donc fermée sur `];` sans indentation.
  // L'écrire en dur a fait rendre « 0 entrée(s) » à la conversion — le garde-fou
  // aurait cessé de couvrir la liste d'autorisation le jour même où elle changeait
  // de fichier, et c'est le pire moment pour qu'il se taise.
  const bloc = sourceHL.match(/DIFFERABLES[^=\n]*= \[([\s\S]*?)\n *\];/);
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
  //
  //
  // ── Et pourquoi `window.X = …` ne compte que dans les sas du socle ──
  //
  // La conversion du socle en TypeScript (ADR-003, 5.b) rend un fichier converti
  // en IIFE construite qui pose `window.X`. Sa collision avec un `const X` d'un
  // autre fichier passerait d'une **erreur franche** — `Identifier 'X' has
  // already been declared`, qui arrête la page — à un **masquage silencieux**,
  // le `const` lexical couvrant la propriété de `window` pour tous les scripts
  // suivants. Mesuré : `oasis-utils.js` et `public/js/icons.js` déclarent tous
  // deux `const ICONS`, et aucune page ne charge les deux — c'est ce garde-fou
  // qui le tient, et il ne doit pas cesser de le tenir à la conversion.
  //
  // Mais détecter `window.X = …` **partout** ne vaut rien : essayé, il a rendu
  // treize collisions, et **les treize étaient délibérées** — un `const` exposé
  // à `window` par un fichier voisin, une décoration explicite
  // (`execProcPreserver(window.execSetTheme)`), une sauvegarde rendue dans un
  // `finally`, le chaînage de `fetch` par deux couches du socle, et des
  // `window.onload` qui n'étaient que du **texte dans un gabarit** fabriquant un
  // document imprimable. Cent pour cent de bruit : un garde-fou qu'on apprend à
  // ignorer ne garde rien.
  //
  // La détection est donc restreinte aux **sas** — `frontend/socle/globales/` —
  // où l'affectation à `window` *est* la déclaration de la surface publiée,
  // écrite à la main, et rien d'autre. C'est exactement le cas qu'il fallait
  // couvrir, et c'est le seul où cette forme ne soit pas ambiguë.
  const DECLARATION = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
  const POSE_SUR_WINDOW = /^window\.([A-Za-z_$][\w$]*)\s*=[^=]/gm;
  const collisions = [];
  PAGES.forEach((rel) => {
    const page = path.join(RACINE, rel);
    if (!fs.existsSync(page)) return;
    const html = fs.readFileSync(page, 'utf8');
    const ou = new Map();
    (html.match(/<script\s+src="[^"]+"/g) || []).forEach((balise) => {
      const src = balise.match(/src="([^"]+)"/)[1];
      if (!src.startsWith('/')) return;
      // Un fichier du socle converti est **construit** : lu tel quel il serait
      // minifié en production, et un détecteur sur du code minifié ne vaut
      // rien. On lit son sas — `frontend/socle/globales/<nom>.ts` —, qui dit
      // exactement la surface qu'il publie et qui, lui, est une source.
      const sas = /^\/shared\/app\/(.+)\.js$/.exec(src);
      const source = sas
        ? path.join(RACINE, 'frontend', 'socle', 'globales', `${sas[1]}.ts`)
        : path.join(RACINE, 'public', src);
      if (!fs.existsSync(source)) return;
      const code = fs.readFileSync(source, 'utf8');
      const etiquette = sas ? `${sas[1]}.js` : path.basename(source);
      const noter = (nom) => {
        if (!ou.has(nom)) ou.set(nom, new Set());
        ou.get(nom).add(etiquette);
      };
      let m;
      DECLARATION.lastIndex = 0;
      while ((m = DECLARATION.exec(code)) !== null) noter(m[1] || m[2]);
      if (sas) {
        POSE_SUR_WINDOW.lastIndex = 0;
        while ((m = POSE_SUR_WINDOW.exec(code)) !== null) noter(m[1]);
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
  // **Le critère porte sur ce qui rend les lectures asynchrones**, et non sur le
  // `require` de la façade : le magasin de RAMP la requiert depuis le jalon n° 9
  // pour la seule nomenclature des aéronefs, tandis que ses autres collections
  // restent sur fichiers et se lisent encore de façon synchrone. Clore sur le
  // `require` désignait 150 lignes parfaitement correctes.
  //
  // Deux formes sont reconnues, et aucune n'est une déclaration qu'on peut oublier
  // de poser : un magasin bâti sur `magasinDeModule('<nom>')`, si ce nom figure
  // dans la liste des migrées, ou un `const list = async` écrit à la main. Un
  // magasin converti est donc reconnu du seul fait de sa conversion. La source se
  // lit, et non le `require` — pour la même raison que plus haut.
  const ASYNCHRONES = ['load', 'save', 'transformer', 'list', 'get', 'getColl',
    'seed', 'insert', 'update', 'remove', 'removeWhere'];
  const converti = (source) => {
    if (/\bconst list = async\b/.test(source)) return true;
    // Le nom seul, quoi qui suive : la fabrique prend des options depuis
    // « Mesures d'Application », et une parenthèse exigée juste après le nom a
    // fait **cesser silencieusement** la couverture de ce module-là. Un
    // détecteur qui se tait est pire qu'une règle écrite.
    const m = /magasinDeModule\('([^']+)'/.exec(source);
    return !!m && MIGREES.includes(m[1]);
  };
  const magasinsDeModule = fs.readdirSync(path.join(RACINE, 'src', 'modules'))
    .map((m) => ({ module: m, chemin: path.join(RACINE, 'src', 'modules', m, 'store.js') }))
    .filter(({ chemin }) => fs.existsSync(chemin))
    .filter(({ chemin }) => converti(fs.readFileSync(chemin, 'utf8')));
  verifier('les magasins de module convertis sont reconnus',
    magasinsDeModule.length >= 2, magasinsDeModule.map((m) => m.module).join(' · '));

  // Le balayage se fait **par instruction**, non par ligne. Deux lectures lancées
  // ensemble — `await Promise.all([db.list('plans'), db.list('activites')])` —
  // n'en portent qu'un seul `await`, et tiennent parfois sur trois lignes : un
  // contrôle ligne à ligne les dénonçait toutes, et il a fallu le constater sur
  // huit appels parfaitement corrects avant de le corriger.
  //
  // Le revers est à dire : dans une instruction qui porte déjà un `await`, un
  // second appel qui en manquerait passerait. C'est le même compromis que pour le
  // bus, et il tient parce qu'ici une instruction est une ligne ou deux.
  const MAGASIN_NU = [];
  const APPEL = new RegExp(`(.{0,10})\\bdb\\.(${ASYNCHRONES.join('|')})\\(`);
  magasinsDeModule.forEach(({ module }) => {
    sources()
      .filter((f) => relatif(f).startsWith(`src/modules/${module}/`) && f.endsWith('.js'))
      .filter((f) => !relatif(f).endsWith('/store.js'))
      .forEach((f) => {
        const texte = fs.readFileSync(f, 'utf8');
        let curseur = 0;
        texte.split(';').forEach((instruction) => {
          const m = APPEL.exec(instruction);
          const depart = curseur;
          curseur += instruction.length + 1;
          if (!m) return;
          // Attendu dans l'instruction, ou transmis à un appelant qui l'attendra.
          if (/\bawait\b/.test(instruction)) return;
          if (/(return|=>)\s*$/.test(m[1])) return;
          const ligne = texte.slice(0, depart + m.index).split('\n').length;
          MAGASIN_NU.push(`${relatif(f)}:${ligne}`);
        });
      });
  });
  verifier('aucun magasin de module en base n’est lu sans « await »',
    MAGASIN_NU.length === 0, MAGASIN_NU.join(' · '));

  // ── La source React est tenue comme le reste ──
  //
  // Les gardes de ce fichier portent sur `src/` et `public/` : la source de
  // l'écran en React vit dans `frontend/`, et serait passée à côté de tout —
  // longueur, caractères de contrôle, noms globaux. La cohabitation (ADR-003)
  // doit être **tenue**, non subie, et c'est ce que ces trois contrôles font.
  const SOURCES_REACT = [];
  const parcourirFrontend = (dossier) => {
    if (!fs.existsSync(dossier)) return;
    fs.readdirSync(dossier, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) { parcourirFrontend(p); return; }
      if (/\.(ts|tsx|mjs)$/.test(e.name)) SOURCES_REACT.push(p);
    });
  };
  parcourirFrontend(path.join(RACINE, 'frontend'));

  verifier('la source du frontend est trouvée', SOURCES_REACT.length > 0,
    `${SOURCES_REACT.length} fichier(s)`);

  const TROP_LONGS = SOURCES_REACT
    .filter((f) => fs.readFileSync(f, 'utf8').split('\n').length > 600)
    .map((f) => `${relatif(f)} : ${fs.readFileSync(f, 'utf8').split('\n').length} lignes`);
  verifier('aucun fichier de frontend au-delà de 600 lignes',
    TROP_LONGS.length === 0, TROP_LONGS.join(' · '));

  // `any` et `as unknown as` défont le typage sans le dire, et c'est tout ce que
  // la fiche technique attendait de TypeScript. Une seule exception est
  // légitime : `socle.ts`, la frontière avec le socle commun non typé — et elle
  // n'emploie ni l'un ni l'autre, elle **déclare**.
  //
  // Les lignes de commentaire sont écartées : la première version a dénoncé
  // `socle.ts`, où la phrase « on aurait écrit `(window as any)` partout » dit
  // précisément qu'on ne le fait pas. Un garde-fou qui ne distingue pas le code
  // de ce qui l'explique fait relire un commentaire juste.
  const TYPAGE_DEFAIT = [];
  SOURCES_REACT.forEach((f) => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
      const nue = ligne.trim();
      if (nue.startsWith('//') || nue.startsWith('*') || nue.startsWith('/*')) return;
      if (/\bas\s+unknown\s+as\b/.test(ligne) || /:\s*any\b/.test(ligne) || /\bas\s+any\b/.test(ligne)) {
        TYPAGE_DEFAIT.push(`${relatif(f)}:${n + 1}`);
      }
    });
  });
  verifier('le typage du frontend n’est défait nulle part',
    TYPAGE_DEFAIT.length === 0, TYPAGE_DEFAIT.join(' · '));

  // ── Ce qu'un autre module fonde ne se détruit pas ──
  //
  // Une constatation de la surveillance, un écart d'aire de trafic : les « Mesures
  // d'Application » y rattachent des mesures, et les détruire laisserait une
  // sanction sans son fondement. Le bus étant asynchrone, une mesure peut être
  // prononcée **entre la vérification et l'écriture** — fenêtre qui ne se ferme
  // pas, puisque la vérification lit un module et l'écriture en touche un autre.
  //
  // D'où la décision du 3 octobre 2026 : on marque au lieu d'effacer. La fenêtre
  // existe toujours, il ne s'y passe plus rien d'irréversible.
  //
  // Rien dans le langage n'empêche d'y remettre un `remove`. Un jour où l'on
  // voudra « faire le ménage », la suppression paraîtra légitime — et la sanction
  // perdra son écart, sans erreur ni trace. Ce contrôle est la seule chose qui
  // tienne la règle.
  const DESTRUCTION_INTERDITE = [
    ['src/modules/execution', 'constatations'],
    ['src/modules/ramp', 'ecarts'],
  ];
  const DETRUITS = [];
  DESTRUCTION_INTERDITE.forEach(([dossier, coll]) => {
    sources()
      .filter((f) => relatif(f).startsWith(`${dossier}/`) && f.endsWith('.js'))
      .forEach((f) => {
        fs.readFileSync(f, 'utf8').split('\n').forEach((ligne, n) => {
          // `remove` et `removeWhere` sur la collection, et le filtre qui l'ôte
          // d'un état en cours de transformation — les deux manières de détruire.
          const parAppel = new RegExp(`db\\.remove(Where)?\\(\\s*['"]${coll}['"]`).test(ligne);
          const parFiltre = new RegExp(`\\b${coll}\\s*=\\s*\\(?[a-zA-Z.\\[\\]']*\\s*\\|\\|\\s*\\[\\]\\)?\\s*\\.filter\\(`).test(ligne);
          if (parAppel || parFiltre) DETRUITS.push(`${relatif(f)}:${n + 1}`);
        });
      });
  });
  verifier('ce qu’un autre module fonde est retiré, jamais détruit',
    DETRUITS.length === 0, DETRUITS.join(' · '));

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

  // ── Tout chemin qui installe doit construire ──
  //
  // Les écrans portés en React + TypeScript (ADR-003) ne sont pas servis depuis
  // leurs sources : `npm run build` les assemble dans `public/modules/<m>/app/`,
  // et **ce paquet n'est pas versionné** — un paquet obsolète servi en production
  // est un défaut qui ne se voit pas.
  //
  // Il y a donc trois chemins de déploiement, et aucun ne garde les autres : le
  // `Dockerfile`, le `render.yaml`, la CI. Un chemin qui installe sans construire
  // met en ligne un service qui **démarre, répond 200 sur `/api/health`, répond
  // 200 sur la page de l'écran — et sert un écran blanc.**
  //
  // Mesuré le 3 octobre 2026, en retirant du `Dockerfile` la seule ligne qui
  // copie le paquet : l'image démarre, `/api/health` rend 200, la page rend 200,
  // et seul `/modules/droits/app/main.js` rend 404. Les trois vérifications
  // évidentes restent vertes. C'est pour ce défaut-là que ce garde-fou existe.
  const lire = (f) => {
    const c = path.join(RACINE, f);
    return fs.existsSync(c) ? fs.readFileSync(c, 'utf8') : null;
  };
  const sansCommentaires = (t, marque) =>
    t.split('\n').filter((l) => !l.trim().startsWith(marque)).join('\n');

  const render = lire('render.yaml');
  if (!render) horsPortee('Render construit les écrans', 'render.yaml absent');
  else {
    const build = (sansCommentaires(render, '#').match(/buildCommand:(.*)/) || [])[1] || '';
    verifier('Render construit les écrans', /npm run build/.test(build), build.trim());
    // `NODE_ENV=production` est posé pour le service : npm en tire la conclusion
    // qu'il peut écarter les dépendances de développement, et la construction
    // échoue en annonçant qu'esbuild est introuvable, loin de sa cause.
    verifier('Render installe de quoi construire', /--include=dev/.test(build), build.trim());
  }

  const dockerfile = lire('Dockerfile');
  if (!dockerfile) horsPortee('l’image construit les écrans', 'Dockerfile absent');
  else {
    const utile = sansCommentaires(dockerfile, '#');
    const etage = (utile.match(/FROM[^\n]*AS construction\n([\s\S]*?)(?=\nFROM )/) || [])[1] || '';
    verifier('l’image a un étage qui construit les écrans', /npm run build/.test(etage));
    verifier('cet étage installe de quoi construire', /--include=dev/.test(etage));
    // Sans cela, le paquet part non minifié, avec sa carte de source, et React en
    // régime de développement : 3,2 Mo au lieu de 244 Ko. Mesuré.
    verifier('cet étage construit en régime de production',
      /ENV NODE_ENV=production/.test(etage));
    // Le défaut mesuré ci-dessus est exactement l'absence de cette ligne.
    verifier('l’image finale emporte le paquet construit',
      /COPY --from=construction [^\n]*public/.test(utile));
  }

  // Le paquet local doit sortir du contexte de construction : présent sur la
  // machine du développeur, il serait emporté par `COPY public` et l'image
  // paraîtrait correcte alors que rien dans la chaîne ne l'aura construit. Un
  // faux vert dont la seule cause est l'état d'un disque.
  const dockerignore = lire('.dockerignore');
  verifier('le paquet local ne peut pas se glisser dans l’image',
    !!dockerignore && /public\/modules\/\*\/app\//.test(sansCommentaires(dockerignore, '#')));

  // Et le seul contrôle qui distingue une image qui se construit d'une image qui
  // sert : la démarrer et demander le paquet. « L'image se construit » ne dit
  // rien de ce qu'elle sert.
  const ci = lire('.github/workflows/ci.yml');
  if (!ci) horsPortee('la CI éprouve que l’image sert les écrans', 'ci.yml absent');
  else {
    // Le détecteur porte sur l'étape, non sur le fichier : trouver « docker run »
    // quelque part et « main.js » ailleurs ne dirait pas qu'on interroge l'image.
    // Et il ne cherche pas le chemin en littéral — la CI l'assemble dans une
    // variable, et un détecteur qui exigeait le littéral rendait faux sur une CI
    // correcte. Première écriture, premier défaut de la forme habituelle.
    const etape = (ci.match(/docker run -d[\s\S]*?\n      - name:|docker run -d[\s\S]*$/) || [''])[0];
    const lignes = etape.split('\n');
    // Le détecteur lie l'interrogation au paquet **sur la même ligne**. Chercher
    // « curl -sf » et « app/main.js » quelque part dans l'étape passait à vide :
    // l'attente de démarrage porte déjà un `curl -sf`, et le chemin du paquet
    // reste écrit dans son affectation. En remplaçant l'interrogation par `true`,
    // le garde-fou restait vert. Mesuré — c'est pour cela qu'il est ainsi.
    verifier('la CI demande le paquet à l’image qu’elle vient de construire',
      lignes.some((l) => /curl/.test(l) && /(\$paquet|app\/main\.js)/.test(l)));
    // Et ce qui transforme le constat en échec. Une étape qui interroge sans
    // propager rend toujours zéro : le contrôle existerait et ne garderait rien.
    verifier('et un paquet absent fait échouer la CI',
      /echec=1/.test(etape) && /exit \$echec/.test(etape));
  }

  // ── La campagne est rejouée contre un vrai PostgreSQL ──
  //
  // ADR-002 jalon n° 13 déclare la bascule du magasin complète, et ADR-001
  // suite n° 3 demandait de l'éprouver contre un vrai serveur. Ce fut fait **une
  // fois, à la main**, et rien ne le rejouait : la campagne par défaut rend 5
  // des 17 contrôles du magasin, et aucune des treize suites ne sert la base.
  //
  // Un jalon clos sur une épreuve que personne ne rejoue n'est pas clos. Ce
  // garde-fou tient la tâche qui la rejoue : retirée, elle emporterait avec elle
  // la seule preuve que l'application fonctionne dans le régime qu'elle annonce,
  // et aucune campagne ne le dirait.
  if (!ci) {
    horsPortee('la campagne est rejouée contre un vrai PostgreSQL', 'ci.yml absent');
  } else {
    // Le détecteur porte sur la tâche, et non sur le fichier : « postgres »
    // quelque part et « DATABASE_URL » ailleurs ne diraient pas qu'on éprouve
    // l'application contre un serveur. C'est la leçon du détecteur de l'image,
    // qui passait à vide en cherchant deux chaînes sans les lier.
    const tache = (ci.match(/\n {2}base:\n([\s\S]*?)(?=\n {2}[a-z_]+:\n)|\n {2}base:\n([\s\S]*)$/) || [''])[0];
    verifier('la CI déclare un service PostgreSQL',
      /services:[\s\S]*postgres:[\s\S]*image: postgres:/.test(tache));
    // Les douze contrôles du magasin, et la campagne entière : deux épreuves
    // distinctes, et les deux variables sont distinctes à dessein.
    verifier('la CI rejoue les contrôles du magasin contre un vrai serveur',
      /OASIS_PG_ESSAI: postgres:/.test(tache) && /smoke -- magasin-pg/.test(tache));
    verifier('la CI rejoue la campagne entière servie depuis la base',
      /DATABASE_URL: postgres:/.test(tache)
        && tache.split('DATABASE_URL: postgres:')[1]?.includes('npm run smoke'));
    // Et la campagne sur fichiers reste éprouvée pour elle-même : c'est le
    // régime de production d'aujourd'hui. Les deux régimes se vérifient, pas
    // l'un à la place de l'autre.
    const verifieSansBase = /\n {2}verifier:\n([\s\S]*?)(?=\n {2}[a-z_]+:\n)/.exec(ci);
    verifier('la campagne sur fichiers reste éprouvée sans aucune adresse de base',
      !!verifieSansBase && /npm run smoke/.test(verifieSansBase[1])
        && !/DATABASE_URL/.test(verifieSansBase[1]));
  }

  return bilan('taille');
};
