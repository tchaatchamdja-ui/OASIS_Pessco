// OASIS — Harnais des tests de fumée.
//
// Démarre le serveur sur un port libre, ouvre une session, puis met à
// disposition un client HTTP et quelques assertions. Aucune dépendance
// externe : `node --test` n'est pas requis, `npm run smoke` suffit.
//
// Les tests ne modifient jamais data/ : le harnais recopie le dossier dans un
// répertoire temporaire et fait pointer le serveur dessus (OASIS_DATA_DIR).
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
  const tmp = copierDonnees();
  const proc = spawn(process.execPath, [path.join(RACINE, 'server.js')], {
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
  proc.stdout.on('data', (d) => { sortie += d; });
  proc.stderr.on('data', (d) => { sortie += d; });

  const base = `http://localhost:${port}`;
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
    return { statut: r.status, corps };
  };

  const connexion = async (username = 'superadmin@anac.bj', password = 'Aerosup@2026!Uemoa') => {
    const r = await appel('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (r.statut !== 200) throw new Error(`connexion impossible (${r.statut}) — ${JSON.stringify(r.corps).slice(0, 120)}`);
    return r.corps;
  };

  const arreter = () => {
    proc.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  };

  // Lecture directe d'une collection du serveur d'essai : ce qu'aucune route
  // ne sert plus — les restes d'un enregistrement supprimé — se vérifie ici.
  const donnees = (nom) => JSON.parse(fs.readFileSync(path.join(tmp, 'data', `${nom}.json`), 'utf-8'));

  return { base, appel, connexion, arreter, donnees, logs: () => sortie };
}

// ── Mini-assertions ──
const etat = { total: 0, echecs: [] };

function verifier(libelle, condition, detail) {
  etat.total += 1;
  if (condition) {
    console.log(`  ✓ ${libelle}`);
  } else {
    etat.echecs.push(libelle + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

function bilan(titre) {
  const ok = etat.echecs.length === 0;
  console.log(`\n${ok ? '✓' : '✗'} ${titre} : ${etat.total - etat.echecs.length}/${etat.total} contrôles`);
  if (!ok) etat.echecs.forEach((e) => console.log(`   · ${e}`));
  etat.total = 0;          // compteurs propres à chaque suite
  etat.echecs = [];
  return ok;
}

module.exports = { demarrer, verifier, bilan, etat };
