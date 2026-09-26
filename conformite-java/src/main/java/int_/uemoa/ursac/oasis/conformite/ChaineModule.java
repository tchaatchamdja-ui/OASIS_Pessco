package int_.uemoa.ursac.oasis.conformite;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;

/**
 * L'empreinte d'une entrée du journal d'audit **des modules** — six champs.
 *
 * <p>Elle diffère de {@link ChaineAudit}, qui en scelle quatre : {@code objet}
 * et {@code ref} s'intercalent entre l'action et le détail.
 *
 * <pre>sha256( precedent |ts |user |action |objet |ref |json(details) )</pre>
 *
 * <p>Ce contrat manquait aux vecteurs d'ADR-002. Le manque s'est vu en
 * écrivant le socle Java : une réécriture qui se serait fiée au seul contrat
 * du socle aurait rompu les 1 582 entrées des journaux de module en croyant
 * avoir tout éprouvé. Un contrat ne vaut que pour ce qu'il énumère — et c'est
 * la deuxième fois que ce chantier l'apprend.
 */
public final class ChaineModule {

  public static final String GENESE = "OASIS-MODULE-GENESIS";

  private ChaineModule() {}

  public static String empreinte(String precedent, String horodatage, String compte,
      String verbe, String objet, String reference, Map<String, Object> details) {
    String aSceller = String.join("|",
        precedent, horodatage, compte, verbe,
        objet == null ? "" : objet,
        reference == null ? "" : reference,
        SerialisationJs.ecrire(details == null ? Map.of() : details));
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(aSceller.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 introuvable", e);
    }
  }
}
