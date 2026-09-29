// OASIS — Durées de conservation et purge (fiche technique §5.2).
//
// « Durées de conservation paramétrables par catégorie de données, avec purge
// ou archivage automatisé à échéance ». Jusqu'ici rien n'expirait : le journal
// des envois gardait des messages d'août, les notifications s'empilaient sans
// fin, et personne n'aurait su dire combien de temps l'application conserve
// quoi — ce qui est la première question d'un contrôle.
//
// ── Trois actions, et une qui n'existe pas ──
//
//   purge      Les entrées échues sont retirées. Pour ce que l'application
//              produit pour son propre compte : envois, notifications,
//              sessions, défis d'authentification.
//
//   archive    Les entrées échues sortent dans un fichier horodaté, et le
//              journal reste entier. C'est la seule action possible sur les
//              journaux d'audit.
//
//   conserver  Rien n'est fait automatiquement. Pour les actes d'autorité —
//              inspections, constatations, mesures d'application. Leur durée
//              légale n'est pas dans les TDR, et un logiciel qui effacerait de
//              lui-même un acte de surveillance serait une faute, non une
//              fonctionnalité. L'échéance est signalée, la décision est humaine.
//
// ── Ce qui est interdit, et pourquoi ce n'est pas un réglage ──
//
// **Un journal d'audit ne se purge pas.** Retirer une entrée rompt la chaîne
// SHA-256 : `verifyChain()` le dirait aussitôt, et la garantie d'inaltérabilité
// du §F.3 tomberait avec elle. Le paramétrage ne peut donc pas demander la
// purge d'un journal — `politique()` refuse la valeur plutôt que de l'appliquer.
// Ce n'est pas une précaution d'usage : c'est la différence entre un journal
// d'autorité et un fichier de traces.
const fs = require('fs');
const path = require('path');
// Tout passe par la façade : elle sait, collection par collection, si la donnée
// vit dans un fichier ou dans la base (ADR-002, étape B).
const magasin = require('./magasin');
const horloge = require('./horloge');

const JOUR_MS = 24 * 60 * 60 * 1000;

// Les journaux chaînés, qu'aucun réglage ne peut mettre en purge.
const JOURNAUX = new Set(['audit', 'module_audit']);

// La politique par défaut. Chaque entrée dit la durée, l'action, où lire la
// date de l'entrée, et pourquoi cette durée — un chiffre sans motif ne se
// défend pas devant une autorité de contrôle.
const DEFAUT = {
  emails: {
    jours: 90, action: 'purge', forme: 'liste', champ: 'ts',
    motif: "Journal des envois : preuve de bonne remise d'un code ou d'un mot de passe temporaire. Au-delà d'un trimestre, il ne prouve plus rien et ne fait que conserver des adresses.",
  },
  notifications: {
    jours: 365, action: 'purge', forme: 'liste', champ: 'ts',
    motif: "Avis d'écran, sans valeur probante. Un an couvre le cycle annuel de surveillance.",
  },
  sessions: {
    jours: 1, action: 'purge', forme: 'table', champ: 'lastActivity',
    motif: "Une session expire en trente minutes d'inactivité ; ce qui reste au-delà d'un jour est un résidu.",
  },
  mfa_challenges: {
    jours: 1, action: 'purge', forme: 'table', champ: 'expire',
    motif: 'Un code à usage unique vaut dix minutes. Au-delà d’un jour, le défi est mort depuis longtemps.',
  },
  audit: {
    jours: 3650, action: 'archive', forme: 'journal', champ: 'ts',
    motif: "Journal d'audit du socle (§F.3). Dix ans : la durée de conservation des actes de surveillance qu'il retrace. Archivé, jamais purgé — retirer une entrée romprait la chaîne.",
  },
  module_audit: {
    jours: 3650, action: 'archive', forme: 'journal', champ: 'ts',
    motif: "Journal d'audit des modules. Même règle que celui du socle.",
  },
  execution: {
    jours: 3650, action: 'conserver', forme: 'opaque',
    motif: "Actes de surveillance. Durée légale non fixée par les TDR ; l'échéance est signalée, l'effacement reste une décision de l'autorité.",
  },
  mesures: {
    jours: 3650, action: 'conserver', forme: 'opaque',
    motif: "Mesures d'application — décisions d'autorité. Même règle.",
  },
  planification: {
    jours: 3650, action: 'conserver', forme: 'opaque',
    motif: 'Plans de surveillance en vigueur et leurs versions remplacées. Même règle.',
  },
  profil_risque: {
    jours: 3650, action: 'conserver', forme: 'opaque',
    motif: "Profils de risque des exploitants — ils fondent la programmation. Même règle.",
  },
  ramp: {
    jours: 3650, action: 'conserver', forme: 'opaque',
    motif: "Inspections sur aire de trafic et écarts relevés. Même règle.",
  },
};

// La politique appliquée : le défaut, corrigé par le paramétrage, et purgé de
// ce qui n'a pas le droit d'être demandé.
function politique(config) {
  const regles = {};
  const surcharge = (config && config.retention) || {};
  for (const [nom, base] of Object.entries(DEFAUT)) {
    const sur = surcharge[nom] || {};
    const jours = Number(sur.jours) > 0 ? Number(sur.jours) : base.jours;
    let action = String(sur.action || base.action);
    let refus = '';
    if (JOURNAUX.has(nom) && action === 'purge') {
      // Refusé, et dit : un paramétrage silencieusement ignoré est pire qu'une
      // erreur, il laisse croire que la demande a été prise.
      refus = "purge refusée sur un journal chaîné : elle romprait la chaîne SHA-256 du §F.3 — l'action reste « archive »";
      action = 'archive';
    }
    if (!['purge', 'archive', 'conserver'].includes(action)) {
      refus = `action « ${action} » inconnue — « conserver » appliqué`;
      action = 'conserver';
    }
    regles[nom] = { ...base, jours, action, ...(refus ? { refus } : {}) };
  }
  return regles;
}

// Les entrées d'une collection, selon la forme du magasin, réduites à leur date.
//
// Asynchrone depuis qu'une collection ou un journal peut vivre en base
// (ADR-002, étape B) : tout passe par la façade, qui sait lequel des deux
// régimes sert.
async function dates(nom, regle) {
  const lire = {
    liste: async () => (await magasin.load(nom, [])).map((e) => e && e[regle.champ]),
    table: async () => Object.values(await magasin.load(nom, {})).map((e) => e && e[regle.champ]),
    journal: async () => (await magasin.journalLire(nom)).map((e) => e && e[regle.champ]),
    opaque: async () => [],
  }[regle.forme] || (async () => []);
  return (await lire())
    .map((v) => (typeof v === 'number' ? v : Date.parse(v)))
    .filter((t) => Number.isFinite(t));
}

// L'état de la conservation, sans rien modifier. C'est ce que rend la route de
// consultation et ce que l'exécution à blanc affiche.
async function etat(config, maintenant = Date.now()) {
  const regles = politique(config);
  const lignes = [];
  for (const [nom, r] of Object.entries(regles)) {
    const limite = maintenant - r.jours * JOUR_MS;
    const ts = await dates(nom, r);
    const echues = ts.filter((t) => t < limite).length;
    lignes.push({
      collection: nom,
      jours: r.jours,
      action: r.action,
      motif: r.motif,
      ...(r.refus ? { refus: r.refus } : {}),
      entrees: r.forme === 'opaque' ? null : ts.length,
      echues: r.forme === 'opaque' ? null : echues,
      plusAncienne: ts.length ? new Date(Math.min(...ts)).toISOString() : null,
    });
  }
  return { releve: horloge.maintenant(), lignes };
}

// Retire les entrées échues d'une collection en purge. Rend le nombre retiré.
// La purge lit, filtre et réécrit : elle passe donc par `modifier`. Sans lui,
// une écriture arrivée pendant la purge serait effacée par elle — et la purge
// tourne sur la collection la plus écrite du socle, le registre des envois.
async function purgerUne(nom, regle, limite) {
  let retirees = 0;
  if (regle.forme === 'liste') {
    await magasin.modifier(nom, [], (tout) => {
      const gardees = tout.filter((e) => {
        const t = Date.parse(e && e[regle.champ]);
        return !Number.isFinite(t) || t >= limite;
      });
      retirees = tout.length - gardees.length;
      return retirees ? gardees : tout;
    });
    return retirees;
  }
  if (regle.forme === 'table') {
    await magasin.modifier(nom, {}, (tout) => {
      const gardees = {};
      retirees = 0;
      for (const [cle, e] of Object.entries(tout)) {
        const brut = e && e[regle.champ];
        const t = typeof brut === 'number' ? brut : Date.parse(brut);
        if (Number.isFinite(t) && t < limite) retirees += 1;
        else gardees[cle] = e;
      }
      return retirees ? gardees : tout;
    });
    return retirees;
  }
  return 0;
}

// Sort les entrées échues d'un journal dans un fichier horodaté, **sans y
// toucher**. L'archive est une copie : la chaîne reste entière, et c'est elle
// qui fait foi.
async function archiverUn(nom, regle, limite, dossier) {
  const entrees = await magasin.journalLire(nom);
  const echues = entrees.filter((e) => {
    const t = Date.parse(e && e[regle.champ]);
    return Number.isFinite(t) && t < limite;
  });
  if (!echues.length) return { archivees: 0, fichier: '' };
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  const marque = horloge.maintenant().replace(/[:.]/g, '-');
  const fichier = path.join(dossier, `${nom}-jusqu-a-${marque}.jsonl`);
  fs.writeFileSync(fichier, echues.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return { archivees: echues.length, fichier };
}

// Applique la politique. À blanc par défaut : `appliquer: true` est un geste
// délibéré, et la route qui l'offre est réservée au super-administrateur.
async function appliquerPolitique(config, { appliquer = false, maintenant = Date.now(), dossierArchives } = {}) {
  const regles = politique(config);
  const dossier = dossierArchives
    || path.join(process.env.OASIS_DATA_DIR || path.join(__dirname, '..', 'data'), 'archives');
  const actes = [];
  for (const [nom, r] of Object.entries(regles)) {
    const limite = maintenant - r.jours * JOUR_MS;
    if (r.action === 'purge') {
      const echues = (await dates(nom, r)).filter((t) => t < limite).length;
      const retirees = appliquer ? await purgerUne(nom, r, limite) : 0;
      if (echues || retirees) actes.push({ collection: nom, action: 'purge', echues, retirees });
    } else if (r.action === 'archive') {
      const echues = (await dates(nom, r)).filter((t) => t < limite).length;
      const fait = appliquer ? await archiverUn(nom, r, limite, dossier) : { archivees: 0, fichier: '' };
      if (echues || fait.archivees) {
        actes.push({ collection: nom, action: 'archive', echues, ...fait });
      }
    }
    // « conserver » ne produit aucun acte : l'échéance se lit dans `etat()`.
  }
  return { applique: !!appliquer, releve: horloge.maintenant(), actes };
}

module.exports = {
  politique, etat, appliquer: appliquerPolitique, DEFAUT, JOURNAUX, JOUR_MS,
};
