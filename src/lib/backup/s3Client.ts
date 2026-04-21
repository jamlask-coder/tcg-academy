/**
 * Cliente S3-compatible minimalista con firmado AWS Signature V4.
 *
 * Funciona con Cloudflare R2, AWS S3, Backblaze B2, DigitalOcean Spaces, MinIO.
 * No depende de @aws-sdk (ahorra ~10MB de bundle). Usa fetch nativo de Node 20+.
 *
 * Referencia oficial SigV4:
 * https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
 */

import { createHash, createHmac } from "node:crypto";
import type { BackupLocation } from "./types";

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface S3PutParams {
  endpoint: string;
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
  credentials: S3Credentials;
}

export interface S3GetParams {
  endpoint: string;
  bucket: string;
  key: string;
  credentials: S3Credentials;
}

export interface S3DeleteParams {
  endpoint: string;
  bucket: string;
  key: string;
  credentials: S3Credentials;
}

export interface S3ListParams {
  endpoint: string;
  bucket: string;
  prefix?: string;
  credentials: S3Credentials;
  maxKeys?: number;
}

export interface S3ListEntry {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function amzDate(d: Date): { amz: string; short: string } {
  const iso = d.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  return { amz: iso, short: iso.slice(0, 8) };
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeRfc3986(seg))
    .join("/");
}

function hostFromEndpoint(endpoint: string, bucket: string): { host: string; urlBase: string; pathPrefix: string } {
  const url = new URL(endpoint);
  const host = url.host;
  // Path-style (bucket en el path): funciona con R2, MinIO, S3 region endpoint.
  // Virtual-hosted estaría disponible pero complica subdominios con R2.
  return {
    host,
    urlBase: `${url.protocol}//${url.host}`,
    pathPrefix: `/${bucket}`,
  };
}

interface SignOpts {
  method: string;
  endpoint: string;
  bucket: string;
  key: string;
  query?: Record<string, string>;
  body: Buffer | "";
  credentials: S3Credentials;
  contentType?: string;
  payloadSha?: string;
}

function signRequest(opts: SignOpts): { url: string; headers: Record<string, string> } {
  const { method, endpoint, bucket, key, query = {}, body, credentials, contentType } = opts;
  const { host, urlBase, pathPrefix } = hostFromEndpoint(endpoint, bucket);
  const now = new Date();
  const { amz, short } = amzDate(now);

  const payloadHash =
    opts.payloadSha ?? (body === "" ? sha256Hex("") : sha256Hex(body));

  const canonicalPath = `${pathPrefix}/${encodePath(key)}`.replace(/\/+/g, "/");

  const sortedQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(query[k])}`)
    .join("&");

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaderKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const canonicalHeaders =
    signedHeaderKeys
      .map((k) => `${k}:${headers[k].trim().replace(/\s+/g, " ")}`)
      .join("\n") + "\n";
  const signedHeaders = signedHeaderKeys.join(";");

  const canonicalRequest = [
    method,
    canonicalPath,
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${short}/${credentials.region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amz,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, short);
  const kRegion = hmac(kDate, credentials.region);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  const authHeader = `${ALGORITHM} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const finalUrl = sortedQuery
    ? `${urlBase}${canonicalPath}?${sortedQuery}`
    : `${urlBase}${canonicalPath}`;

  return {
    url: finalUrl,
    headers: { ...headers, authorization: authHeader },
  };
}

export async function s3Put(params: S3PutParams): Promise<void> {
  const { url, headers } = signRequest({
    method: "PUT",
    endpoint: params.endpoint,
    bucket: params.bucket,
    key: params.key,
    body: params.body,
    credentials: params.credentials,
    contentType: params.contentType ?? "application/octet-stream",
  });
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(params.body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 PUT ${params.key} → ${res.status}: ${text.slice(0, 300)}`);
  }
}

export async function s3Get(params: S3GetParams): Promise<Buffer> {
  const { url, headers } = signRequest({
    method: "GET",
    endpoint: params.endpoint,
    bucket: params.bucket,
    key: params.key,
    body: "",
    credentials: params.credentials,
  });
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 GET ${params.key} → ${res.status}: ${text.slice(0, 300)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function s3Delete(params: S3DeleteParams): Promise<void> {
  const { url, headers } = signRequest({
    method: "DELETE",
    endpoint: params.endpoint,
    bucket: params.bucket,
    key: params.key,
    body: "",
    credentials: params.credentials,
  });
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`S3 DELETE ${params.key} → ${res.status}: ${text.slice(0, 300)}`);
  }
}

export async function s3List(params: S3ListParams): Promise<S3ListEntry[]> {
  const query: Record<string, string> = {
    "list-type": "2",
    "max-keys": String(params.maxKeys ?? 1000),
  };
  if (params.prefix) query.prefix = params.prefix;

  const { url, headers } = signRequest({
    method: "GET",
    endpoint: params.endpoint,
    bucket: params.bucket,
    key: "",
    query,
    body: "",
    credentials: params.credentials,
  });
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 LIST → ${res.status}: ${text.slice(0, 300)}`);
  }
  const xml = await res.text();
  return parseListXml(xml);
}

// Parser XML minimalista: extrae solo los campos que necesitamos sin añadir
// dependencias. ListBucketResult devuelve <Contents><Key/><Size/><LastModified/><ETag/></Contents>
function parseListXml(xml: string): S3ListEntry[] {
  const entries: S3ListEntry[] = [];
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  const keyRegex = /<Key>([\s\S]*?)<\/Key>/;
  const sizeRegex = /<Size>([0-9]+)<\/Size>/;
  const lmRegex = /<LastModified>([\s\S]*?)<\/LastModified>/;
  const etagRegex = /<ETag>([\s\S]*?)<\/ETag>/;
  let match: RegExpExecArray | null;
  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1];
    const k = keyRegex.exec(block);
    const s = sizeRegex.exec(block);
    const lm = lmRegex.exec(block);
    const e = etagRegex.exec(block);
    if (k && s && lm) {
      entries.push({
        key: decodeXml(k[1]),
        size: Number(s[1]),
        lastModified: lm[1],
        etag: e ? e[1].replace(/^"|"$/g, "") : "",
      });
    }
  }
  return entries;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function getBackupLocation(): BackupLocation | null {
  const endpoint = process.env.BACKUP_S3_ENDPOINT;
  const bucket = process.env.BACKUP_S3_BUCKET;
  const region = process.env.BACKUP_S3_REGION ?? "auto";
  if (!endpoint || !bucket) return null;
  return {
    endpoint,
    bucket,
    region,
    keyPrefix: "tcgacademy-backups",
  };
}

export function getBackupCredentials(): S3Credentials | null {
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_KEY;
  const region = process.env.BACKUP_S3_REGION ?? "auto";
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey, region };
}

export function isBackupS3Configured(): boolean {
  return Boolean(getBackupLocation() && getBackupCredentials());
}
