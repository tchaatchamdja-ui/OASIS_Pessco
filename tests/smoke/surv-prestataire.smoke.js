// Fumée — SURV : deux gestes que seul l'organisme surveillé voit.
// Écran « Exécution de la Surveillance », dans un navigateur, en vue Prestataire.
//
// ── Ce qui restait ──
//
//   · `execAccuserReception` — « Accuser réception », sur la page des
//     notifications reçues : l'organisme reconnaît la mission annoncée ;
//   · `execViewFNC` — l'œil « Consulter » d'une constatation, dans le volet d'un
//     dossier clôturé : l'organisme la lit sans pouvoir la modifier.
//
// ── Ils n'exigent pas une seconde session ──
//
// L'ADR les disait « hors de portée des suites » : offerts au seul compte qui
// ne gouverne pas le module, quand la suite se connecte en super-administrateur.
// La note de couverture avait pourtant vu le chemin (n° 5.f.85) : la **vue
// Prestataire** de la barre. Le serveur y sert un compte simulé, de rôle
// `PRESTATAIRE` — `M3_Prestataire` à l'écran —, borné à l'organisme choisi. Il
// ne gouverne pas. La ronde y bascule
// par la route (la bascule par la barre est éprouvée dans `surv.smoke.js`), et
// revient en vue Autorité quoi qu'il arrive : la vue est persistée pour le
// compte, et une suite qui la laisserait livrerait aux suivantes un compte qui
// ne voit plus que cinq pages.
//
// ── Le chemin ──
//
// Une notification envoyée à l'organisme ; il en accuse réception — refusé
// d'abord à la confirmation, puis donné. L'Autorité prend l'accord, ce qui ouvre
// le dossier ; elle y pose une constatation, valide et transmet le rapport,
// clôture, et solde la constatation. L'organisme rejoint alors le dossier par
// le seul chemin que l'écran lui offre — le tableau de bord, ses statistiques,
// l'œil d'une constatation soldée — et l'y consulte.
//
// Ce chemin-là a été cherché, non supposé. La première ronde cherchait le
// dossier dans les pages de la vue, et ne l'y trouvait pas : elles ne listent
// pas les dossiers, et la table des constatations mène une constatation en
// vigueur — soldée comprise — à son plan d'actions, non à son dossier. Le ménage supprime le dossier, qui emporte sa notification et
// son rapport.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

module.exports = async function survPrestataireSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (prestataire)',
    titre: 'SURV : accuser réception et consulter une constatation, du côté de l’organisme',
    rondes: async ({ page, jalon, M }) => {
      const monte = async () => {
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(() => {
          const el = document.getElementById('exec-content');
          return el && el.textContent.trim().length > 100;
        }, { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
      };
      const env = (url, methode, corps) => page.evaluate(async ({ u, m, c }) => {
        const r = await fetch(u, {
          method: m, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          ...(c ? { body: JSON.stringify(c) } : {}),
        });
        let b = null; try { b = await r.json(); } catch { /* corps vide */ }
        return { statut: r.status, corps: b };
      }, { u: url, m: methode || 'GET', c: corps || null });
      // La vue se pose chez le serveur ; la page rechargée la prend.
      const vue = async (v, prestataireId) => {
        const r = await env(`${M}/vue`, 'PUT', v === 'prestataire'
          ? { vue: v, prestataire_id: prestataireId } : { vue: v });
        await page.reload({ waitUntil: 'networkidle2' });
        await monte();
        return r.statut;
      };

      const ch = {};
      try {
        // ── 1. La notification envoyée, côté Autorité ──
        jalon('prestataire : la notification envoyée');
        Object.assign(ch, await page.evaluate(async (api) => {
          const env2 = async (u, m, c) => {
            const r = await fetch(u, {
              method: m, credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
              ...(c ? { body: JSON.stringify(c) } : {}),
            });
            let b = null; try { b = await r.json(); } catch { /* corps vide */ }
            return { statut: r.status, corps: b };
          };
          const plans = await (await fetch(`${api}/plans-valides`, { credentials: 'same-origin' })).json();
          const plan = (plans || []).find((p) => (p.activites || []).length);
          if (!plan) return { plan: false };
          const a = plan.activites[0];
          const n = await env2(`${api}/notifications`, 'POST', {
            activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
            objet: 'SURV prestataire — la mission annoncée', type_supervision: 'Audit',
            date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
            lieu: 'Siège', perimetre: 'Ensemble des processus',
          });
          if (n.statut !== 201) return { plan: true, notif: n.statut };
          const pas = {};
          for (const e of ['submit', 'validate', 'send']) {
            // eslint-disable-next-line no-await-in-loop
            pas[e] = (await env2(`${api}/notifications/${n.corps.id}/${e}`, 'PUT')).statut;
          }
          return { plan: true, notifId: n.corps.id, prestataireId: a.prestataire_id, pas };
        }, M));
        verifier('une notification est envoyée à l’organisme par les routes',
          ch.plan && !!ch.notifId && !!ch.prestataireId
          && Object.values(ch.pas || {}).every((s) => s === 200),
          JSON.stringify(ch));
        if (!ch.notifId) return;

        // ── 2. L'accusé de réception, côté organisme ──
        jalon('prestataire : accuser réception');
        ch.versPrestataire = await vue('prestataire', ch.prestataireId);
        const accuse = await page.evaluate(async ({ api, id }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const lire = async () => (await (await fetch(`${api}/notifications/${id}`,
            { credentials: 'same-origin' })).json()) || {};
          const r = { role: (EXEC_STATE.user || {}).role_m3 };
          r.pages = [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page);
          // La page qui porte le bouton, cherchée parmi celles de la vue.
          const bouton = () => document.querySelector(`[onclick="execAccuserReception('${id}')"]`);
          for (const p of r.pages) {
            document.querySelector(`.nav-btn[data-page="${p}"]`)?.click();
            // eslint-disable-next-line no-await-in-loop
            await attendre(1800);
            if (bouton()) { r.page = p; break; }
            // Une page à sous-onglets : on les essaie.
            for (const t of [...document.querySelectorAll('.exec-tab')]) {
              t.click();
              // eslint-disable-next-line no-await-in-loop
              await attendre(1200);
              if (bouton()) { r.page = `${p} › ${(t.textContent || '').trim()}`; break; }
            }
            if (bouton()) break;
          }
          r.bouton = !!bouton() && !bouton().disabled;
          if (!r.bouton) return r;
          let envois = 0;
          const vrai = window.fetch;
          window.fetch = (u, o) => {
            if (/\/accuser-reception$/.test(String(u))) envois += 1;
            return vrai(u, o);
          };
          try {
            // Refusé à la confirmation : rien ne part.
            bouton().click();
            await attendre(600);
            r.confirmation = !!document.querySelector('.exec-proc-dialogue [data-rep="non"]');
            document.querySelector('.exec-proc-dialogue [data-rep="non"]')?.click();
            await attendre(800);
            r.refus = { envois, accuse: Number((await lire()).accuse_reception) || 0 };
            // Confirmé : l'accusé est porté, et le bouton se fige.
            bouton().click();
            await attendre(600);
            document.querySelector('.exec-proc-dialogue [data-rep="oui"]')?.click();
            await attendre(3000);
            const n = await lire();
            r.donne = {
              envois, accuse: Number(n.accuse_reception) || 0, par: n.accuse_par || '',
              boutonFige: !!bouton() && bouton().disabled === true,
              libelle: (bouton()?.textContent || '').trim(), attendu: te('accuse_fait'),
            };
          } finally { window.fetch = vrai; }
          return r;
        }, { api: M, id: ch.notifId });
        verifier('en vue Prestataire, l’écran raisonne en organisme et offre l’accusé de réception de la notification reçue',
          ch.versPrestataire === 200 && accuse.role === 'M3_Prestataire' && accuse.bouton === true,
          JSON.stringify({ vue: ch.versPrestataire, ...accuse, refus: undefined, donne: undefined }));
        verifier('refuser la confirmation n’accuse rien, et rien ne part',
          accuse.confirmation === true && !!accuse.refus
          && accuse.refus.envois === 0 && accuse.refus.accuse === 0,
          JSON.stringify(accuse.refus));
        verifier('confirmé, l’accusé est porté par le serveur, et le bouton se fige sur « accusé »',
          !!accuse.donne && accuse.donne.envois === 1 && accuse.donne.accuse === 1
          && !!accuse.donne.par && accuse.donne.boutonFige
          && accuse.donne.libelle === accuse.donne.attendu,
          JSON.stringify(accuse.donne));

        // ── 3. Le dossier mené jusqu'à la clôture, côté Autorité ──
        jalon('prestataire : le dossier clôturé');
        ch.versAac = await vue('aac');
        const acc = await env(`${M}/notifications/${ch.notifId}/validate-accord`, 'PUT', {
          date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03',
        });
        ch.dossierId = (acc.corps || {}).dossier_id || null;
        if (ch.dossierId) {
          const f = await env(`${M}/constatations`, 'POST', {
            dossier_id: ch.dossierId, domaine_id: 'AIR', criticite: 'majeur',
            description: 'SURV prestataire — l’écart que l’organisme consulte.',
          });
          ch.fncId = (f.corps || {}).id || null;
          ch.soumis = (await env(`${M}/dossiers/${ch.dossierId}/submit`, 'PUT')).statut;
          const rap = ((await env(`${M}/rapports`)).corps || []).find((x) => x.dossier_id === ch.dossierId);
          ch.valide = rap ? (await env(`${M}/rapports/${rap.id}/validate`, 'PUT')).statut : 0;
          ch.transmis = rap ? (await env(`${M}/rapports/${rap.id}/send`, 'PUT')).statut : 0;
          ch.clos = (await env(`${M}/dossiers/${ch.dossierId}/close`, 'PUT')).statut;
          // Soldée : c'est l'état où l'organisme rejoint le dossier depuis les
          // statistiques. Ouverte, l'écran le mène au suivi de son plan d'actions.
          ch.soldee = ch.fncId ? (await env(`${M}/constatations/${ch.fncId}/close`, 'PUT', {})).statut : 0;
        }
        verifier('l’accord ouvre le dossier, et l’Autorité le mène jusqu’à la clôture, la constatation soldée, par les routes',
          acc.statut === 200 && !!ch.dossierId && !!ch.fncId
          && ch.soumis === 200 && ch.valide === 200 && ch.transmis === 200 && ch.clos === 200
          && ch.soldee === 200,
          JSON.stringify({ accord: acc.statut, dossier: ch.dossierId, fnc: ch.fncId,
            soumis: ch.soumis, valide: ch.valide, transmis: ch.transmis, clos: ch.clos, soldee: ch.soldee }));
        if (!ch.fncId || ch.clos !== 200 || ch.soldee !== 200) return;

        // ── 4. La constatation consultée, côté organisme ──
        jalon('prestataire : consulter la constatation');
        await vue('prestataire', ch.prestataireId);
        const vu = await page.evaluate(async ({ dossierId, fncId }) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const r = {};
          const d0 = (EXEC_STATE.data.dossiers || []).find((x) => x.id === dossierId);
          const f0 = (EXEC_STATE.data.constatations || []).find((x) => x.id === fncId);
          r.donnees = { dossier: d0 ? d0.statut : null, constatation: f0 ? f0.statut : null,
            pages: [...document.querySelectorAll('.nav-btn[data-page]')].map((b) => b.dataset.page) };
          // Le chemin de l'organisme : le tableau de bord, ses statistiques, les
          // constatations clôturées, et l'œil de la sienne — qui, soldée et portée
          // par un dossier, ouvre le volet du dossier à ses constatations.
          document.querySelector('.nav-btn[data-page="dashboard"]')?.click();
          await attendre(2000);
          const stats = document.querySelector('[onclick="execShowStatistiquesAdvanced()"]');
          r.stats = !!stats;
          if (!stats) return r;
          stats.click();
          await attendre(2500);
          const carte = document.querySelector('#execSlider [onclick="execStatsIndicateur(\'emis_cloture\')"]');
          r.carte = !!carte;
          if (!carte) return r;
          carte.click();
          await attendre(2000);
          const oeilStats = document.querySelector(`#execSlider .exec-stats-detail [onclick="execOuvrirConstatation('${fncId}')"]`);
          r.dossier = !!oeilStats;
          if (!oeilStats) return r;
          oeilStats.click();
          await attendre(3500);
          const oeil = () => document.querySelector(`#execSlider [onclick="execViewFNC('${dossierId}','${fncId}')"]`);
          r.oeil = !!oeil();
          r.crayon = !!document.querySelector(`#execSlider [onclick="execEditFNC('${dossierId}','${fncId}')"]`);
          if (!r.oeil) return r;
          oeil().click();
          await attendre(2500);
          const volet = document.getElementById('execSlider');
          const texte = volet?.textContent || '';
          r.fiche = texte.includes('l’écart que l’organisme consulte');
          // Une consultation : aucun champ qu'on puisse saisir.
          r.saisissables = [...(volet?.querySelectorAll('input:not([type="hidden"]), textarea, select') || [])]
            .filter((e) => !e.disabled && !e.readOnly && e.offsetParent !== null).length;
          const retour = volet?.querySelector(`[onclick="execOpenDossierSlider('${dossierId}','constatations')"]`);
          r.retour = !!retour;
          if (retour) {
            retour.click();
            await attendre(3000);
            r.revenu = !!oeil();
          }
          return r;
        }, { dossierId: ch.dossierId, fncId: ch.fncId });
        verifier('le dossier clôturé offre à l’organisme l’œil « Consulter », et non le crayon',
          vu.dossier === true && vu.oeil === true && vu.crayon === false,
          JSON.stringify(vu));
        verifier('l’œil montre la constatation sans rien de saisissable, et « Retour » ramène aux constatations du dossier',
          vu.fiche === true && vu.saisissables === 0 && vu.retour === true && vu.revenu === true,
          JSON.stringify(vu));
      } finally {
        // ── Le ménage : la vue Autorité, puis le dossier ──
        const rv = await env(`${M}/vue`, 'PUT', { vue: 'aac' });
        ch.menage = { vue: rv.statut };
        if (ch.dossierId) {
          ch.menage.dossier = (await env(`${M}/dossiers/${ch.dossierId}`, 'DELETE')).statut;
        } else if (ch.notifId) {
          ch.menage.notification = (await env(`${M}/notifications/${ch.notifId}`, 'DELETE')).statut;
        }
        await page.reload({ waitUntil: 'networkidle2' });
        await monte();
        ch.menage.vueRendue = (await env(`${M}/vue`)).corps?.vue;
        const restent = async (url, champ, v) => (((await env(url)).corps || []).filter((x) => x[champ] === v)).length;
        ch.menage.restent = {
          dossiers: ch.dossierId ? await restent(`${M}/dossiers`, 'id', ch.dossierId) : 0,
          notifications: await restent(`${M}/notifications`, 'id', ch.notifId),
        };
      }
      verifier('la ronde rend la vue Autorité, et ne laisse ni dossier ni notification',
        ch.menage.vue === 200 && ch.menage.vueRendue === 'aac'
        && ch.menage.restent.dossiers === 0 && ch.menage.restent.notifications === 0,
        JSON.stringify(ch.menage));
    },
  });
};
