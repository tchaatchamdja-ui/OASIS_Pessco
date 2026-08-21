// Fumée — socle : authentification, référentiels, catalogue de modules,
// bus de services et journal d'audit.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function socleSmoke(port) {
  console.log('\n── Socle ──');
  const srv = await demarrer({ port });
  try {
    const anonyme = await srv.appel('/api/modules');
    verifier('les routes protégées refusent l’anonyme', anonyme.statut === 401, `statut ${anonyme.statut}`);

    const me = await srv.connexion();
    verifier('connexion superadmin', me && me.ok === true);

    const modules = await srv.appel('/api/modules');
    verifier('catalogue des modules servi', modules.statut === 200 && Array.isArray(modules.corps));
    const installes = (modules.corps || []).filter((m) => m.installed).map((m) => m.code);
    verifier('cartes du portail marquées installées', installes.length >= 1, installes.join(', '));

    const supers = await srv.appel('/api/modules/super-menus');
    verifier('modules découverts et exposés au front', supers.statut === 200 && supers.corps.length >= 3,
      (supers.corps || []).map((m) => m.key).join(' → '));

    // La barre supérieure d'un module ne propose que ses voisins de carte.
    const supersPlan = await srv.appel('/api/modules/super-menus?module=plans');
    verifier('super-menus limités à la carte du module',
      supersPlan.statut === 200 && supersPlan.corps.length >= 2
      && supersPlan.corps.every((m) => m.portal === 'PLAN'),
      (supersPlan.corps || []).map((m) => `${m.key}:${m.portal}`).join(' → '));

    const supersSurv = await srv.appel('/api/modules/super-menus?module=execution');
    verifier('module seul sur sa carte : aucun voisin proposé',
      supersSurv.statut === 200 && supersSurv.corps.length === 1
      && supersSurv.corps[0].key === 'execution',
      (supersSurv.corps || []).map((m) => m.key).join(' → '));

    const cartes = await srv.appel('/api/modules/cartes');
    verifier('carte du portail associée à un module',
      cartes.statut === 200 && Object.keys(cartes.corps || {}).length >= 1, JSON.stringify(cartes.corps));

    const svc = await srv.appel('/api/services');
    verifier('inventaire des services inter-modules', svc.statut === 200 && svc.corps.some((s) => s.nom === 'PR.riskProfiles'));

    for (const ref of ['/api/domaines', '/api/secteurs', '/api/sous-activites', '/api/prestataires', '/api/inspecteurs']) {
      const r = await srv.appel(ref);
      verifier(`référentiel ${ref}`, r.statut === 200 && Array.isArray(r.corps));
    }

    const audit = await srv.appel('/api/audit');
    verifier('journal d’audit lisible', audit.statut === 200);
  } finally {
    srv.arreter();
  }
  return bilan('Socle');
};
