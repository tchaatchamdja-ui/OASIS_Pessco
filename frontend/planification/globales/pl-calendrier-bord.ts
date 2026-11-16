// OASIS — « Planification » : le calendrier des activités du tableau de bord,
// publié pour les fichiers restés en JavaScript (ADR-003, 5.c — n° 5.f.105).
//
// `pl-calendrier-bord.js` posait vingt et un noms, dont six sur `window` à la
// main. Sept sont lus hors du module : `_planCalendrierHtml` par le tableau de
// bord et le calendrier, `planCalNavEtat` par `pl-shell.js`, et les commandes
// de la carte par ses propres `onclick` — et `onmouseenter` / `onmouseleave`
// pour `planCalInfo`, que le relevé des gestes n'inventorie pas mais que la
// page appelle. `planCalBord` n'a aucun lecteur ; il était posé sur `window`,
// il l'est encore. Les quatorze autres quittent la portée globale.
//
// ── L'effet au chargement, ici et nulle part ailleurs ──
//
// La largeur du cadre suit celle de la fenêtre, l'état des flèches aussi :
// l'écouteur `resize` se pose une fois, gardé par `_planCalNavObserve`. Il vit
// dans ce sas parce que c'est lui qui se charge à la position de l'ancien
// fichier ; le module qu'il publie n'a, lui, aucun effet de bord.
import {
  _planCalendrierHtml, planCalAnnee, planCalAujourdhui, planCalBord, planCalDefiler, planCalInfo, planCalNavEtat,
} from '../calendrier-bord';

declare global {
  interface Window {
    /** Le diagramme de l'année — lu par le tableau de bord et le calendrier. */
    _planCalendrierHtml?: typeof _planCalendrierHtml;
    /** L'année regardée, d'un pas. */
    planCalAnnee?: typeof planCalAnnee;
    /** La piste défilée, d'un écran. */
    planCalDefiler?: typeof planCalDefiler;
    /** L'état des flèches, selon ce que la piste déborde. */
    planCalNavEtat?: typeof planCalNavEtat;
    /** La piste menue à l'un de ses bords. */
    planCalBord?: typeof planCalBord;
    /** Le retour à aujourd'hui. */
    planCalAujourdhui?: typeof planCalAujourdhui;
    /** La fiche de survol d'une barre. */
    planCalInfo?: typeof planCalInfo;
    /** Le garde de l'écouteur `resize`, posé une fois par page. */
    _planCalNavObserve?: boolean;
  }
}

window._planCalendrierHtml = _planCalendrierHtml;
window.planCalAnnee = planCalAnnee;
window.planCalDefiler = planCalDefiler;
window.planCalNavEtat = planCalNavEtat;
window.planCalBord = planCalBord;
window.planCalAujourdhui = planCalAujourdhui;
window.planCalInfo = planCalInfo;

if (!window._planCalNavObserve) {
  window._planCalNavObserve = true;
  window.addEventListener('resize', () => window.planCalNavEtat?.());
}
