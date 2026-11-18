// OASIS — « Mesures d'Application » (CARE) : états exportables, historique
// d'une carence, et mesures prises sur elle (ADR-003, 5.c — n° 5.f.121).
//
// Deux services rendus aux deux listes du module : sortir ce que l'écran
// montre — classeur ou document — et rouvrir le fil d'un dossier, daté et
// signé, sans quitter la liste.
//
// Converti à la lettre depuis `mes-etats.js` : le balisage est rendu caractère
// pour caractère. Les deux libellés écrits en français — « Mesures prises sur
// cette carence », « Ouvrir la table des Mesures » — le sont encore : la
// conversion ne corrige rien.
import { etat, mt, requis } from './partage';

// ══════════════════════════════════════
//  États exportables
// ══════════════════════════════════════
// L'export reprend les critères de l'écran : on sort ce qu'on regarde, non la
// totalité de la base. Le classeur se télécharge, le document s'ouvre dans un
// onglet — c'est la façon dont chacun se consulte.

export const MES_ICONES_ETAT: Record<string, string> = {
  pdf: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    + '<polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>'
    + '<line x1="8" y1="17" x2="13" y2="17"/></svg>',
  excel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>'
    + '<line x1="9" y1="9" x2="9" y2="21"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
};

/** Les filtres de l'écran — ceux que les deux exports reprennent. */
type Filtres = Record<string, string | undefined>;
const filtres = (): Filtres => etat().filtres as Filtres;

export const mesParametresCarences = (): string => {
  const F = filtres();
  return new URLSearchParams(Object.entries({
    origine: F['crit_origine'] || '', statut: F['crit_statut'] || '',
    prestataire: F['crit_prest'] || '', recherche: F['crit_recherche'] || '',
  }).filter((x) => x[1])).toString();
};

export const mesParametresMesures = (): string => {
  const F = filtres();
  return new URLSearchParams(Object.entries({
    categorie: F['mes_categorie'] || '', suivi: F['mes_statut'] || '',
    prestataire: F['mes_prest'] || '', recherche: F['mes_recherche'] || '',
    carence: F['mes_carence'] || '',
  }).filter((x) => x[1])).toString();
};

// Deux liens de même facture : le classeur pour retraiter, le document pour
// transmettre. Ce sont de vrais liens, non des téléchargements lancés par
// script : un navigateur écarte sans bruit un enregistrement dont le geste de
// l'utilisateur n'est plus « frais », et l'attente du serveur suffit à
// l'épuiser — le rendu d'un PDF prend quelques secondes. Un lien n'a pas cette
// fragilité, et la réponse porte « Content-Disposition: attachment », qui dit
// au navigateur d'enregistrer plutôt que d'ouvrir.
//
// Chaque base nomme sa fabrique. Elle la nommait par une **chaîne**, cherchée
// sur `window` : le module se relisait par la page, et ses deux fabriques n'y
// étaient posées que pour lui (ADR-003, n° 5.f.125). La table porte désormais
// les fonctions elles-mêmes.
export const MES_EXPORTS: Record<string, (() => string) | undefined> = {
  constatations: mesParametresCarences,
  mesures: mesParametresMesures,
};

export function mesUrlExport(base: string, format: string): string {
  // Une base inconnue ne nomme rien, et l'adresse part sans paramètres.
  const fabrique = MES_EXPORTS[base];
  const requete = fabrique ? fabrique() : '';
  return `${requis('MES_API')}/${base}/export.${format}${requete ? `?${requete}` : ''}`;
}

const esc = (v: unknown): string => window.oasisEsc(v);
const icone = (nom: string): string => requis('MES_ICONS')[nom] as string;
const messageDe = (e: unknown): string | undefined => (e as { message?: string }).message;

export function mesBoutonsExport(base: string): string {
  const lien = (format: string, ic: string, libelle: string, aide: string): string => `<a class="btn btn-sm mes-btn-export" download
        data-export="${esc(base)}" data-format="${format}"
        href="${esc(mesUrlExport(base, format))}"
        title="${esc(aide)}">${ic} ${libelle}</a>`;
  return `<div class="mes-exports">
        ${lien('xlsx', MES_ICONES_ETAT['excel'] as string, mt('exporter_excel'), mt('excel_aide'))}
        ${lien('pdf', MES_ICONES_ETAT['pdf'] as string, mt('exporter_pdf'), mt('pdf_aide'))}
    </div>`;
}

// La recherche ne redessine que le corps de la table : sans cela, l'adresse
// des liens resterait celle d'avant la frappe.
export function mesMajLiensExport(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-export]').forEach((a) => {
    a.href = mesUrlExport(a.dataset['export'] as string, a.dataset['format'] as string);
  });
}

// ══════════════════════════════════════
//  Historique d'une carence
// ══════════════════════════════════════
// Le fil du traitement, daté et signé. Une section par étape, et sous chacune
// ce qui s'y est passé. Ce qui n'est pas advenu reste visible, en attente : on
// lit d'un coup d'œil où en est le dossier et ce qu'il reste à faire.

const MES_HISTO_ETAPES = ['suite', 'investigations', 'qualification', 'suivi'];

/** Un jalon du fil : daté, libellé, signé, et éventuellement détaillé. */
interface Jalon { date: string; libelle: string; acteur: string; detail: string; alerte: boolean }
interface EtapeHisto { id: string; titre: string; sous: { nom: string; jalons: Jalon[] }[] }

/** Une mesure, telle que le registre ou la qualification la portent — les champs lus d'ici. */
interface MesureHisto {
  reference?: string; categorie?: string; type_mesure?: string; description?: string;
  date_creation?: string; created_by?: string; constatation_id?: string;
  date_sanction?: string; date_emission?: string; date_echeance?: string;
  portee?: string; duree_valeur?: number | string; duree_unite?: string;
  suivi_commentaire?: string;
  recours_intente?: boolean; recours?: { decision?: string; commentaire?: string };
}
/** Le traitement d'une carence, tel que `/traitement` le rend — les champs lus d'ici. */
interface Traitement {
  etape?: string; mesures?: MesureHisto[];
  date_creation?: string; created_by?: string;
  decide_le?: string; decide_par?: string; decision?: string; decision_motif?: string;
  investigation?: {
    equipe?: unknown[]; travaux?: unknown[]; soumise_le?: string; soumise_par?: string;
    renvois?: { renvoye_le?: string; renvoye_par?: string; motif?: string }[];
  };
  qualification?: {
    membres?: unknown[]; reunions?: { date?: string; objet?: string; resultat?: string }[];
    infraction_constituee?: boolean; infraction_non_constituee?: boolean; nature?: string;
    mesures?: MesureHisto[];
  };
  qualifie_le?: string; qualifie_par?: string; classe_le?: string; classe_par?: string;
  recours_ouvert_le?: string; recours_ouvert_par?: string;
  suivi?: { maj_le?: string; maj_par?: string };
  cloture_le?: string; cloture_par?: string;
}

// Les jalons se composent par `&&` : une condition fausse donne `false`, `0`
// ou `''`, que le filtre écarte. Le type le dit, plutôt que de le taire. La
// garde couvre aussi le champ qu'elle teste — `(inv.equipe || []).length &&
// … inv.equipe.length` —, ce que TypeScript ne voit pas à travers `||` : les
// transtypages qui suivent l'écrivent, sans rien changer au code exécuté.
type Peut<T> = T | false | 0 | '' | null | undefined;
const garder = <T>(l: Peut<T>[]): T[] => l.filter(Boolean) as T[];

export function mesHistoriqueEtapes(t: Traitement, mesures: MesureHisto[] | undefined): EtapeHisto[] {
  const j = (date: unknown, libelle: string, acteur?: unknown, detail?: unknown, alerte?: unknown): Jalon | null => (date || detail ? {
    date: (date || '') as string, libelle, acteur: (acteur || '') as string, detail: (detail || '') as string, alerte: !!alerte,
  } : null);
  const inv: NonNullable<Traitement['investigation']> = t.investigation || {};
  const q: NonNullable<Traitement['qualification']> = t.qualification || {};
  const dec = (cle: string): string => (requis('MES_DECISIONS').some((d) => d.cle === cle) ? requis('mesNomDecision')(cle) : cle);

  return [
    {
      id: 'suite', titre: mt('fil_suite'),
      sous: [{
        nom: mt('h_instruction'),
        jalons: garder([
          j(t.date_creation, mt('h_traitement_declenche'), t.created_by),
          t.decide_le && j(t.decide_le, mt('h_decision', dec(t.decision as string)),
            t.decide_par, t.decision_motif),
        ]),
      }],
    },
    {
      id: 'investigations', titre: mt('fil_investigations'),
      sous: [
        {
          nom: mt('h_conduite_enquete'),
          jalons: garder([
            (inv.equipe || []).length
              && j(inv.soumise_le || t.decide_le, mt('h_enqueteurs', (inv.equipe as unknown[]).length), ''),
            (inv.travaux || []).length
              && j(inv.soumise_le || t.decide_le, mt('h_investigations', (inv.travaux as unknown[]).length), ''),
            inv.soumise_le && j(inv.soumise_le, mt('investigation_soumise'), inv.soumise_par),
          ]),
        },
        {
          nom: mt('h_renvois'),
          jalons: garder((inv.renvois || []).map((r) => j(r.renvoye_le,
            mt('h_renvoyee'), r.renvoye_par, r.motif, true))),
        },
      ],
    },
    {
      id: 'qualification', titre: mt('fil_qualification'),
      sous: [
        {
          nom: mt('sec_instance'),
          jalons: garder([
            (q.membres || []).length && j(t.qualifie_le || inv.soumise_le,
              mt('h_membres', (q.membres as unknown[]).length), ''),
            ...(q.reunions || []).map((r) => j(r.date, mt('h_reunion', r.objet || mt('q_seance')),
              '', r.resultat)),
          ]),
        },
        {
          nom: mt('fil_qualification'),
          jalons: garder([
            q.infraction_constituee && j(t.qualifie_le, mt('h_infraction_constituee'), t.qualifie_par, q.nature),
            q.infraction_non_constituee && j(t.classe_le, mt('h_infraction_non_constituee'), t.classe_par),
            t.classe_le && j(t.classe_le, mt('h_carence_classee'), t.classe_par),
            t.qualifie_le && j(t.qualifie_le, mt('h_qualification_validee'), t.qualifie_par),
          ]),
        },
        {
          nom: mt('onglet_recours'),
          jalons: garder([
            t.recours_ouvert_le && j(t.recours_ouvert_le, mt('h_recours_ouvert'), t.recours_ouvert_par),
            ...(q.mesures || []).filter((m) => m.recours_intente && (m.recours || {}).decision)
              .map((m) => j(t.recours_ouvert_le,
                mt('h_recours_decision', mt(({ maintenir: 'h_mesure_maintenue',
                  modifier: 'h_mesure_modifiee', annuler: 'h_mesure_annulee' } as Record<string, string>)[(m.recours as { decision: string }).decision] as string)),
                '', (m.recours as { commentaire?: string }).commentaire)),
          ]),
        },
      ],
    },
    {
      id: 'suivi', titre: mt('fil_suivi'),
      sous: [
        {
          nom: mt('h_mesures_registre'),
          jalons: garder((mesures || []).map((m) => j(m.date_creation,
            `${m.reference} — ${requis('mesLibelleCategorie')(m.categorie)}`, m.created_by,
            requis('mesLibelleSuivi')(requis('mesStatutSuivi')(m))))),
        },
        {
          nom: mt('h_cloture'),
          jalons: garder([
            (t.suivi || {}).maj_le && j((t.suivi as { maj_le: string }).maj_le, mt('h_suivi_maj'), (t.suivi as { maj_par?: string }).maj_par),
            t.cloture_le && j(t.cloture_le, mt('traitement_cloture'), t.cloture_par),
          ]),
        },
      ],
    },
  ];
}

/** Une carence, telle que les listes la portent — les champs lus d'ici. */
interface CarenceListe { id: string; titre?: string; reference?: string; prestataire_nom?: string }

export async function mesHistorique(constatationId: string): Promise<void> {
  const c = (etat().data.constatations as CarenceListe[]).find((x) => x.id === constatationId);
  if (!c) return;
  let t: Traitement = {};
  try {
    t = await requis('mesApi')(`/constatations/${encodeURIComponent(constatationId)}/traitement`) as Traitement;
  } catch (e) { requis('mesToast')(messageDe(e) || mt('h_indisponible'), 'error'); return; }

  const atteinte = MES_HISTO_ETAPES.indexOf(t.etape || 'suite');
  const clos = !!(t.classe_le || t.cloture_le);
  const etapes = mesHistoriqueEtapes(t, t.mesures || []);
  const quand = (v: unknown): string => {
    const s = String(v || '');
    if (!s) return '—';
    const heure = s.length > 10 ? ` ${s.slice(11, 16)}` : '';
    return `${requis('mesDate')(s)}${heure}`;
  };

  const corps = etapes.map((e, rang) => {
    const faite = rang < atteinte || (clos && rang <= atteinte);
    const courante = !clos && rang === atteinte;
    const classe = ['mes-histo-etape', faite ? 'faite' : '', courante ? 'courante' : '']
      .filter(Boolean).join(' ');
    const sous = e.sous.map((s) => `
            <div class="mes-histo-sous${s.jalons.length ? '' : ' vide'}">
                <div class="mes-histo-sous-nom">${esc(s.nom)}</div>
                ${s.jalons.length ? s.jalons.map((x) => `
                    <div class="mes-histo-jalon">
                        <span class="mes-histo-date">${esc(quand(x.date))}</span>
                        <span class="mes-histo-libelle">${esc(x.libelle)}</span>
                        ${x.acteur ? `<span class="mes-histo-acteur">${esc(x.acteur)}</span>` : ''}
                        ${x.detail ? `<span class="mes-histo-detail${
  x.alerte ? ' alerte' : ''}">${esc(x.detail)}</span>` : ''}
                    </div>`).join('') : `<div class="mes-histo-attente">${mt('h_en_attente')}</div>`}
            </div>`).join('');
    return `
            <section class="${classe}">
                <header>
                    <span class="mes-histo-puce"></span>
                    <h4>${esc(e.titre)}</h4>
                    <span class="mes-histo-etat">${faite ? mt('h_franchie') : (courante ? mt('h_en_cours') : mt('h_a_venir'))}</span>
                </header>
                <div class="mes-histo-sous-liste">${sous}</div>
            </section>`;
  }).join('');

  etat().histoOuvert = true;
  const el = document.getElementById('mesModalRoot');
  if (!el) return;
  el.innerHTML = `
    <div class="mes-modal-fond mes-histo-fond" onclick="mesFermerHistorique()">
        <div class="mes-volet-histo" onclick="event.stopPropagation();">
            <div class="mes-modal-header">
                <span style="flex:1;">${MES_ICONES_ETAT['clock'] as string} ${mt('historique_traitement')}</span>
                <button class="btn btn-outline btn-sm mes-btn-icone"
                        onclick="mesFermerHistorique()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
            </div>
            <div class="mes-modal-body">
                <div class="mes-histo">
                    <div class="mes-histo-entete">
                        <div class="mes-histo-objet">${esc(c.titre || c.reference || '—')}</div>
                        <div class="mes-histo-meta">${esc(c.reference || '')}${
  c.prestataire_nom ? ` · ${esc(c.prestataire_nom)}` : ''}</div>
                    </div>
                    ${corps}
                    <div class="mes-histo-fin ${clos ? 'clos' : ''}">${
  clos ? mt('h_traitement_clos') : mt('h_traitement_en_cours')}</div>
                </div>
            </div>
        </div>
    </div>`;
}

export function mesFermerHistorique(): void {
  etat().histoOuvert = false;
  const el = document.getElementById('mesModalRoot');
  if (el) el.innerHTML = '';
}

// ══════════════════════════════════════
//  Mesures prises sur une carence
// ══════════════════════════════════════
// Le menu Carences dit combien de mesures une carence a values ; il ne disait
// pas lesquelles. Ce volet les montre là où la question se pose, sans quitter
// la liste ni ouvrir le dossier de traitement.

export function mesMesuresDeCarence(constatationId: string): void {
  const E = etat();
  const c = ((E.data.constatations || []) as CarenceListe[]).find((x) => x.id === constatationId);
  if (!c) return;
  const liees = ((E.data.mesures || []) as MesureHisto[])
    .filter((m) => m.constatation_id === constatationId)
    .sort((a, b) => String(a.reference || '').localeCompare(String(b.reference || '')));

  const portee = (m: MesureHisto): string => {
    const nom = ({ temporelle: mt('limitee_temps'), illimitee: mt('illimitee'), sans_objet: mt('sans_objet') } as Record<string, string>)[m.portee as string];
    if (!nom) return '';
    const duree = m.portee === 'temporelle' && m.duree_valeur
      ? ` · ${m.duree_valeur} ${m.duree_unite || 'jours'}` : '';
    return `${nom}${duree}`;
  };

  // Lu à l'usage, comme l'ancien le lisait par son nom dans chaque bloc.
  const suivis = (): Record<string, { classe?: string } | undefined> => requis('MES_SUIVI') as Record<string, { classe?: string } | undefined>;
  const fiche = (libelle: string, valeur: unknown): string => requis('mesLigneFiche')(libelle, valeur);
  const date = (v: unknown): string => requis('mesDate')(v);
  const blocs = liees.map((m) => {
    const cleSuivi = requis('mesStatutSuivi')(m);
    const suivi = suivis()[cleSuivi] || {};
    return `<div class="mes-bloc">
            <div class="mes-bloc-entete">
                <span class="mes-bloc-titre">${esc(m.reference || mt('mesure'))}</span>
                <span class="mes-badge ${esc(suivi.classe || '')}"
                      title="${esc(suivis()[cleSuivi] ? requis('mesAideSuivi')(cleSuivi) : '')}">${
  esc(suivis()[cleSuivi] ? requis('mesLibelleSuivi')(cleSuivi) : '—')}</span>
            </div>
            <div class="mes-bloc-corps">
                <dl style="margin:0;">
                    ${fiche(mt('fiche_categorie'), requis('mesLibelleCategorie')(m.categorie))}
                    ${fiche(mt('fiche_type'), requis('mesLibelleType')(m.type_mesure))}
                    ${fiche(mt('fiche_date_sanction'), date(m.date_sanction || m.date_emission))}
                    ${fiche(mt('fiche_portee'), portee(m))}
                    ${fiche(mt('col_echeance'), date(m.date_echeance))}
                </dl>
                <div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>${mt('fiche_desc_sanction')}</label>
                    <div class="mes-lecture">${m.description ? esc(m.description)
    : '<span class="mes-preuve-vide">—</span>'}</div>
                </div>
                ${m.suivi_commentaire ? `<div class="mes-champ" style="margin:.5rem 0 0;">
                    <label>${mt('commentaire_suivi')}</label>
                    <div class="mes-lecture">${esc(m.suivi_commentaire)}</div>
                </div>` : ''}
            </div>
        </div>`;
  }).join('');

  const el = document.getElementById('mesModalRoot');
  if (!el) return;
  el.innerHTML = `
    <div class="mes-modal-fond mes-histo-fond" onclick="mesFermerHistorique()">
        <div class="mes-volet-histo" onclick="event.stopPropagation();">
            <div class="mes-modal-header">
                <span style="flex:1;">${icone('shield')} Mesures prises sur cette carence</span>
                <button class="btn btn-outline btn-sm mes-btn-icone"
                        onclick="mesFermerHistorique()" aria-label="${esc(mt("fermer"))}" title="${esc(mt("fermer"))}">${icone('close')}</button>
            </div>
            <div class="mes-modal-body">
                <div class="mes-histo-entete">
                    <div class="mes-histo-objet">${esc(c.titre || c.reference || '—')}</div>
                    <div class="mes-histo-meta">${esc(c.reference || '')}${
  c.prestataire_nom ? ` · ${esc(c.prestataire_nom)}` : ''} · ${liees.length} ${mt('mesures_n')}</div>
                </div>
                ${blocs || `<p class="mes-preuve-vide">${mt('aucune_mesure_rattachee')}</p>`}
                ${liees.length ? `<div class="mes-volet-actions">
                    <button class="btn btn-primary btn-sm"
                            onclick="mesOuvrirTableMesures('${c.id}')">
                        ${icone('shield')} Ouvrir la table des Mesures</button>
                </div>` : ''}
            </div>
        </div>
    </div>`;
}
