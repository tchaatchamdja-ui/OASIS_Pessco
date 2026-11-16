// Fumée — SURV : la configuration des processus. Écran « Exécution de la
// Surveillance », dans un navigateur.
//
// ── Pourquoi une suite à part, et celle-ci ──
//
// `exec-processus-config.js` portait trois des derniers restes du relevé —
// les deux filtres de la liste des processus, et le retrait d'un acteur dans
// l'éditeur —, tous sur l'écran qu'une ronde de `surv.smoke.js` parcourait
// déjà. Cette ronde en sort sans rien changer, comme celle du circuit avant
// elle : elle bâtit son propre processus, le duplique, et retire tout ce
// qu'elle a posé. Elle ne lisait rien de ce que les autres rondes laissaient.
//
// *Le budget de `surv.smoke.js` baisse une troisième fois : 7 890 → 7 736.*
const { verifier } = require('./harness');
const { surSURV, M } = require('./surv-socle');

module.exports = async function survProcessusSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (processus)',
    titre: 'SURV : la configuration des processus — liste, filtres, acteurs, duplication',
    rondes: async ({ page, jalon }) => {
      // ══════════════════════════════════════════════════════════════════
      //  Le processus : sa configuration, qui commande tout le reste
      // ══════════════════════════════════════════════════════════════════
      //
      // ── Ce que la mesure a appris avant qu'une ligne soit écrite ──
      //
      // Le relevé disait `exec-notifications.js` : **1 geste exercé sur 25**. Le
      // circuit d'une notification — soumettre, valider, envoyer, accorder —
      // était donc presque entièrement non couvert, et la ronde du dossier le
      // parcourt par l'API faute de mieux.
      //
      // J'ai cru d'abord que ces gestes étaient échoués sur la page
      // `declenchement`, l'une des quatre qu'aucun chemin n'ouvre (n° 5.f.2).
      // *Depuis le 7 novembre 2026, cette page est au menu (n° 5.f.72) ; ce qui
      // suit décrit l'état où elle ne l'était pas.*
      // **Mesuré, c'est faux** : forcée dans le navigateur, cette page ne rend
      // que deux gestes, et `execStartNotification` est aussi appelé depuis la
      // page **`processus`**, qui est au menu. Le circuit est donc atteignable.
      //
      // Mais il est atteignable **derrière une porte** : la page `processus` ne
      // liste pas des activités, elle liste des **processus configurés**, et le
      // jeu d'essai n'en porte aucun — « Aucune donnée », quel que soit le
      // filtre. Pour déclencher une activité, il faut d'abord qu'un processus
      // existe.
      //
      // Cette ronde ouvre donc cette porte. Le circuit de la notification la
      // suivra, et il sait maintenant par où passer.
      //
      // *Un gisement qu'on croit inaccessible l'est parfois seulement derrière
      // une étape qu'on n'avait pas cherchée.*
      jalon('configuration du processus');
      const processus = await page.evaluate(async (api) => {
        const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = {};
        const lire = async () => {
          try { return await (await fetch(`${api}/processus`, { credentials: 'same-origin' })).json(); }
          catch { return []; }
        };
        const poser = (id, v) => {
          const e = document.getElementById(id);
          if (!e) return false;
          e.value = v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const choisir = (id) => {
          const e = document.getElementById(id);
          if (!e || e.options.length < 2) return '';
          e.selectedIndex = 1;
          e.dispatchEvent(new Event('change', { bubbles: true }));
          return e.value;
        };
        // ── SURV a **deux** fenêtres de confirmation, et une ronde doit les
        //    connaître toutes deux ──
        //
        // Celle du socle (`oasisConfirmer`) pose un bouton `.oasis-confirm-oui` ;
        // celle du module (`execProcConfirmer`) pose un
        // `[data-rep="oui"]` dans un `.exec-proc-dialogue`. Les suppressions de
        // processus passent par la seconde, et le premier jet de cette ronde ne
        // cherchait que la première : les deux processus posés **restaient**,
        // « fin: 2 » au lieu de 0.
        //
        // *Un geste qui demande confirmation ne dit pas laquelle : il faut
        // l'avoir lu, ou les essayer toutes.*
        const confirmer = async () => {
          await attendre(900);
          const oui = document.querySelector('.oasis-confirm-oui')
            || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
            || document.querySelector('[data-rep="oui"]');
          if (!oui) return false;
          oui.click();
          await attendre(3200);
          return true;
        };

        document.querySelector('.nav-btn[data-page="processus"]')?.click();
        await attendre(3200);
        const z = () => document.getElementById('exec-content');
        r.listeVide = z().textContent.includes('Aucune donnée');
        const avant = await lire();
        r.avant = (avant || []).length;
        const avantIds = new Set((avant || []).map((x) => x.id));

        // Le formulaire de configuration.
        document.querySelector('[onclick^="execProcCfgEditer"]')?.click();
        await attendre(3500);
        r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;
        poser('pcfg_libelle', 'SURV 0.c — processus de la ronde');
        r.choix = { type: choisir('pcfg_type'), domaine: choisir('pcfg_domaine'), secteur: choisir('pcfg_secteur') };
        poser('pcfg_description', 'Posé par la ronde, retiré par elle.');
        await attendre(1200);

        // ── Un acteur ajouté, et les acteurs ne sont pas dans un tableau ──
        //
        // Premier jet : les lignes d'un `tbody` — **0 avant, 0 après**. Second
        // jet : les enfants de `.pcfg-acteurs` — **9 avant, 9 après**, car il y
        // a un bloc par étape du circuit et chacun porte soit ses acteurs, soit
        // un « aucun acteur » qu'une ligne ajoutée **remplace**.
        //
        // Ce qui change, ce sont les **lignes d'acteur**, et elles se
        // reconnaissent à leurs listes de choix. Troisième lecture du même
        // geste, et la troisième est celle que le code décrit : un bloc par
        // étape, dont le contenu bascule entre le vide et les lignes.
        const acteurs = () => document.querySelectorAll('#execSlider .pcfg-acteurs select').length;
        const blocsVides = () => document.querySelectorAll('#execSlider .pcfg-vide').length;
        const acteursAvant = acteurs();
        const videsAvant = blocsVides();
        document.querySelector('[onclick^="execProcCfgAjouterActeur"]')?.click();
        await attendre(1800);
        r.acteurs = [acteursAvant, acteurs()];
        r.blocsVides = videsAvant > blocsVides();
        // Les listes de la ligne d'acteur sont renseignées, sinon l'enregistrement
        // peut refuser une ligne vide.
        [...document.querySelectorAll('#execSlider .pcfg-acteurs select')].forEach((sel) => {
          if (sel.options.length > 1) {
            sel.selectedIndex = 1;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await attendre(1200);

        document.querySelector('[onclick^="execProcCfgEnregistrer"]')?.click();
        await attendre(4000);
        const apres = await lire();
        r.apres = (apres || []).length;
        const mien = (apres || []).find((x) => !avantIds.has(x.id));
        r.cree = mien ? { id: mien.id, libelle: mien.libelle || '', type: mien.type || '' } : null;
        r.listeApres = !z().textContent.includes('Aucune donnée');
        if (!mien) return r;

        // ── Les deux filtres de la liste (n° 5.f.91) ──
        //
        // Au moment où ils s'éprouvent, la liste ne porte que le processus de
        // la ronde : filtré sur l'autre type ou sur un autre secteur, il doit
        // partir ; sur les siens, revenir ; filtres levés, la liste se rend.
        const lignesListe = () => [...document.querySelectorAll('#exec-content tr.exec-act-row')];
        const ligneDuMien = () => lignesListe()
          .some((tr) => (tr.getAttribute('onclick') || '').includes(mien.id));
        const filtre = (motif) => document.querySelector(`#exec-content select[onchange^="${motif}"]`);
        const filtrer = async (motif, v) => {
          const s = filtre(motif);
          if (!s) return false;
          s.value = v;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(700);
          return true;
        };
        const TYPE = 'EXEC_PROC_CFG.filtre.type';
        const SECTEUR = 'EXEC_PROC_CFG.filtre.secteur';
        const enBase = (apres || []).find((x) => x.id === mien.id) || {};
        const autreType = enBase.type === 'constatation' ? 'activite' : 'constatation';
        const selSecteur = filtre(SECTEUR);
        const autreSecteur = selSecteur
          ? ([...selSecteur.options].map((o) => o.value).find((v) => v && v !== enBase.secteur_id) || '') : '';
        r.filtres = {
          type: enBase.type, secteur: enBase.secteur_id || '', autreSecteur,
          avant: lignesListe().length, mienAvant: ligneDuMien(),
        };
        r.filtres.selectType = await filtrer(TYPE, autreType);
        r.filtres.autreType = {
          mien: ligneDuMien(), lignes: lignesListe().length,
          garde: (filtre(TYPE) || {}).value === autreType,
        };
        await filtrer(TYPE, enBase.type);
        r.filtres.memeType = ligneDuMien();
        // Le choix se relit aux **deux** pas : le contre-test K (n° 5.f.91)
        // ôtait le « selected » de l'option du processus de la ronde, et un
        // contrôle qui ne relisait que l'autre ne l'a pas vu.
        r.filtres.memeTypeGarde = (filtre(TYPE) || {}).value === enBase.type;
        await filtrer(TYPE, '');
        r.filtres.selectSecteur = await filtrer(SECTEUR, autreSecteur);
        r.filtres.autreSecteurVu = {
          mien: ligneDuMien(), garde: (filtre(SECTEUR) || {}).value === autreSecteur,
        };
        await filtrer(SECTEUR, enBase.secteur_id || '');
        r.filtres.memeSecteur = ligneDuMien();
        r.filtres.memeSecteurGarde = (filtre(SECTEUR) || {}).value === (enBase.secteur_id || '');
        await filtrer(SECTEUR, '');
        r.filtres.rendu = { lignes: lignesListe().length, mien: ligneDuMien(),
          leves: !EXEC_PROC_CFG.filtre.type && !EXEC_PROC_CFG.filtre.secteur };

        // ── Retirer un acteur (n° 5.f.91) ──
        //
        // Deux acteurs à la première étape, le second marqué ; le **premier**
        // retiré. Il faut que ce soit lui qui parte et que la saisie du second
        // survive à la recomposition du formulaire — puis que le serveur ne
        // garde que le second. Le dernier retiré, l'étape redit qu'elle est
        // vide ; refermé sans enregistrer, le serveur n'en sait rien.
        const ouvrirMien = async () => {
          const b = document.querySelector(`#exec-content button[onclick="execProcCfgEditer('${mien.id}')"]`);
          if (!b) return false;
          b.click();
          await attendre(2500);
          return true;
        };
        const lireMien = async () => ((await lire()) || []).find((x) => x.id === mien.id) || {};
        r.retrait = { ouvert: await ouvrirMien() };
        const bloc0 = document.querySelector('#execSlider #pcfg_etapes .pcfg-etape');
        const cle = bloc0 ? bloc0.dataset.cle : '';
        const lignesActeur = () => [...document.querySelectorAll(
          `#execSlider .pcfg-etape[data-cle="${cle}"] .pcfg-acteur`)];
        r.retrait.cle = cle;
        r.retrait.avant = lignesActeur().length;
        document.querySelector(`#execSlider [onclick="execProcCfgAjouterActeur('${cle}')"]`)?.click();
        await attendre(900);
        r.retrait.apresAjout = lignesActeur().length;
        const derniere = () => lignesActeur()[lignesActeur().length - 1];
        const role = derniere() && derniere().querySelector('.pcfg-role');
        if (role) {
          role.value = 'autre';
          role.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(700);
        }
        const libre = derniere() && derniere().querySelector('.pcfg-role-libre');
        if (libre) {
          libre.value = 'acteur gardé par la ronde';
          libre.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const premiere = lignesActeur()[0];
        const retirer = premiere && premiere.querySelector('[onclick^="execProcCfgRetirerActeur"]');
        r.retrait.bouton = !!retirer;
        if (retirer) { retirer.click(); await attendre(900); }
        const reste = lignesActeur();
        r.retrait.apresRetrait = reste.length;
        r.retrait.resteSaisie = reste.length
          ? { role: (reste[0].querySelector('.pcfg-role') || {}).value,
            libre: (reste[0].querySelector('.pcfg-role-libre') || {}).value } : null;
        document.querySelector('#execSlider [onclick^="execProcCfgEnregistrer"]')?.click();
        await attendre(3500);
        const garde = (await lireMien()).acteurs || {};
        r.retrait.enBase = (garde[cle] || []).map((a) => ({ role: a.role, libre: a.role_libre }));

        // Le dernier acteur retiré, l'étape redit qu'elle est vide ; refermé
        // sans enregistrer, rien ne change au serveur.
        r.retrait.rouvert = await ouvrirMien();
        const seul = lignesActeur()[0];
        seul?.querySelector('[onclick^="execProcCfgRetirerActeur"]')?.click();
        await attendre(900);
        r.retrait.vide = {
          lignes: lignesActeur().length,
          mention: !!document.querySelector(`#execSlider .pcfg-etape[data-cle="${cle}"] .pcfg-vide`),
        };
        execCloseSlider();
        await attendre(800);
        r.retrait.apresFermeture = (((await lireMien()).acteurs || {})[cle] || []).length;

        // Dupliqué, puis les deux retirés : la ronde ne laisse rien.
        const dupliquer = [...document.querySelectorAll('[onclick^="execProcCfgDupliquer"]')]
          .find((b) => (b.getAttribute('onclick') || '').includes(mien.id));
        r.boutonDupliquer = !!dupliquer;
        if (dupliquer) {
          dupliquer.click();
          await attendre(2400);
          const valider = document.querySelector('[onclick^="execProcCfgDupliquerValider"]');
          r.boutonDupliquerValider = !!valider;
          if (valider) { valider.click(); await attendre(3500); }
          r.apresDuplication = ((await lire()) || []).length;
        }
        // Tous ceux que la ronde a créés partent, le copié comme l'original.
        const aEffacer = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).map((x) => x.id);
        r.aEffacer = aEffacer.length;
        for (const id of aEffacer) {
          const b = [...document.querySelectorAll('[onclick^="execProcCfgSupprimer"]')]
            .find((x) => (x.getAttribute('onclick') || '').includes(id));
          if (b) { b.click(); /* eslint-disable no-await-in-loop */ await confirmer(); }
        }
        r.fin = ((await lire()) || []).filter((x) => !avantIds.has(x.id)).length;
        return r;
      }, M);

      verifier('la page du processus part d’une liste vide, et sa configuration s’ouvre garnie',
        processus.listeVide === true && processus.formulaire > 3000
        && !!processus.choix && !!processus.choix.domaine,
        JSON.stringify({ vide: processus.listeVide, formulaire: processus.formulaire,
          choix: processus.choix }));
      verifier('un acteur s’ajoute à l’étape du circuit, dont le bloc cesse d’être vide',
        !!processus.acteurs && processus.acteurs[1] > processus.acteurs[0]
        && processus.blocsVides === true,
        JSON.stringify({ acteurs: processus.acteurs, unBlocDeMoinsVide: processus.blocsVides }));
      verifier('le processus configuré est porté par le serveur, et la liste cesse d’être vide',
        processus.apres === processus.avant + 1 && !!processus.cree
        && /processus de la ronde/.test(processus.cree.libelle)
        && processus.listeApres === true,
        JSON.stringify({ avant: processus.avant, apres: processus.apres,
          cree: processus.cree, listeApres: processus.listeApres }));
      verifier('il se duplique, et la ronde retire tout ce qu’elle a posé',
        processus.boutonDupliquer === true && processus.apresDuplication > processus.apres
        && processus.aEffacer >= 2 && processus.fin === 0,
        JSON.stringify({ duplique: processus.apresDuplication, aEffacer: processus.aEffacer,
          fin: processus.fin }));

      const f = processus.filtres || {};
      verifier('filtrée sur l’autre type, la liste perd le processus ; sur le sien, elle le rend — et le choix tient aux deux pas',
        f.selectType === true && f.mienAvant === true
        && f.autreType && f.autreType.mien === false && f.autreType.lignes === 0
        && f.autreType.garde === true && f.memeType === true && f.memeTypeGarde === true,
        JSON.stringify(f));
      verifier('filtrée sur un autre secteur, la liste perd le processus ; sur le sien, elle le rend — et filtres levés, elle se rend entière',
        f.selectSecteur === true && !!f.secteur && !!f.autreSecteur
        && f.autreSecteurVu && f.autreSecteurVu.mien === false && f.autreSecteurVu.garde === true
        && f.memeSecteur === true && f.memeSecteurGarde === true
        && f.rendu && f.rendu.lignes === f.avant && f.rendu.mien === true && f.rendu.leves === true,
        JSON.stringify(f));
      const rt = processus.retrait || {};
      verifier('retirer le premier acteur d’une étape retire celui-là, et la saisie du second survit à la recomposition',
        rt.ouvert === true && !!rt.cle && rt.avant === 1 && rt.apresAjout === 2
        && rt.bouton === true && rt.apresRetrait === 1
        && rt.resteSaisie && rt.resteSaisie.role === 'autre'
        && rt.resteSaisie.libre === 'acteur gardé par la ronde',
        JSON.stringify(rt));
      verifier('enregistré, le serveur ne garde que l’acteur resté ; le dernier retiré, l’étape se dit vide, et refermer sans enregistrer ne change rien',
        JSON.stringify(rt.enBase)
          === JSON.stringify([{ role: 'autre', libre: 'acteur gardé par la ronde' }])
        && rt.rouvert === true && rt.vide && rt.vide.mention === true
        && rt.vide.lignes === 0 && rt.apresFermeture === 1,
        JSON.stringify(rt));
    },
  });
};
