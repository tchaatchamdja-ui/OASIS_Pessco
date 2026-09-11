/* Module « Profils de Risques » — bibliotheque
   Bibliothèque documentaire.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  BIBLIOTHEQUE (Change 7: file picker workflow)
// ══════════════════════════════════════
function renderBibliotheque() {
    const D = APP_STATE.data;
    const docs = D.documents || [];
    const isAdmin = APP_STATE.user?.role === 'Administrateur';

    return `
    <div class="page-header">
        <h2>${t('library')}</h2>
        <button class="btn btn-primary btn-sm" onclick="triggerFileUpload()">${ICONS.upload} ${t('upload')}</button>
        <input type="file" id="docFileInput" style="display:none" onchange="handleDocFileSelected(event)">
    </div>
    <div class="table-container">
        <table class="data-table">
            <thead><tr><th>${t('name')}</th><th>Type</th><th>Taille</th><th>${t('date')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${docs.map(d => `<tr>
                <td>${escapeHtml(d.nom)}</td><td>${escapeHtml(d.type || '-')}</td>
                <td>${d.taille ? (d.taille/1024).toFixed(1)+' Ko' : '-'}</td>
                <td class="date-cell">${formatDate(d.date_upload)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="downloadDoc('${d.id}','${d.nom}')" title="${t('download')}">${ICONS.download}</button>
                    ${isAdmin ? `<button class="btn-icon danger" onclick="deleteDoc('${d.id}')">${ICONS.trash}</button>` : ''}
                </td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center">${t('no_document')}</td></tr>`}</tbody>
        </table>
    </div>`;
}

function triggerFileUpload() {
    document.getElementById('docFileInput')?.click();
}

// Limite alignée sur celle du serveur (le base64 gonfle le corps d'environ 1/3)
const DOC_MAX_BYTES = 3_500_000;

function handleDocFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > DOC_MAX_BYTES) {
        showToast(`« ${file.name} » fait ${(file.size / 1048576).toFixed(1)} Mo : maximum ${(DOC_MAX_BYTES / 1048576).toFixed(1)} Mo.`, 'error');
        event.target.value = '';
        return;
    }
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    showModal(t('upload'), `
        <div class="form-group"><label>${t('file_name')}</label><input id="docName" type="text" value="${baseName}"></div>
        <div class="form-group"><label>Type</label><input id="docType" type="text" value="${ext}"></div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.5rem;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="uploadDocWithFile()">${t('save')}</button>`);

    window._pendingDocFile = file;
}

async function uploadDocWithFile() {
    const nom = document.getElementById('docName').value.trim();
    const type = document.getElementById('docType').value.trim();
    const file = window._pendingDocFile;
    if (!nom) { showToast('Nom requis', 'error'); return; }
    if (!file) { showToast('Aucun fichier sélectionné', 'error'); return; }
    const btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Téléversement…'; }
    try {
        // Le serveur reçoit du JSON : le fichier est transmis en base64.
        const fileB64 = await fileToBase64(file);
        const res = await fetch('/api/documents', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, type, mime: file.type || '', fileB64 })
        });
        if (!res.ok) {
            // Le corps peut ne pas être du JSON (413 renvoyé par le body-parser)
            const d = await res.json().catch(() => ({}));
            throw new Error(
                res.status === 413 || d.error === 'fichier_trop_volumineux'
                    ? `Fichier trop volumineux (maximum ${(DOC_MAX_BYTES / 1048576).toFixed(1)} Mo).`
                : d.error === 'fichier_requis' ? 'Fichier illisible.'
                : d.error === 'nom_requis' ? 'Nom requis.'
                : d.error || `Téléversement impossible (erreur ${res.status})`
            );
        }
        window._pendingDocFile = null;
        const input = document.getElementById('docFileInput');
        if (input) input.value = '';
        closeModal();
        await loadAllData();
        renderPage();
        showToast(`« ${nom} » téléversé`);
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = t('save'); }
        showToast(e.message, 'error');
    }
}

async function deleteDoc(id) {
    if (!await oasisConfirmer(t('confirm_delete'))) return;
    try { await api(`/api/documents/${id}`, { method: 'DELETE' }); await loadAllData(); renderPage(); } catch (e) { showToast(e.message, 'error'); }
}

async function downloadDoc(id, nom) {
    try {
        const token = localStorage.getItem('pr_token');
        const res = await fetch(`/api/documents/${id}/download`, { credentials: 'same-origin', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom || 'document'; a.click();
    } catch (e) { showToast(e.message, 'error'); }
}
