const MAX_BODY_BYTES = 16 * 1024;
const MAX_REPORTS_PER_REQUEST = 10;
const MAX_LOG_FIELD_LENGTH = 512;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

type JsonRecord = Record<string, unknown>;

interface SanitizedCspReport {
  documentUrl: string;
  blockedUrl?: string;
  directive: string;
  sourceFile?: string;
  disposition?: string;
  lineNumber?: number;
  columnNumber?: number;
  statusCode?: number;
}

function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: RESPONSE_HEADERS });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mediaType(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
}

async function readLimitedBody(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES) return null;
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    byteLength += value.byteLength;
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ").trim();
  return cleaned ? cleaned.slice(0, MAX_LOG_FIELD_LENGTH) : undefined;
}

function cleanUrl(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `${url.origin}${url.pathname}`.slice(0, MAX_LOG_FIELD_LENGTH);
    }
    return url.protocol.slice(0, -1).slice(0, MAX_LOG_FIELD_LENGTH);
  } catch {
    return text.split(/[?#]/, 1)[0].slice(0, MAX_LOG_FIELD_LENGTH);
  }
}

function cleanDocumentUrl(value: unknown, expectedOrigin: string): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin === expectedOrigin) {
      return `${url.origin}${url.pathname}`.slice(0, MAX_LOG_FIELD_LENGTH);
    }
  } catch {
    // CSP document URLs are absolute; malformed or cross-origin values are rejected.
  }
  return undefined;
}

function cleanNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined;
}

function first(record: JsonRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function sanitizeReport(body: JsonRecord, expectedOrigin: string): SanitizedCspReport | null {
  const documentUrl = cleanDocumentUrl(first(body, "documentURL", "document-uri"), expectedOrigin);
  const directive = cleanText(first(body, "effectiveDirective", "effective-directive", "violated-directive"));
  if (!documentUrl || !directive) return null;

  const report: SanitizedCspReport = { documentUrl, directive };
  const blockedUrl = cleanUrl(first(body, "blockedURL", "blocked-uri"));
  const sourceFile = cleanUrl(first(body, "sourceFile", "source-file"));
  const disposition = cleanText(body.disposition);
  const lineNumber = cleanNumber(first(body, "lineNumber", "line-number"));
  const columnNumber = cleanNumber(first(body, "columnNumber", "column-number"));
  const statusCode = cleanNumber(first(body, "statusCode", "status-code"));

  if (blockedUrl) report.blockedUrl = blockedUrl;
  if (sourceFile) report.sourceFile = sourceFile;
  if (disposition) report.disposition = disposition;
  if (lineNumber !== undefined) report.lineNumber = lineNumber;
  if (columnNumber !== undefined) report.columnNumber = columnNumber;
  if (statusCode !== undefined) report.statusCode = statusCode;
  return report;
}

function parseReports(payload: unknown, type: string, expectedOrigin: string): SanitizedCspReport[] | null {
  if (type === "application/csp-report") {
    if (!isRecord(payload) || !isRecord(payload["csp-report"])) return null;
    const report = sanitizeReport(payload["csp-report"], expectedOrigin);
    return report ? [report] : null;
  }

  if (!Array.isArray(payload) || payload.length === 0 || payload.length > MAX_REPORTS_PER_REQUEST) {
    return null;
  }

  const reports = payload.flatMap((entry) => {
    if (!isRecord(entry) || entry.type !== "csp-violation" || !isRecord(entry.body)) return [];
    const report = sanitizeReport(entry.body, expectedOrigin);
    return report ? [report] : [];
  });
  return reports.length > 0 ? reports : null;
}

/**
 * CSP violation collector. Reports are size-bounded, shape-validated and
 * stripped of query strings, fragments and script samples before central logging.
 */
export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("sec-fetch-site") === "cross-site") return emptyResponse(403);

  const type = mediaType(request);
  if (type !== "application/csp-report" && type !== "application/reports+json") {
    return emptyResponse(415);
  }

  let rawBody: string | null;
  try {
    rawBody = await readLimitedBody(request);
  } catch {
    return emptyResponse(400);
  }
  if (rawBody === null) return emptyResponse(413);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return emptyResponse(400);
  }

  const reports = parseReports(payload, type, new URL(request.url).origin);
  if (!reports) return emptyResponse(400);

  console.info("[csp-report]", JSON.stringify({ reports }));
  return emptyResponse(204);
}
