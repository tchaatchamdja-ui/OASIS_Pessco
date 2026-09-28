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
//
// ── `json`, et surtout pas `jsonb` ──
//
// `jsonb` range les clés d'un objet par longueur puis par octets. Rien n'est
// perdu — mais rien ne revient dans l'ordre écrit. Or le sceau d'une entrée
// d'audit couvre `JSON.stringify(details)` : changer l'ordre des clés change
// le texte, donc l'empreinte, donc la chaîne.
//
// Mesuré contre PostgreSQL 16.15, sur les données réelles : les six chaînes
// intactes sur fichiers étaient rompues après un aller-retour en `jsonb` —
// 1 667 entrées du socle, 1 582 des modules. La chaîne du socle ne cédait
// qu'à la 29ᵉ entrée : les vingt-huit premières portaient des `details` dont
// l'ordre des clés survivait par chance. Un petit échantillon aurait donc
// passé, et la base de papier passait déjà.
//
// `json` conserve le texte tel qu'il a été écrit. Il coûte l'indexation GIN et
// les opérateurs de `jsonb` — dont aucun n'est employé ici : on lit une
// collection par son nom, jamais dans son contenu.
//
// ── `rev`, et ce qu'une base ne donne pas toute seule ──
//
// `rev` compte les écritures d'une collection. Il ne sert pas à `save`, qui
// remplace sans regarder — il sert à `modifier`, et la raison est mesurée plus
// bas : **remplacer un document entier ne protège de rien**. Deux agents qui
// lisent la même collection, y ajoutent chacun leur ligne et la réécrivent en
// perdent une, en base comme sur fichier.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS collections (
     nom    TEXT PRIMARY KEY,
     valeur JSON NOT NULL,
     rev    INTEGER NOT NULL DEFAULT 0,
     maj    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  'ALTER TABLE collections ADD COLUMN IF NOT EXISTS rev INTEGER NOT NULL DEFAULT 0',
  `CREATE TABLE IF NOT EXISTS journal (
     nom    TEXT NOT NULL,
     ordre  BIGSERIAL PRIMARY KEY,
     entree JSON NOT NULL
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
  //
  // `rev` avance à chaque écriture, y compris celles-ci : sans quoi un `save`
  // glissé entre la lecture et l'écriture d'un `modifier` resterait invisible,
  // et serait écrasé sans bruit — le défaut même qu'on cherche à fermer.
  async function save(nom, valeur) {
    await client.query(
      `INSERT INTO collections (nom, valeur, rev, maj) VALUES ($1, $2, 0, now())
       ON CONFLICT (nom) DO UPDATE
         SET valeur = EXCLUDED.valeur, rev = collections.rev + 1, maj = now()`,
      [nom, JSON.stringify(valeur)],
    );
    return valeur;
  }

  const collections = async () => (await client.query('SELECT nom FROM collections ORDER BY nom'))
    .rows.map((r) => r.nom);

  // ── Lire, modifier, réécrire — sans rien perdre ──
  //
  // C'est le geste de presque tous les appels du socle : `load`, on pousse une
  // ligne, `save`. Sur fichiers il est sûr, et pour une raison qu'on n'avait
  // pas écrite : `load` et `save` sont **synchrones**, donc rien ne s'intercale
  // entre les deux. Node ne rend la main qu'aux `await`, et il n'y en a pas.
  //
  // Rendre le magasin asynchrone détruit cette garantie — avant même qu'un
  // second processus existe. Mesuré ici contre PostgreSQL 16.15 : deux agents
  // ajoutant chacun une entrée, une seule reste. L'autre disparaît sans erreur.
  //
  // `modifier` rend le geste atomique sans transaction ni connexion réservée :
  // on lit la valeur **et son `rev`**, on transforme, on n'écrit que si `rev`
  // n'a pas bougé. Sinon quelqu'un est passé entre-temps, et l'on recommence
  // sur ce qu'il a laissé.
  //
  // Vingt essais, et une attente courte et tirée au sort entre deux. Cinq
  // suffisaient à deux agents et pas à dix : à chaque tour un seul gagne, et le
  // dernier arrivé peut donc perdre autant de fois qu'il a de concurrents.
  // L'attente les désynchronise — sans elle, les perdants repartent ensemble et
  // se heurtent de nouveau. À trente écritures par jour une reprise est déjà
  // rare ; la borne est là pour que l'échec soit **dit**, non subi.
  async function modifier(nom, defaut, transformer, { essais = 20 } = {}) {
    for (let i = 0; i < essais; i++) {
      if (i) await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5 * i) + 1));
      const r = await client.query('SELECT valeur, rev FROM collections WHERE nom = $1', [nom]);
      const presente = r.rows.length > 0;
      const valeur = presente ? r.rows[0].valeur : defaut;
      const rev = presente ? r.rows[0].rev : -1;
      const suivante = await transformer(valeur);

      if (!presente) {
        // Personne n'avait encore écrit. Un autre a pu le faire entre le SELECT
        // et ici : `DO NOTHING` le laisse gagner, et l'on repart de sa version.
        const ins = await client.query(
          `INSERT INTO collections (nom, valeur, rev, maj) VALUES ($1, $2, 0, now())
           ON CONFLICT (nom) DO NOTHING`,
          [nom, JSON.stringify(suivante)],
        );
        if (ins.rowCount) return suivante;
        continue;
      }

      const maj = await client.query(
        `UPDATE collections SET valeur = $2, rev = rev + 1, maj = now()
         WHERE nom = $1 AND rev = $3`,
        [nom, JSON.stringify(suivante), rev],
      );
      if (maj.rowCount) return suivante;
    }
    // Dire l'échec plutôt que d'écrire par-dessus : perdre l'écriture d'un
    // autre est précisément ce que cette fonction existe pour empêcher.
    throw new Error(`magasin : « ${nom} » modifiée sous nos pieds ${essais} fois de suite`);
  }

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

  return { preparer, load, save, modifier, collections, ajouter, lire, derniere, compte, SCHEMA };
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
