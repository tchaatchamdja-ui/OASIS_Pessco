// Module « Mesures d'Application » — écran « Paramètres ».
//
// Catégories et types de mesure, types d'investigation, comités décisionnels :
// quatre listes que l'écran gère de la même façon, par une fenêtre modale.
// Détaché de mes-app.js, qui touchait au plafond de deux mille lignes.
// Chargé après lui : MES_STATE, mesApi et les utilitaires d'échappement y sont
// déjà définis.

// ══════════════════════════════════════
//  Page 5 — Paramètres
// ══════════════════════════════════════

function mesRenderParametres() {
    const P = MES_STATE.data.parametres;
    const editeur = !!P.modifiable;
    const supprimable = !!P.supprimable;

    const lignesCat = mesCategories().map((c) => `<tr>
        <td><strong>${_mesEsc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(c.code)}</div></td>
        <td style="text-align:center;">${mesTypesDe(c.code).length}</td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirCategorie('${c.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerCategorie('${c.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">Aucune catégorie.</td></tr>`;

    const lignesType = mesTypes().map((t) => `<tr>
        <td>${_mesEsc(mesLibelleCategorie(t.categorie_code))}</td>
        <td><strong>${_mesEsc(t.libelle)}</strong></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirType('${t.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerType('${t.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">Aucun type.</td></tr>`;

    const lignesInv = mesTypesInvestigation().map((t) => `<tr>
        <td><strong>${_mesEsc(t.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(t.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirTypeInvestigation('${t.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerTypeInvestigation('${t.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">Aucun type d'investigation.</td></tr>`;

    const lignesCom = mesComites().map((c) => `<tr>
        <td><strong>${_mesEsc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(c.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirComite('${c.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerComite('${c.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">Aucun comité décisionnel.</td></tr>`;

    return `
    <div class="mes-page-header">
        <h2>Paramètres</h2>
        <span class="mes-sous-titre">Catégories, types de mesure, types d'investigation et comités décisionnels</span>
    </div>
    <p class="mes-note">
        Ces quatre listes peuplent les formulaires du module : une mesure porte une catégorie
        et un type rattaché à cette catégorie ; une investigation porte son type ; un comité
        décisionnel siège pour qualifier une carence et arrêter la sanction. Le code technique
        ne change pas avec le libellé — renommer n'orpheline pas ce qui a déjà été enregistré.
    </p>
    <div class="mes-grille-parametres">
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Catégories</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirCategorie()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th>Libellé</th><th style="width:70px;text-align:center;">Types</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesCat}</tbody>
            </table></div>
        </div>
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Types de mesure</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirType()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th style="width:170px;">Catégorie</th><th>Libellé</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesType}</tbody>
            </table></div>
        </div>
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Types d'investigation</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirTypeInvestigation()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th>Libellé</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesInv}</tbody>
            </table></div>
        </div>
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Comités décisionnels</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirComite()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th>Libellé</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesCom}</tbody>
            </table></div>
        </div>
    </div>`;
}

// ── Modales de paramétrage ──

function mesOuvrirCategorie(id) {
    MES_STATE.categorieEnCours = id
        ? { ...(mesCategories().find((c) => c.id === id) || {}) } : {};
    mesAfficherModal();
}

function mesOuvrirType(id) {
    if (!id && !mesCategories().length) {
        mesToast("Créez d'abord une catégorie.", 'error');
        return;
    }
    MES_STATE.typeEnCours = id ? { ...(mesTypes().find((t) => t.id === id) || {}) } : {};
    mesAfficherModal();
}

function mesFermerModal() {
    MES_STATE.categorieEnCours = null;
    MES_STATE.typeEnCours = null;
    MES_STATE.typeInvestigationEnCours = null;
    MES_STATE.comiteEnCours = null;
    MES_STATE.constatEnCours = null;
    const el = document.getElementById('mesModalRoot');
    if (el) el.innerHTML = '';
}

function mesAfficherModal() {
    const el = document.getElementById('mesModalRoot');
    if (!el) return;
    const c = MES_STATE.categorieEnCours;
    const t = MES_STATE.typeEnCours;
    const ti = MES_STATE.typeInvestigationEnCours;
    const co = MES_STATE.comiteEnCours;
    if (co) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${co.id ? 'Modifier le comité' : 'Nouveau comité décisionnel'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Nom du comité</label>
                        <input class="mes-input" id="mesCoLib" value="${_mesAttr(co.libelle || '')}"
                               placeholder="ex. Comité des sanctions">
                    </div>
                    <p class="mes-preuve-vide">Ce comité siégera pour qualifier une carence
                       et arrêter la sanction.</p>
                    <p class="mes-erreur" id="mesCoErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerComite()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
        return;
    }
    if (ti) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${ti.id ? 'Modifier le type d’investigation' : 'Nouveau type d’investigation'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Libellé du type d’investigation</label>
                        <input class="mes-input" id="mesTiLib" value="${_mesAttr(ti.libelle || '')}"
                               placeholder="ex. Analyse des enregistrements">
                    </div>
                    <p class="mes-erreur" id="mesTiErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerTypeInvestigation()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
        return;
    }
    if (c) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${c.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Libellé de la catégorie</label>
                        <input class="mes-input" id="mesCatLib" value="${_mesAttr(c.libelle || '')}"
                               placeholder="ex. Mesure administrative">
                    </div>
                    <p class="mes-erreur" id="mesCatErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerCategorie()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
        return;
    }
    if (t) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${t.id ? 'Modifier le type' : 'Nouveau type de mesure'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Catégorie de rattachement</label>
                        <select class="mes-select" id="mesTypeCat">
                            <option value="">—</option>
                            ${mesCategories().map((x) => `<option value="${_mesAttr(x.code)}"
                                ${t.categorie_code === x.code ? 'selected' : ''}>${_mesEsc(x.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>Libellé du type</label>
                        <input class="mes-input" id="mesTypeLib" value="${_mesAttr(t.libelle || '')}"
                               placeholder="ex. Avertissement">
                    </div>
                    <p class="mes-erreur" id="mesTypeErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerType()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
    }
}

function mesOuvrirComite(id) {
    MES_STATE.comiteEnCours = id ? { ...(mesComites().find((c) => c.id === id) || {}) } : {};
    mesAfficherModal();
}

async function mesEnregistrerComite() {
    const c = MES_STATE.comiteEnCours || {};
    const libelle = (document.getElementById('mesCoLib') || {}).value || '';
    const err = document.getElementById('mesCoErreur');
    if (!libelle.trim()) { err.textContent = 'Nom requis'; return; }
    try {
        if (c.id) await mesApi(`/parametres/comites/${c.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/comites', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Comité enregistré');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesSupprimerComite(id) {
    const c = mesComites().find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Supprimer le comité « ${c.libelle} » ?`)) return;
    try {
        await mesApi(`/parametres/comites/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Comité supprimé');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

function mesOuvrirTypeInvestigation(id) {
    MES_STATE.typeInvestigationEnCours = id
        ? { ...(mesTypesInvestigation().find((t) => t.id === id) || {}) } : {};
    mesAfficherModal();
}

async function mesEnregistrerTypeInvestigation() {
    const t = MES_STATE.typeInvestigationEnCours || {};
    const libelle = (document.getElementById('mesTiLib') || {}).value || '';
    const err = document.getElementById('mesTiErreur');
    if (!libelle.trim()) { err.textContent = 'Libellé requis'; return; }
    try {
        if (t.id) await mesApi(`/parametres/types-investigation/${t.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/types-investigation', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Type d’investigation enregistré');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesSupprimerTypeInvestigation(id) {
    const t = mesTypesInvestigation().find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`Supprimer le type « ${t.libelle} » ?`)) return;
    try {
        await mesApi(`/parametres/types-investigation/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Type supprimé');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

async function mesEnregistrerCategorie() {
    const c = MES_STATE.categorieEnCours || {};
    const libelle = (document.getElementById('mesCatLib') || {}).value || '';
    const err = document.getElementById('mesCatErreur');
    if (!libelle.trim()) { err.textContent = 'Libellé requis'; return; }
    try {
        if (c.id) await mesApi(`/parametres/categories/${c.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/categories', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Catégorie enregistrée');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesEnregistrerType() {
    const t = MES_STATE.typeEnCours || {};
    const libelle = (document.getElementById('mesTypeLib') || {}).value || '';
    const categorie = (document.getElementById('mesTypeCat') || {}).value || '';
    const err = document.getElementById('mesTypeErreur');
    if (!categorie) { err.textContent = 'Catégorie requise'; return; }
    if (!libelle.trim()) { err.textContent = 'Libellé requis'; return; }
    const corps = JSON.stringify({ libelle, categorie_code: categorie });
    try {
        if (t.id) await mesApi(`/parametres/types/${t.id}`, { method: 'PUT', body: corps });
        else await mesApi('/parametres/types', { method: 'POST', body: corps });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Type enregistré');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesSupprimerCategorie(id) {
    const c = mesCategories().find((x) => x.id === id) || {};
    if (!confirm(`Supprimer la catégorie « ${c.libelle} » et tous ses types ?`)) return;
    try {
        await mesApi(`/parametres/categories/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Catégorie supprimée');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

async function mesSupprimerType(id) {
    const t = mesTypes().find((x) => x.id === id) || {};
    if (!confirm(`Supprimer le type « ${t.libelle} » ?`)) return;
    try {
        await mesApi(`/parametres/types/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Type supprimé');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

// Les gestionnaires `onclick` du balisage cherchent ces fonctions sur
// `window` : mes-app.js ne peut pas les exporter, elles n'existent pas encore
// quand son propre bloc d'exports s'exécute.
Object.assign(window, {
    mesRenderParametres, mesAfficherModal, mesFermerModal,
    mesOuvrirCategorie, mesOuvrirType,
    mesEnregistrerCategorie, mesEnregistrerType,
    mesSupprimerCategorie, mesSupprimerType,
    mesOuvrirTypeInvestigation,
    mesEnregistrerTypeInvestigation, mesSupprimerTypeInvestigation,
    mesOuvrirComite, mesEnregistrerComite, mesSupprimerComite,
});
