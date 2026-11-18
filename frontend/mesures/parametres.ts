// OASIS — « Mesures d'Application » (CARE) : l'écran « Paramètres »
// (ADR-003, 5.c — n° 5.f.118).
//
// Catégories et types de mesure, types d'investigation, comités décisionnels :
// quatre listes que l'écran gère de la même façon, par une fenêtre modale.
//
// Converti à la lettre depuis `mes-parametres.js` : le balisage est rendu
// caractère pour caractère, et chaque enregistrement envoie la même requête. La
// conversion ne corrige rien — les trois « Enregistrer » restés en français
// dans les fenêtres, la phrase du comité non traduite, le placeholder
// « ex. Avertissement » : ils sont tels qu'ils étaient, et c'est le relevé qui
// les montre, non ce fichier qui les cache.
//
// L'état et les libellés sont lus sur la page (`partage.ts`) ; les aides de
// `mes-app.js`, que `restant.d.ts` déclare, sont exigées au moment de l'appel,
// comme l'ancien les lisait par leur nom.
import { etat, mt, requis } from './partage';

// L'échappement est celui du socle : `_mesEsc` et `_mesAttr` n'en étaient que
// deux noms (`(v) => oasisEsc(v)`).
const esc = (v: unknown): string => window.oasisEsc(v);
const icone = (nom: string): string => requis('MES_ICONS')[nom] as string;
const champ = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;
const rendre = (): void => { requis('mesRenderPage')(); };

// L'ancien lisait `e.message` sur ce que l'API levait : une valeur nulle y
// levait à son tour, et c'est encore le cas ici.
const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;

// ══════════════════════════════════════
//  Page 5 — Paramètres
// ══════════════════════════════════════

export function mesRenderParametres(): string {
  const P = etat().data.parametres;
  const editeur = !!P.modifiable;
  const supprimable = !!P.supprimable;

  const lignesCat = requis('mesCategories')().map((c) => `<tr>
        <td><strong>${esc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${esc(c.code)}</div></td>
        <td style="text-align:center;">${requis('mesTypesDe')(c.code).length}</td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirCategorie('${c.id}')" title="${esc(mt('modifier'))}" aria-label="${esc(mt('modifier'))}">${icone('edit')}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerCategorie('${c.id}')" title="${esc(mt('supprimer'))}" aria-label="${esc(mt('supprimer'))}">${icone('delete')}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">${mt('aucune_categorie')}</td></tr>`;

  const lignesType = requis('mesTypes')().map((t) => `<tr>
        <td>${esc(requis('mesLibelleCategorie')(t.categorie_code))}</td>
        <td><strong>${esc(t.libelle)}</strong></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirType('${t.id}')" title="${esc(mt('modifier'))}" aria-label="${esc(mt('modifier'))}">${icone('edit')}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerType('${t.id}')" title="${esc(mt('supprimer'))}" aria-label="${esc(mt('supprimer'))}">${icone('delete')}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">${mt('aucun_type')}</td></tr>`;

  const lignesInv = requis('mesTypesInvestigation')().map((t) => `<tr>
        <td><strong>${esc(t.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${esc(t.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirTypeInvestigation('${t.id}')" title="${esc(mt('modifier'))}" aria-label="${esc(mt('modifier'))}">${icone('edit')}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerTypeInvestigation('${t.id}')" title="${esc(mt('supprimer'))}" aria-label="${esc(mt('supprimer'))}">${icone('delete')}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">${mt('aucun_type_inv')}</td></tr>`;

  const lignesCom = requis('mesComites')().map((c) => `<tr>
        <td><strong>${esc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${esc(c.code)}</div></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirComite('${c.id}')" title="${esc(mt('modifier'))}" aria-label="${esc(mt('modifier'))}">${icone('edit')}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerComite('${c.id}')" title="${esc(mt('supprimer'))}" aria-label="${esc(mt('supprimer'))}">${icone('delete')}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="2" class="mes-table-vide">${mt('aucun_comite')}</td></tr>`;

  // Chaque liste a son sous-menu : elles se lisent une à la fois, dans la
  // bande latérale du portail, comme aux Paramètres des autres modules.
  const carte = (cleTitre: string, ouvrir: string, entetes: string, lignes: string): string => `
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">${mt(cleTitre)}</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="${ouvrir}()">${icone('add')} ${mt('ajouter')}</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr>${entetes}</tr></thead>
                <tbody>${lignes}</tbody>
            </table></div>
        </div>`;

  const SOUS_MENUS: { cle: string; cleT: string; icone: string; corps: () => string }[] = [
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

  const E = etat();
  const courant = SOUS_MENUS.find((o) => o.cle === E.paramSousMenu) || (SOUS_MENUS[0] as (typeof SOUS_MENUS)[number]);
  const repliee = !!E.paramBarreRepliee;
  const bascule = mt(repliee ? 'sous_menu_deplier' : 'sous_menu_replier');
  const entrees = SOUS_MENUS.map((o) => `
        <button class="cfg-sidebar-item ${o.cle === courant.cle ? 'active' : ''}"
                onclick="mesParamSousMenu('${o.cle}')" title="${esc(mt(o.cleT))}">
            <span class="cfg-sidebar-icon">${icone(o.icone)}</span>
            <span class="cfg-sidebar-label">${esc(mt(o.cleT))}</span>
        </button>`).join('');

  return `
    <div class="mes-page-header">
        <h2>${mt('nav_parametres')}</h2>
        <span class="mes-sous-titre">${mt('par_sous_titre')}</span>
    </div>
    <div class="cfg-layout">
        <div class="cfg-sidebar ${repliee ? 'collapsed' : ''}">
            <button class="cfg-sidebar-toggle" onclick="mesBasculerBarreParam()"
                    title="${esc(bascule)}" aria-label="${esc(bascule)}"
                    aria-expanded="${!repliee}">
                <span style="display:flex;${repliee ? 'transform:rotate(180deg);' : ''}">${icone('chevron')}</span>
            </button>
            ${entrees}
        </div>
        <div class="cfg-content">${courant.corps()}</div>
    </div>`;
}

// Un sous-menu s'ouvre ; la bande se replie sur ses icônes, comme au portail.
export function mesParamSousMenu(cle: string): void {
  etat().paramSousMenu = cle;
  rendre();
}

export function mesBasculerBarreParam(): void {
  const E = etat();
  E.paramBarreRepliee = !E.paramBarreRepliee;
  rendre();
}

// ── Modales de paramétrage ──

export function mesOuvrirCategorie(id?: string): void {
  etat().categorieEnCours = id
    ? { ...(requis('mesCategories')().find((c) => c.id === id) || {}) } : {};
  mesAfficherModal();
}

export function mesOuvrirType(id?: string): void {
  if (!id && !requis('mesCategories')().length) {
    requis('mesToast')(mt('creez_categorie'), 'error');
    return;
  }
  etat().typeEnCours = id ? { ...(requis('mesTypes')().find((t) => t.id === id) || {}) } : {};
  mesAfficherModal();
}

export function mesFermerModal(): void {
  const E = etat();
  E.categorieEnCours = null;
  E.typeEnCours = null;
  E.typeInvestigationEnCours = null;
  E.comiteEnCours = null;
  E.constatEnCours = null;
  const el = document.getElementById('mesModalRoot');
  if (el) el.innerHTML = '';
}

export function mesAfficherModal(): void {
  const el = document.getElementById('mesModalRoot');
  if (!el) return;
  const E = etat();
  const c = E.categorieEnCours;
  const t = E.typeEnCours;
  const ti = E.typeInvestigationEnCours;
  const co = E.comiteEnCours;
  if (co) {
    el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${co.id ? mt('modifier_comite') : mt('nouveau_comite')}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('nom_comite')}</label>
                        <input class="mes-input" id="mesCoLib" value="${esc(co.libelle || '')}"
                               placeholder="${esc(mt('comite_exemple'))}">
                    </div>
                    <p class="mes-preuve-vide">Ce comité siégera pour qualifier une carence
                       et arrêter la sanction.</p>
                    <p class="mes-erreur" id="mesCoErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerComite()">${icone('check')} Enregistrer</button>
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
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('libelle_type_inv')}</label>
                        <input class="mes-input" id="mesTiLib" value="${esc(ti.libelle || '')}"
                               placeholder="${esc(mt('type_inv_exemple'))}">
                    </div>
                    <p class="mes-erreur" id="mesTiErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerTypeInvestigation()">${icone('check')} Enregistrer</button>
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
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('libelle_categorie')}</label>
                        <input class="mes-input" id="mesCatLib" value="${esc(c.libelle || '')}"
                               placeholder="ex. Mesure administrative">
                    </div>
                    <p class="mes-erreur" id="mesCatErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerCategorie()">${icone('check')} Enregistrer</button>
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
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>${mt('categorie_rattachement')}</label>
                        <select class="mes-select" id="mesTypeCat">
                            <option value="">—</option>
                            ${requis('mesCategories')().map((x) => `<option value="${esc(x.code)}"
                                ${t.categorie_code === x.code ? 'selected' : ''}>${esc(x.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('libelle_type')}</label>
                        <input class="mes-input" id="mesTypeLib" value="${esc(t.libelle || '')}"
                               placeholder="ex. Avertissement">
                    </div>
                    <p class="mes-erreur" id="mesTypeErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">${mt('annuler')}</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerType()">${icone('check')} Enregistrer</button>
                </div>
            </div>
        </div>`;
  }
}

export function mesOuvrirComite(id?: string): void {
  etat().comiteEnCours = id ? { ...(requis('mesComites')().find((c) => c.id === id) || {}) } : {};
  mesAfficherModal();
}

/**
 * Les deux formes d'un enregistrement : modifier l'élément qu'on rouvre, ou en
 * créer un. Le corps est le même ; seul le verbe et l'adresse changent.
 */
async function ecrire(chemin: string, id: string | undefined, corps: string): Promise<void> {
  const api = requis('mesApi');
  if (id) await api(`${chemin}/${id}`, { method: 'PUT', body: corps });
  else await api(chemin, { method: 'POST', body: corps });
}

export async function mesEnregistrerComite(): Promise<void> {
  const c = etat().comiteEnCours || {};
  const libelle = champ('mesCoLib')?.value || '';
  const err = document.getElementById('mesCoErreur') as HTMLElement;
  if (!libelle.trim()) { err.textContent = mt('nom_requis'); return; }
  try {
    await ecrire('/parametres/comites', c.id, JSON.stringify({ libelle }));
    mesFermerModal();
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('comite_enregistre'));
  } catch (e) { err.textContent = messageDe(e) || mt('enregistrement_impossible'); }
}

export async function mesSupprimerComite(id: string): Promise<void> {
  const c = requis('mesComites')().find((x) => x.id === id);
  if (!c) return;
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_comite', c.libelle))) return;
  try {
    await requis('mesApi')(`/parametres/comites/${id}`, { method: 'DELETE' });
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('comite_supprime'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('suppression_impossible'), 'error'); }
}

export function mesOuvrirTypeInvestigation(id?: string): void {
  etat().typeInvestigationEnCours = id
    ? { ...(requis('mesTypesInvestigation')().find((t) => t.id === id) || {}) } : {};
  mesAfficherModal();
}

export async function mesEnregistrerTypeInvestigation(): Promise<void> {
  const t = etat().typeInvestigationEnCours || {};
  const libelle = champ('mesTiLib')?.value || '';
  const err = document.getElementById('mesTiErreur') as HTMLElement;
  if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
  try {
    await ecrire('/parametres/types-investigation', t.id, JSON.stringify({ libelle }));
    mesFermerModal();
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('type_inv_enregistre'));
  } catch (e) { err.textContent = messageDe(e) || mt('enregistrement_impossible'); }
}

export async function mesSupprimerTypeInvestigation(id: string): Promise<void> {
  const t = requis('mesTypesInvestigation')().find((x) => x.id === id);
  if (!t) return;
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_type', t.libelle))) return;
  try {
    await requis('mesApi')(`/parametres/types-investigation/${id}`, { method: 'DELETE' });
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('type_supprime'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('suppression_impossible'), 'error'); }
}

export async function mesEnregistrerCategorie(): Promise<void> {
  const c = etat().categorieEnCours || {};
  const libelle = champ('mesCatLib')?.value || '';
  const err = document.getElementById('mesCatErreur') as HTMLElement;
  if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
  try {
    await ecrire('/parametres/categories', c.id, JSON.stringify({ libelle }));
    mesFermerModal();
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('categorie_enregistree'));
  } catch (e) { err.textContent = messageDe(e) || mt('enregistrement_impossible'); }
}

export async function mesEnregistrerType(): Promise<void> {
  const t = etat().typeEnCours || {};
  const libelle = champ('mesTypeLib')?.value || '';
  const categorie = (document.getElementById('mesTypeCat') as HTMLSelectElement | null)?.value || '';
  const err = document.getElementById('mesTypeErreur') as HTMLElement;
  if (!categorie) { err.textContent = mt('categorie_requise'); return; }
  if (!libelle.trim()) { err.textContent = mt('libelle_requis'); return; }
  const corps = JSON.stringify({ libelle, categorie_code: categorie });
  try {
    await ecrire('/parametres/types', t.id, corps);
    mesFermerModal();
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('type_enregistre'));
  } catch (e) { err.textContent = messageDe(e) || mt('enregistrement_impossible'); }
}

export async function mesSupprimerCategorie(id: string): Promise<void> {
  const c: { libelle?: string } = requis('mesCategories')().find((x) => x.id === id) || {};
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_categorie', c.libelle))) return;
  try {
    await requis('mesApi')(`/parametres/categories/${id}`, { method: 'DELETE' });
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('categorie_supprimee'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('suppression_impossible'), 'error'); }
}

export async function mesSupprimerType(id: string): Promise<void> {
  const t: { libelle?: string } = requis('mesTypes')().find((x) => x.id === id) || {};
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_type', t.libelle))) return;
  try {
    await requis('mesApi')(`/parametres/types/${id}`, { method: 'DELETE' });
    await requis('mesRechargerParametres')();
    requis('mesToast')(mt('type_supprime'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('suppression_impossible'), 'error'); }
}
