# Contrats d'octets — la recette d'entrée du backend Java

Premier jalon d'[ADR-002](../docs/ADR-002-migration-spring-boot.md), et **il conditionne tout
le reste**. Ce projet n'a qu'un travail : démontrer que Java sait reproduire, à l'octet près,
les deux mécanismes dont la réécriture hérite.

Pas de Spring ici, volontairement. Ce projet doit pouvoir échouer vite, et pour une seule
raison.

## Les deux contrats, et ce qu'ils coûtent quand on les rate

| | Le piège | Ce qui arrive |
|---|---|---|
| **scrypt** | Node reçoit le sel **en chaîne** et l'encode en UTF-8 : les octets salés sont les 32 caractères ASCII de l'hexadécimal, non les 16 octets qu'il représente | **Plus personne ne se connecte.** Pas une exception, pas un message : un refus universel |
| **Sérialisation** | `JSON.stringify` place les **clés entières devant**, triées numériquement : `{b, 10, a, 2, 1}` → `{"1","2","10","b","a"}` | `verifyChain()` déclare faux **tout l'historique**, et la garantie du §F.3 tombe sur les données existantes |

Ni l'une ni l'autre de ces pannes ne lève d'erreur. C'est pourquoi elles se traitent **avant**
la première route, et non au troisième mois.

## Le résultat

**Les deux contrats se reproduisent en Java.** Vérifié le 26 septembre 2026, JDK 21,
Bouncy Castle 1.78.1 — quatre tests, zéro échec.

**Conséquence pour le plan : aucune réinitialisation générale des mots de passe n'est
nécessaire.** C'était la question ouverte que ce jalon devait trancher.

## Lancer

```bash
cd conformite-java
JAVA_HOME="$(/usr/libexec/java_home -v 21)" mvn test
```

Sur un poste où Homebrew a posé le JDK :

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test
```

Maven peut être installé sur un autre JDK que le 21 — d'où `JAVA_HOME` imposé. `mvn -v` dit
sur lequel il tourne.

## D'où viennent les vecteurs

De `../tests/conformite/vecteurs.json`, produit par `../scripts/vecteurs-conformite.js` depuis
l'implémentation Node **en service**. Le fichier n'est pas recopié ici : une copie divergerait,
et c'est exactement ce que ces vecteurs existent pour empêcher.

Trois contrôles de la suite de fumée Node les tiennent à jour ; ce projet les rejoue côté Java.
Les deux moitiés tournent en intégration continue (`.github/workflows/ci.yml`, travail
« Contrats d'octets »).

## Ce que ces classes deviendront

`MotDePasse` et `SerialisationJs` sont destinées à passer telles quelles dans le socle Spring
Boot. `ChaineAudit` aussi — **mais** ADR-002 recommande de **sceller** la chaîne plutôt que de
la prolonger : à l'instant où le rédacteur d'un journal change, on le vérifie une dernière fois
sous Node, on consigne son empreinte finale comme ancre, et Java repart de là avec une forme
canonique déclarée (RFC 8785).

Alors pourquoi avoir écrit `ChaineAudit` ? **Parce qu'on ne scelle bien que ce qu'on sait
reproduire.** Sans elle, le sceau serait un aveu d'impuissance plutôt qu'un choix.

## Contre-épreuves

Un test qui passe ne prouve rien tant qu'il n'a pas échoué. Les deux ont été éprouvés en
réintroduisant le défaut :

- sel décodé au lieu d'être pris tel quel — **3 cas tombent**, avec les condensés obtenus ;
- ordre des clés laissé à l'insertion (ce que ferait un `LinkedHashMap`) — **le cas en désordre
  tombe**, en montrant les deux sorties côte à côte.

Le second mérite une note. Les tests `serialisation` et `empreintes` lisent `details` depuis le
fichier de vecteurs — lequel porte **déjà** l'ordre corrigé, puisque JavaScript réordonne les
clés entières dès la création de l'objet. Ces deux tests passeraient donc par accident. C'est
pourquoi un quatrième test part d'une liste de paires **volontairement en désordre**
(champ `desordre` des vecteurs) : c'est lui, et lui seul, qui démontre que la règle est
appliquée.
