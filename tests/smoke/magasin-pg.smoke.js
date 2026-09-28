// Magasin PostgreSQL — contre un vrai serveur.
//
// Les six contrôles de contrat de la suite « unitaires » emploient une base de
// papier : une `Map` qui rend ce qu'on lui a écrit. Elle dit le contrat et le
// SQL produit, et **elle a menti deux fois** — parce qu'elle était plus fidèle
// que le vrai serveur.
//
//   · elle rendait les clés dans l'ordre écrit. `jsonb` les range par longueur
//     puis par octets. Le sceau d'une entrée d'audit couvrant
//     `JSON.stringify(details)`, les six chaînes des données réelles — 1 667
//     entrées du socle, 1 582 des modules — étaient **rompues** après un
//     aller-retour. La chaîne du socle ne cédait qu'à la 29ᵉ entrée : un petit
//     échantillon serait passé.
//
//   · elle n'avait pas de concurrence à perdre. Le vrai serveur, si : deux
//     agents qui lisent une collection, y ajoutent chacun une ligne et la
//     réécrivent en perdent une — **en base exactement comme sur fichier**.
//
// D'où cette suite. Elle ne remplace pas les contrôles de contrat ; elle couvre
// ce qu'une base de papier ne peut pas couvrir par construction.
//
// ── L'exécuter ──
//
//   docker run -d --name oasis-pg -e POSTGRES_PASSWORD=essai -p 5433:5432 postgres:16
//   OASIS_PG_ESSAI='postgres://postgres:essai@localhost:5433/postgres' npm run smoke -- magasin-pg
//
// La variable est **distincte de `DATABASE_URL`**, et c'est délibéré : cette
// suite écrit. On ne veut pas qu'un `DATABASE_URL` posé pour tout autre chose
// la dirige sur une base qui compte. Sans la variable, les contrôles qui
// demandent un serveur se déclarent hors de portée — les trois autres, qui
// lisent le schéma, s'exécutent toujours.
//
// Tout se passe dans un schéma à elle, `oasis_essai`, créé puis détruit. Rien
// de ce qui existe dans la base visée n'est lu ni touché.
const crypto = require('crypto');
const { verifier, horsPortee, bilan } = require('./harness');

const storePg = require('../../src/store_pg');

const SCHEMA_ESSAI = 'oasis_essai';

// ── 1. Ce que le schéma doit dire, et qu'on lit sans serveur ──

function schema() {
  const sql = storePg.SCHEMA.join('\n');

  // `jsonb` réordonne les clés. Tout ce qui est scellé par son texte doit être
  // rangé en `json`, qui conserve ce qu'on lui a donné.
  verifier('schéma : aucune colonne en jsonb — le sceau couvre l’ordre des clés',
    !/\bjsonb\b/i.test(sql), sql.match(/.*jsonb.*/i)?.[0]?.trim());

  // Un opérateur de `jsonb` dans une requête forcerait une conversion, et la
  // conversion réordonne. Aucun n'est nécessaire : on lit une collection par
  // son nom, jamais dans son contenu.
  const requetes = [
    'SELECT valeur FROM collections WHERE nom = $1',
    'SELECT valeur, rev FROM collections WHERE nom = $1',
    'SELECT entree FROM journal WHERE nom = $1 ORDER BY ordre',
  ].join('\n');
  verifier('schéma : aucun opérateur jsonb dans les requêtes',
    !/->>?|#>|@>|<@/.test(requetes + sql));

  // Le geste atomique fait partie du contrat, ou il ne sera pas employé.
  const magasin = storePg.creer({ query: async () => ({ rows: [] }) });
  verifier('contrat : le magasin expose « modifier », le geste lire-modifier-réécrire',
    typeof magasin.modifier === 'function');
}

// ── 2. Ce qui demande un vrai serveur ──

async function ouvrirEssai(url) {
  // eslint-disable-next-line global-require
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, max: 12 });
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA_ESSAI}`);
  await pool.end();
  // Toutes les connexions du bac visent le schéma d'essai, et lui seul.
  const bac = new Pool({
    connectionString: url,
    max: 12,
    options: `-c search_path=${SCHEMA_ESSAI}`,
  });
  return bac;
}

// La chaîne des modules : six champs scellés, dont `JSON.stringify(details)`.
const GENESE = 'OASIS-MODULE-GENESIS';
const sceau = (prev, e) => crypto.createHash('sha256')
  .update([prev, e.ts, e.user, e.action, e.objet, e.ref, JSON.stringify(e.details || {})].join('|'))
  .digest('hex');

function chaine(n) {
  const entrees = [];
  let prev = GENESE;
  for (let i = 0; i < n; i++) {
    // Des clés que `jsonb` réordonnerait : la plus longue est écrite en
    // premier, et il range par longueur croissante.
    const e = {
      ts: `2026-09-28T10:0${i}:00.000Z`,
      user: 'inspecteur@anac.bj',
      action: 'CREATION',
      objet: 'inspection',
      ref: `INS-${i}`,
      details: { observations: 'aile gauche', immatriculation: 'TT-ABC', n: i },
      prevHash: prev,
    };
    e.hash = sceau(prev, e);
    prev = e.hash;
    entrees.push(e);
  }
  return entrees;
}

const intacte = (entrees) => {
  let prev = GENESE;
  for (const e of entrees) {
    if (e.prevHash !== prev || sceau(prev, e) !== e.hash) return false;
    prev = e.hash;
  }
  return entrees.length > 0;
};

async function contreUnVraiServeur(url) {
  const bac = await ouvrirEssai(url);
  try {
    const m = storePg.creer(bac);
    await m.preparer();

    // ── L'ordre des clés survit à l'aller-retour ──
    const valeur = {
      observations: 'texte long en premier',
      immatriculation: 'TT-ABC',
      n: 1,
      a: { zzzz: 1, b: 2 },
    };
    await m.save('ordre', valeur);
    verifier('aller-retour : une collection revient octet pour octet',
      JSON.stringify(await m.load('ordre', null)) === JSON.stringify(valeur),
      JSON.stringify(await m.load('ordre', null)));

    // ── La chaîne d'audit se vérifie encore après la base ──
    const entrees = chaine(40);
    verifier('chaîne : intacte avant d’entrer en base', intacte(entrees));
    for (const e of entrees) await m.ajouter('audit_essai', e);
    verifier('chaîne : intacte après un aller-retour en base',
      intacte(await m.lire('audit_essai')));

    // ── Contre-épreuve : en `jsonb`, la même chaîne se rompt ──
    // Sans elle, le contrôle précédent ne prouverait rien : il passerait aussi
    // sur un serveur qui n'aurait jamais eu l'occasion de réordonner quoi que
    // ce soit.
    await bac.query('CREATE TABLE IF NOT EXISTS essai_jsonb (ordre BIGSERIAL PRIMARY KEY, entree JSONB NOT NULL)');
    for (const e of entrees) await bac.query('INSERT INTO essai_jsonb (entree) VALUES ($1)', [JSON.stringify(e)]);
    const enJsonb = (await bac.query('SELECT entree FROM essai_jsonb ORDER BY ordre')).rows.map((r) => r.entree);
    verifier('contre-épreuve : la même chaîne rangée en jsonb est rompue',
      enJsonb.length === entrees.length && !intacte(enJsonb));

    // ── Le défaut que `modifier` existe pour fermer ──
    // Ce contrôle constate un défaut, et c'est voulu : sans lui, le suivant
    // pourrait passer sur une base où rien ne se serait jamais croisé.
    await m.save('naif', { items: [] });
    const naif = async (qui) => {
      const v = await m.load('naif', { items: [] });
      await new Promise((r) => setTimeout(r, 30));
      v.items.push({ par: qui });
      await m.save('naif', v);
    };
    await Promise.all([naif('A'), naif('B')]);
    const perdus = (await m.load('naif', null)).items.length;
    verifier('constat : lire-modifier-réécrire par save perd une écriture concurrente',
      perdus === 1, `${perdus} entrée(s) au lieu de 2 — si ce contrôle échoue, le suivant ne prouve plus rien`);

    // ── `modifier` n'en perd aucune ──
    const agents = 50;
    await Promise.all(Array.from({ length: agents }, (_, i) => m.modifier(
      'atomique', { items: [] }, (v) => ({ items: [...v.items, i] }),
    )));
    const gardes = (await m.load('atomique', null)).items;
    verifier(`modifier : ${agents} écritures concurrentes, aucune perdue`,
      gardes.length === agents && new Set(gardes).size === agents,
      `${gardes.length} entrée(s)`);

    // Un `save` glissé entre la lecture et l'écriture d'un `modifier` doit être
    // vu : sinon il serait écrasé sans bruit, ce qu'on cherche à empêcher.
    let intercale = false;
    const apres = await m.modifier('intercale', { n: 0 }, async (v) => {
      if (!intercale) { intercale = true; await m.save('intercale', { n: 99 }); }
      return { n: v.n + 1 };
    });
    verifier('modifier : un save intercalé est vu, non écrasé', apres.n === 100,
      JSON.stringify(apres));

    // Et quand la reprise n'aboutit pas, elle le dit plutôt que d'écraser.
    await m.save('sanscesse', { n: 0 });
    let refus = '';
    try {
      await m.modifier('sanscesse', { n: 0 }, async () => {
        await m.save('sanscesse', { n: Math.random() });
        return { n: 1 };
      }, { essais: 3 });
    } catch (e) { refus = e.message; }
    verifier('modifier : un conflit sans fin est refusé, jamais écrasé',
      /modifiée sous nos pieds/.test(refus), refus || 'aucune erreur levée');

    // ── Le journal est en ajout seul : rien à perdre ──
    await Promise.all(Array.from({ length: 4 }, (_, k) => (async () => {
      for (let i = 0; i < 25; i++) await m.ajouter('journal_conc', { k, i });
    })()));
    verifier('journal : 100 ajouts concurrents, 100 entrées',
      (await m.compte('journal_conc')) === 100);
  } finally {
    // Le schéma d'essai disparaît avec tout ce qu'il portait. Rien d'autre
    // n'est touché dans la base visée.
    await bac.query(`DROP SCHEMA IF EXISTS ${SCHEMA_ESSAI} CASCADE`);
    await bac.end();
  }
}

module.exports = async function magasinPgSmoke() {
  console.log('\n── Magasin PostgreSQL : contre un vrai serveur ──');
  schema();

  const url = process.env.OASIS_PG_ESSAI;
  if (!url) {
    horsPortee('magasin PostgreSQL : les 8 contrôles contre un vrai serveur',
      'poser OASIS_PG_ESSAI — voir l’en-tête du fichier');
    return bilan('Magasin PostgreSQL');
  }
  await contreUnVraiServeur(url);
  return bilan('Magasin PostgreSQL');
};
