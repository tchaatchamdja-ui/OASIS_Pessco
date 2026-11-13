// Fumée — SURV : le circuit guidé d'une activité, de son déclenchement à son
// accord. Écran « Exécution de la Surveillance », dans un navigateur.
//
// ── Pourquoi une suite à part, et celle-ci ──
//
// `exec-processus.js` était devenu le plus gros gisement de gestes non exercés
// de l'écran — **18 occurrences sur 32**, treize noms —, et tous se tiennent
// sur un même écran : le promeneur du circuit. Déclencher, soumettre, rejeter,
// renvoyer en correction, valider, transmettre, puis l'accord de l'organisme.
//
// La ronde qui le traverse vivait dans `surv.smoke.js`, au milieu d'un bloc de
// cinq mille lignes. Elle en sort sans rien changer : elle **bâtit sa propre
// chaîne** — une activité hors plan, créée par le formulaire de l'écran — et
// l'efface en partant, jusqu'à la suppression définitive. Elle ne lisait déjà
// rien de ce que les autres rondes laissaient.
//
// *Le budget de `surv.smoke.js` baisse pour la seconde fois : 7 739 → 7 331.*
//
// ── Le refus que cette ronde provoque exprès ──
//
// Une notification **envoyée ne s'efface pas** : la route rend 409, et c'est la
// propriété mesurée. Elle s'annule, et c'est de là qu'elle se retire. La
// déclaration suit donc la ronde, puisque c'est elle qui la provoque.
const { verifier } = require('./harness');
const { surSURV, M } = require('./surv-socle');

module.exports = async function survCircuitSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (circuit)',
    titre: 'SURV : le circuit guidé d’une activité, du déclenchement à l’accord',
    refus: [
      {
        code: 409, methode: 'DELETE', chemin: /\/notifications\/[\w-]+$/,
        pourquoi: 'une notification envoyée refuse d’être effacée : elle s’annule.'
          + ' Éprouvé par « une notification envoyée refuse d’être effacée, s’annule,'
          + ' et se retire alors » (n° 5.f.26).',
      },
    ],
    rondes: async ({ page, jalon }) => {
    jalon('circuit guidé');
    const circuit = await page.evaluate(async (api) => {
      const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
      const r = {};
      const notifs = async () => {
        try { return await (await fetch(`${api}/notifications`, { credentials: 'same-origin' })).json(); }
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
        if (!e) return '';
        // La première option réelle : l'option vide est un intitulé, non un choix.
        const i = [...e.options].findIndex((o) => o.value);
        if (i < 0) return '';
        e.selectedIndex = i;
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return e.value;
      };
      // Les deux fenêtres de confirmation de SURV — celle du socle et celle du
      // module (n° 5.f.25).
      const confirmer = async () => {
        await attendre(900);
        const oui = document.querySelector('.oasis-confirm-oui')
          || document.querySelector('.exec-proc-dialogue [data-rep="oui"]')
          || document.querySelector('[data-rep="oui"]');
        if (!oui) return false;
        oui.click();
        await attendre(3500);
        return true;
      };

      const avant = await notifs();
      const avantIds = new Set((avant || []).map((n) => n.id));
      r.avant = avantIds.size;

      document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
      await attendre(3200);
      const porte = document.querySelector('[onclick^="execProcNouvelleActivite"]');
      r.porte = !!porte;
      if (!porte) return r;
      porte.click();
      await attendre(3500);
      r.formulaire = (document.getElementById('execSlider') || { innerHTML: '' }).innerHTML.length;

      // ── Les listes en cascade : le domaine commande le secteur, qui
      //    commande l'organisme ──
      //
      // Mesuré avant d'écrire : à l'ouverture, `hp_secteur` et
      // `hp_prestataire` ne portent **qu'une** option — leur intitulé. Elles
      // se remplissent quand le domaine est choisi. Un contrôle qui les aurait
      // renseignées d'emblée aurait choisi dans le vide.
      poser('hp_annee', String(new Date().getFullYear()));
      // ── La cascade dépend des **données**, et la ronde doit la chercher ──
      //
      // Premier jet : le premier domaine, puis le premier secteur, puis le
      // premier organisme. Le secteur retenu n'en portait **aucun** —
      // `prestataire: ""` —, et la création s'arrêtait sans un mot : le geste
      // valide côté client, et ne part pas.
      //
      // On parcourt donc les couples (domaine, secteur) jusqu'à en trouver un
      // que le jeu d'essai peuple. *Un formulaire en cascade ne se remplit pas
      // par le premier choix de chaque liste : il se remplit par le chemin que
      // les données autorisent.*
      const options = (id) => [...(document.getElementById(id) || { options: [] }).options]
        .filter((o) => o.value).map((o) => o.value);
      const poserListe = (id, v) => {
        const e = document.getElementById(id);
        if (!e) return false;
        e.value = v;
        e.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      r.cascade = { essais: 0 };
      for (const dom of options('hp_domaine')) {
        poserListe('hp_domaine', dom);
        /* eslint-disable no-await-in-loop */
        await attendre(1600);
        for (const sec of options('hp_secteur')) {
          poserListe('hp_secteur', sec);
          await attendre(1400);
          r.cascade.essais += 1;
          const prest = options('hp_prestataire');
          if (prest.length) {
            poserListe('hp_prestataire', prest[0]);
            await attendre(1200);
            r.cascade.domaine = dom;
            r.cascade.secteur = sec;
            r.cascade.prestataire = prest[0];
            break;
          }
        }
        if (r.cascade.prestataire) break;
      }
      r.cascade.type = choisir('hp_type');
      r.cascade.mode = choisir('hp_mode');
      r.cascade.responsable = choisir('hp_responsable');
      r.cascade.type = choisir('hp_type');
      r.cascade.mode = choisir('hp_mode');
      r.cascade.responsable = choisir('hp_responsable');
      // ── Les cases de la portée : deux contrats qui se mesurent l'un contre
      //    l'autre ──
      //
      // Cocher une sous-activité coche **tous** ses thèmes ; et un thème coché
      // rend sa sous-activité cochée dès qu'il en reste **un** — décocher le
      // dernier la décoche. C'est la seule portée qu'une activité hors plan
      // porte, et rien ne la gardait.
      const cases = (sel) => [...document.querySelectorAll(sel)];
      const laSa = cases('.hp-sa')[0] || null;
      r.portee = { sousActivites: cases('.hp-sa').length };
      if (laSa) {
        const themes = () => cases(`.hp-theme[data-sa="${laSa.value}"]`);
        r.portee.themes = themes().length;
        laSa.click();
        await attendre(500);
        r.portee.tousCoches = themes().length > 0 && themes().every((t) => t.checked);
        if (themes().length > 1) {
          themes()[0].click();
          await attendre(400);
          r.portee.saTenue = laSa.checked;
        }
        themes().filter((t) => t.checked).forEach((t) => t.click());
        await attendre(500);
        r.portee.saLachee = !laSa.checked;
        // Rendue cochée : c'est la portée que l'activité doit porter.
        laSa.click();
        await attendre(500);
        r.portee.rendue = themes().every((t) => t.checked);
      }

      poser('hp_debut', '2026-11-02');
      poser('hp_fin', '2026-11-04');
      poser('hp_nb_inspecteurs', '2');
      poser('hp_lieu', 'Siège de l’organisme');
      poser('hp_objet', 'SURV 0.c — activité hors plan de la ronde');
      await attendre(1200);

      document.querySelector('[onclick^="execProcCreerHorsPlan"]')?.click();
      await attendre(1000);
      r.creationConfirmee = await confirmer();
      await attendre(2000);
      const apres = await notifs();
      r.apres = (apres || []).length;
      const mienne = (apres || []).find((n) => !avantIds.has(n.id));
      r.creee = mienne ? { id: mienne.id, statut: mienne.statut, objet: mienne.objet || '' } : null;
      if (!mienne) return r;

      // ── Le circuit, par ses gestes ──
      //
      // **Correction d'une note fausse.** Il était écrit ici qu'`EXEC_PROC`
      // « n'est pas encore peuplé à cet instant ». Il l'est : c'est la lecture
      // qui ne le voyait pas. `EXEC_PROC` est un `let` de premier niveau d'un
      // script classique — une liaison de la portée lexicale globale, et
      // **non** une propriété de `window`, où seul `EXEC_STATE` est publié
      // (`exec-adapters.js`). `window.EXEC_PROC` rend donc `undefined` à tout
      // instant, et l'explication donnée à ce `null` était une invention
      // plausible. *Un relevé qui explique son résultat sans le vérifier
      // fabrique une cause.*
      r.etat = (typeof EXEC_PROC !== 'undefined' && EXEC_PROC)
        ? { etape: EXEC_PROC.etape, notif: !!EXEC_PROC.notif } : null;
      r.gestesCircuit = [...new Set([...document.querySelectorAll('[onclick]')]
        .map((e) => (/^\s*([A-Za-z_$][\w$.]*)/.exec(e.getAttribute('onclick') || '') || [])[1])
        .filter(Boolean))].filter((n) => /^execProc|^execStart|^execEdit/.test(n));

      const statut = async () => ((await notifs()).find((n) => n.id === mienne.id) || {}).statut;
      const agir = async (geste) => {
        const b = [...document.querySelectorAll('[onclick^="execProcAction"]')]
          .find((x) => (x.getAttribute('onclick') || '').includes(`'${geste}'`));
        if (!b) return false;
        b.click();
        await attendre(1000);
        await confirmer();
        await attendre(2500);
        return true;
      };
      // Un geste de l'écran, désigné par le début de son attribut.
      const geste = (nom) => document.querySelector(`[onclick^="${nom}"]`);
      const libelle = (nom) => (geste(nom) ? (geste(nom).textContent || '') : '')
        .replace(/\s+/g, ' ').trim();
      const cliquer = async (nom, ms) => {
        const b = geste(nom);
        if (!b) return false;
        b.click();
        await attendre(ms || 2200);
        return true;
      };
      // Une sous-étape se consulte par le fil, dont le nom est composé au
      // rendu — le relevé le dit indécidable, et il a raison : le texte que
      // l'attribut portera n'est pas écrit à l'endroit où il est posé.
      const sousEtape = async (id) => cliquer(`execProcConsulter('${id}')`, 2000);
      const etat = () => (typeof EXEC_PROC !== 'undefined' && EXEC_PROC
        ? { etape: EXEC_PROC.etape, sous: EXEC_PROC.sousEtape, edition: !!EXEC_PROC.editionAutorisee }
        : null);

      // ── 1. « Déclencher » rouvre la saisie, et rien de plus ──
      //
      // C'est un geste du client seul : il pose la sous-étape et autorise
      // l'édition. Son libellé dit l'état — « Déclencher » quand il n'y a rien,
      // « Modifier » sur un brouillon. C'est **tout** son contrat, et c'est
      // donc tout ce que le contrôle regarde ; chercher un champ précis du
      // formulaire mesurerait le formulaire, non le geste.
      r.declencher = { libelle: libelle('execProcDeclencher') };
      r.declencher.clique = await cliquer('execProcDeclencher');
      r.declencher.etat = etat();

      r.soumise = await agir('submit');
      r.statutSoumise = await statut();

      // ── 2. La bascule lecture seule / édition, à la validation ──
      //
      // Elle n'apparaît qu'à la sous-étape « validation » et pour un compte qui
      // valide. Son libellé bascule avec elle : *un bouton qui dit l'état où
      // l'on va, non celui où l'on est, se lit à l'envers* — et c'est bien
      // l'état d'arrivée qu'il annonce ici.
      await sousEtape('validation');
      r.bascule = { etatAvant: etat(), libelleAvant: libelle('execProcBasculerEdition') };
      r.bascule.clique = await cliquer('execProcBasculerEdition');
      r.bascule.etatApres = etat();
      r.bascule.libelleApres = libelle('execProcBasculerEdition');
      await cliquer('execProcBasculerEdition');
      r.bascule.etatRendu = etat();

      // ── 3. Le rejet emporte le motif saisi dans les observations ──
      const obs = document.getElementById('exec_proc_observations');
      r.rejet = { champ: !!obs };
      if (obs) {
        obs.value = 'SURV 0.g — motif de rejet de la ronde';
        obs.dispatchEvent(new Event('input', { bubbles: true }));
      }
      r.rejet.clique = await cliquer('execProcRejeter', 3400);
      r.rejet.statut = await statut();
      r.rejet.motifEnBase = ((await notifs()).find((n) => n.id === mienne.id) || {}).motif_rejet || '';

      r.resoumise = await agir('submit');
      r.statutResoumise = await statut();
      r.revalidee = await agir('validate');
      r.statutRevalidee = await statut();

      // ── 4. Le renvoi en correction, et la boîte du socle ──
      //
      // Le motif se demandait par `window.prompt` — la boîte native du
      // navigateur, hors de la page : ni traduite, ni aux couleurs de
      // l'application, et **hors de portée d'une suite**, qui ne peut pas y
      // écrire. C'était la seule du module, quand le rejet d'une notification
      // demande le sien par `oasisSaisir` depuis toujours. Elle passe par la
      // même boîte depuis ce tour, et c'est ce qui rend ce contrôle possible.
      await sousEtape('transmission');
      r.renvoi = { etat: etat(), bouton: !!geste('execProcRenvoyerSoumission') };
      if (r.renvoi.bouton) {
        geste('execProcRenvoyerSoumission').click();
        await attendre(1400);
        const champ = document.querySelector('.oasis-saisie-champ');
        r.renvoi.boiteDuSocle = !!champ;
        if (champ) {
          champ.value = 'SURV 0.g — corrections demandées par la ronde';
          champ.dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector('.oasis-confirm-oui')?.click();
        await attendre(3400);
      }
      r.renvoi.statut = await statut();

      r.resoumise2 = await agir('submit');
      r.revalidee2 = await agir('validate');
      r.transmise = await agir('send');
      r.statutTransmise = await statut();

      // ── 5. L'accord : enregistrer sans franchir, puis franchir ──
      //
      // Deux gestes, et la différence est la propriété : « Enregistrer » écrit
      // les dates confirmées et le périmètre **sans changer le statut** — la
      // notification reste envoyée —, tandis que « Confirmer l'activité » les
      // écrit *et* franchit l'étape. C'est écrit dans la route elle-même :
      // « dates confirmées et périmètre validé sont sauvegardés, la
      // notification reste envoyée ».
      await cliquer(`execProcAller('confirmation')`, 2600);
      r.accord = { etat: etat() };
      const poserAccord = (debut, fin, perimetre) => {
        const ok = poser('exec_proc_debut', debut) && poser('exec_proc_fin', fin)
          && poser('exec_proc_perimetre', perimetre);
        return ok;
      };
      r.accord.champs = poserAccord('2026-11-09', '2026-11-11',
        'SURV 0.g — périmètre validé par la ronde');
      r.accord.enregistre = await cliquer('execProcEnregistrerAccord', 3400);
      const apresEnregistrement = (await notifs()).find((n) => n.id === mienne.id) || {};
      r.accord.apresEnregistrement = {
        statut: apresEnregistrement.statut,
        debut: (apresEnregistrement.date_debut_effective || '').slice(0, 10),
        fin: (apresEnregistrement.date_fin_effective || '').slice(0, 10),
        perimetre: apresEnregistrement.perimetre_valide || '',
      };
      // Le franchissement passe par la fenêtre du module, non par celle du socle.
      r.accord.franchi = await cliquer('execProcValiderAccord', 1200);
      r.accord.confirme = await confirmer();
      r.accord.statutFinal = await statut();
      r.accord.etatFinal = etat();

      // ── 6. La ligne du lot hors plan rouvre son circuit ──
      //
      // Le groupe des activités hors plan vit sur la page des plans, et chacune
      // de ses lignes rouvre le promeneur sur **elle** — c'est le seul chemin
      // vers le circuit d'une activité qui n'est pas dans un plan. Le geste est
      // posé sur la ligne entière, derrière une garde : un clic sur un bouton
      // de la ligne ne l'ouvre pas.
      document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
      await attendre(3000);
      const ligne = [...document.querySelectorAll('[onclick*="execOpenActiviteProcessus"]')]
        .find((x) => (x.getAttribute('onclick') || '').includes(mienne.id));
      r.ligneDuLot = { trouvee: !!ligne };
      if (ligne) {
        ligne.click();
        await attendre(3200);
        const e = etat();
        r.ligneDuLot.rouvre = typeof EXEC_PROC !== 'undefined' && EXEC_PROC && EXEC_PROC.notif
          ? EXEC_PROC.notif.id === mienne.id : false;
        r.ligneDuLot.etape = e ? e.etape : null;
      }

      // ── 7. L'archivage du lot entier, d'un seul geste ──
      //
      // Il ne range pas une activité : il range **le lot** — toutes les
      // activités hors plan non archivées, en une écriture. C'était deux
      // écritures par activité, et un archivage de masse en laissait la moitié
      // rangée, l'autre non. La ronde le défait ensuite par la route, pour que
      // le jeu d'essai parte comme il est venu.
      document.querySelector('.nav-btn[data-page="plan_surveillance"]')?.click();
      await attendre(3000);
      r.archivage = { bouton: !!geste('execArchiverHorsPlan') };
      if (r.archivage.bouton) {
        r.archivage.lotAvant = (await notifs())
          .filter((n) => n.hors_plan && Number(n.archive) !== 1).length;
        geste('execArchiverHorsPlan').click();
        await attendre(1200);
        r.archivage.confirme = await confirmer();
        await attendre(2600);
        const apresArchivage = (await notifs()).find((n) => n.id === mienne.id) || {};
        r.archivage.mienneArchivee = Number(apresArchivage.archive) === 1;
        r.archivage.lotApres = (await notifs())
          .filter((n) => n.hors_plan && Number(n.archive) !== 1).length;
        // Défait par la route : le geste inverse n'existe pas sur cet écran.
        const rendu = await fetch(`${api}/activites-en-cours/hors-plan-archiver`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
          body: JSON.stringify({ archive: false }),
        });
        r.archivage.rendu = rendu.status;
        r.archivage.lotRendu = (await notifs())
          .filter((n) => n.hors_plan && Number(n.archive) !== 1).length;
      }

      // ── Le ménage, et la propriété qu'il a révélée ──
      //
      // Une notification **envoyée ne s'efface pas** : la suppression rend
      // **409**, mesuré. C'est juste — elle est partie chez l'organisme, et un
      // acte transmis ne se retire pas d'un trait.
      //
      // Elle **s'annule** : `cancel` la ramène à `brouillon`, et c'est de là
      // qu'elle peut être retirée. Le ménage de cette ronde est donc lui-même
      // un contrôle de la règle — *ce qui ne s'efface pas doit pouvoir se
      // défaire, et la différence se mesure.*
      const refus = await fetch(`${api}/notifications/${mienne.id}`, {
        method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
      });
      r.suppressionEnvoyee = refus.status;
      const annulation = await fetch(`${api}/notifications/${mienne.id}/cancel`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
        body: JSON.stringify({ motif: 'Annulation par la ronde.' }),
      });
      r.annulation = annulation.status;
      r.statutAnnulee = await statut();
      const suppr = await fetch(`${api}/notifications/${mienne.id}`, {
        method: 'DELETE', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' },
      });
      r.suppression = suppr.status;
      r.fin = (await notifs()).filter((n) => n.id === mienne.id).length;
      return r;
    }, M);

    verifier('la porte du circuit guidé est sur la page des plans, et son formulaire s’ouvre garni',
      circuit.porte === true && circuit.formulaire > 3000,
      JSON.stringify({ porte: circuit.porte, formulaire: circuit.formulaire }));
    verifier('les listes du formulaire se remplissent en cascade, et la ronde trouve un couple que les données peuplent',
      !!circuit.cascade && !!circuit.cascade.domaine
      && !!circuit.cascade.secteur && !!circuit.cascade.prestataire
      && circuit.cascade.essais > 0,
      JSON.stringify(circuit.cascade));
    verifier('l’activité hors plan crée sa notification en brouillon, et le serveur la porte',
      circuit.apres === circuit.avant + 1 && !!circuit.creee
      && circuit.creee.statut === 'brouillon'
      && /activité hors plan de la ronde/.test(circuit.creee.objet),
      JSON.stringify({ avant: circuit.avant, apres: circuit.apres, creee: circuit.creee,
        etat: circuit.etat }));
    // ── Le circuit **entier**, et non ses trois premiers paliers ──
    //
    // Ce contrôle disait « soumise, validée, transmise » : la ligne droite. Le
    // circuit en a deux de plus, et ce sont les retours — un rejet qui ramène
    // au brouillon, un renvoi en correction qui l'y ramène encore. Il les dit
    // désormais tous, dans l'ordre, et chaque palier est celui que **le
    // serveur** porte, non celui que l'écran affiche.
    //
    // Le dernier statut de la ligne droite est **`envoye`**, et non
    // « transmis » : je l'avais supposé par analogie avec le rapport, qui dit
    // « transmis ». Mesuré.
    verifier('la notification parcourt son circuit entier par ses gestes, retours compris, et chaque palier est celui que le serveur porte',
      circuit.soumise === true && circuit.statutSoumise === 'soumis'
      && circuit.rejet.statut === 'brouillon'
      && circuit.resoumise === true && circuit.statutResoumise === 'soumis'
      && circuit.revalidee === true && circuit.statutRevalidee === 'valide'
      && circuit.renvoi.statut === 'brouillon'
      && circuit.resoumise2 === true && circuit.revalidee2 === true
      && circuit.transmise === true && circuit.statutTransmise === 'envoye'
      && circuit.accord.statutFinal === 'acte',
      JSON.stringify({ soumise: [circuit.soumise, circuit.statutSoumise],
        rejet: circuit.rejet.statut,
        resoumise: [circuit.resoumise, circuit.statutResoumise],
        revalidee: [circuit.revalidee, circuit.statutRevalidee],
        renvoi: circuit.renvoi.statut,
        reprise: [circuit.resoumise2, circuit.revalidee2],
        transmise: [circuit.transmise, circuit.statutTransmise],
        accord: circuit.accord.statutFinal }));

    verifier('« Modifier » rouvre la saisie d’un brouillon : le geste pose la sous-étape et autorise l’édition, et rien d’autre',
      circuit.declencher.clique === true
      && /Modifier/i.test(circuit.declencher.libelle)
      && circuit.declencher.etat
      && circuit.declencher.etat.sous === 'soumission'
      && circuit.declencher.etat.edition === true,
      JSON.stringify(circuit.declencher));

    verifier('la bascule d’édition n’existe qu’à la validation, change d’état et de libellé, et se rend',
      circuit.bascule.clique === true
      && circuit.bascule.etatAvant.sous === 'validation'
      && circuit.bascule.etatAvant.edition === false
      && circuit.bascule.etatApres.edition === true
      && circuit.bascule.etatRendu.edition === false
      && circuit.bascule.libelleAvant !== circuit.bascule.libelleApres
      && /Autoriser/i.test(circuit.bascule.libelleAvant)
      && /lecture seule/i.test(circuit.bascule.libelleApres),
      JSON.stringify(circuit.bascule));

    verifier('le rejet renvoie la notification à son initiateur avec le motif saisi, et le serveur le porte',
      circuit.rejet.champ === true && circuit.rejet.clique === true
      && circuit.rejet.statut === 'brouillon'
      && /motif de rejet de la ronde/.test(circuit.rejet.motifEnBase),
      JSON.stringify(circuit.rejet));

    verifier('une notification validée repart en correction par la boîte du socle, non par celle du navigateur',
      circuit.renvoi.bouton === true
      && circuit.renvoi.etat.sous === 'transmission'
      && circuit.renvoi.boiteDuSocle === true
      && circuit.renvoi.statut === 'brouillon'
      && circuit.statutResoumise === 'soumis' && circuit.statutRevalidee === 'valide',
      JSON.stringify({ renvoi: circuit.renvoi, resoumise: circuit.statutResoumise,
        revalidee: circuit.statutRevalidee }));

    verifier('cocher une sous-activité entraîne tous ses thèmes, et un thème coché tient sa sous-activité tant qu’il en reste un',
      circuit.portee.sousActivites > 0 && circuit.portee.themes > 0
      && circuit.portee.tousCoches === true
      && (circuit.portee.themes > 1 ? circuit.portee.saTenue === true : true)
      && circuit.portee.saLachee === true
      && circuit.portee.rendue === true,
      JSON.stringify(circuit.portee));

    verifier('la ligne du lot hors plan rouvre le circuit sur son activité',
      circuit.ligneDuLot.trouvee === true && circuit.ligneDuLot.rouvre === true,
      JSON.stringify(circuit.ligneDuLot));

    verifier('l’archivage range le lot hors plan entier d’un seul geste, et rien n’y échappe',
      circuit.archivage.bouton === true && circuit.archivage.confirme === true
      && circuit.archivage.lotAvant > 0
      && circuit.archivage.mienneArchivee === true
      && circuit.archivage.lotApres === 0
      && circuit.archivage.rendu === 200
      && circuit.archivage.lotRendu === circuit.archivage.lotAvant,
      JSON.stringify(circuit.archivage));

    verifier('« Enregistrer » l’accord écrit les dates et le périmètre sans franchir l’étape, et « Confirmer » les franchit',
      circuit.accord.champs === true
      && circuit.accord.enregistre === true
      && circuit.accord.apresEnregistrement.statut === 'envoye'
      && circuit.accord.apresEnregistrement.debut === '2026-11-09'
      && circuit.accord.apresEnregistrement.fin === '2026-11-11'
      && /périmètre validé par la ronde/.test(circuit.accord.apresEnregistrement.perimetre)
      && circuit.accord.franchi === true && circuit.accord.confirme === true
      && circuit.accord.statutFinal === 'acte',
      JSON.stringify(circuit.accord));
    verifier('une notification envoyée refuse d’être effacée, s’annule, et se retire alors',
      circuit.suppressionEnvoyee === 409
      && circuit.annulation === 200 && circuit.statutAnnulee === 'brouillon'
      && circuit.suppression === 200 && circuit.fin === 0,
      JSON.stringify({ refusEnvoyee: circuit.suppressionEnvoyee, annulation: circuit.annulation,
        apresAnnulation: circuit.statutAnnulee, suppression: circuit.suppression,
        reste: circuit.fin }));
  },
  });
};
