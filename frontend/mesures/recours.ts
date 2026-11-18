// OASIS — « Mesures d'Application » (CARE) : l'examen des recours, section F
// de l'étape « Qualification et Mesures » (ADR-003, 5.c — n° 5.f.123). Partie
// de `mes-qualification.js` ; voir `qualification-commun.ts` pour le partage.
import { etat, mt, requis } from './partage';
import {
  champId, chemin, date, esc, icone, messageDe, mesMajQualification, mesQualification,
  mesQualModifiable, mesQualModifier, mesQualRedessiner, section, traitementPresent,
} from './qualification-commun';
import type { MesureQual, Piece, Recours, VersionPrecedente } from './qualification-commun';

// ══════════════════════════════════════
//  Saisie : relevé, ajouts, retraits
// ══════════════════════════════════════

// ── Section F — l'examen des recours ──
// Une carence revenue du suivi porte les mesures que le prestataire conteste.
// Chacune ouvre un bloc : ce qu'elle impose, ce que le recours lui oppose, et
// ce que l'instance en décide.
const MES_DECISIONS_RECOURS: Record<string, string> = {
  maintenir: 'rec_maintenir', modifier: 'rec_modifier', annuler: 'rec_annuler',
};

export function mesBlocRecours(m: MesureQual, i: number): string {
  const off = mesQualModifiable() ? '' : 'disabled';
  const ro = !!off;
  const r: Recours = m.recours || {};
  const comites = requis('mesComites')();
  const fichiers = (genre: string, liste: Piece[] | undefined): string => `
        <div class="mes-recours-pieces" data-genre="${genre}">${
  (liste || []).map((pj, k) => `
            <div class="mes-preuve" data-chemin="${esc(pj.path || '')}">
                <input class="mes-input" value="${esc(pj.nom || '')}"
                       placeholder="${esc(mt('intitule_piece'))}" ${off}>
                ${chemin(pj.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                    href="${esc(chemin(pj.path))}?nom=${encodeURIComponent(pj.nom || '')}"
                    title="${esc(mt('ouvrir'))}">${icone('download')}</a>` : ''}
                ${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}"
                    onclick="mesRecoursRetirerPiece(${i}, '${genre}', ${k})">${icone('x')}</button>`}
            </div>`).join('') || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
        ${ro ? '' : `<input type="file" id="mesRecoursFichier_${i}_${genre}" multiple style="display:none;"
                onchange="mesRecoursTeleverser(${i}, '${genre}', this.files)">
            <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                    onclick="document.getElementById('mesRecoursFichier_${i}_${genre}').click()">
                ${icone('add')} ${mt('ajouter_piece')}</button>`}`;

  const membres = (r.membres || []).map((p, k) => `
        <tr data-rang="${k}">
            <td><input class="mes-input" data-champ="nom" value="${esc(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${esc(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${esc(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${esc(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}" onclick="mesRecoursRetirerMembre(${i}, ${k})">${icone('x')}</button>`}</td>
        </tr>`).join('');

  return `<div class="mes-bloc" data-rang="${i}">
        <div class="mes-bloc-entete">
            <span class="mes-bloc-titre">${esc(requis('mesLibelleCategorie')(m.categorie) || mt('mesure'))}</span>
            ${m.statut_recours === 'annulee' ? `<span class="mes-badge annulee">${mt('st_annulee')}</span>` : ''}
            ${m.statut_recours === 'modifiee' ? `<span class="mes-badge notifiee">${mt('st_modifiee')}</span>` : ''}
        </div>
        <div class="mes-bloc-corps">
            <div class="mes-paire">
                <div class="mes-champ">
                    <label>${mt('categorie_mesure')}</label>
                    <div class="mes-lecture">${esc(requis('mesLibelleCategorie')(m.categorie) || '—')}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('type_mesure')}</label>
                    <div class="mes-lecture">${esc(requis('mesLibelleType')(m.type_mesure) || '—')}</div>
                </div>
            </div>
            <div class="mes-champ">
                <label>${mt('fiche_desc_sanction')}</label>
                <div class="mes-lecture">${m.commentaire ? esc(m.commentaire)
    : '<span class="mes-preuve-vide">—</span>'}</div>
            </div>
            <div class="mes-trois">
                <div class="mes-champ">
                    <label>${mt('fiche_date_sanction')}</label>
                    <div class="mes-lecture">${esc(date(m.date_sanction))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('col_echeance')}</label>
                    <div class="mes-lecture">${esc(date(m.date_fin))}</div>
                </div>
                <div class="mes-champ">
                    <label>${mt('fiche_date_fin')}</label>
                    <div class="mes-lecture">${esc(date(m.date_fin))}</div>
                </div>
            </div>

            <div class="mes-bloc-bande">${mt('objet_recours')}</div>
            <div class="mes-champ">
                <label>${mt('recours_intente')}</label>
                <textarea class="mes-input" data-champ="intente_texte" rows="3" ${off}
                          placeholder="${esc(mt('recours_exemple'))}"
                    >${esc(r.intente_texte || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('pieces_recours')}</label>
                ${fichiers('recours', r.pieces)}
            </div>

            <div class="mes-bloc-bande">${mt('examen_recours')}</div>
            <div class="mes-champ">
                <label>${mt('instance_recours')}</label>
                <select class="mes-select" data-champ="instance_code" ${off}>
                    <option value="">—</option>
                    ${comites.map((c) => `<option value="${esc(c.code)}"
                        ${r.instance_code === c.code ? 'selected' : ''}>${esc(c.libelle)}</option>`).join('')}
                </select>
            </div>
            <div class="mes-champ">
                <label>${mt('membres_recours')}</label>
                <div class="mes-table-wrap">
                    <table class="mes-table mes-table-claire mes-recours-membres">
                        <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
  mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                        <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">${
  mt('aucun_membre')}</td></tr>`}</tbody>
                    </table>
                </div>
                ${ro ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                    onclick="mesRecoursAjouterMembre(${i})">${icone('add')} ${mt('ajouter_membre')}</button>`}
            </div>
            <div class="mes-champ">
                <label>${mt('commentaire_recours')}</label>
                <textarea class="mes-input" data-champ="commentaire" rows="3" ${off}
                          placeholder="${esc(mt('commentaire_recours_exemple'))}">${esc(r.commentaire || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('decision_recours')}</label>
                <select class="mes-select" data-champ="decision" ${off}
                        onchange="mesRecoursDecision(${i}, this.value)">
                    <option value="">—</option>
                    ${Object.entries(MES_DECISIONS_RECOURS).map(([cle, clef]) => `<option value="${cle}"
                        ${r.decision === cle ? 'selected' : ''}>${esc(mt(clef))}</option>`).join('')}
                </select>
                ${r.decision === 'modifier' ? `<p class="mes-note">${mt('rec_note_modifier')}</p>` : ''}
                ${r.decision === 'annuler' ? `<p class="mes-note">${mt('rec_note_annuler')}</p>` : ''}
            </div>
            <div class="mes-champ" style="margin-bottom:0;">
                <label>${mt('pieces_decision')}</label>
                ${fichiers('decision', r.decision_pieces)}
            </div>
        </div>
    </div>`;
}

export function mesSectionRecours(): string {
  const q = mesQualification();
  const contestees = (q.mesures || [])
    .map((m, i) => ({ m, i })).filter((x) => x.m.recours_intente);
  if (!contestees.length) return '';
  return section('F', mt('onglet_recours'), `
        <p class="mes-note">Le prestataire conteste ${contestees.length} mesure(s). L’instance
           examine chaque recours et en décide : maintenir, modifier ou annuler la mesure.</p>
        <div id="mesRecoursBlocs">${contestees.map((x) => mesBlocRecours(x.m, x.i)).join('')}</div>`);
}

const mesRecoursModifier = (i: number, action: (r: Recours) => void): void => mesQualModifier((q) => {
  const m = q.mesures[i];
  if (!m) return;
  m.recours = m.recours || {};
  action(m.recours);
});

export const mesRecoursAjouterMembre = (i: number): void => mesRecoursModifier(i, (r) => {
  r.membres = (r.membres || []).concat([{ nom: '', prenom: '', email: '', contact: '' }]);
});
export const mesRecoursRetirerMembre = (i: number, k: number): void => mesRecoursModifier(i, (r) => {
  r.membres = (r.membres || []).filter((_, n) => n !== k);
});
export const mesRecoursRetirerPiece = (i: number, genre: string, k: number): void => mesRecoursModifier(i, (r) => {
  const cle = genre === 'decision' ? 'decision_pieces' : 'pieces';
  r[cle] = (r[cle] || []).filter((_, n) => n !== k);
});
// La décision redessine : elle change ce que le bloc de mesure laisse écrire,
// et l'aide qui l'accompagne.
export const mesRecoursDecision = (i: number, valeur: string): void => mesRecoursModifier(i, (r) => { r.decision = valeur; });

export async function mesRecoursTeleverser(i: number, genre: string, fichiers: FileList | File[] | null): Promise<void> {
  if (!fichiers || !fichiers.length) return;
  mesMajQualification();
  const q = mesQualification();
  const m = q.mesures[i];
  if (!m) return;
  m.recours = m.recours || {};
  const cle = genre === 'decision' ? 'decision_pieces' : 'pieces';
  m.recours[cle] = m.recours[cle] || [];
  for (const f of Array.from(fichiers)) {
    try {
      const corps = new FormData();
      corps.append('file', f);
      const rep = await requis('mesApi')('/upload', { method: 'POST', body: corps }) as { filename?: string; path?: string; size?: number };
      (m.recours[cle] as Piece[]).push({ nom: rep.filename, path: rep.path, size: rep.size } as Piece);
    } catch (e) { requis('mesToast')(messageDe(e) || mt('depot_impossible'), 'error'); }
  }
  traitementPresent().qualification = q;
  mesQualRedessiner();
}

