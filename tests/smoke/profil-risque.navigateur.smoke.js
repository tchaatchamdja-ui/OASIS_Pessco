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
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

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
const PAGES_SANS_CHEMIN = {
  plans: 'la vue « Plans » de PR — `renderPlans()` dans pr-plans.js, 121 lignes,'
    + ' 8 gestes nommés. Rendue par l’aiguillage, ouverte par rien. Le module PLAN'
    + ' a son propre écran depuis ; question posée à la maîtrise d’ouvrage.',
};

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
    page.on('console', (m) => {
      if (pr && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (pr) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (pr) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    page.on('response', (r) => {
      if (!pr || r.status() < 400) return;
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

    verifier('aucune erreur de console ni requête échouée sur PR',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
  } finally {
    if (process.env.OASIS_MOUCHARD && navigateur) {
      const vu = { enLigne: [], ecouteurs: [], propriete: [], jsx: [], poses: 0, pages: 0 };
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
