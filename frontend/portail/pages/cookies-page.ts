// OASIS — La page « Témoins de connexion », en TypeScript (ADR-003, 5.c).
//
// Vingt-quatre lignes, et elle passe en premier des sept fichiers d'interface du
// portail pour une raison : **c'est une page séparée**. Sa réécriture ne peut
// pas casser l'accueil, et l'on apprend la forme sur le fichier dont l'échec
// coûte le moins.
//
// Ce script vivait dans la page. Il en est sorti pour que la politique de
// contenu de cette page puisse refuser tout script en ligne : sans gestionnaire
// hérité ni bloc inséré, `script-src 'self'` s'y applique sans rien casser.
//
// ── Trois globales de moins ──
//
// Il lisait `applyLang`, `t` et `oasisEffacerPreferences` sur `window`. Les trois
// viennent maintenant de leur source, typées par elle :
//
//   · `poserLangue` et `t` de `../traductions` — et `t` y est **typé par ses
//     clés** : `t('cookies_efface')` ne compile que si la clé existe ;
//   · `effacerPreferences` de `../../socle/cookies`, qui est du TypeScript depuis
//     la suite 5.b.
//
// Le fichier ne pose rien sur `window` et n'a donc pas de sas : personne ne lit
// de lui. C'est la première conversion du portail dont la surface est **vide**.
import { effacerPreferences } from '../../socle/cookies';
import { poserLangue, t } from '../traductions';

poserLangue(localStorage.getItem('pr_lang') ?? 'fr');

// La durée de session n'est pas écrite en dur : elle vient du paramétrage de
// l'application, et la page dit ce qui s'applique vraiment.
void (async () => {
  let minutes = 30;
  try {
    const r = await fetch('/api/politique-session', { credentials: 'same-origin' });
    if (r.ok) {
      const lu = (await r.json()) as { sessionTimeoutMinutes?: number };
      minutes = lu.sessionTimeoutMinutes || minutes;
    }
  } catch { /* la valeur par défaut fera foi */ }
  const zone = document.getElementById('dureeSession');
  if (zone) zone.textContent = t('cookies_session_duree').replace('{0}', String(minutes));
})();

document.getElementById('effacer')?.addEventListener('click', () => {
  effacerPreferences();
  poserLangue('fr');
  // eslint-disable-next-line no-alert
  alert(t('cookies_efface'));
});
