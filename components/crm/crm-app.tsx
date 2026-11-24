"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { CrmHeader } from "./crm-header"
import { CrmSidebar, MobileNavigation } from "./crm-sidebar"
import { DashboardView } from "./dashboard-view"
import { InboxView } from "./inbox-view"
import { ContactsView, ContactDetailsDrawer } from "./contacts-view"
import { CasesView } from "./cases-view"
import { SettingsView } from "./settings-view"
import { InteractionDialog } from "./interaction-dialog"
import { CaseDialog, ContactDialog, ConversationDialog } from "./crm-dialogs"
import { createClient } from "@/lib/supabase/client"
import { channelLabels, pageRoutes, routePages, type CaseStatus, type Channel, type ChannelConnection, type Contact, type ContactInput, type Conversation, type CrmPreferences, type InteractionType, type PageKey, type Priority } from "@/lib/crm-data"
import { useCrmWorkspace } from "@/lib/crm-workspace"
import { AlertStack, NoticeToast, NotificationsMenu, useLiveAlerts, useUnreadTitle, type UnreadItem } from "./live-alerts"

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState("")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactDialog, setContactDialog] = useState<{ contact: Contact | null } | null>(null)
  const [caseDialog, setCaseDialog] = useState<{ contactId?: string } | null>(null)
  const [conversationDialog, setConversationDialog] = useState<{ contactId?: string } | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionContactId, setInteractionContactId] = useState<string | undefined>()
  const [notice, setNotice] = useState("")
  const viewerName = data.viewer.name.trim() || (mode === "mock" ? "Maya Chen" : "Workspace owner")
  const viewerEmail = data.viewer.email
  const viewerRole = mode === "live" ? "Workspace owner" : "Demo profile"
  const unreadCount = data.conversations.filter((conversation) => conversation.unread > 0).length
  const openCaseCount = data.cases.filter((item) => item.status !== "Resolved").length
  const selectedContact = data.contacts.find((contact) => contact.id === selectedContactId) ?? null
  const inboxActive = activePage === "Omnichannel Inbox"
  const [openRequest, setOpenRequest] = useState<{ id: string; nonce: number } | undefined>()
  const unreadMessages = data.conversations.reduce((sum, conversation) => sum + conversation.unread, 0)
  const unreadItems: UnreadItem[] = data.conversations
    .filter((conversation) => conversation.unread > 0)
    .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""))
    .flatMap((conversation) => { const contact = data.contacts.find((item) => item.id === conversation.contactId); return contact ? [{ conversation, contact }] : [] })

  const openFromAlert = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId)
    setOpenRequest({ id: conversationId, nonce: Date.now() })
    if (!inboxActive) router.push(forceMock ? `/demo${pageRoutes["Omnichannel Inbox"]}` : pageRoutes["Omnichannel Inbox"])
  }, [forceMock, inboxActive, router])

  const live = useLiveAlerts({
    conversations: data.conversations,
    contacts: data.contacts,
    ready: !isLoading && !error,
    enabled: data.preferences.notifications.replies,
    // No alert for the chat you are already reading.
    isViewing: (conversationId) => inboxActive && conversationId === activeConversationId && !document.hidden,
    onOpen: openFromAlert,
  })
  useUnreadTitle(unreadMessages)

  // A message that arrives in the chat you have open counts as read straight away.
  const activeUnread = data.conversations.find((item) => item.id === activeConversationId)?.unread ?? 0
  useEffect(() => {
    if (!inboxActive || !activeConversationId || activeUnread === 0 || document.hidden) return
    void runMutation({ action: "mark-conversation-read", conversationId: activeConversationId }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxActive, activeConversationId, activeUnread])

  async function handleMarkAllRead() {
    const pending = data.conversations.filter((item) => item.unread > 0)
    for (const conversation of pending) await runMutation({ action: "mark-conversation-read", conversationId: conversation.id }).catch(() => undefined)
    setNotice(pending.length === 1 ? "1 conversation marked as read." : `${pending.length} conversations marked as read.`)
  }

  const clearNotice = useCallback(() => setNotice(""), [])

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
    // The message bubble itself shows Sending… / ticks / Not sent, so no page banner here.
    await runMutation({ action: "send-message", conversationId, text })
  }

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId)
    const conversation = data.conversations.find((item) => item.id === conversationId)
    if (conversation && conversation.unread > 0) void runMutation({ action: "mark-conversation-read", conversationId }).catch(() => undefined)
  }

  async function handleStartConversation(input: { contactId: string; channel: Channel; text: string }) {
    const before = new Set(data.conversations.map((item) => item.id))
    const next = await runMutation({ action: "start-conversation", ...input })
    const created = next.conversations.find((item) => !before.has(item.id))
    if (created) setActiveConversationId(created.id)
    setNotice("Conversation started and saved to your workspace.")
    setSelectedContactId(null)
    if (activePage !== "Omnichannel Inbox") router.push(forceMock ? `/demo${pageRoutes["Omnichannel Inbox"]}` : pageRoutes["Omnichannel Inbox"])
  }

  async function handleSaveContact(input: ContactInput) {
    if (contactDialog?.contact) {
      await runMutation({ action: "update-contact", contactId: contactDialog.contact.id, contact: input })
      setNotice(`${input.name} updated.`)
    } else {
      await runMutation({ action: "create-contact", contact: input })
      setNotice(`${input.name} added to your contacts.`)
    }
  }

  async function handleDeleteContact(contact: Contact) {
    await runMutation({ action: "delete-contact", contactId: contact.id })
    setSelectedContactId(null)
    setNotice(`${contact.name} and their linked records were deleted.`)
  }

  async function handleNewCase(input: { contactId: string; title: string; channel: Channel; priority: Priority; note?: string }) {
    await runMutation({ action: "create-case", ...input })
    setNotice("Case created and saved to your workspace.")
  }

  async function handleAddCaseNote(caseId: string, note: string) {
    await runMutation({ action: "add-case-note", caseId, note })
    setNotice("Note added to the case.")
  }

  async function handleUpdateCasePriority(caseId: string, priority: Priority) {
    try {
      await runMutation({ action: "update-case-priority", caseId, priority })
      setNotice(`Case priority set to ${priority}.`)
    } catch (caught) {
      setNotice(readableError(caught))
    }
  }

  async function handleCreateCase(conversation: Conversation) {
    const title = `Follow-up: ${conversation.preview.slice(0, 42)}${conversation.preview.length > 42 ? "…" : ""}`
    try {
      await runMutation({ action: "create-case", contactId: conversation.contactId, channel: conversation.channel, title, priority: "Medium", note: `Created from a ${channelLabels[conversation.channel]} conversation.` })
      setNotice("Case created and saved to your workspace.")
    } catch (caught) {
      setNotice(readableError(caught))
    }
  }

  async function handleSaveInteraction(interaction: { contactId: string; type: InteractionType; summary: string; occurredAt: string; followUp: boolean }) {
    await runMutation({ action: "log-interaction", ...interaction })
    setNotice(`${interaction.type} logged${interaction.followUp ? " with a follow-up task" : ""}.`)
  }

  async function handleSaveProfile(name: string) {
    try {
      await runMutation({ action: "update-profile", name })
      setNotice(mode === "live" ? "Profile name saved to your Supabase account." : "Profile name saved in this browser’s mock workspace.")
    } catch (error) {
      setNotice(readableError(error))
      throw error
    }
  }

  async function handleUpdatePreferences(preferences: CrmPreferences) {
    try {
      await runMutation({ action: "update-preferences", preferences })
      setNotice(mode === "live" ? "Settings saved to your Supabase account." : "Settings saved in this browser’s mock workspace.")
    } catch (error) {
      setNotice(readableError(error))
      throw error
    }
  }

  async function handleConnectWhatsApp(input: { phoneNumberId: string; wabaId?: string; accessToken: string }) {
    await runMutation({ action: "connect-whatsapp", ...input })
    setNotice("WhatsApp number connected. New messages will appear in your inbox.")
  }

  async function handleDisconnectChannel(connection: ChannelConnection) {
    await runMutation({ action: "disconnect-channel", connectionId: connection.id })
    setNotice(`${connection.name} disconnected.`)
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
    if (isLoading) return <div role="status" className="m-0 flex min-h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading your workspace…</div>
    if (error) return <div role="alert" className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-white p-6 text-center dark:border-rose-400/20 dark:bg-slate-950"><p className="max-w-sm text-xs leading-relaxed text-rose-700 dark:text-rose-300">{readableError(error)}</p><button onClick={() => void refresh()} className="rounded-lg bg-slate-900 px-3 py-2 text-[11.5px] font-semibold text-white dark:bg-white dark:text-slate-900">Try again</button></div>
    if (activePage === "Omnichannel Inbox") return <InboxView conversations={data.conversations} contacts={data.contacts} cases={data.cases} interactions={data.interactions} visibleChannels={data.preferences.channels} activeConversationId={activeConversationId} query={search} inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((current) => !current)} onSelectConversation={handleSelectConversation} onStartConversation={() => setConversationDialog({})} agentName={viewerName} agentEmail={viewerEmail} openRequest={openRequest} liveSync={mode === "live"} onSendMessage={handleSendMessage} onLogInteraction={() => openInteraction(data.conversations.find((item) => item.id === activeConversationId)?.contactId ?? data.conversations[0]?.contactId)} onCreateCase={handleCreateCase} onToggleTag={handleToggleTag} />
    if (activePage === "Contacts") return <ContactsView contacts={data.contacts} query={search} onOpenContact={(contact) => setSelectedContactId(contact.id)} onAddContact={() => setContactDialog({ contact: null })} onLogInteraction={() => openInteraction()} />
    if (activePage === "Cases") return <CasesView cases={data.cases} contacts={data.contacts} interactions={data.interactions} query={search} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} onUpdateStatus={handleUpdateCaseStatus} onUpdatePriority={handleUpdateCasePriority} onAddNote={handleAddCaseNote} onNewCase={() => setCaseDialog({})} onLogInteraction={() => openInteraction()} />
    if (activePage === "Settings") return <SettingsView viewerName={viewerName} viewerEmail={viewerEmail} preferences={data.preferences} mode={mode} darkMode={darkMode} onToggleTheme={toggleTheme} onSaveProfile={handleSaveProfile} onUpdatePreferences={handleUpdatePreferences} onSignOut={handleSignOut} connections={data.connections} metaReady={data.integrations.metaReady} onConnectWhatsApp={handleConnectWhatsApp} onDisconnectChannel={handleDisconnectChannel} />
    return <DashboardView contacts={data.contacts} conversations={data.conversations} cases={data.cases} viewerName={viewerName} mode={mode} onOpenInbox={() => router.push(forceMock ? `/demo${pageRoutes["Omnichannel Inbox"]}` : pageRoutes["Omnichannel Inbox"])} onOpenCases={() => router.push(forceMock ? `/demo${pageRoutes.Cases}` : pageRoutes.Cases)} onAddContact={() => setContactDialog({ contact: null })} onLogInteraction={() => openInteraction()} />
  }

  return <div className="flex h-[100dvh] overflow-hidden bg-[#F5F6FA] font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <CrmSidebar activePage={activePage} caseCount={openCaseCount} unreadCount={unreadCount} mockRoute={forceMock} collapsed={sidebarCollapsed} viewerName={viewerName} viewerRole={viewerRole} onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)} />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <CrmHeader search={search} onSearch={setSearch} darkMode={darkMode} databaseMode={mode} viewerName={viewerName} viewerEmail={viewerEmail} onToggleTheme={toggleTheme} onSignOut={handleSignOut} notifications={<NotificationsMenu items={unreadItems} soundOn={live.soundOn} onToggleSound={live.setSoundOn} desktopPermission={live.desktopPermission} onEnableDesktop={() => void live.enableDesktop()} onOpen={openFromAlert} onMarkAllRead={() => void handleMarkAllRead()} />} />
      <MobileNavigation activePage={activePage} mockRoute={forceMock} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">{isLoading || error ? <div className="p-4 sm:p-6">{renderPage()}</div> : renderPage()}</main>
    </div>
    <AlertStack alerts={live.alerts} onOpen={openFromAlert} onDismiss={live.dismiss} />
    <NoticeToast notice={notice} onDismiss={clearNotice} />
    <InteractionDialog key={interactionContactId ?? "all-contacts"} open={interactionOpen} contacts={data.contacts} defaultContactId={interactionContactId} onClose={() => setInteractionOpen(false)} onSave={handleSaveInteraction} />
    <ContactDetailsDrawer key={selectedContact?.id ?? "no-contact"} contact={selectedContact} cases={data.cases} interactions={data.interactions} onClose={() => setSelectedContactId(null)} actions={selectedContact ? {
      onEdit: () => setContactDialog({ contact: selectedContact }),
      onDelete: () => handleDeleteContact(selectedContact),
      onNewCase: () => setCaseDialog({ contactId: selectedContact.id }),
      onLogInteraction: () => openInteraction(selectedContact.id),
      onStartConversation: () => setConversationDialog({ contactId: selectedContact.id }),
    } : undefined} />
    {contactDialog && <ContactDialog key={contactDialog.contact?.id ?? "new-contact"} contact={contactDialog.contact} onClose={() => setContactDialog(null)} onSave={handleSaveContact} />}
    {caseDialog && <CaseDialog contacts={data.contacts} defaultContactId={caseDialog.contactId} onClose={() => setCaseDialog(null)} onSave={handleNewCase} />}
    {conversationDialog && <ConversationDialog contacts={data.contacts} defaultContactId={conversationDialog.contactId} onClose={() => setConversationDialog(null)} onSave={handleStartConversation} />}
  </div>
}
