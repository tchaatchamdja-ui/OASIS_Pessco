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
    titre: 'SURV : les documents imprimables — imprimer, fermer, écarter l’astuce',
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
        chaine.dossierRetire = (await env(`${api}/dossiers/${dossierId}`, 'DELETE')).statut;
        chaine.notifRestee = ((await lire(`${api}/notifications`)) || []).some((x) => x.id === notifId);
        chaine.rapportReste = ((await lire(`${api}/rapports`)) || []).some((x) => x.dossier_id === dossierId);
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
      verifier('la ronde ne laisse rien : dossier, rapport et notification sont partis',
        ch.dossierRetire === 200
        && ch.notifRestee === false && ch.rapportReste === false,
        JSON.stringify(ch));
    },
  });
};
