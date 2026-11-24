import { createHmac, timingSafeEqual } from "node:crypto"
import { colorForName, initialsForName } from "@/lib/crm-data"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_ORIGINS = new Set(["https://bintangkids.com", "https://www.bintangkids.com", "https://crm.bintangkids.com", "http://localhost:3000"])

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.bintangkids.com"
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Access-Control-Max-Age": "86400", Vary: "Origin", "Cache-Control": "no-store" }
}

function secret() {
  const base = process.env.WEBCHAT_SECRET || process.env.META_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!base) throw new Error("Webchat secret is not configured.")
  return createHmac("sha256", base).update("bintang-webchat-v1").digest()
}

export function visitorToken(visitorId: string) {
  return createHmac("sha256", secret()).update(visitorId).digest("base64url")
}

export function validVisitor(visitorId: unknown, token: unknown): visitorId is string {
  if (typeof visitorId !== "string" || !/^[a-f0-9-]{36}$/.test(visitorId) || typeof token !== "string") return false
  const expected = Buffer.from(visitorToken(visitorId))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** The workspace that owns the website: the owner of the connected support email. */
export async function siteOwnerId() {
  if (process.env.WEBCHAT_OWNER_ID) return process.env.WEBCHAT_OWNER_ID
  const { data } = await createAdminClient().from("crm_channel_connections").select("owner_id").eq("provider", "email").neq("status", "disconnected").order("created_at").limit(1).maybeSingle()
  return (data?.owner_id as string | undefined) ?? null
}

export function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "")
  if (/^01\d{7,9}$/.test(digits)) return `+6${digits}`
  if (/^60\d{8,10}$/.test(digits)) return `+${digits}`
  return digits
}

/** Matches an existing contact by email or phone (last 9 digits), else creates a new lead. */
export async function findOrCreateWebContact(ownerId: string, input: { name: string; email: string; phone: string; channel: "webchat" | "email" }) {
  const admin = createAdminClient()
  if (input.email) {
    const { data } = await admin.from("crm_contacts").select("id").eq("owner_id", ownerId).ilike("email", input.email).limit(1).maybeSingle()
    if (data) return data.id as string
  }
  const tail = input.phone.replace(/\D/g, "").slice(-9)
  if (tail.length === 9) {
    const { data } = await admin.from("crm_contacts").select("id").eq("owner_id", ownerId).ilike("phone", `%${tail}`).limit(1).maybeSingle()
    if (data) return data.id as string
  }
  const name = (input.name || input.email.split("@")[0] || "Website visitor").slice(0, 120)
  const { data, error } = await admin.from("crm_contacts").insert({
    owner_id: ownerId, name, initials: initialsForName(name), color: colorForName(name), email: input.email, phone: input.phone,
    primary_channel: input.channel, handle: input.email || input.phone, assigned: "", last_seen: new Date().toISOString(), tags: ["New lead", "Website"],
  }).select("id").single()
  if (error || !data) throw error ?? new Error("Contact insert failed")
  return data.id as string
}

export async function findWebConversation(ownerId: string, visitorId: string) {
  const { data } = await createAdminClient().from("crm_conversations").select("id,contact_id,messages").eq("owner_id", ownerId).eq("channel", "webchat").is("connection_id", null).eq("external_user_id", visitorId).maybeSingle()
  return data as { id: string; contact_id: string; messages: unknown[] } | null
}
