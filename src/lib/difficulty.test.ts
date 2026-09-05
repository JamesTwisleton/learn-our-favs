import { describe, it, expect } from "vitest";
import { getDifficultyLabel } from "./constants";
import { getUltimateGuitarUrl, getSongsterrUrl } from "./tabs";

describe("getDifficultyLabel", () => {
  it("returns Easy for scores 1-3", () => {
    expect(getDifficultyLabel(1).label).toBe("Easy");
    expect(getDifficultyLabel(2).label).toBe("Easy");
    expect(getDifficultyLabel(3).label).toBe("Easy");
  });

  it("returns Medium for scores 4-6", () => {
    expect(getDifficultyLabel(4).label).toBe("Medium");
    expect(getDifficultyLabel(5).label).toBe("Medium");
    expect(getDifficultyLabel(6).label).toBe("Medium");
  });

  it("returns Hard for scores 7-10", () => {
    expect(getDifficultyLabel(7).label).toBe("Hard");
    expect(getDifficultyLabel(9).label).toBe("Hard");
    expect(getDifficultyLabel(10).label).toBe("Hard");
  });
});

describe("getUltimateGuitarUrl", () => {
  it("generates correct search URL for guitar", () => {
    const url = getUltimateGuitarUrl("Radiohead", "Creep", "guitar");
    expect(url).toContain("ultimate-guitar.com/search.php");
    expect(url).toContain("Radiohead");
    expect(url).toContain("Creep");
    expect(url).toContain("type=chords");
  });

  it("generates correct tab type for bass", () => {
    const url = getUltimateGuitarUrl("Radiohead", "Creep", "bass");
    expect(url).toContain("type=bass-tabs");
  });

  it("generates correct tab type for ukulele", () => {
    const url = getUltimateGuitarUrl("Radiohead", "Creep", "ukulele");
    expect(url).toContain("type=ukulele-chords");
  });

  it("generates correct tab type for drums", () => {
    const url = getUltimateGuitarUrl("Radiohead", "Creep", "drums");
    expect(url).toContain("type=drum-tabs");
  });
});

describe("getSongsterrUrl", () => {
  it("generates correct search URL", () => {
    const url = getSongsterrUrl("Radiohead", "Creep");
    expect(url).toContain("songsterr.com");
    expect(url).toContain("Radiohead");
    expect(url).toContain("Creep");
  });
});
