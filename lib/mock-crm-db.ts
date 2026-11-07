import { demoCrmData } from "@/lib/crm-demo-data"
import type { CaseStatus, CrmMutation, CrmSnapshot, Interaction, Message, SupportCase } from "@/lib/crm-data"

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
      const snapshot = JSON.parse(stored) as CrmSnapshot
      if (Array.isArray(snapshot.contacts) && Array.isArray(snapshot.cases) && Array.isArray(snapshot.conversations) && Array.isArray(snapshot.interactions)) return snapshot
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
      break
    }
    case "create-case": {
      const item: SupportCase = { id: nextCaseId(snapshot.cases), title: mutation.title, contactId: mutation.contactId, priority: "Medium", channel: mutation.channel, status: "Open", updated: "Just now", notes: ["Created from a customer conversation."] }
      snapshot.cases.unshift(item)
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
  }

  persist(snapshot)
  return snapshot
}
