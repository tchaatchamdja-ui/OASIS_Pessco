// PLAN dans un navigateur — la suite n° 0.b de l'écran « Planification de la
// Surveillance » (ADR-003, 5.f.17).
//
// Le quatrième écran à recevoir sa suite, et le patron ne change plus : monter
// l'écran, vérifier que la barre porte ce que la source déclare, que toute page
// de l'aiguillage est atteignable, parcourir les pages par de vrais clics, puis
// exercer les gestes **des** pages — volets et fenêtres ouverts puis refermés,
// bascules dans les deux sens, exports capturés par relais.
//
// Aucune écriture : c'est la méthode qui a porté DROITS à son plafond et RAMP à
// 38. Les rondes d'écriture viennent après, une par une, chacune avec
// l'assertion du résultat **en base** et le retour en arrière.
//
// ── La mesure qui a précédé l'écriture ──
//
// Les six pages ont été ouvertes à la main : de **658** caractères (« Workflow »)
// à **9 861** (« Historique »), aucun débordement, **aucun incident de console**.
// Le volet du calendrier, la fenêtre de création et la page de détail d'un plan
// ont été ouverts et refermés un par un, et leurs sélecteurs relevés. Les seuils
// ci-dessous viennent de là.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const SOURCE_NAV = path.join(RACINE, 'public', 'modules', 'planification', 'js', 'pl-shell.js');

const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

// Les pages déclarées, lues dans la source : une liste tenue ici aurait divergé,
// et le contrôle aurait mesuré sa propre liste.
function pagesDeclarees() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const bloc = /const PLAN_NAV = \{([\s\S]*?)\n\};/.exec(texte);
  if (!bloc) {
    throw new Error('refus : PLAN_NAV introuvable dans public/modules/planification/js/pl-shell.js —'
      + ' le contrôle ne sait plus quelles pages l’écran déclare.');
  }
  const cles = [...bloc[1].matchAll(/^\s{4}'?([\w-]+)'?:\s*\{/gm)].map((m) => m[1]);
  if (!cles.length) throw new Error('refus : PLAN_NAV ne se lit plus entrée par entrée.');
  return cles;
}

// Les cas de l'aiguillage, et ce qui peut les ouvrir.
function aiguillageEtChemins() {
  const texte = fs.readFileSync(SOURCE_NAV, 'utf8');
  const rendues = [...texte.matchAll(/^\s*case '([\w-]+)': content = plan\w+\(\);/gm)].map((m) => m[1]);
  if (!rendues.length) {
    throw new Error('refus : l’aiguillage de planRenderPage ne se lit plus dans pl-shell.js.');
  }
  // Une page sans entrée de menu peut rester atteignable : « plan-detail » est
  // ouverte en posant `currentPage`, depuis la table des plans. On lit donc les
  // deux chemins — l'appel nommé, et l'affectation.
  const js = path.join(RACINE, 'public', 'modules', 'planification', 'js');
  const ouvrables = new Set();
  fs.readdirSync(js).filter((f) => f.endsWith('.js')).forEach((f) => {
    const t = fs.readFileSync(path.join(js, f), 'utf8');
    for (const m of t.matchAll(/planNavigateTo\(\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
    for (const m of t.matchAll(/currentPage\s*=\s*'([\w-]+)'/g)) ouvrables.add(m[1]);
  });
  return { rendues, ouvrables: [...ouvrables] };
}

module.exports = async function planificationNavigateurSmoke(port) {
  console.log('\n── PLAN : l’écran « Planification de la Surveillance » dans un navigateur ──');

  const srv = await demarrer({ port });
  let navigateur = null;
  const incidents = [];
  try {
    // Délai de protocole : voir la raison dans `surv.smoke.js` (n° 5.f.30) —
    // une campagne de huit suites de navigateur a dépassé le défaut.
    navigateur = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });
    const mouchard = process.env.OASIS_MOUCHARD
      ? require(path.join(RACINE, 'scripts', 'relever-gestes.js')).MOUCHARD : null;
    const page = await navigateur.newPage();
    if (mouchard) await page.evaluateOnNewDocument(mouchard);
    await page.setViewport({ width: 1440, height: 900 });

    let plan = false;
    let etape = 'montage';
    page.on('console', (m) => {
      if (plan && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (plan) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (plan) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    page.on('response', (r) => {
      if (!plan || r.status() < 400) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    plan = true;
    await page.goto(`${srv.base}/modules/planification/index.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.getElementById('planPageContent');
        return el && el.textContent.trim().length > 200;
      },
      { timeout: 20000 },
    ).catch(() => { /* le contrôle qui suit le dira */ });

    const monte = await page.evaluate(() => ({
      pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page),
      contenu: (document.getElementById('planPageContent') || { textContent: '' }).textContent.trim().length,
      retour: document.querySelectorAll('.oasis-back-btn').length,
      mort: document.querySelectorAll('.btn-back-portal').length,
    }));
    verifier('l’écran PLAN se monte, avec sa barre et son contenu',
      monte.pages.length > 0 && monte.contenu > 200
      && monte.retour === 1 && monte.mort === 0,
      JSON.stringify(monte));

    let declarees = [];
    let refus = null;
    try { declarees = pagesDeclarees(); } catch (e) { refus = e.message; }
    const manquantes = declarees.filter((p) => !monte.pages.includes(p));
    const inattendues = monte.pages.filter((p) => !declarees.includes(p));
    verifier('la barre de PLAN porte exactement les pages que la source déclare',
      !refus && declarees.length > 0 && !manquantes.length && !inattendues.length,
      refus || `${declarees.length} déclarées`
        + `${manquantes.length ? ` — absentes : ${manquantes.join(', ')}` : ''}`
        + `${inattendues.length ? ` — inattendues : ${inattendues.join(', ')}` : ''}`);

    let aiguillage = null;
    let refusAiguillage = null;
    try { aiguillage = aiguillageEtChemins(); } catch (e) { refusAiguillage = e.message; }
    if (refusAiguillage) {
      verifier('toute page de PLAN que l’aiguillage rend est atteignable', false, refusAiguillage);
    } else {
      const sansChemin = aiguillage.rendues
        .filter((p) => !declarees.includes(p) && !aiguillage.ouvrables.includes(p));
      verifier('toute page de PLAN que l’aiguillage rend est atteignable',
        sansChemin.length === 0,
        sansChemin.length ? `sans chemin : ${sansChemin.join(', ')}`
          : `${aiguillage.rendues.length} cas rendus, ${aiguillage.ouvrables.length} ouvrable(s)`);
    }

    // ── Les six pages, par de vrais clics ──
    const vues = {};
    const ouvrir = (cle) => page.evaluate(
      (c) => document.querySelector(`.nav-btn[data-page="${c}"]`)?.click(), cle,
    );
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const cle of monte.pages) {
      etape = cle;
      /* eslint-disable no-await-in-loop */
      await ouvrir(cle);
      await attendre(2400);
      vues[cle] = await page.evaluate(() => {
        const z = document.getElementById('planPageContent');
        return {
          longueur: z ? z.textContent.trim().length : 0,
          debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          // L'empreinte est prise sur ce que la page **tabule**, et non sur son
          // préfixe de texte : le haut d'une page est souvent commun à toutes,
          // et un préfixe y rendrait des jumelles qui n'en sont pas (5.f.14).
          empreinte: z
            ? `${z.textContent.trim().length}:${z.querySelectorAll('[onclick]').length}`
            : '',
        };
      });
    }
    etape = 'pages';

    const maigres = Object.entries(vues).filter(([, v]) => v.longueur < 200)
      .map(([c, v]) => `${c}=${v.longueur}`);
    verifier('chaque page de PLAN se remplit',
      maigres.length === 0,
      maigres.length ? `trop maigres : ${maigres.join(', ')}`
        : Object.entries(vues).map(([c, v]) => `${c}=${v.longueur}`).join(' '));

    const empreintes = Object.entries(vues).map(([c, v]) => [c, v.empreinte]);
    const jumelles = [];
    for (let i = 0; i < empreintes.length; i += 1) {
      for (let j = i + 1; j < empreintes.length; j += 1) {
        if (empreintes[i][1] === empreintes[j][1]) jumelles.push(`${empreintes[i][0]}=${empreintes[j][0]}`);
      }
    }
    verifier('les pages de PLAN diffèrent les unes des autres',
      jumelles.length === 0, jumelles.join(', ') || `${empreintes.length} pages distinctes`);

    const debordantes = Object.entries(vues).filter(([, v]) => v.debord > 0)
      .map(([c, v]) => `${c}=${v.debord}px`);
    verifier('aucune page de PLAN ne déborde à droite',
      debordantes.length === 0, debordantes.join(', ') || 'aucun débordement');

    // ── Le volet du calendrier, et ses trois gestes ──
    etape = 'calendrier';
    await ouvrir('dashboard');
    await attendre(2400);
    const calendrier = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const volet = () => (document.getElementById('planVolet') || { innerHTML: '' }).innerHTML.length;
      r.avant = volet();
      document.querySelector('[onclick^="planChoisirCarte"]')?.click();
      await a(1400);
      document.querySelector('[onclick^="planResetFilters"]')?.click();
      await a(1400);
      document.querySelector('[onclick^="planOuvrirCalendrier"]')?.click();
      await a(2800);
      r.ouvert = volet();
      // Les trois gestes du calendrier : changer d'année, défiler, revenir à
      // aujourd'hui. Chacun redessine le volet, et l'on vérifie qu'il reste
      // garni — un geste qui viderait le volet passerait sinon.
      const annee = document.querySelector('#planVolet [onclick^="planCalAnnee"]');
      if (annee) { annee.click(); await a(1600); }
      r.apresAnnee = volet();
      const defiler = document.querySelector('#planVolet [onclick^="planCalDefiler"]');
      if (defiler) { defiler.click(); await a(1600); }
      r.apresDefilement = volet();
      const aujourdhui = document.querySelector('#planVolet [onclick^="planCalAujourdhui"]');
      if (aujourdhui) { aujourdhui.click(); await a(1600); }
      r.apresAujourdhui = volet();
      document.querySelector('[onclick^="planFermerCalendrier"]')?.click();
      await a(1600);
      r.ferme = volet();
      return r;
    });
    verifier('le volet du calendrier s’ouvre garni, ses trois gestes le redessinent, et il se referme',
      calendrier.avant === 0 && calendrier.ouvert > 500
      && calendrier.apresAnnee > 500 && calendrier.apresDefilement > 500
      && calendrier.apresAujourdhui > 500 && calendrier.ferme === 0,
      JSON.stringify(calendrier));

    // ── Les fenêtres : ouvertes, refermées, et rien enregistré ──
    etape = 'fenetres';
    const fenetres = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const modal = () => (document.getElementById('planModal') || { innerHTML: '' }).innerHTML.length;
      const ouvrirPage = async (c) => {
        document.querySelector(`.nav-btn[data-page="${c}"]`)?.click();
        await a(2400);
      };
      const ronde = async (geste) => {
        const b = document.querySelector(`[onclick^="${geste}"]`);
        if (!b) return null;
        b.click();
        await a(2400);
        const ouverte = modal();
        document.querySelector('[onclick^="planCloseModal"]')?.click();
        await a(1500);
        return [ouverte, modal()];
      };
      await ouvrirPage('prestataires');
      r.prestBasculer = !!document.querySelector('[onclick^="planPrestBasculer"]');
      document.querySelector('[onclick^="planPrestBasculer"]')?.click();
      await a(1500);
      r.profilRisque = await ronde('planShowAddRiskProfileModal');
      await ouvrirPage('plans');
      r.creation = await ronde('planShowCreateModal');
      r.edition = await ronde('planShowEditModal');
      // ── L'accordéon ne retire aucune ligne, et c'est le quatrième du genre ──
      //
      // Premier essai : compter les lignes de la table. Elles étaient **34
      // avant, 34 pendant, 34 après** — `planAccBasculer` bascule une classe
      // `expanded` sur son conteneur et pose `aria-expanded` sur son en-tête. Le
      // dépliage est affaire de rendu, non de document.
      //
      // Après `.ramp-slider` qui survit à la fermeture, le haut d'une page pris
      // pour son panneau, et les lignes d'un regroupement replié : c'est la
      // quatrième fois qu'une assertion vise la grandeur **la plus visible**
      // plutôt que celle que le code change. Ici le code la **nomme** —
      // `aria-expanded` —, et c'est de surcroît la propriété que lit un lecteur
      // d'écran. *La bonne assertion est souvent écrite dans le geste lui-même.*
      const entete = () => document.querySelector('#planPageContent .act-acc-header');
      const etat = () => (entete() || { getAttribute: () => null }).getAttribute('aria-expanded');
      r.lignes = document.querySelectorAll('#planPageContent tbody tr').length;
      r.accAvant = etat();
      entete()?.click();
      await a(1400);
      r.accApres = etat();
      entete()?.click();
      await a(1400);
      r.accRendu = etat();
      // Et sa variante clavier : le même geste, par Entrée. Un en-tête qui se
      // clique mais ne répond pas au clavier n'est pas un bouton.
      const e = entete();
      if (e) {
        e.focus();
        e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await a(1400);
      }
      r.accClavier = etat();
      document.querySelector('[onclick^="planTogglePrestRow"]')?.click();
      await a(1400);
      document.querySelector('[onclick^="_planSortBy"]')?.click();
      await a(1400);
      r.lignesApresTri = document.querySelectorAll('#planPageContent tbody tr').length;
      return r;
    });
    verifier('les fenêtres de PLAN s’ouvrent garnies et se referment par leur geste',
      !!fenetres.creation && fenetres.creation[0] > 500 && fenetres.creation[1] === 0
      && !!fenetres.profilRisque && fenetres.profilRisque[0] > 200
      && fenetres.profilRisque[1] === 0,
      JSON.stringify({ creation: fenetres.creation, edition: fenetres.edition,
        profilRisque: fenetres.profilRisque }));
    verifier('l’accordéon des plans se déplie et se replie, à la souris comme au clavier',
      fenetres.lignes > 0
      && fenetres.accApres !== fenetres.accAvant
      && fenetres.accRendu === fenetres.accAvant
      && fenetres.accClavier === fenetres.accApres
      && fenetres.lignesApresTri > 0,
      JSON.stringify({ lignes: fenetres.lignes, avant: fenetres.accAvant,
        apres: fenetres.accApres, rendu: fenetres.accRendu,
        clavier: fenetres.accClavier, apresTri: fenetres.lignesApresTri }));

    // ── La page de détail d'un plan, qu'aucun menu n'offre ──
    etape = 'detail';
    const detail = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const z = () => (document.getElementById('planPageContent') || { textContent: '' }).textContent.trim().length;
      r.avant = z();
      document.querySelector('[onclick^="planOpenDetail"]')?.click();
      await a(2800);
      r.detail = z();
      r.gestes = [...new Set([...document.querySelectorAll('#planPageContent [onclick]')]
        .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
        .filter(Boolean))];
      // Les fenêtres du détail : le commentaire de validation et celui du plan.
      const modal = () => (document.getElementById('planModal') || { innerHTML: '' }).innerHTML.length;
      for (const geste of ['planShowValidationComment', 'planShowCommentModal', 'planShowWorkflowHistory']) {
        const b = document.querySelector(`[onclick^="${geste}"]`);
        if (!b) continue;
        b.click();
        /* eslint-disable no-await-in-loop */
        await a(2200);
        r[geste] = modal();
        document.querySelector('[onclick^="planCloseModal"]')?.click();
        await a(1400);
      }
      document.querySelector('#planPageContent [onclick^="planAccBasculer"]')?.click();
      await a(1400);
      // Retour aux plans par la barre du détail.
      document.querySelector('#planPageContent [onclick^="planNavigateTo"]')?.click();
      await a(2400);
      r.retour = z();
      return r;
    });
    verifier('la page de détail d’un plan s’ouvre, offre ses gestes, et la barre y ramène',
      detail.detail > 1000 && detail.detail !== detail.avant
      && (detail.gestes || []).includes('planExportPDF')
      && detail.retour > 200,
      JSON.stringify({ avant: detail.avant, detail: detail.detail,
        retour: detail.retour, gestes: (detail.gestes || []).length }));

    // ── « Mes activités » et l'historique ──
    etape = 'mes-activites';
    const divers = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      document.querySelector('.nav-btn[data-page="mes-activites"]')?.click();
      await a(2600);
      r.mesActivites = (document.getElementById('planPageContent') || { textContent: '' })
        .textContent.trim().length;
      document.querySelector('[onclick^="planMaReinit"]')?.click();
      await a(1500);
      const ouvrir = document.querySelector('[onclick^="planMaOuvrir"]');
      r.boutonOuvrir = !!ouvrir;
      if (ouvrir) { ouvrir.click(); await a(2200); }
      r.apresOuverture = (document.getElementById('planPageContent') || { textContent: '' })
        .textContent.trim().length;
      return r;
    });
    verifier('« Mes activités » se remplit et ses gestes répondent',
      divers.mesActivites > 200 && divers.apresOuverture > 200,
      JSON.stringify(divers));

    // ── L'export de l'historique, capturé par relais ──
    //
    // Comme ceux de SURV et de RAMP, il compose son document dans le navigateur.
    // On capture le **produit** ; ce que cela ne prouve pas est dit en 5.f.12 —
    // ni l'ouverture de la fenêtre, ni l'enregistrement du fichier.
    etape = 'historique';
    await ouvrir('historique');
    await attendre(2600);
    const produit = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
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
      document.querySelector('[onclick^="planExportPDF"]')?.click();
      await a(2200);
      window.open = vraiOpen;
      URL.createObjectURL = vraiURL;
      return { documents: recu.fenetres.map((f) => f.html.length), blobs: recu.blobs };
    });
    verifier('l’export de l’historique remet un document à son mécanisme',
      (produit.documents || []).some((n) => n > 500) || produit.blobs > 0,
      JSON.stringify(produit));

    verifier('aucune erreur de console ni requête échouée sur PLAN',
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
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('PLAN (navigateur)');
};
