// OASIS — « Mesures d'Application » (CARE) : l'étape « Qualification et
// Mesures » (ADR-003, 5.c — n° 5.f.123).
//
// L'instance décisionnelle siège sur la carence : elle lit l'investigation,
// consigne ses réunions, dit si l'infraction est constituée, et arrête le cas
// échéant les mesures d'application.
//
// Converti à la lettre depuis `mes-qualification.js` : le balisage est rendu
// caractère pour caractère, chaque requête part avec le même corps. La phrase
// des recours écrite en français — « Le prestataire conteste… » — l'est
// encore : la conversion ne corrige rien.
//
// Partagé en quatre fichiers pour tenir sous le plafond de 600 lignes du
// frontend : voir `qualification-commun.ts`. Celui-ci porte les volets, les
// sections B à D, les bascules et les issues de l'étape.
import { etat, mt, requis } from './partage';
import type { Confirmation } from './fil-commun';
import {
  champId, chemin, date, esc, icone, messageDe, mesMajQualification, mesNomVolet, mesQualARecours,
  mesQualClose, mesQualification, mesQualModifiable, mesQualModifier, mesQualRedessiner, mesQualVolet,
  MES_QUAL_VOLETS, section, traitement, traitementPresent,
} from './qualification-commun';
import type { ConstatationCare, Investigation, TraitementCare } from './formes';
import { mesSectionMesuresArretees } from './mesures-arretees';
import { mesSectionRecours } from './recours';

// Changer de volet relève d'abord la saisie en cours : passer aux mesures ne
// doit pas perdre ce qui vient d'être tapé à la qualification.
export function mesQualVoirVolet(cle: string): void {
  mesMajQualification();
  etat().qualVolet = cle;
  mesQualRedessiner();
}

export function mesQualOnglets(): string {
  const vu = mesQualVolet();
  const visibles = MES_QUAL_VOLETS.filter((v) => v.cle !== 'recours' || mesQualARecours());
  return `<div class="mes-sous-onglets" role="tablist">${visibles.map((v) => `
        <button type="button" role="tab" class="mes-sous-onglet${vu === v.cle ? ' actif' : ''}"
                aria-selected="${vu === v.cle}"
                onclick="mesQualVoirVolet('${esc(v.cle)}')">${esc(mesNomVolet(v.cle))}${
  v.cle === 'recours' ? ` <span class="mes-sous-onglet-compte">${
    (mesQualification().mesures || []).filter((m) => m.recours_intente).length
  }</span>` : ''}</button>`).join('')}</div>`;
}

// Le corps de l'étape : les onglets, puis les sections du volet regardé.
export function mesQualCorps(): string {
  const vu = mesQualVolet();
  const sections = vu === 'mesures' ? mesSectionMesuresArretees()
    : (vu === 'recours' ? mesSectionRecours()
      : [requis('mesSectionCarence')(), mesSectionRapportInvestigation(),
        mesSectionInstance(), mesSectionQualification()].join(''));
  return `${mesQualOnglets()}<div class="mes-sous-volet">${sections}</div>`;
}

// ── Section B — le rapport d'investigation ──
// Il est repris tel que l'investigation l'a laissé, et le PDF donne
// l'investigation entière : équipe, travaux, éléments collectés, synthèse.
export function mesSectionRapportInvestigation(): string {
  const t = traitement() || {};
  const inv: Partial<Investigation> = t.investigation || {};
  const c: Partial<ConstatationCare> = etat().carenceEnCours || {};
  // La suite à donner peut mener droit ici : « Prendre des mesures » saute
  // l'investigation. La section le dit plutôt que d'offrir un rapport vide
  // et un PDF qui n'a rien à rendre.
  const menee = !!(inv.soumise_le || inv.rapport
    || (inv.travaux || []).length || (inv.equipe || []).length);
  if (!menee) {
    return section('B', mt('sec_rapport_inv'), `
            <p class="mes-preuve-vide">${mt('aucune_inv_menee')}</p>
            ${t.decision_motif ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
                <label>${mt('motif_decision')}</label>
                <div class="mes-lecture">${esc(t.decision_motif)}</div>
            </div>` : ''}`);
  }
  const lien = `${requis('MES_API')}/constatations/${encodeURIComponent(c.id || '')}/rapport-investigation.pdf`;
  return section('B', mt('sec_rapport_inv'), `
        <div class="mes-champ">
            <label>${mt('resultat_investigation')}</label>
            <div class="mes-lecture">${inv.rapport ? esc(inv.rapport)
    : `<span class="mes-preuve-vide">${mt('aucun_rapport')}</span>`}</div>
        </div>
        <div class="mes-pac-ligne">
            <dt>${mt('investigation_soumise')}</dt>
            <dd>${inv.soumise_le ? `${esc(date(inv.soumise_le))}${inv.soumise_par
    ? ` · ${esc(inv.soumise_par)}` : ''}` : '<span class="mes-preuve-vide">—</span>'}</dd>
        </div>
        <a class="btn btn-outline btn-sm" style="margin-top:.6rem;" target="_blank" rel="noopener"
           href="${esc(lien)}">${icone('download')} ${mt('rapport_inv_pdf')}</a>
        <p class="mes-preuve-vide" style="margin-top:.3rem;">${mt('rapport_inv_pdf_aide')}</p>`);
}

// ── Section C — l'instance décisionnelle ──
export function mesSectionInstance(): string {
  const q = mesQualification();
  const off = mesQualModifiable() ? '' : 'disabled';
  const comites = requis('mesComites')();

  const membres = (q.membres || []).map((p, i) => `
        <tr data-rang="${i}">
            <td><input class="mes-input" data-champ="nom" value="${esc(p.nom || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="prenom" value="${esc(p.prenom || '')}" ${off}></td>
            <td><input class="mes-input" type="email" data-champ="email" value="${esc(p.email || '')}" ${off}></td>
            <td><input class="mes-input" data-champ="contact" value="${esc(p.contact || '')}" ${off}></td>
            <td class="mes-actions">${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone"
                title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}" onclick="mesQualRetirerMembre(${i})">${icone('x')}</button>`}</td>
        </tr>`).join('');

  return section('C', mt('sec_instance'), `
        <div class="mes-champ">
            <label>${mt('nom_instance')}</label>
            <select class="mes-select" id="mesQualComite" ${off}>
                <option value="">—</option>
                ${comites.map((c) => `<option value="${esc(c.code)}"
                    ${q.comite_code === c.code ? 'selected' : ''}>${esc(c.libelle)}</option>`).join('')}
            </select>
            ${comites.length ? '' : `<p class="mes-note">${mt('aucun_comite_param')}</p>`}
        </div>
        <div class="mes-champ" style="margin-bottom:0;">
            <label>${mt('membres_instance')}</label>
            <div class="mes-table-wrap">
                <table class="mes-table mes-table-claire" id="mesQualMembres">
                    <thead><tr><th>${mt('col_nom')}</th><th>${mt('col_prenom')}</th><th>${
  mt('col_email')}</th><th>${mt('col_contact')}</th><th></th></tr></thead>
                    <tbody>${membres || `<tr><td colspan="5" class="mes-preuve-vide">${
  mt('aucun_membre')}</td></tr>`}</tbody>
                </table>
            </div>
            ${off ? '' : `<button class="btn btn-outline btn-sm" style="margin-top:.4rem;"
                onclick="mesQualAjouterMembre()">${icone('add')} ${mt('ajouter_membre')}</button>`}
        </div>`);
}

// ── Section D — la qualification ──
export function mesSectionQualification(): string {
  const q = mesQualification();
  const off = mesQualModifiable() ? '' : 'disabled';
  const constituee = !!q.infraction_constituee;

  const nonConstituee = !!q.infraction_non_constituee;
  const renvoi = !!q.renvoi_demande;

  // Les réunions de l'instance : ce que chaque séance a produit. Autant de
  // blocs que de séances tenues.
  const reunions = (q.reunions || []).map((r, i) => `
        <div class="mes-bloc" data-rang="${i}">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${r.date ? esc(date(r.date)) : mt('reunion')}${
  r.objet ? ` — ${esc(r.objet)}` : ''}</span>
                ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer_reunion'))}" aria-label="${esc(mt('retirer_reunion'))}"
                    onclick="mesQualRetirerReunion(${i})">${icone('x')}</button>`}
            </div>
            <div class="mes-bloc-corps">
                <div class="mes-paire">
                    <div class="mes-champ">
                        <label>${mt('date_reunion')}</label>
                        <input type="date" class="mes-input" data-champ="date" value="${esc(r.date || '')}" ${off}>
                    </div>
                    <div class="mes-champ">
                        <label>${mt('objet')}</label>
                        <input class="mes-input" data-champ="objet" value="${esc(r.objet || '')}"
                               placeholder="${esc(mt('objet_reunion_exemple'))}" ${off}>
                    </div>
                </div>
                <div class="mes-champ" style="margin-bottom:0;">
                    <label>${mt('resultat_reunion')}</label>
                    <textarea class="mes-input" data-champ="resultat" rows="3" ${off}
                              placeholder="${esc(mt('resultat_reunion_exemple'))}">${esc(r.resultat || '')}</textarea>
                </div>
            </div>
        </div>`).join('');

  // Les deux cases disent la même décision par ses deux faces : cocher l'une
  // décoche l'autre. Tant qu'aucune n'est cochée, la qualification n'est pas
  // arrêtée.
  return section('D', mt('onglet_infraction'), `
        <div id="mesQualReunions">${reunions
    || `<p class="mes-preuve-vide">${mt('aucune_reunion')}</p>`}</div>
        ${off ? '' : `<div class="mes-actions-rang" style="margin-bottom:.9rem;">
            <button class="btn btn-outline btn-sm" onclick="mesQualAjouterReunion()">
                ${icone('add')} ${mt('ajouter_reunion')}</button>
            <button class="btn btn-outline btn-sm" onclick="mesEnregistrerQualification()">
                ${icone('check')} ${mt('enregistrer')}</button>
        </div>`}
        <div class="mes-cases-exclusives">
            <label class="mes-case">
                <input type="checkbox" id="mesQualConstituee" ${constituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerInfraction(this.checked)">
                <span>${mt('infraction_constituee')}</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualNonConstituee" ${nonConstituee ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerNonInfraction(this.checked)">
                <span>${mt('infraction_non_constituee')}</span>
            </label>
            <label class="mes-case">
                <input type="checkbox" id="mesQualRenvoi" ${renvoi ? 'checked' : ''} ${off}
                       onchange="mesQualBasculerRenvoi(this.checked)">
                <span>${mt('renvoyer_complement')}</span>
            </label>
        </div>
        ${renvoi ? `<div class="mes-champ" style="margin-top:.6rem;margin-bottom:0;">
            <label>${mt('inv_complementaires')}</label>
            <textarea class="mes-input" id="mesQualRenvoiMotif" rows="4" ${off}
                      placeholder="${esc(mt('inv_complementaires_exemple'))}">${esc(q.renvoi_motif || '')}</textarea>
        </div>` : ''}
        ${constituee ? `
        <div class="mes-champ" style="margin-top:.6rem;">
            <label>${mt('nature_infraction')}</label>
            <input class="mes-input" id="mesQualNature" value="${esc(q.nature || '')}" ${off}
                   placeholder="${esc(mt('nature_exemple'))}">
        </div>
        <div class="mes-deux-colonnes">
            <div class="mes-champ">
                <label>${mt('caracterisation')}</label>
                <textarea class="mes-input" id="mesQualCaracterisation" rows="5" ${off}
                          placeholder="${esc(mt('caracterisation_exemple'))}">${esc(q.caracterisation || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('circonstances')}</label>
                <textarea class="mes-input" id="mesQualCirconstances" rows="5" ${off}
                          placeholder="${esc(mt('circonstances_exemple'))}">${esc(q.circonstances || '')}</textarea>
            </div>
        </div>` : ''}`);
}

export const mesQualAjouterMembre = (): void => mesQualModifier((q) => { q.membres.push({ nom: '', prenom: '', email: '', contact: '' }); });
export const mesQualRetirerMembre = (i: number): void => mesQualModifier((q) => { q.membres = q.membres.filter((_, k) => k !== i); });
export const mesQualAjouterReunion = (): void => mesQualModifier((q) => { q.reunions.push({ date: '', objet: '', resultat: '' }); });
export const mesQualRetirerReunion = (i: number): void => mesQualModifier((q) => { q.reunions = q.reunions.filter((_, k) => k !== i); });
// Cocher « Infraction constituée » ouvre les trois champs de qualification et
// la section des mesures ; la décocher les referme.
// Les trois faces d'une même décision : cocher l'une décoche les deux autres.
export const mesQualBasculerInfraction = (coche: boolean): void => mesQualModifier((q) => {
  q.infraction_constituee = !!coche;
  if (coche) { q.infraction_non_constituee = false; q.renvoi_demande = false; }
});
export const mesQualBasculerNonInfraction = (coche: boolean): void => mesQualModifier((q) => {
  q.infraction_non_constituee = !!coche;
  if (coche) { q.infraction_constituee = false; q.renvoi_demande = false; }
});
export const mesQualBasculerRenvoi = (coche: boolean): void => mesQualModifier((q) => {
  q.renvoi_demande = !!coche;
  if (coche) { q.infraction_constituee = false; q.infraction_non_constituee = false; }
});

// Actions de l'étape, à l'extrême droite du fil. Chacune n'est offerte que si
// la case qui la justifie est cochée : on ne renvoie pas sans l'avoir demandé,
// on ne classe pas une infraction constituée, on ne suit pas ce qui ne l'est
// pas.
export function mesActionsQualification(): string {
  const q = mesQualification();
  // L'étape est close : ses trois issues ne se rejouent pas. On la consulte,
  // et le badge dit ce qui en a été fait.
  const close = mesQualClose();
  if (close) {
    return `<span class="mes-badge cloturee">${esc(mt('q_badge_close', close))}</span>`;
  }
  if (!requis('mesPeutDecider')()) return '';
  const mesures = q.mesures || [];
  const suiviAttendu = mesures.some((m) => m.suivi_requis);
  const bouton = (actif: boolean, classe: string, aide: string, geste: string, libelle: string): string => `<button class="btn btn-sm ${classe}"
        ${actif ? '' : 'disabled'} title="${esc(aide)}"
        onclick="${geste}">${esc(libelle)}</button>`;
  return [
    bouton(!!q.renvoi_demande, 'mes-btn-investiguer',
      mt('q_aide_renvoyer'), 'mesQualRenvoyer()', mt('renvoyer')),
    bouton(!!q.infraction_non_constituee, 'mes-btn-classer-vert',
      mt('q_aide_classer'), 'mesQualClasser()', mt('classer')),
    bouton(!!q.infraction_constituee, 'mes-btn-mesure',
      mt('q_aide_valider'), 'mesQualSuivi()', mt('valider')),
    // Clôture directe : elle ne s'offre que si aucune des mesures arrêtées
    // n'appelle le suivi de sa mise en œuvre. Une seule qui le demande, et
    // le dossier doit passer par l'étape de suivi.
    bouton(!!q.infraction_constituee && !!mesures.length && !suiviAttendu, 'btn-outline',
      !q.infraction_constituee
        ? mt('q_cocher_constituee')
        : (!mesures.length
          ? mt('q_rien_a_cloturer')
          : (suiviAttendu ? mt('q_suivi_requis') : mt('q_aide_cloturer'))),
      'mesQualCloturer()', mt('cloturer')),
  ].join('');
}

// Les trois issues enregistrent d'abord ce qui est saisi : la décision s'appuie
// dessus, et le serveur relit la qualification pour vérifier la case cochée.
export async function mesQualIssue(cheminIssue: string, confirmation: Confirmation, fait: string): Promise<void> {
  const E = etat();
  const c = E.carenceEnCours;
  if (!c) return;
  if (!await requis('mesConfirmerEtape')(confirmation)) return;
  mesMajQualification();
  try {
    const api = requis('mesApi');
    await api(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
      method: 'PUT', body: JSON.stringify(mesQualification()),
    });
    await api(`/constatations/${encodeURIComponent(c.id)}/qualification/${cheminIssue}`, { method: 'POST' });
    E.traitement = await api(`/constatations/${encodeURIComponent(c.id)}/traitement`) as TraitementCare;
    E.etapeVue = '';
    E.data.constatations = await api('/constatations') as ConstatationCare[];
    requis('mesToast')(fait);
    requis('mesAfficherSlider')({ anime: false });
    if (E.currentPage === 'critiques') requis('mesRenderPage')();
  } catch (e) { requis('mesToast')(messageDe(e) || mt('operation_impossible'), 'error'); }
}

export const mesQualRenvoyer = (): Promise<void> => mesQualIssue('renvoyer', {
  titre: mt('q_titre_renvoyer'),
  depuis: 'qualification', vers: 'investigations',
  consequence: mt('q_cons_renvoyer'),
  points: [mt('q_pt_renvoyer1'), mt('q_pt_renvoyer2')],
  aveu: mt('q_aveu_renvoyer'),
  libelle: mt('renvoyer'), classe: 'mes-btn-investiguer',
}, mt('q_toast_renvoyer'));

export const mesQualClasser = (): Promise<void> => mesQualIssue('classer', {
  titre: mt('q_titre_classer'),
  depuis: 'qualification', vers: '',
  consequence: mt('q_cons_classer'),
  points: [mt('q_pt_classer')],
  aveu: mt('q_aveu_classer'),
  libelle: mt('classer'), classe: 'mes-btn-classer-vert',
}, mt('q_toast_classer'));

export const mesQualSuivi = (): Promise<void> => mesQualIssue('suivi', {
  titre: mt('q_titre_valider'),
  depuis: 'qualification', vers: 'suivi',
  consequence: mt('q_cons_valider'),
  points: [mt('q_pt_valider1'), mt('q_pt_valider2')],
  aveu: mt('q_aveu_valider'),
  libelle: mt('valider'), classe: 'mes-btn-mesure',
}, mt('q_toast_valider'));

export const mesQualCloturer = (): Promise<void> => mesQualIssue('cloturer', {
  titre: mt('q_titre_cloturer'),
  depuis: 'qualification', vers: '',
  consequence: mt('q_cons_cloturer'),
  points: [mt('q_pt_cloturer1'), mt('q_pt_cloturer2')],
  aveu: mt('q_aveu_cloturer'),
  libelle: mt('cloturer'), classe: 'btn-outline',
}, mt('q_toast_cloturer'));

export async function mesEnregistrerQualification(): Promise<void> {
  const c = etat().carenceEnCours;
  if (!c) return;
  mesMajQualification();
  try {
    await requis('mesApi')(`/constatations/${encodeURIComponent(c.id)}/qualification`, {
      method: 'PUT', body: JSON.stringify(mesQualification()),
    });
    requis('mesToast')(mt('qualification_enregistree'));
  } catch (e) { requis('mesToast')(messageDe(e) || mt('enregistrement_impossible'), 'error'); }
}
