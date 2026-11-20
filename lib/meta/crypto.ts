import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

function encryptionKey() {
  const secret = process.env.META_TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured.")
  return createHash("sha256").update(secret).digest()
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptToken(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptToken(value: string) {
  const [version, iv, tag, data] = value.split(".")
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised token format.")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
}

/** Verifies Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header || !header.startsWith("sha256=") || !appSecret) return false
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest()
  const provided = Buffer.from(header.slice("sha256=".length), "hex")
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

/** appsecret_proof hardens server-side Graph API calls made with a user or page token. */
export function appSecretProof(token: string, appSecret: string) {
  return createHmac("sha256", appSecret).update(token).digest("hex")
}
