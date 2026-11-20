// OASIS — « Mesures d'Application » (CARE) : les constatations relevées par le
// module lui-même, et le volet où on les saisit (ADR-003, 5.c — n° 5.f.124).
//
// Tout ne vient pas d'un acte de surveillance ou d'une inspection sur aire de
// trafic : un signalement, un contrôle inopiné, une saisine appellent aussi une
// mesure. Ces constatations-là se saisissent ici ; celles reçues des autres
// modules restent en lecture seule, chez celui qui les relève.
//
// Converti à la lettre depuis `mes-app.js`. Redessiner passe par la page,
// comme l'ancien fichier appelait le nom nu.
import {
  MES_STATE, _mesAttr, _mesEsc, mesApi, mesToast, messageDe,
} from './etat';
import type { ConstatationCare, ConstatSaisie } from './formes';
import { MES_ICONS } from './libelles';
import { mt, requis } from './partage';

const champDe = (id: string): HTMLInputElement | null => document.getElementById(id) as HTMLInputElement | null;

// `anime: false` remonte un volet déjà ouvert après un redessin de la coquille :
// il se pose à sa place sans rejouer son glissement.
//
// L'ordre compte. On coupe la transition, on pose la classe d'ouverture, puis
// une lecture forcée acquiert la position finale avant de rendre la transition.
// Figer après coup ne servait à rien : la position d'arrivée était déjà connue,
// et le glissement se rejouait.
export const mesFiger = (el: HTMLElement | null): void | null => el && el.classList.add('mes-sans-glissement');
export function mesDegeler(el: HTMLElement | null): void {
  if (!el) return;
  void el.offsetWidth;
  el.classList.remove('mes-sans-glissement');
}

// Saisie en cours du volet « carence », relevée dans le DOM — même lecture que
// l'enregistrement, pour que rien ne se perde quand la coquille est redessinée.
export function mesCollecterConstat(): ConstatSaisie {
  const v = (id: string): string | undefined => champDe(id)?.value;
  if (document.getElementById('mesConstTitre') === null) return {};
  return {
    titre: v('mesConstTitre'),
    description: v('mesConstDesc'),
    prestataire_id: v('mesConstPrest'),
    origine_libelle: v('mesConstSource'),
    delai_jours: v('mesConstDelai'),
    date_ouverture: v('mesConstOuverture'),
    date_due_cloture: v('mesConstEcheance'),
  };
}

export function mesOuvrirConstat(id?: string): void {
  const c = id ? MES_STATE.data.constatations.find((x) => x.id === id) : null;
  MES_STATE.constatEnCours = c ? { ...c } : {};
  mesAfficherVolet();
}

// Volet de saisie : la moitié de l'écran, bordé de rouge — c'est une
// carence qu'on inscrit, la couleur le dit avant le titre.
export function mesAfficherVolet(o?: { anime?: boolean }): void {
  const el = document.getElementById('mesVoletRoot');
  if (!el) return;
  const k = MES_STATE.constatEnCours;
  if (!k) { el.innerHTML = ''; return; }
  el.innerHTML = mesConstatFormulaire(k);
  const volet = el.querySelector<HTMLElement>('.mes-volet');
  const fond = el.querySelector<HTMLElement>('.mes-volet-fond');
  if (o && o.anime === false) {
    mesFiger(volet); mesFiger(fond);
    volet?.classList.add('ouvert'); fond?.classList.add('ouvert');
    mesDegeler(volet); mesDegeler(fond);
    return;
  }
  requestAnimationFrame(() => {
    volet?.classList.add('ouvert');
    fond?.classList.add('ouvert');
  });
}

export function mesFermerVolet(): void {
  MES_STATE.constatEnCours = null;
  const el = document.getElementById('mesVoletRoot');
  if (el) el.innerHTML = '';
}

export function mesConstatFormulaire(k: ConstatSaisie): string {
  const champ = (id: string, label: unknown, valeur: unknown, extra?: string): string => `
        <div class="mes-champ">
            <label>${_mesEsc(label)}</label>
            <input class="mes-input" id="${id}" value="${_mesAttr(valeur || '')}" ${extra || ''}>
        </div>`;
  return `
    <div class="mes-volet-fond" onclick="mesFermerVolet()"></div>
    <div class="mes-volet" role="dialog" aria-label="${_mesAttr(mt('carence'))}">
        <div class="mes-volet-entete">
            <span style="flex:1;">${k.id ? mt('modifier_carence') : mt('nouvelle_carence')}</span>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerVolet()" aria-label="${_mesAttr(mt("fermer"))}" title="${_mesAttr(mt("fermer"))}">${MES_ICONS.close}</button>
        </div>
        <div class="mes-volet-corps">
            <p class="mes-note">${mt('note_carence_saisie')}</p>
            ${champ('mesConstTitre', mt('objet'), k.titre, `placeholder="${_mesAttr(mt('objet_exemple'))}"`)}
            <div class="mes-champ">
                <label>${mt('description')}</label>
                <textarea class="mes-input" id="mesConstDesc" rows="5"
                          placeholder="${_mesAttr(mt('description_exemple'))}">${_mesEsc(k.description || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('prestataire')}</label>
                <select class="mes-select" id="mesConstPrest">
                    <option value="">—</option>
                    ${MES_STATE.data.prestataires.map((p) => `<option value="${_mesAttr(p.id)}"
                        ${k.prestataire_id === p.id ? 'selected' : ''}>${_mesEsc(p.nom)}</option>`).join('')}
                </select>
            </div>
            ${champ('mesConstSource', mt('origine_constat'), k.origine_libelle,
                `placeholder="${_mesAttr(mt('origine_exemple'))}"`)}
            <div class="mes-grille-3">
                ${champ('mesConstOuverture', mt('ouverture'), k.date_ouverture,
                    'type="date" oninput="mesConstatDelai(\'ouverture\')"')}
                ${champ('mesConstDelai', mt('delai_jours'), k.delai_jours,
                    `type="number" min="0" placeholder="${_mesAttr(mt('delai_exemple'))}" oninput="mesConstatDelai('delai')"`)}
                ${champ('mesConstEcheance', mt('cloture'), k.date_due_cloture,
                    'type="date" oninput="mesConstatDelai(\'echeance\')"')}
            </div>
            <p class="mes-erreur" id="mesConstErreur"></p>
        </div>
        <div class="mes-volet-pied">
            <button class="btn btn-outline btn-sm" onclick="mesFermerVolet()">${mt('annuler')}</button>
            <button class="btn btn-primary btn-sm" onclick="mesEnregistrerConstat()">
                ${MES_ICONS.check} ${mt('enregistrer')}</button>
        </div>
    </div>`;
}

export async function mesEnregistrerConstat(): Promise<void> {
  const k: ConstatSaisie = MES_STATE.constatEnCours || {};
  const err = document.getElementById('mesConstErreur');
  const val = (id: string): string => champDe(id)?.value || '';
  const corps = {
    delai_jours: val('mesConstDelai'),
    titre: val('mesConstTitre').trim(),
    description: val('mesConstDesc').trim(),
    prestataire_id: val('mesConstPrest'),
    origine_libelle: val('mesConstSource').trim(),
    date_ouverture: val('mesConstOuverture'),
    date_due_cloture: val('mesConstEcheance'),
  };
  if (!corps.titre) { if (err) err.textContent = mt('objet_requis'); return; }
  try {
    await mesApi(k.id ? `/constatations/${k.id}` : '/constatations', {
      method: k.id ? 'PUT' : 'POST',
      body: JSON.stringify(corps),
    });
    mesFermerVolet();
    MES_STATE.data.constatations = await mesApi('/constatations') as ConstatationCare[];
    requis('mesRenderPage')();
    mesToast(k.id ? mt('carence_modifiee') : mt('carence_ajoutee'));
  } catch (e) {
    if (err) err.textContent = messageDe(e) || mt('enregistrement_impossible');
  }
}

export async function mesSupprimerConstat(id: string): Promise<void> {
  const c: { reference?: string } = MES_STATE.data.constatations.find((x) => x.id === id) || {};
  if (!await requis('oasisConfirmer')(mt('confirmer_suppr_carence', c.reference || ''))) return;
  try {
    await mesApi(`/constatations/${id}`, { method: 'DELETE' });
    MES_STATE.data.constatations = await mesApi('/constatations') as ConstatationCare[];
    requis('mesRenderPage')();
    mesToast(mt('carence_supprimee'));
  } catch (e) { mesToast(messageDe(e) || mt('suppression_impossible'), 'error'); }
}

// Délai et échéance disent la même chose de deux façons : renseigner l'un
// remplit l'autre, à partir de la date d'ouverture. La dernière saisie
// commande — on ne réécrit jamais le champ que l'agent est en train de remplir.
export function mesConstatDelai(source: string): void {
  const el = champDe;
  const ouverture = el('mesConstOuverture')?.value || '';
  if (!ouverture) return;
  const jour = 86400000;
  const debut = new Date(`${ouverture}T00:00:00`);
  if (Number.isNaN(debut.getTime())) return;

  if (source !== 'echeance') {
    const jours = Number(el('mesConstDelai')?.value);
    if (!Number.isFinite(jours) || jours < 0) return;
    el('mesConstEcheance')!.value = window.oasisJour(new Date(debut.getTime() + jours * jour));
    return;
  }
  const echeance = el('mesConstEcheance')?.value || '';
  const fin = new Date(`${echeance}T00:00:00`);
  if (Number.isNaN(fin.getTime())) return;
  el('mesConstDelai')!.value = String(Math.max(0, Math.round((fin.getTime() - debut.getTime()) / jour)));
}
