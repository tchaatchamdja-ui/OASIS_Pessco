// La page des privilèges : qui peut quoi sur le module, et à quelle portée.
//
// Une ligne par compte ayant le module dans « Accès aux modules ». La pastille
// porte le privilège général ; les puces, les portées particulières.
import { dt, libelleModule, libellePrivilege } from './socle';
import type { CompteDuModule, Portee, Prestataire, Privilege, Reference, Secteur } from './api';

interface Props {
  comptes: CompteDuModule[];
  privileges: Privilege[];
  domaines: Reference[];
  secteurs: Secteur[];
  prestataires: Prestataire[];
  recherche: string;
  filtre: string;
  surRecherche: (v: string) => void;
  surFiltre: (v: string) => void;
  surModifier: (username: string) => void;
  surJournal: (username: string) => void;
}

/** Les puces de portée. Les deux formes n'ont rien en commun — voir la fenêtre. */
function Portees({
  compte, domaines, secteurs, prestataires,
}: {
  compte: CompteDuModule;
  domaines: Reference[];
  secteurs: Secteur[];
  prestataires: Prestataire[];
}) {
  const nomDomaine = (id?: string) => domaines.find((d) => d.id === id)?.nom || id || '—';
  const nomSecteur = (id?: string) => secteurs.find((s) => s.id === id)?.nom || '';
  const nomPrestataire = (id?: string) => {
    const p = prestataires.find((x) => x.id === id);
    if (!p) return id || '—';
    return p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom;
  };

  const portees = compte.scopes || [];

  if (compte.privilege === 'PRESTATAIRE') {
    if (!portees.length) {
      return <span className="dr-chip dr-chip-AUCUN">{dt('aucun_prestataire')}</span>;
    }
    return (
      <>
        {portees.map((s: Portee, i: number) => (
          <span key={`${s.prestataire_id}-${i}`} className="dr-chip dr-chip-PRESTATAIRE">
            {nomPrestataire(s.prestataire_id)}
          </span>
        ))}
      </>
    );
  }

  if (!portees.length) return <>—</>;
  return (
    <>
      {portees.map((s: Portee, i: number) => (
        <span key={`${s.domaine_id}-${s.secteur_id}-${i}`} className={`dr-chip dr-chip-${s.privilege}`}>
          {nomDomaine(s.domaine_id)}
          {s.secteur_id ? ` › ${nomSecteur(s.secteur_id)}` : ''}
          {` — ${libellePrivilege(s.privilege || '')}`}
        </span>
      ))}
    </>
  );
}

export function Privileges({
  comptes, privileges, domaines, secteurs, prestataires,
  recherche, filtre, surRecherche, surFiltre, surModifier, surJournal,
}: Props) {
  const q = recherche.toLowerCase();
  const visibles = comptes
    .filter((u) => !filtre || u.privilege === filtre)
    .filter((u) => !q
      || [u.fullName, u.email, u.username, u.role].join(' ').toLowerCase().includes(q));

  const comptages = privileges
    .map((p) => `${libellePrivilege(p)} : ${comptes.filter((u) => u.privilege === p).length}`)
    .join(' · ');

  return (
    <>
      <div className="page-header">
        <h2>{dt('page_titre', libelleModule())}</h2>
        <p className="page-subtitle">{dt('page_sous_titre')}</p>
      </div>

      <div
        className="filters-bar"
        style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}
      >
        <input
          className="form-control"
          style={{ maxWidth: '280px' }}
          placeholder={dt('rechercher_utilisateur')}
          value={recherche}
          onChange={(e) => surRecherche(e.target.value)}
        />
        <select
          className="form-control"
          style={{ maxWidth: '220px' }}
          value={filtre}
          onChange={(e) => surFiltre(e.target.value)}
        >
          <option value="">{dt('tous_privileges')}</option>
          {privileges.map((p) => <option key={p} value={p}>{libellePrivilege(p)}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--text-muted)' }}>
          {dt('compte_utilisateurs', comptes.length, comptages)}
        </span>
      </div>

      <div className="card dr-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{dt('col_nom')}</th>
              <th>{dt('col_prenoms')}</th>
              <th>{dt('col_email')}</th>
              <th>{dt('col_role_portail')}</th>
              <th>{dt('col_privilege_general')}</th>
              <th>{dt('col_portees')}</th>
              <th style={{ width: '90px' }} />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                  {dt('aucun_utilisateur')}
                </td>
              </tr>
            ) : visibles.map((u) => (
              // Un compte désactivé reste listé, en retrait : son privilège vaut
              // toujours le jour où il est réactivé.
              <tr key={u.username} style={u.active ? undefined : { opacity: .55 }}>
                <td><strong>{u.nom}</strong></td>
                <td>{u.prenom}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>
                  <span className={`dr-priv dr-priv-${u.privilege}`}>{libellePrivilege(u.privilege)}</span>
                  {u.isDefault && (
                    <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>
                      {` ${dt('defaut_court')}`}
                    </span>
                  )}
                </td>
                <td>
                  <div className="dr-scopes">
                    <Portees
                      compte={u}
                      domaines={domaines}
                      secteurs={secteurs}
                      prestataires={prestataires}
                    />
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => surModifier(u.username)}>
                    {dt('modifier')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => surJournal(u.username)}
                    title={dt('journal_utilisateur')}
                  >
                    {dt('journal')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
