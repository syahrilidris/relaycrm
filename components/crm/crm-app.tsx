"use client"

import { useState } from "react"
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Plus, Search, UsersRound } from "lucide-react"
import { CrmHeader } from "./crm-header"
import { CrmSidebar, MobileNavigation } from "./crm-sidebar"
import { DashboardView } from "./dashboard-view"
import { InboxView } from "./inbox-view"
import { ContactsView, ContactDetailsDrawer } from "./contacts-view"
import { CasesView } from "./cases-view"
import { SettingsView } from "./settings-view"
import { InteractionDialog } from "./interaction-dialog"
import type { CaseStatus, Contact, Conversation, Interaction, PageKey, SupportCase } from "@/lib/crm-data"
import { initialCases, initialContacts, initialConversations, initialInteractions } from "@/lib/crm-data"

const pageMeta: Record<PageKey, { title: string; description: string; eyebrow: string }> = {
  Dashboard: { title: "Dashboard", description: "A clear view of your customer relationships.", eyebrow: "Workspace overview" },
  Contacts: { title: "Contacts", description: "Know every customer, wherever the conversation started.", eyebrow: "Relationships" },
  Cases: { title: "Cases", description: "Track customer issues from first message to resolution.", eyebrow: "Support operations" },
  "Omnichannel Inbox": { title: "Omnichannel inbox", description: "Every conversation, one thoughtful reply at a time.", eyebrow: "Customer conversations" },
  Settings: { title: "Settings", description: "Make Relay work the way your team works.", eyebrow: "Workspace preferences" },
}

export function CrmApp() {
  const [activePage, setActivePage] = useState<PageKey>("Omnichannel Inbox")
  const [search, setSearch] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [cases, setCases] = useState<SupportCase[]>(initialCases)
  const [interactions, setInteractions] = useState<Interaction[]>(initialInteractions)
  const [activeConversationId, setActiveConversationId] = useState("v1")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionContactId, setInteractionContactId] = useState<string | undefined>()
  const [notice, setNotice] = useState("")
  const meta = pageMeta[activePage]

  function openInteraction(contactId?: string) {
    setInteractionContactId(contactId)
    setInteractionOpen(true)
  }

  function toggleTheme() {
    const nextTheme = !darkMode
    document.documentElement.classList.toggle("dark", nextTheme)
    document.documentElement.classList.toggle("light", !nextTheme)
    setDarkMode(nextTheme)
  }

  function handleSendMessage(conversationId: string, text: string) {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, preview: text, time: "now", messages: [...conversation.messages, { id: `m${Date.now()}`, from: "agent", text, time }] } : conversation))
  }

  function handleCreateCase(conversation: Conversation) {
    const contact = contacts.find((item) => item.id === conversation.contactId)
    const nextNumber = Math.max(2042, ...cases.map((item) => Number(item.id.replace("CS-", "")))) + 1
    const nextCase: SupportCase = { id: `CS-${nextNumber}`, title: `Follow-up: ${conversation.preview.slice(0, 42)}${conversation.preview.length > 42 ? "…" : ""}`, contactId: conversation.contactId, priority: "Medium", channel: conversation.channel, status: "Open", updated: "Just now", notes: [`Created from ${contact?.name ?? "customer"}’s ${conversation.channel} conversation.`] }
    setCases((current) => [nextCase, ...current])
    setSelectedCaseId(nextCase.id)
    setActivePage("Cases")
    setNotice(`Case ${nextCase.id} created from the conversation.`)
  }

  function handleSaveInteraction(interaction: Interaction) {
    setInteractions((current) => [interaction, ...current])
    setNotice(`${interaction.type} logged successfully${interaction.followUp ? " with a follow-up task" : ""}.`)
  }

  function handleToggleTag(contactId: string, tag: string) {
    setContacts((current) => current.map((contact) => contact.id !== contactId ? contact : { ...contact, tags: contact.tags.includes(tag) ? contact.tags.filter((item) => item !== tag) : [...contact.tags, tag] }))
  }

  function handleUpdateCaseStatus(caseId: string, status: CaseStatus) {
    setCases((current) => current.map((item) => item.id === caseId ? { ...item, status, updated: "Just now" } : item))
  }

  function renderPage() {
    if (activePage === "Omnichannel Inbox") return <InboxView conversations={conversations} contacts={contacts} cases={cases} interactions={interactions} activeConversationId={activeConversationId} query={search} inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((current) => !current)} onSelectConversation={setActiveConversationId} onSendMessage={handleSendMessage} onLogInteraction={() => openInteraction(conversations.find((item) => item.id === activeConversationId)?.contactId)} onCreateCase={handleCreateCase} onToggleTag={handleToggleTag} />
    if (activePage === "Contacts") return <ContactsView contacts={contacts} cases={cases} interactions={interactions} query={search} onOpenContact={setSelectedContact} />
    if (activePage === "Cases") return <CasesView cases={cases} contacts={contacts} conversations={conversations} query={search} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onUpdateStatus={handleUpdateCaseStatus} />
    if (activePage === "Settings") return <SettingsView darkMode={darkMode} onToggleTheme={toggleTheme} />
    return <DashboardView contacts={contacts} conversations={conversations} cases={cases} onOpenInbox={() => { setActivePage("Omnichannel Inbox"); setSearch("") }} onOpenCases={() => { setActivePage("Cases"); setSearch("") }} />
  }

  return <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <CrmSidebar activePage={activePage} onNavigate={(page) => { setActivePage(page); setSearch("") }} />
    <div className="flex min-h-screen min-w-0 flex-1 flex-col">
      <CrmHeader search={search} onSearch={setSearch} darkMode={darkMode} onToggleTheme={toggleTheme} />
      <MobileNavigation activePage={activePage} onNavigate={(page) => { setActivePage(page); setSearch("") }} />
      <main className="min-w-0 flex-1 px-3 pb-8 pt-5 sm:px-5 sm:pt-6 xl:px-7">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5"><div><div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span>{meta.eyebrow}</span><ChevronRight className="size-3" /><span className="text-emerald-700 dark:text-emerald-400">{activePage === "Omnichannel Inbox" ? "Inbox" : activePage}</span></div><h1 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-[23px]">{meta.title}</h1><p className="mt-1 text-[11px] text-slate-500">{meta.description}</p></div><div className="flex items-center gap-2">{activePage !== "Settings" && activePage !== "Dashboard" && <span className="hidden items-center gap-1.5 text-[9px] text-slate-400 lg:flex"><span className="size-1.5 rounded-full bg-emerald-400" /> Synced just now</span>}{activePage !== "Settings" && <button onClick={() => openInteraction(activePage === "Omnichannel Inbox" ? conversations.find((item) => item.id === activeConversationId)?.contactId : undefined)} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-9 sm:px-3"><Plus className="size-3.5 text-emerald-600 dark:text-emerald-400" /><span className="hidden sm:inline">Log interaction</span><span className="sm:hidden">Log</span></button>}</div></div>
          {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"><span className="flex items-center gap-2"><Check className="size-3.5" />{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification" className="text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-300"><span aria-hidden="true">×</span></button></div>}
          {renderPage()}
        </div>
      </main>
    </div>
    <InteractionDialog key={interactionContactId ?? "all-contacts"} open={interactionOpen} contacts={contacts} defaultContactId={interactionContactId} onClose={() => setInteractionOpen(false)} onSave={handleSaveInteraction} />
    <ContactDetailsDrawer contact={selectedContact} cases={cases} interactions={interactions} onClose={() => setSelectedContact(null)} />
  </div>
}
