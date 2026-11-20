// OASIS — « Profils de Risque » (PR) — les Paramètres : l'export et l'import
// du barème, la fenêtre de saisie d'un élément, et les seuils des indices
// (ADR-003, 5.c — n° 5.f.132).
//
// La deuxième partie de `pr-parametres.js`, convertie à la lettre : chaque
// requête part avec le même corps. `champ(id)` lit un champ de la fenêtre comme
// l'ancien le lisait — `document.getElementById(id).value`, qui lève s'il manque.
import type { DonneesErreur } from '../socle/commun';
import type { EntitePr, IndicesPr } from './formes';
import { requis, t } from './partage';

/** Ce que `/indicateurs/import` rend, ou l'échec que le geste en compose. */
export interface RapportImport {
  failed?: boolean; message?: string; errors?: string[];
  added?: number; updated?: number; unchanged?: number; ignored?: number;
  detail?: { sheet?: string; added?: number; updated?: number; unchanged?: number }[];
}

const champ = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;

// ── Un téléchargement passe par une navigation, jamais par un clic fabriqué ──
//
// `oasisTelecharger` mène la fenêtre à l'adresse ; le navigateur reçoit
// `Content-Disposition: attachment` et enregistre le fichier sans quitter la
// page. Le patron qu'elle remplace — `await fetch`, `await blob`, puis une ancre
// fabriquée qu'on clique — **échoue sans bruit**, l'attente du serveur épuisant
// l'activation utilisateur qui autorise l'enregistrement (socle,
// `frontend/socle/utils.ts`).
//
// Il n'y a donc **rien à attendre ici, et rien à lire** : pas de `async`, pas de
// `try`, pas de toast de réussite sur un fichier qu'on n'a pas vu arriver. Le
// nom de la pièce vient de l'en-tête, et un refus est affiché par le navigateur
// en page lisible (`src/telechargement.js`).
export function exportIndicateursExcel(): void {
    window.oasisTelecharger(`${MODULE_API}/indicateurs/export`);
}

// Lecture d'un fichier en base64 (le serveur reçoit du JSON : pas de multipart).
export function fileToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        // `split` rend au moins un élément : `pop` en rend toujours un.
        r.onload = () => resolve(String(r.result).split(',').pop() as string);
        r.onerror = () => reject(new Error('Lecture du fichier impossible'));
        r.readAsDataURL(file);
    });
}

export async function importIndicateursExcel(event: Event): Promise<void> {
    const champ = event.target as HTMLInputElement;
    const file = (champ.files as FileList)[0];
    if (!file) return;
    try {
        const fileB64 = await fileToBase64(file);
        const res = await fetch(`${MODULE_API}/indicateurs/import`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileB64 })
        });
        if (!res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const d = await res.json();
                throw new Error(window.oasisMessageErreur(d as DonneesErreur, res.status, t('import_refuse')));
            } else {
                throw new Error(t('import_format_excel', res.status));
            }
        }
        const data = await res.json().catch(() => ({})) as RapportImport;
        champ.value = '';
        await requis('loadAllData')();
        requis('renderPage')();
        showImportBanner(data);
    } catch (e) {
        champ.value = '';
        showImportBanner({ failed: true, message: (e as Error).message });
    }
}

// Bandeau temporaire : icône de résultat + aperçu des changements
export function showImportBanner(r: RapportImport): void {
    document.querySelectorAll('.pr-import-banner').forEach((b) => b.remove());

    const errors = r.errors || [];
    const state = r.failed ? 'error' : (errors.length ? 'warning' : 'success');
    const ICON: Record<'success' | 'warning' | 'error', string> = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12.5 11 15.5 16.5 9"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    };

    let title: string;
    let body = '';
    if (r.failed) {
        title = 'Importation échouée';
        body = `<div class="pr-import-line">${r.message || 'Erreur inconnue'}</div>`;
    } else {
        const total = (r.added || 0) + (r.updated || 0);
        title = total ? `Importation réussie — ${total} enregistrement(s) modifié(s)` : 'Importation réussie — aucun changement';
        const chips = [
            r.added ? `<span class="pr-chip added">${r.added} ajouté(s)</span>` : '',
            r.updated ? `<span class="pr-chip updated">${r.updated} mis à jour</span>` : '',
            r.unchanged ? `<span class="pr-chip same">${r.unchanged} inchangé(s) — ignoré(s)</span>` : '',
            r.ignored ? `<span class="pr-chip skipped">${r.ignored} rejeté(s)</span>` : '',
        ].join('');
        const perSheet = (r.detail || [])
            .map((d) => `${d.sheet} : +${d.added} / ~${d.updated} / =${d.unchanged}`)
            .join(' · ');
        body = `<div class="pr-import-chips">${chips}</div>`
            + (perSheet ? `<div class="pr-import-line">${perSheet}</div>` : '')
            + (errors.length ? `<div class="pr-import-line pr-import-errors">${errors.slice(0, 4).map(window.escapeHtml).join('<br>')}`
                + (errors.length > 4 ? `<br>… ${errors.length - 4} autre(s)` : '') + '</div>' : '');
    }

    const el = document.createElement('div');
    el.className = `pr-import-banner ${state}`;
    el.innerHTML = `<span class="pr-import-icon">${ICON[state]}</span>
        <div class="pr-import-body"><strong>${title}</strong>${body}</div>
        <button class="pr-import-close" onclick="this.parentNode.remove()">✕</button>`;
    document.body.appendChild(el);

    const delay = state === 'success' ? 6000 : 12000;
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, delay);
}


// ── Entity Modal (shared) ──
export async function openEntityModal(collection: string, itemId?: string): Promise<void> {
    const D = requis('APP_STATE').data!;
    let item: EntitePr | null | undefined = null;
    if (itemId) {
        // La collection se lit par son nom, sous deux graphies, comme l'ancien la lisait.
        const parNom = D as Record<string, EntitePr[] | undefined>;
        const items = parNom[collection] || parNom[collection.replace('_','')] || [];
        item = items.find(i => i.id === itemId);
        if (!item) {
            const apiMap: Record<string, string | undefined> = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
                indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`, indicateurs_complex:`${MODULE_API}/indicateurs-complex`,
                prestataires:'/api/prestataires' };
            try { item = await window.api(`${apiMap[collection]}/${itemId}`) as EntitePr; }
            catch (e) {
                // Le formulaire s'ouvrait vide sur un élément qu'on n'avait pas
                // su lire : l'enregistrer l'aurait remplacé par des champs blancs.
                window.showToast(t('chargement_impossible', (e as Error).message), 'error');
                return;
            }
        }
    }

    let fields = '';
    if (collection === 'domaines') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div></div>`;
    } else if (collection === 'secteurs') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('domain')}</label><select id="eDomaine">${(D.domaines||[]).map(d=>`<option value="${d.id}" ${item?.domaine_id===d.id?'selected':''}>${window.escapeHtml(`${d.code} - ${d.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>
        <div class="form-group"><label>CSN (${t('months')})</label><input id="eCsn" type="number" value="${item?.csn||24}"></div></div>`;
    } else if (collection === 'sous_activites') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${window.escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>`;
    } else if (collection === 'indicateurs_conf') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${s.code}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')} (${t('level1')})</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')} (${t('level2')})</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')} (${t('level3')})</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'indicateurs_perf') {
        fields = `
        <div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')}</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')}</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')}</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'indicateurs_complex') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('code')}</label><input id="eCode" value="${item?.code||''}"></div>
        <div class="form-group"><label>S.A.</label><select id="eSA">${(D.sousActivites||[]).map(s=>`<option value="${s.id}" ${item?.sous_activite_id===s.id?'selected':''}>${window.escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div></div>
        <div class="form-group"><label>${t('label')}</label><textarea id="eLabel" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.label||''}</textarea></div>
        <div class="form-group"><label>${t('criterion1')}</label><textarea id="eC1" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c1||''}</textarea></div>
        <div class="form-group"><label>${t('criterion2')}</label><textarea id="eC2" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c2||''}</textarea></div>
        <div class="form-group"><label>${t('criterion3')}</label><textarea id="eC3" class="auto-grow" rows="1" style="width:100%;resize:vertical;">${item?.c3||''}</textarea></div>`;
    } else if (collection === 'prestataires') {
        fields = `
        <div class="form-row"><div class="form-group"><label>${t('name')}</label><input id="eNom" value="${item?.nom||''}"></div>
        <div class="form-group"><label>${t('trigramme')}</label><input id="eTri" value="${item?.trigramme||''}" maxlength="3"></div></div>
        <div class="form-row"><div class="form-group"><label>${t('sector')}</label><select id="eSecteur">${(D.secteurs||[]).map(s=>`<option value="${s.id}" ${item?.secteur_id===s.id?'selected':''}>${window.escapeHtml(`${s.code} - ${s.nom}`)}</option>`).join('')}</select></div>
        <div class="form-group"><label>${t('domain')}</label><select id="eDomaine">${(D.domaines||[]).map(d=>`<option value="${d.id}" ${item?.domaine_id===d.id?'selected':''}>${d.code}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>${t('contact')}</label><input id="eContact" value="${item?.contact_nom||''}"></div>
        <div class="form-group"><label>${t('telephone')}</label><input id="eTel" value="${item?.contact_tel||''}"></div></div>
        <div class="form-group"><label>${t('email_label')}</label><input id="eEmail" value="${item?.contact_email||''}"></div>
        <hr style="border:none;border-top:1px solid var(--border);margin:0.5rem 0;">
        <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.4rem;">${t('rbs_title')}</div>
        <div class="form-row">
            <div class="form-group"><label>${t('certification_date')}</label>
                <input id="eDateCert" type="date" value="${item?.date_certification||''}"></div>
            <div class="form-group"><label style="display:flex;align-items:center;gap:0.4rem;font-weight:500;">
                <input id="eIsNouveau" type="checkbox" ${item?.is_nouveau?'checked':''} style="margin:0;">
                ${t('new_provider_rbs')}</label></div>
        </div>
        <div class="form-group"><label>${t('rbs_deadline')}</label>
            <input id="eDateButoir" type="date" value="${item?.date_butoir||''}"></div>`;
    }

    requis('showModal')(itemId ? t('edit') : t('add'), fields,
        `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
         ${itemId ? `<button class="btn btn-danger btn-sm" onclick="deleteEntity('${collection}','${itemId}')">${t('delete')}</button>` : ''}
         <button class="btn btn-primary" onclick="saveEntity('${collection}','${itemId||''}')">${t('save')}</button>`, 'modal-lg');
}

export async function saveEntity(collection: string, itemId?: string): Promise<void> {
    const apiMap: Record<string, string | undefined> = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
        indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`,
        indicateurs_complex:`${MODULE_API}/indicateurs-complex`, prestataires:'/api/prestataires' };
    const endpoint = apiMap[collection];

    let data: EntitePr = {};
    if (collection === 'domaines') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, nom: champ('eNom').value };
    } else if (collection === 'secteurs') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, nom: champ('eNom').value,
                 domaine_id: champ('eDomaine').value, csn: parseInt(champ('eCsn').value) || 24 };
    } else if (collection === 'sous_activites') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, nom: champ('eNom').value,
                 secteur_id: champ('eSecteur').value };
    } else if (collection === 'indicateurs_conf') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, label: champ('eLabel').value,
                 c1: champ('eC1').value, c2: champ('eC2').value,
                 c3: champ('eC3').value, secteur_id: champ('eSecteur').value };
    } else if (collection === 'indicateurs_perf') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, label: champ('eLabel').value,
                 c1: champ('eC1').value, c2: champ('eC2').value, c3: champ('eC3').value };
    } else if (collection === 'indicateurs_complex') {
        const code = champ('eCode').value;
        data = { id: itemId || code, code, label: champ('eLabel').value,
                 c1: champ('eC1').value, c2: champ('eC2').value,
                 c3: champ('eC3').value, sous_activite_id: champ('eSA').value };
    } else if (collection === 'prestataires') {
        const dateCert = (document.getElementById('eDateCert') as HTMLInputElement | null)?.value || '';
        const isNouv = (document.getElementById('eIsNouveau') as HTMLInputElement | null)?.checked ? 1 : 0;
        let dateBut = (document.getElementById('eDateButoir') as HTMLInputElement | null)?.value || '';
        if (!dateBut && dateCert) {
            try {
                const base = new Date(dateCert);
                const years = isNouv ? 2 : 1;
                base.setFullYear(base.getFullYear() + years);
                dateBut = base.toISOString().slice(0, 10);
            } catch (e) {}
        }
        data = { nom: champ('eNom').value, trigramme: champ('eTri').value,
                 date_certification: dateCert, is_nouveau: isNouv, date_butoir: dateBut,
                 secteur_id: champ('eSecteur').value, domaine_id: champ('eDomaine').value,
                 contact_nom: champ('eContact').value, contact_tel: champ('eTel').value,
                 contact_email: champ('eEmail').value };
    }

    try {
        if (itemId) await window.api(`${endpoint}/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });
        else await window.api(endpoint as string, { method: 'POST', body: JSON.stringify(data) });
        requis('closeModal')(); await requis('loadAllData')(); requis('renderPage')(); window.showToast('OK');
    } catch (e) { window.showToast((e as Error).message, 'error'); }
}

export async function deleteEntity(collection: string, itemId: string): Promise<void> {
    if (!await requis('oasisConfirmer')(t('confirm_delete'))) return;
    const apiMap: Record<string, string | undefined> = { domaines:'/api/domaines', secteurs:'/api/secteurs', sous_activites:'/api/sous-activites',
        indicateurs_conf:`${MODULE_API}/indicateurs-conf`, indicateurs_perf:`${MODULE_API}/indicateurs-perf`,
        indicateurs_complex:`${MODULE_API}/indicateurs-complex`, prestataires:'/api/prestataires' };
    try {
        await window.api(`${apiMap[collection]}/${itemId}`, { method: 'DELETE' });
        requis('closeModal')(); await requis('loadAllData')(); requis('renderPage')(); window.showToast('OK');
    } catch (e) { window.showToast((e as Error).message, 'error'); }
}

// ── Indices & Seuils ──
export function renderParamIndices(): string {
    const indices: IndicesPr = requis('APP_STATE').data!.indices || {};
    return `
    <div class="page-header"><h2>${t('indices_cycles')}</h2></div>
    <div class="card" style="max-width:600px;">
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('conformity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxConf1" type="number" step="0.01" min="0" max="1" value="${indices.conf1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxConf2" type="number" step="0.01" min="0" max="1" value="${indices.conf2||0.5}"></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('performance')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxPerf1" type="number" step="0.01" min="0" max="1" value="${indices.perf1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxPerf2" type="number" step="0.01" min="0" max="1" value="${indices.perf2||0.5}"></div>
        </div>
        <h4 style="color:var(--primary);margin-bottom:1rem;">${t('complexity')}</h4>
        <div class="form-row">
            <div class="form-group"><label>${t('threshold_high')}</label><input id="idxExpo1" type="number" step="0.01" min="0" max="1" value="${indices.expo1||0.8}"></div>
            <div class="form-group"><label>${t('threshold_low')}</label><input id="idxExpo2" type="number" step="0.01" min="0" max="1" value="${indices.expo2||0.5}"></div>
        </div>
        <button class="btn btn-primary" onclick="saveIndices()">${window.ICONS['check']} ${t('save')}</button>
    </div>`;
}

export async function saveIndices(): Promise<void> {
    const data: IndicesPr = {
        conf1: parseFloat(champ('idxConf1').value),
        conf2: parseFloat(champ('idxConf2').value),
        perf1: parseFloat(champ('idxPerf1').value),
        perf2: parseFloat(champ('idxPerf2').value),
        expo1: parseFloat(champ('idxExpo1').value),
        expo2: parseFloat(champ('idxExpo2').value)
    };
    try {
        await window.api('/api/indices', { method: 'PUT', body: JSON.stringify(data) });
        requis('APP_STATE').data!.indices = data;
        window.showToast('OK');
    } catch (e) { window.showToast((e as Error).message, 'error'); }
}
