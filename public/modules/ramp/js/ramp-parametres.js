/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Écrans « Dépôt », « Contacts » et « Paramètres ».
 */

// ══════════════════════════════════════
//  Écran 6 — Dépôt de fichiers
// ══════════════════════════════════════
// Chaque État y dépose ses relevés mensuels. Le déposant et le gestionnaire
// modifient ou retirent ; le coordonnateur régional consulte et télécharge.

const RAMP_ANNEES_DEPOT = () => {
    const a = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(a - i));
};

const rampTaille = (o) => {
    const n = Number(o) || 0;
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
};

const rampHorodatage = (v) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime())
        ? d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
};

const rampPeutModifierDepot = (d) => rampEstAdmin()
    || (RAMP_STATE.user || {}).username === d.depose_par;
const rampPeutTelecharger = (d) => rampPeutModifierDepot(d) || rampEstRegional();

async function rampChargerDepots() {
    try {
        RAMP_STATE.data.depots = await rampApi('/depots');
        const corps = document.querySelector('[data-corps="depots"]');
        if (corps) corps.innerHTML = rampLignesDepots();
        // Les facettes dépendent des dépôts : elles se refont avec eux. Un
        // rendu complet boucherait — `rampChargerDepots` est appelée **depuis**
        // `rampRenderPage`.
        const filtres = document.querySelector('[data-filtres="depots"]');
        if (filtres) filtres.innerHTML = rampFiltresDepots();
    } catch (e) { rampToast(e.message || rt('m_depots_indisponibles'), 'error'); }
}

// Les dépôts retenus à un jeu de critères donné : la liste s'en sert, les
// filtres aussi, pour ne proposer que des mois et des déposants qui existent.
function rampDepotsFiltres(criteres) {
    const F = criteres || {};
    const q = _rNorm(F.depotRecherche || '');
    return RAMP_STATE.data.depots.filter((d) =>
        (!F.depotAnnee || d.annee === F.depotAnnee)
        && (!F.depotMois || d.mois === F.depotMois)
        && (!F.depotAuteur || d.depose_par === F.depotAuteur)
        && (!q || _rNorm(`${d.nom} ${d.nom_origine} ${d.depose_par} ${d.mois} ${d.annee}`).includes(q)));
}

function rampDepotFacette(cle, valeurDe) {
    const F = RAMP_STATE.filtres;
    const v = new Set();
    rampDepotsFiltres({ ...F, [cle]: '' }).forEach((d) => {
        const x = valeurDe(d); if (x) v.add(x);
    });
    if (F[cle]) v.add(F[cle]);
    return [...v];
}

function rampLignesDepots() {
    const liste = rampDepotsFiltres(RAMP_STATE.filtres);
    if (!liste.length) return `<tr><td colspan="7" class="ramp-table-vide">${rt('aucun_depot')}</td></tr>`;
    return liste.map((d) => `<tr>
        <td><strong>${_rEsc(d.nom)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);">${_rEsc(d.nom_origine || '')}</div></td>
        <td>${_rEsc(d.mois)} ${_rEsc(d.annee)}</td>
        <td>${_rEsc(rampTaille(d.taille))}</td>
        <td>${_rEsc(d.depose_par)}</td>
        <td>${_rEsc(rampHorodatage(d.depose_le))}</td>
        <td class="ramp-cell-actions">
            ${rampPeutTelecharger(d)
                ? `<a class="btn btn-outline btn-sm ramp-btn-icone" title="${_rAttr(rt('telecharger'))}"
                       href="${RAMP_API}/depots/${d.id}/fichier">${RAMP_ICONS.download}</a>`
                : '<span style="color:var(--text-muted);font-size:.78rem;">—</span>'}
        </td>
        <td class="ramp-cell-actions">
            ${rampPeutModifierDepot(d)
                ? `<button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampOuvrirDepot('${d.id}')"
                           title="${_rAttr(rt('modifier'))}" aria-label="${_rAttr(rt('modifier'))}">${RAMP_ICONS.edit}</button>
                   <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                           onclick="rampSupprimerDepot('${d.id}')" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>`
                : '<span style="color:var(--text-muted);font-size:.78rem;">—</span>'}
        </td>
    </tr>`).join('');
}

// ── Les facettes des dépôts, et une écriture qui ne se voyait qu'à moitié ──
//
// `rampChargerDepots()` ne rafraîchissait que le **corps du tableau**. La barre
// de filtres, elle, gardait les options calculées au premier rendu — c'est-à-dire
// **avant** que les dépôts ne soient chargés. Conséquences, mesurées par la
// ronde de RAMP (ADR-003 n° 5.f.32) :
//
//   — à l'arrivée sur l'écran, les trois listes d'année, de mois et de
//     déposant restaient **vides**, alors que la table affichait les dépôts ;
//   — après un dépôt, son année n'apparaissait pas dans le filtre, et l'agent
//     ne pouvait pas filtrer sur ce qu'il venait de déposer.
//
// La barre est donc extraite et porte son propre point d'ancrage, pour être
// rafraîchie par le même mécanisme partiel que le corps. Elle n'est **pas**
// refaite par la recherche : son champ y vit, et son curseur serait perdu à
// chaque frappe — c'est la raison d'être du redessin partiel.
function rampFiltresDepots() {
    const F = RAMP_STATE.filtres;
    const auteurs = rampDepotFacette('depotAuteur', (d) => d.depose_par)
        .sort((a, b) => a.localeCompare(b, 'fr'));
    const annees = rampDepotFacette('depotAnnee', (d) => d.annee).sort((a, b) => Number(b) - Number(a));
    const mois = rampDepotFacette('depotMois', (d) => d.mois)
        .sort((a, b) => RAMP_MOIS.indexOf(a) - RAMP_MOIS.indexOf(b));
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${cur === v ? 'selected' : ''}>${_rEsc(l)}</option>`;
    // Même disposition que les autres filtres du module : les listes de largeur
    // égale, puis la recherche qui prend ce qui reste du rang.
    return `
        <select class="ramp-select" onchange="rampSetFiltre('depotAnnee', this.value)">
            <option value="">${rt('f_annees')}</option>
            ${annees.map((a) => opt(a, a, F.depotAnnee)).join('')}
        </select>
        <select class="ramp-select" onchange="rampSetFiltre('depotMois', this.value)">
            <option value="">${rt('p_tous_mois')}</option>
            ${mois.map((m) => opt(m, m, F.depotMois)).join('')}
        </select>
        <select class="ramp-select" onchange="rampSetFiltre('depotAuteur', this.value)">
            <option value="">${rt('p_tous_deposants')}</option>
            ${auteurs.map((a) => opt(a, a, F.depotAuteur)).join('')}
        </select>
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${rt('rechercher_depot')}"
                   value="${_rAttr(F.depotRecherche || '')}"
                   oninput="rampChercherDepot(this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampResetFiltresDepot()"
                title="${rt('reinitialiser_filtres')}" aria-label="${rt('reinitialiser_filtres')}">${RAMP_ICONS.reset}</button>`;
}

function rampRenderDepot() {
    return `
    <div class="ramp-page-header">
        <h2>${rt('p_depot_titre')}</h2>
        <span class="ramp-sous-titre">${rt('p_depot_sous')}</span>
    </div>
    <div class="ramp-filtres" data-filtres="depots">${rampFiltresDepots()}</div>
    <div class="ramp-actions-bar">
        <span style="flex:1;"></span>
        ${rampPeutContribuer()
            ? `<button class="btn btn-primary btn-sm" onclick="rampOuvrirDepot()">
                   ${RAMP_ICONS.add} Déposer un fichier</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th>${rt('c_intitule')}</th>
                    <th style="width:150px;">${rt('p_periode')}</th>
                    <th style="width:90px;">${rt('p_taille')}</th>
                    <th style="width:180px;">${rt('p_depose_par')}</th>
                    <th style="width:150px;">${rt('p_le')}</th>
                    <th style="width:80px;text-align:center;">${rt('c_fichier')}</th>
                    <th style="width:110px;text-align:center;">${rt('c_actions')}</th>
                </tr></thead>
                <tbody data-corps="depots">${rampLignesDepots()}</tbody>
            </table>
        </div>
    </div>`;
}

// La recherche ne redessine que le corps du tableau : re-rendre la page
// entière ferait perdre le curseur à chaque frappe.
function rampChercherDepot(valeur) {
    RAMP_STATE.filtres.depotRecherche = valeur;
    const corps = document.querySelector('[data-corps="depots"]');
    if (!corps) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    corps.innerHTML = rampLignesDepots();
    rendreDefilement();
}

function rampResetFiltresDepot() {
    const F = RAMP_STATE.filtres;
    F.depotAnnee = ''; F.depotMois = ''; F.depotAuteur = ''; F.depotRecherche = '';
    rampRenderPage();
}

function rampOuvrirDepot(id) {
    const d = id ? RAMP_STATE.data.depots.find((x) => x.id === id) : null;
    RAMP_STATE.depotEnCours = d ? { ...d } : {};
    const nouveau = !d;
    const maintenant = new Date();
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${cur === v ? 'selected' : ''}>${_rEsc(l)}</option>`;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${nouveau ? 'Déposer un fichier' : 'Modifier le dépôt'}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                ${nouveau ? `
                <div class="ramp-champ">
                    <label>Fichier</label>
                    <div class="ramp-depot-zone" onclick="document.getElementById('rampFichierDepot').click()">
                        ${RAMP_ICONS.upload}
                        <div id="rampNomFichier" style="margin-top:.4rem;font-weight:600;">${rt('choisir_fichier')}</div>
                        <div style="font-size:.78rem;">xlsx, xls, csv, pdf, docx, zip, images — 50 Mo maximum</div>
                    </div>
                    <input type="file" id="rampFichierDepot" style="display:none;"
                           onchange="document.getElementById('rampNomFichier').textContent = this.files[0] ? this.files[0].name : 'Choisir un fichier';">
                </div>` : ''}
                <div class="ramp-champ">
                    <label>${rt('c_intitule')}</label>
                    <input class="ramp-input" id="rampDepotNom" value="${_rAttr((d || {}).nom || '')}"
                           placeholder="${rt('ex_depot')}">
                </div>
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>${rt('annee_label')}</label>
                        <select class="ramp-select" id="rampDepotAnnee">
                            ${RAMP_ANNEES_DEPOT().map((a) =>
                                opt(a, a, (d || {}).annee || String(maintenant.getFullYear()))).join('')}
                        </select>
                    </div>
                    <div class="ramp-champ">
                        <label>Mois</label>
                        <select class="ramp-select" id="rampDepotMois">
                            ${RAMP_MOIS.map((m) =>
                                opt(m, m, (d || {}).mois || RAMP_MOIS[maintenant.getMonth()])).join('')}
                        </select>
                    </div>
                </div>
                <p class="ramp-erreur" id="rampDepotErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerDepot()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerDepot() {
    const d = RAMP_STATE.depotEnCours || {};
    const err = document.getElementById('rampDepotErreur');
    const nom = (document.getElementById('rampDepotNom') || {}).value || '';
    const annee = (document.getElementById('rampDepotAnnee') || {}).value || '';
    const mois = (document.getElementById('rampDepotMois') || {}).value || '';
    if (!nom.trim()) { err.textContent = oasisChampRequis('intitule'); return; }

    try {
        if (d.id) {
            await rampApi(`/depots/${d.id}`, {
                method: 'PUT', body: JSON.stringify({ nom, annee, mois }),
            });
        } else {
            const champ = document.getElementById('rampFichierDepot');
            const fichier = champ && champ.files[0];
            if (!fichier) { err.textContent = 'Choisissez un fichier'; return; }
            const fd = new FormData();
            fd.append('file', fichier);
            fd.append('nom', nom);
            fd.append('annee', annee);
            fd.append('mois', mois);
            const r = await fetch(`${RAMP_API}/depots`, { method: 'POST', credentials: 'same-origin', body: fd });
            const rep = await r.json();
            if (!r.ok) throw new Error(oasisMessageErreur(rep, r.status));
        }
        rampFermerModal();
        await rampChargerDepots();
        rampToast(rt('depot_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampSupprimerDepot(id) {
    const d = RAMP_STATE.data.depots.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(rt('confirmer_suppr_depot', d.nom))) return;
    try {
        await rampApi(`/depots/${id}`, { method: 'DELETE' });
        await rampChargerDepots();
        rampToast(rt('depot_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Écran 7 — Contacts
// ══════════════════════════════════════
// Le carnet des correspondants, groupé par État et déplié par défaut : le
// carnet se lit d'un regard, on ne le referme que pour dégager la vue.

async function rampChargerContacts() {
    try {
        RAMP_STATE.data.contacts = await rampApi('/contacts');
        const zone = document.querySelector('[data-zone="contacts"]');
        if (zone) zone.innerHTML = rampTableContacts();
    } catch (e) { rampToast(e.message || 'Contacts indisponibles', 'error'); }
}

// Un coordonnateur national ne tient que le carnet de son État. Un compte sans
// portée déclarée n'est borné par rien : c'est le cas des administrateurs.
function rampPeutGererEtat(etat) {
    if (rampEstAdmin() || rampEstRegional()) return true;
    if (rampRole() !== 'Coordonnateur National') return false;
    const etats = (RAMP_STATE.user || {}).etats || [];
    return etats.length === 0 || etats.includes(etat);
}

function rampTableContacts() {
    const liste = rampAppliquerTri(RAMP_STATE.data.contacts || [], 'contacts', (c, k) => {
        if (k === 'nom') return `${c.nom || ''} ${c.prenom || ''}`;
        if (k === 'actif') return c.actif === false ? 1 : 0;
        return c[k];
    });
    if (!liste.length) return `<div class="ramp-vide">${rt('aucun_contact')}</div>`;

    return `
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table ramp-table-fixe">
                <thead><tr>
                    ${rampTh('contacts', 'etat', rt('c_etat'), 'width:105px;')}
                    ${rampTh('contacts', 'nom', rt('p_nom_prenoms'), 'width:165px;')}
                    ${rampTh('contacts', 'fonction', rt('p_fonction'))}
                    ${rampTh('contacts', 'email', rt('p_courriel'), 'width:185px;')}
                    ${rampTh('contacts', 'telephone', rt('p_telephone'), 'width:118px;')}
                    ${rampTh('contacts', 'actif', rt('c_statut'), 'width:92px;text-align:center;')}
                    <th style="width:124px;text-align:center;">${rt('c_actions')}</th>
                </tr></thead>
                <tbody>${liste.map(rampLigneContact).join('')}</tbody>
            </table>
        </div>
    </div>`;
}

function rampLigneContact(c) {
    const gerable = rampPeutGererEtat(c.etat);
    return `<tr ${c.actif === false ? 'style="opacity:.55;"' : ''}>
        <td>${_rEsc(c.etat || '—')}</td>
        <td>
            <strong>${_rEsc(c.nom || '—')}</strong>
            <span class="ramp-sous-ligne">${_rEsc(c.prenom || '')}</span>
        </td>
        <td>${_rEsc(c.fonction || '—')}${c.autres
        ? `<span class="ramp-sous-ligne">${_rEsc(c.autres)}</span>` : ''}</td>
        <td>${c.email ? `<a href="mailto:${_rAttr(c.email)}">${_rEsc(c.email)}</a>` : '—'}</td>
        <td>${_rEsc(c.telephone || '—')}</td>
        <td style="text-align:center;">
            <span class="ramp-badge ${c.actif === false ? 'inactif' : 'actif'}">
                ${c.actif === false ? rt('inactif') : rt('actif')}</span></td>
        <td class="ramp-cell-actions">
            ${gerable ? `
            <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampOuvrirContact('${c.id}')"
                    title="${_rAttr(rt('modifier'))}" aria-label="${_rAttr(rt('modifier'))}">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampBasculerContact('${c.id}')"
                    title="${_rAttr(c.actif === false ? rt('activer') : rt('desactiver'))}" aria-label="${_rAttr(c.actif === false ? rt('activer') : rt('desactiver'))}">${RAMP_ICONS.toggle}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerContact('${c.id}')" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>`
        : '<span class="ramp-sous-ligne">—</span>'}
        </td>
    </tr>`;
}

function rampRenderContacts() {
    return `
    <div class="ramp-page-header">
        <h2>${rt('p_contacts_titre')}</h2>
        <span class="ramp-sous-titre">${rt('correspondants_etats')}</span>
    </div>
    <p class="ramp-note">
        Un coordonnateur national tient le carnet de son État ; le gestionnaire du module et
        le coordonnateur régional, celui de tous. Un contact retiré des listes se désactive
        plutôt qu’il ne se supprime.
    </p>
    <div class="ramp-actions-bar">
        <button class="btn btn-primary btn-sm" onclick="rampExporterContacts()">
            ${RAMP_ICONS.download} Exporter Excel</button>
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampOuvrirContact()">
            ${RAMP_ICONS.add} Ajouter un contact</button>
    </div>
    <div data-zone="contacts">${rampTableContacts()}</div>`;
}

function rampOuvrirContact(id) {
    const c = id ? RAMP_STATE.data.contacts.find((x) => x.id === id) : null;
    RAMP_STATE.contactEnCours = c ? { ...c } : {};
    const etats = RAMP_STATE.etatsContact.length ? RAMP_STATE.etatsContact : RAMP_STATE.etatsInspection;
    const champ = (label, id2, valeur, type) => `
        <div class="ramp-champ"><label>${_rEsc(label)}</label>
            <input class="ramp-input" id="${id2}" type="${type || 'text'}" value="${_rAttr(valeur || '')}"></div>`;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${c ? 'Modifier le contact' : 'Nouveau contact'}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-champ">
                    <label>${rt('c_etat')}</label>
                    <select class="ramp-select" id="rampContactEtat">
                        <option value="">—</option>
                        ${etats.filter(rampPeutGererEtat).map((e) =>
                            `<option value="${_rAttr(e)}" ${(c || {}).etat === e ? 'selected' : ''}>${_rEsc(e)}</option>`).join('')}
                    </select>
                </div>
                <div class="ramp-paire">
                    ${champ('Nom', 'rampContactNom', (c || {}).nom)}
                    ${champ('Prénoms', 'rampContactPrenom', (c || {}).prenom)}
                </div>
                ${champ('Fonction', 'rampContactFonction', (c || {}).fonction)}
                <div class="ramp-paire">
                    ${champ('Courriel', 'rampContactEmail', (c || {}).email, 'email')}
                    ${champ('Téléphone', 'rampContactTel', (c || {}).telephone)}
                </div>
                <div class="ramp-champ">
                    <label>Autres informations</label>
                    <textarea class="ramp-input" id="rampContactAutres" rows="2">${_rEsc((c || {}).autres || '')}</textarea>
                </div>
                <p class="ramp-erreur" id="rampContactErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerContact()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerContact() {
    const c = RAMP_STATE.contactEnCours || {};
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampContactErreur');
    const corps = {
        etat: v('rampContactEtat'), nom: v('rampContactNom'), prenom: v('rampContactPrenom'),
        fonction: v('rampContactFonction'), email: v('rampContactEmail'),
        telephone: v('rampContactTel'), autres: v('rampContactAutres'),
    };
    if (!corps.etat) { err.textContent = 'État requis'; return; }
    if (!corps.nom.trim() || !corps.prenom.trim()) { err.textContent = 'Nom et prénoms requis'; return; }
    try {
        if (c.id) await rampApi(`/contacts/${c.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/contacts', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        await rampChargerContacts();
        rampToast(rt('contact_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampBasculerContact(id) {
    try {
        await rampApi(`/contacts/${id}/actif`, { method: 'PUT', body: '{}' });
        await rampChargerContacts();
    } catch (e) { rampToast(e.message || rt('m_action_impossible'), 'error'); }
}

async function rampSupprimerContact(id) {
    const c = RAMP_STATE.data.contacts.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(rt('confirmer_suppr_contact', `${c.prenom} ${c.nom}`))) return;
    try {
        await rampApi(`/contacts/${id}`, { method: 'DELETE' });
        await rampChargerContacts();
        rampToast(rt('contact_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

const rampExporterContacts = () => rampTelecharger('/contacts/export-xlsx', {}, 'contacts_ramp.xlsx');

// ══════════════════════════════════════
//  Écran 8 — Paramètres
// ══════════════════════════════════════
// Sept familles. Les colonnes montrées dépendent de la famille : un item porte
// un code et un groupe, une catégorie une pondération, un État rien de plus
// que son libellé.

const RAMP_FAMILLES = [
    // L'exploitant porte son pays de provenance et sa certification UEMOA.
    { cle: 'exploitants', cleT: 'p_famille_exploitants', code: false, cat: false, pond: false, desc: false, pays: true },
    // Les items se rangent par groupe : leur écran a sa propre présentation.
    { cle: 'items', cleT: 'p_famille_items', code: true, cat: true, pond: false, desc: true, groupe: true },
    // Catégorie, classe d'action et statut de suivi qualifient tous trois un
    // écart : ce qu'on a relevé, ce qu'on en fait, et où en est son suivi. Les
    // trois listes se règlent sous le même sous-menu.
    { cle: 'categories', cleT: 'p_famille_categories', code: true, cat: false, pond: true, desc: true },
    { cle: 'actions', cleT: 'p_famille_actions', code: true, cat: false, pond: false, desc: true },
    { cle: 'statuts', cleT: 'p_famille_statuts', code: false, cat: false, pond: false, desc: false },
];

// Sous-menus de l'écran. Un sous-menu peut porter plusieurs familles :
// « Constatations » réunit les catégories d'écart et les actions SAFA.
const RAMP_ONGLETS_PARAM = [
    // Les pays ne sont plus un simple libellé : bigramme, autorité de
    // l'aviation civile et coordonnées. Ils ont leur écran.
    { cle: 'pays', cleT: 'p_onglet_pays', icone: 'globe', familles: [], ecran: 'pays' },
    { cle: 'exploitants', cleT: 'p_onglet_exploitants', icone: 'contacts', familles: ['exploitants'] },
    // La nomenclature des aéronefs compte près de dix mille lignes : elle a son
    // propre écran, servi page par page, et non un bloc de paramètres.
    { cle: 'aeronefs', cleT: 'p_onglet_aeronefs', icone: 'plane', familles: [], ecran: 'aeronefs' },
    // Les aéroports du dispositif, rangés par pays : leur écran leur est propre.
    { cle: 'aeroports', cleT: 'p_onglet_aeroports', icone: 'tour', familles: [], ecran: 'aeroports' },
    { cle: 'items', cleT: 'p_onglet_items', icone: 'clipboard', familles: ['items'] },
    // Un écart se qualifie par sa catégorie, la classe d'action qui s'ensuit et
    // le statut de son suivi : les trois listes se règlent au même endroit.
    { cle: 'constatations', cleT: 'p_onglet_ecarts', icone: 'warning', familles: ['categories', 'actions', 'statuts'] },
];

const rampOngletParamCourant = () =>
    RAMP_ONGLETS_PARAM.find((o) => o.cle === RAMP_STATE.paramOnglet) || RAMP_ONGLETS_PARAM[0];

// Groupes d'items — la liste qui range les items SAFA. Elle se tient depuis
// l'écran des items, pas dans un sous-menu à part : on n'y va que pour ranger
// des items.
const rampGroupes = () => rampFamille('groupes');
const rampLibelleGroupe = (code) => {
    const g = rampGroupes().find((x) => x.code === code);
    // Un item importé avant que les groupes n'existent porte l'intitulé du
    // groupe plutôt que son code : on l'affiche tel quel.
    return g ? g.label : (code || 'Sans groupe');
};

// Un sous-menu porte une ou plusieurs familles : les formulaires reçoivent
// donc la famille visée, et retombent sur la première du sous-menu courant.
const rampFamilleDe = (cle) => RAMP_FAMILLES.find((f) => f.cle === cle)
    || RAMP_FAMILLES.find((f) => f.cle === rampOngletParamCourant().familles[0])
    || RAMP_FAMILLES[0];

function rampParamOnglet(cle) {
    RAMP_STATE.paramOnglet = cle;
    rampRenderPage();
}

// La bande latérale se replie sur ses icônes, comme au portail : les écrans de
// paramétrage tiennent des tables larges, et la place se prend là.
function rampBasculerBarreParam() {
    RAMP_STATE.paramBarreRepliee = !RAMP_STATE.paramBarreRepliee;
    rampRenderPage();
}

// Les écrans servis par leur propre route chargent à la demande, et depuis le
// rendu plutôt que depuis le clic sur l'onglet : on arrive aussi sur ces
// sous-menus par la navigation, sans passer par `rampParamOnglet`.
function rampChargerEcranParam(ecran) {
    const S = RAMP_STATE;
    if (ecran === 'pays' && !S.pays.liste.length && !S.pays.chargement) setTimeout(rampChargerPays, 0);
    if (ecran === 'aeroports' && !S.aeroports.liste.length && !S.aeroports.chargement) {
        setTimeout(rampChargerAeroports, 0);
    }
    if (ecran === 'aeronefs' && !S.aeronefs.resultat && !S.aeronefs.chargement) {
        setTimeout(rampChargerAeronefs, 0);
    }
}

function rampRenderParametres() {
    const onglet = rampOngletParamCourant();
    if (onglet.ecran) rampChargerEcranParam(onglet.ecran);
    const modifiable = !!RAMP_STATE.data.parametres.modifiable;

    // Les sous-menus des Paramètres reprennent la bande latérale du portail :
    // une colonne d'entrées à icône, qui se replie sur ses seules icônes.
    const onglets = RAMP_ONGLETS_PARAM.map((x) => `
        <button class="cfg-sidebar-item ${x.cle === onglet.cle ? 'active' : ''}"
                onclick="rampParamOnglet('${x.cle}')" title="${_rAttr(rt(x.cleT))}">
            <span class="cfg-sidebar-icon">${RAMP_ICONS[x.icone]}</span>
            <span class="cfg-sidebar-label">${_rEsc(rt(x.cleT))}</span>
        </button>`).join('');
    const repliee = !!RAMP_STATE.paramBarreRepliee;
    const libelleBascule = rt(repliee ? 'sous_menu_deplier' : 'sous_menu_replier');

    // Cellule d'actions, commune aux lignes de paramètre et aux bandeaux de
    // groupe : même jeu de boutons, même ordre. `ouvrir` diffère selon la
    // ligne : un item ouvre le formulaire d'item, un bandeau celui du groupe.
    const actions = (p, ouvrir) => `<td class="ramp-cell-actions">
        <span class="ramp-badge ${p.actif === false ? 'inactif' : 'actif'}">
            ${p.actif === false ? rt('inactif') : rt('actif')}</span>
        ${modifiable ? `
        <button class="btn btn-outline btn-sm ramp-btn-icone"
                onclick="event.stopPropagation();${ouvrir || 'rampOuvrirParam'}('${p.id}')"
                title="${_rAttr(rt('modifier'))}" aria-label="${_rAttr(rt('modifier'))}">${RAMP_ICONS.edit}</button>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="event.stopPropagation();rampBasculerParam('${p.id}')"
                title="${p.actif === false ? _rAttr(rt('activer')) : _rAttr(rt('desactiver'))}" aria-label="${p.actif === false ? _rAttr(rt('activer')) : _rAttr(rt('desactiver'))}">${RAMP_ICONS.toggle}</button>
        <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="event.stopPropagation();rampSupprimerParam('${p.id}')" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>` : ''}
    </td>`;

    // ── Un bloc par famille portée par le sous-menu ──
    // Un sous-menu en porte une, ou deux — « Constatations » réunit les
    // catégories d'écart et les actions SAFA.
    const bloc = (cle) => {
        const f = RAMP_FAMILLES.find((x) => x.cle === cle);
        const liste = rampFamille(cle);
        // Le groupe ne prend pas de colonne quand les lignes sont déjà rangées
        // sous son bandeau : il y serait répété à chaque ligne pour rien.
        const colGroupe = f.cat && !f.groupe;
        const colonnes = 2 + (f.code ? 1 : 0) + (colGroupe ? 1 : 0)
            + (f.desc ? 1 : 0) + (f.pond ? 1 : 0) + (f.pays ? 2 : 0);
        const inactifs = liste.filter((p) => p.actif === false).length;

        const ligneParam = (p) => `<tr ${p.actif === false ? 'style="opacity:.55;"' : ''}>
            ${f.code ? `<td><strong class="ramp-code">${_rEsc(p.code || '—')}</strong></td>` : ''}
            <td>${_rEsc(p.label)}</td>
            ${colGroupe ? `<td>${_rEsc(rampLibelleGroupe(p.cat))}</td>` : ''}
            ${f.desc ? `<td class="ramp-desc">${_rEsc(p.description || '—')}</td>` : ''}
            ${f.pond ? `<td style="text-align:center;"><strong>${p.ponderation === null
                || p.ponderation === undefined ? '—' : p.ponderation}</strong></td>` : ''}
            ${f.pays ? `<td>${_rEsc(p.pays || '—')}</td>
                <td style="text-align:center;">${p.uemoa
                    ? `<span class="ramp-badge actif">${rt('p_uemoa')}</span>` : '—'}</td>` : ''}
            ${actions(p)}
        </tr>`;

        // ── Items : rangés par groupe ──
        // Cinquante-quatre items en une seule liste ne se parcourent pas.
        // Chaque groupe forme un bandeau dépliable, et porte ses actions.
        let lignes;
        if (f.groupe) {
            const groupes = rampGroupes();
            const parGroupe = new Map(groupes.map((g) => [g.code, []]));
            const orphelins = [];
            liste.forEach((p) => {
                if (parGroupe.has(p.cat)) parGroupe.get(p.cat).push(p);
                else orphelins.push(p);
            });

            const bandeau = (id, titre, items, groupe) => {
                const ouvert = RAMP_STATE.groupesItems[id] !== false;
                return `
                <tr class="ramp-groupe-ligne ramp-depliant" onclick="rampBasculerGroupeItems(${_rArg(id)})">
                    <td colspan="${colonnes - 1}">
                        <div class="ramp-gi-entete">
                            <!-- Bouton d'extension : une cible franche, avec un
                                 chevron qui pivote plutôt que deux caractères
                                 qui se remplacent. La ligne entière reste
                                 cliquable, mais le bouton dit où appuyer. -->
                            <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                                    aria-expanded="${ouvert}"
                                    title="${ouvert ? _rAttr(rt('replier')) : _rAttr(rt('deplier'))}" aria-label="${ouvert ? _rAttr(rt('replier')) : _rAttr(rt('deplier'))}"
                                    onclick="event.stopPropagation();rampBasculerGroupeItems(${_rArg(id)})">
                                ${RAMP_ICONS.chevronBas}
                            </button>
                            <strong>${_rEsc(titre)}</strong>
                            <span class="ramp-gi-compte">${items.length}</span>
                        </div>
                        ${groupe && groupe.description
                            ? `<div class="ramp-desc ramp-gi-desc">${_rEsc(groupe.description)}</div>` : ''}
                    </td>
                    ${groupe ? actions(groupe, 'rampOuvrirGroupe') : '<td class="ramp-cell-actions">—</td>'}
                </tr>
                ${ouvert ? (items.length
                    ? items.map(ligneParam).join('')
                    : `<tr><td colspan="${colonnes}" class="ramp-table-vide">${rt('p_aucun_item_groupe')}</td></tr>`) : ''}`;
            };

            lignes = groupes.map((g) => bandeau(g.code, g.label, parGroupe.get(g.code) || [], g)).join('')
                + (orphelins.length ? bandeau('__sans__', rt('p_sans_groupe'), orphelins, null) : '');
            if (!groupes.length && !orphelins.length) {
                lignes = `<tr><td colspan="${colonnes}" class="ramp-table-vide">${rt('p_aucun_item')}</td></tr>`;
            }
        } else {
            lignes = liste.length === 0
                ? `<tr><td colspan="${colonnes}" class="ramp-table-vide">${rt('p_aucun_element')}</td></tr>`
                : liste.map(ligneParam).join('');
        }

        return `
        <div class="ramp-actions-bar">
            ${onglet.familles.length > 1
                ? `<strong style="font-size:.9rem;">${_rEsc(rt(f.cleT))}</strong>` : ''}
            <!-- Le décompte dit ce que la liste affichée contient, actifs et
                 inactifs confondus. Une pastille par nombre : ils se lisent
                 d'un coup d'œil, d'un sous-menu à l'autre. -->
            <span class="ramp-badge compte">
                ${liste.length} ${rtn(liste.length, 'p_element', 'p_elements')}</span>
            ${inactifs ? `<span class="ramp-badge compte muet">
                ${inactifs} ${rt('p_inactif')}${inactifs > 1 ? 's' : ''}</span>` : ''}
            <span style="flex:1;"></span>
            ${modifiable ? `
                ${f.groupe ? `<button class="btn btn-outline btn-sm" onclick="rampOuvrirGroupe()">
                    ${RAMP_ICONS.add} ${rt('p_nouveau_groupe')}</button>` : ''}
                <button class="btn btn-primary btn-sm" onclick="rampOuvrirParam('', '${cle}')">
                    ${RAMP_ICONS.add} ${f.groupe ? rt('p_nouvel_item') : rt('ajouter')}</button>`
                : `<span class="ramp-sous-titre">${rt('p_reserve_gestionnaire')}</span>`}
            <!-- L'export ferme la barre : d'un sous-menu à l'autre, il se
                 retrouve toujours au même bout. -->
            <button class="btn btn-primary btn-sm" onclick="rampExporterParametres('${cle}')">
                ${RAMP_ICONS.download} ${rt('exporter_excel')}</button>
        </div>
        <div class="ramp-card" style="padding:0;">
            <div class="ramp-table-wrap">
                <table class="ramp-table">
                    <thead><tr>
                        ${f.code ? `<th style="width:100px;">${rt('p_code')}</th>` : ''}
                        <th${f.groupe ? ' style="width:24%;"' : ''}>${f.groupe ? rt('p_items') : rt('p_libelle')}</th>
                        ${colGroupe ? `<th style="width:180px;">${rt('p_groupe_items')}</th>` : ''}
                        ${f.desc ? `<th>${rt('c_description')}</th>` : ''}
                        ${f.pond ? `<th style="width:120px;text-align:center;">${rt('p_ponderation')}</th>` : ''}
                        ${f.pays ? `<th style="width:190px;">${rt('p_pays_provenance')}</th>
                            <th style="width:110px;text-align:center;">${rt('p_uemoa')}</th>` : ''}
                        <th style="width:200px;text-align:center;">${rt('p_statut_actions')}</th>
                    </tr></thead>
                    <tbody>${lignes}</tbody>
                </table>
            </div>
        </div>`;
    };

    return `
    <div class="ramp-page-header">
        <h2>${rt('p_parametres_titre')}</h2>
        <span class="ramp-sous-titre">${rt('p_sous_titre')}</span>
    </div>
    <div class="cfg-layout">
        <div class="cfg-sidebar ${repliee ? 'collapsed' : ''}">
            <button class="cfg-sidebar-toggle" onclick="rampBasculerBarreParam()"
                    title="${_rAttr(libelleBascule)}" aria-label="${_rAttr(libelleBascule)}"
                    aria-expanded="${!repliee}">
                <span style="display:flex;${repliee ? 'transform:rotate(180deg);' : ''}">${RAMP_ICONS.chevron}</span>
            </button>
            ${onglets}
        </div>
        <div class="cfg-content">
            ${onglet.ecran === 'aeronefs' ? rampRenderAeronefs() : ''}
            ${onglet.ecran === 'aeroports' ? rampRenderAeroports() : ''}
            ${onglet.ecran === 'pays' ? rampRenderPays() : ''}
            ${onglet.ecran ? '' : onglet.familles.map(bloc).join('')}
        </div>
    </div>`;
}

function rampBasculerGroupeItems(cle) {
    RAMP_STATE.groupesItems[cle] = RAMP_STATE.groupesItems[cle] === false;
    rampRenderPage();
}

// Tous les pays du monde, tels que le sous-menu « Pays » les tient. La liste
// se charge en arrière-plan si l'on ouvre le formulaire avant elle.
function rampListePaysMonde() {
    const liste = (RAMP_STATE.pays.liste || []).map((p) => p.nom).filter(Boolean);
    if (!liste.length && !RAMP_STATE.pays.chargement) setTimeout(rampChargerPays, 0);
    return liste.sort((a, b) => a.localeCompare(b, 'fr'));
}

function rampOuvrirParam(id, famille) {
    // À la modification, la famille se lit sur le paramètre lui-même : deux
    // listes cohabitent sous « Constatations », le sous-menu ne suffit pas.
    const existant = id
        ? Object.values(RAMP_STATE.data.parametres.familles || {}).flat().find((x) => x.id === id)
        : null;
    const f = rampFamilleDe(famille || (existant || {}).type);
    const p = existant || null;
    RAMP_STATE.paramEnCours = p ? { ...p } : { type: f.cle };
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${p ? rt('modifier') : rt('ajouter')} — ${_rEsc(rt(f.cleT))}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                ${f.code ? `<div class="ramp-champ">
                    <label>${rt('p_code')}</label>
                    <input class="ramp-input" id="rampParamCode" value="${_rAttr((p || {}).code || '')}"
                           placeholder="${f.cle === 'items' ? 'ex. A05' : 'ex. 3b'}">
                </div>` : ''}
                <div class="ramp-champ">
                    <label>${f.groupe ? rt('c_item') : rt('p_libelle')}</label>
                    <input class="ramp-input" id="rampParamLabel" value="${_rAttr((p || {}).label || '')}">
                </div>
                ${f.cat ? `<div class="ramp-champ">
                    <label>${rt('p_groupe_items')}</label>
                    <select class="ramp-select" id="rampParamCat">
                        <option value="">${rt('sans_groupe')}</option>
                        ${rampGroupes().map((g) => `<option value="${_rAttr(g.code)}"
                            ${(p || {}).cat === g.code ? 'selected' : ''}>${_rEsc(g.label)}</option>`).join('')}
                    </select>
                </div>` : ''}
                ${f.desc ? `<div class="ramp-champ">
                    <label>${rt('c_description')}</label>
                    <textarea class="ramp-input" id="rampParamDesc" rows="3"
                              placeholder="${rt('aide_item')}"
                              >${_rEsc((p || {}).description || '')}</textarea>
                </div>` : ''}
                ${f.pays ? `<div class="ramp-champ">
                    <label>${rt('p_pays_provenance')}</label>
                    <select class="ramp-select" id="rampParamPays">
                        <option value="">${rt('choisir')}</option>
                        ${rampListePaysMonde().map((n) => `<option value="${_rAttr(n)}"
                            ${(p || {}).pays === n ? 'selected' : ''}>${_rEsc(n)}</option>`).join('')}
                    </select>
                </div>
                <label class="ramp-champ-case">
                    <input type="checkbox" id="rampParamUemoa" ${(p || {}).uemoa ? 'checked' : ''}>
                    <span>${rt('p_certifie_uemoa')}</span>
                </label>` : ''}
                ${f.pond ? `<div class="ramp-champ">
                    <label>${rt('p_ponderation')}</label>
                    <input class="ramp-input" id="rampParamPond" type="number" step="0.1" min="0"
                           value="${_rAttr((p || {}).ponderation === null
                               || (p || {}).ponderation === undefined ? '' : p.ponderation)}">
                </div>` : ''}
                <p class="ramp-erreur" id="rampParamErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerParam()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

// ── Groupes d’items ──
// Ils se créent depuis l'écran des items, où ils servent. Le code technique se
// dérive de l'intitulé côté serveur : rien à saisir, rien à mémoriser.

// Un nouveau groupe se propose en fin de liste : c'est l'ordre le plus sûr
// tant que l'agent n'a pas dit où le placer.
const rampProchainOrdreGroupe = () =>
    rampGroupes().reduce((n, g) => Math.max(n, Number(g.ordre) || 0), 0) + 1;

function rampOuvrirGroupe(id) {
    const g = id ? rampGroupes().find((x) => x.id === id) : null;
    RAMP_STATE.paramEnCours = g ? { ...g } : { type: 'groupes' };
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${g ? 'Modifier le groupe' : "Nouveau groupe d'items"}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <p class="ramp-note">
                    Un groupe d'items réunit les items d'une même partie du programme SAFA. Les items
                    retiennent son code, non son intitulé : le renommer ne les détache pas.
                    Le numéro d'ordre range les groupes à l'écran, du plus petit au plus grand.
                </p>
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>${rt('intitule_groupe')}</label>
                        <input class="ramp-input" id="rampGroupeLabel" value="${_rAttr((g || {}).label || '')}"
                               placeholder="ex. Flight Deck">
                    </div>
                    <div class="ramp-champ">
                        <label>${rt('numero_ordre')}</label>
                        <input class="ramp-input" id="rampGroupeOrdre" type="number" min="0" step="1"
                               value="${_rAttr((g || {}).ordre === undefined ? rampProchainOrdreGroupe() : g.ordre)}">
                    </div>
                </div>
                <div class="ramp-champ">
                    <label>${rt('c_description')}</label>
                    <textarea class="ramp-input" id="rampGroupeDesc" rows="3"
                              placeholder="${rt('aide_groupe')}"
                              >${_rEsc((g || {}).description || '')}</textarea>
                </div>
                <p class="ramp-erreur" id="rampGroupeErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerGroupe()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerGroupe() {
    const g = RAMP_STATE.paramEnCours || {};
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampGroupeErreur');
    const label = v('rampGroupeLabel');
    if (!label.trim()) { err.textContent = oasisChampRequis('intitule'); return; }
    const corps = {
        type: 'groupes', label, description: v('rampGroupeDesc'),
        ordre: v('rampGroupeOrdre'),
    };
    try {
        if (g.id) await rampApi(`/parametres/${g.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/parametres', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        RAMP_STATE.data.parametres = await rampApi('/parametres');
        rampRenderPage();
        rampToast(rt('groupe_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampEnregistrerParam() {
    const p = RAMP_STATE.paramEnCours || {};
    const f = rampFamilleDe(p.type);
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampParamErreur');
    const label = v('rampParamLabel');
    if (!label.trim()) { err.textContent = rt('p_libelle_requis'); return; }
    const corps = { type: f.cle, label };
    if (f.code) corps.code = v('rampParamCode');
    if (f.cat) corps.cat = v('rampParamCat');
    if (f.desc) corps.description = v('rampParamDesc');
    if (f.pond) corps.ponderation = v('rampParamPond');
    if (f.pays) {
        corps.pays = v('rampParamPays');
        corps.uemoa = !!(document.getElementById('rampParamUemoa') || {}).checked;
    }
    try {
        if (p.id) await rampApi(`/parametres/${p.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/parametres', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        RAMP_STATE.data.parametres = await rampApi('/parametres');
        rampRenderPage();
        rampToast(rt('p_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampBasculerParam(id) {
    try {
        await rampApi(`/parametres/${id}/actif`, { method: 'PUT', body: '{}' });
        RAMP_STATE.data.parametres = await rampApi('/parametres');
        rampRenderPage();
    } catch (e) { rampToast(e.message || rt('m_action_impossible'), 'error'); }
}

async function rampSupprimerParam(id) {
    // L'écran des items mêle deux familles — les items et leurs groupes : on
    // cherche donc dans toutes, non dans la seule famille de l'onglet.
    const p = Object.values(RAMP_STATE.data.parametres.familles || {})
        .flat().find((x) => x.id === id) || {};
    if (!await oasisConfirmer(`Supprimer « ${p.label} » ?`)) return;
    try {
        await rampApi(`/parametres/${id}`, { method: 'DELETE' });
        RAMP_STATE.data.parametres = await rampApi('/parametres');
        rampRenderPage();
        rampToast(rt('p_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Sous-menu Pays
// ══════════════════════════════════════
// Les 249 entités de l'ISO 3166-1 : nom, bigramme, autorité de l'aviation
// civile du pays et ses coordonnées, appartenance à l'UEMOA. Les huit États
// membres arrivent renseignés ; les autres se complètent au fil de l'eau.

const rampPaysFiltres = () => RAMP_STATE.pays.filtres;

async function rampChargerPays() {
    RAMP_STATE.pays.chargement = true;
    try {
        const r = await rampApi('/pays');
        RAMP_STATE.pays.liste = r.pays || [];
        RAMP_STATE.pays.modifiable = !!r.modifiable;
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
    } finally {
        RAMP_STATE.pays.chargement = false;
    }
    rampPaysRedessiner();
}

// Seule la zone de résultats se refait : le champ de recherche garde son
// curseur d'une frappe à l'autre.
function rampPaysRedessiner() {
    const zone = document.getElementById('rampPaysZone');
    if (!zone) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampPaysResultats();
    rendreDefilement();
}

function rampPaysFiltrer() {
    const F = rampPaysFiltres();
    const q = _rNorm(F.recherche);
    return RAMP_STATE.pays.liste.filter((p) => {
        const renseigne = !!(p.aac || p.site || (p.emails || []).length);
        return (!F.uemoa || (F.uemoa === 'oui' ? p.uemoa : !p.uemoa))
            && (!F.aac || (F.aac === 'oui' ? renseigne : !renseigne))
            && (!q || _rNorm(`${p.nom} ${p.iso2} ${p.aac} ${p.adresse} ${p.site} ${(p.emails || []).join(' ')}`).includes(q));
    });
}

function rampPaysSetFiltre(cle, valeur) {
    rampPaysFiltres()[cle] = valeur;
    rampPaysRedessiner();
}

function rampPaysChercher(valeur) {
    rampPaysFiltres().recherche = valeur;
    rampPaysRedessiner();
}

function rampPaysReset() {
    RAMP_STATE.pays.filtres = { uemoa: '', aac: '', recherche: '' };
    const champ = document.querySelector('#rampPaysFiltres .ramp-recherche-boite input');
    if (champ) champ.value = '';
    rampRenderPage();
}

function rampPaysResultats() {
    const S = RAMP_STATE.pays;
    if (!S.liste.length) {
        return `<div class="ramp-card"><p class="ramp-table-vide">${
            rt(S.chargement ? 'chargement_pays' : 'aucun_pays')}</p></div>`;
    }
    const modifiable = S.modifiable;
    const liste = rampPaysFiltrer();
    const membres = liste.filter((p) => p.uemoa).length;

    // Le site s'ouvre dans un nouvel onglet ; le module vit dans un cadre, et
    // `noopener` évite que la page ouverte ne reprenne la main dessus.
    // Seuls http et https deviennent des liens : un « javascript: » saisi au
    // paramétrage s'exécuterait dans la session de qui le clique.
    const lienSite = (p) => {
        const url = /^https?:\/\//i.test(String(p.site || '')) ? String(p.site) : '';
        if (url) {
            return `<a href="${_rAttr(url)}" target="_blank" rel="noopener noreferrer"
                       class="ramp-lien">${_rEsc(url.replace(/^https?:\/\//, ''))}</a>`;
        }
        return p.site ? `<span>${_rEsc(p.site)}</span>` : '<span class="ramp-vide">—</span>';
    };

    // Même règle pour une adresse : le schéma est posé par nous, la valeur ne
    // sert qu'à le compléter.
    const emails = (p) => ((p.emails || []).length
        ? p.emails.map((e) => (/^[^\s@]+@[^\s@]+$/.test(String(e || ''))
            ? `<a href="mailto:${_rAttr(e)}" class="ramp-lien">${_rEsc(e)}</a>`
            : `<span>${_rEsc(e)}</span>`)).join('<br>')
        : '<span class="ramp-vide">—</span>');

    const ligne = (p) => `<tr ${p.actif === false ? 'style="opacity:.55;"' : ''}>
        <td><strong>${_rEsc(p.nom)}</strong></td>
        <td><strong class="ramp-code">${_rEsc(p.iso2 || '—')}</strong></td>
        <td>${p.aac ? _rEsc(p.aac) : '<span class="ramp-vide">—</span>'}</td>
        <td class="ramp-desc">${p.adresse ? _rEsc(p.adresse) : '—'}</td>
        <td>${lienSite(p)}</td>
        <td class="ramp-emails">${emails(p)}</td>
        <td style="text-align:center;">
            <!-- Case à cocher : l'appartenance à l'UEMOA se change d'un clic,
                 sans passer par le formulaire. -->
            <input type="checkbox" class="ramp-case" ${p.uemoa ? 'checked' : ''}
                   ${modifiable ? '' : 'disabled'} aria-label="${rt('membre_uemoa')}"
                   onchange="rampPaysUemoa(${_rArg(p.id)}, this.checked)">
        </td>
        <td class="ramp-cell-actions">
            ${modifiable ? `
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="${rt('modifier')}" aria-label="${rt('modifier')}"
                    onclick="rampOuvrirPays(${_rArg(p.id)})">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone"
                    title="${p.actif === false ? 'Réactiver' : 'Désactiver'}" aria-label="${p.actif === false ? 'Réactiver' : 'Désactiver'}"
                    onclick="rampBasculerPays(${_rArg(p.id)})">${RAMP_ICONS.toggle}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerPays(${_rArg(p.id)})" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>`
                : `<span class="ramp-badge ${p.actif === false ? 'inactif' : 'actif'}">
                    ${p.actif === false ? 'Inactif' : 'Actif'}</span>`}
        </td>
    </tr>`;

    const corps = liste.length
        ? liste.map(ligne).join('')
        : `<tr><td colspan="8" class="ramp-table-vide">${rt('aucun_pays_criteres')}</td></tr>`;

    return `
    <div class="ramp-actions-bar">
        <span class="ramp-badge compte">${liste.length} pays</span>
        ${membres ? `<span class="ramp-badge compte">
            ${membres} membre${membres > 1 ? 's' : ''} de l'UEMOA</span>` : ''}
        <span style="flex:1;"></span>
        ${modifiable ? `<button class="btn btn-primary btn-sm" onclick="rampOuvrirPays()">
            ${RAMP_ICONS.add} ${rt('ajouter')}</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table ramp-table-pays">
                <thead><tr>
                    <th style="width:13%;">${rt('c_nom')}</th>
                    <th style="width:82px;">${rt('p_bigramme')}</th>
                    <th style="width:22%;">${rt('p_aac')}</th>
                    <th style="width:22%;">${rt('p_adresse')}</th>
                    <th style="width:13%;">${rt('p_site')}</th>
                    <th style="width:15%;">${rt('p_email')}</th>
                    <th style="width:80px;text-align:center;">${rt('p_uemoa')}</th>
                    <th style="width:130px;text-align:center;">${rt('c_actions')}</th>
                </tr></thead>
                <tbody>${corps}</tbody>
            </table>
        </div>
    </div>`;
}

function rampRenderPays() {
    const F = rampPaysFiltres();
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${cur === v ? 'selected' : ''}>${_rEsc(l)}</option>`;
    return `
    <div class="ramp-filtres" id="rampPaysFiltres">
        <select class="ramp-select" onchange="rampPaysSetFiltre('uemoa', this.value)">
            ${opt('', 'Tous les pays', F.uemoa)}
            ${opt('oui', 'Membres UEMOA', F.uemoa)}
            ${opt('non', 'Hors UEMOA', F.uemoa)}
        </select>
        <select class="ramp-select" onchange="rampPaysSetFiltre('aac', this.value)">
            ${opt('', 'AAC renseignée ou non', F.aac)}
            ${opt('oui', 'AAC renseignée', F.aac)}
            ${opt('non', 'AAC à compléter', F.aac)}
        </select>
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${_rAttr(rt('f_rechercher'))}…" value="${_rAttr(F.recherche)}"
                   oninput="rampPaysChercher(this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampPaysReset()"
                title="${_rAttr(rt('f_reinitialiser'))}" aria-label="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>
    <div id="rampPaysZone">${rampPaysResultats()}</div>`;
}

function rampOuvrirPays(id) {
    const p = id ? RAMP_STATE.pays.liste.find((x) => x.id === id) : null;
    RAMP_STATE.paysEnCours = p ? { ...p } : null;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${p ? rt('modifier') : rt('ajouter')} — ${rt('p_onglet_pays')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>${rt('u_nom')}</label>
                        <input class="ramp-input" id="rampPaysNom" placeholder="ex. Togo"
                               value="${_rAttr((p || {}).nom || '')}">
                    </div>
                    <div class="ramp-champ">
                        <label>Bigramme (ISO 3166-1)</label>
                        <input class="ramp-input" id="rampPaysIso" placeholder="ex. TG" maxlength="2"
                               value="${_rAttr((p || {}).iso2 || '')}">
                    </div>
                </div>
                <div class="ramp-champ">
                    <label>${rt('aac_label_long')}</label>
                    <input class="ramp-input" id="rampPaysAac"
                           placeholder="${rt('ex_aac')}"
                           value="${_rAttr((p || {}).aac || '')}">
                </div>
                <div class="ramp-champ">
                    <label>Adresse</label>
                    <textarea class="ramp-input" id="rampPaysAdresse" rows="2"
                              placeholder="${rt('ex_adresse')}">${_rEsc((p || {}).adresse || '')}</textarea>
                </div>
                <div class="ramp-champ">
                    <label>Site web</label>
                    <input class="ramp-input" id="rampPaysSite" placeholder="ex. https://www.anac-togo.tg"
                           value="${_rAttr((p || {}).site || '')}">
                </div>
                <div class="ramp-champ">
                    <label>Email</label>
                    <textarea class="ramp-input" id="rampPaysEmails" rows="2"
                              placeholder="${rt('plusieurs_adresses')}"
                              >${_rEsc(((p || {}).emails || []).join(', '))}</textarea>
                </div>
                <label class="ramp-champ-case">
                    <input type="checkbox" id="rampPaysUemoa" ${(p || {}).uemoa ? 'checked' : ''}>
                    <span>${rt('pays_uemoa')}</span>
                </label>
                <p class="ramp-erreur" id="rampPaysErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerPays()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerPays() {
    const p = RAMP_STATE.paysEnCours || {};
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampPaysErreur');
    const corps = {
        nom: v('rampPaysNom'), iso2: v('rampPaysIso').toUpperCase(),
        aac: v('rampPaysAac'), adresse: v('rampPaysAdresse'),
        site: v('rampPaysSite'), emails: v('rampPaysEmails'),
        uemoa: !!(document.getElementById('rampPaysUemoa') || {}).checked,
    };
    if (!corps.nom.trim()) { err.textContent = oasisChampRequis('nom'); return; }
    if (!/^[A-Z]{2}$/.test(corps.iso2)) { err.textContent = 'Bigramme : deux lettres attendues'; return; }
    try {
        if (p.id) await rampApi(`/pays/${p.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/pays', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        await rampChargerPays();
        rampToast(rt('pays_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

// La case à cocher de la colonne UEMOA écrit directement : on ne rouvre pas un
// formulaire pour un booléen.
async function rampPaysUemoa(id, coche) {
    try {
        await rampApi(`/pays/${id}`, { method: 'PUT', body: JSON.stringify({ uemoa: !!coche }) });
        const p = RAMP_STATE.pays.liste.find((x) => x.id === id);
        if (p) p.uemoa = !!coche;
        rampPaysRedessiner();
    } catch (e) {
        rampToast(e.message || rt('m_action_impossible'), 'error');
        rampPaysRedessiner();
    }
}

async function rampBasculerPays(id) {
    try {
        await rampApi(`/pays/${id}/actif`, { method: 'PUT', body: '{}' });
        await rampChargerPays();
    } catch (e) { rampToast(e.message || rt('m_action_impossible'), 'error'); }
}

async function rampSupprimerPays(id) {
    const p = RAMP_STATE.pays.liste.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(`Supprimer « ${p.nom} » ?`)) return;
    try {
        await rampApi(`/pays/${id}`, { method: 'DELETE' });
        await rampChargerPays();
        rampToast(rt('pays_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Sous-menu Aéroports
// ══════════════════════════════════════
// Les plateformes des États du dispositif : pays, intitulé, code OACI, statut.
// Une cinquantaine de lignes — la liste part entière du serveur et se filtre
// ici, sans pagination : elle tiendrait sur une page.

const rampAptFiltres = () => RAMP_STATE.aeroports.filtres;

async function rampChargerAeroports() {
    RAMP_STATE.aeroports.chargement = true;
    try {
        const r = await rampApi('/aeroports');
        RAMP_STATE.aeroports.liste = r.aeroports || [];
        RAMP_STATE.aeroports.modifiable = !!r.modifiable;
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
    } finally {
        RAMP_STATE.aeroports.chargement = false;
    }
    rampAptRedessiner();
}

// Comme ailleurs dans le module, seule la zone de résultats se refait : le
// champ de recherche garde son curseur d'une frappe à l'autre.
function rampAptRedessiner() {
    const zone = document.getElementById('rampAptZone');
    if (!zone) { rampRenderPage(); return; }
    // Le tableau défile dans sa propre boîte : la remplacer sans plus de
    // précaution ramènerait la vue tout en haut, et le bandeau qu'on vient
    // d'ouvrir passerait hors de l'écran.
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampAptResultats();
    rendreDefilement();
    const listes = document.getElementById('rampAptListes');
    if (listes) listes.innerHTML = rampAptListes();
}

// Ce que les filtres laissent voir. `sauf` met un critère de côté pour peupler
// sa propre liste déroulante : elle ne se réduit pas à la valeur choisie, on
// peut donc en changer sans repasser par la remise à zéro.
function rampAptFiltrer(sauf) {
    const F = rampAptFiltres();
    const q = _rNorm(F.recherche);
    return RAMP_STATE.aeroports.liste.filter((a) =>
        (sauf === 'pays' || !F.pays || a.pays === F.pays)
        && (sauf === 'statut' || !F.statut || a.statut === F.statut)
        && (!q || _rNorm(`${a.pays} ${a.nom} ${a.code} ${a.statut}`).includes(q)));
}

function rampAptSetFiltre(cle, valeur) {
    rampAptFiltres()[cle] = valeur;
    rampAptRedessiner();
}

function rampAptChercher(valeur) {
    rampAptFiltres().recherche = valeur;
    rampAptRedessiner();
}

function rampAptReset() {
    RAMP_STATE.aeroports.filtres = { pays: '', statut: '', recherche: '' };
    RAMP_STATE.aeroports.replies = {};
    // Le champ de recherche est le seul élément que le redessin partiel ne
    // refait pas : il faut donc l'effacer à la main.
    const champ = document.querySelector('#rampAptListes ~ .ramp-recherche-boite input');
    if (champ) champ.value = '';
    rampAptRedessiner();
}

function rampAptBasculer(pays) {
    const r = RAMP_STATE.aeroports.replies;
    r[pays] = !r[pays];
    rampAptRedessiner();
}

function rampAptToutDeplier(ouvrir) {
    const r = {};
    if (!ouvrir) [...new Set(rampAptFiltrer().map((a) => a.pays))].forEach((p) => { r[p] = true; });
    RAMP_STATE.aeroports.replies = r;
    rampAptRedessiner();
}

function rampAptListes() {
    const F = rampAptFiltres();
    const valeurs = (sauf, champ) => [...new Set(rampAptFiltrer(sauf).map((a) => a[champ]).filter(Boolean))]
        .sort((x, y) => String(x).localeCompare(String(y), 'fr'));
    const liste = (cle, vide, champ) => `
        <select class="ramp-select" onchange="rampAptSetFiltre('${cle}', this.value)">
            <option value="">${_rEsc(vide)}</option>
            ${valeurs(cle, champ).map((v) => `<option value="${_rAttr(v)}"
                ${F[cle] === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
        </select>`;
    return liste('pays', 'Tous pays', 'pays') + liste('statut', 'Tous statuts', 'statut');
}

function rampAptResultats() {
    const S = RAMP_STATE.aeroports;
    if (!S.liste.length) {
        return `<div class="ramp-card"><p class="ramp-table-vide">${
            rt(S.chargement ? 'chargement_aeroports' : 'aucun_aeroport')}</p></div>`;
    }
    const modifiable = S.modifiable;
    const liste = rampAptFiltrer();

    const ligne = (a) => `<tr ${a.actif === false ? 'style="opacity:.55;"' : ''}>
        <td class="ramp-apt-decale">${_rEsc(a.nom)}</td>
        <td><strong class="ramp-code">${_rEsc(a.code || '—')}</strong></td>
        <td>${_rEsc(a.statut || '—')}</td>
        <td class="ramp-cell-actions">
            <span class="ramp-badge ${a.actif === false ? 'inactif' : 'actif'}">
                ${a.actif === false ? 'Inactif' : 'Actif'}</span>
            ${modifiable ? `
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="${rt('modifier')}" aria-label="${rt('modifier')}"
                    onclick="rampOuvrirAeroport('${_rAttr(a.id)}')">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone"
                    title="${a.actif === false ? 'Réactiver' : 'Désactiver'}" aria-label="${a.actif === false ? 'Réactiver' : 'Désactiver'}"
                    onclick="rampBasculerAeroport('${_rAttr(a.id)}')">${RAMP_ICONS.toggle}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerAeroport('${_rAttr(a.id)}')" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;

    // Un bandeau par pays, déplié par défaut : huit pays tiennent à l'écran, et
    // c'est la plateforme qu'on vient chercher, non le pays.
    const bandeau = (pays, plateformes) => {
        const ouvert = !RAMP_STATE.aeroports.replies[pays];
        const internationaux = plateformes.filter((a) => /^international/i.test(a.statut || '')).length;
        return `
        <tr class="ramp-groupe-ligne ramp-depliant" onclick="rampAptBasculer(${_rArg(pays)})">
            <td colspan="3">
                <div class="ramp-gi-entete">
                    <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                            aria-expanded="${ouvert}"
                            title="${ouvert ? 'Replier' : 'Déplier'} ce pays" aria-label="${ouvert ? 'Replier' : 'Déplier'} ce pays"
                            onclick="event.stopPropagation();rampAptBasculer(${_rArg(pays)})">
                        ${RAMP_ICONS.chevronBas}
                    </button>
                    <strong>${_rEsc(pays)}</strong>
                    <span class="ramp-gi-compte">${plateformes.length}</span>
                    ${internationaux ? `<span class="ramp-sous-titre">dont ${internationaux}
                        international${internationaux > 1 ? 'aux' : ''}</span>` : ''}
                </div>
            </td>
            <td class="ramp-cell-actions">
                ${modifiable ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                        title="Ajouter un aéroport au ${_rAttr(pays)}" aria-label="Ajouter un aéroport au ${_rAttr(pays)}"
                        onclick="event.stopPropagation();rampOuvrirAeroport('', ${_rArg(pays)})"
                        >${RAMP_ICONS.add}</button>` : '—'}
            </td>
        </tr>
        ${ouvert ? plateformes.map(ligne).join('') : ''}`;
    };

    // Le serveur rend la liste triée par pays puis par intitulé : il suffit de
    // la découper en tranches successives.
    const groupes = [];
    liste.forEach((a) => {
        const dernier = groupes[groupes.length - 1];
        if (dernier && dernier.pays === a.pays) dernier.plateformes.push(a);
        else groupes.push({ pays: a.pays, plateformes: [a] });
    });

    const corps = groupes.length
        ? groupes.map((g) => bandeau(g.pays, g.plateformes)).join('')
        : `<tr><td colspan="4" class="ramp-table-vide">${rt('aucun_aeroport_criteres')}</td></tr>`;
    const inactifs = liste.filter((a) => a.actif === false).length;

    return `
    <div class="ramp-actions-bar">
        <span class="ramp-badge compte">${groupes.length} pays</span>
        <span class="ramp-badge compte">
            ${liste.length} aéroport${liste.length > 1 ? 's' : ''}</span>
        ${inactifs ? `<span class="ramp-badge compte muet">
            ${inactifs} inactif${inactifs > 1 ? 's' : ''}</span>` : ''}
        <span style="flex:1;"></span>
        <button class="btn btn-outline btn-sm" onclick="rampAptToutDeplier(true)">${rt('p_tout_deplier')}</button>
        <button class="btn btn-outline btn-sm" onclick="rampAptToutDeplier(false)">${rt('p_tout_replier')}</button>
        ${modifiable ? `<button class="btn btn-primary btn-sm" onclick="rampOuvrirAeroport()">
            ${RAMP_ICONS.add} ${rt('ajouter')}</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th>${rt('p_aeroport')}</th>
                    <th style="width:110px;">${rt('p_code_oaci')}</th>
                    <th style="width:24%;">${rt('c_statut')}</th>
                    <th style="width:200px;text-align:center;">${rt('p_statut_actions')}</th>
                </tr></thead>
                <tbody>${corps}</tbody>
            </table>
        </div>
    </div>`;
}

function rampRenderAeroports() {
    const F = rampAptFiltres();
    return `
    <div class="ramp-filtres">
        <span id="rampAptListes" class="ramp-contenu-transparent">${rampAptListes()}</span>
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${_rAttr(rt('f_rechercher'))}…" value="${_rAttr(F.recherche)}"
                   oninput="rampAptChercher(this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampAptReset()"
                title="${_rAttr(rt('f_reinitialiser'))}" aria-label="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>
    <div id="rampAptZone">${rampAptResultats()}</div>`;
}

// Les statuts déjà en usage servent de proposition : la saisie libre reste
// possible, mais l'agent n'a pas à réécrire « International » à la main.
const rampAptStatuts = () => [...new Set(RAMP_STATE.aeroports.liste
    .map((a) => a.statut).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'fr'));

function rampOuvrirAeroport(id, pays) {
    const a = id ? RAMP_STATE.aeroports.liste.find((x) => x.id === id) : null;
    RAMP_STATE.aeroportEnCours = a ? { ...a } : null;
    const pays4 = [...new Set(RAMP_STATE.aeroports.liste.map((x) => x.pays))]
        .concat(RAMP_STATE.etatsInspection || [])
        .filter(Boolean);
    const listePays = [...new Set(pays4)].sort((x, y) => x.localeCompare(y, 'fr'));
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${a ? rt('modifier') : rt('ajouter')} — ${rt('p_onglet_aeroports')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>Pays</label>
                        <select class="ramp-select" id="rampAptPays">
                            <option value="">— Choisir —</option>
                            ${listePays.map((p) => `<option value="${_rAttr(p)}"
                                ${(a || {}).pays === p || (!a && pays === p) ? 'selected' : ''}
                                >${_rEsc(p)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ramp-champ">
                        <label>Code OACI</label>
                        <input class="ramp-input" id="rampAptCode" placeholder="ex. DXXX" maxlength="4"
                               value="${_rAttr((a || {}).code || '')}">
                    </div>
                </div>
                <div class="ramp-champ">
                    <label>${rt('intitule_aeroport')}</label>
                    <input class="ramp-input" id="rampAptNom" placeholder="${rt('ex_aeroport')}"
                           value="${_rAttr((a || {}).nom || '')}">
                </div>
                <div class="ramp-champ">
                    <label>${rt('c_statut')}</label>
                    <input class="ramp-input" id="rampAptStatut" list="rampAptStatutsListe"
                           placeholder="ex. International" value="${_rAttr((a || {}).statut || '')}">
                    <datalist id="rampAptStatutsListe">
                        ${rampAptStatuts().map((s) => `<option value="${_rAttr(s)}"></option>`).join('')}
                    </datalist>
                </div>
                <p class="ramp-erreur" id="rampAptErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerAeroport()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerAeroport() {
    const a = RAMP_STATE.aeroportEnCours || {};
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampAptErreur');
    const corps = {
        pays: v('rampAptPays'), nom: v('rampAptNom'),
        code: v('rampAptCode'), statut: v('rampAptStatut'),
    };
    if (!corps.pays.trim()) { err.textContent = oasisChampRequis('pays'); return; }
    if (!corps.nom.trim()) { err.textContent = oasisChampRequis('intitule'); return; }
    try {
        if (a.id) await rampApi(`/aeroports/${a.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/aeroports', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        // Le pays touché reste déplié : l'agent voit ce qu'il vient d'écrire.
        delete RAMP_STATE.aeroports.replies[corps.pays.trim()];
        await rampChargerAeroports();
        rampToast(rt('aeroport_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampBasculerAeroport(id) {
    try {
        await rampApi(`/aeroports/${id}/actif`, { method: 'PUT', body: '{}' });
        await rampChargerAeroports();
    } catch (e) { rampToast(e.message || rt('m_action_impossible'), 'error'); }
}

async function rampSupprimerAeroport(id) {
    const a = RAMP_STATE.aeroports.liste.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(`Supprimer « ${a.nom} » ?`)) return;
    try {
        await rampApi(`/aeroports/${id}`, { method: 'DELETE' });
        await rampChargerAeroports();
        rampToast(rt('aeroport_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Sous-menu Aéronefs — la nomenclature
// ══════════════════════════════════════
// Désignation OACI, modèle-variante, constructeur, État de conception : près de
// dix mille lignes, pour un peu plus de mille désignations. On ne les met donc
// pas toutes à l'écran. Le serveur filtre, groupe et pagine ; l'écran reçoit
// cinquante désignations à la fois, chacune repliée sous son bandeau — un
// « A320 » y tient en une ligne tant qu'on ne l'ouvre pas.

const rampAerFiltres = () => RAMP_STATE.aeronefs.filtres;
let RAMP_AER_MINUTEUR = null;

async function rampChargerAeronefs() {
    const F = rampAerFiltres();
    const q = new URLSearchParams();
    ['designation', 'constructeur', 'etat'].forEach((k) => { if (F[k]) q.set(k, F[k]); });
    if (F.recherche) q.set('q', F.recherche);
    q.set('page', RAMP_STATE.aeronefs.page);
    RAMP_STATE.aeronefs.chargement = true;
    try {
        RAMP_STATE.aeronefs.resultat = await rampApi(`/aeronefs?${q.toString()}`);
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
    } finally {
        RAMP_STATE.aeronefs.chargement = false;
    }
    rampAerRedessiner();
}

// Seule la zone de résultats se refait : la barre de filtres reste en place,
// et le curseur ne quitte pas le champ de recherche entre deux frappes.
function rampAerRedessiner() {
    const zone = document.getElementById('rampAerZone');
    if (!zone) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    zone.innerHTML = rampAerResultats();
    rendreDefilement();
    // Les listes déroulantes suivent le filtre courant : elles se refont
    // aussi. Le champ de recherche, lui, n'est pas touché — il tient le
    // curseur de la frappe en cours.
    const listes = document.getElementById('rampAerListes');
    if (listes) listes.innerHTML = rampAerListes();
}

function rampAerSetFiltre(cle, valeur) {
    rampAerFiltres()[cle] = valeur;
    RAMP_STATE.aeronefs.page = 1;
    // Un changement de filtre rouvre la liste : les désignations restantes sont
    // peu nombreuses, et c'est le détail qu'on cherche alors.
    RAMP_STATE.aeronefs.ouverts = {};
    rampChargerAeronefs();
}

// La frappe n'interroge pas le serveur à chaque lettre.
function rampAerChercher(valeur) {
    rampAerFiltres().recherche = valeur;
    RAMP_STATE.aeronefs.page = 1;
    clearTimeout(RAMP_AER_MINUTEUR);
    RAMP_AER_MINUTEUR = setTimeout(rampChargerAeronefs, 250);
}

function rampAerReset() {
    RAMP_STATE.aeronefs.filtres = { designation: '', constructeur: '', etat: '', recherche: '' };
    RAMP_STATE.aeronefs.page = 1;
    RAMP_STATE.aeronefs.ouverts = {};
    // Le champ de recherche est le seul élément que le redessin partiel ne
    // refait pas : il faut donc l'effacer à la main.
    const champ = document.querySelector('#rampAerListes ~ .ramp-recherche-boite input');
    if (champ) champ.value = '';
    rampChargerAeronefs();
}

function rampAerPage(n) {
    RAMP_STATE.aeronefs.page = n;
    rampChargerAeronefs();
}

function rampAerBasculer(designation) {
    const o = RAMP_STATE.aeronefs.ouverts;
    o[designation] = !o[designation];
    rampAerRedessiner();
}

// Tout déplier n'a de sens que sur la page affichée : les désignations des
// autres pages ne sont pas là pour être ouvertes.
function rampAerToutDeplier(ouvrir) {
    const r = RAMP_STATE.aeronefs.resultat || { lignes: [] };
    const o = {};
    if (ouvrir) [...new Set(r.lignes.map((a) => a.designation))].forEach((d) => { o[d] = true; });
    RAMP_STATE.aeronefs.ouverts = o;
    rampAerRedessiner();
}

function rampAerResultats() {
    const r = RAMP_STATE.aeronefs.resultat;
    if (!r) {
        return `<div class="ramp-card"><p class="ramp-table-vide">${
            RAMP_STATE.aeronefs.chargement ? 'Chargement de la nomenclature…' : 'Nomenclature non chargée.'}</p></div>`;
    }
    const modifiable = !!r.modifiable;
    const ouverts = RAMP_STATE.aeronefs.ouverts;

    const ligne = (a) => `<tr ${a.actif === false ? 'style="opacity:.55;"' : ''}>
        <td class="ramp-aer-decale">${_rEsc(a.modele || '—')}</td>
        <td>${_rEsc(a.constructeur || '—')}</td>
        <td>${_rEsc(a.etat_conception || '—')}</td>
        <td class="ramp-cell-actions">
            <span class="ramp-badge ${a.actif === false ? 'inactif' : 'actif'}">
                ${a.actif === false ? 'Inactif' : 'Actif'}</span>
            ${modifiable ? `
            <button class="btn btn-outline btn-sm ramp-btn-icone" title="${rt('modifier')}" aria-label="${rt('modifier')}"
                    onclick="rampOuvrirAeronef('${_rAttr(a.id)}')">${RAMP_ICONS.edit}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone"
                    title="${a.actif === false ? 'Réactiver' : 'Désactiver'}" aria-label="${a.actif === false ? 'Réactiver' : 'Désactiver'}"
                    onclick="rampBasculerAeronef('${_rAttr(a.id)}')">${RAMP_ICONS.toggle}</button>
            <button class="btn btn-outline btn-sm ramp-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                    onclick="rampSupprimerAeronef('${_rAttr(a.id)}')" title="${_rAttr(rt('supprimer'))}" aria-label="${_rAttr(rt('supprimer'))}">${RAMP_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;

    // Un bandeau par désignation, replié par défaut. Le sous-titre dit ce que
    // le repli cache : combien de variantes, et de quel constructeur.
    const bandeau = (designation, variantes) => {
        const ouvert = !!ouverts[designation];
        const constructeurs = [...new Set(variantes.map((a) => a.constructeur).filter(Boolean))];
        const resume = constructeurs.slice(0, 3).join(' · ')
            + (constructeurs.length > 3 ? ` +${constructeurs.length - 3}` : '');
        return `
        <tr class="ramp-groupe-ligne ramp-depliant" onclick="rampAerBasculer(${_rArg(designation)})">
            <td colspan="3">
                <div class="ramp-gi-entete">
                    <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                            aria-expanded="${ouvert}"
                            title="${ouvert ? 'Replier' : 'Déplier'} cette désignation" aria-label="${ouvert ? 'Replier' : 'Déplier'} cette désignation"
                            onclick="event.stopPropagation();rampAerBasculer(${_rArg(designation)})">
                        ${RAMP_ICONS.chevronBas}
                    </button>
                    <strong>${_rEsc(designation)}</strong>
                    <span class="ramp-gi-compte">${variantes.length}</span>
                    ${resume ? `<span class="ramp-sous-titre">${_rEsc(resume)}</span>` : ''}
                </div>
            </td>
            <td class="ramp-cell-actions">
                ${modifiable ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                        title="Ajouter une variante à ${_rAttr(designation)}" aria-label="Ajouter une variante à ${_rAttr(designation)}"
                        onclick="event.stopPropagation();rampOuvrirAeronef('', ${_rArg(designation)})"
                        >${RAMP_ICONS.add}</button>` : '—'}
            </td>
        </tr>
        ${ouvert ? variantes.map(ligne).join('') : ''}`;
    };

    // Le serveur rend les lignes déjà triées par désignation puis par modèle :
    // il suffit de les découper en tranches successives.
    const groupes = [];
    r.lignes.forEach((a) => {
        const dernier = groupes[groupes.length - 1];
        if (dernier && dernier.designation === a.designation) dernier.variantes.push(a);
        else groupes.push({ designation: a.designation, variantes: [a] });
    });

    const corps = groupes.length
        ? groupes.map((g) => bandeau(g.designation, g.variantes)).join('')
        : `<tr><td colspan="4" class="ramp-table-vide">${rt('aucun_aeronef_criteres')}</td></tr>`;

    const pagination = r.pages > 1 ? `
        <div class="ramp-pagination">
            <button class="btn btn-outline btn-sm" ${r.page <= 1 ? 'disabled' : ''}
                    onclick="rampAerPage(${r.page - 1})">${rt('p_precedent')}</button>
            <span class="ramp-sous-titre">Page ${r.page} sur ${r.pages}</span>
            <button class="btn btn-outline btn-sm" ${r.page >= r.pages ? 'disabled' : ''}
                    onclick="rampAerPage(${r.page + 1})">${rt('p_suivant')}</button>
        </div>` : '';

    return `
    <div class="ramp-actions-bar">
        <span class="ramp-badge compte">
            ${r.total_designations} désignation${r.total_designations > 1 ? 's' : ''}</span>
        <span class="ramp-badge compte">
            ${r.total} aéronef${r.total > 1 ? 's' : ''}</span>
        ${r.pages > 1 ? `<span class="ramp-sous-titre">
            page ${r.page} sur ${r.pages}</span>` : ''}
        <span style="flex:1;"></span>
        <button class="btn btn-outline btn-sm" onclick="rampAerToutDeplier(true)">${rt('p_tout_deplier')}</button>
        <button class="btn btn-outline btn-sm" onclick="rampAerToutDeplier(false)">${rt('p_tout_replier')}</button>
        ${modifiable ? `<button class="btn btn-primary btn-sm" onclick="rampOuvrirAeronef()">
            ${RAMP_ICONS.add} ${rt('ajouter')}</button>` : ''}
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th>${rt('p_modele')}</th>
                    <th style="width:24%;">${rt('p_constructeur')}</th>
                    <th style="width:18%;">${rt('p_etat_conception')}</th>
                    <th style="width:200px;text-align:center;">${rt('p_statut_actions')}</th>
                </tr></thead>
                <tbody>${corps}</tbody>
            </table>
        </div>
    </div>
    ${pagination}`;
}

// Les trois listes déroulantes. Le serveur les peuple de ce que les *autres*
// filtres laissent voir : une liste ne se réduit pas à sa propre sélection,
// on peut donc en changer sans repasser par la remise à zéro.
function rampAerListes() {
    const F = rampAerFiltres();
    const r = RAMP_STATE.aeronefs.resultat || { designations: [], constructeurs: [], etats: [] };
    const liste = (cle, vide, valeurs) => `
        <select class="ramp-select" onchange="rampAerSetFiltre('${cle}', this.value)">
            <option value="">${_rEsc(vide)}</option>
            ${valeurs.map((v) => `<option value="${_rAttr(v)}"
                ${F[cle] === v ? 'selected' : ''}>${_rEsc(v)}</option>`).join('')}
        </select>`;
    return liste('designation', 'Toutes désignations', r.designations)
        + liste('constructeur', 'Tous constructeurs', r.constructeurs)
        + liste('etat', 'Tous États de conception', r.etats);
}

function rampRenderAeronefs() {
    const F = rampAerFiltres();
    return `
    <div class="ramp-filtres">
        <span id="rampAerListes" class="ramp-contenu-transparent">${rampAerListes()}</span>
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${_rAttr(rt('f_rechercher'))}…" value="${_rAttr(F.recherche)}"
                   oninput="rampAerChercher(this.value)">
        </div>
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampAerReset()"
                title="${_rAttr(rt('f_reinitialiser'))}" aria-label="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>
    <div id="rampAerZone">${rampAerResultats()}</div>`;
}

function rampOuvrirAeronef(id, designation) {
    const r = RAMP_STATE.aeronefs.resultat || { lignes: [] };
    const a = id ? r.lignes.find((x) => x.id === id) : null;
    RAMP_STATE.aeronefEnCours = a ? { ...a } : null;
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${a ? rt('modifier') : rt('ajouter')} — ${rt('p_onglet_aeronefs')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()" aria-label="${_rAttr(rt("fermer"))}" title="${_rAttr(rt("fermer"))}">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>${rt('designation_aeronef')}</label>
                        <input class="ramp-input" id="rampAerDesignation" placeholder="ex. A320"
                               value="${_rAttr((a || {}).designation || designation || '')}">
                    </div>
                    <div class="ramp-champ">
                        <label>${rt('p_modele')}</label>
                        <input class="ramp-input" id="rampAerModele" placeholder="ex. AIRBUS A-320-214"
                               value="${_rAttr((a || {}).modele || '')}">
                    </div>
                </div>
                <div class="ramp-paire">
                    <div class="ramp-champ">
                        <label>Constructeur</label>
                        <input class="ramp-input" id="rampAerConstructeur" placeholder="ex. AIRBUS"
                               value="${_rAttr((a || {}).constructeur || '')}">
                    </div>
                    <div class="ramp-champ">
                        <label>${rt('p_etat_conception')}</label>
                        <input class="ramp-input" id="rampAerEtat" placeholder="ex. FRANCE"
                               value="${_rAttr((a || {}).etat_conception || '')}">
                    </div>
                </div>
                <p class="ramp-erreur" id="rampAerErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerAeronef()">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerAeronef() {
    const a = RAMP_STATE.aeronefEnCours || {};
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rampAerErreur');
    const corps = {
        designation: v('rampAerDesignation'), modele: v('rampAerModele'),
        constructeur: v('rampAerConstructeur'), etat_conception: v('rampAerEtat'),
    };
    if (!corps.designation.trim()) { err.textContent = oasisChampRequis('designation'); return; }
    if (!corps.modele.trim()) { err.textContent = oasisChampRequis('modele_variante'); return; }
    try {
        if (a.id) await rampApi(`/aeronefs/${a.id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await rampApi('/aeronefs', { method: 'POST', body: JSON.stringify(corps) });
        rampFermerModal();
        // La désignation touchée s'ouvre : l'agent voit ce qu'il vient d'écrire.
        RAMP_STATE.aeronefs.ouverts[corps.designation.trim().toUpperCase()] = true;
        await rampChargerAeronefs();
        rampToast(rt('aeronef_enregistre'));
    } catch (e) { err.textContent = e.message || rt('m_enregistrement_impossible'); }
}

async function rampBasculerAeronef(id) {
    try {
        await rampApi(`/aeronefs/${id}/actif`, { method: 'PUT', body: '{}' });
        await rampChargerAeronefs();
    } catch (e) { rampToast(e.message || rt('m_action_impossible'), 'error'); }
}

async function rampSupprimerAeronef(id) {
    const r = RAMP_STATE.aeronefs.resultat || { lignes: [] };
    const a = r.lignes.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(`Supprimer « ${a.designation} — ${a.modele} » ?`)) return;
    try {
        await rampApi(`/aeronefs/${id}`, { method: 'DELETE' });
        await rampChargerAeronefs();
        rampToast(rt('aeronef_supprime'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

const rampExporterParametres = (famille) => {
    const cle = famille || rampOngletParamCourant().familles[0];
    return rampTelecharger('/parametres/export-xlsx', { famille: cle }, `parametres_${cle}.xlsx`);
};

Object.assign(window, {
    RAMP_FAMILLES, RAMP_ANNEES_DEPOT, rampListePaysMonde, rampDepotsFiltres, rampDepotFacette,
    rampTaille, rampHorodatage,
    rampRenderDepot, rampChargerDepots, rampLignesDepots, rampOuvrirDepot,
    rampChercherDepot, rampResetFiltresDepot,
    rampEnregistrerDepot, rampSupprimerDepot,
    rampRenderContacts, rampChargerContacts, rampTableContacts,
    rampPeutGererEtat, rampOuvrirContact, rampEnregistrerContact,
    rampBasculerContact, rampSupprimerContact, rampExporterContacts,
    rampRenderParametres, rampParamOnglet, rampBasculerBarreParam, rampFamilleDe,
    RAMP_ONGLETS_PARAM, rampOngletParamCourant,
    rampOuvrirParam, rampEnregistrerParam, rampBasculerParam, rampSupprimerParam,
    rampGroupes, rampLibelleGroupe, rampBasculerGroupeItems,
    rampOuvrirGroupe, rampEnregistrerGroupe, rampProchainOrdreGroupe,
    rampExporterParametres,
    rampChargerEcranParam, rampRenderPays, rampChargerPays, rampPaysResultats, rampPaysRedessiner,
    rampPaysSetFiltre, rampPaysChercher, rampPaysReset, rampPaysFiltrer,
    rampOuvrirPays, rampEnregistrerPays, rampPaysUemoa, rampBasculerPays, rampSupprimerPays,
    rampRenderAeroports, rampAptListes, rampAptResultats, rampAptRedessiner,
    rampChargerAeroports, rampAptSetFiltre, rampAptChercher, rampAptReset,
    rampAptBasculer, rampAptToutDeplier, rampAptStatuts, rampAptFiltrer,
    rampOuvrirAeroport, rampEnregistrerAeroport, rampBasculerAeroport, rampSupprimerAeroport,
    rampRenderAeronefs, rampAerListes, rampChargerAeronefs, rampAerResultats, rampAerRedessiner,
    rampAerSetFiltre, rampAerChercher, rampAerReset, rampAerPage,
    rampAerBasculer, rampAerToutDeplier,
    rampOuvrirAeronef, rampEnregistrerAeronef, rampBasculerAeronef, rampSupprimerAeronef,
});
