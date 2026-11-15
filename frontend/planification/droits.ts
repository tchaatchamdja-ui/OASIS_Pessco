// OASIS — Planification : les droits du compte sur le module (ADR-003, 5.c —
// n° 5.f.109).
//
// Converti à la lettre depuis `pl-shell.js`. Les droits proviennent de
// « Gestion des Droits » (module PLAN) : privilège de base plus portées par
// domaine/secteur. Le rôle portail n'intervient que pour les actions réservées
// au DG (approbation, transmission).
import { etat, tp } from './partage';

/** Ce que `/api/m/droits/PLAN/my-access` rend pour le compte. */
export interface AccesPlan {
  hasAccess: boolean;
  privilege: string;
  secteurs: Record<string, string>;
}

/** Le compte, tel que le contexte du serveur le pose. */
interface Compte {
  role?: string;
  role_m2?: string;
}

export const PL_VALIDE = ['GESTIONNAIRE', 'VALIDATEUR'];
const PL_CONTRIB = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR'];

// Statuts d'un plan, tels que le serveur les compte : en vigueur — validé,
// approuvé DG, transmis, à l'exclusion des versions archivées — et en circuit,
// ceux d'un amendement qui n'est pas encore validé.
export const PL_STATUTS_EN_VIGUEUR = ['valide', 'approuve_dg', 'transmis'];
export const PL_STATUTS_AMENDEMENT = ['brouillon', 'soumis', 'en_revue', 'rejete'];

function _access(): AccesPlan {
  return (etat().access as AccesPlan | undefined) || { hasAccess: false, privilege: '', secteurs: {} };
}

// Privilège effectif sur un secteur ; sans secteur, le privilège de base.
export function _privOn(secteurId?: string): string {
  const a = _access();
  if (!a.hasAccess) return '';
  if (secteurId && a.secteurs && a.secteurs[secteurId]) return a.secteurs[secteurId];
  return a.privilege || '';
}

// Meilleur privilège détenu, tous secteurs confondus : autorise l'accès aux
// écrans d'édition, le contrôle fin se faisant ensuite secteur par secteur.
export function _meilleurPriv(): string {
  const a = _access();
  if (!a.hasAccess) return '';
  const tous = [a.privilege, ...Object.values(a.secteurs || {})].filter(Boolean);
  return ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR']
    .find((p) => tous.includes(p)) || '';
}

// Libellé affiché : le privilège du module, comme dans « Profils de Risques ».
export function _userM2Role(): string {
  const p = _meilleurPriv();
  if (p) return p.charAt(0) + p.slice(1).toLowerCase();
  const acces = etat().access as AccesPlan | undefined;
  return (acces && acces.hasAccess === false) ? tp('no_access') : '';
}

// Rôle portail : réservé aux actes du directeur général (approbation,
// transmission). Le libellé peut être le rôle portail brut (SUPERADMIN) ou
// sa transposition module (Administrateur / M2_Administrateur).
export function _isAdmin(): boolean {
  const compte = etat().user as Compte | null | undefined;
  const r = compte?.role || '';
  const m2 = compte?.role_m2 || '';
  return ['SUPERADMIN', 'ADMIN', 'Administrateur'].includes(r) || m2 === 'M2_Administrateur';
}

export function _canValidate(secteurId?: string): boolean {
  return secteurId ? PL_VALIDE.includes(_privOn(secteurId)) : PL_VALIDE.includes(_meilleurPriv());
}

export function _canContribute(secteurId?: string): boolean {
  return secteurId ? PL_CONTRIB.includes(_privOn(secteurId)) : PL_CONTRIB.includes(_meilleurPriv());
}
