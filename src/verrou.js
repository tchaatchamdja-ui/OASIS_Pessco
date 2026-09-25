// OASIS — Verrou du répertoire de données.
//
// Le magasin par fichiers n'a pas de verrou de base de données : deux processus
// servant le même répertoire relisent et réécrivent les mêmes fichiers, et la
// dernière écriture efface l'autre — sans erreur, sans trace, sans que personne
// ne le sache. C'est la raison pour laquelle ADR-001 accepte de rester sur des
// fichiers : une instance, un processus. Rien ne l'imposait ; ceci l'impose.
//
// ── Ce que le verrou sait faire, et ce qu'il ne sait pas ──
//
// Il retient le numéro du processus et le nom de la machine. Sur la même
// machine, il vérifie que le processus vit encore : un verrou laissé par un
// arrêt brutal ne bloque donc pas le redémarrage — c'est l'ennui le plus
// courant avec un verrou, et il se règle ici.
//
// D'une machine à l'autre, il ne peut rien vérifier : le numéro d'un processus
// n'a pas de sens ailleurs. Il refuse alors, et le dit — c'est le cas où deux
// conteneurs partagent un volume, exactement celui qu'on veut interdire. Un
// opérateur qui sait ce qu'il fait le lève par OASIS_VERROU=0.
const fs = require('fs');
const os = require('os');
const path = require('path');

const NOM = '.verrou';

const lire = (chemin) => {
  try { return JSON.parse(fs.readFileSync(chemin, 'utf-8')); } catch { return null; }
};

// Un processus vit-il encore ? Le signal 0 ne fait rien : il demande seulement
// si l'on aurait le droit de lui envoyer quelque chose.
function vivant(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function decrire(d) {
  if (!d) return 'un verrou illisible';
  const depuis = d.debut ? ` depuis ${d.debut}` : '';
  return `le processus ${d.pid} sur « ${d.machine} »${depuis}`;
}

// Prend le verrou, ou lève une erreur qui dit quoi faire. `relacher()` le rend ;
// il se rend aussi tout seul à la sortie du processus.
function prendre(dossier) {
  if (process.env.OASIS_VERROU === '0') return { relacher() {}, leve: true };
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  const chemin = path.join(dossier, NOM);
  const moi = { pid: process.pid, machine: os.hostname(), debut: new Date().toISOString() };

  const poser = () => {
    // `wx` échoue si le fichier existe : c'est ce qui rend la prise atomique,
    // et empêche deux démarrages simultanés de se croire seuls tous les deux.
    const fd = fs.openSync(chemin, 'wx');
    fs.writeFileSync(fd, JSON.stringify(moi, null, 2));
    fs.closeSync(fd);
  };

  try {
    poser();
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const tenant = lire(chemin);
    const memeMachine = tenant && tenant.machine === os.hostname();

    if (tenant && memeMachine && vivant(tenant.pid)) {
      const err = new Error(
        `le répertoire de données est déjà servi par ${decrire(tenant)}.\n`
        + `  Deux processus sur le même répertoire s'effacent l'un l'autre en silence.\n`
        + `  Le retrouver : ps -p ${tenant.pid}\n`
        + `  L'arrêter, puis relancer ; ou servir un autre répertoire : OASIS_DATA_DIR=…`,
      );
      err.code = 'VERROU_TENU';
      throw err;
    }

    if (tenant && !memeMachine) {
      const err = new Error(
        `le répertoire de données porte un verrou posé par ${decrire(tenant)}.\n`
        + `  Cette machine ne peut pas savoir si ce processus vit encore.\n`
        + `  Deux conteneurs sur un même volume s'effacent l'un l'autre en silence :\n`
        + `  n'en servir qu'un. Si le verrou est un reste, l'effacer — ${chemin} —\n`
        + `  ou passer outre en connaissance de cause : OASIS_VERROU=0`,
      );
      err.code = 'VERROU_ETRANGER';
      throw err;
    }

    // Verrou périmé : le processus qui l'a posé n'est plus. On le reprend.
    fs.unlinkSync(chemin);
    poser();
    return { relacher: () => relacher(chemin, moi), repris: tenant };
  }

  return { relacher: () => relacher(chemin, moi) };
}

// On ne relâche que son propre verrou : un processus qui s'arrête ne doit pas
// emporter celui d'un autre, repris entre-temps.
function relacher(chemin, moi) {
  const tenant = lire(chemin);
  if (tenant && tenant.pid === moi.pid && tenant.machine === moi.machine) {
    try { fs.unlinkSync(chemin); } catch { /* déjà parti */ }
  }
}

// Pose le verrou et le rend à la sortie, quelle qu'en soit la cause. Un arrêt
// brutal (kill -9, coupure) ne passe pas par là — d'où la reprise d'un verrou
// périmé au démarrage suivant.
function poserEtTenir(dossier) {
  const v = prendre(dossier);
  if (v.leve || v.relacher === undefined) return v;
  const rendre = () => v.relacher();
  process.once('exit', rendre);
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
    process.once(signal, () => { rendre(); process.exit(0); });
  });
  return v;
}

module.exports = { prendre, poserEtTenir, NOM };
