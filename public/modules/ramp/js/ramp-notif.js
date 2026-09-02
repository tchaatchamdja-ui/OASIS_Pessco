/* OASIS — Module « RAMP Inspections »
 * Retour d'action : le panneau est celui du socle, partagé par le portail et
 * tous les modules. Le module n'en garde ici que l'appel — et ses propres
 * intitulés d'issue, traduits avec l'écran.
 */

function rampToast(message, type) {
    return window.oasisToast(message, type);
}
