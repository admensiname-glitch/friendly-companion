import { readFile, readdir } from "node:fs/promises";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
const errors = [];
const versions = new Map();
const versionPattern = /^(\d{14})_.+\.sql$/;

if (files.length === 0) {
  console.error("Migration validation failed: no SQL migration files were found.");
  process.exit(1);
}

for (const file of files) {
  const match = file.match(versionPattern);
  if (!match) {
    errors.push("Invalid migration filename (expected 14-digit timestamp prefix): " + file);
    continue;
  }
  const version = match[1];
  const previous = versions.get(version);
  if (previous) errors.push("Duplicate migration version " + version + ": " + previous + " and " + file);
  else versions.set(version, file);
}

const securityMigrationName = "20261018190000_harden_internal_rebuild_token_transport.sql";
if (files.includes(securityMigrationName)) {
  const source = await readFile(new URL(securityMigrationName, migrationsDirectory), "utf8");
  if (!source.includes("\u0027x-rebuild-token\u0027")) errors.push(securityMigrationName + " must send token using the x-rebuild-token header.");
  if (/\?token=|token\s*\|\|\s*["\u0027]\?token=/i.test(source)) errors.push(securityMigrationName + " must not put the token in the URL query string.");
} else {
  errors.push("Required security migration is missing: " + securityMigrationName);
}

if (errors.length > 0) {
  console.error("Migration validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}

console.log("Verified " + files.length + " SQL migration files: version prefixes are valid and unique; internal rebuild token transport uses a header.");
