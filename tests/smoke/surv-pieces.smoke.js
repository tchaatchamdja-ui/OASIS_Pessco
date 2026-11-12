// Fumée — SURV : les pièces du dossier, l'intitulé du rapport, et le courriel
// qui part. Écran « Exécution de la Surveillance », dans un navigateur.
//
// ── Pourquoi une suite à part ──
//
// `surv.smoke.js` portait 8 726 lignes, et son découpage était nommé dans l'ADR
// depuis trois tours. Cette ronde en est le premier morceau détaché, et c'est
// celui qui s'y prêtait le mieux : elle **bâtit sa propre chaîne** par l'API,
// elle l'efface en partant, et elle ne lit aucun état qu'une autre ronde aurait
// laissé. Les autres s'enchaînent — le dossier, son plan d'actions, son rapport
// —, et les séparer demandera de leur donner chacune sa chaîne.
//
// La mise en place est commune aux deux suites et vit dans `surv-socle.js` :
// couper le fichier sans l'extraire aurait fait deux copies de cent dix lignes,
// qui auraient divergé.
//
// ── Ce qu'elle éprouve ──
//
// Les dix-huit occurrences que `exec-activites.js` laissait (n° 5.f.81) : les
// quatre dépôts de pièces du volet — et les annexes **deux fois**, sur un bloc
// fabriqué par le geste puis sur un bloc rendu par le serveur, qui ne sont pas
// la même ligne du fichier —, les deux bornes de dates de la réalisation avec
// le refus que l'enregistrement prononce quand le clavier les franchit,
// l'intitulé « AUTRE » qui nomme le document produit, les trois gestes de la
// table des constatations, l'amendement d'un rapport validé, et la
// **transmission par courriel** de bout en bout — relue dans le sas SMTP que le
// socle lève.
const { verifier } = require('./harness');
const { surSURV, M } = require('./surv-socle');

module.exports = async function survPiecesSmoke(port) {
  return surSURV({
    port,
    nom: 'SURV (pièces)',
    titre: 'SURV : les pièces du dossier, l’intitulé du rapport, et le courriel',
    // ── Le refus que cette ronde provoque exprès ──
    refus: [
      {
        code: 400, methode: 'POST', chemin: /\/upload$/,
        pourquoi: 'la ronde des pièces verse un fichier d’un type que la route'
          + ' refuse : le 400 est la propriété mesurée, non l’incident. Éprouvé'
          + ' par « un type de fichier que la route refuse ne paraît pas dans la'
          + ' liste, et le refus est dit » (n° 5.f.81).',
      },
    ],
    messages: [
      {
        motif: /Upload PJ error: Error: Type de fichier non autoris/,
        pourquoi: 'la ronde des pièces verse un fichier d’un type que la route'
          + ' refuse, pour éprouver que le refus **se dit** au lieu d’être avalé.'
          + ' Éprouvé par « un type de fichier que la route refuse ne paraît pas'
          + ' dans la liste, et le refus est dit » (n° 5.f.81).',
      },
    ],
    rondes: async ({ page, sas, jalon }) => {
    // ══════════════════════════════════════════════════════════════════
    //  Le versement des pièces, l'intitulé du rapport, et le courriel
    //  qui part — `exec-activites.js` (ADR-003, 5.f.81)
    // ══════════════════════════════════════════════════════════════════
    //
    // Le relevé donnait `exec-activites.js` à **52 gestes exercés sur 70**, et
    // les dix-huit restants n'étaient pas du décor : les quatre dépôts de
    // pièces du volet, les deux bornes de dates de la réalisation, l'intitulé
    // du rapport, les gestes de la table des constatations, l'amendement, et la
    // transmission du rapport par courriel.
    //
    // ── Ce que la mesure a trouvé avant qu'une assertion soit écrite ──
    //
    //   1. **Toute pièce versée s'appelait `piece-jointe`.** La route nomme ce
    //      qu'elle reçoit d'après le champ `nom` du formulaire — « le nom
    //      d'origine ne ressort pas : c'est l'intitulé qui nomme la pièce » — et
    //      quatre des huit dépôts du module ne l'envoyaient pas. Trois PDF
    //      versés dans les annexes d'un rapport donnaient trois
    //      `piece-jointe.pdf`, indiscernables dans le rapport **et dans le
    //      courriel qui les annonce à l'organisme** ;
    //   2. **un type de fichier refusé ne disait rien.** Hors de ses huit
    //      extensions la route répond 400 « Type de fichier non autorisé », et
    //      le socle traduit déjà cette phrase. Cinq dépôts lisaient
    //      `data.status === 'ok'` et se taisaient sinon : rien ne paraissait, et
    //      rien n'était dit ;
    //   3. **l'onglet « Rapports » du volet n'était affichable par rien**, et le
    //      bouton qu'il portait envoyait le rapport à l'organisme **sans
    //      confirmation ni message** — jumeau sans cérémonie de
    //      `execSendRapportValidated`. Retirés tous les deux, et un garde de
    //      forme tient la porte fermée ;
    //   4. **une constatation déjà opposable se « modifiait » sans rien
    //      changer.** Huit champs engagent l'organisme dès la notification et ne
    //      se touchent plus que par l'ajustement ; la route les écartait **en
    //      silence** et répondait « ok ». Le cas ne se présente qu'au compte
    //      d'administration, seul à garder le crayon sur une telle
    //      constatation : il changeait la description, lisait « Constatation
    //      modifiée », et rien n'avait bougé.
    //
    // ── Et la pièce qui manquait pour mesurer la transmission ──
    //
    // Transmettre un rapport **envoie un courriel**. Le jeu d'essai pointe la
    // messagerie sur le Mailpit d'un poste de développement, où rien n'écoute :
    // la route rendait 502, et deux rondes portaient une note expliquant
    // pourquoi elles n'allaient pas plus loin. Un sas SMTP de cent lignes
    // (`messagerie-essai.js`) lève la limite, et rend mesurable ce qu'aucun
    // contrôle ne tenait : **le message ne porte aucune pièce jointe**, il
    // annonce des liens — ce que l'écran promet en toutes lettres.
    jalon('pièces, intitulé, transmission');
    {
      // 1. La chaîne, par l'API. Ce tour n'éprouve pas le circuit — il est
      //    éprouvé deux fois plus haut : il éprouve ce que le volet d'un dossier
      //    fait des pièces, de l'intitulé et du rapport.
      const socle = await page.evaluate(async (api) => {
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
        const r = {};
        // L'activité se choisit dans `plans-valides/:id/activites`, qui les rend
        // toutes : `plans-valides` écarte celles qu'une notification porte déjà,
        // et les deux rondes précédentes en ont porté. Une seconde notification
        // sur une activité déjà notifiée est permise, et c'est mesuré.
        // `GET …/plans` **n'existe pas** : un premier passage l'appelait en
        // secours, et son 404 salissait le relevé d'incidents — un incident
        // fabriqué par la ronde, sur une route imaginaire.
        const candidats = (await J(`${api}/plans-valides`)).corps || [];
        let plan = null; let act = null;
        for (const p of candidats) {
          /* eslint-disable no-await-in-loop */
          const toutes = (await J(`${api}/plans-valides/${p.id}/activites`)).corps || [];
          if (toutes.length) { plan = p; [act] = toutes; break; }
        }
        if (!act) return { activite: false, plans: candidats.length };
        r.activite = true;
        const n = await J(`${api}/notifications`, 'POST', {
          activite_id: act.id, plan_id: plan.id, prestataire_id: act.prestataire_id,
          objet: 'SURV 0.d — ronde des pièces et de la transmission',
          type_supervision: 'Audit',
          date_debut_prevue: '2026-09-01', date_fin_prevue: '2026-09-03',
          lieu: 'Siège', perimetre: 'Ensemble des processus',
          interlocuteur_email: 'interlocuteur@organisme.test',
          interlocuteur_nom: 'Point focal de l’organisme',
        });
        r.notif = n.statut;
        r.notifId = (n.corps || {}).id;
        r.planId = plan.id;
        r.activiteId = act.id;
        if (!r.notifId) return r;
        for (const e of ['submit', 'validate', 'send']) {
          await J(`${api}/notifications/${r.notifId}/${e}`, 'PUT');
        }
        const accord = await J(`${api}/notifications/${r.notifId}/validate-accord`, 'PUT',
          { date_debut_effective: '2026-09-01', date_fin_effective: '2026-09-03' });
        r.dossierId = (accord.corps || {}).dossier_id;
        if (!r.dossierId) return r;
        const c = await J(`${api}/constatations`, 'POST', {
          dossier_id: r.dossierId, domaine_id: 'AIR', criticite: 'majeur',
          titre: 'SURV 0.d — écart de la ronde des pièces',
          description: 'SURV 0.d — écart porté par la ronde des pièces.',
          delai_solde: '30', date_due_cloture: '2026-12-20',
        });
        r.fncId = (c.corps || {}).id;
        // Le client doit voir ce que l'API vient d'écrire : sans cela la page
        // des constatations ne porte pas la ligne que la ronde va cliquer.
        await execRefreshDynamic();
        return r;
      }, M);
      verifier('la chaîne de la ronde des pièces se bâtit, dossier et constatation compris',
        socle.activite === true && socle.notif === 201
        && !!socle.notifId && !!socle.dossierId && !!socle.fncId,
        JSON.stringify(socle));

      if (socle.fncId && socle.dossierId) {
        // 2. Le volet, à l'étape Réalisation : les dates, puis les pièces.
        const realisation = await page.evaluate(async (ctx) => {
          const { api, fncId } = ctx;
          const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
          const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
          const verser = async (entree, nom, type) => {
            if (!entree) return false;
            const dt = new DataTransfer();
            dt.items.add(new File([pdf], nom, { type }));
            entree.files = dt.files;
            entree.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(3000);
            return true;
          };
          // ── Les annonces se **recueillent**, elles ne se relisent pas ──
          //
          // Un bandeau se retire de lui-même au bout de quatre secondes, et
          // cette ronde attend parfois quatorze secondes qu'un PDF se rende.
          // Lire le DOM après coup mesurerait la durée d'affichage, non ce qui a
          // été dit. On enveloppe donc l'annonceur du socle, et l'on garde ce
          // qui passe.
          const dits = [];
          const vraiToast = window.oasisToast;
          window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
          const dernierDit = () => (dits.length ? dits[dits.length - 1] : '');
          const poser = (id, v) => {
            const e = document.getElementById(id);
            if (!e) return false;
            e.value = v;
            e.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          };
          const r = {};

          // La porte du volet : la ligne de la constatation, sous
          // « En Préparation » de la page Constatations.
          document.querySelector('.nav-btn[data-page="constatations"]')?.click();
          await attendre(2400);
          const prep = [...document.querySelectorAll('.exec-tab')]
            .find((b) => /currentConstSub='list'/.test(b.getAttribute('onclick') || ''));
          if (prep) { prep.click(); await attendre(2000); }
          // ── La ligne se désigne par l'identifiant, non par un texte ──
          //
          // Premier passage : cherchée par « SURV 0.d » dans le texte de la
          // ligne, elle n'a pas été trouvée. La colonne de la table affiche la
          // **description** de la constatation, non son titre — et le marqueur
          // était dans le titre. Le geste, lui, porte l'identifiant du dossier :
          // c'est la seule désignation qui ne dépende pas de ce qu'une colonne
          // choisit de montrer.
          const vers = document.querySelector(
            `[onclick^="execOpenDossierSlider"][onclick*="${ctx.dossierId}"]`,
          );
          r.porte = !!vers;
          if (!vers) return r;
          vers.click();
          await attendre(3600);
          r.etapeOuverte = !!document.getElementById('realisation_date_debut');
          if (!r.etapeOuverte) return r;

          // ── Les deux bornes de dates ──
          //
          // `oasisDatesBorner` est posé sur les deux champs. Son effet visible
          // est la borne basse de la date de fin : le calendrier de la fin ne
          // remonte pas avant le début saisi.
          const avantDates = await (await fetch(`${api}/dossiers/${ctx.dossierId}`,
            { credentials: 'same-origin' })).json();
          r.finAvant = String(avantDates.realisation_date_fin || '');
          poser('realisation_date_debut', '2026-09-02');
          await attendre(500);
          r.borneFin = (document.getElementById('realisation_date_fin') || {}).min || '';
          // Au clavier, la borne se franchit : c'est l'enregistrement qui
          // refuse, et il doit le dire.
          poser('realisation_date_fin', '2026-08-30');
          await attendre(500);
          r.borneApresFin = (document.getElementById('realisation_date_fin') || {}).min || '';
          document.querySelector('#execSlider [onclick^="execSaveRealisation"]')?.click();
          await attendre(1800);
          r.refusDesDates = dernierDit();
          r.champsMarques = document.querySelectorAll(
            '#realisation_date_debut.oasis-champ-invalide, #realisation_date_fin.oasis-champ-invalide',
          ).length;
          const apresRefus = await (await fetch(`${api}/dossiers/${ctx.dossierId}`,
            { credentials: 'same-origin' })).json();
          r.finApresRefus = String(apresRefus.realisation_date_fin || '');
          // Non écrite, c'est-à-dire **inchangée** : le dossier peut déjà porter
          // une date de fin, et comparer à « vide » éprouverait les fixtures.
          r.finNonEcrite = r.finApresRefus === r.finAvant;

          // Corrigée, elle passe.
          poser('realisation_date_fin', '2026-09-04');
          await attendre(500);

          // ── Le dépôt d'une pièce : son nom, puis son refus ──
          document.querySelector('#execSlider [onclick*="realisation_pj_input"]')?.click();
          await attendre(400);
          r.entreePj = await verser(document.getElementById('realisation_pj_input'),
            'piece-de-la-realisation.pdf', 'application/pdf');
          r.piecesNommees = [...document.querySelectorAll('#realisation_pj_list .realisation-pj-item')]
            .map((e) => e.dataset.orig || '');
          // Un type que la route n'accepte pas : rien ne paraît, et le refus
          // **se dit**. C'est le contre-essai du défaut n° 2.
          const avantRefus = document.querySelectorAll('#realisation_pj_list .realisation-pj-item').length;
          await verser(document.getElementById('realisation_pj_input'),
            'notes-de-terrain.txt', 'text/plain');
          r.apresTypeRefuse = document.querySelectorAll('#realisation_pj_list .realisation-pj-item').length;
          r.piecesInchangees = r.apresTypeRefuse === avantRefus;
          r.refusDuType = dernierDit();

          document.querySelector('#execSlider [onclick^="execSaveRealisation"]')?.click();
          await attendre(3000);
          const enregistre = await (await fetch(`${api}/dossiers/${ctx.dossierId}`,
            { credentials: 'same-origin' })).json();
          r.datesEcrites = [String(enregistre.realisation_date_debut || '').slice(0, 10),
            String(enregistre.realisation_date_fin || '').slice(0, 10)];
          const lire = (v) => {
            if (Array.isArray(v)) return v;
            try { return JSON.parse(v || '[]'); } catch { return []; }
          };
          r.pjEnBase = lire(enregistre.realisation_pieces_jointes)
            .map((p) => `${p.filename || ''}|${(p.path || '').slice(0, 32)}`);
          r.fnc = fncId;
          window.oasisToast = vraiToast;
          return r;
        }, { api: M, dossierId: socle.dossierId, fncId: socle.fncId });

        verifier('la date de fin de la réalisation est bornée par celle de début, et les deux bornes tiennent',
          realisation.porte === true && realisation.etapeOuverte === true
          && realisation.borneFin === '2026-09-02' && realisation.borneApresFin === '2026-09-02',
          JSON.stringify({ porte: realisation.porte, ouverte: realisation.etapeOuverte,
            borne: realisation.borneFin, apres: realisation.borneApresFin }));

        verifier('une fin antérieure au début, saisie au clavier, est refusée à l’enregistrement — dite, marquée, et non écrite',
          /post[ée]rieure|after|posterior/i.test(realisation.refusDesDates || '')
          && realisation.champsMarques === 2
          && realisation.finNonEcrite === true
          && realisation.finApresRefus !== '2026-08-30',
          JSON.stringify({ dit: realisation.refusDesDates, marques: realisation.champsMarques,
            avant: realisation.finAvant, apres: realisation.finApresRefus }));

        verifier('la pièce versée dans la réalisation garde le nom du fichier choisi, et le serveur le porte',
          realisation.entreePj === true
          && (realisation.piecesNommees || []).includes('piece-de-la-realisation.pdf')
          && (realisation.pjEnBase || []).some((x) => x.startsWith('piece-de-la-realisation.pdf|/api/m/execution/uploads/'))
          && (realisation.datesEcrites || []).join('→') === '2026-09-02→2026-09-04',
          JSON.stringify({ pieces: realisation.piecesNommees, enBase: realisation.pjEnBase,
            dates: realisation.datesEcrites }));

        verifier('un type de fichier que la route refuse ne paraît pas dans la liste, et le refus est dit',
          realisation.piecesInchangees === true
          && /non autoris|not allowed|não autorizado/i.test(realisation.refusDuType || ''),
          JSON.stringify({ inchangees: realisation.piecesInchangees, dit: realisation.refusDuType }));

        // 3. L'étape Rédaction : l'intitulé, les deux autres dépôts, la table
        //    des constatations, et les annexes.
        const redaction = await page.evaluate(async (ctx) => {
          const { api, dossierId, fncId } = ctx;
          const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
          const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
          const verser = async (entree, nom) => {
            if (!entree) return false;
            const dt = new DataTransfer();
            dt.items.add(new File([pdf], nom, { type: 'application/pdf' }));
            entree.files = dt.files;
            entree.dispatchEvent(new Event('change', { bubbles: true }));
            await attendre(3000);
            return true;
          };
          const env = async (u, m, b) => {
            const rep = await fetch(u, {
              method: m, credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
              ...(b ? { body: JSON.stringify(b) } : {}),
            });
            return rep.status;
          };
          const r = {};

          // Le terrain clos par l'API — son geste est éprouvé dans la ronde du
          // cycle —, et le volet rouvert à la rédaction.
          r.cloture = await env(`${api}/dossiers/${dossierId}/close-realisation`, 'PUT');
          document.querySelector('[onclick^="execCloseSlider"]')?.click();
          await attendre(1200);
          await execRefreshDynamic();
          await attendre(800);
          const vers = document.querySelector(
            `[onclick^="execOpenDossierSlider"][onclick*="${dossierId}"]`,
          );
          r.rouvert = !!vers;
          if (vers) { vers.click(); await attendre(3600); }
          r.surRedaction = !!document.getElementById('dossier_type_rapport');
          if (!r.surRedaction) return r;

          // ── L'intitulé du rapport ──
          //
          // « AUTRE » ouvre le champ libre ; le choix nomme le document produit,
          // et c'est lui que l'objet du courriel de transmission reprend.
          const sel = document.getElementById('dossier_type_rapport');
          r.libreCacheAvant = (document.getElementById('dossier_type_rapport_autre_group') || {})
            .style.display === 'none';
          sel.value = 'AUTRE';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          await attendre(600);
          r.libreOuvert = (document.getElementById('dossier_type_rapport_autre_group') || {})
            .style.display === '';
          const libre = document.getElementById('dossier_type_rapport_autre');
          r.intitule = 'RAPPORT DE LA RONDE DES PIÈCES';
          if (libre) { libre.value = r.intitule; libre.dispatchEvent(new Event('input', { bubbles: true })); }

          // ── Section C : la pièce de l'activité enregistrée depuis la
          //    rédaction, et la zone de dépôt des autres documents ──
          document.querySelector('#execSlider [onclick*="realisation_pj_input"]')?.click();
          await attendre(400);
          r.entreeRedac = await verser(document.getElementById('realisation_pj_input'),
            'piece-de-la-redaction.pdf');
          document.querySelector('#execSlider [onclick^="execSaveRedactionPj"]')?.click();
          await attendre(3200);
          r.entreeAutres = await verser(document.getElementById('dossier_checklist_input'),
            'autre-document.pdf');
          r.autresNommes = [...document.querySelectorAll('#dossier_checklists_list div[data-path]')]
            .map((e) => (e.querySelector('span') || {}).textContent || '');

          // ── Section D : les gestes de la table des constatations ──
          const replier = document.querySelector(`#fiches_btn_${fncId}`);
          r.gesteFiches = !!replier;
          r.fichesAvant = (document.getElementById(`fiches_row_${fncId}`) || {}).style?.display || '';
          if (replier) { replier.click(); await attendre(700); }
          r.fichesApres = (document.getElementById(`fiches_row_${fncId}`) || {}).style?.display || '';
          if (replier) { replier.click(); await attendre(500); }

          const modifier = document.querySelector(`#execSlider [onclick^="execEditFNC"][onclick*="${fncId}"]`);
          r.gesteModifier = !!modifier;
          if (modifier) {
            modifier.click();
            await attendre(3000);
            r.tiroirModifie = {
              ouvert: !!document.getElementById('execFncTiroir'),
              description: (document.getElementById('fnc_description') || {}).value || '',
            };
            window.execFermerFncTiroir?.();
            await attendre(700);
          }
          const ajouter = document.querySelector('#execSlider [onclick^="execOpenFNCForm"]');
          r.gesteAjouter = !!ajouter;
          if (ajouter) {
            ajouter.click();
            await attendre(2600);
            r.tiroirNeuf = {
              ouvert: !!document.getElementById('execFncTiroir'),
              description: (document.getElementById('fnc_description') || {}).value || '',
            };
            window.execFermerFncTiroir?.();
            await attendre(700);
          }

          // ── Section F : l'annexe, sur un bloc neuf puis sur un bloc rendu ──
          document.querySelector('#execSlider [onclick^="execAddAnnexeBlock"]')?.click();
          await attendre(800);
          const bloc = [...document.querySelectorAll('.dossier-annexe-item')].pop();
          const titre = bloc && bloc.querySelector('.annexe-intitule');
          if (titre) {
            titre.value = 'Annexe de la ronde des pièces';
            titre.dispatchEvent(new Event('input', { bubbles: true }));
          }
          r.entreeAnnexeNeuve = await verser(bloc && bloc.querySelector('input[type="file"]'),
            'annexe-du-bloc-neuf.pdf');
          r.annexeNeuveNommee = bloc
            ? [...bloc.querySelectorAll('.annexe-files [data-filename]')].map((e) => e.dataset.filename)
            : [];
          document.querySelector('#execSlider [onclick^="execSaveDossier"]')?.click();
          await attendre(3200);

          // ── La seconde occurrence du geste, et pourquoi il faut redessiner ──
          //
          // `execSaveDossier` ne redessine pas le volet : le bloc d'annexe resté
          // au DOM est **celui qu'`execAddAnnexeBlock` a fabriqué**, avec son
          // sélecteur. Verser une seconde pièce dessus exercerait deux fois la
          // même ligne. Le volet est donc rouvert, et c'est le serveur qui rend
          // l'annexe — avec son propre sélecteur, à l'autre ligne du fichier.
          await execOpenDossierSlider(dossierId, 'annexes');
          await attendre(3600);
          const rendu = [...document.querySelectorAll('.dossier-annexe-item')]
            .find((b) => (b.querySelector('.annexe-intitule') || {}).value === 'Annexe de la ronde des pièces');
          r.annexeRendue = !!rendu;
          r.entreeAnnexeRendue = await verser(rendu && rendu.querySelector('input[type="file"]'),
            'annexe-du-bloc-rendu.pdf');
          r.annexeRendueNommee = rendu
            ? [...rendu.querySelectorAll('.annexe-files [data-filename]')].map((e) => e.dataset.filename)
            : [];
          document.querySelector('#execSlider [onclick^="execSaveDossier"]')?.click();
          await attendre(3200);

          const d = await (await fetch(`${api}/dossiers/${dossierId}`, { credentials: 'same-origin' })).json();
          const lire = (v) => {
            if (Array.isArray(v)) return v;
            try { return JSON.parse(v || '[]'); } catch { return []; }
          };
          r.enBase = {
            type: d.type_rapport || '', libre: d.type_rapport_autre || '',
            pieces: lire(d.realisation_pieces_jointes).map((p) => p.filename || ''),
            autres: (d.checklists || []).map((c) => c.filename || c),
            annexes: (d.annexes || []).map((a) => ({
              intitule: (a && a.intitule) || '',
              fichiers: ((a && a.files) || []).map((f) => f.filename || f),
            })),
          };
          return r;
        }, { api: M, dossierId: socle.dossierId, fncId: socle.fncId });

        verifier('« AUTRE » ouvre le champ de l’intitulé du rapport, et le serveur porte les deux',
          redaction.cloture === 200 && redaction.rouvert === true && redaction.surRedaction === true
          && redaction.libreCacheAvant === true && redaction.libreOuvert === true
          && !!redaction.enBase && redaction.enBase.type === 'AUTRE'
          && redaction.enBase.libre === redaction.intitule,
          JSON.stringify({ cacheAvant: redaction.libreCacheAvant, ouvert: redaction.libreOuvert,
            surRedaction: redaction.surRedaction, enBase: redaction.enBase }));

        verifier('la pièce de l’activité s’enregistre depuis la rédaction, et la zone « autres documents » verse sous le nom du fichier',
          redaction.entreeRedac === true && redaction.entreeAutres === true
          && (redaction.autresNommes || []).includes('autre-document.pdf')
          && !!redaction.enBase
          && (redaction.enBase.pieces || []).includes('piece-de-la-redaction.pdf')
          && (redaction.enBase.pieces || []).includes('piece-de-la-realisation.pdf')
          && (redaction.enBase.autres || []).includes('autre-document.pdf'),
          JSON.stringify({ affiches: redaction.autresNommes, enBase: redaction.enBase }));

        verifier('la table des constatations déplie ses fiches, ouvre celle qui existe et le formulaire d’une neuve',
          redaction.gesteFiches === true
          // Replié c'est `none` ; déplié, c'est ce que le geste y pose — mesuré
          // `table-row`, et l'on éprouve l'effet, non la forme.
          && redaction.fichesAvant === 'none' && redaction.fichesApres !== 'none'
          && redaction.fichesApres !== ''
          && redaction.gesteModifier === true && !!redaction.tiroirModifie
          && redaction.tiroirModifie.ouvert === true
          && /ronde des pièces/.test(redaction.tiroirModifie.description || '')
          && redaction.gesteAjouter === true && !!redaction.tiroirNeuf
          && redaction.tiroirNeuf.ouvert === true && redaction.tiroirNeuf.description === '',
          JSON.stringify({ fiches: [redaction.fichesAvant, redaction.fichesApres],
            modifie: redaction.tiroirModifie, neuf: redaction.tiroirNeuf }));

        verifier('une pièce se verse sur une annexe neuve comme sur une annexe rendue par le serveur, sous son propre nom',
          redaction.entreeAnnexeNeuve === true && redaction.annexeRendue === true
          && redaction.entreeAnnexeRendue === true
          && (redaction.annexeNeuveNommee || []).includes('annexe-du-bloc-neuf.pdf')
          && (redaction.annexeRendueNommee || []).includes('annexe-du-bloc-rendu.pdf')
          && !!redaction.enBase
          && (redaction.enBase.annexes || []).some((a) => /ronde des pièces/.test(a.intitule)
            && a.fichiers.includes('annexe-du-bloc-neuf.pdf')
            && a.fichiers.includes('annexe-du-bloc-rendu.pdf')),
          JSON.stringify({ neuve: redaction.annexeNeuveNommee, rendue: redaction.annexeRendueNommee,
            enBase: redaction.enBase && redaction.enBase.annexes }));

        // 4. La constatation devenue opposable, et ce qu'« enregistrer » dit
        //    alors. C'est le contre-essai du défaut n° 4.
        const opposable = await page.evaluate(async (ctx) => {
          const { api, dossierId, fncId } = ctx;
          const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
          const env = async (u, m, b) => {
            const rep = await fetch(u, {
              method: m, credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
              ...(b ? { body: JSON.stringify(b) } : {}),
            });
            let c = null; try { c = await rep.json(); } catch { c = null; }
            return { statut: rep.status, corps: c };
          };
          // L'annonceur enveloppé : voir « Les annonces se recueillent » plus haut.
          const dits = [];
          const vraiToast = window.oasisToast;
          window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
          const r = {};
          const sou = await env(`${api}/dossiers/${dossierId}/submit`, 'PUT',
            { introduction: 'Rapport de la ronde des pièces.' });
          r.rapportId = (sou.corps || {}).rapport_id;
          r.validation = (await env(`${api}/rapports/${r.rapportId}/validate`, 'PUT', {})).statut;
          const avant = (await env(`${api}/constatations/${fncId}`)).corps || {};
          r.statutOpposable = avant.statut;
          r.descriptionAvant = avant.description || '';
          await execRefreshDynamic();
          await attendre(1000);

          // ── Le volet rouvert sur sa section D, par appel et non par clic ──
          //
          // `execOpenDossierSlider` est exercé par trois clics ailleurs dans
          // cette suite ; ici il n'est pas la cible, et sa porte naturelle s'est
          // fermée — la constatation devenue opposable a quitté
          // « En Préparation », d'où la ronde l'ouvrait. Ce qu'on mesure est le
          // crayon et ce que l'enregistrement **dit** ensuite.
          document.querySelector('[onclick^="execCloseSlider"]')?.click();
          await attendre(1000);
          r.porte = typeof execOpenDossierSlider === 'function';
          if (!r.porte) return r;
          await execOpenDossierSlider(dossierId, 'constatations');
          await attendre(3600);
          const modifier = document.querySelector(`#execSlider [onclick^="execEditFNC"][onclick*="${fncId}"]`);
          r.crayonEncoreLa = !!modifier;
          r.oeilAussi = !!document.querySelector(`#execSlider [onclick^="execViewFNC"][onclick*="${fncId}"]`);
          if (!modifier) return r;
          modifier.click();
          await attendre(3000);
          const desc = document.getElementById('fnc_description');
          r.tiroir = !!desc;
          if (!desc) return r;
          r.descriptionTentee = 'Description réécrite après la validation du rapport.';
          desc.value = r.descriptionTentee;
          desc.dispatchEvent(new Event('input', { bubbles: true }));
          const grav = document.getElementById('fnc_gravite');
          if (grav) {
            const autre = [...grav.options].find((o) => o.value && o.value !== avant.criticite);
            if (autre) { grav.value = autre.value; grav.dispatchEvent(new Event('change', { bubbles: true })); }
            r.criticiteTentee = grav.value;
          }
          document.querySelector('#execFncTiroir [onclick^="execSaveFNC"]')?.click();
          await attendre(3400);
          r.dit = dits.length ? dits[dits.length - 1] : '';
          const apres = (await env(`${api}/constatations/${fncId}`)).corps || {};
          r.descriptionApres = apres.description || '';
          r.criticiteApres = apres.criticite || '';
          r.criticiteAvant = avant.criticite || '';
          window.execFermerFncTiroir?.();
          await attendre(800);
          window.oasisToast = vraiToast;
          return r;
        }, { api: M, dossierId: socle.dossierId, fncId: socle.fncId });

        verifier('le rapport validé rend la constatation opposable, et le crayon reste offert au compte qui gouverne le module',
          opposable.validation === 200 && opposable.statutOpposable === 'ouvert'
          && opposable.porte === true
          && opposable.crayonEncoreLa === true && opposable.oeilAussi === false,
          JSON.stringify({ validation: opposable.validation, statut: opposable.statutOpposable,
            crayon: opposable.crayonEncoreLa, oeil: opposable.oeilAussi }));

        verifier('enregistrer une constatation opposable ne dit plus « modifiée » : les champs engagés sont nommés, et rien n’a changé',
          opposable.tiroir === true
          && /ajustement|adjustment|ajustamento/i.test(opposable.dit || '')
          && /Description|Criticit/i.test(opposable.dit || '')
          && opposable.descriptionApres === opposable.descriptionAvant
          && opposable.criticiteApres === opposable.criticiteAvant,
          JSON.stringify({ dit: opposable.dit,
            description: [opposable.descriptionAvant, opposable.descriptionApres],
            criticite: [opposable.criticiteAvant, opposable.criticiteApres] }));

        // 5. L'amendement, puis la transmission par le circuit.
        const transmission = await page.evaluate(async (ctx) => {
          const { api, dossierId, fncId, planId, activiteId, rapportId } = ctx;
          const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
          const env = async (u, m, b) => {
            const rep = await fetch(u, {
              method: m, credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
              ...(b ? { body: JSON.stringify(b) } : {}),
            });
            let c = null; try { c = await rep.json(); } catch { c = null; }
            return { statut: rep.status, corps: c };
          };
          // L'annonceur enveloppé : la transmission attend quatorze secondes
          // qu'un PDF se rende, et le bandeau ne vit que quatre.
          const dits = [];
          const vraiToast = window.oasisToast;
          window.oasisToast = (m, t) => { dits.push(String(m == null ? '' : m)); return vraiToast(m, t); };
          const r = {};

          // ── L'amendement : un rapport validé repart en rédaction ──
          //
          // Le geste est au pied de l'étape « Validation » ; le volet est resté
          // ouvert sur la rédaction, et c'est le fil d'avancement qui l'y mène.
          document.querySelector('[onclick*="execSwitchDossierStep"][onclick*="validation"]')?.click();
          await attendre(2600);
          const amender = document.querySelector('#execSlider [onclick^="execAmendRapport"]');
          r.gesteAmender = !!amender;
          if (amender) {
            amender.click();
            await attendre(1000);
            const champ = document.querySelector('.oasis-saisie-champ');
            r.saisieDemandee = !!champ;
            if (champ) {
              champ.value = 'Reprendre la section Synthèse.';
              champ.dispatchEvent(new Event('input', { bubbles: true }));
              document.querySelector('.oasis-confirm-oui')?.click();
              await attendre(3800);
            }
          }
          const rapAmende = (await env(`${api}/rapports/${rapportId}`)).corps || {};
          r.apresAmendement = rapAmende.statut;
          r.observations = rapAmende.observations_validation || '';
          r.fncRedevenue = ((await env(`${api}/constatations/${fncId}`)).corps || {}).statut;

          // Resoumis et revalidé par l'API : ces deux gestes sont éprouvés
          // ailleurs, et ce bloc vise la transmission.
          const sou = await env(`${api}/dossiers/${dossierId}/submit`, 'PUT',
            { introduction: 'Rapport de la ronde des pièces, amendé.' });
          r.rapportFinal = (sou.corps || {}).rapport_id;
          r.revalidation = (await env(`${api}/rapports/${r.rapportFinal}/validate`, 'PUT', {})).statut;
          await execRefreshDynamic();
          await attendre(1200);

          // ── Le circuit, ouvert sur l'étape Transmission ──
          //
          // Le formulaire de courriel ne paraît que là : le volet du dossier ne
          // connaît que « Validation », et c'est le fil du processus qui
          // distingue les deux (`_execSurTransmission`). Sa porte est la ligne de
          // l'activité, sur la page des plans ; elle est cliquée par la ronde du
          // circuit hors plan, et appelée ici — ce bloc vise le formulaire de
          // courriel, non la façon d'y entrer.
          document.querySelector('[onclick^="execCloseSlider"]')?.click();
          await attendre(1000);
          if (typeof execOpenActiviteProcessus === 'function') {
            await execOpenActiviteProcessus(planId, activiteId);
            await attendre(4000);
          }
          // ── `EXEC_PROC` se lit par son nom, **jamais** par `window` ──
          //
          // C'est un `let` de premier niveau dans un script classique : il vit
          // dans la portée lexicale globale, et n'est **pas** une propriété de
          // `window`. Seul `EXEC_STATE` y est publié (`exec-adapters.js`).
          // `window.EXEC_PROC` rend donc `undefined` à tout instant — et la
          // ronde du circuit hors plan, plus haut, en avait tiré la conclusion
          // qu'« il n'est pas encore peuplé à cet instant ». La note était
          // fausse : il l'était, et c'est la lecture qui ne le voyait pas.
          r.etapeCircuit = (typeof EXEC_PROC !== 'undefined' && EXEC_PROC) ? EXEC_PROC.etape : null;
          r.courriel = !!document.getElementById('exec_courriel_transmission');
          if (!r.courriel) return r;
          const val = (id) => (document.getElementById(id) || {}).value || '';
          r.destinataire = val('courriel_destinataire');
          r.objet = val('courriel_objet');

          // ── L'aperçu du document, par le lien de la pièce ──
          //
          // Tant que le rapport n'est pas parti, son document n'existe pas au
          // serveur : le lien porte un `href="#"` et un
          // `event.preventDefault()`. Sans ce dernier le clic emporterait la
          // page sur l'ancre — c'est la propriété qu'on mesure, avec le
          // document que le repli compose.
          const lien = document.querySelector('#courriel_pieces .exec-piece-rapport a.exec-piece-nom');
          r.lienApercu = lien ? lien.getAttribute('href') : null;
          if (lien) {
            const recus = [];
            const vraiOpen = window.open;
            const avant = window.location.href;
            window.open = () => {
              const doc = { html: '' };
              recus.push(doc);
              return {
                document: { write: (h) => { doc.html += String(h || ''); }, close: () => {} },
                focus: () => {}, print: () => {}, close: () => {},
              };
            };
            try {
              lien.click();
              await attendre(3000);
            } finally { window.open = vraiOpen; }
            r.pageNonQuittee = window.location.href === avant;
            r.documents = recus.length;
            r.document = recus[0] ? {
              complet: /<!DOCTYPE html>/.test(recus[0].html) && /<\/html>/.test(recus[0].html),
              intitule: /RAPPORT DE LA RONDE DES PI/.test(recus[0].html),
              taille: recus[0].html.length,
            } : null;
          }

          // ── L'envoi ──
          const poser = (id, v) => {
            const e = document.getElementById(id);
            if (!e) return;
            e.value = v;
            e.dispatchEvent(new Event('input', { bubbles: true }));
          };
          poser('courriel_copie', 'copie@organisme.test');
          poser('courriel_copie_cachee', 'archives@anac.bj');
          document.querySelector('#courriel_envoyer')?.click();
          await attendre(14000);
          r.ditApresEnvoi = dits.length ? dits[dits.length - 1] : '';
          r.toutCeQuiFutDit = dits.slice(-4);
          const rap = (await env(`${api}/rapports/${r.rapportFinal}`)).corps || {};
          r.statutFinal = rap.statut;
          r.transmisA = rap.transmis_a || '';
          r.documentDepose = ((rap.document || {}).path || '');
          r.nomDepose = ((rap.document || {}).filename || '');
          window.oasisToast = vraiToast;
          return r;
        }, {
          api: M,
          dossierId: socle.dossierId,
          fncId: socle.fncId,
          planId: socle.planId,
          activiteId: socle.activiteId,
          rapportId: opposable.rapportId,
        });

        verifier('un rapport validé s’amende : il repart en rédaction avec le motif saisi, et sa constatation redevient inopposable',
          transmission.gesteAmender === true && transmission.saisieDemandee === true
          && transmission.apresAmendement === 'brouillon'
          && /Synthèse/.test(transmission.observations || '')
          && transmission.fncRedevenue === 'brouillon'
          && transmission.revalidation === 200,
          JSON.stringify({ geste: transmission.gesteAmender, saisie: transmission.saisieDemandee,
            rapport: transmission.apresAmendement, motif: transmission.observations,
            fnc: transmission.fncRedevenue }));

        verifier('le circuit s’ouvre à la Transmission, et le courriel y est composé d’avance — destinataire de la notification, objet portant l’intitulé choisi',
          transmission.etapeCircuit === 'transmission' && transmission.courriel === true
          && transmission.destinataire === 'interlocuteur@organisme.test'
          && /^RAPPORT DE LA RONDE DES PIÈCES /.test(transmission.objet || ''),
          JSON.stringify({ etape: transmission.etapeCircuit, courriel: transmission.courriel,
            destinataire: transmission.destinataire, objet: transmission.objet }));

        verifier('le lien de la pièce compose l’aperçu du rapport sans quitter la page',
          transmission.lienApercu === '#' && transmission.pageNonQuittee === true
          && transmission.documents === 1 && !!transmission.document
          && transmission.document.complet === true
          && transmission.document.intitule === true
          && transmission.document.taille > 2000,
          JSON.stringify({ href: transmission.lienApercu, restee: transmission.pageNonQuittee,
            documents: transmission.documents, doc: transmission.document }));

        verifier('le rapport part par son geste : le serveur le dit transmis, et retient à qui',
          /transmis|sent|transmitido/i.test(transmission.ditApresEnvoi || '')
          && transmission.statutFinal === 'transmis'
          && /interlocuteur@organisme\.test/.test(transmission.transmisA || '')
          && /^\/api\/m\/execution\/uploads\/.+\.pdf$/.test(transmission.documentDepose || '')
          && transmission.nomDepose.endsWith('.pdf'),
          JSON.stringify({ dit: transmission.ditApresEnvoi, tout: transmission.toutCeQuiFutDit,
            statut: transmission.statutFinal,
            a: transmission.transmisA, document: transmission.documentDepose,
            nom: transmission.nomDepose }));

        // ── Ce qui est parti, lu dans le sas ──
        //
        // Le relevé se fait **hors du navigateur** : le sas vit dans le
        // processus de la suite, et c'est là que les messages s'accumulent. Le
        // dernier est celui de la transmission ; les précédents sont les avis
        // que le circuit a envoyés en chemin.
        const partis = sas.recus;
        const remise = partis[partis.length - 1] || null;
        verifier('le courriel de transmission ne porte aucune pièce jointe : il annonce des liens, comme l’écran le promet',
          !!remise
          && /^text\/plain/.test(remise.entetes['content-type'] || '')
          && !/multipart/i.test(remise.entetes['content-type'] || '')
          && !/Content-Disposition:\s*attachment/i.test(remise.brut || '')
          // Et le corps est bien le message rédigé, non une enveloppe vide.
          && /Madame, Monsieur|Point focal/.test(remise.texte || ''),
          JSON.stringify({ messages: partis.length,
            type: remise && remise.entetes['content-type'],
            piece: !!remise && /attachment/i.test(remise.brut || '') }));

        verifier('et il annonce le document déposé, par un lien vers la route qui le sert, avec l’adresse de connexion',
          !!remise
          && remise.texte.includes('/api/m/execution/uploads/')
          && /Accès à l’application|Accès à l'application/.test(remise.texte)
          && /login\.html/.test(remise.texte),
          JSON.stringify({ texte: remise ? remise.texte.slice(-240) : null }));

        verifier('la copie cachée ne figure dans aucun en-tête du message, et pourtant elle est servie',
          !!remise
          && (remise.pour || []).includes('interlocuteur@organisme.test')
          && (remise.pour || []).includes('copie@organisme.test')
          && (remise.pour || []).includes('archives@anac.bj')
          && !/archives@anac\.bj/.test(JSON.stringify(remise.entetes)),
          JSON.stringify({ servis: remise && remise.pour,
            entetes: remise && { to: remise.entetes.to, cc: remise.entetes.cc, bcc: remise.entetes.bcc } }));

        // ── Le ménage : la troisième chaîne ne survit pas à la ronde ──
        const menage3 = await page.evaluate(async (ctx) => {
          const { api, fncId, dossierId, notifId } = ctx;
          const J = async (u, m) => {
            const rep = await fetch(u, {
              method: m || 'GET', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            });
            let c = null; try { c = await rep.json(); } catch { c = null; }
            return { statut: rep.status, corps: c };
          };
          const r = {};
          document.querySelector('[onclick^="execCloseSlider"], [onclick^="execProcRetour"]')?.click();
          await new Promise((x) => setTimeout(x, 1200));
          r.constatation = (await J(`${api}/constatations/${fncId}`, 'DELETE')).statut;
          r.dossier = (await J(`${api}/dossiers/${dossierId}`, 'DELETE')).statut;
          const notifs = (await J(`${api}/notifications`)).corps || [];
          if (notifs.some((n) => n.id === notifId)) {
            await J(`${api}/notifications/${notifId}/cancel`, 'PUT');
            r.notif = (await J(`${api}/notifications/${notifId}`, 'DELETE')).statut;
          }
          r.resteDossier = ((await J(`${api}/dossiers`)).corps || [])
            .filter((d) => d.id === dossierId).length;
          r.resteConstatation = ((await J(`${api}/constatations`)).corps || [])
            .filter((c) => c.id === fncId).length;
          r.resteNotif = ((await J(`${api}/notifications`)).corps || [])
            .filter((n) => n.id === notifId).length;
          // L'état du client suit le serveur : un ménage par l'API laisserait
          // sinon les blocs suivants cliquer des lignes mortes.
          await execRefreshDynamic();
          r.rapportsRendus = (EXEC_STATE.data.rapports || [])
            .filter((x) => x.dossier_id === dossierId).length;
          return r;
        }, { api: M, fncId: socle.fncId, dossierId: socle.dossierId, notifId: socle.notifId });

        verifier('la troisième chaîne ne survit pas à la ronde, rapport transmis compris',
          menage3.constatation === 200 && menage3.dossier === 200
          && menage3.resteDossier === 0 && menage3.resteConstatation === 0
          && menage3.resteNotif === 0 && menage3.rapportsRendus === 0,
          JSON.stringify(menage3));
      }
    }
    },
  });
};
