# OASIS — diagrammes UML

Vue d'architecture de l'application, tirée du code (août 2026).
Quatre diagrammes : composants, classes, états du circuit de surveillance, séquence d'un déclenchement.

Les blocs Mermaid se rendent dans GitHub, GitLab et VS Code (extension *Markdown Preview Mermaid*).

---

## 1. Diagramme de composants

Ce que le déploiement contient réellement : **un seul processus Node**, qui sert l'API et le front,
et **un seul port** (4750). Les modules sont découverts au démarrage et montés sur le même serveur
Express ; ils communiquent par un bus de services en mémoire, jamais par leurs fichiers de données.

```mermaid
graph TB
    subgraph Navigateur["Navigateur — front vanilla JS, sans build"]
        Portail["Portail<br/>public/index.html<br/>cartes de modules, configuration"]
        FrontPLAN["Module PLAN<br/>public/modules/planification"]
        FrontPR["Module PR<br/>public/modules/profil_risque"]
        FrontSURV["Module SURV<br/>public/modules/execution<br/>(portage PESSCO + processus)"]
        Partage["public/shared<br/>chrome de module, utilitaires"]
    end

    subgraph Serveur["Processus Node — Express 4, port 4750"]
        direction TB
        Socle["server.js<br/>35 routes : session, comptes,<br/>configuration, référentiels, audit"]
        Loader["module_loader.js<br/>découvre src/modules/*/module.json<br/>monte les routes, expose menus et cartes"]
        Bus(["services.js<br/>bus publish / call"])

        subgraph Modules["Modules métier"]
            DROITS["DROITS<br/>privilèges par module et portées"]
            PLAN["PLAN — Planification<br/>plans, activités, cycle de validation"]
            PR["PR — Profils de risque<br/>indicateurs, évaluations, indices"]
            SURV["SURV — Exécution de la surveillance<br/>notifications, dossiers,<br/>constatations, rapports, états"]
        end

        subgraph Communs["Services transverses du socle"]
            Auth["auth.js<br/>scrypt, sessions, verrouillage"]
            MFA["mfa.js"]
            Droits["module_rights.js<br/>privilège × domaine × secteur × prestataire"]
            Audit["audit.js<br/>journal chaîné SHA-256"]
            Refs["referentiels.js"]
            Mail["email.js — SMTP / file d'attente"]
            Store["store.js<br/>JSON, cache mémoire, écriture atomique"]
        end
    end

    Donnees[("data/*.json<br/>users, referentiels, audit,<br/>planification, profil_risque, execution")]
    SMTP[["Serveur SMTP"]]
    PG[("PostgreSQL 16<br/>cible de production — non branché")]

    Portail -->|"fetch /api"| Socle
    FrontPLAN -->|"/api/m/planification"| PLAN
    FrontPR -->|"/api/m/profil-risque"| PR
    FrontSURV -->|"/api/m/execution"| SURV
    Navigateur -.->|"cookie de session HttpOnly"| Socle

    Loader --> DROITS & PLAN & PR & SURV
    Socle --> Loader
    Modules --> Communs
    Socle --> Communs
    Store --> Donnees
    Mail --> SMTP
    Store -.->|"remplacement prévu"| PG

    PLAN -->|"publie PLAN.plansValides"| Bus
    PR -->|"publie PR.riskProfiles"| Bus
    Bus -->|"consommé par SURV"| SURV
    Bus -->|"consommé par PLAN"| PLAN

    style Bus fill:#1e3a8a,color:#fff
    style Donnees fill:#334155,color:#fff
    style PG stroke-dasharray: 5 5
```

**À retenir** — le couplage entre modules passe exclusivement par le bus : SURV lit les plans validés
via `services.callOr('PLAN.plansValides', [])`, jamais `data/planification.json`. C'est ce qui rend
l'activation d'un module indépendante des autres.

---

## 2. Diagramme de classes

Entités telles qu'elles existent dans les fichiers de données, avec leurs attributs porteurs de sens
métier (les champs d'horodatage et d'auteur sont omis sauf lorsqu'ils portent une règle).

```mermaid
classDiagram
    direction LR

    class Utilisateur {
        +String username
        +String nom, prenom, email
        +Role role
        +String prestataire_id
        +String[] modules
        +String[] droits_surv
        +String salt, hash
        +bool active, locked
        +int failedAttempts
        +authentifier()
        +verrouiller()
    }

    class DroitsModule {
        +String module
        +String username
        +Privilege privilege
        +Portee[] scopes
        +peut(action, domaine, secteur)
    }

    class Portee {
        +String domaine_id
        +String secteur_id
        +String prestataire_id
    }

    class Prestataire {
        +String id, nom, trigramme
        +String domaine_id, secteur_id
        +String point_focal, email_point_focal
    }

    class Secteur {
        +String id, code, nom
        +String domaine_id
    }

    class Domaine {
        +String id, code, nom
    }

    class Plan {
        +String id, titre, reference
        +int annee
        +String domaine_id, secteur_id
        +StatutPlan statut
        +int version
        +String parent_plan_id
        +soumettre() valider() rejeter()
    }

    class Activite {
        +String id, objet, titre
        +String prestataire_id, secteur_id
        +String type_supervision_id
        +String mode_supervision_id
        +Date date_debut, date_fin
        +String responsable_id
        +String[] themes_couverts
        +Priorite priorite
    }

    class Notification {
        +String id, reference
        +String activite_id, plan_id
        +String prestataire_id
        +String objet_activite
        +String perimetre_activite
        +Date date_activite, date_fin_effective
        +StatutNotification statut
        +bool hors_plan
        +bool arret, archive
        +String reference_activite
        +soumettre() valider() transmettre()
        +confirmer()
    }

    class Echange {
        +String id
        +String notification_id
        +String contenu
        +String auteur
        +Date date
    }

    class Dossier {
        +String id, reference
        +String notification_id
        +StatutDossier statut
        +Etape current_step
        +bool realisation_closed
        +bool redaction_closed
        +bool archive
        +String final_reference
        +cloturerRealisation()
        +soumettreRapport()
        +cloturer()
    }

    class Rapport {
        +String id, reference
        +String dossier_id
        +int version
        +StatutRapport statut
        +String contenu
        +String observations_validation
        +Date date_validation, date_transmission
        +valider() amender() transmettre()
    }

    class Constatation {
        +String id, reference
        +String dossier_id, prestataire_id
        +Criticite criticite
        +String description
        +String recommandation
        +String actions_correctives
        +Date date_due_cloture
        +StatutConstatation statut
        +soumettrePAC() solder()
    }

    class Evaluation {
        +String id
        +String prestataire_id
        +String secteur_id
        +Note[] notes_conf
        +Note[] notes_perf
        +Note[] notes_comp
        +Resultat resultats
        +String[] evaluateurs_designes
    }

    class EntreeAudit {
        +String ts, user, action
        +Object details
        +String prevHash
        +String hash
        +verifierChaine()
    }

    Utilisateur "1" --> "0..*" DroitsModule : reçoit
    DroitsModule "1" *-- "0..*" Portee
    Utilisateur "0..*" --> "0..1" Prestataire : rattaché à
    Prestataire "0..*" --> "1" Secteur
    Secteur "0..*" --> "1" Domaine

    Plan "1" *-- "0..*" Activite : contient
    Activite "1" --> "0..1" Notification : déclenche
    Notification "1" --> "0..*" Echange
    Notification "1" --> "0..1" Dossier : ouvre à la confirmation
    Dossier "1" --> "0..*" Rapport : versions successives
    Dossier "1" --> "0..*" Constatation
    Activite "0..*" --> "1" Prestataire
    Notification "0..*" --> "1" Prestataire
    Evaluation "0..*" --> "1" Prestataire : profil de risque
    Evaluation ..> Plan : oriente la planification

    note for Notification "hors_plan = activité déclenchée\nsans activité planifiée"
    note for Rapport "l'amendement d'un rapport validé\nremet ses constatations en brouillon"
    note for EntreeAudit "append-only : chaque entrée\nchaîne le hash de la précédente"
```

---

## 3. Diagramme d'états — circuit d'une activité de surveillance

Le cœur métier du module SURV. Chaque transition correspond à une action utilisateur confirmée par
une boîte de dialogue, et à une route serveur qui vérifie les droits et l'état de départ.

```mermaid
stateDiagram-v2
    direction TB
    [*] --> Planifiee : activité inscrite dans un plan validé

    Planifiee --> Notification : déclencher

    state Notification {
        direction LR
        [*] --> Brouillon
        Brouillon --> Soumise : soumettre
        Soumise --> Brouillon : rejeter (motif)
        Soumise --> Validee : valider
        Validee --> Brouillon : renvoyer à la soumission
        Validee --> [*] : transmettre au prestataire
    }

    Notification --> Confirmation : notification transmise
    Confirmation --> Realisation : confirmer l'activité<br/>(dates + périmètre → dossier ouvert)

    state Realisation {
        [*] --> ExecutionTerrain
        ExecutionTerrain --> [*] : clôturer l'exécution
    }

    Realisation --> ElaborationRapport : « Rédiger Rapport »

    state ElaborationRapport {
        [*] --> Redaction
        Redaction --> [*] : soumettre le rapport
    }

    ElaborationRapport --> ValidationRapport : rapport soumis
    ValidationRapport --> ElaborationRapport : renvoyer pour correction
    ValidationRapport --> TransmissionRapport : valider<br/>(référence définitive attribuée)

    TransmissionRapport --> ElaborationRapport : amender<br/>(constatations → brouillon)
    TransmissionRapport --> Cloture : transmettre puis clôturer

    Cloture --> Archivee : archiver

    Realisation --> Arretee : arrêter le processus
    ElaborationRapport --> Arretee : arrêter le processus
    ValidationRapport --> Arretee : arrêter le processus
    Arretee --> Realisation : reprendre
    Arretee --> Archivee : archiver

    Archivee --> [*]

    note right of Arretee
        Réservé aux rôles SUPERADMIN et
        ADMIN AAC, dans leur portée
        domaine / secteur. Motif obligatoire.
    end note

    note right of Cloture
        La clôture exige un rapport
        effectivement transmis.
    end note
```

### Délais associés (Paramètres → Délais)

| Étape | Échéance par défaut | Point de départ |
|---|---|---|
| Déclenchement | 30 j **avant** | date de début de l'activité |
| Validation de la notification | 3 j | soumission |
| Confirmation par le prestataire | 7 j | transmission |
| Soumission du rapport | 15 j | fin de l'activité |
| Validation du rapport | 7 j | soumission du rapport |
| Transmission du rapport | 5 j | validation |
| Archivage du dossier | 30 j | clôture |

---

## 4. Diagramme de séquence — du déclenchement à la transmission

Un cas nominal, avec les contrôles de droits effectivement présents dans le code.

```mermaid
sequenceDiagram
    autonumber
    actor Inspecteur as Inspecteur (AAC)
    actor Validateur as Validateur (AAC)
    participant Front as Front SURV<br/>exec-processus.js
    participant API as Express<br/>routes-notifications.js
    participant Droits as module_rights.js
    participant Refs as references.js
    participant Store as store.js
    participant Audit as audit.js
    actor Prestataire

    Inspecteur->>Front: clic sur une activité planifiée
    Front->>API: GET /api/m/execution/plans-valides
    API->>API: services.callOr('PLAN.plansValides')
    API-->>Front: activités non encore déclenchées

    Inspecteur->>Front: « Déclencher » puis saisie
    Front->>API: POST /notifications
    API->>Droits: canContribute(user, domaine, secteur)
    Droits-->>API: autorisé
    API->>Refs: suivante('notification', contexte)
    Refs->>Store: lit les références existantes
    Refs-->>API: NOTIF-2026-004
    API->>Store: insert(notifications)
    API->>Audit: journalise la création
    API-->>Front: 201 + référence

    Inspecteur->>Front: « Soumettre »
    Front->>API: PUT /notifications/:id/submit
    API-->>Front: statut = soumis

    Validateur->>Front: ouvre l'étape Validation
    alt observations à corriger
        Validateur->>Front: « Rejeter » + motif
        Front->>API: PUT /notifications/:id/reject
        API-->>Front: statut = brouillon (bandeau rouge côté initiateur)
    else conforme
        Validateur->>Front: « Valider »
        Front->>API: PUT /notifications/:id/validate
        API->>Droits: canValidate(...)
        API-->>Front: statut = valide
    end

    Inspecteur->>Front: « Transmettre » (dialogue de confirmation)
    Front->>API: PUT /notifications/:id/send
    API->>Store: statut = envoye, date_envoi, envoye_par
    API->>Audit: journalise la transmission
    API-->>Front: étape Confirmation ouverte
    Note over Prestataire: le prestataire voit la notification<br/>dans son espace et échange avec l'AAC

    Prestataire->>Front: message d'échange
    Front->>API: POST /notifications/:id/echanges
    API->>Droits: droit « echanges » confié au compte ?
    Droits-->>API: autorisé
    API-->>Front: fil mis à jour

    Inspecteur->>Front: « Confirmer l'activité »
    Front->>API: PUT /notifications/:id/validate-accord
    API->>Refs: suivante('activite', contexte)
    Refs-->>API: ACT-BJ-AIR-2026-001
    API->>Store: notification = acte + création du dossier
    API-->>Front: étape Réalisation ouverte
```

---

## Conventions de lecture

- **Rôles portail** : `SUPERADMIN`, `ADMIN` (Admin AAC), `AAC`, `ADMIN_PRESTATAIRE`, `PRESTATAIRE`.
- **Privilèges par module** : `GESTIONNAIRE`, `VALIDATEUR`, `CONTRIBUTEUR`, `LECTEUR`, plus `PRESTATAIRE` pour SURV — chacun assorti de portées domaine / secteur / prestataire.
- **Références** : composées à partir du modèle défini dans *Paramètres → Autres paramètres* (préfixe, code État issu du bigramme du portail, domaine, secteur, prestataire, année, mois, numéro d'ordre).
