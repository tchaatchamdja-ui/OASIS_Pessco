// Frontend — ce que le TypeScript affirme du monde, vérifié dans le monde.
//
// ── Le défaut que cette suite existe pour empêcher ──
//
// Les écrans portés en React + TypeScript (ADR-003) cohabitent avec un socle
// commun resté en JavaScript global : `oasis-*.js`, chargés par balise `<script>`
// avant le paquet. Le TypeScript ne peut pas les lire — il n'y a rien à importer.
// Il les **déclare**, dans `frontend/<module>/socle.ts` :
//
//     declare global { interface Window { oasisEsc(v: unknown): string } }
//
// Une déclaration est une affirmation sur le monde, et **personne ne la
// vérifie**. Le compilateur la croit : c'est son rôle. Le navigateur, lui, rend
// `undefined` — et l'écran s'arrête, ou pire, ne s'arrête pas.
//
// Deux fois la même cause, mesurées :
//
//   · `window.dtPriv` — `dr-i18n.js` le définit en `const`, qui ne pose rien sur
//     `window` ; seuls `function` et `var` le font. L'écran s'arrêtait sur
//     « window.dtPriv is not a function ». Trouvé en ouvrant la page à la main.
//   · `window.ICONS` — même cause, dans `oasis-utils.js`. Celui-là était **muet** :
//     `(window.ICONS || {}).shield || ''` rendait la chaîne vide, et l'écran
//     s'affichait. Il a fallu comparer les lectures du TypeScript à la surface
//     réellement posée par le socle pour le voir. C'est ce que fait cette suite.
//
// Le second est le cas qui compte. Un défaut qui arrête l'écran se trouve en
// l'ouvrant ; un défaut qui rend une valeur par défaut ne se trouve pas.
//
// ── Ce qu'elle vérifie ──
//
// 1. Chaque `window.X` **lu** par le TypeScript existe sur l'écran qui le lit.
//    Les écritures (`window.drBoot = …`) sont exclues : poser une globale n'exige
//    pas qu'elle préexiste.
// 2. Chaque globale **lexicale** déclarée (`declare global { const ICONS: … }`)
//    existe. Elle n'est pas sur `window` : on l'atteint par son nom, et c'est
//    tout l'objet de la distinction qui a coûté les deux défauts ci-dessus.
// 3 bis. La surface du **portail** — ce que `/app/portail.js` ajoute à `window`
//    — est conforme à son relevé, et **chacun de ces noms a un lecteur**.
//
//    C'est le contrôle qui a pris le relais des douze comparateurs le 13 octobre
//    2026 (ADR-003, 5.e.5). Tant que la cohabitation durait, le sas devait poser
//    tout ce qu'un fichier resté en JavaScript appelait, et c'était la raison de
//    chaque nom. `app.js` ayant disparu, cette raison a disparu avec lui : les
//    sas publiaient **135 noms dont 63 que plus rien ne lisait**, et la surface
//    ne mesurait plus que l'histoire de la migration.
//
//    Deux mesures, et il faut les deux :
//
//      · *la conformité au relevé* dit qu'un nom n'a ni disparu ni paru. Un nom
//        qui disparaît casse un `onclick` **en silence** — c'est le mode de
//        défaillance le plus coûteux de ce dépôt ;
//      · *l'absence de nom muet* dit que la surface ne se remet pas à grossir.
//        Sans elle, le relevé gèlerait aussi bien soixante-trois noms morts.
//
// 3. La surface du socle — les 48 noms qu'il pose, fichier par fichier — est
//    conforme au relevé de référence. Les sept écrans encore en JavaScript s'en
//    servent par ces noms-là : en retirer un les casse en silence, et aucune
//    suite ne le dirait. **C'est la photographie d'avant**, celle qui manquait
//    quand DROITS a été réécrit (ADR-003, suite n° 0).
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, horsPortee, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const FRONTEND = path.join(RACINE, 'frontend');
const REFERENCE = path.join(__dirname, 'surface-socle.json');
const REFERENCE_PORTAIL = path.join(__dirname, 'surface-portail.json');
const { relever, muets } = require('../../scripts/relever-surface.js');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// ── Ce qu'un paquet embarque réellement : son graphe d'imports ──
//
// Première écriture : les sources du module **plus tous** les fichiers de
// `frontend/socle/`. C'était faux, et la deuxième conversion du socle l'a dit
// aussitôt — `cookies.ts` lit `window.t`, que le sas du portail pose sur les
// trois pages du portail et nulle part ailleurs. L'écran DROITS, qui n'importe
// pas `cookies.ts`, se voyait reprocher une globale qu'il n'emploie pas.
//
// Un paquet n'embarque que ce qu'il importe. On suit donc le graphe depuis le
// point d'entrée, et l'on ne reproche à un écran que ses propres affirmations.
function graphe(entree) {
  const vus = new Set();
  const file = [entree];
  while (file.length) {
    const f = file.pop();
    if (vus.has(f) || !fs.existsSync(f)) continue;
    vus.add(f);
    const texte = fs.readFileSync(f, 'utf8');
    for (const m of texte.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const brut = path.resolve(path.dirname(f), m[1]);
      // Un import TypeScript s'écrit sans extension ; on essaie les quatre
      // formes, et l'on ignore ce qui ne se résout pas — un paquet de
      // `node_modules` n'est pas de notre ressort.
      const candidat = ['.ts', '.tsx', '/index.ts', '/index.tsx', '']
        .map((e) => `${brut}${e}`).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (candidat) file.push(candidat);
    }
  }
  return [...vus];
}

// Les sources TypeScript d'un module, hors paquet construit.
function sources(dossier) {
  const liste = [];
  (function parcourir(rep) {
    for (const e of fs.readdirSync(rep, { withFileTypes: true })) {
      const p = path.join(rep, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (/\.tsx?$/.test(e.name)) liste.push(p);
    }
  }(dossier));
  return liste;
}

// Un commentaire n'affirme rien, et il faut le retirer **avant** de lire — pas
// ligne par ligne.
//
// La première écriture filtrait les lignes commençant par `//` ou `*`, et c'est
// le commentaire JSX expliquant le défaut `window.ICONS` qui a fait rougir le
// garde-fou sur un code correct : dans `{/* … */}`, les lignes du corps ne
// commencent par rien de reconnaissable. Le garde-fou du typage avait déjà
// signalé un commentaire disant qu'on ne faisait pas la chose ; c'est la même
// erreur, commise une deuxième fois sur le même objet.
//
// On ôte donc les blocs `/* … */` du texte entier — ce qui couvre `{/* … */}` —
// puis les lignes en `//`.
const sansCommentaires = (texte) => texte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

// Ce que le TypeScript lit sur `window`, et ce qu'il y écrit. La distinction est
// la seule subtilité du relevé : `window.drBoot = () => …` ne demande rien au
// monde, il lui donne.
function lecturesDeWindow(fichiers) {
  const lus = new Set();
  for (const f of fichiers) {
    const texte = sansCommentaires(fs.readFileSync(f, 'utf8'));
    for (const m of texte.matchAll(/window\.([A-Za-z_][A-Za-z0-9_]*)\s*(=[^=]|\?\?=|\|\|=)?/g)) {
      if (!m[2]) lus.add(m[1]);
    }
  }
  return [...lus].sort();
}

// Ce que le TypeScript **déclare** sur `window`, dans `declare global {
// interface Window { … } }`.
//
// Vérifier les déclarations et non seulement les lectures est plus fort, et la
// conversion du socle l'a montré : `Window.ICONS?: Record<string, string>`
// était une affirmation **fausse** — `oasis-utils.js` déclare `ICONS` en
// `const`, qui ne pose rien sur `window` — et personne ne la lisait plus depuis
// que l'accès était corrigé. Une déclaration fausse que rien ne lit est un
// piège posé pour le prochain qui la croira.
//
// Les membres optionnels (`X?: …`) sont exclus : `DR_MODULE` et `drBoot` sont
// légitimement absents selon la page, et c'est ce que le `?` dit.
function declarationsDeWindow(fichiers) {
  const noms = new Set();
  for (const f of fichiers) {
    const texte = sansCommentaires(fs.readFileSync(f, 'utf8'));
    for (const bloc of texte.matchAll(/interface Window\s*\{([\s\S]*?)\n {2}\}/g)) {
      for (const m of bloc[1].matchAll(/^\s{4}([A-Za-z_][A-Za-z0-9_]*)(\??)\s*[:(]/gm)) {
        if (!m[2]) noms.add(m[1]);
      }
    }
  }
  return [...noms].sort();
}

// Les déclarations **ambiantes** du socle : `frontend/socle/*.d.ts`.
//
// Elles ne sont importées par personne — c'est le propre d'une déclaration
// ambiante — donc le graphe d'imports ne les traverse pas. Elles valent pourtant
// pour tout le programme, et c'est là que vivent les noms qu'aucun module ne
// définit (`sans-proprietaire.d.ts`).
//
// Les oublier a coûté deux faux rouges : `APP_STATE` et `PESSCO`, déclarés
// optionnels là-bas, étaient tenus pour obligatoires faute d'être vus.
// ── Les déclarations ambiantes du projet ──
//
// Un `declare global` vaut pour **tout le programme**, où qu'il soit écrit :
// TypeScript fusionne les `interface Window` de tous les fichiers compilés. Le
// graphe des imports, lui, ne les relie pas — un fichier de déclaration n'est
// importé par personne, et c'est pourquoi les `.d.ts` du socle étaient déjà
// ajoutés ici à la main.
//
// ── Et les sas de **tous** les ensembles, non du seul socle ──
//
// La conversion du portail (ADR-003, 5.c) l'a rendu nécessaire, et l'a montré en
// faisant tomber ce contrôle. `CURRENT_LANG` est **lu par le socle** —
// `dates.ts`, `toast.ts` — et **défini par le portail** : son sas est le seul
// endroit qui le pose, et donc, par la règle de 5.b, le seul qui le déclare.
//
// Le graphe parti d'`oasis-dates` ne l'atteint pas. Sans cette ligne, le contrôle
// voyait un nom lu, aucune déclaration, et le dénonçait comme **requis et
// absent** sur les six pages de module. Il est optionnel, et absent de ces pages
// à bon droit : le socle y retombe sur le stockage.
function ambiantes() {
  const fichiers = [];
  const dossierSocle = path.join(FRONTEND, 'socle');
  if (fs.existsSync(dossierSocle)) {
    fs.readdirSync(dossierSocle).filter((f) => f.endsWith('.d.ts'))
      .forEach((f) => fichiers.push(path.join(dossierSocle, f)));
  }
  // Les sas et les scripts de page de chaque ensemble converti : les premiers
  // déclarent ce qu'ils posent, les seconds ce qu'ils définissent. Les deux
  // dossiers sont lus, parce qu'un `declare global` vaut d'où qu'il vienne.
  fs.readdirSync(FRONTEND, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .forEach((e) => ['globales', 'pages'].forEach((sorte) => {
      const d = path.join(FRONTEND, e.name, sorte);
      if (!fs.existsSync(d)) return;
      fs.readdirSync(d).filter((f) => f.endsWith('.ts'))
        .forEach((f) => fichiers.push(path.join(d, f)));
    }));
  return fichiers;
}

// Les membres de `interface Window` déclarés **optionnels** (`X?: …`). Le `?` est
// la déclaration que le nom peut manquer ; voir le contrôle qui l'emploie.
function declarationsOptionnelles(fichiers) {
  const noms = new Set();
  for (const f of [...fichiers, ...ambiantes()]) {
    const texte = sansCommentaires(fs.readFileSync(f, 'utf8'));
    for (const bloc of texte.matchAll(/interface Window\s*\{([\s\S]*?)\n {2}\}/g)) {
      for (const m of bloc[1].matchAll(/^\s{4}([A-Za-z_][A-Za-z0-9_]*)\?\s*[:(]/gm)) {
        noms.add(m[1]);
      }
    }
  }
  return [...noms];
}

// Les globales lexicales déclarées : `declare global { const X: … }`. Hors de
// `interface Window`, donc à lire par leur nom nu.
function globalesLexicales(fichiers) {
  const noms = new Set();
  for (const f of fichiers) {
    const texte = sansCommentaires(fs.readFileSync(f, 'utf8'));
    const bloc = texte.match(/declare global\s*\{([\s\S]*?)\n\}/);
    if (!bloc) continue;
    for (const m of bloc[1].matchAll(/^\s*(?:const|var|let|function)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
      noms.add(m[1]);
    }
  }
  return [...noms].sort();
}

// L'ordre où un écran charge le socle. Relevé sur l'écran RAMP, le plus complet,
// plus les trois fichiers que seuls d'autres écrans chargent.
const ORDRE_SOCLE = [
  'oasis-loader', 'oasis-toast', 'oasis-dates', 'oasis-theme', 'oasis-requete',
  'oasis-hors-ligne', 'oasis-messages-serveur', 'oasis-commun', 'oasis-utils',
  'oasis-kpi', 'oasis-cookies', 'module-chrome',
];

// La surface du socle, mesurée dans un navigateur, fichier par fichier.
//
// La page doit être vierge **et sur l'origine du serveur**. Les deux conditions
// ont coûté une mesure fausse chacune : partir de `login.html` donnait un
// `window` déjà peuplé par les quatre fichiers qu'elle charge — quatre fichiers
// paraissaient alors ne rien apporter, et la mesure était rassurante à tort.
// Partir d'`about:blank` ne charge aucun script, faute d'origine.
async function mesurerSurface(page, base) {
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (r.url() === `${base}/__page_vierge_mesure`) {
      r.respond({
        status: 200, contentType: 'text/html',
        body: '<!doctype html><html><head></head><body></body></html>',
      });
    } else r.continue();
  });
  await page.goto(`${base}/__page_vierge_mesure`, { waitUntil: 'domcontentloaded' });

  const surface = {};
  const incidents = [];
  let avant = await page.evaluate(() => Object.getOwnPropertyNames(window));
  for (const f of ORDRE_SOCLE) {
    // Le répertoire se déduit de l'état de la conversion, il ne se nomme pas :
    // un fichier converti est servi depuis `shared/app/`, les autres depuis
    // `shared/js/`. Écrit en dur, ce chemin aurait fait **cesser la mesure de
    // couvrir le fichier le jour de sa conversion** — et la surface du socle,
    // qui est tout l'objet de cette mesure, aurait paru conforme en perdant un
    // fichier entier.
    const converti = fs.existsSync(path.join(FRONTEND, 'socle', 'globales', `${f}.ts`));
    await page.addScriptTag({ url: `/shared/${converti ? 'app' : 'js'}/${f}.js` })
      .catch((e) => incidents.push(`${f} : ${String(e.message).slice(0, 80)}`));
    const apres = await page.evaluate(() => Object.getOwnPropertyNames(window));
    const neufs = apres.filter((x) => !avant.includes(x));
    surface[f] = (await page.evaluate((ns) => ns.map((x) => {
      let t; try { t = typeof window[x]; } catch (_) { t = '?'; }
      return `${x}:${t}`;
    }), neufs)).sort();
    avant = apres;
  }
  return { surface, incidents };
}

// ── La surface du portail, mesurée dans un navigateur ──
//
// Même méthode que pour le socle, et la même raison : une page vierge servie par
// l'application, les scripts ajoutés dans l'ordre de `index.html`, et la
// différence relevée à chaque pas. Partir d'`index.html` donnerait un `window`
// déjà peuplé.
//
// Une seule chose la distingue : **le portail démarre**. `globales/app-demarrage`
// appelle `demarrer()`, qui lit la session ; sans session, le socle ramène la
// fenêtre entière à la connexion et la page de mesure s'en va avant d'être lue.
//
// On pose donc `__oasisSessionPerdue` **avant** de charger quoi que ce soit :
// c'est le drapeau par lequel `sessionPerdue()` s'interdit de partir deux fois,
// et il rend le retour inopérant. La mesure ne dépend ainsi d'aucune session, et
// n'a pas à se connecter pour relever une surface.
const SOCLE_INDEX = ['oasis-loader', 'oasis-toast', 'oasis-theme', 'oasis-requete',
  'oasis-messages-serveur', 'oasis-commun'];

async function mesurerSurfacePortail(page, base) {
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (r.url() === `${base}/__page_vierge_portail`) {
      r.respond({
        status: 200, contentType: 'text/html',
        body: '<!doctype html><html><head></head><body><div id="app"></div></body></html>',
      });
    } else r.continue();
  });
  await page.goto(`${base}/__page_vierge_portail`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__oasisSessionPerdue = true; });

  const incidents = [];
  for (const f of SOCLE_INDEX) {
    /* eslint-disable no-await-in-loop */
    await page.addScriptTag({ url: `/shared/app/${f}.js` })
      .catch((e) => incidents.push(`${f} : ${String(e.message).slice(0, 80)}`));
  }
  const avant = await page.evaluate(() => Object.getOwnPropertyNames(window));
  await page.addScriptTag({ url: '/app/portail.js' })
    .catch((e) => incidents.push(`portail : ${String(e.message).slice(0, 120)}`));
  const apres = await page.evaluate(() => Object.getOwnPropertyNames(window));
  const neufs = apres.filter((x) => !avant.includes(x));
  const surface = (await page.evaluate((ns) => ns.map((x) => {
    let t; try { t = typeof window[x]; } catch (_) { t = '?'; }
    return `${x}:${t}`;
  }), neufs)).sort();
  return { surface, incidents };
}

module.exports = async function frontendSmoke(port) {
  console.log('\n── Frontend : les affirmations du TypeScript, vérifiées dans un navigateur ──');

  if (!fs.existsSync(FRONTEND)) {
    horsPortee('les affirmations du frontend sont vérifiées', 'frontend/ absent');
    return bilan('frontend');
  }
  const modules = fs.readdirSync(FRONTEND, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(FRONTEND, e.name, 'main.tsx')))
    .map((e) => e.name);
  verifier('au moins un écran en TypeScript est trouvé', modules.length > 0, modules.join(', '));

  const srv = await demarrer({ port });
  let navigateur = null;
  try {
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    // ── 1 et 2 : les affirmations, écran par écran ──
    //
    // La session d'abord : les écrans de module redirigent sans elle, et l'on
    // mesurerait les globales de la page de connexion.
    const page = await navigateur.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);

    for (const nom of modules) {
      // Les sources de l'écran, **plus les modules du socle qu'il importe** —
      // ceux-là sont empaquetés dedans, donc ce qu'ils lisent du monde doit
      // tenir sur cet écran. Et rien de plus : voir `graphe`.
      const fichiers = [...new Set([
        ...sources(path.join(FRONTEND, nom)),
        ...graphe(path.join(FRONTEND, nom, 'main.tsx')),
      ])];
      const lus = [...new Set([...lecturesDeWindow(fichiers), ...declarationsDeWindow(fichiers)])].sort();
      const lexicales = globalesLexicales(fichiers);
      verifier(`${nom} : ses affirmations sur le monde sont relevées`,
        lus.length + lexicales.length > 0,
        `${lus.length} sur window, ${lexicales.length} lexicales`);

      await page.goto(`${srv.base}/modules/${nom}/index.html`, { waitUntil: 'networkidle2' });
      // Le paquet monte sur `DOMContentLoaded` ; le premier rendu attend les
      // données. On laisse l'écran arriver avant de l'interroger.
      await page.waitForFunction(() => !!document.querySelector('#app *'), { timeout: 15000 })
        .catch(() => {});

      const absentes = await page.evaluate((ns) => ns.filter((n) => {
        try { return typeof window[n] === 'undefined'; } catch (_) { return true; }
      }), lus);
      // La même règle que pour les sas, et il faut qu'elle soit la même : le `?`
      // d'un membre de `Window` est une déclaration que le nom peut manquer. Dès
      // que DROITS a importé `socle/utils.ts`, ce contrôle a hérité de sa lecture
      // de `window.APP_STATE?` — exiger l'un et tolérer l'autre aurait été deux
      // règles pour un seul fait.
      const facultatives = new Set(declarationsOptionnelles(fichiers));
      const exigees = absentes.filter((n) => !facultatives.has(n));
      const tolerees = absentes.filter((n) => facultatives.has(n));
      if (tolerees.length) {
        console.log(`    ◌ ${nom} : optionnelle(s) absente(s), déclarée(s) telle(s) : ${tolerees.join(', ')}`);
      }
      verifier(`${nom} : chaque « window.X » lu ou déclaré par le TypeScript existe`,
        exigees.length === 0,
        exigees.length ? `absentes : ${exigees.join(', ')}` : `${lus.length} vérifiées`);

      // Les lexicales ne sont pas sur `window` : il faut évaluer leur nom. La
      // chaîne passe par `Runtime.evaluate`, hors de la politique de contenu de
      // la page — un `eval` dans la page y serait refusé.
      const manquantes = [];
      for (const n of lexicales) {
        /* eslint-disable no-await-in-loop */
        const t = await page.evaluate(`(() => { try { return typeof ${n}; } catch (e) { return 'inaccessible'; } })()`);
        if (t === 'undefined' || t === 'inaccessible') manquantes.push(`${n} (${t})`);
      }
      verifier(`${nom} : chaque globale lexicale déclarée existe`,
        manquantes.length === 0,
        manquantes.length ? `absentes : ${manquantes.join(', ')}` : `${lexicales.length} vérifiées`);
    }

    // ── 2 bis : ce qu'un sas du socle lit du monde existe sur les pages qui le chargent ──
    //
    // Les contrôles ci-dessus portent sur les écrans en React. Les sas, eux, sont
    // chargés par des pages restées en JavaScript — et ce qu'ils lisent doit y
    // exister. `cookies.ts` lit `window.t`, que le sas du portail pose : rien
    // ne le vérifiait, parce que l'écran DROITS ne charge ni l'un ni l'autre.
    //
    // C'est **le** contrôle qui rend les dix conversions restantes sûres : chaque
    // fichier du socle converti sera chargé par plusieurs des neuf pages, et une
    // globale qu'il croit trouver sur l'une peut manquer sur l'autre.
    //
    // ── Les lectures optionnelles sont **signalées**, non reprochées ──
    //
    // Première écriture : toutes les lectures étaient exigées, optionnelles
    // comprises, au motif que lire un nom c'est l'attendre. La conversion de
    // `oasis-utils` a montré la limite. Il lit `window.APP_STATE?.lang` pour le
    // format des dates ; `APP_STATE` n'est posé que par `pr-shell.js`, donc
    // présent sur une seule des trois pages qui chargent ce fichier. Et
    // `formatDate` n'est appelé ni sur DROITS ni sur PLAN. L'absence est donc
    // réelle, sans conséquence, et **déjà déclarée** — par le `?` du type, qui
    // est un acte d'écriture, non un oubli.
    //
    // Le `?` fait donc office de déclaration, comme `attendus` dans
    // `scripts/comparer-socle.js`. Mais l'absence est **imprimée** : une
    // optionnelle absente partout est une lecture morte, et il faut pouvoir le
    // voir sans la chercher. Ce qui reste refusé, c'est un nom déclaré
    // obligatoire et absent.
    const dossierSas = path.join(FRONTEND, 'socle', 'globales');
    const sas = fs.existsSync(dossierSas)
      ? fs.readdirSync(dossierSas).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, ''))
      : [];
    if (!sas.length) {
      horsPortee('ce qu’un sas du socle lit existe sur les pages qui le chargent',
        'aucun fichier du socle converti');
    } else {
      // Page → noms à vérifier. Regroupé : les neuf pages chargent des
      // sous-ensembles qui se recouvrent, et l'on n'ouvre chaque page qu'une fois.
      const aVerifier = new Map();
      const pagesDuSocle = [];
      (function parcourir(rep) {
        for (const e of fs.readdirSync(rep, { withFileTypes: true })) {
          const c = path.join(rep, e.name);
          if (e.isDirectory()) parcourir(c);
          else if (e.name.endsWith('.html')) pagesDuSocle.push(c);
        }
      }(path.join(RACINE, 'public')));

      const optionnelles = new Set();
      for (const nom of sas) {
        const noeuds = graphe(path.join(dossierSas, `${nom}.ts`));
        declarationsOptionnelles(noeuds).forEach((n) => optionnelles.add(n));
        const lus = lecturesDeWindow(noeuds);
        if (!lus.length) continue;
        for (const page_ of pagesDuSocle) {
          const html = fs.readFileSync(page_, 'utf8');
          if (!html.includes(`/shared/app/${nom}.js`)) continue;
          const url = `/${path.relative(path.join(RACINE, 'public'), page_).split(path.sep).join('/')}`;
          if (!aVerifier.has(url)) aVerifier.set(url, new Set());
          lus.forEach((n) => aVerifier.get(url).add(n));
        }
      }

      const manques = [];
      const signalees = [];
      for (const [url, noms] of aVerifier) {
        /* eslint-disable no-await-in-loop */
        await page.goto(`${srv.base}${url}`, { waitUntil: 'networkidle2' });
        const absentes = await page.evaluate((ns) => ns.filter((n) => {
          try { return typeof window[n] === 'undefined'; } catch (_) { return true; }
        }), [...noms]);
        const exigees = absentes.filter((n) => !optionnelles.has(n));
        const tolerees = absentes.filter((n) => optionnelles.has(n));
        if (exigees.length) manques.push(`${url} → ${exigees.join(', ')}`);
        if (tolerees.length) signalees.push(`${url} → ${tolerees.join(', ')}`);
      }
      signalees.forEach((l) => console.log(`    ◌ optionnelle absente, déclarée telle : ${l}`));
      verifier('ce qu’un sas du socle lit existe sur les pages qui le chargent',
        manques.length === 0,
        manques.length ? manques.join(' · ')
          : `${aVerifier.size} page(s), ${[...aVerifier.values()].reduce((n, s_) => n + s_.size, 0)} vérification(s)`);
    }

    // ── 3 : chaque ressource qu'une page référence est servie ──
    //
    // Le contrôle le plus bête, et celui qui rendra les onze fichiers suivants
    // sûrs. Le socle passe en TypeScript un fichier à la fois, et chaque
    // conversion déplace le fichier servi : neuf pages portent la balise, et
    // **une page oubliée ne se plaint pas**. Le navigateur demande, reçoit 404,
    // continue de charger la page, et les globales manquent.
    //
    // Un garde-fou de forme attrape déjà l'ancien chemin nommé en dur. Celui-ci
    // attrape tout le reste : une faute de frappe, un fichier renommé, une
    // feuille de style oubliée. Il ne connaît aucune liste — il lit les pages.
    const ressources = new Map();
    const pages = [];
    (function parcourir(rep) {
      for (const e of fs.readdirSync(rep, { withFileTypes: true })) {
        const chemin = path.join(rep, e.name);
        if (e.isDirectory()) parcourir(chemin);
        else if (e.name.endsWith('.html')) pages.push(chemin);
      }
    }(path.join(RACINE, 'public')));
    for (const page_ of pages) {
      const html = fs.readFileSync(page_, 'utf8');
      const relatif = path.relative(path.join(RACINE, 'public'), page_);
      for (const m of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:js|css))"/g)) {
        if (!ressources.has(m[1])) ressources.set(m[1], []);
        ressources.get(m[1]).push(relatif);
      }
    }
    const absentes404 = [];
    for (const [url, pagesQuiDemandent] of ressources) {
      /* eslint-disable no-await-in-loop */
      const r = await fetch(`${srv.base}${url}`, { redirect: 'manual' });
      if (r.status !== 200) absentes404.push(`${url} (${r.status}) ← ${pagesQuiDemandent.join(', ')}`);
    }
    verifier('chaque script et feuille de style référencés par une page sont servis',
      absentes404.length === 0,
      absentes404.length ? absentes404.join(' · ')
        : `${ressources.size} ressources, ${pages.length} pages`);

    // ── 4 : la surface du socle, contre le relevé de référence ──
    //
    // Dans un **contexte de navigateur à part**, et ce n'est pas une précaution
    // de style. `oasis-hors-ligne.js` enregistre le service worker, et les pages
    // que les contrôles ci-dessus ouvrent le font donc entrer en service pour
    // l'origine. La page de mesure en héritait : ses requêtes passaient par lui,
    // et **les douze fichiers du socle devenaient « Could not load script »** —
    // y compris ceux qui venaient d'être mesurés sans encombre.
    //
    // Le défaut est apparu quand la conversion d'`oasis-dates` a porté le
    // contrôle par page de trois écrans à six, dont RAMP et EXÉCUTION, les deux
    // qui chargent le mode dégradé. Reproduit en isolation : la mesure passait.
    // Ce n'était donc pas la conversion, c'était l'état accumulé par la suite.
    const bocal = await navigateur.createBrowserContext();
    const mesure = await bocal.newPage();
    const { surface, incidents } = await mesurerSurface(mesure, srv.base);
    verifier('le socle se charge sans incident', incidents.length === 0, incidents.join(' · '));

    if (!fs.existsSync(REFERENCE)) {
      horsPortee('la surface du socle est conforme au relevé',
        `relevé absent — écrire ${path.relative(RACINE, REFERENCE)}`);
    } else {
      const attendue = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
      const ecarts = [];
      for (const f of new Set([...Object.keys(attendue), ...Object.keys(surface)])) {
        const a = (attendue[f] || []).join(',');
        const m = (surface[f] || []).join(',');
        if (a === m) continue;
        const perdus = (attendue[f] || []).filter((x) => !(surface[f] || []).includes(x));
        const neufs = (surface[f] || []).filter((x) => !(attendue[f] || []).includes(x));
        ecarts.push(`${f}${perdus.length ? ` — perdus : ${perdus.join(' ')}` : ''}${neufs.length ? ` — nouveaux : ${neufs.join(' ')}` : ''}`);
      }
      const total = Object.values(surface).reduce((n, l) => n + l.length, 0);
      verifier('la surface du socle est conforme au relevé', ecarts.length === 0,
        ecarts.length ? ecarts.join(' | ') : `${total} noms, ${Object.keys(surface).length} fichiers`);
    }

    // ── 4 bis : le contrat du socle avec le shell de chaque module ──
    //
    // `module-chrome.js` décore le shell du module : marque OASIS dans
    // `.sidebar-header`, super-menus dans `.header-left`, et — c'est la ligne qui
    // compte — **« Retour au portail » à la place de `.btn-logout`**.
    //
    // Ce contrat existait depuis le premier jour, nulle part écrit et par rien
    // vérifié. Il a coûté deux boutons morts : MESURES et RAMP rendaient chacun un
    // `.btn-back-portal` dans leur barre latérale, et personne n'a jamais pu en
    // cliquer un — `injectChrome` vide `.sidebar-header`, et son observateur le
    // refait à chaque rendu du module (ADR-003, 5.e.8).
    //
    // Les deux conséquences qu'on mesure ici, **page par page** :
    //
    //   · `.oasis-back-btn` est présent — donc le module a bien rendu son
    //     `.btn-logout`, la seule ancre par laquelle le retour arrive. Un module
    //     qui cesserait de le rendre perdrait le **seul chemin vers le portail**,
    //     sans une erreur ni une trace ;
    //   · `.btn-back-portal` est absent — aucun module ne rend un bouton de retour
    //     qui lui serait propre, le retour appartenant au socle.
    //
    // On mesure le **résultat**, non le mécanisme : ce contrôle ne sait rien de la
    // façon dont le shell est écrit, et c'est ce qui le rend durable. Les six pages
    // sont relevées — la suite « parcours » n'en exerce qu'une, dans son cadre.
    //
    // ── Et ce qu'il ne peut pas voir, mesuré ──
    //
    // Contre-essayé en remettant un `.btn-back-portal` **dans** `.sidebar-header` :
    // **vert**. Le socle vide ce conteneur avant la mesure, et le bouton n'existe
    // dans aucun DOM observable. *Un contrôle du DOM ne peut pas voir un balisage
    // que le DOM n'a jamais porté* — c'est-à-dire exactement le défaut qui a motivé
    // cette étape.
    //
    // Le même bouton placé **hors** de `.sidebar-header` est, lui, dénoncé
    // (`propre: 1`). L'assertion garde donc son sens, et sa limite est nommée : le
    // balisage mort dans le conteneur effacé est refusé par un contrôle **de
    // source**, dans la suite « taille ». Il faut les deux, et pour la même raison
    // que la surface du portail en demande deux.
    //
    // Les pages se **déduisent** : celles qui chargent `module-chrome.js`. Une
    // page de module qui ne le chargerait pas n'a pas ce contrat.
    const pagesChrome = pages
      .map((html) => ({ html, rel: `/${path.relative(path.join(RACINE, 'public'), html).split(path.sep).join('/')}` }))
      .filter(({ html }) => /module-chrome\.js/.test(fs.readFileSync(html, 'utf8')));
    if (!pagesChrome.length) {
      horsPortee('chaque page de module porte le retour au portail du socle, et le sien seul',
        'aucune page ne charge module-chrome.js');
    } else {
      const ecarts = [];
      for (const { rel } of pagesChrome) {
        /* eslint-disable no-await-in-loop */
        await page.goto(`${srv.base}${rel}`, { waitUntil: 'networkidle2' });
        await page.waitForFunction(() => !!document.querySelector('#app *'), { timeout: 15000 })
          .catch(() => {});
        // Le shell se redessine : on laisse l'observateur du socle repasser.
        await new Promise((r) => setTimeout(r, 600));
        const vu = await page.evaluate(() => ({
          socle: document.querySelectorAll('.oasis-back-btn').length,
          propre: document.querySelectorAll('.btn-back-portal').length,
          ancre: document.querySelectorAll('.btn-logout').length,
        }));
        if (vu.socle !== 1 || vu.propre !== 0) {
          ecarts.push(`${rel} → ${JSON.stringify(vu)}`);
        }
      }
      verifier('chaque page de module porte le retour au portail du socle, et le sien seul',
        ecarts.length === 0,
        ecarts.length ? ecarts.join(' · ') : `${pagesChrome.length} pages, 1 retour chacune`);
    }

    // ── 5 : aucun sas du portail ne publie un nom que la page ne lit pas ──
    //
    // Lecture seule du dépôt, aucun navigateur : le relevé suit les balises
    // `<script>` de chaque page, résout les paquets par leur graphe d'imports, et
    // classe chaque nom publié par la **sorte** de son lecteur — un geste du
    // balisage, un autre paquet du même document, ou le paquet lui-même qui se
    // relit à travers `window`. Un nom sans aucun des trois est muet.
    //
    // Ce contrôle est ce qui empêche la surface de se remettre à grossir, et il a
    // une histoire : deux écritures du relevé étaient fausses avant celle-ci —
    // l'une comptait les homonymes des écrans de module, l'autre ignorait les
    // lectures du portail sur lui-même et déclarait morts dix-sept noms vivants.
    // L'outil porte ces deux mesures dans son en-tête.
    try {
      const releve = relever('portail');
      const sansLecteur = muets(releve);
      const publies = [...releve.par_sas.values()].reduce((n, l) => n + l.length, 0);
      verifier('aucun sas du portail ne publie un nom que la page ne lit pas',
        sansLecteur.length === 0,
        sansLecteur.length
          ? sansLecteur.map((m) => `${m.sas} → ${m.nom}`).join(' · ')
          : `${publies} noms publiés, ${releve.par_sas.size} sas, tous lus`);
    } catch (e) {
      verifier('aucun sas du portail ne publie un nom que la page ne lit pas',
        false, `le relevé a refusé : ${e.message}`);
    }

    // ── 6 : la surface du portail, contre le relevé de référence ──
    //
    // Un contexte de navigateur à part, pour la même raison que le socle : le
    // service worker enregistré par les pages ouvertes plus haut ferait échouer
    // le chargement des scripts de la page de mesure.
    const bocalPortail = await navigateur.createBrowserContext();
    const mesurePortail = await bocalPortail.newPage();
    const portail = await mesurerSurfacePortail(mesurePortail, srv.base);
    verifier('le portail se charge sans incident',
      portail.incidents.length === 0, portail.incidents.join(' · '));

    if (!fs.existsSync(REFERENCE_PORTAIL)) {
      horsPortee('la surface du portail est conforme au relevé',
        `relevé absent — écrire ${path.relative(RACINE, REFERENCE_PORTAIL)}`);
    } else {
      const attendue = JSON.parse(fs.readFileSync(REFERENCE_PORTAIL, 'utf8'));
      const perdus = attendue.filter((x) => !portail.surface.includes(x));
      const neufs = portail.surface.filter((x) => !attendue.includes(x));
      verifier('la surface du portail est conforme au relevé',
        perdus.length === 0 && neufs.length === 0,
        perdus.length || neufs.length
          ? `${perdus.length ? `perdus : ${perdus.join(' ')}` : ''}${perdus.length && neufs.length ? ' — ' : ''}${neufs.length ? `nouveaux : ${neufs.join(' ')}` : ''}`
          : `${portail.surface.length} noms`);
    }
  } finally {
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('frontend');
};

// Exportée pour que le relevé de référence se **régénère à la main**, et jamais
// par la suite elle-même : un contrôle qui réécrit son attendu quand il échoue
// est un contrôle qui ne dit rien. Voir `docs/ADR-003-cadre-du-frontend.md`,
// 5.e.5, pour la commande.
module.exports.mesurerSurfacePortail = mesurerSurfacePortail;
