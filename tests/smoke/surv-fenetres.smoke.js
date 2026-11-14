// Fumée — SURV : les fenêtres qu'on referme sans rien décider.
// Écran « Exécution de la Surveillance », dans un navigateur.
//
// ── Ce qui restait ──
//
// Seize fonctions fléchées posées en propriété — `el.onclick = () => …` —
// n'entraient pas au relevé : sans nom à l'exécution, rien ne les rapprochait.
// Nommées désormais par leur texte (ADR-003, n° 5.f.98), quatorze sont dans
// SURV, et neuf étaient déjà pressées par les suites. Les cinq autres sont
// toutes des **renoncements** :
//
//   · le fond du volet latéral, qui le referme (`execShowSlider`) ;
//   · le fond du choix du validateur, à la soumission d'une notification
//     (`_showValidatorPicker`) ;
//   · dans la fenêtre d'intitulé d'une preuve (`_execPreuveModal`) : son fond,
//     « Annuler », et la touche Entrée, qui vaut « Ajouter ».
//
// Un renoncement se mesure à ce qui **ne part pas**. Chaque ronde compte donc
// les écritures pendant le geste : la fenêtre doit se fermer, et rien ne doit
// avoir été envoyé. L'Entrée, elle, est l'inverse — un seul dépôt, et la pièce
// au conteneur sous l'intitulé saisi.
const { verifier } = require('./harness');
const { surSURV } = require('./surv-socle');

module.exports = async function survFenetresSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (fenêtres)',
    titre: 'SURV : refermer le volet, le choix du validateur et la fenêtre de preuve sans rien décider',
    rondes: async ({ page, jalon }) => {
      await page.waitForSelector('.nav-btn[data-page]', { timeout: 20000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));

      // Les écritures, comptées dans la page : tout appel qui n'est pas une
      // lecture. Posé une fois, relevé à chaque ronde.
      await page.evaluate(() => {
        const vrai = window.fetch;
        window.__ecritures = [];
        window.fetch = (u, o) => {
          const m = ((o || {}).method || 'GET').toUpperCase();
          if (m !== 'GET') window.__ecritures.push(`${m} ${String(u)}`);
          return vrai(u, o);
        };
      });

      // ── 1. Le fond du volet ──
      jalon('fenêtres : le fond du volet');
      const volet = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const v = {};
        execShowStatistiquesAdvanced();
        await attendre(1500);
        v.ouvert = !!document.getElementById('execSlider') && EXEC_STATE.sliderOpen === true;
        const fond = document.getElementById('execSliderOverlay');
        v.fond = !!fond;
        if (!fond) return v;
        // Le volet n'est pas dans le fond : un clic dans le volet ne le
        // referme pas.
        document.querySelector('#execSlider .exec-slider-header h3')?.click();
        await attendre(500);
        v.resteAuClicDedans = !!document.getElementById('execSlider') && EXEC_STATE.sliderOpen === true;
        const n0 = window.__ecritures.length;
        fond.click();
        await attendre(800);
        v.ferme = !document.getElementById('execSlider') && !document.getElementById('execSliderOverlay')
          && EXEC_STATE.sliderOpen === false;
        v.ecritures = window.__ecritures.slice(n0);
        return v;
      });
      verifier('le fond du volet le referme, un clic dans le volet non, et rien ne part',
        volet.ouvert && volet.fond && volet.resteAuClicDedans && volet.ferme
        && Array.isArray(volet.ecritures) && volet.ecritures.length === 0,
        JSON.stringify(volet));

      // ── 2. Le fond du choix du validateur ──
      //
      // Par la soumission d'une notification, comme le bouton de l'aperçu.
      // La notification désignée n'existe pas : si le fond confirmait au lieu
      // de renoncer, l'écriture partirait, et le contrôle la compterait.
      jalon('fenêtres : le choix du validateur');
      const choix = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const c = {};
        const avant = EXEC_STATE.selectedNotification;
        EXEC_STATE.selectedNotification = { id: 'surv-fenetres-inexistante' };
        const n0 = window.__ecritures.length;
        try {
          execSubmitNotificationForValidation();
          await attendre(1500);
          const fond = () => document.getElementById('validator-picker-overlay');
          c.ouvert = !!fond();
          if (!c.ouvert) return c;
          c.validateurs = fond().querySelectorAll('#validator_picker_select option[value]:not([value=""])').length;
          fond().querySelector('h3').click();
          await attendre(400);
          c.resteAuClicDedans = !!fond();
          fond()?.click();
          await attendre(600);
          c.ferme = !fond();
          c.ecritures = window.__ecritures.slice(n0);
        } finally {
          EXEC_STATE.selectedNotification = avant;
        }
        return c;
      });
      verifier('le fond du choix du validateur y renonce, un clic dans la boîte non, et rien ne part',
        choix.ouvert && choix.resteAuClicDedans && choix.ferme
        && Array.isArray(choix.ecritures) && choix.ecritures.length === 0,
        JSON.stringify(choix));

      // ── 3. La fenêtre d'intitulé d'une preuve ──
      //
      // Par le chemin du sélecteur de fichiers : `execHandlePACProofUpload`
      // reçoit la pièce, demande son intitulé, et ne dépose qu'une saisie
      // validée. Le conteneur est posé par la ronde, et retiré par elle.
      jalon('fenêtres : la preuve');
      const preuve = await page.evaluate(async () => {
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const p = {};
        const conteneur = document.createElement('div');
        conteneur.id = 'surv_fenetres_preuves';
        document.body.appendChild(conteneur);
        const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
        const piece = (nom) => new File([pdf], nom, { type: 'application/pdf' });
        const fenetre = () => document.getElementById('exec_preuve_modal');
        const depots = () => window.__ecritures.filter((e) => /^POST .*\/upload$/.test(e)).length;
        // Une fenêtre qui ne se referme plus laisserait l'attente pendre : la
        // ronde bornerait la suite au lieu de la faire rougir. On borne donc
        // l'attente, et l'on dit si elle a été servie.
        const servie = (promesse) => Promise.race([
          promesse.then(() => true), attendre(4000).then(() => false)]);
        try {
          // Le fond : la fenêtre tient au clic dedans, se referme au fond.
          let fin = execHandlePACProofUpload([piece('par-le-fond.pdf')], conteneur.id);
          await attendre(500);
          p.fond = { ouverte: !!fenetre() };
          if (p.fond.ouverte) {
            fenetre().querySelector('h3').click();
            await attendre(300);
            p.fond.resteAuClicDedans = !!fenetre();
            fenetre()?.click();
            p.fond.servie = await servie(fin);
            p.fond.fermee = !fenetre();
            p.fond.depots = depots();
          }

          // « Annuler » : la même chose par le bouton.
          fin = execHandlePACProofUpload([piece('par-annuler.pdf')], conteneur.id);
          await attendre(500);
          p.annuler = { ouverte: !!fenetre() };
          if (p.annuler.ouverte) {
            document.getElementById('exec_preuve_annuler').click();
            p.annuler.servie = await servie(fin);
            p.annuler.fermee = !fenetre();
            p.annuler.depots = depots();
          }
          p.lignesApresRenoncements = conteneur.children.length;

          // Entrée dans l'intitulé : vaut « Ajouter ». Un seul dépôt, et la
          // pièce au conteneur sous l'intitulé saisi.
          fin = execHandlePACProofUpload([piece('par-entree.pdf')], conteneur.id);
          await attendre(500);
          p.entree = { ouverte: !!fenetre() };
          if (p.entree.ouverte) {
            const champ = document.getElementById('exec_preuve_intitule');
            champ.value = 'Pièce validée par Entrée';
            // Une autre touche ne valide rien.
            champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
            await attendre(300);
            p.entree.resteAUneAutreTouche = !!fenetre();
            champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            p.entree.servie = await servie(fin);
            await attendre(300);
            p.entree.fermee = !fenetre();
            p.entree.depots = depots();
            p.entree.lignes = conteneur.children.length;
            p.entree.intitule = conteneur.textContent.includes('Pièce validée par Entrée');
          }
        } finally {
          conteneur.remove();
          fenetre()?.remove();
        }
        return p;
      });
      verifier('la fenêtre de preuve tient au clic dedans, se referme à son fond, et rien n’est déposé',
        !!preuve.fond && preuve.fond.ouverte && preuve.fond.resteAuClicDedans
        && preuve.fond.servie && preuve.fond.fermee && preuve.fond.depots === 0,
        JSON.stringify(preuve.fond));
      verifier('« Annuler » referme la fenêtre de preuve, et rien n’est déposé ni ajouté',
        !!preuve.annuler && preuve.annuler.ouverte && preuve.annuler.fermee
        && preuve.annuler.servie && preuve.annuler.depots === 0 && preuve.lignesApresRenoncements === 0,
        JSON.stringify({ annuler: preuve.annuler, lignes: preuve.lignesApresRenoncements }));
      verifier('Entrée dans l’intitulé vaut « Ajouter » : une seule pièce déposée, sous l’intitulé saisi — une autre touche ne valide rien',
        !!preuve.entree && preuve.entree.ouverte && preuve.entree.resteAUneAutreTouche
        && preuve.entree.servie && preuve.entree.fermee && preuve.entree.depots === 1
        && preuve.entree.lignes === 1 && preuve.entree.intitule,
        JSON.stringify(preuve.entree));
    },
  });
};
