import { Client } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL");

    const migrationsDir = path.join(__dirname, "supabase", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`📝 Applying: ${file}`);
      try {
        await client.query(sql);
        console.log("   ✓ Success\n");
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}\n`);
      }
    }

    console.log("✅ Migration complete");
  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
