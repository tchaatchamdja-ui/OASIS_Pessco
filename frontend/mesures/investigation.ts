// OASIS — « Mesures d'Application » (CARE) : l'étape « Investigations » du
// traitement d'une carence (ADR-003, 5.c — n° 5.f.122). Partie de
// `mes-traitement.js` ; voir `fil-commun.ts` pour le partage en trois.
import { etat, mt, requis } from './partage';
import {
  carence, champ, chemin, date, esc, icone, messageDe, mesConfirmerEtape, mesInvestigation,
  mesInvModifiable, mesInvSoumise, mesSection, mesTraitementClos, mesTraitementModifiable, traitement,
} from './fil-commun';
import type { ConstatationCare, Investigation, Piece, TraitementCare } from './formes';

// ══════════════════════════════════════
//  Étape « Investigations »
// ══════════════════════════════════════
//
// Rassembler les preuves matérielles et documentaires — témoignages, dossiers,
// relevés — pour établir les faits. Quatre sections : qui a enquêté, ce qui a
// été fait, ce qui a été collecté par ailleurs, et le rapport qui en tire
// l'analyse et les recommandations.

// Liste de pièces, réutilisée par les trois endroits qui en portent : un
// travail d'investigation, les autres éléments collectés, et le formulaire de
// l'étape précédente.
export function mesPiecesHtml(cle: string, liste: Piece[] | undefined, off: string): string {
  const lignes = (liste || []).map((p, i) => `
        <div class="mes-preuve" data-chemin="${esc(p.path || '')}">
            <input class="mes-input" value="${esc(p.nom || '')}"
                   placeholder="${esc(mt('intitule_piece'))}" ${off}>
            ${chemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${esc(chemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${esc(mt('ouvrir'))}">${icone('download')}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}"
                onclick="mesInvRetirerPiece('${cle}',${i})">${icone('x')}</button>`}
        </div>`).join('');
  return `<div id="mesInvPieces_${cle}">${lignes || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
        ${off ? '' : `<input type="file" id="mesInvFichier_${cle}" multiple style="display:none;"
                onchange="mesInvTeleverser('${cle}', this.files)">
            <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                    onclick="document.getElementById('mesInvFichier_${cle}').click()">
                ${icone('add')} ${mt('ajouter_piece')}</button>`}`;
}

// Ce que l'instance décisionnelle a demandé en renvoyant la carence. L'équipe
// doit le lire avant de reprendre : c'est la commande qui lui est faite.
export function mesRenvoisInvestigation(): string {
  const renvois = (mesInvestigation().renvois || []);
  if (!renvois.length) return '';
  return renvois.slice().reverse().map((r) => `
        <div class="mes-note mes-note-renvoi">
            <strong>${mt('renvoyee_complement')}</strong>
            — ${esc(date(r.renvoye_le))}${r.renvoye_par ? ` · ${esc(r.renvoye_par)}` : ''}
            ${r.motif ? `<div style="margin-top:.3rem;white-space:pre-wrap;">${esc(r.motif)}</div>` : ''}
        </div>`).join('');
}

// Section A — qui a mené l'investigation.
export function mesSectionEquipe(): string {
  const inv = mesInvestigation();
  const off = mesInvModifiable() ? '' : 'disabled';
  const lignes = (inv.equipe || []).map((p, i) => `
        <tr data-rang="${i}">
            <td><input class="mes-input" data-champ="nom" value="${esc(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${esc(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${esc(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${esc(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}" onclick="mesInvRetirerEnqueteur(${i})">${icone('x')}</button>`}</td>
        </tr>`).join('');
  return mesSection('A', mt('sec_equipe'), `
        <div class="mes-table-wrap">
            <table class="mes-table" id="mesInvEquipe">
                <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
  mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                <tbody>${lignes || `<tr><td colspan="5" class="mes-preuve-vide">${
  mt('aucun_enqueteur')}</td></tr>`}</tbody>
            </table>
        </div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterEnqueteur()">${icone('add')} ${mt('ajouter_enqueteur')}</button>`}`);
}

// Section B — les travaux menés, autant de blocs que de besoin. Le type choisi
// tient lieu de titre du bloc.
export function mesSectionTravaux(): string {
  const inv = mesInvestigation();
  const off = mesInvModifiable() ? '' : 'disabled';
  const types = requis('mesTypesInvestigation')();
  const blocs = (inv.travaux || []).map((t, i) => {
    const titre = (types.find((x) => x.code === t.type) || {} as { libelle?: string }).libelle || mt('investigation');
    return `<div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${esc(titre)}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer_bloc'))}" aria-label="${esc(mt('retirer_bloc'))}"
                    onclick="mesInvRetirerTravail(${i})">${icone('x')}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-champ">
                    <label>${mt('type_investigation')}</label>
                    <select class="mes-select" data-champ="type" ${off} onchange="mesInvMajTitre(${i}, this.value)">
                        <option value="">—</option>
                        ${types.map((x) => `<option value="${esc(x.code)}"
                            ${t.type === x.code ? 'selected' : ''}>${esc(x.libelle)}</option>`).join('')}
                    </select>
                </div>
                <div class="mes-champ">
                    <label>${mt('resultats')}</label>
                    <textarea class="mes-input" data-champ="resultats" rows="4" ${off}
                              placeholder="${esc(mt('resultat_exemple'))}">${esc(t.resultats || '')}</textarea>
                </div>
                <div class="mes-champ">
                    <label>${mt('elements_preuve')}</label>
                    ${mesPiecesHtml(`travail${i}`, t.pieces, off)}
                </div>
            </div>
        </div>`;
  }).join('');
  return mesSection('B', mt('sec_investigations'), `
        <div id="mesInvTravaux">${blocs || `<p class="mes-preuve-vide">${mt('aucune_investigation')}</p>`}</div>
        ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.5rem;"
            onclick="mesInvAjouterTravail()">${icone('add')} ${mt('ajouter_investigation')}</button>`}
        ${types.length ? '' : `<p class="mes-note">${mt('aucun_type_inv_param')}</p>`}`);
}

// Section C — ce qui a été recueilli hors des travaux ci-dessus.
export function mesSectionAutresElements(): string {
  const inv = mesInvestigation();
  const off = mesInvModifiable() ? '' : 'disabled';
  return mesSection('C', mt('sec_autres'), `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>${mt('elements_recueillis')}</label>
            <textarea class="mes-input" id="mesInvAutres" rows="6" ${off}
                      placeholder="${esc(mt('autres_exemple'))}">${esc(inv.autres_texte || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>${mt('pieces_jointes')}</label>
            ${mesPiecesHtml('autres', inv.autres_pieces, off)}
        </div>
    </div>`);
}

// Section D — le rapport sur le cas.
export function mesSectionRapport(): string {
  const inv = mesInvestigation();
  const off = mesInvModifiable() ? '' : 'disabled';
  return mesSection('D', mt('sec_rapport'), `
        <div class="mes-champ">
            <label>${mt('rapport_cas')}</label>
            <textarea class="mes-input" id="mesInvRapport" rows="10" ${off}
                      placeholder="${esc(mt('rapport_exemple'))}"
                      >${esc(inv.rapport || '')}</textarea>
        </div>`);
}

// La saisie vit dans le DOM tant qu'elle n'est pas enregistrée : on la relève
// avant tout redessin, comme pour la mesure et le traitement.
export function mesCollecterInvestigation(): Investigation | null {
  const t = document.getElementById('mesInvRapport') as HTMLTextAreaElement | null;
  if (!t) return null;
  const pieces = (cle: string): Piece[] => [...document.querySelectorAll<HTMLElement>(`#mesInvPieces_${cle} .mes-preuve`)]
    .map((r) => ({ nom: r.querySelector('input')?.value || '', path: r.dataset['chemin'] || '' }));
  const val = (racine: Element, nom: string): string => (racine.querySelector<HTMLInputElement>(`[data-champ="${nom}"]`)?.value || '');
  return {
    equipe: [...document.querySelectorAll('#mesInvEquipe tbody tr[data-rang]')].map((tr) => ({
      nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
      email: val(tr, 'email'), contact: val(tr, 'contact'),
    })),
    travaux: [...document.querySelectorAll('#mesInvTravaux .mes-bloc')].map((b, i) => ({
      type: val(b, 'type'), resultats: val(b, 'resultats'), pieces: pieces(`travail${i}`),
    })),
    autres_texte: champ('mesInvAutres')?.value || '',
    autres_pieces: pieces('autres'),
    rapport: t.value,
  };
}

const mesMajInvestigation = (): void => {
  const saisi = mesCollecterInvestigation();
  if (saisi) etat().traitement = { ...(traitement() || {}), investigation: saisi };
};

const mesRedessinerInvestigation = (): void => { requis('mesAfficherSlider')({ anime: false }); };

/** Le traitement, tenu pour présent : l'ancien y écrivait sans vérifier. */
const traitementPresent = (): TraitementCare => etat().traitement as TraitementCare;

export function mesInvAjouterEnqueteur(): void {
  mesMajInvestigation();
  mesInvestigation().equipe.push({ nom: '', prenom: '', email: '', contact: '' });
  mesRedessinerInvestigation();
}
export function mesInvRetirerEnqueteur(i: number): void {
  mesMajInvestigation();
  const inv = mesInvestigation();
  inv.equipe = inv.equipe.filter((_, k) => k !== i);
  traitementPresent().investigation = inv;
  mesRedessinerInvestigation();
}
export function mesInvAjouterTravail(): void {
  mesMajInvestigation();
  const types = requis('mesTypesInvestigation')();
  mesInvestigation().travaux.push({ type: (types[0] || {} as { code?: string }).code || '', resultats: '', pieces: [] });
  mesRedessinerInvestigation();
}
export function mesInvRetirerTravail(i: number): void {
  mesMajInvestigation();
  const inv = mesInvestigation();
  inv.travaux = inv.travaux.filter((_, k) => k !== i);
  traitementPresent().investigation = inv;
  mesRedessinerInvestigation();
}
// Le titre du bloc suit le type retenu : il se met à jour sans redessiner tout
// le volet, pour ne pas interrompre la saisie en cours dans le bloc voisin.
export function mesInvMajTitre(i: number, code: string): void {
  const bloc = document.querySelectorAll('#mesInvTravaux .mes-bloc')[i];
  const titre = bloc && bloc.querySelector('.mes-bloc-titre');
  if (!titre) return;
  const t = requis('mesTypesInvestigation')().find((x) => x.code === code);
  titre.textContent = (t && t.libelle) || mt('investigation');
}

export function mesInvRetirerPiece(cle: string, i: number): void {
  mesMajInvestigation();
  const inv = mesInvestigation();
  if (cle === 'autres') inv.autres_pieces = inv.autres_pieces.filter((_, k) => k !== i);
  else {
    const rang = Number(String(cle).replace('travail', ''));
    const t = inv.travaux[rang];
    if (t) t.pieces = (t.pieces || []).filter((_, k) => k !== i);
  }
  traitementPresent().investigation = inv;
  mesRedessinerInvestigation();
}

export async function mesInvTeleverser(cle: string, fichiers: FileList | File[] | null): Promise<void> {
  if (!fichiers || !fichiers.length) return;
  mesMajInvestigation();
  const inv = mesInvestigation();
  // La cible porte ses pièces sous l'une ou l'autre clé : l'investigation sous
  // `autres_pieces`, un travail sous `pieces`.
  const cible = (cle === 'autres' ? inv
    : inv.travaux[Number(String(cle).replace('travail', ''))]) as Record<string, Piece[] | undefined> | undefined;
  if (!cible) return;
  const clef = cle === 'autres' ? 'autres_pieces' : 'pieces';
  cible[clef] = cible[clef] || [];
  for (const f of Array.from(fichiers)) {
    try {
      const corps = new FormData();
      corps.append('file', f);
      const r = await requis('mesApi')('/upload', { method: 'POST', body: corps }) as { filename?: string; path?: string; size?: number };
      (cible[clef] as Piece[]).push({ nom: r.filename, path: r.path, size: r.size } as Piece);
    } catch (e) { requis('mesToast')(messageDe(e) || mt('depot_impossible'), 'error'); }
  }
  traitementPresent().investigation = inv;
  mesRedessinerInvestigation();
}

// Actions de l'étape « Investigations », à l'extrême droite du fil : soumettre
// clôt l'enquête et pousse le traitement à l'étape suivante.
export function mesActionsInvestigation(): string {
  const inv = mesInvestigation();
  if (inv.soumise_le) {
    return `<span class="mes-badge cloturee"
            title="${esc(inv.soumise_par
    ? mt('fil_soumise_par', date(inv.soumise_le), inv.soumise_par)
    : mt('fil_soumise_le', date(inv.soumise_le)))}">${mt('investigation_soumise')}</span>`;
  }
  if (!requis('mesPeutDecider')() || mesTraitementClos()) return '';
  return `<button class="btn btn-sm mes-btn-mesure"
        title="${esc(mt('clore_investigation'))}"
        onclick="mesSoumettreInvestigation()">${icone('check')} ${mt('soumettre')}</button>`;
}

export async function mesSoumettreInvestigation(): Promise<void> {
  const E = etat();
  const c = carence();
  if (!c) return;
  if (!await mesConfirmerEtape({
    titre: mt('soumettre_investigation'),
    depuis: 'investigations', vers: 'qualification',
    consequence: mt('inv_consequence'),
    points: [mt('inv_detail1'), mt('inv_detail2')],
    aveu: mt('aveu_investigation'),
    libelle: mt('soumettre'), classe: 'mes-btn-mesure',
  })) return;
  // Ce qui est saisi part avant la soumission : elle le fige.
  mesMajInvestigation();
  try {
    const api = requis('mesApi');
    await api(`/constatations/${encodeURIComponent(c.id)}/investigation`, {
      method: 'PUT', body: JSON.stringify(mesInvestigation()),
    });
    await api(`/constatations/${encodeURIComponent(c.id)}/investigation/soumettre`, { method: 'POST' });
    E.traitement = await api(`/constatations/${encodeURIComponent(c.id)}/traitement`) as TraitementCare;
    E.etapeVue = '';
    E.data.constatations = await api('/constatations') as ConstatationCare[];
    requis('mesToast')(mt('investigation_soumise'));
    requis('mesAfficherSlider')({ anime: false });
    if (E.currentPage === 'critiques') requis('mesRenderPage')();
  } catch (e) { requis('mesToast')(messageDe(e) || mt('soumission_impossible'), 'error'); }
}

export async function mesEnregistrerInvestigation(): Promise<void> {
  const c = carence();
  if (!c) return;
  mesMajInvestigation();
  try {
    await requis('mesApi')(`/constatations/${encodeURIComponent(c.id)}/investigation`, {
      method: 'PUT', body: JSON.stringify(mesInvestigation()),
    });
    requis('mesToast')(mt('investigation_enregistree'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('enregistrement_impossible'), 'error'); }
}

