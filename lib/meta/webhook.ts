import { extractPhone } from "@/lib/crm-data"
import { createAdminClient } from "@/lib/supabase/admin"
import { colorForName, initialsForName } from "@/lib/crm-data"
import { lookupSenderProfile, type ConnectionRow, type MetaProvider } from "./connections"

/** A normalised message event from any Meta channel. */
export type InboundEvent =
  | { kind: "message"; provider: MetaProvider; accountId: string; userId: string; userName?: string; userPhone?: string; messageId: string; text: string; timestamp: string; fromBusiness: boolean }
  | { kind: "status"; provider: MetaProvider; accountId: string; messageId: string; status: "sent" | "delivered" | "read" | "failed" }

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function isoFromSeconds(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString()
  return new Date(n > 1e12 ? n : n * 1000).toISOString()
}

function whatsappText(message: Json): string {
  switch (message.type) {
    case "text": return message.text?.body ?? ""
    case "button": return message.button?.text ?? "[Button]"
    case "interactive": return message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? "[Interactive reply]"
    case "image": return message.image?.caption ? `📷 ${message.image.caption}` : "📷 Photo"
    case "video": return message.video?.caption ? `🎬 ${message.video.caption}` : "🎬 Video"
    case "audio": return "🎤 Voice message"
    case "document": return `📄 ${message.document?.filename ?? "Document"}`
    case "sticker": return "Sticker"
    case "location": return `📍 ${message.location?.name ?? "Location"}${message.location?.address ? ` — ${message.location.address}` : ""}`
    case "contacts": return "👤 Shared contact"
    case "reaction": return message.reaction?.emoji ? `Reacted ${message.reaction.emoji}` : ""
    case "unsupported": return "[Unsupported message]"
    default: return `[${message.type ?? "Message"}]`
  }
}

function messengerText(message: Json): string {
  if (typeof message.text === "string" && message.text) return message.text
  const attachment = Array.isArray(message.attachments) ? message.attachments[0] : null
  if (!attachment) return ""
  const labels: Record<string, string> = { image: "📷 Photo", video: "🎬 Video", audio: "🎤 Audio", file: "📄 File", location: "📍 Location", story_mention: "Mentioned you in a story", share: "Shared a post", ig_reel: "Shared a reel", reel: "Shared a reel" }
  return labels[attachment.type] ?? `[${attachment.type ?? "Attachment"}]`
}

/** Turns a raw Meta webhook payload into normalised events. */
export function parseWebhook(payload: Json): InboundEvent[] {
  const events: InboundEvent[] = []
  const entries: Json[] = Array.isArray(payload?.entry) ? payload.entry : []

  if (payload?.object === "whatsapp_business_account") {
    for (const entry of entries) for (const change of entry.changes ?? []) {
      const value = change?.value ?? {}
      const accountId = String(value.metadata?.phone_number_id ?? "")
      if (!accountId) continue
      const names = new Map<string, string>((value.contacts ?? []).map((c: Json) => [String(c.wa_id), String(c.profile?.name ?? "")]))
      for (const message of value.messages ?? []) {
        const text = whatsappText(message)
        if (!text) continue
        const userId = String(message.from)
        events.push({ kind: "message", provider: "whatsapp", accountId, userId, userName: names.get(userId) || undefined, userPhone: `+${userId}`, messageId: String(message.id), text, timestamp: isoFromSeconds(message.timestamp), fromBusiness: false })
      }
      for (const status of value.statuses ?? []) {
        if (["sent", "delivered", "read", "failed"].includes(status.status)) events.push({ kind: "status", provider: "whatsapp", accountId, messageId: String(status.id), status: status.status })
      }
    }
  }

  if (payload?.object === "page" || payload?.object === "instagram") {
    const provider: MetaProvider = payload.object === "page" ? "facebook" : "instagram"
    for (const entry of entries) {
      const accountId = String(entry.id ?? "")
      for (const item of entry.messaging ?? []) {
        if (item.message && !item.message.is_deleted) {
          const echo = Boolean(item.message.is_echo)
          const text = messengerText(item.message)
          if (!text) continue
          events.push({ kind: "message", provider, accountId, userId: String(echo ? item.recipient?.id : item.sender?.id), messageId: String(item.message.mid), text, timestamp: isoFromSeconds(item.timestamp), fromBusiness: echo })
        } else if (item.postback) {
          events.push({ kind: "message", provider, accountId, userId: String(item.sender?.id), messageId: String(item.postback.mid ?? `${item.sender?.id}-${item.timestamp}`), text: item.postback.title ?? "[Button]", timestamp: isoFromSeconds(item.timestamp), fromBusiness: false })
        } else if (item.read?.mid) {
          events.push({ kind: "status", provider, accountId, messageId: String(item.read.mid), status: "read" })
        } else if (Array.isArray(item.delivery?.mids)) {
          for (const mid of item.delivery.mids) events.push({ kind: "status", provider, accountId, messageId: String(mid), status: "delivered" })
        }
      }
    }
  }
  return events
}

async function findConnection(provider: MetaProvider, accountId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.from("crm_channel_connections").select("id,owner_id,provider,external_account_id,display_name,details,status").eq("provider", provider).eq("external_account_id", accountId).neq("status", "disconnected").maybeSingle()
  if (error) throw error
  return data as ConnectionRow | null
}

async function findOrCreateContact(connection: ConnectionRow, event: Extract<InboundEvent, { kind: "message" }>) {
  const admin = createAdminClient()
  const { data: identity, error } = await admin.from("crm_contact_identities").select("contact_id").eq("connection_id", connection.id).eq("external_user_id", event.userId).maybeSingle()
  if (error) throw error
  if (identity) return identity.contact_id as string

  const profile = event.userName ? { name: event.userName, handle: null } : await lookupSenderProfile(connection, event.userId)
  const fallback = ({ whatsapp: "WhatsApp", facebook: "Messenger", instagram: "Instagram", email: "Email" } as const)[connection.provider]
  const name = (profile.name || event.userPhone || `${fallback} user ${event.userId.slice(-4)}`).slice(0, 120)
  const { data: contact, error: contactError } = await admin.from("crm_contacts").insert({
    owner_id: connection.owner_id,
    name,
    initials: initialsForName(name),
    color: colorForName(name),
    phone: event.userPhone ?? "",
    primary_channel: connection.provider,
    handle: profile.handle ?? event.userPhone ?? "",
    assigned: "",
    last_seen: event.timestamp,
    tags: ["New lead"],
  }).select("id").single()
  if (contactError || !contact) throw contactError ?? new Error("Contact insert failed")

  const { error: identityError } = await admin.from("crm_contact_identities").insert({ owner_id: connection.owner_id, contact_id: contact.id, connection_id: connection.id, external_user_id: event.userId })
  if (identityError) {
    // Another webhook delivery created it first: drop our duplicate contact and use theirs.
    await admin.from("crm_contacts").delete().eq("id", contact.id)
    const { data: winner } = await admin.from("crm_contact_identities").select("contact_id").eq("connection_id", connection.id).eq("external_user_id", event.userId).single()
    if (!winner) throw identityError
    return winner.contact_id as string
  }
  return contact.id as string
}

async function findOrCreateConversation(connection: ConnectionRow, contactId: string, userId: string, timestamp: string) {
  const admin = createAdminClient()
  const select = () => admin.from("crm_conversations").select("id").eq("connection_id", connection.id).eq("external_user_id", userId).maybeSingle()
  const { data: existing, error } = await select()
  if (error) throw error
  if (existing) return existing.id as string
  const { data, error: insertError } = await admin.from("crm_conversations").insert({ owner_id: connection.owner_id, contact_id: contactId, channel: connection.provider, messages: [], unread_count: 0, last_activity: timestamp, connection_id: connection.id, external_user_id: userId }).select("id").single()
  if (data) return data.id as string
  const { data: retry } = await select()
  if (!retry) throw insertError ?? new Error("Conversation insert failed")
  return retry.id as string
}

export async function ingestEvents(events: InboundEvent[]) {
  const admin = createAdminClient()
  const connections = new Map<string, ConnectionRow | null>()
  let stored = 0
  const unmatched: string[] = []
  for (const event of events) {
    const key = `${event.provider}:${event.accountId}`
    if (!connections.has(key)) connections.set(key, await findConnection(event.provider, event.accountId))
    const connection = connections.get(key)
    if (!connection) {
      if (!unmatched.includes(key)) unmatched.push(key)
      continue
    }

    if (event.kind === "status") {
      const { error } = await admin.rpc("crm_update_message_status", { p_connection_id: connection.id, p_external_id: event.messageId, p_status: event.status })
      if (error) throw error
      continue
    }

    const contactId = await findOrCreateContact(connection, event)
    const conversationId = await findOrCreateConversation(connection, contactId, event.userId, event.timestamp)
    const message = { id: crypto.randomUUID(), external_id: event.messageId, sender: event.fromBusiness ? "agent" : "contact", text: event.text.slice(0, 4000), timestamp: event.timestamp, type: "chat", ...(event.fromBusiness ? { status: "sent", via: "meta" } : {}) }
    const { data: appended, error } = await admin.rpc("crm_append_message", { p_conversation_id: conversationId, p_message: message, p_unread_increment: event.fromBusiness ? 0 : 1, p_activity: event.timestamp })
    if (error) throw error
    if (appended) stored++
    if (!event.fromBusiness) {
      await admin.from("crm_contacts").update({ last_seen: event.timestamp, updated_at: new Date().toISOString() }).eq("id", contactId)
      // "My number is 016-…" in Messenger/Instagram: keep it so the contact can be matched to their WhatsApp.
      const typedPhone = event.provider === "whatsapp" ? "" : extractPhone(event.text)
      if (typedPhone) await admin.from("crm_contacts").update({ phone: typedPhone }).eq("id", contactId).eq("phone", "")
    }
  }
  const touched = [...connections.values()].filter((c): c is ConnectionRow => Boolean(c))
  if (touched.length) await admin.from("crm_channel_connections").update({ last_event_at: new Date().toISOString() }).in("id", touched.map((c) => c.id))
  return { stored, unmatched }
}
