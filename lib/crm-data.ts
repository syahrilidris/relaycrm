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
}

export type Conversation = {
  id: string
  contactId: string
  channel: Channel
  preview: string
  time: string
  unread: number
  messages: Message[]
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
}

export type Interaction = {
  id: string
  contactId: string
  type: InteractionType
  summary: string
  date: string
  followUp: boolean
}

export type CrmSnapshot = {
  contacts: Contact[]
  cases: SupportCase[]
  conversations: Conversation[]
  interactions: Interaction[]
}

export type CrmMutation =
  | { action: "send-message"; conversationId: string; text: string }
  | { action: "create-case"; contactId: string; channel: Channel; title: string }
  | { action: "log-interaction"; contactId: string; type: InteractionType; summary: string; occurredAt: string; followUp: boolean }
  | { action: "update-case-status"; caseId: string; status: CaseStatus }
  | { action: "toggle-contact-tag"; contactId: string; tag: string }

export const emptyCrmSnapshot: CrmSnapshot = {
  contacts: [],
  cases: [],
  conversations: [],
  interactions: [],
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

export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && Object.hasOwn(channelLabels, value)
}
