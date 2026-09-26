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
 * <h2>Ce que cette classe ne fait pas, et ce qu'il en coûte</h2>
 *
 * <p>Node rafraîchit {@code lastActivity} à chaque requête. Java ne le fait
 * pas : écrire dans {@code sessions.json} pendant que Node l'écrit ferait
 * perdre des sessions à l'un ou à l'autre, en silence.
 *
 * <p>La conséquence est réelle et doit être dite : un agent qui resterait
 * une demi-heure sur un seul écran servi par Java verrait sa session expirer,
 * alors qu'il travaillait. Tant que la tranche est en lecture seule et que le
 * portail reste servi par Node, le cas ne se présente pas — le portail
 * rafraîchit. Il faudra le régler avant qu'un écran entier passe à Java, et
 * la réponse est le magasin partagé, non un second écrivain.
 */
@Component
public class Sessions {

  private static final String COOKIE = "oasis_session";

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
    if (derniere <= 0 || System.currentTimeMillis() - derniere > delaiMs) {
      return Optional.empty();
    }
    String compte = session.path("username").asText("");
    return compte.isBlank() ? Optional.empty() : compte(compte);
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
