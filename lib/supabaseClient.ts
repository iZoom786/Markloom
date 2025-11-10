import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://vpthqsjfcwcyqoxhedqo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGhxc2pmY3djeXFveGhlZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MDEyMzUsImV4cCI6MjA2MjA3NzIzNX0.pMzIYcCFa_oi2I8Aj91ZtaOEmd-GeTyzcOVxNMee5cI';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anon key are required.");
}

// Removed the `<Database>` generic type because the `types_db.ts` file was not provided.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);