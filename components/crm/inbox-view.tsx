"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, Ellipsis, Filter, Headphones, Loader2, Mail, MessageSquareText, MoreHorizontal, PanelRightClose, PanelRightOpen, Paperclip, Phone, Plus, RotateCw, Search, Send, Sparkles, Tag, UserRound, Video, X } from "lucide-react"
import type { CaseStatus, Channel, Contact, Conversation, Interaction, SupportCase } from "@/lib/crm-data"
import { channelLabels, formatClockTime, formatDateTime, formatLastSeen } from "@/lib/crm-data"
import { EscalationBadge } from "./cases-view"
import { ChannelIcon, ChannelPill, ContactAvatar, CaseStatusPill, PriorityPill, SelectMenu, Switch, type SelectMenuOption } from "./crm-primitives"

const channelOrder: Channel[] = ["whatsapp", "facebook", "instagram", "email", "webchat"]
type ChannelFilter = "all" | Channel

type InboxViewProps = {
  conversations: Conversation[]
  contacts: Contact[]
  cases: SupportCase[]
  interactions: Interaction[]
  visibleChannels: Record<Channel, boolean>
  activeConversationId: string
  query: string
  inspectorOpen: boolean
  onToggleInspector: () => void
  onSelectConversation: (id: string) => void
  onSendMessage: (conversationId: string, text: string) => Promise<void>
  onLogInteraction: () => void
  onCreateCase: (conversation: Conversation) => Promise<void>
  onToggleTag: (contactId: string, tag: string) => Promise<void>
  onStartConversation: () => void
  onOpenCase: (caseId: string) => void
  agentName: string
  agentEmail: string
  /** Opens a conversation from outside the inbox (e.g. a new-message alert); nonce makes repeats work. */
  openRequest?: { id: string; nonce: number }
  liveSync?: boolean
}

export function InboxView({ conversations, contacts, cases, interactions, visibleChannels, activeConversationId, query, inspectorOpen, onToggleInspector, onSelectConversation, onSendMessage, onLogInteraction, onCreateCase, onToggleTag, onStartConversation, onOpenCase, agentName, agentEmail, openRequest, liveSync }: InboxViewProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const [draft, setDraft] = useState("")
  const [messageError, setMessageError] = useState("")
  // Phones: the chat opens as its own full-screen page instead of stacking under the list.
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  // Replies shown instantly while the server saves/delivers them.
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0]
  const contact = contacts.find((item) => item.id === activeConversation?.contactId)
  const pendingHere = outbox.filter((item) => item.conversationId === activeConversation?.id)
  const sendingHere = pendingHere.some((item) => item.status === "sending")
  const activeCases = cases.filter((item) => item.contactId === contact?.id)
  const contactInteractions = interactions.filter((item) => item.contactId === contact?.id)
  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const person = contacts.find((item) => item.id === conversation.contactId)
    const matchesChannel = visibleChannels[conversation.channel] && (channelFilter === "all" || conversation.channel === channelFilter) && (!unreadOnly || conversation.unread > 0)
    const searchText = `${person?.name} ${person?.company} ${conversation.preview} ${channelLabels[conversation.channel]}`.toLowerCase()
    return matchesChannel && searchText.includes(query.toLowerCase()) && searchText.includes(localSearch.toLowerCase())
  }), [channelFilter, contacts, conversations, query, localSearch, visibleChannels, unreadOnly])
  const channelCounts = useMemo(() => {
    const counts = { all: { total: 0, unread: 0 } } as Record<ChannelFilter, { total: number; unread: number }>
    for (const channel of channelOrder) counts[channel] = { total: 0, unread: 0 }
    for (const conversation of conversations) {
      if (!visibleChannels[conversation.channel]) continue
      for (const key of ["all", conversation.channel] as ChannelFilter[]) { counts[key].total++; if (conversation.unread > 0) counts[key].unread++ }
    }
    return counts
  }, [conversations, visibleChannels])
  const availableChannels = channelOrder.filter((channel) => visibleChannels[channel])

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches

  function openConversation(id: string) {
    onSelectConversation(id)
    setMessageError("")
    if (isDesktop()) return
    if (!mobileChatOpen) window.history.pushState({ bintangChat: id }, "")
    setMobileChatOpen(true)
  }

  // Back arrow and the phone's own back button both return to the list.
  const closeMobileChat = useCallback(() => {
    if (window.history.state?.bintangChat) window.history.back()
    else setMobileChatOpen(false)
    setMobileDetailsOpen(false)
  }, [])

  function toggleDetails() {
    if (isDesktop()) onToggleInspector()
    else setMobileDetailsOpen((open) => !open)
  }

  useEffect(() => {
    const onPop = () => { setMobileChatOpen(false); setMobileDetailsOpen(false) }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // A new-message alert asked to open a specific chat.
  useEffect(() => {
    if (openRequest?.id) openConversation(openRequest.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.nonce])

  // Stop the page behind the full-screen chat from scrolling.
  useEffect(() => {
    if (!mobileChatOpen || isDesktop()) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [mobileChatOpen])

  // Always land on the newest message.
  const messageCount = activeConversation?.messages.length ?? 0
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [activeConversation?.id, messageCount, mobileChatOpen, pendingHere.length])


  async function deliver(item: OutgoingMessage) {
    try {
      await onSendMessage(item.conversationId, item.text)
      // The saved copy is now in the conversation, so drop the placeholder.
      setOutbox((current) => current.filter((entry) => entry.key !== item.key))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Your reply could not be sent."
      setOutbox((current) => current.map((entry) => entry.key === item.key ? { ...entry, status: "failed", error: reason } : entry))
    }
  }

  function send() {
    const text = draft.trim()
    // One reply at a time per chat, so a slow network can't produce duplicates.
    if (!text || !activeConversation || sendingHere) return
    setMessageError("")
    setDraft("")
    const item: OutgoingMessage = { key: crypto.randomUUID(), conversationId: activeConversation.id, text, time: new Date().toISOString(), status: "sending" }
    setOutbox((current) => [...current, item])
    void deliver(item)
  }

  function retry(item: OutgoingMessage) {
    if (sendingHere) return
    const next: OutgoingMessage = { ...item, status: "sending", error: undefined }
    setOutbox((current) => current.map((entry) => entry.key === item.key ? next : entry))
    void deliver(next)
  }

  function discard(item: OutgoingMessage) {
    setOutbox((current) => current.filter((entry) => entry.key !== item.key))
    if (!draft.trim()) setDraft(item.text)
  }


  return (
    <div className={`grid h-full min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden bg-white dark:bg-slate-950 ${inspectorOpen ? "lg:grid-cols-[290px_minmax(0,1fr)_270px] 2xl:grid-cols-[340px_minmax(0,1fr)_310px]" : "lg:grid-cols-[310px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]"}`}>
      <section aria-label="Conversation list" className="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-800 lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between"><div><h1 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Inbox{liveSync && <span title="New messages appear automatically" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>Live</span>}</h1><p className="mt-0.5 text-[11.5px] text-slate-500">{channelCounts.all.unread ? `${channelCounts.all.unread} unread of ${channelCounts.all.total}` : `${channelCounts.all.total} conversations`}</p></div><button onClick={onStartConversation} aria-label="New conversation" title="New conversation" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-700 dark:hover:bg-slate-800"><Plus className="size-4" /></button></div>
          <div className="flex items-center gap-2">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-400 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-800"><Search className="size-3.5 shrink-0" /><input aria-label="Search conversations" placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-slate-400 dark:text-slate-200" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} />{localSearch && <button onClick={() => setLocalSearch("")} aria-label="Clear search" className="rounded p-0.5 hover:text-slate-600"><X className="size-3.5" /></button>}</label>
            <ChannelFilterMenu value={channelFilter} onChange={setChannelFilter} channels={availableChannels} counts={channelCounts} unreadOnly={unreadOnly} onUnreadOnly={setUnreadOnly} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 pb-1 pt-3"><span className="text-[10.5px] font-semibold text-slate-400">{channelFilter === "all" ? "All channels" : channelLabels[channelFilter]}{unreadOnly ? " · unread" : ""}</span><span className="text-[10.5px] font-medium text-slate-500">Newest first</span></div>
          {filteredConversations.map((conversation) => {
            const person = contacts.find((item) => item.id === conversation.contactId)
            if (!person) return null
            const active = conversation.id === activeConversation?.id
            return <button key={conversation.id} onClick={() => openConversation(conversation.id)} aria-current={active ? "true" : undefined} className={`flex w-full gap-2.5 border-b border-slate-100 px-3.5 py-3 text-left transition dark:border-slate-900 ${active ? "bg-indigo-50/70 dark:bg-indigo-400/[0.07]" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"}`}>
              <div className="relative shrink-0"><ContactAvatar contact={person} size="md" /><span className={`absolute -bottom-0.5 -right-0.5 flex size-[17px] items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${active ? "bg-indigo-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950"}`}><ChannelIcon channel={conversation.channel} className="size-2.5 text-current" /></span></div>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className={`truncate text-[12.5px] ${conversation.unread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-800 dark:text-slate-200"}`}>{person.name}</span><span className="shrink-0 text-[10.5px] text-slate-400">{conversation.time}</span></div><div className="mt-0.5 flex items-center justify-between gap-2"><span className="truncate text-[11.5px] text-slate-500">{conversation.preview}</span>{conversation.unread > 0 && <span className="flex size-[17px] shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10.5px] font-semibold text-white">{conversation.unread}</span>}</div><div className="mt-1.5 flex items-center gap-1.5"><ChannelPill channel={conversation.channel} /><span className="truncate text-[10.5px] text-slate-400">{person.company}</span></div></div>
            </button>
          })}
          {filteredConversations.length === 0 && (conversations.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-xs text-slate-500">No conversations yet.</p><button onClick={onStartConversation} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-indigo-700"><Plus className="size-3.5" /> New conversation</button></div> : <div className="px-5 py-8 text-center"><p className="text-xs text-slate-500">{unreadOnly && !localSearch ? "No unread conversations here." : "No conversations match."}</p>{(channelFilter !== "all" || unreadOnly || localSearch) && <button onClick={() => { setChannelFilter("all"); setUnreadOnly(false); setLocalSearch("") }} className="mt-2 text-[11.5px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Show all conversations</button>}</div>)}
        </div>
      </section>

      <section aria-label="Conversation" className={`${mobileChatOpen ? "fixed inset-0 z-40 flex h-[100dvh] bg-white dark:bg-slate-950" : "hidden"} min-w-0 flex-col lg:static lg:z-auto lg:flex lg:h-auto lg:min-h-0`}>
        {activeConversation && contact ? <>
          <div className="flex h-[62px] shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 dark:border-slate-800 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5"><button onClick={closeMobileChat} aria-label="Back to conversations" className="-ml-1.5 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"><ArrowLeft className="size-[18px]" /></button><ContactAvatar contact={contact} size="sm" /><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-xs font-semibold text-slate-900 dark:text-white">{contact.name}</h2><span className="hidden size-1.5 rounded-full bg-indigo-400 sm:block" /></div><p className="mt-0.5 truncate text-[11.5px] text-slate-500">{formatLastSeen(contact.lastSeen)} <span className="px-1 text-slate-300">·</span> <ChannelPill channel={activeConversation.channel} />{activeConversation.connectionId && <span title={`Live via ${activeConversation.connectionName ?? "Meta"}`} className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><span className="size-1.5 rounded-full bg-indigo-500" />Live · {activeConversation.connectionName}</span>}</p></div></div>
            <div className="flex shrink-0 items-center gap-0.5"><button onClick={onLogInteraction} aria-label="Log a call" title="Log a call" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><Phone className="size-4" /></button><button onClick={() => void onCreateCase(activeConversation)} title="Convert to support case" className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-700 transition hover:bg-slate-50 sm:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="size-3.5" /> Create case</button><button onClick={toggleDetails} aria-label={inspectorOpen ? "Hide contact details" : "Show contact details"} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">{inspectorOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}</button></div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-[#fbfcfd] dark:bg-slate-950">
            <div className="flex items-center justify-center gap-2 py-3"><span className="h-px w-8 bg-slate-200 dark:bg-slate-800" /><span className="text-[10.5px] font-medium text-slate-400">{activeConversation.lastActivity && !Number.isNaN(new Date(activeConversation.lastActivity).valueOf()) ? `Last activity ${new Date(activeConversation.lastActivity).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Conversation history"}</span><span className="h-px w-8 bg-slate-200 dark:bg-slate-800" /></div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
              <div className="mx-auto flex max-w-[690px] flex-col gap-3">
                {activeConversation.messages.map((message) => {
                  if (message.from === "system") return <div key={message.id} className="flex justify-center py-1"><span className="rounded-full bg-slate-100 px-3 py-1 text-[10.5px] text-slate-500 dark:bg-slate-900">{message.text}</span></div>
                  if (message.kind === "email") return <div key={message.id} className={`flex ${message.from === "agent" ? "justify-end" : "justify-start"}`}><div className={`w-full max-w-[430px] rounded-xl border bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${message.from === "agent" ? "border-indigo-200 dark:border-indigo-400/20" : "border-slate-200"}`}><div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"><span className="flex size-6 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"><Mail className="size-3" /></span><div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{message.subject}</p><p className="text-[10.5px] text-slate-400">{message.from === "contact" ? contact.email : agentEmail ? `${agentName} · ${agentEmail}` : agentName}</p></div><span className="text-[10.5px] text-slate-400">{formatClockTime(message.time)}</span></div><p className="whitespace-pre-line text-[12.5px] leading-[1.7] text-slate-600 dark:text-slate-300">{message.text}</p></div></div>
                  return <div key={message.id} className={`flex ${message.from === "agent" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] sm:max-w-[72%] ${message.from === "agent" ? "items-end" : "items-start"} flex flex-col`}><div className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-[1.65] ${message.from === "agent" ? "rounded-br-md bg-indigo-600 text-white shadow-sm shadow-indigo-800/10" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,.03)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>{message.text}</div><span className={`mt-1 flex items-center gap-1 text-[10.5px] text-slate-400 ${message.from === "agent" ? "flex-row-reverse" : ""}`}>{formatClockTime(message.time)}{message.from === "agent" && <DeliveryTick status={message.status} />}</span></div></div>
                })}
                {pendingHere.map((item) => <div key={item.key} className="flex justify-end"><div className="flex max-w-[82%] flex-col items-end sm:max-w-[72%]">
                  <div className={`rounded-2xl rounded-br-md px-3.5 py-2.5 text-[12.5px] leading-[1.65] text-white ${item.status === "failed" ? "bg-rose-500/90" : "bg-indigo-600/70"}`}>{item.text}</div>
                  {item.status === "sending"
                    ? <span className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-400" role="status"><Loader2 className="size-3 animate-spin" />Sending…</span>
                    : <span className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[10.5px]" role="alert"><span className="font-medium text-rose-600 dark:text-rose-300" title={item.error}>Not sent</span><button onClick={() => retry(item)} disabled={sendingHere} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline disabled:opacity-50 dark:text-indigo-300"><RotateCw className="size-3" />Retry</button><button onClick={() => discard(item)} className="text-slate-500 hover:underline">Remove</button></span>}
                  {item.status === "failed" && item.error && <span className="mt-0.5 max-w-[320px] text-right text-[10.5px] text-rose-600/90 dark:text-rose-300/90">{item.error}</span>}
                </div></div>)}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
              <div className="mx-auto max-w-[690px] rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900">
                <textarea aria-label={`Reply to ${contact.name}`} placeholder={`Reply to ${contact.name}...`} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send() } }} className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
                <div className="flex items-center justify-between px-2.5 pb-2"><div className="flex items-center gap-0.5"><button aria-label="Attach file" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Paperclip className="size-3.5" /></button><button aria-label="Insert template" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Sparkles className="size-3.5" /></button><span className="ml-1 hidden text-[10.5px] text-slate-400 sm:inline">{activeConversation.connectionId ? `Enter sends to the customer on ${channelLabels[activeConversation.channel]}` : "Enter to save · not linked to a live channel"}</span></div><button onClick={send} disabled={!draft.trim() || sendingHere} aria-busy={sendingHere} className="flex min-w-[84px] items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{sendingHere ? <><Loader2 className="size-3 animate-spin" /> Sending…</> : <><Send className="size-3" /> Send</>}</button></div>
              </div>
              {messageError && <p role="alert" className="mx-auto mt-2 max-w-[690px] text-[11.5px] text-rose-600 dark:text-rose-300">{messageError}</p>}
            </div>
          </div>
        </> : <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500"><p>{conversations.length ? "Select a conversation to get started." : contacts.length ? "Start a conversation with one of your contacts." : "Add a contact on the Contacts page, then start a conversation here."}</p>{conversations.length === 0 && contacts.length > 0 && <button onClick={onStartConversation} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-indigo-700"><Plus className="size-3.5" /> New conversation</button>}</div>}
      </section>

      {contact && (inspectorOpen || mobileDetailsOpen) && <aside aria-label="Contact details" className={`${mobileChatOpen && mobileDetailsOpen ? "fixed inset-0 z-50 flex flex-col" : "hidden"} ${inspectorOpen ? "lg:flex" : "lg:hidden"} bg-white dark:bg-slate-950 lg:static lg:z-auto lg:min-h-0 lg:flex-col lg:border-l lg:border-slate-200 lg:dark:border-slate-800`}>
        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-slate-100 px-3 dark:border-slate-800 lg:hidden"><p className="text-[13px] font-semibold text-slate-900 dark:text-white">Contact details</p><button onClick={() => setMobileDetailsOpen(false)} aria-label="Close contact details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-[18px]" /></button></div>
        <div className="hidden h-[62px] shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800 lg:flex"><div className="flex items-center gap-2"><UserRound className="size-4 text-slate-400" /><h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Contact details</h2></div><button aria-label="Close contact details" onClick={onToggleInspector} className="hidden rounded-md p-1.5 lg:inline-flex text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><PanelRightClose className="size-4" /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center border-b border-slate-100 pb-4 text-center dark:border-slate-800"><ContactAvatar contact={contact} size="lg" /><h3 className="mt-2.5 text-xs font-semibold text-slate-900 dark:text-white">{contact.name}</h3><p className="mt-0.5 text-[11.5px] text-slate-500">{contact.company}</p><span className="mt-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10.5px] font-medium text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">{formatLastSeen(contact.lastSeen)}</span></div>
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 py-3 dark:border-slate-800"><div><p className="text-[10.5px] font-medium tracking-wide text-slate-400">Email</p><p className="mt-1 truncate text-[11.5px] text-slate-700 dark:text-slate-300">{contact.email}</p></div><div><p className="text-[10.5px] font-medium tracking-wide text-slate-400">Phone</p><p className="mt-1 truncate text-[11.5px] text-slate-700 dark:text-slate-300">{contact.phone}</p></div><div><p className="text-[10.5px] font-medium tracking-wide text-slate-400">Assigned to</p><p className="mt-1 text-[11.5px] text-slate-700 dark:text-slate-300">{contact.assigned}</p></div><div><p className="text-[10.5px] font-medium tracking-wide text-slate-400">Primary channel</p><div className="mt-1"><ChannelPill channel={contact.channel} /></div></div></div>
          <div className="border-b border-slate-100 py-3 dark:border-slate-800"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Tags</h3><Tag className="size-3.5 text-slate-400" /></div><div className="flex flex-wrap gap-1.5">{contact.tags.map((tag) => <button key={tag} onClick={() => void onToggleTag(contact.id, tag)} className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-400/10">{tag} <span className="ml-0.5 opacity-50">×</span></button>)}<button onClick={() => { const tag = window.prompt(`Add a tag for ${contact.name}`)?.trim(); if (tag && !contact.tags.includes(tag)) void onToggleTag(contact.id, tag.slice(0, 40)) }} className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-[10.5px] font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:hover:text-indigo-300">+ Add tag</button></div></div>
          <div className="border-b border-slate-100 py-3 dark:border-slate-800"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Active cases</h3><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800">{activeCases.filter((item) => item.status !== "Resolved").length}</span></div>{activeCases.length ? <div className="flex flex-col gap-2">{activeCases.map((item) => <button key={item.id} onClick={() => onOpenCase(item.id)} title={`Open ${item.id}`} className={`group rounded-lg border p-2.5 text-left transition hover:shadow-sm ${item.escalation ? "border-rose-200 hover:border-rose-300 dark:border-rose-400/30" : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800"}`}><div className="flex items-center justify-between gap-1"><span className="text-[10.5px] font-semibold text-slate-500">{item.id}</span><div className="flex items-center gap-1"><EscalationBadge item={item} compact /><PriorityPill priority={item.priority} /></div></div><p className="mt-1 text-[11.5px] font-medium leading-relaxed text-slate-800 group-hover:text-indigo-800 dark:text-slate-200">{item.title}</p><div className="mt-2 flex items-center justify-between"><CaseStatusPill status={item.status} /><ChevronRight className="size-3.5 text-slate-300 group-hover:text-indigo-500" /></div></button>)}</div> : <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11.5px] text-slate-500 dark:bg-slate-900">No cases linked to this contact.</p>}</div>
          <div className="py-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Recent activity</h3><button className="text-[10.5px] font-medium text-indigo-700 dark:text-indigo-400">View all</button></div>{contactInteractions.length ? <div className="flex flex-col gap-2.5">{contactInteractions.slice(0, 3).map((item) => <div key={item.id} className="flex gap-2"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">{item.type === "Call" ? <Phone className="size-3" /> : item.type === "Meeting" ? <Video className="size-3" /> : <MessageSquareText className="size-3" />}</span><div><p className="text-[11.5px] font-medium text-slate-700 dark:text-slate-300">{item.type}</p><p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{item.summary}</p><p className="mt-1 text-[10.5px] text-slate-400">{formatDateTime(item.date)}</p></div></div>)}</div> : <p className="text-[11.5px] text-slate-500">No logged interactions yet.</p>}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-400"><CircleHelp className="size-3" /> Contact profile updated recently</div>
        </div>
      </aside>}
    </div>
  )
}

function DeliveryTick({ status }: { status?: "sent" | "delivered" | "read" | "failed" }) {
  if (status === "failed") return <span className="font-semibold text-rose-500" title="Not delivered">!</span>
  if (status === "read") return <CheckCheck className="size-3 text-sky-500" aria-label="Read" />
  if (status === "delivered") return <CheckCheck className="size-3 text-slate-400" aria-label="Delivered" />
  if (status === "sent") return <Check className="size-3 text-slate-400" aria-label="Sent" />
  return <CheckCheck className="size-3 text-indigo-400" aria-label="Saved" />
}

type OutgoingMessage = { key: string; conversationId: string; text: string; time: string; status: "sending" | "failed"; error?: string }

function ChannelFilterMenu({ value, onChange, channels, counts, unreadOnly, onUnreadOnly }: {
  value: ChannelFilter
  onChange: (value: ChannelFilter) => void
  channels: Channel[]
  counts: Record<ChannelFilter, { total: number; unread: number }>
  unreadOnly: boolean
  onUnreadOnly: (value: boolean) => void
}) {
  const options: SelectMenuOption<ChannelFilter>[] = (["all", ...channels] as ChannelFilter[]).map((option) => ({
    value: option,
    label: option === "all" ? "All channels" : channelLabels[option],
    icon: option === "all" ? <Filter className="size-3.5" /> : <ChannelIcon channel={option} className="size-3.5" />,
    count: counts[option]?.total ?? 0,
    badge: counts[option]?.unread ?? 0,
  }))
  return <SelectMenu label="Filter by channel" value={value} onChange={onChange} options={options} highlight={value !== "all" || unreadOnly}
    footer={<button onClick={() => onUnreadOnly(!unreadOnly)} role="switch" aria-checked={unreadOnly} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><span>Unread only</span><Switch on={unreadOnly} /></button>} />
}
