// Fumée — CARE : les gestes que la suite d'origine ne pressait pas.
// Écran « Mesures d'application », dans un navigateur.
//
// ── Mesurer avant de réécrire, et pourquoi une suite à part ──
//
// CARE est le prochain écran de la conversion (ADR-003, 5.c), et la règle est
// de le mesurer d'abord. Trois poches restaient non exercées : le type de
// mesure et le retrait d'une catégorie, la saisie d'une carence dans son volet,
// et les mesures d'une carence vues depuis la liste. Leurs trois rondes ont
// d'abord été écrites dans `mesures.navigateur.smoke.js`, qui était **pile** à
// son budget : 2 652 lignes, 3 016 après. Le garde l'a dit, et la règle du
// projet est de couper plutôt que de relever — *un budget qui ne fait que
// monter n'est pas un budget, c'est une chronique*.
//
// Elles sortent donc ici, comme celles de PLAN dans `plan-gestes.smoke.js`, et
// ce qu'elles empruntaient aux rondes d'origine est **bâti par les routes** :
//
//   · une catégorie et un type d'investigation, que la ronde des paramètres
//     retire ensuite par les gestes de l'écran ;
//   · un dossier mené jusqu'au suivi, qui inscrit **deux** mesures au
//     registre — l'ancienne ronde en trouvait une seule, laissée par les
//     rondes précédentes, et « toutes les siennes y sont » n'avait alors
//     qu'un élément à comparer ;
//   · une carence nue, que rien n'a value : c'est elle qui montre que la table
//     filtre (le contre-essai CH l'a exigé).
//
// La saisie d'une carence, elle, ne demande rien : elle crée la sienne et la
// retire. Aucune ronde ne provoque de refus HTTP — les deux refus mesurés ici
// (sans catégorie, sans objet) se tiennent dans la fenêtre, avant tout envoi.
const { verifier } = require('./harness');
const { surModule } = require('./module-socle');

const CARE = { module: 'mesures', contenu: 'mes-content', largeur: 1440 };

// Le chemin d'entrée des listes du menu Paramètres : la page, puis chacun de
// ses sous-menus, jusqu'à trouver le bouton cherché. Même texte que dans la
// suite d'origine, remis à chaque `page.evaluate` qui en a besoin.
const ALLER_A_LA_LISTE = `async (geste) => {
  const a = (ms) => new Promise((r) => setTimeout(r, ms));
  const trouve = () => [...document.querySelectorAll('button')]
    .find((b) => new RegExp(geste).test(b.getAttribute('onclick') || ''));
  if (trouve()) return { deja: true };
  window.mesFermerSlider();
  document.querySelector('.nav-btn[data-page="parametres"]')?.click();
  await a(3000);
  if (trouve()) return { page: 'parametres' };
  const sousMenus = [...document.querySelectorAll('[onclick^="mesParamSousMenu"]')];
  for (const s of sousMenus) {
    s.click();
    await a(2400);
    if (trouve()) return { sousMenu: (s.textContent || '').trim().slice(0, 28) };
  }
  return { introuvable: true, sousMenus: sousMenus.length };
}`;

module.exports = async function mesuresGestesSmoke(port) {
  return surModule({
    port,
    ecran: CARE,
    nom: 'CARE (gestes)',
    titre: 'CARE : le type de mesure, une carence saisie, et les mesures d’une carence',
    rondes: async ({ page, jalon }) => {
      await new Promise((r) => setTimeout(r, 1500));
      const MARQUE = String(Date.now()).slice(-6);

      // ── 0. Ce que les rondes empruntaient, bâti par les routes ──
      jalon('CARE : pièces bâties par les routes');
      const bati = await page.evaluate(async (marque) => {
        const o = {};
        const p = (chemin, methode, corps) => window.mesApi(chemin, {
          method: methode, ...(corps ? { body: JSON.stringify(corps) } : {}),
        });
        const cat = await p('/parametres/categories', 'POST', { libelle: `Catégorie gestes ${marque}` });
        o.cat = cat && cat.id ? { id: cat.id, code: cat.code } : null;
        const inv = await p('/parametres/types-investigation', 'POST', { libelle: `Investigation gestes ${marque}` });
        o.invId = inv && inv.id;
        // Le dossier : ouvert, investigué, qualifié, deux mesures au registre.
        const cree = await p('/constatations', 'POST', {
          titre: `Dossier à deux mesures ${marque}`, description: 'Bâti pour la ronde des mesures',
          origine_libelle: 'Inspection inopinée', date_ouverture: '2026-10-20',
        });
        o.dossier = cree && cree.id;
        if (o.dossier) {
          const r = `/constatations/${encodeURIComponent(o.dossier)}`;
          await p(`${r}/traitement`, 'PUT', { informations: 'Constats recueillis' });
          await p(`${r}/decision`, 'POST', { decision: 'investiguer' });
          await p(`${r}/investigation`, 'PUT', { equipe: ['insp1'], travaux: [], rapport: 'Faits établis' });
          await p(`${r}/investigation/soumettre`, 'POST');
          await p(`${r}/qualification`, 'PUT', {
            infraction_constituee: true, nature: 'Manquement', caracterisation: 'Première',
            mesures: [
              { categorie: 'administrative', type_mesure: 'lettre_correction', commentaire: 'Une', suivi_requis: true },
              { categorie: 'sanction', type_mesure: 'avertissement', commentaire: 'Deux', suivi_requis: true },
            ],
          });
          const prononcees = await p(`${r}/qualification/suivi`, 'POST');
          o.prononcees = ((prononcees || {}).mesures || []).length;
        }
        const nue = await p('/constatations', 'POST', {
          titre: `Carence nue ${marque}`, description: 'Rien ne lui est valu',
          origine_libelle: 'Inspection inopinée', date_ouverture: '2026-10-21',
        });
        o.nue = nue && nue.id;
        await window.mesLoadData();
        return o;
      }, MARQUE);
      verifier('les pièces de la suite se bâtissent par les routes : une catégorie, un type d’investigation, un dossier à deux mesures et une carence nue',
        !!bati.cat && !!bati.invId && !!bati.dossier && bati.prononcees === 2 && !!bati.nue,
        JSON.stringify(bati));

      // ══════════════════════════════════════════════════════════════════
      //  Le type de mesure, et ce que le retrait d'une catégorie emporte
      // ══════════════════════════════════════════════════════════════════
      //
      // La fenêtre du type porte deux champs, et le premier — la catégorie —
      // se refuse avant le libellé. Le type se rattache à la catégorie bâtie ;
      // la retirer l'emporte avec elle, **en une écriture** (le serveur le dit :
      // « ses types partent avec elle »). Le type d'investigation part à son
      // tour, puisque rien ne l'emploie.
      jalon('CARE : type de mesure');
      const T = await page.evaluate(async (cat, invId, marque, source) => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        // eslint-disable-next-line no-eval
        const allerA = eval(source);
        const bouton = (texte) => [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '') === texte);
        const modal = () => document.querySelector('.mes-modal-fond');
        const erreur = () => ((document.getElementById('mesTypeErreur') || {}).textContent || '').trim();
        const types = async () => (await window.mesApi('/parametres')).types || [];
        const oui = async (ms) => { document.querySelector('.oasis-confirm-oui')?.click(); await a(ms); };
        d.cat = !!(cat && cat.id && cat.code);
        if (!d.cat) return d;
        d.ou = await allerA('mesOuvrirType\\(\\)');
        d.avant = (await types()).length;
        bouton('mesOuvrirType()')?.click();
        await a(1600);
        d.fenetre = !!modal();
        const sel = document.getElementById('mesTypeCat');
        const lib = document.getElementById('mesTypeLib');
        d.champs = !!sel && !!lib;
        if (!d.champs) return d;
        d.categorieOfferte = [...sel.options].some((o) => o.value === cat.code);
        // Sans catégorie : refusé dans la fenêtre, avant même le libellé.
        const libelle = `Essai Type ${marque}`;
        sel.value = '';
        lib.value = libelle;
        bouton('mesEnregistrerType()')?.click();
        await a(1200);
        d.sansCategorieRefuse = !!modal() && !!erreur();
        d.rienParti = (await types()).length === d.avant;
        sel.value = cat.code;
        bouton('mesEnregistrerType()')?.click();
        await a(3000);
        d.fermee = !modal();
        const cree = (await types()).find((t) => t.libelle === libelle);
        d.cree = !!cree;
        if (!cree) return d;
        d.rattache = cree.categorie_code === cat.code;
        d.code = cree.code;
        // Rouvrir : les deux champs reviennent garnis.
        bouton(`mesOuvrirType('${cree.id}')`)?.click();
        await a(1600);
        d.rouverte = !!modal();
        d.catGarnie = (document.getElementById('mesTypeCat') || {}).value === cat.code;
        d.libGarni = (document.getElementById('mesTypeLib') || {}).value === libelle;
        const lib2 = document.getElementById('mesTypeLib');
        if (lib2) lib2.value = `${libelle} (révisé)`;
        bouton('mesEnregistrerType()')?.click();
        await a(3000);
        const relu = (await types()).find((t) => t.id === cree.id) || {};
        d.renomme = relu.libelle === `${libelle} (révisé)`;
        d.codeInchange = relu.code === d.code;
        // ── La catégorie retirée emporte son type ──
        d.ouCat = await allerA(`mesSupprimerCategorie\\('${cat.id}'\\)`);
        const gCat = bouton(`mesSupprimerCategorie('${cat.id}')`);
        d.boutonCat = !!gCat;
        if (gCat) {
          gCat.click();
          await a(1200);
          d.confirmationCat = !!document.querySelector('.oasis-confirm-oui');
          await oui(3200);
          const p = await window.mesApi('/parametres');
          d.categoriePartie = !(p.categories || []).some((c) => c.id === cat.id);
          d.typeEmporte = !(p.types || []).some((t) => t.id === cree.id);
        }
        // ── Le type d'investigation, que rien n'emploie ──
        d.ouInv = await allerA(`mesSupprimerTypeInvestigation\\('${invId}'\\)`);
        const gInv = bouton(`mesSupprimerTypeInvestigation('${invId}')`);
        d.boutonInv = !!gInv;
        if (gInv) {
          gInv.click();
          await a(1200);
          d.confirmationInv = !!document.querySelector('.oasis-confirm-oui');
          await oui(3200);
          const p = await window.mesApi('/parametres');
          d.invParti = !(p.types_investigation || []).some((t) => t.id === invId);
          d.ligneInvPartie = !bouton(`mesSupprimerTypeInvestigation('${invId}')`);
        }
        return d;
      }, bati.cat, bati.invId, MARQUE, ALLER_A_LA_LISTE);
      verifier('un type de mesure se refuse sans catégorie, s’ajoute sous la sienne, se rouvre garni et se renomme sans que son code bouge',
        T.cat === true && T.fenetre === true && T.champs === true
        && T.categorieOfferte === true
        && T.sansCategorieRefuse === true && T.rienParti === true
        && T.fermee === true && T.cree === true && T.rattache === true && !!T.code
        && T.rouverte === true && T.catGarnie === true && T.libGarni === true
        && T.renomme === true && T.codeInchange === true,
        JSON.stringify(T).slice(0, 560));
      verifier('retirer une catégorie emporte ses types, et le type d’investigation que rien n’emploie part',
        T.boutonCat === true && T.confirmationCat === true
        && T.categoriePartie === true && T.typeEmporte === true
        && T.boutonInv === true && T.confirmationInv === true
        && T.invParti === true && T.ligneInvPartie === true,
        JSON.stringify(T).slice(0, 560));

      // ══════════════════════════════════════════════════════════════════
      //  Une carence saisie dans CARE : son délai, son historique, son retrait
      // ══════════════════════════════════════════════════════════════════
      //
      // Le délai et l'échéance disent la même chose de deux façons, à partir
      // de la date d'ouverture : renseigner l'un remplit l'autre, et la
      // dernière saisie commande. Le serveur, lui, ne calcule rien — il retient
      // ce que le volet lui envoie, et c'est ce qu'on relit. L'historique d'une
      // carence neuve s'ouvre sur un traitement qui n'a pas commencé ; la
      // carence, que rien n'a encore value, se retire.
      jalon('CARE : carence saisie');
      const K = await page.evaluate(async (marque) => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const $ = (id) => document.getElementById(id);
        const bouton = (texte) => [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '') === texte);
        const saisir = (id, valeur) => {
          const el = $(id);
          if (!el) return;
          el.value = valeur;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        window.mesFermerSlider();
        window.mesFermerHistorique();
        window.mesFermerVolet();
        document.querySelector('.nav-btn[data-page="critiques"]')?.click();
        await a(3000);
        d.boutonNouvelle = !!bouton('mesOuvrirConstat()');
        bouton('mesOuvrirConstat()')?.click();
        await a(1200);
        d.volet = !!document.querySelector('.mes-volet');
        if (!$('mesConstTitre')) return d;
        // Sans objet : refusé dans le volet, et rien ne part.
        const avant = (await window.mesApi('/constatations')).length;
        saisir('mesConstTitre', '');
        bouton('mesEnregistrerConstat()')?.click();
        await a(800);
        d.sansObjetRefuse = !!document.querySelector('.mes-volet')
          && !!(($('mesConstErreur') || {}).textContent || '').trim();
        d.rienParti = (await window.mesApi('/constatations')).length === avant;
        const titre = `Carence d’essai ${marque}`;
        saisir('mesConstTitre', titre);
        $('mesConstDesc').value = 'Saisie par la ronde des carences';
        const prest = $('mesConstPrest');
        const prestId = prest && prest.options.length > 1 ? prest.options[1].value : '';
        if (prest) prest.value = prestId;
        saisir('mesConstSource', 'Ronde de contrôle');
        // Le délai donne l'échéance…
        saisir('mesConstOuverture', '2026-03-01');
        saisir('mesConstDelai', '30');
        d.echeanceDuDelai = $('mesConstEcheance').value;
        // … l'échéance donne le délai…
        saisir('mesConstEcheance', '2026-04-15');
        d.delaiDeLEcheance = $('mesConstDelai').value;
        // … et une ouverture déplacée repart du délai, la dernière valeur saisie.
        saisir('mesConstOuverture', '2026-03-11');
        d.echeanceDeplacee = $('mesConstEcheance').value;
        bouton('mesEnregistrerConstat()')?.click();
        await a(3000);
        d.fermee = !document.querySelector('.mes-volet');
        const c = (await window.mesApi('/constatations')).find((x) => x.titre === titre);
        d.creee = !!c;
        if (!c) return d;
        d.auServeur = {
          reference: !!c.reference,
          ouverture: c.date_ouverture,
          delai: String(c.delai_jours),
          echeance: c.date_due_cloture,
          prestataire: !!prestId && c.prestataire_id === prestId,
          source: c.origine_libelle,
          criticite: c.criticite,
        };
        // ── L'historique : une carence neuve, un traitement qui n'a pas commencé ──
        d.boutonHisto = !!bouton(`mesHistorique('${c.id}')`);
        bouton(`mesHistorique('${c.id}')`)?.click();
        await a(2000);
        const histo = document.querySelector('.mes-volet-histo');
        d.histo = !!histo;
        d.histoObjet = ((histo && histo.querySelector('.mes-histo-objet')) || {}).textContent === titre;
        d.histoEnCours = !!(histo && histo.querySelector('.mes-histo-fin:not(.clos)'));
        d.histoEtapes = histo ? histo.querySelectorAll('.mes-histo-etape').length : 0;
        bouton('mesFermerHistorique()')?.click();
        await a(600);
        d.histoFerme = !document.querySelector('.mes-volet-histo');
        // ── Le retrait : confirmé, puis parti du serveur comme de la table ──
        d.boutonSuppr = !!bouton(`mesSupprimerConstat('${c.id}')`);
        bouton(`mesSupprimerConstat('${c.id}')`)?.click();
        await a(1200);
        d.confirmation = !!document.querySelector('.oasis-confirm-oui');
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3000);
        d.partie = !(await window.mesApi('/constatations')).some((x) => x.id === c.id);
        d.lignePartie = !bouton(`mesSupprimerConstat('${c.id}')`);
        return d;
      }, MARQUE);
      verifier('une carence sans objet est refusée dans son volet, et rien ne part au serveur',
        K.boutonNouvelle === true && K.volet === true
        && K.sansObjetRefuse === true && K.rienParti === true,
        JSON.stringify(K).slice(0, 400));
      verifier('le délai et l’échéance d’une carence se déduisent l’un de l’autre, et une ouverture déplacée repart du délai',
        K.echeanceDuDelai === '2026-03-31'
        && K.delaiDeLEcheance === '45'
        && K.echeanceDeplacee === '2026-04-25',
        JSON.stringify(K).slice(0, 400));
      const S = K.auServeur || {};
      verifier('la carence saisie parvient au serveur telle que le volet la montrait, critique et référencée',
        K.fermee === true && K.creee === true && S.reference === true
        && S.ouverture === '2026-03-11' && S.delai === '45' && S.echeance === '2026-04-25'
        && S.prestataire === true && S.source === 'Ronde de contrôle'
        && S.criticite === 'critique',
        JSON.stringify(K).slice(0, 500));
      verifier('l’historique d’une carence neuve s’ouvre sur un traitement en cours, et se referme par son geste',
        K.boutonHisto === true && K.histo === true && K.histoObjet === true
        && K.histoEnCours === true && K.histoEtapes > 0 && K.histoFerme === true,
        JSON.stringify(K).slice(0, 500));
      verifier('une carence que rien n’a encore value se retire, après confirmation, du serveur comme de la table',
        K.boutonSuppr === true && K.confirmation === true
        && K.partie === true && K.lignePartie === true,
        JSON.stringify(K).slice(0, 500));

      // ══════════════════════════════════════════════════════════════════
      //  Les mesures d'une carence : du volet à la table, au suivi, au retrait
      // ══════════════════════════════════════════════════════════════════
      //
      // Le menu Carences dit combien de mesures une carence a values ; le volet
      // « Mesures prises » dit lesquelles, et ouvre la table des Mesures sur
      // elles seules. De là, « Suivi » rouvre le traitement de la carence à
      // l'étape du suivi — la mesure ne se suit pas seule —, et le volet suit
      // la hauteur du bandeau quand la fenêtre change. Le retrait d'une mesure
      // est réservé au super-administrateur, que la ronde est.
      jalon('CARE : mesures d’une carence');
      const L = await page.evaluate(async (dossier, nue) => {
        const a = (ms) => new Promise((r) => setTimeout(r, ms));
        const d = {};
        const bouton = (texte) => [...document.querySelectorAll('button')]
          .find((b) => (b.getAttribute('onclick') || '') === texte);
        const lignes = () => [...document.querySelectorAll('button')]
          .map((b) => /^mesFaireLeSuivi\('([^']+)'\)$/.exec(b.getAttribute('onclick') || ''))
          .filter(Boolean).map((x) => x[1]);
        window.mesFermerSlider();
        window.mesFermerHistorique();
        await window.mesLoadData();
        document.querySelector('.nav-btn[data-page="critiques"]')?.click();
        await a(3000);
        const mesures = window.MES_STATE.data.mesures || [];
        const c = (window.MES_STATE.data.constatations || []).find((x) => x.id === dossier);
        d.carence = !!c && !!bouton(`mesMesuresDeCarence('${dossier}')`);
        if (!d.carence) return d;
        const siennes = mesures.filter((m) => m.constatation_id === c.id).map((m) => m.id).sort();
        d.annoncees = c.mesures_liees;
        d.siennes = siennes.length;
        // ── Le volet : autant de blocs que de mesures rattachées ──
        bouton(`mesMesuresDeCarence('${c.id}')`).click();
        await a(1200);
        const volet = document.querySelector('.mes-volet-histo');
        d.volet = !!volet;
        d.blocs = volet ? volet.querySelectorAll('.mes-bloc').length : 0;
        // ── La table, ouverte sur cette carence seule ──
        d.boutonTable = !!bouton(`mesOuvrirTableMesures('${c.id}')`);
        bouton(`mesOuvrirTableMesures('${c.id}')`)?.click();
        await a(3000);
        d.voletFerme = !document.querySelector('.mes-volet-histo');
        d.page = window.MES_STATE.currentPage;
        d.filtre = window.MES_STATE.filtres.mes_carence === c.id;
        const vues = lignes().sort();
        d.lignes = vues.length;
        d.seulementSiennes = vues.length > 0 && vues.every((id) => siennes.includes(id));
        d.toutes = JSON.stringify(vues) === JSON.stringify(siennes);
        if (!vues.length) return d;
        // ── Et le filtre écarte : la table d'une carence sans mesure est vide ──
        //
        // « Toutes les siennes y sont » resterait vrai d'une table qui ne
        // filtre rien, si la carence portait toutes les mesures du jeu. Le
        // contre-essai qui retire le filtre l'a montré (CH). La carence nue,
        // ouverte de la même façon, ne doit rien montrer.
        d.autreCarence = !!nue;
        if (nue) {
          window.mesOuvrirTableMesures(nue);
          await a(2000);
          d.lignesAutre = lignes().length;
          window.mesOuvrirTableMesures(c.id);
          await a(2000);
          d.lignesRetour = lignes().length;
        }
        // ── « Suivi » : le traitement de la carence, à l'étape du suivi ──
        const m = vues[0];
        bouton(`mesFaireLeSuivi('${m}')`)?.click();
        await a(2500);
        d.sliderOuvert = window.MES_STATE.sliderOpen === true
          && !!document.getElementById('mesSlider')?.classList.contains('open');
        d.etapeVue = window.MES_STATE.etapeVue;
        d.carenceDuSuivi = (window.MES_STATE.carenceEnCours || {}).id === c.id;
        // La fenêtre change : le volet remesure le bandeau. La mesure est
        // d'abord effacée, pour que ce soit bien le redimensionnement qui la
        // repose.
        document.documentElement.style.removeProperty('--mes-pied');
        window.dispatchEvent(new Event('resize'));
        await a(300);
        d.piedRemesure = !!document.documentElement.style.getPropertyValue('--mes-pied');
        // Le fond du volet le referme.
        document.getElementById('mesSliderOverlay')?.click();
        await a(800);
        d.sliderFerme = window.MES_STATE.sliderOpen === false
          && !document.getElementById('mesSlider')?.classList.contains('open');
        // Volet fermé, un redimensionnement ne mesure plus rien.
        document.documentElement.style.removeProperty('--mes-pied');
        window.dispatchEvent(new Event('resize'));
        await a(300);
        d.piedIntact = !document.documentElement.style.getPropertyValue('--mes-pied');
        // ── Le retrait d'une mesure : confirmé, puis parti partout ──
        d.boutonSuppr = !!bouton(`mesSupprimerMesure('${m}')`);
        bouton(`mesSupprimerMesure('${m}')`)?.click();
        await a(1200);
        d.confirmation = !!document.querySelector('.oasis-confirm-oui');
        document.querySelector('.oasis-confirm-oui')?.click();
        await a(3000);
        d.partie = !(await window.mesApi('/mesures')).some((x) => x.id === m);
        d.lignePartie = !lignes().includes(m);
        const relue = (await window.mesApi('/constatations')).find((x) => x.id === c.id) || {};
        d.compteApres = relue.mesures_liees;
        return d;
      }, bati.dossier, bati.nue);
      verifier('le volet d’une carence montre une à une les mesures que la liste annonce',
        L.carence === true && L.volet === true
        && L.annoncees === L.siennes && L.blocs === L.siennes && L.siennes === 2,
        JSON.stringify(L));
      verifier('le volet ouvre la table des Mesures sur cette carence seule, et toutes les siennes y sont',
        L.boutonTable === true && L.voletFerme === true
        && L.page === 'mesures' && L.filtre === true
        && L.seulementSiennes === true && L.toutes === true
        // Le filtre écarte : une carence sans mesure ouvre une table vide.
        && L.autreCarence === true && L.lignesAutre === 0 && L.lignesRetour === L.siennes,
        JSON.stringify(L));
      verifier('« Suivi » rouvre le traitement de la carence à l’étape du suivi, et le fond du volet le referme',
        L.sliderOuvert === true && L.etapeVue === 'suivi' && L.carenceDuSuivi === true
        && L.sliderFerme === true,
        JSON.stringify(L));
      verifier('le volet ouvert suit la hauteur du bandeau quand la fenêtre change, et fermé n’en mesure plus rien',
        L.piedRemesure === true && L.piedIntact === true,
        JSON.stringify(L));
      verifier('une mesure se retire, après confirmation, du serveur comme de la table, et sa carence en compte une de moins',
        L.boutonSuppr === true && L.confirmation === true
        && L.partie === true && L.lignePartie === true
        && L.compteApres === L.siennes - 1,
        JSON.stringify(L));
    },
  });
};
