import { attachmentKind, type Attachment } from "@/lib/crm-data"
import { createAdminClient } from "@/lib/supabase/admin"

export const ATTACHMENT_BUCKET = "crm-attachments"
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

let bucketReady = false

/** Public bucket: Meta and email providers must be able to fetch the file by URL. Paths are unguessable. */
export async function ensureAttachmentBucket() {
  if (bucketReady) return
  const admin = createAdminClient()
  const { data } = await admin.storage.getBucket(ATTACHMENT_BUCKET)
  if (!data) {
    const { error } = await admin.storage.createBucket(ATTACHMENT_BUCKET, { public: true, fileSizeLimit: MAX_ATTACHMENT_BYTES })
    if (error && !/already exists/i.test(error.message)) throw error
  }
  bucketReady = true
}

export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "")
  return (cleaned || "file").slice(-80)
}

export function attachmentPath(ownerId: string, name: string) {
  return `${ownerId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}/${safeFileName(name)}`
}

export function publicAttachmentUrl(path: string) {
  return createAdminClient().storage.from(ATTACHMENT_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Only files we host can be attached to outgoing messages. */
export function isOwnAttachmentUrl(url: string, ownerId: string) {
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  return Boolean(base) && url.startsWith(`${base}/storage/v1/object/public/${ATTACHMENT_BUCKET}/${ownerId}/`)
}

/** Copies a customer's file (Meta CDN links expire) into our bucket. Returns null if it can't be fetched. */
export async function rehostAttachment(ownerId: string, url: string, fallback: { name?: string; mime?: string; token?: string } = {}): Promise<Attachment | null> {
  try {
    await ensureAttachmentBucket()
    const response = await fetch(url, { headers: fallback.token ? { authorization: `Bearer ${fallback.token}` } : undefined, cache: "no-store" })
    if (!response.ok) return null
    const length = Number(response.headers.get("content-length") ?? 0)
    if (length > MAX_ATTACHMENT_BYTES) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_ATTACHMENT_BYTES) return null
    const mime = (response.headers.get("content-type") ?? fallback.mime ?? "application/octet-stream").split(";")[0].trim()
    const extension = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin"
    const name = fallback.name || `${attachmentKind(mime)}.${extension}`
    const path = attachmentPath(ownerId, name)
    const { error } = await createAdminClient().storage.from(ATTACHMENT_BUCKET).upload(path, buffer, { contentType: mime, upsert: false })
    if (error) return null
    return { url: publicAttachmentUrl(path), name, mime, size: buffer.length, kind: attachmentKind(mime) }
  } catch {
    return null
  }
}
