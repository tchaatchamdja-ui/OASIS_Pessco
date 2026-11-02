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

    // ══════════════════════════════════════════════════════════════════
    //  La ronde d'un plan, de la création à la décision
    // ══════════════════════════════════════════════════════════════════
    //
    // PLAN était à **21 gestes sur 94**, et *tout ce qui écrit* y était non
    // exercé. C'est l'écran le plus exposé du dépôt : un plan de surveillance
    // est l'acte par lequel une AAC engage son programme de l'année, et son
    // circuit — rédiger, soumettre, commenter, décider — n'avait aucune preuve.
    //
    // ── Le patron, repris de la ronde du POI de RAMP ──
    //
    // Chaque palier est **relu chez le serveur**, et la ronde ne laisse rien.
    // Elle commence par relever ce qu'elle hérite : neuf fois cette semaine un
    // geste a été posé sur un état supposé, et la règle est maintenant écrite
    // dans chaque ronde.
    etape = 'ronde d’un plan';
    await ouvrir('plans');
    await attendre(2500);
    const rondePlan = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const jget = async (u) => (await (await fetch(api + u, { credentials: 'same-origin' })).json());
      const env = async (url, methode, corps) => {
        const rep = await fetch(api + url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        return rep.status;
      };
      const plans = async () => {
        const r = await jget('/plans');
        return Array.isArray(r) ? r : (r.plans || []);
      };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3000);
        return true;
      };
      const S = () => window.PLAN_STATE || {};
      const poser = async (id, v, ev) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event(ev || 'input', { bubbles: true }));
        await a(500);
        return true;
      };
      const modale = () => document.querySelector('.modal-overlay, .plan-modal-overlay, .oasis-modal');

      o.herite = { page: S().currentPage };
      o.deja = (await plans()).length;

      // ── 1. La création : le formulaire, et ce que le serveur en garde ──
      await essai('creation', async () => {
        const d = {};
        const bouton = document.querySelector('[onclick^="planShowCreateModal"]');
        d.bouton = !!bouton;
        bouton?.click();
        await a(2500);
        d.champs = 0;
        if (await poser('planTitre', 'Plan de la ronde automatique')) d.champs += 1;
        if (await poser('planAnnee', '2027', 'change')) d.champs += 1;
        const type = document.getElementById('planType');
        d.listeType = !!type;
        if (type) {
          type.value = 'periodique';
          type.dispatchEvent(new Event('change', { bubbles: true }));
          await a(500);
          d.champs += 1;
        }
        // Le domaine et le secteur viennent des référentiels : on prend les
        // premiers que la liste propose, et l'on relève lesquels.
        const dom = document.getElementById('planDomaine');
        const sec = document.getElementById('planSecteur');
        d.domaines = dom ? dom.options.length : 0;
        d.secteurs = sec ? sec.options.length : 0;
        if (dom && dom.options.length > 1) {
          dom.value = dom.options[1].value;
          dom.dispatchEvent(new Event('change', { bubbles: true }));
          await a(800);
        }
        const sec2 = document.getElementById('planSecteur');
        if (sec2 && sec2.options.length > 1) {
          sec2.value = sec2.options[1].value;
          sec2.dispatchEvent(new Event('change', { bubbles: true }));
          await a(800);
        }
        document.querySelector('[onclick^="planCreatePlan"]')?.click();
        await a(4500);
        const liste = await plans();
        d.apres = liste.length;
        const mien = liste.find((p) => /ronde automatique/.test(p.titre || ''));
        o.planId = (mien || {}).id;
        d.titre = (mien || {}).titre;
        d.annee = (mien || {}).annee;
        d.type = (mien || {}).type;
        d.statut = (mien || {}).statut;
        d.version = (mien || {}).version;
        return d;
      });

      // ── 2. La modification : le même plan, un autre intitulé ──
      await essai('modification', async () => {
        const d = {};
        const editer = [...document.querySelectorAll('[onclick^="planShowEditModal"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.bouton = !!editer;
        editer?.click();
        await a(2500);
        d.titreRepris = (document.getElementById('editPlanTitre') || {}).value;
        await poser('editPlanTitre', 'Plan de la ronde automatique — amendé');
        await poser('editPlanAnnee', '2028', 'change');
        const enregistrer = [...document.querySelectorAll('[onclick^="planUpdatePlan"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.boutonEnregistrer = !!enregistrer;
        enregistrer?.click();
        await a(4500);
        const mien = (await plans()).find((p) => p.id === o.planId) || {};
        d.titre = mien.titre;
        d.annee = mien.annee;
        // Modifier n'est pas soumettre : le statut n'a pas bougé.
        d.statut = mien.statut;
        return d;
      });

      // ── 3. La soumission : une confirmation qui récapitule, puis l'acte ──
      //
      // ── La règle du module, lue et non combattue ──
      //
      // `canSubmit = canEdit && activites.length > 0` : **un plan sans activité
      // ne se soumet pas.** Mon premier tir cherchait le bouton sur un plan
      // vide, et il n'y en avait pas — trois contrôles rouges pour une règle
      // que la source écrit noir sur blanc.
      //
      // La ronde sème donc une activité **par la route**. Le formulaire
      // d'activité — ses cascades de secteur et de thèmes — fera son propre
      // tour : ici il n'est pas le sujet, et semer par la route ce qu'on ne
      // mesure pas est la pratique du dépôt depuis la ronde des statistiques.
      await essai('soumission', async () => {
        const d = {};
        d.semisActivite = await env(`/plans/${o.planId}/activites`, 'POST', {
          objet: 'Activité semée par la ronde', date_debut: '2028-03-02',
          date_fin: '2028-03-06', priorite: 'normale', statut: 'planifiee',
        });
        if (typeof window.planLoadData === 'function') await window.planLoadData();
        await a(2500);
        if (typeof window.planOpenDetail === 'function') await window.planOpenDetail(o.planId);
        await a(3500);
        d.detail = (S().selectedPlan || {}).id === o.planId;
        d.activites = ((S().selectedPlan || {}).activites || []).length;
        const soumettre = [...document.querySelectorAll('[onclick^="planSubmit"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.bouton = !!soumettre;
        soumettre?.click();
        await a(2500);
        d.modale = !!modale();
        // La fenêtre récapitule le plan et son nombre d'activités.
        const texte = modale() ? (modale().textContent || '') : '';
        d.recapitule = /ronde automatique/.test(texte);
        const confirmer = [...document.querySelectorAll('[onclick^="planConfirmSubmit"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.boutonConfirmer = !!confirmer;
        confirmer?.click();
        await a(5000);
        const mien = (await plans()).find((p) => p.id === o.planId) || {};
        d.statut = mien.statut;
        d.soumisLe = !!mien.soumis_le;
        return d;
      });

      // ── 4. Un commentaire de validation, ajouté puis retiré ──
      await essai('commentaire', async () => {
        const d = {};
        const commentaires = async () => {
          const r = await jget(`/plans/${o.planId}/commentaires`).catch(() => null);
          if (Array.isArray(r)) return r;
          return (r && (r.commentaires || r.liste)) || [];
        };
        d.avant = (await commentaires()).length;
        const ajouter = [...document.querySelectorAll('[onclick^="planShowCommentModal"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.bouton = !!ajouter;
        ajouter?.click();
        await a(2500);
        d.champ = !!document.getElementById('commentContenu');
        // Un commentaire vide ne s'enregistre pas : la fonction s'arrête avant
        // l'appel. On l'éprouve, puis on écrit.
        document.querySelector('[onclick^="planCreateComment"]')?.click();
        await a(2000);
        d.apresVide = (await commentaires()).length;
        await poser('commentContenu', 'Observation de la ronde : échéances à préciser.');
        document.querySelector('[onclick^="planCreateComment"]')?.click();
        await a(4500);
        const l = await commentaires();
        d.apres = l.length;
        d.contenu = (l[0] || {}).contenu;
        o.commentId = (l[0] || {}).id;

        // Le retrait, sur confirmation du socle.
        const retirer = [...document.querySelectorAll('[onclick^="planDeleteComment"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.commentId || 'zzz'));
        d.boutonRetirer = !!retirer;
        retirer?.click();
        d.retraitConfirme = await oui();
        await a(1500);
        d.apresRetrait = (await commentaires()).length;
        return d;
      });

      // ── 5. La décision : valider, par la confirmation qui la reprend ──
      await essai('decision', async () => {
        const d = {};
        // ── La décision vit sur la page « workflow », non sur le détail ──
        //
        // `planValidate` est rendu par `pl-validation.js`, qui tient la page du
        // circuit : c'est là que le valideur voit ce qui l'attend. Je le
        // cherchais sur le détail du plan, où il n'a jamais été.
        document.querySelector('.nav-btn[data-page="workflow"]')?.click();
        await a(3500);
        d.page = S().currentPage;
        const valider = [...document.querySelectorAll('[onclick*="planValidate("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.bouton = !!valider;
        valider?.click();
        await a(2500);
        d.modale = !!modale();
        d.brouillon = !!window._planDecisionDraft;
        const appliquer = document.querySelector('[onclick^="planApplyDecision"]');
        d.boutonAppliquer = !!appliquer;
        appliquer?.click();
        await a(5000);
        const mien = (await plans()).find((p) => p.id === o.planId) || {};
        d.statut = mien.statut;
        d.valideLe = !!(mien.valide_le || mien.validation_le);
        // Le brouillon de décision est rendu : il ne traîne pas d'un plan à
        // l'autre.
        d.brouillonRendu = !window._planDecisionDraft;
        return d;
      });

      // ── 6. La ronde retire son plan ──
      await essai('menage', async () => {
        const d = {};
        d.suppression = await env(`/plans/${o.planId}`, 'DELETE');
        d.restants = (await plans()).length;
        d.rendueAuDepart = d.restants === o.deja;
        return d;
      });
      return o;
    }, '/api/m/planification');

    {
      const R = rondePlan;
      const Cr = R.creation || {};
      const Mo = R.modification || {};
      const So = R.soumission || {};
      const Co = R.commentaire || {};
      const De = R.decision || {};
      const Me = R.menage || {};
      verifier('un plan se crée par son formulaire, et le serveur le porte en brouillon avec son intitulé, son année et son type',
        Cr.bouton === true && Cr.champs === 3
        && Cr.listeType === true && Cr.domaines >= 2 && Cr.secteurs >= 2
        && Cr.apres === R.deja + 1 && !!R.planId
        && Cr.titre === 'Plan de la ronde automatique'
        && String(Cr.annee) === '2027' && Cr.type === 'periodique'
        // La version n'est pas rendue par la liste des plans : ne pas
        // l'exiger d'une source qui ne la porte pas.
        && Cr.statut === 'brouillon',
        JSON.stringify(Cr).slice(0, 420));
      verifier('le formulaire rouvert porte ce qui a été enregistré, la modification part en base, et modifier n’est pas soumettre',
        Mo.bouton === true && Mo.titreRepris === 'Plan de la ronde automatique'
        && Mo.boutonEnregistrer === true
        && Mo.titre === 'Plan de la ronde automatique — amendé'
        && String(Mo.annee) === '2028'
        // Le statut n'a pas bougé : c'est l'autre moitié du contrôle.
        && Mo.statut === 'brouillon',
        JSON.stringify(Mo));
      verifier('la soumission passe par une confirmation qui récapitule le plan, et le serveur l’inscrit soumis',
        So.semisActivite === 200 && So.detail === true && So.activites === 1
        && So.bouton === true
        && So.modale === true && So.recapitule === true
        && So.boutonConfirmer === true
        // Le statut **est** le fait. La liste des plans ne rend pas
        // d'horodatage de soumission : ne pas l'exiger d'une source qui ne le
        // porte pas (même leçon que la version, trois phases plus haut).
        && So.statut === 'soumis',
        JSON.stringify(So));
      verifier('un commentaire vide ne s’enregistre pas, puis un commentaire s’ajoute chez le serveur et se retire sur confirmation',
        Co.bouton === true && Co.champ === true
        && Co.apresVide === Co.avant
        && Co.apres === Co.avant + 1
        && /échéances/.test(String(Co.contenu || ''))
        && Co.boutonRetirer === true && Co.retraitConfirme === true
        && Co.apresRetrait === Co.avant,
        JSON.stringify(Co).slice(0, 400));
      verifier('la validation passe par une confirmation qui reprend la décision, le serveur valide le plan, et le brouillon de décision est rendu',
        De.page === 'workflow'
        && De.bouton === true && De.modale === true && De.brouillon === true
        && De.boutonAppliquer === true
        && De.statut === 'valide' && De.brouillonRendu === true,
        JSON.stringify(De));
      verifier('la ronde du plan retire ce qu’elle a créé, et le module revient à son compte',
        Me.suppression === 200 && Me.rendueAuDepart === true,
        JSON.stringify(Me));
    }

    // ══════════════════════════════════════════════════════════════════
    //  La saisie d'une activité, et la fin de vie d'un plan
    // ══════════════════════════════════════════════════════════════════
    //
    // Le tour précédent a semé son activité **par la route**, faute de pouvoir
    // soumettre un plan vide. Celui-ci la saisit **par le formulaire** — c'est
    // le cœur de la saisie du module, et la seule cascade de l'écran : choisir
    // un secteur fait paraître la table des sous-activités et de leurs thèmes,
    // et rien ne se coche avant.
    //
    // Puis la fin de vie du plan : archivé, et supprimé — par les boutons de
    // l'écran, non par la route.
    etape = 'activité d’un plan';
    await ouvrir('plans');
    await attendre(2500);
    const rondeAct = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const jget = async (u) => (await (await fetch(api + u, { credentials: 'same-origin' })).json());
      const env = async (url, methode, corps) => {
        const rep = await fetch(api + url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await rep.json(); } catch { /* vide */ }
        return { statut: rep.status, corps: b };
      };
      const plans = async () => {
        const r = await jget('/plans');
        return Array.isArray(r) ? r : (r.plans || []);
      };
      const oui = async () => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(3500);
        return true;
      };
      const S = () => window.PLAN_STATE || {};
      const act = () => ((S().selectedPlan || {}).activites || []);
      const poser = async (id, v, ev) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event(ev || 'input', { bubbles: true }));
        await a(600);
        return true;
      };

      // ── 1. Un plan semé par la route : il n'est pas le sujet ──
      o.deja = (await plans()).length;
      const cree = await env('/plans', 'POST', {
        titre: 'Plan de la ronde des activités', annee: 2029,
        type: 'periodique', domaine_id: '', secteur_id: '',
      });
      o.semis = cree.statut;
      if (typeof window.planLoadData === 'function') await window.planLoadData();
      await a(2500);
      const mien = (await plans()).find((p) => /ronde des activités/.test(p.titre || ''));
      o.planId = (mien || {}).id;

      // ── 2. Le formulaire d'activité, et sa cascade ──
      await essai('formulaire', async () => {
        const d = {};
        if (typeof window.planOpenDetail === 'function') await window.planOpenDetail(o.planId);
        await a(3500);
        d.detail = (S().selectedPlan || {}).id === o.planId;
        d.avant = act().length;
        const ajouter = [...document.querySelectorAll('[onclick*="planShowActivityModal("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.bouton = !!ajouter;
        ajouter?.click();
        await a(3000);
        d.champObjet = !!document.getElementById('actObjet');

        // ── La cascade : rien à cocher avant d'avoir choisi un secteur ──
        d.casesAvant = document.querySelectorAll('.actSACheck').length;
        d.indiceAvant = !!document.getElementById('actSAHint');
        const secteur = document.getElementById('actSecteur');
        d.listeSecteur = !!secteur;
        d.secteurs = secteur ? secteur.options.length : 0;
        if (secteur && secteur.options.length > 1) {
          secteur.value = secteur.options[1].value;
          secteur.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2500);
        }
        d.casesApres = document.querySelectorAll('.actSACheck').length;
        d.themesAvantSA = document.querySelectorAll('.actThemeCheck').length;
        d.cochesAvantSA = document.querySelectorAll('.actThemeCheck:checked').length;
        // La case d'une sous-activité et le volet qui la déplie sont **le même
        // geste** : cocher la case ouvre le volet, ouvrir le volet coche la case,
        // et dans les deux cas tous les thèmes de la sous-activité suivent. Le
        // contrôle exerce les deux chemins, faute de quoi il ne départage rien —
        // le premier contre-essai, qui n'avait désarmé que l'un des deux, est
        // resté vert.
        const volet = document.querySelector('details.sa-item');
        d.volet = !!volet;
        d.voletFermeAvant = volet ? !volet.open : null;
        const sa = volet && volet.querySelector('.actSACheck');
        if (sa) {
          sa.checked = true;
          sa.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2000);
        }
        // Chemin 1 : par la case — le volet s'ouvre, les thèmes se cochent.
        d.voletOuvertParCase = volet ? volet.open : null;
        d.saCochee = document.querySelectorAll('.actSACheck:checked').length;
        d.themes = document.querySelectorAll('.actThemeCheck').length;
        d.cochesParSA = volet
          ? volet.querySelectorAll('.actThemeCheck:checked').length : 0;
        d.compteur = (volet && (volet.querySelector('.sa-count') || {}).textContent || '').trim();
        // Chemin 2 : par le volet — le chevron le referme, la case et les thèmes
        // se décochent ; un second clic rétablit tout.
        const chevron = volet && volet.querySelector('.sa-chevron');
        d.chevron = !!chevron;
        chevron?.click();
        await a(1500);
        d.voletFerme = volet ? !volet.open : null;
        d.caseApresFermeture = sa ? sa.checked : null;
        d.cochesApresFermeture = volet
          ? volet.querySelectorAll('.actThemeCheck:checked').length : -1;
        chevron?.click();
        await a(1500);
        d.voletRouvert = volet ? volet.open : null;
        d.cochesApresReouverture = volet
          ? volet.querySelectorAll('.actThemeCheck:checked').length : -1;
        // Le geste à la main : un thème se décoche sans entraîner les autres.
        const th = document.querySelector('.actThemeCheck:checked');
        d.themeAtteignable = !!th;
        if (th) {
          th.checked = false;
          th.dispatchEvent(new Event('change', { bubbles: true }));
          await a(1200);
          d.apresDecoche = volet
            ? volet.querySelectorAll('.actThemeCheck:checked').length : -1;
          th.checked = true;
          th.dispatchEvent(new Event('change', { bubbles: true }));
          await a(1200);
        }
        d.themesCoches = document.querySelectorAll('.actThemeCheck:checked').length;

        // Le reste de la fiche.
        await poser('actObjet', 'Audit documentaire de la ronde');
        await poser('actDescription', 'Activité saisie par la ronde automatique.');
        await poser('actLieu', 'Cotonou');
        await poser('actDebut', '2029-04-02', 'change');
        await poser('actFin', '2029-04-06', 'change');
        await poser('actNbInspecteurs', '2', 'change');
        const prest = document.getElementById('actPrestataire');
        d.prestataires = prest ? prest.options.length : 0;
        if (prest && prest.options.length > 1) {
          prest.value = prest.options[1].value;
          prest.dispatchEvent(new Event('change', { bubbles: true }));
          await a(1200);
        }
        ['actModeSupervision', 'actTypeSupervision', 'actResponsable'].forEach(() => {});
        for (const id of ['actModeSupervision', 'actTypeSupervision', 'actResponsable']) {
          const e = document.getElementById(id);
          if (e && e.options && e.options.length > 1) {
            e.value = e.options[1].value;
            e.dispatchEvent(new Event('change', { bubbles: true }));
            /* eslint-disable no-await-in-loop */
            await a(600);
          }
        }

        const enregistrer = [...document.querySelectorAll('[onclick*="planCreateActivity("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.planId));
        d.boutonEnregistrer = !!enregistrer;
        enregistrer?.click();
        await a(5000);
        d.apres = act().length;
        const nouvelle = act()[0] || {};
        o.actId = nouvelle.id;
        d.objet = nouvelle.objet;
        d.lieu = nouvelle.lieu_activite;
        d.debut = nouvelle.date_debut;
        d.fin = nouvelle.date_fin;
        d.inspecteurs = nouvelle.nombre_inspecteurs;
        d.sousActivites = (nouvelle.sous_activite_ids || []).length;
        d.themesEnBase = (nouvelle.themes_couverts || []).length;
        return d;
      });

      // ── 3. La même activité modifiée, puis retirée ──
      await essai('reprise', async () => {
        const d = {};
        const editer = [...document.querySelectorAll('[onclick*="planShowActivityModal("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.actId));
        d.bouton = !!editer;
        editer?.click();
        await a(3000);
        d.objetRepris = (document.getElementById('actObjet') || {}).value;
        await poser('actObjet', 'Audit documentaire — repris');
        const enregistrer = [...document.querySelectorAll('[onclick*="planUpdateActivity("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.actId));
        d.boutonEnregistrer = !!enregistrer;
        enregistrer?.click();
        await a(5000);
        d.objet = (act()[0] || {}).objet;
        d.compte = act().length;

        const retirer = [...document.querySelectorAll('[onclick*="planDeleteActivity("]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.actId));
        d.boutonRetirer = !!retirer;
        retirer?.click();
        d.retraitConfirme = await oui();
        await a(2000);
        d.apresRetrait = act().length;
        return d;
      });

      // ── 4. L'archivage, puis la suppression — par les boutons de l'écran ──
      //
      // L'archivage **retire le plan de la page** : `planRenderPlans` écarte les
      // statuts `archive` et `remplace`. Ce n'est pas un bouton qui disparaît,
      // c'est la ligne entière — le plan subsiste en base, mais cette page ne le
      // montre plus, et aucun de ses gestes n'y est plus atteignable. D'où le
      // frère que la ronde doit semer pour éprouver la suppression par l'écran.
      await essai('finDeVie', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="plans"]')?.click();
        await a(3500);
        const parBouton = (fn, id) => [...document.querySelectorAll(`[onclick*="${fn}("]`)]
          .find((b) => (b.getAttribute('onclick') || '').includes(id));
        const ligne = (id) => [...document.querySelectorAll('[onclick*="planOpenDetail("]')]
          .some((b) => (b.getAttribute('onclick') || '').includes(id));
        d.ligneAvant = ligne(o.planId);
        d.boutonSupprimerAvant = !!parBouton('planDeletePlan', o.planId);
        const archiver = parBouton('planArchivePlan', o.planId);
        d.bouton = !!archiver;
        archiver?.click();
        d.archivageConfirme = await oui();
        await a(2000);
        d.statut = ((await plans()).find((p) => p.id === o.planId) || {}).statut;
        // La ligne a quitté la table, et ses gestes avec elle.
        d.ligneApres = ligne(o.planId);
        d.boutonSupprimerApres = !!parBouton('planDeletePlan', o.planId);
        d.boutonArchiverApres = !!parBouton('planArchivePlan', o.planId);

        // Un frère en brouillon, pour la suppression par l'écran.
        const frere = await env('/plans', 'POST', {
          titre: 'Plan frère de la ronde', annee: 2029,
          type: 'periodique', domaine_id: '', secteur_id: '',
        });
        d.semisFrere = frere.statut;
        const idFrere = ((await plans()).find((p) => /frère de la ronde/.test(p.titre || '')) || {}).id;
        d.frere = !!idFrere;
        // Deux gestes, non un : `planLoadData` recharge sans redessiner, et le
        // redessin seul rejoue l'état d'avant. Il faut recharger **puis**
        // redessiner — et attendre la ligne plutôt qu'un délai.
        let supprimer = null;
        let tours = 0;
        for (; tours < 10 && !supprimer; tours += 1) {
          /* eslint-disable no-await-in-loop */
          if (typeof window.planLoadData === 'function') await window.planLoadData();
          if (typeof window.planNavigateTo === 'function') window.planNavigateTo('plans');
          await a(1200);
          supprimer = parBouton('planDeletePlan', idFrere);
        }
        d.tours = tours;
        d.boutonSupprimer = !!supprimer;
        supprimer?.click();
        d.suppressionConfirmee = await oui();
        await a(2500);
        d.frereParti = !(await plans()).some((p) => p.id === idFrere);

        // Ménage : l'archivé ne part que par la route.
        d.menage = (await env(`/plans/${o.planId}`, 'DELETE')).statut;
        d.restants = (await plans()).length;
        d.rendueAuDepart = d.restants === o.deja;
        return d;
      });
      return o;
    }, '/api/m/planification');

    {
      const A = rondeAct;
      const Fo = A.formulaire || {};
      const Re = A.reprise || {};
      const Fv = A.finDeVie || {};
      verifier('le formulaire d’activité n’offre rien à cocher avant qu’un secteur soit choisi, et sa table paraît avec lui',
        A.semis === 200 && !!A.planId
        && Fo.detail === true && Fo.bouton === true && Fo.champObjet === true
        // La cascade : aucune case avant le secteur, un indice à la place.
        && Fo.casesAvant === 0 && Fo.indiceAvant === true
        && Fo.listeSecteur === true && Fo.secteurs >= 2
        && Fo.casesApres >= 1,
        JSON.stringify(Fo).slice(0, 440));
      verifier('la case d’une sous-activité et son volet sont le même geste : l’un entraîne l’autre, et tous ses thèmes suivent',
        // Les thèmes paraissent avec le secteur, mais aucun n'est coché d'avance.
        Fo.volet === true && Fo.voletFermeAvant === true
        && Fo.themesAvantSA >= 1 && Fo.cochesAvantSA === 0
        // Chemin 1 : la case ouvre le volet et coche ses thèmes.
        && Fo.voletOuvertParCase === true && Fo.saCochee === 1
        && Fo.cochesParSA >= 1 && Fo.cochesParSA <= Fo.themes
        && Fo.compteur.startsWith(`${Fo.cochesParSA}/${Fo.cochesParSA}`)
        // Chemin 2 : le chevron referme, et décoche la case comme les thèmes.
        && Fo.chevron === true && Fo.voletFerme === true
        && Fo.caseApresFermeture === false && Fo.cochesApresFermeture === 0
        // Rouvert, tout est rétabli.
        && Fo.voletRouvert === true && Fo.cochesApresReouverture === Fo.cochesParSA
        // Un thème se décoche seul, sans entraîner les autres.
        && Fo.themeAtteignable === true
        && Fo.apresDecoche === Fo.cochesParSA - 1
        && Fo.themesCoches === Fo.cochesParSA,
        JSON.stringify({ voletAvant: Fo.voletFermeAvant, total: Fo.themes,
          cochesAvant: Fo.cochesAvantSA, ouvertParCase: Fo.voletOuvertParCase,
          parSA: Fo.cochesParSA, compteur: Fo.compteur, ferme: Fo.voletFerme,
          caseFermee: Fo.caseApresFermeture, cochesFerme: Fo.cochesApresFermeture,
          rouvert: Fo.voletRouvert, cochesRouvert: Fo.cochesApresReouverture,
          decoche: Fo.apresDecoche, fin: Fo.themesCoches }));
      verifier('l’activité saisie part chez le serveur avec son objet, son lieu, ses dates, ses inspecteurs, sa sous-activité et ses thèmes',
        Fo.boutonEnregistrer === true && Fo.apres === Fo.avant + 1 && !!A.actId
        && Fo.objet === 'Audit documentaire de la ronde'
        && Fo.lieu === 'Cotonou'
        && Fo.debut === '2029-04-02' && Fo.fin === '2029-04-06'
        && Number(Fo.inspecteurs) === 2
        && Fo.sousActivites === 1 && Fo.themesEnBase === Fo.cochesParSA,
        JSON.stringify({ objet: Fo.objet, lieu: Fo.lieu, debut: Fo.debut, fin: Fo.fin,
          inspecteurs: Fo.inspecteurs, sa: Fo.sousActivites,
          themes: Fo.themesEnBase, attendus: Fo.cochesParSA }));
      verifier('la fiche rouverte porte ce qui a été saisi, la modification part en base, et l’activité se retire sur confirmation',
        Re.bouton === true && Re.objetRepris === 'Audit documentaire de la ronde'
        && Re.boutonEnregistrer === true
        && Re.objet === 'Audit documentaire — repris' && Re.compte === 1
        && Re.boutonRetirer === true && Re.retraitConfirme === true
        && Re.apresRetrait === 0,
        JSON.stringify(Re));
      verifier('un plan s’archive sur confirmation, et l’archivage retire sa ligne de la page tout en le gardant en base',
        Fv.ligneAvant === true && Fv.boutonSupprimerAvant === true
        && Fv.bouton === true && Fv.archivageConfirme === true
        // Le plan subsiste, avec son nouveau statut…
        && Fv.statut === 'archive'
        // …mais la page des plans ne le montre plus, et aucun de ses gestes
        // n'y est plus atteignable.
        && Fv.ligneApres === false
        && Fv.boutonSupprimerApres === false && Fv.boutonArchiverApres === false,
        JSON.stringify(Fv).slice(0, 400));
      verifier('un plan en brouillon se supprime par le bouton de sa ligne, et le module revient à son compte',
        Fv.semisFrere === 200 && Fv.frere === true
        && Fv.boutonSupprimer === true && Fv.suppressionConfirmee === true
        && Fv.frereParti === true
        && Fv.menage === 200 && Fv.rendueAuDepart === true,
        JSON.stringify(Fv).slice(0, 400));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Le circuit de décision, et l'amendement d'un plan validé
    // ══════════════════════════════════════════════════════════════════
    //
    // Jusqu'ici la ronde menait un plan jusqu'à la validation. Le circuit en
    // offre quatre autres sorties, et chacune est un acte d'autorité : rejeter,
    // rejeter définitivement, approuver au nom du directeur, transmettre au
    // prestataire. Et pour un plan déjà validé, l'**amendement** — qui en fait
    // une copie en brouillon, laissant l'original intact.
    //
    // Deux mécanismes que ce dépôt n'avait jamais exercés :
    //   · `oasisSaisir`, l'invite textuelle du socle (`.oasis-saisie-champ`) ;
    //   · deux invites **enchaînées** — `planApprouverDG` en demande deux.
    etape = 'circuit de décision';
    await ouvrir('plans');
    await attendre(2500);
    const rondeCircuit = await page.evaluate(async (api) => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const env = async (url, methode, corps) => {
        const rep = await fetch(api + url, {
          method: methode, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        let b = null; try { b = await rep.json(); } catch { /* vide */ }
        return { statut: rep.status, corps: b };
      };
      const plans = async () => {
        const r = await (await fetch(`${api}/plans`, { credentials: 'same-origin' })).json();
        return Array.isArray(r) ? r : (r.plans || []);
      };
      const statutDe = async (id) => ((await plans()).find((p) => p.id === id) || {}).statut;
      // La confirmation du socle.
      const oui = async (attente) => {
        await a(900);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return false;
        b.click();
        await a(attente || 2500);
        return true;
      };
      // L'invite textuelle : on la remplit, puis on valide.
      const saisir = async (texte, attente) => {
        await a(900);
        const champ = document.querySelector('.oasis-saisie-champ');
        if (!champ) return null;
        const avant = { requis: !!document.querySelector('.oasis-confirm-oui')?.disabled };
        champ.value = texte;
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(400);
        const b = document.querySelector('.oasis-confirm-oui');
        if (!b) return null;
        avant.actifApres = !b.disabled;
        b.click();
        await a(attente || 3000);
        return avant;
      };
      const parBouton = (fn, id) => [...document.querySelectorAll(`[onclick*="${fn}("]`)]
        .find((b) => (b.getAttribute('onclick') || '').includes(id));
      const S = () => window.PLAN_STATE || {};

      // ── 1. Quatre plans semés par la route : ils ne sont pas le sujet ──
      //
      // Le formulaire, la soumission et la validation par l'écran ont leur
      // propre tour. Ici c'est la **suite** du circuit qu'on mesure, et un plan
      // ne l'atteint qu'en étant déjà validé ou soumis.
      o.deja = (await plans()).length;
      o.role = (window.PESSCO && window.PESSCO.user && window.PESSCO.user.role) || null;
      const semer = async (titre, jusqua) => {
        const c = await env('/plans', 'POST', {
          titre, annee: 2030, type: 'periodique', domaine_id: '', secteur_id: '',
        });
        const id = (c.corps || {}).id;
        if (!id) return null;
        await env(`/plans/${id}/activites`, 'POST', {
          objet: `Activité du plan « ${titre} »`, date_debut: '2030-05-04',
          date_fin: '2030-05-08', nombre_inspecteurs: 1, lieu_activite: 'Lomé',
        });
        if (jusqua === 'soumis' || jusqua === 'valide') {
          await env(`/plans/${id}/soumettre`, 'POST', {});
        }
        if (jusqua === 'valide') {
          await env(`/plans/${id}/valider`, 'POST', { commentaire: 'Semé validé.' });
        }
        return id;
      };
      o.idAmend = await semer('Circuit — à amender', 'valide');
      o.idRejet = await semer('Circuit — à rejeter', 'soumis');
      o.idClos = await semer('Circuit — à clore', 'soumis');
      o.idDG = await semer('Circuit — pour le DG', 'valide');
      o.semis = [o.idAmend, o.idRejet, o.idClos, o.idDG].filter(Boolean).length;
      o.statutsSemes = {
        amend: await statutDe(o.idAmend), rejet: await statutDe(o.idRejet),
        clos: await statutDe(o.idClos), dg: await statutDe(o.idDG),
      };
      if (typeof window.planLoadData === 'function') await window.planLoadData();
      await a(2000);

      // ── 2. L'amendement : une copie en brouillon, l'original intact ──
      await essai('amendement', async () => {
        const d = {};
        if (typeof window.planOpenDetail === 'function') await window.planOpenDetail(o.idAmend);
        await a(3500);
        const bouton = parBouton('planAmend', o.idAmend);
        d.bouton = !!bouton;
        bouton?.click();
        // Confirmation, puis l'invite du motif.
        d.confirme = await oui(1200);
        const inv = await saisir('Amendement de la ronde : deux activités à ajouter.', 4000);
        d.inviteVue = !!inv;
        d.inviteActive = inv ? inv.actifApres : null;
        await a(2500);
        // Le module ouvre la **copie** : c'est elle qui est à l'écran.
        const vu = (S().selectedPlan || {});
        d.enfantOuvert = vu.id && vu.id !== o.idAmend;
        o.idEnfant = d.enfantOuvert ? vu.id : null;
        d.statutEnfant = vu.statut;
        d.parentDeLEnfant = vu.parent_plan_id === o.idAmend;
        d.motifPorte = typeof vu.motif_amendement === 'string'
          ? vu.motif_amendement.includes('deux activités') : null;
        // Le serveur numérote la copie : la version du parent, plus un.
        d.versionEnfant = vu.version;
        d.versionParent = ((await plans()).find((p) => p.id === o.idAmend) || {}).version;
        // L'original n'a pas bougé…
        d.statutParent = await statutDe(o.idAmend);
        // …et il n'offre plus l'amendement : un plan n'a qu'un enfant à la fois.
        if (typeof window.planOpenDetail === 'function') await window.planOpenDetail(o.idAmend);
        await a(3000);
        d.amenderEncore = !!parBouton('planAmend', o.idAmend);
        return d;
      });

      // ── 3. L'amendement annulé : le parent reste validé ──
      await essai('annulation', async () => {
        const d = {};
        if (!o.idEnfant) return { saute: 'pas d’enfant' };
        if (typeof window.planOpenDetail === 'function') await window.planOpenDetail(o.idEnfant);
        await a(3500);
        const bouton = parBouton('planCancelAmendment', o.idEnfant);
        d.bouton = !!bouton;
        bouton?.click();
        d.confirme = await oui(1200);
        const inv = await saisir('Annulation par la ronde : amendement sans objet.', 4000);
        d.inviteVue = !!inv;
        await a(2500);
        // Le module ramène au parent.
        d.retourAuParent = (S().selectedPlan || {}).id === o.idAmend;
        d.statutParent = await statutDe(o.idAmend);
        d.enfantParti = !(await plans()).some((p) => p.id === o.idEnfant);
        // Le parent peut de nouveau être amendé.
        d.amendableANouveau = !!parBouton('planAmend', o.idAmend);
        return d;
      });

      // ── 4. Le rejet : la fenêtre récapitule, et avertit quand rien n'est dit ──
      await essai('rejet', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="workflow"]')?.click();
        await a(3500);
        d.pageCircuit = (S().currentPage === 'workflow');
        // `planAccBasculer(this)` reçoit l'élément, non un identifiant : on ne
        // peut pas viser le volet d'un plan par son attribut. Et on n'en a pas
        // besoin — le constat qui compte est que **les gestes de décision sont
        // dans le DOM sans dépliage**, l'accordéon ne faisant que les montrer.
        d.gestesSansDepliage = !!parBouton('planReject', o.idRejet);
        document.querySelector('[onclick*="planAccBasculer"]')?.click();
        await a(2000);
        const bouton = parBouton('planReject', o.idRejet);
        d.bouton = !!bouton;
        bouton?.click();
        await a(2500);
        // Sans commentaire, la fenêtre le signale — et ne l'interdit pas.
        d.fenetre = !!document.querySelector('.modal-overlay');
        // L'avertissement « rejet sans commentaire » porte sa couleur en style
        // intégré : c'est ce qui le distingue des autres paragraphes, dont le
        // libellé du champ, qui parle aussi de commentaire.
        d.avertieSansCommentaire = !!document.querySelector('.modal-overlay [style*="b45309"]');
        d.appliquerOffert = !!document.querySelector('[onclick*="planApplyDecision"]');
        // On referme, on dit quelque chose, et l'on rouvre.
        document.querySelector('[onclick*="planCloseModal"]')?.click();
        await a(1500);
        d.fenetreFermee = !document.querySelector('.modal-overlay');
        const champ = document.getElementById(`validComment_${o.idRejet}`);
        d.champCommentaire = !!champ;
        if (champ) {
          champ.value = 'Rejeté par la ronde : périmètre incomplet.';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await a(600);
        }
        parBouton('planReject', o.idRejet)?.click();
        await a(2500);
        d.recapPorteLeCommentaire = (document.querySelector('.valid-comment-recap')?.textContent || '')
          .includes('périmètre incomplet');
        document.querySelector('[onclick*="planApplyDecision"]')?.click();
        await a(4000);
        d.statut = await statutDe(o.idRejet);
        d.fenetreRefermee = !document.querySelector('.modal-overlay');
        return d;
      });

      // ── 5. Le rejet définitif, et ce qui le distingue ──
      await essai('rejetClos', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="workflow"]')?.click();
        await a(3000);
        const entete = [...document.querySelectorAll('[onclick*="planAccBasculer"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(o.idClos));
        entete?.click();
        await a(2000);
        const champ = document.getElementById(`validComment_${o.idClos}`);
        if (champ) {
          champ.value = 'Clos par la ronde : plan sans objet.';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
          await a(600);
        }
        const bouton = parBouton('planRejectClose', o.idClos);
        d.bouton = !!bouton;
        bouton?.click();
        await a(2500);
        d.fenetre = !!document.querySelector('.modal-overlay');
        d.titreDistinct = (document.querySelector('.modal-overlay .modal-title, .modal-overlay h3')?.textContent || '').trim();
        document.querySelector('[onclick*="planApplyDecision"]')?.click();
        await a(4000);
        d.statut = await statutDe(o.idClos);
        return d;
      });

      // ── 6. Deux actes du circuit que l'écran n'offre nulle part ──
      //
      // `planApprouverDG` et `planTransmettre` — l'approbation du directeur
      // général et la transmission au prestataire, Chap. 4 §4.2.3.e-f — sont
      // rendus par `_renderPlanDiffAccordion`, sous condition de statut
      // `valide` / `approuve_dg`. Or ce rendu n'est appelé qu'**une fois** dans
      // tout le module, sur `pending = plans.filter(p => p.statut === 'soumis')`.
      //
      // Les deux conditions s'excluent : un plan soumis n'est ni validé ni
      // approuvé. **Les deux boutons ne peuvent donc jamais paraître.** Ce
      // contrôle le constate, et montre que le manque est dans l'écran seul :
      // les transitions du serveur, elles, fonctionnent.
      await essai('directeur', async () => {
        const d = {};
        // Les deux plans soumis ont été rejetés par les phases précédentes : la
        // page du circuit est vide, et une page vide ne départage rien. Cette
        // phase sème donc son propre témoin — *une ronde qui suit une autre
        // commence par relever ce qu'elle hérite.*
        o.idTemoin = await semer('Circuit — témoin soumis', 'soumis');
        d.temoin = !!o.idTemoin;
        if (typeof window.planLoadData === 'function') await window.planLoadData();
        await a(1500);
        document.querySelector('.nav-btn[data-page="workflow"]')?.click();
        await a(3500);
        // La page ne montre que les plans soumis…
        const titres = (document.querySelector('.page-content, main') || document.body).textContent || '';
        d.montreLeSoumis = titres.includes('Circuit — témoin soumis');
        d.montreLeValide = titres.includes('Circuit — pour le DG');
        // …et aucun des deux gestes n'est dans le DOM, pour aucun plan.
        d.approuverNullePart = document.querySelectorAll('[onclick*="planApprouverDG"]').length;
        d.transmettreNullePart = document.querySelectorAll('[onclick*="planTransmettre"]').length;
        // Le serveur, lui, sait faire les deux transitions.
        d.statutAvant = await statutDe(o.idDG);
        d.routeDG = (await env(`/plans/${o.idDG}/approuver-dg`, 'POST',
          { commentaire: 'Par la route, faute d’écran.' })).statut;
        d.statutApresDG = await statutDe(o.idDG);
        d.routeTransmettre = (await env(`/plans/${o.idDG}/transmettre`, 'POST', {})).statut;
        d.statutApresTransmission = await statutDe(o.idDG);

        // ── Où est le manque, exactement ──
        //
        // La fonction de rendu, appelée à la main sur un plan validé, **porte**
        // le bouton : la condition de rôle passe (`_isAdmin()` reconnaît le
        // SUPERADMIN, ce que la comparaison à `'Administrateur'` ne faisait
        // pas), et la condition de statut est satisfaite. Ce qui manque est le
        // seul **appel** : la page ne lui donne jamais de plan validé.
        d.role = o.role;
        const rendu = (statut) => {
          if (typeof window._renderPlanDiffAccordion !== 'function') return null;
          try {
            return window._renderPlanDiffAccordion({
              id: 'essai-rendu', titre: 'Essai de rendu', version: 1,
              statut, secteur_id: '', parent_plan_id: null,
            });
          } catch { return null; }
        };
        const htmlValide = rendu('valide');
        const htmlApprouve = rendu('approuve_dg');
        const htmlSoumis = rendu('soumis');
        d.renduJoignable = typeof htmlValide === 'string';
        d.renduValidePorteDG = !!htmlValide && htmlValide.includes('planApprouverDG');
        d.renduApprouvePorteTransmettre = !!htmlApprouve && htmlApprouve.includes('planTransmettre');
        // Et le soumis — le seul que la page lui donne — ne porte ni l'un ni l'autre.
        d.renduSoumisPorteNiLUnNiLAutre = !!htmlSoumis
          && !htmlSoumis.includes('planApprouverDG')
          && !htmlSoumis.includes('planTransmettre');
        return d;
      });

      // ── 7. L'historique du circuit d'une version ──
      await essai('historique', async () => {
        const d = {};
        document.querySelector('.nav-btn[data-page="historique"]')?.click();
        await a(3500);
        const bouton = document.querySelector('[onclick*="planShowWorkflowHistory"]');
        d.bouton = !!bouton;
        bouton?.click();
        await a(3000);
        const f = document.querySelector('.modal-overlay');
        d.fenetre = !!f;
        d.garnie = f ? (f.textContent || '').trim().length > 40 : false;
        document.querySelector('[onclick*="planCloseModal"]')?.click();
        await a(1500);
        d.fermee = !document.querySelector('.modal-overlay');
        return d;
      });

      // ── 8. Ménage ──
      // L'annulation d'amendement a déjà retiré l'enfant : le re-supprimer
      // vaudrait un 404, et le contrôle des requêtes échouées le verrait.
      const encore = (await plans()).map((p) => p.id);
      for (const id of [o.idAmend, o.idRejet, o.idClos, o.idDG, o.idEnfant, o.idTemoin]) {
        if (id && encore.includes(id)) await env(`/plans/${id}`, 'DELETE');
      }
      o.restants = (await plans()).length;
      o.rendueAuDepart = o.restants === o.deja;
      return o;
    }, '/api/m/planification');

    {
      const C = rondeCircuit;
      const Am = C.amendement || {};
      const An = C.annulation || {};
      const Re = C.rejet || {};
      const Cl = C.rejetClos || {};
      const Dg = C.directeur || {};
      const Hi = C.historique || {};
      verifier('l’amendement d’un plan validé en fait une copie en brouillon, laisse l’original validé, et ne se répète pas',
        C.semis === 4
        && C.statutsSemes.amend === 'valide' && C.statutsSemes.rejet === 'soumis'
        && Am.bouton === true && Am.confirme === true
        // L'invite textuelle du socle, que ce dépôt n'avait jamais exercée.
        && Am.inviteVue === true && Am.inviteActive === true
        && Am.enfantOuvert === true && Am.statutEnfant === 'brouillon'
        && Am.parentDeLEnfant === true
        // Le motif saisi dans l'invite parvient au serveur, et la copie est
        // numérotée à la suite du parent.
        && Am.motifPorte === true
        && Am.versionEnfant === (Am.versionParent || 1) + 1
        && Am.statutParent === 'valide'
        // Un plan n'a qu'un amendement à la fois.
        && Am.amenderEncore === false,
        JSON.stringify({ semis: C.statutsSemes, ...Am }).slice(0, 420));
      verifier('l’amendement annulé rend le parent amendable, et la copie ne subsiste pas',
        An.bouton === true && An.confirme === true && An.inviteVue === true
        && An.retourAuParent === true
        && An.statutParent === 'valide'
        && An.enfantParti === true
        && An.amendableANouveau === true,
        JSON.stringify(An));
      verifier('le rejet passe par une fenêtre qui récapitule le commentaire du valideur, et le serveur inscrit le plan rejeté',
        Re.pageCircuit === true && Re.gestesSansDepliage === true && Re.bouton === true
        && Re.fenetre === true && Re.appliquerOffert === true
        && Re.fenetreFermee === true && Re.champCommentaire === true
        && Re.recapPorteLeCommentaire === true
        && Re.statut === 'rejete' && Re.fenetreRefermee === true,
        JSON.stringify(Re));
      verifier('le rejet définitif est un autre geste, avec sa propre fenêtre, et son propre statut',
        Cl.bouton === true && Cl.fenetre === true
        && Cl.titreDistinct.length > 0
        && typeof Cl.statut === 'string' && Cl.statut !== 'soumis'
        && Cl.statut !== Re.statut,
        JSON.stringify(Cl));
      verifier('l’approbation du directeur et la transmission au prestataire ne sont offertes par aucun écran, alors que le serveur les exécute',
        // La page du circuit ne liste que les plans soumis : un plan validé
        // n'y paraît pas, et c'est là que les deux boutons seraient rendus.
        Dg.temoin === true
        && Dg.montreLeSoumis === true && Dg.montreLeValide === false
        // Les deux gestes sont absents du document, pour tout plan.
        && Dg.approuverNullePart === 0 && Dg.transmettreNullePart === 0
        // Le dispositif sait pourtant faire les deux transitions : le manque
        // est dans l'écran, non dans le serveur.
        && Dg.statutAvant === 'valide'
        && Dg.routeDG === 200 && Dg.statutApresDG === 'approuve_dg'
        && Dg.routeTransmettre === 200 && Dg.statutApresTransmission === 'transmis'
        // Le manque est le seul **appel** : la fonction de rendu, appelée à la
        // main sur un plan validé, porte bien le bouton — la condition de rôle
        // passe depuis qu'elle suit `_isAdmin()` comme le reste du module.
        && Dg.renduJoignable === true
        && Dg.renduValidePorteDG === true
        && Dg.renduApprouvePorteTransmettre === true
        && Dg.renduSoumisPorteNiLUnNiLAutre === true,
        JSON.stringify(Dg).slice(0, 460));
      verifier('l’historique du circuit d’une version s’ouvre garni et se referme',
        Hi.bouton === true && Hi.fenetre === true && Hi.garnie === true
        && Hi.fermee === true,
        JSON.stringify(Hi));
      verifier('la ronde du circuit rend le module à son compte',
        C.rendueAuDepart === true, JSON.stringify({ deja: C.deja, restants: C.restants }));
    }

    // ══════════════════════════════════════════════════════════════════
    //  Les filtres de PLAN, et les deux barres qui n'en partagent rien
    // ══════════════════════════════════════════════════════════════════
    //
    // Treize facettes, et aucune n'était exercée. Deux barres distinctes, qui
    // ne partagent ni leur état ni leur code : `_renderFilterBar`, que cinq
    // pages se donnent avec des options différentes, écrit dans
    // `PLAN_STATE.filters` ; le calendrier a la sienne, dans
    // `PLAN_STATE.calFilters`.
    //
    // La leçon de 5.f.37 commande la forme de ce contrôle : *une facette
    // éprouvée avec une valeur qu'elle n'offre pas ne filtre rien et passe pour
    // bonne.* On prend donc chaque valeur dans les `<option>` de la facette
    // elle-même, et l'on vérifie l'état retenu, non un simple comptage.
    etape = 'filtres de PLAN';
    await ouvrir('dashboard');
    await attendre(2500);
    const rondeFiltres = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.PLAN_STATE || {};
      // Une facette se vise par ce qu'elle écrit : elle n'a pas d'identifiant.
      const facette = (cle) => [...document.querySelectorAll('select')]
        .find((s) => (s.getAttribute('onchange') || '').includes(`${cle}=this.value`));
      // On la règle sur une valeur qu'elle offre, et l'on rend ce qu'on a posé.
      const regler = async (cle, attente) => {
        const s = facette(cle);
        if (!s) return { trouvee: false };
        const choix = [...s.options].find((op) => op.value);
        if (!choix) return { trouvee: true, offre: false, options: s.options.length };
        s.value = choix.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        await a(attente || 1600);
        return { trouvee: true, offre: true, pose: choix.value, libelle: (choix.textContent || '').trim() };
      };
      const lu = (chemin) => chemin.split('.').reduce((x, k) => (x || {})[k], S());

      // ── 1. La barre partagée, sur le tableau de bord qui porte tout ──
      await essai('barre', async () => {
        const d = {};
        d.page = S().currentPage;
        // Les six facettes sont-elles là ? Le tableau de bord les demande toutes.
        d.presentes = ['filters.domaine', 'filters.secteur', 'filters.sousActivite',
          'filters.theme', 'filters.prestataire', 'filters.statut']
          .filter((c) => !!facette(`PLAN_STATE.${c}`)).length;

        // ── Les facettes dépendantes d'abord, elles aussi ──
        //
        // Le thème et le prestataire sont restreints par le domaine et le
        // secteur (`dansLePerimetre`). Réglés après eux, ils n'offraient plus
        // rien, et deux noms restaient non exercés faute d'avoir été pris dans
        // le bon ordre. C'est le même constat que sur la barre du calendrier.
        d.themeTot = await regler('PLAN_STATE.filters.theme', 1800);
        d.themeRetenuTot = d.themeTot.offre === true
          ? lu('filters.theme') === d.themeTot.pose : null;
        d.prestataireTot = await regler('PLAN_STATE.filters.prestataire', 1800);
        d.prestataireRetenuTot = d.prestataireTot.offre === true
          ? lu('filters.prestataire') === d.prestataireTot.pose : null;

        // ── La cascade ne se mesure que sur un état non vide ──
        //
        // Mon premier jet réglait le domaine d'emblée et vérifiait que le
        // secteur était vide. Il l'était **déjà** : le contrôle passait sur
        // rien, et le contre-essai qui retirait l'effacement ne faisait rien
        // tomber. *Un contrôle qui ne relève pas son état de départ ne prouve
        // pas qu'un geste l'a changé.*
        //
        // On pose donc un secteur et une sous-activité d'abord, et c'est leur
        // disparition que l'on mesure.
        const semis = await regler('PLAN_STATE.filters.secteur', 2000);
        d.secteurSeme = semis.offre === true && lu('filters.secteur') === semis.pose;
        const semisSA = await regler('PLAN_STATE.filters.sousActivite', 2000);
        d.sousActiviteSemee = semisSA.offre === true
          ? lu('filters.sousActivite') === semisSA.pose : null;
        d.avantDomaine = {
          secteur: lu('filters.secteur') || '',
          sousActivite: lu('filters.sousActivite') || '',
        };

        // Le domaine, maintenant : il **remet à vide** ce qui dépend de lui.
        d.domaine = await regler('PLAN_STATE.filters.domaine', 2200);
        d.domaineRetenu = lu('filters.domaine') === d.domaine.pose;
        d.secteurVide = (lu('filters.secteur') || '') === '';
        d.sousActiviteVide = (lu('filters.sousActivite') || '') === '';

        // Le secteur, de nouveau : restreint au domaine retenu — la cascade.
        d.secteur = await regler('PLAN_STATE.filters.secteur', 2200);
        d.secteurRetenu = lu('filters.secteur') === d.secteur.pose;
        d.sousActiviteVideEncore = (lu('filters.sousActivite') || '') === '';

        d.sousActivite = await regler('PLAN_STATE.filters.sousActivite', 2000);
        d.sousActiviteRetenue = d.sousActivite.offre
          ? lu('filters.sousActivite') === d.sousActivite.pose : null;
        d.theme = await regler('PLAN_STATE.filters.theme', 1800);
        d.themeRetenu = d.theme.offre ? lu('filters.theme') === d.theme.pose : null;
        d.prestataire = await regler('PLAN_STATE.filters.prestataire', 1800);
        d.prestataireRetenu = d.prestataire.offre
          ? lu('filters.prestataire') === d.prestataire.pose : null;
        d.statut = await regler('PLAN_STATE.filters.statut', 1800);
        d.statutRetenu = d.statut.offre ? lu('filters.statut') === d.statut.pose : null;

        // La réinitialisation remplace l'objet entier — l'année comprise, que
        // mon premier énoncé prétendait épargnée. On pose donc une année avant,
        // pour que son effacement se mesure au lieu de se supposer.
        const annee = await regler('PLAN_STATE.filters.annee', 1800);
        d.anneeSemee = annee.offre === true ? lu('filters.annee') === annee.pose : null;
        d.avantReset = Object.fromEntries(
          ['domaine', 'secteur', 'theme', 'prestataire', 'statut', 'annee']
            .map((k) => [k, lu(`filters.${k}`) || '']),
        );
        d.posesAvantReset = Object.values(d.avantReset).filter(Boolean).length;
        document.querySelector('[onclick*="planResetFilters"]')?.click();
        await a(2200);
        const apres = S().filters || {};
        d.toutRemisAZero = ['domaine', 'secteur', 'sousActivite', 'theme',
          'prestataire', 'statut', 'search', 'annee']
          .every((k) => (apres[k] || '') === '');
        return d;
      });

      // ── 2. La barre du calendrier, qui ne partage rien avec la première ──
      await essai('calendrier', async () => {
        const d = {};
        // Le volet n'est offert que par le tableau de bord — et par « Mes
        // activités ». Depuis la page des plans, le bouton n'existe pas : mon
        // premier jet y cherchait un geste qui n'y est jamais.
        if (typeof window.planNavigateTo === 'function') window.planNavigateTo('dashboard');
        await a(2500);
        document.querySelector('[onclick^="planChoisirCarte"]')?.click();
        await a(1400);
        document.querySelector('[onclick^="planOuvrirCalendrier"]')?.click();
        await a(3200);
        d.volet = (document.getElementById('planVolet') || { innerHTML: '' }).innerHTML.length > 500;
        d.presentes = ['calFilters.domaine', 'calFilters.secteur', 'calFilters.prestataire',
          'calFilters.trimestre', 'calFilters.responsable']
          .filter((c) => !!facette(`PLAN_STATE.${c}`)).length;
        // ── L'ordre des facettes n'est pas indifférent ──
        //
        // Le domaine et le secteur **restreignent** les organismes offerts
        // (`_planCalRestreindre`). Réglés d'abord, ils laissaient la facette des
        // prestataires avec sa seule option « tous » — et une facette sans choix
        // ne se mesure pas. On règle donc les dépendantes d'abord.
        d.cinq = {};
        for (const cle of ['prestataire', 'responsable', 'trimestre', 'domaine', 'secteur']) {
          /* eslint-disable no-await-in-loop */
          const r = await regler(`PLAN_STATE.calFilters.${cle}`, 1700);
          d.cinq[cle] = r.offre ? (lu(`calFilters.${cle}`) === r.pose) : r;
        }
        d.champRecherche = !!document.getElementById('plan-cal-search');
        return d;
      });

      // ── La recherche du calendrier, frappée pour de vrai ──
      //
      // `_pesSearchInput` diffère de 300 ms, puis **relit le champ par son
      // identifiant** — et chaque réglage de facette redessine le volet, donc
      // recrée ce champ. Une valeur posée par la main du contrôle sur un
      // élément détaché ne serait jamais lue. C'est le geste réel qu'il faut :
      // la frappe vient de `page.type`, hors de cette fonction.
      o.avantFrappe = ((S().calFilters || {}).search || '');
      return o;
    });

    await page.type('#plan-cal-search', 'ronde', { delay: 40 });
    // Le différé du socle : 300 ms après la dernière frappe, plus le redessin.
    await attendre(2000);

    const rondeFiltres2 = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const S = () => window.PLAN_STATE || {};
      const d = {};
      d.rechercheRetenue = ((S().calFilters || {}).search || '') === 'ronde';
      d.champPorteLaValeur = (document.getElementById('plan-cal-search') || {}).value === 'ronde';
      // Et la réinitialisation du calendrier, qui remplace l'objet entier.
      const reset = [...document.querySelectorAll('[onclick*="calFilters={"]')][0];
      d.boutonReset = !!reset;
      reset?.click();
      await a(2200);
      const c = S().calFilters || {};
      d.toutRemisAZero = ['domaine', 'secteur', 'prestataire', 'trimestre', 'responsable', 'search']
        .every((k) => (c[k] || '') === '');
      return d;
    });

    const rondeFiltres3 = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const o = {};
      const essai = async (nom, f) => {
        try { o[nom] = await f(); }
        catch (e) { o[nom] = { erreur: String((e && e.message) || e) }; }
      };
      const S = () => window.PLAN_STATE || {};
      const lu = (chemin) => chemin.split('.').reduce((x, k) => (x || {})[k], S());

      // ── Les vues du calendrier : le mois, l'année, la bascule ──
      await essai('vues', async () => {
        const d = {};
        d.vueDepart = lu('calendarView');
        d.moisDepart = lu('calendarMonth');
        d.anneeDepart = lu('calendarYear');
        // Reculer d'un mois, puis d'une année.
        document.querySelector('[onclick*="calendarMonth=Math.max"]')?.click();
        await a(1800);
        d.moisRecule = lu('calendarMonth');
        document.querySelector('[onclick*="calendarYear--"]')?.click();
        await a(1800);
        d.anneeRecule = lu('calendarYear');
        document.querySelector('[onclick*="calendarYear++"]')?.click();
        await a(1800);
        d.anneeRendue = lu('calendarYear');
        // La bascule de vue : deux boutons, `month` et `week`. Partir de
        // `month` pour y revenir ne prouverait rien — on va à l'autre, puis
        // l'on revient.
        const versSemaine = document.querySelector('[onclick*="calendarView=\'week\'"]');
        d.boutonSemaine = !!versSemaine;
        versSemaine?.click();
        await a(2000);
        d.vueSemaine = lu('calendarView');
        const versMois = document.querySelector('[onclick*="calendarView=\'month\'"]');
        d.boutonVue = !!versMois;
        versMois?.click();
        await a(2000);
        d.vueApres = lu('calendarView');
        document.querySelector('[onclick*="planFermerCalendrier"]')?.click();
        await a(1500);
        d.voletFerme = !document.querySelector('[onclick*="planFermerCalendrier"]');
        return d;
      });

      // ── « Mes activités » et ses filtres propres ──
      await essai('mesActivites', async () => {
        const d = {};
        if (typeof window.planNavigateTo === 'function') window.planNavigateTo('mes-activites');
        await a(3000);
        d.page = S().currentPage;
        // `planMaSetFiltre` écrit dans `PLAN_MA_FILTRES`, une variable du
        // fichier — hors de `PLAN_STATE`, et hors de notre portée. On mesure
        // donc par l'effet : la page est redessinée **depuis** cet état, si
        // bien que la valeur retenue reparaît sélectionnée. Un filtre qui
        // n'aurait rien enregistré rendrait une facette revenue à vide.
        const trouver = (champ) => [...document.querySelectorAll('select')]
          .find((x) => (x.getAttribute('onchange') || '').includes(`planMaSetFiltre('${champ}'`));
        const resp = trouver('responsable');
        d.facette = !!resp;
        if (resp) {
          const choix = [...resp.options].find((op) => op.value);
          d.offre = !!choix;
          if (choix) {
            d.pose = choix.value;
            resp.value = choix.value;
            resp.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2500);
            d.retenu = (trouver('responsable') || {}).value === choix.value;
          }
        }
        // Et sa cascade : changer de secteur écarte un prestataire qui n'y est
        // plus — le dispositif s'en explique dans le code, on le constate.
        const sect = trouver('secteur');
        d.facetteSecteur = !!sect;
        if (sect) {
          const choix = [...sect.options].find((op) => op.value);
          if (choix) {
            sect.value = choix.value;
            sect.dispatchEvent(new Event('change', { bubbles: true }));
            await a(2500);
            d.secteurRetenu = (trouver('secteur') || {}).value === choix.value;
            // Le responsable, lui, n'est pas lié au secteur : il doit tenir.
            d.responsableTientEncore = (trouver('responsable') || {}).value === d.pose;
          }
        }
        // ── Rendre ce qu'on a changé ──
        //
        // Les filtres de PLAN sont un **état global** : le contre-essai l'a
        // montré sans détour — un seul filtre laissé actif a fait tomber neuf
        // contrôles d'autres rondes, qui ne voyaient plus leurs plans dans des
        // listes restreintes. Cette ronde est la dernière, mais *ce qui est
        // vrai pour les autres l'est pour elle* : elle rend l'état de départ.
        for (const champ of ['secteur', 'responsable']) {
          const f = trouver(champ);
          if (f) {
            f.value = '';
            f.dispatchEvent(new Event('change', { bubbles: true }));
            /* eslint-disable no-await-in-loop */
            await a(1800);
          }
        }
        d.renduAuDepart = ['secteur', 'responsable']
          .every((champ) => ((trouver(champ) || {}).value || '') === '');
        return d;
      });
      return o;
    });

    {
      const F = rondeFiltres;
      const Ba = F.barre || {};
      const Ca = { ...(F.calendrier || {}), ...rondeFiltres2 };
      const Vu = rondeFiltres3.vues || {};
      const Ma = rondeFiltres3.mesActivites || {};
      verifier('les six facettes de la barre partagée retiennent ce qu’on leur donne, et le domaine remet à vide ce qui dépend de lui',
        Ba.page === 'dashboard' && Ba.presentes === 6
        // Un secteur et une sous-activité sont posés d'abord : sans eux, la
        // cascade se mesurerait sur du vide.
        && Ba.secteurSeme === true && Ba.sousActiviteSemee !== false
        && Ba.avantDomaine.secteur !== ''
        && Ba.domaine.offre === true && Ba.domaineRetenu === true
        // La cascade : choisir un domaine efface le secteur et la sous-activité.
        && Ba.secteurVide === true && Ba.sousActiviteVide === true
        && Ba.secteur.offre === true && Ba.secteurRetenu === true
        && Ba.sousActiviteVideEncore === true
        // Le thème et le prestataire, pris avant que le domaine ne les
        // restreigne : ils offrent alors une valeur, et la retiennent.
        && Ba.themeTot.offre === true && Ba.themeRetenuTot === true
        && Ba.prestataireTot.offre === true && Ba.prestataireRetenuTot === true
        && Ba.sousActiviteRetenue !== false && Ba.statutRetenu !== false,
        JSON.stringify(Ba).slice(0, 460));
      verifier('la réinitialisation remplace l’état entier, l’année comprise, et seulement après qu’il a été garni',
        // Elle ne prouve quelque chose que si quelque chose était posé.
        Ba.posesAvantReset >= 3 && Ba.anneeSemee !== false
        && Ba.toutRemisAZero === true,
        JSON.stringify({ avant: Ba.avantReset, poses: Ba.posesAvantReset,
          remis: Ba.toutRemisAZero }));
      verifier('le calendrier a ses cinq facettes à lui, sa recherche différée, et sa propre réinitialisation',
        Ca.volet === true && Ca.presentes === 5
        && Object.values(Ca.cinq || {}).every((v) => v === true)
        && Ca.champRecherche === true
        // La frappe réelle traverse le différé du socle et parvient à l'état.
        && Ca.rechercheRetenue === true && Ca.champPorteLaValeur === true
        && Ca.boutonReset === true && Ca.toutRemisAZero === true,
        JSON.stringify(Ca).slice(0, 420));
      verifier('les vues du calendrier reculent d’un mois et d’une année, et l’année revient par son autre flèche',
        Vu.moisRecule !== Vu.moisDepart
        && Vu.anneeRecule === Vu.anneeDepart - 1
        // Les deux flèches sont le même réglage, pris dans les deux sens.
        && Vu.anneeRendue === Vu.anneeDepart
        && Vu.boutonSemaine === true && Vu.vueSemaine === 'week'
        && Vu.boutonVue === true && Vu.vueApres === 'month'
        && Vu.voletFerme === true,
        JSON.stringify(Vu));
      verifier('« Mes activités » porte ses propres filtres, hors de l’état partagé, et les retient',
        Ma.page === 'mes-activites' && Ma.facette === true
        && Ma.offre === true && Ma.retenu === true
        && Ma.facetteSecteur === true && Ma.secteurRetenu === true
        // Le responsable ne dépend pas du secteur : il survit à son choix.
        && Ma.responsableTientEncore === true
        // Et la ronde rend l'état de départ : les filtres sont globaux.
        && Ma.renduAuDepart === true,
        JSON.stringify(Ma));
    }

    verifier('aucune erreur de console ni requête échouée sur PLAN',
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
        } catch { /* page déjà partie : le registre durable l'a gardée */ }
      }
      fs.writeFileSync(process.env.OASIS_MOUCHARD, JSON.stringify(vu));
    }
    if (navigateur) await navigateur.close();
    await srv.arreter();
  }
  return bilan('PLAN (navigateur)');
};
