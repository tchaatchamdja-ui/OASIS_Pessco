// OASIS — Le verrou d'une campagne de fumée.
//
// ── Pourquoi une campagne doit refuser de doubler une autre ──
//
// Chaque suite a son port depuis le 10 novembre 2026 (n° 5.f.79) : deux suites
// **différentes** peuvent donc tourner ensemble. Deux **campagnes** ne peuvent
// pas : elles jouent les mêmes seize ports, dans le même ordre.
//
// Lancée sur une campagne en cours, la seconde ne dit rien d'utile — elle
// rougit sur « le port 48xx répond déjà : un autre serveur le tient », message
// qui décrit un serveur orphelin d'un passage interrompu, alors qu'il s'agit du
// passage en cours. J'ai fait l'erreur **deux jours de suite**, pour avoir lu
// l'avancement dans le journal au lieu d'attendre la fin, et j'ai cherché le
// défaut dans le code avant de le trouver dans ma propre impatience.
//
// Le verrou le dit en un mot, et nomme le remède.
//
// ── Ce qu'il sait, et ce qu'il ne sait pas ──
//
// Même principe que `src/verrou.js`, dont il reprend la leçon : *un verrou qui
// bloque après un arrêt brutal est pire que pas de verrou du tout.* Il retient
// le numéro du processus, demande au système si ce processus vit encore, et
// **reprend la place s'il est mort** — en le signalant. Une campagne
// interrompue par Ctrl-C ne laisse donc rien derrière elle qui bloque la
// suivante.
//
// D'une machine à l'autre il ne vérifie rien, mais la question ne se pose pas :
// le fichier vit dans le dépôt de celui qui lance.
//
// `OASIS_SMOKE_VERROU=0` le lève, pour qui sait pourquoi il le fait.
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHEMIN = path.join(os.tmpdir(), 'oasis-campagne.verrou');

const lire = (chemin) => {
  try { return JSON.parse(fs.readFileSync(chemin, 'utf-8')); } catch { return null; }
};

// Le signal 0 ne fait rien : il demande seulement si le processus existe.
const vivant = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
};

// Prend le verrou, ou rend le motif du refus.
//
// `chemin` et `pid` se posent pour l'éprouver : un contrôle a besoin d'un verrou
// à lui — celui de la campagne est tenu par la campagne qui le joue — et de
// pouvoir présenter un numéro de processus mort. *Une fonction qu'on ne peut pas
// appeler hors de son usage ne s'éprouve pas.*
function prendre({ chemin = CHEMIN, pid = process.pid, poserLesSignaux = true } = {}) {
  if (process.env.OASIS_SMOKE_VERROU === '0') return { leve: true, relacher: () => {} };
  const tenant = lire(chemin);
  if (tenant && tenant.machine === os.hostname() && vivant(tenant.pid)) {
    return {
      refus: `une campagne tourne déjà — processus ${tenant.pid}, depuis ${tenant.depuis}.\n`
        + '  Deux campagnes jouent les mêmes seize ports : la seconde rougirait sur un port\n'
        + '  « déjà tenu », en décrivant un orphelin là où il n’y a que le passage en cours.\n'
        + `  Remède : attendre sa fin — la retrouver par \`ps -p ${tenant.pid}\`.\n`
        + '  Pour passer outre en connaissance de cause : OASIS_SMOKE_VERROU=0',
    };
  }
  const repris = tenant ? `verrou repris : la campagne ${tenant.pid} ne vit plus` : '';
  fs.writeFileSync(chemin, JSON.stringify({
    pid, machine: os.hostname(), depuis: new Date().toISOString(),
  }));
  let rendu = false;
  const relacher = () => {
    if (rendu) return;
    rendu = true;
    // On ne relâche que le sien : une campagne qui s'arrête n'emporte pas le
    // verrou d'une autre, repris entre-temps.
    const t = lire(chemin);
    if (t && t.pid === pid) { try { fs.unlinkSync(chemin); } catch { /* déjà parti */ } }
  };
  if (poserLesSignaux) {
    process.once('exit', relacher);
    ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((s) => {
      process.once(s, () => { relacher(); process.exit(130); });
    });
  }
  return { repris, relacher };
}

// ── Une suite seule consulte le verrou, sans le prendre ──
//
// Le refus ci-dessus conseillait, jusqu'au 13 novembre 2026, de « jouer une
// suite seule, qui a son propre port ». C'était faux, et mesuré : une campagne
// joue **tous** les ports, celui de la suite seule compris. Le relevé des gestes
// — qui lance ses suites par leur nom — est parti sur le port 4800 pendant
// qu'une campagne d'un autre worktree le tenait, et a rendu « le port 4800
// répond déjà : un autre serveur le tient », le message même que ce verrou
// existe pour remplacer (n° 5.f.91).
//
// Deux suites seules différentes tournent toujours ensemble : elles ne prennent
// rien, elles regardent seulement si une campagne vit. Le fichier est dans le
// répertoire temporaire du système, que les worktrees d'un même dépôt
// partagent : c'est ce qui permet à l'un de voir la campagne de l'autre.
function consulter({ chemin = CHEMIN } = {}) {
  if (process.env.OASIS_SMOKE_VERROU === '0') return { leve: true };
  const tenant = lire(chemin);
  if (tenant && tenant.machine === os.hostname() && tenant.pid !== process.pid
    && vivant(tenant.pid)) {
    return {
      refus: `une campagne tourne — processus ${tenant.pid}, depuis ${tenant.depuis}.\n`
        + '  Elle joue tous les ports, celui de cette suite compris : les deux se\n'
        + '  croiseraient, et la seconde rougirait sur un port « déjà tenu ».\n'
        + `  Remède : attendre sa fin — la retrouver par \`ps -p ${tenant.pid}\`.\n`
        + '  Pour passer outre en connaissance de cause : OASIS_SMOKE_VERROU=0',
    };
  }
  return {};
}

module.exports = {
  prendre, consulter, lire, CHEMIN,
};
