// La fenêtre qui attribue un privilège — l'acte du module.
//
// Deux formes de portée, qui n'ont rien en commun :
//
//   · le privilège ordinaire se borne par domaine et secteur, et chaque portée
//     porte son propre échelon ;
//   · le privilège « Prestataire » se borne par organisme — un compte
//     d'organisme surveillé ne voit que ses propres données.
//
// Changer de l'une à l'autre **vide les portées** : les traîner d'une forme à
// l'autre donnerait des portées sans objet, que le serveur refuserait sans que
// l'écran sache dire pourquoi.
import { useState } from 'react';
import { descriptionPrivilege, dt, libellePrivilege } from './socle';
import type { CompteDuModule, Portee, Prestataire, Privilege, Reference, Secteur } from './api';

interface Props {
  compte: CompteDuModule;
  privileges: Privilege[];
  privilegesDePortee: Privilege[];
  privilegeParDefaut: Privilege;
  domaines: Reference[];
  secteurs: Secteur[];
  prestataires: Prestataire[];
  surFermer: () => void;
  surEnregistrer: (privilege: Privilege, portees: Portee[]) => Promise<string | null>;
}

/** `_secteur` n'aide qu'à filtrer la seconde liste ; le serveur ne le reçoit pas. */
type Brouillon = Portee & { _secteur?: string };

export function Fenetre({
  compte, privileges, privilegesDePortee, privilegeParDefaut,
  domaines, secteurs, prestataires, surFermer, surEnregistrer,
}: Props) {
  const [privilege, setPrivilege] = useState<Privilege>(compte.privilege || privilegeParDefaut);
  const [portees, setPortees] = useState<Brouillon[]>(() => (compte.scopes || []).map((s) => ({ ...s })));
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const modePrestataire = privilege === 'PRESTATAIRE';

  const changerPrivilege = (p: Privilege) => {
    if ((privilege === 'PRESTATAIRE') !== (p === 'PRESTATAIRE')) setPortees([]);
    setPrivilege(p);
  };

  const modifier = (i: number, patch: Partial<Brouillon>) => setPortees(
    (av) => av.map((s, j) => (j === i ? { ...s, ...patch } : s)),
  );
  const retirer = (i: number) => setPortees((av) => av.filter((_, j) => j !== i));

  // Secteurs réellement porteurs de prestataires, par ordre alphabétique : en
  // proposer un vide ferait chercher dans une liste qui ne répondra pas.
  const secteursPrestataires = secteurs
    .filter((s) => prestataires.some((p) => p.secteur_id === s.id))
    .slice()
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom)));

  const retenus = new Set(portees.map((s) => s.prestataire_id).filter(Boolean));

  const enregistrer = async () => {
    // La portée d'un privilège « Prestataire » peut être vide : cela veut dire
    // « aucun accès », et c'est un réglage légitime. Une ligne **sans
    // organisme**, en revanche, est une saisie inachevée.
    if (modePrestataire && portees.some((s) => !s.prestataire_id)) {
      setErreur(dt('err_ligne_prestataire'));
      return;
    }
    if (!modePrestataire && portees.some((s) => !s.domaine_id)) {
      setErreur(dt('err_portee_domaine'));
      return;
    }
    // `flatMap` plutôt que `filter` puis `map` : le filtre ne prouve rien au
    // compilateur, qui refuse de reposer un champ qu'il tient pour peut-être
    // absent. Il a raison de ne pas me croire sur parole — c'est précisément ce
    // qu'on attend d'un typage, et `filter` suivi de `map` masquait la question.
    const aEnvoyer: Portee[] = modePrestataire
      ? portees.flatMap((s) => (s.prestataire_id ? [{ prestataire_id: s.prestataire_id }] : []))
      : portees.flatMap(({ _secteur: _ignore, ...s }) => (
        s.domaine_id && s.privilege ? [s] : []
      ));

    setEnCours(true);
    const message = await surEnregistrer(privilege, aEnvoyer);
    setEnCours(false);
    if (message) setErreur(message);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) surFermer(); }}
    >
      <div className="modal dr-modal" style={{ maxWidth: '660px' }}>
        <div className="modal-header">
          <h3>{dt('modal_titre', compte.fullName)}</h3>
          <button
            type="button"
            className="btn-icon"
            onClick={surFermer}
            style={{ color: '#fff' }}
            aria-label={dt('fermer')}
            title={dt('fermer')}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="dr-user-line">
            {compte.email} · {dt('role_portail_court')} : {compte.role}
          </p>

          <div className="form-group">
            <label className="form-label">{dt('col_privilege_general')}</label>
            <div className="dr-radio-list">
              {privileges.map((p) => (
                <label key={p} className={`dr-radio ${privilege === p ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="drPriv"
                    value={p}
                    checked={privilege === p}
                    onChange={() => changerPrivilege(p)}
                  />
                  <span className="dr-radio-text">
                    <strong>
                      {libellePrivilege(p)}
                      {p === privilegeParDefaut && (
                        <em style={{ fontWeight: 400, fontSize: '.7rem' }}>{` ${dt('par_defaut')}`}</em>
                      )}
                    </strong>
                    <span className="dr-radio-desc">{descriptionPrivilege(p)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {modePrestataire ? (
            <div className="form-group">
              <label className="form-label">{dt('portee_prestataires')}</label>
              <p className="dr-hint">{dt('hint_prestataires')}</p>
              {portees.length > 0 && (
                <div className="dr-prest-head">
                  <span>{dt('col_secteur')}</span><span>{dt('col_prestataire')}</span><span />
                </div>
              )}
              {portees.map((s, i) => {
                const secteur = s._secteur
                  || prestataires.find((p) => p.id === s.prestataire_id)?.secteur_id
                  || '';
                // Un organisme déjà retenu ailleurs n'est plus proposé : deux
                // lignes pour le même ne veulent rien dire.
                const ailleurs = new Set(
                  portees.filter((_, j) => j !== i).map((x) => x.prestataire_id).filter(Boolean),
                );
                const choix = prestataires
                  .filter((p) => !secteur || p.secteur_id === secteur)
                  .filter((p) => !ailleurs.has(p.id));
                return (
                  <div className="dr-prest-row" key={i}>
                    <select
                      className="form-control"
                      value={secteur}
                      onChange={(e) => modifier(i, { _secteur: e.target.value, prestataire_id: '' })}
                    >
                      <option value="">{dt('tous_secteurs')}</option>
                      {secteursPrestataires.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.code ? `${sc.code} — ${sc.nom}` : sc.nom}
                        </option>
                      ))}
                    </select>
                    <select
                      className="form-control"
                      value={s.prestataire_id || ''}
                      onChange={(e) => modifier(i, { prestataire_id: e.target.value })}
                    >
                      <option value="">{dt('choisir_prestataire')}</option>
                      {choix.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => retirer(i)}
                      title={dt('retirer_prestataire')}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setPortees((av) => [...av, { prestataire_id: '', _secteur: '' }])}
              >
                {dt('ajouter_prestataire')}
              </button>
              <p className="dr-hint">{dt('prestataires_retenus', retenus.size)}</p>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">{dt('portees_particulieres')}</label>
              <p className="dr-hint">{dt('hint_portees')}</p>
              {portees.length > 0 && (
                <div className="dr-scope-head">
                  <span>{dt('col_domaine')}</span><span>{dt('col_secteur')}</span>
                  <span>{dt('col_privilege')}</span><span />
                </div>
              )}
              {portees.map((s, i) => (
                <div className="dr-scope-row" key={i}>
                  <select
                    className="form-control"
                    value={s.domaine_id || ''}
                    onChange={(e) => modifier(i, { domaine_id: e.target.value, secteur_id: '' })}
                  >
                    <option value="">{dt('choisir_domaine')}</option>
                    {domaines.map((dm) => <option key={dm.id} value={dm.id}>{dm.nom}</option>)}
                  </select>
                  <select
                    className="form-control"
                    value={s.secteur_id || ''}
                    disabled={!s.domaine_id}
                    onChange={(e) => modifier(i, { secteur_id: e.target.value })}
                  >
                    <option value="">{dt('tout_domaine')}</option>
                    {secteurs
                      .filter((x) => x.domaine_id === s.domaine_id)
                      .map((sc) => <option key={sc.id} value={sc.id}>{sc.nom}</option>)}
                  </select>
                  <select
                    className="form-control"
                    value={s.privilege || privilegeParDefaut}
                    onChange={(e) => modifier(i, { privilege: e.target.value as Privilege })}
                  >
                    {privilegesDePortee.map((p) => (
                      <option key={p} value={p}>
                        {p === 'AUCUN' ? dt('aucun_pas_acces') : libellePrivilege(p)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => retirer(i)}
                    title={dt('retirer_portee')}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setPortees((av) => [
                  ...av, { domaine_id: '', secteur_id: '', privilege: privilegeParDefaut },
                ])}
              >
                {dt('ajouter_portee')}
              </button>
            </div>
          )}

          <div id="drModalError" className="dr-error">{erreur}</div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={surFermer}>{dt('annuler')}</button>
          <button type="button" className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {dt('enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}
