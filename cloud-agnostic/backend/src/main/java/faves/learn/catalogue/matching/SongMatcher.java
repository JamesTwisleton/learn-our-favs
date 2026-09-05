package faves.learn.catalogue.matching;

/**
 * Decides whether two tracks from different providers are the same song
 * (ADR 0013).
 *
 * <ul>
 *   <li>Both have an ISRC and they are equal → {@link Decision#SAME_SONG},
 *       exact, no scoring.</li>
 *   <li>Otherwise score normalised (title + artist) with a trigram coefficient:
 *     <ul>
 *       <li>score ≥ {@code AUTO_ACCEPT} → {@code SAME_SONG}</li>
 *       <li>{@code PROMPT_FLOOR} ≤ score &lt; {@code AUTO_ACCEPT} → {@code ASK_USER}
 *           (does not enter the pool until confirmed)</li>
 *       <li>score &lt; {@code PROMPT_FLOOR} → {@code DIFFERENT_SONG}</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p>Thresholds are a starting point, tuned against real data post-launch. They
 * live here, not scattered as literals.
 */
public final class SongMatcher {

    public static final double AUTO_ACCEPT = 0.85;
    public static final double PROMPT_FLOOR = 0.60;

    public enum Decision { SAME_SONG, ASK_USER, DIFFERENT_SONG }

    public record Track(String isrc, String title, String primaryArtist) {}

    public record Result(Decision decision, double score, boolean exact) {}

    private SongMatcher() {}

    public static Result compare(Track a, Track b) {
        if (a.isrc() != null && !a.isrc().isBlank() && a.isrc().equalsIgnoreCase(b.isrc())) {
            return new Result(Decision.SAME_SONG, 1.0, true);
        }
        double score = TrigramSimilarity.score(
                TitleNormalizer.comparisonKey(a.title(), a.primaryArtist()),
                TitleNormalizer.comparisonKey(b.title(), b.primaryArtist()));

        Decision decision;
        if (score >= AUTO_ACCEPT) {
            decision = Decision.SAME_SONG;
        } else if (score >= PROMPT_FLOOR) {
            decision = Decision.ASK_USER;
        } else {
            decision = Decision.DIFFERENT_SONG;
        }
        return new Result(decision, score, false);
    }
}
