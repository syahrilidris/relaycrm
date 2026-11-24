export type Channel = "whatsapp" | "email" | "instagram" | "facebook" | "webchat"
export type PageKey = "Dashboard" | "Contacts" | "Cases" | "Omnichannel Inbox" | "Settings"
export type CaseStatus = "Open" | "In Progress" | "Waiting on Customer" | "Resolved"
export type Priority = "High" | "Medium" | "Low"
export type InteractionType = "Call" | "Meeting" | "Note"

export type Contact = {
  id: string
  name: string
  initials: string
  color: string
  company: string
  email: string
  phone: string
  channel: Channel
  handle: string
  assigned: string
  lastSeen: string
  tags: string[]
}

export type Message = {
  id: string
  from: "contact" | "agent" | "system"
  text: string
  time: string
  kind?: "chat" | "email" | "note" | "call"
  subject?: string
  status?: MessageStatus
}

export type MessageStatus = "sent" | "delivered" | "read" | "failed"

export type MetaProvider = "whatsapp" | "facebook" | "instagram"

export type ChannelConnection = {
  id: string
  provider: MetaProvider
  externalAccountId: string
  name: string
  status: "active" | "error" | "disconnected"
  lastError: string | null
  lastEventAt: string | null
  createdAt: string
}

export type Conversation = {
  id: string
  contactId: string
  channel: Channel
  preview: string
  time: string
  unread: number
  lastActivity?: string
  messages: Message[]
  /** Set when the conversation is linked to a live Meta channel (replies are delivered to the customer). */
  connectionId?: string | null
  connectionName?: string
}

export type SupportCase = {
  id: string
  title: string
  contactId: string
  priority: Priority
  channel: Channel
  status: CaseStatus
  updated: string
  notes: string[]
  /** 0 = not escalated, 1 = senior staff, 2 = manager. */
  escalation?: EscalationLevel
  escalationReason?: string | null
  escalatedAt?: string | null
  createdAt?: string
}

export type EscalationLevel = 0 | 1 | 2
export const escalationLabels: Record<1 | 2, { short: string; long: string }> = {
  1: { short: "Level 1", long: "Level 1 · Senior staff" },
  2: { short: "Level 2", long: "Level 2 · Manager" },
}

export type Interaction = {
  id: string
  contactId: string
  type: InteractionType
  summary: string
  date: string
  followUp: boolean
}

export type CrmViewer = {
  id: string
  name: string
  email: string
}

export type NotificationPreferences = {
  replies: boolean
  assignments: boolean
  dailyDigest: boolean
}

export type CrmPreferences = {
  notifications: NotificationPreferences
  channels: Record<Channel, boolean>
}

export const defaultCrmPreferences: CrmPreferences = {
  notifications: { replies: true, assignments: true, dailyDigest: false },
  channels: { whatsapp: true, email: true, instagram: true, facebook: true, webchat: true },
}

export type CrmSnapshot = {
  contacts: Contact[]
  cases: SupportCase[]
  conversations: Conversation[]
  interactions: Interaction[]
  viewer: CrmViewer
  preferences: CrmPreferences
  connections: ChannelConnection[]
  integrations: { metaReady: boolean }
}

export type ContactInput = {
  name: string
  company: string
  email: string
  phone: string
  channel: Channel
  handle: string
  tags: string[]
}

export type CrmMutation =
  | { action: "send-message"; conversationId: string; text: string }
  | { action: "start-conversation"; contactId: string; channel: Channel; text: string }
  | { action: "mark-conversation-read"; conversationId: string }
  | { action: "create-contact"; contact: ContactInput }
  | { action: "update-contact"; contactId: string; contact: ContactInput }
  | { action: "delete-contact"; contactId: string }
  | { action: "create-case"; contactId: string; channel: Channel; title: string; priority?: Priority; note?: string }
  | { action: "add-case-note"; caseId: string; note: string }
  | { action: "update-case-priority"; caseId: string; priority: Priority }
  | { action: "log-interaction"; contactId: string; type: InteractionType; summary: string; occurredAt: string; followUp: boolean }
  | { action: "update-case-status"; caseId: string; status: CaseStatus }
  | { action: "update-case-title"; caseId: string; title: string }
  | { action: "escalate-case"; caseId: string; level: EscalationLevel; reason?: string }
  | { action: "delete-case"; caseId: string }
  | { action: "toggle-contact-tag"; contactId: string; tag: string }
  | { action: "update-profile"; name: string }
  | { action: "update-preferences"; preferences: CrmPreferences }
  | { action: "connect-whatsapp"; phoneNumberId: string; wabaId?: string; accessToken: string }
  | { action: "disconnect-channel"; connectionId: string }

export const emptyCrmSnapshot: CrmSnapshot = {
  contacts: [],
  cases: [],
  conversations: [],
  interactions: [],
  viewer: { id: "", name: "", email: "" },
  preferences: defaultCrmPreferences,
  connections: [],
  integrations: { metaReady: false },
}

export const channelLabels: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  facebook: "Facebook",
  webchat: "Webchat",
}

export const pageRoutes: Record<PageKey, string> = {
  Dashboard: "/dashboard",
  Contacts: "/contacts",
  Cases: "/cases",
  "Omnichannel Inbox": "/inbox",
  Settings: "/settings",
}

export const routePages: Record<string, PageKey> = Object.fromEntries(
  Object.entries(pageRoutes).map(([page, route]) => [route, page]),
) as Record<string, PageKey>

export function initialsForName(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"
}

export const avatarColors = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-lime-100 text-lime-800",
  "bg-fuchsia-100 text-fuchsia-800",
]

export function colorForName(value: string) {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return avatarColors[hash % avatarColors.length]
}

function parseTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

/** Formats an ISO timestamp in the viewer's own time zone; passes other strings through unchanged. */
export function formatDateTime(value: string) {
  return parseTimestamp(value)?.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) ?? value
}

/** Formats an ISO timestamp as a clock time in the viewer's own time zone; passes other strings through unchanged. */
export function formatClockTime(value: string) {
  return parseTimestamp(value)?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? value
}

export function isPriority(value: unknown): value is Priority {
  return value === "High" || value === "Medium" || value === "Low"
}

export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && Object.hasOwn(channelLabels, value)
}

/** Contacts created from Meta webhooks store last activity as ISO; manual contacts store free text. */
export function formatLastSeen(value: string) {
  return parseTimestamp(value) ? `Last message ${formatDateTime(value)}` : value
}

/** Text written into a case's notes when its escalation changes, so the history stays on the case. */
export function escalationNote(level: EscalationLevel, previous: EscalationLevel, reason?: string) {
  const when = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  if (level === 0) return `De-escalated (was ${escalationLabels[previous as 1 | 2]?.long ?? "escalated"}) · ${when}${reason ? ` — ${reason}` : ""}`
  return `${level > previous ? "Escalated" : "Lowered"} to ${escalationLabels[level].long} · ${when}${reason ? ` — ${reason}` : ""}`
}
