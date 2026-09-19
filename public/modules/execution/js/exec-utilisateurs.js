/* OASIS — Module « Exécution de la Surveillance »
 * Mes utilisateurs — comptes de l’organisme (vue Prestataire).
 *
 * Le prestataire tient ses propres comptes : création, droits confiés, mots de passe.
 * Fichier issu du découpage de exec-app.js (portage PESSCO) : les scripts se
 * chargent dans l'ordre déclaré par index.html et partagent la même portée.
 */

// ══════════════════════════════════════
//  MES UTILISATEURS (prestataire-scoped)
//  Accessible uniquement aux utilisateurs M3_Prestataire.
//  Les utilisateurs créés ici sont rattachés au même prestataire
//  et ont uniquement rôle M3_Prestataire.
// ══════════════════════════════════════

// Comptes de l'organisme, plus les rôles et droits que l'administrateur peut
// confier — la route les décrit, l'écran n'en fixe aucun en dur.
let _mesUtilisateursCache = [];
let _mesRolesCache = [];
let _mesDroitsCache = [];

function execRenderMesUtilisateurs() {
    if (!_execIsPrestataire()) {
        return `<div class="page-content"><div class="text-center">${te('no_data')}</div></div>`;
    }
    const title = te('mes_utilisateurs');
    const newLabel = 'Ajouter Utilisateur';
    const searchPh = 'Rechercher';
    return `
    <div class="page-content">
        <div class="portal-page-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
            <h2 style="margin:0;">${_esc(title)}</h2>
            <div class="portal-page-actions" style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="shell-input" id="mesUsersSearch" placeholder="${_escAttr(searchPh)}" oninput="_pesSearchInput(this, execRenderMesUsersTable)" style="min-width:200px;">
                <button class="shell-btn shell-btn-primary" onclick="execOpenMesUserModal()">${EXEC_ICONS.add || '+'} ${_esc(newLabel)}</button>
            </div>
        </div>
        <div id="mesUsersTable"><div class="loading-spinner"></div></div>
    </div>`;
}

async function execLoadMesUtilisateurs() {
    try {
        const r = await api(`${EXEC_MODULE_API}/mes-utilisateurs`);
        _mesUtilisateursCache = Array.isArray(r) ? r : (r.utilisateurs || []);
        _mesRolesCache = (r && r.roles) || [];
        _mesDroitsCache = (r && r.droits) || [];
        execRenderMesUsersTable();
    } catch (e) {
        console.error('Mes utilisateurs load error:', e);
        const el = document.getElementById('mesUsersTable');
        if (el) el.innerHTML = `<div class="text-center" style="color:var(--danger);">${e.message || 'Erreur'}</div>`;
    }
}

function execRenderMesUsersTable() {
    const el = document.getElementById('mesUsersTable');
    if (!el) return;
    const searchVal = (document.getElementById('mesUsersSearch')?.value || '').toLowerCase();
    const users = _mesUtilisateursCache.filter(u => !searchVal
        || (u.nom_utilisateur || u.nom || '').toLowerCase().includes(searchVal)
        || (u.nom || '').toLowerCase().includes(searchVal)
        || (u.prenom || '').toLowerCase().includes(searchVal)
        || (u.email || '').toLowerCase().includes(searchVal));

    // Intitulés de colonnes : ce que chacune contient réellement.
    const L = {
        utilisateur: 'Utilisateur',
        email: 'Courriel (identifiant)',
        motDePasse: 'Mot de passe',
        role: 'Rôle',
        droits: 'Droits confiés',
        statut: 'Statut',
        actions: 'Actions',
        actif: 'Actif',
        inactif: 'Inactif',
        editer: 'Modifier',
        reinitialiser: 'Réinitialiser le mot de passe',
        desactiver: 'Désactiver le compte',
        activer: 'Activer le compte',
        voir: 'Voir le mot de passe temporaire',
    };

    if (!users.length) {
        el.innerHTML = `<div class="text-center" style="padding:2rem;color:var(--text-muted);">${te('aucun_utilisateur')}</div>`;
        return;
    }

    const libelleRole = (cle) => {
        const r = _mesRolesCache.find(x => x.cle === cle);
        return r ? r.libelle : (cle || '').replace('M3_', '');
    };
    const libelleDroit = (cle) => {
        const d = _mesDroitsCache.find(x => x.cle === cle);
        return d ? d.libelle : cle;
    };

    el.innerHTML = `<div class="card"><div class="exec-etats-corps exec-mes-users" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
      <table class="exec-data-table exec-compact-table exec-etats-table"
        style="font-size:0.8rem;table-layout:fixed;min-width:900px;">
        <thead><tr>
            <th>${L.utilisateur}</th>
            <th style="width:240px;">${L.email}</th>
            <th style="width:135px;">${L.motDePasse}</th>
            <th style="width:150px;">${L.role}</th>
            <th style="width:105px;">${L.droits}</th>
            <th style="width:85px;">${L.statut}</th>
            <th style="width:105px;text-align:center;">${L.actions}</th>
        </tr></thead>
        <tbody>${users.map(u => {
            const actif = u.actif !== false && u.actif !== 0;
            const droits = u.droits || [];
            const nomComplet = [u.prenom, u.nom].filter(Boolean).join(' ');
            return `<tr class="${!actif ? 'row-inactive' : ''}">
                <td><strong>${_esc(nomComplet || u.nom_utilisateur || u.username || '—')}</strong></td>
                <td class="exec-mes-users-mail">${_esc(u.email || '')}</td>
                <td class="exec-mes-users-pw">
                    <span id="mes-pw-mask-${u.id}" style="font-family:monospace;letter-spacing:2px;">••••••••</span>
                    <span id="mes-pw-clear-${u.id}" style="display:none;font-family:monospace;font-weight:600;color:var(--primary);"></span>
                    ${u.has_temp_password ? `<button class="shell-btn-icon" onclick="execRevealMesUserPassword('${u.id}')" title="${L.voir}">${EXEC_ICONS.eye}</button>` : ''}
                </td>
                <td><span class="shell-badge badge-active">${_esc(libelleRole(u.role))}</span></td>
                <td title="${_escAttr(droits.map(libelleDroit).join(', '))}">
                    ${droits.length === _mesDroitsCache.length
                        ? `<span class="exec-statut-etape">${te('droits_tous')}</span>`
                        : (droits.length
                            ? `<span class="exec-statut-etape">${te('droits_n_sur', droits.length, _mesDroitsCache.length)}</span>`
                            : `<span class="exec-statut-etape arrete">${te('droits_aucun')}</span>`)}
                </td>
                <td><span class="shell-badge ${actif ? 'badge-active' : 'badge-inactive'}">${actif ? L.actif : L.inactif}</span></td>
                <td class="exec-etats-actions">
                    <button class="shell-btn-icon" onclick="execOpenMesUserModal('${u.id}')" title="${L.editer}">${EXEC_ICONS.edit}</button>
                    <button class="shell-btn-icon" onclick="execResetMesUserPw('${u.id}')" title="${L.reinitialiser}">${EXEC_ICONS.reset || EXEC_ICONS.sync}</button>
                    <button class="shell-btn-icon" onclick="execToggleMesUser('${u.id}', ${actif ? 'false' : 'true'})"
                        title="${actif ? L.desactiver : L.activer}">${actif ? EXEC_ICONS.x || EXEC_ICONS.close : EXEC_ICONS.check}</button>
                </td>
            </tr>`;
        }).join('')}</tbody>
      </table>
    </div></div>`;
}

function execOpenMesUserModal(userId) {
    const user = userId ? _mesUtilisateursCache.find(u => u.id === userId) : null;
    const titre = userId ? 'Modifier l’utilisateur' : 'Ajouter Utilisateur';
    const droitsCoches = user ? (user.droits || []) : _mesDroitsCache.map(d => d.cle);
    const roleCourant = (user && user.role) || 'PRESTATAIRE';

    const roles = _mesRolesCache.length ? _mesRolesCache : [
        { cle: 'ADMIN_PRESTATAIRE', libelle: 'Administrateur du prestataire', aide: '' },
        { cle: 'PRESTATAIRE', libelle: 'Utilisateur du prestataire', aide: '' },
    ];

    const body = `
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Courriel</label>
                <input id="muEmail" class="shell-input" type="email" value="${_escAttr(user?.email || '')}"
                    placeholder="${te('ex_courriel_prestataire')}">
                <small class="shell-hint">${te('courriel_identifiant')}</small>
            </div>
            <div class="shell-form-group"><label>${te('col_nom')}</label>
                <input id="muNom" class="shell-input" value="${_escAttr(user?.nom || '')}">
            </div>
        </div>
        <div class="shell-form-row">
            <div class="shell-form-group"><label>${te('prenom_col')}</label>
                <input id="muPrenom" class="shell-input" value="${_escAttr(user?.prenom || '')}">
            </div>
            <div class="shell-form-group"><label>${te('status')}</label>
                <select id="muActif" class="shell-input">
                    <option value="true" ${user?.actif !== false && user?.actif !== 0 ? 'selected' : ''}>Actif</option>
                    <option value="false" ${user?.actif === false || user?.actif === 0 ? 'selected' : ''}>Inactif</option>
                </select>
            </div>
        </div>
        <div class="shell-form-group"><label>${te('col_role')}</label>
            <select id="muRole" class="shell-input">
                ${roles.map(r => `<option value="${r.cle}" ${r.cle === roleCourant ? 'selected' : ''}>${_esc(r.libelle)}</option>`).join('')}
            </select>
        </div>
        <div class="shell-form-group">
            <label>${te('droits_confies')}</label>
            <div class="exec-droits-liste">
                ${_mesDroitsCache.map(d => `
                    <label class="exec-droit">
                        <input type="checkbox" class="mu-droit" value="${d.cle}" ${droitsCoches.includes(d.cle) ? 'checked' : ''}>
                        <span><strong>${_esc(d.libelle)}</strong><em>${_esc(d.aide || '')}</em></span>
                    </label>`).join('')}
            </div>
        </div>
    `;
    const footer = `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveMesUser('${userId || ''}')">${te('save')}</button>
    `;
    shellShowModal(titre, body, footer);
}

// Désactiver un compte plutôt que le supprimer : l'historique reste lisible.
async function execToggleMesUser(userId, actif) {
    try {
        await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}`, {
            method: 'PUT', body: JSON.stringify({ actif }),
        });
        shellShowToast(actif ? te('compte_active') : te('compte_desactive'), 'success');
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || te('erreur_generique'), 'error');
    }
}

async function execSaveMesUser(userId) {
    const email = document.getElementById('muEmail')?.value.trim() || '';
    const data = {
        // Le courriel fait l'identifiant : un seul champ, une seule vérité.
        nom_utilisateur: email,
        email,
        nom: document.getElementById('muNom')?.value.trim() || '',
        prenom: document.getElementById('muPrenom')?.value.trim() || '',
        actif: document.getElementById('muActif')?.value === 'true',
        role: document.getElementById('muRole')?.value || 'PRESTATAIRE',
        droits: [...document.querySelectorAll('.mu-droit:checked')].map(c => c.value),
    };
    if (!data.email) {
        shellShowToast((typeof pt === 'function' ? pt('required_field') : 'Champs obligatoires manquants'), 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        shellShowToast('Courriel invalide', 'error');
        return;
    }
    try {
        if (userId) {
            await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}`, {
                method: 'PUT', body: JSON.stringify(data)
            });
        } else {
            const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs`, {
                method: 'POST', body: JSON.stringify(data)
            });
            if (res.temp_password) {
                shellShowToast(`${(typeof pt === 'function' ? pt('password_gen') : 'Mot de passe')}: ${res.temp_password}`, 'warning');
            }
        }
        shellCloseModal();
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || te('erreur_generique'), 'error');
    }
}

async function execResetMesUserPw(userId) {
    if (!await oasisConfirmer((typeof pt === 'function' ? pt('confirm_action') : 'Confirmer ?'))) return;
    try {
        const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}/reset-password`, { method: 'POST' });
        shellShowToast(`${(typeof pt === 'function' ? pt('password_gen') : 'Mot de passe')}: ${res.new_password}`, 'warning');
        const user = _mesUtilisateursCache.find(u => u.id === userId);
        if (user?.email) {
            const subject = encodeURIComponent('Réinitialisation de mot de passe - PESSCO');
            const body = encodeURIComponent(`Bonjour,\n\nVotre mot de passe a été réinitialisé.\n\nNom d'utilisateur : ${user.email}\nNouveau mot de passe : ${res.new_password}\n\nVeuillez changer votre mot de passe lors de votre prochaine connexion.\n\nCordialement`);
            window.location.href = `mailto:${user.email}?subject=${subject}&body=${body}`;
        }
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || te('erreur_generique'), 'error');
    }
}


function execRevealMesUserPassword(userId) {
    const L = {
        title: (typeof pt === 'function' ? pt('confirm_admin_password') : 'Confirmer mot de passe'),
        pw: (typeof pt === 'function' ? pt('password') : 'Mot de passe'),
        cancel: (typeof pt === 'function' ? pt('cancel') : 'Annuler'),
        confirm: (typeof pt === 'function' ? pt('confirm_password_label') : 'Confirmer')
    };
    shellShowModal(L.title, `
        <div class="shell-form-group">
            <label>${L.pw}</label>
            <input type="password" id="mesAdminPwConfirm" class="shell-input" placeholder="${L.pw}">
        </div>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${L.cancel}</button>
        <button class="shell-btn shell-btn-primary" onclick="execDoRevealMesUserPassword('${userId}')">${L.confirm}</button>`);
    setTimeout(() => document.getElementById('mesAdminPwConfirm')?.focus(), 200);
}

async function execDoRevealMesUserPassword(userId) {
    const adminPw = document.getElementById('mesAdminPwConfirm')?.value || '';
    if (!adminPw) { shellShowToast((typeof pt === 'function' ? pt('required_field') : te('requis')), 'error'); return; }
    try {
        const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}/reveal-password`, {
            method: 'POST', body: JSON.stringify({ admin_password: adminPw })
        });
        shellCloseModal();
        const maskEl = document.getElementById(`mes-pw-mask-${userId}`);
        const clearEl = document.getElementById(`mes-pw-clear-${userId}`);
        if (maskEl && clearEl && res.temp_password) {
            maskEl.style.display = 'none';
            clearEl.textContent = res.temp_password;
            clearEl.style.display = 'inline';
            setTimeout(() => {
                maskEl.style.display = 'inline';
                clearEl.style.display = 'none';
                clearEl.textContent = '';
            }, 10000);
        }
    } catch (e) {
        shellShowToast(e.message || te('erreur_generique'), 'error');
    }
}



