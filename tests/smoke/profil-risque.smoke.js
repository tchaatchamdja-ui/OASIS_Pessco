// Fumée — module « Profils de Risques » : contexte, collections, droits,
// service publié et cohérence des profils produits.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function profilRisqueSmoke(port) {
  console.log('\n── Module PR — Profils de Risques ──');
  const srv = await demarrer({ port });
  try {
    await srv.connexion();

    const me = await srv.appel('/api/m/profil-risque/me');
    verifier('contexte utilisateur du module', me.statut === 200 && !!me.corps.role);

    for (const coll of ['indicateurs-conf', 'indicateurs-perf', 'indicateurs-complex', 'evaluations', 'eval-reunions']) {
      const r = await srv.appel(`/api/m/profil-risque/${coll}`);
      verifier(`collection ${coll}`, r.statut === 200 && Array.isArray(r.corps));
    }

    const docs = await srv.appel('/api/documents');
    verifier('bibliothèque documentaire', docs.statut === 200 && Array.isArray(docs.corps));

    const profils = await srv.appel('/api/shared/risk-profiles');
    verifier('service PR.riskProfiles exposé en HTTP', profils.statut === 200 && Array.isArray(profils.corps));
    const complet = (profils.corps || []).every((p) => p.prestataire_id && 'csrbo' in p && 'niveau' in p);
    verifier('contrat des profils respecté', complet, 'champs prestataire_id / niveau / csrbo');

    const unSeulParPrestataire = new Set((profils.corps || []).map((p) => p.prestataire_id)).size === (profils.corps || []).length;
    verifier('un seul profil en vigueur par prestataire', unSeulParPrestataire);

    const droits = await srv.appel('/api/m/droits/PLAN/me');
    verifier('privilège du module résolu', droits.statut === 200 && 'privilege' in droits.corps);
  } finally {
    srv.arreter();
  }
  return bilan('Module PR');
};
