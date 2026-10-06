// OASIS — Les phrases du serveur, publiées en globales (ADR-003, 5.b).
//
// Sas de cohabitation : six tables, sous les noms que `oasis-commun.js` et les
// écrans lisent. Le préfixe `OASIS_` et le suffixe `_SERVEUR` sont rendus ici —
// ils évitaient les collisions dans une portée unique ; un module n'en a plus
// besoin, mais les sept écrans qui les lisent, si.
//
// Il ne **déclare** rien : les six signatures vivent dans `../messages-serveur`,
// le module qui porte les tables.
import { ETATS, GABARITS, MESSAGES, OBJETS, OU, ROLES } from '../messages-serveur';

window.OASIS_MESSAGES_SERVEUR = MESSAGES;
window.OASIS_OBJETS_SERVEUR = OBJETS;
window.OASIS_ETATS_SERVEUR = ETATS;
window.OASIS_OU_SERVEUR = OU;
window.OASIS_ROLES_SERVEUR = ROLES;
window.OASIS_GABARITS_SERVEUR = GABARITS;
