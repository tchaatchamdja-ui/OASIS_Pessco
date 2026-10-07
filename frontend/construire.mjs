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
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
  .filter((d) => d.isDirectory() && existsSync(join(ICI, d.name, 'globales')))
  .map((d) => d.name);

const sansSortie = ensembles.filter((nom) => !(nom in SORTIE_SAS));
if (sansSortie.length) {
  console.error(`construction interrompue : ${sansSortie.join(', ')} porte(nt) un dossier `
    + '« globales » sans sortie déclarée dans SORTIE_SAS (frontend/construire.mjs).');
  process.exit(1);
}

const sas = ensembles.flatMap((ensemble) => readdirSync(join(ICI, ensemble, 'globales'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ ensemble, nom: f.replace(/\.ts$/, '') })));

if (!ecrans.length && !sas.length) {
  console.log('construction : rien à construire.');
  process.exit(0);
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

await Promise.all(sas.map(async ({ ensemble, nom }) => {
  const sortie = join(RACINE, 'public', SORTIE_SAS[ensemble], `${nom}.js`);
  await build({
    ...commun,
    entryPoints: [join(ICI, ensemble, 'globales', `${nom}.ts`)],
    outfile: sortie,
  });
  console.log(`construction : ${ensemble} ${nom} → ${relative(RACINE, sortie)}`);
}));

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
