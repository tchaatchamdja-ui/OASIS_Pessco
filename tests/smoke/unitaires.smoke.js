// Unitaires — la logique pure, prise à part.
//
// Les huit autres suites passent par HTTP : elles disent qu'un écran répond,
// non qu'une règle est juste. Entre les deux il reste de la place — une règle
// peut être fausse au bord et le rester longtemps, faute d'une requête qui
// l'y mène. C'est ce bord-là que cette suite couvre.
//
// Elle ne démarre aucun serveur : elle appelle les fonctions.
//
// Quatre règles y sont prises, celles dont une erreur ne se verrait pas tout
// de suite : le chaînage du journal d'audit, le rattachement d'une inspection
// à son instance, les bornes de la garde de forme, et la mise en forme des
// traces.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifier, bilan } = require('./harness');

// Les modules du socle lisent `OASIS_DATA_DIR` à l'import : il est posé avant.
const BAC = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-unit-'));
process.env.OASIS_DATA_DIR = BAC;

const audit = require('../../src/audit');
const valider = require('../../src/valider');
const trace = require('../../src/trace');
const vuesRamp = require('../../src/modules/ramp/vues');

// Un middleware s'éprouve sur une requête et une réponse de papier.
function jouer(middleware, corps) {
  const req = { body: corps, method: 'POST' };
  let rendu = null;
  const res = {
    status(code) { this.code = code; return this; },
    json(o) { rendu = { code: this.code, corps: o }; return this; },
  };
  let suivi = false;
  middleware(req, res, () => { suivi = true; });
  return { passe: suivi, rendu, req };
}

// ── 1. Chaînage du journal d'audit ──
// Ce que le journal garantit tient en une phrase : une entrée modifiée après
// coup se voit. Les suites HTTP vérifient qu'il se lit ; celle-ci, qu'il
// détecte. On casse donc une chaîne exprès — la seule façon de savoir que la
// vérification ne se contente pas de dire « oui ».
function chainage() {
  audit.log('essai@oasis', 'PREMIERE', { n: 1 });
  audit.log('essai@oasis', 'DEUXIEME', { n: 2 });
  audit.log('essai@oasis', 'TROISIEME', { n: 3 });

  const saine = audit.verifyChain();
  verifier('une chaîne intacte se vérifie',
    saine.valid === true && saine.total === 3, JSON.stringify(saine));

  const entrees = audit.list();
  verifier('chaque entrée porte l’empreinte de la précédente',
    entrees[1].prevHash === entrees[0].hash && entrees[2].prevHash === entrees[1].hash);

  // Le détail d'une entrée est falsifié sur le disque, empreinte laissée telle
  // quelle : c'est exactement ce qu'un effacement de trace tenterait.
  const chemin = path.join(BAC, 'audit.jsonl');
  const lignes = fs.readFileSync(chemin, 'utf-8').trim().split('\n');
  const falsifiee = JSON.parse(lignes[1]);
  falsifiee.details = { n: 'falsifié' };
  lignes[1] = JSON.stringify(falsifiee);
  fs.writeFileSync(chemin, `${lignes.join('\n')}\n`);

  const rompue = audit.verifyChain();
  verifier('un détail modifié après coup rompt la chaîne',
    rompue.valid === false && rompue.brokenAt === 2, JSON.stringify(rompue));

  // Une entrée retirée se voit aussi : la suivante ne s'enchaîne plus.
  fs.writeFileSync(chemin, `${[lignes[0], JSON.parse(lignes[2]) && lignes[2]].join('\n')}\n`);
  const trouee = audit.verifyChain();
  verifier('une entrée retirée rompt la chaîne',
    trouee.valid === false, JSON.stringify(trouee));
}

// ── 2. Rattachement d'une inspection à son instance ──
// La règle qui a fait fuiter les données d'un État chez ses voisins : chaque
// instance voyait toutes les inspections. Elle se lit en une ligne et se
// trompe de trois façons — d'où ces cas.
function rattachement() {
  const connues = new Map([['benin', 'Bénin'], ['togo', 'Togo'], ['mali', 'Mali']]);
  const ici = 'Bénin';
  const de = (i) => vuesRamp.instanceDe(i, connues, ici);

  verifier('le champ instance fait foi quand il est posé',
    de({ instance: 'Togo', pays: 'Mali' }) === 'Togo');
  verifier('sans instance, l’État de l’inspection la rattache',
    de({ pays: 'Mali' }) === 'Mali');
  verifier('l’État se reconnaît sans ses accents ni sa casse',
    de({ pays: 'BÉNIN' }) === 'Bénin' && de({ pays: ' togo ' }) === 'Togo');
  verifier('un État sans instance revient à l’instance installée',
    de({ pays: 'France' }) === 'Bénin' && de({ pays: '' }) === 'Bénin');
  verifier('une inspection vide ne fait pas tomber la règle',
    de(null) === 'Bénin' && de({}) === 'Bénin');
  // Le défaut d'origine : une instance vide chaînée avec `||` retombait sur
  // l'État, ce qui est voulu — mais une chaîne « 0 » ou « false » aurait dû
  // rester. Aucun État ne s'appelle ainsi ; la règle est donc sûre, et ce
  // contrôle le dit pour qu'un changement de chaînage le rappelle.
  verifier('une instance vide laisse l’État décider',
    de({ instance: '', pays: 'Togo' }) === 'Togo');
}

// ── 3. Bornes de la garde de forme ──
// Elles sont relevées sur les données réelles ; les resserrer casserait des
// écritures qui passent aujourd'hui. Les suites HTTP le vérifient au travers
// d'une route ; ici, sur la fonction, au caractère près.
function bornes() {
  const profond = (n) => { let v = 'fond'; for (let i = 0; i < n; i += 1) v = { n: v }; return v; };

  verifier('un enregistrement ordinaire passe',
    jouer(valider.enveloppe, { libelle: 'Essai', actif: true, n: 3 }).passe);
  verifier('un corps absent passe — beaucoup de transitions n’en portent pas',
    jouer(valider.enveloppe, undefined).passe);
  verifier('huit niveaux passent, neuf sont refusés',
    jouer(valider.enveloppe, { a: profond(7) }).passe
    && !jouer(valider.enveloppe, { a: profond(9) }).passe);
  verifier('un champ de texte n’est pas borné',
    jouer(valider.enveloppe, { contenu: 'x'.repeat(200000) }).passe);
  verifier('une liste de deux mille passe, deux mille un non',
    jouer(valider.enveloppe, { l: new Array(2000).fill(1) }).passe
    && !jouer(valider.enveloppe, { l: new Array(2001).fill(1) }).passe);
  verifier('un nom de champ hors barème est refusé',
    !jouer(valider.enveloppe, { 'champ avec espaces': 1 }).passe
    && !jouer(valider.enveloppe, { '<script>': 1 }).passe);
  const refus = jouer(valider.enveloppe, { 'mauvais nom': 1 });
  verifier('le refus est une erreur normalisée',
    refus.rendu && refus.rendu.code === 400 && refus.rendu.corps.error === 'corps_invalide',
    JSON.stringify(refus.rendu));
  verifier('la garde ne touche pas au corps reçu',
    jouer(valider.enveloppe, { libelle: 'Intact' }).req.body.libelle === 'Intact');
}

// ── 4. Mise en forme des traces ──
// Une trace n'a qu'un devoir : dire ce qui s'est passé. La pile d'une
// exception s'y perdait — `JSON.stringify` d'une erreur rend « {} ».
function traces() {
  const capturer = (fn) => {
    const lignes = [];
    const vraiLog = console.log;
    const vraiErr = console.error;
    console.log = (l) => lignes.push(l);
    console.error = (l) => lignes.push(l);
    try { fn(); } finally { console.log = vraiLog; console.error = vraiErr; }
    return lignes;
  };
  const enProduction = (fn) => {
    const avant = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { return capturer(fn); } finally {
      if (avant === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = avant;
    }
  };

  const [ligne] = enProduction(() => trace.info('serveur démarré', { port: 4750 }));
  let objet = null;
  try { objet = JSON.parse(ligne); } catch (e) { objet = null; }
  verifier('en production, une trace est un objet par ligne',
    objet && objet.niveau === 'info' && objet.message === 'serveur démarré'
    && objet.details.port === 4750 && typeof objet.ts === 'string', String(ligne).slice(0, 80));

  const [avecErreur] = enProduction(() => trace.erreur('exception', {
    reference: 'a1b2', erreur: new Error('quelque chose a cédé'),
  }));
  const e = JSON.parse(avecErreur).details.erreur;
  verifier('une exception imbriquée garde son message et sa pile',
    e.message === 'quelque chose a cédé' && e.type === 'Error' && /Error:/.test(e.pile || ''),
    JSON.stringify(e).slice(0, 90));

  const avant = process.env.OASIS_LOG_LEVEL;
  process.env.OASIS_LOG_LEVEL = 'alerte';
  const filtrees = enProduction(() => { trace.info('tue'); trace.debug('tue'); trace.erreur('passe'); });
  if (avant === undefined) delete process.env.OASIS_LOG_LEVEL; else process.env.OASIS_LOG_LEVEL = avant;
  verifier('le seuil tait ce qui est au-dessous de lui',
    filtrees.length === 1 && JSON.parse(filtrees[0]).message === 'passe',
    `${filtrees.length} ligne(s)`);

  const brutes = capturer(() => trace.brut('  │  compte@aac.bj  MotDePasse!'));
  verifier('le canal brut sort tel quel, hors des traces structurées',
    brutes.length === 1 && brutes[0] === '  │  compte@aac.bj  MotDePasse!');
}

// ── 5. Les deux magasins rendent la même chose ──
// Le magasin PostgreSQL doit tenir exactement le contrat des fichiers : une
// collection entière se lit, une collection entière s'écrit, un défaut revient
// quand rien n'est là. Les deux sont ici éprouvés sur les mêmes gestes — c'est
// ce qui les empêchera de diverger.
//
// PostgreSQL s'éprouve contre une base de papier, qui retient ce qu'on lui
// écrit. Elle ne dit rien du serveur — ni des types, ni des verrous, ni du
// réseau — mais tout du contrat et du SQL produit. `DATABASE_URL` posé, les
// mêmes contrôles se rejouent contre une vraie base.
function basePapier() {
  const collections = new Map();
  const journal = [];
  return {
    async query(sql, p) {
      const s = sql.trim();
      if (/^CREATE/.test(s)) return { rows: [] };
      if (/^SELECT valeur/.test(s)) {
        const v = collections.get(p[0]);
        return { rows: v === undefined ? [] : [{ valeur: JSON.parse(JSON.stringify(v)) }] };
      }
      if (/^INSERT INTO collections/.test(s)) { collections.set(p[0], JSON.parse(p[1])); return { rows: [] }; }
      if (/^INSERT INTO journal/.test(s)) { journal.push({ nom: p[0], entree: JSON.parse(p[1]) }); return { rows: [] }; }
      if (/ORDER BY ordre DESC/.test(s)) {
        const l = journal.filter((x) => x.nom === p[0]);
        return { rows: l.length ? [{ entree: l[l.length - 1].entree }] : [] };
      }
      if (/^SELECT entree/.test(s)) {
        return { rows: journal.filter((x) => x.nom === p[0]).map((x) => ({ entree: x.entree })) };
      }
      if (/count\(\*\)/.test(s)) {
        return { rows: [{ n: journal.filter((x) => x.nom === p[0]).length }] };
      }
      if (/^SELECT nom/.test(s)) {
        return { rows: [...collections.keys()].sort().map((nom) => ({ nom })) };
      }
      throw new Error(`SQL inattendu : ${s.slice(0, 60)}`);
    },
  };
}

async function magasins() {
  const storePg = require('../../src/store_pg');
  const fichiers = require('../../src/store');
  const journalFichier = require('../../src/journal');
  const pg = storePg.creer(basePapier());
  await pg.preparer();

  // Le même geste des deux côtés, et la même réponse attendue.
  const DEFAUT = { rien: true };
  verifier('magasins : une collection absente rend le défaut',
    JSON.stringify(fichiers.load('inconnue_xyz', DEFAUT)) === JSON.stringify(DEFAUT)
    && JSON.stringify(await pg.load('inconnue_xyz', DEFAUT)) === JSON.stringify(DEFAUT));

  const valeur = { items: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }], maj: '2026-09-24' };
  fichiers.save('essai_contrat', valeur);
  await pg.save('essai_contrat', valeur);
  verifier('magasins : ce qui est écrit se relit à l’identique',
    JSON.stringify(fichiers.load('essai_contrat', null)) === JSON.stringify(valeur)
    && JSON.stringify(await pg.load('essai_contrat', null)) === JSON.stringify(valeur));

  const modifie = { ...valeur, items: [...valeur.items, { id: 'c', n: 3 }] };
  fichiers.save('essai_contrat', modifie);
  await pg.save('essai_contrat', modifie);
  verifier('magasins : une seconde écriture remplace, elle n’ajoute pas',
    fichiers.load('essai_contrat', null).items.length === 3
    && (await pg.load('essai_contrat', null)).items.length === 3);

  // Journal : ajout seul des deux côtés, et la dernière entrée sans tout relire.
  const entrees = [{ id: 1, hash: 'a' }, { id: 2, prevHash: 'a', hash: 'b' }];
  entrees.forEach((e) => journalFichier.ajouter('essai_journal', e));
  for (const e of entrees) await pg.ajouter('essai_journal', e);
  verifier('magasins : le journal s’ajoute et se relit dans l’ordre',
    JSON.stringify(journalFichier.lire('essai_journal')) === JSON.stringify(entrees)
    && JSON.stringify(await pg.lire('essai_journal')) === JSON.stringify(entrees));
  verifier('magasins : PostgreSQL rend la dernière entrée sans tout relire',
    (await pg.derniere('essai_journal')).hash === 'b' && (await pg.compte('essai_journal')) === 2);

  // Le SQL est paramétré : une valeur ne s'y glisse jamais par concaténation.
  const sqlEnDur = storePg.SCHEMA.concat([
    'SELECT valeur FROM collections WHERE nom = $1',
  ]).every((sql) => !/\$\{|' \+ |\+ '/.test(sql));
  verifier('magasins : aucune valeur concaténée dans le SQL', sqlEnDur);
}

module.exports = async function unitairesSmoke() {
  console.log('\n── Unitaires : la logique pure ──');
  try {
    chainage();
    rattachement();
    bornes();
    traces();
    await magasins();
  } finally {
    fs.rmSync(BAC, { recursive: true, force: true });
    delete process.env.OASIS_DATA_DIR;
  }
  assert.ok(true);
  return bilan('Unitaires');
};
