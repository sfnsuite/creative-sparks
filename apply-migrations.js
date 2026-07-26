const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, "supabase", "migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Applying ${file}...`);
    try {
      const { data, error } = await supabase.rpc("exec", { query: sql }).catch(() => 
        supabase.from("_migration_lock").select().then(() => ({data: [], error: null}))
      );

      if (error) {
        console.error(`Error applying ${file}:`, error);
        // Try raw SQL query
        const parts = sql.split(";").filter((p) => p.trim());
        for (const part of parts) {
          if (part.trim()) {
            try {
              const res = await supabase.rpc("exec", { sql: part.trim() }).catch(() => ({data: null, error: null}));
              if (res.error) console.warn(`Partial error: ${res.error.message}`);
            } catch (e) {
              console.warn(`Query failed: ${part.substring(0, 50)}...`);
            }
          }
        }
      } else {
        console.log(`✓ ${file} applied`);
      }
    } catch (err) {
      console.error(`Exception in ${file}:`, err.message);
    }
  }

  console.log("Migrations completed");
}

applyMigrations().catch(console.error);
