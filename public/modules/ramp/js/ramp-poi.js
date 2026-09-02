/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Écran « Inspection » : le formulaire POI (Proof of Inspection) rempli en ligne.
 *
 * Deux vues : la liste des fiches, et la fiche elle-même. La fiche reprend le
 * formulaire papier — en-tête d'identification du vol, les 54 items du
 * programme SAFA cochés un à un, la classe d'action, les signataires. Les
 * listes déroulantes viennent toutes du paramétrage du module : items et
 * groupes d'items, catégories d'écart, actions SAFA, statuts de suivi,
 * exploitants, aéroports, pays et nomenclature des aéronefs.
 *
 * Tant qu'elle est en brouillon, la fiche ne produit rien. Validée, elle écrit
 * l'inspection et ses écarts — ce que les états et les statistiques lisent.
 */

const RAMP_POI_VIDE = () => ({
    equipe: [],
    entete: {
        date: new Date().toISOString().slice(0, 10),
        heure_debut: '', heure_fin: '', place: '', etat_inspection: '', autorite: '',
        exploitant: '', aoc: '', type_inspection: 'SAFA', type_exploitation: '',
        etat_exploitant: '', route_depuis: '', vol_depuis: '', route_vers: '', vol_vers: '',
        affreteur: '', etat_affreteur: '', aeronef: '', immatriculation: '',
        numero_construction: '', etat_licences: '', etat_licences_2: '', configuration: '',
    },
    items: {}, classe_action: '', statut_suivi: '',
    inspecteurs: '', commentaires_pic: '', informations: '',
});

// ── Chargement ──

async function rampChargerPoi() {
    const S = RAMP_STATE.poi;
    S.chargement = true;
    S.demande = true;
    try {
        // Le contexte ne se charge qu'une fois : c'est le paramétrage, il ne
        // bouge pas pendant qu'on remplit une fiche.
        if (!S.contexte) S.contexte = await rampApi('/poi/contexte');
        const r = await rampApi('/poi');
        S.liste = r.poi || [];
        S.peutSaisir = !!r.peut_saisir;
    } catch (e) {
        rampToast(e.message || 'Chargement impossible', 'error');
    } finally {
        S.chargement = false;
    }
    rampRenderPage();
}

const rampPoiCtx = () => RAMP_STATE.poi.contexte || {
    groupes: [], items: [], categories: [], actions: [], statuts: [], exploitants: [],
    standards: [], types_exploitation: [], types_inspection: [], configurations: [],
    etats_inspection: [], pays: [], aeroports: [], aeronefs: [],
};

// ══════════════════════════════════════
//  Liste des fiches
// ══════════════════════════════════════

function rampPoiFiltrer() { return rampPoiFiltrerAvec(RAMP_STATE.poi.filtres); }

function rampPoiFiltrerAvec(criteres) {
    const F = criteres || {};
    const q = _rNorm(F.recherche || '');
    return RAMP_STATE.poi.liste.filter((p) => {
        const e = p.entete || {};
        return (!F.statut || p.statut === F.statut)
            && (!F.etat || e.etat_inspection === F.etat)
            && (!q || _rNorm(`${p.reference} ${e.exploitant} ${e.immatriculation} ${e.aeronef} ${e.place} ${e.etat_inspection} ${p.inspecteurs}`).includes(q));
    });
}

// Les deux listes se répondent : un État ne propose que les statuts qu'il
// porte, un statut que les États où il se rencontre. La valeur choisie reste
// toujours proposée, pour pouvoir la lever.
function rampPoiFacette(cle, valeurDe) {
    const F = RAMP_STATE.poi.filtres;
    // Comme ailleurs dans le module, l'État choisi ne retranche rien aux
    // autres listes.
    const jeu = rampPoiFiltrerAvec({ ...F, [cle]: '', etat: '' });
    const v = new Set();
    jeu.forEach((p) => { const x = valeurDe(p); if (x) v.add(x); });
    if (F[cle]) v.add(F[cle]);
    return [...v];
}

function rampPoiSetFiltre(cle, valeur) {
    RAMP_STATE.poi.filtres[cle] = valeur;
    // Choisir dans une liste rejoue aussi les autres : elles ne doivent plus
    // proposer ce que le nouveau critère écarte. La frappe de recherche, elle,
    // ne redessine que les lignes — sinon le curseur serait perdu.
    rampRenderPage();
}

function rampPoiChercher(valeur) {
    RAMP_STATE.poi.filtres.recherche = valeur;
    rampPoiRedessiner();
}

function rampPoiReset() {
    RAMP_STATE.poi.filtres = { statut: '', etat: '', recherche: '' };
    const champ = document.querySelector('#rampPoiFiltres .ramp-recherche-boite input');
    if (champ) champ.value = '';
    rampPoiRedessiner();
}

function rampPoiRedessiner() {
    const zone = document.getElementById('rampPoiZone');
    if (!zone) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiLignes();
    rendreDefilement();
}

function rampPoiLignes() {
    const S = RAMP_STATE.poi;
    if (S.chargement && !S.liste.length) {
        return '<div class="ramp-card"><p class="ramp-table-vide">Chargement des fiches…</p></div>';
    }
    const liste = rampPoiFiltrer();
    const brouillons = liste.filter((p) => p.statut === 'brouillon').length;

    const ligne = (p) => {
        const e = p.entete || {};
        const valide = p.statut === 'validee';
        return `<tr class="ramp-depliant" onclick="rampOuvrirPoi(${_rArg(p.id)})">
            <td><strong class="ramp-code">${_rEsc(p.reference)}</strong></td>
            <td>${_rEsc(e.date || '—')}</td>
            <td>${_rEsc(e.etat_inspection || '—')}<div class="ramp-desc">${_rEsc(e.place || '')}</div></td>
            <td>${_rEsc(e.exploitant || '—')}</td>
            <td>${_rEsc(e.aeronef || '—')}<div class="ramp-desc">${_rEsc(e.immatriculation || '')}</div></td>
            <td style="text-align:center;">${p.controles}</td>
            <td style="text-align:center;">
                ${p.ecarts ? `<span class="ramp-badge alerte">${p.ecarts}</span>` : '0'}
            </td>
            <td><span class="ramp-badge ${valide ? 'actif' : 'attente'}">
                ${p.transmis_le ? 'Transmise' : (valide ? 'Validée'
                    : (p.statut === 'soumis' ? 'Soumise' : 'Brouillon'))}</span>
                ${p.pieces ? `<div class="ramp-desc">${p.pieces} pièce${p.pieces > 1 ? 's' : ''}</div>` : ''}</td>
            <td class="ramp-cell-actions">
                <button class="btn btn-outline btn-sm ramp-btn-icone" title="${valide ? 'Consulter' : 'Poursuivre la saisie'}"
                        onclick="event.stopPropagation();rampOuvrirPoi(${_rArg(p.id)})">
                    ${valide ? RAMP_ICONS.eye : RAMP_ICONS.edit}</button>
                ${(!valide && RAMP_STATE.poi.peutSaisir) || rampEstAdmin()
                    ? `<button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                               onclick="event.stopPropagation();rampSupprimerPoi(${_rArg(p.id)})" title="Supprimer">
                           ${RAMP_ICONS.delete}</button>` : ''}
            </td>
        </tr>`;
    };

    const corps = liste.length
        ? liste.map(ligne).join('')
        : `<tr><td colspan="9" class="ramp-table-vide">${rt('poi_aucune_fiche')}</td></tr>`;

    return `
    <div class="ramp-actions-bar">
        <!-- À la place du compteur : ce que cette page recense, et ce qu'elle
             laisse de côté. -->
        <span class="ramp-sous-titre ramp-poi-portee">${rt('poi_note')}</span>
        <span style="flex:1;"></span>
        ${RAMP_STATE.poi.peutSaisir
            ? `<button class="btn btn-primary btn-sm" onclick="rampNouveauPoi()">
                   ${RAMP_ICONS.add} ${rt('ajouter_inspection')}</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:100px;">${rt('poi_reference')}</th>
                    <th style="width:110px;">${rt('c_date')}</th>
                    <th>${rt('poi_etat_lieu')}</th>
                    <th>${rt('c_exploitant')}</th>
                    <th>${rt('c_aeronef')}</th>
                    <th style="width:80px;text-align:center;">${rt('c_items')}</th>
                    <th style="width:80px;text-align:center;">${rt('c_ecarts')}</th>
                    <th style="width:100px;">${rt('c_statut')}</th>
                    <th style="width:100px;text-align:center;">${rt('c_actions')}</th>
                </tr></thead>
                <tbody>${corps}</tbody>
            </table>
        </div>
    </div>`;
}

// Les indicateurs de la page : ce que les fiches portent, du brouillon à la
// validation. Mêmes cartes que les écrans de liste, sur un seul rang.
function rampCartesPoi() {
    const liste = rampPoiFiltrer();
    const par = (statut) => liste.filter((p) => p.statut === statut).length;
    const brouillons = par('brouillon');
    const soumises = par('soumis');
    const validees = par('validee');
    const ecarts = liste.reduce((n, p) => n + Object.values(p.items || {})
        .filter((v) => v && v.ecart && v.ecart.categorie).length, 0);
    const items = liste.reduce((n, p) => n + Object.values(p.items || {})
        .filter((v) => v && v.controle).length, 0);
    const partValidees = liste.length ? Math.round((validees / liste.length) * 100) : 0;

    return `<div class="oasis-kpi-groupes ramp-kpi-ligne">${oasisKpiGroupe('', [
        oasisKpiCarte({
            titre: rt('poi_kpi_fiches'), couleur: '#1d4ed8',
            valeur: liste.length,
            precision: rt('poi_kpi_soumises', soumises),
            figure: { type: 'barres', valeurs: [brouillons, soumises, validees] },
        }),
        oasisKpiCarte({
            titre: rt('poi_kpi_brouillons'), couleur: '#f59e0b',
            valeur: brouillons,
            precision: rt('poi_kpi_en_cours'),
            figure: { type: 'jauge', pct: liste.length ? Math.round((brouillons / liste.length) * 100) : 0 },
        }),
        oasisKpiCarte({
            titre: rt('poi_kpi_validees'), couleur: '#16a34a',
            valeur: `${partValidees} %`,
            precision: `${validees} ${rt('kpi_sur')} ${liste.length}`,
            figure: { type: 'cloture', pct: partValidees },
        }),
        oasisKpiCarte({
            titre: rt('poi_kpi_ecarts'), couleur: '#dc2626', alerte: !!ecarts,
            valeur: ecarts,
            precision: `${items} ${rt('kpi_items').toLowerCase()}`,
            figure: { type: 'echelle', position: items ? Math.min(100, Math.round((ecarts / items) * 300)) : 0,
                min: rt('kpi_faible'), max: rt('kpi_eleve') },
        }),
    ])}</div>`;
}

function rampRenderPoi() {
    const F = RAMP_STATE.poi.filtres;
    const ctx = rampPoiCtx();
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${cur === v ? 'selected' : ''}>${_rEsc(l)}</option>`;
    return `
    <div class="ramp-page-header">
        <h2>${rt('poi_titre')}</h2>
        <button class="btn btn-primary btn-sm" onclick="rampNavigateTo('etats')">
            ${RAMP_ICONS.back} ${rt('poi_retour')}</button>
    </div>
    ${rampCartesPoi()}
    <div class="ramp-filtres" id="rampPoiFiltres">
        <select class="ramp-select" onchange="rampPoiSetFiltre('statut', this.value)">
            ${opt('', rt('poi_statuts_tous'), F.statut)}
            ${rampPoiFacette('statut', (p) => p.statut)
                .sort()
                .map((st) => opt(st, { brouillon: rt('poi_brouillons'), soumis: rt('poi_soumises'),
                    validee: rt('poi_validees') }[st] || st, F.statut)).join('')}
        </select>
        <select class="ramp-select" onchange="rampPoiSetFiltre('etat', this.value)">
            ${opt('', rt('poi_etats_tous'), F.etat)}
            ${rampPoiFacette('etat', (p) => (p.entete || {}).etat_inspection)
                .sort((a, b) => a.localeCompare(b, 'fr'))
                .map((e) => opt(e, e, F.etat)).join('')}
        </select>
        <div class="ramp-recherche-boite">
            ${RAMP_ICONS.search}
            <input type="text" placeholder="Rechercher…" value="${_rAttr(F.recherche)}"
                   oninput="rampPoiChercher(this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampPoiReset()"
                title="Réinitialiser tous les filtres">${RAMP_ICONS.reset}</button>
    </div>
    <div id="rampPoiZone">${rampPoiLignes()}</div>`;
}

// ══════════════════════════════════════
//  La fiche
// ══════════════════════════════════════

// La fiche s'ouvre en volet, glissé depuis la droite — comme les statistiques.
// `voletRejouer` retient de quoi le redessiner : changer de thème ou de langue
// reconstruit la coquille du module, et le volet doit se retrouver tel quel,
// saisie comprise. C'est aussi ce qui l'empêche de se refermer au passage.
function rampVoletPoi() {
    // L'entête du volet est celui du socle — bandeau plein, bouton de sortie à
    // gauche : c'est la même barre que le volet des statistiques. Il porte
    // aussi les repères de la fiche, qui restent ainsi sous les yeux sans
    // occuper de place dans le corps.
    rampAfficherSlider(`
        <div class="ramp-slider-header ramp-poi-entete-volet">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerPoi()">
                ${RAMP_ICONS.back} Retour
            </button>
            <span style="display:flex;">${RAMP_ICONS.clipboard}</span>
            ${rampPoiBande()}
        </div>
        <div class="ramp-slider-body ramp-slider-poi">${rampRenderPoiFiche()}</div>`, 'max');
    RAMP_STATE.voletRejouer = rampVoletPoi;
}

function rampNouveauPoi() {
    RAMP_STATE.poiEnCours = { ...RAMP_POI_VIDE(), id: '', reference: '', statut: 'brouillon' };
    RAMP_STATE.poiGroupesReplies = {};
    RAMP_STATE.poiSaisieLibre = {};
    RAMP_STATE.poiVue = '';
    RAMP_STATE.poiClasseManuelle = false;
    rampVoletPoi();
}

// Ouverture d'une fiche neuve depuis un autre écran : le contexte du
// formulaire n'y est pas forcément encore chargé.
async function rampAjouterInspection() {
    if (!RAMP_STATE.poi.contexte) await rampChargerPoi();
    if (!RAMP_STATE.poi.peutSaisir) { rampToast('Saisie non autorisée', 'error'); return; }
    rampNouveauPoi();
}

async function rampOuvrirPoi(id) {
    try {
        const p = await rampApi(`/poi/${id}`);
        RAMP_STATE.poiEnCours = { ...RAMP_POI_VIDE(), ...p, entete: { ...RAMP_POI_VIDE().entete, ...p.entete } };
        RAMP_STATE.poiGroupesReplies = {};
        RAMP_STATE.poiSaisieLibre = {};
        // Le calcul automatique reprend la main à l'ouverture : la classe suit
        // les constats tant que l'agent n'en choisit pas une lui-même.
        RAMP_STATE.poiClasseManuelle = false;
        // Les commentaires en cours se reprennent là où le valideur les a
        // laissés ; les versions closes s'affichent repliées.
        const courante = (p.commentaires || []).find((v) => !v.close_le);
        RAMP_STATE.poiCommentairesSaisie = courante ? (courante.entrees || []).map((c) => ({ ...c })) : [];
        RAMP_STATE.poiVersionsOuvertes = {};
        rampVoletPoi();
    } catch (e) { rampToast(e.message || 'Fiche indisponible', 'error'); }
}

function rampFermerPoi() {
    RAMP_STATE.poiEnCours = null;
    RAMP_STATE.poiVue = '';
    rampFermerSlider();
    rampRenderPage();
}

const rampPoiFige = () => ['validee', 'soumis'].includes((RAMP_STATE.poiEnCours || {}).statut)
    || !RAMP_STATE.poi.peutSaisir;

// La saisie vit dans l'état, non dans le DOM : replier un groupe ou basculer un
// item redessine la fiche, et rien ne doit se perdre au passage.
function rampPoiChamp(champ, valeur) {
    RAMP_STATE.poiEnCours.entete[champ] = valeur;
    // Les aéroports proposés suivent l'État d'inspection : changer d'État
    // redessine l'en-tête pour que la liste suive. C'est une liste déroulante,
    // aucune frappe en cours ne s'y perd.
    if (champ === 'etat_inspection') {
        // Changer d'État vide le lieu : un aéroport d'un autre pays n'a plus
        // de sens ici.
        RAMP_STATE.poiEnCours.entete.place = '';
        rampPoiRedessinerEntete();
    }
}

// Liste ouverte : « Autre… » découvre le champ de saisie libre, une valeur de
// la liste le referme.
function rampPoiChampOuvert(champ, valeur) {
    const libre = valeur === '__autre__';
    RAMP_STATE.poiSaisieLibre[champ] = libre;
    RAMP_STATE.poiEnCours.entete[champ] = libre ? '' : valeur;
    rampPoiRedessinerEntete();
}

function rampPoiRedessinerEntete() {
    const zone = document.getElementById('rampPoiEntete');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiEntete();
    rendreDefilement();
}

function rampPoiMeta(champ, valeur) {
    // Choisir soi-même la classe d'action fige le calcul automatique.
    if (champ === 'classe_action') RAMP_STATE.poiClasseManuelle = true;
    RAMP_STATE.poiEnCours[champ] = valeur;
}

function rampPoiItem(code) {
    const p = RAMP_STATE.poiEnCours;
    if (!p.items[code]) p.items[code] = { controle: false, remarque: '', ecart: null };
    return p.items[code];
}

function rampPoiControle(code, coche) {
    rampPoiItem(code).controle = !!coche;
    rampPoiRedessinerItems();
}

// Le champ grandit avec le texte : on ne relit pas une remarque à travers une
// fente d'une ligne.
function rampPoiAjuster(el) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
}

function rampPoiRemarque(code, valeur) {
    rampPoiItem(code).remarque = valeur;
}

// Ouvrir un constat, c'est cocher l'item du même geste : on ne relève pas un
// écart sur un item qu'on n'a pas contrôlé.
function rampPoiBasculerEcart(code, ouvrir) {
    const it = rampPoiItem(code);
    if (ouvrir) {
        it.controle = true;
        it.ecart = it.ecart || { categorie: '', standard: '', description: '', action: '', suivi: '' };
    } else {
        it.ecart = null;
    }
    // Retirer un constat peut abaisser la classe d'action de la fiche.
    rampPoiClasseAutomatique();
    rampPoiRedessinerItems();
}

function rampPoiEcart(code, champ, valeur) {
    const it = rampPoiItem(code);
    if (!it.ecart) it.ecart = { categorie: '', standard: '', description: '', action: '', suivi: '' };
    it.ecart[champ] = valeur;
    if (champ === 'action') rampPoiClasseAutomatique();
    // La catégorie décide de l'existence de l'écart : le compteur en dépend.
    if (champ === 'categorie') { rampPoiClasseAutomatique(); rampPoiRedessinerItems(); }
}

// La classe d'action de la fiche est la plus contraignante de celles portées
// par les constats — le rang vient de l'ordre du paramétrage, où les actions
// vont de « aucun constat » à l'interdiction d'exploitation. L'agent garde la
// main : s'il en choisit une lui-même, elle n'est plus recalculée.
function rampPoiClasseAutomatique() {
    const p = RAMP_STATE.poiEnCours;
    if (!p || RAMP_STATE.poiClasseManuelle || rampPoiFige()) return;
    const rangs = new Map(rampPoiCtx().actions.map((a, i) => [a.code, i]));
    const retenue = Object.values(p.items || {})
        .filter((i) => i.ecart && i.ecart.categorie && i.ecart.action)
        .reduce((max, i) => (rangs.get(i.ecart.action) > (rangs.get(max) ?? -1) ? i.ecart.action : max), '');
    if (retenue === p.classe_action) return;
    p.classe_action = retenue;
    // Le champ est ailleurs dans la page : on le remet à jour sans tout refaire.
    const sel = document.querySelector('[data-champ="classe_action"]');
    if (sel) sel.value = retenue;
}

function rampPoiBasculerGroupe(code) {
    const r = RAMP_STATE.poiGroupesReplies;
    r[code] = !r[code];
    rampPoiRedessinerItems();
}

function rampPoiToutDeplier(ouvrir) {
    const r = {};
    if (!ouvrir) rampPoiCtx().groupes.forEach((g) => { r[g.code] = true; });
    RAMP_STATE.poiGroupesReplies = r;
    rampPoiRedessinerItems();
}

function rampPoiRedessinerItems() {
    const zone = document.getElementById('rampPoiItems');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiItems();
    rendreDefilement();
    const compteur = document.getElementById('rampPoiCompteur');
    if (compteur) compteur.innerHTML = rampPoiCompteur();
    // La bande d'identification porte les mêmes compteurs : elle suit.
    const bande = document.querySelector('.ramp-poi-bande');
    if (bande) bande.outerHTML = rampPoiBande();
}

const rampPoiControles = () => Object.values((RAMP_STATE.poiEnCours || {}).items || {})
    .filter((i) => i.controle).length;
const rampPoiEcarts = () => Object.values((RAMP_STATE.poiEnCours || {}).items || {})
    .filter((i) => i.ecart && i.ecart.categorie).length;

function rampPoiCompteur() {
    const total = rampPoiCtx().items.length;
    return `${rampPoiControles()} / ${total} item${total > 1 ? 's' : ''} contrôlé${rampPoiControles() > 1 ? 's' : ''}
        · ${rampPoiEcarts()} écart${rampPoiEcarts() > 1 ? 's' : ''}`;
}

// ── Les 54 items, rangés sous leur groupe ──

function rampPoiItems() {
    const ctx = rampPoiCtx();
    const fige = rampPoiFige();
    const p = RAMP_STATE.poiEnCours;
    const replies = RAMP_STATE.poiGroupesReplies;

    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${_rEsc(l)}</option>`;

    const ligne = (item) => {
        const v = p.items[item.code] || { controle: false, remarque: '', ecart: null };
        const e = v.ecart;
        return `
        <tr class="${e && e.categorie ? 'ramp-poi-ecart' : ''}">
            <td><strong class="ramp-code">${_rEsc(item.code)}</strong></td>
            <td>${_rEsc(item.label)}
                ${item.description ? `<div class="ramp-desc">${_rEsc(item.description)}</div>` : ''}</td>
            <td style="text-align:center;">
                <input type="checkbox" class="ramp-case" ${v.controle ? 'checked' : ''} ${fige ? 'disabled' : ''}
                       aria-label="Item ${_rAttr(item.code)} contrôlé"
                       onchange="rampPoiControle(${_rArg(item.code)}, this.checked)">
            </td>
            <td>
                <!-- Multiligne : une remarque d'inspection tient rarement sur
                     une ligne, et le champ grandit au besoin. -->
                <textarea class="ramp-input ramp-input-plat ramp-poi-remarque" rows="1"
                          placeholder="Remarque" ${fige ? 'disabled' : ''}
                          oninput="rampPoiRemarque(${_rArg(item.code)}, this.value);rampPoiAjuster(this)"
                          >${_rEsc(v.remarque || '')}</textarea>
            </td>
            <td style="text-align:center;">
                <input type="checkbox" class="ramp-case" ${e ? 'checked' : ''} ${fige ? 'disabled' : ''}
                       aria-label="Constat sur l'item ${_rAttr(item.code)}"
                       onchange="rampPoiBasculerEcart(${_rArg(item.code)}, this.checked)">
            </td>
        </tr>
        ${e ? `<tr class="ramp-poi-constat">
            <td></td>
            <td colspan="4">
                <div class="ramp-poi-constat-grille">
                    <select class="ramp-select" ${fige ? 'disabled' : ''}
                            onchange="rampPoiEcart(${_rArg(item.code)}, 'categorie', this.value)">
                        <option value="">Catégorie…</option>
                        ${ctx.categories.map((c) => opt(c.code, c.label, e.categorie)).join('')}
                    </select>
                    <select class="ramp-select" ${fige ? 'disabled' : ''}
                            onchange="rampPoiEcart(${_rArg(item.code)}, 'standard', this.value)">
                        <option value="">Référentiel…</option>
                        ${ctx.standards.map((s) => opt(s.code, `${s.code} — ${s.label}`, e.standard)).join('')}
                    </select>
                    <select class="ramp-select" ${fige ? 'disabled' : ''}
                            onchange="rampPoiEcart(${_rArg(item.code)}, 'action', this.value)">
                        <option value="">Action…</option>
                        ${ctx.actions.map((a) => opt(a.code, `${a.code} — ${a.label}`, e.action)).join('')}
                    </select>
                    <!-- Statut du constat : l'exploitant l'a-t-il soldé avant
                         la fin de l'inspection ? Valeurs du paramétrage. -->
                    <select class="ramp-select" ${fige ? 'disabled' : ''}
                            title="Statut du constat à la fin de l’inspection"
                            onchange="rampPoiEcart(${_rArg(item.code)}, 'suivi', this.value)">
                        <option value="">Statut…</option>
                        ${ctx.statuts.map((st) => opt(st, st, e.suivi)).join('')}
                    </select>
                    <textarea class="ramp-input ramp-poi-description" rows="2"
                              placeholder="Description du constat" ${fige ? 'disabled' : ''}
                              oninput="rampPoiEcart(${_rArg(item.code)}, 'description', this.value);rampPoiAjuster(this)"
                              >${_rEsc(e.description || '')}</textarea>
                </div>
            </td>
        </tr>` : ''}`;
    };

    const bandeau = (groupe, liste) => {
        const ouvert = !replies[groupe.code];
        const coches = liste.filter((i) => (p.items[i.code] || {}).controle).length;
        const constats = liste.filter((i) => {
            const v = p.items[i.code];
            return v && v.ecart && v.ecart.categorie;
        }).length;
        return `
        <tr class="ramp-groupe-ligne ramp-depliant" onclick="rampPoiBasculerGroupe(${_rArg(groupe.code)})">
            <td colspan="5">
                <div class="ramp-gi-entete">
                    <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                            aria-expanded="${ouvert}" title="${ouvert ? 'Replier' : 'Déplier'} ce groupe"
                            onclick="event.stopPropagation();rampPoiBasculerGroupe(${_rArg(groupe.code)})">
                        ${RAMP_ICONS.chevronBas}
                    </button>
                    <strong>${_rEsc(groupe.label)}</strong>
                    <span class="ramp-gi-compte">${coches} / ${liste.length}</span>
                    ${constats ? `<span class="ramp-badge alerte">${constats} écart${constats > 1 ? 's' : ''}</span>` : ''}
                </div>
            </td>
        </tr>
        ${ouvert ? liste.map(ligne).join('') : ''}`;
    };

    const parGroupe = new Map(ctx.groupes.map((g) => [g.code, []]));
    const orphelins = [];
    ctx.items.forEach((i) => {
        if (parGroupe.has(i.groupe)) parGroupe.get(i.groupe).push(i);
        else orphelins.push(i);
    });

    let corps = ctx.groupes.map((g) => bandeau(g, parGroupe.get(g.code) || [])).join('');
    if (orphelins.length) corps += bandeau({ code: '__sans__', label: 'Sans groupe' }, orphelins);
    if (!ctx.items.length) {
        corps = '<tr><td colspan="5" class="ramp-table-vide">Aucun item au paramétrage.</td></tr>';
    }

    return `
    <table class="ramp-table ramp-table-poi">
        <thead><tr>
            <th style="width:60px;">Item</th>
            <th style="width:22%;">Intitulé</th>
            <th style="width:75px;text-align:center;">Contrôlé</th>
            <th>Remarque</th>
            <th style="width:75px;text-align:center;">Constat</th>
        </tr></thead>
        <tbody>${corps}</tbody>
    </table>`;
}

// ── L'en-tête de la fiche ──

function rampPoiEntete() {
    const ctx = rampPoiCtx();
    const p = RAMP_STATE.poiEnCours;
    const e = p.entete;
    const fige = rampPoiFige();
    const d = fige ? 'disabled' : '';

    // Un astérisque marque ce que la validation exigera : sans ces cinq
    // champs, la fiche ne devient pas une inspection.
    const requis = (obligatoire) => (obligatoire ? ' <b class="ramp-requis">*</b>' : '');

    const champ = (cle, label, attrs, o) => `
        <div class="ramp-champ">
            <label>${_rEsc(label)}${requis(o)}</label>
            <input class="ramp-input" ${attrs || ''} ${d} value="${_rAttr(e[cle] || '')}"
                   oninput="rampPoiChamp('${cle}', this.value)">
        </div>`;

    const liste = (cle, label, valeurs, o, vide) => `
        <div class="ramp-champ">
            <label>${_rEsc(label)}${requis(o)}</label>
            <select class="ramp-select" ${d} onchange="rampPoiChamp('${cle}', this.value)">
                <option value="">${_rEsc(vide || '— Choisir —')}</option>
                ${valeurs.map((v) => `<option value="${_rAttr(v)}"
                    ${e[cle] === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
            </select>
        </div>`;

    // Liste déroulante ouverte : les valeurs viennent des paramètres, mais on
    // peut désigner ce qui n'y figure pas encore — un exploitant de passage
    // n'est pas toujours au fichier. « Autre… » découvre alors un champ libre.
    const listeOuverte = (cle, label, valeurs, o, placeholder) => {
        const valeur = e[cle] || '';
        const horsListe = !!valeur && !valeurs.includes(valeur);
        return `
        <div class="ramp-champ">
            <label>${_rEsc(label)}${requis(o)}</label>
            <select class="ramp-select" ${d} onchange="rampPoiChampOuvert('${cle}', this.value)">
                <option value="">— Choisir —</option>
                ${valeurs.map((v) => `<option value="${_rAttr(v)}"
                    ${valeur === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
                <option value="__autre__" ${horsListe ? 'selected' : ''}>— Autre (à saisir) —</option>
            </select>
            ${horsListe || RAMP_STATE.poiSaisieLibre[cle] ? `
            <input class="ramp-input" style="margin-top:.35rem;" ${d}
                   placeholder="${_rAttr(placeholder || 'À saisir')}" value="${_rAttr(valeur)}"
                   oninput="rampPoiChamp('${cle}', this.value)">` : ''}
        </div>`;
    };

    // Les aéroports proposés suivent l'État d'inspection choisi : c'est là que
    // l'inspection a lieu. Sans État, la liste attend qu'on en choisisse un.
    const aeroports = (ctx.aeroports || [])
        .filter((a) => a.pays === e.etat_inspection)
        .map((a) => `${a.nom} (${a.code})`);

    // Une seule grille pour toute la section : les champs s'alignent alors
    // colonne par colonne, ce que des grilles séparées ne garantissaient pas.
    return `
    <div class="ramp-card">
        <div class="ramp-card-titre">Identification</div>
        <div class="ramp-poi-grille ramp-poi-grille-4">
            ${champ('date', 'Date', 'type="date"', true)}
            ${champ('heure_debut', 'Heure de début', 'type="time"')}
            ${champ('heure_fin', 'Heure de fin', 'type="time"')}
            ${liste('etat_inspection', 'État d’inspection', ctx.etats_inspection, true)}

            ${liste('place', 'Lieu (aéroport)', aeroports, false,
                e.etat_inspection ? '— Choisir —' : '— Choisir d’abord l’État —')}
            ${liste('type_inspection', 'Type d’inspection', ctx.types_inspection)}
            ${listeOuverte('exploitant', 'Exploitant', ctx.exploitants, true, 'Exploitant non répertorié')}
            ${champ('aoc', 'N° de CTA (AOC)')}

            ${liste('etat_exploitant', 'État de l’exploitant', ctx.pays)}
            ${liste('type_exploitation', 'Type d’exploitation', ctx.types_exploitation)}
            ${champ('route_depuis', 'Provenance')}
            ${champ('vol_depuis', 'N° de vol (arrivée)')}

            ${champ('route_vers', 'Destination')}
            ${champ('vol_vers', 'N° de vol (départ)')}
            ${champ('affreteur', 'Affrété par (le cas échéant)')}
            ${liste('etat_affreteur', 'État de l’affréteur', ctx.pays)}

            <div class="ramp-champ">
                <label>Type d’aéronef${requis(true)}</label>
                <!-- Mille désignations : la liste déroulante sert quand on
                     connaît le code, la loupe quand on cherche par modèle. -->
                <div class="ramp-champ-avec-bouton">
                    <select class="ramp-select" ${d} onchange="rampPoiChamp('aeronef', this.value)">
                        <option value="">— Choisir —</option>
                        ${ctx.aeronefs.map((v) => `<option value="${_rAttr(v)}"
                            ${e.aeronef === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
                    </select>
                    <button class="btn btn-outline btn-sm ramp-btn-icone" type="button" ${d}
                            title="Rechercher par modèle ou constructeur"
                            onclick="rampOuvrirSelecteurAeronef()">${RAMP_ICONS.search}</button>
                </div>
            </div>
            ${champ('immatriculation', 'Immatriculation', '', true)}
            ${champ('numero_construction', 'N° de construction')}
            ${liste('configuration', 'Configuration', ctx.configurations)}

            ${liste('etat_licences', 'État de délivrance des licences', ctx.pays)}
            ${liste('etat_licences_2', '2ᵉ État de délivrance', ctx.pays)}
            ${champ('autorite', 'Autorité compétente')}
        </div>
    </div>`;
}

// ── Fil d'avancement ──
// Trois étapes, comme le circuit des activités du module « Exécution de la
// Surveillance » : la fiche se remplit et se soumet, le valideur l'accepte ou
// la renvoie, puis elle part chez l'exploitant. Les boutons d'étape se tiennent
// au bout du fil, sur la même ligne.

const RAMP_POI_ETAPES = () => [
    { cle: 'soumission', label: rt('poi_etape_soumission') },
    { cle: 'validation', label: rt('poi_etape_validation') },
    { cle: 'transmission', label: rt('poi_etape_transmission') },
];

const rampPoiEtape = () => {
    const p = RAMP_STATE.poiEnCours || {};
    if (p.transmis_le) return 'transmise';
    if (p.statut === 'validee') return 'transmission';
    if (p.statut === 'soumis') return 'validation';
    return 'soumission';
};

function rampPoiFil() {
    const p = RAMP_STATE.poiEnCours || {};
    const etape = rampPoiEtape();
    const rang = { soumission: 0, validation: 1, transmission: 2, transmise: 3 }[etape];
    const renvoyee = !!p.renvoye_le && p.statut === 'brouillon';

    // Chaque étape est un bouton : on consulte ce qu'elle porte. Une étape que
    // le circuit n'a pas atteinte reste inerte — il n'y a rien à y voir.
    const vue = rampPoiVue();
    const atteint = rampPoiRangAtteint();
    const etapes = RAMP_POI_ETAPES().map((e, i) => {
        const classe = i < rang ? 'done' : (i === rang ? 'current' : '');
        const atteinte = i <= atteint;
        return `<button type="button"
                    class="eval-step ramp-proc-step ${i === 0 && renvoyee ? 'rejected' : classe}${
                        vue === e.cle ? ' selected' : ''}${atteinte ? '' : ' verrouillee'}"
                    ${atteinte ? '' : 'disabled'}
                    title="${_rAttr(rampPoiEtapeInfo(e.cle))}"
                    onclick="rampPoiVoirEtape(${_rArg(e.cle)})">${_rEsc(e.label)}</button>`;
    }).join('');

    return `
    <div class="ramp-proc-barre">
        <div class="eval-steps ramp-proc-fil">${etapes}</div>
        <div class="ramp-proc-actions">${rampPoiActions()}</div>
    </div>`;
}

// Ce que chaque étape dit de la fiche : qui l'a portée, et quand.
function rampPoiEtapeInfo(cle) {
    const p = RAMP_STATE.poiEnCours || {};
    if (cle === 'soumission') {
        if (p.renvoye_le && p.statut === 'brouillon') {
            return `Renvoyée le ${rampHorodatage(p.renvoye_le)}${p.motif_renvoi ? ` — ${p.motif_renvoi}` : ''}`;
        }
        return p.soumis_le ? `Soumise le ${rampHorodatage(p.soumis_le)} par ${p.soumis_par}`
            : 'Saisie en cours par l’inspecteur';
    }
    if (cle === 'validation') {
        return p.valide_le ? `Validée le ${rampHorodatage(p.valide_le)} par ${p.valide_par}`
            : 'En attente de validation';
    }
    return p.transmis_le
        ? `Transmise le ${rampHorodatage(p.transmis_le)}${p.transmis_a ? ` — ${p.transmis_a}` : ''}`
        : 'En attente de transmission à l’exploitant';
}

// Les boutons de passage d'étape, et le renvoi. Chacun n'apparaît qu'à
// l'étape où il a un sens, et pour qui en a le droit.
function rampPoiActions() {
    const p = RAMP_STATE.poiEnCours || {};
    const etape = rampPoiEtape();
    const peutSaisir = RAMP_STATE.poi.peutSaisir;
    const peutValider = rampEstAdmin() || rampEstRegional();
    const b = [];

    if (etape === 'soumission' && peutSaisir) {
        b.push(`<button class="btn btn-primary btn-sm" onclick="rampSoumettrePoi()">${rt('poi_soumettre')}</button>`);
    }
    if (etape === 'validation' && peutValider) {
        b.push(`<button class="btn btn-outline btn-sm ramp-btn-renvoi" onclick="rampRenvoyerPoi()">
            ${RAMP_ICONS.back} Renvoyer</button>`);
        b.push(`<button class="btn btn-primary btn-sm" onclick="rampValiderPoi()">
            ${RAMP_ICONS.check} Valider</button>`);
    }
    if (etape === 'validation' && !peutValider) {
        b.push('<span class="ramp-sous-titre">En attente du valideur</span>');
    }
    // La transmission ne se déclare plus : elle est acquise dès que les deux
    // communications sont parties.
    // Partage de la transmission : une fiche validée se met à disposition
    // d'autres États, lettres et pièces comprises. Tant qu'aucune notification
    // n'est partie, il n'y a rien à partager — le bouton reste inerte.
    if (p.statut === 'validee' && peutSaisir) {
        const communiquee = (p.communications || []).some((c) => c.envoye);
        b.push(`<button class="btn btn-outline btn-sm" ${communiquee ? '' : 'disabled'}
                title="${_rAttr(communiquee ? '' : 'Aucune notification envoyée')}"
                onclick="rampPoiOuvrirPartage()">
            ${RAMP_ICONS.upload} ${rt('par_partager')}</button>`);
    }
    if (p.inspection_id) {
        b.push(`<button class="btn btn-outline btn-sm" onclick="rampVoirInspectionDuPoi()">
            ${RAMP_ICONS.list} Voir l’inspection</button>`);
    }
    return b.join('');
}

// L'étape consultée. Par défaut celle où en est le circuit ; on peut revenir
// sur les précédentes pour les relire.
// Étapes consultables : celle où en est le circuit, et toutes celles que la
// fiche a déjà traversées — une fiche renvoyée revient au brouillon, mais son
// étape de validation garde les observations qu'il faut pouvoir relire.
const rampPoiRangAtteint = () => {
    const p = RAMP_STATE.poiEnCours || {};
    const rangEtape = { soumission: 0, validation: 1, transmission: 2, transmise: 3 }[rampPoiEtape()];
    const historique = p.valide_le ? 2
        : ((p.soumis_le || (p.commentaires || []).length) ? 1 : 0);
    return Math.max(rangEtape, historique);
};

const rampPoiVue = () => {
    const etape = rampPoiEtape();
    const parDefaut = etape === 'transmise' ? 'transmission' : etape;
    const demandee = RAMP_STATE.poiVue;
    const rangDemande = { soumission: 0, validation: 1, transmission: 2 }[demandee];
    return demandee && rangDemande <= rampPoiRangAtteint() ? demandee : parDefaut;
};

function rampPoiVoirEtape(cle) {
    RAMP_STATE.poiVue = cle;
    rampVoletPoi();
}

// ── Bande d'identification ──
// Ce qu'on garde sous les yeux en parcourant les cinquante-quatre items :
// de quelle fiche il s'agit, sur quel appareil, où, et où elle en est.
function rampPoiBande() {
    const p = RAMP_STATE.poiEnCours || {};
    const e = p.entete || {};
    const valide = p.statut === 'validee';
    const statut = p.transmis_le ? 'Transmise'
        : (valide ? 'Validée' : (p.statut === 'soumis' ? 'Soumise' : 'Brouillon'));
    const bloc = (titre, valeur) => `<span class="ramp-poi-bande-bloc">
        <i>${_rEsc(titre)}</i><b>${_rEsc(valeur || '—')}</b></span>`;
    return `
    <div class="ramp-poi-bande">
        ${bloc('POI', p.reference || 'Nouvelle')}
        ${bloc('Exploitant', e.exploitant)}
        ${bloc('Immat.', e.immatriculation)}
        ${bloc('Aéroport', e.place)}
        ${bloc('Items', `${rampPoiControles()} / ${rampPoiCtx().items.length}`)}
        ${bloc('Écarts', String(rampPoiEcarts()))}
        ${bloc('Statut', statut)}
    </div>`;
}

// ── Étape « Validation » : ce que le valideur a sous les yeux ──
// À gauche ce qui est soumis — identification, constats, remarques, pièces ;
// à droite ses observations, qu'il annote champ par champ.

// Horodatage sur une seule ligne : « le 28/08/2026 à 22:27 par KOFFI Ama ».
// Une date de fiche se lit à la française.
const rampPoiDate = (v) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : (v || '—');
};

const rampPoiQuand = (iso, par) => {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `le ${date} à ${heure}${par ? ` par ${par}` : ''}`;
};

function rampPoiVueValidation() {
    const p = RAMP_STATE.poiEnCours || {};
    const ctx = rampPoiCtx();
    const e = p.entete || {};
    const libelle = (liste, code) => {
        const t = liste.find((x) => x.code === code);
        return t ? `${t.code} — ${t.label}` : (code || '—');
    };
    const item = (code) => (ctx.items.find((i) => i.code === code) || {}).label || code;
    // Un repère du récapitulatif : intitulé, valeur. La valeur est déjà
    // échappée par l'appelant, qui y met parfois une nuance en gris.
    const repere = (titre, valeur) => `<div class="ramp-poi-recap-ligne">
        <dt>${_rEsc(titre)}</dt><dd>${valeur}</dd></div>`;
    const constats = Object.entries(p.items || {})
        .filter(([, i]) => i.ecart && i.ecart.categorie)
        .sort((a, b) => a[0].localeCompare(b[0]));
    // Une remarque sans constat n'en est pas un : elle se lit à part, sinon
    // elle se perdrait entre les cinquante-quatre items.
    const remarques = Object.entries(p.items || {})
        .filter(([, i]) => i.remarque && !(i.ecart && i.ecart.categorie))
        .sort((a, b) => a[0].localeCompare(b[0]));

    // Le récapitulatif tient toute la largeur ; les commentaires ne longent que
    // les trois sections d'en dessous, bordures alignées avec les leurs.
    return `
    <div class="ramp-card ramp-card-bandeau">
        <div class="ramp-card-entete ramp-poi-recap-bandeau">
            <span style="flex:1;">Ce qui est soumis à validation</span>
            <span class="ramp-poi-recap-soumise">${p.soumis_le
                ? `Soumise ${_rEsc(rampPoiQuand(p.soumis_le, p.soumis_par_nom || p.soumis_par))}`
                : 'Non soumise'}</span>
        </div>
        <!-- Chaque repère sur sa ligne, intitulé à gauche, valeur à droite :
             c'est une fiche qu'on relit, non un formulaire qu'on remplit. -->
        <dl class="ramp-poi-recap">
            ${repere('Inspection', `${_rEsc(rampPoiDate(e.date))} · ${_rEsc(e.etat_inspection || '—')}${
                e.heure_debut ? ` <span class="ramp-desc">${_rEsc(e.heure_debut)}${
                    e.heure_fin ? `–${_rEsc(e.heure_fin)}` : ''}</span>` : ''}`)}
            ${repere('Lieu', _rEsc(e.place || '—'))}
            ${repere('Exploitant', `${_rEsc(e.exploitant || '—')}${e.aoc
                ? ` <span class="ramp-desc">(CTA ${_rEsc(e.aoc)})</span>` : ''}`)}
            ${repere('Aéronef', `<strong>${_rEsc(e.aeronef || '—')}</strong> / ${_rEsc(e.immatriculation || '—')}${
                e.numero_construction ? ` / <span class="ramp-desc">SN ${_rEsc(e.numero_construction)}</span>` : ''}`)}
            ${repere('Vol', `${_rEsc(e.route_depuis || '—')} → ${_rEsc(e.route_vers || '—')}${
                (e.vol_depuis || e.vol_vers) ? ` · ${_rEsc(e.vol_depuis || e.vol_vers)}` : ''}`)}
            ${repere('Type', `${_rEsc(e.type_inspection || '—')}${e.type_exploitation
                ? ` · <span class="ramp-desc">${_rEsc(e.type_exploitation)}</span>` : ''}`)}
            ${repere('Inspecteur(s)', (p.equipe || []).length
                ? p.equipe.map((m) => `${_rEsc(`${m.nom} ${m.prenom}`.trim())}${m.numero
                    ? ` <span class="ramp-desc">${_rEsc(m.numero)}</span>` : ''}${m.specialite
                    ? ` <span class="ramp-desc">· ${_rEsc(m.specialite)}</span>` : ''}`).join('<br>')
                : _rEsc(p.inspecteurs || '—'))}
            ${repere('Contrôles', `${rampPoiControles()} / ${ctx.items.length} items · ${
                rampPoiEcarts()} écart${rampPoiEcarts() > 1 ? 's' : ''}`)}
            ${repere('Classe d’action', _rEsc(libelle(ctx.actions, p.classe_action)))}
        </dl>
    </div>
    ${p.valide_le ? `<p class="ramp-note">
        Validée ${_rEsc(rampPoiQuand(p.valide_le, p.valide_par_nom || p.valide_par))} :
        l’inspection et ses écarts figurent aux états du module.
    </p>` : ''}
    ${p.renvoye_le && p.statut === 'brouillon' ? rampPoiMotifRenvoi() : ''}
    <div class="ramp-poi-validation">
    <div class="ramp-poi-validation-corps">
    <div class="ramp-actions-bar ramp-actions-bar-tete">
        <strong style="font-size:.9rem;">Constats relevés</strong>
        <span class="ramp-sous-titre">${constats.length} écart${constats.length > 1 ? 's' : ''}
            sur ${rampPoiControles()} item${rampPoiControles() > 1 ? 's' : ''} contrôlé${rampPoiControles() > 1 ? 's' : ''}</span>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:70px;">Item</th>
                    <th style="width:24%;">Intitulé</th>
                    <th style="width:110px;">Catégorie</th>
                    <th style="width:110px;">Référentiel</th>
                    <th style="width:110px;">Statut</th>
                    <th>Description</th>
                </tr></thead>
                <tbody>${constats.length ? constats.map(([code, i]) => `<tr>
                    <td><strong class="ramp-code">${_rEsc(code)}</strong></td>
                    <td>${_rEsc(item(code))}</td>
                    <td>${_rEsc(libelle(ctx.categories, i.ecart.categorie))}</td>
                    <td>${_rEsc((ctx.standards.find((x) => x.code === i.ecart.standard) || {}).label || '—')}</td>
                    <td>${_rEsc(i.ecart.suivi || '—')}</td>
                    <td class="ramp-desc">${_rEsc(i.ecart.description)}</td>
                </tr>`).join('')
                    : '<tr><td colspan="6" class="ramp-table-vide">Aucun écart relevé.</td></tr>'}</tbody>
            </table>
        </div>
    </div>

    <div class="ramp-actions-bar">
        <strong style="font-size:.9rem;">Autres remarques</strong>
        <span class="ramp-sous-titre">Items commentés sans constat</span>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:70px;">Item</th>
                    <th style="width:24%;">Intitulé</th>
                    <th style="width:90px;text-align:center;">Contrôlé</th>
                    <th>Remarque</th>
                </tr></thead>
                <tbody>${remarques.length ? remarques.map(([code, i]) => `<tr>
                    <td><strong class="ramp-code">${_rEsc(code)}</strong></td>
                    <td>${_rEsc(item(code))}</td>
                    <td style="text-align:center;">${i.controle ? 'Oui' : 'Non'}</td>
                    <td class="ramp-desc">${_rEsc(i.remarque)}</td>
                </tr>`).join('')
                    : '<tr><td colspan="4" class="ramp-table-vide">Aucune remarque hors constat.</td></tr>'}</tbody>
            </table>
        </div>
    </div>
    <div id="rampPoiPieces">${rampPoiPieces()}</div>
    </div>
    <div id="rampPoiCommentaires" class="ramp-poi-commentaires${
        RAMP_STATE.poiCommentairesReplies ? ' replie' : ''}">${rampPoiCommentaires()}</div>
    </div>`;
}

// ── Motif de renvoi ──
// Ce que le valideur a demandé : les commentaires de la version qu'il a fermée
// en renvoyant. Les renvois précédents restent consultables, repliés — une
// fiche peut faire plusieurs allers-retours.

function rampPoiMotifRenvoi() {
    const p = RAMP_STATE.poiEnCours || {};
    const renvois = (p.commentaires || []).filter((v) => v.issue === 'renvoi').reverse();
    if (!renvois.length && !p.motif_renvoi) return '';
    const dernier = renvois[0];
    const anciens = renvois.slice(1);

    // Une ligne par observation : le champ, puis ce qui est demandé. Deux
    // lignes par commentaire tiendraient trop de place en tête de saisie.
    const entree = (c) => `
        <div class="ramp-poi-renvoi-ligne">
            <i>${_rEsc(rampPoiLibelleCible(c.cible))}</i> : ${_rEsc(c.texte)}
        </div>`;

    return `
    <div class="ramp-card ramp-card-bandeau ramp-poi-renvoi">
        <div class="ramp-card-entete">
            Motif de renvoi
            <span class="ramp-poi-renvoi-quand">${_rEsc(dernier
                ? rampPoiQuand(dernier.close_le, dernier.close_par_nom || dernier.close_par)
                : rampPoiQuand(p.renvoye_le))}</span>
            <span class="ramp-poi-renvoi-consigne">Corrigez la fiche, puis soumettez-la de nouveau.</span>
        </div>
        <div class="ramp-poi-renvoi-corps">
            ${dernier && (dernier.entrees || []).length
                ? dernier.entrees.map(entree).join('')
                : `<p class="ramp-sous-titre">${p.motif_renvoi
                    ? _rEsc(p.motif_renvoi) : 'Aucun commentaire n’accompagne ce renvoi.'}</p>`}
            ${anciens.length ? `
                <div class="ramp-sous-titre" style="margin:.6rem 0 .2rem;">Renvois précédents</div>
                ${anciens.map((v) => {
                    const ouvert = !!RAMP_STATE.poiVersionsOuvertes[`r${v.version}`];
                    return `
                    <div class="ramp-poi-version">
                        <button class="ramp-poi-version-tete" type="button" aria-expanded="${ouvert}"
                                onclick="rampPoiBasculerVersion('r${v.version}')">
                            <span class="ramp-extension${ouvert ? ' ouvert' : ''}">${RAMP_ICONS.chevronBas}</span>
                            <strong>Version ${v.version}</strong>
                            <span class="ramp-sous-titre">${_rEsc(rampPoiQuand(v.close_le,
                                v.close_par_nom || v.close_par))}</span>
                        </button>
                        ${ouvert ? `<div class="ramp-poi-version-corps">
                            ${(v.entrees || []).length ? v.entrees.map(entree).join('')
                                : '<p class="ramp-sous-titre">Aucun commentaire.</p>'}
                        </div>` : ''}
                    </div>`;
                }).join('')}` : ''}
        </div>
    </div>`;
}

// ── Commentaires de validation ──
// Le valideur choisit le champ qu'il commente et écrit son observation. Les
// commentaires vivent par versions : celle en cours se modifie jusqu'à la
// décision, les précédentes se relisent, repliées.

// Ce sur quoi un commentaire peut porter : les sections de la fiche, les
// champs de l'identification, puis chaque item du programme.
function rampPoiCibles() {
    const ctx = rampPoiCtx();
    return [
        { groupe: 'Général', options: [['general', 'Commentaire général']] },
        { groupe: 'Identification', options: [
            ['entete.date', 'Date'], ['entete.etat_inspection', 'État d’inspection'],
            ['entete.place', 'Lieu (aéroport)'], ['entete.exploitant', 'Exploitant'],
            ['entete.aoc', 'N° de CTA (AOC)'], ['entete.aeronef', 'Type d’aéronef'],
            ['entete.immatriculation', 'Immatriculation'],
            ['entete.vol', 'Vol / route'], ['entete.configuration', 'Configuration'],
        ] },
        { groupe: 'Fiche', options: [
            ['classe_action', 'Classe d’action'], ['statut_suivi', 'Statut de suivi'],
            ['inspecteurs', 'Inspecteur(s)'], ['pieces', 'Pièces jointes'],
            ['constats', 'Constats relevés'], ['remarques', 'Autres remarques'],
        ] },
        { groupe: 'Items du programme', options: ctx.items.map((i) => [`item.${i.code}`, `${i.code} — ${i.label}`]) },
    ];
}

const rampPoiLibelleCible = (cle) => {
    for (const g of rampPoiCibles()) {
        const t = g.options.find(([v]) => v === cle);
        if (t) return t[1];
    }
    return cle || 'Commentaire général';
};

// Version en cours : celle que la décision n'a pas encore fermée.
const rampPoiVersionCourante = () => (RAMP_STATE.poiEnCours.commentaires || [])
    .find((v) => !v.close_le) || null;

const rampPoiPeutCommenter = () => !!RAMP_STATE.poiEnCours.commentaires_modifiables;

function rampPoiCommentaires() {
    const p = RAMP_STATE.poiEnCours || {};
    const replie = RAMP_STATE.poiCommentairesReplies;
    const versions = (p.commentaires || []).slice().reverse();
    const courante = rampPoiVersionCourante();
    const modifiable = rampPoiPeutCommenter();

    // Combien d'observations portent sur ce tour : le compteur du bandeau.
    const nombre = modifiable ? (RAMP_STATE.poiCommentairesSaisie || []).length
        : ((courante && courante.entrees) || []).length;

    const bouton = `<button class="ramp-poi-commentaires-poignee" type="button"
            title="${replie ? 'Déplier' : 'Replier'} les commentaires"
            onclick="rampPoiBasculerCommentaires()">${RAMP_ICONS.chevron}</button>`;

    // Bandeau ambré, pastille et compteur : la même présentation que les
    // encarts d'observation du module « Exécution de la Surveillance ».
    const bandeau = `
        <div class="ramp-poi-commentaires-bandeau">
            <span class="ramp-poi-commentaires-pastille">i</span>
            <strong>Commentaires de validation</strong>
            <span class="ramp-poi-commentaires-compte">${nombre}</span>
        </div>`;

    // Replié, le panneau se réduit à sa poignée : elle porte le chevron et
    // l'intitulé, à la verticale — c'est là qu'on clique pour rouvrir.
    if (replie) {
        return `<button class="ramp-poi-commentaires-poignee pleine" type="button"
                title="Déplier les commentaires" onclick="rampPoiBasculerCommentaires()">
            ${RAMP_ICONS.chevron}
            <span class="ramp-poi-commentaires-titre-replie">Commentaires de validation${
                nombre ? ` (${nombre})` : ''}</span>
        </button>`;
    }

    const brouillon = RAMP_STATE.poiCommentairesSaisie || [];
    const entree = (c, i) => `
        <div class="ramp-poi-commentaire">
            <div class="ramp-poi-commentaire-tete">
                <select class="ramp-select" onchange="rampPoiCommentaireChamp(${i}, 'cible', this.value)">
                    ${rampPoiCibles().map((g) => `<optgroup label="${_rAttr(g.groupe)}">
                        ${g.options.map(([v, l]) => `<option value="${_rAttr(v)}"
                            ${c.cible === v ? 'selected' : ''}>${_rEsc(l)}</option>`).join('')}
                    </optgroup>`).join('')}
                </select>
                <button class="btn btn-outline btn-sm ramp-btn-icone" title="Retirer ce commentaire"
                        onclick="rampPoiRetirerCommentaire(${i})">${RAMP_ICONS.x}</button>
            </div>
            <textarea class="ramp-input" rows="2" placeholder="Observation du valideur"
                      oninput="rampPoiCommentaireChamp(${i}, 'texte', this.value)">${_rEsc(c.texte || '')}</textarea>
        </div>`;

    const versionClose = (v) => {
        const ouvert = !!RAMP_STATE.poiVersionsOuvertes[v.version];
        return `
        <div class="ramp-poi-version">
            <button class="ramp-poi-version-tete" type="button" aria-expanded="${ouvert}"
                    onclick="rampPoiBasculerVersion(${v.version})">
                <span class="ramp-extension${ouvert ? ' ouvert' : ''}">${RAMP_ICONS.chevronBas}</span>
                <strong>Version ${v.version}</strong>
                <span class="ramp-badge ${v.issue === 'validation' ? 'actif' : 'alerte'}">
                    ${v.issue === 'validation' ? 'Validée' : 'Renvoyée'}</span>
                <span class="ramp-sous-titre">${_rEsc(rampPoiQuand(v.close_le, v.close_par_nom || v.close_par))}</span>
            </button>
            ${ouvert ? `<div class="ramp-poi-version-corps">
                ${(v.entrees || []).length ? v.entrees.map((c) => `
                    <div class="ramp-poi-commentaire-lu">
                        <i>${_rEsc(rampPoiLibelleCible(c.cible))}</i>
                        <div class="ramp-desc">${_rEsc(c.texte)}</div>
                    </div>`).join('')
                    : '<p class="ramp-sous-titre">Aucun commentaire à cette version.</p>'}
            </div>` : ''}
        </div>`;
    };

    return `${bouton}
    <div class="ramp-poi-commentaires-corps">
        ${bandeau}
        <div class="ramp-poi-commentaires-contenu">
        ${modifiable ? `
            <div id="rampPoiCommentairesSaisie">
                ${brouillon.map(entree).join('')}
            </div>
            <div class="ramp-poi-commentaires-actions">
                <button class="btn btn-outline btn-sm" onclick="rampPoiAjouterCommentaire()">
                    ${RAMP_ICONS.add} Ajouter</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerCommentaires()">
                    ${RAMP_ICONS.check} Enregistrer</button>
            </div>
`
        : `${courante && (courante.entrees || []).length ? `
            <div class="ramp-poi-version-corps">
                ${courante.entrees.map((c) => `
                    <div class="ramp-poi-commentaire-lu">
                        <i>${_rEsc(rampPoiLibelleCible(c.cible))}</i>
                        <div class="ramp-desc">${_rEsc(c.texte)}</div>
                    </div>`).join('')}
            </div>` : '<p class="ramp-sous-titre">Aucun commentaire en cours.</p>'}`}
        ${versions.filter((v) => v.close_le).length ? `
            <div class="ramp-poi-versions">
                <div class="ramp-sous-titre" style="margin:.6rem 0 .3rem;">Versions précédentes</div>
                ${versions.filter((v) => v.close_le).map(versionClose).join('')}
            </div>` : ''}
        </div>
    </div>`;
}

function rampPoiBasculerCommentaires() {
    RAMP_STATE.poiCommentairesReplies = !RAMP_STATE.poiCommentairesReplies;
    rampPoiRedessinerCommentaires();
}

function rampPoiBasculerVersion(n) {
    RAMP_STATE.poiVersionsOuvertes[n] = !RAMP_STATE.poiVersionsOuvertes[n];
    rampPoiRedessinerCommentaires();
}

function rampPoiAjouterCommentaire() {
    RAMP_STATE.poiCommentairesSaisie = (RAMP_STATE.poiCommentairesSaisie || [])
        .concat([{ cible: 'general', texte: '' }]);
    rampPoiRedessinerCommentaires();
}

function rampPoiRetirerCommentaire(i) {
    RAMP_STATE.poiCommentairesSaisie = (RAMP_STATE.poiCommentairesSaisie || [])
        .filter((c, rang) => rang !== i);
    rampPoiRedessinerCommentaires();
}

function rampPoiCommentaireChamp(i, champ, valeur) {
    const liste = RAMP_STATE.poiCommentairesSaisie || [];
    if (!liste[i]) return;
    liste[i][champ] = valeur;
    // Changer la cible redessine ; le texte, non — la frappe s'y perdrait.
    if (champ === 'cible') rampPoiRedessinerCommentaires();
}

function rampPoiRedessinerCommentaires() {
    const zone = document.getElementById('rampPoiCommentaires');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.className = `ramp-poi-commentaires${RAMP_STATE.poiCommentairesReplies ? ' replie' : ''}`;
    zone.innerHTML = rampPoiCommentaires();
    rendreDefilement();
}

async function rampEnregistrerCommentaires(silencieux) {
    const p = RAMP_STATE.poiEnCours;
    const entrees = (RAMP_STATE.poiCommentairesSaisie || [])
        .map((c) => ({ cible: c.cible || 'general', texte: (c.texte || '').trim() }))
        .filter((c) => c.texte);
    try {
        await rampApi(`/poi/${p.id}/commentaires`, {
            method: 'PUT', body: JSON.stringify({ entrees }),
        });
        const frais = await rampApi(`/poi/${p.id}`);
        p.commentaires = frais.commentaires || [];
        p.commentaires_modifiables = frais.commentaires_modifiables;
        RAMP_STATE.poiCommentairesSaisie = entrees.slice();
        rampPoiRedessinerCommentaires();
        if (!silencieux) rampToast('Commentaires enregistrés');
    } catch (e) { rampToast(e.message || 'Enregistrement impossible', 'error'); }
}

// ── Étape « Transmission » ──
// Les constats de catégorie 2 ou 3 appellent une communication écrite : à
// l'exploitant, qui doit produire ses actions correctives, et à l'autorité qui
// le surveille. Les deux lettres sont préparées ici, dans l'esprit des modèles
// du programme SAFA, puis envoyées depuis l'application.

const RAMP_POI_CIBLES_ENVOI = [
    { cle: 'exploitant', titre: 'Communication à l’exploitant' },
    { cle: 'autorite', titre: 'Communication à l’autorité de surveillance' },
];

// La communication écrite est due dès que la fiche porte une classe 2 ou 3.
const rampPoiCommunicationRequise = () =>
    /^(2|3)/.test((RAMP_STATE.poiEnCours || {}).classe_action || '');

// L'autorité de l'État de l'exploitant, telle que le sous-menu Pays la connaît.
function rampPoiAutorite() {
    const e = (RAMP_STATE.poiEnCours || {}).entete || {};
    const liste = rampPoiCtx().autorites || [];
    return liste.find((a) => a.pays === e.etat_exploitant)
        || liste.find((a) => a.pays === e.etat_inspection) || null;
}

// Modèles de lettre, repris des communications écrites du programme SAFA et
// remis dans le contexte du dispositif régional.
function rampPoiLettre(cible) {
    const p = RAMP_STATE.poiEnCours || {};
    const e = p.entete || {};
    const ctx = rampPoiCtx();
    const action = ctx.actions.find((a) => a.code === p.classe_action);
    const constats = Object.entries(p.items || {})
        .filter(([, i]) => i.ecart && i.ecart.categorie)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const cat = (code) => (ctx.categories.find((c) => c.code === code) || {}).label || code;
    const item = (code) => (ctx.items.find((i) => i.code === code) || {}).label || code;
    const releve = constats.map(([code, i]) =>
        `• ${code} — ${item(code)} (${cat(i.ecart.categorie)})${i.ecart.suivi
            ? ` — ${i.ecart.suivi}` : ''}\n  ${i.ecart.description}`).join('\n');
    const vol = [e.route_depuis, e.route_vers].filter(Boolean).join(' → ');
    const identification = [
        `Référence de l’inspection : ${p.reference || '—'}`,
        `Date et lieu : ${rampPoiDate(e.date)} — ${e.place || e.etat_inspection || '—'}`,
        `Exploitant : ${e.exploitant || '—'}${e.aoc ? ` (CTA ${e.aoc})` : ''}`,
        `Aéronef : ${e.aeronef || '—'} immatriculé ${e.immatriculation || '—'}`,
        vol ? `Vol : ${vol}${e.vol_depuis || e.vol_vers ? ` (${e.vol_depuis || e.vol_vers})` : ''}` : '',
    ].filter(Boolean).join('\n');

    if (cible === 'exploitant') {
        return [
            'Madame, Monsieur,',
            '',
            'Votre aéronef a fait l’objet d’une inspection sur aire de trafic conduite dans le cadre '
                + 'du programme régional d’inspections des aéronefs étrangers (SAFA/SANA) de l’UEMOA.',
            '',
            identification,
            '',
            `Classe d’action retenue : ${action ? `${action.code} — ${action.label}` : '—'}.`,
            '',
            constats.length ? `Les constats suivants ont été relevés :\n${releve}` : 'Aucun écart n’a été relevé.',
            '',
            'Pour les constats de catégorie 2 et 3, nous vous demandons de nous communiquer les actions '
                + 'correctives engagées ou prévues, ainsi que les preuves de leur mise en œuvre, afin de '
                + 'prévenir la réapparition de ces écarts. Nous vous invitons à adresser copie de ces '
                + 'éléments à l’autorité chargée de la surveillance de votre exploitation.',
            '',
            'Nous vous remercions de votre coopération en matière de sécurité du transport aérien et vous '
                + 'informons que d’autres inspections pourront être conduites lorsque vos aéronefs se '
                + 'poseront sur le territoire des États participant au programme.',
            '',
            'Veuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
        ].join('\n');
    }
    return [
        'Madame, Monsieur,',
        '',
        'Un aéronef exploité par un opérateur placé sous votre surveillance a fait l’objet d’une '
            + 'inspection sur aire de trafic dans le cadre du programme régional d’inspections des '
            + 'aéronefs étrangers (SAFA/SANA) de l’UEMOA.',
        '',
        identification,
        '',
        `Classe d’action retenue : ${action ? `${action.code} — ${action.label}` : '—'}.`,
        '',
        constats.length ? `Constats relevés :\n${releve}` : 'Aucun écart n’a été relevé.',
        '',
        'L’exploitant a été invité à produire les preuves des actions correctives engagées. Compte tenu '
            + 'de la nature, du nombre ou de la répétition des constats, nous souhaiterions recevoir '
            + 'votre confirmation que ces actions correctives vous donnent satisfaction. Les éléments du '
            + 'rapport d’inspection peuvent également être utiles à vos propres activités de surveillance.',
        '',
        'Nous vous remercions de votre coopération en matière de sécurité du transport aérien.',
        '',
        'Veuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
    ].join('\n');
}

function rampPoiObjet(cible) {
    const p = RAMP_STATE.poiEnCours || {};
    const e = p.entete || {};
    return `Inspection sur aire de trafic ${p.reference || ''} — ${e.exploitant || ''}`
        + `${e.immatriculation ? ` (${e.immatriculation})` : ''}`
        + `${cible === 'autorite' ? ' — communication à l’autorité de surveillance' : ''}`;
}

// Les trois volets de la Transmission s'ouvrent un à un : fermés par défaut,
// l'étape tient à l'écran et l'on déplie ce qu'on vient traiter.
const rampPoiVoletOuvert = (cle) => !!RAMP_STATE.poiVoletsTransmission[cle];

function rampPoiBasculerVolet(cle) {
    RAMP_STATE.poiVoletsTransmission[cle] = !RAMP_STATE.poiVoletsTransmission[cle];
    const zone = document.getElementById('rampPoiVue');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiVueTransmission();
    rendreDefilement();
}

// Entête cliquable d'un volet : intitulé, mention d'état, chevron.
// `action` : un bouton posé sur le bandeau, qui n'ouvre ni ne ferme le volet.
const rampPoiVoletEntete = (cle, titre, mention, action) => `
    <div class="ramp-poi-volet-bandeau">
        <button class="ramp-card-entete ramp-poi-volet-entete" type="button"
                aria-expanded="${rampPoiVoletOuvert(cle)}"
                onclick="rampPoiBasculerVolet(${_rArg(cle)})">
            <span class="ramp-extension${rampPoiVoletOuvert(cle) ? ' ouvert' : ''}">${RAMP_ICONS.chevronBas}</span>
            <span style="flex:1;">${_rEsc(titre)}</span>
            ${mention ? `<span class="ramp-poi-envoi-etat">${mention}</span>` : ''}
        </button>
        ${action || ''}
    </div>`;

function rampPoiEnvoiHtml(cible, titre) {
    const p = RAMP_STATE.poiEnCours || {};
    const faits = (p.communications || []).filter((c) => c.cible === cible);
    const dernier = faits[faits.length - 1];
    // Une notification partie ne se réécrit pas : la lettre reste lisible, mais
    // en l'état où elle a été envoyée. Une lettre consignée après un échec
    // d'envoi, elle, se corrige et se renvoie — sinon la fiche resterait bloquée
    // sur une panne de messagerie.
    const parties = faits.filter((c) => c.envoye);
    const modifiable = RAMP_STATE.poi.peutSaisir && p.statut === 'validee' && !parties.length;
    const autorite = cible === 'autorite' ? rampPoiAutorite() : null;
    const destinataire = dernier ? dernier.destinataire
        : (autorite ? (autorite.emails || []).join(', ') : '');

    // La mention d'envoi se lit sous le bandeau : les deux bandeaux gardent
    // ainsi le même gabarit, et l'expéditeur y est nommé, pas identifié.
    const mention = faits.length
        ? `${dernier.envoye ? 'Envoyée' : 'Consignée'} ${_rEsc(
            rampPoiQuand(dernier.envoye_le, dernier.envoye_par_nom || dernier.envoye_par))}${
            dernier.envoye ? '' : ' — courriel non parti'}`
        : '';

    return `
    <div class="ramp-card ramp-card-bandeau ramp-poi-envoi">
        <div class="ramp-card-entete ramp-poi-volet-entete ramp-poi-envoi-titre">
            <span style="flex:1;">${_rEsc(titre)}</span>
        </div>
        ${mention ? `<p class="ramp-poi-envoi-mention">${mention}</p>` : ''}
        <div class="ramp-poi-envoi-corps">
            <div class="ramp-poi-grille ramp-poi-grille-4">
                <div class="ramp-champ" style="grid-column: 1 / -1;">
                    <label>Destinataire</label>
                    <input class="ramp-input" id="rampEnvoi_${cible}_dest" ${modifiable ? '' : 'disabled'}
                           placeholder="adresse@exemple.org" value="${_rAttr(destinataire)}">
                </div>
                <div class="ramp-champ" style="grid-column: span 2;">
                    <label>Copie (Cc)</label>
                    <input class="ramp-input" id="rampEnvoi_${cible}_cc" ${modifiable ? '' : 'disabled'}
                           value="${_rAttr(dernier ? dernier.copie : '')}">
                </div>
                <div class="ramp-champ" style="grid-column: span 2;">
                    <label>Copie cachée (Cci)</label>
                    <input class="ramp-input" id="rampEnvoi_${cible}_cci" ${modifiable ? '' : 'disabled'}
                           value="${_rAttr(dernier ? dernier.copie_cachee : '')}">
                </div>
            </div>
            <div class="ramp-champ">
                <label>Objet</label>
                <input class="ramp-input" id="rampEnvoi_${cible}_objet" ${modifiable ? '' : 'disabled'}
                       value="${_rAttr(dernier ? dernier.objet : rampPoiObjet(cible))}">
            </div>
            <div class="ramp-champ">
                <label>Message</label>
                <textarea class="ramp-input ramp-poi-lettre" rows="12" id="rampEnvoi_${cible}_msg"
                          ${modifiable ? '' : 'disabled'}>${_rEsc(dernier ? dernier.message : rampPoiLettre(cible))}</textarea>
            </div>
            <div class="ramp-actions-bar" style="margin:0;">
                <span style="flex:1;"></span>
                <button class="btn btn-outline btn-sm" ${modifiable ? '' : 'disabled'}
                        onclick="rampPoiReinitialiserLettre(${_rArg(cible)})">
                    Rétablir le modèle</button>
                <button class="btn btn-primary btn-sm" ${modifiable ? '' : 'disabled'}
                        title="${_rAttr(modifiable ? '' : 'Notification déjà envoyée')}"
                        onclick="rampEnvoyerCommunication(${_rArg(cible)})">
                    Envoyer</button>
            </div>
            ${faits.length > 1 ? `<p class="ramp-sous-titre" style="margin:.5rem 0 0;">
                ${faits.length} envois consignés.</p>` : ''}
        </div>
    </div>`;
}

function rampPoiReinitialiserLettre(cible) {
    const objet = document.getElementById(`rampEnvoi_${cible}_objet`);
    const msg = document.getElementById(`rampEnvoi_${cible}_msg`);
    if (objet) objet.value = rampPoiObjet(cible);
    if (msg) msg.value = rampPoiLettre(cible);
}

async function rampEnvoyerCommunication(cible) {
    const p = RAMP_STATE.poiEnCours;
    const v = (suffixe) => (document.getElementById(`rampEnvoi_${cible}_${suffixe}`) || {}).value || '';
    try {
        const r = await rampApi(`/poi/${p.id}/communiquer`, {
            method: 'POST',
            body: JSON.stringify({
                cible,
                destinataire: v('dest'), copie: v('cc'), copie_cachee: v('cci'),
                objet: v('objet'), message: v('msg'),
            }),
        });
        const dejaTransmise = !!p.transmis_le;
        await rampChargerPoi();
        await rampOuvrirPoi(p.id);
        rampToast(r.envoye ? 'Communication envoyée'
            : `Communication consignée, courriel non parti${r.erreur ? ` : ${r.erreur}` : ''}`,
            r.envoye ? 'success' : 'warning');
        // Les deux communications parties, la fiche est transmise d'elle-même.
        if (r.transmise && !dejaTransmise) {
            setTimeout(() => rampToast('Les deux communications sont parties : fiche transmise'), 1200);
        }
    } catch (e) { rampToast(e.message || 'Envoi impossible', 'error'); }
}


function rampPoiVueTransmission() {
    const p = RAMP_STATE.poiEnCours || {};
    const requise = rampPoiCommunicationRequise();
    const faites = new Set((p.communications || []).map((c) => c.cible));
    // L'autorité qui surveille l'exploitant se lit ici, avec le reste de ce
    // qu'il faut savoir sur la transmission, et non dans la lettre.
    const autorite = rampPoiAutorite();

    return `
    <div class="ramp-card ramp-card-bandeau">
        ${rampPoiVoletEntete('etat', 'Informations sur la Transmission',
            p.transmis_le ? 'Transmise' : (requise && !faites.has('exploitant')
                ? 'Communication écrite requise' : 'En attente'))}
        ${rampPoiVoletOuvert('etat') ? `<div class="ramp-poi-envoi-corps">
            ${autorite ? `<p class="ramp-sous-titre" style="margin:0 0 .4rem;">
                Autorité de surveillance : ${_rEsc(autorite.aac || autorite.pays)}${autorite.site
                    ? ` · ${_rEsc(autorite.site)}` : ''}</p>` : ''}
            <p class="ramp-sous-titre" style="margin:0 0 .4rem;">
                ${p.transmis_le
                    ? `Transmise ${_rEsc(rampPoiQuand(p.transmis_le, p.transmis_par_nom || p.transmis_par))}${
                        p.transmis_a ? ` — ${_rEsc(p.transmis_a)}` : ''}. Les pièces jointes sont figées.`
                    : 'La fiche sera transmise d’elle-même une fois les deux communications parties ; '
                      + 'les pièces jointes restent modifiables jusque-là.'}
            </p>
            ${requise ? `<p class="ramp-note ${faites.has('exploitant') ? '' : 'ramp-note-renvoi'}">
                Classe d’action ${_rEsc(p.classe_action)} : les constats de catégorie 2 ou 3 appellent une
                communication écrite à l’exploitant — et, s’il y a lieu, à l’autorité qui le surveille.
                ${faites.has('exploitant') ? 'La communication à l’exploitant a été faite.'
                    : 'Elle conditionne la transmission de la fiche.'}
            </p>` : `<p class="ramp-sous-titre" style="margin:0;">
                Classe d’action ${_rEsc(p.classe_action || '—')} : aucune communication écrite n’est exigée ;
                elle reste possible.</p>`}
        </div>` : ''}
    </div>
    <div class="ramp-poi-envois-rangee">
        ${RAMP_POI_CIBLES_ENVOI.map((c) => rampPoiEnvoiHtml(c.cle, c.titre)).join('')}
    </div>
    <div id="rampPoiPieces">${rampPoiPieces()}</div>`;
}

function rampRenderPoiFiche() {
    const p = RAMP_STATE.poiEnCours;
    const valide = p.statut === 'validee';
    const vue = rampPoiVue();

    // Haut de page fixe : on garde sous les yeux l'avancement du circuit et
    // l'identité de la fiche en parcourant les cinquante-quatre items.
    // Le retour et les repères de la fiche vivent dans l'entête du volet ; le
    // corps s'ouvre sur le fil d'avancement, qui reste collé en haut.
    const haut = `<div class="ramp-poi-haut">${rampPoiFil()}</div>`;

    const corps = vue === 'validation' ? rampPoiVueValidation()
        : (vue === 'transmission' ? rampPoiVueTransmission() : rampPoiVueSaisie());

    // Barre inférieure : l'enregistrement du brouillon s'y tient, à droite.
    const bas = rampPoiFige() ? '' : `
    <div class="ramp-poi-bas">
        <span class="ramp-sous-titre">
            La soumission passe la fiche au valideur ; la validation inscrit l’inspection
            et ses écarts aux états du module.
        </span>
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampEnregistrerPoi()">Enregistrer</button>
    </div>`;

    return `${haut}
    ${p.renvoye_le && p.statut === 'brouillon' && vue === 'soumission' ? rampPoiMotifRenvoi() : ''}
    ${!RAMP_STATE.poi.peutSaisir && !valide && vue === 'soumission'
        ? '<p class="ramp-note">Consultation seule : la saisie est réservée aux contributeurs du module.</p>' : ''}
    <div id="rampPoiVue">${corps}</div>
    ${bas}`;
}

// ── Étape « Soumission » : la saisie proprement dite ──
function rampPoiVueSaisie() {
    const p = RAMP_STATE.poiEnCours;
    const ctx = rampPoiCtx();
    const d = rampPoiFige() ? 'disabled' : '';

    return `
    <div id="rampPoiEntete">${rampPoiEntete()}</div>

    <div class="ramp-actions-bar">
        <strong style="font-size:.9rem;">Items du programme SAFA</strong>
        <span style="flex:1;"></span>
        <button class="btn btn-outline btn-sm" onclick="rampPoiToutDeplier(true)">Tout déplier</button>
        <button class="btn btn-outline btn-sm" onclick="rampPoiToutDeplier(false)">Tout replier</button>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap" id="rampPoiItems">${rampPoiItems()}</div>
    </div>

    <div class="ramp-card">
        <div class="ramp-card-titre">Classe d’action et suivi</div>
        <div class="ramp-poi-grille">
            <div class="ramp-champ">
                <label>Classe d’action</label>
                <select class="ramp-select" data-champ="classe_action" ${d}
                        onchange="rampPoiMeta('classe_action', this.value)">
                    <option value="">— Aucune —</option>
                    ${ctx.actions.map((a) => `<option value="${_rAttr(a.code)}"
                        ${p.classe_action === a.code ? 'selected' : ''}>${_rEsc(`${a.code} — ${a.label}`)}</option>`).join('')}
                </select>
            </div>
            <div class="ramp-champ">
                <label>Statut de suivi de l’inspection</label>
                <select class="ramp-select" ${d} onchange="rampPoiMeta('statut_suivi', this.value)">
                    <option value="">— Selon les constats —</option>
                    ${ctx.statuts.map((s) => `<option value="${_rAttr(s)}"
                        ${p.statut_suivi === s ? 'selected' : ''}>${_rEsc(s)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="ramp-champ">
            <label>Inspecteur(s)${p.equipe && p.equipe.length ? '' : ' <b class="ramp-requis">*</b>'}</label>
            <!-- Le personnel déclaré inspecteur et actif au portail. Choisir
                 quelqu'un reprend son numéro, sa spécialité et son niveau de
                 qualification : la fiche les garde, même si le référentiel
                 change ensuite. -->
            ${d ? '' : `<select class="ramp-select" onchange="rampPoiAjouterInspecteur(this.value); this.value='';">
                <option value="">— Ajouter un inspecteur —</option>
                ${rampPoiCtx().inspecteurs
                    .filter((i) => !(p.equipe || []).some((m) => m.id === i.id))
                    .map((i) => `<option value="${_rAttr(i.id)}">${_rEsc(`${i.nom} ${i.prenom}`)}${
                        i.numero ? _rEsc(` — ${i.numero}`) : ''}</option>`).join('')}
            </select>`}
            <div id="rampPoiEquipe">${rampPoiEquipe()}</div>
        </div>
        <div class="ramp-champ">
            <label>Commentaires du commandant de bord ou du représentant de l’exploitant</label>
            <textarea class="ramp-input" rows="2" ${d}
                      oninput="rampPoiMeta('commentaires_pic', this.value)">${_rEsc(p.commentaires_pic || '')}</textarea>
        </div>
        <div class="ramp-champ">
            <label>Informations complémentaires</label>
            <textarea class="ramp-input" rows="2" ${d}
                      oninput="rampPoiMeta('informations', this.value)">${_rEsc(p.informations || '')}</textarea>
        </div>
    </div>

    <div id="rampPoiPieces">${rampPoiPieces()}</div>`;
}

// ══════════════════════════════════════
//  Sélecteur d'aéronef
// ══════════════════════════════════════
// Le champ « Type d'aéronef » attend une désignation OACI, que l'inspecteur ne
// connaît pas toujours de mémoire. Ce volet interroge la nomenclature des
// paramètres — désignation, modèle-variante, constructeur — et rend le code.

async function rampOuvrirSelecteurAeronef() {
    RAMP_STATE.selecteurAeronef = { recherche: '', resultat: null, chargement: true };
    rampAfficherModal(rampSelecteurAeronefHtml());
    await rampChercherAeronefPoi('');
}

let RAMP_SELECTEUR_MINUTEUR = null;

async function rampChercherAeronefPoi(valeur) {
    const S = RAMP_STATE.selecteurAeronef;
    S.recherche = valeur;
    clearTimeout(RAMP_SELECTEUR_MINUTEUR);
    RAMP_SELECTEUR_MINUTEUR = setTimeout(async () => {
        S.chargement = true;
        try {
            const q = new URLSearchParams({ page: '1' });
            if (valeur) q.set('q', valeur);
            S.resultat = await rampApi(`/aeronefs?${q.toString()}`);
        } catch (e) {
            rampToast(e.message || 'Nomenclature indisponible', 'error');
        } finally {
            S.chargement = false;
        }
        const zone = document.getElementById('rampSelAeronefCorps');
        if (zone) zone.innerHTML = rampSelecteurAeronefLignes();
    }, valeur ? 250 : 0);
}

function rampSelecteurAeronefLignes() {
    const S = RAMP_STATE.selecteurAeronef || {};
    if (S.chargement && !S.resultat) return '<p class="ramp-table-vide">Chargement…</p>';
    const r = S.resultat || { lignes: [], total: 0 };
    if (!r.lignes.length) return '<p class="ramp-table-vide">Aucun aéronef ne correspond.</p>';
    // Les lignes arrivent triées par désignation : on affiche le code une fois,
    // suivi de ses variantes, comme à l'écran des paramètres.
    return `
    <p class="ramp-sous-titre">${r.total} aéronef${r.total > 1 ? 's' : ''} ·
        ${r.total_designations} désignation${r.total_designations > 1 ? 's' : ''}${
        r.pages > 1 ? ' · affinez la recherche pour réduire la liste' : ''}</p>
    <div class="ramp-table-wrap" style="max-height:46vh;">
        <table class="ramp-table">
            <thead><tr>
                <th style="width:90px;">Code</th>
                <th>Modèle-variante</th>
                <th style="width:24%;">Constructeur</th>
                <th style="width:90px;text-align:center;">Choisir</th>
            </tr></thead>
            <tbody>${r.lignes.map((a) => `<tr class="ramp-depliant"
                    onclick="rampChoisirAeronef(${_rArg(a.designation)})">
                <td><strong class="ramp-code">${_rEsc(a.designation)}</strong></td>
                <td>${_rEsc(a.modele)}</td>
                <td class="ramp-desc">${_rEsc(a.constructeur || '—')}</td>
                <td style="text-align:center;">
                    <button class="btn btn-outline btn-sm ramp-btn-icone" title="Retenir ce code"
                            onclick="event.stopPropagation();rampChoisirAeronef(${_rArg(a.designation)})">
                        ${RAMP_ICONS.check}</button>
                </td>
            </tr>`).join('')}</tbody>
        </table>
    </div>`;
}

function rampSelecteurAeronefHtml() {
    return `
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal ramp-modal-large" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">Choisir un type d’aéronef</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-recherche-boite" style="margin-bottom:.6rem;">
                    ${RAMP_ICONS.search}
                    <input type="text" placeholder="Désignation, modèle ou constructeur…"
                           oninput="rampChercherAeronefPoi(this.value)">
                </div>
                <div id="rampSelAeronefCorps">${rampSelecteurAeronefLignes()}</div>
            </div>
        </div>
    </div>`;
}

function rampChoisirAeronef(designation) {
    RAMP_STATE.poiEnCours.entete.aeronef = designation;
    rampFermerModal();
    rampPoiRedessinerEntete();
    const bande = document.querySelector('.ramp-poi-bande');
    if (bande) bande.outerHTML = rampPoiBande();
}

// ══════════════════════════════════════
//  Pièces jointes
// ══════════════════════════════════════
// Les preuves recueillies sur l'aire de trafic. Chacune porte son intitulé et,
// si besoin, un commentaire. Elles se remplacent et se retirent tant que la
// fiche n'a pas été transmise à l'exploitant : après, elles font partie de ce
// qui lui a été notifié.

// Ce que le serveur accepte, redit ici pour prévenir avant l'envoi.
const RAMP_PIECES_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
    '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip'];
const RAMP_PIECE_TAILLE_MAX = 25 * 1024 * 1024;

const rampPoiPiecesModifiables = () => {
    const p = RAMP_STATE.poiEnCours || {};
    return RAMP_STATE.poi.peutSaisir && !p.transmis_le;
};

function rampPoiPieces() {
    const p = RAMP_STATE.poiEnCours || {};
    const pieces = p.pieces || [];
    const modifiable = rampPoiPiecesModifiables();

    // La colonne porte l'intitulé donné à la pièce, et lui seul : le nom du
    // fichier déposé se retrouve sur le bouton de téléchargement.
    const ligne = (pj) => `<tr>
        <td><strong>${_rEsc(pj.intitule)}</strong></td>
        <td class="ramp-desc">${pj.commentaire ? _rEsc(pj.commentaire) : '—'}</td>
        <td class="ramp-desc">${_rEsc(pj.depose_par)}<div>${_rEsc(rampHorodatage(pj.depose_le))}</div></td>
        <td class="ramp-cell-actions">
            <a class="btn btn-outline btn-sm ramp-btn-icone"
               title="Télécharger ${_rAttr(pj.nom_origine)} (${_rAttr(rampTaille(pj.taille))})"
               href="${RAMP_API}/poi/${_rAttr(p.id)}/pieces/${_rAttr(pj.id)}/fichier">${RAMP_ICONS.download}</a>
            ${modifiable ? `
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="Modifier ou remplacer"
                    onclick="rampOuvrirPiece(${_rArg(pj.id)})">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerPiece(${_rArg(pj.id)})" title="Supprimer">${RAMP_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;

    return `
    <div class="ramp-actions-bar">
        <strong style="font-size:.9rem;">Pièces jointes</strong>
        <span class="ramp-sous-titre">
            ${pieces.length} pièce${pieces.length > 1 ? 's' : ''}${modifiable
                ? '' : ' · fiche transmise, les pièces ne se modifient plus'}
        </span>
        <span style="flex:1;"></span>
        ${modifiable ? `<button class="btn btn-outline btn-sm" onclick="rampOuvrirPiece()">
            ${RAMP_ICONS.add} Ajouter une pièce</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:32%;">Intitulé</th>
                    <th>Commentaire</th>
                    <th style="width:180px;">Déposée par</th>
                    <th style="width:130px;text-align:center;">Actions</th>
                </tr></thead>
                <tbody>${pieces.length ? pieces.map(ligne).join('')
                    : `<tr><td colspan="4" class="ramp-table-vide">
                        ${modifiable ? 'Aucune preuve attachée pour l’instant.' : 'Aucune pièce jointe.'}
                       </td></tr>`}</tbody>
            </table>
        </div>
    </div>`;
}

function rampOuvrirPiece(id) {
    const p = RAMP_STATE.poiEnCours || {};
    const pj = id ? (p.pieces || []).find((x) => x.id === id) : null;
    RAMP_STATE.pieceEnCours = pj ? { ...pj } : null;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${pj ? 'Modifier la pièce' : 'Ajouter une pièce'}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-champ">
                    <label>Intitulé de la pièce</label>
                    <input class="ramp-input" id="rampPieceIntitule"
                           placeholder="ex. Photo du pneu avant droit"
                           value="${_rAttr((pj || {}).intitule || '')}">
                </div>
                <div class="ramp-champ">
                    <label>Commentaire</label>
                    <textarea class="ramp-input" id="rampPieceCommentaire" rows="3"
                              placeholder="Ce que la pièce établit"
                              >${_rEsc((pj || {}).commentaire || '')}</textarea>
                </div>
                <div class="ramp-champ">
                    <label>${pj ? 'Remplacer le fichier (facultatif)' : 'Fichier'}</label>
                    <input class="ramp-input" type="file" id="rampPieceFichier">
                    ${pj ? `<div class="ramp-desc" style="margin-top:.3rem;">
                        Fichier actuel : ${_rEsc(pj.nom_origine)} · ${_rEsc(rampTaille(pj.taille))}</div>` : ''}
                </div>
                <p class="ramp-note">
                    Formats acceptés : PDF, images, documents bureautiques, archives — 25 Mo au plus.
                </p>
                <p class="ramp-erreur" id="rampPieceErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerPiece()">
                    ${RAMP_ICONS.check} Enregistrer</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerPiece() {
    const p = RAMP_STATE.poiEnCours || {};
    const pj = RAMP_STATE.pieceEnCours;
    const err = document.getElementById('rampPieceErreur');
    const intitule = (document.getElementById('rampPieceIntitule') || {}).value || '';
    const commentaire = (document.getElementById('rampPieceCommentaire') || {}).value || '';
    const fichier = (document.getElementById('rampPieceFichier') || {}).files
        ? document.getElementById('rampPieceFichier').files[0] : null;
    if (!pj && !fichier) { err.textContent = 'Choisissez un fichier'; return; }
    if (!intitule.trim() && !fichier) { err.textContent = 'Intitulé requis'; return; }
    // La fiche doit exister avant de recevoir une pièce : un brouillon jamais
    // enregistré n'a pas d'identifiant auquel rattacher un fichier.
    if (!p.id && !await rampEnregistrerPoi(true)) return;

    // Contrôles avant l'envoi : un refus du serveur pour une raison qu'on peut
    // voir d'ici ne vaut pas un aller-retour.
    if (fichier) {
        const ext = `.${(fichier.name.split('.').pop() || '').toLowerCase()}`;
        if (!RAMP_PIECES_EXTENSIONS.includes(ext)) {
            err.textContent = `Format non accepté (${RAMP_PIECES_EXTENSIONS.join(', ')})`;
            return;
        }
        if (fichier.size > RAMP_PIECE_TAILLE_MAX) {
            err.textContent = `Fichier trop volumineux : ${rampTaille(fichier.size)} pour 25 Mo au plus`;
            return;
        }
    }

    const fd = new FormData();
    fd.append('intitule', intitule);
    fd.append('commentaire', commentaire);
    if (fichier) fd.append('file', fichier);
    const url = `${RAMP_API}/poi/${RAMP_STATE.poiEnCours.id}/pieces${pj ? `/${pj.id}` : ''}`;
    try {
        const r = await fetch(url, { method: 'POST', credentials: 'same-origin', body: fd });
        // La réponse n'est pas toujours du JSON : un intermédiaire réseau, une
        // page d'erreur d'hébergeur ou une coupure rendent du texte. On lit
        // d'abord, on interprète ensuite — sinon l'agent lit « JSON.parse »
        // au lieu de la cause.
        const brut = await r.text();
        let rep = {};
        try { rep = brut ? JSON.parse(brut) : {}; } catch (e) { rep = {}; }
        if (!r.ok || !rep.status) {
            throw new Error(rep.error
                || `Envoi refusé (HTTP ${r.status}${brut ? ` — ${brut.slice(0, 120)}` : ''})`);
        }
        rampFermerModal();
        await rampRechargerPieces();
        rampToast(pj ? 'Pièce mise à jour' : 'Pièce ajoutée');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function rampSupprimerPiece(id) {
    const p = RAMP_STATE.poiEnCours || {};
    const pj = (p.pieces || []).find((x) => x.id === id) || {};
    if (!confirm(`Supprimer la pièce « ${pj.intitule || ''} » ?`)) return;
    try {
        await rampApi(`/poi/${p.id}/pieces/${id}`, { method: 'DELETE' });
        await rampRechargerPieces();
        rampToast('Pièce supprimée');
    } catch (e) { rampToast(e.message || 'Suppression impossible', 'error'); }
}

// Seule la liste des pièces se recharge : le reste de la fiche est à l'écran,
// et une saisie en cours ne doit pas s'y perdre.
async function rampRechargerPieces() {
    const p = RAMP_STATE.poiEnCours;
    if (!p || !p.id) return;
    try {
        const r = await rampApi(`/poi/${p.id}/pieces`);
        p.pieces = r.pieces || [];
    } catch (e) { rampToast(e.message || 'Pièces indisponibles', 'error'); }
    const zone = document.getElementById('rampPoiPieces');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiPieces();
    rendreDefilement();
}

// ── Soumission et renvoi ──

async function rampSoumettrePoi() {
    const p = RAMP_STATE.poiEnCours;
    if (!confirm('Soumettre cette fiche pour validation ? Elle ne sera plus modifiable tant qu’elle n’est pas renvoyée.')) return;
    if (!await rampEnregistrerPoi(true)) return;
    try {
        await rampApi(`/poi/${p.id}/soumettre`, { method: 'POST', body: '{}' });
        await rampChargerPoi();
        await rampOuvrirPoi(p.id);
        rampToast('Fiche soumise pour validation');
    } catch (e) { rampToast(e.message || 'Soumission impossible', 'error'); }
}

// Le motif du renvoi, ce sont les commentaires de validation : la fenêtre ne
// redemande donc rien, elle confirme et rappelle ce qui sera transmis.
function rampRenvoyerPoi() {
    const p = RAMP_STATE.poiEnCours;
    const entrees = rampPoiPeutCommenter()
        ? (RAMP_STATE.poiCommentairesSaisie || []).filter((c) => (c.texte || '').trim())
        : ((rampPoiVersionCourante() || {}).entrees || []);
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">Renvoyer la fiche à l’inspecteur</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-note">
                    La fiche repasse en saisie chez son auteur. Les commentaires de validation
                    lui sont transmis comme motif du renvoi, et cette version est figée.
                </p>
                ${entrees.length ? `
                <div class="ramp-poi-version-corps">
                    ${entrees.map((c) => `
                        <div class="ramp-poi-commentaire-lu">
                            <i>${_rEsc(rampPoiLibelleCible(c.cible))}</i>
                            <div class="ramp-desc">${_rEsc(c.texte)}</div>
                        </div>`).join('')}
                </div>`
                : `<p class="ramp-erreur">Aucun commentaire enregistré : l’inspecteur ne saura pas
                   ce qui est attendu. Ajoutez-en avant de renvoyer, ou confirmez tout de même.</p>`}
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm ramp-btn-renvoi" onclick="rampConfirmerRenvoi()">
                    ${RAMP_ICONS.back} Confirmer le renvoi</button>
            </div>
        </div>
    </div>`);
}

async function rampConfirmerRenvoi() {
    const p = RAMP_STATE.poiEnCours;
    try {
        // Les commentaires en cours partent avec le renvoi : on les enregistre
        // avant de figer la version.
        if (rampPoiPeutCommenter()) await rampEnregistrerCommentaires(true);
        await rampApi(`/poi/${p.id}/renvoyer`, { method: 'POST', body: '{}' });
        rampFermerModal();
        await rampChargerPoi();
        await rampOuvrirPoi(p.id);
        rampToast('Fiche renvoyée à l’inspecteur');
    } catch (e) { rampToast(e.message || 'Renvoi impossible', 'error'); }
}

// ── Équipe d'inspection ──
// Les inspecteurs retenus, avec ce que le référentiel du portail dit d'eux au
// moment du choix : numéro, spécialité, niveau de qualification.

function rampPoiEquipe() {
    const p = RAMP_STATE.poiEnCours || {};
    const equipe = p.equipe || [];
    const fige = rampPoiFige();
    if (!equipe.length) {
        return `<p class="ramp-sous-titre" style="margin:.35rem 0 0;">
            ${fige ? 'Aucun inspecteur désigné.' : 'Aucun inspecteur désigné pour l’instant.'}</p>`;
    }
    return `<div class="ramp-poi-equipe">${equipe.map((m) => `
        <div class="ramp-poi-inspecteur">
            <div>
                <strong>${_rEsc(`${m.nom} ${m.prenom}`.trim())}</strong>
                ${m.numero ? `<span class="ramp-code">${_rEsc(m.numero)}</span>` : ''}
                <div class="ramp-desc">
                    ${_rEsc(m.specialite || 'Spécialité non renseignée')}${m.niveau
                        ? ` · ${_rEsc(m.niveau)}` : ''}
                </div>
            </div>
            ${fige ? '' : `<button class="btn btn-outline btn-sm ramp-btn-icone" title="Retirer"
                    onclick="rampPoiRetirerInspecteur(${_rArg(m.id)})">${RAMP_ICONS.x}</button>`}
        </div>`).join('')}</div>`;
}

function rampPoiAjouterInspecteur(id) {
    if (!id) return;
    const p = RAMP_STATE.poiEnCours;
    const i = rampPoiCtx().inspecteurs.find((x) => x.id === id);
    if (!i || (p.equipe || []).some((m) => m.id === id)) return;
    p.equipe = (p.equipe || []).concat([{
        id: i.id, nom: i.nom, prenom: i.prenom,
        numero: i.numero, specialite: i.specialite, niveau: i.niveau,
    }]);
    // Le champ texte reste renseigné pour ce que les états et les exports
    // lisent déjà : il suit la liste choisie.
    p.inspecteurs = p.equipe.map((m) => `${m.nom} ${m.prenom}`.trim()).join(', ');
    rampPoiRedessinerEquipe();
}

function rampPoiRetirerInspecteur(id) {
    const p = RAMP_STATE.poiEnCours;
    p.equipe = (p.equipe || []).filter((m) => m.id !== id);
    p.inspecteurs = p.equipe.map((m) => `${m.nom} ${m.prenom}`.trim()).join(', ');
    rampPoiRedessinerEquipe();
}

function rampPoiRedessinerEquipe() {
    const zone = document.getElementById('rampPoiEquipe');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiEquipe();
    rendreDefilement();
    // La liste déroulante ne propose plus ceux qui sont déjà retenus.
    const sel = zone.parentElement.querySelector('select');
    if (sel) {
        const p = RAMP_STATE.poiEnCours;
        sel.innerHTML = `<option value="">— Ajouter un inspecteur —</option>`
            + rampPoiCtx().inspecteurs
                .filter((i) => !(p.equipe || []).some((m) => m.id === i.id))
                .map((i) => `<option value="${_rAttr(i.id)}">${_rEsc(`${i.nom} ${i.prenom}`)}${
                    i.numero ? _rEsc(` — ${i.numero}`) : ''}</option>`).join('');
    }
}

// ── Enregistrement, validation, suppression ──

const rampPoiCorps = () => {
    const p = RAMP_STATE.poiEnCours;
    return {
        entete: p.entete, items: p.items, classe_action: p.classe_action,
        statut_suivi: p.statut_suivi, inspecteurs: p.inspecteurs, equipe: p.equipe || [],
        commentaires_pic: p.commentaires_pic, informations: p.informations,
    };
};

async function rampEnregistrerPoi(silencieux) {
    const p = RAMP_STATE.poiEnCours;
    try {
        if (p.id) {
            await rampApi(`/poi/${p.id}`, { method: 'PUT', body: JSON.stringify(rampPoiCorps()) });
        } else {
            const r = await rampApi('/poi', { method: 'POST', body: JSON.stringify(rampPoiCorps()) });
            p.id = r.id;
            p.reference = r.reference;
        }
        await rampChargerPoi();
        if (!silencieux) rampToast(`Brouillon enregistré — ${p.reference}`);
        return true;
    } catch (e) {
        rampToast(e.message || 'Enregistrement impossible', 'error');
        return false;
    }
}

// La validation se confirme dans une fenêtre qui rappelle ce qu'elle produit :
// une inspection et ses écarts aux états du module, et une fiche verrouillée.
function rampValiderPoi() {
    const p = RAMP_STATE.poiEnCours;
    const ctx = rampPoiCtx();
    const action = ctx.actions.find((a) => a.code === p.classe_action);
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">Valider l’inspection ${_rEsc(p.reference || '')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-note">
                    L’inspection et ses écarts sont inscrits aux états du module ; la fiche est
                    ensuite verrouillée.
                </p>
                <dl class="ramp-poi-recap">
                    <div class="ramp-poi-recap-ligne"><dt>Items contrôlés</dt>
                        <dd>${rampPoiControles()} / ${ctx.items.length}</dd></div>
                    <div class="ramp-poi-recap-ligne"><dt>Écarts</dt>
                        <dd>${rampPoiEcarts()}</dd></div>
                    <div class="ramp-poi-recap-ligne"><dt>Classe d’action</dt>
                        <dd>${_rEsc(action ? `${action.code} — ${action.label}` : '—')}</dd></div>
                </dl>
                ${/^(2|3)/.test(p.classe_action || '') ? `<p class="ramp-note ramp-note-renvoi">
                    Classe ${_rEsc(p.classe_action)} : une communication écrite à l’exploitant sera
                    requise à l’étape Transmission.</p>` : ''}
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm" onclick="rampConfirmerValidation()">Valider</button>
            </div>
        </div>
    </div>`);
}

async function rampConfirmerValidation() {
    const p = RAMP_STATE.poiEnCours;
    rampFermerModal();
    try {
        const r = await rampApi(`/poi/${p.id}/valider`, { method: 'POST', body: '{}' });
        rampToast(r.message || 'Inspection créée');
        // Les états lisent les inspections chargées au démarrage : elles
        // doivent connaître celle qui vient de naître.
        await rampLoadData();
        await rampOuvrirPoi(p.id);
    } catch (e) { rampToast(e.message || 'Validation impossible', 'error'); }
}

async function rampSupprimerPoi(id) {
    const p = RAMP_STATE.poi.liste.find((x) => x.id === id) || {};
    if (!confirm(`Supprimer la fiche ${p.reference || ''} ?`)) return;
    try {
        await rampApi(`/poi/${id}`, { method: 'DELETE' });
        if ((RAMP_STATE.poiEnCours || {}).id === id) RAMP_STATE.poiEnCours = null;
        await rampChargerPoi();
        rampToast('Fiche supprimée');
    } catch (e) { rampToast(e.message || 'Suppression impossible', 'error'); }
}

// Depuis une fiche validée, on rejoint l'inspection qu'elle a produite : les
// états s'ouvrent sur sa référence.
function rampVoirInspectionDuPoi() {
    const p = RAMP_STATE.poiEnCours || {};
    RAMP_STATE.poiEnCours = null;
    RAMP_STATE.voletRejouer = null;
    rampFermerSlider();
    RAMP_STATE.filtres.recherche = (p.entete || {}).immatriculation || '';
    rampNavigateTo('etats');
}

Object.assign(window, {
    RAMP_POI_VIDE, rampChargerPoi, rampPoiCtx, rampRenderPoi, rampPoiLignes,
    rampAjouterInspection, rampCartesPoi, rampPoiFiltrer, rampPoiFiltrerAvec, rampPoiFacette, rampPoiSetFiltre, rampPoiChercher, rampPoiReset, rampPoiRedessiner,
    rampNouveauPoi, rampOuvrirPoi, rampFermerPoi, rampPoiFige,
    rampPoiChamp, rampPoiMeta, rampPoiControle, rampPoiRemarque,
    rampPoiBasculerEcart, rampPoiEcart, rampPoiBasculerGroupe, rampPoiToutDeplier,
    rampPoiItems, rampPoiEntete, rampRenderPoiFiche, rampPoiCompteur,
    rampEnregistrerPoi, rampValiderPoi, rampSupprimerPoi, rampVoirInspectionDuPoi,
    rampPoiChampOuvert, rampPoiRedessinerEntete, rampPoiAjuster,
    rampPoiPieces, rampPoiPiecesModifiables, rampOuvrirPiece, rampEnregistrerPiece,
    rampSupprimerPiece, rampRechargerPieces,
    RAMP_POI_ETAPES, rampPoiEtape, rampPoiFil, rampPoiActions, rampPoiEtapeInfo,
    rampSoumettrePoi, rampRenvoyerPoi,
    rampOuvrirSelecteurAeronef, rampChercherAeronefPoi, rampChoisirAeronef,
    rampSelecteurAeronefHtml, rampSelecteurAeronefLignes,
    rampPoiRangAtteint, rampPoiDate, rampPoiMotifRenvoi, rampConfirmerValidation,
    rampPoiVoletOuvert, rampPoiBasculerVolet, rampPoiVoletEntete,
    RAMP_POI_CIBLES_ENVOI, rampPoiCommunicationRequise, rampPoiAutorite,
    rampPoiLettre, rampPoiObjet, rampPoiEnvoiHtml, rampPoiReinitialiserLettre,
    rampEnvoyerCommunication, rampConfirmerRenvoi, rampPoiQuand, rampPoiCibles, rampPoiLibelleCible, rampPoiCommentaires,
    rampPoiVersionCourante, rampPoiPeutCommenter, rampPoiBasculerCommentaires,
    rampPoiBasculerVersion, rampPoiAjouterCommentaire, rampPoiRetirerCommentaire,
    rampPoiCommentaireChamp, rampPoiRedessinerCommentaires, rampEnregistrerCommentaires,
    rampPoiClasseAutomatique, rampPoiEquipe, rampPoiAjouterInspecteur,
    rampPoiRetirerInspecteur, rampPoiRedessinerEquipe, rampVoletPoi, rampPoiVue, rampPoiVoirEtape, rampPoiBande, rampPoiVueSaisie,
    rampPoiVueValidation, rampPoiVueTransmission, rampPoiOuvrirPartage, rampPoiPartager,
});
