// OASIS — « Profils de Risque » (PR) — la bibliothèque documentaire
// (ADR-003, 5.c — n° 5.f.130).
//
// Converti à la lettre depuis `pr-bibliotheque.js` : le balisage est rendu
// caractère pour caractère, chaque requête part avec le même corps. Les noms de
// la coquille (`pr-shell.js`) et de `pr-parametres.js` — encore en JavaScript —
// se lisent sur la page au moment de l'appel, comme l'ancien les lisait par
// leur nom ; ceux du socle, sur `window`, où il les pose.
import type { DonneesErreur } from '../socle/commun';
import { requis, t } from './partage';

// ══════════════════════════════════════
//  BIBLIOTHEQUE (Change 7: file picker workflow)
// ══════════════════════════════════════
// ── Le droit que la route oppose, et non le rôle du portail ──
//
// Cette page gardait ses deux gestes sur `APP_STATE.user.role ===
// 'Administrateur'` — le rôle M1, dérivé du rôle portail. Or les routes
// opposent le **privilège du module** dans l'espace « PLAN » : `CONTRIBUTEUR`
// pour déposer, `GESTIONNAIRE` pour retirer. `pr-shell.js` le dit en propres
// termes : « le rôle portail (M1) ne sert plus qu'aux écrans d'administration
// de l'AAC ».
//
// Deux autorités distinctes, qui divergent **dans les deux sens** :
//
//   · le privilège par défaut est `LECTEUR` — un administrateur à qui l'on n'a
//     rien accordé dans « Gestion des Droits » voyait les deux boutons et
//     recevait un 403 en les employant. C'est le cas courant, non un cas limite.
//   · un compte AAC ou inspecteur à qui l'on a accordé `GESTIONNAIRE` est
//     `Evaluateur` au sens M1 : la route l'autorisait à retirer, et **aucun
//     bouton ne le lui offrait**. Un droit accordé et injoignable.
//
// La lecture reproduit celle de la route au caractère près : `prPrivilegeOn('')`
// rend le privilège **de base**, et c'est lui que `effectivePrivilege` rend
// quand la route n'a ni domaine ni secteur à opposer. Lire le meilleur
// privilège tous secteurs confondus (`prMeilleurPriv`) rouvrirait l'écart dans
// un sens : gestionnaire d'un seul secteur, le bouton paraîtrait, la route
// refuserait.
export function renderBibliotheque(): string {
    // L'ancien lisait l'état sans vérifier : `!` le dit, et la lecture qui suit
    // lève de même s'il manquait.
    const D = requis('APP_STATE').data!;
    const docs = D.documents || [];
    const priv = requis('prPrivilegeOn')('');
    const peutDeposer = PR_PRIV_CONTRIB.includes(priv);
    const peutRetirer = priv === 'GESTIONNAIRE';

    return `
    <div class="page-header">
        <h2>${t('library')}</h2>
        ${peutDeposer ? `
        <button class="btn btn-primary btn-sm" onclick="triggerFileUpload()">${window.ICONS['upload']} ${t('upload')}</button>
        <input type="file" id="docFileInput" style="display:none" onchange="handleDocFileSelected(event)">` : ''}
    </div>
    <div class="table-container">
        <table class="data-table">
            <thead><tr><th>${t('name')}</th><th>Type</th><th>Taille</th><th>${t('date')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${docs.map(d => `<tr>
                <td>${window.escapeHtml(d.nom)}</td><td>${window.escapeHtml(d.type || '-')}</td>
                <td>${d.taille ? (d.taille/1024).toFixed(1)+' Ko' : '-'}</td>
                <td class="date-cell">${window.formatDate(d.date_upload)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="downloadDoc('${d.id}')" title="${t('download')}" aria-label="${t('download')}">${window.ICONS['download']}</button>
                    ${peutRetirer ? `<button class="btn-icon danger" onclick="deleteDoc('${d.id}')" aria-label="${t("delete")}" title="${t("delete")}">${window.ICONS['trash']}</button>` : ''}
                </td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center">${t('no_document')}</td></tr>`}</tbody>
        </table>
    </div>`;
}

export function triggerFileUpload(): void {
    document.getElementById('docFileInput')?.click();
}

// Limite alignée sur celle du serveur (le base64 gonfle le corps d'environ 1/3)
export const DOC_MAX_BYTES = 3_500_000;

export function handleDocFileSelected(event: Event): void {
    const champ = event.target as HTMLInputElement;
    const file = (champ.files as FileList)[0];
    if (!file) return;
    if (file.size > DOC_MAX_BYTES) {
        window.showToast(t('file_too_large', file.name, (file.size / 1048576).toFixed(1), (DOC_MAX_BYTES / 1048576).toFixed(1)), 'error');
        champ.value = '';
        return;
    }
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    // Le nom vient du **fichier choisi**, non de l'application : posé en clair
    // dans un attribut, un guillemet le refermait et ce qui suivait devenait du
    // balisage. C'est le même défaut que celui corrigé dans `downloadDoc` plus
    // bas, à ceci près qu'il porte ici sur une valeur que l'agent ne compose
    // pas lui-même. Les trois valeurs sont échappées — « le guillemet non
    // échappé dans un attribut le refermait », dit le socle.
    requis('showModal')(t('upload'), `
        <div class="form-group"><label>${t('file_name')}</label><input id="docName" type="text" value="${window.escapeHtml(baseName)}"></div>
        <div class="form-group"><label>Type</label><input id="docType" type="text" value="${window.escapeHtml(ext)}"></div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.5rem;">${window.escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)</div>
    `, `<button class="btn btn-outline" onclick="closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="uploadDocWithFile()">${t('save')}</button>`);

    window._pendingDocFile = file;
}

export async function uploadDocWithFile(): Promise<void> {
    const nom = (document.getElementById('docName') as HTMLInputElement).value.trim();
    const type = (document.getElementById('docType') as HTMLInputElement).value.trim();
    const file = window._pendingDocFile;
    if (!nom) { window.showToast(t('name_required'), 'error'); return; }
    if (!file) { window.showToast(t('no_file_selected'), 'error'); return; }
    const btn = document.querySelector<HTMLButtonElement>('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = t('televersement_en_cours'); }
    try {
        // Le serveur reçoit du JSON : le fichier est transmis en base64.
        const fileB64 = await requis('fileToBase64')(file);
        const res = await fetch('/api/documents', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, type, mime: file.type || '', fileB64 })
        });
        if (!res.ok) {
            // Le corps peut ne pas être du JSON (413 renvoyé par le body-parser)
            const d = await res.json().catch(() => ({})) as DonneesErreur;
            // La borne en mégaoctets dit plus que le code seul : elle reste ici.
            throw new Error(
                res.status === 413 || d.error === 'fichier_trop_volumineux'
                    ? t('fichier_trop_volumineux_max', (DOC_MAX_BYTES / 1048576).toFixed(1))
                    : window.oasisMessageErreur(d, res.status, t('televersement_impossible'))
            );
        }
        window._pendingDocFile = null;
        const input = document.getElementById('docFileInput') as HTMLInputElement | null;
        if (input) input.value = '';
        requis('closeModal')();
        await requis('loadAllData')();
        requis('renderPage')();
        window.showToast(t('file_uploaded', nom));
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = t('save'); }
        window.showToast((e as Error).message, 'error');
    }
}

export async function deleteDoc(id: string): Promise<void> {
    if (!await requis('oasisConfirmer')(t('confirm_delete'))) return;
    try { await window.api(`/api/documents/${id}`, { method: 'DELETE' }); await requis('loadAllData')(); requis('renderPage')(); } catch (e) { window.showToast((e as Error).message, 'error'); }
}

// ── Le téléchargement d'une pièce : une vraie ancre, rien d'attendu ──
//
// Ce geste a porté deux défauts et un commentaire faux, et les trois valent
// d'être dits ensemble.
//
// 1. Le nom du document voyageait **dans l'attribut `onclick`** : « Rapport
//    d'audit » rendait le bouton inopérant à la première apostrophe, et un nom
//    composé pour cela y aurait glissé du code. Il se retrouve ici, par son
//    identifiant.
// 2. `Authorization: Bearer ${token}` reposait sur `pr_token`, que **rien
//    n'écrit** — résidu du portage PESSCO. C'est la session en cookie qui
//    authentifie.
// 3. Le commentaire précédent affirmait qu'une ancre « détachée du document
//    **et** cliquée après un `await` ne télécharge rien ». Contre-essayé le
//    5 novembre 2026 en la détachant de nouveau : *le fichier arrive quand
//    même.* Les deux conditions avaient été jointes à tort.
//
// Seule la seconde porte, et elle porte sur la **durée** : l'attente du serveur
// épuise l'activation utilisateur qui autorise l'enregistrement — un rendu de
// PDF de quelques secondes l'a montré sur CARE, et 122 octets ne le montrent
// pas. C'est pourquoi aucune ronde ne l'avait vu, et pourquoi le geste ne
// **fabrique plus rien** : `oasisTelecharger` mène la fenêtre à l'adresse, le
// navigateur enregistre la pièce sous le nom que porte l'en-tête, et un refus
// s'y affiche en page lisible (`src/telechargement.js`).
export function downloadDoc(id: string): void {
    window.oasisTelecharger(`/api/documents/${id}/download`);
}
