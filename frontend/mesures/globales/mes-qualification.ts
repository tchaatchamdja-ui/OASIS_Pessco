// OASIS — « Mesures d'Application » (CARE) : l'étape « Qualification et
// Mesures », publiée pour la page (ADR-003, 5.c — n° 5.f.123).
//
// ── La surface, mesurée ──
//
// `mes-qualification.js` portait cinquante-six noms au premier niveau.
// **Quarante-neuf** étaient sur `window` — fonctions, et `const` que son
// `Object.assign` reposait. Sept n'y étaient pas, et l'un d'eux est appelé
// **par le balisage même du fichier** : `mesDatesSanction`, dans le `onchange`
// de la date de sanction. Un gestionnaire en ligne s'exécute dans la portée
// globale, qui voit les `const` d'un script classique ; il ne voit pas ceux
// d'un module. Le sas le pose donc — la recherche des lecteurs d'un nom doit
// inclure le fichier qui le déclare, ce que la première ne faisait pas.
//
// Les six autres — `mesNomVolet`, `MES_DECISIONS_RECOURS`,
// `mesRecoursModifier`, `mesQualRedessiner`, `mesBloc`, `mesChampBloc` — ne
// sont lus par personne : ils quittent la portée globale, et c'est la
// différence déclarée.
//
// Le sas posait les cinquante, un à un, depuis les quatre parties de l'étape. `mesActionsQualification` et
// `mesQualClose` quittent la frontière (`restant.d.ts`) : c'est lui qui les
// déclare désormais.
//
// ── La façade retirée (n° 5.f.125) ──
//
// Dix-huit noms ne sont plus posés : personne ne les lit sur `window` — ni un
// gestionnaire en ligne, ni un autre paquet, ni la page. Le sas ne pose plus
// que les trente-deux qu'on y lit. Les noms retirés : `mesQualification`,
// `mesQualModifiable`, `MES_QUAL_VOLETS`, `mesQualARecours`, `mesQualVolet`,
// `mesQualOnglets`, `mesSectionRapportInvestigation`, `mesSectionInstance`,
// `mesSectionQualification`, `mesQualVersionPrecedente`,
// `mesSectionMesuresArretees`, `mesBlocRecours`, `mesSectionRecours`,
// `mesCollecterRecours`, `mesCollecterQualification`, `mesQualModifier`,
// `mesAjouterDuree`, `mesQualIssue`.
import {
  mesMajQualification, mesQualClose,
} from '../qualification-commun';
import {
  mesRecoursAjouterMembre, mesRecoursDecision, mesRecoursRetirerMembre, mesRecoursRetirerPiece,
  mesRecoursTeleverser,
} from '../recours';
import {
  mesDatesSanction, mesQualAjouterMesure, mesQualCategorieMesure, mesQualDureeVersTerme,
  mesQualPorteeMesure, mesQualRetirerMesure, mesQualRetirerPiece, mesQualSuiviRequis,
  mesQualTeleverser, mesQualTermeVersDuree,
} from '../mesures-arretees';
import {
  mesActionsQualification, mesEnregistrerQualification, mesQualAjouterMembre, mesQualAjouterReunion,
  mesQualBasculerInfraction, mesQualBasculerNonInfraction, mesQualBasculerRenvoi, mesQualClasser,
  mesQualCloturer, mesQualCorps, mesQualRenvoyer, mesQualRetirerMembre, mesQualRetirerReunion,
  mesQualSuivi, mesQualVoirVolet,
} from '../qualification';

declare global {
  interface Window {
    mesQualClose?: typeof mesQualClose;
    mesQualVoirVolet?: typeof mesQualVoirVolet;
    mesQualCorps?: typeof mesQualCorps;
    mesRecoursAjouterMembre?: typeof mesRecoursAjouterMembre;
    mesRecoursRetirerMembre?: typeof mesRecoursRetirerMembre;
    mesRecoursRetirerPiece?: typeof mesRecoursRetirerPiece;
    mesRecoursDecision?: typeof mesRecoursDecision;
    mesRecoursTeleverser?: typeof mesRecoursTeleverser;
    mesMajQualification?: typeof mesMajQualification;
    mesQualAjouterMembre?: typeof mesQualAjouterMembre;
    mesQualRetirerMembre?: typeof mesQualRetirerMembre;
    mesQualAjouterReunion?: typeof mesQualAjouterReunion;
    mesQualRetirerReunion?: typeof mesQualRetirerReunion;
    mesQualAjouterMesure?: typeof mesQualAjouterMesure;
    mesQualDureeVersTerme?: typeof mesQualDureeVersTerme;
    mesDatesSanction?: typeof mesDatesSanction;
    mesQualTermeVersDuree?: typeof mesQualTermeVersDuree;
    mesQualPorteeMesure?: typeof mesQualPorteeMesure;
    mesQualSuiviRequis?: typeof mesQualSuiviRequis;
    mesQualRetirerMesure?: typeof mesQualRetirerMesure;
    mesQualRetirerPiece?: typeof mesQualRetirerPiece;
    mesQualBasculerInfraction?: typeof mesQualBasculerInfraction;
    mesQualBasculerNonInfraction?: typeof mesQualBasculerNonInfraction;
    mesQualBasculerRenvoi?: typeof mesQualBasculerRenvoi;
    mesQualCategorieMesure?: typeof mesQualCategorieMesure;
    mesQualTeleverser?: typeof mesQualTeleverser;
    mesActionsQualification?: typeof mesActionsQualification;
    mesQualRenvoyer?: typeof mesQualRenvoyer;
    mesQualClasser?: typeof mesQualClasser;
    mesQualSuivi?: typeof mesQualSuivi;
    mesQualCloturer?: typeof mesQualCloturer;
    mesEnregistrerQualification?: typeof mesEnregistrerQualification;
  }
}

window.mesQualClose = mesQualClose;
window.mesQualVoirVolet = mesQualVoirVolet;
window.mesQualCorps = mesQualCorps;
window.mesRecoursAjouterMembre = mesRecoursAjouterMembre;
window.mesRecoursRetirerMembre = mesRecoursRetirerMembre;
window.mesRecoursRetirerPiece = mesRecoursRetirerPiece;
window.mesRecoursDecision = mesRecoursDecision;
window.mesRecoursTeleverser = mesRecoursTeleverser;
window.mesMajQualification = mesMajQualification;
window.mesQualAjouterMembre = mesQualAjouterMembre;
window.mesQualRetirerMembre = mesQualRetirerMembre;
window.mesQualAjouterReunion = mesQualAjouterReunion;
window.mesQualRetirerReunion = mesQualRetirerReunion;
window.mesQualAjouterMesure = mesQualAjouterMesure;
window.mesQualDureeVersTerme = mesQualDureeVersTerme;
window.mesDatesSanction = mesDatesSanction;
window.mesQualTermeVersDuree = mesQualTermeVersDuree;
window.mesQualPorteeMesure = mesQualPorteeMesure;
window.mesQualSuiviRequis = mesQualSuiviRequis;
window.mesQualRetirerMesure = mesQualRetirerMesure;
window.mesQualRetirerPiece = mesQualRetirerPiece;
window.mesQualBasculerInfraction = mesQualBasculerInfraction;
window.mesQualBasculerNonInfraction = mesQualBasculerNonInfraction;
window.mesQualBasculerRenvoi = mesQualBasculerRenvoi;
window.mesQualCategorieMesure = mesQualCategorieMesure;
window.mesQualTeleverser = mesQualTeleverser;
window.mesActionsQualification = mesActionsQualification;
window.mesQualRenvoyer = mesQualRenvoyer;
window.mesQualClasser = mesQualClasser;
window.mesQualSuivi = mesQualSuivi;
window.mesQualCloturer = mesQualCloturer;
window.mesEnregistrerQualification = mesEnregistrerQualification;
