import { readdir } from "node:fs/promises";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("Migration validation failed: no SQL migration files were found.");
  process.exit(1);
}

const versionPattern = /^(\d{14})_.+\.sql$/;
const versions = new Map();
const errors = [];

for (const file of files) {
  const match = file.match(versionPattern);
  if (!match) {
    errors.push(`Invalid migration filename (expected 14-digit timestamp prefix): ${file}`);
    continue;
  }

  const version = match[1];
  const previous = versions.get(version);
  if (previous) {
    errors.push(`Duplicate migration version ${version}: ${previous} and ${file}`);
  } else {
    versions.set(version, file);
  }
}

if (errors.length > 0) {
  console.error("Migration validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`Verified ${files.length} SQL migration files: all have valid, unique 14-digit version prefixes.`);
