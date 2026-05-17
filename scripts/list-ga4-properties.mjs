#!/usr/bin/env node
/**
 * Lists GA4 properties and web stream measurement IDs visible to the service account.
 * Use after adding the account email in GA4 → Admin → Access management (Viewer).
 *
 * Reads GA_SERVICE_ACCOUNT_PATH, else ./ga4-key.json, else ./secret.json (repo root).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v1beta } from "@google-analytics/admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function resolveCredentialPath() {
  const fromEnv = process.env.GA_SERVICE_ACCOUNT_PATH?.trim();
  if (fromEnv) {
    const p = path.isAbsolute(fromEnv) ? fromEnv : path.join(repoRoot, fromEnv);
    if (existsSync(p)) return p;
  }
  const ga4 = path.join(repoRoot, "ga4-key.json");
  if (existsSync(ga4)) return ga4;
  const sec = path.join(repoRoot, "secret.json");
  if (existsSync(sec)) return sec;
  return null;
}

const secretPath = resolveCredentialPath();
if (!secretPath) {
  console.error("Missing credential file. Add ga4-key.json or secret.json, or set GA_SERVICE_ACCOUNT_PATH.");
  process.exit(1);
}

const creds = JSON.parse(readFileSync(secretPath, "utf8"));
const client = new v1beta.AnalyticsAdminServiceClient({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
});

let propertyRows = 0;
for await (const summary of client.listAccountSummariesAsync()) {
  for (const prop of summary.propertySummaries ?? []) {
    const parent = prop.property;
    const pid = parent?.replace(/^properties\//, "") ?? "";
    console.log(`Property ID: ${pid}\t${prop.displayName ?? ""}`);
    if (!parent) continue;
    for await (const stream of client.listDataStreamsAsync({ parent })) {
      const mid = stream.webStreamData?.measurementId;
      if (mid) console.log(`  Measurement ID: ${mid}`);
    }
    propertyRows += 1;
  }
}

if (propertyRows === 0) {
  console.error(`
No properties returned for ${creds.client_email ?? "this key"}.

1) Open https://analytics.google.com → Admin → Account or Property access management
2) Add the service account email with Viewer (or Analyst)
3) Enable "Google Analytics Admin API" in Google Cloud for the key's project
4) Run this script again, then set GA4_PROPERTY_ID in .env.local to the numeric Property ID
`);
  process.exit(2);
}
