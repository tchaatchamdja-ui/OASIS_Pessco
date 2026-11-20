# Processus du socle en BPMN 2.0

Ce dossier décrit le socle **tel que le code le met en œuvre au 20 novembre 2026**, non tel qu'il devrait être. Il contient un fichier BPMN 2.0 XML (avec son DI) et une description en texte par processus. Chaque étape et chaque règle y est rattachée au fichier et à la ligne qui l'imposent. Le code n'a pas été modifié pour l'écrire.

Ces diagrammes ne ferment pas le constat « moteur de workflow BPMN » de [CONFORMITE-FICHE-TECHNIQUE.md](../CONFORMITE-FICHE-TECHNIQUE.md) (ligne 83) : ils décrivent, ils n'exécutent rien (`isExecutable="false"`). Ils ne faussent pas non plus le contrôle de ce constat, qui ne cherche que dans `src` et `public` (ligne 200).

## Index

| Fichier | Processus | Déclencheur |
|---|---|---|
| [S1](S1-inscrire-entree-chainee.md) | Inscrire une entrée au journal chaîné (sous-processus) | tout acte journalisé |
| [S2](S2-controler-session.md) | Contrôler la session, `requireAuth` (sous-processus) | toute route protégée |
| [P1](P1-connexion-double-authentification.md) | Connexion et double authentification | formulaire de connexion |
| [P2](P2-session-expiree-reprise.md) | Session expirée et reprise | geste après inactivité |
| [P3](P3-ecriture-enregistrement.md) | Écriture d'un enregistrement (patron des modules) | écriture d'un module |
| [P4](P4-changement-instance-regardee.md) | Changement d'instance regardée | choix dans la barre supérieure |
| [P5](P5-attribution-privilege.md) | Attribution d'un privilège | enregistrement dans DROITS |
| [P6](P6-demarrage-verrou.md) | Démarrage du serveur et verrou | lancement du processus |
| [P7](P7-module-dans-le-portail.md) | Module dans le portail, dialogue par messages | clic sur une carte |
| [P8](P8-telechargement-piece.md) | Téléchargement d'une pièce | « Exporter » |
| [P9](P9-sauvegarde-sonde.md) | Sauvegarde et sonde | cron ; démarrage puis 24 h |

## Conventions

- **Pools** : l'humain (agent, super-administrateur, administrateur, exploitant) a son pool. OASIS en a un autre, avec les couloirs Portail, Module, Navigateur, Serveur, Magasin, Système de fichiers. Les échanges entre eux sont des flux de messages. En P7, portail et module sont deux pools, parce que ce sont deux fenêtres qui ne se parlent que par `postMessage`. Un service extérieur (messagerie) ou interrogé seulement (serveur, en P7) est une boîte noire.
- **Sous-processus** : S1 et S2 sont des processus appelables (`Proc_S1_Oasis`, `Proc_S2_Oasis`), référencés par des activités d'appel (`callActivity`). P2 appelle P1 par `Proc_P1_Oasis`.
- **Source** : chaque élément porte sa source dans `bpmn:documentation`. bpmn.io et Camunda Modeler l'affichent dans le panneau des propriétés.
- **Fins** : une fin par réponse distincte (code HTTP et code d'erreur). Les arrêts du processus Node (`exit(1)`) et du script sont des fins d'erreur BPMN.
- **Écarts** : chaque description se termine par les écarts entre le code et un processus bien formé. **[mesuré]** = constaté en exécutant le code ; **[lu]** = déduit de la lecture.

## Ouvrir un diagramme

Glisser le fichier `.bpmn` dans <https://demo.bpmn.io> ou l'ouvrir dans Camunda Modeler.

## Comment ces fichiers ont été produits et contrôlés

Les fichiers sont générés à partir d'une description compacte (nœuds placés par colonne et rangée ; DI et tracés calculés). Le générateur contrôle :
- les identifiants en double ;
- les flux qui sortent d'un pool ;
- les nœuds sans entrée ou sans sortie ;
- les superpositions ;
- les sorties de décision sans nom.

Une seconde passe, indépendante, relit le XML produit et vérifie :
- références des flux et des erreurs ;
- cohérence `incoming` / `outgoing` ;
- couloirs complets ;
- flux de messages entre pools différents, jamais sur une passerelle ;
- un élément DI pour chaque nœud, flux, couloir et pool.

Elle a été contre-éprouvée sur un fichier volontairement abîmé (DI ôté, référence cassée, entrée oubliée), et a signalé les trois défauts. `xmllint` confirme que les 11 fichiers sont bien formés.

Deux contrôles par les outils de bpmn.io, le 20 novembre 2026 :
- **`bpmn-moddle` 10.3.1** (méta-modèle BPMN 2.0) : les 11 fichiers se lisent et se réécrivent sans aucun avertissement. Contre-éprouvé : un élément inconnu et des références non résolues sont signalés. Il ne contrôle pas le type des attributs (`isExecutable="peut-etre"` passe).
- **`bpmn-js` 18.33.1**, dans Chromium sans fenêtre : les 11 fichiers s'importent sans avertissement et s'affichent. Le nombre de formes et d'arêtes rendues est égal à celui des nœuds, pools, couloirs et flux du modèle.

**Pas fait** : la validation contre le schéma XSD de l'OMG, qui demanderait de télécharger les schémas.

Le générateur, les descriptions compactes et le contrôleur ne sont pas dans le dépôt.

## Écarts relevés, par gravité

| | Écart | Processus |
|---|---|---|
| **[mesuré]** | Le renvoi du code MFA ne lie pas le défi à son compte : un défi valide permet d'en obtenir un pour un autre compte, et d'ouvrir sa session sans son mot de passe | P1 |
| **[mesuré]** | L'historique des mots de passe ne refuse aucune réutilisation, pas même du mot de passe courant | P1 |
| [lu] | Un fichier JSON illisible devient la valeur par défaut, puis est écrasé à l'écriture suivante | P3 |
| [lu] | `PUT` des droits sans contrôle d'instance : un ADMIN peut toucher un compte d'une autre AAC | P5 |
| [lu] | En mode PostgreSQL, la sauvegarde n'emporte pas les collections migrées ; `config/` n'est jamais archivé | P9 |
| [lu] | Archive interrompue sous son nom final ; rétention par l'âge seul ; aucune restauration écrite | P9 |
| [lu] | Sans MFA, session et `LOGIN` posés avant le refus pour instance désactivée ; `/api/login/mfa` ne revérifie ni instance ni blocage | P1 |
| [lu] | `locked` et `mustChange` ne sont pas vérifiés par `requireAuth` | S2 |
| [lu] | Audit du module non attendu, déduit du corps reçu ; audit du socle après l'écriture | P3, P5 |
| [lu] | Privilège vérifié hors de la transformation atomique ; pas de précondition de statut sur la route suivie | P3 |
| [lu] | Les droits de tous les modules s'inscrivent dans la chaîne de PLAN | P5 |
| [lu] | `can()` et `/me` lisent différemment un compte sans liste de modules | P5 |
| [lu] | Une session expirée pendant une coupure fait échouer toute la file hors ligne, sans rejeu après reconnexion | P2 |
| [lu] | Pas de reprise après reconnexion : la page et la saisie sont perdues | P2 |
| [lu] | Le 401 d'un téléchargement par navigation sort en JSON brut : `requireAuth` précède `pageDeRefus` | P8 |
| [lu] | Reprise d'un verrou périmé non atomique ; verrou vide lu comme périmé ; conteneur recréé refusé | P6 |
| [lu] | Choix d'instance par compte, non par session ; `instances` hors de la base | P4 |
| [lu] | Messages du module sans contrôle d'origine, cible `'*'` | P7 |
