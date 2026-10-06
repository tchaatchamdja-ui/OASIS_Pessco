// L'écran, et ce qu'il tient.
//
// Trois états qui ne sont pas du même ordre, et c'est pour cela qu'ils sont
// distincts : l'amorçage (en cours, refusé, prêt), les données du module, et ce
// que l'agent est en train de faire. Les mêler aurait rendu « en cours de
// chargement » et « aucun compte » indiscernables — ce que l'écran d'avant
// évitait déjà, en répondant par un message plutôt que par un vide.
import { useCallback, useEffect, useState } from 'react';
import { Coquille, type Page } from './Coquille';
import { Privileges } from './Privileges';
import { Fenetre } from './Fenetre';
import { Audit } from './Audit';
import { appliquerTheme, dt, poserEtatPartage, poserLangue, themeEnregistre } from './socle';
import {
  FILTRES_VIDES, lireComptes, lireContexte, lireJournal, lireRefs, poserDroits,
  type CompteDuModule, type Contexte, type FiltresAudit, type Journal, type Portee,
  type Prestataire, type Privilege, type Reference, type Secteur,
} from './api';

interface Chargees {
  contexte: Contexte;
  comptes: CompteDuModule[];
  domaines: Reference[];
  secteurs: Secteur[];
  prestataires: Prestataire[];
}

type Amorcage =
  | { etat: 'chargement' }
  /** Le serveur refuse, ou le compte n'a pas le rôle : on le dit, on ne reste pas vide. */
  | { etat: 'refus'; message: string }
  | { etat: 'pret'; donnees: Chargees };

const JOURNAL_VIDE: Journal = { entries: [], total: 0, integrity: null };

export function App() {
  const [amorcage, setAmorcage] = useState<Amorcage>({ etat: 'chargement' });
  const [page, setPage] = useState<Page>('privileges');
  const [theme, setTheme] = useState(themeEnregistre);
  const [langue, setLangue] = useState(() => localStorage.getItem('pr_lang') || 'fr');
  const [replie, setReplie] = useState(() => localStorage.getItem('pr_sidebar') === 'true');

  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');
  const [enEdition, setEnEdition] = useState<string | null>(null);

  const [journal, setJournal] = useState<Journal>(JOURNAL_VIDE);
  const [filtresAudit, setFiltresAudit] = useState<FiltresAudit>(FILTRES_VIDES);

  // ── Amorçage ──
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const contexte = await lireContexte();
        if (!vivant) return;
        // Le compte est retenu pour la barre supérieure commune, qui le lit là.
        localStorage.setItem('pr_user', JSON.stringify({
          id: contexte.user.username,
          nom: contexte.user.nom || contexte.user.username,
          prenom: contexte.user.prenom || '',
          role: contexte.user.role,
        }));
        if (!['SUPERADMIN', 'ADMIN'].includes(contexte.user.role)) {
          setAmorcage({ etat: 'refus', message: dt('reserve_admin') });
          return;
        }
        const [refs, comptes] = await Promise.all([lireRefs(), lireComptes()]);
        if (!vivant) return;
        setAmorcage({
          etat: 'pret',
          donnees: {
            contexte,
            comptes,
            domaines: refs.domaines,
            secteurs: refs.secteurs,
            prestataires: refs.prestataires || [],
          },
        });
      } catch (e) {
        if (!vivant) return;
        const message = e instanceof Error ? e.message : String(e);
        setAmorcage({
          etat: 'refus',
          message: message.includes('reserve_autorite')
            ? dt('reserve_autorite')
            : dt('module_indisponible', message),
        });
      }
    })();
    return () => { vivant = false; };
  }, []);

  // Le thème et la rétraction sont posés sur le document : la feuille de style
  // commune et `module-chrome.js` les lisent là, et non dans React.
  useEffect(() => { appliquerTheme(theme); }, [theme]);
  useEffect(() => {
    localStorage.setItem('pr_sidebar', String(replie));
    document.body.classList.toggle('app-sidebar-collapsed', replie);
  }, [replie]);

  const changerLangue = (l: string) => {
    localStorage.setItem('pr_lang', l);
    poserLangue(l);
    // Le répertoire doit voir la langue **avant** le rendu qui suit, sinon
    // l'écran se redessine dans l'ancienne et il faut y revenir pour la voir
    // changer. `localStorage` est écrit juste au-dessus, mais le répertoire ne
    // le relit pas : il l'a lu à son chargement. C'est le seul usage qui reste
    // à cet appel.
    poserEtatPartage(l);
    setLangue(l);
  };

  const chargerJournal = useCallback(async (filtres: FiltresAudit) => {
    setFiltresAudit(filtres);
    try {
      setJournal(await lireJournal(filtres));
    } catch {
      // Un journal illisible n'est pas un journal vide : le bandeau dira que la
      // chaîne n'a pas pu être vérifiée, ce qui n'est pas « elle est rompue ».
      setJournal(JOURNAL_VIDE);
    }
  }, []);

  const allerA = async (p: Page, compte?: string) => {
    if (p === 'audit') await chargerJournal({ ...FILTRES_VIDES, user: compte || '' });
    setPage(p);
  };

  if (amorcage.etat === 'chargement') {
    // La légende est **le texte de l'élément**, non une clé de ce module :
    // `oasis-loader` lit le contenu, le traduit par sa propre table — qui porte
    // « Chargement… » dans les trois langues — et le remplace par le globe.
    //
    // Il y avait ici `dt('chargement')`, **appelée et absente de la table**
    // depuis la réécriture du 3 octobre : l'écran annonçait « chargement », en
    // français comme en anglais comme en portugais. Le typage des clés
    // (`./i18n.ts`) l'a trouvée, et aucun contrôle ne l'aurait fait — la suite
    // « parcours » attend que l'attente s'en aille, non qu'elle se nomme.
    return <div data-oasis-loader>Chargement…</div>;
  }
  if (amorcage.etat === 'refus') {
    return <div style={{ padding: '2rem', color: '#991b1b' }}>{amorcage.message}</div>;
  }

  const { contexte, comptes, domaines, secteurs, prestataires } = amorcage.donnees;
  const compteEnEdition = enEdition
    ? comptes.find((u) => u.username === enEdition) || null
    : null;

  // L'enregistrement rend le message d'erreur à la fenêtre, plutôt que de
  // l'afficher lui-même : c'est elle qui sait où le mettre, et elle reste
  // ouverte pour que l'agent corrige sans ressaisir.
  const enregistrer = async (privilege: Privilege, portees: Portee[]): Promise<string | null> => {
    if (!enEdition) return null;
    try {
      await poserDroits(enEdition, privilege, portees);
      // La liste est **relue au serveur**, et non devinée : le serveur y applique
      // ses propres règles, et ce que l'écran montre doit être ce qui est
      // enregistré.
      const relus = await lireComptes();
      setAmorcage({ etat: 'pret', donnees: { ...amorcage.donnees, comptes: relus } });
      setEnEdition(null);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  return (
    <Coquille
      compte={contexte.user}
      page={page}
      theme={theme}
      langue={langue}
      replie={replie}
      surPage={(p) => { void allerA(p); }}
      surTheme={setTheme}
      surLangue={changerLangue}
      surReplier={() => setReplie((v) => !v)}
    >
      {page === 'audit' ? (
        <Audit
          journal={journal}
          filtres={filtresAudit}
          actions={contexte.auditActions || {}}
          comptes={comptes}
          langue={langue}
          surFiltre={(cle, valeur) => { void chargerJournal({ ...filtresAudit, [cle]: valeur }); }}
          surReinitialiser={() => { void chargerJournal(FILTRES_VIDES); }}
        />
      ) : (
        <Privileges
          comptes={comptes}
          privileges={contexte.privileges}
          domaines={domaines}
          secteurs={secteurs}
          prestataires={prestataires}
          recherche={recherche}
          filtre={filtre}
          surRecherche={setRecherche}
          surFiltre={setFiltre}
          surModifier={setEnEdition}
          surJournal={(u) => { void allerA('audit', u); }}
        />
      )}

      {compteEnEdition && (
        <Fenetre
          compte={compteEnEdition}
          privileges={contexte.privileges}
          privilegesDePortee={contexte.scopePrivileges}
          privilegeParDefaut={contexte.defaultPrivilege}
          domaines={domaines}
          secteurs={secteurs}
          prestataires={prestataires}
          surFermer={() => setEnEdition(null)}
          surEnregistrer={enregistrer}
        />
      )}
    </Coquille>
  );
}
