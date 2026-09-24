// OASIS — Traces d'exploitation.
//
// À ne pas confondre avec le journal d'audit (`src/audit.js`), qui atteste ce
// qu'une Autorité a fait et se conserve. Ici, ce que le serveur raconte de
// lui-même : un démarrage, une reprise, une exception. Cela se lit, cela
// s'oublie.
//
// Vingt appels à `console` s'en chargeaient, sans niveau ni forme commune : on
// ne pouvait ni les filtrer, ni les agréger, ni distinguer une alerte d'un
// bavardage. Un hébergement ramasse la sortie standard ; encore faut-il
// qu'elle soit lisible par une machine.
//
// En production, une ligne = un objet JSON. En développement, une ligne lisible
// par un humain — c'est là qu'on la lit soi-même.
const NIVEAUX = { erreur: 0, alerte: 1, info: 2, debug: 3 };

const enProduction = () => process.env.NODE_ENV === 'production';

// Seuil : `OASIS_LOG_LEVEL`, sinon « info ». Un niveau inconnu ne fait pas
// taire le serveur — il retombe sur « info ».
function seuil() {
  const demande = String(process.env.OASIS_LOG_LEVEL || '').toLowerCase();
  return NIVEAUX[demande] === undefined ? NIVEAUX.info : NIVEAUX[demande];
}

// Une erreur ne se sérialise pas d'elle-même : ni son message ni sa pile ne
// sont des propriétés énumérables, et `JSON.stringify` d'une exception rend
// « {} ». C'était le cas de la ligne la plus utile du serveur, celle du
// dernier filet : elle partait sans sa trace. On la déplie donc, qu'elle soit
// le détail lui-même ou l'une de ses propriétés.
function deplier(v) {
  if (v instanceof Error) return { message: v.message, type: v.name, pile: v.stack };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    Object.keys(v).forEach((k) => { out[k] = v[k] instanceof Error ? deplier(v[k]) : v[k]; });
    return out;
  }
  return v;
}

function ecrire(niveau, message, details) {
  if (NIVEAUX[niveau] > seuil()) return;
  const sortie = niveau === 'erreur' || niveau === 'alerte' ? console.error : console.log;
  if (enProduction()) {
    const ligne = { ts: new Date().toISOString(), niveau, message };
    if (details !== undefined) ligne.details = deplier(details);
    sortie(JSON.stringify(ligne));
    return;
  }
  // En développement, l'œil passe avant la machine — mais la pile d'une
  // exception s'y déplie aussi : c'est là qu'on la lit.
  const suffixe = details === undefined ? ''
    : ` ${details instanceof Error ? (details.stack || details.message)
      : JSON.stringify(deplier(details), null, details && details.erreur ? 2 : 0)}`;
  sortie(`[${niveau}] ${message}${suffixe}`);
}

// La console telle quelle, sans niveau ni mise en forme : le bandeau des mots
// de passe d'amorçage. Il s'adresse à la personne devant le terminal, et n'a
// rien à faire dans une trace structurée — un mot de passe qui part vers un
// collecteur de journaux y reste.
const brut = (ligne) => console.log(ligne);

module.exports = {
  erreur: (m, d) => ecrire('erreur', m, d),
  alerte: (m, d) => ecrire('alerte', m, d),
  info: (m, d) => ecrire('info', m, d),
  debug: (m, d) => ecrire('debug', m, d),
  brut,
  NIVEAUX,
};
