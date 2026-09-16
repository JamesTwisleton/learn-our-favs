"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { insertRecordingMetadata } from "@/app/b/[slug]/song-actions";

/**
 * Direct-to-Storage uploader: file goes browser → Supabase Storage via a
 * signed upload URL, then we call a Server Action to insert the metadata
 * row. Sidesteps Vercel's ~4.5 MB request-body cap for Node functions.
 */
export function RecordingUploader({
  bandId,
  songId,
  slug,
}: {
  bandId: string;
  songId: string;
  slug: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Pick a file first.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (50 MB max).");
      return;
    }
    try {
      setProgress("Getting upload URL…");
      const signRes = await fetch("/api/recordings/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bandId, fileName: file.name }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => ({}));
        throw new Error(body.error ?? `sign failed (${signRes.status})`);
      }
      const { path, token } = (await signRes.json()) as { path: string; token: string };

      setProgress("Uploading…");
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("recordings")
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || "audio/webm",
        });
      if (upErr) throw upErr;

      setProgress("Saving…");
      const fd = new FormData();
      fd.set("bandId", bandId);
      fd.set("songId", songId);
      fd.set("slug", slug);
      fd.set("title", title || file.name.replace(/\.[^.]+$/, ""));
      fd.set("storagePath", path);
      fd.set("mimeType", file.type || "audio/webm");
      fd.set("sizeBytes", String(file.size));
      startTransition(async () => {
        await insertRecordingMetadata(fd);
        setProgress(null);
        setFile(null);
        setTitle("");
        (e.target as HTMLFormElement).reset();
      });
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
      <input
        type="text"
        placeholder="Take title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ minWidth: 120 }}
      />
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        required
      />
      <button type="submit" className="secondary" disabled={pending || !file}>
        {pending ? "Working…" : "Upload take"}
      </button>
      {progress && <span className="muted small">{progress}</span>}
      {error && <span className="small" style={{ color: "#ef4444" }}>{error}</span>}
    </form>
  );
}
