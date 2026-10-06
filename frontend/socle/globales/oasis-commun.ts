// OASIS — Les outils communs, publiés en globales (ADR-003, 5.b).
//
// Sas de cohabitation : huit noms, plus l'appel qui pose la langue de la page dès
// le chargement. Les noms publiés gardent leur préfixe `oasis` — sept écrans les
// appellent ainsi, et les renommer en passant serait une migration déguisée en
// conversion.
//
// `poserLangue()` est appelée **ici**, et non dans le module : c'est un geste de
// publication, pas de calcul. Dès le chargement du socle, avant tout rendu, la
// page part dans la langue de l'agent sans attendre qu'il actionne la bascule.
//
// Il ne **déclare** rien : les neuf signatures vivent dans `../commun`.
import {
  appliquerTheme, champRequis, charger, esc, json, langue, messageErreur,
  poserLangue, saisieDifferee,
} from '../commun';


window.oasisCharger = charger;
window.oasisLangue = langue;
window.oasisPoserLangue = poserLangue;
window.oasisEsc = esc;
window.oasisMessageErreur = messageErreur;
window.oasisChampRequis = champRequis;
window.oasisJson = json;
window.oasisAppliquerTheme = appliquerTheme;
window.oasisSaisieDifferee = saisieDifferee;

poserLangue();
