// OASIS — L'état des sauvegardes, et la preuve qu'elles existent.
//
// ADR-001 a différé la bascule vers PostgreSQL, et l'a assumé en écrivant noir
// sur blanc ce que cela coûte : **pas de restauration à un instant donné ; les
// archives horodatées restent le seul recours**. Sa suite n° 4 demandait donc de
// « vérifier la planification des sauvegardes sur l'instance de production ».
//
// Vérifier une fois, à la main, ne vaut rien — c'est la leçon qu'ADR-001 suite
// n° 3 vient de donner, où un jalon était clos sur une épreuve que personne ne
// rejouait. Une planification se défait sans bruit : une tâche `cron` qui
// disparaît avec un conteneur recréé, un disque plein, un `tar` qui échoue sur
// un fichier, un répertoire de destination remonté ailleurs. Dans tous ces cas,
// **l'application continue de servir parfaitement**, et personne ne sait qu'elle
// n'est plus protégée. Le jour où on le découvre est le jour où on en avait
// besoin.
//
// ── Ce que ce module refuse de faire ──
//
// Il ne sauvegarde pas. `scripts/sauvegarde.sh` le fait, lancé par
// l'ordonnanceur du système ou de l'hébergeur ; une application qui
// s'archiverait elle-même ne survivrait pas à son propre arrêt.
//
// Et surtout : **il ne dit jamais « ok » quand il ne voit rien**. Un répertoire
// absent n'est pas un répertoire vide, et un répertoire vide n'est pas une
// sauvegarde fraîche. Les quatre états sont distincts parce que la conduite à
// tenir diffère pour chacun, et parce qu'une sonde qui rassure faute de pouvoir
// regarder est pire que pas de sonde — c'est le mode de défaillance qu'on
// retrouve partout dans ce dépôt, et celui qui coûte le plus cher.
const fs = require('fs');
const path = require('path');

// Le nom que `scripts/sauvegarde.sh` donne à ses archives. Les deux doivent
// s'accorder, et un garde-fou de forme le vérifie : la sonde cherchant un motif
// que le script n'écrit plus dirait « aucune sauvegarde » sur une instance
// parfaitement sauvegardée, et l'on apprendrait à ignorer l'alerte.
const MOTIF = /^oasis-data-\d{8}-\d{6}\.tgz$/;

// Vingt-six heures : une sauvegarde quotidienne, plus deux heures de jeu pour
// l'heure d'exécution, un démarrage lent, un décalage saisonnier. Au-delà, la
// planification n'a pas tourné une fois — et une fois suffit à poser la question.
const SEUIL_DEFAUT_H = 26;

// Une archive de moins de dix kilo-octets n'est pas une sauvegarde. Les données
// d'une AAC pèsent cinq mégaoctets ; même vides, les fichiers du magasin et leur
// compression dépassent largement ce plancher. Un `tar` interrompu — disque
// plein, processus tué — laisse un fichier **récent et tronqué** : la sonde le
// verrait fraîche, et c'est exactement le genre de succès apparent qu'il faut
// refuser de prendre pour un succès.
const PLANCHER_OCTETS = 10 * 1024;

const dossierParDefaut = () => process.env.OASIS_SAUVEGARDES_DIR
  || path.join(__dirname, '..', 'sauvegardes');

const seuilHeuresParDefaut = () => {
  const v = Number(process.env.OASIS_SAUVEGARDES_SEUIL_H);
  return Number.isFinite(v) && v > 0 ? v : SEUIL_DEFAUT_H;
};

/**
 * L'état des sauvegardes, tel qu'il se lit du disque.
 *
 * `maintenant` est un paramètre pour que les contrôles puissent faire vieillir
 * une archive sans toucher à l'horloge de la machine.
 *
 * Le verdict, et ce qu'il veut dire :
 *
 *   · `non_configure` — le répertoire n'existe pas. **La sonde ne sait pas** si
 *     l'instance est sauvegardée ailleurs ; poser `OASIS_SAUVEGARDES_DIR` est
 *     ce qui lui permet de regarder au bon endroit ;
 *   · `aucune`        — le répertoire existe et ne porte aucune archive. La
 *     planification n'a jamais tourné, ou n'écrit pas là ;
 *   · `tronquee`      — la plus récente est trop petite pour être une
 *     sauvegarde. Elle est fraîche, et elle ne vaut rien ;
 *   · `perimee`       — la plus récente dépasse le seuil. La planification s'est
 *     arrêtée, et l'on sait quand ;
 *   · `ok`            — une archive de taille plausible, dans le seuil.
 */
function etat({ dossier, seuilHeures, maintenant } = {}) {
  const rep = dossier || dossierParDefaut();
  const seuil = seuilHeures || seuilHeuresParDefaut();
  const ts = maintenant === undefined ? Date.now() : maintenant;
  const base = {
    dossier: rep,
    seuil_h: seuil,
    declare: !!process.env.OASIS_SAUVEGARDES_DIR,
  };

  let noms;
  try {
    noms = fs.readdirSync(rep);
  } catch {
    return { ...base, verdict: 'non_configure', nombre: 0 };
  }

  const archives = noms.filter((n) => MOTIF.test(n)).map((n) => {
    const p = path.join(rep, n);
    try {
      const s = fs.statSync(p);
      return { nom: n, octets: s.size, mtimeMs: s.mtimeMs };
    } catch {
      // Effacée par la rétention entre le listage et le relevé : elle ne compte
      // ni comme présente ni comme un incident.
      return null;
    }
  }).filter(Boolean);

  if (!archives.length) return { ...base, verdict: 'aucune', nombre: 0 };

  const derniere = archives.reduce((a, b) => (b.mtimeMs > a.mtimeMs ? b : a));
  const ageH = Math.round(((ts - derniere.mtimeMs) / 3600000) * 10) / 10;
  const commun = {
    ...base,
    nombre: archives.length,
    derniere: derniere.nom,
    derniere_le: new Date(derniere.mtimeMs).toISOString(),
    octets: derniere.octets,
    age_h: ageH,
  };

  // L'ordre compte : une archive tronquée mais fraîche doit être dénoncée comme
  // tronquée, non déclarée « ok ». C'est le cas qui motive ce plancher.
  if (derniere.octets < PLANCHER_OCTETS) return { ...commun, verdict: 'tronquee' };
  if (ageH > seuil) return { ...commun, verdict: 'perimee' };
  return { ...commun, verdict: 'ok' };
}

// Ce qu'un exploitant doit lire, et ce qu'il doit faire. Un verdict sans conduite
// à tenir se contemple ; celui-ci se traite.
const PHRASES = {
  non_configure: 'répertoire de sauvegardes introuvable — la sonde ne peut rien affirmer. '
    + 'Poser OASIS_SAUVEGARDES_DIR sur le répertoire réellement employé, '
    + 'ou planifier scripts/sauvegarde.sh (voir DEPLOYMENT.md § 5).',
  aucune: 'aucune archive dans le répertoire de sauvegardes — la planification '
    + "n'a jamais tourné, ou n'écrit pas là.",
  tronquee: 'la dernière archive est trop petite pour être une sauvegarde — '
    + 'un tar interrompu, probablement un disque plein. Elle est fraîche et elle ne vaut rien.',
  perimee: 'la dernière sauvegarde dépasse le seuil — la planification s’est arrêtée.',
  ok: 'sauvegardes à jour.',
};

// Le niveau de trace, et c'est un choix. `non_configure` est une **alerte**, non
// une erreur : la sonde ne sait pas, et crier « erreur » sur ce qu'on ignore est
// la meilleure façon de faire ignorer les vraies. Les trois autres sont des
// erreurs — l'hébergeur alerte sur « niveau »:« erreur », et c'est bien ce qu'on
// veut qu'il fasse.
const NIVEAUX = {
  non_configure: 'alerte', aucune: 'erreur', tronquee: 'erreur', perimee: 'erreur', ok: 'info',
};

/**
 * Inscrit l'état à la trace, au niveau que son verdict mérite.
 *
 * Appelé au démarrage **et chaque jour** : un serveur qui tourne des semaines
 * n'aurait dit la chose qu'une fois, le jour où elle était encore vraie.
 */
function tracer(trace, resultat) {
  const e = resultat || etat();
  // `trace` n'expose pas de fonction à niveau variable : il expose les quatre
  // niveaux. On choisit donc la bonne, avec `info` en secours — un verdict
  // inconnu ne doit pas faire taire la sonde.
  const ecrire = trace[NIVEAUX[e.verdict]] || trace.info;
  ecrire(`sauvegardes : ${PHRASES[e.verdict] || e.verdict}`, {
    verdict: e.verdict,
    dossier: e.dossier,
    ...(e.derniere ? { derniere: e.derniere, age_h: e.age_h, octets: e.octets } : {}),
    nombre: e.nombre,
    seuil_h: e.seuil_h,
  });
  return e;
}

module.exports = {
  etat, tracer, PHRASES, NIVEAUX, MOTIF, SEUIL_DEFAUT_H, PLANCHER_OCTETS,
};
