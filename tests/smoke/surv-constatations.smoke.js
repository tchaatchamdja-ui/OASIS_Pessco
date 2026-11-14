// Fumée — SURV : la remise d'une constatation directe, l'œil des statistiques,
// et la fenêtre de commentaire qu'on referme par son fond.
// Écran « Exécution de la Surveillance », dans un navigateur.
//
// ── Ce qui restait ──
//
// Trois gestes que rien n'exerçait, et qui se suivent dans la vie d'une
// constatation relevée hors activité :
//
//   · `execTransmettreConstatation` — « Envoyer », au pied du courriel de
//     remise. `surv.smoke.js` mène la constatation jusqu'à ce courriel et s'y
//     arrête : sa ronde efface sa constatation en partant, et l'écran n'offre
//     plus de l'effacer une fois remise. Celle-ci l'efface par la route ;
//   · `execOuvrirConstatation` — l'œil du détail d'un indicateur, dans les
//     statistiques. Il aiguille selon le statut, et arme le retour : « Retour »
//     doit ramener aux statistiques, non au tableau de bord ;
//   · le fond de la fenêtre de commentaire (`_execCommentModal`) — un clic hors
//     de la boîte la referme sans rien envoyer, un clic dedans ne la referme pas.
//
// La remise passe par le sas de messagerie de la suite : le courriel est relevé
// là, et rien ne sort de la machine.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

const DESTINATAIRE = 'organisme.surv-constatations@essai.test';

module.exports = async function survConstatationsSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (constatations)',
    titre: 'SURV : remettre une constatation directe, l’ouvrir depuis les statistiques, refermer un commentaire par son fond',
    rondes: async ({ page, sas, jalon, M }) => {
      await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));

      // ── 1. La remise ──
      jalon('constatations : la remise');
      const remise = await page.evaluate(async ({ api, destinataire }) => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const J = async (u, m = 'GET', b) => {
          const r = await fetch(u, {
            method: m, credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: b ? JSON.stringify(b) : undefined,
          });
          let c = null; try { c = await r.json(); } catch { c = null; }
          return { statut: r.status, corps: c };
        };
        const lire = async (id) => (await J(`${api}/constatations/${id}`)).corps || {};
        const r = {};
        const prestataires = EXEC_STATE.data.prestataires || [];
        const domaines = EXEC_STATE.data.domaines || [];
        r.matiere = { prestataires: prestataires.length, domaines: domaines.length };
        if (!prestataires.length || !domaines.length) return r;

        // Menée jusqu'à « validée » par la route : ce qui est éprouvé ici
        // commence à la remise. `surv.smoke.js` éprouve le reste du circuit.
        const c = await J(`${api}/constatations`, 'POST', {
          prestataire_id: prestataires[0].id, domaine_id: domaines[0].id,
          titre: 'SURV constatations — la constatation remise',
          description: 'Portée par la ronde de la remise.',
          criticite: 'majeure', delai_solde: '30', direct: true,
        });
        r.id = (c.corps || {}).id || null;
        if (!r.id) return r;
        await J(`${api}/constatations/${r.id}/direct-soumettre`, 'PUT');
        r.validee = (await J(`${api}/constatations/${r.id}/direct-valider`, 'PUT')).corps?.statut;

        const dits = [];
        const vraiToast = window.oasisToast;
        window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
        let envois = 0;
        const vraiFetch = window.fetch;
        window.fetch = (u, o) => {
          if (/\/transmettre$/.test(String(u)) && ((o || {}).method || 'GET') === 'POST') envois += 1;
          return vraiFetch(u, o);
        };
        try {
          await execRefreshDynamic();
          execOpenConstatationDirecteSlider(r.id, 'transmission');
          await attendre(3400);
          const champ = () => document.getElementById('courriel_destinataire');
          const envoyer = () => document.getElementById('courriel_envoyer');
          r.courriel = !!champ() && !!envoyer();
          if (!r.courriel) return r;

          // Sans destinataire : l'écran le dit, et rien ne part.
          champ().value = '';
          let n0 = dits.length;
          envoyer().click();
          await attendre(1200);
          r.sansDestinataire = {
            dit: dits.slice(n0), attendu: te('indiquez_destinataire'),
            envois, statut: (await lire(r.id)).statut,
            boutonLibre: !!envoyer() && !envoyer().disabled,
          };

          // Le destinataire saisi : remise, puis le volet rouvert sur elle.
          champ().value = destinataire;
          n0 = dits.length;
          envoyer().click();
          await attendre(5000);
          const apres = await lire(r.id);
          r.avecDestinataire = {
            dit: dits.slice(n0), envois, statut: apres.statut,
            transmisA: apres.transmis_a || '', reference: apres.reference || '',
            document: !!apres.document,
            // Le document n'est pas joint : il est déposé, et le courriel en
            // porte le lien. On le relit par ce lien, comme le destinataire.
            lienDocument: (apres.document || {}).path || '',
            servi: await (async () => {
              const chemin = (apres.document || {}).path;
              if (!chemin) return null;
              const rr = await vraiFetch(chemin, { credentials: 'same-origin' });
              const octets = new Uint8Array(await rr.arrayBuffer());
              return { statut: rr.status, type: rr.headers.get('content-type') || '',
                signature: String.fromCharCode(...octets.slice(0, 5)) };
            })(),
            voletOuvert: !!EXEC_STATE.sliderOpen,
            voletSurElle: (document.getElementById('execSlider')?.textContent || '')
              .includes(apres.reference || '\u0000'),
            plusDEnvoi: !envoyer(),
          };
        } finally {
          window.fetch = vraiFetch;
          window.oasisToast = vraiToast;
        }
        return r;
      }, { api: M, destinataire: DESTINATAIRE });

      // Le courriel, relevé au sas : à qui il est parti, et ce qu'il porte.
      const reference = (remise.avecDestinataire || {}).reference || '';
      const lien = ((remise.avecDestinataire || {}).lienDocument || '').split('/').pop();
      const courriel = sas.recus.find((m) => (m.pour || []).includes(DESTINATAIRE));
      remise.sas = courriel ? {
        pour: courriel.pour,
        objetPorteLaReference: !!reference && (courriel.entetes.subject || '').includes(reference),
        // Le lien du document, tel que le destinataire le lit.
        lienDuDocument: !!lien && (courriel.texte || '').includes(`/api/m/execution/uploads/${lien}`),
      } : null;

      verifier('le courriel de remise refuse un envoi sans destinataire, le dit, et rien ne part',
        remise.validee === 'direct_valide' && remise.courriel === true
        && !!remise.sansDestinataire
        && remise.sansDestinataire.dit.includes(remise.sansDestinataire.attendu)
        && remise.sansDestinataire.envois === 0
        && remise.sansDestinataire.statut === 'direct_valide'
        && remise.sansDestinataire.boutonLibre === true,
        JSON.stringify({ validee: remise.validee, courriel: remise.courriel, sans: remise.sansDestinataire }));
      verifier('le destinataire saisi, la constatation est remise à lui, ouverte, sa fiche servie en PDF, et le volet rouvert sur elle',
        !!remise.avecDestinataire && remise.avecDestinataire.envois === 1
        && remise.avecDestinataire.statut === 'ouvert'
        && remise.avecDestinataire.transmisA.includes(DESTINATAIRE)
        && remise.avecDestinataire.document === true
        && !!remise.avecDestinataire.servi && remise.avecDestinataire.servi.statut === 200
        && remise.avecDestinataire.servi.signature === '%PDF-'
        && remise.avecDestinataire.voletOuvert && remise.avecDestinataire.voletSurElle
        && remise.avecDestinataire.plusDEnvoi,
        JSON.stringify(remise.avecDestinataire));
      verifier('le courriel arrive au destinataire saisi, la référence en objet et le lien de la fiche dans le corps',
        !!remise.sas && remise.sas.objetPorteLaReference && remise.sas.lienDuDocument,
        JSON.stringify(remise.sas));

      // ── 2. L'œil des statistiques, et le retour ──
      jalon('constatations : depuis les statistiques');
      const stats = remise.id && remise.avecDestinataire && remise.avecDestinataire.statut === 'ouvert'
        ? await page.evaluate(async (id) => {
          const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
          const s = {};
          execCloseSlider(true);
          await attendre(400);
          execShowStatistiquesAdvanced();
          await attendre(2500);
          // Ouverte, majeure : elle est dans « émises — ouvertes ».
          const carte = document.querySelector('#execSlider [onclick="execStatsIndicateur(\'emis_ouverte\')"]');
          s.carte = !!carte;
          if (!carte) return s;
          carte.click();
          await attendre(2000);
          const oeil = document.querySelector(`#execSlider .exec-stats-detail [onclick="execOuvrirConstatation('${id}')"]`);
          s.oeil = !!oeil;
          if (!oeil) return s;
          oeil.click();
          await attendre(3500);
          // Ouverte : l'œil mène à son suivi PAC.
          s.suiviPac = EXEC_STATE.selectedConstatation?.id === id;
          s.statsParties = !document.querySelector('#execSlider .exec-stats-detail');
          const retour = document.querySelector('#execSlider .exec-proc-retour');
          s.retour = !!retour;
          if (!retour) return s;
          retour.click();
          await attendre(3000);
          s.revenu = !!document.querySelector('#execSlider .exec-stats-detail');
          s.detailGarde = !!document.querySelector(`#execSlider .exec-stats-detail [onclick="execOuvrirConstatation('${id}')"]`);
          return s;
        }, remise.id) : null;
      verifier('l’œil du détail d’un indicateur ouvre la constatation à son suivi, et « Retour » ramène aux statistiques',
        !!stats && stats.carte && stats.oeil && stats.suiviPac && stats.statsParties
        && stats.retour && stats.revenu && stats.detailGarde,
        JSON.stringify(stats));

      // ── 3. La fenêtre de commentaire, refermée par son fond ──
      //
      // Elle s'ouvre au refus des preuves, à l'étape de la mise en œuvre, que
      // la constatation n'a pas atteinte : la ronde appelle donc ce que le
      // bouton appelle. Le geste mesuré est le clic, dedans puis dehors.
      jalon('constatations : le fond du commentaire');
      const modale = remise.id ? await page.evaluate(async ({ api, id }) => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const m = {};
        let ecritures = 0;
        const vrai = window.fetch;
        window.fetch = (u, o) => {
          if (String(u).includes(`/constatations/${id}`) && ((o || {}).method || 'GET') !== 'GET') ecritures += 1;
          return vrai(u, o);
        };
        try {
          execCloseSlider(true);
          await attendre(400);
          execPreuvesNonAcceptables(id);
          await attendre(300);
          const fond = () => document.getElementById('exec_comment_modal');
          m.ouverte = !!fond();
          if (!m.ouverte) return m;
          document.getElementById('exec_comment_text').value = 'Saisi, puis abandonné.';
          fond().querySelector('h3').click();
          await attendre(300);
          m.resteAuClicDedans = !!fond();
          fond()?.click();
          await attendre(800);
          m.fermeeAuFond = !fond();
          m.ecritures = ecritures;
          m.statut = (await (await vrai(`${api}/constatations/${id}`, { credentials: 'same-origin' })).json()).statut;
        } finally { window.fetch = vrai; }
        return m;
      }, { api: M, id: remise.id }) : null;
      verifier('la fenêtre de commentaire tient au clic dedans, se referme au clic sur son fond, et rien ne part',
        !!modale && modale.ouverte && modale.resteAuClicDedans && modale.fermeeAuFond
        && modale.ecritures === 0 && modale.statut === 'ouvert',
        JSON.stringify(modale));

      // ── Le ménage ──
      if (remise.id) {
        await page.evaluate(async ({ api, id }) => {
          try { execCloseSlider(true); } catch { /* rien d'ouvert */ }
          await fetch(`${api}/constatations/${id}`, {
            method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
          });
        }, { api: M, id: remise.id });
      }
    },
  });
};
