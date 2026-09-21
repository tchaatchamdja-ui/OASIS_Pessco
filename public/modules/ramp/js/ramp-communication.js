/* OASIS — Module « RAMP Inspections »
 * Menu « Partages » : ce que les États membres mettent en commun.
 *
 * Trois sous-menus. Les écarts régionaux d'abord : tous les constats relevés
 * par les États membres, quelle que soit l'AAC qui tient l'inspection — la
 * seule lecture du module qui franchisse les instances, et le point de départ
 * d'une requête. Viennent ensuite les requêtes elles-mêmes, puis les
 * transmissions qu'un État met à la disposition des autres.
 *
 * Un État écrit à un ou plusieurs autres au sujet d'une inspection, parfois
 * d'un écart précis. Le fil reste attaché à ce dont il parle, accepte des
 * pièces jointes de part et d'autre, et se referme quand la question est
 * épuisée. Écran réservé à la vue AAC : entre États, pas avec l'exploitant.
 */

const RAMP_COM = {
    chargement: false, demande: false,
    requetes: [], etats: [], mesEtats: [], peutEcrire: false,
    filtres: { statut: '', etat: '', recherche: '' },
    // Requête ouverte en volet, et brouillon de la requête en cours de saisie.
    ouverte: null,
    brouillon: null,
    // Pièces déposées avant l'envoi : elles n'existent au serveur qu'une fois
    // la requête ou l'échange créé, on les garde donc ici en attendant.
    enAttente: [],
    // Sous-menu affiché : les écrans s'ouvrent sur les écarts régionaux, d'où
    // partent les requêtes ; viennent ensuite les requêtes elles-mêmes et les
    // transmissions mises à disposition par d'autres États.
    onglet: 'regional',
    // Écarts relevés par tous les États : les inspections arrivent avec les
    // leurs, comme sur les écrans du module.
    regionales: [], regionalDemande: false, regionalChargement: false,
    // Pièces d'un constat ouvertes en volet, en lecture seule.
    preuvesOuvertes: null,
    filtresRegional: { etat: '', exploitant: '', categorie: '', recherche: '' },
    partages: [], partagesDemandes: false, partageOuvert: null,
    // Lettres d'un partage dépliées : repliées d'office — on vient d'abord y
    // chercher les pièces jointes.
    partageLettres: {},
};

const rampComPeut = () => !rampVuePrestataire();

async function rampChargerRequetes() {
    if (RAMP_COM.chargement) return;
    RAMP_COM.chargement = true;
    try {
        const r = await rampApi('/requetes');
        RAMP_COM.requetes = r.requetes || [];
        RAMP_COM.etats = r.etats || [];
        RAMP_COM.mesEtats = r.mes_etats || [];
        RAMP_COM.peutEcrire = !!r.peut_ecrire;
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
        RAMP_COM.requetes = [];
    }
    RAMP_COM.chargement = false;
    rampRenderPage();
}

async function rampChargerPartages() {
    try {
        const r = await rampApi('/partages');
        RAMP_COM.partages = r.partages || [];
        if (!RAMP_COM.etats.length) RAMP_COM.etats = r.etats || [];
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
        RAMP_COM.partages = [];
    }
    rampRenderPage();
}

// Les écarts de tous les États. Une seule route, et elle ne sert qu'à lire :
// ce que l'écran en fait, c'est une table et des requêtes.
async function rampChargerEcartsRegionaux() {
    RAMP_COM.regionalChargement = true;
    try {
        const r = await rampApi('/ecarts-regionaux');
        RAMP_COM.regionales = r.inspections || [];
        if (!RAMP_COM.etats.length) RAMP_COM.etats = r.etats || [];
        if (!RAMP_COM.mesEtats.length) RAMP_COM.mesEtats = r.mes_etats || [];
        // L'écran s'ouvre sur cet onglet : le bouton de requête doit savoir
        // s'il a lieu d'être sans attendre le chargement des requêtes.
        RAMP_COM.peutEcrire = !!r.peut_ecrire;
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
        RAMP_COM.regionales = [];
    }
    RAMP_COM.regionalChargement = false;
    rampRenderPage();
}

function rampComOnglet(cle) {
    RAMP_COM.onglet = cle;
    if (cle === 'partages' && !RAMP_COM.partagesDemandes) {
        RAMP_COM.partagesDemandes = true;
        setTimeout(rampChargerPartages, 0);
    }
    rampRenderPage();
}

// L'inspection d'un écart régional, pour l'aperçu du rapport : elle ne figure
// pas dans les données de l'instance, l'écran la tient de sa propre liste.
const rampComInspectionRegionale = (id) => (RAMP_COM.regionales || []).find((i) => i.id === id) || null;

// ══════════════════════════════════════
//  Liste des requêtes
// ══════════════════════════════════════

function rampComFiltrees() {
    const F = RAMP_COM.filtres;
    const q = _rNorm(F.recherche);
    return RAMP_COM.requetes.filter((r) => {
        if (F.statut && r.statut !== F.statut) return false;
        if (F.etat && r.etat_emetteur !== F.etat
            && !(r.etats_destinataires || []).includes(F.etat)) return false;
        if (!q) return true;
        const ref = r.objet_reference || {};
        return [r.objet, r.message, ref.poi_reference, ref.exploitant, ref.immatriculation,
            // Les items de tous les constats visés, et non du seul premier.
            rampComEcartsVises(ref).map((e) => e.item).join(' ')]
            .some((v) => _rNorm(v).includes(q));
    });
}

function rampComFiltre(cle, valeur) {
    RAMP_COM.filtres[cle] = valeur;
    rampRenderPage();
}

function rampComReset() {
    RAMP_COM.filtres = { statut: '', etat: '', recherche: '' };
    rampRenderPage();
}

const rampComEtats = () => (RAMP_COM.etats.length ? RAMP_COM.etats : (RAMP_STATE.etatsInspection || []));

// Ce dont la requête parle, en une ligne.
function rampComObjetLigne(r) {
    const o = r.objet_reference || {};
    if (!o.exploitant && !o.poi_reference) return `<span class="ramp-vide">—</span>`;
    const bouts = [
        o.poi_reference ? `<strong class="ramp-code">${_rEsc(o.poi_reference)}</strong>` : '',
        o.exploitant ? _rEsc(o.exploitant) : '',
        o.immatriculation ? _rEsc(o.immatriculation) : '',
        o.date ? _rEsc(rampDate(o.date)) : '',
        // Une requête peut viser plusieurs constats : chacun porte son item.
        rampComEcartsVises(o).map((e) => (e.item
            ? `<span class="ramp-badge items">${_rEsc(e.item)}</span>` : '')).join(' '),
    ].filter(Boolean);
    return bouts.join(' · ');
}

function rampRenderCommunication() {
    if (!rampComPeut()) {
        return `<div class="ramp-card"><p class="ramp-sous-titre">${rt('com_reserve_aac')}</p></div>`;
    }
    if (!RAMP_COM.demande) {
        RAMP_COM.demande = true;
        setTimeout(rampChargerRequetes, 0);
    }
    const liste = rampComFiltrees();
    const F = RAMP_COM.filtres;
    const onglet = (cle, libelle) => `<button class="ramp-onglet${RAMP_COM.onglet === cle ? ' actif' : ''}"
        onclick="rampComOnglet(${_rArg(cle)})">${libelle}</button>`;

    const onglets = `<div class="ramp-onglets">
        ${onglet('regional', rt('com_onglet_regional'))}
        ${onglet('requetes', rt('com_onglet_requetes'))}
        ${onglet('partages', rt('com_onglet_partages'))}
    </div>`;

    if (RAMP_COM.onglet === 'regional') {
        return `
        <div class="ramp-page-header"><h2>${rt('nav_partages')}</h2></div>
        ${onglets}
        ${rampComRegionalHtml()}`;
    }

    if (RAMP_COM.onglet === 'partages') {
        return `
        <div class="ramp-page-header"><h2>${rt('nav_partages')}</h2></div>
        ${onglets}
        ${rampComPartagesHtml()}`;
    }

    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_partages')}</h2>
        ${RAMP_COM.peutEcrire ? `<button class="btn btn-primary btn-sm" onclick="rampComNouvelle()">
            ${RAMP_ICONS.add} ${rt('com_nouvelle')}</button>` : ''}
    </div>
    ${onglets}
    <div class="ramp-filtres ramp-com-filtres">
        <select class="ramp-select" onchange="rampComFiltre('statut', this.value)">
            <option value="">${rt('com_tous_statuts')}</option>
            <option value="ouverte" ${F.statut === 'ouverte' ? 'selected' : ''}>${rt('com_ouverte')}</option>
            <option value="close" ${F.statut === 'close' ? 'selected' : ''}>${rt('com_close')}</option>
        </select>
        <select class="ramp-select" onchange="rampComFiltre('etat', this.value)">
            <option value="">${rt('com_tous_etats')}</option>
            ${rampComEtats().map((e) => `<option value="${_rAttr(e)}"
                ${F.etat === e ? 'selected' : ''}>${_rEsc(e)}</option>`).join('')}
        </select>
        <input class="ramp-input" placeholder="${_rAttr(rt('com_rechercher'))}"
               value="${_rAttr(F.recherche)}" oninput="rampComFiltre('recherche', this.value)">
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampComReset()"
                title="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:110px;">${rt('com_c_date')}</th>
                    <th style="width:22%;">${rt('com_c_objet')}</th>
                    <th>${rt('com_c_reference')}</th>
                    <th style="width:120px;">${rt('com_c_emetteur')}</th>
                    <th style="width:18%;">${rt('com_c_destinataires')}</th>
                    <th style="width:80px;text-align:center;">${rt('com_c_echanges')}</th>
                    <th style="width:100px;">${rt('c_statut')}</th>
                    <th style="width:70px;text-align:center;">${rt('c_voir')}</th>
                </tr></thead>
                <tbody>${RAMP_COM.chargement
                    ? `<tr><td colspan="8" class="ramp-table-vide">${rt('u_chargement')}</td></tr>`
                    : (liste.length
                        ? liste.map(rampComLigne).join('')
                        : `<tr><td colspan="8" class="ramp-table-vide">${rt('com_aucune')}</td></tr>`)}
                </tbody>
            </table>
        </div>
    </div>`;
}

function rampComLigne(r) {
    const close = r.statut === 'close';
    const pieces = (r.pieces || []).length
        + (r.echanges || []).reduce((n, e) => n + (e.pieces || []).length, 0);
    return `<tr${close ? ' style="opacity:.6;"' : ''}>
        <td>${_rEsc(rampDate((r.cree_le || '').slice(0, 10)))}</td>
        <td><strong>${_rEsc(r.objet)}</strong></td>
        <td>${rampComObjetLigne(r)}</td>
        <td>${_rEsc(r.etat_emetteur || '—')}</td>
        <td>${(r.etats_destinataires || []).map((e) =>
            `<span class="ramp-badge items">${_rEsc(e)}</span>`).join(' ')}</td>
        <td style="text-align:center;">${(r.echanges || []).length}${pieces
            ? ` <span class="ramp-sous-titre">· ${pieces} ${RAMP_ICONS.upload ? '' : ''}📎</span>` : ''}</td>
        <td><span class="ramp-badge ${close ? 'zero' : 'ecarts'}">
            ${close ? rt('com_close') : rt('com_ouverte')}</span></td>
        <td class="ramp-cell-actions">
            <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampComOuvrir(${_rArg(r.id)})"
                    title="${_rAttr(rt('com_ouvrir_fil'))}">${RAMP_ICONS.eye}</button>
        </td>
    </tr>`;
}

// ══════════════════════════════════════
//  Écarts relevés par tous les États
// ══════════════════════════════════════
// La table des constats du dispositif entier. Chaque ligne mène à deux gestes :
// lire le rapport de l'inspection qui l'a relevé — il se consulte quel que soit
// l'État qui le tient —, ou ouvrir une requête déjà remplie de ce que l'écart
// dit de lui-même.

function rampComRegFiltre(cle, valeur) {
    RAMP_COM.filtresRegional[cle] = valeur;
    rampRenderPage();
}

function rampComRegReset() {
    RAMP_COM.filtresRegional = { etat: '', exploitant: '', categorie: '', recherche: '' };
    rampRenderPage();
}

// Les écarts à plat, chacun portant son inspection, comme sur l'écran « Écarts »
// du module.
function rampComRegEcarts() {
    const F = RAMP_COM.filtresRegional;
    const q = _rNorm(F.recherche);
    const lignes = [];
    (RAMP_COM.regionales || []).forEach((i) => {
        if (F.etat && i.pays !== F.etat) return;
        if (F.exploitant && i.exploitant !== F.exploitant) return;
        (i.anomalies || []).forEach((a) => {
            if (F.categorie && String(a.categorie) !== F.categorie) return;
            if (q && ![a.itemCode, a.description, a.stdRef, a.suivi,
                i.exploitant, i.immatriculation, i.aeronef, i.poi_reference, i.pays]
                .some((v) => _rNorm(v).includes(q))) return;
            lignes.push({ ...a, inspection: i });
        });
    });
    return lignes;
}

// Valeurs encore proposables : celles que porte la liste régionale, non celles
// de l'instance — ce sont les exploitants de tous les États qu'on filtre ici.
const rampComRegValeurs = (champ) => [...new Set((RAMP_COM.regionales || [])
    .map((i) => i[champ]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr'));

// Les années couvertes par les inspections du dispositif, la plus récente
// d'abord — celles de l'instance ne suffisent plus à désigner ce dont une
// requête parle.
const rampComRegAnnees = () => [...new Set((RAMP_COM.regionales || [])
    .map((i) => String(i.date || '').slice(0, 4)).filter((a) => /^\d{4}$/.test(a)))]
    .sort((a, b) => Number(b) - Number(a));

function rampComRegionalHtml() {
    if (!RAMP_COM.regionalDemande) {
        RAMP_COM.regionalDemande = true;
        setTimeout(rampChargerEcartsRegionaux, 0);
    }
    const F = RAMP_COM.filtresRegional;
    const lignes = rampComRegEcarts();
    const etats = new Set(lignes.map((a) => a.inspection.pays).filter(Boolean));
    const cats = rampFamille('categories');
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${
        String(cur) === String(v) ? 'selected' : ''}>${_rEsc(l)}</option>`;

    return `
    <p class="ramp-note">${rt('reg_aide')}</p>
    <div class="ramp-filtres">
        <select class="ramp-select" onchange="rampComRegFiltre('etat', this.value)">
            <option value="">${rt('f_etats')}</option>
            ${rampComRegValeurs('pays').map((v) => opt(v, v, F.etat)).join('')}
        </select>
        <select class="ramp-select" onchange="rampComRegFiltre('exploitant', this.value)">
            <option value="">${rt('f_exploitants')}</option>
            ${rampComRegValeurs('exploitant').map((v) => opt(v, v, F.exploitant)).join('')}
        </select>
        <select class="ramp-select" onchange="rampComRegFiltre('categorie', this.value)">
            <option value="">${rt('f_categories')}</option>
            ${['1', '2', '3'].map((c) => {
        const t = cats.find((x) => String(x.code) === c);
        return opt(c, t ? t.label : c, F.categorie);
    }).join('')}
        </select>
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${_rAttr(rt('f_rechercher'))}…" value="${_rAttr(F.recherche)}"
                   oninput="rampComRegFiltre('recherche', this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampComRegReset()"
                title="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>
    <p class="ramp-sous-titre">${rt('reg_resume', lignes.length, etats.size)}</p>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:95px;">${rt('c_date')}</th>
                    <th style="width:110px;">${rt('c_etat')}</th>
                    <th style="width:15%;">${rt('c_exploitant')}</th>
                    <th style="width:105px;">${rt('c_immat_court')}</th>
                    <th style="width:75px;">${rt('c_item')}</th>
                    <th>${rt('c_description')}</th>
                    <th style="width:70px;text-align:center;">${rt('c_categorie')}</th>
                    <th style="width:110px;">${rt('c_statut')}</th>
                    <th style="width:112px;text-align:center;">${rt('c_voir')}</th>
                </tr></thead>
                <tbody>${RAMP_COM.regionalChargement
        ? `<tr><td colspan="9" class="ramp-table-vide">${rt('u_chargement')}</td></tr>`
        : (lignes.length
            ? lignes.map(rampComRegLigne).join('')
            : `<tr><td colspan="9" class="ramp-table-vide">${rt('reg_aucun')}</td></tr>`)}
                </tbody>
            </table>
        </div>
    </div>`;
}

function rampComRegLigne(a) {
    const i = a.inspection;
    const pieces = (a.preuves || []).length;
    return `<tr>
        <td style="white-space:nowrap;">${_rEsc(rampDate(i.date))}</td>
        <td>${_rEsc(i.pays || '—')}</td>
        <td><strong>${_rEsc(i.exploitant || '—')}</strong></td>
        <td>${_rEsc(i.immatriculation || '—')}</td>
        <td><strong class="ramp-code">${_rEsc(a.itemCode || '—')}</strong></td>
        <td class="ramp-ecart-desc">${_rEsc(a.description || '—')}</td>
        <td style="text-align:center;">${rampBadgeCat(a.categorie)}</td>
        <td>${_rEsc(a.suivi || i.status || '—')}</td>
        <td class="ramp-cell-actions">
            <button class="btn btn-outline btn-sm ramp-btn-icone"
                    onclick="rampOuvrirApercu(${_rArg(i.id)})"
                    title="${_rAttr(rt('reg_rapport'))}">${RAMP_ICONS.eye}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone ramp-btn-marque"
                    ${pieces ? '' : 'disabled'}
                    onclick="rampComPreuvesEcart(${_rArg(i.id)}, ${_rArg(a.id)})"
                    title="${_rAttr(pieces ? `${rt('reg_pieces')} (${pieces})` : rt('reg_pieces_aucune'))}">
                ${RAMP_ICONS.upload}
                ${pieces ? `<span class="ramp-btn-badge">${pieces}</span>` : ''}</button>
            ${RAMP_COM.peutEcrire ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                    onclick="rampComRequeteEcart(${_rArg(i.id)}, ${_rArg(a.id)})"
                    title="${_rAttr(rt('reg_requete'))}">${RAMP_ICONS.contacts}</button>` : ''}
        </td>
    </tr>`;
}

// ── Pièces d'un constat, en lecture seule ──
// Ce que l'État qui a relevé l'écart a déposé pour en suivre la correction :
// on le lit et on le télécharge, on n'y touche pas. Le volet de suivi du
// module, lui, sert à déposer — ce n'est pas ce qu'on fait chez un voisin.
function rampComPreuvesEcart(inspectionId, ecartId) {
    const insp = rampComInspectionRegionale(inspectionId);
    const ec = insp ? (insp.anomalies || []).find((a) => a.id === ecartId) : null;
    if (!ec) return;
    RAMP_COM.preuvesOuvertes = { inspection: insp, ecart: ec };
    rampComVoletPreuves();
}

function rampComVoletPreuves() {
    const o = RAMP_COM.preuvesOuvertes;
    if (!o) return;
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.upload}</span>
            <span class="ramp-slider-titre">${rt('reg_pieces')} — ${_rEsc(o.ecart.itemCode || '')}</span>
        </div>
        <div class="ramp-slider-body">${rampComPreuvesHtml(o)}</div>`, 'moitie');
    RAMP_STATE.voletRejouer = rampComVoletPreuves;
}

function rampComPreuvesHtml(o) {
    const i = o.inspection;
    const e = o.ecart;
    const ligne = (cle, valeur) => (valeur
        ? `<div class="ramp-poi-recap-ligne"><i>${rt(cle)}</i><span>${_rEsc(valeur)}</span></div>` : '');
    const pieces = e.preuves || [];
    return `
    <p class="ramp-note">${rt('reg_pieces_aide')}</p>
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">A</span>${rt('reg_designe')}</div>
        <div class="ramp-poi-recap">
            ${ligne('c_poi', i.poi_reference)}
            ${ligne('c_date', i.date ? rampDate(i.date) : '')}
            ${ligne('c_etat', i.pays)}
            ${ligne('c_exploitant', i.exploitant)}
            ${ligne('c_immat_court', i.immatriculation)}
            ${ligne('c_item', e.itemCode)}
            ${ligne('c_description', e.description)}
        </div>
    </div>
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">B</span>${rt('pr_toutes')}</div>
        ${pieces.length ? `<div class="ramp-preuves-liste">
            ${pieces.map((p) => `<a class="ramp-preuve-ligne" style="text-decoration:none;"
                href="${RAMP_API}/ecarts/${encodeURIComponent(e.id)}/preuves/${encodeURIComponent(p.id)}/fichier">
                <span>${RAMP_ICONS.download} ${_rEsc(p.intitule || p.nom_origine)}</span>
                <span class="ramp-sous-titre">${_rEsc(p.nom_origine || '')} ·
                    ${Math.round((p.taille || 0) / 1024)} Ko</span>
            </a>`).join('')}
        </div>` : `<p class="ramp-sous-titre">${rt('reg_pieces_aucune')}</p>`}
    </div>`;
}

// ══════════════════════════════════════
//  Éléments partagés par d'autres États
// ══════════════════════════════════════
// Ce que d'autres États ont mis à disposition : des copies figées, à lire et à
// télécharger. Rien ne s'y modifie.

function rampComPartagesHtml() {
    const liste = RAMP_COM.partages;
    if (!RAMP_COM.partagesDemandes) {
        RAMP_COM.partagesDemandes = true;
        setTimeout(rampChargerPartages, 0);
    }
    return `
    <p class="ramp-note">${rt('par_liste_aide')}</p>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:110px;">${rt('com_c_date')}</th>
                    <th style="width:110px;">${rt('c_poi')}</th>
                    <th>${rt('com_c_reference')}</th>
                    <th style="width:120px;">${rt('par_partage_par')}</th>
                    <th style="width:16%;">${rt('com_c_destinataires')}</th>
                    <th style="width:150px;">${rt('par_contenu')}</th>
                    <th style="width:70px;text-align:center;">${rt('c_voir')}</th>
                </tr></thead>
                <tbody>${liste.length ? liste.map((pa) => {
                    const o = pa.objet_reference || {};
                    return `<tr>
                        <td>${_rEsc(rampDate((pa.partage_le || '').slice(0, 10)))}</td>
                        <td><strong class="ramp-code">${_rEsc(pa.reference || '—')}</strong></td>
                        <td>${[o.exploitant, o.immatriculation, o.date ? rampDate(o.date) : '']
                            .filter(Boolean).map(_rEsc).join(' · ')}</td>
                        <td>${_rEsc(pa.partage_etat || pa.partage_par || '—')}</td>
                        <td>${(pa.etats || []).map((e) =>
                            `<span class="ramp-badge items">${_rEsc(e)}</span>`).join(' ')}</td>
                        <td>${(pa.communications || []).length} ${rt('par_lettres')} ·
                            ${(pa.pieces || []).length} ${rt('par_pj')}</td>
                        <td class="ramp-cell-actions">
                            <button class="btn btn-outline btn-sm ramp-btn-icone"
                                    onclick="rampComOuvrirPartage(${_rArg(pa.id)})"
                                    title="${_rAttr(rt('par_consulter'))}">${RAMP_ICONS.eye}</button>
                        </td>
                    </tr>`;
                }).join('') : `<tr><td colspan="7" class="ramp-table-vide">${rt('par_aucun')}</td></tr>`}
                </tbody>
            </table>
        </div>
    </div>`;
}

async function rampComOuvrirPartage(id) {
    try {
        RAMP_COM.partageOuvert = await rampApi(`/partages/${encodeURIComponent(id)}`);
        rampVoletPartage();
    } catch (e) { rampToast(e.message || rt('m_chargement_impossible'), 'error'); }
}

function rampVoletPartage() {
    const pa = RAMP_COM.partageOuvert;
    if (!pa) return;
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.clipboard}</span>
            <span class="ramp-slider-titre">${rt('par_titre_volet')} — ${_rEsc(pa.reference || '')}</span>
        </div>
        <div class="ramp-slider-body">${rampComPartageHtml(pa)}</div>`, 'deux-tiers');
    RAMP_STATE.voletRejouer = rampVoletPartage;
}

function rampComBasculerLettre(cle) {
    RAMP_COM.partageLettres[cle] = !RAMP_COM.partageLettres[cle];
    rampVoletPartage();
}

function rampComPartageHtml(pa) {
    const o = pa.objet_reference || {};
    const ligne = (cle, valeur) => (valeur
        ? `<div class="ramp-poi-recap-ligne"><i>${rt(cle)}</i><span>${_rEsc(valeur)}</span></div>` : '');
    const titreLettre = (c) => (c.cible === 'exploitant' ? rt('par_notif_exploitant') : rt('par_notif_autorite'));

    return `
    <p class="ramp-note">${rt('par_lecture_seule')}</p>
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">A</span>${rt('par_inspection')}</div>
        <div class="ramp-poi-recap">
            ${ligne('c_poi', o.poi_reference)}
            ${ligne('c_date', o.date ? rampDate(o.date) : '')}
            ${ligne('c_etat', o.pays)}
            ${ligne('c_exploitant', o.exploitant)}
            ${ligne('c_aeronef', o.aeronef)}
            ${ligne('c_immat_court', o.immatriculation)}
            ${ligne('par_classe', o.classe_action)}
            ${ligne('par_partage_par', pa.partage_etat || pa.partage_par)}
        </div>
    </div>

    ${(pa.pieces || []).length ? `
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">B</span>${rt('par_pieces_jointes')}</div>
        <div class="ramp-preuves-liste">
            ${pa.pieces.map((p) => `<a class="ramp-preuve-ligne" style="text-decoration:none;"
                href="${RAMP_API}/partages/${encodeURIComponent(pa.id)}/pieces/${encodeURIComponent(p.id)}/fichier">
                <span>${RAMP_ICONS.download} ${_rEsc(p.intitule || p.nom_origine)}</span>
                <span class="ramp-sous-titre">${Math.round((p.taille || 0) / 1024)} Ko</span>
            </a>`).join('')}
        </div>
    </div>` : ''}

    ${(pa.communications || []).map((c, i) => {
        const cle = `${pa.id}:${i}`;
        const ouvert = !!RAMP_COM.partageLettres[cle];
        return `
    <div class="ramp-card ramp-card-bandeau">
        <button class="ramp-card-entete ramp-com-lettre-tete" type="button" aria-expanded="${ouvert}"
                onclick="rampComBasculerLettre(${_rArg(cle)})">
            <span class="ramp-extension${ouvert ? ' ouvert' : ''}">${RAMP_ICONS.chevronBas}</span>
            <span style="flex:1;">${titreLettre(c)}</span>
            <span class="ramp-poi-envoi-etat">${_rEsc(rampDate((c.envoye_le || '').slice(0, 10)))}</span>
        </button>
        ${ouvert ? `<div class="ramp-com-lettre-corps">
            <div class="ramp-poi-recap">
                ${ligne('com_c_destinataires', c.destinataire)}
                ${ligne('com_objet', c.objet)}
            </div>
            <pre class="ramp-poi-lettre-figee">${_rEsc(c.message)}</pre>
        </div>` : ''}
    </div>`;
    }).join('')}`;
}

// ══════════════════════════════════════
//  Nouvelle requête
// ══════════════════════════════════════
// Le demandeur désigne d'abord ce dont il parle : les filtres du module servent
// à retrouver l'inspection, puis l'écart s'il y en a un.

function rampComNouvelle() {
    // La désignation puise dans la liste régionale : si l'on arrive ici sans
    // être passé par les écarts régionaux, elle se charge maintenant.
    if (!RAMP_COM.regionalDemande) {
        RAMP_COM.regionalDemande = true;
        setTimeout(rampChargerEcartsRegionaux, 0);
    }
    RAMP_COM.brouillon = {
        objet: '', message: '',
        etats_destinataires: [],
        etat_emetteur: RAMP_COM.mesEtats[0] || '',
        inspection_id: '', ecart_ids: [],
        cible: { annee: '', etat: '', exploitant: '', immatriculation: '', recherche: '' },
    };
    RAMP_COM.enAttente = [];
    rampVoletCommunication();
}

// Requête ouverte depuis un écart régional. Ce que l'écart dit de lui-même
// remplit le formulaire : l'inspection et le constat sont désignés, l'objet et
// le message les reprennent, et l'État qui a conduit l'inspection est coché —
// c'est lui qui sait ce qu'il en est advenu. On n'écrit pas au sien.
function rampComRequeteEcart(inspectionId, ecartId) {
    const insp = rampComInspectionRegionale(inspectionId);
    if (!insp) return;
    const ec = (insp.anomalies || []).find((a) => a.id === ecartId) || null;
    const miens = RAMP_COM.mesEtats || [];
    RAMP_COM.brouillon = {
        objet: rt('com_objet_ecart', ec ? (ec.itemCode || '') : '',
            insp.exploitant || '', insp.immatriculation || ''),
        message: ec ? rt('com_message_ecart', ec.itemCode || '', rampDate(insp.date),
            insp.immatriculation || '', insp.exploitant || '', ec.description || '') : '',
        etats_destinataires: (insp.pays && !miens.includes(insp.pays)) ? [insp.pays] : [],
        etat_emetteur: miens[0] || '',
        inspection_id: inspectionId,
        ecart_ids: ec ? [ec.id] : [],
        // L'inspection visée ne figure pas dans les données de l'instance : le
        // brouillon la porte, sans quoi le formulaire ne pourrait pas la
        // montrer ni dire ce qu'il désigne.
        designation: { inspection: insp, ecart: ec },
        cible: { annee: '', etat: '', exploitant: '', immatriculation: '', recherche: '' },
    };
    RAMP_COM.enAttente = [];
    rampVoletCommunication();
}

// Revenir au choix ordinaire : la désignation tombe, le formulaire retrouve
// ses filtres et sa table d'inspections.
function rampComRetirerDesignation() {
    if (!RAMP_COM.brouillon) return;
    RAMP_COM.brouillon.designation = null;
    RAMP_COM.brouillon.inspection_id = '';
    RAMP_COM.brouillon.ecart_ids = [];
    rampVoletCommunication();
}

// Inspections répondant aux filtres de désignation. Une requête s'adresse à un
// autre État au sujet de ce qu'il a inspecté : c'est donc la liste régionale
// qu'on parcourt — toutes les inspections du dispositif, et non les seules que
// l'instance tient.
function rampComInspections() {
    const c = (RAMP_COM.brouillon || {}).cible || {};
    const q = _rNorm(c.recherche);
    return (RAMP_COM.regionales || []).filter((i) => {
        if (c.annee && String(i.date || '').slice(0, 4) !== String(c.annee)) return false;
        if (c.etat && i.pays !== c.etat) return false;
        if (c.exploitant && i.exploitant !== c.exploitant) return false;
        if (c.immatriculation && i.immatriculation !== c.immatriculation) return false;
        if (!q) return true;
        return [i.poi_reference, i.exploitant, i.immatriculation, i.vol, i.aeronef]
            .some((v) => _rNorm(v).includes(q));
    }).slice(0, 40);
}

function rampComCible(cle, valeur) {
    RAMP_COM.brouillon.cible[cle] = valeur;
    // Changer les filtres invalide le choix précédent.
    RAMP_COM.brouillon.inspection_id = '';
    RAMP_COM.brouillon.ecart_ids = [];
    rampVoletCommunication();
}

function rampComChoisirInspection(id) {
    RAMP_COM.brouillon.inspection_id = id;
    RAMP_COM.brouillon.ecart_ids = [];
    rampVoletCommunication();
}

// Une requête vise un constat, plusieurs, ou l'inspection entière : on coche
// ce dont on veut parler.
function rampComBasculerEcart(id) {
    const b = RAMP_COM.brouillon;
    b.ecart_ids = b.ecart_ids || [];
    const rang = b.ecart_ids.indexOf(id);
    if (rang >= 0) b.ecart_ids.splice(rang, 1); else b.ecart_ids.push(id);
    rampVoletCommunication();
}

// L'inspection désignée, où qu'elle vienne : la liste régionale la porte, et
// le brouillon ouvert depuis un écart régional la porte lui-même.
function rampComInspectionDesignee(b) {
    if (b.designation && b.designation.inspection) return b.designation.inspection;
    return rampComInspectionRegionale(b.inspection_id)
        || (RAMP_STATE.data.inspections || []).find((i) => i.id === b.inspection_id)
        || null;
}

// Les constats de l'inspection désignée, à cocher. Sans écart, rien ne
// s'affiche : la requête porte alors sur l'inspection entière.
function rampComEcartsChoixHtml(b) {
    const insp = rampComInspectionDesignee(b);
    const ecarts = insp ? (insp.anomalies || []) : [];
    if (!ecarts.length) return '';
    const retenus = b.ecart_ids || [];
    return `
        <div class="ramp-champ" style="margin-top:.7rem;">
            <label>${rt('com_ecart_vise')}</label>
            <p class="ramp-sous-titre">${rt('com_ecarts_aide')}</p>
            <div class="ramp-com-etats ramp-com-ecarts">
                ${ecarts.map((e) => `<label class="ramp-com-etat">
                    <input type="checkbox" ${retenus.includes(e.id) ? 'checked' : ''}
                           onchange="rampComBasculerEcart(${_rArg(e.id)})">
                    <span><strong class="ramp-code">${_rEsc(e.itemCode || '—')}</strong>
                        ${_rEsc((e.description || '').slice(0, 60))}</span>
                </label>`).join('')}
            </div>
        </div>`;
}

function rampComBasculerEtat(etat) {
    const d = RAMP_COM.brouillon.etats_destinataires;
    const i = d.indexOf(etat);
    if (i >= 0) d.splice(i, 1); else d.push(etat);
    rampVoletCommunication();
}

function rampComSaisie(cle, valeur) {
    RAMP_COM.brouillon[cle] = valeur;
}

// Pièces choisies avant l'envoi : elles montent au serveur une fois la requête
// créée, sinon elles n'auraient rien à quoi se rattacher.
function rampComJoindre(input) {
    [...(input.files || [])].forEach((f) => RAMP_COM.enAttente.push(f));
    input.value = '';
    rampVoletCommunication();
}

function rampComRetirerPiece(rang) {
    RAMP_COM.enAttente.splice(rang, 1);
    rampVoletCommunication();
}

async function rampComDeposerPieces(requeteId, echangeId) {
    for (const f of RAMP_COM.enAttente) {
        const fd = new FormData();
        fd.append('file', f);
        if (echangeId) fd.append('echange_id', echangeId);
        // eslint-disable-next-line no-await-in-loop
        const r = await fetch(`${RAMP_API}/requetes/${encodeURIComponent(requeteId)}/pieces`, {
            method: 'POST', credentials: 'same-origin', headers: { 'X-OASIS-Request': '1' }, body: fd,
        });
        if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(oasisMessageErreur(d, r.status, rt('com_piece_refusee')));
        }
    }
    RAMP_COM.enAttente = [];
}

async function rampComEnvoyer() {
    const b = RAMP_COM.brouillon;
    const err = document.getElementById('rampComErreur');
    if (!b.objet.trim()) { if (err) err.textContent = rt('com_objet_requis'); return; }
    if (!b.message.trim()) { if (err) err.textContent = rt('com_message_requis'); return; }
    if (!b.etats_destinataires.length) { if (err) err.textContent = rt('com_destinataire_requis'); return; }
    try {
        const r = await rampApi('/requetes', {
            method: 'POST',
            body: JSON.stringify({
                objet: b.objet, message: b.message,
                etats_destinataires: b.etats_destinataires,
                etat_emetteur: b.etat_emetteur,
                inspection_id: b.inspection_id, ecart_ids: b.ecart_ids || [],
            }),
        });
        await rampComDeposerPieces(r.id);
        RAMP_COM.brouillon = null;
        await rampChargerRequetes();
        rampFermerSlider();
        rampToast(rt('com_envoyee'));
    } catch (e) {
        if (err) err.textContent = e.message || rt('m_enregistrement_impossible');
    }
}

function rampVoletCommunication() {
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.contacts}</span>
            <span class="ramp-slider-titre">${rt('com_nouvelle')}</span>
        </div>
        <div class="ramp-slider-body">${rampComFormulaireHtml()}</div>`, 'deux-tiers');
    RAMP_STATE.voletRejouer = rampVoletCommunication;
}

// L'inspection désignée depuis les écarts régionaux : elle se lit, elle ne se
// choisit plus. Ses constats, eux, restent à cocher — celui d'où l'on vient
// l'est déjà, et la même requête peut en viser d'autres de la même
// inspection. Le bouton rend la main à la désignation ordinaire.
function rampComDesignationHtml(b) {
    const i = (b.designation || {}).inspection || {};
    const ligne = (cle, valeur) => (valeur
        ? `<div class="ramp-poi-recap-ligne"><i>${rt(cle)}</i><span>${_rEsc(valeur)}</span></div>` : '');
    return `
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">A</span>${rt('reg_inspection')}</div>
        <p class="ramp-sous-titre">${rt('reg_designe_aide')}</p>
        <div class="ramp-poi-recap">
            ${ligne('c_poi', i.poi_reference)}
            ${ligne('c_date', i.date ? rampDate(i.date) : '')}
            ${ligne('c_etat', i.pays)}
            ${ligne('c_exploitant', i.exploitant)}
            ${ligne('c_aeronef', i.aeronef)}
            ${ligne('c_immat_court', i.immatriculation)}
        </div>
        ${rampComEcartsChoixHtml(b)}
        <button class="btn btn-outline btn-sm" style="margin-top:.6rem;"
                onclick="rampComRetirerDesignation()">${rt('reg_changer')}</button>
    </div>`;
}

function rampComFormulaireHtml() {
    const b = RAMP_COM.brouillon;
    if (!b) return '';
    const inspections = rampComInspections();

    return `
    ${b.designation ? rampComDesignationHtml(b) : `
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">A</span>${rt('com_designer')}</div>
        <p class="ramp-sous-titre">${rt('com_designer_aide')}</p>
        <div class="ramp-filtres">
            <select class="ramp-select" onchange="rampComCible('annee', this.value)">
                <option value="">${rt('f_annees')}</option>
                ${rampComRegAnnees().map((a) => `<option value="${a}"
                    ${b.cible.annee === String(a) ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('etat', this.value)">
                <option value="">${rt('f_etats')}</option>
                ${rampComEtats().map((e) => `<option value="${_rAttr(e)}"
                    ${b.cible.etat === e ? 'selected' : ''}>${_rEsc(e)}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('exploitant', this.value)">
                <option value="">${rt('f_exploitants')}</option>
                ${rampComRegValeurs('exploitant').map((v) => `<option value="${_rAttr(v)}"
                    ${b.cible.exploitant === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('immatriculation', this.value)">
                <option value="">${rt('f_immat')}</option>
                ${rampComRegValeurs('immatriculation').map((v) => `<option value="${_rAttr(v)}"
                    ${b.cible.immatriculation === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
            </select>
            <input class="ramp-input" placeholder="${_rAttr(rt('com_rechercher_insp'))}"
                   value="${_rAttr(b.cible.recherche)}" oninput="rampComCible('recherche', this.value)">
        </div>
        <div class="ramp-table-wrap" style="max-height:220px;">
            <table class="ramp-table">
                <thead><tr>
                    <th style="width:90px;">${rt('c_poi')}</th><th style="width:95px;">${rt('c_date')}</th>
                    <th>${rt('c_exploitant')}</th><th style="width:110px;">${rt('c_immat_court')}</th>
                    <th style="width:70px;text-align:center;">${rt('c_ecarts')}</th>
                    <th style="width:70px;text-align:center;">${rt('com_choisir')}</th>
                </tr></thead>
                <tbody>
                    ${inspections.length ? inspections.map((i) => {
        // Une seule inspection est retenue à la fois : la ligne choisie se
        // teinte, et sa case est la seule cochée — les autres restent vides,
        // sans quoi toutes paraissaient l'être.
        const retenue = i.id === b.inspection_id;
        return `<tr class="${retenue ? 'ramp-rang-choisi' : ''}">
                        <td>${i.poi_reference ? `<strong class="ramp-code">${_rEsc(i.poi_reference)}</strong>`
            : '<span class="ramp-vide">—</span>'}</td>
                        <td>${_rEsc(rampDate(i.date))}</td>
                        <td><strong>${_rEsc(i.exploitant || '—')}</strong>
                            <span class="ramp-sous-titre">${_rEsc(i.pays || '')}</span></td>
                        <td>${_rEsc(i.immatriculation || '—')}</td>
                        <td style="text-align:center;">${(i.anomalies || []).length}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-outline btn-sm ramp-btn-icone${retenue ? ' ramp-fait' : ''}"
                                    aria-pressed="${retenue}"
                                    onclick="rampComChoisirInspection(${_rArg(i.id)})"
                                    title="${_rAttr(rt('com_choisir'))}">${
    retenue ? RAMP_ICONS.check : RAMP_ICONS.caseVide}</button>
                        </td>
                    </tr>`;
    }).join('')
                        : `<tr><td colspan="6" class="ramp-table-vide">${rt('aucune_inspection')}</td></tr>`}
                </tbody>
            </table>
        </div>
        ${rampComEcartsChoixHtml(b)}
    </div>`}

    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">B</span>${rt('com_destinataires')}</div>
        <p class="ramp-sous-titre">${rt('com_destinataires_aide')}</p>
        <div class="ramp-com-etats">
            ${rampComEtats().map((e) => `<label class="ramp-com-etat">
                <input type="checkbox" ${b.etats_destinataires.includes(e) ? 'checked' : ''}
                       onchange="rampComBasculerEtat(${_rArg(e)})">
                <span>${_rEsc(e)}</span>
            </label>`).join('')}
        </div>
        <div class="ramp-champ" style="margin-top:.7rem;">
            <label>${rt('com_objet')}</label>
            <input class="ramp-input" id="rampComObjet" value="${_rAttr(b.objet)}"
                   oninput="rampComSaisie('objet', this.value)">
        </div>
        <div class="ramp-champ">
            <label>${rt('com_message')}</label>
            <textarea class="ramp-input" id="rampComMessage" rows="5"
                      oninput="rampComSaisie('message', this.value)">${_rEsc(b.message)}</textarea>
        </div>
        ${rampComPiecesEnAttenteHtml()}
        <p class="ramp-erreur" id="rampComErreur"></p>
    </div>

    <div class="ramp-poi-bas">
        <span class="ramp-sous-titre">${rt('com_emetteur')} : ${_rEsc(b.etat_emetteur || '—')}</span>
        <span style="flex:1;"></span>
        <button class="btn btn-outline btn-sm" onclick="rampFermerSlider()">${rt('annuler')}</button>
        <button class="btn btn-primary btn-sm" onclick="rampComEnvoyer()">
            ${RAMP_ICONS.check} ${rt('com_envoyer')}</button>
    </div>`;
}

function rampComPiecesEnAttenteHtml() {
    return `
    <div class="ramp-champ">
        <label>${rt('com_pieces')}</label>
        ${RAMP_COM.enAttente.map((f, n) => `<div class="ramp-preuve-ligne">
            <span>${RAMP_ICONS.upload} ${_rEsc(f.name)}
                <span class="ramp-sous-titre">${Math.round(f.size / 1024)} Ko</span></span>
            <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampComRetirerPiece(${n})"
                    title="${_rAttr(rt('retirer'))}">${RAMP_ICONS.x}</button>
        </div>`).join('')}
        <button class="btn btn-outline btn-sm" onclick="this.nextElementSibling.click()">
            ${RAMP_ICONS.upload} ${rt('com_joindre')}</button>
        <input type="file" multiple style="display:none;" onchange="rampComJoindre(this)">
    </div>`;
}

// ══════════════════════════════════════
//  Fil d'une requête
// ══════════════════════════════════════

async function rampComOuvrir(id) {
    try {
        RAMP_COM.ouverte = await rampApi(`/requetes/${encodeURIComponent(id)}`);
        RAMP_COM.enAttente = [];
        rampVoletFilCommunication();
    } catch (e) { rampToast(e.message || rt('m_chargement_impossible'), 'error'); }
}

function rampVoletFilCommunication() {
    const r = RAMP_COM.ouverte;
    if (!r) return;
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerSlider()">
                ${RAMP_ICONS.back} ${rt('retour')}
            </button>
            <span style="display:flex;">${RAMP_ICONS.contacts}</span>
            <span class="ramp-slider-titre">${_rEsc(r.objet)}</span>
        </div>
        <div class="ramp-slider-body">${rampComFilHtml(r)}</div>`, 'moitie');
    RAMP_STATE.voletRejouer = rampVoletFilCommunication;
}

const rampComAuteur = (e) => [e.etat, e.auteur].filter(Boolean).join(' · ');

function rampComPiecesHtml(requeteId, pieces) {
    if (!pieces || !pieces.length) return '';
    return `<div class="ramp-preuves-liste">
        ${pieces.map((p) => `<a class="ramp-preuve-ligne" style="text-decoration:none;"
            href="${RAMP_API}/requetes/${encodeURIComponent(requeteId)}/pieces/${encodeURIComponent(p.id)}/fichier">
            <span>${RAMP_ICONS.download} ${_rEsc(p.intitule || p.nom_origine)}</span>
            <span class="ramp-sous-titre">${Math.round((p.taille || 0) / 1024)} Ko</span>
        </a>`).join('')}
    </div>`;
}

// Les constats d'une requête, au fil ouvert. Une requête d'avant n'en
// désignait qu'un, décrit par trois champs ; on la lit comme les autres.
function rampComEcartsVises(o) {
    if ((o.ecarts || []).length) return o.ecarts;
    if (!o.item && !o.description) return [];
    return [{ item: o.item, categorie: o.categorie, description: o.description }];
}

function rampComEcartsVisesHtml(o) {
    const ecarts = rampComEcartsVises(o);
    if (!ecarts.length) return '';
    return `
        <div class="ramp-champ" style="margin-top:.5rem;">
            <label>${rt('com_ecart_vise')}</label>
            ${ecarts.map((e) => `<div class="ramp-poi-recap-ligne pleine">
                <i><strong class="ramp-code">${_rEsc(e.item || '—')}</strong>
                    ${e.categorie ? rampBadgeCat(e.categorie) : ''}</i>
                <span>${_rEsc(e.description || '')}</span>
            </div>`).join('')}
        </div>`;
}

function rampComFilHtml(r) {
    const close = r.statut === 'close';
    const o = r.objet_reference || {};
    const rappel = (cle, valeur) => (valeur
        ? `<div class="ramp-poi-recap-ligne"><i>${rt(cle)}</i><span>${_rEsc(valeur)}</span></div>` : '');

    return `
    <div class="ramp-card">
        <div class="ramp-card-bande">
            <span class="ramp-card-lettre">A</span>${rt('com_requete')}
            <span class="ramp-badge ${close ? 'zero' : 'ecarts'}">${close ? rt('com_close') : rt('com_ouverte')}</span>
        </div>
        <div class="ramp-poi-recap">
            ${rappel('com_emetteur', r.etat_emetteur)}
            ${rappel('com_destinataires', (r.etats_destinataires || []).join(', '))}
            ${rappel('c_poi', o.poi_reference)}
            ${rappel('c_date', o.date ? rampDate(o.date) : '')}
            ${rappel('c_exploitant', o.exploitant)}
            ${rappel('c_immat_court', o.immatriculation)}
        </div>
        ${rampComEcartsVisesHtml(o)}
    </div>

    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">B</span>${rt('com_fil')}</div>
        <div class="ramp-suivi-liste">
            <div class="ramp-suivi-entree">
                <div class="ramp-suivi-entete">
                    <strong>${_rEsc(rampComAuteur({ etat: r.etat_emetteur, auteur: r.cree_par }))}</strong>
                    <span class="ramp-sous-titre">${_rEsc(rampDate((r.cree_le || '').slice(0, 10)))}</span>
                </div>
                <p>${_rEsc(r.message)}</p>
                ${rampComPiecesHtml(r.id, r.pieces)}
            </div>
            ${(r.echanges || []).map((e) => `<div class="ramp-suivi-entree">
                <div class="ramp-suivi-entete">
                    <strong>${_rEsc(rampComAuteur(e))}</strong>
                    <span class="ramp-sous-titre">${_rEsc(rampDate((e.date || '').slice(0, 10)))}</span>
                </div>
                <p>${_rEsc(e.message)}</p>
                ${rampComPiecesHtml(r.id, e.pieces)}
            </div>`).join('')}
        </div>

        ${close ? `<p class="ramp-note">${rt('com_close_le',
            rampDate((r.close_le || '').slice(0, 10)), _rEsc(r.close_par || ''))}</p>` : `
        <div class="ramp-champ" style="margin-top:.8rem;">
            <label>${rt('com_repondre')}</label>
            <textarea class="ramp-input" id="rampComReponse" rows="3"></textarea>
        </div>
        ${rampComPiecesEnAttenteHtml()}
        <p class="ramp-erreur" id="rampComErreur"></p>`}
    </div>

    <div class="ramp-poi-bas">
        <span style="flex:1;"></span>
        ${close
            ? `<button class="btn btn-outline btn-sm" onclick="rampComRouvrir()">
                ${RAMP_ICONS.reset} ${rt('com_rouvrir')}</button>`
            : `<button class="btn btn-outline btn-sm" onclick="rampComCloturer()">
                ${RAMP_ICONS.check} ${rt('com_cloturer')}</button>
               <button class="btn btn-primary btn-sm" onclick="rampComRepondre()">
                ${RAMP_ICONS.check} ${rt('com_envoyer_reponse')}</button>`}
    </div>`;
}

async function rampComRepondre() {
    const r = RAMP_COM.ouverte;
    const champ = document.getElementById('rampComReponse');
    const err = document.getElementById('rampComErreur');
    const message = (champ && champ.value.trim()) || '';
    if (!message) { if (err) err.textContent = rt('com_message_requis'); return; }
    try {
        const rep = await rampApi(`/requetes/${encodeURIComponent(r.id)}/echanges`, {
            method: 'POST', body: JSON.stringify({ message }),
        });
        await rampComDeposerPieces(r.id, rep.id);
        await rampComOuvrir(r.id);
        await rampChargerRequetes();
        rampToast(rt('com_reponse_envoyee'));
    } catch (e) {
        if (err) err.textContent = e.message || rt('m_enregistrement_impossible');
    }
}

async function rampComCloturer() {
    const r = RAMP_COM.ouverte;
    if (!await oasisConfirmer(rt('com_confirmer_cloture'))) return;
    try {
        await rampApi(`/requetes/${encodeURIComponent(r.id)}/cloturer`, { method: 'POST', body: '{}' });
        await rampComOuvrir(r.id);
        await rampChargerRequetes();
        rampToast(rt('com_close_ok'));
    } catch (e) { rampToast(e.message || rt('m_enregistrement_impossible'), 'error'); }
}

async function rampComRouvrir() {
    const r = RAMP_COM.ouverte;
    try {
        await rampApi(`/requetes/${encodeURIComponent(r.id)}/rouvrir`, { method: 'POST', body: '{}' });
        await rampComOuvrir(r.id);
        await rampChargerRequetes();
        rampToast(rt('com_rouverte'));
    } catch (e) { rampToast(e.message || rt('m_enregistrement_impossible'), 'error'); }
}

Object.assign(window, {
    RAMP_COM, rampRenderCommunication, rampChargerRequetes, rampComFiltre, rampComReset,
    rampComNouvelle, rampComCible, rampComChoisirInspection, rampComBasculerEcart,
    rampComBasculerEtat, rampComSaisie, rampComJoindre, rampComRetirerPiece,
    rampComEnvoyer, rampVoletCommunication, rampComOuvrir, rampVoletFilCommunication,
    rampComRepondre, rampComCloturer, rampComRouvrir,
    rampComOnglet, rampChargerPartages, rampComPartagesHtml, rampComOuvrirPartage,
    rampVoletPartage, rampComPartageHtml,
    rampChargerEcartsRegionaux, rampComRegFiltre, rampComRegReset, rampComRegionalHtml,
    rampComRequeteEcart, rampComRetirerDesignation, rampComPreuvesEcart, rampComVoletPreuves,
    rampComPreuvesHtml, rampComInspectionRegionale,
});
