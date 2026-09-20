/* OASIS — Inspections d'aéronefs sur aire de trafic
 * Suite de ramp-app.js : l'aperçu et l'impression d'un rapport d'inspection, les exports, les volets et les modales.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

// ══════════════════════════════════════
//  Aperçu d'un rapport d'inspection
// ══════════════════════════════════════

// Le rapport reprend le formulaire officiel « Proof of Inspection » : mêmes
// blocs, mêmes intitulés, mêmes cases à cocher. Une inspection saisie en ligne
// le remplit entièrement ; une inspection reprise d'un classeur ne renseigne
// que ce que le classeur portait — le reste du formulaire reste vierge, comme
// sur le papier.

async function rampOuvrirApercu(id) {
    // L'inspection vient des données de l'instance ; ouverte depuis les écarts
    // régionaux, elle appartient à un autre État et c'est cet écran qui la
    // tient. Le rapport, lui, se lit quel que soit l'État qui l'a établi.
    RAMP_STATE.apercu = RAMP_STATE.data.inspections.find((i) => i.id === id)
        || (typeof rampComInspectionRegionale === 'function' ? rampComInspectionRegionale(id) : null)
        || null;
    RAMP_STATE.apercuPoi = null;
    rampRenderPage();
    const insp = RAMP_STATE.apercu;
    if (!insp) return;
    try {
        // Les items du programme et leurs groupes viennent du paramétrage ; la
        // fiche, elle, porte ce qui a été coché et constaté.
        if (!RAMP_STATE.poi.contexte) RAMP_STATE.poi.contexte = await rampApi('/poi/contexte');
        if (insp.poi_id) RAMP_STATE.apercuPoi = await rampApi(`/poi/${insp.poi_id}`);
    } catch (e) { /* le rapport se rend avec ce dont on dispose */ }
    if (RAMP_STATE.apercu === insp) rampRenderPage();
}

function rampFermerApercu() {
    RAMP_STATE.apercu = null;
    RAMP_STATE.apercuPoi = null;
    rampRenderPage();
}

// Les classes d'action du formulaire, de la plus contraignante à l'absence de
// constat. Les intitulés du paramétrage priment quand ils existent.
const RAMP_POI_CLASSES = [
    ['3d', 'Immediate operating ban'],
    ['3c', 'Aircraft grounded by (name of CA)'],
    ['3b', 'Corrective actions before flight required'],
    ['3a', 'Restriction on aircraft operation'],
    ['2', 'Information to Authority and operator'],
    ['1', 'Information to PIC / operator’s representative'],
    ['0', 'No findings'],
];

// Le module vit dans un cadre, et la page qui l'entoure impose ses hauteurs :
// imprimer depuis là donnait une première page tronquée. Le rapport part donc
// dans un document à lui, qui ne porte que la fiche et la feuille du module.
function rampImprimerRapport() {
    const fiche = document.querySelector('.poi-rapport');
    if (!fiche) { window.print(); return; }
    const ancien = document.getElementById('rampCadreImpression');
    if (ancien) ancien.remove();

    const cadre = document.createElement('iframe');
    cadre.id = 'rampCadreImpression';
    cadre.setAttribute('aria-hidden', 'true');
    cadre.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(cadre);

    const doc = cadre.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
        <title>Proof of Inspection</title>
        <link rel="stylesheet" href="/shared/css/oasis-module.css">
        <link rel="stylesheet" href="/modules/ramp/css/ramp-styles.css">
        <style>
            body { margin: 0; padding: 8mm; background: #fff; }
            /* À l'impression, ce sont les marges de la page qui comptent :
               le rembourrage d'écran ferait une double marge. */
            @media print { body { padding: 0; } }
            /* Hors média « print », l'aperçu doit déjà tenir la page : les
               règles d'impression du module s'appliquent aussi à l'écran. */
            .poi-rapport { max-width: none; width: 100%; font-size: 7.8pt; }
            .poi-table th, .poi-table td { padding: .08rem .2rem; font-size: 7.4pt; }
            .poi-champ { min-height: 0; padding: .15rem .3rem; }
            /* La page fait 794 px : sans cela, la grille basculerait sur sa
               disposition étroite alors que le formulaire tient en trois
               colonnes, comme le papier. */
            .poi-bande { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .poi-grille { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .poi-pied { grid-template-columns: 1fr 1fr 1fr; }
        </style></head>
        <body class="ramp-module">${fiche.outerHTML}</body></html>`);
    doc.close();

    const lancer = () => {
        try {
            cadre.contentWindow.focus();
            cadre.contentWindow.print();
        } catch (e) { window.print(); }
        setTimeout(() => cadre.remove(), 1000);
    };
    // Les deux feuilles doivent être là : sans elles, la fiche s'imprimerait nue.
    if (cadre.contentDocument.readyState === 'complete') setTimeout(lancer, 350);
    else cadre.onload = () => setTimeout(lancer, 350);
}

function rampRenderApercu() {
    const i = RAMP_STATE.apercu;
    if (!i) return '';
    const p = RAMP_STATE.apercuPoi || {};
    const e = p.entete || {};
    const ctx = RAMP_STATE.poi.contexte || { groupes: [], items: [], actions: [] };
    const ecarts = i.anomalies || [];

    // Ce qui a été contrôlé et constaté, item par item : la fiche quand on l'a,
    // les écarts du classeur sinon.
    const parItem = {};
    Object.entries(p.items || {}).forEach(([code, v]) => { parItem[code] = { ...v }; });
    ecarts.forEach((a) => {
        const code = a.itemCode || '';
        if (!parItem[code]) parItem[code] = { controle: true, remarque: '', ecart: null };
        if (!parItem[code].ecart) {
            parItem[code].ecart = {
                standard: a.stdRef || '', categorie: a.categorie || '',
                description: a.description || '', action: a.action || '',
            };
        }
    });

    const case_ = (coche, texte) => `<span class="poi-case">${coche ? '☒' : '☐'} ${_rEsc(texte)}</span>`;
    const val = (v) => (v ? _rEsc(v) : '<span class="poi-vide"></span>');
    const champ = (libelle, valeur, large) => `
        <div class="poi-champ${large ? ' large' : ''}">
            <i>${_rEsc(libelle)}</i><div>${val(valeur)}</div>
        </div>`;

    // Les items du programme, rangés sous leur groupe, comme au formulaire.
    const parGroupe = new Map((ctx.groupes || []).map((g) => [g.code, []]));
    const orphelins = [];
    (ctx.items || []).forEach((it) => {
        if (parGroupe.has(it.groupe)) parGroupe.get(it.groupe).push(it);
        else orphelins.push(it);
    });

    const ligneItem = (it) => {
        const v = parItem[it.code] || {};
        const c = v.ecart || {};
        return `<tr${c.categorie ? ' class="poi-ligne-ecart"' : ''}>
            <td class="poi-code">${_rEsc(it.code)}</td>
            <td>${_rEsc(it.label)}</td>
            <td class="poi-centre">${v.controle ? '☒' : '☐'}</td>
            <td>${_rEsc(v.remarque || '')}</td>
            <td class="poi-code">${c.categorie || c.description ? _rEsc(it.code) : ''}</td>
            <td class="poi-centre">${_rEsc(c.standard || '')}</td>
            <td class="poi-centre">${_rEsc(c.categorie || '')}</td>
            <td>${_rEsc(c.description || '')}</td>
        </tr>`;
    };
    // Les groupes sont repérés par une lettre, comme au formulaire : A, B, C…
    const lettre = (n) => String.fromCharCode(65 + n);
    const groupe = (g, liste, rang) => (liste.length ? `
        <tr class="poi-groupe"><td class="poi-code">${_rEsc(lettre(rang))}</td>
            <td colspan="7">${_rEsc(g.label)}</td></tr>
        ${liste.map(ligneItem).join('')}` : '');

    let rang = 0;
    let corpsItems = (ctx.groupes || []).map((g) => {
        const html = groupe(g, parGroupe.get(g.code) || [], rang);
        if (html) rang += 1;
        return html;
    }).join('');
    if (orphelins.length) corpsItems += groupe({ label: rt('rapport_autres_items') }, orphelins, rang);
    // Sans paramétrage chargé, on rend au moins les constats du classeur.
    if (!corpsItems) {
        corpsItems = ecarts.length ? ecarts.map((a) => `<tr class="poi-ligne-ecart">
            <td class="poi-code">${_rEsc(a.itemCode || '')}</td>
            <td>${_rEsc(rampLibelleItem(a.itemCode) || '')}</td>
            <td class="poi-centre">☒</td><td></td>
            <td class="poi-code">${_rEsc(a.itemCode || '')}</td>
            <td class="poi-centre">${_rEsc(a.stdRef || '')}</td>
            <td class="poi-centre">${_rEsc(a.categorie || '')}</td>
            <td>${_rEsc(a.description || '')}</td>
        </tr>`).join('')
            : `<tr><td colspan="8" class="ramp-table-vide">${rt('rapport_aucun_item')}</td></tr>`;
    }

    const classeRetenue = p.classe_action
        || (ecarts.map((a) => a.action).filter(Boolean).sort().reverse()[0] || '');
    const libelleClasse = (code, defaut) => {
        const trouve = (ctx.actions || []).find((a) => String(a.code) === String(code));
        return trouve ? trouve.label : defaut;
    };

    const inspection = p.entete ? e : {
        date: i.date, place: '', etat_inspection: i.pays, exploitant: i.exploitant,
        aeronef: i.aeronef, immatriculation: i.immatriculation, vol_depuis: i.vol,
        type_inspection: 'SAFA',
    };

    return `
    <div class="ramp-actions-bar">
        <button class="btn btn-outline btn-sm" onclick="rampFermerApercu()">
            ${RAMP_ICONS.back} ${rt('retour_liste')}</button>
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampImprimerRapport()">
            ${RAMP_ICONS.print} ${rt('imprimer')}</button>
    </div>
    <div class="ramp-card ramp-fiche poi-rapport">
        <div class="poi-entete">
            <div>
                <h3 class="poi-titre">Proof of Inspection (POI)</h3>
                <div class="poi-reference">${i.poi_reference
                    ? rt('rapport_reference', _rEsc(i.poi_reference)) : rt('rapport_repris')}</div>
            </div>
            <div class="poi-autorite">
                <i>Information of competent authority</i>
                <div>${val(inspection.autorite || i.pays)}</div>
                <div class="poi-note-autorite">(logo, contact details tel./fax/e-mail)</div>
            </div>
        </div>

        <div class="poi-bande">
            ${champ('Date', rampDate(inspection.date))}
            ${champ('Local Time Start', inspection.heure_debut)}
            ${champ('Local Time End', inspection.heure_fin)}
            ${champ('Place', inspection.place)}
        </div>

        <div class="poi-grille">
            ${champ('Operator', inspection.exploitant)}
            ${champ('AOC No.', inspection.aoc)}
            <div class="poi-champ">
                <i>Type of inspection</i>
                <div>${case_(inspection.type_inspection !== 'SANA', 'SAFA')}
                     ${case_(inspection.type_inspection === 'SANA', 'SANA')}</div>
            </div>
            <div class="poi-champ large">
                <i>Type of operation</i>
                <div>
                    ${case_(/Annex 6 Part I\b|Commercial/i.test(inspection.type_exploitation || ''),
                        'Commercial Air Transport (Annex 6 Part I)')}
                    ${case_(/General Aviation|Part II/i.test(inspection.type_exploitation || ''),
                        'General Aviation (Annex 6 Part II)')}
                    ${case_(/Helicopter|Part III/i.test(inspection.type_exploitation || ''),
                        'Helicopter Operation (Annex 6 Part III)')}
                </div>
            </div>
            ${champ('State', inspection.etat_exploitant || inspection.etat_inspection)}
            ${champ('Route from', inspection.route_depuis)}
            ${champ('Flight No.', inspection.vol_depuis)}
            ${champ('Route to', inspection.route_vers)}
            ${champ('Flight No.', inspection.vol_vers)}
            ${champ('Chartered by operator', inspection.affreteur)}
            ${champ('Charterer’s State', inspection.etat_affreteur)}
            ${champ('Aircraft type', inspection.aeronef)}
            ${champ('Registration mark', inspection.immatriculation)}
            ${champ('Construction No.', inspection.numero_construction)}
            ${champ('Flight crew’s State of licensing', inspection.etat_licences)}
            ${champ('2nd State of licensing', inspection.etat_licences_2)}
            <div class="poi-champ">
                <i>Aircraft configuration</i>
                <div>${case_(/pass/i.test(inspection.configuration || ''), 'Passenger')}
                     ${case_(/fre|cargo/i.test(inspection.configuration || ''), 'Freight')}</div>
            </div>
        </div>

        <div class="ramp-table-wrap" style="max-height:none;">
            <table class="ramp-table poi-table">
                <thead>
                    <tr>
                        <th colspan="4">Item / Description</th>
                        <th colspan="4">Findings</th>
                    </tr>
                    <tr>
                        <th style="width:46px;">Item</th>
                        <th>Description</th>
                        <th style="width:52px;text-align:center;">Check</th>
                        <th style="width:20%;">Remark</th>
                        <th style="width:46px;">Item</th>
                        <th style="width:44px;text-align:center;">Std<sup>1</sup></th>
                        <th style="width:44px;text-align:center;">Cat<sup>2</sup></th>
                        <th style="width:26%;">Finding description</th>
                    </tr>
                </thead>
                <tbody>${corpsItems}</tbody>
            </table>
        </div>
        <div class="poi-notes">
            <div><sup>1</sup> Inspection Standards : I = ICAO, M = Manufacturer, N = National</div>
            <div><sup>2</sup> Finding Category : G = General remark, 1 = Minor, 2 = Significant, 3 = Major</div>
        </div>

        <div class="poi-bloc">
            <i>Additional Information (where applicable)</i>
            <div class="poi-zone">${val(p.informations)}</div>
        </div>

        <div class="poi-bloc">
            <i>Class of Action</i>
            <div class="poi-classes">
                ${RAMP_POI_CLASSES.map(([code, defaut]) => `
                <div class="poi-classe${String(classeRetenue) === code ? ' retenue' : ''}">
                    <span>${String(classeRetenue) === code ? '☒' : '☐'}</span>
                    <strong>${_rEsc(code)}</strong>
                    <span>${_rEsc(libelleClasse(code, defaut))}</span>
                </div>`).join('')}
            </div>
        </div>

        <div class="poi-pied">
            <div class="poi-bloc">
                <i>Inspector(s) name(s) or number(s)</i>
                <div class="poi-zone">${val(p.inspecteurs)}</div>
            </div>
            <div class="poi-bloc">
                <i>PIC / operator’s representative (comments / feedback)</i>
                <div class="poi-zone">${val(p.commentaires_pic)}</div>
            </div>
            <div class="poi-bloc">
                <i>Name &amp; Signature</i>
                <div class="poi-zone poi-signature"></div>
            </div>
        </div>

        <div class="ramp-fiche-pied">
            ${_rEsc(rt('rapport_items_controles', Number(i.itemsInspectes) || 0, ecarts.length))}
            · ${rt('rapport_etabli')}
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  Exports Excel
// ══════════════════════════════════════
// RAMP composait ses classeurs dans le navigateur, en chargeant SheetJS depuis
// un CDN. OASIS ne charge rien depuis l'extérieur : le serveur les compose, et
// les filtres affichés lui sont repostés — c'est ce que l'agent regarde qu'il
// exporte, pas la base entière.

const rampExporterInspections = () => rampTelecharger('/inspections/export-xlsx',
    { filtres: RAMP_STATE.filtres }, 'inspections_ramp.xlsx');

const rampExporterEcarts = () => rampTelecharger('/ecarts/export-xlsx',
    { filtres: RAMP_STATE.filtres }, 'ecarts_ramp.xlsx');

// ══════════════════════════════════════
//  Volet et modale — mécanique partagée
// ══════════════════════════════════════

function rampAfficherSlider(html, taille) {
    const el = document.getElementById('rampSlider');
    if (!el) return;
    el.innerHTML = html;
    el.classList.toggle('tiers', taille === 'tiers');
    el.classList.toggle('moitie', taille === 'moitie');
    el.classList.toggle('deux-tiers', taille === 'deux-tiers');
    el.classList.toggle('max', taille === 'max' || taille === 'max-gauche');
    el.classList.toggle('gauche', taille === 'max-gauche');
    el.classList.add('open');
    // Le volet plein écran remplace la page : l'assombrir derrière lui n'aurait
    // pas de sens, il n'y a plus rien à voir dessous.
    document.getElementById('rampSliderOverlay')?.classList.toggle('open',
        taille !== 'max' && taille !== 'max-gauche');
    // Il masque du même coup la barre inférieure de l'application : elle le
    // suit, pour qu'on la retrouve jusque dans le formulaire d'inspection.
    if (taille === 'max' || taille === 'max-gauche') rampPiedVolet(el);
}

// La mention de bas de page, reprise telle qu'elle est posée sur la page par le
// socle — traduction et millésime compris.
function rampPiedVolet(el) {
    const pied = document.querySelector('.app-content > .oasis-module-footer');
    if (!pied || el.querySelector('.oasis-module-footer')) return;
    const f = document.createElement('footer');
    f.className = 'oasis-module-footer';
    f.textContent = pied.textContent;
    el.appendChild(f);
}

function rampFermerSlider() {
    RAMP_STATE.depotEnCours = null;
    RAMP_STATE.voletRejouer = null;
    const el = document.getElementById('rampSlider');
    // Entré par la gauche, il ressort par la droite : la barre de menu reste
    // dégagée pendant le glissement.
    if (el?.classList.contains('gauche')) el.classList.add('sortie-droite');
    el?.classList.remove('open');
    document.getElementById('rampSliderOverlay')?.classList.remove('open');
    // Le volet des statistiques porte un grand tableau : le laisser en place
    // une fois refermé garderait des milliers de nœuds vivants, atteignables
    // par la navigation au clavier et par les lecteurs d'écran. On le vide,
    // mais après le glissement — sinon il disparaîtrait d'un coup.
    // L'écran qui réapparaît doit être là : tant que le volet était ouvert, la
    // page sous lui n'était plus rendue (un changement de langue, par exemple,
    // la laissait vide).
    rampRenderPage();
    if (!el) return;
    setTimeout(() => {
        if (el.classList.contains('open')) return;
        el.innerHTML = '';
        el.classList.remove('sortie-droite');
    }, 350);
}

// ══════════════════════════════════════
//  Volet « Statistiques »
// ══════════════════════════════════════
// Ouvert par le bouton du tableau de bord. Le bouton de sortie précède
// l'intitulé, il n'y a pas de croix : on quitte le volet par où l'on est entré.
// Filtres, blocs repliés et lignes dépliées vivent dans l'état du module :
// rejouer le volet le retrouve tel qu'on l'a laissé.

async function rampChargerCorrespondancesAeronefs() {
    if (RAMP_STATE.aeronefsCorrespondances) return;
    try {
        const r = await rampApi('/aeronefs/correspondances');
        RAMP_STATE.aeronefsCorrespondances = r.correspondances || {};
        if (RAMP_STATE.statsAeronefMode === 'designation') rampRenderPage();
    } catch (e) { RAMP_STATE.aeronefsCorrespondances = {}; }
}

function rampOuvrirStatistiques() {
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.chart}</span>
            <span class="ramp-slider-titre">${rt('stats_titre')}</span>
        </div>
        <div class="ramp-slider-body">${rampRenderStatistiques()}</div>`, 'max');
    RAMP_STATE.voletRejouer = rampOuvrirStatistiques;
    // La table des désignations sert au graphique des aéronefs ; elle se charge
    // une fois, en arrière-plan.
    rampChargerCorrespondancesAeronefs();
}

// L'importation s'ouvre en volet depuis les États : elle sort de la gauche,
// du côté d'où venait son entrée de menu.
function rampOuvrirImportation() {
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.upload}</span>
            <span class="ramp-slider-titre">${rt('importer_inspections')}</span>
        </div>
        <div class="ramp-slider-body">${rampRenderImportation()}</div>`, 'max-gauche');
    RAMP_STATE.voletRejouer = rampOuvrirImportation;
}

function rampAfficherModal(html) {
    const el = document.getElementById('rampModalRoot');
    if (el) el.innerHTML = html;
}

function rampFermerModal() {
    RAMP_STATE.paramEnCours = null;
    RAMP_STATE.contactEnCours = null;
    RAMP_STATE.depotEnCours = null;
    const el = document.getElementById('rampModalRoot');
    if (el) el.innerHTML = '';
}

Object.assign(window, {
    RAMP_STATE, RAMP_API, RAMP_ICONS, RAMP_NAV, RAMP_MOIS, RAMP_MOIS_COURT, RAMP_GROUPES_PAR_LETTRE,
    rampApi, _rEsc, _rAttr, _rNorm,
    rampLoadData, rampRecharger, rampRenderApp, rampRenderPage, rampNavigateTo,
    rampToggleSidebar, rampSetTheme, rampSetLang, rampRafraichir, rampConserverModale, rampSaisiesEnCours, rampRetourPortail, rampDeconnexion,
    rampParseDate, rampDate, rampISO,
    rampFamille, rampPonderations, rampLibelleItem, rampGroupeDeLItem, rampEstClos,
    _rArg, rampBasculerEcart, rampTeinteSuivi, rampMesurerEntete, rampMesurerPied, rampRemonter, rampVueCourante, rampCorpsDeLaPage, rampRole, rampEstAdmin, rampEstRegional, rampPeutContribuer, rampPeutImporter,
    rampFiltrer, rampSetFiltre, rampResetFiltres, rampChercher, rampBarreFiltres,
    rampAnnees, rampValeurs, rampTrier, rampAppliquerTri, rampTh, rampBadgeCat, rampResumeHtml,
    rampRenderDashboard, rampRenderEtats, rampRenderPageEcarts, rampOuvrirImportation,
    rampCartesInspections, rampCartesEcarts, rampAnneauCategories, RAMP_COULEURS_CAT,
    rampBasculerCategorie, rampRechercheRonde, RAMP_RECHERCHE_ECARTS,
    RAMP_RECHERCHE_INSPECTIONS, rampOuvrirRecherche,
    rampFermerRechercheSiVide, rampViderRecherche, RAMP_POI_CLASSES, rampImprimerRapport,
    rampChargerCorrespondancesAeronefs,
    rampFiltrerAvec, rampFacette, RAMP_FACETTES, rampTrimestresRetenus,
    rampListeTrimestres, rampBasculerTrimestres, rampBasculerTrimestre, rampViderTrimestres,
    RAMP_UEMOA, rampBarrePays, rampBasculerPaysUemoa, rampViderPaysUemoa, rampNomPaysData,
    rampRenderInspections, rampRenderEcarts,
    rampLignesInspections, rampLignesEcarts, rampSupprimerInspection,
    rampOuvrirApercu, rampFermerApercu, rampRenderApercu,
    rampExporterInspections, rampExporterEcarts,
    rampAfficherSlider, rampFermerSlider, rampAfficherModal, rampFermerModal,
    rampOuvrirStatistiques,
});
