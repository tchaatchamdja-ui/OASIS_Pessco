// Fumée — SURV : la page des plans de surveillance. Écran « Exécution de la
// Surveillance », dans un navigateur.
//
// ── Pourquoi une suite à part, et celle-ci ──
//
// `exec-plans.js` était le gisement suivant du relevé : **6 occurrences sur
// 10**, et les quatre qui restaient sont les quatre commandes de la page —
// exporter les plans en PDF, ouvrir l'historique d'une activité, réinitialiser
// une activité déclenchée, archiver un plan entier.
//
// `surv.smoke.js` est à son plafond ; ces quatre rondes n'y lisent rien et n'y
// laissent rien. Elles bâtissent leur propre chaîne — une notification sur une
// activité du plan validé de l'amorce —, l'effacent par le geste même qu'elles
// éprouvent, et rendent le plan désarchivé en partant.
//
// ── Le refus que cette ronde provoque exprès ──
//
// Une activité qui a produit une constatation **ne se réinitialise pas** : la
// route rend 400, et l'écran doit le dire. C'est la propriété mesurée, et la
// déclaration suit donc la ronde.
const { verifier } = require('./harness');
const { surSURV, M } = require('./surv-socle');

module.exports = async function survPlansSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (plans)',
    titre: 'SURV : la page des plans — export, historique, réinitialisation, archivage',
    refus: [
      {
        code: 400, methode: 'PUT', chemin: /\/activites-en-cours\/[\w-]+\/reinitialiser$/,
        pourquoi: 'une activité dont dépend une constatation refuse d’être réinitialisée.'
          + ' Éprouvé par « une activité qui porte une constatation refuse la'
          + ' réinitialisation, et l’écran le dit ».',
      },
    ],
    rondes: async ({ page, jalon }) => {
      jalon('page des plans');
      const r = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const env = async (url, methode, corps) => {
          const rep = await fetch(url, {
            method: methode,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(corps ? { body: JSON.stringify(corps) } : {}),
          });
          let b = null; try { b = await rep.json(); } catch { /* corps vide */ }
          return { statut: rep.status, corps: b };
        };
        const lire = async (url) => (await env(url, 'GET')).corps;
        // La fenêtre de confirmation du module : on y répond par ses boutons.
        const repondre = async (rep) => {
          await attendre(400);
          const b = document.querySelector(`.exec-proc-dialogue [data-rep="${rep}"]`);
          if (!b) return false;
          b.click();
          return true;
        };
        const dits = [];
        const vraiToast = window.oasisToast;
        window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
        const out = {};
        try {
          execNavigateTo('plan_surveillance');
          await attendre(1200);
          const plans = EXEC_STATE.data.plansValidesPlanif || [];
          const plan = plans.find((p) => (p.activites || []).length >= 2);
          if (!plan) return { plan: false };
          out.plan = plan.id;
          const [aReinit, aHisto] = plan.activites;

          // ── 1. L'export PDF : une fenêtre d'impression, une seule fois ──
          //
          // L'ouverture réelle est gardée — la fenêtre s'ouvre, on y lit ce qui
          // a été écrit —, et son `print` est compté : la fenêtre se ferme
          // ensuite, sans boîte de dialogue à attendre.
          {
            const vraiOpen = window.open;
            let fen = null;
            let impressions = 0;
            window.open = (...a) => {
              fen = vraiOpen.apply(window, a);
              if (fen) fen.print = () => { impressions += 1; };
              return fen;
            };
            const racine = document.getElementById('execPlansExportRoot');
            const colonnesEcran = racine
              ? racine.querySelectorAll('table.exec-data-table thead tr th').length : 0;
            const tablesEcran = racine ? racine.querySelectorAll('table.exec-data-table').length : 0;
            const b = document.querySelector('[onclick^="execExportPlansPdf"]');
            out.export = { bouton: !!b, colonnesEcran, tablesEcran };
            if (b) b.click();
            await attendre(1500);
            window.open = vraiOpen;
            if (fen) {
              const d = fen.document;
              out.export.titre = d.title;
              out.export.portePlan = d.body.textContent.includes(plan.titre || plan.reference || plan.id);
              out.export.colonnes = d.querySelectorAll('table.exec-data-table thead tr th').length;
              out.export.tables = d.querySelectorAll('table.exec-data-table').length;
              out.export.cartes = d.querySelectorAll('.card').length;
              out.export.cartesFermees = d.querySelectorAll('.card:not(.expanded)').length;
              out.export.gestesRestants = /execReinitialiserActivite|execShowActiviteHistorique/
                .test(d.body.innerHTML);
              out.export.impressions = impressions;
              fen.close();
            }

            // Sans racine, rien ne s'ouvre et l'écran le dit.
            const parent = racine ? racine.parentNode : null;
            const suivant = racine ? racine.nextSibling : null;
            if (racine) racine.remove();
            let ouvertures = 0;
            window.open = () => { ouvertures += 1; return null; };
            const n0 = dits.length;
            execExportPlansPdf();
            window.open = vraiOpen;
            if (parent) parent.insertBefore(racine, suivant);
            out.export.sansRacine = { ouvertures, dit: dits.slice(n0), attendu: te('rien_a_exporter') };
          }

          // ── 2. L'historique d'une activité : l'écran du circuit ──
          {
            const b = document.querySelector(
              `[onclick="execShowActiviteHistorique('${aHisto.id}','${plan.id}')"]`);
            out.historique = { bouton: !!b };
            if (b) {
              b.click();
              await attendre(700);
              const s = document.querySelector('.slider-panel, .exec-slider, [class*="slider-"]');
              const objet = document.querySelector('.exec-histo-objet');
              out.historique.ouvert = !!EXEC_STATE.sliderOpen;
              out.historique.objet = objet ? objet.textContent.trim() : null;
              out.historique.attendu = aHisto.objet || aHisto.description || '';
              out.historique.ecranDuCircuit = !!document.querySelector('.exec-histo-fin');
              out.historique.panneau = !!s;
              execCloseSlider();
              await attendre(300);
              out.historique.ferme = !EXEC_STATE.sliderOpen;
            }
          }

          // ── 3. La réinitialisation d'une activité déclenchée ──
          //
          // Une notification posée sur la première activité, menée jusqu'au
          // dossier, et une constatation sur ce dossier : la route doit refuser.
          // La constatation retirée, elle accepte — et tout part.
          {
            const n = await env(`${api}/notifications`, 'POST', {
              activite_id: aReinit.id, plan_id: plan.id, prestataire_id: aReinit.prestataire_id,
              objet: 'SURV plans — réinitialisation', type_supervision: 'Audit',
              date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
              lieu: 'Siège', perimetre: 'Ensemble des processus',
            });
            out.reinit = { notif: n.statut };
            if (n.statut === 201) {
              const notifId = n.corps.id;
              for (const etape of ['submit', 'validate', 'send']) {
                /* eslint-disable no-await-in-loop */
                await env(`${api}/notifications/${notifId}/${etape}`, 'PUT');
              }
              const accord = await env(`${api}/notifications/${notifId}/validate-accord`, 'PUT', {
                date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
              });
              const dossierId = (accord.corps || {}).dossier_id;
              const fnc = await env(`${api}/constatations`, 'POST', {
                dossier_id: dossierId, domaine_id: 'AIR', criticite: 'mineur',
                description: 'SURV plans — écart qui retient la réinitialisation.',
              });
              out.reinit.dossier = !!dossierId;
              out.reinit.constatation = fnc.statut;
              await execLoadData();
              execRenderPage();
              await attendre(800);
              const bouton = () => document.querySelector(
                `.exec-act-reinit[onclick="execReinitialiserActivite('${aReinit.id}')"]`);
              const notifEnBase = async () => ((await lire(`${api}/notifications`)) || [])
                .some((x) => x.id === notifId);
              // Une activité sans notification n'a pas de bouton.
              out.reinit.sansNotifSansBouton = !document.querySelector(
                `.exec-act-reinit[onclick="execReinitialiserActivite('${aHisto.id}')"]`);
              out.reinit.bouton = !!bouton();

              // Accord, mais une constatation en dépend : la route refuse.
              let n0 = dits.length;
              if (bouton()) {
                bouton().click();
                out.reinit.confirmeRefus = await repondre('oui');
                await attendre(1500);
                out.reinit.ditRefus = dits.slice(n0);
                out.reinit.apresRefus = await notifEnBase();
              }

              // La constatation retirée, la réinitialisation passe.
              const ret = fnc.corps && fnc.corps.id
                ? await env(`${api}/constatations/${fnc.corps.id}`, 'DELETE') : { statut: 0 };
              out.reinit.retrait = ret.statut;

              // Refus de la confirmation : rien ne part. Il s'éprouve **ici**,
              // quand plus rien ne retient l'activité : éprouvé plus tôt, la
              // constatation faisait refuser le serveur, et un « non » ignoré
              // passait pour un « non » tenu (contre-test C, n° 5.f.90).
              if (bouton()) {
                bouton().click();
                out.reinit.annule = await repondre('non');
                await attendre(1200);
                out.reinit.apresAnnulation = await notifEnBase();
              }
              n0 = dits.length;
              if (bouton()) {
                bouton().click();
                out.reinit.confirme = await repondre('oui');
                await attendre(2000);
                out.reinit.dit = dits.slice(n0);
                out.reinit.attendu = te('reinitialiser_ok');
                out.reinit.apres = await notifEnBase();
                out.reinit.dossierApres = ((await lire(`${api}/dossiers`)) || [])
                  .some((d) => d.id === dossierId);
                out.reinit.boutonApres = !!bouton();
              }
            }
          }

          // ── 4. L'archivage d'un plan entier ──
          //
          // Le dernier : il fait quitter la page au plan que les autres rondes
          // lisent. Désarchivé en partant.
          {
            const b = () => document.querySelector(`[onclick="execArchiverPlan('${plan.id}')"]`);
            const statut = async () => ((await lire(`/api/m/planification/plans/${plan.id}`)) || {}).statut;
            out.archive = { bouton: !!b(), avant: await statut() };
            if (b()) {
              b().click();
              await attendre(400);
              const msg = document.querySelector('.exec-proc-dialogue p');
              out.archive.message = msg ? msg.textContent : '';
              out.archive.annule = await repondre('non');
              await attendre(800);
              out.archive.apresAnnulation = await statut();
              const n0 = dits.length;
              if (b()) {
                b().click();
                out.archive.confirme = await repondre('oui');
                await attendre(2500);
                out.archive.dit = dits.slice(n0);
                out.archive.attendu = te('plan_archive_ok');
                out.archive.apres = await statut();
                out.archive.boutonApres = !!b();
                out.archive.horsDesPlans = !(EXEC_STATE.data.plansValidesPlanif || [])
                  .some((p) => p.id === plan.id);
              }
              out.archive.rendu = (await env(`/api/m/planification/plans/${plan.id}/desarchiver`,
                'POST', {})).statut;
              out.archive.statutRendu = await statut();
            }
          }
          out.titre = plan.titre || plan.reference || plan.id;
          out.nb = (plan.activites || []).length;
          return out;
        } finally {
          window.oasisToast = vraiToast;
        }
      }, M);

      verifier('la page des plans porte un plan validé d’au moins deux activités',
        r.plan !== false, JSON.stringify(r).slice(0, 300));

      const ex = r.export || {};
      verifier('« Exporter PDF » écrit les plans dépliés, sans la colonne des actions, et imprime une seule fois',
        ex.bouton === true && ex.portePlan === true
        && ex.tables === ex.tablesEcran && ex.tables > 0
        && ex.colonnes === ex.colonnesEcran - ex.tablesEcran
        && ex.cartes > 0 && ex.cartesFermees === 0
        && ex.gestesRestants === false
        && ex.impressions === 1,
        JSON.stringify(ex));
      verifier('sans plans à rendre, l’export n’ouvre aucune fenêtre et l’écran le dit',
        ex.sansRacine && ex.sansRacine.ouvertures === 0
        && ex.sansRacine.dit.length === 1 && ex.sansRacine.dit[0] === ex.sansRacine.attendu,
        JSON.stringify(ex.sansRacine));

      const h = r.historique || {};
      verifier('l’historique d’une activité du plan ouvre l’écran du circuit sur cette activité, et se referme',
        h.bouton === true && h.ouvert === true && h.ecranDuCircuit === true
        && h.objet === h.attendu && h.ferme === true,
        JSON.stringify(h));

      const ri = r.reinit || {};
      verifier('seule une activité déclenchée porte la réinitialisation',
        ri.notif === 201 && ri.dossier === true && ri.bouton === true
        && ri.sansNotifSansBouton === true,
        JSON.stringify(ri));
      verifier('refuser la confirmation de la réinitialisation ne retire rien',
        ri.annule === true && ri.apresAnnulation === true,
        JSON.stringify(ri));
      verifier('une activité qui porte une constatation refuse la réinitialisation, et l’écran le dit',
        ri.constatation === 201 && ri.confirmeRefus === true && ri.apresRefus === true
        && (ri.ditRefus || []).length === 1 && /non réinitialisable/.test(ri.ditRefus[0]),
        JSON.stringify(ri));
      verifier('la constatation retirée, la réinitialisation emporte notification et dossier, et le bouton part',
        ri.retrait === 200 && ri.confirme === true
        && ri.apres === false && ri.dossierApres === false && ri.boutonApres === false
        && (ri.dit || []).length === 1 && ri.dit[0] === ri.attendu,
        JSON.stringify(ri));

      const ar = r.archive || {};
      verifier('l’archivage d’un plan demande confirmation en nommant le plan et ses activités, et son refus ne range rien',
        ar.bouton === true && ar.avant === 'valide'
        && ar.message.includes(r.titre) && ar.message.includes(String(r.nb))
        && ar.annule === true && ar.apresAnnulation === 'valide',
        JSON.stringify(ar));
      verifier('accepté, l’archivage range le plan au serveur et le retire de la page — et il se désarchive',
        ar.confirme === true && ar.apres === 'archive'
        && ar.boutonApres === false && ar.horsDesPlans === true
        && (ar.dit || []).length === 1 && ar.dit[0] === ar.attendu
        && ar.rendu === 200 && ar.statutRendu === 'valide',
        JSON.stringify(ar));
    },
  });
};
