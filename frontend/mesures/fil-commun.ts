// OASIS — « Mesures d'Application » (CARE) : ce que les trois parties du
// traitement d'une carence partagent — ses types, ses aides, les étapes du fil,
// la section lettrée, la ligne de fiche, la clôture, et la fenêtre qui confirme
// un passage d'étape (ADR-003, 5.c — n° 5.f.122).
//
// `mes-traitement.js` tenait en un fichier de 836 lignes ; converti, il en
// faisait 879, et le garde de taille refuse un fichier du frontend au-delà de
// 600. Il est partagé en trois, sans cycle : ce fichier, que les deux autres
// importent ; `investigation.ts`, qui l'importe ; `traitement.ts`, qui importe
// les deux. Le code est celui de la conversion, déplacé et non réécrit.
import { etat, mt, requis } from './partage';

/** Une pièce jointe, telle que `/upload` la rend. */
export interface Piece { nom?: string; path?: string; size?: number }
interface Enqueteur { nom?: string; prenom?: string; email?: string; contact?: string }
interface Travail { type?: string; resultats?: string; pieces?: Piece[] }
interface Renvoi { renvoye_le?: string; renvoye_par?: string; motif?: string }
/**
 * L'investigation d'une carence. Les trois listes sont tenues pour présentes,
 * comme l'ancien le tenait : il y ajoutait sans vérifier.
 */
export interface Investigation {
  equipe: Enqueteur[]; travaux: Travail[]; autres_texte?: string; autres_pieces: Piece[]; rapport?: string;
  soumise_le?: string; soumise_par?: string; renvois?: Renvoi[];
}
interface PreuvePac { action?: string; intitule?: string; depose_le?: string; commentaire?: string }
/** Le plan d'actions du prestataire, tel que son module le publie. */
interface Pac {
  preuves?: PreuvePac[]; cause_primaire?: string; action_curative?: string; curative_date_prevue?: string;
  actions_correctives?: string; corrective_date_prevue?: string; statut?: string; date_soumission?: string;
  motif_rejet?: string;
}
/** Le traitement d'une carence, tel que `/traitement` le rend — les champs lus d'ici. */
export interface TraitementCare {
  etape?: string; decision?: string; decide_le?: string; decide_par?: string; decision_motif?: string;
  investigation?: Investigation; mesures?: { suivi_statut?: string }[]; cloture_le?: string; classe_le?: string;
  pac?: Pac; pieces?: Piece[]; informations?: string;
}
/** La carence dont le volet est ouvert. */
export interface CarenceCare {
  id: string; classee?: boolean; prestataire_id?: string; origine?: string; origine_libelle?: string;
  reference?: string; titre?: string; prestataire_nom?: string; criticite?: string;
  date_ouverture?: string; date_due_cloture?: string; statut?: string; description?: string;
}
/** Ce que la fenêtre de confirmation reçoit. */
export interface Confirmation {
  titre?: string; depuis?: string; vers?: string; consequence?: string; points?: string[];
  aveu?: string; libelle?: string; classe?: string;
}

export const traitement = (): TraitementCare | undefined => etat().traitement as TraitementCare | undefined;
export const carence = (): CarenceCare | null | undefined => etat().carenceEnCours as CarenceCare | null | undefined;

// L'échappement est celui du socle : `_mesEsc` et `_mesAttr` n'en étaient que
// deux noms.
export const esc = (v: unknown): string => window.oasisEsc(v);
export const icone = (nom: string): string => requis('MES_ICONS')[nom] as string;
export const date = (v: unknown): string => requis('mesDate')(v);
export const chemin = (v: unknown): string => requis('_mesChemin')(v);
export const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;
export const champ = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;

// ══════════════════════════════════════
//  Fil d'avancement du traitement d'une carence
// ══════════════════════════════════════
//
// Quatre étapes. « Suite à donner » va du déclenchement du traitement à la
// décision ; « Investigations » rassemble les preuves qui établissent les
// faits ; « Qualification et Mesures » dit si l'infraction est constituée et
// arrête les sanctions ; « Suivi des Mesures » en suit la mise en œuvre.
// Les quatre étapes ne retiennent que leur clé : le nom se lit dans la langue
// retenue, au moment de l'afficher.
export const MES_ETAPES = [
  { cle: 'suite' }, { cle: 'investigations' }, { cle: 'qualification' }, { cle: 'suivi' },
];
export const mesNomEtape = (cle: string): string => mt(`fil_${cle}`);

// Les trois suites possibles. Classer clôt le traitement ici — la carence
// reste suivie par le plan d'actions de son module d'origine ; les deux autres
// poussent le fil d'un cran.
export const MES_DECISIONS = [
  { cle: 'classer', classe: 'mes-btn-classer-vert' },
  { cle: 'investiguer', classe: 'mes-btn-investiguer' },
  { cle: 'mesures', classe: 'mes-btn-mesure' },
];
export const mesNomDecision = (cle: string): string => mt(`suite_${cle}`);
export const mesAideDecision = (cle: string): string => mt(`suite_${cle}_aide`);

// Les statuts du module d'origine sont des codes de circuit : on les rend
// lisibles ici plutôt que de servir « pac_soumis » à l'agent qui décide.
const MES_STATUTS_ORIGINE: Record<string, string | undefined> = {
  ouverte: 'orig_ouverte', ouvert: 'orig_ouverte',
  pac_soumis: 'orig_pac_soumis', pac_valide: 'orig_pac_valide', pac_rejetee: 'orig_pac_rejetee',
  soldee: 'orig_soldee', cloturee: 'orig_cloturee',
  en_cours: 'orig_en_cours', brouillon: 'orig_brouillon',
};
export const mesStatutOrigine = (v: unknown): string => {
  const code = String(v || '').trim();
  if (!code) return '';
  const cle = MES_STATUTS_ORIGINE[code];
  if (cle) return mt(cle);
  // Un code inconnu se lit quand même : les tirets bas deviennent des espaces.
  return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

// Étape où le traitement en est. L'étape *regardée* peut être antérieure : on
// consulte ce qu'une étape franchie porte sans revenir en arrière.
export const mesEtapeAtteinte = (): string => (traitement() || {}).etape || 'suite';
export const mesRangAtteint = (): number => Math.max(0, MES_ETAPES.findIndex((e) => e.cle === mesEtapeAtteinte()));
export const mesEtapeCourante = (): string => (etat().etapeVue as string | undefined) || mesEtapeAtteinte();

// Section repliable, sur le modèle du formulaire de notification du module
// « Exécution de la Surveillance » : une carte par section, sa lettre d'ordre,
// son titre et son chevron. Tout est déplié à l'ouverture — on vient lire le
// dossier, pas le chercher.
const MES_CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<polyline points="6 9 12 15 18 9"/></svg>';

export const mesSection = (lettre: string, titre: string, corps: string): string => `<div class="mes-section ouverte">
    <div class="mes-section-entete" onclick="this.parentElement.classList.toggle('ouverte')">
        <span class="mes-section-lettre">${esc(lettre)}</span>
        <span class="mes-section-titre">${esc(titre)}</span>
        <span class="mes-section-chevron">${MES_CHEVRON}</span>
    </div>
    <div class="mes-section-corps">${corps}</div></div>`;

export const mesLigneFiche = (t: unknown, v: unknown): string => `<div class="mes-pac-ligne"><dt>${esc(t)}</dt>
    <dd>${v ? esc(v) : '<span class="mes-preuve-vide">—</span>'}</dd></div>`;

export const mesInvestigation = (): Investigation => (traitement() || {}).investigation
  || { equipe: [], travaux: [], autres_texte: '', autres_pieces: [], rapport: '' };

// Une investigation soumise est close : tous ses champs passent en lecture,
// et rien ne s'y ajoute plus.
export const mesInvSoumise = (): boolean => !!mesInvestigation().soumise_le;

// Un traitement clos ne se réécrit plus, à aucune de ses étapes : la carence a
// été classée. Le dossier se consulte.
export const mesTraitementClos = (): boolean => {
  const c: Partial<CarenceCare> = carence() || {};
  const t = traitement() || {};
  return !!(c.classee || t.classe_le);
};
export const mesTraitementModifiable = (): boolean => requis('mesPeutEcrire')() && !mesTraitementClos();

export const mesInvModifiable = (): boolean => mesTraitementModifiable() && !mesInvSoumise();

// ══════════════════════════════════════
//  Formulaire de confirmation d'un passage d'étape
// ══════════════════════════════════════
//
// Une étape franchie ne se rejoue pas : l'investigation se fige, la
// qualification se clôt, les mesures entrent au registre. Le geste demande
// donc d'être voulu, non seulement cliqué — d'où un formulaire plutôt qu'une
// alerte du navigateur : il nomme l'étape quittée et celle atteinte, dit ce
// que l'action entraîne, et n'ouvre son bouton qu'une fois la case cochée.

let MES_CONFIRMATION: ((ok: boolean) => void) | null = null;

export function mesConfirmerEtape(o: Confirmation): Promise<boolean> {
  const el = document.getElementById('mesModalRoot');
  if (!el) return Promise.resolve(false);
  return new Promise((resolve) => {
    MES_CONFIRMATION = resolve;
    const libelleEtape = (cle: string): string => (MES_ETAPES.some((e) => e.cle === cle) ? mesNomEtape(cle) : '');
    const depuis = libelleEtape(o.depuis || mesEtapeCourante());
    const vers = o.vers ? libelleEtape(o.vers) : '';
    el.innerHTML = `
        <div class="mes-modal-fond mes-confirm-fond" onclick="mesConfirmationRepondre(false)">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${esc(o.titre || mt('confirmer_action'))}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone"
                            onclick="mesConfirmationRepondre(false)" aria-label="${esc(mt("annuler"))}" title="${esc(mt("annuler"))}">${icone('close')}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-confirm-fil">
                        <span class="mes-confirm-etape">${esc(depuis)}</span>
                        <span class="mes-confirm-fleche">→</span>
                        <span class="mes-confirm-etape cible">${esc(vers || mt('dossier_clos'))}</span>
                    </div>
                    <p class="mes-confirm-texte">${esc(o.consequence || '')}</p>
                    ${(o.points || []).length ? `<ul class="mes-confirm-points">${
  (o.points as string[]).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
                    <label class="mes-case mes-confirm-case">
                        <input type="checkbox" id="mesConfirmCase"
                               onchange="mesConfirmationCocher(this.checked)">
                        <span>${esc(o.aveu || mt('aveu_action'))}</span>
                    </label>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm"
                            onclick="mesConfirmationRepondre(false)">${mt('annuler')}</button>
                    <button class="btn btn-sm ${esc(o.classe || 'btn-primary')}"
                            id="mesConfirmValider" disabled
                            onclick="mesConfirmationRepondre(true)">${icone('check')} ${
  esc(o.libelle || mt('confirmer'))}</button>
                </div>
            </div>
        </div>`;
    const cases = document.getElementById('mesConfirmCase');
    if (cases) cases.focus();
  });
}

export function mesConfirmationCocher(coche: boolean): void {
  const b = document.getElementById('mesConfirmValider') as HTMLButtonElement | null;
  if (b) b.disabled = !coche;
}

export function mesConfirmationRepondre(ok: unknown): void {
  const el = document.getElementById('mesModalRoot');
  if (el) el.innerHTML = '';
  const resoudre = MES_CONFIRMATION;
  MES_CONFIRMATION = null;
  if (resoudre) resoudre(!!ok);
}

