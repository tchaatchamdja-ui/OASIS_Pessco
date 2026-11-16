// OASIS — Planification : la fenêtre d'une activité — sa saisie, sa lecture,
// sa durée liée à ses dates, ses sous-activités et ses thèmes (ADR-003, 5.c —
// n° 5.f.107).
//
// La seconde moitié de `pl-crud.js`, convertie à la lettre : voir
// `saisie-plan.ts`, avec lequel elle partage le paquet.
import { donnees, etat, requis, tp } from './partage';
import { E, esc, toast } from './saisie-plan';

interface Ref {
  id: string; code?: string; nom?: string; libelle?: string; mode?: string; type_supervision?: string;
  prenom?: string; nom_complet?: string; email?: string; secteur_id?: string; sous_activite_id?: string;
}
interface Activite {
  id: string; plan_id?: string; objet?: string; description_activite?: string; prestataire_id?: string;
  secteur_id?: string; mode_supervision_id?: string; type_supervision_id?: string; responsable_id?: string;
  lieu_activite?: string; nombre_inspecteurs?: number; date_debut?: string; date_fin?: string;
  themes_couverts?: unknown; sous_activite_ids?: unknown; sous_activite_id?: string;
}
interface PlanOuvert { id: string; annee?: number; secteur_id?: string; activites?: Activite[] }

const champ = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;
const valeur = (id: string): string => champ(id)?.value || '';
const API = (): string => window.PLAN_MODULE_API;
const plan = (): PlanOuvert | null => E().selectedPlan;

// ── Activities CRUD ──

// Durée d'une activité, en jours pleins, bornes comprises : du 9 au 13 mars,
// cinq jours. Une seule date, ou des dates qui se croisent, ne donnent rien.
export function _planDureeEntre(debut: unknown, fin: unknown): number | '' {
  const d = String(debut || '').substring(0, 10);
  const f = String(fin || '').substring(0, 10);
  if (!d || !f) return '';
  const t1 = new Date(`${d}T00:00:00`).getTime();
  const t2 = new Date(`${f}T00:00:00`).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2) || t2 < t1) return '';
  return Math.round((t2 - t1) / 86400000) + 1;
}

// Date de fin déduite d'une durée : le premier jour compte, la fin tombe donc
// à début + (durée − 1).
function _planFinDepuisDuree(debut: unknown, jours: unknown): string {
  const d = String(debut || '').substring(0, 10);
  const n = Number(jours);
  if (!d || !Number.isFinite(n) || n < 1) return '';
  const t = new Date(`${d}T00:00:00`);
  if (Number.isNaN(t.getTime())) return '';
  t.setDate(t.getDate() + Math.round(n) - 1);
  return window.oasisJour(t);
}

// Dates et durée disent la même chose de deux façons : renseigner l'une
// remplit l'autre. La dernière saisie commande — on ne réécrit jamais le champ
// que l'agent est en train de remplir.
//
// Les trois champs sont lus par `document.getElementById`, écrit en toutes
// lettres, et non par l'aide `champ()` : le relevé des gestes rapproche un
// écouteur de sa cible par l'identifiant qu'il lit sur la ligne qui déclare la
// variable. Écrits avec l'aide, les trois écouteurs sortaient « indécidables »
// d'un relevé où ils étaient exercés (ADR-003, n° 5.f.107).
function _planLierDatesDuree(): void {
  const debut = document.getElementById('actDebut') as HTMLInputElement | null;
  const fin = document.getElementById('actFin') as HTMLInputElement | null;
  const duree = document.getElementById('actDuree') as HTMLInputElement | null;
  if (!debut || !fin || !duree) return;
  const depuisDates = (): void => { duree.value = String(_planDureeEntre(debut.value, fin.value)); };
  debut.addEventListener('change', () => {
    // Début posé alors qu'une durée est déjà saisie : c'est la fin qui suit.
    if (duree.value && !fin.value) fin.value = _planFinDepuisDuree(debut.value, duree.value);
    else depuisDates();
  });
  fin.addEventListener('change', depuisDates);
  duree.addEventListener('input', () => {
    const f = _planFinDepuisDuree(debut.value, duree.value);
    if (f) fin.value = f;
  });
}

const enListe = (brut: unknown): string[] => (typeof brut === 'string' ? JSON.parse(brut) : brut) as string[];

// `options.lecture` ouvre la même fiche, mais fermée à la saisie : c'est le
// formulaire qui fait foi, on ne le redessine pas ailleurs pour le lire.
export function planShowActivityModal(planId: string, actId = '', options: { lecture?: boolean } = {}): void {
  const lecture = !!options.lecture;
  const S = E();
  const prestataires = donnees<Ref>('prestataires');
  const secteurs = donnees<Ref>('secteurs');
  const sousActivites = donnees<Ref>('sousActivites');
  const typesSupervision = donnees<Ref>('typesSupervision');
  const modesSupervision = donnees<Ref>('modesSupervision');
  const inspecteurs = donnees<Ref>('inspecteurs');
  const themes = donnees<Ref>('themesSupervision');

  let act: Activite | null = null;
  if (actId && plan()?.activites) {
    act = (plan()?.activites || []).find((a) => a.id === actId) || null;
  }
  // Ouverte depuis « Mes activités », la fiche n'a pas de plan sélectionné :
  // l'activité se retrouve dans la liste complète.
  if (actId && !act) {
    act = donnees<Activite>('allActivites').find((a) => a.id === actId) || null;
  }

  // Plan ouvert depuis le bandeau d'un prestataire : ses données
  // pré-renseignent la nouvelle activité (prestataire + secteur).
  const prefill = (!act && S.prefillPrestataire)
    ? prestataires.find((p) => p.id === S.prefillPrestataire) : null;
  const prestSel = act?.prestataire_id || prefill?.id || '';
  const secteurSel = act?.secteur_id || prefill?.secteur_id
    || (!act ? (plan()?.secteur_id || '') : '');

  // Parse themes_couverts
  let selectedThemes: string[] = [];
  if (act?.themes_couverts) {
    try { selectedThemes = enListe(act.themes_couverts); } catch { selectedThemes = []; }
  }

  // Parse sous_activites (multi-select)
  let selectedSA: string[] = [];
  if (act?.sous_activite_ids) {
    try { selectedSA = enListe(act.sous_activite_ids); } catch { selectedSA = []; }
  } else if (act?.sous_activite_id) {
    selectedSA = [act.sous_activite_id];
  }

  // Read-only for Priorité/Risque/Fréquence/Intensité/Cycle unless Validateur or Admin

  const body = `
    <div class="form-grid plan-act-form">
        <div class="plan-form-section">${tp('sect_activite')}</div>
        <div class="form-group full-width">
            <label>${tp('objet')}</label>
            <input type="text" class="form-input" id="actObjet" value="${act ? esc(act.objet || '') : ''}">
        </div>
        <div class="form-group full-width">
            <label>${tp('description_activite')}</label>
            <textarea class="form-input" id="actDescription" rows="2">${act ? esc(act.description_activite || '') : ''}</textarea>
        </div>

        <div class="plan-form-section">${tp('sect_perimetre')}</div>
        <div class="form-group span-3">
            <label>${tp('provider')}</label>
            <select class="form-select" id="actPrestataire">
                <option value="">${tp('select_option')}</option>
                ${prestataires.map((p) => `<option value="${p.id}" ${prestSel === p.id ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group span-3">
            <label>${tp('sector')}</label>
            <select class="form-select" id="actSecteur">
                <option value="">${tp('select_option')}</option>
                ${secteurs.map((s) => `<option value="${s.id}" ${secteurSel === s.id ? 'selected' : ''}>${s.code} - ${esc(s.nom)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group full-width">
            <label>${tp('sub_activity')} / ${tp('themes_couverts')}</label>
            <div id="actSAThemesTableWrap" class="act-sa-wrap"></div>
            <small class="form-hint" id="actSAHint">${tp('select_sector_first')}</small>
            <div id="actSousActiviteGroup" style="display:none;"></div>
            <div id="actThemesGroup" style="display:none;"></div>
            <small class="form-hint" id="actThemeHint" style="display:none;"></small>
        </div>

        <div class="plan-form-section">${tp('sect_conduite')}</div>
        <div class="plan-row-conduite">
        <div class="form-group">
            <label>${tp('mode_supervision')}</label>
            <select class="form-select" id="actModeSupervision">
                <option value="">${tp('select_option')}</option>
                ${modesSupervision.map((m) => `<option value="${m.id}" ${act?.mode_supervision_id === m.id ? 'selected' : ''}>${esc(m.mode || m.libelle || m.nom || m.code || '')}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('type_supervision')}</label>
            <select class="form-select" id="actTypeSupervision">
                <option value="">${tp('select_option')}</option>
                ${typesSupervision.map((t) => `<option value="${t.id}" ${act?.type_supervision_id === t.id ? 'selected' : ''}>${esc(t.type_supervision || t.libelle || t.nom || t.code || '')}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('lieu_activite')}</label>
            <input type="text" class="form-input" id="actLieu" value="${act ? esc(act.lieu_activite || '') : ''}">
        </div>
        <div class="form-group span-3">
            <label>${tp('responsable_activite')}</label>
            <select class="form-select" id="actResponsable">
                <option value="">${tp('select_option')}</option>
                ${inspecteurs.map((i) => { const label = ((i.nom || '') + ' ' + (i.prenom || '')).trim() || i.nom_complet || i.email || ''; return `<option value="${i.id}" ${act?.responsable_id === i.id ? 'selected' : ''}>${esc(label)}</option>`; }).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>${tp('nombre_inspecteurs')}</label>
            <input type="number" class="form-input" id="actNbInspecteurs" value="${act?.nombre_inspecteurs || 1}" min="1">
        </div>
        </div>

        <div class="plan-form-section">${tp('sect_calendrier')}</div>
        <div class="form-group">
            <label>${tp('start_date')}</label>
            <input type="date" class="form-input" id="actDebut" value="${act?.date_debut?.substring(0, 10) || ''}">
        </div>
        <div class="form-group">
            <label>${tp('end_date')}</label>
            <input type="date" class="form-input" id="actFin" value="${act?.date_fin?.substring(0, 10) || ''}">
        </div>
        <div class="form-group">
            <label>${tp('duree_jours')}</label>
            <input type="number" class="form-input" id="actDuree" min="1" value="${_planDureeEntre(act?.date_debut, act?.date_fin)}">
        </div>
    </div>`;

  const footer = lecture
    ? `<button class="btn btn-ghost" onclick="planCloseModal()">${tp('close')}</button>`
    : `
        <button class="btn btn-ghost" onclick="planCloseModal()">${tp('cancel')}</button>
        <button class="btn btn-primary" onclick="${actId ? `planUpdateActivity('${actId}')` : `planCreateActivity('${planId}')`}">${tp('save')}</button>`;

  const titre = lecture ? tp('activity_detail') : (actId ? tp('edit') : tp('new_activity'));
  requis('planShowModal')(titre, body, footer, 'modal-drawer modal-drawer-3-4');

  // Règles communes des dates : une activité commence dans l'année de son
  // plan — elle n'a pas de champ Année, c'est le plan qui la déclare — et
  // ne se termine pas avant d'avoir commencé.
  window.oasisDatesLier(_planDatesActivite());
  _planLierDatesDuree();

  // ── Dynamic: SA/Themes table (columns = sous-activités) ──
  const secteurSelect = document.getElementById('actSecteur') as HTMLSelectElement | null;
  const _renderSAThemesTable = (): void => {
    const selSecteur = secteurSelect?.value || '';
    const wrap = document.getElementById('actSAThemesTableWrap');
    const hint = document.getElementById('actSAHint');
    if (!wrap) return;
    const filteredSA = selSecteur ? sousActivites.filter((sa) => sa.secteur_id === selSecteur) : [];
    if (!selSecteur) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      if (hint) hint.style.display = '';
      return;
    }
    if (hint) hint.style.display = 'none';
    wrap.style.display = '';
    if (!filteredSA.length) {
      wrap.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);">${tp('no_data')}</div>`;
      return;
    }
    // Une ligne par sous-activité ; ses thèmes sont dans un volet
    // dépliable. Ouvrir le volet coche la sous-activité et ses thèmes.
    wrap.innerHTML = filteredSA.map((sa) => {
      const saThemes = themes.filter((t) => {
        if (t.sous_activite_id === sa.id) return true;
        if (!t.sous_activite_id && t.secteur_id && t.secteur_id === selSecteur) return true;
        if (!t.sous_activite_id && !t.secteur_id) return true;
        return false;
      });
      const saChecked = selectedSA.includes(sa.id);
      const nbCoches = saThemes.filter((t) => selectedThemes.includes(t.id)).length;
      return `<details class="sa-item" data-sa-id="${sa.id}" ${saChecked ? 'open' : ''}>
                <summary class="sa-summary">
                    <span class="sa-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></span>
                    <label class="checkbox-item" onclick="event.stopPropagation();">
                        <input type="checkbox" class="actSACheck" data-sa-id="${sa.id}" value="${sa.id}" ${saChecked ? 'checked' : ''}>
                        <span><strong>${sa.code}</strong> - ${esc(sa.nom)}</span>
                    </label>
                    <span class="sa-count text-muted">${nbCoches}/${saThemes.length} ${tp('themes_count')}</span>
                </summary>
                <div class="sa-themes" data-sa-col="${sa.id}">
                    ${saThemes.length ? saThemes.map((t) => `<label class="checkbox-item sa-theme">
                        <input type="checkbox" class="actThemeCheck" data-sa-id="${sa.id}" value="${t.id}" ${selectedThemes.includes(t.id) ? 'checked' : ''}>
                        <span>${esc(t.libelle || t.nom || '')}</span>
                    </label>`).join('') : `<span class="text-muted" style="font-size:0.82rem;">${tp('no_theme_sector')}</span>`}
                </div>
            </details>`;
    }).join('');

    const majCompteur = (saId: string | null): void => {
      const det = wrap.querySelector(`details[data-sa-id="${saId}"]`);
      if (!det) return;
      const boxes = [...det.querySelectorAll<HTMLInputElement>('.actThemeCheck')];
      const c = det.querySelector('.sa-count');
      if (c) c.textContent = `${boxes.filter((b) => b.checked).length}/${boxes.length} ${tp('themes_count')}`;
    };

    // Ouvrir un volet coche la sous-activité et tous ses thèmes ;
    // le refermer les décoche.
    wrap.querySelectorAll<HTMLDetailsElement>('details.sa-item').forEach((det) => {
      const saId = det.getAttribute('data-sa-id');
      const saBox = det.querySelector<HTMLInputElement>('.actSACheck');
      det.addEventListener('toggle', () => {
        if (saBox) saBox.checked = det.open;
        det.querySelectorAll<HTMLInputElement>('.actThemeCheck').forEach((tc) => { tc.checked = det.open; });
        majCompteur(saId);
      });
      if (saBox) {
        saBox.addEventListener('change', () => {
          det.open = saBox.checked;
          det.querySelectorAll<HTMLInputElement>('.actThemeCheck').forEach((tc) => { tc.checked = saBox.checked; });
          majCompteur(saId);
        });
      }
      det.querySelectorAll<HTMLInputElement>('.actThemeCheck').forEach((tc) => {
        tc.addEventListener('change', () => {
          const boxes = [...det.querySelectorAll<HTMLInputElement>('.actThemeCheck')];
          if (saBox) saBox.checked = boxes.some((b) => b.checked);
          majCompteur(saId);
        });
      });
    });
  };

  // Attach secteur change handler
  if (secteurSelect) {
    secteurSelect.addEventListener('change', _renderSAThemesTable);
  }

  // Initial population (if editing or secteur pre-selected)
  _renderSAThemesTable();

  // Lecture seule : la fiche est dessinée entière, puis fermée à la saisie.
  // Fermer après le dessin de la table des sous-activités, sinon ses cases
  // renaîtraient actives.
  if (lecture) {
    const volet = document.getElementById('planModal');
    if (volet) {
      volet.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((el) => { el.disabled = true; });
      volet.querySelectorAll<HTMLElement>('.sa-item, .sa-theme-list').forEach((el) => { el.style.pointerEvents = 'none'; });
    }
  }
}

export async function planCreateActivity(planId: string): Promise<void> {
  if (!window.oasisDatesValider(_planDatesActivite())) return;
  const data = _collectActivityForm();
  try {
    await window.api(`${API()}/plans/${planId}/activites`, { method: 'POST', body: JSON.stringify(data) });
    requis('planCloseModal')();
    // Rafraîchit le cache global (compteurs « Planifiée » du volet)
    const D = etat().data;
    D.allActivites = await window.api(`${API()}/all-activites`).catch(() => D.allActivites);
    E()._keepPrefill = true;
    await requis('planOpenDetail')(planId);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planUpdateActivity(actId: string): Promise<void> {
  if (!window.oasisDatesValider(_planDatesActivite())) return;
  const data = _collectActivityForm();
  try {
    await window.api(`${API()}/activites/${actId}`, { method: 'PUT', body: JSON.stringify(data) });
    requis('planCloseModal')();
    const p = plan();
    if (p) {
      await requis('planOpenDetail')(p.id);
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

export async function planDeleteActivity(actId: string): Promise<void> {
  if (!await requis('oasisConfirmer')(tp('confirm_delete'))) return;
  try {
    await window.api(`${API()}/activites/${actId}`, { method: 'DELETE' });
    const p = plan();
    if (p) {
      await requis('planOpenDetail')(p.id);
    }
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

// L'année déclarée d'une activité est celle de son plan.
function _planDatesActivite(): { annee: number | string; debut: string; fin: string } {
  return {
    annee: (plan() || { annee: '' }).annee || '',
    debut: 'actDebut', fin: 'actFin',
  };
}

function _collectActivityForm(): Record<string, unknown> {
  // Collect checkbox themes
  const themes = [...document.querySelectorAll<HTMLInputElement>('.actThemeCheck:checked')].map((c) => c.value);

  // Collect checkbox sous-activités
  const sousActiviteIds = [...document.querySelectorAll<HTMLInputElement>('.actSACheck:checked')].map((c) => c.value);

  const data = {
    objet: valeur('actObjet'),
    description_activite: valeur('actDescription'),
    titre: valeur('actObjet'),
    prestataire_id: valeur('actPrestataire'),
    secteur_id: valeur('actSecteur'),
    sous_activite_id: sousActiviteIds[0] || '',
    sous_activite_ids: sousActiviteIds,
    type_supervision_id: valeur('actTypeSupervision'),
    mode_supervision_id: valeur('actModeSupervision'),
    lieu_activite: valeur('actLieu'),
    date_debut: valeur('actDebut'),
    date_fin: valeur('actFin'),
    responsable_id: valeur('actResponsable'),
    nombre_inspecteurs: parseInt(valeur('actNbInspecteurs')) || 1,
    themes_couverts: themes,
  };

  return data;
}
