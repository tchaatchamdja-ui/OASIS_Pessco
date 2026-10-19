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
      // ── **Deux** constatations, et c'est la validation du rapport qui l'exige ──
      //
      // La ronde n'en créait qu'une. Elle servait deux fins : ouvrir le volet du
      // dossier, et éprouver sa propre suppression. Les deux ont cessé de tenir
      // ensemble le jour où la ronde a validé le rapport : **valider fait sortir
      // la constatation de « En Préparation »**, et le bouton qui l'efface part
      // avec elle. Mesuré — `{"bouton":false}` — sur un geste qui marche.
      //
      // Deux constatations donc : l'une s'efface avant qu'on ouvre le volet,
      // l'autre porte la ligne qui l'ouvre.
      const fnc = await env(`${api}/constatations`, 'POST', {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'majeur',
        description: 'SURV 0.c — écart qui ouvre le volet.',
      });
      const fncJetable = await env(`${api}/constatations`, 'POST', {
        dossier_id: dossierId, domaine_id: 'AIR', criticite: 'mineur',
        description: 'SURV 0.c — écart que la ronde efface.',
      });
      return {
        plan: true, notifId, pas, accord: accord.statut, dossierId,
        fnc: fnc.statut, fncId: (fnc.corps || {}).id, fncStatut: (fnc.corps || {}).statut,
        fncJetable: (fncJetable.corps || {}).id,
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
      verifier('le sous-onglet « En Préparation » montre les constatations du dossier',
        enPreparation.sousOnglet && enPreparation.onglets.length === 3
        && enPreparation.notre && enPreparation.versDossier >= 2 && enPreparation.effacer >= 2,
        JSON.stringify(enPreparation));

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
      //
      // ── Et pourquoi ces trois contrôles passent **avant** le volet ──
      //
      // Ils étaient après, et deux sont tombés le jour où la ronde a validé le
      // rapport : la validation fait sortir la constatation de « En Préparation »,
      // donc la table perd une ligne et le bouton d'effacement disparaît. Les
      // deux rouges portaient sur des gestes qui marchent.
      //
      // *Un contrôle dont la précondition est l'état de la page doit passer avant
      // ce qui change cet état.* L'ordre d'une ronde fait partie de la ronde —
      // c'est la même leçon que l'ordre d'un relevé, apprise en 5.f.6 sur le
      // ménage qui masquait un rapport.
      const effacement = await page.evaluate(async (ctx) => {
        // ── Le bouton se désigne par **l'identifiant qu'il porte** ──
        //
        // Deux essais avant celui-ci, et les deux disaient quelque chose :
        //
        //   · « la dernière ligne, puisque la jetable a été créée en second » —
        //     faux, la table trie par date **décroissante**, et c'est l'autre qui
        //     est partie. Vert sur « il en reste une », faux sur *laquelle* ;
        //     seule l'assertion ajoutée par prudence l'a dit ;
        //   · « la ligne dont le texte porte la description » — la ligne est
        //     trouvée, et le bouton n'y est pas : chaque constatation occupe
        //     **deux** `<tr>`, le résumé qui porte les actions et le détail,
        //     masqué, qui porte le texte.
        //
        // L'identifiant, lui, ne dépend ni d'un tri ni d'une mise en page : la
        // ronde sait quelle constatation elle a créée, et le balisage le nomme
        // dans son `onclick`. *Désigner par ce qu'on a créé, non par où cela
        // s'affiche.*
        const b = document.querySelector(`[onclick^="execDeleteConstatation('${ctx.jetable}'"]`);
        if (!b) return { bouton: false, cherche: ctx.jetable };
        b.click();
        await new Promise((r) => setTimeout(r, 600));
        const oui = document.querySelector('.oasis-confirm-oui');
        if (!oui) return { bouton: true, confirmation: false };
        oui.click();
        await new Promise((r) => setTimeout(r, 2200));
        const r = await fetch(`${ctx.api}/constatations`, { credentials: 'same-origin' });
        const liste = r.ok ? await r.json() : [];
        return {
          bouton: true,
          confirmation: true,
          // Il en restait deux : celle qui ouvre le volet doit survivre.
          restantes: (liste || []).filter((c) => (c.description || '').includes('SURV 0.c')).length,
          jetableEncore: (liste || []).some((c) => (c.description || '').includes('que la ronde efface')),
        };
      }, { api: M, jetable: chaine.fncJetable });
      verifier('une constatation s’efface par son geste, et le serveur ne la porte plus',
        effacement.bouton && effacement.confirmation
        && effacement.restantes === 1 && effacement.jetableEncore === false,
        JSON.stringify(effacement));


      // ── Le volet du dossier, geste par geste ──
      //
      // Les sélecteurs viennent d'une mesure, non d'une lecture : la première
      // écriture de cette séquence cherchait `.real-prog-objet` et le corps du
      // volet par `[class*="slider"]`, et les deux rendaient **zéro** — un
      // contrôle qui aurait passé en ne regardant rien. Le programme est un
      // `#realisation_programme_table`, le volet un `#execSlider`.
      const volet = await page.evaluate(async (dossierId) => {
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

        // ── Le geste de fermeture s'éprouve **ici**, et pas à la fin ──
        //
        // Il l'était à la fin, jusqu'à ce que la ronde aille jusqu'à la clôture :
        // `execCloseDossier` referme le volet lui-même, et le geste n'était plus
        // pressé par personne — la couverture a perdu un nom sans qu'aucun
        // contrôle ne tombe.
        //
        // *Un geste couvert par effet de bord n'est pas un geste couvert.* On le
        // presse donc tant que la ligne qui réouvre le volet est là : après la
        // validation du rapport, la constatation quitte « En Préparation » et
        // cette ligne disparaît.
        document.querySelector('[onclick^="execCloseSlider"]')?.click();
        await attendre(1300);
        r.fermeParSonGeste = !document.getElementById('execSlider');
        document.querySelector('[onclick^="execOpenDossierSlider"]')?.click();
        await attendre(3000);
        r.reouvert = !!document.getElementById('execSlider');

        // 1 ter. Le sélecteur de checklists : ouvert, annulé, puis ouvert et **validé**
        //
        // Le jeu d'essai porte deux modèles de checklist ; le sélecteur n'en
        // propose qu'un, et le dit : *« filtrées par le secteur de l'activité
        // (1 disponible) »*. Le filtre vient du secteur du prestataire du
        // dossier, et le contrôle ne suppose donc **aucun nombre** : il exige
        // qu'il y en ait au moins un, et coche le premier.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        r.picker = !!document.querySelector('[onclick^="shellCloseModal"]');
        r.casesProposees = document.querySelectorAll('.picker-chk-cb').length;
        document.querySelector('[onclick^="shellCloseModal"]')?.click();
        await attendre(900);
        r.pickerReferme = !document.querySelector('[onclick^="shellCloseModal"]');

        // Annulé, rien ne doit avoir été retenu — c'est l'autre moitié du geste,
        // et celle qu'un contrôle unilatéral oublie.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        const cases = [...document.querySelectorAll('.picker-chk-cb')];
        if (cases[0]) {
          cases[0].checked = true;
          r.checklistCochee = cases[0].value;
          document.querySelector('[onclick^="execSaveChecklistsPicker"]')?.click();
          await attendre(3000);
        }
        r.gestesDeChecklist = [...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)\s*\(/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean).filter((n, i, a) => a.indexOf(n) === i);
        const retenues = async () => {
          const d = await (await fetch(`/api/m/execution/dossiers/${dossierId}`, { credentials: 'same-origin' })).json();
          try { return JSON.parse(d.realisation_checklists || '[]'); } catch { return null; }
        };
        r.retenuesApresChoix = await retenues();

        // ── Le retrait, ici et pas à la rédaction ──
        //
        // Son bouton n'existe **qu'à l'étape Réalisation** : relevé à la
        // rédaction, il n'y est pas. Le premier jet l'y cherchait et rendait
        // « bouton absent » sur un geste qui marche, trois étapes plus loin.
        const retirer = document.querySelector('[onclick^="execRemoveDossierChecklist"]');
        r.boutonRetirer = !!retirer;
        if (retirer) {
          retirer.click();
          await attendre(700);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.retraitConfirme = !!oui;
          if (oui) { oui.click(); await attendre(3000); }
        }
        r.retenuesApresRetrait = await retenues();

        // Et l'on en retient une de nouveau : la rédaction a besoin d'une
        // checklist pour que son geste de validation existe.
        document.querySelector('[onclick^="execOpenChecklistsPicker"]')?.click();
        await attendre(2000);
        const encore = [...document.querySelectorAll('.picker-chk-cb')];
        if (encore[0]) {
          encore[0].checked = true;
          document.querySelector('[onclick^="execSaveChecklistsPicker"]')?.click();
          await attendre(3000);
        }

        // ── Le remplisseur de checklist : 141 items, 31 regroupements ──
        //
        // C'est le plus gros morceau du volet, et un éditeur **plein écran** :
        // il se superpose à tout, replie la barre du portail et mémorise son
        // état pour le restaurer en partant.
        //
        // Les chiffres ci-dessous ne sont pas écrits en dur : le contrôle exige
        // qu'il y ait des items et des regroupements, et compare les états
        // **entre eux**. Le jeu d'essai en porte 141 et 31 aujourd'hui ; un
        // modèle de checklist changé ne doit pas faire rougir une mesure de
        // pliage.
        const ouvrirRemplisseur = document.querySelector('[onclick^="execOpenChecklistFiller"]');
        r.boutonRemplisseur = !!ouvrirRemplisseur;
        if (ouvrirRemplisseur) {
          ouvrirRemplisseur.click();
          await attendre(4500);
          const groupes = (sel) => document.querySelectorAll(`#execChkFillerGroups details.exec-chk-grp${sel || ''}`).length;
          const lignesVisibles = () => [...document.querySelectorAll('#execChkFillerGroups tr[data-item-id]')]
            .filter((tr) => tr.style.display !== 'none').length;
          r.remplisseur = {
            wrap: !!document.getElementById('execChkFillerWrap'),
            items: document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').length,
            groupes: groupes(),
          };

          // Tout déplier, tout plier : les deux sens, comme toute bascule.
          document.querySelector('[onclick^="execChkFillExpandAll(true)"]')?.click();
          await attendre(1200);
          r.remplisseur.ouvertsApresDepliage = groupes('[open]');
          document.querySelector('[onclick^="execChkFillExpandAll(false)"]')?.click();
          await attendre(1200);
          r.remplisseur.ouvertsApresPliage = groupes('[open]');
          document.querySelector('[onclick^="execChkFillExpandAll(true)"]')?.click();
          await attendre(1200);

          // La recherche : un terme qui ne peut rien trouver, puis le retour.
          const champ = document.getElementById('execChkFillSearch');
          if (champ) {
            r.remplisseur.avantRecherche = lignesVisibles();
            champ.value = 'zzzz-aucun-item-ne-porte-ceci';
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(1200);
            r.remplisseur.apresRecherche = lignesVisibles();
            champ.value = '';
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(1200);
            r.remplisseur.apresRemise = lignesVisibles();
          }

          // Un statut renseigné. Le geste est un **écouteur délégué** sur le
          // conteneur des regroupements : le relevé des gestes le nomme
          // `groupsEl:change` et le tient pour **indécidable**, sa cible étant
          // une variable locale sans identifiant. Exercé ici malgré tout — un
          // geste qu'on ne sait pas rapprocher n'est pas un geste qu'on renonce
          // à éprouver.
          const statut = document.querySelector('#execChkFillerGroups .exec-chk-fill-statut');
          if (statut) {
            const choix = [...statut.options]
              .find((o) => /satisfaisant/i.test(o.textContent) && !/non/i.test(o.textContent))
              || statut.options[0];
            statut.value = choix.value;
            r.reponse = { item: statut.dataset.item, statut: choix.value };
            statut.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2800);
          }
          const reponses = await (await fetch('/api/m/execution/exec-checklist-responses', { credentials: 'same-origin' })).json();
          r.reponsesEnBase = (reponses || [])
            .filter((x) => x.dossier_id === dossierId)
            .map((x) => ({ item: x.item_id, statut: x.statut_id }));

          // ── Un item « non satisfaisant » engendre une constatation ──
          //
          // Le bouton de génération est rendu pour **chaque** item, mais masqué
          // tant que le statut n'est pas non satisfaisant. On ne devine pas
          // lequel l'est : l'écran garde sa propre notion dans
          // `_execChkFillerCtx.nonSatIds`, et c'est elle qu'on lit. Deviner
          // d'après un libellé reviendrait à éprouver ma lecture du français,
          // non la règle de l'écran.
          const ctxFiller = window._execChkFillerCtx || {};
          const nonSat = (ctxFiller.nonSatIds || [])[0];
          r.nonSatConnu = !!nonSat;
          const second = [...document.querySelectorAll('#execChkFillerGroups .exec-chk-fill-statut')]
            .find((sel) => sel.dataset.item !== (r.reponse || {}).item);
          if (nonSat && second) {
            const item2 = second.dataset.item;
            const bouton = () => document.querySelector(
              `#execChkFillerGroups .exec-chk-gen-btn[data-item="${item2}"]`);
            r.genAvant = !!bouton() && bouton().style.display === 'none';
            second.value = nonSat;
            second.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2500);
            r.genVisible = !!bouton() && bouton().style.display !== 'none';

            // Le geste demande confirmation : elle est pressée, comme partout
            // ailleurs dans cette ronde.
            bouton()?.click();
            await attendre(800);
            document.querySelector('.oasis-confirm-oui')?.click();
            await attendre(3500);
            r.itemEngendre = item2;
            r.genDesactive = !!bouton() && bouton().disabled === true;
            const consts = await (await fetch('/api/m/execution/constatations', { credentials: 'same-origin' })).json();
            r.constatationEngendree = (consts || [])
              .filter((c) => c.checklist_item_id === item2)
              .map((c) => ({ cas: c.cas_type || '', liee: c.checklist_item_id, dossier: c.dossier_id }));
          }

          document.querySelector('[onclick^="execCloseChecklistFiller"]')?.click();
          await attendre(2000);
          r.remplisseurReferme = !document.getElementById('execChkFillerWrap');
        }


        // 2. Un membre d'équipe, une ligne de programme.
        //
        // ── Après les checklists, et c'est mesuré ──
        //
        // Ce bloc était **avant** le sélecteur de checklists. Son enregistrement
        // a aussitôt rendu une équipe **vide** : valider le sélecteur redessine
        // le volet, et la ligne d'équipe ajoutée plus tôt partait avec. Le
        // contrôle de l'équipe est tombé — sur un geste qui marche.
        //
        // *Un geste qui redessine efface ce que les précédents ont saisi.* Dans
        // une ronde, ce qui se saisit vient donc **après** ce qui redessine.
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

        // 4. L'inspecteur choisi, puis l'enregistrement de la réalisation.
        const sel = document.querySelector('.real-equipe-nom');
        const opt = sel ? [...sel.options].find((o) => o.value) : null;
        if (sel && opt) { sel.value = opt.value; r.inspecteur = opt.value; }
        document.querySelector('[onclick^="execSaveRealisation"]')?.click();
        await attendre(2600);
        return r;
      }, chaine.dossierId);
      verifier('le volet du dossier s’ouvre, et changer d’étape le redessine',
        volet.bouton && volet.ouvert && volet.etapes >= 2
        && volet.pas.avant > 0 && volet.pas.surNotification !== volet.pas.avant,
        JSON.stringify(volet.pas || {}));
      verifier('le volet se referme par son geste, et la ligne le réouvre',
        volet.fermeParSonGeste === true && volet.reouvert === true,
        JSON.stringify({ ferme: volet.fermeParSonGeste, reouvert: volet.reouvert }));
      verifier('un membre d’équipe et une ligne de programme s’ajoutent au volet',
        volet.equipeApres === volet.equipeAvant + 1
        && volet.progVideAvant === true && volet.progVideApres === false
        && volet.progSaisieApres === volet.progSaisieAvant + 1,
        JSON.stringify({
          equipe: [volet.equipeAvant, volet.equipeApres],
          messageVide: [volet.progVideAvant, volet.progVideApres],
          champsDeSaisie: [volet.progSaisieAvant, volet.progSaisieApres],
        }));
      verifier('le sélecteur de checklists s’ouvre, propose les modèles du secteur, et se referme',
        volet.picker === true && volet.pickerReferme === true && volet.casesProposees >= 1,
        JSON.stringify({ ouvert: volet.picker, referme: volet.pickerReferme, cases: volet.casesProposees }));

      verifier('la checklist retenue dans le sélecteur est enregistrée sur le dossier',
        !!volet.checklistCochee
        && Array.isArray(volet.retenuesApresChoix)
        && volet.retenuesApresChoix.includes(volet.checklistCochee),
        JSON.stringify({ cochee: volet.checklistCochee, retenues: volet.retenuesApresChoix }));
      verifier('la checklist retenue ouvre ses deux gestes dans le volet',
        (volet.gestesDeChecklist || []).includes('execOpenChecklistFiller')
        && (volet.gestesDeChecklist || []).includes('execRemoveDossierChecklist'),
        (volet.gestesDeChecklist || []).join(', '));
      verifier('le remplisseur de checklist s’ouvre, avec ses items et ses regroupements',
        volet.boutonRemplisseur === true && volet.remplisseur
        && volet.remplisseur.wrap === true
        && volet.remplisseur.items > 0 && volet.remplisseur.groupes > 0,
        JSON.stringify(volet.remplisseur || { bouton: volet.boutonRemplisseur }));
      verifier('« tout déplier » et « tout plier » agissent sur tous les regroupements',
        !!volet.remplisseur
        && volet.remplisseur.ouvertsApresDepliage === volet.remplisseur.groupes
        && volet.remplisseur.ouvertsApresPliage === 0,
        JSON.stringify(volet.remplisseur
          ? { groupes: volet.remplisseur.groupes, deplies: volet.remplisseur.ouvertsApresDepliage,
            plies: volet.remplisseur.ouvertsApresPliage } : {}));
      verifier('la recherche du remplisseur restreint les items, et sa remise à zéro les rend',
        !!volet.remplisseur
        && volet.remplisseur.avantRecherche > 0
        && volet.remplisseur.apresRecherche === 0
        && volet.remplisseur.apresRemise === volet.remplisseur.avantRecherche,
        JSON.stringify(volet.remplisseur
          ? { avant: volet.remplisseur.avantRecherche, pendant: volet.remplisseur.apresRecherche,
            apres: volet.remplisseur.apresRemise } : {}));
      verifier('un statut renseigné dans le remplisseur est enregistré, et le serveur le porte',
        !!volet.reponse
        && (volet.reponsesEnBase || []).some((x) => x.item === volet.reponse.item
          && x.statut === volet.reponse.statut),
        JSON.stringify({ attendu: volet.reponse, enBase: volet.reponsesEnBase }));
      verifier('un statut non satisfaisant fait paraître le geste qui engendre une constatation',
        volet.nonSatConnu === true && volet.genAvant === true && volet.genVisible === true,
        JSON.stringify({ nonSatConnu: volet.nonSatConnu, masqueAvant: volet.genAvant,
          visibleApres: volet.genVisible }));
      verifier('la constatation engendrée depuis un item est portée par le serveur, et liée à cet item',
        !!volet.itemEngendre
        && (volet.constatationEngendree || []).length === 1
        && /^Checklist —/.test(volet.constatationEngendree[0].cas)
        && volet.constatationEngendree[0].liee === volet.itemEngendre,
        JSON.stringify({ item: volet.itemEngendre, enBase: volet.constatationEngendree }));
      verifier('le geste se referme sur lui-même : l’item pourvu ne peut plus en engendrer',
        volet.genDesactive === true,
        JSON.stringify({ desactive: volet.genDesactive }));

      verifier('le remplisseur se referme par son geste',
        volet.remplisseurReferme === true,
        JSON.stringify({ referme: volet.remplisseurReferme }));

      verifier('la checklist se retire du dossier par son geste, et le serveur ne la porte plus',
        volet.boutonRetirer === true && volet.retraitConfirme === true
        && Array.isArray(volet.retenuesApresRetrait) && volet.retenuesApresRetrait.length === 0,
        JSON.stringify({ bouton: volet.boutonRetirer, confirme: volet.retraitConfirme,
          apres: volet.retenuesApresRetrait }));

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

      // ══════════════════════════════════════════════════════════════════════
      //  Le dossier avance : terrain clos, rapport rédigé, dossier soumis
      // ══════════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi cela pouvait ne pas se faire, et pourquoi cela se fait ──
      //
      // En 5.f.4, `execCloseRealisation` avait été **laissé de côté** : il fait
      // avancer le dossier, et *une ronde dont le ménage dépend de l'état qu'elle
      // vient de changer n'est pas une ronde.* La prudence était juste ; la
      // mesure la lève.
      //
      // Mesuré, dans cet ordre : le terrain clos, le dossier passe à
      // « redaction » ; soumis, il passe à « validation » et devient `soumis` ;
      // et **il reste supprimable dans les deux états** (200), sa constatation
      // aussi. Le ménage de la ronde tient donc sur tout le cycle qu'elle
      // parcourt — ce n'était pas écrit nulle part, et aucune suite ne l'avait
      // éprouvé.
      const avance = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};

        // 1. La clôture du terrain, confirmation pressée.
        document.querySelector('[onclick^="execCloseRealisation"]')?.click();
        await attendre(700);
        r.clotureConfirmee = await confirmer();
        r.etapesApresCloture = document.querySelectorAll('[onclick^="execSwitchDossierStep"]').length;

        // 1 bis. La checklist du dossier, validée puis retirée — à la rédaction,
        //        où l'onglet « Checklist et autres doc. » les porte.
        const valider = document.querySelector('[onclick^="execSetDossierChecklistValidee"]');
        r.boutonValiderChecklist = !!valider;
        if (valider) {
          valider.click();
          await attendre(700);
          r.checklistValideeConfirmee = await confirmer();
        }

        // 2. Une annexe, et l'objet de l'activité rédigé.
        r.annexeAvant = document.querySelectorAll('#execSlider [class*="annexe"]').length;
        document.querySelector('[onclick^="execAddAnnexeBlock"]')?.click();
        await attendre(800);
        r.annexeApres = document.querySelectorAll('#execSlider [class*="annexe"]').length;
        const objet = document.getElementById('dossier_objet_activite');
        r.objet = objet ? 'SURV 0.c — objet rédigé par la ronde.' : null;
        if (objet) objet.value = r.objet;
        document.querySelector('[onclick^="execSaveDossier"]')?.click();
        await attendre(2600);

        // ── 2 bis. Les exports : ce qu'ils fabriquent, et non ce qu'ils rendent ──
        //
        // Ces gestes ne parlent pas au serveur : ils composent le document dans
        // le navigateur, puis l'ouvrent par `window.open` ou le téléchargent par
        // une ancre sur un `Blob`. Il n'y a donc **pas de réponse HTTP** à
        // mesurer — c'était la méthode que j'avais annoncée à tort en 5.f.10.
        //
        // On capture donc le **produit** : `window.open` et
        // `URL.createObjectURL` sont relayés le temps des clics, et l'on
        // éprouve le document composé.
        //
        // ── Ce que cela ne prouve pas, et qui doit être dit ──
        //
        // Ni que le navigateur ouvre la fenêtre, ni qu'il enregistre le
        // fichier : seulement que le geste a fabriqué le bon document et l'a
        // remis au bon mécanisme. Le rendu et le téléchargement appartiennent au
        // navigateur, et un navigateur sans tête ne les fait pas comme un autre.
        // *Un relais mesure le geste jusqu'à la porte, jamais au-delà.*
        //
        // Les variantes **Word** de ces mêmes fiches ne sont pas cliquées ici :
        // elles posent `window.location.href` sur la pièce jointe, ce qui
        // emporterait la page et la ronde avec. Leur chemin passe par le
        // serveur, et il est éprouvé pour lui-même — huit contrôles sur le
        // dépôt éphémère, dans la suite HTTP.
        const relais = { fenetres: [], blobs: [] };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => {
          const recu = { html: '' };
          relais.fenetres.push(recu);
          return {
            document: {
              write: (h) => { recu.html += String(h || ''); },
              close: () => {},
            },
            focus: () => {},
            print: () => {},
            close: () => {},
          };
        };
        URL.createObjectURL = (blob) => { relais.blobs.push(blob); return vraiURL.call(URL, blob); };

        const clic = async (prefixe) => {
          const b = document.querySelector(`#execSlider [onclick^="${prefixe}"]`);
          if (!b) return false;
          b.click();
          await attendre(1200);
          return true;
        };
        r.exports = {
          classeur: await clic('execExportConstatations'),
          fichesDuDossier: await clic('execFichesConstatDossier'),
          ficheConstat: await clic('execExportFicheConstat'),
          ficheSuivi: await clic('execExportFicheSuivi'),
        };
        // Les documents ouverts, dans l'ordre des clics.
        r.documentsOuverts = relais.fenetres.map((f) => ({
          longueur: f.html.length,
          html: /<html/i.test(f.html),
          tableau: /<table|<section|rubrique/i.test(f.html),
        }));
        // Et le classeur, lu dans son Blob — un `revokeObjectURL` ne détruit pas
        // l'objet, seulement son adresse.
        r.classeurs = [];
        for (const b of relais.blobs) {
          const texte = await b.text();
          r.classeurs.push({
            type: b.type, longueur: texte.length,
            lignes: texte.trim().split('\n').length,
            tabulations: (texte.match(/\t/g) || []).length,
            // Un classeur bien formé a autant de colonnes à chaque ligne que
            // dans son en-tête. C'est une propriété de la table, et non de son
            // contenu — elle ne se dément pas si le jeu d'essai change.
            colonnes: texte.trim().split('\n').map((l) => l.split('\t').length),
          });
        }
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;

        // 3. La soumission, confirmation pressée.
        document.querySelector('[onclick^="execSubmitDossier"]')?.click();
        await attendre(800);
        r.soumissionConfirmee = await confirmer();
        r.gestesDeValidation = [...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)\s*\(/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean)
          .filter((n, i, a) => a.indexOf(n) === i);
        return r;
      });
      verifier('clore le terrain fait passer le dossier à la rédaction, et une annexe s’y ajoute',
        avance.clotureConfirmee === true && avance.etapesApresCloture >= 3
        && avance.annexeApres > avance.annexeAvant,
        JSON.stringify({
          cloture: avance.clotureConfirmee,
          etapes: avance.etapesApresCloture,
          annexes: [avance.annexeAvant, avance.annexeApres],
        }));

      const avanceEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        const liste = (v) => {
          if (typeof v !== 'string') return Array.isArray(v) ? v : null;
          try { return JSON.parse(v); } catch { return null; }
        };
        return {
          statut: d.statut, etape: d.current_step, objet: d.objet_activite || '',
          validees: liste(d.checklists_validees), retenues: liste(d.realisation_checklists),
        };
      }, { api: M, id: chaine.dossierId });
      verifier('les quatre exports de la rédaction fabriquent chacun leur document',
        !!avance.exports && avance.exports.classeur === true
        && avance.exports.fichesDuDossier === true
        && avance.exports.ficheConstat === true && avance.exports.ficheSuivi === true,
        JSON.stringify(avance.exports));
      verifier('les documents ouverts en fenêtre sont des pages complètes et garnies',
        (avance.documentsOuverts || []).length === 3
        && (avance.documentsOuverts || []).every((d) => d.html && d.tableau && d.longueur > 500),
        JSON.stringify(avance.documentsOuverts));
      verifier('le classeur des constatations porte un en-tête et ses lignes, toutes de même largeur',
        (avance.classeurs || []).length === 1
        && avance.classeurs[0].lignes >= 2
        && avance.classeurs[0].colonnes.length >= 2
        && new Set(avance.classeurs[0].colonnes).size === 1
        && /excel|spreadsheet/i.test(avance.classeurs[0].type),
        JSON.stringify(avance.classeurs));

      verifier('la checklist du dossier se valide à la rédaction, et le serveur la porte',
        avance.boutonValiderChecklist === true && avance.checklistValideeConfirmee === true
        && (avanceEnBase.validees || []).includes(volet.checklistCochee),
        JSON.stringify({ valider: avance.boutonValiderChecklist, validees: avanceEnBase.validees }));
      verifier('le dossier soumis porte en base son objet, son statut et son étape',
        avance.soumissionConfirmee === true
        && avanceEnBase.statut === 'soumis' && avanceEnBase.etape === 'validation'
        && avanceEnBase.objet === avance.objet,
        JSON.stringify({ attendu: avance.objet, ...avanceEnBase }));

      verifier('l’étape « Validation » offre ses gestes',
        (avance.gestesDeValidation || []).includes('execValidateRapport')
        && (avance.gestesDeValidation || []).includes('execReturnDossier'),
        (avance.gestesDeValidation || []).join(', '));

      // ── Le rapport que la soumission fait naître ──
      //
      // **Correction d'une affirmation de 5.f.5.** Il y était écrit que « le geste
      // de l'écran ne passe pas par la même route que la suite HTTP », parce que
      // la liste des rapports était revenue vide. Elle l'était pour une raison
      // bien plus simple, et de mon fait : *le relevé interrogeait `/rapports`
      // **après** avoir supprimé le dossier*, et supprimer un dossier emporte ses
      // rapports.
      //
      // Mesuré proprement : le geste appelle bien `PUT /dossiers/:id/submit`, le
      // même que la suite HTTP, et il en naît un rapport **`…-v1`, statut
      // `soumis`**. L'assertion que 5.f.5 avait renoncé à écrire est donc écrite
      // ici — et la leçon de 5.f.5 tenait pour la mauvaise raison : ce n'était
      // pas une vérité héritée d'une autre suite, c'était ma mesure qui regardait
      // après le ménage.
      const rapport = await page.evaluate(async (ctx) => {
        const liste = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const miens = (liste || []).filter((r) => r.dossier_id === ctx.id);
        return { tous: (liste || []).length, miens: miens.length, premier: miens[0] || null };
      }, { api: M, id: chaine.dossierId });
      verifier('la soumission fait naître un rapport « v1 » soumis, porté par le dossier',
        rapport.miens === 1 && rapport.premier
        && rapport.premier.version === 1 && rapport.premier.statut === 'soumis'
        && /-v1$/.test(rapport.premier.reference || ''),
        JSON.stringify(rapport.premier
          ? { reference: rapport.premier.reference, version: rapport.premier.version, statut: rapport.premier.statut }
          : rapport));

      // ── Le renvoi, et pourquoi c'est celui-là qu'on exerce ──
      //
      // Des trois gestes de l'étape « Validation », le renvoi est le seul que la
      // ronde sait **défaire d'elle-même** : il ramène le dossier à la rédaction,
      // d'où la soumission l'a tiré, et l'on sait déjà que la soumission
      // fonctionne. Valider un rapport, lui, l'avance vers la transmission et les
      // suites de « Mesures d'Application » — un état dont la réversibilité n'est
      // pas mesurée, et qu'on n'exerce donc pas.
      const renvoi = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('[onclick^="execReturnDossier"]')?.click();
        await attendre(700);
        const oui = document.querySelector('.oasis-confirm-oui');
        const confirme = !!oui;
        if (oui) oui.click();
        await attendre(3800);
        return { confirme };
      });
      const renvoiEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        return { statut: d.statut, etape: d.current_step };
      }, { api: M, id: chaine.dossierId });
      verifier('le renvoi ramène le dossier à la rédaction, et le serveur le porte',
        renvoi.confirme === true && renvoiEnBase.etape === 'redaction',
        JSON.stringify({ ...renvoi, ...renvoiEnBase }));

      // ── La seconde soumission, puis la validation du rapport ──
      //
      // ── Pourquoi la validation s'exerce maintenant, et pas avant ──
      //
      // 5.f.5 et 5.f.6 l'avaient écartée faute de savoir si elle se défaisait.
      // La mesure a été faite, à trois paliers et sur trois dossiers distincts —
      // un palier ne se mesure pas sur un dossier qu'on vient de détruire :
      //
      // | Palier | Suppression du dossier |
      // |---|---|
      // | rapport **soumis** | 200 |
      // | rapport **validé** | **200** |
      // | rapport **transmis** | la transmission elle-même refuse (400) : non mesuré |
      // | dossier **clôturé** | non mesuré — le jeu d'essai n'a pas de troisième activité |
      //
      // Validé, le dossier reste donc supprimable : la ronde peut valider. Transmettre
      // et clôturer restent hors de portée, et les deux raisons sont écrites.
      const secondCycle = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};
        document.querySelector('[onclick^="execSubmitDossier"]')?.click();
        await attendre(800);
        r.resoumission = await confirmer();

        // ── L'aperçu du rapport, avant la décision ──
        //
        // `execPreviewRapport` est le geste par lequel un valideur lit ce qu'il
        // va valider. Il appelle `execDownloadRapport` pour obtenir le document
        // composé par le serveur, le met dans une iframe, et ouvre à côté un
        // pavé d'observations — ouvert à l'écriture **seulement** si le compte
        // peut valider et si le rapport est au statut « soumis ». C'est le cas
        // ici, et c'est cette branche de permission qu'on éprouve.
        //
        // Deux définitions de ce nom existaient, dans deux fichiers chargés l'un
        // après l'autre ; la seconde l'emportait en silence. La première a été
        // retirée (n° 5.f.11), et un garde-fou refuse qu'un doublon revienne.
        const apercu = document.querySelector('[onclick^="execPreviewRapport"]');
        r.boutonApercu = !!apercu;
        if (apercu) {
          apercu.click();
          await attendre(3500);
          const zone = document.getElementById('apercu_commentaires');
          r.apercu = {
            rendu: !!document.querySelector('.exec-apercu-rapport'),
            // L'iframe n'est là que si le document a été obtenu : sa présence
            // prouve que `execDownloadRapport` a rendu quelque chose.
            document: !!document.querySelector('iframe.exec-apercu-cadre'),
            zone: !!zone,
            ouverte: !!zone && !zone.readOnly,
            retour: !!document.querySelector('[onclick^="execBackToValidation"]'),
          };

          // Une observation écrite, enregistrée, puis relue chez le serveur.
          if (zone && !zone.readOnly) {
            r.observation = `Observation de la ronde ${Date.now()}`;
            zone.value = r.observation;
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('[onclick^="execSaveApercuComments"]')?.click();
            await attendre(2500);
          }

          // Et le retour : le volet revient à l'étape Validation, qui offre de
          // nouveau sa décision. Le bouton est donc **repris après** le retour,
          // et non gardé d'avant — l'aperçu a remplacé le contenu du volet.
          document.querySelector('[onclick^="execBackToValidation"]')?.click();
          await attendre(2500);
          r.revenuAValidation = !!document.querySelector('[onclick^="execValidateRapport"]');
        }

        const bouton = document.querySelector('[onclick^="execValidateRapport"]');
        r.boutonValider = !!bouton;
        if (bouton) {
          bouton.click();
          await attendre(800);
          r.validationConfirmee = await confirmer();
        }
        return r;
      });
      const cycleEnBase = await page.evaluate(async (ctx) => {
        const raps = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const miens = (raps || []).filter((x) => x.dossier_id === ctx.id)
          .map((x) => ({ version: x.version, statut: x.statut, apercu: x.commentaires_apercu || '' }))
          .sort((a, b) => a.version - b.version);
        return { rapports: miens };
      }, { api: M, id: chaine.dossierId });

      verifier('l’aperçu du rapport se rend, document compris, et son pavé d’observations est ouvert au valideur',
        secondCycle.boutonApercu === true && secondCycle.apercu
        && secondCycle.apercu.rendu === true && secondCycle.apercu.document === true
        && secondCycle.apercu.zone === true && secondCycle.apercu.ouverte === true
        && secondCycle.apercu.retour === true,
        JSON.stringify(secondCycle.apercu || { bouton: secondCycle.boutonApercu }));
      verifier('une observation saisie dans l’aperçu est enregistrée, et le serveur la porte',
        !!secondCycle.observation
        && (cycleEnBase.rapports || []).some((x) => x.apercu === secondCycle.observation),
        JSON.stringify({ attendue: secondCycle.observation,
          enBase: (cycleEnBase.rapports || []).map((x) => x.apercu) }));
      verifier('le retour de l’aperçu ramène le volet à l’étape Validation',
        secondCycle.revenuAValidation === true,
        JSON.stringify({ revenu: secondCycle.revenuAValidation }));
      verifier('une seconde soumission fait un rapport « v2 », et la validation le marque valide',
        secondCycle.resoumission === true && secondCycle.boutonValider === true
        && secondCycle.validationConfirmee === true
        && cycleEnBase.rapports.length === 2
        && cycleEnBase.rapports[1].version === 2
        && cycleEnBase.rapports[1].statut === 'valide',
        JSON.stringify({ ...secondCycle, ...cycleEnBase }));

      // ── L'envoi à l'organisme, puis la clôture : le cycle jusqu'au bout ──
      //
      // ── Le refus 400 de 5.f.7, élucidé ──
      //
      // La transmission y était notée « hors de portée : la route refuse (400),
      // non élucidé ». Le refus **est explicite dans la route**, et il est
      // légitime : `PUT /rapports/:id/transmit` exige que le rapport soit
      // *signé par l'inspecteur **et** par le directeur*.
      //
      // Et ce n'est pas la route que l'écran emprunte ici. Le bouton « Envoyer »
      // qui paraît dès que le rapport est validé appelle `/rapports/:id/send` —
      // la « transmission simple », qui n'exige que le statut `valide`. Les deux
      // coexistent et ne font pas la même chose : `/transmit` ouvre en outre les
      // constatations restées en brouillon, `/send` non.
      //
      // *Un 400 n'est pas une énigme : c'est une phrase que la route écrit.* La
      // lire a coûté deux minutes là où « non élucidé » coûtait un jalon.
      //
      // Mesuré ensuite, sur deux dossiers distincts : après `/send` le dossier
      // reste supprimable (200), et après `/close` aussi (200), clôturé. Les deux
      // derniers paliers du cycle sont donc couverts, et la ronde ne laisse
      // toujours rien.
      const finDuCycle = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const confirmer = async () => {
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3800);
          return true;
        };
        const r = {};
        const envoi = document.querySelector('[onclick^="execSendRapportValidated"]');
        r.boutonEnvoi = !!envoi;
        if (envoi) {
          envoi.click();
          await attendre(800);
          r.envoiConfirme = await confirmer();
        }
        // La clôture n'est offerte qu'une fois le rapport transmis : c'est écrit
        // dans le balisage, et le contrôle le vérifie en la trouvant.
        const cloture = document.querySelector('[onclick^="execCloseDossier"]');
        r.boutonCloture = !!cloture;
        if (cloture) {
          cloture.click();
          await attendre(800);
          r.clotureConfirmee = await confirmer();
        }
        // `execCloseDossier` referme le volet lui-même.
        r.voletReferme = !document.getElementById('execSlider');
        return r;
      });
      const finEnBase = await page.evaluate(async (ctx) => {
        const d = await (await fetch(`${ctx.api}/dossiers/${ctx.id}`, { credentials: 'same-origin' })).json();
        const raps = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const dernier = (raps || []).filter((x) => x.dossier_id === ctx.id)
          .sort((a, b) => b.version - a.version)[0] || null;
        return { statut: d.statut, etape: d.current_step, rapport: dernier ? dernier.statut : null };
      }, { api: M, id: chaine.dossierId });
      verifier('le rapport validé s’envoie à l’organisme, et le serveur le dit transmis',
        finDuCycle.boutonEnvoi === true && finDuCycle.envoiConfirme === true
        && finEnBase.rapport === 'transmis',
        JSON.stringify({ bouton: finDuCycle.boutonEnvoi, confirme: finDuCycle.envoiConfirme, rapport: finEnBase.rapport }));
      verifier('la clôture, offerte seulement après la transmission, clôt le dossier en base',
        finDuCycle.boutonCloture === true && finDuCycle.clotureConfirmee === true
        && finEnBase.statut === 'cloture' && finDuCycle.voletReferme === true,
        JSON.stringify({ bouton: finDuCycle.boutonCloture, confirme: finDuCycle.clotureConfirmee,
          statut: finEnBase.statut, voletReferme: finDuCycle.voletReferme }));

      // ══════════════════════════════════════════════════════════════════
      //  Le plan d'actions correctives, côté AAC
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi ici, et nulle part ailleurs ──
      //
      // Le PAC ne s'ouvre que pour une constatation **en vigueur**, et une
      // constatation n'y entre pas quand on veut : poser son statut par l'API
      // est **refusé (400)**, mesuré. C'est la **transmission du rapport** qui
      // l'ouvre — relevé palier par palier : création « brouillon », soumission
      // du dossier « brouillon », validation du rapport « brouillon », envoi
      // → **« ouvert »**.
      //
      // La ronde vient donc de passer par le seul état qui donne accès au PAC, et
      // c'est la seule raison pour laquelle ce bloc est ici et non dans une ronde
      // à lui. *Un état qui coûte huit gestes à atteindre ne s'atteint pas deux
      // fois.*
      //
      // ── Et une table vide sur une donnée bien créée ──
      //
      // Le premier relevé rendait « Suivi 0 » et aucun bouton de PAC, sur une
      // constatation `ouvert` en base. Le client tenait ses données **du
      // montage** : la chaîne d'API les avait créées derrière son dos.
      // `execRefreshDynamic()` les relit, et la table porte alors « Suivi 1 ».
      // C'est un geste de montage, non une assertion — et il est écrit ici parce
      // qu'il était la cause d'un rouge, non une commodité.
      //
      // ── Ce que ce bloc ne couvre pas, et qui n'est pas de sa faute ──
      //
      // `exec-pac.js` porte 35 gestes nommés ; le côté AAC en offre **sept**. Les
      // autres — soumettre le plan, l'accepter ou le renvoyer, déclarer la mise
      // en œuvre, accepter ou refuser les preuves, solder la fiche — appartiennent
      // à la **vue Prestataire**, ou à des états que seule cette vue fait
      // naître : c'est l'organisme inspecté qui propose son plan, et l'AAC qui
      // l'arbitre. Les couvrir demande de basculer de vue, et c'est une ronde à
      // part.
      etape = 'plan d’actions correctives';
      const pac = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        if (typeof window.execRefreshDynamic === 'function') {
          await window.execRefreshDynamic();
          await attendre(2500);
        }
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        // Le bouton est désigné par l'identifiant que son `onclick` porte, et non
        // par un rang dans la table : la leçon de 5.f.7.
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        const volet = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        r.ouvert = volet();
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];

        // Les deux volets repliables du PAC, chacun dans les deux sens. La
        // propriété qui change est la classe de leur conteneur, non le nombre de
        // champs — la leçon de 5.f.17.
        const ouverts = () => document.querySelectorAll('#execSlider details[open],'
          + ' #execSlider .exec-pac-bloc.ouvert, #execSlider [aria-expanded="true"]').length;
        r.pliAvant = ouverts();
        document.querySelector('#execSlider [onclick^="execPacVoletToggle"]')?.click();
        await attendre(1600);
        r.pliApres = ouverts();
        document.querySelector('#execSlider [onclick^="execAjustVoletToggle"]')?.click();
        await attendre(1600);
        r.pliAjust = ouverts();

        // Le plan saisi, puis enregistré en brouillon.
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        r.saisie = {
          cause: poser('pac_cause_primaire', 'SURV 0.c — cause primaire de la ronde.'),
          actions: poser('pac_actions_correctives', 'SURV 0.c — actions correctives de la ronde.'),
          date: poser('pac_corrective_date_prevue', '2026-12-31'),
        };
        await attendre(1200);
        document.querySelector('[onclick^="execSaveDraftPAC"]')?.click();
        await attendre(4000);
        // ── Le plan se lit au premier niveau de la constatation ──
        //
        // `execSaveDraftPAC` enregistre un **tableau** `actions_correctives`, et
        // non un objet `pac` : le premier relevé lisait `pac.cause_primaire` et
        // rendait `null` sur un enregistrement qui avait porté. Lu dans
        // `_collectPACData`, qui dit exactement ce qu'il assemble.
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        const plan = ((fnc || {}).actions_correctives || [])[0] || {};
        r.enBase = {
          cause: plan.cause_primaire || '',
          actions: plan.actions_correctives || '',
          date: plan.corrective_date_prevue || '',
        };

        // La fiche de la constatation, exportée : son produit est capturé par
        // relais, comme les autres documents composés dans le navigateur.
        const recu = { fenetres: [] };
        const vraiOpen = window.open;
        window.open = () => {
          const f = { html: '' };
          recu.fenetres.push(f);
          return {
            document: { write: (h) => { f.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        document.querySelector('[onclick^="execExporterFncPdf"]')?.click();
        await attendre(2500);
        window.open = vraiOpen;
        r.documents = recu.fenetres.map((f) => f.html.length);

        // Et le retour, qui referme le volet du PAC.
        document.querySelector('[onclick^="execRetourVolet"], [onclick^="execAnnulerSaisiePAC"]')?.click();
        await attendre(2200);
        r.referme = volet();
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('le plan d’actions correctives s’ouvre pour une constatation en vigueur',
        pac.bouton === true && pac.ouvert > 5000
        && (pac.gestes || []).includes('execSaveDraftPAC'),
        JSON.stringify({ bouton: pac.bouton, ouvert: pac.ouvert,
          gestes: (pac.gestes || []).length }));
      verifier('les volets repliables du plan d’actions se replient',
        pac.pliApres !== pac.pliAvant || pac.pliAjust !== pac.pliApres,
        JSON.stringify({ avant: pac.pliAvant, apres: pac.pliApres, ajust: pac.pliAjust }));
      verifier('le plan d’actions saisi s’enregistre en brouillon, et le serveur le porte',
        pac.saisie && pac.saisie.cause === true && pac.saisie.actions === true
        && !!pac.enBase && /cause primaire de la ronde/.test(pac.enBase.cause)
        && /actions correctives de la ronde/.test(pac.enBase.actions)
        && pac.enBase.date === '2026-12-31',
        JSON.stringify({ saisie: pac.saisie, enBase: pac.enBase }));
      verifier('la fiche de la constatation s’exporte, et le volet du plan se referme',
        (pac.documents || []).some((n) => n > 500) && pac.referme === 0,
        JSON.stringify({ documents: pac.documents, referme: pac.referme }));

      // ══════════════════════════════════════════════════════════════════
      //  La vue Prestataire, et le plan d'actions arbitré
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Pourquoi cette ronde vaut double ──
      //
      // Le PAC se joue à deux : **l'organisme inspecté propose son plan, et
      // l'Autorité l'arbitre**. Le côté AAC, couvert plus haut, n'offre que sept
      // des 35 gestes de `exec-pac.js` ; les autres n'existent que dans la vue
      // Prestataire, ou dans les états qu'elle fait naître.
      //
      // Cette ronde couvre donc les deux à la fois : la **vue Prestataire**,
      // éprouvée côté serveur depuis longtemps et jamais à l'écran, et la
      // soumission du plan qui ouvre l'arbitrage.
      //
      // ── La bascule recharge la page, et elle **persiste** ──
      //
      // `execAppliquerVue` écrit la vue chez le serveur puis appelle
      // `window.location.reload()` : « le rôle conditionne la navigation, les
      // menus et le périmètre des données », dit le commentaire — on recharge
      // plutôt que de rafraîchir écran par écran.
      //
      // La conséquence pour une suite est double. Il faut **réattendre le
      // montage** après la bascule, et il faut **revenir en vue AAC** avant de
      // finir : la vue est persistée chez le serveur, et une campagne qui la
      // laisserait sur « Prestataire » livrerait à la suivante un compte qui ne
      // voit plus que cinq pages. La suite HTTP du module s'en protège déjà par
      // un `PUT /vue` en tête ; celle-ci se protège en rétablissant.
      etape = 'vue prestataire';
      const basculer = async (libelle) => {
        await page.evaluate((mot) => {
          const b = [...document.querySelectorAll('.oasis-module-actions button')]
            .find((x) => new RegExp(mot, 'i').test(x.textContent || ''));
          if (b) b.click();
        }, libelle);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          .catch(() => { /* le contrôle qui suit le dira */ });
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(
          () => {
            const el = document.getElementById('exec-content');
            return el && el.textContent.trim().length > 100;
          }, { timeout: 20000 },
        ).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
      };

      const barreAvant = await page.evaluate(() => [...document.querySelectorAll('.oasis-module-actions button')]
        .map((b) => (b.textContent || '').trim()));
      await basculer('Vue Prestataire');

      const enPrestataire = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        r.pages = [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page);
        // Les cinq pages de la vue, parcourues par de vrais clics.
        const vues = {};
        for (const cle of r.pages) {
          document.querySelector(`.nav-btn[data-page="${cle}"]`)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2400);
          const z = document.getElementById('exec-content');
          vues[cle] = z ? z.textContent.trim().length : 0;
        }
        r.vues = vues;

        // Le plan d'actions, du côté de celui qui le propose.
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        poser('pac_cause_primaire', 'SURV 0.c — cause vue par l’organisme.');
        poser('pac_actions_correctives', 'SURV 0.c — plan proposé par l’organisme.');
        poser('pac_corrective_date_prevue', '2027-01-31');
        await attendre(1200);
        document.querySelector('[onclick^="execSubmitPAC"]')?.click();
        await attendre(1000);
        const oui = document.querySelector('.oasis-confirm-oui');
        r.confirme = !!oui;
        if (oui) { oui.click(); await attendre(4500); }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        const plan = ((fnc || {}).actions_correctives || [])[0] || {};
        r.enBase = { statut: fnc.statut, actions: plan.actions_correctives || '' };
        return r;
      }, { api: M, fncId: chaine.fncId });

      // ── La barre de la vue Prestataire, contre la source ──
      let prestDeclarees = [];
      let refusPrest = null;
      try {
        const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
        const bloc = /const EXEC_NAV_PRESTATAIRE = \{([\s\S]*?)\n\};/.exec(texte);
        if (!bloc) throw new Error('EXEC_NAV_PRESTATAIRE introuvable dans exec-app.js');
        prestDeclarees = [...bloc[1].matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]);
      } catch (e) { refusPrest = e.message; }
      const prestManquantes = prestDeclarees.filter((p) => !(enPrestataire.pages || []).includes(p));
      const prestInattendues = (enPrestataire.pages || []).filter((p) => !prestDeclarees.includes(p));
      verifier('la bascule en vue Prestataire rend exactement les pages que la source déclare',
        !refusPrest && prestDeclarees.length > 0
        && !prestManquantes.length && !prestInattendues.length,
        refusPrest || `${prestDeclarees.length} déclarées, barre : ${(enPrestataire.pages || []).join(', ')}`
          + `${prestManquantes.length ? ` — absentes : ${prestManquantes.join(', ')}` : ''}`
          + `${prestInattendues.length ? ` — inattendues : ${prestInattendues.join(', ')}` : ''}`);
      verifier('chaque page de la vue Prestataire se remplit',
        Object.values(enPrestataire.vues || {}).length > 0
        && Object.values(enPrestataire.vues || {}).every((n) => n > 100),
        JSON.stringify(enPrestataire.vues));
      verifier('le plan d’actions proposé par l’organisme est soumis, et le serveur le dit « pac_soumis »',
        enPrestataire.bouton === true
        && (enPrestataire.gestes || []).includes('execSubmitPAC')
        && !!enPrestataire.enBase && enPrestataire.enBase.statut === 'pac_soumis'
        && /plan proposé par l’organisme/.test(enPrestataire.enBase.actions),
        JSON.stringify({ bouton: enPrestataire.bouton, confirme: enPrestataire.confirme,
          enBase: enPrestataire.enBase }));

      // ── Retour en vue AAC, et l'arbitrage ──
      //
      // Le retour n'est pas une politesse : la vue est **persistée chez le
      // serveur**, et la laisser sur « Prestataire » livrerait à la campagne
      // suivante un compte qui ne voit plus que cinq pages.
      etape = 'arbitrage du plan';
      await basculer('Vue AAC');
      const arbitrage = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        r.pages = [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page);
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        // Le plan soumis fait paraître les gestes de l'arbitre : accepter, ou
        // renvoyer au postulant. Ils n'existaient pas à l'état « ouvert ».
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        const accepter = document.querySelector('[onclick^="execAccepterPAC"]');
        r.boutonAccepter = !!accepter;
        if (accepter) {
          accepter.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = { statut: fnc.statut };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('le retour en vue AAC rend les pages de l’Autorité',
        (arbitrage.pages || []).includes('plan_surveillance')
        && (arbitrage.pages || []).includes('processus')
        && (arbitrage.pages || []).length > (enPrestataire.pages || []).length,
        JSON.stringify({ aac: (arbitrage.pages || []).length,
          prestataire: (enPrestataire.pages || []).length }));
      verifier('le plan soumis fait paraître les gestes de l’arbitre, absents à l’état « ouvert »',
        (arbitrage.gestes || []).includes('execAccepterPAC')
        && (arbitrage.gestes || []).includes('execReturnPACtoPostulant')
        && !(pac.gestes || []).includes('execAccepterPAC'),
        JSON.stringify({ apresSoumission: (arbitrage.gestes || []).filter((g) => /PAC|FNC/.test(g)),
          aEtatOuvert: (pac.gestes || []).filter((g) => /PAC|FNC/.test(g)) }));
      verifier('le plan accepté par l’Autorité est marqué « pac_valide » en base',
        arbitrage.boutonAccepter === true && arbitrage.confirme === true
        && !!arbitrage.enBase && arbitrage.enBase.statut === 'pac_valide',
        JSON.stringify(arbitrage.enBase));

      // ══════════════════════════════════════════════════════════════════
      //  La fin du cycle : mise en œuvre, preuves, fiche soldée
      // ══════════════════════════════════════════════════════════════════
      //
      // Le plan accepté, il reste à l'exécuter et à le prouver. La chaîne est à
      // deux de nouveau, et chaque geste n'existe que dans l'état que le
      // précédent crée :
      //
      //   · l'organisme déclare la **mise en œuvre** et verse ses preuves
      //     (`submit-preuves`, qui exige `pac_valide` et **ne change pas le
      //     statut** — il horodate `date_preuves_mise_oeuvre`) ;
      //   · l'Autorité les **accepte** ou les refuse, puis **solde la fiche**
      //     (`close` → `soldee`).
      //
      // C'est le dernier palier du suivi d'une constatation, et le terme du
      // circuit qu'ouvre une inspection.
      etape = 'mise en œuvre du plan';
      await basculer('Vue Prestataire');
      const miseEnOeuvre = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        // ── Le bouton de soumission est **désactivé** tant qu'aucun mode n'est
        //    choisi, et le code le dit ──
        //
        // « La soumission n'a de sens qu'un mode au moins choisi » :
        // `execPacModeEdition` arrête si l'organisme verse des **preuves** ou
        // **amende** son plan, et le bouton n'apparaît qu'ensuite. Le premier
        // essai cliquait un bouton désactivé et rendait « pas d'horodatage » sur
        // un geste qui marche.
        //
        // On prend la branche des preuves : l'amendement exige un motif par
        // champ divergent, et refuse sans — ce serait une autre ronde.
        const mode = [...document.querySelectorAll('#execSlider [onclick^="execPacModeEdition"]')]
          .find((b) => /'preuves'/.test(b.getAttribute('onclick') || ''));
        r.boutonMode = !!mode;
        if (mode) { mode.click(); await attendre(2200); }
        const soumettre = [...document.querySelectorAll('#execSlider [onclick^="execSoumettreMiseEnOeuvre"]')]
          .find((b) => !b.disabled && !/amendement/.test(b.getAttribute('onclick') || ''));
        r.boutonMiseEnOeuvre = !!soumettre;
        if (soumettre) {
          soumettre.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = {
          statut: fnc.statut,
          // La route horodate le versement sans changer le statut : c'est **cet
          // horodatage** qui prouve que le geste a porté, et non une transition.
          preuves: !!fnc.date_preuves_mise_oeuvre,
        };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('l’organisme choisit son mode, déclare la mise en œuvre, et le serveur horodate son versement',
        miseEnOeuvre.bouton === true && miseEnOeuvre.boutonMode === true
        && miseEnOeuvre.boutonMiseEnOeuvre === true
        && miseEnOeuvre.confirme === true
        && !!miseEnOeuvre.enBase && miseEnOeuvre.enBase.preuves === true
        && miseEnOeuvre.enBase.statut === 'pac_valide',
        JSON.stringify({ mode: miseEnOeuvre.boutonMode,
          soumission: miseEnOeuvre.boutonMiseEnOeuvre, enBase: miseEnOeuvre.enBase }));

      etape = 'solde de la fiche';
      await basculer('Vue AAC');
      const solde = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3000);
        const suivi = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /suivi/i.test(b.textContent || '') && !/terrain/i.test(b.textContent || ''));
        if (suivi) { suivi.click(); await attendre(2600); }
        const bouton = [...document.querySelectorAll('[onclick^="execOpenPACSlider"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(ctx.fncId));
        r.bouton = !!bouton;
        if (!bouton) return r;
        bouton.click();
        await attendre(4000);
        r.gestes = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];
        const accepter = document.querySelector('[onclick^="execAccepterPreuves"]');
        r.boutonPreuves = !!accepter;
        if (accepter) {
          accepter.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (oui) { oui.click(); await attendre(4500); }
        }
        // Le geste qui solde : il referme le circuit d'une constatation.
        const solder = document.querySelector('[onclick^="execCloseFNC"]');
        r.boutonSolde = !!solder;
        if (solder) {
          solder.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          r.confirme = !!oui;
          if (oui) { oui.click(); await attendre(4500); }
        }
        const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
          { credentials: 'same-origin' })).json();
        r.enBase = { statut: fnc.statut, dateSolde: !!fnc.date_solde };
        return r;
      }, { api: M, fncId: chaine.fncId });

      verifier('l’Autorité accepte les preuves, puis solde la fiche : le serveur la dit « soldee »',
        solde.bouton === true && solde.boutonPreuves === true
        && solde.boutonSolde === true && solde.confirme === true
        && !!solde.enBase && solde.enBase.statut === 'soldee'
        && solde.enBase.dateSolde === true,
        JSON.stringify({ preuves: solde.boutonPreuves, solde: solde.boutonSolde,
          enBase: solde.enBase }));

      // Le volet a déjà été refermé par la clôture — `execCloseDossier` appelle
      // `execCloseSlider` lui-même. Le contrôle du geste de fermeture est donc
      // mené **avant** la fin du cycle, sur le volet encore ouvert : voir plus
      // haut, « changer d'étape le redessine ». Ici on ne vérifie que l'absence.
      verifier('le volet est refermé à la fin de la ronde',
        finDuCycle.voletReferme === true, JSON.stringify({ referme: finDuCycle.voletReferme }));

      // ══════════════════════════════════════════════════════════════════
      //  Les référentiels de l'écran : créés, vus, relus, retirés
      // ══════════════════════════════════════════════════════════════════
      //
      // L'écran des paramètres porte cinq familles de référentiels et le plus
      // gros gisement de gestes non couverts de SURV. Le patron est le même pour
      // chacune, et il est **réversible par construction** : ouvrir la fenêtre,
      // saisir, enregistrer, relire chez le serveur, supprimer, relire encore.
      //
      // ── Le défaut que cette ronde a trouvé ──
      //
      // Une criticité enregistrée partait bien chez le serveur et **ne
      // paraissait pas dans la table** : `execRefreshDynamic()` ne recharge que
      // ce qui bouge en cours de travail, et les référentiels sont chargés une
      // fois par session derrière le verrou `_staticLoaded` d'`execLoadData()`.
      // L'opérateur ne voyait son ajout qu'après un rechargement de page.
      //
      // Deux familles sur cinq étaient dans ce cas — les statuts de checklist et
      // les rôles d'équipe avaient déjà leur rechargement dédié. Corrigé par
      // `execRefreshReferentielsConstatation` (n° 5.f.22).
      //
      // Le contrôle ci-dessous **l'aurait pris**, et c'est pour cela qu'il
      // vérifie les deux : la table **et** le serveur. *Une écriture qui ne se
      // voit pas est une écriture dont l'opérateur doute.*
      etape = 'référentiels';
      const referentiels = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const lire = async (c) => {
          try { return await (await fetch(`${api}/${c}`, { credentials: 'same-origin' })).json(); }
          catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };
        // Les boutons de la table, comptés par famille : c'est **là** que se
        // voit ce qui a été écrit.
        const lignes = (geste) => document.querySelectorAll(`[onclick^="${geste}"]`).length;

        document.querySelector('.nav-btn[data-page="parametres"]')?.click();
        await attendre(3000);

        // La barre des paramètres, dans les deux sens.
        const sousMenus = () => document.querySelectorAll('[onclick*="_execParamSub"]').length;
        r.sousMenus = sousMenus();
        document.querySelector('[onclick^="execBasculerBarreParam"]')?.click();
        await attendre(1600);
        r.barreRepliee = sousMenus();
        document.querySelector('[onclick^="execBasculerBarreParam"]')?.click();
        await attendre(1600);
        r.barreDepliee = sousMenus();

        // Les quatre sous-menus, chacun rendant son contenu.
        const empreintes = [];
        for (const b of [...document.querySelectorAll('[onclick*="_execParamSub"]')]) {
          const h = b.getAttribute('onclick');
          [...document.querySelectorAll('[onclick*="_execParamSub"]')]
            .find((x) => x.getAttribute('onclick') === h)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2000);
          const z = document.getElementById('exec-content');
          empreintes.push(`${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`);
        }
        r.sousMenusParcourus = empreintes.length;
        r.sousMenusDistincts = new Set(empreintes).size;

        // ── Famille 1 : la criticité ──
        const premier = [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((b) => /constatations/.test(b.getAttribute('onclick') || ''));
        if (premier) { premier.click(); await attendre(2400); }
        r.crit = { avant: (await lire('criticites')).length, lignesAvant: lignes('execDeleteCriticite') };
        document.querySelector('[onclick^="execOpenCriticiteModal"]')?.click();
        await attendre(2200);
        poser('critItem', 'SURV 0.c — criticité de la ronde');
        poser('critAlias', 'RND');
        poser('critNiveau', '9');
        await attendre(900);
        document.querySelector('[onclick^="execSaveCriticite"]')?.click();
        await attendre(3500);
        const crits = await lire('criticites');
        r.crit.apres = crits.length;
        r.crit.lignesApres = lignes('execDeleteCriticite');
        const critNouvelle = crits.find((c) => /criticité de la ronde/.test(c.item || ''));
        r.crit.enBase = !!critNouvelle;
        // Et le retrait, par le bouton que porte **sa** ligne.
        if (critNouvelle) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteCriticite"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(critNouvelle.id));
          r.crit.boutonRetrait = !!b;
          if (b) { b.click(); r.crit.confirme = await confirmer(); }
          r.crit.fin = (await lire('criticites')).length;
          r.crit.lignesFin = lignes('execDeleteCriticite');
        }

        // ── Famille 2 : le type de cas ──
        r.tc = { avant: (await lire('types-cas')).length, lignesAvant: lignes('execDeleteTypeCas') };
        document.querySelector('[onclick^="execOpenTypeCasModal"]')?.click();
        await attendre(2200);
        poser('tcItem', 'SURV 0.c — type de cas de la ronde');
        poser('tcDesc', 'Posé par la ronde, retiré par elle.');
        poser('tcOrdre', '9');
        await attendre(900);
        document.querySelector('[onclick^="execSaveTypeCas"]')?.click();
        await attendre(3500);
        const tcs = await lire('types-cas');
        r.tc.apres = tcs.length;
        r.tc.lignesApres = lignes('execDeleteTypeCas');
        const tcNouveau = tcs.find((c) => /type de cas de la ronde/.test(c.item || ''));
        r.tc.enBase = !!tcNouveau;
        if (tcNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteTypeCas"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(tcNouveau.id));
          r.tc.boutonRetrait = !!b;
          if (b) { b.click(); r.tc.confirme = await confirmer(); }
          r.tc.fin = (await lire('types-cas')).length;
          r.tc.lignesFin = lignes('execDeleteTypeCas');
        }

        // ── Famille 3 : le rôle d'équipe, qui a son propre rechargement ──
        const autres = [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((b) => /autres/.test(b.getAttribute('onclick') || ''));
        if (autres) { autres.click(); await attendre(2500); }
        r.role = { avant: (await lire('exec-roles-equipe')).length };
        document.querySelector('[onclick^="execOpenRoleEquipeModal"]')?.click();
        await attendre(2400);
        poser('req_item', 'SURV 0.c — rôle de la ronde');
        poser('req_ordre', '9');
        poser('req_description', 'Posé par la ronde, retiré par elle.');
        await attendre(900);
        document.querySelector('[onclick^="execSaveRoleEquipe"]')?.click();
        await attendre(3500);
        const roles = await lire('exec-roles-equipe');
        r.role.apres = roles.length;
        r.role.lignesApres = lignes('execDeleteRoleEquipe');
        const roleNouveau = roles.find((x) => /rôle de la ronde/.test(x.item || ''));
        r.role.enBase = !!roleNouveau;
        if (roleNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteRoleEquipe"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(roleNouveau.id));
          r.role.boutonRetrait = !!b;
          if (b) {
            b.click();
            await attendre(1200);
            // Ce retrait-là passe par la confirmation du module, non par celle
            // du socle : deux fenêtres de confirmation coexistent dans SURV.
            const oui = document.querySelector('.oasis-confirm-oui, .exec-proc-confirm-oui,'
              + ' [onclick*="execProcConfirmerOui"]')
              || [...document.querySelectorAll('button')]
                .find((x) => /^(Supprimer|Confirmer|Oui)$/i.test((x.textContent || '').trim()));
            r.role.confirme = !!oui;
            if (oui) { oui.click(); await attendre(3200); }
          }
          r.role.fin = (await lire('exec-roles-equipe')).length;
        }
        return r;
      }, M);

      verifier('la barre des paramètres se replie et se déplie, et ses quatre sous-menus rendent chacun leur contenu',
        referentiels.sousMenus > 0 && referentiels.barreDepliee === referentiels.sousMenus
        && referentiels.sousMenusParcourus >= 4
        && referentiels.sousMenusDistincts === referentiels.sousMenusParcourus,
        JSON.stringify({ sousMenus: referentiels.sousMenus, repliee: referentiels.barreRepliee,
          depliee: referentiels.barreDepliee, parcourus: referentiels.sousMenusParcourus,
          distincts: referentiels.sousMenusDistincts }));

      // ── Le contrôle qui a trouvé le défaut : la table **et** le serveur ──
      //
      // `lignesApres > lignesAvant` est la moitié qui manquait. Sans elle, le
      // contrôle aurait été vert sur un écran qui n'affichait pas ce qu'il
      // venait d'écrire.
      verifier('une criticité créée paraît dans la table, est portée par le serveur, et se retire',
        referentiels.crit.apres === referentiels.crit.avant + 1
        && referentiels.crit.enBase === true
        && referentiels.crit.lignesApres > referentiels.crit.lignesAvant
        && referentiels.crit.boutonRetrait === true && referentiels.crit.confirme === true
        && referentiels.crit.fin === referentiels.crit.avant
        && referentiels.crit.lignesFin === referentiels.crit.lignesAvant,
        JSON.stringify(referentiels.crit));
      verifier('un type de cas créé paraît dans la table, est porté par le serveur, et se retire',
        referentiels.tc.apres === referentiels.tc.avant + 1
        && referentiels.tc.enBase === true
        && referentiels.tc.lignesApres > referentiels.tc.lignesAvant
        && referentiels.tc.boutonRetrait === true && referentiels.tc.confirme === true
        && referentiels.tc.fin === referentiels.tc.avant
        && referentiels.tc.lignesFin === referentiels.tc.lignesAvant,
        JSON.stringify(referentiels.tc));
      verifier('un rôle d’équipe créé est porté par le serveur, et se retire',
        referentiels.role.apres === referentiels.role.avant + 1
        && referentiels.role.enBase === true
        && referentiels.role.fin === referentiels.role.avant,
        JSON.stringify(referentiels.role));

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
        const rapports = await (await fetch(`${ctx.api}/rapports`, { credentials: 'same-origin' })).json();
        const consts = await (await fetch(`${ctx.api}/constatations`, { credentials: 'same-origin' })).json();
        return {
          dossier,
          dossierEncore: (restes || []).some((d) => d.id === ctx.dossierId),
          notifEncore: (notifs || []).some((n) => n.id === ctx.notifId),
          // La cascade porte aussi les rapports : c'est **cette** interrogation,
          // faite après la suppression, qui avait fait écrire une fausse
          // conclusion en 5.f.5.
          rapportsEncore: (rapports || []).filter((r) => r.dossier_id === ctx.dossierId).length,
          // Et les constatations — dont celle qu'un item de checklist a
          // engendrée. La cascade se mesure sur tout ce que la ronde a créé,
          // non sur ce dont on se souvient qu'elle a créé.
          constatationsEncore: (consts || []).filter((c) => c.dossier_id === ctx.dossierId).length,
        };
      }, { api: M, dossierId: chaine.dossierId, notifId: chaine.notifId });
      verifier('effacer le dossier emporte sa notification, ses rapports et ses constatations : la ronde ne laisse rien',
        menage.dossier === 200 && !menage.dossierEncore && !menage.notifEncore
        && menage.rapportsEncore === 0 && menage.constatationsEncore === 0,
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
        enLigne: [], ecouteurs: [], propriete: [], jsx: [], poses: 0, pages: 0,
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
            vu.jsx.push(...(j.durable.jsx || []));
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
