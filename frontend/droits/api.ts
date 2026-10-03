// Les huit routes de « Gestion des Droits », décrites.
//
// C'est le bénéfice que la fiche technique attendait du typage, et il n'est pas
// cosmétique : ces charges étaient tacites. Un champ renommé au serveur se
// traduisait par un `undefined` affiché, ou par une pastille vide. Ici, il ne
// compile pas.
//
// Ces huit routes sont aussi les seules que le socle Java sert déjà (ADR-002,
// jalon n° 4) : les deux runtimes rendent les mêmes octets, et ce fichier décrit
// donc ce que les deux promettent.
import { MODULE } from './socle';

/** Le privilège général d'un compte sur le module. */
export type Privilege =
  | 'GESTIONNAIRE' | 'VALIDATEUR' | 'CONTRIBUTEUR' | 'LECTEUR' | 'AUCUN' | 'PRESTATAIRE';

/**
 * Une portée particulière : un domaine, éventuellement un secteur, et le
 * privilège qui y vaut. En mode « Prestataire », la portée est un organisme —
 * les deux formes n'ont rien en commun, et l'écran ne les mélange pas.
 */
export interface Portee {
  domaine_id?: string;
  secteur_id?: string;
  privilege?: Privilege;
  prestataire_id?: string;
}

export interface CompteDuModule {
  username: string;
  fullName: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  active: boolean;
  privilege: Privilege;
  /** Vrai quand aucun privilège n'a été posé : c'est le défaut qui s'applique. */
  isDefault: boolean;
  scopes: Portee[];
}

export interface Reference { id: string; nom: string; code?: string }
export interface Prestataire extends Reference { trigramme?: string; secteur_id?: string }
export interface Secteur extends Reference { domaine_id?: string }

export interface Refs {
  domaines: Reference[];
  secteurs: Secteur[];
  prestataires?: Prestataire[];
}

export interface Contexte {
  user: { username: string; nom?: string; prenom?: string; role: string };
  privileges: Privilege[];
  scopePrivileges: Privilege[];
  defaultPrivilege: Privilege;
  auditActions?: Record<string, string>;
}

export interface EntreeAudit {
  id: number;
  ts: string;
  user: string;
  action: string;
  actionLabel: string;
  objet?: string;
  ref?: string;
  details?: Record<string, unknown>;
  hash: string;
}

/**
 * L'état de la chaîne d'audit. `valid` faux porte `brokenAt` : le numéro de
 * l'entrée où le chaînage SHA-256 cesse de tenir (§F.3).
 */
export interface Integrite { valid: boolean; total: number; brokenAt?: number }

export interface Journal {
  entries: EntreeAudit[];
  total: number;
  integrity: Integrite | null;
}

export interface FiltresAudit {
  user: string; action: string; from: string; to: string; q: string;
}

export const FILTRES_VIDES: FiltresAudit = { user: '', action: '', from: '', to: '', q: '' };

/**
 * L'appel passe par `api()` du socle, qui pose l'en-tête `X-OASIS-Request` —
 * sans lui, le serveur refuse toute écriture — et traduit les erreurs du serveur
 * dans la langue de l'écran.
 *
 * Le transtypage est confiné ici, et c'est voulu : une réponse HTTP n'est pas
 * typée, et prétendre le contraire plus haut dans l'écran serait un mensonge qui
 * se propagerait.
 */
const appel = async <T>(chemin: string, options?: RequestInit): Promise<T> =>
  (await window.api(`/api/m/droits${chemin}`, options)) as T;

export const lireContexte = (): Promise<Contexte> => appel(`/context?module=${MODULE}`);
export const lireRefs = (): Promise<Refs> => appel('/refs');
export const lireComptes = (): Promise<CompteDuModule[]> => appel(`/${MODULE}/users`);

export const lireJournal = (filtres: FiltresAudit): Promise<Journal> => {
  const qs = new URLSearchParams();
  (Object.entries(filtres) as [keyof FiltresAudit, string][])
    .forEach(([cle, valeur]) => { if (valeur) qs.set(cle, valeur); });
  return appel(`/${MODULE}/audit?${qs.toString()}`);
};

export const poserDroits = (
  username: string,
  privilege: Privilege,
  scopes: Portee[],
): Promise<unknown> => appel(`/${MODULE}/users/${encodeURIComponent(username)}`, {
  method: 'PUT',
  body: JSON.stringify({ privilege, scopes }),
});
