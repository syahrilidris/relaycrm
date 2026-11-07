import { createHash } from "node:crypto"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { demoCrmData } from "@/lib/crm-demo-data"
import { isChannel, type CaseStatus, type Channel, type CrmMutation, type CrmSnapshot, type InteractionType, type Message, type Priority } from "@/lib/crm-data"

type StoredMessage = { id?: string; sender: "contact" | "agent" | "system"; text: string; timestamp: string; type: "chat" | "email" | "note" | "call"; subject?: string }

const contactColumns = "id,name,initials,color,company,email,phone,primary_channel,handle,assigned,last_seen,tags,created_at"
const caseColumns = "id,title,contact_id,status,priority,channel_source,notes,created_at,updated_at"
const conversationColumns = "id,contact_id,channel,messages,unread_count,last_activity"
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

function deterministicUuid(ownerId: string, key: string) {
  const bytes = Buffer.from(createHash("sha256").update(`${ownerId}:${key}`).digest("hex").slice(0, 32), "hex")
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function throwDatabaseError(error: unknown): never {
  console.error("[crm] Database operation failed", error)
  throw new CrmServerError(500, "The CRM database could not complete that request.")
}

async function seedDemoWorkspace(supabase: SupabaseClient, user: User) {
  const contactIds = new Map(demoCrmData.contacts.map((contact) => [contact.id, deterministicUuid(user.id, `contact:${contact.id}`)]))
  const conversationIds = new Map(demoCrmData.conversations.map((conversation) => [conversation.id, deterministicUuid(user.id, `conversation:${conversation.id}`)]))
  const seededContacts = demoCrmData.contacts.map((contact) => ({
    id: contactIds.get(contact.id),
    owner_id: user.id,
    name: contact.name,
    initials: contact.initials,
    color: contact.color,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    primary_channel: contact.channel,
    handle: contact.handle,
    assigned: contact.assigned,
    last_seen: contact.lastSeen,
    tags: contact.tags,
  }))
  const { error: contactsError } = await supabase.from("crm_contacts").upsert(seededContacts, { onConflict: "id", ignoreDuplicates: true })
  if (contactsError) throwDatabaseError(contactsError)

  const seededCases = demoCrmData.cases.map((item) => ({
    owner_id: user.id,
    title: item.title,
    contact_id: contactIds.get(item.contactId),
    status: item.status,
    priority: item.priority,
    channel_source: item.channel,
    notes: item.notes,
  }))
  const { error: casesError } = await supabase.from("crm_cases").insert(seededCases)
  if (casesError) throwDatabaseError(casesError)

  const now = Date.now()
  const seededConversations = demoCrmData.conversations.map((conversation, conversationIndex) => ({
    id: conversationIds.get(conversation.id),
    owner_id: user.id,
    contact_id: contactIds.get(conversation.contactId),
    channel: conversation.channel,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      sender: message.from,
      text: message.text,
      timestamp: message.time,
      type: message.kind ?? "chat",
      ...(message.subject ? { subject: message.subject } : {}),
    })),
    unread_count: conversation.unread,
    last_activity: new Date(now - conversationIndex * 4 * 60_000).toISOString(),
  }))
  const { error: conversationsError } = await supabase.from("crm_conversations").upsert(seededConversations, { onConflict: "id", ignoreDuplicates: true })
  if (conversationsError) throwDatabaseError(conversationsError)

  const seededInteractions = demoCrmData.interactions.map((interaction, index) => ({
    id: deterministicUuid(user.id, `interaction:${interaction.id}`),
    owner_id: user.id,
    contact_id: contactIds.get(interaction.contactId),
    type: interaction.type,
    summary: interaction.summary,
    occurred_at: new Date(now - index * 24 * 60 * 60_000).toISOString(),
    follow_up: interaction.followUp,
  }))
  const { error: interactionsError } = await supabase.from("crm_interactions").upsert(seededInteractions, { onConflict: "id", ignoreDuplicates: true })
  if (interactionsError) throwDatabaseError(interactionsError)
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / (24 * 60))}d`
}

function messageTime(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
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
      time: typeof value.timestamp === "string" ? messageTime(value.timestamp) : "",
      kind: type,
      ...(typeof value.subject === "string" ? { subject: value.subject } : {}),
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
  }
}

function mapConversation(row: Record<string, unknown>) {
  const messages = mapMessages(row.messages, String(row.id))
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    channel: row.channel as Channel,
    preview: messages.at(-1)?.text ?? "",
    time: relativeTime(String(row.last_activity)),
    unread: Number(row.unread_count ?? 0),
    messages,
  }
}

function mapInteraction(row: Record<string, unknown>) {
  const date = new Date(String(row.occurred_at))
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    type: row.type as InteractionType,
    summary: String(row.summary),
    date: date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    followUp: Boolean(row.follow_up),
  }
}

export async function getCrmSnapshot(supabase: SupabaseClient, user: User): Promise<CrmSnapshot> {
  const { data: existingContacts, error: contactsCheckError } = await supabase.from("crm_contacts").select("id").eq("owner_id", user.id).limit(1)
  if (contactsCheckError) throwDatabaseError(contactsCheckError)
  if (existingContacts.length === 0) await seedDemoWorkspace(supabase, user)

  const [contactsResult, casesResult, conversationsResult, interactionsResult] = await Promise.all([
    supabase.from("crm_contacts").select(contactColumns).eq("owner_id", user.id).order("name"),
    supabase.from("crm_cases").select(caseColumns).eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("crm_conversations").select(conversationColumns).eq("owner_id", user.id).order("last_activity", { ascending: false }),
    supabase.from("crm_interactions").select(interactionColumns).eq("owner_id", user.id).order("occurred_at", { ascending: false }),
  ])
  if (contactsResult.error) throwDatabaseError(contactsResult.error)
  if (casesResult.error) throwDatabaseError(casesResult.error)
  if (conversationsResult.error) throwDatabaseError(conversationsResult.error)
  if (interactionsResult.error) throwDatabaseError(interactionsResult.error)

  return {
    contacts: (contactsResult.data ?? []).map((row) => mapContact(row as Record<string, unknown>)),
    cases: (casesResult.data ?? []).map((row) => mapCase(row as Record<string, unknown>)),
    conversations: (conversationsResult.data ?? []).map((row) => mapConversation(row as Record<string, unknown>)),
    interactions: (interactionsResult.data ?? []).map((row) => mapInteraction(row as Record<string, unknown>)),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength ? value.trim() : null
}

export function parseCrmMutation(value: unknown): CrmMutation {
  if (!isRecord(value) || typeof value.action !== "string") throw new CrmServerError(400, "Invalid CRM action.")
  if (value.action === "send-message") {
    const conversationId = boundedString(value.conversationId, 80)
    const text = boundedString(value.text, 4000)
    if (!conversationId || !text) throw new CrmServerError(400, "Enter a message before sending.")
    return { action: value.action, conversationId, text }
  }
  if (value.action === "create-case") {
    const contactId = boundedString(value.contactId, 80)
    const title = boundedString(value.title, 160)
    if (!contactId || !title || !isChannel(value.channel)) throw new CrmServerError(400, "Case details are incomplete.")
    return { action: value.action, contactId, title, channel: value.channel }
  }
  if (value.action === "log-interaction") {
    const contactId = boundedString(value.contactId, 80)
    const summary = boundedString(value.summary, 2000)
    const occurredAt = boundedString(value.occurredAt, 80)
    const type = value.type
    if (!contactId || !summary || !occurredAt || (type !== "Call" && type !== "Meeting" && type !== "Note") || !Number.isFinite(Date.parse(occurredAt)) || typeof value.followUp !== "boolean") throw new CrmServerError(400, "Interaction details are incomplete.")
    return { action: value.action, contactId, summary, occurredAt, type, followUp: value.followUp }
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
  throw new CrmServerError(400, "Unsupported CRM action.")
}

function isCaseStatus(value: unknown): value is CaseStatus {
  return value === "Open" || value === "In Progress" || value === "Waiting on Customer" || value === "Resolved"
}

export async function applyCrmMutation(supabase: SupabaseClient, user: User, mutation: CrmMutation) {
  const now = new Date().toISOString()
  if (mutation.action === "send-message") {
    const { data: conversation, error: conversationError } = await supabase.from("crm_conversations").select("id,channel,messages").eq("id", mutation.conversationId).eq("owner_id", user.id).single()
    if (conversationError || !conversation) throw new CrmServerError(404, "That conversation could not be found.")
    const storedMessages = Array.isArray(conversation.messages) ? conversation.messages as StoredMessage[] : []
    const message: StoredMessage = { id: deterministicUuid(user.id, `message:${crypto.randomUUID()}`), sender: "agent", text: mutation.text, timestamp: now, type: conversation.channel === "email" ? "email" : "chat", ...(conversation.channel === "email" ? { subject: "Re: Customer support" } : {}) }
    const { error } = await supabase.from("crm_conversations").update({ messages: [...storedMessages, message], last_activity: now, updated_at: now }).eq("id", mutation.conversationId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "create-case") {
    const { error } = await supabase.from("crm_cases").insert({ owner_id: user.id, title: mutation.title, contact_id: mutation.contactId, channel_source: mutation.channel, priority: "Medium", status: "Open", notes: ["Created from a customer conversation."] })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "log-interaction") {
    const { error } = await supabase.from("crm_interactions").insert({ owner_id: user.id, contact_id: mutation.contactId, type: mutation.type, summary: mutation.summary, occurred_at: mutation.occurredAt, follow_up: mutation.followUp })
    if (error) throwDatabaseError(error)
  } else if (mutation.action === "update-case-status") {
    const { data, error } = await supabase.from("crm_cases").update({ status: mutation.status, updated_at: now }).eq("id", mutation.caseId).eq("owner_id", user.id).select("id").maybeSingle()
    if (error) throwDatabaseError(error)
    if (!data) throw new CrmServerError(404, "That case could not be found.")
  } else if (mutation.action === "toggle-contact-tag") {
    const { data: contact, error: readError } = await supabase.from("crm_contacts").select("id,tags").eq("id", mutation.contactId).eq("owner_id", user.id).single()
    if (readError || !contact) throw new CrmServerError(404, "That contact could not be found.")
    const tags = Array.isArray(contact.tags) ? contact.tags as string[] : []
    const nextTags = tags.includes(mutation.tag) ? tags.filter((tag) => tag !== mutation.tag) : [...tags, mutation.tag]
    const { error } = await supabase.from("crm_contacts").update({ tags: nextTags, updated_at: now }).eq("id", mutation.contactId).eq("owner_id", user.id)
    if (error) throwDatabaseError(error)
  }
}
