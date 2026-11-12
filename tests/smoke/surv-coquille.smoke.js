// Fumée — SURV : la coquille de l'écran et sa barre de filtres. Écran
// « Exécution de la Surveillance », dans un navigateur.
//
// ── Pourquoi une quatrième suite, et celle-ci ──
//
// `exec-app.js` était devenu le plus gros gisement de gestes non exercés de
// SURV — **15 occurrences sur 30**, quatorze noms, et ils se rangent en deux
// familles qui n'ont rien à voir avec un cycle de surveillance :
//
//   · **la coquille** : le thème, la langue, la barre latérale mobile, le
//     panneau des notifications et l'écouteur qui le referme d'un clic au
//     dehors ;
//   · **la barre de filtres** : huit listes déroulantes dont l'attribut écrit
//     directement dans `EXEC_STATE.filters`, et dont le resserrement mutuel
//     est le seul mécanisme non trivial de ce fichier.
//
// C'est la ronde la plus indépendante du dépôt : elle n'écrit rien qui dure et
// rend l'écran dans l'état où elle l'a trouvé — même thème, même langue,
// filtres remis. Elle ne voulait bâtir **aucune** chaîne ; elle en bâtit la plus
// courte possible, deux constatations directes, parce que l'écran n'en porte
// aucune sur ce jeu d'essai et qu'une table vide ne mesure pas un filtre.
//
// Le quatorzième nom, `execAccuserReception`, reste dehors et sa raison est
// **mesurée** : la route le réserve au prestataire notifié (`estPrestataire`,
// 403 `prestataire_notifie`), et les suites se connectent en SUPERADMIN. La
// bascule « Vue Prestataire » du module le met à portée — `req.user` y est le
// compte simulé —, et c'est la ronde suivante, qui débloquera du même coup
// `execViewFNC`, l'autre geste que l'ADR nomme hors de portée.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

module.exports = async function survCoquilleSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (coquille)',
    titre: 'SURV : le thème, la langue, les panneaux et la barre de filtres',
    rondes: async ({ page, jalon }) => {
      // ══════════════════════════════════════════════════════════════════
      //  1. Le thème : choisi, appliqué au document, et retenu
      // ══════════════════════════════════════════════════════════════════
      //
      // Ce qui se mesure n'est pas la pastille active : c'est que l'attribut
      // qui porte les couleurs **de toute la page** a changé, et que le choix
      // est retenu — sans quoi il serait perdu au rechargement, et l'agent
      // referait le geste à chaque visite.
      jalon('coquille : le thème');
      const theme = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const pastilles = [...document.querySelectorAll('.sidebar-theme-selector .theme-dot')];
        d.pastilles = pastilles.map((p) => p.dataset.theme);
        d.depart = document.documentElement.getAttribute('data-theme');
        const autre = pastilles.find((p) => p.dataset.theme !== d.depart);
        d.vise = autre ? autre.dataset.theme : '';
        autre?.click();
        await a(900);
        d.attribut = document.documentElement.getAttribute('data-theme');
        d.retenu = localStorage.getItem('pr_theme');
        d.etat = EXEC_STATE.theme;
        d.activeDeplacee = (document.querySelector('.sidebar-theme-selector .theme-dot.active') || {})
          .dataset?.theme;
        // Rendu à l'écran : la ronde ne laisse pas son thème derrière elle.
        document.querySelector(`.sidebar-theme-selector .theme-dot[data-theme="${d.depart}"]`)?.click();
        await a(700);
        d.rendu = document.documentElement.getAttribute('data-theme');
        return d;
      });

      verifier('le thème choisi s’applique au document entier, se retient, et déplace la pastille active',
        theme.pastilles.length >= 2 && !!theme.vise
        && theme.attribut === theme.vise && theme.retenu === theme.vise
        && theme.etat === theme.vise && theme.activeDeplacee === theme.vise
        && theme.rendu === theme.depart,
        JSON.stringify(theme));

      // ══════════════════════════════════════════════════════════════════
      //  2. La langue : le volet se charge à la demande, et l'écran suit
      // ══════════════════════════════════════════════════════════════════
      //
      // Le module ne charge d'emblée que le volet français ; les deux autres
      // pèsent 131 Ko et un agent n'en emploie jamais qu'un. Le geste réclame
      // donc **le volet avant de rendre** — rendre d'abord donnerait un écran
      // resté en français, sans erreur ni trace. C'est cela qu'on mesure : les
      // libellés de la barre changent tous, et reviennent.
      //
      // Et l'attribut `lang` de la page suit, pour qu'un lecteur d'écran
      // prononce l'écran dans la langue où il est écrit.
      jalon('coquille : la langue');
      const langue = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const libelles = () => [...document.querySelectorAll('.nav-btn[data-page] span')]
          .map((s) => (s.textContent || '').trim());
        const boutons = [...document.querySelectorAll('.sidebar-lang-selector .lang-btn')];
        d.langues = boutons.map((b) => (b.textContent || '').trim());
        d.departLangue = EXEC_STATE.lang;
        d.departAttribut = document.documentElement.getAttribute('lang');
        d.departLibelles = libelles();
        d.departPage = EXEC_STATE.currentPage;
        boutons.find((b) => (b.textContent || '').trim() === 'EN')?.click();
        await a(3200);
        d.langue = EXEC_STATE.lang;
        d.attribut = document.documentElement.getAttribute('lang');
        d.retenue = localStorage.getItem('pr_lang');
        d.libelles = libelles();
        d.page = EXEC_STATE.currentPage;
        d.actif = ((document.querySelector('.sidebar-lang-selector .lang-btn.active') || {})
          .textContent || '').trim();
        // Rendue au français, et la barre doit redevenir ce qu'elle était.
        [...document.querySelectorAll('.sidebar-lang-selector .lang-btn')]
          .find((b) => (b.textContent || '').trim() === 'FR')?.click();
        await a(3200);
        d.libellesRendus = libelles();
        d.langueRendue = EXEC_STATE.lang;
        return d;
      });

      const change = langue.departLibelles.length > 0
        && langue.libelles.length === langue.departLibelles.length
        && langue.departLibelles.some((x, i) => x !== langue.libelles[i]);
      verifier('la langue change l’écran entier, son attribut et ses libellés — et le volet se charge à la demande',
        langue.langues.join(',') === 'FR,EN,PT'
        && langue.langue === 'en' && langue.attribut === 'en' && langue.retenue === 'en'
        && langue.actif === 'EN' && change === true
        && langue.page === langue.departPage,
        JSON.stringify({ ...langue, change }));

      verifier('le retour au français rend les libellés d’origine, un pour un',
        langue.langueRendue === 'fr'
        && langue.libellesRendus.join('|') === langue.departLibelles.join('|'),
        JSON.stringify({ avant: langue.departLibelles, apres: langue.libellesRendus }));

      // ══════════════════════════════════════════════════════════════════
      //  3. La barre latérale mobile : deux gestes pour un même basculement
      // ══════════════════════════════════════════════════════════════════
      //
      // Le bouton du bandeau l'ouvre, le voile la referme — **le même geste aux
      // deux endroits**, et c'est pourquoi il compte deux occurrences. Le voile
      // est ce qui rend la fermeture possible au doigt, hors de la barre : s'il
      // cessait de porter le geste, la barre ne se refermerait plus que par le
      // bouton qu'elle recouvre.
      jalon('coquille : la barre mobile');
      const mobile = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const barre = () => document.querySelector('.app-sidebar');
        const voile = () => document.querySelector('.sidebar-backdrop');
        d.bouton = !!document.querySelector('.mobile-menu-btn[onclick^="execToggleMobileSidebar"]');
        d.voilePorteLeGeste = !!document.querySelector('.sidebar-backdrop[onclick^="execToggleMobileSidebar"]');
        d.fermeeAuDepart = !barre().classList.contains('mobile-open');
        document.querySelector('.mobile-menu-btn')?.click();
        await a(700);
        d.ouverte = barre().classList.contains('mobile-open');
        d.voileMontre = voile().classList.contains('show');
        // Et c'est le voile qui la referme.
        voile().click();
        await a(700);
        d.refermee = !barre().classList.contains('mobile-open');
        d.voileCache = !voile().classList.contains('show');
        return d;
      });

      verifier('la barre mobile s’ouvre par le bandeau et se referme par le voile, qui porte le même geste',
        mobile.bouton === true && mobile.voilePorteLeGeste === true
        && mobile.fermeeAuDepart === true
        && mobile.ouverte === true && mobile.voileMontre === true
        && mobile.refermee === true && mobile.voileCache === true,
        JSON.stringify(mobile));

      // ══════════════════════════════════════════════════════════════════
      //  4. Le panneau des notifications, et l'écouteur qui le referme
      // ══════════════════════════════════════════════════════════════════
      //
      // Trois propriétés, et la troisième est celle qui se casse sans bruit :
      //
      //   · la cloche l'ouvre, et le panneau annonce **le compte des alertes**
      //     que l'écran a calculées — non un nombre figé ;
      //   · la cloche le referme : c'est le même geste qui bascule ;
      //   · un clic **au dehors** le referme, et un clic **dedans** ne le
      //     referme pas. L'écouteur est posé sur le document, en différé, et il
      //     se retire lui-même — un écouteur qui resterait derrière refermerait
      //     le panneau suivant avant qu'on l'ait lu.
      jalon('coquille : le panneau des notifications');
      const panneau = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const vu = () => document.getElementById('execNotifPanel');
        // Chaque élément est **constaté** avant d'être cliqué : une ronde qui
        // s'effondre sur l'absence de ce qu'elle mesure emporte ses voisines,
        // et le rapport ne dit plus lequel manquait.
        const cloche = () => document.querySelector('.exec-notif-bell[onclick^="execToggleNotifPanel"]');
        d.cloche = !!cloche();
        d.alertes = typeof _getNotifAlerts === 'function' ? _getNotifAlerts().length : -1;
        cloche()?.click();
        await a(900);
        d.ouvert = !!vu();
        const entete = vu() && vu().querySelector('.exec-notif-panel-header strong');
        d.entete = entete ? (entete.textContent || '').trim() : '';
        d.items = vu() ? vu().querySelectorAll('.exec-notif-item').length : -1;
        // Un clic **dedans** ne referme rien : la garde de l'écouteur le dit.
        const corps = vu() && vu().querySelector('.exec-notif-panel-body');
        d.corps = !!corps;
        corps?.click();
        await a(500);
        d.survitAuClicDedans = !!vu();
        // Un clic au dehors le referme — c'est l'écouteur posé sur le document.
        const dehors = document.querySelector('.header-module-title')
          || document.querySelector('.app-header');
        d.dehors = !!dehors;
        dehors?.click();
        await a(600);
        d.fermeParLeDehors = !vu();
        // Et la cloche bascule : ouvert, puis refermé par elle-même.
        cloche()?.click();
        await a(700);
        d.rouvert = !!vu();
        cloche()?.click();
        await a(600);
        d.fermeParLaCloche = !vu();
        return d;
      });

      verifier('le panneau des notifications annonce le compte que l’écran a calculé, et la cloche le bascule',
        panneau.cloche === true && panneau.ouvert === true
        && panneau.entete.includes(`(${panneau.alertes})`)
        && (panneau.alertes === 0 ? panneau.items === 0 : panneau.items === panneau.alertes)
        && panneau.rouvert === true && panneau.fermeParLaCloche === true,
        JSON.stringify(panneau));

      verifier('un clic au dehors referme le panneau, un clic dedans ne le referme pas',
        panneau.survitAuClicDedans === true && panneau.fermeParLeDehors === true,
        JSON.stringify({
          dedans: panneau.survitAuClicDedans, dehors: panneau.fermeParLeDehors,
        }));

      // ══════════════════════════════════════════════════════════════════
      //  5. La barre de filtres : cinq listes du plan de surveillance
      // ══════════════════════════════════════════════════════════════════
      //
      // Chaque liste écrit dans `EXEC_STATE.filters` depuis son attribut, puis
      // redemande le rendu. Ce qui mérite d'être mesuré n'est pas l'écriture :
      // c'est le **resserrement mutuel**, et les deux règles que son commentaire
      // énonce — la sélection en cours reste visible même si les autres filtres
      // l'excluent, et si rien ne correspond la liste ne porte que « Tous »,
      // *sans retomber sur la liste entière*. Ce repli-là ferait reparaître un
      // organisme hors filtre, et personne ne le verrait.
      jalon('filtres : le plan de surveillance');
      const plans = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
        await a(3000);
        // Chaque liste se désigne par le filtre que son attribut écrit.
        const liste = (champ) => [...document.querySelectorAll('.filter-bar select')]
          .find((s) => (s.getAttribute('onchange') || '')
            .includes(`EXEC_STATE.filters.${champ}=this.value`));
        const options = (champ) => {
          const s = liste(champ);
          return s ? [...s.options].map((o) => o.value) : null;
        };
        const choisir = async (champ, valeur) => {
          const s = liste(champ);
          if (!s) return false;
          s.value = valeur;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2200);
          return true;
        };
        const rangs = () => document.querySelectorAll('.exec-accordion-header').length;

        d.listes = ['domaine', 'prestataire', 'type_supervision', 'mode_supervision', 'avancement']
          .map((c) => `${c}:${liste(c) ? 'oui' : 'non'}`);
        d.rangsAvant = rangs();

        // Le domaine et l'organisme : chacun écrit son filtre et restreint la
        // page. Le **resserrement** des listes entre elles se mesure sur la
        // page des organismes, où le jeu d'essai le permet — ici, les plans ne
        // couvrent qu'un domaine, et une liste d'un élément ne peut rien dire.
        const domaines = (options('domaine') || []).filter(Boolean);
        d.domaineVise = domaines[0] || '';
        d.poseDomaine = await choisir('domaine', d.domaineVise);
        d.filtreDomaine = EXEC_STATE.filters.domaine;
        d.domaineTenu = (options('domaine') || []).includes(d.domaineVise);

        const prestataires = (options('prestataire') || []).filter(Boolean);
        d.prestataireVise = prestataires[0] || '';
        d.posePrestataire = await choisir('prestataire', d.prestataireVise);
        d.filtrePrestataire = EXEC_STATE.filters.prestataire;
        d.rangsFiltres = rangs();

        // Les trois listes qui restent : type, mode, avancement.
        await choisir('domaine', '');
        await choisir('prestataire', '');
        for (const champ of ['type_supervision', 'mode_supervision', 'avancement']) {
          const v = (options(champ) || []).filter(Boolean)[0] || '';
          /* eslint-disable no-await-in-loop */
          await choisir(champ, v);
          d[champ] = { vise: v, ecrit: EXEC_STATE.filters[champ], rangs: rangs() };
          await choisir(champ, '');
        }

        // Et la remise à zéro rend tout.
        document.querySelector('[onclick^="execResetFilters"]')?.click();
        await a(2400);
        d.apresRemise = {
          rangs: rangs(),
          filtres: Object.entries(EXEC_STATE.filters).filter(([, v]) => v).map(([k]) => k),
        };
        return d;
      });

      verifier('les cinq listes du plan de surveillance écrivent chacune son filtre, et la remise à zéro les rend toutes',
        plans.listes.every((x) => x.endsWith(':oui'))
        && plans.poseDomaine === true && plans.filtreDomaine === plans.domaineVise
        && plans.posePrestataire === true && plans.filtrePrestataire === plans.prestataireVise
        && plans.type_supervision.ecrit === plans.type_supervision.vise
        && plans.mode_supervision.ecrit === plans.mode_supervision.vise
        && plans.avancement.ecrit === plans.avancement.vise
        && plans.apresRemise.filtres.length === 0
        && plans.apresRemise.rangs === plans.rangsAvant,
        JSON.stringify(plans));

      verifier('un filtre restreint ce que la page montre, et la sélection reste proposée',
        plans.rangsAvant > 0 && plans.rangsFiltres <= plans.rangsAvant
        && plans.domaineTenu === true,
        JSON.stringify({
          avant: plans.rangsAvant, filtres: plans.rangsFiltres, tenu: plans.domaineTenu,
        }));

      // ══════════════════════════════════════════════════════════════════
      //  6. L'année et la criticité, sur la table des constatations
      // ══════════════════════════════════════════════════════════════════
      //
      // Deux propriétés, et aucune ne dépend du jeu d'essai :
      //
      //   · **la liste des années n'offre que les années présentes.** Elle est
      //     construite des rapports et des constatations, non d'un intervalle
      //     choisi d'avance : une année sans rien ne s'y trouve pas. Ma
      //     première écriture posait `1970` sur cette liste — une valeur
      //     qu'elle n'offre pas, qu'un `<select>` refuse en silence, et le
      //     filtre restait vide. *On ne choisit pas une option qui n'existe
      //     pas ; c'est l'absence de l'option qui est la propriété.*
      //   · **la criticité partitionne la table.** Les trois niveaux sont
      //     exclusifs, donc la somme des trois vaut le total — quel que soit le
      //     nombre de constatations, et sans qu'aucun chiffre soit écrit ici.
      //     Un filtre qui laisserait passer une ligne de trop, ou qui en
      //     perdrait une, casse l'égalité.
      //
      // ── Deux constatations posées, et pourquoi la ronde en vient là ──
      //
      // Elle ne voulait bâtir aucune chaîne. Mais l'écran, sur ce jeu d'essai,
      // **ne porte aucune constatation** : mesuré — `EXEC_STATE.data.
      // constatations` rend une liste vide, là où le fichier de données en
      // compte quatre, et la liste des années ne tient que par les rapports.
      // Les trois criticités donnaient donc « une ligne » chacune, qui était le
      // message « aucune donnée », et ma première écriture l'a cru.
      //
      // Une table vide ne mesure pas un filtre. La ronde pose donc **deux
      // constatations directes** — sans dossier, c'est le cas que la route
      // prévoit —, de criticités différentes, et les retire en partant. Le
      // chiffre attendu n'est écrit nulle part : la somme doit valoir le total,
      // quel qu'il soit.
      jalon('filtres : les constatations');
      const chaine = await page.evaluate(async (api) => {
        const J = async (u, m, b) => {
          const rep = await fetch(u, {
            method: m || 'GET',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(b ? { body: JSON.stringify(b) } : {}),
          });
          let c = null; try { c = await rep.json(); } catch { c = null; }
          return { statut: rep.status, corps: c };
        };
        const prest = (EXEC_STATE.data.prestataires || [])[0] || {};
        const r = { prestataire: prest.id || '', ids: [], statuts: [] };
        // ── Ce que la mesure a trouvé, et qui n'est pas de ce tour ──
        //
        // `GET /constatations` rend **une liste vide** à cette session, quand le
        // magasin du module en porte quatre — lu directement, hors serveur.
        // Ni la vue Prestataire (le compte est en vue AAC), ni le resserrement
        // par instance (le choix enregistré est la vue régionale, qui laisse
        // tout passer), ni une route qui en masquerait une autre (il n'y en a
        // qu'une) ne l'expliquent. Aucune suite ne l'avait jamais regardé :
        // toutes créent leurs propres constatations, celle-ci comprise.
        // La cause demande d'instrumenter le serveur, et c'est un tour à part.
        const rep = await J(`${api}/constatations`);
        r.routeStatut = rep.statut;
        r.routeRend = (rep.corps || []).length;
        for (const crit of ['critique', 'majeure']) {
          /* eslint-disable no-await-in-loop */
          const c = await J(`${api}/constatations`, 'POST', {
            direct: true, prestataire_id: prest.id, domaine_id: 'AIR', criticite: crit,
            titre: `SURV 0.f — écart ${crit} de la ronde de la coquille`,
            description: 'Posé par la ronde de la coquille, retiré par elle.',
            delai_solde: '30',
          });
          r.ids.push((c.corps || {}).id);
          r.statuts.push(c.statut);
        }
        await execRefreshDynamic();
        return r;
      }, '/api/m/execution');

      verifier('la ronde pose les deux constatations qu’il faut pour qu’un filtre ait quelque chose à filtrer',
        chaine.ids.filter(Boolean).length === 2
        && chaine.statuts.every((s) => s === 200 || s === 201),
        JSON.stringify(chaine));

      const constats = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector('.nav-btn[data-page="constatations"]')?.click();
        await a(3200);
        // Une constatation directe naît avant transmission : c'est le
        // sous-onglet « En Préparation » qui la porte.
        document.querySelector('[onclick*="currentConstSub=\'list\'"]')?.click();
        await a(2600);
        const liste = (champ) => [...document.querySelectorAll('.filter-bar select')]
          .find((s) => (s.getAttribute('onchange') || '')
            .includes(`EXEC_STATE.filters.${champ}=this.value`));
        // ── Compter les lignes, et non les rangs du tableau ──
        //
        // Trois rangs n'en sont pas : la ligne « aucune donnée » qu'une table
        // vide porte, et le rang de détail que chaque constatation traîne sous
        // la sienne. Ma première écriture les comptait, et **une table vide
        // rendait donc 1** : les trois criticités donnaient chacune « une
        // ligne », dont deux étaient le même message d'absence. *Un compteur
        // qui compte le message « rien à voir » ne mesure plus rien.*
        const rangs = () => [...document.querySelectorAll('.exec-etats-table tbody tr')]
          .filter((r) => !r.querySelector('td[colspan]') && !/^fiches_row_/.test(r.id)).length;
        const choisir = async (champ, valeur) => {
          const s = liste(champ);
          if (!s) return null;
          s.value = valeur;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2400);
          return EXEC_STATE.filters[champ];
        };
        d.rangsAvant = rangs();
        d.sousOnglet = EXEC_STATE.currentConstSub;
        d.statuts = (EXEC_STATE.data.constatations || []).map((c) => c.statut);
        d.annees = liste('annee') ? [...liste('annee').options].map((o) => o.value) : null;
        d.anneeVisee = (d.annees || []).filter(Boolean)[0] || '';
        d.ecritAnnee = await choisir('annee', d.anneeVisee);
        d.rangsAnnee = rangs();
        await choisir('annee', '');
        d.rangsRendus = rangs();
        // La partition : chaque niveau, puis la somme.
        d.parCriticite = {};
        for (const niveau of ['critique', 'majeure', 'mineure']) {
          /* eslint-disable no-await-in-loop */
          d.parCriticite[niveau] = { ecrit: await choisir('criticite', niveau), rangs: rangs() };
          await choisir('criticite', '');
        }
        d.rangsFin = rangs();
        return d;
      });

      const somme = Object.values(constats.parCriticite || {}).reduce((t, x) => t + x.rangs, 0);
      verifier('la liste des années n’offre que les années présentes, et la criticité partitionne la table',
        constats.rangsAvant >= 2
        && (constats.annees || []).length >= 2
        && constats.ecritAnnee === constats.anneeVisee
        && constats.rangsAnnee === constats.rangsAvant
        && constats.rangsRendus === constats.rangsAvant
        && Object.entries(constats.parCriticite).every(([n, x]) => x.ecrit === n)
        && somme === constats.rangsAvant
        && constats.rangsFin === constats.rangsAvant,
        JSON.stringify({ ...constats, somme }));

      // Le ménage : les deux constatations ne survivent pas à la ronde.
      const menage = await page.evaluate(async (ctx) => {
        const { api, ids } = ctx;
        const J = async (u, m) => {
          const rep = await fetch(u, {
            method: m || 'GET', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          });
          let c = null; try { c = await rep.json(); } catch { c = null; }
          return { statut: rep.status, corps: c };
        };
        const r = { retraits: [] };
        for (const id of ids) {
          /* eslint-disable no-await-in-loop */
          r.retraits.push((await J(`${api}/constatations/${id}`, 'DELETE')).statut);
        }
        const reste = (await J(`${api}/constatations`)).corps || [];
        r.reste = reste.filter((c) => ids.includes(c.id)).length;
        await execRefreshDynamic();
        return r;
      }, { api: '/api/m/execution', ids: chaine.ids });

      verifier('les deux constatations de la ronde ne lui survivent pas',
        menage.retraits.every((s) => s === 200) && menage.reste === 0,
        JSON.stringify(menage));

      // ══════════════════════════════════════════════════════════════════
      //  7. Le resserrement mutuel, sur la page des organismes
      // ══════════════════════════════════════════════════════════════════
      //
      // C'est ici que le mécanisme se mesure, parce que le jeu d'essai le
      // permet : les organismes se répartissent sur deux secteurs. Trois règles,
      // et son commentaire les énonce toutes les trois :
      //
      //   · **aucun repli sur le référentiel** : la liste des secteurs n'offre
      //     que ceux que les données portent — un sur les huit du référentiel,
      //     ici. Le repli ferait reparaître sept secteurs où rien ne se passe,
      //     et personne ne le verrait ;
      //   · une sélection en cours **reste proposée** même quand plus rien ne
      //     correspond — sans quoi elle deviendrait orpheline, choisie et
      //     invisible ;
      //   · et la liste voisine, elle, **ne se remplit pas** pour autant.
      //
      // Les deux dernières ne se produisent pas en cliquant : l'instance ne
      // porte que deux organismes, du même secteur. L'état est donc **posé**,
      // et c'est la règle de rendu qui est lue — les gestes, eux, sont exercés
      // juste au-dessus. *Mieux vaut mesurer la règle en le disant que ne pas
      // la mesurer du tout.*
      jalon('filtres : les organismes');
      const secteur = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector('.nav-btn[data-page="prestataires"]')?.click();
        await a(3000);
        const liste = (champ) => [...document.querySelectorAll('.filter-bar select')]
          .find((s) => (s.getAttribute('onchange') || '')
            .includes(`EXEC_STATE.filters.${champ}=this.value`));
        const options = (champ) => {
          const s = liste(champ);
          return s ? [...s.options].map((o) => o.value).filter(Boolean) : [];
        };
        const choisir = async (champ, valeur) => {
          const s = liste(champ);
          if (!s) return null;
          s.value = valeur;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await a(2400);
          return EXEC_STATE.filters[champ];
        };
        d.listeSecteur = !!liste('secteur');
        d.secteursDuReferentiel = (EXEC_STATE.data.secteurs || []).length;
        d.secteursProposes = options('secteur').length;
        d.prestatairesAvant = options('prestataire').length;

        // Le secteur que les organismes portent : le geste l'écrit, et la liste
        // des organismes garde ceux qui y paraissent.
        const parSecteur = {};
        (EXEC_STATE.data.prestataires || []).forEach((p) => {
          if (p.secteur_id) parSecteur[p.secteur_id] = (parSecteur[p.secteur_id] || 0) + 1;
        });
        const peuple = Object.entries(parSecteur).sort((x, y) => y[1] - x[1])[0] || [];
        d.secteurVise = peuple[0] || '';
        d.attendus = peuple[1] || 0;
        d.ecrit = await choisir('secteur', d.secteurVise);
        d.prestatairesApres = options('prestataire').length;
        document.querySelector('[onclick^="execResetFilters"]')?.click();
        await a(2400);
        d.remise = Object.values(EXEC_STATE.filters).every((v) => !v);
        d.prestatairesRendus = options('prestataire').length;

        // ── L'état posé, et la règle de rendu lue ──
        //
        // Un secteur que **rien** ne porte : il doit rester proposé — c'est la
        // sélection qu'on ne rend pas orpheline — et la liste des organismes
        // doit se vider, sans retomber sur les organismes de l'instance.
        const sansDonnees = (EXEC_STATE.data.secteurs || [])
          .find((s) => !parSecteur[s.id]);
        d.secteurSansDonnees = sansDonnees ? sansDonnees.id : '';
        if (sansDonnees) {
          EXEC_STATE.filters.secteur = sansDonnees.id;
          execRenderPage();
          await a(2400);
          d.orphelinPropose = options('secteur').includes(sansDonnees.id);
          d.organismesAlors = options('prestataire').length;
          document.querySelector('[onclick^="execResetFilters"]')?.click();
          await a(2400);
        }
        return d;
      });

      verifier('la barre n’offre que ce que les données portent, le secteur choisi s’écrit, et la remise à zéro rend tout',
        secteur.listeSecteur === true && !!secteur.secteurVise
        && secteur.secteursDuReferentiel > secteur.secteursProposes
        && secteur.ecrit === secteur.secteurVise
        && secteur.attendus > 0 && secteur.prestatairesApres === secteur.attendus
        && secteur.remise === true
        && secteur.prestatairesRendus === secteur.prestatairesAvant,
        JSON.stringify(secteur));

      verifier('une sélection que rien ne porte reste proposée, et la liste voisine se vide sans retomber sur le référentiel',
        !!secteur.secteurSansDonnees
        && secteur.orphelinPropose === true
        && secteur.organismesAlors === 0,
        JSON.stringify({
          secteur: secteur.secteurSansDonnees,
          propose: secteur.orphelinPropose,
          organismes: secteur.organismesAlors,
          referentiel: secteur.secteursDuReferentiel,
          proposes: secteur.secteursProposes,
        }));

      // ══════════════════════════════════════════════════════════════════
      //  8. L'écran est rendu dans l'état où la ronde l'a trouvé
      // ══════════════════════════════════════════════════════════════════
      jalon('coquille : l’état rendu');
      const rendu = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        document.querySelector('.nav-btn[data-page="dashboard"]')?.click();
        await a(2600);
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          langue: EXEC_STATE.lang,
          filtres: Object.entries(EXEC_STATE.filters).filter(([, v]) => v).map(([k]) => k),
          panneau: !document.getElementById('execNotifPanel'),
          barreMobile: !document.querySelector('.app-sidebar').classList.contains('mobile-open'),
        };
      });

      verifier('la ronde de la coquille rend l’écran dans l’état où elle l’a trouvé',
        rendu.theme === theme.depart && rendu.langue === 'fr'
        && rendu.filtres.length === 0
        && rendu.panneau === true && rendu.barreMobile === true,
        JSON.stringify(rendu));
    },
  });
};
