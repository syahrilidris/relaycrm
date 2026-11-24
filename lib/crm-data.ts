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
  attachments?: Attachment[]
}

export type AttachmentKind = "image" | "video" | "audio" | "file"

export type Attachment = {
  url: string
  name: string
  mime: string
  size?: number
  kind: AttachmentKind
}

export type QuickReply = { id: string; title: string; text: string }

export const defaultQuickReplies: QuickReply[] = [
  { id: "qr-hello", title: "Greeting", text: "Hi! Thank you for contacting Bintang Kids 😊 How can we help you today?" },
  { id: "qr-hours", title: "Opening hours", text: "We're open Monday to Friday, 8:00 am – 6:00 pm, and Saturday 9:00 am – 1:00 pm." },
  { id: "qr-location", title: "Location", text: "You can find us at Bintang Kids, Bandar Puteri Bangi. Would you like us to share a Google Maps pin?" },
  { id: "qr-fees", title: "Fees enquiry", text: "Thanks for asking about our fees! May I know your child's age and which programme you're interested in, so I can send the right fee details?" },
  { id: "qr-visit", title: "Book a visit", text: "We'd love to show you around! Which day and time suits you for a school visit?" },
  { id: "qr-thanks", title: "Thank you", text: "Thank you! Let us know if there's anything else we can help with 🌟" },
]

export function attachmentKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  return "file"
}

export function attachmentLabel(attachments: Attachment[] | undefined) {
  const first = attachments?.[0]
  if (!first) return ""
  const label = { image: "📷 Photo", video: "🎬 Video", audio: "🎤 Audio", file: `📄 ${first.name}` }[first.kind]
  return attachments.length > 1 ? `${label} +${attachments.length - 1}` : label
}

export function formatBytes(size?: number) {
  if (!size) return ""
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export type MessageStatus = "sent" | "delivered" | "read" | "failed"

export type MetaProvider = "whatsapp" | "facebook" | "instagram"

export type ConnectionProvider = MetaProvider | "email"

export type ChannelConnection = {
  id: string
  provider: ConnectionProvider
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
  integrations: { metaReady: boolean; emailReady?: boolean }
  quickReplies?: QuickReply[]
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
  | { action: "send-message"; conversationId: string; text: string; attachments?: Attachment[] }
  | { action: "start-conversation"; contactId: string; channel: Channel; text: string; subject?: string }
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
  | { action: "merge-contacts"; primaryId: string; duplicateId: string }
  | { action: "toggle-contact-tag"; contactId: string; tag: string }
  | { action: "update-profile"; name: string }
  | { action: "update-preferences"; preferences: CrmPreferences }
  | { action: "connect-email" }
  | { action: "save-quick-replies"; replies: QuickReply[] }
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

/** Last 9 digits of a phone number, so "+60 16-209 7957", "016 2097957" and "60162097957" all match. */
export function phoneKey(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "")
  return digits.length >= 9 ? digits.slice(-9) : ""
}

function nameKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

/** Finds a phone number a customer typed in a message, e.g. "my number is 016-209 7957". */
export function extractPhone(text: string) {
  const match = text.match(/(?:\+?\d[\d\s-]{7,15}\d)/)
  if (!match) return ""
  const digits = match[0].replace(/\D/g, "")
  if (digits.length < 9 || digits.length > 13) return ""
  if (/^01\d/.test(digits)) return `+6${digits}` // Malaysian mobile written locally
  if (/^601\d/.test(digits)) return `+${digits}`
  return match[0].trim().startsWith("+") ? `+${digits}` : digits
}

export type DuplicatePair = { key: string; a: Contact; b: Contact; reason: string }

/** Pairs of contacts that are probably the same person. Nothing is merged without the user confirming. */
export function findDuplicatePairs(contacts: Contact[], dismissed: Set<string> = new Set()) {
  const pairs: DuplicatePair[] = []
  const seen = new Set<string>()
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i], b = contacts[j]
      const key = [a.id, b.id].sort().join(":")
      if (seen.has(key) || dismissed.has(key)) continue
      let reason = ""
      if (phoneKey(a.phone) && phoneKey(a.phone) === phoneKey(b.phone)) reason = "Same phone number"
      else if (a.email && a.email.toLowerCase() === b.email.toLowerCase()) reason = "Same email"
      else if (nameKey(a.name).length > 2 && nameKey(a.name) === nameKey(b.name)) reason = "Same name"
      if (!reason) continue
      seen.add(key)
      pairs.push({ key, a, b, reason })
    }
  }
  return pairs
}
