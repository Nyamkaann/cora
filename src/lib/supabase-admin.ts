import "server-only";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set");
}

// Service-role client: bypasses Row Level Security, server-only, never exposed to the client.
// Used to write generated marketing images to a public Storage bucket (see src/lib/images/storage.ts).
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const PRODUCT_IMAGES_BUCKET = "product-images";
