// OASIS — Le panneau de retour d'action, publié en globales (ADR-003, 5.b).
//
// Sas de cohabitation : trois noms. Huit écrans les appellent, et `oasis-dates`
// comme `oasis-utils` les lisent aussi depuis le socle — d'où leur déclaration
// optionnelle là-bas : une page peut charger l'un sans l'autre.
//
// Il ne **déclare** rien : les trois signatures vivent dans `../toast`, le module
// qui porte le comportement. Elles étaient déclarées deux fois, et différemment.
import { confirmer, saisir, toast } from '../toast';

window.oasisToast = toast;
window.oasisConfirmer = confirmer;
window.oasisSaisir = saisir;
