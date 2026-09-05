"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestToJoin(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const slug = String(formData.get("slug"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("join_requests")
    .upsert({ band_id: bandId, user_id: user.id, status: "pending" });
  revalidatePath(`/b/${slug}`);
}

export async function decideRequest(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const bandId = String(formData.get("bandId"));
  const slug = String(formData.get("slug"));
  const approve = formData.get("approve") === "true";
  const requesterId = String(formData.get("requesterId"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("join_requests")
    .update({
      status: approve ? "accepted" : "refused",
      decided_at: new Date().toISOString(),
      decided_by_user_id: user.id,
    })
    .eq("id", requestId);

  if (approve) {
    await supabase
      .from("band_memberships")
      .upsert({ band_id: bandId, user_id: requesterId, role: "member" });
  }
  revalidatePath(`/b/${slug}`);
}

export async function leaveBand(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("band_memberships")
    .delete()
    .eq("band_id", bandId)
    .eq("user_id", user.id);
  revalidatePath("/bands");
}

export async function setThreshold(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const slug = String(formData.get("slug"));
  const threshold = Number(formData.get("threshold"));
  const supabase = await createClient();
  await supabase
    .from("bands")
    .update({ overlap_threshold: Math.max(1, threshold) })
    .eq("id", bandId);
  revalidatePath(`/b/${slug}`);
}
