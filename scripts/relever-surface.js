#!/usr/bin/env node
// OASIS — Relevé de la surface globale d'un ensemble : ce qu'un sas publie, et
// **qui peut le lire**.
//
// ADR-003, suite n° 5.e.5. Le portail est entièrement en TypeScript ; les sas de
// `frontend/portail/globales/` ne font plus tenir ensemble deux moitiés d'un même
// écran. Il ne leur reste qu'un emploi : **poser sur `window` ce que la page
// appelle depuis son balisage**. Tout le reste est un reste de la cohabitation.
//
// Retirer un nom de la surface est une décision (précédent `_icon`, 5.c) ; la
// laisser à l'appréciation de qui édite le sas est exactement ce que ce dépôt a
// appris à ne plus faire. Le critère est donc mesuré.
//
// ── La première écriture de ce relevé était fausse, et de beaucoup ──
//
// Elle comptait comme lecteur tout fichier « hors du paquet » qui mentionnait le
// nom. `icon` paraissait lu **quarante-deux fois**, et `t` **cent cinquante-huit** :
// les écrans de module ont leur propre `icon` et leur propre `t`, et aucun ne
// charge le moindre `/app/*.js`. On mesurait des homonymes.
//
// Un nom global ne se lit que **dans le document qui le porte**. Le relevé part
// donc des pages HTML, suit les balises `<script>` jusqu'aux sources, et ne
// retient comme lecteur qu'un fichier chargé par une page où le sas est, lui
// aussi, chargé.
//
// ── Trois sortes de lecteurs, qui ne valent pas la même chose ──
//
//   · **geste** — le nom est appelé par un gestionnaire en ligne du balisage
//     (`onclick="…"`). Le navigateur l'évalue dans la portée globale : sans
//     `window.<nom>`, le clic ne fait rien, **sans erreur visible**. C'est le
//     lecteur qui impose la publication, et celui qu'aucun compilateur ne voit.
//   · **hors-paquet** — un autre paquet du même document lit `window.<nom>` : le
//     socle, un script de page. Lui aussi impose la publication.
//   · **intra** — le paquet qui publie le nom se le relit **à travers `window`**.
//     C'est une dette, et non une interface ; mais retirer le nom casserait le
//     paquet lui-même, donc la publication est imposée tant que la dette est là.
//   · **essai** — le nom n'est lu que par un contrôle ou un comparateur. Cela
//     **ne justifie rien** : une preuve qui tient la surface en vie mesure son
//     propre montage, et ce dépôt s'y est pris cinq fois.
//
// Dans les fichiers du paquet qui publie, une occurrence du nom comme identifiant
// n'est pas une lecture de la globale : c'est l'import. Seules comptent les
// occurrences **dans une chaîne**, car une chaîne du portail est du balisage ;
// le contenu des interpolations `${…}` est retiré, étant du code du même paquet.
//
// ── La deuxième écriture était fausse aussi, et plus dangereusement ──
//
// Elle n'avait pas la sorte **intra**, et déclarait muets dix-sept noms que le
// portail se relit sur `window` : `window.renderConfig()` appelé par huit de ses
// fichiers, `window.onLangChange()` par `applyLang` **dans le sas lui-même**,
// les cinq vues que `demarrage.ts` appelle ainsi. Les retirer n'aurait rien
// cassé à la compilation et aurait rendu huit écrans inertes au clic.
//
// Ce n'est pas un détail d'implémentation : c'est le mode de défaillance que ce
// dépôt redoute le plus, et un relevé qui prétend autoriser un retrait doit le
// voir. La dette reste nommée dans l'ADR ; le relevé, lui, refuse de la
// confondre avec un nom mort.
//
// ── Ce que ce relevé ne couvre pas, et qu'il faut savoir ──
//
// Il ne relève que ce qu'un **sas** publie (`window.X = …` dans
// `globales/*.ts`). La surface réelle de la page est plus large : `etat.ts` pose
// dix noms d'état (`ME`, `REFS`, `VIEWS`, `CURRENT_VIEW`, …) depuis le module et
// non depuis son sas. Ceux-là sont le **magasin** de l'état partagé, non une
// interface : la mesure qui les couvre est le relevé de surface en navigateur
// (`tests/smoke/surface-portail.json`), et c'est lui qui garde l'ensemble.
//
// Les lectures d'un document à l'autre (`parent.<nom>`, `top.<nom>`) ont été
// cherchées : il n'y en a aucune. Les écrans de module parlent au portail par
// `postMessage`, et c'est la seule voie.
//
// Usage :  node scripts/relever-surface.js [ensemble] [--json] [--muets]
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FRONTEND = path.join(RACINE, 'frontend');
const PUBLIC = path.join(RACINE, 'public');

// Les sorties de construction, lues dans `construire.mjs` : la table y est, et
// l'écrire ici une seconde fois serait deux copies à tenir d'accord.
function sortiesSas() {
  const texte = fs.readFileSync(path.join(FRONTEND, 'construire.mjs'), 'utf8');
  const bloc = /const SORTIE_SAS = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : SORTIE_SAS introuvable dans frontend/construire.mjs.'
      + ' Sans elle, le relevé ne sait plus quel fichier servi vient de quelle source.');
  }
  const table = {};
  for (const m of bloc[1].matchAll(/(\w+):\s*(?:join\('([^']+)',\s*'([^']+)'\)|'([^']+)')/g)) {
    table[m[1]] = m[2] ? `${m[2]}/${m[3]}` : m[4];
  }
  return table;
}

// ── Le graphe d'imports d'un paquet : ce qu'il embarque réellement ──
//
// Repris de `tests/smoke/frontend.smoke.js`, pour la même raison : un paquet
// n'embarque que ce qu'il importe, et lui reprocher le reste du dossier
// rendrait un compte plausible et faux.
function graphe(entree) {
  const vus = new Set();
  const file = [entree];
  while (file.length) {
    const f = file.pop();
    if (vus.has(f) || !fs.existsSync(f)) continue;
    vus.add(f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const brut = path.resolve(path.dirname(f), m[1]);
      const candidat = ['.ts', '.tsx', '/index.ts', '/index.tsx', '']
        .map((e) => `${brut}${e}`).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (candidat) file.push(candidat);
    }
  }
  return vus;
}

// Le fichier servi → sa source, et de là son paquet. Un fichier servi qui n'est
// pas construit (un écran resté en JavaScript) est son propre paquet.
function paquetDe(src) {
  const sorties = sortiesSas();
  for (const [ensemble, sortie] of Object.entries(sorties)) {
    const prefixe = `/${sortie}/`;
    if (!src.startsWith(prefixe)) continue;
    const nom = src.slice(prefixe.length).replace(/\.js$/, '');
    for (const sorte of ['globales', 'pages']) {
      const source = path.join(FRONTEND, ensemble, sorte, `${nom}.ts`);
      if (fs.existsSync(source)) return { entree: source, fichiers: graphe(source) };
    }
  }
  const module = /^\/modules\/([^/]+)\/app\/main\.js$/.exec(src);
  if (module) {
    const source = path.join(FRONTEND, module[1], 'main.tsx');
    if (fs.existsSync(source)) return { entree: source, fichiers: graphe(source) };
  }
  const brut = path.join(PUBLIC, src.replace(/^\//, ''));
  if (fs.existsSync(brut)) return { entree: brut, fichiers: new Set([brut]) };
  return null;
}

function pages() {
  const liste = [];
  (function parcourir(rep) {
    for (const e of fs.readdirSync(rep, { withFileTypes: true })) {
      const p = path.join(rep, e.name);
      if (e.isDirectory()) { if (!/^(app|css|img)$/.test(e.name)) parcourir(p); }
      else if (e.name.endsWith('.html')) liste.push(p);
    }
  }(PUBLIC));
  return liste.sort();
}

function scriptsDe(html) {
  const texte = fs.readFileSync(html, 'utf8');
  return [...texte.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
    .filter((s) => s.startsWith('/'));
}

// ── L'extraction des chaînes ──
//
// Un découpage à la main, et non une expression rationnelle : les littéraux de
// gabarit s'imbriquent, et une expression qui l'ignorerait rendrait du code pour
// du balisage. Le contenu de `${…}` est sauté — sauf les chaînes qu'il contient,
// qui sont du balisage elles aussi.
function chaines(code) {
  const sortie = [];
  let i = 0;
  const n = code.length;
  const litteral = (fin) => {
    let tampon = '';
    while (i < n && code[i] !== fin) {
      if (code[i] === '\\') { tampon += code[i + 1] || ''; i += 2; } else { tampon += code[i]; i += 1; }
    }
    i += 1;
    return tampon;
  };
  while (i < n) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') {
      while (i < n && code[i] !== '\n') i += 1;
    } else if (c === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
      i += 2;
    } else if (c === '"' || c === "'") {
      i += 1;
      sortie.push(litteral(c));
    } else if (c === '`') {
      i += 1;
      let tampon = '';
      while (i < n) {
        if (code[i] === '\\') { tampon += code[i + 1] || ''; i += 2; continue; }
        if (code[i] === '`') { i += 1; break; }
        if (code[i] === '$' && code[i + 1] === '{') {
          i += 2;
          let profondeur = 1;
          while (i < n && profondeur > 0) {
            if (code[i] === '{') { profondeur += 1; i += 1; } else if (code[i] === '}') { profondeur -= 1; i += 1; } else if (code[i] === '"' || code[i] === "'") {
              const fin = code[i]; i += 1; sortie.push(litteral(fin));
            } else if (code[i] === '`') {
              // Un gabarit imbriqué : on le découpe entièrement, par récursion
              // sur la tranche, pour ne pas réécrire l'automate deux fois.
              const debut = i; i += 1; let p = 0;
              while (i < n) {
                if (code[i] === '\\') { i += 2; continue; }
                if (code[i] === '$' && code[i + 1] === '{') { p += 1; i += 2; continue; }
                if (code[i] === '}' && p > 0) { p -= 1; i += 1; continue; }
                if (code[i] === '`' && p === 0) break;
                i += 1;
              }
              i += 1;
              sortie.push(...chaines(code.slice(debut, i)));
            } else i += 1;
          }
          continue;
        }
        tampon += code[i];
        i += 1;
      }
      sortie.push(tampon);
    } else i += 1;
  }
  return sortie;
}

// Un commentaire n'affirme rien et ne lit rien : il faut l'ôter du texte entier,
// et non ligne par ligne (reprise de `tests/smoke/frontend.smoke.js`, où un
// commentaire JSX avait fait rougir un garde-fou sur du code correct).
const sansCommentaires = (texte) => texte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

// Un gestionnaire en ligne : `on<événement>="…"`.
const GESTE = /\bon[a-z]{3,20}\s*=\s*(["'])([\s\S]*?)\1/g;
const nu = (nom) => new RegExp(`(^|[^.\\w$])${nom}\\b`);
const surWindow = (nom) => new RegExp(`window\\.${nom}\\b(?!\\s*=[^=])`);

// ── Le nom **appelé depuis une chaîne**, et pourquoi ce critère a remplacé
//    le relevé des seuls attributs `on…=` ──
//
// `exportBar` écrit `onclick="${pdf}"`, et `pdf` vaut `exportPdf('…')` ou
// l'argument qu'un appelant lui passe (`'exportPdfActivites()'`, dans
// `taxinomie.ts`). Le gestionnaire est donc **assemblé en deux temps** : son
// attribut ne porte qu'une interpolation, et le relevé des attributs déclarait
// `exportPdf` et `exportPdfActivites` muets. Deux boutons d'export sur deux
// écrans auraient cessé de faire quoi que ce soit — sans erreur de console,
// `onclick` échouant en silence sur un nom absent.
//
// Le critère est donc : le nom suivi d'une parenthèse **dans une chaîne**. Du
// code écrit en texte ne peut être évalué que dans la portée globale, quel que
// soit le chemin par lequel il atteint le balisage. Et il écarte ce que le
// relevé par mot nu ramassait à tort : `class="group-icon"` n'appelle pas
// `icon`, `<tr>` n'appelle pas `tr`, et `getElementById('userRole')` nomme un
// élément, non une fonction.
const appele = (nom) => new RegExp(`(^|[^.\\w$])${nom}\\s*\\(`);

function relever(ensemble = 'portail') {
  const dossier = path.join(FRONTEND, ensemble, 'globales');
  if (!fs.existsSync(dossier)) throw new Error(`refus : ${ensemble} n'a pas de dossier « globales ».`);

  // Les noms publiés, sas par sas. `window.<nom> =` où qu'il soit dans le
  // fichier : `i18n.ts` en pose un depuis l'intérieur d'une fonction, et un
  // relevé qui ne lirait que le premier niveau le manquerait.
  const par_sas = new Map();
  for (const f of fs.readdirSync(dossier).filter((n) => n.endsWith('.ts')).sort()) {
    const noms = [];
    for (const m of fs.readFileSync(path.join(dossier, f), 'utf8')
      .matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) {
      if (!noms.includes(m[1])) noms.push(m[1]);
    }
    if (noms.length) par_sas.set(f, noms);
  }
  if (!par_sas.size) {
    throw new Error(`refus : aucun nom publié relevé dans frontend/${ensemble}/globales.`
      + ' Un relevé vide et une surface vide se ressemblent, et seul le refus les distingue.');
  }

  const tous = [...par_sas.values()].flat();
  const lecteurs = new Map(tous.map((n) => [n, {
    geste: [], horsPaquet: [], intra: [], essai: [], pages: [],
  }]));
  const ajoute = (nom, sorte, ou) => {
    const l = lecteurs.get(nom);
    if (l && !l[sorte].includes(ou)) l[sorte].push(ou);
  };
  const rel = (f) => path.relative(RACINE, f);

  // ── Page par page : qui est chargé avec quoi ──
  for (const html of pages()) {
    const paquets = scriptsDe(html).map(paquetDe).filter(Boolean);
    const texteHtml = fs.readFileSync(html, 'utf8');

    for (const [sas, noms] of par_sas) {
      const source = path.join(dossier, sas);
      const porteurs = paquets.filter((p) => p.fichiers.has(source));
      if (!porteurs.length) continue;             // le sas n'est pas sur cette page
      for (const nom of noms) ajoute(nom, 'pages', path.relative(PUBLIC, html));

      // Le balisage de la page elle-même, et ses lectures directes.
      for (const m of texteHtml.matchAll(GESTE)) {
        for (const nom of noms) if (nu(nom).test(m[2])) ajoute(nom, 'geste', path.relative(PUBLIC, html));
      }
      for (const nom of noms) {
        if (surWindow(nom).test(texteHtml)) ajoute(nom, 'horsPaquet', path.relative(PUBLIC, html));
      }

      // Les fichiers du paquet porteur : leurs **chaînes** seules.
      const memePaquet = new Set();
      porteurs.forEach((p) => p.fichiers.forEach((f) => memePaquet.add(f)));
      for (const f of memePaquet) {
        const brut = fs.readFileSync(f, 'utf8');
        const texte = /\.html$/.test(f) ? brut : chaines(brut).join('\n');
        for (const m of texte.matchAll(GESTE)) {
          for (const nom of noms) if (nu(nom).test(m[2])) ajoute(nom, 'geste', rel(f));
        }
        for (const nom of noms) if (appele(nom).test(texte)) ajoute(nom, 'geste', rel(f));
        // Et le paquet relu à travers `window` : hors des chaînes, cette fois,
        // et commentaires ôtés — un commentaire qui *explique* `window.X`
        // n'est pas une lecture, et le premier jet du garde-fou du socle s'y
        // était déjà pris.
        const code = sansCommentaires(brut);
        for (const nom of noms) if (surWindow(nom).test(code)) ajoute(nom, 'intra', rel(f));
      }

      // Les autres paquets de la même page : eux n'atteignent le nom que par
      // `window.<nom>`, n'ayant rien à importer.
      for (const p of paquets) {
        if (porteurs.includes(p)) continue;
        for (const f of p.fichiers) {
          if (memePaquet.has(f)) continue;
          const texte = fs.readFileSync(f, 'utf8');
          for (const nom of noms) if (surWindow(nom).test(texte)) ajoute(nom, 'horsPaquet', rel(f));
          for (const m of texte.matchAll(GESTE)) {
            for (const nom of noms) if (nu(nom).test(m[2])) ajoute(nom, 'geste', rel(f));
          }
        }
      }
    }
  }

  // ── Les contrôles et les comparateurs, relevés et tenus à part ──
  const essais = [];
  (function parcourir(rep) {
    if (!fs.existsSync(rep)) return;
    for (const e of fs.readdirSync(rep, { withFileTypes: true })) {
      const p = path.join(rep, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (/\.(js|mjs|json)$/.test(e.name)) essais.push(p);
    }
  }(path.join(RACINE, 'tests')));
  for (const f of fs.readdirSync(path.join(RACINE, 'scripts'))) {
    if (/\.js$/.test(f)) essais.push(path.join(RACINE, 'scripts', f));
  }
  for (const f of essais) {
    const texte = fs.readFileSync(f, 'utf8');
    for (const nom of tous) if (nu(nom).test(texte)) ajoute(nom, 'essai', rel(f));
  }

  return { par_sas, lecteurs };
}

function muets({ par_sas, lecteurs }) {
  const sortie = [];
  for (const [sas, noms] of par_sas) {
    for (const nom of noms) {
      const l = lecteurs.get(nom);
      if (!l.geste.length && !l.horsPaquet.length && !l.intra.length) {
        sortie.push({ sas, nom, essai: l.essai, pages: l.pages });
      }
    }
  }
  return sortie;
}

if (require.main === module) {
  const ensemble = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'portail';
  const releve = relever(ensemble);
  if (process.argv.includes('--json')) {
    const plat = {};
    for (const [sas, noms] of releve.par_sas) {
      plat[sas] = noms.map((nom) => ({ nom, ...releve.lecteurs.get(nom) }));
    }
    console.log(JSON.stringify(plat, null, 2));
  } else if (process.argv.includes('--muets')) {
    for (const m of muets(releve)) console.log(`${m.sas}\t${m.nom}\t${m.essai.join(' ') || 'aucun lecteur'}`);
  } else {
    let publies = 0;
    for (const [sas, noms] of releve.par_sas) {
      console.log(`\n── ${sas}`);
      for (const nom of noms) {
        publies += 1;
        const l = releve.lecteurs.get(nom);
        const sortes = [];
        if (l.geste.length) sortes.push(`geste : ${l.geste.join(', ')}`);
        if (l.horsPaquet.length) sortes.push(`hors-paquet : ${l.horsPaquet.join(', ')}`);
        if (l.intra.length) sortes.push(`intra (${l.intra.length})`);
        if (!sortes.length) sortes.push(l.essai.length ? `MUET (essai : ${l.essai.length})` : 'MUET');
        console.log(`   ${nom.padEnd(29)} ${sortes.join(' | ')}`);
      }
    }
    const m = muets(releve);
    console.log(`\n${publies} nom(s) publié(s), ${publies - m.length} lu(s) par la page, ${m.length} muet(s).`);
  }
}

module.exports = { relever, muets, chaines };
