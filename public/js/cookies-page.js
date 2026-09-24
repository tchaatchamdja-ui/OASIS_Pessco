/* OASIS — page « Témoins de connexion ».
 *
 * Ce script vivait dans la page. Il en sort pour que la politique de contenu
 * de cette page puisse refuser tout script en ligne : sans gestionnaire
 * hérité ni bloc inséré, `script-src 'self'` s'y applique sans rien casser.
 */
applyLang(localStorage.getItem('pr_lang') || 'fr');

// La durée de session n'est pas écrite en dur : elle vient du paramétrage
// de l'application, et la page dit ce qui s'applique vraiment.
(async () => {
  let minutes = 30;
  try {
    const r = await fetch('/api/politique-session', { credentials: 'same-origin' });
    if (r.ok) minutes = (await r.json()).sessionTimeoutMinutes || minutes;
  } catch (e) { /* la valeur par défaut fera foi */ }
  document.getElementById('dureeSession').textContent = t('cookies_session_duree').replace('{0}', minutes);
})();

document.getElementById('effacer').addEventListener('click', () => {
  window.oasisEffacerPreferences();
  applyLang('fr');
  alert(t('cookies_efface'));
});
