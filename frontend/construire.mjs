// OASIS — L'étape de construction du frontend (ADR-003).
//
// Le dépôt n'en avait aucune : `express.static` servait `public/` tel quel, et
// `COPY public` suffisait au déploiement. Le passage à React + TypeScript en
// demande une, et c'est le coût que l'ADR annonçait.
//
// ── Pourquoi esbuild, et non Vite ──
//
// Vite est l'outil ordinaire de React + TypeScript, et il apporte un serveur de
// développement que nous n'utiliserons pas : les écrans sont servis par Express,
// avec leurs sessions, leurs cookies et leur politique de contenu. Il apporte
// aussi un arbre de dépendances que personne ici n'aurait lu.
//
// esbuild fait ce dont nous avons besoin — JSX, TypeScript, un paquet par
// écran — en une dépendance et sans fichier de configuration. Pour une
// application d'autorité dont le dépôt ne portait aucune dépendance de
// développement, c'est le choix qui se défend.
//
// **esbuild n'est pas un vérificateur de types.** Il retire les annotations sans
// les lire. Le typage ne vaut donc que par `tsc --noEmit`, que `npm run build`
// exécute avant lui : sans cette passe, on aurait le coût de TypeScript sans son
// bénéfice, ce qui serait la pire des deux positions.
//
// ── Où va ce qui est construit, et pourquoi ce n'est pas versionné ──
//
// La source vit dans `frontend/`, le paquet dans `public/modules/<module>/app/`,
// que `express.static` sert comme le reste. Le paquet **n'est pas versionné** :
// un paquet obsolète servi en production est un défaut qui ne se voit pas, et
// un fichier construit dans un diff masque ce qui a réellement changé.
//
// La conséquence est assumée : `npm run smoke` construit avant d'éprouver, et le
// `Dockerfile` a son étape. Un écran qui ne se construit pas ne se déploie pas.
//
// ── Et la réciproque, apprise tard : ce qui se construit doit se charger ──
//
// Cette étape écrivait **tout** fichier de `globales/` et de `pages/` comme un
// paquet autonome. Depuis que le portail tient en un seul paquet (5.d.7), les
// quinze sas qu'il importe étaient construits pour personne : **4 484 Ko et
// 38 fichiers écrits à chaque construction, dont 3 260 Ko et 30 fichiers que
// plus aucune balise ne charge.** Servis par `express.static`, embarqués dans
// l'image, lus par rien.
//
// Rien ne le mesurait, et c'est le point : *l'écart entre ce qui est construit
// et ce qui est chargé n'était regardé par aucun garde-fou.* Deux refus le
// tiennent maintenant, dans les deux sens — un sas que rien n'atteint, et une
// balise qui demande un paquet que rien ne produit.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import {
  dirname, join, relative, resolve, sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

// Un écran par dossier de `frontend/`, dont le point d'entrée est `main.tsx`.
// Rien à déclarer : ajouter un dossier suffit, et c'est ce qui fera que le
// huitième module n'aura pas à toucher à ce fichier.
const ecrans = readdirSync(ICI, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((nom) => existsSync(join(ICI, nom, 'main.tsx')));

// ── La seconde cible : les sas du socle commun (ADR-003, 5.b) ──
//
// Le socle n'est pas un écran : il n'a ni interface, ni React, et il est
// consommé de deux façons le temps de la cohabitation. `frontend/socle/*.ts`
// porte la source typée, que les écrans en React importent ; chaque fichier de
// `frontend/socle/globales/` est un sas qui en publie les globales pour les
// écrans restés en JavaScript.
//
// Le nom du sas **est** celui du fichier servi : `globales/oasis-theme.ts` donne
// `public/shared/app/oasis-theme.js`, sous le nom que les balises portaient
// déjà. Aucune table de correspondance à tenir d'accord — c'est ce qui fera que
// les onze fichiers suivants n'auront pas à toucher à celui-ci.
// ── Et un sas par **ensemble** converti, non pour le seul socle ──
//
// Le portail suit le socle (ADR-003, 5.c) : ses fichiers sans interface passent
// en TypeScript et un sas publie leurs globales pour les fichiers restés en
// JavaScript. Il lui faut donc sa propre sortie, le portail étant servi à la
// racine et non sous `/shared/`.
//
// Cette table est le seul endroit du dépôt qui l'écrive, et c'est à regret :
// deux lignes à tenir d'accord est deux de trop. Le garde-fou qui suit est donc
// ce qui compte — **tout dossier `globales/` doit y figurer**, sinon la
// construction s'arrête en le nommant. Sans lui, un ensemble converti ne serait
// simplement pas construit, et les pages serviraient l'ancien fichier en
// silence : le mode de défaillance le plus coûteux de ce dépôt.
const SORTIE_SAS = {
  socle: join('shared', 'app'),
  portail: 'app',
};

const ensembles = readdirSync(ICI, { withFileTypes: true })
  .filter((d) => d.isDirectory()
    && (existsSync(join(ICI, d.name, 'globales')) || existsSync(join(ICI, d.name, 'pages'))))
  .map((d) => d.name);

const sansSortie = ensembles.filter((nom) => !(nom in SORTIE_SAS));
if (sansSortie.length) {
  console.error(`construction interrompue : ${sansSortie.join(', ')} porte(nt) un dossier `
    + '« globales » ou « pages » sans sortie déclarée dans SORTIE_SAS (frontend/construire.mjs).');
  process.exit(1);
}

// ── Deux sortes de fichiers par ensemble, construits de la même façon ──
//
//   · `globales/` — un **sas** : il publie des globales pour les fichiers restés
//     en JavaScript, et c'est lui qui les déclare ;
//   · `pages/`    — un **script de page** : le point d'entrée d'une page qui n'a
//     pas de React, converti pour ses types et non pour publier quoi que ce soit.
//
// La construction est identique ; seule la lecture qu'en font les garde-fous
// diffère. Les séparer par le dossier plutôt que par une liste évite d'avoir à
// dire lequel est lequel deux fois.
const SORTES = ['globales', 'pages'];

const sas = ensembles.flatMap((ensemble) => SORTES
  .filter((sorte) => existsSync(join(ICI, ensemble, sorte)))
  .flatMap((sorte) => readdirSync(join(ICI, ensemble, sorte))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ ensemble, sorte, nom: f.replace(/\.ts$/, '') }))));

if (!ecrans.length && !sas.length) {
  console.log('construction : rien à construire.');
  process.exit(0);
}

// ── Ce qu'on construit est ce qu'une page charge, et rien d'autre ──
//
// Jusqu'au 14 octobre 2026, **chaque** fichier de `globales/` et de `pages/`
// devenait un paquet autonome. C'était juste tant que la page les chargeait un à
// un ; depuis que le portail tient en un seul paquet (5.d.7), les quinze sas
// qu'il importe étaient **construits pour personne** : 0,9 Mo écrits à chaque
// construction, servis par `express.static`, embarqués dans l'image, et chargés
// par aucune balise.
//
// Personne ne l'avait vu parce que rien ne mesurait l'écart entre ce qui est
// construit et ce qui est chargé. Les comparateurs les lisaient — c'était leur
// seul lecteur —, et la décision qui en a fait des pièces d'archive (5.e.5) a
// laissé ces paquets sans emploi.
//
// Trois situations, et elles se **déduisent** des balises `<script>` des pages :
//
//   · **servi**    — une page le charge : c'est un point d'entrée, on le construit ;
//   · **embarqué** — aucune page ne le charge, mais un point d'entrée l'importe :
//     il voyage dans ce paquet-là, et le construire à part en ferait une seconde
//     copie — avec son propre état de module, le défaut même que 5.d.7 a corrigé ;
//   · **orphelin** — ni l'un ni l'autre. La construction **refuse**.
//
// Le refus est le cœur de ce garde-fou. Un sas orphelin est du code que rien
// n'atteint : ni la page, ni un autre paquet. Le sauter en silence, c'est écrire
// un fichier qui ne sert à rien et ne jamais le savoir — exactement ce qui vient
// d'arriver, en plus discret.
function pagesServies() {
  const vus = new Set();
  (function parcourir(rep) {
    for (const e of readdirSync(rep, { withFileTypes: true })) {
      const c = join(rep, e.name);
      if (e.isDirectory()) parcourir(c);
      else if (e.name.endsWith('.html')) {
        for (const m of readFileSync(c, 'utf8').matchAll(/<script[^>]+src="(\/[^"]+\.js)"/g)) {
          vus.add(m[1]);
        }
      }
    }
  }(join(RACINE, 'public')));
  return vus;
}

// Le graphe d'imports d'un point d'entrée : ce que son paquet embarque
// réellement. Même parcours que `tests/smoke/frontend.smoke.js` et
// `scripts/relever-surface.js`, pour la même raison — un paquet n'embarque que
// ce qu'il importe.
function graphe(entree) {
  const vus = new Set();
  const file = [entree];
  while (file.length) {
    const f = file.pop();
    if (vus.has(f) || !existsSync(f)) continue;
    vus.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
      const brut = resolve(dirname(f), m[1]);
      const candidat = ['.ts', '.tsx', '/index.ts', '/index.tsx', '']
        .map((e) => `${brut}${e}`)
        .find((c) => existsSync(c) && statSync(c).isFile());
      if (candidat) file.push(candidat);
    }
  }
  return vus;
}

const servies = pagesServies();
const cheminSas = ({ ensemble, nom }) => `/${SORTIE_SAS[ensemble].split(sep).join('/')}/${nom}.js`;
const sourceSas = ({ ensemble, sorte, nom }) => join(ICI, ensemble, sorte, `${nom}.ts`);

const sasServis = sas.filter((s) => servies.has(cheminSas(s)));
// Les écrans en React sont des points d'entrée par construction : leur page les
// charge sous `main.js`. On relève tout de même ceux qu'aucune page ne nomme —
// non pour refuser, mais pour le dire : un écran en cours de conversion existe
// légitimement avant que sa page ne pointe sur lui, et une construction qui
// l'interdirait gênerait le travail sans rien protéger. Le sas, lui, n'a pas
// cette excuse : il n'existe que pour être chargé ou importé.
const ecransNonCharges = ecrans
  .filter((nom) => !servies.has(`/modules/${nom}/app/main.js`));

const embarques = new Set();
for (const s of sasServis) graphe(sourceSas(s)).forEach((f) => embarques.add(f));
for (const nom of ecrans) graphe(join(ICI, nom, 'main.tsx')).forEach((f) => embarques.add(f));

const orphelins = sas
  .filter((s) => !servies.has(cheminSas(s)) && !embarques.has(sourceSas(s)))
  .map((s) => `${relative(RACINE, sourceSas(s))} (servirait ${cheminSas(s)})`);

if (orphelins.length) {
  console.error('construction interrompue : '
    + `${orphelins.length} sas que rien n'atteint — ni une balise « script » d'une page,`
    + ' ni l\'import d\'un paquet qui, lui, est chargé :');
  orphelins.forEach((o) => console.error(`  · ${o}`));
  console.error('Le charger depuis la page qui en a besoin, le faire importer par le sas'
    + ' de son ensemble, ou le supprimer. Un sas que personne n\'atteint est du code mort'
    + ' qui se construit quand même.');
  process.exit(1);
}

const sasEmbarques = sas.filter((s) => !servies.has(cheminSas(s)));

// ── Et la symétrie : une balise qui demande un paquet que rien ne produit ──
//
// Le garde ci-dessus va de la source vers la page. Celui-ci va de la page vers
// la source, et il couvre l'autre moitié du même défaut : une balise
// `<script src="/app/schemas.js">` laissée en place après la suppression du sas
// rend un **404 silencieux** — la page se charge, le script manque, et la moitié
// de l'écran ne répond plus sans une ligne d'erreur côté serveur.
//
// La campagne le dit déjà (« chaque script référencé par une page est servi »),
// mais elle le dit après coup, un serveur démarré. Ici il le dit avant de
// construire quoi que ce soit, et c'est la règle que l'ADR porte depuis le
// premier jour : *un écran qui ne se construit pas ne se déploie pas.*
//
// La vérification ne porte que sur les répertoires que **cette** construction
// écrit : `public/modules/<module>/js/*.js` est du JavaScript non converti, servi
// tel quel, et il n'a rien à voir ici.
const produits = new Set([
  ...sasServis.map(cheminSas),
  ...ecrans.map((nom) => `/modules/${nom}/app/main.js`),
]);
const sousConstruction = (url) => Object.values(SORTIE_SAS)
  .some((sortie) => url.startsWith(`/${sortie.split(sep).join('/')}/`))
  || /^\/modules\/[^/]+\/app\//.test(url);

const demandesMortes = [...servies]
  .filter((url) => sousConstruction(url) && !produits.has(url));

if (demandesMortes.length) {
  console.error('construction interrompue : '
    + `${demandesMortes.length} balise(s) « script » demandent un paquet que rien ne produit :`);
  demandesMortes.forEach((u) => console.error(`  · ${u}`));
  console.error('Servi tel quel, ce chemin rend un 404 silencieux : la page se charge et le'
    + ' script manque. Corriger la balise, ou écrire le sas qui la sert.');
  process.exit(1);
}

// ── La vérification des types est **dans** la construction, non à côté ──
//
// esbuild retire les annotations sans les lire. Enchaînée par un script —
// `tsc && esbuild` —, la vérification se saute d'un `--no-...` ou d'un appel
// direct, et l'on aurait le coût de TypeScript sans son bénéfice. Ici, on ne
// construit pas sans avoir vérifié.
console.log('construction : vérification des types…');
try {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsc', '--noEmit', '-p', join(ICI, 'tsconfig.json')],
    { stdio: 'inherit', cwd: RACINE },
  );
} catch {
  // `tsc` a déjà dit où et quoi : inutile de le redire, mais il faut s'arrêter.
  console.error('construction interrompue : les types ne tiennent pas.');
  process.exit(1);
}

const production = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

// Les réglages que les deux cibles partagent. Écrits une fois : deux copies
// auraient divergé, et c'est la minification ou la carte de source qui aurait
// différé d'une cible à l'autre sans que rien ne le dise.
const commun = {
  bundle: true,
  format: 'iife',
  target: 'es2020',
  // Les cartes de source en développement seulement : en production elles
  // publieraient la source de l'écran, et pèseraient pour rien.
  sourcemap: !production,
  minify: production,
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development') },
};

await Promise.all(sasServis.map(async ({ ensemble, sorte, nom }) => {
  const sortie = join(RACINE, 'public', SORTIE_SAS[ensemble], `${nom}.js`);
  await build({
    ...commun,
    entryPoints: [join(ICI, ensemble, sorte, `${nom}.ts`)],
    outfile: sortie,
  });
  console.log(`construction : ${ensemble} ${nom} → ${relative(RACINE, sortie)}`);
}));

if (sasEmbarques.length) {
  const par = sasEmbarques.reduce((acc, s) => {
    (acc[s.ensemble] = acc[s.ensemble] || []).push(s.nom);
    return acc;
  }, {});
  Object.entries(par).forEach(([ensemble, noms]) => {
    console.log(`construction : ${ensemble} — ${noms.length} sas embarqué(s) dans un paquet`
      + ` chargé, non construits à part : ${noms.sort().join(', ')}`);
  });
}
ecransNonCharges.forEach((nom) => {
  console.log(`construction : ${nom} construit, mais aucune page ne charge`
    + ` /modules/${nom}/app/main.js`);
});

await Promise.all(ecrans.map(async (nom) => {
  const sortie = join(RACINE, 'public', 'modules', nom, 'app', 'main.js');
  await build({
    ...commun,
    entryPoints: [join(ICI, nom, 'main.tsx')],
    outfile: sortie,
    jsx: 'automatic',
  });
  console.log(`construction : ${nom} → public/modules/${nom}/app/main.js`);
}));
