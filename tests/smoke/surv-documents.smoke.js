// Fumée — SURV : les documents imprimables. Écran « Exécution de la
// Surveillance », dans un navigateur.
//
// ── Ce qui restait ──
//
// La fiche de notification et le rapport s'ouvrent dans une fenêtre à eux,
// qui porte sa propre barre : « Télécharger PDF », qui appelle l'impression,
// et « Fermer ». Le rapport y ajoute une astuce d'impression qu'une croix
// écarte. Cinq occurrences, sur `exec-fiche.js` et `exec-rapports.js`, que le
// relevé n'avait jamais vues exercées.
//
// Elles n'étaient pas sans contrôle : `surv.smoke.js` constate depuis le
// n° 5.f.74 que le document produit **porte** ces boutons. Mais il le lisait
// dans un relais — une fausse fenêtre qui recueille le texte écrit —, et un
// bouton présent dans un texte n'est pas un bouton qui fait ce qu'il dit.
//
// ── La vraie fenêtre, et le mouchard dedans ──
//
// Ici la fenêtre est réelle. Son `print` est compté — la boîte d'impression
// n'a pas à s'ouvrir —, son `close` est compté **et exécuté** : la fenêtre doit
// être réellement fermée après le clic.
//
// Le mouchard du relevé est posé par le socle sur la page ; une fenêtre que
// l'écran ouvre lui-même ne le reçoit pas. Il est donc posé dans la fenêtre,
// **après** que l'écran y a écrit son document : `document.open()` efface les
// écouteurs du document qu'il remplace, et un mouchard posé avant serait
// présent sans rien voir. La fenêtre partage l'origine de l'écran, donc son
// registre durable : ce qu'il y voit est relevé avec le reste.
const path = require('path');
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

const MOUCHARD = process.env.OASIS_MOUCHARD
  ? require(path.join(__dirname, '..', '..', 'scripts', 'relever-gestes.js')).MOUCHARD : null;

module.exports = async function survDocumentsSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (documents)',
    titre: 'SURV : les documents imprimables — imprimer, fermer, écarter l’astuce ; soumettre depuis l’aperçu',
    refus: [
      {
        code: 404, methode: 'GET', chemin: /\/dossiers\/dossier_[0-9a-f]+$/,
        pourquoi: 'un dossier supprimé par une autre main, que l’écran retient encore :'
          + ' le premier rafraîchissement le redemande, et c’est ce 404 qui le lui'
          + ' apprend. Éprouvé par « supprimé par une autre main, le dossier retenu'
          + ' est redemandé une fois, puis oublié » — qui compte les demandes, et'
          + ' garde ainsi ce que la déclaration dispense.',
      },
    ],
    rondes: async ({ page, jalon }) => {
      jalon('documents imprimables');
      const r = await page.evaluate(async (mouchard) => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const env = async (url, methode, corps) => {
          const rep = await fetch(url, {
            method: methode,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(corps ? { body: JSON.stringify(corps) } : {}),
          });
          let c = null; try { c = await rep.json(); } catch { /* corps vide */ }
          return { statut: rep.status, corps: c };
        };
        const lire = async (url) => (await env(url, 'GET')).corps;
        // Ouvre la vraie fenêtre par le geste donné, et la rend instrumentée.
        const ouvrir = async (geste) => {
          const vraiOpen = window.open;
          const f = { impressions: 0, fermetures: 0, fen: null };
          window.open = (...a) => {
            const fen = vraiOpen.apply(window, a);
            if (fen) {
              f.fen = fen;
              fen.print = () => { f.impressions += 1; };
              const vraiClose = fen.close.bind(fen);
              fen.close = () => { f.fermetures += 1; vraiClose(); };
            }
            return fen;
          };
          try {
            geste();
            for (let i = 0; i < 40 && !(f.fen && f.fen.document
              && f.fen.document.querySelector('.preview-toolbar')); i += 1) {
              // eslint-disable-next-line no-await-in-loop
              await attendre(150);
            }
          } finally {
            window.open = vraiOpen;
          }
          // Par un élément de script, non par `eval` : la politique de contenu
          // de l'application refuse `unsafe-eval`, et la fenêtre en hérite.
          if (f.fen && mouchard) {
            const sc = f.fen.document.createElement('script');
            sc.textContent = mouchard;
            f.fen.document.head.appendChild(sc);
          }
          f.mouchard = !!(f.fen && f.fen.__gestes);
          return f;
        };
        // Les trois boutons de la barre, cherchés par ce qu'ils appellent.
        const bouton = (f, appel) => f.fen.document
          .querySelector(`.preview-toolbar button[onclick="${appel}"]`);
        const eprouver = async (f) => {
          const o = { ouverte: !!f.fen, barre: false, mouchard: f.mouchard };
          if (!f.fen) return o;
          // L'impression automatique, s'il y en a une, a eu le temps de partir.
          await attendre(1200);
          o.avantClic = f.impressions;
          const imprimer = bouton(f, 'window.print()');
          const fermer = bouton(f, 'window.close()');
          o.barre = !!imprimer && !!fermer;
          imprimer?.click();
          await attendre(200);
          o.apresImprimer = f.impressions;
          o.ouverteApresImprimer = !f.fen.closed;
          fermer?.click();
          await attendre(400);
          o.fermetures = f.fermetures;
          o.fermee = f.fen.closed === true;
          return o;
        };

        const out = {};
        const api = EXEC_MODULE_API;

        // ── 0. La chaîne de la ronde ──
        //
        // L'amorce n'a ni dossier ni rapport transmis : une notification est
        // posée sur une activité d'un plan validé, menée jusqu'au dossier ; le
        // dossier soumis fait naître son rapport, validé puis transmis — seul
        // statut que la page des rapports affiche. Tout part à la fin.
        execNavigateTo('plan_surveillance');
        await attendre(1200);
        const plan = (EXEC_STATE.data.plansValidesPlanif || [])
          .find((x) => (x.activites || []).length >= 1);
        const act = plan && plan.activites[0];
        const chaine = { plan: !!plan };
        out.chaine = chaine;
        if (!act) return out;
        const n = await env(`${api}/notifications`, 'POST', {
          activite_id: act.id, plan_id: plan.id, prestataire_id: act.prestataire_id,
          objet: 'SURV documents — fiche et rapport', type_supervision: 'Audit',
          date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
          lieu: 'Siège', perimetre: 'Ensemble des processus',
        });
        chaine.notif = n.statut;
        if (n.statut !== 201) return out;
        const notifId = n.corps.id;
        for (const etape of ['submit', 'validate', 'send']) {
          // eslint-disable-next-line no-await-in-loop
          await env(`${api}/notifications/${notifId}/${etape}`, 'PUT');
        }
        const accord = await env(`${api}/notifications/${notifId}/validate-accord`, 'PUT', {
          date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
        });
        const dossierId = (accord.corps || {}).dossier_id;
        chaine.dossier = !!dossierId;
        if (!dossierId) return out;
        chaine.soumis = (await env(`${api}/dossiers/${dossierId}/submit`, 'PUT')).statut;
        const rap = ((await lire(`${api}/rapports`)) || []).find((x) => x.dossier_id === dossierId);
        chaine.rapport = !!rap;
        if (rap) {
          chaine.valide = (await env(`${api}/rapports/${rap.id}/validate`, 'PUT')).statut;
          chaine.transmis = (await env(`${api}/rapports/${rap.id}/send`, 'PUT')).statut;
        }
        await execLoadData();

        // ── 1. Le rapport, ouvert sans impression automatique ──
        document.querySelector('.nav-btn[data-page="rapports"]')?.click();
        await attendre(2500);
        const ligne = rap && document.querySelector(`[onclick="execDownloadRapport('${rap.id}')"]`);
        out.rapport = { geste: !!ligne };
        if (ligne) {
          const f = await ouvrir(() => ligne.click());
          if (f.fen) {
            // L'astuce d'impression : sa croix l'écarte, elle seule.
            const d = f.fen.document;
            const astuce = d.getElementById('print-tip');
            const croix = astuce && astuce.querySelector('button[onclick]');
            out.rapport.astuce = !!astuce && getComputedStyle(astuce).display !== 'none';
            croix?.click();
            await attendre(150);
            out.rapport.astuceEcartee = !!astuce && astuce.style.display === 'none';
            out.rapport.barreRestee = !!d.querySelector('.preview-toolbar')
              && d.querySelector('.preview-toolbar').style.display !== 'none';
            out.rapport.contenu = !!d.getElementById('report-content');
          }
          Object.assign(out.rapport, await eprouver(f));
        }

        // ── 2. La fiche de notification, par « Exporter PDF » du dossier ──
        out.fiche = { dossier: true };
        {
          execOpenDossierSlider(dossierId);
          await attendre(1800);
          document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="notification"]')?.click();
          await attendre(1800);
          const b = document.querySelector('[onclick^="execGenerateNotificationPdf"]');
          out.fiche.geste = !!b;
          if (b) {
            const f = await ouvrir(() => b.click());
            out.fiche.contenu = !!(f.fen && f.fen.document.getElementById('fiche-content'));
            Object.assign(out.fiche, await eprouver(f));
          }
          execCloseSlider();
          await attendre(400);
        }

        // ── 2. Le ménage : supprimer le dossier emporte son rapport et sa
        // notification, et l'activité redevient « à notifier » — la route le
        // fait d'un geste.
        //
        // Par le geste de l'écran, et non par la route : le dossier vient d'être
        // vu puis son volet fermé, et c'est le cas d'un utilisateur qui le
        // supprime ensuite du tableau. L'écran retenait le dossier vu et, à
        // chaque rafraîchissement, redemandait au serveur un dossier qu'il
        // venait lui-même de supprimer — un 404, puis un autre.
        chaine.retenuAvant = (EXEC_STATE.selectedDossier || {}).id === dossierId;
        const vu = EXEC_STATE.selectedDossier;
        await execRefreshDynamic();
        // Les demandes faites pour ce dossier, comptées : un 404 sur lui est
        // déclaré plus haut pour le cas de l'autre main, et ne se verrait donc
        // plus parmi les incidents. Au geste de l'écran, il n'en faut aucune.
        const cible = `/dossiers/${dossierId}`;
        let demandes = 0;
        const vraiFetch = window.fetch;
        window.fetch = (u, o) => {
          if (String(u).endsWith(cible) && !((o || {}).method)) demandes += 1;
          return vraiFetch(u, o);
        };
        try {
          const ref = ((EXEC_STATE.data.dossiers || []).find((x) => x.id === dossierId) || {});
          const reference = String(ref.reference || ref.notification_ref || '').trim();
          const fin = execDeleteDossier(dossierId);
          await attendre(900);
          const boite = document.querySelector('.exec-proc-dialogue');
          const champ = boite && boite.querySelector('.exec-proc-dialogue-saisie');
          if (champ) { champ.value = reference; champ.dispatchEvent(new Event('input', { bubbles: true })); }
          boite?.querySelector('[data-rep="oui"]')?.click();
          await fin;
          await attendre(600);
          // Le rafraîchissement suivant — celui d'une autre action — ne le
          // redemande pas non plus.
          await execRefreshDynamic();
          chaine.demandesAuGeste = demandes;
        } finally {
          window.fetch = vraiFetch;
        }
        chaine.dossierRetire = ((await lire(`${api}/dossiers`)) || []).some((x) => x.id === dossierId) ? 0 : 200;
        chaine.retenuApres = !!EXEC_STATE.selectedDossier;

        // Le même dossier, supprimé par une autre main : l'écran le retient
        // encore, et le serveur ne le connaît plus. Le premier rafraîchissement
        // le redemande — c'est ainsi qu'il l'apprend —, le second ne le doit
        // plus. On compte les demandes faites pour lui.
        {
          demandes = 0;
          window.fetch = (u, o) => {
            if (String(u).endsWith(cible) && !((o || {}).method)) demandes += 1;
            return vraiFetch(u, o);
          };
          try {
            EXEC_STATE.selectedDossier = vu;
            await execRefreshDynamic();
            await execRefreshDynamic();
          } finally {
            window.fetch = vraiFetch;
          }
          chaine.autreMain = { demandes, oublie: !EXEC_STATE.selectedDossier };
        }
        chaine.notifRestee = ((await lire(`${api}/notifications`)) || []).some((x) => x.id === notifId);
        chaine.rapportReste = ((await lire(`${api}/rapports`)) || []).some((x) => x.dossier_id === dossierId);

        // ── 3. Soumettre pour validation depuis l'aperçu de la fiche ──
        //
        // Le formulaire d'une notification en brouillon a un aperçu : la fiche,
        // avec deux issues, revenir au formulaire ou soumettre. Soumettre ouvre
        // le choix du validateur. On le refuse d'abord — rien ne part —, on le
        // confirme ensuite sans choisir — l'écran le dit, et rien ne part —,
        // puis on choisit : la notification est soumise, au validateur choisi.
        // L'activité est redevenue « à notifier » au ménage ci-dessus.
        const so = {};
        out.soumission = so;
        const dits = [];
        const vraiToast = window.oasisToast;
        window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
        try {
          const b = await env(`${api}/notifications`, 'POST', {
            activite_id: act.id, plan_id: plan.id, prestataire_id: act.prestataire_id,
            objet: 'SURV documents — soumise depuis l’aperçu', type_supervision: 'Audit',
            date_debut_prevue: '2026-10-01', date_fin_prevue: '2026-10-03',
            lieu: 'Siège', perimetre: 'Ensemble des processus',
          });
          so.brouillon = b.statut;
          if (b.statut !== 201) return out;
          const id = b.corps.id;
          const enBase = async () => (await lire(`${api}/notifications/${id}`)) || {};
          so.statutAvant = (await enBase()).statut;
          await execLoadData();
          execOpenNotificationForm(await enBase());
          await attendre(1500);
          document.querySelector('[onclick^="execPreviewNotificationFromForm"]')?.click();
          await attendre(1500);
          so.apercu = !!document.querySelector('.fiche-notification');
          const soumettre = () => document.querySelector('[onclick="execSubmitNotificationForValidation()"]');
          const choix = () => document.getElementById('validator-picker-overlay');
          so.bouton = !!soumettre();
          if (!soumettre()) return out;

          // Refusé : le choix se ferme, rien ne part.
          soumettre().click();
          await attendre(1200);
          so.choixOuvert = !!choix();
          so.validateurs = [...document.querySelectorAll('#validator_picker_select option')]
            .filter((o) => o.value).map((o) => o.value);
          document.getElementById('validator_picker_cancel')?.click();
          await attendre(300);
          so.choixFermeAuRefus = !choix();
          so.statutApresRefus = (await enBase()).statut;

          // Confirmé sans choisir : l'écran le dit, le choix reste, rien ne part.
          soumettre()?.click();
          await attendre(1200);
          const n0 = dits.length;
          document.getElementById('validator_picker_confirm')?.click();
          await attendre(300);
          so.ditSansChoix = dits.slice(n0);
          so.attenduSansChoix = te('selectionner_validateur');
          so.choixResteSansChoix = !!choix();
          so.statutSansChoix = (await enBase()).statut;

          // Choisi : soumise, au validateur choisi.
          const v = so.validateurs[0];
          const sel = document.getElementById('validator_picker_select');
          if (sel && v) sel.value = v;
          document.getElementById('validator_picker_confirm')?.click();
          await attendre(2500);
          const apres = await enBase();
          so.statutApres = apres.statut;
          so.validateurChoisi = apres.validateur_id === v;
          so.objetGarde = (apres.objet_activite || apres.objet || '').includes('soumise depuis l’aperçu');
          so.voletFerme = !EXEC_STATE.sliderOpen;
          so.ongletSoumis = EXEC_STATE.triggerTab === 'soumis';

          // Le ménage : rejetée, elle redevient brouillon, et se supprime.
          so.rejet = (await env(`${api}/notifications/${id}/reject`, 'PUT', { motif: 'ménage de la ronde' })).statut;
          so.retrait = (await env(`${api}/notifications/${id}`, 'DELETE')).statut;
          so.resteEnBase = ((await lire(`${api}/notifications`)) || []).some((x) => x.id === id);
        } finally {
          window.oasisToast = vraiToast;
        }
        return out;
      }, MOUCHARD);

      const ch = r.chaine || {};
      verifier('la ronde bâtit sa chaîne — notification, dossier, rapport validé puis transmis',
        ch.plan === true && ch.notif === 201 && ch.dossier === true && ch.soumis === 200
        && ch.rapport === true && ch.valide === 200 && ch.transmis === 200,
        JSON.stringify(ch));
      const ra = r.rapport || {};
      verifier('le rapport s’ouvre dans sa fenêtre, et la croix de l’astuce l’écarte sans toucher à la barre',
        ra.geste === true && ra.ouverte === true && ra.contenu === true
        && ra.astuce === true && ra.astuceEcartee === true && ra.barreRestee === true,
        JSON.stringify(ra));
      verifier('dans le rapport, « Télécharger PDF » imprime une fois, et « Fermer » ferme la fenêtre',
        ra.barre === true && ra.avantClic === 0 && ra.apresImprimer === 1
        && ra.ouverteApresImprimer === true && ra.fermetures === 1 && ra.fermee === true
        // Sous le relevé, le mouchard doit être dans la fenêtre : sans lui, ses
        // gestes manqueraient au relevé sans que rien ne le dise.
        && (!MOUCHARD || ra.mouchard === true),
        JSON.stringify(ra));

      const fi = r.fiche || {};
      // Le bouton du dossier passe `autoPrint` : une impression part seule, au
      // chargement — **une**, et le bouton en ajoute une.
      verifier('la fiche s’ouvre par « Exporter PDF » du dossier et s’imprime une fois d’elle-même',
        fi.dossier === true && fi.geste === true && fi.ouverte === true
        && fi.contenu === true && fi.avantClic === 1,
        JSON.stringify(fi));
      verifier('dans la fiche, « Télécharger PDF » imprime une fois de plus, et « Fermer » ferme la fenêtre',
        fi.barre === true && fi.apresImprimer === 2
        && fi.ouverteApresImprimer === true && fi.fermetures === 1 && fi.fermee === true
        && (!MOUCHARD || fi.mouchard === true),
        JSON.stringify(fi));
      const so = r.soumission || {};
      verifier('l’aperçu de la fiche offre la soumission, et refuser le choix du validateur ne soumet rien',
        so.brouillon === 201 && so.statutAvant === 'brouillon' && so.apercu === true
        && so.bouton === true && so.choixOuvert === true && (so.validateurs || []).length >= 1
        && so.choixFermeAuRefus === true && so.statutApresRefus === 'brouillon',
        JSON.stringify(so));
      verifier('confirmer sans validateur est refusé par l’écran, qui le dit, et rien ne part',
        (so.ditSansChoix || []).length === 1 && so.ditSansChoix[0] === so.attenduSansChoix
        && so.choixResteSansChoix === true && so.statutSansChoix === 'brouillon',
        JSON.stringify(so));
      verifier('le validateur choisi, la notification est soumise à lui, sa saisie gardée, et l’écran passe aux soumises',
        so.statutApres === 'soumis' && so.validateurChoisi === true && so.objetGarde === true
        && so.voletFerme === true && so.ongletSoumis === true
        && so.rejet === 200 && so.retrait === 200 && so.resteEnBase === false,
        JSON.stringify(so));
      verifier('vu puis supprimé par son geste, le dossier est oublié de l’écran, qui ne le redemande plus',
        ch.retenuAvant === true && ch.dossierRetire === 200 && ch.retenuApres === false
        && ch.demandesAuGeste === 0,
        JSON.stringify({
          avant: ch.retenuAvant, retire: ch.dossierRetire, apres: ch.retenuApres,
          demandes: ch.demandesAuGeste,
        }));
      verifier('supprimé par une autre main, le dossier retenu est redemandé une fois, puis oublié',
        !!ch.autreMain && ch.autreMain.demandes === 1 && ch.autreMain.oublie === true,
        JSON.stringify(ch.autreMain));
      verifier('la ronde ne laisse rien : dossier, rapport et notification sont partis',
        ch.dossierRetire === 200
        && ch.notifRestee === false && ch.rapportReste === false,
        JSON.stringify(ch));
    },
  });
};
