// PR dans un navigateur — la suite n° 0.b de l'écran « Profil de Risque »
// (ADR-003, 5.f.18).
//
// Le **sixième et dernier** écran à recevoir sa suite : les six sont désormais
// mesurés dans un navigateur, et plus un seul n'est dispensé pour absence
// d'instrument.
//
// ── Ce que cet écran a de particulier ──
//
// Il porte des **sous-onglets déclarés** : `NAV_CONFIG` donne à chaque page sa
// liste de sous-vues — deux pour les évaluations, trois pour les profils, deux
// pour les paramètres. Le contrôle les lit dans la source et les parcourt, ce
// qu'aucune des cinq autres suites n'avait à faire.
//
// Et il porte un **doublon déclaré** : `renderParamIndices` est défini deux fois
// dans `pr-parametres.js`, la version vivante étant l'ancienne — celle qui
// n'oppose aucun contrôle de rôle (garde-fou de `taille.smoke.js`, n° 5.f.11).
// Cette suite **n'y touche pas** : elle ouvre la sous-vue et éprouve qu'elle se
// rend, ce qui reste vrai quelle que soit la version que la maîtrise d'ouvrage
// retiendra.
//
// ── La mesure qui a précédé l'écriture ──
//
// Les cinq pages ont été ouvertes à la main : de **203** caractères
// (« Bibliothèque », vide dans le bac — c'est son plancher réel, et non un
// seuil choisi) à **52 464** (« Paramètres »). Aucun débordement, **aucun
// incident de console**.
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan, refusAttendus } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'profil_risque', 'js', 'pr-shell.js');
const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';

// ── Une page que l'aiguillage rend et qu'aucun chemin n'ouvre ──
//
// Le contrôle écrit pour SURV, où quatre pages sur treize étaient dans ce cas
// (n° 5.f.2), en a trouvé **une** ici — et elle est réelle : `'plans'` n'apparaît
// **que** dans le `case` de l'aiguillage. Pas d'entrée dans `NAV_CONFIG`, aucun
// `navigateTo('plans')`, aucune affectation de `currentPage`. Vérifié par un
// relevé de tout le module, et non supposé.
//
// `renderPlans()` vit dans `pr-plans.js` : **121 lignes, 8 gestes nommés, 12
// occurrences**. Le module « Planification de la Surveillance » a depuis son
// propre écran, et cette vue en est probablement l'ancêtre — mais « probablement »
// n'est pas une décision. Écran oublié d'un menu, ou code mort : les deux se
// corrigent, pas de la même façon, et ce n'est pas à la conversion d'en décider.
//
// La page est donc **déclarée** ici, avec ce que la mesure en sait, et le
// contrôle refuse toute page sans chemin qui ne le serait pas.
// La table reste **vide, et déclarée** : c'est elle qui a dénoncé la page
// « Plans » — rendue par l'aiguillage de PR et ouverte par rien —, et la
// maîtrise d'ouvrage a décidé le 4 novembre 2026 de retirer la page plutôt que
// de lui rendre une entrée de menu. Le mécanisme doit survivre à son premier
// occupant : sans lui, la prochaine page orpheline ne serait dénoncée par rien.
const PAGES_SANS_CHEMIN = {};

// Les pages **et leurs sous-vues**, lues dans la source.
function navDeclaree() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const NAV_CONFIG = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : NAV_CONFIG introuvable dans'
      + ' public/modules/profil_risque/js/pr-shell.js — le contrôle ne sait plus'
      + ' quelles pages l’écran déclare.');
  }
  const pages = [...bloc[1].matchAll(/^\s{4}([\w-]+):\s*\{/gm)].map((m) => m[1]);
  const sousVues = [...bloc[1].matchAll(/\{\s*id:\s*'([\w-]+)'/g)].map((m) => m[1]);
  if (!pages.length) throw new Error('refus : NAV_CONFIG ne se lit plus page par page.');
  return { pages, sousVues };
}

function aiguillageEtChemins() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '([\w-]+)': content = \w+\(\);/gm)].map((m) => m[1]);
  if (!rendues.length) {
    throw new Error('refus : l’aiguillage de PR ne se lit plus dans pr-shell.js.');
  }
  const js = path.join(RACINE, 'public', 'modules', 'profil_risque', 'js');
  const ouvrables = new Set();
  fs.readdirSync(js).filter((f) => f.endsWith('.js')).forEach((f) => {
    const t = fs.readFileSync(path.join(js, f), 'utf8');
    for (const m of t.matchAll(/navigateTo\(\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
    for (const m of t.matchAll(/currentPage\s*=\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
  });
  return { rendues, ouvrables: [...ouvrables] };
}

// ── Trois gestes retirés, et le garde qui l'atteste ──
//
// `openReunionEvaluateursList`, `openReunionEvaluateursForm` et
// `saveReunionEval` composaient un cycle de fenêtres fermé sur lui-même : la
// liste n'était appelée que par le formulaire, le formulaire que par la liste.
// Le chemin en ligne de l'onglet les avait remplacés sans qu'on les retire, et
// un garde a mesuré l'orphelinage avant qu'on en décide — il retirait du
// fichier le corps des trois fonctions, puis cherchait leurs appels dans ce qui
// restait et dans tous les autres fichiers de l'écran. Zéro.
//
// La maîtrise d'ouvrage a tranché le 4 novembre 2026 : **supprimer**. Le garde
// se retourne donc, et c'est le point qui compte — *un garde qui exige qu'un
// orphelin existe devient faux le jour où on le supprime, et l'on est tenté de
// le retirer avec le code, perdant la garantie qu'il ne revient pas.* Il exige
// maintenant l'inverse : que les trois noms n'apparaissent **nulle part** dans
// l'écran, et que le chemin qui les a remplacés y soit toujours.
function cheminParFenetreRetire() {
  const js = path.join(RACINE, 'public', 'modules', 'profil_risque', 'js');
  const noms = ['openReunionEvaluateursList', 'openReunionEvaluateursForm', 'saveReunionEval'];
  let texte = '';
  fs.readdirSync(js).filter((f) => f.endsWith('.js'))
    .forEach((f) => { texte += fs.readFileSync(path.join(js, f), 'utf8'); });
  const page = path.join(RACINE, 'public', 'modules', 'profil_risque', 'index.html');
  if (fs.existsSync(page)) texte += fs.readFileSync(page, 'utf8');
  return {
    restants: noms.filter((n) => texte.includes(n)),
    // Le chemin en ligne, qui les a remplacés : deux boutons de l'onglet, plus
    // sa déclaration. S'il disparaissait, l'écran n'aurait plus de chemin du
    // tout vers ses comptes-rendus, et ce garde le dirait.
    enLigne: (texte.match(/reunionEvalEditInline\(/g) || []).length,
  };
}

// ── La page « Plans », retirée ──
//
// Rendue par l'aiguillage, ouverte par rien, et déclarée sans chemin depuis la
// première suite de PR. Retirée le 4 novembre 2026 sur décision. Le garde
// atteste sa disparition **de ses trois côtés** — le fichier, le cas de
// l'aiguillage, la balise de script — parce qu'en laisser un seul derrière
// soi, c'est laisser revenir la page sans que rien ne le dise.
function pagePlansRetiree() {
  const racine = path.join(RACINE, 'public', 'modules', 'profil_risque');
  const shell = fs.readFileSync(path.join(racine, 'js', 'pr-shell.js'), 'utf8');
  const page = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
  const js = fs.readdirSync(path.join(racine, 'js')).filter((f) => f.endsWith('.js'));
  return {
    fichier: js.includes('pr-plans.js'),
    cas: /case 'plans'/.test(shell),
    script: /pr-plans\.js/.test(page),
    facette: js.some((f) => fs.readFileSync(path.join(racine, 'js', f), 'utf8')
      .includes('_planFilters')),
  };
}

module.exports = async function profilRisqueNavigateurSmoke(port) {
  console.log('\n── PR : l’écran « Profil de Risque » dans un navigateur ──');
  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    // Délai de protocole : voir la raison dans `surv.smoke.js` (n° 5.f.30) —
    // une campagne de huit suites de navigateur a dépassé le défaut.
    navigateur = await puppeteer.launch({
      headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1440, height: 900 });

    let pr = false;
    let etape = 'montage';

    // Le mécanisme des refus déclarés vit dans le harnais (n° 5.f.60) : il sert
    // à plusieurs suites, et une copie par suite aurait divergé.
    const refusDeclares = refusAttendus();

    page.on('console', (m) => {
      if (pr && m.type() === 'error' && !refusDeclares.bruit(m.text())) {
        incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
      }
    });
    page.on('pageerror', (e) => {
      if (pr) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (pr) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    page.on('response', (r) => {
      if (!pr || r.status() < 400) return;
      if (refusDeclares.attendu(r.status(), r.url())) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    pr = true;
    await page.goto(`${srv.base}/modules/profil_risque/index.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('pageContent');
        return el && el.textContent.trim().length > 200;
      }, { timeout: 20000 },
    ).catch(() => {});

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('pageContent') || { textContent: '' }).textContent.trim().length,
      retour: document.querySelectorAll('.oasis-back-btn').length,
      mort: document.querySelectorAll('.btn-back-portal').length,
    }));
    verifier('l’écran PR se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200
      && monte.retour === 1 && monte.mort === 0, JSON.stringify(monte));

    let nav = { pages: [], sousVues: [] };
    let refus = null;
    try { nav = navDeclaree(); } catch (e) { refus = e.message; }
    const manquantes = nav.pages.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !nav.pages.includes(p));
    verifier('la barre de PR porte exactement les pages que la source déclare',
      !refus && nav.pages.length > 0 && !manquantes.length && !inattendues.length,
      refus || `${nav.pages.length} pages, ${nav.sousVues.length} sous-vues déclarées`
        + `${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    let aig = null;
    let refusAig = null;
    try { aig = aiguillageEtChemins(); } catch (e) { refusAig = e.message; }
    if (refusAig) {
      verifier('toute page de PR que l’aiguillage rend est atteignable', false, refusAig);
    } else {
      const nonDeclarees = aig.rendues
        .filter((p) => !nav.pages.includes(p) && !aig.ouvrables.includes(p))
        .filter((p) => !PAGES_SANS_CHEMIN[p]);
      verifier('toute page de PR est atteignable, ou déclarée sans chemin',
        nonDeclarees.length === 0,
        nonDeclarees.length ? `sans chemin et non déclarée(s) : ${nonDeclarees.join(', ')}`
          : `${aig.rendues.length} cas rendus, ${Object.keys(PAGES_SANS_CHEMIN).length} déclarée(s)`
            + ` sans chemin : ${Object.keys(PAGES_SANS_CHEMIN).join(', ')}`);
    }

    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const ouvrir = (cle) => page.evaluate(
      (c) => document.querySelector(`.nav-btn[data-page="${c}"]`)?.click(), cle,
    );
    const vues = {};
    for (const cle of monte.pages) {
      etape = cle;
      /* eslint-disable no-await-in-loop */
      await ouvrir(cle);
      await attendre(2500);
      vues[cle] = await page.evaluate(() => {
        const z = document.getElementById('pageContent');
        return {
          longueur: z ? z.textContent.trim().length : 0,
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          empreinte: z ? `${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}` : '',
          sousOnglets: document.querySelectorAll('.sub-nav-btn').length,
        };
      });
    }
    etape = 'pages';
    // ── Le seuil est le plancher **mesuré**, non un chiffre choisi ──
    //
    // « Bibliothèque » rend 203 caractères : le bac n'a aucun document, et la
    // page n'affiche que son cadre et son invite. Exiger 200 comme sur les
    // autres écrans tiendrait à trois caractères près — un seuil qui tient par
    // chance ne tient pas. On exige donc un contenu **non trivial** (120), et
    // l'on dit pourquoi.
    const maigres = Object.entries(vues).filter(([, v]) => v.longueur < 120)
      .map(([c, v]) => `${c}=${v.longueur}`);
    verifier('chaque page de PR se remplit', maigres.length === 0,
      maigres.length ? `trop maigres : ${maigres.join(', ')}`
        : Object.entries(vues).map(([c, v]) => `${c}=${v.longueur}`).join(' '));
    const emp = Object.entries(vues).map(([c, v]) => [c, v.empreinte]);
    const jumelles = [];
    for (let i = 0; i < emp.length; i += 1) {
      for (let j = i + 1; j < emp.length; j += 1) {
        if (emp[i][1] === emp[j][1]) jumelles.push(`${emp[i][0]}=${emp[j][0]}`);
      }
    }
    verifier('les pages de PR diffèrent les unes des autres',
      jumelles.length === 0, jumelles.join(', ') || `${emp.length} pages distinctes`);
    const debordantes = Object.entries(vues).filter(([, v]) => v.debord > 0)
      .map(([c, v]) => `${c}=${v.debord}px`);
    verifier('aucune page de PR ne déborde à droite',
      debordantes.length === 0, debordantes.join(', ') || 'aucun débordement');

    // ── Les sous-vues déclarées, parcourues ──
    //
    // Deux pages en portent en barre horizontale ; les paramètres les prennent
    // en bande latérale. Le contrôle vérifie que chaque sous-vue **rend autre
    // chose** — et sur ce qu'elle tabule, non sur le haut de la page, qui est
    // commun à toutes (la leçon de 5.f.14).
    etape = 'sous-vues';
    const sousVues = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const z = () => document.getElementById('pageContent');
      const empreinte = () => `${z().textContent.trim().length}:${z().querySelectorAll('[onclick]').length}`;
      for (const cle of ['evaluations', 'profils']) {
        document.querySelector(`.nav-btn[data-page="${cle}"]`)?.click();
        /* eslint-disable no-await-in-loop */
        await a(2500);
        const onglets = [...document.querySelectorAll('.sub-nav-btn')]
          .map((b) => b.getAttribute('onclick'));
        const empreintes = [];
        for (const o of onglets) {
          [...document.querySelectorAll('.sub-nav-btn')]
            .find((b) => b.getAttribute('onclick') === o)?.click();
          await a(2000);
          empreintes.push(empreinte());
        }
        r[cle] = { onglets: onglets.length, distincts: new Set(empreintes).size };
      }
      return r;
    });
    verifier('les sous-vues des évaluations et des profils rendent chacune leur contenu',
      (sousVues.evaluations || {}).onglets >= 2
      && sousVues.evaluations.distincts === sousVues.evaluations.onglets
      && (sousVues.profils || {}).onglets >= 3
      && sousVues.profils.distincts === sousVues.profils.onglets,
      JSON.stringify(sousVues));

    // ── Les gestes de chaque page ──
    etape = 'gestes';
    const gestes = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const modal = () => (document.getElementById('appModal') || { innerHTML: '' }).innerHTML.length;
      const slicer = () => (document.getElementById('prSlicer') || { innerHTML: '' }).innerHTML.length;
      const z = () => (document.getElementById('pageContent') || { textContent: '' }).textContent.trim().length;
      const page_ = async (c) => {
        document.querySelector(`.nav-btn[data-page="${c}"]`)?.click();
        await a(2500);
      };
      // ── Un élément SVG n'a pas de `click()` ──
      //
      // Le graphe des taux porte son geste sur un `<rect>`. `SVGElement`
      // n'hérite pas de `HTMLElement.click()` : l'appel lève
      // « click is not a function », et la suite entière s'arrête — ce qu'elle a
      // fait au premier passage. On dépêche donc un vrai événement, ce qui vaut
      // pour les deux familles d'éléments.
      const cliquer = (el) => {
        if (!el) return false;
        if (typeof el.click === 'function') { el.click(); return true; }
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      };
      // Tableau de bord : la sélection d'une barre du graphe des taux.
      await page_('dashboard');
      r.tdbAvant = z();
      r.barreCliquee = cliquer(document.querySelector('[onclick^="setTauxBarSelection"]'));
      await a(1600);
      r.tdbApres = z();
      // Évaluations : la fenêtre d'une nouvelle évaluation, et le détail d'une
      // évaluation existante. Rien n'est enregistré.
      await page_('evaluations');
      const nouvelle = document.querySelector('[onclick^="openNewEvalModal"]');
      r.boutonNouvelle = !!nouvelle;
      if (nouvelle) {
        cliquer(nouvelle);
        await a(2500);
        r.evalOuverte = Math.max(modal(), slicer());
        cliquer(document.querySelector('[onclick^="closeModal"], [onclick^="closeSlicer"]'));
        await a(1600);
        r.evalFermee = Math.max(modal(), slicer());
      }
      // ── L'accordéon : deux boutons, et non une bascule ──
      //
      // `expandCollapseAll(containerId, expand)` prend son sens en **argument**.
      // Les deux boutons sont donc « tout déplier » et « tout replier », et
      // cliquer deux fois le même ne revient pas en arrière — mon premier essai
      // le croyait. On les prend par leur argument.
      //
      // Et la propriété qui change est `.expanded` sur `.accordion-body`, non
      // une classe sur un `.accordion-item` qui n'existe pas : le premier essai
      // comptait 0 des deux côtés. Lu dans `toggleAccordion`.
      const ouverts = () => document.querySelectorAll('#pageContent .accordion-body.expanded').length;
      const parArgument = (vrai) => [...document.querySelectorAll('[onclick^="expandCollapseAll"]')]
        .find((b) => new RegExp(`,\\s*${vrai ? 'true' : 'false'}\\s*\\)`).test(b.getAttribute('onclick') || ''));
      r.accAvant = ouverts();
      cliquer(parArgument(true));
      await a(1800);
      r.accApres = ouverts();
      cliquer(parArgument(false));
      await a(1800);
      r.accRendu = ouverts();
      cliquer(document.querySelector('#pageContent [onclick^="toggleAccordion"]'));
      await a(1600);
      r.accUnSeul = ouverts();
      const detail = document.querySelector('[onclick^="openEvalDetail"]');
      r.boutonDetail = !!detail;
      if (detail) { cliquer(detail); await a(2800); }
      r.detail = z();
      // Paramètres : la bande latérale dans les deux sens, et ses deux
      // sous-vues — dont « Indices et seuils », celle du doublon déclaré.
      await page_('parametres');
      const lateraux = () => document.querySelectorAll('[onclick*="currentSub"]').length;
      r.lateraux = lateraux();
      cliquer(document.querySelector('[onclick^="basculerBarreParam"]'));
      await a(1700);
      r.lateralReplie = lateraux();
      cliquer(document.querySelector('[onclick^="basculerBarreParam"]'));
      await a(1700);
      r.lateralDeplie = lateraux();
      const indices = [...document.querySelectorAll('[onclick*="currentSub"]')]
        .find((b) => /indices/.test(b.getAttribute('onclick') || ''));
      r.boutonIndices = !!indices;
      if (indices) { cliquer(indices); await a(2200); }
      r.indices = z();
      // La fenêtre d'une entité du paramétrage.
      const entite = document.querySelector('[onclick^="openEntityModal"]');
      if (entite) {
        cliquer(entite);
        await a(2500);
        r.entiteOuverte = Math.max(modal(), slicer());
        cliquer(document.querySelector('[onclick^="closeModal"], [onclick^="closeSlicer"]'));
        await a(1600);
        r.entiteFermee = Math.max(modal(), slicer());
      }
      return r;
    });
    verifier('les gestes de lecture de PR répondent sans vider leur page',
      gestes.tdbApres > 200 && gestes.detail > 200, JSON.stringify({
        tdb: [gestes.tdbAvant, gestes.tdbApres], detail: gestes.detail }));
    verifier('l’accordéon des évaluations se déplie et se replie, et un seul se bascule',
      gestes.accApres > gestes.accAvant && gestes.accRendu === 0
      && gestes.accUnSeul === 1,
      JSON.stringify({ avant: gestes.accAvant, apres: gestes.accApres,
        rendu: gestes.accRendu, unSeul: gestes.accUnSeul }));
    verifier('les fenêtres de PR s’ouvrent garnies et se referment par leur geste',
      gestes.boutonNouvelle === true && gestes.evalOuverte > 200 && gestes.evalFermee === 0,
      JSON.stringify({ evaluation: [gestes.evalOuverte, gestes.evalFermee],
        entite: [gestes.entiteOuverte, gestes.entiteFermee] }));
    verifier('la bande latérale des paramètres se replie, et « Indices et seuils » se rend',
      gestes.lateraux > 0 && gestes.lateralDeplie === gestes.lateraux
      && gestes.boutonIndices === true && gestes.indices > 200,
      JSON.stringify({ lateraux: gestes.lateraux, replie: gestes.lateralReplie,
        deplie: gestes.lateralDeplie, indices: gestes.indices }));

    // ══════════════════════════════════════════════════════════════════
    //  L'aperçu des profils : trois vues, leurs filtres, deux graphiques
    // ══════════════════════════════════════════════════════════════════
    //
    // La page « Profils » porte tout ce que PR donne à voir d'un coup d'œil :
    // trois vues emboîtées — par domaine, par secteur, par prestataire —, une
    // barre de filtres, un diagramme en barres et une courbe de tendance, et des
    // cartes d'indicateur qui ouvrent le détail. Dix-huit gestes, et aucun
    // n'était exercé.
    //
    // La règle qui tient la page : *un filtre que la vue courante désactive est
    // vidé.* La vue par domaine désactive le secteur et le prestataire, celle par
    // secteur le prestataire.
    //
    // Et le dispositif l'applique par **deux chemins redondants**, comme la
    // cascade des sous-activités de PLAN (n° 5.f.47) : `setVueApercu` vide au
    // changement de vue, et la barre de filtres vide **à chaque rendu** selon la
    // vue courante (`if (secOff && f.secteur) f.secteur = '';`).
    //
    // Chacun suffit, et c'est pourquoi ni l'un ni l'autre désarmé seul ne fait
    // rien tomber : il faut les retirer **tous les deux** pour que le
    // contre-essai morde. J'ai cru deux fois à un contrôle inerte avant de
    // revoir cette leçon — *une règle tenue deux fois ne se contre-essaie pas
    // une fois.*
    //
    // On la mesure sur un état **garni** — la leçon des filtres de PLAN.
    etape = 'aperçu des profils';
    await ouvrir('profils');
    await attendre(2800);
    const rondeProfils = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const F = () => window._profilFilters || {};
      // Une facette se vise par ce qu'elle écrit : elle n'a pas d'identifiant.
      const facette = (cle) => [...document.querySelectorAll('select')]
        .find((s) => (s.getAttribute('onchange') || '').includes(`${cle}=this.value`));
      const regler = async (cle, attente) => {
        const s = facette(cle);
        if (!s) return { trouvee: false };
        const c = [...s.options].find((op) => op.value);
        if (!c) return { trouvee: true, offre: false, options: s.options.length };
        s.value = c.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        await a(attente || 1800);
        return { trouvee: true, offre: true, pose: c.value };
      };
      const vue = (id) => document.querySelector(`[onclick*="setVueApercu('${id}')"]`);
      // ── Chercher la sous-vue qui porte le geste, plutôt que la supposer ──
      //
      // La page « Profils » a trois sous-vues — actifs, individuel, archives —
      // et chaque geste n'existe que dans l'une. Mon premier jet les cherchait
      // tous sur celle qui s'ouvre par défaut : quatre contrôles rouges pour une
      // structure que la source déclare.
      // Et la recherche ne s'arrête pas à la page courante : `_dashBarChart` et
      // `_dashTrend` portent leur lieu dans leur nom — le tableau de bord —, et
      // mon premier jet les cherchait sur les profils. On parcourt donc les
      // pages de la barre, puis les sous-vues de chacune.
      const allerOu = async (selecteur) => {
        if (document.querySelector(selecteur)) return { deja: true };
        const essayerLesSousVues = async (page) => {
          const onglets = [...document.querySelectorAll('.sub-nav-btn')];
          for (const b of onglets) {
            /* eslint-disable no-await-in-loop */
            b.click();
            await a(2200);
            if (document.querySelector(selecteur)) {
              return { page, sousVue: (b.textContent || '').trim().slice(0, 24) };
            }
          }
          return null;
        };
        const ici = await essayerLesSousVues('(courante)');
        if (ici) return ici;
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          await a(2500);
          if (document.querySelector(selecteur)) return { page: p };
          const dansUneSousVue = await essayerLesSousVues(p);
          if (dansUneSousVue) return dansUneSousVue;
        }
        return { introuvable: true, pages: pages.length };
      };

      // ── 1. Les filtres de l'aperçu, et la cascade des vues ──
      await essai('vues', async () => {
        const d = {};
        d.ou = await allerOu('.apercu-tab');
        d.onglets = document.querySelectorAll('.apercu-tab').length;
        d.vueDepart = window._profilVue;
        // On garnit : la vue par prestataire offre les trois facettes.
        vue('prestataire')?.click();
        await a(2200);
        d.vuePrestataire = window._profilVue === 'prestataire';
        d.domaine = await regler('window._profilFilters.domaine', 2000);
        d.secteur = await regler('window._profilFilters.secteur', 2000);
        d.prestataire = await regler('window._profilFilters.prestataire', 2000);
        d.garni = {
          domaine: F().domaine || '', secteur: F().secteur || '',
          prestataire: F().prestataire || '',
        };
        d.troisPoses = Object.values(d.garni).filter(Boolean).length;

        // La vue par secteur désactive le prestataire : elle le vide.
        vue('secteur')?.click();
        await a(2200);
        d.apresSecteur = {
          vue: window._profilVue, domaine: F().domaine || '',
          secteur: F().secteur || '', prestataire: F().prestataire || '',
        };
        // La vue par domaine désactive les deux autres.
        vue('domaine')?.click();
        await a(2200);
        d.apresDomaine = {
          vue: window._profilVue, domaine: F().domaine || '',
          secteur: F().secteur || '', prestataire: F().prestataire || '',
        };
        // Et la réinitialisation, qui remplace l'objet entier.
        const reset = document.querySelector('[onclick*="window._profilFilters={"]');
        d.boutonReset = !!reset;
        if (!reset) {
          await regler('window._profilFilters.domaine', 1800);
        }
        d.avantReset = F().domaine || '';
        reset?.click();
        await a(2000);
        d.toutVide = ['domaine', 'secteur', 'prestataire']
          .every((k) => (F()[k] || '') === '');
        return d;
      });

      // ── 2. Le profil d'un prestataire, et le retour ──
      await essai('profilDetaille', async () => {
        const d = {};
        d.ou = await allerOu('.apercu-tab');
        vue('prestataire')?.click();
        await a(2500);
        d.ouLigne = await allerOu('[onclick*="ouvrirProfilPrestataire("]');
        const ligne = document.querySelector('[onclick*="ouvrirProfilPrestataire("]');
        d.ligne = !!ligne;
        if (!ligne) return d;
        const id = (/ouvrirProfilPrestataire\('([^']+)'/.exec(ligne.getAttribute('onclick') || '') || [])[1];
        d.identifiant = !!id;
        ligne.click();
        await a(2800);
        d.filtrePose = (F().prestataire || '') === id;
        const retour = document.querySelector('[onclick*="retourVuePrestataires"]');
        d.boutonRetour = !!retour;
        retour?.click();
        await a(2500);
        d.filtreLeve = (F().prestataire || '') === '';
        d.vueRendue = window._profilVue === 'prestataire';
        return d;
      });

      // ── 3. Le diagramme en barres et la courbe de tendance ──
      await essai('graphiques', async () => {
        const d = {};
        d.ou = await allerOu('[onchange*="window._dashBarChart.mode"]');
        await a(1200);
        // Le diagramme : son mode et sa mesure.
        d.barAvant = { ...(window._dashBarChart || {}) };
        d.barMode = await regler('window._dashBarChart.mode', 1800);
        d.barModePose = d.barMode.offre
          ? (window._dashBarChart || {}).mode === d.barMode.pose : null;
        d.barMetric = await regler('window._dashBarChart.metric', 1800);
        d.barMetricPose = d.barMetric.offre
          ? (window._dashBarChart || {}).metric === d.barMetric.pose : null;
        const barReset = document.querySelector('[onclick*="window._dashBarChart={"]');
        d.barReset = !!barReset;
        barReset?.click();
        await a(1800);
        d.barRendu = (window._dashBarChart || {}).mode === 'secteur'
          && (window._dashBarChart || {}).metric === 'conf';

        // La courbe : son mode, sa mesure, et ses deux bornes de date.
        d.trendMode = await regler('window._dashTrend.mode', 1800);
        d.trendModePose = d.trendMode.offre
          ? (window._dashTrend || {}).mode === d.trendMode.pose : null;
        d.trendMetric = await regler('window._dashTrend.metric', 1800);
        d.trendMetricPose = d.trendMetric.offre
          ? (window._dashTrend || {}).metric === d.trendMetric.pose : null;
        const borne = (cle, valeur) => {
          const e = [...document.querySelectorAll('input')]
            .find((x) => (x.getAttribute('onchange') || '').includes(`window._dashTrend.${cle}=this.value`));
          if (!e) return false;
          e.value = valeur;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        d.borneDebut = borne('start', '2026-01-01');
        await a(1800);
        d.borneFin = borne('end', '2026-12-31');
        await a(1800);
        d.bornes = {
          start: (window._dashTrend || {}).start, end: (window._dashTrend || {}).end,
        };
        const trendReset = document.querySelector('[onclick*="window._dashTrend={"]');
        d.trendReset = !!trendReset;
        trendReset?.click();
        await a(1800);
        d.trendRendu = (window._dashTrend || {}).mode === 'prestataire'
          && (window._dashTrend || {}).start === '';
        return d;
      });

      // ── 4. Les cartes d'indicateur, et la barre des sous-activités ──
      await essai('cartes', async () => {
        const d = {};
        // ── Le profil individuel exige un prestataire retenu ──
        //
        // « Required selection: prestataire », dit la source : les cartes
        // n'existent que dans la vue « par prestataire », et seulement quand
        // l'un est choisi. La phase précédente a navigué ailleurs et levé le
        // filtre — *une ronde qui suit une autre commence par relever ce qu'elle
        // hérite.* On le repose donc avant de chercher.
        document.querySelector('.nav-btn[data-page="profils"]')?.click();
        await a(2800);
        d.ouLigne = await allerOu('[onclick*="ouvrirProfilPrestataire("]');
        vue('prestataire')?.click();
        await a(2200);
        const ligne = document.querySelector('[onclick*="ouvrirProfilPrestataire("]');
        d.prestataireChoisi = !!ligne;
        ligne?.click();
        await a(3000);
        d.filtre = (window._profilFilters || {}).prestataire || '';
        d.ou = await allerOu('[onclick*="openIndividualIndicator("]');
        const carte = document.querySelector('[onclick*="openIndividualIndicator("]');
        d.carte = !!carte;
        if (carte) {
          const avant = document.querySelectorAll('.pr-slicer, .modal-overlay').length;
          carte.click();
          await a(2800);
          d.volet = document.querySelectorAll('.pr-slicer, .modal-overlay').length > avant;
          document.querySelector('[onclick*="closeSlicer"]')?.click();
          await a(1500);
        }
        const groupe = document.querySelector('[onclick*="openIndividualGroup("]');
        d.groupe = !!groupe;
        if (groupe) {
          groupe.click();
          await a(2800);
          d.voletGroupe = document.querySelectorAll('.pr-slicer, .modal-overlay').length > 0;
          document.querySelector('[onclick*="closeSlicer"]')?.click();
          await a(1500);
        }
        return d;
      });

      // ── 5. La barre des sous-activités, qui vit sur le tableau de bord ──
      //
      // `setSABarSelection` est rendu par `_prStatsSousActivites`, que
      // `renderStatistiques` porte — et c'est le **tableau de bord** qui appelle
      // cette dernière, non les profils. Un graphique SVG, dont chaque barre est
      // cliquable.
      await essai('barreSA', async () => {
        const d = {};
        // ── Le second graphique ne paraît qu'avec une barre du premier ──
        //
        // `if (window._dashBarChart && window._dashBarChart.selected)` : le
        // graphique des sous-activités n'existe que lorsqu'une barre du
        // diagramme des taux est retenue. Ma phase précédente l'avait effacée en
        // réinitialisant le diagramme — et cherchait ensuite un graphique
        // qu'elle venait de faire disparaître. Sélectionner un secteur fait
        // paraître ses sous-activités : c'est une **chaîne** de deux gestes.
        d.ouTaux = await allerOu('[onclick*="setTauxBarSelection("]');
        const taux = [...document.querySelectorAll('[onclick*="setTauxBarSelection("]')];
        d.barresTaux = taux.length;
        d.saAvant = document.querySelectorAll('[onclick*="setSABarSelection("]').length;
        // ── Un élément SVG ne se clique pas comme un bouton ──
        //
        // `SVGElement` n'hérite pas de `HTMLElement.click()` : l'appel lève
        // « click is not a function ». Les barres d'un graphique sont des
        // `<rect>` et des `<text>` — on leur dispatche un vrai événement de
        // souris, ce qui est d'ailleurs plus près du geste.
        const cliquer = (el) => el.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
        );
        if (taux.length) {
          cliquer(taux[0]);
          await a(2500);
        }
        d.selectionTaux = (window._dashBarChart || {}).selected || '';
        const barres = [...document.querySelectorAll('[onclick*="setSABarSelection("]')];
        d.barres = barres.length;
        if (!barres.length) return d;
        const avant = (window._dashBarChart || {}).selectedSA || '';
        // Une barre qui n'est pas déjà retenue : la retenir ne prouve rien si
        // elle l'était.
        const cible = barres.find((b) => {
          const id = (/setSABarSelection\('([^']*)'/.exec(b.getAttribute('onclick') || '') || [])[1];
          return id && id !== avant;
        }) || barres[0];
        const id = (/setSABarSelection\('([^']*)'/.exec(cible.getAttribute('onclick') || '') || [])[1];
        d.cible = !!id;
        d.avant = avant;
        cliquer(cible);
        await a(2200);
        d.retenue = (window._dashBarChart || {}).selectedSA;
        d.posee = d.retenue === id;
        return d;
      });
      return o;
    });

    {
      const P = rondeProfils;
      const Vu = P.vues || {};
      const Pd = P.profilDetaille || {};
      const Gr = P.graphiques || {};
      const Ca = P.cartes || {};
      const Ba = P.barreSA || {};
      verifier('un filtre que la vue courante désactive est vidé, par le changement de vue comme par chaque rendu de la barre',
        Vu.onglets === 3 && Vu.vuePrestataire === true
        // L'état est garni d'abord : sans cela la cascade se mesurerait sur rien.
        && Vu.troisPoses >= 2
        // La vue par secteur vide le prestataire, et garde le reste.
        && Vu.apresSecteur.vue === 'secteur'
        && Vu.apresSecteur.prestataire === ''
        && Vu.apresSecteur.secteur === Vu.garni.secteur
        // La vue par domaine vide le secteur et le prestataire.
        && Vu.apresDomaine.vue === 'domaine'
        && Vu.apresDomaine.secteur === '' && Vu.apresDomaine.prestataire === ''
        && Vu.apresDomaine.domaine === Vu.garni.domaine,
        JSON.stringify(Vu).slice(0, 460));
      verifier('la réinitialisation de l’aperçu vide ses trois facettes',
        Vu.boutonReset === true && Vu.toutVide === true,
        JSON.stringify({ bouton: Vu.boutonReset, avant: Vu.avantReset, vide: Vu.toutVide }));
      verifier('une ligne de l’aperçu ouvre le profil d’un prestataire, et le bouton de retour le quitte',
        Pd.ligne === true && Pd.identifiant === true
        && Pd.filtrePose === true
        && Pd.boutonRetour === true && Pd.filtreLeve === true
        && Pd.vueRendue === true,
        JSON.stringify(Pd));
      verifier('le diagramme et la courbe retiennent leur mode, leur mesure et leurs bornes, et chacun se rend par son geste',
        // Le diagramme en barres.
        Gr.barMode.offre === true && Gr.barModePose === true
        && Gr.barMetric.offre === true && Gr.barMetricPose === true
        && Gr.barReset === true && Gr.barRendu === true
        // La courbe de tendance, et ses deux bornes de date.
        && Gr.trendMode.offre === true && Gr.trendModePose === true
        && Gr.trendMetric.offre === true && Gr.trendMetricPose === true
        && Gr.borneDebut === true && Gr.borneFin === true
        && Gr.bornes.start === '2026-01-01' && Gr.bornes.end === '2026-12-31'
        && Gr.trendReset === true && Gr.trendRendu === true,
        JSON.stringify(Gr).slice(0, 460));
      verifier('les cartes d’indicateur et de groupe ouvrent leur volet, et la barre des sous-activités retient son choix',
        // Le profil individuel n'existe qu'avec un prestataire retenu.
        Ca.prestataireChoisi === true && Ca.filtre !== ''
        && Ca.carte === true && Ca.volet === true
        && Ca.groupe === true && Ca.voletGroupe === true,
        JSON.stringify(Ca));
      verifier('une barre du diagramme des taux fait paraître celui des sous-activités, dont chaque barre retient la sienne',
        // Le premier geste : une barre des taux, et le second graphique naît.
        Ba.barresTaux >= 1 && Ba.saAvant === 0
        && Ba.selectionTaux !== ''
        // Le second : une barre des sous-activités, et elle est retenue.
        && Ba.barres >= 1 && Ba.cible === true
        && Ba.posee === true && Ba.retenue !== Ba.avant,
        JSON.stringify(Ba));
    }


    // ══════════════════════════════════════════════════════════════════
    //  La fiche d'évaluation : ses onglets, ses notes, son enregistrement
    // ══════════════════════════════════════════════════════════════════
    //
    // Le cœur du module. `pr-evaluation-fiche.js` fait **1 825 lignes et
    // vingt-quatre gestes nommés**, le plus gros fichier de PR — et quatre gestes
    // seulement étaient exercés, tous par la simple ouverture du volet.
    //
    // La fiche s'ouvre en volet latéral, porte cinq onglets pour un validateur
    // (un sixième, « Réunion prestataire », n'apparaît qu'une fois l'évaluation
    // acceptée), et se ferme sur un pied qui change avec le statut.
    //
    // ── Ce que le jeu de référence offre, et ce qu'il n'offre pas ──
    //
    // Cinq évaluations : trois **validées**, une **rejetée**, une **brouillon**
    // sans aucune note. C'est celle-là qui porte la saisie : les quatre autres
    // sont en lecture seule (`isReadonly` sur `valide`, `cloturee`, `rejetee`).
    // On la cherche donc par son statut, et non par son rang dans la liste.
    //
    // ── Les trois règles éprouvées ici ──
    //
    //  1. **Changer d'onglet ne perd pas une saisie non enregistrée.**
    //     `switchEvalTab` relit les sept champs libres, les cases d'évaluateur
    //     désigné et le nombre minimal **avant** de rendre à nouveau la fiche.
    //     Sans cela, le rendu les écraserait par ce que porte le magasin.
    //  2. **Une note recliquée s'efface.** `setScore` compare la valeur posée à
    //     celle demandée : égales, elle retire la clé. C'est une bascule, non une
    //     affectation — et la somme vivante suit dans les deux sens.
    //  3. **Le bouton de soumission ne s'arme qu'au rendu suivant.** `setScore`
    //     n'appelle que `refreshEvalTotals`, qui met à jour les bandeaux ; le pied
    //     n'est reconstruit que par `openEvalDetail`. Noter les trois familles ne
    //     suffit donc pas à voir le bouton actif : il faut un changement
    //     d'onglet. Mesuré, et non supposé — le contrôle relève les deux états.
    etape = 'fiche d’évaluation';
    await ouvrir('evaluations');
    await attendre(2800);
    const TEMOIN = 'témoin de saisie non enregistrée — ' + Date.now();
    const fiche = await page.evaluate(async (temoin) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const corps = () => document.querySelector('.pr-slicer-body');
      const pied = () => [...document.querySelectorAll('.pr-slicer-footer button')]
        .map((b) => ({ geste: b.getAttribute('onclick') || '', eteint: !!b.disabled }));
      const onglet = (id) => [...document.querySelectorAll('.eval-tab-btn')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`,'${id}')`));
      const ev = () => (window.APP_STATE.data.evaluations || [])
        .find((e) => e.id === o.identifiant);

      // ── 1. Ouvrir la fiche du brouillon, et parcourir ses onglets ──
      await essai('onglets', async () => {
        const d = {};
        const brouillon = (window.APP_STATE.data.evaluations || [])
          .find((e) => e.statut === 'brouillon');
        d.brouillonTrouve = !!brouillon;
        if (!brouillon) return d;
        o.identifiant = brouillon.id;
        const bouton = [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(brouillon.id));
        d.boutonTrouve = !!bouton;
        if (!bouton) return d;
        bouton.click();
        await a(3000);
        d.volet = !!corps();
        const onglets = [...document.querySelectorAll('.eval-tab-btn')]
          .map((b) => (/,'([\w]+)'\)/.exec(b.getAttribute('onclick') || '') || [])[1])
          .filter(Boolean);
        d.onglets = onglets;
        // « Réunion prestataire » n'existe qu'à partir de l'acceptation : son
        // absence sur un brouillon est la règle, non un manque.
        d.reunionPrestAbsente = !onglets.includes('reunion_prestataire');
        const empreintes = [];
        for (const id of onglets) {
          /* eslint-disable no-await-in-loop */
          onglet(id)?.click();
          await a(2600);
          const z = corps();
          empreintes.push(z ? `${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}` : 'absent');
        }
        d.empreintes = empreintes;
        d.distinctes = new Set(empreintes).size;
        return d;
      });

      // ── 2. Une saisie non enregistrée survit au changement d'onglet ──
      await essai('saisie', async () => {
        const d = {};
        onglet('generalites')?.click();
        await a(2600);
        const champ = document.getElementById('genIntroduction');
        d.champ = !!champ;
        if (!champ) return d;
        // Le code lit `ta.value` : on le pose, et l'on dit qu'on le pose.
        champ.value = temoin;
        // Les deux autres pièces que `switchEvalTab` recueille.
        const nbMin = document.getElementById('evalNbMin');
        d.nbMin = !!nbMin;
        if (nbMin) nbMin.value = '7';
        const caseDesigne = document.querySelector('input.eval-designe-cb');
        d.caseDesigne = !!caseDesigne;
        d.designeAvant = caseDesigne ? caseDesigne.checked : null;
        if (caseDesigne) caseDesigne.checked = !caseDesigne.checked;
        // L'aller — et le retour.
        onglet('conformite')?.click();
        await a(2600);
        d.partiPourConformite = !document.getElementById('genIntroduction');
        onglet('generalites')?.click();
        await a(2600);
        const revenu = document.getElementById('genIntroduction');
        d.rendu = revenu ? revenu.value : null;
        d.tenue = d.rendu === temoin;
        const nbRevenu = document.getElementById('evalNbMin');
        d.nbTenu = nbRevenu ? nbRevenu.value === '7' : null;
        const caseRevenue = document.querySelector('input.eval-designe-cb');
        d.designeTenu = caseRevenue ? caseRevenue.checked === !d.designeAvant : null;
        // Et dans l'état du module, non seulement à l'écran.
        d.enMemoire = (ev().generalites || {}).introduction === temoin;
        d.nbEnMemoire = ev().nb_evaluateurs_min;
        return d;
      });

      // ── 3. Une note se pose, se compte, et se retire d'un second clic ──
      await essai('notes', async () => {
        const d = {};
        onglet('conformite')?.click();
        await a(2800);
        const lire = (id) => (document.getElementById(id) || {}).textContent;
        const bouton = document.querySelector('.score-btn:not([disabled])');
        d.boutonTrouve = !!bouton;
        if (!bouton) return d;
        const appel = bouton.getAttribute('onclick') || '';
        const m = /setScore\('[^']*','([^']*)','([^']*)',(\d)/.exec(appel);
        d.appelLu = !!m;
        if (!m) return d;
        const [, champ, cle, valeur] = m;
        d.champ = champ; d.valeur = Number(valeur);
        d.avant = { note: (ev()[champ] || {})[cle], somme: lire('evalSumConf'), compte: lire('evalCntConf'), taux: lire('evalTauxConf') };
        bouton.click();
        await a(1600);
        d.apres = { note: (ev()[champ] || {})[cle], somme: lire('evalSumConf'), compte: lire('evalCntConf'), taux: lire('evalTauxConf') };
        d.classeActive = /active-/.test(bouton.className);
        // Le second clic sur la **même** valeur : la bascule.
        bouton.click();
        await a(1600);
        d.rendu = { note: (ev()[champ] || {})[cle], somme: lire('evalSumConf'), compte: lire('evalCntConf') };
        d.cleRetiree = !Object.prototype.hasOwnProperty.call(ev()[champ] || {}, cle);
        // On repose la note pour la suite, puis on en pose une de performance et
        // une de complexité : les trois familles notées arment la soumission.
        bouton.click();
        await a(1400);
        d.reposee = (ev()[champ] || {})[cle] === Number(valeur);
        d.piedAvantRendu = pied();
        for (const tab of ['performance', 'complexite']) {
          onglet(tab)?.click();
          await a(2800);
          const b = document.querySelector('.score-btn:not([disabled])');
          if (b) { b.click(); await a(1500); }
          d[tab] = !!b;
        }
        d.trois = {
          conf: Object.keys(ev().notes_conf || {}).length,
          perf: Object.keys(ev().notes_perf || {}).length,
          comp: Object.keys(ev().notes_comp || {}).length,
        };
        // Le pied n'a pas été reconstruit depuis : il est encore éteint.
        d.piedAvant = pied();
        onglet('generalites')?.click();
        await a(2800);
        d.piedApres = pied();
        const nom = (p) => (p.find((b) => /soumettreDirecteur/.test(b.geste)) || {});
        d.soumissionAvant = nom(d.piedAvant).eteint;
        d.soumissionApres = nom(d.piedApres).eteint;
        return d;
      });

      // ── 4. L'enregistrement : ce que le serveur rend ensuite ──
      //
      // `saveEvalScores` recharge tout depuis le serveur et rouvre la fiche. Lire
      // l'état du module **après** le geste, c'est donc lire ce que le serveur a
      // gardé — et non ce que la page croyait tenir.
      await essai('enregistrement', async () => {
        const d = {};
        const bouton = [...document.querySelectorAll('.pr-slicer-footer button')]
          .find((b) => /saveEvalScores/.test(b.getAttribute('onclick') || ''));
        d.bouton = !!bouton;
        if (!bouton) return d;
        const avant = {
          conf: Object.keys(ev().notes_conf || {}).length,
          intro: (ev().generalites || {}).introduction || '',
        };
        d.avant = avant;
        bouton.click();
        await a(5000);
        const apres = ev();
        d.rechargee = !!apres;
        d.conf = Object.keys(apres.notes_conf || {}).length;
        d.perf = Object.keys(apres.notes_perf || {}).length;
        d.comp = Object.keys(apres.notes_comp || {}).length;
        d.intro = (apres.generalites || {}).introduction || '';
        d.introTenue = d.intro === temoin;
        d.nbMin = apres.nb_evaluateurs_min;
        // Les résultats calculés : l'enregistrement les écrit aussi.
        d.resultats = {
          global: !!(apres.resultats && apres.resultats.global),
          idc: ((apres.resultats || {}).global || {}).idc_g,
          csrbo: ((apres.resultats || {}).global || {}).csrbo,
          sousActivites: Object.keys(((apres.resultats || {}).sousActivites) || {}).length,
        };
        d.voletOuvert = !!corps();
        return d;
      });
      return o;
    }, TEMOIN);

    {
      const On = fiche.onglets || {};
      const Sa = fiche.saisie || {};
      const No = fiche.notes || {};
      const En = fiche.enregistrement || {};
      verifier('la fiche du brouillon s’ouvre et ses cinq onglets rendent chacun son contenu',
        On.brouillonTrouve === true && On.boutonTrouve === true && On.volet === true
        && On.onglets.length === 5 && On.reunionPrestAbsente === true
        && On.distinctes === On.onglets.length,
        JSON.stringify(On).slice(0, 400));
      verifier('changer d’onglet ne perd ni la saisie, ni les cases d’évaluateur, ni le nombre minimal',
        Sa.champ === true && Sa.nbMin === true && Sa.caseDesigne === true
        // L'onglet a bien été quitté : sans cela on relirait le même DOM.
        && Sa.partiPourConformite === true
        && Sa.tenue === true && Sa.nbTenu === true && Sa.designeTenu === true
        && Sa.enMemoire === true && Sa.nbEnMemoire === 7,
        JSON.stringify({ ...Sa, rendu: String(Sa.rendu).slice(0, 40) }));
      verifier('une note se pose avec sa somme, se retire d’un second clic, et les trois familles notées arment la soumission au rendu suivant',
        No.boutonTrouve === true && No.appelLu === true
        // Posée : la note, la somme, le compte et le taux suivent.
        && No.apres.note === No.valeur && No.apres.somme === String(No.valeur)
        && No.apres.compte === '1' && No.apres.taux !== No.avant.taux
        && No.classeActive === true
        // Retirée : la clé n'est pas mise à zéro, elle disparaît.
        && No.cleRetiree === true && No.rendu.note === undefined
        && No.rendu.somme === '0' && No.rendu.compte === '0'
        && No.reposee === true
        // Les trois familles portent chacune une note.
        && No.trois.conf >= 1 && No.trois.perf >= 1 && No.trois.comp >= 1
        // Et le bouton ne s'arme qu'une fois le pied reconstruit.
        && No.soumissionAvant === true && No.soumissionApres === false,
        JSON.stringify(No).slice(0, 520));
      verifier('l’enregistrement rend au serveur les notes, les champs libres et les résultats calculés',
        En.bouton === true && En.rechargee === true
        && En.conf >= 1 && En.perf >= 1 && En.comp >= 1
        && En.introTenue === true && En.nbMin === 7
        && En.resultats.global === true && !!En.resultats.idc
        && En.resultats.csrbo > 0 && En.resultats.sousActivites >= 1
        && En.voletOuvert === true,
        JSON.stringify(En).slice(0, 460));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le circuit d'une évaluation : soumettre, renvoyer, accepter,
    //  clôturer, valider, réévaluer
    // ══════════════════════════════════════════════════════════════════
    //
    // Six statuts, cinq transitions, et chacune gardée par une invite du socle.
    // Rien ne l'exerçait : `soumettreDirecteur`, `decisionDirecteur` et
    // `reevaluerEval` n'étaient atteints par aucun contrôle de navigateur, et le
    // pied de la fiche change entièrement d'un statut à l'autre.
    //
    // La ronde part de la fiche que la précédente a laissée : un brouillon dont
    // les trois familles portent une note, enregistré. C'est la condition du
    // bouton « Soumettre à la Validation » (n° 5.f.54).
    //
    // ── Le chemin parcouru ──
    //
    //   brouillon → soumis_directeur → (renvoyée) → soumis_directeur
    //             → acceptée → clôturée → validée → réévaluée
    //
    // Le renvoi est pris **en premier**, et pour une raison : c'est la seule
    // transition qui recule, et celle dont le motif est obligatoire. Une fois
    // l'évaluation validée, plus rien ne se rejoue.
    //
    // ── Les trois règles éprouvées ──
    //
    //  1. **Un renvoi sans motif ne part pas.** `decisionDirecteur` demande une
    //     confirmation, puis une saisie **requise** ; l'invite annulée, rien
    //     n'est envoyé et le statut ne bouge pas. Le contrôle éprouve d'abord ce
    //     refus, puis la même décision avec son motif.
    //  2. **Le commentaire par indicateur n'est saisissable qu'à la
    //     soumission.** `commentEditable` vaut `ev.statut === 'soumis_directeur'`
    //     — avant, rien ; après l'acceptation, il se lit sans se modifier.
    //     C'est le seul état où `_inlineCommentReveal` existe, et
    //     `_persistPendingComments` le porte au serveur avec la décision.
    //  3. **« Réunion prestataire » naît de l'acceptation.** L'onglet
    //     n'apparaît qu'aux statuts `acceptee`, `cloturee`, `valide` — et c'est
    //     lui, non le pied, qui porte le bouton de clôture.
    etape = 'circuit de l’évaluation';
    const MOTIF_RENVOI = 'Motif du renvoi — observations à compléter ' + Date.now();
    const COMMENTAIRE = 'Commentaire d’indicateur posé à la soumission';
    const COMMENTAIRE_ACCEPTATION = 'Acceptée par la ronde, réunion à convoquer';
    const circuit = await page.evaluate(async (motif, commentaire, commentaireAcceptation) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const corps = () => document.querySelector('.pr-slicer-body');
      const pied = () => [...document.querySelectorAll('.pr-slicer-footer button')]
        .map((b) => ({ geste: b.getAttribute('onclick') || '', eteint: !!b.disabled }));
      const geste = (motifRegex) => [...document.querySelectorAll('.pr-slicer-footer button')]
        .find((b) => motifRegex.test(b.getAttribute('onclick') || ''));
      const onglet = (id) => [...document.querySelectorAll('.eval-tab-btn')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`,'${id}')`));
      const onglets = () => [...document.querySelectorAll('.eval-tab-btn')]
        .map((b) => (/,'([\w]+)'\)/.exec(b.getAttribute('onclick') || '') || [])[1])
        .filter(Boolean);
      // L'invite de confirmation du socle.
      const oui = async (attente) => {
        await a(1100);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(attente || 3000);
        return true;
      };
      // L'invite textuelle : on la remplit, puis on valide. `requis` dit si le
      // bouton était éteint tant que le champ était vide.
      const saisir = async (texte, attente) => {
        await a(1100);
        const champ = document.querySelector('.oasis-saisie-champ');
        if (!champ) return null;
        const requis = !!(document.querySelector('.oasis-confirm-oui') || {}).disabled;
        champ.value = texte;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(500);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return null;
        const actifApres = !b.disabled;
        b.click();
        await a(attente || 3500);
        return { requis, actifApres };
      };
      const annuler = async (attente) => {
        await a(1100);
        const b = document.querySelector('.oasis-confirm-non');
        if (!b) return false;
        b.click();
        await a(attente || 2200);
        return true;
      };
      const ev = () => (window.APP_STATE.data.evaluations || [])
        .find((e) => e.id === o.identifiant);
      const statut = () => (ev() || {}).statut;
      // Rouvrir la fiche : plusieurs transitions rechargent la page sans
      // reconstruire le volet, qui montre alors un pied périmé.
      const boutonFiche = () => [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
        .find((x) => (x.getAttribute('onclick') || '').includes(o.identifiant));
      const rouvrir = async () => {
        const b = boutonFiche();
        if (!b) return false;
        b.click();
        await a(3200);
        return true;
      };
      // ── Une évaluation validée quitte la sous-vue des évaluations en cours ──
      //
      // La liste par défaut ne porte que ce qui reste à décider : validée,
      // l'évaluation passe dans une autre sous-vue. Mon premier jet la cherchait
      // là où elle venait de n'être plus, et rendait « pied vide » sur un écran
      // qui marche. On parcourt donc les pages et leurs sous-vues — la leçon de
      // 5.f.52 — jusqu'à retrouver sa fiche.
      const retrouver = async () => {
        if (boutonFiche()) return { deja: true };
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          /* eslint-disable no-await-in-loop */
          await a(2600);
          if (boutonFiche()) return { page: p };
          for (const b of [...document.querySelectorAll('.sub-nav-btn')]) {
            b.click();
            await a(2400);
            if (boutonFiche()) {
              return { page: p, sousVue: (b.textContent || '').trim().slice(0, 24) };
            }
          }
        }
        return { introuvable: true, pages: pages.length };
      };

      // ── 0. L'évaluation que la ronde précédente a notée et enregistrée ──
      await essai('depart', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="evaluations"]')?.click();
        await a(2800);
        const brouillon = (window.APP_STATE.data.evaluations || [])
          .find((e) => e.statut === 'brouillon'
            && Object.keys(e.notes_conf || {}).length > 0);
        d.trouvee = !!brouillon;
        if (!brouillon) return d;
        o.identifiant = brouillon.id;
        d.statut = brouillon.statut;
        d.notes = {
          conf: Object.keys(brouillon.notes_conf || {}).length,
          perf: Object.keys(brouillon.notes_perf || {}).length,
          comp: Object.keys(brouillon.notes_comp || {}).length,
        };
        d.ouverte = await rouvrir();
        d.piedDepart = pied().map((b) => b.geste.replace(/'[^']*'/, ''));
        return d;
      });

      // ── 1. La soumission, et le commentaire par indicateur qu'elle ouvre ──
      await essai('soumission', async () => {
        const d = {};
        const bouton = geste(/soumettreDirecteur/);
        d.bouton = !!bouton;
        d.arme = bouton ? !bouton.disabled : null;
        if (!bouton || bouton.disabled) return d;
        // Avant la soumission, aucun commentaire ne se saisit.
        onglet('conformite')?.click();
        await a(2600);
        d.reveleAvant = document.querySelectorAll('[onclick^="_inlineCommentReveal"]').length;
        onglet('generalites')?.click();
        await a(2400);
        geste(/soumettreDirecteur/)?.click();
        d.confirme = await oui(4000);
        d.statut = statut();
        // Le volet n'est pas reconstruit par la soumission : on le rouvre.
        d.rouverte = await rouvrir();
        d.piedApres = pied().map((b) => b.geste.replace(/'[^']*'/, ''));
        // Et maintenant les commentaires existent.
        onglet('conformite')?.click();
        await a(2800);
        const reveler = document.querySelector('[onclick^="_inlineCommentReveal"]');
        d.revele = document.querySelectorAll('[onclick^="_inlineCommentReveal"]').length;
        d.boutonRevele = !!reveler;
        if (reveler) {
          reveler.click();
          await a(1600);
          const ta = document.querySelector('textarea.eval-indicator-comment');
          d.zoneParue = !!ta;
          if (ta) {
            d.slot = ta.dataset.slot;
            d.cle = !!ta.dataset.key;
            ta.value = commentaire;
          }
        }
        return d;
      });

      // ── 2. Un renvoi sans motif ne part pas ; avec son motif, il recule ──
      await essai('renvoi', async () => {
        const d = {};
        const bouton = geste(/decisionDirecteur\([^)]*'renvoyer'\)/);
        d.bouton = !!bouton;
        if (!bouton) return d;
        // Premier essai : on confirme, puis on **annule** la saisie du motif.
        bouton.click();
        d.confirme = await oui(1200);
        d.annule = await annuler(2600);
        d.statutApresAnnulation = statut();
        // Second essai : le motif est donné.
        geste(/decisionDirecteur\([^)]*'renvoyer'\)/)?.click();
        await oui(1200);
        d.saisie = await saisir(motif, 4000);
        d.statut = statut();
        d.motifAuServeur = (ev() || {}).motif_decision;
        // Le commentaire d'indicateur a voyagé avec la décision.
        d.commentaire = (((ev() || {}).commentaires_indicateurs || {}).conf
          || {});
        d.commentairePorte = Object.values(d.commentaire).includes(commentaire);
        d.rouverte = await rouvrir();
        d.piedRenvoyee = pied().map((b) => b.geste.replace(/'[^']*'/, ''));
        return d;
      });

      // ── 3. Soumise à nouveau, puis acceptée : l'onglet de la réunion naît ──
      await essai('acceptation', async () => {
        const d = {};
        d.ongletsAvant = onglets();
        geste(/soumettreDirecteur/)?.click();
        d.resoumise = await oui(4000);
        await rouvrir();
        d.statutSoumise = statut();
        // ── « Accepter » demandait **rien**, et demande désormais les deux ──
        //
        // Mon premier jet attendait une invite de confirmation, comme pour le
        // renvoi et le rejet : il n'en venait aucune. L'acceptation partait d'un
        // seul clic, sans rien à relire — alors qu'elle ouvre l'onglet de la
        // réunion prestataire et que le circuit ne revient pas en arrière de
        // lui-même. *Une invite qu'on attend et qui ne vient pas est une mesure,
        // pas une panne* : le contrôle l'a relevée, la question est partie à la
        // maîtrise d'ouvrage, et elle a tranché le 4 novembre 2026 — corriger.
        //
        // Le contrôle se retourne donc, et il exige les **deux** invites dans
        // l'ordre : la confirmation d'abord, le commentaire ensuite. Un contrôle
        // qui n'exigerait que la première laisserait retirer la seconde.
        geste(/decisionDirecteur\([^)]*'accepter'\)/)?.click();
        await a(1400);
        // ── Ce qui distingue une confirmation d'une invite de saisie ──
        //
        // Les deux dialogues du socle partagent leurs boutons
        // (`.oasis-confirm-oui`, `.oasis-confirm-non`) : relever le bouton ne
        // dirait pas **lequel** des deux est là, et le contrôle serait passé
        // avec la seule invite de commentaire — c'est-à-dire sans la
        // confirmation qu'il prétend exiger. Ce qui les sépare est le champ :
        // `oasisConfirmer` n'en a pas, `oasisSaisir` en a un.
        d.confirmation = !!document.querySelector('.oasis-confirm-oui')
          && !document.querySelector('.oasis-saisie-champ');
        // Et le refus de la confirmation ne décide rien : on l'éprouve avant de
        // l'accepter, sans quoi « elle confirme » ne dirait pas « elle retient ».
        document.querySelector('.oasis-confirm-non')?.click();
        await a(1600);
        d.statutApresRefus = statut();
        // ── L'assertion qui a mordu n'est pas celle que j'avais écrite pour ça ──
        //
        // Je l'avais posée pour dire « l'invite s'est bien refermée ». Le
        // contre-essai qui pose la confirmation mais **ignore son refus** l'a
        // fait tomber par elle, et non par le statut : refusé, le geste
        // enchaînait sur l'invite de commentaire, et une seconde invite paraissait
        // là où plus rien ne doit être demandé. C'est la meilleure lecture des
        // deux — *après un refus, l'écran ne demande plus rien* — et je la dois
        // au contre-essai, non à mon intention.
        d.inviteFermee = !document.querySelector('.oasis-confirm-oui');
        // Puis pour de bon.
        geste(/decisionDirecteur\([^)]*'accepter'\)/)?.click();
        await a(1400);
        d.confirmationRouverte = !!document.querySelector('.oasis-confirm-oui')
          && !document.querySelector('.oasis-saisie-champ');
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(1400);
        // Le commentaire vient après la confirmation, et il est facultatif : le
        // bouton n'est pas éteint sur un champ vide.
        d.commentaire = !!document.querySelector('.oasis-saisie-champ');
        d.commentaireFacultatif = !(document.querySelector('.oasis-confirm-oui') || {}).disabled;
        const champAcceptation = document.querySelector('.oasis-saisie-champ');
        if (champAcceptation) champAcceptation.value = commentaireAcceptation;
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3600);
        d.statut = statut();
        // Le serveur range le commentaire d'une décision sous deux noms
        // (`motif_decision` et `commentaire_directeur`) : on exige les deux, car
        // ce sont eux que la fiche et les rapports relisent.
        const apres = ev() || {};
        d.commentaireAuServeur = apres.motif_decision === commentaireAcceptation
          && apres.commentaire_directeur === commentaireAcceptation;
        d.rouverte = await rouvrir();
        d.ongletsApres = onglets();
        d.reunionParue = d.ongletsApres.includes('reunion_prestataire');
        return d;
      });

      // ── 4. La réunion prestataire, et la clôture qu'elle porte ──
      await essai('reunion', async () => {
        const d = {};
        onglet('reunion_prestataire')?.click();
        await a(4000);
        d.zone = !!document.getElementById('reunionPrestContent');
        d.champs = ['rpDate', 'rpAac', 'rpPrest', 'rpResume', 'rpReco']
          .filter((id) => !!document.getElementById(id)).length;
        const poser = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
        poser('rpAac', 'Chef de service surveillance');
        poser('rpPrest', 'Responsable qualité');
        poser('rpResume', 'Les écarts ont été passés en revue.');
        poser('rpReco', 'Reprendre la formation des mécaniciens.');
        const enregistrer = document.querySelector('[onclick^="reunionPrestSaveFromTab"]');
        d.boutonEnregistrer = !!enregistrer;
        enregistrer?.click();
        await a(4000);
        // Relu sur le serveur : c'est lui qui dit ce qui est gardé.
        const rows = await window.api(`${MODULE_API}/eval-reunions-prest?eval_id=${o.identifiant}`);
        const r = (rows && rows[0]) || {};
        d.auServeur = {
          existe: !!r.id,
          aac: (r.participants_aac || []).join(' '),
          resume: r.resume_echanges,
          reco: r.recommandations,
        };
        // Le bouton de clôture vit **ici**, non au pied de la fiche.
        const clore = document.querySelector('[onclick*="decisionDirecteur"][onclick*="cloturer"]');
        d.boutonCloture = !!clore;
        d.clotureAuPied = !pied().some((b) => /cloturer/.test(b.geste));
        if (!clore) return d;
        clore.click();
        await oui(1200);
        d.saisie = await saisir('Réunion prestataire clôturée par la ronde', 4000);
        d.statut = statut();
        d.rouverte = await rouvrir();
        d.piedCloturee = pied().map((b) => b.geste.replace(/'[^']*'/, ''));
        return d;
      });

      // ── 5. La validation, qui ferme le volet, puis la réévaluation ──
      await essai('validation', async () => {
        const d = {};
        const valider = geste(/decisionDirecteur\([^)]*'valider'\)/);
        d.bouton = !!valider;
        if (!valider) return d;
        valider.click();
        // « Valider » ne confirme pas : il demande seulement un commentaire,
        // facultatif.
        d.saisie = await saisir('Validation prononcée par la ronde', 4500);
        d.statut = statut();
        d.dateValidation = !!(ev() || {}).date_validation;
        // Une décision terminale referme le volet : c'est écrit dans
        // `decisionDirecteur`, et c'est ce qu'on relève.
        d.voletFerme = !corps();
        // La réévaluation : elle ouvre un cycle, sans toucher à celle qui vaut.
        d.ou = await retrouver();
        d.rouverte = await rouvrir();
        d.piedValidee = pied().map((b) => b.geste.replace(/'[^']*'/, ''));
        const reevaluer = geste(/reevaluerEval/);
        d.boutonReevaluer = !!reevaluer;
        if (!reevaluer) return d;
        d.cyclesAvant = (window.APP_STATE.data.evaluations || []).length;
        reevaluer.click();
        // `reevaluerEval` ne confirme pas : il demande un **motif**, prérempli
        // par « fin de cycle ». On le remplace, pour que la trace dise d'où
        // vient ce cycle.
        d.motifPose = await saisir('Réévaluation ouverte par la ronde', 5000);
        d.cyclesApres = (window.APP_STATE.data.evaluations || []).length;
        const parent = ev() || {};
        d.parentMarque = !!parent.reevalue_le && !!parent.enfant_id;
        d.parentReste = parent.statut === 'valide';
        const enfant = (window.APP_STATE.data.evaluations || [])
          .find((e) => e.id === parent.enfant_id);
        d.enfant = enfant ? {
          statut: enfant.statut, cycle: enfant.cycle,
          parent: enfant.parent_id === o.identifiant,
          circuitVierge: !enfant.soumis_le && !enfant.decide_le
            && !enfant.date_validation,
          notesReprises: Object.keys(enfant.notes_conf || {}).length,
        } : null;
        return d;
      });
      return o;
    }, MOTIF_RENVOI, COMMENTAIRE, COMMENTAIRE_ACCEPTATION);

    {
      const De = circuit.depart || {};
      const So = circuit.soumission || {};
      const Re = circuit.renvoi || {};
      const Ac = circuit.acceptation || {};
      const Ru = circuit.reunion || {};
      const Va = circuit.validation || {};
      verifier('la soumission à la validation change le statut, et ouvre le commentaire par indicateur qu’aucun autre statut n’offre',
        De.trouvee === true && De.statut === 'brouillon'
        && De.notes.conf >= 1 && De.notes.perf >= 1 && De.notes.comp >= 1
        && De.ouverte === true
        && So.bouton === true && So.arme === true
        // Avant la soumission : aucun bouton de commentaire.
        && So.reveleAvant === 0
        && So.confirme === true && So.statut === 'soumis_directeur'
        && So.rouverte === true
        // Le pied a changé de main : trois décisions remplacent la soumission.
        && So.piedApres.some((g) => /'accepter'/.test(g))
        && So.piedApres.some((g) => /'renvoyer'/.test(g))
        && So.piedApres.some((g) => /'rejeter'/.test(g))
        && !So.piedApres.some((g) => /soumettreDirecteur/.test(g))
        // Et maintenant le commentaire se saisit.
        && So.revele >= 1 && So.boutonRevele === true
        && So.zoneParue === true && So.slot === 'conf' && So.cle === true,
        JSON.stringify(So).slice(0, 460));
      verifier('un renvoi dont la saisie du motif est annulée ne part pas, et le même renvoi motivé fait reculer le circuit',
        Re.bouton === true && Re.confirme === true && Re.annule === true
        // L'annulation n'a rien envoyé.
        && Re.statutApresAnnulation === 'soumis_directeur'
        // Le motif est requis : le bouton était éteint tant que le champ
        // était vide.
        && Re.saisie && Re.saisie.requis === true && Re.saisie.actifApres === true
        && Re.statut === 'renvoyee' && Re.motifAuServeur === MOTIF_RENVOI
        // Le commentaire d'indicateur a voyagé avec la décision.
        && Re.commentairePorte === true
        // Et le pied rend la soumission.
        && Re.rouverte === true
        && Re.piedRenvoyee.some((g) => /soumettreDirecteur/.test(g)),
        JSON.stringify({ ...Re, commentaire: undefined }).slice(0, 460));
      verifier('l’acceptation demande une confirmation puis un commentaire, son refus ne décide rien, et elle fait naître l’onglet « Réunion prestataire »',
        Ac.resoumise === true && Ac.statutSoumise === 'soumis_directeur'
        && Ac.ongletsAvant.includes('reunion_prestataire') === false
        // La confirmation vient, et son refus laisse le circuit où il était.
        && Ac.confirmation === true
        && Ac.statutApresRefus === 'soumis_directeur' && Ac.inviteFermee === true
        && Ac.confirmationRouverte === true
        // Puis le commentaire, facultatif.
        && Ac.commentaire === true && Ac.commentaireFacultatif === true
        && Ac.statut === 'acceptee'
        // Et le commentaire est parvenu au serveur.
        && Ac.commentaireAuServeur === true
        && Ac.rouverte === true && Ac.reunionParue === true
        && Ac.ongletsApres.length === Ac.ongletsAvant.length + 1,
        JSON.stringify(Ac).slice(0, 460));
      verifier('le compte-rendu de la réunion prestataire s’enregistre au serveur, et c’est lui qui porte la clôture',
        Ru.zone === true && Ru.champs === 5
        && Ru.boutonEnregistrer === true
        && Ru.auServeur.existe === true
        && /Chef de service/.test(Ru.auServeur.aac || '')
        && /écarts/.test(Ru.auServeur.resume || '')
        && /formation/.test(Ru.auServeur.reco || '')
        // Le bouton de clôture vit dans l'onglet, non au pied.
        && Ru.boutonCloture === true && Ru.clotureAuPied === true
        && Ru.saisie && Ru.statut === 'cloturee'
        && Ru.rouverte === true
        && Ru.piedCloturee.some((g) => /'valider'/.test(g)),
        JSON.stringify(Ru).slice(0, 460));
      verifier('la validation ferme le volet et date l’évaluation, et la réévaluation ouvre un cycle sans toucher à celle qui vaut',
        Va.bouton === true && Va.saisie
        && Va.statut === 'valide' && Va.dateValidation === true
        // Une décision terminale referme le volet.
        && Va.voletFerme === true
        && Va.rouverte === true
        && Va.piedValidee.some((g) => /reevaluerEval/.test(g))
        && Va.boutonReevaluer === true && Va.motifPose
        // Un cycle de plus, et le parent reste le profil en vigueur.
        && Va.cyclesApres === Va.cyclesAvant + 1
        && Va.parentMarque === true && Va.parentReste === true
        && Va.enfant && Va.enfant.statut === 'brouillon'
        && Va.enfant.cycle >= 2 && Va.enfant.parent === true
        && Va.enfant.circuitVierge === true
        // Les notes sont reprises : le nouveau cycle repart de l'ancien.
        && Va.enfant.notesReprises >= 1,
        JSON.stringify(Va).slice(0, 460));
    }


    // ══════════════════════════════════════════════════════════════════
    //  Les réunions des évaluateurs, et la consolidation qui cumule
    // ══════════════════════════════════════════════════════════════════
    //
    // `pr-evaluation-fiche.js`, onglet « Réunion évaluateurs » : la consolidation
    // du chapitre 4 §4.2.2.e. Un tour de consolidation s'ouvre, rouvre les notes,
    // relève ce qui change, et se clôt par un compte-rendu auquel il s'attache.
    //
    // ── Ce que la ronde précédente laisse, et qui sert ici ──
    //
    // Le circuit (5.f.57) a validé une évaluation puis ouvert un **cycle 2** par
    // réévaluation : un brouillon, donc modifiable, et c'est lui qui porte la
    // consolidation. La validée, elle, sert à l'inverse — à mesurer ce qu'un
    // dossier verrouillé n'offre plus —, et c'est elle qui porte le compte-rendu
    // de réunion prestataire que la ronde y a enregistré.
    //
    // ── Les quatre règles éprouvées ──
    //
    //  1. **Un tour de consolidation prend l'empreinte des notes**, les rouvre à
    //     la modification quel que soit le statut, et ce qui change depuis
    //     l'empreinte se lit ligne par ligne, ancienne note contre nouvelle.
    //  2. **Clore le tour reverrouille les notes.** `isReadonly` porte
    //     `(_consolLocked && !_consolActive)` : une fois le compte-rendu
    //     enregistré, un brouillon **n'est plus modifiable** — il faut ouvrir un
    //     nouveau tour. C'est une règle que rien dans l'écran n'annonce.
    //  3. **Les tours se cumulent sans s'écraser.** `reunionEvalSaveFromTab` lit
    //     les comptes-rendus existants **avant** d'enregistrer, et refuse
    //     d'enregistrer s'il n'a pas su les lire : chaque tour s'ajoute au
    //     précédent, numéroté.
    //  4. **Un dossier validé n'offre plus rien à écrire** : ni tour de
    //     consolidation, ni nouvelle réunion, ni modification — les seuls gestes
    //     qui restent sont les exports.
    //
    // ── Trois gestes orphelins, mesurés et non couverts ──
    //
    // `openReunionEvaluateursList`, `openReunionEvaluateursForm` et
    // `saveReunionEval` forment un cycle de fenêtres **fermé sur lui-même** : la
    // liste n'est appelée que par le formulaire, le formulaire que par la liste.
    // Aucun balisage de l'écran ne les ouvre — ils ont été remplacés par le
    // chemin en ligne de l'onglet (`reunionEvalEditInline`,
    // `reunionEvalSaveFromTab`). Le contrôle l'atteste plutôt que de l'affirmer :
    // il compte les appels depuis la source.
    etape = 'réunions des évaluateurs';
    const cheminRetire = cheminParFenetreRetire();

    // Le document composé par un export passe par `window.open` puis
    // `window.print`. En mode sans affichage, rien n'attend l'impression : on la
    // neutralise dès l'ouverture, on lit le document, et on referme.
    const ouvrirDocument = async (geste, ...args) => {
      const attente = new Promise((resoudre, refuser) => {
        const minuteur = setTimeout(() => refuser(new Error('aucune fenêtre ouverte')), 20000);
        page.once('popup', (p) => { clearTimeout(minuteur); resoudre(p); });
      });
      const [popup] = await Promise.all([attente, page.evaluate(geste, ...args)]);
      try { await popup.evaluate(() => { window.print = () => {}; }); }
      catch { /* document déjà écrit */ }
      await new Promise((r) => setTimeout(r, 1500));
      const lu = await popup.evaluate(() => ({
        texte: (document.body ? document.body.innerText : '').replace(/\s+/g, ' '),
        lignes: document.querySelectorAll('table.rep-tbl tbody tr').length,
        titre: document.title,
      }));
      await popup.close();
      return { ...lu, texte: lu.texte.slice(0, 1400) };
    };

    const reunions = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const D = () => window.APP_STATE.data;
      const evals = () => (D().evaluations || []);
      const onglet = (id) => [...document.querySelectorAll('.eval-tab-btn')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`,'${id}')`));
      const bouton = (motif) => [...document.querySelectorAll('button')]
        .find((b) => motif.test(b.getAttribute('onclick') || ''));
      const zone = () => document.getElementById('reunionEvalContent');
      const notesModifiables = () => document.querySelectorAll(
        '[onclick*="setScore("]:not([disabled])').length;
      // La fiche d'une évaluation s'ouvre depuis sa liste. Selon son statut, elle
      // n'est pas dans la même sous-vue : on parcourt jusqu'à trouver son bouton.
      const ouvrirFiche = async (id) => {
        const cible = () => [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(id));
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          await a(2600);
          if (cible()) { cible().click(); await a(3400); return { page: p }; }
          for (const s of [...document.querySelectorAll('.sub-nav-btn')]) {
            s.click(); await a(2400);
            if (cible()) { cible().click(); await a(3400); return { page: p, sousVue: true }; }
          }
        }
        return { introuvable: true };
      };
      const ouvrirOnglet = async () => {
        onglet('reunion_evaluateurs')?.click();
        // Le chargement de l'onglet est différé par `openEvalDetail` : il faut
        // laisser le `setTimeout` puis la requête aboutir.
        await a(4200);
      };

      // ── 1. Le cycle rouvert, son onglet, et ses notes encore modifiables ──
      await essai('ouverture', async () => {
        const d = {};
        const enfant = evals().find((e) => e.parent_id && e.statut === 'brouillon');
        d.enfantTrouve = !!enfant;
        if (!enfant) return d;
        o.cible = enfant.id;
        o.parent = enfant.parent_id;
        d.cycle = enfant.cycle;
        d.ou = await ouvrirFiche(enfant.id);
        d.volet = !!document.querySelector('.pr-slicer-body');
        d.ongletOffert = !!onglet('reunion_evaluateurs');
        if (!d.ongletOffert) return d;
        // Un brouillon sans tour clos : ses notes s'écrivent.
        onglet('conformite')?.click();
        await a(2600);
        d.notesAvant = notesModifiables();
        await ouvrirOnglet();
        d.zone = !!zone();
        d.sections = zone() ? zone().querySelectorAll(':scope > details').length : 0;
        d.liste = !!document.getElementById('reunionEvalListInner');
        d.comptesRendus = document.querySelectorAll('.cr-item').length;
        d.boutonTour = !!bouton(/startConsolidation/);
        d.boutonNouvelle = !!bouton(/reunionEvalEditInline\('[^']*',''\)/);
        d.lectureSeule = /lecture seule/.test(zone() ? zone().textContent : '');
        return d;
      });

      // ── 2. Le tour de consolidation : l'empreinte, et ce qui change ──
      await essai('tour', async () => {
        const d = {};
        bouton(/startConsolidation/)?.click();
        await a(1200);
        // `startConsolidation` confirme : c'est une ouverture de tour.
        d.confirmation = !!document.querySelector('.oasis-confirm-oui');
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(4200);
        const brut = localStorage.getItem(`pr_consol_${o.cible}`);
        d.empreinte = !!brut;
        if (brut) {
          const snap = JSON.parse(brut);
          d.familles = ['notes_conf', 'notes_perf', 'notes_comp']
            .filter((k) => snap[k] && typeof snap[k] === 'object').length;
          d.datee = !!snap.started_at;
          d.notesDansEmpreinte = Object.keys(snap.notes_conf || {}).length;
        }
        d.verrouLeve = !localStorage.getItem(`pr_consol_locked_${o.cible}`);
        // Le tour ouvert, l'onglet porte son bandeau — et plus son bouton.
        d.badge = !!(zone() && zone().querySelector('.badge-warning'));
        d.boutonTourParti = !bouton(/startConsolidation/);
        // Une note change, par un vrai clic sur son indicateur.
        onglet('conformite')?.click();
        await a(3000);
        const notes = [...document.querySelectorAll('[onclick*="setScore("]')]
          .filter((b) => !b.disabled);
        d.notesOuvertes = notes.length;
        if (!notes.length) return d;
        // **Un objet comparé à lui-même ne dit rien** : `notes_conf` est la
        // référence vive que le clic va muter. On en prend une copie.
        const avant = { ...(evals().find((e) => e.id === o.cible).notes_conf || {}) };
        o.cleAvant = Object.keys(avant).length;
        // Un indicateur dont la note n'est pas déjà celle du bouton : sinon le
        // second clic la retirerait au lieu de la changer.
        const choisi = notes.find((b) => {
          const m = /setScore\('([^']*)','([^']*)','?(\d)/.exec(b.getAttribute('onclick') || '');
          return m && String(avant[m[2]] || 0) !== m[3];
        }) || notes[0];
        o.geste = choisi.getAttribute('onclick') || '';
        choisi.click();
        await a(2600);
        const apres = evals().find((e) => e.id === o.cible).notes_conf || {};
        d.changement = JSON.stringify(avant) !== JSON.stringify(apres);
        await ouvrirOnglet();
        // Le tour actif montre ce qui a changé depuis l'empreinte. Le tableau
        // n'a pas de classe : ses lignes de données portent cinq cellules, les
        // lignes de regroupement une seule, à cheval sur cinq.
        d.lignes = zone() ? [...zone().querySelectorAll('tbody tr')]
          .filter((tr) => tr.querySelectorAll('td:not([colspan])').length === 5).length : 0;
        d.enCours = /R1 en cours/.test(zone() ? zone().textContent : '');
        d.texteTour = (zone() ? zone().textContent : '').replace(/\s+/g, ' ')
          .slice(-220);
        return d;
      });

      // ── 3. Clore le tour : le compte-rendu, le cumul, et le reverrouillage ──
      await essai('cloture', async () => {
        const d = {};
        bouton(/reunionEvalEditInline\('[^']*',''\)/)?.click();
        await a(2600);
        d.formulaire = ['reId', 'reDate', 'reParts', 'reCr']
          .filter((id) => !!document.getElementById(id)).length;
        d.identifiantVide = (document.getElementById('reId') || {}).value === '';
        d.datePreremplie = !!(document.getElementById('reDate') || {}).value;
        if (d.formulaire < 4) return d;
        document.getElementById('reParts').value = 'Chef de division\nInspecteur navigabilité';
        document.getElementById('reCr').value = 'Premier tour de consolidation.';
        bouton(/reunionEvalSaveFromTab/)?.click();
        await a(5000);
        // Relu sur le serveur : c'est lui qui dit ce qui est gardé.
        const rows = await window.api(`${MODULE_API}/eval-reunions?eval_id=${o.cible}`);
        d.comptesRendus = (rows || []).length;
        const r = (rows || [])[0] || {};
        o.premier = r.id;
        d.participants = (r.participants || []).length;
        d.compteRendu = (r.compte_rendu || '').slice(0, 32);
        const c = r.consolidation_data || {};
        d.tours = c.rounds_count;
        d.changements = (c.cumulative_changes || []).length;
        d.premierTour = ((c.cumulative_changes || [])[0] || {}).round;
        d.dateeFin = !!c.last_finished_at;
        // L'empreinte est levée, le verrou posé.
        d.empreinteLevee = !localStorage.getItem(`pr_consol_${o.cible}`);
        d.verrouPose = localStorage.getItem(`pr_consol_locked_${o.cible}`) === '1';
        // **Et le brouillon n'est plus modifiable** : la règle que rien n'annonce.
        onglet('conformite')?.click();
        await a(3000);
        d.notesApres = notesModifiables();
        d.notesTotal = document.querySelectorAll('[onclick*="setScore("]').length;
        await ouvrirOnglet();
        d.carte = document.querySelectorAll('.cr-item').length;
        d.carteTexte = (document.querySelector('.cr-summary') || {}).textContent
          ? document.querySelector('.cr-summary').textContent.replace(/\s+/g, ' ').trim() : '';
        return d;
      });

      // ── 4. Un second tour, et « Annuler » qui rend la liste ──
      await essai('second', async () => {
        const d = {};
        bouton(/startConsolidation/)?.click();
        await a(1200);
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(4200);
        d.verrouLeve = !localStorage.getItem(`pr_consol_locked_${o.cible}`);
        onglet('conformite')?.click();
        await a(3000);
        d.notesRouvertes = notesModifiables();
        const notes = [...document.querySelectorAll('[onclick*="setScore("]')]
          .filter((b) => !b.disabled && (b.getAttribute('onclick') || '') !== o.geste);
        const avant = evals().find((e) => e.id === o.cible).notes_conf || {};
        const choisi = notes.find((b) => {
          const m = /setScore\('([^']*)','([^']*)','?(\d)/.exec(b.getAttribute('onclick') || '');
          return m && String(avant[m[2]] || 0) !== m[3];
        });
        d.autreNote = !!choisi;
        choisi?.click();
        await a(2600);
        await ouvrirOnglet();
        // Le formulaire s'ouvre, puis « Annuler » recharge l'onglet.
        bouton(/reunionEvalEditInline\('[^']*',''\)/)?.click();
        await a(2600);
        d.formulaireOuvert = !!document.getElementById('reCr');
        bouton(/_loadReunionEvalTab/)?.click();
        await a(3600);
        d.formulaireFerme = !document.getElementById('reCr');
        d.listeRendue = document.querySelectorAll('.cr-item').length;
        // Puis le second compte-rendu, pour de bon.
        bouton(/reunionEvalEditInline\('[^']*',''\)/)?.click();
        await a(2600);
        document.getElementById('reParts').value = 'Directeur technique';
        document.getElementById('reCr').value = 'Second tour de consolidation.';
        bouton(/reunionEvalSaveFromTab/)?.click();
        await a(5000);
        const rows = await window.api(`${MODULE_API}/eval-reunions?eval_id=${o.cible}`);
        d.comptesRendus = (rows || []).length;
        const tours = (rows || []).map((r) => ({
          id: r.id,
          tours: (r.consolidation_data || {}).rounds_count || 0,
          changements: ((r.consolidation_data || {}).cumulative_changes || []).length,
        }));
        d.tours = tours;
        const second = tours.find((x) => x.tours === 2) || {};
        d.secondTour = second.tours;
        // **Le cumul** : le second tour porte le changement du premier et le sien.
        d.secondCumul = second.changements;
        const premier = tours.find((x) => x.id === o.premier) || {};
        d.premierIntact = premier.changements;
        d.premierTours = premier.tours;
        return d;
      });

      return o;
    });

    // ── Le compte-rendu de consolidation en document, pris sur la fiche qui le
    //    porte : la validée, où l'on va ensuite, n'a aucune réunion. ──
    const documents = {};
    try {
      // Le bouton de la carte, non la fonction : son gestionnaire commence par
      // `event.preventDefault()`, et c'est ce chemin-là qu'on veut.
      documents.consolidation = await ouvrirDocument((rid) => {
        const b = [...document.querySelectorAll('.cr-actions button')]
          .find((x) => {
            const g = x.getAttribute('onclick') || '';
            return /exportReunionPdf/.test(g) && g.includes(rid);
          });
        if (!b) throw new Error('bouton d’export du premier compte-rendu introuvable');
        b.click();
      }, reunions.premier);
    } catch (e) { documents.consolidation = { erreur: String((e && e.message) || e) }; }

    // ── 5. Ce qu'un dossier validé n'offre plus ──
    const verrouille = await page.evaluate(async (parent) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = { parent };
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const evals = () => (window.APP_STATE.data.evaluations || []);
      const onglet = (id) => [...document.querySelectorAll('.eval-tab-btn')]
        .find((b) => (b.getAttribute('onclick') || '').includes(`,'${id}')`));
      const bouton = (motif) => [...document.querySelectorAll('button')]
        .find((b) => motif.test(b.getAttribute('onclick') || ''));
      const zone = () => document.getElementById('reunionEvalContent');
      const ouvrirFiche = async (id) => {
        const cible = () => [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(id));
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          await a(2600);
          if (cible()) { cible().click(); await a(3400); return { page: p }; }
          for (const s of [...document.querySelectorAll('.sub-nav-btn')]) {
            s.click(); await a(2400);
            if (cible()) { cible().click(); await a(3400); return { page: p, sousVue: true }; }
          }
        }
        return { introuvable: true };
      };
      const ouvrirOnglet = async () => {
        onglet('reunion_evaluateurs')?.click();
        await a(4200);
      };

      await essai('verrouille', async () => {
        const d = {};
        d.ou = await ouvrirFiche(o.parent);
        d.statut = (evals().find((e) => e.id === o.parent) || {}).statut;
        await ouvrirOnglet();
        d.zone = !!zone();
        d.lectureSeule = /lecture seule/.test(zone() ? zone().textContent : '');
        d.boutonTour = !!bouton(/startConsolidation/);
        d.boutonNouvelle = !!bouton(/reunionEvalEditInline/);
        onglet('conformite')?.click();
        await a(3000);
        d.notes = document.querySelectorAll('[onclick*="setScore("]:not([disabled])').length;
        // L'onglet « Réunion prestataire » est celui que l'acceptation a ouvert :
        // la ronde du circuit y a enregistré un compte-rendu.
        onglet('reunion_prestataire')?.click();
        await a(4200);
        d.prest = !!document.getElementById('reunionPrestContent');
        d.prestLectureSeule = /lecture seule/.test(
          (document.getElementById('reunionPrestContent') || {}).textContent || '');
        d.prestEnregistrer = !!bouton(/reunionPrestSaveFromTab/);
        d.prestExport = !!bouton(/exportReunionPrestPdf/);
        return d;
      });
      return o;
    }, reunions.parent);

    try {
      documents.prestataire = await ouvrirDocument(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => /exportReunionPrestPdf/.test(x.getAttribute('onclick') || ''));
        if (!b) throw new Error('bouton d’export de la réunion prestataire introuvable');
        b.click();
      });
    } catch (e) { documents.prestataire = { erreur: String((e && e.message) || e) }; }

    {
      const Ou = reunions.ouverture || {};
      const To = reunions.tour || {};
      const Cl = reunions.cloture || {};
      const Se = reunions.second || {};
      const Ve = verrouille.verrouille || {};
      const Dc = documents.consolidation || {};
      const Dp = documents.prestataire || {};
      verifier('le cycle rouvert par la réévaluation offre l’onglet des réunions, vide, et ses notes s’écrivent encore',
        Ou.enfantTrouve === true && Ou.cycle === 2
        && !Ou.ou.introuvable && Ou.volet === true && Ou.ongletOffert === true
        // Un brouillon sans tour clos : les notes sont ouvertes.
        && Ou.notesAvant > 0
        && Ou.zone === true && Ou.sections === 2 && Ou.liste === true
        // Aucun compte-rendu, et les deux gestes d'écriture offerts.
        && Ou.comptesRendus === 0
        && Ou.boutonTour === true && Ou.boutonNouvelle === true
        && Ou.lectureSeule === false,
        JSON.stringify(Ou).slice(0, 420));
      verifier('un tour de consolidation prend l’empreinte des trois familles de notes, et ce qui change depuis se lit ligne par ligne',
        To.confirmation === true
        && To.empreinte === true && To.familles === 3 && To.datee === true
        && To.notesDansEmpreinte > 0 && To.verrouLeve === true
        // Le tour ouvert, le bandeau remplace le bouton.
        && To.badge === true && To.boutonTourParti === true
        && To.notesOuvertes > 0 && To.changement === true
        // Une note changée, une ligne au tableau du tour, marquée « en cours ».
        && To.lignes === 1 && To.enCours === true,
        JSON.stringify(To).slice(0, 420));
      verifier('clore le tour attache la consolidation au compte-rendu et reverrouille les notes d’un brouillon',
        Cl.formulaire === 4 && Cl.identifiantVide === true
        && Cl.datePreremplie === true
        && Cl.comptesRendus === 1 && Cl.participants === 2
        && /Premier tour/.test(Cl.compteRendu || '')
        // Le tour est numéroté, et son changement porte son numéro.
        && Cl.tours === 1 && Cl.changements === 1 && Cl.premierTour === 1
        && Cl.dateeFin === true
        && Cl.empreinteLevee === true && Cl.verrouPose === true
        // **Et les notes se referment** : un brouillon, pourtant.
        && Cl.notesTotal > 0 && Cl.notesApres === 0
        && Cl.carte === 1 && /1 changement/.test(Cl.carteTexte || ''),
        JSON.stringify(Cl).slice(0, 460));
      verifier('un second tour rouvre les notes, « Annuler » rend la liste, et le cumul garde le tour précédent',
        Se.verrouLeve === true && Se.notesRouvertes > 0
        && Se.autreNote === true
        // Le formulaire s'ouvre et se referme par son propre geste.
        && Se.formulaireOuvert === true && Se.formulaireFerme === true
        && Se.listeRendue === 1
        && Se.comptesRendus === 2
        // Le second tour porte son numéro, et **les deux changements**.
        && Se.secondTour === 2 && Se.secondCumul === 2
        // Le premier compte-rendu n'a pas bougé.
        && Se.premierTours === 1 && Se.premierIntact === 1,
        JSON.stringify(Se).slice(0, 460));
      verifier('un dossier validé n’offre plus rien à écrire dans ses deux onglets de réunion, et les deux comptes-rendus se composent en document',
        Ve.statut === 'valide' && Ve.zone === true
        && Ve.lectureSeule === true
        // Ni tour, ni nouvelle réunion, ni note.
        && Ve.boutonTour === false && Ve.boutonNouvelle === false
        && Ve.notes === 0
        && Ve.prest === true && Ve.prestLectureSeule === true
        && Ve.prestEnregistrer === false && Ve.prestExport === true
        // Le compte-rendu de consolidation : son titre, le prestataire, la date,
        // les participants, et les lignes de la consolidation attachée.
        && /consolidation/i.test(Dc.titre || '')
        && /Chef de division/.test(Dc.texte || '')
        && /Premier tour/.test(Dc.texte || '')
        && Dc.lignes === 1
        // Le compte-rendu prestataire : ses **propres** champs, et non ceux
        // d'une réunion de consolidation — deux listes de participants, le
        // résumé des échanges, les recommandations, les deux signatures.
        && /prestataire/i.test(Dp.titre || '')
        && /AAC : Chef de service surveillance/.test(Dp.texte || '')
        && /Organisme : Responsable qualité/.test(Dp.texte || '')
        && /écarts ont été passés en revue/.test(Dp.texte || '')
        && /mécaniciens/.test(Dp.texte || '')
        // Et pas de consolidation : elle n'a aucun sens sur cette réunion.
        && !/consolidation/i.test(Dp.texte || '') && Dp.lignes === 0,
        JSON.stringify({ Ve, Dc, Dp }).slice(0, 560));
      verifier('les trois gestes de l’ancien chemin par fenêtre ont disparu de l’écran, et le chemin qui les a remplacés y est',
        cheminRetire.restants.length === 0
        && cheminRetire.enLigne >= 2,
        JSON.stringify(cheminRetire));
    }


    // ══════════════════════════════════════════════════════════════════
    //  L'aller-retour du classeur : ce que l'export écrit, l'import le relit
    // ══════════════════════════════════════════════════════════════════
    //
    // Trois gestes de la barre d'outils de la fiche : exporter en Excel,
    // exporter en PDF, importer. Le premier et le troisième forment une
    // propriété que l'on peut éprouver sans rien supposer du format : **relire
    // ce qu'on vient d'écrire ne doit rien changer**. C'est plus fort que
    // « le fichier existe et pèse quelque chose » — un classeur aux mauvaises
    // clés pèserait autant.
    //
    // ── Ce que la ronde fait, et ce qu'elle mesure ──
    //
    //  1. Le classeur est **téléchargé pour de vrai** : le navigateur reçoit
    //     l'ordre de déposer ses téléchargements dans un répertoire, et l'ancre
    //     que `exportEvalExcel` fabrique est cliquée. Le fichier est ensuite lu
    //     avec la même bibliothèque que le serveur emploie pour l'écrire.
    //  2. Le rapport PDF est composé dans une fenêtre, et son **document** est
    //     lu — non le fait qu'une fenêtre s'ouvre.
    //  3. Le même classeur est **réimporté par le sélecteur de fichiers**, par
    //     le bouton « Importer », qui ne fait qu'un geste : cliquer l'`input`
    //     caché. Le serveur dit combien de notes il a prises ; la ronde vérifie
    //     que ce sont exactement celles de la fiche, et que rien n'a bougé.
    //  4. Et le même classeur posé sur une **évaluation validée** est refusé :
    //     `VERROUILLEE` porte `valide` et `soumis_directeur`, et le verrou est
    //     relu *dans la transformation* — sans quoi des notes parties au moment
    //     de la validation se poseraient après elle.
    etape = 'aller-retour du classeur';
    const dossierTelechargements = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-pr-xlsx-'));
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior',
      { behavior: 'allow', downloadPath: dossierTelechargements });

    // Ce que le serveur répond à un import : on le lit au vol, c'est lui qui
    // dit combien de notes il a prises.
    const reponsesImport = [];
    page.on('response', (r) => {
      if (!/\/import-excel$/.test(r.url())) return;
      r.json().then((corps) => reponsesImport.push({ statut: r.status(), corps }))
        .catch(() => reponsesImport.push({ statut: r.status(), corps: null }));
    });

    const attendreFichier = async (motif, delai = 20000) => {
      const debut = Date.now();
      while (Date.now() - debut < delai) {
        const f = fs.readdirSync(dossierTelechargements)
          .filter((n) => motif.test(n) && !n.endsWith('.crdownload'));
        if (f.length) {
          const chemin = path.join(dossierTelechargements, f[0]);
          // Un fichier qui vient de paraître peut n'être pas encore clos.
          const taille = fs.statSync(chemin).size;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 400));
          if (fs.statSync(chemin).size === taille && taille > 0) return { nom: f[0], chemin, taille };
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 400));
      }
      return null;
    };

    // ── 1. Ouvrir la fiche du cycle rouvert, et relever ses notes ──
    const avantAllerRetour = await page.evaluate(async (cible) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const bouton = (motif) => [...document.querySelectorAll('button')]
        .find((b) => motif.test(b.getAttribute('onclick') || ''));
      const cherche = () => [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
        .find((b) => (b.getAttribute('onclick') || '').includes(cible));
      const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
        .map((b) => b.getAttribute('data-page'));
      for (const p of pages) {
        document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
        await a(2600);
        if (cherche()) break;
        let trouve = false;
        for (const s of [...document.querySelectorAll('.sub-nav-btn')]) {
          s.click(); await a(2400);
          if (cherche()) { trouve = true; break; }
        }
        if (trouve) break;
      }
      d.bouton = !!cherche();
      if (!d.bouton) return d;
      cherche().click();
      await a(3400);
      d.volet = !!document.querySelector('.pr-slicer-body');
      // La barre d'outils de la fiche : les trois gestes, et l'`input` caché.
      d.excel = !!bouton(/exportEvalExcel/);
      d.pdf = !!bouton(/exportEvalPDF/);
      d.importer = !!bouton(/evalImportFile/);
      d.champ = !!document.getElementById('evalImportFile');
      // Les notes, relues sur le serveur : c'est la référence de l'aller-retour.
      const ev = await window.api(`${MODULE_API}/evaluations/${cible}`);
      const compte = (o) => Object.keys(o || {}).filter((k) => Number(o[k]) > 0).length;
      d.statut = ev.statut;
      d.notes = {
        conf: ev.notes_conf || {}, perf: ev.notes_perf || {}, comp: ev.notes_comp || {},
      };
      d.notees = compte(ev.notes_conf) + compte(ev.notes_perf) + compte(ev.notes_comp);
      return d;
    }, reunions.cible);

    // ── 2. Le classeur, téléchargé puis lu avec la bibliothèque du serveur ──
    const classeur = {};
    try {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => /exportEvalExcel/.test(x.getAttribute('onclick') || ''));
        if (!b) throw new Error('bouton « Exporter Excel » introuvable');
        b.click();
      });
      const fichier = await attendreFichier(/\.xlsx$/);
      classeur.fichier = !!fichier;
      if (fichier) {
        classeur.nom = fichier.nom;
        classeur.taille = fichier.taille;
        // eslint-disable-next-line global-require
        const XLSX = require('xlsx');
        const wb = XLSX.readFile(fichier.chemin);
        classeur.feuilles = wb.SheetNames;
        const lignes = {};
        const notees = {};
        wb.SheetNames.forEach((n) => {
          const rs = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
          lignes[n] = rs.length;
          notees[n] = rs.filter((r) => Number(r.note) > 0).length;
          // Les clés du classeur sont celles de l'état : c'est ce qui fait que
          // l'import retombe sur les mêmes notes.
          if (n === 'Conformite') {
            classeur.clesJustes = rs.filter((r) => Number(r.note) > 0)
              .every((r) => Number((avantAllerRetour.notes.conf || {})[r.cle]) === Number(r.note));
            classeur.enTetes = Object.keys(rs[0] || {}).join(',');
          }
        });
        classeur.lignes = lignes;
        classeur.notees = Object.values(notees).reduce((s, v) => s + v, 0);
        classeur.chemin = fichier.chemin;
      }
    } catch (e) { classeur.erreur = String((e && e.message) || e); }

    // ── 3. Le rapport, composé dans sa fenêtre ──
    let rapport = {};
    try {
      rapport = await ouvrirDocument(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => /exportEvalPDF/.test(x.getAttribute('onclick') || ''));
        if (!b) throw new Error('bouton « Exporter PDF » introuvable');
        b.click();
      });
    } catch (e) { rapport = { erreur: String((e && e.message) || e) }; }

    // ── 4. Le retour : le même classeur, par le sélecteur de fichiers ──
    const retour = {};
    try {
      // L'export PDF a ouvert puis refermé une fenêtre ; la fiche est encore là.
      const [selecteur] = await Promise.all([
        page.waitForFileChooser({ timeout: 20000 }),
        page.evaluate(() => {
          const b = [...document.querySelectorAll('button')]
            .find((x) => /evalImportFile/.test(x.getAttribute('onclick') || ''));
          if (!b) throw new Error('bouton « Importer » introuvable');
          b.click();
        }),
      ]);
      retour.selecteur = true;
      await selecteur.accept([classeur.chemin]);
      await new Promise((r) => setTimeout(r, 6000));
      retour.reponse = reponsesImport[reponsesImport.length - 1] || null;
      Object.assign(retour, await page.evaluate(async (cible, avant) => {
        const d = {};
        const ev = await window.api(`${MODULE_API}/evaluations/${cible}`);
        const egal = (x, y) => JSON.stringify(x || {}) === JSON.stringify(y || {});
        // **Relire ce qu'on vient d'écrire ne change rien.**
        d.confIdentiques = egal(ev.notes_conf, avant.conf);
        d.perfIdentiques = egal(ev.notes_perf, avant.perf);
        d.compIdentiques = egal(ev.notes_comp, avant.comp);
        d.statut = ev.statut;
        return d;
      }, reunions.cible, avantAllerRetour.notes));
    } catch (e) { retour.erreur = String((e && e.message) || e); }

    // ── 5. Le même classeur sur une évaluation validée : refusé ──
    const refusImport = {};
    try {
      refusImport.ou = await page.evaluate(async (parent) => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const cherche = () => [...document.querySelectorAll('[onclick*="openEvalDetail("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(parent));
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          await a(2600);
          if (cherche()) { cherche().click(); await a(3400); return { page: p }; }
          for (const s of [...document.querySelectorAll('.sub-nav-btn')]) {
            s.click(); await a(2400);
            if (cherche()) { cherche().click(); await a(3400); return { page: p, sousVue: true }; }
          }
        }
        return { introuvable: true };
      }, reunions.parent);
      // Le refus est déclaré **avant** le geste, et refermé juste après.
      refusDeclares.declarer(409, '/import-excel');
      const [selecteur] = await Promise.all([
        page.waitForFileChooser({ timeout: 20000 }),
        page.evaluate(() => {
          const b = [...document.querySelectorAll('button')]
            .find((x) => /evalImportFile/.test(x.getAttribute('onclick') || ''));
          if (!b) throw new Error('bouton « Importer » introuvable sur la validée');
          b.click();
        }),
      ]);
      refusImport.selecteur = true;
      await selecteur.accept([classeur.chemin]);
      await new Promise((r) => setTimeout(r, 6000));
      refusDeclares.clore();
      refusImport.reponse = reponsesImport[reponsesImport.length - 1] || null;
      refusImport.declare = refusDeclares.liste.map((x) => ({ ...x }));
    } catch (e) { refusImport.erreur = String((e && e.message) || e); }
    finally { refusDeclares.clore(); }

    try { fs.rmSync(dossierTelechargements, { recursive: true, force: true }); }
    catch { /* le répertoire a déjà disparu */ }

    {
      const Av = avantAllerRetour || {};
      verifier('la barre de la fiche porte ses trois gestes, et l’export rend un classeur dont les clés sont celles de l’état',
        Av.bouton === true && Av.volet === true
        && Av.excel === true && Av.pdf === true
        && Av.importer === true && Av.champ === true
        && Av.statut === 'brouillon' && Av.notees > 0
        // Le classeur est bien arrivé, nommé d'après l'évaluation.
        && classeur.fichier === true && /^evaluation_.*\.xlsx$/.test(classeur.nom || '')
        && classeur.taille > 2000
        // Trois feuilles, une par famille de notes.
        && (classeur.feuilles || []).join(',') === 'Conformite,Performance,Complexite'
        && classeur.enTetes === 'cle,sous_activite,code,indicateur,note'
        && (classeur.lignes || {}).Conformite > 0
        // Et les notes du classeur sont exactement celles de la fiche.
        && classeur.notees === Av.notees && classeur.clesJustes === true,
        JSON.stringify({ Av: { ...Av, notes: undefined }, classeur: { ...classeur, chemin: undefined } }).slice(0, 520));
      verifier('l’export PDF compose le rapport de l’évaluation dans sa fenêtre',
        !rapport.erreur
        && /Air Bénin Express/.test(rapport.texte || '')
        // Les trois familles de notes y figurent, nommées.
        && /Conformité/i.test(rapport.texte || '')
        && /Performance/i.test(rapport.texte || '')
        && /Complexité/i.test(rapport.texte || ''),
        JSON.stringify({ titre: rapport.titre, erreur: rapport.erreur, texte: (rapport.texte || '').slice(0, 320) }));
      verifier('réimporter le classeur rend exactement les mêmes notes, et le même classeur sur une évaluation validée est refusé',
        retour.selecteur === true
        && (retour.reponse || {}).statut === 200
        // Le serveur dit combien de notes il a prises : celles du classeur.
        && ((retour.reponse || {}).corps || {}).updated === Av.notees
        // **Et rien n'a bougé.**
        && retour.confIdentiques === true && retour.perfIdentiques === true
        && retour.compIdentiques === true && retour.statut === 'brouillon'
        // La validée, elle, refuse — et le refus était déclaré.
        && !refusImport.ou.introuvable && refusImport.selecteur === true
        && (refusImport.reponse || {}).statut === 409
        && ((refusImport.reponse || {}).corps || {}).error === 'evaluation_verrouillee'
        && (refusImport.declare || []).every((x) => x.rencontre === true),
        JSON.stringify({ retour, refusImport }).slice(0, 560));
    }


    // ══════════════════════════════════════════════════════════════════
    //  Les facettes des quatre listes, et la coquille
    // ══════════════════════════════════════════════════════════════════
    //
    // Quatre barres de filtres, une par page de liste, et toutes de la même
    // forme : des `<select>` qui écrivent dans un objet de `window`, une
    // recherche différée par le socle, et un bouton qui remet l'objet à neuf.
    // Dix-huit gestes nommés dormaient là — `window._dashFilters.domaine`,
    // `window._evalFilters`, `window._indFilters.sa`… — parce que la ronde
    // parcourait les pages sans toucher à leurs facettes.
    //
    // ── Ce qui se mesure, et ce qui ne se mesure pas ──
    //
    // Qu'une facette **restreigne** la liste n'est pas éprouvable ici sans
    // supposer le jeu d'essai : selon ce que portent les données, un domaine
    // peut ne rien retirer. Ce qui est éprouvable, et qui est la règle, c'est
    // que **la facette parvienne à l'état et que la remise à zéro la vide** —
    // le même contrat que la ronde de CARE éprouve sur sa barre (n° 5.f.22).
    // Le nombre de lignes avant et après est relevé sans être exigé : il entre
    // au détail, pour qu'une facette qui ne filtre **rien du tout** se voie.
    etape = 'facettes et coquille';
    //
    // ── Trois barres, et non quatre ──
    //
    // `pr-plans.js` en porte une quatrième, `window._planFilters`. Elle est
    // **inatteignable** : la page « Plans » est rendue par l'aiguillage et
    // ouverte par rien — elle est déclarée à ce titre dans `PAGES_SANS_CHEMIN`,
    // en tête de ce fichier. Mon premier jet la cherchait et rendait
    // « introuvable » sur un écran qui marche. Le contrôle ci-dessous **lie les
    // deux faits** : si la déclaration disparaissait — parce qu'on aurait rendu
    // son entrée de menu à la page —, il rougirait, et la quatrième barre
    // devrait alors rejoindre cette liste.
    const LISTES = [
      { objet: '_dashFilters', facettes: ['domaine', 'secteur', 'prestataire'] },
      { objet: '_evalFilters', facettes: ['domaine', 'secteur'] },
      { objet: '_indFilters', facettes: ['type', 'domaine', 'secteur', 'sa'] },
    ];
    const facettes = await page.evaluate(async (listes) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const lignes = () => document.querySelectorAll('#pageContent tbody tr, #pageContent .card').length;
      // La barre d'une liste ne vit pas forcément sur la page d'accueil de son
      // menu : on parcourt les pages **et leurs sous-vues** jusqu'à la trouver.
      const trouverBarre = async (objet) => {
        const selects = () => [...document.querySelectorAll(`select[onchange*="${objet}."]`)];
        const pages = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.getAttribute('data-page'));
        for (const p of pages) {
          document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
          await a(2600);
          if (selects().length) return { page: p };
          for (const s of [...document.querySelectorAll('.sub-nav-btn')]) {
            s.click(); await a(2400);
            if (selects().length) return { page: p, sousVue: (s.textContent || '').trim().slice(0, 24) };
          }
        }
        return { introuvable: true };
      };

      for (const liste of listes) {
        // eslint-disable-next-line no-await-in-loop
        await essai(liste.objet, async () => {
          const d = { facettes: {} };
          d.ou = await trouverBarre(liste.objet);
          if (d.ou.introuvable) return d;
          d.lignesAvant = lignes();
          for (const champ of liste.facettes) {
            const sel = document.querySelector(`select[onchange*="${liste.objet}.${champ}"]`);
            if (!sel) { d.facettes[champ] = { absente: true }; continue; }
            // La première option non vide : c'est une valeur que la page offre,
            // non une valeur inventée.
            const valeur = [...sel.options].map((x) => x.value).find(Boolean) || '';
            if (!valeur) { d.facettes[champ] = { aucuneValeur: true }; continue; }
            sel.value = valeur;
            sel.dispatchEvent(new Event('change'));
            // eslint-disable-next-line no-await-in-loop
            await a(2200);
            d.facettes[champ] = {
              posee: (window[liste.objet] || {})[champ] === valeur,
              lignes: lignes(),
            };
          }
          // La recherche, quand la barre en porte une : elle traverse le différé
          // du socle avant d'atteindre l'état.
          const champRecherche = document.querySelector('input[oninput*="_pesSearchInput"]');
          d.recherche = !!champRecherche;
          if (champRecherche) {
            champRecherche.value = 'zzz-aucune-correspondance';
            champRecherche.dispatchEvent(new Event('input'));
            await a(2600);
            d.rechercheDansEtat = (window[liste.objet] || {}).search === 'zzz-aucune-correspondance';
            d.lignesRecherche = lignes();
          }
          // La remise à zéro : l'objet entier est remplacé.
          const remise = [...document.querySelectorAll('button')]
            .find((b) => (b.getAttribute('onclick') || '').includes(`window.${liste.objet}={`));
          d.boutonRemise = !!remise;
          if (!remise) return d;
          remise.click();
          await a(2600);
          const etat = window[liste.objet] || {};
          d.videe = liste.facettes.every((c) => !etat[c]) && !etat.search;
          d.lignesApres = lignes();
          return d;
        });
      }
      return o;
    }, LISTES);

    // ── La coquille : thème, langue, barre, menu mobile, cloche ──
    const coquille = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.APP_STATE || {};

      await essai('theme', async () => {
        const d = {};
        const pastilles = [...document.querySelectorAll('.theme-dot[data-theme]')];
        d.pastilles = pastilles.length;
        d.depart = S().theme;
        const autre = pastilles.find((p) => p.getAttribute('data-theme') !== d.depart);
        if (!autre) return d;
        const vise = autre.getAttribute('data-theme');
        autre.click();
        await a(1600);
        d.pose = S().theme === vise;
        // Le thème suit sur la racine du document : c'est là qu'il agit.
        d.surLaRacine = document.documentElement.getAttribute('data-theme') === vise
          || document.documentElement.classList.contains(`theme-${vise}`);
        // Et la ronde le rend.
        document.querySelector(`.theme-dot[data-theme="${d.depart}"]`)?.click();
        await a(1600);
        d.rendu = S().theme === d.depart;
        return d;
      });

      await essai('langue', async () => {
        const d = {};
        const boutons = [...document.querySelectorAll('.lang-btn')];
        d.boutons = boutons.length;
        d.depart = S().lang;
        const libellesAvant = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.textContent.trim()).join('|');
        const autre = boutons.find((b) => !b.classList.contains('active'));
        if (!autre) return d;
        autre.click();
        await a(2600);
        d.changee = S().lang !== d.depart;
        const libellesApres = [...document.querySelectorAll('.nav-btn[data-page]')]
          .map((b) => b.textContent.trim()).join('|');
        // Les libellés de la barre suivent : sinon la langue n'est qu'un drapeau.
        d.libellesSuivent = libellesApres !== libellesAvant;
        [...document.querySelectorAll('.lang-btn')]
          .find((b) => b.textContent.trim().toLowerCase() === d.depart)?.click();
        await a(2600);
        d.rendue = S().lang === d.depart;
        return d;
      });

      await essai('barre', async () => {
        const d = {};
        const repli = document.querySelector('[onclick*="toggleSidebar"]');
        d.bouton = !!repli;
        if (!repli) return d;
        d.avant = !!S().sidebarCollapsed;
        repli.click();
        await a(1400);
        d.apres = !!S().sidebarCollapsed;
        d.classeSuit = document.querySelector('.app-sidebar')?.classList.contains('collapsed') === d.apres;
        document.querySelector('[onclick*="toggleSidebar"]')?.click();
        await a(1400);
        d.rendue = !!S().sidebarCollapsed === d.avant;
        // Le menu mobile : son bouton, et son fond qui le referme.
        const menu = document.querySelector('[onclick*="toggleMobileSidebar"]');
        d.menu = !!menu;
        if (menu) {
          menu.click();
          await a(1200);
          d.ouvert = document.querySelector('.app-sidebar')?.classList.contains('mobile-open')
            || document.body.classList.contains('sidebar-open')
            || !!document.querySelector('.sidebar-backdrop.visible');
          // Le fond porte le même geste : c'est par lui qu'on referme.
          const fond = document.querySelector('.sidebar-backdrop');
          d.fond = !!fond && /toggleMobileSidebar/.test(fond.getAttribute('onclick') || '');
          fond?.click();
          await a(1200);
        }
        // La cloche des notifications : elle ouvre son panneau et le referme.
        const cloche = document.querySelector('[onclick*="prToggleNotifPanel"]');
        d.cloche = !!cloche;
        if (cloche) {
          cloche.click();
          await a(1400);
          d.panneau = !!document.querySelector('.pr-notif-panel, #prNotifPanel');
          document.querySelector('[onclick*="prToggleNotifPanel"]')?.click();
          await a(1200);
          d.panneauFerme = !document.querySelector('.pr-notif-panel, #prNotifPanel');
        }
        return d;
      });
      return o;
    });

    {
      // Une barre par liste, et le même contrat pour les quatre : chaque facette
      // parvient à l'état, et la remise à zéro vide l'objet entier.
      const verdict = (objet) => {
        const b = facettes[objet] || {};
        if (b.erreur || (b.ou || {}).introuvable) return { ok: false, b };
        const champs = Object.values(b.facettes || {});
        return {
          ok: champs.length > 0
            && champs.every((c) => c.posee === true)
            && b.boutonRemise === true && b.videe === true
            && (b.recherche ? b.rechercheDansEtat === true : true),
          b,
        };
      };
      const barres = LISTES.map((l) => ({ objet: l.objet, ...verdict(l.objet) }));
      // Il y en avait une quatrième, sur la page « Plans ». Elle est partie avec
      // elle, et le lien change de sens : le contrôle atteste désormais que la
      // page n'est plus là, de ses quatre côtés. Si quelqu'un la rendait, il
      // rougirait — et la barre devrait rejoindre cette liste.
      const plans = pagePlansRetiree();
      verifier('les trois barres de facettes de PR parviennent à l’état, chaque remise à zéro vide la sienne, et la quatrième est partie avec la page « Plans »',
        barres.length === 3 && barres.every((x) => x.ok)
        && plans.fichier === false && plans.cas === false
        && plans.script === false && plans.facette === false,
        JSON.stringify({ plans, echecs: barres.filter((x) => !x.ok).map((x) => ({ objet: x.objet, b: x.b })) }).slice(0, 560));
      // Les trois barres qui portent une recherche la font traverser le différé
      // du socle : trois sur quatre, le tableau de bord n'en a pas.
      const avecRecherche = LISTES.filter((l) => (facettes[l.objet] || {}).recherche);
      verifier('les barres de PR qui portent une recherche la font traverser le différé du socle',
        // Deux des trois : le tableau de bord n'offre que ses trois facettes.
        avecRecherche.length === 2
        && avecRecherche.every((l) => facettes[l.objet].rechercheDansEtat === true),
        JSON.stringify(avecRecherche.map((l) => ({
          objet: l.objet, dansEtat: facettes[l.objet].rechercheDansEtat,
          lignes: facettes[l.objet].lignesRecherche,
        }))));

      const Th = coquille.theme || {};
      const La = coquille.langue || {};
      const Ba = coquille.barre || {};
      verifier('le thème et la langue de PR se changent par la coquille, suivent sur le document, et la ronde les rend',
        Th.pastilles >= 2 && Th.pose === true && Th.surLaRacine === true && Th.rendu === true
        && La.boutons === 3 && La.changee === true
        // Les libellés de la barre suivent : sinon la langue n'est qu'un drapeau.
        && La.libellesSuivent === true && La.rendue === true,
        JSON.stringify({ Th, La }));
      verifier('la barre latérale de PR se replie et se relève, son menu mobile se referme par son fond, et la cloche ouvre son panneau',
        Ba.bouton === true && Ba.apres !== Ba.avant
        && Ba.classeSuit === true && Ba.rendue === true
        && Ba.menu === true && Ba.fond === true
        && Ba.cloche === true && Ba.panneau === true && Ba.panneauFerme === true,
        JSON.stringify(Ba));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Les référentiels d'indicateurs : le cycle entier d'une entité,
    //  et l'aller-retour de leur classeur
    // ══════════════════════════════════════════════════════════════════
    //
    // `pr-parametres.js` — 13 gestes sur 21. Les huit qui restent tiennent en un
    // seul parcours : ouvrir la fenêtre d'une entité, l'enregistrer, la rouvrir,
    // la renommer, la supprimer ; puis imprimer la page, exporter le classeur
    // des indicateurs et le réimporter.
    //
    // ── Pourquoi ce parcours, et dans cet ordre ──
    //
    // L'ordre n'est pas libre. Le classeur doit être exporté **après** le cycle
    // de l'entité : exporté avant, il porterait l'indicateur d'essai, et le
    // réimporter le recréerait après sa suppression — l'aller-retour ne dirait
    // alors plus « relire ce qu'on vient d'écrire ne change rien », mais
    // « réimporter ressuscite ce qu'on a retiré ».
    //
    // Et le bandeau d'import ne paraît qu'**après** un import : son bouton de
    // fermeture (`this.parentNode.remove()`) n'existe pas avant.
    etape = 'référentiels d’indicateurs';
    const CODE_INDICATEUR = 'ESSAI' + String(Date.now()).slice(-5);
    const dossierIndicateurs = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-pr-ind-'));
    const cdpIndicateurs = await page.createCDPSession();
    await cdpIndicateurs.send('Browser.setDownloadBehavior',
      { behavior: 'allow', downloadPath: dossierIndicateurs });

    // ── 1. Atteindre la page des indicateurs, et l'imprimer ──
    const pageIndicateurs = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const d = {};
      const bouton = (motif) => [...document.querySelectorAll('button')]
        .find((b) => motif.test(b.getAttribute('onclick') || ''));
      // Les sous-menus des Paramètres de PR prennent la bande latérale du
      // portail (`lateral: true` dans NAV_CONFIG) : on y entre par la page,
      // puis par le sous-menu qui porte le geste qu'on cherche.
      document.querySelector('.nav-btn[data-page="parametres"]')?.click();
      await a(3000);
      if (!bouton(/openEntityModal\('indicateurs_perf'\)/)) {
        for (const s of [...document.querySelectorAll('.sub-nav-btn, [onclick*="navigateTo"]')]) {
          s.click();
          await a(2400);
          if (bouton(/openEntityModal\('indicateurs_perf'\)/)) break;
        }
      }
      d.barre = !!bouton(/openEntityModal\('indicateurs_perf'\)/);
      d.imprimer = !!bouton(/printPage/);
      d.exporter = !!bouton(/exportIndicateursExcel/);
      d.importer = !!bouton(/indImportFile/);
      d.champ = !!document.getElementById('indImportFile');
      return d;
    });

    let documentImprime = {};
    if (pageIndicateurs.imprimer) {
      try {
        documentImprime = await ouvrirDocument(() => {
          const b = [...document.querySelectorAll('button')]
            .find((x) => /printPage/.test(x.getAttribute('onclick') || ''));
          if (!b) throw new Error('bouton d’impression introuvable');
          b.click();
        });
      } catch (e) { documentImprime = { erreur: String((e && e.message) || e) }; }
    }

    // ── 2. Le cycle entier d'une entité ──
    const entite = await page.evaluate(async (code) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const bouton = (motif) => [...document.querySelectorAll('button')]
        .find((b) => motif.test(b.getAttribute('onclick') || ''));
      const perfs = () => window.api(`${MODULE_API}/indicateurs-perf`);
      const poser = (id, valeur) => {
        const el = document.getElementById(id);
        if (!el) return false;
        el.value = valeur;
        // Les zones de texte du formulaire portent `auto-grow` : l'événement
        // `input` est ce qui les fait grandir, et c'est un geste de la coquille.
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      };

      await essai('creation', async () => {
        const d = {};
        d.avant = (await perfs()).length;
        bouton(/openEntityModal\('indicateurs_perf'\)/)?.click();
        await a(2400);
        d.fenetre = !!document.getElementById('eCode');
        if (!d.fenetre) return d;
        d.champs = ['eCode', 'eLabel', 'eC1', 'eC2', 'eC3']
          .filter((x) => !!document.getElementById(x)).length;
        const zone = document.getElementById('eLabel');
        poser('eCode', code);
        poser('eLabel', 'Indicateur d’essai posé par la ronde, dont le libellé est '
          + 'assez long pour que la zone grandisse d’au moins une ligne.');
        poser('eC1', 'Niveau 1');
        poser('eC2', 'Niveau 2');
        poser('eC3', 'Niveau 3');
        await a(900);
        // ── L'auto-grandissement : la règle, non un écart de hauteur ──
        //
        // Mon premier jet comparait la hauteur avant et après : elles étaient
        // égales, la fenêtre étant assez large en mode sans affichage pour que
        // le libellé y tienne sur une ligne. *Comparer deux états ne dit rien
        // quand le second peut légitimement égaler le premier.* Ce que
        // l'écouteur fait, c'est poser la hauteur **à la hauteur du contenu** —
        // et cela se vérifie quelle que soit la largeur.
        d.zoneAutoGrandie = !!zone && zone.classList.contains('auto-grow');
        d.hauteurPosee = zone ? zone.style.height : '';
        d.hauteurSuitLeContenu = !!zone
          && zone.style.height === `${zone.scrollHeight + 2}px`;
        bouton(/saveEntity\('indicateurs_perf'/)?.click();
        await a(3600);
        d.fenetreFermee = !document.getElementById('eCode');
        const apres = await perfs();
        d.apres = apres.length;
        const cree = apres.find((x) => x.code === code);
        d.cree = !!cree;
        if (!cree) return d;
        o.identifiant = cree.id;
        // ── Le serveur ne reprend pas l'identifiant que le client propose ──
        //
        // `saveEntity` envoie `id: itemId || code`. Mon premier jet en concluait
        // que l'identifiant serait le code, et le contrôle est tombé. La vérité
        // est meilleure, et elle est écrite dans `routes-partage.js` : « un
        // enregistrement se borne : le socle retire les champs que le serveur
        // seul écrit, **à commencer par l'identifiant** ». Un client ne choisit
        // donc pas une clé — il ne peut ni en heurter une existante, ni se
        // placer sur celle d'un autre. *Ce que le client propose n'est pas ce
        // que le serveur retient, et c'est une propriété, non un détail.*
        d.idNonImpose = cree.id !== code && !!cree.id;
        // Le relevé est tronqué pour tenir au détail, mais **pas avant ce que
        // l'assertion cherche** : coupé à 24, il s'arrêtait sur « posé » et le
        // motif « posé par la ronde » ne trouvait rien. *Une troncature est un
        // choix d'affichage ; elle ne doit pas décider du verdict.*
        d.libelle = (cree.label || '').slice(0, 48);
        d.criteres = [cree.c1, cree.c2, cree.c3].join('|');
        return d;
      });

      await essai('reprise', async () => {
        const d = {};
        if (!o.identifiant) return d;
        // Rouvrir **par son identifiant** : la fenêtre revient garnie.
        [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '')
            .includes(`openEntityModal('indicateurs_perf','${o.identifiant}')`))?.click();
        await a(2600);
        d.rouverte = !!document.getElementById('eCode');
        if (!d.rouverte) return d;
        d.codeRempli = document.getElementById('eCode').value === code;
        d.libelleRempli = /posé par la ronde/.test(document.getElementById('eLabel').value || '');
        poser('eLabel', 'Libellé révisé par la ronde.');
        bouton(/saveEntity\('indicateurs_perf'/)?.click();
        await a(3600);
        const relu = (await perfs()).find((x) => x.id === o.identifiant) || {};
        d.renomme = relu.label === 'Libellé révisé par la ronde.';
        // Le code ne bouge pas : c'est lui que les évaluations retiennent.
        d.codeInchange = relu.code === code;
        return d;
      });

      await essai('retrait', async () => {
        const d = {};
        if (!o.identifiant) return d;
        [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '')
            .includes(`openEntityModal('indicateurs_perf','${o.identifiant}')`))?.click();
        await a(2600);
        const retirer = bouton(new RegExp(`deleteEntity\\('indicateurs_perf','${o.identifiant}'`));
        d.bouton = !!retirer;
        if (!retirer) return d;
        retirer.click();
        await a(1400);
        d.confirmation = !!document.querySelector('.oasis-confirm-oui');
        // Refusée, la suppression n'a pas lieu : on l'éprouve avant de l'accepter.
        document.querySelector('.oasis-confirm-non')?.click();
        await a(2600);
        d.resteApresRefus = (await perfs()).some((x) => x.id === o.identifiant);
        // Puis pour de bon.
        [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '')
            .includes(`openEntityModal('indicateurs_perf','${o.identifiant}')`))?.click();
        await a(2600);
        bouton(new RegExp(`deleteEntity\\('indicateurs_perf','${o.identifiant}'`))?.click();
        await a(1400);
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3600);
        d.parti = !(await perfs()).some((x) => x.id === o.identifiant);
        d.lignePartie = ![...document.querySelectorAll('button')]
          .some((b) => (b.getAttribute('onclick') || '').includes(`'${o.identifiant}'`));
        return d;
      });
      return o;
    }, CODE_INDICATEUR);

    // ── 3. L'aller-retour du classeur des indicateurs ──
    //
    // Exporté **après** le cycle de l'entité, pour que relire ce qu'on vient
    // d'écrire ne ressuscite pas ce qu'on vient de retirer.
    const classeurInd = {};
    try {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => /exportIndicateursExcel/.test(x.getAttribute('onclick') || ''));
        if (!b) throw new Error('bouton « Exporter Excel » introuvable');
        b.click();
      });
      const debut = Date.now();
      let fichier = null;
      while (Date.now() - debut < 20000 && !fichier) {
        const f = fs.readdirSync(dossierIndicateurs)
          .filter((n) => n.endsWith('.xlsx') && !n.endsWith('.crdownload'));
        if (f.length) {
          const chemin = path.join(dossierIndicateurs, f[0]);
          const taille = fs.statSync(chemin).size;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 400));
          if (fs.statSync(chemin).size === taille && taille > 0) fichier = { nom: f[0], chemin, taille };
        }
        // eslint-disable-next-line no-await-in-loop
        if (!fichier) await new Promise((r) => setTimeout(r, 400));
      }
      classeurInd.fichier = !!fichier;
      if (fichier) {
        classeurInd.nom = fichier.nom;
        classeurInd.taille = fichier.taille;
        // eslint-disable-next-line global-require
        const XLSX = require('xlsx');
        const wb = XLSX.readFile(fichier.chemin);
        classeurInd.feuilles = wb.SheetNames;
        classeurInd.lignes = {};
        wb.SheetNames.forEach((n) => {
          classeurInd.lignes[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' }).length;
        });
        const perf = XLSX.utils.sheet_to_json(wb.Sheets.Performance || {}, { defval: '' });
        classeurInd.enTetes = Object.keys(perf[0] || {}).join(',');
        // L'indicateur d'essai a été retiré : il ne doit pas être au classeur.
        classeurInd.sansEssai = !perf.some((r) => String(r.Code) === CODE_INDICATEUR);
        classeurInd.chemin = fichier.chemin;
      }
    } catch (e) { classeurInd.erreur = String((e && e.message) || e); }

    // Le même classeur, réimporté par le vrai sélecteur de fichiers.
    const retourInd = {};
    try {
      const avant = await page.evaluate(async () => {
        const n = async (c) => (await window.api(`${MODULE_API}/${c}`)).length;
        return { conf: await n('indicateurs-conf'), perf: await n('indicateurs-perf'),
          complex: await n('indicateurs-complex') };
      });
      const [selecteur] = await Promise.all([
        page.waitForFileChooser({ timeout: 20000 }),
        page.evaluate(() => {
          const b = [...document.querySelectorAll('button')]
            .find((x) => (x.getAttribute('onclick') || '').includes("indImportFile'"));
          if (!b) throw new Error('bouton « Importer » introuvable');
          b.click();
        }),
      ]);
      retourInd.selecteur = true;
      await selecteur.accept([classeurInd.chemin]);
      // ── Le bandeau s'efface tout seul, et il faut le lire avant ──
      //
      // J'attendais sept secondes : le bandeau de succès se retire **au bout de
      // six** (`delay = state === 'success' ? 6000 : 12000`). Le contrôle
      // relevait donc son absence et concluait qu'il n'avait pas paru. *Un
      // relevé sur un élément qui se retire seul se fait dans sa fenêtre de vie,
      // et cette fenêtre est écrite dans le code.*
      await new Promise((r) => setTimeout(r, 3500));
      Object.assign(retourInd, await page.evaluate(async (av) => {
        const d = {};
        const n = async (c) => (await window.api(`${MODULE_API}/${c}`)).length;
        d.avant = av;
        d.apres = { conf: await n('indicateurs-conf'), perf: await n('indicateurs-perf'),
          complex: await n('indicateurs-complex') };
        // **Relire ce qu'on vient d'écrire ne change rien** : ni ajout, ni perte.
        d.identique = d.apres.conf === av.conf && d.apres.perf === av.perf
          && d.apres.complex === av.complex;
        // ── Le bandeau d'import, et son bouton de fermeture ──
        //
        // Il ne paraît qu'après un import : son geste de fermeture
        // (`this.parentNode.remove()`) n'existe pas avant, et c'est pourquoi il
        // est le dernier de ce fichier à être exercé.
        const bandeau = document.querySelector('.pr-import-banner');
        d.bandeau = !!bandeau;
        d.texteBandeau = bandeau ? (bandeau.textContent || '').replace(/\s+/g, ' ').slice(0, 90) : '';
        const fermer = bandeau ? bandeau.querySelector('.pr-import-close') : null;
        d.boutonFermer = !!fermer;
        d.geste = fermer ? (fermer.getAttribute('onclick') || '') : '';
        fermer?.click();
        await new Promise((r) => setTimeout(r, 600));
        d.bandeauFerme = !document.querySelector('.pr-import-banner');
        return d;
      }, avant));
    } catch (e) { retourInd.erreur = String((e && e.message) || e); }

    try { fs.rmSync(dossierIndicateurs, { recursive: true, force: true }); }
    catch { /* le répertoire a déjà disparu */ }

    {
      const Pi = pageIndicateurs || {};
      const Cr = entite.creation || {};
      const Rp = entite.reprise || {};
      const Rt = entite.retrait || {};
      verifier('la page des indicateurs porte ses quatre gestes, et son impression compose un document',
        Pi.barre === true && Pi.imprimer === true
        && Pi.exporter === true && Pi.importer === true && Pi.champ === true
        // Le document est **lu**, non seulement ouvert : l'en-tête de l'autorité
        // et au moins un indicateur y figurent.
        && !documentImprime.erreur
        && /Aviation Civile/i.test(documentImprime.texte || '')
        && (documentImprime.texte || '').length > 200,
        JSON.stringify({ Pi, document: { erreur: documentImprime.erreur,
          texte: (documentImprime.texte || '').slice(0, 120) } }));
      verifier('un indicateur s’ajoute par sa fenêtre, le serveur ne reprend pas l’identifiant proposé, et ses zones grandissent à la saisie',
        Cr.fenetre === true && Cr.champs === 5
        // L'écouteur d'auto-grandissement de la coquille, exercé par la saisie :
        // il pose la hauteur à celle du contenu, ce qui se vérifie quelle que
        // soit la largeur de la fenêtre.
        && Cr.zoneAutoGrandie === true && !!Cr.hauteurPosee
        && Cr.hauteurSuitLeContenu === true
        && Cr.fenetreFermee === true && Cr.apres === Cr.avant + 1
        && Cr.cree === true && Cr.idNonImpose === true
        && /posé par la ronde/.test(Cr.libelle || '')
        && Cr.criteres === 'Niveau 1|Niveau 2|Niveau 3',
        JSON.stringify(Cr));
      verifier('la fenêtre se rouvre garnie sur l’indicateur, le renommage part au serveur, et le code ne bouge pas',
        Rp.rouverte === true && Rp.codeRempli === true && Rp.libelleRempli === true
        && Rp.renomme === true
        // Le code est ce que les évaluations retiennent : un renommage ne le
        // touche pas, sans quoi les notes perdraient leur indicateur.
        && Rp.codeInchange === true,
        JSON.stringify(Rp));
      verifier('le retrait d’un indicateur demande confirmation, son refus ne retire rien, et accepté il l’ôte du serveur comme de la page',
        Rt.bouton === true && Rt.confirmation === true
        && Rt.resteApresRefus === true
        && Rt.parti === true && Rt.lignePartie === true,
        JSON.stringify(Rt));
      verifier('le classeur des indicateurs s’exporte sans l’entité retirée, et le réimporter ne change rien — le bandeau le dit, et se ferme par son geste',
        classeurInd.fichier === true && classeurInd.nom === 'indicateurs.xlsx'
        && classeurInd.taille > 2000
        && (classeurInd.feuilles || []).join(',') === 'Conformite,Performance,Complexite'
        && classeurInd.enTetes === 'Code,Label,Critere 1,Critere 2,Critere 3'
        && (classeurInd.lignes || {}).Performance > 0
        // L'entité retirée n'y est pas : le classeur dit l'état d'après.
        && classeurInd.sansEssai === true
        // Et l'aller-retour ne change rien.
        && retourInd.selecteur === true && retourInd.identique === true
        // Le bandeau paraît, dit ce qui s'est passé, et se ferme par son bouton.
        && retourInd.bandeau === true && !!retourInd.texteBandeau
        && retourInd.boutonFermer === true
        && /parentNode\.remove/.test(retourInd.geste || '')
        && retourInd.bandeauFerme === true,
        JSON.stringify({ classeurInd: { ...classeurInd, chemin: undefined }, retourInd }).slice(0, 560));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Les six seuils du barème — la page qui disait « OK » sans rien régler
    // ══════════════════════════════════════════════════════════════════
    //
    // `saveIndices` était le dernier geste non exercé de `pr-parametres.js`.
    // L'exercer a montré pourquoi personne ne l'avait remarqué : il
    // **réussissait**. La page affichait « OK », et rien n'était enregistré.
    //
    // Trois vocabulaires pour une même chose :
    //   · le magasin semait `indices: [{ cle, valeur }, …]` — lu par personne ;
    //   · l'écran lit et envoie `{ conf1, conf2, perf1, perf2, expo1, expo2 }`,
    //     et c'est **cet objet** que six endroits du calcul interrogent
    //     (`pr-profils.js:prSeuils` et quatre lectures de la fiche) ;
    //   · la route `PUT` n'acceptait qu'un tableau, et retombait sinon sur
    //     `d.indices` — c'est-à-dire ne changeait rien — en répondant `ok`.
    //
    // Conséquence : tous les niveaux de risque de l'application se calculaient
    // sur 0,80 et 0,50 repliés dans le code, et le privilège de Gestionnaire
    // qui gardait la page ne gardait rien. Décision de la maîtrise d'ouvrage :
    // le modèle de l'écran fait loi (n° 5.f.69).
    //
    // Le contrôle ne se contente pas du `GET` : il **recharge la page**, et
    // relit `APP_STATE.data.indices`. Car c'est cet état-là que les six
    // lectures du calcul consultent, et `loadAllData` le compose de deux
    // sources : l'amorce du portail (`PESSCO.sharedData.indices`) quand le
    // module est monté dans la coquille, et `GET /api/indices` sinon. La ronde
    // monte l'écran seul : `sharedData` y est absent, et c'est donc la route
    // qui alimente le calcul. Le contrôle vérifie l'état, non la source — les
    // deux chemins y mènent, et c'est l'état qui décide des niveaux de risque.
    etape = 'les six seuils du barème';

    const allerAuxSeuils = () => page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('.nav-btn[data-page="parametres"]')?.click();
      await a(2200);
      const entree = [...document.querySelectorAll('.cfg-sidebar-item')]
        .find((b) => /currentSub='indices'/.test(b.getAttribute('onclick') || ''));
      if (entree) { entree.click(); await a(1400); }
      const champ = (id) => (document.getElementById(id) || {}).value;
      return {
        page: !!document.getElementById('idxConf1'),
        champs: ['idxConf1', 'idxConf2', 'idxPerf1', 'idxPerf2', 'idxExpo1', 'idxExpo2']
          .filter((x) => !!document.getElementById(x)).length,
        lus: {
          conf1: champ('idxConf1'), conf2: champ('idxConf2'),
          perf1: champ('idxPerf1'), perf2: champ('idxPerf2'),
          expo1: champ('idxExpo1'), expo2: champ('idxExpo2'),
        },
      };
    });

    const ecrireSeuils = (valeurs) => page.evaluate(async (v) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const ids = {
        conf1: 'idxConf1', conf2: 'idxConf2', perf1: 'idxPerf1',
        perf2: 'idxPerf2', expo1: 'idxExpo1', expo2: 'idxExpo2',
      };
      Object.entries(v).forEach(([c, x]) => {
        const el = document.getElementById(ids[c]);
        if (el) el.value = String(x);
      });
      document.querySelectorAll('.oasis-toast-fond').forEach((n) => n.remove());
      const bouton = [...document.querySelectorAll('button')]
        .find((b) => /saveIndices/.test(b.getAttribute('onclick') || ''));
      if (!bouton) return { bouton: false };
      bouton.click();
      await a(1800);
      const toast = document.querySelector('.oasis-toast-fond');
      return {
        bouton: true,
        toast: toast ? (toast.className || '') : '',
        texte: toast ? (toast.innerText || '').trim().slice(0, 120) : '',
        enBase: await window.api('/api/indices'),
        enPage: { ...(window.APP_STATE.data.indices || {}) },
      };
    }, valeurs);

    const seuilsAtteints = await allerAuxSeuils();
    let Sa = {}; let Sr = {}; let Sb = {}; let Sz = {};
    if (seuilsAtteints.page) {
      // ── 1. Ce que le magasin porte, et ce que la page en lit ──
      Sa = await page.evaluate(async () => {
        const lu = await window.api('/api/indices');
        return {
          objet: !!lu && !Array.isArray(lu) && typeof lu === 'object',
          tableau: Array.isArray(lu),
          clefs: Object.keys(lu || {}).sort().join(','),
          nombres: ['conf1', 'conf2', 'perf1', 'perf2', 'expo1', 'expo2']
            .every((c) => typeof (lu || {})[c] === 'number'),
          valeurs: lu,
        };
      });

      // ── 2. L'enregistrement, et sa trace jusqu'à l'amorce ──
      Sb = await ecrireSeuils({
        conf1: 0.77, conf2: 0.33, perf1: 0.8, perf2: 0.5, expo1: 0.8, expo2: 0.5,
      });
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 4000));
      const apresRechargement = await allerAuxSeuils();
      Sb.apresRechargement = apresRechargement.lus;
      Sb.amorce = await page.evaluate(() => ({
        page: ((window.APP_STATE.data || {}).indices || {}).conf1,
        // Nul dans une ronde qui monte l'écran seul : on le relève pour que la
        // trace dise par quel chemin l'état a été alimenté.
        coquille: !!((window.PESSCO || {}).sharedData || {}).indices,
      }));

      // ── 3. Les deux refus : hors des bornes, et le barème renversé ──
      //
      // Un seuil hors de [0,1] n'a pas de sens ; un seuil haut sous le seuil
      // bas renverse le barème sans qu'une ligne du calcul ne s'en plaigne.
      // Les deux sont refusés par la route, non par l'écran : `min`/`max` d'un
      // `<input number="">` ne retiennent rien d'une valeur posée par le code.
      refusDeclares.declarer(400, '/api/indices');
      refusDeclares.declarer(400, '/api/indices');
      try {
        Sr = await ecrireSeuils({
          conf1: 1.5, conf2: 0.33, perf1: 0.8, perf2: 0.5, expo1: 0.8, expo2: 0.5,
        });
        Sz = await ecrireSeuils({
          conf1: 0.2, conf2: 0.33, perf1: 0.8, perf2: 0.5, expo1: 0.8, expo2: 0.5,
        });
      } finally { refusDeclares.clore(); }

      // ── 4. Rendre le barème à ses valeurs d'origine ──
      await ecrireSeuils({
        conf1: 0.8, conf2: 0.5, perf1: 0.8, perf2: 0.5, expo1: 0.8, expo2: 0.5,
      });

      verifier('le barème se lit comme un objet de six seuils nombres, et non comme la collection de paires que personne ne lisait',
        seuilsAtteints.champs === 6
        && Sa.objet === true && Sa.tableau === false && Sa.nombres === true
        && Sa.clefs === 'conf1,conf2,expo1,expo2,perf1,perf2',
        JSON.stringify([seuilsAtteints.champs, Sa]).slice(0, 400));

      verifier('un seuil modifié est enregistré, et le rechargement le rend à la page — c’est l’amorce que les six lectures du calcul consultent',
        Sb.bouton === true && /succes|success/.test(Sb.toast)
        // La route le dit…
        && (Sb.enBase || {}).conf1 === 0.77 && (Sb.enBase || {}).conf2 === 0.33
        // …la page vivante aussi…
        && (Sb.enPage || {}).conf1 === 0.77
        // …et après rechargement, l'état que lisent les six places du calcul
        // le porte — c'est lui qui décide des niveaux de risque.
        && (Sb.amorce || {}).page === 0.77
        && (Sb.apresRechargement || {}).conf1 === '0.77'
        && (Sb.apresRechargement || {}).conf2 === '0.33',
        JSON.stringify(Sb).slice(0, 560));

      verifier('un seuil hors de [0,1] est refusé, et un barème renversé aussi — dans les deux cas rien n’est enregistré et l’écran le dit',
        /erreur|error/.test(Sr.toast) && /erreur|error/.test(Sz.toast)
        // Le refus nomme l'objet : l'écran compose la phrase dans la langue.
        && !!Sr.texte && !!Sz.texte
        // Et la valeur refusée n'est pas entrée : celle d'avant tient.
        && (Sr.enBase || {}).conf1 === 0.77 && (Sz.enBase || {}).conf1 === 0.77,
        JSON.stringify([Sr, Sz]).slice(0, 560));
    }

    verifier('aucune erreur de console ni requête échouée sur PR',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
    // Un refus déclaré et jamais venu est une règle qui ne tient plus — ou une
    // déclaration devenue fausse. Les deux doivent rougir.
    refusDeclares.verifier('PR');
  } finally {
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = { enLigne: [], ecouteurs: [], propriete: [], jsx: [], barre: [], poses: 0, pages: 0 };
      for (const p of await navigateur.pages()) {
        try {
          /* eslint-disable no-await-in-loop */
          const j = await p.evaluate(() => {
            const d = JSON.parse(localStorage.getItem('__oasis_gestes') || 'null');
            return { durable: d, vivante: !!window.__gestes, poses: window.__gestes ? window.__gestes.poses : 0 };
          });
          if (j.vivante) { vu.pages += 1; vu.poses += j.poses; }
          if (j.durable && !vu.enLigne.length && !vu.jsx.length) {
            vu.enLigne.push(...j.durable.enLigne);
            vu.ecouteurs.push(...j.durable.ecouteurs);
            vu.propriete.push(...(j.durable.propriete || []));
            vu.jsx.push(...(j.durable.jsx || []));
            // Les actions remises au socle : quatrième canal du
            // mouchard (ADR-003, 5.f.43).
            vu.barre.push(...(j.durable.barre || []));
          }
        } catch { /* page déjà partie */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('PR (navigateur)');
};
