import { describe, it, expect } from "vitest";
import { matchTracks, similarity, comparisonKey } from "./matching";

describe("comparisonKey", () => {
  it("strips noise tokens and is word-order neutral", () => {
    expect(comparisonKey("Mr. Brightside", "The Killers")).toBe(
      comparisonKey("The Killers - Mr. Brightside (Official Music Video) [HD Remastered]", ""),
    );
  });
});

describe("matchTracks (ADR 0013)", () => {
  it("treats equal ISRC as an exact same-song", () => {
    const r = matchTracks(
      { isrc: "GBAYE0601498", title: "Feel Good Inc.", artist: "Gorillaz" },
      { isrc: "gbaye0601498", title: "Feel Good Inc. (Official Video)", artist: "Gorillaz" },
    );
    expect(r.decision).toBe("same_song");
    expect(r.exact).toBe(true);
  });

  it("auto-accepts a noisy YouTube title for the same song", () => {
    const r = matchTracks(
      { title: "Mr. Brightside", artist: "The Killers" },
      { title: "The Killers - Mr. Brightside (Official Music Video) [HD Remastered]", artist: "" },
    );
    expect(r.decision).toBe("same_song");
  });

  it("rejects unrelated tracks", () => {
    const r = matchTracks(
      { title: "Wonderwall", artist: "Oasis" },
      { title: "Smells Like Teen Spirit", artist: "Nirvana" },
    );
    expect(r.decision).toBe("different_song");
  });

  it("scores partial overlap between the two clear cases", () => {
    const s = similarity(
      comparisonKey("Little Wing", "Jimi Hendrix"),
      comparisonKey("Little Wing - Stevie Ray Vaughan slowed reverb full band cover", ""),
    );
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(0.85);
  });
});
