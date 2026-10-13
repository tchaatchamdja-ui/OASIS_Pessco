// OASIS — Les quatre aides et le téléphone, posés en globales (5.e.4).
//
// Sas, construit vers `public/app/outils.js` et `public/app/telephone.js`.
//
// ── Sept noms publiés, et **plus un seul lecteur dans la page** ──
//
// Tous les modules du portail les **importent** depuis 5.e.4 : c'est la dernière
// pièce d'`app.js`, et il n'y a plus de JavaScript pour les lire. Ils restent
// publiés pour les **douze comparateurs**, qui font tourner les versions
// d'origine — lesquelles les cherchent dans la portée globale.
//
// C'est la situation décrite par la décision inscrite à l'ADR : la couche des sas
// n'est plus le pont de la cohabitation, elle n'est plus que le banc des preuves.
// Le pont n'a plus d'usage, et sa dépose est la suite immédiate (5.e.5).
//
// `PHONE_CODES` et `DEFAULT_PHONE_CODE` ne sont **pas** publiés : c'étaient des
// `const` du premier niveau, donc absents de `window`, et personne ne les lit.
//
// `escArg` l'est, et dans la même situation que les sept autres — aucun lecteur
// dans la page. Le premier jet de ce sas le retirait au motif qu'il n'en a pas ;
// c'était arbitraire, puisque `fmtDate` et `loadRefs` n'en ont pas davantage. Le
// critère de 5.c vaut pour les huit : **il y était**, et on les dépose tous
// ensemble en 5.e.5, pas un à la main dans une conversion.
import { escArg, fmtDate, loadRefs, reglesMotDePasse } from '../outils';
import { phoneFieldHtml, phoneFieldValue, splitPhone } from '../telephone';

window.escArg = escArg;
window.loadRefs = loadRefs;
window.fmtDate = fmtDate;
window.reglesMotDePasse = reglesMotDePasse;
window.phoneFieldHtml = phoneFieldHtml;
window.phoneFieldValue = phoneFieldValue;
window.splitPhone = splitPhone;
