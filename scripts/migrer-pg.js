#!/usr/bin/env node
// OASIS — Reprise des données de fichiers vers PostgreSQL.
//
//   DATABASE_URL=postgres://… node scripts/migrer-pg.js [--verifier]
//
// Copie chaque collection de `data/*.json` dans la table `collections`, et
// chaque journal de `data/*.jsonl` dans la table `journal`, entrée par entrée
// et dans l'ordre. Rien n'est transformé : une collection arrive telle qu'elle
// est, empreintes du journal d'audit comprises, de sorte que la chaîne reste
// vérifiable après la reprise comme avant.
//
// Elle ne touche pas aux fichiers : ils restent en place, témoins. Une reprise
// rejouée écrase ce qu'elle avait écrit — même contenu, même résultat.
//
// `--verifier` relit tout depuis la base et compare au fichier, octet à octet
// après normalisation JSON. Sans cette passe, une reprise n'est qu'une
// espérance.
const fs = require('fs');
const path = require('path');
const storePg = require('../src/store_pg');

const DATA_DIR = process.env.OASIS_DATA_DIR || path.join(__dirname, '..', 'data');

const memeContenu = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function migrer({ verifier = false } = {}) {
  const magasin = storePg.ouvrir();
  if (!magasin) {
    console.error('DATABASE_URL absent : rien à faire.');
    process.exit(2);
  }
  await magasin.preparer();

  const fichiers = fs.readdirSync(DATA_DIR);
  const collections = fichiers.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const journaux = fichiers.filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -6));

  const bilan = { collections: 0, entrees: 0, ecarts: [] };

  for (const nom of collections) {
    // Un journal repris en lignes garde son ancien tableau à côté : c'est le
    // fichier en lignes qui fait foi, on ne reprend pas les deux.
    if (journaux.includes(nom)) continue;
    const brut = fs.readFileSync(path.join(DATA_DIR, `${nom}.json`), 'utf-8');
    let valeur;
    try { valeur = JSON.parse(brut); } catch (e) {
      bilan.ecarts.push(`${nom}.json illisible — ${e.message}`);
      continue;
    }
    await magasin.save(nom, valeur);
    bilan.collections += 1;
    if (verifier && !memeContenu(await magasin.load(nom, null), valeur)) {
      bilan.ecarts.push(`${nom} : relu différent de l'écrit`);
    }
  }

  for (const nom of journaux) {
    const lignes = fs.readFileSync(path.join(DATA_DIR, `${nom}.jsonl`), 'utf-8')
      .split('\n').filter((l) => l.trim());
    // Une reprise rejouée ne doit pas doubler les entrées : le journal est en
    // ajout seul, on ne reprend donc que ce qui manque à la fin.
    const deja = await magasin.compte(nom);
    for (const ligne of lignes.slice(deja)) {
      await magasin.ajouter(nom, JSON.parse(ligne));
      bilan.entrees += 1;
    }
    if (verifier) {
      const enBase = await magasin.lire(nom);
      const surDisque = lignes.map((l) => JSON.parse(l));
      if (!memeContenu(enBase, surDisque)) {
        bilan.ecarts.push(`${nom} : ${enBase.length} entrées en base, ${surDisque.length} sur le disque`);
      }
    }
  }

  if (magasin.fermer) await magasin.fermer();
  return bilan;
}

if (require.main === module) {
  migrer({ verifier: process.argv.includes('--verifier') })
    .then((b) => {
      console.log(`Collections reprises : ${b.collections}`);
      console.log(`Entrées de journal ajoutées : ${b.entrees}`);
      if (b.ecarts.length) {
        console.error('\nÉcarts :');
        b.ecarts.forEach((e) => console.error(`  · ${e}`));
        process.exit(1);
      }
      console.log(process.argv.includes('--verifier')
        ? 'Vérifié : la base rend exactement ce que les fichiers portaient.'
        : 'Reprise faite. Relancer avec --verifier pour comparer.');
    })
    .catch((e) => { console.error(`Reprise interrompue — ${e.message}`); process.exit(1); });
}

module.exports = { migrer };
