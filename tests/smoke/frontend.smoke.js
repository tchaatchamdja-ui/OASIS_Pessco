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

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

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

    // Les modules purs du socle (`frontend/socle/*.ts`) sont **empaquetés dans**
    // l'écran qui les importe : ce qu'ils lisent du monde doit tenir sur cet
    // écran. Les lire avec les sources du module n'est donc pas un excès de
    // zèle — sans cela, un accès global posé là serait invisible à cette suite
    // alors qu'il tourne bel et bien dans l'écran.
    //
    // `socle/globales/` est volontairement hors de ce relevé : ces sas posent
    // les globales qu'ils déclarent, et c'est le contrôle de surface ci-dessous
    // qui vérifie qu'ils les posent vraiment.
    const dossierSocle = path.join(FRONTEND, 'socle');
    const socleCommun = fs.existsSync(dossierSocle)
      ? fs.readdirSync(dossierSocle, { withFileTypes: true })
        .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
        .map((e) => path.join(dossierSocle, e.name))
      : [];

    for (const nom of modules) {
      const fichiers = [...sources(path.join(FRONTEND, nom)), ...socleCommun];
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
      verifier(`${nom} : chaque « window.X » lu ou déclaré par le TypeScript existe`,
        absentes.length === 0,
        absentes.length ? `absentes : ${absentes.join(', ')}` : `${lus.length} vérifiées`);

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
    const mesure = await navigateur.newPage();
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
  } finally {
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('frontend');
};
