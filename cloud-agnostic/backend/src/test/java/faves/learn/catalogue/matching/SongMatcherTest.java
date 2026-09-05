package faves.learn.catalogue.matching;

import faves.learn.catalogue.matching.SongMatcher.Decision;
import faves.learn.catalogue.matching.SongMatcher.Track;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Fixtures pin the ADR 0013 behaviour. The AUTO_ACCEPT / PROMPT_FLOOR numbers
 * are a starting point; when they are re-tuned against a real labelled dataset,
 * this file is what has to be re-reviewed.
 */
class SongMatcherTest {

    @Test
    void equalIsrcIsExactSameSong() {
        var a = new Track("GBAYE0601498", "Feel Good Inc.", "Gorillaz");
        var b = new Track("gbaye0601498", "Feel Good Inc. (Official Video)", "Gorillaz");
        var r = SongMatcher.compare(a, b);
        assertEquals(Decision.SAME_SONG, r.decision());
        assertTrue(r.exact());
    }

    @Test
    void sameTokensDespiteWordOrderAndNoiseAutoAccepts() {
        // Spotify: separate title + artist fields.
        var spotify = new Track(null, "Mr. Brightside", "The Killers");
        // YouTube: everything in one noisy title, artist first, no artist field.
        var youtube = new Track(null,
                "The Killers - Mr. Brightside (Official Music Video) [HD Remastered]", "");
        var r = SongMatcher.compare(spotify, youtube);
        assertEquals(Decision.SAME_SONG, r.decision(), "score was " + r.score());
    }

    @Test
    void unrelatedTracksAreDifferent() {
        var a = new Track(null, "Wonderwall", "Oasis");
        var b = new Track(null, "Smells Like Teen Spirit", "Nirvana");
        var r = SongMatcher.compare(a, b);
        assertEquals(Decision.DIFFERENT_SONG, r.decision(), "score was " + r.score());
    }

    @Test
    void partialOverlapScoresBetweenTheClearCases() {
        // Same song title, different artist / performance — the kind of case the
        // user prompt exists for. We assert only that it scores strictly
        // between the two clear outcomes; the exact band is calibration work.
        var spotify = new Track(null, "Little Wing", "Jimi Hendrix");
        var youtube = new Track(null,
                "Little Wing - Stevie Ray Vaughan slowed reverb full band cover", "");
        double s = SongMatcher.compare(spotify, youtube).score();
        assertTrue(s > 0.0 && s < SongMatcher.AUTO_ACCEPT,
                "expected a middling score, got " + s);
    }
}
