package int_.uemoa.ursac.oasis.conformite;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import org.bouncycastle.crypto.generators.SCrypt;

/**
 * Le condensé des mots de passe, tel que Node le produit — et il faut que ce
 * soit exactement celui-là.
 *
 * <p>Les comptes existants portent un sel et un condensé calculés par
 * {@code crypto.scryptSync(password, salt, 64)}. Si cette classe s'en écarte
 * d'un seul bit, <strong>plus personne ne se connecte</strong> : pas une
 * exception, pas un message — un refus universel, et l'on cherche la panne
 * ailleurs pendant deux jours.
 *
 * <h2>Le piège, et il n'est pas évident</h2>
 *
 * <p>Node reçoit le sel <em>en chaîne de caractères</em> et l'encode en UTF-8.
 * Les octets salés sont donc les <strong>32 caractères ASCII de
 * l'hexadécimal</strong> — et non les 16 octets que cet hexadécimal
 * représente. Une implémentation qui décode l'hexadécimal, ce qui est le
 * réflexe naturel en Java, produit un tout autre condensé.
 *
 * <p>C'est la raison d'être de {@link #SEL_EN_OCTETS_ASCII} : le nommer plutôt
 * que de le subir.
 */
public final class MotDePasse {

  /** Paramètres par défaut de {@code crypto.scryptSync} sous Node. */
  public static final int N = 16384;
  public static final int R = 8;
  public static final int P = 1;
  public static final int LONGUEUR = 64;

  /**
   * Le sel est pris <em>tel qu'il est écrit</em>, jamais décodé. Cette
   * constante n'existe que pour porter l'explication à l'endroit où l'erreur
   * se commettrait.
   */
  public static final boolean SEL_EN_OCTETS_ASCII = true;

  private MotDePasse() {}

  /**
   * @param motDePasse le mot de passe en clair, encodé en UTF-8
   * @param selHexadecimal le sel tel qu'il est stocké sur le compte — une
   *     chaîne hexadécimale de 32 caractères, employée telle quelle
   * @return le condensé en hexadécimal minuscule, 128 caractères
   */
  public static String condenser(String motDePasse, String selHexadecimal) {
    byte[] octetsMotDePasse = motDePasse.getBytes(StandardCharsets.UTF_8);
    // Le geste qui décide de tout : les octets du sel sont ceux de la chaîne,
    // non ceux de l'hexadécimal décodé.
    byte[] octetsSel = selHexadecimal.getBytes(StandardCharsets.US_ASCII);
    byte[] condense = SCrypt.generate(octetsMotDePasse, octetsSel, N, R, P, LONGUEUR);
    return HexFormat.of().formatHex(condense);
  }

  /**
   * Comparaison à temps constant, sur les chaînes hexadécimales — comme
   * {@code crypto.timingSafeEqual} du côté Node. Comparer avec
   * {@code String.equals} laisserait fuir, par la durée, le nombre de
   * caractères justes.
   */
  public static boolean correspond(String condenseAttendu, String condenseCalcule) {
    byte[] a = condenseAttendu.getBytes(StandardCharsets.US_ASCII);
    byte[] b = condenseCalcule.getBytes(StandardCharsets.US_ASCII);
    if (a.length != b.length) {
      return false;
    }
    int ecart = 0;
    for (int i = 0; i < a.length; i++) {
      ecart |= a[i] ^ b[i];
    }
    return ecart == 0;
  }
}
