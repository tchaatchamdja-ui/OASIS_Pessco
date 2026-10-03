// La coquille : barre latérale, en-tête, et la place du contenu.
//
// Les classes sont **celles d'avant le portage**, à la lettre : `app-layout`,
// `app-sidebar`, `nav-btn`, `data-table`… La feuille de style
// (`/shared/css/oasis-module.css`) n'est pas touchée, et `module-chrome.js`
// continue d'injecter la barre supérieure commune dans cette structure.
//
// C'est ce qui rend la cohabitation possible : le cadre reste, le contenu change
// de technique.
import type { ReactNode } from 'react';
import { THEMES, dt, icone, nomTheme } from './socle';
import { ICONE_AUDIT, ICONE_CHEVRON_D, ICONE_CHEVRON_G, ICONE_PRIVILEGES } from './icones';
import type { Contexte } from './api';

export type Page = 'privileges' | 'audit';

interface Props {
  compte: Contexte['user'];
  page: Page;
  theme: string;
  langue: string;
  replie: boolean;
  surPage: (p: Page) => void;
  surTheme: (t: string) => void;
  surLangue: (l: string) => void;
  surReplier: () => void;
  children: ReactNode;
}

/** Le brut de l'icône vient du socle : il est écrit par nous, jamais par le serveur. */
const Icone = ({ svg }: { svg: string }) => (
  <span dangerouslySetInnerHTML={{ __html: svg }} />
);

export function Coquille({
  compte, page, theme, langue, replie,
  surPage, surTheme, surLangue, surReplier, children,
}: Props) {
  const initiales = `${(compte.prenom || '')[0] || ''}${(compte.nom || compte.username || 'U')[0] || ''}`;
  const nomComplet = `${compte.prenom || ''} ${compte.nom || ''}`.trim() || compte.username;

  return (
    <>
      <div className={`app-layout ${replie ? 'sidebar-collapsed' : ''}`}>
        <aside className={`app-sidebar ${replie ? 'collapsed' : ''}`}>
          <div className="sidebar-header" />
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-btn ${page === 'privileges' ? 'active' : ''}`}
              onClick={() => surPage('privileges')}
              title={dt('nav_privileges')}
            >
              <Icone svg={ICONE_PRIVILEGES} /> <span>{dt('nav_privileges')}</span>
            </button>
            <button
              type="button"
              className={`nav-btn ${page === 'audit' ? 'active' : ''}`}
              onClick={() => surPage('audit')}
              title={dt('nav_audit')}
            >
              <Icone svg={ICONE_AUDIT} /> <span>{dt('nav_audit')}</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="theme-selector sidebar-theme-selector">
              {THEMES.map((th) => (
                <div
                  key={th}
                  className={`theme-dot ${theme === th ? 'active' : ''}`}
                  data-theme={th}
                  onClick={() => surTheme(th)}
                  title={nomTheme(th)}
                />
              ))}
            </div>
            <div className="lang-selector sidebar-lang-selector">
              {(['FR', 'EN', 'PT'] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  className={`lang-btn ${langue === l.toLowerCase() ? 'active' : ''}`}
                  onClick={() => surLangue(l.toLowerCase())}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={surReplier}
            title={replie ? dt('etendre') : dt('reduire')}
          >
            <Icone svg={replie ? ICONE_CHEVRON_D : ICONE_CHEVRON_G} />
          </button>
        </aside>
        <div className="app-content">
          <header className="app-header">
            <div className="header-left">
              {/*
                Ce titre ne s'affiche jamais sur un écran de module : `module-chrome.js`
                le retire pour mettre ses super-menus à sa place (`injectChrome`,
                « remplacent le titre »). Il est gardé parce que `.header-left` doit
                exister pour recevoir l'injection, et qu'il dit ce que la barre
                remplace — mais il ne faut pas le croire visible.

                C'est en cherchant pourquoi son icône manquait que l'on a trouvé la
                vraie cause : `window.ICONS` rend `undefined`, `oasis-utils.js` le
                déclarant en `const`. Défaut réel, conséquence nulle — et c'est le
                pire des deux, parce qu'il ne se voit pas. La suite `frontend` le
                verrait désormais.
              */}
              <div className="header-module-title">
                <Icone svg={icone('shield')} /> <span>{dt('module_titre')}</span>
              </div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">{initiales.toUpperCase()}</div>
                <span>{nomComplet}</span>
                <span className="role-badge">{compte.role}</span>
              </div>
              <button type="button" className="btn-logout">{dt('deconnexion')}</button>
            </div>
          </header>
          <main className="main-content" id="drContent">{children}</main>
        </div>
      </div>
    </>
  );
}
