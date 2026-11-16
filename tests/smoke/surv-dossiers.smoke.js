// Fumée — SURV : les tris des tables de dossiers. Écran « Exécution de la
// Surveillance », page « Prestataires », dans un navigateur.
//
// ── Ce qui restait ──
//
// La page range les dossiers en trois onglets — en cours, clôturés,
// archivés —, chacun en tables par domaine, et chaque en-tête trie. Le tri des
// clôturés est exercé par `surv.smoke.js` ; ceux des dossiers en cours et des
// archivés ne l'étaient pas : les deux restes de `exec-prestataires.js`.
//
// ── Un tri ne se mesure qu'à deux lignes ──
//
// Le contrôle des clôturés le dit lui-même : avec une seule ligne, la flèche
// est le seul témoin. Ici la ronde bâtit **deux** dossiers sur des activités
// dont les organismes partagent un domaine — ils tombent donc dans la même
// table —, et mesure l'ordre des lignes, à l'aller puis au retour.
//
// Elle les mène ensuite jusqu'à l'archive — rapport transmis, clôture,
// archivage, par les vraies routes — pour éprouver le second tri, puis les
// désarchive et les supprime : la suppression emporte rapport et notification.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

module.exports = async function survDossiersSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (dossiers)',
    titre: 'SURV : les tris des dossiers en cours et des dossiers archivés',
    rondes: async ({ page, jalon }) => {
      jalon('tris des dossiers');
      const r = await page.evaluate(async () => {
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
        const api = EXEC_MODULE_API;
        const out = { chaine: {} };
        const ch = out.chaine;

        // ── 0. Deux activités dont les organismes partagent un domaine ──
        execNavigateTo('plan_surveillance');
        await attendre(1200);
        const domaineDe = {};
        (EXEC_STATE.data.prestataires || []).forEach((p) => { domaineDe[p.id] = p.domaine_id || ''; });
        const parDomaine = {};
        (EXEC_STATE.data.plansValidesPlanif || []).forEach((plan) => (plan.activites || [])
          .forEach((a) => {
            const d = domaineDe[a.prestataire_id];
            if (d === undefined) return;
            (parDomaine[d] = parDomaine[d] || []).push({ plan, a });
          }));
        const paire = Object.values(parDomaine).find((l) => l.length >= 2);
        ch.paire = !!paire;
        if (!paire) return out;

        const dossiers = [];
        for (const [i, { plan, a }] of paire.slice(0, 2).entries()) {
          /* eslint-disable no-await-in-loop */
          const n = await env(`${api}/notifications`, 'POST', {
            activite_id: a.id, plan_id: plan.id, prestataire_id: a.prestataire_id,
            objet: `SURV dossiers — tri ${i + 1}`, type_supervision: 'Audit',
            date_debut_prevue: `2026-09-0${i + 1}`, date_fin_prevue: `2026-09-0${i + 3}`,
            lieu: 'Siège', perimetre: 'Ensemble des processus',
          });
          if (n.statut !== 201) { ch.notif = n.statut; return out; }
          for (const etape of ['submit', 'validate', 'send']) {
            await env(`${api}/notifications/${n.corps.id}/${etape}`, 'PUT');
          }
          const acc = await env(`${api}/notifications/${n.corps.id}/validate-accord`, 'PUT', {
            date_debut_effective: `2026-09-0${i + 1}`, date_fin_effective: `2026-09-0${i + 3}`,
          });
          const id = (acc.corps || {}).dossier_id;
          if (!id) { ch.dossier = false; return out; }
          dossiers.push({ id, notif: n.corps.id });
        }
        ch.dossiers = dossiers.length;
        await execLoadData();

        // ── Lecture de l'ordre : les lignes de la table qui porte les miens ──
        const ids = dossiers.map((d) => d.id);
        const ordre = (etape) => {
          const marque = (id) => document.querySelector(
            `#dossier_page_content [onclick="execOpenDossierSlider('${id}','${etape}')"]`);
          const tr0 = marque(ids[0]) && marque(ids[0]).closest('tr');
          const tr1 = marque(ids[1]) && marque(ids[1]).closest('tr');
          if (!tr0 || !tr1) return { presents: false };
          const memeTable = tr0.closest('table') === tr1.closest('table');
          const lignes = [...tr0.closest('tbody').children];
          const refs = lignes.map((tr) => (tr.querySelector('td strong')?.textContent || '').trim());
          return {
            presents: true,
            memeTable,
            premier: lignes.indexOf(tr0) < lignes.indexOf(tr1) ? ids[0] : ids[1],
            refs,
          };
        };
        const entete = (fn, col) => document.querySelector(
          `#dossier_page_content th[onclick="${fn}('${col}')"]`);
        const aller = async (cle) => {
          document.querySelector(`.exec-tab[onclick^="EXEC_STATE.dossierPageTab='${cle}'"]`)?.click();
          await attendre(800);
        };
        // Un tri par référence : à l'aller, croissant ; au retour, décroissant.
        // L'ordre attendu se calcule sur les références lues, avec la même
        // comparaison que l'écran — en minuscules.
        const eprouverTri = async (fn, etape) => {
          const o = {};
          const avant = ordre(etape);
          o.presents = avant.presents;
          o.memeTable = avant.memeTable;
          if (!avant.presents) return o;
          entete(fn, 'ref')?.click();
          await attendre(800);
          const aller1 = ordre(etape);
          o.fleche1 = (entete(fn, 'ref')?.textContent || '').trim().slice(-1);
          o.refs1 = aller1.refs;
          o.croissant = aller1.refs.every((x, i, t) => i === 0
            || t[i - 1].toLowerCase() <= x.toLowerCase());
          entete(fn, 'ref')?.click();
          await attendre(800);
          const retour = ordre(etape);
          o.fleche2 = (entete(fn, 'ref')?.textContent || '').trim().slice(-1);
          o.refs2 = retour.refs;
          o.decroissant = retour.refs.every((x, i, t) => i === 0
            || t[i - 1].toLowerCase() >= x.toLowerCase());
          o.inverse = aller1.premier !== retour.premier;
          o.distinctes = new Set(aller1.refs).size === aller1.refs.length;
          return o;
        };

        // ── 1. Le tri des dossiers en cours ──
        document.querySelector('.nav-btn[data-page="prestataires"]')?.click();
        await attendre(1500);
        await aller('en_cours');
        out.enCours = await eprouverTri('execSortDossiersEnCours', 'realisation');

        // ── 2. Jusqu'à l'archive, par les vraies routes ──
        for (const d of dossiers) {
          d.soumis = (await env(`${api}/dossiers/${d.id}/submit`, 'PUT')).statut;
          const rap = ((await lire(`${api}/rapports`)) || []).find((x) => x.dossier_id === d.id);
          d.valide = rap ? (await env(`${api}/rapports/${rap.id}/validate`, 'PUT')).statut : 0;
          d.transmis = rap ? (await env(`${api}/rapports/${rap.id}/send`, 'PUT')).statut : 0;
          d.clos = (await env(`${api}/dossiers/${d.id}/close`, 'PUT')).statut;
          d.archive = (await env(`${api}/dossiers/${d.id}/archiver`, 'PUT', {})).statut;
        }
        ch.archivage = dossiers.map(({ soumis, valide, transmis, clos, archive }) => ({
          soumis, valide, transmis, clos, archive,
        }));
        await execLoadData();
        execRenderPage();
        await attendre(800);

        // ── 3. Le tri des dossiers archivés ──
        await aller('archives');
        out.archives = await eprouverTri('execSortDossiersArchives', 'notification');
        await aller('en_cours');

        // ── 4. Le ménage ──
        ch.menage = [];
        for (const d of dossiers) {
          ch.menage.push({
            desarchive: (await env(`${api}/dossiers/${d.id}/desarchiver`, 'PUT', {})).statut,
            retire: (await env(`${api}/dossiers/${d.id}`, 'DELETE')).statut,
          });
        }
        const restent = async (url, champ, valeurs) => ((await lire(url)) || [])
          .filter((x) => valeurs.includes(x[champ])).length;
        ch.restent = {
          dossiers: await restent(`${api}/dossiers`, 'id', ids),
          notifications: await restent(`${api}/notifications`, 'id', dossiers.map((d) => d.notif)),
          rapports: await restent(`${api}/rapports`, 'dossier_id', ids),
        };
        await execLoadData();
        return out;
      });

      const ch = r.chaine || {};
      verifier('la ronde bâtit deux dossiers sur des organismes d’un même domaine',
        ch.paire === true && ch.dossiers === 2,
        JSON.stringify(ch));
      const tri = (o) => o && o.presents === true && o.memeTable === true && o.distinctes === true
        && o.fleche1 === '▲' && o.croissant === true
        && o.fleche2 === '▼' && o.decroissant === true && o.inverse === true;
      verifier('le tri des dossiers en cours range par référence, croissant puis décroissant au second clic',
        tri(r.enCours), JSON.stringify(r.enCours));
      verifier('les deux dossiers vont jusqu’à l’archive par les vraies routes',
        (ch.archivage || []).length === 2 && ch.archivage.every((d) => d.soumis === 200
          && d.valide === 200 && d.transmis === 200 && d.clos === 200 && d.archive === 200),
        JSON.stringify(ch.archivage));
      verifier('le tri des dossiers archivés range par référence, croissant puis décroissant au second clic',
        tri(r.archives), JSON.stringify(r.archives));
      verifier('la ronde ne laisse rien : dossiers, notifications et rapports sont partis',
        (ch.menage || []).length === 2
        && ch.menage.every((m) => m.desarchive === 200 && m.retire === 200)
        && !!ch.restent && ch.restent.dossiers === 0
        && ch.restent.notifications === 0 && ch.restent.rapports === 0,
        JSON.stringify({ menage: ch.menage, restent: ch.restent }));
    },
  });
};
