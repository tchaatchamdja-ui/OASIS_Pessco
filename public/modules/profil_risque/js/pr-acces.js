/* Module « Profils de Risques » — acces
   Gestion des accès du module.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  GESTION DES ACCES (Change 6: search + horizontal icons)
// ══════════════════════════════════════
window._usersCache = [];

function renderAcces() {
    if (APP_STATE.user?.role !== 'Administrateur') return `<div class="alert alert-error">${t('no_data')}</div>`;

    return `
    <div class="page-header">
        <h2>${t('access_mgmt')}</h2>
        <div class="flex gap-1">
            <input type="text" class="input-sm" id="userSearch" placeholder="${t('search')}" oninput="filterUsersTable()">
            <button class="btn btn-primary" onclick="openUserModal()">${ICONS.plus} ${t('new_user')}</button>
        </div>
    </div>
    <div class="table-container" id="usersTable"><div class="loading-spinner"></div></div>`;
}

async function loadUsersTable() {
    if (APP_STATE.currentPage !== 'acces') return;
    try {
        window._usersCache = await api('/api/users');
        renderUsersFiltered();
    } catch (e) { console.error(e); }
}

function filterUsersTable() {
    renderUsersFiltered();
}

function renderUsersFiltered() {
    const domaines = APP_STATE.data.domaines || [];
    const el = document.getElementById('usersTable');
    if (!el) return;
    const searchVal = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const users = window._usersCache.filter(u => !searchVal || (u.nom || '').toLowerCase().includes(searchVal));

    el.innerHTML = `<table class="data-table">
        <thead><tr><th>${t('name')}</th><th>Email</th><th>${t('password')}</th><th>${t('role')}</th><th>${t('domains_sectors')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
        <tbody>${users.map(u => {
            const doms = (u.domaines || []).map(d => {
                const dom = domaines.find(x => x.id === d);
                return dom ? dom.code : d;
            }).join(', ');
            return `<tr class="${u.actif === false || u.actif === 0 ? 'row-inactive' : ''}">
                <td><strong>${u.nom}</strong></td><td>${u.email}</td>
                <td>
                    <span id="pw-mask-${u.id}" style="font-family:monospace;letter-spacing:2px;">••••••••</span>
                    <span id="pw-clear-${u.id}" style="display:none;font-family:monospace;font-weight:600;color:var(--primary);"></span>
                    ${u.has_temp_password ? `<button class="btn-icon" onclick="revealPassword('${u.id}')" title="${t('show_password')}">${ICONS.eye || '👁'}</button>` : ''}
                </td>
                <td><span class="badge badge-draft">${u.role}</span></td>
                <td>${doms || '-'}</td>
                <td><span class="badge ${u.actif !== false && u.actif !== 0 ? 'badge-active' : 'badge-inactive'}">${u.actif !== false && u.actif !== 0 ? t('active') : t('inactive')}</span></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="openUserModal('${u.id}')" title="${t('edit')}">${ICONS.edit}</button>
                    <button class="btn-icon" onclick="resetUserPw('${u.id}')" title="${t('reset_password')}">${ICONS.refresh}</button>
                    <button class="btn-icon" onclick="showUserLogs('${u.id}')" title="${t('connection_logs')}">${ICONS.user}</button>
                </td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;
}

async function openUserModal(userId) {
    const domaines = APP_STATE.data.domaines || [];
    let user = null;
    if (userId) {
        const users = await api('/api/users');
        user = users.find(u => u.id === userId);
    }

    showModal(userId ? t('edit') + ' ' + t('user') : t('new_user'), `
        <div class="form-row">
            <div class="form-group"><label>${t('name')}</label><input id="uNom" value="${user?.nom || ''}"></div>
            <div class="form-group"><label>Email</label><input id="uEmail" value="${user?.email || ''}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>${t('role')}</label>
                <select id="uRole">
                    ${['Consultation','Evaluateur','Validateur','Administrateur'].map(r =>
                        `<option value="${r}" ${user?.role===r?'selected':''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>${t('status')}</label>
                <select id="uActif">
                    <option value="true" ${user?.actif !== false ? 'selected' : ''}>${t('active')}</option>
                    <option value="false" ${user?.actif === false ? 'selected' : ''}>${t('inactive')}</option>
                </select>
            </div>
        </div>
        <div class="form-group"><label>${t('domains_sectors')}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                ${domaines.map(d => `<label style="display:flex;align-items:center;gap:0.25rem;font-size:0.85rem;">
                    <input type="checkbox" class="domCheck" value="${d.id}" ${(user?.domaines||[]).includes(d.id)?'checked':''}> ${d.code}
                </label>`).join('')}
            </div>
        </div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="saveUser('${userId || ''}')">${t('save')}</button>`);
}

async function saveUser(userId) {
    const data = {
        nom: document.getElementById('uNom').value,
        email: document.getElementById('uEmail').value,
        role: document.getElementById('uRole').value,
        actif: document.getElementById('uActif').value === 'true',
        domaines: [...document.querySelectorAll('.domCheck:checked')].map(c => c.value)
    };
    try {
        if (userId) {
            await api(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            const res = await api('/api/users', { method: 'POST', body: JSON.stringify(data) });
            if (res.temp_password) showToast(`${t('password_gen')}: ${res.temp_password}`, 'warning');
        }
        closeModal(); renderPage();
    } catch (e) { showToast(e.message, 'error'); }
}

async function resetUserPw(userId) {
    if (!confirm(t('confirm_action'))) return;
    try {
        const res = await api(`/api/users/${userId}/reset-password`, { method: 'POST' });
        showToast(`${t('password_gen')}: ${res.new_password}`, 'warning');
        // Open mailto to notify user
        const user = (window._usersCache || []).find(u => u.id === userId);
        if (user?.email) {
            const subject = encodeURIComponent('Réinitialisation de mot de passe - Profil de Risque');
            const body = encodeURIComponent(`Bonjour,\n\nVotre mot de passe a été réinitialisé.\n\nNom d'utilisateur : ${user.email}\nNouveau mot de passe : ${res.new_password}\n\nVeuillez changer votre mot de passe lors de votre prochaine connexion.\n\nCordialement`);
            window.location.href = `mailto:${user.email}?subject=${subject}&body=${body}`;
        }
    } catch (e) { showToast(e.message, 'error'); }
}

async function revealPassword(userId) {
    showModal(t('confirm_admin_password'), `
        <div class="form-group">
            <label>${t('admin_password')}</label>
            <input type="password" id="adminPwConfirm" placeholder="${t('password')}">
        </div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="doRevealPassword('${userId}')">${t('confirm_password_label')}</button>`);
    setTimeout(() => document.getElementById('adminPwConfirm')?.focus(), 200);
}

async function doRevealPassword(userId) {
    const adminPw = document.getElementById('adminPwConfirm')?.value;
    if (!adminPw) { showToast(t('required_field'), 'error'); return; }
    try {
        const res = await api(`/api/users/${userId}/reveal-password`, {
            method: 'POST', body: JSON.stringify({ admin_password: adminPw })
        });
        closeModal();
        const maskEl = document.getElementById(`pw-mask-${userId}`);
        const clearEl = document.getElementById(`pw-clear-${userId}`);
        if (maskEl && clearEl && res.temp_password) {
            maskEl.style.display = 'none';
            clearEl.textContent = res.temp_password;
            clearEl.style.display = 'inline';
            // Auto-hide after 10 seconds
            setTimeout(() => {
                maskEl.style.display = 'inline';
                clearEl.style.display = 'none';
                clearEl.textContent = '';
            }, 10000);
        }
    } catch (e) { showToast(e.message, 'error'); }
}

async function showUserLogs(userId) {
    const users = await api('/api/users');
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const logs = user.logs || [];
    showModal(`${t('connection_logs')} - ${user.nom}`, `
        <div class="log-list">
            ${logs.map(l => `<div class="log-item">
                <span class="log-action">${l.action}</span>
                <span class="log-date">${formatDate(l.date)}</span>
            </div>`).join('') || `<div class="text-center">${t('no_data')}</div>`}
        </div>
    `);
}
