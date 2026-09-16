import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mints a Supabase Storage signed upload URL so the browser can PUT the
 * audio file straight into the `recordings` bucket.
 *
 * Why this exists: Server Actions in Next.js default to a 1 MB body limit
 * and Vercel serverless caps request bodies at ~4.5 MB. A real audio take
 * blows through both. Direct-to-storage uploads sidestep the entire Node
 * request path — the file goes browser → Supabase Storage.
 *
 * Auth: user must be a member of the band. We check that server-side, then
 * mint the URL with the service-role client (the client role has no INSERT
 * policy on storage.objects for this bucket beyond what our RLS grants).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json()) as {
    bandId?: string;
    fileName?: string;
  };
  const bandId = body.bandId;
  const fileName = body.fileName ?? "take";
  if (!bandId) return NextResponse.json({ error: "bandId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("band_memberships")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "not a member" }, { status: 403 });

  const extMatch = /\.(webm|mp3|wav|m4a|ogg|aac|flac)$/i.exec(fileName);
  const ext = extMatch ? extMatch[1].toLowerCase() : "webm";
  const path = `${bandId}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("recordings")
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[sign-upload] createSignedUploadUrl failed:", error);
    return NextResponse.json({ error: error?.message ?? "sign failed" }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
