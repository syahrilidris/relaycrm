import { demoCrmData } from "@/lib/crm-demo-data"
import { colorForName, defaultCrmPreferences, initialsForName, type CaseStatus, type Contact, type Conversation, type CrmMutation, type CrmSnapshot, type Interaction, type Message, type SupportCase } from "@/lib/crm-data"

const storageKey = "relay.crm.mock.v1"

function cloneDemoData(): CrmSnapshot {
  return JSON.parse(JSON.stringify(demoCrmData)) as CrmSnapshot
}

function persist(snapshot: CrmSnapshot) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
  } catch {
    throw new Error("Mock data could not be saved in this browser. Check that site storage is enabled.")
  }
}

export async function readMockCrmData(): Promise<CrmSnapshot> {
  const stored = window.localStorage.getItem(storageKey)
  if (stored) {
    try {
      const snapshot = JSON.parse(stored) as Partial<CrmSnapshot>
      if (Array.isArray(snapshot.contacts) && Array.isArray(snapshot.cases) && Array.isArray(snapshot.conversations) && Array.isArray(snapshot.interactions)) {
        return {
          ...demoCrmData,
          ...snapshot,
          viewer: { ...demoCrmData.viewer, ...snapshot.viewer },
          preferences: {
            notifications: { ...defaultCrmPreferences.notifications, ...snapshot.preferences?.notifications },
            channels: { ...defaultCrmPreferences.channels, ...snapshot.preferences?.channels },
          },
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }
  const seed = cloneDemoData()
  persist(seed)
  return seed
}

function newId() {
  return `mock-${window.crypto.randomUUID()}`
}

function nextCaseId(cases: SupportCase[]) {
  const lastNumber = cases.reduce((max, item) => Math.max(max, Number(item.id.match(/\d+$/)?.[0] ?? 0)), 2042)
  return `CS-${lastNumber + 1}`
}

export async function applyMockCrmMutation(mutation: CrmMutation): Promise<CrmSnapshot> {
  const snapshot = await readMockCrmData()
  const now = new Date()
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  switch (mutation.action) {
    case "send-message": {
      const conversation = snapshot.conversations.find((item) => item.id === mutation.conversationId)
      if (!conversation) throw new Error("That conversation could not be found.")
      const message: Message = { id: newId(), from: "agent", text: mutation.text.trim(), time, kind: conversation.channel === "email" ? "email" : "chat", ...(conversation.channel === "email" ? { subject: conversation.preview.startsWith("Re:") ? conversation.preview : `Re: ${conversation.preview}` } : {}) }
      conversation.messages.push(message)
      conversation.preview = message.text
      conversation.time = "now"
      conversation.lastActivity = now.toISOString()
      break
    }
    case "start-conversation": {
      if (!snapshot.contacts.some((item) => item.id === mutation.contactId)) throw new Error("That contact could not be found.")
      const conversation: Conversation = { id: newId(), contactId: mutation.contactId, channel: mutation.channel, preview: mutation.text, time: "now", unread: 0, lastActivity: now.toISOString(), messages: [{ id: newId(), from: "agent", text: mutation.text, time, kind: mutation.channel === "email" ? "email" : "chat" }] }
      snapshot.conversations.unshift(conversation)
      break
    }
    case "mark-conversation-read": {
      const conversation = snapshot.conversations.find((item) => item.id === mutation.conversationId)
      if (conversation) conversation.unread = 0
      break
    }
    case "create-contact": {
      const contact: Contact = { id: newId(), ...mutation.contact, initials: initialsForName(mutation.contact.name), color: colorForName(mutation.contact.name), assigned: snapshot.viewer.name, lastSeen: "Added just now" }
      snapshot.contacts.push(contact)
      snapshot.contacts.sort((a, b) => a.name.localeCompare(b.name))
      break
    }
    case "update-contact": {
      const contact = snapshot.contacts.find((item) => item.id === mutation.contactId)
      if (!contact) throw new Error("That contact could not be found.")
      Object.assign(contact, mutation.contact, { initials: initialsForName(mutation.contact.name), color: colorForName(mutation.contact.name) })
      break
    }
    case "delete-contact": {
      snapshot.contacts = snapshot.contacts.filter((item) => item.id !== mutation.contactId)
      snapshot.cases = snapshot.cases.filter((item) => item.contactId !== mutation.contactId)
      snapshot.conversations = snapshot.conversations.filter((item) => item.contactId !== mutation.contactId)
      snapshot.interactions = snapshot.interactions.filter((item) => item.contactId !== mutation.contactId)
      break
    }
    case "create-case": {
      const item: SupportCase = { id: nextCaseId(snapshot.cases), title: mutation.title, contactId: mutation.contactId, priority: mutation.priority ?? "Medium", channel: mutation.channel, status: "Open", updated: "Just now", notes: mutation.note ? [mutation.note] : [] }
      snapshot.cases.unshift(item)
      break
    }
    case "add-case-note": {
      const item = snapshot.cases.find((candidate) => candidate.id === mutation.caseId)
      if (!item) throw new Error("That case could not be found.")
      item.notes.push(mutation.note)
      item.updated = "Just now"
      break
    }
    case "update-case-priority": {
      const item = snapshot.cases.find((candidate) => candidate.id === mutation.caseId)
      if (!item) throw new Error("That case could not be found.")
      item.priority = mutation.priority
      item.updated = "Just now"
      break
    }
    case "log-interaction": {
      const interaction: Interaction = { id: newId(), contactId: mutation.contactId, type: mutation.type, summary: mutation.summary, date: new Date(mutation.occurredAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }), followUp: mutation.followUp }
      snapshot.interactions.unshift(interaction)
      break
    }
    case "update-case-status": {
      const item = snapshot.cases.find((candidate) => candidate.id === mutation.caseId)
      if (!item) throw new Error("That case could not be found.")
      item.status = mutation.status as CaseStatus
      item.updated = "Just now"
      break
    }
    case "toggle-contact-tag": {
      const contact = snapshot.contacts.find((item) => item.id === mutation.contactId)
      if (!contact) throw new Error("That contact could not be found.")
      contact.tags = contact.tags.includes(mutation.tag) ? contact.tags.filter((tag) => tag !== mutation.tag) : [...contact.tags, mutation.tag]
      break
    }
    case "update-profile": {
      snapshot.viewer.name = mutation.name
      break
    }
    case "update-preferences": {
      snapshot.preferences = mutation.preferences
      break
    }
  }

  persist(snapshot)
  return snapshot
}
