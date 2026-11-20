// Fumée — PR : les gestes que la suite d'origine ne pressait pas.
// Écran « Profils de Risque », dans un navigateur.
//
// ── Mesurer avant de réécrire ──
//
// PR est le prochain écran de la conversion (ADR-003, 5.c), et la règle est de
// le mesurer d'abord, comme PLAN (n° 5.f.99) et CARE (n° 5.f.114). Dix noms
// restaient non exercés sur 88 :
//
//   · une évaluation créée puis retirée — la fenêtre, le choix d'un organisme
//     qui règle le secteur, l'ajout, le retrait ;
//   · les deux dates du cycle d'une évaluation validée ;
//   · le rapport d'une évaluation, en Word et en PDF ;
//   · la soumission de ses notes par un évaluateur désigné ;
//   · trois écouteurs du socle de l'écran : le fond d'une fenêtre, celui du
//     volet, et la zone de texte qui grandit avec ce qu'on y tape ;
//   · l'instance regardée, dans la barre supérieure.
//
// La suite d'origine est à 3 432 lignes ; ces rondes vivent ici, sur le socle
// commun des suites de module.
//
// ── Ce que le jeu de référence offre, et ce qui est bâti ──
//
// Cinq évaluations : trois validées, une rejetée, un brouillon. La création et
// le retrait portent sur une évaluation **neuve**, que la ronde fait et défait.
// Les dates du cycle portent sur une validée ; le bac de la suite est le sien,
// et rien d'une autre suite n'en dépend.
//
// La soumission des notes n'est offerte qu'à un évaluateur **désigné qui n'est
// pas validateur**. Le compte de la suite est super-administrateur et
// gestionnaire : comme la ronde de la bibliothèque (suite d'origine, § 5), on
// pose le privilège Contributeur **dans l'état que la page lit** — c'est la
// règle du client qu'on mesure —, puis on relit le vrai depuis le serveur.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifier } = require('./harness');
const { surModule } = require('./module-socle');

const PR = { module: 'profil_risque', contenu: 'pageContent', largeur: 1440 };
const API = '/api/m/profil-risque';

module.exports = async function prGestesSmoke(port) {
  return surModule({
    port,
    ecran: PR,
    nom: 'PR (gestes)',
    titre: 'PR : une évaluation créée et retirée, le cycle, le rapport, les notes d’un évaluateur, la barre',
    rondes: async ({ page, navigateur, jalon }) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      await attendre(1500);
      const lire = (chemin) => page.evaluate((c) => window.api(c), chemin);
      const evaluations = () => lire(`${API}/evaluations`);

      // ══════════════════════════════════════════════════════════════════
      //  1. Une évaluation neuve : la fenêtre, le secteur suivi, l'ajout, le retrait
      // ══════════════════════════════════════════════════════════════════
      //
      // Le choix d'un organisme règle le secteur (`evalPrestId:change`) ; l'ajout
      // sans organisme est refusé **avant tout envoi** ; l'ajout fait un
      // brouillon au serveur ; le retrait se confirme, et un refus de la
      // confirmation ne retire rien.
      jalon('PR : nouvelle évaluation');
      const avantCreation = (await evaluations()).map((e) => e.id);
      const cree = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const o = {};
        const vrai = window.fetch;
        let ecritures = 0;
        window.fetch = (u, opt) => {
          if (/\/evaluations$/.test(String(u)) && ((opt || {}).method || 'GET') === 'POST') ecritures += 1;
          return vrai(u, opt);
        };
        try {
          window.navigateTo('evaluations', 'eval_indicateurs');
          await a(2200);
          document.querySelector('[onclick^="openNewEvalModal"]')?.click();
          await a(1500);
          const prest = document.getElementById('evalPrestId');
          const sect = document.getElementById('evalSectId');
          o.fenetre = !!document.getElementById('appModal') && !!prest && !!sect;
          if (!o.fenetre) return o;
          // Sans organisme : refusé dans la fenêtre.
          document.querySelectorAll('.oasis-toast-fond').forEach((n) => n.remove());
          [...document.querySelectorAll('#appModal button')]
            .find((b) => (b.getAttribute('onclick') || '') === 'createEval()')?.click();
          await a(1200);
          o.refusEnvois = ecritures;
          o.refusToast = (document.querySelector('.oasis-toast-fond') || {}).className || '';
          o.resteOuverte = !!document.getElementById('appModal');
          // Un organisme : le secteur suit.
          const choix = [...prest.options].find((x) => x.value && x.dataset.secteur);
          o.organisme = choix ? choix.value : null;
          o.secteurAttendu = choix ? choix.dataset.secteur : null;
          o.secteurAvant = sect.value;
          prest.value = o.organisme;
          prest.dispatchEvent(new Event('change', { bubbles: true }));
          await a(300);
          o.secteurApres = sect.value;
          [...document.querySelectorAll('#appModal button')]
            .find((b) => (b.getAttribute('onclick') || '') === 'createEval()')?.click();
          await a(3200);
          o.envois = ecritures;
          o.fermee = !document.getElementById('appModal');
        } finally { window.fetch = vrai; }
        return o;
      });
      const apresCreation = await evaluations();
      const neuve = apresCreation.find((e) => !avantCreation.includes(e.id));
      cree.neuve = neuve ? {
        id: neuve.id, statut: neuve.statut, prestataire: neuve.prestataire_id, secteur: neuve.secteur_id,
      } : null;
      verifier('une évaluation sans organisme est refusée dans la fenêtre, avant tout envoi',
        cree.fenetre === true && cree.refusEnvois === 0 && /erreur|error/.test(cree.refusToast)
        && cree.resteOuverte === true,
        JSON.stringify(cree));
      verifier('choisir l’organisme règle son secteur, et « Ajouter » fait au serveur un brouillon pour ce couple',
        !!cree.organisme && cree.secteurAvant === '' && cree.secteurApres === cree.secteurAttendu
        && cree.envois === 1 && cree.fermee === true && !!cree.neuve && cree.neuve.statut === 'brouillon'
        && cree.neuve.prestataire === cree.organisme && cree.neuve.secteur === cree.secteurAttendu,
        JSON.stringify(cree));

      jalon('PR : retrait d’une évaluation');
      const retrait = neuve ? await page.evaluate(async (id) => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const bouton = () => [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '') === `deleteEval('${id}')`);
        const auServeur = async () => (await window.api('/api/m/profil-risque/evaluations')).some((e) => e.id === id);
        d.bouton = !!bouton();
        if (!d.bouton) return d;
        bouton().click();
        await a(1200);
        d.confirmation = !!document.querySelector('.oasis-confirm-oui') && !document.querySelector('.oasis-saisie-champ');
        document.querySelector('.oasis-confirm-non')?.click();
        await a(1800);
        d.resteApresRefus = await auServeur();
        bouton()?.click();
        await a(1200);
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3200);
        d.parti = !(await auServeur());
        d.lignePartie = !bouton();
        return d;
      }, neuve.id) : { neuve: false };
      verifier('le retrait d’une évaluation se confirme : refusé, elle reste ; accepté, elle quitte le serveur et la liste',
        retrait.bouton === true && retrait.confirmation === true && retrait.resteApresRefus === true
        && retrait.parti === true && retrait.lignePartie === true,
        JSON.stringify(retrait));

      // ══════════════════════════════════════════════════════════════════
      //  2. Les dates du cycle d'une évaluation validée
      // ══════════════════════════════════════════════════════════════════
      //
      // Changer le début recalcule la fin : début + CSRBO mois, au serveur. Une
      // fin antérieure au début est refusée par la règle commune des dates, sans
      // envoi. Une fin valide se pose seule, sans toucher au début.
      jalon('PR : dates du cycle');
      const cycle = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const o = {};
        window.navigateTo('evaluations', 'evaluations_validees');
        await a(2400);
        const champs = () => {
          const debut = [...document.querySelectorAll('input[type="date"]')]
            .find((i) => /updateCycleDate\('[^']+','debut'/.test(i.getAttribute('onchange') || '') && !i.readOnly);
          if (!debut) return null;
          const m = /updateCycleDate\('([^']+)','debut',this\.value,(\d+)/.exec(debut.getAttribute('onchange'));
          const fin = [...document.querySelectorAll('input[type="date"]')]
            .find((i) => (i.getAttribute('onchange') || '').startsWith(`updateCycleDate('${m[1]}','fin'`));
          return { debut, fin, id: m[1], csrbo: Number(m[2]) };
        };
        const serveur = async (id) => {
          const e = await window.api(`/api/m/profil-risque/evaluations/${id}`);
          return { debut: e.date_debut_cycle || '', fin: e.date_fin_cycle || '' };
        };
        const poser = async (champ, valeur) => {
          champ.value = valeur;
          champ.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2200);
        };
        let c = champs();
        o.champs = !!c;
        if (!c) return o;
        o.id = c.id;
        o.csrbo = c.csrbo;
        o.avant = await serveur(c.id);
        await poser(c.debut, '2026-03-15');
        o.apresDebut = await serveur(c.id);
        // La fin attendue, calculée comme la page : début + CSRBO mois.
        const dt = new Date('2026-03-15T00:00:00');
        dt.setMonth(dt.getMonth() + c.csrbo);
        o.finAttendue = window.oasisJour(dt);
        // Une fin avant le début : refusée sans envoi.
        let envois = 0;
        const vrai = window.fetch;
        window.fetch = (u, opt) => {
          if (/\/evaluations\/[^/]+$/.test(String(u)) && ((opt || {}).method || 'GET') === 'PUT') envois += 1;
          return vrai(u, opt);
        };
        try {
          c = champs();
          document.querySelectorAll('.oasis-toast-fond').forEach((n) => n.remove());
          await poser(c.fin, '2026-01-10');
          o.refusEnvois = envois;
          o.refusToast = (document.querySelector('.oasis-toast-fond') || {}).className || '';
        } finally { window.fetch = vrai; }
        o.apresRefus = await serveur(o.id);
        c = champs();
        await poser(c.fin, '2027-06-30');
        o.apresFin = await serveur(o.id);
        c = champs();
        o.ecran = c ? { debut: c.debut.value, fin: c.fin.value } : null;
        return o;
      });
      verifier('changer le début d’un cycle recalcule sa fin au serveur : début + CSRBO mois',
        cycle.champs === true && cycle.csrbo > 0 && cycle.apresDebut.debut === '2026-03-15'
        && cycle.apresDebut.fin === cycle.finAttendue && cycle.finAttendue !== cycle.avant.fin,
        JSON.stringify(cycle));
      verifier('une fin antérieure au début est refusée sans envoi ; une fin valide se pose seule, sans toucher au début',
        cycle.refusEnvois === 0 && /warning|avert/.test(cycle.refusToast)
        && cycle.apresRefus.fin === cycle.finAttendue
        && cycle.apresFin.debut === '2026-03-15' && cycle.apresFin.fin === '2027-06-30'
        && !!cycle.ecran && cycle.ecran.debut === '2026-03-15' && cycle.ecran.fin === '2027-06-30',
        JSON.stringify(cycle));

      // ══════════════════════════════════════════════════════════════════
      //  3. Le rapport d'une évaluation, en Word et en PDF
      // ══════════════════════════════════════════════════════════════════
      //
      // Le Word est un fichier enregistré par le navigateur : on le reçoit dans
      // un répertoire à part et on le lit. Le PDF passe par une fenêtre
      // d'impression : on neutralise l'impression, on lit le document.
      jalon('PR : rapport d’évaluation');
      const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-pr-rapport-'));
      const cdp = await page.createCDPSession();
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dossier });
      const cible = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => /^exportEvalReport\('[^']+','word'\)$/.test(x.getAttribute('onclick') || ''));
        if (!b) return null;
        const id = /exportEvalReport\('([^']+)'/.exec(b.getAttribute('onclick'))[1];
        const ev = window.APP_STATE.data.evaluations.find((e) => e.id === id);
        const p = (window.APP_STATE.data.prestataires || []).find((x) => x.id === ev.prestataire_id) || {};
        return { id, nom: p.nom || '' };
      });
      const rapport = { cible };
      if (cible) {
        await page.evaluate((id) => {
          [...document.querySelectorAll('button')]
            .find((x) => (x.getAttribute('onclick') || '') === `exportEvalReport('${id}','word')`)?.click();
        }, cible.id);
        let fichier = null;
        for (let i = 0; i < 30 && !fichier; i += 1) {
          await attendre(300);
          fichier = fs.readdirSync(dossier).find((f) => /^rapport_evaluation_.*\.doc$/.test(f));
        }
        rapport.word = fichier;
        if (fichier) {
          const texte = fs.readFileSync(path.join(dossier, fichier), 'utf8');
          rapport.wordTaille = texte.length;
          rapport.wordNomme = !!cible.nom && texte.includes(cible.nom);
          rapport.wordAppendice = /Appendice 3/.test(texte);
        }
        const attente = new Promise((resoudre, refuser) => {
          const minuteur = setTimeout(() => refuser(new Error('aucune fenêtre ouverte')), 20000);
          page.once('popup', (p) => { clearTimeout(minuteur); resoudre(p); });
        });
        const [popup] = await Promise.all([attente, page.evaluate((id) => {
          [...document.querySelectorAll('button')]
            .find((x) => (x.getAttribute('onclick') || '') === `exportEvalReport('${id}','pdf')`)?.click();
        }, cible.id)]);
        try { await popup.evaluate(() => { window.print = () => {}; }); } catch { /* déjà écrit */ }
        await attendre(1500);
        const lu = await popup.evaluate(() => (document.body ? document.body.innerText : '').replace(/\s+/g, ' '));
        await popup.close();
        rapport.pdfNomme = !!cible.nom && lu.includes(cible.nom);
        rapport.pdfAppendice = /Appendice 3/.test(lu);
        rapport.pdfTaille = lu.length;
      }
      try { fs.rmSync(dossier, { recursive: true, force: true }); } catch { /* déjà parti */ }
      verifier('le rapport d’une évaluation validée s’enregistre en Word, et se compose en PDF — le même rapport, nommé pour son organisme',
        !!cible && !!rapport.word && rapport.wordNomme === true && rapport.wordAppendice === true
        && rapport.pdfNomme === true && rapport.pdfAppendice === true,
        JSON.stringify(rapport));

      // ══════════════════════════════════════════════════════════════════
      //  4. Les notes d'un évaluateur désigné, soumises
      // ══════════════════════════════════════════════════════════════════
      //
      // Le brouillon du jeu de référence, désigné au compte, ses notes privées
      // posées par la route. Incomplètes, la soumission est refusée sans envoi ;
      // complètes, la confirmation les publie et vide le brouillon.
      jalon('PR : notes d’un évaluateur');
      const notes = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const o = {};
        const S = window.APP_STATE;
        const D = S.data;
        const uid = (S.user || {}).id;
        const ev = (D.evaluations || []).find((e) => e.statut === 'brouillon');
        o.uid = !!uid;
        o.brouillon = !!ev;
        if (!uid || !ev) return o;
        o.id = ev.id;
        const sas = (D.sousActivites || []).filter((x) => x.secteur_id === ev.secteur_id);
        const perf = (D.indPerf || []).filter((i) => i.actif !== false);
        const comp = (D.indComplex || []).filter((i) => i.actif !== false && sas.some((x) => x.id === i.sous_activite_id));
        o.indicateurs = { perf: perf.length, comp: comp.length };
        const toutes = (l) => Object.fromEntries(l.map((i) => [i.id, 2]));
        const poser = async (brouillon) => {
          await window.api(`/api/m/profil-risque/evaluations/${ev.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              evaluateurs_designes: [uid],
              notes_per_evaluator: { perf: {}, comp: {} },
              notes_per_evaluator_draft: brouillon,
            }),
          });
          await window.loadAllData();
        };
        // Contributeur, dans l'état que la page lit.
        const contributeur = () => { S.access = { hasAccess: true, privilege: 'CONTRIBUTEUR', secteurs: {} }; };
        const ouvrir = async () => {
          contributeur();
          window.openEvalDetail(ev.id);
          await a(2200);
          return [...document.querySelectorAll('.pr-slicer-footer button')]
            .find((b) => (b.getAttribute('onclick') || '') === `soumettreMesNotes('${ev.id}')`);
        };
        let envois = 0;
        const vrai = window.fetch;
        window.fetch = (u, opt) => {
          if (String(u).endsWith(`/evaluations/${ev.id}`) && ((opt || {}).method || 'GET') === 'PUT') envois += 1;
          return vrai(u, opt);
        };
        try {
          // ── Le brouillon, par l'écran : le défaut du n° 5.f.127 ──
          //
          // Désigné, l'évaluateur note un indicateur et enregistre. Ses notes
          // sont rangées sous son identifiant — une adresse —, que la garde
          // des requêtes refusait : `400 corps_invalide`, rien d'enregistré.
          window.fetch = vrai;
          await window.api(`/api/m/profil-risque/evaluations/${ev.id}`, {
            method: 'PUT', body: JSON.stringify({ evaluateurs_designes: [uid] }),
          });
          await window.loadAllData();
          contributeur();
          window.openEvalDetail(ev.id);
          await a(2000);
          [...document.querySelectorAll('.eval-tab-btn')]
            .find((x) => /perf/i.test(x.getAttribute('onclick') || ''))?.click();
          await a(1500);
          const note = [...document.querySelectorAll('[onclick*="setScore("]:not([disabled])')]
            .find((x) => /'evaluator_draft'\)$/.test(x.getAttribute('onclick') || ''));
          o.noteBrouillon = !!note;
          note?.click();
          await a(500);
          document.querySelectorAll('.oasis-toast-fond').forEach((n) => n.remove());
          [...document.querySelectorAll('.pr-slicer-footer button')]
            .find((x) => /^saveEvalScores\(/.test(x.getAttribute('onclick') || ''))?.click();
          await a(2500);
          o.brouillonToast = (document.querySelector('.oasis-toast-fond') || {}).className || '';
          const apres = await window.api(`/api/m/profil-risque/evaluations/${ev.id}`);
          o.brouillonEcran = Object.keys((((apres.notes_per_evaluator_draft || {}).perf) || {})[uid] || {}).length;
          // Incomplètes : une note de performance manque.
          const incompletes = { perf: { [uid]: toutes(perf.slice(1)) }, comp: { [uid]: toutes(comp) } };
          window.fetch = vrai;
          await poser(incompletes);
          window.fetch = (u, opt) => {
            if (String(u).endsWith(`/evaluations/${ev.id}`) && ((opt || {}).method || 'GET') === 'PUT') envois += 1;
            return vrai(u, opt);
          };
          let b = await ouvrir();
          o.bouton = !!b;
          if (!b) return o;
          document.querySelectorAll('.oasis-toast-fond').forEach((n) => n.remove());
          b.click();
          await a(1200);
          o.refusEnvois = envois;
          o.refusConfirmation = !!document.querySelector('.oasis-confirm-oui');
          o.refusToast = (document.querySelector('.oasis-toast-fond') || {}).className || '';
          // Complètes.
          window.fetch = vrai;
          await poser({ perf: { [uid]: toutes(perf) }, comp: { [uid]: toutes(comp) } });
          window.fetch = (u, opt) => {
            if (String(u).endsWith(`/evaluations/${ev.id}`) && ((opt || {}).method || 'GET') === 'PUT') envois += 1;
            return vrai(u, opt);
          };
          envois = 0;
          b = await ouvrir();
          b?.click();
          await a(1200);
          o.confirmation = !!document.querySelector('.oasis-confirm-oui') && !document.querySelector('.oasis-saisie-champ');
          document.querySelector('.oasis-confirm-non')?.click();
          await a(1200);
          o.envoisApresRefus = envois;
          b = await ouvrir();
          b?.click();
          await a(1200);
          document.querySelector('.oasis-confirm-oui')?.click();
          await a(3500);
          o.envois = envois;
        } catch (e) {
          // Une écriture refusée lève : on la relève, et les contrôles jugent.
          o.erreur = String((e && e.message) || e);
        } finally { window.fetch = vrai; }
        const lu = await window.api(`/api/m/profil-risque/evaluations/${ev.id}`);
        const pub = (lu.notes_per_evaluator || {});
        const br = (lu.notes_per_evaluator_draft || {});
        o.publiees = {
          perf: Object.keys((pub.perf || {})[uid] || {}).length,
          comp: Object.keys((pub.comp || {})[uid] || {}).length,
        };
        o.brouillonRestant = {
          perf: Object.keys((br.perf || {})[uid] || {}).length,
          comp: Object.keys((br.comp || {})[uid] || {}).length,
        };
        // Le pied, après : la soumission n'est plus offerte.
        contributeur();
        window.openEvalDetail(ev.id);
        await a(2000);
        o.plusOfferte = ![...document.querySelectorAll('.pr-slicer-footer button')]
          .some((b) => (b.getAttribute('onclick') || '') === `soumettreMesNotes('${ev.id}')`);
        window.closeSlicer();
        // Le privilège réel, relu du serveur.
        S.access = await window.api('/api/m/droits/PLAN/my-access');
        window.renderPage();
        await a(900);
        o.rendu = (S.access || {}).privilege || '';
        return o;
      });
      verifier('un évaluateur désigné enregistre son brouillon de notes par l’écran — rangé sous son adresse, la garde le laisse passer',
        notes.noteBrouillon === true && notes.brouillonEcran === 1 && !/erreur|error/.test(notes.brouillonToast),
        JSON.stringify(notes));
      verifier('des notes incomplètes ne se soumettent pas : refusées sans confirmation ni envoi',
        notes.bouton === true && notes.indicateurs.perf > 1 && notes.refusEnvois === 0
        && notes.refusConfirmation === false && /erreur|error/.test(notes.refusToast),
        JSON.stringify(notes));
      verifier('complètes, la soumission se confirme — refusée, rien ne part — puis publie les notes et vide le brouillon',
        notes.confirmation === true && notes.envoisApresRefus === 0 && notes.envois === 1
        && notes.publiees.perf === notes.indicateurs.perf && notes.publiees.comp === notes.indicateurs.comp
        && notes.brouillonRestant.perf === 0 && notes.brouillonRestant.comp === 0
        && notes.plusOfferte === true && !!notes.rendu,
        JSON.stringify(notes));

      // ══════════════════════════════════════════════════════════════════
      //  5. Le fond d'une fenêtre, celui du volet, et la zone qui grandit
      // ══════════════════════════════════════════════════════════════════
      jalon('PR : fenêtres et volet');
      const fenetres = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const o = {};
        // La fenêtre d'un indicateur, ouverte par la page des paramètres.
        window.navigateTo('parametres', 'indicateurs');
        await a(2400);
        const ouvre = [...document.querySelectorAll('[onclick^="openEntityModal(\'indicateurs_perf\'"]')]
          .find((b) => /,\s*'[^']+'\)$/.test(b.getAttribute('onclick') || ''))
          || document.querySelector('[onclick^="openEntityModal("]');
        o.ouvre = ouvre ? ouvre.getAttribute('onclick') : null;
        ouvre?.click();
        await a(1500);
        const fond = document.getElementById('appModal');
        o.fenetre = !!fond;
        const zone = fond && fond.querySelector('textarea.auto-grow');
        o.zone = !!zone;
        if (zone) {
          o.hauteurAvant = zone.offsetHeight;
          zone.value = Array.from({ length: 8 }, (_, i) => `Ligne ${i + 1} du libellé`).join('\n');
          zone.dispatchEvent(new Event('input', { bubbles: true }));
          await a(200);
          o.hauteurApres = zone.offsetHeight;
        }
        // Un clic dans la fenêtre ne la ferme pas ; un clic sur son fond, si.
        fond?.querySelector('.modal-body')?.click();
        await a(400);
        o.resteApresClicInterieur = !!document.getElementById('appModal');
        fond?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await a(600);
        o.fermeeParLeFond = !document.getElementById('appModal');
        // Le volet d'une évaluation : la zone des généralités, puis le fond.
        window.navigateTo('evaluations', 'eval_indicateurs');
        await a(2200);
        // Le brouillon : le seul dont les généralités se saisissent.
        const brouillon = (window.APP_STATE.data.evaluations || []).find((e) => e.statut === 'brouillon');
        o.brouillon = !!brouillon;
        [...document.querySelectorAll('[onclick^="openEvalDetail"]')]
          .find((x) => brouillon && (x.getAttribute('onclick') || '') === `openEvalDetail('${brouillon.id}')`)?.click();
        await a(2600);
        o.volet = !!document.getElementById('prSlicer');
        // La ronde des notes l'a laissé sur l'onglet des performances : les
        // généralités, où vit la zone, se rouvrent par leur onglet.
        [...document.querySelectorAll('.eval-tab-btn')]
          .find((x) => /'generalites'\)$/.test(x.getAttribute('onclick') || ''))?.click();
        await a(1500);
        const zv = document.querySelector('#prSlicer textarea.auto-grow');
        o.zoneVolet = !!zv;
        o.zoneSaisissable = !!zv && !zv.readOnly && !zv.disabled;
        if (o.zoneSaisissable) {
          o.hauteurVoletAvant = zv.offsetHeight;
          const ancien = zv.value;
          zv.value = Array.from({ length: 10 }, (_, i) => `Généralité ${i + 1}`).join('\n');
          zv.dispatchEvent(new Event('input', { bubbles: true }));
          await a(200);
          o.hauteurVoletApres = zv.offsetHeight;
          zv.value = ancien;
        }
        document.querySelector('#prSlicer .pr-slicer-body')?.click();
        await a(400);
        o.voletResteApresClicInterieur = !!document.getElementById('prSlicer');
        document.getElementById('prSlicerOverlay')?.click();
        await a(900);
        o.voletFerme = !document.getElementById('prSlicer') || !document.getElementById('prSlicer').classList.contains('open');
        return o;
      });
      verifier('la zone de texte d’une fenêtre grandit avec ce qu’on y tape ; un clic dedans ne la ferme pas, son fond si',
        fenetres.fenetre === true && fenetres.zone === true && fenetres.hauteurApres > fenetres.hauteurAvant
        && fenetres.resteApresClicInterieur === true && fenetres.fermeeParLeFond === true,
        JSON.stringify(fenetres));
      verifier('dans le volet d’une évaluation, la zone grandit de même ; le fond du volet le referme',
        fenetres.volet === true && fenetres.zoneVolet === true
        && fenetres.hauteurVoletApres > fenetres.hauteurVoletAvant
        && fenetres.voletResteApresClicInterieur === true && fenetres.voletFerme === true,
        JSON.stringify(fenetres));

      // ══════════════════════════════════════════════════════════════════
      //  6. La barre supérieure : l'instance regardée
      // ══════════════════════════════════════════════════════════════════
      //
      // La discipline de SURV, PLAN et CARE : reprendre l'instance déjà regardée
      // ne fait rien ; une autre est retenue par le serveur et le module se
      // recharge sur elle ; le même geste ramène l'origine — et la route ne la
      // rétablit que si le geste a échoué, ce que le contrôle refuse.
      jalon('PR : instance regardée');
      const SELECT = '.oasis-module-actions select[title="Instance regardée"]';
      const monte = async () => {
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(() => {
          const el = document.getElementById('pageContent');
          return el && el.textContent.trim().length > 100;
        }, { timeout: 20000 }).catch(() => {});
        await attendre(1200);
      };
      const lireInstance = () => lire(`${API}/instance`);
      const liste = () => page.evaluate((sel) => {
        const s = document.querySelector(sel);
        return s ? { valeur: s.value, options: [...s.options].map((o) => o.value) } : null;
      }, SELECT);
      const choisir = async (valeur) => {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
          page.evaluate((sel, v) => {
            const s = document.querySelector(sel);
            if (!s) return;
            s.value = v;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }, SELECT, valeur),
        ]);
        await monte();
      };
      const avant = await lireInstance();
      const l0 = await liste();
      const inst = { disponible: avant.disponible === true, liste: !!l0, origine: avant.courante || '' };
      const autre = l0 && l0.options.find((v) => v !== inst.origine);
      inst.autre = autre === undefined ? null : autre;
      try {
        if (l0 && inst.autre !== null) {
          inst.sansEffet = await page.evaluate(async (sel, v) => {
            let ecritures = 0;
            const vrai = window.fetch;
            window.fetch = (u, o) => {
              if (/\/instance$/.test(String(u)) && ((o || {}).method || 'GET') === 'PUT') ecritures += 1;
              return vrai(u, o);
            };
            window.__marquePr = true;
            try {
              const s = document.querySelector(sel);
              s.value = v;
              s.dispatchEvent(new Event('change', { bubbles: true }));
              await new Promise((ok) => setTimeout(ok, 1500));
            } finally { window.fetch = vrai; }
            return { ecritures, resteLa: window.__marquePr === true };
          }, SELECT, inst.origine).catch(async () => { await monte(); return { rechargee: true }; });
          await choisir(inst.autre);
          inst.retenue = (await lireInstance()).courante || '';
          inst.listeApres = (await liste() || {}).valeur;
          inst.recharge = await page.evaluate(() => window.__marquePr !== true);
          await choisir(inst.origine);
          inst.revenue = (await lireInstance()).courante || '';
          inst.listeRevenue = (await liste() || {}).valeur;
        }
      } finally {
        if (((await lireInstance()).courante || '') !== inst.origine) {
          await page.evaluate(async (v) => window.api('/api/m/profil-risque/instance', {
            method: 'PUT', body: JSON.stringify({ instance: v }),
          }), inst.origine);
          inst.retabliParLaRoute = true;
          await page.reload({ waitUntil: 'networkidle2' });
          await monte();
        }
      }
      verifier('reprendre l’instance déjà regardée ne fait rien : ni écriture, ni rechargement',
        inst.disponible && inst.liste && inst.autre !== null && !!inst.sansEffet
        && inst.sansEffet.ecritures === 0 && inst.sansEffet.resteLa === true,
        JSON.stringify(inst));
      verifier('une autre instance est retenue, le module rechargé sur elle, et le même geste ramène l’origine',
        inst.autre !== null && inst.retenue === inst.autre && inst.listeApres === inst.autre
        && inst.recharge === true && inst.revenue === inst.origine
        && inst.listeRevenue === inst.origine && !inst.retabliParLaRoute,
        JSON.stringify(inst));
      // `navigateur` reste au socle, qui le referme.
      void navigateur;
    },
  });
};
