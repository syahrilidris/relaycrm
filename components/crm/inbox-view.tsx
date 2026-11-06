"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, Ellipsis, Headphones, Mail, MessageSquareText, MoreHorizontal, Paperclip, PanelRightClose, PanelRightOpen, Phone, Plus, Search, Send, Sparkles, Tag, UserRound, Video } from "lucide-react"
import type { CaseStatus, Contact, Conversation, Interaction, SupportCase } from "@/lib/crm-data"
import { channelLabels } from "@/lib/crm-data"
import { ChannelIcon, ChannelPill, ContactAvatar, CaseStatusPill, PriorityPill } from "./crm-primitives"

const channelFilters = ["All channels", "whatsapp", "email", "instagram", "facebook", "webchat"] as const

type InboxViewProps = {
  conversations: Conversation[]
  contacts: Contact[]
  cases: SupportCase[]
  interactions: Interaction[]
  activeConversationId: string
  query: string
  inspectorOpen: boolean
  onToggleInspector: () => void
  onSelectConversation: (id: string) => void
  onSendMessage: (conversationId: string, text: string) => void
  onLogInteraction: () => void
  onCreateCase: (conversation: Conversation) => void
  onToggleTag: (contactId: string, tag: string) => void
}

export function InboxView({ conversations, contacts, cases, interactions, activeConversationId, query, inspectorOpen, onToggleInspector, onSelectConversation, onSendMessage, onLogInteraction, onCreateCase, onToggleTag }: InboxViewProps) {
  const [channelFilter, setChannelFilter] = useState<string>("All channels")
  const [localSearch, setLocalSearch] = useState("")
  const [draft, setDraft] = useState("")
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0]
  const contact = contacts.find((item) => item.id === activeConversation?.contactId) ?? contacts[0]
  const activeCases = cases.filter((item) => item.contactId === contact?.id)
  const contactInteractions = interactions.filter((item) => item.contactId === contact?.id)
  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const person = contacts.find((item) => item.id === conversation.contactId)
    const matchesChannel = channelFilter === "All channels" || conversation.channel === channelFilter
    const searchText = `${person?.name} ${person?.company} ${conversation.preview} ${channelLabels[conversation.channel]}`.toLowerCase()
    return matchesChannel && searchText.includes(query.toLowerCase()) && searchText.includes(localSearch.toLowerCase())
  }), [channelFilter, contacts, conversations, query, localSearch])

  function send() {
    const text = draft.trim()
    if (!text || !activeConversation) return
    onSendMessage(activeConversation.id, text)
    setDraft("")
  }

  return (
    <div className={`grid min-h-[calc(100vh-144px)] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.025)] dark:border-slate-800 dark:bg-slate-950 ${inspectorOpen ? "xl:grid-cols-[270px_minmax(0,1fr)_260px]" : "xl:grid-cols-[295px_minmax(0,1fr)]"}`}>
      <section aria-label="Conversation list" className="flex min-h-[310px] flex-col border-b border-slate-200 dark:border-slate-800 xl:min-h-0 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">Inbox</h2><p className="mt-0.5 text-[10px] text-slate-500">All conversations <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{conversations.length}</span></p></div><button aria-label="Conversation options" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Ellipsis className="size-4" /></button></div>
          <label className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-400 dark:border-slate-800"><Search className="size-3.5" /><input aria-label="Filter conversations" placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400 dark:text-slate-200" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} /></label>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {channelFilters.map((filter) => <button key={filter} onClick={() => setChannelFilter(filter)} className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-medium transition ${channelFilter === filter ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{filter === "All channels" ? "All" : channelLabels[filter]}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 pb-1 pt-3"><span className="text-[9px] font-semibold uppercase tracking-[0.11em] text-slate-400">Recent</span><button className="flex items-center gap-1 text-[9px] font-medium text-slate-500">Newest <ChevronDown className="size-3" /></button></div>
          {filteredConversations.map((conversation) => {
            const person = contacts.find((item) => item.id === conversation.contactId)
            if (!person) return null
            const active = conversation.id === activeConversation?.id
            return <button key={conversation.id} onClick={() => onSelectConversation(conversation.id)} aria-current={active ? "true" : undefined} className={`flex w-full gap-2.5 border-b border-slate-100 px-3.5 py-3 text-left transition dark:border-slate-900 ${active ? "bg-emerald-50/70 dark:bg-emerald-400/[0.07]" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"}`}>
              <div className="relative shrink-0"><ContactAvatar contact={person} size="md" /><span className={`absolute -bottom-0.5 -right-0.5 flex size-[17px] items-center justify-center rounded-full border-2 border-white dark:border-slate-950 ${active ? "bg-emerald-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950"}`}><ChannelIcon channel={conversation.channel} className="size-2.5 text-current" /></span></div>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className={`truncate text-[11px] ${conversation.unread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-800 dark:text-slate-200"}`}>{person.name}</span><span className="shrink-0 text-[9px] text-slate-400">{conversation.time}</span></div><div className="mt-0.5 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-slate-500">{conversation.preview}</span>{conversation.unread > 0 && <span className="flex size-[17px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-semibold text-white">{conversation.unread}</span>}</div><div className="mt-1.5 flex items-center gap-1.5"><ChannelPill channel={conversation.channel} /><span className="truncate text-[9px] text-slate-400">{person.company}</span></div></div>
            </button>
          })}
          {filteredConversations.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-500">No conversations match this search.</p>}
        </div>
        <button className="flex h-10 items-center justify-center gap-1 border-t border-slate-100 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><ArrowDown className="size-3" /> Load older conversations</button>
      </section>

      <section className="flex min-h-[570px] min-w-0 flex-col xl:min-h-0">
        {activeConversation && contact ? <>
          <div className="flex h-[62px] shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 dark:border-slate-800 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5"><ContactAvatar contact={contact} size="sm" /><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-xs font-semibold text-slate-900 dark:text-white">{contact.name}</h2><span className="hidden size-1.5 rounded-full bg-emerald-400 sm:block" /></div><p className="mt-0.5 truncate text-[10px] text-slate-500">{contact.lastSeen} <span className="px-1 text-slate-300">·</span> <ChannelPill channel={activeConversation.channel} /></p></div></div>
            <div className="flex shrink-0 items-center gap-0.5"><button onClick={onLogInteraction} aria-label="Log a call" title="Log a call" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><Phone className="size-4" /></button><button onClick={() => onCreateCase(activeConversation)} title="Convert to support case" className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-50 sm:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="size-3.5" /> Create case</button><button onClick={onToggleInspector} aria-label={inspectorOpen ? "Hide contact details" : "Show contact details"} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">{inspectorOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}</button></div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-[#fbfcfd] dark:bg-slate-950">
            <div className="flex items-center justify-center gap-2 py-3"><span className="h-px w-8 bg-slate-200 dark:bg-slate-800" /><span className="text-[9px] font-medium text-slate-400">Today, November 7</span><span className="h-px w-8 bg-slate-200 dark:bg-slate-800" /></div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
              <div className="mx-auto flex max-w-[690px] flex-col gap-3">
                {activeConversation.messages.map((message) => {
                  if (message.from === "system") return <div key={message.id} className="flex justify-center py-1"><span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] text-slate-500 dark:bg-slate-900">{message.text}</span></div>
                  if (message.kind === "email") return <div key={message.id} className={`flex ${message.from === "agent" ? "justify-end" : "justify-start"}`}><div className={`w-full max-w-[430px] rounded-xl border bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${message.from === "agent" ? "border-emerald-200 dark:border-emerald-400/20" : "border-slate-200"}`}><div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"><span className="flex size-6 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"><Mail className="size-3" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{message.subject}</p><p className="text-[9px] text-slate-400">{message.from === "contact" ? contact.email : "Maya Chen · support@relay.app"}</p></div><span className="text-[9px] text-slate-400">{message.time}</span></div><p className="whitespace-pre-line text-[11px] leading-[1.7] text-slate-600 dark:text-slate-300">{message.text}</p></div></div>
                  return <div key={message.id} className={`flex ${message.from === "agent" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] sm:max-w-[72%] ${message.from === "agent" ? "items-end" : "items-start"} flex flex-col`}><div className={`rounded-2xl px-3.5 py-2.5 text-[11px] leading-[1.65] ${message.from === "agent" ? "rounded-br-md bg-emerald-600 text-white shadow-sm shadow-emerald-800/10" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,.03)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>{message.text}</div><span className={`mt-1 flex items-center gap-1 text-[9px] text-slate-400 ${message.from === "agent" ? "flex-row-reverse" : ""}`}>{message.time}{message.from === "agent" && <CheckCheck className="size-3 text-emerald-500" />}</span></div></div>
                })}
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
              <div className="mx-auto max-w-[690px] rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900">
                <textarea aria-label={`Reply to ${contact.name}`} placeholder={`Reply to ${contact.name}...`} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send() } }} className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
                <div className="flex items-center justify-between px-2.5 pb-2"><div className="flex items-center gap-0.5"><button aria-label="Attach file" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Paperclip className="size-3.5" /></button><button aria-label="Insert template" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Sparkles className="size-3.5" /></button><span className="ml-1 hidden text-[9px] text-slate-400 sm:inline">Press Enter to send</span></div><button onClick={send} disabled={!draft.trim()} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="size-3" /> Send</button></div>
              </div>
            </div>
          </div>
        </> : <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Select a conversation to get started.</div>}
      </section>

      {inspectorOpen && contact && <aside aria-label="Contact details" className="min-h-[430px] border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 xl:min-h-0 xl:border-l xl:border-t-0">
        <div className="flex h-[62px] items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800"><div className="flex items-center gap-2"><UserRound className="size-4 text-slate-400" /><h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Contact details</h2></div><button aria-label="Close contact details" onClick={onToggleInspector} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><PanelRightClose className="size-4" /></button></div>
        <div className="max-h-[calc(100vh-210px)] overflow-y-auto p-4">
          <div className="flex flex-col items-center border-b border-slate-100 pb-4 text-center dark:border-slate-800"><ContactAvatar contact={contact} size="lg" /><h3 className="mt-2.5 text-xs font-semibold text-slate-900 dark:text-white">{contact.name}</h3><p className="mt-0.5 text-[10px] text-slate-500">{contact.company}</p><span className="mt-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{contact.lastSeen}</span></div>
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 py-3 dark:border-slate-800"><div><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Email</p><p className="mt-1 truncate text-[10px] text-slate-700 dark:text-slate-300">{contact.email}</p></div><div><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Phone</p><p className="mt-1 truncate text-[10px] text-slate-700 dark:text-slate-300">{contact.phone}</p></div><div><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Assigned to</p><p className="mt-1 text-[10px] text-slate-700 dark:text-slate-300">{contact.assigned}</p></div><div><p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Primary channel</p><div className="mt-1"><ChannelPill channel={contact.channel} /></div></div></div>
          <div className="border-b border-slate-100 py-3 dark:border-slate-800"><div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">Tags</h3><Tag className="size-3.5 text-slate-400" /></div><div className="flex flex-wrap gap-1.5">{contact.tags.map((tag) => <button key={tag} onClick={() => onToggleTag(contact.id, tag)} className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-400/10">{tag} <span className="ml-0.5 opacity-50">×</span></button>)}<button onClick={() => onToggleTag(contact.id, "Priority") } className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-[9px] font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:hover:text-emerald-300">+ Add tag</button></div></div>
          <div className="border-b border-slate-100 py-3 dark:border-slate-800"><div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">Active cases</h3><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800">{activeCases.filter((item) => item.status !== "Resolved").length}</span></div>{activeCases.length ? <div className="flex flex-col gap-2">{activeCases.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold text-slate-500">{item.id}</span><PriorityPill priority={item.priority} /></div><p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-800 dark:text-slate-200">{item.title}</p><div className="mt-2"><CaseStatusPill status={item.status} /></div></div>)}</div> : <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[10px] text-slate-500 dark:bg-slate-900">No cases linked to this contact.</p>}</div>
          <div className="py-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">Recent activity</h3><button className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400">View all</button></div>{contactInteractions.length ? <div className="flex flex-col gap-2.5">{contactInteractions.slice(0, 3).map((item) => <div key={item.id} className="flex gap-2"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">{item.type === "Call" ? <Phone className="size-3" /> : item.type === "Meeting" ? <Video className="size-3" /> : <MessageSquareText className="size-3" />}</span><div><p className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{item.type}</p><p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">{item.summary}</p><p className="mt-1 text-[9px] text-slate-400">{item.date}</p></div></div>)}</div> : <p className="text-[10px] text-slate-500">No logged interactions yet.</p>}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400"><CircleHelp className="size-3" /> Contact profile updated recently</div>
        </div>
      </aside>}
    </div>
  )
}
