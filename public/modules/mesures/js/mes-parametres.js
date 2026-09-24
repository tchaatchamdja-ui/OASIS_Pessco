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
                onclick="mesOuvrirCategorie('${c.id}')" title="${_mesAttr(mt('modifier'))}">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerCategorie('${c.id}')" title="${_mesAttr(mt('supprimer'))}">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">${mt('aucune_categorie')}</td></tr>`;

    const lignesType = mesTypes().map((t) => `<tr>
        <td>${_mesEsc(mesLibelleCategorie(t.categorie_code))}</td>
        <td><strong>${_mesEsc(t.libelle)}</strong></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirType('${t.id}')" title="${_mesAttr(mt('modifier'))}">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerType('${t.id}')" title="${_mesAttr(mt('supprimer'))}">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">${mt('aucun_type')}</td></tr>`;

    const lignesInv = mesTypesInvestigation().map((t) => `<tr>
        <td><strong>${_mesEsc(t.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(t.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirTypeInvestigation('${t.id}')" title="${_mesAttr(mt('modifier'))}">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerTypeInvestigation('${t.id}')" title="${_mesAttr(mt('supprimer'))}">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">${mt('aucun_type_inv')}</td></tr>`;

    const lignesCom = mesComites().map((c) => `<tr>
        <td><strong>${_mesEsc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(c.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirComite('${c.id}')" title="${_mesAttr(mt('modifier'))}">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerComite('${c.id}')" title="${_mesAttr(mt('supprimer'))}">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">${mt('aucun_comite')}</td></tr>`;

    // Chaque liste a son sous-menu : elles se lisent une à la fois, dans la
    // bande latérale du portail, comme aux Paramètres des autres modules. Le
    // bandeau qui présentait les quatre ensemble n'a plus d'objet.
    const carte = (cleTitre, ouvrir, entetes, lignes) => `
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">${mt(cleTitre)}</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="${ouvrir}()">${MES_ICONS.add} ${mt('ajouter')}</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr>${entetes}</tr></thead>
                <tbody>${lignes}</tbody>
            </table></div>
        </div>`;

    const SOUS_MENUS = [
        { cle: 'categories', cleT: 'par_categories', icone: 'couches',
          corps: () => carte('par_categories', 'mesOuvrirCategorie',
            `<th>${mt('col_libelle')}</th><th style="width:70px;text-align:center;">${mt('col_types')}</th>`
            + `<th style="width:110px;">${mt('col_actions')}</th>`, lignesCat) },
        { cle: 'types', cleT: 'par_types_mesure', icone: 'shield',
          corps: () => carte('par_types_mesure', 'mesOuvrirType',
            `<th style="width:170px;">${mt('fiche_categorie')}</th><th>${mt('col_libelle')}</th>`
            + `<th style="width:110px;">${mt('col_actions')}</th>`, lignesType) },
        { cle: 'investigations', cleT: 'par_types_inv', icone: 'loupe',
          corps: () => carte('par_types_inv', 'mesOuvrirTypeInvestigation',
            `<th>${mt('col_libelle')}</th><th style="width:110px;">${mt('col_actions')}</th>`, lignesInv) },
        { cle: 'comites', cleT: 'par_comites', icone: 'groupe',
          corps: () => carte('par_comites', 'mesOuvrirComite',
            `<th>${mt('col_libelle')}</th><th style="width:110px;">${mt('col_actions')}</th>`, lignesCom) },
    ];

    const courant = SOUS_MENUS.find((o) => o.cle === MES_STATE.paramSousMenu) || SOUS_MENUS[0];
    const repliee = !!MES_STATE.paramBarreRepliee;
    const bascule = mt(repliee ? 'sous_menu_deplier' : 'sous_menu_replier');
    const entrees = SOUS_MENUS.map((o) => `
        <button class="cfg-sidebar-item ${o.cle === courant.cle ? 'active' : ''}"
                onclick="mesParamSousMenu('${o.cle}')" title="${_mesAttr(mt(o.cleT))}">
            <span class="cfg-sidebar-icon">${MES_ICONS[o.icone]}</span>
            <span class="cfg-sidebar-label">${_mesEsc(mt(o.cleT))}</span>
        </button>`).join('');

    return `
    <div class="mes-page-header">
        <h2>${mt('nav_parametres')}</h2>
        <span class="mes-sous-titre">${mt('par_sous_titre')}</span>
    </div>
    <div class="cfg-layout">
        <div class="cfg-sidebar ${repliee ? 'collapsed' : ''}">
            <button class="cfg-sidebar-toggle" onclick="mesBasculerBarreParam()"
                    title="${_mesAttr(bascule)}" aria-label="${_mesAttr(bascule)}"
                    aria-expanded="${!repliee}">
                <span style="display:flex;${repliee ? 'transform:rotate(180deg);' : ''}">${MES_ICONS.chevron}</span>
            </button>
            ${entrees}
        </div>
        <div class="cfg-content">${courant.corps()}</div>
    </div>`;
}

// Un sous-menu s'ouvre ; la bande se replie sur ses icônes, comme au portail.
function mesParamSousMenu(cle) {
    MES_STATE.paramSousMenu = cle;
    mesRenderPage();
}

function mesBasculerBarreParam() {
    MES_STATE.paramBarreRepliee = !MES_STATE.paramBarreRepliee;
    mesRenderPage();
}

// ── Modales de paramétrage ──

function mesOuvrirCategorie(id) {
    MES_STATE.categorieEnCours = id
        ? { ...(mesCategories().find((c) => c.id === id) || {}) } : {};
    mesAfficherModal();
}

function mesOuvrirType(id) {
    if (!id && !mesCategories().length) {
        mesToast(mt('creez_categorie'), 'error');
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
                    <span style="flex:1;">${co.id ? mt('modifier_comite') : mt('nouveau_comite')}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('nom_comite')}</label>
                        <input class="mes-input" id="mesCoLib" value="${_mesAttr(co.libelle || '')}"
                               placeholder="${_mesAttr(mt('comite_exemple'))}">
                    </div>
                    <p class="mes-preuve-vide">Ce comité siégera pour qualifier une carence
                       et arrêter la sanction.</p>
                    <p class="mes-erreur" id="mesCoErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
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
                    <span style="flex:1;">${ti.id ? mt('modifier_type_inv') : mt('nouveau_type_inv')}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('libelle_type_inv')}</label>
                        <input class="mes-input" id="mesTiLib" value="${_mesAttr(ti.libelle || '')}"
                               placeholder="${_mesAttr(mt('type_inv_exemple'))}">
                    </div>
                    <p class="mes-erreur" id="mesTiErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
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
                    <span style="flex:1;">${c.id ? mt('modifier_categorie') : mt('nouvelle_categorie')}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('libelle_categorie')}</label>
                        <input class="mes-input" id="mesCatLib" value="${_mesAttr(c.libelle || '')}"
                               placeholder="ex. Mesure administrative">
                    </div>
                    <p class="mes-erreur" id="mesCatErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
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
                    <span style="flex:1;">${t.id ? mt('modifier_type') : mt('nouveau_type')}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('categorie_rattachement')}</label>
                        <select class="mes-select" id="mesTypeCat">
                            <option value="">—</option>
                            ${mesCategories().map((x) => `<option value="${_mesAttr(x.code)}"
                                ${t.categorie_code === x.code ? 'selected' : ''}>${_mesEsc(x.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('libelle_type')}</label>
                        <input class="mes-input" id="mesTypeLib" value="${_mesAttr(t.libelle || '')}"
                               placeholder="ex. Avertissement">
                    </div>
                    <p class="mes-erreur" id="mesTypeErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
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
    if (!libelle.trim()) { err.textContent = mt('nom_requis'); return; }
    try {
        if (c.id) await mesApi(`/parametres/comites/${c.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/comites', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast(mt('comite_enregistre'));
    } catch (e) { err.textContent = e.message || mt('enregistrement_impossible'); }
}

async function mesSupprimerComite(id) {
    const c = mesComites().find((x) => x.id === id);
    if (!c) return;
    if (!await oasisConfirmer(mt('confirmer_suppr_comite', c.libelle))) return;
    try {
        await mesApi(`/parametres/comites/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast(mt('comite_supprime'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
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
    if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
    try {
        if (t.id) await mesApi(`/parametres/types-investigation/${t.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/types-investigation', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast(mt('type_inv_enregistre'));
    } catch (e) { err.textContent = e.message || mt('enregistrement_impossible'); }
}

async function mesSupprimerTypeInvestigation(id) {
    const t = mesTypesInvestigation().find((x) => x.id === id);
    if (!t) return;
    if (!await oasisConfirmer(mt('confirmer_suppr_type', t.libelle))) return;
    try {
        await mesApi(`/parametres/types-investigation/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast(mt('type_supprime'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
}

async function mesEnregistrerCategorie() {
    const c = MES_STATE.categorieEnCours || {};
    const libelle = (document.getElementById('mesCatLib') || {}).value || '';
    const err = document.getElementById('mesCatErreur');
    if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
    try {
        if (c.id) await mesApi(`/parametres/categories/${c.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/categories', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast(mt('categorie_enregistree'));
    } catch (e) { err.textContent = e.message || mt('enregistrement_impossible'); }
}

async function mesEnregistrerType() {
    const t = MES_STATE.typeEnCours || {};
    const libelle = (document.getElementById('mesTypeLib') || {}).value || '';
    const categorie = (document.getElementById('mesTypeCat') || {}).value || '';
    const err = document.getElementById('mesTypeErreur');
    if (!categorie) { err.textContent = mt('categorie_requise'); return; }
    if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
    const corps = JSON.stringify({ libelle, categorie_code: categorie });
    try {
        if (t.id) await mesApi(`/parametres/types/${t.id}`, { method: 'PUT', body: corps });
        else await mesApi('/parametres/types', { method: 'POST', body: corps });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast(mt('type_enregistre'));
    } catch (e) { err.textContent = e.message || mt('enregistrement_impossible'); }
}

async function mesSupprimerCategorie(id) {
    const c = mesCategories().find((x) => x.id === id) || {};
    if (!await oasisConfirmer(mt('confirmer_suppr_categorie', c.libelle))) return;
    try {
        await mesApi(`/parametres/categories/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast(mt('categorie_supprimee'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
}

async function mesSupprimerType(id) {
    const t = mesTypes().find((x) => x.id === id) || {};
    if (!await oasisConfirmer(mt('confirmer_suppr_type', t.libelle))) return;
    try {
        await mesApi(`/parametres/types/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast(mt('type_supprime'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
}

// Les gestionnaires `onclick` du balisage cherchent ces fonctions sur
// `window` : mes-app.js ne peut pas les exporter, elles n'existent pas encore
// quand son propre bloc d'exports s'exécute.
Object.assign(window, {
    mesRenderParametres, mesParamSousMenu, mesBasculerBarreParam,
    mesAfficherModal, mesFermerModal,
    mesOuvrirCategorie, mesOuvrirType,
    mesEnregistrerCategorie, mesEnregistrerType,
    mesSupprimerCategorie, mesSupprimerType,
    mesOuvrirTypeInvestigation,
    mesEnregistrerTypeInvestigation, mesSupprimerTypeInvestigation,
    mesOuvrirComite, mesEnregistrerComite, mesSupprimerComite,
});
