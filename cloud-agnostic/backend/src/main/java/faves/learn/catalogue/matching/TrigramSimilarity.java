package faves.learn.catalogue.matching;

import java.util.HashSet;
import java.util.Set;

/**
 * Sørensen–Dice coefficient over character trigrams. Cheap, dependency-free,
 * and good enough to separate "same song" from "different song" once titles are
 * normalised (ADR 0013).
 */
public final class TrigramSimilarity {

    private TrigramSimilarity() {}

    /** @return similarity in [0.0, 1.0] */
    public static double score(String a, String b) {
        Set<String> ta = trigrams(a);
        Set<String> tb = trigrams(b);
        if (ta.isEmpty() && tb.isEmpty()) {
            return 1.0;
        }
        if (ta.isEmpty() || tb.isEmpty()) {
            return 0.0;
        }
        int intersection = 0;
        for (String t : ta) {
            if (tb.contains(t)) {
                intersection++;
            }
        }
        return (2.0 * intersection) / (ta.size() + tb.size());
    }

    private static Set<String> trigrams(String s) {
        Set<String> out = new HashSet<>();
        String padded = "  " + s + "  ";
        for (int i = 0; i + 3 <= padded.length(); i++) {
            out.add(padded.substring(i, i + 3));
        }
        return out;
    }
}
