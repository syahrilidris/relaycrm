"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronRight, Plus } from "lucide-react"
import { CrmHeader } from "./crm-header"
import { CrmSidebar, MobileNavigation } from "./crm-sidebar"
import { DashboardView } from "./dashboard-view"
import { InboxView } from "./inbox-view"
import { ContactsView, ContactDetailsDrawer } from "./contacts-view"
import { CasesView } from "./cases-view"
import { SettingsView } from "./settings-view"
import { InteractionDialog } from "./interaction-dialog"
import { createClient } from "@/lib/supabase/client"
import { pageRoutes, routePages, type CaseStatus, type Contact, type Conversation, type InteractionType, type PageKey } from "@/lib/crm-data"
import { useCrmWorkspace } from "@/lib/crm-workspace"

const pageMeta: Record<PageKey, { title: string; description: string; eyebrow: string }> = {
  Dashboard: { title: "Dashboard", description: "A clear view of your customer relationships.", eyebrow: "Workspace overview" },
  Contacts: { title: "Contacts", description: "Know every customer, wherever the conversation started.", eyebrow: "Relationships" },
  Cases: { title: "Cases", description: "Track customer issues from first message to resolution.", eyebrow: "Support operations" },
  "Omnichannel Inbox": { title: "Omnichannel inbox", description: "Every conversation, one thoughtful reply at a time.", eyebrow: "Customer conversations" },
  Settings: { title: "Settings", description: "Make Relay work the way your team works.", eyebrow: "Workspace preferences" },
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : "That change could not be saved. Please try again."
}

export function CrmApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const forceMock = pathname === "/demo" || pathname.startsWith("/demo/")
  const workspacePath = forceMock ? pathname.replace(/^\/demo/, "") || "/inbox" : pathname
  if (!Object.values(pageRoutes).includes(workspacePath)) return <>{children}</>
  return <CrmWorkspace pathname={workspacePath} forceMock={forceMock} />
}

function CrmWorkspace({ pathname, forceMock }: { pathname: string; forceMock: boolean }) {
  const router = useRouter()
  const { data, error, isLoading, mode, runMutation, refresh } = useCrmWorkspace(forceMock)
  const activePage = routePages[pathname] ?? "Omnichannel Inbox"
  const [search, setSearch] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionContactId, setInteractionContactId] = useState<string | undefined>()
  const [notice, setNotice] = useState("")
  const meta = pageMeta[activePage]
  const unreadCount = data.conversations.reduce((total, conversation) => total + conversation.unread, 0)

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

  async function handleSendMessage(conversationId: string, text: string) {
    await runMutation({ action: "send-message", conversationId, text })
    setNotice("Reply saved to your workspace.")
  }

  async function handleCreateCase(conversation: Conversation) {
    const title = `Follow-up: ${conversation.preview.slice(0, 42)}${conversation.preview.length > 42 ? "…" : ""}`
    try {
      await runMutation({ action: "create-case", contactId: conversation.contactId, channel: conversation.channel, title })
      setNotice("Case created and saved to your workspace.")
    } catch (caught) {
      setNotice(readableError(caught))
    }
  }

  async function handleSaveInteraction(interaction: { contactId: string; type: InteractionType; summary: string; occurredAt: string; followUp: boolean }) {
    await runMutation({ action: "log-interaction", ...interaction })
    setNotice(`${interaction.type} logged${interaction.followUp ? " with a follow-up task" : ""}.`)
  }

  async function handleToggleTag(contactId: string, tag: string) {
    try {
      await runMutation({ action: "toggle-contact-tag", contactId, tag })
    } catch (caught) {
      setNotice(readableError(caught))
    }
  }

  async function handleUpdateCaseStatus(caseId: string, status: CaseStatus) {
    try {
      await runMutation({ action: "update-case-status", caseId, status })
      setNotice(`Case status updated to ${status}.`)
    } catch (caught) {
      setNotice(readableError(caught))
    }
  }

  async function handleSignOut() {
    try {
      if (mode === "live") {
        const { error: signOutError } = await createClient().auth.signOut()
        if (signOutError) throw signOutError
      }
      window.location.assign("/login")
    } catch {
      setNotice("Sign out failed. Please try again.")
    }
  }

  function renderPage() {
    if (isLoading) return <div role="status" className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading your workspace…</div>
    if (error) return <div role="alert" className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-white p-6 text-center dark:border-rose-400/20 dark:bg-slate-950"><p className="max-w-sm text-xs leading-relaxed text-rose-700 dark:text-rose-300">{readableError(error)}</p><button onClick={() => void refresh()} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">Try again</button></div>
    if (activePage === "Omnichannel Inbox") return <InboxView conversations={data.conversations} contacts={data.contacts} cases={data.cases} interactions={data.interactions} activeConversationId={activeConversationId} query={search} inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((current) => !current)} onSelectConversation={setActiveConversationId} onSendMessage={handleSendMessage} onLogInteraction={() => openInteraction(data.conversations.find((item) => item.id === activeConversationId)?.contactId ?? data.conversations[0]?.contactId)} onCreateCase={handleCreateCase} onToggleTag={handleToggleTag} />
    if (activePage === "Contacts") return <ContactsView contacts={data.contacts} cases={data.cases} interactions={data.interactions} query={search} onOpenContact={setSelectedContact} />
    if (activePage === "Cases") return <CasesView cases={data.cases} contacts={data.contacts} conversations={data.conversations} query={search} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onUpdateStatus={handleUpdateCaseStatus} />
    if (activePage === "Settings") return <SettingsView darkMode={darkMode} onToggleTheme={toggleTheme} />
    return <DashboardView contacts={data.contacts} conversations={data.conversations} cases={data.cases} onOpenInbox={() => router.push(pageRoutes["Omnichannel Inbox"])} onOpenCases={() => router.push(pageRoutes.Cases)} />
  }

  return <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <CrmSidebar activePage={activePage} caseCount={data.cases.length} unreadCount={unreadCount} mockRoute={forceMock} />
    <div className="flex min-h-screen min-w-0 flex-1 flex-col">
      <CrmHeader search={search} onSearch={setSearch} darkMode={darkMode} databaseMode={mode} onToggleTheme={toggleTheme} onSignOut={handleSignOut} />
      <MobileNavigation activePage={activePage} mockRoute={forceMock} />
      <main className="min-w-0 flex-1 px-3 pb-8 pt-5 sm:px-5 sm:pt-6 xl:px-7">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5"><div><div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span>{meta.eyebrow}</span><ChevronRight className="size-3" /><span className="text-emerald-700 dark:text-emerald-400">{activePage === "Omnichannel Inbox" ? "Inbox" : activePage}</span></div><h1 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-[23px]">{meta.title}</h1><p className="mt-1 text-[11px] text-slate-500">{meta.description}</p></div><div className="flex items-center gap-2">{activePage !== "Settings" && activePage !== "Dashboard" && <span className="hidden items-center gap-1.5 text-[9px] text-slate-400 lg:flex"><span className="size-1.5 rounded-full bg-emerald-400" /> Synced just now</span>}{activePage !== "Settings" && <button onClick={() => openInteraction(activePage === "Omnichannel Inbox" ? data.conversations.find((item) => item.id === activeConversationId)?.contactId ?? data.conversations[0]?.contactId : undefined)} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-9 sm:px-3"><Plus className="size-3.5 text-emerald-600 dark:text-emerald-400" /><span className="hidden sm:inline">Log interaction</span><span className="sm:hidden">Log</span></button>}</div></div>
          {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"><span className="flex items-center gap-2"><Check className="size-3.5" />{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification" className="text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-300"><span aria-hidden="true">×</span></button></div>}
          {renderPage()}
        </div>
      </main>
    </div>
    <InteractionDialog key={interactionContactId ?? "all-contacts"} open={interactionOpen} contacts={data.contacts} defaultContactId={interactionContactId} onClose={() => setInteractionOpen(false)} onSave={handleSaveInteraction} />
    <ContactDetailsDrawer contact={selectedContact} cases={data.cases} interactions={data.interactions} onClose={() => setSelectedContact(null)} />
  </div>
}
