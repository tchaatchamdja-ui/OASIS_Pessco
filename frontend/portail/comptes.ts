// OASIS — Les comptes : les types, les onglets, les deux lectures (5.e.1).
//
// Extrait de `utilisateurs.ts` **parce que le garde-fou l'a exigé** : le fichier
// faisait 637 lignes, et la limite du frontend est 600. C'est la première fois
// qu'une limite de taille décide d'un découpage dans ce jalon, et le découpage
// qu'elle impose est le bon : d'un côté la **forme** d'un compte et les tables
// qui la décrivent, de l'autre l'écran qui la rend.
//
// Rien ici ne touche au document, ne lit `window`, ni n'appelle l'API. Les deux
// fonctions sont pures, et c'est ce qui les rend comparables une à une.
/** Un onglet de la barre latérale des comptes. */
export interface Onglet {
  id: string;
  label: string;
  icon: string;
}

/** Un compte, tel que `/api/users` le rend. */
export interface Compte {
  username: string;
  role: string;
  email?: string;
  fullName?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  active?: boolean;
  locked?: boolean;
  mustChange?: boolean;
  modules?: string[];
  createdAt?: string | null;
  prestataire_id?: string | null;
  portee?: string;
  instance?: string;
}

/** Une carte du catalogue, telle que cet écran la lit. */
export interface ModuleCompte {
  code: string;
  icon: string;
  tdr: string;
  name: Record<string, string> & { fr: string };
}

export const USER_TABS: Onglet[] = [
  { id: 'SUPERADMIN', label: 'SuperAdmin', icon: 'shield' },
  { id: 'ADMIN', label: 'Admin AAC', icon: 'userCheck' },
  { id: 'ADMIN_PRESTATAIRE', label: 'Admin Prestataires', icon: 'userCheck' },
  { id: 'AAC', label: 'Utilisateurs AAC', icon: 'users' },
  { id: 'PRESTATAIRE', label: 'Utilisateurs Prestataires', icon: 'briefcase' },
  { id: 'INDEPENDANT', label: 'Utilisateurs Indépendants', icon: 'userPlus' },
];
export const PRESTA_TABS: readonly string[] = ['ADMIN_PRESTATAIRE', 'PRESTATAIRE'];

export function userRole(u: Compte): string {
  return u.role === 'INSPECTEUR' ? 'AAC' : u.role;
}

export function splitName(u: Compte): { nom: string; prenom: string } {
  if (u.nom || u.prenom) return { nom: u.nom || '', prenom: u.prenom || '' };
  const parts = String(u.fullName || '').trim().split(/\s+/);
  return { nom: parts[0] || '', prenom: parts.slice(1).join(' ') };
}
