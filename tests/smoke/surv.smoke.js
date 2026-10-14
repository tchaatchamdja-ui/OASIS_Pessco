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
    page.on('console', (m) => {
      if (surv && m.type() === 'error') incidents.push(`console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (surv) incidents.push(`exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (surv) incidents.push(`requête : ${r.url().slice(0, 120)}`);
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
