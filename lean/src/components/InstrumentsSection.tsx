import Link from "next/link";
import { setProficiency } from "@/app/dashboard/actions";

type Instrument = {
  id: string;
  name: string;
  display_name: string;
  icon_emoji: string;
};

type Proficiency = {
  instrument_id: string;
  skill_level: string;
};

export function InstrumentsSection({
  instruments,
  proficiency,
  editing,
}: {
  instruments: Instrument[];
  proficiency: Proficiency[];
  editing: boolean;
}) {
  const proficiencyByInstrument = new Map(
    proficiency.map((p) => [p.instrument_id, p.skill_level]),
  );
  const hasAny = proficiency.length > 0;

  if (editing) {
    return (
      <section className="section">
        <div className="tracks-header">
          <h2 className="section-title" style={{ margin: 0 }}>
            {hasAny ? "Edit your instruments" : "What do you play?"}
          </h2>
          {hasAny && (
            <Link href="/dashboard" className="muted-link">
              Done
            </Link>
          )}
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Pick your skill level for each — leave blank for anything you don&apos;t play.
        </p>
        <div className="instruments-grid">
          {instruments.map((inst) => {
            const currentLevel = proficiencyByInstrument.get(inst.id) ?? "";
            return (
              <form
                key={inst.id}
                action={setProficiency}
                className={`instrument-card ${currentLevel ? "active" : ""}`}
              >
                <div className="instrument-header">
                  <span className="instrument-emoji">{inst.icon_emoji}</span>
                  <span className="instrument-name">{inst.display_name}</span>
                </div>
                <input type="hidden" name="instrumentId" value={inst.id} />
                <select
                  name="skillLevel"
                  defaultValue={currentLevel}
                  className="skill-select"
                >
                  <option value="">— not played —</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button type="submit" className="save-btn">
                  Save
                </button>
              </form>
            );
          })}
        </div>
      </section>
    );
  }

  const played = instruments
    .map((i) => ({ ...i, level: proficiencyByInstrument.get(i.id) }))
    .filter((i) => i.level);

  return (
    <section className="section">
      <div className="tracks-header">
        <h2 className="section-title" style={{ margin: 0 }}>
          Instruments you play
        </h2>
        <Link
          href="/dashboard?edit_instruments=1"
          className="muted-link"
        >
          Edit
        </Link>
      </div>
      <div className="instrument-summary">
        {played.map((i) => (
          <div key={i.id} className="instrument-summary-item">
            <span className="instrument-summary-emoji">{i.icon_emoji}</span>
            <div>
              <div className="instrument-summary-name">{i.display_name}</div>
              <div className="instrument-summary-level">{i.level}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
