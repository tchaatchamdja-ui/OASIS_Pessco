// Fumée — SURV : les deux gestes que l'adaptateur pose sur la barre du socle.
// Écran « Exécution de la Surveillance », dans un navigateur.
//
// ── Ce qui restait ──
//
// `exec-adapters.js` pose en barre supérieure la bascule des vues, l'instance
// regardée et le renvoi vers la gestion des droits. La bascule est exercée par
// `surv.smoke.js` ; les deux autres ne l'étaient pas.
//
// ── Deux gestes qui quittent la page ──
//
// Changer d'instance écrit le choix chez le serveur puis **recharge** le
// module ; la gestion des droits **navigue** vers un autre écran. On ne les
// mesure donc pas dans la page, mais d'un côté et de l'autre du chargement :
// ce que le serveur retient, ce que la page rechargée montre.
//
// Le choix d'instance est **persisté** pour le compte : une suite qui le
// laisserait ailleurs livrerait aux suivantes un compte qui ne voit plus les
// données de l'instance locale. La ronde le rétablit par le geste, puis, quoi
// qu'il arrive, par la route.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

module.exports = async function survBarreSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (barre)',
    titre: 'SURV : l’instance regardée et le renvoi vers la gestion des droits, en barre supérieure',
    rondes: async ({ page, jalon, M }) => {
      const monte = async () => {
        await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
        await page.waitForFunction(() => {
          const el = document.getElementById('exec-content');
          return el && el.textContent.trim().length > 100;
        }, { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200));
      };
      const lireInstance = () => page.evaluate(async (api) => (await fetch(`${api}/instance`,
        { credentials: 'same-origin' })).json(), M);
      const liste = () => page.evaluate(() => {
        const s = document.querySelector('.oasis-module-actions select[title="Instance regardée"]');
        return s ? { valeur: s.value, options: [...s.options].map((o) => o.value) } : null;
      });
      // Le geste : la valeur posée dans la liste, et l'événement que la barre
      // écoute. Il recharge la page : on attend la navigation en même temps.
      const choisir = async (valeur) => {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
          page.evaluate((v) => {
            const s = document.querySelector('.oasis-module-actions select[title="Instance regardée"]');
            if (!s) return;
            s.value = v;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }, valeur),
        ]);
        await monte();
      };

      // ── 0. Le contexte arrivé le dernier ──
      //
      // La barre se dessine à l'arrivée de `/vue`, de `/instance`, et du compte.
      // Le bouton des droits tient au rôle : si les deux premières précèdent
      // `/context`, il faut que l'arrivée du compte redessine. L'ordre ordinaire
      // les sert dans l'autre sens, à une dizaine de millisecondes près — un
      // relevé ne le verrait qu'une fois sur cent. La ronde le **force** :
      // `/context` retardé dans la page, avant que rien n'y soit chargé.
      jalon('barre : le contexte arrivé le dernier');
      const retard = await page.evaluateOnNewDocument(() => {
        const vrai = window.fetch;
        window.fetch = function (u, o) {
          const p = vrai.call(this, u, o);
          return /\/api\/m\/execution\/context$/.test(String(u))
            ? p.then((r) => new Promise((ok) => setTimeout(() => {
              window.__contexteServi = performance.now(); ok(r);
            }, 700))) : p;
        };
      });
      const ordre = {};
      try {
        await page.reload({ waitUntil: 'networkidle2' });
        await monte();
        Object.assign(ordre, await page.evaluate(() => {
          const fin = (n) => (performance.getEntriesByType('resource')
            .find((e) => e.name.endsWith(`/api/m/execution/${n}`)) || {}).responseEnd || 0;
          return {
            role: (EXEC_STATE.user || {}).role,
            // Servi à l'écran après les deux autres : l'ordre perdant, tenu.
            contexteApres: fin('vue') > 0 && fin('instance') > 0
              && window.__contexteServi > Math.max(fin('vue'), fin('instance')),
            bouton: !!document.querySelector('.oasis-module-actions button[title="Gestion des Droits"]'),
            instance: !!document.querySelector('.oasis-module-actions select[title="Instance regardée"]'),
          };
        }));
      } finally {
        await page.removeScriptToEvaluateOnNewDocument(retard.identifier);
        await page.reload({ waitUntil: 'networkidle2' });
        await monte();
      }
      verifier('le contexte arrivé après /vue et /instance, la barre porte encore « Gestion des Droits »',
        ordre.role === 'SUPERADMIN' && ordre.contexteApres && ordre.bouton && ordre.instance,
        JSON.stringify(ordre));

      // ── 1. L'instance regardée ──
      jalon('barre : instance regardée');
      const avant = await lireInstance();
      const l0 = await liste();
      const inst = { disponible: avant.disponible === true, liste: !!l0 };
      inst.origine = avant.courante || '';
      inst.listeSurOrigine = !!l0 && l0.valeur === inst.origine;
      inst.regionaleOfferte = !!l0 && l0.options.includes('');
      const autre = l0 && l0.options.find((v) => v && v !== inst.origine);
      inst.autre = autre || null;
      try {
        if (l0 && autre) {
          // Reprendre l'instance déjà regardée ne fait rien : ni écriture, ni
          // rechargement. La page porte une marque qu'un rechargement effacerait.
          // Si le geste recharge quand même, la page emporte le contexte de
          // l'évaluation : c'est le défaut cherché, et il doit se lire comme tel
          // — non comme une exception qui arrête la suite.
          inst.sansEffet = await page.evaluate(async (v) => {
            const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
            let ecritures = 0;
            const vrai = window.fetch;
            window.fetch = (u, o) => {
              if (/\/instance$/.test(String(u)) && ((o || {}).method || 'GET') === 'PUT') ecritures += 1;
              return vrai(u, o);
            };
            window.__marqueBarre = true;
            try {
              const s = document.querySelector('.oasis-module-actions select[title="Instance regardée"]');
              s.value = v;
              s.dispatchEvent(new Event('change', { bubbles: true }));
              await attendre(1500);
            } finally { window.fetch = vrai; }
            return { ecritures, resteLa: window.__marqueBarre === true };
          }, inst.origine).catch(async (e) => {
            await monte();
            return { rechargee: true, erreur: String(e && e.message || e).slice(0, 80) };
          });

          // Une autre : le serveur la retient, et la page rechargée la montre.
          await choisir(autre);
          const apres = await lireInstance();
          const l1 = await liste();
          inst.retenue = apres.courante;
          inst.listeApres = l1 && l1.valeur;
          inst.recharge = await page.evaluate(() => window.__marqueBarre !== true);

          // Et l'on revient, par le même geste.
          await choisir(inst.origine);
          inst.revenue = (await lireInstance()).courante;
          inst.listeRevenue = (await liste() || {}).valeur;
        }
      } finally {
        // Quoi qu'il arrive, le compte retrouve son instance.
        if ((await lireInstance()).courante !== inst.origine) {
          await page.evaluate(async ({ api, v }) => fetch(`${api}/instance`, {
            method: 'PUT', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ instance: v }),
          }), { api: M, v: inst.origine });
          inst.retabliParLaRoute = true;
        }
      }

      verifier('la barre offre l’instance regardée au super-administrateur régional, sur la sienne, vue régionale comprise',
        inst.disponible && inst.liste && inst.listeSurOrigine && inst.regionaleOfferte && !!inst.autre,
        JSON.stringify(inst));
      verifier('reprendre l’instance déjà regardée ne fait rien : ni écriture, ni rechargement',
        !!inst.sansEffet && inst.sansEffet.ecritures === 0 && inst.sansEffet.resteLa === true,
        JSON.stringify(inst.sansEffet));
      verifier('une autre instance choisie est retenue par le serveur, et la page rechargée la montre',
        !!inst.autre && inst.retenue === inst.autre && inst.listeApres === inst.autre && inst.recharge === true,
        JSON.stringify({ autre: inst.autre, retenue: inst.retenue, liste: inst.listeApres, recharge: inst.recharge }));
      verifier('le même geste ramène l’instance d’origine, sans que la route ait à la rétablir',
        inst.revenue === inst.origine && inst.listeRevenue === inst.origine && !inst.retabliParLaRoute,
        JSON.stringify({ origine: inst.origine, revenue: inst.revenue, liste: inst.listeRevenue }));

      // ── 2. Le renvoi vers la gestion des droits, et le retour ──
      jalon('barre : gestion des droits');
      const dr = {};
      dr.bouton = await page.evaluate(() => !!document
        .querySelector('.oasis-module-actions button[title="Gestion des Droits"]'));
      if (dr.bouton) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
          page.evaluate(() => document
            .querySelector('.oasis-module-actions button[title="Gestion des Droits"]').click()),
        ]);
        await page.waitForFunction(() => {
          const el = document.getElementById('app');
          return el && !el.querySelector('[data-oasis-loader]') && el.textContent.trim().length > 100;
        }, { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200));
        Object.assign(dr, await page.evaluate(() => ({
          chemin: location.pathname + location.search,
          module: window.DR_MODULE,
          rendu: (document.getElementById('app')?.textContent || '').trim().length,
          retour: !!document.querySelector('.oasis-module-actions button[title="Retour au module"]'),
        })));
        if (dr.retour) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            page.evaluate(() => document
              .querySelector('.oasis-module-actions button[title="Retour au module"]').click()),
          ]);
          await monte();
          Object.assign(dr, await page.evaluate(() => ({
            revenu: location.pathname,
            barreDebout: !!document.querySelector('.nav-btn[data-page]'),
          })));
        }
      }
      verifier('« Gestion des Droits » mène à l’écran des droits, réglé sur le module SURV, qui se rend',
        dr.bouton === true && dr.chemin === '/modules/droits/index.html?module=SURV'
        && dr.module === 'SURV' && dr.rendu > 100,
        JSON.stringify(dr));
      verifier('l’écran des droits ramène au module par « Retour au module »',
        dr.retour === true && dr.revenu === '/modules/execution/index.html' && dr.barreDebout === true,
        JSON.stringify({ retour: dr.retour, revenu: dr.revenu, barre: dr.barreDebout }));
    },
  });
};
