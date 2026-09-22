// Placeholder. Replaced by `pnpm db:types` once the Supabase project is linked:
//   pnpm supabase link --project-ref <ref>
//   pnpm supabase db push
//   pnpm db:types
// After that, pass <Database> to the clients in lib/supabase/*.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
