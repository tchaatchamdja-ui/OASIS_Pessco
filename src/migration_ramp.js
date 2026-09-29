const trace = require('./trace');
const magasin = require('./magasin');
// Migration ponctuelle — le module d'inspections sur aire de trafic s'appelait
// « SAFA » dans OASIS, du nom du programme dont il est issu. Il s'appelle RAMP.
//
// Le code du module n'est pas qu'une étiquette : il est la clé sous laquelle
// sont rangés les accès d'un compte, les privilèges de « Gestion des Droits »,
// l'activation dans la configuration, et le préfixe des identifiants de carence
// servis aux « Mesures d'Application ». Renommer le code sans reprendre ces
// enregistrements reviendrait à les rendre orphelins : les comptes perdraient
// le module, les privilèges deviendraient invisibles, les carences perdraient
// le lien vers l'écart qui les a produites.
//
// Ce que cette migration NE touche pas, délibérément :
//
//   · les deux journaux d'audit (audit.json, module_audit.json) — chaînés en
//     SHA-256, ils disent ce qui a eu lieu, sous le nom qui avait cours alors ;
//     les réécrire romprait la chaîne et effacerait une trace ;
//   · tout ce qui relève du programme SAFA lui-même — le type d'inspection
//     (SAFA/SANA), les 54 items, les catégories et actions, les références
//     réglementaires. C'est un terme de la norme, pas le nom du module.
//
// Elle est idempotente : une fois passée, elle ne trouve plus rien à reprendre.
const ANCIEN = 'SAFA';
const NOUVEAU = 'RAMP';

// Les identifiants de carence publiés par le module portent son nom en tête.
const ANCIEN_PREFIXE = 'safa:';
const NOUVEAU_PREFIXE = 'ramp:';

// Asynchrone depuis que `emails` vit en base (ADR-002, étape B) : la reprise
// des courriels passe par la façade, tout le reste reste sur fichiers et donc
// synchrone. Le serveur l'attend avant d'écouter.
async function migrer(store, loadConfig, saveConfig) {
  const faits = [];

  // 1. Activation du module dans la configuration.
  try {
    const cfg = loadConfig();
    if (cfg && cfg.modules && ANCIEN in cfg.modules) {
      // La clé garde sa place : l'ordre de cette liste se lit dans le fichier.
      const repris = {};
      Object.entries(cfg.modules).forEach(([code, actif]) => {
        if (code === ANCIEN) { if (!(NOUVEAU in cfg.modules)) repris[NOUVEAU] = actif; }
        else repris[code] = actif;
      });
      cfg.modules = repris;
      saveConfig(cfg);
      faits.push('configuration : module activé sous son nouveau code');
    }
  } catch (e) {
    trace.erreur('migration RAMP : configuration illisible', { erreur: e.message });
  }

  // 2. Privilèges de « Gestion des Droits », rangés par code de module.
  const droits = store.load('module_rights', {});
  if (droits && ANCIEN in droits) {
    droits[NOUVEAU] = { ...(droits[NOUVEAU] || {}), ...droits[ANCIEN] };
    delete droits[ANCIEN];
    store.save('module_rights', droits);
    faits.push(`privilèges : ${Object.keys(droits[NOUVEAU]).length} compte(s)`);
  }

  // 3. Accès aux modules et droits d'organisme, sur chaque compte.
  const users = store.load('users', []);
  let comptes = 0;
  (Array.isArray(users) ? users : []).forEach((u) => {
    let touche = false;
    if (Array.isArray(u.modules) && u.modules.includes(ANCIEN)) {
      u.modules = u.modules.map((m) => (m === ANCIEN ? NOUVEAU : m))
        .filter((m, i, l) => l.indexOf(m) === i);
      touche = true;
    }
    if (u.droits_safa !== undefined) {
      if (u.droits_ramp === undefined) u.droits_ramp = u.droits_safa;
      delete u.droits_safa;
      touche = true;
    }
    if (touche) comptes += 1;
  });
  if (comptes) {
    store.save('users', users);
    faits.push(`comptes : ${comptes}`);
  }

  // 4. Carences des « Mesures d'Application » : le lien vers l'écart d'origine.
  const mesures = store.load('mesures', null);
  if (mesures && typeof mesures === 'object') {
    let liens = 0;
    Object.values(mesures).forEach((collection) => {
      if (!Array.isArray(collection)) return;
      collection.forEach((e) => {
        if (e && typeof e.constatation_id === 'string' && e.constatation_id.startsWith(ANCIEN_PREFIXE)) {
          e.constatation_id = NOUVEAU_PREFIXE + e.constatation_id.slice(ANCIEN_PREFIXE.length);
          liens += 1;
        }
        if (e && e.origine === ANCIEN) { e.origine = NOUVEAU; liens += 1; }
      });
    });
    if (liens) {
      store.save('mesures', mesures);
      faits.push(`carences : ${liens} lien(s)`);
    }
  }

  // 5. Courriels sortis du module : leur origine le nomme.
  //
  // Le registre des envois est en base : il passe par `magasin`, et la reprise
  // se fait **dans** une transformation atomique. Un envoi concurrent pendant
  // le démarrage ne serait pas écrasé — et au démarrage, c'est justement ce qui
  // peut arriver, plusieurs reprises se succédant sur le même répertoire.
  let n = 0;
  await magasin.modifier('emails', [], (box) => {
    n = 0;
    const repris = (box || []).map((e) => {
      if (e && e.origine === 'communication_safa') { n += 1; return { ...e, origine: 'communication_ramp' }; }
      return e;
    });
    return n ? repris : box;
  });
  if (n) faits.push(`courriels : ${n}`);

  if (faits.length) trace.info('migration RAMP : SAFA → RAMP', { faits });
  return faits;
}

module.exports = { migrer };
