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
    // ── Le délai de protocole, et une campagne rougie par la charge ──
    //
    // Le 20 octobre 2026, `planification-navigateur` a rendu
    // « Runtime.callFunctionOn timed out » au terme d'une campagne de huit
    // suites de navigateur — et la même suite, rejouée seule, a passé. Ce
    // n'était pas un défaut de l'écran : c'était le **délai de protocole par
    // défaut** de Puppeteer, atteint sous la charge.
    //
    // Un aléa qui fait rougir une campagne coûte autant qu'un vrai défaut :
    // il faut le lire, le rejouer, l'écarter. Le délai est donc posé — cinq
    // minutes, bien au-delà de toute évaluation que ces rondes demandent, et
    // bien en dessous d'un blocage réel, qui doit toujours finir par rendre.
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
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
    // Les refus déclarés (voir `REFUS_ATTENDUS` plus bas) laissent aussi une
    // trace en console : « Failed to load resource: … 409 », **sans l'adresse**
    // — c'est la cécité du message que 5.f.6 avait déjà relevée. On tient donc
    // le compte des refus déclarés rencontrés, et l'on dispense le message de
    // console qui porte **le même code**. Rien de plus large : un 409 non
    // déclaré garde son message, et un message dont le code n'a pas été déclaré
    // reste un incident.
    const codesAttendus = new Set();
    page.on('console', (m) => {
      if (!surv || m.type() !== 'error') return;
      const texte = m.text();
      const code = (/status of (\d{3})/.exec(texte) || [])[1];
      if (code && codesAttendus.has(Number(code))) return;
      incidents.push(`[${etape}] console : ${texte.slice(0, 160)}`);
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
    // ── Les refus que la ronde **provoque exprès** ──
    //
    // Certains contrôles éprouvent un refus : une notification envoyée qui
    // refuse d'être effacée (409), par exemple. Ce refus est la propriété
    // mesurée — le relever comme un incident ferait rougir le contrôle de la
    // console sur un comportement correct, et le premier passage l'a fait.
    //
    // Ils sont donc **déclarés**, un par un, avec leur code, leur adresse et
    // leur raison. Pas de filtre large : un 409 ailleurs reste un incident, et
    // une déclaration qui cesserait de correspondre cesserait de dispenser.
    const REFUS_ATTENDUS = [
      {
        code: 409, methode: 'DELETE', chemin: /\/notifications\/[\w-]+$/,
        pourquoi: 'une notification envoyée refuse d’être effacée : elle s’annule.'
          + ' Éprouvé par « une notification envoyée refuse d’être effacée, s’annule,'
          + ' et se retire alors » (n° 5.f.26).',
      },
      {
        code: 404, methode: 'GET', chemin: /\/notifications\/[\w-]+$/,
        pourquoi: 'la ronde relève l’**absence** d’une activité qu’elle vient de'
          + ' supprimer définitivement : le 404 est la preuve, non l’incident.'
          + ' Éprouvé par « la bonne référence l’emporte : le serveur ne connaît'
          + ' plus l’activité » (n° 5.f.30).',
      },
    ];
    page.on('response', (r) => {
      if (!surv || r.status() < 400) return;
      const chemin = r.url().replace(srv.base, '');
      const attendu = REFUS_ATTENDUS.some((x) => x.code === r.status()
        && x.methode === r.request().method() && x.chemin.test(chemin));
      if (attendu) { codesAttendus.add(r.status()); return; }
      incidents.push(`[${etape}] ${r.status()} ${chemin.slice(0, 120)}`);
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
    // ── Instrumentation de la chasse au second dossier (n° 5.f.26) ──
    //
    // ── La ronde part-elle d'un magasin vide ? ──
    //
    // Question d'apparence oiseuse, et qui a coûté un tour entier. La suite
    // rendait 80/87 sur un code qui avait rendu 87/87 la veille, et le commit
    // d'alors rougissait aussi : un second dossier apparaissait pendant la
    // ronde, d'identifiant **stable d'un passage à l'autre** quand celui de la
    // chaîne varie. Il n'était nulle part sur disque, et un bac neuf en portait
    // zéro. C'était un serveur orphelin de 7 h 51, resté d'un passage
    // interrompu sur le port de cette suite, que le harnais réutilisait en
    // silence — avec ses données. Le harnais le refuse désormais.
    //
    // Reste ce contrôle, qui vaut mieux que le relevé qui l'a trouvé : il dit
    // en une ligne que la ronde juge **ses** écritures, et non celles d'un
    // autre. S'il rougit, ce n'est pas la ronde qu'il faut lire.
    const auMontage = await page.evaluate(async (api) => {
      try {
        return (await (await fetch(`${api}/dossiers`, { credentials: 'same-origin' })).json())
          .map((d) => d.id);
      } catch { return ['(illisible)']; }
    }, '/api/m/execution');
    verifier('la ronde part d’un magasin vide — aucun dossier d’un autre passage',
      Array.isArray(auMontage) && auMontage.length === 0,
      `${auMontage.length} dossier(s) au montage : ${JSON.stringify(auMontage).slice(0, 160)}`);

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
            // Diagnostic : combien de dossiers le bac porte-t-il à cet instant,
            // et lesquels ? Le contrôle a rougi en annonçant deux dossiers là où
            // la ronde n'en construit qu'un.
            const dos = await (await fetch('/api/m/execution/dossiers', { credentials: 'same-origin' })).json();
            r.dossiersAuFiller = (dos || []).map((d) => d.id);
            r.constatationsAuFiller = (consts || []).length;
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
        JSON.stringify({ item: volet.itemEngendre, enBase: volet.constatationEngendree,
          dossiers: volet.dossiersAuFiller, constatations: volet.constatationsAuFiller }));
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

        // ══════════════════════════════════════════════════════════════
        //  Le suivi de la fiche : discussions, commentaires, suivis
        // ══════════════════════════════════════════════════════════════
        //
        // `exec-pac-suivi.js` était à **0 geste sur 10** : la suite ne savait
        // rien de ce panneau. Il n'est pourtant atteignable qu'ici — « un suivi
        // reste amendable tant que la constatation n'est pas clôturée » —, et
        // c'est pourquoi cette section s'insère dans la ronde du solde plutôt
        // que de vivre à part.
        //
        // L'ordre n'est pas libre : `execEnvoyerEchangePac` **recharge le
        // volet** quand il a envoyé. Les discussions passent donc d'abord ;
        // tout ce qu'on poserait avant serait emporté sans trace.
        //
        // Chaque phase est gardée : une faute dans l'une ne doit pas emporter
        // les contrôles des autres, ni ceux du solde qui suivent.
        const essai = async (nom, f) => {
          try { r[nom] = await f(); } catch (e) { r[nom] = { erreur: String(e && e.message || e) }; }
        };

        // ── 1. Le tiroir des discussions, et la zone qui grandit ──
        await essai('disc', async () => {
          const d = {};
          const bouton = document.querySelector('.exec-pac-discussions');
          d.bouton = !!bouton;
          if (!bouton) return d;
          bouton.click();
          await attendre(1200);
          const tiroir = () => document.getElementById('execPacTiroir');
          d.ouvert = !!tiroir() && tiroir().classList.contains('ouvert');
          // La zone de réponse se dilate sur sa propre hauteur de contenu :
          // `oninput="this.style.height=this.scrollHeight+'px'"`. Quatre lignes
          // doivent la faire grandir — sinon le geste n'a pas porté.
          const zone = document.getElementById('exec_pac_echange_msg');
          d.zone = !!zone;
          if (zone) {
            d.hauteurAvant = Math.round(zone.getBoundingClientRect().height);
            zone.value = 'un\ndeux\ntrois\nquatre';
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            await attendre(500);
            d.hauteurApres = Math.round(zone.getBoundingClientRect().height);
            // Le message, puis l'envoi : le serveur doit le porter.
            zone.value = 'SURV 0.d — message de la ronde au prestataire.';
            zone.dispatchEvent(new Event('input', { bubbles: true }));
            const envoyer = tiroir().querySelector('[onclick^="execEnvoyerEchangePac"]');
            d.boutonEnvoyer = !!envoyer;
            if (envoyer) { envoyer.click(); await attendre(4500); }
            const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
              { credentials: 'same-origin' })).json();
            d.echangesEnBase = (fnc.echanges || []).length;
            const ech = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}/echanges`,
              { credentials: 'same-origin' })).json();
            d.echangesParLaRoute = Array.isArray(ech) ? ech.length : -1;
            d.contenuPorte = (Array.isArray(ech) ? ech : [])
              .some((x) => /SURV 0\.d/.test(x.contenu || ''));
            // Le tiroir est resté ouvert — le code le rouvre lui-même.
            d.resteOuvert = !!tiroir() && tiroir().classList.contains('ouvert');
          }
          document.querySelector('[onclick^="execPacDiscussionsFermer"]')?.click();
          await attendre(900);
          d.referme = !!tiroir() && !tiroir().classList.contains('ouvert');
          return d;
        });

        // ── 2. Le composeur de commentaires, et ses deux gardes ──
        await essai('comm', async () => {
          const c = {};
          const composeur = () => document.querySelector('.exec-suivi-composeur');
          const texte = () => document.getElementById('pac_suivi_texte');
          const ajouter = () => document.getElementById('pac_suivi_ajouter');
          const precision = () => document.getElementById('pac_suivi_precision');
          const liste = () => document.getElementById('pac_suivi_liste');
          const blocs = () => [...liste().querySelectorAll('.exec-suivi-comm')];
          c.composeur = !!composeur();
          if (!composeur()) return c;
          // La garde : « le commentaire ne s'ouvre qu'une fois l'item désigné ».
          c.texteFermeAuDepart = texte().disabled === true;
          c.boutonFermeAuDepart = ajouter().disabled === true;
          c.precisionCacheeAuDepart = precision().hidden === true;

          const cases = () => [...composeur().querySelectorAll('.exec-suivi-items input')];
          const premiere = cases().find((x) => x.value !== 'autres');
          premiere.click();
          await attendre(700);
          c.texteOuvert = texte().disabled === false;
          c.boutonOuvert = ajouter().disabled === false;
          // L'item choisi s'inscrit, numéroté sans trou.
          c.ligneInscrite = /^1\. /.test(texte().value);

          // « Autres » réclame sa précision, et la rend visible.
          const autres = document.getElementById('pac_suivi_autres');
          autres.click();
          await attendre(700);
          c.precisionVisible = precision().hidden === false;
          c.deuxLignes = texte().value.split('\n').filter((l) => /^\d\. /.test(l)).length;

          // Décocher retire la ligne de l'item — **sauf si l'AAC y a écrit**.
          // C'est la règle du code : « ses mots priment sur la case ». On
          // l'éprouve dans les deux sens, sur deux items.
          autres.click();
          await attendre(700);
          c.ligneAutresPartie = !/Autres|autres/i.test(texte().value);
          c.precisionRecachee = precision().hidden === true;
          texte().value = `${texte().value.replace(/\s+$/, '')} des mots de l’Autorité`;
          premiere.click();
          await attendre(700);
          c.ligneEcriteRestee = /des mots de l’Autorité/.test(texte().value);

          // Le refus : « Autres » coché sans précision n'ajoute rien.
          premiere.click();
          autres.click();
          await attendre(700);
          texte().value = '1. essai — sans précision';
          const avantRefus = blocs().length;
          ajouter().click();
          await attendre(900);
          c.refuseSansPrecision = blocs().length === avantRefus;

          // ── Une pièce jointe, versée pour de vrai ──
          //
          // `uploadFile` de Puppeteer ne s'appelle que depuis Node, et cette
          // ronde vit dans une évaluation de page. Un `DataTransfer` suffit : on
          // fabrique un vrai `File`, on le pose sur l'entrée, et le `change`
          // déclenche `execSuiviJoindreFichiers`, qui le **POST au serveur**.
          //
          // Ce que cela ne prouve pas, et qui doit être dit : ni que le
          // sélecteur de fichiers du système s'ouvre, ni que l'utilisateur y
          // choisit quelque chose. Aucune suite ne peut l'éprouver. Ce qui est
          // mesuré commence au fichier reçu par l'entrée.
          //
          // C'est ce chemin qui rendait `403 origine_non_reconnue` jusqu'à ce
          // tour : dix-huit versements du projet appelaient `fetch` sans
          // l'en-tête d'origine. Ce contrôle est la preuve que celui-ci aboutit.
          const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e,
            0x34, 0x0a, 0x25, 0xc7, 0xec, 0x8f, 0xa2, 0x0a]);
          const pieces = () => [...document.querySelectorAll('#pac_suivi_pj_liste .exec-suivi-pj-item')];
          const entree = composeur().querySelector('[onchange*="execSuiviJoindreFichiers"]');
          c.entreeFichier = !!entree;
          const verser = async (nom) => {
            const dt = new DataTransfer();
            dt.items.add(new File([pdf], nom, { type: 'application/pdf' }));
            entree.files = dt.files;
            entree.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2600);
          };
          if (entree) {
            await verser('preuve-ronde-1.pdf');
            c.pjUne = pieces().length;
            c.pjNom = pieces()[0] ? (pieces()[0].dataset.filename || '') : '';
            c.pjChemin = pieces()[0] ? (pieces()[0].dataset.path || '') : '';
            await verser('preuve-ronde-2.pdf');
            c.pjDeux = pieces().length;
            // La pastille se retire d'elle-même : son bouton porte
            // `onclick="this.parentElement.remove()"`, et rien d'autre.
            pieces()[1].querySelector('button').click();
            await attendre(700);
            c.pjApresRetrait = pieces().length;
            // Et l'entrée s'est vidée : `input.value = ''` à la fin du geste,
            // sans quoi le même fichier ne pourrait pas être redéposé.
            c.entreeVidee = entree.value === '';
          }

          // La précision donnée, le commentaire s'ajoute — en brouillon.
          precision().value = 'ronde SURV 0.d';
          texte().value = '1. essai — commentaire de la ronde';
          ajouter().click();
          await attendre(1200);
          c.ajoute = blocs().length === avantRefus + 1;
          const dernier = () => blocs()[blocs().length - 1];
          c.brouillon = !!dernier().querySelector('.exec-suivi-brouillon');
          c.modifiable = !!dernier().querySelector('[onclick*="execModifierCommentaireSuivi"]');
          // Le brouillon emporte la pièce déposée, et l'affiche.
          c.commFichiers = (() => {
            try { return JSON.parse(dernier().dataset.fichiers || '[]').length; }
            catch { return -1; }
          })();
          c.commLienPiece = !!dernier().querySelector('.exec-suivi-comm-pj a');
          c.composeurSansPiece = pieces().length === 0;
          // Le composeur repart à zéro.
          c.composeurVide = texte().value === '' && precision().value === ''
            && composeur().querySelectorAll('.exec-suivi-items input:checked').length === 0;

          // Il se replie et se déplie d'un clic sur son en-tête.
          const tete = dernier().querySelector('.exec-suivi-comm-tete')
            || dernier().firstElementChild;
          tete.click();
          await attendre(600);
          c.replie = dernier().classList.contains('replie');
          tete.click();
          await attendre(600);
          c.deplie = !dernier().classList.contains('replie');

          // « Modifier » n'édite pas : il **reprend** le brouillon dans le
          // composeur et retire le bloc. Deux effets, un seul geste.
          const avantReprise = blocs().length;
          dernier().querySelector('[onclick*="execModifierCommentaireSuivi"]').click();
          await attendre(900);
          c.reprisRetire = blocs().length === avantReprise - 1;
          c.reprisDansLeComposeur = /commentaire de la ronde/.test(texte().value)
            && precision().value === 'ronde SURV 0.d';
          // « Les pièces du brouillon repartent avec lui dans le composeur » :
          // la pastille est reconstruite — seconde pose du même geste, et la
          // seule qui prouve que la reprise n'oublie pas les fichiers.
          c.pieceRevenue = pieces().length;
          c.pieceRevenueRetirable = !!(pieces()[0] && pieces()[0].querySelector('button'));
          // Reposé tel quel, pour la suite.
          ajouter().click();
          await attendre(1200);
          c.repose = blocs().length === avantReprise;

          // Et il s'efface, sur confirmation du socle.
          dernier().querySelector('[onclick*="execSupprimerCommentaireSuivi"]').click();
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          c.confirmeEffacement = !!oui;
          if (oui) { oui.click(); await attendre(1200); }
          c.apresEffacement = blocs().length;
          // Reposé une dernière fois : c'est lui que l'acceptation publiera.
          precision().value = 'ronde SURV 0.d';
          const uneCase = cases().find((x) => x.value !== 'autres');
          if (!uneCase.checked) { uneCase.click(); await attendre(700); }
          if (entree) await verser('preuve-publiee.pdf');
          texte().value = '1. essai — commentaire que l’acceptation publiera';
          ajouter().click();
          await attendre(1200);
          c.finalPose = blocs().length;
          return c;
        });

        // ── 3. Les suivis : ajoutés, repris, effacés ──
        await essai('suivis', async () => {
          const s = {};
          const zone = () => document.getElementById('anac_suivi_saisie');
          const liste = () => document.getElementById('anac_suivis_list');
          const lignes = () => [...liste().querySelectorAll('.exec-suivi')];
          s.zone = !!zone();
          if (!zone()) return s;
          s.avant = lignes().length;
          s.videAnnonce = !!liste().querySelector('.exec-suivi-vide');
          const ajouter = document.querySelector('[onclick^="execAjouterSuivi"]');
          s.boutonAjouter = !!ajouter;
          zone().value = 'SURV 0.d — premier suivi de la ronde';
          ajouter?.click();
          await attendre(900);
          s.apresAjout = lignes().length;
          s.videRetire = !liste().querySelector('.exec-suivi-vide');
          s.zoneVidee = zone().value === '';

          // « Modifier » reprend le texte dans la zone et retire la ligne.
          lignes()[lignes().length - 1].querySelector('[onclick^="execModifierSuivi"]').click();
          await attendre(900);
          s.reprisRetire = lignes().length === s.apresAjout - 1;
          s.reprisDansLaZone = /premier suivi de la ronde/.test(zone().value);
          ajouter?.click();
          await attendre(900);
          s.repose = lignes().length === s.apresAjout;

          // Un second, puis effacé sur confirmation.
          zone().value = 'SURV 0.d — second suivi, celui qu’on efface';
          ajouter?.click();
          await attendre(900);
          s.deux = lignes().length === s.apresAjout + 1;
          lignes()[lignes().length - 1].querySelector('[onclick^="execSupprimerSuivi"]').click();
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          s.confirme = !!oui;
          if (oui) { oui.click(); await attendre(1200); }
          s.apresEffacement = lignes().length;
          return s;
        });

        const accepter = document.querySelector('[onclick^="execAccepterPreuves"]');
        r.boutonPreuves = !!accepter;
        if (accepter) {
          accepter.click();
          await attendre(1000);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (oui) { oui.click(); await attendre(4500); }
        }

        // ── 4. Ce que l'acceptation emporte, et ce qu'elle ferme ──
        //
        // Suivis et commentaires ne vivent que dans la page jusqu'ici :
        // `_collectFullEvalData()` les relève au moment de l'enregistrement.
        // C'est donc le geste du métier — accepter les preuves — qui les porte
        // au serveur, et c'est par lui qu'on prouve la persistance, non par un
        // appel que l'écran ne fait pas.
        //
        // Et il fait une seconde chose, que le code annonce : « les
        // commentaires en attente deviennent visibles du prestataire dès que
        // l'AAC rend une décision : ils ne sont alors plus modifiables ».
        // Le brouillon devient donc publié, et perd ses boutons.
        await essai('porte', async () => {
          const p = {};
          const fnc = await (await fetch(`${ctx.api}/constatations/${ctx.fncId}`,
            { credentials: 'same-origin' })).json();
          let ev = fnc.commentaire_evaluation;
          if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
          ev = ev || {};
          const suivis = ((ev.evaluation_anac || {}).verification || {}).suivis || [];
          const comms = ev.suivi_commentaires || [];
          p.suivisEnBase = suivis.length;
          p.suiviPorte = suivis.some((x) => /premier suivi de la ronde/.test(x.texte || ''));
          p.suiviEffacePasRevenu = !suivis.some((x) => /celui qu’on efface/.test(x.texte || ''));
          p.commsEnBase = comms.length;
          p.commPorte = comms.some((x) => /l’acceptation publiera/.test(x.texte || ''));
          const publie = comms.find((x) => /l’acceptation publiera/.test(x.texte || '')) || {};
          p.piecePortee = (publie.fichiers || []).length;
          p.pieceNommee = ((publie.fichiers || [])[0] || {}).filename || '';
          p.pieceCheminServeur = ((publie.fichiers || [])[0] || {}).path || '';
          p.tousPublies = comms.length > 0 && comms.every((x) => x.publie === true);
          // Dans le volet rouvert, un commentaire publié n'offre plus ses gestes.
          const liste = document.getElementById('pac_suivi_liste');
          p.blocsRendus = liste ? liste.querySelectorAll('.exec-suivi-comm').length : -1;
          p.plusModifiable = liste
            ? liste.querySelectorAll('[onclick*="execModifierCommentaireSuivi"]').length === 0 : null;
          return p;
        });

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

      // ── Les contrôles du panneau de suivi (n° 5.f.28) ──
      const D = solde.disc || {};
      const C = solde.comm || {};
      const S = solde.suivis || {};
      const P = solde.porte || {};
      verifier('le tiroir des discussions s’ouvre, sa zone de réponse grandit avec son contenu, et se referme par son geste',
        D.bouton === true && D.ouvert === true && D.zone === true
        && D.hauteurApres > D.hauteurAvant && D.referme === true,
        JSON.stringify({ ouvert: D.ouvert, avant: D.hauteurAvant, apres: D.hauteurApres,
          referme: D.referme, erreur: D.erreur }));
      verifier('un message part chez le serveur, se relit par la route des échanges, et le tiroir reste ouvert',
        D.boutonEnvoyer === true && D.contenuPorte === true
        && D.echangesParLaRoute >= 1 && D.resteOuvert === true,
        JSON.stringify({ envoye: D.contenuPorte, parLaRoute: D.echangesParLaRoute,
          surLaFiche: D.echangesEnBase, reste: D.resteOuvert, erreur: D.erreur }));
      verifier('le composeur de commentaires reste fermé tant qu’aucun item n’est désigné, et s’ouvre dès qu’il l’est',
        C.composeur === true && C.texteFermeAuDepart === true
        && C.boutonFermeAuDepart === true && C.precisionCacheeAuDepart === true
        && C.texteOuvert === true && C.boutonOuvert === true && C.ligneInscrite === true,
        JSON.stringify(C).slice(0, 300));
      verifier('« Autres » réclame sa précision, et la refuse absente : rien ne s’ajoute',
        C.precisionVisible === true && C.deuxLignes === 2
        && C.precisionRecachee === true && C.refuseSansPrecision === true,
        JSON.stringify({ visible: C.precisionVisible, lignes: C.deuxLignes,
          recachee: C.precisionRecachee, refuse: C.refuseSansPrecision, erreur: C.erreur }));
      verifier('décocher un item retire sa ligne — sauf si l’Autorité y a écrit : ses mots priment sur la case',
        C.ligneAutresPartie === true && C.ligneEcriteRestee === true,
        JSON.stringify({ partie: C.ligneAutresPartie, restee: C.ligneEcriteRestee,
          erreur: C.erreur }));
      verifier('le commentaire s’ajoute en brouillon, modifiable, et le composeur repart à zéro',
        C.ajoute === true && C.brouillon === true && C.modifiable === true
        && C.composeurVide === true,
        JSON.stringify({ ajoute: C.ajoute, brouillon: C.brouillon,
          modifiable: C.modifiable, composeurVide: C.composeurVide, erreur: C.erreur }));
      verifier('il se replie et se déplie d’un clic sur son en-tête',
        C.replie === true && C.deplie === true,
        JSON.stringify({ replie: C.replie, deplie: C.deplie, erreur: C.erreur }));
      verifier('« Modifier » n’édite pas : il reprend le brouillon dans le composeur et retire le bloc',
        C.reprisRetire === true && C.reprisDansLeComposeur === true && C.repose === true,
        JSON.stringify({ retire: C.reprisRetire, repris: C.reprisDansLeComposeur,
          repose: C.repose, erreur: C.erreur }));
      verifier('une pièce jointe se verse pour de vrai, se nomme, et sa pastille se retire d’elle-même',
        C.entreeFichier === true && C.pjUne === 1 && /preuve-ronde-1/.test(C.pjNom || '')
        && /^\/api\/m\/execution\/uploads\//.test(C.pjChemin || '')
        && C.pjDeux === 2 && C.pjApresRetrait === 1 && C.entreeVidee === true,
        JSON.stringify({ entree: C.entreeFichier, une: C.pjUne, nom: C.pjNom,
          chemin: C.pjChemin, deux: C.pjDeux, apres: C.pjApresRetrait,
          videe: C.entreeVidee, erreur: C.erreur }));
      verifier('le brouillon emporte la pièce déposée, l’affiche, et vide le composeur de la sienne',
        C.commFichiers === 1 && C.commLienPiece === true && C.composeurSansPiece === true,
        JSON.stringify({ fichiers: C.commFichiers, lien: C.commLienPiece,
          composeur: C.composeurSansPiece, erreur: C.erreur }));
      verifier('et sa reprise ne l’oublie pas : la pastille est reconstruite, retirable',
        C.pieceRevenue === 1 && C.pieceRevenueRetirable === true,
        JSON.stringify({ revenue: C.pieceRevenue, retirable: C.pieceRevenueRetirable,
          erreur: C.erreur }));
      verifier('un brouillon s’efface sur confirmation du socle',
        C.confirmeEffacement === true && C.apresEffacement === 0 && C.finalPose === 1,
        JSON.stringify({ confirme: C.confirmeEffacement, apres: C.apresEffacement,
          final: C.finalPose, erreur: C.erreur }));
      verifier('un suivi s’ajoute et chasse la mention « aucun suivi », se reprend par son geste, et s’efface sur confirmation',
        S.zone === true && S.videAnnonce === true && S.apresAjout === 1
        && S.videRetire === true && S.zoneVidee === true
        && S.reprisRetire === true && S.reprisDansLaZone === true && S.repose === true
        && S.deux === true && S.confirme === true && S.apresEffacement === 1,
        JSON.stringify(S).slice(0, 300));
      verifier('l’acceptation des preuves emporte suivis et commentaires chez le serveur, et publie les brouillons — qui perdent alors leurs gestes',
        P.suiviPorte === true && P.suiviEffacePasRevenu === true
        && P.commPorte === true && P.tousPublies === true
        && P.blocsRendus === 1 && P.plusModifiable === true
        && P.piecePortee === 1 && /preuve-publiee/.test(P.pieceNommee || '')
        && /^\/api\/m\/execution\/uploads\//.test(P.pieceCheminServeur || ''),
        JSON.stringify(P));

      // Le volet a déjà été refermé par la clôture — `execCloseDossier` appelle
      // `execCloseSlider` lui-même. Le contrôle du geste de fermeture est donc
      // mené **avant** la fin du cycle, sur le volet encore ouvert : voir plus
      // haut, « changer d'étape le redessine ». Ici on ne vérifie que l'absence.
      verifier('le volet est refermé à la fin de la ronde',
        finDuCycle.voletReferme === true, JSON.stringify({ referme: finDuCycle.voletReferme }));


      // ══════════════════════════════════════════════════════════════════
      //  L'aperçu du rapport, et quatre gestes qui ne sont pas de l'écran
      // ══════════════════════════════════════════════════════════════════
      //
      // `exec-rapports.js` était à **0 geste sur 6**. Le relevé en nommait six ;
      // quatre n'en sont pas — et c'est la lecture du code qui le dit, non le
      // compte.
      //
      // `window.print`, `window.close`, `this.parentElement.style.display` et
      // l'écouteur `load` vivent **dans la chaîne de caractères du document que
      // l'application fabrique** : ils s'exécutent dans la fenêtre ouverte, pas
      // dans une page de l'application. Le mouchard instrumente les pages de
      // l'application ; il ne les verra jamais, et il a raison.
      //
      // Ils n'en sont pas moins réels, et ce bloc les éprouve autrement : non en
      // les déclenchant, mais en constatant que **le document produit les
      // porte**. C'est la même distinction qu'en 5.f.10 — un relais mesure le
      // geste jusqu'à la porte, jamais au-delà ; ici on mesure ce qui franchit
      // la porte.
      //
      // Et le seul vrai geste d'écran du fichier, `execDownloadRapport`, porte
      // une distinction qui se mesure à deux faces : son second argument
      // `autoPrint` ajoute — ou n'ajoute pas — l'écouteur qui ouvre la boîte
      // d'impression.
      etape = 'aperçu du rapport';
      const apercuRapport = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        document.querySelector('.nav-btn[data-page="rapports"]')?.click();
        await attendre(3000);
        const lignes = [...document.querySelectorAll('[onclick^="execDownloadRapport"]')];
        r.gestes = lignes.length;
        if (!lignes.length) return r;

        // Relais : le document est écrit dans la fenêtre ouverte, et c'est lui
        // qu'on veut lire.
        const recus = [];
        const vraiOpen = window.open;
        window.open = () => {
          const doc = { html: '' };
          recus.push(doc);
          return {
            document: { write: (h) => { doc.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        try {
          const sansImpression = lignes
            .find((e) => /execDownloadRapport\('[^']+'\)/.test(e.getAttribute('onclick') || ''));
          const avecImpression = lignes
            .find((e) => /execDownloadRapport\('[^']+',\s*true\)/.test(e.getAttribute('onclick') || ''));
          r.deuxGestesDistincts = !!sansImpression && !!avecImpression;
          sansImpression?.click();
          await attendre(3000);
          avecImpression?.click();
          await attendre(3000);
        } finally {
          window.open = vraiOpen;
        }
        r.documents = recus.length;
        const [sans, avec] = recus;
        const porte = (h, motif) => new RegExp(motif).test(h || '');
        if (sans) {
          r.sans = {
            docComplet: porte(sans.html, '<!DOCTYPE html>') && porte(sans.html, '</html>'),
            titre: (/<title>([^<]*)<\/title>/.exec(sans.html) || [])[1] || '',
            contenu: porte(sans.html, 'id="report-content"'),
            // Les deux boutons du bandeau du document, et son bandeau refermable.
            imprimer: porte(sans.html, 'onclick="window\\.print\\(\\)"'),
            fermer: porte(sans.html, 'onclick="window\\.close\\(\\)"'),
            bandeauRefermable: porte(sans.html, "this\\.parentElement\\.style\\.display='none'"),
            // Et **pas** d'écouteur d'impression : c'est la face sans `autoPrint`.
            ecouteurImpression: porte(sans.html, "addEventListener\\('load'"),
            taille: (sans.html || '').length,
          };
        }
        if (avec) {
          r.avec = {
            ecouteurImpression: porte(avec.html, "addEventListener\\('load'"),
            appelleImprimer: porte(avec.html, 'window\\.print\\(\\)'),
            taille: (avec.html || '').length,
          };
        }
        return r;
      });

      verifier('la page des rapports offre les deux gestes d’aperçu, et chacun fabrique son document',
        apercuRapport.gestes >= 2 && apercuRapport.deuxGestesDistincts === true
        && apercuRapport.documents === 2
        && !!apercuRapport.sans && apercuRapport.sans.docComplet === true
        && apercuRapport.sans.contenu === true
        && apercuRapport.sans.titre.length > 0,
        JSON.stringify({ gestes: apercuRapport.gestes, documents: apercuRapport.documents,
          sans: apercuRapport.sans }));
      verifier('le document produit porte lui-même ses gestes — imprimer, fermer, et son bandeau refermable',
        !!apercuRapport.sans && apercuRapport.sans.imprimer === true
        && apercuRapport.sans.fermer === true
        && apercuRapport.sans.bandeauRefermable === true,
        JSON.stringify(apercuRapport.sans));
      verifier('et « autoPrint » se mesure à deux faces : l’écouteur d’impression n’est là que sur la seconde demande',
        !!apercuRapport.sans && !!apercuRapport.avec
        && apercuRapport.sans.ecouteurImpression === false
        && apercuRapport.avec.ecouteurImpression === true
        && apercuRapport.avec.appelleImprimer === true,
        JSON.stringify({ sans: apercuRapport.sans && apercuRapport.sans.ecouteurImpression,
          avec: apercuRapport.avec && apercuRapport.avec.ecouteurImpression }));

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
      // ── Les trois familles restantes : checklist, statut, délais ──
      //
      // Le patron ne change pas, et deux particularités ont été relevées avant
      // d'écrire : les gestionnaires de statuts et de sous-thèmes rendent dans
      // la fenêtre du **socle** (`#shellModal`), non dans le volet du module ;
      // et celui des sous-thèmes s'ouvre **depuis l'éditeur de checklist**, non
      // depuis le sous-menu. Un contrôle qui l'aurait cherché sur la page aurait
      // rendu « gestionnaire introuvable » sur un geste qui marche.
      etape = 'checklists et délais';
      const suite2 = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        // ── Le préfixe du module, et la faute que j'ai refaite ──
        //
        // Le client appelle `api('exec-checklists')`, et `execRoute()` de
        // `exec-boot.js` traduit tout `/api/exec-*` en
        // `/api/m/execution/exec-*`. Un `fetch` brut, lui, ne traduit rien : le
        // premier jet de cette ronde a reçu **404 sur `/api/exec-checklists`**,
        // et cinq contrôles ont rougi pour cette seule raison.
        //
        // C'est la deuxième fois : en 5.f.9 j'avais pris la même adresse pour
        // fausse chez le client, alors que la mienne l'était. *Une adresse qui
        // marche dans l'écran et pas dans l'essai ne dit rien de l'écran : elle
        // dit que l'essai n'emprunte pas le même chemin.*
        const lire = async (c) => {
          try { return await (await fetch(`${api}/${c}`,
            { credentials: 'same-origin' })).json(); } catch { return []; }
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
        const shell = () => (document.getElementById('shellModal') || { innerHTML: '' }).innerHTML.length;

        const sousMenu = (nom) => [...document.querySelectorAll('[onclick*="_execParamSub"]')]
          .find((x) => new RegExp(nom).test(x.getAttribute('onclick') || ''));
        sousMenu('checklists')?.click();
        await attendre(2500);

        // ── Famille 4 : la checklist, et son éditeur ──
        r.chk = { avant: (await lire('exec-checklists')).length };
        document.querySelector('[onclick^="execOpenChecklistModal"]')?.click();
        await attendre(2400);
        poser('clRef', 'RONDE-0.c');
        poser('clNom', 'SURV 0.c — checklist de la ronde');
        poser('clDesc', 'Posée par la ronde, retirée par elle.');
        // La portée : une case au moins, sans quoi la checklist ne s'applique
        // à rien. Le geste est `_clCocherPortee`.
        const portee = document.querySelector('#shellModal input[type="checkbox"], .modal input[type="checkbox"]');
        if (portee && !portee.checked) { portee.click(); await attendre(900); }
        await attendre(800);
        document.querySelector('[onclick^="execSaveChecklist"]')?.click();
        await attendre(3500);
        const chks = await lire('exec-checklists');
        r.chk.apres = chks.length;
        const chkNouvelle = chks.find((c) => /checklist de la ronde/.test(c.nom || ''));
        r.chk.enBase = !!chkNouvelle;
        r.chk.lignes = document.querySelectorAll('[onclick^="execDeleteChecklist"]').length;

        // L'éditeur de la checklist créée : une ligne d'item ajoutée, puis le
        // gestionnaire des sous-thèmes qu'il porte.
        if (chkNouvelle) {
          const ouvrir = [...document.querySelectorAll('[onclick^="execOpenChecklistEditor"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(chkNouvelle.id));
          r.chk.boutonEditeur = !!ouvrir;
          if (ouvrir) {
            ouvrir.click();
            await attendre(3500);
            r.editeur = { ouvert: !!document.getElementById('execCliEditorWrap') };
            const items = async () => (await lire('exec-checklist-items'))
              .filter((i) => i.checklist_id === chkNouvelle.id).length;
            r.editeur.itemsAvant = await items();
            document.querySelector('#execCliEditorWrap [onclick^="execAddChecklistRow"]')?.click();
            await attendre(3200);
            r.editeur.itemsApres = await items();
            r.editeur.lignes = document.querySelectorAll('#execCliEditorWrap tbody tr').length;

            // ── Famille 5 : le sous-thème, depuis l'éditeur ──
            document.querySelector('#execCliEditorWrap [onclick^="execOpenSousThemesManager"]')?.click();
            await attendre(2600);
            r.st = { manager: shell(), avant: (await lire('exec-checklist-sous-themes')).length };
            document.querySelector('#shellModal [onclick^="execOpenSousThemeModal"]')?.click();
            await attendre(2400);
            // Les champs du sous-thème ne portent pas tous un identifiant connu
            // d'avance : on renseigne ce que la fenêtre offre — le thème par sa
            // liste, les textes par un marqueur.
            const liste = document.querySelector('#shellModal select');
            if (liste && liste.options.length > 1) {
              liste.selectedIndex = 1;
              liste.dispatchEvent(new Event('change', { bubbles: true }));
              await attendre(800);
            }
            [...document.querySelectorAll('#shellModal input[type="text"], #shellModal input:not([type])')]
              .forEach((e, i) => {
                e.value = i === 0 ? 'SURV 0.c — sous-thème de la ronde' : `RND${i}`;
                e.dispatchEvent(new Event('input', { bubbles: true }));
              });
            await attendre(800);
            document.querySelector('#shellModal [onclick^="execSaveSousTheme"]')?.click();
            await attendre(3500);
            const sts = await lire('exec-checklist-sous-themes');
            r.st.apres = sts.length;
            const stNouveau = sts.find((x) => /sous-thème de la ronde/.test(x.libelle || x.item || ''));
            r.st.enBase = !!stNouveau;
            if (stNouveau) {
              const b = [...document.querySelectorAll('[onclick^="execDeleteSousTheme"]')]
                .find((x) => (x.getAttribute('onclick') || '').includes(stNouveau.id));
              r.st.boutonRetrait = !!b;
              if (b) { b.click(); r.st.confirme = await confirmer(); }
              r.st.fin = (await lire('exec-checklist-sous-themes')).length;
            }
            document.querySelector('[onclick^="shellCloseModal"]')?.click();
            await attendre(1500);
            document.querySelector('[onclick^="execCloseChecklistEditor"]')?.click();
            await attendre(2000);
            r.editeur.ferme = !document.getElementById('execCliEditorWrap');
          }
          // Et la checklist retirée : ses items partent avec elle.
          const b = [...document.querySelectorAll('[onclick^="execDeleteChecklist"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(chkNouvelle.id));
          r.chk.boutonRetrait = !!b;
          if (b) { b.click(); r.chk.confirme = await confirmer(); }
          r.chk.fin = (await lire('exec-checklists')).length;
          r.chk.itemsFin = (await lire('exec-checklist-items'))
            .filter((i) => i.checklist_id === chkNouvelle.id).length;
        }

        // ── Famille 6 : le statut de checklist, dans la fenêtre du socle ──
        document.querySelector('[onclick^="execOpenStatutsManager"]')?.click();
        await attendre(2600);
        r.statut = { manager: shell(), avant: (await lire('exec-checklist-statuts')).length };
        document.querySelector('#shellModal [onclick^="execOpenStatutModal"]')?.click();
        await attendre(2400);
        poser('stLib', 'SURV 0.c — statut de la ronde');
        poser('stAlias', 'RND');
        poser('stCol', '#123456');
        poser('stOrd', '9');
        await attendre(800);
        document.querySelector('[onclick^="execSaveStatut"]')?.click();
        await attendre(3500);
        const statuts = await lire('exec-checklist-statuts');
        r.statut.apres = statuts.length;
        const statutNouveau = statuts.find((x) => /statut de la ronde/.test(x.libelle || ''));
        r.statut.enBase = !!statutNouveau;
        if (statutNouveau) {
          const b = [...document.querySelectorAll('[onclick^="execDeleteStatut"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(statutNouveau.id));
          r.statut.boutonRetrait = !!b;
          if (b) { b.click(); r.statut.confirme = await confirmer(); }
          r.statut.fin = (await lire('exec-checklist-statuts')).length;
        }
        document.querySelector('[onclick^="shellCloseModal"]')?.click();
        await attendre(1500);

        // ── Famille 7 : les délais du processus, et leur propre réversibilité ──
        //
        // `execEtatsDelaisDefaut` rétablit les valeurs d'origine : le geste de
        // retour en arrière **est** un geste de l'écran, et c'est le seul
        // référentiel de cette ronde qui n'a pas besoin qu'on le lui invente.
        sousMenu('delais')?.click();
        await attendre(2600);
        // ── La route nomme ses valeurs « valeurs », et non « delais » ──
        //
        // Premier jet : `(corps || {}).delais`, qui rendait un objet vide. La
        // route répond `{ valeurs, defauts, modifiable }` — et c'est le message
        // d'échec, instrumenté pour nommer la **forme** de la réponse, qui l'a
        // dit : « forme: valeurs,defauts,modifiable ».
        //
        // *Un message d'échec qui ne dit que « 0 » fait deviner ; celui qui dit
        // la forme de ce qu'il a lu fait trouver.*
        const delais = async () => {
          const rep = await fetch(`${api}/parametres/delais`, { credentials: 'same-origin' });
          r.delaisStatut = rep.status;
          const corps = await rep.json().catch(() => null);
          r.delaisForme = corps ? Object.keys(corps).join(',') : 'illisible';
          return (corps || {}).valeurs || {};
        };
        const avantDelais = await delais();
        const cle = Object.keys(avantDelais)[0];
        r.delais = { cle, avant: avantDelais[cle], cles: Object.keys(avantDelais).length };
        poser(`delai_${cle}`, String((avantDelais[cle] || 0) + 11));
        await attendre(800);
        document.querySelector('[onclick^="execEtatsEnregistrerDelais"]')?.click();
        await attendre(3200);
        r.delais.apres = (await delais())[cle];
        // ── « Valeurs par défaut » remplit le formulaire, il n'enregistre pas ──
        //
        // Premier jet : on cliquait le geste et l'on attendait une confirmation,
        // puis le serveur rétabli. Ni l'une ni l'autre : `execEtatsDelaisDefaut`
        // **pose les valeurs d'origine dans les champs**, et rien de plus — il
        // n'y a pas de confirmation parce qu'il n'y a pas d'écriture.
        //
        // Le rétablissement demande donc **deux** gestes, et le contrôle y gagne :
        // il distingue ce que porte le **formulaire** de ce que porte
        // l'**enregistrement**. *Un geste qui prépare n'est pas un geste qui
        // écrit, et un contrôle qui les confond passe à côté des deux.*
        document.querySelector('[onclick^="execEtatsDelaisDefaut"]')?.click();
        await attendre(1200);
        r.delais.champRendu = Number((document.getElementById(`delai_${cle}`) || {}).value);
        r.delais.avantSecondEnregistrement = (await delais())[cle];
        document.querySelector('[onclick^="execEtatsEnregistrerDelais"]')?.click();
        await attendre(3200);
        r.delais.rendu = (await delais())[cle];
        return r;
      }, M);

      verifier('une checklist créée paraît dans la table, est portée par le serveur, et se retire avec ses items',
        suite2.chk.apres === suite2.chk.avant + 1 && suite2.chk.enBase === true
        && suite2.chk.boutonRetrait === true && suite2.chk.confirme === true
        && suite2.chk.fin === suite2.chk.avant && suite2.chk.itemsFin === 0,
        JSON.stringify(suite2.chk));
      verifier('l’éditeur de checklist s’ouvre, une ligne d’item s’y ajoute, et il se referme',
        !!suite2.editeur && suite2.editeur.ouvert === true
        && suite2.editeur.itemsApres === suite2.editeur.itemsAvant + 1
        && suite2.editeur.ferme === true,
        JSON.stringify(suite2.editeur));
      verifier('un sous-thème créé depuis l’éditeur est porté par le serveur, et se retire',
        !!suite2.st && suite2.st.manager > 500
        && suite2.st.apres === suite2.st.avant + 1 && suite2.st.enBase === true
        && suite2.st.fin === suite2.st.avant,
        JSON.stringify(suite2.st));
      verifier('un statut de checklist créé est porté par le serveur, et se retire',
        !!suite2.statut && suite2.statut.manager > 500
        && suite2.statut.apres === suite2.statut.avant + 1 && suite2.statut.enBase === true
        && suite2.statut.boutonRetrait === true && suite2.statut.confirme === true
        && suite2.statut.fin === suite2.statut.avant,
        JSON.stringify(suite2.statut));
      verifier('un délai du processus s’enregistre, et les valeurs par défaut le rétablissent en deux gestes',
        !!suite2.delais && !!suite2.delais.cle
        && suite2.delais.apres === suite2.delais.avant + 11
        // Le geste des défauts n'a touché que le champ : le serveur porte encore
        // la valeur modifiée à cet instant.
        && suite2.delais.champRendu === suite2.delais.avant
        && suite2.delais.avantSecondEnregistrement === suite2.delais.apres
        && suite2.delais.rendu === suite2.delais.avant,
        JSON.stringify({ ...suite2.delais, statut: suite2.delaisStatut,
          forme: suite2.delaisForme }));

      verifier('un rôle d’équipe créé est porté par le serveur, et se retire',
        referentiels.role.apres === referentiels.role.avant + 1
        && referentiels.role.enBase === true
        && referentiels.role.fin === referentiels.role.avant,
        JSON.stringify(referentiels.role));

      // ══════════════════════════════════════════════════════════════════
      //  La constatation directe : créée hors dossier, et son circuit
      // ══════════════════════════════════════════════════════════════════
      //
      // Une constatation n'est pas toujours la suite d'une inspection : l'écran
      // permet d'en ouvrir une **directement**, avec son propre circuit —
      // saisie, commentaires, validation, transmission à l'organisme.
      //
      // ── Où elle se crée, et ce que cela coûte de le savoir ──
      //
      // Les trois sous-onglets de la page offrent les mêmes exports, mais
      // **seul « En Préparation » porte le bouton « Nouvelle Constatation »** —
      // relevé en parcourant les trois avant d'écrire. Un contrôle qui l'aurait
      // cherché sur « Suivi » aurait rendu « bouton introuvable » sur un geste
      // qui marche.
      //
      // ── Son ménage est à elle ──
      //
      // Elle n'a **pas de dossier**, et la suppression du dossier de la ronde ne
      // l'emportera donc pas. Elle part par son propre geste, et le contrôle le
      // vérifie — sans quoi la campagne suivante hériterait d'une constatation
      // que personne n'a créée.
      etape = 'constatation directe';
      const directe = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const toutes = async () => {
          try { return await (await fetch(`${api}/constatations`,
            { credentials: 'same-origin' })).json(); } catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e || e.options.length < 2) return '';
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui');
          if (!oui) return false;
          oui.click();
          await attendre(3500);
          return true;
        };
        const volet = () => (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;

        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await attendre(3200);

        // Les trois sous-onglets, et leurs exports capturés par relais.
        const recu = { fenetres: [], blobs: 0 };
        const vraiOpen = window.open;
        const vraiURL = URL.createObjectURL;
        window.open = () => {
          const f = { html: '' };
          recu.fenetres.push(f);
          return {
            document: { write: (h) => { f.html += String(h || ''); }, close: () => {} },
            focus: () => {}, print: () => {}, close: () => {},
          };
        };
        URL.createObjectURL = (b) => { recu.blobs += 1; return vraiURL.call(URL, b); };
        const onglets = [...document.querySelectorAll('.exec-tab')].map((b) => b.getAttribute('onclick'));
        r.onglets = onglets.length;
        const empreintes = [];
        for (const h of onglets) {
          [...document.querySelectorAll('.exec-tab')]
            .find((x) => x.getAttribute('onclick') === h)?.click();
          /* eslint-disable no-await-in-loop */
          await attendre(2200);
          const z = document.getElementById('exec-content');
          empreintes.push(`${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`);
        }
        r.ongletsDistincts = new Set(empreintes).size;

        // ── Les exports viennent **après** la création ──
        //
        // Premier jet : ils étaient cliqués ici, et ne produisaient **rien** —
        // les trois tables étaient vides à cet instant, et un export sans
        // donnée dit « aucune donnée » par un message, non par un document.
        // Ils sont donc déplacés après la constatation créée, où il y a quelque
        // chose à exporter. *L'ordre fait partie de la mesure*, pour la
        // cinquième fois de cette suite.

        // ── « En Préparation » : le seul sous-onglet qui crée ──
        const prep = [...document.querySelectorAll('.exec-tab')]
          .find((b) => /'list'/.test(b.getAttribute('onclick') || ''));
        if (prep) { prep.click(); await attendre(2600); }
        const avantIds = new Set((await toutes()).map((c) => c.id));
        r.avant = avantIds.size;
        const nouvelle = document.querySelector('[onclick^="execOpenConstatationDirecteForm"]');
        r.boutonNouvelle = !!nouvelle;
        if (!nouvelle) return r;
        nouvelle.click();
        await attendre(3200);
        r.formulaire = volet();

        // Les listes en cascade : l'organisme puis le secteur, dont les
        // gestionnaires recalculent ce qui suit.
        const prest = document.querySelector('#execSlider [onchange*="execCdOnPrestataireChange"]');
        if (prest && prest.options.length > 1) {
          prest.selectedIndex = 1;
          prest.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(1600);
        }
        r.choix = {
          domaine: choisir('cd_domaine'),
          secteur: choisir('cd_secteur'),
        };
        await attendre(1400);
        poser('cd_titre', 'SURV 0.c — constatation directe de la ronde');
        poser('cd_description', 'Ouverte par la ronde, retirée par elle.');
        // La criticité commande le délai, qui commande la date due : trois
        // gestes qui s'enchaînent, et c'est leur enchaînement qu'on éprouve.
        r.choix.criticite = choisir('cd_criticite');
        await attendre(1600);
        r.delaiCalcule = (document.getElementById('cd_delai') || {}).value || '';
        r.dateCalculee = (document.getElementById('cd_date_due') || {}).value || '';
        r.choix.cas = choisir('cd_cas');
        poser('cd_reco', 'Recommandation de la ronde.');
        await attendre(1200);

        document.querySelector('[onclick^="execSaveConstatationDirecte"]')?.click();
        await attendre(4000);
        const apres = await toutes();
        r.apres = apres.length;
        // ── On reconnaît sa création par **différence**, non par un champ ──
        //
        // Premier jet : `c.titre || c.description` comparé au texte saisi. Le
        // champ porté par l'enregistrement n'est ni l'un ni l'autre, et le
        // relevé rendait `null` sur une création qui avait porté — 2 avant, 3
        // après, et introuvable. *Ce qu'une ronde vient de créer se reconnaît à
        // ce qui n'était pas là, et non à un champ qu'on suppose.*
        const mienne = apres.find((c) => !avantIds.has(c.id));
        r.creee = mienne ? {
          id: mienne.id, statut: mienne.statut, dossier: mienne.dossier_id || null,
          // Les champs sont relevés pour mémoire, non pour identifier.
          champs: Object.keys(mienne).filter((k) => /titre|descr|reference/.test(k)).join(','),
        } : null;
        if (!mienne) return r;

        // ── L'export PDF se clique ; celui en classeur **ne peut pas** ──
        //
        // `execExporterConstatationsXlsx` pose `window.location.href` sur la
        // route d'export : le navigateur **quitte la page**, et l'évaluation en
        // cours meurt avec elle — « Execution context was destroyed », mesuré au
        // premier passage. Le relais de `window.open` n'y change rien : ce n'est
        // pas une fenêtre qui s'ouvre, c'est la page qui part.
        //
        // C'est la famille de 5.f.11, et la réponse est la même : la route
        // `/constatations/export-xlsx` se prouve **en HTTP** — code, type,
        // pièce jointe, taille —, et huit contrôles l'y attendent dans
        // `execution.smoke.js`. *Un geste qui emporte la page ne se clique pas
        // dans une suite qui tient la page.*
        document.querySelector('[onclick^="execExporterConstatationsPdf"]')?.click();
        await attendre(2400);
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;
        r.exports = { documents: recu.fenetres.map((f) => f.html.length), blobs: recu.blobs };

        // ── Son circuit : consulter, commenter, valider, transmettre ──
        const ouvrir = async () => {
          const b = [...document.querySelectorAll('[onclick^="execOpenConstatationDirecteSlider"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(mienne.id));
          if (!b) return false;
          b.click();
          await attendre(3500);
          return true;
        };
        r.ouverte = await ouvrir();
        r.gestesCircuit = [...new Set([...document.querySelectorAll('#execSlider [onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))];

        // Les commentaires de validation : dépliés, un ajouté, enregistré.
        document.querySelector('#execSlider [onclick^="execCdBasculerCommentaires"]')?.click();
        await attendre(1500);
        document.querySelector('#execSlider [onclick^="execCdAjouterCommentaire"]')?.click();
        await attendre(1600);
        const zone = [...document.querySelectorAll('#execSlider textarea')].pop();
        if (zone) {
          zone.value = 'Observation de la ronde sur la constatation directe.';
          zone.dispatchEvent(new Event('input', { bubbles: true }));
          await attendre(900);
        }
        document.querySelector('#execSlider [onclick^="execCdEnregistrerCommentaires"]')?.click();
        await attendre(3200);

        // La validation, puis la transmission à l'organisme.
        // ── Cette validation ne demande **pas** confirmation ──
        //
        // Mon assertion l'exigeait, par analogie avec les autres gestes décisifs
        // de cet écran — soumettre, clôturer, effacer : tous passent par
        // `oasisConfirmer`. Celui-ci non : le statut est passé de
        // `direct_soumis` à `direct_valide` **sans qu'aucune fenêtre
        // n'apparaisse**, et le relevé disait « validationConfirmee: false » sur
        // une validation qui avait porté.
        //
        // L'assertion était donc fausse, non l'écran. Ce qui compte est le
        // **changement d'état**, et c'est lui qu'on éprouve. Que ce geste seul
        // ne demande rien est une inconstance de l'écran, relevée et non
        // tranchée : c'est à la maîtrise d'ouvrage de dire si valider une
        // constatation doit se confirmer comme le reste.
        //
        // *Un contrôle écrit par analogie éprouve l'analogie, non le geste.*
        const valider = document.querySelector('#execSlider [onclick^="execValidateConstatationDirecte"]');
        r.boutonValider = !!valider;
        if (valider) {
          valider.click();
          await attendre(1000);
          r.validationDemandeConfirmation = !!document.querySelector('.oasis-confirm-oui');
          if (r.validationDemandeConfirmation) await confirmer();
          await attendre(3200);
        }
        r.statutApresValidation = ((await toutes()).find((c) => c.id === mienne.id) || {}).statut;

        // ── La transmission n'est **pas** cliquée, et la raison est nommée ──
        //
        // Transmettre une constatation **envoie un courriel**. Sans serveur de
        // messagerie, la route refuse — proprement : **502**, « le serveur de
        // messagerie (localhost:1025) ne répond pas : rien n'a été transmis ».
        // C'est le bon comportement, et c'est une limite de l'environnement
        // d'essai, non un défaut de l'écran.
        //
        // Le geste a donc été cliqué une fois, pour mesurer ; il ne l'est plus,
        // parce qu'un 502 attendu salirait le relevé des incidents de console et
        // ferait passer une limite connue pour une anomalie. Le **refus**, lui,
        // est éprouvé pour lui-même dans la suite HTTP — comme l'a été le 400 de
        // la transmission signée en 5.f.8.
        r.boutonTransmettre = !!document.querySelector('#execSlider [onclick^="execTransmettreConstatation"]');

        // ── Le ménage : elle n'a pas de dossier, elle part par son geste ──
        document.querySelector('[onclick^="execCloseSlider"], [onclick^="execRetourVolet"]')?.click();
        await attendre(2000);
        const suppr = await fetch(`${api}/constatations/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppression = suppr.status;
        r.fin = (await toutes()).filter((c) => c.id === mienne.id).length;
        return r;
      }, M);

      verifier('les trois sous-onglets des constatations rendent chacun leur contenu',
        directe.onglets >= 3 && directe.ongletsDistincts === directe.onglets,
        JSON.stringify({ onglets: directe.onglets, distincts: directe.ongletsDistincts }));
      verifier('l’export PDF des constatations remet un document, une fois qu’il y a matière',
        !!directe.exports
        && ((directe.exports.documents || []).some((n) => n > 500) || directe.exports.blobs > 0),
        JSON.stringify(directe.exports));
      verifier('le formulaire d’une constatation directe s’ouvre, et la criticité choisie calcule son délai et sa date',
        directe.boutonNouvelle === true && directe.formulaire > 2000
        && !!directe.choix && !!directe.choix.criticite
        && Number(directe.delaiCalcule) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(directe.dateCalculee),
        JSON.stringify({ formulaire: directe.formulaire, choix: directe.choix,
          delai: directe.delaiCalcule, date: directe.dateCalculee }));
      verifier('la constatation directe s’enregistre sans dossier, et le serveur la porte',
        directe.apres === directe.avant + 1 && !!directe.creee
        && !directe.creee.dossier,
        JSON.stringify({ avant: directe.avant, apres: directe.apres, creee: directe.creee }));
      verifier('son circuit se parcourt : validée, et le geste de transmission lui est offert',
        directe.ouverte === true
        && (directe.gestesCircuit || []).includes('execValidateConstatationDirecte')
        && directe.boutonValider === true
        && !!directe.creee && directe.statutApresValidation !== directe.creee.statut
        && directe.boutonTransmettre === true,
        JSON.stringify({ ouverte: directe.ouverte, boutonValider: directe.boutonValider,
          // Relevé pour mémoire : ce geste ne demande pas confirmation, quand
          // tous les autres gestes décisifs de l'écran la demandent.
          demandeConfirmation: directe.validationDemandeConfirmation,
          creee: (directe.creee || {}).statut, valide: directe.statutApresValidation,
          transmission: directe.boutonTransmettre,
          gestes: (directe.gestesCircuit || []).length }));
      verifier('la constatation directe ne survit pas à la ronde, qui l’efface elle-même',
        directe.suppression === 200 && directe.fin === 0,
        JSON.stringify({ suppression: directe.suppression, reste: directe.fin }));

      // ══════════════════════════════════════════════════════════════════
      //  Le processus : sa configuration, qui commande tout le reste
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Ce que la mesure a appris avant qu'une ligne soit écrite ──
      //
      // Le relevé disait `exec-notifications.js` : **1 geste exercé sur 25**. Le
      // circuit d'une notification — soumettre, valider, envoyer, accorder —
      // était donc presque entièrement non couvert, et la ronde du dossier le
      // parcourt par l'API faute de mieux.
      //
      // J'ai cru d'abord que ces gestes étaient échoués sur la page
      // `declenchement`, l'une des quatre qu'aucun chemin n'ouvre (n° 5.f.2).
      // **Mesuré, c'est faux** : forcée dans le navigateur, cette page ne rend
      // que deux gestes, et `execStartNotification` est aussi appelé depuis la
      // page **`processus`**, qui est au menu. Le circuit est donc atteignable.
      //
      // Mais il est atteignable **derrière une porte** : la page `processus` ne
      // liste pas des activités, elle liste des **processus configurés**, et le
      // jeu d'essai n'en porte aucun — « Aucune donnée », quel que soit le
      // filtre. Pour déclencher une activité, il faut d'abord qu'un processus
      // existe.
      //
      // Cette ronde ouvre donc cette porte. Le circuit de la notification la
      // suivra, et il sait maintenant par où passer.
      //
      // *Un gisement qu'on croit inaccessible l'est parfois seulement derrière
      // une étape qu'on n'avait pas cherchée.*
      etape = 'configuration du processus';
      const processus = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const lire = async () => {
          try { return await (await fetch(`${api}/processus`, { credentials: 'same-origin' })).json(); }
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
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e || e.options.length < 2) return '';
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        // ── SURV a **deux** fenêtres de confirmation, et une ronde doit les
        //    connaître toutes deux ──
        //
        // Celle du socle (`oasisConfirmer`) pose un bouton `.oasis-confirm-oui` ;
        // celle du module (`execProcConfirmer`) pose un
        // `[data-rep="oui"]` dans un `.exec-proc-dialogue`. Les suppressions de
        // processus passent par la seconde, et le premier jet de cette ronde ne
        // cherchait que la première : les deux processus posés **restaient**,
        // « fin: 2 » au lieu de 0.
        //
        // *Un geste qui demande confirmation ne dit pas laquelle : il faut
        // l'avoir lu, ou les essayer toutes.*
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui')
            || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
            || document.querySelector('[data-rep="oui"]');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };

        document.querySelector('.nav-btn[data-page="processus"]')?.click();
        await attendre(3200);
        const z = () => document.getElementById('exec-content');
        r.listeVide = z().textContent.includes('Aucune donnée');
        const avant = await lire();
        r.avant = (avant || []).length;
        const avantIds = new Set((avant || []).map((x) => x.id));

        // Le formulaire de configuration.
        document.querySelector('[onclick^="execProcCfgEditer"]')?.click();
        await attendre(3500);
        r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        poser('pcfg_libelle', 'SURV 0.c — processus de la ronde');
        r.choix = { type: choisir('pcfg_type'), domaine: choisir('pcfg_domaine'), secteur: choisir('pcfg_secteur') };
        poser('pcfg_description', 'Posé par la ronde, retiré par elle.');
        await attendre(1200);

        // ── Un acteur ajouté, et les acteurs ne sont pas dans un tableau ──
        //
        // Premier jet : les lignes d'un `tbody` — **0 avant, 0 après**. Second
        // jet : les enfants de `.pcfg-acteurs` — **9 avant, 9 après**, car il y
        // a un bloc par étape du circuit et chacun porte soit ses acteurs, soit
        // un « aucun acteur » qu'une ligne ajoutée **remplace**.
        //
        // Ce qui change, ce sont les **lignes d'acteur**, et elles se
        // reconnaissent à leurs listes de choix. Troisième lecture du même
        // geste, et la troisième est celle que le code décrit : un bloc par
        // étape, dont le contenu bascule entre le vide et les lignes.
        const acteurs = () => document.querySelectorAll('#execSlider .pcfg-acteurs select').length;
        const blocsVides = () => document.querySelectorAll('#execSlider .pcfg-vide').length;
        const acteursAvant = acteurs();
        const videsAvant = blocsVides();
        document.querySelector('[onclick^="execProcCfgAjouterActeur"]')?.click();
        await attendre(1800);
        r.acteurs = [acteursAvant, acteurs()];
        r.blocsVides = videsAvant > blocsVides();
        // Les listes de la ligne d'acteur sont renseignées, sinon l'enregistrement
        // peut refuser une ligne vide.
        [...document.querySelectorAll('#execSlider .pcfg-acteurs select')].forEach((sel) => {
          if (sel.options.length > 1) {
            sel.selectedIndex = 1;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await attendre(1200);

        document.querySelector('[onclick^="execProcCfgEnregistrer"]')?.click();
        await attendre(4000);
        const apres = await lire();
        r.apres = (apres || []).length;
        const mien = (apres || []).find((x) => !avantIds.has(x.id));
        r.cree = mien ? { id: mien.id, libelle: mien.libelle || '', type: mien.type || '' } : null;
        r.listeApres = !z().textContent.includes('Aucune donnée');
        if (!mien) return r;

        // Dupliqué, puis les deux retirés : la ronde ne laisse rien.
        const dupliquer = [...document.querySelectorAll('[onclick^="execProcCfgDupliquer"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(mien.id));
        r.boutonDupliquer = !!dupliquer;
        if (dupliquer) {
          dupliquer.click();
          await attendre(2400);
          const valider = document.querySelector('[onclick^="execProcCfgDupliquerValider"]');
          r.boutonDupliquerValider = !!valider;
          if (valider) { valider.click(); await attendre(3500); }
          r.apresDuplication = ((await lire()) || []).length;
        }
        // Tous ceux que la ronde a créés partent, le copié comme l'original.
        const aEffacer = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).map((x) => x.id);
        r.aEffacer = aEffacer.length;
        for (const id of aEffacer) {
          const b = [...document.querySelectorAll('[onclick^="execProcCfgSupprimer"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(id));
          if (b) { b.click(); /* eslint-disable no-await-in-loop */ await confirmer(); }
        }
        r.fin = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).length;
        return r;
      }, M);

      verifier('la page du processus part d’une liste vide, et sa configuration s’ouvre garnie',
        processus.listeVide === true && processus.formulaire > 3000
        && !!processus.choix && !!processus.choix.domaine,
        JSON.stringify({ vide: processus.listeVide, formulaire: processus.formulaire,
          choix: processus.choix }));
      verifier('un acteur s’ajoute à l’étape du circuit, dont le bloc cesse d’être vide',
        !!processus.acteurs && processus.acteurs[1] > processus.acteurs[0]
        && processus.blocsVides === true,
        JSON.stringify({ acteurs: processus.acteurs, unBlocDeMoinsVide: processus.blocsVides }));
      verifier('le processus configuré est porté par le serveur, et la liste cesse d’être vide',
        processus.apres === processus.avant + 1 && !!processus.cree
        && /processus de la ronde/.test(processus.cree.libelle)
        && processus.listeApres === true,
        JSON.stringify({ avant: processus.avant, apres: processus.apres,
          cree: processus.cree, listeApres: processus.listeApres }));
      verifier('il se duplique, et la ronde retire tout ce qu’elle a posé',
        processus.boutonDupliquer === true && processus.apresDuplication > processus.apres
        && processus.aEffacer >= 2 && processus.fin === 0,
        JSON.stringify({ duplique: processus.apresDuplication, aEffacer: processus.aEffacer,
          fin: processus.fin }));

      // ══════════════════════════════════════════════════════════════════
      //  Le circuit guidé d'une activité, et la notification par ses gestes
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Comment on y entre, après trois fausses pistes ──
      //
      // Le circuit guidé (`EXEC_PROC`) porte les gestes de la notification —
      // déclencher, soumettre, valider, transmettre. Trois lectures ont été
      // nécessaires pour trouver sa porte :
      //
      //   · la page `declenchement` les rend, mais **aucun chemin ne l'ouvre** ;
      //   · la page `processus` ne liste que les **processus configurés**, avec
      //     leurs gestes d'édition — pas de déclenchement ;
      //   · la porte est sur la page des **plans** : « Déclencher hors plan »,
      //     `execProcNouvelleActivite()`, qui ouvre un formulaire d'activité.
      //
      // *Un circuit ne se trouve pas là où il s'affiche, mais là où il
      // commence.*
      //
      // La ronde crée donc une activité hors plan, et parcourt le circuit par
      // ses gestes — là où la ronde du dossier, plus haut, le fait par l'API
      // faute d'avoir su par où passer.

      // ══════════════════════════════════════════════════════════════════
      //  Les états des activités : arrêter, reprendre, archiver, supprimer
      // ══════════════════════════════════════════════════════════════════
      //
      // Le dernier gros gisement de SURV, et le seul qui **écrit sur l'état du
      // circuit** plutôt que sur son contenu. Dix gestes d'action, et chacun
      // exige une activité dans un état que la ronde ne construisait pas.
      //
      // La ronde s'en construit donc un : le plan porte **deux** activités, la
      // chaîne n'en déclenche qu'une. La seconde sert ici — déclenchée par
      // l'API jusqu'à « envoyé », sans dossier, elle paraît dans « en cours »
      // et dans « en vie », là où vivent les boutons.
      //
      // Chaque geste est rendu à son état par son inverse, et le dernier —
      // la suppression définitive — emporte ce que ce bloc a créé. Rien ne
      // reste pour les blocs qui suivent.
      etape = 'états des activités';
      const etats = await page.evaluate(async (ctx) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const essai = async (nom, f) => {
          try { r[nom] = await f(); }
          catch (e) { r[nom] = { erreur: String((e && e.message) || e) }; }
        };
        const env = async (url, methode, corps) => {
          const rep = await fetch(url, {
            method: methode, credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(corps ? { body: JSON.stringify(corps) } : {}),
          });
          let b = null; try { b = await rep.json(); } catch { /* corps vide */ }
          return { statut: rep.status, corps: b };
        };
        // La boîte du module, avec ou sans saisie (n° 5.f.25).
        const repondre = async (valeur) => {
          await attendre(800);
          const boite = document.querySelector('.exec-proc-dialogue');
          if (!boite) return false;
          if (valeur !== undefined && valeur !== null) {
            const champ = boite.querySelector('.exec-proc-dialogue-saisie');
            if (champ) { champ.value = valeur; champ.dispatchEvent(new Event('input', { bubbles: true })); }
          }
          boite.querySelector('[data-rep="oui"]').click();
          await attendre(3200);
          return true;
        };
        const sousOnglet = (cle) => [...document.querySelectorAll('[onclick*="EXEC_ETATS.sub="]')]
          .find((b) => new RegExp(`sub='${cle}'`).test(b.getAttribute('onclick') || ''));
        const aller = async (cle) => { sousOnglet(cle)?.click(); await attendre(2200); };

        document.querySelector('.nav-btn[data-page="etats"]')?.click();
        await attendre(3200);

        // ── 1. Les cinq sous-onglets rendent chacun leur contenu ──
        await essai('onglets', async () => {
          const o = { cles: [], rendus: [] };
          for (const cle of ['a_declencher', 'en_vie', 'en_cours', 'cloturees', 'archivees']) {
            const b = sousOnglet(cle);
            o.cles.push(!!b);
            /* eslint-disable no-await-in-loop */
            await aller(cle);
            const page = document.querySelector('.page-content.exec-etats');
            o.rendus.push({
              cle,
              actif: !!(sousOnglet(cle) || {}).classList?.contains('active'),
              contenu: page ? page.innerHTML.length : 0,
            });
          }
          return o;
        });

        // ── 2. Une seconde activité déclenchée, et le rappel ──
        await essai('rappel', async () => {
          const d = {};
          const plans = await (await fetch(`${ctx.api}/plans-valides`,
            { credentials: 'same-origin' })).json();
          // ── Ce que la route exclut, et ma garde qui l'ignorait ──
          //
          // Premier jet : je cherchais un plan portant **deux** activités, parce
          // que le plan du bac en porte deux. Dix contrôles ont rougi sur
          // `planADeuxActivites: false`.
          //
          // `GET /plans-valides` **écarte les activités déjà déclenchées** : la
          // chaîne en a consommé une au montage, il n'en reste donc qu'une. La
          // « seconde activité » du plan est la **première** que cette route
          // rende encore. Le relevé des plans reste, il tranche en une ligne.
          d.plans = (plans || []).map((p) => `${(p.reference || p.titre || '?').slice(0, 24)}:${(p.activites || []).length}`);
          const plan = (plans || []).find((p) => (p.activites || []).length >= 1);
          d.planADeuxActivites = !!plan;
          if (!plan) return d;
          const a = plan.activites[0];
          d.planId = plan.id;
          const n = await env(`${ctx.api}/notifications`, 'POST', {
            activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
            objet: 'SURV 0.e — activité des états', type_supervision: 'Audit',
            date_debut_prevue: '2026-11-02', date_fin_prevue: '2026-11-04',
            lieu: 'Siège', perimetre: 'Ensemble des processus',
          });
          d.creee = n.statut;
          if (n.statut !== 201) return d;
          d.notifId = n.corps.id;
          d.reference = n.corps.reference || '';
          d.activiteId = a.id;
          for (const pas of ['submit', 'validate', 'send']) {
            /* eslint-disable no-await-in-loop */
            d[pas] = (await env(`${ctx.api}/notifications/${d.notifId}/${pas}`, 'PUT')).statut;
          }
          await window.execRefreshDynamic();
          await aller('en_cours');

          const bouton = [...document.querySelectorAll('[onclick^="execEtatsRappel"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(plan.id));
          d.boutonRappel = !!bouton;
          if (!bouton) return d;
          bouton.click();
          await attendre(3000);
          const dest = document.getElementById('rappel_dest');
          d.volet = !!dest;
          if (!dest) return d;
          d.destinataires = dest.options.length;
          d.note = (document.querySelector('.exec-proc-note') || {}).textContent?.trim().slice(0, 80) || '';
          // ── Le refus : sans destinataire, rien ne part ──
          const avant = ((await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || []).length;
          const choisi = dest.value;
          dest.value = '';
          document.querySelector('[onclick^="execEtatsEnvoyerRappel"]').click();
          await attendre(1400);
          d.refus = (document.getElementById('rappel_erreur') || {}).textContent || '';
          d.rappelsApresRefus = ((await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || []).length;
          d.rienNEstParti = d.rappelsApresRefus === avant;
          // Puis le destinataire rendu, et l'envoi.
          dest.value = choisi;
          const msg = document.getElementById('rappel_msg');
          if (msg) msg.value = 'SURV 0.e — rappel de la ronde.';
          document.querySelector('[onclick^="execEtatsEnvoyerRappel"]').click();
          await attendre(3500);
          const apres = (await (await fetch(`${ctx.api}/rappels`,
            { credentials: 'same-origin' })).json()) || [];
          d.rappelsApres = apres.length;
          d.enBase = apres.some((x) => /rappel de la ronde/.test(x.message || ''));
          d.voletReferme = !document.getElementById('rappel_dest');
          return d;
        });

        const notifId = (r.rappel || {}).notifId;
        const reference = (r.rappel || {}).reference;
        const activiteId = (r.rappel || {}).activiteId;
        const planId = (r.rappel || {}).planId;

        // ── 3. Arrêter, reprendre, archiver, désarchiver l'activité ──
        await essai('circuit', async () => {
          const d = {};
          if (!notifId) return { erreur: 'pas de notification' };
          await aller('en_vie');
          const ligne = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(notifId));
          const geste = (prefixe) => {
            const l = ligne();
            return l ? l.querySelector(`[onclick^="${prefixe}"]`) : null;
          };
          d.ligneTrouvee = !!ligne();
          if (!ligne()) return d;
          // Les boutons s'excluent : tant que le circuit court, il n'y a que
          // « Arrêter » ; arrêté, « Reprendre » et « Archiver » paraissent.
          d.avant = {
            arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre'),
            archiver: !!geste('execEtatsArchiverActivite'),
            supprimer: !!geste('execEtatsSupprimer'),
            historique: !!geste('execProcHistorique'),
          };
          // ── L'historique : il ne raconte que ce que la ronde a posé ──
          //
          // Trois jalons au moins — créée, soumise, validée — puisque la ronde
          // a franchi ces trois pas par l'API. Un historique qui en rendrait
          // moins ne lirait pas la notification qu'on lui désigne.
          geste('execProcHistorique').click();
          await attendre(3000);
          d.histoEtapes = document.querySelectorAll('.exec-histo-etape').length;
          d.histoJalons = document.querySelectorAll('.exec-histo-jalon').length;
          d.histoCourante = document.querySelectorAll('.exec-histo-etape.courante').length;
          d.histoFaites = document.querySelectorAll('.exec-histo-etape.faite').length;
          document.querySelector('#execSlider [onclick^="execCloseSlider"]')?.click();
          await attendre(1600);
          await aller('en_vie');

          geste('execEtatsArreter').click();
          d.boiteMotif = await repondre('SURV 0.e — arrêt par la ronde.');
          const apresArret = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          // Le serveur écrit **`arret`** (routes-etats.js), non `arretee`. Mon
          // premier jet acceptait l'un **ou** le motif, et passait par le second
          // terme : une assertion à deux branches dont une suffit ne mesure que
          // la plus facile. Les deux sont exigées, et nommées juste.
          d.arreteEnBase = Number(apresArret.arret) === 1;
          d.motifEnBase = apresArret.motif_arret || '';
          await aller('en_vie');
          d.apresArret = {
            arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre'),
            archiver: !!geste('execEtatsArchiverActivite'),
            marquee: !!(ligne() || {}).classList?.contains('exec-etats-arretee'),
          };
          // Reprendre, et le circuit repart.
          geste('execEtatsReprendre').click();
          await repondre();
          const apresReprise = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.repriseEnBase = Number(apresReprise.arret) === 0;
          await aller('en_vie');
          d.apresReprise = { arreter: !!geste('execEtatsArreter'),
            reprendre: !!geste('execEtatsReprendre') };

          // Arrêtée de nouveau, puis archivée.
          geste('execEtatsArreter').click();
          await repondre('SURV 0.e — arrêt avant archivage.');
          await aller('en_vie');
          geste('execEtatsArchiverActivite').click();
          await repondre();
          const apresArchive = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.archiveeEnBase = Number(apresArchive.archive) === 1;
          await aller('en_vie');
          d.partieDesEnVie = !ligne();
          await aller('archivees');
          // ── Deux repères, parce que les deux tables ne nomment pas la même chose ──
          //
          // Premier jet : le même repère partout — une ligne qui contient
          // l'identifiant de la notification. Il tient dans « en vie », dont les
          // boutons portent `execEtatsArreter('<notifId>')`. Dans les archives,
          // **aucun bouton ne porte la notification** : l'historique et le
          // désarchivage portent l'identifiant de l'**activité**. Trois contrôles
          // ont rougi en cascade sur ce seul écart.
          const ligneArchivee = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(activiteId));
          d.dansLesArchives = !!ligneArchivee();
          // Le lot d'archives se replie d'un clic sur son titre.
          const titre = document.querySelector('.exec-etats-groupe-titre');
          d.groupeTrouve = !!titre;
          if (titre) {
            const groupe = titre.closest('.exec-etats-groupe');
            d.groupeOuvertAvant = groupe.classList.contains('ouvert');
            titre.click();
            await attendre(700);
            d.groupeApresClic = groupe.classList.contains('ouvert');
            titre.click();
            await attendre(700);
            d.groupeRendu = groupe.classList.contains('ouvert') === d.groupeOuvertAvant;
          }
          // Et elle sort des archives par son geste.
          const sortir = (ligneArchivee() || {}).querySelector?.('[onclick^="execEtatsDesarchiverActivite"]');
          d.boutonSortir = !!sortir;
          if (sortir) { sortir.click(); await repondre(); }
          const apresSortie = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.sortieEnBase = !Number(apresSortie.archive);
          return d;
        });

        // ── 4. Le dossier clôturé s'archive, et revient ──
        await essai('dossier', async () => {
          const d = {};
          await aller('cloturees');
          const bouton = [...document.querySelectorAll('[onclick^="execEtatsArchiver("]')][0];
          d.bouton = !!bouton;
          if (!bouton) return d;
          const idDossier = (/execEtatsArchiver\('([^']+)'/.exec(bouton.getAttribute('onclick')) || [])[1];
          d.dossierId = idDossier;
          bouton.click();
          await repondre();
          const apres = await (await fetch(`${ctx.api}/dossiers/${idDossier}`,
            { credentials: 'same-origin' })).json();
          d.archiveEnBase = Number(apres.archive) === 1 || apres.statut === 'archive';
          await aller('archivees');
          const retour = [...document.querySelectorAll('[onclick^="execEtatsArchiver("]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(idDossier));
          d.boutonRetour = !!retour;
          if (retour) { retour.click(); await repondre(); }
          const rendu = await (await fetch(`${ctx.api}/dossiers/${idDossier}`,
            { credentials: 'same-origin' })).json();
          d.renduEnBase = !Number(rendu.archive) && rendu.statut !== 'archive';
          return d;
        });

        // ── 5. Le plan archivé, et sa sortie par le geste de l'écran ──
        //
        // `plansArchivesPlanif` est vide dans le bac, et c'est **par
        // construction** : les quatre plans archivés du jeu sont des versions
        // remplacées, que la règle écarte — « on range aux archives un plan
        // arrivé à son terme, et confondre les deux sorts faisait passer chaque
        // amendement pour une fin de plan ». La ronde archive donc le plan
        // elle-même, par la route de la Planification, et le geste de l'écran
        // le lui rend.
        await essai('plan', async () => {
          const d = {};
          if (!planId) return { erreur: 'pas de plan' };
          d.archive = (await env(`/api/m/planification/plans/${planId}/archiver`, 'POST', {})).statut;
          await window.execLoadData();
          await aller('archivees');
          const bouton = [...document.querySelectorAll('[onclick*="execEtatsDesarchiverPlan"]')]
            .find((b) => (b.getAttribute('onclick') || '').includes(planId));
          d.boutonDesarchiver = !!bouton;
          d.groupes = document.querySelectorAll('.exec-etats-groupe').length;
          if (!bouton) return d;
          bouton.click();
          await repondre();
          const plan = await (await fetch(`/api/m/planification/plans/${planId}`,
            { credentials: 'same-origin' })).json();
          d.statutRendu = plan.statut;
          return d;
        });

        // ── 6. La suppression définitive, et sa double garde ──
        await essai('suppression', async () => {
          const d = {};
          if (!notifId) return { erreur: 'pas de notification' };
          await aller('en_vie');
          const ligne = () => [...document.querySelectorAll('.exec-act-row')]
            .find((tr) => (tr.innerHTML || '').includes(notifId));
          const bouton = () => (ligne() || {}).querySelector?.('[onclick^="execEtatsSupprimer"]');
          d.ligne = !!ligne();
          d.bouton = !!bouton();
          if (!bouton()) return d;
          d.reference = reference;
          // Première garde : une référence qui ne correspond pas refuse.
          bouton().click();
          await repondre('référence inventée');
          const encore = await (await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' })).json();
          d.surviteAuMauvaisCode = !!encore && encore.id === notifId;
          // Seconde : la bonne référence emporte tout.
          await aller('en_vie');
          bouton().click();
          await repondre(reference);
          const rep = await fetch(`${ctx.api}/notifications/${notifId}`,
            { credentials: 'same-origin' });
          d.statutApres = rep.status;
          const notifs = await (await fetch(`${ctx.api}/notifications`,
            { credentials: 'same-origin' })).json();
          d.encoreListee = (notifs || []).some((x) => x.id === notifId);
          return d;
        });
        return r;
      }, { api: M });

      {
        const O = etats.onglets || {};
        const R2 = etats.rappel || {};
        const C = etats.circuit || {};
        const D2 = etats.dossier || {};
        const P2 = etats.plan || {};
        const S2 = etats.suppression || {};
        verifier('les cinq sous-onglets des états existent, s’activent, et rendent chacun leur contenu',
          Array.isArray(O.cles) && O.cles.length === 5 && O.cles.every(Boolean)
          && (O.rendus || []).length === 5
          && (O.rendus || []).every((x) => x.actif === true && x.contenu > 400),
          JSON.stringify(O).slice(0, 320));
        verifier('l’activité que le plan n’a pas encore déclenchée se déclenche, et son rappel s’ouvre sur un destinataire désigné',
          R2.planADeuxActivites === true && R2.creee === 201
          && R2.submit === 200 && R2.validate === 200 && R2.send === 200
          && R2.boutonRappel === true && R2.volet === true && R2.destinataires >= 1
          && (R2.note || '').length > 0,
          JSON.stringify(R2).slice(0, 420));
        verifier('sans destinataire le rappel refuse et rien ne part ; le destinataire rendu, le serveur le porte',
          (R2.refus || '').length > 0 && R2.rienNEstParti === true
          && R2.enBase === true && R2.voletReferme === true,
          JSON.stringify({ refus: R2.refus, rien: R2.rienNEstParti,
            avant: R2.rappelsApresRefus, apres: R2.rappelsApres, enBase: R2.enBase }));
        verifier('les boutons de la ligne s’excluent : le circuit qui court n’offre qu’« Arrêter »',
          !!C.avant && C.avant.arreter === true && C.avant.reprendre === false
          && C.avant.archiver === false && C.avant.supprimer === true
          && C.avant.historique === true,
          JSON.stringify({ avant: C.avant, erreur: C.erreur }));
        verifier('l’historique de l’activité rend ses étapes, et ses jalons sont ceux que la ronde a posés',
          C.histoEtapes >= 4 && C.histoJalons >= 3 && C.histoCourante === 1
          && C.histoFaites >= 1,
          JSON.stringify({ etapes: C.histoEtapes, jalons: C.histoJalons,
            courante: C.histoCourante, faites: C.histoFaites }));
        verifier('le processus s’arrête sur un motif que le serveur garde, et la ligne offre alors « Reprendre » et « Archiver »',
          C.boiteMotif === true && C.arreteEnBase === true
          && /arrêt par la ronde/.test(C.motifEnBase || '')
          && !!C.apresArret && C.apresArret.arreter === false
          && C.apresArret.reprendre === true && C.apresArret.archiver === true
          && C.apresArret.marquee === true,
          JSON.stringify({ motif: C.motifEnBase, apres: C.apresArret, erreur: C.erreur }));
        verifier('il se reprend, et la ligne redevient ce qu’elle était',
          C.repriseEnBase === true && !!C.apresReprise
          && C.apresReprise.arreter === true && C.apresReprise.reprendre === false,
          JSON.stringify({ reprise: C.repriseEnBase, apres: C.apresReprise }));
        verifier('arrêtée puis archivée, l’activité quitte « en vie » pour les archives, et y revient par son geste',
          C.archiveeEnBase === true && C.partieDesEnVie === true
          && C.dansLesArchives === true && C.boutonSortir === true
          && C.sortieEnBase === true,
          JSON.stringify({ archivee: C.archiveeEnBase, partie: C.partieDesEnVie,
            archives: C.dansLesArchives, sortie: C.sortieEnBase }));
        verifier('un lot d’archives se replie d’un clic sur son titre, et se redéplie',
          C.groupeTrouve === true && C.groupeApresClic !== C.groupeOuvertAvant
          && C.groupeRendu === true,
          JSON.stringify({ avant: C.groupeOuvertAvant, apres: C.groupeApresClic,
            rendu: C.groupeRendu }));
        verifier('un dossier clôturé s’archive, le serveur le porte, et il revient par son geste',
          D2.bouton === true && D2.archiveEnBase === true
          && D2.boutonRetour === true && D2.renduEnBase === true,
          JSON.stringify(D2));
        verifier('un plan archivé forme son lot, et le geste de l’écran le rend aux plans validés',
          P2.archive === 200 && P2.boutonDesarchiver === true && P2.groupes >= 1
          && P2.statutRendu === 'valide',
          JSON.stringify(P2));
        verifier('la suppression définitive refuse une référence qui ne correspond pas, et n’emporte rien',
          S2.bouton === true && S2.surviteAuMauvaisCode === true,
          JSON.stringify({ bouton: S2.bouton, reference: S2.reference,
            survit: S2.surviteAuMauvaisCode, erreur: S2.erreur }));
        verifier('la bonne référence l’emporte : le serveur ne connaît plus l’activité',
          (S2.statutApres === 404 || S2.statutApres === 400)
          && S2.encoreListee === false,
          JSON.stringify({ statut: S2.statutApres, listee: S2.encoreListee }));
      }

      etape = 'circuit guidé';
      const circuit = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const notifs = async () => {
          try { return await (await fetch(`${api}/notifications`, { credentials: 'same-origin' })).json(); }
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
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e) return '';
          // La première option réelle : l'option vide est un intitulé, non un choix.
          const i = [...e.options].findIndex((o) => o.value);
          if (i < 0) return '';
          e.selectedIndex = i;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        // Les deux fenêtres de confirmation de SURV — celle du socle et celle du
        // module (n° 5.f.25).
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui')
            || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
            || document.querySelector('[data-rep="oui"]');
          if (!oui) return false;
          oui.click();
          await attendre(3500);
          return true;
        };

        const avant = await notifs();
        const avantIds = new Set((avant || []).map((n) => n.id));
        r.avant = avantIds.size;

        document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
        await attendre(3200);
        const porte = document.querySelector('[onclick^="execProcNouvelleActivite"]');
        r.porte = !!porte;
        if (!porte) return r;
        porte.click();
        await attendre(3500);
        r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;

        // ── Les listes en cascade : le domaine commande le secteur, qui
        //    commande l'organisme ──
        //
        // Mesuré avant d'écrire : à l'ouverture, `hp_secteur` et
        // `hp_prestataire` ne portent **qu'une** option — leur intitulé. Elles
        // se remplissent quand le domaine est choisi. Un contrôle qui les aurait
        // renseignées d'emblée aurait choisi dans le vide.
        poser('hp_annee', String(new Date().getFullYear()));
        // ── La cascade dépend des **données**, et la ronde doit la chercher ──
        //
        // Premier jet : le premier domaine, puis le premier secteur, puis le
        // premier organisme. Le secteur retenu n'en portait **aucun** —
        // `prestataire: ""` —, et la création s'arrêtait sans un mot : le geste
        // valide côté client, et ne part pas.
        //
        // On parcourt donc les couples (domaine, secteur) jusqu'à en trouver un
        // que le jeu d'essai peuple. *Un formulaire en cascade ne se remplit pas
        // par le premier choix de chaque liste : il se remplit par le chemin que
        // les données autorisent.*
        const options = (id) => [...(document.getElementById(id) || { options: [] }).options]
          .filter((o) => o.value).map((o) => o.value);
        const poserListe = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        r.cascade = { essais: 0 };
        for (const dom of options('hp_domaine')) {
          poserListe('hp_domaine', dom);
          /* eslint-disable no-await-in-loop */
          await attendre(1600);
          for (const sec of options('hp_secteur')) {
            poserListe('hp_secteur', sec);
            await attendre(1400);
            r.cascade.essais += 1;
            const prest = options('hp_prestataire');
            if (prest.length) {
              poserListe('hp_prestataire', prest[0]);
              await attendre(1200);
              r.cascade.domaine = dom;
              r.cascade.secteur = sec;
              r.cascade.prestataire = prest[0];
              break;
            }
          }
          if (r.cascade.prestataire) break;
        }
        r.cascade.type = choisir('hp_type');
        r.cascade.mode = choisir('hp_mode');
        r.cascade.responsable = choisir('hp_responsable');
        r.cascade.type = choisir('hp_type');
        r.cascade.mode = choisir('hp_mode');
        r.cascade.responsable = choisir('hp_responsable');
        poser('hp_debut', '2026-11-02');
        poser('hp_fin', '2026-11-04');
        poser('hp_nb_inspecteurs', '2');
        poser('hp_lieu', 'Siège de l’organisme');
        poser('hp_objet', 'SURV 0.c — activité hors plan de la ronde');
        await attendre(1200);

        document.querySelector('[onclick^="execProcCreerHorsPlan"]')?.click();
        await attendre(1000);
        r.creationConfirmee = await confirmer();
        await attendre(2000);
        const apres = await notifs();
        r.apres = (apres || []).length;
        const mienne = (apres || []).find((n) => !avantIds.has(n.id));
        r.creee = mienne ? { id: mienne.id, statut: mienne.statut, objet: mienne.objet || '' } : null;
        if (!mienne) return r;

        // ── Le circuit, par ses gestes ──
        // `EXEC_PROC` n'est pas encore peuplé à cet instant — il l'est quand le
        // circuit s'ouvre sur une étape. Le relevé le note sans en faire une
        // condition : ce qui compte est que les gestes du circuit répondent, et
        // ils sont relevés juste après.
        r.etat = window.EXEC_PROC
          ? { etape: window.EXEC_PROC.etape, notif: !!window.EXEC_PROC.notif } : null;
        r.gestesCircuit = [...new Set([...document.querySelectorAll('[onclick]')]
          .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean))].filter((n) => /^execProc|^execStart|^execEdit/.test(n));

        const statut = async () => ((await notifs()).find((n) => n.id === mienne.id) || {}).statut;
        const agir = async (geste) => {
          const b = [...document.querySelectorAll('[onclick^="execProcAction"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(`'${geste}'`));
          if (!b) return false;
          b.click();
          await attendre(1000);
          await confirmer();
          await attendre(2500);
          return true;
        };
        r.soumise = await agir('submit');
        r.statutSoumise = await statut();
        r.validee = await agir('validate');
        r.statutValidee = await statut();
        r.transmise = await agir('send');
        r.statutTransmise = await statut();

        // ── Le ménage, et la propriété qu'il a révélée ──
        //
        // Une notification **envoyée ne s'efface pas** : la suppression rend
        // **409**, mesuré. C'est juste — elle est partie chez l'organisme, et un
        // acte transmis ne se retire pas d'un trait.
        //
        // Elle **s'annule** : `cancel` la ramène à `brouillon`, et c'est de là
        // qu'elle peut être retirée. Le ménage de cette ronde est donc lui-même
        // un contrôle de la règle — *ce qui ne s'efface pas doit pouvoir se
        // défaire, et la différence se mesure.*
        const refus = await fetch(`${api}/notifications/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppressionEnvoyee = refus.status;
        const annulation = await fetch(`${api}/notifications/${mienne.id}/cancel`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          body: JSON.stringify({ motif: 'Annulation par la ronde.' }),
        });
        r.annulation = annulation.status;
        r.statutAnnulee = await statut();
        const suppr = await fetch(`${api}/notifications/${mienne.id}`, {
          method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
        });
        r.suppression = suppr.status;
        r.fin = (await notifs()).filter((n) => n.id === mienne.id).length;
        return r;
      }, M);

      verifier('la porte du circuit guidé est sur la page des plans, et son formulaire s’ouvre garni',
        circuit.porte === true && circuit.formulaire > 3000,
        JSON.stringify({ porte: circuit.porte, formulaire: circuit.formulaire }));
      verifier('les listes du formulaire se remplissent en cascade, et la ronde trouve un couple que les données peuplent',
        !!circuit.cascade && !!circuit.cascade.domaine
        && !!circuit.cascade.secteur && !!circuit.cascade.prestataire
        && circuit.cascade.essais > 0,
        JSON.stringify(circuit.cascade));
      verifier('l’activité hors plan crée sa notification en brouillon, et le serveur la porte',
        circuit.apres === circuit.avant + 1 && !!circuit.creee
        && circuit.creee.statut === 'brouillon'
        && /activité hors plan de la ronde/.test(circuit.creee.objet),
        JSON.stringify({ avant: circuit.avant, apres: circuit.apres, creee: circuit.creee,
          etat: circuit.etat }));
      verifier('la notification parcourt son circuit par ses gestes : soumise, validée, transmise',
        circuit.soumise === true && circuit.statutSoumise === 'soumis'
        && circuit.validee === true && circuit.statutValidee === 'valide'
        // Le dernier statut est **`envoye`**, et non « transmis » : je l'avais
        // supposé par analogie avec le rapport, qui dit « transmis ». Mesuré.
        && circuit.transmise === true && circuit.statutTransmise === 'envoye',
        JSON.stringify({ soumise: [circuit.soumise, circuit.statutSoumise],
          validee: [circuit.validee, circuit.statutValidee],
          transmise: [circuit.transmise, circuit.statutTransmise] }));
      verifier('une notification envoyée refuse d’être effacée, s’annule, et se retire alors',
        circuit.suppressionEnvoyee === 409
        && circuit.annulation === 200 && circuit.statutAnnulee === 'brouillon'
        && circuit.suppression === 200 && circuit.fin === 0,
        JSON.stringify({ refusEnvoyee: circuit.suppressionEnvoyee, annulation: circuit.annulation,
          apresAnnulation: circuit.statutAnnulee, suppression: circuit.suppression,
          reste: circuit.fin }));

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

    // ══════════════════════════════════════════════════════════════════
    //  La composition des références — Paramètres → Autres paramètres
    // ══════════════════════════════════════════════════════════════════
    //
    // Dix gestes nommés, et le meilleur terrain de mesure de l'écran : chaque
    // geste a un effet **visible et dénombrable**. Les segments d'une référence
    // s'ordonnent (préfixe, État, domaine, année, numéro d'ordre), et un aperçu
    // montre aussitôt ce que donnera la prochaine référence produite.
    //
    // La propriété que ce bloc tient, et qu'aucun compte de lignes ne dirait :
    // deux de ces gestes **ne reconstruisent pas la page** — c'est écrit dans
    // leur commentaire, « reconstruire la page retirerait le curseur du champ à
    // chaque lettre ». On le mesure par `document.activeElement`, seul témoin
    // qui distingue un rafraîchissement local d'un rendu complet.
    //
    // La ronde ajoute **un** segment, l'exerce de bout en bout, puis le retire ;
    // elle rend enfin le serveur à ses modèles par défaut par le geste prévu
    // pour cela.
    etape = 'composition des références';
    const refsA = await page.evaluate(async (api) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const lire = async () => {
        try {
          return await (await fetch(`${api}/parametres/references`,
            { credentials: 'same-origin' })).json();
        } catch { return null; }
      };
      const depart = await lire();
      r.modifiable = !!(depart && depart.modifiable);
      r.avant = JSON.stringify((depart || {}).modeles || {});

      document.querySelector('.nav-btn[data-page="parametres"]')?.click();
      await attendre(2500);
      const sousMenu = (nom) => [...document.querySelectorAll('[onclick*="_execParamSub"]')]
        .find((x) => new RegExp(nom).test(x.getAttribute('onclick') || ''));
      sousMenu('autres')?.click();
      await attendre(2500);

      const blocs = () => [...document.querySelectorAll('.exec-ref-objet')];
      const bloc = () => blocs()[0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const apercu = () => (bloc().querySelector('.exec-ref-apercu') || {}).textContent || '';
      const total = () => (bloc().querySelector('.exec-ref-total') || {}).textContent || '';

      // ── Les six objets du circuit, et leur aperçu lisible fermé ──
      r.objets = blocs().length;
      r.apercusGarnis = blocs()
        .map((b) => (b.querySelector('.exec-ref-apercu') || {}).textContent || '')
        .filter((t) => t.trim().length > 0).length;
      r.fermes = blocs().filter((b) => !b.open).length;

      // ── La section se déplie par son résumé, et l'aperçu ne bouge pas ──
      const apercuFerme = apercu();
      bloc().querySelector('summary').click();
      await attendre(900);
      r.ouvertApresClic = bloc().open;
      r.apercuInchangeParOuverture = apercu() === apercuFerme;
      r.segDepart = segs().length;
      r.totalDepart = total();

      // ── Un segment s'ajoute ──
      bloc().querySelector('[onclick^="execRefsAjouter"]')?.click();
      await attendre(1400);
      r.segApresAjout = segs().length;
      r.totalApresAjout = total();
      // Le nouveau segment est un « texte libre » vide : l'aperçu l'écarte,
      // puisqu'il filtre les parties vides. Le compte, lui, l'a vu.
      r.apercuApresAjout = apercu();
      r.apercuIgnoreLeVide = apercu() === apercuFerme;

      // ── Sa valeur se saisit, et le rendu suit la frappe sans rendu complet ──
      const derniere = () => segs()[segs().length - 1];
      const champ = derniere().querySelector('[oninput*="execRefsSaisir"][oninput*="valeur"]');
      r.champTrouve = !!champ;
      if (champ) {
        champ.focus();
        champ.value = 'RONDE';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.renduDeLaLigne = (derniere().querySelector('.exec-ref-rendu') || {}).textContent || '';
        // Le témoin qui distingue un rafraîchissement local d'un rendu complet :
        // un rendu complet remplacerait le champ, et le curseur serait perdu.
        r.curseurGarde = document.activeElement === champ;
        r.apercuPorteLaSaisie = /RONDE/.test(apercu());
      }

      // ── Le séparateur change, et seul l'aperçu est refait ──
      const sep = bloc().querySelector('[oninput*="execRefsMajSeparateur"]');
      r.sepTrouve = !!sep;
      if (sep) {
        r.sepAvant = sep.value;
        sep.focus();
        sep.value = '.';
        sep.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.apercuAvecPoint = apercu();
        r.sepCurseurGarde = document.activeElement === sep;
        r.sepPasDeTiret = !apercu().includes('-') && apercu().includes('.');
      }
      return r;
    }, M);

    verifier('l’onglet « Autres paramètres » porte la composition des six objets du circuit, aperçu lisible section fermée',
      refsA.objets === 6 && refsA.apercusGarnis === 6 && refsA.fermes === 6,
      JSON.stringify({ objets: refsA.objets, garnis: refsA.apercusGarnis, fermes: refsA.fermes }));
    verifier('une section se déplie par son résumé, et son aperçu ne devait rien à l’ouverture',
      refsA.ouvertApresClic === true && refsA.apercuInchangeParOuverture === true,
      JSON.stringify({ ouvert: refsA.ouvertApresClic, inchange: refsA.apercuInchangeParOuverture }));
    verifier('un segment s’ajoute : le compte le voit, l’aperçu l’écarte tant qu’il est vide',
      refsA.segApresAjout === refsA.segDepart + 1
      && refsA.totalApresAjout !== refsA.totalDepart
      && refsA.apercuIgnoreLeVide === true,
      JSON.stringify({ avant: refsA.segDepart, apres: refsA.segApresAjout,
        total: refsA.totalApresAjout, apercu: refsA.apercuApresAjout }));
    verifier('la valeur d’un segment se saisit : le rendu de la ligne et l’aperçu suivent, et le curseur reste dans le champ',
      refsA.renduDeLaLigne === 'RONDE' && refsA.apercuPorteLaSaisie === true
      && refsA.curseurGarde === true,
      JSON.stringify({ rendu: refsA.renduDeLaLigne, apercu: refsA.apercuPorteLaSaisie,
        curseur: refsA.curseurGarde }));
    verifier('le séparateur change, l’aperçu se recompose, et le curseur reste là aussi',
      refsA.sepAvant === '-' && refsA.sepPasDeTiret === true && refsA.sepCurseurGarde === true,
      JSON.stringify({ avant: refsA.sepAvant, apercu: refsA.apercuAvecPoint,
        curseur: refsA.sepCurseurGarde }));

    const refsB = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const bloc = () => [...document.querySelectorAll('.exec-ref-objet')][0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const apercu = () => (bloc().querySelector('.exec-ref-apercu') || {}).textContent || '';
      const derniere = () => segs()[segs().length - 1];
      const rendu = (d) => (d.querySelector('.exec-ref-rendu') || {}).textContent || '';

      // ── Le type du segment change, et le numéro d'ordre prend sa longueur ──
      const choix = derniere().querySelector('select');
      choix.value = 'numero';
      choix.focus();
      choix.dispatchEvent(new Event('change', { bubbles: true }));
      await attendre(1600);
      // ── Le contre-essai du témoin ──
      //
      // `document.activeElement` ne prouve rien tant qu'on n'a pas montré qu'il
      // **distingue**. `execRefsMajSegment`, lui, appelle `execRenderPage()` :
      // le nœud du menu doit donc avoir quitté le document. Si ce relevé était
      // vert aussi, les trois contrôles de curseur ne mesureraient que le fait
      // qu'un champ garde le focus quand on ne touche à rien.
      r.choixDetache = !document.contains(choix);
      r.renduNumero = rendu(derniere());
      const longueur = derniere().querySelector('[oninput*="execRefsSaisir"][oninput*="longueur"]');
      r.longueurTrouvee = !!longueur;
      r.longueurDefaut = longueur ? Number(longueur.value) : null;

      // ── La longueur se saisit, et le rendu se rallonge ──
      if (longueur) {
        longueur.value = '5';
        longueur.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(700);
        r.renduRallonge = rendu(derniere());
      }

      // ── Le segment monte d'un rang : l'ordre change, le contenu non ──
      const sep = (bloc().querySelector('[oninput*="execRefsMajSeparateur"]') || {}).value || '.';
      const avant = apercu();
      r.ordreAvant = avant;
      // La garde du premier rang est **dans le balisage**, non dans la fonction :
      // le bouton « Monter » du rang 1 est `disabled`. On la constate là où elle
      // est, au lieu de cliquer un bouton mort et d'appeler cela une preuve.
      r.monterDuPremierDesarme = !!segs()[0].querySelector('[onclick*="execRefsDeplacer"][onclick*="-1"]').disabled;
      derniere().querySelector('[onclick*="execRefsDeplacer"][onclick*="-1"]').click();
      await attendre(1600);
      r.ordreApres = apercu();
      const parts = (t) => t.split(sep).filter(Boolean).sort().join('|');
      r.memesParties = parts(avant) === parts(r.ordreApres);
      r.ordreADifferé = avant !== r.ordreApres;

      // ── Et il se retire : le compte revient à son départ ──
      r.segAvantRetrait = segs().length;
      const cible = [...segs()].find((s) => (s.querySelector('select') || {}).value === 'numero'
        && Number((s.querySelector('[oninput*="longueur"]') || {}).value) === 5);
      r.cibleTrouvee = !!cible;
      cible?.querySelector('[onclick*="execRefsRetirer"]').click();
      await attendre(1600);
      r.segApresRetrait = segs().length;
      r.apercuFinal = apercu();
      return r;
    });

    verifier('le type d’un segment se change, et le numéro d’ordre arrive avec ses trois chiffres',
      refsB.renduNumero === '001' && refsB.longueurTrouvee === true && refsB.longueurDefaut === 3,
      JSON.stringify(refsB));
    // Le contre-essai des trois contrôles de curseur ci-dessus : ce geste-ci
    // reconstruit la page, et son nœud doit avoir quitté le document.
    verifier('et ce geste-là reconstruit bien la page : son propre menu quitte le document — le témoin du curseur distingue',
      refsB.choixDetache === true,
      JSON.stringify({ detache: refsB.choixDetache }));
    verifier('la longueur du numéro se saisit, et son rendu se rallonge d’autant',
      refsB.renduRallonge === '00001',
      JSON.stringify({ rendu: refsB.renduRallonge }));
    verifier('un segment monte d’un rang : l’aperçu change d’ordre sans changer de contenu, et le rang 1 ne peut pas monter',
      refsB.ordreADifferé === true && refsB.memesParties === true
      && refsB.monterDuPremierDesarme === true,
      JSON.stringify({ avant: refsB.ordreAvant, apres: refsB.ordreApres,
        memes: refsB.memesParties, premierDesarme: refsB.monterDuPremierDesarme }));
    verifier('le segment ajouté se retire, et le compte revient à son départ',
      refsB.cibleTrouvee === true && refsB.segApresRetrait === refsB.segAvantRetrait - 1
      && refsB.segApresRetrait === refsA.segDepart,
      JSON.stringify({ depart: refsA.segDepart, avant: refsB.segAvantRetrait,
        apres: refsB.segApresRetrait }));

    const refsC = await page.evaluate(async ({ api, avant }) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const lire = async () => {
        try {
          return await (await fetch(`${api}/parametres/references`,
            { credentials: 'same-origin' })).json();
        } catch { return null; }
      };
      const bloc = () => [...document.querySelectorAll('.exec-ref-objet')][0];
      const segs = () => [...bloc().querySelectorAll('.exec-ref-segment')];
      const enregistrer = async () => {
        document.querySelector('[onclick^="execRefsEnregistrer"]')?.click();
        await attendre(2200);
      };

      // ── L'enregistrement est relu chez le serveur ──
      await enregistrer();
      const apres = await lire();
      r.sepChezLeServeur = ((apres || {}).modeles || {}).activite
        ? apres.modeles.activite.separateur : null;

      // ── Le serveur impose un numéro d'ordre ──
      //
      // « Une référence sans numéro d'ordre ne distinguerait plus deux
      // objets » : le serveur en pose un si la composition reçue n'en porte
      // aucun. On retire donc tous les numéros par le geste de l'écran, on
      // enregistre, et l'on relit ce que le serveur a gardé.
      let garde = 0;
      for (;;) {
        const n = [...segs()].find((s) => (s.querySelector('select') || {}).value === 'numero');
        if (!n || garde > 6) break;
        n.querySelector('[onclick*="execRefsRetirer"]').click();
        garde += 1;
        /* eslint-disable no-await-in-loop */
        await attendre(1500);
      }
      r.numerosRetires = garde;
      r.plusAucunNumeroAuClient = ![...segs()]
        .some((s) => (s.querySelector('select') || {}).value === 'numero');
      await enregistrer();
      const impose = await lire();
      const segServeur = (((impose || {}).modeles || {}).activite || {}).segments || [];
      r.numeroImpose = segServeur.filter((s) => s.type === 'numero').length;
      r.longueurImposee = (segServeur.find((s) => s.type === 'numero') || {}).longueur;

      // ── Le geste « compositions par défaut », et le serveur rendu tel quel ──
      document.querySelector('[onclick^="execRefsDefaut"]')?.click();
      await attendre(1600);
      await enregistrer();
      const fin = await lire();
      r.rendu = JSON.stringify((fin || {}).modeles || {});
      r.identiqueAuDepart = r.rendu === avant;
      return r;
    }, { api: M, avant: refsA.avant });

    verifier('l’enregistrement de la composition est relu chez le serveur, séparateur compris',
      refsA.modifiable === true && refsC.sepChezLeServeur === '.',
      JSON.stringify({ modifiable: refsA.modifiable, separateur: refsC.sepChezLeServeur }));
    verifier('le serveur impose un numéro d’ordre : une composition qui n’en porte plus en reçoit un',
      refsC.numerosRetires > 0 && refsC.plusAucunNumeroAuClient === true
      && refsC.numeroImpose === 1 && refsC.longueurImposee === 3,
      JSON.stringify(refsC));
    verifier('le geste « compositions par défaut » rend le serveur à l’état où la ronde l’a trouvé',
      refsC.identiqueAuDepart === true,
      `rendu ${String(refsC.rendu).slice(0, 90)} · départ ${String(refsA.avant).slice(0, 90)}`);

    // ══════════════════════════════════════════════════════════════════
    //  Le tableau de bord : la piste des activités, et ses commandes
    // ══════════════════════════════════════════════════════════════════
    //
    // La propriété de ce Gantt n'est pas qu'il défile : c'est que **ses
    // commandes se ferment quand la piste tient tout entière dans son cadre**.
    // Le code le dit : « sur un large écran, une piste qui tient tout entière
    // ne bougeait pas d'un clic, et les boutons passaient pour cassés ».
    //
    // D'où la seule forme honnête de ce contrôle : à deux faces. Cliquer un
    // bouton désarmé et constater que rien ne bouge serait un faux vert — on
    // aurait mesuré un bouton mort et appelé cela une preuve. On resserre donc
    // la fenêtre pour faire déborder la piste, et l'on vérifie les deux états.
    // La fenêtre est rendue à sa taille d'origine ensuite : une ronde qui ne
    // rend pas ce qu'elle a changé fait rougir celles qui la suivent.
    etape = 'piste des activités';
    await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('.nav-btn[data-page="dashboard"]')?.click();
      await attendre(3200);
    });

    const ganttLarge = await page.evaluate(() => {
      const cadre = document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
      const boutons = [...document.querySelectorAll('#execSuiviActivitesRoot .exec-suivi-nav .btn')];
      return {
        cadre: !!cadre,
        deborde: cadre ? cadre.scrollWidth > cadre.clientWidth + 1 : null,
        boutons: boutons.length,
        desarmes: boutons.filter((b) => b.disabled).length,
        raisons: boutons.filter((b) => b.disabled && (b.title || '').length > 0).length,
      };
    });

    await page.setViewport({ width: 620, height: 900 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2200)));
    const ganttSerre = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const cadre = () => document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
      const boutons = () => [...document.querySelectorAll('#execSuiviActivitesRoot .exec-suivi-nav .btn')];
      const commande = (motif) => boutons().find((b) => new RegExp(motif)
        .test(b.getAttribute('onclick') || ''));
      r.deborde = cadre() ? cadre().scrollWidth > cadre().clientWidth + 1 : null;
      r.desarmes = boutons().filter((b) => b.disabled).length;

      // ── Les commandes font défiler la piste ──
      // `scrollBy`/`scrollTo` sont en `behavior: 'smooth'` : on laisse le temps
      // à l'animation, sans quoi on relèverait la position de départ.
      cadre().scrollLeft = 0;
      await attendre(400);
      commande('execGanttDefiler\\(1\\)')?.click();
      await attendre(1500);
      r.apresAvancer = Math.round(cadre().scrollLeft);
      commande('execGanttBord\\(1\\)')?.click();
      await attendre(1500);
      r.apresFin = Math.round(cadre().scrollLeft);
      r.maxPossible = Math.round(cadre().scrollWidth - cadre().clientWidth);
      commande('execGanttBord\\(-1\\)')?.click();
      await attendre(1500);
      r.apresDebut = Math.round(cadre().scrollLeft);
      commande('execGanttAujourdhui')?.click();
      await attendre(1500);
      r.apresAujourdhui = Math.round(cadre().scrollLeft);
      r.traitDuJour = !!cadre().querySelector('.g-aujourdhui');

      // ── Un filtre du panneau : la carte est refaite, et le décocher rétablit ──
      const carte = () => document.getElementById('execSuiviActivitesRoot');
      const lignes = () => [...carte().querySelectorAll('.g-nom')]
        .map((e) => e.textContent.trim()).join('|');
      const cases = () => [...carte().querySelectorAll('[onchange*="execGanttFiltrer"]')];
      r.cases = cases().length;
      const noeudAvant = carte();
      const avant = lignes();
      const uneCase = cases().find((c) => /avancements/.test(c.getAttribute('onchange') || ''));
      r.caseTrouvee = !!uneCase;
      if (uneCase) {
        uneCase.click();
        await attendre(1200);
        r.carteRemplacee = carte() !== noeudAvant;
        r.apresFiltre = lignes();
        // Le même filtre, décoché : la carte ayant été remplacée, il faut le
        // retrouver par son `onchange`, non par le nœud d'avant.
        const meme = cases().find((c) => c.getAttribute('onchange') === uneCase.getAttribute('onchange'));
        r.memeCaseRetrouvee = !!meme;
        r.cochee = meme ? meme.checked : null;
        meme?.click();
        await attendre(1200);
        r.retabli = lignes();
        r.identiqueApresRetour = r.retabli === avant;
        r.filtreARestreint = r.apresFiltre !== avant;
      }
      return r;
    });
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

    verifier('la piste des activités tient dans son cadre à 1280 px, et ses commandes se ferment en disant pourquoi',
      ganttLarge.cadre === true && ganttLarge.deborde === false
      && ganttLarge.boutons === 5 && ganttLarge.desarmes === 5
      && ganttLarge.raisons === 5,
      JSON.stringify(ganttLarge));
    verifier('la fenêtre resserrée, la piste déborde et les commandes s’arment — le témoin distingue les deux états',
      ganttSerre.deborde === true && ganttSerre.desarmes === 0,
      JSON.stringify({ deborde: ganttSerre.deborde, desarmes: ganttSerre.desarmes }));
    verifier('les commandes mènent la piste : avancer, le bout, le début, et le trait du jour',
      ganttSerre.apresAvancer > 0
      && ganttSerre.apresFin === ganttSerre.maxPossible
      && ganttSerre.apresDebut === 0
      && ganttSerre.traitDuJour === true && ganttSerre.apresAujourdhui >= 0,
      JSON.stringify({ avancer: ganttSerre.apresAvancer, fin: ganttSerre.apresFin,
        max: ganttSerre.maxPossible, debut: ganttSerre.apresDebut,
        aujourdhui: ganttSerre.apresAujourdhui, trait: ganttSerre.traitDuJour }));
    verifier('un filtre du panneau refait la carte, restreint la piste, et se décoche sans rien laisser',
      ganttSerre.cases > 0 && ganttSerre.caseTrouvee === true
      && ganttSerre.carteRemplacee === true && ganttSerre.filtreARestreint === true
      && ganttSerre.identiqueApresRetour === true,
      JSON.stringify({ cases: ganttSerre.cases, remplacee: ganttSerre.carteRemplacee,
        restreint: ganttSerre.filtreARestreint, retabli: ganttSerre.identiqueApresRetour,
        avantApres: `${ganttSerre.apresFiltre} ≠ ${ganttSerre.retabli}` }));

    // ══════════════════════════════════════════════════════════════════
    //  Le formulaire de statistiques — indicateurs, situation, période
    // ══════════════════════════════════════════════════════════════════
    //
    // Il occupe le volet, se rejoue à chaque geste, et garde son état dans
    // `EXEC_STATE` : onglet, indicateur, filtres et période. On l'exerce donc
    // par ses gestes, et l'on relève à chaque fois ce que l'écran rend — non ce
    // que l'état porte, qui ne prouverait que l'affectation.
    etape = 'formulaire de statistiques';
    const stats = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const volet = () => document.getElementById('execSlider');
      const dans = (sel) => (volet() || document).querySelectorAll(sel);
      const un = (sel) => (volet() || document).querySelector(sel);

      // ── Le formulaire s'ouvre dans le volet, avec ses deux sous-menus ──
      document.querySelector('[onclick^="execShowStatistiquesAdvanced"]')?.click();
      await attendre(2600);
      r.voletOuvert = !!volet() && volet().classList.contains('open');
      r.onglets = [...dans('.exec-stats-onglet')].map((b) => b.textContent.trim());
      r.cartes = dans('[onclick^="execStatsIndicateur"]').length;
      // Sans prestataire retenu, les constatations de la ronde datent toutes du
      // même jour : la piste n'a pas d'étendue, et la chronologie ne paraît pas.
      r.chronoAvantPrest = !!document.getElementById('execChrono');

      // ── Une carte d'indicateur s'ouvre, et un second clic la referme ──
      const carte = () => [...dans('[onclick^="execStatsIndicateur"]')]
        .find((b) => /execStatsIndicateur\('[a-z_]+'\)/.test(b.getAttribute('onclick') || ''));
      const detail = () => dans('.exec-stats-detail, [class*="stats-detail"]').length;
      r.detailAvant = detail();
      const premiere = carte();
      r.cleIndicateur = premiere ? (premiere.getAttribute('onclick') || '') : '';
      premiere?.click();
      await attendre(2000);
      r.detailApres = detail();
      r.actifs = dans('.cliquable.actif, .actif').length;
      // Le même geste, retrouvé par sa clé : le formulaire s'est rejoué.
      [...dans('[onclick^="execStatsIndicateur"]')]
        .find((b) => b.getAttribute('onclick') === r.cleIndicateur)?.click();
      await attendre(2000);
      r.detailReferme = detail();

      // ── La chronologie n'existe que si les données s'étendent dans le temps ──
      //
      // Premier jet : j'ai exercé la chronologie d'emblée, et trois contrôles
      // ont rougi — `raccourcis: 0`. Elle ne se rend pas : `_execStatsPeriode`
      // la borne sur les dates des constatations, et tout ce que la ronde crée
      // date du même jour. Le relevé disait « 0 raccourci » ; j'avais écrit
      // « les poignées » avant de regarder s'il y avait une piste.
      //
      // L'écran y mène pourtant, par son propre geste : « un prestataire retenu
      // impose son cycle de surveillance », et un cycle, lui, s'étend. On
      // choisit donc un prestataire — et cette règle devient un contrôle, au
      // lieu d'un détour pour atteindre le suivant.
      const selPrest = [...dans('select')]
        .find((x) => /statsFilters\.prestataire/.test(x.getAttribute('onchange') || ''));
      r.selPrestTrouve = !!selPrest;
      if (selPrest) {
        const i = [...selPrest.options].findIndex((o) => o.value);
        r.prestOffert = i >= 0;
        if (i >= 0) {
          selPrest.selectedIndex = i;
          selPrest.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2600);
        }
        r.periodeDuCycle = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
        r.chronoApresPrest = !!document.getElementById('execChrono');
        r.bandeauCycle = dans('.exec-chrono-cycle').length;
      }

      // ── Les raccourcis de période, et les bornes au clavier ──
      const raccourci = (n) => [...dans('.exec-chrono-btn')]
        .find((b) => new RegExp(`execStatsPeriodeDerniers\\(${n}\\)`).test(b.getAttribute('onclick') || ''));
      r.raccourcis = dans('.exec-chrono-btn').length;
      raccourci(3)?.click();
      await attendre(2200);
      r.periode3 = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      r.dateDebutRendue = (document.getElementById('execChronoDateDebut') || {}).value || '';

      const dDebut = document.getElementById('execChronoDateDebut');
      const dFin = document.getElementById('execChronoDateFin');
      r.champsDates = !!dDebut && !!dFin;
      if (dDebut && dFin) {
        // Les bornes se saisissent à l'envers : le geste les remet dans l'ordre.
        dDebut.value = '2026-09-30';
        dFin.value = '2026-09-01';
        dFin.dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(2200);
        r.periodeRemiseEnOrdre = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      }

      // ── Les poignées ne se croisent pas : celle qu'on pousse repousse l'autre ──
      const a = document.getElementById('execChronoDebut');
      const b = document.getElementById('execChronoFin');
      r.poignees = !!a && !!b;
      if (a && b) {
        a.value = String(Number(a.max));
        b.value = '0';
        a.focus();
        a.dispatchEvent(new Event('input', { bubbles: true }));
        await attendre(600);
        r.poigneeFinRepoussee = Number(document.getElementById('execChronoFin').value);
        r.poigneeMax = Number(a.max);
        // Le relâchement arrête la période, et le formulaire se rejoue.
        document.getElementById('execChronoDebut')
          .dispatchEvent(new Event('change', { bubbles: true }));
        await attendre(2200);
        r.periodeApresRelachement = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      }
      // La période est rendue à « tout », pour ne pas fausser la suite.
      [...dans('.exec-chrono-btn')]
        .find((x) => /execStatsPeriode\('',''\)/.test(x.getAttribute('onclick') || ''))?.click();
      await attendre(2200);
      r.periodeRendue = JSON.stringify((window.EXEC_STATE || {}).statsPeriode || null);
      return r;
    });

    verifier('le formulaire de statistiques s’ouvre dans le volet, avec ses deux sous-menus et ses cartes d’indicateurs',
      stats.voletOuvert === true && stats.onglets.length === 2 && stats.cartes >= 5,
      JSON.stringify({ volet: stats.voletOuvert, onglets: stats.onglets,
        cartes: stats.cartes, chrono: stats.chronoAvantPrest }));
    verifier('une carte d’indicateur s’ouvre sur son détail, et le second clic la referme',
      stats.detailAvant === 0 && stats.detailApres > 0 && stats.detailReferme === 0,
      JSON.stringify({ avant: stats.detailAvant, apres: stats.detailApres,
        referme: stats.detailReferme, cle: stats.cleIndicateur }));
    verifier('un prestataire retenu impose son cycle de surveillance comme période, et la chronologie paraît alors',
      stats.selPrestTrouve === true && stats.prestOffert === true
      && /"debut":"\d{4}-\d{2}-\d{2}","fin":"\d{4}-\d{2}-\d{2}"/.test(stats.periodeDuCycle || '')
      && stats.chronoApresPrest === true && stats.bandeauCycle === 1,
      JSON.stringify({ periode: stats.periodeDuCycle, chrono: stats.chronoApresPrest,
        bandeau: stats.bandeauCycle }));
    verifier('le raccourci des trois derniers mois arrête la période, et la borne saisie se lit dans le champ',
      stats.raccourcis >= 4 && /debut/.test(stats.periode3) && stats.dateDebutRendue.length === 10,
      JSON.stringify({ raccourcis: stats.raccourcis, periode: stats.periode3,
        champ: stats.dateDebutRendue }));
    verifier('deux bornes saisies à l’envers sont remises dans l’ordre par le geste lui-même',
      stats.champsDates === true
      && /"debut":"2026-09-01","fin":"2026-09-30"/.test(stats.periodeRemiseEnOrdre || ''),
      String(stats.periodeRemiseEnOrdre));
    verifier('les poignées de la chronologie ne se croisent pas : celle qu’on pousse repousse l’autre',
      stats.poignees === true && stats.poigneeFinRepoussee === stats.poigneeMax
      && /debut/.test(stats.periodeApresRelachement || ''),
      JSON.stringify({ fin: stats.poigneeFinRepoussee, max: stats.poigneeMax,
        apres: stats.periodeApresRelachement, rendue: stats.periodeRendue }));

    const stats2 = await page.evaluate(async () => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const volet = () => document.getElementById('execSlider');
      const dans = (sel) => (volet() || document).querySelectorAll(sel);
      const un = (sel) => (volet() || document).querySelector(sel);
      const F = () => (window.EXEC_STATE || {}).statsFilters || {};

      // ── Les filtres du formulaire ──
      // Le domaine remet le secteur à vide : un secteur d'un autre domaine
      // filtrerait sur rien, et l'écran ne le dirait pas.
      const selDomaine = [...dans('select')]
        .find((s) => /statsFilters\.domaine/.test(s.getAttribute('onchange') || ''));
      r.selects = dans('select').length;
      r.domaineTrouve = !!selDomaine;
      if (selDomaine) {
        const i = [...selDomaine.options].findIndex((o) => o.value);
        if (i >= 0) {
          selDomaine.selectedIndex = i;
          selDomaine.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2200);
        }
        r.domainePose = F().domaine;
        r.secteurRemisAVide = F().secteur === '';
        // Le secteur, ensuite : sa liste ne porte que ceux du domaine retenu.
        //
        // Le motif dit `secteur=this.value`, et non `statsFilters.secteur` :
        // le gestionnaire du **domaine** porte lui aussi `statsFilters.secteur`
        // — c'est lui qui le remet à vide. Mon premier motif l'a donc choisi, et
        // j'ai re-sélectionné le domaine en croyant prendre le secteur. *Un
        // sélecteur qui apparie un fragment commun à deux gestionnaires n'en
        // désigne aucun.*
        const selSecteur = [...dans('select')]
          .find((x) => /statsFilters\.secteur=this\.value/.test(x.getAttribute('onchange') || ''));
        const j = selSecteur ? [...selSecteur.options].findIndex((o) => o.value) : -1;
        r.secteurOffert = j >= 0;
        if (j >= 0) {
          selSecteur.selectedIndex = j;
          r.valeurChoisie = selSecteur.value;
          selSecteur.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(2200);
          r.secteurPose = F().secteur;
          r.domaineTenu = F().domaine === r.domainePose;
        }
      }
      const annee = [...dans('[onclick*="statsFilters.annee"]')]
        .find((b) => /annee='\d{4}'/.test(b.getAttribute('onclick') || ''));
      r.anneeTrouvee = !!annee;
      annee?.click();
      await attendre(2200);
      r.anneePosee = F().annee;
      // La remise à zéro reconstruit l'objet entier des filtres.
      un('[onclick*="statsFilters={domaine"]')?.click();
      await attendre(2200);
      r.apresReset = JSON.stringify(F());
      r.toutVide = Object.values(F()).every((v) => v === '');

      // ── Le sous-menu « Situation générale », et ses deux exports ──
      [...dans('.exec-stats-onglet')]
        .find((b) => /statsOnglet='situation'/.test(b.getAttribute('onclick') || ''))?.click();
      await attendre(2600);
      r.carteSituation = !!document.getElementById('execSituationGeneraleCard');
      r.tableSg = !!un('table.sg-prest-table');
      r.lignesSg = dans('tbody tr.sg-ligne-prest').length;
      r.boutonsExport = dans('.sg-export-btn').length;

      // Les exports composent le document dans le navigateur : on capture le
      // produit par relais, comme en 5.f.10 — il n'y a pas de réponse HTTP.
      const relais = { fenetres: 0, blobs: 0 };
      const vraiOpen = window.open;
      const vraiURL = URL.createObjectURL;
      window.open = () => {
        relais.fenetres += 1;
        return { document: { write: () => {}, close: () => {} },
          focus: () => {}, print: () => {}, close: () => {} };
      };
      URL.createObjectURL = (b) => { relais.blobs += 1; return vraiURL.call(URL, b); };
      try {
        un('[onclick^="execExportSituationGenerale(\'xlsx\'"]')?.click();
        await attendre(1800);
        un('[onclick^="execExportSituationGenerale(\'pdf\'"]')?.click();
        await attendre(1800);
      } finally {
        window.open = vraiOpen;
        URL.createObjectURL = vraiURL;
      }
      r.exports = relais;

      // ── Retour aux indicateurs, et le volet se referme par son geste ──
      [...dans('.exec-stats-onglet')]
        .find((b) => /statsOnglet='indicateurs'/.test(b.getAttribute('onclick') || ''))?.click();
      await attendre(2400);
      r.revenuAuxIndicateurs = dans('[onclick^="execStatsIndicateur"]').length > 0;
      un('[onclick^="execCloseSlider"]')?.click();
      await attendre(1600);
      r.voletFerme = !document.getElementById('execSlider')
        || !document.getElementById('execSlider').classList.contains('open');
      return r;
    });

    verifier('le domaine choisi remet le secteur à vide, puis un secteur du domaine se pose sans le chasser',
      stats2.domaineTrouve === true && !!stats2.domainePose
      && stats2.secteurRemisAVide === true
      && stats2.secteurOffert === true && !!stats2.secteurPose
      && stats2.domaineTenu === true,
      JSON.stringify({ domaine: stats2.domainePose, vide: stats2.secteurRemisAVide,
        offert: stats2.secteurOffert, choisie: stats2.valeurChoisie,
        secteur: stats2.secteurPose, domaineTenu: stats2.domaineTenu }));
    verifier('l’année se pose, et la remise à zéro vide tous les filtres d’un seul geste',
      stats2.anneeTrouvee === true && /^\d{4}$/.test(String(stats2.anneePosee))
      && stats2.toutVide === true,
      JSON.stringify({ annee: stats2.anneePosee, apresReset: stats2.apresReset }));
    verifier('le sous-menu « Situation générale » rend sa table et ses deux exports',
      stats2.carteSituation === true && stats2.tableSg === true
      && stats2.lignesSg > 0 && stats2.boutonsExport === 2,
      JSON.stringify({ carte: stats2.carteSituation, table: stats2.tableSg,
        lignes: stats2.lignesSg, boutons: stats2.boutonsExport }));
    verifier('les deux exports de la situation générale fabriquent chacun leur document',
      !!stats2.exports && stats2.exports.blobs >= 1 && stats2.exports.fenetres >= 1,
      JSON.stringify(stats2.exports));
    verifier('le retour aux indicateurs retrouve ses cartes, et le volet se referme par son geste',
      stats2.revenuAuxIndicateurs === true && stats2.voletFerme === true,
      JSON.stringify({ revenu: stats2.revenuAuxIndicateurs, ferme: stats2.voletFerme }));

    verifier('aucune erreur de console ni requête échouée sur SURV',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
  } finally {
    // Le journal du mouchard, relevé avant de fermer : une page fermée n'a plus
    // de `window`, et le relevé rendrait zéro geste — la mesure de rien,
    // présentée comme une couverture nulle.
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = {
        enLigne: [], ecouteurs: [], propriete: [], jsx: [], barre: [], poses: 0, pages: 0,
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
            // Les actions remises au socle : quatrième canal du
            // mouchard (ADR-003, 5.f.43).
            vu.barre.push(...(j.durable.barre || []));
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
