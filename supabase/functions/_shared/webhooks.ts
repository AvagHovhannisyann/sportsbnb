/**
 * Svix webhook signature verification (used by Resend webhooks).
 * https://docs.svix.com/receiving/verifying-payloads/how-manual
 */

const TOLERANCE_SECONDS = 5 * 60;

export async function verifySvixSignature(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<boolean> {
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const secretBytes = base64Decode(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = base64Encode(new Uint8Array(signature));

  // Header may contain multiple space-separated signatures like "v1,<base64>"
  return svixSignature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    return timingSafeEqual(sig, expected);
  });
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
