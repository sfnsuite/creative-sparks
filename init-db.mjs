import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function runSQL(sql) {
  try {
    const { error } = await supabase.rpc("exec", { query: sql });
    if (error) {
      console.log("RPC error (trying raw):", error.message);
      // Try using the raw query endpoint
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!res.ok) {
        console.error(`Query failed:`, await res.text());
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("SQL execution error:", err.message);
    return false;
  }
}

async function initDB() {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migrations`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`\n📝 Applying: ${file}`);
    
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const stmt of statements) {
      if (stmt) {
        console.log(`  Executing: ${stmt.substring(0, 60)}...`);
        const success = await runSQL(stmt);
        if (!success) {
          console.log(`  ⚠️  Failed (continuing)`);
        } else {
          console.log(`  ✓ OK`);
        }
      }
    }
  }

  console.log("\n✅ Database initialization complete");
}

initDB().catch(console.error);
