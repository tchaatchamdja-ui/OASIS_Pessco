/* OASIS / Mesures d'Application — étape « Qualification et Mesures ».
 *
 * L'instance décisionnelle siège sur la carence : elle lit l'investigation,
 * consigne ses réunions, dit si l'infraction est constituée, et arrête le cas
 * échéant les mesures d'application.
 *
 * Troisième fichier du module après mes-app.js et mes-traitement.js, pour la
 * même raison : le garde-fou du smoke refuse un fichier au-delà de 2000 lignes.
 * Il lit l'état commun (MES_STATE) et les utilitaires déclarés par mes-app.js ;
 * il est chargé après eux, et rien ici ne s'exécute au chargement.
 */

const mesQualification = () => (MES_STATE.traitement || {}).qualification || {
    comite_code: '', membres: [], reunions: [],
    infraction_constituee: false, infraction_non_constituee: false,
    renvoi_demande: false, renvoi_motif: '',
    nature: '', caracterisation: '', circonstances: '',
    mesures: [], pieces: [],
};

// L'étape ne se saisit que tant qu'elle est ouverte. Classée, renvoyée ou
// validée, elle est close : les champs passent en lecture et les trois issues
// ne se rejouent pas. Le rang dit tout — le fil a reculé après un renvoi,
// avancé après une validation ; seule l'étape courante reste modifiable.
const mesQualClose = () => {
    if (mesTraitementClos()) return mt('q_classee');
    const rang = MES_ETAPES.findIndex((e) => e.cle === 'qualification');
    // Clôturée : les mesures sont arrêtées, aucune n'appelait de suivi, et le
    // dossier s'est fermé ici même plutôt que de passer à l'étape suivante.
    if ((MES_STATE.traitement || {}).cloture_le) return mt('q_cloturee');
    if (mesRangAtteint() > rang) return mt('q_validee');
    if (mesRangAtteint() < rang) return mt('q_renvoyee');
    return '';
};

const mesQualModifiable = () => mesTraitementModifiable() && !mesQualClose();

// L'étape porte six sections : la carence, le rapport d'investigation,
// l'instance, la qualification, les mesures et — le cas échéant — les recours.
// Les dérouler d'un seul tenant fait un formulaire qu'on parcourt sans le
// voir. Trois volets les regroupent selon ce qu'on vient y faire : juger,
// sanctionner, ou examiner une contestation.
const MES_QUAL_VOLETS = [
    { cle: 'infraction' }, { cle: 'mesures' }, { cle: 'recours' },
];
const mesNomVolet = (cle) => mt(`onglet_${cle}`);

// Y a-t-il des recours à examiner ? Le volet ne s'offre que dans ce cas : un
// onglet vide invite à un travail qui n'existe pas.
const mesQualARecours = () => (mesQualification().mesures || []).some((m) => m.recours_intente);

const mesQualVolet = () => {
    const vu = MES_STATE.qualVolet || 'infraction';
    return vu === 'recours' && !mesQualARecours() ? 'infraction' : vu;
};

// Changer de volet relève d'abord la saisie en cours : passer aux mesures ne
// doit pas perdre ce qui vient d'être tapé à la qualification.
function mesQualVoirVolet(cle) {
    mesMajQualification();
    MES_STATE.qualVolet = cle;
    mesQualRedessiner();
}

function mesQualOnglets() {
    const vu = mesQualVolet();
    const visibles = MES_QUAL_VOLETS.filter((v) => v.cle !== 'recours' || mesQualARecours());
    return `<div class="mes-sous-onglets" role="tablist">${visibles.map((v) => `
        <button type="button" role="tab" class="mes-sous-onglet${vu === v.cle ? ' actif' : ''}"
                aria-selected="${vu === v.cle}"
                onclick="mesQualVoirVolet('${_mesAttr(v.cle)}')">${_mesEsc(mesNomVolet(v.cle))}${
            v.cle === 'recours' ? ` <span class="mes-sous-onglet-compte">${
                (mesQualification().mesures || []).filter((m) => m.recours_intente).length
            }</span>` : ''}</button>`).join('')}</div>`;
}

// Le corps de l'étape : les onglets, puis les sections du volet regardé.
function mesQualCorps() {
    const vu = mesQualVolet();
    const sections = vu === 'mesures' ? mesSectionMesuresArretees()
        : (vu === 'recours' ? mesSectionRecours()
            : [mesSectionCarence(), mesSectionRapportInvestigation(),
                mesSectionInstance(), mesSectionQualification()].join(''));
    return `${mesQualOnglets()}<div class="mes-sous-volet">${sections}</div>`;
}

// ── Section B — le rapport d'investigation ──
// Il est repris tel que l'investigation l'a laissé, et le PDF donne
// l'investigation entière : équipe, travaux, éléments collectés, synthèse.
function mesSectionRapportInvestigation() {
    const t = MES_STATE.traitement || {};
    const inv = t.investigation || {};
    const c = MES_STATE.carenceEnCours || {};
    // La suite à donner peut mener droit ici : « Prendre des mesures » saute
    // l'investigation. La section le dit plutôt que d'offrir un rapport vide
    // et un PDF qui n'a rien à rendre.
    const menee = !!(inv.soumise_le || inv.rapport
        || (inv.travaux || []).length || (inv.equipe || []).length);
    if (!menee) {
        return mesSection('B', mt('sec_rapport_inv'), `
            <p class="mes-preuve-vide">${mt('aucune_inv_menee')}</p>
            ${t.decision_motif ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
                <label>${mt('motif_decision')}</label>
                <div class="mes-lecture">${_mesEsc(t.decision_motif)}</div>
            </div>` : ''}`);
    }
    const lien = `${MES_API}/constatations/${encodeURIComponent(c.id || '')}/rapport-investigation.pdf`;
    return mesSection('B', mt('sec_rapport_inv'), `
        <div class="mes-champ">
            <label>${mt('resultat_investigation')}</label>
            <div class="mes-lecture">${inv.rapport ? _mesEsc(inv.rapport)
                : `<span class="mes-preuve-vide">${mt('aucun_rapport')}</span>`}</div>
        </div>
        <div class="mes-pac-ligne">
            <dt>${mt('investigation_soumise')}</dt>
            <dd>${inv.soumise_le ? `${_mesEsc(mesDate(inv.soumise_le))}${inv.soumise_par
                ? ` · ${_mesEsc(inv.soumise_par)}` : ''}` : '<span class="mes-preuve-vide">—</span>'}</dd>
        </div>
        <a class="btn btn-outline btn-sm" style="margin-top:.6rem;" target="_blank" rel="noopener"
           href="${_mesAttr(lien)}">${MES_ICONS.download} ${mt('rapport_inv_pdf')}</a>
        <p class="mes-preuve-vide" style="margin-top:.3rem;">${mt('rapport_inv_pdf_aide')}</p>`);
}

// ── Section C — l'instance décisionnelle ──
function mesSectionInstance() {
    const q = mesQualification();
    const off = mesQualModifiable() ? '' : 'disabled';
    const comites = mesComites();

    const membres = (q.membres || []).map((p, i) => `
        <tr data-rang="${i}">
            <td><input class="mes-input" data-champ="nom" value="${_mesAttr(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${_mesAttr(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${_mesAttr(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${_mesAttr(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}" onclick="mesQualRetirerMembre(${i})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');

    return mesSection('C', mt('sec_instance'), `
        <div class="mes-champ">
            <label>${mt('nom_instance')}</label>
            <select class="mes-select" id="mesQualComite" ${off}>
                <option value="">—</option>
                ${comites.map((c) => `<option value="${_mesAttr(c.code)}"
                    ${q.comite_code === c.code ? 'selected' : ''}>${_mesEsc(c.libelle)}</option>`).join('')}
            </select>
            ${comites.length ? '' : `<p class="mes-note">${mt('aucun_comite_param')}</p>`}
        </div>
        <div class="mes-champ" style="margin-bottom:0;">
            <label>${mt('membres_instance')}</label>
            <div class="mes-table-wrap">
                <table class="mes-table mes-table-claire" id="mesQualMembres">
                    <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
                        mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                    <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">${
                        mt('aucun_membre')}</td></tr>`}</tbody>
                </table>
            </div>
            ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                onclick="mesQualAjouterMembre()">${MES_ICONS.add} ${mt('ajouter_membre')}</button>`}
        </div>`);
}

// ── Section D — la qualification ──
function mesSectionQualification() {
    const q = mesQualification();
    const off = mesQualModifiable() ? '' : 'disabled';
    const constituee = !!q.infraction_constituee;

    const nonConstituee = !!q.infraction_non_constituee;
    const renvoi = !!q.renvoi_demande;

    // Les réunions de l'instance : ce que chaque séance a produit. Autant de
    // blocs que de séances tenues.
    const reunions = (q.reunions || []).map((r, i) => `
        <div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${r.date ? _mesEsc(mesDate(r.date)) : mt('reunion')}${
                    r.objet ? ` — ${_mesEsc(r.objet)}` : ''}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer_reunion'))}" aria-label="${_mesAttr(mt('retirer_reunion'))}"
                    onclick="mesQualRetirerReunion(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('date_reunion')}</label>
                        <input type="date" class="mes-input" data-champ="date" value="${_mesAttr(r.date || '')}" ${off}>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('objet')}</label>
                        <input class="mes-input" data-champ="objet" value="${_mesAttr(r.objet || '')}"
                               placeholder="${_mesAttr(mt('objet_reunion_exemple'))}" ${off}>
                    </div>
                </div>
                <div class="mes-champ" style="margin-bottom:0;">
                    <label>${mt('resultat_reunion')}</label>
                    <textarea class="mes-input" data-champ="resultat" rows="3" ${off}
                              placeholder="${_mesAttr(mt('resultat_reunion_exemple'))}">${_mesEsc(r.resultat || '')}</textarea>
                </div>
            </div>
        </div>`).join('');

    // Les deux cases disent la même décision par ses deux faces : cocher l'une
    // décoche l'autre. Tant qu'aucune n'est cochée, la qualification n'est pas
    // arrêtée.
    return mesSection('D', mt('onglet_infraction'), `
        <div id="mesQualReunions">${reunions
            || `<p class="mes-preuve-vide">${mt('aucune_reunion')}</p>`}</div>
        ${off ? '' : `<div class="mes-actions-rang" style="margin-bottom:.9rem;">
            <button class="btn btn-outline btn-sm" onclick="mesQualAjouterReunion()">
                ${MES_ICONS.add} ${mt('ajouter_reunion')}</button>
            <button class="btn btn-outline btn-sm" onclick="mesEnregistrerQualification()">
                ${MES_ICONS.check} ${mt('enregistrer')}</button>
        </div>`}
        <div class="mes-cases-exclusives">
            <label class="mes-case">
                <input type="checkbox" id="mesQualConstituee" ${constituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerInfraction(this.checked)">
                <span>${mt('infraction_constituee')}</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualNonConstituee" ${nonConstituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerNonInfraction(this.checked)">
                <span>${mt('infraction_non_constituee')}</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualRenvoi" ${renvoi ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerRenvoi(this.checked)">
                <span>${mt('renvoyer_complement')}</span>
            </label>
        </div>
        ${renvoi ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
            <label>${mt('inv_complementaires')}</label>
            <textarea class="mes-input" id="mesQualRenvoiMotif" rows="4" ${off}
                      placeholder="${_mesAttr(mt('inv_complementaires_exemple'))}">${_mesEsc(q.renvoi_motif || '')}</textarea>
        </div>` : ''}
        ${constituee ? `
        <div class="mes-champ" style="margin-top:.6rem;">
            <label>${mt('nature_infraction')}</label>
            <input class="mes-input" id="mesQualNature" value="${_mesAttr(q.nature || '')}" ${off}
                   placeholder="${_mesAttr(mt('nature_exemple'))}">
        </div>
        <div class="mes-deux-colonnes">
            <div class="mes-champ">
                <label>${mt('caracterisation')}</label>
                <textarea class="mes-input" id="mesQualCaracterisation" rows="5" ${off}
                          placeholder="${_mesAttr(mt('caracterisation_exemple'))}">${_mesEsc(q.caracterisation || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('circonstances')}</label>
                <textarea class="mes-input" id="mesQualCirconstances" rows="5" ${off}
                          placeholder="${_mesAttr(mt('circonstances_exemple'))}">${_mesEsc(q.circonstances || '')}</textarea>
            </div>
        </div>` : ''}`);
}

// ── Section E — les mesures arrêtées ──
// Elle ne s'ouvre que si l'infraction est constituée : sans infraction, il n'y
// a pas de mesure d'application à prendre.
// Ce que la mesure était avant que le recours ne la fasse modifier. Repliée
// par défaut : c'est une trace, pas une saisie.
function mesQualVersionPrecedente(m) {
    const v = m.version_precedente || {};
    const portee = { temporelle: mt('limitee_temps'), illimitee: mt('illimitee'), sans_objet: mt('sans_objet') }[v.portee] || '—';
    const duree = v.portee === 'temporelle' && v.duree_valeur
        ? `${v.duree_valeur} ${v.duree_unite || 'jours'}` : '';
    return `<details class="mes-version">
        <summary>${mt('version_precedente')}</summary>
        <dl style="margin:.4rem 0 0;">
            ${mesLigneFiche(mt('fiche_categorie'), mesLibelleCategorie(v.categorie))}
            ${mesLigneFiche(mt('fiche_type'), mesLibelleType(v.type_mesure))}
            ${mesLigneFiche(mt('fiche_date_sanction'), v.date_sanction ? mesDate(v.date_sanction) : '')}
            ${mesLigneFiche(mt('fiche_portee'), duree ? `${portee} · ${duree}` : portee)}
            ${mesLigneFiche(mt('fiche_date_fin'), v.date_fin ? mesDate(v.date_fin) : '')}
            ${mesLigneFiche(mt('fiche_desc_sanction'), v.commentaire)}
        </dl>
    </details>`;
}

function mesSectionMesuresArretees() {
    const q = mesQualification();
    if (!q.infraction_constituee) {
        return mesSection('E', mt('onglet_mesures'),
            `<p class="mes-preuve-vide">${mt('aucune_mesure_sans_infraction')}</p>`);
    }
    const off = mesQualModifiable() ? '' : 'disabled';
    const cats = mesCategories();

    const blocs = (q.mesures || []).map((m, i) => {
        const libelleCat = (cats.find((c) => c.code === m.categorie) || {}).libelle || mt('mesure');
        const types = mesTypesDe(m.categorie);
        // Une sanction court sur une durée, sans terme, ou hors du temps —
        // un avertissement ne dure pas, il est prononcé. Les trois cases
        // disent la même portée par ses trois faces, elles s'excluent.
        const temporelle = m.portee === 'temporelle';
        const illimitee = m.portee === 'illimitee';
        const sansObjet = m.portee === 'sans_objet';
        // Une mesure annulée sur recours ne se réécrit plus ; une mesure
        // modifiée rouvre ses champs, et garde sous elle, repliée, la version
        // que le recours a fait tomber.
        const annulee = m.statut_recours === 'annulee';
        const modifiee = m.statut_recours === 'modifiee';
        const offBloc = annulee ? 'disabled' : off;
        return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${_mesEsc(libelleCat)}</span>
                ${annulee ? `<span class="mes-badge annulee">${mt('st_annulee')}</span>` : ''}
                ${modifiee ? `<span class="mes-badge notifiee">${mt('st_modifiee')}</span>` : ''}
                ${offBloc ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer_mesure'))}" aria-label="${_mesAttr(mt('retirer_mesure'))}"
                    onclick="mesQualRetirerMesure(${i})">${MES_ICONS.x}</button>`}
            </div>
            <div class="mes-bloc-corps">
                ${modifiee ? mesQualVersionPrecedente(m) : ''}
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('categorie_mesure')}</label>
                        <select class="mes-select" data-champ="categorie" ${offBloc}
                                onchange="mesQualCategorieMesure(${i}, this.value)">
                            <option value="">—</option>
                            ${cats.map((c) => `<option value="${_mesAttr(c.code)}"
                                ${m.categorie === c.code ? 'selected' : ''}>${_mesEsc(c.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('type_mesure')}</label>
                        <select class="mes-select" data-champ="type_mesure" ${offBloc}>
                            <option value="">—</option>
                            ${types.map((t) => `<option value="${_mesAttr(t.code)}"
                                ${m.type_mesure === t.code ? 'selected' : ''}>${_mesEsc(t.libelle)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('fiche_date_sanction')}</label>
                        <input type="date" class="mes-input" data-champ="date_sanction"
                               value="${_mesAttr(m.date_sanction || '')}" ${offBloc}
                               onchange="oasisDatesBorner(mesDatesSanction(${i}))">
                    </div>
                    <div class="mes-champ">
                        <label>${mt('fiche_portee')}</label>
                        <div class="mes-cases-exclusives" style="padding-top:.35rem;">
                            <label class="mes-case">
                                <input type="checkbox" data-champ="temporelle" ${temporelle ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'temporelle', this.checked)">
                                <span>${mt('limitee_temps')}</span>
                            </label>
                            <label class="mes-case">
                                <input type="checkbox" data-champ="illimitee" ${illimitee ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'illimitee', this.checked)">
                                <span>${mt('illimitee')}</span>
                            </label>
                            <label class="mes-case">
                                <input type="checkbox" data-champ="sans_objet" ${sansObjet ? 'checked' : ''} ${offBloc}
                                       onchange="mesQualPorteeMesure(${i}, 'sans_objet', this.checked)">
                                <span>${mt('sans_objet')}</span>
                            </label>
                        </div>
                    </div>
                </div>
                ${temporelle ? `<div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('duree_sanction')}</label>
                        <div class="mes-duree">
                            <input type="number" min="0" class="mes-input" data-champ="duree_valeur"
                                   value="${_mesAttr(m.duree_valeur || '')}" ${offBloc}
                                   oninput="mesQualDureeVersTerme(${i})">
                            <select class="mes-select" data-champ="duree_unite" ${offBloc}
                                    onchange="mesQualDureeVersTerme(${i})">
                                ${['jours', 'mois'].map((u) => `<option value="${u}"
                                    ${(m.duree_unite || 'jours') === u ? 'selected' : ''}>${u}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('fiche_date_fin')}</label>
                        <input type="date" class="mes-input" data-champ="date_fin"
                               value="${_mesAttr(m.date_fin || '')}" ${offBloc}
                               onchange="mesQualTermeVersDuree(${i})">
                    </div>
                </div>` : ''}
                <div class="mes-champ" style="margin-bottom:0;">
                    <div class="mes-champ-entete">
                        <label>${mt('fiche_desc_sanction')}</label>
                        <label class="mes-case">
                            <input type="checkbox" data-champ="suivi_requis" ${offBloc}
                                   ${m.suivi_requis ? 'checked' : ''}
                                   onchange="mesQualSuiviRequis(${i}, this.checked)">
                            <span>${mt('suivi_requis')}</span>
                        </label>
                    </div>
                    <textarea class="mes-input" data-champ="commentaire" rows="3" ${offBloc}
                              placeholder="${_mesAttr(mt('desc_sanction_exemple'))}">${_mesEsc(m.commentaire || '')}</textarea>
                </div>
            </div>
        </div>`;
    }).join('');

    const pieces = (q.pieces || []).map((p, i) => `
        <div class="mes-preuve" data-chemin="${_mesAttr(p.path || '')}">
            <input class="mes-input" value="${_mesAttr(p.nom || '')}" placeholder="${_mesAttr(mt('intitule_piece'))}" ${off}>
            ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${_mesAttr(mt('ouvrir'))}">${MES_ICONS.download}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}"
                onclick="mesQualRetirerPiece(${i})">${MES_ICONS.x}</button>`}
        </div>`).join('');

    return mesSection('E', mt('onglet_mesures'), `
        <div id="mesQualMesures">${blocs || `<p class="mes-preuve-vide">${mt('aucune_mesure_arretee')}</p>`}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
            onclick="mesQualAjouterMesure()">${MES_ICONS.add} ${mt('ajouter_mesure')}</button>`}
        <div class="mes-champ" style="margin-top:.9rem;margin-bottom:0;">
            <label>${mt('decision_instance')}</label>
            <div id="mesQualPieces">${pieces || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
            ${off ? '' : `<input type="file" id="mesQualFichier" multiple style="display:none;"
                    onchange="mesQualTeleverser(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesQualFichier').click()">
                    ${MES_ICONS.add} ${mt('ajouter_piece')}</button>`}
        </div>`);
}

// ══════════════════════════════════════
//  Saisie : relevé, ajouts, retraits
// ══════════════════════════════════════

// ── Section F — l'examen des recours ──
// Une carence revenue du suivi porte les mesures que le prestataire conteste.
// Chacune ouvre un bloc : ce qu'elle impose, ce que le recours lui oppose, et
// ce que l'instance en décide.
const MES_DECISIONS_RECOURS = {
    maintenir: 'rec_maintenir', modifier: 'rec_modifier', annuler: 'rec_annuler',
};

function mesBlocRecours(m, i) {
    const off = mesQualModifiable() ? '' : 'disabled';
    const ro = !!off;
    const r = m.recours || {};
    const comites = mesComites();
    const fichiers = (genre, liste) => `
        <div class="mes-recours-pieces" data-genre="${genre}">${
            (liste || []).map((pj, k) => `
            <div class="mes-preuve" data-chemin="${_mesAttr(pj.path || '')}">
                <input class="mes-input" value="${_mesAttr(pj.nom || '')}"
                       placeholder="${_mesAttr(mt('intitule_piece'))}" ${off}>
                ${_mesChemin(pj.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                    href="${_mesAttr(_mesChemin(pj.path))}?nom=${encodeURIComponent(pj.nom || '')}"
                    title="${_mesAttr(mt('ouvrir'))}">${MES_ICONS.download}</a>` : ''}
                ${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}"
                    onclick="mesRecoursRetirerPiece(${i}, '${genre}', ${k})">${MES_ICONS.x}</button>`}
            </div>`).join('') || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
        ${ro ? '' : `<input type="file" id="mesRecoursFichier_${i}_${genre}" multiple style="display:none;"
                onchange="mesRecoursTeleverser(${i}, '${genre}', this.files)">
            <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                    onclick="document.getElementById('mesRecoursFichier_${i}_${genre}').click()">
                ${MES_ICONS.add} ${mt('ajouter_piece')}</button>`}`;

    const membres = (r.membres || []).map((p, k) => `
        <tr data-rang="${k}">
            <td><input class="mes-input" data-champ="nom" value="${_mesAttr(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${_mesAttr(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${_mesAttr(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${_mesAttr(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${_mesAttr(mt('retirer'))}" aria-label="${_mesAttr(mt('retirer'))}" onclick="mesRecoursRetirerMembre(${i}, ${k})">${MES_ICONS.x}</button>`}</td>
        </tr>`).join('');

    return `<div class="mes-bloc" data-rang="${i}">
        <div class="mes-bloc-entete">
            <span class="mes-bloc-titre">${_mesEsc(mesLibelleCategorie(m.categorie) || mt('mesure'))}</span>
            ${m.statut_recours === 'annulee' ? `<span class="mes-badge annulee">${mt('st_annulee')}</span>` : ''}
            ${m.statut_recours === 'modifiee' ? `<span class="mes-badge notifiee">${mt('st_modifiee')}</span>` : ''}
        </div>
        <div class="mes-bloc-corps">
            <div class="mes-paire">
                <div class="mes-champ">
                    <label>${mt('categorie_mesure')}</label>
                    <div class="mes-lecture">${_mesEsc(mesLibelleCategorie(m.categorie) || '—')}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('type_mesure')}</label>
                    <div class="mes-lecture">${_mesEsc(mesLibelleType(m.type_mesure) || '—')}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>${mt('fiche_desc_sanction')}</label>
                <div class="mes-lecture">${m.commentaire ? _mesEsc(m.commentaire)
                    : '<span class="mes-preuve-vide">—</span>'}</div>
            </div>
            <div class="mes-trois">
                <div class="mes-champ">
                    <label>${mt('fiche_date_sanction')}</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_sanction))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('col_echeance')}</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_fin))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('fiche_date_fin')}</label>
                    <div class="mes-lecture">${_mesEsc(mesDate(m.date_fin))}</div>
                </div>
            </div>

            <div class="mes-bloc-bande">${mt('objet_recours')}</div>
            <div class="mes-champ">
                <label>${mt('recours_intente')}</label>
                <textarea class="mes-input" data-champ="intente_texte" rows="3" ${off}
                          placeholder="${_mesAttr(mt('recours_exemple'))}"
                    >${_mesEsc(r.intente_texte || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('pieces_recours')}</label>
                ${fichiers('recours', r.pieces)}
            </div>

            <div class="mes-bloc-bande">${mt('examen_recours')}</div>
            <div class="mes-champ">
                <label>${mt('instance_recours')}</label>
                <select class="mes-select" data-champ="instance_code" ${off}>
                    <option value="">—</option>
                    ${comites.map((c) => `<option value="${_mesAttr(c.code)}"
                        ${r.instance_code === c.code ? 'selected' : ''}>${_mesEsc(c.libelle)}</option>`).join('')}
                </select>
            </div>
            <div class="mes-champ">
                <label>${mt('membres_recours')}</label>
                <div class="mes-table-wrap">
                    <table class="mes-table mes-table-claire mes-recours-membres">
                        <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
                            mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                        <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">${
                            mt('aucun_membre')}</td></tr>`}</tbody>
                    </table>
                </div>
                ${ro ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                    onclick="mesRecoursAjouterMembre(${i})">${MES_ICONS.add} ${mt('ajouter_membre')}</button>`}
            </div>
            <div class="mes-champ">
                <label>${mt('commentaire_recours')}</label>
                <textarea class="mes-input" data-champ="commentaire" rows="3" ${off}
                          placeholder="${_mesAttr(mt('commentaire_recours_exemple'))}">${_mesEsc(r.commentaire || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('decision_recours')}</label>
                <select class="mes-select" data-champ="decision" ${off}
                        onchange="mesRecoursDecision(${i}, this.value)">
                    <option value="">—</option>
                    ${Object.entries(MES_DECISIONS_RECOURS).map(([cle, clef]) => `<option value="${cle}"
                        ${r.decision === cle ? 'selected' : ''}>${_mesEsc(mt(clef))}</option>`).join('')}
                </select>
                ${r.decision === 'modifier' ? `<p class="mes-note">${mt('rec_note_modifier')}</p>` : ''}
                ${r.decision === 'annuler' ? `<p class="mes-note">${mt('rec_note_annuler')}</p>` : ''}
            </div>
            <div class="mes-champ" style="margin-bottom:0;">
                <label>${mt('pieces_decision')}</label>
                ${fichiers('decision', r.decision_pieces)}
            </div>
        </div>
    </div>`;
}

function mesSectionRecours() {
    const q = mesQualification();
    const contestees = (q.mesures || [])
        .map((m, i) => ({ m, i })).filter((x) => x.m.recours_intente);
    if (!contestees.length) return '';
    return mesSection('F', mt('onglet_recours'), `
        <p class="mes-note">Le prestataire conteste ${contestees.length} mesure(s). L’instance
           examine chaque recours et en décide : maintenir, modifier ou annuler la mesure.</p>
        <div id="mesRecoursBlocs">${contestees.map((x) => mesBlocRecours(x.m, x.i)).join('')}</div>`);
}

// La saisie des recours se relève avec le reste, et se recolle aux mesures par
// leur rang : la section F ne connaît pas d'autre clé.
function mesCollecterRecours() {
    const racine = document.getElementById('mesRecoursBlocs');
    if (!racine) return new Map();
    const val = (b, champ) => ((b.querySelector(`[data-champ="${champ}"]`) || {}).value || '').trim();
    const pieces = (b, genre) => [...b.querySelectorAll(`.mes-recours-pieces[data-genre="${genre}"] .mes-preuve`)]
        .map((r) => ({ nom: (r.querySelector('input') || {}).value || '', path: r.dataset.chemin || '' }));
    return new Map([...racine.querySelectorAll('.mes-bloc')].map((b) => [Number(b.dataset.rang), {
        intente_texte: val(b, 'intente_texte'),
        pieces: pieces(b, 'recours'),
        instance_code: val(b, 'instance_code'),
        membres: [...b.querySelectorAll('.mes-recours-membres tbody tr[data-rang]')].map((tr) => ({
            nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
            email: val(tr, 'email'), contact: val(tr, 'contact'),
        })),
        commentaire: val(b, 'commentaire'),
        decision: val(b, 'decision'),
        decision_pieces: pieces(b, 'decision'),
    }]));
}

const mesRecoursModifier = (i, action) => mesQualModifier((q) => {
    const m = q.mesures[i];
    if (!m) return;
    m.recours = m.recours || {};
    action(m.recours);
});

const mesRecoursAjouterMembre = (i) => mesRecoursModifier(i, (r) => {
    r.membres = (r.membres || []).concat([{ nom: '', prenom: '', email: '', contact: '' }]);
});
const mesRecoursRetirerMembre = (i, k) => mesRecoursModifier(i, (r) => {
    r.membres = (r.membres || []).filter((_, n) => n !== k);
});
const mesRecoursRetirerPiece = (i, genre, k) => mesRecoursModifier(i, (r) => {
    const cle = genre === 'decision' ? 'decision_pieces' : 'pieces';
    r[cle] = (r[cle] || []).filter((_, n) => n !== k);
});
// La décision redessine : elle change ce que le bloc de mesure laisse écrire,
// et l'aide qui l'accompagne.
const mesRecoursDecision = (i, valeur) => mesRecoursModifier(i, (r) => { r.decision = valeur; });

async function mesRecoursTeleverser(i, genre, fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajQualification();
    const q = mesQualification();
    const m = q.mesures[i];
    if (!m) return;
    m.recours = m.recours || {};
    const cle = genre === 'decision' ? 'decision_pieces' : 'pieces';
    m.recours[cle] = m.recours[cle] || [];
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const rep = await mesApi('/upload', { method: 'POST', body: corps });
            m.recours[cle].push({ nom: rep.filename, path: rep.path, size: rep.size });
        } catch (e) { mesToast(e.message || mt('depot_impossible'), 'error'); }
    }
    MES_STATE.traitement.qualification = q;
    mesQualRedessiner();
}

function mesCollecterQualification() {
    // L'étape se lit par volets : celui qui n'est pas affiché n'a pas de champs
    // dans le document. Ce qu'il porte est repris de l'état plutôt que remis à
    // zéro — changer d'onglet ne doit rien effacer.
    const etatQ = mesQualification();
    const surInfraction = !!document.getElementById('mesQualComite');
    const surMesures = !!document.getElementById('mesQualMesures');
    const surRecours = !!document.getElementById('mesRecoursBlocs');
    if (!surInfraction && !surMesures && !surRecours) return null;

    const val = (racine, champ) => ((racine.querySelector(`[data-champ="${champ}"]`) || {}).value || '');
    const lignes = (sel) => [...document.querySelectorAll(sel)];
    const txt = (id) => (document.getElementById(id) || {}).value || '';
    const etat = etatQ.mesures || [];
    const recours = surRecours ? mesCollecterRecours() : null;

    // Le recours d'une mesure : relevé du volet qui l'affiche, conservé sinon.
    const recoursDe = (m, rang) => (recours
        ? { recours_intente: !!recours.get(rang), recours: recours.get(rang) || null }
        : { recours_intente: !!m.recours_intente, recours: m.recours || null });

    const mesures = surMesures
        ? lignes('#mesQualMesures .mes-bloc').map((b, rang) => {
            const coche = (champ) => !!(b.querySelector(`[data-champ="${champ}"]`) || {}).checked;
            const portee = coche('temporelle') ? 'temporelle'
                : (coche('illimitee') ? 'illimitee' : (coche('sans_objet') ? 'sans_objet' : ''));
            const avant = etat[rang] || {};
            return {
                categorie: val(b, 'categorie'), type_mesure: val(b, 'type_mesure'),
                date_sanction: val(b, 'date_sanction'), portee,
                suivi_requis: coche('suivi_requis'),
                ...recoursDe(avant, rang),
                // Marques posées par le serveur : elles font l'aller-retour
                // sans être relues du corps de la requête.
                statut_recours: avant.statut_recours || '',
                version_precedente: avant.version_precedente || null,
                // Durée et terme n'ont de sens que pour une sanction temporelle.
                duree_valeur: portee === 'temporelle' ? Number(val(b, 'duree_valeur')) || 0 : 0,
                duree_unite: portee === 'temporelle' ? (val(b, 'duree_unite') || 'jours') : '',
                date_fin: portee === 'temporelle' ? val(b, 'date_fin') : '',
                commentaire: val(b, 'commentaire'),
            };
        })
        : etat.map((m, rang) => ({ ...m, ...recoursDe(m, rang) }));

    const pieces = surMesures
        ? lignes('#mesQualPieces .mes-preuve').map((r) => ({
            nom: (r.querySelector('input') || {}).value || '', path: r.dataset.chemin || '',
        }))
        : (etatQ.pieces || []);

    // Hors du volet « Qualification de l'infraction », l'instance et la
    // qualification restent celles de l'état.
    if (!surInfraction) return { ...etatQ, mesures, pieces };

    const coche = document.getElementById('mesQualConstituee');
    return {
        comite_code: (document.getElementById('mesQualComite') || {}).value || '',
        membres: lignes('#mesQualMembres tbody tr[data-rang]').map((tr) => ({
            nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
            email: val(tr, 'email'), contact: val(tr, 'contact'),
        })),
        reunions: lignes('#mesQualReunions .mes-bloc').map((b) => ({
            date: val(b, 'date'), objet: val(b, 'objet'), resultat: val(b, 'resultat'),
        })),
        infraction_constituee: !!(coche && coche.checked),
        infraction_non_constituee: !!(document.getElementById('mesQualNonConstituee') || {}).checked,
        renvoi_demande: !!(document.getElementById('mesQualRenvoi') || {}).checked,
        renvoi_motif: (document.getElementById('mesQualRenvoiMotif') || {}).value || '',
        nature: txt('mesQualNature'),
        caracterisation: txt('mesQualCaracterisation'),
        circonstances: txt('mesQualCirconstances'),
        mesures,
        pieces,
    };
}

const mesMajQualification = () => {
    const saisi = mesCollecterQualification();
    if (saisi) MES_STATE.traitement = { ...(MES_STATE.traitement || {}), qualification: saisi };
};

const mesQualRedessiner = () => mesAfficherSlider({ anime: false });

// Un ajout ou un retrait relève la saisie en cours avant de redessiner : rien
// de ce qui est tapé ne se perd.
function mesQualModifier(action) {
    mesMajQualification();
    const q = mesQualification();
    action(q);
    MES_STATE.traitement.qualification = q;
    mesQualRedessiner();
}

const mesQualAjouterMembre = () => mesQualModifier((q) => q.membres.push({ nom: '', prenom: '', email: '', contact: '' }));
const mesQualRetirerMembre = (i) => mesQualModifier((q) => { q.membres = q.membres.filter((_, k) => k !== i); });
const mesQualAjouterReunion = () => mesQualModifier((q) => q.reunions.push({ date: '', objet: '', resultat: '' }));
const mesQualRetirerReunion = (i) => mesQualModifier((q) => { q.reunions = q.reunions.filter((_, k) => k !== i); });
const mesQualAjouterMesure = () => mesQualModifier((q) => q.mesures.push({
    categorie: (mesCategories()[0] || {}).code || '', type_mesure: '',
    date_sanction: '', portee: '', duree_valeur: '', duree_unite: 'jours',
    // Le suivi est attendu par défaut : c'est en le décochant que l'instance
    // déclare qu'une mesure n'appelle pas de suivi de mise en œuvre, non en
    // omettant de le cocher.
    date_fin: '', commentaire: '', suivi_requis: true,
}));

// ── Durée et terme : chacun se déduit de l'autre ──
// La date de sanction sert d'ancre. Poser la durée fixe le terme ; poser le
// terme donne la durée. Les deux champs restent d'accord sans que l'agent ait
// à faire le calcul.
function mesAjouterDuree(depart, valeur, unite) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(depart || '') || !valeur) return '';
    const d = new Date(`${depart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    if (unite === 'mois') {
        const jour = d.getUTCDate();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + valeur);
        // Trois mois après le 31 janvier tombent au 30 avril : on ne déborde
        // pas sur le mois suivant.
        const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        d.setUTCDate(Math.min(jour, dernier));
    } else {
        d.setUTCDate(d.getUTCDate() + valeur);
    }
    return d.toISOString().slice(0, 10);
}

const mesBloc = (i) => document.querySelectorAll('#mesQualMesures .mes-bloc')[i];
const mesChampBloc = (i, champ) => (mesBloc(i) || document).querySelector(`[data-champ="${champ}"]`);

// La durée vient d'être saisie : le terme suit.
function mesQualDureeVersTerme(i) {
    const depart = (mesChampBloc(i, 'date_sanction') || {}).value || '';
    const valeur = Number((mesChampBloc(i, 'duree_valeur') || {}).value) || 0;
    const unite = (mesChampBloc(i, 'duree_unite') || {}).value || 'jours';
    const fin = mesChampBloc(i, 'date_fin');
    if (!fin) return;
    if (!depart) {
        mesToast(mt('date_sanction_dabord'), 'warning');
        return;
    }
    fin.value = mesAjouterDuree(depart, valeur, unite);
}

// Les deux dates d'une sanction : celle qui la prononce et celle qui la lève.
const mesDatesSanction = (i) => ({
    debut: mesChampBloc(i, 'date_sanction'), fin: mesChampBloc(i, 'date_fin'),
});

// Le terme vient d'être posé : la durée s'en déduit, dans l'unité retenue.
// Une sanction ne se lève pas avant d'être prononcée — la règle commune le dit
// et marque les champs ; la durée reste alors vide.
function mesQualTermeVersDuree(i) {
    if (!oasisDatesValider(mesDatesSanction(i))) {
        const champVide = mesChampBloc(i, 'duree_valeur');
        if (champVide) champVide.value = '';
        return;
    }
    const depart = (mesChampBloc(i, 'date_sanction') || {}).value || '';
    const fin = (mesChampBloc(i, 'date_fin') || {}).value || '';
    const champ = mesChampBloc(i, 'duree_valeur');
    const unite = (mesChampBloc(i, 'duree_unite') || {}).value || 'jours';
    if (!champ || !depart || !fin) return;
    const d1 = new Date(`${depart}T00:00:00Z`);
    const d2 = new Date(`${fin}T00:00:00Z`);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) { champ.value = ''; return; }
    if (unite === 'mois') {
        let mois = (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
        if (d2.getUTCDate() < d1.getUTCDate()) mois -= 1;
        champ.value = String(Math.max(0, mois));
    } else {
        champ.value = String(Math.round((d2 - d1) / 86400000));
    }
}

// Cocher une portée décoche l'autre ; décocher celle qui l'était laisse la
// portée indéterminée.
const mesQualPorteeMesure = (i, portee, coche) => mesQualModifier((q) => {
    if (q.mesures[i]) q.mesures[i].portee = coche ? portee : '';
});
// Le suivi requis commande le bouton « Clôturer » : la bascule redessine
// l'étape pour que le bandeau d'actions suive la case.
const mesQualSuiviRequis = (i, coche) => mesQualModifier((q) => {
    if (q.mesures[i]) q.mesures[i].suivi_requis = !!coche;
});
const mesQualRetirerMesure = (i) => mesQualModifier((q) => { q.mesures = q.mesures.filter((_, k) => k !== i); });
const mesQualRetirerPiece = (i) => mesQualModifier((q) => { q.pieces = q.pieces.filter((_, k) => k !== i); });

// Cocher « Infraction constituée » ouvre les trois champs de qualification et
// la section des mesures ; la décocher les referme.
// Les trois faces d'une même décision : cocher l'une décoche les deux autres.
const mesQualBasculerInfraction = (coche) => mesQualModifier((q) => {
    q.infraction_constituee = !!coche;
    if (coche) { q.infraction_non_constituee = false; q.renvoi_demande = false; }
});
const mesQualBasculerNonInfraction = (coche) => mesQualModifier((q) => {
    q.infraction_non_constituee = !!coche;
    if (coche) { q.infraction_constituee = false; q.renvoi_demande = false; }
});
const mesQualBasculerRenvoi = (coche) => mesQualModifier((q) => {
    q.renvoi_demande = !!coche;
    if (coche) { q.infraction_constituee = false; q.infraction_non_constituee = false; }
});

// Changer de catégorie vide le type : les types sont propres à leur catégorie.
const mesQualCategorieMesure = (i, code) => mesQualModifier((q) => {
    if (q.mesures[i]) { q.mesures[i].categorie = code; q.mesures[i].type_mesure = ''; }
});

async function mesQualTeleverser(fichiers) {
    if (!fichiers || !fichiers.length) return;
    mesMajQualification();
    const q = mesQualification();
    q.pieces = q.pieces || [];
    for (const f of fichiers) {
        try {
            const corps = new FormData();
            corps.append('file', f);
            const r = await mesApi('/upload', { method: 'POST', body: corps });
            q.pieces.push({ nom: r.filename, path: r.path, size: r.size });
        } catch (e) { mesToast(e.message || mt('depot_impossible'), 'error'); }
    }
    MES_STATE.traitement.qualification = q;
    mesQualRedessiner();
}

// Actions de l'étape, à l'extrême droite du fil. Chacune n'est offerte que si
// la case qui la justifie est cochée : on ne renvoie pas sans l'avoir demandé,
// on ne classe pas une infraction constituée, on ne suit pas ce qui ne l'est
// pas.
function mesActionsQualification() {
    const q = mesQualification();
    // L'étape est close : ses trois issues ne se rejouent pas. On la consulte,
    // et le badge dit ce qui en a été fait.
    const close = mesQualClose();
    if (close) {
        return `<span class="mes-badge cloturee">${_mesEsc(mt('q_badge_close', close))}</span>`;
    }
    if (!mesPeutDecider()) return '';
    const mesures = q.mesures || [];
    const suiviAttendu = mesures.some((m) => m.suivi_requis);
    const bouton = (actif, classe, aide, geste, libelle) => `<button class="btn btn-sm ${classe}"
        ${actif ? '' : 'disabled'} title="${_mesAttr(aide)}"
        onclick="${geste}">${_mesEsc(libelle)}</button>`;
    return [
        bouton(!!q.renvoi_demande, 'mes-btn-investiguer',
            mt('q_aide_renvoyer'), 'mesQualRenvoyer()', mt('renvoyer')),
        bouton(!!q.infraction_non_constituee, 'mes-btn-classer-vert',
            mt('q_aide_classer'), 'mesQualClasser()', mt('classer')),
        bouton(!!q.infraction_constituee, 'mes-btn-mesure',
            mt('q_aide_valider'), 'mesQualSuivi()', mt('valider')),
        // Clôture directe : elle ne s'offre que si aucune des mesures arrêtées
        // n'appelle le suivi de sa mise en œuvre. Une seule qui le demande, et
        // le dossier doit passer par l'étape de suivi.
        bouton(!!q.infraction_constituee && !!mesures.length && !suiviAttendu, 'btn-outline',
            !q.infraction_constituee
                ? mt('q_cocher_constituee')
                : (!mesures.length
                    ? mt('q_rien_a_cloturer')
                    : (suiviAttendu ? mt('q_suivi_requis') : mt('q_aide_cloturer'))),
            'mesQualCloturer()', mt('cloturer')),
    ].join('');
}

// Les trois issues enregistrent d'abord ce qui est saisi : la décision s'appuie
// dessus, et le serveur relit la qualification pour vérifier la case cochée.
async function mesQualIssue(chemin, confirmation, fait) {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    if (!await mesConfirmerEtape(confirmation)) return;
    mesMajQualification();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
            method: 'PUT', body: JSON.stringify(mesQualification()),
        });
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification/${chemin}`, { method: 'POST' });
        MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`);
        MES_STATE.etapeVue = '';
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesToast(fait);
        mesAfficherSlider({ anime: false });
        if (MES_STATE.currentPage === 'critiques') mesRenderPage();
    } catch (e) { mesToast(e.message || mt('operation_impossible'), 'error'); }
}

const mesQualRenvoyer = () => mesQualIssue('renvoyer', {
    titre: mt('q_titre_renvoyer'),
    depuis: 'qualification', vers: 'investigations',
    consequence: mt('q_cons_renvoyer'),
    points: [mt('q_pt_renvoyer1'), mt('q_pt_renvoyer2')],
    aveu: mt('q_aveu_renvoyer'),
    libelle: mt('renvoyer'), classe: 'mes-btn-investiguer',
}, mt('q_toast_renvoyer'));

const mesQualClasser = () => mesQualIssue('classer', {
    titre: mt('q_titre_classer'),
    depuis: 'qualification', vers: '',
    consequence: mt('q_cons_classer'),
    points: [mt('q_pt_classer')],
    aveu: mt('q_aveu_classer'),
    libelle: mt('classer'), classe: 'mes-btn-classer-vert',
}, mt('q_toast_classer'));

const mesQualSuivi = () => mesQualIssue('suivi', {
    titre: mt('q_titre_valider'),
    depuis: 'qualification', vers: 'suivi',
    consequence: mt('q_cons_valider'),
    points: [mt('q_pt_valider1'), mt('q_pt_valider2')],
    aveu: mt('q_aveu_valider'),
    libelle: mt('valider'), classe: 'mes-btn-mesure',
}, mt('q_toast_valider'));

const mesQualCloturer = () => mesQualIssue('cloturer', {
    titre: mt('q_titre_cloturer'),
    depuis: 'qualification', vers: '',
    consequence: mt('q_cons_cloturer'),
    points: [mt('q_pt_cloturer1'), mt('q_pt_cloturer2')],
    aveu: mt('q_aveu_cloturer'),
    libelle: mt('cloturer'), classe: 'btn-outline',
}, mt('q_toast_cloturer'));

async function mesEnregistrerQualification() {
    const c = MES_STATE.carenceEnCours;
    if (!c) return;
    mesMajQualification();
    try {
        await mesApi(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
            method: 'PUT', body: JSON.stringify(mesQualification()),
        });
        mesToast(mt('qualification_enregistree'));
    } catch (e) { mesToast(e.message || mt('enregistrement_impossible'), 'error'); }
}

Object.assign(window, {
    mesQualification, mesSectionRapportInvestigation, mesSectionInstance,
    mesSectionQualification, mesSectionMesuresArretees,
    mesQualAjouterMembre, mesQualRetirerMembre,
    mesQualAjouterReunion, mesQualRetirerReunion,
    mesQualAjouterMesure, mesQualRetirerMesure, mesQualCategorieMesure, mesQualPorteeMesure,
    mesQualSuiviRequis, mesQualCloturer,
    mesSectionRecours, mesQualVersionPrecedente, mesCollecterRecours,
    MES_QUAL_VOLETS, mesQualVolet, mesQualVoirVolet, mesQualOnglets, mesQualCorps,
    mesQualARecours,
    mesRecoursAjouterMembre, mesRecoursRetirerMembre, mesRecoursRetirerPiece,
    mesRecoursDecision, mesRecoursTeleverser,
    mesQualDureeVersTerme, mesQualTermeVersDuree, mesAjouterDuree,
    mesQualClose, mesQualModifiable,
    mesQualBasculerInfraction, mesQualBasculerNonInfraction, mesQualBasculerRenvoi,
    mesActionsQualification, mesQualRenvoyer, mesQualClasser, mesQualSuivi,
    mesQualTeleverser, mesQualRetirerPiece,
    mesMajQualification, mesEnregistrerQualification,
});
