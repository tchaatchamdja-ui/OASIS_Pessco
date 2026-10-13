// OASIS — L'organigramme de l'Administration (ADR-003, 5.d.3).
//
// Quatrième pièce de la réécriture d'`app-config.js`, et la plus grosse : douze
// gestes, deux présentations, un glisser-déposer et un registre de poste.
//
// C'est aussi l'écran qui porte le plus d'**autorité** : la chaîne de validation
// d'une personne — qui répond de quoi, et qui valide à sa place en son absence —
// se lit ici. Un intérim mal posé redirige des validations.
//
// Tout est gardé : la ronde d'intérim, le rattachement par glisser-déposer, le
// registre et les deux présentations sont couverts depuis 5.c.11.
//
// ── Ce que ce fichier emporte, et pourquoi ──
//
// `LEVEL_COLORS` était un `const` d'`app.js` — donc une globale **lexicale**,
// invisible à un module. `app.js` ne l'utilisait pas : seul `app-config.js` la
// lit, par cet écran et par l'accordéon des domaines. Elle vient donc ici, et le
// sas la publie pour l'accordéon, qui l'importera à sa conversion (5.d.4).
//
// `ORG_VIEW` — la présentation choisie — reste privée : seul cet écran la lit.
import { escapeHtml, showToast } from '../socle/utils';
import { sessionPerdue } from '../socle/requete';
import { icon } from './icones';
import { t } from './traductions';
import { personnelName, personnelOptions, type Enregistrement } from './schemas';
import { fmtDate, loadRefs } from './outils';

declare global {
  interface Window {
    /** Bascule entre la liste indentée et l'arbre. */
    setOrgView: (v: string) => void;
    /** Les quatre gestes du glisser-déposer d'un rattachement. */
    orgDragStart: (ev: DragEvent, personId: string) => void;
    orgAllowDrop: (ev: DragEvent) => void;
    orgDragLeave: (ev: DragEvent) => void;
    orgDrop: (ev: DragEvent, orgId: string) => Promise<void>;
    /** Le registre d'un poste : qui l'a tenu, et quand. */
    openPosteRegistre: (nodeId: string) => void;
    /** Les quatre gestes de l'intérim. */
    orgStartInterim: (nodeId: string) => void;
    orgConfirmInterim: (nodeId: string) => Promise<void>;
    orgEndInterim: (nodeId: string) => Promise<void>;
    orgUnassign: (id: string) => Promise<void>;

    // Les cinq prêts — `LEVEL_COLORS`, `orgChainFor`, `circuitHtml`,
    // `cfgSectionOrganigramme`, `normalizeOrgTopLevel` — sont rendus depuis la
    // dépose du pont (5.e.5) : `taxinomie.ts`, `configuration.ts` et
    // `parametres.ts` les importent d'ici.
  }
}

async function appel(chemin: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(chemin, options);
  if (res.status === 401) { sessionPerdue(); throw new Error('unauthenticated'); }
  return res;
}

const liste = (coll: string): Enregistrement[] => (window.REFS[coll] ?? []) as Enregistrement[];
const texte = (v: unknown): string => (v == null ? '' : String(v));
const nombre = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Les couleurs des cinq niveaux. Reprises mot pour mot d'`app.js`. */
export const LEVEL_COLORS: readonly string[] = ['#2563eb', '#0891b2', '#f59e0b', '#10b981', '#8b5cf6'];

// ── La chaîne de validation ──
//
// De l'entité de rattachement d'une personne jusqu'à la racine. Le `guard`
// n'est pas décoratif : un `parent_id` qui boucle — deux entités se désignant
// l'une l'autre — ferait tourner cette boucle sans fin et figerait l'écran. Le
// formulaire l'empêche (une entité est ôtée de ses propres options, 5.d.1), mais
// une donnée venue d'un import ne passe pas par le formulaire.
export function orgChainFor(personId: unknown): Enregistrement[] | null {
  const assigns = liste('organisation_assignments').filter((a) => a.person_id === personId);
  const premier = assigns[0];
  if (!premier) return null;
  const byId: Record<string, Enregistrement> =
    Object.fromEntries(liste('organisation').map((o) => [texte(o.id), o]));
  let node: Enregistrement | undefined = byId[texte(premier.org_id)];
  const chain: Enregistrement[] = [];
  const guard = new Set<string>();
  while (node && !guard.has(texte(node.id))) {
    guard.add(texte(node.id));
    chain.push(node);
    node = node.parent_id ? byId[texte(node.parent_id)] : undefined;
  }
  return chain.length ? chain : null;
}

export function circuitHtml(chain: Enregistrement[] | null): string {
  if (!chain) return '<span style="color:var(--text-muted);font-size:.8rem;">' + t('non_rattache_organigramme') + '</span>';
  return `<div class="pers-circuit">${chain
    .map((n, i) => {
      const color = LEVEL_COLORS[Math.min(i, LEVEL_COLORS.length - 1)];
      const last = i === chain.length - 1;
      const absent = !!n.interim_actif && !!n.interim_id;
      const validateur = absent ? personnelName(n.interim_id) : n.titulaire_id ? personnelName(n.titulaire_id) : n.poste ? 'Poste vacant' : '';
      const sub = (n.poste || validateur)
        ? `<span class="pers-circuit-sub">${escapeHtml([n.poste, validateur].filter(Boolean).join(' · '))}${absent ? ' <span class="pers-circuit-interim">' + t('interim') + '</span>' : ''}</span>`
        : '';
      return `<span class="pers-circuit-step" title="${escapeHtml(n.libelle)} (${escapeHtml(n.type)})${absent ? ' — intérim : ' + escapeHtml(personnelName(n.interim_id)) + ', titulaire notifié' : ''}">
          <span class="pers-circuit-sigle" style="border-bottom:2px solid ${color};color:${color};">${escapeHtml(n.sigle)}</span>${sub}
        </span>${last ? '' : '<span class="pers-circuit-arrow">→</span>'}`;
    })
    .join('')}</div>`;
}

// ── La présentation choisie ──
//
// Privée au module : seul cet écran la lit. Elle n'est pas retenue d'une séance
// à l'autre, et c'est le comportement de l'original — un rechargement rend la
// liste.
let ORG_VIEW = 'list'; // 'list' | 'tree'

export function setOrgView(v: string): void {
  ORG_VIEW = v;
  void window.renderConfig();
}

// ── Le glisser-déposer d'un rattachement ──
//
// La seule écriture du portail dont l'inverse est offert par l'écran au même
// endroit : déposer crée, la croix de la pastille retire (5.c.11).
export function orgDragStart(ev: DragEvent, personId: string): void {
  ev.dataTransfer?.setData('text/plain', personId);
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
}

export function orgAllowDrop(ev: DragEvent): void {
  ev.preventDefault();
  (ev.currentTarget as HTMLElement | null)?.classList.add('org-drop-hover');
}

export function orgDragLeave(ev: DragEvent): void {
  (ev.currentTarget as HTMLElement | null)?.classList.remove('org-drop-hover');
}

export async function orgDrop(ev: DragEvent, orgId: string): Promise<void> {
  ev.preventDefault();
  (ev.currentTarget as HTMLElement | null)?.classList.remove('org-drop-hover');
  const personId = ev.dataTransfer?.getData('text/plain');
  if (!personId) return;
  const exists = liste('organisation_assignments').some((a) => a.org_id === orgId && a.person_id === personId);
  if (exists) { showToast(t('deja_rattache'), 'warning'); return; }
  const res = await appel('/api/referentiels/organisation_assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, person_id: personId, person_type: 'inspecteur' }),
  });
  if (res.ok) {
    await loadRefs();
    void window.renderConfig();
    showToast(t('personnel_rattache'), 'success');
    return;
  }
  showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

export async function orgUnassign(id: string): Promise<void> {
  const res = await appel(`/api/referentiels/organisation_assignments/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadRefs();
    void window.renderConfig();
    showToast(t('rattachement_retire'), 'success');
    return;
  }
  showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
}

// ── Le registre d'un poste ──
//
// Ce qu'un auditeur vient chercher : qui tenait ce poste, et à quelle date. Une
// entrée sans date de fin est **en cours** — et c'est elle qui dit qu'un intérim
// court encore, quand bien même l'écran dirait le contraire (5.c.11).
export function registreHtml(nodeId: string): string | null {
  const node = liste('organisation').find((o) => o.id === nodeId);
  if (!node) return null;
  const reg = (Array.isArray(node.registre) ? node.registre : []).slice().reverse() as Enregistrement[];
  const rows = reg
    .map((e) => {
      const roleBadge =
        e.role === 'interim'
          ? '<span class="shell-badge" style="background:#fef3c7;color:#92400e;">' + t('interimaire') + '</span>'
          : '<span class="shell-badge badge-active">Titulaire</span>';
      const fin = e.end ? fmtDate(e.end) : '<span class="shell-badge badge-active">En cours</span>';
      return `<tr><td>${roleBadge}</td><td>${escapeHtml(personnelName(e.person_id))}</td><td>${fmtDate(e.start)}</td><td>${fin}</td></tr>`;
    })
    .join('');
  return `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:640px;">
      <div class="shell-modal-header"><h3>Registre — ${escapeHtml(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <div class="shell-table-container">
          <table class="shell-table shell-table-compact">
            <thead><tr><th>${t('users_col_role')}</th><th>Personne</th><th>${t('debut_jour_heure')}</th><th>Fin (jour / heure)</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" style="color:var(--text-muted);">${t('aucun_enregistrement')}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="shell-modal-footer"><button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${t('fermer')}</button></div>
    </div>
  </div>`;
}

export function openPosteRegistre(nodeId: string): void {
  const html = registreHtml(nodeId);
  if (html === null) return;
  const root = document.getElementById('cfgModalRoot');
  if (root) root.innerHTML = html;
}

/** Le balisage de la fenêtre d'intérim, isolé pour la comparaison. */
export function interimHtml(nodeId: string): string | null {
  const node = liste('organisation').find((o) => o.id === nodeId);
  if (!node) return null;
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  const opts = personnelOptions().filter((o) => o.v !== node.titulaire_id);
  return `
  <div class="shell-modal-overlay">
    <div class="shell-modal" style="max-width:440px;">
      <div class="shell-modal-header"><h3>Signaler un intérim — ${escapeHtml(node.poste || node.sigle)}</h3><button class="shell-btn-icon" onclick="closeRefModal()" style="color:#fff;" aria-label="${escapeHtml(t('fermer'))}" title="${escapeHtml(t('fermer'))}">${icon('x', 18)}</button></div>
      <div class="shell-modal-body">
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">Titulaire : <strong>${escapeHtml(titNom || 'Poste vacant')}</strong>${t('selectionner_interimaire')}</p>
        <div class="shell-form-group">
          <label>${t('interimaire')}</label>
          <select class="shell-input" id="interimSelect">
            <option value="">— Choisir —</option>
            ${opts.map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.t)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="shell-modal-footer">
        <button class="shell-btn shell-btn-outline" onclick="closeRefModal()">${escapeHtml(t('cancel'))}</button>
        <button class="shell-btn shell-btn-primary" onclick="orgConfirmInterim('${nodeId}')">${t('activer_interim')}</button>
      </div>
    </div>
  </div>`;
}

export function orgStartInterim(nodeId: string): void {
  const html = interimHtml(nodeId);
  if (html === null) return;
  const root = document.getElementById('cfgModalRoot');
  if (root) root.innerHTML = html;
}

/**
 * Active un intérim : l'écriture d'autorité de cet écran.
 *
 * Elle fait trois choses, et les trois comptent : elle désigne l'intérimaire,
 * elle **ouvre une entrée au registre** — sans quoi un intérim redirigerait des
 * validations sans laisser de trace (contre-essayé en 5.c.11) —, et elle
 * **prévient** l'instance et le titulaire.
 */
export async function orgConfirmInterim(nodeId: string): Promise<void> {
  const node = liste('organisation').find((o) => o.id === nodeId);
  // Le sélecteur absent : l'original écrit `document.getElementById(…).value` et
  // lève. Ici il rend `''`, donc l'avertissement « choisir un intérimaire » et un
  // retour. La divergence est nommée plutôt que corrigée, parce qu'elle est
  // **inoffensive** : des deux côtés rien ne part, et le garde ci-dessous dit la
  // même chose que la levée, en français. Ce n'est pas le cas de ses deux
  // cousines — voir `exigences.ts` et `parametres.ts`, où `''` faisait partir une
  // requête qui effaçait un champ.
  const choix = document.getElementById('interimSelect') as HTMLSelectElement | null;
  const interimId = choix?.value ?? '';
  if (!interimId) { showToast(t('choisir_interimaire'), 'warning'); return; }
  if (!node) return;
  const registre = (Array.isArray(node.registre) ? node.registre.slice() : []) as unknown[];
  registre.push({ role: 'interim', person_id: interimId, start: new Date().toISOString(), end: null });
  const res = await appel(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: interimId, interim_actif: true, registre }),
  });
  if (!res.ok) {
    showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
    return;
  }
  const posteLbl = texte(node.poste || node.sigle);
  const interimNom = personnelName(interimId);
  const titNom = node.titulaire_id ? personnelName(node.titulaire_id) : null;
  const prevenir = (message: string, type: string): Promise<Response> => appel('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, type }),
  });
  await prevenir(`Intérim (${posteLbl}) : les demandes de validation sont redirigées vers ${interimNom}.`, 'warning');
  if (titNom) {
    await prevenir(`${titNom}, vos validations (${posteLbl}) sont assurées par ${interimNom} pendant votre absence.`, 'info');
  }
  window.closeRefModal();
  await loadRefs();
  void window.renderConfig();
  window.refreshNotifications();
  showToast(t('interim_active', interimNom), 'success', 4000);
}

/**
 * Lève l'intérim, et **referme l'entrée du registre**.
 *
 * La fermeture n'est pas facultative : sans elle, l'écran dit que le titulaire
 * est revenu et le registre dit que l'intérim court toujours. Les deux
 * divergent, en silence — contre-essayé en 5.c.11.
 */
export async function orgEndInterim(nodeId: string): Promise<void> {
  const node = liste('organisation').find((o) => o.id === nodeId);
  if (!node) return;
  const registre = (Array.isArray(node.registre) ? node.registre : [])
    .map((e) => ({ ...(e as Record<string, unknown>) }));
  const ouverte = [...registre].reverse().find((e) => e.role === 'interim' && !e.end);
  if (ouverte) ouverte.end = new Date().toISOString();
  const res = await appel(`/api/referentiels/organisation/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...node, interim_id: '', interim_actif: false, registre }),
  });
  if (!res.ok) {
    showToast(window.oasisMessageErreur(await res.json().catch(() => ({})), res.status), 'error');
    return;
  }
  await loadRefs();
  void window.renderConfig();
  showToast(t('interim_retire'), 'success');
}

const orgPersonName = (p: Enregistrement): string =>
  `${escapeHtml(p.nom)} ${escapeHtml(p.prenom)}`.trim()
  || escapeHtml(p.numero_inspecteur || p.id);

function orgAssignedChips(orgId: unknown): string {
  const assigns = liste('organisation_assignments').filter((a) => a.org_id === orgId);
  if (!assigns.length) return '';
  const persons = liste('inspecteurs');
  return `<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem;">${assigns
    .map((a) => {
      const p = persons.find((x) => x.id === a.person_id);
      if (!p) return '';
      return `<span class="org-person-chip">${orgPersonName(p)}<span class="org-chip-x" onclick="orgUnassign('${texte(a.id)}')" title="Retirer">${icon('x', 12)}</span></span>`;
    })
    .join('')}</div>`;
}

export function cfgSectionOrganigramme(): string {
  const levels = liste('organisation_levels').slice().sort((a, b) => nombre(a.ordre) - nombre(b.ordre));
  const levelIndex: Record<string, number> = Object.fromEntries(levels.map((lv, i) => [texte(lv.type), i]));
  const entites = liste('organisation');
  const persons = liste('inspecteurs');
  const children = (pid: string): Enregistrement[] => entites
    .filter((o) => texte(o.parent_id) === pid)
    .sort((a, b) => nombre(a.ordre) - nombre(b.ordre));

  // Panneau personnel (glisser-déposer) — masque les personnes déjà rattachées
  const assignedIds = new Set(liste('organisation_assignments').map((a) => a.person_id));
  const available = persons.filter((p) => !assignedIds.has(p.id));
  const personnelPanel = `
    <div class="org-personnel">
      <div class="org-personnel-title">${icon('users', 15)} Personnel AAC</div>
      <p style="font-size:.72rem;color:var(--text-muted);margin-bottom:.5rem;">${t('glisser_nom')}</p>
      ${
        available.length
          ? available
              .map(
                (p) => `<div class="org-person-item" draggable="true" ondragstart="orgDragStart(event,'${texte(p.id)}')" title="Réf : ${escapeHtml(p.ref_personnel || p.numero_inspecteur || '—')}">${icon('userCheck', 14)} <span>${orgPersonName(p)}</span></div>`,
              )
              .join('')
          : `<p style="font-size:.8rem;color:var(--text-muted);">${persons.length ? 'Tout le personnel est rattaché.' : 'Aucun personnel — voir sous-menu « Personnel AAC ».'}</p>`
      }
    </div>`;

  const posteLine = (node: Enregistrement): string => {
    if (!node.poste && !node.titulaire_id && !node.interim_id) return '';
    const tit = node.titulaire_id ? personnelName(node.titulaire_id) : 'Poste vacant';
    const absent = !!node.interim_actif && !!node.interim_id;
    const titClass = absent ? 'org-titulaire org-titulaire-off' : 'org-titulaire';
    let interimLigne = '';
    if (node.interim_id) {
      interimLigne = `<span class="org-interim ${absent ? 'org-interim-on' : ''}">${icon('userCheck', 12)} Intérim : ${escapeHtml(personnelName(node.interim_id))}${absent ? ' <span class="shell-badge badge-active">Actif</span>' : ''}</span>`;
    }
    const canInterim = !!node.titulaire_id || !!node.poste;
    const toggle = absent
      ? `<button class="shell-btn shell-btn-danger org-poste-btn" onclick="event.stopPropagation();orgEndInterim('${texte(node.id)}')">${t('titulaire_retour')}</button>`
      : canInterim
      ? `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();orgStartInterim('${texte(node.id)}')">${t('signaler_interim')}</button>`
      : '';
    const nbReg = Array.isArray(node.registre) ? node.registre.length : 0;
    const registreBtn = `<button class="shell-btn shell-btn-outline org-poste-btn" onclick="event.stopPropagation();openPosteRegistre('${texte(node.id)}')">Registre${nbReg ? ` (${nbReg})` : ''}</button>`;
    return `<div class="org-poste">
      ${node.poste ? `<span class="org-poste-nom">${escapeHtml(node.poste)}</span>` : ''}
      <span class="${titClass}">${icon('userCheck', 12)} ${escapeHtml(tit)}</span>
      ${interimLigne}
      ${toggle}
      ${registreBtn}
    </div>`;
  };
  const editBtn = (node: Enregistrement): string =>
    `<button class="shell-btn-icon org-edit" onclick="event.stopPropagation();openRefModal('organisation','${texte(node.id)}')" title="Poste & titulaire" aria-label="Poste & titulaire">${icon('edit', 14)}</button>`;

  // Vue liste (indentée) — présentation actuelle
  const renderNodeList = (node: Enregistrement, depth: number): string => {
    const color = LEVEL_COLORS[levelIndex[texte(node.type)] ?? depth] || '#64748b';
    return `
    <div class="org-node" style="margin-left:${depth * 1.5}rem;border-left:3px solid ${color};"
         ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${texte(node.id)}')">
      <div style="display:flex;align-items:center;gap:.4rem;">
        <div style="flex:1;"><strong style="color:${color};">${escapeHtml(node.sigle)}</strong> — ${escapeHtml(node.libelle)}
          <span class="shell-badge badge-neutral" style="margin-left:.4rem;">${escapeHtml(node.type)}</span></div>
        ${editBtn(node)}
      </div>
      ${posteLine(node)}
      ${orgAssignedChips(node.id)}
    </div>
    ${children(texte(node.id)).map((c) => renderNodeList(c, depth + 1)).join('')}`;
  };

  // Vue hiérarchique verticale (arbre)
  const renderNodeTree = (node: Enregistrement, depth: number): string => {
    const color = LEVEL_COLORS[levelIndex[texte(node.type)] ?? depth] || '#64748b';
    const kids = children(texte(node.id));
    return `
    <div class="org-tree-node">
      <div class="org-tree-box" style="border-top:3px solid ${color};"
           ondragover="orgAllowDrop(event)" ondragleave="orgDragLeave(event)" ondrop="orgDrop(event,'${texte(node.id)}')">
        <div style="display:flex;align-items:center;justify-content:center;gap:.3rem;"><strong style="color:${color};">${escapeHtml(node.sigle)}</strong>${editBtn(node)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(node.libelle)}</div>
        ${posteLine(node)}
        ${orgAssignedChips(node.id)}
      </div>
      ${kids.length ? `<div class="org-tree-children">${kids.map((c) => renderNodeTree(c, depth + 1)).join('')}</div>` : ''}
    </div>`;
  };

  const roots = children('');
  const body = !roots.length
    ? '<p style="color:var(--text-muted);">' + t('aucune_entite') + '</p>'
    : ORG_VIEW === 'tree'
    ? `<div class="org-tree">${roots.map((r) => renderNodeTree(r, 0)).join('')}</div>`
    : roots.map((r) => renderNodeList(r, 0)).join('');

  return `
  <div class="portal-page-header">
    <h3>${escapeHtml(t('cfg_organigramme'))}</h3>
    <div class="portal-page-actions">
      <div class="org-view-toggle">
        <button class="org-view-btn ${ORG_VIEW === 'list' ? 'active' : ''}" onclick="setOrgView('list')">${icon('list', 14)} Liste</button>
        <button class="org-view-btn ${ORG_VIEW === 'tree' ? 'active' : ''}" onclick="setOrgView('tree')">${icon('sitemap', 14)} Hiérarchie</button>
      </div>
    </div>
  </div>
  <div class="org-layout">
    ${personnelPanel}
    <div class="org-canvas shell-card">${body}</div>
  </div>`;
}

/**
 * Aligne l'entité de niveau 1 sur l'identité de l'Administration.
 *
 * ── Un effet de bord du rendu, conservé tel quel, et nommé ──
 *
 * Cette fonction **écrit dans `window.REFS`** : elle recopie le sigle et le nom
 * de l'AAC sur toute entité du niveau d'ordre 1. Elle est appelée à **chaque**
 * rendu de l'écran de configuration.
 *
 * Ce n'est pas un oubli de l'original : l'entité de niveau 1 *est* l'AAC, et
 * `saveRef` impose la même règle à l'écriture (5.d.1). L'affichage et
 * l'enregistrement s'accordent donc.
 *
 * Mais c'est un rendu qui modifie les données qu'il affiche, et il faut le dire
 * pour deux raisons :
 *
 *   · sur le jeu de travail, elle **ne change rien** — l'entité enregistrée est
 *     déjà conforme. Son retrait passerait donc inaperçu, et la comparaison
 *     mécanique doit **bricoler un écart** pour l'éprouver ;
 *   · le jour où l'on voudra que l'entité garde son propre nom, c'est ici qu'il
 *     faudra regarder, et non dans le formulaire.
 *
 * Même famille que le tri sur place trouvé en 5.d.0 : la conversion ne corrige
 * pas, elle rend visible.
 */
export function normalizeOrgTopLevel(cfg: unknown): void {
  const topType = window.orgTopLevelType();
  const aac = ((cfg as { aac?: { sigle?: string; nom?: string } } | null)?.aac) ?? {};
  if (!topType) return;
  liste('organisation').forEach((o) => {
    if (o.type === topType) {
      if (aac.sigle) o.sigle = aac.sigle;
      if (aac.nom) o.libelle = aac.nom;
    }
  });
}
