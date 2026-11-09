// OASIS — « Mes utilisateurs » : les comptes d'un organisme, tenus par lui.
//
// Un prestataire n'attend pas de l'Autorité qu'elle crée ses agents : son
// administrateur ouvre les comptes, leur confie ce qu'il veut de ses écrans,
// réinitialise un mot de passe et désactive un départ. Deux modules offrent
// cet écran ; les routes vivent ici, et chacun n'en déclare que ses libellés,
// ses droits et le champ où il les range.
//
// Invariants communs :
//   · l'appelant doit être en vue Prestataire et détenir le droit
//     « utilisateurs » (l'administrateur de l'organisme l'a d'office) ;
//   · les comptes créés héritent du rattachement et n'accèdent qu'au module ;
//   · un compte hors du périmètre n'existe pas — 404, jamais 403.

const { introuvable, requis, existant, reserve } = require('./erreurs');
const { asynchrone } = require('./route');

// Rôles portail qu'un compte rattaché à un organisme peut porter. Les libellés
// diffèrent d'un module à l'autre : « prestataire » ici, « exploitant » là.
const ROLES = (libelles) => [
  { cle: 'ADMIN_PRESTATAIRE', libelle: libelles.admin, aide: libelles.aideAdmin },
  { cle: 'PRESTATAIRE', libelle: libelles.agent, aide: libelles.aideAgent },
];

/**
 * @param {object} app       application Express
 * @param {object} deps      dépendances du socle (requireAuth, auth, loadConfig)
 * @param {string} M         préfixe d'API du module
 * @param {object} o
 * @param {string} o.module          code du module (SURV, RAMP…)
 * @param {string} o.champDroits     champ du compte portail portant les droits
 * @param {object[]} o.droits        catalogue des droits confiables
 * @param {object} o.libelles        intitulés des deux rôles
 * @param {(u: object) => object} o.vueUtilisateur  projection publique du compte
 * @param {object} o.roles           module de rôles (estPrestataire, prestatairesDe…)
 * @param {boolean} [o.logs]         joindre l'historique du compte à la liste
 * @param {() => string} o.now       horodatage du module
 */
function register(app, deps, M, o) {
  const { requireAuth, auth, loadConfig } = deps;
  const R = o.roles;
  const rolesPrestataire = ROLES(o.libelles);
  const texte = (v) => String(v == null ? '' : v).trim();

  const garde = (req, res) => {
    if (!R.estPrestataire(req.user)) {
      reserve(res, 'vue_prestataire');
      return null;
    }
    const miens = R.prestatairesDe(req.user);
    if (!miens.length) {
      res.status(400).json({ error: o.libelles.sansRattachement });
      return null;
    }
    // Gérer les comptes de l'organisme est un droit comme un autre : il se
    // confie, et l'administrateur de l'organisme le détient d'office.
    if (!R.compteA(req.user, 'utilisateurs', auth, req.userReel)) {
      res.status(403).json({ error: 'Droit non confié à ce compte' });
      return null;
    }
    return miens;
  };

  // Comptes enregistrés au portail dont les accès aux modules comprennent
  // celui-ci : les autres relèvent d'un autre espace. Un compte sans liste
  // enregistrée les a tous — c'était l'état de l'application avant que les
  // accès par module n'existent.
  const aAccesAuModule = (u) => !Array.isArray(u.modules) || u.modules.includes(o.module);

  // ── Le périmètre des routes est celui de la liste, et non plus plus large ──
  //
  // La liste écartait les comptes sans accès à ce module ; `cible` ne regardait
  // que le rattachement. Les deux périmètres divergeaient donc, au rebours de
  // l'invariant écrit en tête de ce fichier.
  //
  // Mesuré le 9 novembre 2026 : un compte créé depuis SURV puis rattaché au
  // seul module RAMP **disparaît de la liste de SURV** — et depuis SURV,
  // réinitialiser son mot de passe rendait 200, le **révéler en clair** 200,
  // modifier ses droits 200, le détruire 200. Le droit « utilisateurs » étant
  // propre à chaque module (`droits_surv` ici, un autre champ là), un agent à
  // qui l'on confie les comptes dans un module seul pouvait saisir le mot de
  // passe d'un collègue qui n'a jamais eu accès qu'à l'autre.
  //
  // Un compte hors du périmètre n'existe pas : 404, pour toutes les routes
  // comme pour la liste (ADR-003 n° 5.f.76).
  const cible = (username, miens) => {
    const u = auth.findUser(username);
    if (!u || !miens.includes(u.prestataire_id || '')) return null;
    return aAccesAuModule(u) ? u : null;
  };

  app.get(`${M}/mes-utilisateurs`, requireAuth, (req, res) => {
    const miens = garde(req, res);
    if (!miens) return undefined;
    return res.json({
      roles: rolesPrestataire,
      droits: o.droits,
      utilisateurs: auth.getUsers()
        .filter((u) => miens.includes(u.prestataire_id || '') && aAccesAuModule(u))
        .map((u) => ({
          ...o.vueUtilisateur(u),
          role: u.role || 'PRESTATAIRE',
          droits: R.droitsDe(u),
          modules: u.modules || [],
          must_change_password: !!u.mustChange,
          has_temp_password: !!u.tempPassword,
          created_at: u.createdAt || '',
          ...(o.logs ? { logs: (u.logs || []).slice(0, 20) } : {}),
        })),
    });
  });

  app.post(`${M}/mes-utilisateurs`, requireAuth, asynchrone(async (req, res) => {
    const miens = garde(req, res);
    if (!miens) return undefined;
    const d = req.body || {};
    // Rattachement demandé s'il fait partie du périmètre, premier sinon.
    const pid = miens.includes(d.prestataire_id) ? d.prestataire_id : miens[0];
    const username = texte(d.email || d.nom_utilisateur);
    if (!username) return requis(res, 'courriel');
    if (auth.findUser(username)) return existant(res, 'utilisateur');
    const motDePasse = auth.generatePassword(loadConfig());
    const { salt, hash } = auth.hashPassword(motDePasse);
    const users = auth.getUsers();
    const role = rolesPrestataire.some((r) => r.cle === d.role) ? d.role : 'PRESTATAIRE';
    const nouveau = {
      username, nom: texte(d.nom), prenom: texte(d.prenom),
      email: texte(d.email) || username,
      fullName: `${texte(d.nom)} ${texte(d.prenom)}`.trim(),
      role, prestataire_id: pid,
      // Accès aux modules du portail : le compte naît dans le module courant.
      modules: [o.module],
      [o.champDroits]: R.normaliserDroits(d.droits) || o.droits.map((x) => x.cle),
      salt, hash, active: d.actif !== false, locked: false, failedAttempts: 0,
      mustChange: true, tempPassword: motDePasse,
      passwordChangedAt: o.now(), passwordHistory: [hash],
      createdAt: o.now(), createdBy: req.user.username,
    };
    // Le doublon est vérifié **dans** la transformation : le vérifier au-dehors
    // laisserait passer deux créations simultanées du même identifiant.
    let doublon = false;
    await auth.modifierUsers((comptes) => {
      doublon = comptes.some((x) => x.username === username);
      return doublon ? comptes : [...comptes, nouveau];
    });
    if (doublon) return existant(res, 'utilisateur');
    return res.status(201).json({ status: 'ok', id: username, temp_password: motDePasse });
  }));

  app.put(`${M}/mes-utilisateurs/:id`, requireAuth, asynchrone(async (req, res) => {
    const miens = garde(req, res);
    if (!miens) return undefined;
    const existant = cible(req.params.id, miens);
    if (!existant) return introuvable(res, 'utilisateur');
    const d = req.body || {};
    const avant = auth.findUser(req.params.id);
    const u = { ...avant };
    ['nom', 'prenom', 'email'].forEach((k) => { if (k in d) u[k] = texte(d[k]); });
    if ('actif' in d) u.active = !!d.actif;
    u.fullName = `${u.nom || ''} ${u.prenom || ''}`.trim();
    // Le rôle se choisit parmi ceux qu'un compte d'organisme peut porter ;
    // les droits confiés se cochent un à un.
    if ('role' in d && rolesPrestataire.some((r) => r.cle === d.role)) u.role = d.role;
    if (!u.role) u.role = 'PRESTATAIRE';
    if ('droits' in d) u[o.champDroits] = R.normaliserDroits(d.droits) || [];
    // Invariant : le compte reste rattaché au même organisme. Les
    // modifications portent sur le compte portail lui-même : elles se lisent
    // aussitôt dans la gestion des utilisateurs du portail.
    u.prestataire_id = existant.prestataire_id;
    // Seuls les champs changés sont reportés sur la version que la base porte :
    // réécrire l'enregistrement entier effacerait, par exemple, le décompte de
    // tentatives infructueuses qu'une connexion concurrente vient d'incrémenter.
    const changes = auth.champsChanges(avant, u);
    await auth.modifierUsers((comptes) => comptes.map(
      (x) => (x.username === req.params.id ? { ...x, ...changes } : x),
    ));
    return res.json({ status: 'ok', role: u.role, droits: R.droitsDe(u) });
  }));

  // ── Pas de route qui détruise un compte : aucun écran ne l'offrait ──
  //
  // Il y en avait une, et elle détruisait réellement le compte du portail —
  // mesuré le 9 novembre 2026, sept comptes puis six. Or les deux écrans qui
  // servent ces routes n'ont qu'un bouton « Désactiver », avec la raison écrite
  // à côté : « plutôt que le supprimer : l'historique reste lisible ». Rien,
  // dans aucun des deux, ne l'appelait.
  //
  // Et elle n'avait rien de la cérémonie que le portail exige pour le même
  // geste (`DELETE /api/users/:username`) : celui-là réserve l'effacement au
  // super-administrateur, redemande son mot de passe, emporte la fiche du
  // répertoire du personnel, ferme les sessions ouvertes, et **écrit au journal
  // d'audit**. Celle-ci ne faisait aucun des cinq, et l'ouvrait à
  // l'administrateur d'un organisme.
  //
  // Un chemin destructeur sans mot de passe ni trace, qu'aucun écran n'ouvre,
  // n'est pas une réserve : c'est une surface. Le droit à l'effacement reste
  // servi, par la route du portail et sa cérémonie (ADR-003 n° 5.f.76).

  app.post(`${M}/mes-utilisateurs/:id/reset-password`, requireAuth, asynchrone(async (req, res) => {
    const miens = garde(req, res);
    if (!miens) return undefined;
    if (!cible(req.params.id, miens)) return introuvable(res, 'utilisateur');
    const motDePasse = auth.generatePassword(loadConfig());
    const { salt, hash } = auth.hashPassword(motDePasse);
    const u = await auth.modifierUn(req.params.id, (frais) => {
      Object.assign(frais, { salt, hash, mustChange: true, tempPassword: motDePasse, passwordChangedAt: o.now() });
      frais.logs = [{ action: `Réinitialisation par ${req.user.fullName || req.user.username}`, date: o.now() },
        ...(frais.logs || [])];
      return frais;
    }).then((comptes) => comptes.find((x) => x.username === req.params.id) || {});
    return res.json({ status: 'ok', new_password: motDePasse, email: u.email || '' });
  }));

  app.post(`${M}/mes-utilisateurs/:id/reveal-password`, requireAuth, (req, res) => {
    const miens = garde(req, res);
    if (!miens) return undefined;
    const u = cible(req.params.id, miens);
    if (!u) return introuvable(res, 'utilisateur');
    const motDePasse = (req.body || {}).admin_password || '';
    if (!motDePasse) return requis(res, 'mot_de_passe');
    // Le demandeur prouve son identité avant de lire un secret.
    const moi = auth.findUser((req.userReel || req.user).username);
    if (!auth.checkPasswordPublic(moi, motDePasse)) {
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }
    if (!u.tempPassword) return res.status(404).json({ error: 'Aucun mot de passe temporaire disponible' });
    return res.json({ temp_password: u.tempPassword });
  });
}

module.exports = { register, ROLES };
