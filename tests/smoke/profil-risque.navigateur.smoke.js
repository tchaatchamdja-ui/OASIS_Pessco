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

    verifier('aucune erreur de console ni requête échouée sur PR',
      incidents.length === 0, incidents.slice(0, 4).join(' · '));
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
