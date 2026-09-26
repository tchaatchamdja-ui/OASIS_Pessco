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
    // La page qui dit ce que l'application dépose se lit consultAvant de se
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

    // ── Consultations de données personnelles (fiche technique §5.2) ──
    // Le journal ne portait que des verbes d'écriture : on savait qui avait
    // changé un dossier, jamais qui l'avait ouvert. Cette trace-là ne se
    // reconstitue pas après coup — c'est pourquoi elle est gardée ici.
    // Deux précautions. La consultation entre au journal *après* l'envoi de la
    // réponse : lire dans la foulée peut le prendre de court, on attend donc le
    // compte voulu. Et `/api/audit` rend du plus récent au plus ancien : la
    // dernière consultation est en tête, non en queue.
    const consultations = async () => (await srv.appel('/api/audit')).corps
      .filter((e) => e.action === 'CONSULTATION');
    const derniere = (l) => l[0];
    const consultationsAu = async (n) => {
      for (let i = 0; i < 20; i += 1) {
        const l = await consultations();
        if (l.length >= n) return l;
        await new Promise((r) => { setTimeout(r, 25); });
      }
      return consultations();
    };

    const consultAvant = (await consultations()).length;
    await srv.appel('/api/referentiels/inspecteurs');
    const consultApres = await consultationsAu(consultAvant + 1);
    verifier('la consultation du personnel entre au journal',
      consultApres.length === consultAvant + 1
      && derniere(consultApres).details.nature === 'personnel',
      JSON.stringify(derniere(consultApres) || null).slice(0, 140));

    await srv.appel('/api/users');
    const consultComptes = derniere(await consultationsAu(consultApres.length + 1));
    verifier('la consultation de la liste des comptes entre au journal',
      consultComptes.details.nature === 'identite' && consultComptes.user === 'superadmin@anac.bj',
      JSON.stringify(consultComptes).slice(0, 140));

    // Une donnée qui ne porte personne n'encombre pas le journal : sans cette
    // borne, chaque lecture d'écran y écrirait une ligne.
    const consultN1 = (await consultations()).length;
    await srv.appel('/api/referentiels/domaines');
    await srv.appel('/api/health');
    verifier('un référentiel sans personne n’écrit rien au journal',
      (await consultations()).length === consultN1);

    // Un refus n'est pas une consultation : il ne montre rien.
    const consultN2 = (await consultations()).length;
    const consultRefus = await srv.appel('/api/users/inconnu@nulle-part.bj');
    verifier('une lecture refusée n’écrit rien au journal',
      consultRefus.statut >= 400 && (await consultations()).length === consultN2, `statut ${consultRefus.statut}`);

    // ── Horodatage vérifié (fiche technique §3.3) ──
    // Sans serveur de temps déclaré, l'état honnête est « non vérifiée » — et
    // il doit se voir, dans la sonde comme au journal.
    const santeHorloge = (await srv.appel('/api/health')).corps;
    verifier('la sonde de santé rend l’état de l’horloge',
      santeHorloge.horloge && santeHorloge.horloge.verifiee === false
      && !!santeHorloge.horloge.motif,
      JSON.stringify(santeHorloge.horloge));
    verifier('l’horodatage non vérifié est consigné au journal',
      audit.corps.some((e) => e.action === 'HORLOGE_NON_VERIFIEE'));
    verifier('les entrées du journal portent une date ISO',
      audit.corps.every((e) => /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(e.ts)));

    // ── Durées de conservation et purge (fiche technique §5.2) ──
    // Rien n'expirait : le journal des envois gardait des messages d'août et
    // personne n'aurait su dire combien de temps l'application conserve quoi.
    const ret = await srv.appel('/api/retention');
    verifier('l’état de conservation est servi',
      ret.statut === 200 && Array.isArray(ret.corps.lignes) && ret.corps.lignes.length >= 10,
      `statut ${ret.statut}`);

    const parNom = Object.fromEntries((ret.corps.lignes || []).map((l) => [l.collection, l]));
    verifier('chaque durée porte son motif',
      (ret.corps.lignes || []).every((l) => typeof l.motif === 'string' && l.motif.length > 20));

    // Le point qui compte : un journal chaîné s'archive, il ne se purge pas.
    // Retirer une entrée romprait la chaîne SHA-256 du §F.3.
    verifier('les journaux d’audit sont en archivage, jamais en purge',
      parNom.audit.action === 'archive' && parNom.module_audit.action === 'archive',
      `${parNom.audit.action} / ${parNom.module_audit.action}`);
    verifier('les actes d’autorité ne sont pas purgés automatiquement',
      ['execution', 'mesures', 'planification', 'ramp']
        .every((c) => parNom[c] && parNom[c].action === 'conserver'));

    // L'exécution à blanc ne touche à rien.
    const courriersAvant = srv.donnees('emails').length;
    const blanc = await srv.appel('/api/retention/purger',
      { method: 'POST', body: JSON.stringify({}) });
    verifier('la purge à blanc ne retire rien',
      blanc.statut === 200 && blanc.corps.applique === false
      && srv.donnees('emails').length === courriersAvant,
      `statut ${blanc.statut}`);

    // Et la chaîne d'audit survit à tout : c'est la garantie du §F.3.
    const chaineApres = await srv.appel('/api/audit/verify');
    verifier('la chaîne d’audit reste vérifiable après la rétention',
      chaineApres.corps.valid === true, JSON.stringify(chaineApres.corps));

    // ── Effacement d'un compte (droit à l'effacement) ──
    // Un compte se désactivait, jamais ne s'effaçait : le droit n'avait aucun
    // moyen technique. Ces contrôles tiennent les deux bouts — que
    // l'effacement efface, et qu'il n'emporte pas ce qu'il ne doit pas.
    const MDP_ADMIN = 'Aerosup@2026!Uemoa';
    const effacer = (qui, mdp) => srv.appel(`/api/users/${encodeURIComponent(qui)}`,
      { method: 'DELETE', body: JSON.stringify({ adminPassword: mdp }) });

    const sansMdp = await effacer('m.ahoyo@anac.bj', 'mauvais');
    verifier('effacement : le mot de passe du demandeur est exigé',
      sansMdp.statut === 403 && sansMdp.corps.error === 'admin_password',
      `${sansMdp.statut} ${sansMdp.corps.error}`);

    const soiMeme = await effacer('superadmin@anac.bj', MDP_ADMIN);
    verifier('effacement : on n’efface pas son propre compte',
      soiMeme.statut === 400 && soiMeme.corps.error === 'self', soiMeme.corps.error);

    const avant = (await srv.appel('/api/users')).corps.length;
    const fait = await effacer('m.ahoyo@anac.bj', MDP_ADMIN);
    verifier('effacement : le compte part', fait.statut === 200 && fait.corps.ok,
      JSON.stringify(fait.corps));
    verifier('effacement : plus aucune trace dans le fichier des comptes',
      !/m\.ahoyo/.test(JSON.stringify(srv.donnees('users'))));
    verifier('effacement : la fiche du répertoire du personnel part aussi',
      !/m\.ahoyo/i.test(JSON.stringify(srv.donnees('referentiels').inspecteurs || [])));
    verifier('effacement : la liste en compte un de moins',
      (await srv.appel('/api/users')).corps.length === avant - 1);

    const reconnexion = await srv.appel('/api/login',
      { method: 'POST', body: JSON.stringify({ username: 'm.ahoyo@anac.bj', password: MDP_ADMIN }) });
    verifier('effacement : le compte effacé ne se connecte plus',
      reconnexion.statut === 401, String(reconnexion.statut));

    // Ce que l'effacement ne doit pas emporter : la chaîne d'audit, et la
    // trace de l'acte lui-même — c'est ce qui le rend redevable.
    const chaine = await srv.appel('/api/audit/verify');
    verifier('effacement : la chaîne d’audit reste vérifiable',
      chaine.corps && chaine.corps.valid === true, JSON.stringify(chaine.corps));
    const journal = (await srv.appel('/api/audit')).corps;
    const acte = (Array.isArray(journal) ? journal : journal.entries || [])
      .find((e) => e.action === 'COMPTE_EFFACE');
    verifier('effacement : l’acte est inscrit au journal, avec sa cible',
      !!acte && acte.details.cible === 'm.ahoyo@anac.bj', acte ? acte.details.cible : '—');

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
