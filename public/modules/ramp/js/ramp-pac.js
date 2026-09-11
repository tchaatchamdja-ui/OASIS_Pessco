/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Suivi d'un écart : plan d'actions correctives et preuves.
 *
 * Repris du suivi des PAC du module « Exécution de la Surveillance » et ramené
 * à ce qu'appelle une inspection sur aire de trafic : la cause du constat, la
 * correction apportée sur-le-champ, la mesure qui empêche la répétition, et
 * les preuves de l'une et de l'autre.
 *
 * Deux volets, glissés depuis la droite : le plan lui-même, et le dépôt des
 * preuves — celui-ci n'est que la moitié « preuves » du premier, pour l'agent
 * qui n'a que des pièces à joindre.
 */

const RAMP_PAC_CHAMPS = ['cause_primaire', 'action_curative', 'curative_date_prevue',
    'actions_correctives', 'corrective_date_prevue'];

// L'écart tel que les états le connaissent, avec son inspection.
function rampEcartDe(id) {
    let trouve = null;
    (RAMP_STATE.data.inspections || []).forEach((i) => {
        (i.anomalies || []).forEach((a) => { if (a.id === id) trouve = { ...a, inspection: i }; });
    });
    return trouve;
}

const rampPacSoumis = (e) => !!((e || {}).pac || {}).soumis_le;

// ══════════════════════════════════════
//  Volet « Plan d'actions correctives »
// ══════════════════════════════════════

function rampOuvrirPac(id) {
    RAMP_STATE.pacEnCours = rampEcartDe(id);
    if (!RAMP_STATE.pacEnCours) { rampToast(rt('ecart_introuvable'), 'error'); return; }
    rampVoletPac();
}

function rampVoletPac() {
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerPac()">
                ${RAMP_ICONS.back} Retour
            </button>
            <span style="display:flex;">${RAMP_ICONS.clipboard}</span>
            <span class="ramp-slider-titre">${rt('pac_titre')}</span>
        </div>
        <div class="ramp-slider-body ramp-pac-corps">${rampPacHtml()}</div>`, 'max');
    RAMP_STATE.voletRejouer = rampVoletPac;
}

function rampFermerPac() {
    RAMP_STATE.pacEnCours = null;
    rampFermerSlider();
    rampRenderPage();
}

// Repères de l'écart traité : de quel constat il s'agit, sur quel appareil,
// et de quelle inspection il provient. Rendus en lignes intitulé/valeur, dans
// la section qui ouvre chaque volet.
function rampPacReperes(complet) {
    const e = RAMP_STATE.pacEnCours || {};
    const i = e.inspection || {};
    const ligne = (titre, valeur) => `<div class="ramp-poi-recap-ligne">
        <dt>${_rEsc(titre)}</dt><dd>${valeur || '<span class="ramp-vide">—</span>'}</dd></div>`;
    return `
        ${ligne(rt('c_poi'), _rEsc(i.poi_reference || '—'))}
        ${ligne(rt('c_item'), `${_rEsc(e.itemCode || '—')}${rampLibelleItem(e.itemCode)
            ? ` — ${_rEsc(rampLibelleItem(e.itemCode))}` : ''}`)}
        ${ligne(rt('c_categorie'), _rEsc(e.categorie || '—'))}
        ${complet ? ligne(rt('c_ref_std'), _rEsc(e.stdRef || '—')) : ''}
        ${ligne(rt('c_exploitant'), _rEsc(i.exploitant || '—'))}
        ${ligne(rt('c_immat_court'), _rEsc(i.immatriculation || '—'))}
        ${ligne(rt('c_date'), _rEsc(rampDate(i.date)))}
        ${ligne(rt('c_statut'), _rEsc(e.suivi || i.status || '—'))}`;
}

// Liste des preuves rattachées à une action, avec dépôt et retrait.
function rampPacPreuves(action, modifiable, sansLabel) {
    const e = RAMP_STATE.pacEnCours || {};
    const liste = (e.preuves || []).filter((p) => p.action === action);
    const lignes = liste.map((p) => `
        <div class="ramp-pac-preuve">
            <div>
                <strong>${_rEsc(p.intitule)}</strong>
                <div class="ramp-desc">${_rEsc(p.nom_origine)} · ${_rEsc(rampTaille(p.taille))}
                    · ${_rEsc(rampHorodatage(p.depose_le))}</div>
                ${p.commentaire ? `<div class="ramp-desc">${_rEsc(p.commentaire)}</div>` : ''}
            </div>
            <a class="btn btn-outline btn-sm ramp-btn-icone" title="Télécharger"
               href="${RAMP_API}/ecarts/${_rAttr(e.id)}/preuves/${_rAttr(p.id)}/fichier">${RAMP_ICONS.download}</a>
            ${modifiable ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                    style="color:#dc2626;border-color:#dc2626;" title="Retirer"
                    onclick="rampSupprimerPreuve(${_rArg(p.id)})">${RAMP_ICONS.delete}</button>` : ''}
        </div>`).join('');

    return `
    <div class="ramp-pac-preuves" id="rampPacPreuves_${action}">
        ${sansLabel ? '' : '<label>Preuves de l’action</label>'}
        ${lignes || `<p class="ramp-sous-titre" style="margin:.2rem 0;">${rt('aucune_preuve_deposee')}</p>`}
        ${modifiable ? `<button class="btn btn-outline btn-sm" style="margin-top:.35rem;"
                onclick="rampOuvrirDepotPreuve(${_rArg(action)})">
            ${RAMP_ICONS.add} Ajouter une preuve</button>` : ''}
    </div>`;
}

// ── Fil d'avancement ──
// Deux temps : le plan se rédige puis se soumet ; l'autorité le renvoie pour
// reprise ou solde l'écart. Les boutons du moment se tiennent au bout du fil.
const RAMP_PAC_ETAPES = () => [
    { cle: 'soumission', label: rt('pac_etape_soumission') },
    { cle: 'cloture', label: rt('pac_etape_cloture') },
];

const rampPacEtape = () => {
    const e = RAMP_STATE.pacEnCours || {};
    if (((e.evaluation || {}).cloture || {}).effective === 'OUI') return 'cloturee';
    return rampPacSoumis(e) ? 'cloture' : 'soumission';
};

function rampPacEtapeInfo(cle) {
    const e = RAMP_STATE.pacEnCours || {};
    const pac = e.pac || {};
    const cl = (e.evaluation || {}).cloture || {};
    if (cle === 'soumission') {
        if (pac.renvoye_le && !pac.soumis_le) {
            return `Renvoyé le ${rampHorodatage(pac.renvoye_le)} par ${pac.renvoye_par || '—'}`;
        }
        return pac.soumis_le ? `Soumis le ${rampHorodatage(pac.soumis_le)} par ${pac.soumis_par || '—'}`
            : 'Plan en cours de rédaction';
    }
    return cl.effective === 'OUI'
        ? `Écart soldé${cl.date_solde ? ` le ${rampDate(cl.date_solde)}` : ''}${
            cl.solde_par ? ` par ${cl.solde_par}` : ''}`
        : 'En attente de clôture';
}

function rampPacActions() {
    const etape = rampPacEtape();
    const b = [];
    if (etape === 'soumission' && rampPeutContribuer()) {
        b.push(`<button class="btn btn-primary btn-sm" onclick="rampEnregistrerPac(true)">${rt('poi_soumettre')}</button>`);
    }
    if (etape === 'cloture' && rampPacPeutEvaluer()) {
        b.push(`<button class="btn btn-outline btn-sm ramp-btn-renvoi"
                onclick="rampPacModalRenvoi()">${rt('poi_renvoyer')}</button>`);
        b.push(`<button class="btn btn-primary btn-sm" onclick="rampPacModalCloture()">${rt('pac_cloturer')}</button>`);
    }
    return b.join('');
}

function rampPacFil() {
    const etape = rampPacEtape();
    const rang = { soumission: 0, cloture: 1, cloturee: 2 }[etape];
    const pac = (RAMP_STATE.pacEnCours || {}).pac || {};
    const renvoye = !!pac.renvoye_le && !pac.soumis_le;
    const etapes = RAMP_PAC_ETAPES().map((x, i) => {
        const classe = i < rang ? 'done' : (i === rang ? 'current' : '');
        return `<span class="eval-step ramp-proc-step ${i === 0 && renvoye ? 'rejected' : classe}"
                    title="${_rAttr(rampPacEtapeInfo(x.cle))}">${_rEsc(x.label)}</span>`;
    }).join('');
    return `
    <div class="ramp-proc-barre">
        <div class="eval-steps ramp-proc-fil">${etapes}</div>
        <div class="ramp-proc-actions">${rampPacActions()}</div>
    </div>`;
}

// Renvoi et clôture se confirment : l'un rouvre la rédaction, l'autre solde.
function rampPacModalRenvoi() {
    const suivis = (rampPacEvaluation().verification.suivis || []);
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">Renvoyer le plan d’actions</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-note">
                    Le plan repasse en rédaction pour que les commentaires de suivi soient pris
                    en compte. La date de soumission est effacée ; le renvoi est consigné.
                </p>
                ${suivis.length ? `<div class="ramp-poi-version-corps">
                    ${suivis.map((x) => `<div class="ramp-poi-commentaire-lu">
                        <i>${_rEsc(rampHorodatage(x.date))} · ${_rEsc(x.auteur || '—')}</i>
                        <div class="ramp-desc">${_rEsc(x.texte)}</div>
                    </div>`).join('')}</div>`
                    : `<p class="ramp-erreur">${rt('renvoi_sans_suivi')}</p>`}
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm ramp-btn-renvoi"
                        onclick="rampPacRenvoyer()">${RAMP_ICONS.back} Confirmer le renvoi</button>
            </div>
        </div>
    </div>`);
}

function rampPacModalCloture() {
    const e = RAMP_STATE.pacEnCours || {};
    const cl = rampPacEvaluation().cloture;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">Clôturer l’écart</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-note">
                    La clôture solde l’écart ${_rEsc(e.itemCode || '')} : son suivi passe à
                    « Clôturé ». Les résultats de suivi restent consultables.
                </p>
                <div class="ramp-poi-grille ramp-poi-grille-2">
                    <div class="ramp-champ">
                        <label>${rt('pac_date_solde')}</label>
                        <input class="ramp-input" type="date" id="rampPacClotureDate"
                               value="${_rAttr(cl.date_solde || new Date().toISOString().slice(0, 10))}">
                    </div>
                    <div class="ramp-champ">
                        <label>${rt('pac_solde_par')}</label>
                        <input class="ramp-input" id="rampPacClotureQui" value="${_rAttr(cl.solde_par || '')}">
                    </div>
                </div>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm" onclick="rampPacCloturer()">Confirmer la clôture</button>
            </div>
        </div>
    </div>`);
}

async function rampPacRenvoyer() {
    const e = RAMP_STATE.pacEnCours;
    try {
        await rampApi(`/ecarts/${e.id}/pac/renvoyer`, { method: 'POST', body: '{}' });
        rampFermerModal();
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('plan_renvoye_reprise'));
    } catch (x) { rampToast(x.message || 'Renvoi impossible', 'error'); }
}

async function rampPacCloturer() {
    const e = RAMP_STATE.pacEnCours;
    const corps = {
        date_solde: (document.getElementById('rampPacClotureDate') || {}).value || '',
        solde_par: (document.getElementById('rampPacClotureQui') || {}).value || '',
    };
    try {
        await rampApi(`/ecarts/${e.id}/cloturer`, { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('ecart_cloture'));
    } catch (x) { rampToast(x.message || 'Clôture impossible', 'error'); }
}

function rampPacHtml() {
    const e = RAMP_STATE.pacEnCours || {};
    const pac = e.pac || {};
    const modifiable = rampPeutContribuer();
    const d = modifiable ? '' : 'disabled';
    const soumis = rampPacSoumis(e);

    return `
    <div class="ramp-poi-haut">${rampPacFil()}</div>

    <div class="ramp-card ramp-card-bandeau">
        <div class="ramp-card-entete">
            <span class="ramp-card-lettre">A</span>${rt('pac_constat')}</div>
        <dl class="ramp-poi-recap">
            ${rampPacReperes(true)}
            <div class="ramp-poi-recap-ligne" style="grid-column:1/-1;"><dt>Description</dt>
                <dd>${_rEsc(e.description || '—')}</dd></div>
        </dl>
    </div>

    <div class="ramp-pac-rang">
    <div class="ramp-card ramp-card-bandeau ramp-pac-plan">
        <div class="ramp-card-entete">
            <span class="ramp-card-lettre">B</span>${rt('pac_actions')}
            ${soumis ? `<span class="ramp-poi-envoi-etat">Soumis ${_rEsc(
                rampHorodatage(pac.soumis_le))} par ${_rEsc(pac.soumis_par || '—')}</span>` : ''}
        </div>
        <div class="ramp-poi-envoi-corps">
            <div class="ramp-champ">
                <label>${rt('pac_cause')}</label>
                <textarea class="ramp-input" rows="2" id="rampPac_cause_primaire" ${d}
                          placeholder="Ce qui a produit l’écart">${_rEsc(pac.cause_primaire || '')}</textarea>
            </div>
            <div class="ramp-champ">
                <!-- L'échéance se tient au bout de la ligne du libellé ; le
                     champ d'action occupe ensuite toute la largeur. -->
                <div class="ramp-pac-ligne">
                    <label>${rt('pac_mesures_immediates')}</label>
                    <span class="ramp-pac-echeance">
                        <label for="rampPac_curative_date_prevue">Date</label>
                        <input class="ramp-input" type="date" id="rampPac_curative_date_prevue" ${d}
                               value="${_rAttr(pac.curative_date_prevue || '')}">
                    </span>
                </div>
                <textarea class="ramp-input" rows="2" id="rampPac_action_curative" ${d}
                          placeholder="Ce qui a été corrigé sur-le-champ">${_rEsc(pac.action_curative || '')}</textarea>
            </div>
            ${rampPacPreuves('curative', modifiable)}

            <div class="ramp-champ" style="margin-top:.8rem;">
                <div class="ramp-pac-ligne">
                    <label>${rt('pac_mesures_complementaires')}</label>
                    <span class="ramp-pac-echeance">
                        <label for="rampPac_corrective_date_prevue">Date</label>
                        <input class="ramp-input" type="date" id="rampPac_corrective_date_prevue" ${d}
                               value="${_rAttr(pac.corrective_date_prevue || '')}">
                    </span>
                </div>
                <textarea class="ramp-input" rows="2" id="rampPac_actions_correctives" ${d}
                          placeholder="Ce qui empêche l’écart de se reproduire">${_rEsc(pac.actions_correctives || '')}</textarea>
            </div>
            ${rampPacPreuves('corrective', modifiable)}
        </div>
    </div>
    <div id="rampPacEvaluation" class="ramp-poi-commentaires${
        RAMP_STATE.pacEvaluationRepliee ? ' replie' : ''}">${rampPacEvaluationHtml()}</div>
    </div>

    ${rampPacResultatsHtml()}

    ${modifiable ? `
    <div class="ramp-poi-bas">
        <span class="ramp-sous-titre">
            La soumission date le plan et le porte au suivi de l’écart ; il reste modifiable ensuite.
        </span>
        <span style="flex:1;"></span>
        <button class="btn btn-outline btn-sm" onclick="rampEnregistrerPac(false)">${rt('enregistrer')}</button>
    </div>` : ''}`;
}

const rampPacCorps = () => {
    const corps = {};
    RAMP_PAC_CHAMPS.forEach((k) => {
        corps[k] = (document.getElementById(`rampPac_${k}`) || {}).value || '';
    });
    return corps;
};

async function rampEnregistrerPac(soumettre) {
    const e = RAMP_STATE.pacEnCours;
    try {
        await rampApi(`/ecarts/${e.id}/pac`, {
            method: 'PUT', body: JSON.stringify({ ...rampPacCorps(), soumettre: !!soumettre }),
        });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(soumettre ? 'Plan d’actions correctives soumis' : 'Plan enregistré');
    } catch (err) { rampToast(err.message || 'Enregistrement impossible', 'error'); }
}

// ══════════════════════════════════════
//  Évaluation et suivi (réservé à l'AAC)
// ══════════════════════════════════════
// Ce que l'autorité prononce sur le plan : acceptation, suivis successifs,
// vérification sur site. Le panneau se replie sur le côté, comme celui des
// commentaires de validation de la fiche d'inspection.

const rampPacPeutEvaluer = () => rampEstAdmin() || rampEstRegional();
const rampPacEvaluation = () => {
    const e = RAMP_STATE.pacEnCours || {};
    const ev = e.evaluation || {};
    return {
        acceptation: ev.acceptation || {},
        verification: ev.verification || {},
        cloture: ev.cloture || {},
    };
};

function rampPacEvaluationHtml() {
    const ev = rampPacEvaluation();
    const suivis = ev.verification.suivis || [];
    const peut = rampPacPeutEvaluer();
    // Un suivi s'amende tant que le plan n'a pas été soumis.
    const amendable = peut && !rampPacSoumis(RAMP_STATE.pacEnCours || {});
    const replie = RAMP_STATE.pacEvaluationRepliee;

    if (replie) {
        return `<button class="ramp-poi-commentaires-poignee pleine" type="button"
                title="${_rAttr(rt('deplier'))}" onclick="rampPacBasculerEvaluation()">
            ${RAMP_ICONS.chevron}
            <span class="ramp-poi-commentaires-titre-replie">${rt('pac_evaluation')}${
                suivis.length ? ` (${suivis.length})` : ''}</span>
        </button>`;
    }

    return `
    <button class="ramp-poi-commentaires-poignee" type="button" title="${_rAttr(rt('replier'))}"
            onclick="rampPacBasculerEvaluation()">${RAMP_ICONS.chevron}</button>
    <div class="ramp-poi-commentaires-corps">
        <div class="ramp-poi-commentaires-bandeau">
            <span class="ramp-poi-commentaires-pastille">i</span>
            <strong>${rt('pac_evaluation')}</strong>
            <span class="ramp-poi-commentaires-compte">${suivis.length}</span>
        </div>
        <div class="ramp-poi-commentaires-contenu">
            ${suivis.length ? suivis.map((x) => `
                <div class="ramp-poi-commentaire-lu">
                    <i>${_rEsc(rampHorodatage(x.date))} · ${_rEsc(x.auteur || '—')}${
                        x.modifie_le ? ` · modifié le ${_rEsc(rampHorodatage(x.modifie_le))}` : ''}</i>
                    ${RAMP_STATE.pacSuiviEdite === x.id ? `
                    <textarea class="ramp-input" id="rampPacSuiviEdition" rows="2">${_rEsc(x.texte)}</textarea>
                    <div class="ramp-poi-commentaires-actions" style="margin-top:.3rem;">
                        <button class="btn btn-primary btn-sm"
                                onclick="rampPacEnregistrerSuivi(${_rArg(x.id)})">Enregistrer</button>
                        <button class="btn btn-outline btn-sm"
                                onclick="rampPacEditerSuivi('')">Annuler</button>
                    </div>`
                    : `<div class="ramp-desc">${_rEsc(x.texte)}</div>
                    ${amendable ? `<div class="ramp-poi-commentaires-actions" style="margin-top:.25rem;">
                        <button class="btn btn-outline btn-sm"
                                onclick="rampPacEditerSuivi(${_rArg(x.id)})">Modifier</button>
                        <button class="btn btn-outline btn-sm" style="color:#dc2626;border-color:#dc2626;"
                                onclick="rampPacSupprimerSuivi(${_rArg(x.id)})">Retirer</button>
                    </div>` : ''}`}
                </div>`).join('')
                : `<p class="ramp-sous-titre">${rt('aucun_suivi_consigne')}</p>`}
            ${peut ? `
            <div class="ramp-champ" style="margin-top:.5rem;">
                <textarea class="ramp-input" id="rampPacSuiviTexte" rows="2"
                          placeholder="Ce que le suivi établit"></textarea>
            </div>
            <div class="ramp-poi-commentaires-actions">
                <button class="btn btn-primary btn-sm"
                        onclick="rampPacAjouterSuivi('rampPacSuiviTexte')">Ajouter</button>
            </div>` : ''}
        </div>
    </div>`;
}

function rampPacBasculerEvaluation() {
    RAMP_STATE.pacEvaluationRepliee = !RAMP_STATE.pacEvaluationRepliee;
    const zone = document.getElementById('rampPacEvaluation');
    if (!zone) { rampVoletPac(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.className = `ramp-poi-commentaires${RAMP_STATE.pacEvaluationRepliee ? ' replie' : ''}`;
    zone.innerHTML = rampPacEvaluationHtml();
    rendreDefilement();
}

// Résultats du suivi : acceptation du plan, preuves recueillies par
// l'autorité, et clôture de l'écart.
function rampPacResultatsHtml() {
    const ev = rampPacEvaluation();
    const peut = rampPacPeutEvaluer();
    const d = peut ? '' : 'disabled';

    return `
    <div class="ramp-card ramp-card-bandeau ramp-pac-resultats-carte">
        <div class="ramp-card-entete">
            <span class="ramp-card-lettre">C</span>${rt('pac_resultats')}
            ${ev.cloture.effective === 'OUI' || ev.cloture.date_solde ? `<span class="ramp-poi-envoi-etat">
                Écart soldé${ev.cloture.date_solde ? ` le ${_rEsc(rampDate(ev.cloture.date_solde))}` : ''}</span>` : ''}
        </div>
        <div class="ramp-poi-envoi-corps">
            <div class="ramp-pac-resultats">
                <div class="ramp-pac-bloc">
                    <div class="ramp-pac-bloc-titre">${rt('pac_commentaire_suivi')}</div>
                    ${peut ? `
                    <div class="ramp-pac-suivi-saisie">
                        <textarea class="ramp-input" id="rampPacSuiviResultats" rows="2"
                                  placeholder="Saisir un commentaire de suivi…"></textarea>
                        <button class="btn btn-primary btn-sm"
                                onclick="rampPacAjouterSuivi('rampPacSuiviResultats')">Ajouter</button>
                    </div>`
                    : '<p class="ramp-sous-titre" style="margin:0;">Réservé au valideur.</p>'}
                </div>
                <div class="ramp-pac-bloc">
                    <div class="ramp-pac-bloc-titre">${rt('pac_preuves')}</div>
                    ${rampPacPreuves('verification', peut, true)}
                </div>
                <div class="ramp-pac-bloc">
                    <div class="ramp-pac-bloc-titre">${rt('pac_cloture_ecart')}</div>
                    <div class="ramp-champ">
                        <label>${rt('pac_date_solde')}</label>
                        <input class="ramp-input" type="date" ${d} value="${_rAttr(ev.cloture.date_solde || '')}"
                               onchange="rampPacEvaluer({ date_solde: this.value })">
                    </div>
                    <div class="ramp-champ">
                        <label>${rt('pac_solde_par')}</label>
                        <input class="ramp-input" ${d} value="${_rAttr(ev.cloture.solde_par || '')}"
                               onchange="rampPacEvaluer({ solde_par: this.value })">
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

async function rampPacEvaluer(patch) {
    const e = RAMP_STATE.pacEnCours;
    try {
        await rampApi(`/ecarts/${e.id}/evaluation`, { method: 'PUT', body: JSON.stringify(patch) });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('evaluation_enregistree'));
    } catch (x) { rampToast(x.message || 'Enregistrement impossible', 'error'); }
}

function rampPacEditerSuivi(id) {
    RAMP_STATE.pacSuiviEdite = id || '';
    const zone = document.getElementById('rampPacEvaluation');
    if (!zone) { rampVoletPac(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPacEvaluationHtml();
    rendreDefilement();
}

async function rampPacEnregistrerSuivi(id) {
    const e = RAMP_STATE.pacEnCours;
    const texte = ((document.getElementById('rampPacSuiviEdition') || {}).value || '').trim();
    if (!texte) { rampToast(rt('commentaire_vide'), 'error'); return; }
    try {
        await rampApi(`/ecarts/${e.id}/evaluation/suivi/${id}`, {
            method: 'PUT', body: JSON.stringify({ texte }),
        });
        RAMP_STATE.pacSuiviEdite = '';
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('suivi_modifie'));
    } catch (x) { rampToast(x.message || 'Modification impossible', 'error'); }
}

async function rampPacSupprimerSuivi(id) {
    const e = RAMP_STATE.pacEnCours;
    if (!window.confirm('Retirer ce suivi ?')) return;
    try {
        await rampApi(`/ecarts/${e.id}/evaluation/suivi/${id}`, { method: 'DELETE' });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('suivi_retire'));
    } catch (x) { rampToast(x.message || 'Suppression impossible', 'error'); }
}

// Le brouillon des preuves : le commentaire de suivi se garde sans clore
// quoi que ce soit, tant que l'écart reste ouvert.
async function rampEnregistrerBrouillonPreuves() {
    const e = RAMP_STATE.pacEnCours;
    const champ = document.getElementById('rampPreuveSuivi');
    try {
        await rampApi(`/ecarts/${e.id}/pac`, {
            method: 'PUT',
            body: JSON.stringify({ commentaire_preuves: (champ || {}).value || '' }),
        });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPreuves();
        rampToast(rt('pr_brouillon_ok'));
    } catch (x) { rampToast(x.message || rt('m_enregistrement_impossible'), 'error'); }
}

async function rampPacAjouterSuivi(cible) {
    const e = RAMP_STATE.pacEnCours;
    const champ = document.getElementById(cible || 'rampPacSuiviTexte');
    const texte = (champ || {}).value || '';
    if (!texte.trim()) { rampToast(rt('commentaire_vide'), 'error'); return; }
    try {
        await rampApi(`/ecarts/${e.id}/evaluation/suivi`, {
            method: 'POST', body: JSON.stringify({ texte }),
        });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        rampVoletPac();
        rampToast(rt('suivi_consigne'));
    } catch (x) { rampToast(x.message || 'Enregistrement impossible', 'error'); }
}

// ══════════════════════════════════════
//  Volet « Ajouter des preuves »
// ══════════════════════════════════════
// La moitié « preuves » du plan : l'agent qui n'a que des pièces à joindre
// n'ouvre pas le formulaire entier.

function rampOuvrirPreuves(id) {
    RAMP_STATE.pacEnCours = rampEcartDe(id);
    if (!RAMP_STATE.pacEnCours) { rampToast(rt('ecart_introuvable'), 'error'); return; }
    rampVoletPreuves();
}

function rampVoletPreuves() {
    rampAfficherSlider(`
        <div class="ramp-slider-header">
            <button class="btn btn-outline btn-sm ramp-slider-retour" onclick="rampFermerPac()">
                ${RAMP_ICONS.back} Retour
            </button>
            <span style="display:flex;">${RAMP_ICONS.upload}</span>
            <span class="ramp-slider-titre">${rt('pr_titre')}</span>
        </div>
        <div class="ramp-slider-body ramp-pac-corps">${rampPreuvesHtml()}</div>`, 'moitie');
    RAMP_STATE.voletRejouer = rampVoletPreuves;
}

function rampPreuvesHtml() {
    const e = RAMP_STATE.pacEnCours || {};
    const pac = e.pac || {};
    const modifiable = rampPeutContribuer();
    const rappel = (titre, valeur) => `<div class="ramp-poi-recap-ligne pleine">
        <dt>${_rEsc(titre)}</dt><dd>${valeur ? _rEsc(valeur) : '<span class="ramp-vide">—</span>'}</dd></div>`;

    const cloturable = rampPacPeutEvaluer()
        && ((e.evaluation || {}).cloture || {}).effective !== 'OUI';

    return `
    <!-- La clôture se prononce au-dessus du constat : c'est la décision que
         l'on prend une fois les preuves lues. -->
    <div class="ramp-actions-bar">
        <span style="flex:1;"></span>
        ${cloturable ? `<button class="btn btn-primary btn-sm" onclick="rampPacModalCloture()">
            ${RAMP_ICONS.check} ${rt('pac_cloturer')}</button>` : ''}
    </div>
    <div class="ramp-card ramp-card-bandeau">
        <div class="ramp-card-entete"><span class="ramp-card-lettre">A</span>${rt('pac_constat')}</div>
        <dl class="ramp-poi-recap">
            ${rampPacReperes(false)}
            ${rappel(rt('c_description'), e.description)}
            ${rappel(rt('pr_action_curative'), pac.action_curative)}
            ${rappel(rt('pr_action_corrective'), pac.actions_correctives)}
        </dl>
    </div>
    <div class="ramp-card ramp-card-bandeau">
        <div class="ramp-card-entete"><span class="ramp-card-lettre">B</span>${rt('pr_deposees')}</div>
        <div class="ramp-poi-envoi-corps">
            ${rampToutesPreuves(modifiable)}
            <div class="ramp-champ" style="margin-top:.9rem;">
                <label for="rampPreuveSuivi">${rt('pr_commentaire')}</label>
                <textarea class="ramp-input" id="rampPreuveSuivi" rows="3" ${modifiable ? '' : 'disabled'}
                          placeholder="${_rAttr(rt('pr_commentaire_aide'))}"
                          >${_rEsc(pac.commentaire_preuves || '')}</textarea>
            </div>
        </div>
    </div>
    ${modifiable ? `
    <div class="ramp-poi-bas">
        <span class="ramp-sous-titre">${rt('pr_brouillon_aide')}</span>
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampEnregistrerBrouillonPreuves()">
            ${rt('pr_brouillon')}</button>
    </div>` : ''}`;
}

// Toutes les preuves d'un écart sous une seule liste : l'action à laquelle
// chacune se rattache se lit sur sa ligne, et un unique bouton les ajoute.
const RAMP_PREUVE_ACTIONS = () => [
    ['curative', rt('pr_action_curative')],
    ['corrective', rt('pr_action_corrective')],
];

function rampToutesPreuves(modifiable) {
    const e = RAMP_STATE.pacEnCours || {};
    const libelles = Object.fromEntries(RAMP_PREUVE_ACTIONS());
    const liste = (e.preuves || []).filter((p) => p.action !== 'verification');
    const lignes = liste.map((p) => `
        <div class="ramp-pac-preuve">
            <div>
                <strong>${_rEsc(p.intitule)}</strong>
                <span class="ramp-badge">${_rEsc(libelles[p.action] || p.action || '—')}</span>
                <div class="ramp-desc">${_rEsc(p.nom_origine)} · ${_rEsc(rampTaille(p.taille))}
                    · ${_rEsc(rampHorodatage(p.depose_le))}</div>
                ${p.commentaire ? `<div class="ramp-desc">${_rEsc(p.commentaire)}</div>` : ''}
            </div>
            <a class="btn btn-outline btn-sm ramp-btn-icone" title="${_rAttr(rt('telecharger'))}"
               href="${RAMP_API}/ecarts/${_rAttr(e.id)}/preuves/${_rAttr(p.id)}/fichier">${RAMP_ICONS.download}</a>
            ${modifiable ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                    style="color:#dc2626;border-color:#dc2626;" title="${_rAttr(rt('retirer'))}"
                    onclick="rampSupprimerPreuve(${_rArg(p.id)})">${RAMP_ICONS.delete}</button>` : ''}
        </div>`).join('');

    return `
    <div class="ramp-pac-preuves" id="rampPacPreuves_toutes">
        <label>${rt('pr_toutes')}</label>
        ${lignes || `<p class="ramp-sous-titre" style="margin:.2rem 0;">${rt('pr_aucune')}</p>`}
        ${modifiable ? `<button class="btn btn-outline btn-sm" style="margin-top:.35rem;"
                onclick="rampOuvrirDepotPreuve('')">
            ${RAMP_ICONS.add} ${rt('pr_ajouter_une')}</button>` : ''}
    </div>`;
}

// Dépôt d'une preuve : intitulé, commentaire, fichier — comme les pièces
// jointes de la fiche d'inspection.
function rampOuvrirDepotPreuve(action) {
    RAMP_STATE.preuveAction = action;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${rt('pr_ajouter_une')}${action
                    ? ` — ${action === 'curative' ? rt('pr_action_curative') : rt('pr_action_corrective')}` : ''}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                ${action ? '' : `<div class="ramp-champ">
                    <label>${rt('pr_rattachement')}</label>
                    <select class="ramp-select" id="rampPreuveRattachement">
                        ${RAMP_PREUVE_ACTIONS().map(([cle, lbl]) =>
        `<option value="${_rAttr(cle)}">${_rEsc(lbl)}</option>`).join('')}
                    </select>
                </div>`}
                <div class="ramp-champ">
                    <label>${rt('c_intitule')}</label>
                    <input class="ramp-input" id="rampPreuveIntitule" placeholder="ex. Ordre de travail signé">
                </div>
                <div class="ramp-champ">
                    <label>Commentaire</label>
                    <textarea class="ramp-input" id="rampPreuveCommentaire" rows="2"
                              placeholder="Ce que la pièce établit"></textarea>
                </div>
                <div class="ramp-champ">
                    <label>Fichier</label>
                    <input class="ramp-input" type="file" id="rampPreuveFichier">
                </div>
                <p class="ramp-note">PDF, images, documents bureautiques ou archives — 25 Mo au plus.</p>
                <p class="ramp-erreur" id="rampPreuveErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">Annuler</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnvoyerPreuve()">Déposer</button>
            </div>
        </div>
    </div>`);
}

async function rampEnvoyerPreuve() {
    const e = RAMP_STATE.pacEnCours;
    const err = document.getElementById('rampPreuveErreur');
    const fichier = (document.getElementById('rampPreuveFichier') || {}).files
        ? document.getElementById('rampPreuveFichier').files[0] : null;
    if (!fichier) { err.textContent = 'Choisissez un fichier'; return; }
    if (fichier.size > RAMP_PIECE_TAILLE_MAX) {
        err.textContent = `Fichier trop volumineux : ${rampTaille(fichier.size)} pour 25 Mo au plus`;
        return;
    }
    const fd = new FormData();
    fd.append('file', fichier);
    // Sans rattachement imposé, celui choisi dans la modale fait foi.
    const choisi = (document.getElementById('rampPreuveRattachement') || {}).value;
    fd.append('action', RAMP_STATE.preuveAction || choisi || 'curative');
    fd.append('intitule', (document.getElementById('rampPreuveIntitule') || {}).value || '');
    fd.append('commentaire', (document.getElementById('rampPreuveCommentaire') || {}).value || '');
    try {
        const r = await fetch(`${RAMP_API}/ecarts/${e.id}/preuves`, {
            method: 'POST', credentials: 'same-origin', body: fd,
        });
        // La réponse n'est pas toujours du JSON : on lit d'abord, on
        // interprète ensuite.
        const brut = await r.text();
        let rep = {};
        try { rep = brut ? JSON.parse(brut) : {}; } catch (x) { rep = {}; }
        if (!r.ok || !rep.status) {
            throw new Error(rep.error || `Dépôt refusé (HTTP ${r.status})`);
        }
        rampFermerModal();
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        if (RAMP_STATE.voletRejouer) RAMP_STATE.voletRejouer();
        rampToast(rt('preuve_deposee'));
    } catch (x) { err.textContent = x.message || 'Dépôt impossible'; }
}

async function rampSupprimerPreuve(id) {
    const e = RAMP_STATE.pacEnCours;
    const pj = (e.preuves || []).find((x) => x.id === id) || {};
    if (!await oasisConfirmer(`Retirer la preuve « ${pj.intitule || ''} » ?`)) return;
    try {
        await rampApi(`/ecarts/${e.id}/preuves/${id}`, { method: 'DELETE' });
        await rampLoadData();
        RAMP_STATE.pacEnCours = rampEcartDe(e.id);
        if (RAMP_STATE.voletRejouer) RAMP_STATE.voletRejouer();
        rampToast(rt('preuve_retiree'));
    } catch (x) { rampToast(x.message || 'Suppression impossible', 'error'); }
}

Object.assign(window, {
    RAMP_PAC_CHAMPS, rampEcartDe, rampPacSoumis,
    rampOuvrirPac, rampVoletPac, rampFermerPac, rampPacHtml, rampPacReperes,
    rampPacPreuves, rampEnregistrerPac,
    rampPacPeutEvaluer, rampPacEvaluation, rampPacEvaluationHtml, rampPacBasculerEvaluation,
    rampPacResultatsHtml, rampPacEvaluer, rampPacAjouterSuivi,
    rampPacEditerSuivi, rampPacEnregistrerSuivi, rampPacSupprimerSuivi,
    rampEnregistrerBrouillonPreuves, rampToutesPreuves, RAMP_PREUVE_ACTIONS,
    RAMP_PAC_ETAPES, rampPacEtape, rampPacEtapeInfo, rampPacActions, rampPacFil,
    rampPacModalRenvoi, rampPacModalCloture, rampPacRenvoyer, rampPacCloturer,
    rampOuvrirPreuves, rampVoletPreuves, rampPreuvesHtml,
    rampOuvrirDepotPreuve, rampEnvoyerPreuve, rampSupprimerPreuve,
});
