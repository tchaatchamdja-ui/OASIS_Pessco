// SURV dans un navigateur — la suite n° 0.b de l'écran « Exécution de la
// Surveillance » (ADR-003, 5.f.1).
//
// ── Pourquoi une suite à part, et non des contrôles de plus dans « parcours » ──
//
// `parcours.smoke.js` porte 3 200 lignes et 110 contrôles, tous sur le portail et
// les deux pages qui l'entourent. Y ajouter un second écran ferait un fichier que
// personne ne lirait, et le garde-fou de taille le refuserait à bon droit.
//
// Un écran, une suite. C'est aussi ce qui permet au relevé des gestes de **lancer
// la suite de l'écran qu'il mesure** : `scripts/relever-gestes.js` lit le nom de
// la suite dans la table des écrans, et l'instrumentation voyage avec elle.
//
// ── Ce que cette suite éprouve, et ce qu'elle n'éprouve pas encore ──
//
// Elle monte l'écran, parcourt ses sept pages **par de vrais clics**, et vérifie
// que chacune se remplit, qu'elles diffèrent, qu'aucune ne déborde, et que la
// console reste muette.
//
// Elle n'exerce **aucune écriture**. C'est délibéré, et c'est la méthode qui a
// porté le portail de 14 gestes couverts à 66 : on ouvre d'abord l'écran, on
// mesure ce que cela couvre, puis on ajoute les rondes d'écriture une par une —
// chacune avec l'assertion du résultat **en base** et le retour en arrière. Un
// contrôle d'écriture qui laisse le bac dans un état que le suivant hérite est
// pire que pas de contrôle.
//
// ── La mesure qui a précédé l'écriture de ce fichier ──
//
// Les sept pages ont été ouvertes à la main avant qu'une assertion soit écrite :
// contenu de 759 à 3 873 caractères, aucun débordement, **aucun incident de
// console**. Les seuils ci-dessous viennent de là, et non d'une supposition.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'execution', 'js', 'exec-app.js');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// ── Les pages que l'aiguillage sait rendre, et celles qu'un menu offre ──
//
// Mesuré le 14 octobre 2026, en cherchant par où atteindre l'écran des activités
// (`exec-activites.js`, 69 occurrences, le fichier le plus chargé de SURV) :
// l'aiguillage de `execRenderPage` porte **treize** cas, les deux tables de
// navigation en offrent **neuf**, et **quatre pages ne sont atteignables par
// rien** — ni par un menu, ni par un appel de `execNavigateTo`, ni par une
// ancre d'URL.
//
// Ce n'est pas un détail de dénominateur : c'est une question de maîtrise
// d'ouvrage. Une page que l'aiguillage sait rendre et qu'aucun chemin n'ouvre est
// soit un écran oublié d'un menu, soit du code mort. Les deux se corrigent, mais
// pas de la même façon, et ce n'est pas à la conversion d'en décider.
//
// Le contrôle refuse donc une page **non déclarée**. La déclaration est dans
// `PAGES_SANS_CHEMIN` ci-dessous, avec ce que la mesure dit de chacune.
const PAGES_SANS_CHEMIN = {
  execution: 'l’écran « Exécution des activités » — le tableau des dossiers, 69 occurrences'
    + ' de geste. Son volet de dossier, lui, **est** atteignable : la page « Constatations »'
    + ' et le tableau de bord ouvrent `execOpenDossierSlider`. C’est donc la table qui est'
    + ' sans chemin, non le volet qu’elle ouvrait.',
  declenchement: 'le déclenchement d’une activité. Aucun menu, aucun appel.',
  prestataires: 'le suivi par prestataire. Aucun menu, aucun appel — et il porte trois'
    + ' boutons qui ouvrent le volet de dossier, donc trois chemins de plus vers un volet'
    + ' qui en a d’autres.',
  prestataire_home: 'l’accueil de l’espace prestataire. La table `EXEC_NAV_PRESTATAIRE`'
    + ' ouvre `dashboard` et non celui-ci.',
};

// ── Les pages attendues se **lisent dans la source**, non dans une liste ──
//
// `EXEC_NAV` déclare les sept pages de l'écran. Une liste tenue ici aurait
// divergé au premier ajout, et le contrôle aurait alors mesuré sa propre liste —
// le défaut que ce dépôt a rencontré le plus souvent.
//
// On refuse si la table ne se lit pas : une table illisible et un écran sans
// pages se ressemblent, et seul le refus les distingue.
function pagesDeclarees() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const EXEC_NAV = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : EXEC_NAV introuvable dans public/modules/execution/js/exec-app.js —'
      + ' le contrôle ne sait plus quelles pages l’écran déclare.');
  }
  return [...bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]);
}

// Les cas de l'aiguillage, et les clés des deux tables de navigation. Lus dans la
// source : une liste tenue ici aurait divergé, et le contrôle aurait mesuré sa
// propre liste.
function aiguillageEtMenus() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '(\w+)': content = exec\w+\(\);/gm)].map((m) => m[1]);
  const menus = new Set();
  for (const nom of ['EXEC_NAV', 'EXEC_NAV_PRESTATAIRE']) {
    const bloc = new RegExp(`const ${nom} = \\{([\\s\\S]*?)\\n\\};`).exec(texte);
    if (!bloc) continue;
    for (const m of bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)) menus.add(m[1]);
  }
  if (!rendues.length || !menus.size) {
    throw new Error('refus : l’aiguillage de execRenderPage ou les tables de navigation ne se'
      + ' lisent plus dans exec-app.js — le contrôle ne sait plus quelles pages existent.');
  }
  return { rendues, menus: [...menus] };
}

module.exports = async function survSmoke(port) {
  console.log('\n── SURV : l’écran « Exécution de la Surveillance » dans un navigateur ──');

  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    // Le mouchard des gestes, posé seulement si `OASIS_MOUCHARD` l'est — même
    // règle que la suite « parcours », et pour la même raison : l'outil
    // instrumente la vraie suite au lieu d'en rejouer une imitation.
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1280, height: 900 });

    // La console est relevée **dès la première page**, et les incidents de la
    // connexion sont écartés : une erreur de la page de connexion passerait
    // sinon pour une erreur de SURV.
    let surv = false;
    let etape = 'montage';
    page.on('console', (m) => {
      if (surv && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (surv) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (surv) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    // ── La réponse, et non le seul message de console ──
    //
    // Un 404 se présente en console comme « Failed to load resource », **sans
    // l'adresse**. Le premier passage de la ronde du dossier en a signalé un, et
    // il a fallu réinstrumenter pour savoir lequel. On relève donc la réponse :
    // son code et son adresse, ce qui rend l'incident actionnable au lieu
    // d'énigmatique.
    page.on('response', (r) => {
      if (!surv || r.status() < 400) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    // ── La session, puis l'écran ──
    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    surv = true;
    await page.goto(`${srv.base}/modules/execution/index.html`, { waitUntil: 'networkidle2' });
    // Le module monte sa coquille puis charge ses données : on attend la barre,
    // et non un délai fixe.
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('exec-content');
        return el && el.textContent.trim().length > 200;
      },
      { timeout: 20000 },
    ).catch(() => { /* le contrôle qui suit le dira */ });

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('exec-content') || { textContent: '' }).textContent.trim().length,
      attente: !!document.querySelector('[data-oasis-loader]'),
      retour: document.querySelectorAll('.oasis-back-btn').length,
    }));
    verifier('l’écran SURV se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200 && !monte.attente,
      JSON.stringify(monte));

    // ── La barre porte ce que la source déclare ──
    let declarees = [];
    let refus = null;
    try { declarees = pagesDeclarees(); } catch (e) { refus = e.message; }
    const manquantes = declarees.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !declarees.includes(p));
    verifier('la barre de SURV porte exactement les pages que la source déclare',
      !refus && declarees.length > 0 && !manquantes.length && !inattendues.length,
      refus || `déclarées : ${declarees.length}${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    // ── Toute page que l'aiguillage sait rendre est atteignable, ou déclarée ──
    let aiguillage = null;
    let refusAiguillage = null;
    try { aiguillage = aiguillageEtMenus(); } catch (e) { refusAiguillage = e.message; }
    if (refusAiguillage) {
      verifier('toute page de SURV est atteignable, ou déclarée sans chemin', false, refusAiguillage);
    } else {
      const sansChemin = aiguillage.rendues.filter((p) => !aiguillage.menus.includes(p));
      const nonDeclarees = sansChemin.filter((p) => !PAGES_SANS_CHEMIN[p]);
      // Une déclaration périmée est une déclaration qui ment : une page déclarée
      // sans chemin qui en retrouve un doit faire rougir, comme une dispense de
      // geste devenue fausse (5.c.0).
      const declarationsPerimees = Object.keys(PAGES_SANS_CHEMIN)
        .filter((p) => !sansChemin.includes(p));
      sansChemin.filter((p) => PAGES_SANS_CHEMIN[p])
        .forEach((p) => console.log(`    ◌ page sans chemin, déclarée : ${p}`));
      verifier('toute page de SURV est atteignable, ou déclarée sans chemin',
        !nonDeclarees.length && !declarationsPerimees.length,
        [
          nonDeclarees.length ? `sans chemin et non déclarée(s) : ${nonDeclarees.join(', ')}` : '',
          declarationsPerimees.length ? `déclaration(s) périmée(s) : ${declarationsPerimees.join(', ')}` : '',
        ].filter(Boolean).join(' · ')
          || `${aiguillage.rendues.length} pages rendues, ${aiguillage.menus.length} offertes par un menu,`
            + ` ${sansChemin.length} déclarée(s) sans chemin`);
    }

    // ── Chaque page, par un vrai clic ──
    //
    // Le clic, et non `execNavigateTo(…)` : un contrôle qui appelle la fonction
    // prouve que la fonction marche, non que le bouton y mène. La leçon est de
    // 5.e.6, où un contrôle appelait `window.planBackToPortal()` — un nom
    // qu'aucun module ne connaît.
    const rendus = new Map();
    for (const cle of monte.pages) {
      /* eslint-disable no-await-in-loop */
      const vu = await page.evaluate(async (k) => {
        const b = document.querySelector(`.nav-btn[data-page="${k}"]`);
        if (!b) return { clic: false };
        b.click();
        await new Promise((r) => setTimeout(r, 1800));
        const el = document.getElementById('exec-content');
        const html = el ? el.innerHTML : '';
        return {
          clic: true,
          longueur: el ? el.textContent.trim().length : 0,
          empreinte: html.length,
          active: (document.querySelector('.nav-btn.active') || {}).dataset?.page || null,
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          attente: !!document.querySelector('[data-oasis-loader]'),
        };
      }, cle);
      rendus.set(cle, vu);
      verifier(`la page « ${cle} » de SURV se remplit au clic de son bouton`,
        vu.clic && vu.longueur > 200 && !vu.attente && vu.active === cle,
        JSON.stringify(vu));
    }

    // ── Elles diffèrent, et c'est ce qui distingue « rendue » de « rendue la
    //    même » ──
    //
    // Le portail a appris la leçon en 5.c : sept sous-vues « se remplissaient »
    // toutes, et trois rendaient le même balisage. Un contrôle par page ne le
    // voit pas ; celui-ci le voit.
    const empreintes = [...rendus.entries()].map(([k, v]) => [k, v.empreinte]);
    const doublons = empreintes.filter(([, e], i) => e > 0
      && empreintes.findIndex(([, f]) => f === e) !== i);
    verifier('les pages de SURV diffèrent les unes des autres',
      doublons.length === 0 && empreintes.length > 1,
      doublons.length ? `mêmes empreintes : ${doublons.map(([k]) => k).join(', ')}`
        : `${empreintes.length} pages, de ${Math.min(...empreintes.map((e) => e[1]))} à ${Math.max(...empreintes.map((e) => e[1]))} caractères`);

    // ── Aucune ne déborde ──
    //
    // Mesuré à 1 280 de large. Un débordement horizontal coupe des colonnes de
    // table sans rien lever, et c'est un défaut que seul un navigateur dit.
    const debordent = [...rendus.entries()].filter(([, v]) => v.debord > 0);
    verifier('aucune page de SURV ne déborde à droite',
      debordent.length === 0,
      debordent.length ? debordent.map(([k, v]) => `${k} : ${v.debord}px`).join(', ')
        : `${rendus.size} pages mesurées à 1280 de large`);

    // ══════════════════════════════════════════════════════════════════════════
    //  La ronde du dossier, par les constatations (ADR-003, 5.f.3)
    // ══════════════════════════════════════════════════════════════════════════
    //
    // ── Pourquoi cette ronde existe, et par où elle passe ──
    //
    // Les 309 gestes que la suite n° 0.b ne couvrait pas vivent **dans** les
    // pages, et la plupart dans le volet d'un dossier d'activité. Deux obstacles
    // ont été mesurés avant d'écrire une assertion :
    //
    //   1. **le bac n'a aucun dossier** — le tableau n'affiche alors que ses deux
    //      boutons. *Un contre-essai qui ne mord pas dit que les données
    //      n'exercent pas le code* : la ronde fabrique donc son régime ;
    //   2. **la page du tableau des dossiers n'est atteignable par rien** (5.f.2).
    //      Le volet, lui, l'est : la page « Constatations » porte un bouton qui
    //      l'ouvre. La ronde passe donc par là, et c'est pourquoi elle crée une
    //      constatation en plus du dossier.
    //
    // ── Et un troisième obstacle, trouvé à la mesure ──
    //
    // La page « Constatations » a **trois sous-onglets**, et son défaut est
    // « Suivi ». Une constatation en brouillon est dans « En Préparation » : la
    // ronde a d'abord mesuré une table vide avec une constatation bien créée.
    // Le sous-onglet est un geste de plus, et la suite n° 0.b ne le touchait pas.
    //
    // ── Ce que la ronde laisse derrière elle ──
    //
    // Rien. La constatation part **par son propre geste** — c'est la seule
    // écriture de cette ronde, et son nettoyage *est* sa preuve. Le dossier et sa
    // notification partent par l'API, faute de geste atteignable : le seul bouton
    // qui efface un dossier est sur la page sans chemin. C'est écrit ici parce que
    // c'est une conséquence de 5.f.2, et non une commodité.
    etape = 'ronde du dossier';
    const M = '/api/m/execution';
    const chaine = await page.evaluate(async (api) => {
      const env = async (url, methode, corps) => {
        const r = await fetch(url, {
          method: methode,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await r.json(); } catch { /* corps vide */ }
        return { statut: r.status, corps: b };
      };
      const plans = await (await fetch(`${api}/plans-valides`, { credentials: 'same-origin' })).json();
      const plan = (plans || []).find((p) => (p.activites || []).length);
      if (!plan) return { plan: false };
      const a = plan.activites[0];
      const n = await env(`${api}/notifications`, 'POST', {
        activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
        objet: 'SURV 0.c — ronde de couverture', type_supervision: 'Audit',
        date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
        lieu: 'Siège', perimetre: 'Ensemble des processus',
      });
      if (n.statut !== 201) return { plan: true, notif: n.statut };
      const notifId = n.corps.id;
      const pas = {};
      for (const etapeNotif of ['submit', 'validate', 'send']) {
        /* eslint-disable no-await-in-loop */
        pas[etapeNotif] = (await env(`${api}/notifications/${notifId}/${etapeNotif}`, 'PUT')).statut;
      }
      const accord = await env(`${api}/notifications/${notifId}/validate-accord`, 'PUT', {
        date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
      });
      const dossierId = (accord.corps || {}).dossier_id;
      const fnc = await env(`${api}/constatations`, 'POST', {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'majeur',
        description: 'SURV 0.c — écart de la ronde de couverture.',
      });
      return {
        plan: true, notifId, pas, accord: accord.statut, dossierId,
        fnc: fnc.statut, fncId: (fnc.corps || {}).id, fncStatut: (fnc.corps || {}).statut,
      };
    }, M);
    verifier('la chaîne d’un dossier se construit : notification, accord, constatation',
      chaine.plan && chaine.pas && Object.values(chaine.pas).every((c) => c === 200)
      && chaine.accord === 200 && !!chaine.dossierId
      && chaine.fnc === 201 && chaine.fncStatut === 'brouillon',
      JSON.stringify(chaine));

    if (chaine.fncId) {
      // Le module garde ses données en mémoire : un changement de page ne les
      // relit pas. On recharge l'écran — mesuré, et non supposé : la première
      // écriture de cette ronde changeait de page et mesurait une table vide.
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
      await page.waitForFunction(
        () => {
          const el = document.getElementById('exec-content');
          return el && el.textContent.trim().length > 200;
        },
        { timeout: 20000 },
      ).catch(() => {});

      const enPreparation = await page.evaluate(async () => {
        document.querySelector('.nav-btn[data-page="constatations"]').click();
        await new Promise((r) => setTimeout(r, 2000));
        const onglets = [...document.querySelectorAll('.exec-tab')]
          .map((b) => (b.getAttribute('onclick') || '').match(/currentConstSub='(\w+)'/))
          .filter(Boolean).map((m) => m[1]);
        const bouton = [...document.querySelectorAll('.exec-tab')]
          .find((x) => /currentConstSub='list'/.test(x.getAttribute('onclick') || ''));
        if (!bouton) return { onglets, sousOnglet: false };
        bouton.click();
        await new Promise((r) => setTimeout(r, 1800));
        const contenu = document.getElementById('exec-content');
        return {
          onglets,
          sousOnglet: true,
          notre: contenu.textContent.includes('SURV 0.c'),
          versDossier: document.querySelectorAll('[onclick^="execOpenDossierSlider"]').length,
          effacer: document.querySelectorAll('[onclick^="execDeleteConstatation"]').length,
        };
      });
      verifier('le sous-onglet « En Préparation » montre la constatation du dossier',
        enPreparation.sousOnglet && enPreparation.onglets.length === 3
        && enPreparation.notre && enPreparation.versDossier >= 1 && enPreparation.effacer >= 1,
        JSON.stringify(enPreparation));

      // ── Le volet du dossier, geste par geste ──
      //
      // Les sélecteurs viennent d'une mesure, non d'une lecture : la première
      // écriture de cette séquence cherchait `.real-prog-objet` et le corps du
      // volet par `[class*="slider"]`, et les deux rendaient **zéro** — un
      // contrôle qui aurait passé en ne regardant rien. Le programme est un
      // `#realisation_programme_table`, le volet un `#execSlider`.
      const volet = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const corps = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        const b = document.querySelector('[onclick^="execOpenDossierSlider"]');
        if (!b) return { bouton: false };
        b.click();
        await attendre(3000);
        const r = { bouton: true, ouvert: !!document.getElementById('execSlider') };
        r.etapes = document.querySelectorAll('[onclick^="execSwitchDossierStep"]').length;

        // 1. L'étape « Notification » redessine le volet, et le retour le redessine.
        const avant = corps();
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="notification"]')?.click();
        await attendre(1600);
        const surNotification = corps();
        document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="realisation"]')?.click();
        await attendre(1600);
        r.pas = { avant, surNotification, revenu: corps() };

        // 2. Un membre d'équipe, une ligne de programme.
        r.equipeAvant = document.querySelectorAll('.real-equipe-nom').length;
        document.querySelector('[onclick^="execAddRealisationEquipeMember"]')?.click();
        await attendre(600);
        r.equipeApres = document.querySelectorAll('.real-equipe-nom').length;
        // ── Le programme : une **ligne de saisie**, non une ligne de plus ──
        //
        // Mesuré : la table porte déjà une ligne, celle du message « aucune
        // ligne » (`#real_prog_empty`), et le geste la **remplace**. Compter les
        // lignes rendait donc 1 avant et 1 après, et l'assertion « une de plus »
        // était fausse — fausse sur un geste qui marche.
        //
        // Ce qu'on mesure est donc ce qui compte : le message part, et la ligne
        // neuve porte ses champs de saisie.
        r.progVideAvant = !!document.getElementById('real_prog_empty');
        r.progSaisieAvant = document.querySelectorAll('#realisation_programme_table tbody [data-field="date"]').length;
        document.querySelector('[onclick^="execAddRealisationProgrammeLine"]')?.click();
        await attendre(600);
        r.progVideApres = !!document.getElementById('real_prog_empty');
        r.progSaisieApres = document.querySelectorAll('#realisation_programme_table tbody [data-field="date"]').length;

        // 3. Le sélecteur de checklists s'ouvre, et se referme.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        r.picker = !!document.querySelector('[onclick^="shellCloseModal"]');
        document.querySelector('[onclick^="shellCloseModal"]')?.click();
        await attendre(900);
        r.pickerReferme = !document.querySelector('[onclick^="shellCloseModal"]');

        // 4. L'inspecteur choisi, puis l'enregistrement de la réalisation.
        const sel = document.querySelector('.real-equipe-nom');
        const opt = sel ? [...sel.options].find((o) => o.value) : null;
        if (sel && opt) { sel.value = opt.value; r.inspecteur = opt.value; }
        document.querySelector('[onclick^="execSaveRealisation"]')?.click();
        await attendre(2600);
        return r;
      });
      verifier('le volet du dossier s’ouvre, et changer d’étape le redessine',
        volet.bouton && volet.ouvert && volet.etapes >= 2
        && volet.pas.avant > 0 && volet.pas.surNotification !== volet.pas.avant,
        JSON.stringify(volet.pas || {}));
      verifier('un membre d’équipe et une ligne de programme s’ajoutent au volet',
        volet.equipeApres === volet.equipeAvant + 1
        && volet.progVideAvant === true && volet.progVideApres === false
        && volet.progSaisieApres === volet.progSaisieAvant + 1,
        JSON.stringify({
          equipe: [volet.equipeAvant, volet.equipeApres],
          messageVide: [volet.progVideAvant, volet.progVideApres],
          champsDeSaisie: [volet.progSaisieAvant, volet.progSaisieApres],
        }));
      verifier('le sélecteur de checklists s’ouvre et se referme',
        volet.picker === true && volet.pickerReferme === true,
        JSON.stringify({ ouvert: volet.picker, referme: volet.pickerReferme }));

      // ── L'écriture de la réalisation, vérifiée **en base** ──
      //
      // Ce que l'écran montre doit être ce qui est enregistré, non ce qu'il
      // espère. On redemande donc le dossier au serveur.
      const enregistre = await page.evaluate(async (ctx) => {
        const r = await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' });
        const d = r.ok ? await r.json() : null;
        if (!d) return { dossier: false };
        let equipe = d.realisation_equipe;
        if (typeof equipe === 'string') { try { equipe = JSON.parse(equipe); } catch { equipe = null; } }
        return { dossier: true, equipe, noms: (equipe || []).map((m) => m.nom) };
      }, { api: M, id: chaine.dossierId });
      verifier('l’équipe de réalisation s’enregistre, et le serveur la porte',
        enregistre.dossier && !!volet.inspecteur
        && (enregistre.noms || []).includes(volet.inspecteur),
        JSON.stringify({ attendu: volet.inspecteur, ...enregistre }));

      const refermeture = await page.evaluate(async () => {
        document.querySelector('[onclick^="execCloseSlider"]')?.click();
        await new Promise((r) => setTimeout(r, 1300));
        return { referme: !document.getElementById('execSlider') };
      });
      verifier('le volet du dossier se referme par son geste',
        refermeture.referme === true, JSON.stringify(refermeture));

      // ── Deux bascules de la page, chacune dans les deux sens ──
      //
      // *Une bascule qui s'allume sans s'éteindre passe un contrôle
      // unilatéral* — la leçon du portail (5.c.11), payée deux fois là-bas.
      // ── L'état se lit par la **classe qui le porte**, non par la chaîne entière ──
      //
      // Premier jet : comparaison de `className` d'un bout à l'autre. Rouge sur
      // un geste qui marche — la chaîne de départ portait une espace de fin que
      // le redessin ne remet pas. *Une assertion sur une chaîne entière mesure
      // aussi ce qui n'a pas de sens.*
      const bascules = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const replieEtat = () => !!document.querySelector('.app-layout')?.classList.contains('sidebar-collapsed');
        const presser = async () => {
          const b = document.querySelector('[onclick^="execToggleSidebar"]');
          if (!b) return null;
          b.click();
          await attendre(900);
          return replieEtat();
        };
        const depart = replieEtat();
        const apresUn = await presser();
        const apresDeux = await presser();
        return { depart, apresUn, apresDeux };
      });
      verifier('la barre latérale de SURV se replie et se déplie',
        bascules.apresUn === !bascules.depart && bascules.apresDeux === bascules.depart,
        JSON.stringify(bascules));

      const filtre = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const lignes = () => document.querySelectorAll('#exec-content table tbody tr').length;
        const depart = lignes();
        const t = [...document.querySelectorAll('[onclick]')]
          .find((e) => /filters\.trimestre='1'/.test(e.getAttribute('onclick') || ''));
        if (!t) return { bouton: false };
        t.click();
        await attendre(1500);
        const filtre1 = lignes();
        document.querySelector('[onclick^="execResetFilters"]')?.click();
        await attendre(1500);
        return { bouton: true, depart, filtre1, remis: lignes() };
      });
      verifier('un filtre de trimestre restreint la table, et la remise à zéro la rend',
        filtre.bouton && filtre.remis === filtre.depart && filtre.filtre1 <= filtre.depart,
        JSON.stringify(filtre));

      // ── L'écriture, et son retour en arrière dans le même geste ──
      //
      // `execDeleteConstatation` demande confirmation par le widget du socle. On
      // presse « oui », puis l'on demande au **serveur** si la constatation est
      // partie : ce que l'écran montre doit être ce qui est enregistré, non ce
      // qu'il espère.
      const effacement = await page.evaluate(async (api) => {
        const b = document.querySelector('[onclick^="execDeleteConstatation"]');
        if (!b) return { bouton: false };
        b.click();
        await new Promise((r) => setTimeout(r, 600));
        const oui = document.querySelector('.oasis-confirm-oui');
        if (!oui) return { bouton: true, confirmation: false };
        oui.click();
        await new Promise((r) => setTimeout(r, 2200));
        const r = await fetch(`${api}/constatations`, { credentials: 'same-origin' });
        const liste = r.ok ? await r.json() : [];
        return {
          bouton: true,
          confirmation: true,
          restantes: (liste || []).filter((c) => (c.description || '').includes('SURV 0.c')).length,
        };
      }, M);
      verifier('la constatation s’efface par son geste, et le serveur ne la porte plus',
        effacement.bouton && effacement.confirmation && effacement.restantes === 0,
        JSON.stringify(effacement));

      // ── Et la ronde ne laisse rien — en **un** geste, et c'est mesuré ──
      //
      // Le premier jet supprimait le dossier **puis** la notification, et le
      // second appel rendait 404. L'instrumentation des réponses, posée pour
      // nommer ce 404, a dit lequel : la suppression d'un dossier **emporte sa
      // notification et ses échanges** — « l'activité redevient à notifier »,
      // écrit dans la route elle-même.
      //
      // Le contrôle vérifie donc la cascade au lieu de la refaire. C'est un cas
      // de plus du même enseignement : *un nettoyage qu'on écrit sans mesurer
      // ajoute du bruit, et le bruit cache les vrais incidents.*
      const menage = await page.evaluate(async (ctx) => {
        const r = await fetch(`${ctx.api}/dossiers/${ctx.dossierId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'X-OASIS-Request': '1' },
        });
        const dossier = r.status;
        const restes = await (await fetch(`${ctx.api}/dossiers`, { credentials: 'same-origin' })).json();
        const notifs = await (await fetch(`${ctx.api}/notifications`, { credentials: 'same-origin' })).json();
        return {
          dossier,
          dossierEncore: (restes || []).some((d) => d.id === ctx.dossierId),
          notifEncore: (notifs || []).some((n) => n.id === ctx.notifId),
        };
      }, { api: M, dossierId: chaine.dossierId, notifId: chaine.notifId });
      verifier('effacer le dossier emporte sa notification : la ronde ne laisse rien',
        menage.dossier === 200 && !menage.dossierEncore && !menage.notifEncore,
        JSON.stringify(menage));
    }

    verifier('aucune erreur de console ni requête échouée sur SURV',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
  } finally {
    // Le journal du mouchard, relevé avant de fermer : une page fermée n'a plus
    // de `window`, et le relevé rendrait zéro geste — la mesure de rien,
    // présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = {
        enLigne: [], ecouteurs: [], propriete: [], poses: 0, pages: 0,
      };
      for (const p of await navigateur.pages()) {
        try {
          /* eslint-disable no-await-in-loop */
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
          }
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('SURV');
};
