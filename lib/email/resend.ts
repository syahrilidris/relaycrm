import { createHmac, timingSafeEqual } from "node:crypto"

const RESEND_API = "https://api.resend.com"

export function getEmailConfig() {
  return {
    apiKey: (process.env.RESEND_API_KEY ?? "").trim(),
    webhookSecret: (process.env.RESEND_WEBHOOK_SECRET ?? "").trim(),
    address: (process.env.EMAIL_SUPPORT_ADDRESS ?? "support@bintangkids.com").trim().toLowerCase(),
    fromName: (process.env.EMAIL_FROM_NAME ?? "Bintang Kids").trim(),
  }
}

export function emailConfigured() {
  const config = getEmailConfig()
  return Boolean(config.apiKey && config.webhookSecret)
}

export class EmailError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Verifies a Resend (Svix) webhook signature. Rejects anything older than 5 minutes. */
export function verifyResendSignature(raw: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const signatures = headers.get("svix-signature")
  if (!secret || !id || !timestamp || !signatures) return false
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest()
  return signatures.split(" ").some((part) => {
    const [version, value] = part.split(",")
    if (version !== "v1" || !value) return false
    const given = Buffer.from(value, "base64")
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

/** "Jane Doe <jane@x.com>" → { name: "Jane Doe", email: "jane@x.com" } */
export function parseAddress(value: unknown): { name: string; email: string } {
  if (value && typeof value === "object" && "email" in value) {
    const v = value as { email?: unknown; name?: unknown }
    return { name: typeof v.name === "string" ? v.name.trim() : "", email: String(v.email ?? "").trim().toLowerCase() }
  }
  const text = String(value ?? "").trim()
  const match = text.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() }
  return { name: "", email: text.toLowerCase() }
}

async function resend<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey } = getEmailConfig()
  if (!apiKey) throw new EmailError(503, "Email isn't configured on the server yet (RESEND_API_KEY missing).")
  const response = await fetch(`${RESEND_API}${path}`, { ...init, headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" })
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new EmailError(response.status >= 500 ? 502 : 400, `Email provider error: ${typeof body.message === "string" ? body.message : response.statusText}`)
  return body as T
}

export type ReceivedEmail = { id: string; from: unknown; to?: unknown; subject?: string; text?: string | null; html?: string | null; message_id?: string; headers?: Record<string, string> | null; created_at?: string; attachments?: { id?: string; filename?: string; content_type?: string; size?: number; download_url?: string }[] }

/** Lists a received email's attachments with short-lived download links. */
export async function fetchReceivedAttachments(emailId: string) {
  try {
    const result = await resend<{ data?: { id?: string; filename?: string; content_type?: string; size?: number; download_url?: string }[] }>(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`)
    return Array.isArray(result.data) ? result.data : []
  } catch {
    return []
  }
}

export function fetchReceivedEmail(id: string) {
  return resend<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(id)}`)
}

export async function sendEmail(input: { to: string; subject: string; text: string; inReplyTo?: string; references?: string[]; attachments?: { url: string; name: string }[] }) {
  const { address, fromName } = getEmailConfig()
  const headers: Record<string, string> = {}
  if (input.inReplyTo) headers["In-Reply-To"] = input.inReplyTo
  if (input.references?.length) headers["References"] = input.references.slice(-10).join(" ")
  const result = await resend<{ id: string }>("/emails", {
    method: "POST",
    body: JSON.stringify({ from: `${fromName} <${address}>`, to: [input.to], subject: input.subject, text: input.text, reply_to: address, ...(Object.keys(headers).length ? { headers } : {}), ...(input.attachments?.length ? { attachments: input.attachments.map((item) => ({ filename: item.name, path: item.url })) } : {}) }),
  })
  return result.id
}

export function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
}

/** Keeps only the new part of a reply: drops "On … wrote:" and everything quoted below it. */
export function stripQuotedReply(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const kept: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const joined = `${line} ${lines[i + 1] ?? ""}`
    if (/^\s*>/.test(line)) break
    if (/^On\b.+wrote:\s*$/i.test(line.trim()) || (/^On\b/i.test(line.trim()) && /wrote:\s*$/i.test(joined.trim()))) break
    if (/^Pada\b.+menulis:\s*$/i.test(line.trim())) break
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line.trim()) || /^_{10,}$/.test(line.trim())) break
    if (/^From:\s.+/i.test(line.trim()) && /^(Sent|Date):\s/i.test((lines[i + 1] ?? "").trim())) break
    kept.push(line)
  }
  const result = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return result || text.trim()
}

export function replySubject(subject: string) {
  const clean = subject.trim() || "Bintang Kids"
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`
}
