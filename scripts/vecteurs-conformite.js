#!/usr/bin/env node
// OASIS — Les vecteurs que la réécriture Java devra satisfaire.
//
// ADR-002 engage la réécriture du socle en Java 21 / Spring Boot. Deux
// mécanismes s'y jouent à l'octet près, et une erreur d'un seul bit n'y
// produit aucune exception — seulement un système qui ne reconnaît plus ses
// propres données :
//
//   1. **scrypt** — si Java ne reproduit pas exactement les paramètres de
//      Node, plus personne ne se connecte. Pas un message d'erreur : un refus
//      universel, et on cherche ailleurs pendant deux jours.
//
//   2. **La chaîne SHA-256 du journal d'audit** — si la sérialisation diffère
//      d'un espace, d'un ordre de clés ou d'un échappement, `verifyChain()`
//      déclare faux tout l'historique. La garantie d'inaltérabilité du §F.3
//      tombe, et elle tombe *sur les données existantes*.
//
// Ce fichier fige les deux contrats en vecteurs vérifiables. La suite de fumée
// les rejoue contre l'implémentation Node à chaque exécution : ils ne peuvent
// donc pas se périmer en silence. Le jour où le Java existe, il doit les
// satisfaire tous — c'est sa recette d'entrée, écrite avant lui.
//
//   node scripts/vecteurs-conformite.js            vérifie les vecteurs
//   node scripts/vecteurs-conformite.js --ecrire   les régénère
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FICHIER = path.join(__dirname, '..', 'tests', 'conformite', 'vecteurs.json');

// ── Les deux fonctions, reprises telles qu'elles sont en service ──
// Recopiées et non importées : un vecteur doit décrire le calcul, non
// l'appeler. S'il importait le code, il vérifierait qu'il est égal à lui-même.
const scryptCommeNode = (motDePasse, sel) =>
  crypto.scryptSync(motDePasse, sel, 64).toString('hex');

const empreinteEntree = (precedent, e) => crypto
  .createHash('sha256')
  .update(`${precedent}|${e.ts}|${e.user}|${e.action}|${JSON.stringify(e.details || {})}`)
  .digest('hex');

// ── Les cas, choisis pour ce qu'ils cassent ──
const CAS_SCRYPT = [
  {
    quoi: 'cas ordinaire',
    motDePasse: 'Aerosup@2026!Uemoa',
    sel: '4f3a1b8e9c2d7a6f5e4d3c2b1a098765',
  },
  {
    quoi: 'accents et espace — le mot de passe est encodé en UTF-8, non en Latin-1',
    motDePasse: 'Bénin Sécurité@2026',
    sel: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  },
  {
    quoi: 'hors du plan multilingue de base — deux unités de code pour un signe',
    motDePasse: 'Aéroport✈2026!Cotonou',
    sel: '00112233445566778899aabbccddeeff',
  },
];

const CAS_CHAINE = [
  {
    quoi: 'entrée sans détail',
    precedent: 'AEROSUP-GENESIS',
    entree: { ts: '2026-09-26T08:00:00.000Z', user: 'superadmin@anac.bj', action: 'LOGIN', details: {} },
  },
  {
    quoi: 'accents dans les valeurs — JSON.stringify ne les échappe pas',
    precedent: 'AEROSUP-GENESIS',
    entree: {
      ts: '2026-09-26T08:01:00.000Z', user: 'm.ahoyo@anac.bj', action: 'INSTANCE_CHANGEE',
      details: { de: 'Bénin', vers: "Côte d'Ivoire" },
    },
  },
  {
    quoi: 'barre oblique — JSON.stringify ne l’échappe pas, contrairement à certains sérialiseurs',
    precedent: 'AEROSUP-GENESIS',
    entree: {
      ts: '2026-09-26T08:02:00.000Z', user: 'admin@anac.bj', action: 'CONSULTATION',
      details: { nature: 'personnel', dossier: '/api/referentiels/inspecteurs' },
    },
  },
  {
    quoi: 'ORDRE DES CLÉS — les clés entières passent devant, triées numériquement',
    precedent: 'AEROSUP-GENESIS',
    entree: {
      ts: '2026-09-26T08:03:00.000Z', user: 'admin@anac.bj', action: 'ESSAI_ORDRE',
      details: { b: 'deux', 10: 'dix', a: 'un', 2: 'deux', 1: 'un' },
    },
    // Ce cas ne s'éprouve pas depuis `details` : JavaScript réordonne les clés
    // entières **dès la création de l'objet**, et le fichier porte donc déjà
    // l'ordre corrigé. Une implémentation qui s'y fierait passerait par
    // accident, sans jamais appliquer la règle.
    //
    // D'où cette liste de paires, volontairement dans le désordre : c'est
    // d'ELLE que la réécriture doit partir, et c'est en la ramenant à
    // `json_attendu` qu'elle démontre qu'elle a compris la règle.
    desordre: [['b', 'deux'], ['10', 'dix'], ['a', 'un'], ['2', 'deux'], ['1', 'un']],
  },
  {
    quoi: 'objet imbriqué et liste',
    precedent: '6b33940a522a80a631312076bbafceed0dfd99cbfdf4674791c8dab386782fe2',
    entree: {
      ts: '2026-09-26T08:04:00.000Z', user: 'superadmin@anac.bj', action: 'RETENTION_APPLIQUEE',
      details: { actes: [{ collection: 'emails', retirees: 2 }, { collection: 'audit', archivees: 12 }] },
    },
  },
  {
    quoi: 'guillemets, retour à la ligne et tabulation dans une valeur',
    precedent: 'AEROSUP-GENESIS',
    entree: {
      ts: '2026-09-26T08:05:00.000Z', user: 'admin@anac.bj', action: 'ERREUR_SERVEUR',
      details: { message: 'il a dit "non"\net puis\tplus rien' },
    },
  },
];

function calculer() {
  return {
    apropos: {
      objet: "Contrat d'octets que toute réécriture du socle doit satisfaire (ADR-002).",
      produit_par: 'scripts/vecteurs-conformite.js',
      // Aucune date ici : elle changerait à chaque régénération et ferait du
      // bruit dans les différences sans rien dire de plus.
    },
    scrypt: {
      contrat: {
        algorithme: 'scrypt (RFC 7914)',
        N: 16384, r: 8, p: 1, keylen: 64,
        // Le piège n° 1. Node reçoit le sel en **chaîne** et l'encode en UTF-8 :
        // les octets salés sont les 32 caractères ASCII de l'hexadécimal, et
        // non les 16 octets qu'il représente. Une implémentation qui décode
        // l'hexadécimal produit un tout autre condensé — et refuse tout le monde.
        sel: "la chaîne hexadécimale elle-même, encodée en UTF-8 (32 octets ASCII), JAMAIS l'hexadécimal décodé",
        motDePasse: 'encodé en UTF-8',
        sortie: 'hexadécimal minuscule, 128 caractères',
        stockage: '{ salt: <hex 32>, hash: <hex 128> } sur l’enregistrement du compte',
        comparaison: 'à temps constant (crypto.timingSafeEqual sur les chaînes hexadécimales)',
      },
      cas: CAS_SCRYPT.map((c) => ({ ...c, attendu: scryptCommeNode(c.motDePasse, c.sel) })),
    },
    chaine: {
      contrat: {
        algorithme: 'SHA-256',
        // Le piège n° 2. La chaîne d'entrée est une concaténation à la barre
        // verticale, et le dernier morceau est le détail sérialisé en JSON.
        formule: 'sha256( prevHash + "|" + ts + "|" + user + "|" + action + "|" + json(details) )',
        genese: { socle: 'AEROSUP-GENESIS', modules: 'OASIS-MODULE-GENESIS' },
        json: [
          'Sémantique de JSON.stringify de JavaScript, et non celle de Jackson par défaut.',
          'Aucun espace : ni après « : », ni après « , ».',
          'Ordre des clés : celui de l’insertion, MAIS les clés qui sont des entiers passent devant, triées numériquement.',
          'Un cas porte un champ « desordre » : partir de CETTE liste de paires, non de « details » — le fichier porte déjà l’ordre corrigé, et s’y fier ferait passer le contrôle sans appliquer la règle.',
          'Les caractères non ASCII ne sont pas échappés — « Bénin » s’écrit tel quel, en UTF-8.',
          'La barre oblique « / » n’est pas échappée.',
          'Échappés : guillemet, contre-oblique, et les commandes (\\n, \\t, \\r, \\b, \\f, \\uXXXX).',
        ],
        sortie: 'hexadécimal minuscule, 64 caractères',
      },
      cas: CAS_CHAINE.map((c) => ({
        ...c,
        json_attendu: JSON.stringify(c.entree.details || {}),
        attendu: empreinteEntree(c.precedent, c.entree),
      })),
    },
  };
}

function verifier() {
  if (!fs.existsSync(FICHIER)) {
    console.error(`vecteurs absents — les produire : node ${path.relative(process.cwd(), __filename)} --ecrire`);
    process.exit(1);
  }
  const fige = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  const vif = calculer();
  const ecarts = [];
  fige.scrypt.cas.forEach((c, i) => {
    const attendu = (vif.scrypt.cas[i] || {}).attendu;
    if (c.attendu !== attendu) ecarts.push(`scrypt[${i}] « ${c.quoi} »`);
  });
  fige.chaine.cas.forEach((c, i) => {
    const v = vif.chaine.cas[i] || {};
    if (c.attendu !== v.attendu) ecarts.push(`chaîne[${i}] « ${c.quoi} » — empreinte`);
    if (c.json_attendu !== v.json_attendu) ecarts.push(`chaîne[${i}] « ${c.quoi} » — sérialisation`);
  });
  return ecarts;
}

if (require.main === module) {
  if (process.argv.includes('--ecrire')) {
    fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
    fs.writeFileSync(FICHIER, `${JSON.stringify(calculer(), null, 2)}\n`);
    console.log(`vecteurs écrits : ${path.relative(process.cwd(), FICHIER)}`);
  } else {
    const ecarts = verifier();
    if (ecarts.length) {
      console.error('VECTEURS PÉRIMÉS — le code a changé sous eux :');
      ecarts.forEach((e) => console.error(`  · ${e}`));
      process.exit(1);
    }
    console.log('vecteurs conformes à l’implémentation en service');
  }
}

module.exports = { calculer, verifier, FICHIER };
