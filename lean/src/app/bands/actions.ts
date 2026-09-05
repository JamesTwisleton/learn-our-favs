"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Create a band; the caller becomes its owner (public.create_band). */
export async function createBand(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_band", { band_name: name });
  if (error) throw error;

  redirect(`/b/${data.slug}`);
}
