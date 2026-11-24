"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown, BriefcaseBusiness, CalendarClock, Clock3, Filter, Mail, MessageSquarePlus, MoreHorizontal, Pencil, Phone, Search, Trash2, UserPlus, UserRound, X } from "lucide-react"
import type { Channel, Contact, Interaction, SupportCase } from "@/lib/crm-data"
import { channelLabels, formatDateTime, formatLastSeen } from "@/lib/crm-data"
import { ChannelIcon, ChannelPill, ContactAvatar, CaseStatusPill, PageToolbar, PriorityPill, SelectMenu, toolbarButton, toolbarPrimary, type SelectMenuOption } from "./crm-primitives"

type ChannelFilter = "all" | Channel
const contactChannels: Channel[] = ["whatsapp", "facebook", "instagram", "email", "webchat"]

export function ContactsView({ contacts, query, onOpenContact, onAddContact, onLogInteraction }: { contacts: Contact[]; query: string; onOpenContact: (contact: Contact) => void; onAddContact: () => void; onLogInteraction: () => void }) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")
  const [sortDescending, setSortDescending] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const filtered = useMemo(() => contacts.filter((contact) => {
    const text = `${contact.name} ${contact.company} ${contact.email} ${contact.phone} ${contact.handle} ${channelLabels[contact.channel]} ${contact.tags.join(" ")}`.toLowerCase()
    return text.includes(query.toLowerCase()) && text.includes(localSearch.toLowerCase()) && (channelFilter === "all" || contact.channel === channelFilter)
  }).sort((a, b) => sortDescending ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)), [contacts, query, localSearch, channelFilter, sortDescending])
  const channelOptions: SelectMenuOption<ChannelFilter>[] = [
    { value: "all", label: "All channels", icon: <Filter className="size-3.5" />, count: contacts.length },
    ...contactChannels.map((channel) => ({ value: channel as ChannelFilter, label: channelLabels[channel], icon: <ChannelIcon channel={channel} className="size-3.5" />, count: contacts.filter((contact) => contact.channel === channel).length })),
  ]
  const filtersOn = channelFilter !== "all" || Boolean(localSearch)

  return <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-950">
    <PageToolbar title="Contacts" subtitle={filtersOn ? `${filtered.length} of ${contacts.length} contacts` : `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"} across every channel`}>
      <label className="flex h-9 w-[min(52vw,220px)] items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-400 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-800"><Search className="size-3.5 shrink-0" /><input aria-label="Search contacts" placeholder="Search contacts" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" />{localSearch && <button onClick={() => setLocalSearch("")} aria-label="Clear search" className="rounded p-0.5 hover:text-slate-600"><X className="size-3.5" /></button>}</label>
      <SelectMenu label="Filter by channel" value={channelFilter} onChange={setChannelFilter} options={channelOptions} highlight={channelFilter !== "all"} />
      <button onClick={() => setSortDescending((current) => !current)} aria-label={sortDescending ? "Sort contacts A to Z" : "Sort contacts Z to A"} className={toolbarButton}><ArrowUpDown className="size-3.5" />{sortDescending ? "Z–A" : "A–Z"}</button>
      <button onClick={onLogInteraction} className={`${toolbarButton} hidden md:flex`}><CalendarClock className="size-3.5 text-indigo-600 dark:text-indigo-400" />Log interaction</button>
      <button onClick={onAddContact} className={toolbarPrimary}><UserPlus className="size-3.5" /><span className="hidden sm:inline">Add contact</span></button>
    </PageToolbar>

    {contacts.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><UserPlus className="size-5" /></span><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">No contacts yet</h2><p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500">Add your first customer. Cases, conversations and interactions are all linked to a contact. New people who message you on WhatsApp, Messenger or Instagram are added automatically.</p></div><button onClick={onAddContact} className={toolbarPrimary}><UserPlus className="size-3.5" /> Add contact</button></div>
    : <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-slate-900/95"><tr className="border-b border-slate-200 dark:border-slate-800">{["Name", "Company", "Primary channel / handle", "Email", "Phone", "Assigned to", ""].map((column, index) => <th key={column || index} className={`py-2.5 text-[10.5px] font-semibold text-slate-500 ${index === 0 ? "pl-4 pr-4 sm:pl-6" : "px-4"}`}>{column}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">{filtered.map((contact) => <tr key={contact.id} onClick={() => onOpenContact(contact)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenContact(contact) }} className="cursor-pointer transition hover:bg-indigo-50/40 focus-visible:bg-indigo-50/60 focus-visible:outline-none dark:hover:bg-slate-900/60">
          <td className="py-3 pl-4 pr-4 sm:pl-6"><div className="flex items-center gap-2.5"><ContactAvatar contact={contact} size="sm" /><div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">{contact.name}</p><p className="mt-0.5 text-[10.5px] text-slate-400">{formatLastSeen(contact.lastSeen)}</p></div></div></td>
          <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">{contact.company || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
          <td className="px-4 py-3"><div className="flex items-center gap-2"><ChannelPill channel={contact.channel} /><span className="truncate text-[11.5px] text-slate-500">{contact.handle}</span></div></td>
          <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">{contact.email || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
          <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">{contact.phone || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
          <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">{contact.assigned ? <><span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[9.5px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{contact.assigned.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("")}</span>{contact.assigned}</> : <span className="text-slate-300 dark:text-slate-600">Unassigned</span>}</div></td>
          <td className="py-3 pl-4 pr-4 text-right sm:pr-6"><span aria-hidden="true" className="inline-flex rounded-md p-1.5 text-slate-400"><MoreHorizontal className="size-4" /></span></td>
        </tr>)}</tbody>
      </table>
      {filtered.length === 0 && <div className="px-4 py-12 text-center"><p className="text-xs text-slate-500">No contacts match.</p><button onClick={() => { setChannelFilter("all"); setLocalSearch("") }} className="mt-2 text-[11.5px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Clear filters</button></div>}
    </div>}
  </div>
}

type ContactActions = { onEdit: () => void; onDelete: () => Promise<void>; onNewCase: () => void; onLogInteraction: () => void; onStartConversation: () => void }

export function ContactDetailsDrawer({ contact, cases, interactions, onClose, actions }: { contact: Contact | null; cases: SupportCase[]; interactions: Interaction[]; onClose: () => void; actions?: ContactActions }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  if (!contact) return null
  async function confirmDelete() {
    if (!actions) return
    setDeleting(true)
    setDeleteError("")
    try {
      await actions.onDelete()
      setConfirmingDelete(false)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "The contact could not be deleted.")
    } finally {
      setDeleting(false)
    }
  }
  const linkedCases = cases.filter((item) => item.contactId === contact.id)
  const linkedInteractions = interactions.filter((item) => item.contactId === contact.id)
  return <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/25 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="contact-drawer-title" className="flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><p className="text-[10.5px] font-semibold text-slate-400">Contact profile</p><h2 id="contact-drawer-title" className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{contact.name}</h2></div><button onClick={onClose} aria-label="Close contact profile" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
      <div className="p-5"><div className="flex items-center gap-3"><ContactAvatar contact={contact} size="lg" /><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{contact.name}</p><p className="mt-1 text-xs text-slate-500">{contact.company}</p><div className="mt-2"><ChannelPill channel={contact.channel} /></div></div></div>
        {actions && <div className="mt-4 grid grid-cols-2 gap-2">{[{ label: "Edit", icon: Pencil, onClick: actions.onEdit }, { label: "New case", icon: BriefcaseBusiness, onClick: actions.onNewCase }, { label: "Log interaction", icon: CalendarClock, onClick: actions.onLogInteraction }, { label: "Message", icon: MessageSquarePlus, onClick: actions.onStartConversation }].map(({ label, icon: Icon, onClick }) => <button key={label} onClick={onClick} className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><Icon className="size-3.5" />{label}</button>)}</div>}
        <div className="mt-5 grid grid-cols-2 gap-3">{[{ label: "Email", value: contact.email || "—", icon: Mail }, { label: "Phone", value: contact.phone || "—", icon: Phone }, { label: "Assigned to", value: contact.assigned || "—", icon: UserRound }, { label: "Last active", value: formatLastSeen(contact.lastSeen) || "—", icon: Clock3 }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><div className="flex items-center gap-1.5 text-slate-400"><Icon className="size-3" /><span className="text-[10.5px] font-medium tracking-wide">{label}</span></div><p className="mt-1.5 truncate text-[11.5px] font-medium text-slate-700 dark:text-slate-300">{value}</p></div>)}</div>
        <div className="mt-5"><h3 className="mb-2 text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Tags</h3>{contact.tags.length ? <div className="flex flex-wrap gap-1.5">{contact.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag}</span>)}</div> : <p className="text-[11.5px] text-slate-500">No tags.</p>}</div>
        <div className="mt-6"><div className="mb-2 flex items-center justify-between"><h3 className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Cases</h3><span className="text-[10.5px] text-slate-400">{linkedCases.length} total</span></div>{linkedCases.length ? <div className="flex flex-col gap-2">{linkedCases.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-center justify-between"><span className="text-[10.5px] font-semibold text-slate-500">{item.id}</span><PriorityPill priority={item.priority} /></div><p className="mt-1.5 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">{item.title}</p><div className="mt-2"><CaseStatusPill status={item.status} /></div></div>)}</div> : <p className="rounded-lg bg-slate-50 p-3 text-[11.5px] text-slate-500 dark:bg-slate-900">No associated cases.</p>}</div>
        <div className="mt-6"><h3 className="mb-2 text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Interaction history</h3>{linkedInteractions.length ? <div className="flex flex-col gap-3">{linkedInteractions.map((item) => <div key={item.id} className="flex gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-800"><div className="min-w-0"><p className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{item.type} <span className="ml-1 font-normal text-slate-400">{formatDateTime(item.date)}</span></p><p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{item.summary}</p>{item.followUp && <span className="mt-1.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">Follow-up</span>}</div></div>)}</div> : <p className="text-[11.5px] text-slate-500">No interactions recorded.</p>}</div>
      </div>
      <div className="mt-auto border-t border-slate-100 p-4 dark:border-slate-800">
        {deleteError && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{deleteError}</p>}
        {confirmingDelete ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/20 dark:bg-rose-400/10"><p className="text-[11.5px] leading-relaxed text-rose-800 dark:text-rose-200">Delete {contact.name}? This also permanently deletes their {linkedCases.length} case(s), conversations and interaction history.</p><div className="mt-2 flex justify-end gap-2"><button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Cancel</button><button onClick={() => void confirmDelete()} disabled={deleting} className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete permanently"}</button></div></div>
        : <div className="flex gap-2">{actions && <button onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[11.5px] font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-400/10"><Trash2 className="size-3.5" /> Delete</button>}<button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Close profile</button></div>}
      </div>
    </section>
  </div>
}
