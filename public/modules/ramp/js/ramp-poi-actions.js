/* OASIS — Inspections d'aéronefs sur aire de trafic
 * Suite de ramp-poi.js : la fiche d'inspection, suite : sélecteur d'aéronef, pièces, soumission et renvoi, équipe, enregistrement et validation.
 *
 * Découpé pour que chaque fichier tienne sous les 2000 lignes. Les morceaux
 * se chargent l'un après l'autre (voir index.html) et partagent la même
 * portée : l'ordre d'exécution est celui d'avant le découpage.
 */

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
    if (!r.lignes.length) return `<p class="ramp-table-vide">${rt('aucun_aeronef')}</p>`;
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
                <th>${rt('stats_modele')}</th>
                <th style="width:24%;">Constructeur</th>
                <th style="width:90px;text-align:center;">Choisir</th>
            </tr></thead>
            <tbody>${r.lignes.map((a) => `<tr class="ramp-depliant"
                    onclick="rampChoisirAeronef(${_rArg(a.designation)})">
                <td><strong class="ramp-code">${_rEsc(a.designation)}</strong></td>
                <td>${_rEsc(a.modele)}</td>
                <td class="ramp-desc">${_rEsc(a.constructeur || '—')}</td>
                <td style="text-align:center;">
                    <button class="btn btn-outline btn-sm ramp-btn-icone" title="${rt('retenir_code')}"
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
                <span style="flex:1;">${rt('choisir_type_aeronef')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-recherche-boite" style="margin-bottom:.6rem;">
                    ${RAMP_ICONS.search}
                    <input type="text" placeholder="${rt('recherche_aeronef')}"
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
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="${rt('modifier_remplacer')}"
                    onclick="rampOuvrirPiece(${_rArg(pj.id)})">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerPiece(${_rArg(pj.id)})" title="${rt('supprimer')}">${RAMP_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;

    return `
    <div class="ramp-actions-bar">
        <strong style="font-size:.9rem;">${rt('par_pieces_jointes')}</strong>
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
                    <th style="width:32%;">${rt('c_intitule')}</th>
                    <th>Commentaire</th>
                    <th style="width:180px;">${rt('deposee_par')}</th>
                    <th style="width:130px;text-align:center;">Actions</th>
                </tr></thead>
                <tbody>${pieces.length ? pieces.map(ligne).join('')
                    : `<tr><td colspan="4" class="ramp-table-vide">
                        ${rt(modifiable ? 'aucune_preuve_attachee' : 'aucune_piece_jointe')}
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
                    <label>${rt('intitule_piece')}</label>
                    <input class="ramp-input" id="rampPieceIntitule"
                           placeholder="${rt('ex_photo')}"
                           value="${_rAttr((pj || {}).intitule || '')}">
                </div>
                <div class="ramp-champ">
                    <label>Commentaire</label>
                    <textarea class="ramp-input" id="rampPieceCommentaire" rows="3"
                              placeholder="${rt('objet_piece')}"
                              >${_rEsc((pj || {}).commentaire || '')}</textarea>
                </div>
                <div class="ramp-champ">
                    <label>${pj ? 'Remplacer le fichier (facultatif)' : 'Fichier'}</label>
                    <input class="ramp-input" type="file" id="rampPieceFichier">
                    ${pj ? `<div class="ramp-desc" style="margin-top:.3rem;">
                        Fichier actuel : ${_rEsc(pj.nom_origine)} · ${_rEsc(rampTaille(pj.taille))}</div>` : ''}
                </div>
                <p class="ramp-note">
                    ${rt('formats_acceptes')}
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
        rampToast(pj ? rt('m_piece_maj') : rt('m_piece_ajoutee'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampSupprimerPiece(id) {
    const p = RAMP_STATE.poiEnCours || {};
    const pj = (p.pieces || []).find((x) => x.id === id) || {};
    if (!await oasisConfirmer(rt('confirmer_suppr_piece', pj.intitule || ''))) return;
    try {
        await rampApi(`/poi/${p.id}/pieces/${id}`, { method: 'DELETE' });
        await rampRechargerPieces();
        rampToast(rt('piece_supprimee'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// Seule la liste des pièces se recharge : le reste de la fiche est à l'écran,
// et une saisie en cours ne doit pas s'y perdre.
async function rampRechargerPieces() {
    const p = RAMP_STATE.poiEnCours;
    if (!p || !p.id) return;
    try {
        const r = await rampApi(`/poi/${p.id}/pieces`);
        p.pieces = r.pieces || [];
    } catch (e) { rampToast(e.message || rt('m_pieces_indisponibles'), 'error'); }
    const zone = document.getElementById('rampPoiPieces');
    if (!zone) { rampVoletPoi(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPoiPieces();
    rendreDefilement();
}

// ── Soumission et renvoi ──

async function rampSoumettrePoi() {
    const p = RAMP_STATE.poiEnCours;
    if (!await oasisConfirmer(rt('confirmer_soumettre_fiche'))) return;
    if (!await rampEnregistrerPoi(true)) return;
    try {
        await rampApi(`/poi/${p.id}/soumettre`, { method: 'POST', body: '{}' });
        await rampChargerPoi();
        await rampOuvrirPoi(p.id);
        rampToast(rt('fiche_soumise'));
    } catch (e) { rampToast(e.message || rt('m_soumission_impossible'), 'error'); }
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
                <span style="flex:1;">${rt('renvoyer_fiche')}</span>
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
                : `<p class="ramp-erreur">${rt('renvoi_sans_commentaire_inspecteur')}</p>`}
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
        rampToast(rt('fiche_renvoyee'));
    } catch (e) { rampToast(e.message || rt('m_renvoi_impossible'), 'error'); }
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
            ${rt(fige ? 'aucun_inspecteur' : 'aucun_inspecteur_encore')}</p>`;
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
        sel.innerHTML = `<option value="">${rt('ajouter_inspecteur')}</option>`
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
        if (!silencieux) rampToast(rt('brouillon_enregistre_ref', p.reference));
        return true;
    } catch (e) {
        rampToast(e.message || rt('m_enregistrement_impossible'), 'error');
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
                    <div class="ramp-poi-recap-ligne"><dt>${rt('items_controles')}</dt>
                        <dd>${rampPoiControles()} / ${ctx.items.length}</dd></div>
                    <div class="ramp-poi-recap-ligne"><dt>${rt('nav_ecarts')}</dt>
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
                <button class="btn btn-primary btn-sm" onclick="rampConfirmerValidation()">${rt('poi_valider')}</button>
            </div>
        </div>
    </div>`);
}

async function rampConfirmerValidation() {
    const p = RAMP_STATE.poiEnCours;
    rampFermerModal();
    try {
        const r = await rampApi(`/poi/${p.id}/valider`, { method: 'POST', body: '{}' });
        rampToast(r.message || rt('m_inspection_creee'));
        // Les états lisent les inspections chargées au démarrage : elles
        // doivent connaître celle qui vient de naître.
        await rampLoadData();
        await rampOuvrirPoi(p.id);
    } catch (e) { rampToast(e.message || rt('m_validation_impossible'), 'error'); }
}

async function rampSupprimerPoi(id) {
    const p = RAMP_STATE.poi.liste.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(rt('confirmer_suppr_fiche', p.reference || ''))) return;
    try {
        await rampApi(`/poi/${id}`, { method: 'DELETE' });
        if ((RAMP_STATE.poiEnCours || {}).id === id) RAMP_STATE.poiEnCours = null;
        await rampChargerPoi();
        rampToast(rt('fiche_supprimee'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
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
    rampPoiVueValidation, rampPoiVueTransmission,
});
