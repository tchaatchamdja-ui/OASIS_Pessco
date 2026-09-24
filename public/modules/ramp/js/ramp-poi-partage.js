/* OASIS — Module « RAMP Inspections »
 * Partage d'une transmission entre États membres.
 *
 * Une fiche transmise ne se renégocie pas : ce qu'un État met à disposition
 * d'un autre en est une copie figée, consultable et téléchargeable depuis le
 * menu « Communication » du destinataire. Le formulaire dit à qui et quoi,
 * rappelle ce qui est déjà parti, et permet de revenir sur un envoi.
 */

// ── Partage d'une transmission ──
// Le formulaire dit à qui, et quoi : les deux lettres et les pièces se cochent
// une à une. Ce qui part est une copie figée, consultable et téléchargeable
// depuis le menu « Communication » du destinataire.
function rampPoiOuvrirPartage() {
    const p = RAMP_STATE.poiEnCours || {};
    // Seule une notification réellement partie se partage : une lettre
    // consignée après un échec d'envoi n'est encore chez personne.
    const faites = new Set((p.communications || []).filter((c) => c.envoye).map((c) => c.cible));
    const nbPieces = (p.pieces || []).length;
    // Destinataires possibles : les États membres de l'UEMOA, servis par le
    // menu Communication. Tant qu'ils ne sont pas là, on les demande et on
    // redessine la modale à leur arrivée.
    const etats = (typeof RAMP_COM !== 'undefined' && (RAMP_COM.etats || []).length)
        ? RAMP_COM.etats : [];
    if (!etats.length) {
        rampApi('/requetes').then((r) => {
            if (typeof RAMP_COM !== 'undefined') RAMP_COM.etats = r.etats || [];
            if (document.querySelector('.ramp-partage-etat') || !document.querySelector('.ramp-modal')) return;
            rampPoiOuvrirPartage();
        }).catch(() => {});
    }
    // Ce qui a déjà été mis à disposition, et à qui : on le rappelle sous les
    // destinataires, avec de quoi revenir sur un envoi.
    if (!RAMP_STATE.poiPartages || RAMP_STATE.poiPartages.poi_id !== p.id) {
        rampApi(`/poi/${p.id}/partages`).then((r) => {
            RAMP_STATE.poiPartages = { poi_id: p.id, liste: r.partages || [] };
            if (document.querySelector('.ramp-partage-etat')) rampPoiOuvrirPartage();
        }).catch(() => {});
    }
    const deja = ((RAMP_STATE.poiPartages || {}).liste || []);

    const case_ = (cle, libelle, dispo) => `
        <label class="ramp-droit${dispo ? '' : ' ramp-case-indispo'}">
            <input type="checkbox" id="rampPartage_${cle}" ${dispo ? 'checked' : 'disabled'}>
            <span><strong>${libelle}</strong></span>
        </label>`;

    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${rt('par_titre')} — ${_rEsc(p.reference || '')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-sous-titre">${rt('par_aide')}</p>
                <div class="ramp-champ">
                    <label>${rt('par_elements')}</label>
                    <div class="ramp-droits-liste">
                        ${case_('exploitant', rt('par_notif_exploitant'), faites.has('exploitant'))}
                        ${case_('autorite', rt('par_notif_autorite'), faites.has('autorite'))}
                        ${case_('pieces', rt('par_pieces', nbPieces), nbPieces > 0)}
                    </div>
                </div>
                <div class="ramp-champ">
                    <label>${rt('par_etats')}</label>
                    <div class="ramp-com-etats">
                        ${etats.length ? '' : `<span class="ramp-sous-titre">${rt('u_chargement')}</span>`}
                        ${etats.map((e) => `<label class="ramp-com-etat">
                            <input type="checkbox" class="ramp-partage-etat" value="${_rAttr(e)}">
                            <span>${_rEsc(e)}</span>
                        </label>`).join('')}
                    </div>
                </div>
                ${rampPoiPartagesFaits(deja)}
                <p class="ramp-erreur" id="rampPartageErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampPoiPartager()">
                    ${RAMP_ICONS.check} ${rt('par_partager')}</button>
            </div>
        </div>
    </div>`);
}

// Les partages déjà faits, un État par ligne : ce qu'il a reçu, quand, et de
// quoi le lui retirer. Un rappel ôte la copie de ses éléments partagés.
function rampPoiPartagesFaits(liste) {
    if (!liste.length) return '';
    const nom = { exploitant: rt('par_notif_exploitant'), autorite: rt('par_notif_autorite'), pieces: rt('par_pieces_jointes') };
    const lignes = [];
    liste.forEach((pa) => (pa.etats || []).forEach((etat) => {
        const contenu = Object.keys(nom).filter((k) => (pa.elements || {})[k]).map((k) => nom[k]).join(', ');
        lignes.push(`
        <li class="ramp-partage-fait">
            <div class="ramp-partage-fait-texte">
                <strong>${_rEsc(etat)}</strong>
                <span class="ramp-sous-titre">${_rEsc(contenu)} · ${_rEsc(rampPoiQuand(pa.partage_le))}</span>
            </div>
            ${pa.rappelable ? `<button class="btn btn-outline btn-sm"
                onclick="rampPoiRappelerPartage(${_rArg(pa.id)}, ${_rArg(etat)})">
                ${rt('par_rappeler')}</button>` : ''}
        </li>`);
    }));
    return `
    <div class="ramp-champ">
        <label>${rt('par_deja_partage')}</label>
        <ul class="ramp-partages-faits">${lignes.join('')}</ul>
    </div>`;
}

async function rampPoiRappelerPartage(id, etat) {
    const err = document.getElementById('rampPartageErreur');
    try {
        await rampApi(`/partages/${id}/rappeler`, { method: 'POST', body: JSON.stringify({ etat }) });
    } catch (e) {
        if (err) err.textContent = e.message || rt('m_enregistrement_impossible');
        return;
    }
    RAMP_STATE.poiPartages = null;
    rampToast(rt('par_rappel_fait', etat));
    rampPoiOuvrirPartage();
}

async function rampPoiPartager() {
    const p = RAMP_STATE.poiEnCours || {};
    const err = document.getElementById('rampPartageErreur');
    const coche = (cle) => {
        const el = document.getElementById(`rampPartage_${cle}`);
        return !!(el && el.checked && !el.disabled);
    };
    const elements = {
        exploitant: coche('exploitant'), autorite: coche('autorite'), pieces: coche('pieces'),
    };
    const etats = [...document.querySelectorAll('.ramp-partage-etat:checked')].map((c) => c.value);
    if (!etats.length) { if (err) err.textContent = rt('par_etat_requis'); return; }
    if (!elements.exploitant && !elements.autorite && !elements.pieces) {
        if (err) err.textContent = rt('par_element_requis'); return;
    }
    try {
        const r = await rampApi(`/poi/${p.id}/partager`, {
            method: 'POST', body: JSON.stringify({ etats, elements }),
        });
        RAMP_STATE.poiPartages = null;
        rampFermerModal();
        rampToast(rt('par_partage_fait', r.communications, r.pieces));
    } catch (e) {
        if (err) err.textContent = e.message || rt('m_enregistrement_impossible');
    }
}
