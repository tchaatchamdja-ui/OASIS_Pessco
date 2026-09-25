/* OASIS — page de connexion.
 *
 * Ce script vivait dans la page, et six gestionnaires `onclick` avec lui. Il
 * en sort, et eux deviennent des écouteurs posés ici : la politique de contenu
 * de cette page peut dès lors refuser tout script en ligne — `script-src
 * 'self'`, sans 'unsafe-inline'. C'est la page la plus exposée de
 * l'application, la seule qu'un visiteur atteint sans être connu.
 */

// Palette et langue : la pastille porte son thème, le bouton sa langue.
document.querySelectorAll('.theme-dot').forEach((d) => {
  d.addEventListener('click', () => applyTheme(d.dataset.theme));
});
document.querySelectorAll('.lang-btn').forEach((b) => {
  b.addEventListener('click', () => applyLang(b.dataset.lang));
});

// ── Montrer le mot de passe ──
// Sur un clavier de téléphone comme sur un clavier étranger, une saisie muette
// se retente à l'aveugle ; le compte se verrouille au cinquième essai. Le nom
// accessible dit ce que le clic va faire, et suit la langue de la page.
const oeil = document.getElementById('voirMdp');
const champMdp = document.getElementById('password');

function nommerOeil() {
  oeil.setAttribute('aria-label', t(champMdp.type === 'password' ? 'mdp_afficher' : 'mdp_masquer'));
}

oeil.addEventListener('click', () => {
  const cache = champMdp.type === 'password';
  champMdp.type = cache ? 'text' : 'password';
  oeil.setAttribute('aria-pressed', String(cache));
  nommerOeil();
  champMdp.focus();
});

// i18n.js rappelle ce point d'entrée à chaque changement de langue : l'intitulé
// des boutons suit par `data-i18n`, un attribut, lui, doit être réécrit.
window.onLangChange = nommerOeil;

applyLang(localStorage.getItem('pr_lang') || 'fr');

let loginPending = false;
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (loginPending) return;
  loginPending = true;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  // Le bouton dit qu'il travaille : désactivé seul, il se lit comme un refus.
  const libelle = submitBtn.textContent;
  const rendreLeBouton = () => { submitBtn.disabled = false; submitBtn.textContent = libelle; };
  submitBtn.disabled = true;
  submitBtn.textContent = t('login_en_cours');
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  let res;
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value.trim(),
        password: champMdp.value,
      }),
    });
  } catch {
    // Réseau coupé, serveur arrêté : sans ceci, le bouton restait à
    // « Connexion… » et la page paraissait bloquée, sans un mot.
    errBox.textContent = t('login_err_reseau');
    errBox.style.display = 'block';
    loginPending = false;
    rendreLeBouton();
    return;
  }
  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.mfaRequired) { showMfaStep(data); loginPending = false; rendreLeBouton(); return; }
    window.location.href = '/';
  } else {
    const data = await res.json().catch(() => ({}));
    errBox.textContent = data.error === 'locked' ? t('login_err_locked')
      : data.error === 'temp_expired' ? t('login_err_temp_expired')
      : t('login_err_invalid');
    errBox.style.display = 'block';
    loginPending = false;
    rendreLeBouton();
    champMdp.focus();
    champMdp.select();
  }
});

// ── Authentification multifacteur ──
let mfaState = null;

function showMfaStep(data) {
  mfaState = { challengeId: data.challengeId, channels: data.channels || [] };
  document.getElementById('loginForm').style.display = 'none';
  const form = document.getElementById('mfaForm');
  form.style.display = 'block';
  document.getElementById('mfaTarget').textContent = data.masked || '';
  document.getElementById('mfaTtl').textContent = Math.round((data.expiresIn || 600) / 60);
  const sel = document.getElementById('mfaChannel');
  sel.innerHTML = mfaState.channels
    .map((c) => `<option value="${c.id}" ${c.id === data.channel ? 'selected' : ''}>${c.label} — ${c.masked}</option>`)
    .join('');
  sel.style.display = mfaState.channels.length > 1 ? '' : 'none';
  document.getElementById('mfaCode').value = '';
  document.getElementById('mfaCode').focus();
}

function resetToLogin() {
  mfaState = null;
  document.getElementById('mfaForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  // Le mot de passe repart vide, et caché : le laisser en clair exposerait la
  // saisie suivante à qui passe derrière l'agent.
  champMdp.value = '';
  champMdp.type = 'password';
  oeil.setAttribute('aria-pressed', 'false');
  nommerOeil();
}

document.getElementById('mfaCancel').addEventListener('click', resetToLogin);

document.getElementById('mfaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  const res = await fetch('/api/login/mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: mfaState.challengeId, code: document.getElementById('mfaCode').value.trim() }),
  });
  if (res.ok) { window.location.href = '/'; return; }
  const data = await res.json().catch(() => ({}));
  errBox.textContent =
    data.error === 'mfa_expired' ? t('mfa_err_expired')
    : data.error === 'mfa_too_many_attempts' ? t('mfa_err_too_many')
    : `${t('mfa_err_code')}${typeof data.remaining === 'number' ? ` ${data.remaining} ${t('mfa_err_restantes')}` : ''}`;
  errBox.style.display = 'block';
  if (data.error === 'mfa_expired' || data.error === 'mfa_too_many_attempts') resetToLogin();
});

document.getElementById('mfaResend').addEventListener('click', async () => {
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  const res = await fetch('/api/login/mfa/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId: mfaState.challengeId,
      username: document.getElementById('username').value.trim(),
      channel: document.getElementById('mfaChannel').value,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) showMfaStep(data);
  else { errBox.textContent = t('mfa_err_envoi'); errBox.style.display = 'block'; resetToLogin(); }
});
