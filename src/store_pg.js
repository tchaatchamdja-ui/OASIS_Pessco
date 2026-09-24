// OASIS — Magasin PostgreSQL.
//
// La cible annoncée depuis l'origine (README, note technique) : une base par
// État, réplication logique vers le serveur central UEMOA. Ce fichier en porte
// la moitié serveur ; la bascule, elle, demande autre chose — voir
// docs/MAGASIN-POSTGRESQL.md.
//
// ── Ce qu'il fait, et ce qu'il ne fait pas ──
//
// Il rejoue exactement le contrat de `src/store.js` : une collection entière se
// lit, une collection entière s'écrit. Ce n'est pas un schéma relationnel — les
// modules continueraient de manipuler des tableaux d'objets, rangés en JSONB.
// C'est un portage, non une refonte : le pas qui apporte ce que des fichiers ne
// peuvent pas donner — écriture atomique, accès concurrent, sauvegarde à chaud,
// réplication — sans réécrire les 381 accès des modules.
//
// Le journal d'audit, lui, y gagne sa forme naturelle : une ligne par entrée,
// insérée, jamais réécrite.
//
// ── Pourquoi une interface de client, et non `pg` directement ──
//
// `client.query(sql, params)` suffit à tout ce qui suit. Un faux client permet
// d'éprouver le SQL produit et l'enchaînement des appels sans base ; `pg` ne
// s'attache qu'au bord, dans `ouvrir()`.

// Deux tables, et pas une de plus.
//
// `collections` : le document d'une collection, sous son nom. `maj` dit quand,
// ce qu'un fichier ne disait qu'au système de fichiers.
//
// `journal` : une entrée par ligne, `ordre` croissant. La chaîne SHA-256 est
// dans les entrées elles-mêmes ; la base n'a pas à la connaître, elle a
// seulement à ne rien perdre et à ne rien réordonner.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS collections (
     nom    TEXT PRIMARY KEY,
     valeur JSONB NOT NULL,
     maj    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS journal (
     nom    TEXT NOT NULL,
     ordre  BIGSERIAL PRIMARY KEY,
     entree JSONB NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS journal_nom_ordre ON journal (nom, ordre)',
];

function creer(client) {
  if (!client || typeof client.query !== 'function') {
    throw new Error('magasin PostgreSQL : client.query manquant');
  }

  // Idempotent : appelé à chaque démarrage, il ne fait rien la deuxième fois.
  async function preparer() {
    for (const sql of SCHEMA) await client.query(sql);
  }

  // ── Contrat de src/store.js ──

  async function load(nom, defaut) {
    const r = await client.query('SELECT valeur FROM collections WHERE nom = $1', [nom]);
    if (!r.rows.length) return defaut;
    return r.rows[0].valeur;
  }

  // Une écriture, une instruction : PostgreSQL la rend atomique. Le fichier
  // demandait un temporaire puis un renommage, et deux processus écrivant
  // ensemble se perdaient l'un l'autre.
  async function save(nom, valeur) {
    await client.query(
      `INSERT INTO collections (nom, valeur, maj) VALUES ($1, $2, now())
       ON CONFLICT (nom) DO UPDATE SET valeur = EXCLUDED.valeur, maj = now()`,
      [nom, JSON.stringify(valeur)],
    );
    return valeur;
  }

  const collections = async () => (await client.query('SELECT nom FROM collections ORDER BY nom'))
    .rows.map((r) => r.nom);

  // ── Contrat de src/journal.js ──

  // Ajout seul : rien de ce qui précède n'est relu ni réécrit, comme le
  // fichier en lignes — et sans la lecture préalable que celui-ci demandait.
  async function ajouter(nom, entree) {
    await client.query('INSERT INTO journal (nom, entree) VALUES ($1, $2)',
      [nom, JSON.stringify(entree)]);
  }

  const lire = async (nom) => (await client.query(
    'SELECT entree FROM journal WHERE nom = $1 ORDER BY ordre', [nom],
  )).rows.map((r) => r.entree);

  // La dernière entrée sans tout relire : c'est tout ce dont le chaînage a
  // besoin pour poser l'empreinte suivante. Le fichier en lignes, lui, relit
  // tout — voilà ce que la base apporte en plus.
  async function derniere(nom) {
    const r = await client.query(
      'SELECT entree FROM journal WHERE nom = $1 ORDER BY ordre DESC LIMIT 1', [nom],
    );
    return r.rows.length ? r.rows[0].entree : null;
  }

  const compte = async (nom) => Number((await client.query(
    'SELECT count(*)::int AS n FROM journal WHERE nom = $1', [nom],
  )).rows[0].n);

  return { preparer, load, save, collections, ajouter, lire, derniere, compte, SCHEMA };
}

// `pg` ne s'attache qu'ici. Ailleurs, un client est un objet qui sait
// `query(sql, params)` — ce qu'un faux sait faire aussi, et c'est ainsi que
// tout ce qui précède s'éprouve sans base.
function ouvrir(url) {
  const adresse = url || process.env.DATABASE_URL;
  if (!adresse) return null;
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: adresse,
    // Un hébergement infogéré impose TLS sans fournir sa chaîne de
    // certification : on la vérifie quand on la connaît, jamais en silence.
    ssl: /sslmode=require/.test(adresse) ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.OASIS_PG_POOL) || 10,
  });
  const magasin = creer(pool);
  magasin.fermer = () => pool.end();
  return magasin;
}

module.exports = { creer, ouvrir, SCHEMA };
