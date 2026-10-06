// OASIS — Harnais des tests de fumée.
//
// Démarre le serveur sur un port libre, ouvre une session, puis met à
// disposition un client HTTP et quelques assertions. Aucune dépendance
// externe : `node --test` n'est pas requis, `npm run smoke` suffit.
//
// Les tests ne modifient jamais data/ : le harnais recopie le dossier dans un
// répertoire temporaire et fait pointer le serveur dessus (OASIS_DATA_DIR).
//
// ── Viser une adresse plutôt qu'un processus (ADR-002, jalon n° 5) ──
//
// La réécriture en Java se fera module par module, par étranglement progressif.
// Ces contrôles sont la recette de chaque bascule : ils passent par HTTP avec
// session et n'appellent aucune fonction interne. Encore faut-il pouvoir les
// diriger ailleurs que sur le `server.js` qu'ils lancent eux-mêmes.
//
//   OASIS_SMOKE_BASE=http://localhost:8080 npm run smoke -- socle
//
// Le harnais ne démarre alors rien : il s'adresse à ce qui écoute là. En
// contrepartie il perd ce qui lisait le disque du serveur — `donnees`,
// `fichierExiste`, `logs` — car ce disque est ailleurs, et peut-être sur une
// autre machine. `srv.local` dit lequel des deux régimes est en cours ; les
// contrôles concernés se déclarent **hors de portée**, et le bilan les compte.
// Un contrôle tu serait pire qu'un contrôle absent.
//
// **La cible doit repartir des fixtures à chaque exécution.** En local, chaque
// suite reçoit une copie neuve ; à distance, non — et « socle » efface un
// compte, « planification » supprime des plans, « RAMP » des inspections. Un
// second passage sur la même cible échoue, et l'on croit à une régression là
// où il n'y a qu'un jeu de données déjà consommé. `scripts/cible-essai.sh`
// rend la remise à zéro aussi courte que l'oubli serait coûteux.
//
// Pour la même raison, une cible sert **une suite à la fois** : à distance
// elles la partagent, alors qu'en local chacune a la sienne.
//
// Relevé du 26 septembre 2026, contre un serveur Node externe : **632 des 795
// contrôles passent**, 13 se déclarent hors de portée. Les 151 restants — les
// suites « taille », « traductions », « unitaires » et « magasin-pg » — lisent
// les sources ou visent une base, et n'ont pas de serveur d'application à
// atteindre.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..');
// La liste des collections migrées : `donnees()` doit savoir où chercher.
//
// Lue **dans la source**, et non par `require` : charger `src/magasin.js`
// chargerait `src/store.js`, qui fige son répertoire de données à l'import. Ce
// harnais est requis par toutes les suites avant qu'« unitaires » ne pose le
// sien, et les écritures d'essai partiraient alors dans le vrai `data/`. Le
// défaut est connu, et il a déjà été corrigé une fois dans la suite « taille » :
// il ne faut pas le réintroduire ici.
const COLLECTIONS_EN_BASE = new Set(
  ((fs.readFileSync(path.join(RACINE, 'src', 'magasin.js'), 'utf8')
    .match(/const MIGREES = new Set\(\[([\s\S]*?)\n\]\);/) || [])[1] || '')
    .match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)) || [],
);

function copierDonnees() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-smoke-'));
  // Jeu de référence versionné : les tests ne dépendent pas de l'état de
  // data/, qui évolue au fil de l'exploitation. OASIS_SMOKE_DATA permet d'en
  // désigner un autre — par exemple les données réelles, pour un contrôle.
  const src = process.env.OASIS_SMOKE_DATA || path.join(RACINE, 'tests', 'fixtures');
  fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  fs.readdirSync(src).forEach((f) => fs.copyFileSync(path.join(src, f), path.join(tmp, 'data', f)));
  // Config isolée : session unique désactivée pour ne pas évincer l'utilisateur
  const cfgDir = path.join(tmp, 'config');
  fs.mkdirSync(cfgDir, { recursive: true });
  fs.readdirSync(path.join(RACINE, 'config')).forEach((f) => {
    const contenu = fs.readFileSync(path.join(RACINE, 'config', f), 'utf-8');
    fs.writeFileSync(path.join(cfgDir, f), contenu.replace(/"singleSession":\s*true/g, '"singleSession": false'));
  });
  return tmp;
}

function attendre(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// `env` ajoute des variables à celles du serveur d'essai. Une suite qui éprouve
// un réglage — l'authentification à deux facteurs, par exemple — a besoin de le
// poser sans toucher au paramétrage des autres.
// ── L'isolement, quand une partie des données vit en base ──
//
// Chaque suite reçoit une copie neuve de `data/` : c'est ce qui la rend
// indépendante des autres. **Depuis que des collections vivent en base, cette
// copie ne suffit plus** — la base, elle, est partagée. La suite « socle »
// efface un compte, et les suivantes le cherchent en vain ; l'amorçage ne
// repose pas les comptes des fixtures, puisqu'il en trouve déjà.
//
// Chaque suite reçoit donc **son propre schéma PostgreSQL**, créé avant le
// démarrage et détruit à l'arrêt. L'isolement est rendu, et il l'est de la même
// façon des deux côtés : un répertoire à elle, un schéma à elle.
async function schemaIsole(port, dossierDonnees) {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const nom = `oasis_smoke_${port}_${Math.random().toString(36).slice(2, 8)}`;
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: url });
  await p.query(`DROP SCHEMA IF EXISTS ${nom} CASCADE`);
  await p.query(`CREATE SCHEMA ${nom}`);
  await p.end();
  const sep = url.includes('?') ? '&' : '?';
  const schema = { nom, url: `${url}${sep}options=-c%20search_path%3D${nom}` };

  // ── Les fixtures doivent entrer dans la base, et pas seulement sur le disque ──
  //
  // Sans cette reprise, le régime base n'a que ce que l'amorçage y pose : trois
  // comptes au lieu des quinze du jeu d'essai, et aucun privilège. Les contrôles
  // de droits rendaient alors des listes vides — et c'est ainsi que le manque
  // s'est vu. Le fichier, lui, restait là, complet et ignoré.
  //
  // La reprise se fait dans un processus à part : `scripts/migrer-pg.js` fige son
  // répertoire de données à l'import, et l'appeler ici le pointerait sur le
  // mauvais.
  // eslint-disable-next-line global-require
  const { execFileSync } = require('child_process');
  execFileSync(process.execPath, [path.join(RACINE, 'scripts', 'migrer-pg.js')], {
    env: { ...process.env, DATABASE_URL: schema.url, OASIS_DATA_DIR: dossierDonnees },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  return schema;
}

async function effacerSchema(schema) {
  if (!schema) return;
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  await p.query(`DROP SCHEMA IF EXISTS ${schema.nom} CASCADE`);
  await p.end();
}

async function demarrer({ port = 4788, env: envSup = {} } = {}) {
  // Une adresse est donnée : on ne démarre rien, on s'y adresse.
  const externe = String(process.env.OASIS_SMOKE_BASE || '').replace(/\/$/, '');
  const tmp = externe ? null : copierDonnees();
  const schema = externe ? null : await schemaIsole(port, path.join(tmp, 'data'));
  const proc = externe ? null : spawn(process.execPath, [path.join(RACINE, 'server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      OASIS_DATA_DIR: path.join(tmp, 'data'),
      OASIS_CONFIG_DIR: path.join(tmp, 'config'),
      // La sonde des sauvegardes regarde un répertoire à elle, dans le bac.
      // Sans cela elle lirait les archives du dépôt — donc une suite dirait une
      // chose et la même suite une autre selon la machine, et chaque serveur
      // d'essai journaliserait une erreur sur un répertoire qui n'est pas en
      // cause. Un contrôle qui dépend de l'état du disque de celui qui le lance
      // ne contrôle rien.
      OASIS_SAUVEGARDES_DIR: path.join(tmp, 'sauvegardes'),
      // Les comptes d'amorçage tirent un mot de passe au hasard : les tests
      // en imposent un connu, pour rester exécutables sur un jeu vierge.
      OASIS_SEED_PASSWORD: 'Aerosup@2026!Uemoa',
      ...(schema ? { DATABASE_URL: schema.url } : {}),
      ...envSup,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sortie = '';
  if (proc) {
    proc.stdout.on('data', (d) => { sortie += d; });
    proc.stderr.on('data', (d) => { sortie += d; });
  }

  const base = externe || `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/login.html`);
      if (r.ok) break;
    } catch (e) { /* pas encore prêt */ }
    await attendre(100);
  }

  let cookie = '';
  const appel = async (chemin, options = {}) => {
    const r = await fetch(base + chemin, {
      ...options,
      headers: {
        'content-type': 'application/json',
        // Même marquage que les pages : les écritures sans cet en-tête sont refusées.
        'X-OASIS-Request': '1',
        ...(cookie ? { cookie } : {}),
        ...(options.headers || {}),
      },
    });
    const set = r.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const texte = await r.text();
    let corps = null;
    try { corps = JSON.parse(texte); } catch (e) { corps = texte; }
    // Les en-têtes sont rendus avec la réponse : certains contrôles portent sur
    // eux — politique de contenu, cadrage, type deviné.
    const entetes = {};
    r.headers.forEach((v, k) => { entetes[k.toLowerCase()] = v; });
    return { statut: r.status, corps, entetes };
  };

  const connexion = async (username = 'superadmin@anac.bj', password = 'Aerosup@2026!Uemoa') => {
    const r = await appel('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (r.statut !== 200) throw new Error(`connexion impossible (${r.statut}) — ${JSON.stringify(r.corps).slice(0, 120)}`);
    return r.corps;
  };

  const arreter = () => {
    // Rien à arrêter ni à effacer quand le serveur n'est pas de nous.
    if (!proc) return;
    proc.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
    // Le schéma part avec la suite. L'effacement n'est pas attendu : la suite
    // est finie, et un schéma oublié ne gêne que l'espace disque — le prochain
    // passage en crée un autre. L'échec part aux traces plutôt que de faire
    // tomber une campagne qui vient de réussir.
    effacerSchema(schema).catch((e) => console.log(`  ◌ schéma ${schema && schema.nom} non effacé — ${e.message}`));
  };

  // Ce qui n'a de sens qu'en local : le disque du serveur est ici, ou bien il
  // est ailleurs. Le refus nomme la cause plutôt que de rendre une donnée vide
  // — un contrôle qui compare à du vide passerait, et ne prouverait rien.
  const seulementEnLocal = (quoi) => {
    throw new Error(
      `${quoi} lit le disque du serveur : impossible contre OASIS_SMOKE_BASE (${base}). `
      + 'Encadrer ce contrôle par `srv.local`, et le déclarer hors de portée sinon.',
    );
  };

  // Lecture directe d'une collection du serveur d'essai : ce qu'aucune route
  // ne sert plus — les restes d'un enregistrement supprimé — se vérifie ici.
  //
  // **Elle doit lire là où la donnée vit.** Une collection passée en base n'est
  // plus dans le fichier, qui reste figé sur la copie des fixtures : un contrôle
  // qui y chercherait les restes d'un compte effacé les y trouverait toujours, et
  // conclurait que l'effacement n'a pas eu lieu. C'est exactement ce qui s'est
  // produit le jour où `users` a basculé.
  //
  // Asynchrone pour cette raison, et pour elle seule.
  const donnees = async (nom) => {
    if (!tmp) return seulementEnLocal('donnees()');
    if (schema && COLLECTIONS_EN_BASE.has(nom)) {
      // eslint-disable-next-line global-require
      const { Pool } = require('pg');
      const p = new Pool({ connectionString: schema.url });
      try {
        const r = await p.query('SELECT valeur FROM collections WHERE nom = $1', [nom]);
        return r.rows.length ? r.rows[0].valeur : null;
      } finally { await p.end(); }
    }
    return JSON.parse(fs.readFileSync(path.join(tmp, 'data', `${nom}.json`), 'utf-8'));
  };

  // Présence d'un fichier sous le dossier de données du serveur d'essai
  // (pièces déposées, preuves).
  const fichierExiste = (relatif) => (tmp
    ? fs.existsSync(path.join(tmp, 'data', relatif))
    : seulementEnLocal('fichierExiste()'));

  return {
    base,
    // Vrai quand le serveur est de nous, et que son disque est donc à portée.
    local: !externe,
    appel,
    connexion,
    arreter,
    donnees,
    fichierExiste,
    logs: () => (proc ? sortie : seulementEnLocal('logs()')),
  };
}

// ── Mini-assertions ──
const etat = { total: 0, echecs: [], horsPortee: [] };

function verifier(libelle, condition, detail) {
  etat.total += 1;
  if (condition) {
    console.log(`  ✓ ${libelle}`);
  } else {
    etat.echecs.push(libelle + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// Un contrôle qu'on ne peut pas mener ici. Il n'est ni réussi ni échoué : il
// est **déclaré**, et le bilan le compte à part.
//
// C'est le seul traitement honnête. Le passer silencieusement gonflerait le
// vert d'une assurance qu'on n'a pas ; le faire échouer confondrait « pas
// éprouvé » et « défectueux », et l'on apprendrait à ignorer des rouges.
function horsPortee(libelle, motif) {
  etat.horsPortee.push(libelle + (motif ? ` — ${motif}` : ''));
  console.log(`  ◌ ${libelle}${motif ? ` — ${motif}` : ''}`);
}

function bilan(titre) {
  const ok = etat.echecs.length === 0;
  const hors = etat.horsPortee.length
    ? ` · ${etat.horsPortee.length} hors de portée à distance`
    : '';
  console.log(`\n${ok ? '✓' : '✗'} ${titre} : ${etat.total - etat.echecs.length}/${etat.total} contrôles${hors}`);
  if (!ok) etat.echecs.forEach((e) => console.log(`   · ${e}`));
  etat.horsPortee.forEach((e) => console.log(`   ◌ ${e}`));
  etat.total = 0;          // compteurs propres à chaque suite
  etat.echecs = [];
  etat.horsPortee = [];
  return ok;
}

// ── Où vit un fichier du socle, pendant la conversion ──
//
// Le socle passe en TypeScript un fichier à la fois (ADR-003, 5.b). Chaque
// conversion déplace le fichier servi de `public/shared/js/` vers
// `public/shared/app/`, où il est **construit**. Un chemin écrit en dur cesse
// donc d'exister le jour de la conversion.
//
// Ce n'est pas une crainte : la conversion d'`oasis-dates` a fait tomber une
// épreuve de la suite « socle » sur un `ENOENT`, parce qu'elle chargeait le
// fichier par son ancien chemin dans une machine virtuelle. Le garde-fou qui
// devait l'empêcher ne regardait que les pages HTML, pas le code des suites.
//
// Un seul endroit sait donc où vit un fichier du socle, et il le **déduit** de
// l'existence du sas. Rien à tenir d'accord.
function cheminSocle(nom) {
  const sas = path.join(RACINE, 'frontend', 'socle', 'globales', `${nom}.ts`);
  const repertoire = fs.existsSync(sas) ? 'app' : 'js';
  return path.join(RACINE, 'public', 'shared', repertoire, `${nom}.js`);
}

// La **source** d'un fichier du socle : le TypeScript s'il est converti, le
// JavaScript d'origine sinon.
//
// Un garde-fou qui lit le contenu écrit — la liste des écritures différables, par
// exemple — doit viser la source, non le paquet : celui-ci est minifié en
// production, et un détecteur sur du code minifié ne vaut rien.
//
// La correspondance se **déduit** du sas, qui importe son module : `oasis-hors-ligne`
// donne `hors-ligne.ts`, et le préfixe tombe sans qu'aucune table ne le dise.
function sourceSocle(nom) {
  const sas = path.join(RACINE, 'frontend', 'socle', 'globales', `${nom}.ts`);
  if (!fs.existsSync(sas)) return path.join(RACINE, 'public', 'shared', 'js', `${nom}.js`);
  const m = /from '\.\.\/([^']+)'/.exec(fs.readFileSync(sas, 'utf8'));
  if (!m) throw new Error(`le sas ${nom}.ts n'importe aucun module : source introuvable`);
  return path.join(RACINE, 'frontend', 'socle', `${m[1]}.ts`);
}

// La même chose, en URL servie.
const urlSocle = (nom) => `/shared/${fs.existsSync(path.join(RACINE, 'frontend', 'socle', 'globales', `${nom}.ts`)) ? 'app' : 'js'}/${nom}.js`;

module.exports = {
  demarrer, verifier, horsPortee, bilan, etat, cheminSocle, sourceSocle, urlSocle,
};
