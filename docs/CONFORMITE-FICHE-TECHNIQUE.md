# Conformité à la fiche technique URSAC/GT2

**Fiche de référence :** *Proposition d'architecture, d'organisation projet et de plan de
conception — Outil intégré de supervision de la sécurité de l'aviation civile, espace UEMOA*,
URSAC / Groupe de Travail 2, **2 août 2026**.

**Date du relevé :** 26 septembre 2026
**Objet :** dire, prescription par prescription, ce qui est tenu et ce qui ne l'est pas.
**Méthode :** chaque ligne est vérifiée dans le code, non dans la documentation du projet.
Les commandes de vérification sont données en fin de document.

**Le plan de correction est un document distinct :** [PLAN-CONFORMITE.md](PLAN-CONFORMITE.md).

> **Suivi.** La **vague 0** du plan est exécutée (26 septembre 2026) : horodatage vérifié,
> journalisation des consultations, durées de conservation et purge, registre des traitements,
> garde de pseudonymisation. Les lignes concernées portent la mention *(vague 0)*.
> [ADR-001](ADR-001-magasin-de-donnees.md) a été rouvert : la fiche spécifiait la réplication
> qu'il disait manquante.

---

## En un paragraphe

La fiche décrit une **plateforme assemblée à partir de briques d'infrastructure éprouvées** —
Keycloak, Camunda, MinIO, PostgreSQL, Prometheus, K3s. Ce qui a été livré est une
**application autonome qui réimplémente les fonctions de ces briques** en 18 024 lignes de
JavaScript serveur. L'intention fonctionnelle de la fiche est largement honorée ; les moyens
qu'elle prescrit le sont très peu. Sur les dix couches techniques du §3.2, **une est conforme**.
Sur les six contraintes structurantes du §2, **deux sont tenues**, deux le sont partiellement,
deux ne le sont pas.

Ce constat n'est pas un jugement sur la qualité du livré : l'application fonctionne, elle est
éprouvée par 702 contrôles automatiques, elle ne porte aucune vulnérabilité de dépendance et
son cloisonnement est posé au serveur. Il dit seulement que **le livré et la fiche décrivent
deux systèmes différents**, et qu'un auditeur qui compare l'un à l'autre le verra.

---

## §2 — Les six contraintes structurantes des TDR

| # | Contrainte | État | Ce qui est en place, ce qui manque |
|---|---|---|---|
| 1 | Souveraineté et cloisonnement par État | ◐ | Partitionnement **logique** par champ `instance` (`src/instances.js`), rigoureux et éprouvé. Ni instance par infrastructure, ni réplication vers le central. |
| 2 | **Modularité D.1–D.10, activation progressive** | ✓ | **Tenue, et bien tenue.** Manifestes par module (`src/modules/*/module.json`), chargeur dynamique (`module_loader.js`), bus de services (`services.js`), registre des onze entrées TDR, activation par configuration. |
| 3 | **Offline-first, obligatoire pour le terrain** | ✗ | Aucun service worker, aucun manifeste d'application, aucune file de synchronisation. Or RAMP — inspections sur aire de trafic — est livré, et *est* une activité de terrain. |
| 4 | Sécurité de niveau critique | ◐ | Voir le détail ci-dessous. |
| 5 | Interopérabilité régionale et internationale | ◐ | Exports xlsx / pdf / csv / docx : **présents**. OLF, OACI iSTARs, services de paiement : **aucun code**. |
| 6 | Pérennité et transférabilité | ✓ | Docker, briques open source exclusivement, documentation de reprise, trilinguisme fr/en/pt complet et gardé par une suite de contrôles. |

### Détail de la contrainte n° 4 — sécurité

**Tenu :** 386 routes sous `requireAuth` ; authentification multifacteur par code à usage
unique (`src/mfa.js`) ; mots de passe hachés par scrypt ; politique de douze caractères et
complexité ; blocage après cinq échecs ; session unique ; expiration après trente minutes ;
droits fins par module et par instance ; journal d'audit inaltérable ; politique de contenu
stricte sur les pages publiques ; HSTS en production ; limitation de débit sur
l'authentification et sur les écritures ; garde de forme sur les 235 routes mutatives ;
**zéro vulnérabilité de dépendance**.

**Manquant :** le **chiffrement AES-256 au repos** (§F.3) — aucun. Le **test d'intrusion
indépendant avant recette** — non réalisé.

---

## §3.2 — La pile technique, couche par couche

| Couche | Prescrit par la fiche | Réalisé | État |
|---|---|---|---|
| Frontend | PWA **React + TypeScript** | JavaScript sans cadre ; **0** fichier `.ts` ou `.tsx` ; ni manifeste, ni service worker | ✗ |
| Backend applicatif | API REST **Java 21 / Spring Boot** | **Node 20 / Express 4**, CommonJS, 386 routes | ✗ |
| Identité et accès | **Keycloak** (OpenID Connect) | `src/auth.js` écrit à la main ; sessions en mémoire | ✗ |
| Moteur de workflow | **Flowable ou Camunda** (BPMN 2.0) | moteur de processus écrit à la main (`routes-processus.js`) | ✗ |
| Base de données | **PostgreSQL 16** | **fichiers JSON** (`src/store.js`). Magasin PostgreSQL écrit et reprise éprouvée, bascule différée — [ADR-001](ADR-001-magasin-de-donnees.md) | ✗ |
| Stockage documentaire | **MinIO** (S3) avec versionnage | pièces jointes en **base64 dans les enregistrements JSON**, sans versionnage | ✗ |
| Génération de documents | gabarits + moteur de rendu headless | **Puppeteer / Chromium** ; exports pdf, xlsx, csv, docx | **✓** |
| Tableaux de bord | moteur de restitution **BI open source** | tableaux de bord écrits à la main — ils existent et fonctionnent | ✗ |
| Conteneurisation | Docker **+ orchestrateur K3s** | Dockerfile à deux étages, compte non privilégié, sonde de santé. **Pas de K3s** — déploiement Render | ◐ |
| Supervision technique | **Prometheus + Grafana** | `src/trace.js` — journal structuré JSON par ligne ; `/api/health` | ✗ |

**Une couche conforme, une partielle, huit non conformes.**

---

## §3.3 — Isolation et partage des données

| Prescrit | État | Constat |
|---|---|---|
| **Isolation physique** : une base PostgreSQL dédiée par État, *« et non un simple cloisonnement logique dans une base partagée »* | ✗ | C'est **exactement** un cloisonnement logique, par champ `instance`. Il est appliqué au serveur et non à l'écran, il est éprouvé — mais c'est le modèle que la fiche écarte nommément. |
| Partage inter-États par **API d'échange dédiée** sur le serveur central | ✗ | `config/oasis.config.json` porte `replication.enabled: false`, un `centralUrl` et un intervalle. **Aucun code ne l'implémente.** |
| **Journal d'audit inaltérable** : table en ajout seul, chaînage cryptographique | **✓** | JSON Lines en ajout seul (`src/journal.js`), chaque entrée portant l'empreinte SHA-256 de la précédente. Un journal pour le socle, un par module. 3 203 entrées, chaîne vérifiée. |
| Horodatage synchronisé sur un serveur de temps | **✓** | `src/horloge.js` — client SNTP sans dépendance. Il vérifie et **témoigne**, il ne corrige pas : décaler en silence les dates d'un journal d'autorité serait pire que la dérive. Sans serveur déclaré, l'état est « non vérifiée », dit au démarrage, consigné au journal et rendu par la sonde. *(vague 0)* |
| Réplication logique asynchrone vers le central | ✗ | Non implémentée. |

---

## §4 — Le système de gestion de base de données

La fiche consacre une section entière à démontrer que PostgreSQL s'impose, et invoque cinq
atouts nommément liés aux besoins du projet. **Aucun n'est disponible aujourd'hui :**

| Atout invoqué par la fiche | Disponible ? |
|---|---|
| Réplication logique native — le schéma États → central du §F.2 | ✗ |
| Row-Level Security — cloisonnement en défense en profondeur | ✗ |
| `pgcrypto` — chiffrement AES-256 au repos exigé au §F.3 | ✗ |
| Type JSONB — checklists à structure variable | ✗ *(le magasin est en JSON, mais sans les garanties du type)* |
| Recherche plein texte intégrée | ✗ |

Le raisonnement de la fiche tient toujours, et le magasin PostgreSQL est écrit
(`src/store_pg.js`) et sa reprise éprouvée sur les données réelles — 14 collections,
3 203 entrées de journal, chaîne vérifiée après reprise. **C'est la bascule qui n'est pas faite.**

---

## §5 — Protection des données à caractère personnel

| Exigence de la fiche | État | Constat |
|---|---|---|
| Registre des traitements par module, dès la phase 0 | **✓** | [REGISTRE-DES-TRAITEMENTS.md](REGISTRE-DES-TRAITEMENTS.md) — treize traitements. Un contrôle échoue si un module monté n'y figure pas : le registre ne peut pas prendre du retard en silence. *(vague 0)* |
| Durées de conservation paramétrables, purge ou archivage automatisé | **✓** | `src/retention.js` — trois actions, chaque durée avec son motif, consultables sur `GET /api/retention`. **La purge d'un journal chaîné est refusée**, et le refus est dit. *(vague 0)* |
| Droits des personnes : consultation, rectification tracée | ◐ | Consultation du profil : ✓. **Effacement de compte : ✓** (route `DELETE /api/users/:username`, confirmation par mot de passe, refus du dernier super-administrateur). Rectification tracée : partielle — les modifications sont journalisées, il n'existe pas de circuit de demande. |
| Chiffrement AES-256 au repos | ✗ | Aucun. |
| TLS 1.3 en transit | ◐ | HSTS posé en production ; le TLS est porté par l'hébergeur, non maîtrisé ici. |
| Pseudonymisation dans les tableaux de bord et exports d'analyse | **◐** | **Sans objet aujourd'hui, et désormais gardé.** Vérifié en service : les agrégats se font par État, domaine, secteur et exploitant — jamais par personne. Un contrôle ausculte les réponses des tableaux de bord et tombe dès qu'un courriel, un prénom, un identifiant de compte ou un téléphone y paraît. Contre-éprouvé. *(vague 0)* |
| Encadrement des transferts transfrontaliers, accord-cadre | ✗ | L'instance de démonstration est hébergée à Francfort, **sans base juridique documentée**. |
| DPO par AAC, DPO de coordination, AIPD, notification des violations | ✗ | Aucune désignation, aucune analyse d'impact, aucune procédure. |
| **Journalisation étendue aux consultations** de données sensibles | **✓** | `src/consultations.js` — les ressources portant des personnes sont déclarées, un intercepteur les reconnaît à l'adresse. Trois bornes : se consulter soi-même, un refus et un référentiel sans personne n'écrivent rien. Un export nominatif l'est, fût-il en POST. *(vague 0)* |

---

## Couverture modulaire D.1–D.10

**Quatre références TDR bâties sur dix.**

| Réf. TDR | Module | État |
|---|---|---|
| D.6 | Plans de Surveillance (PLAN) + Profils de Risque (PR) | ✓ bâti |
| D.7.1 | Exécution de la Surveillance (SURV) | ✓ bâti |
| D.7.2 | Mesures d'Application (CARE) | ✓ bâti |
| D.8 | Inspections sur aire de trafic (RAMP) | ✓ bâti |
| — | Gestion des Droits (socle, hors TDR) | ✓ bâti |
| D.1 | Réglementation | ✗ |
| D.2 | Formation | ✗ |
| D.3 | Documentation / GED | ✗ |
| D.4 | Certification | ✗ |
| D.5 | Communication | ✗ |
| D.9 | Analyse des risques de sécurité | ✗ |
| D.10 | Services de paiement | ✗ |

Les onze entrées sont **déclarées au registre** (`config/modules.json`) et s'activent par
configuration : l'architecture modulaire tient sa promesse, ce sont les modules qui restent
à écrire.

---

## Trois constats qui dépassent le tableau

**1. Ce qui compte le plus a été tenu.** La contrainte n° 2 — modularité et activation
progressive — est la clé de voûte de la fiche. Elle est respectée avec rigueur, et c'est
elle qui rend tout le reste rattrapable sans refonte.

**2. Le modèle de déploiement de la fiche n'existe pas.** Une base par État et la réplication
vers le central sont le cœur de l'exigence de souveraineté du §F.2. C'est précisément ce que
diffère [ADR-001](ADR-001-magasin-de-donnees.md) — au motif que *« la réplication n'est pas
spécifiée »*. **Or la fiche la spécifie**, depuis le 2 août : réplication logique PostgreSQL
asynchrone, tolérante aux coupures, vers un serveur central jouant le rôle de sauvegarde.
ADR-001 a été écrit sans cette réponse. **Il doit être rouvert.**

**3. L'offline-first est le seul manque purement fonctionnel.** Tout le reste est affaire de
moyens ou d'organisation. Celui-là est une capacité que les TDR déclarent obligatoire pour le
terrain, et le module de terrain est livré sans elle.

---

## Vérifier ce document

```bash
# Pile technique : chaque ligne doit rendre 0 si le composant est absent
grep -rli 'keycloak\|openid\|oidc' src server.js | wc -l      # Keycloak
grep -rli 'bpmn\|flowable\|camunda' src public | wc -l         # moteur BPMN
grep -rli 'prometheus\|grafana\|/metrics' src server.js | wc -l # supervision
find public -name 'manifest*.json' -o -name 'sw.js' | wc -l    # PWA
find public -name '*.ts' -o -name '*.tsx' | wc -l              # TypeScript
grep -rn 'aes-256\|createCipher' src | wc -l                   # chiffrement au repos

# Journalisation : aucun verbe de consultation
grep -rhoE "'[A-Z_]*(CONSULT|LECTURE|ACCES_DOSSIER)[A-Z_]*'" src server.js

# Couverture modulaire
ls src/modules/            # les modules bâtis
python3 -c "import json;[print(m['tdr'], m['code']) for m in json.load(open('config/modules.json'))]"

# Ce qui est tenu
grep -c requireAuth server.js src/modules/*/routes-*.js | awk -F: '{s+=$2} END {print s}'
npm run smoke              # 702 contrôles, onze suites
```
