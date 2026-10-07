// OASIS — La page de connexion, en TypeScript (ADR-003, 5.c).
//
// La page la plus exposée de l'application : la seule qu'un visiteur atteint
// sans être connu. Son script vivait dans la page, et six gestionnaires
// `onclick` avec lui ; il en est sorti pour que `script-src 'self'` s'y applique
// **sans 'unsafe-inline'**.
//
// ── Ce que la conversion ajoute ──
//
// Les dix clés de libellé qu'elle emploie sont désormais **typées** : une faute
// de frappe ou une clé retirée de la table n'est plus un libellé muet, c'est une
// erreur de construction. Vérifié avant de convertir — les dix existent, et il
// faut le dire plutôt que de laisser croire à une trouvaille.
//
// Les trois globales lues — `applyLang`, `applyTheme`, `t` — viennent de leur
// source. Le fichier ne pose plus rien sur `window`, et n'a donc pas de sas.
//
// ── `window.onLangChange` disparaît, et c'est une différence voulue ──
//
// L'ancien fichier posait `window.onLangChange = nommerOeil`, pour que la bascule
// de langue réécrive l'attribut accessible de l'œil — un `data-i18n` ne couvre
// pas un attribut. Le détour par une globale n'avait de raison que la séparation
// des fichiers : la bascule vit ici désormais, et appelle `nommerOeil()`
// directement.
//
// Le nom reste lu par le sas, et `app-demarrage.js` le pose encore pour
// l'accueil : rien n'est retiré du contrat, c'est cette page seule qui n'en a
// plus besoin.
import { poserLangue, t } from '../traductions';
import { appliquerPalette } from '../theme';

// ── Montrer le mot de passe ──
// Sur un clavier de téléphone comme sur un clavier étranger, une saisie muette
// se retente à l'aveugle ; le compte se verrouille au cinquième essai. Le nom
// accessible dit ce que le clic va faire, et suit la langue de la page.
const oeil = document.getElementById('voirMdp');
const champMdp = document.getElementById('password') as HTMLInputElement | null;

function nommerOeil(): void {
  if (!oeil || !champMdp) return;
  oeil.setAttribute('aria-label', t(champMdp.type === 'password' ? 'mdp_afficher' : 'mdp_masquer'));
}

// La langue, et l'attribut de l'œil qui la suit. Les deux gestes tiennent
// ensemble : changer l'un sans l'autre laisse un nom accessible dans l'ancienne
// langue, ce qu'aucun écran ne montre.
function changerLangue(lg: string): void {
  poserLangue(lg);
  nommerOeil();
}

// Palette et langue : la pastille porte son thème, le bouton sa langue.
document.querySelectorAll<HTMLElement>('.theme-dot').forEach((d) => {
  d.addEventListener('click', () => appliquerPalette(d.dataset.theme ?? null));
});
document.querySelectorAll<HTMLElement>('.lang-btn').forEach((b) => {
  b.addEventListener('click', () => changerLangue(b.dataset.lang ?? 'fr'));
});

oeil?.addEventListener('click', () => {
  if (!champMdp) return;
  const cache = champMdp.type === 'password';
  champMdp.type = cache ? 'text' : 'password';
  oeil.setAttribute('aria-pressed', String(cache));
  nommerOeil();
  champMdp.focus();
});

changerLangue(localStorage.getItem('pr_lang') ?? 'fr');

const texte = (id: string): string => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
const boite = (): HTMLElement | null => document.getElementById('loginError');
const dire = (message: string): void => {
  const b = boite();
  if (!b) return;
  b.textContent = message;
  b.style.display = 'block';
};
const taire = (): void => { const b = boite(); if (b) b.style.display = 'none'; };

interface ReponseLogin {
  mfaRequired?: boolean;
  error?: string;
  challengeId?: string;
  channels?: { id: string; label: string; masked: string }[];
  channel?: string;
  masked?: string;
  expiresIn?: number;
  remaining?: number;
}

const lire = async (r: Response): Promise<ReponseLogin> => {
  try { return (await r.json()) as ReponseLogin; } catch { return {}; }
};

let loginPending = false;
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (loginPending) return;
  loginPending = true;
  const submitBtn = (e.currentTarget as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
  // Le bouton dit qu'il travaille : désactivé seul, il se lit comme un refus.
  const libelle = submitBtn?.textContent ?? '';
  const rendreLeBouton = (): void => {
    if (!submitBtn) return;
    submitBtn.disabled = false;
    submitBtn.textContent = libelle;
  };
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t('login_en_cours');
  }
  taire();
  let res: Response;
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: texte('username').trim(), password: champMdp?.value ?? '' }),
    });
  } catch {
    // Réseau coupé, serveur arrêté : sans ceci, le bouton restait à
    // « Connexion… » et la page paraissait bloquée, sans un mot.
    dire(t('login_err_reseau'));
    loginPending = false;
    rendreLeBouton();
    return;
  }
  const data = await lire(res);
  if (res.ok) {
    if (data.mfaRequired) { showMfaStep(data); loginPending = false; rendreLeBouton(); return; }
    window.location.href = '/';
    return;
  }
  dire(data.error === 'locked' ? t('login_err_locked')
    : data.error === 'temp_expired' ? t('login_err_temp_expired')
      : t('login_err_invalid'));
  loginPending = false;
  rendreLeBouton();
  champMdp?.focus();
  champMdp?.select();
});

// ── Authentification multifacteur ──
let mfaState: { challengeId: string; channels: { id: string; label: string; masked: string }[] } | null = null;

function showMfaStep(data: ReponseLogin): void {
  mfaState = { challengeId: data.challengeId ?? '', channels: data.channels ?? [] };
  const login = document.getElementById('loginForm');
  if (login) login.style.display = 'none';
  const form = document.getElementById('mfaForm');
  if (form) form.style.display = 'block';
  const cible = document.getElementById('mfaTarget');
  if (cible) cible.textContent = data.masked ?? '';
  const ttl = document.getElementById('mfaTtl');
  if (ttl) ttl.textContent = String(Math.round((data.expiresIn ?? 600) / 60));
  const sel = document.getElementById('mfaChannel') as HTMLSelectElement | null;
  if (sel) {
    sel.innerHTML = mfaState.channels
      .map((c) => `<option value="${c.id}" ${c.id === data.channel ? 'selected' : ''}>${c.label} — ${c.masked}</option>`)
      .join('');
    sel.style.display = mfaState.channels.length > 1 ? '' : 'none';
  }
  const code = document.getElementById('mfaCode') as HTMLInputElement | null;
  if (code) { code.value = ''; code.focus(); }
}

function resetToLogin(): void {
  mfaState = null;
  const form = document.getElementById('mfaForm');
  if (form) form.style.display = 'none';
  const login = document.getElementById('loginForm');
  if (login) login.style.display = 'block';
  // Le mot de passe repart vide, et caché : le laisser en clair exposerait la
  // saisie suivante à qui passe derrière l'agent.
  if (champMdp) { champMdp.value = ''; champMdp.type = 'password'; }
  oeil?.setAttribute('aria-pressed', 'false');
  nommerOeil();
}

document.getElementById('mfaCancel')?.addEventListener('click', resetToLogin);

document.getElementById('mfaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  taire();
  const res = await fetch('/api/login/mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: mfaState?.challengeId ?? '', code: texte('mfaCode').trim() }),
  });
  if (res.ok) { window.location.href = '/'; return; }
  const data = await lire(res);
  dire(data.error === 'mfa_expired' ? t('mfa_err_expired')
    : data.error === 'mfa_too_many_attempts' ? t('mfa_err_too_many')
      : `${t('mfa_err_code')}${typeof data.remaining === 'number' ? ` ${data.remaining} ${t('mfa_err_restantes')}` : ''}`);
  if (data.error === 'mfa_expired' || data.error === 'mfa_too_many_attempts') resetToLogin();
});

document.getElementById('mfaResend')?.addEventListener('click', async () => {
  taire();
  const res = await fetch('/api/login/mfa/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId: mfaState?.challengeId ?? '',
      username: texte('username').trim(),
      channel: texte('mfaChannel'),
    }),
  });
  const data = await lire(res);
  if (res.ok) showMfaStep(data);
  else { dire(t('mfa_err_envoi')); resetToLogin(); }
});
