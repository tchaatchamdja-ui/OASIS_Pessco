// Fumée — SURV : le paramétrage des checklists. Écran « Exécution de la
// Surveillance », dans un navigateur.
//
// ── Pourquoi une troisième suite, et celle-ci ──
//
// `exec-parametres.js` était le plus gros gisement de gestes non exercés de
// l'écran — **42 sur 61**, treize noms laissés de côté : la recherche de
// checklists, les deux liens « tout / aucun » d'une grille de portée, la
// cascade des sous-activités, l'enregistrement immédiat des six champs d'une
// ligne, le retrait d'une ligne, le sélecteur de dispositions avec son filtre
// et son enregistrement, et les **quatre** échanges de classeur — items et
// sous-thèmes, export et import.
//
// Elle est détachée pour la même raison que la ronde des pièces : elle **bâtit
// sa propre chaîne** par l'API — une checklist, trois items, deux sous-thèmes —
// et l'efface en partant. Elle ne lit aucun état qu'une autre ronde aurait
// laissé, et aucune autre ne lit le sien. *On ne coupe pas un fichier là où
// c'est commode, mais là où il n'est pas lié.*
//
// La mise en place est commune aux trois suites et vit dans `surv-socle.js`.
//
// ── Ce que la mesure a trouvé avant qu'une assertion soit écrite ──
//
// **Le sélecteur de dispositions réglementaires ne proposait jamais rien dès
// qu'une checklist avait une portée.** Une exigence nomme son domaine et son
// secteur par leur **code** — `OPS`, `OPS-TAC` —, là où les écrans les
// choisissent par leur **identifiant**. Trois endroits comparaient les deux
// chaînes telles quelles, et la liste rendue était donc vide : « 0 disposition
// disponible », sur un référentiel qui en porte. Le même défaut vidait la liste
// des références réglementaires du formulaire de constatation, à l'ouverture et
// à chaque changement de secteur — là où l'inspecteur attend précisément d'y
// trouver le texte qu'il oppose.
//
// `execClesDePortee` porte désormais la règle, une fois, dans `exec-boot.js` —
// à côté d'`api()` et du dépôt de pièce, pour la même raison qu'eux.
const XLSX = require('xlsx');
const { verifier } = require('./harness');
const { surSURV, M } = require('./surv-socle');

// ── Un classeur à la forme que la route attend ──
//
// Titre en ligne 1, ligne vide, en-têtes en ligne 3, données ensuite —
// `lignesApresEntete` retrouve l'en-tête par son premier intitulé, et c'est
// cette convention-là qu'il faut reproduire, non une autre.
const classeur = (titre, entetes, lignes) => {
  const grille = [[titre], [], entetes, ...lignes];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grille), 'Feuille');
  return [...XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })];
};

const ENTETES_ITEMS = ['Ordre', 'Réf. Item', 'Thème', 'Sous-thème',
  'Réf. Règlement', 'Description', 'Directives'];

module.exports = async function survParametresSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (paramétrage)',
    titre: 'SURV : le paramétrage des checklists, leurs portées et leurs classeurs',
    // ── Le refus que cette ronde provoque exprès ──
    refus: [
      {
        code: 400, methode: 'POST', chemin: /\/checklists\/[^/]+\/import-xlsx$/,
        pourquoi: 'la ronde dépose un classeur dont la colonne « Ordre » est'
          + ' absente : la route le refuse, et le 400 est la propriété mesurée,'
          + ' non l’incident. Contrôle « un classeur dont l’en-tête manque est'
          + ' refusé, et l’écran le dit ».',
      },
    ],
    // ── Les abandons de navigation qu'elle provoque ──
    //
    // Un export mène la fenêtre à l'adresse du classeur, servi en pièce
    // jointe : le navigateur enregistre le fichier et **abandonne la
    // navigation**. C'est ainsi qu'un téléchargement se présente à un moniteur
    // de requêtes, et non une panne. Déclarer n'est pas taire : un contrôle
    // exige que chaque abandon déclaré soit venu.
    abandons: [
      {
        motif: /ERR_ABORTED/, chemin: /\/checklists\/[^/]+\/export-xlsx$/,
        pourquoi: 'l’export des items mène la fenêtre au classeur préparé par la'
          + ' route. Contrôle « l’export des items mène la fenêtre au classeur'
          + ' sans quitter l’éditeur ».',
      },
      {
        motif: /ERR_ABORTED/, chemin: /sous-themes\/export-xlsx$/,
        pourquoi: 'l’export des sous-thèmes : même geste, même abandon.'
          + ' Contrôle « l’export des sous-thèmes mène la fenêtre au classeur ».',
      },
    ],
    rondes: async ({ page, jalon, abandons }) => {
      // Un appel d'API depuis la page, avec la session et l'en-tête d'origine.
      const J = (adresse, methode, corps) => page.evaluate(async (u, m, b) => {
        const rep = await fetch(u, {
          method: m || 'GET',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          ...(b ? { body: JSON.stringify(b) } : {}),
        });
        let c = null; try { c = await rep.json(); } catch { c = null; }
        return { statut: rep.status, corps: c };
      }, adresse, methode, corps);

      const items = async (clId) => ((await J(`${M}/exec-checklist-items`)).corps || [])
        .filter((x) => x.checklist_id === clId);
      const sousThemes = async (clId) => ((await J(`${M}/exec-checklist-sous-themes`)).corps || [])
        .filter((x) => x.checklist_id === clId);

      // ══════════════════════════════════════════════════════════════════
      //  La chaîne, par l'API : une checklist, trois items, deux sous-thèmes
      // ══════════════════════════════════════════════════════════════════
      //
      // Ce tour n'éprouve pas le circuit — il l'est ailleurs. Il éprouve ce que
      // l'écran de paramétrage fait d'une checklist une fois qu'elle existe.
      jalon('paramétrage : la chaîne');
      const socle = await page.evaluate(async (api) => {
        const J2 = async (u, m, b) => {
          const rep = await fetch(u, {
            method: m || 'GET',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            ...(b ? { body: JSON.stringify(b) } : {}),
          });
          let c = null; try { c = await rep.json(); } catch { c = null; }
          return { statut: rep.status, corps: c };
        };
        const r = {};
        // Les référentiels **tels que l'écran les a chargés** : c'est cette
        // liste-là que le sélecteur de dispositions lit, et non celle qu'une
        // route rendrait à part.
        const domaines = EXEC_STATE.data.domaines || [];
        const themes = EXEC_STATE.data.themesSupervision || [];
        const exigences = EXEC_STATE.data.exigences || [];
        // Le domaine « OPS » est celui que les deux exigences du référentiel
        // nomment ; c'est donc sur lui que se mesure le sélecteur.
        const ops = domaines.find((d) => d.code === 'OPS');
        r.domaineOps = ops ? ops.id : '';
        r.domaineOpsCode = ops ? ops.code : '';
        r.themes = themes.slice(0, 2).map((t) => ({ id: t.id, libelle: t.libelle }));
        r.exigences = exigences.map((e) => ({
          id: e.id, reference: e.reference, domaine_id: e.domaine_id, secteur_id: e.secteur_id,
        }));

        const cl = await J2('/api/m/execution/exec-checklists', 'POST', {
          reference: 'CHK-RONDE', nom: 'SURV 0.e — checklist de la ronde',
          description: 'Posée par la ronde de paramétrage, retirée par elle.',
          domaines_ids: '[]', secteurs_ids: '[]', sous_activites_ids: '[]',
        });
        r.clStatut = cl.statut;
        r.clId = (cl.corps || {}).id;

        r.itemIds = [];
        for (const [ordre, ref] of [[1, 'IT-1'], [2, 'IT-2'], [3, 'IT-3']]) {
          /* eslint-disable no-await-in-loop */
          const it = await J2('/api/m/execution/exec-checklist-items', 'POST', {
            checklist_id: r.clId, ordre, ref_item: ref,
            description: `Item ${ref} de la ronde`, directives: '', ref_reglement: '',
            theme_id: '', sous_theme_id: '', statut_id: '', observations: '',
          });
          r.itemIds.push((it.corps || {}).id);
        }

        r.sousThemeIds = [];
        for (const [i, t] of r.themes.entries()) {
          const st = await J2('/api/m/execution/exec-checklist-sous-themes', 'POST', {
            checklist_id: r.clId, theme_id: t.id,
            libelle: `Sous-thème ${i === 0 ? 'A' : 'B'} de la ronde`, ordre: i + 1,
          });
          r.sousThemeIds.push((st.corps || {}).id);
        }

        await execRefreshChecklists();
        return r;
      }, M);

      verifier('la ronde du paramétrage bâtit sa chaîne : une checklist, trois items, deux sous-thèmes',
        socle.clStatut === 201 && !!socle.clId
        && socle.itemIds.filter(Boolean).length === 3
        && socle.sousThemeIds.filter(Boolean).length === 2
        && socle.themes.length === 2 && !!socle.domaineOps,
        JSON.stringify(socle));

      const CL = socle.clId;
      const [IT1, IT2, IT3] = socle.itemIds;
      const [T1, T2] = socle.themes;
      const [STA, STB] = socle.sousThemeIds;

      // ══════════════════════════════════════════════════════════════════
      //  1. La recherche de checklists
      // ══════════════════════════════════════════════════════════════════
      //
      // Le geste ne redessine **que le corps du tableau**, et son commentaire
      // dit pourquoi : re-rendre la page entière ferait perdre le curseur à
      // chaque frappe. C'est donc cela qu'il faut mesurer — le curseur —, et
      // non le seul fait que la table se restreint.
      jalon('paramétrage : la recherche');
      await page.evaluate(async () => {
        document.querySelector('.nav-btn[data-page="parametres"]')?.click();
        await new Promise((r) => setTimeout(r, 2500));
        document.querySelector('[onclick*="_execParamSub=\'checklists\'"]')?.click();
        await new Promise((r) => setTimeout(r, 2000));
      });

      const avantRecherche = await page.evaluate(() => ({
        lignes: document.querySelectorAll('.exec-cl-table tbody tr').length,
        total: Number((document.querySelector('.exec-cl-total') || {}).textContent || -1),
        champ: !!document.getElementById('clRecherche'),
        notre: !![...document.querySelectorAll('.exec-cl-nom')]
          .find((x) => /SURV 0\.e/.test(x.textContent || '')),
      }));

      // Une frappe réelle, touche à touche : c'est le chemin que le geste sert.
      await page.click('#clRecherche');
      await page.type('#clRecherche', 'CHK-RONDE', { delay: 20 });
      await new Promise((r) => setTimeout(r, 900));
      const pendant = await page.evaluate(() => ({
        lignes: document.querySelectorAll('.exec-cl-table tbody tr').length,
        nom: (document.querySelector('.exec-cl-nom') || {}).textContent || '',
        total: Number((document.querySelector('.exec-cl-total') || {}).textContent || -1),
        curseur: document.activeElement ? document.activeElement.id : '',
        valeur: (document.getElementById('clRecherche') || {}).value || '',
      }));

      verifier('la recherche restreint le corps du tableau sans redessiner la page : le curseur reste dans le champ',
        avantRecherche.champ === true && avantRecherche.notre === true
        && avantRecherche.lignes > 1 && pendant.lignes === 1
        && /SURV 0\.e/.test(pendant.nom)
        && pendant.curseur === 'clRecherche' && pendant.valeur === 'CHK-RONDE',
        JSON.stringify({ avantRecherche, pendant }));

      verifier('le compteur de l’entête reste celui de toutes les checklists, et non du seul résultat',
        pendant.total === avantRecherche.total && avantRecherche.total === avantRecherche.lignes,
        JSON.stringify({ avant: avantRecherche.total, pendant: pendant.total, lignes: avantRecherche.lignes }));

      await page.evaluate(() => {
        const c = document.getElementById('clRecherche');
        c.value = 'ZZZ-introuvable';
        c.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await new Promise((r) => setTimeout(r, 700));
      const vide = await page.evaluate(() => {
        const cellule = document.querySelector('.exec-cl-aucune');
        return {
          lignes: document.querySelectorAll('.exec-cl-table tbody tr').length,
          texte: cellule ? (cellule.textContent || '').trim() : '',
        };
      });

      verifier('une recherche qui ne trouve rien le dit, et cite ce qui a été cherché',
        vide.lignes === 1 && /ZZZ-introuvable/.test(vide.texte),
        JSON.stringify(vide));

      // Le filtre vit hors du rendu : il survit à un re-rendu complet de la
      // page — thème, langue, retour d'un sous-écran. C'est ce que son
      // commentaire promet, et rien ne le gardait.
      const apresRendu = await page.evaluate(async () => {
        execRenderPage();
        await new Promise((r) => setTimeout(r, 900));
        return {
          valeur: (document.getElementById('clRecherche') || {}).value || '',
          lignes: document.querySelectorAll('.exec-cl-table tbody tr').length,
        };
      });
      verifier('le filtre de recherche survit au re-rendu de la page',
        apresRendu.valeur === 'ZZZ-introuvable' && apresRendu.lignes === 1,
        JSON.stringify(apresRendu));

      await page.evaluate(async () => {
        const c = document.getElementById('clRecherche');
        c.value = '';
        c.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 700));
        execRenderPage();
        await new Promise((r) => setTimeout(r, 900));
      });

      // ══════════════════════════════════════════════════════════════════
      //  2. La portée : « tout / aucun », et la cascade des trois niveaux
      // ══════════════════════════════════════════════════════════════════
      //
      // « La portée se resserre de gauche à droite », dit l'écran : les
      // secteurs proposés découlent des domaines cochés, les sous-activités des
      // secteurs. Trois propriétés s'y mesurent : le resserrement lui-même, la
      // **conservation** d'une coche déjà posée au travers d'un rafraîchissement,
      // et ce que l'écran dit quand un niveau ne découle de rien.
      jalon('paramétrage : la portée');
      const portee = await page.evaluate(async (ctx) => {
        const { clId, domaineOps } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const codes = (cls) => [...document.querySelectorAll(`.${cls}`)]
          .map((c) => (c.nextElementSibling || {}).textContent || '');
        const cochees = (cls) => [...document.querySelectorAll(`.${cls}`)]
          .filter((c) => c.checked).map((c) => c.value);

        document.querySelector(`[onclick="execOpenChecklistModal('${clId}')"]`)?.click();
        await a(1600);
        d.modale = !!document.getElementById('clDomsBox');
        d.domainesProposes = codes('cl-doms-cb').length;
        // Au départ, aucun domaine coché : les secteurs proposés sont tous.
        d.secteursSansDomaine = codes('cl-secs-cb').length;

        // Un vrai clic sur une case : le `change` monte jusqu'à la grille, qui
        // porte `onchange="_clRefreshSecteurs()"`.
        document.querySelector(`.cl-doms-cb[value="${domaineOps}"]`)?.click();
        await a(900);
        d.secteursDeOps = codes('cl-secs-cb');
        d.indice = (document.getElementById('clSecsHint') || {}).textContent || '';

        // « Tout » sur les secteurs : coche la grille **et** rafraîchit la
        // suivante — c'est le troisième argument du geste qui l'y oblige.
        document.querySelector('[onclick^="_clCocherPortee(\'cl-secs-cb\',true"]')?.click();
        await a(900);
        d.secteursCoches = cochees('cl-secs-cb').length;
        d.sousActivitesDeOps = codes('cl-sas-cb').length;
        d.messageSansSa = (document.getElementById('clSasBox') || {}).textContent.trim();

        // « Aucun » : la grille se décoche, et celle d'en dessous reprend la
        // liste entière — faute de secteur, rien ne la restreint.
        document.querySelector('[onclick^="_clCocherPortee(\'cl-secs-cb\',false"]')?.click();
        await a(900);
        d.secteursDecoches = cochees('cl-secs-cb').length;
        d.sousActivitesSansSecteur = codes('cl-sas-cb').length;

        // Une coche posée à la main survit au rafraîchissement du niveau : on
        // coche un secteur d'OPS, puis on ajoute un second domaine.
        const premier = document.querySelector('.cl-secs-cb');
        d.secteurTenu = premier ? premier.value : '';
        premier?.click();
        await a(700);
        d.sousActivitesApresCoche = codes('cl-sas-cb').length;
        const autre = [...document.querySelectorAll('.cl-doms-cb')]
          .find((c) => c.value !== domaineOps);
        autre?.click();
        await a(900);
        d.secteursDeuxDomaines = codes('cl-secs-cb').length;
        d.coisTenue = cochees('cl-secs-cb');

        // On rend la portée à ce qu'elle doit être pour la suite : le seul
        // domaine OPS, qui est celui des exigences du référentiel.
        autre?.click();
        await a(700);
        document.querySelector('[onclick^="_clCocherPortee(\'cl-secs-cb\',false"]')?.click();
        await a(700);
        d.avantEnregistrement = {
          domaines: cochees('cl-doms-cb'), secteurs: cochees('cl-secs-cb'),
          sousActivites: cochees('cl-sas-cb'),
        };
        document.querySelector(`[onclick^="execSaveChecklist('${clId}'"]`)?.click();
        await a(2600);
        d.modaleFermee = !document.getElementById('clDomsBox');
        return d;
      }, { clId: CL, domaineOps: socle.domaineOps });

      const enBase = (await J(`${M}/exec-checklists/${CL}`)).corps || {};

      verifier('la portée se resserre de gauche à droite : les secteurs proposés sont ceux des domaines cochés',
        portee.modale === true && portee.domainesProposes === 5
        && portee.secteursSansDomaine === 8
        && portee.secteursDeOps.length === 2
        && portee.secteursDeOps.join(',') === 'CAT,STA'
        && /2 disponibles/.test(portee.indice),
        JSON.stringify(portee));

      verifier('« tout » coche la grille et rafraîchit la suivante ; des secteurs sans sous-activité le disent',
        portee.secteursCoches === 2 && portee.sousActivitesDeOps === 0
        && /sélectionnez|aucune/i.test(portee.messageSansSa),
        JSON.stringify({
          coches: portee.secteursCoches, sa: portee.sousActivitesDeOps,
          message: portee.messageSansSa,
        }));

      verifier('« aucun » décoche la grille, et le niveau suivant reprend la liste entière',
        portee.secteursDecoches === 0 && portee.sousActivitesSansSecteur === 8,
        JSON.stringify({
          decoches: portee.secteursDecoches, sa: portee.sousActivitesSansSecteur,
        }));

      verifier('une coche posée à la main survit au rafraîchissement du niveau',
        portee.secteursDeuxDomaines > 2
        && portee.coisTenue.length === 1 && portee.coisTenue[0] === portee.secteurTenu,
        JSON.stringify({
          tenu: portee.secteurTenu, apres: portee.coisTenue,
          proposes: portee.secteursDeuxDomaines,
        }));

      verifier('l’enregistrement écrit la portée cochée, et rien d’autre',
        portee.modaleFermee === true
        && enBase.domaines_ids === JSON.stringify([socle.domaineOps])
        && enBase.secteurs_ids === '[]' && enBase.sous_activites_ids === '[]',
        JSON.stringify({
          attendu: socle.domaineOps,
          domaines: enBase.domaines_ids, secteurs: enBase.secteurs_ids,
          sousActivites: enBase.sous_activites_ids,
        }));

      // ══════════════════════════════════════════════════════════════════
      //  3. L'éditeur d'items : l'enregistrement immédiat de six champs
      // ══════════════════════════════════════════════════════════════════
      //
      // Chaque case de la table s'enregistre sur son `change`, sans bouton.
      // Ce qui se mesure n'est pas le clic : c'est que **la valeur est en
      // base**, que l'état de l'entête le dit, et que le cache local suit — le
      // geste le maintient lui-même, et un cache resté en arrière rendrait la
      // ligne à sa valeur d'avant au premier re-rendu.
      //
      // Ce que cela ne prouve pas, et qui doit être dit : un `change` posé par
      // la ronde n'est pas une frappe. Le dernier des six champs est donc
      // enregistré **au clavier**, blur compris, pour que le chemin réel du
      // navigateur soit lui aussi mesuré.
      jalon('paramétrage : l’éditeur');
      const edition = await page.evaluate(async (ctx) => {
        const { clId, itemId, themeId, sousThemeId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector(`[onclick="execOpenChecklistEditor('${clId}')"]`)?.click();
        await a(1800);
        d.editeur = !!document.getElementById('execCliEditorWrap');
        d.compte = (document.getElementById('execCliCompte') || {}).textContent || '';
        const ligne = () => document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        d.ligne = !!ligne();
        const changer = async (el, valeur) => {
          el.value = valeur;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          await a(1500);
        };
        const etat = () => ((document.getElementById('execCliSaveState') || {}).textContent || '').trim();

        await changer(ligne().querySelector('.ord-input'), '7');
        d.etatOrdre = etat();
        await changer(ligne().cells[5].querySelector('textarea'), 'Description écrite par la ronde');
        d.etatDescription = etat();
        await changer(ligne().cells[6].querySelector('textarea'), 'Directives écrites par la ronde');

        // Le thème : son `change` enregistre **et** recalcule les sous-thèmes
        // éligibles de la même ligne.
        await changer(ligne().cells[2].querySelector('select'), themeId);
        d.sousThemesProposes = [...ligne().cells[3].querySelectorAll('option')]
          .map((o) => o.value).filter(Boolean);
        await changer(ligne().cells[3].querySelector('select'), sousThemeId);
        d.sousThemeChoisi = ligne().cells[3].querySelector('select').value;
        return d;
      }, { clId: CL, itemId: IT1, themeId: T1.id, sousThemeId: STA });

      // Le sixième champ, au clavier : focus réel, frappe réelle, et le
      // `change` que le navigateur émet lui-même en quittant le champ.
      // Le champ est vidé avant la frappe, et non « tout sélectionné » :
      // `Ctrl+A` dépend de la plateforme — sur ce poste il n'a rien sélectionné,
      // et la frappe s'est ajoutée à la valeur en place (`IT-1IT-1b`). Le
      // contrôle l'a dit, et c'est bien son office.
      const champRef = `#execCliItemsBody tr[data-item-id="${IT1}"] .ref-input`;
      await page.click(champRef);
      await page.$eval(champRef, (el) => { el.value = ''; });
      await page.keyboard.type('IT-1b', { delay: 25 });
      await page.keyboard.press('Tab');
      await new Promise((r) => setTimeout(r, 1800));

      const itemApres = (await items(CL)).find((x) => x.id === IT1) || {};
      const cacheApres = await page.evaluate((id) => (EXEC_STATE.data.checklistItems || [])
        .find((x) => x.id === id) || {}, IT1);

      verifier('chacun des six champs d’une ligne s’enregistre de lui-même, et l’état de l’entête le dit',
        edition.editeur === true && edition.ligne === true
        && edition.etatOrdre === '✓ enregistré' && edition.etatDescription === '✓ enregistré'
        && Number(itemApres.ordre) === 7
        && itemApres.ref_item === 'IT-1b'
        && itemApres.description === 'Description écrite par la ronde'
        && itemApres.directives === 'Directives écrites par la ronde'
        && itemApres.theme_id === T1.id && itemApres.sous_theme_id === STA,
        JSON.stringify({ edition, enBase: itemApres }));

      verifier('le cache local suit l’enregistrement, sans attendre un rechargement',
        Number(cacheApres.ordre) === 7 && cacheApres.ref_item === 'IT-1b'
        && cacheApres.theme_id === T1.id && cacheApres.sous_theme_id === STA,
        JSON.stringify(cacheApres));

      verifier('choisir le thème d’une ligne ne lui laisse que les sous-thèmes de ce thème',
        edition.sousThemesProposes.length === 1
        && edition.sousThemesProposes[0] === STA
        && edition.sousThemeChoisi === STA,
        JSON.stringify({ proposes: edition.sousThemesProposes, attendu: STA, autre: STB }));

      // Changer de thème emporte le sous-thème qui n'en relève plus — et le
      // geste l'écrit, il ne se contente pas de vider la liste.
      const changementTheme = await page.evaluate(async (ctx) => {
        const { itemId, autreTheme } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const ligne = document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        const sel = ligne.cells[2].querySelector('select');
        sel.value = autreTheme;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await a(2000);
        return {
          proposes: [...ligne.cells[3].querySelectorAll('option')].map((o) => o.value).filter(Boolean),
          choisi: ligne.cells[3].querySelector('select').value,
        };
      }, { itemId: IT1, autreTheme: T2.id });

      const itemSansSousTheme = (await items(CL)).find((x) => x.id === IT1) || {};
      verifier('changer de thème emporte le sous-thème qui n’en relève plus, et l’écrit en base',
        changementTheme.proposes.length === 1 && changementTheme.proposes[0] === STB
        && changementTheme.choisi === ''
        && itemSansSousTheme.theme_id === T2.id && itemSansSousTheme.sous_theme_id === '',
        JSON.stringify({ changementTheme, enBase: itemSansSousTheme }));

      // ══════════════════════════════════════════════════════════════════
      //  4. Le sélecteur de dispositions réglementaires
      // ══════════════════════════════════════════════════════════════════
      //
      // C'est ici que la mesure a trouvé le défaut : une exigence nomme son
      // domaine par son **code**, la checklist le choisit par son
      // **identifiant**, et la comparaison brute ne pouvait jamais correspondre.
      // La liste rendue était vide dès qu'une portée existait.
      jalon('paramétrage : les dispositions');
      const picker = await page.evaluate(async (ctx) => {
        const { itemId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const ligne = document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        ligne.querySelector('[onclick^="execOpenRefReglementPicker"]')?.click();
        await a(1600);
        d.ouvert = !!document.getElementById('exgListWrap');
        d.proposees = [...document.querySelectorAll('.exg-cb')].map((c) => c.value);
        d.references = [...document.querySelectorAll('#exgListWrap label strong')]
          .map((s) => (s.textContent || '').trim());
        return d;
      }, { itemId: IT1 });

      const exigenceOps = socle.exigences.find((e) => e.domaine_id === 'OPS') || {};
      verifier('le sélecteur propose les dispositions de la portée de la checklist, et seulement elles',
        picker.ouvert === true
        && picker.proposees.length === 1 && picker.proposees[0] === exigenceOps.id
        && picker.references.length === 1 && picker.references[0] === exigenceOps.reference,
        JSON.stringify({ picker, attendue: exigenceOps }));

      // ── La règle elle-même, et la seconde raison pour laquelle une liste
      //    reste vide ──
      //
      // Le sélecteur ci-dessus l'éprouve de bout en bout au niveau du domaine.
      // Le **formulaire de constatation** l'emploie aussi, au niveau du
      // secteur, et aucune ronde ne l'y atteint : la règle est donc éprouvée
      // pour elle-même, dans la page qui la porte.
      //
      // Et la mesure dit une chose qu'il ne faut pas taire : sur ce
      // référentiel, la liste des exigences d'un secteur reste **vide pour
      // tous les secteurs** — les deux exigences nomment `OPS-TAC` et
      // `AIR-OMA`, qui n'existent plus. Le compte est relevé et montré ; il
      // n'est pas affirmé nul, pour qu'un référentiel corrigé le fasse monter
      // sans rougir.
      const regle = await page.evaluate((ctx) => {
        const { domaineOps, domaineOpsCode } = ctx;
        const secteurs = EXEC_STATE.data.secteurs || [];
        const parId = execClesDePortee([domaineOps], EXEC_STATE.data.domaines);
        const parCode = execClesDePortee([domaineOpsCode], EXEC_STATE.data.domaines);
        return {
          parId: [...parId].sort(),
          parCode: [...parCode].sort(),
          inconnu: [...execClesDePortee(['nimporte-quoi'], secteurs)],
          vide: [...execClesDePortee([], secteurs)],
          toutesExigences: _execExigencesDuSecteur('').length,
          parSecteur: secteurs.map((s) => `${s.code}:${_execExigencesDuSecteur(s.id).length}`),
        };
      }, { domaineOps: socle.domaineOps, domaineOpsCode: socle.domaineOpsCode });

      verifier('un niveau de portée se reconnaît à son identifiant comme à son code',
        regle.parId.length === 2 && regle.parId.join(',') === regle.parCode.join(',')
        && regle.parId.includes(socle.domaineOps) && regle.parId.includes('OPS')
        && regle.inconnu.length === 1 && regle.inconnu[0] === 'nimporte-quoi'
        && regle.vide.length === 0
        && regle.toutesExigences === socle.exigences.length,
        JSON.stringify(regle));

      const filtre = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const visibles = () => [...document.querySelectorAll('#exgListWrap label')]
          .filter((l) => l.style.display !== 'none').length;
        d.avant = visibles();
        const champ = document.getElementById('exgSearch');
        champ.value = 'zzz';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(600);
        d.apresFiltreMuet = visibles();
        d.toujoursPresentes = document.querySelectorAll('#exgListWrap label').length;
        champ.value = 'RAB-OPS';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
        await a(600);
        d.apresFiltreJuste = visibles();
        return d;
      });

      verifier('le filtre masque les dispositions qui ne correspondent pas, sans les retirer de la liste',
        filtre.avant === 1 && filtre.apresFiltreMuet === 0
        && filtre.toujoursPresentes === 1 && filtre.apresFiltreJuste === 1,
        JSON.stringify(filtre));

      const validation = await page.evaluate(async (ctx) => {
        const { itemId, clId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector('.exg-cb').checked = true;
        document.querySelector(`[onclick^="_execCliRefRegSave('${itemId}'`)?.click();
        await a(2600);
        d.modaleFermee = !document.getElementById('exgListWrap');
        const ligne = document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        d.cellule = (ligne.cells[4].textContent || '').replace(/\s+/g, ' ').trim();
        d.clId = clId;
        return d;
      }, { itemId: IT1, clId: CL });

      const itemAvecRef = (await items(CL)).find((x) => x.id === IT1) || {};
      verifier('valider écrit les identifiants des dispositions cochées, et la cellule les rend lisibles',
        validation.modaleFermee === true
        && itemAvecRef.ref_reglement === JSON.stringify([exigenceOps.id])
        && validation.cellule.includes(exigenceOps.reference),
        JSON.stringify({ validation, enBase: itemAvecRef.ref_reglement }));

      // Le texte libre : la compatibilité que le geste garde explicitement,
      // et qui ne sert que si **rien** n'est coché.
      const libre = await page.evaluate(async (ctx) => {
        const { itemId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const ligne = document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        ligne.querySelector('[onclick^="execOpenRefReglementPicker"]')?.click();
        await a(1600);
        const d = { cocheeAuDepart: document.querySelector('.exg-cb').checked };
        document.querySelector('.exg-cb').checked = false;
        document.getElementById('exgLegacy').value = 'Texte libre de la ronde';
        document.querySelector(`[onclick^="_execCliRefRegSave('${itemId}'`)?.click();
        await a(2600);
        const l2 = document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        d.cellule = (l2.cells[4].textContent || '').replace(/\s+/g, ' ').trim();
        return d;
      }, { itemId: IT1 });

      const itemLibre = (await items(CL)).find((x) => x.id === IT1) || {};
      verifier('le sélecteur rouvre sur ce qui avait été coché, et à défaut de coche le texte libre est enregistré tel quel',
        libre.cocheeAuDepart === true
        && itemLibre.ref_reglement === 'Texte libre de la ronde'
        && libre.cellule.includes('Texte libre de la ronde'),
        JSON.stringify({ libre, enBase: itemLibre.ref_reglement }));

      // ══════════════════════════════════════════════════════════════════
      //  5. Le retrait d'une ligne
      // ══════════════════════════════════════════════════════════════════
      jalon('paramétrage : le retrait d’une ligne');
      const retrait = await page.evaluate(async (ctx) => {
        const { itemId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const rangs = () => document.querySelectorAll('#execCliItemsBody tr[data-item-id]').length;
        d.avant = rangs();
        d.compteAvant = (document.getElementById('execCliCompte') || {}).textContent || '';
        document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"] .row-delete`)?.click();
        await a(900);
        const oui = document.querySelector('.oasis-confirm-oui');
        d.demandeConfirmation = !!oui;
        oui?.click();
        await a(3000);
        d.apres = rangs();
        d.compteApres = (document.getElementById('execCliCompte') || {}).textContent || '';
        d.lignePartie = !document.querySelector(`#execCliItemsBody tr[data-item-id="${itemId}"]`);
        return d;
      }, { itemId: IT2 });

      const apresRetrait = await items(CL);
      verifier('le retrait d’une ligne demande confirmation, et la ligne quitte la table, le compteur et le magasin',
        retrait.demandeConfirmation === true
        && retrait.avant === 3 && retrait.apres === 2 && retrait.lignePartie === true
        && retrait.compteAvant === '3' && retrait.compteApres === '2'
        && apresRetrait.length === 2
        && !apresRetrait.some((x) => x.id === IT2),
        JSON.stringify({ retrait, enBase: apresRetrait.map((x) => x.ref_item) }));

      // ══════════════════════════════════════════════════════════════════
      //  6. Le classeur des items : export, puis les deux modes d'import
      // ══════════════════════════════════════════════════════════════════
      //
      // L'import pose une question dont les deux réponses **écrivent** : son
      // bouton d'annulation s'appelle « Ajouter ». Ce n'est pas un refus, c'est
      // l'autre mode — et c'est ce qu'il faut mesurer, faute de quoi l'on croit
      // annuler quand on ajoute.
      jalon('paramétrage : le classeur des items');
      const octetsAppend = classeur('Checklist', ENTETES_ITEMS, [
        [10, 'IMP-A', T1.libelle, 'Sous-thème A de la ronde', '', 'Ligne A importée', 'Directive A'],
        [11, 'IMP-B', '', '', '', 'Ligne B importée', ''],
      ]);
      const octetsReplace = classeur('Checklist', ENTETES_ITEMS, [
        [20, 'REP-A', T1.libelle, 'Sous-thème A de la ronde', '', 'Ligne de remplacement', ''],
        [21, 'REP-B', '', '', '', 'Seconde ligne de remplacement', ''],
      ]);
      const octetsSansEntete = classeur('Checklist', ['Rang', 'Libellé'], [[1, 'rien à voir']]);

      const deposer = async (octets, nom, reponse) => page.evaluate(async (ctx) => {
        const { bytes, fichier, confirmer, selecteur } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const entree = document.querySelector(selecteur);
        if (!entree) return { entree: false };
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(bytes)], fichier, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }));
        entree.files = dt.files;
        entree.dispatchEvent(new Event('change', { bubbles: true }));
        await a(1200);
        const bouton = document.querySelector(confirmer ? '.oasis-confirm-oui' : '.oasis-confirm-non');
        const d = {
          entree: true,
          question: !!bouton,
          libelle: bouton ? (bouton.textContent || '').trim() : '',
        };
        bouton?.click();
        await a(4000);
        d.entreeVidee = entree.value === '';
        return d;
      }, { bytes: octets, fichier: nom, confirmer: reponse, selecteur: '#execCliImportFile' });

      // ── L'export : la fenêtre va au classeur, l'éditeur reste debout ──
      const exportItems = await page.evaluate(async () => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = { cheminAvant: location.pathname };
        document.querySelector('[onclick^="execChecklistExportXlsx"]')?.click();
        await a(4000);
        d.cheminApres = location.pathname;
        d.editeurDebout = !!document.getElementById('execCliEditorWrap');
        return d;
      });

      verifier('l’export des items mène la fenêtre au classeur sans quitter l’éditeur',
        exportItems.cheminApres === exportItems.cheminAvant
        && exportItems.editeurDebout === true
        && abandons.compte(/\/checklists\/[^/]+\/export-xlsx$/) === 1,
        JSON.stringify({ exportItems, abandons: abandons.vus }));

      // Les annonces de l'écran, recueillies en enveloppant la fonction qui les
      // pose : un toast s'efface au bout de quatre secondes, et le lire dans le
      // document reviendrait à mesurer la vitesse de la ronde.
      await page.evaluate(() => {
        window.__dits = [];
        const vrai = window.oasisToast;
        window.__vraiToast = vrai;
        window.oasisToast = (m, t) => { window.__dits.push(String(m == null ? '' : m)); return vrai(m, t); };
        return true;
      });

      const ajout = await deposer(octetsAppend, 'items-ajout.xlsx', false);
      const apresAjout = await items(CL);
      verifier('« Ajouter » n’annule pas l’import : c’est l’autre mode, et les lignes en place restent',
        ajout.entree === true && ajout.question === true && ajout.libelle === 'Ajouter'
        && ajout.entreeVidee === true
        && apresAjout.length === 4
        && apresAjout.some((x) => x.id === IT1) && apresAjout.some((x) => x.id === IT3)
        && apresAjout.some((x) => x.ref_item === 'IMP-A')
        && apresAjout.some((x) => x.ref_item === 'IMP-B'),
        JSON.stringify({ ajout, refs: apresAjout.map((x) => x.ref_item) }));

      const importee = apresAjout.find((x) => x.ref_item === 'IMP-A') || {};
      verifier('le thème et le sous-thème d’une ligne importée se retrouvent par leur libellé',
        importee.theme_id === T1.id && importee.sous_theme_id === STA,
        JSON.stringify({ ligne: importee, theme: T1, sousTheme: STA }));

      const remplacement = await deposer(octetsReplace, 'items-remplacement.xlsx', true);
      const apresRemplacement = await items(CL);
      verifier('« Remplacer » ne laisse que le classeur déposé',
        remplacement.question === true && remplacement.libelle === 'Remplacer'
        && apresRemplacement.length === 2
        && apresRemplacement.every((x) => /^REP-/.test(x.ref_item))
        && !apresRemplacement.some((x) => x.id === IT1 || x.id === IT3),
        JSON.stringify({ remplacement, refs: apresRemplacement.map((x) => x.ref_item) }));

      const refus = await deposer(octetsSansEntete, 'items-sans-entete.xlsx', true);
      const apresRefus = await items(CL);
      const annonces = await page.evaluate(() => window.__dits.slice());
      verifier('un classeur dont l’en-tête manque est refusé, l’écran le dit, et rien n’est écrit',
        refus.question === true
        && apresRefus.length === 2
        && apresRefus.map((x) => x.ref_item).sort().join(',') === 'REP-A,REP-B'
        && annonces.some((m) => /Ordre/.test(m) && /import/i.test(m)),
        JSON.stringify({ apres: apresRefus.map((x) => x.ref_item), annonces }));

      // ══════════════════════════════════════════════════════════════════
      //  7. Le classeur des sous-thèmes : l'unicité par couple
      // ══════════════════════════════════════════════════════════════════
      //
      // La route tient les sous-thèmes uniques par couple (thème, libellé) :
      // un ré-import **met à jour**, il ne duplique pas. C'est la propriété qui
      // décide si l'on peut rejouer un classeur sans ruiner la liste.
      jalon('paramétrage : le classeur des sous-thèmes');
      const octetsSousThemes = classeur('Sous-thèmes', ['Thème', 'Sous-thème', 'Ordre'], [
        [T1.libelle, 'Sous-thème A de la ronde', 7],
        [T2.libelle, 'Sous-thème C de la ronde', 8],
      ]);

      const sousThemesEchanges = await page.evaluate(async (ctx) => {
        const { clId, bytes } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        document.querySelector(`[onclick^="execOpenSousThemesManager('${clId}'"]`)?.click();
        await a(1800);
        d.gestionnaire = !!document.getElementById('execSousThemesImportFile');
        d.rangsAvant = document.querySelectorAll('#shellModal tbody tr').length;
        d.cheminAvant = location.pathname;
        document.querySelector('[onclick^="execSousThemesExportXlsx"]')?.click();
        await a(4000);
        d.cheminApres = location.pathname;
        d.modaleDebout = !!document.getElementById('execSousThemesImportFile');

        const entree = document.getElementById('execSousThemesImportFile');
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(bytes)], 'sous-themes.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }));
        entree.files = dt.files;
        entree.dispatchEvent(new Event('change', { bubbles: true }));
        await a(4500);
        return d;
      }, { clId: CL, bytes: octetsSousThemes });

      const sousThemesApres = await sousThemes(CL);
      const stA = sousThemesApres.find((s) => s.id === STA) || {};

      verifier('l’export des sous-thèmes mène la fenêtre au classeur sans fermer le gestionnaire',
        sousThemesEchanges.gestionnaire === true
        && sousThemesEchanges.rangsAvant === 2
        && sousThemesEchanges.cheminApres === sousThemesEchanges.cheminAvant
        && sousThemesEchanges.modaleDebout === true
        && abandons.compte(/sous-themes\/export-xlsx$/) === 1,
        JSON.stringify({ sousThemesEchanges, abandons: abandons.vus }));

      verifier('ré-importer un sous-thème met son ordre à jour au lieu de le dupliquer',
        sousThemesApres.length === 3
        && Number(stA.ordre) === 7 && stA.libelle === 'Sous-thème A de la ronde'
        && sousThemesApres.filter((s) => s.libelle === 'Sous-thème A de la ronde').length === 1
        && sousThemesApres.some((s) => s.libelle === 'Sous-thème C de la ronde' && s.theme_id === T2.id),
        JSON.stringify({ sousThemes: sousThemesApres.map((s) => `${s.libelle}#${s.ordre}`) }));

      // ══════════════════════════════════════════════════════════════════
      //  8. Le ménage : la chaîne ne survit pas à la ronde
      // ══════════════════════════════════════════════════════════════════
      jalon('paramétrage : le ménage');
      const menage = await page.evaluate(async (ctx) => {
        const { clId } = ctx;
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        window.oasisToast = window.__vraiToast || window.oasisToast;
        document.querySelector('#shellModal [onclick^="shellCloseModal"]')?.click();
        await a(1200);
        document.querySelector('[onclick^="execCloseChecklistEditor"]')?.click();
        await a(1500);
        d.editeurFerme = !document.getElementById('execCliEditorWrap');
        document.querySelector(`[onclick="execDeleteChecklist('${clId}')"]`)?.click();
        await a(900);
        d.confirmation = !!document.querySelector('.oasis-confirm-oui');
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3500);
        d.ligneDisparue = ![...document.querySelectorAll('.exec-cl-nom')]
          .some((x) => /SURV 0\.e/.test(x.textContent || ''));
        return d;
      }, { clId: CL });

      const resteChecklist = ((await J(`${M}/exec-checklists`)).corps || [])
        .filter((c) => c.id === CL).length;
      verifier('la chaîne du paramétrage ne survit pas à la ronde : ni checklist, ni item, ni sous-thème',
        menage.editeurFerme === true && menage.confirmation === true
        && menage.ligneDisparue === true
        && resteChecklist === 0
        && (await items(CL)).length === 0
        && (await sousThemes(CL)).length === 0,
        JSON.stringify(menage));
    },
  });
};
