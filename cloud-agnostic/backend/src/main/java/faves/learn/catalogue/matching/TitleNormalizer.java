package faves.learn.catalogue.matching;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Normalises a track/video title before similarity scoring (ADR 0013).
 *
 * <p>Lowercase, strip punctuation, remove multi-word noise phrases, then remove
 * single noise tokens. The base and the first noise tokens are carried over from
 * the removed prototype's {@code songsterr.ts} (docs/SALVAGE.md); the rest were
 * added when the decision was recorded. Mirrors {@code lean/src/lib/matching.ts}.
 */
public final class TitleNormalizer {

    private static final List<String> NOISE_PHRASES = List.of(
            "official music video", "official lyric video", "official video",
            "official audio", "lyric video", "visualizer"
    );

    private static final Set<String> NOISE_TOKENS = Set.of(
            "official", "video", "audio", "lyric", "lyrics",
            "ft", "feat", "featuring", "remastered", "remaster",
            "hd", "4k", "live", "explicit", "mv"
    );

    private static final Pattern BRACKETED_YEAR = Pattern.compile("\\((?:19|20)\\d{2}\\)");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private TitleNormalizer() {}

    public static String normalise(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.toLowerCase();
        s = BRACKETED_YEAR.matcher(s).replaceAll(" ");
        s = NON_ALNUM.matcher(s).replaceAll(" ");
        s = WHITESPACE.matcher(s).replaceAll(" ");
        for (String phrase : NOISE_PHRASES) {
            s = s.replace(phrase, " ");
        }
        StringBuilder out = new StringBuilder(s.length());
        for (String token : WHITESPACE.split(s.trim())) {
            if (!token.isEmpty() && !NOISE_TOKENS.contains(token)) {
                if (out.length() > 0) {
                    out.append(' ');
                }
                out.append(token);
            }
        }
        return out.toString();
    }

    /**
     * The comparison string for one side of a match. Tokens from the normalised
     * title and artist are de-duplicated and sorted, so word order (common on
     * YouTube: "Artist - Title" vs Spotify's separate fields) does not depress
     * the similarity score.
     */
    public static String comparisonKey(String title, String primaryArtist) {
        String combined = (normalise(title) + " " + normalise(primaryArtist)).trim();
        if (combined.isEmpty()) {
            return "";
        }
        Set<String> tokens = new LinkedHashSet<>(Arrays.asList(WHITESPACE.split(combined)));
        return tokens.stream().sorted().collect(Collectors.joining(" "));
    }
}
