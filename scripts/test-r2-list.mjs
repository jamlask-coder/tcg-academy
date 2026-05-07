// Test R2 connectivity desde local con la misma firma SigV4 que usa el server.
// Reproduce s3List() del módulo src/lib/backup/s3Client.ts.

import { readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { resolve } from "node:path";

// Leer .env.local manualmente
const env = {};
const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const endpoint = env.BACKUP_S3_ENDPOINT;
const bucket = env.BACKUP_S3_BUCKET;
const region = env.BACKUP_S3_REGION || "auto";
const accessKeyId = env.BACKUP_S3_ACCESS_KEY;
const secretAccessKey = env.BACKUP_S3_SECRET_KEY;

console.log("Endpoint:", endpoint);
console.log("Bucket:", bucket);
console.log("Region:", region);
console.log("AccessKey:", accessKeyId?.slice(0, 6) + "...");

const sha256Hex = (d) => createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const now = new Date();
const iso = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
const amz = iso;
const short = iso.slice(0, 8);

const url = new URL(endpoint);
const host = url.host;
const pathPrefix = `/${bucket}`;

const query = {
  "list-type": "2",
  "max-keys": "1000",
  prefix: "tcgacademy-backups/",
};

const sortedQuery = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join("&");
const canonicalPath = `${pathPrefix}/`;
const payloadHash = sha256Hex("");

const headers = {
  host,
  "x-amz-content-sha256": payloadHash,
  "x-amz-date": amz,
};

const signedHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[k].trim()}`).join("\n") + "\n";
const signedHeaders = signedHeaderKeys.join(";");

const canonicalRequest = ["GET", canonicalPath, sortedQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");

console.log("\n--- Canonical Request ---");
console.log(canonicalRequest);

const credentialScope = `${short}/${region}/s3/aws4_request`;
const stringToSign = ["AWS4-HMAC-SHA256", amz, credentialScope, sha256Hex(canonicalRequest)].join("\n");

const kDate = hmac(`AWS4${secretAccessKey}`, short);
const kRegion = hmac(kDate, region);
const kService = hmac(kRegion, "s3");
const kSigning = hmac(kService, "aws4_request");
const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

const auth = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

const finalUrl = `${url.protocol}//${url.host}${canonicalPath}?${sortedQuery}`;

console.log("\n--- Request ---");
console.log("URL:", finalUrl);
console.log("Auth:", auth.slice(0, 80) + "...");

const res = await fetch(finalUrl, {
  method: "GET",
  headers: { ...headers, authorization: auth },
});

console.log("\n--- Response ---");
console.log("Status:", res.status);
const text = await res.text();
console.log("Body:", text.slice(0, 800));
