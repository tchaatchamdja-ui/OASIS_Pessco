package int_.uemoa.ursac.oasis.securite;

import com.fasterxml.jackson.databind.JsonNode;
import int_.uemoa.ursac.oasis.magasin.Magasin;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Reconnaître la session que Node a ouverte.
 *
 * <p>Pendant l'étranglement, la connexion reste au socle Node : c'est lui qui
 * vérifie le mot de passe, pose le cookie {@code oasis_session} et tient la
 * table des jetons. Java, lui, doit seulement reconnaître un jeton valable —
 * sans quoi l'agent devrait se connecter deux fois, une par runtime, ce qui
 * n'est pas une migration mais une régression.
 *
 * <h2>L'activité se rafraîchit — depuis que le magasin est partagé</h2>
 *
 * <p>Node rafraîchit {@code lastActivity} à chaque requête. Java ne le faisait
 * pas, et la conséquence était réelle : un agent restant une demi-heure sur un
 * seul écran servi par Java voyait sa session expirer alors qu'il travaillait.
 *
 * <p>La raison n'était pas la paresse, c'était l'absence d'arbitre. Écrire dans
 * {@code sessions.json} pendant que Node l'écrit fait perdre des sessions à l'un
 * ou à l'autre, en silence : deux runtimes ne partagent un fichier qu'en
 * lecture. L'en-tête d'alors disait que « la réponse est le magasin partagé, non
 * un second écrivain ».
 *
 * <p>Elle l'est. Les sessions vivent en base depuis ADR-002 (étape B), et
 * {@code Magasin.modifier} y écrit par comparaison de version — le même geste que
 * {@code magasin.modifier} côté Node, et le même arbitre. Java rafraîchit donc
 * l'activité, et les deux runtimes se relaient sans se perdre.
 *
 * <h2>Ce qui reste vrai sur fichiers, et qui est voulu</h2>
 *
 * <p>Sans base configurée, {@code modifier} ne fait rien : il n'y a pas d'arbitre,
 * et un second écrivain serait pire que l'expiration qu'il prétend éviter. Le cas
 * ne se présente pas en service — une instance qui sert deux runtimes a une base —
 * et tant que le portail est servi par Node, c'est lui qui rafraîchit.
 */
@Component
public class Sessions {

  private static final String COOKIE = "oasis_session";

  /**
   * En deçà, on ne réécrit pas la table des jetons : la session a été servie il y
   * a moins d'une minute, et avancer sa marque de quelques secondes ne change rien
   * à son expiration.
   */
  private static final long PAS_DE_RAFRAICHISSEMENT_MS = 60_000L;

  private final Magasin magasin;

  public Sessions(Magasin magasin) {
    this.magasin = magasin;
  }

  /** Le compte derrière la requête, s'il y en a un de valable. */
  public Optional<Utilisateur> utilisateurDe(HttpServletRequest requete) {
    return jeton(requete).flatMap(this::compteDuJeton);
  }

  private Optional<String> jeton(HttpServletRequest requete) {
    if (requete.getCookies() == null) {
      return Optional.empty();
    }
    for (var c : requete.getCookies()) {
      if (COOKIE.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
        return Optional.of(c.getValue());
      }
    }
    return Optional.empty();
  }

  private Optional<Utilisateur> compteDuJeton(String jeton) {
    JsonNode session = magasin.objet("sessions").get(jeton);
    if (session == null) {
      return Optional.empty();
    }
    // Le délai d'inactivité est celui du paramétrage, non une valeur recopiée :
    // les deux runtimes doivent expirer au même moment.
    long delaiMs = minutesDInactivite() * 60_000L;
    long derniere = session.path("lastActivity").asLong(0);
    long maintenant = System.currentTimeMillis();
    if (derniere <= 0 || maintenant - derniere > delaiMs) {
      return Optional.empty();
    }
    String compte = session.path("username").asText("");
    if (compte.isBlank()) {
      return Optional.empty();
    }
    Optional<Utilisateur> trouve = compte(compte);
    // L'activité ne se rafraîchit que pour une session qu'on vient de reconnaître
    // comme valable : repousser l'expiration d'un compte désactivé prolongerait un
    // accès qu'on refuse par ailleurs.
    if (trouve.isPresent()) {
      rafraichir(jeton, maintenant);
    }
    return trouve;
  }

  /**
   * Repousser l'expiration de la session qu'on vient de servir.
   *
   * <p>Deux précautions, et la seconde est la moins évidente.
   *
   * <p>D'abord, on n'écrit pas à chaque requête. Un écran en appelle une dizaine,
   * et réécrire la table des jetons dix fois par écran la ferait réécrire des
   * centaines de fois par heure pour avancer d'une poignée de secondes. On n'écrit
   * que si la marque a vieilli d'au moins une minute — ce que Node fait aussi.
   *
   * <p>Ensuite, la relecture dans la transformation. La valeur qu'on vient de lire
   * pour décider peut avoir changé : Node sert la même table. {@code modifier} rend
   * donc l'état en place, et c'est sur lui qu'on repose la marque — sinon on
   * réécrirait la table entière telle qu'on l'avait vue, et une session ouverte
   * entre-temps par Node disparaîtrait.
   */
  private void rafraichir(String jeton, long maintenant) {
    magasin.modifier("sessions", etat -> marquerActivite(etat, jeton, maintenant));
  }

  /**
   * La décision, prise à part pour être éprouvée : que faut-il écrire, à partir de
   * l'état que la base vient de rendre ?
   *
   * <p>Elle travaille sur l'état reçu et le rend modifié, plutôt que de reconstruire
   * la table. C'est ce qui fait qu'une session ouverte par Node entre la lecture et
   * l'écriture survit : on repose une marque dans ce qui est là, on ne remplace pas
   * ce qu'on croyait y être.
   *
   * @return l'état à écrire, ou {@code null} s'il n'y a rien à écrire.
   */
  static JsonNode marquerActivite(JsonNode etat, String jeton, long maintenant) {
    JsonNode session = etat == null ? null : etat.get(jeton);
    if (session == null || !session.isObject()) {
      return null;
    }
    if (maintenant - session.path("lastActivity").asLong(0) < PAS_DE_RAFRAICHISSEMENT_MS) {
      return null;
    }
    ((com.fasterxml.jackson.databind.node.ObjectNode) session).put("lastActivity", maintenant);
    return etat;
  }

  /** Un compte du portail, actif seulement. */
  public Optional<Utilisateur> compte(String identifiant) {
    for (JsonNode u : magasin.liste("users")) {
      if (identifiant.equals(u.path("username").asText())) {
        return u.path("active").asBoolean(true) ? Optional.of(new Utilisateur(u)) : Optional.empty();
      }
    }
    return Optional.empty();
  }

  /** Tous les comptes, actifs ou non — la gestion des droits les montre tous. */
  public java.util.List<Utilisateur> comptes() {
    return magasin.liste("users").stream().map(Utilisateur::new).toList();
  }

  private int minutesDInactivite() {
    // Le paramétrage vit à côté des données, dans le répertoire de configuration
    // que le socle Node sert. Faute de le trouver, la valeur des TDR (§F.3).
    JsonNode securite = magasin.lire("../config/oasis.config");
    if (securite != null) {
      int m = securite.path("security").path("sessionTimeoutMinutes").asInt(0);
      if (m > 0) {
        return m;
      }
    }
    return 30;
  }
}
