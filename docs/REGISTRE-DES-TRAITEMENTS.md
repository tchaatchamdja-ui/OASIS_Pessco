# Registre des traitements de données à caractère personnel

**Responsable de traitement :** chaque AAC pour son instance nationale — à désigner
formellement (voir « Ce que ce registre n'établit pas »).
**Établi le :** 26 septembre 2026
**Fondement :** fiche technique URSAC/GT2 du 2 août 2026, §5.2 — *« un registre des
traitements est établi par module dès la phase 0 »*.
**Cadre :** Convention de Malabo ; Acte additionnel CEDEAO A/SA.1/01/10 ; lois nationales des
huit États membres ; RGPD comme référentiel de bonnes pratiques.

**Mise à jour :** ce registre est tenu à jour avec le code. Un contrôle automatique
(`tests/smoke/taille.smoke.js`) échoue si un module monté n'y figure pas — le registre ne
peut donc pas prendre du retard en silence.

---

## Comment lire les durées

Les durées ci-dessous sont celles que le code applique, et non des intentions : elles sont
déclarées dans `src/retention.js`, surchargeables au paramétrage, et consultables en service
sur `GET /api/retention`. Trois actions existent :

| Action | Effet |
|---|---|
| **purge** | Les entrées échues sont retirées. |
| **archive** | Les entrées échues sortent dans un fichier horodaté ; l'original reste entier. Seule action possible sur un journal chaîné — une purge romprait la chaîne SHA-256 du §F.3. |
| **conserver** | Aucune action automatique. L'échéance est signalée ; l'effacement reste une décision de l'autorité. |

---

## T-01 — Gestion des comptes et des accès

| | |
|---|---|
| **Finalité** | Authentifier les agents, leur attribuer des droits par module et par instance, tenir la traçabilité des accès. Mission de supervision de la sécurité aérienne (TDR §C.2, §F.3). |
| **Personnes concernées** | Agents des AAC, agents de l'URSAC, agents des organismes surveillés (comptes prestataires). |
| **Données** | Identifiant (courriel), nom, prénom, téléphone, photo, rôle, instance de rattachement, empreinte du mot de passe (scrypt), historique des cinq dernières empreintes, horodatage des échecs de connexion. |
| **Destinataires** | Super-administrateurs et administrateurs de l'AAC concernée. Le super-administrateur régional accède à toutes les instances. |
| **Conservation** | Durée du compte. L'effacement est possible à tout moment — `DELETE /api/users/:username`, réservé au super-administrateur, confirmé par son propre mot de passe. Il emporte l'identité, la fiche de personnel et les sessions ; il laisse les actes de surveillance et le journal d'audit, qui ne sont pas des données de confort. |
| **Sécurité** | scrypt ; politique de 12 caractères et complexité ; changement imposé à la première connexion ; blocage après 5 échecs ; session unique ; expiration après 30 minutes ; MFA par code à usage unique. |
| **Collection** | `users` |

## T-02 — Journal d'audit inaltérable

| | |
|---|---|
| **Finalité** | Tracer les actes d'autorité et, depuis septembre 2026, les **consultations** de données personnelles sensibles (fiche §5.2). Répondre à l'exigence d'inaltérabilité du TDR §F.3. |
| **Personnes concernées** | Tout agent agissant dans l'application, et toute personne dont le dossier est consulté ou modifié. |
| **Données** | Identifiant de l'agent, horodatage, verbe, détail de l'acte, empreinte SHA-256 de l'entrée précédente. Pour une consultation : la nature de la donnée et le dossier consulté. |
| **Destinataires** | Super-administrateurs et administrateurs. |
| **Conservation** | **10 ans, en archivage — jamais en purge.** Retirer une entrée romprait la chaîne et détruirait la garantie même du traitement. Le paramétrage ne peut pas demander cette purge : elle est refusée, et le refus est dit. |
| **Sécurité** | Ajout seul (JSON Lines) ; chaînage SHA-256 vérifiable par `GET /api/audit/verify` ; horodatage vérifié contre un serveur de temps SNTP lorsqu'il est déclaré, et **signalé comme non vérifié** lorsqu'il ne l'est pas. |
| **Collections** | `audit`, `module_audit` |

## T-03 — Référentiel du personnel de surveillance

| | |
|---|---|
| **Finalité** | Affecter les inspecteurs aux activités de surveillance selon leurs qualifications et spécialités. C'est le « dossier de formation » visé au §5 de la fiche. |
| **Personnes concernées** | Inspecteurs et agents techniques des AAC. |
| **Données** | Nom, prénom, courriel, téléphone, compte rattaché, qualifications, spécialités, affectations. |
| **Destinataires** | Agents de l'AAC ayant accès aux modules de surveillance. |
| **Conservation** | Durée de l'affectation. Effacé avec le compte (T-01). |
| **Sécurité** | Accès soumis à authentification ; **toute consultation est journalisée** (T-02), y compris l'export nominatif. |
| **Collection** | `referentiels.inspecteurs` |

## T-04 — Journal des envois de messages

| | |
|---|---|
| **Finalité** | Prouver la bonne remise d'un code à usage unique ou d'un mot de passe temporaire, et diagnostiquer une panne de messagerie. |
| **Personnes concernées** | Destinataires des messages — agents de l'application. |
| **Données** | Adresse du destinataire, objet, horodatage, statut, erreur éventuelle. **Le corps d'un message porteur d'un secret n'est pas conservé** : il est remplacé à l'enregistrement. Deux mots de passe temporaires antérieurs à cette règle ont été purgés le 25 septembre 2026. |
| **Destinataires** | Super-administrateurs. |
| **Conservation** | **90 jours, en purge.** Au-delà d'un trimestre, ce journal ne prouve plus rien et ne fait que conserver des adresses. |
| **Sécurité** | Un contrôle de source échoue si un message porteur d'un secret est construit sans le drapeau qui en fait retirer le corps. |
| **Collection** | `emails` |

## T-05 — Authentification multifacteur

| | |
|---|---|
| **Finalité** | Second facteur d'authentification (TDR §F.3, annexe 2). |
| **Personnes concernées** | Agents se connectant à l'application. |
| **Données** | Identifiant, canal d'envoi, adresse masquée, empreinte du code, échéance, nombre de tentatives. |
| **Destinataires** | Aucun — usage interne au mécanisme. |
| **Conservation** | **1 jour, en purge.** Un code vaut dix minutes ; au-delà d'un jour le défi est mort depuis longtemps. |
| **Collection** | `mfa_challenges` |

## T-06 — Sessions

| | |
|---|---|
| **Finalité** | Maintenir l'état d'authentification entre deux requêtes. |
| **Personnes concernées** | Agents connectés. |
| **Données** | Jeton de session, identifiant, horodatage de dernière activité. |
| **Destinataires** | Aucun. |
| **Conservation** | **1 jour, en purge.** Expiration fonctionnelle à 30 minutes d'inactivité. |
| **Collection** | `sessions` |

## T-07 — Contacts des organismes surveillés (module RAMP)

| | |
|---|---|
| **Finalité** | Adresser les constats d'inspection et les demandes d'action corrective aux interlocuteurs désignés par l'exploitant. |
| **Personnes concernées** | Salariés et représentants des exploitants et organismes surveillés. |
| **Données** | Nom, prénom, fonction, courriel, téléphone, organisme de rattachement. |
| **Destinataires** | Agents de l'AAC ayant accès au module RAMP. |
| **Conservation** | Durée de la relation de surveillance — action **conserver**. |
| **Sécurité** | **Toute consultation est journalisée** (T-02), y compris l'export nominatif au format tableur. |
| **Collection** | `ramp.contacts` |

---

## Traitements portés par les modules métier

Ces cinq modules traitent des **actes d'autorité**, non des personnes en tant que telles : les
personnes n'y apparaissent qu'en qualité d'agent responsable d'un acte ou de signataire.

| Réf. | Module | Finalité | Personnes concernées | Conservation |
|---|---|---|---|---|
| **T-08** | **PLAN** — Plans de Surveillance (D.6) | Programmer les activités de surveillance et leurs cycles | Inspecteurs responsables d'activité | 10 ans, **conserver** |
| **T-09** | **PR** — Profils de Risque (D.6) | Évaluer le risque porté par chaque exploitant, pour fonder la programmation | Agents évaluateurs | 10 ans, **conserver** |
| **T-10** | **SURV** — Exécution de la Surveillance (D.7.1) | Conduire les activités, relever les constatations, suivre les plans d'actions correctives | Inspecteurs, signataires des rapports, interlocuteurs des organismes | 10 ans, **conserver** |
| **T-11** | **CARE** — Mesures d'Application (D.7.2) | Qualifier les manquements et prendre les mesures d'application | Agents instructeurs et décideurs | 10 ans, **conserver** |
| **T-12** | **RAMP** — Inspections sur aire de trafic (D.8) | Conduire les inspections SAFA/SANA et suivre les écarts | Inspecteurs, équipages et personnels cités dans un constat | 10 ans, **conserver** |
| **T-13** | **DROITS** — Gestion des Droits (socle) | Attribuer les privilèges par module | Agents titulaires d'un compte | Durée du compte |

**Pourquoi « conserver » et non une purge automatique.** La durée légale de conservation des
actes de surveillance n'est fixée ni par les TDR ni par la fiche. Un logiciel qui effacerait
de lui-même un acte d'autorité commettrait une faute, non une fonctionnalité. L'échéance est
signalée sur `GET /api/retention` ; la décision appartient à l'AAC. **Cette durée doit être
arrêtée par le GT2** — c'est l'une des suites de ce registre.

---

## Transferts hors de l'État responsable

| Transfert | État |
|---|---|
| **Vers le serveur central UEMOA** | Prévu par les TDR (§F.2) et la fiche (§3.3). **Non implémenté** — `replication.enabled: false`, aucun code. Lorsqu'il le sera, chaque partage de données nominatives devra être explicitement autorisé par l'AAC d'origine et journalisé (fiche §5.2). |
| **Vers l'OACI (iSTARs) et l'OLF** | Prévus. **Non implémentés.** |
| **Instance de démonstration hébergée à Francfort** | **Effectif, et sans base juridique documentée.** Voir ci-dessous. |

---

## Ce que ce registre n'établit pas

Un registre des traitements est un document du responsable de traitement. Celui-ci décrit
fidèlement ce que le logiciel fait ; il ne peut pas tenir lieu des actes qui relèvent de
l'autorité. Restent à produire, et aucun développement ne les remplace :

1. **La désignation formelle du responsable de traitement** pour chaque instance nationale.
2. **La désignation d'un délégué à la protection des données** par AAC, et d'un DPO de
   coordination à la Commission.
3. **L'analyse d'impact (AIPD)** préalable à la mise en production de chaque module traitant
   des données sensibles — obligatoire pour le module médical lorsqu'il sera écrit.
4. **L'accord-cadre de partage de données** entre les huit États et la Commission.
5. **La procédure de notification des violations** aux autorités nationales de contrôle.
6. **La base juridique du transfert vers Francfort**, ou le rapatriement de l'hébergement.
7. **La durée légale de conservation des actes de surveillance**, aujourd'hui posée à dix ans
   par défaut faute de décision.

Ces sept points sont recensés au §2.1 de [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md) comme étant
hors de portée du code.
