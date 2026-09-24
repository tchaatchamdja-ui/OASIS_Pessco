// Fumée — socle : authentification, référentiels, catalogue de modules,
// bus de services et journal d'audit.
const { demarrer, verifier, bilan } = require('./harness');

module.exports = async function socleSmoke(port) {
  console.log('\n── Socle ──');
  const srv = await demarrer({ port });
  try {
    const anonyme = await srv.appel('/api/modules');
    verifier('les routes protégées refusent l’anonyme', anonyme.statut === 401, `statut ${anonyme.statut}`);

    // ── Témoins de connexion ──
    // La page qui dit ce que l'application dépose se lit avant de se
    // connecter, et la durée de session qu'elle annonce vient du paramétrage,
    // non d'un texte recopié.
    const politique = await srv.appel('/api/politique-session');
    verifier('politique de session lisible sans session',
      politique.statut === 200 && Number(politique.corps.sessionTimeoutMinutes) > 0,
      JSON.stringify(politique.corps));
    const pageCookies = await srv.appel('/cookies.html');
    verifier('page des témoins de connexion servie',
      pageCookies.statut === 200 && /oasis_session/.test(String(pageCookies.corps || '')));

    // Les en-têtes de sécurité accompagnent chaque réponse, y compris celle-ci.
    const entetes = politique.entetes || {};
    verifier('en-têtes de sécurité posés sur les réponses',
      /default-src 'self'/.test(entetes['content-security-policy'] || '')
      && entetes['x-content-type-options'] === 'nosniff'
      && entetes['x-frame-options'] === 'SAMEORIGIN',
      Object.keys(entetes).filter((k) => /policy|frame|content-type-opt/.test(k)).join(' '));

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

    // ── Forme du corps des écritures de module (FONC-01) ──
    // Une garde commune est posée sur le préfixe d'API de chaque module, avant
    // la route. Elle ne dit pas ce qu'un champ doit contenir — chaque route le
    // sait mieux — mais refuse ce qui n'a pas la forme d'un enregistrement.
    // Ses bornes sont relevées sur les données réelles : les contrôles qui
    // suivent le rappellent, pour qu'un resserrement ne passe pas inaperçu.
    const poser = (corps) => srv.appel('/api/m/ramp/parametres',
      { method: 'POST', body: JSON.stringify({ type: 'exploitants', ...corps }) });

    const ordinaire = await poser({ label: 'Essai Forme', code: 'EFO' });
    verifier('un enregistrement ordinaire passe la garde de forme',
      ordinaire.statut < 400, `statut ${ordinaire.statut}`);

    // Cinq niveaux : la plus profonde imbrication relevée dans les données.
    const profond = await poser({ label: 'Essai Profond', code: 'EPR',
      a: { b: { c: { d: { e: 'cinq niveaux' } } } } });
    verifier('cinq niveaux d’imbrication passent', profond.statut < 400, `statut ${profond.statut}`);

    // Une pièce encodée occupe légitimement un seul champ : il n'est pas borné.
    const gros = await poser({ label: 'Essai Gros', code: 'EGR', contenu: 'x'.repeat(60000) });
    verifier('un champ de 60 000 caractères passe', gros.statut < 400, `statut ${gros.statut}`);

    let sansFond = 'fond';
    for (let i = 0; i < 12; i += 1) sansFond = { n: sansFond };
    const abyssal = await poser({ label: 'Essai', code: 'EAB', trop: sansFond });
    verifier('une imbrication sans fond est refusée',
      abyssal.statut === 400 && abyssal.corps.error === 'corps_invalide',
      `statut ${abyssal.statut} ${JSON.stringify(abyssal.corps)}`);

    const nomEtrange = await poser({ label: 'Essai', 'champ avec espaces & <script>': 1 });
    verifier('un nom de champ inattendu est refusé',
      nomEtrange.statut === 400, `statut ${nomEtrange.statut}`);
  } finally {
    srv.arreter();
  }
  await controlerDoubleEnvoi();
  controlerJourLocal();
  return bilan('Socle');
};

// ── Date du calendrier local ──
// `oasisJour` et `oasisHorodatage` exécutés sous le fuseau de Porto-Novo
// (UTC+1), le 18 septembre à 00 h 30 — encore le 17 en temps universel.
function controlerJourLocal() {
  const { execFileSync } = require('child_process');
  const path = require('path');
  const script = `
    const fs = require('fs'), vm = require('vm');
    const fenetre = {};
    vm.runInContext(fs.readFileSync(${JSON.stringify(path.join(__dirname, '..', '..', 'public', 'shared', 'js', 'oasis-dates.js'))}, 'utf8'),
      vm.createContext({ window: fenetre, Date, Number, String, localStorage: { getItem: () => 'fr' } }));
    const d = new Date(Date.UTC(2026, 8, 17, 23, 30, 0));
    const local = new Date(2026, 0, 1);
    console.log(JSON.stringify({
      jour: fenetre.oasisJour(d), horodatage: fenetre.oasisHorodatage(d), utc: d.toISOString().slice(0, 10),
      minuit: fenetre.oasisJour(local), invalide: fenetre.oasisJour(new Date('x')),
    }));`;
  const r = JSON.parse(execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, TZ: 'Africa/Porto-Novo' }, encoding: 'utf8',
  }));
  verifier('à UTC+1, 00 h 30 le 18 : le jour est le 18 (le temps universel dit le 17)',
    r.jour === '2026-09-18' && r.utc === '2026-09-17', JSON.stringify(r));
  verifier('horodatage à l’heure de l’agent', r.horodatage === '2026-09-18 00:30:00', r.horodatage);
  verifier('minuit local du 1er janvier reste le 1er janvier', r.minuit === '2026-01-01', r.minuit);
  verifier('date invalide : chaîne vide', r.invalide === '', r.invalide);
}

// ── Double envoi ──
// L'enveloppe de fetch du socle (oasis-requete.js) ne renvoie pas une écriture
// identique déjà en route. Elle s'exécute ici hors navigateur, sur un faux
// fetch qui compte les envois : Node fournit Response, Headers et URL.
async function controlerDoubleEnvoi() {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const envois = [];
  let panne = false;
  const faux = (entree, o) => {
    envois.push({ methode: (o && o.method) || 'GET', marque: o && o.headers ? o.headers.get('X-OASIS-Request') : null });
    const n = envois.length;
    return new Promise((ok, ko) => setTimeout(() => (panne
      ? ko(new TypeError('réseau coupé'))
      : ok(new Response(JSON.stringify({ envoi: n }), { status: 201 }))), 20));
  };
  const fenetre = {
    fetch: faux, location: { href: 'http://oasis.test/modules/x/index.html', origin: 'http://oasis.test' },
    localStorage: { removeItem() {} },
  };
  fenetre.window = fenetre;
  const ctx = vm.createContext({ ...fenetre, window: fenetre, URL, Headers, Request, Response, FormData, setTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'shared', 'js', 'oasis-requete.js'), 'utf8'), ctx);
  const f = fenetre.fetch;
  const corps = JSON.stringify({ titre: 'Plan' });
  const creer = () => f('/api/m/planification/plans', { method: 'POST', body: corps }).then((r) => r.json(), () => 'rejet');
  const compter = async (action) => { envois.length = 0; const r = await action(); return { n: envois.length, r }; };

  const doubleClic = await compter(() => Promise.all([creer(), creer()]));
  verifier('double clic : une seule création envoyée, marquée',
    doubleClic.n === 1 && envois[0].marque === '1', `${doubleClic.n} envoi(s)`);
  verifier('double clic : la réponse est lisible par les deux appelants',
    doubleClic.r[0].envoi === 1 && doubleClic.r[1].envoi === 1, JSON.stringify(doubleClic.r));
  verifier('une création part de nouveau une fois la première revenue',
    (await compter(() => creer())).n === 1);
  verifier('deux corps différents : deux envois',
    (await compter(() => Promise.all([creer(),
      f('/api/m/planification/plans', { method: 'POST', body: '{"titre":"Autre"}' })]))).n === 2);
  verifier('suppression cliquée deux fois : un seul envoi',
    (await compter(() => Promise.all([1, 2].map(() => f('/api/x/1', { method: 'DELETE' }))))).n === 1);
  verifier('modifications et lectures non dédoublonnées',
    (await compter(() => Promise.all([
      f('/api/x/1', { method: 'PUT', body: corps }), f('/api/x/1', { method: 'PUT', body: corps }),
      f('/api/x'), f('/api/x'),
    ]))).n === 4);
  panne = true;
  const coupure = await compter(() => Promise.all([creer(), creer()]));
  panne = false;
  verifier('réseau coupé : un seul essai, l’échec rendu aux deux appelants',
    coupure.n === 1 && coupure.r.every((x) => x === 'rejet'), JSON.stringify(coupure));
  verifier('après la coupure, la création repart',
    (await compter(() => creer())).r.envoi === 1);
}
