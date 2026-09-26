package int_.uemoa.ursac.oasis.conformite;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

/**
 * L'empreinte d'une entrée du journal d'audit — le maillon de la chaîne du
 * §F.3.
 *
 * <p>La formule est une concaténation à la barre verticale, dont le dernier
 * morceau est le détail sérialisé selon {@link SerialisationJs} :
 *
 * <pre>sha256( precedent + "|" + ts + "|" + user + "|" + action + "|" + json(details) )</pre>
 *
 * <p>La première entrée d'un journal prend pour précédent une genèse
 * constante, différente pour le socle et pour les modules.
 *
 * <h2>Ce que cette classe sert à décider</h2>
 *
 * <p>Elle existe pour répondre à une question et une seule : Java
 * <em>peut-il</em> reproduire la chaîne existante ? Si oui, la migration a le
 * choix. Si non, il n'y a qu'une voie — sceller.
 *
 * <p>ADR-002 recommande de sceller quoi qu'il arrive : à l'instant où le
 * rédacteur d'un journal change, on le vérifie une dernière fois sous Node, on
 * consigne son empreinte finale comme ancre, et Java repart de là avec une
 * forme canonique déclarée. Reproduire la sémantique de JavaScript serait une
 * vigilance sans fin sur un système qui vivra des années ; le sceau coûte une
 * ligne d'explication à un auditeur.
 *
 * <p>Mais on ne scelle bien que ce qu'on sait reproduire : sans cette classe,
 * le sceau serait un aveu d'impuissance plutôt qu'un choix.
 */
public final class ChaineAudit {

  public static final String GENESE_SOCLE = "AEROSUP-GENESIS";
  public static final String GENESE_MODULES = "OASIS-MODULE-GENESIS";

  private ChaineAudit() {}

  /**
   * @param precedent l'empreinte de l'entrée précédente, ou la genèse
   * @param horodatage l'instant, au format ISO 8601 avec millisecondes
   * @param compte l'identifiant de l'agent
   * @param verbe l'acte journalisé
   * @param details le détail — sérialisé selon les règles de JavaScript ; la
   *     carte doit préserver son ordre d'insertion
   * @return l'empreinte en hexadécimal minuscule, 64 caractères
   */
  public static String empreinte(
      String precedent, String horodatage, String compte, String verbe, Map<String, Object> details) {
    String aSceller = precedent
        + '|' + horodatage
        + '|' + compte
        + '|' + verbe
        + '|' + SerialisationJs.ecrire(details == null ? Map.of() : details);
    return sha256(aSceller);
  }

  private static String sha256(String texte) {
    try {
      MessageDigest sha = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(sha.digest(texte.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      // SHA-256 est exigé de toute implémentation de la plateforme Java.
      throw new IllegalStateException("SHA-256 introuvable", e);
    }
  }
}
