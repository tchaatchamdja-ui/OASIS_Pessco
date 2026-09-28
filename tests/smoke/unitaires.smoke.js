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

  verifier('façade : sans DATABASE_URL, rien n’est servi par la base',
    magasin.surBase('ramp_aeronefs') === false);
  verifier('façade : une collection non migrée ne l’est jamais',
    magasin.surBase('users') === false && !magasin.MIGREES.has('users'));

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

  // Ce que le journal retient d'un message à secret. L'envoi est attendu : la
  // messagerie n'est pas joignable ici, et c'est l'échec qui journalise.
  const avant = email.list().length;
  await Promise.all([
    email.accountCreated({ to: 'essai@aac.bj', name: 'Essai', username: 'essai@aac.bj', password: 'SecretEnClair!42' }),
    email.passwordReset({ to: 'essai@aac.bj', name: 'Essai', username: 'essai@aac.bj', password: 'AutreSecret!42' }),
    email.mfaCode({ to: 'essai@aac.bj', name: 'Essai', code: '424242', minutes: 10, channel: 'email' }),
  ].map((p) => Promise.resolve(p).catch(() => null)));
  const ecrits = email.list().slice(avant);

  verifier('courriels : les trois messages à secret sont bien journalisés',
    ecrits.length === 3, `${ecrits.length} message(s)`);
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
function vecteursDeMigration() {
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
  const ecrite = audit.log(cas.entree.user, cas.entree.action, cas.entree.details);
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
    const inscrite = moduleAudit.log('ESSAI_VECTEURS', e.user, e.action, e.objet, e.ref, e.details);
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
    const store = require(${JSON.stringify(path.join(__dirname, '..', '..', 'src', 'store'))});

    const JOUR = 86400000;
    // Tout se juge à un seul instant : onze ans devant nous, de sorte que les
    // entrées de journal (dix ans de conservation) soient échues. Les dates
    // des courriels sont posées par rapport à CET instant, sans quoi le
    // « récent » aurait onze ans lui aussi — et la purge aurait raison de
    // l'emporter.
    const instant = Date.now() + 11 * 365 * JOUR;
    const vieux = new Date(instant - 200 * JOUR).toISOString();
    const recent = new Date(instant - 2 * JOUR).toISOString();

    store.save('emails', [
      { id: 1, to: 'a@x.bj', ts: vieux }, { id: 2, to: 'b@x.bj', ts: vieux },
      { id: 3, to: 'c@x.bj', ts: recent },
    ]);
    audit.log('essai', 'PREMIERE', {});
    audit.log('essai', 'SECONDE', {});

    const rapport = retention.appliquer({}, { appliquer: true, maintenant: instant });

    console.log(JSON.stringify({
      rapport,
      courrielsRestants: store.load('emails', []).map((e) => e.id),
      entreesJournal: audit.list().length,
      chaine: audit.verifyChain(),
      archives: fs.existsSync(process.env.OASIS_DATA_DIR + '/archives')
        ? fs.readdirSync(process.env.OASIS_DATA_DIR + '/archives') : [],
    }));
  `;
  let r;
  try {
    r = JSON.parse(execFileSync(process.execPath, ['-e', scenario],
      { env: { ...process.env, OASIS_DATA_DIR: bac }, encoding: 'utf8' }));
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
    chainage();
    rattachement();
    bornes();
    traces();
    await courrielsSansSecret();
    verrouDuRepertoire();
    vecteursDeMigration();
    conservation();
    barreDeRamp();
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
