import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { metaAppConfigured } from "@/lib/meta/config"
import { ConnectionError, connectWhatsApp, disconnectConnection, loadConnection, sendMetaMessage } from "@/lib/meta/connections"
import { createAdminClient } from "@/lib/supabase/admin"
import { isOwnAttachmentUrl } from "@/lib/attachments-server"
import { EmailError, emailConfigured, getEmailConfig, replySubject, sendEmail } from "@/lib/email/resend"
import { findEmailConnection, findOrCreateEmailContact, findOrCreateEmailConversation } from "@/lib/email/inbound"
import { attachmentKind, attachmentLabel, defaultQuickReplies, type Attachment, type QuickReply, colorForName, defaultCrmPreferences, initialsForName, isChannel, isPriority, type CaseStatus, type ContactInput, type Channel, type ChannelConnection, type CrmMutation, type CrmPreferences, type CrmSnapshot, type EscalationLevel, escalationNote, type InteractionType, type Message, type Priority } from "@/lib/crm-data"

type StoredMessage = { id?: string; external_id?: string; sender: "contact" | "agent" | "system"; text: string; timestamp: string; type: "chat" | "email" | "note" | "call"; subject?: string; message_id?: string; attachments?: Attachment[]; status?: "sent" | "delivered" | "read" | "failed"; via?: string }

const contactColumns = "id,name,initials,color,company,email,phone,primary_channel,handle,assigned,last_seen,tags,created_at"
const caseColumns = "id,title,contact_id,status,priority,channel_source,notes,created_at,updated_at,escalation_level,escalation_reason,escalated_at"
const conversationColumns = "id,contact_id,channel,messages,unread_count,last_activity,connection_id"
const connectionColumns = "id,provider,external_account_id,display_name,status,last_error,last_event_at,created_at"
const interactionColumns = "id,contact_id,type,summary,occurred_at,follow_up"

export class CrmServerError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function getCrmAuthContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new CrmServerError(401, "Sign in to access this workspace.")
  return { supabase, user }
}

function throwDatabaseError(error: unknown): never {
  console.error("[crm] Database operation failed", error)
  throw new CrmServerError(500, "The CRM database could not complete that request.")
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / (24 * 60))}d`
}

function mapMessages(raw: unknown, conversationId: string): Message[] {
  if (!Array.isArray(raw)) return []
  return raw.map((entry, index) => {
    const value = entry as Partial<StoredMessage>
    const sender = value.sender === "agent" || value.sender === "system" ? value.sender : "contact"
    const type = value.type === "email" || value.type === "note" || value.type === "call" ? value.type : "chat"
    return {
      id: value.id || `${conversationId}-${index}`,
      from: sender,
      text: typeof value.text === "string" ? value.text : "",
      time: typeof value.timestamp === "string" ? value.timestamp : "",
      kind: type,
      ...(typeof value.subject === "string" ? { subject: value.subject } : {}),
      ...(Array.isArray(value.attachments) && value.attachments.length ? { attachments: value.attachments.filter((item) => item && typeof item.url === "string").map((item) => ({ url: item.url, name: String(item.name ?? "file"), mime: String(item.mime ?? ""), ...(typeof item.size === "number" ? { size: item.size } : {}), kind: item.kind ?? attachmentKind(String(item.mime ?? "")) })) } : {}),
      ...(value.status === "sent" || value.status === "delivered" || value.status === "read" || value.status === "failed" ? { status: value.status } : {}),
    }
  })
}

function mapContact(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    initials: String(row.initials ?? ""),
    color: String(row.color ?? "bg-slate-100 text-slate-700"),
    company: String(row.company ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    channel: row.primary_channel as Channel,
    handle: String(row.handle ?? ""),
    assigned: String(row.assigned ?? ""),
    lastSeen: String(row.last_seen ?? ""),
    tags: Array.isArray(row.tags) ? row.tags as string[] : [],
  }
}

function mapCase(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title),
    contactId: String(row.contact_id),
    priority: row.priority as Priority,
    channel: row.channel_source as Channel,
    status: row.status as CaseStatus,
    updated: relativeTime(String(row.updated_at)) === "now" ? "Just now" : `${relativeTime(String(row.updated_at))} ago`,
    notes: Array.isArray(row.notes) ? row.notes as string[] : [],
    escalation: (row.escalation_level === 1 || row.escalation_level === 2 ? row.escalation_level : 0) as EscalationLevel,
    escalationReason: typeof row.escalation_reason === "string" ? row.escalation_reason : null,
    escalatedAt: typeof row.escalated_at === "string" ? row.escalated_at : null,
    createdAt: String(row.created_at),
  }
}

function mapConnection(row: Record<string, unknown>): ChannelConnection {
  return {
    id: String(row.id),
    provider: row.provider as ChannelConnection["provider"],
    externalAccountId: String(row.external_account_id),
    name: String(row.display_name ?? ""),
    status: row.status as ChannelConnection["status"],
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    lastEventAt: typeof row.last_event_at === "string" ? row.last_event_at : null,
    createdAt: String(row.created_at),
  }
}

function mapConversation(row: Record<string, unknown>, connections: Map<string, ChannelConnection>) {
  const messages = mapMessages(row.messages, String(row.id))
  const connection = typeof row.connection_id === "string" ? connections.get(row.connection_id) : undefined
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    channel: row.channel as Channel,
    preview: messages.at(-1)?.text || attachmentLabel(messages.at(-1)?.attachments) || "",
    time: relativeTime(String(row.last_activity)),
    unread: Number(row.unread_count ?? 0),
    lastActivity: String(row.last_activity),
    messages,
    connectionId: connection && connection.status !== "disconnected" ? connection.id : null,
    ...(connection ? { connectionName: connection.name } : {}),
  }
}

function mapInteraction(row: Record<string, unknown>) {
  const occurredAt = new Date(String(row.occurred_at))
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    type: row.type as InteractionType,
    summary: String(row.summary),
    // Sent as ISO and formatted in the browser so it shows in the viewer's time zone, not the server's (UTC).
    date: Number.isNaN(occurredAt.valueOf()) ? String(row.occurred_at) : occurredAt.toISOString(),
    followUp: Boolean(row.follow_up),
  }
}

function mapUserPreferences(value: unknown): CrmPreferences {
  if (!isRecord(value)) return defaultCrmPreferences
  const notificationValues = isRecord(value.notifications) ? value.notifications : {}
  const channelValues = isRecord(value.channels) ? value.channels : {}
  return {
    notifications: {
      replies: typeof notificationValues.replies === "boolean" ? notificationValues.replies : defaultCrmPreferences.notifications.replies,
      assignments: typeof notificationValues.assignments === "boolean" ? notificationValues.assignments : defaultCrmPreferences.notifications.assignments,
      dailyDigest: typeof notificationValues.dailyDigest === "boolean" ? notificationValues.dailyDigest : defaultCrmPreferences.notifications.dailyDigest,
    },
    channels: {
      whatsapp: typeof channelValues.whatsapp === "boolean" ? channelValues.whatsapp : true,
      email: typeof channelValues.email === "boolean" ? channelValues.email : true,
      instagram: typeof channelValues.instagram === "boolean" ? channelValues.instagram : true,
      facebook: typeof channelValues.facebook === "boolean" ? channelValues.facebook : true,
      webchat: typeof channelValues.webchat === "boolean" ? channelValues.webchat : true,
    },
  }
}

function displayNameForUser(user: User) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim()
  return user.email?.split("@")[0] || "Workspace owner"
}

export async function getCrmSnapshot(supabase: SupabaseClient, user: User): Promise<CrmSnapshot> {
  const [contactsResult, casesResult, conversationsResult, interactionsResult, connectionsResult] = await Promise.all([
    supabase.from("crm_contacts").select(contactColumns).eq("owner_id", user.id).order("name"),
    supabase.from("crm_cases").select(caseColumns).eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("crm_conversations").select(conversationColumns).eq("owner_id", user.id).order("last_activity", { ascending: false }),
    supabase.from("crm_interactions").select(interactionColumns).eq("owner_id", user.id).order("occurred_at", { ascending: false }),
    supabase.from("crm_channel_connections").select(connectionColumns).eq("owner_id", user.id).order("created_at"),
  ])
  if (contactsResult.error) throwDatabaseError(contactsResult.error)
  if (casesResult.error) throwDatabaseError(casesResult.error)
  if (conversationsResult.error) throwDatabaseError(conversationsResult.error)
  if (interactionsResult.error) throwDatabaseError(interactionsResult.error)
  // Older databases may not have the Meta tables yet; the CRM still works without them.
  if (connectionsResult.error) console.warn("[crm] Channel connections unavailable", connectionsResult.error.message)
  const connections = (connectionsResult.data ?? []).map((row) => mapConnection(row as Record<string, unknown>))
  const connectionMap = new Map(connections.map((item) => [item.id, item]))

  return {
    contacts: (contactsResult.data ?? []).map((row) => mapContact(row as Record<string, unknown>)),
    cases: (casesResult.data ?? []).map((row) => mapCase(row as Record<string, unknown>)),
    conversations: (conversationsResult.data ?? []).map((row) => mapConversation(row as Record<string, unknown>, connectionMap)),
    interactions: (interactionsResult.data ?? []).map((row) => mapInteraction(row as Record<string, unknown>)),
    viewer: { id: user.id, name: displayNameForUser(user), email: user.email ?? "" },
    preferences: mapUserPreferences(user.user_metadata?.crm_preferences),
    connections: connections.filter((item) => item.status !== "disconnected"),
    integrations: { metaReady: metaAppConfigured(), emailReady: emailConfigured() },
    quickReplies: mapQuickReplies(user.user_metadata?.crm_quick_replies),
  }
}

function mapQuickReplies(raw: unknown): QuickReply[] {
  if (!Array.isArray(raw)) return defaultQuickReplies
  return raw.filter((item): item is QuickReply => isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.text === "string")
}

function parseAttachments(raw: unknown): Attachment[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > 10) throw new CrmServerError(400, "You can attach up to 10 files per message.")
  return raw.map((item) => {
    const value = isRecord(item) ? item : {}
    const url = boundedString(value.url, 1000)
    const name = boundedString(value.name, 200)
    const mime = boundedString(value.mime, 120) || "application/octet-stream"
    if (!url || !/^https:\/\//.test(url) || !name) throw new CrmServerError(400, "One of the attachments is invalid.")
    return { url, name, mime, ...(typeof value.size === "number" ? { size: value.size } : {}), kind: attachmentKind(mime) }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength ? value.trim() : null
}

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string" || value.trim().length > maxLength) return null
  return value.trim()
}

function parseContactInput(value: unknown): ContactInput {
  if (!isRecord(value)) throw new CrmServerError(400, "Contact details are incomplete.")
  const name = boundedString(value.name, 120)
  const company = optionalString(value.company, 120)
  const email = optionalString(value.email, 160)
  const phone = optionalString(value.phone, 40)
  const handle = optionalString(value.handle, 120)
  if (!name) throw new CrmServerError(400, "Enter the contact's name (up to 120 characters).")
  if (company === null || email === null || phone === null || handle === null) throw new CrmServerError(400, "One of the contact fields is too long.")
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CrmServerError(400, "Enter a valid email address.")
  if (!isChannel(value.channel)) throw new CrmServerError(400, "Choose a primary channel.")
  const rawTags = Array.isArray(value.tags) ? value.tags : []
  const tags = [...new Set(rawTags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter((tag) => tag.length > 0 && tag.length <= 40))].slice(0, 20)
  return { name, company, email, phone, handle, channel: value.channel, tags }
}

export function parseCrmMutation(value: unknown): CrmMutation {
  if (!isRecord(value) || typeof value.action !== "string") throw new CrmServerError(400, "Invalid CRM action.")
  if (value.action === "start-conversation") {
    const contactId = boundedString(value.contactId, 80)
    const text = boundedString(value.text, 4000)
    if (!contactId || !text || !isChannel(value.channel)) throw new CrmServerError(400, "Choose a contact, channel and first message.")
    const subject = optionalString(value.subject, 200)
    if (subject === null) throw new CrmServerError(400, "Subject is too long.")
    return { action: value.action, contactId, channel: value.channel, text, ...(subject ? { subject } : {}) }
  }
  if (value.action === "connect-email") return { action: value.action }
  if (value.action === "save-quick-replies") {
    if (!Array.isArray(value.replies) || value.replies.length > 50) throw new CrmServerError(400, "You can save up to 50 quick replies.")
    const replies = value.replies.map((item) => {
      const reply = isRecord(item) ? item : {}
      const title = boundedString(reply.title, 60)
      const text = boundedString(reply.text, 2000)
      if (!title || !text) throw new CrmServerError(400, "Each quick reply needs a title and a message.")
      return { id: boundedString(reply.id, 80) || crypto.randomUUID(), title, text }
    })
    return { action: value.action, replies }
  }
  if (value.action === "mark-conversation-read") {
    const conversationId = boundedString(value.conversationId, 80)
    if (!conversationId) throw new CrmServerError(400, "Invalid conversation.")
    return { action: value.action, conversationId }
  }
  if (value.action === "create-contact") return { action: value.action, contact: parseContactInput(value.contact) }
  if (value.action === "update-contact") {
    const contactId = boundedString(value.contactId, 80)
    if (!contactId) throw new CrmServerError(400, "Invalid contact.")
    return { action: value.action, contactId, contact: parseContactInput(value.contact) }
  }
  if (value.action === "delete-contact") {
    const contactId = boundedString(value.contactId, 80)
    if (!contactId) throw new CrmServerError(400, "Invalid contact.")
    return { action: value.action, contactId }
  }
  if (value.action === "add-case-note") {
    const caseId = boundedString(value.caseId, 80)
    const note = boundedString(value.note, 2000)
    if (!caseId || !note) throw new CrmServerError(400, "Enter a note before saving.")
    return { action: value.action, caseId, note }
  }
  if (value.action === "update-case-priority") {
    const caseId = boundedString(value.caseId, 80)
    if (!caseId || !isPriority(value.priority)) throw new CrmServerError(400, "Choose a valid priority.")
    return { action: value.action, caseId, priority: value.priority }
  }
  if (value.action === "send-message") {
    const conversationId = boundedString(value.conversationId, 80)
    const text = typeof value.text === "string" ? value.text.trim().slice(0, 4000) : ""
    const attachments = parseAttachments(value.attachments)
    if (!conversationId || (!text && !attachments.length)) throw new CrmServerError(400, "Enter a message or attach a file before sending.")
    return { action: value.action, conversationId, text, ...(attachments.length ? { attachments } : {}) }
  }
  if (value.action === "create-case") {
    const contactId = boundedString(value.contactId, 80)
    const title = boundedString(value.title, 160)
    const note = optionalString(value.note, 2000)
    if (!contactId || !title || !isChannel(value.channel) || note === null || (value.priority !== undefined && !isPriority(value.priority))) throw new CrmServerError(400, "Case details are incomplete.")
    return { action: value.action, contactId, title, channel: value.channel, priority: isPriority(value.priority) ? value.priority : "Medium", ...(note ? { note } : {}) }
  }
  if (value.action === "log-interaction") {
    const contactId = boundedString(value.contactId, 80)
    const summary = boundedString(value.summary, 2000)
    const occurredAt = boundedString(value.occurredAt, 80)
    const type = value.type
    if (!contactId || !summary || !occurredAt || (type !== "Call" && type !== "Meeting" && type !== "Note") || !Number.isFinite(Date.parse(occurredAt)) || typeof value.followUp !== "boolean") throw new CrmServerError(400, "Interaction details are incomplete.")
    return { action: value.action, contactId, summary, occurredAt, type, followUp: value.followUp }
  }
  if (value.action === "update-case-title") {
    const caseId = boundedString(value.caseId, 80)
    const title = boundedString(value.title, 160)
    if (!caseId || !title) throw new CrmServerError(400, "Give the case a title up to 160 characters.")
    return { action: value.action, caseId, title }
  }
  if (value.action === "escalate-case") {
    const caseId = boundedString(value.caseId, 80)
    const reason = optionalString(value.reason, 500)
    const level = value.level
    if (!caseId || (level !== 0 && level !== 1 && level !== 2) || reason === null) throw new CrmServerError(400, "Choose a valid escalation level.")
    if (level > 0 && !reason) throw new CrmServerError(400, "Add a short reason for the escalation.")
    return { action: value.action, caseId, level, ...(reason ? { reason } : {}) }
  }
  if (value.action === "merge-contacts") {
    const primaryId = boundedString(value.primaryId, 80)
    const duplicateId = boundedString(value.duplicateId, 80)
    if (!primaryId || !duplicateId || primaryId === duplicateId) throw new CrmServerError(400, "Choose two different contacts to merge.")
    return { action: value.action, primaryId, duplicateId }
  }
  if (value.action === "delete-case") {
    const caseId = boundedString(value.caseId, 80)
    if (!caseId) throw new CrmServerError(400, "Invalid case.")
    return { action: value.action, caseId }
  }
  if (value.action === "update-case-status") {
    const caseId = boundedString(value.caseId, 80)
    const status = value.status
    if (!caseId || !isCaseStatus(status)) throw new CrmServerError(400, "Choose a valid case status.")
    return { action: value.action, caseId, status }
  }
  if (value.action === "toggle-contact-tag") {
    const contactId = boundedString(value.contactId, 80)
    const tag = boundedString(value.tag, 40)
    if (!contactId || !tag) throw new CrmServerError(400, "Enter a valid contact tag.")
    return { action: value.action, contactId, tag }
  }
  if (value.action === "update-profile") {
    const name = boundedString(value.name, 80)
    if (!name) throw new CrmServerError(400, "Enter a name up to 80 characters.")
    return { action: value.action, name }
  }
  if (value.action === "update-preferences") {
    if (!isRecord(value.preferences) || !isRecord(value.preferences.notifications) || !isRecord(value.preferences.channels)) throw new CrmServerError(400, "Invalid preference values.")
    const notifications = value.preferences.notifications
    const channels = value.preferences.channels
    if ([notifications.replies, notifications.assignments, notifications.dailyDigest, channels.whatsapp, channels.email, channels.instagram, channels.facebook, channels.webchat].some((entry) => typeof entry !== "boolean")) throw new CrmServerError(400, "Invalid preference values.")
    return { action: value.action, preferences: value.preferences as unknown as CrmPreferences }
  }
  if (value.action === "connect-whatsapp") {
    const phoneNumberId = boundedString(value.phoneNumberId, 40)
    const accessToken = boundedString(value.accessToken, 1000)
    const wabaId = optionalString(value.wabaId, 40)
    if (!phoneNumberId || !/^\d+$/.test(phoneNumberId) || !accessToken || wabaId === null || (wabaId && !/^\d+$/.test(wabaId))) throw new CrmServerError(400, "Enter a numeric Phone number ID, an optional numeric WhatsApp Business Account ID, and an access token.")
    return { action: value.action, phoneNumberId, accessToken, ...(wabaId ? { wabaId } : {}) }
  }
  if (value.action === "disconnect-channel") {
    const connectionId = boundedString(value.connectionId, 80)
    if (!connectionId) throw new CrmServerError(400, "Invalid channel connection.")
    return { action: value.action, connectionId }
  }
  throw new CrmServerError(400, "Unsupported CRM action.")
}

function isCaseStatus(value: unknown): value is CaseStatus {
  return value === "Open" || value === "In Progress" || value === "Waiting on Customer" || value === "Resolved"
}

function contactRow(contact: ContactInput) {
  return {
    name: contact.name,
    initials: initialsForName(contact.name),
    color: colorForName(contact.name),
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    primary_channel: contact.channel,
    handle: contact.handle,
    tags: contact.tags,
  }
}

async function requireContact(supabase: SupabaseClient, user: User, contactId: string) {
  const { data, error } = await supabase.from("crm_contacts").select("id").eq("id", contactId).eq("owner_id", user.id).maybeSingle()
  if (error && error.code !== "22P02") throwDatabaseError(error)
  if (!data) throw new CrmServerError(404, "That contact could not be found.")
}

export async function applyCrmMutation(supabase: SupabaseClient, user: User, mutation: CrmMutation): Promise<User | undefined> {
  const now = new Date().toISOString()
  if (mutation.action === "send-message") {
    const attachments = mutation.attachments ?? []
    if (attachments.some((item) => !isOwnAttachmentUrl(item.url, user.id))) throw new CrmServerError(400, "Attachments must be uploaded from this workspace.")
    const { data: conversation, error: conversationError } = await supabase.from("crm_conversations").select("id,channel,messages,connection_id,external_user_id").eq("id", mutation.conversationId).eq("owner_id", user.id).single()
    if (conversationError || !conversation) throw new CrmServerError(404, "That conversation could not be found.")
    if (conversation.connection_id && conversation.external_user_id) {
      // Live Meta channel: deliver to the customer first, then record it.
      const connection = await withConnectionErrors(() => loadConnection(String(conversation.connection_id)))
      if (!connection || connection.owner_id !== user.id || connection.status === "disconnected") throw new CrmServerError(409, "This channel is disconnected. Reconnect it in Settings → Integrations to reply.")
      if (connection.provider === "email") {
        const history = Array.isArray(conversation.messages) ? conversation.messages as StoredMessage[] : []
        const ids = history.map((item) => item.message_id).filter((item): item is string => Boolean(item))
        const lastInbound = [...history].reverse().find((item) => item.sender === "contact" && item.message_id)
        const subject = replySubject([...history].reverse().find((item) => item.subject)?.subject ?? "Bintang Kids")
        const externalId = await withEmailErrors(() => sendEmail({ to: String(conversation.external_user_id), subject, text: mutation.text, inReplyTo: lastInbound?.message_id, references: ids, attachments }))
        const message: StoredMessage = { id: crypto.randomUUID(), external_id: externalId, sender: "agent", text: mutation.text, subject, ...(attachments.length ? { attachments } : {}), timestamp: now, type: "email", status: "sent", via: "resend" }
        const { error } = await createAdminClient().rpc("crm_append_message", { p_conversation_id: conversation.id, p_message: message, p_unread_increment: 0, p_activity: now })
        if (error) throwDatabaseError(error)
        return
      }
      const externalId = await withConnectionErrors(() => sendMetaMessage(connection, String(conversation.external_user_id), mutation.text, attachments))
      const message: StoredMessage = { id: crypto.randomUUID(), ...(externalId ? { external_id: externalId } : {}), sender: "agent", text: mutation.text, ...(attachments.length ? { attachments } : {}), timestamp: now, type: "chat", status: "sent", via: "meta" }
      const { error } = await createAdminClient().rpc("crm_append_message", { p_conversation_id: conversation.id, p_message: message, p_unread_increment: 0, p_activity: now })
      if (error) throwDatabaseError(error)
      return
    }
    const storedMessages = Array.isArray(conversation.messages) ? conversation.messages as StoredMessage[] : []
    const message: StoredMessage = { id: crypto.randomUUID(), sender: "agent", text: mutation.text, ...(attachments.length ? { attachments } : {}), timestamp: now, type: conversation.channel === "email" ? "email" : "chat", ...(conversation.channel === "email" ? { subject: "Re: Customer support" } : {}) }
    const { error } = await supabase.from("crm_conversations").update({ messages: [...storedMessages, message], last_activity: now, updated_at: now }).eq("id", mutation.conversationId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "start-conversation") {
    await requireContact(supabase, user, mutation.contactId)
    if (mutation.channel === "email") {
      const connection = await findEmailConnection()
      if (connection && connection.owner_id === user.id) {
        const { data: contact } = await supabase.from("crm_contacts").select("email").eq("id", mutation.contactId).eq("owner_id", user.id).single()
        const to = String(contact?.email ?? "").trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new CrmServerError(400, "Add an email address to this contact before emailing them.")
        const subject = mutation.subject || "Message from Bintang Kids"
        const externalId = await withEmailErrors(() => sendEmail({ to, subject, text: mutation.text }))
        const admin = createAdminClient()
        const { data: identity } = await admin.from("crm_contact_identities").select("contact_id").eq("connection_id", connection.id).eq("external_user_id", to).maybeSingle()
        let contactId = identity?.contact_id ? String(identity.contact_id) : mutation.contactId
        if (!identity) {
          const { error: identityError } = await admin.from("crm_contact_identities").insert({ owner_id: user.id, contact_id: contactId, connection_id: connection.id, external_user_id: to })
          if (identityError) contactId = await findOrCreateEmailContact(connection, to, "", now)
        }
        const conversationId = await findOrCreateEmailConversation(connection, contactId, to, now)
        const message: StoredMessage = { id: crypto.randomUUID(), external_id: externalId, sender: "agent", text: mutation.text, subject, timestamp: now, type: "email", status: "sent", via: "resend" }
        const { error } = await admin.rpc("crm_append_message", { p_conversation_id: conversationId, p_message: message, p_unread_increment: 0, p_activity: now })
        if (error) throwDatabaseError(error)
        return
      }
    }
    const message: StoredMessage = { id: crypto.randomUUID(), sender: "agent", text: mutation.text, timestamp: now, type: mutation.channel === "email" ? "email" : "chat" }
    const { error } = await supabase.from("crm_conversations").insert({ owner_id: user.id, contact_id: mutation.contactId, channel: mutation.channel, messages: [message], unread_count: 0, last_activity: now })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "mark-conversation-read") {
    const { error } = await supabase.from("crm_conversations").update({ unread_count: 0 }).eq("id", mutation.conversationId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "create-contact") {
    const { error } = await supabase.from("crm_contacts").insert({ owner_id: user.id, ...contactRow(mutation.contact), assigned: displayNameForUser(user), last_seen: "Added just now" })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "update-contact") {
    const { data, error } = await supabase.from("crm_contacts").update({ ...contactRow(mutation.contact), updated_at: now }).eq("id", mutation.contactId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That contact could not be found.")
  } else if (mutation.action === "delete-contact") {
    const { data, error } = await supabase.from("crm_contacts").delete().eq("id", mutation.contactId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That contact could not be found.")
  } else if (mutation.action === "add-case-note") {
    const { data: item, error: readError } = await supabase.from("crm_cases").select("id,notes").eq("id", mutation.caseId).eq("owner_id", user.id).maybeSingle()
    if (readError) throwDatabaseError(readError)
    if (!item) throw new CrmServerError(404, "That case could not be found.")
    const notes = Array.isArray(item.notes) ? item.notes as string[] : []
    const { error } = await supabase.from("crm_cases").update({ notes: [...notes, mutation.note], updated_at: now }).eq("id", mutation.caseId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "update-case-priority") {
    const { data, error } = await supabase.from("crm_cases").update({ priority: mutation.priority, updated_at: now }).eq("id", mutation.caseId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That case could not be found.")
  } else if (mutation.action === "create-case") {
    await requireContact(supabase, user, mutation.contactId)
    const { error } = await supabase.from("crm_cases").insert({ owner_id: user.id, title: mutation.title, contact_id: mutation.contactId, channel_source: mutation.channel, priority: mutation.priority ?? "Medium", status: "Open", notes: mutation.note ? [mutation.note] : [] })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "log-interaction") {
    await requireContact(supabase, user, mutation.contactId)
    const { error } = await supabase.from("crm_interactions").insert({ owner_id: user.id, contact_id: mutation.contactId, type: mutation.type, summary: mutation.summary, occurred_at: mutation.occurredAt, follow_up: mutation.followUp })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "update-case-status") {
    const { data, error } = await supabase.from("crm_cases").update({ status: mutation.status, updated_at: now }).eq("id", mutation.caseId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That case could not be found.")
  } else if (mutation.action === "update-case-title") {
    const { data, error } = await supabase.from("crm_cases").update({ title: mutation.title, updated_at: now }).eq("id", mutation.caseId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That case could not be found.")
  } else if (mutation.action === "escalate-case") {
    const { data: item, error: readError } = await supabase.from("crm_cases").select("id,notes,escalation_level,priority").eq("id", mutation.caseId).eq("owner_id", user.id).maybeSingle()
    if (readError) throwDatabaseError(readError)
    if (!item) throw new CrmServerError(404, "That case could not be found.")
    const previous = (item.escalation_level === 1 || item.escalation_level === 2 ? item.escalation_level : 0) as EscalationLevel
    if (previous === mutation.level) return
    const notes = Array.isArray(item.notes) ? item.notes as string[] : []
    const { error } = await supabase.from("crm_cases").update({
      escalation_level: mutation.level,
      escalation_reason: mutation.level ? mutation.reason ?? null : null,
      escalated_at: mutation.level ? now : null,
      // Escalated work is urgent by definition.
      ...(mutation.level ? { priority: "High" } : {}),
      notes: [...notes, escalationNote(mutation.level, previous, mutation.reason)],
      updated_at: now,
    }).eq("id", mutation.caseId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "merge-contacts") {
    const { error } = await supabase.rpc("crm_merge_contacts", { p_primary: mutation.primaryId, p_duplicate: mutation.duplicateId })
    if (error) {
      if (error.code === "P0002") throw new CrmServerError(404, "One of those contacts could not be found.")
      throwDatabaseError(error)
    }
  } else if (mutation.action === "delete-case") {
    const { data, error } = await supabase.from("crm_cases").delete().eq("id", mutation.caseId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That case could not be found.")
  } else if (mutation.action === "toggle-contact-tag") {
    const { data: contact, error: readError } = await supabase.from("crm_contacts").select("id,tags").eq("id", mutation.contactId).eq("owner_id", user.id).single()
    if (readError || !contact) throw new CrmServerError(404, "That contact could not be found.")
    const tags = Array.isArray(contact.tags) ? contact.tags as string[] : []
    const nextTags = tags.includes(mutation.tag) ? tags.filter((tag) => tag !== mutation.tag) : [...tags, mutation.tag]
    const { error } = await supabase.from("crm_contacts").update({ tags: nextTags, updated_at: now }).eq("id", mutation.contactId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "update-profile") {
    const { data, error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, full_name: mutation.name } })
    if (error) throwDatabaseError(error)
    return data.user ?? { ...user, user_metadata: { ...user.user_metadata, full_name: mutation.name } }
  } else if (mutation.action === "save-quick-replies") {
    const { data, error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, crm_quick_replies: mutation.replies } })
    if (error) throwDatabaseError(error)
    return data.user ?? { ...user, user_metadata: { ...user.user_metadata, crm_quick_replies: mutation.replies } }
  } else if (mutation.action === "connect-email") {
    if (!emailConfigured()) throw new CrmServerError(503, "Email isn't configured on the server yet. Add RESEND_API_KEY and RESEND_WEBHOOK_SECRET in Vercel.")
    const { address, fromName } = getEmailConfig()
    const admin = createAdminClient()
    const { data: existing } = await admin.from("crm_channel_connections").select("id,owner_id").eq("provider", "email").eq("external_account_id", address).maybeSingle()
    if (existing && existing.owner_id !== user.id) throw new CrmServerError(409, `${address} is already connected to another workspace.`)
    const row = { owner_id: user.id, provider: "email", external_account_id: address, display_name: `${fromName} Support`, details: {}, status: "active", last_error: null, updated_at: now }
    const { error } = existing ? await admin.from("crm_channel_connections").update(row).eq("id", existing.id) : await admin.from("crm_channel_connections").insert(row)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "connect-whatsapp") {
    await withConnectionErrors(() => connectWhatsApp(user.id, mutation))
  } else if (mutation.action === "disconnect-channel") {
    await withConnectionErrors(() => disconnectConnection(user.id, mutation.connectionId))
  } else if (mutation.action === "update-preferences") {
    const { data, error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, crm_preferences: mutation.preferences } })
    if (error) throwDatabaseError(error)
    return data.user ?? { ...user, user_metadata: { ...user.user_metadata, crm_preferences: mutation.preferences } }
  }
}

async function withEmailErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof EmailError) throw new CrmServerError(error.status, error.message)
    throw error
  }
}

async function withConnectionErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof ConnectionError) throw new CrmServerError(error.status, error.message)
    if (error instanceof CrmServerError) throw error
    if (error instanceof Error && /not configured/i.test(error.message)) throw new CrmServerError(503, "Meta integration is not configured on the server yet (META_* environment variables).")
    throwDatabaseError(error)
  }
}
