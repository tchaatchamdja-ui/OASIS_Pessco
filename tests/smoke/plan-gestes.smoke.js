// Fumée — PLAN : les gestes que la suite d'origine ne pressait pas.
// Écran « Planification de la Surveillance », dans un navigateur.
//
// ── Mesurer avant de réécrire ──
//
// PLAN est le prochain écran de la conversion (ADR-003, 5.c), et la règle est
// de le mesurer d'abord. Son relevé laissait **onze** gestes non exercés. La
// note en disait quatre inatteignables ; relus contre l'écran le 14 novembre
// 2026 (n° 5.f.99), trois le restent — la barre de sous-onglets qu'aucune
// entrée ne déclare, l'approbation du directeur et la transmission, que le
// seul rendu qui les porte ne reçoit jamais au bon statut —, et le quatrième
// ne l'était plus : le choix de l'instance, dit hors d'atteinte faute de
// multi-instances, quand l'environnement d'essai en offre et que SURV le
// couvre déjà par la même barre (`surv-barre`).
//
// Cette suite presse les huit autres, par les chemins de l'écran :
//
//   · `planAppliquerInstance` — l'instance regardée, en barre du socle ;
//   · la fermeture du panneau des notifications ;
//   · `planCalDefiler` et l'écouteur `resize` — les flèches du calendrier, qui
//     ne valent que si la piste déborde de son cadre ;
//   · `event.stopPropagation` sur l'étiquette d'une sous-activité : l'écran lie
//     la case et son volet — cocher ouvre, décocher referme —, et la garde
//     empêche le clic de basculer le volet une seconde fois ;
//   · `planOpenDetailForPrestataire` — « Activité pour ce prestataire », dont
//     la nouvelle activité hérite le prestataire ;
//   · le dépli des modifications d'un amendement, dans l'historique ;
//   · « Tout sélectionner » de la synchronisation des risques.
//
// Le plan et son amendement sont bâtis par les routes, et retirés par elles.
const { verifier } = require('./harness');
const { surModule } = require('./module-socle');

const PLAN = { module: 'planification', contenu: 'planPageContent', largeur: 1440 };

module.exports = async function planGestesSmoke(port) {
  return surModule({
    port,
    ecran: PLAN,
    nom: 'PLAN (gestes)',
    titre: 'PLAN : l’instance, les notifications, le calendrier, un amendement et la synchronisation',
    rondes: async ({ page, jalon, M }) => {
      const monte = async () => {
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(() => {
          const el = document.getElementById('planPageContent');
          return el && el.textContent.trim().length > 100;
        }, { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200));
      };
      await monte();

      // ── 1. L'instance regardée ──
      //
      // La même barre que SURV, la même discipline : le choix est persisté
      // pour le compte, la route le rétablit quoi qu'il arrive, et le contrôle
      // exige qu'elle n'ait pas eu à servir.
      jalon('PLAN : instance regardée');
      const SELECT = '.oasis-module-actions select[title="Instance regardée"]';
      const lireInstance = () => page.evaluate(async (api) => (await fetch(`${api}/instance`,
        { credentials: 'same-origin' })).json(), M);
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
      const autre = l0 && l0.options.find((v) => v && v !== inst.origine);
      inst.autre = autre || null;
      try {
        if (l0 && autre) {
          // Reprendre la même : ni écriture, ni rechargement.
          inst.sansEffet = await page.evaluate(async (sel, v) => {
            let ecritures = 0;
            const vrai = window.fetch;
            window.fetch = (u, o) => {
              if (/\/instance$/.test(String(u)) && ((o || {}).method || 'GET') === 'PUT') ecritures += 1;
              return vrai(u, o);
            };
            window.__marquePlan = true;
            try {
              const s = document.querySelector(sel);
              s.value = v;
              s.dispatchEvent(new Event('change', { bubbles: true }));
              await new Promise((ok) => setTimeout(ok, 1500));
            } finally { window.fetch = vrai; }
            return { ecritures, resteLa: window.__marquePlan === true };
          }, SELECT, inst.origine).catch(async () => { await monte(); return { rechargee: true }; });
          await choisir(autre);
          inst.retenue = (await lireInstance()).courante;
          inst.listeApres = (await liste() || {}).valeur;
          inst.recharge = await page.evaluate(() => window.__marquePlan !== true);
          await choisir(inst.origine);
          inst.revenue = (await lireInstance()).courante;
          inst.listeRevenue = (await liste() || {}).valeur;
        }
      } finally {
        if ((await lireInstance()).courante !== inst.origine) {
          await page.evaluate(async ({ api, v }) => fetch(`${api}/instance`, {
            method: 'PUT', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ instance: v }),
          }), { api: M, v: inst.origine });
          inst.retabliParLaRoute = true;
          await page.reload({ waitUntil: 'networkidle2' });
          await monte();
        }
      }
      verifier('reprendre l’instance déjà regardée ne fait rien : ni écriture, ni rechargement',
        inst.disponible && inst.liste && !!inst.autre && !!inst.sansEffet
        && inst.sansEffet.ecritures === 0 && inst.sansEffet.resteLa === true,
        JSON.stringify({ ...inst, sansEffet: inst.sansEffet }));
      verifier('une autre instance est retenue, le module rechargé sur elle, et le même geste ramène l’origine',
        !!inst.autre && inst.retenue === inst.autre && inst.listeApres === inst.autre
        && inst.recharge === true && inst.revenue === inst.origine
        && inst.listeRevenue === inst.origine && !inst.retabliParLaRoute,
        JSON.stringify(inst));

      // ── 2. Le panneau des notifications ──
      jalon('PLAN : notifications');
      const notif = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const n = {};
        const cloche = document.querySelector('.plan-notif-bell');
        n.cloche = !!cloche;
        if (!cloche) return n;
        cloche.click();
        await attendre(500);
        n.ouvert = !!document.getElementById('planNotifPanel');
        const fermer = document.querySelector('#planNotifPanel .plan-notif-panel-header button');
        n.bouton = !!fermer;
        if (!fermer) return n;
        fermer.click();
        await attendre(400);
        n.ferme = !document.getElementById('planNotifPanel');
        return n;
      });
      verifier('la cloche ouvre le panneau des notifications, et sa croix le referme',
        notif.cloche && notif.ouvert && notif.bouton && notif.ferme, JSON.stringify(notif));

      // ── 3. Les flèches du calendrier, et la largeur de la fenêtre ──
      //
      // Elles ne valent que si la piste déborde de son cadre, et se grisent
      // sinon. La ronde rétrécit la fenêtre — l'écouteur `resize` doit les
      // armer —, défile dans les deux sens, puis rend la largeur.
      jalon('PLAN : calendrier');
      await page.evaluate(() => planNavigateTo('dashboard'));
      await new Promise((r) => setTimeout(r, 2000));
      const etatFleches = () => page.evaluate(() => {
        const carte = document.querySelector('.pl-cal-carte');
        const cadre = carte && carte.querySelector('.pl-gantt-cadre');
        const fl = carte ? [...carte.querySelectorAll('.pl-cal-nav [data-defil]')] : [];
        return {
          carte: !!carte, fleches: fl.length,
          actives: fl.filter((b) => !b.disabled).length,
          deborde: !!cadre && cadre.scrollWidth > cadre.clientWidth + 1,
          defile: cadre ? Math.round(cadre.scrollLeft) : null,
        };
      });
      const cal = { large: await etatFleches() };
      await page.setViewport({ width: 640, height: 900 });
      await new Promise((r) => setTimeout(r, 1200));
      cal.etroit = await etatFleches();
      if (cal.etroit.actives === 2) {
        cal.avance = await page.evaluate(async () => {
          const avant = Math.round(document.querySelector('.pl-cal-carte .pl-gantt-cadre').scrollLeft);
          document.querySelector('.pl-cal-carte .pl-cal-nav [data-defil][onclick*="planCalDefiler(1"]').click();
          await new Promise((ok) => setTimeout(ok, 1200));
          return { avant, apres: Math.round(document.querySelector('.pl-cal-carte .pl-gantt-cadre').scrollLeft) };
        });
        cal.recule = await page.evaluate(async () => {
          const avant = Math.round(document.querySelector('.pl-cal-carte .pl-gantt-cadre').scrollLeft);
          document.querySelector('.pl-cal-carte .pl-cal-nav [data-defil][onclick*="planCalDefiler(-1"]').click();
          await new Promise((ok) => setTimeout(ok, 1200));
          return { avant, apres: Math.round(document.querySelector('.pl-cal-carte .pl-gantt-cadre').scrollLeft) };
        });
      }
      await page.setViewport({ width: PLAN.largeur, height: 900 });
      await new Promise((r) => setTimeout(r, 1200));
      cal.rendu = await etatFleches();
      verifier('rétrécie, la fenêtre arme les flèches du calendrier, qui suivent ce que la piste déborde',
        cal.large.carte && cal.large.fleches === 2
        && cal.etroit.deborde && cal.etroit.actives === 2
        && cal.rendu.actives === (cal.rendu.deborde ? 2 : 0),
        JSON.stringify({ large: cal.large, etroit: cal.etroit, rendu: cal.rendu }));
      verifier('« › » fait défiler la piste vers l’avant, et « ‹ » la ramène',
        !!cal.avance && cal.avance.apres > cal.avance.avant
        && !!cal.recule && cal.recule.apres < cal.recule.avant,
        JSON.stringify({ avance: cal.avance, recule: cal.recule }));

      // ── 4. Le plan, son amendement, et ce qui s'y attache ──
      jalon('PLAN : un plan et son amendement');
      const bati = await page.evaluate(async (api) => {
        const J = async (u, m = 'GET', b) => {
          const r = await fetch(u, {
            method: m, credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: b ? JSON.stringify(b) : undefined,
          });
          let c = null; try { c = await r.json(); } catch { c = null; }
          return { statut: r.status, corps: c };
        };
        const D = PLAN_STATE.data;
        const actif = (o) => (o.statut ? o.statut === 'actif' : (o.actif !== false && o.actif !== 0));
        // Un secteur qui porte au moins un prestataire actif : sans lui, le
        // bandeau des prestataires est vide.
        const prest = (D.prestataires || []).find((p) => p.secteur_id && actif(p));
        const secteur = prest && (D.secteurs || []).find((s) => s.id === prest.secteur_id);
        const b = { prestataire: prest ? prest.id : null, secteur: secteur ? secteur.id : null };
        if (!prest || !secteur) return b;
        const annee = new Date().getFullYear();
        const p = await J(`${api}/plans`, 'POST', {
          titre: 'PLAN gestes — le plan amendé', annee, type: 'periodique',
          domaine_id: secteur.domaine_id, secteur_id: secteur.id,
        });
        b.plan = (p.corps || {}).id || null;
        if (!b.plan) return b;
        const a = await J(`${api}/plans/${b.plan}/activites`, 'POST', {
          objet: 'Activité d’origine', date_debut: `${annee}-03-02`, date_fin: `${annee}-03-06`,
          prestataire_id: prest.id, secteur_id: secteur.id,
        });
        b.activite = (a.corps || {}).id || null;
        b.soumis = (await J(`${api}/plans/${b.plan}/soumettre`, 'POST', {})).corps?.statut;
        b.valide = (await J(`${api}/plans/${b.plan}/valider`, 'POST', {})).corps?.statut;
        const am = await J(`${api}/plans/${b.plan}/amender`, 'POST', { motif: 'Une activité déplacée' });
        b.amendement = (am.corps || {}).new_plan_id || null;
        if (!b.amendement) return b;
        const actsAm = (await J(`${api}/plans/${b.amendement}/activites`)).corps || [];
        const cible = (Array.isArray(actsAm) ? actsAm : []).find((x) => (x.objet || '') === 'Activité d’origine');
        b.modifiee = cible ? (await J(`${api}/activites/${cible.id}`, 'PUT', {
          objet: 'Activité déplacée', date_debut: `${annee}-04-06`, date_fin: `${annee}-04-10`,
        })).statut : null;
        b.amendementSoumis = (await J(`${api}/plans/${b.amendement}/soumettre`, 'POST', {})).corps?.statut;
        await planLoadData();
        return b;
      }, M);

      try {
        // ── 4.a « Activité pour ce prestataire » ──
        const pourPrest = bati.plan ? await page.evaluate(async ({ planId, prestId }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const r = {};
          planNavigateTo('plans');
          await attendre(1800);
          const bascule = document.querySelector(`[onclick^="planTogglePrestRow('${planId}'"]`);
          r.bascule = !!bascule;
          if (!bascule) return r;
          bascule.click();
          await attendre(500);
          const bouton = document.querySelector(
            `#prestRow_${planId} [onclick*="planOpenDetailForPrestataire('${planId}','${prestId}')"]`);
          r.bouton = !!bouton;
          if (!bouton) return r;
          bouton.click();
          await attendre(2500);
          r.detail = PLAN_STATE.currentPage === 'plan-detail' && (PLAN_STATE.selectedPlan || {}).id === planId;
          r.prefill = PLAN_STATE.prefillPrestataire === prestId;
          planShowActivityModal(planId);
          await attendre(1500);
          r.prestataireRepris = (document.getElementById('actPrestataire') || {}).value === prestId;
          planCloseModal();
          await attendre(400);
          return r;
        }, { planId: bati.plan, prestId: bati.prestataire }) : null;
        verifier('« Activité pour ce prestataire » ouvre le plan, et la nouvelle activité reprend le prestataire',
          !!pourPrest && pourPrest.bascule && pourPrest.bouton && pourPrest.detail
          && pourPrest.prefill && pourPrest.prestataireRepris,
          JSON.stringify({ bati, pourPrest }));

        // ── 4.b L'étiquette d'une sous-activité ──
        //
        // La case est dans le `<summary>` de son volet, et l'écran les lie :
        // cocher ouvre le volet, décocher le referme (`pl-crud.js`). La garde
        // empêche le clic d'atteindre le `<summary>`, qui basculerait le volet
        // une seconde fois. Mon premier contrôle exigeait que le volet ne
        // bouge pas : c'était mal lire l'écran, qui l'ouvre exprès. Ce qui se
        // mesure, c'est l'accord de la case et du volet, dans les deux sens.
        //
        // Le clic est un vrai clic de souris, et non `label.click()` : c'est
        // le chemin de l'utilisateur, celui où le `<summary>` a son mot à dire.
        //
        // ── Ce que ce contrôle ne prouve pas ──
        //
        // Le contre-test qui **retire** la garde (n° 5.f.99, AE) reste vert :
        // dans Chrome, un clic sur une étiquette placée dans un `<summary>` est
        // activé par l'étiquette, et le volet ne bascule pas de lui-même — la
        // garde n'a ici aucun effet mesurable. Le contrôle mesure donc le
        // comportement de l'étiquette sur le vrai chemin, non la garde. Elle
        // reste, inoffensive : d'autres navigateurs ont traité autrement le
        // contenu interactif d'un `<summary>`, et ce dépôt ne les éprouve pas.
        const etiquette = bati.plan ? await page.evaluate(async ({ planId, secteur }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const r = {};
          planShowActivityModal(planId);
          await attendre(1500);
          const s = document.getElementById('actSecteur');
          if (s && s.value !== secteur) {
            s.value = secteur;
            s.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(2000);
          }
          const volet = document.querySelector('details.sa-item');
          r.volet = !!volet;
          if (!volet) { planCloseModal(); return r; }
          const label = volet.querySelector('summary label.checkbox-item');
          const caseSA = volet.querySelector('summary input.actSACheck');
          r.avant = { ouvert: volet.open, coche: !!(caseSA && caseSA.checked) };
          volet.setAttribute('data-ronde-etiquette', '1');
          return r;
        }, { planId: bati.plan, secteur: bati.secteur }) : null;
        if (etiquette && etiquette.volet) {
          const lire = () => page.evaluate(() => {
            const v = document.querySelector('details[data-ronde-etiquette]');
            return { ouvert: v.open, coche: !!v.querySelector('summary input.actSACheck').checked };
          });
          const cliquer = async () => {
            const label = await page.$('details[data-ronde-etiquette] summary label.checkbox-item');
            await label.click();
            await new Promise((r) => setTimeout(r, 500));
          };
          await cliquer();
          etiquette.premier = await lire();
          await cliquer();
          etiquette.second = await lire();
          await page.evaluate(() => planCloseModal());
          await new Promise((r) => setTimeout(r, 400));
        }
        verifier('cocher une sous-activité par son étiquette ouvre son volet, la décocher le referme — case et volet d’accord',
          !!etiquette && etiquette.volet && !!etiquette.premier && !!etiquette.second
          && etiquette.premier.coche !== etiquette.avant.coche
          && etiquette.premier.ouvert === etiquette.premier.coche
          && etiquette.second.coche === etiquette.avant.coche
          && etiquette.second.ouvert === etiquette.second.coche,
          JSON.stringify(etiquette));

        // ── 4.c Le dépli des modifications d'un amendement, dans l'historique ──
        const historique = bati.amendementSoumis === 'soumis' ? await page.evaluate(async (id) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const r = {};
          planNavigateTo('historique');
          await attendre(1800);
          const ligne = () => document.getElementById(`plan-diff-${id}`);
          const bouton = [...document.querySelectorAll('button.btn-icon')]
            .find((b) => (b.getAttribute('onclick') || '').includes(`'plan-diff-${id}'`));
          r.bouton = !!bouton;
          r.ligne = !!ligne();
          if (!bouton || !ligne()) return r;
          r.avant = { cachee: ligne().style.display === 'none', deplie: bouton.classList.contains('expanded') };
          bouton.click();
          await attendre(300);
          r.ouvert = { cachee: ligne().style.display === 'none', deplie: bouton.classList.contains('expanded') };
          bouton.click();
          await attendre(300);
          r.referme = { cachee: ligne().style.display === 'none', deplie: bouton.classList.contains('expanded') };
          return r;
        }, bati.amendement) : null;
        verifier('dans l’historique, le chevron d’un amendement montre ses modifications, et les recache',
          !!historique && historique.bouton && historique.ligne
          && historique.avant.cachee && !historique.avant.deplie
          && !historique.ouvert.cachee && historique.ouvert.deplie
          && historique.referme.cachee && !historique.referme.deplie,
          JSON.stringify({ bati, historique }));

        // ── 4.d « Tout sélectionner », à la synchronisation des risques ──
        const synchro = bati.plan ? await page.evaluate(async (id) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const r = {};
          planSyncRisksSelective(id);
          await attendre(2500);
          const tout = document.getElementById('syncSelectAll');
          const cases = () => [...document.querySelectorAll('.sync-check:not([disabled])')];
          r.tout = !!tout;
          r.cases = cases().length;
          if (!tout || !r.cases) { planCloseModal(); return r; }
          tout.checked = false;
          tout.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(300);
          r.decochees = cases().every((c) => !c.checked);
          tout.checked = true;
          tout.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(300);
          r.recochees = cases().every((c) => c.checked);
          planCloseModal();
          await attendre(400);
          return r;
        }, bati.plan) : null;
        verifier('« Tout sélectionner » décoche puis recoche toutes les lignes à synchroniser',
          !!synchro && synchro.tout && synchro.cases > 0 && synchro.decochees && synchro.recochees,
          JSON.stringify(synchro));

        // ── 4.e Les discussions d'un plan, chargées après son rendu ──
        //
        // Le détail charge ses commentaires cent millisecondes après le rendu.
        // L'ancien minuteur lisait le plan choisi **à ce moment-là** : quitter
        // le détail dans l'intervalle levait une exception — la page n'en
        // disait rien, la console seule —, et ouvrir un autre plan chargeait
        // ses commentaires deux fois (ADR-003, n° 5.f.106 et 5.f.109).
        const minuteur = (bati.plan && bati.amendement) ? await page.evaluate(async ({ a, b }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const erreurs = [];
          const garde = (e) => erreurs.push(String(e.message || e.error));
          const lectures = [];
          const vrai = window.api;
          window.addEventListener('error', garde);
          window.api = (chemin, o) => {
            const m = /\/plans\/([^/]+)\/commentaires$/.exec(chemin);
            if (m) lectures.push(m[1] === a ? 'a' : (m[1] === b ? 'b' : m[1]));
            return vrai(chemin, o);
          };
          const r = {};
          try {
            await planOpenDetail(a);
            planNavigateTo('plans');
            await attendre(500);
            r.quitte = { erreurs: erreurs.splice(0), lectures: lectures.splice(0) };
            await planOpenDetail(a);
            await attendre(500);
            r.reste = { erreurs: erreurs.splice(0), lectures: lectures.splice(0) };
            await planOpenDetail(a);
            await planOpenDetail(b);
            await attendre(500);
            r.enchaine = { erreurs: erreurs.splice(0), lectures: lectures.splice(0) };
          } finally {
            window.api = vrai;
            window.removeEventListener('error', garde);
            planNavigateTo('dashboard');
          }
          return r;
        }, { a: bati.plan, b: bati.amendement }) : null;
        verifier('le détail charge les discussions du plan qu’il montre, une fois — et rien s’il a été quitté entre-temps',
          !!minuteur
          && !minuteur.quitte.erreurs.length && !minuteur.quitte.lectures.length
          && !minuteur.reste.erreurs.length && minuteur.reste.lectures.join() === 'a'
          && !minuteur.enchaine.erreurs.length && minuteur.enchaine.lectures.join() === 'b',
          JSON.stringify({ bati, minuteur }));

        // ── 4.f Une réponse tardive des discussions ──
        //
        // `planLoadComments` retient son conteneur avant d'attendre le serveur.
        // Deux courses sont possibles : la réponse d'un plan quitté arrive
        // quand un autre est ouvert, et deux lectures du même plan reviennent
        // dans le désordre. Chaque réponse est ici retenue, puis relâchée dans
        // l'ordre choisi ; les discussions rendues sont factices, et nommées.
        const tardive = (bati.plan && bati.amendement) ? await page.evaluate(async ({ a, b }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const vrai = window.api;
          const retenues = [];
          const fil = (texte) => [{ id: texte, timeline_type: 'commentaire', contenu: texte, auteur: 'sonde' }];
          window.api = (chemin, o) => {
            const m = /\/plans\/([^/]+)\/commentaires$/.exec(chemin);
            if (!m) return vrai(chemin, o);
            return new Promise((ok) => retenues.push({ plan: m[1], ok }));
          };
          const lu = () => {
            const c = document.getElementById('planCommentsContainer');
            return c ? c.textContent.replace(/\s+/g, ' ').trim() : '(pas de conteneur)';
          };
          const r = {};
          try {
            // Le plan quitté : A est retenu, B s'ouvre, B répond, puis A.
            await planOpenDetail(a);
            await attendre(300);
            const deA = retenues.splice(0);
            await planOpenDetail(b);
            await attendre(300);
            const deB = retenues.splice(0);
            deB.forEach((x) => x.ok(fil('discussion-de-B')));
            await attendre(100);
            r.avantA = lu();
            deA.forEach((x) => x.ok(fil('discussion-de-A')));
            await attendre(100);
            r.apresA = lu();
            r.plans = { a: deA.map((x) => x.plan === a), b: deB.map((x) => x.plan === b) };
            // Le même plan, deux lectures : la seconde répond la première.
            planLoadComments(b);
            planLoadComments(b);
            await attendre(50);
            const deux = retenues.splice(0);
            r.lectures = deux.length;
            if (deux[1]) deux[1].ok(fil('lecture-recente'));
            await attendre(50);
            if (deux[0]) deux[0].ok(fil('lecture-ancienne'));
            await attendre(100);
            r.desordre = lu();
          } finally {
            window.api = vrai;
            retenues.splice(0).forEach((x) => x.ok([]));
            planNavigateTo('dashboard');
          }
          return r;
        }, { a: bati.plan, b: bati.amendement }) : null;
        // Mesuré le 15 novembre 2026, avant correction : la réponse d'un plan
        // quitté n'écrit nulle part où l'on regarde — son conteneur est
        // détaché par le rendu suivant —, mais deux lectures du même fil
        // laissaient la plus ancienne écraser la plus récente (n° 5.f.112).
        verifier('une réponse tardive des discussions n’écrase ni le plan ouvert ni une lecture plus récente',
          !!tardive && tardive.plans.a.join() === 'true' && tardive.plans.b.join() === 'true'
          && /discussion-de-B/.test(tardive.avantA) && /discussion-de-B/.test(tardive.apresA)
          && !/discussion-de-A/.test(tardive.apresA)
          && tardive.lectures === 2 && /lecture-recente/.test(tardive.desordre),
          JSON.stringify(tardive));
      } finally {
        // ── Le ménage : l'amendement d'abord, puis le plan ──
        await page.evaluate(async ({ api, ids }) => {
          for (const id of ids) {
            if (!id) continue;
            // eslint-disable-next-line no-await-in-loop
            await fetch(`${api}/plans/${id}`, {
              method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
            });
          }
        }, { api: M, ids: [bati.amendement, bati.plan] });
      }
      const reste = await page.evaluate(async ({ api, ids }) => {
        const r = await fetch(`${api}/plans`, { credentials: 'same-origin' });
        const tous = await r.json().catch(() => []);
        return (Array.isArray(tous) ? tous : []).filter((p) => ids.includes(p.id)).map((p) => p.statut);
      }, { api: M, ids: [bati.amendement, bati.plan].filter(Boolean) });
      verifier('la ronde ne laisse ni le plan ni son amendement derrière elle',
        !!bati.plan && reste.length === 0, JSON.stringify({ reste }));
    },
  });
};
