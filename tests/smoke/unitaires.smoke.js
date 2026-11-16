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
// Le bac du processus, posé par le lanceur avant tout module du socle. Cette
// suite s'y range plutôt que d'en poser un : `src/store.js` fige son répertoire
// à l'import, et une suite chargée après lui n'y peut plus rien.
//
// Elle en posait un, trois lignes sous un commentaire qui affirmait la règle
// qu'il enfreignait — et son contrôle de l'annuaire écrivait donc dans le vrai
// `data/users.json`, qu'il a détruit. L'en-tête de `bac.js` raconte le mécanisme.
const { BAC } = require('./bac');
const { verifier, horsPortee, bilan } = require('./harness');
const magasinDuJournal = require('../../src/magasin');

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

// ── Le répertoire de données ne se fige pas à l'import ──
//
// C'est la propriété dont dépend tout le reste de cette suite, et son absence a
// **détruit `data/users.json`** : un module du socle chargé avant que
// `OASIS_DATA_DIR` soit posé figeait le vrai `data/` pour toute la durée du
// processus, et les contrôles y écrivaient. `tests/smoke/bac.js` en raconte le
// chemin complet.
//
// Le contrôle déplace la variable entre deux écritures et vérifie qu'elles
// atterrissent dans deux répertoires différents — ce qui est faux si le
// répertoire est figé —, puis que la seconde n'a pas effacé la première du cache.
function repertoireNonFige() {
  const fichiers = require('../../src/store');
  const avant = process.env.OASIS_DATA_DIR;
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-rep-a-'));
  const b = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-rep-b-'));
  try {
    process.env.OASIS_DATA_DIR = a;
    fichiers.save('essai_repertoire', { ou: 'a' });
    process.env.OASIS_DATA_DIR = b;
    fichiers.save('essai_repertoire', { ou: 'b' });
    verifier('magasin : le répertoire est lu à chaque appel, non figé à l’import',
      fs.existsSync(path.join(a, 'essai_repertoire.json'))
      && fs.existsSync(path.join(b, 'essai_repertoire.json')),
      `a : ${fs.existsSync(path.join(a, 'essai_repertoire.json'))} · b : ${fs.existsSync(path.join(b, 'essai_repertoire.json'))}`);
    // Et le cache ne confond pas deux répertoires. Indexé par nom seul, il les
    // confondrait — mais **la date du fichier le rattrape presque toujours**, et
    // c'est ce qu'a montré la contre-épreuve : l'écart de quelques millisecondes
    // entre les deux écritures suffisait à provoquer une relecture.
    //
    // La fenêtre réelle est celle de deux fichiers portant la même date, à la
    // milliseconde — ce qui arrive. On la force donc, sinon le contrôle ne garde
    // rien : c'est le seul cas où l'indexation par chemin est ce qui décide.
    const quand = new Date('2026-06-01T12:00:00.000Z');
    [a, b].forEach((r) => fs.utimesSync(path.join(r, 'essai_repertoire.json'), quand, quand));
    process.env.OASIS_DATA_DIR = b;
    fichiers.load('essai_repertoire', null);        // met « b » au cache
    process.env.OASIS_DATA_DIR = a;
    const relu = (fichiers.load('essai_repertoire', null) || {}).ou;
    verifier('magasin : le cache ne confond pas deux répertoires de même date',
      relu === 'a', `relu « ${relu} » dans a`);
  } finally {
    if (avant === undefined) delete process.env.OASIS_DATA_DIR;
    else process.env.OASIS_DATA_DIR = avant;
    [a, b].forEach((r) => fs.rmSync(r, { recursive: true, force: true }));
  }
}

// ── Retirer sans détruire ──
//
// Les constatations de la surveillance et les écarts d'aire de trafic fondent ce
// que les « Mesures d'Application » décident. Les détruire laissait une sanction
// sans son fondement, et le bus étant asynchrone, une mesure peut être prononcée
// entre la vérification et l'écriture. Décision du 3 octobre 2026 : on marque.
//
// La règle est posée **une seule fois**, dans `src/magasin_module.js` : les
// lectures ignorent ce qui porte `retire_le`. Une règle qu'on peut oublier de
// déclarer collection par collection ne garde rien — c'est la leçon du garde-fou
// qui avait cessé de couvrir « Mesures d'Application » en silence.
//
// Ces contrôles portent sur la fabrique, et non sur une route : aucun chemin de
// l'application ne produit aujourd'hui un enregistrement retiré dont le parent
// vive encore, de sorte qu'une épreuve par HTTP ne distinguerait pas le filtre de
// la disparition du parent. C'est dit, plutôt que supposé couvert.
async function retraitSansDestruction() {
  const { magasinDeModule } = require('../../src/magasin_module');
  // Sa propre collection : un contrôle plus bas veut `COLL_ESSAI` encore absente,
  // et l'ordre d'exécution ne doit pas être ce qui décide s'ils passent.
  const m = magasinDeModule(COLL_RETRAIT);

  await m.save({ pieces: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
  verifier('retrait : trois enregistrements posés', (await m.list('pieces')).length === 3);

  verifier('retrait : marquer rend vrai', await m.retirer('pieces', 'b', 'agent@anac.bj'));

  const vues = await m.list('pieces');
  verifier('retrait : la lecture ordinaire ne le voit plus',
    vues.length === 2 && !vues.some((p) => p.id === 'b'), vues.map((p) => p.id).join(','));
  verifier('retrait : `get` ne le voit plus non plus',
    (await m.get('pieces', 'b')) === null);

  // Ce qui distingue le retrait de la destruction, et toute la raison du geste.
  const tout = await m.listTout('pieces');
  const retire = tout.find((p) => p.id === 'b') || {};
  verifier('retrait : il subsiste, et dit quand et par qui',
    tout.length === 3 && !!retire.retire_le && retire.retire_par === 'agent@anac.bj',
    `${tout.length} au total, marque « ${retire.retire_par || ''} »`);
  verifier('retrait : `getTout` le retrouve',
    ((await m.getTout('pieces', 'b')) || {}).id === 'b');

  // Marquer deux fois ne réécrit pas la marque : la date du retrait est celle du
  // retrait, non celle de la dernière tentative.
  const dateDuRetrait = retire.retire_le;
  verifier('retrait : un second retrait ne fait rien',
    (await m.retirer('pieces', 'b', 'autre@anac.bj')) === false
    && ((await m.getTout('pieces', 'b')) || {}).retire_le === dateDuRetrait);

  // Et un enregistrement qui ne porte pas la marque n'est pas concerné : c'est ce
  // qui permet à la règle de valoir pour toutes les collections sans réglage.
  verifier('retrait : les autres collections ne changent pas de comportement',
    (await m.list('pieces')).every((p) => !('retire_le' in p)));
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
const COLL_RETRAIT = 'essai_retrait';

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
  // Le témoin était pris dans une liste de collections réelles, par leur
  // complément — et **les quinze sont maintenant migrées**, donc il n'en restait
  // aucune. Le contrôle disait alors « tout est migré » et tombait, pour une
  // bonne raison et sans rien garder.
  //
  // Il porte désormais sur un nom qui n'existe pas : c'est la liste
  // d'autorisation qui décide, et un nom qui n'y figure pas n'est jamais servi
  // par la base, quel que soit l'état de la migration.
  const pasMigree = 'collection_que_personne_na_migree';
  verifier('façade : un nom hors de la liste n’est servi par la base dans aucun régime',
    magasin.MIGREES.has(pasMigree) === false && magasin.surBase(pasMigree) === false,
    `témoin : ${pasMigree}`);

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

  // ── Ne rien écrire, et le dire ──
  //
  // `INCHANGE` existe pour les cas où il n'y a rien à faire : la ligne visée
  // n'existe pas, la transformation ne change rien. Réécrire quand même coûterait
  // la collection entière — jusqu'à plusieurs mégaoctets pour la bibliothèque
  // documentaire — pour répondre un `404`.
  const avantInchange = JSON.stringify(await magasin.load(COLL_ESSAI, null));
  const renduInchange = await magasin.modifier(COLL_ESSAI, {}, () => magasin.INCHANGE);
  verifier('façade : INCHANGE n’écrit rien et rend la valeur en place',
    JSON.stringify(renduInchange) === avantInchange
    && JSON.stringify(await magasin.load(COLL_ESSAI, null)) === avantInchange);

  // **Et c'est pour cela que ce n'est pas `undefined`.** Un `return` oublié rend
  // `undefined` ; le prendre pour « ne rien écrire » ferait disparaître une
  // écriture sans erreur ni trace — exactement ce que `modifier` existe pour
  // empêcher. Il lève donc, et nomme l'oubli.
  let oubli = null;
  await magasin.modifier(COLL_ESSAI, {}, (d) => { d.items.push(42); })
    .catch((e) => { oubli = e; });
  verifier('façade : un transformateur qui ne rend rien lève, et nomme l’oubli',
    !!oubli && /return/.test(oubli.message),
    oubli ? oubli.message.slice(0, 90) : 'rien levé — l’écriture a disparu en silence');
  verifier('façade : et rien n’a été écrit à sa place',
    JSON.stringify(await magasin.load(COLL_ESSAI, null)) === avantInchange);

  // ── Ce que le transformateur mute ne sort pas de lui ──
  //
  // Sur fichiers, la valeur lue est **l'objet du cache**, partagé par tout le
  // processus. Un transformateur qui le mute en place — `arr.splice`, `arr[i] = …`,
  // la façon naturelle d'écrire — le mutait pour tout le monde avant la moindre
  // écriture. Refusée, l'écriture laissait la valeur en mémoire fausse, et
  // durablement : le cache est indexé sur la date du fichier, que rien n'avait
  // changée. La base, elle, relit le JSON à chaque essai — d'où la copie, qui met
  // les deux régimes au même comportement.
  //
  // Les deux sorties non écrivantes sont prises : le refus explicite, et l'échec.
  await magasin.modifier(COLL_ESSAI, {}, (d) => { d.items.push(-1); return magasin.INCHANGE; });
  const apresRefus = JSON.stringify(await magasin.load(COLL_ESSAI, null));
  await magasin.modifier(COLL_ESSAI, {}, (d) => { d.items.push(-2); throw new Error('essai'); })
    .catch(() => {});
  verifier('façade : ce qu’un transformateur mute avant de renoncer ne se voit pas',
    apresRefus === avantInchange
    && JSON.stringify(await magasin.load(COLL_ESSAI, null)) === avantInchange,
    `${avantInchange.length} octets attendus`);

  // Une transformation qui échoue ne doit pas bloquer la file derrière elle.
  let leve = false;
  await magasin.modifier(COLL_ESSAI, {}, () => { throw new Error('essai'); })
    .catch(() => { leve = true; });
  await magasin.modifier(COLL_ESSAI, { items: [] }, (d) => ({ items: [...d.items, 99] }));
  verifier('façade : un échec est relevé et ne bloque pas la file',
    leve && (await magasin.load(COLL_ESSAI, null)).items.length === 21);

  // ── La fenêtre « lire, vérifier, écrire », et où la garde doit se tenir ──
  //
  // C'est le défaut de la réévaluation d'un profil de risque, et il se retrouvera
  // dans les quatre modules qui restent : vérifier qu'un drapeau n'est pas posé,
  // puis le poser. Vérifié **avant** la transformation, dix demandes passent
  // toutes ; vérifié **dedans**, sur l'état qu'on va écrire, une seule.
  //
  // Les deux formes sont jouées ici, sur dix tentatives simultanées. Celle du
  // dehors est la contre-épreuve : elle doit échouer, et c'est elle qui donne sa
  // valeur à l'autre. La rafale HTTP, elle, ne prouvait rien — dix requêtes
  // contre un gestionnaire rapide se sérialisent.
  await magasin.save(COLL_ESSAI, { drapeau: '', gagnants: [] });
  const dehors = async (i) => {
    const d = await magasin.load(COLL_ESSAI, null);
    if (d.drapeau) return false;                       // la garde, hors de l'écriture
    await magasin.modifier(COLL_ESSAI, {}, (v) => ({
      ...v, drapeau: `pris-${i}`, gagnants: [...v.gagnants, i],
    }));
    return true;
  };
  const passesDehors = (await Promise.all(Array.from({ length: 10 }, (_, i) => dehors(i))))
    .filter(Boolean).length;
  verifier('contre-épreuve : la garde hors de la transformation laisse tout passer',
    passesDehors > 1, `${passesDehors} passage(s) sur 10 — un seul aurait dû`);

  await magasin.save(COLL_ESSAI, { drapeau: '', gagnants: [] });
  const dedans = (i) => magasin.modifier(COLL_ESSAI, {}, (v) => {
    if (v.drapeau) return magasin.INCHANGE;            // la garde, dans l'écriture
    return { ...v, drapeau: `pris-${i}`, gagnants: [...v.gagnants, i] };
  });
  await Promise.all(Array.from({ length: 10 }, (_, i) => dedans(i)));
  const gagnants = (await magasin.load(COLL_ESSAI, null)).gagnants;
  verifier('la garde dans la transformation n’en laisse passer qu’une',
    gagnants.length === 1, `${gagnants.length} passage(s) sur 10`);

  await magasin.save(COLL_ESSAI, { items: [] });

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

// ── Nommer un gestionnaire posé dans le balisage ──
//
// Le relevé des gestes compte la couverture d'un écran, et il la compte **par
// nom**. Mal nommer un gestionnaire ne fait pas tomber une campagne : cela
// déplace un chiffre, dans un rapport que personne ne recoupe. C'est le mode de
// défaillance le plus coûteux de cet outil, et il s'est produit trois fois.
//
// Le dernier en date, mesuré le 11 novembre 2026 : le lien d'aperçu du courriel
// de transmission porte `onclick="event.preventDefault();${_escAttr(repli)}"`.
// Son contrôle est **vert** — le document est composé, la page n'est pas
// quittée —, et le relevé comptait pourtant deux gestes « non exercés » :
// `event.preventDefault`, qui est une garde, et `_escAttr`, qui est une fonction
// de rendu. Le nom que le navigateur porte, lui, est `execDownloadRapport`.
//
// Ces contrôles éprouvent `classer`, **la** fonction que `relever` appelle. Un
// garde-fou qui réécrirait la règle éprouverait sa propre version de la règle —
// faute déjà payée trois fois sur le contrôle des noms de suites.
function nommageDesGestes() {
  // eslint-disable-next-line global-require
  const { classer, aidesDeTexte, ligneDeFichier } = require(path.join(__dirname, '..', '..', 'scripts', 'relever-gestes.js'));
  const noms = (corps) => classer(corps).map((g) => g.nom);
  const seul = (corps) => classer(corps)[0];

  verifier('nommage : un gestionnaire ordinaire se nomme par son appel, valeur interpolée comprise',
    noms("execFoo('${d.id}')").join() === 'execFoo'
    && classer("execFoo('${d.id}')")[0].indecidable === undefined,
    JSON.stringify(classer("execFoo('${d.id}')")));

  verifier('nommage : une garde en tête ne nomme pas le geste — c\'est ce qu\'elle protège',
    noms('event.preventDefault();execFoo()').join() === 'execFoo'
    && noms('event.stopPropagation();event.preventDefault();execFoo()').join() === 'execFoo'
    && noms("if(!event.target.closest('button'))execFoo('x')").join() === 'execFoo',
    JSON.stringify([noms('event.preventDefault();execFoo()'),
      noms("if(!event.target.closest('button'))execFoo('x')")]));

  // Le cas qui a fait naître la branche interpolée : un ternaire qui **écrit**
  // ses deux gestes. Les deux sont des gestes de l'écran, et les deux comptent.
  const ternaire = "${actId ? `planUpdateActivity('${actId}')` : `planCreateActivity('${planId}')`}";
  verifier('nommage : un ternaire qui écrit ses deux gestes les nomme tous les deux',
    noms(ternaire).join() === 'planUpdateActivity,planCreateActivity'
    && classer(ternaire).every((g) => g.interpole === true),
    JSON.stringify(noms(ternaire)));

  // ── Le défaut du 11 novembre, et sa forme derrière une garde ──
  const compose = 'event.preventDefault();${_escAttr(repli)}';
  const composeGarde = "if(!event.target.closest('button'))${execEtatsOuvrir(l)}";
  verifier('nommage : un gestionnaire composé au rendu est indécidable, et non « non exercé »',
    seul(compose).indecidable === true && seul(compose).raison === 'composé au rendu'
    && seul(composeGarde).indecidable === true
    && seul(composeGarde).raison === 'composé au rendu'
    // Et surtout : aucun des noms que la source donne n'est retenu. Ni la
    // garde, ni la fonction qui assemble.
    && !noms(compose).includes('_escAttr')
    && !noms(compose).includes('event.preventDefault')
    && !noms(composeGarde).includes('execEtatsOuvrir')
    && !noms(composeGarde).includes('event.target.closest'),
    JSON.stringify([classer(compose), classer(composeGarde)]));

  // ── Sauf si le fichier **écrit** le gestionnaire ailleurs, d'un seul cran ──
  //
  // La doctrine ne bouge pas : on retient ce que l'interpolation écrit, non ce
  // qui l'assemble. Ce qui change, c'est où l'on va le lire — une aide du même
  // fichier dont le corps est un gabarit qui commence par un appel.
  // `execEtatsOuvrir` n'est toujours **pas** retenu ; c'est ce qu'il écrit qui
  // l'est.
  const source = [
    "const execEtatsOuvrir = (l) => `execOpenActiviteProcessus('${l.planId}','${l.activiteId}')`;",
    'function rendu() { return `<tr onclick="${execEtatsOuvrir(l)}">`; }',
  ].join('\n');
  const aides = aidesDeTexte(source);
  verifier('nommage : une aide du même fichier qui écrit un appel rend le geste nommable, et c’est l’appel qu’on retient — non l’aide',
    aides.size === 1 && aides.has('execEtatsOuvrir')
    && classer(composeGarde, aides).map((g) => g.nom).join() === 'execOpenActiviteProcessus'
    && classer(composeGarde, aides)[0].interpole === true
    && classer(composeGarde, aides)[0].indecidable === undefined
    && !classer(composeGarde, aides).some((g) => g.nom === 'execEtatsOuvrir')
    // Sans la carte des aides, rien ne change : l'indirection se lit dans le
    // fichier, elle ne se devine pas.
    && seul(composeGarde).indecidable === true,
    JSON.stringify([[...aides.keys()], classer(composeGarde, aides)]));

  // ── Et l'indirection ne se poursuit pas ──
  //
  // Une aide qui appelle une aide n'est plus quelque chose qu'on lit, c'est
  // quelque chose qu'on exécute. *Une mesure qui se met à exécuter le code
  // qu'elle mesure a changé de métier.*
  const deuxCrans = [
    'const b = (x) => `execCible(\'${x}\')`;',
    'const a = (x) => `${b(x)}`;',
  ].join('\n');
  const aides2 = aidesDeTexte(deuxCrans);
  verifier('nommage : l’indirection d’une aide ne se poursuit pas — deux crans restent indécidables',
    aides2.has('b') && !aides2.has('a')
    && classer('${a(l)}', aides2)[0].indecidable === true,
    JSON.stringify([[...aides2.keys()], classer('${a(l)}', aides2)]));

  // ── Une aide qui n'écrit pas un appel n'est pas une aide ──
  verifier('nommage : un gabarit du même fichier qui n’écrit pas un appel ne sert pas à nommer',
    aidesDeTexte('const etiquette = (x) => `<span>${x}</span>`;').size === 0
    && aidesDeTexte("const chemin = (x) => `/api/m/execution/${x}`;").size === 0,
    JSON.stringify([...aidesDeTexte('const etiquette = (x) => `<span>${x}</span>`;').keys()]));

  // ── Et la ligne qui m'a trompé ──
  //
  // `exec-etats.js — 28/34 occurrences` taisait six indécidables. Elle les dit,
  // et c'est éprouvé ici plutôt que relu : *il ne suffit pas qu'une mesure
  // nomme son unité, il faut qu'elle dise ce qu'elle ne sait pas mesurer.*
  const ligne = (o) => ligneDeFichier(o);
  verifier('relevé : la ligne d’un fichier dit ses indécidables, et se tait quand il n’y en a pas',
    ligne({ exercees: 28, occurrences: 34, indecidables: 6, nomsExerces: 2, noms: 5 })
      === '28/34 occurrences, dont 6 indécidables, 2/5 noms'
    && ligne({ exercees: 65, occurrences: 67, indecidables: 1, nomsExerces: 43, noms: 45 })
      === '65/67 occurrences, dont 1 indécidable, 43/45 noms'
    && ligne({ exercees: 34, occurrences: 34, indecidables: 0, nomsExerces: 25, noms: 25 })
      === '34/34 occurrences, 25/25 noms',
    JSON.stringify([ligne({ exercees: 28, occurrences: 34, indecidables: 6, nomsExerces: 2, noms: 5 }),
      ligne({ exercees: 34, occurrences: 34, indecidables: 0, nomsExerces: 25, noms: 25 })]));

  // ── Ce qu'un littéral **écrit**, en revanche, se pose ──
  const defaut = "${ouvrir || 'rampOuvrirParam'}('${p.id}')";
  verifier('nommage : un littéral seul dans l’interpolation tient sa place, et le texte qui suit complète l’appel',
    noms(defaut).join() === 'rampOuvrirParam',
    JSON.stringify(classer(defaut)));

  // ── Et deux littéraux ne se collent pas ──
  //
  // `execAexecB` n'existe pas. *Une mesure qui invente un nom est pire qu'une
  // mesure qui se tait* : le nom inventé compte « non exercé » pour toujours, et
  // rien ne le rattache à un défaut réel.
  const deux = "${c ? 'execA' : 'execB'}('${id}')";
  verifier('nommage : deux littéraux ne se collent pas en un nom qui n’existe pas',
    seul(deux).indecidable === true
    && !noms(deux).some((n) => /execAexecB/.test(n)),
    JSON.stringify(classer(deux)));

  // ── Les deux silences se distinguent ──
  //
  // Ils ne se corrigent pas de la même façon : l'un demande de nommer le
  // gestionnaire, l'autre de le poser sans l'assembler.
  verifier('nommage : un gestionnaire venu d’ailleurs se dit « sans nom », un gestionnaire assemblé « composé au rendu »',
    seul('${geste}').raison === 'sans nom'
    && seul('${geste(a)}').raison === 'composé au rendu'
    && seul('${geste}').indecidable === true,
    JSON.stringify([seul('${geste}'), seul('${geste(a)}')]));
}

// ── 6 ter. L'adresse par laquelle un destinataire revient ──
//
// Un courriel d'OASIS ne porte jamais de pièce jointe : il annonce des liens, et
// le destinataire les suit depuis son compte. **Ces liens sont donc le courriel
// tout entier**, et une racine fausse ne se voit pas à l'envoi — elle se voit
// chez le prestataire, qui clique sur `http://localhost:4750`.
//
// La règle était écrite **deux fois**, et les deux différaient : `src/email.js`
// lisait `RENDER_EXTERNAL_URL`, `transmission.js` non. Mesuré le 11 novembre
// 2026 sur un serveur portant cette seule variable — l'état exact d'un service
// Render sans domaine propre : le courriel d'ouverture de compte portait la
// bonne adresse, et le rapport transmis annonçait ses documents sur
// `localhost`. Dans l'acte même qui engage l'Autorité.
//
// Ces contrôles tiennent les deux choses que la correction a établies : la règle
// elle-même, et le fait qu'il n'y en ait **qu'une**.
function racinePubliqueDesCourriels() {
  const email = require('../../src/email');
  const avant = { app: process.env.APP_URL, render: process.env.RENDER_EXTERNAL_URL };
  const poser = (app, render) => {
    if (app === undefined) delete process.env.APP_URL; else process.env.APP_URL = app;
    if (render === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = render;
  };
  try {
    // 1. Rien de posé : le poste de développement.
    poser(undefined, undefined);
    verifier('racine : sans variable, l’adresse est celle du poste de développement',
      email.racinePublique() === 'http://localhost:4750'
      && email.lienDeConnexion() === 'http://localhost:4750/login.html',
      `${email.racinePublique()} · ${email.lienDeConnexion()}`);

    // 2. Le cas qui a produit le défaut : l'hébergeur pose son adresse, et
    //    personne ne renseigne APP_URL — ce que `.env.example` déclare suffisant.
    poser(undefined, 'https://oasis-bj.onrender.com');
    verifier('racine : l’adresse posée par l’hébergeur est lue, et « localhost » ne subsiste pas',
      email.racinePublique() === 'https://oasis-bj.onrender.com'
      && !/localhost/.test(email.lienDeConnexion()),
      `${email.racinePublique()} · ${email.lienDeConnexion()}`);

    // 3. APP_URL passe devant, et son suffixe `/login.html` — c'est ainsi que
    //    `.env.example` l'écrit — ne se retrouve pas dans un lien de document.
    poser('https://oasis.exemple.org/login.html', 'https://oasis-bj.onrender.com');
    verifier('racine : APP_URL passe devant, et son « /login.html » n’entre pas dans la racine',
      email.racinePublique() === 'https://oasis.exemple.org'
      && email.lienDeConnexion() === 'https://oasis.exemple.org/login.html',
      `${email.racinePublique()} · ${email.lienDeConnexion()}`);

    // 4. Une barre oblique finale ne doit pas doubler celle du chemin.
    poser('https://oasis.exemple.org/', undefined);
    verifier('racine : une barre oblique finale ne double pas celle du chemin',
      email.racinePublique() === 'https://oasis.exemple.org',
      email.racinePublique());

    // 5. **Une seule règle.** Le garde-fou de la source : `transmission.js` ne
    //    recompose pas l'adresse, il appelle celle-ci. Un contrôle qui ne
    //    regarderait que les valeurs rendues ici laisserait le second calcul
    //    revenir sans rien dire — c'est exactement ce qui s'était produit.
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'modules',
      'execution', 'transmission.js'), 'utf8');
    verifier('racine : la transmission appelle la règle commune, et n’en écrit pas une seconde',
      /const racineApp = courriel\.racinePublique;/.test(source)
      && !/process\.env\.(APP_URL|RENDER_EXTERNAL_URL)/.test(source),
      source.match(/process\.env\.\w+/g)?.join(' · ') || 'aucune lecture d’environnement');

    // 6. Et nul autre fichier du dépôt ne compose cette adresse de son côté.
    //    Le relevé lit les sources : une troisième règle naîtrait silencieuse.
    const racine = path.join(__dirname, '..', '..');
    const parcourir = (dossier, trouves = []) => {
      for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
        const chemin = path.join(dossier, e.name);
        if (e.isDirectory()) parcourir(chemin, trouves);
        else if (e.name.endsWith('.js')) {
          const t = fs.readFileSync(chemin, 'utf8');
          if (/process\.env\.(APP_URL|RENDER_EXTERNAL_URL)/.test(t)) {
            trouves.push(path.relative(racine, chemin));
          }
        }
      }
      return trouves;
    };
    const lecteurs = parcourir(path.join(racine, 'src'));
    verifier('racine : un seul fichier du socle lit APP_URL ou l’adresse de l’hébergeur',
      lecteurs.length === 1 && lecteurs[0] === path.join('src', 'email.js'),
      lecteurs.join(' · ') || 'aucun');
  } finally {
    poser(avant.app, avant.render);
  }
}

// ── 6 bis. La sonde des sauvegardes ──
//
// ADR-001 a différé la bascule vers PostgreSQL en écrivant ce que cela coûte :
// pas de restauration à un instant donné, les archives horodatées pour seul
// recours. Sa suite n° 4 demandait de vérifier la planification — et la vérifier
// une fois, à la main, ne vaut rien : une planification se défait sans bruit, et
// l'application continue de servir parfaitement.
//
// **Le cas qui compte n'est pas « périmée », c'est « je ne vois rien ».** Une
// sonde qui rend « ok » faute de pouvoir regarder est pire que pas de sonde :
// elle fournit l'assurance exacte qu'on n'a pas. Les cinq verdicts sont donc
// distincts, et chacun est éprouvé ici — dont « tronquée », l'archive fraîche
// qui ne vaut rien parce qu'un `tar` s'est interrompu sur un disque plein.
// ── Le nommeur de gestes, éprouvé seul ──
//
// `scripts/relever-gestes.js` décide ce qu'un geste **est** : c'est lui qui
// donne son nom à chaque gestionnaire, du côté statique comme du côté du
// mouchard. Quatre de ses règles sont nées d'un relevé faux, et une cinquième
// le 3 novembre 2026 : il ne connaissait qu'une garde en tête,
// `event.stopPropagation()`. Un gestionnaire ouvert par les **deux** gardes se
// nommait donc `event.preventDefault`, et le geste qui suivait restait
// invisible au relevé — trois gestes de PR existaient, étaient exercés, et
// n'apparaissaient nulle part.
//
// Les contrôles ci-dessous sont le garde de ces règles. Un nommeur qui se
// trompe ne fait pas tomber une suite d'écran : il **déplace un dénominateur**,
// en silence, et c'est le pire des défauts d'un instrument de mesure.
// ── Le relevé figé dit-il encore ce que le script produit ? ──
//
// Les `tests/smoke/gestes-<écran>.json` sont **figés** : ils servent de
// référence à la couverture déclarée, et personne ne les recalcule à chaque
// campagne — le relevé demande cinq suites de navigateur et vingt minutes.
//
// Rien ne disait donc qu'ils correspondaient encore au script. Toucher au
// nommeur et oublier de refiger, c'est porter au dépôt un relevé qui décrit une
// règle qui n'existe plus — et la couverture déclarée s'appuie dessus. Le cas
// s'est présenté le 13 novembre, et il a fallu le vérifier à la main.
//
// Ce qui se compare est la **structure** : fichier, ligne, événement, nom,
// indécidabilité, raison. L'état d'exercice, lui, vient des journaux du
// navigateur et n'a rien à faire ici. `relever` est pur — il lit des fichiers
// et rend une liste —, le contrôle ne coûte donc que des millisecondes.
function releveFige() {
  // eslint-disable-next-line global-require
  const { relever, ECRANS } = require(path.join(__dirname, '..', '..', 'scripts', 'relever-gestes.js'));
  const perimes = [];
  const comptes = [];
  Object.entries(ECRANS).forEach(([quoi, e]) => {
    const chemin = path.join(__dirname, `gestes-${quoi}.json`);
    if (!fs.existsSync(chemin)) return;
    const fige = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    if (fige.sansSuite || !Array.isArray(fige.gestes)) return;
    const sources = typeof e.sources === 'function' ? e.sources() : e.sources;
    const frais = relever(Array.isArray(sources) ? sources : [sources]);
    const cle = (g) => [g.fichier, g.ligne, g.evenement, g.nom,
      g.indecidable === true, g.raison || ''].join('|');
    const a = frais.map(cle).sort();
    const b = fige.gestes.map(cle).sort();
    comptes.push(`${quoi} : ${a.length}`);
    if (a.length !== b.length) {
      perimes.push(`${quoi} : ${b.length} occurrences figées, ${a.length} au relevé frais`);
      return;
    }
    const ecart = a.findIndex((x, i) => x !== b[i]);
    if (ecart >= 0) perimes.push(`${quoi} : figé « ${b[ecart]} », frais « ${a[ecart]} »`);
  });
  verifier('chaque relevé figé décrit encore ce que le nommeur produit aujourd’hui',
    perimes.length === 0,
    perimes.length
      ? `${perimes.join(' · ')} — refiger avec \`node scripts/relever-gestes.js <écran>\``
      : comptes.join(', '));
}

function nommeurDeGestes() {
  // eslint-disable-next-line global-require
  // `nomDuGeste` est l'entrée : c'est elle que les deux côtés appellent, et
  // c'est donc elle qu'il faut éprouver. L'avoir cru porté par
  // `nomDuGestionnaire` seul est ce qui a laissé une asymétrie survivre entre
  // la source et le mouchard.
  const { nomDuGeste: nom } = require('../../scripts/relever-gestes');
  const cas = (titre, entree, attendu) => verifier(`nommeur : ${titre}`,
    nom(entree) === attendu, `${JSON.stringify(entree).slice(0, 70)} → ${nom(entree)}`);

  cas('un appel simple se nomme par lui-même', "mesVoirEtape('suite')", 'mesVoirEtape');
  // Les deux gardes, et l'ordre n'y fait rien.
  cas('les deux gardes en tête se retirent, dans un ordre',
    "event.stopPropagation();event.preventDefault();startConsolidation('x')", 'startConsolidation');
  cas('les deux gardes en tête se retirent, dans l’autre',
    'event.preventDefault();event.stopPropagation();execChkToggleGroup(this)', 'execChkToggleGroup');
  // Quand rien ne suit, la garde **est** le geste : un `dragover` qui ne fait
  // qu'empêcher le défaut n'appelle rien d'autre.
  cas('une garde seule est le geste', 'event.preventDefault();', 'event.preventDefault');
  cas('une garde seule, sans point-virgule, aussi', 'event.preventDefault()', 'event.preventDefault');
  cas('l’autre garde seule de même', 'event.stopPropagation();', 'event.stopPropagation');
  // Une affectation est nommée par sa cible, non par les quarante-huit premiers
  // caractères de son code (n° 5.f.30).
  cas('une affectation se nomme par sa cible',
    'EXEC_STATE.filters.domaine=this.value;execRenderPage()', 'EXEC_STATE.filters.domaine');
  // Une condition n'est pas un geste : le geste est ce qu'elle protège.
  cas('une condition se retire, et l’on nomme ce qu’elle protège',
    "if(!event.target.closest('button'))execEtatsOuvrir('x')", 'execEtatsOuvrir');
  // Deux gestionnaires qui ne diffèrent que par une valeur insérée sont **un**
  // geste : les interpolations se normalisent avant de nommer.
  cas('une interpolation ne multiplie pas les gestes',
    "planUpdateActivity('${actId}')", 'planUpdateActivity');
  // Une déclaration en tête n'est pas le geste : on nomme ce qui suit, et
  // l'interpolation qu'elle porte ne fabrique plus deux noms (n° 5.f.99).
  cas('une déclaration en tête se saute, et l’on nomme ce qui suit',
    "const r=document.getElementById('${id}');r.style.display='';this.classList.toggle('x');", 'r.style.display');
  cas('une déclaration seule se nomme par l’appel qui l’initialise',
    "const x=ouvrir('a')", 'ouvrir');

  // ── La symétrie elle-même, gardée par la forme ──
  //
  // Les cas ci-dessus éprouvent le nommeur ; ils ne diraient rien si l'un des
  // deux côtés cessait de l'appeler. C'est exactement ce qui s'était produit :
  // la source nommait par `nomDuGeste`, le mouchard par `nomDuGestionnaire`, et
  // tout geste qui n'existe que derrière une garde conditionnelle comptait pour
  // non exercé. Un relevé de ce qu'un parcours exerce ne peut pas nommer
  // autrement que le relevé de ce qui existe.
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'relever-gestes.js'), 'utf8');
  verifier('nommeur : les deux côtés nomment par la même fonction',
    !/\.map\(nomDuGestionnaire\)/.test(source)
    && /exerces\.enLigne\.map\(nomDuGeste\)/.test(source),
    'le côté du mouchard doit appeler nomDuGeste, comme le côté de la source');

  // ── Une flèche posée en propriété : le même texte, deux écritures ──
  //
  // La source l'écrit à sa façon ; le navigateur rend `String(fn)`, réimprimé
  // par esbuild pour un écran TypeScript. Les deux doivent donner la même clé,
  // sans quoi le geste pressé compterait pour non exercé (n° 5.f.98).
  const { formeDeFleche: fleche } = require('../../scripts/relever-gestes');
  const ecrite = "(e) => { if (e.key === 'Enter') ok(); }";
  const servie = '(e) => {\n    if (e.key === "Enter") ok();\n  }';
  verifier('nommeur : une flèche écrite et la même servie par esbuild ont une seule clé',
    fleche(ecrite, 'ts') !== null && fleche(ecrite, 'ts') === fleche(servie),
    `${fleche(ecrite, 'ts')} · ${fleche(servie)}`);
  verifier('nommeur : un commentaire dans le corps ne change pas la clé',
    fleche('() => /* x */ go()') === fleche('() => go()'), fleche('() => /* x */ go()'));
  verifier('nommeur : deux flèches qui ne diffèrent que par ce qu’elles appellent restent deux',
    fleche('() => ouvrir(a)') !== fleche('() => fermer(a)'), fleche('() => ouvrir(a)'));
  verifier('nommeur : les deux côtés mettent une flèche en forme par la même fonction',
    /formeDeFleche\(fleche, /.test(source)
    && /formeDeFleche\(String\(v\.source/.test(source),
    'la source et le mouchard doivent passer par formeDeFleche');
}

function sondeDesSauvegardes() {
  // eslint-disable-next-line global-require
  const sauvegardes = require('../../src/sauvegardes');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-sv-'));
  const archive = (nom, octets) => fs.writeFileSync(path.join(dossier, nom), Buffer.alloc(octets));
  const verdict = (opts) => sauvegardes.etat({ dossier, ...opts }).verdict;
  try {
    verifier('sauvegardes : un répertoire absent n’est pas « ok »',
      sauvegardes.etat({ dossier: path.join(dossier, 'nulle-part') }).verdict === 'non_configure');
    verifier('sauvegardes : un répertoire vide n’est pas un répertoire absent',
      verdict() === 'aucune');

    archive('oasis-data-20261003-020000.tgz', 50 * 1024);
    verifier('sauvegardes : une archive fraîche et plausible est « ok »', verdict() === 'ok');
    verifier('sauvegardes : la même, passé le seuil, est « périmée »',
      verdict({ maintenant: Date.now() + 40 * 3600000 }) === 'perimee');
    // Le seuil est réglable, et le contrôle le dit : 26 heures en dur ici aurait
    // fait échouer ce contrôle le jour où l'on passe à des sauvegardes horaires.
    verifier('sauvegardes : le seuil décide, et il se règle',
      verdict({ maintenant: Date.now() + 3 * 3600000, seuilHeures: 2 }) === 'perimee'
      && verdict({ maintenant: Date.now() + 3 * 3600000, seuilHeures: 6 }) === 'ok');

    // Le cas silencieux : récent, donc rassurant, et vide.
    archive('oasis-data-20261003-030000.tgz', 200);
    verifier('sauvegardes : une archive tronquée est dénoncée, non comptée fraîche',
      verdict() === 'tronquee');

    // Et le motif : la sonde ne doit pas prendre n'importe quel `.tgz` pour une
    // sauvegarde du magasin. Le dépôt en porte un — `oasis-config-….tgz` — qui
    // n'en est pas une.
    fs.rmSync(path.join(dossier, 'oasis-data-20261003-030000.tgz'));
    archive('oasis-config-20260917-112155.tgz', 300 * 1024);
    verifier('sauvegardes : une archive qui n’est pas celle du magasin ne compte pas',
      sauvegardes.etat({ dossier }).nombre === 1);

    // Le motif de la sonde et celui du script doivent s'accorder. Un garde-fou
    // de forme le tient aussi ; ici on vérifie que le nom que le script
    // **fabrique** est bien reconnu, et non seulement qu'il est écrit pareil.
    const script = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'sauvegarde.sh'), 'utf8');
    const gabarit = (script.match(/ARCHIVE="[^"]*\/([^"/]+)"/) || [])[1] || '';
    const fabrique = gabarit
      .replace('$DESTINATION', '').replace('$HORODATAGE', '20261003-020000');
    verifier('sauvegardes : le nom que le script fabrique est reconnu par la sonde',
      !!fabrique && sauvegardes.MOTIF.test(fabrique), `${gabarit} → ${fabrique}`);

    // Tout verdict que le module peut rendre doit avoir sa phrase et son niveau.
    // Sans cela, un verdict ajouté plus tard partirait à la trace sous son nom
    // brut, au niveau `info` — c'est-à-dire **silencieusement**, puisque c'est
    // le niveau qu'on ne lit pas. Les trois listes se lisent du module, aucune
    // n'est recopiée ici : une liste recopiée aurait cessé de couvrir le
    // nouveau verdict au moment même où il arrive.
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'sauvegardes.js'), 'utf8');
    const rendus = [...new Set([...source.matchAll(/verdict: '([a-z_]+)'/g)].map((m) => m[1]))].sort();
    const phrases = Object.keys(sauvegardes.PHRASES).sort();
    const niveaux = Object.keys(sauvegardes.NIVEAUX).sort();
    verifier('sauvegardes : chaque verdict a sa phrase et son niveau',
      rendus.length > 0 && rendus.every((v) => phrases.includes(v) && niveaux.includes(v)),
      `rendus ${rendus.join(',')} · phrases ${phrases.join(',')} · niveaux ${niveaux.join(',')}`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
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

// ── Le barème de risque : la conversion d'une instance déjà installée ──
//
// `indices` portait un tableau de six paires `{cle, valeur}` que personne ne
// lisait, quand les six lectures du calcul interrogent un objet
// `{conf1…expo2}`. Adopter le modèle de l'écran (n° 5.f.69) laisse donc, sur
// toute instance installée avant ce jour, une clé au mauvais format.
//
// `seedSeuils` la convertit au démarrage. Deux règles y tiennent, et aucune des
// deux ne se voit par HTTP : elle convertit ce qui doit l'être, et elle ne
// touche **pas** un barème déjà réglé — un semis qui écraserait les seuils de
// l'AAC à chaque redémarrage refondrait le barème de la surveillance en
// silence, ce qui est exactement le défaut qu'on vient de corriger.
//
// La suite écrit dans la vraie collection `profil_risque` du bac, que les
// suites de PR lisent : elle rend donc son état d'avant, quoi qu'il advienne.
async function baremeDeRisque() {
  const db = require('../../src/modules/profil_risque/store');
  const avant = await db.load();
  try {
    // 1. L'ancien modèle : le tableau de paires, converti.
    await db.save({ ...avant, indices: [{ cle: 'poids_conformite', valeur: 0.4 }] });
    await db.seedSeuils();
    const converti = (await db.load()).indices;
    verifier('barème : le tableau de paires de l’ancien modèle devient l’objet à six seuils',
      !!converti && !Array.isArray(converti)
      && db.SEUILS.every((c) => converti[c] === db.SEUILS_DEFAUT[c]),
      JSON.stringify(converti));

    // 2. Un barème réglé par l'AAC : intouché. C'est la règle qui compte.
    const regle = { ...db.SEUILS_DEFAUT, conf1: 0.9, conf2: 0.35 };
    await db.save({ ...(await db.load()), indices: regle });
    await db.seedSeuils();
    const apres = (await db.load()).indices;
    verifier('barème : un barème déjà réglé n’est pas réécrit par le semis',
      apres.conf1 === 0.9 && apres.conf2 === 0.35,
      JSON.stringify(apres));

    // 3. Un barème incomplet — un seuil manquant — est refait en entier : mieux
    // vaut un barème entier aux défauts qu'un `undefined` au milieu d'un calcul
    // de niveau de risque.
    const ampute = { ...db.SEUILS_DEFAUT };
    delete ampute.expo2;
    await db.save({ ...(await db.load()), indices: ampute });
    await db.seedSeuils();
    const refait = (await db.load()).indices;
    verifier('barème : un barème incomplet est refait, jamais laissé troué',
      db.SEUILS.every((c) => typeof refait[c] === 'number'),
      JSON.stringify(refait));

    // 4. Et le domaine complète ce que le magasin ne dit pas : la lecture rend
    // six nombres même si la clé est absente.
    await db.save({ ...(await db.load()), indices: undefined });
    const D = require('../../src/modules/profil_risque/domaine');
    const lu = await D.sharedIndices();
    verifier('barème : la lecture du domaine rend six nombres même sans clé en magasin',
      db.SEUILS.every((c) => lu[c] === db.SEUILS_DEFAUT[c]),
      JSON.stringify(lu));
  } finally {
    await db.save(avant);
  }
}

// ── Les téléchargements que le navigateur suit lui-même ──
//
// Trois règles vivent dans `src/telechargement.js`, et aucune des trois ne se
// voit depuis une ronde de navigateur : le nom d'une pièce dans l'en-tête, la
// page qu'un refus affiche, et le dépôt des pièces préparées. La première parce
// qu'un navigateur normalise ce qu'il enregistre ; la deuxième parce qu'il
// faudrait un compte sans privilège ; la troisième parce qu'elle vit en mémoire
// du serveur.
// ══════════════════════════════════════════════════════════════════════════
//  Le verrou d'une campagne : elle ne double pas une autre
// ══════════════════════════════════════════════════════════════════════════
//
// Chaque suite a son port depuis le 10 novembre 2026, de sorte que deux suites
// différentes tournent ensemble. Deux **campagnes** ne peuvent pas : elles
// jouent les mêmes seize ports, dans le même ordre. Lancée par-dessus une
// campagne en cours, la seconde rougissait sur « le port 48xx répond déjà : un
// autre serveur le tient » — un message qui décrit un **orphelin d'un passage
// interrompu** là où il n'y a que le passage en cours. Fait deux jours de
// suite, et cherché dans le code avant d'être trouvé dans mon impatience.
//
// Le verrou reprend la leçon de `src/verrou.js` : *un verrou qui bloque après un
// arrêt brutal est pire que pas de verrou du tout.* Il demande au système si le
// tenant vit encore, et reprend la place s'il est mort.
//
// Il s'éprouve sur un chemin à lui : celui de la campagne est tenu par la
// campagne qui joue ce contrôle.
function verrouDeCampagne() {
  const V = require('./verrou-campagne');
  const chemin = path.join(BAC, 'essai-verrou-campagne.json');
  const sans = { chemin, poserLesSignaux: false };
  fs.rmSync(chemin, { force: true });

  // ── 1. La place libre se prend, et rien n'est « repris » ──
  const premier = V.prendre(sans);
  verifier('campagne : le verrou se prend quand la place est libre, et ne reprend rien',
    !premier.refus && premier.repris === '' && fs.existsSync(chemin),
    JSON.stringify({ refus: premier.refus || null, repris: premier.repris }));

  // ── 2. Un tenant vivant la refuse, et le refus nomme le remède ──
  const refuse = V.prendre({ ...sans, pid: 999999 });
  verifier('campagne : un tenant vivant refuse la seconde, en nommant son numéro et le remède',
    !!refuse.refus
    && refuse.refus.includes(String(process.pid))
    && /attendre sa fin/.test(refuse.refus) && !/suite seule/.test(refuse.refus)
    && /OASIS_SMOKE_VERROU=0/.test(refuse.refus),
    (refuse.refus || '').slice(0, 120));

  // ── 3. Un tenant mort ne bloque pas, et la reprise se dit ──
  //
  // C'est le cas qui compte : un verrou qui survit à un Ctrl-C rendrait la
  // campagne inlançable, et l'on prendrait l'habitude de l'effacer à la main —
  // après quoi il ne garderait plus rien.
  fs.writeFileSync(chemin, JSON.stringify({ pid: 999999, machine: os.hostname(), depuis: 'hier' }));
  const repris = V.prendre(sans);
  verifier('campagne : un verrou laissé par une campagne morte est repris, et la reprise est annoncée',
    !repris.refus && /ne vit plus/.test(repris.repris || ''),
    JSON.stringify({ refus: repris.refus || null, repris: repris.repris }));

  // ── 4. On ne relâche que le sien ──
  fs.writeFileSync(chemin, JSON.stringify({ pid: 424242, machine: os.hostname(), depuis: 'hier' }));
  repris.relacher();
  verifier('campagne : une campagne qui s’arrête n’emporte pas le verrou d’une autre, repris entre-temps',
    fs.existsSync(chemin) === true);

  // ── 5. Et il se lève en connaissance de cause ──
  const avant = process.env.OASIS_SMOKE_VERROU;
  process.env.OASIS_SMOKE_VERROU = '0';
  const leve = V.prendre(sans);
  if (avant === undefined) delete process.env.OASIS_SMOKE_VERROU;
  else process.env.OASIS_SMOKE_VERROU = avant;
  verifier('campagne : OASIS_SMOKE_VERROU=0 le lève, et ne touche pas au fichier en place',
    !leve.refus && leve.leve === true, JSON.stringify({ leve: leve.leve }));

  // ── 6. Une suite seule consulte, sans prendre (n° 5.f.91) ──
  //
  // Le tenant vivant est le parent de ce processus — `npm`, qui vit tant que
  // ce contrôle tourne. Un mort ne refuse rien ; et consulter n'écrit jamais.
  fs.writeFileSync(chemin, JSON.stringify({ pid: process.ppid, machine: os.hostname(), depuis: 'maintenant' }));
  const empreinteAvant = fs.readFileSync(chemin, 'utf-8');
  const vue = V.consulter({ chemin });
  const intacte = fs.readFileSync(chemin, 'utf-8') === empreinteAvant;
  fs.writeFileSync(chemin, JSON.stringify({ pid: 999999, machine: os.hostname(), depuis: 'hier' }));
  const morte = V.consulter({ chemin });
  const restee = JSON.parse(fs.readFileSync(chemin, 'utf-8')).pid === 999999;
  fs.rmSync(chemin, { force: true });
  const libre = V.consulter({ chemin });
  verifier('campagne : une suite seule refuse de partir sur une campagne vivante, et ne touche jamais au verrou',
    !!vue.refus && vue.refus.includes(String(process.ppid)) && /tous les ports/.test(vue.refus)
    && intacte && !morte.refus && restee && !libre.refus && !fs.existsSync(chemin),
    JSON.stringify({ vue: (vue.refus || '').slice(0, 60), intacte, morte: morte.refus || null,
      restee, libre: libre.refus || null }));
  fs.rmSync(chemin, { force: true });
}

// ══════════════════════════════════════════════════════════════════════════
//  La table des suites : un port par suite, et pas deux
// ══════════════════════════════════════════════════════════════════════════
//
// Sept suites tenaient le port 4797 — `ramp` en HTTP et les six suites de
// navigateur. La campagne les joue l'une après l'autre, de sorte que cela
// marchait ; mais **deux ne pouvaient pas tourner ensemble**, et rien ne le
// disait. On ne pouvait donc ni rejouer une suite seule pendant une campagne,
// ni lancer une contre-épreuve sans attendre la fin de l'essai précédent.
//
// Chacune a désormais son port. Ce contrôle est ce qui l'empêche de régresser :
// *un partage de port est une dépendance invisible entre deux suites, et une
// suite est indépendante ou elle ne l'est pas.*
//
// Il lit `suites.js`, qui ne porte que des chaînes — nom, port, fichier. La
// table était dans le lanceur, construite avec des `require` : la lire chargeait
// les vingt suites, puppeteer compris, et aucun contrôle ne pouvait l'éprouver.
// ── Un refus déclaré, et sa trace en console qui arrive la première ──
//
// Le 15 novembre 2026, `surv-parametres` a rougi une fois en campagne sur
// « Failed to load resource : … 400 » — le 400 qu'elle provoque exprès sur
// l'import d'un classeur sans en-tête. La réponse était déclarée ; la ligne de
// console, arrivée **avant** que Puppeteer ne rende la réponse, ne l'était pas
// encore. Ces contrôles jouent les deux ordres, sans navigateur : un retour à la
// dispense par code seul fait rougir le premier.
function refusEtConsole() {
  const { refusDeclares } = require('./harness');
  const DECL = [{ code: 400, methode: 'POST', chemin: /\/checklists\/[^/]+\/import-xlsx$/ }];
  const TRACE = 'Failed to load resource: the server responded with a status of 400 (Bad Request)';
  const URL_REFUS = 'http://localhost:4807/api/m/execution/checklists/CL-1/import-xlsx';

  // L'ordre de la campagne rouge : la console d'abord, la réponse ensuite.
  const a = refusDeclares(DECL);
  const consoleDabord = a.console(TRACE, URL_REFUS);
  const reponseEnsuite = a.reponse(400, 'POST', '/api/m/execution/checklists/CL-1/import-xlsx');
  verifier('refus déclaré : sa trace en console est dispensée même si elle précède la réponse',
    consoleDabord === true && reponseEnsuite === true,
    JSON.stringify({ consoleDabord, reponseEnsuite }));

  // L'ordre habituel reste dispensé.
  const b = refusDeclares(DECL);
  const r1 = b.reponse(400, 'POST', '/api/m/execution/checklists/CL-1/import-xlsx');
  const c1 = b.console(TRACE, URL_REFUS);
  verifier('refus déclaré : l’ordre habituel, la réponse puis la console, reste dispensé',
    r1 === true && c1 === true, JSON.stringify({ r1, c1 }));

  // La dispense n'est pas plus large que la déclaration : un 400 ailleurs,
  // même après le refus déclaré, garde sa trace — l'ancienne règle le taisait.
  const autre = b.console(TRACE, 'http://localhost:4807/api/m/execution/exec-checklist-items');
  const autreCode = b.console(TRACE.replace('400 (Bad Request)', '409 (Conflict)'), URL_REFUS);
  const autreMethode = b.reponse(400, 'PUT', '/api/m/execution/checklists/CL-1/import-xlsx');
  verifier('refus déclaré : un autre chemin, un autre code ou une autre méthode restent des incidents',
    autre === false && autreCode === false && autreMethode === false,
    JSON.stringify({ autre, autreCode, autreMethode }));

  // Sans adresse, la seule règle disponible : le code d'une réponse déjà vue.
  const c = refusDeclares(DECL);
  const sansAdresseAvant = c.console(TRACE, '');
  c.reponse(400, 'POST', '/api/m/execution/checklists/CL-1/import-xlsx');
  const sansAdresseApres = c.console(TRACE, '');
  verifier('refus déclaré : sans adresse en console, on retombe sur le code d’une réponse déjà vue',
    sansAdresseAvant === false && sansAdresseApres === true && c.console('autre erreur', '') === false,
    JSON.stringify({ sansAdresseAvant, sansAdresseApres }));
}

function tableDesSuites() {
  const { SUITES, choisir } = require('./suites');

  verifier('suites : la table en porte trente-trois, et chacune dit son nom, son port et son fichier',
    SUITES.length === 33
    && SUITES.every((s) => typeof s.nom === 'string' && s.nom.length > 2
      && Number.isInteger(s.port) && typeof s.fichier === 'string'),
    `${SUITES.length} suites`);

  // ── Aucun port partagé ──
  const avecPort = SUITES.filter((s) => s.port !== 0);
  const parPort = new Map();
  avecPort.forEach((s) => {
    if (!parPort.has(s.port)) parPort.set(s.port, []);
    parPort.get(s.port).push(s.nom);
  });
  const partages = [...parPort.entries()].filter(([, noms]) => noms.length > 1)
    .map(([port, noms]) => `${port} : ${noms.join(', ')}`);
  verifier('suites : aucune suite ne partage son port avec une autre',
    partages.length === 0, partages.join(' · '));

  // ── Les noms sont uniques, et ceux que le relevé lance sont sans équivoque ──
  //
  // Le filtre de `npm run smoke -- <mot>` retient les suites dont le nom
  // **contient** le mot. Qu'un nom en contienne un autre est donc voulu :
  // `-- ramp` joue les deux suites du module, HTTP et navigateur, et c'est
  // commode.
  //
  // ── Ce que j'ai cru garder, et ce qu'il faut garder ──
  //
  // Premier jet : « aucun nom n'est contenu dans un autre ». Il a rougi sur
  // cinq paires **voulues** — `ramp` dans `ramp-navigateur`, et quatre comme
  // elle. L'assertion était écrite par analogie avec le commentaire du lanceur,
  // non depuis la règle.
  //
  // La règle est plus étroite : `scripts/relever-gestes.js` lance la suite d'un
  // écran **par son nom**, et attend d'en jouer une seule. Ce sont donc les
  // noms qu'il nomme qui doivent être sans équivoque — chacun ne doit
  // sélectionner que lui-même. *Un contrôle écrit par analogie éprouve
  // l'analogie, non la règle.*
  //
  // ── Et le même contrôle avait failli se tromper une seconde fois ──
  //
  // Il décidait de l'équivoque par **sa propre** règle — « le nom est contenu
  // dans un seul » —, quand le lanceur a la sienne. Le découpage de SURV a
  // séparé les deux : `surv` est contenu dans `surv-pieces`, et le lanceur
  // donne pourtant la priorité au nom exact, de sorte que `-- surv` ne désigne
  // qu'une suite. Le contrôle aurait rougi sur un lanceur juste.
  //
  // Il appelle donc `choisir`, **la** fonction du lanceur. Une règle, un
  // endroit.
  const noms = SUITES.map((s) => s.nom);
  verifier('suites : les noms sont uniques',
    new Set(noms).size === noms.length, noms.join(','));
  // Les noms que le relevé emploie, lus dans l'outil plutôt que recopiés : une
  // liste recopiée se tairait le jour où l'outil en nommerait un autre. Lus
  // dans sa **table**, et non par un motif sur sa source : `suite` accepte
  // désormais une liste, et une expression régulière cherchant `suite: '…'`
  // n'aurait plus rien trouvé — le dénominateur se serait tu.
  // eslint-disable-next-line global-require
  const { ECRANS } = require(path.join(__dirname, '..', '..', 'scripts', 'relever-gestes.js'));
  const lances = [...new Set(Object.values(ECRANS)
    .flatMap((e) => (Array.isArray(e.suite) ? e.suite : [e.suite]))
    .filter(Boolean))];
  verifier('suites : tous les noms que le relevé lance sont dans la table',
    lances.length >= 7 && lances.every((n) => noms.includes(n)),
    `${lances.length} : ${lances.join(', ')}`);
  const equivoques = lances.filter((n) => choisir(SUITES, n).length !== 1);
  verifier('suites : chaque nom que le relevé lance ne sélectionne que sa propre suite',
    equivoques.length === 0,
    equivoques.map((n) => `${n} → ${choisir(SUITES, n).map((s) => s.nom).join('+')}`).join(' · '));
  // ── Et la règle du lanceur elle-même : l'exact l'emporte ──
  //
  // Sans elle, `-- surv` lancerait les deux suites de SURV et le relevé des
  // gestes écraserait le journal de la première. Avec elle, une famille se
  // lance toujours par un fragment commun.
  verifier('suites : un nom exact désigne sa seule suite, un fragment désigne la famille',
    choisir(SUITES, 'surv').length === 1
    && choisir(SUITES, 'surv')[0].nom === 'surv'
    && choisir(SUITES, 'surv-pieces').length === 1
    && choisir(SUITES, 'navigateur').length >= 5
    && choisir(SUITES, '').length === SUITES.length,
    `surv → ${choisir(SUITES, 'surv').map((s) => s.nom).join('+')}`
    + ` · navigateur → ${choisir(SUITES, 'navigateur').length}`);

  // ── Les ports restent hors de ce qui est déjà pris ──
  //
  // 4750 est le serveur de développement, 4850 et au-delà la passerelle de
  // `scripts/passerelle.js` — y empiéter ferait rougir une suite pour une
  // raison qui n'est pas la sienne.
  const horsPlage = avecPort.filter((s) => s.port < 4790 || s.port > 4849);
  verifier('suites : les ports tiennent dans 4790–4849 — ni le serveur de développement, ni la passerelle',
    horsPlage.length === 0, horsPlage.map((s) => `${s.nom}:${s.port}`).join(', '));

  // ── Chaque fichier déclaré existe ──
  const absents = SUITES.filter((s) => !fs.existsSync(
    path.join(__dirname, `${s.fichier.replace(/^\.\//, '')}.js`)));
  verifier('suites : chaque fichier déclaré existe',
    absents.length === 0, absents.map((s) => s.fichier).join(', '));

  // ── Et aucun fichier de suite n'est absent de la table ──
  //
  // Une suite écrite et jamais inscrite ne tourne nulle part. Le relevé des
  // gestes a connu l'inverse — un écran ajouté sans suite —, et c'est la même
  // faute dans l'autre sens.
  const declares = new Set(SUITES.map((s) => `${s.fichier.replace(/^\.\//, '')}.js`));
  const surLeDisque = fs.readdirSync(__dirname).filter((f) => f.endsWith('.smoke.js'));
  const orphelins = surLeDisque.filter((f) => !declares.has(f));
  verifier('suites : aucun fichier de suite n’est absent de la table',
    orphelins.length === 0, orphelins.join(', '));
}

function telechargements() {
  const T = require('../../src/telechargement');

  // ── 1. Le nom, dans les deux formes de la RFC 6266 ──
  //
  // Un nom hors de l'ASCII ne tient pas dans un `filename="…"`. Le dépôt
  // portait une **troisième** forme, hybride et fausse —
  // `filename="${encodeURIComponent(nom)}"` —, qui faisait enregistrer
  // « Rapport%20d%27audit » au lieu de « Rapport d'audit ».
  const accentue = T.dispositionDe('Rapport d’audit — été 2026.pdf');
  const encode = accentue.split("UTF-8''")[1];
  verifier('pièce : le nom accentué se rend dans les deux formes, et la forme encodée est réversible',
    /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/.test(accentue)
    && decodeURIComponent(encode) === 'Rapport d’audit — été 2026.pdf'
    // Aucun caractère hors ASCII dans le repli : c'est tout son objet.
    && !/[^\x20-\x7e]/.test(accentue.split('"')[1]),
    accentue);

  // L'apostrophe sépare les champs de `filename*` (`UTF-8''valeur`) : laissée
  // telle quelle par `encodeURIComponent`, elle y est pourtant interdite — et un
  // nom de fichier français en porte souvent une.
  verifier('pièce : l’apostrophe et les caractères que la RFC 5987 interdit sont encodés',
    !/UTF-8''[^;]*['()*!~]/.test(T.dispositionDe("Rapport d'audit (2026)~!.pdf")),
    T.dispositionDe("Rapport d'audit (2026)~!.pdf"));

  // Un guillemet refermerait le repli ; un saut de ligne ouvrirait un second
  // en-tête. Les deux sortent.
  const hostile = T.dispositionDe('a"b\r\nSet-Cookie: x=1');
  verifier('pièce : un guillemet et un saut de ligne ne sortent pas de l’en-tête',
    !/["\r\n]/.test(hostile.split('filename="')[1].split('";')[0])
    && !/[\r\n]/.test(hostile),
    hostile);

  verifier('pièce : un nom vide retombe sur « document », et `inline` se dit',
    /^attachment; filename="document"/.test(T.dispositionDe(''))
    && /^inline; /.test(T.dispositionDe('a.pdf', { inline: true })),
    `${T.dispositionDe('')} | ${T.dispositionDe('a.pdf', { inline: true })}`);

  // ── 2. La page qu'un refus affiche ──
  //
  // Quand le navigateur suit l'ancre, il **affiche** la réponse : un
  // `{"error":"privilege_insuffisant"}` dans un onglet nu n'est pas une réponse
  // à un agent qui attendait un fichier. Le discriminant est l'en-tête du socle,
  // qu'un appel d'API pose toujours et qu'une navigation ne porte jamais.
  const fausseReq = (entetes) => ({ entetes, get(k) { return this.entetes[k]; } });
  const fausseRes = (statut) => ({
    statusCode: statut, entetes: {}, corps: null,
    setHeader(k, v) { this.entetes[k] = v; },
    send(b) { this.corps = b; return this; },
    json(b) { this.corps = b; return this; },
  });
  const refus = (statut, corps, entetes = {}) => {
    const req = fausseReq(entetes);
    const res = fausseRes(statut);
    T.pageDeRefus(req, res, () => {});
    res.json(corps);
    return res;
  };

  const vueNavigation = refus(403, { error: 'privilege_insuffisant' });
  verifier('refus : une navigation reçoit une page lisible, qui dit le cas et garde le code brut',
    /text\/html/.test(vueNavigation.entetes['Content-Type'] || '')
    && /<!doctype html>/i.test(vueNavigation.corps)
    && /droit de télécharger/.test(vueNavigation.corps)
    && /403 privilege_insuffisant/.test(vueNavigation.corps),
    String(vueNavigation.corps).slice(0, 160));

  const vueApi = refus(403, { error: 'privilege_insuffisant' }, { 'X-OASIS-Request': '1' });
  verifier('refus : un appel de l’application garde son JSON, que l’écran traduit déjà',
    typeof vueApi.corps === 'object' && vueApi.corps.error === 'privilege_insuffisant'
    && !vueApi.entetes['Content-Type'],
    JSON.stringify(vueApi.corps));

  // Une réponse de succès ne doit pas être touchée : le middleware est posé sur
  // des routes qui servent **aussi** du JSON de succès.
  const succes = refus(200, { ok: true });
  verifier('refus : une réponse de succès n’est pas mise en page',
    typeof succes.corps === 'object' && succes.corps.ok === true,
    JSON.stringify(succes.corps));

  // Les cinq phrases tiennent au **statut**, non au code du refus : les codes
  // normalisés ont leurs phrases dans les trois langues du côté du socle, et
  // recopier cette table ici en ferait une seconde, qui divergerait.
  const phrases = [401, 403, 404, 413, 500, 418]
    .map((s) => String(refus(s, { error: 'x' }).corps).match(/<p>([^<]*)<\/p>/)[1]);
  verifier('refus : chaque statut a sa phrase, le serveur a la sienne, et un statut inattendu ne reste pas muet',
    new Set(phrases.slice(0, 5)).size === 5 && phrases.every((p) => p.length > 20)
    && /session a expiré/.test(phrases[0]) && /serveur n’a pas pu/.test(phrases[4]),
    phrases.join(' | ').slice(0, 220));

  // ── 3. Le dépôt des pièces préparées ──
  //
  // Un POST ne peut pas être une navigation : le garde d'origine (SEC-06)
  // refuse une écriture sans `X-OASIS-Request`, en-tête qu'un formulaire de
  // navigation ne peut pas poser. Le POST dépose donc, et la page navigue.
  const jeton = T.deposer({
    contenu: Buffer.from('classeur'), nom: 'a.xlsx', type: 'app/x', utilisateur: 'moi@anac.bj',
  });
  const autre = fausseRes(200);
  verifier('pièce préparée : un jeton ne sert pas à un autre compte',
    T.servir(autre, jeton, 'toi@anac.bj') === false && autre.corps === null);

  const mienne = fausseRes(200);
  verifier('pièce préparée : elle se sert au compte qui l’a déposée, avec son nom',
    T.servir(mienne, jeton, 'moi@anac.bj') === true
    && String(mienne.corps) === 'classeur'
    && /filename="a\.xlsx"/.test(mienne.entetes['Content-Disposition'] || ''),
    JSON.stringify(mienne.entetes));

  verifier('pièce préparée : elle ne se sert qu’une fois, et un jeton inconnu ne sert rien',
    T.servir(fausseRes(200), jeton, 'moi@anac.bj') === false
    && T.servir(fausseRes(200), 'jeton-qui-n-existe-pas', 'moi@anac.bj') === false);

  // Un jeton de seize octets, tiré au hasard : deux dépôts ne se rencontrent pas.
  const jetons = new Set();
  for (let i = 0; i < 50; i += 1) {
    jetons.add(T.deposer({ contenu: Buffer.alloc(1), nom: 'x', type: 'x', utilisateur: 'u' }));
  }
  verifier('pièce préparée : les jetons ne se répètent pas et ne se devinent pas',
    jetons.size === 50 && [...jetons].every((j) => /^[0-9a-f]{32}$/.test(j)),
    `${jetons.size} jetons distincts`);
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
    racinePubliqueDesCourriels();
    nommageDesGestes();
    releveFige();
    verrouDuRepertoire();
    await vecteursDeMigration();
    conservation();
    barreDeRamp();
    await compteurDuSecondFacteur();
    await annuaireDesComptes();
    repertoireNonFige();
    await retraitSansDestruction();
    await magasins();
    await facadeDuMagasin();
    sondeDesSauvegardes();
    nommeurDeGestes();
    await baremeDeRisque();
    telechargements();
    refusEtConsole();
    tableDesSuites();
    verrouDeCampagne();
  } finally {
    // Ce que les contrôles ont écrit s'efface **dans le bac, et nulle part
    // ailleurs**. Ce nettoyage balayait aussi le vrai `data/` — façon de vivre
    // avec la fuite plutôt que de la corriger, et qui ne couvrait de toute façon
    // que trois noms d'essai, jamais `users`. Le lanceur efface le bac entier et
    // relève toute écriture dans les données de travail.
    ['essai_contrat', COLL_ESSAI, COLL_RETRAIT, 'essai_journal'].forEach((nom) => {
      fs.rmSync(path.join(BAC, `${nom}.json`), { force: true });
      fs.rmSync(path.join(BAC, `${nom}.jsonl`), { force: true });
    });
  }
  assert.ok(true);
  return bilan('Unitaires');
};
