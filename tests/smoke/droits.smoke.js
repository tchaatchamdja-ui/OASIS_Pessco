// Fumée — module « Gestion des Droits » : contexte, privilèges, portées,
// évaluateurs éligibles et intégrité du journal d'audit du module.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function droitsSmoke(port) {
  console.log('\n── Module DROITS — Gestion des Droits ──');
  const srv = await demarrer({ port });
  try {
    await srv.connexion();

    const ctx = await srv.appel('/api/m/droits/context');
    verifier('contexte du module', ctx.statut === 200);

    const refs = await srv.appel('/api/m/droits/refs');
    verifier('référentiels de portée (domaines / secteurs)',
      refs.statut === 200 && Array.isArray(refs.corps.domaines) && Array.isArray(refs.corps.secteurs));

    const users = await srv.appel('/api/m/droits/PLAN/users');
    verifier('privilèges par utilisateur', users.statut === 200 && Array.isArray(users.corps));
    verifier('privilège par défaut Lecteur',
      (users.corps || []).every((u) => ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR'].includes(u.privilege)));

    const evaluateurs = await srv.appel('/api/m/droits/PLAN/evaluateurs');
    verifier('évaluateurs éligibles listés', evaluateurs.statut === 200 && Array.isArray(evaluateurs.corps));
    verifier('les SUPERADMIN sont exclus des évaluateurs',
      (evaluateurs.corps || []).every((u) => u.role !== 'SUPERADMIN'));

    // L'espace PLAN ne concerne que les comptes de l'autorité.
    verifier('espace PLAN limité aux comptes de l’autorité',
      (users.corps || []).length > 0
      && (users.corps || []).every((u) => ['SUPERADMIN', 'ADMIN', 'AAC'].includes(u.role)),
      [...new Set((users.corps || []).map((u) => u.role))].join(', '));

    // L'espace SURV y ajoute les administrateurs de prestataire, seuls
    // susceptibles de recevoir le privilège « Prestataire ».
    const usersSurv = (await srv.appel('/api/m/droits/SURV/users')).corps || [];
    verifier('espace SURV ouvert aux administrateurs de prestataire',
      usersSurv.some((u) => u.role === 'ADMIN_PRESTATAIRE')
      && usersSurv.every((u) => ['SUPERADMIN', 'ADMIN', 'ADMIN_PRESTATAIRE', 'AAC'].includes(u.role)),
      [...new Set(usersSurv.map((u) => u.role))].join(', '));

    // Un administrateur de prestataire n'a pas de droits à régler sur PLAN,
    // même s'il dispose du module.
    const horsPlan = usersSurv.find((u) => u.role === 'ADMIN_PRESTATAIRE');
    if (horsPlan) {
      verifier('administrateur de prestataire absent de l’espace PLAN',
        !(users.corps || []).some((u) => u.username === horsPlan.username));
      verifier('droits PLAN refusés à un rôle hors périmètre',
        (await srv.appel(`/api/m/droits/PLAN/users/${encodeURIComponent(horsPlan.username)}`, {
          method: 'PUT', body: JSON.stringify({ privilege: 'CONTRIBUTEUR', scopes: [] }),
        })).statut === 400);
    }

    // ── Privilège « Prestataire », propre à l'espace SURV ──
    const ctxPlan = await srv.appel('/api/m/droits/context?module=PLAN');
    verifier('privilège Prestataire absent de l’espace PLAN',
      !(ctxPlan.corps.privileges || []).includes('PRESTATAIRE'));
    const ctxSurv = await srv.appel('/api/m/droits/context?module=SURV');
    verifier('privilège Prestataire offert dans l’espace SURV',
      (ctxSurv.corps.privileges || []).includes('PRESTATAIRE'));

    verifier('prestataires proposés comme portées', Array.isArray(refs.corps.prestataires)
      && refs.corps.prestataires.length > 0);

    const cible = (await srv.appel('/api/m/droits/SURV/users')).corps
      .find((u) => u.role === 'ADMIN_PRESTATAIRE');
    verifier('un administrateur de prestataire figure dans l’espace SURV', !!cible);
    if (cible) {
      const url = `/api/m/droits/SURV/users/${encodeURIComponent(cible.username)}`;
      const deux = refs.corps.prestataires.slice(0, 2).map((p) => ({ prestataire_id: p.id }));

      // La portée du privilège Prestataire désigne les prestataires accessibles.
      const pose = await srv.appel(url, {
        method: 'PUT', body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: deux }),
      });
      verifier('plusieurs prestataires attribuables en portée',
        pose.statut === 200 && pose.corps.privilege === 'PRESTATAIRE'
        && pose.corps.scopes.length === deux.length
        && pose.corps.scopes.every((s) => s.prestataire_id && !s.domaine_id));

      // Les portées domaine/secteur n'ont pas cours en mode prestataire.
      const melange = await srv.appel(url, {
        method: 'PUT',
        body: JSON.stringify({
          privilege: 'PRESTATAIRE',
          scopes: [...deux, { domaine_id: (refs.corps.domaines[0] || {}).id, privilege: 'GESTIONNAIRE' }],
        }),
      });
      verifier('portées domaine/secteur écartées en mode prestataire',
        melange.statut === 200 && melange.corps.scopes.length === deux.length);

      // Portée vide : le compte n'accède à aucune donnée du module.
      const vide = await srv.appel(url, {
        method: 'PUT', body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: [] }),
      });
      verifier('aucun prestataire retenu : privilège conservé sans portée',
        vide.statut === 200 && vide.corps.privilege === 'PRESTATAIRE' && vide.corps.scopes.length === 0);

      verifier('privilège Prestataire refusé dans l’espace PLAN',
        (await srv.appel(`/api/m/droits/PLAN/users/${encodeURIComponent(cible.username)}`, {
          method: 'PUT', body: JSON.stringify({ privilege: 'PRESTATAIRE', scopes: [] }),
        })).statut === 400);
    }

    const journal = await srv.appel('/api/m/droits/PLAN/audit');
    verifier('journal d’audit du module', journal.statut === 200);

    const verif = await srv.appel('/api/m/droits/PLAN/audit/verify');
    verifier('chaîne d’audit intègre', verif.statut === 200 && verif.corps.ok !== false,
      JSON.stringify(verif.corps).slice(0, 120));
  } finally {
    srv.arreter();
  }
  return bilan('Module DROITS');
};
