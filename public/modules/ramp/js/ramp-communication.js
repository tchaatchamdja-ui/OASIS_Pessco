/* OASIS — Module « RAMP Inspections »
 * Menu « Communication » : requêtes entre États membres.
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
    // Sous-menu affiché : les requêtes, ou les transmissions mises à
    // disposition par d'autres États.
    onglet: 'requetes',
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

function rampComOnglet(cle) {
    RAMP_COM.onglet = cle;
    if (cle === 'partages' && !RAMP_COM.partagesDemandes) {
        RAMP_COM.partagesDemandes = true;
        setTimeout(rampChargerPartages, 0);
    }
    rampRenderPage();
}

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
        return [r.objet, r.message, ref.poi_reference, ref.exploitant, ref.immatriculation, ref.item]
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
        o.item ? `<span class="ramp-badge items">${_rEsc(o.item)}</span>` : '',
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
        ${onglet('requetes', rt('com_onglet_requetes'))}
        ${onglet('partages', rt('com_onglet_partages'))}
    </div>`;

    if (RAMP_COM.onglet === 'partages') {
        return `
        <div class="ramp-page-header"><h2>${rt('nav_communication')}</h2></div>
        ${onglets}
        ${rampComPartagesHtml()}`;
    }

    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_communication')}</h2>
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
    RAMP_COM.brouillon = {
        objet: '', message: '',
        etats_destinataires: [],
        etat_emetteur: RAMP_COM.mesEtats[0] || '',
        inspection_id: '', ecart_id: '',
        cible: { annee: '', etat: '', exploitant: '', immatriculation: '', recherche: '' },
    };
    RAMP_COM.enAttente = [];
    rampVoletCommunication();
}

// Inspections répondant aux filtres de désignation.
function rampComInspections() {
    const c = (RAMP_COM.brouillon || {}).cible || {};
    const q = _rNorm(c.recherche);
    return (RAMP_STATE.data.inspections || []).filter((i) => {
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
    RAMP_COM.brouillon.ecart_id = '';
    rampVoletCommunication();
}

function rampComChoisirInspection(id) {
    RAMP_COM.brouillon.inspection_id = id;
    RAMP_COM.brouillon.ecart_id = '';
    rampVoletCommunication();
}

function rampComChoisirEcart(id) {
    RAMP_COM.brouillon.ecart_id = id;
    rampVoletCommunication();
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
                inspection_id: b.inspection_id, ecart_id: b.ecart_id,
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

function rampComFormulaireHtml() {
    const b = RAMP_COM.brouillon;
    if (!b) return '';
    const inspections = rampComInspections();
    const choisie = (RAMP_STATE.data.inspections || []).find((i) => i.id === b.inspection_id);
    const ecarts = choisie ? (choisie.anomalies || []) : [];

    return `
    <div class="ramp-card">
        <div class="ramp-card-bande"><span class="ramp-card-lettre">A</span>${rt('com_designer')}</div>
        <p class="ramp-sous-titre">${rt('com_designer_aide')}</p>
        <div class="ramp-filtres">
            <select class="ramp-select" onchange="rampComCible('annee', this.value)">
                <option value="">${rt('f_annees')}</option>
                ${rampAnnees().map((a) => `<option value="${a}"
                    ${b.cible.annee === String(a) ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('etat', this.value)">
                <option value="">${rt('f_etats')}</option>
                ${rampComEtats().map((e) => `<option value="${_rAttr(e)}"
                    ${b.cible.etat === e ? 'selected' : ''}>${_rEsc(e)}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('exploitant', this.value)">
                <option value="">${rt('f_exploitants')}</option>
                ${rampValeurs('exploitant').map((v) => `<option value="${_rAttr(v)}"
                    ${b.cible.exploitant === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
            </select>
            <select class="ramp-select" onchange="rampComCible('immatriculation', this.value)">
                <option value="">${rt('f_immat')}</option>
                ${rampValeurs('immatriculation').map((v) => `<option value="${_rAttr(v)}"
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
                    ${inspections.length ? inspections.map((i) => `<tr${i.id === b.inspection_id
                        ? ' style="background:var(--ramp-accent-bg);"' : ''}>
                        <td>${i.poi_reference ? `<strong class="ramp-code">${_rEsc(i.poi_reference)}</strong>`
                            : '<span class="ramp-vide">—</span>'}</td>
                        <td>${_rEsc(rampDate(i.date))}</td>
                        <td><strong>${_rEsc(i.exploitant || '—')}</strong>
                            <span class="ramp-sous-titre">${_rEsc(i.pays || '')}</span></td>
                        <td>${_rEsc(i.immatriculation || '—')}</td>
                        <td style="text-align:center;">${(i.anomalies || []).length}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-outline btn-sm ramp-btn-icone"
                                    onclick="rampComChoisirInspection(${_rArg(i.id)})"
                                    title="${_rAttr(rt('com_choisir'))}">${RAMP_ICONS.check}</button>
                        </td>
                    </tr>`).join('')
                        : `<tr><td colspan="6" class="ramp-table-vide">${rt('aucune_inspection')}</td></tr>`}
                </tbody>
            </table>
        </div>
        ${choisie && ecarts.length ? `
        <div class="ramp-champ" style="margin-top:.7rem;">
            <label>${rt('com_ecart_vise')}</label>
            <select class="ramp-select" onchange="rampComChoisirEcart(this.value)">
                <option value="">${rt('com_toute_inspection')}</option>
                ${ecarts.map((e) => `<option value="${_rAttr(e.id)}" ${b.ecart_id === e.id ? 'selected' : ''}>
                    ${_rEsc(e.itemCode || '')} — ${_rEsc((e.description || '').slice(0, 70))}</option>`).join('')}
            </select>
        </div>` : ''}
    </div>

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
            ${rappel('c_item', o.item)}
            ${rappel('c_categorie', o.categorie)}
            ${o.description ? `<div class="ramp-poi-recap-ligne pleine"><i>${rt('c_description')}</i>
                <span>${_rEsc(o.description)}</span></div>` : ''}
        </div>
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
    rampComNouvelle, rampComCible, rampComChoisirInspection, rampComChoisirEcart,
    rampComBasculerEtat, rampComSaisie, rampComJoindre, rampComRetirerPiece,
    rampComEnvoyer, rampVoletCommunication, rampComOuvrir, rampVoletFilCommunication,
    rampComRepondre, rampComCloturer, rampComRouvrir,
    rampComOnglet, rampChargerPartages, rampComPartagesHtml, rampComOuvrirPartage,
    rampVoletPartage, rampComPartageHtml,
});
