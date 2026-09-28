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
// Relevé du 26 septembre 2026, contre un serveur Node externe : **632 des 753
// contrôles passent**, 13 se déclarent hors de portée. Les 109 restants — les
// suites « taille », « traductions », « unitaires » et « magasin-pg » — lisent
// les sources ou visent une base, et n'ont pas de serveur d'application à
// atteindre.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..');

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

async function demarrer({ port = 4788 } = {}) {
  // Une adresse est donnée : on ne démarre rien, on s'y adresse.
  const externe = String(process.env.OASIS_SMOKE_BASE || '').replace(/\/$/, '');
  const tmp = externe ? null : copierDonnees();
  const proc = externe ? null : spawn(process.execPath, [path.join(RACINE, 'server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      OASIS_DATA_DIR: path.join(tmp, 'data'),
      OASIS_CONFIG_DIR: path.join(tmp, 'config'),
      // Les comptes d'amorçage tirent un mot de passe au hasard : les tests
      // en imposent un connu, pour rester exécutables sur un jeu vierge.
      OASIS_SEED_PASSWORD: 'Aerosup@2026!Uemoa',
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
  const donnees = (nom) => (tmp
    ? JSON.parse(fs.readFileSync(path.join(tmp, 'data', `${nom}.json`), 'utf-8'))
    : seulementEnLocal('donnees()'));

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

module.exports = { demarrer, verifier, horsPortee, bilan, etat };
