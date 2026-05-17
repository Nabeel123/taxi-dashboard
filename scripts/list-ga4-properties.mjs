#!/usr/bin/env node
/**
 * Lists GA4 properties and web stream measurement IDs visible to the service account.
 * Use after adding the account email in GA4 → Admin → Access management (Viewer).
 *
 * Credentials: GOOGLE_SERVICE_ACCOUNT_G_ANALYTICS (preferred), then GOOGLE_SERVICE_ACCOUNT;
 * then GOOGLE_APPLICATION_CREDENTIALS (JSON file path).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v1beta } from "@google-analytics/admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const ENV_GA_ANALYTICS = "GOOGLE_SERVICE_ACCOUNT_G_ANALYTICS";
const ENV_GOOGLE_SA = "GOOGLE_SERVICE_ACCOUNT";

function readEnvJsonString(varName) {
  const v = process.env[varName];
  if (v == null) return undefined;
  let s = v.trim();
  if (
    s.length >= 2 &&
    ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.length > 0 ? s : undefined;
}

function loadCredentialsObject() {
  const rawGa = readEnvJsonString(ENV_GA_ANALYTICS);
  if (rawGa) {
    try {
      return JSON.parse(rawGa);
    } catch {
      console.error(`${ENV_GA_ANALYTICS} is set but is not valid JSON.`);
      process.exit(1);
    }
  }

  const rawGen = readEnvJsonString(ENV_GOOGLE_SA);
  if (rawGen) {
    try {
      return JSON.parse(rawGen);
    } catch {
      console.error(`${ENV_GOOGLE_SA} is set but is not valid JSON.`);
      process.exit(1);
    }
  }

  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (adc) {
    if (!existsSync(adc)) {
      console.error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${adc}`);
      process.exit(1);
    }
    try {
      return JSON.parse(readFileSync(adc, "utf8"));
    } catch {
      console.error("GOOGLE_APPLICATION_CREDENTIALS file is not valid JSON.");
      process.exit(1);
    }
  }

  console.error(`Set one of:
  ${ENV_GA_ANALYTICS} — full service-account JSON (GA4 key; preferred)
  ${ENV_GOOGLE_SA} — full service-account JSON (fallback)
  GOOGLE_APPLICATION_CREDENTIALS — absolute path to key JSON`);
  process.exit(1);
}

const creds = loadCredentialsObject();
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
