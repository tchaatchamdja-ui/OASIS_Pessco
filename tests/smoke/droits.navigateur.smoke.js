// DROITS dans un navigateur — la suite n° 0.b de l'écran « Gestion des Droits »
// (ADR-003, 5.f.16).
//
// ── Pourquoi cet écran-là, et pas le plus gros ──
//
// Il est le plus petit des six : **15 gestes nommés pour 30 occurrences**. Il est
// aussi le seul **entièrement converti** — React et TypeScript, pas une ligne de
// JavaScript qui lui soit propre.
//
// C'est à ce titre qu'il valait d'être pris avant PLAN, CARE et PR : il répondait
// à une question qui vaut plus que ses quinze gestes. **Le mouchard voit-il les
// gestionnaires d'un écran converti ?**
//
// La réponse, mesurée le 15 octobre 2026 avant d'écrire une seule assertion :
// **non**. Après un vrai clic sur un bouton de cet écran, le journal du mouchard
// restait vide. React ne pose ni attribut `onclick` ni propriété sur l'élément :
// il attache **un** écouteur par type à la racine et distribue lui-même. Les
// trois lectures du mouchard passaient à côté de tout.
//
// Et c'était la panne la plus sournoise du chantier : l'écran **le plus avancé**
// dans la migration était le seul dont la couverture serait restée à zéro, et
// chacune des quatre conversions à venir aurait éteint sa mesure en silence. Le
// succès effaçait l'instrument.
//
// Une quatrième lecture a donc été ajoutée au mouchard — les props que React
// laisse sur le nœud —, et le nommage reste **une seule fonction** pour les deux
// côtés. C'est cette suite qui l'éprouve.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { demarrer, verifier, bilan } = require('./harness');

const RACINE = path.join(__dirname, '..', '..');
const IDENTIFIANT = 'superadmin@anac.bj';
const MOT_DE_PASSE = 'Aerosup@2026!Uemoa';      // posé par le harnais

module.exports = async function droitsNavigateurSmoke(port) {
  console.log('\n── DROITS : l’écran « Gestion des Droits » dans un navigateur ──');

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

    let droits = false;
    let etape = 'montage';
    page.on('console', (m) => {
      if (droits && m.type() === 'error') incidents.push(`[${etape}] console : ${m.text().slice(0, 160)}`);
    });
    page.on('pageerror', (e) => {
      if (droits) incidents.push(`[${etape}] exception : ${String(e.message).slice(0, 160)}`);
    });
    page.on('requestfailed', (r) => {
      if (droits) incidents.push(`[${etape}] requête : ${r.url().slice(0, 120)}`);
    });
    page.on('response', (r) => {
      if (!droits || r.status() < 400) return;
      incidents.push(`[${etape}] ${r.status()} ${r.url().replace(srv.base, '').slice(0, 120)}`);
    });

    await page.goto(`${srv.base}/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', IDENTIFIANT);
    await page.type('#password', MOT_DE_PASSE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#loginForm button[type="submit"]'),
    ]);
    droits = true;
    await page.goto(`${srv.base}/modules/droits/index.html`, { waitUntil: 'networkidle2' });
    // React monte puis charge : on attend une ligne de la table des comptes, et
    // non un délai fixe.
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0,
      { timeout: 20000 }).catch(() => { /* le contrôle qui suit le dira */ });

    const monte = await page.evaluate(() => ({
      comptes: document.querySelectorAll('tbody tr').length,
      boutons: document.querySelectorAll('button').length,
      contenu: document.body.textContent.trim().length,
      // Le contrat du socle : le retour au portail lui appartient, et le bouton
      // que les anciens shells rendaient ne doit plus exister.
      retour: document.querySelectorAll('.oasis-back-btn').length,
      mort: document.querySelectorAll('.btn-back-portal').length,
    }));
    verifier('l’écran DROITS se monte, avec ses comptes et ses gestes',
      monte.comptes > 0 && monte.boutons > 4 && monte.contenu > 500
      && monte.retour === 1 && monte.mort === 0,
      JSON.stringify(monte));

    etape = 'privileges';
    const filtre = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const lignes = () => document.querySelectorAll('tbody tr').length;
      r.toutes = lignes();
      const sel = document.querySelector('select');
      r.privileges = sel ? sel.options.length : 0;
      if (sel && sel.options.length > 1) {
        sel.value = sel.options[1].value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await a(1300);
      }
      r.filtrees = lignes();
      if (sel) {
        sel.value = '';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await a(1300);
      }
      r.rendues = lignes();
      return r;
    });
    verifier('le filtre de privilège restreint la table des comptes, et sa remise la rend',
      filtre.toutes > 0 && filtre.privileges > 1
      && filtre.filtrees < filtre.toutes && filtre.rendues === filtre.toutes,
      JSON.stringify(filtre));

    // ── La recherche : de vraies frappes, et non une valeur posée ──
    //
    // Poser `input.value` puis dépêcher `input` **ne porte pas** sur un champ
    // React : son suivi de valeur compare l'ancienne et la nouvelle, et une
    // écriture impérative lui fait croire que rien n'a changé. Mesuré — le
    // premier essai rendait « 4 lignes avant, 4 après » sur une recherche
    // introuvable.
    //
    // Les listes, elles, acceptent `value` + `change` : c'est éprouvé deux
    // contrôles plus haut. *Le même geste simulé ne vaut pas pour tous les
    // champs, et la seule façon de le savoir est de regarder le résultat.*
    etape = 'recherche';
    const champRecherche = await page.$('input.form-control');
    const avantRecherche = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    if (champRecherche) {
      await champRecherche.click();
      await page.keyboard.type('zzz-aucun-compte', { delay: 20 });
      await new Promise((r) => setTimeout(r, 1500));
    }
    const pendantRecherche = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    // ── Vider pour de bon, et pourquoi cela a coûté cinq contrôles ──
    //
    // Premier essai : un triple clic pour tout sélectionner, puis une
    // effacement. Le triple clic ne sélectionne pas le contenu d'un champ React
    // de façon fiable, et le champ est resté rempli : la table est demeurée
    // filtrée sur une seule ligne, et **les quatre contrôles suivants ont rougi
    // en cascade** — la fenêtre d'un compte, le privilège, l'enregistrement, le
    // journal. Aucun de ces gestes n'était en cause.
    //
    // *Un contrôle qui ne rétablit pas ce qu'il a changé ne se trompe pas tout
    // seul : il fait mentir ceux qui le suivent.* On efface donc caractère par
    // caractère, et l'on vérifie que la table est rendue avant de poursuivre.
    if (champRecherche) {
      await champRecherche.click();
      for (let i = 0; i < 24; i += 1) {
        /* eslint-disable no-await-in-loop */
        await page.keyboard.press('Backspace');
      }
      await new Promise((r) => setTimeout(r, 1800));
    }
    const apresRecherche = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    verifier('la recherche d’un compte restreint la table, et son vidage la rend',
      avantRecherche > 0 && pendantRecherche < avantRecherche
      && apresRecherche === avantRecherche,
      JSON.stringify({ avant: avantRecherche, pendant: pendantRecherche, apres: apresRecherche }));

    etape = 'theme';
    const theme = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const pastilles = [...document.querySelectorAll('.theme-dot[data-theme]')];
      if (pastilles.length < 2) return { pastilles: pastilles.length };
      const actuel = (document.documentElement.getAttribute('data-theme')
        || document.body.getAttribute('data-theme') || '');
      const autre = pastilles.find((p) => p.dataset.theme !== actuel) || pastilles[1];
      autre.click();
      await a(1400);
      const apres = (document.documentElement.getAttribute('data-theme')
        || document.body.getAttribute('data-theme') || '');
      // Et l'on rétablit : un essai ne laisse pas le thème de l'opérateur changé.
      const origine = pastilles.find((p) => p.dataset.theme === actuel);
      if (origine) { origine.click(); await a(1400); }
      const rendu = (document.documentElement.getAttribute('data-theme')
        || document.body.getAttribute('data-theme') || '');
      return { pastilles: pastilles.length, actuel, apres, rendu, choisi: autre.dataset.theme };
    });
    verifier('le thème de l’écran se choisit et se rétablit',
      theme.pastilles > 1 && theme.apres === theme.choisi && theme.rendu === theme.actuel,
      JSON.stringify(theme));

    etape = 'fenetre';
    const fenetre = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const parTexte = (re) => [...document.querySelectorAll('button')]
        .find((b) => re.test((b.textContent || '').trim()));
      const ouverte = () => !!document.querySelector('.modal-overlay');
      parTexte(/^Modifier$/)?.click();
      await a(2000);
      r.ouverte = ouverte();
      r.corps = (document.querySelector('.modal-body') || { textContent: '' }).textContent.trim().length;
      // Le privilège se choisit : des boutons radio, un par privilège.
      const radios = [...document.querySelectorAll('.modal input[type="radio"]')];
      r.radios = radios.length;
      if (radios.length > 1) {
        const autre = radios.find((x) => !x.checked);
        if (autre) { autre.click(); await a(1200); }
      }
      r.corpsApresChoix = (document.querySelector('.modal-body') || { textContent: '' }).textContent.trim().length;
      // Une portée ajoutée, puis retirée : la bascule dans les deux sens, sans
      // rien enregistrer.
      const portees = () => document.querySelectorAll('.modal-body select').length;
      r.porteesAvant = portees();
      const ajouter = [...document.querySelectorAll('.modal button')]
        .find((b) => /ajouter|\+/i.test((b.textContent || '').trim()));
      r.boutonAjouter = !!ajouter;
      if (ajouter) { ajouter.click(); await a(1300); }
      r.porteesApres = portees();
      // La ligne de portée est **renseignée** avant d'être retirée : son geste
      // (`modifier`) ne s'exerce que là. Cette fenêtre ne sauvegarde rien, donc
      // rien ne contraint la saisie — et le bloc d'écriture, lui, n'ajoutera
      // aucune portée, pour que `enregistrer` n'ait rien à refuser.
      const listesPortee = [...document.querySelectorAll('.modal-body select')];
      const derniere = listesPortee[listesPortee.length - 1];
      if (derniere && derniere.options.length > 1) {
        derniere.value = derniere.options[1].value;
        derniere.dispatchEvent(new Event('change', { bubbles: true }));
        await a(1200);
        r.porteeRenseignee = derniere.value;
      }
      const retirer = [...document.querySelectorAll('.modal-body button')]
        .find((b) => /retirer|supprimer|×|✕/i.test((b.textContent || '').trim()));
      if (retirer) { retirer.click(); await a(1300); }
      r.porteesRetirees = portees();
      // Et la fermeture, sans enregistrer : la table ne doit pas changer.
      const fermer = [...document.querySelectorAll('.modal button')]
        .find((b) => /annuler|fermer|×|✕/i.test((b.textContent || '').trim()));
      r.boutonFermer = !!fermer;
      if (fermer) { fermer.click(); await a(1500); }
      r.fermee = !ouverte();
      return r;
    });
    verifier('la fenêtre d’un compte s’ouvre garnie, et se referme sans enregistrer',
      fenetre.ouverte === true && fenetre.corps > 100
      && fenetre.boutonFermer === true && fenetre.fermee === true,
      JSON.stringify(fenetre));
    verifier('le privilège se choisit dans la fenêtre, et une portée s’ajoute puis se retire',
      fenetre.radios > 1 && fenetre.boutonAjouter === true
      && fenetre.porteesApres > fenetre.porteesAvant
      && fenetre.porteesRetirees === fenetre.porteesAvant,
      JSON.stringify({ radios: fenetre.radios, portees: [fenetre.porteesAvant,
        fenetre.porteesApres, fenetre.porteesRetirees] }));

    // ── Le privilège enregistré, puis rendu ──
    //
    // Le seul geste de cet écran qui **écrit**. Il est éprouvé comme tous les
    // autres : on relève l'état chez le serveur, on change, on relit, puis **on
    // rétablit** et l'on relit encore. Sans le dernier pas, la campagne
    // suivante hériterait d'un compte dont cet essai aurait changé les droits —
    // et l'écran règle l'espace **PLAN**, dont d'autres suites dépendent.
    //
    // La portée est modifiée en passant (`modifier`), ce qui exerce la ligne
    // d'une portée sans rien laisser : l'enregistrement final remet l'original.
    etape = 'enregistrement';
    const ecriture = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const comptes = async () => (await (await fetch('/api/m/droits/PLAN/users',
        { credentials: 'same-origin' })).json());
      const parTexte = (re) => [...document.querySelectorAll('button')]
        .find((b) => re.test((b.textContent || '').trim()));
      const liste = await comptes();
      // Un compte autre que celui de la session : changer ses propres droits en
      // pleine ronde reviendrait à se couper la branche.
      const cible = (liste || []).find((c) => c.username !== 'superadmin@anac.bj');
      if (!cible) return { cible: null };
      r.cible = cible.username;
      r.avant = { privilege: cible.privilege || '', scopes: (cible.scopes || []).length };

      // ── Une ligne ne se désigne pas par son texte ──
      //
      // Premier essai : `tr.textContent.includes(cible.username)`. Or
      // « superadmin@anac.bj » **contient** « admin@anac.bj » : le contrôle a
      // ouvert la fenêtre du compte de sa propre session, lui a changé son
      // privilège, puis a « rétabli » un compte que rien n'avait touché. Le
      // contrôle du retour en arrière était **vert sans rien prouver**, et
      // l'assertion de l'écriture rouge sur un geste qui marche.
      //
      // C'est la faute de 5.f.7, revenue par une autre porte : là, une ligne
      // était désignée par son rang ; ici, par une sous-chaîne de son texte. La
      // désignation se fait sur une **cellule égale** au nom.
      const trouverLigne = (nom) => [...document.querySelectorAll('tbody tr')]
        .find((tr) => [...tr.querySelectorAll('td')]
          .some((td) => (td.textContent || '').trim() === nom));
      const ligne = trouverLigne(cible.username);
      r.ligneExacte = !!ligne;
      ligne?.querySelector('button')?.click();
      await a(2000);
      r.fenetre = !!document.querySelector('.modal-overlay');

      // Un autre privilège que l'actuel.
      const radios = [...document.querySelectorAll('.modal input[type="radio"]')];
      // Un **vrai clic**, et non `checked` posé : le suivi de valeur de React
      // ignore une écriture impérative, exactement comme sur le champ de
      // recherche. Le premier essai choisissait « VALIDATEUR » et enregistrait
      // « LECTEUR » — le geste partait, la valeur ne suivait pas.
      const autre = radios.find((x) => !x.checked);
      if (autre) {
        autre.click();
        await a(1300);
        r.choisi = autre.value || '';
        r.choixPris = autre.checked === true;
      }
      // ── Aucune portée ajoutée ici, et c'est délibéré ──
      //
      // `enregistrer` refuse une ligne de portée sans domaine : il pose une
      // erreur et **sort sans sauver**. Le premier essai ajoutait une portée,
      // croyait la renseigner, et l'enregistrement repartait sans rien écrire —
      // le contrôle rougissait sur un geste qui marche. La portée s'exerce dans
      // la fenêtre qui ne sauvegarde pas ; ici, on ne change que le privilège.
      r.erreur = (document.querySelector('.modal [class*="erreur"], .modal [class*="error"]')
        || { textContent: '' }).textContent.trim().slice(0, 120);

      parTexte(/^(Enregistrer|Save|Guardar)$/i)?.click();
      await a(3000);
      r.fermeeApresEnregistrement = !document.querySelector('.modal-overlay');
      const apres = (await comptes()).find((c) => c.username === cible.username) || {};
      r.apres = { privilege: apres.privilege || '', scopes: (apres.scopes || []).length };

      // ── Le retour en arrière ──
      trouverLigne(cible.username)?.querySelector('button')?.click();
      await a(2000);
      const radios2 = [...document.querySelectorAll('.modal input[type="radio"]')];
      const origine = radios2.find((x) => (x.value || '') === r.avant.privilege);
      if (origine) { origine.click(); await a(1300); }
      parTexte(/^(Enregistrer|Save|Guardar)$/i)?.click();
      await a(3000);
      const rendu = (await comptes()).find((c) => c.username === cible.username) || {};
      r.rendu = { privilege: rendu.privilege || '', scopes: (rendu.scopes || []).length };
      return r;
    });
    verifier('le privilège d’un compte s’enregistre, et le serveur le porte',
      !!ecriture.cible && ecriture.ligneExacte === true && ecriture.fenetre === true
      && ecriture.fermeeApresEnregistrement === true
      && ecriture.choixPris === true
      && ecriture.apres.privilege === ecriture.choisi
      && ecriture.apres.privilege !== ecriture.avant.privilege,
      JSON.stringify({ cible: ecriture.cible, ligneExacte: ecriture.ligneExacte,
        choixPris: ecriture.choixPris, avant: ecriture.avant,
        choisi: ecriture.choisi, apres: ecriture.apres, erreur: ecriture.erreur }));
    verifier('la ronde de DROITS rend le compte dans l’état où elle l’a trouvé',
      !!ecriture.rendu && ecriture.rendu.privilege === ecriture.avant.privilege
      && ecriture.rendu.scopes === ecriture.avant.scopes,
      JSON.stringify({ avant: ecriture.avant, rendu: ecriture.rendu }));

    etape = 'audit';
    const audit = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const parTexte = (re) => [...document.querySelectorAll('button')]
        .find((b) => re.test((b.textContent || '').trim()));
      // Le journal d'un compte : il ouvre la page d'audit filtrée sur lui.
      parTexte(/^Journal$/)?.click();
      await a(2500);
      r.surJournal = document.body.textContent.trim().length;
      r.champsFiltre = document.querySelectorAll('input, select').length;
      // Les cinq filtres du journal appellent tous `surFiltre` : un seul nom,
      // mais on les exerce tous — un filtre qui ne marcherait que pour l'un
      // d'eux passerait sinon.
      const champs = [...document.querySelectorAll('input')];
      for (const c of champs.slice(0, 3)) {
        c.value = c.type === 'date' ? '2026-01-01' : 'zzz-introuvable';
        c.dispatchEvent(new Event('change', { bubbles: true }));
        c.dispatchEvent(new Event('input', { bubbles: true }));
        /* eslint-disable no-await-in-loop */
        await a(900);
      }
      const liste = [...document.querySelectorAll('select')];
      for (const s of liste) {
        if (s.options.length > 1) {
          s.value = s.options[1].value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await a(900);
        }
      }
      r.apresFiltres = document.querySelectorAll('tbody tr').length;
      // La remise à zéro des filtres.
      const reset = parTexte(/réinitialis|reset/i);
      r.boutonReset = !!reset;
      if (reset) { reset.click(); await a(2000); }
      r.apresReset = document.querySelectorAll('tbody tr').length;
      // Retour aux privilèges par la barre.
      parTexte(/privilèges/i)?.click();
      await a(2000);
      r.retourPrivileges = document.querySelectorAll('tbody tr').length;
      return r;
    });
    verifier('le journal d’un compte s’ouvre, ses filtres s’appliquent et se remettent à zéro',
      audit.surJournal > 300 && audit.champsFiltre >= 3
      && audit.boutonReset === true && audit.apresReset >= audit.apresFiltres,
      JSON.stringify(audit));
    verifier('la barre ramène aux privilèges, et la table des comptes revient',
      audit.retourPrivileges > 0, JSON.stringify({ comptes: audit.retourPrivileges }));

    etape = 'preferences';
    const prefs = await page.evaluate(async () => {
      const a = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      // Le thème et la langue : deux gestes du socle rendus par cet écran.
      const theme = [...document.querySelectorAll('button')]
        .filter((b) => (b.className || '').includes('theme') || /^[A-Z]{2}$/.test((b.textContent || '').trim()));
      const langues = [...document.querySelectorAll('button')]
        .filter((b) => /^(FR|EN|PT)$/.test((b.textContent || '').trim()));
      r.langues = langues.length;
      if (langues[1]) { langues[1].click(); await a(2000); }
      r.apresLangue = document.body.textContent.trim().length;
      if (langues[0]) { langues[0].click(); await a(2000); }
      r.rendue = document.body.textContent.trim().length;
      r.themes = theme.length;
      // Le repli de la barre latérale, dans les deux sens.
      const replier = [...document.querySelectorAll('button')]
        .find((b) => !(b.textContent || '').trim() && b.querySelector('svg'));
      r.boutonReplier = !!replier;
      if (replier) {
        const large = () => (document.querySelector('.app-sidebar') || { className: '' }).className;
        r.avant = large();
        replier.click();
        await a(1200);
        r.apres = large();
        replier.click();
        await a(1200);
        r.remis = large();
      }
      return r;
    });
    verifier('la langue de l’écran se change et se rétablit',
      prefs.langues >= 2 && prefs.apresLangue > 300 && prefs.rendue > 300,
      JSON.stringify({ langues: prefs.langues, apres: prefs.apresLangue, rendue: prefs.rendue }));

    verifier('aucune erreur de console ni requête échouée sur DROITS',
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
  return bilan('DROITS (navigateur)');
};
