import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { v1beta as analyticsAdmin } from "@google-analytics/admin";
import { unstable_cache } from "next/cache";

export interface GaDemographicRow {
  label: string;
  value: number;
}

export type GaAudienceSnapshot =
  | {
      status: "ok";
      dateRangeLabel: string;
      propertyLabel: string;
      gender: GaDemographicRow[];
      age: GaDemographicRow[];
      countries: GaDemographicRow[];
      /** Default channel grouping (e.g. Direct, Organic Search) when data exists. */
      channels: GaDemographicRow[];
      /** Device category (desktop, mobile, tablet). */
      devices: GaDemographicRow[];
    }
  | {
      status: "not_configured";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

/** Analytics Data API + Admin API OAuth scope for service-account keys. */
const ANALYTICS_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

/** gRPC status codes (numeric) → name for clearer dashboard messages. */
const GRPC_STATUS_NAMES: Record<number, string> = {
  2: "UNKNOWN",
  3: "INVALID_ARGUMENT",
  4: "DEADLINE_EXCEEDED",
  5: "NOT_FOUND",
  7: "PERMISSION_DENIED",
  8: "RESOURCE_EXHAUSTED",
  12: "UNIMPLEMENTED",
  13: "INTERNAL",
  14: "UNAVAILABLE",
  16: "UNAUTHENTICATED",
};

function formatGoogleRpcError(e: unknown): string {
  if (e instanceof Error) {
    const ex = e as Error & {
      code?: number | string;
      details?: unknown;
      metadata?: { get?: (key: string) => unknown };
      cause?: unknown;
    };
    const parts: string[] = [];

    if (typeof ex.code === "number") {
      const name = GRPC_STATUS_NAMES[ex.code];
      parts.push(name ? `${name} (${ex.code})` : `gRPC status ${ex.code}`);
    } else if (typeof ex.code === "string" && ex.code.trim()) {
      parts.push(ex.code.trim());
    }

    if (typeof ex.details === "string" && ex.details.trim()) {
      parts.push(ex.details.trim());
    }

    try {
      const md = ex.metadata;
      if (md && typeof md.get === "function") {
        const gm = md.get("grpc-message");
        if (gm != null && String(gm).trim()) parts.push(String(gm).trim());
      }
    } catch {
      /* ignore */
    }

    const msg = ex.message?.trim();
    if (msg && msg !== "undefined undefined: undefined" && !/^undefined(\s|$)/.test(msg)) {
      parts.push(msg);
    }

    if (ex.cause instanceof Error && ex.cause.message?.trim()) {
      parts.push(ex.cause.message.trim());
    }

    const unique = [...new Set(parts.filter(Boolean))];
    if (unique.length > 0) return unique.join(" — ");
    return "Google API error (no details). Enable Google Analytics Admin API in GCP, add the service account under GA4 Admin → Access management, or set GA4_PROPERTY_ID to skip Admin lookup.";
  }

  if (e != null && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const s = typeof o.message === "string" ? o.message : JSON.stringify(o);
    if (s && s !== "{}" && s.length < 600) return s;
  }

  return "Google API request failed.";
}

/** Accepts standard GCP key JSON or `{ "serviceAccount": {...} }` / `{ "googleServiceAccount": {...} }`. */
function parseServiceAccountFields(
  o: Record<string, unknown>,
): { client_email: string; private_key: string } | undefined {
  const nested =
    (o.serviceAccount as Record<string, unknown> | undefined) ??
    (o.googleServiceAccount as Record<string, unknown> | undefined);
  const src = nested ?? o;
  if (typeof src.client_email === "string" && typeof src.private_key === "string") {
    return { client_email: src.client_email, private_key: src.private_key };
  }
  return undefined;
}

const ENV_GA_ANALYTICS = "GOOGLE_SERVICE_ACCOUNT_G_ANALYTICS";
const ENV_GOOGLE_SA = "GOOGLE_SERVICE_ACCOUNT";

/** Normalize .env values that were wrapped in '...' or "..." (some loaders keep the delimiters). */
function readEnvJsonString(varName: string): string | undefined {
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

type GaEnvParseResult =
  | { status: "ok"; payload: Record<string, unknown> }
  | { status: "absent" }
  | { status: "invalid_json"; varName: string }
  | { status: "missing_fields"; varName: string };

/** GA4 keys: `GOOGLE_SERVICE_ACCOUNT_G_ANALYTICS` first, then `GOOGLE_SERVICE_ACCOUNT`. */
function parseGaServiceAccountEnv(): GaEnvParseResult {
  const rawGa = readEnvJsonString(ENV_GA_ANALYTICS);
  if (rawGa) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawGa) as Record<string, unknown>;
    } catch {
      return { status: "invalid_json", varName: ENV_GA_ANALYTICS };
    }
    if (!parseServiceAccountFields(parsed)) {
      return { status: "missing_fields", varName: ENV_GA_ANALYTICS };
    }
    return { status: "ok", payload: parsed };
  }
  const rawGen = readEnvJsonString(ENV_GOOGLE_SA);
  if (rawGen) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawGen) as Record<string, unknown>;
    } catch {
      return { status: "invalid_json", varName: ENV_GOOGLE_SA };
    }
    if (!parseServiceAccountFields(parsed)) {
      return { status: "missing_fields", varName: ENV_GOOGLE_SA };
    }
    return { status: "ok", payload: parsed };
  }
  return { status: "absent" };
}

/** Full service-account JSON for googleapis clients (includes project_id, etc.). */
function getServiceAccountCredentialsJson(): Record<string, unknown> | undefined {
  const r = parseGaServiceAccountEnv();
  return r.status === "ok" ? r.payload : undefined;
}

/** Alias: same credentials as {@link getServiceAccountCredentialsJson}, `null` if missing. */
function getGaCredentialPayload(): Record<string, unknown> | null {
  return getServiceAccountCredentialsJson() ?? null;
}

function getServiceCredentials():
  | { client_email: string; private_key: string }
  | undefined {
  const json = getServiceAccountCredentialsJson();
  if (!json) return undefined;
  return parseServiceAccountFields(json)!;
}

/**
 * GA4 numeric property id only (Admin → Property settings), e.g. "391234567".
 * Also accepts "properties/391234567".
 */
function parseNumericPropertyId(raw: string | number | undefined | null): string | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const s = String(Math.trunc(raw));
    return /^\d+$/.test(s) ? s : null;
  }
  const t = String(raw).trim();
  if (!t) return null;
  const m = t.match(/^properties\/(\d+)$/i);
  if (m) return m[1];
  if (/^\d+$/.test(t)) return t;
  return null;
}

/** OAuth numeric id on the key JSON — not the same as GA4 Property ID. */
function getServiceAccountClientIdFromKey(): string | null {
  const payload = getGaCredentialPayload();
  if (!payload) return null;
  const top = payload.client_id;
  if (typeof top === "string" || typeof top === "number") return String(top).trim();
  const nested =
    (payload.serviceAccount as Record<string, unknown> | undefined)?.client_id ??
    (payload.googleServiceAccount as Record<string, unknown> | undefined)?.client_id;
  if (typeof nested === "string" || typeof nested === "number") return String(nested).trim();
  return null;
}

/** If the user set a non-numeric "property id" (e.g. a hash or name), explain the correct format. */
function invalidExplicitPropertyIdMessage(): string | null {
  const payload = getGaCredentialPayload();
  const checks: { label: string; value: string }[] = [];

  const envGa4 = process.env.GA4_PROPERTY_ID?.trim();
  if (envGa4) checks.push({ label: "GA4_PROPERTY_ID", value: envGa4 });
  const envPub = process.env.NEXT_PUBLIC_GA4_PROPERTY_ID?.trim();
  if (envPub) checks.push({ label: "NEXT_PUBLIC_GA4_PROPERTY_ID", value: envPub });

  if (payload) {
    for (const key of ["ga4PropertyId", "GA4_PROPERTY_ID", "propertyId"] as const) {
      const v = payload[key];
      if (typeof v === "string" && v.trim())
        checks.push({ label: `service account JSON (env) → ${key}`, value: v.trim() });
      else if (typeof v === "number")
        checks.push({ label: `service account JSON (env) → ${key}`, value: String(v) });
    }
  }

  const saClientId = getServiceAccountClientIdFromKey();

  for (const { label, value } of checks) {
    const parsed = parseNumericPropertyId(value);
    if (parsed === null) {
      return `${label} is not a valid GA4 Property ID (must be digits only, e.g. 391234567, or "properties/391234567"). Open Google Analytics → Admin → Property settings and copy "PROPERTY ID". Names like "ga4-analytics-reader" and long hex strings are not property ids.`;
    }
    if (saClientId && parsed === saClientId) {
      return `${label} is set to your Google Cloud service account client_id (from the key JSON), not your GA4 Property ID. In Google Analytics open Admin → Property settings and copy Property ID (it differs from client_id and private_key_id). Use GA4_PROPERTY_ID in .env.local (server-only), not NEXT_PUBLIC_GA4_PROPERTY_ID, unless you intentionally expose the id to the browser.`;
    }
  }
  return null;
}

function getNumericPropertyIdFromEnv(): string | null {
  const fromEnvVars =
    parseNumericPropertyId(process.env.GA4_PROPERTY_ID) ??
    parseNumericPropertyId(process.env.NEXT_PUBLIC_GA4_PROPERTY_ID);
  if (fromEnvVars) return fromEnvVars;

  const payload = getGaCredentialPayload();
  if (!payload) return null;

  for (const key of ["ga4PropertyId", "GA4_PROPERTY_ID", "propertyId"] as const) {
    const v = payload[key];
    const id = parseNumericPropertyId(
      typeof v === "string" || typeof v === "number" ? v : undefined,
    );
    if (id) return id;
  }
  return null;
}

function getClientOptions():
  | {
      credentials: Record<string, unknown>;
      scopes: string[];
    }
  | Record<string, never> {
  const json = getServiceAccountCredentialsJson();
  return json
    ? {
        credentials: json,
        scopes: [ANALYTICS_READONLY_SCOPE],
      }
    : {};
}

function normalizeMeasurementId(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.toUpperCase().startsWith("G-") ? t : `G-${t}`;
}

function formatDimensionLabel(dimension: string, raw: string): string {
  const v = raw === "(not set)" || raw === "" ? "Unknown" : raw;
  if (dimension === "userGender" && v !== "Unknown") {
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }
  if (dimension === "deviceCategory" && v !== "Unknown") {
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }
  return v;
}

/** Errors that apply to the whole property — must not be swallowed per-dimension. */
function isGlobalGaDataApiError(formatted: string): boolean {
  return (
    formatted.includes("PERMISSION_DENIED") ||
    formatted.includes("(7)") ||
    formatted.includes("403") ||
    formatted.includes("UNAUTHENTICATED") ||
    formatted.includes("(16)") ||
    formatted.includes("NOT_FOUND") ||
    formatted.includes("(5)") ||
    formatted.includes("UNAVAILABLE") ||
    formatted.includes("(14)")
  );
}

async function safeRunDimensionBreakdown(
  client: BetaAnalyticsDataClient,
  propertyNumericId: string,
  dimension: string,
  limit = 16,
): Promise<GaDemographicRow[]> {
  try {
    return await runDimensionBreakdown(client, propertyNumericId, dimension, limit);
  } catch (e) {
    const formatted = formatGoogleRpcError(e);
    if (isGlobalGaDataApiError(formatted)) throw e;
    return [];
  }
}

function isGaAccessSetupIssue(adminLookupError: string): boolean {
  return (
    adminLookupError.includes("returned no accounts") ||
    adminLookupError.includes("PERMISSION_DENIED") ||
    adminLookupError.includes("UNAUTHENTICATED") ||
    adminLookupError.includes("(7)") ||
    adminLookupError.includes("(16)")
  );
}

async function resolveNumericPropertyId(): Promise<{
  id: string | null;
  /** Set when measurement-id lookup via Admin API throws (permissions, API disabled, network). */
  adminLookupError: string | null;
}> {
  const fromEnv = getNumericPropertyIdFromEnv();
  if (fromEnv) return { id: fromEnv, adminLookupError: null };

  const measurementId = normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "");
  if (!measurementId) return { id: null, adminLookupError: null };

  try {
    const admin = new analyticsAdmin.AnalyticsAdminServiceClient(getClientOptions());

    let sawAnyAccount = false;
    for await (const summary of admin.listAccountSummariesAsync()) {
      sawAnyAccount = true;
      for (const prop of summary.propertySummaries ?? []) {
        const parent = prop.property;
        if (!parent) continue;
        for await (const stream of admin.listDataStreamsAsync({ parent })) {
          const mid = stream.webStreamData?.measurementId;
          if (mid && mid.toUpperCase() === measurementId.toUpperCase()) {
            return { id: parent.replace(/^properties\//, ""), adminLookupError: null };
          }
        }
      }
    }

    if (!sawAnyAccount) {
      const email = getServiceCredentials()?.client_email ?? "this service account";
      return {
        id: null,
        adminLookupError: `Google Analytics returned no accounts for ${email}. In https://analytics.google.com open Admin → Account or Property access management and invite that address as Viewer (this is not the same as IAM in Google Cloud). Enable the “Google Analytics Admin API” in the same GCP project as the key. Until then, set GA4_PROPERTY_ID in .env.local to the numeric Property ID from Admin → Property details.`,
      };
    }

    return { id: null, adminLookupError: null };
  } catch (e) {
    return { id: null, adminLookupError: formatGoogleRpcError(e) };
  }
}

async function runDimensionBreakdown(
  client: BetaAnalyticsDataClient,
  propertyNumericId: string,
  dimension: string,
  limit = 16,
): Promise<GaDemographicRow[]> {
  const [resp] = await client.runReport({
    property: `properties/${propertyNumericId}`,
    dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit,
    keepEmptyRows: false,
  });

  const out: GaDemographicRow[] = [];
  for (const row of resp.rows ?? []) {
    const rawDim = row.dimensionValues?.[0]?.value ?? "(not set)";
    const rawMetric = row.metricValues?.[0]?.value ?? "0";
    const value = Number(rawMetric);
    if (!Number.isFinite(value)) continue;
    out.push({ label: formatDimensionLabel(dimension, rawDim), value });
  }
  return out;
}

async function loadGaAudienceSnapshot(): Promise<GaAudienceSnapshot> {
  const creds = getServiceCredentials();
  const hasAdc = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!creds && !hasAdc) {
    const envResult = parseGaServiceAccountEnv();
    if (envResult.status === "invalid_json") {
      return {
        status: "not_configured",
        message: `${envResult.varName} is set but is not valid JSON. In .env use one line or wrap in quotes; use \\n inside private_key.`,
      };
    }
    if (envResult.status === "missing_fields") {
      return {
        status: "not_configured",
        message: `${envResult.varName} is missing client_email and private_key (or nested serviceAccount / googleServiceAccount). Grant that account Viewer on the GA4 property.`,
      };
    }
    return {
      status: "not_configured",
      message:
        `Set ${ENV_GA_ANALYTICS} (preferred for GA4) or ${ENV_GOOGLE_SA} to your GCP service-account key JSON, or set GOOGLE_APPLICATION_CREDENTIALS to a key file path. Grant the account Viewer on the GA4 property. Set GA4_PROPERTY_ID (numeric) or NEXT_PUBLIC_GA_MEASUREMENT_ID for stream lookup.`,
    };
  }

  const invalidId = invalidExplicitPropertyIdMessage();
  if (invalidId) {
    return {
      status: "not_configured",
      message: invalidId,
    };
  }

  const { id: propertyNumericId, adminLookupError } = await resolveNumericPropertyId();

  if (!propertyNumericId) {
    if (adminLookupError) {
      const skipHint =
        adminLookupError.includes("no accounts") || adminLookupError.includes("PERMISSION_DENIED")
          ? ""
          : " Or set GA4_PROPERTY_ID in .env.local to the numeric Property ID (GA4 → Admin → Property details) to skip this step.";
      const scriptHint = adminLookupError.includes("returned no accounts")
        ? " After granting access, run: npm run ga4:list-properties"
        : "";
      return {
        status: isGaAccessSetupIssue(adminLookupError) ? "not_configured" : "error",
        message: `${adminLookupError}${skipHint}${scriptHint ? `. ${scriptHint}` : ""}`,
      };
    }
    return {
      status: "not_configured",
      message:
        "Set GA4_PROPERTY_ID in .env.local to the numeric Property ID (GA4 → Admin → Property details), or grant your service account Viewer in GA access management so your measurement ID can be matched automatically.",
    };
  }

  const options = getClientOptions();
  const dataClient = new BetaAnalyticsDataClient(options);

  try {
    const countries = await safeRunDimensionBreakdown(
      dataClient,
      propertyNumericId,
      "country",
      10,
    );
    const [gender, age, channels, devices] = await Promise.all([
      safeRunDimensionBreakdown(dataClient, propertyNumericId, "userGender"),
      safeRunDimensionBreakdown(dataClient, propertyNumericId, "userAgeBracket"),
      safeRunDimensionBreakdown(
        dataClient,
        propertyNumericId,
        "sessionDefaultChannelGrouping",
        10,
      ),
      safeRunDimensionBreakdown(dataClient, propertyNumericId, "deviceCategory", 10),
    ]);

    return {
      status: "ok",
      dateRangeLabel: "Last 28 days",
      propertyLabel:
        process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ??
        `Property ${propertyNumericId}`,
      gender,
      age,
      countries,
      channels,
      devices,
    };
  } catch (e) {
    const formatted = formatGoogleRpcError(e);
    if (formatted.includes("PERMISSION_DENIED") || formatted.includes("(7)") || formatted.includes("403")) {
      return {
        status: "error",
        message:
          "The service account cannot read this GA4 property. In GA4: Admin → Property access management → add the service account email with Viewer (or Analyst). Ensure GA4_PROPERTY_ID matches that property.",
      };
    }
    return {
      status: "error",
      message: formatted,
    };
  }
}

const getCachedGaAudienceSnapshot = unstable_cache(
  async () => loadGaAudienceSnapshot(),
  ["ga-audience-demographics", "v13-cleanup"],
  { revalidate: 300 },
);

export async function getGaAudienceSnapshot(): Promise<GaAudienceSnapshot> {
  return getCachedGaAudienceSnapshot();
}
