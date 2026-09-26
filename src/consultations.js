// OASIS — Qui a consulté quel dossier, et quand.
//
// La fiche technique URSAC/GT2 (§5.2, « journalisation étendue ») demande que
// le journal d'audit inaltérable du §F.3 couvre aussi les **consultations** de
// données personnelles sensibles, et non les seules modifications. Jusqu'ici il
// ne portait que des verbes d'écriture : on savait qui avait changé un dossier,
// jamais qui l'avait simplement ouvert.
//
// C'est la trace qui manque le jour où l'on demande « qui a regardé le dossier
// de cet agent ? » — et ce jour-là, elle ne se reconstitue pas après coup.
//
// ── Pourquoi une déclaration, et non des appels dans les routes ──
//
// Poser `audit.log` dans chaque gestionnaire de lecture, c'est 150 routes à ne
// pas oublier, et un oubli ne se voit pas : une consultation non tracée ne
// laisse rien, par définition. La table ci-dessous nomme les ressources qui
// portent des personnes ; un intercepteur les reconnaît à l'adresse et journalise
// après coup, quand la réponse est partie et qu'on sait qu'elle a abouti.
//
// ── Ce qui n'est pas journalisé, et pourquoi ──
//
// Se consulter soi-même. Un agent qui ouvre son propre profil exerce un droit
// que la fiche lui reconnaît (§5.2, « droits des personnes concernées ») ; en
// faire une ligne de journal noierait les consultations qui, elles, comptent.
//
// ── La garantie exacte, pour qu'on ne lui en prête pas une plus forte ──
//
// L'entrée est écrite **après** l'envoi de la réponse, non avant. Un arrêt
// brutal entre les deux perdrait la trace d'une consultation déjà servie.
// C'est le choix inverse de celui des écritures, où le journal précède la
// confirmation : une lecture ne doit pas attendre son journal, et un journal
// en panne ne doit pas fermer la consultation. La fenêtre est d'un tour de
// boucle ; la dire vaut mieux que la laisser supposer nulle.

// Chaque entrée dit : à quoi l'adresse se reconnaît, par quelles méthodes, la
// nature de la donnée, et comment nommer le dossier consulté. `dossier` reçoit
// le résultat du motif. Sans `methodes`, c'est GET — lire est le geste ordinaire.
//
// La table couvre des **ressources**, non l'état des routes d'aujourd'hui :
// deux entrées ne correspondent encore à aucune route servie (le compte unique,
// le contact unique). C'est voulu — le jour où elles seront ajoutées, elles
// seront tracées sans que personne ait à y penser. C'est le contraire d'un oubli.
const RESSOURCES = [
  // ── Identités des comptes (nom, prénom, courriel, téléphone, photo) ──
  { motif: /^\/api\/users\/([^/]+)$/, nature: 'identite', dossier: (m) => m[1] },   // à venir
  { motif: /^\/api\/users$/, nature: 'identite', dossier: () => '(liste des comptes)' },

  // ── Personnel de surveillance : qualifications, spécialités, coordonnées ──
  // C'est le « dossier de formation » du §5 de la fiche.
  { motif: /^\/api\/referentiels\/inspecteurs\/export$/, nature: 'personnel', dossier: () => '(export nominatif)' },
  { motif: /^\/api\/referentiels\/inspecteurs$/, nature: 'personnel', dossier: () => '(liste du personnel)' },
  // La route qui rend tous les référentiels rend aussi les inspecteurs.
  { motif: /^\/api\/referentiels$/, nature: 'personnel', dossier: () => '(tous référentiels)' },

  // ── Contacts des organismes surveillés : personnes physiques nommées ──
  { motif: /^\/api\/m\/ramp\/contacts\/([^/]+)$/, nature: 'contact', dossier: (m) => m[1] },  // à venir
  { motif: /^\/api\/m\/ramp\/contacts$/, nature: 'contact', dossier: () => '(liste des contacts)' },
  // Un export nominatif est une consultation, quelle que soit sa méthode : le
  // classeur emporte les noms, les fonctions et les téléphones hors de
  // l'application, et c'est précisément ce qu'il faut pouvoir retracer.
  {
    motif: /^\/api\/m\/ramp\/contacts\/export-xlsx$/, methodes: ['POST'],
    nature: 'contact', dossier: () => '(export nominatif)',
  },
];

// Les natures déclarées ci-dessus, pour que les contrôles puissent vérifier
// qu'aucune collection portant des personnes n'est restée hors de la table.
const NATURES = [...new Set(RESSOURCES.map((r) => r.nature))];

function reconnaitre(chemin, methode = 'GET') {
  for (const r of RESSOURCES) {
    if (!(r.methodes || ['GET']).includes(methode)) continue;
    const m = chemin.match(r.motif);
    if (m) return { nature: r.nature, dossier: r.dossier(m) };
  }
  return null;
}

// L'intercepteur. Il se pose avant les routes et journalise après elles :
// `finish` ne se déclenche qu'une fois la réponse partie, donc une fois le
// compte connu et le code de retour arrêté.
function poser(app, { audit }) {
  app.use((req, res, next) => {
    const vu = reconnaitre(req.path, req.method);
    if (!vu) return next();

    res.on('finish', () => {
      // Un refus n'est pas une consultation : 401, 403 et 404 ne montrent rien.
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const qui = (req.user || {}).username || '';
      if (!qui) return;
      // Se consulter soi-même est un droit, pas un accès à surveiller.
      if (vu.dossier === qui) return;
      audit.log(qui, 'CONSULTATION', {
        nature: vu.nature,
        dossier: vu.dossier,
        // Le compte réellement connecté, quand une vue en simule un autre :
        // c'est lui qui répond de la consultation.
        ...(req.userReel && req.userReel.username !== qui ? { par: req.userReel.username } : {}),
      });
    });
    next();
  });
}

module.exports = { poser, reconnaitre, RESSOURCES, NATURES };
