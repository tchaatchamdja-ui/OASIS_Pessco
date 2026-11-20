// OASIS — Planification : « Mes Activités » (ADR-003, 5.c — n° 5.f.104).
//
// Les activités des plans validés, rangées par responsable. La page répond à
// une question que le détail d'un plan ne sait pas poser : ce qui attend une
// personne, tous plans confondus.
//
// « Validées et non archivées » : le plan est en vigueur — validé, approuvé
// par le DG, ou transmis. Un plan archivé, un brouillon, une version
// remplacée n'y figurent pas.
//
// Le filtre « Responsable » s'ouvre sur le compte courant lorsqu'il est
// inscrit au référentiel des inspecteurs : la page porte son nom, « Mes
// Activités », et se vide de ce présupposé dès qu'on l'efface.
//
// ── Converti à la lettre ──
//
// Le premier fichier de PLAN qui porte une interface. Son balisage est rendu
// tel quel, caractère pour caractère : la photographie de la page, prise avant
// et après sous douze états de filtre, n'a pas d'écart. L'état et les libellés
// sont lus sur la page (`partage.ts`), jamais importés — un second état
// passerait inaperçu.
import { etat, requis, tp } from './partage';

// Statuts d'un plan en vigueur — les mêmes que côté serveur.
const PLAN_MA_STATUTS = ['valide', 'approuve_dg', 'transmis'];

type Champ = 'responsable' | 'prestataire' | 'secteur' | 'mode' | 'du' | 'au';

/** `responsable` vaut `null` tant que la page ne s'est pas ouverte une fois. */
const PLAN_MA_FILTRES: Record<Champ, string | null> = {
  responsable: null, prestataire: '', secteur: '', mode: '', du: '', au: '',
};

interface Inspecteur { id: string; email?: string; nom?: string; prenom?: string }
interface Activite {
  id: string; plan_id: string; plan_statut?: string; responsable_id?: string;
  prestataire_id?: string; secteur_id?: string; mode_supervision_id?: string;
  type_supervision_id?: string; date_debut?: string; date_fin?: string;
  objet?: string; titre?: string; lieu_activite?: string;
}
interface Plan { id: string; statut?: string }
interface Prestataire { id: string; nom: string; secteur_id?: string }
interface Secteur { id: string; code: string; nom: string }
interface Mode { id: string; mode?: string; libelle?: string }
interface TypeSupervision { id: string; type_supervision?: string; libelle?: string }

/** Une liste des données chargées. Elles viennent du serveur, sans schéma ici. */
function liste<T>(nom: string): T[] {
  return (etat().data[nom] || []) as T[];
}

const esc = (v: unknown): string => requis('_esc')(v);

// Le compte courant, retrouvé parmi les inspecteurs par son adresse.
function _planMaMoi(): string {
  const courriel = String(etat().user?.username || '').trim().toLowerCase();
  if (!courriel) return '';
  const i = liste<Inspecteur>('inspecteurs')
    .find((x) => String(x.email || '').trim().toLowerCase() === courriel);
  return i ? i.id : '';
}

const _planMaNomInspecteur = (id: string | undefined): string => {
  const i = liste<Inspecteur>('inspecteurs').find((x) => x.id === id);
  if (!i) return '';
  return ((i.nom || '') + ' ' + (i.prenom || '')).trim() || i.email || '';
};

// Activités retenues : celles des plans en vigueur, passées au filtre.
function _planMaActivites(): Activite[] {
  const F = PLAN_MA_FILTRES;
  const plans: Record<string, Plan> = {};
  liste<Plan>('plans').forEach((p) => { plans[p.id] = p; });
  return liste<Activite>('allActivites')
    .filter((a) => PLAN_MA_STATUTS.includes(a.plan_statut || (plans[a.plan_id] || {}).statut || ''))
    .filter((a) => (F.responsable === null || !F.responsable ? true : a.responsable_id === F.responsable))
    .filter((a) => (!F.prestataire || a.prestataire_id === F.prestataire))
    .filter((a) => (!F.secteur || a.secteur_id === F.secteur))
    .filter((a) => (!F.mode || a.mode_supervision_id === F.mode))
    // La période retient l'activité qui la chevauche, non celle qui y tient
    // tout entière : une activité à cheval sur deux mois appartient aux deux.
    .filter((a) => (!F.du || String(a.date_fin || '').substring(0, 10) >= F.du))
    .filter((a) => (!F.au || String(a.date_debut || '').substring(0, 10) <= F.au))
    .sort((x, y) => {
      const nx = _planMaNomInspecteur(x.responsable_id) || '￿';
      const ny = _planMaNomInspecteur(y.responsable_id) || '￿';
      return nx.localeCompare(ny)
        || String(x.date_debut || '').localeCompare(String(y.date_debut || ''));
    });
}

// Prestataires offerts au filtre : ceux du secteur retenu. Sans secteur, tous.
// Un prestataire hors référentiel du secteur n'a pas à figurer dans une liste
// qui ne rendrait aucune ligne.
function _planMaPrestataires(): Prestataire[] {
  const tous = liste<Prestataire>('prestataires');
  const s = PLAN_MA_FILTRES.secteur;
  return s ? tous.filter((p) => p.secteur_id === s) : tous;
}

export function planMaSetFiltre(champ: Champ, valeur: string): void {
  PLAN_MA_FILTRES[champ] = valeur;
  // Le prestataire retenu peut ne pas appartenir au nouveau secteur : il
  // disparaîtrait de la liste tout en continuant de filtrer en sourdine.
  if (champ === 'secteur' && PLAN_MA_FILTRES.prestataire
    && !_planMaPrestataires().some((p) => p.id === PLAN_MA_FILTRES.prestataire)) {
    PLAN_MA_FILTRES.prestataire = '';
  }
  requis('planRenderPage')();
}

export function planMaReinit(): void {
  (Object.keys(PLAN_MA_FILTRES) as Champ[]).forEach((k) => { PLAN_MA_FILTRES[k] = ''; });
  requis('planRenderPage')();
}

export function planMaOuvrir(actId: string): void {
  const a = liste<Activite>('allActivites').find((x) => x.id === actId);
  if (!a) return;
  requis('planShowActivityModal')(a.plan_id, a.id, { lecture: true });
}

export function planRenderMesActivites(): string {
  // Premier passage : le filtre s'ouvre sur le compte courant.
  if (PLAN_MA_FILTRES.responsable === null) PLAN_MA_FILTRES.responsable = _planMaMoi();
  const F = PLAN_MA_FILTRES;
  const duree = requis('_planDureeEntre');
  const dateFr = requis('planDateFr');
  const actes = _planMaActivites();
  const cumul = actes.reduce((n, a) => n + (Number(duree(a.date_debut, a.date_fin)) || 0), 0);

  const opt = (v: string, libelle: string, retenu: string | null): string =>
    `<option value="${esc(v)}" ${retenu === v ? 'selected' : ''}>${esc(libelle)}</option>`;
  const responsables = liste<Inspecteur>('inspecteurs')
    .map((i): [string, string] => [i.id, _planMaNomInspecteur(i.id)])
    .filter(([, nom]) => nom)
    .sort((x, y) => x[1].localeCompare(y[1]));

  const lignes = actes.map((a) => {
    const prest = liste<Prestataire>('prestataires').find((p) => p.id === a.prestataire_id);
    const sect = liste<Secteur>('secteurs').find((s) => s.id === a.secteur_id);
    const mode = liste<Mode>('modesSupervision').find((m) => m.id === a.mode_supervision_id);
    const typeS = liste<TypeSupervision>('typesSupervision').find((x) => x.id === a.type_supervision_id);
    const d = duree(a.date_debut, a.date_fin);
    return `<tr class="plan-ma-ligne" onclick="planMaOuvrir('${a.id}')" title="${esc(tp('activity_detail'))}">
            <td>${esc(_planMaNomInspecteur(a.responsable_id) || '—')}</td>
            <td>${prest ? esc(prest.nom) : '—'}</td>
            <td>${esc(a.objet || a.titre || '—')}</td>
            <td>${sect ? esc(sect.code + ' - ' + sect.nom) : '—'}</td>
            <td>${mode ? esc(mode.mode || mode.libelle || '') : '—'} / ${typeS ? esc(typeS.type_supervision || typeS.libelle || '') : '—'}</td>
            <td>${esc(a.lieu_activite || '—')}</td>
            <td class="plan-ma-date">${dateFr(a.date_debut) || '—'}</td>
            <td class="plan-ma-date">${dateFr(a.date_fin) || '—'}</td>
            <td class="plan-ma-duree">${d || '—'}</td>
        </tr>`;
  }).join('');

  return `
    <div class="page-content">
        <div class="page-header">
            <h2>${tp('nav_mes_activites')}</h2>
            <div class="page-actions">
                <button class="btn btn-primary btn-sm" onclick="planOuvrirCalendrier()">
                    ${PLAN_ICONS.calendar} ${tp('cal_voir_detail')}
                </button>
            </div>
        </div>

        <div class="plan-filter-bar">
            <select class="form-select" onchange="planMaSetFiltre('responsable', this.value)">
                ${opt('', tp('tous_responsables'), F.responsable)}
                ${responsables.map(([id, nom]) => opt(id, nom, F.responsable)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('secteur', this.value)">
                ${opt('', tp('tous_secteurs'), F.secteur)}
                ${liste<Secteur>('secteurs').map((s) => opt(s.id, s.code + ' - ' + s.nom, F.secteur)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('prestataire', this.value)">
                ${opt('', tp('tous_prestataires'), F.prestataire)}
                ${_planMaPrestataires().map((p) => opt(p.id, p.nom, F.prestataire)).join('')}
            </select>
            <select class="form-select" onchange="planMaSetFiltre('mode', this.value)">
                ${opt('', tp('tous_modes'), F.mode)}
                ${liste<Mode>('modesSupervision').map((m) => opt(m.id, m.mode || m.libelle || '', F.mode)).join('')}
            </select>
            <label class="plan-ma-periode">${tp('periode_du')}
                <input type="date" class="form-input" value="${esc(F.du)}"
                       onchange="planMaSetFiltre('du', this.value)">
            </label>
            <label class="plan-ma-periode">${tp('periode_au')}
                <input type="date" class="form-input" value="${esc(F.au)}"
                       onchange="planMaSetFiltre('au', this.value)">
            </label>
            <button class="btn-icon-reset" onclick="planMaReinit()"
                    title="${esc(tp('reset_filters'))}" aria-label="${esc(tp('reset_filters'))}">${PLAN_ICONS.reset}</button>
        </div>

        <div class="card">
            <div class="card-header card-header-flex plan-ma-entete">
                <h3>${tp('activities')} (${actes.length})</h3>
                <span class="plan-ma-cumul">${tp('mes_act_cumul', cumul)}</span>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table plan-ma-table">
                    <colgroup>
                        <col style="width:12%"><col style="width:12%"><col style="width:16%">
                        <col style="width:12%"><col style="width:11%"><col style="width:8%">
                        <col style="width:11%"><col style="width:11%"><col style="width:7%">
                    </colgroup>
                    <thead><tr>
                        <th>${tp('col_responsable')}</th>
                        <th>${tp('provider')}</th>
                        <th>${tp('objet')}</th>
                        <th>${tp('sector')}</th>
                        <th>${tp('col_mode_type')}</th>
                        <th>${tp('col_lieu')}</th>
                        <th>${tp('start_date')}</th>
                        <th>${tp('end_date')}</th>
                        <th>${tp('col_duree')}</th>
                    </tr></thead>
                    <tbody>${lignes || `<tr><td colspan="9" class="text-center text-muted">${tp('mes_act_aucune')}</td></tr>`}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}
