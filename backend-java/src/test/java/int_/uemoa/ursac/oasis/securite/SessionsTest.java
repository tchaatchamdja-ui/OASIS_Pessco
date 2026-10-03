package int_.uemoa.ursac.oasis.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Le rafraîchissement de l'activité d'une session.
 *
 * <p>Node et Java servent la même table des jetons. Java ne la rafraîchissait pas,
 * faute d'arbitre : un agent restant une demi-heure sur un écran servi par Java
 * voyait sa session expirer alors qu'il travaillait. Les sessions vivant désormais
 * en base, l'arbitre existe, et Java rafraîchit.
 *
 * <p>La décision — que faut-il écrire ? — est prise à part de l'écriture, et c'est
 * elle que ces contrôles éprouvent. Ils portent sur les deux choses qui peuvent mal
 * tourner : écrire trop souvent, et écraser ce qu'un autre runtime vient de poser.
 */
class SessionsTest {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final long MINUTE = 60_000L;

  /** Une table des jetons, avec une session et son inactivité en minutes. */
  private static ObjectNode table(String jeton, long maintenant, long minutesInactif) {
    ObjectNode racine = JSON.createObjectNode();
    ObjectNode session = racine.putObject(jeton);
    session.put("username", "agent@anac.bj");
    session.put("lastActivity", maintenant - minutesInactif * MINUTE);
    return racine;
  }

  @Test
  @DisplayName("une session inactive depuis longtemps est remarquée à l'instant")
  void sessionAncienneRafraichie() {
    long maintenant = 1_700_000_000_000L;
    ObjectNode etat = table("jeton-a", maintenant, 29);

    JsonNode aEcrire = Sessions.marquerActivite(etat, "jeton-a", maintenant);

    assertNotNull(aEcrire, "il y a quelque chose à écrire");
    assertEquals(maintenant, aEcrire.path("jeton-a").path("lastActivity").asLong());
  }

  @Test
  @DisplayName("une session servie à l'instant n'est pas réécrite")
  void sessionRecenteNonReecrite() {
    // Un écran appelle une dizaine de routes. Réécrire la table à chacune la
    // réécrirait des centaines de fois par heure pour avancer de quelques
    // secondes — et chaque écriture est un aller-retour vers la base.
    long maintenant = 1_700_000_000_000L;
    ObjectNode etat = table("jeton-a", maintenant, 0);

    assertNull(Sessions.marquerActivite(etat, "jeton-a", maintenant),
        "rien à écrire pour une session servie il y a moins d'une minute");
  }

  @Test
  @DisplayName("un jeton que la table ne porte pas n'écrit rien")
  void jetonInconnu() {
    long maintenant = 1_700_000_000_000L;
    ObjectNode etat = table("jeton-a", maintenant, 29);

    assertNull(Sessions.marquerActivite(etat, "jeton-absent", maintenant));
  }

  @Test
  @DisplayName("une session ouverte par Node entre-temps n'est pas perdue")
  void sessionVoisinePreservee() {
    // C'est le cas qui compte, et le moins évident. L'état reçu est celui que la
    // base vient de rendre : Node a pu y ouvrir une session depuis la lecture qui
    // a servi à décider. La décision repose donc une marque **dans ce qui est
    // là**, au lieu de reconstruire la table telle qu'on la croyait.
    //
    // Reconstruire l'aurait fait disparaître, et personne ne l'aurait su : l'agent
    // se serait simplement vu redemander son mot de passe.
    long maintenant = 1_700_000_000_000L;
    ObjectNode etat = table("jeton-a", maintenant, 29);
    ObjectNode voisine = etat.putObject("jeton-de-node");
    voisine.put("username", "autre@anac.bj");
    voisine.put("lastActivity", maintenant - MINUTE);

    JsonNode aEcrire = Sessions.marquerActivite(etat, "jeton-a", maintenant);

    assertNotNull(aEcrire);
    assertTrue(aEcrire.has("jeton-de-node"), "la session du voisin est toujours là");
    assertEquals("autre@anac.bj", aEcrire.path("jeton-de-node").path("username").asText());
    assertEquals(maintenant - MINUTE,
        aEcrire.path("jeton-de-node").path("lastActivity").asLong(),
        "et elle n'a pas été remarquée à notre place");
  }

  @Test
  @DisplayName("une table vide n'écrit rien")
  void tableVide() {
    assertNull(Sessions.marquerActivite(JSON.createObjectNode(), "jeton-a", 1L));
    assertNull(Sessions.marquerActivite(null, "jeton-a", 1L));
  }
}
