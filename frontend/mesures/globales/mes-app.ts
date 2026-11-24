// OASIS — « Mesures d'Application » (CARE) : la coquille, publiée pour la page
// (ADR-003, 5.c — n° 5.f.124). Le dernier fichier de CARE.
//
// ── La surface, mesurée ──
//
// `mes-app.js` portait quatre-vingt-dix noms au premier niveau. **Soixante-
// quinze** étaient sur `window` : ses cinquante fonctions, et les `const` que
// son `Object.assign` reposait — vingt-cinq, `mt` mis à part, que le sas des
// libellés pose déjà. Le sas les posait tous, un à un : la page les appelle
// (`MES_STATE`, `mesLoadData`, `mesRenderApp`, `mesNavigateTo` au démarrage),
// le balisage aussi, et les sept autres paquets de CARE les lisent sur
// `window`.
//
// Quinze n'y étaient pas — des tables et des aides que seul ce fichier lisait :
// `_mesAttr`, `_mesNorm`, `mesNavLabel`, `MES_CLES_ORIGINE`, les trois tables de
// couleurs, `MES_STATUT_CARE`, `mesRole`, `mesEstAdmin`, `mesEstSuperAdmin`,
// `MES_CLOS`, `mesEnRetard`, `MES_LIBELLE_ETAPE`, `mesFiger`. Plus aucun script
// classique ne reste sur la page pour les lire par leur nom, et aucun
// gestionnaire en ligne ne les nomme — la recherche a porté sur le fichier
// lui-même cette fois : ils quittent la portée globale, et c'est la différence
// déclarée.
//
// La frontière de la cohabitation (`restant.d.ts`) disparaît avec ce fichier :
// plus rien de CARE n'est en JavaScript. Ses types globaux vivent dans
// `etat.ts`, ses déclarations de `window` ici.
//
// ── La façade retirée (n° 5.f.125) ──
//
// Vingt-cinq noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les cinquante qu'on y lit. Les noms retirés : `_mesEsc`, `MES_NAV`,
// `mesLibelleCare`, `MES_CLES_STATUT`, `mesLibelleStatut`, `mesStatutMesure`,
// `mesLibelleEtape`, `mesChevronRepli`, `mesRechercherMaintenant`,
// `mesMesurerPied`, `mesFormulaireMesure`, `mesRenderDashboard`,
// `mesRepartition`, `mesFiltreCarence`, `mesMesuresFiltrees`,
// `mesLignesMesures`, `mesRenderMesures`, `mesBoutonTraitement`,
// `mesCritiquesFiltrees`, `mesLignesCritiques`, `mesRenderCritiques`,
// `mesDegeler`, `mesCollecterConstat`, `mesAfficherVolet`,
// `mesConstatFormulaire`.
import {
  _mesChemin, MES_API, MES_STATE, mesApi, mesCategories, mesComites, mesDate, mesJour,
  mesLibelleCategorie, mesLibelleType, mesLoadData, mesPeutDecider, mesPeutEcrire,
  mesRechargerMesures, mesRechargerParametres, mesToast, mesTypes, mesTypesDe,
  mesTypesInvestigation,
} from '../etat';
import {
  MES_ICONS, MES_SUIVI, mesAideSuivi, mesBadgeStatutCare, mesLibelleSuivi, mesOrigine,
  mesStatutSuivi,
} from '../libelles';
import {
  mesAfficherSlider, mesFermerSlider, mesNavigateTo, mesRechercher, mesRenderApp, mesRenderPage,
  mesResetFiltresCritiques, mesResetFiltresDashboard, mesResetFiltresMesures, mesSetFiltre,
  mesSetLang, mesSetTheme, mesToggleSidebar,
} from '../coquille';
import {
  mesGrapheCategorie, mesGrapheSource,
} from '../tableau-de-bord';
import {
  mesFaireLeSuivi, mesMesureDepuisConstatation, mesOuvrirTableMesures, mesSupprimerMesure,
} from '../listes';
import {
  mesConstatDelai, mesEnregistrerConstat, mesFermerVolet, mesOuvrirConstat, mesSupprimerConstat,
} from '../constats';

declare global {
  interface Window {
    // `etat.ts`
    MES_STATE?: typeof MES_STATE;
    MES_API?: typeof MES_API;
    mesApi?: typeof mesApi;
    _mesChemin?: typeof _mesChemin;
    mesPeutDecider?: typeof mesPeutDecider;
    mesPeutEcrire?: typeof mesPeutEcrire;
    mesCategories?: typeof mesCategories;
    mesTypes?: typeof mesTypes;
    mesTypesDe?: typeof mesTypesDe;
    mesLibelleCategorie?: typeof mesLibelleCategorie;
    mesLibelleType?: typeof mesLibelleType;
    mesJour?: typeof mesJour;
    mesDate?: typeof mesDate;
    mesToast?: typeof mesToast;
    mesLoadData?: typeof mesLoadData;
    mesRechargerMesures?: typeof mesRechargerMesures;
    mesTypesInvestigation?: typeof mesTypesInvestigation;
    mesComites?: typeof mesComites;
    mesRechargerParametres?: typeof mesRechargerParametres;
    // `libelles.ts`
    MES_ICONS?: typeof MES_ICONS;
    mesOrigine?: typeof mesOrigine;
    mesBadgeStatutCare?: typeof mesBadgeStatutCare;
    MES_SUIVI?: typeof MES_SUIVI;
    mesLibelleSuivi?: typeof mesLibelleSuivi;
    mesAideSuivi?: typeof mesAideSuivi;
    mesStatutSuivi?: typeof mesStatutSuivi;
    // `coquille.ts`
    mesRenderApp?: typeof mesRenderApp;
    mesSetFiltre?: typeof mesSetFiltre;
    mesRechercher?: typeof mesRechercher;
    mesResetFiltresDashboard?: typeof mesResetFiltresDashboard;
    mesResetFiltresMesures?: typeof mesResetFiltresMesures;
    mesResetFiltresCritiques?: typeof mesResetFiltresCritiques;
    mesNavigateTo?: typeof mesNavigateTo;
    mesRenderPage?: typeof mesRenderPage;
    mesToggleSidebar?: typeof mesToggleSidebar;
    mesSetTheme?: typeof mesSetTheme;
    mesSetLang?: typeof mesSetLang;
    mesFermerSlider?: typeof mesFermerSlider;
    mesAfficherSlider?: typeof mesAfficherSlider;
    // `tableau-de-bord.ts`
    mesGrapheSource?: typeof mesGrapheSource;
    mesGrapheCategorie?: typeof mesGrapheCategorie;
    // `listes.ts`
    mesOuvrirTableMesures?: typeof mesOuvrirTableMesures;
    mesFaireLeSuivi?: typeof mesFaireLeSuivi;
    mesMesureDepuisConstatation?: typeof mesMesureDepuisConstatation;
    mesSupprimerMesure?: typeof mesSupprimerMesure;
    // `constats.ts`
    mesOuvrirConstat?: typeof mesOuvrirConstat;
    mesFermerVolet?: typeof mesFermerVolet;
    mesEnregistrerConstat?: typeof mesEnregistrerConstat;
    mesSupprimerConstat?: typeof mesSupprimerConstat;
    mesConstatDelai?: typeof mesConstatDelai;
  }
}

window.MES_STATE = MES_STATE;
window.MES_API = MES_API;
window.mesApi = mesApi;
window._mesChemin = _mesChemin;
window.mesPeutDecider = mesPeutDecider;
window.mesPeutEcrire = mesPeutEcrire;
window.mesCategories = mesCategories;
window.mesTypes = mesTypes;
window.mesTypesDe = mesTypesDe;
window.mesLibelleCategorie = mesLibelleCategorie;
window.mesLibelleType = mesLibelleType;
window.mesJour = mesJour;
window.mesDate = mesDate;
window.mesToast = mesToast;
window.mesLoadData = mesLoadData;
window.mesRechargerMesures = mesRechargerMesures;
window.mesTypesInvestigation = mesTypesInvestigation;
window.mesComites = mesComites;
window.mesRechargerParametres = mesRechargerParametres;
window.MES_ICONS = MES_ICONS;
window.mesOrigine = mesOrigine;
window.mesBadgeStatutCare = mesBadgeStatutCare;
window.MES_SUIVI = MES_SUIVI;
window.mesLibelleSuivi = mesLibelleSuivi;
window.mesAideSuivi = mesAideSuivi;
window.mesStatutSuivi = mesStatutSuivi;
window.mesRenderApp = mesRenderApp;
window.mesSetFiltre = mesSetFiltre;
window.mesRechercher = mesRechercher;
window.mesResetFiltresDashboard = mesResetFiltresDashboard;
window.mesResetFiltresMesures = mesResetFiltresMesures;
window.mesResetFiltresCritiques = mesResetFiltresCritiques;
window.mesNavigateTo = mesNavigateTo;
window.mesRenderPage = mesRenderPage;
window.mesToggleSidebar = mesToggleSidebar;
window.mesSetTheme = mesSetTheme;
window.mesSetLang = mesSetLang;
window.mesFermerSlider = mesFermerSlider;
window.mesAfficherSlider = mesAfficherSlider;
window.mesGrapheSource = mesGrapheSource;
window.mesGrapheCategorie = mesGrapheCategorie;
window.mesOuvrirTableMesures = mesOuvrirTableMesures;
window.mesFaireLeSuivi = mesFaireLeSuivi;
window.mesMesureDepuisConstatation = mesMesureDepuisConstatation;
window.mesSupprimerMesure = mesSupprimerMesure;
window.mesOuvrirConstat = mesOuvrirConstat;
window.mesFermerVolet = mesFermerVolet;
window.mesEnregistrerConstat = mesEnregistrerConstat;
window.mesSupprimerConstat = mesSupprimerConstat;
window.mesConstatDelai = mesConstatDelai;
