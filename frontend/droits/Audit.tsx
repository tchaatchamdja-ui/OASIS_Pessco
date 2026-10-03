// Le journal d'audit du module, et son intégrité.
//
// C'est le seul écran qui montre que la chaîne SHA-256 tient (§F.3). Une
// garantie d'inaltérabilité que personne ne peut lire n'en est pas une : le
// bandeau est donc en tête, avant les filtres et avant les entrées.
import { dt, horodatage, libelleModule } from './socle';
import type { CompteDuModule, EntreeAudit, FiltresAudit, Journal } from './api';

interface Props {
  journal: Journal;
  filtres: FiltresAudit;
  actions: Record<string, string>;
  comptes: CompteDuModule[];
  langue: string;
  surFiltre: (cle: keyof FiltresAudit, valeur: string) => void;
  surReinitialiser: () => void;
}

/**
 * Le détail d'une entrée, mis à plat. `methode` et `url` sont écartés : ils
 * décrivent la requête, non l'acte, et occupaient la colonne pour rien.
 */
const detail = (d?: Record<string, unknown>): string => {
  if (!d) return '';
  const parts = Object.entries(d)
    .filter(([k]) => k !== 'methode' && k !== 'url')
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(' · ') : String(d.url || '');
};

export function Audit({
  journal, filtres, actions, comptes, langue, surFiltre, surReinitialiser,
}: Props) {
  const integrite = journal.integrity;
  const vise = filtres.user ? comptes.find((u) => u.username === filtres.user) : null;

  const nomDuCompte = (username: string): string => {
    const u = comptes.find((x) => x.username === username);
    return u ? `${u.fullName} (${u.username})` : username;
  };

  return (
    <>
      <div className="page-header">
        <h2>{dt('audit_titre', libelleModule())}</h2>
        <p className="page-subtitle">{dt('audit_sous_titre')}</p>
      </div>

      {integrite?.valid
        ? <div className="dr-integrity ok">{dt('integrite_ok', integrite.total)}</div>
        : <div className="dr-integrity ko">{dt('integrite_ko', integrite?.brokenAt)}</div>}

      {vise && (
        <div className="dr-scoped-user">
          {dt('journal_de')} <strong>{vise.fullName}</strong> ({vise.email})
          <button type="button" className="btn btn-sm" onClick={() => surFiltre('user', '')}>
            {dt('voir_tout_module')}
          </button>
        </div>
      )}

      <div className="filters-bar dr-audit-filters">
        <input
          id="drAuditQ"
          className="form-control"
          placeholder={dt('rechercher')}
          value={filtres.q}
          onChange={(e) => surFiltre('q', e.target.value)}
        />
        <select
          className="form-control"
          value={filtres.user}
          onChange={(e) => surFiltre('user', e.target.value)}
        >
          <option value="">{dt('tous_utilisateurs')}</option>
          {comptes.map((u) => <option key={u.username} value={u.username}>{u.fullName}</option>)}
        </select>
        <select
          className="form-control"
          value={filtres.action}
          onChange={(e) => surFiltre('action', e.target.value)}
        >
          <option value="">{dt('toutes_actions')}</option>
          {Object.entries(actions).map(([cle, libelle]) => (
            <option key={cle} value={cle}>{libelle}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-control"
          value={filtres.from}
          onChange={(e) => surFiltre('from', e.target.value)}
          title={dt('du')}
        />
        <input
          type="date"
          className="form-control"
          value={filtres.to}
          onChange={(e) => surFiltre('to', e.target.value)}
          title={dt('au')}
        />
        <button type="button" className="btn btn-sm" onClick={surReinitialiser}>
          {dt('reinitialiser')}
        </button>
        <span className="dr-count">{dt('compte_entrees', journal.total)}</span>
      </div>

      <div className="card dr-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{dt('col_numero')}</th><th>{dt('col_horodatage')}</th>
              <th>{dt('col_utilisateur')}</th><th>{dt('col_action')}</th>
              <th>{dt('col_objet')}</th><th>{dt('col_reference')}</th>
              <th>{dt('col_details')}</th><th>{dt('col_empreinte')}</th>
            </tr>
          </thead>
          <tbody>
            {journal.entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                  {dt('aucune_entree')}
                </td>
              </tr>
            ) : journal.entries.map((e: EntreeAudit) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{String(e.id).padStart(4, '0')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{horodatage(e.ts, langue)}</td>
                <td>{nomDuCompte(e.user)}</td>
                <td><span className={`dr-act dr-act-${e.action}`}>{e.actionLabel}</span></td>
                <td>{e.objet || '—'}</td>
                <td className="dr-mono">{e.ref || '—'}</td>
                <td className="dr-mono dr-detail">{detail(e.details)}</td>
                <td className="dr-mono dr-hash" title={e.hash}>{`${(e.hash || '').slice(0, 10)}…`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
