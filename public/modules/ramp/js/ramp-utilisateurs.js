/* OASIS — Module « Inspections d'aéronefs sur aire de trafic »
 * Écran « Mes Utilisateurs » de la vue Prestataire.
 *
 * L'exploitant tient ses propres comptes : il les crée, leur confie ce qu'il
 * veut de ses écrans (inspections, écarts, actions correctives, statistiques),
 * réinitialise leur mot de passe et les désactive. Même conception que le
 * module « Exécution de la Surveillance », ramenée aux processus d'ici.
 */

const RAMP_MES_USERS = { chargement: false, demande: false, liste: [], roles: [], droits: [], recherche: '' };

// L'administrateur de l'organisme gère les comptes d'office ; les autres ne
// le font que si le droit leur a été confié.
const rampPeutGererComptes = () => rampVuePrestataire()
    && (RAMP_STATE.adminPrestataire || (RAMP_STATE.droitsPrestataire || []).includes('utilisateurs'));

async function rampChargerMesUtilisateurs() {
    if (RAMP_MES_USERS.chargement) return;
    RAMP_MES_USERS.chargement = true;
    try {
        const r = await rampApi('/mes-utilisateurs');
        RAMP_MES_USERS.liste = r.utilisateurs || [];
        RAMP_MES_USERS.roles = r.roles || [];
        RAMP_MES_USERS.droits = r.droits || [];
    } catch (e) {
        rampToast(e.message || rt('m_chargement_impossible'), 'error');
        RAMP_MES_USERS.liste = [];
    }
    RAMP_MES_USERS.chargement = false;
    rampRenderPage();
}

const rampLibelleRole = (cle) => (RAMP_MES_USERS.roles.find((r) => r.cle === cle) || {}).libelle || cle || '—';
const rampLibelleDroit = (cle) => (RAMP_MES_USERS.droits.find((d) => d.cle === cle) || {}).libelle || cle;

function rampChercherUtilisateur(valeur) {
    RAMP_MES_USERS.recherche = valeur;
    const corps = document.querySelector('[data-corps="mes-users"]');
    if (corps) corps.innerHTML = rampLignesMesUtilisateurs();
}

function rampMesUtilisateursFiltres() {
    const q = _rNorm(RAMP_MES_USERS.recherche);
    if (!q) return RAMP_MES_USERS.liste;
    return RAMP_MES_USERS.liste.filter((u) =>
        [u.nom, u.prenom, u.email, u.username].some((v) => _rNorm(v).includes(q)));
}

function rampLignesMesUtilisateurs() {
    const liste = rampMesUtilisateursFiltres();
    if (!liste.length) return `<tr><td colspan="7" class="ramp-table-vide">${rt('u_aucun')}</td></tr>`;
    const total = RAMP_MES_USERS.droits.length;
    return liste.map((u) => {
        const actif = u.actif !== false;
        const droits = u.droits || [];
        const nom = [u.prenom, u.nom].filter(Boolean).join(' ') || u.username;
        return `<tr${actif ? '' : ' style="opacity:.55;"'}>
            <td><strong>${_rEsc(nom)}</strong></td>
            <td>${_rEsc(u.email || '')}</td>
            <td>
                <span id="rampPwMasque-${_rAttr(u.id)}" style="font-family:monospace;letter-spacing:2px;">••••••••</span>
                <span id="rampPwClair-${_rAttr(u.id)}" style="display:none;font-family:monospace;font-weight:600;color:var(--ramp-accent);"></span>
                ${u.has_temp_password ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                    onclick="rampRevelerMotDePasse(${_rArg(u.id)})"
                    title="${_rAttr(rt('u_voir_mdp'))}">${RAMP_ICONS.eye}</button>` : ''}
            </td>
            <td><span class="ramp-badge items">${_rEsc(rampLibelleRole(u.role))}</span></td>
            <td title="${_rAttr(droits.map(rampLibelleDroit).join(', '))}">
                ${droits.length === total ? rt('u_tous_droits')
                    : (droits.length ? rt('u_droits_sur', droits.length, total)
                        : `<span style="color:#dc2626;">${rt('u_aucun_droit')}</span>`)}
            </td>
            <td><span class="ramp-badge ${actif ? 'zero' : 'ecarts'}">${actif ? rt('u_actif') : rt('u_inactif')}</span></td>
            <td class="ramp-cell-actions">
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampOuvrirUtilisateur(${_rArg(u.id)})"
                        title="${_rAttr(rt('modifier'))}">${RAMP_ICONS.edit}</button>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampReinitialiserMotDePasse(${_rArg(u.id)})"
                        title="${_rAttr(rt('u_reinitialiser'))}">${RAMP_ICONS.reset}</button>
                <button class="btn btn-outline btn-sm ramp-btn-icone"
                        onclick="rampBasculerCompte(${_rArg(u.id)}, ${actif ? 'false' : 'true'})"
                        title="${_rAttr(actif ? rt('u_desactiver') : rt('u_activer'))}">
                    ${actif ? RAMP_ICONS.x : RAMP_ICONS.check}</button>
            </td>
        </tr>`;
    }).join('');
}

function rampRenderMesUtilisateurs() {
    if (!rampPeutGererComptes()) {
        return `<div class="ramp-card"><p class="ramp-sous-titre">${rt('u_reserve')}</p></div>`;
    }
    // Les comptes se demandent à l'arrivée sur l'écran, une seule fois.
    if (!RAMP_MES_USERS.demande) {
        RAMP_MES_USERS.demande = true;
        setTimeout(rampChargerMesUtilisateurs, 0);
    }
    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_mes_utilisateurs')}</h2>
        <button class="btn btn-primary btn-sm" onclick="rampOuvrirUtilisateur('')">
            ${RAMP_ICONS.add} ${rt('u_ajouter')}</button>
    </div>
    <div class="ramp-actions-bar">
        <input class="ramp-input" style="max-width:280px;" placeholder="${_rAttr(rt('f_rechercher'))}"
               value="${_rAttr(RAMP_MES_USERS.recherche)}" oninput="rampChercherUtilisateur(this.value)">
        <span style="flex:1;"></span>
        <span class="ramp-sous-titre">${rt('u_comptes', RAMP_MES_USERS.liste.length)}</span>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    <th>${rt('u_utilisateur')}</th>
                    <th style="width:24%;">${rt('u_courriel')}</th>
                    <th style="width:150px;">${rt('u_mot_de_passe')}</th>
                    <th style="width:180px;">${rt('u_role')}</th>
                    <th style="width:130px;">${rt('u_droits')}</th>
                    <th style="width:100px;">${rt('c_statut')}</th>
                    <th style="width:120px;text-align:center;">${rt('c_actions')}</th>
                </tr></thead>
                <tbody data-corps="mes-users">${RAMP_MES_USERS.chargement
                    ? `<tr><td colspan="7" class="ramp-table-vide">${rt('u_chargement')}</td></tr>`
                    : rampLignesMesUtilisateurs()}</tbody>
            </table>
        </div>
    </div>`;
}

// ── Formulaire d'un compte ──
function rampOuvrirUtilisateur(id) {
    const u = id ? RAMP_MES_USERS.liste.find((x) => x.id === id) : null;
    const roles = RAMP_MES_USERS.roles.length ? RAMP_MES_USERS.roles
        : [{ cle: 'PRESTATAIRE', libelle: 'Utilisateur de l’exploitant', aide: '' }];
    const coches = u ? (u.droits || []) : RAMP_MES_USERS.droits.map((d) => d.cle);
    const roleCourant = (u && u.role) || 'PRESTATAIRE';
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${u ? rt('u_modifier') : rt('u_ajouter')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-champ">
                    <label>${rt('u_courriel')}</label>
                    <input class="ramp-input" id="rampUserEmail" type="email"
                           value="${_rAttr((u || {}).email || '')}" placeholder="prenom.nom@exploitant.aero">
                    <span class="ramp-sous-titre">${rt('u_courriel_aide')}</span>
                </div>
                <div class="ramp-champ">
                    <label>${rt('u_nom')}</label>
                    <input class="ramp-input" id="rampUserNom" value="${_rAttr((u || {}).nom || '')}">
                </div>
                <div class="ramp-champ">
                    <label>${rt('u_prenom')}</label>
                    <input class="ramp-input" id="rampUserPrenom" value="${_rAttr((u || {}).prenom || '')}">
                </div>
                <div class="ramp-champ">
                    <label>${rt('u_role')}</label>
                    <select class="ramp-select" id="rampUserRole">
                        ${roles.map((r) => `<option value="${_rAttr(r.cle)}"
                            ${r.cle === roleCourant ? 'selected' : ''}>${_rEsc(r.libelle)}</option>`).join('')}
                    </select>
                </div>
                <div class="ramp-champ">
                    <label>${rt('c_statut')}</label>
                    <select class="ramp-select" id="rampUserActif">
                        <option value="true" ${(u || {}).actif !== false ? 'selected' : ''}>${rt('u_actif')}</option>
                        <option value="false" ${(u || {}).actif === false ? 'selected' : ''}>${rt('u_inactif')}</option>
                    </select>
                </div>
                <div class="ramp-champ">
                    <label>${rt('u_droits_confies')}</label>
                    <div class="ramp-droits-liste">
                        ${RAMP_MES_USERS.droits.map((d) => `
                        <label class="ramp-droit">
                            <input type="checkbox" class="ramp-user-droit" value="${_rAttr(d.cle)}"
                                   ${coches.includes(d.cle) ? 'checked' : ''}>
                            <span>
                                <strong>${_rEsc(d.libelle)}</strong>
                                <em>${_rEsc(d.aide || '')}</em>
                            </span>
                        </label>`).join('')}
                    </div>
                </div>
                <p class="ramp-erreur" id="rampUserErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampEnregistrerUtilisateur(${_rArg(id || '')})">
                    ${RAMP_ICONS.check} ${rt('enregistrer')}</button>
            </div>
        </div>
    </div>`);
}

async function rampEnregistrerUtilisateur(id) {
    const val = (cle) => (document.getElementById(cle) || {}).value || '';
    const erreur = document.getElementById('rampUserErreur');
    const email = val('rampUserEmail').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (erreur) erreur.textContent = rt('u_courriel_invalide');
        return;
    }
    const corps = {
        nom_utilisateur: email, email,
        nom: val('rampUserNom').trim(), prenom: val('rampUserPrenom').trim(),
        role: val('rampUserRole'), actif: val('rampUserActif') === 'true',
        droits: [...document.querySelectorAll('.ramp-user-droit:checked')].map((c) => c.value),
    };
    try {
        if (id) {
            await rampApi(`/mes-utilisateurs/${encodeURIComponent(id)}`, {
                method: 'PUT', body: JSON.stringify(corps),
            });
            rampToast(rt('u_compte_enregistre'));
        } else {
            const r = await rampApi('/mes-utilisateurs', { method: 'POST', body: JSON.stringify(corps) });
            // Le mot de passe provisoire ne s'affiche qu'ici : il est à
            // transmettre au titulaire, qui le changera à sa connexion.
            rampToast(`${rt('u_mot_de_passe')} : ${r.temp_password}`, 'warning');
        }
        rampFermerModal();
        await rampChargerMesUtilisateurs();
    } catch (e) {
        if (erreur) erreur.textContent = e.message || rt('m_enregistrement_impossible');
    }
}

// Désactiver plutôt que supprimer : l'historique du compte reste lisible.
async function rampBasculerCompte(id, actif) {
    try {
        await rampApi(`/mes-utilisateurs/${encodeURIComponent(id)}`, {
            method: 'PUT', body: JSON.stringify({ actif }),
        });
        rampToast(actif ? rt('u_compte_active') : rt('u_compte_desactive'));
        await rampChargerMesUtilisateurs();
    } catch (e) { rampToast(e.message || rt('m_enregistrement_impossible'), 'error'); }
}

async function rampReinitialiserMotDePasse(id) {
    if (!await oasisConfirmer(rt('u_confirmer_reinit'))) return;
    try {
        const r = await rampApi(`/mes-utilisateurs/${encodeURIComponent(id)}/reset-password`, { method: 'POST' });
        rampToast(`${rt('u_mot_de_passe')} : ${r.new_password}`, 'warning');
        await rampChargerMesUtilisateurs();
    } catch (e) { rampToast(e.message || rt('m_enregistrement_impossible'), 'error'); }
}

// Lire un mot de passe provisoire suppose de prouver son identité.
function rampRevelerMotDePasse(id) {
    rampAfficherModal(`
    <div class="ramp-modal-fond" onclick="rampFermerModal()">
        <div class="ramp-modal" onclick="event.stopPropagation();">
            <div class="ramp-modal-header">
                <span style="flex:1;">${rt('u_confirmer_identite')}</span>
                <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampFermerModal()">${RAMP_ICONS.close}</button>
            </div>
            <div class="ramp-modal-body">
                <div class="ramp-champ">
                    <label>${rt('u_votre_mdp')}</label>
                    <input class="ramp-input" type="password" id="rampUserMdpConfirm">
                </div>
                <p class="ramp-erreur" id="rampUserErreur"></p>
            </div>
            <div class="ramp-modal-footer">
                <button class="btn btn-outline btn-sm" onclick="rampFermerModal()">${rt('annuler')}</button>
                <button class="btn btn-primary btn-sm" onclick="rampVoirMotDePasse(${_rArg(id)})">
                    ${RAMP_ICONS.check} ${rt('u_afficher')}</button>
            </div>
        </div>
    </div>`);
    setTimeout(() => { const i = document.getElementById('rampUserMdpConfirm'); if (i) i.focus(); }, 150);
}

async function rampVoirMotDePasse(id) {
    const erreur = document.getElementById('rampUserErreur');
    const mdp = (document.getElementById('rampUserMdpConfirm') || {}).value || '';
    if (!mdp) { if (erreur) erreur.textContent = rt('u_mdp_requis'); return; }
    try {
        const r = await rampApi(`/mes-utilisateurs/${encodeURIComponent(id)}/reveal-password`, {
            method: 'POST', body: JSON.stringify({ admin_password: mdp }),
        });
        rampFermerModal();
        const masque = document.getElementById(`rampPwMasque-${id}`);
        const clair = document.getElementById(`rampPwClair-${id}`);
        if (masque && clair) {
            masque.style.display = 'none';
            clair.textContent = r.temp_password;
            clair.style.display = 'inline';
            // Le secret ne reste pas à l'écran : dix secondes suffisent à le noter.
            setTimeout(() => {
                masque.style.display = 'inline';
                clair.style.display = 'none';
                clair.textContent = '';
            }, 10000);
        }
    } catch (e) {
        if (erreur) erreur.textContent = e.message || rt('m_enregistrement_impossible');
    }
}

Object.assign(window, {
    RAMP_MES_USERS, rampPeutGererComptes, rampRenderMesUtilisateurs, rampChargerMesUtilisateurs,
    rampLignesMesUtilisateurs, rampChercherUtilisateur, rampOuvrirUtilisateur,
    rampEnregistrerUtilisateur, rampBasculerCompte, rampReinitialiserMotDePasse,
    rampRevelerMotDePasse, rampVoirMotDePasse,
});
