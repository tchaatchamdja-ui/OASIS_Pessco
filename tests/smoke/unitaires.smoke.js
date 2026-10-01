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
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifier, horsPortee, bilan } = require('./harness');
const magasinDuJournal = require('../../src/magasin');

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
async function chainage() {
  // Le journal ne part pas forcément vide : posé en base, il garde ce que les
  // exécutions précédentes y ont inscrit. Les contrôles portent donc sur ce que
  // **ces trois** inscriptions ajoutent, non sur un total absolu.
  const avant = (await audit.list()).length;
  await audit.log('essai@oasis', 'PREMIERE', { n: 1 });
  await audit.log('essai@oasis', 'DEUXIEME', { n: 2 });
  await audit.log('essai@oasis', 'TROISIEME', { n: 3 });

  const saine = await audit.verifyChain();
  verifier('une chaîne intacte se vérifie',
    saine.valid === true && saine.total === avant + 3, JSON.stringify(saine));

  const entrees = (await audit.list()).slice(avant);
  verifier('chaque entrée porte l’empreinte de la précédente',
    entrees[1].prevHash === entrees[0].hash && entrees[2].prevHash === entrees[1].hash);

  // ── La falsification, et pourquoi elle ne s'éprouve qu'ici ──
  //
  // Ce qui suit modifie le journal **sur le disque** : c'est le geste même d'un
  // effacement de trace, et c'est le seul moyen de vérifier que la chaîne le
  // dit. Posé en base, le journal n'est pas ce fichier — le contrôle n'aurait
  // plus d'objet, et le taire le ferait passer pour réussi.
  if (magasinDuJournal.journalSurBase('audit')) {
    horsPortee('une falsification du journal rompt la chaîne',
      'le journal est en base — ce contrôle falsifie le fichier');
    return;
  }
  const chemin = path.join(BAC, 'audit.jsonl');
  const lignes = fs.readFileSync(chemin, 'utf-8').trim().split('\n');
  const falsifiee = JSON.parse(lignes[1]);
  falsifiee.details = { n: 'falsifié' };
  lignes[1] = JSON.stringify(falsifiee);
  fs.writeFileSync(chemin, `${lignes.join('\n')}\n`);

  const rompue = await audit.verifyChain();
  verifier('un détail modifié après coup rompt la chaîne',
    rompue.valid === false && rompue.brokenAt === 2, JSON.stringify(rompue));

  // Une entrée retirée se voit aussi : la suivante ne s'enchaîne plus.
  fs.writeFileSync(chemin, `${[lignes[0], JSON.parse(lignes[2]) && lignes[2]].join('\n')}\n`);
  const trouee = await audit.verifyChain();
  verifier('une entrée retirée rompt la chaîne',
    trouee.valid === false, JSON.stringify(trouee));
}

// ── 1 ter. Toute entrée de journal chaîné porte son numéro ──
// La garantie qui empêche une chaîne de forcher en base est un index unique sur
// `(nom, cle, rang)`, **partiel sur `rang > 0`** — sans quoi deux ajouts non
// chaînés se refuseraient l'un l'autre. Le revers : une entrée de journal
// chaîné qui arriverait sans numéro y échapperait.
//
// Relevé sur les journaux réels de `data/` : 1 623 entrées du socle et 1 582 des
// modules, **aucune sans numéro, aucun numéro en double dans sa chaîne**. Ce
// contrôle le tient pour les entrées à venir.
async function numerosDeChaine() {
  const marque = `NUMEROS_${Math.random().toString(36).slice(2, 8)}`;
  for (let i = 0; i < 3; i++) await audit.log('essai', marque, { i });
  const entrees = (await audit.list()).filter((e) => e.action === marque);
  verifier('journal : toute entrée inscrite porte un numéro strictement positif',
    entrees.length === 3 && entrees.every((e) => Number(e.id) > 0),
    JSON.stringify(entrees.map((e) => e.id)));
  verifier('journal : les numéros se suivent dans la chaîne',
    entrees.every((e, i) => i === 0 || Number(e.id) === Number(entrees[i - 1].id) + 1),
    JSON.stringify(entrees.map((e) => e.id)));
}

// ── 1 bis. Vingt inscriptions lancées ensemble ──
// C'est la garantie que l'asynchrone a détruite, puis qu'il a fallu rétablir
// explicitement. `log` lit la dernière entrée, en dérive une empreinte, puis
// ajoute : deux inscriptions concurrentes poseraient deux entrées prétendant le
// même prédécesseur. **Une chaîne forchée ne se répare pas** — une entrée
// inscrite ne se réécrit jamais, c'est toute sa valeur.
//
// Le geste était sûr tant que `log` n'avait aucun `await`. Il l'est de nouveau
// par `magasin.journalChainer` : file d'attente sur fichiers, contrainte
// d'unicité `(nom, cle, rang)` en base.
async function chainageConcurrent() {
  const marque = `CONCURRENT_${Math.random().toString(36).slice(2, 8)}`;
  await Promise.all(Array.from({ length: 20 }, (_, i) => audit.log(`agent${i}`, marque, { i })));
  const etat = await audit.verifyChain();
  verifier('vingt inscriptions concurrentes : la chaîne reste intacte',
    etat.valid === true, JSON.stringify(etat));
  const numeros = (await audit.list()).filter((e) => e.action === marque).map((e) => e.id);
  verifier('vingt inscriptions concurrentes : vingt numéros distincts',
    numeros.length === 20 && new Set(numeros).size === 20,
    `${numeros.length} entrée(s), ${new Set(numeros).size} numéro(s)`);
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
// PostgreSQL s'éprouve ici contre une base de papier, qui retient ce qu'on lui
// écrit. Elle dit le contrat et le SQL produit — et **rien du serveur**.
//
// Ce n'est pas une nuance : elle a menti deux fois. Elle rendait les clés dans
// l'ordre écrit, quand `jsonb` les réordonne et rompt ainsi les chaînes
// d'audit ; et elle n'avait aucune concurrence à perdre, quand deux agents
// écrivant ensemble en perdent une. Les deux défauts ont passé ces contrôles
// au vert pendant tout ce temps.
//
// Ce qu'une base de papier ne peut pas dire est éprouvé ailleurs, contre un
// vrai serveur : `tests/smoke/magasin-pg.smoke.js`.
function basePapier() {
  const collections = new Map();
  const journal = [];
  return {
    async query(sql, p) {
      const s = sql.trim();
      if (/^(CREATE|ALTER)/.test(s)) return { rows: [] };
      if (/^SELECT valeur/.test(s)) {
        const v = collections.get(p[0]);
        return { rows: v === undefined ? [] : [{ valeur: JSON.parse(JSON.stringify(v)) }] };
      }
      if (/^INSERT INTO collections/.test(s)) { collections.set(p[0], JSON.parse(p[1])); return { rows: [] }; }
      if (/^INSERT INTO journal/.test(s)) {
        // Mêmes colonnes que le vrai schéma — `(nom, cle, rang, entree)` — et
        // **la même contrainte** : `(nom, cle, rang)` est unique. Une base de
        // papier qui accepterait deux entrées au même rang laisserait passer
        // une chaîne forchée, et ce faux serait de nouveau plus permissif que
        // le serveur. C'est déjà arrivé quatre fois sur ce chantier.
        const [nom, cle, rang, brut] = p;
        if (journal.some((x) => x.nom === nom && x.cle === cle && x.rang === rang && rang > 0)) {
          const e = new Error(`duplicate key value violates unique constraint "journal_rang"`);
          e.code = '23505';
          throw e;
        }
        journal.push({ nom, cle, rang, entree: JSON.parse(brut) });
        return { rows: [] };
      }
      if (/ORDER BY ordre DESC/.test(s)) {
        const l = journal.filter((x) => x.nom === p[0]);
        return { rows: l.length ? [{ entree: l[l.length - 1].entree }] : [] };
      }
      if (/^SELECT entree/.test(s)) {
        // Avec `cle`, c'est une seule chaîne qui est demandée ; sans, tout le journal.
        const dans = journal.filter((x) => x.nom === p[0]
          && (p.length < 2 || x.cle === p[1]));
        return { rows: dans.map((x) => ({ entree: x.entree })) };
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

// ── 4 bis. Le compteur d'essais du second facteur ──
//
// C'est le geste le plus sensible de la bascule : `verifyChallenge` lit le défi,
// incrémente son compteur d'essais, réécrit. Rendu asynchrone sans précaution,
// **dix codes faux lancés ensemble liraient tous `attempts: 0` et n'en
// écriraient qu'un** — le plafond de cinq essais tomberait, et une force brute
// disposerait d'autant d'essais qu'elle saurait en lancer en parallèle.
//
// L'épreuve se fait **en processus**, et non par HTTP : deux requêtes ne se
// chevauchent côté serveur que si chaque traitement dure assez longtemps, et
// celui-ci dure une milliseconde. La suite « mfa » couvre le parcours ; celle-ci
// couvre le croisement.
async function compteurDuSecondFacteur() {
  const mfa = require('../../src/mfa');
  const compte = { username: 'essai@aac.bj', fullName: 'Essai', email: 'essai@aac.bj' };

  const defi = await mfa.createChallenge(compte, 'email');
  verifier('second facteur : un défi est posé et ne rend pas le code',
    defi.ok === true && !!defi.challengeId && !('code' in defi), JSON.stringify(defi).slice(0, 120));

  // Dix codes faux lancés ensemble, sans passer par le réseau.
  const essais = await Promise.all(Array.from({ length: 10 },
    () => mfa.verifyChallenge(defi.challengeId, '000000')));
  const restes = essais.map((r) => r.remaining).filter((v) => v !== undefined);

  // Cinq essais sont décomptés, un à un, puis le défi est consommé. Si le
  // compteur avait été lu hors de la transformation, les dix auraient annoncé le
  // même reste — et le plafond n'aurait jamais été atteint.
  verifier('second facteur : dix essais concurrents sont décomptés un à un',
    JSON.stringify([...restes].sort((a, b) => b - a)) === JSON.stringify([4, 3, 2, 1, 0]),
    `restes annoncés : ${JSON.stringify(restes)}`);
  verifier('second facteur : au-delà du plafond, le défi est refusé',
    essais.filter((r) => r.error === 'mfa_too_many_attempts' || r.error === 'mfa_expired').length === 5,
    JSON.stringify(essais.map((r) => r.error)));
  verifier('second facteur : aucun essai faux n’aboutit',
    essais.every((r) => r.ok !== true));
}

// ── 4 ter. L'annuaire des comptes : instantané et écritures atomiques ──
//
// C'est la seule collection dont les lectures sont restées synchrones, et ce
// choix se paie par deux invariants qu'il faut tenir :
//
//   · l'instantané ne vaut que s'il est rafraîchi — sans quoi une route servirait
//     l'annuaire du démarrage, et un compte créé depuis ne pourrait se connecter ;
//   · les écritures doivent être atomiques **par champ**, parce que deux
//     gestionnaires touchent le même enregistrement pour des raisons différentes :
//     une connexion incrémente le décompte de tentatives pendant qu'un
//     administrateur change un nom. Réécrire l'enregistrement entier ferait
//     perdre l'un des deux — et si c'est le décompte, le compte cesse de se
//     bloquer.
async function annuaireDesComptes() {
  const annuaire = require('../../src/annuaire');
  const auth = require('../../src/auth');

  await annuaire.remplacer([
    { username: 'a@x.bj', nom: 'A', failedAttempts: 0 },
    { username: 'b@x.bj', nom: 'B', failedAttempts: 0 },
  ]);
  verifier('annuaire : la lecture est synchrone et rend ce qui a été posé',
    auth.getUsers().length === 2 && auth.findUser('a@x.bj').nom === 'A');

  // L'instantané ne bouge pas tant qu'on ne le rafraîchit pas : c'est ce qui
  // rend toutes les lectures d'une requête cohérentes entre elles.
  const magasin = require('../../src/magasin');
  await magasin.modifier('users', [], (c) => [...c, { username: 'c@x.bj', nom: 'C' }]);
  verifier('annuaire : l’instantané ne bouge pas de lui-même',
    auth.getUsers().length === 2, `${auth.getUsers().length} compte(s)`);
  await annuaire.rafraichir();
  verifier('annuaire : rafraîchi, il voit ce que la base porte',
    auth.getUsers().length === 3 && !!auth.findUser('c@x.bj'));

  // Vingt décomptes de tentatives, lancés ensemble, sur le même compte.
  await annuaire.remplacer([{ username: 'a@x.bj', nom: 'A', failedAttempts: 0 }]);
  await Promise.all(Array.from({ length: 20 }, () => auth.modifierUsers(
    (c) => c.map((u) => (u.username === 'a@x.bj'
      ? { ...u, failedAttempts: (u.failedAttempts || 0) + 1 } : u)),
  )));
  verifier('annuaire : vingt décomptes concurrents comptent jusqu’à vingt',
    auth.findUser('a@x.bj').failedAttempts === 20,
    `${auth.findUser('a@x.bj').failedAttempts}`);

  // Deux gestionnaires sur le même compte, pour des champs différents : aucun
  // des deux ne doit effacer l'autre.
  await annuaire.remplacer([{ username: 'a@x.bj', nom: 'A', failedAttempts: 3 }]);
  const avant = auth.findUser('a@x.bj');
  const apresNom = { ...avant, nom: 'Modifié' };          // ce qu'un administrateur produit
  await Promise.all([
    // l'administrateur ne reporte que ce qu'il a changé
    auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
      ? { ...u, ...auth.champsChanges(avant, apresNom) } : u))),
    // la connexion incrémente, sur la version fraîche
    auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
      ? { ...u, failedAttempts: (u.failedAttempts || 0) + 1 } : u))),
  ]);
  const fin = auth.findUser('a@x.bj');
  verifier('annuaire : deux écritures sur des champs différents coexistent',
    fin.nom === 'Modifié' && fin.failedAttempts === 4,
    JSON.stringify({ nom: fin.nom, failedAttempts: fin.failedAttempts }));

  // Et le contre-exemple, pour que le précédent ne prouve pas rien.
  //
  // Il est **séquentiel**, et c'est voulu : lancé en parallèle, le résultat
  // dépendrait de l'ordre d'arrivée dans la file et la perte n'arriverait qu'une
  // fois sur deux. Le scénario réel, lui, est bien celui-ci — l'administrateur
  // lit la fiche, une connexion échoue entre-temps, l'administrateur écrit.
  await annuaire.remplacer([{ username: 'a@x.bj', nom: 'A', failedAttempts: 3 }]);
  const vieux = auth.findUser('a@x.bj');                 // ce que l'administrateur a lu
  await auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
    ? { ...u, failedAttempts: (u.failedAttempts || 0) + 1 } : u)));   // une connexion échoue
  await auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
    ? { ...vieux, nom: 'Modifié' } : u)));               // réécrit tout, à l'ancienne
  const ecrase = auth.findUser('a@x.bj');
  verifier('annuaire : contre-épreuve — réécrire tout efface l’autre écriture',
    ecrase.failedAttempts === 3,
    `failedAttempts = ${ecrase.failedAttempts} (3 attendu : l’incrément est perdu)`);

  // Et le même scénario avec le report des seuls champs changés : les deux
  // écritures coexistent. C'est la paire qui fait la démonstration.
  await annuaire.remplacer([{ username: 'a@x.bj', nom: 'A', failedAttempts: 3 }]);
  const lu = auth.findUser('a@x.bj');
  await auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
    ? { ...u, failedAttempts: (u.failedAttempts || 0) + 1 } : u)));
  const voulu = { ...lu, nom: 'Modifié' };
  await auth.modifierUsers((c) => c.map((u) => (u.username === 'a@x.bj'
    ? { ...u, ...auth.champsChanges(lu, voulu) } : u)));
  const garde = auth.findUser('a@x.bj');
  verifier('annuaire : le report des seuls champs changés les garde tous les deux',
    garde.nom === 'Modifié' && garde.failedAttempts === 4,
    JSON.stringify({ nom: garde.nom, failedAttempts: garde.failedAttempts }));

  // La table des sessions survit au redémarrage : elle est rechargée depuis le
  // magasin, et `getSession` la lit sans attendre.
  const jeton = await auth.createSession('a@x.bj', { security: { singleSession: false } });
  auth.sessions.clear();
  verifier('sessions : vidée, la table ne reconnaît plus le jeton',
    auth.getSession(jeton, { security: { sessionTimeoutMinutes: 60 } }) === null);
  await auth.chargerSessions();
  verifier('sessions : rechargée depuis le magasin, elle le reconnaît de nouveau',
    (auth.getSession(jeton, { security: { sessionTimeoutMinutes: 60 } }) || {}).username === 'a@x.bj');
}

// ── 5 bis. La façade, sur fichiers ──
// `src/magasin.js` sert les deux régimes. Sans `DATABASE_URL` — celui des
// contrôles, et celui d'une instance qui n'a pas encore basculé — tout reste
// sur fichiers, et c'est ce régime-là qu'on éprouve ici.
//
// Le point qui compte est `modifier`. En base, son atomicité vient de `rev` ;
// sur fichiers, d'une file d'attente par collection. Sans elle, deux
// transformations concurrentes liraient le même état et l'une écraserait
// l'autre — le défaut même que la bascule doit fermer, réintroduit par la
// façade qui prétendait le refermer.
// Le nom de la collection d'essai est tiré au hasard à chaque exécution. Ce
// n'est pas une coquetterie : `src/store.js` fige son répertoire de données à
// l'import, et « ramp » — qui s'exécute avant celle-ci — charge le socle au
// moment où l'index requiert les suites, donc **avant** que `OASIS_DATA_DIR`
// soit posé ici. Les écritures d'essai partent alors dans le vrai `data/`, et
// un nom fixe y serait retrouvé au passage suivant : le contrôle « rend le
// défaut » échouerait à la deuxième exécution, et pas à la première.
//
// Le nom tiré au sort rend le contrôle juste dans tous les cas ; le nettoyage
// plus bas efface ce qu'il a écrit. La cause, elle, reste entière.
const COLL_ESSAI = `essai_facade_${Math.random().toString(36).slice(2, 8)}`;

async function facadeDuMagasin() {
  const magasin = require('../../src/magasin');

  // Le régime dépend de `DATABASE_URL`, et le contrôle doit dire la même chose
  // dans les deux — c'est tout l'intérêt d'une façade. Affirmer le seul régime
  // des fichiers le faisait échouer dès qu'on visait une vraie base, ce qui est
  // précisément le cas qu'on veut pouvoir éprouver.
  const enBase = !!process.env.DATABASE_URL;
  verifier(`façade : une collection migrée est servie par ${enBase ? 'la base' : 'les fichiers'}`,
    magasin.surBase('ramp_aeronefs') === enBase);
  // Celui-ci, lui, ne dépend d'aucun régime : la liste d'autorisation nomme ce
  // qui est migré, et rien d'autre ne l'est jamais.
  //
  // Le témoin est pris **dans** la liste, par son complément : nommer une
  // collection en dur l'aurait fait échouer le jour où elle bascule, ce qui est
  // arrivé à `users`. Un nom qui n'est pas dans la liste n'est jamais en base,
  // quelle que soit la liste.
  const pasMigree = ['referentiels', 'module_rights', 'execution', 'ramp']
    .find((n) => !magasin.MIGREES.has(n));
  verifier('façade : une collection non migrée ne l’est dans aucun régime',
    !!pasMigree && magasin.surBase(pasMigree) === false,
    `témoin : ${pasMigree || '(aucun — tout est migré)'}`);

  verifier('façade : une collection absente rend le défaut',
    JSON.stringify(await magasin.load(COLL_ESSAI, { rien: true })) === '{"rien":true}');

  await magasin.save(COLL_ESSAI, { items: [] });
  verifier('façade : ce qui est écrit se relit',
    JSON.stringify((await magasin.load(COLL_ESSAI, null)).items) === '[]');

  // Vingt transformations lancées ensemble, chacune ajoutant sa ligne. Sans
  // file d'attente, il n'en resterait qu'une poignée.
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  await Promise.all(Array.from({ length: 20 }, (_, i) => magasin.modifier(
    COLL_ESSAI, { items: [] },
    async (d) => { await attendre(1); return { items: [...d.items, i] }; },
  )));
  const apres = (await magasin.load(COLL_ESSAI, null)).items;
  verifier('façade : 20 modifications concurrentes sur fichiers, aucune perdue',
    apres.length === 20 && new Set(apres).size === 20, `${apres.length} entrée(s)`);

  // Une transformation qui échoue ne doit pas bloquer la file derrière elle.
  let leve = false;
  await magasin.modifier(COLL_ESSAI, {}, () => { throw new Error('essai'); })
    .catch(() => { leve = true; });
  await magasin.modifier(COLL_ESSAI, { items: [] }, (d) => ({ items: [...d.items, 99] }));
  verifier('façade : un échec est relevé et ne bloque pas la file',
    leve && (await magasin.load(COLL_ESSAI, null)).items.length === 21);

  // ── L'enveloppe des gestionnaires asynchrones ──
  // Express 4 ne regarde pas la promesse d'un gestionnaire `async`. Sans
  // enveloppe, un rejet ne mène nulle part : la requête reste ouverte, et le
  // dernier filet du socle n'est jamais atteint. Le contrôle de forme de la
  // suite « taille » impose l'enveloppe ; celui-ci vérifie qu'elle fait bien ce
  // qu'on attend d'elle.
  const { asynchrone } = require('../../src/route');
  const recu = [];
  await new Promise((fini) => {
    asynchrone(async () => { throw new Error('échec du gestionnaire'); })(
      {}, {}, (e) => { recu.push(e); fini(); },
    );
  });
  verifier('route : un gestionnaire asynchrone qui échoue part au filet du socle',
    recu.length === 1 && recu[0].message === 'échec du gestionnaire');

  // Et ce qui réussit ne doit surtout pas y partir : une enveloppe qui appelle
  // `next` à tort rendrait une erreur 500 sur une requête servie.
  let appele = false;
  let suivant = false;
  await asynchrone(async () => { appele = true; })({}, {}, () => { suivant = true; });
  verifier('route : un gestionnaire qui aboutit ne réveille pas le filet',
    appele && !suivant);

  // ── Le bus rend une promesse, quoi que fasse le producteur ──
  // C'est tout l'objet de l'étape A d'ADR-002 : le jour où un producteur
  // passera en base, ses consommateurs n'auront rien à reprendre, parce qu'ils
  // l'attendent déjà. Encore faut-il que le contrat tienne **des deux côtés** —
  // producteur synchrone comme asynchrone.
  const services = require('../../src/services');
  services.publish('ESSAI.synchrone', () => [1, 2, 3], { module: 'ESSAI' });
  services.publish('ESSAI.asynchrone', async () => [4, 5], { module: 'ESSAI' });

  const rendu = services.callOr('ESSAI.synchrone', []);
  verifier('bus : un producteur synchrone est servi comme une promesse',
    typeof rendu.then === 'function'
    && JSON.stringify(await rendu) === '[1,2,3]');
  verifier('bus : un producteur asynchrone est servi de la même façon',
    JSON.stringify(await services.callOr('ESSAI.asynchrone', [])) === '[4,5]');

  // Sans producteur, le consommateur reste servi : c'est ce qui permet de
  // déployer un module sans ses voisins.
  verifier('bus : sans producteur, le défaut est rendu — en promesse aussi',
    JSON.stringify(await services.callOr('ESSAI.absent', ['défaut'])) === '["défaut"]'
    && (await services.call('ESSAI.absent')) === undefined);
}

// ── 6. Aucun secret dans le journal des envois ──
// Trois messages portent un secret : mot de passe d'ouverture de compte, mot
// de passe réinitialisé, code à usage unique. Leur corps était conservé en
// clair dans data/emails.json — un journal d'envois devenu trousseau. Deux
// mots de passe utilisables y dormaient depuis six semaines.
async function courrielsSansSecret() {
  const email = require('../../src/email');

  // ── La messagerie est coupée, et il faut le forcer ──
  //
  // Sans cela, ce contrôle dépend de ce qui écoute sur le poste. Un Mailpit sur
  // le port 1025 — l'usage courant en développement — rend `sendMail`
  // joignable : les trois envois s'espacent alors sur le réseau, et leurs
  // inscriptions au registre ne se croisent plus. Le contrôle passait, mais
  // pour la mauvaise raison : il ne prouvait plus rien de la concurrence.
  //
  // Une configuration sans hôte SMTP force la branche « en attente », où
  // l'inscription au registre est le **seul** temps asynchrone. Les trois
  // s'y croisent donc pour de bon.
  const configAvant = process.env.OASIS_CONFIG_DIR;
  const bacConfig = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-smtp-'));
  fs.writeFileSync(path.join(bacConfig, 'oasis.config.json'),
    JSON.stringify({ smtp: { enabled: false } }));
  process.env.OASIS_CONFIG_DIR = bacConfig;
  verifier('courriels : l’épreuve tourne bien sans messagerie joignable',
    email.etatSmtp().actif === false, JSON.stringify(email.etatSmtp()));

  // Ce que le journal retient d'un message à secret.
  const avant = (await email.list()).length;
  await Promise.all([
    email.accountCreated({ to: 'essai@aac.bj', name: 'Essai', username: 'essai@aac.bj', password: 'SecretEnClair!42' }),
    email.passwordReset({ to: 'essai@aac.bj', name: 'Essai', username: 'essai@aac.bj', password: 'AutreSecret!42' }),
    email.mfaCode({ to: 'essai@aac.bj', name: 'Essai', code: '424242', minutes: 10, channel: 'email' }),
  ].map((p) => Promise.resolve(p).catch(() => null)));
  const ecrits = (await email.list()).slice(avant);

  // Trois envois lancés **ensemble**. Le registre écrit par `modifier` : sans
  // lui, deux des trois seraient perdus, chacun ayant lu la même liste avant
  // d'y pousser sa ligne. C'est la preuve du geste, sur un chemin réel et non
  // sur une collection d'essai.
  verifier('courriels : les trois messages à secret sont bien journalisés',
    ecrits.length === 3, `${ecrits.length} message(s)`);
  verifier('courriels : trois envois concurrents, trois identifiants distincts',
    new Set(ecrits.map((m) => m.id)).size === 3,
    JSON.stringify(ecrits.map((m) => m.id)));
  verifier('courriels : aucun secret ne subsiste dans le journal',
    !ecrits.some((m) => /SecretEnClair|AutreSecret|424242/.test(JSON.stringify(m))),
    JSON.stringify(ecrits.map((m) => m.body)).slice(0, 120));
  verifier('courriels : l’entête reste, pour savoir qu’un message est parti',
    ecrits.every((m) => m.to === 'essai@aac.bj' && m.subject && m.status),
    JSON.stringify(ecrits.map((m) => m.subject)));

  // Le garde-fou de la source : un message qui interpole un mot de passe ou un
  // code dans son corps doit se déclarer. Sans quoi le prochain repartirait en
  // clair, et rien ne le dirait.
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'email.js'), 'utf8');
  const bavards = [];
  source.split(/\nfunction /).forEach((bloc) => {
    const nom = (bloc.match(/^([A-Za-z_$][\w$]*)\s*\(/) || [])[1];
    if (!nom || !/queue\(\{/.test(bloc)) return;
    if (/\$\{(password|code)\}/.test(bloc) && !/secret:\s*true/.test(bloc)) bavards.push(nom);
  });
  verifier('courriels : tout message portant un secret le déclare',
    bavards.length === 0, bavards.join(' · '));

  // Le paramétrage rendu, et le bac effacé.
  if (configAvant === undefined) delete process.env.OASIS_CONFIG_DIR;
  else process.env.OASIS_CONFIG_DIR = configAvant;
  fs.rmSync(bacConfig, { recursive: true, force: true });
}

// ── 7. Verrou du répertoire de données ──
// Il n'y a pas de verrou de base derrière les fichiers : deux processus sur le
// même répertoire s'effacent l'un l'autre en silence. C'est la condition qui
// rend ADR-001 tenable — d'où ces contrôles, et notamment celui du verrou
// périmé : un verrou qui bloque après un arrêt brutal est pire que pas de
// verrou du tout.
function verrouDuRepertoire() {
  const verrou = require('../../src/verrou');
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-verrou-'));
  const chemin = path.join(bac, verrou.NOM);
  const prise = (d) => { try { return { v: verrou.prendre(d) }; } catch (e) { return { e }; } };

  try {
    const premier = prise(bac);
    verifier('verrou : un répertoire neuf se prend',
      premier.v && fs.existsSync(chemin));

    const second = prise(bac);
    verifier('verrou : un second processus vivant est refusé',
      second.e && second.e.code === 'VERROU_TENU', second.e && second.e.code);
    verifier('verrou : le refus dit comment retrouver le tenant',
      second.e && /ps -p \d+/.test(second.e.message));

    premier.v.relacher();
    const apres = prise(bac);
    verifier('verrou : relâché, il se reprend', !!apres.v);
    apres.v.relacher();

    // Arrêt brutal : le verrou reste, son processus non.
    fs.writeFileSync(chemin, JSON.stringify({ pid: 999999, machine: os.hostname(), debut: 'x' }));
    const repris = prise(bac);
    verifier('verrou : un verrou périmé ne bloque pas le redémarrage',
      repris.v && repris.v.repris && repris.v.repris.pid === 999999);
    repris.v.relacher();

    // Deux conteneurs sur un même volume : rien ici ne peut vérifier l'autre.
    fs.writeFileSync(chemin, JSON.stringify({ pid: 1234, machine: 'autre-machine', debut: 'x' }));
    const etranger = prise(bac);
    verifier('verrou : celui d’une autre machine est refusé, faute de pouvoir le vérifier',
      etranger.e && etranger.e.code === 'VERROU_ETRANGER', etranger.e && etranger.e.code);

    process.env.OASIS_VERROU = '0';
    const leve = prise(bac);
    delete process.env.OASIS_VERROU;
    verifier('verrou : OASIS_VERROU=0 passe outre, pour l’opérateur qui sait',
      leve.v && leve.v.leve === true);

    // Un processus qui s'arrête n'emporte pas le verrou d'un autre, repris
    // entre-temps : sans quoi le troisième démarrage croirait la place libre.
    fs.writeFileSync(chemin, JSON.stringify({ pid: 4242, machine: os.hostname(), debut: 'x' }));
    premier.v.relacher();
    verifier('verrou : on ne relâche que le sien', fs.existsSync(chemin));
  } finally {
    fs.rmSync(bac, { recursive: true, force: true });
  }
}

// ── Les vecteurs de la réécriture Java (ADR-002) ──
//
// Deux mécanismes se jouent à l'octet près, et une erreur d'un bit n'y produit
// aucune exception : scrypt refuserait tout le monde sans rien dire, et une
// sérialisation qui diffère d'un espace déclarerait faux tout l'historique du
// journal.
//
// `tests/conformite/vecteurs.json` fige les deux contrats. Ces contrôles font
// deux choses distinctes, et les deux comptent :
//   — les vecteurs décrivent bien le calcul (le script les recalcule) ;
//   — et le **code en service** produit bien ce qu'ils annoncent.
// Sans le second, les vecteurs décriraient une implémentation imaginaire.
async function vecteursDeMigration() {
  const vect = require('../../scripts/vecteurs-conformite');
  const ecarts = vect.verifier();
  verifier('vecteurs de migration : à jour avec le calcul qu’ils décrivent',
    ecarts.length === 0, ecarts.join(' · '));

  const fige = JSON.parse(fs.readFileSync(vect.FICHIER, 'utf8'));

  // scrypt, par la fonction réellement employée à la connexion.
  const authReel = require('../../src/auth');
  const fauxScrypt = fige.scrypt.cas.filter((c) =>
    authReel.hashPassword(c.motDePasse, c.sel).hash !== c.attendu);
  verifier('vecteurs de migration : scrypt du code en service conforme',
    fauxScrypt.length === 0, fauxScrypt.map((c) => c.quoi).join(' · '));

  // La chaîne, par `audit.log` lui-même : on écrit une entrée dont on maîtrise
  // tous les champs, puis on compare son empreinte à celle qu'annonce le
  // vecteur pour les mêmes valeurs.
  const cas = fige.chaine.cas.find((c) => c.quoi.startsWith('ORDRE'));
  const ecrite = await audit.log(cas.entree.user, cas.entree.action, cas.entree.details);
  const attendu = crypto.createHash('sha256')
    .update(`${ecrite.prevHash}|${ecrite.ts}|${ecrite.user}|${ecrite.action}|${cas.json_attendu}`)
    .digest('hex');
  verifier('vecteurs de migration : le journal sérialise comme le vecteur l’annonce',
    ecrite.hash === attendu, `${ecrite.hash.slice(0, 16)}… ≠ ${attendu.slice(0, 16)}…`);

  // La chaîne des modules scelle six champs, non quatre. Ce contrat manquait
  // aux vecteurs, et le manque s'est vu en écrivant le socle Java — qui aurait
  // rompu 1 582 entrées en croyant le contrat satisfait.
  const moduleAudit = require('../../src/module_audit');
  const casModule = (fige.chaineModule || { cas: [] }).cas[0];
  verifier('vecteurs de migration : la chaîne des modules est couverte', !!casModule);
  if (casModule) {
    const e = casModule.entree;
    const inscrite = await moduleAudit.log('ESSAI_VECTEURS', e.user, e.action, e.objet, e.ref, e.details);
    const attenduModule = crypto.createHash('sha256')
      .update([inscrite.prevHash, inscrite.ts, inscrite.user, inscrite.action,
        inscrite.objet, inscrite.ref, casModule.json_attendu].join('|'))
      .digest('hex');
    verifier('vecteurs de migration : le journal de module scelle bien six champs',
      inscrite.hash === attenduModule,
      `${inscrite.hash.slice(0, 16)}… ≠ ${attenduModule.slice(0, 16)}…`);
  }
}

// ── Conservation : ce qui se purge, ce qui s'archive, ce qui ne bouge pas ──
//
// La purge efface pour de bon : elle ne s'éprouve pas dans le répertoire de
// travail. Le scénario tourne dans un processus à part, avec son propre
// `OASIS_DATA_DIR` — aucune donnée réelle n'est à portée, quoi qu'il arrive.
function conservation() {
  const { execFileSync } = require('child_process');
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-retention-'));
  const scenario = `
    const fs = require('fs');
    const retention = require(${JSON.stringify(path.join(__dirname, '..', '..', 'src', 'retention'))});
    const audit = require(${JSON.stringify(path.join(__dirname, '..', '..', 'src', 'audit'))});
    const magasin = require(${JSON.stringify(path.join(__dirname, '..', '..', 'src', 'magasin'))});

    const JOUR = 86400000;
    // Tout se juge à un seul instant : onze ans devant nous, de sorte que les
    // entrées de journal (dix ans de conservation) soient échues. Les dates
    // des courriels sont posées par rapport à CET instant, sans quoi le
    // « récent » aurait onze ans lui aussi — et la purge aurait raison de
    // l'emporter.
    const instant = Date.now() + 11 * 365 * JOUR;
    const vieux = new Date(instant - 200 * JOUR).toISOString();
    const recent = new Date(instant - 2 * JOUR).toISOString();

    (async () => {
      await magasin.save('emails', [
        { id: 1, to: 'a@x.bj', ts: vieux }, { id: 2, to: 'b@x.bj', ts: vieux },
        { id: 3, to: 'c@x.bj', ts: recent },
      ]);
      await audit.log('essai', 'PREMIERE', {});
      await audit.log('essai', 'SECONDE', {});

      const rapport = await retention.appliquer({}, { appliquer: true, maintenant: instant });

      console.log(JSON.stringify({
        rapport,
        courrielsRestants: (await magasin.load('emails', [])).map((e) => e.id),
        entreesJournal: (await audit.list()).length,
        chaine: await audit.verifyChain(),
        archives: fs.existsSync(process.env.OASIS_DATA_DIR + '/archives')
          ? fs.readdirSync(process.env.OASIS_DATA_DIR + '/archives') : [],
      }));
    })();
  `;
  let r;
  try {
    // Le scénario écrit son résultat en dernier : une erreur de son côté rendrait
    // une sortie vide, et `JSON.parse` dirait seulement « fin de JSON
    // inattendue ». Sa sortie d'erreur est donc rendue telle quelle.
    // `DATABASE_URL` est retiré : ce scénario pose ses propres fixtures et
    // compte ce qui reste après la purge. Sur une base partagée avec le reste
    // de la campagne, il compterait les entrées des autres contrôles — ce qu'il
    // a fait, et le chiffre faux était le seul indice. La politique de
    // conservation ne dépend pas du régime ; son épreuve se fait donc sur
    // fichiers, où l'isolement est gratuit.
    const env = { ...process.env, OASIS_DATA_DIR: bac };
    delete env.DATABASE_URL;
    const sortie = execFileSync(process.execPath, ['-e', scenario],
      { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    r = JSON.parse(sortie);
  } finally {
    fs.rmSync(bac, { recursive: true, force: true });
  }

  // Ce qui est échu part, ce qui ne l'est pas reste. Le troisième courriel a
  // deux jours : il n'a rien à faire dans une purge à quatre-vingt-dix.
  verifier('conservation : la purge retire les entrées échues, et elles seules',
    JSON.stringify(r.courrielsRestants) === '[3]', JSON.stringify(r.courrielsRestants));

  // Le point qui décide de tout : le journal d'audit sort une copie et **ne
  // perd rien**. Retirer une entrée romprait la chaîne du §F.3.
  verifier('conservation : le journal d’audit garde toutes ses entrées',
    r.entreesJournal === 2, `${r.entreesJournal} entrée(s)`);
  verifier('conservation : la chaîne reste vérifiable après archivage',
    r.chaine.valid === true, JSON.stringify(r.chaine));
  verifier('conservation : l’archive est écrite à côté, horodatée',
    r.archives.some((f) => /^audit-jusqu-a-.*\.jsonl$/.test(f)), JSON.stringify(r.archives));

  const actes = Object.fromEntries((r.rapport.actes || []).map((a) => [a.collection, a]));
  verifier('conservation : le rapport nomme la purge et l’archivage',
    actes.emails && actes.emails.retirees === 2
    && actes.audit && actes.audit.archivees === 2,
    JSON.stringify(r.rapport.actes));
}

// ── Ce que la barre de RAMP nomme, et à qui ──
//
// Elle ne nommait que le prestataire : un agent d'AAC n'y lisait rien, quand
// les autres modules lui disent chez quelle AAC il travaille. La règle est du
// front, et aucune requête ne la mène — d'où cette épreuve, qui exécute le
// vrai fichier dans une portée de papier et lui pose les quatre profils.
function barreDeRamp() {
  const vm = require('vm');
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'public', 'modules', 'ramp', 'js', 'ramp-vues.js'), 'utf8',
  );

  const mention = (vue, instance) => {
    let dit = null;
    const portee = {
      RAMP_STATE: { vue, instance },
      rt: (k) => k,
      rampApi: async () => ({}),
      rampToast: () => {},
      oasisModuleActions: () => {},
      oasisModuleMention: (t) => { dit = t; },
      setTimeout: () => {},
    };
    portee.window = { addEventListener: () => {} };
    vm.createContext(portee);
    vm.runInContext(source, portee);
    portee.rampDessinerActions();
    return dit;
  };

  const BENIN = { disponible: false, courante: 'Bénin', locale: 'Bénin' };
  const REGIONAL = { disponible: true, courante: 'Togo', locale: 'Bénin', instances: ['Bénin', 'Togo'] };

  verifier('barre RAMP : l’agent d’AAC lit son instance',
    mention({ disponible: false, vue: 'aac' }, BENIN) === 'Bénin');

  verifier('barre RAMP : l’administrateur d’AAC la lit aussi',
    mention({ disponible: true, vue: 'aac', prestataires: [] }, BENIN) === 'Bénin');

  // Celui qui la prend dans la liste déroulante l'y lit déjà : la redire
  // au-dessous ferait deux fois le même mot, dont l'un peut être périmé.
  verifier('barre RAMP : le super-administrateur régional ne la lit pas deux fois',
    mention({ disponible: true, vue: 'aac', prestataires: [] }, REGIONAL) === '');

  // Le compte d'organisme garde ce qu'il avait : c'est l'organisme qui décide
  // de ce que l'écran montre, non l'AAC qui l'héberge.
  verifier('barre RAMP : le compte prestataire lit son organisme',
    mention({ disponible: false, vue: 'prestataire', prestataire_nom: 'Air Bénin' }, BENIN)
    === 'Air Bénin');

  // Un compte rattaché à un autre État travaille chez lui, non chez celui qui
  // sert l'application : c'est `courante` qui fait foi, non `locale`.
  verifier('barre RAMP : un compte d’un autre État lit le sien',
    mention({ disponible: false, vue: 'aac' },
      { disponible: false, courante: 'Togo', locale: 'Bénin' }) === 'Togo');
}

module.exports = async function unitairesSmoke() {
  console.log('\n── Unitaires : la logique pure ──');
  try {
    // Cette suite n'ouvre aucun serveur : c'est elle qui doit préparer le
    // magasin. Sans cela, en régime base, la première inscription au journal
    // échoue sur « relation journal does not exist » — une table que le
    // démarrage du serveur crée, et qu'aucun serveur ne démarre ici.
    await magasinDuJournal.preparer();
    // Le concurrent d'abord : `chainage` falsifie le journal à la fin, exprès,
    // et la chaîne ne s'en relève pas — c'est tout son objet.
    await numerosDeChaine();
    await chainageConcurrent();
    await chainage();
    rattachement();
    bornes();
    traces();
    await courrielsSansSecret();
    verrouDuRepertoire();
    await vecteursDeMigration();
    conservation();
    barreDeRamp();
    await compteurDuSecondFacteur();
    await annuaireDesComptes();
    await magasins();
    await facadeDuMagasin();
  } finally {
    fs.rmSync(BAC, { recursive: true, force: true });
    // Effacer ce que les contrôles ont écrit, là où ils l'ont réellement écrit.
    // `src/store.js` fige son répertoire à l'import : si une suite précédente
    // a chargé le socle avant que `OASIS_DATA_DIR` soit posé ici, ce répertoire
    // est le vrai `data/`, et le bac n'aura rien reçu. On nettoie donc les deux.
    ['essai_contrat', COLL_ESSAI, 'essai_journal'].forEach((nom) => {
      [BAC, process.env.OASIS_DATA_DIR, path.join(__dirname, '..', '..', 'data')]
        .filter(Boolean)
        .forEach((rep) => {
          fs.rmSync(path.join(rep, `${nom}.json`), { force: true });
          fs.rmSync(path.join(rep, `${nom}.jsonl`), { force: true });
        });
    });
    delete process.env.OASIS_DATA_DIR;
  }
  assert.ok(true);
  return bilan('Unitaires');
};
