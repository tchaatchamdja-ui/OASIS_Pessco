// OASIS — « Mesures d'Application » (CARE) : le traitement d'une carence — le
// fil d'avancement, l'étape « Suite à donner », l'étape « Investigations », et
// la fenêtre qui confirme un passage d'étape (ADR-003, 5.c — n° 5.f.122).
//
// Converti à la lettre depuis `mes-traitement.js` : le balisage est rendu
// caractère pour caractère, chaque requête part avec le même corps, et les
// lectures d'un fichier voisin restent faites au moment de l'appel — les
// `typeof mesActionsQualification === 'function'` compris, qui deviennent des
// lectures sur `window`.
//
// Partagé en trois fichiers pour tenir sous le plafond de 600 lignes du
// frontend : voir `fil-commun.ts`. Celui-ci porte le fil, l'étape « Suite à
// donner » et la barre inférieure.
import { etat, mt, requis } from './partage';
import {
  MES_DECISIONS, MES_ETAPES, carence, champ, chemin, date, esc, icone, messageDe, mesAideDecision,
  mesConfirmerEtape, mesEtapeAtteinte, mesEtapeCourante, mesInvSoumise, mesLigneFiche, mesNomDecision, mesNomEtape,
  mesRangAtteint, mesSection, mesStatutOrigine, mesTraitementModifiable, traitement,
} from './fil-commun';
import type { ConstatationCare, Investigation, Piece, TraitementCare } from './formes';
import { mesActionsInvestigation } from './investigation';

export function mesVoirEtape(cle: string): void {
  const rang = MES_ETAPES.findIndex((e) => e.cle === cle);
  if (rang < 0 || rang > mesRangAtteint()) return;
  mesMajTraitement();
  etat().etapeVue = cle;
  requis('mesAfficherSlider')({ anime: false });
}

// Ce que chaque étape dit du traitement : où il en est, et de quand.
export function mesEtapeInfo(cle: string): string {
  const t = traitement() || {};
  if (cle === 'suite') {
    if (!t.decision) return mt('fil_instruction');
    const d = MES_DECISIONS.find((x) => x.cle === t.decision);
    return mt('fil_decide_le', date(t.decide_le), d ? mesNomDecision(d.cle) : t.decision);
  }
  if (cle === 'investigations') {
    const inv: Partial<Investigation> = (t.investigation || {});
    const n = (inv.travaux || []).length;
    if (inv.soumise_le) {
      return inv.soumise_par
        ? mt('fil_soumise_par', date(inv.soumise_le), inv.soumise_par)
        : mt('fil_soumise_le', date(inv.soumise_le));
    }
    if (!n && !(inv.equipe || []).length) return mt('fil_inv_a_ouvrir');
    return mt('fil_enqueteurs', (inv.equipe || []).length, n);
  }
  if (cle === 'suivi') {
    if (t.cloture_le) return mt('fil_cloture_le', date(t.cloture_le));
    const liste = t.mesures || [];
    if (!liste.length) return mt('fil_aucune_a_suivre');
    const soldees = liste.filter((m) => (m.suivi_statut || requis('mesStatutSuivi')(m)) === 'solde').length;
    return mt('fil_soldees', soldees, liste.length);
  }
  return mt('fil_a_venir');
}

// Barre du fil : les chevrons à gauche, les actions de l'étape à droite.
export function mesFilAvancement(): string {
  const vue = mesEtapeCourante();
  const rang = MES_ETAPES.findIndex((e) => e.cle === mesEtapeAtteinte());
  const atteint = mesRangAtteint();
  const etapes = MES_ETAPES.map((e, i) => {
    const classe = i < rang ? 'done' : (i === rang ? 'current' : '');
    const atteinte = i <= atteint;
    return `<button type="button"
                    class="eval-step mes-proc-step ${classe}${vue === e.cle ? ' selected' : ''}${
  atteinte ? '' : ' verrouillee'}"
                    ${atteinte ? '' : 'disabled'}
                    title="${esc(mesEtapeInfo(e.cle))}"
                    onclick="mesVoirEtape('${esc(e.cle)}')">${esc(mesNomEtape(e.cle))}</button>`;
  }).join('');
  return `
    <div class="mes-proc-barre">
        <div class="eval-steps mes-proc-fil">${etapes}</div>
        <div class="mes-proc-actions">${mesEtatEtape()}${mesActionsEtape()}</div>
    </div>`;
}

// L'état de l'étape regardée, en PDF. Un vrai lien, comme ceux des listes : un
// enregistrement lancé par script serait écarté sans bruit une fois l'attente
// du serveur passée, et le rendu d'un document prend quelques secondes.
// Il précède les actions : il se consulte à tout moment, y compris sur une
// étape close, quand les actions ne s'offrent plus.
export function mesEtatEtape(): string {
  const c = carence();
  if (!c || !etat().traitement) return '';
  const etape = mesEtapeCourante();
  const libelle = MES_ETAPES.some((e) => e.cle === etape) ? mesNomEtape(etape) : '';
  const url = `${requis('MES_API')}/constatations/${encodeURIComponent(c.id)}/etapes/${etape}.pdf`;
  return `<a class="btn btn-sm mes-btn-export" download href="${esc(url)}"
        title="${esc(mt('telecharger_etape', libelle))}"
        >${typeof window.MES_ICONES_ETAT === 'object' ? window.MES_ICONES_ETAT['pdf'] : ''} ${mt('exporter_pdf')}</a>`;
}

// Actions de l'étape regardée. Sur « Suite à donner » : enregistrer ce qui a
// été recueilli, et arrêter la suite — les trois décisions possibles.
export function mesActionsEtape(): string {
  const etape = mesEtapeCourante();
  if (etape === 'investigations') return mesActionsInvestigation();
  if (etape === 'qualification') {
    return typeof window.mesActionsQualification === 'function' ? window.mesActionsQualification() : '';
  }
  if (etape === 'suivi') {
    return typeof window.mesActionsSuivi === 'function' ? window.mesActionsSuivi() : '';
  }
  if (etape !== 'suite') return '';
  const t = traitement() || {};
  if (t.decision) {
    const d = MES_DECISIONS.find((x) => x.cle === t.decision);
    return `<span class="mes-badge cloturee">${esc(d ? mesNomDecision(d.cle) : t.decision)}</span>`;
  }
  // « Enregistrer » vit dans la barre inférieure : la barre du fil ne porte
  // que les décisions, qui font avancer le traitement.
  const boutons: string[] = [];
  if (requis('mesPeutDecider')()) {
    MES_DECISIONS.forEach((d) => boutons.push(`<button class="btn btn-sm ${d.classe}"
            title="${esc(mesAideDecision(d.cle))}"
            onclick="mesPrendreDecision('${d.cle}')">${esc(mesNomDecision(d.cle))}</button>`));
  }
  return boutons.join('');
}

// Section d'ouverture — de quelle carence il s'agit. Elle vient telle que le
// module qui l'a relevée la publie ; rien n'y est modifiable.
export function mesSectionCarence(): string {
  const c = carence();
  if (!c) return '';
  const prest = (etat().data.prestataires || []).find((p) => p.id === c.prestataire_id);
  const source = c.origine === 'CARE' ? (c.origine_libelle || mt('relevee_par'))
    : requis('mesOrigine')(c.origine === 'RAMP' ? 'RAMP' : 'SURV');
  // Deux colonnes pour les repères, qui tiennent sur une ligne chacun. La
  // description, elle, court sur toute la largeur : la serrer sur une demie
  // la rendait illisible.
  return mesSection('A', mt('sec_carence'), `
        <div class="mes-deux-colonnes">
            <dl style="margin:0;">
                ${mesLigneFiche(mt('fiche_reference'), c.reference)}
                ${mesLigneFiche(mt('fiche_objet'), c.titre)}
                ${mesLigneFiche(mt('fiche_prestataire'), (prest && prest.nom) || c.prestataire_nom)}
                ${mesLigneFiche(mt('fiche_source'), source)}
            </dl>
            <dl style="margin:0;">
                ${mesLigneFiche(mt('fiche_criticite'), c.criticite)}
                ${mesLigneFiche(mt('fiche_ouverture'), date(c.date_ouverture))}
                ${mesLigneFiche(mt('fiche_echeance'), date(c.date_due_cloture))}
                ${mesLigneFiche(mt('fiche_statut_origine'), mesStatutOrigine(c.statut))}
            </dl>
        </div>
        <dl style="margin:.4rem 0 0;">${mesLigneFiche(mt('fiche_description'), c.description)}</dl>`);
}

// Section 1 — le plan d'actions soumis par le prestataire, tel que le module
// qui a relevé la carence le publie. Rien n'y est modifiable : c'est la pièce
// du dossier, pas une saisie.
export function mesSectionPac(): string {
  const pac = (traitement() || {}).pac;
  if (!pac) {
    return mesSection('B', mt('sec_pac'),
      `<p class="mes-preuve-vide">${mt('pac_aucun')}</p>`);
  }
  const ligne = mesLigneFiche;
  // Deux colonnes : à gauche ce que l'organisme s'engage à faire, à droite ce
  // qu'il en produit comme preuve.
  const preuves = (pac.preuves || []).map((p) => `<div class="mes-pac-ligne">
        <dt>${esc(p.action === 'curative' ? mt('pac_curative')
    : (p.action === 'corrective' ? mt('pac_corrective_une') : mt('pac_preuve')))}</dt>
        <dd>${esc(p.intitule || '—')}${p.depose_le ? ` · ${esc(date(p.depose_le))}` : ''}
            ${p.commentaire ? `<br><span class="mes-preuve-vide">${esc(p.commentaire)}</span>` : ''}</dd>
    </div>`).join('');
  return mesSection('B', mt('sec_pac'), `<div class="mes-deux-colonnes">
        <section>
            <div class="mes-colonne-titre">${mt('pac_soumis_col')}</div>
            <dl style="margin:0;">
                ${ligne(mt('pac_cause'), pac.cause_primaire)}
                ${ligne(mt('pac_curative'), pac.action_curative)}
                ${ligne(mt('pac_curative_date'), date(pac.curative_date_prevue))}
                ${ligne(mt('pac_corrective'), pac.actions_correctives)}
                ${ligne(mt('pac_corrective_date'), date(pac.corrective_date_prevue))}
                ${ligne(mt('fiche_statut_origine'), mesStatutOrigine(pac.statut))}
                ${ligne(mt('pac_soumis_le'), date(pac.date_soumission))}
                ${pac.motif_rejet ? ligne(mt('pac_motif_rejet'), pac.motif_rejet) : ''}
            </dl>
        </section>
        <section>
            <div class="mes-colonne-titre">${mt('pac_preuves')}</div>
            <dl style="margin:0;">
                ${preuves || `<p class="mes-preuve-vide">${mt('aucune_preuve')}</p>`}
            </dl>
        </section>
    </div>`);
}

// Section 2 — ce que l'autorité a recueilli en plus du plan d'actions.
export function mesSectionInformations(): string {
  const t = traitement() || {};
  const off = mesTraitementModifiable() ? '' : 'disabled';
  const pieces = (t.pieces || []).map((p, i) => `
        <div class="mes-preuve" data-genre="traitement" data-chemin="${esc(p.path || '')}">
            <input class="mes-input" value="${esc(p.nom || '')}"
                   placeholder="${esc(mt('intitule_piece'))}" ${off}>
            ${chemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                href="${esc(chemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}"
                title="${esc(mt('ouvrir'))}">${icone('download')}</a>` : ''}
            ${off ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="${esc(mt('retirer'))}" aria-label="${esc(mt('retirer'))}"
                onclick="mesRetirerPieceTraitement(${i})">${icone('x')}</button>`}
        </div>`).join('');
  // Même partage que le plan d'actions : ce qui est établi à gauche, ce qui
  // l'appuie à droite.
  return mesSection('C', mt('sec_informations'), `<div class="mes-deux-colonnes">
        <div class="mes-champ">
            <label>${mt('infos_label')}</label>
            <textarea class="mes-input" id="mesTrtInfos" rows="6" ${off}
                      placeholder="${esc(mt('infos_exemple'))}">${esc(t.informations || '')}</textarea>
        </div>
        <div class="mes-champ">
            <label>${mt('pieces_jointes')}</label>
            <div id="mesTrtPieces">${pieces || `<div class="mes-preuve-vide">${mt('aucune_piece')}</div>`}</div>
            ${off ? '' : `<input type="file" id="mesTrtFichier" multiple style="display:none;"
                    onchange="mesTeleverserPieceTraitement(this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesTrtFichier').click()">
                    ${icone('add')} ${mt('ajouter_piece')}</button>`}
        </div>
    </div>`);
}

// Section 3 — la décision sur la suite à donner. Elle engage l'autorité : elle
// relève du validateur, et se lit après coup pour tous les autres.
export function mesSectionDecision(): string {
  const t = traitement() || {};
  const prise = !!t.decision;
  const decideur = requis('mesPeutDecider')();
  const choisie = MES_DECISIONS.find((d) => d.cle === t.decision);

  if (prise) {
    const rappel = t.decision === 'classer'
      ? `<p class="mes-note">${mt('classer_rappel')}</p>`
      : '';
    return mesSection('D', mt('sec_decision'), `
            <p><strong>${esc(choisie ? mesNomDecision(choisie.cle) : t.decision)}</strong>
               ${t.decide_le ? `· ${esc(date(t.decide_le))}` : ''}
               ${t.decide_par ? `· ${esc(t.decide_par)}` : ''}</p>
            ${t.decision_motif ? `<p class="mes-pac-ligne" style="display:block;">${esc(t.decision_motif)}</p>` : ''}
            ${rappel}`);
  }
  if (!decideur) {
    return mesSection('D', mt('sec_decision'),
      `<p class="mes-preuve-vide">${mt('decision_aucune')}</p>`);
  }
  // Les trois suites sont portées par la barre du fil, en haut à droite :
  // ce sont les actions de l'étape. Ne reste ici que ce qui les motive.
  return mesSection('D', mt('sec_decision'), `
        <div class="mes-champ">
            <textarea class="mes-input" id="mesTrtMotif" rows="3"
                      placeholder="${esc(mt('decision_motif_exemple'))}"></textarea>
        </div>
        <ul class="mes-decision-aide">
            ${MES_DECISIONS.map((d) => `<li><strong>${esc(mesNomDecision(d.cle))}</strong> — ${
  esc(mesAideDecision(d.cle))}</li>`).join('')}
        </ul>
        <p class="mes-preuve-vide">${mt('suite_en_haut')}</p>`);
}

// Barre inférieure du volet. Elle porte l'enregistrement, à droite, quelle que
// soit l'étape : sans elle, l'étape « Suite à donner » n'avait aucun pied et le
// volet se terminait sur le vide.
export function mesBarreInferieure(_ro: unknown, etape: string): string {
  if (!mesTraitementModifiable()
    || !['suite', 'investigations', 'qualification', 'suivi'].includes(etape)) return '';
  // Un suivi clos — dossier classé, ou clôturé faute de suivi à conduire —
  // ne s'enregistre plus : il se consulte.
  if (etape === 'suivi' && typeof window.mesSuiviClos === 'function' && window.mesSuiviClos()) return '';
  if (etape === 'investigations' && mesInvSoumise()) return '';
  // Une qualification close ne s'enregistre plus : elle se consulte.
  if (etape === 'qualification' && typeof window.mesQualClose === 'function' && window.mesQualClose()) return '';
  // Chaque étape enregistre ce qui lui est propre : les informations
  // recueillies pour la suite à donner, les actes d'enquête, la qualification.
  const geste = ({
    investigations: 'mesEnregistrerInvestigation()',
    qualification: 'mesEnregistrerQualification()',
    suivi: 'mesEnregistrerSuivi()',
  } as Record<string, string | undefined>)[etape] || 'mesEnregistrerTraitement()';
  return `<div class="mes-slider-footer">
        <button class="btn btn-primary btn-sm" onclick="${geste}"
                title="${esc(mt('conserver_infos'))}">${icone('check')} ${mt('enregistrer')}</button>
    </div>`;
}

// Les pièces et le texte saisis vivent dans le DOM tant qu'ils ne sont pas
// enregistrés : on les relève avant tout redessin, comme pour la mesure.
export function mesCollecterTraitement(): { informations: string; pieces: Piece[] } | null {
  const infos = champ('mesTrtInfos');
  if (!infos) return null;
  return {
    informations: infos.value,
    pieces: [...document.querySelectorAll<HTMLElement>('#mesTrtPieces .mes-preuve')].map((r) => ({
      nom: r.querySelector('input')?.value || '',
      path: r.dataset['chemin'] || '',
    })),
  };
}

export const mesMajTraitement = (): void => {
  const saisi = mesCollecterTraitement();
  if (saisi) etat().traitement = { ...(traitement() || {}), ...saisi };
};

export function mesRetirerPieceTraitement(i: number): void {
  mesMajTraitement();
  const t = traitement() || {};
  t.pieces = (t.pieces || []).filter((_, k) => k !== i);
  requis('mesAfficherSlider')({ anime: false });
}

export async function mesTeleverserPieceTraitement(fichiers: FileList | File[] | null): Promise<void> {
  if (!fichiers || !fichiers.length) return;
  mesMajTraitement();
  const t = traitement() || {};
  t.pieces = t.pieces || [];
  for (const f of Array.from(fichiers)) {
    try {
      const corps = new FormData();
      corps.append('file', f);
      const r = await requis('mesApi')('/upload', { method: 'POST', body: corps }) as { filename?: string; path?: string; size?: number };
      t.pieces.push({ nom: r.filename, path: r.path, size: r.size } as Piece);
    } catch (e) { requis('mesToast')(messageDe(e) || mt('depot_impossible'), 'error'); }
  }
  requis('mesAfficherSlider')({ anime: false });
}

export async function mesEnregistrerTraitement(silencieux?: unknown): Promise<boolean> {
  const c = carence();
  if (!c) return false;
  mesMajTraitement();
  const t = traitement() || {};
  try {
    await requis('mesApi')(`/constatations/${encodeURIComponent(c.id)}/traitement`, {
      method: 'PUT',
      body: JSON.stringify({ informations: t.informations || '', pieces: t.pieces || [] }),
    });
    if (!silencieux) requis('mesToast')(mt('informations_enregistrees'));
    return true;
  } catch (e) { requis('mesToast')(messageDe(e) || mt('enregistrement_impossible'), 'error'); return false; }
}

export async function mesPrendreDecision(decision: string): Promise<void> {
  const E = etat();
  const c = carence();
  if (!c) return;
  const choisie: { cle?: string; classe?: string } = MES_DECISIONS.find((d) => d.cle === decision) || {};
  const nomDecision = choisie.cle ? mesNomDecision(choisie.cle) : decision;
  if (!await mesConfirmerEtape({
    titre: nomDecision,
    depuis: 'suite',
    vers: ({ investiguer: 'investigations', mesures: 'qualification' } as Record<string, string | undefined>)[decision] || '',
    consequence: choisie.cle ? mesAideDecision(choisie.cle) : '',
    points: [decision === 'classer' ? mt('classer_consequence') : mt('suite_consequence')],
    aveu: mt('aveu_decision'),
    libelle: nomDecision, classe: choisie.classe || 'btn-primary',
  })) return;
  // Ce qui a été saisi part avec la décision : elle s'appuie dessus.
  if (!await mesEnregistrerTraitement(true)) return;
  const motif = champ('mesTrtMotif')?.value || '';
  try {
    const api = requis('mesApi');
    await api(`/constatations/${encodeURIComponent(c.id)}/decision`, {
      method: 'POST', body: JSON.stringify({ decision, motif }),
    });
    E.traitement = await api(`/constatations/${encodeURIComponent(c.id)}/traitement`) as TraitementCare;
    E.data.constatations = await api('/constatations') as ConstatationCare[];
    // La vue suit l'étape que la décision vient de faire atteindre.
    E.etapeVue = '';
    requis('mesToast')(mt('decision_enregistree', nomDecision));
    requis('mesAfficherSlider')({ anime: false });
    if (E.currentPage === 'critiques') requis('mesRenderPage')();
  } catch (e) { requis('mesToast')(messageDe(e) || mt('decision_impossible'), 'error'); }
}
