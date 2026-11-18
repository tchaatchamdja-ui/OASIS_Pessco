// OASIS — « Mesures d'Application » (CARE) : ce que les quatre parties de
// l'étape « Qualification et Mesures » partagent — ses types, ses aides, l'état
// de l'étape, et le relevé de la saisie (ADR-003, 5.c — n° 5.f.123).
//
// `mes-qualification.js` tenait en un fichier de 993 lignes ; converti, il en
// faisait plus de mille, et le garde de taille refuse un fichier du frontend
// au-delà de 600. Il est partagé en quatre, sans cycle : ce fichier, que les
// trois autres importent ; `recours.ts` et `mesures-arretees.ts`, qui
// l'importent ; `qualification.ts`, qui importe les trois. Le code est celui de
// la conversion, déplacé et non réécrit.
import { etat, mt, requis } from './partage';

export interface Piece { nom?: string; path?: string; size?: number }
export interface Membre { nom?: string; prenom?: string; email?: string; contact?: string }
export interface Reunion { date?: string; objet?: string; resultat?: string }
/** Le recours qu'un prestataire forme contre une mesure, et ce que l'instance en décide. */
export interface Recours {
  intente_texte?: string; pieces?: Piece[]; instance_code?: string; membres?: Membre[];
  commentaire?: string; decision?: string; decision_pieces?: Piece[];
}
/** Une mesure telle que la qualification l'arrête. */
export interface MesureQual {
  categorie?: string; type_mesure?: string; date_sanction?: string; portee?: string;
  duree_valeur?: number | string; duree_unite?: string; date_fin?: string; commentaire?: string;
  suivi_requis?: boolean; recours_intente?: boolean; recours?: Recours | null;
  statut_recours?: string; version_precedente?: VersionPrecedente | null;
}
/** Ce que la mesure était avant que le recours ne la fasse modifier. */
export interface VersionPrecedente {
  portee?: string; duree_valeur?: number | string; duree_unite?: string; categorie?: string;
  type_mesure?: string; date_sanction?: string; date_fin?: string; commentaire?: string;
}
/**
 * La qualification d'une carence. Les quatre listes sont tenues pour présentes,
 * comme l'ancien le tenait : il y ajoutait sans vérifier.
 */
export interface Qualification {
  comite_code?: string; membres: Membre[]; reunions: Reunion[];
  infraction_constituee?: boolean; infraction_non_constituee?: boolean;
  renvoi_demande?: boolean; renvoi_motif?: string;
  nature?: string; caracterisation?: string; circonstances?: string;
  mesures: MesureQual[]; pieces: Piece[];
}
/** Le traitement, vu par la qualification — les champs lus d'ici. */
export interface TraitementQual {
  qualification?: Qualification; cloture_le?: string; decision_motif?: string;
  investigation?: { soumise_le?: string; soumise_par?: string; rapport?: string; travaux?: unknown[]; equipe?: unknown[] };
}

export const traitement = (): TraitementQual | undefined => etat().traitement as TraitementQual | undefined;
/** Le traitement, tenu pour présent : l'ancien y écrivait sans vérifier. */
export const traitementPresent = (): TraitementQual => etat().traitement as TraitementQual;

// L'échappement est celui du socle : `_mesEsc` et `_mesAttr` n'en étaient que
// deux noms.
export const esc = (v: unknown): string => window.oasisEsc(v);
export const icone = (nom: string): string => requis('MES_ICONS')[nom] as string;
export const date = (v: unknown): string => requis('mesDate')(v);
export const chemin = (v: unknown): string => requis('_mesChemin')(v);
export const section = (lettre: string, titre: string, corps: string): string => requis('mesSection')(lettre, titre, corps);
export const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;
export const champId = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;

export const mesQualification = (): Qualification => (traitement() || {}).qualification || {
  comite_code: '', membres: [], reunions: [],
  infraction_constituee: false, infraction_non_constituee: false,
  renvoi_demande: false, renvoi_motif: '',
  nature: '', caracterisation: '', circonstances: '',
  mesures: [], pieces: [],
};

// L'étape ne se saisit que tant qu'elle est ouverte. Classée, renvoyée ou
// validée, elle est close : les champs passent en lecture et les trois issues
// ne se rejouent pas. Le rang dit tout — le fil a reculé après un renvoi,
// avancé après une validation ; seule l'étape courante reste modifiable.
export const mesQualClose = (): string => {
  if (requis('mesTraitementClos')()) return mt('q_classee');
  const rang = requis('MES_ETAPES').findIndex((e) => e.cle === 'qualification');
  // Clôturée : les mesures sont arrêtées, aucune n'appelait de suivi, et le
  // dossier s'est fermé ici même plutôt que de passer à l'étape suivante.
  if ((traitement() || {}).cloture_le) return mt('q_cloturee');
  if (requis('mesRangAtteint')() > rang) return mt('q_validee');
  if (requis('mesRangAtteint')() < rang) return mt('q_renvoyee');
  return '';
};

export const mesQualModifiable = (): boolean => requis('mesTraitementModifiable')() && !mesQualClose();

// L'étape porte six sections : la carence, le rapport d'investigation,
// l'instance, la qualification, les mesures et — le cas échéant — les recours.
// Les dérouler d'un seul tenant fait un formulaire qu'on parcourt sans le
// voir. Trois volets les regroupent selon ce qu'on vient y faire : juger,
// sanctionner, ou examiner une contestation.
export const MES_QUAL_VOLETS = [
  { cle: 'infraction' }, { cle: 'mesures' }, { cle: 'recours' },
];
export const mesNomVolet = (cle: string): string => mt(`onglet_${cle}`);

// Y a-t-il des recours à examiner ? Le volet ne s'offre que dans ce cas : un
// onglet vide invite à un travail qui n'existe pas.
export const mesQualARecours = (): boolean => (mesQualification().mesures || []).some((m) => m.recours_intente);

export const mesQualVolet = (): string => {
  const vu = (etat().qualVolet as string | undefined) || 'infraction';
  return vu === 'recours' && !mesQualARecours() ? 'infraction' : vu;
};

// La saisie des recours se relève avec le reste, et se recolle aux mesures par
// leur rang : la section F ne connaît pas d'autre clé.
export function mesCollecterRecours(): Map<number, Recours> {
  const racine = document.getElementById('mesRecoursBlocs');
  if (!racine) return new Map();
  const val = (b: Element, nom: string): string => (b.querySelector<HTMLInputElement>(`[data-champ="${nom}"]`)?.value || '').trim();
  const pieces = (b: Element, genre: string): Piece[] => [...b.querySelectorAll<HTMLElement>(`.mes-recours-pieces[data-genre="${genre}"] .mes-preuve`)]
    .map((r) => ({ nom: r.querySelector('input')?.value || '', path: r.dataset['chemin'] || '' }));
  return new Map([...racine.querySelectorAll<HTMLElement>('.mes-bloc')].map((b) => [Number(b.dataset['rang']), {
    intente_texte: val(b, 'intente_texte'),
    pieces: pieces(b, 'recours'),
    instance_code: val(b, 'instance_code'),
    membres: [...b.querySelectorAll('.mes-recours-membres tbody tr[data-rang]')].map((tr) => ({
      nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
      email: val(tr, 'email'), contact: val(tr, 'contact'),
    })),
    commentaire: val(b, 'commentaire'),
    decision: val(b, 'decision'),
    decision_pieces: pieces(b, 'decision'),
  }]));
}

export function mesCollecterQualification(): Qualification | null {
  // L'étape se lit par volets : celui qui n'est pas affiché n'a pas de champs
  // dans le document. Ce qu'il porte est repris de l'état plutôt que remis à
  // zéro — changer d'onglet ne doit rien effacer.
  const etatQ = mesQualification();
  const surInfraction = !!document.getElementById('mesQualComite');
  const surMesures = !!document.getElementById('mesQualMesures');
  const surRecours = !!document.getElementById('mesRecoursBlocs');
  if (!surInfraction && !surMesures && !surRecours) return null;

  const val = (racine: Element, nom: string): string => (racine.querySelector<HTMLInputElement>(`[data-champ="${nom}"]`)?.value || '');
  const lignes = (sel: string): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(sel)];
  const txt = (id: string): string => champId(id)?.value || '';
  const etatM = etatQ.mesures || [];
  const recours = surRecours ? mesCollecterRecours() : null;

  // Le recours d'une mesure : relevé du volet qui l'affiche, conservé sinon.
  const recoursDe = (m: MesureQual, rang: number): { recours_intente: boolean; recours: Recours | null } => (recours
    ? { recours_intente: !!recours.get(rang), recours: recours.get(rang) || null }
    : { recours_intente: !!m.recours_intente, recours: m.recours || null });

  const mesures: MesureQual[] = surMesures
    ? lignes('#mesQualMesures .mes-bloc').map((b, rang) => {
      const coche = (nom: string): boolean => !!b.querySelector<HTMLInputElement>(`[data-champ="${nom}"]`)?.checked;
      const portee = coche('temporelle') ? 'temporelle'
        : (coche('illimitee') ? 'illimitee' : (coche('sans_objet') ? 'sans_objet' : ''));
      const avant: MesureQual = etatM[rang] || {};
      return {
        categorie: val(b, 'categorie'), type_mesure: val(b, 'type_mesure'),
        date_sanction: val(b, 'date_sanction'), portee,
        suivi_requis: coche('suivi_requis'),
        ...recoursDe(avant, rang),
        // Marques posées par le serveur : elles font l'aller-retour
        // sans être relues du corps de la requête.
        statut_recours: avant.statut_recours || '',
        version_precedente: avant.version_precedente || null,
        // Durée et terme n'ont de sens que pour une sanction temporelle.
        duree_valeur: portee === 'temporelle' ? Number(val(b, 'duree_valeur')) || 0 : 0,
        duree_unite: portee === 'temporelle' ? (val(b, 'duree_unite') || 'jours') : '',
        date_fin: portee === 'temporelle' ? val(b, 'date_fin') : '',
        commentaire: val(b, 'commentaire'),
      };
    })
    : etatM.map((m, rang) => ({ ...m, ...recoursDe(m, rang) }));

  const pieces: Piece[] = surMesures
    ? lignes('#mesQualPieces .mes-preuve').map((r) => ({
      nom: r.querySelector('input')?.value || '', path: r.dataset['chemin'] || '',
    }))
    : (etatQ.pieces || []);

  // Hors du volet « Qualification de l'infraction », l'instance et la
  // qualification restent celles de l'état.
  if (!surInfraction) return { ...etatQ, mesures, pieces };

  const coche = champId('mesQualConstituee');
  return {
    comite_code: (document.getElementById('mesQualComite') as HTMLSelectElement | null)?.value || '',
    membres: lignes('#mesQualMembres tbody tr[data-rang]').map((tr) => ({
      nom: val(tr, 'nom'), prenom: val(tr, 'prenom'),
      email: val(tr, 'email'), contact: val(tr, 'contact'),
    })),
    reunions: lignes('#mesQualReunions .mes-bloc').map((b) => ({
      date: val(b, 'date'), objet: val(b, 'objet'), resultat: val(b, 'resultat'),
    })),
    infraction_constituee: !!(coche && coche.checked),
    infraction_non_constituee: !!champId('mesQualNonConstituee')?.checked,
    renvoi_demande: !!champId('mesQualRenvoi')?.checked,
    renvoi_motif: champId('mesQualRenvoiMotif')?.value || '',
    nature: txt('mesQualNature'),
    caracterisation: txt('mesQualCaracterisation'),
    circonstances: txt('mesQualCirconstances'),
    mesures,
    pieces,
  };
}

export const mesMajQualification = (): void => {
  const saisi = mesCollecterQualification();
  if (saisi) etat().traitement = { ...(traitement() || {}), qualification: saisi };
};

export const mesQualRedessiner = (): void => { requis('mesAfficherSlider')({ anime: false }); };

// Un ajout ou un retrait relève la saisie en cours avant de redessiner : rien
// de ce qui est tapé ne se perd.
export function mesQualModifier(action: (q: Qualification) => void): void {
  mesMajQualification();
  const q = mesQualification();
  action(q);
  traitementPresent().qualification = q;
  mesQualRedessiner();
}

